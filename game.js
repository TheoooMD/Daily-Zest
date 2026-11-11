// Daily Zest — modèle financier annuel + panneau de paramètres + formules + graphiques.
// Tout passe par compute(S) (pure), ce qui permet de recalculer la sensibilité ±10 % de chaque paramètre.

const PRODUCTS = [
  { id: 'citron', name: t('Citronnade', 'Lemonade'),      color: '#f2c230', price: 3.0, cost: 0.45, w: 1.0, capex: 0,    unit: t('verre', 'glass') },
  { id: 'fraise', name: t('Limonade fraise', 'Strawberry lemonade'), color: '#e8566b', price: 3.5, cost: 0.80, w: 0.8, capex: 600,  unit: t('verre', 'glass') },
  { id: 'cafe',   name: t('Café', 'Coffee'),            color: '#7a4a2e', price: 2.2, cost: 0.35, w: 1.2, capex: 2500, unit: t('tasse', 'cup') },
  { id: 'the',    name: t('Thé glacé', 'Iced tea'),       color: '#8cc56b', price: 3.2, cost: 0.55, w: 0.6, capex: 400,  unit: t('verre', 'glass') },
  { id: 'cookie', name: 'Cookie',          color: '#c98a4a', price: 2.5, cost: 0.60, w: 0.7, capex: 900,  unit: t('pièce', 'piece') },
];

// [key, label, min, max, step, default, format, hint]
const SECTIONS = [
  [t('Trafic & ventes', 'Traffic & sales'), [
    ['stands', t('Nombre de stands', 'Number of stands'), 1, 3, 1, 1, 'int', t('Chaque stand a son équipe, son loyer et son capex.', 'Each stand has its own team, rent and capex.')],
    ['days', t('Jours d\'ouverture / an', 'Opening days / year'), 120, 360, 5, 220, 'int'],
    ['hours', t('Heures d\'ouverture / jour', 'Opening hours / day'), 4, 14, 1, 8, 'h'],
    ['passants', t('Passants / heure', 'Passers-by / hour'), 10, 300, 5, 80, 'int'],
    ['conv', t('Taux de conversion', 'Conversion rate'), 5, 60, 1, 25, 'pct'],
    ['items', t('Articles par client', 'Items per customer'), 1, 3, 0.1, 1.2, 'x1'],
    ['elast', t('Élasticité-prix de la demande', 'Price elasticity of demand'), 0.1, 3, 0.1, 1.3, 'x1', t('Si le prix monte de 1 %, la demande baisse de ~élasticité %. Au-delà du prix plafond, plus personne n\'achète.', 'If price rises 1%, demand falls by ~elasticity %. Above the ceiling price, nobody buys.')],
    ['gamme', t('Effet gamme (trafic par produit en +)', 'Range effect (traffic per extra product)'), 0, 30, 1, 12, 'pct'],
    ['newPct', t('Part de nouveaux clients', 'Share of new customers'), 5, 60, 1, 20, 'pct'],
  ]],
  [t('Carte des produits', 'Product menu'), 'PRODUCTS'],
  [t('Coût des marchandises (COGS)', 'Cost of goods sold (COGS)'), [
    ['cup', t('Gobelet + glace / article', 'Cup + ice / item'), 0, 0.5, 0.01, 0.15, 'eur2'],
    ['waste', t('Gâchis (food wastage)', 'Food wastage'), 0, 25, 1, 5, 'pct'],
    ['dio', t('Stock moyen (jours de COGS)', 'Average inventory (days of COGS)'), 1, 30, 1, 5, 'j'],
  ]],
  [t('Équipe', 'Team'), [
    ['staff', t('Employés par stand', 'Staff per stand'), 1, 5, 1, 2, 'int'],
    ['wage', t('Salaire horaire brut', 'Gross hourly wage'), 10, 25, 0.5, 12, 'eur2'],
    ['charges', t('Charges patronales', 'Employer payroll taxes'), 20, 60, 1, 42, 'pct'],
    ['prod', t('Articles servis / employé / h', 'Items served / employee / h'), 10, 60, 1, 30, 'int', t('Capacité : au-delà, la file déborde et des ventes sont perdues.', 'Capacity: beyond it, the queue overflows and sales are lost.')],
    ['turn', t('Turnover employés / an', 'Staff turnover / year'), 0, 150, 5, 30, 'pct'],
    ['recruit', t('Coût d\'un recrutement', 'Cost per hire'), 0, 3000, 50, 600, 'eur'],
  ]],
  [t('Places assises', 'Seating'), [
    ['seats', t('Places par stand', 'Seats per stand'), 0, 12, 1, 4, 'int'],
    ['sitPct', t('Clients qui s\'assoient', 'Customers who sit down'), 0, 80, 5, 30, 'pct'],
    ['sitMin', t('Durée assise (min)', 'Time seated (min)'), 5, 60, 5, 20, 'int'],
  ]],
  [t('Frais fixes', 'Fixed costs'), [
    ['rent', t('Loyer / stand / mois', 'Rent / stand / month'), 0, 2000, 50, 500, 'eur'],
    ['mkt', t('Marketing / mois', 'Marketing / month'), 0, 3000, 50, 300, 'eur'],
    ['other', t('Énergie, assurance… / stand / mois', 'Energy, insurance… / stand / month'), 0, 1000, 25, 200, 'eur'],
    ['card', t('Frais carte bancaire', 'Card processing fees'), 0, 4, 0.1, 1.5, 'pct1'],
  ]],
  [t('Investissement (capex)', 'Investment (capex)'), [
    ['standCost', t('Coût d\'un stand', 'Cost of a stand'), 1000, 30000, 500, 8000, 'eur'],
    ['life', t('Durée d\'amortissement', 'Depreciation period'), 1, 10, 1, 5, 'ans'],
    ['capexRatio', t('Capex annuel / D&A', 'Annual capex / D&A'), 0, 3, 0.1, 1, 'x1', t('1,0× = on remplace exactement ce qui s\'use.', '1.0× = we replace exactly what wears out.')],
  ]],
  [t('BFR (besoin en fonds de roulement)', 'Working capital (WC)'), [
    ['dso', t('Délai clients (DSO)', 'Customer payment terms (DSO)'), 0, 30, 1, 1, 'j'],
    ['dpo', t('Délai fournisseurs (DPO)', 'Supplier payment terms (DPO)'), 0, 90, 5, 30, 'j'],
    ['growth', t('Croissance du CA attendue', 'Expected revenue growth'), -20, 50, 1, 5, 'pct'],
  ]],
  [t('Impôt & dette', 'Tax & debt'), [
    ['tax', t('Taux d\'IS', 'Corporate tax rate'), 0, 40, 1, 25, 'pct', t('Aucun impôt négatif ni report de pertes. La déduction des intérêts est limitée au bénéfice taxable de l\'année.', 'No tax refunds or loss carryforwards. Interest deductions are limited to this year\'s taxable profit.')],
    ['debt', t('Dette financière', 'Financial debt'), 0, 100000, 1000, 5000, 'eur', t('Dette au bilan d\'ouverture. Les intérêts du modèle portent sur la dette brute d\'ouverture ; la trésorerie excédentaire n\'est pas rémunérée. Les coûts de faillite ne sont pas modélisés.', 'Opening gross debt on the balance sheet. Modeled interest is on gross debt; excess cash earns no interest. Financial distress costs are not modeled.')],
    ['kd', t('Taux d\'intérêt (Kd)', 'Interest rate (Kd)'), 0, 15, 0.5, 6, 'pct1', t('Intérêts annuels = dette brute d\'ouverture × Kd ; aucune variation infra-annuelle de dette modélisée.', 'Annual interest = opening gross debt × Kd; no intra-year debt movements modeled.')],
    ['repay', t('Remboursement net / an', 'Net repayment / year'), -20000, 20000, 500, 2000, 'eur', t('Négatif = on emprunte davantage. Plafonné à la dette.', 'Negative = we borrow more. Capped at the debt.')],
  ]],
  [t('WACC & valorisation', 'WACC & valuation'), [
    ['rf', t('Taux sans risque (Rf)', 'Risk-free rate (Rf)'), 0, 6, 0.1, 3, 'pct1'],
    ['beta', t('Bêta désendetté (βu)', 'Unlevered beta (βu)'), 0.3, 2.5, 0.05, 1.0, 'x2', t('Le risque de l\'activité seule. Avec de la dette, βL = βu × (1 + (1 − t_eff) × D/E), où t_eff reflète le bouclier fiscal utilisable cette année.', 'Business risk alone. With debt, βL = βu × (1 + (1 − t_eff) × D/E), where t_eff reflects the tax shield usable this year.')],
    ['mrp', t('Prime de risque marché', 'Market risk premium'), 3, 9, 0.1, 6, 'pct1'],
    ['size', t('Prime taille / illiquidité', 'Size / illiquidity premium'), 0, 8, 0.5, 4, 'pct1'],
    ['gTerm', t('Croissance perpétuelle (g)', 'Terminal growth (g)'), 0, 5, 0.1, 2, 'pct1'],
  ]],
];

// flat param table, products expanded
const PARAMS = {};
for (const [sec, list] of SECTIONS) {
  if (list === 'PRODUCTS') {
    for (const p of PRODUCTS) {
      PARAMS[p.id + '_price'] = { label: t('Prix de vente', 'Selling price'), min: 0.5, max: 8, step: 0.1, def: p.price, fmt: 'eur2', sec, prod: p.id };
      PARAMS[p.id + '_cost'] = { label: t(`Coût matière / ${p.unit}`, `Ingredient cost / ${p.unit}`), min: 0.05, max: 3, step: 0.05, def: p.cost, fmt: 'eur2', sec, prod: p.id };
      PARAMS[p.id + '_w'] = { label: t('Popularité (poids dans le mix)', 'Popularity (weight in mix)'), min: 0.1, max: 3, step: 0.1, def: p.w, fmt: 'x1', sec, prod: p.id };
    }
    continue;
  }
  for (const [k, label, min, max, step, def, fmt, hint] of list) PARAMS[k] = { label, min, max, step, def, fmt, hint, sec };
}

