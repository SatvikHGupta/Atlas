// Stable hue (0-359) from a name
export function nameHue(name) {
  let hash = 0;
  const text = String(name || '');
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) % 360;
  return hash;
}
