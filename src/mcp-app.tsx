import type { App, McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import "@primer/primitives/dist/css/functional/themes/light.css";
import "@primer/primitives/dist/css/functional/themes/dark.css";
import { BaseStyles, ThemeProvider } from "@primer/react";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PrimerRenderer } from "./PrimerRenderer";

interface ComponentNode {
  type: string;
  props?: Record<string, unknown>;
  children?: string | ComponentNode | (string | ComponentNode)[];
}

function PrimerApp() {
  const [tree, setTree] = useState<ComponentNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();

  const { app, error: connectError } = useApp({
    appInfo: { name: "Primer MCP App", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (app: App) => {
      app.ontoolresult = async (result: CallToolResult) => {
        try {
          const textContent = result.content?.find((c) => c.type === "text");
          if (!textContent || textContent.type !== "text") {
            setError("No content in tool result");
            return;
          }
          const parsed = JSON.parse(textContent.text);

          // list-components returns an object with a "components" key
          if (parsed.components) {
            // Render a nice component list
            setTree({
              type: "Stack",
              props: { direction: "vertical", gap: "normal", padding: "normal" },
              children: [
                { type: "Heading", props: { as: "h2" }, children: "Available Primer Components" },
                { type: "Text", props: { as: "p", color: "fg.muted" }, children: `${parsed.components.length} components available` },
                {
                  type: "Box",
                  props: { display: "flex", flexWrap: "wrap", sx: { gap: 2 } },
                  children: parsed.components.map((name: string) => ({
                    type: "Label",
                    children: name,
                  })),
                },
                ...(parsed.examples ?? []).map((ex: { description: string; tree: ComponentNode }) => ({
                  type: "Stack",
                  props: { direction: "vertical", gap: "condensed" },
                  children: [
                    { type: "Text", props: { fontWeight: "bold", fontSize: 1 }, children: ex.description },
                    ex.tree,
                  ],
                })),
              ],
            });
          } else {
            // render-primer: parse as component tree directly
            setTree(parsed);
          }
          setError(null);
        } catch (e) {
          setError(`Failed to parse component tree: ${e instanceof Error ? e.message : String(e)}`);
        }
      };

      app.onerror = (e) => setError(String(e));

      app.onhostcontextchanged = (params) => {
        setHostContext((prev) => ({ ...prev, ...params }));
      };
    },
  });

  useEffect(() => {
    if (app) {
      setHostContext(app.getHostContext());
    }
  }, [app]);

  if (connectError) {
    return (
      <ThemeProvider>
        <BaseStyles>
          <div style={{ padding: 16, color: "var(--fgColor-danger)" }}>
            Connection error: {connectError.message}
          </div>
        </BaseStyles>
      </ThemeProvider>
    );
  }

  if (!app) {
    return (
      <ThemeProvider>
        <BaseStyles>
          <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 8 }}>
            Connecting...
          </div>
        </BaseStyles>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <BaseStyles>
        <main
          style={{
            padding: 16,
            paddingTop: hostContext?.safeAreaInsets?.top ?? 16,
            paddingRight: hostContext?.safeAreaInsets?.right ?? 16,
            paddingBottom: hostContext?.safeAreaInsets?.bottom ?? 16,
            paddingLeft: hostContext?.safeAreaInsets?.left ?? 16,
          }}
        >
          {error && (
            <div style={{ color: "var(--fgColor-danger)", marginBottom: 12, fontSize: 13 }}>
              {error}
            </div>
          )}
          {tree ? (
            <PrimerRenderer tree={tree} />
          ) : (
            <div style={{ color: "var(--fgColor-muted)", fontSize: 13 }}>
              Waiting for component data...
            </div>
          )}
        </main>
      </BaseStyles>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrimerApp />
  </StrictMode>,
);
