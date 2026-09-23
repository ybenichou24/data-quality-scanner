interface TableauExtensions {
  initializeAsync(): Promise<void>;
  workspaceContent: {
    workbook: {
      activeSheet: TableauSheet;
      addEventListener(event: string, handler: () => void): void;
    };
    addEventListener(event: string, handler: () => void): void;
  };
  settings: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    saveAsync(): Promise<void>;
  };
}

interface TableauSheet {
  name: string;
  sheetType: string;
  worksheets?: TableauWorksheet[];
  getDataSourcesAsync?(): Promise<TableauDataSource[]>;
  getSummaryDataAsync?(options?: Record<string, unknown>): Promise<TableauDataTable>;
}

interface TableauWorksheet {
  name: string;
  getDataSourcesAsync(): Promise<TableauDataSource[]>;
  getSummaryDataAsync(options?: Record<string, unknown>): Promise<TableauDataTable>;
}

interface TableauDataSource {
  name: string;
  id: string;
  fields: TableauField[];
  isExtract: boolean;
  getLogicalTablesAsync(): Promise<TableauLogicalTable[]>;
  getLogicalTableDataReaderAsync(
    tableId: string,
    pageRowCount?: number,
  ): Promise<TableauDataTableReader>;
}

interface TableauField {
  name: string;
  id: string;
  dataType: string;
  role: string;
  aggregation: string;
  isCalculatedField: boolean;
  isHidden: boolean;
}

interface TableauLogicalTable {
  id: string;
  caption: string;
}

interface TableauDataTableReader {
  pageCount: number;
  totalRowCount: number;
  getPageAsync(page: number): Promise<TableauDataTable>;
  releaseAsync(): Promise<void>;
}

interface TableauDataTable {
  name: string;
  columns: TableauColumn[];
  data: TableauDataValue[][];
  totalRowCount: number;
}

interface TableauColumn {
  fieldName: string;
  dataType: string;
  index: number;
}

interface TableauDataValue {
  value: string | number | boolean | null;
  formattedValue: string;
  nativeValue: unknown;
}

interface Window {
  tableau?: {
    extensions: TableauExtensions;
  };
}
