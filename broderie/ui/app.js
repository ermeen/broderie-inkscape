// Panneau de broderie : interface simple au-dessus d'Ink/Stitch.
// Les réglages sont écrits par le serveur local (attributs inkstitch:*) ; les points, la simulation
// et le lettrage sont calculés par Ink/Stitch sans ouvrir ses fenêtres.
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const S = { etat: null, schema: null, sel: null, vue: 'objets', texte: false, cmd: null, tache: null, polices: null, ouverts: {}, simu: null };

async function api(nom, data = {}, attente = false) {
  if (attente) { $('#attente').hidden = false; $('#attenteMsg').textContent = attente === true ? 'Ink/Stitch travaille…' : attente; }
  try {
    const r = await fetch('/api/' + nom, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.erreur || r.statusText);
    return j;
  } finally { if (attente) $('#attente').hidden = true; }
}
function message(t, erreur = false) { const j = $('#journal'); j.textContent = t || ''; j.style.color = erreur ? 'var(--accent)' : ''; }
const estVrai = (v) => ['yes', 'y', 'true', 't', '1'].includes(String(v).trim().toLowerCase());

// ---------------------------------------------------------------- pictogrammes des types de point
const PICTO = {
  tatami_fill: '<path d="M4 6h36M4 11h36M4 16h36M4 21h36M4 26h36" stroke-dasharray="7 2"/>',
  contour_fill: '<rect x="4" y="4" width="36" height="24" rx="3"/><rect x="10" y="9" width="24" height="14" rx="2"/><rect x="16" y="14" width="12" height="4" rx="1"/>',
  circular_fill: '<path d="M22 16m-2 0a2 2 0 1 0 4 0a5 5 0 1 0 -10 0a8 8 0 1 0 16 0a11 11 0 1 0 -22 0"/>',
  meander_fill: '<path d="M4 8c6 0 6 8 12 8s6-8 12-8 6 8 12 8M4 18c6 0 6 8 12 8s6-8 12-8 6 8 12 8"/>',
  guided_fill: '<path d="M4 10c10-8 26 8 36 0M4 17c10-8 26 8 36 0M4 24c10-8 26 8 36 0"/>',
  linear_gradient_fill: '<path d="M4 6h36M4 9h36M4 13h36M4 18h36M4 24h36"/>',
  cross_stitch: '<path d="M6 6l8 8M14 6l-8 8M18 6l8 8M26 6l-8 8M30 6l8 8M38 6l-8 8M6 18l8 8M14 18l-8 8M18 18l8 8M26 18l-8 8M30 18l8 8M38 18l-8 8"/>',
  tartan_fill: '<path d="M4 8h36M4 20h36M12 4v24M28 4v24" stroke-width="3" opacity=".6"/><path d="M4 14h36M20 4v24"/>',
  legacy_fill: '<path d="M4 6h36M4 12h36M4 18h36M4 24h36"/>',
  running_stitch: '<path d="M4 22c8-14 14 4 20-6s10-8 16-6" stroke-dasharray="4 3"/>',
  triple: '<path d="M4 22c8-14 14 4 20-6s10-8 16-6" stroke-width="3" stroke-dasharray="4 3"/>',
  ripple_stitch: '<path d="M22 16m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M22 16m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M22 16m-14 0a14 13 0 1 0 28 0a14 13 0 1 0 -28 0"/>',
  zigzag_stitch: '<path d="M4 16l4-8 4 16 4-16 4 16 4-16 4 16 4-16 4 16 4-8"/>',
  manual_stitch: '<path d="M6 24l8-14 8 10 8-12 8 8"/><circle cx="6" cy="24" r="1.6"/><circle cx="14" cy="10" r="1.6"/><circle cx="22" cy="20" r="1.6"/><circle cx="30" cy="8" r="1.6"/><circle cx="38" cy="16" r="1.6"/>',
  satin: '<path d="M4 10c10-6 26-6 36 0M4 24c10-6 26-6 36 0"/><path d="M8 9l2 13M12 8l2 13M16 7l2 13M20 7l2 13M24 7l2 13M28 7l2 13M32 8l2 13M36 9l2 13" stroke-width="1.6"/>',
  satin_column: '<path d="M6 7l2 18M10 7l2 18M14 7l2 18M18 7l2 18M22 7l2 18M26 7l2 18M30 7l2 18M34 7l2 18M38 7l2 18" stroke-width="1.6"/>',
  e_stitch: '<path d="M4 25h36M8 25v-16M14 25v-16M20 25v-16M26 25v-16M32 25v-16M38 25v-16"/>',
  s_stitch: '<path d="M4 25h36M4 7h36M8 25l4-18M16 25l4-18M24 25l4-18M32 25l4-18"/>',
  zigzag: '<path d="M4 25l4-18 4 18 4-18 4 18 4-18 4 18 4-18 4 18 4-18"/>',
  sans: '<path d="M10 8l24 16M34 8l-24 16" opacity=".5"/>',
  centre: '<path d="M4 16h36" stroke-dasharray="4 2"/><path d="M4 7h36M4 25h36" opacity=".3"/>',
  contour: '<rect x="5" y="8" width="34" height="16" rx="2" stroke-dasharray="4 2"/><path d="M4 5h36M4 27h36" opacity=".3"/>',
  zigzag_sc: '<path d="M4 23l5-14 5 14 5-14 5 14 5-14 5 14 5-14" stroke-dasharray="4 2"/>',
  avec: '<path d="M4 9l36 14M4 16l36 14M4 2l36 14" stroke-dasharray="4 2" opacity=".7"/>',
  texte: '<path d="M8 26l7-20 7 20M11 19h8M28 12h8M32 12v14"/>',
};
const picto = (k) => `<svg viewBox="0 0 44 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${PICTO[k] || ''}</svg>`;

