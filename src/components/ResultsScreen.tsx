import { useState, useEffect, useRef } from 'react';
import type { LoadedTable, CheckResult, RunLogEntry } from '../engine/types';
import { ALL_CHECKS } from '../engine/checks';
import { buildRunLog, entriesToCsv, downloadCsv } from '../engine/runLog';
import { CheckCard } from './CheckCard';

interface Props {
  table: LoadedTable;
  enabledChecks: string[];
  onBack: () => void;
}

export function ResultsScreen({ table, enabledChecks, onBack }: Props) {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [scanning, setScanning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const logRef = useRef<RunLogEntry[]>([]);
  const startTime = useRef(Date.now());

  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    startTime.current = Date.now();
    const timer = setInterval(() => {
      setElapsed(Date.now() - startTime.current);
    }, 100);

    const checks = ALL_CHECKS.filter(c => enabledChecks.includes(c.name));
    const promises = checks.map(check =>
      check.run(table).then(result => {
        setResults(prev => [...prev, result]);
        return result;
      }),
    );

    Promise.all(promises).then(allResults => {
      clearInterval(timer);
      setElapsed(Date.now() - startTime.current);
      setScanning(false);
      logRef.current = buildRunLog(
        table.datasourceName,
        table.tableName,
        table.rows.length,
        allResults,
      );
    });

    return () => clearInterval(timer);
  }, [table, enabledChecks]);

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const total = enabledChecks.length;
  const scorePct = total > 0 ? Math.round((passed / total) * 100) : 0;

  const handleDownloadLog = () => {
    if (logRef.current.length > 0) {
      const csv = entriesToCsv(logRef.current);
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      downloadCsv(csv, `dqs_run_log_${ts}.csv`);
    }
  };

  const handleRescan = () => {
    setResults([]);
    setScanning(true);
    startTime.current = Date.now();

    const checks = ALL_CHECKS.filter(c => enabledChecks.includes(c.name));
    const promises = checks.map(check =>
      check.run(table).then(result => {
        setResults(prev => [...prev, result]);
        return result;
      }),
    );

    Promise.all(promises).then(allResults => {
      setElapsed(Date.now() - startTime.current);
      setScanning(false);
      logRef.current = buildRunLog(
        table.datasourceName,
        table.tableName,
        table.rows.length,
        allResults,
      );
    });
  };

  const failedResults = results.filter(r => r.status === 'fail');
  const passedResults = results.filter(r => r.status === 'pass');

  return (
    <div style={{ padding: 16 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)' }}>Data Quality Scanner</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={onBack}>← Back</button>
          <button className="btn-secondary" onClick={handleRescan} disabled={scanning}>
            Re-scan
          </button>
        </div>
      </div>

      {/* Score Bar */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius)',
        padding: 16,
        marginBottom: 16,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}>
          <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
            SCORE: {passed} / {total} passed
          </span>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
            {scanning ? 'Scanning...' : `Scanned ${table.rows.length.toLocaleString()} rows in ${(elapsed / 1000).toFixed(1)}s`}
          </span>
        </div>

        <div style={{
          height: 8,
          background: 'var(--score-bar-bg)',
          borderRadius: 4,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${scanning ? (results.length / total) * 100 : scorePct}%`,
            background: scorePct === 100
              ? 'var(--pass-border)'
              : scorePct >= 60
                ? 'var(--score-bar-fill)'
                : 'var(--fail-border)',
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }} />
        </div>

        <div style={{
          display: 'flex',
          gap: 16,
          marginTop: 8,
          fontSize: 'var(--font-size-sm)',
          color: 'var(--text-secondary)',
        }}>
          <span>{total} checks</span>
          <span style={{ color: 'var(--pass-text)' }}>{passed} passed</span>
          <span style={{ color: 'var(--fail-text)' }}>{failed} failed</span>
          {scanning && <span>{total - results.length} pending</span>}
        </div>
      </div>

      {/* Download Log Button */}
      {!scanning && (
        <div style={{ marginBottom: 16 }}>
          <button className="btn-secondary" onClick={handleDownloadLog}>
            Download Run Log (CSV)
          </button>
        </div>
      )}

      {/* Pending checks */}
      {scanning && (
        <div style={{
          padding: 12,
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius)',
          marginBottom: 8,
          color: 'var(--text-secondary)',
          fontSize: 'var(--font-size-sm)',
        }}>
          Running checks... ({results.length}/{total} complete)
        </div>
      )}

      {/* Failed checks first */}
      {failedResults.map(r => (
        <CheckCard key={r.name} result={r} />
      ))}

      {/* Then passed */}
      {passedResults.map(r => (
        <CheckCard key={r.name} result={r} />
      ))}
    </div>
  );
}
