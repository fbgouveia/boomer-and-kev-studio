'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-black/40 backdrop-blur-xl border-4 border-[#FF5F1F] rounded-lg text-[#FF5F1F] font-black uppercase tracking-widest italic min-h-[200px] w-full">
          <AlertTriangle className="w-12 h-12 mb-4 animate-pulse opacity-80" />
          <h2 className="text-2xl mb-2 text-white">System Malfunction</h2>
          <p className="text-sm opacity-80 mb-6 text-center max-w-md">
            {this.state.error?.message || 'Something went critically wrong in this component.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-6 py-3 bg-[#FF5F1F] text-black hover:bg-white hover:text-black transition-all border-2 border-transparent hover:border-[#FF5F1F] group"
          >
            <RefreshCcw className="w-5 h-5 group-hover:animate-spin" />
            Retry Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
