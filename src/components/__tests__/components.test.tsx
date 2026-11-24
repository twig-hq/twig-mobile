import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button, Card, CodeEntry, cleanCode, DIGITS, INVITE_ALPHABET, ListRow, ScreenHeader, TextField } from '..';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

describe('Button', () => {
  it('is a labelled button that calls onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="Continue" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses and says it is busy while loading', async () => {
    const onPress = jest.fn();
    await render(<Button label="Send code" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Send code' });
    expect(button).toBeBusy();
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('ignores presses when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Not yet" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'Not yet' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('has a minimum height, not a fixed one, so it grows with large text', async () => {
    await render(<Button label="Continue" onPress={() => {}} />);
    const style = StyleSheet.flatten(screen.getByRole('button', { name: 'Continue' }).props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
    expect(style.height).toBeUndefined();
  });
});

describe('TextField', () => {
  it('is labelled, shows its hint and reports typing', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Your name" value="" onChangeText={onChangeText} hint="This is what new people see." />);
    expect(screen.getByText('This is what new people see.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Your name'), 'Sam');
    expect(onChangeText).toHaveBeenCalledWith('Sam');
  });

  it('replaces the hint with an announced error', async () => {
    await render(<TextField label="Email" value="sam@" error="That email address is missing its ending" hint="We send a code here." />);
    expect(screen.getByRole('alert')).toHaveTextContent('That email address is missing its ending');
    expect(screen.queryByText('We send a code here.')).toBeNull();
  });
});

describe('cleanCode', () => {
  it('upper-cases and drops characters an invite code cannot contain', () => {
    expect(cleanCode('k7qm-2xrt', INVITE_ALPHABET, 8)).toBe('K7QM2XRT');
    expect(cleanCode(' K7QM 2XRT ', INVITE_ALPHABET, 8)).toBe('K7QM2XRT');
    expect(cleanCode('IO01ab', INVITE_ALPHABET, 8)).toBe('AB');
  });

  it('stops at the code length', () => {
    expect(cleanCode('ABCDEFGHJK', INVITE_ALPHABET, 8)).toBe('ABCDEFGH');
    expect(cleanCode('12 34 56 78', DIGITS, 6)).toBe('123456');
  });
});

describe('CodeEntry', () => {
  function Harness({ onComplete }: { onComplete: (code: string) => void }) {
    const [code, setCode] = useState('');
    return <CodeEntry label="Invite code" value={code} onChangeText={setCode} onComplete={onComplete} />;
  }

  it('is one labelled field that cleans what is typed and reports a full code', async () => {
    const onComplete = jest.fn();
    await render(<Harness onComplete={onComplete} />);
    await fireEvent.changeText(screen.getByLabelText('Invite code'), 'k7qm-2xrt');
    expect(onComplete).toHaveBeenCalledWith('K7QM2XRT');
    // the boxes are hidden from screen readers, which hear the field's value instead
    expect(screen.getByText('K', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByLabelText('Invite code')).toHaveAccessibilityValue({ text: 'K 7 Q M 2 X R T' });
  });

  it('does not report a code that is not full yet', async () => {
    const onComplete = jest.fn();
    await render(<Harness onComplete={onComplete} />);
    await fireEvent.changeText(screen.getByLabelText('Invite code'), 'K7QM');
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('ListRow', () => {
  it('is one button read as title then subtitle', async () => {
    const onPress = jest.fn();
    await render(<ListRow title="Mom" subtitle="Your mother" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Mom, Your mother' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('toggles as a switch from anywhere on the row', async () => {
    const onValueChange = jest.fn();
    await render(<ListRow title="Mute notifications" toggle={{ value: false, onValueChange }} />);
    const row = screen.getByRole('switch', { name: 'Mute notifications' });
    expect(row).not.toBeChecked();
    await fireEvent.press(row);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});

describe('ScreenHeader', () => {
  it('has a labelled back button, a title and an action', async () => {
    const onBack = jest.fn();
    const onSkip = jest.fn();
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ScreenHeader onBack={onBack} title="Name and bird" action={{ label: 'Skip', onPress: onSkip }} />
      </SafeAreaProvider>,
    );
    expect(screen.getByRole('header', { name: 'Name and bird' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
    expect(onBack).toHaveBeenCalled();
    expect(onSkip).toHaveBeenCalled();
  });
});

describe('Card', () => {
  it('is a button when it can be pressed', async () => {
    const onPress = jest.fn();
    await render(
      <Card onPress={onPress} accessibilityLabel="Open Mom">
        <></>
      </Card>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Open Mom' }));
    expect(onPress).toHaveBeenCalled();
  });
});
