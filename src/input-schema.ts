/**
 * Builds a Zod input schema from primer-meta.json for the render_primer tool.
 * Provides the LLM with component names, descriptions, and props via .describe().
 */
import { z } from "zod";
import meta from "./primer-meta.json" with { type: "json" };

// Build a description string summarizing available components
const componentSummary = meta.components
  .map((c) => {
    const subs = c.subComponents.length > 0
      ? ` (sub: ${c.subComponents.join(", ")})`
      : "";
    const desc = c.description ? ` — ${c.description}` : "";
    const keyProps = c.props
      .filter((p) => p.description || p.required)
      .slice(0, 5)
      .map((p) => {
        const req = p.required ? " (required)" : "";
        const d = p.description ? `: ${p.description.slice(0, 60)}` : "";
        return `${p.name}${req}${d}`;
      });
    const propsStr = keyProps.length > 0 ? ` [props: ${keyProps.join("; ")}]` : "";
    return `${c.name}${desc}${subs}${propsStr}`;
  })
  .join("\n");

export const inputSchema = {
  tree: z.record(z.string(), z.unknown())
    .describe(
      "Root component node: { type, props?, children? }. " +
      "`type` is a Primer component name. `props` is an object of component props. " +
      "`children` can be a string (text), a single child node, or an array of child nodes. " +
      "Nodes can be nested recursively.\n\n" +
      "**Events:** Any `on*` prop (onClick, onChange, onSelect, etc.) with a string value " +
      "becomes an event binding. When triggered, the event ID and extracted value are sent " +
      "to the model context. Example: { type: 'Button', props: { onClick: 'merge-clicked' }, children: 'Merge' } " +
      "or { type: 'TextInput', props: { onChange: 'name-changed', placeholder: 'Enter name' } }. " +
      "Legacy: `onEvent` prop works as a catch-all click handler.\n\n" +
      "Available components:\n" + componentSummary,
    ),
};
