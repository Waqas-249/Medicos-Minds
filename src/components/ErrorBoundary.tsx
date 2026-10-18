import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('ErrorBoundary caught error:', error?.message, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl border border-stone-200 p-8 text-center shadow-lg">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-4 border border-amber-200">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-[#2D3436]">Something went wrong</h2>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              The page encountered a temporary display issue. Tap reload below to refresh the notes store smoothly.
            </p>
            <button
              onClick={this.handleReload}
              className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#5C715E] hover:bg-[#4A5D4E] text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-98 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload App</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
