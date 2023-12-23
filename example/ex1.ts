const CrashAnalyticsService = {
    info: 1,
    sendInfo: ({
        error,
        originalError,
        tag,
    }: {
        error: Error;
        originalError?: unknown;
        tag: keyof typeof ErrorTag;
    }) => {
        console.log(error, originalError, tag);
    },
    sendWarning: ({
        error,
        originalError,
        tag,
    }: {
        error: Error;
        originalError?: unknown;
        tag: keyof typeof ErrorTag;
    }) => {
        console.log(error, originalError, tag);
    },
    sendError: ({
        error,
        originalError,
        tag,
    }: {
        error: Error;
        originalError?: unknown;
        tag: keyof typeof ErrorTag;
    }) => {
        console.log(error, originalError, tag);
    },
};

const ErrorTag = {
    test1: 'test1',
} as const;

const initTask = async () => {
    CrashAnalyticsService.sendInfo({
        error: new Error('info'),
        tag: ErrorTag.test1,
    });

    CrashAnalyticsService.sendWarning({
        error: new Error('warning'),
        tag: ErrorTag.test1,
    });

    CrashAnalyticsService.sendError({
        error: new Error('error'),
        tag: ErrorTag.test1,
    });
};

CrashAnalyticsService.info;
