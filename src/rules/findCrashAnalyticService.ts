import { Node, SyntaxKind, ts } from 'ts-morph';
import { Rule } from './index';

enum Severity {
    error = 'error',
    warning = 'warning',
    info = 'info',
    debug = 'debug',
    unhandledError = 'unhandledError',
}

const isToast = (text: string) => {
    return text.includes('ToastService') || text.includes('toast');
};

const isModal = (text: string) => {
    return text.includes('alert');
};

const mapMethodNameToSeverity = (methodName: string): Severity | '' => {
    switch (methodName) {
        case 'sendError':
            return Severity.error;
        case 'sendWarning':
            return Severity.warning;
        case 'sendInfo':
            return Severity.info;
        case 'debug':
            return Severity.debug;
        case 'sendUnhandledError':
            return Severity.unhandledError;
        default:
            return '';
    }
};

interface LogEntry {
    title: string;
    severity: string;
    domain: string;
    reason: string;
}

export const findCrashAnalyticService: Rule<LogEntry[]> = {
    meta: {
        headers: ['에러 메시지', '분류', '분류 이유'],
        headersKey: ['title', 'severity', 'reason'],
        key: 'findCrashAnalyticService',
        resultPath: '../findCrashAnalyticService.md',
    },
    execute(node: Node<ts.Node>) {
        const result = new Map<string, LogEntry[]>();
        if (Node.isCallExpression(node)) {
            const callExpressionText = node.getExpression().getText();
            const isCrashAnalyticsService = callExpressionText.startsWith('CrashAnalyticsService');
            if (!isCrashAnalyticsService) return result;

            const methodName = callExpressionText.split('.')[1];
            const isValidMethod = ['sendError', 'sendWarning', 'sendInfo', 'sendUnhandledError']?.some(
                (m) => m === methodName,
            );

            if (!isValidMethod) {
                return result;
            }

            const args = node.getArguments();
            const logEntry: LogEntry = {
                title: 'MapToError',
                severity: mapMethodNameToSeverity(methodName),
                domain: '',
                reason: '예외처리 없음',
            };

            args.forEach((arg) => {
                if (Node.isObjectLiteralExpression(arg)) {
                    arg.forEachChild((argNode) => {
                        const child = argNode.getText();
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
                    const errorArrowFunction = node.getAncestors().find((ancestor) => Node.isArrowFunction(ancestor));
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
            const logEntries = result.get(key) ?? [];
            result.set(key, [...logEntries, logEntry]);
            return result;
        }
        return result;
    },
};
