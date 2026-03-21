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
      "**Form events:**\n" +
      "- `onChange: \"fieldName\"` — stores input value locally (no immediate report). Use on TextInput, Textarea, Select, Checkbox, Radio.\n" +
      "- `onSubmit: \"eventId\"` — on a Button, collects ALL form field values and sends them as `{ event, formData: { field1: value1, ... } }` to model context.\n" +
      "- `onClick: \"eventId\"` — immediate fire (for buttons, selections).\n" +
      "- Any other `on*: \"eventId\"` — immediate fire with extracted value.\n\n" +
      "Example form:\n" +
      "```json\n" +
      '{ "type": "Stack", "props": { "direction": "vertical" }, "children": [\n' +
      '  { "type": "TextInput", "props": { "onChange": "repoName", "placeholder": "repo name" } },\n' +
      '  { "type": "Select", "props": { "onChange": "visibility" }, "children": [...] },\n' +
      '  { "type": "Button", "props": { "onSubmit": "create-repo", "variant": "primary" }, "children": "Create" }\n' +
      "]}\n" +
      "```\n" +
      'Clicking Create sends: `{ "event": "create-repo", "formData": { "repoName": "my-repo", "visibility": "public" } }`\n\n' +
      "Available components:\n" + componentSummary,
    ),
};
