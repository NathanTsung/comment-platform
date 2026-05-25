import React, { useState, useCallback } from "react";
import AnalysisDashboard from "./AnalysisDashboard";
import { parseFiles } from "./utils/fileParser";
import { processComments } from "./utils/batchProcessor";
import { generateSummary } from "./utils/summary";

function App() {
  const [allProcessedComments, setAllProcessedComments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUploadedFileNames, setLastUploadedFileNames] = useState([]);
  const [progress, setProgress] = useState(0);

  /* ── Helpers ─────────────────────────────────────────────────── */

  const rebuildSummary = useCallback((comments) => {
    setSummary(generateSummary(comments));
  }, []);

  /* ── Process new files ──────────────────────────────────────── */

  const handleProcessFiles = useCallback(
    async (files) => {
      if (files.length === 0) return;
      try {
        setIsProcessing(true);
        setProgress(0);

        const newComments = await parseFiles(files);
        if (newComments.length === 0) {
          alert("No comments found in the uploaded files.");
          setIsProcessing(false);
          return;
        }

        const maxId =
          allProcessedComments.length > 0
            ? Math.max(...allProcessedComments.map((c) => c.commentId))
            : 0;

        const uploadedAt = new Date();
        const fileNames = Array.from(files).map((f) => f.name);

        const adjustedComments = newComments.map((comment, index) => ({
          ...comment,
          commentId: maxId + index + 1,
          reviewer: comment.reviewer || comment.responder || "Unassigned",
          status: comment.status || "New",
          source: comment.source || "Internal",
          uploadedAt,
        }));

        const classifiedNewComments = await processComments(
          adjustedComments,
          (done, total) => setProgress(Math.round((done / total) * 100))
        );

        const mergedComments = [
          ...allProcessedComments,
          ...classifiedNewComments,
        ];
        setAllProcessedComments(mergedComments);
        rebuildSummary(mergedComments);
        setLastUpdated(uploadedAt);
        setLastUploadedFileNames(fileNames);
        setProgress(100);
        setIsProcessing(false);
      } catch (err) {
        alert(err.message || "An error occurred while processing files.");
        setIsProcessing(false);
      }
    },
    [allProcessedComments, rebuildSummary]
  );

  /* ── Comment field updaters ─────────────────────────────────── */

  const handleUpdateComment = useCallback(
    (commentId, field, value) => {
      setAllProcessedComments((prev) => {
        const next = prev.map((c) =>
          c.commentId === commentId ? { ...c, [field]: value } : c
        );
        // Rebuild summary when status changes (affects % unresolved)
        if (field === "status") rebuildSummary(next);
        return next;
      });
    },
    [rebuildSummary]
  );

  return (
    <AnalysisDashboard
      processedComments={allProcessedComments}
      summary={summary}
      lastUpdated={lastUpdated}
      lastUploadedFileNames={lastUploadedFileNames}
      onProcessFiles={handleProcessFiles}
      onUpdateComment={handleUpdateComment}
      isProcessing={isProcessing}
      progress={progress}
    />
  );
}

export default App;
