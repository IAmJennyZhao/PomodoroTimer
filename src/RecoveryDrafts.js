import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Controls";
import { Icon, trapDialogFocus, useModalFocus } from "./ui";

export function draftFile(draft) {
  return JSON.stringify({ type: "little-room-recovery-draft", formatVersion: 1,
    capturedAt: draft.capturedAt, baseRevision: draft.baseRevision, state: draft.state }, null, 2);
}

export function downloadDraft(draft) {
  const url = URL.createObjectURL(new Blob([draftFile(draft)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `little-room-draft-${draft.capturedAt.replace(/[:.]/g, "-")}-${draft.id}.json`;
  document.body.appendChild(link);
  try { link.click(); }
  finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

function DraftReview({ persistence, initialId, onClose }) {
  const [selectedId, setSelectedId] = useState(initialId);
  const [feedback, setFeedback] = useState("");
  const dialog = useRef(null), close = useRef(null), notes = useRef(null);
  const headingId = useId();
  const drafts = persistence.drafts || [];
  const draft = drafts.find(item => item.id === selectedId) || drafts.at(-1);
  useModalFocus(dialog, close);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft.state.scratchpad || "");
      setFeedback("Notes copied. The full draft also includes your tasks and room state.");
    } catch {
      setFeedback("Copy isn’t available here. Select the text below and copy it manually.");
      notes.current?.focus(); notes.current?.select();
    }
  };
  const download = () => {
    try {
      downloadDraft(draft);
      persistence.markDraftDownloaded(draft.id);
      setFeedback("Download requested. Check that you have the file before closing this window.");
    } catch { setFeedback("Download couldn’t start. Your draft is still here; copy the notes or try downloading again."); }
  };
  return createPortal(<div className="modal-backdrop draft-backdrop">
    <section ref={dialog} className="paper draft-review" role="dialog" aria-modal="true" aria-labelledby={headingId}
      onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
        else trapDialogFocus(event, dialog.current);
      }}>
      <header><h2 id={headingId}>Unsaved edits</h2><Button ref={close} className="icon-button" aria-label="Close unsaved edits" onClick={onClose}><Icon name="close" size={20} /></Button></header>
      <div className="draft-review-body">
        <p>This copy contains your local notes, tasks and room state. It stays in this window; download it to keep a file. You can copy edits back into your saved room.</p>
        {drafts.length > 1 && <label className="draft-choice">Draft
          <select value={draft.id} onChange={event => { setSelectedId(Number(event.target.value)); setFeedback(""); }}>
            {drafts.map((item, index) => <option key={item.id} value={item.id}>Draft {index + 1} · {new Date(item.capturedAt).toLocaleString()}</option>)}
          </select>
        </label>}
        <label>Scratchpad text<textarea ref={notes} readOnly value={draft?.state.scratchpad || ""} aria-label="Draft Scratchpad text" /></label>
        <h3>Session checklist</h3>
        {draft?.state.timer.tasks?.length ? <ul>{draft.state.timer.tasks.map(task => <li key={task.id}>{task.done ? "Done: " : "To do: "}{task.text}</li>)}</ul>
          : <p>{draft?.state.timer.task || "No task entered."}</p>}
        {draft?.state.timer.tags?.length > 0 && <p>Tags: {draft.state.timer.tags.join(", ")}</p>}
        <div className="draft-actions">
          <Button className="small-button" disabled={!draft?.state.scratchpad} onClick={copy}>Copy notes</Button>
          <Button className="secondary-button" onClick={download}>Download draft</Button>
        </div>
        <p className="draft-feedback" role="status">{feedback}</p>
        {persistence.status === "conflict" && <Button className="small-button" onClick={() => { onClose(); persistence.reload(); }}>Load saved room</Button>}
      </div>
    </section>
  </div>, document.querySelector(".app") || document.body);
}

export default function DraftActions({ persistence }) {
  const [open, setOpen] = useState(false);
  const [draftId, setDraftId] = useState(null);
  if (!persistence.drafts?.length && !(persistence.ready && persistence.status === "error")) return null;
  return <><Button className="small-button" onClick={() => {
    const draft = persistence.keepDraft?.("manual") || persistence.drafts.at(-1);
    setDraftId(draft?.id); setOpen(true);
  }}>Review unsaved edits</Button>
    {open && <DraftReview persistence={persistence} initialId={draftId} onClose={() => setOpen(false)} />}
  </>;
}
