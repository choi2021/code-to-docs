class App extends Component<{}, State> {
    state: State = {
        isInitialized: false,
    };

    /**
     * App을 에러경계로 사용합니다.
     * 에러 catch시 버그 리포트 발송합니다.
     * @param error
     * @param errorInfo
     */
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // 발생한 에러가 화이트 스크린까지 이어지는 경우는 아직 회복할 방법을 마련해두지 못했으므로 unhandled 에러 리포트 발송
        CrashAnalyticsService.sendUnhandledError({
            error: error,
            originalError: error,
            metadata: {
                errorInfo: errorInfo,
            },
            tag: ErrorTag.WhiteScreen,
        });
    }

    componentDidMount() {
        super.componentDidMount?.();
        // 초기화
        this.init();
    }

    constructor(props: Record<string, never>) {
        super(props);
        enrollStartTime();
    }

    /**
     * 초기화 작업
     * 이 작업이 완료된 후에 Main 컴포넌트가 렌더되는 것이 보장됩니다.
     */
    async init() {
        // CS, CSS 데이터 측정 시작
        // - 구현상의 제약으로 Main 컴포넌트 마운트 시점부터 측정
        // - 측정 의도를 따지면 native 앱 시작 시점부터 측정하는 것이 이상적임
        // User Churn 데이터 측정 시작
        await Promise.all([
            performanceTracker.start(PerformanceKey.COLD_START),
            PerformanceMetricService.startTrace('cold-start-up-time'),
            PerformanceMetricService.startTrace('cold-start-up-time-with-soft-update'),
            PerformanceMetricService.startTrace('churn-time-during-mandatory-update'),
        ]);

        // 피쳐 플래그 초기화
        await refreshFeatureFlagMapUseCase();
        this.setState({
            isInitialized: true,
        });
        performanceTracker.addCheckPoint(PerformanceKey.COLD_START, 'App 화면 초기화');
    }

    render(): ReactElement {
        const { isInitialized } = this.state;
        return (
            // @ts-ignore React.FC children 타입 문제 - recoil 0.7.1 버전에서 해결
            <RecoilRoot>
                <ReduxStoreProvider>{isInitialized ? <Main /> : <EmptyView />}</ReduxStoreProvider>
            <OnDeviceLoggerInitializer />
            </RecoilRoot>
        );
    }
}

export default App;
