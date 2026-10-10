import { initNoiseReveals } from './noiseReveal';

const palette = ['125 151 184', '223 178 85', '82 164 126', '158 175 146', '167 182 176', '42 41 39'];
let audio: HTMLAudioElement | undefined;
let soundOn = false;
let enteredSite = false;
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
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-palette]');
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
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
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

  const gate = document.querySelector<HTMLDialogElement>('#entry-gate');
  if (gate) {
    const enter = (enabled: boolean) => {
      enteredSite = true;
      gate.close();
      document.body.classList.remove('entry-open');
      root.dataset.entered = 'true';
      void setSound(enabled);
    };
    if (!enteredSite) {
      gate.showModal();
      document.body.classList.add('entry-open');
      gate.addEventListener('cancel', event => { event.preventDefault(); enter(false); }, { signal });
      gate.querySelectorAll<HTMLButtonElement>('[data-enter-sound]').forEach(button => {
        button.addEventListener('click', () => enter(button.dataset.enterSound === 'on'), { signal });
      });
    } else {
      root.dataset.entered = 'true';
    }
  }

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && matchMedia('(hover: hover)').matches) {
    initNoiseReveals(signal);
    const hero = document.querySelector<HTMLElement>('.hero-art');
    const logo = hero?.querySelector<SVGSVGElement>('.scattered-logo');
    const glyphs = hero?.querySelectorAll<SVGGElement>('.logo-interaction');
    hero?.addEventListener('pointermove', event => {
      if (!logo) return;
      const box = logo.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width * 1942;
      const y = (event.clientY - box.top) / box.height * 1054;
      glyphs?.forEach(glyph => {
        const bounds = glyph.getBBox();
        const dx = x - bounds.x - bounds.width / 2;
        const dy = y - bounds.y - bounds.height / 2;
        const attraction = Math.min(1, 20 / Math.max(Math.hypot(dx, dy), .001));
        glyph.style.transform = `translate(${dx * attraction}px, ${dy * attraction}px)`;
      });
    }, { signal });
    hero?.addEventListener('pointerleave', () => {
      glyphs?.forEach(glyph => glyph.style.transform = 'translate(0, 0)');
    }, { signal });
    document.querySelectorAll<HTMLElement>('.featured-entry').forEach(entry => {
      entry.addEventListener('pointermove', event => {
        const box = entry.getBoundingClientRect();
        entry.style.setProperty('--preview-x', `${(event.clientX - box.left) / box.width * 100}%`);
        entry.style.setProperty('--preview-y', `${(event.clientY - box.top) / box.height * 100}%`);
      }, { signal });
    });
    const pointer = document.querySelector<HTMLElement>('.reference-pointer');
    const label = pointer?.querySelector('[data-pointer-label]');
    document.addEventListener('pointermove', event => {
      if (!pointer) return;
      pointer.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      const target = event.target instanceof Element ? event.target.closest('a, button') : null;
      const featured = target?.matches('.featured-entry, .archive-entry, .home-profile, .contact-marquee');
      pointer.classList.add('is-visible');
      pointer.classList.toggle('is-large', Boolean(featured));
      if (label) label.textContent = target?.matches('.contact-marquee') ? 'Contact' : 'View';
    }, { signal });
    document.addEventListener('pointerleave', () => pointer?.classList.remove('is-visible'), { signal });
  }
}