function defaults() {
  const S = {};
  for (const k in PARAMS) S[k] = PARAMS[k].def;
  for (const p of PRODUCTS) S[p.id + '_on'] = p.id === 'citron';
  return S;
}

// ---------- the model ----------
// Demande linéaire, calée pour que l'élasticité au prix de référence vaille le curseur : 1 au prix de référence,
// 0 au prix plafond = réf × (1 + 1/élasticité). (Une élasticité constante laissait le CA monter sans fin.)
const demandFactor = (ref, price, e) => Math.max(0, 1 - e * (price - ref) / ref);
const chokePrice = (ref, e) => ref * (1 + 1 / e);
// Économie d'IS effectivement utilisable sur les intérêts courants (aucun report de pertes).
const usableTaxShield = (EBIT, interest, taxRate) => taxRate * (Math.max(0, EBIT) - Math.max(0, EBIT - interest));

function compute(S) {
  const pct = k => S[k] / 100;
  const prods = PRODUCTS.filter(p => S[p.id + '_on']);
  const n = prods.length;
  const hoursYr = S.days * S.hours;
  const clientsH = S.passants * pct('conv') * (1 + pct('gamme') * Math.max(0, n - 1)); // par stand
  const sumW = prods.reduce((a, p) => a + S[p.id + '_w'], 0) || 1;

  let demandH = 0, mixFactor = 0;
  const lines = prods.map(p => {
    const share = S[p.id + '_w'] / sumW;
    const df = demandFactor(p.price, S[p.id + '_price'], S.elast); // demande vs prix de référence
    const dH = clientsH * S.items * share * df;
    demandH += dH; mixFactor += share * df;
    return { p, price: S[p.id + '_price'], cost: S[p.id + '_cost'], dH };
  });
  const capH = S.staff * S.prod;
  const served = demandH > 0 ? Math.min(1, capH / demandH) : 1;
  const k = hoursYr * S.stands * served;

  let CA = 0, matter = 0, units = 0;
  for (const l of lines) {
    l.units = l.dH * k; l.CA = l.units * l.price;
    units += l.units; CA += l.CA; matter += l.units * (l.cost + S.cup);
  }
  const customers = clientsH * mixFactor * k;
  const lostUnits = demandH * hoursYr * S.stands * (1 - served);
  const wasteCost = matter * pct('waste');
  const COGS = matter + wasteCost;
  const MB = CA - COGS;

  const staffHours = S.staff * S.stands * hoursYr;
  const payroll = staffHours * S.wage * (1 + pct('charges'));
  const turnCost = S.staff * S.stands * pct('turn') * S.recruit;
  const rent = S.rent * 12 * S.stands, mkt = S.mkt * 12, other = S.other * 12 * S.stands;
  const cardFees = CA * pct('card');
  const opex = payroll + turnCost + rent + mkt + other + cardFees;
  const EBITDA = MB - opex;

  const capexInit = S.stands * (S.standCost + prods.reduce((a, p) => a + p.capex, 0));
  const DA = capexInit / S.life;
  const EBIT = EBITDA - DA;
  const interest = S.debt * pct('kd');
  const EBT = EBIT - interest;
  const t = pct('tax');
  const IS = Math.max(0, EBT) * t;
  const RN = EBT - IS;
  const NOPAT = EBIT - Math.max(0, EBIT) * t;
  // Bouclier fiscal utilisable cette année uniquement ; l'IS opérationnel du FCFF reste calculé avant financement.
  const taxShield = usableTaxShield(EBIT, interest, t);
  const taxShieldRate = interest > 0 ? taxShield / interest : 0;

  const capex = DA * S.capexRatio;
  const stock = COGS * S.dio / 365, recv = CA * S.dso / 365, pay = COGS * S.dpo / 365;
  const BFR = stock + recv - pay;
  const g = pct('growth');
  const dBFR = BFR * g / (1 + g);
  const FCFF = NOPAT + DA - capex - dBFR;
  const CFO = RN + DA - dBFR;
  const FCF = CFO - capex;
  const repay = Math.min(S.repay, S.debt); // on ne rembourse pas plus que la dette (négatif = nouvel emprunt)
  const FCFE = FCF - repay; // cohérent avec le cash réellement généré (pas de créance d'impôt modélisée en cas de perte)

  // Financement d'ouverture : cash excédentaire = emprunt brut − capex − BFR d'ouverture ; il n'est pas rémunéré.
  const grossDebt = S.debt;
  const cash0 = Math.max(0, grossDebt - (capexInit + BFR / (1 + g)));
  const netDebt = grossDebt - cash0;
  // VE à l'ouverture (convention dette nette, standard en évaluation) : FCFF de l'année = premier flux de Gordon.
  // D/V = dette nette ÷ VE, Hamada sur dette nette ÷ equity, Kd après impôt au taux effectif du bouclier.
  // WACC = Ku + D/V × (A − Ku) avec A = (1 − t_eff) × βu × PRM + KdAT, d'où une forme fermée sans circularité :
  // VE₀ = (FCFF₁ + dette nette × (Ku − A)) ÷ (Ku − g). FCFF ≤ 0 : le stand ne vaut rien (on le fermerait).
  const D = netDebt, kdAT = pct('kd') * (1 - taxShieldRate), gT = pct('gTerm');
  const ku = pct('rf') + S.beta * pct('mrp') + pct('size');
  const A = (1 - taxShieldRate) * S.beta * pct('mrp') + kdAT;
  const EVraw = ku > gT && FCFF > 0 ? (FCFF + D * (ku - A)) / (ku - gT) : NaN;
  const EV = FCFF <= 0 ? 0 : isFinite(EVraw) ? Math.max(0, EVraw) : NaN;
  const equity = isFinite(EV) ? Math.max(0, EV - D) : NaN; // responsabilité limitée
  const hasCapitalStructure = FCFF > 0 && isFinite(EV) && EV > 0 && equity > 0;
  const dv = hasCapitalStructure ? D / EV : NaN;
  const betaL = hasCapitalStructure ? S.beta * (1 + (1 - taxShieldRate) * D / equity) : NaN;
  const ke = pct('rf') + betaL * pct('mrp') + pct('size');
  const WACC = (1 - dv) * ke + dv * kdAT;
  const investedInitial = capexInit + BFR / (1 + g); // capex + BFR d'ouverture, cohérent avec le bilan initial
  const invested = capexInit + BFR; // capital d'exploitation en année de croisière, base du ROIC
  const NPV = EV - investedInitial; // VAN du projet à l'ouverture
  const ROIC = invested > 0 ? NOPAT / invested : NaN;

  const varRate = CA ? (COGS + cardFees) / CA : 0;
  const fixed = payroll + turnCost + rent + mkt + other + DA;
  const BE = varRate < 1 ? fixed / (1 - varRate) : Infinity;
  const avgPrice = units ? CA / units : 0;
  const BEday = avgPrice ? BE / avgPrice / (S.days * S.stands) : Infinity;
  const seatHours = S.seats * S.stands * hoursYr;
  const tableTurn = seatHours ? customers * pct('sitPct') / seatHours : 0;
  const newClients = customers * pct('newPct');

  return {
    n, lines, hoursYr, clientsH, demandH, capH, served, units, customers, lostUnits,
    CA, matter, wasteCost, COGS, MB, MBpct: CA ? MB / CA : 0,
    payroll, turnCost, rent, mkt, other, cardFees, opex, EBITDA, capexInit, DA, EBIT, interest, EBT, IS, RN, NOPAT, t, taxShield, taxShieldRate,
    capex, stock, recv, pay, BFR, dBFR, FCFF, CFO, FCF, FCFE,
    ku, dv, betaL, ke, kdAT, WACC, gT, EV, equity, NPV, cash0, grossDebt, netDebt, repay, investedInitial, invested,
    varRate, fixed, BE, BEday, avgPrice,
    ticket: customers ? CA / customers : 0,
    revpash: seatHours ? CA / seatHours : 0, seatHours, tableTurn, occupancy: tableTurn * S.sitMin / 60,
    laborPct: CA ? payroll / CA : 0,
    CAC: newClients ? mkt / newClients : 0,
    invTurn: stock ? COGS / stock : 0,
    foodPct: CA ? COGS / CA : 0,
    ROIC,
  };
}

// ---------- formatting ----------
const nf0 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const EN = LANG === 'en';
// fr : 127,2 k€ · 950 € · 25,0 %   en : $127.2k · $950 · 25.0% (la version anglaise compte en dollars)
const euro = (n, u = '') => (EN ? n.replace(/^(-?)/, '$1$$') + u : `${n} ${u}€`);
const eur = x => !isFinite(x) ? '—' : Math.abs(x) >= 1e6 ? euro(nf2.format(x / 1e6), 'M') : Math.abs(x) >= 1e4 ? euro(nf1.format(x / 1e3), 'k') : euro(nf0.format(x));
const eurS = x => !isFinite(x) ? '—' : Math.abs(x) >= 1e6 ? nf1.format(x / 1e6) + 'M' : Math.abs(x) >= 1e3 ? nf0.format(x / 1e3) + 'k' : nf0.format(x);
const eur2 = x => euro(nf2.format(x));
const PCT = EN ? '%' : ' %';
const pc = x => !isFinite(x) ? '—' : nf1.format(x * 100) + PCT;
const fmtParam = (v, f) => ({
  int: nf0.format(v), h: v + ' h', j: v + t(' j', ' d'), ans: v + t(' ans', ' yrs'), pct: nf0.format(v) + PCT, pct1: nf1.format(v) + PCT,
  eur: euro(nf0.format(v)), eur2: eur2(v), x1: nf1.format(v) + '×', x2: nf2.format(v),
})[f];

