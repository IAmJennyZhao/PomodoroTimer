import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import useReducedMotion, { MotionPreferenceContext } from './useReducedMotion';
import { InfoTip } from './ui';

const originalMatchMedia = window.matchMedia;
afterEach(() => { window.matchMedia = originalMatchMedia; });

function Harness({ preference = false }) {
  const reduced = useReducedMotion(preference);
  return <MotionPreferenceContext.Provider value={reduced}>
    <output aria-label="Effective reduced motion">{String(reduced)}</output>
    <InfoTip label="Help">Details</InfoTip>
  </MotionPreferenceContext.Provider>;
}

test('live system preference changes apply to portaled help and cannot be overridden by the app', () => {
  let listener;
  const media = { matches: false, addEventListener: jest.fn((_, callback) => { listener = callback; }), removeEventListener: jest.fn() };
  window.matchMedia = jest.fn(() => media);
  const view = render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Help' }));
  expect(screen.getByRole('note')).not.toHaveClass('reduce-motion');
  act(() => { media.matches = true; listener(); });
  expect(screen.getByLabelText('Effective reduced motion')).toHaveTextContent('true');
  expect(screen.getByRole('note')).toHaveClass('reduce-motion');
  view.rerender(<Harness preference={false} />);
  expect(screen.getByRole('note')).toHaveClass('reduce-motion');
  act(() => { media.matches = false; listener(); });
  expect(screen.getByRole('note')).not.toHaveClass('reduce-motion');
  view.rerender(<Harness preference />);
  expect(screen.getByRole('note')).toHaveClass('reduce-motion');
  view.unmount();
  expect(media.removeEventListener).toHaveBeenCalledWith('change', listener);
});

test('the app preference works when matchMedia is unavailable', () => {
  window.matchMedia = undefined;
  render(<Harness preference />);
  expect(screen.getByLabelText('Effective reduced motion')).toHaveTextContent('true');
});

test('legacy media listeners are cleaned up too', () => {
  const media = { matches: true, addListener: jest.fn(), removeListener: jest.fn() };
  window.matchMedia = jest.fn(() => media);
  const view = render(<Harness />);
  expect(screen.getByLabelText('Effective reduced motion')).toHaveTextContent('true');
  view.unmount();
  expect(media.removeListener).toHaveBeenCalledWith(media.addListener.mock.calls[0][0]);
});
