import type { LoadedTable, ColumnInfo } from '../engine/types';

export const debugLog: string[] = [];

function log(...args: unknown[]) {
  debugLog.push(args.map(a =>
    typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
  ).join(' '));
}

export interface DiscoveredDatasource {
  name: string;
  tables: { id: string; caption: string }[];
  fieldCount: number;
  datasource: TableauDataSource;
}

export async function discoverDatasources(): Promise<DiscoveredDatasource[]> {
  debugLog.length = 0;
  const ext = window.tableau?.extensions;
  if (!ext) {
    log('No extensions API');
    return [];
  }

  try {
    log('ext keys:', Object.keys(ext));
    log('has workspaceContent:', !!ext.workspaceContent);
    log('has dashboardContent:', !!(ext as any).dashboardContent);

    const workbook = ext.workspaceContent?.workbook;
    log('workbook:', !!workbook);

    if (workbook) {
      const proto = Object.getOwnPropertyNames(Object.getPrototypeOf(workbook));
      log('workbook proto:', proto);
      log('activeSheet:', workbook.activeSheet?.name, workbook.activeSheet?.sheetType);
      log('has getAllDataSourcesAsync:', typeof workbook.getAllDataSourcesAsync);
      log('has sheets:', !!(workbook as any).sheets);

      if ((workbook as any).sheets) {
        const sheets = (workbook as any).sheets;
        log('sheets count:', sheets.length);
        for (const s of sheets) {
          log('  sheet:', s.name, s.sheetType, 'has getDataSourcesAsync:', typeof s.getDataSourcesAsync);
        }
      }

      if (workbook.getAllDataSourcesAsync) {
        const sources: TableauDataSource[] = await workbook.getAllDataSourcesAsync();
        log('getAllDataSourcesAsync returned:', sources.length);
        const result: DiscoveredDatasource[] = [];
        for (const ds of sources) {
          log('  ds:', ds.name, 'fields:', ds.fields.length);
          const tables = await ds.getLogicalTablesAsync();
          result.push({
            name: ds.name,
            tables: tables.map(t => ({ id: t.id, caption: t.caption })),
            fieldCount: ds.fields.length,
            datasource: ds,
          });
        }
        if (result.length > 0) return result;
      }

      // Try via activeSheet
      const sheet = workbook.activeSheet;
      if (sheet?.getDataSourcesAsync) {
        log('trying activeSheet.getDataSourcesAsync');
        const sources = await (sheet as any).getDataSourcesAsync();
        log('activeSheet datasources:', sources.length);
        const result: DiscoveredDatasource[] = [];
        for (const ds of sources) {
          const tables = await ds.getLogicalTablesAsync();
          result.push({
            name: ds.name,
            tables: tables.map(t => ({ id: t.id, caption: t.caption })),
            fieldCount: ds.fields.length,
            datasource: ds,
          });
        }
        if (result.length > 0) return result;
      }

      // Try iterating workbook.sheets
      if ((workbook as any).sheets) {
        log('trying workbook.sheets iteration');
        const seen = new Set<string>();
        const result: DiscoveredDatasource[] = [];
        for (const ws of (workbook as any).sheets) {
          if (typeof ws.getDataSourcesAsync !== 'function') continue;
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
        if (result.length > 0) return result;
      }
    }

    // Try dashboardContent fallback
    const dashContent = (ext as any).dashboardContent;
    if (dashContent?.dashboard?.worksheets) {
      log('trying dashboardContent fallback');
      const seen = new Set<string>();
      const result: DiscoveredDatasource[] = [];
      for (const ws of dashContent.dashboard.worksheets) {
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

    log('no datasources found through any path');
  } catch (e) {
    log('ERROR:', String(e));
  }

  return [];
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
