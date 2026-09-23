import type { LoadedTable, CheckResult, Finding, FailingRecord } from './types';

export async function checkCompleteness(table: LoadedTable): Promise<CheckResult> {
  const findings: Finding[] = [];

  for (let c = 0; c < table.columns.length; c++) {
    const col = table.columns[c];
    const failing: FailingRecord[] = [];

    for (let r = 0; r < table.rows.length; r++) {
      const val = table.rows[r][c];
      if (val === null || val === undefined || val === '') {
        failing.push({
          rowIndex: r + 1,
          values: rowToRecord(table, r),
          reason: `${col.name} is null/empty`,
        });
      }
    }

    if (failing.length > 0) {
      const pct = ((failing.length / table.rows.length) * 100).toFixed(1);
      findings.push({
        description: `${col.name} — ${failing.length} nulls (${pct}%)`,
        failingRecords: failing,
      });
    }
  }

  const colCount = findings.length;
  return {
    name: 'Completeness',
    status: colCount === 0 ? 'pass' : 'fail',
    summary: colCount === 0
      ? 'All columns are 100% complete'
      : `${colCount} column${colCount > 1 ? 's' : ''} have null values`,
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
