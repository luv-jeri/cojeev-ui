# Optional local font files

The base registry installs two verified WOFF2 faces inline by default. That
default is self-contained and needs no request. Keep the installed OFL notices.

To opt into file-backed fonts, run the installed helper against the active
stylesheet. In a shadcn project using `src/`, registry targets resolve under
that directory:

```sh
node src/scripts/cojeev-materialize-fonts.mjs --css src/styles/cojeev-fonts.css
```

Without a `src/` directory, the same registry target is at `scripts/`:

```sh
node scripts/cojeev-materialize-fonts.mjs --css styles/cojeev-fonts.css
```

It verifies the embedded bytes, writes only its two sibling `fonts/*.woff2`
files, and rewrites only their two `src` URLs. It refuses partial or drifted
state and a normal rerun only verifies the existing files. No endpoint,
dependency, alternate stylesheet, or CSP relaxation is required.

Run the helper after the final `shadcn add` or registry update in that change.
A later component add can deliberately refresh the shared foundation stylesheet
to its default embedded form; rerun the same helper to opt that final installed
copy back into file-backed delivery. The qualification fixture exercises this
sequence and verifies both DM Sans and Bricolage Grotesque under `font-src
'self'` with no external request.
