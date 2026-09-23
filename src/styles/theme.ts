export function initTheme(): void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = (dark: boolean) => {
    document.documentElement.classList.toggle('dark', dark);
  };
  apply(mq.matches);
  mq.addEventListener('change', e => apply(e.matches));
}
