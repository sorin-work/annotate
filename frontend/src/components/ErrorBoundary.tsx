import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Keeps a crash in one page from blanking the whole app. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="panel error-panel" role="alert">
        <h2>Something went wrong on this page</h2>
        <p className="muted">
          Your highlights and notes are saved on the server. Reloading usually fixes this.
        </p>
        <button type="button" className="button primary" onClick={() => window.location.reload()}>
          Reload the page
        </button>
      </div>
    );
  }
}
