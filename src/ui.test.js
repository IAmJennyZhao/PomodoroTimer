import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { HatchModal, InfoTip } from './ui';
import { MotionPreferenceContext } from './useReducedMotion';

test('info buttons disclose details on demand and identify their own content', () => {
  render(<>
    <InfoTip label="Egg odds">Everyday 60%, rare 30%, dreamy 10%.</InfoTip>
    <InfoTip label="Local saves">Stored on this computer.</InfoTip>
  </>);
  const odds = screen.getByRole('button', { name: 'Egg odds' });
  const saves = screen.getByRole('button', { name: 'Local saves' });
  expect(odds).toHaveAttribute('aria-expanded', 'false');
  expect(saves).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('note')).not.toBeInTheDocument();

  fireEvent.click(odds);
  const detail = screen.getByRole('note');
  expect(odds).toHaveAttribute('aria-expanded', 'true');
  expect(odds).toHaveAttribute('aria-controls', detail.id);
  expect(saves.getAttribute('aria-controls')).not.toBe(detail.id);
  expect(detail).toHaveTextContent('Everyday 60%, rare 30%, dreamy 10%.');
  expect(screen.queryByText('Stored on this computer.')).not.toBeInTheDocument();

  fireEvent.click(odds);
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
  expect(odds).toHaveAttribute('aria-expanded', 'false');
});

test('help notes have a named heading and close back to their own trigger', () => {
  render(<InfoTip label="Pause limit details">Only this session’s gems are lost.</InfoTip>);
  const trigger = screen.getByRole('button', { name: 'Pause limit details' });
  fireEvent.click(trigger);
  expect(screen.getByRole('note', { name: 'Pause limit details' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Pause limit details' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test('celebrations trap focus between X and Done, then restore the opener and background', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return <><button onClick={() => setOpen(true)}>Open celebration</button>
      {open && <HatchModal animal={{ name: 'Clover', species: 'rabbit', rarity: 'basic', upgrades: 0 }} onClose={() => setOpen(false)} />}</>;
  }
  render(<Harness />);
  const opener = screen.getByRole('button', { name: 'Open celebration' });
  opener.focus();
  fireEvent.click(opener);
  const done = screen.getByRole('button', { name: 'Done' });
  const close = screen.getByRole('button', { name: 'Close celebration' });
  expect(opener).toHaveAttribute('inert');
  expect(done).toHaveFocus();
  fireEvent.keyDown(done, { key: 'Tab' });
  expect(close).toHaveFocus();
  fireEvent.keyDown(close, { key: 'Tab' });
  expect(done).toHaveFocus();
  fireEvent.keyDown(done, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(opener).not.toHaveAttribute('inert');
  expect(opener).toHaveFocus();
  fireEvent.click(opener);
  fireEvent.click(screen.getByRole('button', { name: 'Close celebration' }));
  expect(opener).toHaveFocus();
});

test('a consumed hatch opener returns focus to the remaining workspace control', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return <><header className="drawer-heading"><button>Close panel</button></header>
      {!open && <button onClick={() => setOpen(true)}>Hatch egg</button>}
      {open && <HatchModal animal={{ name: 'Clover', species: 'rabbit', rarity: 'basic' }} onClose={() => setOpen(false)} />}</>;
  }
  render(<Harness />);
  const opener = screen.getByRole('button', { name: 'Hatch egg' });
  opener.focus();
  fireEvent.click(opener);
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(screen.getByRole('button', { name: 'Close panel' })).toHaveFocus();
});

test('hatch anticipation reveals and settles while dismissal is always available; early unmount cancels deadlines', () => {
  jest.useFakeTimers();
  const animal = { name: 'Clover', species: 'rabbit', rarity: 'basic' };
  const close = jest.fn();
  const view = render(<HatchModal animal={animal} onClose={close} />);
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveAttribute('data-hatch-phase', 'anticipate');
  expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled();
  fireEvent.keyDown(screen.getByRole('button', { name: 'Done' }), { key: 'Escape' });
  expect(close).toHaveBeenCalledTimes(1);
  act(() => jest.advanceTimersByTime(180));
  expect(dialog).toHaveAttribute('data-hatch-phase', 'reveal');
  act(() => jest.advanceTimersByTime(480));
  expect(dialog).toHaveAttribute('data-hatch-phase', 'settled');
  expect(dialog.querySelector('.hatch-anticipation')).not.toBeInTheDocument();
  view.unmount();
  const interrupted = render(<HatchModal animal={animal} onClose={close} />);
  expect(screen.getByRole('dialog')).toHaveAttribute('data-hatch-phase', 'anticipate');
  interrupted.unmount();
  expect(jest.getTimerCount()).toBe(0);
  jest.useRealTimers();
});

test('reduced motion reveals directly and changing the preference never restarts a hatch', () => {
  jest.useFakeTimers();
  const content = reduced => <MotionPreferenceContext.Provider value={reduced}>
    <HatchModal animal={{ name: 'Clover', species: 'rabbit', rarity: 'basic' }} onClose={jest.fn()} />
  </MotionPreferenceContext.Provider>;
  const view = render(content(false));
  view.rerender(content(true));
  expect(screen.getByRole('dialog')).toHaveAttribute('data-hatch-phase', 'settled');
  expect(document.querySelector('.hatch-anticipation')).not.toBeInTheDocument();
  view.rerender(content(false));
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.getByRole('dialog')).toHaveAttribute('data-hatch-phase', 'settled');
  view.unmount();
  jest.useRealTimers();
});

