import { scan } from 'react-scan';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App.jsx';
import theme from './themes';
import './index.css';
import { AppProvider } from './context/AppContext';

if (import.meta.env.DEV) {
  scan({
    enabled: false,
    showTooltip: true,
  });
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="m-5 rounded border border-red-500 bg-red-50 p-5">
          <h2 className="text-ui-text-error">Something went wrong.</h2>
          <details className="whitespace-pre-wrap text-ui-text-secondary">
            {this.state.error && this.state.error.toString()}
          </details>
          <button
            onClick={() => window.location.reload()}
            className="mt-2.5 cursor-pointer rounded border-none bg-red-500 px-4 py-2 text-white"
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const CONTAINER_MAX_WIDTH = 1200;
const MOBILE_BREAKPOINT = 950;
const SVG_WIDTH_PERCENTAGE = theme.visualisation.svg.widthPercentage;
const SVG_ASPECT_RATIO = theme.visualisation.svg.aspectRatio;
const SVG_RADIUS_PERCENTAGE = theme.visualisation.svg.radiusPercentage;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProvider
        SVG_WIDTH_PERCENTAGE={SVG_WIDTH_PERCENTAGE}
        SVG_ASPECT_RATIO={SVG_ASPECT_RATIO}
        SVG_RADIUS_PERCENTAGE={SVG_RADIUS_PERCENTAGE}
        CONTAINER_MAX_WIDTH={CONTAINER_MAX_WIDTH}
        MOBILE_BREAKPOINT={MOBILE_BREAKPOINT}
      >
        <App />
      </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
