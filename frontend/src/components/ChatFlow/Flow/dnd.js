// src/components/Flow/dnd.js
export const DND_MIME_RESULT = "application/x-ttibu-resultcard";
export const DND_MIME_GROUP  = "application/x-ttibu-card";

/** DataTransfer에서 JSON payload를 파싱 (여러 MIME 후보 지원) */
export function getPayloadFromDT(dt, mimeList = [DND_MIME_RESULT, DND_MIME_GROUP]) {
  let raw = "";
  for (const mime of mimeList) {
    raw = dt.getData(mime);
    if (raw) break;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
