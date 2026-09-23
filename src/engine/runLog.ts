import type { CheckResult, RunLogEntry } from './types';

export function buildRunLog(
  datasource: string,
  table: string,
  totalRows: number,
  results: CheckResult[],
): RunLogEntry[] {
  const timestamp = new Date().toISOString();
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const total = results.length;
  const scorePct = total > 0 ? Math.round((passed / total) * 100) : 100;

  const entries: RunLogEntry[] = [];

  for (const result of results) {
    if (result.status === 'pass') {
      entries.push({
        run_timestamp: timestamp,
        datasource,
        table,
        total_rows: totalRows,
        total_checks: total,
        passed,
        failed,
        score_pct: scorePct,
        check_name: result.name,
        check_status: 'pass',
        check_summary: result.summary,
        finding: '',
        failing_row_index: '',
        failing_reason: '',
      });
    } else {
      for (const finding of result.findings) {
        if (finding.failingRecords.length === 0) {
          entries.push({
            run_timestamp: timestamp,
            datasource,
            table,
            total_rows: totalRows,
            total_checks: total,
            passed,
            failed,
            score_pct: scorePct,
            check_name: result.name,
            check_status: 'fail',
            check_summary: result.summary,
            finding: finding.description,
            failing_row_index: '',
            failing_reason: '',
          });
        } else {
          for (const rec of finding.failingRecords) {
            entries.push({
              run_timestamp: timestamp,
              datasource,
              table,
              total_rows: totalRows,
              total_checks: total,
              passed,
              failed,
              score_pct: scorePct,
              check_name: result.name,
              check_status: 'fail',
              check_summary: result.summary,
              finding: finding.description,
              failing_row_index: String(rec.rowIndex),
              failing_reason: rec.reason,
            });
          }
        }
      }
    }
  }

  return entries;
}

export function entriesToCsv(entries: RunLogEntry[]): string {
  if (entries.length === 0) return '';
  const headers = Object.keys(entries[0]) as (keyof RunLogEntry)[];
  const lines = [headers.join(',')];
  for (const entry of entries) {
    const row = headers.map(h => {
      const val = String(entry[h]);
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
