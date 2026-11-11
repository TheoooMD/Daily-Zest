// Daily Zest — diorama : île flottante rendue en 3D (Three.js) à basse résolution puis agrandie en pixels nets.
// Les clients arrivent au rythme de la demande du modèle et sont servis au rythme de la capacité de l'équipe.
(() => {
  const canvas = document.getElementById('scene'), stage = document.getElementById('stage');
  // preserveDrawingBuffer : le verre liquide recopie ce canvas (drawImage) après chaque rendu
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 200);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ang = Math.PI / 4, angT = ang, speed = 1;
  const HOUR = 30; // 1 heure d'ouverture = 30 s à l'écran

  // toon ramp à 3 tons = ombrage façon pixel art
  const gm = new THREE.DataTexture(new Uint8Array([120, 190, 255]), 3, 1, THREE.LuminanceFormat);
  gm.minFilter = gm.magFilter = THREE.NearestFilter; gm.needsUpdate = true;
  const mats = {};
  const mat = c => mats[c] || (mats[c] = new THREE.MeshToonMaterial({ color: c, gradientMap: gm }));
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  const add = (m, x, y, z, parent) => { m.position.set(x, y, z); parent.add(m); return m; };
  const box = (w, h, d, c, x, y, z, p) => { const m = add(new THREE.Mesh(BOX, mat(c)), x, y, z, p); m.scale.set(w, h, d); return m; };
  const blob = (geo, c, x, y, z, sx, sy, sz, p) => { const m = add(new THREE.Mesh(geo, mat(c)), x, y, z, p); m.scale.set(sx, sy ?? sx, sz ?? sx); return m; };

  const hemi = new THREE.HemisphereLight(0xffffff, 0x9a8070, 0.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(7, 12, 3); scene.add(sun);

  const world = new THREE.Group(); scene.add(world);

  // l'île elle-même (sol, arbres, jardins, stands, équipe, places) : island.js, partagée avec la maquette de l'accueil
  const { gardens, stands, lampMat, person, HAIR, dress } = buildIsland(world, { add, box, blob });
  const SHIRTS = ['#e86a5c', '#5a8fd8', '#7cc4a4', '#e9a54a', '#a87cc9', '#f4f1ea', '#3d6b8c', '#e889b0'];
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let seatsPos = [];

  // ---- simulation des clients ----
  let customers = [], S = null, R = null, sig = '';
  const V = (x, z) => new THREE.Vector3(x, 0, z);
  const QMAX = 7, spot = (s, i) => V(s.x, s.z + 1.35 + i * 0.55);
  function spawn(s) {
    const g = person(SHIRTS[Math.floor(rnd() * SHIRTS.length)], HAIR[Math.floor(rnd() * HAIR.length)]);
    const jx = (rnd() - 0.5) * 0.9;
    add(g, jx, 0, 6.6, world);
    const c = { g, s, path: [V(jx, 0.4)], state: 'in', t: 0 };
    if (s.queue.length >= QMAX) { // file pleine : vente perdue, le client fait demi-tour avec un « ! »
      c.state = 'balk'; c.path.push(V(jx * 0.5, -0.4));
      box(0.1, 0.32, 0.1, '#e8364f', 0, 1.62, 0, g); box(0.1, 0.1, 0.1, '#e8364f', 0, 1.36, 0, g);
    } else { s.queue.push(c); c.path.push(spot(s, s.queue.length - 1)); }
    customers.push(c);
  }
  function leave(c, via) {
    c.state = 'out'; const jx = (rnd() - 0.5) * 0.9;
    c.path = [...via, V(jx, 0.6), V(jx, 6.8)];
  }
  function serveDone(s) {
    const c = s.queue.shift();
    s.queue.forEach((q, i) => { q.path = [spot(s, i)]; q.state = 'in'; });
    const free = seatsPos.filter(p => !p.taken);
    if (S.seats > 0 && free.length && rnd() < S.sitPct / 100) {
      const seat = free[Math.floor(rnd() * free.length)]; seat.taken = true;
      c.state = 'tosit'; c.seat = seat; c.path = [V(s.x + (s.x <= 0 ? -1.6 : 1.6), s.z + 1.6), V(-1.3, 0.8), V(seat.x, seat.z)];
    } else leave(c, [V(s.x + (rnd() < 0.5 ? -1.5 : 1.5), s.z + 1.4)]);
  }
  function arrive(c) {
    if (c.state === 'in') { c.state = 'wait'; c.g.rotation.y = Math.PI; }
    else if (c.state === 'balk') leave(c, []);
    else if (c.state === 'tosit') { c.state = 'sit'; c.t = (S.sitMin / 60) * HOUR; c.g.position.y = 0.15; c.g.rotation.y = c.seat.face; }
    else if (c.state === 'out') c.dead = true;
  }

  function rebuild() {
    customers.forEach(c => world.remove(c.g)); customers = [];
    stands.forEach(s => { s.queue = []; s.serveT = 0; });
    seatsPos = dress(S.stands, PRODUCTS.filter(p => S[p.id + '_on']).map(p => p.color), Math.min(S.staff, 4), S.seats * S.stands);
    for (const p of PRODUCTS) if (gardens[p.id]) gardens[p.id].visible = !!S[p.id + '_on'];
  }

  window.onModelChange = (s, r) => {
    S = s; R = r;
    const nsig = [S.stands, S.staff, S.seats, ...PRODUCTS.map(p => +S[p.id + '_on'])].join('|');
    if (nsig !== sig) { sig = nsig; rebuild(); }
  };

  // ---- moment de la journée ----
  const MODES = {
    day: { bg: '#a7dccf', hemi: 0.62, sun: 0.8, sunC: 0xffffff, lamp: 0 },
    dusk: { bg: '#f2b49b', hemi: 0.45, sun: 0.7, sunC: 0xffb98a, lamp: 0.6 },
    night: { bg: '#26304f', hemi: 0.22, sun: 0.22, sunC: 0x8fa6ff, lamp: 1.6 },
  };
  function setMode(k) {
    const m = MODES[k]; renderer.setClearColor(m.bg); stage.style.background = document.body.style.background = m.bg;
    document.body.dataset.time = k; // les panneaux en verre passent en sombre la nuit
    hemi.intensity = m.hemi; sun.intensity = m.sun; sun.color.setHex(m.sunC);
    lampMat.color.set(m.lamp ? '#ffe680' : '#efe6c4');
    stands.forEach(s => (s.light.intensity = m.lamp));
    document.querySelectorAll('[data-time]').forEach(b => b.setAttribute('aria-pressed', b.dataset.time === k));
  }
  document.querySelectorAll('[data-time]').forEach(b => (b.onclick = () => setMode(b.dataset.time)));
  // thème sombre du système ou du lecteur → on démarre la nuit
  const theme = document.documentElement.dataset.theme;
  setMode(theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'night' : 'day');

  // ---- nuages sous l'île ----
  const clouds = add(new THREE.Group(), 0, 0, 0, scene);
  [[0, -4.5, 1.6], [2.1, -6, 1.2], [4.2, -3.2, 1.0], [5.1, -7, 1.4]].forEach(([a, y, s]) => {
    const c = add(new THREE.Group(), Math.cos(a) * 9.5, y, Math.sin(a) * 9.5, clouds);
    box(2 * s, 0.6 * s, 1.2 * s, '#ffffff', 0, 0, 0, c); box(1.1 * s, 0.5 * s, 0.9 * s, '#ffffff', 0.4 * s, 0.4 * s, 0, c);
  });

  // ---- caméra, contrôles ----
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(Math.max(1, w), Math.max(1, h), false); // 1 pixel de rendu par pixel CSS (réglage retenu)
    const a = w / h; let v = 23; if (v * a < 30) v = 30 / a; // île centrée, nuages compris
    cam.left = -v * a / 2; cam.right = v * a / 2; cam.top = v / 2; cam.bottom = -v / 2; cam.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();
  document.getElementById('t-left').onclick = () => (angT -= Math.PI / 2);
  document.getElementById('t-right').onclick = () => (angT += Math.PI / 2);
  const sp = document.getElementById('t-speed');
  sp.onclick = () => { speed = speed === 1 ? 3 : 1; sp.setAttribute('aria-pressed', speed === 3); };
  let drag = null;
  canvas.addEventListener('pointerdown', e => { drag = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (drag !== null) { angT -= (e.clientX - drag) * 0.008; ang = angT; drag = e.clientX; } });
  canvas.addEventListener('pointerup', () => (drag = null));

  // ---- intro depuis l'accueil (classe .intro posée dans jeu.html) : on part plein zoom sur le stand du milieu, à la taille
  // où l'accueil a laissé la maquette (comptoir = 42 % de la hauteur d'écran), et on dézoome vers la vue normale.
  // Même calcul que aim() de landing.js : on vise un point tel que le stand tombe au centre de l'écran au zoom voulu.
  // dézoom qui part tout de suite (ease-out) : l'accueil vient de s'arrêter sur le stand, on repart sans temps mort
  const root = document.documentElement, INTRO = 1050, ease = p => 1 - (1 - p) ** 3;
  const P = new THREE.Vector3(), A = new THREE.Vector3(), CR = new THREE.Vector3(), CU = new THREE.Vector3(), O = new THREE.Vector3(), T = new THREE.Vector3(0, -2.6, 0);
  let introK = root.classList.contains('intro') ? 1 : 0, introT0 = -1, introF = 0;
  function aimAtStand(k) {
    cam.updateMatrixWorld(); cam.updateProjectionMatrix(); O.copy(cam.position).sub(T); // direction de caméra inchangée
    P.set(0, world.position.y + 1.47, -3.4);
    const n0 = A.copy(P).project(cam), nx = n0.x * (1 - k), ny = n0.y * (1 - k), z = (0.42 * (cam.top - cam.bottom) / 2.8) ** k;
    CR.setFromMatrixColumn(cam.matrixWorld, 0); CU.setFromMatrixColumn(cam.matrixWorld, 1);
    A.copy(P).addScaledVector(CR, -nx * (cam.right - cam.left) / (2 * z)).addScaledVector(CU, -ny * (cam.top - cam.bottom) / (2 * z));
    cam.zoom = z; cam.position.copy(A).add(O); cam.lookAt(A);
  }

  // ---- retour à l'accueil (← Accueil) : la même morphose à l'envers. Panneaux masqués, caméra ramenée de face, on replonge
  // sur le stand du milieu ; l'image finale et l'état de l'île partent à l'accueil, qui les reprend sur sa maquette et dézoome.
  const OUTRO = 800, home = document.querySelector('a.eyebrow[href="index.html"]');
  let outT0 = -1, outA0 = 0, outA1 = 0, gone = false;
  if (!reduce) home.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; // nouvel onglet : navigation normale
    e.preventDefault();
    if (outT0 >= 0) return;
    introK = 0; root.classList.add('intro'); scrollTo(0, 0); // .intro masque les panneaux (jeu.html)
    outA0 = ang; outA1 = Math.PI / 4 + Math.round((ang - Math.PI / 4) / (2 * Math.PI)) * 2 * Math.PI; // le tour le plus proche
    outT0 = performance.now();
  });
  function leaveHome() {
    gone = true;
    const on = PRODUCTS.filter(p => S[p.id + '_on']);
    try {
      sessionStorage.setItem('dz-outro', canvas.toDataURL('image/jpeg', 0.85));
      sessionStorage.setItem('dz-dress', JSON.stringify({ stands: S.stands, colors: on.map(p => p.color), staff: Math.min(S.staff, 4), seats: S.seats * S.stands, gardens: on.map(p => p.id) }));
    } catch (err) { /* stockage bloqué : l'accueil s'ouvrira normalement */ }
    location.href = home.href;
  }
  // retour arrière vers le stand (page restaurée depuis le cache) : vue normale
  addEventListener('pageshow', e => { if (e.persisted && outT0 >= 0) { outT0 = -1; introK = 0; gone = false; root.classList.remove('intro'); } });

  const clock = document.getElementById('b-clock');
  let simH = 0, last = performance.now(), time = 0;
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, now - last) / 1000); last = now; time += dt;
    const sdt = dt * speed;
    ang += (angT - ang) * Math.min(1, dt * 6);
    if (outT0 >= 0) { // ease-in-out : on arrive en douceur sur le stand, l'accueil repart aussitôt
      const p = Math.min(1, (now - outT0) / OUTRO);
      introK = p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) ** 2; ang = angT = outA0 + (outA1 - outA0) * introK;
    }
    cam.zoom = 1; cam.position.set(Math.sin(ang) * 30, 21.5, Math.cos(ang) * 30); cam.lookAt(T); // île centrée à l'écran, un peu remontée au-dessus de la cascade
    if (outT0 >= 0) { if (introK > 0) aimAtStand(introK); }
    else if (introK > 0) {
      if (++introF === 2) introT0 = now; // la 1re image compile les shaders (longue) : le dézoom démarre à la 2e
      const p = introT0 < 0 ? 0 : Math.min(1, (now - introT0) / INTRO);
      introK = 1 - ease(p);
      // l'image de l'accueil est la même que celle du stand : on la retire dès que le stand a affiché sa 1re image
      // (un fondu la laissait traîner, figée, au-dessus du dézoom : effet de pause et image fantôme)
      if (introF === 2) root.style.setProperty('--veil', 0);
      if (p > 0.6 && root.classList.contains('intro')) { root.classList.remove('intro'); root.style.removeProperty('--from'); } // panneaux en fin de dézoom
      if (introK > 0) aimAtStand(introK);
    }
    cam.updateProjectionMatrix();
    if (!reduce) { world.position.y = Math.sin(time * 0.7) * 0.12; clouds.rotation.y += dt * 0.03; }

    if (S && R) {
      simH += sdt / HOUR;
      const hh = 8 + (simH % S.hours), m = Math.floor((hh % 1) * 60);
      const hhmm = `${String(Math.floor(hh) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      if (clock.textContent !== hhmm) clock.textContent = hhmm; // n'écrire que si ça change : le verre observe le DOM
      const arrPerSec = Math.min(3, (R.demandH / S.items) / HOUR); // clients demandés / s par stand
      const servPerSec = (R.capH / S.items) / HOUR;              // clients servis max / s par stand
      stands.forEach((s, i) => {
        if (i >= S.stands) return;
        s.nextArr -= sdt * arrPerSec;
        if (s.nextArr <= 0 && customers.length < 60) { spawn(s); s.nextArr += 0.6 + rnd() * 0.8; }
        const head = s.queue[0];
        if (head && head.state === 'wait') { s.serveT += sdt * servPerSec; if (s.serveT >= 1) { s.serveT = 0; serveDone(s); } }
        s.staff.children.forEach((st, k) => (st.position.y = reduce ? 0 : Math.abs(Math.sin(time * 4 + k)) * (head ? 0.06 : 0.02)));
      });
      for (const c of customers) {
        if (c.state === 'sit') { c.t -= sdt; if (c.t <= 0) { c.seat.taken = false; c.g.position.y = 0; leave(c, [V(-1.3, 0.8)]); } continue; }
        const tgt = c.path[0];
        if (!tgt) continue;
        const p = c.g.position, dx = tgt.x - p.x, dz = tgt.z - p.z, d = Math.hypot(dx, dz), step = 1.7 * sdt;
        if (d <= step) { p.x = tgt.x; p.z = tgt.z; p.y = 0; c.path.shift(); if (!c.path.length) arrive(c); }
        else { p.x += dx / d * step; p.z += dz / d * step; p.y = reduce ? 0 : Math.abs(Math.sin(time * 11 + p.x)) * 0.07; c.g.rotation.y = Math.atan2(dx, dz); }
      }
      customers = customers.filter(c => { if (c.dead) world.remove(c.g); return !c.dead; });
    }
    renderer.render(scene, cam);
    if (outT0 >= 0 && introK === 1 && !gone) leaveHome(); // juste après le rendu : le canvas contient l'image finale
    // l'île bouge : le verre au-dessus se met à jour (pas pendant l'intro : panneaux masqués, et le dézoom garde ses 60 i/s)
    if (window.glass && !root.classList.contains('intro')) window.glass.markChanged(canvas);
    requestAnimationFrame(frame);
  }
  update(); // game.js a déjà calculé une fois ; on relance pour que la scène reçoive l'état
  requestAnimationFrame(frame);
})();
