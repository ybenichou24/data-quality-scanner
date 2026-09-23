export type AppMode = 'desktop' | 'preview';

let mode: AppMode = 'preview';

export async function initTableau(): Promise<AppMode> {
  if (!window.tableau?.extensions) {
    console.log('No Tableau host — running in preview mode');
    return 'preview';
  }
  try {
    await window.tableau.extensions.initializeAsync();
    mode = 'desktop';
    console.log('Tableau Extensions API initialized');
  } catch (e) {
    console.warn('Failed to initialize Tableau:', e);
  }
  return mode;
}

export function getMode(): AppMode {
  return mode;
}
