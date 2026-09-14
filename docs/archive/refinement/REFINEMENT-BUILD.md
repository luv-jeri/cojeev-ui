# Production build shutdown refinement

## Result

`npm run build` naturally exited with code **0** after disabling Turbopack's production filesystem cache. Turbopack remains the compiler for development and production. No forced exit, elapsed-time success condition, telemetry preference change, or webpack fallback was added.

The supported setting in `next.config.ts` is:

```ts
experimental: { turbopackFileSystemCacheForBuild: false },
```

This trades reuse of the production compilation cache for reliable shutdown. Development caching remains unchanged.

## Cause established by the diagnosis

With Next **16.3.4** and its default build filesystem cache enabled, multiple builds generated all **97 pages** and printed the route table but remained alive. A printed route table therefore did not prove completion.

Sanitized, per-thread phase instrumentation isolated the pending await:

1. Compilation and page generation completed.
2. Main-thread and worker telemetry flushes resolved.
3. Native Turbopack `project.shutdown()` remained pending.
4. The worker's shutdown wait consequently remained pending, before the compilation-event subscription could be closed and the worker ended.

Installed Next source identifies native project shutdown as the point at which the build waits for filesystem-cache flushing. Its local configuration documentation states that production filesystem caching defaults to `true` from Next 16.3.0 and explicitly supports setting `turbopackFileSystemCacheForBuild` to `false`.

The evidence identifies the cache-enabled native shutdown path as the stall and demonstrates the supported workaround. It does not identify the internal Rust operation responsible for that stall.

## Focused validation

The cache-disabled build began **2026-09-08 at 16:28:52 IST**. It used the normal `npm run build` pipeline, including registry generation.

| Check | Observed result |
| --- | --- |
| Registry generation | 91 items |
| Turbopack compilation | 4.5 seconds |
| TypeScript | 2.4 seconds |
| Static generation | 97/97 pages in 1.368 seconds |
| Native project shutdown | Resolved in 84 milliseconds |
| Compilation-event subscription | Resolved after shutdown |
| Worker shutdown wait | Resolved |
| Full Next build promise | Resolved in 14.340 seconds |
| Process completion | Natural exit code 0 |

Instrumentation preserved original promises, logged only phase timing and sanitized handle information, and neither cancelled work nor forced process completion. Earlier stalled diagnostic runs were explicitly terminated and were never counted as passing builds.

A source timestamp check immediately after this build found no product source modifications after compilation started. Subsequent lifecycle changes require their own final build; this receipt describes the stated snapshot.

## Changed product configuration

Only `next.config.ts` changed for this correction: the documented build-cache opt-out and a short explanatory comment. No package script or dependency change was needed.
