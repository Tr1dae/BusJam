# Ambulance Jam

An ad-free, pixel-art traffic puzzle for phones, set at St. Becca's General.

Ambulances are jammed in the car park. Tap one to drive it out the way its arrow points; if the road is clear it parks in a bay. Patients walk the loop four abreast, and anyone whose department's ambulance is parked steps out at the entrance and boards. Ambulances carry 16, 24 or 40 patients, and patients arrive in solid department blocks. Full ambulances reverse out and race off with the sirens going. Clear the lot to finish the shift.

- **Departments:** Cardiac (heart pillow), Neuro (head wrap, seeing stars), Ortho (cast and sling), Peds (teddy), Maternity (very pregnant), Burns (on fire).
- **Quirks:** triage-pending grey ambulances (shift 3+), flip-floppers that turn around every move (shift 5+), and the Code Blue crash cart with a move counter (shift 7+).
- **Spare bay:** one free extra bay per shift, also offered when you get stuck.
- **Levels** are generated from the shift number and always solvable: vehicles are packed, then "peeled" off in an order that is guaranteed to work, and a checker rejects any layout with head-on blocks or cycles.

## Running it

No build step. Open `index.html`, or serve the folder (GitHub Pages: Settings → Pages → Deploy from branch `main`, `/ (root)`). On a phone, "Add to Home Screen" runs it full screen.

`?level=N` jumps to a shift. Progress and sound settings are saved in the browser.

## Code

| File | What's in it |
| --- | --- |
| `js/sprites.js` | All pixel art as palette grids, vehicles rasterised per angle, cached canvases |
| `js/font.js` | 3x5 and 5x7 pixel fonts |
| `js/audio.js` | Chiptune music and sound effects synthesised with Web Audio |
| `js/level.js` | Level generator and solvability checker |
| `js/game.js` | Game loop, patient loop and funnels, bays, screens, input |

Design notes and the blurb list are in `docs/`.
