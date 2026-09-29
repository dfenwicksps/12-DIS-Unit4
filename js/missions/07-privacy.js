/* Privacy Plaza — Australian Privacy Principles and the Notifiable Data Breaches response. */
(function () {
  const { h, md, fb, fbEl, sfx, shake } = NX;

  const CARDS = [
    {
      t: 'The NEXUS app asks for access to riders’ **entire contact list** “for features we might build later”.',
      verdict: 'breach',
      app: {
        q: 'Which principle does it breach?',
        options: [
          { t: 'APP 3: collection of solicited personal information', ok: true, fb: 'Organisations may only collect information that is **reasonably necessary** for their functions. “Might need it later” does not meet that test.' },
          { t: 'APP 11: security of personal information', fb: 'APP 11 covers protecting data already held. The problem here is collecting it at all.' },
          { t: 'APP 7: direct marketing', fb: 'Nothing here says the contacts are used for marketing. Look at why they are being collected.' }
        ]
      }
    },
    { t: 'Riders can buy a paper day ticket with cash **without giving their name**.', verdict: 'ok', why: 'This supports **APP 2 (anonymity and pseudonymity)**: where practical, people should be able to deal with an organisation without identifying themselves.' },
    {
      t: 'A rider asks for a copy of their stored trip history. NEXUS replies: “That data is for internal use only.”',
      verdict: 'breach',
      app: {
        q: 'Which principle does it breach?',
        options: [
          { t: 'APP 12: access to personal information', ok: true, fb: 'Individuals have a right to access the personal information held about them, with limited exceptions.' },
          { t: 'APP 13: correction of personal information', fb: 'APP 13 covers fixing incorrect data. The rider only asked to see it.' },
          { t: 'APP 6: use or disclosure of personal information', fb: 'APP 6 governs how data is used or passed on to others. This is about the rider seeing their own data.' }
        ]
      }
    },
    {
      t: 'NEXUS sells riders’ trip patterns to a retail chain, which uses them to send targeted ads. Riders never agreed and there is no opt-out.',
      verdict: 'breach',
      app: {
        q: 'Which principle is the clearest breach?',
        options: [
          { t: 'APP 6: using or disclosing data for a secondary purpose without consent', ok: true, fb: 'Trip data was collected to run the transport service. Selling it is a secondary purpose riders did not consent to. **APP 7** (direct marketing, which requires an opt-out) is breached too.' },
          { t: 'APP 7: direct marketing without an opt-out', ok: true, fb: 'Marketing with no simple way to opt out breaches **APP 7**. Handing the data to a third party also breaches **APP 6** (secondary use or disclosure).' },
          { t: 'APP 10: quality of personal information', fb: 'APP 10 is about data being accurate and up to date. Nothing here says the data is wrong.' }
        ]
      }
    },
    {
      t: 'Rider passwords are stored in **plain text** on a server that every staff member can log in to.',
      verdict: 'breach',
      app: {
        q: 'Which principle does it breach?',
        options: [
          { t: 'APP 11: security of personal information', ok: true, fb: 'Organisations must take reasonable steps to protect data from misuse and unauthorised access. Salted hashing and access controls are those reasonable steps.' },
          { t: 'APP 1: open and transparent management', fb: 'APP 1 is about having a clear privacy policy. The failure here is protection.' },
          { t: 'APP 8: cross-border disclosure', fb: 'Nothing is being sent overseas.' }
        ]
      }
    },
    { t: 'At sign-up the app explains **what** is collected, **why**, and **who** it is shared with, and links a plain-English privacy policy.', verdict: 'ok', why: 'This meets **APP 1 (open and transparent management)** and **APP 5 (notification of collection)**.' },
    {
      t: 'Rider records are backed up to a cheap overseas cloud provider. Nobody checked what privacy protections apply there.',
      verdict: 'breach',
      app: {
        q: 'Which principle does it breach?',
        options: [
          { t: 'APP 8: cross-border disclosure of personal information', ok: true, fb: 'Before disclosing data overseas, an organisation must take reasonable steps to ensure the recipient handles it in line with the APPs, and it remains accountable.' },
          { t: 'APP 2: anonymity and pseudonymity', fb: 'APP 2 is about letting people interact without identifying themselves.' },
          { t: 'APP 12: access to personal information', fb: 'APP 12 is about individuals seeing their own data.' }
        ]
      }
    }
  ];

  NX.register({
    id: 'privacy', line: 'req', order: 1, title: 'Privacy Plaza', short: 'Australian Privacy Principles',
    map: { x: 330, y: 460, label: 'below' },
    requires: ['formats'],
    syllabus: 'Legal and ethical obligations when exchanging personal data: the Privacy Act 1988, the Australian Privacy Principles and data breach response.',
    brief: [
      { who: 'rin', text: 'Getting data from A to B is only half the job. The **Privacy Act 1988** and its 13 **Australian Privacy Principles (APPs)** decide what NEXUS may collect, keep and share. The regulator is auditing us. Rule on each practice.' },
      { who: 'hex', text: 'Rules are for people who get caught. — HEX' }
    ],
    warmup: {
      q: 'Recall from Format Forge: a CSV row reads `15,Riverside, North,2`. What goes wrong?',
      options: [
        { t: 'The comma inside “Riverside, North” splits it into an extra column.', ok: true, fb: 'Wrap the field in quotes: `"Riverside, North"`.' },
        { t: 'CSV cannot store numbers.', fb: 'CSV stores everything as text, numbers included.' },
        { t: 'Nothing. The parser works out what was meant.', fb: 'Parsers split on every unquoted comma.' }
      ]
    },
    rounds: [
      {
        title: 'Rule on the practice',
        intro: 'For each NEXUS practice, decide: **compliant** or **breach**? For a breach, name the principle.',
        hints: [
          'Ask: is NEXUS collecting only what it needs, using it only for the reason it was collected, protecting it, and letting riders see it?',
          'The key principles here: APP 2 anonymity, APP 3 collection, APP 5 notification, APP 6 use and disclosure, APP 7 direct marketing, APP 8 overseas, APP 11 security, APP 12 access.'
        ],
        run(el, ctx) {
          let ci = 0;
          const holder = h('div', { class: 'deck' });
          el.append(holder);
          function show() {
            holder.innerHTML = '';
            const c = CARDS[ci];
            const out = fbEl();
            const card = h('div', { class: 'pcard' }, h('span', { class: 'who', text: `Practice ${ci + 1} of ${CARDS.length}` }), h('p', { html: md(c.t) }));
            const okB = h('button', { class: 'v-ok', type: 'button', text: 'Compliant' });
            const badB = h('button', { class: 'v-bad', type: 'button', text: 'Breach' });
            const verdict = h('div', { class: 'verdict' }, okB, badB);
            const nextBtn = () => {
              ci++;
              if (ci >= CARDS.length) { ctx.complete(); return; }
              const b = h('button', { class: 'btn', type: 'button', text: 'Next practice' });
              b.addEventListener('click', show);
              holder.append(b);
              b.focus({ preventScroll: true });
            };
            const choose = v => {
              ctx.attempt();
              if (v !== c.verdict) {
                ctx.error(); sfx('bad'); shake(card);
                (v === 'ok' ? okB : badB).disabled = true;
                fb(out, 'bad', v === 'ok'
                  ? 'Look again at **why** the data is collected or used, and whether the rider had any say.'
                  : 'Nothing here harms the rider or goes beyond what they would reasonably expect. Which principle does it actually support?');
                return;
              }
              okB.disabled = badB.disabled = true;
              if (c.verdict === 'ok') { sfx('ok'); fb(out, 'ok', c.why); nextBtn(); }
              else {
                sfx('ok');
                out.hidden = true;
                NX.mcq(holder, Object.assign({}, c.app, { ctx, onDone: nextBtn }));
              }
            };
            okB.addEventListener('click', () => choose('ok'));
            badB.addEventListener('click', () => choose('breach'));
            holder.append(card, verdict, out);
          }
          show();
        }
      },
      {
        title: 'Breach response',
        intro: 'HEX got into a NEXUS database holding **12,000 riders’ names, home addresses and card numbers**. Under the Notifiable Data Breaches scheme, put NEXUS’s response in order. One option should never happen.',
        hints: [
          'Stop the damage getting worse before anything else.',
          'The recommended sequence is: contain, assess, notify, review.'
        ],
        run(el, ctx) {
          NX.order(el, {
            ctx, onDone: () => {
              NX.mcq(el, {
                q: 'Which fact makes this breach **notifiable** to the OAIC and to the affected riders?',
                ctx, onDone: () => ctx.complete(),
                options: [
                  { t: 'It is likely to cause **serious harm** to the people involved, for example identity theft or physical safety risks from exposed home addresses.', ok: true, fb: 'An eligible data breach is one likely to result in serious harm that the organisation cannot prevent with remedial action.' },
                  { t: 'More than 10,000 records were accessed.', fb: 'The test is **likely serious harm**, not a record count. One record can be notifiable.' },
                  { t: 'The attacker was from overseas.', fb: 'Where the attacker is based does not decide whether a breach is notifiable.' }
                ]
              });
            },
            items: [
              { t: 'Contain: cut off HEX’s access and secure the database' },
              { t: 'Assess: work out what data was exposed and whether serious harm is likely' },
              { t: 'Notify: tell affected riders and the OAIC (Office of the Australian Information Commissioner)' },
              { t: 'Review: fix the cause and update security practices so it does not happen again' },
              { t: 'Wait to see whether the data appears online before telling anyone', distractor: true, fb: 'Delaying keeps riders from protecting themselves, for example by cancelling cards, and breaks the scheme’s requirement to act promptly.' }
            ],
            okText: '**Contain, assess, notify, review.** Riders can only protect themselves once they have been told.'
          });
        }
      }
    ],
    keyIdeas: [
      'The **Privacy Act 1988 (Cth)** sets 13 **Australian Privacy Principles (APPs)** for how personal information is handled.',
      'Collect only what is **reasonably necessary** (APP 3), tell people what you collect and why (APP 1, APP 5), and use it only for that purpose unless they consent (APP 6).',
      'Direct marketing needs a simple **opt-out** (APP 7). Sending data **overseas** requires reasonable steps to protect it (APP 8).',
      'Keep data **secure** (APP 11), let people **access** (APP 12) and **correct** (APP 13) their data, and allow **anonymity** where practical (APP 2).',
      'Notifiable Data Breaches: **contain, assess, notify, review**. Notify when serious harm is likely.'
    ]
  });
})();
