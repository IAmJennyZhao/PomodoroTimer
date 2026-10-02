import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createInitialState, gameReducer } from './game';
import { AnimalsPanel, DecoratePanel, SessionControls, SettingsPanel, ShopPanel, SoundPanel } from './panels';

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

test('purchases show star rarities and only one egg can be selected for studying', () => {
  const initial = { ...createInitialState(NOW), gems: 85 };
  const { getState } = renderPanel(ShopPanel, initial);
  fireEvent.click(screen.getByRole('button', { name: /Buy basic egg/ }));
  expect(getState().gems).toBe(60);
  fireEvent.click(screen.getByRole('button', { name: /Roll mystery egg/ }));
  expect(getState().gems).toBe(0);
  expect(getState().eggs.map(egg => egg.rarity)).toEqual(['basic', 'dreamy']);
  expect(screen.getByRole('button', { name: /Buy basic egg/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Roll mystery egg/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Hatch dreamy egg 2' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Deselect basic egg 1' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Select dreamy egg 2' }));
  expect(getState().selectedEggId).toBe(getState().eggs[1].id);
  expect(screen.getByRole('button', { name: 'Select basic egg 1' })).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Deselect dreamy egg 2' }));
  expect(getState().selectedEggId).toBeNull();
  expect(screen.getByLabelText('Egg rarities')).toHaveTextContent('Basic');
  expect(screen.getByLabelText('Egg rarities')).toHaveTextContent('100 min to hatch');
});

test('a fully studied egg hatches into a room resident', () => {
  const initial = createInitialState(NOW);
  initial.eggs = [{ id: 'ready-egg', rarity: 'dreamy', progressMinutes: 100, requiredMinutes: 100, createdAt: NOW }];
  initial.selectedEggId = 'ready-egg';
  const { getState } = renderPanel(ShopPanel, initial);
  fireEvent.click(screen.getByRole('button', { name: 'Hatch dreamy egg 1' }));
  expect(getState().animals).toHaveLength(2);
  expect(getState().animals[1]).toMatchObject({ species: 'deer', rarity: 'dreamy', placed: true });
  expect(getState().eggs).toHaveLength(0);
});

test('shop explains why ongoing overtime rewards are not yet spendable', () => {
  let initial = gameReducer(createInitialState(NOW), { type: 'SET_SETTINGS', settings: { endBehavior: 'overtime' }, now: NOW });
  initial = gameReducer(initial, { type: 'START', now: NOW });
  initial = gameReducer(initial, { type: 'TICK', now: NOW + 25 * 60000 });
  renderPanel(ShopPanel, initial);
  expect(screen.getByRole('button', { name: /Buy basic egg/ })).toBeDisabled();
  expect(screen.getByText(/Finish this session to spend the 25 earned so far/)).toBeInTheDocument();
});

test('mystery guarantee and its different odds are disclosed before buying', () => {
  renderPanel(ShopPanel, { ...createInitialState(NOW), pity: 4 });
  expect(screen.getByText('Rare+ next roll')).toBeInTheDocument();
  expect(screen.queryByText(/Everyday 60%/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Egg odds' }));
  expect(screen.getByText(/Everyday 60% · Rare 30% · Dreamy 10%/)).toBeInTheDocument();
  expect(screen.getByText(/On a guaranteed roll: Rare 90% · Dreamy 10%/)).toBeInTheDocument();
});

test('decoration purchases can be used, equipped, positioned, and removed without rebuying furniture', () => {
  const { getState } = renderPanel(DecoratePanel, { ...createInitialState(NOW), gems: 200 });
  fireEvent.click(screen.getByRole('button', { name: 'Room style' }));
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
  fireEvent.click(screen.getByRole('button', { name: 'Arrange room' }));
  expect(screen.queryByRole('button', { name: 'Add Cozy cushion' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'Selected item' }), { target: { value: `decoration:${first}` } });
  fireEvent.change(screen.getByRole('slider', { name: 'Left to right' }), { target: { value: '88' } });
  fireEvent.change(screen.getByRole('slider', { name: 'Higher to lower' }), { target: { value: '80' } });
  expect(getState().room.decorations[0]).toMatchObject({ x: 88, y: 80 });
  fireEvent.click(screen.getByRole('button', { name: 'Remove from room' }));
  expect(getState().room.decorations).toHaveLength(1);
  expect(getState().owned.decorations).toContain('cushion');
});

test('undiscovered tiles reveal the matching egg and owned pets show six upgrade slots', () => {
  renderPanel(AnimalsPanel);
  expect(screen.getByRole('region', { name: 'Undiscovered pets' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Discover Dreamy Fox, 4 stars' }));
  expect(screen.getByRole('region', { name: 'Undiscovered pet details' })).toHaveTextContent('Dreamy egg');
  expect(screen.getByRole('region', { name: 'Undiscovered pet details' })).toHaveTextContent('100 focus minutes');
  fireEvent.click(screen.getByRole('button', { name: 'Back to my pet' }));
  expect(screen.getByLabelText('0 of 6 upgrades')).toBeInTheDocument();
  expect(screen.getByText('1 of 7 animations unlocked')).toBeInTheDocument();
});

test('collection controls keep an animal safe in the collection and equip only unlocked accessories', () => {
  const initial = createInitialState(NOW);
  initial.owned.accessories.push('bow');
  const { getState } = renderPanel(AnimalsPanel, initial);
  expect(screen.getByRole('option', { name: /Tiny crown/ })).toBeDisabled();
  fireEvent.change(screen.getByRole('combobox', { name: 'Accessory' }), { target: { value: 'bow' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Show in room' }));
  expect(getState().animals[0]).toMatchObject({ accessory: 'bow', placed: false });
  expect(screen.getByText('In collection')).toBeInTheDocument();
  expect(getState().animals).toHaveLength(1);
});

test('sound playback is user initiated and each saved channel controls the actual engine', async () => {
  const engine = { current: { start: jest.fn().mockResolvedValue(true), stop: jest.fn(), setVolume: jest.fn() } };
  const { getState } = renderPanel(SoundPanel, createInitialState(NOW), { engine, report: jest.fn() });
  expect(engine.current.start).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Play sounds' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Pause sounds' })).toBeEnabled());
  fireEvent.change(screen.getByRole('slider', { name: 'Fireplace' }), { target: { value: '65' } });
  expect(getState().settings.ambient.fire).toBe(0.65);
  expect(engine.current.setVolume).toHaveBeenCalledWith('fire', 0.65);
  fireEvent.click(screen.getByRole('button', { name: 'Pause sounds' }));
  expect(engine.current.stop).toHaveBeenCalledTimes(1);
});

test('unavailable audio reports a recoverable error without pretending playback started', async () => {
  const report = jest.fn();
  renderPanel(SoundPanel, createInitialState(NOW), { engine: { current: { start: jest.fn().mockResolvedValue(false) } }, report });
  fireEvent.click(screen.getByRole('button', { name: 'Play sounds' }));
  await waitFor(() => expect(report).toHaveBeenCalled());
  expect(screen.getByRole('button', { name: 'Play sounds' })).toHaveAttribute('aria-pressed', 'false');
});

test('session presets and custom durations apply through the reducer', () => {
  const { getState } = renderPanel(SessionControls);
  fireEvent.click(screen.getByRole('button', { name: /Deep work/ }));
  const focus = screen.getByRole('spinbutton', { name: /Focus time/ });
  expect(focus).toHaveValue(50);
  fireEvent.change(focus, { target: { value: '' } });
  fireEvent.change(focus, { target: { value: '42' } });
  fireEvent.blur(focus);
  expect(getState().settings.focusMinutes).toBe(42);
  expect(getState().timer.durationMs).toBe(42 * 60000);
  fireEvent.change(focus, { target: { value: '999' } });
  fireEvent.blur(focus);
  expect(focus).toHaveValue(180);
  fireEvent.change(focus, { target: { value: '' } });
  fireEvent.blur(focus);
  expect(focus).toHaveValue(180);
  const cadence = screen.getByRole('spinbutton', { name: /Long break every/ });
  fireEvent.change(cadence, { target: { value: '0' } });
  fireEvent.blur(cadence);
  expect(getState().settings.longBreakEvery).toBe(1);
});

test('editing durations preserves an active timer and explains when changes apply', () => {
  const initial = gameReducer(createInitialState(NOW), { type: 'START', now: NOW });
  const originalTimer = initial.timer;
  const { getState } = renderPanel(SessionControls, initial);
  fireEvent.click(screen.getByRole('button', { name: /Deep work/ }));
  expect(getState().settings.focusMinutes).toBe(50);
  expect(getState().timer).toEqual(originalTimer);
  expect(screen.getByText('Applies next session')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Changing an active timer' }));
  expect(screen.getByText(/Your current session keeps its original times and end behavior/)).toBeInTheDocument();
  expect(screen.getByText(/Reset the timer to apply changes now/)).toBeInTheDocument();
});

test('focus end choices save the setting and keep explanations behind an info button', () => {
  const { getState } = renderPanel(SessionControls);
  expect(screen.getByRole('radio', { name: 'Repeat alarm' })).toBeChecked();
  expect(screen.queryByText(/chimes once/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: 'Ding + count up' }));
  expect(getState().settings.endBehavior).toBe('overtime');
  expect(getState().timer.endBehavior).toBe('overtime');
  expect(screen.getByRole('radio', { name: 'Ding + count up' })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Focus end options' }));
  expect(screen.getByText(/Ding \+ count up chimes once/)).toBeInTheDocument();
  expect(screen.getByText(/Applies to Pomodoro sessions/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: 'Repeat alarm' }));
  expect(getState().settings.endBehavior).toBe('remind');
});

test('changing focus end behavior only affects the next active session', () => {
  const initial = gameReducer(createInitialState(NOW), { type: 'START', now: NOW });
  const { getState } = renderPanel(SessionControls, initial);
  fireEvent.click(screen.getByRole('radio', { name: 'Ding + count up' }));
  expect(getState().settings.endBehavior).toBe('overtime');
  expect(getState().timer.endBehavior).toBe('remind');
  expect(getState().timer).toEqual(initial.timer);
});

test('count-up settings show only breaks and preserve Pomodoro preferences when switching modes', () => {
  function SwitchableTiming(props) {
    return <>
      <button onClick={() => props.act({ type: 'SET_SETTINGS', settings: { workMode: 'countup' } })}>Count up</button>
      <button onClick={() => props.act({ type: 'SET_SETTINGS', settings: { workMode: 'pomodoro' } })}>Pomodoro</button>
      <SessionControls {...props} />
    </>;
  }
  const { getState } = renderPanel(SwitchableTiming);
  fireEvent.click(screen.getByRole('button', { name: /Deep work/ }));
  fireEvent.click(screen.getByRole('radio', { name: 'Ding + count up' }));
  fireEvent.click(screen.getByRole('button', { name: 'Count up', exact: true }));
  expect(screen.getByRole('heading', { name: 'Breaks' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Deep work/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('spinbutton', { name: /Focus time/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  expect(screen.getAllByRole('spinbutton')).toHaveLength(3);
  expect(screen.queryByText(/Count-up sessions have no alarm target/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Count-up timing' }));
  expect(screen.getByText(/Count-up sessions have no alarm target/)).toBeInTheDocument();
  expect(screen.getByText(/Choose Finish session/)).toBeInTheDocument();
  const shortBreak = screen.getByRole('spinbutton', { name: /Short break/ });
  fireEvent.change(shortBreak, { target: { value: '8' } });
  fireEvent.blur(shortBreak);
  expect(getState().settings).toMatchObject({ workMode: 'countup', focusMinutes: 50, breakMinutes: 8, endBehavior: 'overtime' });

  fireEvent.click(screen.getByRole('button', { name: 'Pomodoro', exact: true }));
  expect(screen.getByRole('spinbutton', { name: /Focus time/ })).toHaveValue(50);
  expect(screen.getByRole('spinbutton', { name: /Short break/ })).toHaveValue(8);
  expect(screen.getByRole('radio', { name: 'Ding + count up' })).toBeChecked();
  expect(screen.getByRole('button', { name: /Deep work/ })).toBeInTheDocument();
});

test('break edits during count up keep the active timer and the next-session note', () => {
  let initial = gameReducer(createInitialState(NOW), { type: 'SET_SETTINGS', settings: { workMode: 'countup' }, now: NOW });
  initial = gameReducer(initial, { type: 'START', now: NOW });
  const { getState } = renderPanel(SessionControls, initial);
  const longBreak = screen.getByRole('spinbutton', { name: /^Long break min$/ });
  fireEvent.change(longBreak, { target: { value: '20' } });
  fireEvent.blur(longBreak);
  expect(getState().settings.longBreakMinutes).toBe(20);
  expect(getState().timer).toEqual(initial.timer);
  expect(screen.getByText('Applies next session')).toBeInTheDocument();
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
});

test('global settings keep preferences and save recovery accessible without timing fields', () => {
  const persistence = { status: 'error', storagePath: 'C:\\private\\saves', error: 'Save unavailable', retrySave: jest.fn() };
  const { getState } = renderPanel(SettingsPanel, createInitialState(NOW), { persistence });
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox', { name: 'Auto-start breaks' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Auto-start focus' }));
  expect(getState().settings.autoStartFocus).toBe(true);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Timer sound' }));
  expect(getState().settings.soundEnabled).toBe(false);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Reduce animation' }));
  expect(getState().settings.reducedMotion).toBe(true);
  expect(screen.queryByText(persistence.storagePath)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Local save details' }));
  expect(screen.getByText(persistence.storagePath)).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Save unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
  expect(persistence.retrySave).toHaveBeenCalledTimes(1);
});
