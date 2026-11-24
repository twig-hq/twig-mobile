// Twig's brand colours. This file and colors.ts are the only places in the app
// that may write a colour value; everything else uses a role from the theme
// (see the lint rule in eslint.config.js).

export const palette = {
  forest: '#1F4535', // the logo's green: text and primary buttons
  green: '#35604E', // the parent print
  orange: '#E0663F', // the child print, carets and small accents
  rust: '#C24E2B',
  gold: '#D9A033',
  rose: '#C9785C',
  sage: '#6E9A79',
  cream: '#F7F1E6', // the page
  paper: '#FFFDF8', // fields, cards and sheets
  oat: '#F2EBDD', // sunken areas
  pen: '#2A1C16', // the birds' pen lines
  slate: '#4A5D54', // secondary text
} as const;

// The colours a person can pick for their bird, in the order the picker shows
// them. They look the same in light and dark mode. (The field is `color`, not
// `value`: Reanimated's Babel plugin warns about `.value` inside styles.)
export const birdColors = [
  { name: 'Gold', color: palette.gold },
  { name: 'Orange', color: palette.orange },
  { name: 'Rose', color: palette.rose },
  { name: 'Rust', color: palette.rust },
  { name: 'Green', color: palette.green },
  { name: 'Sage', color: palette.sage },
  { name: 'Forest', color: palette.forest },
] as const;

export type BirdColor = (typeof birdColors)[number];
