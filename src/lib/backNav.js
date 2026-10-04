// Pure "can we safely go back" check. Author: Satvik Hemant Gupta
// BUG-143: only use history back when the previous entry is on this site.

export function shouldUseHistoryBack({ historyLength, referrer, origin }) {
  if (!(historyLength > 1) || !referrer || !origin) return false;
  try {
    return new URL(referrer).origin === origin;
  } catch {
    return false;
  }
}
