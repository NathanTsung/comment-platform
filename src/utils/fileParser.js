import Papa from "papaparse";
import readXlsxFile from "read-excel-file/browser";

/**
 * Parse uploaded files and extract comments.
 * Supports CSV (.csv), Excel (.xlsx), and text (.txt) files.
 * For CSV/Excel, looks for a column called "Owner Review Comment".
 * For text files, each non-empty line is treated as a comment.
 *
 * @param {File[]} files - Array of File objects to parse.
 * @returns {Promise<Array<{commentId: number, commentText: string}>>}
 */
export async function parseFiles(files) {
  const allComments = [];
  let idCounter = 1;

  for (const file of files) {
    const name = file.name.toLowerCase();
    let texts = [];

    if (name.endsWith(".csv")) {
      texts = await parseCsv(file);
    } else if (name.endsWith(".xlsx")) {
      texts = await parseXlsx(file);
    } else if (name.endsWith(".txt")) {
      texts = await parseTxt(file);
    }

    for (const text of texts) {
      allComments.push({ commentId: idCounter++, commentText: text });
    }
  }

  return allComments;
}

function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const comments = results.data
          .map((row) => row["Owner Review Comment"])
          .filter((val) => val && val.trim());
        resolve(comments);
      },
      error(err) {
        reject(err);
      },
    });
  });
}

async function parseXlsx(file) {
  const rows = await readXlsxFile(file);
  if (rows.length === 0) return [];

  const header = rows[0];
  const colIndex = header.findIndex(
    (h) => String(h).trim() === "Owner Review Comment"
  );
  if (colIndex === -1) return [];

  return rows
    .slice(1)
    .map((row) => row[colIndex])
    .filter((val) => val && String(val).trim())
    .map((val) => String(val));
}

function parseTxt(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const lines = reader.result
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      resolve(lines);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
