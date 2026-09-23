import type { LoadedTable, ColumnInfo } from '../engine/types';

export interface DiscoveredDatasource {
  name: string;
  tables: { id: string; caption: string }[];
  fieldCount: number;
  datasource: TableauDataSource;
}

export async function discoverDatasources(): Promise<DiscoveredDatasource[]> {
  const ext = window.tableau?.extensions;
  if (!ext) return [];

  const workbook = ext.workspaceContent.workbook;
  const sheet = workbook.activeSheet;

  const worksheets: TableauWorksheet[] = [];
  if (sheet.sheetType === 'dashboard' && sheet.worksheets) {
    worksheets.push(...sheet.worksheets);
  } else if (sheet.getDataSourcesAsync) {
    worksheets.push(sheet as unknown as TableauWorksheet);
  }

  const seen = new Set<string>();
  const result: DiscoveredDatasource[] = [];

  for (const ws of worksheets) {
    const sources = await ws.getDataSourcesAsync();
    for (const ds of sources) {
      if (seen.has(ds.id)) continue;
      seen.add(ds.id);
      const tables = await ds.getLogicalTablesAsync();
      result.push({
        name: ds.name,
        tables: tables.map(t => ({ id: t.id, caption: t.caption })),
        fieldCount: ds.fields.length,
        datasource: ds,
      });
    }
  }

  return result;
}

export async function loadTable(
  ds: TableauDataSource,
  tableId: string,
  tableName: string,
): Promise<LoadedTable> {
  const reader = await ds.getLogicalTableDataReaderAsync(tableId, 10000);
  try {
    const allRows: (string | number | boolean | null)[][] = [];
    let columns: ColumnInfo[] = [];

    for (let p = 0; p < reader.pageCount; p++) {
      const page = await reader.getPageAsync(p);
      if (p === 0) {
        columns = page.columns.map(col => ({
          name: col.fieldName,
          dataType: col.dataType,
          role: 'dimension',
        }));
      }
      for (const row of page.data) {
        allRows.push(row.map(cell => cell.value));
      }
    }

    return {
      datasourceName: ds.name,
      tableName,
      columns,
      rows: allRows,
    };
  } finally {
    await reader.releaseAsync();
  }
}