// ---------- formulas (left panel) ----------
const METRICS = [
  [t('Compte de résultat', 'Income statement'), [
    { k: 'CA', name: t('Chiffre d\'affaires', 'Revenue'), fx: t('CA = Σ (articles vendus × prix)', 'Revenue = Σ (items sold × price)'), num: R => R.lines.map(l => `${nf0.format(l.units)} × ${eur2(l.price)}`).join(' + ') || '0', note: t('Volume × prix. Le volume est plafonné par la capacité de service de l\'équipe.', 'Volume × price. Volume is capped by the team\'s serving capacity.') },
    { k: 'COGS', name: 'COGS', fx: t('COGS = Σ articles × (coût matière + gobelet) × (1 + gâchis)', 'COGS = Σ items × (ingredient cost + cup) × (1 + wastage)'), num: (R, S) => `${eur(R.matter)} × (1 + ${S.waste}${PCT})`, note: t('Cost of goods sold : ce que coûte la matière de ce que tu as vendu.', 'Cost of goods sold: what the ingredients of what you sold cost.') },
    { k: 'MB', name: t('Marge brute', 'Gross margin'), fx: t('Marge brute = CA − COGS', 'Gross margin = Revenue − COGS'), num: R => `${eur(R.CA)} − ${eur(R.COGS)}  (${pc(R.MBpct)} ${t('du CA', 'of revenue')})`, note: t('Ce qui reste pour payer l\'équipe, le loyer et tout le reste.', 'What is left to pay the team, the rent and everything else.') },
    { k: 'EBITDA', name: 'EBITDA', fx: t('EBITDA = Marge brute − salaires − loyers − marketing − autres − frais CB', 'EBITDA = Gross margin − wages − rent − marketing − other − card fees'), num: R => `${eur(R.MB)} − ${eur(R.payroll + R.turnCost)} − ${eur(R.rent)} − ${eur(R.mkt)} − ${eur(R.other)} − ${eur(R.cardFees)}`, note: t('La rentabilité opérationnelle avant amortissements, intérêts et impôt.', 'Operating profitability before depreciation, interest and tax.') },
    { k: 'EBIT', name: 'EBIT', fx: t('EBIT = EBITDA − D&A,  D&A = capex initial ÷ durée', 'EBIT = EBITDA − D&A,  D&A = initial capex ÷ useful life'), num: (R, S) => `${eur(R.EBITDA)} − ${eur(R.capexInit)} ÷ ${S.life} ${t('ans', 'yrs')}`, note: t('Le résultat d\'exploitation : l\'usure du matériel est maintenant comptée.', 'Operating profit: equipment wear is now accounted for.') },
    { k: 'RN', name: t('Résultat net', 'Net income'), fx: t('RN = (EBIT − intérêts) − IS,  IS = t × (EBIT − intérêts)', 'Net income = (EBIT − interest) − tax,  tax = t × (EBIT − interest)'), num: R => `(${eur(R.EBIT)} − ${eur(R.interest)}) − ${eur(R.IS)}`, note: t('Ce qui revient aux actionnaires, en comptabilité. Pas encore du cash.', 'What accrues to shareholders, in accounting terms. Not cash yet.') },
  ]],
  [t('Cash-flows', 'Cash flows'), [
    { k: 'FCF', name: 'Free cash flow', fx: t('FCF = RN + D&A − ΔBFR − capex', 'FCF = Net income + D&A − ΔWC − capex'), num: R => `${eur(R.RN)} + ${eur(R.DA)} − ${eur(R.dBFR)} − ${eur(R.capex)}`, note: t('Le cash réellement généré une fois l\'investissement payé.', 'The cash actually generated once investment is paid for.') },
    { k: 'FCFF', name: 'FCFF', fx: t('FCFF = EBIT × (1 − t) + D&A − capex − ΔBFR', 'FCFF = EBIT × (1 − t) + D&A − capex − ΔWC'), num: (R, S) => `${eur(R.EBIT)} × (1 − ${S.tax}${PCT}) + ${eur(R.DA)} − ${eur(R.capex)} − ${eur(R.dBFR)}`, note: t('Cash pour tous les financeurs (dette + actions). On l\'actualise au WACC.', 'Cash for all capital providers (debt + equity). Discounted at the WACC.') },
    { k: 'FCFE', name: 'FCFE', fx: t('FCFE = FCF − remboursement net (pas de créance d\'impôt sur les pertes)', 'FCFE = FCF − net repayment (no tax refund asset on losses)'), num: R => `${eur(R.FCF)} − ${eur(R.repay)}`, note: t('Cash pour les seuls actionnaires. On l\'actualise au coût des fonds propres Ke.', 'Cash for shareholders only. Discounted at the cost of equity Ke.') },
    { k: 'dBFR', name: t('Variation du BFR', 'Change in working capital'), fx: t('BFR = stock + créances − dettes fournisseurs ;  ΔBFR = BFR × g ÷ (1 + g)', 'WC = inventory + receivables − payables;  ΔWC = WC × g ÷ (1 + g)'), num: (R, S) => `(${eur(R.stock)} + ${eur(R.recv)} − ${eur(R.pay)}) × ${S.growth}${PCT} ÷ (1 + ${S.growth}${PCT})`, note: t('Payer ses fournisseurs à 30 j en encaissant cash crée un BFR négatif : la croissance génère du cash.', 'Paying suppliers at 30 days while collecting cash creates negative working capital: growth generates cash.') },
  ]],
  [t('Valorisation', 'Valuation'), [
    { k: 'WACC', name: 'WACC', fx: t('WACC = E/V × Ke + D/V × Kd × (1 − t_eff), t_eff = bouclier utilisable ÷ intérêts', 'WACC = E/V × Ke + D/V × Kd × (1 − t_eff), t_eff = usable tax shield ÷ interest'), num: (R, S) => `${pc(1 - R.dv)} × ${pc(R.ke)} + ${pc(R.dv)} × ${nf1.format(S.kd)}${PCT} × (1 − ${pc(R.taxShieldRate)})   (βL ${isFinite(R.betaL) ? nf2.format(R.betaL) : '—'} · ${t('bouclier fiscal', 'tax shield')} ${eur(R.taxShield)})`, fmt: 'pct', note: t('D/V = dette nette ÷ VE₀, D/E = dette nette ÷ equity (dette nette = dette − trésorerie excédentaire). Plus de dette : le β des actionnaires monte (Hamada). Bouclier fiscal utilisable cette année seulement (ni crédit d\'impôt, ni report de pertes). Coûts de faillite non modélisés.', 'D/V = net debt ÷ EV₀, D/E = net debt ÷ equity (net debt = debt − excess cash). More debt: shareholders\' β rises (Hamada). Tax shield usable this year only (no refund, no loss carryforward). Distress costs are not modeled.') },
    { k: 'EV', name: t('Valeur d\'entreprise à l\'ouverture', 'Opening-date enterprise value'), fx: t('VE₀ = max(0, FCFF₁ ÷ (WACC − g))', 'EV₀ = max(0, FCFF₁ ÷ (WACC − g))'), num: R => (R.EV === 0 ? t(`FCFF ${eur(R.FCFF)} : le stand brûle du cash, Gordon ne s'applique pas`, `FCFF ${eur(R.FCFF)}: the stand burns cash, Gordon does not apply`) : `${eur(R.FCFF)} ÷ (${pc(R.WACC)} − ${pc(R.gT)})`), note: t('Gordon-Shapiro, valeur à l\'ouverture : le FCFF de l\'année est le premier flux, puis il croît de g par an. Quand WACC − g est petit, la valeur explose. Si le stand ne dégage pas de cash, il ne vaut rien : on le fermerait.', 'Gordon growth model, value at opening: this year\'s FCFF is the first cash flow, then it grows by g a year. When WACC − g is small the value explodes. If the stand generates no cash it is worth nothing: you would close it.') },
    { k: 'equity', name: t('Valeur des fonds propres', 'Equity value'), fx: t('Equity = max(0, VE₀ − dette nette)', 'Equity = max(0, EV₀ − net debt)'), num: R => `${eur(R.EV)} − ${eur(R.netDebt)}`, note: t('Ce que vaut le stand pour ses associés à l\'ouverture. Dette nette = dette − trésorerie excédentaire. Jamais négatif : responsabilité limitée.', 'What the stand is worth to its owners at opening. Net debt = debt − excess cash. Never negative: limited liability.') },
    { k: 'NPV', name: t('VAN à l\'ouverture', 'Opening-date NPV'), fx: t('VAN à l\'ouverture = VE₀ − investissement initial (capex + BFR d\'ouverture)', 'Opening-date NPV = EV₀ − initial investment (capex + opening WC)'), num: R => { const w = R.investedInitial - R.capexInit; return `${eur(R.NPV)} = ${eur(R.EV)} − (${eur(R.capexInit)} ${w < 0 ? '−' : '+'} ${eur(Math.abs(w))})`; }, note: t('VAN à l\'ouverture : valeur de l\'exploitation, évaluée avec le FCFF de l\'année comme premier flux, moins capex et BFR de départ.', 'Opening-date NPV: operating value, using this year\'s FCFF as the first cash flow, less initial capex and working capital.') },
    { k: 'ROIC', name: 'ROIC', fx: t('ROIC = NOPAT ÷ capital investi en régime de croisière', 'ROIC = NOPAT ÷ steady-state invested capital'), num: R => `${eur(R.NOPAT)} ÷ ${eur(R.invested)}`, fmt: 'pct', note: t('Capital investi = capex initial + BFR de croisière. On crée de la valeur tant que ROIC > WACC.', 'Invested capital = initial capex + steady-state WC. Value is created as long as ROIC > WACC.') },
  ]],
  [t('KPIs du restaurant', 'Restaurant KPIs'), [
    { k: 'ticket', name: t('Panier moyen', 'Average ticket'), fx: t('Panier moyen = CA ÷ nombre de clients', 'Average ticket = Revenue ÷ number of customers'), num: R => `${eur(R.CA)} ÷ ${nf0.format(R.customers)}`, fmt: 'eur2', note: t('Average revenue per customer. Monte avec les articles par client et la gamme.', 'Average revenue per customer. Rises with items per customer and the product range.') },
    { k: 'revpash', name: 'RevPASH', fx: t('RevPASH = CA ÷ (places × heures d\'ouverture)', 'RevPASH = Revenue ÷ (seats × opening hours)'), num: R => `${eur(R.CA)} ÷ ${nf0.format(R.seatHours)} ${t('place·h', 'seat·h')}`, fmt: 'eur2', note: t('Revenue per available seat hour : la productivité de chaque place.', 'Revenue per available seat hour: the productivity of each seat.') },
    { k: 'tableTurn', name: t('Rotation des places', 'Seat turnover'), fx: t('Rotation = clients assis ÷ (places × heures)', 'Turnover = seated customers ÷ (seats × hours)'), num: (R, S) => `${nf0.format(R.customers * S.sitPct / 100)} ÷ ${nf0.format(R.seatHours)}  → ${t('occupation', 'occupancy')} ${pc(R.occupancy)}`, fmt: 'x2', note: t('Clients par place et par heure. Au-delà de 100 % d\'occupation, il manque des places.', 'Customers per seat per hour. Above 100% occupancy, you are short of seats.') },
    { k: 'laborPct', name: t('Masse salariale %', 'Labor cost %'), fx: t('Labor cost % = salaires chargés ÷ CA', 'Labor cost % = loaded wages ÷ Revenue'), num: R => `${eur(R.payroll)} ÷ ${eur(R.CA)}`, fmt: 'pct', note: t('En restauration on vise souvent 25 à 35 %.', 'Restaurants often target 25 to 35%.') },
    { k: 'foodPct', name: 'Food cost %', fx: t('Food cost % = COGS ÷ CA', 'Food cost % = COGS ÷ Revenue'), num: R => `${eur(R.COGS)} ÷ ${eur(R.CA)}`, fmt: 'pct', note: t('Les boissons ont un food cost bas, d\'où leur marge.', 'Drinks have a low food cost, hence their margin.') },
    { k: 'BE', name: t('Point mort', 'Break-even'), fx: t('Point mort = coûts fixes ÷ (1 − coûts variables ÷ CA)', 'Break-even = fixed costs ÷ (1 − variable costs ÷ Revenue)'), num: R => `${eur(R.fixed)} ÷ (1 − ${pc(R.varRate)})  → ${nf0.format(R.BEday)} ${t('articles / jour / stand', 'items / day / stand')}`, note: t('Le CA à partir duquel l\'EBIT devient positif.', 'The revenue at which EBIT turns positive.') },
    { k: 'CAC', name: 'CAC', fx: t('CAC = marketing ÷ nouveaux clients', 'CAC = marketing ÷ new customers'), num: (R, S) => `${eur(R.mkt)} ÷ (${nf0.format(R.customers)} × ${S.newPct}${PCT})`, fmt: 'eur2', note: t('Customer acquisition cost. À comparer au panier moyen et à la fidélité.', 'Customer acquisition cost. Compare it with the average ticket and loyalty.') },
    { k: 'invTurn', name: t('Rotation des stocks', 'Inventory turnover'), fx: t('Rotation = COGS ÷ stock moyen = 365 ÷ jours de stock', 'Turnover = COGS ÷ average inventory = 365 ÷ days of inventory'), num: R => `${eur(R.COGS)} ÷ ${eur(R.stock)}`, fmt: 'x1', note: t('Combien de fois le stock est renouvelé par an. Les citrons n\'aiment pas attendre.', 'How many times inventory is renewed per year. Lemons don\'t like to wait.') },
    { k: 'turnCost', name: t('Coût du turnover', 'Turnover cost'), fx: t('Coût = employés × turnover × coût d\'un recrutement', 'Cost = employees × turnover × cost per hire'), num: (R, S) => `${S.staff * S.stands} × ${S.turn}${PCT} × ${eur(S.recruit)}`, note: t('Employee turnover rate : chaque départ coûte du recrutement et de la formation.', 'Employee turnover rate: every departure costs hiring and training.') },
    { k: 'wasteCost', name: t('Gâchis', 'Wastage'), fx: t('Gâchis = matière consommée × taux de gâchis', 'Wastage = ingredients used × wastage rate'), num: (R, S) => `${eur(R.matter)} × ${S.waste}${PCT}`, note: t('Food wastage : du COGS qui ne rapporte rien.', 'Food wastage: COGS that earns nothing.') },
  ]],
];
const MET = {}; METRICS.forEach(([, list]) => list.forEach(m => (MET[m.k] = m)));
const fmtMetric = (k, v) => { const f = MET[k] && MET[k].fmt; return f === 'pct' ? pc(v) : f === 'eur2' ? eur2(v) : f === 'x1' ? nf1.format(v) + '×' : f === 'x2' ? nf2.format(v) : eur(v); };

