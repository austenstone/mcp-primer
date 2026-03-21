import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

// All supported Primer component names
const PRIMER_COMPONENTS = [
  // Layout
  "Stack", "Stack.Item", "PageLayout", "PageHeader",
  // Typography
  "Heading", "Text",
  // Actions
  "Button", "IconButton", "ButtonGroup", "LinkButton",
  // Navigation
  "Breadcrumbs", "Breadcrumbs.Item", "Link", "Pagination",
  "UnderlineNav", "UnderlineNav.Item",
  // Data display
  "Avatar", "AvatarStack", "BranchName", "CounterLabel",
  "Label", "StateLabel", "Token", "RelativeTime",
  "Timeline", "Timeline.Item", "Timeline.Badge",
  // Feedback
  "Banner", "Spinner", "ProgressBar",
  // Forms
  "TextInput", "Textarea", "Select", "Checkbox", "Radio",
  "FormControl", "FormControl.Label", "FormControl.Caption", "FormControl.Validation",
  "ToggleSwitch", "SegmentedControl", "SegmentedControl.Button",
  // Overlay
  "ActionList", "ActionList.Item", "ActionList.LeadingVisual",
  "ActionList.TrailingVisual", "ActionList.Description",
  "ActionList.Divider", "ActionList.GroupHeading",
  "ActionMenu", "ActionMenu.Button", "ActionMenu.Overlay",
  "Dialog",
  // Misc
  "Truncate", "Tooltip", "Popover", "Popover.Content",
  "TreeView", "TreeView.Item", "TreeView.SubTree",
  "NavList", "NavList.Item", "NavList.SubNav",
] as const;

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Primer MCP App Server",
    version: "1.0.0",
  });

  const resourceUri = "ui://primer/mcp-app.html";

  // render-primer: renders a Primer component tree inline
  registerAppTool(
    server,
    "render-primer",
    {
      title: "Render Primer Components",
      description:
        "Renders GitHub Primer React components inline. Pass a component tree as JSON. " +
        "Each node has { type, props?, children? }. " +
        "type is a Primer component name like 'Button', 'Heading', 'Stack', 'StateLabel', etc. " +
        "children can be a string, a single node, or an array of nodes. " +
        "Example: { type: 'Button', props: { variant: 'primary' }, children: 'Click me' }",
      inputSchema: {
        tree: z.record(z.string(), z.unknown()).describe("Root component node: { type, props?, children? }"),
      },
      _meta: { ui: { resourceUri } },
    },
    async (args): Promise<CallToolResult> => {
      const tree = args.tree;
      return {
        content: [{ type: "text", text: JSON.stringify(tree) }],
      };
    },
  );

  // list-components: returns available Primer components
  registerAppTool(
    server,
    "list-components",
    {
      title: "List Primer Components",
      description:
        "Returns a list of all available Primer React components that can be used with render-primer.",
      _meta: { ui: { resourceUri } },
    },
    async (): Promise<CallToolResult> => {
      const componentInfo = {
        components: PRIMER_COMPONENTS,
        usage: "Use render-primer with a tree of { type, props?, children? } nodes.",
        examples: [
          {
            description: "Primary button",
            tree: { type: "Button", props: { variant: "primary" }, children: "Merge pull request" },
          },
          {
            description: "Open PR state",
            tree: {
              type: "Stack",
              props: { direction: "horizontal", align: "center", gap: "normal" },
              children: [
                { type: "StateLabel", props: { status: "pullOpened" }, children: "Open" },
                { type: "Heading", props: { as: "h3" }, children: "Add dark mode support" },
              ],
            },
          },
          {
            description: "Form with input",
            tree: {
              type: "FormControl",
              children: [
                { type: "FormControl.Label", children: "Repository name" },
                { type: "TextInput", props: { placeholder: "my-cool-repo" } },
                { type: "FormControl.Caption", children: "Great repository names are short and memorable." },
              ],
            },
          },
        ],
      };
      return {
        content: [{ type: "text", text: JSON.stringify(componentInfo, null, 2) }],
      };
    },
  );

  // UI resource: the bundled HTML/JS/CSS
  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(
        path.join(DIST_DIR, "mcp-app.html"),
        "utf-8",
      );
      return {
        contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html }],
      };
    },
  );

  return server;
}
