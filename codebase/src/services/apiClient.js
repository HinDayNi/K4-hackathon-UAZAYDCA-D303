/**
 * Client-side API service to connect VLearn React Frontend to FastAPI Backend (server/)
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

/**
 * Check if backend server is online & healthy
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch("/health", { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      return data.status === "ok";
    }
  } catch (err) {
    // Backend server not reachable
  }
  return false;
}

/**
 * Get list of uploaded slide decks from backend
 */
export async function fetchDecks() {
  try {
    const res = await fetch(`${API_BASE}/decks`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Backend /decks endpoint unavailable, fallback to local data.");
  }
  return null;
}

/**
 * Upload PPTX deck to backend
 * @param {File} file
 */
export async function uploadDeck(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/decks`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Upload failed with status ${res.status}`);
  }

  return await res.json(); // { deck_id, job_id, duplicate }
}

/**
 * Helper to resolve active deck ID (replaces dummy deck_demo with actual deck in database)
 */
export async function getActiveDeckId(requestedDeckId) {
  if (requestedDeckId && requestedDeckId !== "deck_demo") {
    return requestedDeckId;
  }
  const decks = await fetchDecks();
  if (decks && decks.length > 0) {
    const readyDeck = decks.find(d => d.processing_status === "ready" || d.processing_status === "ready_with_warnings");
    if (readyDeck) return readyDeck.id;
    return decks[0].id;
  }
  return requestedDeckId || "deck_demo";
}

/**
 * Fetch mindmap for a specific deck from backend
 * @param {string} deckId
 */
export async function fetchMindmap(deckId) {
  try {
    const realDeckId = await getActiveDeckId(deckId);
    const res = await fetch(`${API_BASE}/decks/${realDeckId}/mindmap`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return await res.json(); // MindmapResponse
    }
    if (res.status === 409) {
      // Mindmap not generated yet, attempt to trigger generation
      const genRes = await fetch(`${API_BASE}/decks/${realDeckId}/mindmap/generate`, {
        method: "POST",
      });
      if (genRes.ok) {
        return await genRes.json();
      }
    }
    if (res.status === 404 && realDeckId !== deckId) {
      // Retry with first available deck if requested deck 404s
      const fallbackDeckId = await getActiveDeckId(null);
      if (fallbackDeckId && fallbackDeckId !== realDeckId) {
        const retryRes = await fetch(`${API_BASE}/decks/${fallbackDeckId}/mindmap`);
        if (retryRes.ok) return await retryRes.json();
      }
    }
  } catch (err) {
    console.warn(`Backend mindmap for ${deckId} unavailable, fallback to mock data.`);
  }
  return null;
}

/**
 * Send RAG chat / tutor question to backend
 * @param {object} params
 * @param {string} params.deckId
 * @param {string} params.question
 * @param {object} [params.selection] { text, slide_id, block_ids }
 * @param {string} [params.currentSlideId]
 * @param {Array} [params.history] [{ question, answer }]
 */
export async function askTutorApi({ deckId, question, selection, currentSlideId, history = [] }) {
  try {
    const realDeckId = await getActiveDeckId(deckId);
    const payload = {
      question,
      selection: selection ? {
        text: selection.text,
        slide_id: selection.slide_id || "slide_1",
        block_ids: selection.block_ids || ["b1"]
      } : null,
      current_slide_id: currentSlideId || null,
      history: history.map(h => ({ question: h.question, answer: h.answer }))
    };

    const res = await fetch(`${API_BASE}/decks/${realDeckId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return await res.json(); // ChatResponse
    }
  } catch (err) {
    console.warn("Backend chat endpoint failed/unavailable, fallback to Gemini client-side.");
  }
  return null;
}

/**
 * Fetch all extracted slides for a deck from backend
 * @param {string} deckId
 */
export async function fetchSlides(deckId) {
  try {
    const realDeckId = await getActiveDeckId(deckId);
    const res = await fetch(`${API_BASE}/decks/${realDeckId}/slides`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      return await res.json(); // List of slide objects [{ id, slide_index, title, full_text, blocks, ... }]
    }
  } catch (err) {
    console.warn("Backend /slides endpoint unavailable:", err);
  }
  return null;
}
