<div align="center">

# LRM Automation

**Lab Report Maker** — turn a whole lab (many tasks, source code, and outputs) into one clean, syntax-highlighted PDF.

<p>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-source-3178C6?logo=typescript&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white">
  <img alt="Puppeteer" src="https://img.shields.io/badge/Puppeteer-PDF-40B5A4?logo=googlechrome&logoColor=white">
</p>

<p>A single-user utility for compiling lab reports: one PDF, many tasks, no manual layout work.</p>

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Using the Web UI](#using-the-web-ui)
- [API Reference](#api-reference)
  - [Request Fields](#request-fields)
  - [Curl Example](#curl-example)
  - [HTML + JavaScript Example](#html--javascript-example)
  - [Responses](#responses)
- [Limits](#limits)
- [PDF Layout](#pdf-layout)
- [Troubleshooting](#troubleshooting)

---

## Overview

LRM Automation accepts a **lab title** plus any number of **tasks**. Each task has its own:

- Title
- Objective / description
- Source code files (multiple)
- Execution output / logs

The server highlights every source file with `highlight.js`, injects everything into an HTML print template, and renders a single PDF with Puppeteer (headless Chromium). The resulting document contains a lab header, a task index, and one section per task.

> The legacy single-task API (`title`, `description`, `outputLogs`, `codeFiles`) is still supported.

## Features

- **Multi-task labs** — up to 20 tasks in one report.
- **One combined PDF** — task index + one section per task.
- **Syntax highlighting** — language detected from each file extension.
- **Safe rendering** — all user text is HTML-escaped; hljs output is trusted markup only.
- **Continuous print flow** — tasks and long code listings split naturally across pages without forced blank areas.
- **Clear validation** — `400` for bad input, `413` for oversized uploads.
- **Dynamic UI** — add/remove task cards; numbering updates automatically.
- **In-memory uploads** — files never touch disk before rendering.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + native ESM |
| Language | TypeScript (executed with `tsx`) |
| HTTP | Express 5 |
| Uploads | Multer (memory storage) |
| Highlighting | highlight.js |
| PDF engine | Puppeteer (headless Chromium) |
| Frontend | Plain HTML/CSS/JS |

## Project Structure

```text
LRM-automation/
├── .core/
│   └── plan.md                          # Original architecture blueprint
├── server/
│   ├── app.ts                           # Express app, static files, error handler
│   ├── server.ts                        # HTTP entry point / shutdown hooks
│   ├── package.json
│   └── src/
│       ├── controller/
│       │   └── report.controller.ts     # Validation, task/file grouping, response
│       ├── middlewares/
│       │   └── upload.middleware.ts     # Multer memory storage + limits
│       ├── routes/
│       │   └── report.route.ts          # POST /api/reports/generate
│       ├── services/
│       │   ├── highlight.service.ts     # File → highlighted HTML
│       │   └── pdf.service.ts           # HTML template → PDF buffer
│       ├── templates/
│       │   └── default.report.html      # Print layout (inline CSS)
│       └── public/
│           └── index.html               # Task-builder UI
└── README.md
```

## Getting Started

```bash
cd server
npm install
npm run dev
```

Open **http://localhost:3000**.

| Command | Description |
|---|---|
| `npm run dev` | Start with `nodemon` + `tsx` (auto-restart on changes) |
| `npm start` | Start once with `tsx` |

Use a different port with the `PORT` environment variable:

```bash
PORT=4000 npm start
```

> **Puppeteer note:** the first `npm install` downloads a Chromium build. If it is missing or fails to launch, run `npx puppeteer browsers install chrome`.

## Using the Web UI

1. Enter the **Lab Title**.
2. Fill in the first **task card**: title, objective, source files, logs.
3. Click **+ Add Task** for each additional task.
4. Click **Generate & Download PDF**.

Each task card's files are uploaded independently, so they stay attached to the right task even when filenames collide. The last remaining task cannot be removed, and the builder stops at 20 tasks.

## API Reference

### `POST /api/reports/generate`

`Content-Type: multipart/form-data`

#### Request Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `labTitle` | text | ✅ | Name of the lab / report |
| `tasks` | JSON text | ✅ | Array of task objects (see below) |
| `task_0`, `task_1`, … | file | ❌ | Files belonging to task at that index |

Each entry in `tasks`:

```json
{
  "title": "Process Scheduling",
  "description": "Implement FCFS and SJF schedulers.",
  "outputLogs": "FCFS average waiting time: 12ms"
}
```

- `title` is required.
- `description` and `outputLogs` are optional.
- File field `task_N` maps to `tasks[N]`.

<details>
<summary><strong>Legacy single-task payload</strong></summary>

The old contract still works:

| Old field | Maps to |
|---|---|
| `title` | Lab title **and** task title |
| `description` | Task description |
| `outputLogs` | Task logs |
| `codeFiles` (files) | Files for task 0 |

</details>

#### Curl Example

```bash
curl -X POST http://localhost:3000/api/reports/generate \
  -F "labTitle=Operating Systems Lab 02" \
  -F 'tasks=[
        {"title":"Process Scheduling","description":"Implement FCFS and SJF.","outputLogs":"Avg wait: 12ms"},
        {"title":"Memory Paging","description":"Simulate FIFO replacement.","outputLogs":"Page faults: 9"}
      ]' \
  -F "task_0=@./scheduler.js" \
  -F "task_1=@./paging.py" \
  --output lab_report.pdf
```

#### HTML + JavaScript Example

A minimal browser example that sends one task with files:

```html
<form id="labForm">
  <label>
    Lab title
    <input type="text" name="labTitle" required>
  </label>

  <label>
    Task title
    <input type="text" id="taskTitle" value="Task 1" required>
  </label>

  <label>
    Objective
    <textarea id="taskDescription"></textarea>
  </label>

  <label>
    Source files
    <input type="file" id="taskFiles" multiple>
  </label>

  <label>
    Output logs
    <textarea id="taskLogs"></textarea>
  </label>

  <button type="submit">Generate PDF</button>
</form>

<script>
  document.getElementById('labForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append('labTitle', event.currentTarget.labTitle.value);

    formData.append('tasks', JSON.stringify([{
      title: document.getElementById('taskTitle').value,
      description: document.getElementById('taskDescription').value,
      outputLogs: document.getElementById('taskLogs').value
    }]));

    const files = document.getElementById('taskFiles').files;
    for (const file of files) {
      formData.append('task_0', file);
    }

    const response = await fetch('/api/reports/generate', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      alert(error.error || 'PDF generation failed.');
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lab_report.pdf';
    link.click();
    URL.revokeObjectURL(url);
  });
</script>
```

#### Responses

<table>
  <thead>
    <tr><th>Status</th><th>Body</th><th>When</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><code>200</code></td>
      <td><code>application/pdf</code> attachment</td>
      <td>Report generated successfully</td>
    </tr>
    <tr>
      <td><code>400</code></td>
      <td><code>{ "success": false, "error": "…" }</code></td>
      <td>Missing lab/task title, invalid task JSON, unknown file field, file targeting a missing task, too many tasks/files</td>
    </tr>
    <tr>
      <td><code>413</code></td>
      <td><code>{ "success": false, "error": "…" }</code></td>
      <td>File larger than 5 MB or more than 50 files in one request</td>
    </tr>
    <tr>
      <td><code>500</code></td>
      <td><code>{ "success": false, "error": "Internal System Generation Failure", "message": "…" }</code></td>
      <td>Unexpected rendering/PDF failure</td>
    </tr>
  </tbody>
</table>

## Limits

| Limit | Value |
|---|---|
| Tasks per report | 20 |
| Files per task | 10 |
| Files per request | 50 |
| File size | 5 MB |
| Task metadata field size | 2 MB |

## PDF Layout

- **Header** — lab title, classification, task count, generated timestamp.
- **Task Index** — every task with its number and title.
- **Task sections** — badge + title, objective, code files with language labels, terminal-style logs.
- **Print flow** — content flows continuously. Tasks are separated by a rule; pages break only when content runs out of room.
- **Long code** — blocks may span multiple pages instead of jumping ahead and leaving blank space.
- **Keep rules** — headings stay with their content, and task headers never split.

## Troubleshooting

<details>
<summary><strong>“Could not find Chrome” / browser launch error</strong></summary>

Install the bundled browser:

```bash
cd server
npx puppeteer browsers install chrome
```

On minimal Linux containers, Chromium also needs shared libraries (e.g. `libnss3`, `libatk`, `libgbm`). The app already passes `--no-sandbox` and `--disable-dev-shm-usage` for container use.
</details>

<details>
<summary><strong>Large code files are slow</strong></summary>

Chromium renders each PDF page as vector content, so very large listings can take tens of seconds. PDF generation has a 180-second timeout. Splitting huge files into logical modules will produce faster, smaller reports.
</details>

<details>
<summary><strong>PDF has no selectable text</strong></summary>

In some headless environments Chromium outlines glyphs instead of embedding fonts. This is an environment/font limitation; the document still renders correctly.
</details>

---

<div align="center">
  <sub>Built for fast, repeatable lab-report generation.</sub>
</div>
