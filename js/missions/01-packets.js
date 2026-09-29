/* Packet Yard — packets, sequence numbers, checksums, TCP vs UDP. */
(function () {
  const { h, md, fb, fbEl, sfx } = NX;
  const checksum = s => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 256;
  const hex2 = n => n.toString(16).toUpperCase().padStart(2, '0');

  const PAYLOADS = ['NEXUS TR', 'AIN 07:0', '5 TO CEN', 'TRAL PLA', 'TFORM 4.'];

  NX.register({
    id: 'packets', line: 'exchange', order: 1, title: 'Packet Yard', short: 'Packets, TCP and UDP',
    map: { x: 80, y: 300, label: 'above' },
    requires: [],
    syllabus: 'How data is broken up, transmitted and reassembled; reliability, error detection and choice of protocol.',
    brief: [
      { who: 'hex', text: 'Your timetable is in pieces. Good luck putting it back together. — HEX' },
      { who: 'rin', text: 'HEX flooded the Packet Yard. Messages between stations are arriving **out of order**, **duplicated** and **damaged**. The 07:05 departure notice has to go out. Rebuild it the way the receiving computer would.' }
    ],
    warmup: {
      q: 'A 3 MB photo is sent from a rider’s phone to the NEXUS server. What actually travels across the network?',
      options: [
        { t: 'The whole file travels along one reserved path from start to finish.', fb: 'That describes **circuit switching** (like an old phone call). The internet uses packet switching: no path is reserved.' },
        { t: 'The file is split into packets, each with a header, and packets may take different routes.', ok: true, fb: 'Each packet carries addressing and sequencing information in its header, so it can travel independently and be reassembled.' },
        { t: 'The file is converted to JSON so routers can read the photo’s contents.', fb: 'JSON is a data-interchange format for applications. Routers only read packet headers (addresses), never the application data.' },
        { t: 'The file is compressed into one packet small enough to send in a single go.', fb: 'Compression shrinks data but a 3 MB photo still far exceeds a single packet’s maximum size (typically about 1500 bytes).' }
      ]
    },
    rounds: [
      {
        title: 'Rebuild the departure notice',
        intro: 'Six packets arrived in the order shown. Each **sequence number** is the byte position where that packet’s data starts. Rebuild the message the way TCP would.',
        hints: [
          'The receiver ignores arrival order. It only trusts the header information.',
          'Sort by sequence number, lowest first. If two packets share a sequence number, one of them is a copy: keep only one.'
        ],
        run(el, ctx) {
          const arrival = [2, 0, 4, 2, 1, 3];
          el.append(h('span', { class: 'eyebrow', text: 'Arrival order' }),
            h('div', { class: 'packet-grid' }, arrival.map((p, i) =>
              h('div', { class: 'pkt' }, h('b', { text: 'ARRIVED #' + (i + 1) + ' · SEQ ' + p * 8 }), '"' + PAYLOADS[p] + '"'))));
          const items = PAYLOADS.map((t, i) => ({ t: `SEQ ${String(i * 8).padStart(2, '0')}  "${t}"` }));
          items.push({ t: 'SEQ 16  "5 TO CEN"  (arrived #4)', distractor: true, fb: 'That packet is a **duplicate**: its sequence number is already in the message. TCP recognises the repeated sequence number and discards the copy (the sender retransmitted because an acknowledgement was slow).' });
          el.append(h('span', { class: 'eyebrow', text: 'Reassemble (five packets needed)' }));
          NX.order(el, {
            items, mono: true, ctx,
            accept: [items.slice(0, 5).map(i => i.t), [items[0].t, items[1].t, items[5].t, items[3].t, items[4].t]],
            okText: 'Message rebuilt: **NEXUS TRAIN 07:05 TO CENTRAL PLATFORM 4.** The duplicate was never needed.',
            onDone: () => ctx.complete()
          });
        }
      },
      {
        title: 'Damaged cargo',
        intro: 'Each header carries a **checksum** the sender calculated from the payload. The receiver recalculates it on arrival. Here is the receiver’s log.',
        hints: [
          'A checksum only tells you *whether* something changed, not *what* the original was.',
          'Compare the two checksum columns row by row. Then think about who still has an undamaged copy of that packet.'
        ],
        run(el, ctx) {
          const recv = PAYLOADS.slice();
          recv[3] = 'TRAL PL@';
          const tbl = h('table', { class: 'pkt-table' },
            h('thead', null, h('tr', null, ['Seq', 'Payload received', 'Checksum in header', 'Receiver calculates'].map(t => h('th', { text: t })))),
            h('tbody', null, recv.map((p, i) => h('tr', null,
              h('td', { text: String(i * 8) }), h('td', { text: '"' + p + '"' }),
              h('td', { text: '0x' + hex2(checksum(PAYLOADS[i])) }), h('td', { text: '0x' + hex2(checksum(p)) })))));
          el.append(h('div', { class: 'table-scroll' }, tbl));
          NX.series(el, [
            {
              q: 'What should the receiver do?',
              options: [
                { t: 'Acknowledge everything. Four out of five packets are fine and the reader can guess the rest.', fb: 'If the receiver acknowledges a corrupted packet, TCP’s reliability guarantee is broken and the timetable is published with an error.' },
                { t: 'Request retransmission of the packet at sequence 24 only.', ok: true, fb: 'Only seq 24 fails its checksum, so only that packet needs resending. TCP does this by not acknowledging it, and the sender retransmits after a timeout.' },
                { t: 'Ask for the entire message again because one packet failed.', fb: 'That works but wastes bandwidth. Sequence numbers let TCP identify and resend just the damaged segment.' },
                { t: 'Change the @ back to A, since the checksum shows what the byte should be.', fb: 'A checksum **detects** errors but cannot **correct** them. Many different payloads share the same checksum, so the receiver cannot reconstruct the original.' }
              ]
            },
            {
              q: 'The retransmitted packet at seq 24 never arrives either. What happens next under TCP?',
              options: [
                { t: 'The sender gets no acknowledgement, its timer runs out, and it sends the packet again.', ok: true, fb: 'TCP keeps a retransmission timer for unacknowledged data and keeps resending until it receives an acknowledgement, or gives up and reports that the connection failed.' },
                { t: 'The receiver skips seq 24 and displays the rest of the message.', fb: 'That is closer to UDP behaviour. TCP delivers data in order and complete, or not at all.' },
                { t: 'A router rebuilds the missing packet from the packets on either side of it.', fb: 'Routers forward packets and never reconstruct lost data. Recovery happens between the two endpoints.' }
              ]
            }
          ], ctx, () => ctx.complete());
        }
      },
      {
        title: 'Pick the protocol',
        intro: 'TCP is reliable and ordered but slower. UDP is fast but gives no guarantee of delivery or order. Sort each NEXUS service onto the protocol it should use.',
        hints: [
          'Ask: if one packet is lost, is it better to wait for it, or to carry on without it?',
          'Where late data is useless (live audio, video, positions), speed wins. Where every byte must be exact (files, payments), reliability wins.'
        ],
        run(el, ctx) {
          NX.tapSort(el, {
            ctx,
            bins: [{ id: 'tcp', label: 'TCP', desc: 'Reliable, ordered, acknowledged' }, { id: 'udp', label: 'UDP', desc: 'Fast, no delivery guarantee' }],
            items: [
              { t: 'Downloading the new timetable file', bin: 'tcp', fb: 'A timetable with a missing chunk is corrupt. Every byte must arrive, so use **TCP**.' },
              { t: 'Live CCTV feed from Platform 2', bin: 'udp', fb: 'A resent frame from two seconds ago is useless in a live feed. Dropping a frame is better than stalling, so use **UDP**.' },
              { t: 'Rider tops up $20 through the app', bin: 'tcp', fb: 'A payment must be exact and confirmed. Losing part of it would be a serious error, so use **TCP**.' },
              { t: 'Voice call between two train drivers', bin: 'udp', fb: 'Real-time voice cannot wait for retransmissions. A tiny glitch is better than delay, so use **UDP**.' },
              { t: 'Live train positions refreshed every second', bin: 'udp', fb: 'A newer position arrives a second later anyway, so a lost update does not need resending. Use **UDP**.' },
              { t: 'Emailing the monthly incident report', bin: 'tcp', fb: 'The document must arrive intact and in order, so use **TCP**.' }
            ],
            onDone: () => ctx.complete()
          });
        }
      }
    ],
    keyIdeas: [
      'Data is split into **packets**. Each header carries source and destination addresses, a **sequence number** and a **checksum**.',
      'The receiver reassembles packets by sequence number, not arrival order, and discards duplicates.',
      'A **checksum detects** corruption but cannot correct it. The damaged packet has to be resent.',
      '**TCP**: connection-based, acknowledgements, retransmission, ordered delivery. Use it for files, payments and web pages.',
      '**UDP**: no acknowledgements or retransmission, low delay. Use it for live audio and video, games and sensor streams where late data is useless.'
    ]
  });
})();
