import type { LoadedTable, CheckResult, Finding, FailingRecord } from './types';

export async function checkOutliers(table: LoadedTable): Promise<CheckResult> {
  const findings: Finding[] = [];

  for (let c = 0; c < table.columns.length; c++) {
    const col = table.columns[c];
    const nums: { value: number; rowIndex: number }[] = [];

    for (let r = 0; r < table.rows.length; r++) {
      const val = table.rows[r][c];
      if (val === null || val === undefined || val === '') continue;
      const n = typeof val === 'number' ? val : Number(val);
      if (!isNaN(n) && typeof table.rows[r][c] !== 'boolean') {
        nums.push({ value: n, rowIndex: r });
      }
    }

    if (nums.length < 4) continue;

    const allNumeric = nums.length / table.rows.length > 0.8;
    if (!allNumeric) continue;

    nums.sort((a, b) => a.value - b.value);
    const q1 = percentile(nums.map(n => n.value), 25);
    const q3 = percentile(nums.map(n => n.value), 75);
    const iqr = q3 - q1;

    if (iqr === 0) continue;

    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;

    const failing: FailingRecord[] = [];
    for (const { value, rowIndex } of nums) {
      if (value < lower || value > upper) {
        const direction = value < lower ? 'below' : 'above';
        const bound = value < lower ? lower.toFixed(2) : upper.toFixed(2);
        failing.push({
          rowIndex: rowIndex + 1,
          values: rowToRecord(table, rowIndex),
          reason: `${col.name} = ${value} (${direction} ${direction === 'below' ? 'lower' : 'upper'} bound ${bound})`,
        });
      }
    }

    if (failing.length > 0) {
      findings.push({
        description: `${col.name} — ${failing.length} outliers (range: ${lower.toFixed(2)} to ${upper.toFixed(2)})`,
        failingRecords: failing,
      });
    }
  }

  return {
    name: 'Outliers',
    status: findings.length === 0 ? 'pass' : 'fail',
    summary: findings.length === 0
      ? 'No statistical outliers detected'
      : `${findings.length} column${findings.length > 1 ? 's' : ''} have outliers`,
    findings,
  };
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
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
