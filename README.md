## Disclaimer — read before using

AInnotation is an unofficial, unsupported code sample published for educational and illustrative purposes only.

- It is **not** an official Tableau or Salesforce product, and is not affiliated with, endorsed by, sponsored by, or supported by Tableau Software, LLC or Salesforce, Inc. "Tableau" and related marks are the property of their respective owners.
- It is provided **"AS IS"**, without warranty of any kind, express or implied, and is not intended for production use. See the LICENSE (Apache-2.0) for the full warranty disclaimer and limitation of liability.
- It is an example for learning how a Tableau Workspace Extension can analyze worksheet data and apply annotations. It may rely on behavior that is undocumented or subject to change, and it may stop working without notice.
- **No support is offered.** There is no SLA, no maintenance commitment, and no guarantee of correctness, security, or fitness for any purpose. Use it, and any ideas drawn from it, entirely at your own risk.

---

# Data Quality Scanner — Workspace Extension

A Tableau Desktop **Workspace Extension** that scans your connected datasource
for quality issues and shows you exactly which rows have problems. Click the
toolbar button, pick which checks to run, hit Scan — results appear in seconds
with pass/fail scores, explanations, and failing records.

8 automatic checks inspired by [AWS Deequ](https://github.com/awslabs/deequ),
reimplemented in TypeScript. No configuration needed — every check auto-detects
which columns to run on.

Built with Vite + React 18 + TypeScript. Client-side only — no companion
server, no API keys, no external dependencies beyond React.

**Workspace Extensions** are currently under development and are available for
testing in a pre-release build of Tableau Desktop.

---

## The 8 Checks

| Check | What it catches |
|-------|----------------|
| **Completeness** | Null or empty values in any column |
| **Duplicates** | Identical rows across all columns |
| **Type Consistency** | Mixed types in a column (e.g., `"five"` in a numeric column) |
| **Outliers** | Statistical outliers using the IQR method (below Q1−1.5×IQR or above Q3+1.5×IQR) |
| **Value Consistency** | Likely typos in categorical columns via Levenshtein edit distance (e.g., `"Lincolm"` → `"Lincoln"`) |
| **Pattern Conformity** | Values that break the dominant format in a column (e.g., `MM/DD/YYYY` mixed into `YYYY-MM-DD`) |
| **Negative Values** | Unexpected negatives in columns that are >95% non-negative |
| **Unique Key** | Duplicate values in ID/key columns (auto-detected by column name) |

Every check returns the failing records with row numbers, values, and
explanations — so you can find and fix the exact rows.

---

## Quick Start

```bash
npm install
npm run dev          # dev server on http://localhost:8780
npm test             # vitest
npm run typecheck    # tsc --noEmit
npm run build        # tsc -b && vite build
```

Run without Tableau: `npm run dev` and open http://localhost:8780 in a browser.
With no Tableau host the extension starts in **Preview** mode with two demo
datasets (pre-test with planted issues, post-test clean). Analysis and the full
results UI are exercised.

---

## Dev-Loading into Tableau Desktop

Workspace Extensions require a feature flag:

```bash
# Copy the manifest to the Extensions folder
cp extensions/dqs-local.trex \
   "$HOME/Documents/My Tableau Repository/Extensions/"

# Launch Tableau Desktop with workspace extensions enabled
open -na "/Applications/Tableau Desktop.app" \
  --args -DInDesktopWorkspaceExtensions=true
```

1. Connect to a data source (e.g., one of the CSVs in `demo/`)
2. Drag at least one field onto a worksheet
3. Click the **Data Quality Scanner** toolbar button
4. The extension auto-detects the connected datasource
5. Select which checks to run, hit **Start Scan**

---

## Demo Data

Two CSV files in `demo/` for testing. Theme: parent satisfaction survey about
local schools (10,000 rows, 15 columns each).

| File | Result |
|------|--------|
| `survey_pre_test.csv` | 5 checks pass, 3 fail (2 nulls, 2 typos, 2 mixed-type values) |
| `survey_post_test.csv` | All 8 checks pass (clean data) |

Regenerate with: `npm run generate-demo`

---

## How It Works

1. **Detect** — the extension discovers datasources connected to the active
   worksheet via the Extensions API (`getDataSourcesAsync`).

2. **Load** — reads the full underlying data through `getLogicalTableDataReaderAsync`,
   paginated in 10K-row chunks. This reads the datasource itself, not the
   filtered/aggregated viz. Up to ~1M rows.

3. **Scan** — runs selected checks in parallel (`Promise.all`). Each check is a
   pure TypeScript function that takes a table and returns pass/fail with
   failing records. Results render incrementally as each check completes.

4. **Log** — every scan generates a CSV run log with timestamps, check results,
   and failing rows. Download via the **Download Run Log** button. Connect the
   CSV as a Tableau data source to track quality over time.

---

## Architecture

Three-layer separation following the
[AInnotation](https://github.com/mmmnorthmark/ainnotation) pattern:

```
src/
  engine/        Pure TypeScript — zero Tableau dependency
    checks.ts       Check registry (all 8)
    completeness.ts, duplicates.ts, typeConsistency.ts,
    outliers.ts, valueConsistency.ts, patternConformity.ts,
    negativeValues.ts, uniqueKey.ts
    levenshtein.ts  Edit distance for typo detection
    runLog.ts       CSV run log generation
    types.ts        Shared types

  tableau/       Tableau API glue — only layer touching window.tableau
    extensions.ts   Init + preview mode detection
    datasource.ts   Datasource discovery + paged data loading

  components/    React UI
    ScanScreen.tsx     Check selection + scan button
    ResultsScreen.tsx  Score bar + check result cards
    CheckCard.tsx      Expandable pass/fail card
    RecordsTable.tsx   Sortable failing records table

  preview/       Sample data for browser-only development
  styles/        Tableau design tokens (light/dark)
```

The `engine/` layer is fully unit-testable with no host dependency. The
`tableau/` layer is a thin adapter. The `components/` layer is pure React.

See `architecture-diagram.html` for a visual overview.

---

## Run Log

Every scan generates a flat CSV with one row per failing record:

| Column | Example |
|--------|---------|
| `run_timestamp` | `2026-09-22T14:30:05Z` |
| `datasource` | `survey_pre_test` |
| `check_name` | `Completeness` |
| `check_status` | `fail` |
| `check_summary` | `2 columns have null values` |
| `finding` | `parent_name — 1 nulls (0.2%)` |
| `failing_row_index` | `42` |
| `failing_reason` | `parent_name is null/empty` |

Connect it as a Tableau data source to build a quality-over-time dashboard.

---

## Files

| Path | What |
|------|------|
| `src/engine/` | Pure check engine — 8 checks, Levenshtein, run log, types |
| `src/tableau/` | Extensions API bootstrap, datasource discovery, data loading |
| `src/components/` | Scan screen, results dashboard, check cards, records table |
| `src/preview/` | Sample datasets for browser preview mode |
| `src/styles/` | Design-token theme (light/dark) |
| `public/vendor/` | Vendored `tableau.extensions.1.latest.js` |
| `extensions/` | `.trex` manifest for dev-loading |
| `demo/` | Pre-test + post-test CSVs, demo script, survey dashboard |
| `scripts/` | Demo data generator (seeded, deterministic) |
| `architecture-diagram.html` | Visual architecture overview |
