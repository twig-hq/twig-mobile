import { darkColors, lightColors } from '../colors';
import { contrastRatio, contrastRules } from '../contrast';
import { themeFor } from '../index';
import { text } from '../typography';

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    // order does not matter
    expect(contrastRatio('#1F4535', '#F7F1E6')).toBeCloseTo(contrastRatio('#F7F1E6', '#1F4535'), 10);
  });

  it('refuses colours it cannot measure', () => {
    expect(() => contrastRatio('rgba(0, 0, 0, 0.5)', '#FFFFFF')).toThrow();
  });
});

describe.each([
  ['light', lightColors],
  ['dark', darkColors],
])('%s colours', (_name, colors) => {
  it.each(contrastRules.map((r) => [r.fg, r.bg, r.min] as const))(
    '%s on %s reaches %s:1',
    (fg, bg, min) => {
      expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(min);
    },
  );
});

describe('themeFor', () => {
  it('gives light and dark the same roles', () => {
    expect(Object.keys(themeFor('dark').colors).sort()).toEqual(Object.keys(themeFor('light').colors).sort());
    expect(Object.keys(themeFor('dark').elevation).sort()).toEqual(Object.keys(themeFor('light').elevation).sort());
  });

  it('picks the colours for the scheme', () => {
    expect(themeFor('light').colors).toBe(lightColors);
    expect(themeFor('dark').colors).toBe(darkColors);
  });
});

describe('text styles', () => {
  it('set a font family per weight and never fontWeight', () => {
    for (const style of Object.values(text)) {
      expect(style.fontFamily).toMatch(/^DMSans_\d00\w+$/);
      expect(style).not.toHaveProperty('fontWeight');
    }
  });

  it('keep line height at or above font size', () => {
    for (const style of Object.values(text)) {
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize);
    }
  });
});
