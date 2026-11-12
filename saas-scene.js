// SaaSsy — Diorama 3D & Moteur d'Animation des Prospects (Three.js)
// Simulation des flux de leads entrants, démos avec les Account Executives, gong de victoire et gestion jour/nuit.

(() => {
  const canvas = document.getElementById('scene'), stage = document.getElementById('stage');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 200);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ang = Math.PI / 4, angT = ang, speed = 1;
  const MONTH_SEC = 25; // 1 mois de pipe commercial = 25 s d'animation

  // Toon ramp pour ombrage pixel art
  const gm = new THREE.DataTexture(new Uint8Array([120, 190, 255]), 3, 1, THREE.LuminanceFormat);
  gm.minFilter = gm.magFilter = THREE.NearestFilter; gm.needsUpdate = true;
  const mats = {};
  const mat = c => mats[c] || (mats[c] = new THREE.MeshToonMaterial({ color: c, gradientMap: gm }));
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  const add = (m, x, y, z, parent) => { m.position.set(x, y, z); parent.add(m); return m; };
  const box = (w, h, d, c, x, y, z, p) => { const m = add(new THREE.Mesh(BOX, mat(c)), x, y, z, p); m.scale.set(w, h, d); return m; };
  const blob = (geo, c, x, y, z, sx, sy, sz, p) => { const m = add(new THREE.Mesh(geo, mat(c)), x, y, z, p); m.scale.set(sx, sy ?? sx, sz ?? sx); return m; };

  // Éclairage principal
  const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.7); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(8, 14, 4); scene.add(sun);

  const world = new THREE.Group(); scene.add(world);

  // Construction de l'île open space
  const island = buildSaaSIsland(world, { add, box, blob });
  const PROSPECT_COLORS = ['#38bdf8', '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#cbd5e1'];
  let seed = 42; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // ---- Simulation du pipe de leads ----
  let prospects = [], S = null, R = null, sig = '';
  const V = (x, z) => new THREE.Vector3(x, 0, z);
  const MAX_PIPE = 6;
  let gongTimer = 0;

  function ringGong() {
    gongTimer = 1.0;
    island.gongWave.material.opacity = 0.85;
    island.gongWave.scale.set(1, 1, 1);
  }

  function spawnLead() {
    const pColor = PROSPECT_COLORS[Math.floor(rnd() * PROSPECT_COLORS.length)];
    const pHair = island.HAIR[Math.floor(rnd() * island.HAIR.length)];
    const g = island.person(pColor, pHair, false); // prospect sans micro
    const jx = (rnd() - 0.5) * 1.2;
    add(g, jx, 0, 7.4, world);

    // Vérifier si un commercial est disponible
    const activeDesksCount = Math.max(1, Math.min(6, S.sales_reps));
    const freeDesk = island.deskUnits.slice(0, activeDesksCount).find(d => !d.busy);

    const lead = { g, desk: freeDesk, path: [V(jx, 4.0)], state: 'in', t: 0 };

    if (!freeDesk) {
      // Pipe saturé (manque d'AEs) : prospect bloqué qui repart frustré
      lead.state = 'balk';
      lead.path.push(V(jx * 0.6, 2.0));
      // Badge point d'exclamation rouge au-dessus de la tête
      box(0.1, 0.32, 0.1, '#ef4444', 0, 1.62, 0, g);
      box(0.1, 0.1, 0.1, '#ef4444', 0, 1.36, 0, g);
    } else {
      freeDesk.busy = true;
      // Marcher jusqu'au bureau du commercial pour la démo
      lead.path.push(V(freeDesk.slot.x + (freeDesk.slot.x < 0 ? 0.9 : -0.9), freeDesk.slot.z));
    }
    prospects.push(lead);
  }

  function finishDemo(lead) {
    if (lead.desk) lead.desk.busy = false;
    const won = rnd() < (S.close_rate / 100);

    if (won) {
      // Deal gagné : aller sonner le gong !
      ringGong();
      lead.state = 'gong';
      lead.path = [V(1.6, -1.8), V(0.4, 4.2), V(0, 7.4)];
    } else {
      // Non signé : repartir calmement
      lead.state = 'out';
      lead.path = [V(0, 4.0), V(0, 7.4)];
    }
  }

  function arrive(lead) {
    if (lead.state === 'in') {
      lead.state = 'demo';
      lead.t = 2.5; // durée de la démo
      lead.g.rotation.y = lead.desk.slot.face === 0 ? Math.PI : 0;
    } else if (lead.state === 'balk' || lead.state === 'gong' || lead.state === 'out') {
      lead.dead = true;
    }
  }

  window.onSaaSModelChange = (s, r) => {
    S = s; R = r;
    const nsig = [S.sales_reps, S.demos_per_rep, Math.round(S.token_usage_cust)].join('|');
    if (nsig !== sig) {
      sig = nsig;
      island.dress(S.sales_reps, S.token_usage_cust);
    }
  };

  // ---- Éclairage & Thèmes Jour / Nuit (Cyberpunk) ----
  const MODES = {
    day:   { bg: '#0f172a', hemi: 0.8,  sun: 0.9, sunC: 0xffffff, serverBoost: 1.2 },
    dusk:  { bg: '#1e1b4b', hemi: 0.55, sun: 0.75, sunC: 0xf43f5e, serverBoost: 1.6 },
    night: { bg: '#020617', hemi: 0.35, sun: 0.4,  sunC: 0x38bdf8, serverBoost: 2.5 },
  };

  function setMode(k) {
    const m = MODES[k];
    renderer.setClearColor(m.bg);
    stage.style.background = document.body.style.background = m.bg;
    document.body.dataset.time = k;
    hemi.intensity = m.hemi;
    sun.intensity = m.sun;
    sun.color.setHex(m.sunC);
    island.serverLight.intensity = (0.8 + (S ? S.token_usage_cust / 50 : 0.2) * 2.2) * m.serverBoost;
    document.querySelectorAll('[data-time]').forEach(b => b.setAttribute('aria-pressed', b.dataset.time === k));
  }
  document.querySelectorAll('[data-time]').forEach(b => (b.onclick = () => setMode(b.dataset.time)));

  const theme = document.documentElement.dataset.theme;
  setMode(theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'night' : 'day');

  // ---- Nuages technologiques géométriques ----
  const cloudGroup = add(new THREE.Group(), 0, 0, 0, scene);
  [[0, -4.8, 1.8], [2.2, -6.5, 1.4], [4.5, -3.5, 1.1], [5.2, -7.5, 1.5]].forEach(([a, y, s]) => {
    const c = add(new THREE.Group(), Math.cos(a) * 10, y, Math.sin(a) * 10, cloudGroup);
    box(2.2 * s, 0.4 * s, 1.4 * s, '#1e293b', 0, 0, 0, c);
    box(1.2 * s, 0.3 * s, 0.9 * s, '#334155', 0.4 * s, 0.25 * s, 0, c);
  });

  // ---- Caméra, Cadrage & Contrôles ----
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(Math.max(1, w), Math.max(1, h), false);
    const a = w / h;
    let v = 23;
    if (v * a < 30) v = 30 / a;
    cam.left = -v * a / 2; cam.right = v * a / 2; cam.top = v / 2; cam.bottom = -v / 2;
    cam.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  document.getElementById('t-left').onclick = () => (angT -= Math.PI / 2);
  document.getElementById('t-right').onclick = () => (angT += Math.PI / 2);
  const sp = document.getElementById('t-speed');
  sp.onclick = () => {
    speed = speed === 1 ? 3 : 1;
    sp.setAttribute('aria-pressed', speed === 3);
  };

  let drag = null;
  canvas.addEventListener('pointerdown', e => { drag = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (drag !== null) {
      angT -= (e.clientX - drag) * 0.008;
      ang = angT;
      drag = e.clientX;
    }
  });
  canvas.addEventListener('pointerup', () => (drag = null));

  // ---- Boucle principale d'animation ----
  const T = new THREE.Vector3(0, -2.2, 0);
  let nextLeadIn = 0.5, lastTime = performance.now(), time = 0;

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, now - lastTime) / 1000);
    lastTime = now;
    time += dt;
    const sdt = dt * speed;

    ang += (angT - ang) * Math.min(1, dt * 6);
    cam.zoom = 1;
    cam.position.set(Math.sin(ang) * 31, 22.5, Math.cos(ang) * 31);
    cam.lookAt(T);
    cam.updateProjectionMatrix();

    if (!reduce) {
      world.position.y = Math.sin(time * 0.8) * 0.1;
      cloudGroup.rotation.y += dt * 0.02;

      // Faire clignoter les LEDs de la baie de serveurs
      island.leds.forEach((led, i) => {
        led.visible = Math.sin(time * 6 + i * 1.5) > -0.2;
      });

      // Animer l'onde du gong
      if (gongTimer > 0) {
        gongTimer -= sdt * 1.5;
        const scale = 1 + (1 - gongTimer) * 1.5;
        island.gongWave.scale.set(scale, scale, 1);
        island.gongWave.material.opacity = Math.max(0, gongTimer * 0.85);
      }
    }

    if (S && R) {
      // Arrivée des leads proportionnelle à leads_per_month
      const spawnRate = Math.min(2.5, (S.leads_per_month / MONTH_SEC));
      nextLeadIn -= sdt * spawnRate * 0.35;
      if (nextLeadIn <= 0 && prospects.length < 18) {
        spawnLead();
        nextLeadIn = 0.8 + rnd() * 0.8;
      }

      // Mouvement des prospects
      for (const p of prospects) {
        if (p.state === 'demo') {
          p.t -= sdt;
          if (p.t <= 0) finishDemo(p);
          continue;
        }

        const tgt = p.path[0];
        if (!tgt) continue;

        const pos = p.g.position;
        const dx = tgt.x - pos.x, dz = tgt.z - pos.z;
        const d = Math.hypot(dx, dz);
        const step = 2.0 * sdt;

        if (d <= step) {
          pos.x = tgt.x; pos.z = tgt.z; pos.y = 0;
          p.path.shift();
          if (!p.path.length) arrive(p);
        } else {
          pos.x += (dx / d) * step;
          pos.z += (dz / d) * step;
          pos.y = reduce ? 0 : Math.abs(Math.sin(time * 12 + pos.x)) * 0.06;
          p.g.rotation.y = Math.atan2(dx, dz);
        }
      }

      prospects = prospects.filter(p => {
        if (p.dead) world.remove(p.g);
        return !p.dead;
      });
    }

    renderer.render(scene, cam);
    if (window.glass) window.glass.markChanged(canvas);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
