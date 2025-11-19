import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-muted p-4">
            <Card className="max-w-md w-full">
                <CardHeader>
                    <CardTitle className="text-destructive">Application Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Sorry, something went wrong. Please try refreshing the page.</p>
                    <button 
                        onClick={() => this.setState({ hasError: false })}
                        className="mt-4 w-full h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium"
                    >
                        Try again
                    </button>
                </CardContent>
            </Card>
        </div>
      );
    }

    return this.props.children;
  }
}