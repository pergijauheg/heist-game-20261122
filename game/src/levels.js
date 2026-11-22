// The Velvet Vault — the three rooms.
// One job: the static layout of every level: walls, cover, shadows, guards,
// cameras, loot, bonus loot, exit and where Velvet (the thief) starts.
// Coordinates are in world pixels; the play field is 1280 x 736 below the HUD.
//
// Room geography, shared by all three levels:
//  * top strip (y 64-180): the casino floor with slot-machine cover rows.
//  * middle band (y 180-520): the vault antechamber, pillars and crates.
//  * bottom strip (y 520-800): the vault hall with the big vault door.
// Three routes through every room: the left vent corridor (tight, unguarded),
// the middle shadow lane (dark floor, slow detection) and the right open floor
// (fast, but swept by cameras).

function wall(x, y, w, h) { return { x, y, w, h }; }
function cover(x, y, w, h, kind = 'crate') { return { x, y, w, h, kind }; }
function shadow(x, y, w, h) { return { x, y, w, h }; }
function guard(x, y, waypoints, pause = 1.2) { return { x, y, waypoints, pause }; }
function camera(x, y, baseAngle, range = 265) { return { x, y, baseAngle, range }; }
function loot(x, y, kind = 'bonus', value = 250) { return { x, y, kind, value }; }

