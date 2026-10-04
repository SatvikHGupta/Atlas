// Pure store/typing sync for the search box. Author: Satvik Hemant Gupta
// BUG-099/100/101: the filter store is the single source of truth. The input
// shows the store value, and keeps a local "draft" only while typing.
//
// state: { draft: string | null, committed: string | null }
//   draft     null means "not typing, show the store value"
//   committed the value WE last wrote to the store (to spot our own echo)

export const initialSearchState = { draft: null, committed: null };

export const inputValue = (state, storeValue) =>
  state.draft !== null ? state.draft : storeValue || '';

// True when a debounced write to the store is due.
export const needsCommit = (state, storeValue) =>
  state.draft !== null && state.draft !== (storeValue || '');

export function searchReducer(state, action) {
  switch (action.type) {
    case 'type':
      return { ...state, draft: action.value };
    case 'commit':
      // We are about to write state.draft into the store.
      return { ...state, committed: state.draft };
    case 'clear':
      // User pressed the clear button: store is written by the caller.
      return { draft: null, committed: null };
    case 'storeChanged': {
      const v = action.value || '';
      if (v === state.committed) {
        // Echo of our own write. Keep any newer text the user typed since.
        return {
          draft: state.draft === v ? null : state.draft,
          committed: null,
        };
      }
      // External change (Clear filters, URL, reset): the store wins and any
      // stale draft is dropped, so it can never be re-applied later.
      return { draft: null, committed: null };
    }
    default:
      return state;
  }
}
