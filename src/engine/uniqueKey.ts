import type { LoadedTable, CheckResult, Finding, FailingRecord } from './types';

const ID_PATTERNS = /(?:^|_)(id|key|code)(?:$|_)/i;
const DISTINCTNESS_THRESHOLD = 0.95;

export async function checkUniqueKey(table: LoadedTable): Promise<CheckResult> {
  const findings: Finding[] = [];

  for (let c = 0; c < table.columns.length; c++) {
    const col = table.columns[c];

    if (!ID_PATTERNS.test(col.name)) continue;

    const valueCounts = new Map<string, number[]>();
    for (let r = 0; r < table.rows.length; r++) {
      const val = table.rows[r][c];
      if (val === null || val === undefined || val === '') continue;
      const key = String(val);
      const rows = valueCounts.get(key);
      if (rows) {
        rows.push(r);
      } else {
        valueCounts.set(key, [r]);
      }
    }

    const totalNonNull = [...valueCounts.values()].reduce((s, v) => s + v.length, 0);
    if (totalNonNull === 0) continue;

    const distinctness = valueCounts.size / totalNonNull;
    if (distinctness < DISTINCTNESS_THRESHOLD) continue;
    if (distinctness >= 1.0) continue;

    const failing: FailingRecord[] = [];
    for (const [val, rows] of valueCounts) {
      if (rows.length > 1) {
        for (const r of rows) {
          failing.push({
            rowIndex: r + 1,
            values: rowToRecord(table, r),
            reason: `${col.name} = "${val}" appears ${rows.length} times`,
          });
        }
      }
    }

    if (failing.length > 0) {
      const dupKeys = [...valueCounts.values()].filter(v => v.length > 1).length;
      findings.push({
        description: `${col.name} — ${dupKeys} duplicate key values (${failing.length} affected rows)`,
        failingRecords: failing,
      });
    }
  }

  return {
    name: 'Unique Key',
    status: findings.length === 0 ? 'pass' : 'fail',
    summary: findings.length === 0
      ? 'All detected key columns are unique'
      : `${findings.length} key column${findings.length > 1 ? 's' : ''} have duplicates`,
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
