"use client";

import { Component, ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class TimelineErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log vis-timeline errors but don't crash
    console.warn("Timeline error caught:", error.message);

    // If it's a vis-timeline internal error, try to recover
    if (error.message.includes("rollingModeBtn") ||
        error.message.includes("vis-timeline") ||
        error.message.includes("Cannot read properties of null")) {
      // Reset error state after a short delay to allow re-render
      setTimeout(() => {
        this.setState({ hasError: false, error: undefined });
      }, 100);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading timeline...</p>
        </div>
      );
    }

    return this.props.children;
  }
}
