// ---------------------------------------------------------------------------
// AI Classification
// ---------------------------------------------------------------------------
// Replace AI_API_URL and AI_API_KEY with real values when ready.
// The function is intentionally simple so it can be swapped for any provider.
// ---------------------------------------------------------------------------

const AI_API_URL =
  process.env.REACT_APP_AI_API_URL || "https://api.example.com/v1/chat/completions";
const AI_API_KEY = process.env.REACT_APP_AI_API_KEY || "PLACEHOLDER_API_KEY";

const SYSTEM_PROMPT = `You are an assistant that classifies engineering review comments.

Classify into ONE category:

ADVISORY
MISSING_INFO
SCOPE_CHANGE
TYPE_ERROR
COMPLIANCE
STRUCTURAL
APPROVAL_BLOCKER
TECHNICAL_CONTENT
CLARIFICATION

Return ONLY the category name.`;

/**
 * Classify a single comment by calling an AI API.
 *
 * @param {string} commentText - The comment to classify.
 * @returns {Promise<string>} The classification category.
 */
export async function classifyComment(commentText) {
  const body = {
    model: "gpt-4",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Comment:\n${commentText}` },
    ],
    temperature: 0,
  };

  const response = await fetch(AI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`AI API returned status ${response.status}`);
  }

  const data = await response.json();
  const category = data.choices?.[0]?.message?.content?.trim() ?? "UNKNOWN";
  return category;
}
