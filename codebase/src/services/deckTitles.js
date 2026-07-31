/**
 * deckTitles.js
 * Lưu và đọc tên bài giảng tùy chỉnh do Admin đặt khi upload.
 * Dùng localStorage để persist mà không cần thêm cột DB mới.
 */

const STORAGE_KEY = "vlearn_deck_titles";

/**
 * Đọc toàn bộ mapping { deckId: customTitle } từ localStorage
 */
function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

/**
 * Lưu tên bài giảng do Admin đặt cho một deck
 * @param {string} deckId
 * @param {string} title  - Tên bài giảng / Buổi học
 */
export function saveDeckTitle(deckId, title) {
  if (!deckId || !title) return;
  const all = readAll();
  all[deckId] = title.trim();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/**
 * Lấy tên tùy chỉnh của một deck (nếu có), fallback về filename
 * @param {string} deckId
 * @param {string} fallback - Tên file gốc (filename)
 */
export function getDeckTitle(deckId, fallback = "") {
  const all = readAll();
  return all[deckId] || fallback;
}

/**
 * Xóa title của một deck (dùng khi xóa deck)
 * @param {string} deckId
 */
export function removeDeckTitle(deckId) {
  const all = readAll();
  delete all[deckId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
