# mcp-primer

MCP App that renders [Primer React](https://primer.style/) components inline in AI conversations. Built on the [MCP Apps](https://apps.extensions.modelcontextprotocol.io/api/) extension.

![Primer](https://user-images.githubusercontent.com/4608155/127241386-f11da52d-00d9-4366-b01c-6f4c1ebcf7f2.png)

## What it does

Exposes two MCP tools:

| Tool | Description |
|------|-------------|
| `render-primer` | Renders a Primer component tree from JSON inline in the conversation |
| `list-components` | Returns available components with usage examples |

The LLM sends a component tree as JSON, and the MCP App renders it using real `@primer/react` components with full GitHub theming (light + dark mode).

### Example

Ask Copilot: *"Show me a PR status using Primer components"*

The LLM calls `render-primer` with:

```json
{
  "tree": {
    "type": "Stack",
    "props": { "direction": "horizontal", "align": "center", "gap": "normal" },
    "children": [
      { "type": "StateLabel", "props": { "status": "pullOpened" }, "children": "Open" },
      { "type": "Heading", "props": { "as": "h3" }, "children": "Add dark mode support" }
    ]
  }
}
```

And it renders as real Primer components in the chat.

## Setup

### VS Code (Insiders)

Add to your MCP settings (`.vscode/mcp.json`):

```json
{
  "servers": {
    "primer": {
      "command": "node",
      "args": ["${workspaceFolder}/dist/main.js", "--stdio"]
    }
  }
}
```

Or point to the repo wherever you cloned it:

```json
{
  "servers": {
    "primer": {
      "command": "bash",
      "args": ["-c", "cd ~/source/mcp-primer && npm run build >&2 && node dist/main.js --stdio"]
    }
  }
}
```

### HTTP Transport

```bash
npm start
# Server listening on http://localhost:3001/mcp
```

## Development

```bash
npm install
npm run dev     # Watch mode (Vite + server)
```

## Available Components

**Layout:** Stack, PageLayout, PageHeader

**Typography:** Heading, Text

**Actions:** Button, IconButton, ButtonGroup, LinkButton

**Navigation:** Breadcrumbs, Link, Pagination, UnderlineNav

**Data Display:** Avatar, AvatarStack, BranchName, CounterLabel, Label, StateLabel, Token, RelativeTime, Timeline

**Feedback:** Banner, Spinner, ProgressBar

**Forms:** TextInput, Textarea, Select, Checkbox, Radio, FormControl, ToggleSwitch, SegmentedControl

**Overlays:** ActionList, ActionMenu, Dialog

**Misc:** Truncate, Tooltip, Popover, TreeView, NavList

All compound components (e.g. `ActionList.Item`, `FormControl.Label`, `Timeline.Badge`) are also supported using dot notation.

## Component Tree Format

Each node in the tree has:

```ts
{
  type: string;       // Primer component name
  props?: object;     // Component props
  children?: string | node | (string | node)[];  // Text or nested components
}
```

## Build

```bash
npm run build    # Type-check + Vite bundle + compile server
```

Produces:
- `dist/mcp-app.html` — single-file React app with all Primer components bundled
- `dist/server.js` — MCP server
- `dist/index.js` — entry point (stdio + HTTP)
