// Daily Zest — l'île flottante (sol, roche, arbres, jardins, stands, équipe, places), partagée par le stand (scene.js)
// et par sa maquette sur la table du bureau (landing.js) : la même île des deux côtés, d'où le fondu enchaîné invisible.
// h = les aides de construction de la page : add(mesh, x, y, z, parent), box(w, h, d, couleur, x, y, z, parent), blob(geo, …).
function buildIsland(world, { add, box, blob }) {
  const BOX = new THREE.BoxGeometry(1, 1, 1), ICO = new THREE.IcosahedronGeometry(1, 0), SPH = new THREE.IcosahedronGeometry(1, 1);
  const CONE = new THREE.ConeGeometry(1, 1, 6), CYL = new THREE.CylinderGeometry(1, 1, 1, 8);

  // ---- île : dalles d'herbe et de sable, puis la roche qui pend en dessous ----
  for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) {
    const x = i - 5.5, z = j - 5.5;
    const path = (Math.abs(x) < 1 && z > -1) || (z > -2.6 && z < 0 && Math.abs(x) < 5.6);
    const c = path ? ((i + j) % 2 ? '#b08850' : '#a67f4a') : ((i * 7 + j * 3) % 5 === 0 ? '#a0d277' : (i + j) % 2 ? '#8cc56b' : '#84bd63');
    box(1, 0.6, 1, c, x, -0.3, z, world);
  }
  box(12, 1.3, 12, '#e0a174', 0, -1.25, 0, world);
  box(11.4, 1.2, 11.4, '#c98559', 0, -2.5, 0, world);
  box(9.4, 1.2, 9.8, '#b07052', 0.3, -3.7, -0.2, world);
  box(7, 1.2, 6.4, '#985d47', -0.4, -4.9, 0.4, world);
  box(4, 1.2, 3.6, '#7f4d3c', 0.2, -6.1, 0, world);
  box(1.6, 1.2, 1.6, '#6b3f33', 0, -7.3, 0.2, world);
  [[4.3, 3.6, 2.2], [-3.8, -3.6, 1.8], [3.6, -3.9, 1.4], [-4.2, 3.2, 1.2]].forEach(([x, z, h]) => box(1, h, 1, '#a46849', x, -3.2 - h / 2, z, world));
  // un pilier rose et un drapeau citron, clin d'œil à Monument Valley
  box(0.9, 2.4, 0.9, '#f0b3ad', -5.1, 1.2, 5.1, world); box(1.1, 0.25, 1.1, '#e2b97a', -5.1, 2.5, 5.1, world);
  box(0.08, 1.2, 0.08, '#7a4e32', -5.1, 3.2, 5.1, world); box(0.06, 0.45, 0.7, '#f2c230', -5.1, 3.55, 5.45, world);

  // ---- arbres ----
  function lemonTree(x, z, s) {
    const g = add(new THREE.Group(), x, 0, z, world);
    box(0.28, 1.1 * s, 0.28, '#8a5a3a', 0, 0.55 * s, 0, g);
    blob(ICO, '#5d9c4d', 0, 1.5 * s, 0, 0.85 * s, null, null, g);
    blob(ICO, '#71b35b', 0.25 * s, 1.95 * s, 0.1, 0.55 * s, null, null, g);
    for (let i = 0; i < 7; i++) { const a = i * 2.4, r = 0.78 * s; blob(SPH, '#f7d43a', Math.cos(a) * r, (1.25 + (i * 37 % 5) / 9) * s, Math.sin(a) * r, 0.14, 0.12, 0.12, g); }
  }
  function pine(x, z, s) {
    const g = add(new THREE.Group(), x, 0, z, world);
    box(0.25, 0.6, 0.25, '#7a4e32', 0, 0.3, 0, g);
    [[1.0, 0.75], [1.6, 0.56], [2.2, 0.36]].forEach(([y, r]) => blob(CONE, '#3f7f5a', 0, y * s, 0, r * s, 0.9 * s, r * s, g));
  }
  [-4.6, -1.7, 1.7, 4.6].forEach((x, i) => lemonTree(x, -5.05, i % 2 ? 0.75 : 0.85));
  pine(5.1, 5.0, 1.1); pine(5.2, -0.6, 0.9); pine(-5.2, -0.4, 0.8);

  // ---- jardins des produits (apparaissent quand on les ajoute à la carte) ----
  const gardens = {};
  const garden = (id, x, z) => (gardens[id] = add(new THREE.Group(), x, 0, z, world));
  { const g = garden('fraise', 2.7, 1.7);
    box(1.7, 0.3, 1.2, '#8a5a3a', 0, 0.15, 0, g);
    [[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.3], [0.45, 0.3]].forEach(([x, z]) => {
      blob(ICO, '#4f9a4a', x, 0.45, z, 0.3, 0.22, 0.3, g);
      box(0.1, 0.1, 0.1, '#e8364f', x + 0.12, 0.5, z + 0.2, g); box(0.1, 0.1, 0.1, '#e8364f', x - 0.15, 0.45, z + 0.12, g);
    }); }
  { const g = garden('the', 4.6, 1.7);
    [-0.35, 0.35].forEach(z => { box(1.4, 0.4, 0.42, '#78b85a', 0, 0.2, z, g); box(1.3, 0.12, 0.3, '#93cf6d', 0, 0.45, z, g); }); }
  { const g = garden('cafe', 2.7, 3.7);
    [[-0.4, 0], [0.4, 0.1]].forEach(([x, z]) => { box(0.12, 0.5, 0.12, '#6b4532', x, 0.25, z, g); blob(ICO, '#2f6b45', x, 0.75, z, 0.42, null, null, g);
      box(0.1, 0.1, 0.1, '#b33a2a', x + 0.3, 0.7, z + 0.15, g); box(0.1, 0.1, 0.1, '#b33a2a', x - 0.2, 0.85, z + 0.3, g); });
    box(0.5, 0.55, 0.4, '#c9a46c', 0.1, 0.28, 0.7, g); }
  { const g = garden('cookie', 4.6, 3.7);
    box(1.1, 0.8, 0.9, '#d4c5b5', 0, 0.4, 0, g); blob(SPH, '#c8b6a4', 0, 0.85, 0, 0.5, 0.35, 0.45, g);
    const door = box(0.5, 0.3, 0.05, '#ff9d3a', 0, 0.35, 0.46, g); door.material = new THREE.MeshBasicMaterial({ color: '#ff9d3a' });
    box(0.15, 0.5, 0.15, '#9b8a7a', 0.3, 1.2, -0.2, g); }

  // ---- stands ----
  const SLOTS = [[0, -3.4], [-3.7, -3.4], [3.7, -3.4]];
  const lampMat = new THREE.MeshBasicMaterial({ color: '#fff3b0' });
  function makeStand(x, z) {
    const g = add(new THREE.Group(), x, 0, z, world);
    box(2.6, 0.95, 0.9, '#c8874f', 0, 0.475, 0.35, g);
    for (let i = 0; i < 5; i++) box(0.04, 0.9, 0.02, '#a86d3d', -1.04 + i * 0.52, 0.45, 0.81, g);
    box(2.62, 0.26, 0.04, '#f2c230', 0, 0.62, 0.83, g);
    box(2.8, 0.12, 1.1, '#d4a46c', 0, 1.0, 0.35, g);
    box(2.6, 1.6, 0.4, '#a8683e', 0, 0.8, -0.65, g);
    box(2.4, 0.08, 0.3, '#d4a46c', 0, 1.3, -0.4, g);
    [[-1.25, 0.75], [1.25, 0.75], [-1.25, -0.7], [1.25, -0.7]].forEach(([qx, qz]) => box(0.12, 2.5, 0.12, '#7a4e32', qx, 1.25, qz, g));
    const aw = add(new THREE.Group(), 0, 2.55, 0.05, g); aw.rotation.x = 0.22;
    for (let i = 0; i < 6; i++) {
      const c = i % 2 ? '#e2685a' : '#f2c230';
      box(0.48, 0.1, 1.9, c, -1.2 + i * 0.48, 0, 0, aw); box(0.48, 0.24, 0.06, c, -1.2 + i * 0.48, -0.15, 0.95, aw);
    }
    box(1.5, 0.5, 0.1, '#8d6a4f', 0, 3.05, -0.62, g); blob(SPH, '#f2c230', 0, 3.05, -0.55, 0.2, 0.16, 0.08, g);
    const lamp = new THREE.Mesh(BOX, lampMat); lamp.scale.setScalar(0.18); add(lamp, 0, 2.2, 0.72, g);
    const light = add(new THREE.PointLight(0xffd27a, 0, 6), 0, 2.0, 1.4, g);
    const jars = add(new THREE.Group(), 0, 0, 0, g), staff = add(new THREE.Group(), 0, 0, 0, g);
    return { g, x, z, jars, staff, light, queue: [], serveT: 0, nextArr: Math.random() };
  }
  const stands = SLOTS.map(([x, z]) => makeStand(x, z));

  // ---- personnages ----
  const HAIR = ['#3b2a20', '#6b4423', '#d9b45a', '#1f1f28', '#a0522d'];
  function person(shirt, hair, apron) {
    const g = new THREE.Group();
    box(0.3, 0.4, 0.2, '#3c4a6e', 0, 0.2, 0, g);
    box(0.36, 0.45, 0.24, shirt, 0, 0.62, 0, g);
    if (apron) box(0.3, 0.38, 0.03, '#f2c230', 0, 0.58, 0.13, g);
    box(0.28, 0.28, 0.28, '#f1c9a1', 0, 1.0, 0, g);
    box(0.3, 0.1, 0.3, hair, 0, 1.17, 0, g);
    return g;
  }

  // ---- habillage selon le modèle : stands visibles, bocaux des produits, équipe, places assises (jusqu'à 4 tables) ----
  const TABLES = [[-2.3, 1.7], [-4.3, 1.7], [-2.3, 3.7], [-4.3, 3.7]];
  const seatGroup = add(new THREE.Group(), 0, 0, 0, world);
  function dress(nStands, colors, nStaff, totalSeats) {
    stands.forEach((s, i) => {
      s.g.visible = i < nStands;
      s.jars.clear(); s.staff.clear();
      colors.forEach((c, j) => {
        const x = (j - (colors.length - 1) / 2) * 0.5;
        blob(CYL, c, x, 1.28, 0.45, 0.15, 0.42, 0.15, s.jars);
        box(0.24, 0.07, 0.24, '#fff6e0', x, 1.52, 0.45, s.jars);
      });
      for (let k = 0; k < nStaff; k++) add(person('#ffffff', HAIR[(k + i) % HAIR.length], true), nStaff === 1 ? 0 : -0.9 + k * 1.8 / (nStaff - 1), 0, -0.05, s.staff);
    });
    seatGroup.clear();
    const seats = [];
    for (let t = 0; t < Math.min(4, Math.ceil(totalSeats / 4)); t++) {
      const [tx, tz] = TABLES[t];
      blob(CYL, '#c8874f', tx, 0.55, tz, 0.42, 0.08, 0.42, seatGroup); box(0.1, 0.5, 0.1, '#7a4e32', tx, 0.27, tz, seatGroup);
      [[0.65, 0], [-0.65, 0], [0, 0.65], [0, -0.65]].slice(0, Math.min(4, totalSeats - t * 4)).forEach(([dx, dz]) => {
        blob(CYL, '#e86a5c', tx + dx, 0.18, tz + dz, 0.17, 0.36, 0.17, seatGroup);
        seats.push({ x: tx + dx, z: tz + dz, face: Math.atan2(-dx, -dz), taken: false });
      });
    }
    return seats;
  }

  return { gardens, stands, lampMat, person, HAIR, dress };
}
