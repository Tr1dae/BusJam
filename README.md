# Ambulance Jam

An ad-free, pixel-art traffic puzzle for phones, set at St. Becca's General.

Coloured hospital beds are jammed in the corridor. Tap one to roll it out the way its arrow points; if the way is clear it parks in a transfer bay. Patients walk the waiting-area loop four abreast, and anyone whose department's bed is parked steps out and hops on. Beds take 16, 24 or 40 patients, and patients arrive in solid department blocks. Each bed fills completely before the next one of its department starts boarding. Full beds reverse out and race off with their lights flashing. Clear the jam to finish the shift. (The splash screen is still the outside of the hospital, with ambulances.)

- **Departments:** Cardiac (heart pillow), Neuro (head wrap, seeing stars), Ortho (cast and sling), Peds (teddy), Maternity (very pregnant), Burns (on fire).
- **Quirks:** triage-pending grey beds (shift 3+), flip-floppers that turn around every move (shift 5+), and the Code Blue crash cart with a move counter (shift 7+).
- **The ward:** the loop runs round a nurses' station; tap the station sign for the patient legend, which also pauses the shift. Fish tank, wet floor sign, wheelchair, therapy corgi, sleeping visitor, pot plant, vending machine, coffee machine and wall clock (real time) all react to taps.
- **Cameos:** once a shift one of Becca's friends (Becca, Sarah, Jess, Carly, Katrina, Jann, Angela, Sophie) walks on in green scrubs with a comment; now and then a doctor pops up with a daft request. Tap the bubble to skip.
- **Difficulty:** shift 1 is a tutorial. The jam is built one bed at a time: every new bed is parked in other beds' roads and slotted into a solution order (it must leave after every bed in its own road and before every bed it blocks), so every layout is solvable but most beds wait on a chain of others. The lot is sized to the bed count so it stays packed. Several layouts are dealt and the one closest to the shift's target (`free` share of beds free at the start, `waves` of moves to clear) is kept. Patients follow the order beds come free, then from shift 2 the first patients belong to beds buried deep in the jam, only so many rows fit on the loop at once (the rest queue at the sides), patient blocks are shuffled away from that order, and departments ramp up. All in `levelConfig` (`vehicles`, `wBlock`, `wFree`, `wRoad`, `wCenter`, `turn`, `fill`, `free`, `waves`, `buried`, `window`, `scatter`, `depts`). Retrying a shift deals a fresh layout.
- **Porters:** in the jam beds are drawn flat from above; once a bed starts moving it's lifted onto its frame with legs and castors and a porter in blue scrubs pushes it from the head end, including while it's parked (diagonally) in a bay.
- **Bays free up instantly:** as soon as a bed fills, its bay is free for the next bed while the full one reverses out.
- **Escaped patient:** from shift 2, roughly one shift in four, a confused patient drags their IV pole round the bed park yelling nonsense. Tap them for +300; leave them 22 seconds and they leave AMA (-200).
- **Bays and score:** 3 bays are open and 3 are locked. Opening them costs 500, then 1,000, then 1,500 points; any left locked at the end of a shift are worth +500 each. Patients score 10 each, departures 5 per seat, a cleared shift 1,000, and the career total is saved.

## Between shifts

Every shift is followed by a random minigame (Call Light Frenzy, Emergency Rush, Code Blue, Med Pass, Group Hangout): a shuffled bag kept in the browser, so you see all five before any repeats, and never the same one twice in a row. Each has a start page that shows what to grab and what to avoid, can be skipped, and pays a +1,000 bonus on a clean run.

- **Call Light Frenzy:** nine rooms, call lights going off. Tap red (real) calls before they time out; white ones (blankets, jello, wifi) and the doctor's favours just cost time. Three missed calls ends it.
- **Code Blue:** a rhythm game. Tap on the beat to do compressions (100-120 bpm, synced to the audio clock), tap the bolt to shock. 90% on the beat is a clean run.
- **Group Hangout:** tap each nurse to hear their 5-7 free dates (random order), then tap the one date everyone shares on the calendar. Two guesses, 60 seconds; a wrong guess tells you who can't make it. The generator guarantees exactly one common date and adds near-miss dates that all but one nurse share.
- **Med Pass:** drag the med cup to catch the pills on the order card, which changes per patient. Tylenol is always fine; anything else is a wrong med, and three ends it.

Once or twice a shift (from shift 2) a surprise break pauses play: **Coffee Pour** (hold to pour, let go on the line, three mugs) or **Pizza Defense** (slap day shift's hands away from the pizza, but not the manager's, who brings more). Break points go to the current shift. `?mini=calls|cpr|meds|hangout|coffee|pizza` jumps straight into one. Code is in `js/minis.js`.

## Emergency Rush

A short dash: a porter pushes the bed down pseudo-3D hospital corridors to the OR or ward double doors. Tap a lane to switch, tap your own lane to hop over low things (wet floor signs, mop buckets, spills), dodge tall ones (crash carts, beds, vending machines, strolling patients, a doctor on his phone), grab coffee (chains score more), department icons (+50; a heart also gives a life back) and the siren (a short boost that smashes through obstacles), and tap the big TURN button before each 90° corner. Three bumps ends the run; a clean run is worth a +1,000 bonus. A second start page shows each pickup and obstacle with its sprite. It can be skipped. Add `?rush` to the URL to jump straight into one. Code is in `js/rush.js`.

## Running it

No build step. Bump the `?v=` version in `index.html` on each release so phones fetch the new scripts (it shows in the corner of the title screen). Open `index.html`, or serve the folder (GitHub Pages: Settings → Pages → Deploy from branch `main`, `/ (root)`). On a phone, "Add to Home Screen" runs it full screen.

`?level=N` jumps to a shift. Progress and sound settings are saved in the browser.

## Code

| File | What's in it |
| --- | --- |
| `js/sprites.js` | All pixel art as palette grids, vehicles rasterised per angle, cached canvases |
| `js/font.js` | 3x5 and 5x7 pixel fonts |
| `js/audio.js` | Chiptune music and sound effects synthesised with Web Audio |
| `js/level.js` | Level generator and solvability checker |
| `js/game.js` | Game loop, patient loop and funnels, bays, screens, input |
| `js/rush.js` | Emergency Rush corridor runner between shifts |
| `js/minis.js` | The other minigames and mid-shift breaks |

Design notes and the blurb list are in `docs/`.

## Lighting

`js/light.js` fakes pixel lighting. Each frame a low-res light map is filled with an ambient tint, banded and dithered light pools are added on top, and the map is multiplied over the scene; bright sources (screens, sirens) also get a faint additive bloom. The main game, Emergency Rush, every minigame and the title screen each set up their own lights. After 7 PM and before 7 AM (phone clock) everything is dimmer and the lamps carry more of the scene. The bulb icon in the top bar turns lighting off (remembered in `aj.lights`).
