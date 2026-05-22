import React, { useState, useCallback } from "react";
import { parseFiles } from "./utils/fileParser";
import { processComments } from "./utils/batchProcessor";
import { generateSummary } from "./utils/summary";
import "./CommentAnalysisApp.css";

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".txt"];
const ACCEPTED_TYPES = ACCEPTED_EXTENSIONS.join(",");

export default function CommentAnalysisApp() {
  // ---- state ---------------------------------------------------------------
  const [files, setFiles] = useState([]);
  const [extractedComments, setExtractedComments] = useState([]);
  const [processedComments, setProcessedComments] = useState([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Idle");
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);

  // ---- handlers ------------------------------------------------------------
  const handleFileChange = useCallback((e) => {
    const selected = Array.from(e.target.files);
    const invalid = selected.filter(
      (f) => !ACCEPTED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    if (invalid.length > 0) {
      setError(
        `Unsupported file(s): ${invalid.map((f) => f.name).join(", ")}. Accepted types: ${ACCEPTED_EXTENSIONS.join(", ")}`
      );
      setFiles([]);
      return;
    }
    setFiles(selected);
    setError(null);
  }, []);

  const handleProcess = useCallback(async () => {
    if (files.length === 0) return;

    try {
      setError(null);
      setStatus("Extracting comments…");
      setProgress(0);
      setProcessedComments([]);
      setSummary(null);

      // 1. Parse files
      const comments = await parseFiles(files);
      setExtractedComments(comments);

      if (comments.length === 0) {
        setStatus("Idle");
        setError("No comments found in the uploaded files.");
        return;
      }

      // 2. Classify in batches
      setStatus("Processing");
      const classified = await processComments(comments, (done, total) => {
        setProgress(Math.round((done / total) * 100));
      });
      setProcessedComments(classified);

      // 3. Summarise
      const sum = generateSummary(classified);
      setSummary(sum);
      setStatus("Completed");
      setProgress(100);
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
      setStatus("Idle");
    }
  }, [files]);

  const toggleCategory = useCallback(
    (cat) => setExpandedCategory((prev) => (prev === cat ? null : cat)),
    []
  );

  // ---- render --------------------------------------------------------------
  return (
    <div className="app-container">
      <h1 className="app-title">Comment Analysis Tool</h1>

      {/* ---------- File Upload Section ---------- */}
      <section className="section">
        <h2>Upload Files</h2>

        <input
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          onChange={handleFileChange}
        />

        {files.length > 0 && (
          <ul className="file-list">
            {files.map((f, i) => (
              <li key={i}>{f.name}</li>
            ))}
          </ul>
        )}

        <button
          className="btn-primary"
          disabled={files.length === 0 || status === "Processing"}
          onClick={handleProcess}
        >
          {status === "Processing" ? "Processing…" : "Process Comments"}
        </button>
      </section>

      {/* ---------- Error ---------- */}
      {error && <p className="error-msg">{error}</p>}

      {/* ---------- Progress Section ---------- */}
      {status !== "Idle" && (
        <section className="section">
          <h2>Progress</h2>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="progress-text">
            {progress}% — {status}
            {extractedComments.length > 0 &&
              ` (${extractedComments.length} comments found)`}
          </p>
        </section>
      )}

      {/* ---------- Summary Section ---------- */}
      {summary && (
        <section className="section">
          <h2>Summary</h2>
          <p>
            <strong>Total comments:</strong> {summary.total}
          </p>

          <table className="summary-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary.categories).map(([cat, count]) => (
                <React.Fragment key={cat}>
                  <tr
                    className="category-row"
                    onClick={() => toggleCategory(cat)}
                  >
                    <td>
                      {expandedCategory === cat ? "▾" : "▸"} {cat}
                    </td>
                    <td>{count}</td>
                  </tr>
                  {expandedCategory === cat && (() => {
                    const catComments = processedComments.filter(
                      (c) => c.category === cat
                    );
                    return (
                      <tr>
                        <td colSpan={2} className="expanded-cell">
                          <ul className="comment-list">
                            {catComments.map((c) => (
                              <li key={c.commentId}>
                                <span className="comment-id">
                                  #{c.commentId}
                                </span>{" "}
                                {c.commentText}
                              </li>
                            ))}
                            {catComments.length === 0 && (
                              <li className="no-comments">
                                No comments in this category.
                              </li>
                            )}
                          </ul>
                        </td>
                      </tr>
                    );
                  })()}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