// Types de point proposés en tuiles (valeurs Ink/Stitch)
const TYPES = {
  fill_stitch: { param: 'fill_method', titre: 'Remplissage', choix: [
    ['tatami_fill', 'Tatami'], ['contour_fill', 'Contour'], ['circular_fill', 'Spirale'], ['meander_fill', 'Méandre'],
    ['guided_fill', 'Guidé'], ['linear_gradient_fill', 'Dégradé'], ['cross_stitch', 'Point de croix'], ['tartan_fill', 'Tartan'], ['legacy_fill', 'Ancien']] },
  satin_column: { param: 'satin_method', titre: 'Satin', choix: [['satin_column', 'Satin'], ['e_stitch', 'Point E'], ['s_stitch', 'Point S'], ['zigzag', 'Zigzag']] },
  stroke: { param: 'stroke_method', titre: 'Trait', choix: [['running_stitch', 'Point droit'], ['triple', 'Triple'], ['ripple_stitch', 'Ripple'], ['zigzag_stitch', 'Zigzag'], ['manual_stitch', 'Manuel']] },
};
// Réglages essentiels (affichés en curseurs selon le type de point choisi)
const ESSENTIELS = {
  fill_stitch: ['row_spacing_mm', 'angle', 'max_stitch_length_mm', 'contour_strategy', 'meander_pattern', 'meander_scale_percent',
    'guided_fill_strategy', 'cross_stitch_method', 'pattern_size_mm', 'rows_per_thread', 'pull_compensation_mm'],
  satin_column: ['zigzag_spacing_mm', 'pull_compensation_mm', 'max_stitch_length_mm', 'split_method'],
  stroke: ['running_stitch_length_mm', 'repeats', 'zigzag_spacing_mm', 'line_count', 'min_line_dist_mm', 'satin_guide_pattern_position'],
};
const NOMS = { // libellés simples
  row_spacing_mm: 'Densité (écart entre les rangs)', angle: 'Angle', max_stitch_length_mm: 'Longueur de point',
  zigzag_spacing_mm: 'Densité (écart entre les points)', pull_compensation_mm: 'Compensation', running_stitch_length_mm: 'Longueur de point',
  repeats: 'Passages', split_method: 'Découpe des longs points', line_count: 'Nombre de lignes', min_line_dist_mm: 'Écart minimal',
  meander_scale_percent: 'Taille du motif', pattern_size_mm: 'Taille de la croix', contour_strategy: 'Parcours', meander_pattern: 'Motif',
  guided_fill_strategy: 'Mode de guidage', cross_stitch_method: 'Type de croix', rows_per_thread: 'Rangs par fil',
};
const BORNES = { // curseurs : [min, max, pas, valeur par défaut d'Ink/Stitch]
  row_spacing_mm: [0.1, 1.5, 0.05, 0.25], angle: [0, 180, 5, 0], max_stitch_length_mm: [1, 12, 0.5, 3],
  zigzag_spacing_mm: [0.1, 1.5, 0.05, 0.4], pull_compensation_mm: [0, 1.5, 0.05, 0], running_stitch_length_mm: [0.5, 6, 0.1, 2.5],
  repeats: [1, 10, 1, 1], line_count: [2, 50, 1, 10], min_line_dist_mm: [0.2, 10, 0.1, 0], meander_scale_percent: [20, 400, 5, 100],
  pattern_size_mm: [1, 10, 0.5, 3], rows_per_thread: [1, 10, 1, 2],
};
const THEMES = [
  ['Sous-couche', (p) => !!p.groupe],
  ['Compensation', (p) => /compensation/.test(p.name)],
  ['Variations aléatoires', (p) => /random/.test(p.name)],
  ['Début, fin et points d\'arrêt', (p) => /^(start|end)_|ties|lock|min_stitch|min_jump|skip_last|stop_at|underpath|nearest/.test(p.name)],
  ['Sens et rails', (p) => /reverse|swap|flip|clockwise|rails|join_style|avoid|rotate|exponent|stagger|skip_/.test(p.name)],
  ['Autres réglages', () => true],
];

// ---------------------------------------------------------------- liste des objets et couleurs
const typePrincipal = (o) => o.types.includes('lettrage') ? 'lettrage' : o.types.includes('satin_column') ? 'satin_column' : o.types[0];
const NOM_TYPE = { fill_stitch: 'Remplissage', satin_column: 'Satin', stroke: 'Trait', clone: 'Clone', lettrage: 'Texte' };
const ICO_TYPE = { fill_stitch: 'tatami_fill', satin_column: 'satin_column', stroke: 'running_stitch', clone: 'manual_stitch', lettrage: 'texte' };

function rendreListe() {
  const ul = $('#liste'); ul.innerHTML = '';
  for (const o of S.etat.objets) {
    const t = typePrincipal(o);
    const li = document.createElement('li');
    li.className = o.id === S.sel ? 'on' : '';
    li.innerHTML = `<span class="pastille" style="background:${esc(o.couleur)}"></span><span class="nom">${esc(o.nom)}</span>
      <span class="type">${esc(NOM_TYPE[t] || t)}</span>
      <button class="fl" data-sens="-1" title="Coudre plus tôt">▲</button><button class="fl" data-sens="1" title="Coudre plus tard">▼</button>`;
    li.onclick = async (e) => {
      const b = e.target.closest('[data-sens]');
      if (b) { e.stopPropagation(); S.etat = await api('ordre', { id: o.id, sens: +b.dataset.sens }); rendreTout(); apercuBientot(); return; }
      S.sel = o.id; S.texte = t === 'lettrage' && S.texte; rendreTout();
    };
    ul.appendChild(li);
  }
  if (!S.etat.objets.length) ul.innerHTML = '<li class="muted small" style="cursor:default">Aucun objet. Dessinez une forme dans Inkscape, puis appuyez sur ⌘⌥B.</li>';
}

function changerCouleur(o, valeur) {
  const cibles = [];
  if (o.types.includes('fill_stitch') && o.remplissage && o.remplissage !== 'none') cibles.push('fill');
  if (o.contour && o.contour !== 'none') cibles.push('stroke');
  return (async () => {
    for (const quoi of cibles) S.etat = await api('couleur', { id: o.id, quoi, valeur });
    rendreTout(); apercuBientot();
  })();
}

// ---------------------------------------------------------------- propriétés
function valeurParDefaut(p) {
  if (p.default === null || p.default === undefined || p.default === '') return BORNES[p.name] ? BORNES[p.name][3] : null;
  if (p.type === 'combo' && Array.isArray(p.options) && typeof p.default === 'number') return p.options[p.default];
  return p.default;
}
const valeur = (o, p) => (o.valeurs[p.name] === undefined ? valeurParDefaut(p) : o.valeurs[p.name]);
const parNom = (typ, nom) => (S.schema[typ]?.params || []).find((p) => p.name === nom);

