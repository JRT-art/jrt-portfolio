/* JRT motion layer — intro, inertia scroll, scroll-velocity choreography.
   Loaded before main.js; exposes window.JRTMotion. Transform/opacity/clip-path only. */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const root = document.documentElement;

  /* ------------------------------------------------------------------------
     Text scramble (used on nav, labels, section counter)
     ------------------------------------------------------------------------ */
  const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/<>_+*#';
  const scramble = (el, text, dur = 560) => {
    if (!el) return;
    if (text == null) text = el.dataset.text || (el.dataset.text = el.textContent);
    if (reduced) { el.textContent = text; return; }
    cancelAnimationFrame(el._scr);
    const t0 = performance.now();
    const at = [...text].map((_, i) => (i / text.length) * 0.65 + Math.random() * 0.35);
    const step = now => {
      const p = (now - t0) / dur;
      let out = '';
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        out += (c === ' ' || p >= at[i]) ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) el._scr = requestAnimationFrame(step); else el.textContent = text;
    };
    el._scr = requestAnimationFrame(step);
  };

  /* ------------------------------------------------------------------------
     Intro loader — counts real progress (fonts + hero frames), then wipes
     ------------------------------------------------------------------------ */
  const loader = $('.loader');
  let seen = false;
  try { seen = sessionStorage.getItem('jrt-intro') === '1'; sessionStorage.setItem('jrt-intro', '1'); } catch (_) {}

  const intro = new Promise(resolve => {
    if (!loader) return resolve();
    if (reduced) { loader.remove(); return resolve(); }
    const count = $('[data-loader-count]', loader), arc = $('.loader__arc', loader);
    const assets = ['uh', 'wcb', 'aus', 'x76'].map(id => new Promise(r => {
      const img = new Image(); img.onload = img.onerror = r; img.src = `assets/poster/${id}.jpg`;
    }));
    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    const tasks = [fonts, ...assets];
    let done = 0;
    tasks.forEach(t => t.then(() => { done++; }));
    const minTime = seen ? 350 : 1500, cap = 3500, t0 = performance.now();
    let shown = 0, finished = false;

    const finish = () => {
      if (finished) return; finished = true;
      loader.classList.add('is-done');
      setTimeout(resolve, seen ? 120 : 380);
      setTimeout(() => loader.remove(), 1700);
    };
    const tick = now => {
      const el = now - t0;
      const real = done / tasks.length;
      const target = Math.min(el >= cap ? 1 : real, el / minTime);
      shown += (target - shown) * 0.12;
      if (target >= 1 && shown > 0.995) shown = 1;
      count.textContent = Math.round(shown * 100);
      arc.style.strokeDashoffset = 100 - shown * 100;
      if (shown >= 1) return setTimeout(finish, seen ? 0 : 180);
      requestAnimationFrame(tick);
    };
    if (seen) loader.classList.add('is-fast');
    requestAnimationFrame(tick);
  });

  /* ------------------------------------------------------------------------
     Inertia scroll (desktop pointers; touch keeps native momentum)
     ------------------------------------------------------------------------ */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
    lenis.stop();
    intro.then(() => lenis.start());
  }
  const lock = on => { if (lenis) on ? lenis.stop() : lenis.start(); };

  // Eased anchor navigation
  const easeInOutExpo = t => (t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2);
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || !lenis || a.classList.contains('skip')) return;
    const id = a.getAttribute('href');
    if (id === '#') return;
    const target = id === '#top' ? 0 : document.querySelector(id);
    if (target == null) return;
    e.preventDefault();
    lenis.start();
    lenis.scrollTo(target, { offset: id === '#top' ? 0 : -70, duration: 1.6, easing: easeInOutExpo });
  });

  /* ------------------------------------------------------------------------
     Letter-level text: buttons roll, footer mark rises
     ------------------------------------------------------------------------ */
  $$('.btn > span:first-child').forEach(s => {
    if (s.hasAttribute('data-copy-label')) return;
    const t = s.textContent;
    s.classList.add('roll');
    s.innerHTML = `<span>${t}</span><span aria-hidden="true">${t}</span>`;
  });

  const mark = $('.footer__mark');
  if (mark) {
    const text = mark.textContent.trim();
    mark.innerHTML = [...text].map((c, i) => c === ' ' ? '<span class="sp"> </span>' : `<span class="ch" style="--i:${i}">${c}</span>`).join('');
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { mark.classList.add('in'); o.disconnect(); } }, { threshold: 0.3 }).observe(mark);
  }

  /* ------------------------------------------------------------------------
     Scramble: nav links, footer links, eyebrows as they appear
     ------------------------------------------------------------------------ */
  $$('.nav__links a, .footer__top nav a, .footer__up').forEach(a => {
    a.dataset.text = a.textContent;
    a.addEventListener('mouseenter', () => scramble(a));
  });
  $$('.eyebrow').forEach(eb => {
    const n = [...eb.childNodes].find(x => x.nodeType === 3 && x.textContent.trim());
    if (!n) return;
    const s = document.createElement('span');
    s.className = 'eyebrow__t';
    s.textContent = n.textContent.trim();
    n.replaceWith(s);
  });
  const ebIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    ebIO.unobserve(e.target);
    setTimeout(() => scramble($('.eyebrow__t', e.target), null, 700), 150);
  }), { threshold: 1 });
  intro.then(() => $$('.eyebrow').forEach(eb => $('.eyebrow__t', eb) && ebIO.observe(eb)));

  /* ------------------------------------------------------------------------
     Nav section counter
     ------------------------------------------------------------------------ */
  const secN = $('[data-sec-n]'), secT = $('[data-sec-t]');
  const SECTIONS = [['.hero', '00', 'Intro'], ['#showreel', '01', 'Featured cuts'], ['#work', '02', 'The work'], ['#about', '03', 'About'],
    ['#capabilities', '04', 'Capabilities'], ['.tools', '05', 'Toolkit'], ['#process', '06', 'Process'], ['.words', '07', 'Testimonials'], ['#contact', '08', 'Contact']];
  let curSec = '00';
  const secIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const s = SECTIONS.find(x => e.target.matches(x[0]));
    if (!s || s[1] === curSec) return;
    curSec = s[1];
    scramble(secN, s[1], 300); scramble(secT, s[2], 480);
  }), { rootMargin: '-45% 0px -50% 0px' });
  SECTIONS.forEach(([sel]) => { const el = $(sel); el && secIO.observe(el); });

  /* ------------------------------------------------------------------------
     Card 3D tilt + glare (fine pointers)
     ------------------------------------------------------------------------ */
  if (finePointer && !reduced) {
    document.addEventListener('pointermove', e => {
      const m = e.target.closest && e.target.closest('.card__media');
      if (!m) return;
      const r = m.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      m.style.setProperty('--rx', `${(0.5 - py) * 7}deg`);
      m.style.setProperty('--ry', `${(px - 0.5) * 9}deg`);
      m.style.setProperty('--gx', `${px * 100}%`);
      m.style.setProperty('--gy', `${py * 100}%`);
    }, { passive: true });
    document.addEventListener('pointerout', e => {
      const m = e.target.closest && e.target.closest('.card__media');
      if (!m || m.contains(e.relatedTarget)) return;
      m.style.setProperty('--rx', '0deg'); m.style.setProperty('--ry', '0deg');
    });
  }

  /* ------------------------------------------------------------------------
     Hero: poster trail behind the cursor + soft spotlight
     ------------------------------------------------------------------------ */
  const heroEl = $('.hero');
  if (heroEl && finePointer && !reduced) {
    const trailBox = document.createElement('div');
    trailBox.className = 'hero__trail';
    trailBox.setAttribute('aria-hidden', 'true');
    heroEl.prepend(trailBox);
    const POSTERS = ['x76', 'wcb', 'mfe', 'enz', 'qjs', 'aus', 'uh', 'x74', 'jyn', 'wcl', 'qjd', 'x75'];
    // warm the cache so the first images pop instantly
    intro.then(() => POSTERS.forEach(id => { const im = new Image(); im.src = `assets/poster/${id}.jpg`; }));
    const pool = Array.from({ length: 10 }, () => {
      const im = document.createElement('img'); im.alt = ''; im.decoding = 'async';
      trailBox.appendChild(im); return im;
    });
    let pi = 0, ni = 0, lx = null, ly = null, sx = 0, sy = 0, spotRaf = 0;
    heroEl.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const r = heroEl.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      sx = x; sy = y;
      if (!spotRaf) spotRaf = requestAnimationFrame(() => { spotRaf = 0; heroEl.style.setProperty('--sx', `${sx}px`); heroEl.style.setProperty('--sy', `${sy}px`); });
      // skip the trail over buttons / video chips so they stay readable
      if (e.target.closest('a, button, .chip')) { lx = x; ly = y; return; }
      if (lx == null) { lx = x; ly = y; return; }
      if (Math.hypot(x - lx, y - ly) < 120) return;
      const ang = Math.atan2(y - ly, x - lx);
      lx = x; ly = y;
      const im = pool[pi++ % pool.length];
      im.src = `assets/poster/${POSTERS[ni++ % POSTERS.length]}.jpg`;
      im.style.left = `${x}px`; im.style.top = `${y}px`;
      im.style.zIndex = String(pi);
      const rot = (Math.random() - 0.5) * 16;
      const drift = 40;
      im.getAnimations().forEach(a => a.cancel());
      im.animate([
        { opacity: 0, transform: `translate(-50%,-50%) scale(.35) rotate(${rot}deg)` },
        { opacity: 1, transform: `translate(-50%,-50%) scale(1) rotate(${rot * 0.4}deg)`, offset: 0.18 },
        { opacity: 0, transform: `translate(calc(-50% + ${Math.cos(ang) * drift}px), calc(-50% + ${Math.sin(ang) * drift + 70}px)) scale(.82) rotate(${rot}deg)` },
      ], { duration: 1300, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
    });
    heroEl.addEventListener('pointerleave', () => { lx = ly = null; });
  }

  /* ------------------------------------------------------------------------
     Letter wave: headline letters lift toward the cursor
     ------------------------------------------------------------------------ */
  if (finePointer && !reduced) {
    const waves = [$('.hero__title'), $('.contact__title')].filter(Boolean);
    // go live only after each headline's own entrance has finished
    const heroT = $('.hero__title'), contactT = $('.contact__title');
    if (heroT) intro.then(() => setTimeout(() => heroT.classList.add('is-live'), 2700));
    if (contactT) new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting) return;
      o.disconnect();
      setTimeout(() => contactT.classList.add('is-live'), 1900);
    }, { threshold: 0.3 }).observe(contactT);
    waves.forEach(w => {
      const host = w.closest('section') || w;
      let mx = 0, my = 0, raf = 0, on = false;
      const chars = () => $$('.ch', w);
      const paint = () => {
        raf = 0;
        if (!w.classList.contains('is-live')) return;
        const list = chars();
        const rects = list.map(c => c.getBoundingClientRect()); // read all, then write
        list.forEach((c, i) => {
          if (!on) { c.style.transform = ''; return; }
          const r = rects[i];
          const d = Math.hypot(mx - (r.left + r.width / 2), my - (r.top + r.height / 2));
          const f = Math.max(0, 1 - d / 190);
          c.style.transform = f > 0.01 ? `translate3d(0,${-f * f * 22}px,0) scale(${1 + f * 0.07})` : '';
        });
      };
      host.addEventListener('pointermove', e => { on = true; mx = e.clientX; my = e.clientY; if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
      host.addEventListener('pointerleave', () => { on = false; if (!raf) raf = requestAnimationFrame(paint); });
    });
  }

  /* ------------------------------------------------------------------------
     Scroll-lit text: words brighten as you read down the page
     ------------------------------------------------------------------------ */
  const lit = $$('.about__lead, .quote p').map(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w => `<span class="wd">${w}</span>`).join(' ');
    return { el, words: $$('.wd', el), n: -1 };
  });
  if (reduced) lit.forEach(l => l.words.forEach(w => w.classList.add('is-lit')));

  /* ------------------------------------------------------------------------
     One frame loop: scroll velocity → marquees, skew, hero, reel stage
     ------------------------------------------------------------------------ */
  const bands = $$('.band').map(el => ({ el, track: $('.band__track', el), x: 0, w: 0, dir: +el.dataset.band || 1, vis: false }));
  bands.forEach(b => {
    b.track.innerHTML += b.track.innerHTML; // seamless loop
    new IntersectionObserver(([e]) => { b.vis = e.isIntersecting; }).observe(b.el);
  });
  const measure = () => bands.forEach(b => { b.w = b.track.scrollWidth / 2; });
  measure();
  window.addEventListener('resize', measure);
  document.fonts && document.fonts.ready.then(measure);

  const skewEls = $$('[data-grid], .strip');
  const heroLines = $$('.hero__title .line');
  const heroTitle = $('.hero__title');
  const stage = $('[data-stage]');
  const progress = $('.nav__progress i');

  let vel = 0, sdir = 1, lastY = window.scrollY, skew = 0, lastT = performance.now();
  const frame = now => {
    if (lenis) lenis.raf(now);
    const dt = Math.min(64, now - lastT) / 16.67; lastT = now;
    const y = window.scrollY, vh = window.innerHeight;
    const raw = lenis ? lenis.velocity : (y - lastY);
    lastY = y;
    vel += (raw - vel) * 0.14;
    if (Math.abs(raw) > 0.3) sdir = raw > 0 ? 1 : -1;

    // progress line
    const max = document.documentElement.scrollHeight - vh;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    if (!reduced) {
      // marquees: base drift + scroll velocity, direction follows scroll
      bands.forEach(b => {
        if (!b.vis || !b.w) return;
        b.x -= (0.6 + Math.min(Math.abs(vel), 60) * 0.35) * sdir * b.dir * dt;
        if (b.x <= -b.w) b.x += b.w;
        if (b.x > 0) b.x -= b.w;
        b.track.style.transform = `translate3d(${b.x}px,0,0) skewX(${clamp(-vel * 0.15, -8, 8)}deg)`;
      });

      // velocity skew on galleries (pointer devices with inertia only)
      if (lenis && finePointer) {
        const target = clamp(vel * 0.05, -2.2, 2.2);
        skew += (target - skew) * 0.2;
        if (Math.abs(skew) > 0.005 || Math.abs(target) > 0.005) {
          const s = Math.abs(skew) < 0.01 ? 0 : skew;
          skewEls.forEach(el => { el.style.transform = s ? `skewY(${s}deg)` : ''; });
        }
      }

      // hero: lines drift apart and the title dims as you leave
      if (y < vh * 1.3 && heroTitle) {
        const p = clamp(y / vh, 0, 1);
        heroLines.forEach((l, i) => {
          const d = i % 2 ? 1 : -1;
          l.style.transform = p ? `translate3d(${d * p * window.innerWidth * 0.07}px,0,0)` : '';
        });
        heroTitle.style.opacity = 1 - p * 0.65;
      }

      // scroll-lit words
      lit.forEach(l => {
        const r = l.el.getBoundingClientRect();
        if (r.bottom < -50 || r.top > vh + 50) return;
        const p = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.38), 0, 1);
        const n = Math.round(p * l.words.length);
        if (n === l.n) return;
        l.words.forEach((w, i) => w.classList.toggle('is-lit', i < n));
        l.n = n;
      });

      // reel stage opens like a frame as it enters
      if (stage) {
        const r = stage.getBoundingClientRect();
        if (r.top < vh * 1.2 && r.bottom > -100) {
          const p = easeOut(clamp((vh - r.top) / (vh * 0.8), 0, 1));
          stage.style.transform = `scale(${0.9 + 0.1 * p})`;
          stage.style.clipPath = `inset(${(1 - p) * 8}% ${(1 - p) * 6}% round 28px)`;
          stage.style.opacity = 0.35 + 0.65 * p;
        }
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  window.JRTMotion = { intro, lock, scramble, get lenis() { return lenis; } };
})();
