// BUG-10: problems that exist twice under different slugs. The value is the page search engines should treat as the
// original. "Pow(x, n)" was imported once from LeetCode (powx-n) and once from Striver's sheet (pow-x-n) with the same
// LeetCode link, so the Striver copy points at the LeetCode-slug page. Missing Number is NOT listed on purpose: the
// LeetCode and CSES versions are different problems that only share a title.
export const CANONICAL_TWINS = {
  'pow-x-n': 'powx-n',
};

export const canonicalSlugFor = (slug) => CANONICAL_TWINS[slug] || slug;
