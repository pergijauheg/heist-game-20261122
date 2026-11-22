// The Velvet Vault — the game loop and the rules that bind the pieces.
// One job: input, the playing state machine, the alarm, tools, the vault,
// loot, the getaway, lives, and the staged ?shot= scenes the screenshots use.

import { WORLD, PLAY, PLAYER, GUARD, CAMERA, ALARM, TOOLS, VAULT, SCORE } from './config.js';
import { LEVELS } from './levels.js';
import { Guard, hasLineOfSight, pointInRect, circleHitsRect } from './guard.js';
import { SecurityCamera } from './camera.js';
import { Player } from './player.js';
import { SoundBank } from './audio.js';
import { Renderer } from './render.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const renderer = new Renderer(canvas);
const sounds = new SoundBank();

const state = {
  screen: 'title', // title | playing | paused | levelclear | gameover | win
  levelIndex: 0,
  level: LEVELS[0],
  player: new Player(LEVELS[0].playerStart),
  guards: [],
  cameras: [],
  bonusLoot: [],
  smokeClouds: [],
  alarm: 0,
  lockdownTimer: 0,
  lives: 3,
  score: 0,
  vaultOpen: false,
  mainLootTaken: false,
  exitOpen: false,
  time: 0,
  levelTime: 0,
  caughtFlash: 0,
  catchGrace: 0,
  clearText: '',
  message: '',
  messageTimer: 0,
};

const input = { up: false, down: false, left: false, right: false, sneak: false, pick: false };

function blockers() {
  return [...state.level.walls, ...state.level.cover];
}

function inShadow(x, y) {
  return state.level.shadows.some((s) => pointInRect(x, y, s));
}

function inSmoke(x, y) {
  return state.smokeClouds.some((s) => Math.hypot(x - s.x, y - s.y) < TOOLS.smoke.radius);
}

function loadLevel(index) {
  state.levelIndex = index;
  state.level = LEVELS[index];
  state.player.reset(state.level.playerStart, state.level.tools);
  state.guards = state.level.guards.map((g) => new Guard(g, index));
  state.guards.forEach((g) => g.reset());
  state.cameras = state.level.cameras.map((c) => new SecurityCamera(c, index));
  state.bonusLoot = state.level.bonusLoot.map((b) => ({ ...b, taken: false }));
  state.smokeClouds = [];
  state.alarm = 0;
  state.lockdownTimer = 0;
  state.vaultOpen = false;
  state.mainLootTaken = false;
  state.exitOpen = false;
  state.levelTime = 0;
  state.caughtFlash = 0;
  state.catchGrace = 0;
  state.message = '';
  state.messageTimer = 0;
}

function nearVault() {
  const v = state.level.vault;
  const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
  return Math.hypot(state.player.x - cx, state.player.y - cy) < 110;
}

function showMessage(text, seconds = 2.2) {
  state.message = text;
  state.messageTimer = seconds;
}

function startGame() {
  sounds.ensure();
  sounds.startMusic();
  state.score = 0;
  state.lives = 3;
  state.time = 0;
  loadLevel(0);
  state.screen = 'playing';
  announce('Heist started. Room 1, the casino floor.');
}

function nextLevel() {
  if (state.levelIndex + 1 >= LEVELS.length) {
    state.screen = 'win';
    sounds.win();
    announce('Perfect heist. All three rooms cleared.');
    return;
  }
  loadLevel(state.levelIndex + 1);
  state.screen = 'playing';
  announce(`Room ${state.levelIndex + 1} started.`);
}

function getCaught() {
  state.lives -= 1;
  state.caughtFlash = 1;
  state.catchGrace = 0;
  sounds.caught();
  if (state.lives <= 0) {
    state.screen = 'gameover';
    sounds.gameOver();
    announce('Busted. Game over.');
    return;
  }
  // Fair respawn: back at the door, guards back on patrol, alarm half gone.
  state.player.x = state.level.playerStart.x;
  state.player.y = state.level.playerStart.y;
  state.guards.forEach((g) => g.reset());
  state.cameras.forEach((c) => { c.seeingPlayer = false; });
  state.alarm = Math.min(state.alarm, 45);
  state.lockdownTimer = 0;
  showMessage(`Caught! ${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left — back at the door.`, 3);
  announce(`Caught. ${state.lives} lives left.`);
}

