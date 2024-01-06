import { Project, Node, SyntaxKind } from 'ts-morph';
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
    reason: string;
}

interface LogEntryMap extends Map<string, LogEntry[]> {}

const isToast = (text: string) => {
    return text.includes('ToastService') || text.includes('toast');
};

const isModal = (text: string) => {
    return text.includes('alert');
};

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
                // Rule
                if (Node.isCallExpression(node)) {
                    const callExpressionText = node.getExpression().getText();
                    // CrashAnalyticsService 찾기
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
                                reason: '예외처리 없음',
                            };

                            args.forEach((arg) => {
                                if (Node.isObjectLiteralExpression(arg)) {
                                    arg.forEachChild((node) => {
                                        const child = node.getText();
                                        const errorRegex = /new Error\('([^']*)'\)/;
                                        const errorRegexMatches = child.match(errorRegex);

                                        const tagRex = /tag: ErrorTag\.([^,]*)/;
                                        const tagRegexMatches = child.match(tagRex);

                                        if (errorRegexMatches) {
                                            logEntry.title = errorRegexMatches[1];
                                        }
                                        if (tagRegexMatches) {
                                            logEntry.domain = tagRegexMatches[1];
                                        }
                                    });
                                }
                            });

                            if (methodName === 'sendInfo') {
                                const CatchClause = node.getFirstAncestorByKind(SyntaxKind.CatchClause);

                                let targetText = '';

                                if (!CatchClause) {
                                    const errorArrowFunction = node
                                        .getAncestors()
                                        .find((ancestor) => Node.isArrowFunction(ancestor));
                                    targetText = errorArrowFunction?.getText() ?? '';
                                } else {
                                    targetText = CatchClause.getText();
                                }

                                const isFallbackUI = logEntry.title.includes('조회 실패');

                                if (isToast(targetText)) {
                                    logEntry.reason = '토스트 노출';
                                } else if (isModal(targetText)) {
                                    logEntry.reason = '모달 노출';
                                } else if (isFallbackUI) {
                                    logEntry.reason = 'fallback 화면 노출';
                                } else {
                                    logEntry.reason = '기록을 위한 로그';
                                }
                            }

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
        markdownTable += `| 에러 메시지 | 분류 | 분류 이유 | \n`;
        markdownTable += `|-------|----------|----------|\n`;

        entries.forEach((entry) => {
            markdownTable += `| \`${entry.title}\` | ${entry.severity} | ${entry.reason} |\n`;
        });
    });

    return markdownTable;
}

function saveMarkdownToFile(markdownContent: string, filePath: string) {
    fs.writeFileSync(filePath, markdownContent);
}

export function main(projectPath: string, markdownOutputPath: string) {
    const errorLogJSONFilePath = './targetLog.json';
    const searchCriteria = readJSONFile(errorLogJSONFilePath);
    const logEntryMap = analyzeProject(projectPath, searchCriteria);
    const markdownTable = generateMarkdownTable(logEntryMap);
    saveMarkdownToFile(markdownTable, markdownOutputPath);
}