export const LEVELS = [
  {
    name: 'Room 1 — The Casino Floor',
    par: 'Sneak past two guards, dodge the sweeping camera, crack the vault.',
    playerStart: { x: 90, y: 700 },
    exit: { x: 1160, y: 700, w: 84, h: 44 },
    vault: { x: 590, y: 560, w: 100, h: 76 },
    walls: [
      wall(0, 64, 1280, 10), wall(0, 790, 1280, 10),
      wall(0, 64, 10, 736), wall(1270, 64, 10, 736),
      wall(300, 64, 12, 96), wall(640, 64, 12, 96), wall(980, 64, 12, 96),
      wall(180, 300, 12, 150), wall(1088, 300, 12, 150),
      wall(420, 520, 440, 12),
    ],
    cover: [
      cover(180, 130, 90, 46, 'slots'), cover(420, 130, 90, 46, 'slots'),
      cover(760, 130, 90, 46, 'slots'), cover(1000, 130, 90, 46, 'slots'),
      cover(330, 330, 64, 64, 'crate'), cover(880, 330, 64, 64, 'crate'),
      cover(600, 265, 80, 40, 'pillar'), cover(600, 410, 80, 40, 'pillar'),
      cover(240, 600, 70, 60, 'crate'), cover(970, 600, 70, 60, 'crate'),
    ],
    shadows: [
      shadow(40, 220, 180, 260),
      shadow(1060, 220, 180, 260),
      shadow(480, 560, 320, 200),
    ],
    guards: [
      guard(640, 240, [{ x: 300, y: 240 }, { x: 980, y: 240 }]),
      guard(640, 470, [{ x: 980, y: 470 }, { x: 300, y: 470 }]),
    ],
    cameras: [
      camera(700, 92, Math.PI / 2, 280),
    ],
    bonusLoot: [
      loot(120, 130, 'bonus', 250),
      loot(1180, 130, 'bonus', 250),
    ],
    tools: { smoke: 2, emp: 2 },
  },
  {
    name: 'Room 2 — The Vault Antechamber',
    par: 'Three guards, two cameras, faster patrols. The vent lane is your friend.',
    playerStart: { x: 90, y: 700 },
    exit: { x: 1160, y: 700, w: 84, h: 44 },
    vault: { x: 590, y: 560, w: 100, h: 76 },
    walls: [
      wall(0, 64, 1280, 10), wall(0, 790, 1280, 10),
      wall(0, 64, 10, 736), wall(1270, 64, 10, 736),
      wall(300, 64, 12, 96), wall(640, 64, 12, 96), wall(980, 64, 12, 96),
      wall(180, 300, 12, 150), wall(1088, 300, 12, 150),
      wall(420, 520, 440, 12),
      wall(300, 300, 180, 12), wall(800, 300, 180, 12),
    ],
    cover: [
      cover(180, 130, 90, 46, 'slots'), cover(420, 130, 90, 46, 'slots'),
      cover(760, 130, 90, 46, 'slots'), cover(1000, 130, 90, 46, 'slots'),
      cover(330, 380, 64, 64, 'crate'), cover(880, 380, 64, 64, 'crate'),
      cover(600, 265, 80, 40, 'pillar'), cover(600, 410, 80, 40, 'pillar'),
      cover(240, 560, 70, 60, 'crate'), cover(970, 560, 70, 60, 'crate'),
      cover(470, 160, 60, 60, 'crate'), cover(750, 160, 60, 60, 'crate'),
    ],
    shadows: [
      shadow(40, 220, 180, 260),
      shadow(1060, 220, 180, 260),
      shadow(480, 560, 320, 200),
    ],
    guards: [
      guard(500, 240, [{ x: 260, y: 240 }, { x: 1020, y: 240 }]),
      guard(780, 470, [{ x: 1020, y: 470 }, { x: 260, y: 470 }]),
      guard(640, 680, [{ x: 260, y: 680 }, { x: 1020, y: 680 }], 0.8),
    ],
    cameras: [
      camera(340, 92, Math.PI / 2, 280),
      camera(940, 92, Math.PI / 2, 280),
    ],
    bonusLoot: [
      loot(120, 130, 'bonus', 250),
      loot(1180, 130, 'bonus', 250),
      loot(640, 200, 'bonus', 250),
    ],
    tools: { smoke: 2, emp: 2 },
  },
  {
    name: 'Room 3 — The Velvet Vault',
    par: 'Four guards, three cameras, tight patrols. Take the Velvet Diamond and run.',
    playerStart: { x: 90, y: 700 },
    exit: { x: 1160, y: 700, w: 84, h: 44 },
    vault: { x: 590, y: 560, w: 100, h: 76 },
    walls: [
      wall(0, 64, 1280, 10), wall(0, 790, 1280, 10),
      wall(0, 64, 10, 736), wall(1270, 64, 10, 736),
      wall(300, 64, 12, 96), wall(640, 64, 12, 96), wall(980, 64, 12, 96),
      wall(180, 300, 12, 150), wall(1088, 300, 12, 150),
      wall(420, 520, 440, 12),
      wall(300, 300, 180, 12), wall(800, 300, 180, 12),
      wall(640, 180, 12, 120),
    ],
    cover: [
      cover(180, 130, 90, 46, 'slots'), cover(420, 130, 90, 46, 'slots'),
      cover(760, 130, 90, 46, 'slots'), cover(1000, 130, 90, 46, 'slots'),
      cover(330, 380, 64, 64, 'crate'), cover(880, 380, 64, 64, 'crate'),
      cover(600, 265, 80, 40, 'pillar'), cover(600, 410, 80, 40, 'pillar'),
      cover(240, 560, 70, 60, 'crate'), cover(970, 560, 70, 60, 'crate'),
      cover(470, 160, 60, 60, 'crate'), cover(750, 160, 60, 60, 'crate'),
      cover(880, 160, 56, 56, 'crate'),
    ],
    shadows: [
      shadow(40, 220, 180, 260),
      shadow(1060, 220, 180, 260),
      shadow(480, 560, 320, 200),
    ],
    guards: [
      guard(420, 240, [{ x: 240, y: 240 }, { x: 1040, y: 240 }], 0.7),
      guard(860, 240, [{ x: 1040, y: 240 }, { x: 240, y: 240 }], 0.7),
      guard(640, 470, [{ x: 1020, y: 470 }, { x: 260, y: 470 }], 0.6),
      guard(640, 660, [{ x: 280, y: 660 }, { x: 1000, y: 660 }], 0.6),
    ],
    cameras: [
      camera(340, 92, Math.PI / 2, 280),
      camera(700, 92, Math.PI / 2, 300),
      camera(940, 92, Math.PI / 2, 280),
    ],
    bonusLoot: [
      loot(120, 130, 'bonus', 250),
      loot(1180, 130, 'bonus', 250),
      loot(640, 200, 'bonus', 250),
      loot(90, 460, 'bonus', 250),
    ],
    tools: { smoke: 3, emp: 2 },
  },
];
