// SaaSsy — L'île Tech Loft Open Space (Three.js en pixel art)
// Sol en béton ciré, baie de serveurs GPU, postes commerciaux (AEs) modulaires, gong de vente, passerelle d'accès.

function buildSaaSIsland(world, { add, box, blob }) {
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  const CYL = new THREE.CylinderGeometry(1, 1, 1, 8);
  const SPH = new THREE.IcosahedronGeometry(1, 1);

  // ---- 1. Plateforme de l'île (Loft tech flottant) ----
  // Dalles en béton ciré et sol géométrique (12 x 12 unités)
  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 12; j++) {
      const x = i - 5.5, z = j - 5.5;
      const isWalkway = (Math.abs(x) < 1.2 && z > -1.5) || (z > 4.5 && Math.abs(x) < 2.0);
      const isLounge = x < -2.2 && z > 1.2 && z < 4.8;
      const isServerZone = x < -3.2 && z < -3.2;

      let tileColor;
      if (isServerZone) {
        tileColor = (i + j) % 2 ? '#0f172a' : '#1e293b'; // zone serveurs sombre
      } else if (isWalkway) {
        tileColor = (i + j) % 2 ? '#cbd5e1' : '#94a3b8'; // allée principale
      } else if (isLounge) {
        tileColor = '#1e293b'; // moquette foncée lounge
      } else {
        tileColor = (i + j) % 2 ? '#e2e8f0' : '#f1f5f9'; // béton ciré clair
      }
      box(1, 0.5, 1, tileColor, x, -0.25, z, world);
    }
  }

  // Sous-sol technologique géométrique (socle en graphite biseauté)
  box(12, 1.2, 12, '#334155', 0, -1.1, 0, world);
  box(11.2, 1.0, 11.2, '#1e293b', 0, -2.2, 0, world);
  box(9.2, 1.2, 9.2, '#0f172a', 0.2, -3.3, -0.1, world);
  box(6.8, 1.4, 6.8, '#020617', -0.1, -4.6, 0.2, world);
  box(3.5, 1.2, 3.5, '#020617', 0, -5.9, 0, world);

  // Garde-corps en verre teinté cyan avec main courante néon
  const glassMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.35 });
  const neonMat = new THREE.MeshBasicMaterial({ color: '#06b6d4' });

  // Barrières bord droit, fond et gauche
  const railR = add(new THREE.Mesh(BOX, glassMat), 5.9, 0.45, 0, world); railR.scale.set(0.1, 0.8, 11.6);
  box(0.14, 0.08, 11.8, '#0ea5e9', 5.9, 0.88, 0, world);

  const railBack = add(new THREE.Mesh(BOX, glassMat), 0, 0.45, -5.9, world); railBack.scale.set(11.6, 0.8, 0.1);
  box(11.8, 0.08, 0.14, '#0ea5e9', 0, 0.88, -5.9, world);

  const railL = add(new THREE.Mesh(BOX, glassMat), -5.9, 0.45, -1.5, world); railL.scale.set(0.1, 0.8, 8.6);
  box(0.14, 0.08, 8.8, '#0ea5e9', -5.9, 0.88, -1.5, world);

  // Passerelle en verre d'où arrivent les prospects
  box(2.2, 0.2, 4.0, '#38bdf8', 0, -0.1, 7.5, world);
  box(0.1, 0.6, 4.0, '#0284c7', -1.1, 0.3, 7.5, world);
  box(0.1, 0.6, 4.0, '#0284c7', 1.1, 0.3, 7.5, world);

  // Enseigne lumineuse "SaaSsy AI" au coin
  const signGroup = add(new THREE.Group(), 4.8, 0, -4.8, world);
  box(0.2, 2.8, 0.2, '#1e293b', 0, 1.4, 0, signGroup);
  box(1.8, 0.8, 0.15, '#0f172a', -0.6, 2.4, 0, signGroup);
  const neonLogo = box(1.6, 0.6, 0.2, '#06b6d4', -0.6, 2.4, 0, signGroup);
  neonLogo.material = new THREE.MeshBasicMaterial({ color: '#38bdf8' });

  // ---- 2. Baie de Serveurs Cloud GPU (Inférence IA) ----
  const serverRack = add(new THREE.Group(), -4.4, 0, -4.4, world);
  box(1.8, 2.6, 1.2, '#090d16', 0, 1.3, 0, serverRack);
  // Cadre vitré
  box(1.84, 2.64, 0.08, '#38bdf8', 0, 1.3, 0.62, serverRack);
  // Étagères de serveurs 1U/2U
  const ledMats = [
    new THREE.MeshBasicMaterial({ color: '#06b6d4' }), // cyan
    new THREE.MeshBasicMaterial({ color: '#10b981' }), // vert
    new THREE.MeshBasicMaterial({ color: '#6366f1' }), // indigo
  ];
  const leds = [];
  for (let level = 0; level < 7; level++) {
    const y = 0.35 + level * 0.32;
    box(1.5, 0.22, 1.0, '#1e293b', 0, y, 0.05, serverRack);
    // LEDs de statut sur la face avant
    for (let d = 0; d < 5; d++) {
      const dot = box(0.08, 0.06, 0.04, '#06b6d4', -0.55 + d * 0.28, y, 0.58, serverRack);
      dot.material = ledMats[d % ledMats.length];
      leds.push(dot);
    }
  }

  // Lumière néon douce projetée par les serveurs
  const serverLight = add(new THREE.PointLight(0x06b6d4, 1.8, 5), 0, 1.8, 0.8, serverRack);

  // ---- 3. Le Gong des Ventes (Sales Gong) ----
  const gongGroup = add(new THREE.Group(), 2.2, 0, -2.4, world);
  // Cadre métal noir
  box(0.12, 1.8, 0.12, '#0f172a', -0.7, 0.9, 0, gongGroup);
  box(0.12, 1.8, 0.12, '#0f172a', 0.7, 0.9, 0, gongGroup);
  box(1.52, 0.12, 0.12, '#0f172a', 0, 1.74, 0, gongGroup);
  // Disque de gong doré
  const gongDisc = blob(CYL, '#f59e0b', 0, 1.1, 0, 0.55, 0.06, 0.55, gongGroup);
  gongDisc.rotation.x = Math.PI / 2;
  // Maillet
  box(0.06, 0.6, 0.06, '#78350f', 0.82, 1.1, 0.1, gongGroup);
  box(0.18, 0.14, 0.14, '#b45309', 0.82, 1.4, 0.1, gongGroup);
  // Anneau de flash visuel du gong
  const gongWave = add(new THREE.Mesh(new THREE.RingGeometry(0.6, 0.8, 16), new THREE.MeshBasicMaterial({ color: '#fcd34d', transparent: true, opacity: 0, side: THREE.DoubleSide })), 0, 1.1, 0.1, gongGroup);

  // ---- 4. Personnages Pixel Art (Tech Workers & AEs) ----
  const HAIR = ['#1e1b4b', '#451a03', '#713f12', '#0f172a', '#b45309'];
  function person(shirtColor, hairColor, hasHeadset = false) {
    const g = new THREE.Group();
    // Pantalon sombre
    box(0.3, 0.4, 0.22, '#1e293b', 0, 0.2, 0, g);
    // Veste / T-shirt
    box(0.36, 0.46, 0.26, shirtColor, 0, 0.62, 0, g);
    // Tête
    box(0.28, 0.28, 0.28, '#fcd34d', 0, 1.0, 0, g);
    // Cheveux
    box(0.3, 0.1, 0.3, hairColor, 0, 1.16, 0, g);
    // Casque audio commercial (headset avec micro)
    if (hasHeadset) {
      box(0.34, 0.06, 0.08, '#06b6d4', 0, 1.18, 0, g);
      box(0.06, 0.14, 0.12, '#06b6d4', -0.16, 1.05, 0, g);
      box(0.06, 0.14, 0.12, '#06b6d4', 0.16, 1.05, 0, g);
      box(0.14, 0.04, 0.04, '#38bdf8', 0.08, 0.96, 0.14, g); // micro
    }
    return g;
  }

  // ---- 5. Postes Commerciaux (Sales Workstations) ----
  // Disposition ergonomique en îlots modernes de 2 bureaux dos-à-dos
  const DESK_SLOTS = [
    { x: -1.8, z: -1.2, face: 0 },
    { x: 1.8,  z: -1.2, face: 0 },
    { x: -1.8, z: 0.8,  face: Math.PI },
    { x: 1.8,  z: 0.8,  face: Math.PI },
    { x: -1.8, z: 2.8,  face: 0 },
    { x: 1.8,  z: 2.8,  face: 0 },
  ];

  const desksGroup = add(new THREE.Group(), 0, 0, 0, world);
  const deskUnits = [];

  DESK_SLOTS.forEach((slot, i) => {
    const dGroup = add(new THREE.Group(), slot.x, 0, slot.z, desksGroup);
    // Bureau épuré : plateau frêne clair, pieds métalliques noirs
    box(1.5, 0.08, 0.9, '#f8fafc', 0, 0.72, 0, dGroup);
    box(0.08, 0.7, 0.08, '#0f172a', -0.68, 0.35, -0.38, dGroup);
    box(0.08, 0.7, 0.08, '#0f172a', 0.68,  0.35, -0.38, dGroup);
    box(0.08, 0.7, 0.08, '#0f172a', -0.68, 0.35, 0.38,  dGroup);
    box(0.08, 0.7, 0.08, '#0f172a', 0.68,  0.35, 0.38,  dGroup);

    // Ordinateur portable avec écran lumineux
    const laptopGroup = add(new THREE.Group(), 0, 0.76, 0, dGroup);
    box(0.5, 0.02, 0.35, '#94a3b8', 0, 0.01, 0, laptopGroup); // base
    const screen = box(0.48, 0.35, 0.02, '#38bdf8', 0, 0.22, -0.16, laptopGroup); // écran
    screen.material = new THREE.MeshBasicMaterial({ color: '#38bdf8' });

    // Chaise de bureau ergonomique
    const chairGroup = add(new THREE.Group(), 0, 0, 0.65 * (slot.face === 0 ? 1 : -1), dGroup);
    box(0.45, 0.08, 0.45, '#1e293b', 0, 0.45, 0, chairGroup);
    box(0.45, 0.5, 0.08, '#0f172a', 0, 0.72, 0.2 * (slot.face === 0 ? 1 : -1), chairGroup);
    box(0.08, 0.42, 0.08, '#0f172a', 0, 0.21, 0, chairGroup);

    // Mug de café tech & plante succulente
    blob(CYL, '#38bdf8', 0.5, 0.82, -0.15, 0.06, 0.12, 0.06, dGroup);
    blob(CYL, '#f59e0b', -0.5, 0.8, -0.15, 0.08, 0.12, 0.08, dGroup); // pot
    blob(SPH, '#10b981', -0.5, 0.9, -0.15, 0.09, 0.09, 0.09, dGroup); // plante

    // Le commercial assis
    const rep = person(i % 2 ? '#2563eb' : '#0284c7', HAIR[i % HAIR.length], true);
    rep.position.set(0, 0.05, 0.55 * (slot.face === 0 ? 1 : -1));
    rep.rotation.y = slot.face;
    dGroup.add(rep);

    deskUnits.push({ group: dGroup, rep, screen, slot });
  });

  // ---- 6. Espace Démo Lounge (où s'assoit le prospect pour la démo) ----
  const loungeGroup = add(new THREE.Group(), -3.2, 0, 2.8, world);
  // Canapé minimaliste tech
  box(2.2, 0.35, 0.8, '#1e293b', 0, 0.22, 0, loungeGroup);
  box(2.2, 0.55, 0.2, '#0f172a', 0, 0.6, -0.32, loungeGroup);
  // Table basse en verre
  box(1.2, 0.04, 0.6, '#38bdf8', 0, 0.3, 0.7, loungeGroup);
  box(0.06, 0.28, 0.06, '#0f172a', -0.5, 0.15, 0.5, loungeGroup);
  box(0.06, 0.28, 0.06, '#0f172a', 0.5, 0.15, 0.5, loungeGroup);
  box(0.06, 0.28, 0.06, '#0f172a', -0.5, 0.15, 0.9, loungeGroup);
  box(0.06, 0.28, 0.06, '#0f172a', 0.5, 0.15, 0.9, loungeGroup);

  // ---- 7. Fonction d'habillage dynamique ----
  function dress(salesReps, tokenUsageM) {
    // 1. Activer le nombre de bureaux selon le nombre de commerciaux (1 à 6)
    const activeDesks = Math.max(1, Math.min(6, salesReps));
    deskUnits.forEach((d, i) => {
      d.group.visible = i < activeDesks;
    });

    // 2. Activité des serveurs GPU selon le volume de tokens
    const intensity = Math.min(3.0, 0.8 + (tokenUsageM / 50) * 2.2);
    serverLight.intensity = intensity;
  }

  return {
    world,
    dress,
    deskUnits,
    serverRack,
    serverLight,
    leds,
    gongGroup,
    gongWave,
    person,
    HAIR
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildSaaSIsland };
}
