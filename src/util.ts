import { Severity } from './index';

export const mapMethodNameToSeverity = (methodName: string): Severity | '' => {
    switch (methodName) {
        case 'sendError':
            return Severity.error;
        case 'sendWarning':
            return Severity.warning;
        case 'sendInfo':
            return Severity.info;
        case 'debug':
            return Severity.debug;
        default:
            return '';
    }
};
