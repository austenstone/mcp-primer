/* eslint-disable @typescript-eslint/no-explicit-any */
import type { App } from "@modelcontextprotocol/ext-apps";
import { createContext, createElement, useContext, type ReactNode } from "react";
import { resolveComponent } from "./component-map";

interface ComponentNode {
  type: string;
  props?: Record<string, unknown>;
  children?: string | ComponentNode | (string | ComponentNode)[];
}

const AppContext = createContext<App | null>(null);

function emit(app: App | null, eventId: string, detail: Record<string, unknown> = {}) {
  if (!app) return;
  app.updateModelContext({
    content: [{ type: "text", text: JSON.stringify({ event: eventId, ...detail }) }],
  }).catch(console.error);
}

// Extract a serializable value from any event-like argument
function extractValue(arg: unknown): unknown {
  if (arg === null || arg === undefined) return arg;
  if (typeof arg === "string" || typeof arg === "number" || typeof arg === "boolean") return arg;
  // React SyntheticEvent — pull value/checked from target
  if (typeof arg === "object" && "target" in (arg as Record<string, unknown>)) {
    const target = (arg as any).target;
    if (target && typeof target === "object") {
      if ("checked" in target && "type" in target && (target.type === "checkbox" || target.type === "radio")) {
        return { checked: target.checked, value: target.value };
      }
      if ("value" in target) return target.value;
    }
  }
  // Array of items (e.g. selection events)
  if (Array.isArray(arg)) return arg.map(extractValue);
  return String(arg);
}

function renderChildren(children: ComponentNode["children"]): ReactNode {
  if (children === undefined || children === null) return null;
  if (typeof children === "string") return children;
  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === "string") return child;
      return <PrimerNode key={i} node={child} />;
    });
  }
  return <PrimerNode node={children} />;
}

function PrimerNode({ node }: { node: ComponentNode }) {
  const app = useContext(AppContext);
  const Component = resolveComponent(node.type);

  if (!Component) {
    return (
      <div style={{ color: "var(--fgColor-danger, #d1242f)", padding: "4px 8px", fontSize: "12px", border: "1px solid var(--borderColor-danger-muted, #ff818266)", borderRadius: "6px" }}>
        Unknown component: <code>{node.type}</code>
      </div>
    );
  }

  const props: Record<string, unknown> = {};

  // Separate onEvent handlers from regular props
  for (const [key, val] of Object.entries(node.props ?? {})) {
    if (key === "onEvent") continue;

    // Any prop starting with "on" whose value is a string = event binding
    // e.g. { onClick: "merge-clicked", onChange: "name-changed" }
    if (key.startsWith("on") && typeof val === "string") {
      const eventId = val;
      props[key] = (...args: unknown[]) => {
        const detail: Record<string, unknown> = { component: node.type };
        if (args.length === 1) {
          detail.value = extractValue(args[0]);
        } else if (args.length > 1) {
          detail.args = args.map(extractValue);
        }
        emit(app, eventId, detail);
      };
      continue;
    }

    props[key] = val;
  }

  // Legacy: onEvent prop as a catch-all click handler
  const onEvent = (node.props as Record<string, unknown> | undefined)?.onEvent;
  if (typeof onEvent === "string" && !props.onClick) {
    props.onClick = () => emit(app, onEvent, { component: node.type });
  }

  const rendered = renderChildren(node.children);
  return createElement(Component, props, rendered);
}

interface PrimerRendererProps {
  tree: ComponentNode;
  app: App | null;
}

export function PrimerRenderer({ tree, app }: PrimerRendererProps) {
  return (
    <AppContext.Provider value={app}>
      <PrimerNode node={tree} />
    </AppContext.Provider>
  );
}
