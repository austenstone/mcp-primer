/**
 * Extracts Primer component metadata from @primer/react type definitions.
 * Generates primer-meta.json with component names, descriptions, and key props.
 * Run: npx tsx scripts/generate-components.ts
 */
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

const DIST_DIR = path.resolve("node_modules/@primer/react/dist");
const OUTPUT = path.resolve("src/primer-meta.json");

interface PropInfo {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface ComponentInfo {
  name: string;
  description: string;
  props: PropInfo[];
  subComponents: string[];
}

// Files to parse for component exports
const INDEX_FILES = [
  path.join(DIST_DIR, "index.d.ts"),
  path.join(DIST_DIR, "experimental/index.d.ts"),
];

const SKIP_EXPORTS = new Set([
  "BaseStyles", "ThemeProvider", "FeatureFlags", "Portal",
  "PortalContext", "theme", "useTheme", "useColorSchemeVar",
]);

// Descriptions from primer.style/product/components/ — stable, maintained by Primer design team
const COMPONENT_DESCRIPTIONS: Record<string, string> = {
  ActionBar: "A collection of horizontally aligned IconButtons with overflow menu.",
  ActionList: "A vertical list of interactive actions or options.",
  ActionMenu: "ActionMenu is composed of ActionList and Overlay patterns used for quick actions and selections.",
  AnchoredOverlay: "AnchoredOverlay opens an Overlay relative to the anchor position.",
  Autocomplete: "Allows users to quickly filter through a list of options and pick one or more values.",
  Avatar: "An image that represents a user or organization.",
  AvatarStack: "Displays two or more Avatars in an inline stack.",
  Banner: "Used to highlight important information.",
  Blankslate: "Used as placeholder to tell users why content is missing.",
  BranchName: "A label-type component that displays the name of a branch.",
  Breadcrumbs: "Displays the current page or context within the site hierarchy.",
  Button: "Used to initiate actions on a page or form.",
  ButtonGroup: "Renders a series of buttons.",
  Checkbox: "A form control for single and multiple selections.",
  CheckboxGroup: "Renders a set of Checkboxes.",
  CircleBadge: "Visually connects logos of third-party services.",
  ConfirmationDialog: "A specialized dialog for confirming user actions.",
  CounterLabel: "Adds a count to navigational elements and buttons.",
  DataTable: "A 2-dimensional data structure where each row is an item and each column is a data point.",
  Details: "A styled component to enhance the native <details> element.",
  Dialog: "A floating surface used to display transient content such as confirmation actions.",
  FormControl: "Displays a labelled input and optionally associated validation and hint text.",
  Heading: "Defines the hierarchical structure and importance of the content.",
  IconButton: "Used for buttons that show an icon in place of a text label.",
  InlineMessage: "Used to inform the user about the result of an action within the content.",
  Label: "Used to add contextual metadata to a design.",
  LabelGroup: "Layout constraints for groups of Labels.",
  Link: "Used to apply styles to hyperlink text.",
  NavList: "Renders a vertical list of navigation links.",
  Overlay: "Codifies design patterns related to floating surfaces such as Dialogs and menus.",
  PageHeader: "Determines the top-level headings of a UI.",
  PageLayout: "Defines the header, main, pane, and footer areas of a page.",
  Pagination: "A horizontal set of links to navigate paginated content.",
  Popover: "Used to bring attention to specific user interface elements.",
  ProgressBar: "A simple chart to show how complete something is, or visualize parts of a whole.",
  Radio: "A form control for making a single selection from a short list of options.",
  RadioGroup: "Used to render a short list of mutually exclusive options.",
  RelativeTime: "Displays time in a way that is clear, concise, and accessible.",
  SegmentedControl: "Used to pick one choice from a linear set of closely related choices.",
  Select: "For choosing a single option from a dropdown menu of predefined choices.",
  SelectPanel: "An anchored dialog for quickly navigating and selecting from a list.",
  Spinner: "An indeterminate loading indicator.",
  SplitPageLayout: "A layout with a two-column layout: main content area and sidebar.",
  Stack: "A layout component that creates responsive horizontal and vertical flows.",
  StateLabel: "Used for rendering the status of an issue or pull request.",
  Text: "An abstraction for using Primer's typographic styles.",
  Textarea: "Used to set a value that is multiple lines of text.",
  TextInput: "Used to set a value that is a single line of text.",
  TextInputWithTokens: "An input for a value that is a list.",
  Timeline: "Used to display items on a vertical Timeline.",
  ToggleSwitch: "Used to immediately toggle a setting on or off.",
  Token: "A compact representation of an object, typically used for related metadata.",
  Tooltip: "Adds additional context to interactive UI elements on hover or keyboard focus.",
  TreeView: "A hierarchical list of items that can be expanded or collapsed.",
  Truncate: "Used to shorten overflowing text with an ellipsis.",
  UnderlineNav: "Used to display navigation in a horizontal tabbed format.",
  UnderlinePanels: "Used to break related content into tabbed panels.",
  Table: "A composable HTML table with Primer styling for data display.",
  Flash: "Used to inform users of successful or pending actions.",
  Header: "Used to create a header for a page.",
  SubNav: "Used for navigation within a section of a page.",
  SkeletonAvatar: "Placeholder for loading Avatars.",
  SkeletonBox: "Placeholder for non-text, non-Avatar loading elements.",
  SkeletonText: "Placeholder for loading text.",
  TopicTag: "Used to display a topic tag.",
  VisuallyHidden: "Visually hides content while keeping it accessible to screen readers.",
  Announce: "Used to announce content to screen readers.",
  FilteredActionList: "An ActionList with built-in filtering.",
  ScrollableRegion: "A scrollable container with accessible keyboard scrolling.",
  KeybindingHint: "Indicates the presence of an available keybinding.",
};

function getJsDoc(checker: ts.TypeChecker, symbol: ts.Symbol | undefined): string {
  if (!symbol) return "";
  return ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
}

function typeToString(checker: ts.TypeChecker, type: ts.Type, depth = 0): string {
  if (depth > 1) return "unknown";

  if (type.isUnion()) {
    const parts = type.types
      .map((t) => {
        if (t.isStringLiteral()) return `"${t.value}"`;
        if (t.isNumberLiteral()) return String(t.value);
        return checker.typeToString(t);
      })
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 10);
    if (parts.length > 10) parts.push("...");
    return parts.join(" | ");
  }

