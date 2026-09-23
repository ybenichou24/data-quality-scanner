import { useState } from 'react';
import type { LoadedTable } from './engine/types';
import { ScanScreen } from './components/ScanScreen';
import { ResultsScreen } from './components/ResultsScreen';

type Screen =
  | { kind: 'scan' }
  | { kind: 'results'; table: LoadedTable; enabledChecks: string[] };

export function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'scan' });

  const handleScanStart = (table: LoadedTable, enabledChecks: string[]) => {
    setScreen({ kind: 'results', table, enabledChecks });
  };

  const handleBack = () => {
    setScreen({ kind: 'scan' });
  };

  switch (screen.kind) {
    case 'scan':
      return <ScanScreen onScanStart={handleScanStart} />;
    case 'results':
      return (
        <ResultsScreen
          table={screen.table}
          enabledChecks={screen.enabledChecks}
          onBack={handleBack}
        />
      );
  }
}
