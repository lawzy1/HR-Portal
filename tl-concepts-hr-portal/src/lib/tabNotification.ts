// Lark-style "new message" tab alert: flashes the document title and badges
// the favicon with a red dot until the user focuses the tab. No new
// dependency — canvas + the Page Visibility/focus events already exist.
const ORIGINAL_TITLE = typeof document !== 'undefined' ? document.title : '';
const FLASH_TITLE = '🔴 Có thông báo mới!';
const FLASH_INTERVAL_MS = 1000;

let flashTimer: ReturnType<typeof setInterval> | null = null;
let badgedFaviconUrl: string | null = null;
let originalFaviconHref: string | null = null;

function getFaviconLink(): HTMLLinkElement | null {
  return document.querySelector<HTMLLinkElement>("link[rel~='icon']");
}

async function getBadgedFaviconUrl(): Promise<string | null> {
  if (badgedFaviconUrl) return badgedFaviconUrl;
  const link = getFaviconLink();
  if (!link) return null;
  originalFaviconHref ??= link.href;

  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(image, 0, 0, size, size);
      ctx.beginPath();
      ctx.arc(size - 12, 12, 11, 0, Math.PI * 2);
      ctx.fillStyle = '#e11d48';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      badgedFaviconUrl = canvas.toDataURL('image/png');
      resolve(badgedFaviconUrl);
    };
    image.onerror = () => resolve(null);
    image.src = originalFaviconHref!;
  });
}

export function startTabAlert() {
  if (typeof document === 'undefined' || document.hasFocus()) return;
  if (flashTimer) return;

  void getBadgedFaviconUrl().then((url) => {
    const link = getFaviconLink();
    if (url && link) link.href = url;
  });

  let showingFlash = false;
  flashTimer = setInterval(() => {
    showingFlash = !showingFlash;
    document.title = showingFlash ? FLASH_TITLE : ORIGINAL_TITLE;
  }, FLASH_INTERVAL_MS);
}

export function stopTabAlert() {
  if (flashTimer) {
    clearInterval(flashTimer);
    flashTimer = null;
  }
  document.title = ORIGINAL_TITLE;
  const link = getFaviconLink();
  if (link && originalFaviconHref) link.href = originalFaviconHref;
}
