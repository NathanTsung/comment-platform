// ---------------------------------------------------------------------------
// Comment Classification — AI + Rule-based Fallback
// ---------------------------------------------------------------------------

const AI_API_URL = process.env.REACT_APP_AI_API_URL || "";
const AI_API_KEY = process.env.REACT_APP_AI_API_KEY || "";

const VALID_CATEGORIES = [
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

const CLASSIFY_PROMPT = `You are an assistant that classifies engineering review comments.

Classify into ONE category:
ADVISORY, MISSING_INFO, SCOPE_CHANGE, TYPE_ERROR,
COMPLIANCE, STRUCTURAL, APPROVAL_BLOCKER,
TECHNICAL_CONTENT, CLARIFICATION.

Return ONLY the category name.`;

// ---- Keyword-based rules (fallback) ----------------------------------------
const KEYWORD_RULES = [
  {
    category: "APPROVAL_BLOCKER",
    patterns: /\b(cannot approve|not approv|reject|blocker|hold|stop work|must fix|shall not proceed|not acceptable|unacceptable|fatal|show.?stopper|will not (accept|approve)|do not proceed)\b/i,
  },
  {
    category: "COMPLIANCE",
    patterns: /\b(code|codes|standard|regulation|spec(ification)?|compliance|non.?complian|requirement|IBC|ASCE|ACI|NFPA|OSHA|permit|NEC|IEEE|ASTM|ANSI|UL|FM|EPA|DOT|ADA|fire.?code|building.?code|life.?safety|zoning|ordinance|violation|does not (comply|meet|conform)|fail(s|ed)? to (comply|meet|conform))\b/i,
  },
  {
    category: "MISSING_INFO",
    patterns: /\b(missing|not (provided|shown|included|indicated|noted|specified|addressed|identified)|where is|provide|lacking|absent|omit(ted)?|incomplete|need(s|ed)? to (include|provide|show|add)|shall (include|provide|show)|should (include|provide|show)|no (detail|information|data|reference)|does not (include|show|indicate))\b/i,
  },
  {
    category: "TYPE_ERROR",
    patterns: /\b(typo|error|incorrect|wrong|mismatch|discrepanc|inconsisten|mislabel|misspell|erroneous|mistake|misidentif|should (be|read)|appears to be wrong|does not match|contradicts?)\b/i,
  },
  {
    category: "SCOPE_CHANGE",
    patterns: /\b(scope|add(ed|itional) (work|requirement|item|scope)|change (in |of )?(scope|requirement)|modif(y|ied|ication)|revis(e|ed|ion)|new requirement|out of scope|beyond (the )?(original |current )?scope|scope creep|not (in|part of) (the )?(original )?(scope|contract))\b/i,
  },
  {
    category: "STRUCTURAL",
    patterns: /\b(structur|load(s|ing)?|beam|column|foundation|reinforc|steel|concrete|seismic|lateral|moment|shear|deflect|bracing|connection|weld|bolt|anchor|footing|slab|truss|joist|girder|pile|retaining|bearing|stress|strain|buckling)\b/i,
  },
  {
    category: "TECHNICAL_CONTENT",
    patterns: /\b(calculat|design(ed)?|detail(s|ing)?|dimension|drawing|specification|material|capacity|pressure|voltage|flow|schedule|diagram|elevation|plan view|cross.?section|typical|equipment|install|routing|size|rating|grade|gauge|tolerance|clearance|setback|alignment|grading|drainage|piping|duct|conduit|circuit|panel|transformer|valve|pump|motor|HVAC|mechanical|electrical|plumbing|civil|geotechnical)\b/i,
  },
  {
    category: "CLARIFICATION",
    patterns: /\b(clarif|explain|unclear|confus|what does|what is|please (describe|explain|clarify)|question|elaborate|ambiguous|vague|undefined|which (one|version)|intent|meaning|interpretation|verify|confirm|is this)\b/i,
  },
  {
    category: "ADVISORY",
    patterns: /\b(suggest|recommend|consider|advise|advisory|note|FYI|optional|preference|may want|might want|could (also|consider)|for (your )?information|good practice|best practice|as a reminder|for future|editorial|minor|cosmetic|nice to have|no action required)\b/i,
  },
];

/**
 * Rule-based keyword classifier. Always works offline.
 */
export function classifyCommentRules(commentText) {
  for (const { category, patterns } of KEYWORD_RULES) {
    if (patterns.test(commentText)) {
      return category;
    }
  }
  return "CLARIFICATION";
}

/**
 * AI-powered classifier. Calls external API.
 * Throws on network/API errors so the caller can fall back.
 */
export async function classifyCommentAI(commentText) {
  if (!AI_API_URL || !AI_API_KEY || AI_API_KEY === "PLACEHOLDER_API_KEY") {
    throw new Error("AI API not configured");
  }

  const body = {
    model: "gpt-4",
    messages: [
      { role: "system", content: CLASSIFY_PROMPT },
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
  const category = data.choices?.[0]?.message?.content?.trim() ?? "";

  if (!VALID_CATEGORIES.includes(category)) {
    throw new Error(`AI returned invalid category: ${category}`);
  }

  return category;
}

/**
 * Smart classifier: tries AI first, falls back to rules if AI fails or
 * returns an invalid category. Always returns a valid category string.
 */
export async function classifyCommentSmart(commentText) {
  try {
    return await classifyCommentAI(commentText);
  } catch {
    return classifyCommentRules(commentText);
  }
}

/**
 * Generate an AI insight for a set of comments.
 * Falls back to a template-based summary.
 */
export async function generateInsights(comments) {
  // Build a quick stats object for the fallback
  const catCounts = {};
  for (const c of comments) {
    catCounts[c.category] = (catCounts[c.category] || 0) + 1;
  }
  const sorted = Object.entries(catCounts).sort(([, a], [, b]) => b - a);
  const topCat = sorted[0]?.[0] || "CLARIFICATION";
  const topCount = sorted[0]?.[1] || 0;
  const pct = comments.length > 0 ? Math.round((topCount / comments.length) * 100) : 0;

  // Attempt AI summary
  try {
    if (!AI_API_URL || !AI_API_KEY || AI_API_KEY === "PLACEHOLDER_API_KEY") {
      throw new Error("AI not configured");
    }

    const sampleTexts = comments
      .slice(0, 15)
      .map((c, i) => `${i + 1}. [${c.category}] ${c.commentText}`)
      .join("\n");

    const body = {
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a PMO analyst. Summarize the themes and risks in these engineering review comments in 2-3 concise sentences.",
        },
        { role: "user", content: sampleTexts },
      ],
      temperature: 0.3,
      max_tokens: 200,
    };

    const response = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error("API error");
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  } catch {
    // Template-based fallback
    const lines = [
      `Most comments relate to ${topCat.replace(/_/g, " ")} (${pct}% of total).`,
    ];

    const critical =
      (catCounts.APPROVAL_BLOCKER || 0) + (catCounts.COMPLIANCE || 0);
    if (critical > 0) {
      lines.push(
        `There are ${critical} critical issue${critical !== 1 ? "s" : ""} requiring immediate attention.`
      );
    }

    const open = comments.filter((c) => c.status !== "Closed").length;
    if (open > 0) {
      lines.push(`${open} of ${comments.length} comments remain open.`);
    }

    return lines.join(" ");
  }
}
