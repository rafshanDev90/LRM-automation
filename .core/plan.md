As a Senior Principal Software Architect, I have designed this comprehensive blueprint to satisfy your requirements for a highly scalable, maintainable, and memory-efficient personal utility tool.
Here is the architectural blueprint for the Developer Lab Report Creator.

1. APPLICATION OVERVIEW & CONTEXT

The Developer Lab Report Creator is a decoupled, single-user utility optimized for execution speed, high-fidelity document rendering, and deterministic file lifecycle management.

Tech Stack Selection

• Runtime: Node.js (v22+) leveraging native ECMAScript Modules (ESM) for modern module resolution and top-level await capabilities.
• Language: TypeScript (v5+) configured with strict type-checking (strict: true) to enforce bulletproof data contracts across service boundaries.
• API Layer: Express.js acting as a lightweight routing layer.
• Storage Layer: SQLite via better-sqlite3 (synchronous, blazing-fast, zero-network overhead) to track report metadata, templates, and execution history.
• PDF Engine: Puppeteer (Headless Chromium).

System Context Diagram (Conceptual Workflow)

[User Interface] ──(Multipart Form Data)──> [Express Routing Layer]
                                                   │
                                            (Multer Memory)
                                                   ▼
[Puppeteer Worker Pool] <──(HTML String)─── [PDF Compilation Service]
         │                                         │
  (Buffer Stream)                           (Clean-up Hook)
         ▼                                         ▼
[Client Auto-Download]                     [Ephemeral Disk Wipe]

2. ARCHITECTURAL PATTERN & DIRECTORY

The application uses an adapted Clean Architecture / Service-Oriented Pattern. All business logic is extracted out of Express routers into isolated, domain-specific services. The PDF generation engine is entirely encapsulated behind an abstract interface layer, ensuring that swapping from Puppeteer to another engine requires zero modification to your core application logic.

Proposed Directory Structure

lab-report-creator/
├── .github/                    # CI/CD workflows
├── dist/                       # Compiled JavaScript output
├── src/
│   ├── @types/                 # Global TypeScript type overrides
│   ├── config/                 # Environment variables and engine configurations
│   ├── constants/              # Fixed layout specs, styling themes, syntax themes
│   ├── controllers/            # Express request/response orchestration
│   ├── middleware/             # Upload validation, error handling, rate limiting
│   ├── repositories/           # SQLite data access objects (DAO)
│   ├── routes/                 # Express route definitions
│   ├── services/               # Core Domain Service Layer
│   │   ├── code/               # Syntax highlighting & file parsing service
│   │   ├── pdf/                # PDF Service Directory
│   │   │   ├── interfaces/     # IPdfEngine.ts definition
│   │   │   ├── engines/        # PuppeteerEngine.ts implementation
│   │   │   └── PdfService.ts   # Core orchestrator orchestrating templates & data
│   │   └── storage/            # Local asset and file persistence management
│   ├── templates/              # HTML/Handlebars blueprints for the PDF reports
│   │   ├── layouts/            # Base document wrappers
│   │   └── partials/           # Header, footer, code block fragments
│   ├── app.ts                  # Express application setup
│   └── server.ts               # HTTP Server entry point
├── tests/                      # Unit and integration test suites
├── database.sqlite             # Local SQLite database file
├── tsconfig.json               # TypeScript configuration
└── package.json

3. PDF COMPILATION & STYLING STRATEGY


Engine Recommendation: Puppeteer vs. PDFKit

For this specific application, Puppeteer (HTML-to-PDF Conversion) is highly recommended over PDFKit.
• Why? Programmatic canvas layout tools like PDFKit require manual pixel coordinates for complex layouts, wrapping text, and elements. They turn rendering complex source code layouts into a mathematical chore. Puppeteer leverages the full power of modern CSS (Flexbox, Grid, Typography Engines) and simplifies syntax highlighting integration.

Component Breakdown


A. Automatic Syntax Highlighting

• Engine: Prism.js executed server-side via Node.js.
• Strategy: When multi-file source code is uploaded, the CodeService reads the file stream, determines the programming language via the file extension, and processes the raw text using Prism's lexical analyzer (Prism.tokenize()). The output is compiled into an HTML string containing tokenized structures wrapped in CSS classes matching a pre-defined theme (e.g., Tomorrow Night or Dracula).

B. Page Break Mitigation

To prevent code snippets or images from being split awkwardly mid-sentence across pages, we leverage native CSS Page Paged Media fragments:
• CSS Control:css
.report-section {
  page-break-inside: avoid;
  break-inside: avoid;
}
pre[class*="language-"] {
  page-break-inside: avoid;
  break-inside: avoid;
  white-space: pre-wrap; /* Prevents horizontal clip */
  word-break: break-all;
}
.image-container {
  page-break-inside: avoid;
  break-inside: avoid;
}
Use code with caution.

C. Dynamic Header/Footer Generation

Puppeteer features native API hooks to inject headers and footers directly at the Chromium print layout level, bypassing standard HTML viewport limitations.
• Implementation Hook:typescript
await page.pdf({
  format: 'A4',
  displayHeaderFooter: true,
  headerTemplate: `<div style="font-size: 10px; width: 100%; text-align: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 5px; font-family: 'Helvetica'; color: #64748B;">
                    <span>Developer Lab Report</span>
                    <span>${new Date().toLocaleDateString()}</span>
                  </div>`,
  footerTemplate: `<div style="font-size: 10px; width: 100%; text-align: right; font-family: 'Helvetica'; color: #64748B;">
                    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
                  </div>`,
  margin: { top: '60px', bottom: '60px', left: '40px', right: '40px' }
});
Use code with caution.

4. FILE HANDLING & MEMORY MANAGEMENT

Because PDF generation boots up an instance of Headless Chromium, poor asset and lifecycle management will quickly cause high memory usage or a disk space bottleneck.
[Incoming Request] ──> [Multer Memory Storage] ──> [Process & Tokenize Data]
                                                          │
[Client Download] <─── [Stream Binary Buffer]  <── [Generate PDF in Chromium]
                                                          │
                                                [Immediate GC Trigger]

Upload Pipeline Strategy

• Memory Buffer Ingestion: Configure Multer to utilize memoryStorage() instead of writing raw user uploads directly to the disk. Files are kept temporarily in system memory as buffers, entirely avoiding the disk write lifecycle during ingestion.
• Validation Tier: A custom Express middleware intercepts the buffer array, validating that:
	1. Text file extensions match an explicit whitelist (.ts, .js, .py, .go, .json, .txt).
	2. Image assets (screenshots) match strict MIME types (image/png, image/jpeg) and remain under a maximum file size threshold (e.g., 5MB).
