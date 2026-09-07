import ts from "typescript";

// Read the same types TypeScript checks, including CVA's inferred variant axes.
// Native DOM props remain available but are documented as a group.
export function componentAPIs(ids) {
  const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ".");
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();
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
    const props = source.statements.filter(node => ts.isTypeAliasDeclaration(node) && node.name.text.endsWith("Props"));
    return [id, props.map(declaration => ({
      name: declaration.name.text,
      props: checker.getTypeAtLocation(declaration).getProperties()
        .filter(symbol => symbol.declarations?.some(node => node.getSourceFile() === source))
        .map(symbol => ({
          name: symbol.name,
          type: displayType(symbol, declaration),
          required: !(symbol.flags & ts.SymbolFlags.Optional),
          description: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
        })),
    }))];
  }));
}
