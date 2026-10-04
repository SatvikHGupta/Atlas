// Atlas - accent. Registered in src/themes/index.js. The original violet.
// An accent gives the brand color for BOTH modes, plus a secondary (partner) colour used in gradients and the second
// background glow. Visitors can also pair this accent with another accent's secondary in Settings. primaryLight is the
// accent used as text (links, active tabs), so in light mode it is a darker shade than primary; the registry checks
// contrast for every mode+accent pair.
const accent = {
  id: 'atlas',
  name: 'Atlas',
  description: 'The original violet.',
  secondary: '#06b6d4', // partner colour: second glow, gradients; can be mixed with any other accent

  dark: {
    primary:      '#7c3aed',
    primaryHover: '#6d28d9',
    primaryLight: '#a78bfa',
  },
  light: {
    primary:      '#6d28d9',
    primaryHover: '#5b21b6',
    primaryLight: '#6d28d9',
  },
};

export default accent;
