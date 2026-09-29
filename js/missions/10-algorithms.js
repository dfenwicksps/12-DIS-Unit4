/* Algorithm Works — Parsons problem for a login check, then boundary and loop bug hunts. */
(function () {
  const { h } = NX;

  const LOGIN = [
    { t: 'BEGIN LoginCheck(record, attempt)', indent: 0 },
    { t: 'hashed ← SHA256(record.salt + attempt)', indent: 1 },
    { t: 'IF hashed = record.hash THEN', indent: 1 },
    { t: 'record.failures ← 0', indent: 2 },
    { t: 'OUTPUT "Welcome"', indent: 2 },
    { t: 'ELSE', indent: 1 },
    { t: 'record.failures ← record.failures + 1', indent: 2 },
    { t: 'IF record.failures >= 3 THEN', indent: 2 },
    { t: 'record.locked ← TRUE', indent: 3 },
    { t: 'ENDIF', indent: 2, k: 'a' },
    { t: 'ENDIF', indent: 1, k: 'b' },
    { t: 'END', indent: 0 }
  ];

  NX.register({
    id: 'algorithms', line: 'proto', order: 1, title: 'Algorithm Works', short: 'Pseudocode and testing',
    map: { x: 690, y: 100, label: 'below' },
    requires: ['hash'],
    syllabus: 'Designing algorithms for secure data exchange in pseudocode; boundary testing and finding logic errors.',
    brief: [
      { who: 'rin', text: 'Time to build. The new login service must check a salted password hash and lock an account after three failures. HEX also left **logic bombs** in our validation code. They look fine until the input hits a boundary.' }
    ],
    warmup: {
      q: 'Recall from Hash Harbour: why is a unique salt added to each password before hashing?',
      options: [
        { t: 'So identical passwords produce different hashes, which defeats rainbow tables.', ok: true, fb: 'The salt is stored alongside the hash. It does not need to be secret.' },
        { t: 'So the password can be decrypted later.', fb: 'Hashes cannot be decrypted, salted or not.' },
        { t: 'To make the hash shorter.', fb: 'A salt does not change the hash length.' }
      ]
    },
    rounds: [
      {
        title: 'Assemble the login check',
        intro: 'Put the pseudocode lines in order. Indentation appears once a line is placed. Two extra lines are traps and do not belong.',
        hints: [
          'The algorithm must never compare the plain password. It hashes the attempt the same way the stored hash was made.',
          'Order: hash (with the salt), compare, success branch, failure branch with the lock check nested inside, then close the inner IF before the outer one.'
        ],
        run(el, ctx) {
          const items = LOGIN.map(l => Object.assign({}, l));
          items.push({ t: 'IF attempt = record.password THEN', indent: 1, distractor: true, fb: 'Comparing plain-text passwords means they are stored unhashed. That fails APP 11 security and everything from Hash Harbour.' });
          items.push({ t: 'hashed ← SHA256(attempt)', indent: 1, distractor: true, fb: 'Without the salt, this hash will never match the stored salted hash, so every login fails.' });
          const base = LOGIN.map(l => l.t);
          const swapped = base.slice(); [swapped[3], swapped[4]] = [swapped[4], swapped[3]];
          NX.order(el, {
            items, mono: true, ctx, accept: [base, swapped],
            okText: 'Login check assembled. It never touches a plain-text password and it locks the account after the third failure.',
            onDone: () => {
              NX.mcq(el, {
                q: 'A locked account can still log in with the right password. Which check is missing?',
                ctx, onDone: () => ctx.complete(),
                options: [
                  { t: 'An `IF record.locked = TRUE` check before the hash is compared.', ok: true, fb: 'Locking only helps if every login checks the lock first. Testing a locked account with the **correct** password is exactly the kind of test case that exposes this.' },
                  { t: 'A second SHA256 call.', fb: 'Hashing twice has nothing to do with enforcing the lock.' },
                  { t: 'Resetting failures to 0 in the ELSE branch.', fb: 'That would stop the account ever locking.' }
                ]
              });
            }
          });
        }
      },
      {
        title: 'Boundary bomb',
        intro: 'Requirement: **a top-up must be from $10 to $250 inclusive**. Riders report that some valid top-ups are rejected. Find the faulty line.',
        hints: [
          '“Inclusive” means the boundary values themselves are allowed.',
          'Test the exact boundary values, $10 and $250, by hand against each comparison operator.'
        ],
        run(el, ctx) {
          NX.lineHunt(el, {
            ctx,
            lines: ['BEGIN ValidateTopUp(amount)', '  IF amount > 10 AND amount <= 250 THEN', '    RETURN TRUE', '  ELSE', '    RETURN FALSE', '  ENDIF', 'END'],
            bad: 1,
            why: { 2: 'Returning TRUE for a valid amount is correct.', 4: 'Returning FALSE for an invalid amount is correct.', 0: 'The header is fine.' },
            okText: 'Found it: `amount > 10` rejects exactly $10.',
            onDone: () => NX.series(el, [
              {
                q: 'Which **test input** exposes the bug?',
                options: [
                  { t: '10', ok: true, fb: 'A valid boundary value that the code rejects. Boundary testing tries the values **on**, **just inside** and **just outside** each limit.' },
                  { t: '250', fb: '`250 <= 250` is TRUE, so the upper boundary works.' },
                  { t: '100', fb: 'A typical value passes either way. It cannot tell `>` from `>=`.' },
                  { t: '300', fb: '300 is correctly rejected. It tests the invalid range, not the faulty boundary.' }
                ]
              },
              {
                q: 'Which fix is correct **and** minimal?',
                options: [
                  { t: '`IF amount >= 10 AND amount <= 250 THEN`', ok: true, fb: 'One operator changed, and both boundaries are now inclusive.' },
                  { t: '`IF amount >= 10 OR amount <= 250 THEN`', fb: 'With OR, every number satisfies at least one side, so $5,000 would be accepted.' },
                  { t: '`IF amount > 9 AND amount <= 250 THEN`', fb: 'That works for whole dollars but accepts $9.50. Amounts can have cents.' }
                ]
              }
            ], ctx, () => ctx.complete())
          });
        }
      },
      {
        title: 'Loop bomb',
        intro: 'This checksum routine should add up the character codes of **every** character in the payload. Strings are indexed from **0**. HEX changed the first character of a message and the checksum did not notice.',
        hints: [
          'Write out the indexes a 3-character string actually has, then the values the loop counter takes.',
          'A string of length n has indexes 0 to n − 1. Compare that with the loop’s start and end values.'
        ],
        run(el, ctx) {
          NX.lineHunt(el, {
            ctx,
            lines: ['BEGIN Checksum(payload)', '  total ← 0', '  FOR i ← 1 TO LENGTH(payload) - 1', '    total ← total + ASCII(payload[i])', '  ENDFOR', '  RETURN total MOD 256', 'END'],
            bad: 2,
            why: { 1: 'The total must start at 0. This is correct.', 3: 'Adding each character code is the intended operation.', 5: 'MOD 256 keeps the checksum within one byte, as designed.' },
            okText: 'Found it: the loop starts at index 1, so `payload[0]` is never added.',
            onDone: () => NX.mcq(el, {
              q: 'Which loop header fixes it?',
              ctx, onDone: () => ctx.complete(),
              options: [
                { t: '`FOR i ← 0 TO LENGTH(payload) - 1`', ok: true, fb: 'Now every index from 0 to n − 1 is visited exactly once.' },
                { t: '`FOR i ← 1 TO LENGTH(payload)`', fb: 'This still skips index 0, and index n is past the end of the string, so it causes an out-of-range error.' },
                { t: '`FOR i ← 0 TO LENGTH(payload)`', fb: 'Index 0 is now included, but index n does not exist. This is an off-by-one in the other direction.' }
              ]
            })
          });
        }
      }
    ],
    keyIdeas: [
      'Secure login: **hash the attempt with the stored salt** and compare hashes. Never store or compare plain-text passwords.',
      'Check the **lock state first**. Test with the correct password on a locked account.',
      '**Boundary testing**: test on, just inside and just outside every limit. “Inclusive” needs `>=` and `<=`.',
      '**AND vs OR**: a range check needs AND. With OR, almost everything passes.',
      '**Off-by-one**: a string of length n has indexes 0 to n − 1. Check the loop’s first and last values.'
    ]
  });
})();