function visible(o, p, typ) {
  if (!p.select_items) return true;
  return p.select_items.some(([nom, val]) => {
    const q = parNom(typ, nom);
    return q ? String(valeur(o, q)) === String(val) : false;
  });
}

async function envoyer(o, valeurs) {
  try {
    S.etat = await api('params', { id: o.id, valeurs });
    rendreTout(); apercuBientot();
  } catch (e) { message(e.message, true); }
}

function reglage(o, p, nomSimple) {
  const d = document.createElement('div');
  const modifie = o.valeurs[p.name] !== undefined;
  const v = valeur(o, p);
  const lib = esc(nomSimple || p.libelle);
  const aide = esc((p.aide ? p.aide + '\n' : '') + 'inkstitch:' + p.name);
  if (p.type === 'boolean' || p.type === 'toggle') {
    d.className = 'interrupteur' + (modifie ? ' modifie' : '');
    let on = estVrai(v ?? (p.type === 'toggle'));
    if (p.inverse) on = !on;
    d.innerHTML = `<label title="${aide}">${lib}</label><input type="checkbox" ${on ? 'checked' : ''}>`;
    $('input', d).onchange = (e) => envoyer(o, { [p.name]: p.inverse ? !e.target.checked : e.target.checked });
    return d;
  }
  d.className = 'reglage' + (modifie ? ' modifie' : '');
  const unite = p.unite ? `<span class="unite">${esc(p.unite.replace(/\(.*\)/, '').trim())}</span>` : '';
  const raz = '<button class="raz" title="Valeur par défaut">↺</button>';
  if (Array.isArray(p.options) && (p.type === 'dropdown' || p.type === 'combo')) {
    const cur = v ?? (p.type === 'dropdown' ? 0 : p.options[0]);
    d.innerHTML = `<div class="haut"><label title="${aide}">${lib}</label>${raz}</div><select>${p.options.map((op, i) => {
      const val = p.type === 'dropdown' ? i : op;
      return `<option value="${esc(val)}" ${String(val) === String(cur) ? 'selected' : ''}>${esc((p.options_libelles || [])[i] || op)}</option>`;
    }).join('')}</select>`;
    $('select', d).onchange = (e) => envoyer(o, { [p.name]: e.target.value });
  } else if (BORNES[p.name] && !isNaN(parseFloat(v ?? BORNES[p.name][3]))) {
    const [mi, ma, pas, def] = BORNES[p.name];
    const n = parseFloat(v ?? def);
    d.innerHTML = `<div class="haut"><label title="${aide}">${lib}</label><span class="val">${raz}<input type="number" step="${pas}" value="${n}">${unite}</span></div>
      <input type="range" min="${mi}" max="${ma}" step="${pas}" value="${n}">`;
    const num = $('input[type=number]', d), cur = $('input[type=range]', d);
    cur.oninput = () => { num.value = cur.value; };
    cur.onchange = () => envoyer(o, { [p.name]: cur.value });
    num.onchange = () => envoyer(o, { [p.name]: num.value });
  } else {
    d.innerHTML = `<div class="haut"><label title="${aide}">${lib}</label><span class="val">${raz}<input type="text" value="${esc(o.valeurs[p.name] ?? '')}" placeholder="${esc(valeurParDefaut(p) ?? 'auto')}">${unite}</span></div>`;
    $('input', d).onchange = (e) => envoyer(o, { [p.name]: e.target.value });
  }
  $('.raz', d).onclick = () => envoyer(o, { [p.name]: null });
  return d;
}

function tuiles(liste, actif, clic, multi = false) {
  const div = document.createElement('div'); div.className = 'tuiles';
  for (const [k, lib, ico] of liste) {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'tuile' + ((multi ? actif.includes(k) : actif === k) ? ' on' : '');
    b.innerHTML = picto(ico || k) + `<span>${esc(lib)}</span>`;
    b.onclick = () => clic(k);
    div.appendChild(b);
  }
  return div;
}

function bloc(titre, ...enfants) {
  const d = document.createElement('div'); d.className = 'bloc';
  if (titre) d.innerHTML = `<h2>${esc(titre)}</h2>`;
  enfants.filter(Boolean).forEach((e) => d.appendChild(e));
  return d;
}

function sectionType(o, typ) {
  const T = TYPES[typ];
  const out = [];
  // 1. type de point
  let actif;
  if (typ === 'stroke') {
    const m = valeur(o, parNom('stroke', 'stroke_method')) ?? 'running_stitch';
    actif = m === 'running_stitch' && String(o.valeurs.bean_stitch_repeats || '0').trim() === '1' ? 'triple' : m;
  } else actif = valeur(o, parNom(typ, T.param)) ?? T.choix[0][0];
  const choix = typ === 'stroke' && o.balise === 'path' ? [...T.choix, ['satin', 'Satin']] : T.choix;
  out.push(bloc('Type de point', tuiles(choix, actif, (k) => {
    if (k === 'satin') return envoyer(o, { satin_column: true });
    if (k === 'triple') return envoyer(o, { stroke_method: 'running_stitch', bean_stitch_repeats: '1' });
    const v = { [T.param]: k };
    if (typ === 'stroke' && k === 'running_stitch') v.bean_stitch_repeats = null;
    envoyer(o, v);
  })));
  if (typ === 'satin_column') {
    const b = document.createElement('button'); b.textContent = 'Revenir à un trait simple';
    b.onclick = () => envoyer(o, { satin_column: null });
    let t = null;
    if (o.balise === 'path' && o.sous_chemins < 2) {
      t = document.createElement('p'); t.className = 'muted small';
      t.textContent = 'Une colonne satin a besoin de deux rails : utilisez l\'outil « Trait en satin ».';
    }
    out.push(bloc(null, t, b));
  }
  // 2. réglages essentiels
  const ess = (ESSENTIELS[typ] || []).map((n) => parNom(typ, n)).filter((p) => p && visible(o, p, typ));
  if (ess.length) out.push(bloc('Paramètres ' + T.titre.toLowerCase(), ...ess.map((p) => reglage(o, p, NOMS[p.name]))));
  // 3. sous-couche
  if (typ === 'fill_stitch') {
    if (parNom(typ, 'fill_underlay')) {
      const on = estVrai(valeur(o, parNom(typ, 'fill_underlay')) ?? true);
      out.push(bloc('Sous-couche', tuiles([['non', 'Sans', 'sans'], ['oui', 'Avec', 'avec']], on ? 'oui' : 'non', (k) => envoyer(o, { fill_underlay: k === 'oui' }))));
    }
  } else if (typ === 'satin_column') {
    const sc = [['center_walk_underlay', 'Centre', 'centre'], ['contour_underlay', 'Contour', 'contour'], ['zigzag_underlay', 'Zigzag', 'zigzag_sc']];
    const actifs = sc.filter(([n]) => estVrai(o.valeurs[n] ?? false)).map(([n]) => n);
    out.push(bloc('Sous-couches (plusieurs possibles)', tuiles(sc, actifs, (n) => envoyer(o, { [n]: !actifs.includes(n) }), true)));
  }
  return { sections: out, montres: new Set([T.param, 'fill_underlay', 'center_walk_underlay', 'contour_underlay', 'zigzag_underlay',
    'satin_column', 'bean_stitch_repeats', ...ess.map((p) => p.name)]) };
}

