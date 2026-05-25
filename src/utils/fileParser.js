import Papa from "papaparse";
import readXlsxFile, { readSheet } from "read-excel-file/browser";

/**
 * Parse uploaded files and extract comments with metadata.
 * Supports CSV (.csv), Excel (.xlsx), and text (.txt) files.
 * For CSV/Excel, extracts: comment text, reviewer, responder, response code, status, etc.
 * For text files, each non-empty line is treated as a comment.
 *
 * @param {File[]} files - Array of File objects to parse.
 * @returns {Promise<Array<{commentId: number, commentText: string, reviewer?: string, responder?: string, responseCode?: string, status?: string, documentName: string}>>}
 */
export async function parseFiles(files) {
  const allComments = [];
  let idCounter = 1;

  for (const file of files) {
    const name = file.name.toLowerCase();
    const documentName = file.name;
    let comments = [];

    if (name.endsWith(".csv")) {
      comments = await parseCsv(file);
    } else if (name.endsWith(".xlsx")) {
      comments = await parseXlsx(file);
    } else if (name.endsWith(".txt")) {
      comments = await parseTxt(file);
    }

    for (const comment of comments) {
      allComments.push({ 
        commentId: idCounter++, 
        ...comment,
        documentName: documentName
      });
    }
  }

  return allComments;
}

function findColumnIndex(headers, patterns) {
  const normalized = headers.map((k) => normalizeHeader(String(k)));
  for (const pattern of patterns) {
    const idx = normalized.findIndex(h => h.includes(pattern));
    if (idx !== -1) return idx;
  }
  return -1;
}

function findCommentKey(keys) {
  const normalized = keys.map((k) => normalizeHeader(String(k)));
  // 1. Exact match
  let idx = normalized.indexOf("owner review comment");
  if (idx !== -1) return keys[idx];
  // 2. Column containing "review comment"
  idx = normalized.findIndex((k) => k.includes("review comment"));
  if (idx !== -1) return keys[idx];
  // 3. Column containing "comment" but not an ID/type/status column
  idx = normalized.findIndex(
    (k) => k.includes("comment") && !k.includes("comment no") && !k.includes("comment type") && !k.includes("comment status")
  );
  if (idx !== -1) return keys[idx];
  // Fallback: first column
  return keys[0];
}

function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        if (!results.data || results.data.length === 0) {
          resolve([]);
          return;
        }
        const keys = Object.keys(results.data[0]);
        const commentKey = findCommentKey(keys);
        
        // Find additional columns
        const reviewerKey = keys.find(k => normalizeHeader(k).includes("reviewer") || normalizeHeader(k).includes("owner") || normalizeHeader(k).includes("author"));
        const responderKey = keys.find(k => normalizeHeader(k).includes("responder") || normalizeHeader(k).includes("assignee"));
        const responseCodeKey = keys.find(k => normalizeHeader(k).includes("contractor code") || normalizeHeader(k).includes("contractor") || normalizeHeader(k).includes("response code"));
        const statusKey = keys.find(k => normalizeHeader(k).includes("status"));
        
        const comments = results.data
          .map((row) => {
            const text = row[commentKey];
            if (!text || !text.trim()) return null;
            
            return {
              commentText: text,
              reviewer: reviewerKey ? row[reviewerKey] : undefined,
              responder: responderKey ? row[responderKey] : undefined,
              responseCode: responseCodeKey ? row[responseCodeKey] : undefined,
              status: statusKey ? row[statusKey] : undefined,
            };
          })
          .filter(Boolean);
        resolve(comments);
      },
      error(err) {
        reject(err);
      },
    });
  });
}

