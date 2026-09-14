// Turbopack emits a hashed, basePath-correct URL for an imported font file; the site uses that URL to
// preload the heading face rather than hard-coding a path the export would get wrong under a basePath.
declare module "*.woff2" {
  const src: string;
  export default src;
}
