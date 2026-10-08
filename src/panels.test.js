import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  fireEvent.click(screen.getByRole('button', { name: 'Egg odds' }));
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
  expect(getState().selectedEggId).toBeNull();
  expect(screen.getByText('Your nest is empty :3')).toBeInTheDocument();
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});

test('an empty nest explains purchasing and exposes exact affordability and a focus route', () => {
  const onFocus = jest.fn();
  renderPanel(ShopPanel, { ...createInitialState(NOW), gems: 15 }, { onFocus });
  expect(screen.getByText('Your nest is empty :3')).toBeInTheDocument();
  expect(screen.getByText('Need 10 more gems')).toBeInTheDocument();
  expect(screen.getByText('Need 45 more gems')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Buy basic egg/ })).toHaveAccessibleDescription('Need 10 more gems');
  fireEvent.click(screen.getByRole('button', { name: 'Focus to earn gems' }));
  expect(onFocus).toHaveBeenCalledTimes(1);
});

test.each(['running', 'paused'])('nest distinguishes the attached egg from the next egg while %s', (status) => {
  let initial = gameReducer(createInitialState(NOW), { type: 'BUY_EGG', kind: 'basic', now: NOW });
  initial = gameReducer(initial, { type: 'BUY_EGG', kind: 'mystery', now: NOW, roll: 0.95 });
  initial = gameReducer(initial, { type: 'START', now: NOW });
  if (status === 'paused') initial = gameReducer(initial, { type: 'PAUSE', now: NOW });
  const { getState } = renderPanel(ShopPanel, initial);
  const current = within(screen.getByRole('group', { name: 'Basic egg 1' }));
  const next = within(screen.getByRole('group', { name: 'Dreamy egg 2' }));
  expect(current.getByText('Studying with you')).toBeInTheDocument();
  expect(current.getByText('Next session')).toBeInTheDocument();
  fireEvent.click(next.getByRole('button', { name: 'Select dreamy egg 2' }));
  expect(current.getByText('Studying with you')).toBeInTheDocument();
  expect(current.queryByText('Next session')).not.toBeInTheDocument();
  expect(next.getByText('Next session')).toBeInTheDocument();
  expect(next.queryByText('Studying with you')).not.toBeInTheDocument();
  expect(getState().timer.eggId).toBe(initial.eggs[0].id);
  fireEvent.click(next.getByRole('button', { name: 'Deselect dreamy egg 2' }));
  expect(getState().selectedEggId).toBeNull();
  expect(current.getByText('Studying with you')).toBeInTheDocument();
  expect(screen.getByText(/No egg selected for next session/)).toBeInTheDocument();
});

test('buying an egg after a session starts selects it for next time only', () => {
  const running = gameReducer(createInitialState(NOW), { type: 'START', now: NOW });
  const { getState } = renderPanel(ShopPanel, running);
  fireEvent.click(screen.getByRole('button', { name: /Buy basic egg/ }));
  expect(screen.getByText('Next session')).toBeInTheDocument();
  expect(screen.queryByText('Studying with you')).not.toBeInTheDocument();
  expect(getState().timer.eggId).toBeNull();
  expect(screen.getByText('No egg is attached to this session.')).toBeInTheDocument();
});

