import type { LoadedTable, CheckResult, Finding, FailingRecord } from './types';

const NON_NEGATIVE_THRESHOLD = 0.95;

export async function checkNegativeValues(table: LoadedTable): Promise<CheckResult> {
  const findings: Finding[] = [];

  for (let c = 0; c < table.columns.length; c++) {
    const col = table.columns[c];
    const nums: { value: number; rowIndex: number }[] = [];

    for (let r = 0; r < table.rows.length; r++) {
      const val = table.rows[r][c];
      if (val === null || val === undefined || val === '') continue;
      const n = typeof val === 'number' ? val : Number(val);
      if (!isNaN(n) && typeof val !== 'boolean') {
        nums.push({ value: n, rowIndex: r });
      }
    }

    if (nums.length < 10) continue;

    const allNumeric = nums.length / table.rows.length > 0.8;
    if (!allNumeric) continue;

    const nonNegCount = nums.filter(n => n.value >= 0).length;
    const nonNegRate = nonNegCount / nums.length;

    if (nonNegRate < NON_NEGATIVE_THRESHOLD) continue;
    if (nonNegRate >= 1.0) continue;

    const failing: FailingRecord[] = [];
    for (const { value, rowIndex } of nums) {
      if (value < 0) {
        failing.push({
          rowIndex: rowIndex + 1,
          values: rowToRecord(table, rowIndex),
          reason: `${col.name} = ${value} (negative in non-negative column)`,
        });
      }
    }

    if (failing.length > 0) {
      findings.push({
        description: `${col.name} — ${failing.length} negative values in a column that's ${(nonNegRate * 100).toFixed(1)}% non-negative`,
        failingRecords: failing,
      });
    }
  }

  return {
    name: 'Negative Values',
    status: findings.length === 0 ? 'pass' : 'fail',
    summary: findings.length === 0
      ? 'No unexpected negative values found'
      : `${findings.length} column${findings.length > 1 ? 's' : ''} have unexpected negatives`,
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