function useToolAt(clickX, clickY) {
  const tool = state.player.selectedTool;
  if (tool === 'smoke') {
    if (state.player.tools.smoke <= 0) { sounds.click(); showMessage('Out of smoke bombs!'); return; }
    // Drop the cloud where clicked, but never farther than a short throw.
    const dx = clickX - state.player.x, dy = clickY - state.player.y;
    const dist = Math.hypot(dx, dy);
    const maxThrow = 230;
    const tx = dist > maxThrow ? state.player.x + (dx / dist) * maxThrow : clickX;
    const ty = dist > maxThrow ? state.player.y + (dy / dist) * maxThrow : clickY;
    state.player.tools.smoke -= 1;
    state.smokeClouds.push({ x: tx, y: ty, timer: TOOLS.smoke.durationSeconds });
    sounds.smoke();
    // The pop is loud: nearby guards come to look. Smoke hides you, not silence.
    for (const g of state.guards) {
      if (Math.hypot(g.x - tx, g.y - ty) < 380) g.hearNoise(tx, ty);
    }
    showMessage('Smoke out — their cones cannot see through it.', 2);
  } else {
    // EMP: kills the nearest live camera in range.
    let best = null, bestDist = 1e9;
    for (const cam of state.cameras) {
      if (cam.disabled) continue;
      const d = Math.hypot(cam.x - state.player.x, cam.y - state.player.y);
      if (d < bestDist) { bestDist = d; best = cam; }
    }
    if (!best || bestDist > TOOLS.emp.range) {
      sounds.click();
      showMessage('No live camera in EMP range — get closer.', 2);
      return;
    }
    if (state.player.tools.emp <= 0) { sounds.click(); showMessage('Out of EMP pulses!'); return; }
    state.player.tools.emp -= 1;
    best.emp();
    sounds.emp();
    showMessage(`Camera down for ${CAMERA.empDisableSeconds}s!`, 2);
  }
}

function updatePlaying(dt) {
  state.time += dt;
  state.levelTime += dt;
  if (state.caughtFlash > 0) state.caughtFlash -= dt * 1.4;
  if (state.messageTimer > 0) state.messageTimer -= dt;

  const stepped = state.player.move(dt, input, blockers());
  if (stepped) sounds.footstep(state.player.sneaking);

  // Lockpick at the vault.
  const pickResult = state.player.updateLockpick(dt, input.pick, nearVault() && !state.vaultOpen);
  if (pickResult === 'done') {
    state.vaultOpen = true;
    sounds.vaultOpen();
    showMessage('Vault cracked! Grab the Velvet Diamond.', 3);
    announce('Vault open. Take the diamond.');
  } else if (pickResult === 'picking') {
    state.alarm = Math.min(100, state.alarm + VAULT.alarmWhilePicking * dt);
  }

  // Guards and cameras.
  const ctx = {
    player: state.player,
    blockers: blockers(),
    inSmoke,
    inShadow,
    onSpotted: (g) => {
      sounds.spotted();
      showMessage('Spotted! Break line of sight!', 2);
    },
  };
  for (const g of state.guards) g.update(dt, ctx);
  for (const cam of state.cameras) cam.update(dt, ctx);

  // Smoke clouds fade.
  for (const s of state.smokeClouds) s.timer -= dt;
  state.smokeClouds = state.smokeClouds.filter((s) => s.timer > 0);

  // Alarm: cameras and chases push it up, hiding lets it fall.
  const cameraSees = state.cameras.some((c) => c.seeingPlayer);
  const anyChase = state.guards.some((g) => g.state === 'chase');
  if (state.lockdownTimer > 0) {
    state.lockdownTimer -= dt;
    if (state.lockdownTimer <= 0) state.alarm = 60;
  } else if (cameraSees || anyChase) {
    state.alarm += ((cameraSees ? CAMERA.alarmPerSecond : 0) + (anyChase ? ALARM.chaseRisePerSecond : 0)) * dt;
    if (cameraSees && !state._alarmStingAt) { sounds.alarmSting(); state._alarmStingAt = state.time; }
    if (state.time - (state._alarmStingAt || 0) > 2.5) state._alarmStingAt = 0;
    if (state.alarm >= ALARM.lockdownAt) {
      state.lockdownTimer = ALARM.lockdownSeconds;
      sounds.alarmSting();
      showMessage('LOCKDOWN! Every guard is hunting!', 3);
      for (const g of state.guards) {
        g.lastSeen = { x: state.player.x, y: state.player.y };
        if (g.state !== 'chase') { g.state = 'suspicious'; g.suspicion = 100; }
      }
    }
  } else {
    state.alarm = Math.max(0, state.alarm - ALARM.decayPerSecond * dt);
  }
  state.alarm = Math.max(0, Math.min(100, state.alarm));

  // Bonus loot pickup.
  for (const b of state.bonusLoot) {
    if (!b.taken && Math.hypot(state.player.x - b.x, state.player.y - b.y) < 30) {
      b.taken = true;
      state.score += b.value;
      sounds.pickup();
      showMessage(`Bonus loot +$${b.value}!`, 1.6);
    }
  }

  // Main loot: the Velvet Diamond, once the vault is open.
  if (state.vaultOpen && !state.mainLootTaken) {
    const v = state.level.vault;
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2 + 26;
    if (Math.hypot(state.player.x - cx, state.player.y - cy) < 34) {
      state.mainLootTaken = true;
      state.exitOpen = true;
      state.score += SCORE.mainLoot;
      sounds.pickup();
      showMessage('★ Velvet Diamond secured! Get to the getaway door! ★', 3.5);
      announce('Diamond taken. The getaway door is open.');
    }
  }

  // Getaway: step into the open exit.
  if (state.exitOpen) {
    const e = state.level.exit;
    if (pointInRect(state.player.x, state.player.y, e)) {
      const bonus = SCORE.levelClearBonus + state.lives * SCORE.lifeBonus;
      state.score += bonus;
      sounds.levelClear();
      state.clearText = `${state.level.name} cleared — +$${bonus} getaway bonus. Score: $${state.score}.`;
      state.screen = 'levelclear';
      announce(state.clearText);
      return;
    }
  }

  // Caught: a chasing guard reaches Velvet. A short grace moment keeps it fair.
  const chaser = state.guards.find((g) => g.state === 'chase'
    && Math.hypot(g.x - state.player.x, g.y - state.player.y) < PLAYER.catchRadius + GUARD.radius);
  if (chaser) {
    state.catchGrace += dt;
    if (state.catchGrace >= PLAYER.graceSeconds) getCaught();
  } else {
    state.catchGrace = 0;
  }
}

