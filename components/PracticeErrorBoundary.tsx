import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { log } from '../lib/log';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class PracticeErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    log.error("Practice Engine Error:", error, errorInfo);
  }
  
  private handleReport = () => {
    const report = {
        message: this.state.error?.message,
        stack: this.state.error?.stack,
        componentStack: this.state.errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
    };
    log.error("--- ISSUE REPORT ---", JSON.stringify(report, null, 2));
    alert("Issue has been logged to the console. Please copy the details and share them with the development team.");
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive">Practice Area Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    Sorry, something went wrong while loading the question. Please try the "Next Question" button, or report the issue if it persists.
                </p>
                <button 
                    onClick={this.handleReport}
                    className="mt-4 w-full h-10 px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 inline-flex items-center justify-center rounded-md text-sm font-medium"
                >
                    Report Issue
                </button>
            </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}