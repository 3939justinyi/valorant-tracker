import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Last-resort catch for render crashes — shows a reload panel instead of a white screen. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="panel clip-corner p-8 max-w-md text-center">
            <div className="text-val-red text-4xl font-bold mb-2">//</div>
            <h1 className="text-xl font-bold uppercase tracking-widest mb-2">Something broke</h1>
            <p className="text-val-muted mb-6">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="clip-corner bg-val-red hover:bg-val-red/85 text-white font-bold uppercase tracking-widest px-6 py-2"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