test.each([
  [6, false, 'All 7 animations · +10% focus gems'],
  [6, true, '+5 Shilligems'],
])('duplicate celebrations retain upgrade bonuses and capped-copy rewards', (upgrades, capped, detail) => {
  render(<HatchModal animal={{ name: 'Clover', species: 'rabbit', rarity: 'basic', upgrades }} duplicate capped={capped} onClose={jest.fn()} />);
  expect(screen.getByRole('dialog')).toHaveAccessibleDescription(detail);
  expect(screen.getByLabelText('1 star')).toBeInTheDocument();
});

test('Escape dismisses the open detail and restores focus without reaching the surrounding panel', () => {
  const panelKeyDown = jest.fn();
  render(<div onKeyDown={panelKeyDown}>
    <InfoTip label="Session rewards"><a href="#rewards">Reward details</a></InfoTip>
  </div>);
  const button = screen.getByRole('button', { name: 'Session rewards' });
  fireEvent.click(button);
  const link = screen.getByRole('link', { name: 'Reward details' });
  link.focus();
  fireEvent.keyDown(link, { key: 'Escape' });
  expect(button).toHaveAttribute('aria-expanded', 'false');
  expect(button).toHaveFocus();
  expect(panelKeyDown).not.toHaveBeenCalled();

  fireEvent.keyDown(button, { key: 'Escape' });
  expect(panelKeyDown).toHaveBeenCalledTimes(1);
});

test('portaled details stay open for their own interactions and dismiss when pointer or focus moves outside', () => {
  const { container } = render(<>
    <InfoTip label="Room controls"><a href="#room">Keyboard controls</a></InfoTip>
    <button>Continue focusing</button>
  </>);
  const button = screen.getByRole('button', { name: 'Room controls' });
  const outside = screen.getByRole('button', { name: 'Continue focusing' });
  fireEvent.click(button);
  const details = screen.getByRole('note');
  expect(container).not.toContainElement(details);
  expect(button).toHaveAttribute('aria-controls', details.id);
  fireEvent.pointerDown(details);
  expect(button).toHaveAttribute('aria-expanded', 'true');
  const link = screen.getByRole('link', { name: 'Keyboard controls' });
  fireEvent.pointerDown(link);
  link.focus();
  expect(button).toHaveAttribute('aria-expanded', 'true');
  fireEvent.pointerDown(outside);
  expect(button).toHaveAttribute('aria-expanded', 'false');

  button.focus();
  fireEvent.click(button);
  expect(button).toHaveAttribute('aria-expanded', 'true');
  act(() => outside.focus());
  expect(button).toHaveAttribute('aria-expanded', 'false');
  expect(outside).toHaveFocus();
});
