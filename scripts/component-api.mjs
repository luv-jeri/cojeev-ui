import ts from "typescript";
import path from "node:path";

// Read the same types TypeScript checks, including CVA's inferred variant axes.
// Native DOM props remain available but are documented as a group.
export function componentAPIs(ids) {
  const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ".");
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();
  const registryRoot = path.resolve("registry/sahajiv");
  function localSources(source, visited = new Set()) {
    if (visited.has(source)) return visited;
    visited.add(source);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
      const specifier = statement.moduleSpecifier;
      if (!specifier || !ts.isStringLiteral(specifier) || !specifier.text.startsWith(".")) continue;
      const resolved = ts.resolveModuleName(specifier.text, source.fileName, parsed.options, ts.sys).resolvedModule;
      if (!resolved) continue;
      const relative = path.relative(registryRoot, path.resolve(resolved.resolvedFileName));
      if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) continue;
      const imported = program.getSourceFile(resolved.resolvedFileName);
      if (imported) localSources(imported, visited);
    }
    return visited;
  }
  function authoredProperties(node, sources, visiting = new Set()) {
    if (visiting.has(node)) return [];
    visiting.add(node);
    const type = checker.getTypeAtLocation(node);
    // Let the checker retain mapped-type optionality, omitted keys, CVA axes,
    // and intersection overrides. Package/DOM declarations stay grouped.
    if (!(type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown))) {
      return type.getProperties().filter(symbol => symbol.declarations?.some(declaration => sources.has(declaration.getSourceFile())));
    }
    // A missing import or cyclic alias can collapse an intersection to any.
    // Preserve independently readable authored members without chasing a cycle.
    let parts = [];
    if (ts.isTypeAliasDeclaration(node)) parts = [node.type];
    else if (ts.isIntersectionTypeNode(node)) parts = node.types;
    else if (ts.isParenthesizedTypeNode(node)) parts = [node.type];
    else if (ts.isTypeReferenceNode(node)) {
      let symbol = checker.getSymbolAtLocation(node.typeName);
      if (symbol?.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
      parts = symbol?.declarations?.filter(declaration => sources.has(declaration.getSourceFile()) && (ts.isTypeAliasDeclaration(declaration) || ts.isInterfaceDeclaration(declaration))) ?? [];
    }
    return [...new Map(parts.flatMap(part => authoredProperties(part, sources, visiting)).map(symbol => [symbol.name, symbol])).values()];
  }
  const displayType = (symbol, declaration) => {
    // Keep authored aliases readable instead of expanding package internals.
    const authored = symbol.declarations?.find(node => node.type);
    const value = authored?.type?.getText() ?? checker.typeToString(
      checker.getTypeOfSymbolAtLocation(symbol, declaration), declaration, ts.TypeFormatFlags.NoTruncation,
    );
    return value.replace(/import\("([^"]+)"\)/g, (_, specifier) => {
      const normalized = specifier.replaceAll("\\", "/");
      const modules = normalized.lastIndexOf("/node_modules/");
      if (modules !== -1) return `import(${JSON.stringify(normalized.slice(modules + 14).replace(/\/dist\/index$/, ""))})`;
      const component = normalized.match(/\/registry\/sahajiv\/ui\/([^/]+?)(?:\.tsx)?$/);
      if (component) return `import("@/components/ui/${component[1]}")`;
      if (normalized.startsWith("/") || /^[A-Z]:\//i.test(normalized)) throw new Error(`Nonportable API type in ${declaration.name.text}`);
      return `import(${JSON.stringify(normalized)})`;
    });
  };
  return Object.fromEntries(ids.map(id => {
    const source = program.getSourceFile(`registry/sahajiv/ui/${id}.tsx`);
    if (!source) throw new Error(`Missing component source: ${id}`);
    const sources = localSources(source);
    const props = source.statements.filter(node => (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) && node.name.text.endsWith("Props"));
    return [id, props.map(declaration => ({
      name: declaration.name.text,
      props: authoredProperties(declaration, sources)
        .map(symbol => ({
          name: symbol.name,
          type: displayType(symbol, declaration),
          required: !(symbol.flags & ts.SymbolFlags.Optional),
          description: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
        })),
    }))];
  }));
}
