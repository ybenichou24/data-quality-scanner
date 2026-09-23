import type { LoadedTable, CheckResult, Finding, FailingRecord } from './types';

export async function checkDuplicates(table: LoadedTable): Promise<CheckResult> {
  const seen = new Map<string, number[]>();

  for (let r = 0; r < table.rows.length; r++) {
    const key = JSON.stringify(table.rows[r]);
    const indices = seen.get(key);
    if (indices) {
      indices.push(r);
    } else {
      seen.set(key, [r]);
    }
  }

  const findings: Finding[] = [];
  let totalDuplicates = 0;

  for (const [, indices] of seen) {
    if (indices.length > 1) {
      totalDuplicates += indices.length - 1;
      const records: FailingRecord[] = indices.map(r => ({
        rowIndex: r + 1,
        values: rowToRecord(table, r),
        reason: `Duplicate row (appears ${indices.length} times)`,
      }));
      findings.push({
        description: `${indices.length} identical rows (first at row ${indices[0] + 1})`,
        failingRecords: records,
      });
    }
  }

  return {
    name: 'Duplicates',
    status: totalDuplicates === 0 ? 'pass' : 'fail',
    summary: totalDuplicates === 0
      ? '0 duplicate rows found'
      : `${totalDuplicates} duplicate rows found in ${findings.length} groups`,
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
