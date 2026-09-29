/* Cipher Street — symmetric encryption: Caesar, key space, XOR, key distribution. */
(function () {
  const { h, md, fb, fbEl, sfx, shake } = NX;
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const shift = (txt, k) => txt.replace(/[A-Z]/g, c => A[(A.indexOf(c) + k + 26) % 26]);
  const PLAIN = 'MEET AT DEPOT NINE AT MIDNIGHT HEX';
  const KEY = 11;

  NX.register({
    id: 'cipher', line: 'exchange', order: 3, title: 'Cipher Street', short: 'Symmetric encryption',
    map: { x: 340, y: 200, label: 'above' },
    requires: ['formats'],
    syllabus: 'Symmetric encryption: one shared secret key, key space and brute force, and the key distribution problem.',
    brief: [
      { who: 'rin', text: 'We intercepted a message from HEX’s crew, but it’s scrambled. Our analysts think it uses a **shift cipher**, the oldest form of symmetric encryption. Crack it and we’ll know where they strike next.' },
      { who: 'hex', text: shift(PLAIN, KEY) }
    ],
    warmup: {
      q: 'Recall from Format Forge: which of these is valid JSON?',
      options: [
        { t: '`{\'zone\': 1}`', fb: 'Single quotes are not allowed in JSON.' },
        { t: '`{"zone": 1,}`', fb: 'JSON does not allow a trailing comma.' },
        { t: '`{"zones": [1, 2]}`', ok: true, fb: 'A double-quoted key whose value is an array of numbers.' },
        { t: '`{zone: 1}`', fb: 'Keys must be double-quoted strings. JavaScript allows bare keys, JSON does not.' }
      ]
    },
    rounds: [
      {
        title: 'Crack the shift',
        intro: 'A shift cipher moves every letter the same number of places along the alphabet. The shift amount is the **key**. First, think like an attacker.',
        hints: [
          'HEX signs every message with the same three letters. Where would a signature usually appear?',
          'Turn the dial until the **last word** decrypts to HEX. The rest of the message will become readable at the same time.'
        ],
        run(el, ctx) {
          const out = fbEl();
          const predIn = h('input', { type: 'number', id: 'caesar-pred', min: '0', max: '100', style: 'max-width:8em' });
          const predBtn = h('button', { class: 'btn', type: 'button', text: 'Commit prediction' });
          const pred = h('div', { class: 'pred' },
            h('label', { for: 'caesar-pred', class: 'q', text: 'Prediction: what is the greatest number of keys an attacker would have to try to be sure of breaking any shift cipher?' }),
            h('div', { class: 'pred-row' }, predIn, predBtn), out);
          el.append(pred);

          const game = h('div', { class: 'caesar', hidden: true });
          const ct = shift(PLAIN, KEY);
          const k = h('input', { type: 'range', min: '0', max: '25', value: '0', id: 'caesar-k', 'aria-label': 'Shift key' });
          const kOut = h('output', { for: 'caesar-k', text: '0' });
          const plainEl = h('div', { class: 'plain-text', 'aria-live': 'polite' });
          const strip = h('div', { class: 'strip' });
          const draw = () => {
            const v = +k.value;
            kOut.textContent = v;
            plainEl.textContent = shift(ct, -v);
            strip.innerHTML = '<table aria-hidden="true"><tr>' + [...A].map(c => '<td>' + c + '</td>').join('') + '</tr><tr>' +
              [...A].map(c => '<td>' + shift(c, -v) + '</td>').join('') + '</tr></table>';
          };
          const step = d => { k.value = (+k.value + d + 26) % 26; draw(); sfx('click'); };
          k.addEventListener('input', draw);
          const lockOut = fbEl();
          const lock = h('button', { class: 'btn', type: 'button', text: 'Lock in this key' });
          lock.addEventListener('click', () => {
            ctx.attempt();
            if (+k.value === KEY) {
              fb(lockOut, 'ok', `Key ${KEY}. HEX’s crew meet at **Depot Nine at midnight**. It took you at most 25 tries. A computer tries all 25 in microseconds.`);
              sfx('ok');
              k.disabled = true; lock.disabled = true;
              game.querySelectorAll('.step').forEach(b => (b.disabled = true));
              NX.mcq(game, {
                q: 'AES is also symmetric: one shared secret key encrypts and decrypts. So why is AES secure when a shift cipher is not?',
                ctx, onDone: () => ctx.complete(),
                options: [
                  { t: 'AES has an enormous key space (2¹²⁸ or more keys), so trying every key is infeasible.', ok: true, fb: 'Even at a trillion guesses per second, searching 2¹²⁸ keys would take far longer than the age of the universe.' },
                  { t: 'The AES algorithm is kept secret, so attackers do not know how it works.', fb: 'AES is fully public. Modern cryptography assumes the attacker knows the algorithm (Kerckhoffs’s principle), so security comes only from the secret key.' },
                  { t: 'AES uses two different keys, one to encrypt and one to decrypt.', fb: 'That describes **asymmetric** encryption. AES is symmetric: the same key does both jobs.' },
                  { t: 'AES only encrypts numbers, so letters cannot be analysed.', fb: 'AES encrypts any binary data. Everything is bytes to a cipher.' }
                ]
              });
            } else {
              ctx.error(); sfx('bad'); shake(plainEl);
              fb(lockOut, 'bad', `Shift ${k.value} does not produce readable English. Keep turning the dial and watch the final word.`);
            }
          });
          game.append(
            h('span', { class: 'eyebrow', text: 'Intercepted ciphertext' }), h('div', { class: 'cipher-text', text: ct }),
            h('div', { class: 'dial' },
              h('button', { class: 'step', type: 'button', text: '−', 'aria-label': 'Decrease key', onclick: () => step(-1) }),
              kOut, k,
              h('button', { class: 'step', type: 'button', text: '+', 'aria-label': 'Increase key', onclick: () => step(1) })),
            strip,
            h('span', { class: 'eyebrow', text: 'Decrypted with this key' }), plainEl,
            h('div', { class: 'row' }, lock), lockOut);
          el.append(game);
          draw();

          predBtn.addEventListener('click', () => {
            const v = parseInt(predIn.value, 10);
            if (Number.isNaN(v)) { fb(out, 'info', 'Enter a number to commit your prediction.'); return; }
            ctx.attempt();
            predIn.disabled = true; predBtn.disabled = true;
            if (v === 25 || v === 26) fb(out, 'ok', 'Only 25 useful keys exist (a shift of 26, or 0, leaves the text unchanged). That tiny **key space** is what makes brute force trivial.');
            else fb(out, 'info', `You predicted ${v}. There are only 25 useful keys, because a shift of 26 brings every letter back to itself. Keep that number in mind while you crack it.`);
            game.hidden = false;
            k.focus();
          });
        }
      },
      {
        title: 'The XOR machine',
        intro: 'Computers do symmetric encryption on **bits**. A basic building block is XOR: the output bit is 1 when the two input bits are **different**, and 0 when they are the same. Set each output bit yourself.',
        hints: [
          'Work one column at a time and compare the two bits above it. Same gives 0, different gives 1.',
          'For the second pass, the ciphertext you just made becomes the top row. Apply the same key with the same rule.'
        ],
        run(el, ctx) {
          const P = [0, 1, 0, 0, 1, 1, 1, 0]; // 'N'
          const K = [1, 0, 1, 1, 0, 1, 0, 1];
          const xor = (a, b) => a.map((x, i) => x ^ b[i]);
          const C = xor(P, K);
          const out = fbEl();

          function machine(topLabel, top, want, onOk) {
            const grid = h('div', { class: 'bits', role: 'group' });
            const row = (lab, bits) => { grid.append(h('span', { class: 'lab', text: lab })); bits.forEach(b => grid.append(h('span', { class: 'b', text: String(b) }))); };
            row(topLabel, top);
            row('Key', K);
            grid.append(h('span', { class: 'rule' }));
            grid.append(h('span', { class: 'lab', text: 'XOR output' }));
            const outs = want.map((_, i) => {
              const b = h('button', { class: 'b', type: 'button', text: '0', 'aria-label': 'Output bit ' + (i + 1) + ', currently 0' });
              b._v = 0;
              b.addEventListener('click', () => { b._v ^= 1; b.textContent = b._v; b.setAttribute('aria-label', 'Output bit ' + (i + 1) + ', currently ' + b._v); b.classList.remove('is-bad'); sfx('click'); });
              grid.append(b);
              return b;
            });
            const check = h('button', { class: 'btn', type: 'button', text: 'Check bits' });
            check.addEventListener('click', () => {
              ctx.attempt();
              const wrong = outs.filter((b, i) => b._v !== want[i]);
              if (!wrong.length) { outs.forEach(b => (b.disabled = true)); check.remove(); sfx('ok'); onOk(); }
              else {
                ctx.error(); sfx('bad');
                wrong.forEach(b => { b.classList.add('is-bad'); shake(b); });
                fb(out, 'bad', `${wrong.length} bit${wrong.length > 1 ? 's are' : ' is'} wrong. XOR is not addition: 1 XOR 1 = **0**.`);
              }
            });
            el.append(grid, h('div', { class: 'row' }, check));
          }

          el.append(h('span', { class: 'eyebrow', text: 'Pass 1 · encrypt the letter N (01001110)' }));
          machine('Plaintext', P, C, () => {
            fb(out, 'ok', 'Ciphertext: **' + C.join('') + '**. Now send it to the Airport team, who hold the same key.');
            el.append(h('span', { class: 'eyebrow', text: 'Pass 2 · the Airport team decrypt with the same key' }));
            machine('Ciphertext', C, P, () => {
              fb(out, 'ok', 'You got **01001110** back: the original N. Applying the same key twice undoes the encryption.');
              NX.mcq(el, {
                q: 'What did the two passes demonstrate?',
                ctx, onDone: () => ctx.complete(),
                options: [
                  { t: 'Symmetric encryption: the same secret key both encrypts and decrypts.', ok: true, fb: 'Real symmetric ciphers such as AES combine XOR with many rounds of substitution and permutation, but the principle of one shared key is the same.' },
                  { t: 'Hashing: the output can never be turned back into the input.', fb: 'You just reversed it. Hashing is one-way; encryption is designed to be reversible by whoever holds the key.' },
                  { t: 'Asymmetric encryption: two different keys were used.', fb: 'The key row was identical in both passes. One key means symmetric.' }
                ]
              });
            });
          });
          el.append(out);
        }
      },
      {
        title: 'The key problem',
        intro: 'Rin needs to send a brand-new AES key to the Airport station team so they can read tomorrow’s encrypted rosters. The only channel is the open internet, which HEX is watching.',
        hints: [
          'Whatever travels in the open, assume HEX has a copy of it.',
          'You need a way to lock something so that only the Airport team can unlock it, without sharing a secret with them first.'
        ],
        run(el, ctx) {
          NX.mcq(el, {
            q: 'How should Rin get the key to the Airport team?',
            ctx, onDone: () => ctx.complete('Next stop ▸'),
            options: [
              { t: 'Email the key in the same message as the encrypted roster.', fb: 'Whoever intercepts the email gets both the lock and the key. That is the core weakness of symmetric encryption: the **key distribution problem**.' },
              { t: 'Encrypt the new key with the new key, then send it.', fb: 'The Airport team would need the key to decrypt the key. It goes round in a circle.' },
              { t: 'Encrypt the key with the Airport team’s **public key**, so only their **private key** can decrypt it.', ok: true, fb: 'This is **asymmetric** encryption solving symmetric encryption’s biggest problem. It is exactly what HTTPS does, and it is where the next station picks up.' },
              { t: 'Use a longer shift cipher to hide the AES key.', fb: 'Any shift cipher breaks in at most 25 tries, as you just saw.' }
            ]
          });
        }
      }
    ],
    keyIdeas: [
      '**Symmetric encryption** uses one shared secret key to encrypt and decrypt. It is fast, so it is used for bulk data (AES).',
      'Security depends on the **key**, not on keeping the algorithm secret. A large **key space** makes brute force infeasible: Caesar has 25 keys, AES-128 has 2¹²⁸.',
      'XOR with the same key twice returns the original, which shows why one key can both lock and unlock.',
      'The **key distribution problem**: how do you share the secret key safely? Asymmetric encryption solves it.'
    ]
  });
})();
