import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createInitialState, gameReducer } from './game';
import { AnimalsPanel, DecoratePanel, JournalPanel, SettingsPanel, ShopPanel, SoundPanel } from './panels';

const NOW = new Date('2026-10-01T15:00:00Z').getTime();

function renderPanel(Panel, initial = createInitialState(NOW), extra = {}) {
  let latest;
  function Harness() {
    const [state, setState] = useState(initial);
    const [selected, setSelected] = useState(initial.animals[0].id);
    const [selection, setSelection] = useState(null);
    const [arranging, setArranging] = useState(false);
    const [playing, setPlaying] = useState(false);
    latest = state;
    return <Panel state={state} act={action => setState(previous => gameReducer(previous, { now: NOW, roll: 0.95, ...action }))}
      selected={selected} setSelected={setSelected} selection={selection} setSelection={setSelection}
      arranging={arranging} setArranging={setArranging} playing={playing} setPlaying={setPlaying} now={NOW} {...extra} />;
  }
  return { ...render(<Harness />), getState: () => latest };
}

test('earned Shilligems buy both kinds of egg and hatching adds a real resident', () => {
  const initial = { ...createInitialState(NOW), gems: 85 };
  const { getState } = renderPanel(ShopPanel, initial);
  fireEvent.click(screen.getByRole('button', { name: /Buy basic egg/ }));
  expect(getState().gems).toBe(60);
  fireEvent.click(screen.getByRole('button', { name: /Roll mystery egg/ }));
  expect(getState().gems).toBe(0);
  expect(getState().eggs.map(egg => egg.rarity)).toEqual(['everyday', 'dreamy']);
  expect(screen.getByRole('button', { name: /Buy basic egg/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Roll mystery egg/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Hatch dreamy egg 2' }));
  expect(getState().animals).toHaveLength(2);
  expect(getState().animals[1]).toMatchObject({ species: 'deer', rarity: 'dreamy', placed: true });
  expect(getState().eggs).toHaveLength(1);
});

test('mystery guarantee and its different odds are disclosed before buying', () => {
  renderPanel(ShopPanel, { ...createInitialState(NOW), pity: 4 });
  expect(screen.getByText('Your next mystery roll is guaranteed rare or dreamy.')).toBeInTheDocument();
  expect(screen.getByText(/Everyday 60% · Rare 30% · Dreamy 10%/)).toBeInTheDocument();
  expect(screen.getByText(/On a guaranteed roll, the odds are Rare 90% · Dreamy 10%/)).toBeInTheDocument();
});

test('decoration purchases can be used, equipped, positioned, and removed without rebuying furniture', () => {
  const { getState } = renderPanel(DecoratePanel, { ...createInitialState(NOW), gems: 200 });
  fireEvent.click(screen.getByRole('button', { name: 'Unlock Moonlit den for 75 Shilligems' }));
  fireEvent.click(screen.getByRole('button', { name: 'Use Moonlit den' }));
  expect(getState().room.background).toBe('moonroom');
  fireEvent.click(screen.getByRole('button', { name: 'Accessories' }));
  fireEvent.click(screen.getByRole('button', { name: 'Unlock Tiny crown for 50 Shilligems' }));
  fireEvent.click(screen.getByRole('button', { name: 'Use Tiny crown' }));
  expect(getState().animals[0].accessory).toBe('crown');
  fireEvent.click(screen.getByRole('button', { name: 'Furniture' }));
  fireEvent.click(screen.getByRole('button', { name: 'Unlock Cozy cushion for 25 Shilligems' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add Cozy cushion' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add Cozy cushion' }));
  expect(getState().gems).toBe(50);
  expect(getState().room.decorations).toHaveLength(2);
  const first = getState().room.decorations[0].id;
  fireEvent.change(screen.getByRole('combobox', { name: 'Choose a friend or furnishing' }), { target: { value: `decoration:${first}` } });
  fireEvent.change(screen.getByRole('slider', { name: 'Left to right' }), { target: { value: '88' } });
  fireEvent.change(screen.getByRole('slider', { name: 'Back to front' }), { target: { value: '80' } });
  expect(getState().room.decorations[0]).toMatchObject({ x: 88, y: 80 });
  fireEvent.click(screen.getByRole('button', { name: 'Remove from room' }));
  expect(getState().room.decorations).toHaveLength(1);
  expect(getState().owned.decorations).toContain('cushion');
});

test('collection controls keep an animal safe in the collection and equip only unlocked accessories', () => {
  const initial = createInitialState(NOW);
  initial.owned.accessories.push('bow');
  const { getState } = renderPanel(AnimalsPanel, initial);
  expect(screen.getByRole('option', { name: /Tiny crown/ })).toBeDisabled();
  fireEvent.change(screen.getByRole('combobox', { name: 'Their little accessory' }), { target: { value: 'bow' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Keep in my room' }));
  expect(getState().animals[0]).toMatchObject({ accessory: 'bow', placed: false });
  expect(screen.getByText('Resting in collection')).toBeInTheDocument();
  expect(getState().animals).toHaveLength(1);
});

test('journal separates today from history and saves distractions and daily goals', () => {
  const initial = createInitialState(NOW);
  initial.history = [
    { id: 'earlier', task: 'Yesterday’s work', minutes: 15, completedAt: NOW - 86400000 },
    { id: 'today', task: 'Today’s work', minutes: 25, completedAt: NOW },
  ];
  const { getState } = renderPanel(JournalPanel, initial);
  expect(screen.getByText('Today’s work')).toBeInTheDocument();
  expect(screen.queryByText('Yesterday’s work')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Decrease daily goal' }));
  expect(getState().settings.dailyGoal).toBe(3);
  fireEvent.click(screen.getByRole('button', { name: 'History' }));
  expect(screen.getByText('Yesterday’s work')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Scratchpad' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Park a thought, then come back to it.' }), { target: { value: 'Remember this after focus.' } });
  expect(getState().scratchpad).toBe('Remember this after focus.');
});

test('sound playback is user initiated and each saved channel controls the actual engine', async () => {
  const engine = { current: { start: jest.fn().mockResolvedValue(true), stop: jest.fn(), setVolume: jest.fn() } };
  const { getState } = renderPanel(SoundPanel, createInitialState(NOW), { engine, report: jest.fn() });
  expect(engine.current.start).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Play soundscape' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Pause soundscape' })).toBeEnabled());
  fireEvent.change(screen.getByRole('slider', { name: 'Fireplace' }), { target: { value: '65' } });
  expect(getState().settings.ambient.fire).toBe(0.65);
  expect(engine.current.setVolume).toHaveBeenCalledWith('fire', 0.65);
  fireEvent.click(screen.getByRole('button', { name: 'Pause soundscape' }));
  expect(engine.current.stop).toHaveBeenCalledTimes(1);
});

test('unavailable audio reports a recoverable error without pretending playback started', async () => {
  const report = jest.fn();
  renderPanel(SoundPanel, createInitialState(NOW), { engine: { current: { start: jest.fn().mockResolvedValue(false) } }, report });
  fireEvent.click(screen.getByRole('button', { name: 'Play soundscape' }));
  await waitFor(() => expect(report).toHaveBeenCalled());
  expect(screen.getByRole('button', { name: 'Play soundscape' })).toHaveAttribute('aria-pressed', 'false');
});

test('presets and custom settings apply through the reducer, with clear local save recovery controls', () => {
  const persistence = { status: 'error', storagePath: 'C:\\private\\saves', error: 'Save unavailable', retrySave: jest.fn() };
  const { getState } = renderPanel(SettingsPanel, createInitialState(NOW), { persistence });
  fireEvent.click(screen.getByRole('button', { name: /Deep work/ }));
  const focus = screen.getByRole('spinbutton', { name: /Focus time/ });
  expect(focus).toHaveValue(50);
  fireEvent.change(focus, { target: { value: '' } });
  fireEvent.change(focus, { target: { value: '42' } });
  fireEvent.blur(focus);
  expect(getState().settings.focusMinutes).toBe(42);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Reduce animation' }));
  expect(getState().settings.reducedMotion).toBe(true);
  expect(screen.getByText('C:\\private\\saves')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
  expect(persistence.retrySave).toHaveBeenCalledTimes(1);
});
