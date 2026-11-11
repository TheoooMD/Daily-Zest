// Daily Zest — export Excel : dashboard, 3 états financiers, cash-flows, valorisation, KPIs, activité et hypothèses.
// Formules vivantes reliées par des noms (p_… = hypothèses, m_… = calculs, <produit>_… = carte) : on modifie une
// cellule bleue dans « Hypothèses », tout le classeur se recalcule. Chaque formule porte aussi sa valeur calculée
// par compute(S), pour que l'aperçu (Quick Look, mail) s'affiche avant tout recalcul.
(() => {
  const C = { ink: 'FF16302C', muted: 'FF5B7A74', lemon: 'FFF2C230', lemonL: 'FFFDF3CF', mint: 'FFE6F5EF', mintD: 'FFCFE8DE',
    white: 'FFFFFFFF', input: 'FF1F4E9C', inputBg: 'FFFFF8DC', line: 'FFD5E3DD', pos: 'FF1D7457', neg: 'FFC0473A', xl: 'FF107C41',
    coral: 'FFE2685A', posL: 'FFDDF1E7', negL: 'FFF9E1DD' }; // corail = rayures du store du stand
  const argb = hex => 'FF' + hex.slice(1).toUpperCase(); // '#f2c230' → 'FFF2C230'
  // le citron en pixel art du site (favicon réduit à 48 px), embarqué : en file:// la page ne peut pas relire assets/
  const LOGO = 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAMAAABg3Am1AAAAYFBMVEX74WAAAAH2xS358t356Zr1oC/PuE2up1C/vz9kUjL//wB6dW/0fz/cukePYiz/////vz/RnD0AAFVFPSa9qlP/qlX//3+/fz8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACIGB70AAAAGHRSTlP+AP7//vynBAQjAQcF62IBBLgGIZADAgQ0f2aYAAACH0lEQVR42n2WCXLDIAxFZRB11u7L/W9atEvUKTNtbPhP+hImDmx1nGAdiyDfX5/mwHXMuc8HwEYB+zqWLH79EuLkx2deFuBV1xBYjzj/+L9M0eSpAHdEC50AvWMM7wUAlasG3ZJez3AQwA6QnXN47HYpC0TArgCweZObqTBkBCcB9zNjsm0mkFOEORQTAlzcEKqAtOEmlXEhwBra0yKlaNmQiuYWCiAFIua6IW55DSuAFsbb6QlikgFpmNqcRrxhvarlGq3D3rmOoOk7hkmLsQDyoDVDY28iRQUazTTQBB3/AxBqhdLD/KT3B5aWJmHsHSagL+0wAPk0lC41K7DuKth2z3Kaly9AgzhkRT8/mnUNfKeHAVWfTxuUCifQ4I8hpdOZsloHA0FIXOTatEVo2UVPAG2V9MsTiHHo9bHA+9AMEIeUo8qcwHlDR5MMUkaHslNmD9PpGZRhG9xakMez18cTYZGPjQEuRLewtHIG8MkRQBNf9pwu55hPxVylAhg4n5uOwy9vNkmrJD9f+XuptYzYwxVHaET8bQGCsjPVRMzyZsDJtaMdDiMSIJWrV7qjgCy0QBnYtg+3o4Lh+YZ8sn6P98PbQvwxRePtml5ZqYIU3idI/768RT27KoqvY6A2xhs0lFzf0z9Ham0Xfx682EOc3HllDwAxkXpj4O0A2Pevve6UEmM8n49+a+gI6dDb5wc/TmRcEkBb9X27XWL1F+fpER/5vtqzAAAAAElFTkSuQmCC';
  const IMG = {};   // images du classeur en cours : logo, île, stores (par largeur)
  const ANCH = {};    // emplacements des graphiques : { sheet, c0, r0, c1, r1 } (cellules, base 0), par nom
  const CHARTS = [];  // { at: nom dans ANCH, xml } : ajoutés au fichier après ExcelJS, qui ne sait pas écrire de graphiques
  const SLIDERS = []; // curseurs du Simulateur (contrôles de formulaire), ajoutés au fichier de la même façon
  // euro après le nombre en français, devant en anglais ; e0 = montant entier simple
  const F = { eur: t('#,##0 "€";-#,##0 "€";"–"', '"$"#,##0;-"$"#,##0;"–"'), cost: t('(#,##0 "€");#,##0 "€";"–"', '("$"#,##0);"$"#,##0;"–"'), sgn: t('#,##0 "€";(#,##0 "€");"–"', '"$"#,##0;("$"#,##0);"–"'), eur2: t('#,##0.00 "€"', '"$"#,##0.00'), e0: t('#,##0 "€"', '"$"#,##0'),
    pct: '0.0%', pct0: '0%', x1: '0.0"×"', x2: '0.00', int: '#,##0', h: '0 "h"', j: t('0 "j"', '0 "d"'), ans: t('0 "ans"', '0 "yrs"'), txt: '@', d1: '#,##0.0' };
  const FONT = 'Calibri';
  let CA0 = 0; // CA du scénario exporté, pour les valeurs en cache des colonnes « % du CA »
  const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
  const fin = v => (typeof v === 'number' && isFinite(v) ? v : undefined);
  const YES = t('Oui', 'Yes'), NO = t('Non', 'No');
  const on = id => `(${id}_on="${YES}")`; // produit à la carte, en 1/0 dans les calculs

  // valeur ou formule (les noms de fonctions restent en anglais dans le fichier, Excel les traduit à l'affichage)
  function put(cell, f, v) {
    if (typeof f === 'string' && f[0] === '=') cell.value = { formula: f.slice(1), result: typeof v === 'string' ? v : fin(v) };
    else cell.value = f;
  }

  function sheet(wb, name, title, sub, tab, widths) {
    const ws = wb.addWorksheet(name, { views: [{ showGridLines: false, zoomScale: 110 }], properties: { tabColor: { argb: tab } },
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    ws.columns = widths.map(width => ({ width }));
    // en-tête de marque : le store rayé du stand sur toute la largeur, le citron devant le titre
    const w = widths.reduce((a, x) => a + Math.trunc(x * 7 + 5), 0); // largeur en pixels écran
    ws.getRow(1).height = 20.25; ws.getRow(2).height = 42;
    ws.addImage(IMG.aw[w] ??= IMG.wb.addImage({ base64: awning(w), extension: 'png' }), { tl: { col: 0, row: 0 }, br: { col: widths.length, row: 1 } });
    ws.addImage(IMG.logo, { tl: { col: 1, row: 1.08 }, ext: { width: 48, height: 48 } });
    const h = ws.getCell('B2'); h.value = title; h.font = { name: FONT, size: 20, bold: true, color: { argb: C.ink } }; h.alignment = { vertical: 'middle', indent: 7 };
    const s = ws.getCell('B3'); s.value = sub; s.font = { name: FONT, size: 10, italic: true, color: { argb: C.muted } };
    if (name !== 'Dashboard') { const b = ws.getCell('B4'); b.value = { text: '← Dashboard', hyperlink: "#'Dashboard'!A1" }; b.font = { name: FONT, size: 10, underline: true, color: { argb: C.input } }; }
    ws.r = 5;
    return ws;
  }
  // le store du stand : rayures jaune / corail festonnées, en gros pixels (dessiné en 2× pour les écrans Retina)
  function awning(w) {
    const cv = document.createElement('canvas'); cv.width = Math.ceil(w / 3); cv.height = 9;
    const g = cv.getContext('2d');
    for (let x = 0; x < cv.width; x++) { g.fillStyle = Math.floor(x / 8) % 2 ? '#e2685a' : '#f2c230'; g.fillRect(x, 0, 1, 9 - [2, 1, 0, 0, 0, 0, 1, 2][x % 8]); }
    return pixels(cv, cv.width * 6, 54);
  }
  const pixels = (src, w, h) => { // agrandit sans lissage, rend le PNG en base64
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, w, h);
    return cv.toDataURL('image/png').split(',')[1];
  };
  // bandeau de section sur nCols colonnes à partir de B
  function section(ws, text, heads = [], nCols = 5) {
    const row = ws.getRow(ws.r);
    for (let i = 0; i < nCols; i++) {
      const c = row.getCell(2 + i);
      c.value = i === 0 ? text : heads[i - 1] || null;
      c.fill = fill(C.ink); c.font = { name: FONT, size: 11, bold: true, color: { argb: C.white } };
      c.alignment = { vertical: 'middle', horizontal: i === 0 || /^(Formule|Explication|Note)$/.test(c.value) ? 'left' : 'right' };
    }
    row.height = 20; ws.r++;
  }
  const gap = ws => { ws.r++; };
  const small = (ws, text) => { const c = ws.getRow(ws.r++).getCell(2); c.value = text; c.font = { name: FONT, size: 9.5, italic: true, color: { argb: C.muted } }; };

  // une ligne : libellé | valeur | (% du CA) | formule | explication
  function line(ws, o) {
    const row = ws.getRow(ws.r++);
    const lab = row.getCell(2), val = row.getCell(3);
    lab.value = o.label; put(val, o.f, o.v);
    val.numFmt = F[o.fmt || 'eur']; val.alignment = { horizontal: 'right' };
    if (o.name) val.name = o.name;
    if (o.fxMerge) ws.mergeCells(row.number, o.fxCol, row.number, o.fxCol + o.fxMerge - 1);
    if (o.pctOf) { const p = row.getCell(4); put(p, `=IF(m_CA=0,0,${val.address}/m_CA)`, CA0 ? o.v / CA0 : 0); p.numFmt = F.pct; p.alignment = { horizontal: 'right' }; p.font = { name: FONT, size: 10, color: { argb: C.muted } }; }
    if (o.fx) { const c = row.getCell(o.fxCol || 5); c.value = o.fx; c.font = { name: 'Consolas', size: 9.5, color: { argb: C.ink } }; }
    if (o.note) { const c = row.getCell(o.noteCol || 6); c.value = o.note; c.font = { name: FONT, size: 10, italic: true, color: { argb: C.muted } }; c.alignment = { wrapText: o.wrap !== false, vertical: 'top' }; }
    const base = { name: FONT, size: 11, color: { argb: C.ink } };
    lab.font = val.font = base;
    if (o.kind === 'sub') {
      lab.font = val.font = { ...base, bold: true };
      for (let i = 2; i <= (o.span || 4); i++) { row.getCell(i).fill = fill(C.mint); row.getCell(i).border = { top: { style: 'thin', color: { argb: C.mintD } } }; }
    } else if (o.kind === 'key') {
      lab.font = val.font = { ...base, bold: true, size: 12 };
      for (let i = 2; i <= (o.span || 4); i++) { row.getCell(i).fill = fill(C.lemonL); row.getCell(i).border = { top: { style: 'thin', color: { argb: C.lemon } }, bottom: { style: 'thin', color: { argb: C.lemon } } }; }
    } else if (o.kind === 'pct') {
      lab.font = val.font = { ...base, italic: true, size: 10, color: { argb: C.muted } };
      lab.alignment = { indent: 2 };
    } else lab.alignment = { indent: 1 };
    return val;
  }

  // ---------- aides du Simulateur : formats des curseurs, surlignage des valeurs modifiées, cellules à saisir ----------
  const isPct = f => f === 'pct' || f === 'pct1';
  const xlv = (k, v) => (isPct(PARAMS[k].fmt) ? v / 100 : v);
  const xlFmt = f => ({ pct: F.pct0, pct1: F.pct, eur: F.e0, eur2: F.eur2, int: F.int, h: F.h, j: F.j, ans: F.ans, x1: F.x1, x2: F.x2 })[f];
  const changed = (cell, def) => ({ ref: cell.address, rules: [{ type: 'expression', priority: 1, formulae: [`${cell.address}<>${def}`],
    style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: C.lemon } }, font: { bold: true } } }] });
  const asInput = c => { c.font = { name: FONT, size: 11, bold: true, color: { argb: C.input } }; c.fill = fill(C.inputBg); c.border = { bottom: { style: 'hair', color: { argb: C.input } } }; };
  const labelCell = (c, text) => { c.value = text; c.font = { name: FONT, size: 11, color: { argb: C.ink } }; c.alignment = { indent: 1 }; };

  const pos = (v, P) => Math.round((v - P.min) / P.step); // cran du curseur pour une valeur

  // ---------- Simulateur : les curseurs du site (barres de défilement Excel) et, figés en haut, leurs impacts en direct ----------
  // Chaque curseur écrit son cran (entier) dans la cellule qu'il recouvre ; la valeur à côté = min + cran × pas, et porte le nom p_….
  function hypotheses(wb, S, R) {
    const ws = sheet(wb, SH.hyp, SH.hyp, t('Les curseurs du site : glisse-les, les indicateurs figés en haut, la cascade et tout le classeur se recalculent.', 'The site\'s sliders: drag them, the frozen indicators at the top, the waterfall and the whole workbook recalculate.'), C.input, [2, 34, 26, 14, 14, 30, 2, 10, 10, 10, 10, 10, 10]);
    const hint = ws.getCell('C4'); hint.value = t('▲▼ = écart avec le scénario exporté · surligné en jaune = différent du site par défaut', '▲▼ = change vs the exported scenario · highlighted in yellow = different from the site default');
    hint.font = { name: FONT, size: 9.5, italic: true, color: { argb: C.muted } };

    // indicateurs du tableau du stand, avec l'écart au scénario exporté (vert = mieux, rouge = moins bien)
    const delta = (f, x0, pct, inv) => {
      const up = inv ? '[Red]' : '[Color10]', dn = inv ? '[Color10]' : '[Red]';
      const fmt = pct ? `${up}"▲ "0.0" pt";${dn}"▼ "0.0" pt";"= export"` : t(`${up}"▲ "#,##0" €";${dn}"▼ "#,##0" €";"= export"`, `${up}"▲ $"#,##0;${dn}"▼ $"#,##0;"= export"`);
      // arrondi : le recalcul d'Excel diffère de la valeur exportée d'un poil, qui s'afficherait « ▲ 0 € »
      return isFinite(x0) ? [`=IFERROR(ROUND((${f}-${x0})${pct ? '*100,1' : ',0'}),"–")`, 0, fmt] : ['–', '–', '@'];
    };
    const kpi = (label, f, v, fmt, pct, inv) => [label, '=' + f, v, fmt, ...delta(f, v, pct, inv)];
    const MB = 'IF(m_CA=0,0,m_MB/m_CA)';
    ws.r = 6;
    for (const list of [
      [kpi(t('Chiffre d\'affaires', 'Revenue'), 'm_CA', R.CA, F.eur), kpi(t('Marge brute', 'Gross margin'), MB, R.MBpct, F.pct, 1), kpi('EBITDA', 'm_EBITDA', R.EBITDA, F.eur), kpi(t('Résultat net', 'Net income'), 'm_RN', R.RN, F.eur)],
      [kpi('FCFF', 'm_FCFF', R.FCFF, F.eur), kpi(t('Valeur d\'entreprise', 'Enterprise value'), 'm_EV', R.EV, F.eur), kpi('ROIC', 'm_ROIC', R.ROIC, F.pct, 1), kpi(t('VAN du projet', 'Project NPV'), 'm_NPV', R.NPV, F.sgn)],
    ]) {
      const r0 = ws.r;
      tiles(ws, list, [2, 3, 4, 6]);
      for (let i = 0; i < 3; i++) ws.mergeCells(r0 + i, 4, r0 + i, 5);
      ws.getRow(r0).height = 16; ws.getRow(r0 + 1).height = 28; ws.getRow(r0 + 2).height = 14; ws.getRow(r0 + 3).height = 6;
    }
    verdict(ws, ws.r, 6, R);
    const frozen = ws.r + 1;
    ws.getRow(frozen).height = 8;
    ANCH.sim = { sheet: SH.hyp, c0: 7, r0: 4, c1: 13, r1: frozen - 1 }; // la cascade, à droite des indicateurs
    ws.views = [{ state: 'frozen', ySplit: frozen, topLeftCell: `A${frozen + 1}`, showGridLines: false, zoomScale: 100 }];
    ws.r = frozen + 2;

    const slider = (k, label, name) => {
      const P = PARAMS[k], r = ws.r++, row = ws.getRow(r), n = Math.round((P.max - P.min) / P.step);
      row.height = 18; labelCell(row.getCell(2), label);
      const c = row.getCell(3); c.value = pos(S[k], P); c.font = { name: FONT, size: 8, color: { argb: C.white } }; // caché sous le curseur
      SLIDERS.push({ row: r - 1, link: `$C$${r}`, val: pos(S[k], P), max: n, page: Math.max(1, Math.round(n / 10)) });
      const v = row.getCell(4); put(v, `=ROUND((${P.min}+C${r}*${P.step})${isPct(P.fmt) ? '/100' : ''},8)`, xlv(k, S[k]));
      v.numFmt = xlFmt(P.fmt); v.name = name; v.alignment = { horizontal: 'right', vertical: 'middle' }; v.font = { name: FONT, size: 11, bold: true, color: { argb: C.ink } };
      const d = row.getCell(5); d.value = xlv(k, P.def); d.numFmt = xlFmt(P.fmt); d.alignment = { horizontal: 'right', vertical: 'middle' }; d.font = { name: FONT, size: 10, color: { argb: C.muted } };
      ws.addConditionalFormatting(changed(v, d.address));
      if (P.hint) { const h = row.getCell(6); h.value = P.hint; h.font = { name: FONT, size: 9.5, italic: true, color: { argb: C.muted } }; h.alignment = { vertical: 'middle' }; }
      row.getCell(2).alignment = { indent: 1, vertical: 'middle' };
      return d;
    };
    const HEAD = [t('Curseur', 'Slider'), t('Valeur', 'Value'), t('Défaut', 'Default'), 'Note'];
    for (const [sec, list] of SECTIONS) {
      section(ws, sec, HEAD, 5);
      if (list === 'PRODUCTS') {
        for (const p of PRODUCTS) {
          const row = ws.getRow(ws.r++);
          row.getCell(1).fill = fill(argb(p.color)); labelCell(row.getCell(2), p.name); row.getCell(2).font = { name: FONT, size: 11, bold: true, color: { argb: C.ink } };
          const lab = row.getCell(3); lab.value = t('À la carte ▸', 'On the menu ▸'); lab.alignment = { horizontal: 'right' }; lab.font = { name: FONT, size: 10, color: { argb: C.muted } };
          const on = row.getCell(4); on.value = S[p.id + '_on'] ? YES : NO; on.name = `${p.id}_on`; asInput(on); on.alignment = { horizontal: 'right' };
          on.dataValidation = { type: 'list', allowBlank: false, formulae: [`"${YES},${NO}"`], showErrorMessage: true, error: t('Choisis Oui ou Non', 'Choose Yes or No') };
          ws.addConditionalFormatting(changed(on, `"${p.id === 'citron' ? YES : NO}"`));
          const cx = row.getCell(5); cx.value = p.capex; cx.numFmt = F.e0; cx.name = `${p.id}_capex`; cx.alignment = { horizontal: 'right' }; cx.font = { name: FONT, size: 10, color: { argb: C.muted } };
          const nt = row.getCell(6); nt.value = t('capex de l\'équipement / stand', 'equipment capex / stand'); nt.font = { name: FONT, size: 9.5, italic: true, color: { argb: C.muted } };
          slider(p.id + '_price', PARAMS[p.id + '_price'].label, `${p.id}_prix`).name = `${p.id}_ref`; // défaut = prix de référence (élasticité)
          slider(p.id + '_cost', PARAMS[p.id + '_cost'].label, `${p.id}_cout`);
          slider(p.id + '_w', PARAMS[p.id + '_w'].label, `${p.id}_pop`);
        }
        small(ws, t('À la carte : Oui / Non dans la liste déroulante. Le défaut du prix est le prix de référence, celui où la demande de référence est observée (élasticité).', 'On the menu: Yes / No in the drop-down list. The price default is the reference price, at which the reference demand is observed (elasticity).'));
      } else for (const [k, label] of list) slider(k, label, 'p_' + k);
      gap(ws);
    }
    // Structure de financement au jour 0 : le surplus de dette reste en cash non rémunéré; m_netDebt = dette brute − cash0.
    section(ws, t('Financement d\'ouverture', 'Opening financing'), ['', t('Valeur', 'Value'), '', 'Note'], 5);
    const row = ws.getRow(ws.r++);
    labelCell(row.getCell(2), t('Trésorerie d\'ouverture', 'Opening cash'));
    // cash0 = max(0, dette − capital à financer), capital à financer = capex initial + BFR d'ouverture
    const cash0F = '=MAX(0,p_debt-(m_capexInit+m_BFR/(1+p_growth)))';
    const c = row.getCell(4); put(c, cash0F, R.cash0); c.numFmt = F.e0; c.name = 'p_cash0'; c.alignment = { horizontal: 'right' };
    c.font = { name: FONT, size: 11, color: { argb: C.ink } };
    row.getCell(6).value = t('Calculée : surplus de dette au-delà du capital à financer (capex + BFR d\'ouverture). Cette trésorerie n\'est pas rémunérée.', 'Calculated: debt surplus over opening capital required (capex + opening WC). This cash earns no interest; interest is on gross debt.'); row.getCell(6).font = { name: FONT, size: 9.5, italic: true, color: { argb: C.muted } };
    const netRow = ws.getRow(ws.r++); labelCell(netRow.getCell(2), t('Dette nette d\'ouverture', 'Opening net debt'));
    const netCell = netRow.getCell(4); put(netCell, '=p_debt-p_cash0', R.netDebt); netCell.numFmt = F.e0; netCell.alignment = { horizontal: 'right' }; netCell.name = 'm_netDebt'; netCell.font = { name: FONT, size: 11, bold: true, color: { argb: C.ink } };
    netRow.getCell(6).value = t('Dette brute − trésorerie excédentaire. Sert au D/V, à Hamada et au passage VE → fonds propres.', 'Gross debt − excess cash. Used for D/V, Hamada and the EV → equity bridge.'); netRow.getCell(6).font = { name: FONT, size: 9.5, italic: true, color: { argb: C.muted } };
    // haut de chaque curseur en points, pour la VML (Excel Mac s'en sert pour savoir où l'on clique)
    let y = 0;
    for (let r = 1, i = 0; i < SLIDERS.length; r++) { if (SLIDERS[i].row === r - 1) SLIDERS[i++].top = y + 3; y += ws.getRow(r).height || 15; }
  }

  // verdict sur une ligne fusionnée B:<c1> : vert si le ROIC bat le WACC, rouge sinon (mise en forme conditionnelle)
  function verdict(ws, r, c1, R) {
    ws.mergeCells(r, 2, r, c1);
    const v = ws.getCell(r, 2);
    const P = t(' %', '%'), n1 = x => (Math.round(x * 1000) / 10).toLocaleString(t('fr-FR', 'en-US'));
    put(v, `="${t('Verdict : ', 'Verdict: ')}"&m_verdict&IFERROR("  ·  ROIC "&ROUND(m_ROIC*100,1)&"${P}  vs  WACC "&ROUND(m_WACC*100,1)&"${P}","")`,
      t('Verdict : ', 'Verdict: ') + verdictOf(R) + (isFinite(R.ROIC) && isFinite(R.WACC) ? `  ·  ROIC ${n1(R.ROIC)}${P}  vs  WACC ${n1(R.WACC)}${P}` : ''));
    v.font = { name: FONT, size: 12, bold: true, color: { argb: C.ink } }; v.alignment = { vertical: 'middle', indent: 1 }; ws.getRow(r).height = 24;
    const tone = (ok, bg, fg, priority) => ({ type: 'expression', priority, formulae: [ok], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: bg } }, font: { bold: true, color: { argb: fg } } } });
    ws.addConditionalFormatting({ ref: `${ws.getCell(r, 2).address}:${ws.getCell(r, c1).address}`, rules: [tone('IFERROR(m_ROIC>m_WACC,FALSE)', C.posL, C.pos, 1), tone('NOT(IFERROR(m_ROIC>m_WACC,FALSE))', C.negL, C.neg, 2)] });
    ws.r = r + 1;
  }

  // ---------- Activité : du passant à l'article vendu ----------
  function activite(wb, S, R) {
    const ws = sheet(wb, SH.act, SH.act, t('Du passant au chiffre d\'affaires : trafic, demande par produit, capacité de service.', 'From passer-by to revenue: traffic, demand by product, serving capacity.'), C.lemon, [2, 40, 14, 14, 14, 16, 16, 16, 14, 14]);
    const ids = PRODUCTS.map(p => p.id);
    const sumWf = ids.map(id => `${on(id)}*${id}_pop`).join('+');
    const sumW = PRODUCTS.reduce((a, p) => a + (S[p.id + '_on'] ? S[p.id + '_w'] : 0), 0) || 1;
    section(ws, t('Trafic', 'Traffic'), [t('Valeur', 'Value')], 2);
    line(ws, { label: t('Produits à la carte', 'Products on the menu'), f: '=' + ids.map(on).join('+'), v: R.n, fmt: 'int', name: 'm_n' });
    line(ws, { label: t('Somme des popularités (produits actifs)', 'Sum of popularity (active products)'), f: `=IF(${sumWf}=0,1,${sumWf})`, v: sumW, fmt: 'x1', name: 'm_sumW' });
    line(ws, { label: t('Heures d\'ouverture / an (par stand)', 'Opening hours / year (per stand)'), f: '=p_days*p_hours', v: R.hoursYr, fmt: 'int', name: 'm_hoursYr' });
    line(ws, { label: t('Clients / heure / stand', 'Customers / hour / stand'), f: '=p_passants*p_conv*(1+p_gamme*MAX(0,m_n-1))', v: R.clientsH, fmt: 'd1', name: 'm_clientsH' });
    gap(ws);

    section(ws, t('Demande par produit', 'Demand by product'), [t('Part du mix', 'Mix share'), t('Effet prix', 'Price effect'), t('Demande / h', 'Demand / h'), t('Articles / an', 'Items / year'), t('CA', 'Revenue'), t('Coût matière', 'Ingredient cost'), t('Prix plafond', 'Ceiling price'), t('Prix optimal', 'Best price')], 9);
    const first = ws.r;
    let mix = 0;
    for (const p of PRODUCTS) {
      const l = R.lines.find(x => x.p.id === p.id), active = !!S[p.id + '_on'], r = ws.r;
      const share = active ? S[p.id + '_w'] / sumW : 0, df = demandFactor(p.price, S[p.id + '_price'], S.elast);
      mix += share * df;
      const row = ws.getRow(ws.r++);
      labelCell(row.getCell(2), p.name); row.getCell(1).fill = fill(argb(p.color));
      if (!active) row.getCell(2).font = { name: FONT, size: 11, italic: true, color: { argb: C.muted } };
      const set = (col, f, v, fmt, name) => { const c = row.getCell(col); put(c, f, v); c.numFmt = fmt; c.font = { name: FONT, size: 11, color: { argb: active ? C.ink : C.muted } }; if (name) c.name = name; };
      set(3, `=IF(${on(p.id)},${p.id}_pop/m_sumW,0)`, share, F.pct);
      set(4, `=MAX(0,1-p_elast*(${p.id}_prix-${p.id}_ref)/${p.id}_ref)`, df, '0.00"×"');
      set(5, `=m_clientsH*p_items*C${r}*D${r}`, l ? l.dH : 0, '#,##0.0');
      set(6, `=E${r}*m_k`, l ? l.units : 0, F.int, `${p.id}_units`);
      set(7, `=F${r}*${p.id}_prix`, l ? l.CA : 0, F.eur, `${p.id}_CA`);
      set(8, `=F${r}*(${p.id}_cout+p_cup)`, l ? l.units * (l.cost + S.cup) : 0, F.eur);
      // plafond : la demande s'annule ; optimum de (prix × (1 − frais CB) − coût unitaire) × demande linéaire
      const choke = chokePrice(p.price, S.elast), unit = (S[p.id + '_cost'] + S.cup) * (1 + S.waste / 100) / (1 - S.card / 100);
      set(9, `=${p.id}_ref*(1+1/p_elast)`, choke, F.eur2);
      set(10, `=(I${r}+(${p.id}_cout+p_cup)*(1+p_waste)/(1-p_card))/2`, (choke + unit) / 2, F.eur2, `${p.id}_opt`);
    }
    const last = ws.r - 1, row = ws.getRow(ws.r++);
    ws.addConditionalFormatting({ ref: `G${first}:G${last}`, rules: [{ type: 'dataBar', priority: 1, gradient: false, color: { argb: C.lemon }, cfvo: [{ type: 'num', value: 0 }, { type: 'max' }] }] });
    row.getCell(2).value = 'Total';
    const tot = (col, f, v, fmt, name) => { const c = row.getCell(col); put(c, f, v); c.numFmt = fmt; if (name) c.name = name; };
    tot(3, `=SUMPRODUCT(C${first}:C${last},D${first}:D${last})`, mix, '0.00"×"', 'm_mix');
    tot(5, `=SUM(E${first}:E${last})`, R.demandH, '#,##0.0', 'm_demandH');
    tot(6, `=SUM(F${first}:F${last})`, R.units, F.int, 'm_units');
    tot(7, `=SUM(G${first}:G${last})`, R.CA, F.eur, 'm_CA');
    tot(8, `=SUM(H${first}:H${last})`, R.matter, F.eur, 'm_matter');
    for (let i = 2; i <= 8; i++) { const c = row.getCell(i); c.font = { name: FONT, size: 11, bold: true, color: { argb: C.ink } }; c.fill = fill(C.mint); c.border = { top: { style: 'thin', color: { argb: C.mintD } } }; }
    small(ws, t('Total « Part du mix » = facteur de mix (Σ part × effet prix), utilisé pour compter les clients.', '“Mix share” total = mix factor (Σ share × price effect), used to count customers.'));
    small(ws, t('Effet prix = 1 − élasticité × (prix − prix réf.) ÷ prix réf., jamais négatif. Prix plafond = prix réf. × (1 + 1/élasticité) : au-delà, plus personne n\'achète.',
      'Price effect = 1 − elasticity × (price − ref. price) ÷ ref. price, never negative. Ceiling price = ref. price × (1 + 1/elasticity): above it, nobody buys.'));
    small(ws, t('Prix optimal = (plafond + coût unitaire chargé ÷ (1 − frais CB)) ÷ 2 : le prix qui maximise l\'EBITDA tant que la file n\'est pas saturée.',
      'Best price = (ceiling + loaded unit cost ÷ (1 − card fees)) ÷ 2: the price that maximizes EBITDA as long as the queue is not saturated.'));
    gap(ws);

    section(ws, t('Capacité de service', 'Serving capacity'), [t('Valeur', 'Value')], 2);
    line(ws, { label: t('Capacité (articles / h / stand)', 'Capacity (items / h / stand)'), f: '=p_staff*p_prod', v: R.capH, fmt: 'int', name: 'm_capH' });
    line(ws, { label: t('Taux de service', 'Service rate'), f: '=IF(m_demandH>0,MIN(1,m_capH/m_demandH),1)', v: R.served, fmt: 'pct', name: 'm_served', note: t('Sous 100 % : la file déborde, des ventes sont perdues.', 'Below 100%: the queue overflows and sales are lost.'), noteCol: 4, wrap: false });
    line(ws, { label: t('Heures de vente effectives / an (tous stands)', 'Effective selling hours / year (all stands)'), f: '=m_hoursYr*p_stands*m_served', v: R.hoursYr * S.stands * R.served, fmt: 'int', name: 'm_k' });
    line(ws, { label: t('Clients servis / an', 'Customers served / year'), f: '=m_clientsH*m_mix*m_k', v: R.customers, fmt: 'int', name: 'm_customers', kind: 'sub', span: 3 });
    line(ws, { label: t('Articles perdus / an (file trop longue)', 'Items lost / year (queue too long)'), f: '=m_demandH*m_hoursYr*p_stands*(1-m_served)', v: R.lostUnits, fmt: 'int', name: 'm_lost' });
  }

  const fx = k => MET[k].fx, note = k => MET[k].note;
  const CREATES = t('Crée de la valeur (ROIC > WACC)', 'Creates value (ROIC > WACC)'), DESTROYS = t('Détruit de la valeur (ROIC < WACC)', 'Destroys value (ROIC < WACC)');
  // WACC non défini quand la VE ne couvre pas la dette (fonds propres ≤ 0) : un texte, pas une erreur #N/A
  const NOWACC = t('WACC non défini : la valeur ne couvre pas la dette', 'WACC undefined: value does not cover the debt');
  const CLOSE = t('Stand à fermer : il ne dégage pas de cash', 'Close the stand: it generates no cash');
  const verdictOf = R => (isFinite(R.EV) && R.EV === 0 ? CLOSE : !isFinite(R.ROIC) ? '–' : !isFinite(R.WACC) ? NOWACC : R.ROIC > R.WACC ? CREATES : DESTROYS);
  // noms d'onglets (aussi cibles des liens du sommaire)
  const SH = { pnl: t('Compte de résultat', 'Income statement'), bs: t('Bilan', 'Balance sheet'), cf: t('Flux de trésorerie', 'Cash flow statement'),
    fcf: t('Cash-flows', 'Cash flows'), val: t('Valorisation', 'Valuation'), kpi: 'KPIs', act: t('Activité', 'Operations'), hyp: t('Simulateur', 'Simulator'),
    gd: t('Données graphiques', 'Chart data') };

  // ---------- Compte de résultat ----------
  function pnl(wb, S, R) {
    const ws = sheet(wb, SH.pnl, SH.pnl, t('Année de croisière, en €. Charges entre parenthèses.', 'Steady-state year, in $. Costs in parentheses.'), C.ink, [2, 40, 16, 11, 60, 56]);
    const L = (label, f, v, name, o = {}) => line(ws, { label, f, v, name, fmt: o.cost ? 'cost' : 'eur', pctOf: true, ...o });
    section(ws, t('Marge brute', 'Gross margin'), [t('Montant', 'Amount'), t('% du CA', '% of revenue'), t('Formule', 'Formula'), t('Explication', 'Explanation')], 5);
    L(t('Chiffre d\'affaires', 'Revenue'), '=m_CA', R.CA, null, { kind: 'sub', fx: fx('CA'), note: note('CA') });
    L(t('Coût matière (gobelet et glace inclus)', 'Ingredient cost (cup and ice included)'), '=m_matter', R.matter, null, { cost: 1 });
    L(t('Gâchis', 'Wastage'), '=m_matter*p_waste', R.wasteCost, 'm_waste', { cost: 1, fx: fx('wasteCost') });
    L('COGS', '=m_matter+m_waste', R.COGS, 'm_COGS', { cost: 1, kind: 'sub', fx: fx('COGS'), note: note('COGS') });
    L(t('Marge brute', 'Gross margin'), '=m_CA-m_COGS', R.MB, 'm_MB', { kind: 'key', fx: fx('MB'), note: note('MB') });
    gap(ws);
    section(ws, t('Charges opérationnelles', 'Operating expenses'), [t('Montant', 'Amount'), t('% du CA', '% of revenue'), t('Formule', 'Formula'), t('Explication', 'Explanation')], 5);
    L(t('Salaires chargés', 'Loaded wages'), '=p_staff*p_stands*m_hoursYr*p_wage*(1+p_charges)', R.payroll, 'm_payroll', { cost: 1, fx: t('employés × stands × heures × salaire × (1 + charges)', 'employees × stands × hours × wage × (1 + payroll taxes)') });
    L(t('Coût du turnover', 'Turnover cost'), '=p_staff*p_stands*p_turn*p_recruit', R.turnCost, 'm_turnCost', { cost: 1, fx: fx('turnCost') });
    L(t('Loyers', 'Rent'), '=p_rent*12*p_stands', R.rent, 'm_rent', { cost: 1 });
    L('Marketing', '=p_mkt*12', R.mkt, 'm_mkt', { cost: 1 });
    L(t('Énergie, assurance…', 'Energy, insurance…'), '=p_other*12*p_stands', R.other, 'm_other', { cost: 1 });
    L(t('Frais carte bancaire', 'Card processing fees'), '=m_CA*p_card', R.cardFees, 'm_card', { cost: 1 });
    L(t('Total charges opérationnelles', 'Total operating expenses'), '=m_payroll+m_turnCost+m_rent+m_mkt+m_other+m_card', R.opex, 'm_opex', { cost: 1, kind: 'sub' });
    L('EBITDA', '=m_MB-m_opex', R.EBITDA, 'm_EBITDA', { kind: 'key', fx: fx('EBITDA'), note: note('EBITDA') });
    gap(ws);
    section(ws, t('Du résultat d\'exploitation au résultat net', 'From operating profit to net income'), [t('Montant', 'Amount'), t('% du CA', '% of revenue'), t('Formule', 'Formula'), t('Explication', 'Explanation')], 5);
    L(t('Dotations aux amortissements (D&A)', 'Depreciation & amortization (D&A)'), '=m_capexInit/p_life', R.DA, 'm_DA', { cost: 1, fx: t('D&A = capex initial ÷ durée d\'amortissement', 'D&A = initial capex ÷ depreciation period') });
    L(t('EBIT (résultat d\'exploitation)', 'EBIT (operating profit)'), '=m_EBITDA-m_DA', R.EBIT, 'm_EBIT', { kind: 'sub', fx: fx('EBIT'), note: note('EBIT') });
    L(t('Intérêts financiers', 'Interest expense'), '=p_debt*p_kd', R.interest, 'm_interest', { cost: 1, fx: t('Intérêts = dette × Kd', 'Interest = debt × Kd') });
    L(t('Résultat avant impôt', 'Pre-tax income'), '=m_EBIT-m_interest', R.EBT, 'm_EBT', { kind: 'sub' });
    L(t('IS sans dette (référence)', 'Tax without debt (reference)'), '=MAX(0,m_EBIT)*p_tax', Math.max(0, R.EBIT) * R.t, 'm_taxUnlevered', { kind: 'pct', pctOf: false, fx: t('Pour mémoire : IS de référence avant déduction des intérêts', 'Memo: reference tax before interest deduction') });
    L(t('Bouclier fiscal utilisable cette année', 'Tax shield usable this year'), '=m_taxUnlevered-MAX(0,m_EBT)*p_tax', R.taxShield, 'm_taxShield', { kind: 'pct', pctOf: false, fx: t('Pour mémoire : IS sans dette − IS réellement payé ; aucun report de pertes', 'Memo: tax without debt − tax actually paid; no loss carryforward') });
    L(t('Taux effectif du bouclier fiscal', 'Effective tax-shield rate'), '=IF(m_interest>0,m_taxShield/m_interest,0)', R.taxShieldRate, 'm_taxShieldRate', { kind: 'pct', pctOf: false, fmt: 'pct', fx: t('Pour mémoire : bouclier fiscal utilisable ÷ intérêts (utilisé dans le WACC)', 'Memo: usable tax shield ÷ interest (used in the WACC)') });
    L(t('Impôt sur les sociétés', 'Corporate income tax'), '=MAX(0,m_EBT)*p_tax', R.IS, 'm_IS', { cost: 1, fx: t('IS = t × résultat avant impôt (0 si perte)', 'Tax = t × pre-tax income (0 if loss)') });
    L(t('Résultat net', 'Net income'), '=m_EBT-m_IS', R.RN, 'm_RN', { kind: 'key', fx: fx('RN'), note: note('RN') });
  }

  // ---------- Bilan : ouverture et clôture de l'année, équilibré par construction ----------
  function bilan(wb, S, R) {
    const ws = sheet(wb, SH.bs, SH.bs, t('Ouverture et clôture de l\'année, en €. La ligne Contrôle vérifie que l\'actif égale le passif.', 'Opening and closing of the year, in $. The Check line verifies that assets equal liabilities.'), C.pos, [2, 40, 16, 16, 64]);
    const { v, ta, eq } = balanceSheet(S, R); // mêmes actifs et passifs que les états financiers du site (game.js)
    const row3 = (label, f0, v0, f1, v1, kind, txt) => {
      const row = ws.getRow(ws.r++);
      row.getCell(2).value = label;
      [[3, f0, v0], [4, f1, v1]].forEach(([col, f, val]) => { const c = row.getCell(col); put(c, f, val); c.numFmt = F.eur; c.alignment = { horizontal: 'right' }; });
      const base = { name: FONT, size: 11, color: { argb: C.ink } };
      for (let i = 2; i <= 4; i++) row.getCell(i).font = kind ? { ...base, bold: true, size: kind === 'key' ? 12 : 11 } : base;
      if (kind) for (let i = 2; i <= 4; i++) { row.getCell(i).fill = fill(kind === 'key' ? C.lemonL : C.mint); row.getCell(i).border = { top: { style: 'thin', color: { argb: kind === 'key' ? C.lemon : C.mintD } } }; }
      else row.getCell(2).alignment = { indent: 1 };
      if (txt) { const c = row.getCell(5); c.value = txt; c.font = { name: FONT, size: 10, italic: true, color: { argb: C.muted } }; }
      return row.number;
    };
    section(ws, t('Actif', 'Assets'), [t('Ouverture', 'Opening'), t('Clôture', 'Closing'), t('Explication', 'Explanation')], 4);
    const a1 = row3(t('Immobilisations nettes (stands, matériel)', 'Net fixed assets (stands, equipment)'), '=m_capexInit', v.immo[0], '=m_capexInit+m_capex-m_DA', v.immo[1], null, t('Clôture = ouverture + capex − D&A', 'Closing = opening + capex − D&A'));
    row3(t('Stocks', 'Inventory'), '=m_stock/(1+p_growth)', v.stock[0], '=m_stock', v.stock[1], null, t('Ouverture = clôture ÷ (1 + croissance) : même hypothèse que ΔBFR', 'Opening = closing ÷ (1 + growth): same assumption as ΔWC'));
    row3(t('Créances clients', 'Accounts receivable'), '=m_recv/(1+p_growth)', v.recv[0], '=m_recv', v.recv[1]);
    const a4 = row3(t('Trésorerie', 'Cash'), '=p_cash0', v.cash[0], '=MAX(0,p_cash0+m_dCash)', v.cash[1], null, t('Clôture = ouverture + variation du tableau des flux ; si le solde est négatif, il passe en découvert au passif', 'Closing = opening + change from the cash flow statement; a negative balance moves to overdraft under liabilities'));
    const ta_ = row3(t('Total actif', 'Total assets'), `=SUM(C${a1}:C${a4})`, ta[0], `=SUM(D${a1}:D${a4})`, ta[1], 'key');
    gap(ws);
    section(ws, t('Passif', 'Liabilities & equity'), [t('Ouverture', 'Opening'), t('Clôture', 'Closing'), t('Explication', 'Explanation')], 4);
    const p2 = ws.r + 1, p3 = ws.r + 2, p4 = ws.r + 3;
    const p1 = row3(t('Capitaux propres', 'Equity'), `=ROUND(C${ta_}-C${p2}-C${p3}-C${p4},6)`, eq[0], `=C${ws.r}+m_RN`, eq[1], null, t('Ouverture = apport des associés ; clôture = ouverture + résultat net (pas de dividende)', 'Opening = shareholders\' contribution; closing = opening + net income (no dividend)'));
    row3(t('Dette financière', 'Financial debt'), '=p_debt', v.debt[0], '=p_debt-MIN(p_repay,p_debt)', v.debt[1], null, t('Clôture = dette − remboursement net (plafonné à la dette)', 'Closing = debt − net repayment (capped at the debt)'));
    row3(t('Découvert bancaire', 'Bank overdraft'), 0, 0, '=MAX(0,-(p_cash0+m_dCash))', v.over[1], null, t('Trésorerie de clôture négative : c\'est une dette envers la banque, pas un actif', 'Negative closing cash: a debt to the bank, not an asset'));
    row3(t('Dettes fournisseurs', 'Accounts payable'), '=m_pay/(1+p_growth)', v.pay[0], '=m_pay', v.pay[1]);
    const tp = row3(t('Total passif', 'Total liabilities & equity'), `=SUM(C${p1}:C${p4})`, ta[0], `=SUM(D${p1}:D${p4})`, ta[1], 'key');
    gap(ws);
    const ck = ws.getRow(ws.r++), BAL = t('✓ équilibré', '✓ balanced');
    ck.getCell(2).value = t('Contrôle : actif − passif', 'Check: assets − liabilities'); ck.getCell(2).font = { name: FONT, size: 10, italic: true, color: { argb: C.muted } };
    [3, 4].forEach(col => { const L = col === 3 ? 'C' : 'D', c = ck.getCell(col); put(c, `=IF(ROUND(${L}${ta_}-${L}${tp},2)=0,"${BAL}","${t('Écart : ', 'Difference: $')}"&ROUND(${L}${ta_}-${L}${tp},2)&"${t(' €', '')}")`, BAL); c.alignment = { horizontal: 'right' }; c.font = { name: FONT, size: 10, bold: true, color: { argb: C.pos } }; });
  }

  // ---------- Tableau des flux de trésorerie ----------
  function flux(wb, S, R) {
    const ws = sheet(wb, SH.cf, t('Tableau des flux de trésorerie', 'Cash flow statement'), t('Méthode indirecte, en €. Sorties de cash entre parenthèses.', 'Indirect method, in $. Cash outflows in parentheses.'), C.lemon, [2, 44, 16, 4, 60]);
    const L = (label, f, v, name, o = {}) => line(ws, { label, f, v, name, fmt: 'sgn', ...o, fx: undefined, note: o.fx, noteCol: 5, span: 3 });
    section(ws, t('Exploitation', 'Operating activities'), [t('Montant', 'Amount'), '', t('Explication', 'Explanation')], 4);
    L(t('Résultat net', 'Net income'), '=m_RN', R.RN);
    L(t('+ Dotations aux amortissements (non décaissées)', '+ Depreciation & amortization (non-cash)'), '=m_DA', R.DA);
    L(t('− Variation du BFR', '− Change in working capital'), '=-m_dBFR', -R.dBFR, null, { fx: t('Voir l\'onglet Cash-flows', 'See the Cash flows sheet') });
    L(t('Flux de trésorerie d\'exploitation (CFO)', 'Cash flow from operations (CFO)'), '=m_RN+m_DA-m_dBFR', R.CFO, 'm_CFO', { kind: 'sub' });
    gap(ws);
    section(ws, t('Investissement', 'Investment'), [t('Montant', 'Amount'), '', t('Explication', 'Explanation')], 4);
    L(t('Capex de renouvellement', 'Maintenance capex'), '=-m_capex', -R.capex, null, { fx: t('Capex = D&A × ratio capex / D&A', 'Capex = D&A × capex / D&A ratio') });
    L(t('Flux d\'investissement (CFI)', 'Cash flow from investing (CFI)'), '=-m_capex', -R.capex, 'm_CFI', { kind: 'sub' });
    gap(ws);
    section(ws, t('Financement', 'Financing'), [t('Montant', 'Amount'), '', t('Explication', 'Explanation')], 4);
    L(t('Remboursement net de dette', 'Net debt repayment'), '=-MIN(p_repay,p_debt)', -R.repay, null, { fx: t('Positif = on emprunte davantage ; on ne rembourse pas plus que la dette', 'Positive = we borrow more; repayment cannot exceed the debt') });
    L(t('Flux de financement (CFF)', 'Cash flow from financing (CFF)'), '=-MIN(p_repay,p_debt)', -R.repay, 'm_CFF', { kind: 'sub' });
    gap(ws);
    section(ws, t('Trésorerie', 'Cash'), [t('Montant', 'Amount'), '', t('Explication', 'Explanation')], 4);
    const d = R.CFO - R.capex - R.repay;
    L(t('Variation de trésorerie', 'Change in cash'), '=m_CFO+m_CFI+m_CFF', d, 'm_dCash', { kind: 'key' });
    L(t('Trésorerie d\'ouverture', 'Opening cash'), '=p_cash0', R.cash0);
    L(t('Trésorerie nette de clôture', 'Closing net cash'), '=p_cash0+m_dCash', R.cash0 + d, null, { kind: 'sub', fx: t('Reportée au bilan : à l\'actif si positive, en découvert au passif sinon', 'Carried to the balance sheet: an asset if positive, an overdraft under liabilities otherwise') });
    gap(ws);
    small(ws, t('Hypothèse annuelle : aucun crédit d\'impôt ni report de pertes ; les intérêts ne réduisent l\'IS que dans la limite du bénéfice taxable de l\'année.', 'Annual assumption: no tax refunds or loss carryforwards; interest reduces tax only up to this year\'s taxable profit.'));
    small(ws, t('Le site raisonne en année de croisière : l\'achat initial des stands est au bilan, seul le capex de renouvellement est décaissé.', 'The site models a steady-state year: the initial purchase of the stands sits on the balance sheet, only maintenance capex is paid out.'));
  }

  // onglets « catégorie » : libellé | valeur | formule | explication
  const metricSheet = (wb, name, title, sub, tab) => sheet(wb, name, title, sub, tab, [2, 40, 16, 64, 58]);
  const M = ws => (label, f, v, name, fmt, o = {}) => line(ws, { label, f, v, name, fmt, fxCol: 4, noteCol: 5, span: 3, ...o });
  const HEAD = [t('Valeur', 'Value'), t('Formule', 'Formula'), t('Explication', 'Explanation')];

  function cashflows(wb, S, R) {
    const ws = metricSheet(wb, SH.fcf, SH.fcf, t('Investissement, BFR et les trois free cash-flows (FCF, FCFF, FCFE).', 'Investment, working capital and the three free cash flows (FCF, FCFF, FCFE).'), C.pos), L = M(ws);
    const capexF = '=p_stands*(p_standCost+' + PRODUCTS.map(p => `${on(p.id)}*${p.id}_capex`).join('+') + ')';
    section(ws, t('Investissement', 'Investment'), HEAD, 4);
    L(t('Capex initial (stands + équipements produits)', 'Initial capex (stands + product equipment)'), capexF, R.capexInit, 'm_capexInit', 'eur', { fx: t('stands × (coût d\'un stand + capex des produits actifs)', 'stands × (cost of a stand + capex of active products)') });
    L(t('D&A annuelle', 'Annual D&A'), '=m_DA', R.DA, null, 'eur', { fx: t('capex initial ÷ durée', 'initial capex ÷ useful life') });
    L(t('Capex de renouvellement / an', 'Maintenance capex / year'), '=m_DA*p_capexRatio', R.capex, 'm_capex', 'eur', { fx: t('D&A × ratio capex / D&A', 'D&A × capex / D&A ratio'), note: t('1,0× = on remplace exactement ce qui s\'use.', '1.0× = we replace exactly what wears out.') });
    gap(ws);
    section(ws, t('Besoin en fonds de roulement', 'Working capital'), HEAD, 4);
    L(t('Stocks', 'Inventory'), '=m_COGS*p_dio/365', R.stock, 'm_stock', 'eur', { fx: t('COGS × jours de stock ÷ 365', 'COGS × days of inventory ÷ 365') });
    L(t('Créances clients', 'Accounts receivable'), '=m_CA*p_dso/365', R.recv, 'm_recv', 'eur', { fx: t('CA × DSO ÷ 365', 'Revenue × DSO ÷ 365') });
    L(t('Dettes fournisseurs', 'Accounts payable'), '=m_COGS*p_dpo/365', R.pay, 'm_pay', 'eur', { fx: 'COGS × DPO ÷ 365' });
    L(t('BFR de croisière', 'Steady-state working capital (WC)'), '=m_stock+m_recv-m_pay', R.BFR, 'm_BFR', 'eur', { kind: 'sub', fx: t('stocks + créances − fournisseurs', 'inventory + receivables − payables') });
    L(t('BFR d\'ouverture', 'Opening working capital'), '=m_BFR/(1+p_growth)', R.BFR / (1 + S.growth / 100), 'm_openingBFR', 'eur', { fx: t('BFR de croisière ÷ (1 + croissance)', 'steady-state WC ÷ (1 + growth)') });
    L(t('Investissement initial (capex + BFR d\'ouverture)', 'Initial investment (capex + opening WC)'), '=m_capexInit+m_openingBFR', R.investedInitial, 'm_initialInvested', 'eur', { kind: 'key' });
    L(t('Capital investi en régime de croisière', 'Steady-state invested capital'), '=m_capexInit+m_BFR', R.invested, 'm_invested', 'eur', { fx: t('capex initial + BFR de croisière ; base du ROIC', 'initial capex + steady-state WC; ROIC denominator') });
    L(t('Variation du BFR', 'Change in working capital'), '=m_BFR*p_growth/(1+p_growth)', R.dBFR, 'm_dBFR', 'eur', { kind: 'sub', fx: fx('dBFR'), note: note('dBFR') });
    gap(ws);
    section(ws, t('Free cash-flows', 'Free cash flows'), HEAD, 4);
    L(t('NOPAT (EBIT après impôt)', 'NOPAT (after-tax EBIT)'), '=m_EBIT-MAX(0,m_EBIT)*p_tax', R.NOPAT, 'm_NOPAT', 'eur', { fx: t('NOPAT = EBIT − t × EBIT (0 si perte)', 'NOPAT = EBIT − t × EBIT (0 if loss)') });
    L('Free cash flow (FCF)', '=m_CFO-m_capex', R.FCF, 'm_FCF', 'eur', { kind: 'key', fx: fx('FCF'), note: note('FCF') });
    L(t('FCFF (pour tous les financeurs)', 'FCFF (for all capital providers)'), '=m_NOPAT+m_DA-m_capex-m_dBFR', R.FCFF, 'm_FCFF', 'eur', { kind: 'key', fx: fx('FCFF'), note: note('FCFF') });
    L(t('FCFE (pour les actionnaires)', 'FCFE (for shareholders)'), '=m_FCF-MIN(p_repay,p_debt)', R.FCFE, 'm_FCFE', 'eur', { kind: 'key', fx: fx('FCFE'), note: note('FCFE') });
  }

  function valorisation(wb, S, R) {
    // colonnes C:G étroites pour la table de sensibilité : la formule s'étale sur D:G, l'explication passe en H
    const ws = sheet(wb, SH.val, SH.val, t('Coût du capital, valeur par actualisation (Gordon-Shapiro) et création de valeur.', 'Cost of capital, discounted value (Gordon growth) and value creation.'), C.lemon, [2, 40, 16, 15, 15, 15, 15, 58]);
    const L = (label, f, v, name, fmt, o = {}) => line(ws, { label, f, v, name, fmt, fxCol: 4, fxMerge: 4, noteCol: 8, span: 3, ...o });
    const HEAD = [t('Valeur', 'Value'), t('Formule', 'Formula'), '', '', '', t('Explication', 'Explanation')], sec = txt => section(ws, txt, HEAD, 7);
    // Le WACC et VE₀ utilisent la même dette nette d'ouverture ; le FCFF de l'année est le premier flux de Gordon.
    // m_netDebt (dette − trésorerie excédentaire) est défini une seule fois, dans le Simulateur. Aucune circularité.
    sec(t('Coût du capital', 'Cost of capital'));
    L(t('Coût des fonds propres sans dette (Ku)', 'Unlevered cost of equity (Ku)'), '=p_rf+p_beta*p_mrp+p_size', R.ku, 'm_ku', 'pct', { fx: t('Ku = Rf + βu × prime de marché + prime taille', 'Ku = Rf + βu × market premium + size premium'), note: t('Le rendement exigé si le stand n\'avait aucune dette.', 'The return required if the stand had no debt at all.') });
    L(t('Taux fiscal effectif du bouclier', 'Effective tax-shield rate'), '=m_taxShieldRate', R.taxShieldRate, null, 'pct', { fx: t('Bouclier fiscal utilisable ÷ intérêts ; nul si aucun bouclier disponible', 'Usable tax shield ÷ interest; zero when no shield is available') });
    L(t('Coût de la dette après impôt', 'After-tax cost of debt'), '=p_kd*(1-m_taxShieldRate)', R.kdAT, 'm_kdAT', 'pct', { fx: t('Kd × (1 − taux fiscal effectif)', 'Kd × (1 − effective tax-shield rate)') });
    gap(ws);
    sec(t('Valeur', 'Value'));
    L(t('FCFF de l\'année', 'FCFF for the year'), '=m_FCFF', R.FCFF, null, 'eur');
    L(t('Croissance perpétuelle (g)', 'Terminal growth (g)'), '=p_gTerm', R.gT, null, 'pct');
    const evFormula = '=IF(m_FCFF<=0,0,IF(m_ku>p_gTerm,MAX(0,(m_FCFF+m_netDebt*(m_ku-((1-m_taxShieldRate)*p_beta*p_mrp+m_kdAT)))/(m_ku-p_gTerm)),NA()))';
    const evCache = R.FCFF <= 0 ? 0 : isFinite(R.EV) ? R.EV : undefined;
    L(t('Valeur d\'entreprise à l\'ouverture (VE₀)', 'Opening-date enterprise value (EV₀)'), evFormula, evCache, 'm_EV', 'eur',
      { kind: 'key', fx: t('VE₀ = (FCFF₁ + DN × (Ku − ((1 − t_eff) × βu × PRM + KdAT))) ÷ (Ku − g)', 'EV₀ = (FCFF₁ + ND × (Ku − ((1 − t_eff) × βu × MRP + KdAT))) ÷ (Ku − g)'), note: t('La trésorerie excédentaire est non rémunérée et déjà déduite de la dette. Valeur d\'exploitation planchée à 0 ; si elle ne couvre pas la dette nette, WACC non défini et equity nul.', 'Excess cash earns no interest and is already netted against debt. EV is floored at 0; if it does not cover net debt, WACC is undefined and equity is 0.') });
    gap(ws);
    sec(t('Structure du capital et WACC', 'Capital structure and WACC'));
    L(t('Poids de la dette D/V', 'Debt weight D/V'), '=IFERROR(IF(OR(m_equity=0,m_EV<=0),NA(),m_netDebt/m_EV),NA())', R.dv, 'm_dv', 'pct', { fx: t('D/V = dette nette ÷ VE₀', 'D/V = net debt ÷ EV₀'), note: t('Cash excédentaire non rémunéré déduit de la dette ; si equity ≤ 0, WACC non applicable.', 'Excess non-interest-bearing cash is netted against debt; if equity ≤ 0, WACC is not applicable.') });
    L(t('Poids des fonds propres E/V', 'Equity weight E/V'), '=1-m_dv', 1 - R.dv, null, 'pct');
    L(t('Bêta des actionnaires (βL)', 'Levered beta (βL)'), '=p_beta*(1+(1-m_taxShieldRate)*m_dv/(1-m_dv))', R.betaL, 'm_betaL', 'x2', { fx: t('βL = βu × (1 + (1 − t_eff) × dette nette ÷ equity)  (Hamada)', 'βL = βu × (1 + (1 − t_eff) × net debt ÷ equity)  (Hamada)'), note: t('La dette rend les actions plus risquées.', 'Debt makes the shares riskier.') });
    L(t('Coût des fonds propres (Ke)', 'Cost of equity (Ke)'), '=p_rf+m_betaL*p_mrp+p_size', R.ke, 'm_ke', 'pct', { fx: t('Ke = Rf + βL × prime de marché + prime taille', 'Ke = Rf + βL × market premium + size premium') });
    L('WACC', '=(1-m_dv)*m_ke+m_dv*m_kdAT', R.WACC, 'm_WACC', 'pct', { kind: 'key', fx: fx('WACC'), note: note('WACC') });
    const OK = t('✓ cohérent', '✓ consistent');
    L(t('Contrôle : FCFF ÷ (WACC − g) = VE', 'Check: FCFF ÷ (WACC − g) = EV'), `=IFERROR(IF(ROUND(MAX(0,m_FCFF/(m_WACC-p_gTerm))-m_EV,2)=0,"${OK}","${t('Écart', 'Difference')}"),"–")`, isFinite(R.WACC) ? OK : '–', null, 'txt', { kind: 'pct' });
    gap(ws);
    sec(t('Des fonds propres à la VAN', 'From equity to NPV'));
    L(t('Dette nette', 'Net debt'), '=p_debt-p_cash0', R.netDebt, null, 'eur', { fx: t('dette d\'ouverture − trésorerie d\'ouverture', 'opening debt − opening cash'), note: t('Montants d\'ouverture : le flux de l\'année n\'est pas déduit une seconde fois.', 'Opening-date amounts: the year\'s cash flow is not deducted a second time.') });
    L(t('Valeur des fonds propres', 'Equity value'), '=MAX(0,m_EV-m_netDebt)', R.equity, 'm_equity', 'eur', { kind: 'key', fx: fx('equity'), note: note('equity') });
    L(t('Investissement initial', 'Initial investment'), '=m_initialInvested', R.investedInitial, null, 'eur', { fx: t('Investissement au jour 0 : capex initial + BFR d\'ouverture', 'Day-0 investment: initial capex + opening WC') });
    L(t('VAN à l\'ouverture', 'Opening-date NPV'), '=m_EV-m_initialInvested', R.NPV, 'm_NPV', 'eur', { kind: 'key', fx: fx('NPV'), note: note('NPV') });
    L(t('Capital investi en régime de croisière', 'Steady-state invested capital'), '=m_invested', R.invested, null, 'eur', { fx: t('capex initial + BFR de croisière ; base du ROIC', 'initial capex + steady-state WC; ROIC denominator') });
    gap(ws);
    sec(t('Création de valeur', 'Value creation'));
    L('ROIC', '=IF(m_invested>0,m_NOPAT/m_invested,NA())', R.ROIC, 'm_ROIC', 'pct', { kind: 'key', fx: fx('ROIC'), note: note('ROIC') });
    L('Verdict', `=IF(m_EV=0,"${CLOSE}",IF(ISNUMBER(m_ROIC),IF(ISNUMBER(m_WACC),IF(m_ROIC>m_WACC,"${CREATES}","${DESTROYS}"),"${NOWACC}"),"–"))`, verdictOf(R), 'm_verdict', 'txt');
    gap(ws);

    // sensibilité de la VE : WACC en colonnes, g en lignes, case centrale = scénario actuel
    section(ws, t('Sensibilité de la valeur d\'entreprise (g en lignes, WACC en colonnes)', 'Enterprise value sensitivity (g in rows, WACC in columns)'), [], 6);
    const dW = [-0.02, -0.01, 0, 0.01, 0.02], dG = [-0.01, -0.005, 0, 0.005, 0.01];
    const hr = ws.getRow(ws.r++), cols = ['C', 'D', 'E', 'F', 'G'];
    hr.getCell(2).value = 'g ↓'; hr.getCell(2).font = { name: FONT, size: 10, bold: true, color: { argb: C.muted } }; hr.getCell(2).alignment = { horizontal: 'right' };
    dW.forEach((d, i) => { const c = hr.getCell(3 + i); put(c, `=m_WACC${d ? (d > 0 ? '+' : '') + d : ''}`, R.WACC + d); c.numFmt = F.pct; c.font = { name: FONT, size: 11, bold: true, color: { argb: C.ink } }; c.fill = fill(C.mint); c.alignment = { horizontal: 'center' }; });
    dG.forEach(dg => {
      const r = ws.getRow(ws.r++), gv = R.gT + dg, gc = r.getCell(2);
      put(gc, `=p_gTerm${dg ? (dg > 0 ? '+' : '') + dg : ''}`, gv); gc.numFmt = F.pct; gc.font = { name: FONT, size: 11, bold: true, color: { argb: C.ink } }; gc.alignment = { horizontal: 'right' };
      dW.forEach((dw, i) => {
        const w = R.WACC + dw, c = r.getCell(3 + i), ev = w > gv ? Math.max(0, R.FCFF / (w - gv)) : '';
        put(c, `=IF(${cols[i]}$${hr.number}>$B${r.number},MAX(0,m_FCFF/(${cols[i]}$${hr.number}-$B${r.number})),"n.s.")`, ev);
        c.numFmt = F.eur; c.alignment = { horizontal: 'center' };
        c.font = { name: FONT, size: 11, bold: !dw && !dg, color: { argb: C.ink } };
        if (!dw && !dg) c.fill = fill(C.lemonL);
      });
    });
    small(ws, t('Case jaune = scénario actuel. « n.s. » : le WACC doit dépasser g, sinon la formule n\'a pas de sens.', 'Yellow cell = current scenario. “n.s.”: WACC must exceed g, otherwise the formula is meaningless.'));
  }

  function kpis(wb, S, R) {
    const ws = metricSheet(wb, SH.kpi, t('KPIs du restaurant', 'Restaurant KPIs'), t('Les indicateurs de pilotage d\'un point de vente.', 'The steering metrics of a point of sale.'), C.neg), L = M(ws);
    const k = key => ({ fx: fx(key), note: note(key) });
    section(ws, t('Clients', 'Customers'), HEAD, 4);
    L(t('Panier moyen', 'Average ticket'), '=IF(m_customers=0,0,m_CA/m_customers)', R.ticket, 'm_ticket', 'eur2', { kind: 'key', ...k('ticket') });
    L(t('CAC (coût d\'acquisition client)', 'CAC (customer acquisition cost)'), '=IF(m_customers*p_newPct=0,0,m_mkt/(m_customers*p_newPct))', R.CAC, 'm_CAC', 'eur2', k('CAC'));
    gap(ws);
    section(ws, t('Places assises', 'Seating'), HEAD, 4);
    L(t('Heures-places disponibles / an', 'Available seat-hours / year'), '=p_seats*p_stands*m_hoursYr', R.seatHours, 'm_seatHours', 'int', { fx: t('places × stands × heures d\'ouverture', 'seats × stands × opening hours') });
    L('RevPASH', '=IF(m_seatHours=0,0,m_CA/m_seatHours)', R.revpash, 'm_revpash', 'eur2', { kind: 'key', ...k('revpash') });
    L(t('Rotation des places', 'Seat turnover'), '=IF(m_seatHours=0,0,m_customers*p_sitPct/m_seatHours)', R.tableTurn, 'm_tableTurn', 'x2', k('tableTurn'));
    L(t('Taux d\'occupation', 'Occupancy rate'), '=m_tableTurn*p_sitMin/60', R.occupancy, null, 'pct', { fx: t('rotation × durée assise ÷ 60', 'turnover × time seated ÷ 60') });
    gap(ws);
    section(ws, t('Coûts', 'Costs'), HEAD, 4);
    L(t('Masse salariale %', 'Labor cost %'), '=IF(m_CA=0,0,m_payroll/m_CA)', R.laborPct, null, 'pct', { kind: 'key', ...k('laborPct') });
    L('Food cost %', '=IF(m_CA=0,0,m_COGS/m_CA)', R.foodPct, null, 'pct', { kind: 'key', ...k('foodPct') });
    L(t('Coût du turnover', 'Turnover cost'), '=m_turnCost', R.turnCost, null, 'eur', k('turnCost'));
    L(t('Gâchis', 'Wastage'), '=m_waste', R.wasteCost, null, 'eur', k('wasteCost'));
    L(t('Rotation des stocks', 'Inventory turnover'), '=IF(m_stock=0,0,m_COGS/m_stock)', R.invTurn, null, 'x1', k('invTurn'));
    gap(ws);
    section(ws, t('Point mort', 'Break-even'), HEAD, 4);
    L(t('Coûts fixes', 'Fixed costs'), '=m_payroll+m_turnCost+m_rent+m_mkt+m_other+m_DA', R.fixed, 'm_fixed', 'eur', { fx: t('salaires + turnover + loyers + marketing + autres + D&A', 'wages + turnover + rent + marketing + other + D&A') });
    L(t('Coûts variables / CA', 'Variable costs / revenue'), '=IF(m_CA=0,0,(m_COGS+m_card)/m_CA)', R.varRate, 'm_varRate', 'pct', { fx: t('(COGS + frais CB) ÷ CA', '(COGS + card fees) ÷ revenue') });
    L(t('Point mort (CA)', 'Break-even (revenue)'), '=IF(m_varRate<1,m_fixed/(1-m_varRate),NA())', R.BE, 'm_BE', 'eur', { kind: 'key', ...k('BE') });
    L(t('Prix moyen d\'un article', 'Average item price'), '=IF(m_units=0,0,m_CA/m_units)', R.avgPrice, 'm_avgPrice', 'eur2');
    L(t('Point mort en articles / jour / stand', 'Break-even in items / day / stand'), '=IF(m_avgPrice=0,NA(),m_BE/m_avgPrice/(p_days*p_stands))', R.BEday, 'm_BEday', 'int');
  }

  // ---------- Dashboard : en-tête Daily Zest, 16 tuiles, verdict, 4 graphiques, zoom produit et l'île, paramètres modifiés, sommaire ----------
  // une rangée de tuiles : libellé, grande valeur, légende (valeur ou formule) ; cols = colonnes occupées
  function tiles(ws, list, cols = [2, 4, 6, 8]) {
    const r0 = ws.r;
    list.forEach(([label, f, v, fmt, cap, capV, capFmt], i) => {
      const col = cols[i], bg = i === 0 ? C.lemonL : C.mint;
      const a = ws.getCell(r0, col), b = ws.getCell(r0 + 1, col), c = ws.getCell(r0 + 2, col);
      a.value = label; a.font = { name: FONT, size: 10, bold: true, color: { argb: C.muted } };
      put(b, f, v); b.numFmt = fmt; b.font = { name: FONT, size: 20, bold: true, color: { argb: C.ink } };
      put(c, cap, capV); c.font = { name: FONT, size: 9, italic: true, color: { argb: C.muted } }; if (capFmt) c.numFmt = capFmt;
      [a, b, c].forEach(x => { x.fill = fill(bg); x.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }; });
      a.border = { top: { style: 'medium', color: { argb: i === 0 ? C.lemon : C.mintD } } };
    });
    ws.getRow(r0).height = 18; ws.getRow(r0 + 1).height = 32; ws.getRow(r0 + 2).height = 16;
    ws.r = r0 + 4;
  }

  function dashboard(wb, S, R) {
    const prods = PRODUCTS.filter(p => S[p.id + '_on']).map(p => p.name).join(', ') || t('aucun produit', 'no product');
    const date = new Date().toLocaleDateString(t('fr-FR', 'en-GB'));
    const ws = sheet(wb, 'Dashboard', 'Daily Zest', t(`Tableau de bord financier · exporté le ${date}`, `Financial dashboard · exported on ${date}`) + ` · ${S.stands} stand${S.stands > 1 ? 's' : ''} · ${prods} · ` + t('valeurs annuelles en €', 'annual figures in $'), C.lemon, [2, 26, 2, 26, 2, 26, 2, 26, 2]);
    ws.mergeCells(4, 2, 4, 8);
    const how = ws.getCell('B4');
    how.value = t(`▸ Glisse les curseurs de l'onglet ${SH.hyp} : tuiles et graphiques se recalculent. Choisis un produit dans le Zoom produit, plus bas.`,
      `▸ Drag the sliders in the ${SH.hyp} sheet: tiles and charts recalculate. Pick a product in the Product focus, further down.`);
    how.font = { name: FONT, size: 10, color: { argb: C.ink } }; how.fill = fill(C.lemonL); how.alignment = { vertical: 'middle', indent: 1 };
    ws.getRow(4).height = 20; ws.r = 6;

    const BANDS = [
      [t('Activité', 'Operations'), [
        [t('Chiffre d\'affaires', 'Revenue'), '=m_CA', R.CA, F.eur, t('ventes de l\'année', 'sales for the year')],
        [t('Clients servis', 'Customers served'), '=m_customers', R.customers, F.int, t('par an, tous stands', 'per year, all stands')],
        [t('Panier moyen', 'Average ticket'), '=m_ticket', R.ticket, F.eur2, t('CA ÷ clients', 'revenue ÷ customers')],
        [t('Taux de service', 'Service rate'), '=m_served', R.served, F.pct, t('demande réellement servie', 'demand actually served')],
      ]],
      [t('Rentabilité', 'Profitability'), [
        [t('Marge brute', 'Gross margin'), '=IF(m_CA=0,0,m_MB/m_CA)', R.MBpct, F.pct, t('en % du CA', 'as % of revenue')],
        ['EBITDA', '=m_EBITDA', R.EBITDA, F.eur, t('avant D&A, intérêts, impôt', 'before D&A, interest, tax')],
        [t('Résultat net', 'Net income'), '=m_RN', R.RN, F.eur, t('pour les actionnaires', 'for shareholders')],
        [t('Point mort', 'Break-even'), '=m_BE', R.BE, F.eur, t('CA où l\'EBIT devient positif', 'revenue where EBIT turns positive')],
      ]],
      ['Cash', [
        ['Free cash flow', '=m_FCF', R.FCF, F.eur, t('cash après investissement', 'cash after investment')],
        ['FCFF', '=m_FCFF', R.FCFF, F.eur, t('pour tous les financeurs', 'for all capital providers')],
        ['FCFE', '=m_FCFE', R.FCFE, F.eur, t('pour les actionnaires', 'for shareholders')],
        [t('Variation de trésorerie', 'Change in cash'), '=m_dCash', R.CFO - R.capex - R.repay, F.sgn, t('tableau des flux', 'cash flow statement')],
      ]],
      [t('Valeur', 'Value'), [
        ['WACC', '=m_WACC', R.WACC, F.pct, t('coût du capital', 'cost of capital')],
        [t('Valeur d\'entreprise', 'Enterprise value'), '=m_EV', R.EV, F.eur, 'Gordon-Shapiro'],
        [t('Valeur des fonds propres', 'Equity value'), '=m_equity', R.equity, F.eur, t('VE₀ − dette nette d\'ouverture', 'EV₀ − opening net debt')],
        [t('VAN du projet', 'Project NPV'), '=m_NPV', R.NPV, F.sgn, t('VE₀ − investissement initial : ça vaut le coup ?', 'EV₀ − initial investment: worth it?')],
      ]],
    ];
    for (const [band, list] of BANDS) {
      const h = ws.getCell(ws.r++, 2); h.value = band.toUpperCase(); h.font = { name: FONT, size: 10, bold: true, color: { argb: C.muted } };
      tiles(ws, list);
    }

    verdict(ws, ws.r, 8, R); ws.r++;

    // 4 graphiques en 2 × 2 (dessinés dans le fichier par withCharts, ici on réserve la place)
    section(ws, t('Graphiques', 'Charts'), [], 7);
    for (let k = 0; k < 2; k++) {
      const r0 = ws.r;
      for (let i = 0; i < 15; i++) ws.getRow(r0 + i).height = 15;
      ANCH[k ? 'be' : 'products'] = { sheet: 'Dashboard', c0: 1, r0: r0 - 1, c1: 4, r1: r0 + 14 };
      ANCH[k ? 'ev' : 'bridge'] = { sheet: 'Dashboard', c0: 5, r0: r0 - 1, c1: 8, r1: r0 + 14 };
      ws.r = r0 + 16;
    }

    // zoom produit (liste déroulante → tuiles) à gauche, l'île du joueur à droite
    section(ws, t('Zoom produit', 'Product focus'), [], 3);
    const hr = ws.getRow(ws.r - 1);
    for (let c = 6; c <= 8; c++) { const x = hr.getCell(c); x.fill = fill(C.ink); x.font = { name: FONT, size: 11, bold: true, color: { argb: C.white } }; }
    hr.getCell(6).value = t('Ton île au moment de l\'export', 'Your island at export time');
    const top = ws.r, cur = PRODUCTS.find(p => S[p.id + '_on']) || PRODUCTS[0], l = R.lines.find(x => x.p.id === cur.id);
    const sel = ws.getCell(top, 2);
    sel.value = cur.name; asInput(sel); sel.font = { ...sel.font, size: 13 }; sel.alignment = { vertical: 'middle', indent: 1 };
    sel.dataValidation = { type: 'list', allowBlank: false, formulae: [`"${PRODUCTS.map(p => p.name).join(',')}"`], showErrorMessage: true, error: t('Choisis un produit de la liste', 'Pick a product from the list') };
    // la valeur du produit choisi parmi les cellules nommées <produit>_… (Hypothèses et Activité)
    const pick = suf => `CHOOSE(MATCH($B$${top},{${PRODUCTS.map(p => `"${p.name}"`).join(',')}},0),${PRODUCTS.map(p => p.id + suf).join(',')})`;
    const ON = t('À la carte : ', 'On the menu: '), d = ws.getCell(top, 4);
    put(d, `="◂ ${ON}"&IFERROR(${pick('_on')},"–")`, `◂ ${ON}${S[cur.id + '_on'] ? YES : NO}`);
    d.font = { name: FONT, size: 10, italic: true, color: { argb: C.muted } }; d.alignment = { vertical: 'middle' };
    ws.getRow(top).height = 26; ws.r = top + 2;
    const unit = (S[cur.id + '_cost'] + S.cup) * (1 + S.waste / 100) / (1 - S.card / 100);
    tiles(ws, [
      [t('Prix de vente', 'Selling price'), `=IFERROR(${pick('_prix')},"–")`, S[cur.id + '_price'], F.eur2, t('ton prix actuel', 'your current price')],
      [t('Prix optimal', 'Best price'), `=IFERROR(${pick('_opt')},"–")`, (chokePrice(cur.price, S.elast) + unit) / 2, F.eur2, t('maximise l\'EBITDA, file non saturée', 'maximizes EBITDA, queue not saturated')],
    ], [2, 4]);
    tiles(ws, [
      [t('Articles vendus / an', 'Items sold / year'), `=IFERROR(${pick('_units')},"–")`, l ? l.units : 0, F.int, t('tous stands', 'all stands')],
      [t('Part du CA', 'Share of revenue'), `=IFERROR(${pick('_CA')}/m_CA,0)`, l && R.CA ? l.CA / R.CA : 0, F.pct, t('du chiffre d\'affaires total', 'of total revenue')],
    ], [2, 4]);
    let hPx = 0; for (let r = top; r < ws.r - 1; r++) hPx += (ws.getRow(r).height || 15) * 4 / 3;
    const shot = islandShot(393, Math.round(hPx));
    if (shot) ws.addImage(wb.addImage({ base64: shot, extension: 'png' }), { tl: { col: 5, row: top - 1 }, br: { col: 8, row: ws.r - 2 } });
    gap(ws);

    // paramètres modifiés : photo au moment de l'export (la feuille Hypothèses, elle, les surligne en direct)
    section(ws, t('Paramètres modifiés par rapport au site', 'Parameters changed from the site defaults'), [], 7);
    const diffs = [];
    for (const k in PARAMS) {
      const P = PARAMS[k];
      if (S[k] !== P.def) diffs.push([P.prod ? `${PRODUCTS.find(p => p.id === P.prod).name} : ${P.label.toLowerCase()}` : P.label, fmtParam(P.def, P.fmt), fmtParam(S[k], P.fmt)]);
    }
    for (const p of PRODUCTS) if (S[p.id + '_on'] !== (p.id === 'citron')) diffs.push([t(`${p.name} à la carte`, `${p.name} on the menu`), (p.id === 'citron' ? YES : NO).toLowerCase(), (S[p.id + '_on'] ? YES : NO).toLowerCase()]);
    if (!diffs.length) small(ws, t('Aucun : c\'est le scénario par défaut du site.', 'None: this is the site\'s default scenario.'));
    else {
      const hd = ws.getRow(ws.r++);
      [[t('Paramètre', 'Parameter'), 2], [t('Défaut', 'Default'), 6], [t('Ta valeur', 'Your value'), 8]].forEach(([txt, col]) => { const c = hd.getCell(col); c.value = txt; c.font = { name: FONT, size: 10, bold: true, color: { argb: C.muted } }; });
      for (const [label, def, cur] of diffs) {
        const row = ws.getRow(ws.r++);
        ws.mergeCells(row.number, 2, row.number, 5);
        row.getCell(2).value = label; row.getCell(2).font = { name: FONT, size: 11, color: { argb: C.ink } };
        row.getCell(6).value = def; row.getCell(6).font = { name: FONT, size: 11, color: { argb: C.muted } };
        row.getCell(8).value = cur; row.getCell(8).font = { name: FONT, size: 11, bold: true, color: { argb: C.ink } }; row.getCell(8).fill = fill(C.lemonL);
      }
    }
    gap(ws);

    section(ws, t('Sommaire', 'Contents'), [], 7);
    [[SH.pnl, t('du CA au résultat net', 'from revenue to net income')], [SH.bs, t('actif, passif, contrôle d\'équilibre', 'assets, liabilities, balance check')], [SH.cf, t('exploitation, investissement, financement', 'operating, investing, financing')],
      [SH.fcf, t('BFR, FCF, FCFF, FCFE', 'WC, FCF, FCFF, FCFE')], [SH.val, t('WACC, valeur, ROIC, sensibilité', 'WACC, value, ROIC, sensitivity')], [SH.kpi, t('panier, RevPASH, food cost, point mort…', 'ticket, RevPASH, food cost, break-even…')],
      [SH.act, t('du passant à l\'article vendu', 'from passer-by to item sold')], [SH.hyp, t('les curseurs du site et leurs impacts en direct', 'the site\'s sliders and their live impact')], [SH.gd, t('les cellules derrière chaque graphique', 'the cells behind each chart')]].forEach(([name, what]) => {
      const row = ws.getRow(ws.r++), c = row.getCell(2);
      c.value = { text: name, hyperlink: `#'${name}'!A1` }; c.font = { name: FONT, size: 11, bold: true, underline: true, color: { argb: C.input } };
      row.getCell(4).value = what; row.getCell(4).font = { name: FONT, size: 10, italic: true, color: { argb: C.muted } };
    });
  }

  // l'île telle qu'elle est à l'écran à l'export (canvas de scene.js, preserveDrawingBuffer), recadrée au centre, en 2×
  function islandShot(w, h) {
    const src = document.getElementById('scene');
    if (!src || !src.width) return null;
    const k = Math.min(src.width / w, src.height / h) * 0.86, cv = document.createElement('canvas');
    cv.width = w * 2; cv.height = h * 2;
    cv.getContext('2d').drawImage(src, (src.width - w * k) / 2, (src.height - h * k) / 2, w * k, h * k, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/png').split(',')[1];
  }

  // ---------- Données graphiques : les cellules que lisent les 4 graphiques du Dashboard ----------
  function graphiques(wb, S, R) {
    const ws = sheet(wb, SH.gd, SH.gd, t('Chaque graphique du Dashboard lit ces cellules, reliées au modèle : elles bougent avec les hypothèses.', 'Each Dashboard chart reads these cells, linked to the model: they move with the assumptions.'), C.coral, [2, 34, 14, 14, 14, 14, 14]);
    const q = `'${SH.gd}'!`, rng = (col, a, b = a) => `${q}$${col}$${a}:$${col}$${b}`;
    const cell = (r, col, f, v, fmt) => { const c = ws.getCell(r, col); put(c, f, v); c.numFmt = fmt; c.alignment = { horizontal: 'right' }; c.font = { name: FONT, size: 11, color: { argb: C.ink } }; return c; };
    const K = t('#,##0," k€"', '"$"#,##0,"k"'), K0 = t('#,##0," k€";-#,##0," k€";"–"', '"$"#,##0,"k";-"$"#,##0,"k";"–"');

    // 1. CA par produit, barres aux couleurs des bocaux
    // colonne Échelle : barre invisible à 125 % du max, pour que l'axe laisse la place aux étiquettes
    section(ws, t('CA par produit', 'Revenue by product'), [t('CA', 'Revenue'), t('Échelle', 'Scale')], 3);
    const p0 = ws.r, ca = PRODUCTS.map(p => (R.lines.find(x => x.p.id === p.id) || { CA: 0 }).CA), top = Math.max(...ca) * 1.25;
    PRODUCTS.forEach((p, i) => {
      const r = ws.r++; labelCell(ws.getCell(r, 2), p.name); ws.getCell(r, 1).fill = fill(argb(p.color));
      cell(r, 3, `=${p.id}_CA`, ca[i], F.eur); cell(r, 4, `=MAX($C$${p0}:$C$${p0 + PRODUCTS.length - 1})*1.25`, top, F.eur).font = { name: FONT, size: 10, color: { argb: C.muted } };
    });
    const p1 = ws.r - 1, names = PRODUCTS.map(p => p.name), cats = strRef(rng('B', p0, p1), names);
    CHARTS.push({ at: 'products', xml: chartXml(t('CA par produit', 'Revenue by product'),
      `<c:barChart><c:barDir val="bar"/><c:grouping val="clustered"/><c:varyColors val="0"/>${barSer(0, t('Échelle', 'Scale'), cats, numRef(rng('D', p0, p1), ca.map(() => top)), 'none')}${barSer(1, t('CA', 'Revenue'), cats, numRef(rng('C', p0, p1), ca), null, PRODUCTS.map(p => p.color), dLbls(K0, 'outEnd'))}<c:gapWidth val="55"/><c:overlap val="100"/><c:axId val="1"/><c:axId val="2"/></c:barChart>`
      + catAx(1, 2, 'l', { rev: true }) + valAx(2, 1, 'b', K, { hide: true, grid: false, min: 0 })) });
    gap(ws);

    // 2. pont du CA au résultat net : base invisible + barre, la partie négative à part quand un palier franchit zéro
    section(ws, t('Du CA au résultat net', 'From revenue to net income'), [t('Début', 'Start'), t('Fin', 'End'), 'Base', t('Barre', 'Bar'), t('Barre < 0', 'Bar < 0')], 6);
    const steps = [
      [t('CA', 'Revenue'), '0', 0, 'm_CA', R.CA, 1], ['COGS', 'm_CA', R.CA, 'm_MB', R.MB], [t('Charges op.', 'Opex'), 'm_MB', R.MB, 'm_EBITDA', R.EBITDA],
      ['EBITDA', '0', 0, 'm_EBITDA', R.EBITDA, 1], ['D&A', 'm_EBITDA', R.EBITDA, 'm_EBIT', R.EBIT], [t('Intérêts', 'Interest'), 'm_EBIT', R.EBIT, 'm_EBT', R.EBT],
      [t('Impôt', 'Tax'), 'm_EBT', R.EBT, 'm_RN', R.RN], [t('Résultat net', 'Net income'), '0', 0, 'm_RN', R.RN, 1],
    ];
    const b0 = ws.r, cols = [[], [], []];
    for (const [label, fa, a, fb, b] of steps) {
      const r = ws.r++, both = a >= 0 && b >= 0, neg = a <= 0 && b <= 0;
      const vals = [both ? Math.min(a, b) : neg ? Math.max(a, b) : 0, both ? Math.abs(a - b) : neg ? -Math.abs(a - b) : Math.max(a, b), a * b < 0 ? Math.min(a, b) : 0];
      labelCell(ws.getCell(r, 2), label);
      cell(r, 3, '=' + fa, a, F.eur); cell(r, 4, '=' + fb, b, F.eur);
      cell(r, 5, `=IF(AND(C${r}>=0,D${r}>=0),MIN(C${r},D${r}),IF(AND(C${r}<=0,D${r}<=0),MAX(C${r},D${r}),0))`, vals[0], F.eur);
      cell(r, 6, `=IF(AND(C${r}>=0,D${r}>=0),ABS(C${r}-D${r}),IF(AND(C${r}<=0,D${r}<=0),-ABS(C${r}-D${r}),MAX(C${r},D${r})))`, vals[1], F.eur);
      cell(r, 7, `=IF(C${r}*D${r}<0,MIN(C${r},D${r}),0)`, vals[2], F.eur);
      vals.forEach((x, i) => cols[i].push(x));
    }
    const b1 = ws.r - 1, cat = strRef(rng('B', b0, b1), steps.map(s => s[0])), hue = steps.map(s => (s[5] ? C.ink : C.coral));
    const bridge = chartXml(t('Du CA au résultat net', 'From revenue to net income'),
      `<c:barChart><c:barDir val="col"/><c:grouping val="stacked"/><c:varyColors val="0"/>${barSer(0, 'Base', cat, numRef(rng('E', b0, b1), cols[0]), 'none')}${barSer(1, t('Montant', 'Amount'), cat, numRef(rng('F', b0, b1), cols[1]), null, hue)}${barSer(2, t('Montant < 0', 'Amount < 0'), cat, numRef(rng('G', b0, b1), cols[2]), null, hue)}<c:gapWidth val="40"/><c:overlap val="100"/><c:axId val="1"/><c:axId val="2"/></c:barChart>`
      + catAx(1, 2, 'b') + valAx(2, 1, 'l', K));
    CHARTS.push({ at: 'bridge', xml: bridge }, { at: 'sim', xml: bridge }); // la cascade, aussi à côté des curseurs
    small(ws, t('Barres foncées = totaux, corail = ce que chaque palier retire.', 'Dark bars = totals, coral = what each step takes away.'));
    gap(ws);

    // 3. point mort : la droite du CA croise celle des coûts totaux (fixes + variables)
    section(ws, t('Point mort', 'Break-even'), [t('CA', 'Revenue'), t('Coûts totaux', 'Total costs')], 3);
    const beOk = isFinite(R.BE), xMax = Math.max(1000, Math.ceil(Math.max(R.CA, beOk ? R.BE : 0) * 1.4 / 1000) * 1000);
    const sr = ws.r++; labelCell(ws.getCell(sr, 2), t('Échelle : CA maximum du graphique', 'Scale: chart\'s maximum revenue'));
    cell(sr, 3, '=MAX(1000,ROUNDUP(MAX(m_CA,IFERROR(m_BE,0))*1.4/1000,0)*1000)', xMax, F.eur);
    const x0 = ws.r, xs = [], ys = [];
    for (let i = 0; i <= 6; i++) {
      const r = ws.r++, x = xMax * i / 6; xs.push(x); ys.push(R.fixed + R.varRate * x);
      labelCell(ws.getCell(r, 2), `${i}/6`); cell(r, 3, `=$C$${sr}*${i}/6`, x, F.eur); cell(r, 4, `=m_fixed+m_varRate*C${r}`, R.fixed + R.varRate * x, F.eur);
    }
    // repères verticaux (Excel n'affiche pas les marqueurs de nuage de points à l'export) : du sol jusqu'à la droite du CA
    const x1 = ws.r - 1, mark = ([label, f, v]) => {
      const r = ws.r; ws.r += 2; labelCell(ws.getCell(r, 2), label); labelCell(ws.getCell(r + 1, 2), label);
      cell(r, 3, '=' + f, v, F.eur); cell(r, 4, 0, 0, F.eur); cell(r + 1, 3, '=' + f, v, F.eur); cell(r + 1, 4, '=' + f, v, F.eur);
      return r;
    };
    const be = mark([t('Point mort', 'Break-even'), 'm_BE', beOk ? R.BE : undefined]), you = mark([t('Ton CA', 'Your revenue'), 'm_CA', R.CA]);
    const pt = (i, name, r, v, c) => scatterSer(i, name, numRef(rng('C', r, r + 1), [v, v]), numRef(rng('D', r, r + 1), [0, v]), c, undefined,
      `<c:dLbls><c:dLbl><c:idx val="1"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txPr(900, C.ink, 1)}<c:dLblPos val="t"/>${flags(0, 1)}</c:dLbl>${flags(0, 0)}</c:dLbls>`, true);
    CHARTS.push({ at: 'be', xml: chartXml(t('Point mort', 'Break-even'),
      `<c:scatterChart><c:scatterStyle val="lineMarker"/><c:varyColors val="0"/>${scatterSer(0, t('CA', 'Revenue'), numRef(rng('C', x0, x1), xs), numRef(rng('C', x0, x1), xs), C.ink)}${scatterSer(1, t('Coûts totaux', 'Total costs'), numRef(rng('C', x0, x1), xs), numRef(rng('D', x0, x1), ys), C.coral)}${pt(2, t('Point mort', 'Break-even'), be, beOk ? R.BE : undefined, C.ink)}${pt(3, t('Ton CA', 'Your revenue'), you, R.CA, 'FFC99A12')}<c:axId val="1"/><c:axId val="2"/></c:scatterChart>`
      + valAx(1, 2, 'b', K, { mid: true, min: 0, grid: false, title: t('Chiffre d\'affaires', 'Revenue') }) + valAx(2, 1, 'l', K, { mid: true, min: 0 }), legend([2, 3])) });
    gap(ws);

    // 4. valeur d'entreprise selon le WACC (g fixé), le point actuel en citron
    section(ws, t('Valeur d\'entreprise selon le WACC', 'Enterprise value vs WACC'), ['WACC', t('VE', 'EV')], 3);
    const w0 = ws.r, wacc = [], ev = [];
    for (let i = -3; i <= 3; i++) {
      const r = ws.r++, w = R.WACC + i / 100, e = w > R.gT ? Math.max(0, R.FCFF / (w - R.gT)) : undefined; wacc.push(w); ev.push(e);
      labelCell(ws.getCell(r, 2), i ? `${i > 0 ? '+' : '−'}${Math.abs(i)} pt` : t('actuel', 'current'));
      cell(r, 3, `=m_WACC${i ? (i > 0 ? '+' : '') + i / 100 : ''}`, w, F.pct);
      cell(r, 4, `=IF(C${r}>p_gTerm,MAX(0,m_FCFF/(C${r}-p_gTerm)),NA())`, e, F.eur);
    }
    const w1 = ws.r - 1;
    CHARTS.push({ at: 'ev', xml: chartXml(t('Valeur d\'entreprise selon le WACC', 'Enterprise value vs WACC'),
      `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${lineSer(0, t('VE', 'EV'), numRef(rng('C', w0, w1), wacc, '0.0%'), numRef(rng('D', w0, w1), ev), 3, K)}<c:marker val="1"/><c:axId val="1"/><c:axId val="2"/></c:lineChart>`
      + catAx(1, 2, 'b', { fmt: '0.0%', title: 'WACC' }) + valAx(2, 1, 'l', K)) });
    small(ws, t('« actuel » = WACC du scénario ; sous g, la formule de Gordon n\'a pas de sens (pas de point).', '“current” = the scenario\'s WACC; below g, the Gordon formula is meaningless (no point).'));
  }

  // ---------- graphiques natifs Excel (DrawingML) : ExcelJS n'en écrit pas, withCharts les ajoute au fichier ----------
  const hex = c => c.replace('#', '').slice(-6).toUpperCase(); // 'FFF2C230' ou '#f2c230' → 'F2C230'
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const solid = c => `<a:solidFill><a:srgbClr val="${hex(c)}"/></a:solidFill>`;
  const spPr = (fill, line, w = 9525) => `<c:spPr>${fill ? solid(fill) : '<a:noFill/>'}<a:ln w="${w}">${line ? solid(line) : '<a:noFill/>'}</a:ln></c:spPr>`;
  const font = (sz, c, b = 0) => `<a:defRPr sz="${sz}" b="${b}">${solid(c)}<a:latin typeface="${FONT}"/></a:defRPr>`;
  const txPr = (sz, c, b) => `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr>${font(sz, c, b)}</a:pPr><a:endParaRPr lang="${t('fr-FR', 'en-US')}"/></a:p></c:txPr>`;
  const rich = (s, sz, c, b = 0) => `<c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr>${font(sz, c, b)}</a:pPr><a:r><a:rPr lang="${t('fr-FR', 'en-US')}" sz="${sz}" b="${b}">${solid(c)}<a:latin typeface="${FONT}"/></a:rPr><a:t>${esc(s)}</a:t></a:r></a:p></c:rich></c:tx>`;
  // références de cellules + valeurs en cache (l'aperçu Quick Look affiche le graphique avant tout recalcul)
  const numRef = (f, vals, fmt = 'General') => `<c:numRef><c:f>${esc(f)}</c:f><c:numCache><c:formatCode>${esc(fmt)}</c:formatCode><c:ptCount val="${vals.length}"/>${vals.map((v, i) => (fin(v) === undefined ? '' : `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`)).join('')}</c:numCache></c:numRef>`;
  const strRef = (f, vals) => `<c:strRef><c:f>${esc(f)}</c:f><c:strCache><c:ptCount val="${vals.length}"/>${vals.map((v, i) => `<c:pt idx="${i}"><c:v>${esc(v)}</c:v></c:pt>`).join('')}</c:strCache></c:strRef>`;
  const flags = (val, ser) => `<c:showLegendKey val="0"/><c:showVal val="${val}"/><c:showCatName val="0"/><c:showSerName val="${ser}"/><c:showPercent val="0"/><c:showBubbleSize val="0"/>`;
  const dLbls = (fmt, pos, ser) => `<c:dLbls>${fmt ? `<c:numFmt formatCode="${esc(fmt)}" sourceLinked="0"/>` : ''}<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txPr(900, C.ink, 1)}<c:dLblPos val="${pos}"/>${flags(ser ? 0 : 1, ser ? 1 : 0)}</c:dLbls>`;
  // fill 'none' = série invisible (base du pont) ; pts = une couleur par barre ; liseré blanc = 2 px d'écart entre segments
  const barSer = (i, name, cat, val, fill, pts = [], lbl = '') => `<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:v>${esc(name)}</c:v></c:tx>${fill === 'none' ? spPr(null, null) : spPr(fill || C.ink, C.white, 19050)}<c:invertIfNegative val="0"/>${pts.map((c, k) => `<c:dPt><c:idx val="${k}"/><c:invertIfNegative val="0"/><c:bubble3D val="0"/>${spPr(c, C.white, 19050)}</c:dPt>`).join('')}${lbl}<c:cat>${cat}</c:cat><c:val>${val}</c:val></c:ser>`;
  const scatterSer = (i, name, x, y, line, marker = '<c:marker><c:symbol val="none"/></c:marker>', lbl = '', dash) => `<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:v>${esc(name)}</c:v></c:tx><c:spPr><a:ln w="${dash ? 19050 : 28575}" cap="rnd">${solid(line)}${dash ? '<a:prstDash val="dash"/>' : ''}</a:ln></c:spPr>${marker}${lbl}<c:xVal>${x}</c:xVal><c:yVal>${y}</c:yVal><c:smooth val="0"/></c:ser>`;
  // courbe : points encre, le point « hot » agrandi en citron et étiqueté
  const lineSer = (i, name, cat, val, hot, fmt) => `<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:v>${esc(name)}</c:v></c:tx><c:spPr><a:ln w="28575" cap="rnd">${solid(C.ink)}<a:round/></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="6"/>${spPr(C.ink, C.white)}</c:marker><c:dPt><c:idx val="${hot}"/><c:marker><c:symbol val="circle"/><c:size val="11"/>${spPr(C.lemon, C.ink, 19050)}</c:marker><c:bubble3D val="0"/></c:dPt><c:dLbls><c:dLbl><c:idx val="${hot}"/><c:numFmt formatCode="${esc(fmt)}" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txPr(900, C.ink, 1)}<c:dLblPos val="t"/>${flags(1, 0)}</c:dLbl>${flags(0, 0)}</c:dLbls><c:cat>${cat}</c:cat><c:val>${val}</c:val><c:smooth val="0"/></c:ser>`;
  const axTitle = s => `<c:title>${rich(s, 900, C.muted)}<c:overlay val="0"/></c:title>`;
  const catAx = (id, cross, pos, o = {}) => `<c:catAx><c:axId val="${id}"/><c:scaling><c:orientation val="${o.rev ? 'maxMin' : 'minMax'}"/></c:scaling><c:delete val="0"/><c:axPos val="${pos}"/>${o.title ? axTitle(o.title) : ''}${o.fmt ? `<c:numFmt formatCode="${esc(o.fmt)}" sourceLinked="0"/>` : ''}<c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="low"/><c:spPr><a:ln w="9525">${solid(C.line)}</a:ln></c:spPr>${txPr(900, C.muted)}<c:crossAx val="${cross}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>`;
  const valAx = (id, cross, pos, fmt, o = {}) => `<c:valAx><c:axId val="${id}"/><c:scaling><c:orientation val="minMax"/>${o.min !== undefined ? `<c:min val="${o.min}"/>` : ''}</c:scaling><c:delete val="${o.hide ? 1 : 0}"/><c:axPos val="${pos}"/>${o.grid === false ? '' : `<c:majorGridlines><c:spPr><a:ln w="6350">${solid('E3EBE8')}</a:ln></c:spPr></c:majorGridlines>`}${o.title ? axTitle(o.title) : ''}<c:numFmt formatCode="${esc(fmt)}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:noFill/></a:ln></c:spPr>${txPr(900, C.muted)}<c:crossAx val="${cross}"/><c:crosses val="autoZero"/><c:crossBetween val="${o.mid ? 'midCat' : 'between'}"/></c:valAx>`;
  const legend = (hide = []) => `<c:legend><c:legendPos val="b"/>${hide.map(i => `<c:legendEntry><c:idx val="${i}"/><c:delete val="1"/></c:legendEntry>`).join('')}<c:overlay val="0"/>${txPr(900, C.muted)}</c:legend>`;
  const chartXml = (title, plot, leg = '') => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    + '<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + `<c:roundedCorners val="0"/><c:chart><c:title>${rich(title, 1200, C.ink, 1)}<c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/><c:plotArea><c:layout/>${plot}<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr></c:plotArea>${leg}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart>`
    + `${spPr(C.white, C.line)}${txPr(900, C.ink)}</c:chartSpace>`;

  // curseurs = contrôles de formulaire « barre de défilement », écrits comme Excel les écrit lui-même (relevé sur un curseur
  // inséré à la main) : VML historique + propriétés ctrlProp + bloc <controls> de la feuille + forme cachée dans le dessin.
  // Colonne C du Simulateur, de 4 à 183 px ; flèches de 15 px (dx) comme un curseur natif.
  const XDR = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing', MC = 'http://schemas.openxmlformats.org/markup-compatibility/2006';
  const vml = list => '<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">'
    + '<o:shapelayout v:ext="edit"><o:idmap v:ext="edit" data="1"/></o:shapelayout><v:shapetype id="_x0000_t201" coordsize="21600,21600" o:spt="201" path="m,l,21600r21600,l21600,xe"><v:stroke joinstyle="miter"/><v:path shadowok="f" o:extrusionok="f" strokeok="f" fillok="f" o:connecttype="rect"/><o:lock v:ext="edit" shapetype="t"/></v:shapetype>'
    + list.map((s, i) => `<v:shape id="_x0000_s${1025 + i}" type="#_x0000_t201" style="position:absolute;margin-left:220pt;margin-top:${s.top}pt;width:152pt;height:15pt;z-index:${i + 1}" o:insetmode="auto"><o:lock v:ext="edit" rotation="t" text="t"/><x:ClientData ObjectType="Scroll"><x:Anchor>2, 4, ${s.row}, 3, 2, 183, ${s.row}, 21</x:Anchor><x:PrintObject>False</x:PrintObject><x:AutoFill>False</x:AutoFill><x:FmlaLink>${s.link}</x:FmlaLink><x:Val>${s.val}</x:Val><x:Min>0</x:Min><x:Max>${s.max}</x:Max><x:Inc>1</x:Inc><x:Page>${s.page}</x:Page><x:Horiz/><x:Dx>15</x:Dx></x:ClientData></v:shape>`).join('')
    + '</xml>';
  const emu = px => px * 12700, spot = (c, x, r, y) => `<xdr:col>${c}</xdr:col><xdr:colOff>${emu(x)}</xdr:colOff><xdr:row>${r}</xdr:row><xdr:rowOff>${emu(y)}</xdr:rowOff>`;
  const ctrlAnchor = s => `<from>${spot(2, 4, s.row, 3)}</from><to>${spot(2, 183, s.row, 21)}</to>`;
  const ctrlProp = s => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<formControlPr xmlns="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" objectType="Scroll" dx="15" fmlaLink="${s.link}" horiz="1" max="${s.max}" page="${s.page}" val="${s.val}"/>`;
  const controls = list => `<mc:AlternateContent xmlns:mc="${MC}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" xmlns:xdr="${XDR}"><mc:Choice Requires="x14"><controls>`
    + list.map((s, i) => `<mc:AlternateContent><mc:Choice Requires="x14"><control shapeId="${1025 + i}" r:id="rIdCtrl${i + 1}" name="Scroll Bar ${i + 1}"><controlPr defaultSize="0" print="0" autoFill="0" autoPict="0"><anchor moveWithCells="1">${ctrlAnchor(s)}</anchor></controlPr></control></mc:Choice></mc:AlternateContent>`).join('')
    + '</controls></mc:Choice></mc:AlternateContent>';
  const ctrlShapes = list => list.map((s, i) => `<mc:AlternateContent xmlns:mc="${MC}"><mc:Choice xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" Requires="a14"><xdr:twoCellAnchor editAs="oneCell"><xdr:from>${spot(2, 4, s.row, 3)}</xdr:from><xdr:to>${spot(2, 183, s.row, 21)}</xdr:to><xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="${1025 + i}" name="Scroll Bar ${i + 1}" hidden="1"><a:extLst><a:ext uri="{63B3BB69-23CF-44E3-9099-C40C66FF867C}"><a14:compatExt spid="_x0000_s${1025 + i}"/></a:ext></a:extLst></xdr:cNvPr><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln w="9525"><a:miter lim="800000"/></a:ln></xdr:spPr></xdr:sp><xdr:clientData/></xdr:twoCellAnchor></mc:Choice><mc:Fallback/></mc:AlternateContent>`).join('');

  // après ExcelJS : graphiques dans les dessins des onglets (créés pour le logo et le store) et curseurs du Simulateur
  async function withCharts(buf) {
    const zip = await JSZip.loadAsync(buf), get = p => zip.file(p).async('string');
    const wbx = await get('xl/workbook.xml'), wrels = await get('xl/_rels/workbook.xml.rels'), rels = p => p.replace(/[^/]+$/, '_rels/$&.rels');
    const sheetOf = name => 'xl/' + wrels.match(new RegExp(`Id="${wbx.match(new RegExp(`<sheet [^>]*name="${esc(name)}"[^>]*r:id="([^"]+)"`))[1]}"[^>]*Target="(?:/xl/)?([^"]+)"`))[1];
    const drawings = {};
    const drawing = async name => {
      if (drawings[name]) return drawings[name];
      const path = 'xl/' + (await get(rels(sheetOf(name)))).match(/drawing" Target="\.\.\/([^"]+)"/)[1];
      return (drawings[name] = { path, xml: await get(path), rels: await get(rels(path)) });
    };
    let ct = await get('[Content_Types].xml');
    const cell = (c, r) => `<xdr:col>${c}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${r}</xdr:row><xdr:rowOff>0</xdr:rowOff>`;
    for (const [i, { at, xml }] of CHARTS.entries()) {
      const n = i + 1, id = `rIdChart${n}`, { sheet, c0, r0, c1, r1 } = ANCH[at], d = await drawing(sheet);
      zip.file(`xl/charts/chart${n}.xml`, xml);
      d.rels = d.rels.replace('</Relationships>', `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${n}.xml"/></Relationships>`);
      ct = ct.replace('</Types>', `<Override PartName="/xl/charts/chart${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>`);
      d.xml = d.xml.replace('</xdr:wsDr>', `<xdr:twoCellAnchor editAs="oneCell"><xdr:from>${cell(c0, r0)}</xdr:from><xdr:to>${cell(c1, r1)}</xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${1000 + n}" name="Chart ${n}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${id}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`);
    }
    if (SLIDERS.length) {
      const s = sheetOf(SH.hyp), REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
      const d = await drawing(SH.hyp); d.xml = d.xml.replace('</xdr:wsDr>', ctrlShapes(SLIDERS) + '</xdr:wsDr>');
      zip.file('xl/drawings/vmlSliders.vml', vml(SLIDERS));
      SLIDERS.forEach((x, i) => {
        zip.file(`xl/ctrlProps/ctrlProp${i + 1}.xml`, ctrlProp(x));
        ct = ct.replace('</Types>', `<Override PartName="/xl/ctrlProps/ctrlProp${i + 1}.xml" ContentType="application/vnd.ms-excel.controlproperties+xml"/></Types>`);
      });
      zip.file(rels(s), (await get(rels(s))).replace('</Relationships>', `<Relationship Id="rIdSliders" Type="${REL}vmlDrawing" Target="../drawings/vmlSliders.vml"/>`
        + SLIDERS.map((x, i) => `<Relationship Id="rIdCtrl${i + 1}" Type="${REL}ctrlProp" Target="../ctrlProps/ctrlProp${i + 1}.xml"/>`).join('') + '</Relationships>'));
      zip.file(s, (await get(s)).replace(/(<drawing r:id="[^"]+"\/>)/, `$1<legacyDrawing r:id="rIdSliders"/>${controls(SLIDERS)}`));
      if (!ct.includes('Extension="vml"')) ct = ct.replace('</Types>', '<Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing"/></Types>');
    }
    for (const d of Object.values(drawings)) { zip.file(d.path, d.xml); zip.file(rels(d.path), d.rels); }
    zip.file('[Content_Types].xml', ct);
    return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
  }

  // ---------- assemblage, téléchargement, bouton ----------
  const lib = (src, name) => window[name] || new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src;
    s.onload = res; s.onerror = () => { s.remove(); rej(new Error(name + ' indisponible')); };
    document.head.appendChild(s);
  });
  async function workbook(first) { // first : nom d'un onglet à placer en tête (aperçus de test uniquement)
    await Promise.all([lib('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js', 'ExcelJS'), lib('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'JSZip')]);
    const R = compute(S); CA0 = R.CA;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Daily Zest'; wb.created = new Date();
    wb.calcProperties.fullCalcOnLoad = true;
    const logo = new Image(); logo.src = 'data:image/png;base64,' + LOGO; await logo.decode();
    Object.assign(IMG, { wb, aw: {}, logo: wb.addImage({ base64: pixels(logo, 192, 192), extension: 'png' }) });
    for (const k in ANCH) delete ANCH[k];
    CHARTS.length = SLIDERS.length = 0;
    const builds = [dashboard, hypotheses, pnl, bilan, flux, cashflows, valorisation, kpis, activite, graphiques];
    if (first) builds.unshift(...builds.splice(builds.findIndex(f => f.name === first), 1));
    for (const build of builds) build(wb, S, R);
    // ExcelJS écrit les noms en Hypothèses!$C$5 sans guillemets : Excel rejette alors TOUS les noms (accents, espaces).
    // ponytail: rustine sur le getter interne de la v4.4.0, à retirer si une version future cite les feuilles.
    const dn = wb.definedNames, model = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(dn), 'model');
    Object.defineProperty(dn, 'model', { configurable: true, set: model.set,
      get: () => model.get.call(dn).map(d => ({ ...d, ranges: d.ranges.map(r => r.replace(/^([^'!][^!]*)!/, "'$1'!")) })) });
    return withCharts(await wb.xlsx.writeBuffer());
  }
  window.dailyZestWorkbook = workbook; // aussi utilisé pour vérifier le fichier hors navigateur

  const btn = document.getElementById('xl-btn');
  if (btn) btn.addEventListener('click', async () => {
    if (btn.getAttribute('aria-busy') === 'true') return;
    const label = btn.textContent;
    btn.setAttribute('aria-busy', 'true'); btn.textContent = t('Préparation…', 'Preparing…');
    try {
      const buf = await workbook();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      a.download = `Daily-Zest_${t('FR', 'EN')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      btn.textContent = label;
    } catch (e) {
      console.error(e); btn.textContent = t('Échec, réessaie', 'Failed, try again');
      setTimeout(() => (btn.textContent = label), 2500);
    } finally { btn.removeAttribute('aria-busy'); }
  });
})();
