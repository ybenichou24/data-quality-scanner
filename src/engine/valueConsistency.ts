import type { LoadedTable, CheckResult, Finding, FailingRecord } from './types';
import { levenshtein } from './levenshtein';

const MAX_DISTINCT = 50;
const MAX_DISTANCE = 2;

export async function checkValueConsistency(table: LoadedTable): Promise<CheckResult> {
  const findings: Finding[] = [];

  for (let c = 0; c < table.columns.length; c++) {
    const col = table.columns[c];

    const valueCounts = new Map<string, number>();
    for (let r = 0; r < table.rows.length; r++) {
      const val = table.rows[r][c];
      if (val === null || val === undefined || val === '') continue;
      const s = String(val);
      valueCounts.set(s, (valueCounts.get(s) ?? 0) + 1);
    }

    if (valueCounts.size === 0 || valueCounts.size > MAX_DISTINCT) continue;

    const allString = [...valueCounts.keys()].every(v => isNaN(Number(v)));
    if (!allString) continue;

    const values = [...valueCounts.entries()].sort((a, b) => b[1] - a[1]);
    const suspicious: { typo: string; likely: string; distance: number }[] = [];

    for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < values.length; j++) {
        const [valA, countA] = values[i];
        const [valB, countB] = values[j];
        const dist = levenshtein(valA.toLowerCase(), valB.toLowerCase());
        if (dist > 0 && dist <= MAX_DISTANCE) {
          const [typo, likely, typoCount, likelyCount] =
            countA >= countB ? [valB, valA, countB, countA] : [valA, valB, countA, countB];
          // Only flag if the typo is much rarer than the correct value —
          // two values with similar frequency are both legitimate
          if (typoCount < likelyCount * 0.1) {
            suspicious.push({ typo, likely, distance: dist });
          }
        }
      }
    }

    if (suspicious.length === 0) continue;

    for (const { typo, likely, distance } of suspicious) {
      const failing: FailingRecord[] = [];
      for (let r = 0; r < table.rows.length; r++) {
        if (String(table.rows[r][c]) === typo) {
          failing.push({
            rowIndex: r + 1,
            values: rowToRecord(table, r),
            reason: `${col.name}: "${typo}" looks like "${likely}" (edit distance: ${distance})`,
          });
        }
      }
      findings.push({
        description: `${col.name}: "${typo}" → likely "${likely}" (distance: ${distance})`,
        failingRecords: failing,
      });
    }
  }

  return {
    name: 'Value Consistency',
    status: findings.length === 0 ? 'pass' : 'fail',
    summary: findings.length === 0
      ? 'No suspicious near-duplicate values found'
      : `${findings.length} potential typo${findings.length > 1 ? 's' : ''} found`,
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
