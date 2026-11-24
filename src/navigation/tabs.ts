// The four tabs, in the order the bar shows them. The Share button sits in
// the middle, between Discover and Archive. Route names are the file names in
// src/app/(tabs)/.
export const TABS = [
  { route: 'index', label: 'Home' },
  { route: 'discover', label: 'Discover' },
  { route: 'archive', label: 'Archive' },
  { route: 'people', label: 'Your people' },
] as const;

export type TabRoute = (typeof TABS)[number]['route'];

/** "Good morning", "Good afternoon" or "Good evening" for an hour from 0 to 23. */
export function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}
