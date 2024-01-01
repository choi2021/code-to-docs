import { Project, Node } from 'ts-morph';
import fs from 'fs';
import path from 'path';
import { mapMethodNameToSeverity } from './util';

export enum Severity {
    error = 'error',
    warning = 'warning',
    info = 'info',
    debug = 'debug',
    unhandledError = 'unhandledError',
}

interface MethodCriteria {
    methodName: string;
    paramProperties?: string[];
}

interface SearchCriteria {
    name: string;
    properties?: string[];
    methods?: MethodCriteria[];
}

interface LogEntry {
    title: string;
    severity: string;
    domain: string;
}

interface LogEntryMap extends Map<string, LogEntry[]> {}

function readJSONFile(filePath: string): SearchCriteria[] {
    const jsonData = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(jsonData).searchCriteria;
}

function analyzeProject(projectPath: string, criteria: SearchCriteria[]) {
    const logEntryMap = new Map<string, LogEntry[]>();

    const project = new Project({
        tsConfigFilePath: path.join(projectPath, 'tsconfig.json'),
    });

    criteria.forEach((criterion) => {
        project.getSourceFiles().forEach((sourceFile) => {
            sourceFile.forEachDescendant((node) => {
                if (Node.isCallExpression(node)) {
                    const callExpressionText = node.getExpression().getText();
                    if (callExpressionText.startsWith(criterion.name + '.')) {
                        const methodName = callExpressionText.split('.')[1];
                        const targetMethod = criterion.methods?.find((m) => m.methodName === methodName);
                        const targetMethodParams = targetMethod?.paramProperties ?? [];

                        if (targetMethodParams.length > 0) {
                            const args = node.getArguments();
                            const logEntry: LogEntry = {
                                title: 'MapToError',
                                severity: mapMethodNameToSeverity(methodName),
                                domain: '',
                            };
                            args.forEach((arg) => {
                                if (Node.isObjectLiteralExpression(arg)) {
                                    arg.forEachChild((node) => {
                                        const chlid = node.getText();
                                        const errorRegex = /new Error\('([^']*)'\)/;
                                        const errorRegexMatches = chlid.match(errorRegex);

                                        const tagRex = /tag: ErrorTag\.([^,]*)/;
                                        const tagRegexMatches = chlid.match(tagRex);

                                        if (errorRegexMatches) {
                                            logEntry.title = errorRegexMatches[1];
                                        }
                                        if (tagRegexMatches) {
                                            logEntry.domain = tagRegexMatches[1];
                                        }
                                    });
                                }
                            });

                            const key = logEntry.domain;
                            const logEntries = logEntryMap.get(key) ?? [];
                            logEntryMap.set(key, [...logEntries, logEntry]);
                        }
                    }
                }
            });
        });
    });
    return logEntryMap;
}

function generateMarkdownTable(entryMap: LogEntryMap): string {
    let markdownTable = ``;

    entryMap.forEach((entries, key) => {
        markdownTable += `## ${key}\n`;
        markdownTable += `| 에러 메시지 | 분류 | \n`;
        markdownTable += `|-------|----------|\n`;

        entries.forEach((entry) => {
            markdownTable += `| \`${entry.title}\` | ${entry.severity} |\n`;
        });
    });

    return markdownTable;
}

function saveMarkdownToFile(markdownContent: string, filePath: string) {
    fs.writeFileSync(filePath, markdownContent);
}

export function main(projectPath: string,markdownOutputPath:string) {
    const errorLogJSONFilePath = './targetLog.json';
    const searchCriteria = readJSONFile(errorLogJSONFilePath);
    const logEntryMap = analyzeProject(projectPath, searchCriteria);
    const markdownTable = generateMarkdownTable(logEntryMap);
    saveMarkdownToFile(markdownTable, markdownOutputPath);
}