test('shop explains why ongoing overtime rewards are not yet spendable', () => {
  let initial = gameReducer({ ...createInitialState(NOW), gems: 0 }, { type: 'SET_SETTINGS', settings: { endBehavior: 'overtime' }, now: NOW });
  initial = gameReducer(initial, { type: 'START', now: NOW });
  initial = gameReducer(initial, { type: 'TICK', now: NOW + 25 * 60000 });
  renderPanel(ShopPanel, initial);
  expect(screen.getByRole('button', { name: /Buy basic egg/ })).toBeDisabled();
  expect(screen.getByText('25 pending')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Pending Shilligems' }));
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
  const initial = { ...createInitialState(NOW), gems: 200 };
  initial.room.decorations = [];
  const { getState } = renderPanel(DecoratePanel, initial);
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
  expect(screen.getByRole('button', { name: 'Placed Cozy cushion' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Buy another Cozy cushion for 25 Shilligems' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add Cozy cushion' }));
  expect(getState().gems).toBe(25);
  expect(getState().room.decorations).toHaveLength(2);
  const first = getState().room.decorations[0].id;
  fireEvent.click(screen.getByRole('button', { name: 'Arrange room' }));
  expect(screen.queryByRole('button', { name: 'Add Cozy cushion' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'Selected item' }), { target: { value: `decoration:${first}` } });
  expect(screen.queryByRole('button', { name: 'Move selected item right' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
  expect(getState().room.decorations).toHaveLength(1);
  expect(getState().owned.decorations).toContain('cushion');
});

test('the arrangement shop shortcut opens furniture after entering from accessories', () => {
  renderPanel(DecoratePanel);
  fireEvent.click(screen.getByRole('button', { name: 'Accessories' }));
  fireEvent.click(screen.getByRole('button', { name: 'Arrange room' }));
  fireEvent.click(screen.getByRole('button', { name: 'Furniture shop' }));
  expect(screen.getByRole('button', { name: 'Furniture' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'Soft sofa' })).toBeInTheDocument();
});

test('undiscovered tiles reveal the matching egg and owned pets show seven animation paws', () => {
  renderPanel(AnimalsPanel);
  expect(screen.getByRole('region', { name: 'Undiscovered pets' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Dreamy mystery pet 5, 4 stars' }));
  expect(screen.getByRole('region', { name: 'Undiscovered pet details' })).toHaveTextContent('Dreamy egg');
  expect(screen.getByRole('region', { name: 'Undiscovered pet details' })).not.toHaveTextContent('Fox');
  fireEvent.click(screen.getByRole('button', { name: 'Egg details' }));
  expect(screen.getByRole('note')).toHaveTextContent('100 focus minutes');
  fireEvent.click(screen.getByRole('button', { name: 'Back to my pet' }));
  expect(screen.getByLabelText('0 of 6 upgrades')).toBeInTheDocument();
  expect(screen.getByText('1 / 7 animations')).toBeInTheDocument();
  const paws = within(screen.getByRole('group', { name: 'Animation previews' })).getAllByRole('button');
  expect(paws).toHaveLength(7);
  expect(paws.filter(paw => !paw.disabled)).toHaveLength(1);
  expect(paws[0]).toHaveTextContent('Default');
});

test('collection controls keep an animal safe in the collection and equip only unlocked accessories', () => {
  const initial = createInitialState(NOW);
  initial.owned.accessories.push('bow');
  const { getState } = renderPanel(AnimalsPanel, initial);
  expect(screen.getByRole('button', { name: 'Locked Tiny crown, 50 Shilligems' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Equip Little bow' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Show in room' }));
  expect(getState().animals[0]).toMatchObject({ accessory: 'bow', placed: false });
  expect(screen.getByText('In collection')).toBeInTheDocument();
  expect(getState().animals).toHaveLength(1);
});

test('accessory tiles preview the selected pet without equipping on hover or focus', () => {
  const initial = createInitialState(NOW);
  initial.animals[0] = { ...initial.animals[0], species: 'fox', rarity: 'dreamy' };
  initial.owned.accessories.push('bow');
  const onShopAccessories = jest.fn();
  const { getState } = renderPanel(AnimalsPanel, initial, { onShopAccessories });
  const tiles = screen.getByRole('region', { name: 'Pet accessories' });
  expect(within(tiles).getAllByRole('button')).toHaveLength(5);
  const bow = within(tiles).getByRole('button', { name: 'Equip Little bow' });
  expect(bow.querySelector('.sprite')).toHaveClass('rarity-dreamy');
  expect(bow.querySelector('.sprite')).toHaveStyle({ backgroundPosition: '50% 100%' });
  expect(bow.querySelector('.accessory-bow')).toBeInTheDocument();
  fireEvent.mouseOver(bow);
  fireEvent.focus(bow);
  expect(getState().animals[0].accessory).toBe('none');
  fireEvent.click(bow);
  expect(bow).toHaveAttribute('aria-pressed', 'true');
  expect(bow).toHaveTextContent('Equipped');
  fireEvent.click(within(tiles).getByRole('button', { name: 'Locked Tiny crown, 50 Shilligems' }));
  expect(getState().animals[0].accessory).toBe('bow');
  fireEvent.click(within(tiles).getByRole('button', { name: 'Equip No accessory' }));
  expect(getState().animals[0].accessory).toBe('none');
  fireEvent.click(screen.getByRole('button', { name: 'Shop accessories' }));
  expect(onShopAccessories).toHaveBeenCalledWith(initial.animals[0].id);
});

test('the pet shop handoff opens accessories for that pet and returns after purchase and apply', () => {
  const initial = createInitialState(NOW);
  initial.animals.push({ ...initial.animals[0], id: 'second-pet', name: 'Juniper', species: 'fox', rarity: 'rare' });
  const onBackToPet = jest.fn();
  const { getState } = renderPanel(DecoratePanel, initial, { accessoryPetId: 'second-pet', onBackToPet });
  expect(screen.getByRole('button', { name: 'Accessories', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('combobox', { name: 'Pet' })).toHaveValue('second-pet');
  fireEvent.click(screen.getByRole('button', { name: 'Unlock Tiny crown for 50 Shilligems' }));
  expect(getState().gems).toBe(150);
  expect(getState().animals[1].accessory).toBe('none');
  fireEvent.click(screen.getByRole('button', { name: 'Use Tiny crown' }));
  expect(getState().animals[1].accessory).toBe('crown');
  expect(getState().animals[0].accessory).toBe('none');
  fireEvent.click(screen.getByRole('button', { name: 'Back to Juniper' }));
  expect(onBackToPet).toHaveBeenCalledWith('second-pet');
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

test.each([SoundPanel, SettingsPanel])('interaction preferences and preview work separately from timer sound in %p', async Panel => {
  const engine = { current: { setInteractionSfx: jest.fn(), playSfx: jest.fn().mockResolvedValue(true) } };
  const { getState } = renderPanel(Panel, createInitialState(NOW), { engine, persistence: { status: 'saved' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Timer sound' }));
  expect(screen.getByRole('checkbox', { name: 'Interaction sounds' })).toBeChecked();
  fireEvent.change(screen.getByRole('slider', { name: 'Interaction volume' }), { target: { value: '62' } });
  expect(getState().settings).toMatchObject({ soundEnabled: false, interactionSfxVolume: 0.62 });
  expect(engine.current.setInteractionSfx).toHaveBeenLastCalledWith({ enabled: true, volume: 0.62 });
  fireEvent.click(screen.getByRole('button', { name: 'Preview sound' }));
  await waitFor(() => expect(engine.current.playSfx).toHaveBeenCalledWith('tap', { onUnavailable: expect.any(Function) }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Interaction sounds' }));
  expect(engine.current.setInteractionSfx).toHaveBeenLastCalledWith({ enabled: false, volume: 0.62 });
  expect(screen.getByRole('button', { name: 'Preview sound' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Timer sound' }));
  expect(getState().settings).toMatchObject({ soundEnabled: true, interactionSfxEnabled: false });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Interaction sounds' }));
  fireEvent.change(screen.getByRole('slider', { name: 'Interaction volume' }), { target: { value: '0' } });
  expect(screen.getByRole('button', { name: 'Preview sound' })).toBeDisabled();
});

test('a blocked preview is recoverable without changing sound preferences', async () => {
  const engine = { current: { playSfx: jest.fn().mockImplementationOnce(async (name, { onUnavailable }) => {
    onUnavailable();
    return false;
  }).mockResolvedValue(true) } };
  const { getState } = renderPanel(SettingsPanel, createInitialState(NOW), { engine, persistence: { status: 'saved' } });
  fireEvent.click(screen.getByRole('button', { name: 'Preview sound' }));
  await screen.findByText('Audio unavailable. Try again.');
  expect(getState().settings.interactionSfxEnabled).toBe(true);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 125)); });
  fireEvent.click(screen.getByRole('button', { name: 'Preview sound' }));
  await waitFor(() => expect(screen.queryByText('Audio unavailable. Try again.')).not.toBeInTheDocument());
});

test('rapid previews and a preview muted during unlock do not report an audio failure', async () => {
  let finishPreview;
  const engine = { current: { setInteractionSfx: jest.fn(), playSfx: jest.fn(() => new Promise(resolve => { finishPreview = resolve; })) } };
  renderPanel(SettingsPanel, createInitialState(NOW), { engine, persistence: { status: 'saved' } });
  fireEvent.click(screen.getByRole('button', { name: 'Preview sound' }));
  fireEvent.click(screen.getByRole('button', { name: 'Preview sound' }));
  expect(engine.current.playSfx).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Interaction sounds' }));
  finishPreview(false);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Preview sound' })).toBeDisabled());
  expect(screen.queryByText('Audio unavailable. Try again.')).not.toBeInTheDocument();
});

test('a preview dropped behind another interaction stays silent without an audio error', async () => {
  const engine = { current: { playSfx: jest.fn().mockResolvedValue(false) } };
  renderPanel(SettingsPanel, createInitialState(NOW), { engine, persistence: { status: 'saved' } });
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Preview sound' })));
  expect(screen.queryByText('Audio unavailable. Try again.')).not.toBeInTheDocument();
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
  expect(screen.getByText(/Hold Stop to end this timer/)).toBeInTheDocument();
});

test('duration buttons step typed values once and respect timer and cadence limits', () => {
  const { getState } = renderPanel(SessionControls);
  const focus = screen.getByRole('spinbutton', { name: 'Focus time min' });
  fireEvent.click(screen.getByRole('button', { name: 'Increase focus time' }));
  expect(getState().settings.focusMinutes).toBe(26);
  expect(getState().timer.durationMs).toBe(26 * 60000);
  fireEvent.change(focus, { target: { value: '42' } });
  fireEvent.blur(focus);
  fireEvent.click(screen.getByRole('button', { name: 'Increase focus time' }));
  expect(focus).toHaveValue(43);
  fireEvent.change(focus, { target: { value: '180' } });
  fireEvent.blur(focus);
  expect(screen.getByRole('button', { name: 'Increase focus time' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Decrease focus time' }));
  expect(focus).toHaveValue(179);
  fireEvent.change(focus, { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Decrease focus time' }));
  expect(focus).toHaveValue(178);
  const cadence = screen.getByRole('spinbutton', { name: 'Long break every sessions' });
  fireEvent.change(cadence, { target: { value: '1' } });
  fireEvent.blur(cadence);
  expect(screen.getByRole('button', { name: 'Decrease long break every' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Increase long break every' }));
  expect(getState().settings.longBreakEvery).toBe(2);
});

test('duration buttons preserve an active session and count-up has only break controls', () => {
  let initial = gameReducer(createInitialState(NOW), { type: 'SET_SETTINGS', settings: { workMode: 'countup' }, now: NOW });
  initial = gameReducer(initial, { type: 'START', now: NOW });
  const { getState } = renderPanel(SessionControls, initial);
  expect(screen.queryByRole('button', { name: 'Increase focus time' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Increase short break' }));
  expect(getState().settings.breakMinutes).toBe(6);
  expect(getState().timer).toEqual(initial.timer);
});

test('compact save status retains conflict recovery and its explicit reload action', () => {
  const persistence = { status: 'conflict', recovered: true, reload: jest.fn() };
  renderPanel(SettingsPanel, createInitialState(NOW), { persistence });
  expect(within(screen.getByRole('region', { name: 'Local save' })).getByRole('status')).toHaveTextContent('Changed in another window');
  expect(screen.getByText('Recovered from backup.')).toBeInTheDocument();
  expect(screen.getByText(/Reloading replaces this window/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reload saved version' }));
  expect(persistence.reload).toHaveBeenCalledTimes(1);
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
