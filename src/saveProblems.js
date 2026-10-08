const explanations = {
  connection: ["Can’t reach the local save service.", "Start the local app, then try again."],
  unreadable: ["Your room’s save and backup could not be read.", "Keep a copy of the save folder and restore a known-good backup, then try again. Existing files were preserved."],
  storage: ["The local service can’t access your save folder.", "Check that the save folder is in place, has free disk space and allows the app to write, then retry."],
  response: ["The local service returned an unexpected save response.", "Restart the local app and try again. Keep a draft of any unconfirmed edits."],
  conflict: ["This room was saved in another window.", "Review or download your local draft, then load the saved room. Your draft remains available in this window."],
  tooLarge: ["This room exceeds the save size limit.", "Download a draft to keep your edits. Check the size limit in Save details before retrying."],
  rejected: ["The local service rejected this save request.", "Open the app from its local address and restart the local app before retrying."],
  service: ["The local service couldn’t complete this request.", "Try again. If this continues, check Save details before changing your save files."],
};

export function saveProblem(kind, operation, detail = "", storagePath = "") {
  const [message, action] = explanations[kind] || explanations.service;
  const error = new Error(`${operation === "save" ? "Saving failed. " : ""}${message} ${action}`);
  error.failure = { kind, operation, message, action, detail, storagePath };
  error.conflict = kind === "conflict";
  return error;
}

export async function requestSave(options, operation) {
  let response;
  try { response = await fetch("/api/save", options); }
  catch (error) { throw saveProblem("connection", operation); }
  let result;
  try { result = await response.json(); }
  catch {
    // A stopped dev proxy may send an HTML gateway error instead of API JSON.
    throw saveProblem(!response.ok && response.status >= 500 ? "connection" : "response", operation);
  }
  if (!response.ok) {
    const codes = { SAVE_UNREADABLE: "unreadable", SAVE_STORAGE_UNAVAILABLE: "storage", SAVE_DIRECTORY_CHANGED: "storage",
      SAVE_CONFLICT: "conflict", SAVE_TOO_LARGE: "tooLarge", REQUEST_REJECTED: "rejected" };
    const kind = response.status === 409 ? "conflict" : codes[result?.code] ||
      ([502, 503, 504].includes(response.status) ? "connection" : response.status === 413 ? "tooLarge" : response.status < 500 ? "rejected" : "service");
    throw saveProblem(kind, operation, typeof result?.error === "string" ? result.error : "",
      typeof result?.storagePath === "string" ? result.storagePath : "");
  }
  return result;
}
