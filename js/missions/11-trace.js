/* Trace Tunnel — predict, then desk-check validation and cipher algorithms. */
(function () {
  const { h, fb, fbEl, sfx } = NX;

  const CARD = [4, 7, 3, 8, 2];
  function cardTrace(digits) {
    let total = 0;
    const rows = digits.map((dig, i) => {
      let d = dig;
      if (i % 2 === 1) { d = d * 2; if (d > 9) d = d - 9; }
      total += d;
      return { i, digit: dig, d, total };
    });
    return { rows, valid: total % 10 === 0, total };
  }

  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function shiftTrace(word, k) {
    let result = '';
    return [...word].map(ch => {
      let n = A.indexOf(ch) + k;
      if (n > 25) n -= 26;
      result += A[n];
      return { ch, n, result };
    });
  }

  NX.register({
    id: 'trace', line: 'proto', order: 2, title: 'Trace Tunnel', short: 'Desk checking',
    map: { x: 810, y: 100, label: 'above' },
    requires: ['algorithms'],
    syllabus: 'Desk checking algorithms with trace tables; predicting outputs; validating data before it is exchanged.',
    brief: [
      { who: 'rin', text: 'Last tunnel before the Core. No simulator down here, just you, a pencil and a **trace table**, the same as in the exam room. Predict first, then prove it line by line.' }
    ],
    warmup: {
      q: 'Recall from Algorithm Works: the requirement is “quantity from 1 to 5 inclusive”. Which test set checks the boundaries best?',
      options: [
        { t: '0, 1, 5, 6', ok: true, fb: 'On and just outside each boundary.' },
        { t: '2, 3, 4', fb: 'All typical values. None of them sits on or next to a boundary.' },
        { t: '−100, 100', fb: 'Extreme values miss the exact edges, where off-by-one errors hide.' }
      ]
    },
    rounds: [
      {
        title: 'Card check digit',
        intro: 'NEXUS validates card numbers **before** sending them to the payment API, which saves a wasted request and a 400 error. Here is the check:',
        hints: [
          'Only the rows where `i` is odd (1 and 3) get doubled. Record the value of `d` after all the changes on that pass.',
          'For i = 1: 7 × 2 = 14, which is greater than 9, so take 9 away. Keep a running total that you add `d` to on every row.'
        ],
        run(el, ctx) {
          el.append(NX.codeBlock([
            'BEGIN CheckCard(digits)',
            '  total ← 0',
            '  FOR i ← 0 TO LENGTH(digits) - 1',
            '    d ← digits[i]',
            '    IF i MOD 2 = 1 THEN',
            '      d ← d * 2',
            '      IF d > 9 THEN',
            '        d ← d - 9',
            '      ENDIF',
            '    ENDIF',
            '    total ← total + d',
            '  ENDFOR',
            '  RETURN total MOD 10 = 0',
            'END'
          ].join('\n')));
          el.append(h('p', { class: 'q', html: 'Input: <code>digits = [' + CARD.join(', ') + ']</code>' }));
          const T = cardTrace(CARD);
          const out = fbEl();
          const predRow = h('div', { class: 'row' });
          el.append(h('p', { text: 'Before you trace: predict what CheckCard returns.' }), predRow, out);
          ['TRUE', 'FALSE'].forEach(v => {
            const b = h('button', { class: 'btn ghost', type: 'button', text: v });
            b.addEventListener('click', () => {
              ctx.attempt();
              predRow.querySelectorAll('button').forEach(x => (x.disabled = true));
              b.style.borderColor = 'var(--ink)';
              fb(out, 'info', `You predicted **${v}**. Now prove it. The first row has been done for you.`);
              NX.trace(el, {
                ctx, given: 1,
                cols: [{ key: 'i', label: 'i', fixed: true }, { key: 'digit', label: 'digits[i]', fixed: true }, { key: 'd', label: 'd', numeric: true }, { key: 'total', label: 'total', numeric: true }],
                rows: T.rows,
                onDone: () => {
                  const right = (v === 'TRUE') === T.valid;
                  el.append(h('div', { class: 'fb ' + (right ? 'fb-ok' : 'fb-info'), html:
                    `total = ${T.total}, and ${T.total} MOD 10 = ${T.total % 10}, so CheckCard returns <strong>${T.valid ? 'TRUE' : 'FALSE'}</strong>. ` +
                    (right ? 'Your prediction held up.' : 'Your prediction was wrong. Which step did you not expect?') }));
                  const inp = h('input', { type: 'number', id: 'fix-digit', min: '0', max: '9', style: 'max-width:6em' });
                  const go = h('button', { class: 'btn', type: 'button', text: 'Test it' });
                  const o2 = fbEl();
                  go.addEventListener('click', () => {
                    const x = parseInt(inp.value, 10);
                    if (Number.isNaN(x) || x < 0 || x > 9) { fb(o2, 'info', 'Enter a single digit, 0–9.'); return; }
                    ctx.attempt();
                    const r = cardTrace(CARD.slice(0, 4).concat([x]));
                    if (r.valid) { fb(o2, 'ok', `With ${x} the total is ${r.total}, a multiple of 10. That is how a **check digit** is chosen: it makes a valid number pass, and a single mistyped digit fails.`); sfx('ok'); go.disabled = true; inp.readOnly = true; ctx.complete(); }
                    else { ctx.error(); sfx('bad'); fb(o2, 'bad', `With ${x} the total is ${r.total}, which is not a multiple of 10. Index 4 is even, so the last digit is added without doubling.`); }
                  });
                  el.append(h('label', { for: 'fix-digit', class: 'q', text: 'Transfer: change only the last digit so the card is valid. Which digit works?' }),
                    h('div', { class: 'row' }, inp, go), o2);
                }
              });
            });
            predRow.append(b);
          });
        }
      },
      {
        title: 'Trace the shift',
        intro: 'HEX’s crew encode their meeting points with this routine. Trace `Shift("HEX", 9)`, where `POSITION("A") = 0` … `POSITION("Z") = 25`.',
        hints: [
          'Find each letter’s position, add 9, and wrap round if the result is past 25.',
          'H = 7, E = 4, X = 23. The only letter that needs the wrap is X: 23 + 9 = 32, which is more than 25, so subtract 26.'
        ],
        run(el, ctx) {
          el.append(NX.codeBlock([
            'BEGIN Shift(word, k)',
            '  result ← ""',
            '  FOR EACH ch IN word',
            '    n ← POSITION(ch) + k',
            '    IF n > 25 THEN',
            '      n ← n - 26',
            '    ENDIF',
            '    result ← result + LETTER(n)',
            '  ENDFOR',
            '  RETURN result',
            'END'
          ].join('\n')));
          const rows = shiftTrace('HEX', 9);
          NX.trace(el, {
            ctx, given: 0,
            cols: [{ key: 'ch', label: 'ch', fixed: true }, { key: 'n', label: 'n (final)', numeric: true }, { key: 'result', label: 'result' }],
            rows,
            onDone: () => NX.mcq(el, {
              q: 'Which line stops `Shift("XYZ", 3)` from crashing or producing a character that is not a letter?',
              ctx, onDone: () => ctx.complete(),
              options: [
                { t: 'The `IF n > 25 THEN n ← n - 26` wrap-around.', ok: true, fb: 'Without it, X + 3 = 26, which is past Z. There is no LETTER(26).' },
                { t: '`result ← ""`', fb: 'That only starts the result off empty.' },
                { t: '`FOR EACH ch IN word`', fb: 'The loop visits each letter. It does not keep positions in range.' }
              ]
            })
          });
        }
      }
    ],
    keyIdeas: [
      'A **desk check** records every variable’s value after each step. Always **predict first**, then trace, then explain any difference.',
      'Record the **final** value of a variable on each pass when it changes more than once inside the loop.',
      'A **check digit** lets a system catch mistyped numbers before sending them. That is validation at the source.',
      '**Wrap-around** (`n - 26`, or `MOD 26`) keeps a cipher’s positions inside the alphabet.'
    ]
  });
})();
