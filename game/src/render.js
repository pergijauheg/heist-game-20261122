// The Velvet Vault — everything the eye sees.
// One job: draw the room, the vision cones (ray-cast so walls cut them),
// the thief, guards, cameras, loot, smoke, the HUD alarm meter and every
// menu screen, on one canvas.

import { WORLD, PLAY, COLORS, PLAYER, GUARD, CAMERA, TOOLS } from './config.js';
import { pointInRect } from './guard.js';

// Cast one sight ray until it hits a wall or reaches maxRange.
function rayLength(ox, oy, angle, maxRange, blockers) {
  const step = 10;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  for (let d = step; d <= maxRange; d += step) {
    const x = ox + dx * d, y = oy + dy * d;
    if (x < PLAY.x + 10 || x > PLAY.x + PLAY.width - 10 || y < PLAY.y + 10 || y > PLAY.y + PLAY.height - 10) return d;
    for (const b of blockers) {
      if (pointInRect(x, y, b)) return d;
    }
  }
  return maxRange;
}

function drawCone(ctx, ox, oy, facing, range, halfAngle, color, blockers) {
  const rays = 26;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  for (let i = 0; i <= rays; i++) {
    const a = facing - halfAngle + (2 * halfAngle * i) / rays;
    const len = rayLength(ox, oy, a, range, blockers);
    ctx.lineTo(ox + Math.cos(a) * len, oy + Math.sin(a) * len);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  fit() {
    // Leave a 24px strip at the bottom for the fixed controls hint.
    const scale = Math.min(window.innerWidth / WORLD.width, (window.innerHeight - 24) / WORLD.height);
    this.canvas.width = WORLD.width;
    this.canvas.height = WORLD.height;
    this.canvas.style.width = `${Math.floor(WORLD.width * scale)}px`;
    this.canvas.style.height = `${Math.floor(WORLD.height * scale)}px`;
  }

  draw(state) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    this.drawFloor(ctx, state.level);
    this.drawShadows(ctx, state.level);
    this.drawVaultAndExit(ctx, state);
    this.drawLoot(ctx, state);
    this.drawCover(ctx, state.level);
    this.drawWalls(ctx, state.level);
    this.drawSmoke(ctx, state);
    this.drawCones(ctx, state);
    this.drawCameras(ctx, state);
    this.drawGuards(ctx, state);
    this.drawPlayer(ctx, state);
    this.drawHud(ctx, state);
    if (state.screen !== 'playing') this.drawScreen(ctx, state);
    if (state.screen === 'playing' && state.caughtFlash > 0) {
      ctx.fillStyle = `rgba(229, 72, 77, ${Math.min(0.45, state.caughtFlash)})`;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    }
  }

  drawFloor(ctx, level) {
    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(0, PLAY.y, PLAY.width, PLAY.height);
    // Checker tiles so movement reads at a glance.
    ctx.fillStyle = COLORS.floorAlt;
    const tile = 64;
    for (let y = PLAY.y; y < PLAY.y + PLAY.height; y += tile) {
      for (let x = 0; x < PLAY.width; x += tile) {
        if (((x / tile) + (y / tile)) % 2 === 0) ctx.fillRect(x, y, tile, tile);
      }
    }
    // Velvet carpet down the middle — the "direct" route.
    ctx.fillStyle = COLORS.carpet;
    ctx.fillRect(596, PLAY.y, 88, PLAY.height);
    ctx.strokeStyle = 'rgba(232, 195, 60, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(596, PLAY.y, 88, PLAY.height);
  }

  drawShadows(ctx, level) {
    for (const s of level.shadows) {
      ctx.fillStyle = COLORS.shadow;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SHADOW — hard to spot here', s.x + s.w / 2, s.y + s.h - 10);
    }
  }

  drawWalls(ctx, level) {
    for (const w of level.walls) {
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = COLORS.wallTop;
      ctx.fillRect(w.x, w.y, w.w, 4);
    }
  }

  drawCover(ctx, level) {
    for (const c of level.cover) {
      ctx.fillStyle = COLORS.cover;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = COLORS.coverTop;
      ctx.fillRect(c.x, c.y, c.w, 5);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      ctx.fillStyle = 'rgba(241, 233, 210, 0.75)';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      const label = c.kind === 'slots' ? '🎰 SLOTS' : c.kind === 'pillar' ? 'PILLAR' : 'CRATE';
      ctx.fillText(label, c.x + c.w / 2, c.y + c.h / 2 + 4);
    }
  }

  drawVaultAndExit(ctx, state) {
    const v = state.level.vault;
    ctx.fillStyle = state.vaultOpen ? '#3f6212' : '#78350f';
    roundRect(ctx, v.x, v.y, v.w, v.h, 8);
    ctx.fill();
    ctx.strokeStyle = COLORS.loot;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.vaultOpen ? 'VAULT OPEN' : '🔒 VAULT', v.x + v.w / 2, v.y + v.h / 2 - 4);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(state.vaultOpen ? 'loot inside!' : 'hold E to pick', v.x + v.w / 2, v.y + v.h / 2 + 14);
    if (state.player.picking) {
      const bw = 80;
      ctx.fillStyle = '#111';
      ctx.fillRect(v.x + 10, v.y - 16, bw, 10);
      ctx.fillStyle = COLORS.loot;
      ctx.fillRect(v.x + 10, v.y - 16, bw * state.player.lockpickProgress, 10);
    }

    const e = state.level.exit;
    ctx.fillStyle = state.exitOpen ? COLORS.exitOpen : COLORS.exitClosed;
    roundRect(ctx, e.x, e.y, e.w, e.h, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(state.exitOpen ? '➜ GETAWAY' : '🔒 EXIT', e.x + e.w / 2, e.y + e.h / 2 + 5);
  }

  drawLoot(ctx, state) {
    // Main loot: the Velvet Diamond, inside the vault until it opens.
    if (state.vaultOpen && !state.mainLootTaken) {
      const cx = state.level.vault.x + state.level.vault.w / 2;
      const cy = state.level.vault.y + state.level.vault.h / 2 + 26;
      const pulse = 1 + Math.sin(state.time * 4) * 0.12;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = COLORS.loot;
      ctx.beginPath();
      ctx.moveTo(0, -16); ctx.lineTo(12, 0); ctx.lineTo(0, 16); ctx.lineTo(-12, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.fillStyle = COLORS.loot;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★ VELVET DIAMOND ★', cx, cy + 34);
    }
    for (const b of state.bonusLoot) {
      if (b.taken) continue;
      const pulse = 1 + Math.sin(state.time * 3 + b.x) * 0.1;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = COLORS.bonusLoot;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText('$', 0, 5);
      ctx.restore();
    }
  }

  drawSmoke(ctx, state) {
    for (const s of state.smokeClouds) {
      ctx.fillStyle = COLORS.smoke;
      ctx.beginPath();
      ctx.arc(s.x, s.y, TOOLS.smoke.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SMOKE', s.x, s.y + 4);
    }
  }

  drawCones(ctx, state) {
    const blockers = [...state.level.walls, ...state.level.cover];
    for (const cam of state.cameras) {
      if (cam.disabled) {
        drawCone(ctx, cam.x, cam.y, cam.facing, cam.range, CAMERA.viewHalfAngle, COLORS.coneCameraOff, blockers);
      } else {
        drawCone(ctx, cam.x, cam.y, cam.facing, cam.range, CAMERA.viewHalfAngle,
          cam.seeingPlayer ? 'rgba(229, 72, 77, 0.30)' : COLORS.coneCamera, blockers);
      }
    }
    for (const g of state.guards) {
      const color = g.state === 'chase' ? 'rgba(229, 72, 77, 0.38)'
        : g.state === 'suspicious' ? COLORS.coneSuspicious : COLORS.cone;
      drawCone(ctx, g.x, g.y, g.facing, GUARD.viewRange, GUARD.viewHalfAngle, color, blockers);
    }
  }

  drawCameras(ctx, state) {
    for (const cam of state.cameras) {
      ctx.fillStyle = cam.disabled ? '#64748b' : COLORS.camera;
      ctx.beginPath();
      ctx.arc(cam.x, cam.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Lens direction tick.
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(cam.x, cam.y);
      ctx.lineTo(cam.x + Math.cos(cam.facing) * 16, cam.y + Math.sin(cam.facing) * 16);
      ctx.stroke();
      ctx.fillStyle = '#f1e9d2';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cam.disabled ? 'CAM OFF' : '📷 CAM', cam.x, cam.y - 16);
    }
  }

  drawGuards(ctx, state) {
    for (const g of state.guards) {
      const color = g.state === 'chase' ? COLORS.guard
        : g.state === 'suspicious' ? COLORS.guardSuspicious : COLORS.guard;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(g.x, g.y, PLAYER.radius + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Facing tick + eyes.
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x + Math.cos(g.facing) * 20, g.y + Math.sin(g.facing) * 20);
      ctx.stroke();
      // Suspicion arc over the head.
      if (g.suspicion > 2 && g.state !== 'chase') {
        ctx.strokeStyle = '#f5a524';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(g.x, g.y, 22, -Math.PI / 2, -Math.PI / 2 + (g.suspicion / 100) * Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      const label = g.state === 'chase' ? '! CHASE !' : g.state === 'suspicious' ? '? SUSPICIOUS' : 'GUARD';
      ctx.fillText(label, g.x, g.y - 28);
    }
  }

  drawPlayer(ctx, state) {
    const p = state.player;
    ctx.fillStyle = p.sneaking ? COLORS.playerSneak : COLORS.player;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Velvet's mask stripe + facing tick.
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(p.facing) * 6 - Math.sin(p.facing) * 8, p.y - Math.sin(p.facing) * 6 + Math.cos(p.facing) * 8);
    ctx.lineTo(p.x - Math.cos(p.facing) * 6 + Math.sin(p.facing) * 8, p.y - Math.sin(p.facing) * 6 - Math.cos(p.facing) * 8);
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.facing) * 18, p.y + Math.sin(p.facing) * 18);
    ctx.stroke();
    ctx.fillStyle = '#f1e9d2';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.sneaking ? 'VELVET (sneaking)' : 'VELVET', p.x, p.y - 22);
  }

  drawHud(ctx, state) {
    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(0, 0, WORLD.width, PLAY.y);
    ctx.fillStyle = COLORS.hudText;
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('🎩 THE VELVET VAULT', 14, 26);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = '#a5b4fc';
    ctx.fillText(state.level.name, 14, 48);

    // Alarm meter — always visible, centre top.
    const ax = 470, ay = 16, aw = 300, ah = 20;
    ctx.fillStyle = '#f1e9d2';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🚨 ALARM', ax, ay + 15);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(ax + 78, ay, aw, ah);
    const alarmColor = state.alarm < 40 ? COLORS.alarmLow : state.alarm < 75 ? COLORS.alarmMid : COLORS.alarmHigh;
    ctx.fillStyle = alarmColor;
    ctx.fillRect(ax + 78, ay, aw * (state.alarm / 100), ah);
    ctx.strokeStyle = '#f1e9d2';
    ctx.lineWidth = 1;
    ctx.strokeRect(ax + 78, ay, aw, ah);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(`${Math.round(state.alarm)}%`, ax + 78 + aw + 8, ay + 15);
    ctx.fillStyle = state.lockdownTimer > 0 ? '#f87171' : '#94a3b8';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(state.lockdownTimer > 0 ? '⚠ LOCKDOWN — guards hunt!' : 'stay out of cones & cameras', ax, ay + 38);

    // Right cluster: loot, lives, tools, timer.
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.loot;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`💰 $${state.score}`, 1258, 26);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(`❤ ${'♥'.repeat(state.lives)}${'♡'.repeat(Math.max(0, 3 - state.lives))}   ⏱ ${state.timerText}`, 1258, 48);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '13px system-ui, sans-serif';
    const toolLabel = state.player.selectedTool === 'smoke' ? '💨 SMOKE' : '⚡ EMP';
    ctx.fillText(`${toolLabel} ×${state.player.tools[state.player.selectedTool]}  [1/2 select, click use]`, 1258, 62);
    ctx.textAlign = 'left';
  }

  drawScreen(ctx, state) {
    const cx = WORLD.width / 2;
    if (state.screen === 'title') {
      ctx.fillStyle = 'rgba(10, 8, 20, 0.82)';
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.loot;
      ctx.font = 'bold 56px system-ui, sans-serif';
      ctx.fillText('🎩 THE VELVET VAULT', cx, 170);
      ctx.fillStyle = '#f1e9d2';
      ctx.font = '22px system-ui, sans-serif';
      ctx.fillText('A top-down stealth heist in three rooms', cx, 215);
      ctx.font = '17px system-ui, sans-serif';
      ctx.fillStyle = '#cbd5e1';
      const lines = [
        'You are Velvet, gentleman thief. Cross each room, crack the vault,',
        'grab the Velvet Diamond, then slip out the getaway door — unseen.',
        '',
        'WASD / Arrows — move      Shift — sneak (slower, harder to spot)',
        '1 / 2 or Q — pick a tool      Click — use it (Smoke hides you, EMP kills a camera)',
        'Hold E at the vault — pick the lock      P — pause      M — mute      R — restart',
        '',
        'Red cones are guard sight, blue cones are cameras. Walls, crates and',
        'shadows break their view. The alarm rises when you are seen — at 100%',
        'the whole floor goes into lockdown. Caught three times and the night is over.',
      ];
      lines.forEach((l, i) => ctx.fillText(l, cx, 260 + i * 26));
      ctx.fillStyle = COLORS.loot;
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText('▶  Press ENTER or click to start the heist', cx, 560);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText('100% offline — no network, sounds synthesized live.', cx, 600);
    } else if (state.screen === 'paused') {
      ctx.fillStyle = 'rgba(10, 8, 20, 0.7)';
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f1e9d2';
      ctx.font = 'bold 44px system-ui, sans-serif';
      ctx.fillText('⏸ PAUSED', cx, 360);
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText('Press P to keep sneaking', cx, 410);
    } else if (state.screen === 'levelclear') {
      ctx.fillStyle = 'rgba(10, 8, 20, 0.78)';
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.exitOpen;
      ctx.font = 'bold 48px system-ui, sans-serif';
      ctx.fillText('💰 CLEAN GETAWAY!', cx, 300);
      ctx.fillStyle = '#f1e9d2';
      ctx.font = '22px system-ui, sans-serif';
      ctx.fillText(state.clearText, cx, 350);
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('Press ENTER for the next room', cx, 410);
    } else if (state.screen === 'gameover') {
      ctx.fillStyle = 'rgba(20, 4, 8, 0.85)';
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.fillText('🚨 BUSTED!', cx, 320);
      ctx.fillStyle = '#f1e9d2';
      ctx.font = '22px system-ui, sans-serif';
      ctx.fillText('The guards caught Velvet three times. The vault keeps its diamond.', cx, 370);
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(`Final score: $${state.score}   •   Press R to try again`, cx, 420);
    } else if (state.screen === 'win') {
      ctx.fillStyle = 'rgba(6, 20, 10, 0.85)';
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.loot;
      ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.fillText('🏆 THE PERFECT HEIST!', cx, 300);
      ctx.fillStyle = '#f1e9d2';
      ctx.font = '22px system-ui, sans-serif';
      ctx.fillText('Three rooms, three vaults, one Velvet Diamond — and nobody saw a thing.', cx, 350);
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(`Final score: $${state.score}   •   Time: ${state.timerText}   •   Press R to play again`, cx, 400);
    }
    ctx.textAlign = 'left';
  }
}
