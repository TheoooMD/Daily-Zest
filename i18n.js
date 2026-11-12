// Daily Zest — langue du site : anglais par défaut, français au choix (bascule ENG/FR de l'accueil, mémorisée).
// t('fr', 'en') pour le texte produit par le code ; DOM_EN traduit le HTML statique (texte, aria-label, title).
const LANG = (() => { try { return localStorage.getItem('dz-lang') === 'fr' ? 'fr' : 'en'; } catch (e) { return 'en'; } })();
const t = (fr, en) => (LANG === 'en' ? en : fr);
const LOCALE = t('fr-FR', 'en-US');
document.documentElement.lang = LANG;

const DOM_EN = {
  // accueil
  'Bureau en pixel art : écrans de suivi, tableau de croissance et maquette du stand de citronnade': 'Pixel-art office: tracking screens, growth chart and a model of the lemonade stand',
  'Apprends les grandes formules de la finance en faisant tourner un stand de citronnade. Chaque curseur que tu bouges change le CA, l\'EBITDA, le FCFF et la valeur, en direct.':
    'Learn the core formulas of finance by running a lemonade stand. Every slider you move changes revenue, EBITDA, FCFF and valuation, live.',
  'On ouvre le stand ?': 'Shall we open the stand?',
  'Comment ça marche': 'How it works',
  'Bouge les curseurs : trafic, prix, salaires, capex, dette, WACC.': 'Move the sliders: traffic, prices, wages, capex, debt, WACC.',
  'Clique une formule pour voir son calcul avec tes chiffres et ses leviers les plus sensibles.': 'Click a formula to see it calculated with your numbers, and its most sensitive drivers.',
  'Fais grandir le stand : fraise, café, cookies, jusqu\'à 3 stands, et regarde la valeur bouger.': 'Grow the stand: strawberry, coffee, cookies, up to 3 stands, and watch the value move.',
  'Ouvrir le stand': 'Open the stand',
  'Langue': 'Language',
  'Fermer le CV': 'Close the résumé',
  'Voir le CV de Minh-Duc': 'See Minh-Duc\'s résumé',
  // jeu
  'Le stand · Daily Zest': 'The stand · Daily Zest',
  'Diorama en pixel art du stand de citronnade': 'Pixel-art diorama of the lemonade stand',
  'Masquer le tableau du stand': 'Hide the stand dashboard',
  'Formules': 'Formulas',
  'Retour à l\'accueil': 'Back to home',
  '← Accueil': '← Home',
  'Défi': 'Challenge',
  'Fermer le panneau des formules': 'Close the formulas panel',
  'Un stand de citronnade sur une île flottante.': 'A lemonade stand on a floating island.',
  'Bouge les curseurs à droite': 'Move the sliders on the right',
  ', puis': ', then',
  'clique une formule': 'click a formula',
  ': son calcul et ses leviers s\'affichent.': ': its calculation and key drivers appear.',
  'Sensibilité ±10 %': 'Sensitivity ±10%',
  'paramètre −10 %': 'parameter −10%',
  'paramètre +10 %': 'parameter +10%',
  'Cascade du compte de résultat': 'Income statement waterfall',
  'Cascade du compte de résultat · € / an': 'Income statement waterfall · $ / year',
  '€': '$', // bulle qui rouvre la cascade
  'Fermer la cascade': 'Close the waterfall',
  'Paramètres': 'Parameters',
  'Île': 'Island',
  'Fermer le panneau des paramètres': 'Close the parameters panel',
  'Moment de la journée': 'Time of day',
  'Jour': 'Day', 'Soir': 'Evening', 'Nuit': 'Night',
  'Tourner à gauche': 'Rotate left', 'Tourner à droite': 'Rotate right',
  'Dashboard avec graphiques, 3 états financiers, cash-flows, valorisation et KPIs, avec tes paramètres actuels': 'Dashboard with charts, 3 financial statements, cash flows, valuation and KPIs, with your current parameters',
  'Exporter en Excel ↓': 'Export to Excel ↓',
  'Afficher les formules': 'Show formulas',
  'Afficher les paramètres': 'Show parameters',
  'Afficher le tableau du stand': 'Show the stand dashboard',
  'Tableau du stand': 'Stand dashboard',
  'Afficher la cascade': 'Show the waterfall',
  'Cascade': 'Waterfall',
  // SaaSsy
  'SaaSsy · AI SaaS Simulator': 'SaaSsy · AI SaaS Simulator',
  'Masquer le tableau SaaS': 'Hide SaaS dashboard',
  'Afficher le tableau SaaS': 'Show SaaS dashboard',
  'Tableau SaaS': 'SaaS dashboard',
  'Cascade du P&L SaaS': 'SaaS P&L waterfall',
  'P&L Waterfall · € / an': 'P&L Waterfall · $ / year',
  'Cascade P&L': 'P&L Waterfall',
  'Open Space': 'Tech Loft',
  'Scénarios Types': 'SaaS Presets',
  'Nuit (Cyber)': 'Night (Cyber)',
  'Accélérer le pipe': 'Accelerate pipeline',
  'Simulateur financier <b>SaaS B2B</b>. Bouge les curseurs et observe l\'ARR, le NRR, le Deferred Revenue et la valorisation en direct.':
    'Interactive <b>B2B SaaS</b> model. Move sliders to watch ARR, NRR, Deferred Revenue, and valuation live.',
};

// remplace le texte exact (hors espaces de bord) ; garde l'original pour pouvoir rebasculer sans recharger
function translateDOM(lang = LANG, root = document.body) {
  const tr = s => {
    const k = s.trim(), en = lang === 'en' && k && DOM_EN[k];
    if (!en) return s;
    const out = s.replace(k, en);
    return /^[:;,.!?]/.test(en) ? out.replace(/^\s+/, '') : out; // pas d'espace avant « : » en anglais
  };
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) { if (n.frText == null) n.frText = n.nodeValue; n.nodeValue = tr(n.frText); }
  for (const el of root.querySelectorAll('[aria-label],[title]')) {
    el.frAttr = el.frAttr || {};
    for (const a of ['aria-label', 'title']) if (el.hasAttribute(a)) { if (el.frAttr[a] == null) el.frAttr[a] = el.getAttribute(a); el.setAttribute(a, tr(el.frAttr[a])); }
  }
  if (document.frTitle == null) document.frTitle = document.title;
  document.title = tr(document.frTitle);
  document.documentElement.lang = lang;
}
translateDOM();
