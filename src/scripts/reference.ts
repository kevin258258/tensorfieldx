import { initNoiseReveals } from './noiseReveal';
import { initHeroMotion } from './heroMotion';
import { initPointer } from './pointer';

const palette = ['125 151 184', '223 178 85', '82 164 126', '158 175 146', '167 182 176', '42 41 39'];
let audio: HTMLAudioElement | undefined;
let soundOn = false;
let clockTimer: ReturnType<typeof setInterval> | undefined;
let pageController: AbortController | undefined;

function save(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* Browsing without storage still works. */ }
}

function syncSound() {
  document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]').forEach(button => {
    button.setAttribute('aria-pressed', String(soundOn));
    button.setAttribute('aria-label', soundOn ? 'Turn sound off' : 'Turn sound on');
  });
}

async function setSound(enabled: boolean) {
  if (enabled) {
    audio ??= new Audio('/design/kazuki/bgm.mp3');
    audio.loop = true;
    audio.volume = 1;
    try { await audio.play(); soundOn = true; } catch { soundOn = false; }
  } else {
    audio?.pause();
    soundOn = false;
  }
  syncSound();
}

export function initReferenceUi() {
  pageController?.abort();
  pageController = new AbortController();
  const { signal } = pageController;
  const root = document.documentElement;
  const buttons = document.querySelectorAll<HTMLButtonElement>('button[data-palette]');
  buttons.forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.palette === root.dataset.palette));
    button.addEventListener('click', () => {
      const index = Number(button.dataset.palette);
      const color = palette[index];
      if (!color) return;
      root.dataset.palette = String(index);
      root.style.setProperty('--ink', `rgb(${color})`);
      ['primary', 'secondary', 'muted', 'accent', 'border'].forEach(name => root.style.setProperty(`--color-${name}`, color));
      save('palette', String(index));
      document.dispatchEvent(new Event('reference:palette'));
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    }, { signal });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-copy-email]').forEach(button => {
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText('12512619@mail.sustech.edu.cn');
        button.dataset.copyState = 'copied';
        button.textContent = 'Copied';
      } catch {
        button.textContent = 'Select address to copy';
        const address = button.previousElementSibling;
        if (address) {
          const range = document.createRange();
          range.selectNodeContents(address);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
      window.setTimeout(() => { if (button.isConnected) { button.textContent = 'Copy email'; delete button.dataset.copyState; } }, 2000);
    }, { signal });
  });

  if (clockTimer) clearInterval(clockTimer);
  const updateClock = () => {
    const time = document.querySelector<HTMLTimeElement>('[data-local-time]');
    if (!time) return;
    const now = new Date();
    time.textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' }).format(now);
    time.dateTime = now.toISOString();
  };
  updateClock();
  clockTimer = setInterval(updateClock, 30_000);
  syncSound();
  document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]').forEach(button => {
    button.addEventListener('click', () => void setSound(!soundOn), { signal });
  });

  // The introduction is immediately accessible; sound remains an opt-in control.
  root.dataset.entered = 'true';
  initHeroMotion(signal);
  initPointer(signal);

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!reducedMotion.matches && matchMedia('(hover: hover)').matches) {
    initNoiseReveals(signal);
    const hero = document.querySelector<HTMLElement>('.hero-art');
    const logo = hero?.querySelector<SVGSVGElement>('.scattered-logo');
    const glyphs = hero?.querySelectorAll<SVGGElement>('.logo-interaction');
    const captions = hero?.querySelectorAll<HTMLElement>('.hero-caption');
    const resetHero = () => {
      glyphs?.forEach(glyph => glyph.style.transform = 'translate(0, 0)');
      captions?.forEach(caption => caption.style.transform = 'translate(0, 0)');
    };
    hero?.addEventListener('pointermove', event => {
      if (!logo || reducedMotion.matches) return;
      const box = logo.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width * 1942;
      const y = (event.clientY - box.top) / box.height * 1054;
      glyphs?.forEach(glyph => {
        const bounds = glyph.getBBox();
        const dx = x - Number(glyph.dataset.centerX ?? bounds.x + bounds.width / 2);
        const dy = y - Number(glyph.dataset.centerY ?? bounds.y + bounds.height / 2);
        const attraction = Math.min(1, 20 / Math.max(Math.hypot(dx, dy), .001));
        glyph.style.transform = `translate(${dx * attraction}px, ${dy * attraction}px)`;
      });
      const heroBox = hero.getBoundingClientRect();
      captions?.forEach(caption => {
        const dx = event.clientX - heroBox.left - caption.offsetLeft - caption.offsetWidth / 2;
        const dy = event.clientY - heroBox.top - caption.offsetTop - caption.offsetHeight / 2;
        const attraction = Math.min(1, 20 / Math.max(Math.hypot(dx, dy), .001));
        caption.style.transform = `translate(${dx * attraction}px, ${dy * attraction}px)`;
      });
    }, { signal });
    hero?.addEventListener('pointerleave', resetHero, { signal });
    reducedMotion.addEventListener('change', resetHero, { signal });
    signal.addEventListener('abort', resetHero, { once: true });
    document.querySelectorAll<HTMLElement>('.featured-entry').forEach(entry => {
      entry.addEventListener('pointermove', event => {
        const box = entry.getBoundingClientRect();
        entry.style.setProperty('--preview-x', `${(event.clientX - box.left) / box.width * 100}%`);
        entry.style.setProperty('--preview-y', `${(event.clientY - box.top) / box.height * 100}%`);
      }, { signal });
    });
  }
}
