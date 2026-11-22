// The Velvet Vault — guard AI and shared sight math.
// One job: patrol / suspicious / chase / return behaviour, plus the
// line-of-sight and vision-cone tests the guards and cameras both use.

import { GUARD } from './config.js';

// --- geometry helpers (exported for camera.js) ---------------------------

export function segmentHitsRect(x1, y1, x2, y2, r) {
  // Does segment (x1,y1)-(x2,y2) touch rectangle r? Slab test.
  const dx = x2 - x1, dy = y2 - y1;
  let tmin = 0, tmax = 1;
  for (const [p, q] of [[-dx, x1 - r.x], [dx, r.x + r.w - x1], [-dy, y1 - r.y], [dy, r.y + r.h - y1]]) {
    // Parallel to this slab and outside it: the segment cannot touch the rect.
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > tmax) return false; if (t > tmin) tmin = t; }
    else { if (t < tmin) return false; if (t < tmax) tmax = t; }
  }
  return true;
}

export function hasLineOfSight(x1, y1, x2, y2, blockers) {
  // Sight rays that only graze a wall's exact edge do not count as blocked:
  // shrink each blocker by a couple of pixels so boundary contact is ignored.
  for (const b of blockers) {
    const inset = { x: b.x + 2, y: b.y + 2, w: b.w - 4, h: b.h - 4 };
    if (inset.w > 0 && inset.h > 0 && segmentHitsRect(x1, y1, x2, y2, inset)) return false;
  }
  return true;
}

export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function pointInCone(ox, oy, facing, range, halfAngle, px, py) {
  const dx = px - ox, dy = py - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return { seen: false, dist };
  if (dist < 18) return { seen: true, dist };
  const ang = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(ang, facing)) > halfAngle) return { seen: false, dist };
  return { seen: true, dist };
}

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function circleHitsRect(cx, cy, radius, r) {
  const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
  const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
  return (cx - nx) ** 2 + (cy - ny) ** 2 < radius * radius;
}

// --- guard ---------------------------------------------------------------

export class Guard {
  constructor(def, levelIndex) {
    this.x = def.x;
    this.y = def.y;
    this.waypoints = def.waypoints;
    this.pause = def.pause;
    this.levelIndex = levelIndex;
    this.speedBoost = 1 + levelIndex * 0.14;
    this.wpIndex = 0;
    this.waitTimer = 0;
    this.facing = 0;
    this.state = 'patrol'; // patrol | suspicious | chase | return
    this.suspicion = 0;
    this.lastSeen = null;
    this.loseSightTimer = 0;
    this.noiseTarget = null;
    this.pauseTimer = 0;
  }

  reset() {
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.wpIndex = 1 % this.waypoints.length;
    this.state = 'patrol';
    this.suspicion = 0;
    this.lastSeen = null;
    this.loseSightTimer = 0;
    this.noiseTarget = null;
    this.waitTimer = 0;
    this.facing = Math.atan2(
      this.waypoints[this.wpIndex].y - this.y,
      this.waypoints[this.wpIndex].x - this.x,
    );
  }

  hearNoise(x, y) {
    if (this.state === 'chase') return;
    this.noiseTarget = { x, y };
    this.state = 'suspicious';
    this.suspicion = Math.max(this.suspicion, 45);
  }

  update(dt, ctx) {
    const { player, blockers, inSmoke, inShadow } = ctx;
    const speed = this.state === 'chase'
      ? GUARD.chaseSpeed * this.speedBoost
      : this.state === 'return'
        ? GUARD.returnSpeed * this.speedBoost
        : GUARD.patrolSpeed * this.speedBoost;

    // --- can this guard see the player right now? ---
    const cone = pointInCone(this.x, this.y, this.facing, GUARD.viewRange, GUARD.viewHalfAngle, player.x, player.y);
    const seen = cone.seen
      && !inSmoke(player.x, player.y)
      && hasLineOfSight(this.x, this.y, player.x, player.y, blockers);

    if (seen) {
      this.lastSeen = { x: player.x, y: player.y };
      this.loseSightTimer = 0;
      let rate = cone.dist < 110 ? GUARD.suspicionPerSecondClose : GUARD.suspicionPerSecondFar;
      if (player.sneaking) rate *= GUARD.sneakMultiplier;
      if (inShadow(player.x, player.y)) rate *= GUARD.shadowMultiplier;
      this.suspicion = Math.min(100, this.suspicion + rate * dt);
      if (this.suspicion >= 100 && this.state !== 'chase') {
        this.state = 'chase';
        ctx.onSpotted(this);
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - GUARD.suspicionDecay * dt);
      if (this.state === 'chase') {
        this.loseSightTimer += dt;
        if (this.loseSightTimer > GUARD.chaseMemorySeconds) {
          this.state = 'return';
          this.loseSightTimer = 0;
        }
      } else if (this.state === 'suspicious' && this.suspicion <= 0 && !this.noiseTarget) {
        this.state = 'return';
      }
    }

    // --- move by state ---
    if (this.state === 'patrol') this.patrolMove(dt, speed);
    else if (this.state === 'suspicious') this.investigateMove(dt, speed);
    else if (this.state === 'chase') this.chaseMove(dt, speed, ctx);
    else this.returnMove(dt, speed);

    // Face the direction of travel while patrolling/returning; face the
    // player (or last seen spot) while suspicious or chasing.
    if (this.state === 'chase' && this.lastSeen) {
      this.facing = Math.atan2(this.lastSeen.y - this.y, this.lastSeen.x - this.x);
    } else if (this.state === 'suspicious' && this.noiseTarget) {
      this.facing = Math.atan2(this.noiseTarget.y - this.y, this.noiseTarget.x - this.x);
    }
  }

  moveToward(tx, ty, dt, speed) {
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return true;
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    if (this.state === 'patrol' || this.state === 'return') {
      this.facing = Math.atan2(dy, dx);
    }
    this.x = nx;
    this.y = ny;
    return dist - step < 3;
  }

  patrolMove(dt, speed) {
    if (this.waitTimer > 0) { this.waitTimer -= dt; return; }
    const target = this.waypoints[this.wpIndex];
    if (this.moveToward(target.x, target.y, dt, speed)) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      this.waitTimer = this.pause;
    }
  }

  investigateMove(dt, speed) {
    const target = this.noiseTarget || this.lastSeen;
    if (!target) { this.state = 'return'; return; }
    if (this.moveToward(target.x, target.y, dt, speed * 1.25)) {
      this.noiseTarget = null;
      this.pauseTimer = 1.4;
      if (this.suspicion <= 0) this.state = 'return';
    }
  }

  chaseMove(dt, speed, ctx) {
    const target = this.lastSeen || { x: ctx.player.x, y: ctx.player.y };
    this.moveToward(target.x, target.y, dt, speed);
    // Caught check is done by main.js (grace period), not here.
  }

  returnMove(dt, speed) {
    const target = this.waypoints[this.wpIndex];
    if (this.moveToward(target.x, target.y, dt, speed)) {
      this.state = 'patrol';
      this.waitTimer = this.pause;
    }
  }
}
