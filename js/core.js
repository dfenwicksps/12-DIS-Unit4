/* NEXUS core: state, helpers, network map, mission runner, dialogs. */
(function () {
  'use strict';

  const NX = (window.NX = { missions: [] });
  NX.register = m => NX.missions.push(m);

  NX.LINES = {
    exchange: { name: 'Exchange Line', topic: 'Digital methods for exchanging data', color: 'var(--l-ex)' },
    req: { name: 'Requirements Line', topic: 'Data exchange problems and solution requirements', color: 'var(--l-req)' },
    proto: { name: 'Prototype Line', topic: 'Prototyping and testing data exchanges', color: 'var(--l-pro)' },
    core: { name: 'Nexus Core', topic: 'Mixed exam-style challenge', color: 'var(--core)' }
  };

  /* ---------------- state ---------------- */
  const KEY = 'nexus-u4-v1';
  const defaults = () => ({ progress: {}, notes: {}, sound: true, unlockAll: false });
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(defaults(), JSON.parse(raw));
    } catch (e) { /* storage unavailable: play without saving */ }
    return defaults();
  }
  const S = (NX.S = load());
  NX.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
  };

  /* ---------------- helpers ---------------- */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'style') el.style.cssText = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Tiny markup for authored content: `code`, **bold**, and \n line breaks.
  const md = s => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  function shuffle(a) {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  }
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function shake(el) {
    if (reduced()) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }
  function fb(el, kind, text) {
    el.className = 'fb fb-' + kind;
    const lead = kind === 'ok' ? '<b>Correct.</b> ' : kind === 'bad' ? '<b>Not quite.</b> ' : '';
    el.innerHTML = lead + (text ? md(text) : '');
    el.hidden = false;
  }
  const fbEl = () => h('div', { class: 'fb', role: 'status', 'aria-live': 'polite', hidden: true });
  const codeBlock = src => h('pre', { class: 'code', text: src });
  const stars = n => '★'.repeat(n) + '☆'.repeat(3 - n);

  /* ---------------- sound ---------------- */
  let actx = null;
  function sfx(kind) {
    if (!S.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const seq = { ok: [660, 880], bad: [196, 147], click: [520], win: [523, 659, 784, 1047], unlock: [392, 523, 659] }[kind] || [440];
      let t = actx.currentTime;
      seq.forEach(f => {
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.type = kind === 'bad' ? 'square' : 'triangle';
        o.frequency.value = f;
        const peak = kind === 'bad' ? 0.05 : kind === 'click' ? 0.05 : 0.12;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.connect(g).connect(actx.destination);
        o.start(t);
        o.stop(t + 0.18);
        t += 0.09;
      });
    } catch (e) { /* audio unavailable */ }
  }

  function confetti() {
    if (reduced()) return;
    const c = h('canvas', { class: 'confetti', 'aria-hidden': 'true' });
    document.body.append(c);
    const ctx = c.getContext('2d');
    const W = (c.width = innerWidth), H = (c.height = innerHeight);
    const cs = getComputedStyle(document.documentElement);
    const cols = ['--l-ex', '--l-req', '--l-pro', '--core', '--yellow'].map(v => cs.getPropertyValue(v).trim());
    const P = Array.from({ length: 90 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 200, y: H * 0.35, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4,
      w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      c: cols[Math.floor(Math.random() * cols.length)]
    }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, W, H);
      P.forEach(p => {
        p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (t - t0 < 1800) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }

  Object.assign(NX, { h, esc, md, shuffle, shake, fb, fbEl, codeBlock, sfx, stars, reduced });

  /* ---------------- characters ---------------- */
  const AVATARS = {
    rin: { name: 'Rin · Network Ops', svg: '<svg viewBox="0 0 52 52" class="who" aria-hidden="true"><rect width="52" height="52" rx="12" fill="var(--l-ex)"/><circle cx="26" cy="21" r="10" fill="#f4f7f9"/><path d="M10 46c3-10 10-14 16-14s13 4 16 14" fill="#f4f7f9"/><path d="M13 20a13 13 0 0 1 26 0" fill="none" stroke="#13202b" stroke-width="3"/><rect x="10" y="18" width="6" height="9" rx="2" fill="#13202b"/><rect x="36" y="18" width="6" height="9" rx="2" fill="#13202b"/></svg>' },
    hex: { name: 'HEX', svg: '<svg viewBox="0 0 52 52" class="who" aria-hidden="true"><rect width="52" height="52" rx="12" fill="#04090d"/><path d="M26 7l16 9v20l-16 9-16-9V16z" fill="none" stroke="var(--core)" stroke-width="3"/><rect x="17" y="22" width="7" height="4" fill="var(--core)"/><rect x="28" y="22" width="7" height="4" fill="var(--core)"/><path d="M19 33h14" stroke="var(--core)" stroke-width="2.5"/></svg>' },
    ai: { name: 'AI assistant', svg: '<svg viewBox="0 0 52 52" class="who" aria-hidden="true"><rect width="52" height="52" rx="12" fill="var(--l-pro)"/><rect x="12" y="15" width="28" height="22" rx="6" fill="#f4f7f9"/><circle cx="21" cy="26" r="3" fill="#13202b"/><circle cx="31" cy="26" r="3" fill="#13202b"/><path d="M26 8v7" stroke="#f4f7f9" stroke-width="3"/></svg>' }
  };
  NX.bubble = function (who, text) {
    const a = AVATARS[who] || AVATARS.rin;
    const b = h('div', { class: 'bubble ' + who });
    b.innerHTML = a.svg;
    b.append(h('div', { class: 'say', html: '<span class="name">' + esc(a.name) + '</span>' + md(text) }));
    return b;
  };

  /* ---------------- progress rules ---------------- */
  const byId = id => NX.missions.find(m => m.id === id);
  NX.byId = byId;
  const isDone = id => !!(S.progress[id] && S.progress[id].stars > 0);
  function isOpen(m) {
    if (S.unlockAll) return true;
    return (m.requires || []).every(isDone);
  }
  function totalStars() {
    return NX.missions.reduce((a, m) => a + ((S.progress[m.id] && S.progress[m.id].stars) || 0), 0);
  }

  /* ---------------- map ---------------- */
  const PATHS = {
    exchange: 'M80 300 H240 L340 200 H500 L600 300 H880',
    req: 'M200 300 V380 L280 460 H700 L860 300 H880',
    proto: 'M600 300 V160 L660 100 H840 L880 140 V300'
  };
  const SVGNS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) el.setAttribute(k, v);
    kids.flat().forEach(k => k != null && el.append(k.nodeType ? k : document.createTextNode(k)));
    return el;
  }

  function renderMap() {
    const view = document.getElementById('map-view');
    view.innerHTML = '';
    const doneCount = NX.missions.filter(m => isDone(m.id)).length;
    const next = NX.missions.find(m => !isDone(m.id) && isOpen(m));
    const hero = h('div', { class: 'hero' },
      h('div', null,
        h('h1', { id: 'map-title', text: doneCount === NX.missions.length ? 'The network is back online.' : 'HEX has taken the NEXUS network down.' }),
        h('p', { text: doneCount === NX.missions.length
          ? 'Every line is running. Replay any station to raise your stars before the exam.'
          : 'Each station is a mission. Restore stations to reopen the lines, then take back the Core. ' + (next ? 'Next up: ' + next.title + '.' : '') })
      ),
      h('div', { class: 'status-board', role: 'group', 'aria-label': 'Progress' },
        h('div', null, h('b', { text: doneCount + '/' + NX.missions.length }), h('span', { text: 'Stations' })),
        h('div', null, h('b', { text: totalStars() + '/' + NX.missions.length * 3 }), h('span', { text: 'Stars' }))
      )
    );

    const svg = s('svg', { class: 'map-svg', viewBox: '0 0 960 540', role: 'group', 'aria-label': 'Network map. Choose a station.' });
    svg.append(s('path', { class: 'water', d: 'M0 70 C180 20 300 130 520 80 S 820 10 960 60 L960 0 L0 0 Z' }));
    const grid = s('g', { class: 'grid' });
    for (let x = 40; x < 960; x += 40) grid.append(s('line', { x1: x, y1: 0, x2: x, y2: 540 }));
    for (let y = 40; y < 540; y += 40) grid.append(s('line', { x1: 0, y1: y, x2: 960, y2: y }));
    svg.append(grid);
    for (const [line, d] of Object.entries(PATHS)) {
      const any = NX.missions.some(m => m.line === line && isOpen(m));
      svg.append(s('path', { class: 'line' + (any ? '' : ' dim'), d, stroke: NX.LINES[line].color }));
    }

    NX.missions.forEach(m => {
      const open = isOpen(m), done = isDone(m.id);
      const color = open ? NX.LINES[m.line].color : 'var(--locked)';
      const st = s('g', {
        class: 'st ' + (done ? 'done' : open ? 'open' : 'locked'),
        transform: `translate(${m.map.x} ${m.map.y})`,
        role: 'button', tabindex: '0',
        'aria-label': `${m.title}. ${done ? 'Restored, ' + S.progress[m.id].stars + ' of 3 stars' : open ? 'Open' : 'Locked'}.`
      });
      if (m.line === 'core') {
        st.append(s('circle', { class: 'pulse', r: 26, stroke: color }));
        st.append(s('circle', { class: 'ring', r: 24, stroke: color, 'stroke-width': 8, fill: done ? color : 'var(--panel)' }));
        st.append(s('path', { d: 'M-10 6 L-4 -6 L4 6 L10 -6', fill: 'none', stroke: done ? 'var(--panel)' : color, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
        st.append(s('text', { class: 'core-lab', y: 52, 'text-anchor': 'middle' }, 'NEXUS CORE'));
        if (done) st.append(s('text', { class: 'stars', y: 70, 'text-anchor': 'middle' }, stars(S.progress[m.id].stars)));
      } else {
        st.append(s('circle', { class: 'pulse', r: 14, stroke: color }));
        st.append(s('circle', { class: 'ring', r: 13, stroke: color, fill: done ? color : 'var(--panel)' }));
        if (done) st.append(s('path', { d: 'M-6 0 L-2 5 L6 -5', fill: 'none', stroke: 'var(--panel)', 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
        const above = m.map.label === 'above';
        st.append(s('text', { class: 'lab', y: above ? -24 : 36, 'text-anchor': 'middle' }, m.title));
        if (done) st.append(s('text', { class: 'stars', y: above ? -42 : 54, 'text-anchor': 'middle' }, stars(S.progress[m.id].stars)));
      }
      const go = () => { if (open) openMission(m.id); else { sfx('bad'); } };
      st.addEventListener('click', go);
      st.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      svg.append(st);
    });

    const panel = h('div', { class: 'map-panel' },
      h('div', { class: 'map-scroll' }, svg),
      h('div', { class: 'map-legend' },
        ...['exchange', 'req', 'proto'].map(l => h('span', null, h('i', { style: 'background:' + NX.LINES[l].color }), NX.LINES[l].name + ': ' + NX.LINES[l].topic)))
    );

    const guide = h('div', { class: 'guide' });
    ['exchange', 'req', 'proto', 'core'].forEach(line => {
      const L = NX.LINES[line];
      const box = h('section', { class: 'guide-line', style: '--lc:' + L.color }, h('h3', { text: L.name }), h('p', { class: 'topic', text: L.topic }));
      const ol = h('ol');
      NX.missions.filter(m => m.line === line).forEach(m => {
        const open = isOpen(m), done = isDone(m.id);
        const lockedMsg = open ? '' : 'Restore ' + (m.requires || []).filter(r => !isDone(r)).map(r => byId(r).title).join(', ') + ' first';
        ol.append(h('li', { class: done ? 'done' : '' },
          h('button', { type: 'button', disabled: !open, onclick: () => openMission(m.id), 'aria-label': m.title + (open ? '' : '. ' + lockedMsg) },
            h('span', { class: 'dot' }),
            h('span', { class: 'sname' }, m.title, h('small', { text: open ? m.short : lockedMsg })),
            h('span', { class: 'sstars', text: done ? stars(S.progress[m.id].stars) : open ? 'Open' : '' }))));
      });
      box.append(ol);
      guide.append(box);
    });

    view.append(hero, panel, guide);
  }

  /* ---------------- mission runner ---------------- */
  let run = null;

  function openMission(id) {
    const m = byId(id);
    run = { m, i: 0, errors: 0, hints1: 0, hints2: 0, steps: [] };
    run.steps.push({ kind: 'brief' });
    if (m.warmup) run.steps.push({ kind: 'warmup' });
    m.rounds.forEach((r, i) => run.steps.push({ kind: 'round', r, n: i }));
    run.steps.push({ kind: 'debrief' });
    document.getElementById('map-view').hidden = true;
    const mv = document.getElementById('mission-view');
    mv.hidden = false;
    mv.style.setProperty('--lc', NX.LINES[m.line].color);
    sfx('click');
    renderStep();
    window.scrollTo({ top: 0 });
  }
  NX.openMission = openMission;

  function showMap() {
    run = null;
    document.getElementById('mission-view').hidden = true;
    document.getElementById('map-view').hidden = false;
    renderMap();
    window.scrollTo({ top: 0 });
  }
  NX.showMap = showMap;

  function renderHead(step) {
    const m = run.m;
    const pips = h('div', { class: 'pips', 'aria-label': `Step ${run.i + 1} of ${run.steps.length}` },
      run.steps.map((_, i) => h('i', { class: i < run.i ? 'on' : i === run.i ? 'cur' : '' })));
    const hintBtn = h('button', { class: 'hint-btn', type: 'button', text: 'Hint', hidden: step.kind !== 'round' || !step.r.hints, onclick: () => giveHint(step) });
    run.faultsEl = h('span', { class: 'faults', text: 'Faults: ' + run.errors });
    return h('div', { class: 'mhead' },
      h('button', { class: 'back', type: 'button', text: '◂ Map', onclick: showMap }),
      h('div', null, h('div', { class: 'mline', text: NX.LINES[m.line].name + ' · ' + m.short }), h('h2', { text: m.title }), pips),
      h('div', { class: 'tools' }, run.faultsEl, hintBtn));
  }

  function giveHint(step) {
    const hints = step.r.hints;
    const box = run.hintBox;
    box.hidden = false;
    if (run.tier === 0) {
      run.tier = 1; run.hints1++;
      box.innerHTML = '<b>Hint 1 of 2</b><div>' + md(hints[0]) + '</div>';
    } else if (run.tier === 1) {
      if (!run.attempted) {
        box.innerHTML = '<b>Hint 1 of 2</b><div>' + md(hints[0]) + '</div><div class="small">Have a go first. Hint 2 unlocks after one attempt, right or wrong.</div>';
      } else {
        run.tier = 2; run.hints2++;
        box.innerHTML = '<b>Hint 1 of 2</b><div>' + md(hints[0]) + '</div><b>Hint 2 of 2</b><div>' + md(hints[1]) + '</div>';
      }
    }
    box.focus();
  }

  function makeCtx(counts) {
    return {
      missionId: run.m.id,
      error() { if (counts) { run.errors++; if (run.faultsEl) run.faultsEl.textContent = 'Faults: ' + run.errors; } },
      attempt() { run.attempted = true; },
      complete(label) { finishStep(label); },
      sfx
    };
  }

  function renderStep() {
    const mv = document.getElementById('mission-view');
    const step = run.steps[run.i];
    const m = run.m;
    mv.innerHTML = '';
    run.tier = 0; run.attempted = false;
    mv.append(renderHead(step));
    const stage = h('div', { class: 'stage' });
    mv.append(stage);
    run.stage = stage;

    if (step.kind === 'brief') {
      const brief = h('div', { class: 'brief' });
      m.brief.forEach(b => brief.append(NX.bubble(b.who, b.text)));
      const board = h('dl', { class: 'board', 'aria-label': 'Mission board' },
        h('dt', { text: 'STATION' }), h('dd', { text: m.title }),
        h('dt', { text: 'SYLLABUS' }), h('dd', { text: m.syllabus }),
        h('dt', { text: 'STOPS' }), h('dd', { text: m.rounds.map(r => r.title).join('  →  ') }));
      stage.append(brief, board);
      const b = h('button', { class: 'btn', type: 'button', text: 'Start mission', onclick: next });
      stage.append(b);
      b.focus();
    } else if (step.kind === 'warmup') {
      const card = h('div', { class: 'card' },
        h('div', { class: 'round-title' }, h('span', { class: 'eyebrow', text: 'Warm-up · recall from an earlier station' }), h('h3', { text: 'Before you board' })));
      stage.append(card);
      NX.mcq(card, Object.assign({}, m.warmup, { ctx: makeCtx(false), onDone: () => finishStep() }));
    } else if (step.kind === 'round') {
      const r = step.r;
      const card = h('div', { class: 'card' });
      card.append(h('div', { class: 'round-title' },
        h('span', { class: 'eyebrow', text: `Stop ${step.n + 1} of ${m.rounds.length}` }),
        h('h3', { text: r.title })));
      if (r.intro) card.append(h('p', { class: 'intro', html: md(r.intro) }));
      run.hintBox = h('div', { class: 'hintbox', hidden: true, tabindex: '-1', 'aria-live': 'polite' });
      card.append(run.hintBox);
      const body = h('div', { style: 'display:grid;gap:14px;min-width:0' });
      card.append(body);
      stage.append(card);
      r.run(body, makeCtx(true));
    } else {
      renderDebrief(stage);
    }
  }

  function finishStep(label) {
    const b = h('button', { class: 'btn', type: 'button', text: label || (run.i + 1 === run.steps.length - 1 ? 'Finish mission' : 'Next stop ▸'), onclick: next });
    run.stage.append(h('div', { class: 'row' }, b));
    b.focus({ preventScroll: true });
    b.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' });
  }

  function next() {
    run.i++;
    renderStep();
    window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
  }

  function renderDebrief(stage) {
    const m = run.m;
    const penalty = run.errors + run.hints2;
    const earned = penalty <= 1 ? 3 : penalty <= 4 ? 2 : 1;
    const prev = S.progress[m.id] || {};
    const firstTime = !prev.stars;
    S.progress[m.id] = {
      stars: Math.max(prev.stars || 0, earned),
      best: Math.min(prev.best == null ? 99 : prev.best, penalty),
      errors: run.errors, hints: run.hints1 + run.hints2, plays: (prev.plays || 0) + 1
    };
    NX.save();
    sfx('win');
    confetti();

    const unlocked = firstTime ? NX.missions.filter(x => x.id !== m.id && !isDone(x.id) && (x.requires || []).includes(m.id) && isOpen(x)) : [];
    const card = h('div', { class: 'card', style: 'text-align:left' },
      h('span', { class: 'eyebrow', text: m.line === 'core' ? 'Core restored' : 'Station restored' }),
      h('h3', { text: m.debriefTitle || m.title + ' is back online' }),
      h('div', { class: 'stars-big', role: 'img', 'aria-label': earned + ' of 3 stars', html: '★'.repeat(earned) + '<span class="off">' + '★'.repeat(3 - earned) + '</span>' }),
      h('div', { class: 'stat-row' },
        h('span', { text: 'Faults: ' + run.errors }),
        h('span', { text: 'Hints used: ' + (run.hints1 + run.hints2) }),
        h('span', { text: 'Best stars: ' + S.progress[m.id].stars + '/3' })),
      h('p', { class: 'small', text: '3 stars: at most 1 fault or second-tier hint. 2 stars: up to 4.' })
    );
    if (unlocked.length) card.append(h('div', { class: 'fb fb-info', html: '<b>Unlocked:</b> ' + unlocked.map(u => esc(u.title)).join(', ') }));
    stage.append(card);

    const notes = h('div', { class: 'card' },
      h('span', { class: 'eyebrow', text: 'Field note added' }),
      h('h3', { text: 'Key ideas to take into the exam' }),
      h('ul', { class: 'keyideas' }, m.keyIdeas.map(k => h('li', { html: md(k) }))));
    const ta = h('textarea', { id: 'reflect-' + m.id, 'aria-label': 'What caught you out, and why?', placeholder: 'One line: which idea caught you out, and what will you do differently?' });
    ta.value = (S.notes[m.id] && S.notes[m.id].reflect) || '';
    const saved = h('span', { class: 'small', role: 'status', 'aria-live': 'polite' });
    notes.append(h('label', { for: ta.id, style: 'font-weight:700', text: 'What caught you out?' }), ta,
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost', type: 'button', text: 'Save to field notes', onclick: () => {
          S.notes[m.id] = Object.assign(S.notes[m.id] || {}, { reflect: ta.value.trim() });
          NX.save(); saved.textContent = 'Saved.';
        } }), saved));
    stage.append(notes);

    const nextM = NX.missions.find(x => !isDone(x.id) && isOpen(x));
    stage.append(h('div', { class: 'row' },
      nextM ? h('button', { class: 'btn', type: 'button', text: 'Next station: ' + nextM.title + ' ▸', onclick: () => openMission(nextM.id) }) : null,
      h('button', { class: nextM ? 'btn ghost' : 'btn', type: 'button', text: 'Back to map', onclick: showMap })));
  }

  /* ---------------- dialogs ---------------- */
  function dialogShell(id, title, body) {
    const d = document.getElementById(id);
    d.innerHTML = '';
    const close = h('button', { class: 'sign-btn', type: 'button', text: 'Close', onclick: () => d.close() });
    d.append(h('div', { class: 'dlg-head' }, h('h2', { id: id + '-title', text: title }), close), body);
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    close.focus();
  }

  function openNotes() {
    const body = h('div', { class: 'dlg-body' },
      h('p', { class: 'small', text: 'Key ideas unlock when you restore a station. Your own reflections are saved beside them.' }));
    NX.missions.forEach(m => {
      const done = isDone(m.id);
      const n = h('div', { class: 'note' + (done ? '' : ' locked'), style: '--lc:' + NX.LINES[m.line].color },
        h('h3', { text: m.title + (done ? '  ' + stars(S.progress[m.id].stars) : '') }));
      if (!done) n.append(h('p', { class: 'small', text: 'Restore this station to unlock its notes.' }));
      else {
        n.append(h('ul', null, m.keyIdeas.map(k => h('li', { html: md(k) }))));
        const note = S.notes[m.id] || {};
        if (note.reflect) n.append(h('blockquote', { text: 'You wrote: ' + note.reflect }));
        Object.keys(note).filter(k => k.startsWith('w:')).forEach(k => {
          const w = note[k];
          if (w.missed) n.append(h('blockquote', { text: 'Mark you missed: ' + w.missed }));
        });
      }
      body.append(n);
    });
    dialogShell('dlg-notes', 'Field notes', body);
  }

  function openAbout() {
    let armed = false;
    const reset = h('button', { class: 'btn ghost', type: 'button', text: 'Reset all progress' });
    reset.addEventListener('click', () => {
      if (!armed) { armed = true; reset.textContent = 'Tap again to erase everything'; return; }
      S.progress = {}; S.notes = {}; NX.save();
      document.getElementById('dlg-about').close(); showMap();
    });
    const unlock = h('input', { type: 'checkbox', id: 'unlock-all' });
    unlock.checked = !!S.unlockAll;
    unlock.addEventListener('change', () => { S.unlockAll = unlock.checked; NX.save(); renderMap(); });

    const body = h('div', { class: 'dlg-body' },
      h('h3', { text: 'How to play' }),
      h('ul', null,
        h('li', { text: 'Each station on the map is a mission made of short interactive stops: rebuilding packets, cracking ciphers, routing keys, building API requests, hunting bugs in pseudocode.' }),
        h('li', { text: 'You always commit an answer before anything is revealed. Wrong answers tell you which misconception you hit, then you try again.' }),
        h('li', { text: 'Hint 1 points you at the idea. Hint 2 gives a method, never the answer, and unlocks after one attempt. Second-tier hints and faults cost stars.' }),
        h('li', { text: 'Restoring a station adds its key ideas to your Field notes, which you can use as a revision sheet.' }),
        h('li', { text: 'The Nexus Core mixes every station in unfamiliar scenarios, the way the external exam does.' })),
      h('h3', { text: 'Using AI while you revise' }),
      h('ul', null,
        h('li', { text: 'Commit first, consult second, verify always. Write your answer, then ask, then account for the difference.' }),
        h('li', { text: 'Good uses: explaining an error, generating extra practice, arguing with your explanation after you have written it.' }),
        h('li', { text: 'Offloading is anything that produces the answer you were meant to construct. The external exam is closed-book and worth 25% of the subject, so there is no tool in the room.' }),
        h('li', { text: 'AI answers sound fluent even when wrong. Two stations ask you to mark one.' })),
      h('h3', { text: 'Teacher tools' }),
      h('label', { class: 'row', for: 'unlock-all' }, unlock, h('span', { text: 'Unlock every station (for demonstrations or targeted revision)' })),
      h('p', { class: 'small', text: 'Progress is saved in this browser only. Clearing site data or using a private window starts fresh.' }),
      reset);
    dialogShell('dlg-about', 'How to play', body);
  }

  function syncSound() {
    const b = document.getElementById('btn-sound');
    b.textContent = S.sound ? 'Sound on' : 'Sound off';
    b.setAttribute('aria-pressed', String(!!S.sound));
  }

  NX.start = function () {
    const order = ['exchange', 'req', 'proto', 'core'];
    NX.missions.sort((a, b) => order.indexOf(a.line) - order.indexOf(b.line) || a.order - b.order);
    document.getElementById('brand').addEventListener('click', showMap);
    document.getElementById('btn-notes').addEventListener('click', openNotes);
    document.getElementById('btn-about').addEventListener('click', openAbout);
    document.getElementById('btn-sound').addEventListener('click', () => { S.sound = !S.sound; NX.save(); syncSound(); sfx('click'); });
    syncSound();
    const hash = (location.hash || '').slice(1);
    const m = hash && byId(hash);
    if (m && isOpen(m)) openMission(m.id); else renderMap();
  };
})();
