import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-center">
            <h1 className="text-xl font-black text-rose-400 mb-2 font-serif-vintage">
              Hoppla, ein Fehler ist aufgetreten!
            </h1>
            <p className="text-xs text-slate-300 mb-4">
              {this.state.error?.message || 'Unerwarteter Fehler im Spielfeld.'}
            </p>
            {this.state.error?.stack && (
              <pre className="text-[10px] text-left bg-slate-950 p-3 rounded-lg overflow-x-auto text-rose-300/80 mb-4 max-h-48 border border-slate-800">
                {this.state.error.stack}
              </pre>
            )}
            <div className="flex justify-center gap-3">
              <a
                href="/lobby"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
              >
                Zurück zur Lobby
              </a>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors"
              >
                Seite neu laden
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