// ---------- state + UI ----------
let S = defaults();
let R = compute(S);
let sel = 'FCFF';
const prevBoard = {};
const $ = id => document.getElementById(id);

const PRESETS = [
  [t('Démarrage', 'Starter'), t('1 stand, citronnade seule', '1 stand, lemonade only'), {}],
  ['Expansion', t('3 stands, 5 produits, dette', '3 stands, 5 products, debt'), { stands: 3, staff: 3, mkt: 1200, debt: 25000, repay: 4000, seats: 8, fraise_on: true, cafe_on: true, the_on: true, cookie_on: true }],
  [t('Saison morte', 'Off season'), t('peu de passants, moins de jours', 'few passers-by, fewer days'), { passants: 35, days: 160 }],
  ['Premium', t('prix +40 %, plus de marketing', 'prices +40%, more marketing'), { citron_price: 4.2, fraise_price: 4.9, mkt: 900, fraise_on: true }],
];

function buildDesk() {
  const pre = $('presets');
  PRESETS.forEach(([name, sub, o]) => {
    const b = document.createElement('button'); b.className = 'btn'; b.innerHTML = `${name}<small>${sub}</small>`;
    b.onclick = () => { S = Object.assign(defaults(), o); syncInputs(); update(); };
    pre.appendChild(b);
  });
  const root = $('sections');
  let count = 0;
  SECTIONS.forEach(([sec, list]) => {
    const d = document.createElement('details');
    const sum = document.createElement('summary'); sum.innerHTML = `<span class="t">${sec}</span><span class="badge" hidden></span>`; d.appendChild(sum);
    const rows = document.createElement('div'); rows.className = 'rows';
    if (list === 'PRODUCTS') {
      PRODUCTS.forEach(p => {
        const box = document.createElement('div'); box.className = 'prod'; box.id = 'prod_' + p.id;
        box.innerHTML = `<label class="prod-head"><input type="checkbox" id="on_${p.id}"><span class="dot" style="background:${p.color}"></span>${p.name}<small>${p.capex ? 'capex ' + euro(nf0.format(p.capex)) + ' / stand' : t('inclus', 'included')}</small></label>`;
        const cb = box.querySelector('input');
        cb.onchange = () => {
          S[p.id + '_on'] = cb.checked;
          if (!PRODUCTS.some(q => S[q.id + '_on'])) S[p.id + '_on'] = cb.checked = true; // au moins un produit
          syncInputs(); update();
        };
        ['price', 'cost', 'w'].forEach(f => { box.appendChild(rowFor(p.id + '_' + f)); count++; });
        const opt = document.createElement('div'); opt.className = 'opt'; opt.id = 'opt_' + p.id; box.appendChild(opt);
        rows.appendChild(box);
      });
    } else list.forEach(([k]) => { rows.appendChild(rowFor(k)); count++; });
    d.appendChild(rows); root.appendChild(d);
  });
  $('n-params').textContent = count + t(' curseurs', ' sliders');
}
function rowFor(k) {
  const d = PARAMS[k];
  const row = document.createElement('div'); row.className = 'row'; row.dataset.k = k;
  row.innerHTML = `<label for="p_${k}">${d.label}</label><output id="o_${k}" for="p_${k}"></output><input type="range" id="p_${k}" min="${d.min}" max="${d.max}" step="${d.step}">`;
  if (d.hint) row.title = d.hint;
  row.querySelector('input').oninput = e => { S[k] = +e.target.value; $('o_' + k).textContent = fmtParam(S[k], d.fmt); update(); };
  return row;
}
function syncInputs() {
  for (const k in PARAMS) { $('p_' + k).value = S[k]; $('o_' + k).textContent = fmtParam(S[k], PARAMS[k].fmt); }
  for (const p of PRODUCTS) { $('on_' + p.id).checked = S[p.id + '_on']; $('prod_' + p.id).classList.toggle('off', !S[p.id + '_on']); }
}

