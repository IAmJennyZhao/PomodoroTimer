import { act, fireEvent, render, screen, within } from '@testing-library/react';
import PetDetails from './PetDetails';
import { createInitialState, MAX_UPGRADES, animationCount } from '../../domain/game';
import { MotionPreferenceContext } from '../../shared/useReducedMotion';
import { SurfaceActivityContext } from '../../shared/Transitions';
import { PET_MOTIONS } from './petMotions';

function setup(upgrades = 0) {
  const state = createInitialState();
  state.animals[0].upgrades = upgrades;
  const dispatch = jest.fn();
  const draw = ({ animal = state.animals[0], reduced = false, active = true } = {}) =>
    <MotionPreferenceContext.Provider value={reduced}><SurfaceActivityContext.Provider value={active}>
      <PetDetails key={animal.id} animal={animal} state={state} act={dispatch} />
    </SurfaceActivityContext.Provider></MotionPreferenceContext.Provider>;
  const view = render(draw());
  return { ...view, state, dispatch, update: options => view.rerender(draw(options)),
    portrait: () => view.container.querySelector('.pet-portrait .animal-art') };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test.each([0, 2, 6])('%i upgrades expose exactly 1 + upgrades of the seven named motions', upgrades => {
  const { state, dispatch, portrait } = setup(upgrades);
  const original = JSON.stringify(state);
  expect(PET_MOTIONS).toHaveLength(MAX_UPGRADES + 1);
  expect(animationCount(state.animals[0])).toBe(upgrades + 1);
  const paws = within(screen.getByRole('group', { name: 'Animation previews' })).getAllByRole('button');
  expect(paws).toHaveLength(7);
  expect(paws.filter(paw => !paw.disabled)).toHaveLength(upgrades + 1);
  PET_MOTIONS.forEach((motion, index) => {
    fireEvent.click(paws[index]);
    if (index <= upgrades) {
      expect(portrait()).toHaveAttribute('data-preview-motion', motion.id);
      expect(portrait()).toHaveAttribute('data-preview-playing', 'true');
      expect(portrait()).toHaveStyle({ animationName: `pet-${motion.id}`, animationDuration: `${motion.durationMs}ms` });
      fireEvent.animationEnd(portrait());
    } else {
      fireEvent.keyDown(paws[index], { key: 'Enter' });
      fireEvent.keyUp(paws[index], { key: ' ' });
      expect(portrait()).not.toHaveAttribute('data-preview-motion');
    }
  });
  expect(dispatch).not.toHaveBeenCalled();
  expect(JSON.stringify(state)).toBe(original);
});

test('replaying remounts the animated layer and old expiry/end events cannot stop a new preview', () => {
  const { portrait } = setup(6);
  const defaultPaw = screen.getByRole('button', { name: 'Preview Default animation, paw 1' });
  fireEvent.click(defaultPaw);
  const oldLayer = portrait();
  act(() => jest.advanceTimersByTime(2000));
  fireEvent.click(defaultPaw);
  expect(portrait()).not.toBe(oldLayer);
  fireEvent.animationEnd(oldLayer);
  expect(portrait()).toHaveAttribute('data-preview-playing', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Preview Sway animation, paw 2' }));
  act(() => jest.advanceTimersByTime(1200));
  expect(portrait()).toHaveAttribute('data-preview-motion', 'sway');
  expect(portrait()).toHaveAttribute('data-preview-playing', 'true');
  act(() => jest.advanceTimersByTime(1400));
  expect(portrait()).not.toHaveAttribute('data-preview-motion');
  expect(screen.getByRole('button', { name: 'Preview Sway animation, paw 2' })).toHaveAttribute('aria-pressed', 'false');
});

test('switching pets and leaving the panel cancel previews and their cleanup timers', () => {
  const { state, update, portrait, unmount } = setup(6);
  fireEvent.click(screen.getByRole('button', { name: 'Preview Hop animation, paw 3' }));
  update({ animal: { ...state.animals[0], id: 'another-pet', name: 'Juniper' } });
  expect(portrait()).not.toHaveAttribute('data-preview-motion');
  fireEvent.click(screen.getByRole('button', { name: 'Preview Hop animation, paw 3' }));
  update({ animal: { ...state.animals[0], id: 'another-pet', name: 'Juniper' }, active: false });
  expect(portrait()).toHaveAttribute('data-preview-playing', 'false');
  update({ animal: { ...state.animals[0], id: 'another-pet', name: 'Juniper' }, active: true });
  expect(portrait()).not.toHaveAttribute('data-preview-motion');
  fireEvent.click(screen.getByRole('button', { name: 'Preview Peek animation, paw 6' }));
  unmount();
  expect(jest.getTimerCount()).toBe(0);
});

test('reduced motion acknowledges the exact unlocked selection without moving or replaying later', () => {
  const { update, portrait } = setup(6);
  update({ reduced: true });
  fireEvent.click(screen.getByRole('button', { name: 'Preview Celebrate animation, paw 7' }));
  expect(screen.getByRole('status')).toHaveTextContent('Celebrate · reduced motion');
  expect(portrait()).toHaveAttribute('data-preview-motion', 'celebrate');
  expect(portrait()).not.toHaveClass('pet-animation-preview');
  update({ reduced: false });
  expect(portrait()).not.toHaveClass('pet-animation-preview');
  act(() => jest.advanceTimersByTime(3000));
  fireEvent.click(screen.getByRole('button', { name: 'Preview Hop animation, paw 3' }));
  expect(portrait()).toHaveClass('pet-animation-preview');
  update({ reduced: true });
  expect(portrait()).not.toHaveClass('pet-animation-preview');
  update({ reduced: false });
  expect(portrait()).not.toHaveClass('pet-animation-preview');
});
