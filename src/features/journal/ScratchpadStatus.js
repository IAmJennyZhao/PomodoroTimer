export default function ScratchpadStatus({ status }) {
  return <span className="notes-save-state" data-save-status={status} role="status">
    {status === "saved" ? "Saved" : status === "saving" ? "Saving…" : status === "error" || status === "conflict" ? "Not saved" : ""}
  </span>;
}
