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
 * Generate an enhanced summary from classified comments.
 *
 * @param {Array<{commentId: number, commentText: string, category: string, status?: string, documentName?: string}>} comments
 * @returns {{
 *   total: number,
 *   categories: Record<string, number>,
 *   mostCommonCategory: string,
 *   pctUnresolved: number,
 *   avgPerDocument: number,
 *   documentCount: number
 * }}
 */
export function generateSummary(comments) {
  const categories = {};
  for (const cat of ALL_CATEGORIES) {
    categories[cat] = 0;
  }

  const docNames = new Set();
  let unresolvedCount = 0;

  for (const c of comments) {
    const cat = c.category;
    if (cat in categories) {
      categories[cat] += 1;
    } else {
      categories["UNKNOWN"] = (categories["UNKNOWN"] || 0) + 1;
    }
    if (c.documentName) docNames.add(c.documentName);
    if (c.status !== "Closed") unresolvedCount += 1;
  }

  // Find most common category
  let mostCommonCategory = "CLARIFICATION";
  let maxCount = 0;
  for (const [cat, count] of Object.entries(categories)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonCategory = cat;
    }
  }

  const documentCount = docNames.size || 1;
  const avgPerDocument = Math.round(comments.length / documentCount);
  const pctUnresolved =
    comments.length > 0
      ? Math.round((unresolvedCount / comments.length) * 100)
      : 0;

  return {
    total: comments.length,
    categories,
    mostCommonCategory,
    pctUnresolved,
    avgPerDocument,
    documentCount,
  };
}
