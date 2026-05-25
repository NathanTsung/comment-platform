# Comment Analysis Platform

A web application for organizing and analyzing reviewer comments on document submittals in engineering and construction projects.

## Core Functionality

### 1. **Document Submittal Comment Management**
- Upload multiple document files (Excel, CSV, or text)
- Extract and parse reviewer comments automatically
- Track comments across different submitted documents
- Maintain document names and relationships

### 2. **Automated Comment Classification**
- AI-powered classification using keyword patterns
- Categorize comments by type, severity, and nature
- Support for 9 distinct comment categories
- Extensible to use external AI APIs (OpenAI, Azure, etc.)

### 3. **Performance Tracking & KPIs**
- **Total Comments**: Overall comment count across all documents
- **Critical Issues**: High-priority items (Blockers + Compliance violations)
- **Technical Items**: Design and structural review comments
- **Action Required**: Non-advisory items requiring response

### 4. **Advanced Filtering & Analysis**
- Filter by category type
- Filter by document name
- Interactive category selection
- Real-time comment table updates

### 5. **Multi-Document Support**
- Process multiple files independently
- Track document names for each comment
- Filter and view comments by source document
- Add more documents to existing analysis

---

## Comment Categories Explained

### 🔴 **APPROVAL_BLOCKER**
**Critical issues that prevent approval from proceeding**

These are high-priority items requiring immediate attention and resolution before the submittal can be approved. Work cannot proceed until these are addressed.

**Examples:**
- "Cannot approve until structural calculations are provided"
- "Design does not meet seismic requirements - approval on hold"
- "Missing fire safety systems - must be resolved immediately"

---

### 🔴 **COMPLIANCE**
**Violations of contract requirements, codes, or specifications**

Items that fail to meet regulatory requirements, building codes, technical specifications, or contractual obligations. Must be corrected to ensure legal and contractual compliance.

**Examples:**
- "Does not comply with IBC Section 1807.2"
- "Violates contract specification 27.10b"
- "NFPA 72 requirements not addressed"
- "ADA clearance requirements not met"

---

### 🟡 **MISSING_INFO**
**Critical information is missing from the submittal**

Required documentation, calculations, details, or specifications that must be included before the submittal can be considered complete.

**Examples:**
- "Load calculations not provided"
- "Section detail missing from drawings"
- "Material specifications not included"
- "Design basis not documented"

---

### 🟠 **TECHNICAL_CONTENT**
**Technical or design content that requires revision**

Engineering calculations, specifications, materials, equipment selections, or design details that need modification or correction.

**Examples:**
- "Revise beam size to W12x26 per structural analysis"
- "Update equipment capacity to 150 HP"
- "Correct voltage specification to 480V"
- "Recalculate deflection using actual loads"

---

### 🟡 **STRUCTURAL**
**Issues with document organization or structural design elements**

Problems with structural engineering design, document layout, architectural elements, or how information is organized and presented.

**Examples:**
- "Rebar spacing does not match structural drawings"
- "Foundation detail conflicts with geotechnical report"
- "Document section numbering is inconsistent"
- "Drawing reference system needs standardization"

---

### 🟠 **SCOPE_CHANGE**
**Requests or changes that fall outside the original scope**

Items that weren't part of the original contract or project scope. May require contract modifications, change orders, or additional approvals.

**Examples:**
- "Additional fire suppression system is out of scope"
- "This work was not included in original contract"
- "Scope change requires separate approval and budget"

---

### 🔵 **CLARIFICATION**
**Comments requiring explanation or additional context**

Questions or requests for more information to understand design intent, requirements, or specifications.

**Examples:**
- "Please clarify which code version applies"
- "Explain the basis for this dimension"
- "What is the intended use of this space?"
- "Verify if this applies to all floors"

---

### 🟢 **ADVISORY**
**Non-mandatory suggestions for improvement**

Recommendations and best practices that don't require action but may improve quality, efficiency, or compliance. These are informational and optional.

**Examples:**
- "Consider adding backup power for this system"
- "May want to coordinate with mechanical team"
- "Recommend using corrosion-resistant material"
- "FYI: Similar projects have used this approach"

---

### 🟡 **TYPE_ERROR**
**Typographical errors, formatting issues, or incorrect labeling**

Minor corrections needed for document accuracy, including typos, mislabeling, formatting consistency, or reference errors.

**Examples:**
- "Sheet number should be A-201, not A-210"
- "Typo: 'stell' should be 'steel'"
- "Drawing title inconsistent with cover sheet"
- "Grid line labeled incorrectly"

---

## Usage

1. **Upload Documents**: Select Excel, CSV, or text files containing reviewer comments
2. **Process**: Click "Process Comments" to extract and classify
3. **View Dashboard**: Click "View Dashboard →" in the header to see detailed analysis
4. **Filter & Explore**: Use category and document filters to drill down into specific issues
5. **Add More Files**: Use "+ Add More Files" button to upload additional documents

---

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm start
```

Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
```

Builds the app for production to the `build` folder.

---

## Technical Stack

- **Frontend**: React (no external UI libraries)
- **File Parsing**: PapaParse (CSV), read-excel-file (Excel)
- **Classification**: Keyword-based with optional AI API integration
- **Styling**: Pure CSS with responsive design

---

## File Format Support

### Excel Files (.xlsx)
The parser automatically detects columns containing "Owner Review Comment", "Review Comment", or similar headers. It intelligently skips metadata sheets and legend rows.

### CSV Files (.csv)
Similar to Excel, looks for comment columns with flexible matching.

### Text Files (.txt)
Each non-empty line is treated as a separate comment.

---

## Future Enhancements

- **Status tracking**: Open, In Progress, Resolved, Closed
- **Response tracking**: Contractor responses to each comment
- **Duplicate detection**: Identify similar comments across documents
- **Export functionality**: PDF and Excel reports
- **Comment threading**: Track comment history and revisions
- **User authentication**: Multi-user project management
- **Integration**: Connect with project management systems

---

## Configuration

### Optional AI Classification

To use AI-powered classification instead of keywords, create a `.env` file in the project root:

```env
REACT_APP_AI_API_URL=https://api.openai.com/v1/chat/completions
REACT_APP_AI_API_KEY=your-api-key-here
```

Restart the development server after adding environment variables.

The system will automatically use AI classification when credentials are provided, falling back to keyword-based classification otherwise.

---

## Project Structure

```
src/
├── App.js                      # Main app with page routing
├── CommentAnalysisApp.js       # Upload and processing page
├── AnalysisDashboard.js        # Dashboard with KPIs and filtering
├── utils/
│   ├── fileParser.js          # File parsing (CSV, Excel, text)
│   ├── classifier.js          # Comment classification logic
│   ├── batchProcessor.js      # Batch comment processing
│   └── summary.js             # Summary statistics generation
└── [CSS files]
```

---

## License

This project is private and proprietary.
