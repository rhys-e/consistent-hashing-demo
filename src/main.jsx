import React from 'react';
import ReactDOM from 'react-dom/client';
import Story from './components/deck/Story';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="m-5 rounded border border-red-500 p-5 font-mono">
        <h2 className="text-ui-text-error">Something went wrong.</h2>
        <details className="whitespace-pre-wrap text-ui-text-secondary">
          {this.state.error.toString()}
        </details>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2.5 cursor-pointer rounded border-none bg-red-500 px-4 py-2 text-white"
        >
          Reload
        </button>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Story />
    </ErrorBoundary>
  </React.StrictMode>
);
