/* Automated playthrough: solves every mission in order in headless Chromium,
   and fails on console errors, stuck steps or horizontal overflow at phone width.
   Run: node tests/playthrough.js   (needs Playwright; set NODE_PATH to a global install if required) */
const path = require('path');
const { chromium } = require('playwright');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const ORDER = ['packets', 'formats', 'cipher', 'keys', 'hash', 'api', 'privacy', 'impacts', 'usability', 'algorithms', 'trace', 'core'];

// Runs inside the page: performs one action on the current mission step. Returns a status string.
function tick() {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const vis = el => el && !el.closest('[hidden]') && el.offsetParent !== null;
  const click = el => { el.click(); return true; };
  const byText = re => $$('.stage button').filter(b => !b.disabled && vis(b) && re.test(b.textContent.trim()));
  const setVal = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  const stage = $('.stage');
  if (!stage || $('#mission-view').hidden) return 'map';
  const T = window.__t || (window.__t = { hs: new Set() });

  if (byText(/^Back to map$/).length) return 'debrief';

  // Write gates
  const ta = $$('textarea[id^="w-"]').find(t => !t.readOnly);
  if (ta) {
    setVal(ta, 'This is a deliberately long test answer that refers to the criteria, the evidence in the scenario and the trade-off involved in the decision.');
    const b = byText(/^Compare with model answer$/)[0];
    return b ? click(b) && 'write' : 'write-locked';
  }
  const save = byText(/^Save self-mark$/)[0];
  if (save) { $$('.checklist input').forEach(c => (c.checked = true)); return click(save) && 'selfmark'; }

  // Mark the AI
  const sents = $$('.sent').filter(s => !s.disabled);
  if (sents.length) {
    sents.forEach(s => s.setAttribute('aria-pressed', String(!!s._s.wrong)));
    return click(byText(/^Submit my marking$/)[0]) && 'markai';
  }

  // Caesar
  const pred = $('#caesar-pred');
  if (pred && !pred.disabled) { setVal(pred, '25'); return click(byText(/^Commit prediction$/)[0]) && 'caesar-pred'; }
  const k = $('#caesar-k');
  if (k && !k.disabled && vis(k)) { setVal(k, '11'); return click(byText(/^Lock in this key$/)[0]) && 'caesar'; }

  // XOR
  const grid = $$('.bits').find(g => $$('button.b', g).some(b => !b.disabled));
  if (grid) {
    const spans = $$('span.b', grid).map(s => +s.textContent);
    const want = spans.slice(0, 8).map((v, i) => v ^ spans[8 + i]);
    $$('button.b', grid).forEach((b, i) => { if (b._v !== want[i]) b.click(); });
    return click(byText(/^Check bits$/)[0]) && 'xor';
  }

  // Avalanche
  const aval = $('#aval');
  if (aval && !aval.disabled) return click(byText(/^Commit prediction$/)[0]) && 'aval';

  // Keys
  const run = byText(/^Run it$/)[0];
  if (run) {
    const keys = $$('.keytray .key');
    $$('.slot').forEach(s => {
      if (s.classList.contains('is-ok')) return;
      s._n = (s._n == null ? 0 : s._n + 1) % 4;
      keys[s._n].click(); s.click();
    });
    return click(run) && 'keys';
  }

  // API
  const send = byText(/^Send request$/)[0];
  if (send) {
    const [segM, segE] = $$('.seg');
    const term = $('.terminal').textContent;
    T.m = T.m == null ? 0 : T.m; T.e = T.e == null ? 0 : T.e;
    if (/405/.test(term) && T.last !== term) T.m++;
    if (/404/.test(term) && T.last !== term) T.e++;
    T.last = term;
    $$('button', segM)[T.m % 4].click(); $$('button', segE)[T.e % 3].click();
    return click(send) && 'api';
  }
  if (!$('.seg') && T.m != null) { T.m = T.e = null; T.last = null; }

  // Hash tamper
  const calc = byText(/^Compute SHA-256$/);
  if (calc.length) { calc.forEach(b => b.click()); return 'hash-calc'; }
  const pick = byText(/^This file was tampered with$/)[0];
  if (pick && !$('.mcq .opt', stage.lastElementChild)) return click(pick) && 'hash-pick';

  // Privacy verdict
  const verdict = $$('.verdict button').find(b => !b.disabled);
  if (verdict) return click(verdict) && 'verdict';

  // Impacts matrix
  const mbtns = $$('.matrix button').filter(b => !b.disabled);
  if (mbtns.length && byText(/^Check matrix$/).length) {
    mbtns.filter(b => b.textContent === '?' || b.classList.contains('is-bad')).forEach(b => b.click());
    return click(byText(/^Check matrix$/)[0]) && 'matrix';
  }

  // Usability
  const tagger = $('.tagger');
  if (tagger && !tagger.hidden) {
    const tried = T.tried || (T.tried = new Set());
    const b = $$('.principles button', tagger).find(x => !tried.has(T.cur + x.textContent));
    tried.add(T.cur + b.textContent);
    return click(b) && 'tag';
  }
  const hs = $$('.phone .hs').find(x => !x.classList.contains('found') && !T.hs.has(x.getAttribute('aria-label')));
  if (hs) {
    const lab = hs.getAttribute('aria-label');
    if (/footer/.test(lab)) T.hs.add(lab);
    T.cur = lab;
    return click(hs) && 'hotspot';
  }

  // Trace prediction and transfer
  const tf = byText(/^(FALSE)$/)[0];
  if (tf) return click(tf) && 'predict';
  const tin = $$('table.trace input').filter(i => !i.readOnly);
  if (tin.length) { tin.forEach(i => setVal(i, i._want)); return click(byText(/^Check trace$/)[0]) && 'trace'; }
  const fix = $('#fix-digit');
  if (fix && !fix.readOnly) { setVal(fix, '1'); return click(byText(/^Test it$/)[0]) && 'fix'; }

  // Line hunt
  const lines = $$('.lines').find(l => !$('button.is-ok', l));
  if (lines) {
    const wrong = $$('button', lines).find(b => !b.disabled && !b._bad && !T.lhWrong);
    if (wrong) { T.lhWrong = true; return click(wrong) && 'line-wrong'; }
    T.lhWrong = false;
    return click($$('button', lines).find(b => b._bad)) && 'line';
  }

  // MCQ: try one wrong answer first (exercises feedback), then the right one
  const mcq = $$('.mcq').find(m => $$('.opt', m).length && !$('.opt.is-ok', m) && $$('.opt', m).some(o => !o.disabled));
  if (mcq) {
    const opts = $$('.opt', mcq).filter(o => !o.disabled);
    const wrongs = opts.filter(o => !o._ok);
    const inBoss = !!$('.health');
    if (!inBoss && wrongs.length && !mcq._triedWrong) { mcq._triedWrong = true; return click(wrongs[0]) && 'mcq-wrong'; }
    return click(opts.find(o => o._ok)) && 'mcq';
  }

  // Tap sort
  const chip = $('.pool .chip');
  if (chip) {
    chip.click();
    const bin = $$('.bin', chip.closest('.sort')).find(b => b._id === chip._it.bin);
    return click($('.bin-head', bin)) && 'sort';
  }
  const chk = byText(/^Check sort$/)[0];
  if (chk) return click(chk) && 'sort-check';

  // Order
  const ord = $$('.order').find(o => !$('.src', o).hidden);
  if (ord) {
    const seq = $('.seq', ord), src = $('.src', ord);
    $$('button', seq).forEach(b => b.click());
    ord._accept[0].forEach(t => { const b = $$('button', src).find(x => x._it.t === t); b.click(); });
    return click(byText(/^Check order$/).find(b => ord.contains(b))) && 'order';
  }

  // Navigation
  const nav = byText(/^(Start mission|Next stop ▸|Finish mission|Final challenge ▸|Restore the Core ▸|Next question|Next record|Next job|Next practice|Next attack|Reboot the Core and try again)$/)[0];
  if (nav) return click(nav) && 'nav:' + nav.textContent.trim();
  return 'stuck';
}

