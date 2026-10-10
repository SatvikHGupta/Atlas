// Session guard: decides if an async result may still touch the store. Author: Satvik Hemant Gupta

// capture { uid, session } when an async job starts and check it again before
export function shouldApply(state, ctx) {
  if (!ctx || !ctx.uid || !state || !state.user) return false;
  return state.user.uid === ctx.uid && state.authSession === ctx.session;
}
