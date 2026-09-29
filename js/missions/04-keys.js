/* Keyring Junction — asymmetric encryption, digital signatures, HTTPS. */
(function () {
  const { h, md, fb, fbEl, sfx, shake } = NX;

  const KEYS = {
    ap: { who: 'Alice', kind: 'public', c: 'var(--l-ex)' },
    as: { who: 'Alice', kind: 'private', c: 'var(--l-ex)' },
    bp: { who: 'Bob', kind: 'public', c: 'var(--l-req)' },
    bs: { who: 'Bob', kind: 'private', c: 'var(--l-req)' }
  };
  const keySvg = kind => kind === 'public'
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M11.5 12H22M18 12v4M21 12v3" stroke="currentColor" stroke-width="2.5" fill="none"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="12" r="5" fill="currentColor"/><path d="M11.5 12H22M18 12v4M21 12v3" stroke="currentColor" stroke-width="2.5" fill="none"/></svg>';

  const SCENARIOS = [
    { text: 'Alice (Central Station) sends Bob (Airport) the fare database. **Only Bob** must be able to read it.', slots: ['Encrypt with', 'Decrypt with'], want: ['bp', 'bs'] },
    { text: 'Bob replies with a new maintenance code that **only Alice** may read.', slots: ['Encrypt with', 'Decrypt with'], want: ['ap', 'as'] },
    { text: 'Bob publishes the new timetable. Anyone must be able to **prove it came from Bob** and was not altered.', slots: ['Sign with', 'Verify with'], want: ['bs', 'bp'] },
    { text: 'Alice issues an emergency closure order. Every station must be able to **confirm Alice sent it**.', slots: ['Sign with', 'Verify with'], want: ['as', 'ap'] }
  ];

  function explain(sc, slotIdx, key) {
    const k = KEYS[key];
    const signing = sc.slots[0] === 'Sign with';
    if (!signing) {
      if (slotIdx === 0 && k.kind === 'private') return `Encrypting with a **private** key means anyone holding the matching public key (everyone) can decrypt it. That gives no confidentiality.`;
      if (slotIdx === 0) return `Encrypting with ${k.who}’s public key means only **${k.who}’s** private key can decrypt it. Is ${k.who} the intended reader?`;
      if (k.kind === 'public') return 'Public keys are shared with everyone. If a public key could decrypt the message, anyone could read it.';
      return `Only the private key that pairs with the public key used to encrypt can decrypt. Which pair did you lock it with?`;
    }
    if (slotIdx === 0 && k.kind === 'public') return 'Anyone can use a public key, so “signing” with one proves nothing about who sent the message.';
    if (slotIdx === 0) return `A signature proves identity only if it uses the **sender’s** own private key. Who is sending here?`;
    if (k.kind === 'private') return 'Verifiers never have anyone else’s private key. Verification must use something public.';
    return `Verification uses the public key that pairs with the private key that signed. Who signed?`;
  }

  NX.register({
    id: 'keys', line: 'exchange', order: 4, title: 'Keyring Junction', short: 'Asymmetric keys and signatures',
    map: { x: 490, y: 200, label: 'above' },
    requires: ['cipher'],
    syllabus: 'Asymmetric (public-key) encryption, digital signatures, certificates, and how HTTPS combines symmetric and asymmetric encryption.',
    brief: [
      { who: 'rin', text: 'Every station now has a **key pair**: a public key it shares with everyone, and a private key it never shares. Pick the wrong key and the message is either unreadable or readable by everyone.' },
      { who: 'rin', text: 'Solid head = **private** key. Hollow head = **public** key.' }
    ],
    warmup: {
      q: 'Recall from Cipher Street: what is the biggest weakness of symmetric encryption?',
      options: [
        { t: 'Sharing the secret key safely with the other party.', ok: true, fb: 'This is the key distribution problem.' },
        { t: 'It is too slow for large files.', fb: 'Symmetric encryption is fast, which is why it is used for bulk data.' },
        { t: 'Encrypted data can never be decrypted.', fb: 'Anyone holding the shared key can decrypt it.' },
        { t: 'It needs two different keys.', fb: 'That describes asymmetric encryption.' }
      ]
    },
    rounds: [
      {
        title: 'Load the right key',
        intro: 'For each job, tap a key from the tray, then tap the slot it belongs in.',
        hints: [
          'Confidentiality: lock it so that only the **receiver** can open it. Proof of origin: lock it with something only the **sender** has.',
          'For secrecy, encrypt with the receiver’s public key. For a signature, sign with the sender’s private key. The other slot always takes the matching key from the same pair.'
        ],
        run(el, ctx) {
          let si = 0;
          const out = fbEl();
          const holder = h('div', { style: 'display:grid;gap:12px' });
          el.append(holder, out);
          function show() {
            holder.innerHTML = '';
            out.hidden = true;
            const sc = SCENARIOS[si];
            let sel = null;
            const tray = h('div', { class: 'keytray', role: 'group', 'aria-label': 'Key tray' });
            const keyBtns = Object.entries(KEYS).map(([id, k]) => {
              const b = h('button', { class: 'key', type: 'button', 'aria-pressed': 'false', style: '--kc:' + k.c + ';color:' + k.c,
                html: keySvg(k.kind) + '<span style="color:var(--ink)">' + k.who + ' <small>' + k.kind + '</small></span>', 'aria-label': k.who + ' ' + k.kind + ' key' });
              b.addEventListener('click', () => { keyBtns.forEach(x => x.setAttribute('aria-pressed', 'false')); sel = id; b.setAttribute('aria-pressed', 'true'); sfx('click'); });
              return b;
            });
            tray.append(...keyBtns);
            const vals = [null, null];
            const slots = sc.slots.map((lab, i) => {
              const s = h('button', { class: 'slot', type: 'button', 'aria-label': lab + ': empty' }, h('span', { class: 'slab', text: lab }), h('span', { class: 'sval', text: 'Tap a key, then tap here' }));
              s.addEventListener('click', () => {
                if (!sel) return;
                vals[i] = sel;
                const k = KEYS[sel];
                s.classList.add('filled'); s.classList.remove('is-bad', 'is-ok');
                s.querySelector('.sval').innerHTML = '<span class="key" style="--kc:' + k.c + ';color:' + k.c + ';cursor:default">' + keySvg(k.kind) + '<span style="color:var(--ink)">' + k.who + ' <small>' + k.kind + '</small></span></span>';
                s.setAttribute('aria-label', lab + ': ' + k.who + ' ' + k.kind + ' key');
                sfx('click');
              });
              return s;
            });
            const check = h('button', { class: 'btn', type: 'button', text: 'Run it' });
            check.addEventListener('click', () => {
              if (vals.includes(null)) { fb(out, 'info', 'Fill both slots first.'); return; }
              ctx.attempt();
              const wrongIdx = vals.map((v, i) => (v === sc.want[i] ? -1 : i)).filter(i => i >= 0);
              slots.forEach((s, i) => s.classList.toggle('is-ok', !wrongIdx.includes(i)));
              if (!wrongIdx.length) {
                sfx('ok');
                check.disabled = true;
                const signing = sc.slots[0] === 'Sign with';
                fb(out, 'ok', signing
                  ? 'Only the sender holds that private key, so a signature that verifies with the sender’s public key proves who sent it.'
                  : 'Anyone can lock the box with the receiver’s public key, but only the receiver’s private key opens it.');
                si++;
                if (si >= SCENARIOS.length) { ctx.complete(); return; }
                const b = h('button', { class: 'btn', type: 'button', text: 'Next job' });
                b.addEventListener('click', show);
                holder.append(b);
                b.focus();
              } else {
                ctx.error(); sfx('bad');
                wrongIdx.forEach(i => { slots[i].classList.add('is-bad'); shake(slots[i]); });
                fb(out, 'bad', wrongIdx.map(i => explain(sc, i, vals[i])).join(' '));
              }
            });
            holder.append(h('span', { class: 'eyebrow', text: `Job ${si + 1} of ${SCENARIOS.length}` }),
              h('div', { class: 'scenario', html: md(sc.text) }), tray, h('div', { class: 'slots' }, slots), h('div', { class: 'row' }, check));
          }
          show();
        }
      },
      {
        title: 'Signature pipeline',
        intro: 'A digital signature does not encrypt the whole message. Put the steps of **signing and verifying** Bob’s timetable in order. One step does not belong.',
        hints: [
          'The sender works on a small fingerprint of the message, not the whole message.',
          'Sender: hash, then sign the hash, then send. Receiver: hash what arrived, open the signature, then compare the two hashes.'
        ],
        run(el, ctx) {
          NX.order(el, {
            ctx, onDone: () => ctx.complete(),
            items: [
              { t: 'Bob hashes the timetable to get a digest' },
              { t: 'Bob encrypts the digest with his private key: this is the signature' },
              { t: 'Bob sends the timetable together with the signature' },
              { t: 'The station hashes the timetable it received' },
              { t: 'The station decrypts the signature with Bob’s public key' },
              { t: 'The station compares the two digests. If they match, the timetable is authentic and unaltered' },
              { t: 'Bob encrypts the digest with the station’s public key', distractor: true, fb: 'Using the station’s public key would make the digest secret, which proves nothing about who sent it. A signature needs **Bob’s private** key.' }
            ],
            accept: [
              ['Bob hashes the timetable to get a digest', 'Bob encrypts the digest with his private key: this is the signature', 'Bob sends the timetable together with the signature', 'The station hashes the timetable it received', 'The station decrypts the signature with Bob’s public key', 'The station compares the two digests. If they match, the timetable is authentic and unaltered'],
              ['Bob hashes the timetable to get a digest', 'Bob encrypts the digest with his private key: this is the signature', 'Bob sends the timetable together with the signature', 'The station decrypts the signature with Bob’s public key', 'The station hashes the timetable it received', 'The station compares the two digests. If they match, the timetable is authentic and unaltered']
            ],
            okText: 'A matching digest proves **authenticity** (only Bob’s private key could produce it) and **integrity** (any change to the timetable changes its hash). It does **not** give confidentiality: the timetable itself was sent in the clear.'
          });
        }
      },
      {
        title: 'Mark the AI answer',
        intro: 'A student asked an AI to answer an exam question. Mark it like an examiner: flag every sentence that is **wrong**.',
        hints: [
          'Check every sentence against the rules you just practised. Which key does what, and what does hashing actually do?',
          'Look closely at any sentence about a **private** key being used to keep something secret, and any sentence claiming hashing hides data that must be read later.'
        ],
        run(el, ctx) {
          NX.markAI(el, {
            ctx,
            question: 'Exam question (4 marks): Explain how HTTPS protects a rider’s card details when they top up in the NEXUS app.',
            sentences: [
              { t: 'The app receives the server’s digital certificate, which contains the server’s public key.', fb: 'Correct. The certificate binds the server’s identity to its public key.' },
              { t: 'The certificate is signed by a certificate authority, so the app can check it really belongs to NEXUS.', fb: 'Correct. This stops an attacker pretending to be the NEXUS server.' },
              { t: 'The app then encrypts the card details with its own private key, so only the server can read them.', wrong: true, fb: '**Wrong.** Anything encrypted with a private key can be decrypted by anyone holding the matching public key. That is how a signature works, not secrecy. In HTTPS the data is encrypted with a shared symmetric session key.' },
              { t: 'A symmetric session key is exchanged using asymmetric encryption, then used for the rest of the session because symmetric encryption is faster.', fb: 'Correct. This is **hybrid encryption**: asymmetric solves key distribution, symmetric does the bulk work.' },
              { t: 'Because the card details are hashed, an attacker who intercepts them can never recover the card number.', wrong: true, fb: '**Wrong.** HTTPS encrypts the card number, it does not hash it. If it were only hashed, the payment server could not read the card number either. Hashing is one-way and is used in HTTPS to check integrity.' }
            ],
            onDone: () => {
              NX.writeGate(el, {
                id: 'keys-rewrite', ctx, min: 50,
                prompt: 'Rewrite sentence 3 so it would earn the mark.',
                model: 'The app and the server use asymmetric encryption to agree on a shared **symmetric session key** (the server’s public key protects the exchange). The card details are then encrypted with that session key, so only the server, which holds the same session key, can decrypt them.',
                checklist: ['States that the card details are encrypted with a **shared session key**, not the app’s private key', 'Explains that asymmetric encryption (the server’s public key) protects the key exchange', 'Says why only the server can decrypt: it is the only other holder of the session key'],
                onDone: () => ctx.complete()
              });
            }
          });
        }
      }
    ],
    keyIdeas: [
      '**Asymmetric encryption** uses a key pair: the **public** key is shared with everyone, the **private** key is never shared. What one key locks, only the other can unlock.',
      '**Confidentiality**: encrypt with the **receiver’s public** key; only the receiver’s private key can decrypt.',
      '**Digital signature**: hash the message, then encrypt the hash with the **sender’s private** key. Anyone verifies with the sender’s public key. This proves authenticity and integrity, not confidentiality.',
      '**Certificates**, signed by a certificate authority, bind a public key to an identity so you know whose key it is.',
      '**HTTPS/TLS is hybrid**: asymmetric encryption exchanges a symmetric session key, then fast symmetric encryption protects the data.'
    ]
  });
})();
