# Robotic Log Viewer

> A high-performance, zero-dependency, single-page web application designed for robotics engineers to parse, inspect, and analyze ROS and autonomous system runtime logs directly in the browser.

---

## Overview

During field testing and autonomous operations, robotic systems generate high-frequency execution logs containing continuous telemetry, sensor updates, state changes, and diagnostics. Inspecting raw unformatted log text in plain text editors can be cumbersome and error-prone.

The **Robotic Log Viewer** provides a clean, web-based visual interface that converts unstructured or semi-structured robotics log files into a structured tabular viewer. With automatic field extraction for timestamps, severity levels, node origins, and diagnostic messages, engineers can inspect mission execution with clarity and speed—with zero backend server, zero build pipeline, and zero external framework dependencies.

---

## Problem

Raw robotics log outputs (from ROS, ROS 2, or custom robotic runtimes) often present information as dense, unstructured text streams:

```plain
2026-09-21 05:40:01.000 [INFO] [robot_controller] Robot system initialized successfully
2026-09-21 05:40:04.996 [WARN] [network] Telemetry packet delay detected: 52 ms
2026-09-21 05:40:05.414 [ERROR] [network] Telemetry connection lost: retrying connection
```

Key operational challenges when viewing raw log streams include:
- **Visual Noise**: Timestamps, severity flags, and node identifiers blend into plain text, making anomalies hard to spot.
- **Large File Lag**: Opening log files containing tens of thousands of lines can cause text editors and browser tabs to freeze.
- **Unstructured Layouts**: Mixed log line formats make manual tracing tedious during failure post-mortems.

---

## Solution

The **Robotic Log Viewer** solves these challenges through client-side stream parsing and virtualized chunk rendering:

```plain
┌──────────────────┐      ┌─────────────────┐      ┌─────────────────────────┐      ┌───────────────────────┐
│ Plain Log File   │ ───► │ Client Reader   │ ───► │ Fault-Tolerant Parser   │ ───► │ Virtualized UI Viewer │
│ (.log / .txt)    │      │ (FileReader API)│      │ (RegEx Match Engine)    │      │ (IntersectionObserver)│
└──────────────────┘      └─────────────────┘      └─────────────────────────┘      └───────────────────────┘
```

1. **Zero-Server Processing**: Files are read strictly inside your browser tab using the HTML5 `FileReader` API, preserving data privacy and security.
2. **Dual-Format Parser**: Tolerates both unbracketed ISO/SQL timestamps (`YYYY-MM-DD HH:MM:SS.MMM`) and bracketed timestamps (`[YYYY-MM-DDTHH:MM:SS]`).
3. **Virtualized Rendering**: Uses chunked rendering (`IntersectionObserver` with `DocumentFragment` batches of 200 rows) to smoothly handle files with 50,000+ lines without UI stutter.

---

## Features

The current release provides the following core capabilities:

- **Local Log File Loading**: Drag-and-drop or select any `.log` or `.txt` file directly from local storage.
- **Automatic Field Extraction**:
  - **Timestamp Extraction**: ISO 8601, SQL datetime formats, or bracketed timestamps.
  - **Severity Extraction**: Color-coded badges for `DEBUG`, `INFO`, `WARN`, `ERROR`, and `FATAL` log levels.
  - **Node/Source Extraction**: Highlights originating sub-system identifiers (e.g., `robot_controller`, `lidar_node`, `network`).
  - **Message Normalization**: Displays cleanly formatted log payload text.
- **Virtualized Log Stream**: Dynamically renders visible chunks during scrolling, maintaining 60 FPS performance even with 50,000+ log lines.
- **Fault-Tolerant Fallback**: Unparsed or malformed lines are preserved verbatim as `row-unparsed` rather than dropped or crashing the execution context.
- **Metadata State Bar**: Live feedback detailing total processed file size, valid entry count, filename, and viewer system status.
- **Zero Dependencies**: Pure HTML5, CSS3, and ES6 JavaScript. No framework overhead or build step required.

---

## How It Works

