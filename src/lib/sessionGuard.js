// Session guard: decides if an async result may still touch the store.
// Author: Satvik Hemant Gupta

// BUG-055/056/057/176: capture { uid, session } when an async job starts and
// check it again before applying anything. `state` is the auth store state.
export function shouldApply(state, ctx) {
  if (!ctx || !ctx.uid || !state || !state.user) return false;
  return state.user.uid === ctx.uid && state.authSession === ctx.session;
}
