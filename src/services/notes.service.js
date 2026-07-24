/**
 * Same exported shape as before (getIndex, getNote), same `{ data: <payload> }`
 * contract. Internals now read from services/content/dataClient.js instead
 * of hitting a REST API. See docs/03-DATA-LAYER.md "notes" section.
 */

import { getNotesIndex, getNote as fetchNote } from './content/dataClient.js';

const wrap = (data) => ({ data });

export const notesService = {
  async getIndex() {
    return wrap(await getNotesIndex());
  },

  async getNote(slug) {
    return wrap(await fetchNote(slug));
  },
};
