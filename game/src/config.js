// The Velvet Vault — shared tuning numbers and look.
// One job: every magic number the rest of the game reads lives here.

export const WORLD = { width: 1280, height: 800, hudHeight: 64 };
export const PLAY = { x: 0, y: 64, width: 1280, height: 736 };

export const PLAYER = {
  radius: 14,
  walkSpeed: 205,
  sneakSpeed: 105,
  catchRadius: 30,
  graceSeconds: 0.7,
};

export const GUARD = {
  radius: 15,
  patrolSpeed: 72,
  chaseSpeed: 168,
  returnSpeed: 110,
  viewRange: 235,
  viewHalfAngle: 0.62, // radians either side of facing (~71 deg cone)
  suspicionPerSecondClose: 95,
  suspicionPerSecondFar: 42,
  sneakMultiplier: 0.45,
  shadowMultiplier: 0.55,
  suspicionDecay: 26,
  chaseMemorySeconds: 3.2,
};

export const CAMERA = {
  viewRange: 265,
  viewHalfAngle: 0.5,
  sweepSpeed: 0.55, // radians per second
  sweepArc: 0.85, // radians either side of base angle
  alarmPerSecond: 30,
  empDisableSeconds: 8,
};

export const ALARM = {
  chaseRisePerSecond: 14,
  decayPerSecond: 7,
  lockdownAt: 100,
  lockdownSeconds: 5,
};

export const TOOLS = {
  smoke: { name: 'Smoke Bomb', key: '1', radius: 95, durationSeconds: 5, perLevel: 2 },
  emp: { name: 'EMP Pulse', key: '2', range: 320, perLevel: 2 },
};

export const VAULT = { lockpickSeconds: 2.6, alarmWhilePicking: 3 };

export const COLORS = {
  floor: '#1d1a2e',
  floorAlt: '#221e35',
  carpet: '#3a1f3d',
  wall: '#4a4360',
  wallTop: '#5d5680',
  cover: '#6b5a34',
  coverTop: '#8a7444',
  shadow: '#14122a',
  player: '#e8c33c',
  playerSneak: '#c9a227',
  guard: '#e5484d',
  guardSuspicious: '#f5a524',
  camera: '#38bdf8',
  loot: '#ffd700',
  bonusLoot: '#c084fc',
  exitClosed: '#64748b',
  exitOpen: '#22c55e',
  cone: 'rgba(229, 72, 77, 0.20)',
  coneSuspicious: 'rgba(245, 165, 36, 0.28)',
  coneCamera: 'rgba(56, 189, 248, 0.20)',
  coneCameraOff: 'rgba(100, 116, 139, 0.10)',
  smoke: 'rgba(203, 213, 225, 0.55)',
  hudBg: '#120f1f',
  hudText: '#f1e9d2',
  alarmLow: '#22c55e',
  alarmMid: '#f5a524',
  alarmHigh: '#e5484d',
};

export const SCORE = {
  mainLoot: 1000,
  bonusLoot: 250,
  timeBonusPerSecondLeft: 0, // timer counts up; bonus is flat per level clear
  levelClearBonus: 400,
  lifeBonus: 150,
};
