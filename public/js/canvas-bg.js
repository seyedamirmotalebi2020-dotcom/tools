/**
 * Neon "TOOLs!" Background
 * Draws a large neon sign with glow, flicker, and gentle drift.
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

    // ── Neon state ──
    // Flicker intensity: 1 = full brightness, dips down randomly
    let flicker = 1;
    let flickerTarget = 1;
    let flickerTimer = 0;
    // Slow drift offset so the sign isn't perfectly static
    let driftX = 0;
    let driftY = 0;
    let driftPhase = 0;

    // ── Particles ──
    let particles = [];

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

      createParticles();
    }

    function createParticles() {
      particles = [];
      // Small ambient particles — kept subtle so they don't compete with the sign
      const count = Math.min(40, Math.floor((W * H) / 45000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.4 + 0.4,
          vx: (Math.random() - 0.5) * 0.15,
          vy: -Math.random() * 0.2 - 0.05, // upward drift
          a: Math.random() * 0.35 + 0.15,
        });
      }
    }

    // ── Draw the neon sign ──
    function drawNeon(now) {
      ctxBg.clearRect(0, 0, W, H);

      // Smooth flicker — randomly dips to simulate a neon tube
      flickerTimer -= 1;
      if (flickerTimer <= 0) {
        const r = Math.random();
        if (r > 0.94) {
          // Sharp flicker
          flickerTarget = 0.55 + Math.random() * 0.15;
          flickerTimer = 3 + Math.random() * 4;
        } else if (r > 0.85) {
          // Soft dip
          flickerTarget = 0.85;
          flickerTimer = 6 + Math.random() * 8;
        } else {
          flickerTarget = 1;
          flickerTimer = 40 + Math.random() * 80;
        }
      }
      // Ease current toward target
      flicker += (flickerTarget - flicker) * 0.15;

      // Slow sinusoidal drift — sign sways by a few pixels
      driftPhase += 0.0025;
      driftX = Math.sin(driftPhase) * 6;
      driftY = Math.cos(driftPhase * 0.7) * 4;

      const cx = W / 2 + driftX;
      const cy = H / 2 + driftY;

      // Font size scales with viewport but caps so it doesn't overwhelm on desktop
      const fontSize = Math.min(W * 0.22, H * 0.32, 420);

      ctxBg.save();
      ctxBg.translate(cx, cy);
      ctxBg.textAlign = 'center';
      ctxBg.textBaseline = 'middle';
      ctxBg.font = `900 ${fontSize}px "DM Sans", system-ui, sans-serif`;
      // Slight italic slant so it feels more dynamic
      ctxBg.transform(1, 0, -0.06, 1, 0, 0);

      const opacity = 0.8 * flicker; // whole sign opacity — keep subtle

      // ── Outer bloom ──
      ctxBg.shadowColor = 'rgba(173, 176, 180, 0.9)';
      ctxBg.shadowBlur = 90 * flicker;
      ctxBg.fillStyle = `rgba(37, 99, 235, ${opacity * 0.35})`;
      ctxBg.fillText('TOOLs!', 0, 0);

      // ── Mid glow ──
      ctxBg.shadowBlur = 45 * flicker;
      ctxBg.fillStyle = `rgba(124, 58, 237, ${opacity * 0.55})`;
      ctxBg.fillText('TOOLs!', 0, 0);

      // ── Core stroke (the neon tube itself) ──
      ctxBg.shadowBlur = 22 * flicker;
      ctxBg.shadowColor = 'rgb(54, 140, 238)';
      ctxBg.lineWidth = Math.max(2, fontSize * 0.012);
      ctxBg.strokeStyle = `rgba(191, 219, 254, ${opacity * 1.4})`;
      ctxBg.strokeText('TOOLs!', 0, 0);

      // ── Bright inner highlight ──
      ctxBg.shadowBlur = 8 * flicker;
      ctxBg.fillStyle = `rgba(219, 234, 254, ${opacity * 1.6})`;
      ctxBg.fillText('TOOLs!', 0, 0);

      ctxBg.restore();
    }

    // ── Draw ambient particles ──
    function drawParticles() {
      ctxP.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
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
    }

    // ── Animation loop ──
    function loop(now) {
      // Throttle to ~40 FPS — plenty smooth for a slowly drifting sign, saves battery
      if (now - lastFrame > 25) {
        drawNeon(now);
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
      resize._t = setTimeout(resize, 150);
    });

    // Pause when tab hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });

    if (prefersReducedMotion) {
      // Draw one static frame with the sign at full brightness
      flicker = 1;
      drawNeon(performance.now());
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