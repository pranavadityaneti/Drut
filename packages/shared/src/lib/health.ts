export type HealthStatus = {
    devtoolsPatched: boolean;
    supabaseReady: boolean;
    monacoLazy: boolean;
};

export const runtimeHealth = {
    checkDevTools: (): boolean => {
        if (typeof window === 'undefined') return false;
        const win = window as any;
        const devTools =
            win.__REACT_DEVTOOLS_GLOBAL_HOOK__ &&
            typeof win.__REACT_DEVTOOLS_GLOBAL_HOOK__._debug !== 'undefined';
        return !!devTools;
    },

    getMemoryUsage: () => {
        if (typeof performance !== 'undefined' && (performance as any).memory) {
            return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
    }
};