1. **File Selection**: The user selects a log file via the native file browser.
2. **Asynchronous Reading**: The `FileReader` interface loads raw file contents into memory without blocking the UI thread.
3. **Regex Pattern Parsing**: Each line is processed sequentially through `parseLogLine()`:
   - Evaluates primary unbracketed ISO/SQL timestamp regex: `/^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?...)\s+/`.
   - Fallback evaluation for bracketed timestamps: `/^\[(\d[^\]]*)\]\s+/`.
   - Extracts bracketed tokens for `[LEVEL]` and `[NODE]`.
4. **Chunked DOM Injection**: Extracted records are batched into `DocumentFragment` instances of 200 rows each.
5. **Scroll Sentinels**: An `IntersectionObserver` triggers sequential rendering as the user scrolls toward the bottom of the log table.

---

## Supported Log Formats

The parser accommodates common robotics log conventions out of the box:

### Format Pattern 1: Unbracketed ISO/SQL Timestamp (Standard ROS 2 / Autoware / Custom Runtimes)
```plain
TIMESTAMP [LEVEL] [SOURCE] MESSAGE
```

**Example:**
```plain
2026-09-21 05:40:01.000 [INFO] [robot_controller] Robot system initialized successfully
2026-09-21 05:40:04.996 [WARN] [network] Telemetry packet delay detected: 52 ms
2026-09-21 05:40:05.414 [ERROR] [network] Telemetry connection lost: retrying connection
```

### Format Pattern 2: Bracketed ISO Timestamp (ROS / Legacy Runtimes)
```plain
[TIMESTAMP] [LEVEL] [SOURCE] MESSAGE
```

**Example:**
```plain
[2026-09-20T13:34:09] [INFO] [lidar_node] Sensor initialized
[2026-09-20T13:34:10] [WARN] [camera_node] Dropped frame count: 3
```

### Field Breakdown Matrix

| Extracted Field | Raw Input Snippet | Parsed Output | UI Presentation |
| :--- | :--- | :--- | :--- |
| **Timestamp** | `2026-09-21 05:40:01.000` | `"2026-09-21 05:40:01.000"` | JetBrains Mono tabular text |
| **Level** | `[INFO]`, `[WARN]`, `[ERROR]` | `"INFO"`, `"WARN"`, `"ERROR"` | Color-coded status badge |
| **Node / Source**| `[robot_controller]`, `[network]`| `"robot_controller"`, `"network"`| Subsystem pill badge |
| **Message** | `Robot system initialized...` | `"Robot system initialized..."` | Crisp monospace payload |

---

## Technology Stack

- **Frontend Core**: HTML5 Semantic Markup
- **Styling & Layout**: Vanilla CSS3 (Custom Design System, Dark Mode Theme, CSS Grid & Flexbox)
- **Typography**: Inter (UI font) & JetBrains Mono (Log Data font)
- **Scripting Engine**: Vanilla ES6 JavaScript (No Transpilation Required)
- **Virtualized Rendering**: W3C `IntersectionObserver` API & `DocumentFragment`
- **Testing Suite**: Node.js Native Test Runner (`node:test`, `node:assert`)

---

## Project Structure

```plain
robotic-log-viewer/
├── index.html              # Main HTML5 application structure & UI state containers
├── styles.css              # Robotics design system, dark mode theme & typography
├── app.js                  # Safe regex parser, app state management & chunked UI renderer
├── test.js                 # Native Node.js test suite for parser logic
├── package.json            # Project metadata and npm script definitions
├── .gitignore              # Version control ignore rules
├── LICENSE                 # MIT License
├── actual_robot_run.log    # Synthetic 8-line sample log file for quick testing
├── generate_actual_log.js  # Generator script for actual_robot_run.log
└── generate_logs.js        # Generator script for 50,000+ line stress-testing log file
```

---

## Installation & Running

Since the application uses standard browser capabilities, no compilation or build steps are required.

### 1. Clone the Repository
```bash
git clone https://github.com/<YOUR_GITHUB_USERNAME>/robotic-log-viewer.git
cd robotic-log-viewer
```

### 2. Launching Locally

#### Option A: Direct Browser Launch
Simply open `index.html` directly in any modern browser (Chrome, Firefox, Safari, Edge).

