import React from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

function sanitizeErrorMessage(msg) {
  if (!msg) return 'An unexpected rendering error occurred.';
  let sanitized = String(msg);
  // Redact potential Gemini or Google API keys (AIza..., AQ...)
  sanitized = sanitized.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
  sanitized = sanitized.replace(/AQ\.[0-9A-Za-z-_]{50,}/g, '[REDACTED_KEY]');
  sanitized = sanitized.replace(/tvly-[0-9A-Za-z-_]{30,}/g, '[REDACTED_KEY]');
  return sanitized;
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    if (process.env.NODE_ENV !== 'production' || import.meta.env?.DEV) {
      console.error('[RealityCheck ErrorBoundary Caught Exception]:', error, errorInfo);
    }
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReturnHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const sanitizedMsg = sanitizeErrorMessage(
        this.state.error?.message || this.state.error?.toString()
      );

      return (
        <div className="panel error-boundary-panel" role="alert" style={{
          background: 'linear-gradient(180deg, rgba(30, 15, 20, 0.95), rgba(15, 23, 42, 0.95))',
          borderColor: 'rgba(239, 68, 68, 0.4)',
          padding: '24px',
          margin: '24px 0',
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444'
            }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#FCA5A5', fontWeight: 700 }}>
                {this.props.title || 'Result Display Recovered'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#94A3B8' }}>
                The application intercepted a rendering exception to prevent a blank screen.
              </p>
            </div>
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: '3px solid #EF4444',
            marginBottom: '20px'
          }}>
            <strong style={{ fontSize: '0.82rem', color: '#F87171', display: 'block', marginBottom: '4px' }}>
              Diagnosed Root Cause:
            </strong>
            <span style={{ fontSize: '0.82rem', color: '#E2E8F0', fontFamily: 'monospace', wordBreak: 'break-word' }}>
              {sanitizedMsg}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={this.handleRetry}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '0.85rem'
              }}
            >
              <RefreshCw size={14} />
              <span>Retry Rendering</span>
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={this.handleReturnHome}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '0.85rem'
              }}
            >
              <Home size={14} />
              <span>Return to Dashboard</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

