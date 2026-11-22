# 🎩 The Velvet Vault

A top-down stealth heist game that runs 100% offline in a desktop browser.
You are **Velvet**, a gentleman thief. Cross three guarded rooms, crack the
vault, steal the Velvet Diamond, and slip out the getaway door — unseen.

## How to play

Serve the game and open it in a desktop browser:

```sh
node serve.ts
# then open http://localhost:8080
```

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Shift | Sneak (slower, much harder to spot) |
| 1 / 2 or Q | Pick a tool (Smoke Bomb / EMP Pulse) |
| Mouse click | Use the selected tool where you click |
| Hold E at the vault | Pick the lock |
| P | Pause |
| M | Mute |
| R | Restart |
| Enter | Start / next room |

## The heist

- **3 rooms, rising difficulty** — more guards, faster patrols, more cameras.
- **Guard AI** — guards patrol waypoints, grow suspicious when they glimpse
  you, investigate the last place they saw you (or a noise), chase when sure,
  and give up and return to patrol when they lose you.
- **Vision cones** — red for guards, blue for cameras. Walls, crates, pillars
  and slot machines block sight; dark shadow lanes slow detection; sneaking
  slows it further.
- **Cameras** sweep back and forth. An **EMP pulse** (limited, costs a use)
  kills the nearest camera for 8 seconds. Being seen by a camera raises the
  alarm fast.
- **Tools at a cost** — smoke bombs hide you but the pop draws guards to
  investigate; EMPs are limited per room; lockpicking the vault takes 2.6
  seconds while the alarm creeps up.
- **The alarm meter** (always on the HUD) rises on detection and decays while
  you stay hidden. At 100% the floor goes into lockdown and every guard hunts.
- **Caught?** A chasing guard that reaches you costs a life — but only after a
  short grace moment, so a near miss is escapable. 3 lives per run; caught
  three times and the night is over.
- **The getaway** — the exit door opens only after the Velvet Diamond is
  taken. Bonus loot bags are optional: grab them, or don't risk it.
- **Sound** is synthesized live with WebAudio (footsteps, pickups, alarm
  stings, win/lose jingles). No audio files, no network requests.

## Structure

```
game/
  index.html        page shell
  style.css         page shell styling
  src/
    config.js       tuning numbers, colours, tool definitions
    levels.js       the three rooms (walls, cover, guards, cameras, loot)
    guard.js        guard AI + shared line-of-sight / cone math
    camera.js       sweeping security cameras + EMP blackout
    player.js       Velvet: movement, collision, tools, lockpick
    audio.js        synthesized WebAudio sounds
    render.js       all drawing: room, ray-cast cones, HUD, screens
    main.js         game loop, alarm, loot, getaway, lives, input
main.ts             hand-in program (copies game/ + screenshots/, writes dossier.json)
serve.ts            tiny local static server
vendor/
  makefun-game.ts   make.fun dossier library (kit copy, unchanged)
```

## Entry

Built for the make.fun bounty **"Make the best heist game"**
(`best-heist-game-20261122-0559`). MIT licensed.
