import { createElement, type ReactNode } from "react";
import { resolveComponent } from "./component-map";

interface ComponentNode {
  type: string;
  props?: Record<string, unknown>;
  children?: string | ComponentNode | (string | ComponentNode)[];
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
  const Component = resolveComponent(node.type);

  if (!Component) {
    return (
      <div style={{ color: "var(--fgColor-danger, #d1242f)", padding: "4px 8px", fontSize: "12px", border: "1px solid var(--borderColor-danger-muted, #ff818266)", borderRadius: "6px" }}>
        Unknown component: <code>{node.type}</code>
      </div>
    );
  }

  const props = { ...node.props } as Record<string, unknown>;
  const rendered = renderChildren(node.children);

  return createElement(Component, props, rendered);
}

interface PrimerRendererProps {
  tree: ComponentNode;
}

export function PrimerRenderer({ tree }: PrimerRendererProps) {
  return <PrimerNode node={tree} />;
}
