import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TokensScreen from '@/app/dev/tokens';
import { darkColors, lightColors } from '@/theme/colors';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <TokensScreen />
    </SafeAreaProvider>,
  );
}

describe('TokensScreen', () => {
  it('lists every colour role with its value', async () => {
    await renderScreen();
    for (const [role, value] of Object.entries(lightColors)) {
      expect(screen.getByText(role)).toBeTruthy();
      // some values repeat (cream is both the page and the text on primary)
      expect(screen.getAllByText(new RegExp(`^${value.replace(/[()]/g, '\\$&')}`)).length).toBeGreaterThan(0);
    }
  });

  it('switches to dark mode', async () => {
    await renderScreen();
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: 'Dark' }));
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(screen.getAllByText(new RegExp(`^${darkColors.background}`)).length).toBeGreaterThan(0);
  });

  it('shows every text style', async () => {
    await renderScreen();
    for (const variant of [
      'display',
      'title',
      'headline',
      'body',
      'label',
      'button',
      'footnote',
      'caption',
      'eyebrow',
      'code',
    ]) {
      expect(screen.getByText(new RegExp(`^${variant} · `))).toBeTruthy();
    }
  });
});
