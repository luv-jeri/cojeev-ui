# Registry request measurement

Prepared for a future root-domain deployment; not connected to the current GitHub Pages host. No account, dataset, route or paid service has been provisioned by this change.

`workers/registry-host` serves the exported website through Cloudflare Static Assets. Its `/r/*` rule invokes the Worker before assets are served, including repeat/cache-hit requests. Ordinary pages use asset delivery directly. This follows [Cloudflare's Worker-first routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/).

Every GET to a flat, valid registry filename produces a separate record: component ID, item/index/foundation category, probe/unclassified label, response outcome and numeric status. HEAD and non-registry paths do not count. A JSON HTTP 200 is successful delivery; an HTML fallback is an error. Query strings, raw IP addresses, referring URLs and user-agent strings are not included in the measurement dataset. Operational hosting logs are separate.

**These are file requests, never successful installs or unique people.** Dependencies, repeats, bots and CLI caching affect the count. A caller can self-label a probe with `x-cojeev-probe: 1`; this is not trusted identity or bot detection.

## Connect after the domain is known

1. Confirm the chosen Cloudflare account, current Analytics Engine availability/costs, and dataset access. The configuration describes resources; deployment can create the dataset.
2. Build a separate root-domain artifact with `COJEEV_BASE_PATH=""`. Set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_REGISTRY_URL`, and `COJEEV_REGISTRY_URL` to the actual HTTPS launch origin. Include the public PostHog token and region if analytics is ready. Keep the current Pages subpath deployment as a separate compatibility artifact.
3. Run `npm run registry-host:test`, generate binding types, and dry-run the host package. Publish only the root-domain artifact and attach the selected domain after reviewing it. Do not deploy a `/cojeev-ui/` build as a root website.
4. Request an item twice, an index, a foundation item, a HEAD, and a missing filename. Check HTTP behavior and actual dataset rows. Local unit tests do not prove production ingestion.
5. Run the launch-readiness check and a real fresh-project shadcn install on the final origin before promoting it.

## Dashboard query

Analytics Engine can sample stored rows. Use the sample interval to estimate request totals; never label `COUNT(*)` as exact request volume. See [Cloudflare's sampling documentation](https://developers.cloudflare.com/analytics/analytics-engine/sampling/).

```sql
SELECT blob1 AS component,
       SUM(_sample_interval) AS estimated_registry_requests
FROM cojeev_registry_requests
WHERE timestamp >= NOW() - INTERVAL '7' DAY
  AND blob2 = 'item'
  AND blob3 = 'unclassified'
  AND blob4 = 'success'
GROUP BY component
ORDER BY estimated_registry_requests DESC
```

Create separate panels for `blob2 = 'foundation'`, `blob2 = 'index'`, `blob3 = 'probe'`, and `blob4 = 'error'`. Do not combine this dataset with browser identities or infer downstream usage from it. The error panel also catches invalid filenames served by the host; it is not solely an installation-failure rate.
