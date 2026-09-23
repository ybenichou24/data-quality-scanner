import { useState, useEffect, useCallback } from 'react';
import type { LoadedTable } from '../engine/types';
import type { DiscoveredDatasource } from '../tableau/datasource';
import { ALL_CHECKS } from '../engine/checks';
import { getMode } from '../tableau/extensions';
import { discoverDatasources, loadTable } from '../tableau/datasource';
import { PREVIEW_DATASETS } from '../preview/sampleData';

interface Props {
  onScanStart: (table: LoadedTable, enabledChecks: string[]) => void;
}

export function ScanScreen({ onScanStart }: Props) {
  const [datasources, setDatasources] = useState<DiscoveredDatasource[]>([]);
  const [selectedDs, setSelectedDs] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [enabledChecks, setEnabledChecks] = useState<Set<string>>(
    new Set(ALL_CHECKS.map(c => c.name)),
  );
  const [loading, setLoading] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [detecting, setDetecting] = useState(false);

  const refreshDatasources = useCallback(async () => {
    if (getMode() === 'preview') return;
    setDetecting(true);
    const ds = await discoverDatasources();
    setDatasources(ds);
    if (ds.length > 0) {
      setSelectedDs(ds[0].name);
      if (ds[0].tables.length > 0) {
        setSelectedTable(ds[0].tables[0].id);
      }
    }
    setDetecting(false);
  }, []);

  useEffect(() => {
    refreshDatasources();

    // Re-discover when the active sheet changes
    if (getMode() !== 'preview') {
      try {
        const wb = window.tableau?.extensions?.workspaceContent;
        if (wb) {
          wb.addEventListener('active-sheet-changed', refreshDatasources);
        }
      } catch (_) { /* event may not be supported */ }
    }
  }, [refreshDatasources]);

  const isPreview = getMode() === 'preview';
  const currentDs = datasources.find(d => d.name === selectedDs);
  const previewTable = isPreview ? PREVIEW_DATASETS[previewIdx].generate() : null;

  const toggleCheck = (name: string) => {
    setEnabledChecks(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleScan = async () => {
    setLoading(true);
    try {
      let table: LoadedTable;
      if (isPreview && previewTable) {
        table = previewTable;
      } else if (currentDs) {
        const tableInfo = currentDs.tables.find(t => t.id === selectedTable);
        table = await loadTable(
          currentDs.datasource,
          selectedTable,
          tableInfo?.caption ?? selectedTable,
        );
      } else {
        return;
      }
      onScanStart(table, [...enabledChecks]);
    } finally {
      setLoading(false);
    }
  };

  const rowCount = previewTable?.rows.length ?? 0;
  const fieldCount = isPreview
    ? previewTable?.columns.length ?? 0
    : currentDs?.fieldCount ?? 0;

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 4 }}>
        Data Quality Scanner
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
        Scan your datasource for quality issues.
      </p>

      {isPreview ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '8px 12px',
            borderRadius: 'var(--radius)',
            marginBottom: 12,
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-secondary)',
          }}>
            Preview Mode — select a demo dataset below
          </div>

          <div style={{
            display: 'flex',
            gap: 8,
            marginBottom: 12,
          }}>
            {PREVIEW_DATASETS.map((ds, i) => (
              <button
                key={ds.name}
                onClick={() => setPreviewIdx(i)}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  borderRadius: 'var(--radius)',
                  border: previewIdx === i
                    ? '2px solid var(--accent-blue)'
                    : '1px solid var(--border-color)',
                  background: previewIdx === i ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                  fontWeight: previewIdx === i ? 600 : 400,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                {ds.name}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>
            {rowCount} rows, {fieldCount} fields
          </div>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-secondary)',
          padding: 12,
          borderRadius: 'var(--radius)',
          marginBottom: 16,
        }}>
          {currentDs ? (
            <>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {currentDs.name}
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                {fieldCount} fields{currentDs.tables.length > 0 ? ` · ${currentDs.tables[0].caption}` : ''}
              </div>
            </>
          ) : (
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 8 }}>
                {detecting
                  ? 'Detecting datasource...'
                  : 'No datasource detected. Drag a field onto a worksheet, then click Detect.'}
              </div>
              <button
                className="btn-secondary"
                onClick={refreshDatasources}
                disabled={detecting}
                style={{ fontSize: 'var(--font-size-sm)', padding: '6px 12px' }}
              >
                {detecting ? 'Detecting...' : 'Detect Datasource'}
              </button>
            </div>
          )}
        </div>
      )}

      <label style={labelStyle}>Select checks to run:</label>
      <div style={{
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius)',
        marginBottom: 16,
        overflow: 'hidden',
      }}>
        {ALL_CHECKS.map(check => (
          <label
            key={check.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderBottom: '1px solid var(--border-color)',
              cursor: 'pointer',
              background: enabledChecks.has(check.name) ? 'var(--bg-primary)' : 'var(--bg-secondary)',
            }}
          >
            <input
              type="checkbox"
              checked={enabledChecks.has(check.name)}
              onChange={() => toggleCheck(check.name)}
              style={{ accentColor: 'var(--accent-blue)' }}
            />
            <span style={{ fontWeight: 500 }}>{check.name}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
              — {check.description}
            </span>
          </label>
        ))}
      </div>

      <button
        className="btn-primary"
        onClick={handleScan}
        disabled={loading || enabledChecks.size === 0 || (!isPreview && !currentDs)}
      >
        {loading ? 'Scanning...' : 'Start Scan'}
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  marginBottom: 4,
  fontSize: 'var(--font-size-sm)',
};

