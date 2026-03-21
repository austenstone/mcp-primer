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
      const description = getJsDoc(checker, exp);

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
