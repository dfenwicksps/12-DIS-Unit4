/* API Gate — HTTP methods, endpoints, status codes, authentication vs authorisation. */
(function () {
  const { h, md, esc, fb, fbEl, sfx, shake } = NX;

  const TASKS = [
    {
      task: 'Show every stop in zone 2.',
      method: 'GET', endpoint: '/stops?zone=2',
      endpoints: ['/stops?zone=2', '/stops/2', '/zones/2/delete'],
      res: '200 OK\n[\n  {"id": 14, "name": "Central", "zone": 2},\n  {"id": 21, "name": "Stadium", "zone": 2}\n]'
    },
    {
      task: 'Register a new student card for Sam Lee.',
      method: 'POST', endpoint: '/cards',
      endpoints: ['/cards', '/cards/Sam', '/cards?create=true'],
      body: '{"rider": "Sam Lee", "type": "student"}',
      res: '201 Created\nLocation: /cards/NX-51877\n{"cardId": "NX-51877", "rider": "Sam Lee", "type": "student", "balance": 0}'
    },
    {
      task: 'Replace card NX-40912’s record so its type becomes “concession”.',
      method: 'PUT', endpoint: '/cards/NX-40912',
      endpoints: ['/cards/NX-40912', '/cards', '/concession'],
      body: '{"rider": "Mia Tran", "type": "concession", "balance": 23.50}',
      res: '200 OK\n{"cardId": "NX-40912", "rider": "Mia Tran", "type": "concession", "balance": 23.50}'
    },
    {
      task: 'Cancel lost card NX-40912.',
      method: 'DELETE', endpoint: '/cards/NX-40912',
      endpoints: ['/cards/NX-40912', '/cards', '/cards/NX-40912/lost'],
      res: '204 No Content'
    }
  ];

  const METHOD_FB = {
    GET: 'GET only **reads** data. It must never create, change or delete anything.',
    POST: 'POST **creates** a new resource inside a collection. It is not used to read, replace or remove a specific record.',
    PUT: 'PUT **replaces** an existing resource at a known address. Use it to update, not to create in a collection, read or delete.',
    DELETE: 'DELETE **removes** the resource at the address. Is that what this task asks for?'
  };

  const paint = s => esc(s).replace(/^(\d)(\d\d [^\n]*)/, (_, a, b) => `<span class="s${a}">${a}${b}</span>`);

  NX.register({
    id: 'api', line: 'exchange', order: 6, title: 'API Gate', short: 'REST APIs and HTTP',
    map: { x: 740, y: 300, label: 'above' },
    requires: ['hash'],
    syllabus: 'Exchanging data through web APIs: HTTP methods, endpoints, JSON bodies, status codes, authentication and authorisation.',
    brief: [
      { who: 'rin', text: 'The rider app talks to NEXUS through a **REST API**: it sends HTTP requests to endpoints and gets JSON back. HEX scrambled the request logs, so the app is sending nonsense. Rebuild the requests by hand.' }
    ],
    warmup: {
      q: 'Recall from Hash Harbour: which property means the same input always produces the same hash?',
      options: [
        { t: 'Deterministic', ok: true, fb: 'That is why a login attempt can be hashed and compared with the stored hash.' },
        { t: 'Avalanche effect', fb: 'The avalanche effect means a small change to the input gives a completely different hash.' },
        { t: 'Fixed length', fb: 'Fixed length is about the size of the output, not whether it repeats.' },
        { t: 'One-way', fb: 'One-way means the hash cannot be reversed.' }
      ]
    },
    rounds: [
      {
        title: 'Build the request',
        intro: 'For each job, choose the HTTP **method** and the **endpoint**, then send the request.',
        hints: [
          'Match the verb in the task to CRUD: Create, Read, Update, Delete.',
          'GET reads, POST creates in a collection (`/cards`), PUT replaces a specific item (`/cards/{id}`), DELETE removes a specific item. Filters go in the query string after `?`.'
        ],
        run(el, ctx) {
          let ti = 0;
          const holder = h('div', { style: 'display:grid;gap:12px' });
          el.append(holder);
          function show() {
            holder.innerHTML = '';
            const T = TASKS[ti];
            let method = null, ep = null;
            const segM = h('div', { class: 'seg', role: 'group', 'aria-label': 'HTTP method' });
            ['GET', 'POST', 'PUT', 'DELETE'].forEach(m => {
              const b = h('button', { type: 'button', text: m, 'aria-pressed': 'false' });
              b.addEventListener('click', () => { method = m; segM.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); sfx('click'); });
              segM.append(b);
            });
            const segE = h('div', { class: 'seg', role: 'group', 'aria-label': 'Endpoint' });
            NX.shuffle(T.endpoints).forEach(e => {
              const b = h('button', { type: 'button', text: e, 'aria-pressed': 'false' });
              b.addEventListener('click', () => { ep = e; segE.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); sfx('click'); });
              segE.append(b);
            });
            const term = h('div', { class: 'terminal', 'aria-live': 'polite', text: '> waiting for request…' });
            const out = fbEl();
            const send = h('button', { class: 'btn', type: 'button', text: 'Send request' });
            send.addEventListener('click', () => {
              if (!method || !ep) { fb(out, 'info', 'Choose a method and an endpoint first.'); return; }
              ctx.attempt();
              const req = `> ${method} https://api.nexus.transit${ep}` + (T.body && method !== 'GET' && method !== 'DELETE' ? `\n> Content-Type: application/json\n> ${T.body}` : '');
              if (method === T.method && ep === T.endpoint) {
                term.innerHTML = esc(req) + '\n\n' + paint(T.res);
                sfx('ok'); send.disabled = true;
                segM.querySelectorAll('button').forEach(b => (b.disabled = true));
                segE.querySelectorAll('button').forEach(b => (b.disabled = true));
                fb(out, 'ok', { GET: 'A read-only request. The filter goes in the query string.', POST: '**201 Created**: the server made the resource and says where it lives.', PUT: 'The whole record at that address was replaced with the body you sent.', DELETE: '**204 No Content**: it worked, and there is nothing to send back.' }[T.method]);
                ti++;
                if (ti >= TASKS.length) { ctx.complete(); return; }
                const b = h('button', { class: 'btn', type: 'button', text: 'Next job' });
                b.addEventListener('click', show);
                holder.append(b);
                b.focus();
              } else {
                ctx.error(); sfx('bad'); shake(term);
                const wrongM = method !== T.method;
                const code = wrongM ? '405 Method Not Allowed' : '404 Not Found';
                term.innerHTML = esc(req) + '\n\n' + paint(code);
                fb(out, 'bad', wrongM ? METHOD_FB[method] : 'The method is right, but that endpoint does not identify the resource this job needs. Collections are plural nouns, a specific item adds its id, and actions are never put in the URL.');
              }
            });
            holder.append(h('div', { class: 'task' }, h('b', { text: `JOB ${ti + 1}/${TASKS.length}` }), h('span', { text: T.task })),
              h('span', { class: 'eyebrow', text: 'Method' }), segM,
              h('span', { class: 'eyebrow', text: 'Endpoint' }), segE,
              h('div', { class: 'row' }, send), term, out);
          }
          show();
        }
      },
      {
        title: 'Status triage',
        intro: 'The app is receiving these responses. Diagnose each one before a rider rings the help desk.',
        hints: [
          '2xx means success, 4xx means the **client** (the app or the user) did something wrong, and 5xx means the **server** failed.',
          '401 means the server doesn’t know **who** you are. 403 means it knows who you are, but you’re **not allowed**.'
        ],
        run(el, ctx) {
          NX.series(el, [
            {
              q: '`GET /riders/me/trips` → `401 Unauthorized` with body `{"error": "missing or expired token"}`',
              options: [
                { t: 'The app has not proved who the rider is. It needs to log in again or send a valid token.', ok: true, fb: '401 is really about **authentication**. The fix is valid credentials.' },
                { t: 'The rider is logged in but is not allowed to see trips.', fb: 'That would be **403 Forbidden**. The body says the token is missing or expired, so the server does not know who this is.' },
                { t: 'The trips resource does not exist.', fb: 'That would be **404 Not Found**.' }
              ]
            },
            {
              q: 'A student account (logged in) sends `DELETE /stops/14` → `403 Forbidden`',
              options: [
                { t: 'The server knows who the user is, but their role is not allowed to delete stops. Retrying will not help.', ok: true, fb: '403 is about **authorisation**. Only an admin role can do this.' },
                { t: 'The token has expired, so the user should log in again.', fb: 'That is 401. The user is already authenticated, and logging in again will still give 403.' },
                { t: 'Stop 14 has already been deleted.', fb: 'A resource that is not there gives **404**.' }
              ]
            },
            {
              q: '`POST /topups` with body `{"cardId": "NX-40912", "amount": "twenty"}` → `400 Bad Request`',
              options: [
                { t: 'The request data is invalid: `amount` must be a number. The app should validate before sending.', ok: true, fb: 'A 400 error is the client’s to fix. Validating input in the app first saves a wasted request.' },
                { t: 'The server crashed while processing the top-up.', fb: 'A server crash gives a **5xx** code. A 400 says the server understood the request and rejected it.' },
                { t: 'The rider has insufficient funds.', fb: 'The message points at the format of the data, not the balance.' }
              ]
            },
            {
              q: '`GET /stops` (a request that worked yesterday, unchanged) → `500 Internal Server Error`',
              options: [
                { t: 'Something failed on the server. The request is probably fine: retry later and report it.', ok: true, fb: '5xx codes mean the server is at fault. Changing the request will not fix it.' },
                { t: 'The app built the URL wrong.', fb: 'The request has not changed and worked yesterday. A malformed request would give 4xx.' },
                { t: 'The user needs to log in.', fb: 'That would be 401.' }
              ]
            }
          ], ctx, () => ctx.complete());
        }
      },
      {
        title: 'Who are you, and what may you do?',
        intro: '**Authentication** checks *who* someone is. **Authorisation** decides *what* they may do. Sort each NEXUS check.',
        hints: [
          'Is the check proving an identity, or applying a permission to an identity that is already known?',
          'Passwords, codes, fingerprints and API keys prove identity. Roles, permissions and 403 responses are about what an identity is allowed to do.'
        ],
        run(el, ctx) {
          NX.tapSort(el, {
            ctx, onDone: () => ctx.complete(),
            bins: [{ id: 'authn', label: 'Authentication', desc: 'Who are you?' }, { id: 'authz', label: 'Authorisation', desc: 'What may you do?' }],
            items: [
              { t: 'Rider logs in with a password plus an SMS code', bin: 'authn', fb: 'Password and code together prove identity. That is multi-factor **authentication**.' },
              { t: 'The API checks that a request’s API key belongs to a registered app', bin: 'authn', fb: 'An API key identifies the calling app, so it is **authentication**.' },
              { t: 'Only the admin role may delete stops', bin: 'authz', fb: 'A role-based permission is **authorisation**.' },
              { t: 'Students can view timetables but not edit them', bin: 'authz', fb: 'Deciding allowed actions for a known group is **authorisation**.' },
              { t: 'A driver scans a fingerprint to start a shift', bin: 'authn', fb: 'Biometrics prove who the driver is, so it is **authentication**.' },
              { t: 'The server returns 403 Forbidden', bin: 'authz', fb: '403 means “we know you, but you may not”. That is **authorisation**.' }
            ]
          });
        }
      }
    ],
    keyIdeas: [
      'A **REST API** exposes resources at **endpoints** (URLs). Clients send HTTP requests and usually get JSON back.',
      '**GET** reads, **POST** creates (in a collection), **PUT** replaces or updates (a specific item), **DELETE** removes. GET must never change data.',
      'Status codes: **2xx** success (200 OK, 201 Created, 204 No Content), **4xx** client error (400 bad data, 401 not authenticated, 403 not authorised, 404 not found), **5xx** server error.',
      '**Authentication** answers “who are you?” (passwords, tokens, API keys, biometrics). **Authorisation** answers “what may you do?” (roles, permissions).',
      'Validate data on the client **and** the server: client-side validation saves wasted requests, and server-side validation is the one you can trust.'
    ]
  });
})();
