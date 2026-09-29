/* Nexus Core — interleaved transfer questions in unseen scenarios, then mark an AI extended response. */
(function () {
  const { h, md, fb, fbEl, sfx } = NX;

  const BOSS = [
    {
      tag: 'Formats · CanteenGo',
      q: 'The CanteenGo kitchen receives `{"student": "Jay", "items": [{"name": "wrap", "qty": 2}], "paid": "true"}`. The kitchen code checks `IF order.paid = TRUE`, and the order is never cooked. Why?',
      options: [
        { t: '`"true"` in quotes is a **string**, not the boolean `true`.', ok: true, fb: 'JSON types matter. The sender should send `"paid": true`, and the receiver should validate types.' },
        { t: 'JSON cannot put objects inside arrays.', fb: 'Arrays of objects are standard JSON.' },
        { t: '`qty` must be quoted.', fb: 'Numbers are unquoted in JSON.' },
        { t: 'The order should have been sent as XML.', fb: 'The format is not the problem. The data type of one value is.' }
      ]
    },
    {
      tag: 'Encryption · CanteenGo',
      q: 'Parents pay through the CanteenGo API. What keeps their card details **confidential** in transit?',
      options: [
        { t: 'HTTPS (TLS) encryption of the connection.', ok: true, fb: 'A symmetric session key, agreed using asymmetric encryption, encrypts everything sent.' },
        { t: 'Hashing the card number before it is sent.', fb: 'The bank then could not recover the card number either. Hashing is one-way.' },
        { t: 'Digitally signing the payment request.', fb: 'A signature proves who sent it and that it was not altered. It does not hide the data.' },
        { t: 'Sending the details as CSV instead of JSON.', fb: 'A data format provides no security at all.' }
      ]
    },
    {
      tag: 'Signatures · Hospital',
      q: 'A pathology lab sends blood-test results to a GP. The GP must be sure they came from the lab and were not altered. The lab should…',
      options: [
        { t: 'Sign a hash of the results with the **lab’s private key**.', ok: true, fb: 'The GP verifies with the lab’s public key. This gives authenticity and integrity.' },
        { t: 'Encrypt the results with the **GP’s public key**.', fb: 'That keeps the results confidential, but anyone could have encrypted them, so it proves nothing about the sender.' },
        { t: 'Encrypt the results with the **lab’s public key**.', fb: 'Then only the lab could decrypt them, and the GP could not read the results.' },
        { t: 'Send the results twice and compare the copies.', fb: 'An attacker who alters one copy can alter both.' }
      ]
    },
    {
      tag: 'Protocols · Hospital',
      q: 'A heart monitor streams a reading to the nurses’ station every 100 ms. A lost reading is replaced by the next one straight away. Which protocol fits?',
      options: [
        { t: 'UDP', ok: true, fb: 'Retransmitting a stale reading only adds delay. The next reading is more useful.' },
        { t: 'TCP', fb: 'TCP would pause the stream to resend old readings. For live data, stale is worse than missing.' }
      ]
    },
    {
      tag: 'Hashing · CanteenGo',
      q: 'Two parents both choose the password `canteen1`. CanteenGo stores **salted** SHA-256 hashes. Their stored hashes are…',
      options: [
        { t: 'Different, because each user has a unique salt.', ok: true, fb: 'So a leaked table does not show who shares a password.' },
        { t: 'Identical, because hashing is deterministic.', fb: 'It is deterministic for the same input, but the salt makes the inputs different.' },
        { t: 'Identical, but encrypted differently.', fb: 'Salted hashing involves no encryption.' }
      ]
    },
    {
      tag: 'APIs · CanteenGo',
      q: 'A logged-in parent sends `GET /orders/551` and gets `403 Forbidden`. Most likely…',
      options: [
        { t: 'Order 551 belongs to another family, so the parent is authenticated but not authorised to see it.', ok: true, fb: '403 means “we know who you are, and the answer is no”.' },
        { t: 'The parent is not logged in.', fb: 'That would be 401.' },
        { t: 'Order 551 does not exist.', fb: 'That would be 404. Some APIs deliberately return 404 to hide what exists, but a 403 means authorisation.' },
        { t: 'The server crashed.', fb: 'That would be a 5xx code.' }
      ]
    },
    {
      tag: 'Privacy · CanteenGo',
      q: 'CanteenGo plans to give students’ **allergy records** to a food-delivery partner for its marketing. Which principle does this breach most directly?',
      options: [
        { t: 'APP 6: use or disclosure for a secondary purpose without consent.', ok: true, fb: 'Allergy data was collected for student safety. Marketing is a secondary purpose. It is also **sensitive** health information, which carries stricter rules.' },
        { t: 'APP 12: access to personal information.', fb: 'APP 12 is about families seeing their own data.' },
        { t: 'APP 2: anonymity.', fb: 'APP 2 is about interacting without giving your identity.' }
      ]
    },
    {
      tag: 'Testing · CanteenGo',
      q: 'Rule: an order quantity must be **1 to 5 inclusive**. The code reads `IF qty >= 1 AND qty < 5`. Which test input reveals the bug?',
      options: [
        { t: '5', ok: true, fb: '5 is valid, but `5 < 5` is FALSE, so it is rejected. The fix is `<=`.' },
        { t: '1', fb: '`1 >= 1` is TRUE, so the lower boundary works.' },
        { t: '3', fb: 'A typical value passes whichever operator is used.' },
        { t: '0', fb: '0 is correctly rejected.' }
      ]
    },
    {
      tag: 'Usability · Hospital',
      q: 'The patient portal’s “Cancel all appointments” button sits right beside “Confirm appointment” and has no confirmation step. Which principle is breached?',
      options: [
        { t: 'Safety', ok: true, fb: 'Preventing serious, hard-to-undo mistakes is safety.' },
        { t: 'Utility', fb: 'The functions exist. The danger is how easily the wrong one is triggered.' },
        { t: 'Learnability', fb: 'Even experienced users make this slip. It is about preventing errors.' }
      ]
    },
    {
      tag: 'Impacts · CanteenGo',
      q: 'Which impact of CanteenGo’s cashless system is **economic**?',
      options: [
        { t: 'The canteen saves six staff hours a week on counting cash.', ok: true, fb: 'Labour cost is economic.' },
        { t: 'Students from families without bank cards feel left out.', fb: 'That is a social (and personal) impact.' },
        { t: 'Parents can see what their child buys each day.', fb: 'That is personal, and a privacy consideration too.' }
      ]
    }
  ];

  NX.register({
    id: 'core', line: 'core', order: 1, title: 'Nexus Core', short: 'Exam-style mixed challenge',
    map: { x: 880, y: 300 },
    requires: ['packets', 'formats', 'cipher', 'keys', 'hash', 'api', 'privacy', 'impacts', 'usability', 'algorithms', 'trace'],
    syllabus: 'Every station, mixed, in unfamiliar scenarios (a school canteen app and a hospital), the way the external exam presents them.',
    debriefTitle: 'The NEXUS network is back online',
    brief: [
      { who: 'hex', text: 'So you fixed my little messes. But the Core isn’t a transit network. Every question here comes from somewhere you’ve never been. Let’s see if you actually understand it. — HEX' },
      { who: 'rin', text: 'HEX is right about one thing: the exam won’t use NEXUS either. These are new systems: a school canteen app and a hospital. **Each wrong answer drains Core integrity.** If it hits zero, we reboot and go again.' }
    ],
    rounds: [
      {
        title: 'Firewall breach',
        intro: 'Ten attacks, mixed from every line. Keep the Core’s integrity above zero.',
        hints: [
          'Name the station each question belongs to before you answer, then recall that station’s key idea.',
          'Rule out options that answer a different question: confidentiality, authenticity and integrity are three different goals, and each has a different tool.'
        ],
        run(el, ctx) {
          const health = h('div', { class: 'health' });
          const bar = h('i', { style: 'width:100%' });
          const label = h('span', { 'aria-live': 'polite' });
          health.append(h('div', { class: 'bar', role: 'img', 'aria-label': 'Core integrity' }, bar), label);
          const area = h('div', { style: 'display:grid;gap:14px' });
          el.append(health, area);
          let hp, qi, order;
          const paint = () => { bar.style.width = Math.max(0, hp) + '%'; label.textContent = `Core integrity ${Math.max(0, hp)}% · Attack ${Math.min(qi + 1, order.length)} of ${order.length}`; };
          function start() {
            hp = 100; qi = 0; order = NX.shuffle(BOSS);
            area.innerHTML = '';
            paint();
            ask();
          }
          function ask() {
            area.innerHTML = '';
            const Q = order[qi];
            area.append(h('span', { class: 'eyebrow', text: Q.tag }));
            const wrappedCtx = {
              attempt: ctx.attempt,
              error() {
                ctx.error();
                hp -= 15;
                paint();
                if (hp <= 0) {
                  sfx('bad');
                  area.querySelectorAll('.opt').forEach(b => (b.disabled = true));
                  const reboot = h('button', { class: 'btn', type: 'button', text: 'Reboot the Core and try again' });
                  reboot.addEventListener('click', start);
                  area.append(h('div', { class: 'fb fb-bad', html: '<b>Core breached.</b> Integrity reached zero. Read the feedback above, then reboot. The attacks come in a new order.' }), reboot);
                  reboot.focus();
                }
              }
            };
            NX.mcq(area, Object.assign({}, Q, {
              ctx: wrappedCtx,
              onDone: () => {
                qi++;
                paint();
                if (qi >= order.length) {
                  area.append(h('div', { class: 'fb fb-ok', html: `<b>Firewall holding at ${hp}%.</b> One step left: HEX’s final trick.` }));
                  ctx.complete('Final challenge ▸');
                  return;
                }
                const b = h('button', { class: 'btn', type: 'button', text: 'Next attack' });
                b.addEventListener('click', ask);
                area.append(b);
                b.focus({ preventScroll: true });
              }
            }));
          }
          start();
        }
      },
      {
        title: 'HEX’s final trick',
        intro: 'HEX planted an AI-written “model answer” in the class revision notes. It sounds convincing. Mark it like an examiner.',
        hints: [
          'Check each claim for a mix-up between a **data format** and a **security mechanism**, and for any claim about what a format cannot do.',
          'XML can nest elements inside elements, and no data format encrypts anything by itself.'
        ],
        run(el, ctx) {
          NX.markAI(el, {
            ctx,
            question: 'Exam question (4 marks): Evaluate whether CanteenGo should use JSON or XML for its order API. The web app is written in JavaScript.',
            sentences: [
              { t: 'JSON is lighter than XML because it has no closing tags, so each order uses less bandwidth.', fb: 'Correct, and a relevant criterion for a busy lunchtime API.' },
              { t: 'JSON maps directly onto JavaScript objects, which suits CanteenGo’s JavaScript web app.', fb: 'Correct, and linked to the scenario.' },
              { t: 'XML cannot represent nested data such as a list of items within an order.', wrong: true, fb: '**Wrong.** XML nests naturally: `<order><items><item>…</item></items></order>`. The real argument against XML is its verbosity, not its capability.' },
              { t: 'JSON is also more secure than XML because JSON data is automatically encrypted.', wrong: true, fb: '**Wrong.** No data format encrypts anything. Confidentiality comes from HTTPS/TLS, whichever format is used.' },
              { t: 'Therefore JSON is recommended, because the order data is small, nested and used by a JavaScript client.', fb: 'Correct. A justified recommendation tied to the scenario’s criteria.' }
            ],
            onDone: () => NX.writeGate(el, {
              id: 'core-eval', ctx, min: 100,
              prompt: 'Replace the two flawed sentences with one or two sentences that would earn the marks instead.',
              model: 'XML could also represent the nested order (items within an order) and supports strict schema validation, but its opening and closing tags make every message larger and slower to parse on students’ phones. Neither format is secure by itself, so whichever is chosen must be sent over HTTPS to keep payment and allergy data confidential.',
              checklist: [
                'Acknowledges that XML **can** represent nested data (corrects sentence 3)',
                'Gives a valid reason XML is less suitable (verbosity, size, parsing overhead)',
                'States that security comes from **HTTPS/TLS**, not the data format (corrects sentence 4)',
                'Links at least one point to the **CanteenGo scenario**'
              ],
              onDone: () => ctx.complete('Restore the Core ▸')
            })
          });
        }
      }
    ],
    keyIdeas: [
      'Exam scenarios will be new. Identify **which idea** a question is testing before you answer.',
      'Keep three security goals separate: **confidentiality** (encryption), **integrity** (hashing), **authenticity** (signatures and certificates).',
      'Data formats structure data. They never secure it.',
      '“Evaluate” means judging against criteria, acknowledging trade-offs and linking every point to the scenario.',
      'AI answers can be fluent and wrong. Mark them the way you would mark your own work.'
    ]
  });
})();
