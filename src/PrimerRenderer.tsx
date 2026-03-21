/* eslint-disable @typescript-eslint/no-explicit-any */
import type { App } from "@modelcontextprotocol/ext-apps";
import { createContext, createElement, useCallback, useContext, useRef, type ReactNode } from "react";
import { resolveComponent } from "./component-map";

interface ComponentNode {
  type: string;
  props?: Record<string, unknown>;
  children?: string | ComponentNode | (string | ComponentNode)[];
}

interface AppContextValue {
  app: App | null;
  formState: React.MutableRefObject<Record<string, unknown>>;
}

const AppContext = createContext<AppContextValue>({ app: null, formState: { current: {} } });

function emit(app: App | null, eventId: string, detail: Record<string, unknown> = {}) {
  if (!app) return;
  app.updateModelContext({
    content: [{ type: "text", text: JSON.stringify({ event: eventId, ...detail }) }],
  }).catch(console.error);
}

function extractValue(arg: unknown): unknown {
  if (arg === null || arg === undefined) return arg;
  if (typeof arg === "string" || typeof arg === "number" || typeof arg === "boolean") return arg;
  if (typeof arg === "object" && "target" in (arg as Record<string, unknown>)) {
    const target = (arg as any).target;
    if (target && typeof target === "object") {
      if ("checked" in target && "type" in target && (target.type === "checkbox" || target.type === "radio")) {
        return { checked: target.checked, value: target.value };
      }
      if ("value" in target) return target.value;
    }
  }
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
  const { app, formState } = useContext(AppContext);
  const Component = resolveComponent(node.type);

  if (!Component) {
    return (
      <div style={{ color: "var(--fgColor-danger, #d1242f)", padding: "4px 8px", fontSize: "12px", border: "1px solid var(--borderColor-danger-muted, #ff818266)", borderRadius: "6px" }}>
        Unknown component: <code>{node.type}</code>
      </div>
    );
  }

  const props: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(node.props ?? {})) {
    // onSubmit="event-id" → collects all form state and sends it
    if (key === "onSubmit" && typeof val === "string") {
      const eventId = val;
      props.onClick = () => emit(app, eventId, { formData: { ...formState.current } });
      continue;
    }

    // onChange="field-name" → stores value in form state (no network call)
    if (key === "onChange" && typeof val === "string") {
      const fieldName = val;
      props.onChange = (...args: unknown[]) => {
        formState.current[fieldName] = extractValue(args[0]);
      };
      continue;
    }

    // onClick="event-id" → immediate fire (for buttons, selections)
    if (key === "onClick" && typeof val === "string") {
      const eventId = val;
      props.onClick = () => emit(app, eventId, { component: node.type });
      continue;
    }

    // Any other on* with string value → immediate fire with extracted value
    if (key.startsWith("on") && typeof val === "string") {
      const eventId = val;
      props[key] = (...args: unknown[]) => {
        emit(app, eventId, {
          component: node.type,
          value: args.length === 1 ? extractValue(args[0]) : args.map(extractValue),
        });
      };
      continue;
    }

    props[key] = val;
  }

  const rendered = renderChildren(node.children);
  return createElement(Component, props, rendered);
}

interface PrimerRendererProps {
  tree: ComponentNode;
  app: App | null;
}

export function PrimerRenderer({ tree, app }: PrimerRendererProps) {
  const formState = useRef<Record<string, unknown>>({});
  const contextValue = useCallback(() => ({ app, formState }), [app]);

  return (
    <AppContext.Provider value={contextValue()}>
      <PrimerNode node={tree} />
    </AppContext.Provider>
  );
}
