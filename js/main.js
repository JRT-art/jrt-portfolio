/* JRT portfolio — vanilla JS, no dependencies.
   Everything animates with transform/opacity, driven by rAF or CSS transitions. */
(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     Project data — every entry is a real video from Justin's portfolio.
     ------------------------------------------------------------------------ */
  const CATS = { ugc: 'AI UGC', anim: 'Cinematic & Animation', vsl: 'VSL', global: 'Global Language' };
  const WORKS = [
    { id: 'x76', title: 'Stop Using Doorbell Cameras', cat: 'ugc', style: 'AI UGC', dur: 167, feature: true,
      desc: 'A creator-style story ad that opens on a warning and turns it into a reason to keep watching.' },
    { id: 'uh',  title: 'Wait, I Have to Ask', cat: 'ugc', style: 'AI UGC', dur: 32 },
    { id: 'mfe', title: 'If You Bought ReHears Because of Me', cat: 'ugc', style: 'AI UGC', dur: 70 },
    { id: 'wcb', title: '30 Years of Internet Installs', cat: 'anim', style: 'Pixar Style', dur: 285, feature: true,
      desc: 'A Pixar-style character carries a full direct-response story — warmth up front, the pitch underneath.' },
    { id: 'x75', title: 'Protect Your Home From Thieves', cat: 'ugc', style: 'AI UGC · Podcast', dur: 69 },
    { id: 'enz', title: 'Hearing Loss', cat: 'anim', style: 'Pixar Style', dur: 62 },
    { id: 'jyn', title: 'The Director’s Chair', cat: 'ugc', style: 'AI UGC', dur: 161 },
    { id: 'wcp', title: 'Passport', cat: 'anim', style: 'AI Cinematic', dur: 19, ar: '3/4' },
    { id: 'qjs', title: 'I Tested 14 Neighbors’ Wiring', cat: 'vsl', style: 'Video Sales Letter', dur: 293, feature: true,
      desc: 'A long-form VSL edit where every line of voiceover gets a picture, paced to hold attention for minutes.' },
    { id: 'wcl', title: 'I Married…', cat: 'anim', style: 'AI Story', dur: 63 },
    { id: 'wcj', title: 'I Stopped Wearing It', cat: 'anim', style: 'AI Story', dur: 40 },
    { id: 'x74', title: 'Camera', cat: 'anim', style: 'AI Cinematic', dur: 64 },
    { id: 'qjx', title: 'Their $29 Device', cat: 'vsl', style: 'Video Sales Letter', dur: 200 },
    { id: 'aus', title: 'Hebrew Market Cut', cat: 'global', style: 'Hebrew', dur: 115, feature: true,
      desc: 'A fully localized cut for Hebrew-speaking audiences — voice, captions and pacing rebuilt for the market.' },
    { id: 'qjv', title: 'Wegovy Weight Regain', cat: 'global', style: 'Danish', dur: 60 },
    { id: 'qjd', title: 'Come to the Gym With Me', cat: 'global', style: 'Danish', dur: 44 },
  ];
  const REEL = ['x76', 'wcb', 'qjs', 'mfe', 'enz', 'aus', 'uh', 'x74', 'jyn'];
  const label = w => w.style === CATS[w.cat] ? w.style : `${CATS[w.cat]} · ${w.style}`;
  const byId = Object.fromEntries(WORKS.map(w => [w.id, w]));

  const src = {
    poster: id => `assets/poster/${id}.jpg`,
    preview: id => `assets/preview/${id}.mp4`,
    full: id => `assets/full/${id}.mp4`,
  };

  /* ------------------------------------------------------------------------
     Environment
     ------------------------------------------------------------------------ */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const mq = q => window.matchMedia(q);
  const reduced = mq('(prefers-reduced-motion: reduce)').matches;
  const finePointer = mq('(hover: hover) and (pointer: fine)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const autoMedia = !reduced && !saveData;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const pad = n => String(n).padStart(2, '0');

  const playVideo = v => {
    if (!v) return;
    if (!v.src && v.dataset.src) v.src = v.dataset.src;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  };

  /* ------------------------------------------------------------------------
     Split headings into masked lines (on <br>)
     ------------------------------------------------------------------------ */
  // wrap every letter (inside words, so lines never break mid-word); skips video chips
  const charify = (node, i = 0) => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const w = document.createElement('span'); w.className = 'w';
          for (const c of part) {
            const s = document.createElement('span');
            s.className = 'ch'; s.style.setProperty('--i', i++); s.textContent = c;
            w.append(s);
          }
          frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.classList.contains('chip')) i = charify(n, i);
    });
    return i;
  };
  $$('.split').forEach(el => {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map(p => `<span class="ln" aria-hidden="true"><span>${p.trim()}</span></span>`).join('');
    let i = 0;
    $$('.ln > span', el).forEach(s => { i = charify(s, i); });
  });
  (() => {
    const t = $('.hero__title');
    if (!t) return;
    t.setAttribute('aria-label', t.textContent.replace(/\s+/g, ' ').trim());
    let i = 0;
    $$('.line > span', t).forEach(s => { s.setAttribute('aria-hidden', 'true'); i = charify(s, i); });
  })();

  /* ------------------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------------------ */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  const observeReveals = root => $$('.reveal, .split', root).forEach(el => revealIO.observe(el));

  /* ------------------------------------------------------------------------
     Hero
     ------------------------------------------------------------------------ */
  const heroVideos = $$('.hero video');
  const track = $('.hero__track');
  if (track) {
    const ids = ['uh', 'x76', 'wcb', 'mfe', 'enz', 'aus', 'qjs', 'x74'];
    const html = ids.map(id => `<img src="${src.poster(id)}" alt="" loading="lazy" width="108" height="192">`).join('');
    track.innerHTML = html + html;
  }
  const start = () => {
    document.documentElement.classList.add('is-loaded');
    observeReveals(document);
    if (autoMedia) {
      const visible = heroVideos.filter(v => v.offsetParent !== null);
      visible.forEach((v, i) => setTimeout(() => playVideo(v), 250 + i * 120));
    }
  };
  const motion = window.JRTMotion || { intro: Promise.resolve(), lock: () => {} };
  const fontsReady = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]) : Promise.resolve();
  let started = false;
  const startOnce = () => { if (!started) { started = true; start(); } };
  Promise.all([fontsReady, motion.intro]).then(() => { requestAnimationFrame(startOnce); setTimeout(startOnce, 120); });

  // Pause hero loops when the hero is off screen
  const hero = $('.hero');
  new IntersectionObserver(([e]) => {
    if (!autoMedia) return;
    heroVideos.filter(v => v.offsetParent !== null).forEach(v => e.isIntersecting ? playVideo(v) : v.pause());
  }).observe(hero);

  /* ------------------------------------------------------------------------
     Navigation: solid on scroll, hide on scroll down, active indicator
     ------------------------------------------------------------------------ */
  const nav = $('[data-nav]');
  const navLinks = $$('.nav__links a');
  const indicator = $('.nav__indicator');
  const moveIndicator = a => {
    if (!indicator) return;
    if (!a) { indicator.style.opacity = 0; return; }
    indicator.style.opacity = 1;
    indicator.style.width = a.offsetWidth + 'px';
    indicator.style.transform = `translate3d(${a.offsetLeft}px,0,0)`;
  };
  let activeLink = null;
  const sectionIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const id = e.target.id === 'showreel' ? 'work' : e.target.id;
      activeLink = navLinks.find(a => a.dataset.link === id) || null;
      navLinks.forEach(a => a.classList.toggle('is-active', a === activeLink));
      moveIndicator(activeLink);
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['showreel', 'work', 'about', 'capabilities', 'process', 'contact'].forEach(id => { const s = document.getElementById(id); if (s) sectionIO.observe(s); });
  // hero: no active link
  new IntersectionObserver(([e]) => { if (e.isIntersecting) { activeLink = null; navLinks.forEach(a => a.classList.remove('is-active')); moveIndicator(null); } },
    { rootMargin: '-45% 0px -50% 0px' }).observe(hero);
  navLinks.forEach(a => {
    a.addEventListener('mouseenter', () => moveIndicator(a));
    a.addEventListener('focus', () => moveIndicator(a));
  });
  $('.nav__links')?.addEventListener('mouseleave', () => moveIndicator(activeLink));

  const toggle = $('.nav__toggle');
  const menu = $('#menu');
  const setMenu = open => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    document.body.classList.toggle('is-locked', open);
    motion.lock(open);
    nav.classList.remove('is-hidden');
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });

  /* ------------------------------------------------------------------------
     JRT cursor
     ------------------------------------------------------------------------ */
  const cursorOn = finePointer && !reduced;
  const cursor = $('.cursor');
  if (cursorOn) {
    document.documentElement.classList.add('has-cursor');
    // big headlines invert under a white lens
    $$('.hero__title, .sec-title, .contact__title, .footer__mark').forEach(el => { if (!el.dataset.cursor) el.dataset.cursor = 'invert'; });

    const ring = $('.cursor__ring', cursor), shape = $('.cursor__shape', cursor), dot = $('.cursor__dot', cursor), label = $('.cursor__label', cursor);
    const lens = $('.cursor-lens');
    const trail = $$('.cursor__trail i', cursor).map(el => ({ el, x: -100, y: -100 }));
    let x = -100, y = -100, px = x, py = y, dx = x, dy = y, sv = 0, ang = 0, raf = 0, idle = 0, mode = '';
    const LABELS = { view: '<b>JRT</b>VIEW ↗', drag: '<b>JRT</b>DRAG ↔', cta: 'JRT', invert: '', '': 'JRT' };

    const tick = () => {
      const vx = x - px, vy = y - py;
      px = x; py = y;
      const v = Math.hypot(vx, vy);
      sv += (v - sv) * 0.3;
      if (v > 0.5) ang = Math.atan2(vy, vx);
      const s = Math.min(sv / 90, 0.32);
      ring.style.transform = `translate3d(${x}px,${y}px,0)`;
      shape.style.transform = `rotate(${ang}rad) scale(${1 + s},${1 - s * 0.55})`;
      if (lens) lens.style.transform = `translate3d(${x}px,${y}px,0) rotate(${ang}rad) scale(${1 + s * 0.6},${1 - s * 0.35})`;
      dx += (x - dx) * 0.28; dy += (y - dy) * 0.28;
      dot.style.transform = `translate3d(${dx}px,${dy}px,0)`;
      // comet trail: each dot chases the one ahead of it
      let lx = x, ly = y, slack = 0;
      trail.forEach((t, i) => {
        t.x += (lx - t.x) * (0.42 - i * 0.035); t.y += (ly - t.y) * (0.42 - i * 0.035);
        t.el.style.transform = `translate3d(${t.x}px,${t.y}px,0)`;
        slack += Math.abs(lx - t.x) + Math.abs(ly - t.y);
        lx = t.x; ly = t.y;
      });
      idle = (v < 0.1 && sv < 0.05 && Math.abs(x - dx) < 0.1 && slack < 0.5) ? idle + 1 : 0;
      raf = idle > 4 ? 0 : requestAnimationFrame(tick);
    };
    const wake = () => { if (!raf) { idle = 0; raf = requestAnimationFrame(tick); } };

    const setMode = (m, custom) => {
      const key = m + (custom || '');
      if (key === mode) return;
      mode = key;
      cursor.classList.toggle('is-view', m === 'view');
      cursor.classList.toggle('is-drag', m === 'drag');
      cursor.classList.toggle('is-cta', m === 'cta');
      cursor.classList.toggle('is-native', m === 'native');
      cursor.classList.toggle('is-invert', m === 'invert');
      if (lens) lens.classList.toggle('is-on', m === 'invert');
      label.innerHTML = m === 'view' && custom ? `<b>JRT</b>${custom}` : (LABELS[m] ?? 'JRT');
    };

    window.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      if (x < -50) { px = dx = e.clientX; py = dy = e.clientY; trail.forEach(t => { t.x = e.clientX; t.y = e.clientY; }); }
      x = e.clientX; y = e.clientY;
      cursor.classList.remove('is-hidden');
      lens && lens.classList.remove('is-hidden');
      wake();
    }, { passive: true });
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('[data-cursor]');
      if (!t) return setMode('');
      setMode(t.dataset.cursor, t.dataset.cursorLabel ? `${t.dataset.cursorLabel} ↗` : '');
    });
    const hide = () => { cursor.classList.add('is-hidden'); lens && lens.classList.add('is-hidden'); };
    document.addEventListener('pointerleave', hide);
    document.documentElement.addEventListener('mouseleave', hide);
    window.addEventListener('pointerdown', e => {
      cursor.classList.add('is-down');
      if (e.pointerType !== 'mouse') return;
      // click ripple
      const r = document.createElement('i');
      r.className = 'cursor__ripple';
      r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
      cursor.appendChild(r);
      r.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: .7 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 }],
        { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' }).onfinish = () => r.remove();
    });
    window.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
  }

  /* ------------------------------------------------------------------------
     Magnetic buttons
     ------------------------------------------------------------------------ */
  if (cursorOn) {
    $$('[data-magnetic]').forEach(el => {
      const arrow = $('.arrow', el);
      let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
      const loop = () => {
        cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
        el.style.transform = `translate3d(${cx}px,${cy}px,0)`;
        if (arrow) arrow.style.translate = `${cx * 0.4}px ${cy * 0.4}px`;
        raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.05) ? requestAnimationFrame(loop) : 0;
      };
      const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        tx = clamp((e.clientX - (r.left + r.width / 2)) * 0.22, -12, 12);
        ty = clamp((e.clientY - (r.top + r.height / 2)) * 0.32, -8, 8);
        kick();
      });
      el.addEventListener('pointerleave', () => { tx = ty = 0; kick(); });
    });
  }

  /* ------------------------------------------------------------------------
     Drag-to-scroll (mouse) with momentum
     ------------------------------------------------------------------------ */
  const makeDraggable = el => {
    let down = false, sx = 0, sl = 0, lastX = 0, vel = 0, moved = 0, raf = 0;
    el.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = 0; sx = lastX = e.clientX; sl = el.scrollLeft; vel = 0;
      cancelAnimationFrame(raf);
    });
    window.addEventListener('pointermove', e => {
      if (!down) return;
      const d = e.clientX - sx;
      moved = Math.max(moved, Math.abs(d));
      if (moved > 4) el.classList.add('is-dragging');
      vel = e.clientX - lastX; lastX = e.clientX;
      el.scrollLeft = sl - d;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      const glide = () => {
        vel *= 0.94; el.scrollLeft -= vel;
        if (Math.abs(vel) > 0.4 && !reduced) raf = requestAnimationFrame(glide);
      };
      raf = requestAnimationFrame(glide);
      setTimeout(() => el.classList.remove('is-dragging'), 0);
    });
    el.addEventListener('click', e => { if (moved > 4) { e.preventDefault(); e.stopPropagation(); } }, true);
  };

  /* ------------------------------------------------------------------------
     Showreel player
     ------------------------------------------------------------------------ */
  const reel = (() => {
    const frame = $('.reel__frame'), video = $('.reel__video'), big = $('.reel__big');
    const playBtn = $('.rc--play'), muteBtn = $('.rc--mute'), fsBtn = $('.rc--fs');
    const bar = $('.rc__bar'), fill = $('.rc__fill'), buf = $('.rc__buf'), time = $('[data-time]');
    const strip = $('.strip'), ambient = $('.reel__ambient img');
    const elIndex = $('[data-reel-index]'), elTotal = $('[data-reel-total]'), elTitle = $('[data-reel-title]'), elCat = $('[data-reel-cat]');
    const nextBtn = $('[data-reel-next]'), nextImg = $('img', nextBtn), nextTitle = $('[data-reel-next-title]');
    let i = 0, engaged = false, inView = false;

    strip.innerHTML = REEL.map((id, n) => {
      const w = byId[id];
      return `<button class="strip__item" role="listitem" data-i="${n}" aria-label="Play ${w.title}">
        <div class="strip__thumb"><img src="${src.poster(id)}" alt="" loading="lazy" draggable="false"><b>${pad(n + 1)}</b></div>
        <span>${w.title}<small>${w.style} · ${fmt(w.dur)}</small></span></button>`;
    }).join('');
    elTotal.textContent = pad(REEL.length);
    const items = $$('.strip__item', strip);
    makeDraggable(strip);

    const syncState = () => {
      frame.classList.toggle('is-playing', !video.paused);
      frame.classList.toggle('is-paused', video.paused && engaged);
      frame.classList.toggle('is-muted', video.muted);
      frame.classList.toggle('is-preview', !engaged && !video.paused);
      playBtn.setAttribute('aria-label', video.paused ? 'Play' : 'Pause');
      muteBtn.setAttribute('aria-label', video.muted ? 'Unmute' : 'Mute');
      frame.dataset.cursorLabel = video.paused ? 'PLAY' : (video.muted ? 'SOUND' : 'PAUSE');
    };

    const load = (n, autoplay) => {
      i = (n + REEL.length) % REEL.length;
      const w = byId[REEL[i]], nx = byId[REEL[(i + 1) % REEL.length]];
      frame.classList.add('is-swapping');
      setTimeout(() => {
        video.src = src.full(w.id);
        video.poster = src.poster(w.id);
        video.muted = !engaged;
        if (autoplay) playVideo(video);
        frame.classList.remove('is-swapping');
      }, video.src ? 280 : 0);
      ambient.src = src.poster(w.id);
      elIndex.textContent = pad(i + 1);
      elTitle.textContent = w.title;
      elCat.textContent = w.style;
      nextImg.src = src.poster(nx.id);
      nextTitle.textContent = nx.title;
      items.forEach((b, k) => b.classList.toggle('is-active', k === i));
      const it = items[i];
      if (it && engaged) strip.scrollTo({ left: it.offsetLeft - strip.clientWidth / 2 + it.offsetWidth / 2, behavior: reduced ? 'auto' : 'smooth' });
    };

    const playWithSound = () => {
      engaged = true;
      video.muted = false;
      if (video.currentTime > 0 && frame.dataset.previewing) video.currentTime = 0;
      delete frame.dataset.previewing;
      playVideo(video);
      syncState();
    };
    const toggle = () => {
      if (!engaged || video.muted && !video.paused) return playWithSound();
      video.paused ? playVideo(video) : video.pause();
    };

    big.addEventListener('click', e => { e.stopPropagation(); playWithSound(); });
    video.addEventListener('click', toggle);
    playBtn.addEventListener('click', toggle);
    muteBtn.addEventListener('click', () => { video.muted = !video.muted; engaged = true; syncState(); });
    fsBtn.addEventListener('click', () => {
      const el = frame;
      if (document.fullscreenElement) document.exitFullscreen();
      else if (el.requestFullscreen) el.requestFullscreen().catch(() => video.webkitEnterFullscreen && video.webkitEnterFullscreen());
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    });
    ['play', 'pause', 'volumechange'].forEach(ev => video.addEventListener(ev, syncState));
    video.addEventListener('timeupdate', () => {
      const p = video.duration ? video.currentTime / video.duration : 0;
      fill.style.transform = `scaleX(${p})`;
      bar.setAttribute('aria-valuenow', Math.round(p * 100));
      time.textContent = `${fmt(video.currentTime)} / ${fmt(video.duration)}`;
    });
    video.addEventListener('progress', () => {
      try { if (video.duration && video.buffered.length) buf.style.transform = `scaleX(${video.buffered.end(video.buffered.length - 1) / video.duration})`; } catch (_) {}
    });
    video.addEventListener('ended', () => load(i + 1, true));

    const seekTo = clientX => {
      const r = bar.getBoundingClientRect();
      if (video.duration) video.currentTime = clamp((clientX - r.left) / r.width, 0, 1) * video.duration;
    };
    let seeking = false;
    bar.addEventListener('pointerdown', e => { seeking = true; bar.setPointerCapture(e.pointerId); seekTo(e.clientX); engaged = true; });
    bar.addEventListener('pointermove', e => { if (seeking) seekTo(e.clientX); });
    bar.addEventListener('pointerup', () => { seeking = false; });
    bar.addEventListener('keydown', e => {
      if (!video.duration) return;
      if (e.key === 'ArrowRight') { video.currentTime = Math.min(video.duration, video.currentTime + 5); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { video.currentTime = Math.max(0, video.currentTime - 5); e.preventDefault(); }
    });

    strip.addEventListener('click', e => {
      const b = e.target.closest('.strip__item'); if (!b) return;
      engaged = true; load(+b.dataset.i, true);
      if (window.innerWidth < 861) frame.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    });
    nextBtn.addEventListener('click', () => { engaged = true; load(i + 1, true); });

    // Muted preview while the stage is on screen; pause when it leaves
    new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (inView && !engaged && autoMedia) { frame.dataset.previewing = '1'; playVideo(video); }
      if (!inView && !video.paused) video.pause();
    }, { threshold: 0.35 }).observe(frame);

    load(0, false);
    syncState();
    return { pause: () => video.pause() };
  })();

  /* ------------------------------------------------------------------------
     Work grid — editorial masonry, filters, hover previews
     ------------------------------------------------------------------------ */
  const grid = $('[data-grid]');
  grid.innerHTML = WORKS.map((w, n) => {
    const media = `
      <button class="card__media" data-open="${w.id}" data-cursor="view" aria-label="Watch ${w.title} (${CATS[w.cat]}, ${fmt(w.dur)})" style="--ar:${w.ar || '9/16'}">
        <img src="${src.poster(w.id)}" alt="" loading="lazy" decoding="async">
        <video muted loop playsinline preload="none" data-src="${src.preview(w.id)}"></video>
        <span class="card__tag">${w.style}</span>
        <span class="card__dur">${fmt(w.dur)}</span>
      </button>`;
    if (w.feature) {
      return `<article class="card is-feature reveal" data-cat="${w.cat}" data-id="${w.id}">
        ${media}
        <div class="card__feat">
          <span class="card__fnum">${pad(n + 1)}</span>
          <div>
            <p class="card__fcat">${label(w)}</p>
            <h3>${w.title}</h3>
            <p class="card__fdesc">${w.desc}</p>
            <button class="card__watch" data-open="${w.id}" data-cursor="cta">Watch the full cut <i class="arrow" aria-hidden="true">↗</i></button>
          </div>
        </div>
      </article>`;
    }
    return `<article class="card reveal" data-cat="${w.cat}" data-id="${w.id}">
      ${media}
      <div class="card__meta"><span class="idx">${pad(n + 1)}</span><h3>${w.title}</h3><small>${w.style === CATS[w.cat] ? "" : CATS[w.cat]}</small></div>
    </article>`;
  }).join('');
  const cards = $$('.card', grid);
  if (!finePointer) $('.work__hint').textContent = 'Tap any project to watch with sound';
  observeReveals(grid);

  // counts on filters
  $$('[data-count]').forEach(s => {
    const k = s.dataset.count;
    s.textContent = k === 'all' ? WORKS.length : WORKS.filter(w => w.cat === k).length;
  });

  const ROW = 4;
  const layout = () => {
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 20;
    cards.forEach(c => {
      if (c.hidden) return;
      c.style.gridRowEnd = 'auto';
      const h = c.getBoundingClientRect().height / (parseFloat(getComputedStyle(c).scale) || 1);
      c.style.gridRowEnd = `span ${Math.ceil((h + gap * 1.6) / ROW)}`;
    });
  };
  layout();
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 120); });
  document.fonts && document.fonts.ready.then(layout);

  // filters with sliding pill
  const filters = $$('.filter');
  const pill = $('.filters__pill');
  const movePill = b => { pill.style.width = b.offsetWidth + 'px'; pill.style.height = b.offsetHeight + 'px'; pill.style.transform = `translate3d(${b.offsetLeft}px,${b.offsetTop}px,0)`; };
  const activeFilter = () => filters.find(f => f.classList.contains('is-active'));
  requestAnimationFrame(() => movePill(activeFilter()));
  window.addEventListener('resize', () => movePill(activeFilter()));
  document.fonts && document.fonts.ready.then(() => movePill(activeFilter()));

  let filterTimer;
  filters.forEach(b => b.addEventListener('click', () => {
    if (b.classList.contains('is-active')) return;
    filters.forEach(f => { f.classList.toggle('is-active', f === b); f.setAttribute('aria-pressed', String(f === b)); });
    movePill(b);
    const k = b.dataset.filter;
    cards.forEach(c => c.classList.add('is-out'));
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => {
      cards.forEach(c => { c.hidden = !(k === 'all' || c.dataset.cat === k); });
      layout();
      const shown = cards.filter(c => !c.hidden);
      shown.forEach((c, n) => { c.classList.add('in'); setTimeout(() => c.classList.remove('is-out'), reduced ? 0 : 40 + n * 45); });
    }, reduced ? 0 : 320);
  }));

  // hover previews (mouse) / in-view previews (touch)
  const startPreview = card => { const v = $('video', card); card.classList.add('is-previewing'); playVideo(v); };
  const stopPreview = card => { const v = $('video', card); card.classList.remove('is-previewing'); if (v) v.pause(); };
  if (finePointer) {
    cards.forEach(c => {
      const m = $('.card__media', c);
      m.addEventListener('pointerenter', () => !saveData && startPreview(c));
      m.addEventListener('pointerleave', () => stopPreview(c));
      m.addEventListener('focus', () => !saveData && startPreview(c));
      m.addEventListener('blur', () => stopPreview(c));
    });
  } else if (autoMedia) {
    const live = new Set();
    const touchIO = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const c = e.target;
        if (e.isIntersecting && e.intersectionRatio > 0.6) {
          if (live.size >= 2) { const oldest = live.values().next().value; stopPreview(oldest); live.delete(oldest); }
          live.add(c); startPreview(c);
        } else if (live.has(c)) { stopPreview(c); live.delete(c); }
      });
    }, { threshold: [0, 0.6] });
    cards.forEach(c => touchIO.observe(c));
  }

  /* ------------------------------------------------------------------------
     Video modal with next/prev
     ------------------------------------------------------------------------ */
  const modal = $('.modal');
  const mVideo = $('.modal__media video'), mMedia = $('.modal__media');
  const mTitle = $('.modal__title'), mCat = $('.modal__cat'), mBg = $('.modal__bg img');
  const mIdx = $('[data-m-index]'), mTot = $('[data-m-total]');
  let list = WORKS.map(w => w.id), mi = 0, lastFocus = null, closing = null;

  const showInModal = (n, dir = 0) => {
    mi = (n + list.length) % list.length;
    const w = byId[list[mi]];
    mMedia.style.setProperty('--ar', w.ar || '9/16');
    mVideo.poster = src.poster(w.id);
    mVideo.src = src.full(w.id);
    playVideo(mVideo);
    mTitle.textContent = w.title;
    mCat.textContent = label(w);
    mBg.src = src.poster(w.id);
    mIdx.textContent = pad(mi + 1); mTot.textContent = pad(list.length);
    if (dir && !reduced) mMedia.animate([{ opacity: 0, transform: `translate3d(${dir * 40}px,0,0) scale(.98)` }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.16,1,.3,1)' });
  };

  const openModal = (id, fromEl) => {
    const k = $('.filter.is-active').dataset.filter;
    list = WORKS.filter(w => k === 'all' || w.cat === k).map(w => w.id);
    if (!list.includes(id)) list = WORKS.map(w => w.id);
    if (closing) { closing.onfinish = null; closing.cancel(); closing = null; }
    lastFocus = document.activeElement;
    reel.pause();
    modal.hidden = false;
    modal.classList.add('is-open');
    document.body.classList.add('is-locked');
    motion.lock(true);
    showInModal(list.indexOf(id));
    // FLIP from the clicked card
    if (fromEl && !reduced) {
      const a = fromEl.getBoundingClientRect(), b = mMedia.getBoundingClientRect();
      const sx = a.width / b.width, sy = a.height / b.height;
      mMedia.animate([
        { transformOrigin: '0 0', transform: `translate3d(${a.left - b.left}px,${a.top - b.top}px,0) scale(${sx},${sy})`, borderRadius: '14px' },
        { transformOrigin: '0 0', transform: 'none', borderRadius: '16px' },
      ], { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)' });
      $('.modal__bg').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450 });
    }
    $('.modal__close').focus({ preventScroll: true });
  };
  const closeModal = () => {
    mVideo.pause();
    const done = () => { closing = null; modal.hidden = true; modal.classList.remove('is-open'); mVideo.removeAttribute('src'); mVideo.load(); };
    document.body.classList.remove('is-locked');
    motion.lock(false);
    if (reduced) done();
    else { closing = modal.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease', fill: 'forwards' }); closing.onfinish = () => { closing.cancel(); done(); }; }
    lastFocus && lastFocus.focus({ preventScroll: true });
  };

  grid.addEventListener('click', e => {
    const b = e.target.closest('[data-open]'); if (!b) return;
    const card = b.closest('.card');
    openModal(b.dataset.open, $('.card__media', card));
  });
  modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
  $('.modal__nav--prev').addEventListener('click', () => showInModal(mi - 1, -1));
  $('.modal__nav--next').addEventListener('click', () => showInModal(mi + 1, 1));
  document.addEventListener('keydown', e => {
    if (modal.hidden) { if (e.key === 'Escape' && !menu.hidden) setMenu(false); return; }
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowRight' && e.target.tagName !== 'VIDEO') showInModal(mi + 1, 1);
    if (e.key === 'ArrowLeft' && e.target.tagName !== 'VIDEO') showInModal(mi - 1, -1);
    if (e.key === 'Tab') { // focus trap
      const f = $$('button, video', modal).filter(x => x.offsetParent !== null);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  });
  // swipe between projects on touch
  let tx0 = null;
  mMedia.addEventListener('touchstart', e => { tx0 = e.touches[0].clientX; }, { passive: true });
  mMedia.addEventListener('touchend', e => {
    if (tx0 == null) return;
    const d = e.changedTouches[0].clientX - tx0; tx0 = null;
    if (Math.abs(d) > 60) showInModal(mi + (d < 0 ? 1 : -1), d < 0 ? 1 : -1);
  });

  /* ------------------------------------------------------------------------
     Capabilities accordion + cursor-follow footage preview
     ------------------------------------------------------------------------ */
  const capEls = $$('.cap');
  const capPrev = $('.cap-preview'), capVid = $('video', capPrev);
  capEls.forEach((cap, n) => {
    const head = $('.cap__head', cap), body = $('.cap__body', cap);
    body.id = `cap-body-${n}`; head.setAttribute('aria-controls', body.id);
    // inline footage for touch layouts
    const inline = document.createElement('div');
    inline.className = 'cap__inline';
    inline.innerHTML = `<video muted loop playsinline preload="none" poster="${src.poster(cap.dataset.preview)}" data-src="${src.preview(cap.dataset.preview)}"></video>`;
    $('.cap__body > div', cap).prepend(inline);
    head.addEventListener('click', () => {
      const open = !cap.classList.contains('is-open');
      capEls.forEach(c => { c.classList.remove('is-open'); $('.cap__head', c).setAttribute('aria-expanded', 'false'); const v = $('.cap__inline video', c); v && v.pause(); });
      cap.classList.toggle('is-open', open);
      head.setAttribute('aria-expanded', String(open));
      if (open && autoMedia && !finePointer) playVideo($('.cap__inline video', cap));
    });
  });
  capEls[0].classList.add('is-open'); $('.cap__head', capEls[0]).setAttribute('aria-expanded', 'true');

  if (cursorOn && !saveData) {
    let cx = 0, cy = 0, tx = 0, ty = 0, raf = 0, on = false, current = '';
    const follow = () => {
      cx += (tx - cx) * 0.14; cy += (ty - cy) * 0.14;
      capPrev.style.transform = `translate3d(${cx + 150}px,${cy}px,0) rotate(${clamp((tx - cx) * 0.05, -8, 8)}deg)`;
      raf = on || Math.abs(tx - cx) > 0.5 ? requestAnimationFrame(follow) : 0;
    };
    const list = $('[data-caps]');
    list.addEventListener('pointermove', e => {
      tx = e.clientX; ty = e.clientY;
      const cap = e.target.closest('.cap');
      if (cap && cap.dataset.preview !== current) {
        current = cap.dataset.preview;
        capVid.src = src.preview(current); playVideo(capVid);
      }
      if (!on) { on = true; if (!cx) { cx = tx; cy = ty; } capPrev.classList.add('is-on'); }
      if (!raf) raf = requestAnimationFrame(follow);
    });
    list.addEventListener('pointerleave', () => { on = false; capPrev.classList.remove('is-on'); capVid.pause(); });
  }

  /* ------------------------------------------------------------------------
     Toolkit spotlight
     ------------------------------------------------------------------------ */
  $$('.tool').forEach(t => t.addEventListener('pointermove', e => {
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', `${e.clientX - r.left}px`);
    t.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));

  /* ------------------------------------------------------------------------
     Scroll-driven: nav state, process line, parallax
     ------------------------------------------------------------------------ */
  const steps = $('[data-steps]'), stepEls = $$('.step', steps), stepLine = $('.steps__line i', steps);
  const parallax = $$('[data-speed]');
  const floats = $$('.float');
  let lastY = window.scrollY, ticking = false, mx = 0, my = 0, fmx = 0, fmy = 0;

  const onScroll = () => {
    ticking = false;
    const y = window.scrollY, vh = window.innerHeight;
    nav.classList.toggle('is-solid', y > 40);
    if (menu.hidden) nav.classList.toggle('is-hidden', y > lastY && y > 400);
    lastY = y;

    const r = steps.getBoundingClientRect();
    const p = clamp((vh * 0.6 - r.top) / r.height, 0, 1);
    stepLine.style.transform = `scaleY(${p})`;
    stepEls.forEach(s => s.classList.toggle('is-active', s.getBoundingClientRect().top < vh * 0.62));

    if (!reduced) {
      parallax.forEach(el => {
        const b = el.parentElement.getBoundingClientRect();
        if (b.bottom < -200 || b.top > vh + 200) return;
        el.style.transform = `translate3d(0,${(b.top + b.height / 2 - vh / 2) * parseFloat(el.dataset.speed)}px,0)`;
      });
      if (y < vh * 1.2) moveFloats();
    }
  };
  const moveFloats = () => {
    const y = window.scrollY;
    floats.forEach(f => {
      const d = parseFloat(f.dataset.depth);
      f.style.transform = `translate3d(${fmx * 18 * d}px,${fmy * 14 * d - y * 0.12 * d}px,0)`;
    });
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  if (cursorOn && floats.length) {
    let raf = 0;
    const ease = () => {
      fmx += (mx - fmx) * 0.06; fmy += (my - fmy) * 0.06;
      moveFloats();
      raf = Math.abs(mx - fmx) + Math.abs(my - fmy) > 0.002 ? requestAnimationFrame(ease) : 0;
    };
    hero.addEventListener('pointermove', e => {
      mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5;
      if (!raf) raf = requestAnimationFrame(ease);
    });
  }

  /* ------------------------------------------------------------------------
     Copy email
     ------------------------------------------------------------------------ */
  const toast = $('.toast');
  let toastT;
  const say = msg => { toast.textContent = msg; toast.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('is-on'), 2400); };
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    const text = b.dataset.copy, label = $('[data-copy-label]', b);
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; }
    catch (_) {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (__) {}
      ta.remove();
    }
    say(ok ? 'Email copied — talk soon' : text);
    if (ok && label) { label.textContent = 'Copied ✓'; setTimeout(() => { label.textContent = 'Copy my email'; }, 2400); }
  }));

  const yr = $('[data-year]'); if (yr) yr.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------------
     Top message box → Justin's inbox (FormSubmit, no backend needed)
     ------------------------------------------------------------------------ */
  const msgForm = $('[data-msg]');
  if (msgForm) {
    const ENDPOINT = 'https://formsubmit.co/ajax/tuazonjustin4321@gmail.com';
    const status = $('.msg__status', msgForm), sendBtn = $('.msg__send', msgForm), sendLabel = $('[data-msg-label]', msgForm);
    const fName = $('#msg-name'), fEmail = $('#msg-email'), fText = $('#msg-text');
    const setStatus = (html, kind) => { status.innerHTML = html; status.className = 'msg__status' + (kind ? ` is-${kind}` : ''); };
    const fit = () => { if (window.innerWidth > 860) { fText.style.height = '44px'; fText.style.height = Math.min(fText.scrollHeight + 2, 140) + 'px'; } };
    fText.addEventListener('input', fit);
    // Enter sends from the one-line box on desktop; Shift+Enter adds a line
    fText.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 860) { e.preventDefault(); msgForm.requestSubmit(); } });
    [fName, fEmail, fText].forEach(f => f.addEventListener('input', () => f.classList.remove('is-invalid')));

    msgForm.addEventListener('submit', async e => {
      e.preventDefault();
      const bad = [fName, fEmail, fText].filter(f => !f.value.trim() || !f.checkValidity());
      bad.forEach(f => f.classList.add('is-invalid'));
      if (bad.length) {
        const empty = bad.some(f => !f.value.trim());
        setStatus(empty ? 'Please add your name, email and a message.' : 'Please check your email address.', 'err');
        bad[0].focus();
        return;
      }
      if ($('.msg__honey', msgForm).value) return; // bot
      sendBtn.disabled = true; sendLabel.textContent = 'Sending…'; setStatus('');
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            name: fName.value.trim(), email: fEmail.value.trim(), message: fText.value.trim(),
            _subject: `Portfolio message from ${fName.value.trim()}`, _replyto: fEmail.value.trim(), _template: 'table', _captcha: 'false',
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || String(data.success) !== 'true') throw new Error(data.message || 'send failed');
        msgForm.classList.add('is-sent');
        setStatus(`Message sent. Thanks, ${fName.value.trim().split(' ')[0]} — I'll reply to ${fEmail.value.trim()} soon.`, 'ok');
        msgForm.reset();
      } catch (_) {
        setStatus('Your message couldn’t be sent right now. Please email me at <a href="mailto:tuazonjustin4321@gmail.com">tuazonjustin4321@gmail.com</a>.', 'err');
      } finally {
        sendBtn.disabled = false; sendLabel.textContent = 'Send';
      }
    });
  }
})();
