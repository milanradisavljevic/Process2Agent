import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('process2agent Runtime-Fehler', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="fatal-error">
          <p className="eyebrow">Runtime-Fehler</p>
          <h1>Die Ansicht konnte nicht gerendert werden.</h1>
          <p>{this.state.error.message}</p>
          <button type="button" className="primary-button compact" onClick={() => window.location.reload()}>
            App neu laden
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
