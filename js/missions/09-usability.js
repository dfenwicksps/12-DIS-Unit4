/* Usability Lab — find and classify usability flaws in a rider app screen. */
(function () {
  const { h, md, fb, fbEl, sfx, shake } = NX;

  const PRINCIPLES = {
    accessibility: 'Accessibility',
    effectiveness: 'Effectiveness',
    safety: 'Safety',
    utility: 'Utility',
    learnability: 'Learnability'
  };

  const FLAWS = {
    icons: { p: 'learnability', fb: 'Unlabelled, unfamiliar icons and a layout unlike every other screen make the app hard to learn. That is **learnability**.' },
    balance: { p: 'accessibility', fb: 'Pale grey text on white fails contrast requirements, so riders with low vision cannot read their balance. That is **accessibility**.' },
    amounts: { p: 'utility', fb: 'The app does not offer the function riders need: most students top up $10–$20. Missing functionality is **utility**.' },
    actions: { p: 'safety', fb: 'A destructive action sits beside the most common one, looks identical, and has no confirmation or undo. Protecting users from serious errors is **safety**.' },
    steps: { p: 'effectiveness', fb: 'Riders often cannot finish the task at all: seven steps and a 20-second timeout. Failing to let users complete their goal is **effectiveness**.' }
  };

  NX.register({
    id: 'usability', line: 'req', order: 3, title: 'Usability Lab', short: 'Usability principles',
    map: { x: 610, y: 460, label: 'below' },
    requires: ['impacts'],
    syllabus: 'Evaluating the user interface of a data exchange solution against usability principles: accessibility, effectiveness, safety, utility and learnability.',
    brief: [
      { who: 'rin', text: 'HEX’s crew “redesigned” the top-up screen in the rider app. Complaints are pouring in. Find what is wrong and name the **usability principle** each flaw breaks, so the fix goes to the right team.' }
    ],
    warmup: {
      q: 'Recall from Impact Court: which of these is a **social** impact of a cashless fare system?',
      options: [
        { t: 'Riders without a bank account are excluded from public transport.', ok: true, fb: 'Unequal access across a group in society is a social impact.' },
        { t: 'Cash-handling costs fall by $400,000 a year.', fb: 'That is economic.' },
        { t: 'One rider saves two minutes every morning.', fb: 'That is personal.' }
      ]
    },
    rounds: [
      {
        title: 'Find the flaws',
        intro: 'There are **five** flaws on this screen. Tap an area of the phone, then choose the principle it breaks.',
        hints: [
          'Think like different riders: someone with low vision, a first-time user, a student topping up $10, someone in a hurry at the gate.',
          'Look at: the header icons, the balance text, the amount buttons, the two action buttons, and the step counter.'
        ],
        run(el, ctx) {
          const found = new Set();
          const out = fbEl();
          const list = h('ol', { class: 'found-list' });
          const tagger = h('div', { class: 'tagger', hidden: true, 'aria-live': 'polite' });
          let active = null;

          const hs = (id, label, content, fine) => {
            const b = h('button', { class: 'hs', type: 'button', 'aria-label': 'Screen area: ' + label }, content);
            b.addEventListener('click', () => {
              if (b.classList.contains('found')) return;
              sfx('click');
              if (fine) { if (active) active.b.classList.remove('active'); fb(out, 'info', fine); tagger.hidden = true; active = null; return; }
              if (active) active.b.classList.remove('active');
              active = { id, b };
              b.classList.add('active');
              out.hidden = true;
              tagger.hidden = false;
              tagger.querySelector('.q').textContent = 'Which principle does this area break?';
              tagger.querySelector('button').focus();
            });
            return b;
          };

          const phone = h('div', { class: 'phone', role: 'group', 'aria-label': 'Mock NEXUS Top-Up screen' },
            h('div', { class: 'ph-status' }, h('span', { text: '07:02' }), h('span', { text: '5G ▮▮▮' })),
            h('div', { class: 'ph-body' },
              hs('icons', 'header with title and icons', h('div', { class: 'ph-icons' }, h('span', { class: 't', text: 'NEXUS Top-Up' }), h('span', { class: 'ic', 'aria-hidden': 'true', text: '⟁ ⌬ ◈' }))),
              hs('balance', 'balance, $4.20', h('div', null, h('div', { style: 'font-size:.75rem;color:#999', text: 'Balance' }), h('div', { class: 'ph-bal', text: '$4.20' }))),
              hs('amounts', 'amount choices $100, $200, $300', h('div', null, h('div', { style: 'font-size:.75rem;color:#555;margin-bottom:4px', text: 'Choose amount' }), h('div', { class: 'ph-amts' }, h('span', { text: '$100' }), h('span', { text: '$200' }), h('span', { text: '$300' })))),
              hs('actions', 'Top up and Delete account buttons side by side', h('div', { class: 'ph-actions' }, h('span', { text: 'Top up' }), h('span', { text: 'Delete account' }))),
              hs('steps', 'step counter: step 1 of 7, session expires in 20 seconds', h('div', { class: 'ph-step', text: 'Step 1 of 7 · Session expires in 20 s' })),
              hs('foot', 'footer with Help link and signed-in name', h('div', { class: 'ph-foot' }, h('span', { text: 'Help' }), h('span', { text: 'Signed in as Mia T.' })), 'The help link and the signed-in name are clear and useful. This area is fine.')));

          const pbtns = h('div', { class: 'principles' }, Object.entries(PRINCIPLES).map(([k, lab]) => {
            const b = h('button', { class: 'btn ghost', type: 'button', text: lab });
            b.addEventListener('click', () => {
              if (!active) return;
              ctx.attempt();
              const f = FLAWS[active.id];
              if (k === f.p) {
                found.add(active.id);
                active.b.classList.remove('active');
                active.b.classList.add('found');
                active.b.dataset.n = found.size;
                list.append(h('li', { html: md(f.fb) }));
                sfx('ok');
                fb(out, 'ok', `${found.size} of 5 found.`);
                tagger.hidden = true;
                active = null;
                if (found.size === 5) {
                  fb(out, 'ok', 'All five flaws found and classified.');
                  NX.mcq(el, {
                    q: 'The client insists: “**Delete account** must stay on this screen.” What is the smallest change that fixes the safety flaw?',
                    ctx, onDone: () => ctx.complete(),
                    options: [
                      { t: 'Move it away from “Top up”, style it differently, and require confirmation (for example typing DELETE) before it acts.', ok: true, fb: 'This respects the client’s constraint while preventing accidental taps and giving the user a way back. Both are safety measures.' },
                      { t: 'Remove the button entirely.', fb: 'That fixes safety but breaks the client’s stated constraint. A redesign must work within the requirements.' },
                      { t: 'Change its colour to blue so it matches the other buttons.', fb: 'It already matches the other button. That is part of the problem, because the destructive action looks like the safe one.' },
                      { t: 'Add a tooltip explaining what the button does.', fb: 'A tooltip does not stop an accidental tap, and phones have no hover.' }
                    ]
                  });
                }
              } else {
                ctx.error(); sfx('bad'); shake(b);
                fb(out, 'bad', `Not **${lab}**. ` + {
                  accessibility: 'Accessibility is about riders with different abilities being able to perceive and use it.',
                  effectiveness: 'Effectiveness is about whether riders can actually complete their task.',
                  safety: 'Safety is about protecting riders from serious errors and helping them recover.',
                  utility: 'Utility is about whether the app offers the functions riders need.',
                  learnability: 'Learnability is about how easily a new rider works out how to use it.'
                }[k]);
              }
            });
            return b;
          }));
          tagger.append(h('p', { class: 'q' }), pbtns);

          el.append(h('div', { class: 'phone-wrap' }, phone, h('div', { style: 'display:grid;gap:10px;min-width:0' }, tagger, out, h('span', { class: 'eyebrow', text: 'Flaw report' }), list)));
        }
      }
    ],
    keyIdeas: [
      '**Accessibility**: people with a wide range of abilities can perceive and use the interface (contrast, text size, labels, screen-reader support).',
      '**Effectiveness**: users can complete their task accurately and completely.',
      '**Safety**: the interface prevents serious errors and helps users recover (confirmation, undo, separating destructive actions).',
      '**Utility**: the solution provides the functions users actually need.',
      '**Learnability**: new users can work out how to use it quickly (familiar icons, labels, consistent layout).',
      'Redesigns must still meet the client’s constraints. Look for the **smallest change** that fixes the flaw.'
    ]
  });
})();
