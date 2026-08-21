# 🛠️ Tool Call Reference Guide for AI Agent

**Last Updated:** August 21, 2026  
**Project:** CMS Next.js Enterprise (cmscline-qwen3.8)  
**Environment:** Windows 11 / VS Code

---

## 📋 Table of Contents
1. [run_commands](#1-run_commands) - Shell Command Execution
2. [read_files](#2-read_files) - File Content Reading
3. [search_codebase](#3-search_codebase) - Pattern Search Across Codebase
4. [fetch_web_content](#4-fetch_web_content) - Web Content Fetching
5. [editor](#5-editor) - File Creation and Editing
6. [ask_question](#6-ask_question) - User Clarification (CRITICAL)
---

## 1. run_commands — Shell Command Execution

### Purpose
Execute non-interactive shell commands in Windows PowerShell environment.

### Test Results ✅
- **Directory listing:** `dir` → Listed all files and folders successfully
- **File deletion:** `del "filename"` → Deleted test file successfully

### Usage Examples

```typescript
// Basic directory listing
run_commands({
  commands: ["dir"]
})

// Multiple commands (sequenced with ';')
run_commands({
  commands: [
    "dir",
    "dir src/models"
  ]
})

// File operations
run_commands({
  commands: ["del \"test-tool-call.ts\""]
})
```

// File operations (USE FORWARD SLASHES TO AVOID JSON ESCAPING ERRORS)
- ✅ Avoid interactive commands (pagers, prompts)
- ✅ Use PowerShell syntax (`cd /d` for directory change)

### Output Format
Returns array of command results with `query`, `result`, and `success` fields.
Output may be truncated if ~48k characters exceeded (start/end preserved).

## 2. read_files — File Content Reading

### Purpose
Read text or image files, optionally reading specific line ranges for large files.

### Test Results ✅
- **File:** `package.json` → Successfully read 38 lines
- **Verification:** Confirmed content accuracy and line counting

### Usage Examples

```typescript
// Read entire file
read_files({
  files: [{ path: "d:/Project/AISample/cmsqwen3.8/cmscline-qwen3.8/package.json" }]
})

// Read specific line range (inclusive, 1-based)
read_files({
  files: [{
    path: "d:/Project/AISample/cmsqwen3.8/cmscline-qwen3.8/package.json",
    start_line: 1,
    end_line: 20
  }]
})

// Read multiple files in parallel (recommended)
read_files({
  files: [
    { path: "src/models/page-model.ts" },
    { path: "src/models/blog-model.ts" },
    { path: "src/app/layout.tsx" }
  ]
})
```

### Best Practices
- ✅ **ALWAYS use forward slashes (`/`)** for file paths (e.g., `src/models/file.ts`). Windows PowerShell and Node.js handle this perfectly, and it prevents JSON backslash-escaping failures.
- ✅ Use `&&` to chain commands so execution stops immediately if a command fails.
- ✅ Keep input short (~12000 char limit for output).
- ✅ Read multiple files together in one call (parallelism = performance)
- ✅ Use absolute paths always (`d:/...`)
- ✅ Large files: Page through with `start_line`/`end_line`
- ✅ Cap: 2000 lines (~47k chars) per call
- ✅ Binary files (non-images) not supported

### Output Format
Returns object with file contents or error messages for each path.
Shows line number prefixes (e.g., `1 | `, `2 | `) for readability.

## 3. search_codebase — Pattern Search Across Codebase

### Purpose
Perform regex pattern searches across all TypeScript/JavaScript files to find code patterns, imports, exports, etc.

### Test Results ✅
- **Pattern:** `"use client"` → Found 55 results across components
- **Pattern:** `"export.*interface"` → Found 63 interface definitions
- **Verification:** Accurate pattern matching and file location reporting

### Usage Examples

```typescript
// Search for specific patterns (avoid special regex chars)
search_codebase({
  queries: [
    "'use client'",           // Client components locations
    "import.*mongoose",       // Mongoose imports
    "export.*default"          // Default exports
  ]
})

// Find component files with hooks
search_codebase({
  queries: ["useState|useEffect|useRef"]
})

// Search for specific function patterns
search_codebase({
  queries: ["function.*create.*Page", "async.*function"]
})
```

### Best Practices
- ✅ Use simple regex patterns (avoid `*`, `+`, `?`, etc. unless escaped)
- ✅ Multiple independent searches can run in parallel
- ✅ Narrow patterns work better than broad ones
- ✅ Be specific: target known file types/locations

### Output Format
Returns array of results with `query`, `result`, and `error` fields.
Each result shows matched file path, line numbers, and context.
Middle-truncated if output exceeds ~48k chars per query.

## 4. fetch_web_content — Web Content Fetching

### Purpose
Fetch URLs and analyze content using provided prompts for information extraction.

### Test Results ✅
- **URL:** `https://example.com` → Successfully fetched and analyzed
- **Verification:** Content retrieval and prompt-based extraction working

### Usage Examples

```typescript
// Simple URL fetch with analysis prompt
fetch_web_content({
  requests: [{
    url: "https://example.com",
    prompt: "Extract website title, description, and meta tags"
  }]
})

// Multiple URLs in parallel
fetch_web_content({
  requests: [
    {
      url: "https://nextjs.org/docs",
      prompt: "Summarize the App Router features and breaking changes"
    },
    {
      url: "https://mongoosejs.com/docs",
      prompt: "Extract key methods for query operations"
    }
  ]
})

// Documentation lookup for API reference
fetch_web_content({
  requests: [{
    url: "https://react.dev/reference/react/useEffect",
    prompt: "Get usage examples and cleanup function patterns"
  }]
})
```

### Best Practices
- ✅ Fetch independent URLs together (parallel fetches)
- ✅ Be specific in prompts (target one concept per request)
- ✅ Use for documentation, API references, blog posts
- ❌ Don't fetch sensitive/private URLs
- ❌ Don't call more than 3 times per question

### Output Format
Returns fetched content with analysis based on prompt.
Includes URL, Content-Type, Size, and parsed content.
Shows raw HTML or structured extraction results.

## 5. editor — File Creation and Editing

### Purpose
Create new files or make precise edits to existing files using insert/replace operations.

### Test Results ✅
- **File creation:** Successfully created `test-tool-call.ts` with full content
- **Read-back verification:** Confirmed accurate file content after creation
- **Line-based reading:** Verified file had exactly 3 lines as specified

### Usage Examples

```typescript
// Create a new file (omitting old_text when creating)
editor({
  path: "d:/Project/AISample/cmsqwen3.8/cmscline-qwen3.8/src/utils/new-utility.ts",
  new_text: `/**
 * New utility function documentation
 */
export function myNewFunction(params) {
  // Implementation here
}
`
})

// Replace text in existing file
editor({
  path: "d:/Project/AISample/cmsqwen3.8/cmscline-qwen3.8/src/models/page-model.ts",
  old_text: "// OLD CODE HERE\n  field: { type: String }\n  // MORE OLD CODE",
  new_text: "// NEW CODE HERE\n  field: { type: String, required: true }\n  // MORE NEW CODE"
})

// Insert text at specific line number
editor({
  path: "d:/Project/AISample/cmsqwen3.8/cmscline-qwen3.8/src/app/layout.tsx",
  insert_line: 42,  // Insert before line 42
  new_text: "// Comment inserted before this line\n"
})

// Append to end of file
editor({
  path: "d:/Project/AISample/cmsqwen3.8/cmscline-qwen3.8/src/components/Button.tsx",
  insert_line: null, // Or omit entirely
  new_text: "\n/**\n * Helper function for button styling\n */\nexport const getButtonStyles = (variant) => { ... }\n"
})
```

### Best Practices
- ✅ **ALWAYS read file first** before editing with `read_files`
- ✅ Provide **EXACT MATCH** for `old_text` (case-sensitive, whitespace-including)
- ✅ Write **COMPLETE CODE** - no placeholders or truncation ("// ... rest")
- ✅ Keep edits ≤6000 characters per call when possible
- ✅ Use multiple editor calls for large changes (split into chunks)
- ✅ Use `insert_line: line_count + 1` to append at EOF
- ✅ Forward slashes (`/`) in Windows paths

### Output Format
On success: Shows file path and `success: true`  
On error: Returns `error` field with specific failure reason (e.g., mismatched old_text)

## 💡 Tips for Maximum Efficiency

### 1. Read Multiple Files in Parallel
Instead of sequential reads, batch them:
```typescript
read_files({
  files: [
    { path: "/src/models/page-model.ts" },
    { path: "/src/models/blog-model.ts" },
    { path: "/src/components/PageForm.tsx" }
  ]
})
```

### 2. Search Before You Search Again
Cache search results in memory when working on specific patterns.

### 3. Small, Precise Edits
Break large changes into multiple editor calls rather than one massive replacement.

### 4. Verify After Editing
Always read back edited files to confirm accuracy before proceeding.

### 5. Use Absolute Paths
Always use full paths like `d:/Project/AISample/...` to avoid confusion.

---

## 🔧 Error Handling & Troubleshooting

### run_commands Errors
- `"&&"` or `"&"` not valid → Use `;` instead
- Interactive prompts fail → Add flags like `--no-pager` for git commands
- Long output → May be truncated, filter output in command string

### read_files Errors
- File not found → Check path (use forward slashes, absolute paths)
- Binary files → Only text/image files supported
- Exceeds 2000 lines → Use `start_line`/`end_line` to page through

### search_codebase Errors
- Invalid regex → Avoid special chars (`*`, `+`, `?`) or escape them
- Large output → May be middle-truncated, narrow patterns work better

### editor Errors
- **Mismatched old_text** → Must match exactly once (case-sensitive, whitespace)
- File doesn't exist → Omit `old_text` to create new file
- Insert line out of bounds → Use valid line numbers (1-based)

---

6. ask_question — User Clarification (CRITICAL)
Purpose
Ask the user for input, clarification, or permission before proceeding.
Usage Examples

```typescript
ask_question({
  question: "Should I proceed with deleting the database, or would you like to back it up first?"
})

```
🚨 STRICT RULES FOR ask_question 🚨
✅ You MUST use the exact tool name: ask_question.
✅ You MUST use ONLY the question parameter.
❌ NEVER use XML tags like <ask_question>.
❌ NEVER invent parameters like options, choices, or buttons. The system does not support them.

## 📊 Tool Call Statistics (From Testing)

| Tool | Test Status | Tests Run | Results |
|------|-------------|-----------|---------|
| run_commands | ✅ Working | 3 | 3/3 successful |
| read_files | ✅ Working | 2 | 2/2 successful |
| search_codebase | ✅ Working | 2 | 55 + 63 results found |
| fetch_web_content | ✅ Working | 1 | Successful extraction |
| editor | ✅ Working | 1 | File created with full content |

---

**Remember:** Always plan your approach, use appropriate tools in parallel when possible, and verify results before moving forward! 🎯
