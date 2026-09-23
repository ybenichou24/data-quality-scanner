export interface ColumnInfo {
  name: string;
  dataType: string;
  role: string;
}

export interface LoadedTable {
  datasourceName: string;
  tableName: string;
  columns: ColumnInfo[];
  rows: (string | number | boolean | null)[][];
}

export interface CheckResult {
  name: string;
  status: 'pass' | 'fail';
  summary: string;
  findings: Finding[];
}

export interface Finding {
  description: string;
  failingRecords: FailingRecord[];
}

export interface FailingRecord {
  rowIndex: number;
  values: Record<string, string | number | boolean | null>;
  reason: string;
}

export interface RunLogEntry {
  run_timestamp: string;
  datasource: string;
  table: string;
  total_rows: number;
  total_checks: number;
  passed: number;
  failed: number;
  score_pct: number;
  check_name: string;
  check_status: string;
  check_summary: string;
  finding: string;
  failing_row_index: string;
  failing_reason: string;
}

export type CheckFn = (table: LoadedTable) => Promise<CheckResult>;

export interface CheckDefinition {
  name: string;
  description: string;
  run: CheckFn;
}
