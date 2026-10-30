# Review queue

Human-review surface for the agentic backend (spec: "Agentic round one", Stream C).
Agents write one JSON file per record; humans review the diff in a PR and edit the
`status` field to promote or reject. **Nothing enters `src/data/` without a human
status edit in one of these PRs.**

No server, no scheduler logic, no secrets — this directory is plain files in git.
A PR per batch run is the review unit; a scheduled GitHub Action (dry-run by default)
or a manual script run creates them.

## Directory layout

```
review-queue/
  spot-proposals/   YYYY-MM-DD/<slug>.json — one proposed spot per file (discovery scout)
  freshness/        YYYY-MM-DD/<slug>.json — exceptions found by the freshness auditor
  outreach/         YYYY-MM-DD/<slug>.json — contact enrichment + drafted pitches (never sent)
```

Batch-run directories are named `YYYY-MM-DD` (UTC date of the run) so runs sort
chronologically and one run = one review PR. Every record file carries its own
evidence block; the run summary (`summary.json`, written by the shared batch
utilities in `scripts/queue/batch-io.ts`) lists what the run produced.

## Record shapes

### Spot proposal (`spot-proposals/YYYY-MM-DD/<slug>.json`)

```json
{
  "proposedSpot": {
    "name": "Perly's Cafe",
    "googlePlaceId": "ChIJ…",
    "address": "12 Example Street, London",
    "lat": 51.4815,
    "lng": -0.0583,
    "category": "cafe",
    "rationale": "High local rating, inside the neighborhood polygon, category under-represented here"
  },
  "evidence": {
    "ratingCount": 412,
    "rating": 4.7,
    "insideNeighborhood": "1",
    "checkedAt": "2026-11-02T08:00:00Z",
    "placesStatus": "OK"
  },
  "status": "proposed"
}
```

`insideNeighborhood` must be a real neighborhood id from `src/data/neighborhoods/`
(London ids are numeric, New York ids are `ny-N`). `category` must be one of the
app's spot categories (`cafe | restaurant | bar | park | market | museum | shop | landmark | other`).
`placesStatus` is the verbatim Google Places response status for the check that
produced this record — only `OK` is promotable.

Status lifecycle: `proposed | approved | rejected` — a human edits `status` in the
queue PR. `scripts/promote-spot.ts` appends records marked `approved` (with a
`googlePlaceId` and `placesStatus: "OK"`) into `src/data/curatedSpots/`; it refuses
everything else in code.

### Outreach prep (`outreach/YYYY-MM-DD/<slug>.json`)

Written by `npm run outreach:prep` (`bun scripts/outreach-prep.ts`). For each
target spot — the curated datasets plus approved scout proposals — the script
enriches contact details via Place Details (phone, website) and drafts a pitch
inviting the business to host a small event or offer a local-resident perk.

```json
{
  "spotId": "perlys-cafe",
  "contact": {
    "phone": "+44…",
    "website": "https://…",
    "emailFound": null
  },
  "draftPitch": "Subject: Host a supper club in …",
  "enrichedAt": "2026-11-02T08:05:00Z",
  "status": "draft",
  "flag": "missing-contact"
}
```

Outreach is **prep only**: drafts live here, a human sends them by hand.
Status lifecycle: `draft | ready | sent-manually`. There is deliberately no code
path anywhere in this repo that sends anything — the fixture test
(`npm run test:outreach`) greps for email/sending dependencies to keep it that
way, and `contact.emailFound` is always `null` (round one never searches for,
guesses, or stores email addresses).

`flag` marks why a contact block is incomplete — it exists so the record stays
honest instead of guessing:

- `no-place-id` — the source data has no Google placeId, so no enrichment was
  attempted
- `enrichment-failed` — the Place Details call failed or returned a non-OK
  status (recorded verbatim in the run summary notes)
- `missing-contact` — Places responded OK but listed no phone and no website

Complete contact blocks carry no flag. The flags are set in code
(`scripts/queue/outreach-core.ts`); nothing is inferred or fabricated.

Usage:

```bash
GOOGLE_MAPS_API_KEY=... npm run outreach:prep -- --limit=50   # real run
npm run outreach:prep -- --dry-run                            # print, write nothing
npm run outreach:prep -- --fixtures --out=/tmp/queue          # offline, bundled responses
npm run test:outreach                                          # fixture test + no-send grep
```

Real runs need a Places-enabled key (billing restored — see the audit doc).
A run whose first lookup returns `REQUEST_DENIED`/`OVER_QUERY_LIMIT` aborts
with nothing written, so a billing outage never fills the queue with flagged
records. `--fixtures` refuses to write into the real `review-queue/` — fixture
records describe businesses that do not exist.

### Freshness exceptions (`freshness/YYYY-MM-DD/<slug>.json`)

Written by `scripts/freshness-auditor.ts`; one file per exception, named
`<subjectId>-<kind>.json`. Kinds mirror the audit taxonomy in
CURATED_DATA_AUDIT.md plus stale events:

| kind | Meaning |
|---|---|
| `spot-closed` | Places reports `CLOSED_PERMANENTLY` (or `CLOSED_TEMPORARILY`) for a confident name match |
| `spot-name-drift` | Listing at the curated location now has a materially different name |
| `spot-address-drift` | Confident name match but > 250 m from the curated coordinates |
| `spot-not-found` | No listing (or no plausible name match) near the curated location |
| `spot-uncertain` | Ambiguous match — reviewer judgment needed |
| `event-stale` | Event past `verifiedAt` + 90 days, or a dated event whose schedule has passed |

```json
{
  "kind": "spot-closed",
  "subject": { "type": "spot", "id": "curated-2-2", "neighborhoodId": "2", "name": "The Dairy" },
  "detail": "Places reports business_status CLOSED_PERMANENTLY for a confident name match.",
  "evidence": {
    "checkedAt": "2026-11-02T08:00:00Z",
    "placesStatus": "OK",
    "businessStatus": "CLOSED_PERMANENTLY",
    "placesName": "The Dairy",
    "placesAddress": "15 The Pavement, London",
    "nameSimilarity": 1.0,
    "distanceMeters": 12
  },
  "status": "open"
}
```

Status lifecycle: `open | resolved | dismissed` — a human edits `status` in the
queue PR. API-level failures (`REQUEST_DENIED`, quota errors) are never queued:
they are `spot-unverifiable` run notes, because an API problem is not evidence
about a spot.

Run it:

```bash
bun scripts/freshness-auditor.ts                       # dry run: events-only audit, no network
bun scripts/freshness-auditor.ts --fixtures=path.json  # dry run against canned Places responses
bun scripts/freshness-auditor.ts --live                # real Places calls (billing + key required)
```

## Promotion path

```bash
npm run promote:spot            # promotes all approved spot-proposals
npm run promote:spot -- --dry-run
```

The script prints one line per record — promoted, or refused with the reason —
and exits non-zero if anything was refused. Every promoted entry carries a
provenance comment naming the queue record it came from.

Shared batch-script utilities (file-per-record writing, run-date directories,
run summaries) live in `scripts/queue/batch-io.ts`; record schemas and runtime
validators in `scripts/queue/records.ts`. The scout, auditor, and outreach-prep
agents all import from there so every run produces identical queue structure.
