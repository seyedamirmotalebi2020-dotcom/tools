/**
 * Gears Background
 * Draws clusters of glowing, properly meshing gears that rotate together,
 * with sparks at the contact points and drifting hex nuts.
 * Includes reduced-motion support, tab-visibility pausing, and DPR capping.
 */
(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init() {
    const bgCanvas = document.getElementById('bgCanvas');
    const particleCanvas = document.getElementById('particleCanvas');

    if (!bgCanvas || !particleCanvas) return;

    const ctxBg = bgCanvas.getContext('2d');
    const ctxP = particleCanvas.getContext('2d');

    let W = 0;
    let H = 0;
    let DPR = 1;
    let rafId = null;
    let lastFrame = 0;

    // Slow drift so the scene isn't perfectly static
    let driftX = 0;
    let driftY = 0;
    let driftPhase = 0;

    // ── Gear layout ──
    // Each cluster is a chain: the root has a position (fractions of the viewport),
    // every other gear meshes with its parent at a given angle (radians).
    const CLUSTERS = [
      [
        { x: 0.86, y: 0.18, n: 24 },
        { parent: 0, angle: 2.2, n: 14 },
        { parent: 0, angle: 0.9, n: 12 },
        { parent: 1, angle: 2.9, n: 18 },
        { parent: 2, angle: 0.2, n: 10 },
      ],
      [
        { x: 0.1, y: 0.84, n: 28 },
        { parent: 0, angle: -0.5, n: 16 },
        { parent: 1, angle: -1.3, n: 10 },
        { parent: 0, angle: -2.3, n: 12 },
        { parent: 3, angle: -3.0, n: 20 },
      ],
      [
        { x: 0.5, y: 0.52, n: 40 }, // big faint centre gear
        { parent: 0, angle: -0.4, n: 20 },
      ],
    ];

    let gears = [];
    let contacts = [];

    function layoutGears() {
      gears = [];
      contacts = [];
      const m = Math.max(4.5, Math.min(W, H) * 0.0145); // gear "module" (tooth size)

      CLUSTERS.forEach((cluster, ci) => {
        const base = gears.length;
        cluster.forEach((def, i) => {
          const g = {
            n: def.n,
            pitch: (m * def.n) / 2,
            m,
            cluster: ci,
            parent: def.parent !== undefined ? base + def.parent : -1,
            angle: def.angle || 0,
            x: 0,
            y: 0,
            rot: 0,
            faint: ci === 2,
          };
          if (g.parent === -1) {
            g.x = def.x * W;
            g.y = def.y * H;
          } else {
            const p = gears[g.parent];
            const dist = p.pitch + g.pitch;
            g.x = p.x + Math.cos(g.angle) * dist;
            g.y = p.y + Math.sin(g.angle) * dist;
            contacts.push({
              x: p.x + Math.cos(g.angle) * p.pitch,
              y: p.y + Math.sin(g.angle) * p.pitch,
            });
          }
          gears.push(g);
        });
      });
    }

    // Root gears spin at a speed inversely proportional to size; children are
    // computed from their parent so the teeth always interlock exactly.
    function updateGears(now) {
      gears.forEach((g, i) => {
        if (g.parent === -1) {
          const dir = g.cluster % 2 === 0 ? 1 : -1;
          g.rot = dir * now * 0.00028 * (24 / g.n);
        } else {
          const p = gears[g.parent];
          const phi = g.angle;
          g.rot = phi + Math.PI - (Math.PI - p.n * (phi - p.rot)) / g.n;
        }
      });
    }

    function gearPath(ctx, g) {
      const step = (Math.PI * 2) / g.n;
      const rr = g.pitch - g.m * 1.1; // root radius
      const ro = g.pitch + g.m * 1.0; // tip radius
      ctx.beginPath();
      for (let i = 0; i < g.n; i++) {
        const a = i * step;
        const p1 = [Math.cos(a - 0.25 * step) * rr, Math.sin(a - 0.25 * step) * rr];
        const p2 = [Math.cos(a - 0.13 * step) * ro, Math.sin(a - 0.13 * step) * ro];
        const p3 = [Math.cos(a + 0.13 * step) * ro, Math.sin(a + 0.13 * step) * ro];
        const p4 = [Math.cos(a + 0.25 * step) * rr, Math.sin(a + 0.25 * step) * rr];
        if (i === 0) ctx.moveTo(p1[0], p1[1]);
        else ctx.lineTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.lineTo(p3[0], p3[1]);
        ctx.lineTo(p4[0], p4[1]);
        ctx.arc(0, 0, rr, a + 0.25 * step, a + 0.75 * step);
      }
      ctx.closePath();
      return { rr, ro };
    }

    function drawGear(g, i, glow, alpha) {
      const blue = i % 2 === 0;
      const stroke = blue ? '147, 197, 253' : '196, 181, 253';
      const glowCol = blue ? 'rgba(54, 140, 238, 0.95)' : 'rgba(124, 58, 237, 0.95)';
      const a = alpha * (g.faint ? 0.35 : 1);

      ctxBg.save();
      ctxBg.translate(g.x, g.y);
      ctxBg.rotate(g.rot);

      const { rr } = gearPath(ctxBg, g);
      const hole = rr * 0.22;

      // Body fill (with centre hole cut out)
      ctxBg.moveTo(hole, 0);
      ctxBg.arc(0, 0, hole, 0, Math.PI * 2, true);
      ctxBg.fillStyle = `rgba(${blue ? '37, 99, 235' : '124, 58, 237'}, ${0.1 * a})`;
      ctxBg.fill('evenodd');

      // Glowing outline
      ctxBg.shadowColor = glowCol;
      ctxBg.shadowBlur = 24 * glow;
      ctxBg.lineWidth = Math.max(1.5, g.m * 0.28);
      ctxBg.lineJoin = 'round';
      ctxBg.strokeStyle = `rgba(${stroke}, ${a})`;
      gearPath(ctxBg, g);
      ctxBg.stroke();

      // Inner ring
      ctxBg.shadowBlur = 12 * glow;
      ctxBg.lineWidth = Math.max(1, g.m * 0.18);
      ctxBg.strokeStyle = `rgba(${stroke}, ${a * 0.7})`;
      ctxBg.beginPath();
      ctxBg.arc(0, 0, rr * 0.72, 0, Math.PI * 2);
      ctxBg.stroke();

      // Spokes
      const spokes = g.n >= 20 ? 6 : 4;
      ctxBg.beginPath();
      for (let s = 0; s < spokes; s++) {
        const sa = (s / spokes) * Math.PI * 2;
        ctxBg.moveTo(Math.cos(sa) * hole, Math.sin(sa) * hole);
        ctxBg.lineTo(Math.cos(sa) * rr * 0.72, Math.sin(sa) * rr * 0.72);
      }
      ctxBg.stroke();

      // Hub
      ctxBg.beginPath();
      ctxBg.arc(0, 0, hole, 0, Math.PI * 2);
      ctxBg.stroke();

      ctxBg.restore();
    }

    // ── Floating hex nuts + sparks + ambient dust ──
    let particles = [];
    let nuts = [];
    let sparks = [];

    function createParticles() {
      particles = [];
      const count = Math.min(40, Math.floor((W * H) / 45000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.4 + 0.4,
          vx: (Math.random() - 0.5) * 0.15,
          vy: -Math.random() * 0.2 - 0.05,
          a: Math.random() * 0.35 + 0.15,
        });
      }

      nuts = [];
      const nutCount = Math.min(7, Math.floor((W * H) / 150000) + 2);
      for (let i = 0; i < nutCount; i++) {
        nuts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 7 + 7,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.012,
          a: Math.random() * 0.2 + 0.2,
        });
      }
      sparks = [];
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      DPR = dpr;

      [bgCanvas, particleCanvas].forEach((c) => {
        c.width = Math.floor(W * dpr);
        c.height = Math.floor(H * dpr);
        c.style.width = W + 'px';
        c.style.height = H + 'px';
      });

      ctxBg.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxP.setTransform(dpr, 0, 0, dpr, 0, 0);

      layoutGears();
      createParticles();
    }

    // ── Draw gears ──
    function drawGears(now) {
      ctxBg.clearRect(0, 0, W, H);

      // Gentle breathing glow
      const glow = 0.85 + 0.15 * Math.sin(now * 0.0016);
      const alpha = 0.75 * (0.9 + 0.1 * Math.sin(now * 0.0016));

      driftPhase += 0.0025;
      driftX = Math.sin(driftPhase) * 6;
      driftY = Math.cos(driftPhase * 0.7) * 4;

      updateGears(now);

      ctxBg.save();
      ctxBg.translate(driftX, driftY);
      gears.forEach((g, i) => drawGear(g, i, glow, alpha));
      ctxBg.restore();
    }

    function drawHex(ctx, r, rot) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = rot + (i * Math.PI) / 3;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }

    function drawParticles() {
      ctxP.clearRect(0, 0, W, H);

      // Ambient dust
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;

        ctxP.beginPath();
        ctxP.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctxP.fillStyle = `rgba(37, 99, 235, ${p.a})`;
        ctxP.shadowColor = 'rgba(37, 99, 235, 0.6)';
        ctxP.shadowBlur = 6;
        ctxP.fill();
      }

      // Floating hex nuts
      for (const n of nuts) {
        n.x += n.vx;
        n.y += n.vy;
        n.rot += n.vr;
        if (n.x < -30) n.x = W + 30;
        if (n.x > W + 30) n.x = -30;
        if (n.y < -30) n.y = H + 30;
        if (n.y > H + 30) n.y = -30;

        ctxP.save();
        ctxP.translate(n.x, n.y);
        ctxP.shadowColor = 'rgba(54, 140, 238, 0.8)';
        ctxP.shadowBlur = 10;
        ctxP.lineWidth = 1.5;
        ctxP.strokeStyle = `rgba(191, 219, 254, ${n.a})`;
        drawHex(ctxP, n.r, n.rot);
        ctxP.stroke();
        ctxP.beginPath();
        ctxP.arc(0, 0, n.r * 0.45, 0, Math.PI * 2);
        ctxP.stroke();
        ctxP.restore();
      }

      // Sparks at gear contact points
      if (!prefersReducedMotion) {
        for (const c of contacts) {
          if (Math.random() < 0.04) {
            const ang = Math.random() * Math.PI * 2;
            const sp = Math.random() * 1.4 + 0.4;
            sparks.push({
              x: c.x + driftX,
              y: c.y + driftY,
              vx: Math.cos(ang) * sp,
              vy: Math.sin(ang) * sp - 0.3,
              life: 1,
              decay: Math.random() * 0.03 + 0.02,
            });
          }
        }
        if (sparks.length > 120) sparks.splice(0, sparks.length - 120);
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.03; // slight gravity
        s.life -= s.decay;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctxP.beginPath();
        ctxP.arc(s.x, s.y, 1.2, 0, Math.PI * 2);
        ctxP.fillStyle = `rgba(219, 234, 254, ${s.life})`;
        ctxP.shadowColor = 'rgba(147, 197, 253, 1)';
        ctxP.shadowBlur = 8;
        ctxP.fill();
      }
    }

    // ── Animation loop ──
    function loop(now) {
      // Throttle to ~40 FPS — smooth enough for rotating gears, saves battery
      if (now - lastFrame > 25) {
        drawGears(now);
        drawParticles();
        lastFrame = now;
      }
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (rafId) return;
      rafId = requestAnimationFrame(loop);
    }

    function stop() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    // ── Init ──
    resize();
    window.addEventListener('resize', () => {
      clearTimeout(resize._t);
      resize._t = setTimeout(() => {
        resize();
        if (prefersReducedMotion) {
          drawGears(1000);
          drawParticles();
        }
      }, 150);
    });

    // Pause when tab hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });

    if (prefersReducedMotion) {
      // One static frame, no rotation
      drawGears(1000);
      drawParticles();
    } else {
      start();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
