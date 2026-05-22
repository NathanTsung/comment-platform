import { classifyComment } from "./classifier";

const BATCH_SIZE = 5;

/**
 * Process an array of comments in batches, classifying each via AI.
 *
 * @param {Array<{commentId: number, commentText: string}>} comments
 * @param {(processed: number, total: number) => void} onProgress - Called after each batch.
 * @returns {Promise<Array<{commentId: number, commentText: string, category: string}>>}
 */
export async function processComments(comments, onProgress) {
  const results = [];
  const total = comments.length;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = comments.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (comment) => {
        try {
          const category = await classifyComment(comment.commentText);
          return { ...comment, category };
        } catch {
          return { ...comment, category: "ERROR" };
        }
      })
    );

    results.push(...batchResults);

    if (onProgress) {
      onProgress(results.length, total);
    }
  }

  return results;
}
