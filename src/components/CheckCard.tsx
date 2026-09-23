import { useState } from 'react';
import type { CheckResult } from '../engine/types';
import { RecordsTable } from './RecordsTable';

interface Props {
  result: CheckResult;
}

export function CheckCard({ result }: Props) {
  const isFail = result.status === 'fail';
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      borderLeft: `4px solid ${isFail ? 'var(--fail-border)' : 'var(--pass-border)'}`,
      background: isFail ? 'var(--fail-bg)' : 'var(--pass-bg)',
      borderRadius: 'var(--radius)',
      marginBottom: 8,
      overflow: 'hidden',
    }}>
      <div
        style={{
          padding: '10px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>
            {isFail ? '✗' : '✓'}
          </span>
          <span style={{ fontWeight: 600 }}>{result.name}</span>
          <span style={{
            color: isFail ? 'var(--fail-text)' : 'var(--pass-text)',
            fontWeight: 600,
            fontSize: 'var(--font-size-sm)',
          }}>
            {isFail ? 'FAILED' : 'PASSED'}
          </span>
        </div>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {expanded && (
        <div style={{ padding: '0 12px 12px' }}>
          <div style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
            {result.summary}
          </div>
          {result.findings.map((finding, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{
                fontWeight: 500,
                fontSize: 'var(--font-size-sm)',
                marginBottom: 4,
              }}>
                {finding.description}
              </div>
              <RecordsTable records={finding.failingRecords} />
            </div>
          ))}
          {result.findings.length === 0 && result.status === 'pass' && (
            <div style={{ color: 'var(--pass-text)', fontSize: 'var(--font-size-sm)' }}>
              No issues found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
