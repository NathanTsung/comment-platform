import { classifyCommentSmart } from "./classifier";

const BATCH_SIZE = 10;

/**
 * Process an array of comments in batches using AI + fallback classification.
 *
 * @param {Array<{commentId: number, commentText: string}>} comments
 * @param {(processed: number, total: number) => void} onProgress
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
          const category = await classifyCommentSmart(comment.commentText);
          return { ...comment, category };
        } catch (err) {
          console.error(
            `Failed to classify comment #${comment.commentId}:`,
            err
          );
          return { ...comment, category: "CLARIFICATION" };
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
