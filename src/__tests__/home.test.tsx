import { render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/index';

describe('HomeScreen', () => {
  it('shows which backend the build talks to', async () => {
    await render(<HomeScreen />);
    expect(screen.getByText('Twig')).toBeTruthy();
    expect(screen.getByText('Connected to Twig Dev')).toBeTruthy();
  });
});
