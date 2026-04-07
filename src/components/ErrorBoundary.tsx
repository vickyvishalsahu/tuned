"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6 text-center">
            <p className="font-display text-2xl font-light text-white/60">
              Something went wrong
            </p>
            <p className="mt-3 font-body text-sm text-white/30">
              The music will return. Try refreshing.
            </p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
