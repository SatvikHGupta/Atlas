// Shared layout for every dynamic OG image (problems/companies/patterns/ notes). next/og's ImageResponse only supports a constrained subset of CSS (flexbox, no grid), so this stays deliberately simple: a dark card matching the site's theme tokens, a small accent-colored eyebrow label, a big title, an optional subtitle line, and the Atlas wordmark pinned to the bottom - one template, four call sites, each just passing different text (see each route's opengraph-image.jsx).
export function ogTemplate({ eyebrow, title, subtitle, accent = '#7c3aed' }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px',
        backgroundColor: '#050508',
        backgroundImage: `radial-gradient(circle at 15% 15%, ${accent}33, transparent 55%)`,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignSelf: 'flex-start',
            fontSize: 28,
            fontWeight: 600,
            color: accent,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: title.length > 40 ? 56 : 72,
            fontWeight: 700,
            color: '#e8e8f0',
            lineHeight: 1.15,
            maxWidth: '980px',
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ display: 'flex', fontSize: 30, color: '#9090a8', maxWidth: '900px' }}>
            {subtitle}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            display: 'flex',
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: accent,
            color: '#fff',
            fontSize: 26,
            fontWeight: 700,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          A
        </div>
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, color: '#e8e8f0' }}>Atlas</div>
      </div>
    </div>
  );
}

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';
