// Keeps a record of every real AI call made during a session so the team
// can export it as evidence for R5 ("≥1 lời gọi AI thật... log/trace trong repo").
const STORAGE_KEY = "vlearn-ai-call-log";

function readLog() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeLog(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function logAiCall({ kind, request, response, error }) {
  const entries = readLog();
  entries.push({
    timestamp: new Date().toISOString(),
    kind,
    request,
    response: response ?? null,
    error: error ?? null,
  });
  writeLog(entries);
  return entries;
}

export function getAiLog() {
  return readLog();
}

export function clearAiLog() {
  writeLog([]);
}

export function downloadAiLog() {
  const entries = readLog();
  const blob = new Blob([JSON.stringify(entries, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ai-call-log-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