  return checker.typeToString(type);
}

function extractProps(
  checker: ts.TypeChecker,
  type: ts.Type,
): PropInfo[] {
  const props: PropInfo[] = [];
  const seen = new Set<string>();

  for (const prop of type.getProperties()) {
    const name = prop.getName();
    if (seen.has(name) || name.startsWith("_") || name.startsWith("on")) continue;
    if (name.startsWith("aria-") || name.startsWith("data-")) continue;
    seen.add(name);

    const decl = prop.getDeclarations()?.[0];
    if (!decl) continue;

    // Only include props declared in @primer/react source files
    const declFile = decl.getSourceFile().fileName;
    const isPrimerProp = declFile.includes("@primer/react") &&
      !declFile.includes("node_modules/csstype") &&
      !declFile.includes("node_modules/@types/react") &&
      !declFile.includes("node_modules/typescript");
    if (!isPrimerProp) continue;

    const propType = checker.getTypeOfSymbolAtLocation(prop, decl);
    const required = !(prop.flags & ts.SymbolFlags.Optional);
    const description = getJsDoc(checker, prop);
    const typeStr = typeToString(checker, propType);

    // Skip overly complex types
    if (typeStr.length > 200) continue;

    props.push({
      name,
      type: typeStr,
      required,
      description,
    });
  }

  return props.slice(0, 20);
}