function plusDeReglages(o, typs, montres) {
  const div = document.createElement('div');
  const titre = document.createElement('h2'); titre.textContent = 'Plus de réglages'; div.appendChild(titre);
  const groupes = new Map(THEMES.map(([t]) => [t, []]));
  for (const typ of typs) {
    for (const p of (S.schema[typ]?.params || []).slice().sort((a, b) => (a.sort_index ?? 50) - (b.sort_index ?? 50))) {
      if (montres.has(p.name) || (p.name === 'satin_column' && typ !== 'clone') || !visible(o, p, typ)) continue;
      if (typ === 'element' && ['trim_after', 'stop_after'].includes(p.name)) continue;
      groupes.get(THEMES.find(([, f]) => f(p))[0]).push(p);
    }
  }
  for (const [th, ps] of groupes) {
    if (!ps.length) continue;
    const d = document.createElement('details'); d.className = 'theme';
    d.open = !!S.ouverts[th];
    d.ontoggle = () => { S.ouverts[th] = d.open; };
    const nbMod = ps.filter((p) => o.valeurs[p.name] !== undefined).length;
    d.innerHTML = `<summary>${esc(th)}<span class="nb">${nbMod ? nbMod + ' modifié(s)' : ''}</span></summary>`;
    for (const p of ps) d.appendChild(reglage(o, p));
    div.appendChild(d);
  }
  return div;
}

const OUTILS = {
  stroke: ['stroke_to_satin', 'auto_run', 'redwork'],
  satin_column: ['auto_satin', 'cut_satin', 'flip', 'satin_to_stroke'],
  fill_stitch: ['fill_to_stroke', 'knockdown_fill'],
};
function outils(o) {
  const exts = [...new Set(o.types.flatMap((t) => OUTILS[t] || []))].filter(cmdPar);
  if (!exts.length) return null;
  const d = document.createElement('div'); d.className = 'outils';
  for (const e of exts) {
    const c = cmdPar(e);
    const b = document.createElement('button'); b.textContent = c.nom_fr; b.title = c.menu_fr;
    b.onclick = () => commande(e, {}, [o.id]);
    d.appendChild(b);
  }
  return bloc('Outils', d);
}

