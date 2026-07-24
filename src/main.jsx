import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(err, info) {
    console.error('[Atlas] Render error:', err, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100dvh',
          background: '#050508',
          color: '#e8e8f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          gap: '1rem',
        }}>
          <span style={{ fontSize: '2rem' }}>◈</span>
          <h2 style={{ margin: 0 }}>Atlas failed to start</h2>
          <p style={{ color: '#9090a8', maxWidth: 480, textAlign: 'center' }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <p style={{ color: '#5a5a72', fontSize: '0.85rem', maxWidth: 480, textAlign: 'center' }}>
            Most likely cause: <code style={{ color: '#a78bfa' }}>frontend/.env</code> is missing or has wrong Firebase credentials.
            Check the browser console for details.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 1.25rem',
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
