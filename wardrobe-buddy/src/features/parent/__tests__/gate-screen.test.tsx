import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createMemoryStorage } from '@/data/storage';
import { AppProvider } from '@/features/app/AppState';

import Parent from '../../../app/parent';

jest.mock('@/data/kv', () => ({ deviceStorage: {} }));
jest.mock('@/services/photos/store', () => ({ photoStore: { save: jest.fn(), remove: jest.fn(), removeAll: jest.fn(), temp: jest.fn(), discard: jest.fn() } }));
jest.mock('expo-router', () => ({ router: { replace: jest.fn(), back: jest.fn() } }));
// Fixed question: 13 × 12 = 156 (see gate.test in repository.test.ts).
jest.mock('../gate', () => ({ ...jest.requireActual('../gate'), makeGateQuestion: () => ({ a: 13, b: 12, answer: 156 }) }));

async function renderParent() {
  const weather = { searchCity: jest.fn(), getForecast: jest.fn(async () => []) };
  await render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <AppProvider storage={createMemoryStorage()} weather={weather}>
        <Parent />
      </AppProvider>
    </SafeAreaProvider>,
  );
  await waitFor(() => expect(screen.getByText('What is 13 × 12?')).toBeTruthy());
}

describe('parent area behind the gate (Phase 4 exit: gate cannot be skipped)', () => {
  it('shows only the gate until the right answer is given', async () => {
    await renderParent();
    expect(screen.queryByText('Delete everything')).toBeNull();
    expect(screen.queryByText('Export data (JSON)')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Answer'), '155');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Not quite. Here is a new question.')).toBeTruthy();
    expect(screen.queryByText('Delete everything')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Answer'), '156');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Delete everything')).toBeTruthy();
  });

  it('pauses after 3 wrong answers, even if the 4th is right', async () => {
    await renderParent();
    for (let i = 0; i < 3; i++) {
      await fireEvent.changeText(screen.getByLabelText('Answer'), '1');
      await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    }
    expect(await screen.findByText('Too many tries. Please wait 30 seconds.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Answer'), '156');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.queryByText('Delete everything')).toBeNull();
  });
});
