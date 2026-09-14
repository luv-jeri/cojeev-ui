# Strict TypeScript integration

Cojeev UI is copied into the consuming application, so the consumer's TypeScript
configuration type-checks the installed source. The library's checked baseline is
TypeScript 5.9.3, React 19.2.8 and `@types/react` 19.2.18 (the versions resolved
by this repository's lockfile). The package ranges are TypeScript `^5.9.2` and
React / React types `^19.2.0`.

The upstream application uses `strict: true`, `moduleResolution: "bundler"` and
`jsx: "react-jsx"`; it also uses `skipLibCheck: true`. Keep your application's
own TypeScript settings as its source of truth. In particular, copied components
are not a reason to loosen application strictness.

## Declaration boundary

Public helpers that cross the copied-source boundary name their stable return
types explicitly: `InputWrapper` returns `React.ReactElement`, and
`useGalleryRef` returns `React.RefCallback<T>`. The latter preserves React 19
callback-ref cleanup: a forwarded callback may return a cleanup function, and
the merged callback returns it unchanged after assigning the host ref.

The repository checks this with a small declaration-emitting composite project:

```sh
fnm exec --using v22.22.0 -- node scripts/verify-declaration-consumer.mjs
```

It copies the real transitive registry source required by those helpers into a
temporary consumer, uses the repository's installed dependencies, and emits
declarations. It does not use handwritten declaration stubs or a separately
maintained type model.

## Stricter consumer flags

`exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` are useful
application decisions, but this repository has not verified them across every
copied registry file. Keep them separate from your application configuration
until the copied components you install have been checked under those flags.

One way to make that boundary explicit is a declaration-only composite project
for the copied component directory:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "emitDeclarationOnly": true,
    "outDir": "./.types/cojeev"
  },
  "include": [
    "src/components/ui/**/*.ts",
    "src/components/ui/**/*.tsx",
    "src/lib/cojeev/**/*.ts",
    "src/lib/cojeev/**/*.tsx",
    "src/lib/cojeev-motion/**/*.ts",
    "src/lib/cojeev-motion/**/*.tsx"
  ]
}
```

Run that project independently with `tsc --project tsconfig.cojeev.json`. If
you choose either stricter flag, add it to this composite project first and fix
the diagnostics for the copied files you actually own. Only then carry the
setting into the application-wide configuration. This keeps a library-source
compatibility investigation separate from unrelated application diagnostics.
