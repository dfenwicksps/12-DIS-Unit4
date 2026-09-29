/* Reusable interactions. Every widget records an attempt before it reveals anything,
   and every wrong-answer message names the misconception rather than just saying "wrong". */
(function () {
  'use strict';
  const { h, md, esc, shuffle, shake, fb, fbEl, sfx } = NX;

  /* Multiple choice. options: [{t, code?, ok, fb}] — several options may be ok. */
  NX.mcq = function (parent, { q, code, options, ctx, onDone, keepOrder }) {
    const wrap = h('div', { class: 'mcq' });
    if (q) wrap.append(h('p', { class: 'q', html: md(q) }));
    if (code) wrap.append(NX.codeBlock(code));
    const list = h('div', { class: 'opts', role: 'group', 'aria-label': 'Answer options' });
    const out = fbEl();
    let done = false;
    (keepOrder ? options.slice() : shuffle(options)).forEach(o => {
      const html = (o.code ? '<pre class="code">' + esc(o.code) + '</pre>' : '') + (o.t ? md(o.t) : '');
      const b = h('button', { class: 'opt', type: 'button', html });
      b._ok = !!o.ok; // read by the automated playthrough test
      b.addEventListener('click', () => {
        if (done) return;
        ctx && ctx.attempt();
        if (o.ok) {
          done = true;
          b.classList.add('is-ok');
          list.querySelectorAll('.opt').forEach(x => (x.disabled = true));
          fb(out, 'ok', o.fb || '');
          sfx('ok');
          onDone && onDone(o);
        } else {
          b.classList.add('is-bad');
          b.disabled = true;
          fb(out, 'bad', o.fb || 'Look at the scenario again.');
          sfx('bad');
          shake(b);
          ctx && ctx.error();
        }
      });
      list.append(b);
    });
    wrap.append(list, out);
    parent.append(wrap);
    return wrap;
  };

  /* A run of MCQs revealed one at a time. */
  NX.series = function (parent, items, ctx, onDone) {
    let i = 0;
    const step = () => {
      const it = items[i++];
      const box = h('div', { class: 'series-item' });
      if (items.length > 1) box.append(h('span', { class: 'eyebrow', text: `Question ${i} of ${items.length}` }));
      parent.append(box);
      NX.mcq(box, Object.assign({}, it, {
        ctx,
        onDone: () => {
          if (i >= items.length) { onDone(); return; }
          const b = h('button', { class: 'btn', type: 'button', text: 'Next question', onclick: () => { b.remove(); step(); } });
          box.append(b);
          b.focus({ preventScroll: true });
        }
      }));
      if (i > 1) box.scrollIntoView({ behavior: NX.reduced() ? 'auto' : 'smooth', block: 'start' });
    };
    step();
  };

  /* Tap-to-sort cards into bins. items: [{t, bin, fb}], bins: [{id, label, desc}] */
  NX.tapSort = function (parent, { items, bins, ctx, onDone, okText }) {
    const wrap = h('div', { class: 'sort' });
    const pool = h('div', { class: 'pool', role: 'group', 'aria-label': 'Cards to sort' });
    let sel = null;
    const out = fbEl();
    const check = h('button', { class: 'btn', type: 'button', text: 'Check sort', disabled: true });

    const clear = () => { if (sel) sel.setAttribute('aria-pressed', 'false'); sel = null; wrap.classList.remove('has-sel'); };
    const update = () => { check.disabled = pool.children.length > 0; };

    shuffle(items).forEach(it => {
      const c = h('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', html: md(it.t) });
      c._it = it;
      c.addEventListener('click', () => {
        if (c.disabled) return;
        if (sel === c) { clear(); return; }
        clear();
        sel = c; c.setAttribute('aria-pressed', 'true'); wrap.classList.add('has-sel');
        sfx('click');
      });
      pool.append(c);
    });

    const binEls = bins.map(b => {
      const drop = h('div', { class: 'bin-items' });
      const head = h('button', { class: 'bin-head', type: 'button', 'aria-label': 'Place selected card in ' + b.label,
        html: '<span>' + md(b.label) + '</span>' + (b.desc ? '<small>' + md(b.desc) + '</small>' : '') });
      head.addEventListener('click', () => {
        if (!sel) return;
        sel.classList.remove('is-bad', 'is-ok');
        drop.append(sel);
        clear();
        update();
      });
      const el = h('div', { class: 'bin' }, head, drop);
      el._id = b.id; el._drop = drop;
      return el;
    });

    check.addEventListener('click', () => {
      ctx.attempt();
      const wrong = [];
      binEls.forEach(b => b._drop.querySelectorAll('.chip').forEach(c => {
        if (c._it.bin === b._id) c.classList.add('is-ok'); else wrong.push(c);
      }));
      if (!wrong.length) {
        fb(out, 'ok', okText || 'Every card is in the right place.');
        sfx('ok');
        check.disabled = true;
        wrap.querySelectorAll('.chip, .bin-head').forEach(x => (x.disabled = true));
        onDone();
      } else {
        ctx.error();
        sfx('bad');
        out.className = 'fb fb-bad';
        out.hidden = false;
        out.innerHTML = '<b>' + wrong.length + ' card' + (wrong.length > 1 ? 's' : '') + ' went back to the pile.</b><ul>' +
          wrong.map(c => '<li>' + md(c._it.fb || 'Re-read this card.') + '</li>').join('') + '</ul>';
        wrong.forEach(c => { c.classList.remove('is-ok'); c.classList.add('is-bad'); pool.append(c); shake(c); });
        update();
      }
    });

    wrap.append(pool, h('div', { class: 'bins' }, binEls), h('div', { class: 'row' }, check), out);
    parent.append(wrap);
  };

  /* Build a sequence from a pool (packets, Parsons problems, procedures).
     items: [{t, indent?, distractor?, fb?}], accept: optional list of acceptable text sequences. */
  NX.order = function (parent, { items, accept, ctx, onDone, mono, okText, label }) {
    const need = items.filter(i => !i.distractor);
    const accepted = accept || [need.map(i => i.t)];
    const wrap = h('div', { class: 'order' + (mono ? ' mono' : '') });
    wrap._accept = accepted;
    const seq = h('ol', { class: 'seq', 'aria-label': label || 'Your sequence' });
    const src = h('div', { class: 'src', role: 'group', 'aria-label': 'Available items' });
    const out = fbEl();
    const check = h('button', { class: 'btn', type: 'button', text: 'Check order', disabled: true });
    const pad = n => (mono ? '  '.repeat(n || 0) : '');

    const update = () => { check.disabled = seq.children.length !== need.length; };
    const toSeq = (btn) => {
      const li = h('li');
      btn.textContent = pad(btn._it.indent) + btn._it.t;
      li.append(btn);
      seq.append(li);
      btn.classList.remove('is-bad', 'is-ok');
      update();
    };
    const toSrc = (btn) => {
      const li = btn.parentElement;
      btn.textContent = btn._it.t;
      src.append(btn);
      if (li && li.tagName === 'LI') li.remove();
      btn.classList.remove('is-bad', 'is-ok');
      update();
    };

    shuffle(items).forEach(it => {
      const b = h('button', { type: 'button', text: it.t });
      b._it = it;
      b.addEventListener('click', () => {
        if (b.disabled) return;
        sfx('click');
        if (b.parentElement === src) toSeq(b); else toSrc(b);
      });
      src.append(b);
    });

    check.addEventListener('click', () => {
      ctx.attempt();
      const btns = [...seq.querySelectorAll('button')];
      const got = btns.map(b => b._it.t);
      if (accepted.some(a => a.length === got.length && a.every((t, i) => t === got[i]))) {
        btns.forEach(b => b.classList.add('is-ok'));
        fb(out, 'ok', okText || 'Sequence correct.');
        sfx('ok');
        wrap.querySelectorAll('button').forEach(b => (b.disabled = true));
        src.hidden = true;
        onDone();
        return;
      }
      ctx.error();
      sfx('bad');
      const prefix = a => { let k = 0; while (k < got.length && a[k] === got[k]) k++; return k; };
      const k = Math.max(...accepted.map(prefix));
      btns.forEach((b, i) => b.classList.toggle('is-bad', i === k));
      const bad = btns[k];
      let msg = k === 0 ? 'The very first item is out of place.' : `Items 1–${k} are in the right place. Item ${k + 1} is not.`;
      if (bad && bad._it.distractor) msg += ' ' + (bad._it.fb || 'That item does not belong in the sequence at all.');
      fb(out, 'bad', msg);
      if (bad) shake(bad);
    });

    wrap.append(h('div', { class: 'small', text: 'Tap an item to add it. Tap a placed item to send it back.' }), seq,
      h('span', { class: 'eyebrow', text: 'Available' }), src, h('div', { class: 'row' }, check), out);
    parent.append(wrap);
  };

  /* Click the faulty line. lines: string[], bad: index, why: {index: fb} */
  NX.lineHunt = function (parent, { lines, bad, why, ctx, onDone, okText }) {
    const box = h('div', { class: 'lines', role: 'group', 'aria-label': 'Code lines. Select the faulty line.' });
    const out = fbEl();
    let done = false;
    lines.forEach((ln, i) => {
      const b = h('button', { type: 'button', 'aria-label': 'Line ' + (i + 1) + ': ' + ln.trim() },
        h('span', { class: 'ln', text: String(i + 1) }), h('span', { text: ln || ' ' }));
      b._bad = i === bad;
      b.addEventListener('click', () => {
        if (done) return;
        ctx.attempt();
        if (i === bad) {
          done = true;
          b.classList.add('is-ok');
          box.querySelectorAll('button').forEach(x => (x.disabled = true));
          fb(out, 'ok', okText || 'That is the faulty line.');
          sfx('ok');
          onDone();
        } else {
          b.classList.add('is-bad');
          b.disabled = true;
          fb(out, 'bad', (why && why[i]) || 'This line is valid. Keep scanning.');
          sfx('bad');
          ctx.error();
        }
      });
      box.append(b);
    });
    parent.append(box, out);
  };

  /* Written response, gated on a real attempt, then model answer + self-mark checklist. */
  NX.writeGate = function (parent, { id, prompt, min, model, checklist, ctx, onDone, placeholder }) {
    const need = min || 60;
    const tid = 'w-' + id;
    const wrap = h('div', { class: 'mcq' });
    const ta = h('textarea', { id: tid, placeholder: placeholder || 'Write your answer here before you see the model response.' });
    const count = h('span', { class: 'small', 'aria-live': 'polite' });
    const btn = h('button', { class: 'btn', type: 'button', text: 'Compare with model answer', disabled: true });
    const saved = (NX.S.notes.__drafts || {})[tid];
    if (saved) ta.value = saved;
    const sync = () => {
      const n = ta.value.replace(/\s+/g, ' ').trim().length;
      btn.disabled = n < need;
      count.textContent = n < need ? `${need - n} more characters to unlock the model answer` : 'Ready to compare';
      try { NX.S.notes.__drafts = Object.assign(NX.S.notes.__drafts || {}, { [tid]: ta.value }); NX.save(); } catch (e) { /* ignore */ }
    };
    ta.addEventListener('input', sync);
    sync();
    wrap.append(h('label', { for: tid, class: 'q', html: md(prompt) }), ta, h('div', { class: 'row' }, btn, count));

    btn.addEventListener('click', () => {
      ctx.attempt();
      ta.readOnly = true;
      btn.remove(); count.remove();
      const m = h('div', { class: 'model', tabindex: '-1', 'aria-live': 'polite' }, h('span', { class: 'eyebrow', text: 'Model response' }), h('p', { html: md(model) }));
      const checks = checklist.map((c, i) => {
        const cb = h('input', { type: 'checkbox', id: tid + '-c' + i });
        return { cb, row: h('label', { for: tid + '-c' + i }, cb, h('span', { html: md(c) })) };
      });
      const missed = h('input', { type: 'text', id: tid + '-missed', placeholder: 'The mark I missed, and why' });
      const done = h('button', { class: 'btn', type: 'button', text: 'Save self-mark' });
      done.addEventListener('click', () => {
        const got = checks.filter(c => c.cb.checked).length;
        const note = NX.S.notes[ctx.missionId || id] || {};
        NX.S.notes[ctx.missionId || id] = note;
        note['w:' + id] = { text: ta.value.trim(), score: got + '/' + checks.length, missed: missed.value.trim() };
        NX.save();
        done.disabled = true;
        done.textContent = `Saved: ${got}/${checks.length}`;
        sfx('ok');
        onDone();
      });
      wrap.append(m, h('span', { class: 'eyebrow', text: 'Mark your own answer: tick each point you actually made' }),
        h('div', { class: 'checklist' }, checks.map(c => c.row)),
        h('label', { for: tid + '-missed', class: 'small', text: 'Which mark did you miss, and why? (saved to Field notes)' }), missed, done);
      m.focus();
    });
    parent.append(wrap);
  };

  /* Mark an AI-generated answer: flag the flawed sentences. */
  NX.markAI = function (parent, { question, sentences, ctx, onDone }) {
    const wrap = h('div', { class: 'ai-answer' });
    wrap.append(h('p', { class: 'q', html: md(question) }));
    wrap.append(NX.bubble('ai', 'Here is my answer. Every sentence below is mine.'));
    const btns = sentences.map((s, i) => {
      const b = h('button', { class: 'sent', type: 'button', 'aria-pressed': 'false', html: '<b>' + (i + 1) + '.</b> ' + md(s.t) });
      b.addEventListener('click', () => { if (!b.disabled) { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); sfx('click'); } });
      b._s = s;
      return b;
    });
    const out = fbEl();
    let tries = 0;
    const submit = h('button', { class: 'btn', type: 'button', text: 'Submit my marking' });
    submit.addEventListener('click', () => {
      ctx.attempt();
      tries++;
      const missed = btns.filter(b => b._s.wrong && b.getAttribute('aria-pressed') !== 'true');
      const falseFlag = btns.filter(b => !b._s.wrong && b.getAttribute('aria-pressed') === 'true');
      if (!missed.length && !falseFlag.length) {
        sfx('ok');
        fb(out, 'ok', 'You caught every flaw without flagging a correct sentence. Here is why each one stands or falls:');
        btns.forEach(b => {
          b.disabled = true;
          if (!b._s.wrong) b.classList.add('was-ok');
          b.append(h('span', { class: 'why', html: md(b._s.fb) }));
        });
        submit.remove();
        onDone();
        return;
      }
      sfx('bad');
      ctx.error();
      if (tries === 1) {
        fb(out, 'bad', `${missed.length ? missed.length + ' flawed sentence' + (missed.length > 1 ? 's are' : ' is') + ' still unflagged. ' : ''}${falseFlag.length ? falseFlag.length + ' sentence' + (falseFlag.length > 1 ? 's you flagged are' : ' you flagged is') + ' actually correct.' : ''} Re-read each one against what you know and try again.`);
      } else {
        const bits = [];
        missed.forEach(b => bits.push('Sentence ' + (btns.indexOf(b) + 1) + ' has a flaw you have not flagged.'));
        falseFlag.forEach(b => bits.push('Sentence ' + (btns.indexOf(b) + 1) + ' is correct.'));
        fb(out, 'bad', bits.join(' '));
      }
    });
    wrap.append(...btns, h('div', { class: 'small', text: 'Tap every sentence that contains an error, then submit.' }), h('div', { class: 'row' }, submit), out);
    parent.append(wrap);
  };

  /* Desk-check trace table. cols: [{key, label}], rows: [{key: value}], given: number of worked rows. */
  NX.trace = function (parent, { cols, rows, given, ctx, onDone }) {
    const table = h('table', { class: 'trace' });
    table.append(h('thead', null, h('tr', null, cols.map(c => h('th', { scope: 'col', text: c.label })))));
    const tb = h('tbody');
    const inputs = [];
    rows.forEach((r, ri) => {
      const tr = h('tr');
      cols.forEach(c => {
        if (ri < (given || 0) || c.fixed) tr.append(h('td', { class: 'given', text: String(r[c.key]) }));
        else {
          const inp = h('input', { type: 'text', inputmode: c.numeric ? 'numeric' : 'text', autocomplete: 'off', 'aria-label': `${c.label}, row ${ri + 1}` });
          inp._want = String(r[c.key]);
          inputs.push(inp);
          tr.append(h('td', null, inp));
        }
      });
      tb.append(tr);
    });
    table.append(tb);
    const out = fbEl();
    const check = h('button', { class: 'btn', type: 'button', text: 'Check trace' });
    check.addEventListener('click', () => {
      ctx.attempt();
      if (inputs.some(i => !i.value.trim())) { fb(out, 'info', 'Fill every empty cell first. A desk check records every value, one step at a time.'); return; }
      const norm = v => v.trim().replace(/^["']|["']$/g, '').toUpperCase();
      let wrong = 0;
      inputs.forEach(i => {
        const ok = norm(i.value) === norm(i._want);
        i.classList.toggle('is-bad', !ok);
        i.classList.toggle('is-ok', ok);
        if (!ok) wrong++;
      });
      if (!wrong) {
        fb(out, 'ok', 'Your trace matches the algorithm step for step.');
        sfx('ok');
        inputs.forEach(i => (i.readOnly = true));
        check.remove();
        onDone();
      } else {
        ctx.error();
        sfx('bad');
        const firstBad = inputs.find(i => i.classList.contains('is-bad'));
        fb(out, 'bad', `${wrong} cell${wrong > 1 ? 's' : ''} disagree with the algorithm. Find the earliest red cell: later errors often follow from it.`);
        firstBad.focus();
      }
    });
    parent.append(h('div', { class: 'trace-wrap' }, table), h('div', { class: 'row' }, check), out);
  };
})();
