import { Project } from 'ts-morph';
import fs from 'fs';
import path from 'path';
import { Meta, RuleResult, rules } from './rules';

type AnalyzeResult = Map<string, { meta: Meta; result: RuleResult<unknown> }>;

function analyzeProject(projectPath: string): AnalyzeResult {
    const dataMap = new Map();

    const project = new Project({
        tsConfigFilePath: path.join(projectPath, 'tsconfig.json'),
    });

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

export function main(projectPath: string, markdownOutputPath: string) {
    const analysis = analyzeProject(projectPath);
    const markdownTable = generateMarkdownTable(analysis);

    fs.writeFileSync(markdownOutputPath, markdownTable);
}
