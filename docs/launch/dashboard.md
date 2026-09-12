# Launch dashboard definitions

Create these panels in the connected analytics project after the public token and region are supplied. These are definitions for the real dashboard, not populated reports. Default to the last seven days, compare with the previous seven, and display the underlying sample size.

| Panel | Measure | Breakdown |
| --- | --- | --- |
| Website traffic | Count of `page_viewed` | `route`, then approved UTM source/campaign |
| Components seen | Count of `component_impression` | `component_id` and `placement` |
| Components explored | Count of `demo_interacted` | `component_id`, `placement`, `interaction_kind` |
| Treatments selected | Count of `variant_selected` | `component_id`, `variant_id`, `variant_value` |
| Commands copied | Count of `install_command_copied` | `component_id` where present; keep general guide commands separate |
| Source taken | Count of `source_copied` | `component_id` |
| Handoff guides taken | Count of `guide_copied` | `component_id` |
| Copy problems | Count of `copy_failed` | `copy_kind`, `route`, `component_id` where present |
| Outgoing interest | Count of `outbound_clicked` | `destination_category` |

For observed exposure-to-copy progression, use `component_impression` followed by either `install_command_copied` or `source_copied`, hold `component_id` constant, and use a 30-minute window. The anonymous ID lives only in the current document; this measures a limited browser journey, not an identified person or a return visit. Exclude copies without a component ID from that funnel. Do not divide raw interaction counts by impressions and label the result a conversion rate: one preview can receive many interactions.

Compare exposure alongside copies. A heavily featured component can collect more copies simply because more visitors see it. Variant choices show exploration, not an explicit favorite. The site does not collect likes or downstream application use.

Keep two other panels separate from website capture:

- **Registry file delivery:** use the sample-weighted request query in [registry measurement](registry-measurement.md). Separate item, foundation, index, probe and error traffic.
- **Repository activity:** use the private GitHub traffic snapshot for daily views and clones. Preserve GitHub's daily unique counts as daily counts; do not sum them into monthly unique people. Stars and forks are snapshots of repository totals.

Privacy preferences, blocked requests, bots, repeat requests and caching affect coverage. Installed components have no analytics code. Use the observed events to decide what to improve and feature next; they cannot tell how many production applications use a copied component.

## Campaign labels

Use short campaign tokens such as a stable source, channel, launch period and featured component. Only `utm_source`, `utm_medium`, `utm_campaign` and `utm_content` are accepted. Keep names, email addresses and other personal details out of link parameters. Add campaign links to approved outreach drafts after the final domain is available.
