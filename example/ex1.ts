
const CrashAnalyticsService={
    sendInfo: ({error,originalError,tag}:{error:Error,originalError?:unknown,tag:keyof typeof ErrorTag}) => {
        console.log(error,originalError,tag);
    }
};


const ErrorTag={
    test1:'test1',
} as const;

const initTask =async () => {
    CrashAnalyticsService.sendInfo({
            error: new Error('고객 잔여 캐시 조회 실패'),
            tag: ErrorTag.test1,
        });
};