function rendreProps() {
  const div = $('#props'); div.innerHTML = '';
  const o = S.etat.objets.find((x) => x.id === S.sel);
  if (!o) { div.innerHTML = '<p class="muted">Choisissez un objet dans la liste.</p>'; return; }
  const t = typePrincipal(o);
  const ent = document.createElement('div'); ent.className = 'entete-objet';
  ent.innerHTML = `<div class="vignette" style="color:${esc(o.couleur)}">${picto(ICO_TYPE[t])}</div>
    <div><h3>${esc(o.nom)}</h3><span class="muted small">${esc(NOM_TYPE[t] || t)} · ${esc(o.balise === 'path' ? 'chemin' : o.balise)}</span></div>`;
  div.appendChild(ent);
  const hexa = (c) => (/^#[0-9a-f]{3}$/i.test(c) ? '#' + [...c.slice(1)].map((x) => x + x).join('') : (c || '#000000').slice(0, 7));
  const coul = document.createElement('div'); coul.className = 'ligne';
  coul.innerHTML = `<label>Couleur</label><span class="couleur"><input type="color" value="${hexa(o.couleur)}"><span class="muted small">${esc(o.couleur)}</span></span>`;
  $('input', coul).onchange = (e) => changerCouleur(o, e.target.value);
  if (t === 'lettrage') {
    const b = document.createElement('button'); b.className = 'principal'; b.textContent = 'Modifier le texte';
    b.onclick = () => { S.texte = true; rendreTout(); };
    div.appendChild(bloc('Texte brodé', b));
    return;
  }
  const typs = o.types.filter((x) => TYPES[x]);
  let montres = new Set();
  for (const typ of typs) {
    if (typs.length > 1) { const h = document.createElement('h3'); h.textContent = TYPES[typ].titre; div.appendChild(h); }
    const r = sectionType(o, typ);
    r.sections.forEach((s) => div.appendChild(s));
    montres = new Set([...montres, ...r.montres]);
  }
  div.appendChild(coul);
  const el = S.schema.element;
  if (el) {
    const fin = ['trim_after', 'stop_after'].map((n) => el.params.find((p) => p.name === n)).filter(Boolean);
    div.appendChild(bloc('Après cet objet', ...fin.map((p) => reglage(o, p, p.name === 'trim_after' ? 'Couper le fil' : 'Arrêter la machine'))));
  }
  const ou = outils(o); if (ou) div.appendChild(ou);
  div.appendChild(plusDeReglages(o, [...typs, ...(o.types.includes('clone') ? ['clone'] : []), 'element'], montres));
}

function rendreTout() {
  if (S.sel && !S.etat.objets.some((o) => o.id === S.sel)) S.sel = null;
  if (!S.sel && S.etat.objets.length) S.sel = (S.etat.objets.find((o) => S.etat.selection.includes(o.id)) || S.etat.objets[0]).id;
  rendreListe(); rendreProps(); rendreAttente();
  $('#props').hidden = S.texte; $('#texte').hidden = !S.texte;
  if (S.texte) rendreTexte();
  if (S.vue === 'export') rendreExport();
}
function rendreAttente() {
  const n = S.etat.attente || 0, i = $('#attenteInfo');
  i.className = 'small' + (n ? ' on' : '');
  i.textContent = n ? `${n} modification(s) à envoyer : ⌘⌥B dans Inkscape` : '✓ À jour avec Inkscape';
  $('#bAbandonner').hidden = !n;
  if (S.etat.sans_dessin) i.textContent = 'Aucun dessin reçu : appuyez sur ⌘⌥B dans Inkscape.';
}

// ---------------------------------------------------------------- vues
function changerVue(v) {
  S.vue = v; message('');
  $$('#vues button').forEach((b) => b.classList.toggle('on', b.dataset.vue === v));
  for (const k of ['objets', 'points', 'apercu', 'export']) $('#v-' + k).hidden = k !== v;
  if (v === 'points') chargerSimulation(); else arreterSimulation();
  if (v === 'apercu') { apercu(); rendreStats('#stats'); }
  if (v === 'export') rendreExport();
}
$$('#vues button').forEach((b) => { b.onclick = () => changerVue(b.dataset.vue); });
$('#bTexte').onclick = () => { S.texte = true; const o = S.etat.objets.find((x) => x.id === S.sel); if (o && typePrincipal(o) !== 'lettrage') S.sel = null; TX.pour = null; rendreTout(); };

// ---------------------------------------------------------------- aperçu des points (zoom net par viewBox)
let vb0 = null, vb = null, apercuDemande = 0, apercuEnCours = false;
async function apercu() {
  const n = ++apercuDemande;
  if (apercuEnCours) return;
  apercuEnCours = true;
  const a = $('#apercu');
  const badge = document.createElement('div'); badge.className = 'calcul'; badge.textContent = 'Calcul des points…';
  a.appendChild(badge);
  try {
    const r = await api('apercu', { ids: S.etat.selection });
    if (!r.svg) { a.className = 'vide'; a.textContent = r.erreur || 'Aucun point.'; vb = vb0 = null; return; }
    const garder = vb && vb0;
    a.className = ''; a.innerHTML = r.svg;
    const svg = $('svg', a);
    svg.removeAttribute('width'); svg.removeAttribute('height');
    const v = (svg.getAttribute('viewBox') || '0 0 100 100').split(/[ ,]+/).map(Number);
    vb0 = v; if (!garder) vb = v.slice();
    appliquerVue();
    message('Molette : zoom · glisser : déplacer · double-clic : tout voir');
  } catch (e) { message(e.message, true); } finally {
    apercuEnCours = false; badge.remove();
    if (n !== apercuDemande) apercu();
  }
}
function appliquerVue() { const s = $('#apercu svg'); if (s && vb) s.setAttribute('viewBox', vb.join(' ')); }
function versDessin(e) {
  const r = $('#apercu').getBoundingClientRect();
  const k = Math.max(vb[2] / r.width, vb[3] / r.height);
  const ox = vb[0] - (r.width * k - vb[2]) / 2, oy = vb[1] - (r.height * k - vb[3]) / 2;
  return { x: ox + (e.clientX - r.left) * k, y: oy + (e.clientY - r.top) * k, k };
}
$('#apercu').addEventListener('wheel', (e) => {
  if (!vb) return; e.preventDefault();
  const p = versDessin(e), f = e.deltaY < 0 ? 1 / 1.2 : 1.2;
  vb = [p.x - (p.x - vb[0]) * f, p.y - (p.y - vb[1]) * f, vb[2] * f, vb[3] * f]; appliquerVue();
}, { passive: false });
$('#apercu').addEventListener('dblclick', () => { if (vb0) { vb = vb0.slice(); appliquerVue(); } });
$('#apercu').addEventListener('pointerdown', (e) => {
  if (!vb) return;
  const p0 = versDessin(e), v0 = vb.slice();
  const mv = (ev) => { vb = [v0[0] - (ev.clientX - e.clientX) * p0.k, v0[1] - (ev.clientY - e.clientY) * p0.k, v0[2], v0[3]]; appliquerVue(); };
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
});
let minuterie = null;
function apercuBientot() {
  clearTimeout(minuterie);
  minuterie = setTimeout(() => {
    S.simu = null;
    if (S.vue === 'points') chargerSimulation();
    else if (S.vue === 'apercu') { apercu(); rendreStats('#stats'); }
    else if (S.vue === 'export') rendreExport();
  }, 400);
}

// ---------------------------------------------------------------- statistiques (points d'Ink/Stitch)
async function donneesPoints() {
  if (!S.simu) {
    const r = await api('points', { ids: S.etat.selection });
    if (r.erreur) throw new Error(r.erreur);
    S.simu = r;
  }
  return S.simu;
}
function calculerStats(d) {
  let n = 0, sauts = 0, coupes = 0, chg = 0, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y, c] of d.points) {
    if (c === 'STITCH') { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    else if (c === 'JUMP') sauts++; else if (c === 'TRIM') coupes++; else if (c === 'COLOR_CHANGE') chg++;
  }
  const larg = n ? (x1 - x0) / 10 : 0, haut = n ? (y1 - y0) / 10 : 0;
  // durée estimée : 650 points/min, 30 s par changement de fil, 6 s par coupe
  const min = n / 650 + chg * 0.5 + coupes * 0.1;
  return { n, sauts, coupes, chg, larg, haut, min, fils: d.fils };
}
async function rendreStats(sel) {
  const div = $(sel);
  div.innerHTML = '<span class="muted small">Calcul…</span>';
  try {
    const s = calculerStats(await donneesPoints());
    const duree = s.min < 1 ? '< 1 min' : Math.round(s.min) + ' min';
    div.innerHTML = `<div class="stats">
      <div><b>${s.n.toLocaleString('fr')}</b><span class="muted small">points</span></div>
      <div><b>${duree}</b><span class="muted small">durée estimée</span></div>
      <div><b>${s.larg.toFixed(1)} × ${s.haut.toFixed(1)}</b><span class="muted small">mm</span></div>
      <div><b>${s.fils.length}</b><span class="muted small">couleur(s) · ${s.coupes} coupe(s)</span></div></div>
      <div class="legende">${s.fils.map((c, i) => `<span><i style="background:${esc(c)}"></i>Fil ${i + 1}</span>`).join('')}</div>`;
    S.dimensions = [s.larg, s.haut];
    return s;
  } catch (e) { div.innerHTML = `<span class="muted small">${esc(e.message)}</span>`; }
}
const CADRES = [['', 'Pas de cadre précis'], ['100x100', '100 × 100 mm'], ['130x180', '130 × 180 mm'], ['160x260', '160 × 260 mm'],
  ['200x200', '200 × 200 mm'], ['200x300', '200 × 300 mm'], ['240x150', '240 × 150 mm'], ['360x200', '360 × 200 mm']];
