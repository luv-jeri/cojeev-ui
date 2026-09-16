import { mkdtemp, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const sourceRoot = join(root, "registry", "cojeev");
const workDirectory = join(root, ".work");
await mkdir(workDirectory, { recursive: true });
const fixture = await mkdtemp(join(workDirectory, "declaration-consumer-"));
const source = join(fixture, "src");
const entries = [
  join(sourceRoot, "ui", "input.tsx"),
  join(sourceRoot, "lib", "reference-gallery-motion.ts"),
];
const extensions = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function localImport(from, specifier) {
  const candidate = specifier.startsWith("@/registry/cojeev/")
    ? join(root, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(from), specifier)
      : null;

  return candidate && extensions.map((extension) => `${candidate}${extension}`).find(existsSync);
}

async function copyClosure() {
  const copied = new Set();
  const pending = [...entries];

  while (pending.length) {
    const file = pending.pop();
    if (copied.has(file)) continue;
    copied.add(file);

    const contents = await readFile(file, "utf8");
    const destination = join(source, relative(root, file));
    await mkdir(dirname(destination), { recursive: true });
    await cp(file, destination);

    for (const match of contents.matchAll(/(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g)) {
      const dependency = localImport(file, match[1]);
      if (dependency) pending.push(dependency);
    }
  }

  return copied.size;
}

try {
  const copied = await copyClosure();
  await writeFile(
    join(source, "consumer.tsx"),
    `import * as React from "react";
import { InputWrapper } from "./registry/cojeev/ui/input";
import { useGalleryRef } from "./registry/cojeev/lib/reference-gallery-motion";

export function CompositeConsumer() {
  const host = React.useRef<HTMLElement>(null);
  const forwarded = React.useCallback((node: HTMLElement | null) => {
    if (node) return () => {};
  }, []);
  const ref = useGalleryRef(host, forwarded);
  return <InputWrapper ref={ref} />;
}
`,
  );
  await writeFile(
    join(fixture, "tsconfig.json"),
    `${JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        lib: ["DOM", "DOM.Iterable", "ESNext"],
        module: "ESNext",
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        strict: true,
        skipLibCheck: true,
        declaration: true,
        emitDeclarationOnly: true,
        composite: true,
        rootDir: "./src",
        outDir: "./types",
        baseUrl: ".",
        paths: { "@/*": ["./src/*"] },
      },
      include: ["./src/**/*.ts", "./src/**/*.tsx"],
    }, null, 2)}\n`,
  );

  const result = spawnSync(
    process.execPath,
    [
      join(root, "node_modules", "typescript", "bin", "tsc"),
      "--project",
      join(fixture, "tsconfig.json"),
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  console.log(`Declaration consumer passed: copied ${copied} real registry source files and emitted composite declarations.`);
} finally {
  await rm(fixture, { recursive: true, force: true });
}
