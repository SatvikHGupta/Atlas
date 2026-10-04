'use client';

// RES-01: last-resort boundary for errors in the root layout itself. It replaces the whole document, so it must
// render <html>/<body> and cannot rely on the app's CSS or theme variables.
export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0b0b12', color: '#e8e8f0', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem' }}>Atlas hit an unexpected error.</h1>
          <p style={{ opacity: 0.7 }}>Your progress is safe. Reloading usually fixes this.</p>
          <button type="button" onClick={() => reset()} style={{ padding: '10px 20px', borderRadius: 8, border: 0, background: '#7c5cff', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