async function rendreExport() {
  const sel = $('#fCadre');
  if (!sel.options.length) {
    let c = ''; try { c = localStorage.getItem('broderie.cadre') || ''; } catch (e) { /* sans stockage */ }
    sel.innerHTML = CADRES.map(([k, l]) => `<option value="${k}" ${k === c ? 'selected' : ''}>${l}</option>`).join('');
    sel.onchange = () => { try { localStorage.setItem('broderie.cadre', sel.value); } catch (e) { /* rien */ } verifierCadre(); };
  }
  await rendreStats('#statsExport');
  verifierCadre();
}
function verifierCadre() {
  const i = $('#cadreInfo'), v = $('#fCadre').value;
  if (!v || !S.dimensions) { i.textContent = ''; return; }
  const [cw, ch] = v.split('x').map(Number), [w, h] = S.dimensions;
  const ok = (w <= cw && h <= ch) || (w <= ch && h <= cw);
  i.innerHTML = ok ? `<span style="color:#5ec27a">✓ Le motif (${w.toFixed(0)} × ${h.toFixed(0)} mm) tient dans le cadre.</span>`
    : `<span style="color:#f2b45a">⚠ Le motif (${w.toFixed(0)} × ${h.toFixed(0)} mm) dépasse ce cadre.</span>`;
}

// ---------------------------------------------------------------- simulation intégrée (points d'Ink/Stitch)
const SIM = { pts: null, fils: [], i: 0, lecture: false, raf: 0 };
async function chargerSimulation() {
  if (!S.simu || SIM.pts !== S.simu.points) {
    try { await donneesPoints(); } catch (e) { message(e.message, true); return; }
    SIM.pts = S.simu.points; SIM.fils = S.simu.fils; SIM.i = SIM.pts.length;
    $('#sPos').max = SIM.pts.length; $('#sPos').value = SIM.i;
    message('▶ pour voir la machine broder · le curseur avance ou recule point par point');
  }
  dessinerSimulation();
}
function cadreSimulation(cv) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of SIM.pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const k = Math.min((cv.width - 40) / Math.max(1, x1 - x0), (cv.height - 40) / Math.max(1, y1 - y0));
  return { k, ox: (cv.width - (x1 - x0) * k) / 2 - x0 * k, oy: (cv.height - (y1 - y0) * k) / 2 - y0 * k };
}
function dessinerSimulation() {
  const cv = $('#simuCanvas');
  const dpr = window.devicePixelRatio || 1;
  cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr;
  const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
  if (!SIM.pts || !SIM.pts.length) return;
  const { k, ox, oy } = cadreSimulation(cv);
  g.lineWidth = Math.max(1, 3.5 * k); g.lineCap = 'round'; g.lineJoin = 'round';   // fil ≈ 0,35 mm (unités 0,1 mm)
  let fil = 0, prec = null, nPoints = 0;
  g.strokeStyle = SIM.fils[0] || '#000'; g.beginPath();
  for (let i = 0; i < SIM.i && i < SIM.pts.length; i++) {
    const [x, y, c] = SIM.pts[i];
    const X = ox + x * k, Y = oy + y * k;
    if (c === 'COLOR_CHANGE') { g.stroke(); fil++; g.strokeStyle = SIM.fils[fil] || '#000'; g.beginPath(); prec = null; continue; }
    if (c === 'STITCH') {
      if (prec) { g.moveTo(prec[0], prec[1]); g.lineTo(X, Y); }
      prec = [X, Y]; nPoints++;
    } else prec = [X, Y];       // saut, coupe, arrêt : pas de fil dessiné
  }
  g.stroke();
  const cur = SIM.pts[Math.min(SIM.i, SIM.pts.length) - 1];
  if (cur && SIM.i < SIM.pts.length) {
    g.fillStyle = '#e74c3c'; g.beginPath(); g.arc(ox + cur[0] * k, oy + cur[1] * k, 4 * dpr, 0, 7); g.fill();
  }
  const total = SIM.pts.filter((p) => p[2] === 'STITCH').length;
  $('#sInfo').textContent = `${nPoints.toLocaleString('fr')} / ${total.toLocaleString('fr')} points · fil ${Math.min(fil + 1, Math.max(1, SIM.fils.length))} / ${Math.max(1, SIM.fils.length)}`;
  $('#sPos').value = SIM.i;
}
function boucle() {
  if (!SIM.lecture) return;
  SIM.i = Math.min(SIM.pts.length, SIM.i + Math.ceil(Math.pow(2, +$('#sVitesse').value - 1)));
  dessinerSimulation();
  if (SIM.i >= SIM.pts.length) { arreterSimulation(); return; }
  SIM.raf = requestAnimationFrame(boucle);
}
function arreterSimulation() { SIM.lecture = false; cancelAnimationFrame(SIM.raf); $('#sJouer').textContent = '▶'; }
$('#sJouer').onclick = () => {
  if (!SIM.pts) return;
  if (SIM.lecture) { arreterSimulation(); return; }
  if (SIM.i >= SIM.pts.length) SIM.i = 0;
  SIM.lecture = true; $('#sJouer').textContent = '❚❚'; boucle();
};
$('#sPos').oninput = (e) => { arreterSimulation(); SIM.i = +e.target.value; dessinerSimulation(); };
window.addEventListener('resize', () => { if (S.vue === 'points') dessinerSimulation(); });

