import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  Avatar,
  Banner,
  Button,
  Card,
  Chip,
  ChoiceRow,
  cleanCode,
  CodeEntry,
  DIGITS,
  EmptyView,
  ErrorView,
  INVITE_ALPHABET,
  ListRow,
  LoadingView,
  ScreenHeader,
  Sheet,
  TextField,
  ToastProvider,
  TOAST_MS,
  useToast,
} from '..';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

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
    await render(
      <TextField
        label="Your name"
        value=""
        onChangeText={onChangeText}
        hint="This is what new people see."
      />,
    );
    expect(screen.getByText('This is what new people see.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Your name'), 'Sam');
    expect(onChangeText).toHaveBeenCalledWith('Sam');
  });

  it('replaces the hint with an announced error', async () => {
    await render(
      <TextField
        label="Email"
        value="sam@"
        error="That email address is missing its ending"
        hint="We send a code here."
      />,
    );
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
    expect(screen.getByLabelText('Invite code')).toHaveAccessibilityValue({
      text: 'K 7 Q M 2 X R T',
    });
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

describe('ChoiceRow and Chip', () => {
  it('is a radio that says whether it is chosen', async () => {
    const onPress = jest.fn();
    await render(<ChoiceRow label="Working" selected onPress={onPress} />);
    const row = screen.getByRole('radio', { name: 'Working' });
    expect(row).toBeChecked();
    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalled();
  });

  it('is a checkbox when it is a chip', async () => {
    await render(<Chip label="Politics" selected={false} onPress={() => {}} />);
    expect(screen.getByRole('checkbox', { name: 'Politics' })).not.toBeChecked();
  });
});

describe('Avatar', () => {
  it('shows the first letter and is read as the name', async () => {
    await render(<Avatar name="sam" color="#D9A033" />);
    expect(screen.getByRole('image', { name: 'sam' })).toHaveTextContent('S');
  });

  it('is skipped by screen readers when the name is written beside it', async () => {
    await render(<Avatar name="Mom" color="#35604E" decorative />);
    expect(screen.queryByLabelText('Mom')).toBeNull();
  });
});

describe('Banner', () => {
  it('announces an error and offers its action and a way to dismiss it', async () => {
    const onRetry = jest.fn();
    const onDismiss = jest.fn();
    await render(
      <Banner
        tone="error"
        message="You're offline"
        action={{ label: 'Retry', onPress: onRetry }}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getByRole('alert', { name: "You're offline" })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onRetry).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('Toast', () => {
  function Opener() {
    const toast = useToast();
    return <Button label="Copy" onPress={() => toast.show('Code copied', { tone: 'success' })} />;
  }

  it('shows a message, reads it out, then goes away', async () => {
    jest.useFakeTimers();
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ToastProvider>
          <Opener />
        </ToastProvider>
      </SafeAreaProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Copy' }));
    expect(screen.getByText('Code copied', { includeHiddenElements: true })).toBeTruthy();
    expect(announce).toHaveBeenCalledWith('Code copied');
    await act(async () => {
      jest.advanceTimersByTime(TOAST_MS + 1000);
    });
    expect(screen.queryByText('Code copied', { includeHiddenElements: true })).toBeNull();
    jest.useRealTimers();
  });
});

describe('Sheet', () => {
  it('shows its title and content only when open, and closes from outside', async () => {
    const onClose = jest.fn();
    const ui = (visible: boolean) => (
      <SafeAreaProvider initialMetrics={metrics}>
        <Sheet visible={visible} onClose={onClose} title="Sign out of Twig?">
          <Button label="Sign out" onPress={() => {}} />
        </Sheet>
      </SafeAreaProvider>
    );
    const view = await render(ui(false));
    expect(screen.queryByText('Sign out of Twig?')).toBeNull();
    await view.rerender(ui(true));
    expect(screen.getByRole('header', { name: 'Sign out of Twig?' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Close', includeHiddenElements: true }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Empty, loading and error views', () => {
  it('gives an empty screen a heading and one thing to do', async () => {
    const onPress = jest.fn();
    await render(
      <EmptyView
        title="No one here yet"
        message="Invite someone to start."
        action={{ label: 'Invite someone', onPress }}
      />,
    );
    expect(screen.getByRole('header', { name: 'No one here yet' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Invite someone' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('labels the spinner', async () => {
    await render(<LoadingView label="Finding your people" />);
    expect(screen.getByRole('progressbar', { name: 'Finding your people' })).toBeBusy();
  });

  it('announces an error and can retry', async () => {
    const onRetry = jest.fn();
    await render(<ErrorView onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