async function parseXlsx(file) {
  const allSheets = await readXlsxFile(file);
  if (!Array.isArray(allSheets) || allSheets.length === 0) return [];

  // Score and rank sheets by how likely they contain real comment data
  const scoredSheets = allSheets
    .map((sheetObj) => {
      const rows = sheetObj.data;
      if (!Array.isArray(rows) || rows.length === 0) return null;

      let score = 0;
      const maxCols = Math.max(...rows.map(r => (Array.isArray(r) ? r : []).length));

      // Prefer sheets with more rows and columns (real data is larger)
      score += Math.min(rows.length, 100); // up to +100
      score += maxCols * 5; // more columns = more likely real data

      // Penalize very small sheets (likely lookup tables)
      if (rows.length < 20 && maxCols <= 3) score -= 500;

      // Check if any row has "comment" in headers
      const hasCommentHeader = rows.slice(0, 10).some((row) => {
        const r = Array.isArray(row) ? row : Array.from(row);
        return r.some((cell) => {
          const s = String(cell || "").toLowerCase();
          return s.includes("comment") && s.length < 100;
        });
      });
      if (hasCommentHeader) score += 200;

      return { sheetObj, score, rows, maxCols };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  // Try sheets in order of score
  for (const { sheetObj, rows } of scoredSheets) {
    // Find the header row — scan first 15 rows
    let headerRowIndex = -1;
    let headers = [];

    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const row = Array.isArray(rows[i]) ? rows[i] : Array.from(rows[i]);
      const strings = row.map((h) => (h == null ? "" : String(h)));
      const idx = findCommentIndex(strings);
      if (idx !== -1) {
        headerRowIndex = i;
        headers = strings;
        break;
      }
    }

    // Only use this sheet if we found a matching header
    if (headerRowIndex === -1) continue;

    // Find column indices for all fields
    const commentIdx = findCommentIndex(headers);
    const reviewerIdx = findColumnIndex(headers, ["reviewer", "owner", "author"]);
    const responderIdx = findColumnIndex(headers, ["responder", "assignee", "assigned to"]);
    const responseCodeIdx = findColumnIndex(headers, ["contractor code", "contractor", "response code", "code"]);
    const statusIdx = findColumnIndex(headers, ["status", "state"]);

    const dataRows = rows.slice(headerRowIndex + 1);

    const results = dataRows
      .map((row) => {
        const r = Array.isArray(row) ? row : Array.from(row);
        const text = r[commentIdx];
        if (!text || !String(text).trim()) return null;
        
        return {
          commentText: String(text),
          reviewer: reviewerIdx !== -1 && r[reviewerIdx] ? String(r[reviewerIdx]) : undefined,
          responder: responderIdx !== -1 && r[responderIdx] ? String(r[responderIdx]) : undefined,
          responseCode: responseCodeIdx !== -1 && r[responseCodeIdx] ? String(r[responseCodeIdx]) : undefined,
          status: statusIdx !== -1 && r[statusIdx] ? String(r[statusIdx]) : undefined,
        };
      })
      .filter(Boolean);

    // Only return if we got substantial data (not just a few metadata values)
    if (results.length >= 5) {
      return results;
    }
  }
  return [];
}

function normalizeHeader(h) {
  // Collapse all whitespace variants (non-breaking spaces, tabs, etc.) into single spaces
  return h.toLowerCase().replace(/[\s\u00A0\u2007\u202F]+/g, " ").trim();
}

function findCommentIndex(headers) {
  const normalized = headers.map(normalizeHeader);
  
  // Priority 1: Check for exact "owner review comment" first (before any filters)
  let idx = normalized.indexOf("owner review comment");
  if (idx !== -1) return idx;
  
  // Skip legend/description rows (but only if we didn't find our target column)
  const hasMultilineText = headers.some((h) => String(h).includes("\n"));
  const hasVeryLongCell = headers.some((h) => String(h).length > 100);
  
  // Only reject if there are MANY multiline cells (legend rows) or very long text
  const multilineCount = headers.filter((h) => String(h).includes("\n")).length;
  if (hasVeryLongCell || multilineCount > headers.length / 2) {
    return -1; // Likely a legend/description row
  }

  // Check if this row has any substantive headers (not all empty/dates)
  const hasHeaders = normalized.some(h => h.length > 3 && !/^\d+$/.test(h));
  if (!hasHeaders) {
    return -1; // Data row, not headers
  }
  
  // Priority 2: "review comment" (general review comments)
  idx = normalized.findIndex((h) => h.includes("review comment"));
  if (idx !== -1) return idx;
  
  // Priority 3: "owner" + "comment" but not metadata columns
  idx = normalized.findIndex((h) => 
    h.includes("owner") && 
    h.includes("comment") && 
    !h.includes("type") && 
    !h.includes("status") &&
    !h.includes("code")
  );
  if (idx !== -1) return idx;
  
  // Priority 4: Just "comment" column (but exclude obvious metadata)
  idx = normalized.findIndex((h) => {
    if (!h.includes("comment")) return false;
    // Exclude metadata columns
    const excludePatterns = [
      "comment no", "comment #", "comment id",
      "comment type", "comment status", "comment date",
      "response code", "contractor comment", "action code"
    ];
    return !excludePatterns.some(pattern => h.includes(pattern));
  });
  if (idx !== -1) return idx;
  
  // Priority 5: Look for "description", "remarks", "notes", "text" as fallback
  idx = normalized.findIndex((h) => 
    (h.includes("description") || h.includes("remarks") || h.includes("notes") || h === "text") &&
    h.length < 50
  );
  if (idx !== -1) return idx;
  
  return -1;
}

function parseTxt(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const lines = reader.result
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .map((text) => ({ commentText: text }));
      resolve(lines);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
