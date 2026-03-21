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
        "Use render_primer to display components, or list_components to see what's available. " +
        `${meta.allNames.length} components from @primer/react@${meta.version}.`,
    },
  );

  const resourceUri = "ui://primer/mcp-app.html";

  registerAppTool(
    server,
    "render_primer",
    {
      title: "Render Primer Components",
      annotations: { readOnlyHint: true },
      description:
        "Render an interactive GitHub Primer React component inline. Input is a component tree as JSON. " +
        "Each node has { type, props?, children? }. " +
        "type is a Primer component name. children can be a string, a single node, or an array. " +
        "Any on* prop with a string value (e.g. onClick: 'merge-clicked', onChange: 'input-changed') " +
        "becomes an event that reports user interactions back to the model context. " +
        "Example: { type: 'Button', props: { variant: 'primary', onClick: 'confirm' }, children: 'Confirm' }",
      inputSchema,
      _meta: { ui: { resourceUri } },
    },
    async (args): Promise<CallToolResult> => {
      try {
        const tree = args.tree;
        if (!tree || typeof tree !== "object") {
          return {
            isError: true,
            content: [{ type: "text", text: "Invalid input: tree must be an object with { type, props?, children? }" }],
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(tree) }],
        };
      } catch (e) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
        };
      }
    },
  );

  registerAppTool(
    server,
    "list_components",
    {
      title: "List Primer Components",
      annotations: { readOnlyHint: true },
      description:
        "Returns all available Primer React component names, descriptions, props, and usage examples for render_primer.",
      _meta: { ui: { resourceUri } },
    },
    async (): Promise<CallToolResult> => {
      return {
        content: [{ type: "text", text: JSON.stringify(meta, null, 2) }],
      };
    },
  );

  registerAppResource(
    server,
    "Primer Component View",
    resourceUri,
    {
      description: "Interactive GitHub Primer component renderer",
      mimeType: RESOURCE_MIME_TYPE,
    },
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