function buildFormulas() {
  const g = $('groups');
  METRICS.forEach(([name, list]) => {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="grp-name">${name}</div><div class="chips"></div>`;
    list.forEach(m => {
      const b = document.createElement('button'); b.className = 'chip'; b.textContent = m.name; b.dataset.k = m.k;
      b.onclick = () => { sel = m.k; update(); };
      wrap.lastChild.appendChild(b);
    });
    g.appendChild(wrap);
  });
}

let lastSel = null, lastSelVal = null;
function renderFormula() {
  const m = MET[sel], v = R[sel];
  let delta = '';
  if (lastSel === sel && isFinite(v) && isFinite(lastSelVal) && Math.abs(v - lastSelVal) > 1e-9) {
    const d = v - lastSelVal, rel = lastSelVal ? d / Math.abs(lastSelVal) : 0;
    delta = `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${pc(Math.abs(rel))}</span>`;
  }
  lastSel = sel; lastSelVal = v;
  $('fcard').innerHTML = `<div class="fname">${m.name}</div><div class="fexpr">${m.fx}</div><div class="fnum">${m.num(R, S)}</div>
    <div class="fres">= ${fmtMetric(sel, v)} ${delta}</div><p class="fnote">${m.note}</p>`;
  document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.k === sel));
}

// surligne les curseurs qui font bouger la formule choisie ; le badge compte, même section fermée
function renderDesk(sens) {
  const hot = new Set(sens.map(o => o.k)), name = MET[sel].name;
  document.querySelectorAll('.row').forEach(r => r.classList.toggle('hot', hot.has(r.dataset.k)));
  document.querySelectorAll('#sections details').forEach(d => {
    const n = d.querySelectorAll('.row.hot').length, b = d.querySelector('.badge');
    b.hidden = !n; b.textContent = n;
    b.title = t(`${n} paramètre${n > 1 ? 's' : ''} de cette catégorie influence${n > 1 ? 'nt' : ''} ${name}`,
      `${n} parameter${n > 1 ? 's' : ''} in this category affect${n > 1 ? '' : 's'} ${name}`);
    d.classList.toggle('hot', n > 0);
  });
}

const BOARD = [['CA', t('CA', 'Revenue')], ['MBpct', t('Marge brute', 'Gross margin')], ['EBITDA', 'EBITDA'], ['FCFF', 'FCFF'], ['EV', t('Valeur', 'Value')]];
function renderBoard() {
  $('cells').innerHTML = BOARD.map(([k, lab]) => {
    const v = R[k], p = prevBoard[k], isPct = k === 'MBpct';
    let d = '<i></i>';
    if (p !== undefined && isFinite(v) && isFinite(p) && Math.abs(v - p) > 1e-6) {
      const amt = isPct ? nf1.format(Math.abs(v - p) * 100) + ' pt' : eurS(Math.abs(v - p));
      d = v > p ? `<i class="up">▲ ${amt}</i>` : `<i class="down">▼ ${amt}</i>`;
    }
    return `<div class="cell"><b>${isPct ? pc(v) : eurS(v)}</b><small>${lab}</small>${d}</div>`;
  }).join('');
  BOARD.forEach(([k]) => (prevBoard[k] = R[k]));
  // le « & » de la police pixel ressemble à un « € » : on l'écrit dans la police du texte
  $('b-title').innerHTML = `${S.stands > 1 ? S.stands + ' STANDS' : 'DAILY ZEST'} · ${R.n} ${t('PRODUIT', 'PRODUCT')}${R.n > 1 ? 'S' : ''}`;
  const lost = R.served < 1;
  $('queue-note').textContent = lost
    ? t(`File saturée : ${nf0.format(R.lostUnits)} articles perdus / an. Ajoute du staff.`, `Queue full: ${nf0.format(R.lostUnits)} items lost / year. Add staff.`)
    : t(`${nf1.format(R.demandH / S.items)} clients/h/stand · capacité ${nf0.format(R.capH)} art./h`, `${nf1.format(R.demandH / S.items)} customers/h/stand · capacity ${nf0.format(R.capH)} items/h`);
  $('queue-note').style.color = lost ? '#b23a2c' : '#1d2928';
}

function renderWaterfall() {
  const steps = [
    [t('CA', 'Rev.'), t('Chiffre d\'affaires', 'Revenue'), R.CA, 1], ['COGS', t('Coût des marchandises', 'Cost of goods sold'), -R.COGS], ['Staff', t('Salaires chargés + turnover', 'Loaded wages + turnover'), -(R.payroll + R.turnCost)],
    [t('Frais', 'Fixed'), t('Loyers, marketing, énergie, frais CB', 'Rent, marketing, energy, card fees'), -(R.rent + R.mkt + R.other + R.cardFees)], ['EBITDA', 'EBITDA', R.EBITDA, 1],
    ['D&A', t('Amortissements', 'Depreciation & amortization'), -R.DA], ['Int.', t('Intérêts de la dette', 'Interest on debt'), -R.interest], [t('IS', 'Tax'), t('Impôt sur les sociétés', 'Corporate income tax'), -R.IS], [t('RN', 'NI'), t('Résultat net', 'Net income'), R.RN, 1],
  ];
  let run = 0; const bars = [];
  for (const [lab, full, v, total] of steps) {
    if (total) { bars.push({ lab, full, a: 0, b: v, v, total }); run = v; }
    else { bars.push({ lab, full, a: run, b: run + v, v }); run += v; }
  }
  const lo = Math.min(0, ...bars.map(b => Math.min(b.a, b.b))), hi = Math.max(1, ...bars.map(b => Math.max(b.a, b.b)));
  const top = 16, H = Math.max(40, $('wf').clientHeight - top - 2), y = x => top + (hi - x) / (hi - lo) * H;
  $('wf').innerHTML = `<div class="wf-zero" style="top:${y(0)}px"></div>` + bars.map(b => {
    const y1 = y(Math.max(b.a, b.b)), y2 = y(Math.min(b.a, b.b));
    const col = b.total && b.v >= 0 ? 'var(--ink)' : 'var(--neg)';
    // valeur toujours au-dessus de la barre (jamais dessous : elle heurtait le nom de la catégorie) ; 0 sans signe
    const labelTop = Math.max(0, y1 - 14), txt = Math.abs(b.v) < 0.5 ? '0' : (b.v < 0 ? '−' : '') + eurS(Math.abs(b.v));
    return `<div class="wf-col" title="${b.full}${t(' : ', ': ')}${eur(b.v)}"><div class="wf-bar" style="top:${y1}px;height:${Math.max(2, y2 - y1)}px;background:${col};opacity:${b.total ? 1 : 0.75}"></div><div class="wf-val" style="top:${labelTop}px">${txt}</div></div>`;
  }).join('');
  $('wf-lbl').innerHTML = bars.map(b => `<span title="${b.full}">${b.lab}</span>`).join('');
}

// ±10 % sur chaque curseur (pas absolu de 5 % de la plage si le curseur est à 0), trié par impact
function sensitivity() {
  const base = R[sel], out = [];
  if (!isFinite(base)) return out;
  for (const k in PARAMS) {
    const d = PARAMS[k];
    if (d.prod && !S[d.prod + '_on']) continue;
    const h = S[k] ? S[k] * 0.1 : (d.max - d.min) * 0.05;
    const lo = compute({ ...S, [k]: S[k] - h })[sel], hi = compute({ ...S, [k]: S[k] + h })[sel];
    if (!isFinite(lo) || !isFinite(hi)) continue;
    const m = Math.max(Math.abs(lo - base), Math.abs(hi - base));
    const label = d.prod ? `${PRODUCTS.find(p => p.id === d.prod).name} · ${d.label.replace(/ \(.*\)/, '').toLowerCase()}` : d.label;
    if (m > Math.abs(base) * 1e-6 + 1e-9) out.push({ k, label, lo: lo - base, hi: hi - base, m });
  }
  return out.sort((a, b) => b.m - a.m);
}

function renderTornado(out) {
  const base = R[sel];
  const top = out.slice(0, 5), mx = Math.max(1e-9, ...top.map(o => o.m));
  const f = MET[sel].fmt, isAmt = !f || f === 'eur2';
  const fmtD = x => (x > 0 ? '+' : x < 0 ? '−' : '') + (f === 'pct' ? nf1.format(Math.abs(x) * 100) + ' pt' : fmtMetric(sel, Math.abs(x)));
  $('tor-target').textContent = MET[sel].name;
  $('tor').innerHTML = top.map(o => {
    const bar = (v, cls) => `<div class="tor-bar ${cls}" style="${v >= 0 ? 'left' : 'right'}:50%;width:${Math.abs(v) / mx * 50}%"></div>`;
    return `<div class="tor-row" title="${o.label} −10${PCT} : ${fmtD(o.lo)} · +10${PCT} : ${fmtD(o.hi)}"><span class="tor-name">${o.label}</span><div class="tor-track"><div class="tor-axis"></div>${bar(o.lo, 'lo')}${bar(o.hi, 'hi')}</div></div>`;
  }).join('') || `<p class="sub">${t('Aucun paramètre ne fait bouger ce chiffre.', 'No parameter moves this number.')}</p>`;
  if (top[0]) {
    const top0 = top[0], rel = base ? top0.hi / Math.abs(base) : 0;
    const tail = `${base && isAmt ? ` (${rel >= 0 ? '+' : '−'}${pc(Math.abs(rel))})` : ''}.`;
    $('tor-sub').innerHTML = LANG === 'en'
      ? `Top driver: <b>${top0.label}</b>. +10% on this parameter changes ${MET[sel].name} by <b>${fmtD(top0.hi)}</b>${tail}`
      : `Levier n°1 : <b>${top0.label}</b>. +10 % sur ce paramètre change ${MET[sel].name} de <b>${fmtD(top0.hi)}</b>${tail}`;
  } else $('tor-sub').textContent = '';
}

// prix (sur la grille du curseur) qui maximise l'EBITDA, tout le reste fixé : file saturée, gâchis, frais CB compris
function bestPrice(id) {
  const d = PARAMS[id + '_price'];
  let best = -Infinity, price = S[id + '_price'];
  for (let i = 0, n = Math.round((d.max - d.min) / d.step); i <= n; i++) {
    const p = +(d.min + i * d.step).toFixed(2), v = compute({ ...S, [id + '_price']: p }).EBITDA;
    if (v > best + 1e-6) { best = v; price = p; }
  }
  return { price, gain: best - R.EBITDA };
}
function renderBestPrices() {
  for (const p of PRODUCTS) {
    const el = $('opt_' + p.id);
    if (!S[p.id + '_on']) { el.innerHTML = ''; continue; }
    const b = bestPrice(p.id), atBest = Math.abs(b.price - S[p.id + '_price']) < 1e-9 || b.gain < 1;
    el.innerHTML = `<span>${t('Prix optimal', 'Best price')} <b>${eur2(b.price)}</b>${atBest ? ' ✓' : ` · EBITDA +${eur(b.gain)}`}</span>`
      + `<span title="${t('Au-delà, plus personne n\'achète', 'Above it, nobody buys')}">${t('plafond', 'ceiling')} ${eur2(chokePrice(p.price, S.elast))}</span>`
      + (atBest ? '' : `<button type="button" class="opt-go">${t('Appliquer', 'Apply')}</button>`);
    if (!atBest) el.querySelector('button').onclick = () => { S[p.id + '_price'] = b.price; syncInputs(); update(); };
  }
}

// ---------- défis guidés : une mission à la fois, cochée en direct par le modèle ----------
// Seuils calés sur compute() depuis les réglages de départ (chaque défi après le 1er y repart) : aucun n'est réussi d'emblée.
const WACC_KEYS = ['rf', 'beta', 'mrp', 'size', 'kd', 'tax'];
const DEFIS = [
  { name: t('Rush de midi', 'Lunch rush'),
    goal: t('Attire 250 passants/h sans perdre une seule vente.', 'Bring in 250 passers-by/h without losing a single sale.'),
    hint: t('Capacité = employés × articles servis par heure. Regarde la note sous l\'île.', 'Capacity = staff × items served per hour. Check the note under the island.'),
    ok: () => S.passants >= 250 && R.served >= 0.9999,
    prog: () => `${t('Passants', 'Passers-by')} ${S.passants}/250 · ${R.served < 0.9999 ? t(`${nf0.format(R.lostUnits)} articles perdus/an`, `${nf0.format(R.lostUnits)} items lost/yr`) : t('aucune vente perdue', 'no lost sale')}`,
    lesson: () => t(`Le trafic ne vaut rien sans capacité : avec ${S.staff} employés par stand, la file ne déborde plus et l'EBITDA atteint ${eur(R.EBITDA)}.`, `Traffic is worthless without capacity: with ${S.staff} staff per stand the queue no longer overflows and EBITDA reaches ${eur(R.EBITDA)}.`) },
  { name: t('Saison morte', 'Off season'), setup: { passants: 35, days: 160 },
    goal: t('35 passants/h, 160 jours d\'ouverture : la VAN plonge. Sans toucher au trafic ni aux jours, remets-la au-dessus de 0.', '35 passers-by/h, 160 opening days: NPV dives. Without touching traffic or days, bring it back above 0.'),
    hint: t('Quand les clients manquent, quels coûts continuent de tomber ? Et qu\'est-ce qui ferait dépenser plus chaque client ?', 'When customers are scarce, which costs keep coming? And what would make each customer spend more?'),
    ok: () => S.passants <= 35 && S.days <= 160 && R.NPV > 0,
    prog: () => (S.passants > 35 || S.days > 160 ? t('Trafic ou jours modifiés : remets 35 passants et 160 jours.', 'Traffic or days changed: set back 35 passers-by and 160 days.') : `${t('VAN', 'NPV')} ${eur(R.NPV)} · ${t('point mort', 'break-even')} ${eur(R.BE)}`),
    lesson: () => t(`Quand le volume baisse, ce sont les coûts fixes qui coulent le stand. Ici le point mort est descendu à ${eur(R.BE)} pour un CA de ${eur(R.CA)}.`, `When volume drops, fixed costs sink the stand. Here break-even came down to ${eur(R.BE)} for revenue of ${eur(R.CA)}.`) },
  { name: 'Expansion', setup: {},
    goal: t('Ouvre un 2e stand et fais passer la VAN au-dessus de 500 k€.', 'Open a 2nd stand and push NPV above $500k.'),
    hint: t('Un stand de plus double presque tout, sauf le marketing. Chaque produit attire du trafic (effet gamme) mais demande du capex.', 'Another stand doubles almost everything except marketing. Each product draws traffic (range effect) but needs capex.'),
    ok: () => S.stands >= 2 && R.NPV >= 500000,
    prog: () => `${S.stands} stand${S.stands > 1 ? 's' : ''} · ${t('VAN', 'NPV')} ${eur(R.NPV)} / ${t('500 k€', '$500k')}`,
    lesson: () => t(`VAN = VE ${eur(R.EV)} − investissement initial ${eur(R.investedInitial)} (capex + BFR d'ouverture) = ${eur(R.NPV)}. Ouvrir vaut le coup tant que la valeur créée dépasse ce qu'on investit.`, `NPV = EV ${eur(R.EV)} − initial investment ${eur(R.investedInitial)} (capex + opening WC) = ${eur(R.NPV)}. Opening is worth it as long as the value created exceeds what you invest.`) },
  { name: t('Effet de levier', 'Leverage'), setup: {},
    goal: t('Finance au moins 90 % du lancement (capex + BFR d\'ouverture) par la dette, sans emprunter un euro de trop, et sans toucher aux curseurs du coût du capital.', 'Fund at least 90% of the launch (capex + opening WC) with debt, without borrowing a cent too much, and without touching the cost-of-capital sliders.'),
    hint: t('Le besoin de financement est affiché ci-dessus. Au-delà, l\'emprunt dort en trésorerie : il coûte des intérêts sans baisser le WACC, car la dette nette ne bouge plus.', 'The funding need is shown above. Beyond it, the loan sits idle in cash: it costs interest without lowering WACC, because net debt no longer moves.'),
    ok: () => S.debt >= 0.9 * R.investedInitial && R.cash0 < 0.5 && WACC_KEYS.every(k => S[k] === PARAMS[k].def),
    prog: () => (WACC_KEYS.some(k => S[k] !== PARAMS[k].def) ? t('Un curseur du coût du capital a bougé : remets-le à sa valeur de départ.', 'A cost-of-capital slider moved: set it back to its default.')
      : `${t('Dette', 'Debt')} ${eur(S.debt)} / ${t('besoin', 'need')} ${eur(R.investedInitial)} · ${t('trésorerie dormante', 'idle cash')} ${eur(R.cash0)} · WACC ${pc(R.WACC)}`),
    lesson: () => t(`WACC ${pc(R.ku)} → ${pc(R.WACC)} : la dette coûte moins cher que les actions, mais le β des actionnaires passe de ${nf2.format(S.beta)} à ${nf2.format(R.betaL)} (Hamada). La baisse reste faible : le stand vaut ${eur(R.EV)} pour ${eur(R.investedInitial)} investis, la dette ne peut financer qu'une petite part de sa valeur. Emprunter davantage laisserait dormir du cash en payant des intérêts. Coûts de faillite non modélisés.`, `WACC ${pc(R.ku)} → ${pc(R.WACC)}: debt is cheaper than equity, but shareholders' β goes from ${nf2.format(S.beta)} to ${nf2.format(R.betaL)} (Hamada). The drop stays small: the stand is worth ${eur(R.EV)} for ${eur(R.investedInitial)} invested, so debt can only fund a small share of its value. Borrowing more would leave cash idle while paying interest. Distress costs are not modeled.`) },
];
let defi = 0, won = false;
function startDefi(i) { // chaque défi (et « Rejouer ») repart des réglages de départ, sur lesquels ses seuils sont calés
  defi = i; won = false;
  S = Object.assign(defaults(), (DEFIS[i] && DEFIS[i].setup) || {}); syncInputs(); update();
  $('defi').querySelector('button')?.focus();
}
function renderDefi() {
  const box = $('defi'), d = DEFIS[defi], N = DEFIS.length;
  if (d && !won && d.ok()) won = true;
  const key = defi + ':' + won;
  if (box.dataset.key !== key) { // le verre liquide observe le DOM : on ne reconstruit qu'au changement d'étape
    box.dataset.key = key; box.classList.toggle('won', !d || won);
    const pips = DEFIS.map((_, i) => `<i class="${i < defi || (i === defi && won) ? 'on' : ''}"></i>`).join('');
    box.innerHTML = !d
      ? `<div class="defi-top"><span>${t('Défis', 'Challenges')} ${N}/${N}</span><span class="pips" aria-hidden="true">${pips}</span></div>
        <div class="defi-name">${t('Bravo !', 'Well done!')}</div>
        <p role="status">${t('Capacité, point mort, valeur et structure du capital : tu as fait le tour du stand.', 'Capacity, break-even, value and capital structure: you have run the whole stand.')}</p>
        <div class="defi-act"><button type="button" class="opt-go">${t('Rejouer', 'Play again')}</button><button type="button" class="opt-go quiet" id="defi-x">${t('Fermer', 'Close')}</button></div>`
      : `<div class="defi-top"><span>${t('Défi', 'Challenge')} ${defi + 1}/${N}</span><span class="pips" aria-hidden="true">${pips}</span></div>
        <div class="defi-name">${d.name}</div><p>${d.goal}</p><div class="defi-prog"></div>
        ${won ? `<p class="defi-ok" role="status">✓ ${t('Réussi !', 'Done!')}</p><p class="sub">${d.lesson()}</p>`
          : `<details class="defi-hint"><summary>${t('Indice', 'Hint')}</summary>${d.hint}</details>`}
        <div class="defi-act"><button type="button" class="opt-go${won ? '' : ' quiet'}">${!won ? t('Passer', 'Skip') : defi < N - 1 ? t('Défi suivant →', 'Next challenge →') : t('Voir le bilan →', 'See the wrap-up →')}</button></div>`;
    box.querySelector('button').onclick = () => startDefi(d ? defi + 1 : 0);
    // défis finis ou passés : « Fermer » rend la place aux formules (la carte revient au prochain chargement de la page)
    if (!d) $('defi-x').onclick = () => { box.hidden = true; document.querySelector('#groups .chip').focus(); };
  }
  const p = box.querySelector('.defi-prog');
  if (p) { const s = d.prog(); if (p.textContent !== s) p.textContent = s; }
}

// ---------- les 3 états financiers (2e écran, sous l'île) : les chiffres de l'export Excel, recalculés à chaque curseur ----------
// Bilan d'ouverture [0] et de clôture [1], équilibré par construction (aussi utilisé par excel.js).
// On finance l'actif initial (capex + BFR d'ouverture) avec dette + apport des associés.
// Si la dette couvre tout, le surplus reste en trésorerie ; sinon l'apport comble la différence.
function balanceSheet(S, R) {
  const g = S.growth / 100;
  const stock0 = R.stock / (1 + g), recv0 = R.recv / (1 + g), pay0 = R.pay / (1 + g);
  const need = R.capexInit + stock0 + recv0 - pay0; // capital à financer : capex initial + BFR d'ouverture (négatif = source de cash)
  const cash0 = R.cash0;                            // = max(0, dette − capital à financer), calculé dans compute()
  const eq0 = Math.max(0, need - S.debt);           // apport des associés (≥ 0) ; actif = passif pour tout signe de BFR
  // net = trésorerie nette (tableau des flux) ; au bilan, un solde négatif n'est pas un actif mais un découvert bancaire, au passif
  const net1 = cash0 + R.CFO - R.capex - R.repay;
  const v = { immo: [R.capexInit, R.capexInit + R.capex - R.DA], stock: [stock0, R.stock], recv: [recv0, R.recv],
    net: [cash0, net1], cash: [cash0, Math.max(0, net1)], over: [0, Math.max(0, -net1)], debt: [S.debt, S.debt - R.repay], pay: [pay0, R.pay] };
  const eq = [eq0, eq0 + R.RN];
  const ta = [0, 1].map(i => v.immo[i] + v.stock[i] + v.recv[i] + v.cash[i]);
  const tp = [0, 1].map(i => eq[i] + v.debt[i] + v.over[i] + v.pay[i]);
  return { v, ta, tp, eq, cash0 };
}
// lignes : [libellé, valeur(R, S, bilan), 'tot' = sous-total | 'key' = ligne clé] ; sans valeur = intertitre. Charges en négatif.
const FS = [
  { id: 'fs-is', tag: t('CR', 'IS'), name: t('Compte de résultat', 'Income statement'), unit: t('€ / an', '$ / year'),
    note: t('Le résultat net descend dans le tableau des flux, puis dans les capitaux propres du bilan.', 'Net income flows down into the cash flow statement, then into equity on the balance sheet.'),
    rows: [
      [t('Chiffre d\'affaires', 'Revenue'), R => R.CA, 'tot'],
      [t('Coût matière', 'Ingredient cost'), R => -R.matter],
      [t('Gâchis', 'Wastage'), R => -R.wasteCost],
      [t('Marge brute', 'Gross margin'), R => R.MB, 'key'],
      [t('Salaires chargés', 'Loaded wages'), R => -R.payroll],
      [t('Coût du turnover', 'Turnover cost'), R => -R.turnCost],
      [t('Loyers', 'Rent'), R => -R.rent],
      ['Marketing', R => -R.mkt],
      [t('Énergie, assurance…', 'Energy, insurance…'), R => -R.other],
      [t('Frais carte bancaire', 'Card fees'), R => -R.cardFees],
      ['EBITDA', R => R.EBITDA, 'key'],
      [t('Amortissements (D&A)', 'Depreciation (D&A)'), R => -R.DA],
      ['EBIT', R => R.EBIT, 'tot'],
      [t('Intérêts', 'Interest'), R => -R.interest],
      [t('Résultat avant impôt', 'Pre-tax income'), R => R.EBT, 'tot'],
      [t('Impôt sur les sociétés', 'Income tax'), R => -R.IS],
      [t('Résultat net', 'Net income'), R => R.RN, 'key'],
    ] },
  { id: 'fs-bs', tag: t('Bilan', 'BS'), name: t('Bilan', 'Balance sheet'), unit: t('clôture', 'closing'),
    note: t('Photo à la clôture de l\'année ; le bilan d\'ouverture est dans l\'export Excel.', 'Snapshot at year end; the opening balance sheet is in the Excel export.'),
    rows: [
      [t('Actif', 'Assets')],
      [t('Immobilisations nettes', 'Net fixed assets'), (R, S, B) => B.v.immo[1]],
      [t('Stocks', 'Inventory'), (R, S, B) => B.v.stock[1]],
      [t('Créances clients', 'Receivables'), (R, S, B) => B.v.recv[1]],
      [t('Trésorerie', 'Cash'), (R, S, B) => B.v.cash[1]],
      [t('Total actif', 'Total assets'), (R, S, B) => B.ta[1], 'key'],
      [t('Passif', 'Liabilities & equity')],
      [t('Capitaux propres', 'Equity'), (R, S, B) => B.eq[1]],
      [t('Dette financière', 'Financial debt'), (R, S, B) => B.v.debt[1]],
      [t('Découvert bancaire', 'Bank overdraft'), (R, S, B) => B.v.over[1]],
      [t('Dettes fournisseurs', 'Payables'), (R, S, B) => B.v.pay[1]],
      [t('Total passif', 'Total liabilities & equity'), (R, S, B) => B.tp[1], 'key'],
      [t('Contrôle : actif − passif', 'Check: assets − liabilities'), (R, S, B) => B.ta[1] - B.tp[1]],
    ] },
  { id: 'fs-cf', tag: t('Flux', 'CF'), name: t('Flux de trésorerie', 'Cash flow statement'), unit: t('€ / an', '$ / year'),
    note: t('Méthode indirecte : on part du résultat net. La trésorerie de clôture remonte au bilan : à l\'actif si elle est positive, en découvert au passif sinon.', 'Indirect method: start from net income. Closing cash goes back to the balance sheet: an asset if positive, an overdraft under liabilities otherwise.'),
    rows: [
      [t('Exploitation', 'Operating')],
      [t('Résultat net', 'Net income'), R => R.RN],
      [t('+ Amortissements (D&A)', '+ Depreciation (D&A)'), R => R.DA],
      [t('− Variation du BFR', '− Change in working capital'), R => -R.dBFR],
      [t('Flux d\'exploitation (CFO)', 'Cash from operations (CFO)'), R => R.CFO, 'tot'],
      [t('Investissement', 'Investing')],
      [t('Capex de renouvellement', 'Maintenance capex'), R => -R.capex],
      [t('Flux d\'investissement (CFI)', 'Cash from investing (CFI)'), R => -R.capex, 'tot'],
      [t('Financement', 'Financing')],
      [t('Remboursement net de dette', 'Net debt repayment'), R => -R.repay],
      [t('Flux de financement (CFF)', 'Cash from financing (CFF)'), R => -R.repay, 'tot'],
      [t('Trésorerie', 'Cash')],
      [t('Variation de trésorerie', 'Change in cash'), (R, S, B) => B.v.net[1] - B.cash0, 'key'],
      [t('Trésorerie d\'ouverture', 'Opening cash'), (R, S, B) => B.cash0],
      [t('Trésorerie nette de clôture', 'Closing net cash'), (R, S, B) => B.v.net[1], 'tot'],
    ] },
];
function buildStatements() {
  FS.forEach((f, i) => {
    const sec = $(f.id).parentElement; // <section id="pFS1…3"> : refermable comme les autres panneaux (setPanel)
    $(f.id).innerHTML = `<h2 id="${f.id}-t"><span>${f.name}</span><span>${f.unit}</span><button class="x" data-close="${sec.id}" aria-label="${t('Fermer :', 'Close:')} ${f.name}">×</button></h2>
    <div class="fs-t"><table><tbody>${f.rows.map(([label, fn, kind]) => (fn ? `<tr class="${kind || ''}"><th scope="row">${label}</th><td></td><td></td></tr>` : `<tr class="head"><th scope="col" colspan="3">${label}</th></tr>`)).join('')}</tbody></table></div>
    <p class="sub">${f.note}</p>`;
    // la bulle qui le rouvre prend sa place dans la page (elle défile avec lui), juste après lui dans le DOM
    sec.insertAdjacentHTML('afterend', `<button class="bubble b-fs b-fs${i + 1}" data-open="${sec.id}" hidden aria-label="${t('Afficher :', 'Show:')} ${f.name}" title="${f.name}">${f.tag}</button>`);
  });
  // sous la cascade : le raccourci qui fait descendre jusqu'aux états (rien n'indique sinon que la page défile)
  const go = document.createElement('div'); go.className = 'fs-go';
  go.innerHTML = `<button type="button" class="opt-go">${t('Les 3 états financiers ↓', 'The 3 financial statements ↓')}</button>`;
  go.firstChild.onclick = () => {
    const sec = document.querySelector('.fs:not(.closed)') || $('fs-is').parentElement;
    sec.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); sec.focus({ preventScroll: true });
  };
  $('pDock').querySelector('.card').appendChild(go);
}
let fsPrev = null, fsBase = null, fsIdle = true, fsTimer = 0;
const fsAmt = v => (v < -0.5 ? '−' : '') + euro(nf0.format(Math.abs(Math.round(v))));
function renderStatements() {
  const B = balanceSheet(S, R), now = FS.map(f => f.rows.map(r => (r[1] ? r[1](R, S, B) : null)));
  // écart cumulé sur un même geste (un curseur qu'on glisse) : la référence est l'état d'avant le geste, gardée jusqu'au geste suivant
  if (fsIdle) { fsBase = fsPrev; fsIdle = false; }
  clearTimeout(fsTimer); fsTimer = setTimeout(() => (fsIdle = true), 900);
  FS.forEach((f, a) => $(f.id).querySelectorAll('tr').forEach((tr, i) => {
    const v = now[a][i];
    if (v === null) return;
    const [amt, dl] = tr.querySelectorAll('td'), d = fsBase ? v - fsBase[a][i] : 0, s = fsAmt(v);
    const ds = Math.abs(d) < 0.5 ? '' : (d > 0 ? '▲ ' : '▼ ') + eurS(Math.abs(d));
    if (amt.textContent !== s) amt.textContent = s; // n'écrire que si ça change : le verre observe le DOM
    if (dl.textContent !== ds) { dl.textContent = ds; dl.className = d > 0 ? 'up' : 'down'; }
  }));
  fsPrev = now;
}

function update() {
  R = compute(S);
  const sens = sensitivity();
  renderFormula(); renderBoard(); renderWaterfall(); renderTornado(sens); renderDesk(sens); renderBestPrices(); renderDefi(); renderStatements();
  if (window.onModelChange) window.onModelChange(S, R);
}

buildDesk(); buildFormulas(); buildStatements(); syncInputs(); update();

// carte de déplacement d'une lentille bombée pour le filtre SVG #frosted : neutre (128) au centre, déviation croissante vers le bord
(() => {
  const n = 64, c = document.createElement('canvas'); c.width = c.height = n;
  const ctx = c.getContext('2d'), img = ctx.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (x + 0.5) / n * 2 - 1, dy = (y + 0.5) / n * 2 - 1, r2 = Math.min(1, dx * dx + dy * dy), i = (y * n + x) * 4;
    img.data[i] = 128 + 127 * dx * r2; img.data[i + 1] = 128 + 127 * dy * r2; img.data[i + 2] = 128; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  $('lens-map').setAttribute('href', c.toDataURL());
})();

// lumière du curseur : une seule position écran sur <html>, chaque section la dessine en dégradé « fixed » (voir CSS .spot)
if (matchMedia('(hover:hover)').matches) {
  const h = document.documentElement.style;
  addEventListener('pointermove', e => { h.setProperty('--mx', e.clientX + 'px'); h.setProperty('--my', e.clientY + 'px'); }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => h.setProperty('--mx', '-999px'));
}

// panneaux refermables : une bulle dans leur coin les rouvre (choix gardé dans ce navigateur)
function setPanel(id, open) {
  $(id).classList.toggle('closed', !open);
  document.querySelector(`[data-open="${id}"]`).hidden = open;
  try { localStorage.setItem('citron-' + id, open ? '1' : '0'); } catch (e) { /* stockage bloqué : tant pis */ }
  if (open && id === 'pDock') renderWaterfall(); // la cascade se mesure à l'ouverture
}
document.querySelectorAll('[data-close]').forEach(b => (b.onclick = () => setPanel(b.dataset.close, false)));
document.querySelectorAll('[data-open]').forEach(b => {
  b.onclick = () => setPanel(b.dataset.open, true);
  let saved = null;
  try { saved = localStorage.getItem('citron-' + b.dataset.open); } catch (e) { /* idem */ }
  if (saved === '0') setPanel(b.dataset.open, false);
});

// self-check (console) : les identités à connaître par cœur tiennent dans le modèle
(() => {
  const r = compute(defaults()), ok = (a, b) => Math.abs(a - b) < 1e-6;
  console.assert(ok(r.MB, r.CA - r.COGS), 'MB');
  console.assert(ok(r.EBIT, r.EBITDA - r.DA), 'EBIT');
  console.assert(ok(r.FCFF, r.EBIT * (1 - r.t) + r.DA - r.capex - r.dBFR), 'FCFF');
  console.assert(ok(r.FCFE, r.FCF - r.repay), 'FCFE = FCF − remboursement');
  console.assert(ok(usableTaxShield(-1000, 500, 0.25), 0), 'pas de bouclier si EBIT négatif');
  console.assert(ok(usableTaxShield(1000, 1500, 0.25), 250), 'bouclier plafonné au bénéfice taxable');
  console.assert(ok(usableTaxShield(3000, 1000, 0.25), 250), 'bouclier complet si bénéfice suffisant');
  console.assert(ok(usableTaxShield(3000, 1000, 0), 0), 'pas de bouclier si taux IS nul');
  console.assert(r.CA > 0 && r.EBITDA > 0 && r.WACC > r.gT, 'defaults profitable');
  for (const debt of [0, 1000, 3000, 10000, 60000, 100000]) {
    const q = compute({ ...defaults(), debt }), net = debt - q.cash0;
    if (isFinite(q.WACC)) {
      console.assert(ok(q.EV, Math.max(0, q.FCFF / (q.WACC - q.gT))), 'WACC ↔ Gordon cohérents, dette ' + debt);
      console.assert(ok(q.dv, net / q.EV), 'D/V = dette nette / VE, dette ' + debt);
      console.assert(ok(q.betaL, defaults().beta * (1 + (1 - q.taxShieldRate) * net / q.equity)), 'Hamada sur dette nette, dette ' + debt);
    }
    console.assert(!isFinite(q.WACC) || (q.dv >= 0 && q.dv < 1), 'poids D/V valide, dette ' + debt);
  }
  const profitable = compute({ ...defaults(), debt: 100000, tax: 25 });
  console.assert(profitable.EBT > 0 && ok(profitable.taxShield, profitable.interest * profitable.t), 'bouclier complet si EBIT couvre les intérêts');
  const excessCash = compute({ ...defaults(), debt: 100000 });
  console.assert(excessCash.cash0 > 0 && excessCash.netDebt < excessCash.grossDebt && isFinite(excessCash.WACC) && Math.abs(excessCash.dv - excessCash.netDebt / excessCash.EV) < 1e-9, 'cash excédentaire et dette brute/nette correctement traités dans D/V');
  const loss = compute({ ...defaults(), debt: 100000, passants: 10, days: 120, tax: 25 });
  console.assert(loss.EBIT < 0 && ok(loss.IS, 0) && ok(loss.taxShield, 0) && ok(loss.taxShieldRate, 0), 'aucun bouclier/report si EBIT négatif');
  const limited = compute({ ...defaults(), debt: 100000, kd: 15, passants: 40, days: 120, hours: 4, staff: 1, prod: 10, wage: 10, charges: 20, rent: 0, mkt: 0, other: 0, turn: 0, recruit: 0, tax: 25 });
  console.assert(limited.EBIT > 0 && limited.EBT < 0 && limited.taxShield >= 0 && limited.taxShield <= limited.interest * limited.t && limited.taxShieldRate > 0 && limited.taxShieldRate < limited.t, 'bouclier partiel sans report de pertes');
  // WACC non défini quand la VE ne couvre pas la dette (fonds propres ≤ 0) : rien à comparer dans ce cas
  for (const q of [profitable, loss, limited]) console.assert(!isFinite(q.WACC) || ok(q.EV, Math.max(0, q.FCFF / (q.WACC - q.gT))), 'VE cohérente avec le WACC et le bouclier fiscal effectif');
  console.assert(loss.EV === 0 && loss.equity === 0 && !isFinite(loss.WACC), 'pas de valeur négative, equity nulle et WACC non défini si le stand brûle du cash');
  { const q = compute({ ...defaults(), passants: 10, days: 120 }); console.assert(q.EV === 0 && q.equity === 0, 'fermeture économique : EV et equity à 0 sans dette'); }
  { const d = defaults(), q = compute(d), b = balanceSheet(d, q); console.assert(b.eq[0] > 0 && q.cash0 === 0, 'réglages de départ : apport des associés positif, pas d\'emprunt en trop'); }
  // bilan d'ouverture équilibré pour tout niveau de dette (aucun equity négatif)
  for (const debt of [0, 10000, 30000, 60000, 100000]) {
    const q = compute({ ...defaults(), debt }), b = balanceSheet({ ...defaults(), debt }, q);
    console.assert(Math.abs(b.ta[0] - b.tp[0]) < 1e-6, 'bilan ouverture équilibré, dette ' + debt);
    console.assert(Math.abs(b.ta[1] - b.tp[1]) < 1e-6, 'bilan clôture équilibré, dette ' + debt);
    console.assert(b.eq[0] >= -1e-6, 'equity ≥ 0 à l\'ouverture, dette ' + debt);
  }
  console.assert(ok(demandFactor(3, 3, 1.3), 1) && ok(demandFactor(3, chokePrice(3, 1.3), 1.3), 0) && demandFactor(3, 99, 1.3) === 0, 'demand curve');
  const h = 1e-4; console.assert(Math.abs(-(demandFactor(3, 3 + h, 1.3) - 1) / h * 3 - 1.3) < 1e-6, 'elasticity at ref');
})();
