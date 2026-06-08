import React from 'react';

interface State {
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

interface Props {
    children: React.ReactNode;
    /** Optional label shown above the error message (e.g., "Admin Dashboard"). */
    label?: string;
}

/**
 * Renders any thrown render-time error on screen instead of failing to a blank
 * page. Use inline anywhere a component might explode at runtime so you can
 * see WHAT broke without opening browser DevTools.
 */
export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log to browser console for full stack
        // eslint-disable-next-line no-console
        console.error('[ErrorBoundary] caught:', error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.error) {
            const stack = (this.state.error.stack || '').split('\n').slice(0, 8).join('\n');
            const componentStack = (this.state.errorInfo?.componentStack || '').split('\n').slice(0, 8).join('\n');
            return (
                <div style={{
                    margin: 24,
                    padding: 24,
                    border: '1px solid #fca5a5',
                    borderRadius: 12,
                    backgroundColor: '#fef2f2',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: '#7f1d1d',
                    maxWidth: '100%',
                    overflowX: 'auto',
                }}>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                        ⚠️ Render error{this.props.label ? ` in ${this.props.label}` : ''}
                    </div>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                        {this.state.error.name}: {this.state.error.message}
                    </div>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{stack}</pre>
                    {componentStack && (
                        <>
                            <div style={{ marginTop: 16, fontWeight: 600 }}>Component stack:</div>
                            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{componentStack}</pre>
                        </>
                    )}
                    <div style={{ marginTop: 16, fontSize: 12, opacity: 0.8 }}>
                        Open browser DevTools console for the full stack trace.
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
