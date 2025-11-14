// src/routes/chatrooms/-chatFlow.storage.js

export const LS_BRANCH_BY_NODE = "ttibu-branch-by-node";
export const LS_PENDING_MSGS = "ttibu-pending-msgs";

/* -------------------------- LocalStorage 유틸 -------------------------- */
export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // silent
  }
}
