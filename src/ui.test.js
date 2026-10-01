import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { InfoTip } from './ui';

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
