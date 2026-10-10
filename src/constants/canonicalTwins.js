// problems that exist twice under different slugs
export const CANONICAL_TWINS = {
  'pow-x-n': 'powx-n',
};

export const canonicalSlugFor = (slug) => CANONICAL_TWINS[slug] || slug;