function timerText() {
  const s = Math.floor(state.levelTime);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (frame._last || now)) / 1000 || 0.016);
  frame._last = now;
  if (state.screen === 'playing') updatePlaying(dt);
  renderer.draw({
    ...state,
    timerText: timerText(),
    time: state.time,
  });
}

// --- input -----------------------------------------------------------------

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
  KeyE: 'pick',
};

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  sounds.ensure();
  const dir = KEYMAP[e.code];
  if (dir) input[dir] = true;
  if (e.code === 'Digit1') { state.player.selectedTool = 'smoke'; sounds.click(); }
  if (e.code === 'Digit2') { state.player.selectedTool = 'emp'; sounds.click(); }
  if (e.code === 'KeyQ') { state.player.cycleTool(); sounds.click(); }
  if (e.code === 'KeyM') { const m = sounds.toggleMute(); showMessage(m ? 'Sound muted' : 'Sound on', 1.2); }
  if (e.code === 'KeyR' && state.screen !== 'title') startGame();
  if (e.code === 'KeyP' && state.screen === 'playing') { state.screen = 'paused'; announce('Paused.'); }
  else if (e.code === 'KeyP' && state.screen === 'paused') { state.screen = 'playing'; announce('Resumed.'); }
  if (e.code === 'Enter') {
    if (state.screen === 'title') startGame();
    else if (state.screen === 'levelclear') nextLevel();
  }
});

window.addEventListener('keyup', (e) => {
  const dir = KEYMAP[e.code];
  if (dir) input[dir] = false;
});

