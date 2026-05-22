const ALL_CATEGORIES = [
  "ADVISORY",
  "MISSING_INFO",
  "SCOPE_CHANGE",
  "TYPE_ERROR",
  "COMPLIANCE",
  "STRUCTURAL",
  "APPROVAL_BLOCKER",
  "TECHNICAL_CONTENT",
  "CLARIFICATION",
];

/**
 * Generate a summary object from classified comments.
 *
 * @param {Array<{commentId: number, commentText: string, category: string}>} comments
 * @returns {{ total: number, categories: Record<string, number> }}
 */
export function generateSummary(comments) {
  const categories = {};
  for (const cat of ALL_CATEGORIES) {
    categories[cat] = 0;
  }

  for (const c of comments) {
    const cat = c.category;
    if (cat in categories) {
      categories[cat] += 1;
    } else {
      // Track unexpected categories under a generic key
      categories["UNKNOWN"] = (categories["UNKNOWN"] || 0) + 1;
    }
  }

  return { total: comments.length, categories };
}
