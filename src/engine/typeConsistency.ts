import type { LoadedTable, CheckResult, Finding, FailingRecord } from './types';

type InferredType = 'number' | 'boolean' | 'date' | 'string';

function inferType(val: string | number | boolean | null): InferredType | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'boolean') return 'boolean';
  if (typeof val === 'number') return 'number';
  const s = String(val);
  if (s === 'true' || s === 'false') return 'boolean';
  if (!isNaN(Number(s)) && s.trim() !== '') return 'number';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return 'date';
  return 'string';
}

export async function checkTypeConsistency(table: LoadedTable): Promise<CheckResult> {
  const findings: Finding[] = [];

  for (let c = 0; c < table.columns.length; c++) {
    const col = table.columns[c];
    const typeCounts = new Map<InferredType, number>();
    const typeRows = new Map<InferredType, number[]>();

    for (let r = 0; r < table.rows.length; r++) {
      const val = table.rows[r][c];
      const t = inferType(val);
      if (t === null) continue;
      typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
      const rows = typeRows.get(t);
      if (rows) {
        rows.push(r);
      } else {
        typeRows.set(t, [r]);
      }
    }

    if (typeCounts.size <= 1) continue;

    let dominantType: InferredType = 'string';
    let dominantCount = 0;
    let totalTyped = 0;
    for (const [t, count] of typeCounts) {
      totalTyped += count;
      if (count > dominantCount) {
        dominantCount = count;
        dominantType = t;
      }
    }

    // Only flag if the minority type is < 5% of total —
    // otherwise it's likely intentional (e.g., grade_level: "K","1","2"..."12")
    const minorityTotal = totalTyped - dominantCount;
    if (minorityTotal / totalTyped >= 0.05) continue;

    const failing: FailingRecord[] = [];
    for (const [t, rows] of typeRows) {
      if (t === dominantType) continue;
      for (const r of rows) {
        failing.push({
          rowIndex: r + 1,
          values: rowToRecord(table, r),
          reason: `${col.name} is "${table.rows[r][c]}" (${t}), expected ${dominantType}`,
        });
      }
    }

    const minorityCount = failing.length;
    findings.push({
      description: `${col.name} — ${minorityCount} values are not ${dominantType} (${typeCounts.size} types detected)`,
      failingRecords: failing,
    });
  }

  return {
    name: 'Type Consistency',
    status: findings.length === 0 ? 'pass' : 'fail',
    summary: findings.length === 0
      ? 'All columns have consistent types'
      : `${findings.length} column${findings.length > 1 ? 's' : ''} have mixed types`,
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
