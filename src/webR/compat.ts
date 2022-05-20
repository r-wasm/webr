export const IN_NODE =
  typeof process !== 'undefined' &&
  process.release &&
  process.release.name === 'node' &&
  typeof process.browser === 'undefined';

export async function loadScript(src: string) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
