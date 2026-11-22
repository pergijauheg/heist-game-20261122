// The Velvet Vault — security cameras.
// One job: the sweeping wall cameras, their vision cones, and the EMP
// blackout that shuts one down for a few precious seconds.

import { CAMERA, PLAY } from './config.js';
import { angleDifference, hasLineOfSight, pointInCone } from './guard.js';

export class SecurityCamera {
  constructor(def, levelIndex) {
    this.x = def.x;
    this.y = def.y;
    this.baseAngle = def.baseAngle;
    this.range = def.range ?? CAMERA.viewRange;
    this.sweepSpeed = CAMERA.sweepSpeed * (1 + levelIndex * 0.12);
    this.arc = CAMERA.sweepArc;
    this.phase = Math.random() * Math.PI * 2;
    this.facing = this.baseAngle;
    this.disabledTimer = 0;
    this.seeingPlayer = false;
  }

  reset() {
    this.disabledTimer = 0;
    this.seeingPlayer = false;
    this.phase = Math.random() * Math.PI * 2;
  }

  get disabled() { return this.disabledTimer > 0; }

  emp() {
    this.disabledTimer = CAMERA.empDisableSeconds;
    this.seeingPlayer = false;
  }

  update(dt, ctx) {
    if (this.disabledTimer > 0) {
      this.disabledTimer -= dt;
      this.seeingPlayer = false;
      return;
    }
    // Sweep back and forth around the base angle like a real wall camera.
    this.phase += this.sweepSpeed * dt;
    const swing = Math.sin(this.phase) * this.arc;
    this.facing = this.baseAngle + swing;

    const { player, blockers, inSmoke } = ctx;
    const cone = pointInCone(this.x, this.y, this.facing, this.range, CAMERA.viewHalfAngle, player.x, player.y);
    this.seeingPlayer = cone.seen
      && !inSmoke(player.x, player.y)
      && hasLineOfSight(this.x, this.y, player.x, player.y, blockers);
  }

  // Where the cone points, for the renderer.
  coneAngle() { return this.facing; }
}