// ---------------------------------------------------------------- texte brodé (sans fenêtre Ink/Stitch)
const TX = { texte: 'Bonjour', police: null, echelle: 100, align: 'left', pour: null };
async function rendreTexte() {
  const div = $('#texte');
  if (!S.polices) {
    div.innerHTML = '<p class="muted">Chargement des polices…</p>';
    try { S.polices = (await api('polices')).polices; } catch (e) { div.innerHTML = `<p>${esc(e.message)}</p>`; return; }
  }
  const o = S.etat.objets.find((x) => x.id === S.sel);
  const existant = o && typePrincipal(o) === 'lettrage' ? o : null;
  if (existant && TX.pour !== existant.id) {
    try {
      const j = JSON.parse(existant.valeurs.lettering || '{}');
      TX.texte = j.text ?? TX.texte; TX.echelle = j.scale ?? 100;
      TX.police = (S.polices.find((p) => p.id === j.font) || {}).nom || TX.police;
      TX.align = ['left', 'center', 'right'][j.text_align || 0] || 'left';
    } catch (e) { /* lettrage illisible : valeurs actuelles */ }
    TX.pour = existant.id;
  }
  if (!existant) TX.pour = null;
  if (!TX.police && S.polices.length) TX.police = S.polices[0].nom;
  const pol = S.polices.find((p) => p.nom === TX.police) || {};
  const mi = Math.round((pol.min || 0.5) * 100), ma = Math.round((pol.max || 2) * 100);
  div.innerHTML = `<div class="carte-titre"><span>${existant ? 'Modifier le texte' : 'Ajouter un texte'}</span><button class="petit" id="txFermer">Fermer</button></div>
    <div class="bloc"><textarea id="txTexte" placeholder="Votre texte">${esc(TX.texte)}</textarea></div>
    <div class="bloc"><h2>Police</h2><input id="polRecherche" type="search" placeholder="Rechercher une police…"><div class="polices" id="polListe"></div></div>
    <div class="bloc reglage"><div class="haut"><label>Taille</label><span class="val"><input type="number" id="txEchN" value="${TX.echelle}"><span class="unite">%</span></span></div>
      <input type="range" id="txEch" min="${mi}" max="${ma}" step="5" value="${TX.echelle}"><span class="muted small">Conseillé pour cette police : ${mi} à ${ma} %</span></div>
    <div class="bloc"><h2>Alignement</h2><div class="outils" id="txAlign"></div></div>
    <button class="principal" id="txOk">${existant ? 'Mettre à jour le texte' : 'Ajouter au dessin'}</button>`;
  $('#txFermer').onclick = () => { S.texte = false; rendreTout(); };
  const liste = $('#polListe');
  const remplir = () => {
    const q = $('#polRecherche').value.trim().toLowerCase();
    liste.innerHTML = '';
    for (const p of S.polices) {
      if (q && !(p.nom + ' ' + p.description).toLowerCase().includes(q)) continue;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'police' + (p.nom === TX.police ? ' on' : '');
      b.title = p.description;
      b.innerHTML = (p.apercu ? `<img loading="lazy" src="/police/${encodeURIComponent(p.id)}" alt="">` : '') + `<span>${esc(p.nom)}</span>`;
      b.onclick = () => { TX.texte = $('#txTexte').value; TX.police = p.nom; rendreTexte(); };
      liste.appendChild(b);
    }
  };
  $('#polRecherche').oninput = remplir; remplir();
  liste.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
  $('#txTexte').oninput = (e) => { TX.texte = e.target.value; };
  $('#txEch').oninput = (e) => { TX.echelle = +e.target.value; $('#txEchN').value = TX.echelle; };
  $('#txEchN').onchange = (e) => { TX.echelle = +e.target.value; $('#txEch').value = TX.echelle; };
  for (const [k, lib] of [['left', 'Gauche'], ['center', 'Centre'], ['right', 'Droite']]) {
    const b = document.createElement('button'); b.textContent = lib; if (TX.align === k) b.className = 'principal';
    b.onclick = () => { TX.align = k; TX.texte = $('#txTexte').value; rendreTexte(); };
    $('#txAlign').appendChild(b);
  }
  $('#txOk').onclick = async () => {
    TX.texte = $('#txTexte').value;
    if (!TX.texte.trim()) { message('Écrivez un texte.', true); return; }
    try {
      const r = await api('lettrage', { remplacer: existant ? existant.id : null,
        params: { text: TX.texte, font: TX.police, scale: TX.echelle, 'text-align': TX.align } }, 'Création du texte brodé…');
      S.etat = await api('etat'); S.sel = r.id || S.sel; TX.pour = null; S.texte = false;
      rendreTout(); apercuBientot();
      message('Texte prêt. Appuyez sur ⌘⌥B dans Inkscape pour l\'ajouter au dessin.');
    } catch (e) { message(e.message, true); }
  };
}

