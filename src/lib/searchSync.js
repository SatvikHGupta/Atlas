// Pure store/typing sync for the search box. Author: Satvik Hemant Gupta

export const initialSearchState = { draft: null, committed: null };

export const inputValue = (state, storeValue) =>
  state.draft !== null ? state.draft : storeValue || '';

// True when a debounced write to the store is due
export const needsCommit = (state, storeValue) =>
  state.draft !== null && state.draft !== (storeValue || '');

export function searchReducer(state, action) {
  switch (action.type) {
    case 'type':
      return { ...state, draft: action.value };
    case 'commit':
      return { ...state, committed: state.draft };
    case 'clear':
      return { draft: null, committed: null };
    case 'storeChanged': {
      const v = action.value || '';
      if (v === state.committed) {
        return {
          draft: state.draft === v ? null : state.draft,
          committed: null,
        };
      }
      return { draft: null, committed: null };
    }
    default:
      return state;
  }
}
