# Bus Jam: approach and mechanic ideas

## Approach

**Stack.** One `index.html` with plain JavaScript drawing on a `<canvas>`. No build step, no libraries, nothing to install on Windows. It works offline once loaded and can be hosted free on GitHub Pages: push the file to a repo, turn on Pages, and send her the link. On her phone she can "Add to Home Screen" so it opens full-screen like an app. A small `manifest.json` plus a service worker would make it a proper installable, offline app later.

**Why canvas and not a game engine.** The game is ~100 rectangles and a few hundred dots. Canvas 2D handles that at 60 fps on any phone, and keeping it to one file means you can edit it in Notepad or VS Code and refresh.

**Board model.** Each bus is a rotated rectangle (centre, angle, length, capacity). Tapping a bus sweeps a long rectangle ahead of it and checks it against every other bus (separating-axis test). Clear means it drives off and parks; blocked means it drives up to the blocker and bounces back. 8 directions work for free because nothing is grid-locked.

**Levels are generated, and always solvable.** Each level number is a seed, so level 12 is always the same level 12.
1. Pack buses densely, growing neat blocks next to each other like in the original.
2. "Peel" them: repeatedly pick a bus whose road out is clear, point it that way, lift it off. That peel order is a guaranteed solution.
3. Build the passenger queue from that order, with neighbouring colour groups lightly shuffled together. With 5 parking spots there is always a way through, but bad choices can still jam you.

A headless bot plays levels 1–25 and wins all of them, so generation is sound. Difficulty comes from bus count, number of colours, how much the queue is shuffled and which quirks are on (see `levelCfg` in the code).

**Quirks in the prototype**
- **Mystery buses** (level 3+): grey with “?” until the road ahead is clear.
- **Flip buses** (level 5+): marked ⇄, turn around every time you send another bus. Generated only where both ways out are eventually clear.
- **Ambulance** (level 7+): leaves without parking but has a move counter; if it hits zero you lose. It's picked from the first few buses in the solution so it's always rescuable.
- **Bonus spot**: one free extra parking spot per level (the "+" slot), also offered when you get stuck. This replaces the ad/coin booster.

**Not built yet**
- **Tunnels.** A tunnel is a fixed block on the board holding a short queue of buses. When its mouth is clear the next one rolls out. The generator handles it by treating the tunnel as a stack placed early in the peel order.
- Sound, a level map, stars and settings.

## Ideas to make it more engaging (no money involved)

**New board mechanics**
- **Tow truck / crane**: a limited-use tool that lifts any one bus straight to parking. A free "get out of jail" earned every few levels.
- **Locked buses with keys**: a padlocked bus can't move until the bus carrying the matching key leaves the board.
- **Ice / snow**: a frozen bus thaws after N other buses have moved.
- **Long articulated buses** that need 2 parking spots but carry lots of passengers.
- **Traffic lights**: a road section blocks movement on alternating turns.
- **Pairs**: two linked buses that must leave together (tapping one launches both).
- **One-way gates / roundabouts** on the board that redirect a bus 90° as it passes.

**Passenger-side mechanics**
- **VIPs**: a gold passenger who boards first. Their bus gets a bonus or a free spot.
- **Groups**: a family of 3 that must board together, so the bus needs 3 free seats.
- **Impatient passengers**: a timer on one person; if their bus doesn't arrive in time they leave and cost a star.
- **Two queues** feeding the same parking row from left and right.

**Light progression (just for fun)**
- 1–3 stars per level from moves used or "never used the bonus spot".
- A daily puzzle (seed = today's date), so there's a reason to open it each day.
- Unlockable cosmetics like bus skins and passenger hats, earned from stars. Purely visual.
- A level map with themed worlds (city, beach, snow), each introducing one mechanic.
- Personal touches: her name on the title, a custom "level cleared" message, inside-joke bus names.

**Feel / juice**
- Small sounds for honk, boarding and the full-bus "ding", plus a mute switch.
- Haptic tap on blocked moves (already in for Android; iOS Safari ignores vibration).
- Undo the last move (cheap to add since moves are deterministic).
- Confetti on level clear, and a combo counter when several buses fill back-to-back.
