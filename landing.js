// Daily Zest — landing : un bureau en pixel art posé sur un grand plancher, l'avatar debout devant les écrans.
// Même rendu que le jeu (Three.js, ombrage en 3 tons, 1 pixel de rendu par pixel CSS).
(() => {
  const canvas = document.getElementById('office');
  // preserveDrawingBuffer : le verre liquide du CV recopie ce canvas (drawImage) après chaque rendu
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 200);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rootEl = document.documentElement;
  const dark = rootEl.dataset.theme === 'dark' || (rootEl.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);

  // le dégradé du fond de page, peint aussi dans la scène : le verre liquide ne voit que ce canvas (sinon il réfracte du blanc)
  const bg = document.createElement('canvas'); bg.width = bg.height = 256;
  const bgx = bg.getContext('2d'), css = getComputedStyle(rootEl), grad = bgx.createRadialGradient(0, 0, 0, 0, 0, 1);
  grad.addColorStop(0, css.getPropertyValue('--bg-in').trim()); grad.addColorStop(1, css.getPropertyValue('--bg-out').trim());
  bgx.setTransform(0.7 * 256, 0, 0, 0.62 * 256, 0.5 * 256, 0.46 * 256); bgx.fillStyle = grad; bgx.fillRect(-2, -2, 4, 4); // = ellipse 70% 62% at 50% 46%
  scene.background = new THREE.CanvasTexture(bg);

  const gm = new THREE.DataTexture(new Uint8Array([120, 190, 255]), 3, 1, THREE.LuminanceFormat);
  gm.minFilter = gm.magFilter = THREE.NearestFilter; gm.needsUpdate = true;
  const mats = {};
  const mat = c => mats[c] || (mats[c] = new THREE.MeshToonMaterial({ color: c, gradientMap: gm }));
  const BOX = new THREE.BoxGeometry(1, 1, 1), ICO = new THREE.IcosahedronGeometry(1, 0), CYL = new THREE.CylinderGeometry(1, 1, 1, 12);
  const add = (m, x, y, z, p = scene) => { m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; p.add(m); return m; };
  const box = (w, h, d, c, x, y, z, p) => { const m = add(new THREE.Mesh(BOX, mat(c)), x, y, z, p); m.scale.set(w, h, d); return m; };
  const blob = (geo, c, x, y, z, sx, sy, sz, p) => { const m = add(new THREE.Mesh(geo, mat(c)), x, y, z, p); m.scale.set(sx, sy ?? sx, sz ?? sx); return m; };
  const flat = (w, h, material, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); m.position.set(x, y, z); scene.add(m); return m; };

  const hemi = new THREE.HemisphereLight(0xffffff, 0xb59a80, dark ? 0.32 : 0.62); scene.add(hemi);
  const sun = new THREE.DirectionalLight(dark ? 0x8fa6ff : 0xfff4e0, dark ? 0.25 : 0.75);
  sun.position.set(7, 12, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.002;
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 }); scene.add(sun);

  // ---- plancher : lames de bois en quinconce sur un socle en noyer ----
  box(12.6, 0.5, 12.6, '#b8925f', 0, -0.35, 0);
  box(12.9, 0.18, 12.9, '#8d6a4f', 0, -0.68, 0);
  const woods = ['#e4bd8c', '#d9ae7b', '#ebc898', '#dfb584'];
  for (let k = 0; k < 12; k++) {
    for (let x = -6 - (k % 3), i = 0; x < 6; x += 3, i++) {
      const a = Math.max(x, -6), b = Math.min(x + 3, 6);
      if (b > a) box(b - a - 0.04, 0.1, 0.96, woods[(k * 3 + i) % 4], (a + b) / 2, -0.05, -5.5 + k);
    }
  }

  // ---- murs (gauche et fond), plinthes ----
  // deux verts sauge différents (l'éclairage sature les deux faces pareil) : l'angle se lit à la couleur
  box(0.35, 4.6, 12, '#8aa898', -6.175, 2.3, 0);
  box(12.35, 4.6, 0.35, '#a2bcae', -0.175, 2.3, -6.175);
  box(0.06, 0.25, 11.8, '#6f8c7e', -5.97, 0.125, 0.1);
  box(11.8, 0.25, 0.06, '#7f9b8d', 0.1, 0.125, -5.97);

  // fenêtre sur le mur du fond
  const sky = new THREE.MeshBasicMaterial({ color: dark ? '#2b3966' : '#d4eef7' });
  box(2.7, 2.05, 0.08, '#5f7d70', 2.4, 2.75, -5.96);
  for (const [dx, dy] of [[-0.62, 0.48], [0.62, 0.48], [-0.62, -0.48], [0.62, -0.48]]) flat(1.12, 0.84, sky, 2.4 + dx, 2.75 + dy, -5.91);
  if (dark) flat(0.26, 0.26, new THREE.MeshBasicMaterial({ color: '#fff3c8' }), 3.2, 3.3, -5.9);

  // tableau de croissance sur le mur gauche : barres qui montent, citron et menthe
  box(0.06, 1.75, 2.7, '#5f7d70', -5.96, 2.8, -0.7);
  box(0.04, 1.55, 2.5, '#c9bea6', -5.93, 2.8, -0.7);
  [0.32, 0.46, 0.42, 0.66, 0.9, 1.18].forEach((h, i) => box(0.05, h, 0.26, i % 2 ? '#7cc4a4' : '#f2c230', -5.9, 2.1 + h / 2, -1.7 + i * 0.4));

  // étagères de classeurs sur le mur du fond
  const binders = ['#3d6b8c', '#e86a5c', '#f2c230', '#7cc4a4', '#2f3542', '#a87cc9', '#e9a54a'];
  for (const y of [2.35, 3.2]) {
    box(2.6, 0.08, 0.5, '#8d6a4f', -3.3, y, -5.73);
    binders.forEach((c, i) => box(0.2, 0.55, 0.4, c, -4.42 + i * 0.3, y + 0.32, -5.74));
  }

  // horloge murale
  const clock = blob(CYL, '#ffffff', -5.95, 3.75, 2.4, 0.45, 0.06, 0.45); clock.rotation.z = Math.PI / 2;
  box(0.03, 0.3, 0.05, '#2f3542', -5.9, 3.85, 2.4); box(0.03, 0.05, 0.22, '#2f3542', -5.9, 3.75, 2.48);

  // classeur à tiroirs et plante
  box(0.8, 2.4, 1.8, '#8d6a4f', -5.55, 1.2, -4.6);
  for (let i = 0; i < 3; i++) { box(0.04, 0.7, 1.7, '#a07c5d', -5.13, 0.45 + i * 0.78, -4.6); box(0.05, 0.06, 0.4, '#3a3f4a', -5.1, 0.62 + i * 0.78, -4.6); }
  blob(CYL, '#b5734e', -5.1, 0.35, -2.6, 0.38, 0.7, 0.38);
  [[0, 1.2, 0, 0.55], [0.25, 1.65, 0.1, 0.4], [-0.2, 1.55, -0.15, 0.42], [0.05, 2.0, -0.05, 0.3]].forEach(([dx, y, dz, s]) => blob(ICO, '#4f9a5a', -5.1 + dx, y, -2.6 + dz, s));

  // tapis
  box(5.2, 0.03, 3.4, '#4a6b66', 0.5, 0.015, -1.1);
  box(4.8, 0.03, 3.0, '#56786f', 0.5, 0.02, -1.1);

  // ---- bureau, écrans, chaise ----
  box(3.7, 0.1, 1.5, '#a07c5d', 2.2, 1.25, -4.75);
  for (const [dx, dz] of [[-1.75, -0.65], [-1.75, 0.65], [1.75, -0.65], [1.75, 0.65]]) box(0.08, 1.2, 0.08, '#3a3f4a', 2.2 + dx, 0.6, -4.75 + dz);
  box(1, 1.12, 1.35, '#8d6a4f', 3.45, 0.6, -4.75);
  box(0.9, 0.04, 0.02, '#6b4f3b', 3.45, 0.9, -4.07); box(0.9, 0.04, 0.02, '#6b4f3b', 3.45, 0.5, -4.07);

  // écrans : graphiques dessinés en pixels dans un canvas, rafraîchis en boucle
  function screenTex() {
    const c = document.createElement('canvas'); c.width = 96; c.height = 56;
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter;
    return { ctx: c.getContext('2d'), t };
  }
  const scrA = screenTex(), scrB = screenTex();
  function drawScreens(time) {
    for (const s of [scrA, scrB]) { s.ctx.fillStyle = '#10202a'; s.ctx.fillRect(0, 0, 96, 56); s.ctx.fillStyle = '#1d3440'; for (let y = 14; y < 56; y += 10) s.ctx.fillRect(4, y, 88, 1); }
    // A : courbe de CA qui monte, aire citron
    const a = scrA.ctx, pts = [];
    for (let i = 0; i < 12; i++) pts.push([6 + i * 7.6, 48 - i * 2.6 - Math.sin(time * 1.3 + i * 0.9) * 3]);
    a.fillStyle = 'rgba(242,194,48,.35)'; a.beginPath(); a.moveTo(pts[0][0], 52); pts.forEach(p => a.lineTo(p[0], p[1])); a.lineTo(pts[11][0], 52); a.fill();
    a.strokeStyle = '#7fe0b4'; a.lineWidth = 2; a.beginPath(); pts.forEach((p, i) => (i ? a.lineTo(p[0], p[1]) : a.moveTo(p[0], p[1]))); a.stroke();
    a.fillStyle = '#f2c230'; a.fillRect(6, 4, 22, 4); a.fillStyle = '#7fe0b4'; a.fillRect(32, 4, 12, 4);
    // B : cascade du compte de résultat (CA, coûts, EBITDA, D&A, résultat)
    const b = scrB.ctx;
    let run = 0;
    [34, -9, -14, -4, 0, -2, 0].forEach((v, i) => {
      const x = 8 + i * 12;
      if (i === 0) { run = v + Math.sin(time * 1.1) * 1.5; b.fillStyle = '#eef1fb'; b.fillRect(x, 50 - run, 8, run); }
      else if (v === 0) { b.fillStyle = i === 6 ? '#f2c230' : '#eef1fb'; b.fillRect(x, 50 - run, 8, run); }
      else { b.fillStyle = '#ec7466'; b.fillRect(x, 50 - run, 8, -v); run += v; }
    });
    b.fillStyle = '#f2c230'; b.fillRect(8, 4, 30, 4);
    scrA.t.needsUpdate = scrB.t.needsUpdate = true;
  }
  drawScreens(0);
  for (const [x, s] of [[1.3, scrA], [3.1, scrB]]) {
    box(1.62, 1.0, 0.08, '#2a2f3a', x, 2.08, -5.2);
    flat(1.5, 0.88, new THREE.MeshBasicMaterial({ map: s.t }), x, 2.08, -5.155);
    box(0.12, 0.42, 0.12, '#2a2f3a', x, 1.5, -5.25); box(0.55, 0.04, 0.35, '#2a2f3a', x, 1.32, -5.2);
  }
  box(1.2, 0.04, 0.38, '#e3e6ea', 2.2, 1.32, -4.3); box(0.14, 0.04, 0.22, '#e3e6ea', 3.1, 1.32, -4.3);
  blob(CYL, '#f2c230', 0.75, 1.45, -4.35, 0.11, 0.28, 0.11); box(0.03, 0.2, 0.03, '#e8364f', 0.78, 1.65, -4.35); // un verre de citronnade
  const glow = new THREE.PointLight(0x9ec8ff, dark ? 0.9 : 0, 6); glow.position.set(2.2, 2.2, -3.9); scene.add(glow);

  // chaise de bureau (dossier vers nous)
  box(0.95, 0.06, 0.12, '#2f3542', 2.2, 0.08, -3.4); box(0.12, 0.06, 0.95, '#2f3542', 2.2, 0.08, -3.4);
  box(0.09, 0.6, 0.09, '#2f3542', 2.2, 0.4, -3.4);
  box(0.85, 0.12, 0.8, '#2f3542', 2.2, 0.76, -3.4);
  box(0.85, 0.95, 0.12, '#2f3542', 2.2, 1.3, -2.98);

  // ---- table de réunion, avec la maquette de l'île du stand qui flotte au-dessus ----
  const T = [-2.8, 2.2];
  blob(CYL, '#a07c5d', T[0], 1.0, T[1], 1.0, 0.08, 1.0); box(0.12, 0.95, 0.12, '#3a3f4a', T[0], 0.5, T[1]); blob(CYL, '#3a3f4a', T[0], 0.03, T[1], 0.45, 0.05, 0.45);
  for (const [dx, dz] of [[-1.35, 0], [0, 1.35]]) blob(CYL, '#3d6b8c', T[0] + dx, 0.32, T[1] + dz, 0.3, 0.64, 0.3);
  // la même île que le jeu (island.js), à l'échelle MS, dans son état de départ (game.js : 1 stand, 2 employés,
  // 4 places, citronnade seule) : le fondu vers le stand passe d'une image à la même image
  const MS = 0.11, MINI_Y = 1.04 + 0.2 + 7.9 * MS; // dessous de la roche à 0,2 au-dessus de la table
  const mini = add(new THREE.Group(), T[0], MINI_Y, T[1]); mini.scale.setScalar(MS);
  const miniIsland = buildIsland(mini, { add, box, blob });
  const DRESS0 = { stands: 1, colors: ['#f2c230'], staff: 2, seats: 4, gardens: [] };
  function dressMini(d) { // d = état de l'île (DRESS0, ou celui envoyé par le stand au retour)
    miniIsland.dress(d.stands, d.colors, d.staff, d.seats);
    for (const id in miniIsland.gardens) miniIsland.gardens[id].visible = d.gardens.includes(id);
    // le stand n'a pas d'ombres portées : la maquette non plus ; calque 1 = la maquette seule (voir render)
    mini.traverse(m => { m.castShadow = m.receiveShadow = false; m.layers.enable(1); });
  }
  let backDress = null;
  try { if (rootEl.classList.contains('back')) backDress = JSON.parse(sessionStorage.getItem('dz-dress')); sessionStorage.removeItem('dz-dress'); } catch (e) { /* état illisible */ }
  dressMini(backDress || DRESS0);
  if (dark) { miniIsland.lampMat.color.set('#ffe680'); miniIsland.stands.forEach(s => { s.light.intensity = 1.6; s.light.distance = 6 * MS; }); } // = nuit du stand
  hemi.layers.enable(1); sun.layers.enable(1);
  const miniShadow = new THREE.Mesh(new THREE.CircleGeometry(0.62, 20), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.13 }));
  miniShadow.rotation.x = -Math.PI / 2; miniShadow.position.set(T[0], 1.05, T[1]); scene.add(miniShadow);

  // ---- l'avatar (sprite en pixel art, toujours face à la caméra) ----
  const img = new Image();
  const tex = new THREE.Texture(img); tex.magFilter = tex.minFilter = THREE.NearestFilter;
  img.onload = () => { tex.needsUpdate = true; avatar.scale.set(AH * img.naturalWidth / img.naturalHeight, AH, 1); };
  img.src = window.AVATAR_URI || 'assets/avatar.png';
  const avatar = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, alphaTest: 0.5, color: dark ? '#b9c4e2' : '#ffffff' }));
  const AH = 3.3, FOOT = 0.03;
  avatar.center.set(0.5, 0); avatar.position.set(0.1, FOOT, -1.2); scene.add(avatar);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.16 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0.1, 0.04, -1.2); scene.add(shadow);

  // ---- caméra, cadrage, rotation limitée au glisser ----
  const BASE = Math.PI / 4;
  let off = 0, offT = 0, w = 1, h = 1;
  function resize() {
    w = canvas.clientWidth; h = canvas.clientHeight;
    renderer.setSize(Math.max(1, w), Math.max(1, h), false);
    const a = w / h; let v = 21; if (v * a < 21) v = 21 / a;
    // scène un peu basse : le titre respire, la pilule chevauche le bord du plancher
    cam.left = -v * a / 2; cam.right = v * a / 2; cam.top = v * 0.6; cam.bottom = -v * 0.4; cam.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();
  // survol de l'avatar : la bulle devient le bouton LinkedIn (petit délai pour aller de l'avatar au bouton)
  const say = document.getElementById('say'), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let overAvatar = false, overLink = false, hideT;
  const hits = e => { ndc.set(e.clientX / w * 2 - 1, -(e.clientY / h) * 2 + 1); ray.setFromCamera(ndc, cam); return ray.intersectObject(avatar).length > 0; };
  function setLink() {
    clearTimeout(hideT);
    canvas.style.cursor = overAvatar ? 'pointer' : '';
    if (overAvatar || overLink) say.classList.add('link'); else hideT = setTimeout(() => say.classList.remove('link'), 250);
  }
  say.addEventListener('pointerenter', () => { overLink = true; setLink(); });
  say.addEventListener('pointerleave', () => { overLink = false; setLink(); });

  let drag = null, moved = 0;
  canvas.addEventListener('pointerdown', e => { drag = e.clientX; moved = 0; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (drag !== null) { moved += Math.abs(e.clientX - drag); offT = Math.max(-0.5, Math.min(0.5, offT - (e.clientX - drag) * 0.005)); drag = e.clientX; }
    else if (!cvOn && e.pointerType === 'mouse' && hits(e) !== overAvatar) { overAvatar = !overAvatar; setLink(); }
  });
  // un clic (ou un tap) sur l'avatar ouvre le CV ; ailleurs dans la scène, il le referme
  canvas.addEventListener('pointerup', e => { drag = null; if (moved < 6) setCV(!cvOn && hits(e)); });
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && overAvatar) { overAvatar = false; setLink(); } });

  // ---- CV : zoom sur l'avatar + la pilule ENG/FR se déploie en panneau (index.html, .cv) ----
  // La caméra suit le même tempo que la transition CSS (0,6 s, ease-in-out) : les deux mouvements n'en font qu'un.
  const cv = document.getElementById('cv'), cvIn = cv.querySelector('.cv-in'), cvBtn = document.getElementById('cv-btn'), langEl = document.querySelector('.lang');
  const MORPH = reduce ? 0 : 600, ease = p => (p < 0.5 ? 4 * p * p * p : 1 - (2 - 2 * p) ** 3 / 2);
  let cvOn = false, cvK = 0, cvFrom = 0, cvT0 = 0, back = null;
  function setCV(on) {
    if (on === cvOn) return;
    cvOn = on; cvFrom = cvK; cvT0 = performance.now();
    if (on) {
      const r = langEl.getBoundingClientRect(); // le panneau part exactement de la pilule
      cv.style.setProperty('--pw', r.width + 'px'); cv.style.setProperty('--ph', r.height + 'px'); cv.style.setProperty('--pr', r.height / 2 + 'px');
      void cv.offsetWidth; // fige ce point de départ avant d'ajouter .open, sinon la transition part de l'ancienne taille
      overAvatar = false; setLink();
    }
    cv.classList.toggle('open', on); document.body.classList.toggle('cv-mode', on);
    // focus dans le panneau (flèches = défilement) ; à la fermeture, retour au bouton clavier seulement s'il a servi à ouvrir
    if (on) { back = document.activeElement === cvBtn ? cvBtn : null; cvIn.focus({ preventScroll: true }); }
    else if (cv.contains(document.activeElement)) back ? back.focus({ preventScroll: true }) : document.activeElement.blur();
  }
  cv.querySelector('.cv-x').onclick = () => setCV(false);
  cvBtn.onclick = () => setCV(true);
  addEventListener('keydown', e => { if (e.key === 'Escape') setCV(false); });

  // « Comment ça marche »
  const howBtn = document.getElementById('how-btn'), how = document.getElementById('how');
  howBtn.onclick = () => { how.hidden = !how.hidden; howBtn.setAttribute('aria-expanded', !how.hidden); };

  // bascule ENG / FR : traduit l'accueil sur place et mémorise le choix pour le stand (lu par i18n.js)
  const langBtns = document.querySelectorAll('.lang button');
  const setLang = lang => {
    langBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang));
    translateDOM(lang);
    try { localStorage.setItem('dz-lang', lang); } catch (e) { /* stockage bloqué : le stand restera en anglais */ }
  };
  langBtns.forEach(b => (b.onclick = () => setLang(b.dataset.lang)));
  langBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === LANG));
  // Zoom (k de 0 à 1) sur un point P : P glisse de sa place vers le pixel (fx, fy) pendant que le zoom monte jusqu'à z1.
  // On vise donc un point tel que P tombe à la position voulue à l'écran, avec la même direction de caméra.
  const T0 = new THREE.Vector3(0, 1.0, -0.6), camOff = new THREE.Vector3(), A = new THREE.Vector3(), P = new THREE.Vector3(), R = new THREE.Vector3(), U = new THREE.Vector3();
  function aim(k, fx, fy, z1) {
    cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    const n0 = A.copy(P).project(cam), x0 = n0.x, y0 = n0.y;
    const z = z1 ** k, nx = x0 + ((fx / w) * 2 - 1 - x0) * k, ny = y0 + (1 - (fy / h) * 2 - y0) * k;
    R.setFromMatrixColumn(cam.matrixWorld, 0); U.setFromMatrixColumn(cam.matrixWorld, 1);
    A.copy(P)
      .addScaledVector(R, -((cam.right + cam.left) / 2 + nx * (cam.right - cam.left) / (2 * z)))
      .addScaledVector(U, -((cam.top + cam.bottom) / 2 + ny * (cam.top - cam.bottom) / (2 * z)));
    cam.zoom = z; cam.position.copy(A).add(camOff); cam.lookAt(A);
  }
  // CV : l'avatar va au centre de la zone libre (à gauche du panneau, ou dessous sur téléphone) et en occupe 78 % de la hauteur
  function aimAtAvatar(k) {
    const r = cvIn.getBoundingClientRect(), side = r.left > w * 0.3; // taille finale du panneau, même en cours d'animation
    const fx = side ? r.left / 2 : w / 2, fy = side ? h / 2 : (r.bottom + h) / 2, fh = side ? h : Math.max(80, h - r.bottom);
    P.set(avatar.position.x, FOOT + AH / 2, avatar.position.z);
    aim(k, fx, fy, (0.78 * fh / h) * (cam.top - cam.bottom) / AH);
  }

  // ---- « Ouvrir le stand » : la caméra plonge dans la maquette du stand. La dernière image (maquette de face, comptoir =
  // 42 % de la hauteur d'écran) est passée à jeu.html, qui s'ouvre sur elle, cadrée pareil sur le vrai stand, puis la
  // dissout en dézoomant : un fondu enchaîné d'un stand à l'autre, sans écran intermédiaire.
  const go = document.querySelector('.go'), GO = reduce ? 0 : 850;
  let goT0 = -1, goK = 0, left = false;
  // retour du stand (html.back, posé dans index.html) : on part de son image, au même cadrage sur la maquette, et on dézoome
  const BACK = 1050;
  let backF = rootEl.classList.contains('back') ? 0 : -1, backT0 = -1;
  if (backF >= 0) goK = 1;
  go.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; // nouvel onglet : navigation normale
    e.preventDefault();
    if (goT0 >= 0 || backF >= 0) return;
    setCV(false);
    goT0 = performance.now(); document.body.classList.add('leaving');
  });
  function leave() {
    left = true;
    // ponytail: JPEG en sessionStorage (~150 ko) ; si le stockage refuse, le stand s'ouvre directement sur la vue normale
    try { sessionStorage.setItem('dz-intro', canvas.toDataURL('image/jpeg', 0.85)); } catch (err) { /* pas de fondu */ }
    location.href = go.href;
  }
  // En fin de plongée, la pièce se fond dans le ciel du stand (scene.js, MODES) et la maquette reste nette par-dessus :
  // scène complète, voile couleur ciel, puis la maquette seule (calque 1). À goK = 1, l'image est celle du départ du stand.
  const skyScene = new THREE.Scene(), skyCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const skyMat = new THREE.MeshBasicMaterial({ color: dark ? '#26304f' : '#a7dccf', transparent: true, depthTest: false });
  skyScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMat)).children[0].position.z = -0.5;
  const standH = () => (w <= 900 ? Math.min(h, Math.max(0.62 * h, 380)) : h); // jeu.html ≤ 900 px : canvas en haut, max(62vh, 380px) de haut
  function render() {
    const a = Math.min(1, Math.max(0, (goK - 0.5) / 0.45));
    if (!a) { renderer.render(scene, cam); return; }
    renderer.autoClear = false; renderer.clear();
    renderer.render(scene, cam);
    skyMat.opacity = a * a * (3 - 2 * a); renderer.render(skyScene, skyCam);
    renderer.clearDepth(); cam.layers.set(1);
    const sh = standH(); renderer.setScissor(0, h - sh, w, sh); renderer.setScissorTest(true); // maquette limitée au canvas du stand
    const bg = scene.background; scene.background = null; renderer.render(scene, cam); scene.background = bg;
    renderer.setScissorTest(false); cam.layers.set(0); renderer.autoClear = true;
  }
  // en fin de plongée, l'éclairage rejoint celui du stand (scene.js, MODES jour / nuit) : mêmes teintes sur la même île
  const L0 = { hemi: hemi.intensity, ground: hemi.groundColor.clone(), sun: sun.intensity, sunC: sun.color.clone(), pos: sun.position.clone() };
  const L1 = { hemi: dark ? 0.22 : 0.62, ground: new THREE.Color(0x9a8070), sun: dark ? 0.22 : 0.8, sunC: new THREE.Color(dark ? 0x8fa6ff : 0xffffff), pos: new THREE.Vector3(7, 12, 3) };
  function matchLights(k) {
    hemi.intensity = L0.hemi + (L1.hemi - L0.hemi) * k; hemi.groundColor.lerpColors(L0.ground, L1.ground, k);
    sun.intensity = L0.sun + (L1.sun - L0.sun) * k; sun.color.lerpColors(L0.sunC, L1.sunC, k); sun.position.lerpVectors(L0.pos, L1.pos, k);
  }
  // retour arrière (page restaurée depuis le cache) : on revient au bureau
  addEventListener('pageshow', e => { if (e.persisted) { goT0 = -1; goK = 0; left = false; matchLights(0); document.body.classList.remove('leaving'); } });

  // bulle de dialogue au-dessus de la tête de l'avatar
  const head = new THREE.Vector3();
  let time = 0, last = performance.now(), nextScreen = 0;
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, now - last) / 1000); last = now; time += dt;
    off += (offT - off) * Math.min(1, dt * 5);
    // ease-in-out quadratique : arrivée sur le stand moins étirée qu'en cubique, le dézoom de scene.js enchaîne aussitôt
    if (goT0 >= 0) { const p = GO ? Math.min(1, (now - goT0) / GO) : 1; goK = p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) ** 2; }
    if (backF >= 0) {
      if (++backF === 2) { backT0 = now; rootEl.style.setProperty('--veil', 0); } // 1re image affichée, identique : on retire celle du stand
      const p = backT0 < 0 ? 0 : Math.min(1, (now - backT0) / BACK);
      goK = (1 - p) ** 3; // 1 − ease-out : le dézoom part tout de suite, comme celui du stand
      if (p > 0.45 && rootEl.classList.contains('back')) { rootEl.classList.remove('back'); rootEl.style.removeProperty('--from'); } // interface
      if (p >= 1) { backF = -1; if (backDress) dressMini(DRESS0); } // maquette remise à l'état de départ du stand, pour le prochain aller
    }
    // en partant, la caméra rejoint l'angle et la hauteur de celle du stand (scene.js), maquette de face
    const ang = BASE + (off + (reduce ? 0 : Math.sin(time * 0.25) * 0.06)) * (1 - goK);
    camOff.set(Math.sin(ang) * 30, 19 + 5.1 * goK, Math.cos(ang) * 30 + 0.6 * (1 - goK));
    cam.zoom = 1; cam.position.copy(T0).add(camOff); cam.lookAt(T0);
    cvK = cvFrom + ((cvOn ? 1 : 0) - cvFrom) * ease(MORPH ? Math.min(1, (now - cvT0) / MORPH) : 1);
    if (cvK > 0.0005) aimAtAvatar(cvK);
    if (goK > 0.0005) { // centre du stand de la maquette ; comptoir (2,8 × MS) = 42 % de la hauteur du canvas du stand, comme au départ de scene.js
      const sh = standH();
      mini.updateMatrixWorld(); mini.localToWorld(P.set(0, 1.47, -3.4));
      aim(goK, w / 2, sh / 2, 0.42 * (sh / h) * (cam.top - cam.bottom) / (2.8 * MS));
    }
    matchLights(goK);
    cam.updateProjectionMatrix();
    if (!reduce) {
      avatar.position.y = FOOT + Math.abs(Math.sin(time * 1.6)) * 0.04;
      mini.rotation.y = Math.sin(time * 0.6) * 0.25 * (1 - goK);
      mini.position.y = MINI_Y + Math.sin(time * 0.7) * 0.12 * MS; // même flottement que l'île du jeu
      if (time > nextScreen) { drawScreens(time); nextScreen = time + 0.25; }
    }
    render();
    if (goT0 >= 0 && goK === 1 && !left) leave(); // juste après le rendu : le canvas contient l'image finale
    if (window.glass && cvK > 0) window.glass.markChanged(canvas); // la scène bouge : le verre du CV se met à jour
    head.set(avatar.position.x, avatar.position.y + AH + 0.35, avatar.position.z).project(cam);
    say.style.transform = `translate(${((head.x + 1) / 2) * w}px, ${((1 - head.y) / 2) * h}px) translate(-50%, calc(-100% - 12px))`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
