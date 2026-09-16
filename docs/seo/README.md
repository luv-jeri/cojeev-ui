# 000h search baseline evidence

This directory holds the SEO-01 evidence pack captured on 17 September 2026. It distinguishes public HTTP availability, discovery signals, account submission, crawling, indexing, ranking, browser events, registry requests, and verified consumer installation. A positive result in one category is not evidence for another.

- [Baseline and acceptance ledger](baseline-2026-09-17.md)
- [Machine-readable public inventory](public-inventory-2026-09-17.json)
- [Twenty provisional keyword targets](keyword-map.csv)
- [Competitor set](competitor-set.json)
- [Measurement contract](measurement-contract.md)
- [Account and export procedure](account-setup.md)

The public collection was limited to the production origin, its advertised files, eight representative HTML pages, the official shadcn registry directory, and a four-query search sample. It is not a crawl, an index-coverage result, a rank report, or a claim that all source changes are deployed.

## Reproduce the public-set checks

Run this from the repository root at the recorded source base. It uses only the Python standard library, reads the saved inventory, refetches the three public machine-readable resources, and compares their sorted sets to the retained snapshot. A changed live set is a new observation: create a new dated inventory rather than replacing this one.

```sh
rtk proxy python3 - <<'PY'
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen

origin = "https://000h.cojeev.com"
inventory = json.loads(Path("docs/seo/public-inventory-2026-09-17.json").read_text())

def fetch(path):
    response = urlopen(Request(origin + path, headers={"User-Agent": "SEO-01 evidence collection"}), timeout=30)
    return response.status, response.headers.get_content_type(), response.read()

status, content_type, sitemap = fetch("/sitemap.xml")
assert status == 200 and content_type == "application/xml"
sitemap_paths = sorted(value.decode().replace(origin, "", 1) for value in re.findall(rb"<loc>(.*?)</loc>", sitemap))

status, content_type, registry = fetch("/r/registry.json")
assert status == 200 and content_type == "application/json"
registry_names = sorted(item["name"] for item in json.loads(registry)["items"] if item["type"] == "registry:ui")

status, content_type, search = fetch("/docs-search.json")
assert status == 200 and content_type == "application/json"
search_paths = set()
def collect(value):
    if isinstance(value, dict):
        for child in value.values(): collect(child)
    elif isinstance(value, list):
        for child in value: collect(child)
    elif isinstance(value, str) and value.startswith("/docs/") and value.endswith("/"):
        search_paths.add(value)
collect(json.loads(search))

saved = inventory["public_set_collections"]
assert sitemap_paths == saved["sitemap"]["paths"]
assert registry_names == saved["registry"]["ui_names"]
assert sorted(search_paths) == saved["docs_search"]["paths"]
folded = {"data-table": "/docs/table/", "aspect-ratio": "/docs/bento-grid/"}
assert set(search_paths) == {f"/docs/{name}/" for name in registry_names if name not in folded}

source = inventory["source_count_definitions"]
guides = json.loads(Path("data/component-guides.json").read_text())
local_registry = json.loads(Path("registry.json").read_text())["items"]
local_ui = [item for item in local_registry if item["type"] == "registry:ui"]
assert len(guides) == source["component_guide_records"]["count"]
assert len(local_ui) == source["registry_ui_records"]["count"]
assert not [item for item in local_ui if item.get("meta", {}).get("source", {}).get("reviewOnly")]
print("PASS", len(sitemap_paths), len(registry_names), len(search_paths), "public paths/names")
PY
```

The linked [research memo](../research/2026-09-16-seo-and-ai-discovery-research.md), [budget review](../research/2026-09-17-seo-budget-and-evidence-review.md), [implementation plan](../superpowers/plans/2026-09-16-seo-and-ai-discovery.md), and [SEO-01 plan](../superpowers/plans/2026-09-17-seo-01-baseline.md) are planning inputs. Their dated counts do not override the observed inventory.
