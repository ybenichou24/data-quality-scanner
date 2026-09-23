import type { LoadedTable, CheckResult, Finding, FailingRecord } from './types';

interface Pattern {
  name: string;
  regex: RegExp;
}

const PATTERNS: Pattern[] = [
  { name: 'YYYY-MM-DD date', regex: /^\d{4}-\d{2}-\d{2}$/ },
  { name: 'MM/DD/YYYY date', regex: /^\d{2}\/\d{2}\/\d{4}$/ },
  { name: 'ISO datetime', regex: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/ },
  { name: 'email', regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  { name: 'phone', regex: /^[\d\s()+-]{7,20}$/ },
  { name: 'UUID', regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i },
  { name: 'zip code', regex: /^\d{5}(-\d{4})?$/ },
  { name: 'numeric string', regex: /^-?\d+\.?\d*$/ },
];

const CONFORMITY_THRESHOLD = 0.80;

export async function checkPatternConformity(table: LoadedTable): Promise<CheckResult> {
  const findings: Finding[] = [];

  for (let c = 0; c < table.columns.length; c++) {
    const col = table.columns[c];

    const nonNullValues: { value: string; rowIndex: number }[] = [];
    for (let r = 0; r < table.rows.length; r++) {
      const val = table.rows[r][c];
      if (val === null || val === undefined || val === '') continue;
      const s = String(val);
      if (!isNaN(Number(val)) && typeof val === 'number') continue;
      nonNullValues.push({ value: s, rowIndex: r });
    }

    if (nonNullValues.length < 10) continue;

    let bestPattern: Pattern | null = null;
    let bestCount = 0;

    for (const pattern of PATTERNS) {
      let count = 0;
      for (const { value } of nonNullValues) {
        if (pattern.regex.test(value)) count++;
      }
      if (count > bestCount) {
        bestCount = count;
        bestPattern = pattern;
      }
    }

    if (!bestPattern) continue;

    const conformRate = bestCount / nonNullValues.length;
    if (conformRate < CONFORMITY_THRESHOLD || conformRate >= 1.0) continue;

    // Only flag if non-conforming values are < 5% of total —
    // otherwise it's a legitimately mixed column (e.g., grade_level: "K","1"..."12")
    const nonConformCount = nonNullValues.length - bestCount;
    if (nonConformCount / nonNullValues.length >= 0.05) continue;

    const failing: FailingRecord[] = [];
    for (const { value, rowIndex } of nonNullValues) {
      if (!bestPattern.regex.test(value)) {
        failing.push({
          rowIndex: rowIndex + 1,
          values: rowToRecord(table, rowIndex),
          reason: `${col.name}: "${value}" does not match ${bestPattern.name} pattern`,
        });
      }
    }

    if (failing.length > 0) {
      const pct = ((bestCount / nonNullValues.length) * 100).toFixed(1);
      findings.push({
        description: `${col.name} — ${pct}% match ${bestPattern.name}, ${failing.length} do not`,
        failingRecords: failing,
      });
    }
  }

  return {
    name: 'Pattern Conformity',
    status: findings.length === 0 ? 'pass' : 'fail',
    summary: findings.length === 0
      ? 'All columns conform to detected patterns'
      : `${findings.length} column${findings.length > 1 ? 's' : ''} have non-conforming values`,
    findings,
  };
}

function rowToRecord(
  table: LoadedTable,
  rowIndex: number,
): Record<string, string | number | boolean | null> {
  const rec: Record<string, string | number | boolean | null> = {};
  for (let c = 0; c < table.columns.length; c++) {
    rec[table.columns[c].name] = table.rows[rowIndex][c];
  }
  return rec;
}
