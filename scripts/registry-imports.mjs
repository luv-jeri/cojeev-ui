import path from "node:path";

export function sourceImport(file, value) {
  if (value.startsWith(".")) return `@/${path.posix.normalize(path.posix.join(path.posix.dirname(file), value))}`;
  return value;
}

function installedImport(file, value) {
  return sourceImport(file, value)
    .replace("@/registry/cojeev/lib/utils", "@/lib/utils")
    .replace("@/registry/cojeev/motion/", "@/lib/cojeev-motion/")
    .replace("@/registry/cojeev/lib/", "@/lib/cojeev/")
    .replace("@/registry/cojeev/ui/", "@/components/ui/");
}

export function rewriteInstalledImports(file, content) {
  return content.replace(/((?:from\s+|import\s+|import\s*\(\s*)["'])([^"']+)(["'])/g,
    (_match, start, value, end) => `${start}${installedImport(file, value)}${end}`);
}
