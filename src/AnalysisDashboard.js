import React, { useState, useMemo, useEffect } from "react";
import FileUploadComponent from "./FileUploadComponent";
import DonutChart, { CATEGORY_COLORS, CATEGORY_LABELS } from "./DonutChart";
import { generateInsights } from "./utils/classifier";
import "./AnalysisDashboard.css";

const STATUS_OPTIONS = ["New", "In Progress", "Closed"];
const SOURCE_OPTIONS = ["Internal", "Client", "Contractor", "Consultant"];

const RESPONSE_CODES = {
  A: "Agree and will comply",
  B: "Disagree (see response)",
  C: "Next submittal",
  "": "Not specified"
};

const RESPONSE_OPTIONS = [
  { code: "", label: "Not specified" },
  { code: "A", label: "A - Agree and will comply" },
  { code: "B", label: "B - Disagree (see response)" },
  { code: "C", label: "C - Next submittal" },
];

export default function AnalysisDashboard({
  processedComments,
  summary,
  lastUpdated,
  lastUploadedFileNames,
  onProcessFiles,
  onUpdateComment,
  isProcessing,
  progress,
}) {
  const [showUpload, setShowUpload] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [showFieldInfo, setShowFieldInfo] = useState(false);

  // Per-card filters
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterReviewer, setFilterReviewer] = useState("ALL");
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

  // AI insight cache per document
  const [insights, setInsights] = useState({});

  const hasData = summary && processedComments.length > 0;

  /* ── Derived data ─────────────────────────────────────────────── */

  const documents = useMemo(() => {
    if (!hasData) return [];
    const docMap = {};
    processedComments.forEach((c) => {
      const name = c.documentName || "Unknown Document";
      if (!docMap[name]) docMap[name] = { name, comments: [], categories: {} };
      docMap[name].comments.push(c);
      docMap[name].categories[c.category] =
        (docMap[name].categories[c.category] || 0) + 1;
    });
    return Object.values(docMap).sort(
      (a, b) => b.comments.length - a.comments.length
    );
  }, [processedComments, hasData]);

  const latestFileStats = useMemo(() => {
    if (!hasData || lastUploadedFileNames.length === 0) return null;
    const latestComments = processedComments.filter((c) =>
      lastUploadedFileNames.includes(c.documentName)
    );
    if (latestComments.length === 0) return null;
    return {
      fileNames: lastUploadedFileNames,
      totalComments: latestComments.length,
      avgPerFile: Math.round(latestComments.length / lastUploadedFileNames.length),
      critical: latestComments.filter(
        (c) => c.category === "APPROVAL_BLOCKER" || c.category === "COMPLIANCE"
      ).length,
      closed: latestComments.filter((c) => c.status === "Closed").length,
      fileCount: lastUploadedFileNames.length,
    };
  }, [processedComments, lastUploadedFileNames, hasData]);

  const kpis = useMemo(() => {
    if (!summary) return null;
    const critical =
      (summary.categories.APPROVAL_BLOCKER || 0) +
      (summary.categories.COMPLIANCE || 0);
    const informational =
      (summary.categories.ADVISORY || 0) +
      (summary.categories.CLARIFICATION || 0);
    return {
      critical,
      actionRequired: summary.total - informational,
      mostCommon: summary.mostCommonCategory,
      pctUnresolved: summary.pctUnresolved,
      avgPerDoc: summary.avgPerDocument,
    };
  }, [summary]);

  const donutData = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.categories).map(([name, count]) => ({
      name,
      count,
    }));
  }, [summary]);

  /* ── Generate insight when a card is expanded ─────────────────── */

  useEffect(() => {
    if (!expandedCard) return;
    if (insights[expandedCard]) return; // already cached

    const doc = documents.find((d) => d.name === expandedCard);
    if (!doc) return;

    let cancelled = false;
    generateInsights(doc.comments).then((text) => {
      if (!cancelled) {
        setInsights((prev) => ({ ...prev, [expandedCard]: text }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [expandedCard, documents, insights]);

  /* ── Handlers ─────────────────────────────────────────────────── */

  const handleExpandCard = (name) => {
    const closing = expandedCard === name;
    setExpandedCard(closing ? null : name);
    setFilterCategory("ALL");
    setFilterStatus("ALL");
    setFilterReviewer("ALL");
    setSearchQuery("");
    setShowCriticalOnly(false);
  };

  const handleCriticalClick = () => {
    setShowCriticalOnly(!showCriticalOnly);
    setFilterCategory("ALL");
    setExpandedCard(null);
  };

  const formatTime = (date) => {
    if (!date) return "";
    const diff = Date.now() - date;
    const min = Math.floor(diff / 60000);
    if (min < 1) return "Just now";
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `${hrs}h ago`;
    return date.toLocaleDateString();
  };

  /* ── Render ───────────────────────────────────────────────────── */

  return (
    <div className="dashboard">
      {/* ─── Header ─── */}
      <header className="dash-header">
        <div className="dash-header-left">
          <h1 className="dash-title">Comment Analysis Tool</h1>
          {lastUpdated && (
            <span className="dash-timestamp">
              Updated {formatTime(lastUpdated)}
            </span>
          )}
        </div>
        {hasData && (
          <button
            className="btn-toggle-upload"
            onClick={() => setShowUpload(!showUpload)}
          >
            {showUpload ? "Hide Upload" : "＋ Upload Files"}
          </button>
        )}
      </header>

      {/* ─── Upload Module ─── */}
      {(showUpload || !hasData) && (
        <section
          className={`dash-section upload-module ${!hasData ? "upload-empty" : ""}`}
        >
          {!hasData && (
            <div className="empty-state-text">
              <h2>Get Started</h2>
              <p>
                Upload your document review files to analyze and categorize
                reviewer comments.
              </p>
            </div>
          )}
          <FileUploadComponent
            onProcessFiles={onProcessFiles}
            isProcessing={isProcessing}
          />
          {isProcessing && (
            <div className="processing-bar">
              <div
                className="processing-fill"
                style={{ width: `${progress}%` }}
              />
              <span className="processing-text">
                {progress}% {progress < 100 ? "Processing…" : "Complete"}
              </span>
            </div>
          )}
        </section>
      )}

      {/* ─── Everything below requires data ─── */}
      {hasData && (
        <>
          {/* ─── KPI Row ─── */}
          <section className="dash-section kpi-row">
            <div className="kpi-card kpi-total">
              <div className="kpi-number">{summary.total}</div>
              <div className="kpi-title">Total Comments</div>
            </div>
            <div 
              className={`kpi-card kpi-critical ${showCriticalOnly ? 'kpi-active' : ''}`}
              onClick={handleCriticalClick}
              style={{ cursor: 'pointer' }}
              title="Click to filter critical comments"
            >
              <div className="kpi-number">{kpis.critical}</div>
              <div className="kpi-title">Critical</div>
              <div className="kpi-sub">{showCriticalOnly ? '✓ Filtered' : 'Blockers + Compliance'}</div>
            </div>
            <div className="kpi-card kpi-action">
              <div className="kpi-number">{kpis.actionRequired}</div>
              <div className="kpi-title">Action Required</div>
            </div>
            <div className="kpi-card kpi-unresolved">
              <div className="kpi-number">{kpis.pctUnresolved}%</div>
              <div className="kpi-title">Unresolved</div>
            </div>
            <div className="kpi-card kpi-docs">
              <div className="kpi-number">{documents.length}</div>
              <div className="kpi-title">Documents</div>
              <div className="kpi-sub">~{kpis.avgPerDoc} avg / doc</div>
            </div>
          </section>

          {/* ─── Analytics: Left summary | Right donut ─── */}
          <section className="dash-section analytics-row">
            <div className="analytics-left">
              <h3>Latest Upload</h3>
              {latestFileStats ? (
                <div className="latest-stats">
                  <div className="latest-stat-row">
                    <span className="stat-icon">📄</span>
                    <div className="stat-detail">
                      <span className="stat-value">
                        {latestFileStats.fileCount}
                      </span>
                      <span className="stat-label">
                        File{latestFileStats.fileCount !== 1 ? "s" : ""} uploaded
                      </span>
                    </div>
                  </div>
                  <div className="latest-stat-row">
                    <span className="stat-icon">💬</span>
                    <div className="stat-detail">
                      <span className="stat-value">
                        {latestFileStats.totalComments}
                      </span>
                      <span className="stat-label">Comments extracted</span>
                    </div>
                  </div>
                  <div className="latest-stat-row">
                    <span className="stat-icon">📊</span>
                    <div className="stat-detail">
                      <span className="stat-value">
                        {latestFileStats.avgPerFile}
                      </span>
                      <span className="stat-label">Avg per file</span>
                    </div>
                  </div>
                  <div className="latest-stat-row">
                    <span className="stat-icon">🚨</span>
                    <div className="stat-detail">
                      <span className="stat-value">
                        {latestFileStats.critical}
                      </span>
                      <span className="stat-label">Critical issues</span>
                    </div>
                  </div>
                  <div className="latest-stat-row">
                    <span className="stat-icon">🏷️</span>
                    <div className="stat-detail">
                      <span className="stat-value">
                        {(CATEGORY_LABELS[kpis.mostCommon] || kpis.mostCommon).replace(/_/g, " ")}
                      </span>
                      <span className="stat-label">Most common category</span>
                    </div>
                  </div>
                  <div className="latest-files-list">
                    {latestFileStats.fileNames.map((name, i) => (
                      <span key={i} className="latest-file-tag">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="no-data-text">No recent upload data</p>
              )}
            </div>

            <div className="analytics-right">
              <h3>Category Distribution</h3>
              <DonutChart data={donutData} />
            </div>
          </section>

          {/* ─── Document Cards ─── */}
          <section className="dash-section documents-section">
            <div className="documents-header">
              <h2>Documents</h2>
              {showCriticalOnly && (
                <div className="filter-badge">
                  <span className="badge-critical">🔴 Critical Comments Only</span>
                  <button 
                    className="clear-filter-btn"
                    onClick={() => setShowCriticalOnly(false)}
                  >
                    ✕ Clear
                  </button>
                </div>
              )}
              <span className="doc-count">
                {documents.length} file{documents.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="document-cards">
              {documents.map((doc) => {
                const isExpanded = expandedCard === doc.name;
                const docComments = doc.comments;
                
                // Filter for critical if needed
                const displayComments = showCriticalOnly 
                  ? docComments.filter(c => c.category === "APPROVAL_BLOCKER" || c.category === "COMPLIANCE")
                  : docComments;
                  
                // Skip document if no comments match critical filter
                if (showCriticalOnly && displayComments.length === 0) return null;
                
                const criticalCount = docComments.filter(
                  (c) =>
                    c.category === "APPROVAL_BLOCKER" ||
                    c.category === "COMPLIANCE"
                ).length;
                const closedCount = docComments.filter(
                  (c) => c.status === "Closed"
                ).length;
                const topCategories = Object.entries(doc.categories)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 3);
                // Top category highlight
                const dominantCat = topCategories[0]?.[0];

                // Unique reviewers for filter dropdown
                const uniqueReviewers = [
                  ...new Set(docComments.map((c) => c.reviewer || "Unassigned")),
                ].sort();

                // Apply per-card filters
                const filteredDocComments = displayComments.filter((c) => {
                  if (filterCategory !== "ALL" && c.category !== filterCategory)
                    return false;
                  if (filterStatus !== "ALL" && c.status !== filterStatus)
                    return false;
                  if (
                    filterReviewer !== "ALL" &&
                    (c.reviewer || "Unassigned") !== filterReviewer
                  )
                    return false;
                  if (searchQuery) {
                    const query = searchQuery.toLowerCase();
                    const matchesText = c.commentText.toLowerCase().includes(query);
                    const matchesReviewer = (c.reviewer || "").toLowerCase().includes(query);
                    const matchesCategory = (CATEGORY_LABELS[c.category] || c.category).toLowerCase().includes(query);
                    if (!matchesText && !matchesReviewer && !matchesCategory) {
                      return false;
                    }
                  }
                  return true;
                });

                return (
                  <div
                    key={doc.name}
                    className={`doc-card ${isExpanded ? "doc-card-expanded" : ""}`}
                  >
                    {/* Card Header */}
                    <div
                      className="doc-card-header"
                      onClick={() => handleExpandCard(doc.name)}
                    >
                      <div className="doc-card-info">
                        <span className="doc-icon">📄</span>
                        <div className="doc-card-meta">
                          <h3 className="doc-card-name">{doc.name}</h3>
                          <div className="doc-card-tags">
                            {topCategories.map(([cat, count]) => (
                              <span
                                key={cat}
                                className={`doc-mini-badge ${cat === dominantCat ? "dominant" : ""}`}
                                style={{
                                  backgroundColor:
                                    (CATEGORY_COLORS[cat] || "#999") + "18",
                                  color: CATEGORY_COLORS[cat] || "#999",
                                  border: `1px solid ${(CATEGORY_COLORS[cat] || "#999")}55`,
                                }}
                              >
                                {CATEGORY_LABELS[cat] || cat} ({count})
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="doc-card-stats">
                        <span className="doc-stat">
                          {docComments.length} comments
                        </span>
                        {criticalCount > 0 && (
                          <span className="doc-stat doc-stat-critical">
                            {criticalCount} critical
                          </span>
                        )}
                        <span className="doc-stat doc-stat-resolved">
                          {closedCount}/{docComments.length} closed
                        </span>
                        <span
                          className={`doc-chevron ${isExpanded ? "chevron-up" : ""}`}
                        >
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* ─── Expanded Document Detail ─── */}
                    {isExpanded && (
                      <div className="doc-card-body">
                        {/* SECTION 1 — Summary card */}
                        <div className="doc-overview-row">
                          <div className="doc-overview-stat">
                            <span className="doc-ov-value">
                              {docComments.length}
                            </span>
                            <span className="doc-ov-label">Total</span>
                          </div>
                          <div className="doc-overview-stat doc-ov-critical">
                            <span className="doc-ov-value">
                              {criticalCount}
                            </span>
                            <span className="doc-ov-label">Critical</span>
                          </div>
                          <div className="doc-overview-stat doc-ov-closed">
                            <span className="doc-ov-value">
                              {closedCount}
                            </span>
                            <span className="doc-ov-label">Closed</span>
                          </div>
                          <div className="doc-overview-stat">
                            <span className="doc-ov-value">
                              {docComments.length > 0
                                ? Math.round(
                                    (closedCount / docComments.length) * 100
                                  )
                                : 0}
                              %
                            </span>
                            <span className="doc-ov-label">Resolved</span>
                          </div>
                        </div>

                        {/* SECTION 2 — AI Generated Insight */}
                        <div className="doc-insight">
                          <h4>💡 Insight</h4>
                          <p className="insight-text">
                            {insights[doc.name] || "Generating insight…"}
                          </p>
                        </div>

                        {/* Category Breakdown Bars */}
                        <div className="doc-breakdown">
                          <h4>Category Breakdown</h4>
                          {Object.entries(doc.categories)
                            .sort(([, a], [, b]) => b - a)
                            .map(([cat, count]) => (
                              <div
                                key={cat}
                                className={`breakdown-row ${cat === dominantCat ? "breakdown-dominant" : ""}`}
                              >
                                <span className="breakdown-label">
                                  {CATEGORY_LABELS[cat] || cat}
                                </span>
                                <div className="breakdown-bar-bg">
                                  <div
                                    className="breakdown-bar-fill"
                                    style={{
                                      width: `${(count / docComments.length) * 100}%`,
                                      backgroundColor: CATEGORY_COLORS[cat],
                                    }}
                                  />
                                </div>
                                <span className="breakdown-count">
                                  {count}
                                </span>
                              </div>
                            ))}
                        </div>

                        {/* SECTION 4 — Filters */}
                        <div className="doc-filters">
                          <div className="doc-filter-group search-group">
                            <label>🔍 Search</label>
                            <input
                              type="text"
                              className="search-input"
                              placeholder="Search comments, reviewer, category..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                          </div>
                          <div className="doc-filter-group">
                            <label>Category</label>
                            <select
                              value={filterCategory}
                              onChange={(e) =>
                                setFilterCategory(e.target.value)
                              }
                            >
                              <option value="ALL">All</option>
                              {Object.keys(doc.categories)
                                .sort()
                                .map((cat) => (
                                  <option key={cat} value={cat}>
                                    {CATEGORY_LABELS[cat] || cat} (
                                    {doc.categories[cat]})
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div className="doc-filter-group">
                            <label>Status</label>
                            <select
                              value={filterStatus}
                              onChange={(e) =>
                                setFilterStatus(e.target.value)
                              }
                            >
                              <option value="ALL">All</option>
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="doc-filter-group">
                            <label>Reviewer</label>
                            <select
                              value={filterReviewer}
                              onChange={(e) =>
                                setFilterReviewer(e.target.value)
                              }
                            >
                              <option value="ALL">All</option>
                              {uniqueReviewers.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          </div>
                          <span className="doc-filter-count">
                            {filteredDocComments.length} of{" "}
                            {docComments.length}
                          </span>
                        </div>

                        {/* SECTION 3 — Comments Table */}
                        <div className="doc-comments-table-wrap">
                          <div className="table-header-row">
                            <h4>Comments</h4>
                            <button 
                              className="info-toggle-btn"
                              onClick={() => setShowFieldInfo(!showFieldInfo)}
                              title="Show field descriptions"
                            >
                              {showFieldInfo ? "ℹ️ Hide Field Info" : "ℹ️ Field Info"}
                            </button>
                          </div>
                          
                          {showFieldInfo && (
                            <div className="field-info-panel">
                              <div className="field-info-grid">
                                <div className="field-info-item">
                                  <strong>Reviewer:</strong> Who wrote the comment
                                </div>
                                <div className="field-info-item">
                                  <strong>Responder:</strong> Who will address it
                                </div>
                                <div className="field-info-item">
                                  <strong>Response:</strong> Action type (A=Agree, B=Disagree, C=Next submittal)
                                </div>
                                <div className="field-info-item">
                                  <strong>Status:</strong> Progress (New → In Progress → Closed)
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="table-scroll">
                            <table className="comments-table">
                              <thead>
                                <tr>
                                  <th className="th-id">ID</th>
                                  <th className="th-text">Comment</th>
                                  <th className="th-cat">Category</th>
                                  <th className="th-reviewer">Reviewer</th>
                                  <th className="th-responder">Responder</th>
                                  <th className="th-response">Response</th>
                                  <th className="th-status">Status</th>
                                  <th className="th-source">Source</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredDocComments.map((c) => {
                                  const isCritical = c.category === "APPROVAL_BLOCKER" || c.category === "COMPLIANCE";
                                  return (
                                  <tr
                                    key={c.commentId}
                                    className={`${
                                      c.status === "Closed"
                                        ? "row-closed"
                                        : ""
                                    } ${isCritical ? "row-critical" : ""}`}
                                  >
                                    <td className="td-id">
                                      #{c.commentId}
                                      {isCritical && <span className="critical-badge">🔴</span>}
                                    </td>
                                    <td className="td-text">
                                      {c.commentText}
                                    </td>
                                    <td className="td-cat">
                                      <span
                                        className="cat-pill"
                                        style={{
                                          backgroundColor:
                                            (CATEGORY_COLORS[c.category] ||
                                              "#999") + "18",
                                          color:
                                            CATEGORY_COLORS[c.category] ||
                                            "#999",
                                          border: `1px solid ${(CATEGORY_COLORS[c.category] || "#999")}55`,
                                        }}
                                      >
                                        {CATEGORY_LABELS[c.category] ||
                                          c.category}
                                      </span>
                                    </td>
                                    <td className="td-reviewer">
                                      <input
                                        className="inline-input"
                                        type="text"
                                        value={c.reviewer || ""}
                                        onChange={(e) =>
                                          onUpdateComment(
                                            c.commentId,
                                            "reviewer",
                                            e.target.value
                                          )
                                        }
                                      />
                                    </td>
                                    <td className="td-responder">
                                      <input
                                        className="inline-input"
                                        type="text"
                                        value={c.responder || ""}
                                        onChange={(e) =>
                                          onUpdateComment(
                                            c.commentId,
                                            "responder",
                                            e.target.value
                                          )
                                        }
                                      />
                                    </td>
                                    <td className="td-response">
                                      <select
                                        className="inline-select"
                                        value={c.responseCode || ""}
                                        onChange={(e) =>
                                          onUpdateComment(
                                            c.commentId,
                                            "responseCode",
                                            e.target.value
                                          )
                                        }
                                      >
                                        {RESPONSE_OPTIONS.map((opt) => (
                                          <option key={opt.code} value={opt.code}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="td-status">
                                      <select
                                        className={`inline-select status-${c.status.replace(/ /g, "").toLowerCase()}`}
                                        value={c.status}
                                        onChange={(e) =>
                                          onUpdateComment(
                                            c.commentId,
                                            "status",
                                            e.target.value
                                          )
                                        }
                                      >
                                        {STATUS_OPTIONS.map((s) => (
                                          <option key={s} value={s}>
                                            {s}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="td-source">
                                      <select
                                        className="inline-select"
                                        value={c.source || "Internal"}
                                        onChange={(e) =>
                                          onUpdateComment(
                                            c.commentId,
                                            "source",
                                            e.target.value
                                          )
                                        }
                                      >
                                        {SOURCE_OPTIONS.map((s) => (
                                          <option key={s} value={s}>
                                            {s}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                  </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          {filteredDocComments.length === 0 && (
                            <p className="no-data-text">
                              No comments match the current filters.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
