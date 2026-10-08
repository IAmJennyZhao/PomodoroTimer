import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import DraftActions, { draftFile } from './RecoveryDrafts';
import { createInitialState } from './game';

const draft = (id, text) => ({ id, capturedAt: '2026-10-08T12:00:00.000Z', baseRevision: 4,
  state: { ...createInitialState(), scratchpad: text }, downloaded: false });
let persistence;
beforeEach(() => {
  persistence = { ready: true, status: 'conflict', drafts: [draft(1, 'My unsaved note')],
    reload: jest.fn(), markDraftDownloaded: jest.fn() };
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: jest.fn().mockResolvedValue() } });
  URL.createObjectURL = jest.fn().mockReturnValue('blob:test-draft');
  URL.revokeObjectURL = jest.fn();
});
afterEach(() => jest.restoreAllMocks());
const open = () => {
  render(<div className="app"><button>Outside recovery</button><DraftActions persistence={persistence} /></div>);
  const trigger = screen.getByRole('button', { name: 'Review unsaved edits' });
  trigger.focus();
  fireEvent.click(trigger);
  return screen.getByRole('dialog', { name: 'Unsaved edits' });
};

test('review copies exact notes and escape restores focus without loading or applying a draft', async () => {
  const dialog = open();
  expect(screen.getByText('Outside recovery')).toHaveAttribute('inert');
  const close = within(dialog).getByRole('button', { name: 'Close unsaved edits' });
  expect(close).toHaveFocus();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Copy notes' }));
  expect(await within(dialog).findByText(/Notes copied/)).toBeInTheDocument();
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith('My unsaved note');
  fireEvent.keyDown(close, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Review unsaved edits' })).toHaveFocus();
  expect(persistence.reload).not.toHaveBeenCalled();
});

test('clipboard rejection selects retained read-only notes for manual copying', async () => {
  navigator.clipboard.writeText.mockRejectedValueOnce(new Error('Denied'));
  const dialog = open();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Copy notes' }));
  expect(await within(dialog).findByText(/Select the text below/)).toBeInTheDocument();
  const notes = within(dialog).getByRole('textbox', { name: 'Draft Scratchpad text' });
  expect(notes).toHaveFocus();
  expect(notes.selectionEnd - notes.selectionStart).toBe('My unsaved note'.length);
  expect(notes).toHaveAttribute('readonly');
});

test('download preserves the selected full snapshot in an explicitly identified recovery file', () => {
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  persistence.drafts.push(draft(2, 'Later note'));
  const dialog = open();
  fireEvent.change(within(dialog).getByLabelText('Draft'), { target: { value: '1' } });
  expect(within(dialog).getByRole('textbox')).toHaveValue('My unsaved note');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Download draft' }));
  expect(persistence.markDraftDownloaded).toHaveBeenCalledWith(1);
  expect(click.mock.instances[0].download).toMatch(/^little-room-draft-.*-1\.json$/);
  expect(URL.createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
  expect(JSON.parse(draftFile(persistence.drafts[0]))).toEqual({ type: 'little-room-recovery-draft', formatVersion: 1,
    capturedAt: persistence.drafts[0].capturedAt, baseRevision: 4, state: persistence.drafts[0].state });
  expect(dialog).toHaveTextContent('Check that you have the file before closing');
  expect(persistence.reload).not.toHaveBeenCalled();
});

test('a failed download keeps recovery available and does not mark the draft exported', () => {
  URL.createObjectURL.mockImplementationOnce(() => { throw new Error('Unavailable'); });
  const dialog = open();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Download draft' }));
  expect(dialog).toHaveTextContent('Your draft is still here');
  expect(persistence.markDraftDownloaded).not.toHaveBeenCalled();
  expect(within(dialog).getByRole('textbox')).toHaveValue('My unsaved note');
});

test('recovery can explicitly load the saved room and remains accessible after a failed load', () => {
  persistence.ready = false;
  persistence.status = 'error';
  const dialog = open();
  expect(dialog).toHaveTextContent('My unsaved note');
  expect(within(dialog).queryByRole('button', { name: 'Load saved room' })).not.toBeInTheDocument();
  expect(persistence.reload).not.toHaveBeenCalled();
});
