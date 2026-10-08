import { fireEvent, render, screen } from '@testing-library/react';
import EggSelection from './EggSelection';
import { createInitialState, gameReducer } from './game';

const NOW = new Date('2026-10-01T15:00:00Z').getTime();
const act = (state, type, extra = {}) => gameReducer(state, { type, now: NOW, ...extra });

test('focus displays progress for the selected egg and opens its nest', () => {
  let state = act(createInitialState(NOW), 'BUY_EGG', { kind: 'basic' });
  state.eggs[0].progressMinutes = 12;
  const openNest = jest.fn();
  render(<EggSelection state={state} openNest={openNest} />);
  expect(screen.getByLabelText('Focus egg')).toHaveTextContent('Next session: Basic egg 1 · 12/25 min');
  fireEvent.click(screen.getByRole('button', { name: 'Open nest' }));
  expect(openNest).toHaveBeenCalledTimes(1);
});

test('changing and deselecting the next egg preserves the visible session attachment', () => {
  let state = act(createInitialState(NOW), 'BUY_EGG', { kind: 'basic' });
  state = act(state, 'BUY_EGG', { kind: 'mystery', roll: 0.95 });
  state = act(state, 'START');
  const view = render(<EggSelection state={state} openNest={() => {}} />);
  expect(screen.getByLabelText('Focus egg')).toHaveTextContent('Studying with you: Basic egg 1 · 0/25 min');
  expect(screen.getByText('Also selected for next session')).toBeInTheDocument();
  state = act(state, 'SELECT_EGG', { id: state.eggs[1].id });
  view.rerender(<EggSelection state={state} openNest={() => {}} />);
  expect(screen.getByLabelText('Focus egg')).toHaveTextContent('Next session: Dreamy egg 2 · 0/100 min');
  state = act(state, 'SELECT_EGG', { id: null });
  view.rerender(<EggSelection state={state} openNest={() => {}} />);
  expect(screen.getByLabelText('Focus egg')).toHaveTextContent('Studying with you: Basic egg 1');
  expect(screen.getByLabelText('Focus egg')).toHaveTextContent('Next session: No egg selected');
  state = act(state, 'TICK', { now: NOW + 25 * 60000 });
  view.rerender(<EggSelection state={state} openNest={() => {}} />);
  expect(state.eggs.map(egg => egg.progressMinutes)).toEqual([25, 0]);
  expect(screen.queryByText('Studying with you:', { exact: true })).not.toBeInTheDocument();
});

test('an egg purchased during focus stays a next-session choice until the session ends', () => {
  let state = act(createInitialState(NOW), 'START');
  state = act(state, 'BUY_EGG', { kind: 'basic' });
  render(<EggSelection state={state} openNest={() => {}} />);
  expect(screen.getByLabelText('Focus egg')).toHaveTextContent('Studying with you: No egg this session');
  expect(screen.getByLabelText('Focus egg')).toHaveTextContent('Next session: Basic egg 1');
});
