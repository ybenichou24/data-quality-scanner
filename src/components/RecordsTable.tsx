import { useState } from 'react';
import type { FailingRecord } from '../engine/types';

const PAGE_SIZE = 10;

interface Props {
  records: FailingRecord[];
}

export function RecordsTable({ records }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  if (records.length === 0) return null;

  const columns = Object.keys(records[0].values);
  const visible = expanded ? records : records.slice(0, PAGE_SIZE);

  const sorted = sortCol
    ? [...visible].sort((a, b) => {
        const va = a.values[sortCol] ?? '';
        const vb = b.values[sortCol] ?? '';
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        return sortAsc ? cmp : -cmp;
      })
    : visible;

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{
        fontSize: 'var(--font-size-sm)',
        color: 'var(--text-secondary)',
        marginBottom: 4,
      }}>
        Failing records ({records.length} total):
      </div>
      <div style={{
        overflowX: 'auto',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius)',
        maxHeight: expanded ? 400 : 'auto',
        overflowY: expanded ? 'auto' : 'hidden',
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 'var(--font-size-sm)',
        }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              <th style={thStyle}>Row</th>
              {columns.map(col => (
                <th
                  key={col}
                  style={{ ...thStyle, cursor: 'pointer' }}
                  onClick={() => handleSort(col)}
                >
                  {col} {sortCol === col ? (sortAsc ? '▲' : '▼') : ''}
                </th>
              ))}
              <th style={thStyle}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((rec, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={tdStyle}>{rec.rowIndex}</td>
                {columns.map(col => (
                  <td key={col} style={tdStyle}>
                    {rec.values[col] === null || rec.values[col] === undefined
                      ? <span style={{ color: 'var(--fail-text)', fontStyle: 'italic' }}>(null)</span>
                      : String(rec.values[col])}
                  </td>
                ))}
                <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  {rec.reason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {records.length > PAGE_SIZE && (
        <button
          className="btn-secondary"
          style={{ marginTop: 4, fontSize: 'var(--font-size-sm)', padding: '4px 8px' }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : `Show all ${records.length} records`}
        </button>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  borderBottom: '2px solid var(--border-color)',
};

const tdStyle: React.CSSProperties = {
  padding: '4px 8px',
  whiteSpace: 'nowrap',
  maxWidth: 200,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};