(async () => {
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const errors = [];
  let failed = false;
  for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport: vp });
    page.on('pageerror', e => errors.push(`[${vp.width}] pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_CERT_AUTHORITY_INVALID|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED/.test(m.text())) errors.push(`[${vp.width}] console: ${m.text()}`); });
    await page.goto(URL);
    const stations = await page.$$eval('.map-svg .st', n => n.length);
    console.log(`viewport ${vp.width}: ${stations} stations on map`);
    for (const id of ORDER) {
      const open = await page.$eval(`.guide-line button[aria-label^="${await page.evaluate(i => NX.byId(i).title, id)}"]`, b => !b.disabled);
      if (!open) { console.log(`  FAIL ${id} is still locked`); failed = true; break; }
      await page.evaluate(i => { window.__t = null; NX.openMission(i); }, id);
      let status = '', n = 0, stuck = 0, maxOverflow = 0;
      while (n++ < 400) {
        status = await page.evaluate(tick);
        const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        maxOverflow = Math.max(maxOverflow, ov);
        if (status === 'debrief') break;
        if (status === 'stuck' || status === 'write-locked') { if (++stuck > 3) break; } else stuck = 0;
        await page.waitForTimeout(15);
      }
      const stars = await page.evaluate(i => (NX.S.progress[i] || {}).stars || 0, id);
      const ok = status === 'debrief' && stars > 0 && maxOverflow <= 1;
      if (!ok) failed = true;
      console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${id.padEnd(11)} ${n} actions, ${stars}★, overflow ${maxOverflow}px${ok ? '' : ' (last status: ' + status + ')'}`);
      if (status !== 'debrief') {
        await page.screenshot({ path: path.join(process.env.SHOTS || __dirname, `stuck-${id}-${vp.width}.png`), fullPage: true });
        break;
      }
      await page.evaluate(() => NX.showMap());
    }
    await page.close();
  }
  await browser.close();
  if (errors.length) { failed = true; console.log('Errors:\n' + errors.join('\n')); }
  console.log(failed ? 'PLAYTHROUGH FAILED' : 'PLAYTHROUGH PASSED');
  process.exit(failed ? 1 : 0);
})();
