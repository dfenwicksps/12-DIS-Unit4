/* Impact Court — personal, social and economic impacts; evaluating options against criteria. */
(function () {
  const { h, md, fb, fbEl, sfx, shake } = NX;

  NX.register({
    id: 'impacts', line: 'req', order: 2, title: 'Impact Court', short: 'Impacts and evaluation',
    map: { x: 470, y: 460, label: 'below' },
    requires: ['privacy'],
    syllabus: 'Personal, social and economic impacts of data exchange solutions; evaluating options against prescribed criteria and justifying a recommendation.',
    brief: [
      { who: 'rin', text: 'The NEXUS board wants to replace card readers with **facial-recognition gates**: no card, just walk through. Before anyone signs, we need to know who wins, who loses, and whether it meets the brief.' }
    ],
    warmup: {
      q: 'Recall from Privacy Plaza: NEXUS backs up rider data to an overseas provider without checking its protections. Which principle does that breach?',
      options: [
        { t: 'APP 8: cross-border disclosure', ok: true, fb: 'Reasonable steps are needed before data goes overseas.' },
        { t: 'APP 3: collection', fb: 'The data was collected legitimately. The problem is where it was sent.' },
        { t: 'APP 12: access', fb: 'APP 12 is about riders seeing their own data.' }
      ]
    },
    rounds: [
      {
        title: 'Sort the impacts',
        intro: 'Sort each consequence of the facial-recognition gates by **the kind of impact it mainly has**.',
        hints: [
          'Personal: one individual’s privacy, safety or convenience. Social: communities or society as a whole. Economic: money, costs, jobs, revenue.',
          'Ask who feels it: “a rider” is usually personal, “groups or the public” social, and “the budget or businesses” economic.'
        ],
        run(el, ctx) {
          NX.tapSort(el, {
            ctx, onDone: () => ctx.complete(),
            bins: [
              { id: 'personal', label: 'Personal', desc: 'An individual rider' },
              { id: 'social', label: 'Social', desc: 'Communities and society' },
              { id: 'economic', label: 'Economic', desc: 'Money, costs, jobs' }
            ],
            items: [
              { t: 'A rider no longer needs to carry a card or phone', bin: 'personal', fb: 'Convenience for one individual rider is a **personal** impact.' },
              { t: 'If a rider’s face data leaks, they cannot change their face the way they change a password', bin: 'personal', fb: 'The lasting risk to one person’s biometric privacy is **personal**.' },
              { t: 'Misidentification rates are higher for some groups, damaging trust across communities', bin: 'social', fb: 'Unequal effects across groups, and trust in the community, are **social** impacts.' },
              { t: 'Constant camera identification normalises surveillance in public spaces', bin: 'social', fb: 'A change in society’s expectations of privacy in public is **social**.' },
              { t: 'The gates cost $18 million to install', bin: 'economic', fb: 'A capital cost is **economic**.' },
              { t: 'Fare evasion falls, raising revenue by $2 million a year', bin: 'economic', fb: 'A revenue change is **economic**.' }
            ],
            okText: 'All sorted. In an exam, name the stakeholder and say whether each impact is positive or negative, not just its category.'
          });
        }
      },
      {
        title: 'Two good options',
        intro: 'The board has shortlisted two options. Check each against the **prescribed criteria**, then make a recommendation.',
        hints: [
          'Check each cell against the facts on the option cards only. Don’t assume anything the cards don’t say.',
          'Neither option meets every criterion. Your recommendation must name the trade-off and say which criterion matters more for NEXUS riders, and why.'
        ],
        run(el, ctx) {
          el.append(h('div', { class: 'opt-cards' },
            h('div', { class: 'opt-card' }, h('h4', { text: 'Option A · Facial-recognition gates' }),
              h('ul', null, h('li', { text: 'Cost: $18M' }), h('li', { text: 'Stores a biometric template of every rider’s face' }), h('li', { text: 'Riders carry nothing' }))),
            h('div', { class: 'opt-card' }, h('h4', { text: 'Option B · Tap card or phone with tokenised IDs' }),
              h('ul', null, h('li', { text: 'Cost: $3M' }), h('li', { text: 'Stores a random token, no biometric data' }), h('li', { text: 'Riders must carry a card or phone' })))));

          const CRIT = [
            { c: 'Protects rider privacy: no biometric data stored', want: [false, true] },
            { c: 'Within the $5M budget', want: [false, true] },
            { c: 'Riders do not need to carry anything', want: [true, false] }
          ];
          const state = CRIT.map(() => [null, null]);
          const tbl = h('table', { class: 'matrix' });
          tbl.append(h('thead', null, h('tr', null, h('th', { text: 'Criterion' }), h('th', { text: 'Option A' }), h('th', { text: 'Option B' }))));
          const tb = h('tbody');
          const cells = [];
          CRIT.forEach((row, r) => {
            const tr = h('tr', null, h('td', { text: row.c }));
            [0, 1].forEach(o => {
              const b = h('button', { type: 'button', text: '?', 'aria-label': `${row.c}, option ${o ? 'B' : 'A'}: not decided` });
              b.addEventListener('click', () => {
                state[r][o] = state[r][o] === true ? false : true;
                b.textContent = state[r][o] ? '✓ Meets' : '✗ Does not';
                b.setAttribute('aria-label', `${row.c}, option ${o ? 'B' : 'A'}: ${state[r][o] ? 'meets' : 'does not meet'}`);
                b.classList.remove('is-bad', 'is-ok');
                sfx('click');
              });
              cells.push({ b, r, o });
              tr.append(h('td', null, b));
            });
            tb.append(tr);
          });
          tbl.append(tb);
          const out = fbEl();
          const check = h('button', { class: 'btn', type: 'button', text: 'Check matrix' });
          check.addEventListener('click', () => {
            if (state.some(r => r.includes(null))) { fb(out, 'info', 'Decide every cell first. Tap to toggle between meets and does not.'); return; }
            ctx.attempt();
            const wrong = cells.filter(c => state[c.r][c.o] !== CRIT[c.r].want[c.o]);
            cells.forEach(c => c.b.classList.toggle('is-ok', !wrong.includes(c)));
            if (wrong.length) {
              ctx.error(); sfx('bad');
              wrong.forEach(c => { c.b.classList.add('is-bad'); shake(c.b); });
              fb(out, 'bad', `${wrong.length} cell${wrong.length > 1 ? 's do' : ' does'} not match the option cards. Re-read the cost, the data stored, and what riders must carry.`);
              return;
            }
            sfx('ok');
            check.remove();
            cells.forEach(c => (c.b.disabled = true));
            fb(out, 'ok', 'Option A meets one criterion, Option B meets two. But **counting ticks is not evaluating**. Which criterion matters most, and why?');
            NX.writeGate(el, {
              id: 'impacts-rec', ctx, min: 120,
              prompt: 'Recommend one option to the NEXUS board. Refer to at least two criteria, use evidence from the option cards, and acknowledge the trade-off.',
              placeholder: 'I recommend Option … because …',
              model: 'I recommend **Option B**. It meets the privacy criterion because it stores only a random token rather than a biometric template, so a breach exposes nothing a rider cannot replace. It also meets the budget criterion at $3M against Option A’s $18M, which is more than three times over the $5M limit. The trade-off is that riders must still carry a card or phone, so it fails the “carry nothing” criterion. That is a small inconvenience compared with the permanent risk of leaked face data and a budget blow-out, so Option B better meets NEXUS’s needs.',
              checklist: [
                'Made a clear recommendation (names one option)',
                'Judged the options against **at least two criteria**, quoting **evidence** from the cards (e.g. $3M vs $18M, token vs biometric)',
                'Acknowledged the **trade-off**, i.e. the criterion the recommended option fails',
                'Justified why the chosen criteria **outweigh** the one it fails (a reason, not just a tick count)'
              ],
              onDone: () => ctx.complete()
            });
          });
          el.append(h('div', { class: 'table-scroll' }, tbl), h('div', { class: 'row' }, check), out);
        }
      }
    ],
    keyIdeas: [
      '**Personal** impacts affect individuals (privacy, safety, convenience). **Social** impacts affect communities and society (equity, trust, norms). **Economic** impacts involve money (costs, revenue, jobs).',
      'For each impact, name the **stakeholder** and whether it is **positive or negative**.',
      'To **evaluate**, check each option against the **prescribed criteria** using evidence from the scenario.',
      'A strong recommendation names the **trade-off** and justifies why some criteria outweigh others. Counting ticks is not a justification.'
    ]
  });
})();