function main() {
  const allFiles = INDEX_FILES.filter((f) => fs.existsSync(f));

  // Include all component .d.ts files so the checker can resolve JSDoc
  const componentDirs = fs.readdirSync(DIST_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^[A-Z]/.test(d.name));
  for (const dir of componentDirs) {
    const dirPath = path.join(DIST_DIR, dir.name);
    const dtsFiles = fs.readdirSync(dirPath).filter((f) => f.endsWith(".d.ts"));
    for (const f of dtsFiles) {
      allFiles.push(path.join(dirPath, f));
    }
  }

  const program = ts.createProgram(allFiles, {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();

  const components: ComponentInfo[] = [];
  const componentNames = new Set<string>();

  for (const filePath of allFiles) {
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) continue;

    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) continue;

    const exports = checker.getExportsOfModule(moduleSymbol);

    for (const exp of exports) {
      const name = exp.getName();
      if (!name || !/^[A-Z]/.test(name)) continue;
      if (name.endsWith("Props") || name.endsWith("Context")) continue;
      if (SKIP_EXPORTS.has(name)) continue;
      if (componentNames.has(name)) continue;

      const decl = exp.getDeclarations()?.[0];
      if (!decl) continue;

      const type = checker.getTypeAtLocation(decl);
      let description = getJsDoc(checker, exp);

      // If no JSDoc on the component export, try the {Name}Props type
      if (!description) {
        const propsExport = exports.find((e) => e.getName() === `${name}Props`);
        if (propsExport) {
          description = getJsDoc(checker, propsExport);
        }
      }

      // Also try to find JSDoc from the component's own .d.ts file
      if (!description) {
        const componentDts = path.join(DIST_DIR, name, `${name}.d.ts`);
        if (fs.existsSync(componentDts)) {
          const sf = program.getSourceFile(componentDts);
          if (sf) {
            ts.forEachChild(sf, (node) => {
              if (description) return;
              const sym = (node as { name?: ts.Identifier }).name
                ? checker.getSymbolAtLocation((node as { name: ts.Identifier }).name)
                : undefined;
              if (sym) {
                const doc = getJsDoc(checker, sym);
                if (doc && doc.length > 10) description = doc;
              }
            });
          }
        }
      }

      // Fall back to curated descriptions from primer.style docs
      if (!description) {
        description = COMPONENT_DESCRIPTIONS[name] ?? "";
      }

      // Check if it's a component (has call signatures or is a forwarded ref)
      const callSigs = type.getCallSignatures();
      const isForwardRef = checker.typeToString(type).includes("ForwardRef") ||
        checker.typeToString(type).includes("FC") ||
        checker.typeToString(type).includes("ExoticComponent") ||
        callSigs.length > 0;

      if (!isForwardRef && !type.getProperties().some(p => p.getName() === "$$typeof")) continue;

      componentNames.add(name);

      // Extract props from the first call signature's parameter
      let props: PropInfo[] = [];
      if (callSigs.length > 0) {
        const params = callSigs[0].getParameters();
        if (params.length > 0) {
          const paramDecl = params[0].getDeclarations()?.[0];
          if (paramDecl) {
            const paramType = checker.getTypeOfSymbolAtLocation(params[0], paramDecl);
            props = extractProps(checker, paramType);
          }
        }
      }

      // Find sub-components (ActionList.Item, etc.)
      const subComponents: string[] = [];
      for (const prop of type.getProperties()) {
        const subName = prop.getName();
        if (!/^[A-Z]/.test(subName) || subName === name) continue;

        const subDecl = prop.getDeclarations()?.[0];
        if (!subDecl) continue;
        const subType = checker.getTypeOfSymbolAtLocation(prop, subDecl);
        const subCallSigs = subType.getCallSignatures();
        const isSubComponent = checker.typeToString(subType).includes("ForwardRef") ||
          checker.typeToString(subType).includes("FC") ||
          subCallSigs.length > 0;

        if (isSubComponent) {
          subComponents.push(subName);
          componentNames.add(`${name}.${subName}`);
        }
      }

      components.push({
        name,
        description: description || "",
        props,
        subComponents,
      });
    }
  }

  // Build the output
  const meta = {
    version: JSON.parse(fs.readFileSync("node_modules/@primer/react/package.json", "utf-8")).version,
    generatedAt: new Date().toISOString(),
    components: components.sort((a, b) => a.name.localeCompare(b.name)),
    allNames: [...componentNames].sort(),
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(meta, null, 2) + "\n");
  console.log(`Generated ${components.length} components (${componentNames.size} total with sub-components) → ${OUTPUT}`);
}

main();
