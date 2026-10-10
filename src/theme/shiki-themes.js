// Syntax-highlighting themes for code blocks, one per mode, read from the mode registry
import { MODE_LIST } from '../themes/index.js';

export const SHIKI_THEMES = Object.freeze(Object.fromEntries(MODE_LIST.map((mode) => [mode.id, mode.shiki])));
