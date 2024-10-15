import { Project } from 'ts-morph';
import fs from 'fs';
import path from 'path';
import { Meta, Rule, RuleResult, rules as GlobalRules } from './rules';

type AnalyzeResult = Map<string, { meta: Meta; result: RuleResult }>;

function analyzeProject(project: Project, rules: Rule[]): AnalyzeResult {
    const dataMap = new Map();
    project.getSourceFiles().forEach((sourceFile) => {
        sourceFile.forEachDescendant((node) => {
            rules.forEach((rule) => {
                const result = rule.execute(node);
                const { key } = rule.meta;
                const existingData = dataMap.get(key) ?? { meta: rule.meta, result: new Map() };
                result.forEach((value, mapKey) => {
                    const existingEntries = existingData.result.get(mapKey) ?? [];
                    existingData.result.set(mapKey, [...existingEntries, ...value]);
                });
                dataMap.set(key, existingData);
            });
        });
    });
    return dataMap;
}

function generateMarkdownTable(dataMap: AnalyzeResult): string {
    let markdownTable = '';

    dataMap.forEach((data, key) => {
        markdownTable += `## ${key}\n`;

        data.result.forEach((result, resultKey) => {
            markdownTable += `### ${resultKey}\n`;
            markdownTable += data.meta.headers.map((header) => `| ${header} `).join('') + '|\n';
            markdownTable += data.meta.headers.map(() => `| ------- `).join('') + '|\n';
            if (result instanceof Array) {
                result.forEach((entry) => {
                    markdownTable +=
                        '| ' + data.meta.headersKey.map((headerKey) => `${entry[headerKey]}`).join(' | ') + ' |\n';
                });
            }
        });
    });

    return markdownTable;
}

function getLocalRules(projectPath: string): Rule[] {
    const rulesPath = path.join(projectPath, 'ctd');
    const files = fs.readdirSync(rulesPath) ?? [];
    const cwd = process.cwd();

    return files
        .filter((file) => file.endsWith('.ts' || 'js'))
        .map((file) => {
            const rule = require(path.join(cwd, rulesPath, file));
            return rule;
        })
        .filter((rule) => isRule(rule));
}

function isRule(rule: unknown): rule is Rule {
    if (typeof rule === 'object' && rule !== null) {
        if ('execute' in rule && 'meta' in rule) {
            return true;
        }
    }
    return false;
}

export function main(projectPath: string, markdownOutputPath: string) {
    const project = new Project({
        tsConfigFilePath: path.join(projectPath, 'tsconfig.json'),
    });

    const rules = [...GlobalRules, ...getLocalRules(projectPath)];
    const analysis = analyzeProject(project, rules);
    const markdownTable = generateMarkdownTable(analysis);
    fs.writeFileSync(markdownOutputPath, markdownTable);
}
