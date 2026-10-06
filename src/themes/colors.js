// COLORS - the single colour palette. Every colour here can be picked as the PRIMARY (the accent: buttons, links, focus
// rings) or as the SECONDARY (the partner: gradients, progress bars, logo mark, second background glow). Nothing else
// lists colours; the Settings page, the CSS and the validation all read this file.
//
// A colour has one shade per mode (a colour that is readable on a dark page is too light for a white one):
//   primary  the fill: buttons, toggles, active borders. As a secondary this is the shade that is used.
//   hover    the same colour slightly deeper, for hover and pressed states.
//   link     the colour used as TEXT (links, active tabs). In light mode it equals primary: text needs more contrast
//            than a fill, so light-mode shades are darker.
// The registry (index.js) checks every colour on both modes when it loads, so an unreadable colour fails the build.
//
// group: 'basic' (everyday colours) or 'extra' (rarer, more distinctive). Settings shows them in that order.
// aliases: ids from earlier versions that should keep working (saved values map to this colour).
// Add a colour: copy an entry, change id, name, group and the six shades, done.

export const DEFAULT_PRIMARY_ID = 'atlas'; // the original Atlas violet

export const COLORS = [
  {
    id: 'atlas',
    name: 'Atlas',
    group: 'basic',
    dark:  { primary: '#7c3aed', hover: '#6d28d9', link: '#a78bfa' },
    light: { primary: '#6d28d9', hover: '#5b21b6', link: '#6d28d9' },
  },
  {
    id: 'blue',
    name: 'Blue',
    group: 'basic',
    aliases: ['frost', 'mono', 'electric', 'caffeinatedwaffle'],
    dark:  { primary: '#3b82f6', hover: '#196cf4', link: '#60a5fa' },
    light: { primary: '#1c5cea', hover: '#134ecf', link: '#1c5cea' },
  },
  {
    id: 'teal',
    name: 'Teal',
    group: 'basic',
    dark:  { primary: '#14b8a6', hover: '#109889', link: '#2dd4bf' },
    light: { primary: '#0e716a', hover: '#0a514c', link: '#0e716a' },
  },
  {
    id: 'green',
    name: 'Green',
    group: 'basic',
    aliases: ['meadow', 'sentientkebab'],
    dark:  { primary: '#22c55e', hover: '#1da74f', link: '#4ade80' },
    light: { primary: '#147739', hover: '#0f582a', link: '#147739' },
  },
  {
    id: 'yellow',
    name: 'Yellow',
    group: 'basic',
    dark:  { primary: '#facc15', hover: '#e6b905', link: '#fde047' },
    light: { primary: '#925906', hover: '#704405', link: '#925906' },
  },
  {
    id: 'orange',
    name: 'Orange',
    group: 'basic',
    aliases: ['ember'],
    dark:  { primary: '#f97316', hover: '#e56106', link: '#fb923c' },
    light: { primary: '#b83e0b', hover: '#963309', link: '#b83e0b' },
  },
  {
    id: 'red',
    name: 'Red',
    group: 'basic',
    aliases: ['cherrycola'],
    dark:  { primary: '#ef4444', hover: '#ec2323', link: '#f87171' },
    light: { primary: '#b91c1c', hover: '#9a1717', link: '#b91c1c' },
  },
  {
    id: 'pink',
    name: 'Pink',
    group: 'basic',
    aliases: ['synthwave'],
    dark:  { primary: '#ec4899', hover: '#e92887', link: '#f472b6' },
    light: { primary: '#be185d', hover: '#9e144d', link: '#be185d' },
  },
  {
    id: 'acidlime',
    name: 'Acid Lime',
    group: 'extra',
    aliases: ['toxic'],
    dark:  { primary: '#b6ff00', hover: '#9ddb00', link: '#caff4d' },
    light: { primary: '#3f6600', hover: '#294200', link: '#3f6600' },
  },
  {
    id: 'electriccyan',
    name: 'Electric Cyan',
    group: 'extra',
    dark:  { primary: '#00d4ff', hover: '#00b6db', link: '#66e3ff' },
    light: { primary: '#0a6f8a', hover: '#085469', link: '#0a6f8a' },
  },
  {
    id: 'periwinkle',
    name: 'Periwinkle',
    group: 'extra',
    dark:  { primary: '#8c9eff', hover: '#6880ff', link: '#aab6ff' },
    light: { primary: '#3949c8', hover: '#303ead', link: '#3949c8' },
  },
  {
    id: 'orchid',
    name: 'Orchid',
    group: 'extra',
    dark:  { primary: '#e359c0', hover: '#de3ab4', link: '#ed96d8' },
    light: { primary: '#aa1d87', hover: '#8c186f', link: '#aa1d87' },
  },
  {
    id: 'raspberry',
    name: 'Raspberry',
    group: 'extra',
    aliases: ['midnightburrito'],
    dark:  { primary: '#ee2b5b', hover: '#e31246', link: '#f36d8e' },
    light: { primary: '#8e0b2c', hover: '#6d0822', link: '#8e0b2c' },
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    group: 'extra',
    aliases: ['cream'],
    dark:  { primary: '#e07a5f', hover: '#da6141', link: '#f0a58e' },
    light: { primary: '#b14129', hover: '#943622', link: '#b14129' },
  },
  {
    id: 'jade',
    name: 'Jade',
    group: 'extra',
    dark:  { primary: '#00c58e', hover: '#00a174', link: '#4fe0b3' },
    light: { primary: '#00694c', hover: '#004532', link: '#00694c' },
  },
  {
    id: 'blush',
    name: 'Blush',
    group: 'extra',
    dark:  { primary: '#ffb7d1', hover: '#ff93ba', link: '#ffc9de' },
    light: { primary: '#b03a6b', hover: '#95315b', link: '#b03a6b' },
  },
];
