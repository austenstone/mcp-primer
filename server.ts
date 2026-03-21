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
import { inputSchema } from "./src/input-schema.js";
import meta from "./src/primer-meta.json" with { type: "json" };

const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

export function createServer(): McpServer {
  const server = new McpServer(
    {
      name: "Primer MCP App Server",
      version: "1.0.0",
    },
    {
      instructions:
        "This server renders GitHub Primer React components inline as interactive UI. " +
        "Use render-primer to display components, or list-components to see what's available. " +
        `${meta.allNames.length} components from @primer/react@${meta.version}.`,
    },
  );

  const resourceUri = "ui://primer/mcp-app.html";

  // render-primer: renders a Primer component tree inline
  registerAppTool(
    server,
    "render-primer",
    {
      title: "Render Primer Components",
      annotations: { readOnlyHint: true },
      description:
        "Renders GitHub Primer React components inline. Pass a component tree as JSON. " +
        "Each node has { type, props?, children? }. " +
        "type is a Primer component name. children can be a string, a single node, or an array. " +
        "Example: { type: 'Button', props: { variant: 'primary' }, children: 'Click me' }",
      inputSchema,
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
      return {
        content: [{ type: "text", text: JSON.stringify(meta, null, 2) }],
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