canvas.addEventListener('mousedown', (e) => {
  sounds.ensure();
  if (state.screen === 'title') { startGame(); return; }
  if (state.screen === 'levelclear') { nextLevel(); return; }
  if (state.screen !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = WORLD.width / rect.width;
  const scaleY = WORLD.height / rect.height;
  const wx = (e.clientX - rect.left) * scaleX;
  const wy = (e.clientY - rect.top) * scaleY;
  useToolAt(wx, wy);
});

// --- staged scenes for screenshots (real renders of this same code) --------

function applyShot(name) {
  startGame();
  if (name === 'start') {
    // Cover: mid-room, cones + camera + loot + alarm all in one frame.
    // The vault stands open so the Velvet Diamond itself is visible.
    state.player.x = 560; state.player.y = 430;
    state.player.sneaking = true;
    state.alarm = 45;
    state.vaultOpen = true;
    state.guards[0].x = 420; state.guards[0].y = 240; state.guards[0].facing = Math.PI / 2;
    state.guards[1].x = 880; state.guards[1].y = 470; state.guards[1].facing = -Math.PI / 2;
    state.guards[1].suspicion = 55; state.guards[1].state = 'suspicious';
    state.cameras[0].facing = Math.PI / 2 + 0.5;
    state.score = 250;
    state.bonusLoot[0].taken = true;
  } else if (name === 'tools') {
    // Sneaking past a camera under a smoke cloud, EMP ready.
    state.player.x = 620; state.player.y = 300;
    state.player.sneaking = true;
    state.smokeClouds.push({ x: 620, y: 300, timer: 4 });
    state.cameras[0].facing = Math.PI / 2 - 0.4;
    state.guards[0].x = 380; state.guards[0].y = 240; state.guards[0].facing = 0;
    state.guards[1].x = 900; state.guards[1].y = 470; state.guards[1].facing = Math.PI;
    state.alarm = 18;
    state.player.selectedTool = 'emp';
  } else if (name === 'alarm') {
    // Near-caught: alarm high, a guard chasing, Velvet cornered in the open.
    // The chaser starts far enough out that the screenshot catches the chase,
    // not the catch.
    state.player.x = 700; state.player.y = 500;
    state.alarm = 88;
    const g = state.guards[0];
    g.x = 560; g.y = 330; g.state = 'chase'; g.suspicion = 100;
    g.lastSeen = { x: state.player.x, y: state.player.y };
    state.guards[1].x = 900; state.guards[1].y = 470; state.guards[1].state = 'suspicious'; state.guards[1].suspicion = 70;
    state.cameras[0].facing = Math.PI / 2 + 0.6;
    state.cameras[0].seeingPlayer = true;
    state.score = 500;
  } else if (name === 'getaway') {
    // Loot secured, vault open, getaway door open, Velvet running for it.
    state.vaultOpen = true;
    state.mainLootTaken = true;
    state.exitOpen = true;
    state.score = 1750;
    state.player.x = 1010; state.player.y = 690;
    state.player.sneaking = false;
    state.alarm = 22;
    state.guards[0].x = 420; state.guards[0].y = 240; state.guards[0].facing = Math.PI / 2;
    state.guards[1].x = 880; state.guards[1].y = 470; state.guards[1].facing = -Math.PI / 2;
    state.cameras[0].facing = Math.PI / 2;
    state.bonusLoot.forEach((b) => { b.taken = true; });
  }
}

// --- debug handle for the play-test harness --------------------------------
// Read-only state for automated checks; teleport/setAlarm are test-only.
window.__heist = {
  state,
  input,
  startGame,
  loadLevel,
  nextLevel,
  useToolAt,
  get snapshot() {
    return {
      screen: state.screen,
      level: state.levelIndex,
      x: Math.round(state.player.x),
      y: Math.round(state.player.y),
      alarm: Math.round(state.alarm),
      lives: state.lives,
      score: state.score,
      vaultOpen: state.vaultOpen,
      mainLootTaken: state.mainLootTaken,
      exitOpen: state.exitOpen,
      tools: { ...state.player.tools },
      guards: state.guards.map((g) => ({ x: Math.round(g.x), y: Math.round(g.y), state: g.state, suspicion: Math.round(g.suspicion) })),
      cameras: state.cameras.map((c) => ({ disabled: c.disabled, seeing: c.seeingPlayer })),
      smoke: state.smokeClouds.length,
    };
  },
  teleport(x, y) { state.player.x = x; state.player.y = y; },
  setAlarm(v) { state.alarm = v; },
};

// --- boot ------------------------------------------------------------------

renderer.fit();
window.addEventListener('resize', () => renderer.fit());
loadLevel(0);

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  applyShot(shot);
} else {
  state.screen = 'title';
}
requestAnimationFrame(frame);