// ---------------------------------------------------------------- toutes les commandes Ink/Stitch (rarement utiles)
const cmdPar = (ext) => (S.etat.commandes || []).find((c) => c.extension === ext);
async function commande(ext, params = {}, ids = null) {
  const c = cmdPar(ext);
  try {
    const r = await api('commande', { extension: ext, params, ids: ids || S.etat.selection });
    S.tache = { extension: ext, nom: c ? c.nom_fr : ext, fini: false };
    rendreTache();
    message(r.fenetre ? `« ${S.tache.nom} » ouvre une fenêtre d'Ink/Stitch (elle peut être derrière le navigateur).` : `« ${S.tache.nom} » en cours…`);
  } catch (e) { message(e.message, true); }
}
function rendreTache() { const b = $('#tache'), t = S.tache; b.hidden = !t || t.fini; if (t && !t.fini) b.textContent = `Ink/Stitch : ${t.nom}…`; }
async function tacheFinie(t) {
  S.tache = null; rendreTache();
  S.etat = await api('etat'); rendreTout();
  if (t.modifie) { apercuBientot(); message(`« ${t.nom} » appliqué.` + (t.message ? '\n' + t.message : '')); }
  else message(t.erreur || t.message || `« ${t.nom} » : aucune modification.`, !!t.erreur);
}
function rendreCommandes() {
  const q = $('#cmdRecherche').value.trim().toLowerCase();
  const ul = $('#cmdListe'); ul.innerHTML = '';
  let menu = null;
  const cmds = S.etat.commandes.slice().sort((a, b) => (a.menu_fr + a.nom_fr).localeCompare(b.menu_fr + b.nom_fr, 'fr'));
  for (const c of cmds) {
    if (q && !(c.nom_fr + ' ' + c.nom + ' ' + c.menu_fr).toLowerCase().includes(q)) continue;
    if (c.menu_fr !== menu) { menu = c.menu_fr; const h = document.createElement('li'); h.className = 'menu'; h.textContent = menu; ul.appendChild(h); }
    const li = document.createElement('li'); li.className = 'c' + (S.cmd === c ? ' on' : '');
    li.innerHTML = esc(c.nom_fr) + (c.fenetre ? ' <span class="badge">fenêtre</span>' : '');
    li.onclick = () => { S.cmd = c; rendreCommandes(); formCommande(c); };
    ul.appendChild(li);
  }
}
function couleurHex(v) {
  const n = /^\d+$/.test(String(v)) ? Number(v) : parseInt(String(v).replace(/^0x|#/i, '').slice(0, 6).padEnd(8, 'f'), 16);
  return '#' + (Math.floor(n / 256) & 0xffffff).toString(16).padStart(6, '0');
}
function formCommande(c) {
  const f = $('#cmdForm');
  f.innerHTML = `<h3>${esc(c.nom_fr)}</h3><p class="muted small">${esc(c.menu_fr)}${c.fenetre ? ' · ouvre une fenêtre d\'Ink/Stitch' : ''}</p>`;
  if (c.dans_inkscape) { f.innerHTML += '<p>Cette commande agit sur la sélection d\'Inkscape : utilisez le menu Extensions › Ink/Stitch d\'Inkscape.</p>'; return; }
  const vals = {};
  let page = null;
  for (const p of c.params) {
    if (!p.name || p.type === 'label') continue;
    if (p.page_fr && p.page_fr !== page) { page = p.page_fr; const h = document.createElement('h4'); h.textContent = page; f.appendChild(h); }
    const d = document.createElement('div'); d.className = 'champ';
    const lib = `<label title="${esc(p.aide_fr || '')}">${esc(p.libelle)}</label>`;
    vals[p.name] = p.default;
    if (p.type === 'boolean' || p.type === 'bool') {
      d.className = 'champ chk';
      d.innerHTML = `<label><input type="checkbox" ${estVrai(p.default) ? 'checked' : ''}> ${esc(p.libelle)}</label>`;
      vals[p.name] = estVrai(p.default);
      $('input', d).onchange = (e) => { vals[p.name] = e.target.checked; };
    } else if (p.options) {
      d.innerHTML = `${lib}<select>${p.options.map((o, k) => `<option value="${esc(o)}" ${o === p.default ? 'selected' : ''}>${esc((p.options_libelles || [])[k] || o)}</option>`).join('')}</select>`;
      if (!p.options.includes(p.default)) vals[p.name] = p.options[0];
      $('select', d).onchange = (e) => { vals[p.name] = e.target.value; };
    } else if (p.type === 'color') {
      vals[p.name] = couleurHex(p.default || '0x000000ff');
      d.innerHTML = `${lib}<input type="color" value="${vals[p.name]}">`;
      $('input', d).onchange = (e) => { vals[p.name] = e.target.value; };
    } else if (p.type === 'path') {
      d.innerHTML = `${lib}<div class="chemin"><input type="text" value="${esc(p.default)}"><button type="button">Choisir…</button></div>`;
      const inp = $('input', d);
      inp.onchange = () => { vals[p.name] = inp.value; };
      $('button', d).onclick = async () => {
        const r = await api('choisir', { mode: p.mode || 'file' }, 'Choisissez dans la fenêtre du Mac.');
        if (r.chemin) { inp.value = r.chemin; vals[p.name] = r.chemin; }
      };
    } else {
      const num = p.type === 'int' || p.type === 'float';
      d.innerHTML = `${lib}<input type="${num ? 'number' : 'text'}" value="${esc(p.default)}" ${num ? `step="${p.type === 'int' ? 1 : 'any'}"` : ''}>`;
      $('input', d).onchange = (e) => { vals[p.name] = e.target.value; };
    }
    f.appendChild(d);
  }
  const b = document.createElement('button'); b.type = 'button'; b.className = 'principal'; b.textContent = c.fenetre ? 'Ouvrir' : 'Exécuter';
  b.onclick = () => { $('#dlgCmd').close(); commande(c.extension, vals); };
  f.appendChild(b);
}

// ---------------------------------------------------------------- démarrage
$('#bExport').onclick = () => {
  const f = $('#fFormat').value;
  location.href = `/export?format=${encodeURIComponent(f)}&ids=${encodeURIComponent((S.etat.selection || []).join(','))}`;
  message(`Fichier ${f.toUpperCase()} enregistré dans Téléchargements.`);
};
$('#bPlus').onclick = () => { rendreCommandes(); $('#dlgCmd').showModal(); $('#cmdRecherche').focus(); };
$('#cmdRecherche').oninput = rendreCommandes;
$('#bAbandonner').onclick = async () => { S.etat = await api('abandonner'); rendreTout(); apercuBientot(); message('Modifications annulées.'); };

async function surveiller() {
  try {
    const r = await api('present');
    if (S.tache && r.tache && r.tache.fini && r.tache.extension === S.tache.extension) await tacheFinie(r.tache);
    else if (S.etat && r.version !== S.etat.version) { S.etat = await api('etat'); rendreTout(); apercuBientot(); }
  } catch (e) { $('#attenteInfo').textContent = 'Panneau arrêté : appuyez sur ⌘⌥B dans Inkscape.'; }
}
setInterval(surveiller, 2000);

(async () => {
  try {
    [S.etat, S.schema] = await Promise.all([api('etat'), api('schema')]);
  } catch (e) { message('Impossible de joindre le panneau : ' + e.message, true); return; }
  const prefere = ['dst', 'pes', 'jef', 'exp', 'vp3', 'xxx'];
  const fmts = S.etat.formats.length ? S.etat.formats : prefere;
  const NOMS_FMT = { dst: 'Tajima', pes: 'Brother', jef: 'Janome', exp: 'Melco / Bernina', vp3: 'Husqvarna / Pfaff', xxx: 'Singer' };
  $('#fFormat').innerHTML = fmts.slice().sort((a, b) => (prefere.indexOf(a) + 1 || 99) - (prefere.indexOf(b) + 1 || 99))
    .map((f) => `<option value="${f}">.${f}${NOMS_FMT[f] ? ' (' + NOMS_FMT[f] + ')' : ''}</option>`).join('');
  await api('present');
  rendreTout();
})();
