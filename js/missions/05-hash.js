/* Hash Harbour — hashing properties, integrity checks, salted password storage. */
(function () {
  const { h, md, esc, fb, fbEl, sfx, shake } = NX;
  const H = s => window.sha256(s);

  const FILES = [
    { name: 'timetable-north.txt', body: 'LINE N1\nCentral   07:05\nRiverside 07:12\nAirport   07:31' },
    { name: 'timetable-south.txt', body: 'LINE S2\nCentral   07:10\nMarket    07:16\nHarbour   07:24' },
    { name: 'timetable-east.txt', body: 'LINE E3\nCentral   07:20\nStadium   07:28\nUniversity 07:39' }
  ];
  const TAMPERED = 0;
  const served = FILES.map((f, i) => (i === TAMPERED ? Object.assign({}, f, { body: f.body.replace('07:31', '07:13') }) : f));

  NX.register({
    id: 'hash', line: 'exchange', order: 5, title: 'Hash Harbour', short: 'Hashing and integrity',
    map: { x: 600, y: 300, label: 'below' },
    requires: ['keys'],
    syllabus: 'Hash functions: properties (one-way, fixed length, deterministic, avalanche effect), integrity checking and salted password storage.',
    brief: [
      { who: 'rin', text: 'HEX is swapping files on our download mirror. A **hash** is a fixed-length fingerprint of data: change one bit of the file and the fingerprint changes completely. Let’s use that to catch them.' },
      { who: 'hex', text: 'You can’t check every byte by eye, can you? — HEX' }
    ],
    warmup: {
      q: 'Recall from Keyring Junction: a valid digital signature proves which two things?',
      options: [
        { t: 'Authenticity (who sent it) and integrity (it was not altered).', ok: true, fb: 'A signature does not hide the message.' },
        { t: 'Confidentiality and integrity.', fb: 'A signature does not make the message secret. The message itself is sent in the clear.' },
        { t: 'Confidentiality and availability.', fb: 'Signatures do neither. Confidentiality needs encryption.' },
        { t: 'That the message is compressed and error-free.', fb: 'That mixes up checksums and compression with signatures.' }
      ]
    },
    rounds: [
      {
        title: 'Predict the avalanche',
        intro: 'Below is the SHA-256 hash of the text `platform4`: 64 hexadecimal characters. You are about to change **one character** to get `platform5`.',
        hints: [
          'A good hash function is designed so that the output looks unrelated to the input, even for inputs that are almost identical.',
          'If the new hash looked random, each hex character would have a 1 in 16 chance of staying the same by luck. What fraction of 64 is that?'
        ],
        run(el, ctx) {
          const a = 'platform4', b = 'platform5';
          const ha = H(a), hb = H(b);
          el.append(h('div', { class: 'hashbox', text: ha }));
          const range = h('input', { type: 'range', min: '0', max: '64', value: '8', id: 'aval' });
          const outv = h('output', { for: 'aval', text: '8' });
          range.addEventListener('input', () => (outv.textContent = range.value));
          const commit = h('button', { class: 'btn', type: 'button', text: 'Commit prediction' });
          const out = fbEl();
          el.append(h('div', { class: 'pred' },
            h('label', { for: 'aval', class: 'q', text: 'Prediction: how many of the 64 characters will change?' }),
            h('div', { class: 'pred-row' }, range, outv, commit)), out);
          commit.addEventListener('click', () => {
            ctx.attempt();
            range.disabled = true; commit.disabled = true;
            let diff = 0;
            const marked = [...hb].map((c, i) => (c !== ha[i] ? (diff++, '<span class="d">' + c + '</span>') : c)).join('');
            const box = h('div', { class: 'hashbox', html: marked });
            el.insertBefore(h('span', { class: 'eyebrow', text: 'SHA-256 of "platform5" (changed characters highlighted)' }), out);
            el.insertBefore(box, out);
            const guess = +range.value;
            fb(out, Math.abs(guess - diff) <= 8 ? 'ok' : 'info',
              `You predicted **${guess}**, and **${diff}** of 64 changed. ` + (guess < 30
                ? 'Most people expect a small change for a small edit. Hashes are built to do the opposite: this is the **avalanche effect**.'
                : 'This is the **avalanche effect**: a tiny change to the input scrambles the whole output, so you cannot work backwards from similar hashes.'));
            sandbox();
          });

          function sandbox() {
            const inp = h('input', { type: 'text', id: 'hash-play', value: 'Try your own text', autocomplete: 'off' });
            const live = h('div', { class: 'hashbox', 'aria-live': 'polite' });
            const len = h('span', { class: 'small' });
            const upd = () => { live.textContent = H(inp.value); len.textContent = inp.value.length + ' characters in, 64 hex characters out.'; };
            inp.addEventListener('input', upd); upd();
            el.append(h('label', { for: 'hash-play', class: 'q', text: 'Sandbox: type anything. Try one letter, then a whole paragraph.' }), inp, live, len);
            NX.mcq(el, {
              q: 'You hash a single letter and then a 4 GB video file with SHA-256. How long are the two hashes?',
              ctx, onDone: () => ctx.complete(),
              options: [
                { t: 'Both are exactly 256 bits (64 hex characters).', ok: true, fb: 'A hash is **fixed-length** whatever the input size. That is why a hash is a fingerprint and not a compressed copy.' },
                { t: 'The video’s hash is much longer because it contains more data.', fb: 'Hash length never depends on input size. SHA-256 always outputs 256 bits.' },
                { t: 'The video’s hash is 4 GB, the same size as the file.', fb: 'Then it would just be a copy. A hash summarises data. It cannot store it.' }
              ]
            });
          }
        }
      },
      {
        title: 'Tamper check',
        intro: 'The official NEXUS website publishes the SHA-256 hash of each timetable. You downloaded the files from a mirror. Compute each file’s hash and compare it with the published one.',
        hints: [
          'Integrity check: hash what you received and compare it with the trusted published hash. Any difference means the file changed.',
          'Compare the first few characters of each pair. Then look for the edit inside the mismatched file itself.'
        ],
        run(el, ctx) {
          const out = fbEl();
          let computed = 0;
          const cards = served.map((f, i) => {
            const res = h('div', { class: 'hashline', html: '<b>Your computed hash</b>not calculated yet' });
            const calc = h('button', { class: 'btn ghost', type: 'button', text: 'Compute SHA-256' });
            const pick = h('button', { class: 'btn', type: 'button', text: 'This file was tampered with', hidden: true });
            const card = h('div', { class: 'file' },
              h('strong', { text: f.name }), h('pre', { text: f.body }),
              h('div', { class: 'hashline', html: '<b>Published hash (official site)</b>' + H(FILES[i].body).slice(0, 24) + '…' }), res, calc, pick);
            calc.addEventListener('click', () => {
              res.innerHTML = '<b>Your computed hash</b>' + esc(H(f.body).slice(0, 24)) + '…';
              calc.remove(); sfx('click');
              if (++computed === served.length) cards.forEach(c => (c._pick.hidden = false));
            });
            pick.addEventListener('click', () => {
              ctx.attempt();
              if (i === TAMPERED) {
                card.classList.add('is-ok'); sfx('ok');
                cards.forEach(c => (c._pick.disabled = true));
                fb(out, 'ok', 'The hashes don’t match. HEX changed Airport **07:31** to **07:13**: one swapped digit, and the hash changed completely.');
                NX.mcq(el, {
                  q: 'HEX also gets control of the official website and can change the published hashes. Is a hash check still enough?',
                  ctx, onDone: () => ctx.complete(),
                  options: [
                    { t: 'No. HEX could change the file and publish its new hash. The hash must come from a trusted channel or be digitally signed.', ok: true, fb: 'A hash proves the file matches the hash, not who produced the hash. Signing the hash with NEXUS’s private key ties it to NEXUS, which is exactly how a digital signature works.' },
                    { t: 'Yes. A hash cannot be forged, so the check still works.', fb: 'Anyone can compute the hash of a modified file. A hash has no secret in it.' },
                    { t: 'Yes, as long as a longer hash such as SHA-512 is used.', fb: 'Length does not help if the attacker controls where the hash is published.' },
                    { t: 'No. The file must be encrypted instead of hashed.', fb: 'Encryption hides content but does not prove where it came from. The problem is trusting the source of the hash.' }
                  ]
                });
              } else {
                card.classList.add('is-bad'); ctx.error(); sfx('bad'); shake(card);
                pick.disabled = true;
                fb(out, 'bad', 'That file’s computed hash matches the published one character for character, so it is unchanged. Look for the pair that differs.');
              }
            });
            card._pick = pick;
            return card;
          });
          el.append(h('div', { class: 'files' }, cards), out);
        }
      },
      {
        title: 'The leaked vault',
        intro: 'HEX dumped part of an old NEXUS user table online. Passwords were stored as plain SHA-256 hashes, with **no salt**.',
        hints: [
          'Hashing is deterministic: the same input always gives the same output.',
          'A **salt** is a random value stored with each user and added to their password before hashing.'
        ],
        run(el, ctx) {
          const rows = [['mtran', 'transit2024'], ['jlee', 'Summer!'], ['okafor', 'Plat4orm#9'], ['swu', 'Summer!'], ['rpatel', 'b3llbird']];
          const tbl = h('table', { class: 'pkt-table' },
            h('thead', null, h('tr', null, ['#', 'Username', 'Stored hash (first 20 chars)'].map(t => h('th', { text: t })))),
            h('tbody', null, rows.map((r, i) => h('tr', null, h('td', { text: String(i + 1) }), h('td', { text: r[0] }), h('td', { text: H(r[1]).slice(0, 20) + '…' })))));
          el.append(h('div', { class: 'table-scroll' }, tbl));
          NX.series(el, [
            {
              q: 'Without cracking anything, what can an attacker already conclude about users 2 and 4?',
              options: [
                { t: 'They have the same password.', ok: true, fb: 'Same input, same hash. If an attacker cracks one of them (for example with a precomputed **rainbow table**), they have both.' },
                { t: 'Their accounts were created on the same day.', fb: 'Hashes depend only on the input, not on when the account was created.' },
                { t: 'Nothing. Hashes reveal no information at all.', fb: 'Identical unsalted hashes reveal identical passwords.' }
              ]
            },
            {
              q: 'What change would make identical passwords produce different stored hashes?',
              options: [
                { t: 'Add a unique random salt to each password before hashing, and store the salt with the hash.', ok: true, fb: 'Salting makes every hash unique, which defeats rainbow tables and hides reused passwords. The salt is not secret; its job is to be unique.' },
                { t: 'Hash each password twice.', fb: 'Still deterministic: the same password hashed twice still produces the same result for both users.' },
                { t: 'Encrypt the hash column with AES.', fb: 'The two ciphertexts would still match, and if the key is stolen with the database, you are back to square one.' },
                { t: 'Use a shorter hash so there is less to steal.', fb: 'Shorter hashes are easier to collide and crack. That makes things worse.' }
              ]
            },
            {
              q: 'Why do systems store password **hashes** rather than **encrypted** passwords?',
              options: [
                { t: 'The server never needs the original password back. It only hashes each login attempt and compares.', ok: true, fb: 'Hashing is **one-way**, so there is no key to steal that would reveal every password. Encryption is reversible by design.' },
                { t: 'Hashes are easier to reverse when a user forgets their password.', fb: 'Hashes cannot be reversed. That is why sites reset forgotten passwords rather than emailing them back to you.' },
                { t: 'Encryption only works on numbers, not text.', fb: 'Encryption works on any data. The difference is that encryption is reversible and hashing is not.' }
              ]
            }
          ], ctx, () => ctx.complete());
        }
      }
    ],
    keyIdeas: [
      'A **hash function** turns any input into a **fixed-length** digest. It is **deterministic** (same input, same hash), **one-way** (cannot be reversed) and shows the **avalanche effect** (a tiny input change gives a completely different hash).',
      '**Integrity check**: hash what you received and compare it with a trusted hash. A mismatch means the data was altered.',
      'A hash alone does not prove **who** made it. Sign it or get it from a trusted channel.',
      '**Passwords**: store a salted hash. A unique random **salt** per user defeats rainbow tables and hides reused passwords.',
      '**Hashing is not encryption**: encryption is reversible with a key, hashing is not.'
    ]
  });
})();
