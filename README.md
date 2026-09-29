# NEXUS — Digital Solutions Unit 4

A browser game for QCAA Digital Solutions Unit 4. Students restore a city's
transit data network after an attack by "HEX". Each station on the network map
is a mission built from short interactive mini-games, and together the stations
cover the Unit 4 subject matter students need for the external exam.

No install, no server and no build step: open `index.html` in a browser.

## The map

| Line | Station | What students do |
|---|---|---|
| **Exchange Line**: digital methods for exchanging data | Packet Yard | Reassemble out-of-order packets by sequence number, discard a duplicate, act on a checksum failure, sort services onto TCP or UDP |
| | Format Forge | Find the faulty line in broken JSON, XML and CSV, choose the minimal fix, pick the best format for a purpose, translate JSON to well-formed XML |
| | Cipher Street | Predict the key space, then crack a Caesar cipher on a live dial; compute XOR encryption and decryption bit by bit; solve the key distribution problem |
| | Keyring Junction | Load the right public or private key for confidentiality and signatures; order the digital-signature pipeline; mark an AI-written HTTPS answer and rewrite the flawed sentence |
| | Hash Harbour | Predict the avalanche effect, then see real SHA-256; catch a tampered file by comparing hashes; analyse a leaked unsalted password table |
| | API Gate | Build GET/POST/PUT/DELETE requests against endpoints and read the responses; triage 400/401/403/500; sort authentication vs authorisation |
| **Requirements Line**: problems and solution requirements | Privacy Plaza | Rule on NEXUS practices against the Australian Privacy Principles; order a Notifiable Data Breaches response |
| | Impact Court | Sort personal, social and economic impacts; check two options against prescribed criteria and write a justified recommendation, then self-mark it |
| | Usability Lab | Find five flaws on a mock phone screen and classify each by usability principle (accessibility, effectiveness, safety, utility, learnability); make a constrained redesign |
| **Prototype Line**: prototyping data exchanges | Algorithm Works | Parsons puzzle for a salted-hash login check with account lockout; boundary and off-by-one bug hunts in pseudocode |
| | Trace Tunnel | Predict, then desk-check a check-digit algorithm and a Caesar routine in trace tables; a transfer task |
| **Nexus Core** | Final challenge | Ten interleaved questions set in unseen scenarios (a school canteen app and a hospital) with a "core integrity" health bar, then mark an AI-written extended response |

Stations unlock along each line. The Requirements Line branches off after
Format Forge, the Prototype Line after Hash Harbour, and the Core opens once all
eleven stations are restored.

## How it is built to make students think

- **Commit before reveal.** Predictions (key space, avalanche effect, trace
  outputs) come before any result is shown. Model answers stay locked until a
  real written attempt exists.
- **Misconception feedback.** Every wrong option explains the misconception it
  represents, and students then try again.
- **Tiered hints.** Hint 1 points at the idea. Hint 2 gives a method, never the
  answer, and only unlocks after one attempt. Faults and second-tier hints cost
  stars.
- **Error-first tasks.** Broken JSON, flawed pseudocode, a failing UI and two
  "mark the AI answer" tasks.
- **Retrieval and interleaving.** Each station opens with a warm-up drawn from
  an earlier station. The Core mixes everything in unfamiliar contexts.
- **Self-marking.** Written responses end with a criteria checklist and a "mark
  I missed and why" field. These, plus each station's key ideas, are collected
  in **Field notes** as a revision sheet.

## Teacher notes

- **How to play → Teacher tools** has an *Unlock every station* switch for
  demonstrations or targeted revision, and a progress reset.
- Progress is saved in the student's browser (`localStorage`) only. Nothing is
  sent anywhere. A private window or cleared site data starts fresh.
- The pseudocode follows the common QCAA style (`BEGIN/END`, `IF … THEN … ENDIF`,
  `FOR … ENDFOR`, `←` for assignment).
- Please check the station content against the syllabus version your school is
  teaching and adjust the text in `js/missions/*.js` as needed. Each mission is
  a self-contained data object.

## Hosting

Any static host works, for example GitHub Pages (Settings → Pages → deploy from
this branch). To upload to an LMS as one file:

```
python3 tools/build_single.py          # writes dist/nexus-unit4.html
```

Fonts load from Google Fonts. Without internet access the game falls back to
system fonts and still works fully.

## Project layout

```
index.html            page shell
css/nexus.css         all styles (light and dark themes)
js/core.js            state, map, mission runner, dialogs
js/widgets.js         reusable interactions (MCQ, sort, order, line hunt, trace table, write-and-self-mark, mark-the-AI)
js/sha256.js          small SHA-256 used by Hash Harbour
js/missions/*.js      one file per station
tests/playthrough.js  automated headless playthrough of every mission
tools/build_single.py single-file bundler
```

## Testing

```
NODE_PATH=$(npm root -g) node tests/playthrough.js
```

This plays every mission in order at desktop and phone widths in headless
Chromium. It fails on script errors, a step it cannot complete, or horizontal
overflow.