#### Option B: Local HTTP Server (Recommended)
Using Python:
```bash
python3 -m http.server 8080
```
Or using Node.js / npm:
```bash
npm start
```
Then visit `http://localhost:8080` in your web browser.

---

## Testing

The project includes an automated test suite leveraging Node.js's native test runner to verify parser correctness across standard, edge-case, and malformed log lines.

### Run Automated Tests
```bash
npm test
```
*Alternatively:*
```bash
node --test test.js
```

### Test Suite Output Example
```plain
▶ Parser Tests - Real World Data
  ✔ Unbracketed Timestamp + Level + Node
  ✔ Unbracketed Timestamp + WARN + Node
  ✔ Unbracketed Timestamp + ERROR + Node
  ✔ Backward Compatibility: Bracketed timestamp
  ✔ Backward Compatibility: Missing node
  ✔ Backward Compatibility: Only message
▶ Parser Tests - Real World Data (7 pass, 0 fail)
```

### Stress Testing with Large Datasets
To verify performance with massive log files (50,000+ entries):
```bash
npm run generate-stress-log
```
This generates `test_large.log` (~3.3 MB, 50,010 lines). Load this file into the UI to test virtualized rendering speed.

---

## Usage Workflow

1. **Launch the Application**: Open `index.html` in your browser or serve via HTTP.
2. **Select Log File**: Click **"Open Log File"** in the top action bar or center state container.
3. **Parse & Render**: The application instantly parses all lines, displaying file metadata (filename, total entries, file size) in the status bar.
4. **Inspect Log Stream**: Scroll smoothly through color-coded entries.
5. **Open New Log**: Click **"Open Log File"** in the header at any time to switch log files.

---

## Example: Raw Input vs Parsed Output

### Raw Input File (`actual_robot_run.log`)
```plain
2026-09-21 05:40:01.000 [INFO] [robot_controller] Robot system initialized successfully
2026-09-21 05:40:04.996 [WARN] [network] Telemetry packet delay detected: 52 ms
2026-09-21 05:40:05.414 [ERROR] [network] Telemetry connection lost: retrying connection
```

### Structured JavaScript Object Output
```javascript
[
  {
    raw: "2026-09-21 05:40:01.000 [INFO] [robot_controller] Robot system initialized successfully",
    timestamp: "2026-09-21 05:40:01.000",
    level: "INFO",
    node: "robot_controller",
    message: "Robot system initialized successfully",
    unparsed: false,
    isEmpty: false
  },
  {
    raw: "2026-09-21 05:40:04.996 [WARN] [network] Telemetry packet delay detected: 52 ms",
    timestamp: "2026-09-21 05:40:04.996",
    level: "WARN",
    node: "network",
    message: "Telemetry packet delay detected: 52 ms",
    unparsed: false,
    isEmpty: false
  }
]
```

---

## Error Handling & Security

- **XSS Prevention**: Log payload content is sanitized and rendered strictly using `DOMElement.textContent`. Plain HTML markup or JavaScript embedded inside log messages cannot execute.
- **Empty & Malformed Files**: Empty lines are skipped automatically. Lines without timestamp or level metadata are tagged as `unparsed` and displayed verbatim in grey text, preventing crashes.
- **File Access Failure**: Triggers a clean error UI state with a user-friendly troubleshooting message.

---

## Current Scope & Limitations

To ensure ultra-high performance and zero memory bloat, the scope of this utility is intentionally focused:

- **In-Memory Parsing**: The full log payload is held in JavaScript memory. Files exceeding 100MB may approach browser tab memory limits.
- **No Search or Filtering**: The initial release focuses exclusively on clean file opening, safe parsing, and high-performance visual display.
- **No Remote Telemetry**: Operates strictly on static `.log` / `.txt` files opened locally.

---

## Future Scope

Planned future enhancements (not in current scope):
- Subsystem search and regex log pattern filtering.
- Severity level filtering toggles (`INFO`, `WARN`, `ERROR`).
- Multi-file side-by-side log comparison.
- Export parsed structured logs to JSON/CSV format.

---

## License

Distributed under the [MIT License](LICENSE).
