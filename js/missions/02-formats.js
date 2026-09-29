/* Format Forge — JSON, XML and CSV: syntax, choice and translation. */
(function () {
  const { h } = NX;

  const SNIPPETS = [
    {
      label: 'Rider card record · JSON',
      lines: ['{', '  "cardId": "NX-40912",', '  "rider": "Mia Tran",', '  "balance": 23.50,', '  "concession": true,', '  "trips": [101, 102, 103,]', '}'],
      bad: 5,
      why: { 3: 'Numbers in JSON are written without quotes, and decimals are allowed.', 4: '`true` and `false` are valid JSON booleans (lowercase, no quotes).', 1: 'Keys are double-quoted strings. This line is fine.' },
      fix: {
        q: 'What is the smallest fix?',
        options: [
          { t: 'Delete the comma after `103`.', ok: true, fb: 'JSON does not allow a **trailing comma** after the last item in an array or object. Many programming languages allow it, which is why the mistake is so common.' },
          { t: 'Put the trip numbers in quotes: `["101", "102", "103",]`.', fb: 'Numbers do not need quotes, and the trailing comma would still make it invalid.' },
          { t: 'Change the square brackets to braces: `{101, 102, 103}`.', fb: 'Braces mark an **object**, which needs `"key": value` pairs. A list of values is an **array** and uses square brackets.' }
        ]
      }
    },
    {
      label: 'Stop record · JSON',
      lines: ['{', '  "stop": \'Central\',', '  "platforms": 6,', '  "open": true', '}'],
      bad: 1,
      why: { 2: 'An integer value without quotes is valid.', 3: 'The last pair has no trailing comma, which is correct.' },
      fix: {
        q: 'Why does this line break the JSON?',
        options: [
          { t: 'JSON strings must use double quotes. Single quotes are not allowed.', ok: true, fb: 'Python and JavaScript accept `\'single\'` quotes, but JSON does not. Both keys and string values need `"double quotes"`.' },
          { t: 'Station names cannot contain capital letters.', fb: 'String values can contain any characters. The problem is the quote style.' },
          { t: 'The key `"stop"` is a reserved word in JSON.', fb: 'JSON has no reserved key names. Any string can be a key.' }
        ]
      }
    },
    {
      label: 'Trip record · XML',
      lines: ['<trip id="T88">', '  <from>Central</from>', '  <to>Airport</To>', '  <fare>4.20</fare>', '</trip>'],
      bad: 2,
      why: { 0: 'An attribute with a quoted value is valid XML.', 3: 'Element content can be any text, including numbers.', 4: 'The root element is closed correctly.' },
      fix: {
        q: 'What rule does this line break?',
        options: [
          { t: 'XML tags are case-sensitive, so `<to>` must be closed with `</to>`.', ok: true, fb: 'In XML, `<to>` and `<To>` are different element names. Every start tag must be closed by an end tag with exactly the same name.' },
          { t: 'Place names must be stored in attributes, not elements.', fb: 'Choosing between an attribute and an element is a design decision, not a syntax rule. Both are valid.' },
          { t: 'XML cannot store two locations in one record.', fb: 'XML can hold any number of child elements. The problem is the mismatched tag.' }
        ]
      }
    },
    {
      label: 'Stops export · CSV',
      lines: ['stop_id,name,zone', '14,Central,1', '15,Riverside, North,2', '16,Airport,3'],
      bad: 2,
      why: { 0: 'The header row names each column, which is good practice.', 1: 'Three values for three columns. This row is fine.', 3: 'Three values for three columns. This row is fine.' },
      fix: {
        q: 'How should this row be written?',
        options: [
          { t: '`15,"Riverside, North",2` (quote the field that contains a comma).', ok: true, fb: 'The comma is the delimiter, so an unquoted comma inside a value splits it into an extra column. Wrapping the field in double quotes keeps it together.' },
          { t: '`15;Riverside, North;2` (switch to semicolons on this row only).', fb: 'Every row in a CSV file must use the same delimiter. Mixing them breaks parsing.' },
          { t: '`15,Riverside North,2` (delete the comma from the data).', fb: 'That changes the data itself. Fix the format and leave the content alone.' }
        ]
      }
    }
  ];

  NX.register({
    id: 'formats', line: 'exchange', order: 2, title: 'Format Forge', short: 'JSON, XML and CSV',
    map: { x: 200, y: 300, label: 'above' },
    requires: ['packets'],
    syllabus: 'Data interchange formats (JSON, XML, CSV): structure, syntax rules and choosing a format for a purpose.',
    brief: [
      { who: 'rin', text: 'The packets arrive now, but the systems still can’t understand each other. HEX has corrupted the **data formats** the stations use to swap records. Every parser that hits a syntax error rejects the whole file.' },
      { who: 'hex', text: 'One comma. That’s all it takes. — HEX' }
    ],
    warmup: {
      q: 'Recall from Packet Yard: packet seq 24 failed its checksum. What does TCP do?',
      options: [
        { t: 'Gets seq 24 resent by not acknowledging it.', ok: true, fb: 'Only the damaged segment is resent.' },
        { t: 'Uses the checksum to repair the byte.', fb: 'Checksums detect errors. They cannot tell you what the original data was.' },
        { t: 'Discards the whole connection and starts again.', fb: 'Sequence numbers let TCP target the single faulty segment.' }
      ]
    },
    rounds: [
      {
        title: 'Find the fault',
        intro: 'Each record below would be rejected by a parser. Tap the line with the error, then choose the fix.',
        hints: [
          'Each format has a few strict rules: how strings are quoted, what may follow the last item, whether tags must match exactly.',
          'JSON: double quotes only, no trailing commas. XML: every tag closed with exactly the same name. CSV: a comma inside a value needs the field in quotes.'
        ],
        run(el, ctx) {
          let i = 0;
          const next = () => {
            if (i >= SNIPPETS.length) { ctx.complete(); return; }
            const sn = SNIPPETS[i++];
            const box = h('div', { class: 'series-item' }, h('span', { class: 'eyebrow', text: `Record ${i} of ${SNIPPETS.length} · ${sn.label}` }));
            el.append(box);
            NX.lineHunt(box, {
              lines: sn.lines, bad: sn.bad, why: sn.why, ctx,
              onDone: () => NX.mcq(box, Object.assign({}, sn.fix, { ctx, onDone: () => {
                if (i >= SNIPPETS.length) { ctx.complete(); return; }
                const b = h('button', { class: 'btn', type: 'button', text: 'Next record', onclick: () => { b.remove(); next(); } });
                box.append(b);
              } }))
            });
            if (i > 1) box.scrollIntoView({ behavior: NX.reduced() ? 'auto' : 'smooth', block: 'start' });
          };
          next();
        }
      },
      {
        title: 'Pick the format',
        intro: 'More than one format could technically work in each case. Pick the **best fit** for the stated need.',
        hints: [
          'Look at the **shape** of the data (flat table or nested?) and at **who or what consumes it**.',
          'Flat rows for spreadsheets suit CSV. Nested data for a web or mobile app suits JSON. Strict schemas, attributes and namespaces suit XML.'
        ],
        run(el, ctx) {
          NX.series(el, [
            {
              q: 'Finance wants 50,000 tap-on records (card, stop, time) to open in a spreadsheet.',
              options: [
                { t: 'CSV', ok: true, fb: 'The data is flat, with the same three fields in every row. CSV is compact and opens directly in spreadsheet software.' },
                { t: 'JSON', fb: 'JSON would work, but it repeats every key name in every record, which makes the file much bigger, and spreadsheets do not open it natively. Nothing here is nested.' },
                { t: 'XML', fb: 'Opening and closing tags around every value would more than double the file size, and there is nothing hierarchical to represent.' }
              ]
            },
            {
              q: 'The rider app asks the server for a journey plan: one rider, a list of legs, and each leg has its own list of stops.',
              options: [
                { t: 'JSON', ok: true, fb: 'Nested arrays and objects map directly onto the data. JSON is lightweight, and JavaScript and mobile apps parse it natively.' },
                { t: 'CSV', fb: 'CSV is one flat table. Lists inside lists would mean repeating the rider on every row or inventing your own encoding.' },
                { t: 'XML', fb: 'XML can represent this hierarchy, but closing tags make it heavier to send and slower to parse on a phone. It is not the best fit.' }
              ]
            },
            {
              q: 'The transport regulator requires fare files that validate against its published schema, which uses attributes and namespaces.',
              options: [
                { t: 'XML', ok: true, fb: 'Attributes and namespaces are XML features, and XML Schema (XSD) validation is standard for strict document exchange with government and industry.' },
                { t: 'JSON', fb: 'JSON Schema exists, but the requirement names attributes and namespaces, which JSON does not have. The regulator’s format decides this one.' },
                { t: 'CSV', fb: 'CSV has no schema, attributes or namespaces. It cannot meet this requirement.' }
              ]
            }
          ], ctx, () => ctx.complete());
        }
      },
      {
        title: 'Translate the record',
        intro: 'The Airport system only accepts XML. Which XML document carries exactly the same data as this JSON and is **well-formed**?',
        hints: [
          'Check each option for well-formedness first: one root element, every tag closed, attribute values quoted.',
          'Then check the data: is every value from the JSON present, including both zones?'
        ],
        run(el, ctx) {
          el.append(NX.codeBlock('{\n  "stop": {\n    "id": 14,\n    "name": "Central",\n    "zones": [1, 2]\n  }\n}'));
          NX.mcq(el, {
            ctx, onDone: () => ctx.complete(),
            options: [
              { code: '<stop id="14">\n  <name>Central</name>\n  <zones>\n    <zone>1</zone>\n    <zone>2</zone>\n  </zones>\n</stop>', ok: true,
                fb: 'Well-formed, and every value is present. The JSON array becomes repeated `<zone>` elements. Storing `id` as an attribute is a valid design choice.' },
              { code: '<stop>\n  <id>14</id>\n  <name>Central</name>\n  <zones>1, 2</zones>', fb: 'The root `<stop>` element is never closed, so this is not well-formed. Squashing the zones into one text value `1, 2` also loses the list structure.' },
              { code: '<stop id=14 name="Central">\n  <zone>1</zone>\n  <zone>2</zone>\n</stop>', fb: 'Every attribute value must be quoted: `id="14"`. The unquoted value makes the whole document invalid.' }
            ]
          });
        }
      }
    ],
    keyIdeas: [
      '**JSON**: objects `{ "key": value }` and arrays `[ ]`. Double quotes only, no trailing commas. Values are string, number, `true`/`false`, `null`, object or array. It is lightweight and the usual choice for web APIs.',
      '**XML**: a single root element, case-sensitive tags that must match, quoted attribute values, proper nesting. It is verbose but supports schemas (XSD), attributes and namespaces.',
      '**CSV**: a header row, then one record per line. Any field containing a comma must be wrapped in double quotes. It is compact but flat and has no data types.',
      'Choose the format by the **shape of the data** (flat or nested) and **what consumes it** (a spreadsheet, a JavaScript app, a regulator’s schema).'
    ]
  });
})();
