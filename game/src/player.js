// The Velvet Vault — Velvet, the thief.
// One job: movement, sneaking, wall collision, tool use and the vault
// lockpick. The player knows nothing about guards; main.js asks it to move
// and tells it what it is standing on.

import { PLAYER, PLAY, TOOLS, VAULT } from './config.js';
import { circleHitsRect } from './guard.js';

export class Player {
  constructor(start) {
    this.start = { ...start };
    this.x = start.x;
    this.y = start.y;
    this.sneaking = false;
    this.facing = -Math.PI / 2;
    this.moving = false;
    this.stepTimer = 0;
    this.tools = { smoke: 0, emp: 0 };
    this.selectedTool = 'smoke';
    this.lockpickProgress = 0;
    this.picking = false;
  }

  reset(start, tools) {
    this.start = { ...start };
    this.x = start.x;
    this.y = start.y;
    this.sneaking = false;
    this.facing = -Math.PI / 2;
    this.moving = false;
    this.tools = { ...tools };
    this.selectedTool = 'smoke';
    this.lockpickProgress = 0;
    this.picking = false;
  }

  move(dt, input, blockers) {
    let dx = 0, dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    this.sneaking = !!input.sneak;
    this.moving = dx !== 0 || dy !== 0;
    if (!this.moving) return false;

    const len = Math.hypot(dx, dy);
    const speed = this.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    dx = (dx / len) * speed * dt;
    dy = (dy / len) * speed * dt;
    this.facing = Math.atan2(dy, dx);

    // Axis-separated collision so Velvet slides along walls instead of sticking.
    const nx = this.x + dx;
    if (!this.hitsAnything(nx, this.y, blockers)) this.x = nx;
    const ny = this.y + dy;
    if (!this.hitsAnything(this.x, ny, blockers)) this.y = ny;
    this.x = Math.max(PLAY.x + 12 + PLAYER.radius, Math.min(PLAY.x + PLAY.width - 12 - PLAYER.radius, this.x));
    this.y = Math.max(PLAY.y + 12 + PLAYER.radius, Math.min(PLAY.y + PLAY.height - 12 - PLAYER.radius, this.y));

    this.stepTimer -= dt;
    if (this.stepTimer <= 0 && this.moving) {
      this.stepTimer = this.sneaking ? 0.55 : 0.34;
      return true; // a footstep happened — main.js plays the sound
    }
    return false;
  }

  hitsAnything(x, y, blockers) {
    for (const b of blockers) {
      if (circleHitsRect(x, y, PLAYER.radius, b)) return true;
    }
    return false;
  }

  // Lockpick: hold E near the vault. Returns 'done' when the vault opens,
  // 'picking' while in progress, 'far' when not close enough.
  updateLockpick(dt, holdingPick, nearVault) {
    this.picking = false;
    if (!holdingPick || !nearVault) {
      this.lockpickProgress = Math.max(0, this.lockpickProgress - dt * 1.5);
      return holdingPick && !nearVault ? 'far' : 'idle';
    }
    this.picking = true;
    this.lockpickProgress += dt / VAULT.lockpickSeconds;
    if (this.lockpickProgress >= 1) {
      this.lockpickProgress = 0;
      return 'done';
    }
    return 'picking';
  }

  useSelectedTool() {
    if (this.tools[this.selectedTool] <= 0) return null;
    this.tools[this.selectedTool] -= 1;
    return this.selectedTool;
  }

  cycleTool() {
    this.selectedTool = this.selectedTool === 'smoke' ? 'emp' : 'smoke';
  }
}
