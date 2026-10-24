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

// Sélection : S.sel = objet principal ; S.choix = ensemble des objets choisis (plusieurs → réglages communs)
S.choix = new Set();
const choisis = () => S.etat.objets.filter((o) => S.choix.has(o.id));
function choisir(ids, ajouter = false) {
  if (!ajouter) S.choix = new Set();
  ids.forEach((i) => S.choix.add(i));
  S.sel = ids[ids.length - 1] || null;
  S.texte = false;
  rendreTout();
}
function rendreListe() {
  const ul = $('#liste'); ul.innerHTML = '';
  if (!S.choix.size && S.sel) S.choix.add(S.sel);
  const calques = new Map();
  for (const o of S.etat.objets) {
    const k = o.calque || '';
    if (!calques.has(k)) calques.set(k, { nom: o.calque_nom || 'Sans calque', objets: [] });
    calques.get(k).objets.push(o);
  }
  const plusieursCalques = calques.size > 1;
  let dernier = null;
  for (const [, c] of calques) {
    if (plusieursCalques || calques.size === 1 && c.objets.length > 1) {
      const h = document.createElement('li'); h.className = 'calque';
      const tous = c.objets.every((o) => S.choix.has(o.id));
      h.innerHTML = `<span class="nom">▾ ${esc(c.nom)}</span><span class="type">${c.objets.length} objet(s)</span>`;
      h.title = 'Choisir tout le calque (⌘-clic : ajouter à la sélection)';
      if (tous && S.choix.size > 1) h.classList.add('on');
      h.onclick = (e) => choisir(c.objets.map((o) => o.id), e.metaKey || e.ctrlKey);
      ul.appendChild(h);
    }
    for (const o of c.objets) {
      const t = typePrincipal(o);
      const li = document.createElement('li');
      li.className = 'objet' + (S.choix.has(o.id) ? ' on' : '');
      li.innerHTML = `<span class="pastille" style="background:${esc(o.couleur)}"></span><span class="nom">${esc(o.nom)}</span>
        <span class="type">${esc(NOM_TYPE[t] || t)}</span>
        <button class="fl" data-sens="-1" title="Coudre plus tôt">▲</button><button class="fl" data-sens="1" title="Coudre plus tard">▼</button>`;
      li.onclick = async (e) => {
        const b = e.target.closest('[data-sens]');
        if (b) { e.stopPropagation(); S.etat = await api('ordre', { id: o.id, sens: +b.dataset.sens }); rendreTout(); apercuBientot(); return; }
        if (e.metaKey || e.ctrlKey) {                       // ajouter / retirer de la sélection
          if (S.choix.has(o.id) && S.choix.size > 1) { S.choix.delete(o.id); S.sel = [...S.choix].pop(); rendreTout(); }
          else choisir([o.id], true);
        } else if (e.shiftKey && S.sel) {                    // plage depuis l'objet principal
          const ids = S.etat.objets.map((x) => x.id), a = ids.indexOf(S.sel), z = ids.indexOf(o.id);
          choisir(ids.slice(Math.min(a, z), Math.max(a, z) + 1), true);
        } else choisir([o.id]);
      };
      ul.appendChild(li);
      dernier = o;
    }
  }
  if (!S.etat.objets.length) ul.innerHTML = '<li class="muted small" style="cursor:default">Aucun objet. Dessinez une forme dans Inkscape, puis appuyez sur ⌘⌥B.</li>';
  const aide = $('#aideSelection');
  if (aide) aide.textContent = S.choix.size > 1 ? `${S.choix.size} objets choisis` : '⌘-clic : plusieurs · ⇧-clic : une suite · clic sur un calque : tout le calque';
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
    for (const id of o.ids || [o.id]) S.etat = await api('params', { id, valeurs });
    rendreTout(); apercuBientot();
  } catch (e) { message(e.message, true); }
}

function reglage(o, p, nomSimple) {
  const d = document.createElement('div');
  const modifie = o.valeurs[p.name] !== undefined;
  const v = valeur(o, p);
  const mixte = o.mixte && o.mixte.has(p.name);
  const lib = esc(nomSimple || p.libelle) + (mixte ? ' <span class="mixte" title="Valeurs différentes selon les objets choisis">≠</span>' : '');
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
  if (p.name === 'meander_pattern' && Array.isArray(p.apercus)) {
    const cur = v ?? p.options[0];
    d.innerHTML = `<div class="haut"><label title="${aide}">${lib}</label>${raz}</div><div class="motifs"></div>`;
    p.options.forEach((op, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'motif' + (op === cur ? ' on' : '');
      b.title = p.options_libelles[i];
      b.innerHTML = `<img loading="lazy" src="/motif/${encodeURIComponent(p.apercus[i])}" alt="">`;
      b.onclick = () => envoyer(o, { [p.name]: op });
      $('.motifs', d).appendChild(b);
    });
  } else if (Array.isArray(p.options) && (p.type === 'dropdown' || p.type === 'combo')) {
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
  if (o.mixte && (o.mixte.has(T.param) || o.mixte.has('bean_stitch_repeats'))) actif = null;
  const choix = typ === 'stroke' && o.balise === 'path' ? [...T.choix, ['satin', 'Satin']] : T.choix;
  out.push(bloc('Type de point', tuiles(choix, actif, (k) => {
    if (k === 'satin') {
      if (o.balise === 'path' && o.sous_chemins >= 2) return envoyer(o, { satin_column: true });
      S.apresSatin = true;
      return commande('stroke_to_satin', {}, [o.id]);   // la largeur du trait devient la largeur du satin
    }
    if (k === 'triple') return envoyer(o, { stroke_method: 'running_stitch', bean_stitch_repeats: '1' });
    const v = { [T.param]: k };
    if (typ === 'stroke' && k === 'running_stitch') v.bean_stitch_repeats = null;
    envoyer(o, v);
  })));
  if (typ === 'stroke') {
    const a = document.createElement('div'); a.className = 'aide';
    a.innerHTML = '<b>Colonne satin :</b> donnez au trait, dans Inkscape, l\'épaisseur voulue (la largeur du satin), puis choisissez la tuile <b>Satin</b> : le trait est transformé en colonne satin.';
    out.push(bloc(null, a));
  }
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

// texte courbé : outil « Lettrage le long d'un chemin » d'Ink/Stitch (texte + tracé dessiné dans Inkscape)
function texteCourbe(o) {
  const traces = S.etat.objets.filter((x) => x.balise === 'path' && x.types.includes('stroke'));
  const d = document.createElement('div');
  if (!traces.length) {
    d.className = 'aide';
    d.innerHTML = '<b>Texte courbé :</b> dessinez dans Inkscape une ligne ou une courbe (outil Plume), appuyez sur ⌘⌥B, puis revenez ici : le texte pourra suivre ce tracé.';
    return bloc('Texte courbé', d);
  }
  d.innerHTML = `<div class="reglage"><div class="haut"><label>Tracé à suivre</label></div>
    <select id="tcTrace">${traces.map((t) => `<option value="${esc(t.id)}">${esc(t.nom)}</option>`).join('')}</select></div>
    <div class="reglage"><div class="haut"><label>Position sur le tracé</label></div>
    <select id="tcPos"><option value="left">Au début</option><option value="center">Au milieu</option><option value="right">À la fin</option><option value="stretch">Étiré sur tout le tracé</option></select></div>
    <div class="reglage"><div class="haut"><label>Le texte se pose</label></div>
    <select id="tcVert"><option value="baseline">Sur le tracé</option><option value="top">Sous le tracé</option><option value="bottom">Au-dessus du tracé</option></select></div>`;
  const b = document.createElement('button'); b.className = 'principal'; b.textContent = 'Courber le texte sur ce tracé';
  b.onclick = () => commande('lettering_along_path', { 'text-position': $('#tcPos').value, 'vertical-alignment': $('#tcVert').value },
    [o.id, $('#tcTrace').value]);
  d.appendChild(b);
  return bloc('Texte courbé', d);
}

// colonne satin dessinée « à la Ink/Stitch » : deux rails + traverses, à réunir en un seul objet
function railsEtTraverses(o) {
  const d = document.createElement('div');
  d.innerHTML = '<span class="muted small">Recherche des traits qui touchent cette forme…</span>';
  api('traverses', { id: o.id }).then((r) => {
    const noms = Object.fromEntries(S.etat.objets.map((x) => [x.id, x.nom]));
    const ids = (r.ids || []).filter((i) => noms[i]);
    if (!ids.length) {
      d.innerHTML = o.types.includes('satin_column')
        ? '<div class="aide">Colonne satin d\'un seul objet (rails et traverses réunis) : tout est prêt.</div>' : '';
      if (!d.innerHTML) d.parentElement?.remove();
      return;
    }
    d.innerHTML = `<div class="aide">Dans Ink/Stitch, les <b>deux rails</b> et les <b>traverses</b> d'une colonne satin doivent former <b>un seul objet</b>.
      Ces traits touchent « ${esc(o.nom)} » : cochez ceux qui font partie de la colonne.</div>`;
    const liste = document.createElement('div');
    for (const i of ids) {
      const l = document.createElement('label'); l.className = 'interrupteur';
      l.innerHTML = `<span>${esc(noms[i])}</span><input type="checkbox" value="${esc(i)}" checked>`;
      liste.appendChild(l);
    }
    d.appendChild(liste);
    const b = document.createElement('button'); b.className = 'principal';
    b.textContent = 'Assembler en une colonne satin';
    b.onclick = async () => {
      const choisis = $$('input:checked', liste).map((x) => x.value);
      try {
        const r2 = await api('assembler', { ids: [o.id, ...choisis] });
        S.etat = r2.etat; S.sel = r2.id; rendreTout(); apercuBientot();
        message('Colonne satin assemblée. Appuyez sur ⌘⌥B dans Inkscape pour l\'envoyer dans le dessin.');
      } catch (e) { message(e.message, true); }
    };
    d.appendChild(b);
  }).catch(() => { d.innerHTML = ''; });
  return bloc('Rails et traverses', d);
}

// copier / coller les réglages d'une forme à l'autre
const NON_COPIES = new Set(['lettering', 'satin_column']);
function boutonsCopie(o) {
  const d = document.createElement('div'); d.className = 'boutons-objet';
  const b = document.createElement('button'); b.textContent = '⧉ Copier les réglages';
  b.onclick = () => {
    S.copie = { de: o.nom, type: typePrincipal(o), valeurs: Object.fromEntries(Object.entries(o.valeurs).filter(([k]) => !NON_COPIES.has(k))) };
    rendreProps(); message(`Réglages de « ${o.nom} » copiés : choisissez une autre forme puis « Coller ».`);
  };
  d.appendChild(b);
  if (S.copie && S.copie.type === typePrincipal(o)) {      // coller seulement entre formes du même type
    const memes = S.etat.objets.filter((x) => typePrincipal(x) === S.copie.type);
    if (S.copie.de !== o.nom) {
      const c = document.createElement('button'); c.className = 'principal'; c.textContent = `Coller (de « ${S.copie.de} »)`;
      c.onclick = () => coller([o]);
      d.appendChild(c);
    }
    if (memes.length > 1) {
      const t = document.createElement('button');
      t.textContent = `Coller sur tous les ${NOM_TYPE[S.copie.type].toLowerCase()}s (${memes.length})`;
      t.onclick = () => coller(memes);
      d.appendChild(t);
    }
  }
  return d;
}
async function coller(cibles) {
  try {
    for (const o of cibles) {
      const v = { ...S.copie.valeurs };
      for (const k of Object.keys(o.valeurs)) if (!(k in v) && !NON_COPIES.has(k)) v[k] = null;   // même réglages, pas un mélange
      S.etat = await api('params', { id: o.id, valeurs: v });
    }
    rendreTout(); apercuBientot();
    message(`Réglages collés sur ${cibles.length} forme(s).`);
  } catch (e) { message(e.message, true); }
}

// objet « virtuel » représentant la sélection : valeurs communes, ≠ quand elles diffèrent
function objetCommun(objs) {
  const types = objs[0].types.filter((t) => objs.every((o) => o.types.includes(t)));
  const noms = new Set(objs.flatMap((o) => Object.keys(o.valeurs)));
  const valeurs = {}, mixte = new Set();
  for (const n of noms) {
    const vs = objs.map((o) => o.valeurs[n]);
    if (vs.every((x) => x === vs[0])) { if (vs[0] !== undefined) valeurs[n] = vs[0]; } else mixte.add(n);
  }
  const balise = objs.every((o) => o.balise === objs[0].balise) ? objs[0].balise : 'path';
  return { ids: objs.map((o) => o.id), id: objs[0].id, nom: `${objs.length} objets`, types, valeurs, mixte, balise,
    sous_chemins: Math.min(...objs.map((o) => o.sous_chemins || 1)), couleur: objs[0].couleur, contour: objs[0].contour,
    remplissage: objs[0].remplissage, multi: true };
}
function rendreMulti(objs) {
  const div = $('#props');
  const o = objetCommun(objs);
  const ent = document.createElement('div'); ent.className = 'entete-objet';
  const typesNoms = [...new Set(objs.map((x) => NOM_TYPE[typePrincipal(x)] || typePrincipal(x)))];
  ent.innerHTML = `<div class="vignette">${objs.slice(0, 4).map((x) => `<span class="pastille-mini" style="background:${esc(x.couleur)}"></span>`).join('')}</div>
    <div><h3>${objs.length} objets choisis</h3><span class="muted small">${esc(typesNoms.join(', '))}</span></div>`;
  div.appendChild(ent);
  const aide = document.createElement('div'); aide.className = 'aide';
  aide.innerHTML = 'Les réglages ci-dessous s’appliquent à <b>tous</b> les objets choisis. <b>≠</b> : valeurs différentes aujourd’hui ; en changer une la rend identique partout.';
  div.appendChild(aide);
  const typs = o.types.filter((x) => TYPES[x]);
  let montres = new Set();
  if (!typs.length) {
    const p = document.createElement('p'); p.className = 'muted small';
    p.textContent = 'Types différents (' + typesNoms.join(', ') + ') : seuls les réglages communs à tous sont proposés.';
    div.appendChild(p);
  }
  for (const typ of typs) {
    const r = sectionType(o, typ);
    r.sections.forEach((x) => div.appendChild(x));
    montres = new Set([...montres, ...r.montres]);
  }
  const coul = document.createElement('div'); coul.className = 'ligne';
  coul.innerHTML = `<label>Couleur (tous)</label><span class="couleur"><input type="color" value="${(o.couleur || '#000000').slice(0, 7)}"></span>`;
  $('input', coul).onchange = async (e) => { for (const x of objs) await changerCouleur(x, e.target.value); };
  div.appendChild(coul);
  const el = S.schema.element;
  if (el) {
    const fin = ['trim_after', 'stop_after'].map((n) => el.params.find((p) => p.name === n)).filter(Boolean);
    div.appendChild(bloc('Après chaque objet', ...fin.map((p) => reglage(o, p, p.name === 'trim_after' ? 'Couper le fil' : 'Arrêter la machine'))));
  }
  div.appendChild(plusDeReglages(o, [...typs, 'element'], montres));
}

function rendreProps() {
  const div = $('#props'); div.innerHTML = '';
  const multi = choisis();
  if (multi.length > 1) { rendreMulti(multi); return; }
  const o = S.etat.objets.find((x) => x.id === S.sel);
  if (!o) { div.innerHTML = '<p class="muted">Choisissez un objet dans la liste.</p>'; return; }
  const t = typePrincipal(o);
  const ent = document.createElement('div'); ent.className = 'entete-objet';
  ent.innerHTML = `<div class="vignette" style="color:${esc(o.couleur)}">${picto(ICO_TYPE[t])}</div>
    <div><h3>${esc(o.nom)}</h3><span class="muted small">${esc(NOM_TYPE[t] || t)} · ${esc(o.balise === 'path' ? 'chemin' : o.balise)}</span></div>`;
  div.appendChild(ent);
  div.appendChild(boutonsCopie(o));
  const hexa = (c) => (/^#[0-9a-f]{3}$/i.test(c) ? '#' + [...c.slice(1)].map((x) => x + x).join('') : (c || '#000000').slice(0, 7));
  const coul = document.createElement('div'); coul.className = 'ligne';
  coul.innerHTML = `<label>Couleur</label><span class="couleur"><input type="color" value="${hexa(o.couleur)}"><span class="muted small">${esc(o.couleur)}</span></span>`;
  $('input', coul).onchange = (e) => changerCouleur(o, e.target.value);
  if (t === 'lettrage') {
    const b = document.createElement('button'); b.className = 'principal'; b.textContent = 'Modifier le texte';
    b.onclick = () => { S.texte = true; rendreTout(); };
    div.appendChild(bloc('Texte brodé', b));
    div.appendChild(texteCourbe(o));
    const a = document.createElement('div'); a.className = 'aide';
    a.innerHTML = 'Pour <b>déplacer, tourner ou agrandir</b> le texte : faites-le dans Inkscape, comme une forme (après ⌘⌥B).';
    div.appendChild(bloc(null, a));
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
  if (o.balise === 'path' && (o.types.includes('satin_column') || o.types.includes('stroke'))) div.appendChild(railsEtTraverses(o));
  const ou = outils(o); if (ou) div.appendChild(ou);
  div.appendChild(plusDeReglages(o, [...typs, ...(o.types.includes('clone') ? ['clone'] : []), 'element'], montres));
}

function rendreTout() {
  const existants = new Set(S.etat.objets.map((o) => o.id));
  S.choix = new Set([...S.choix].filter((i) => existants.has(i)));
  if (S.sel && !existants.has(S.sel)) S.sel = null;
  if (!S.sel && S.etat.objets.length) S.sel = (S.etat.objets.find((o) => S.etat.selection.includes(o.id)) || S.etat.objets[0]).id;
  rendreListe(); rendreProps(); rendreAttente(); rendreAncien(); afficherSelection();
  $('#props').hidden = S.texte; $('#texte').hidden = !S.texte;
  if (S.texte) rendreTexte();
  if (S.vue === 'export') rendreExport();
}
function rendreAncien() {
  const b = $('#bandeauAncien');
  b.hidden = !S.etat.ancien;
  if (!S.etat.ancien) return;
  b.innerHTML = `<b>Dessin d'une ancienne version d'Ink/Stitch.</b> Ink/Stitch doit le mettre à jour avant de calculer les points.<br>
    <button id="baMaj">Mettre à jour avec Ink/Stitch</button><button id="baRecent">Ce dessin est récent : le marquer à jour</button>`;
  $('#baMaj').onclick = () => message('Dans Inkscape : menu Extensions › Ink/Stitch › Visualiser et exporter › Simulateur. Ink/Stitch propose « Update » : cliquez-le, fermez le simulateur, puis appuyez sur ⌘⌥B.');
  $('#baRecent').onclick = async () => { S.etat = await api('marquer_a_jour'); rendreTout(); apercuBientot(); };
}
function rendreAttente() {
  const n = S.etat.attente || 0, i = $('#attenteInfo');
  i.className = 'small' + (n ? ' on' : '');
  i.textContent = n ? `${n} modification(s) à envoyer` : '✓ À jour avec Inkscape';
  $('#bAbandonner').hidden = !n;
  const r = Object.entries(S.etat.reserve || {});
  if (r.length) i.title = 'Modifications gardées pour d\'autres dessins : ' + r.map(([k, v]) => `« ${k} » (${v})`).join(', ');
  if (S.etat.sans_dessin) i.textContent = 'Aucun dessin reçu : appuyez sur ⌘⌥B dans Inkscape.';
}

// ---------------------------------------------------------------- vues
function changerVue(v) {
  S.vue = v; message('');
  $$('#vues button').forEach((b) => b.classList.toggle('on', b.dataset.vue === v));
  for (const k of ['objets', 'points', 'apercu', 'export']) $('#v-' + k).hidden = k !== v;
  // un seul aperçu, déplacé dans l'onglet affiché : en haut des Objets pour voir l'effet des réglages
  if (v === 'objets') { $('#emplApercuObjets').insertBefore($('#apercu'), $('#poignee')); apercu(); }
  if (v === 'apercu') $('#emplApercu').appendChild($('#apercu'));
  if (v === 'points') chargerSimulation(); else arreterSimulation();
  if (v === 'apercu') { apercu(); rendreStats('#stats'); }
  if (v === 'export') rendreExport();
}
$$('#vues button').forEach((b) => { b.onclick = () => changerVue(b.dataset.vue); });
$('#bTexte').onclick = () => { S.texte = true; const o = S.etat.objets.find((x) => x.id === S.sel); if (o && typePrincipal(o) !== 'lettrage') S.sel = null; TX.pour = null; rendreTout(); };

// ---------------------------------------------------------------- aperçu des points (zoom net par viewBox)
let vb0 = null, vb = null, apercuDemande = 0, apercuEnCours = false;
// mode de rendu et couleur du tissu (retenus d'une fois sur l'autre)
let MODE = 'points', TISSU = '#ffffff';
const AFF = { sauts: true, penetrations: true, coupes: true, commandes: false };
try { Object.assign(AFF, JSON.parse(localStorage.getItem('broderie.affichage') || '{}')); } catch (e) { /* défaut */ }
function interrupteursAffichage(liste, apres) {
  const d = document.createElement('span'); d.className = 'affichage';
  for (const [k, l, t] of liste) {
    const c = document.createElement('label'); c.title = t;
    c.innerHTML = `<input type="checkbox" ${AFF[k] ? 'checked' : ''}> ${l}`;
    $('input', c).onchange = (e) => { AFF[k] = e.target.checked; try { localStorage.setItem('broderie.affichage', JSON.stringify(AFF)); } catch (x) { /* rien */ } apres(); };
    d.appendChild(c);
  }
  return d;
}
try { MODE = localStorage.getItem('broderie.mode') || 'points'; if (MODE !== 'points') MODE = 'realiste'; TISSU = localStorage.getItem('broderie.tissu') || '#ffffff'; } catch (e) { /* sans stockage */ }
function barreRendu() {
  const d = document.createElement('div'); d.className = 'barre-rendu';
  for (const [k, l, t] of [['points', 'Points', 'Les points et leur trajet'], ['realiste', 'Réaliste', 'Rendu photo du fil (image haute définition)']]) {
    const b = document.createElement('button'); b.textContent = l; b.title = t; if (k === MODE) b.className = 'on';
    b.onclick = (e) => { e.stopPropagation(); MODE = k; try { localStorage.setItem('broderie.mode', k); } catch (x) { /* rien */ } apercu(); };
    d.appendChild(b);
  }
  if (MODE === 'points') d.appendChild(interrupteursAffichage([
    ['sauts', 'Sauts', 'Déplacements du fil sans broder (pointillés et grenouille)'],
    ['coupes', 'Coupes et arrêts', 'Coupes ✂, arrêts machine et changements de couleur'],
    ['penetrations', 'Pénétrations', 'Points d\'entrée de l\'aiguille']], () => apercu()));
  const c = document.createElement('label'); c.title = 'Couleur du tissu';
  c.innerHTML = `Tissu <input type="color" value="${TISSU}">`;
  $('input', c).oninput = (e) => { TISSU = e.target.value; $('#apercu').style.background = TISSU; majTissu(); try { localStorage.setItem('broderie.tissu', TISSU); } catch (x) { /* rien */ } };
  d.appendChild(c);
  d.addEventListener('pointerdown', (e) => e.stopPropagation());
  d.addEventListener('dblclick', (e) => e.stopPropagation());
  return d;
}
async function apercu() {
  const n = ++apercuDemande;
  if (apercuEnCours) return;
  apercuEnCours = true;
  const a = $('#apercu');
  const badge = document.createElement('div'); badge.className = 'calcul'; badge.textContent = 'Calcul des points…';
  a.appendChild(badge);
  try {
    badge.textContent = MODE === 'points' ? 'Calcul des points…' : 'Rendu réaliste…';
    const r = await api('apercu', { ids: S.etat.selection, mode: MODE, options: { sauts: false, penetrations: AFF.penetrations } });
    if (!r.svg) { a.className = 'vide'; a.textContent = r.erreur || 'Aucun point.'; a.appendChild(barreRendu()); vb = vb0 = null; return; }
    const garder = vb && vb0;
    a.className = ''; a.innerHTML = r.svg; a.style.background = TISSU;
    a.appendChild(barreRendu());
    const svg = $('svg', a);
    svg.removeAttribute('width'); svg.removeAttribute('height');
    const v = (svg.getAttribute('viewBox') || '0 0 100 100').split(/[ ,]+/).map(Number);
    vb0 = v; if (!garder) vb = v.slice();
    if (MODE !== 'points') habiller(svg, v); else { pointsAiguille(svg); superposerCommandes(svg); }
    appliquerVue();
    afficherSelection(true);
    message('Molette : zoom · glisser : déplacer · double-clic : tout voir');
  } catch (e) { message(e.message, true); } finally {
    apercuEnCours = false; badge.remove();
    if (n !== apercuDemande) apercu();
  }
}
// rendu réaliste : tissu tissé (à l'échelle du dessin, en mm) et ombre portée sous les fils
function habiller(svg, v) {
  const NS = 'http://www.w3.org/2000/svg';
  const defs = svg.querySelector('defs') || svg.insertBefore(document.createElementNS(NS, 'defs'), svg.firstChild);
  defs.insertAdjacentHTML('beforeend', `
    <pattern id="tissu-panneau" width="0.8" height="0.8" patternUnits="userSpaceOnUse">
      <rect width="0.8" height="0.8" class="tissu-fond"/>
      <rect width="0.8" height="0.34" y="0.03" fill="rgba(255,255,255,.10)"/>
      <rect width="0.34" height="0.8" x="0.43" fill="rgba(0,0,0,.07)"/>
      <rect width="0.8" height="0.06" y="0.4" fill="rgba(0,0,0,.10)"/>
    </pattern>
    <filter id="ombre-panneau" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0.12" dy="0.18" stdDeviation="0.12" flood-color="#000" flood-opacity=".45"/>
    </filter>`);
  const fond = document.createElementNS(NS, 'rect');
  const m = Math.max(v[2], v[3]) * 3;                       // déborde largement pour le zoom arrière
  fond.setAttribute('x', v[0] - m); fond.setAttribute('y', v[1] - m);
  fond.setAttribute('width', v[2] + 2 * m); fond.setAttribute('height', v[3] + 2 * m);
  fond.setAttribute('fill', 'url(#tissu-panneau)'); fond.setAttribute('class', 'fond-tissu');
  svg.insertBefore(fond, defs.nextSibling);
  for (const g of svg.children) if (g.tagName === 'g' && !g.classList.contains('selection-panneau')) g.setAttribute('filter', 'url(#ombre-panneau)');
  majTissu();
}
function majTissu() { $$('#apercu .tissu-fond').forEach((r) => r.setAttribute('fill', TISSU)); }

// Sauts, coupes, arrêts et changements de couleur par-dessus l'aperçu (Ink/Stitch dessine les sauts comme du fil).
// Les points d'Ink/Stitch (0,1 mm, centrés sur le motif) sont recalés sur l'emprise du tracé de l'aperçu.
async function superposerCommandes(svg) {
  if (!AFF.sauts && !AFF.coupes) return;
  let d;
  try { d = await donneesPoints(); } catch (e) { return; }
  if (!svg.isConnected || !d.points.length) return;
  const plan = [...svg.children].find((g) => g.tagName === 'g' && !g.classList.contains('selection-panneau'));
  if (!plan) return;
  const b = plan.getBBox(), m = plan.getCTM && svg.getCTM ? svg.getCTM().inverse().multiply(plan.getCTM()) : null;
  const coin = (x, y) => (m ? new DOMPoint(x, y).matrixTransform(m) : { x, y });
  const h0 = coin(b.x, b.y), h1 = coin(b.x + b.width, b.y + b.height);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y, c] of d.points) {
    if (c !== 'STITCH') continue;                    // l'aperçu d'Ink/Stitch est demandé sans les sauts
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const k = (h1.x - h0.x) / Math.max(1e-6, x1 - x0);
  const X = (x) => h0.x + (x - x0) * k, Y = (y) => h0.y + (y - y0) * k;
  const NS = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'commandes-panneau');
  let prec = null, saut = false, chemin = '';
  const icones = [];
  for (const [x, y, c] of d.points) {
    if (c === 'STITCH') { if (saut && prec) chemin += `M${prec[0]},${prec[1]}L${X(x)},${Y(y)}`; prec = [X(x), Y(y)]; saut = false; continue; }
    if (c === 'JUMP') { if (!saut) icones.push(['jump', prec || [X(x), Y(y)]]); if (prec) chemin += `M${prec[0]},${prec[1]}L${X(x)},${Y(y)}`; prec = [X(x), Y(y)]; saut = true; }
    else if (c === 'TRIM') icones.push(['trim', [X(x), Y(y)]]);
    else if (c === 'STOP') icones.push(['stop', [X(x), Y(y)]]);
    else if (c === 'COLOR_CHANGE') { icones.push(['color_change', [X(x), Y(y)]]); saut = true; }
  }
  if (AFF.sauts && chemin) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', chemin); p.setAttribute('class', 'sauts-panneau');
    g.appendChild(p);
  }
  const t = (vb ? vb[2] : 100) / 28;                  // taille des icônes : ~1/28 de la vue
  for (const [n, [x, y]] of icones) {
    if (n === 'jump' ? !AFF.sauts : !AFF.coupes) continue;
    const im = document.createElementNS(NS, 'image');
    im.setAttribute('href', `/icone/${n}.png`); im.setAttribute('class', 'icone-cmd');
    im.setAttribute('x', x + t * 0.15); im.setAttribute('y', y - t * 1.1); im.setAttribute('width', t); im.setAttribute('height', t);
    g.appendChild(im);
  }
  $$('.commandes-panneau', svg).forEach((x) => x.remove());
  svg.appendChild(g);
}

// Points d'aiguille de l'aperçu : Ink/Stitch les dessine en « marqueurs » prévus pour Inkscape ; le navigateur
// les rogne presque entièrement (markerWidth 0,1) et ignore « context-stroke ». On les refait, un par couleur de fil.
function pointsAiguille(svg) {
  const NS = 'http://www.w3.org/2000/svg';
  const defs = svg.querySelector('defs') || svg.insertBefore(document.createElementNS(NS, 'defs'), svg.firstChild);
  const faits = {};
  for (const ch of svg.querySelectorAll('path')) {
    const st = ch.getAttribute('style') || '';
    if (!/needle-point-marker/.test(st)) continue;
    const coul = ((st.match(/stroke:\s*(#[0-9a-fA-F]{3,8})/) || [])[1] || '#000000').toLowerCase();
    const id = 'npp-' + coul.slice(1);
    if (!faits[id]) {
      defs.insertAdjacentHTML('beforeend', `<marker id="${id}" markerUnits="strokeWidth" markerWidth="4" markerHeight="4"
        viewBox="-2 -2 4 4" refX="0" refY="0" overflow="visible"><circle r="1.5" fill="${coul}" stroke="rgba(0,0,0,.65)" stroke-width="0.35"/></marker>`);
      faits[id] = true;
    }
    ch.setAttribute('style', st.replace(/url\(#inkstitch-needle-point-marker\)/g, `url(#${id})`));
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
// poignée : hauteur de l'aperçu dans l'onglet Objets (retenue d'une fois sur l'autre)
try { const h = localStorage.getItem('broderie.hauteur'); if (h) document.documentElement.style.setProperty('--hauteur-apercu', h + 'px'); } catch (e) { /* sans stockage */ }
$('#poignee').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const a = $('#apercu'), h0 = a.getBoundingClientRect().height, y0 = e.clientY;
  let h = h0;
  const mv = (ev) => {
    h = Math.max(100, Math.min(window.innerHeight * 0.8, h0 + ev.clientY - y0));
    document.documentElement.style.setProperty('--hauteur-apercu', h + 'px');
  };
  const up = () => {
    document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
    try { localStorage.setItem('broderie.hauteur', Math.round(h)); } catch (x) { /* rien */ }
  };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
});

// contour de l'objet choisi, en pointillés bleus par-dessus l'aperçu
let selAffichee = null;
async function afficherSelection(force = false) {
  const svg = $('#apercu svg');
  if (!svg) return;
  const ids = S.choix.size ? [...S.choix] : (S.sel ? [S.sel] : []);
  const cle = ids.join(',') + '|' + S.etat.version + '|' + S.etat.attente;
  if (!force && selAffichee === cle && $('.selection-panneau', svg)) return;
  selAffichee = cle;
  $$('.selection-panneau', svg).forEach((g) => g.remove());
  for (const id of ids.slice(0, 60)) {
    try {
      const r = await api('contour', { id });
      if (!r.svg || !$('#apercu svg') || selAffichee !== cle) return;
      const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
      $('#apercu svg').appendChild(document.importNode(doc.documentElement, true));
    } catch (e) { /* contour indisponible : l'aperçu reste utilisable */ }
  }
}

let minuterie = null;
function apercuBientot() {
  clearTimeout(minuterie);
  minuterie = setTimeout(() => {
    S.simu = null;
    if (S.vue === 'points') chargerSimulation();
    else if (S.vue === 'apercu') { apercu(); rendreStats('#stats'); }
    else if (S.vue === 'objets') apercu();
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
// Cadres de la brodeuse : liste personnelle (ajout, suppression), centrage du motif, cadre = page d'Inkscape
S.cadres = null;
const cadreChoisi = () => (S.cadres || [])[+$('#fCadre').value];
async function rendreExport() {
  if (!S.cadres) S.cadres = (await api('cadres')).cadres;
  const sel = $('#fCadre');
  let c = 0; try { c = +(localStorage.getItem('broderie.cadreN') || 0); } catch (e) { /* sans stockage */ }
  sel.innerHTML = S.cadres.map((x, i) => `<option value="${i}" ${i === c ? 'selected' : ''}>${esc(x.nom)} — ${x.largeur} × ${x.hauteur} mm</option>`).join('');
  sel.onchange = () => { try { localStorage.setItem('broderie.cadreN', sel.value); } catch (e) { /* rien */ } verifierCadre(); };
  await rendreStats('#statsExport');
  verifierCadre();
}
function verifierCadre() {
  const i = $('#cadreInfo'), c = cadreChoisi();
  if (!c || !S.dimensions) { i.textContent = ''; return; }
  const [w, h] = S.dimensions;
  const ok = (w <= c.largeur && h <= c.hauteur);
  const tourne = !ok && w <= c.hauteur && h <= c.largeur;
  i.innerHTML = ok ? `<span style="color:#5ec27a">✓ Le motif (${w.toFixed(0)} × ${h.toFixed(0)} mm) tient dans le cadre.</span>`
    : tourne ? `<span style="color:#f2b45a">⚠ Le motif tient seulement s'il est tourné d'un quart de tour (dans Inkscape).</span>`
    : `<span style="color:#f2b45a">⚠ Le motif (${w.toFixed(0)} × ${h.toFixed(0)} mm) dépasse ce cadre.</span>`;
}
$('#bCadreAjout').onclick = async () => {
  const l = +$('#ncL').value, h = +$('#ncH').value;
  if (!(l > 0 && h > 0)) { message('Indiquez la largeur et la hauteur du cadre en millimètres.', true); return; }
  S.cadres = (await api('cadres_ecrire', { cadres: [...S.cadres, { nom: $('#ncNom').value.trim() || `${l} × ${h}`, largeur: l, hauteur: h }] })).cadres;
  try { localStorage.setItem('broderie.cadreN', S.cadres.length - 1); } catch (e) { /* rien */ }
  $('#nouveauCadre').open = false; $('#ncNom').value = $('#ncL').value = $('#ncH').value = '';
  rendreExport(); message('Cadre ajouté.');
};
$('#bCadreSuppr').onclick = async () => {
  const n = +$('#fCadre').value, c = S.cadres[n];
  if (!c || !confirm(`Supprimer le cadre « ${c.nom} » de la liste ?`)) return;
  S.cadres = (await api('cadres_ecrire', { cadres: S.cadres.filter((_, i) => i !== n) })).cadres;
  try { localStorage.setItem('broderie.cadreN', 0); } catch (e) { /* rien */ }
  rendreExport(); message('Cadre supprimé.');
};
$('#bCadreCentrer').onclick = async () => {
  const c = cadreChoisi(); if (!c) return;
  try {
    S.etat = await api('cadre', { largeur: c.largeur, hauteur: c.hauteur, centrer: true, page: $('#cbCadrePage').checked });
    rendreTout(); apercuBientot();
    message(`Motif centré dans le cadre ${c.largeur} × ${c.hauteur} mm. Appuyez sur ⌘⌥B (ou Synchroniser) pour le voir dans Inkscape.`);
  } catch (e) { message(e.message, true); }
};

// ---------------------------------------------------------------- simulation intégrée (comme le simulateur d'Ink/Stitch)
// Points calculés par Ink/Stitch (export JSON, unités 0,1 mm centrées sur le motif) ; mêmes commandes,
// mêmes affichages et mêmes raccourcis clavier que son simulateur, avec ses icônes.
const SIM = { pts: null, fils: [], i: 0, lecture: false, raf: 0, sens: 1, niveau: 5, dernier: 0, reste: 0,
  vue: { k: 1, x: 0, y: 0 }, cmds: [], couleurs: [], page: null };
const SIM_AFF = { npp: false, sauts: true, coupes: true, arrets: true, couleurs: true, mire: true, page: false, info: false, fond: '#ffffff' };
const SIM_PREF = { epaisseur: 0.3, npp: 0.5, mireRayon: 12, mireEpaisseur: 2, mireCouleur: '#e74c3c', adapter: true };
try {
  Object.assign(SIM_AFF, JSON.parse(localStorage.getItem('broderie.simAff') || '{}'));
  Object.assign(SIM_PREF, JSON.parse(localStorage.getItem('broderie.simPref') || '{}'));
} catch (e) { /* valeurs par défaut */ }
const memoriser = () => { try { localStorage.setItem('broderie.simAff', JSON.stringify(SIM_AFF)); localStorage.setItem('broderie.simPref', JSON.stringify(SIM_PREF)); } catch (e) { /* rien */ } };
const NOM_CMD = { JUMP: 'Saut', TRIM: 'Coupe', STOP: 'Arrêt', COLOR_CHANGE: 'Changement de couleur', END: 'Fin' };
const ICONES = {};
for (const n of ['jump', 'trim', 'stop', 'color_change']) { const im = new Image(); im.src = `/icone/${n}.png`; ICONES[n] = im; }
const icone = (n) => `<img src="/icone/${n}_dark.png" alt="">`;

async function chargerSimulation() {
  if (!S.simu || SIM.pts !== S.simu.points) {
    try { await donneesPoints(); } catch (e) { message(e.message, true); return; }
    SIM.pts = S.simu.points; SIM.fils = S.simu.fils; SIM.page = S.simu.page; SIM.i = SIM.pts.length;
    SIM.cmds = []; SIM.couleurs = [];
    let fil = 0;
    SIM.pts.forEach((p, i) => {
      if (p[2] === 'COLOR_CHANGE') fil++;
      SIM.couleurs.push(fil);
      if (p[2] !== 'STITCH') SIM.cmds.push(i);
    });
    $('#sPos').max = SIM.pts.length; $('#sPos').value = SIM.i;
    dessinerPiste(); rendreInfoSimu();
    message('P : lecture · R : recommencer · ↑↓ : vitesse · ←→ : sens · + / − : un point · Pg↑ Pg↓ : une commande · O : pénétrations');
  }
  dessinerSimulation();
}
function cadreSimulation(cv) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of SIM.pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (SIM_AFF.page && SIM.page) {                     // la page entière doit tenir dans la vue
    const p = SIM.page;
    x0 = Math.min(x0, -p.cx * 10); x1 = Math.max(x1, (p.largeur - p.cx) * 10);
    y0 = Math.min(y0, -p.cy * 10); y1 = Math.max(y1, (p.hauteur - p.cy) * 10);
  }
  const k = Math.min((cv.width - 40) / Math.max(1, x1 - x0), (cv.height - 40) / Math.max(1, y1 - y0));
  return { k, ox: (cv.width - (x1 - x0) * k) / 2 - x0 * k, oy: (cv.height - (y1 - y0) * k) / 2 - y0 * k };
}
function dessinerSimulation() {
  const cv = $('#simuCanvas');
  const dpr = window.devicePixelRatio || 1;
  cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr;
  const g = cv.getContext('2d');
  g.fillStyle = SIM_AFF.fond; g.fillRect(0, 0, cv.width, cv.height);
  if (!SIM.pts || !SIM.pts.length) return;
  const { k, ox, oy } = cadreSimulation(cv);
  g.setTransform(SIM.vue.k, 0, 0, SIM.vue.k, SIM.vue.x, SIM.vue.y);
  const px = 1 / SIM.vue.k;                          // un pixel écran
  if (SIM_AFF.page && SIM.page) {
    const p = SIM.page;
    g.strokeStyle = '#888'; g.lineWidth = dpr * px; g.setLineDash([]);
    g.strokeRect(ox - p.cx * 10 * k, oy - p.cy * 10 * k, p.largeur * 10 * k, p.hauteur * 10 * k);
  }
  const X = (x) => ox + x * k, Y = (y) => oy + y * k;
  const fin = Math.min(SIM.i, SIM.pts.length);
  // fil brodé, couleur par couleur
  g.lineWidth = Math.max(dpr * px * 0.6, SIM_PREF.epaisseur * 10 * k); g.lineCap = 'round'; g.lineJoin = 'round';
  let fil = 0, prec = null, saut = false;
  const sauts = [], marques = [], trous = [];
  g.strokeStyle = SIM.fils[0] || '#000'; g.beginPath();
  for (let i = 0; i < fin; i++) {
    const [x, y, c] = SIM.pts[i];
    if (c === 'STITCH') {
      if (prec) {
        if (saut) sauts.push(prec[0], prec[1], X(x), Y(y));
        else { g.moveTo(prec[0], prec[1]); g.lineTo(X(x), Y(y)); }
      }
      prec = [X(x), Y(y)]; saut = false;
      if (SIM_AFF.npp) trous.push(X(x), Y(y));
      continue;
    }
    if (c === 'COLOR_CHANGE') {
      g.stroke(); fil++; g.strokeStyle = SIM.fils[fil] || '#000'; g.beginPath();
      marques.push(['color_change', X(x), Y(y)]); saut = true; continue;   // nouveau fil : la liaison est un déplacement
    }
    if (c === 'JUMP') {
      if (!saut) marques.push(['jump', prec ? prec[0] : X(x), prec ? prec[1] : Y(y)]);   // grenouille au départ du saut
      if (prec) sauts.push(prec[0], prec[1], X(x), Y(y));
      saut = true;
    }
    if (c === 'TRIM') { marques.push(['trim', X(x), Y(y)]); }
    if (c === 'STOP') { marques.push(['stop', X(x), Y(y)]); }
    prec = [X(x), Y(y)];
  }
  g.stroke();
  if (SIM_AFF.sauts && sauts.length) {
    g.save(); g.strokeStyle = 'rgba(90,90,100,.85)'; g.lineWidth = 1.2 * dpr * px; g.setLineDash([5 * dpr * px, 4 * dpr * px]);
    g.beginPath(); for (let j = 0; j < sauts.length; j += 4) { g.moveTo(sauts[j], sauts[j + 1]); g.lineTo(sauts[j + 2], sauts[j + 3]); }
    g.stroke(); g.restore();
  }
  if (trous.length) {                                  // pénétrations de l'aiguille
    g.fillStyle = 'rgba(0,0,0,.75)';
    const r = Math.max(SIM_PREF.npp * 10 * k / 2, 1.2 * dpr * px);
    for (let j = 0; j < trous.length; j += 2) { g.beginPath(); g.arc(trous[j], trous[j + 1], r, 0, 7); g.fill(); }
  }
  const montre = { jump: SIM_AFF.sauts, trim: SIM_AFF.coupes, stop: SIM_AFF.arrets, color_change: SIM_AFF.couleurs };
  const t = 20 * dpr * px;
  for (const [n, x, y] of marques) {
    if (!montre[n] || !ICONES[n].complete) continue;
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x + t * 0.6, y - t * 0.6, t * 0.62, 0, 7); g.fill();
    g.drawImage(ICONES[n], x + t * 0.1, y - t * 1.1, t, t);
  }
  // aiguille : mire
  const cur = SIM.pts[fin - 1];
  if (cur && SIM_AFF.mire) {
    const cx = X(cur[0]), cy = Y(cur[1]), rr = SIM_PREF.mireRayon * dpr * px;
    g.strokeStyle = SIM_PREF.mireCouleur; g.lineWidth = SIM_PREF.mireEpaisseur * dpr * px;
    g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.moveTo(cx - rr * 1.5, cy); g.lineTo(cx + rr * 1.5, cy); g.moveTo(cx, cy - rr * 1.5); g.lineTo(cx, cy + rr * 1.5); g.stroke();
  }
  // texte : point en cours et commande
  const nPoints = SIM.pts.slice(0, fin).filter((p) => p[2] === 'STITCH').length;
  const total = SIM.pts.filter((p) => p[2] === 'STITCH').length;
  $('#sInfo').textContent = `Point ${nPoints.toLocaleString('fr')} / ${total.toLocaleString('fr')} · fil ${(SIM.couleurs[fin - 1] || 0) + 1} / ${Math.max(1, SIM.fils.length)} · vitesse ${vitesse()} points/s`;
  const c = cur && cur[2] !== 'STITCH' ? NOM_CMD[cur[2]] : '';
  $('#simuCmd').textContent = c ? 'Commande : ' + c : ''; $('#simuCmd').hidden = !c;
  $('#sPos').value = SIM.i;
}
// marques des commandes sous la barre de progression (comme le curseur d'Ink/Stitch)
function dessinerPiste() {
  const cv = $('#sMarques'), dpr = window.devicePixelRatio || 1;
  cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr;
  const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
  if (!SIM.pts) return;
  const n = SIM.pts.length;
  // bandeau des couleurs de fil
  let debut = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || SIM.couleurs[i] !== SIM.couleurs[debut]) {
      g.fillStyle = SIM.fils[SIM.couleurs[debut]] || '#999';
      g.fillRect(debut / n * cv.width, cv.height - 4 * dpr, Math.max(1, (i - debut) / n * cv.width), 4 * dpr);
      debut = i;
    }
  }
  const couleur = { JUMP: '#888', TRIM: '#d33', STOP: '#d80', COLOR_CHANGE: '#36c' };
  const montre = { JUMP: SIM_AFF.sauts, TRIM: SIM_AFF.coupes, STOP: SIM_AFF.arrets, COLOR_CHANGE: SIM_AFF.couleurs };
  for (const i of SIM.cmds) {
    const c = SIM.pts[i][2];
    if (!montre[c]) continue;
    g.fillStyle = couleur[c]; g.fillRect(i / n * cv.width, 0, Math.max(1, dpr), cv.height - 5 * dpr);
  }
}
function rendreInfoSimu() {
  const d = $('#simuInfo');
  d.hidden = !SIM_AFF.info;
  if (!SIM.pts) return;
  const s = calculerStats(S.simu);
  const nb = (c) => SIM.pts.filter((p) => p[2] === c).length;
  d.innerHTML = `<b>Informations</b><table>
    <tr><td>Dimensions</td><td>${s.larg.toFixed(2)} × ${s.haut.toFixed(2)} mm</td></tr>
    <tr><td>Points</td><td>${s.n.toLocaleString('fr')}</td></tr><tr><td>Changements de couleur</td><td>${nb('COLOR_CHANGE')}</td></tr>
    <tr><td>Sauts</td><td>${nb('JUMP')}</td></tr><tr><td>Coupes</td><td>${nb('TRIM')}</td></tr><tr><td>Arrêts</td><td>${nb('STOP')}</td></tr></table>`;
}
function rendreReglagesSimu(ouvert) {
  const d = $('#simuReglages'); d.hidden = !ouvert;
  if (!ouvert) return;
  d.innerHTML = `<b>Préférences du simulateur</b>
    <label class="interrupteur"><span>Adapter la vitesse au nombre de points</span><input type="checkbox" id="spAdapt" ${SIM_PREF.adapter ? 'checked' : ''}></label>
    <div class="champ"><label>Épaisseur du fil (mm)</label><input type="number" step="0.05" min="0.05" id="spEp" value="${SIM_PREF.epaisseur}"></div>
    <div class="champ"><label>Taille des pénétrations (mm)</label><input type="number" step="0.1" min="0.1" id="spNpp" value="${SIM_PREF.npp}"></div>
    <div class="champ"><label>Rayon de la mire (px)</label><input type="number" step="1" min="2" id="spMr" value="${SIM_PREF.mireRayon}"></div>
    <div class="champ"><label>Épaisseur de la mire (px)</label><input type="number" step="1" min="1" id="spMe" value="${SIM_PREF.mireEpaisseur}"></div>
    <div class="champ"><label>Couleur de la mire</label><input type="color" id="spMc" value="${SIM_PREF.mireCouleur}"></div>`;
  const lier = (id, cle, num = true) => { $(id).onchange = (e) => { SIM_PREF[cle] = e.target.type === 'checkbox' ? e.target.checked : (num ? +e.target.value : e.target.value); memoriser(); dessinerSimulation(); }; };
  lier('#spAdapt', 'adapter'); lier('#spEp', 'epaisseur'); lier('#spNpp', 'npp'); lier('#spMr', 'mireRayon'); lier('#spMe', 'mireEpaisseur'); lier('#spMc', 'mireCouleur', false);
}
// vitesse : niveaux comme Ink/Stitch ; « adapter » vise une broderie complète en une minute environ
function vitesse() {
  const base = SIM_PREF.adapter && SIM.pts ? Math.max(10, SIM.pts.length / 60) : 30;
  return Math.max(1, Math.round(base * Math.pow(1.6, SIM.niveau - 5)));
}
function boucle(t) {
  if (!SIM.lecture) return;
  const dt = SIM.dernier ? (t - SIM.dernier) / 1000 : 0; SIM.dernier = t;
  SIM.reste += dt * vitesse();
  const pas = Math.floor(SIM.reste); SIM.reste -= pas;
  SIM.i = Math.max(0, Math.min(SIM.pts.length, SIM.i + pas * SIM.sens));
  dessinerSimulation();
  if ((SIM.sens > 0 && SIM.i >= SIM.pts.length) || (SIM.sens < 0 && SIM.i <= 0)) { arreterSimulation(); return; }
  SIM.raf = requestAnimationFrame(boucle);
}
function jouer() {
  if (!SIM.pts) return;
  if (SIM.lecture) { arreterSimulation(); return; }
  if (SIM.sens > 0 && SIM.i >= SIM.pts.length) SIM.i = 0;
  if (SIM.sens < 0 && SIM.i <= 0) SIM.i = SIM.pts.length;
  SIM.lecture = true; SIM.dernier = 0; SIM.reste = 0; majBoutonsSimu(); SIM.raf = requestAnimationFrame(boucle);
}
function arreterSimulation() { SIM.lecture = false; cancelAnimationFrame(SIM.raf); majBoutonsSimu(); }
function allerA(i) { arreterSimulation(); SIM.i = Math.max(0, Math.min(SIM.pts ? SIM.pts.length : 0, i)); dessinerSimulation(); }
function commandeVoisine(sens) {
  if (!SIM.pts) return;
  const liste = SIM.cmds.map((i) => i + 1);
  const cible = sens > 0 ? liste.find((i) => i > SIM.i) : [...liste].reverse().find((i) => i < SIM.i);
  allerA(cible ?? (sens > 0 ? SIM.pts.length : 0));
}
const ACTIONS_SIMU = {
  restart: ['Recommencer (R)', () => { SIM.i = 0; if (!SIM.lecture) jouer(); else dessinerSimulation(); }],
  backward_command: ['Commande précédente (Pg↓)', () => commandeVoisine(-1)],
  backward_stitch: ['Point précédent (−)', () => allerA(SIM.i - 1)],
  play: ['Lecture / pause (P)', jouer],
  forward_stitch: ['Point suivant (+)', () => allerA(SIM.i + 1)],
  forward_command: ['Commande suivante (Pg↑)', () => commandeVoisine(1)],
  direction: ['Changer le sens de l\'animation (← →)', () => { SIM.sens = -SIM.sens; majBoutonsSimu(); }],
  slower: ['Plus lent (↓)', () => { SIM.niveau = Math.max(1, SIM.niveau - 1); dessinerSimulation(); }],
  faster: ['Plus rapide (↑)', () => { SIM.niveau = Math.min(15, SIM.niveau + 1); dessinerSimulation(); }],
};
const VUES_SIMU = [['npp', 'npp', 'Pénétrations de l\'aiguille (O)'], ['sauts', 'jump', 'Sauts'], ['coupes', 'trim', 'Coupes'],
  ['arrets', 'stop', 'Arrêts'], ['couleurs', 'color_change', 'Changements de couleur'], ['mire', 'cursor', 'Mire sur l\'aiguille'],
  ['page', 'page', 'Afficher la page'], ['info', 'info', 'Informations sur le motif']];
function construireBarresSimu() {
  const c = $('#simuControles'); c.innerHTML = '';
  for (const [k, [titre, f]] of Object.entries(ACTIONS_SIMU)) {
    const b = document.createElement('button'); b.className = 'ico-btn'; b.dataset.action = k; b.title = titre;
    b.innerHTML = icone(k); b.onclick = f; c.appendChild(b);
  }
  const v = $('#simuVues'); v.innerHTML = '';
  for (const [k, ic, titre] of VUES_SIMU) {
    const b = document.createElement('button'); b.className = 'ico-btn bascule' + (SIM_AFF[k] ? ' on' : ''); b.title = titre;
    b.innerHTML = icone(ic);
    b.onclick = () => { SIM_AFF[k] = !SIM_AFF[k]; b.classList.toggle('on', SIM_AFF[k]); memoriser(); dessinerPiste(); rendreInfoSimu(); dessinerSimulation(); };
    v.appendChild(b);
  }
  const fond = document.createElement('label'); fond.className = 'ico-btn'; fond.title = 'Couleur du fond';
  fond.innerHTML = `<input type="color" value="${SIM_AFF.fond}">`;
  $('input', fond).oninput = (e) => { SIM_AFF.fond = e.target.value; memoriser(); dessinerSimulation(); };
  v.appendChild(fond);
  const reg = document.createElement('button'); reg.className = 'ico-btn bascule'; reg.title = 'Préférences du simulateur';
  reg.innerHTML = icone('settings');
  reg.onclick = () => { const o = $('#simuReglages').hidden; reg.classList.toggle('on', o); rendreReglagesSimu(o); };
  v.appendChild(reg);
}
function majBoutonsSimu() {
  const p = $('#simuControles [data-action=play]');
  if (p) p.innerHTML = icone(SIM.lecture ? 'stop' : 'play');
  const d = $('#simuControles [data-action=direction]');
  if (d) d.classList.toggle('on', SIM.sens < 0);
}
construireBarresSimu();
// poignée : hauteur de la simulation (double-clic : toute la hauteur disponible)
try { const h = localStorage.getItem('broderie.hauteurSimu'); if (h) { document.documentElement.style.setProperty('--hauteur-simu', h + 'px'); $('#v-points').classList.add('taille-fixe'); } } catch (e) { /* rien */ }
$('#poigneeSimu').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const v = $('.simu-vue'), h0 = v.getBoundingClientRect().height, y0 = e.clientY;
  let h = h0;
  $('#v-points').classList.add('taille-fixe');
  const mv = (ev) => { h = Math.max(140, h0 + ev.clientY - y0); document.documentElement.style.setProperty('--hauteur-simu', h + 'px'); dessinerSimulation(); };
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
    try { localStorage.setItem('broderie.hauteurSimu', Math.round(h)); } catch (x) { /* rien */ } dessinerPiste(); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
});
$('#poigneeSimu').addEventListener('dblclick', () => {
  $('#v-points').classList.remove('taille-fixe'); document.documentElement.style.removeProperty('--hauteur-simu');
  try { localStorage.removeItem('broderie.hauteurSimu'); } catch (x) { /* rien */ }
  dessinerSimulation();
});
$('#sPos').oninput = (e) => allerA(+e.target.value);
window.addEventListener('resize', () => { if (S.vue === 'points') { dessinerPiste(); dessinerSimulation(); } });
document.addEventListener('keydown', (e) => {
  if (S.vue !== 'points' || /input|textarea|select/i.test(e.target.tagName)) return;
  const touches = { p: 'play', P: 'play', r: 'restart', R: 'restart', ArrowUp: 'faster', ArrowDown: 'slower', '+': 'forward_stitch',
    '=': 'forward_stitch', '-': 'backward_stitch', PageUp: 'forward_command', PageDown: 'backward_command' };
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { SIM.sens = e.key === 'ArrowLeft' ? -1 : 1; majBoutonsSimu(); e.preventDefault(); return; }
  if (e.key === 'o' || e.key === 'O') { SIM_AFF.npp = !SIM_AFF.npp; memoriser(); construireBarresSimu();
// poignée : hauteur de la simulation (double-clic : toute la hauteur disponible)
try { const h = localStorage.getItem('broderie.hauteurSimu'); if (h) { document.documentElement.style.setProperty('--hauteur-simu', h + 'px'); $('#v-points').classList.add('taille-fixe'); } } catch (e) { /* rien */ }
$('#poigneeSimu').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const v = $('.simu-vue'), h0 = v.getBoundingClientRect().height, y0 = e.clientY;
  let h = h0;
  $('#v-points').classList.add('taille-fixe');
  const mv = (ev) => { h = Math.max(140, h0 + ev.clientY - y0); document.documentElement.style.setProperty('--hauteur-simu', h + 'px'); dessinerSimulation(); };
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
    try { localStorage.setItem('broderie.hauteurSimu', Math.round(h)); } catch (x) { /* rien */ } dessinerPiste(); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
});
$('#poigneeSimu').addEventListener('dblclick', () => {
  $('#v-points').classList.remove('taille-fixe'); document.documentElement.style.removeProperty('--hauteur-simu');
  try { localStorage.removeItem('broderie.hauteurSimu'); } catch (x) { /* rien */ }
  dessinerSimulation();
}); dessinerSimulation(); return; }
  if (touches[e.key]) { ACTIONS_SIMU[touches[e.key]][1](); e.preventDefault(); }
});
// molette : zoom autour du pointeur · glisser : déplacer · double-clic : tout voir
$('#simuCanvas').addEventListener('wheel', (e) => {
  if (!SIM.pts) return; e.preventDefault();
  const r = e.currentTarget.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  const mx = (e.clientX - r.left) * dpr, my = (e.clientY - r.top) * dpr, f = e.deltaY < 0 ? 1.2 : 1 / 1.2;
  const k = Math.max(0.5, Math.min(80, SIM.vue.k * f)), q = k / SIM.vue.k;
  SIM.vue = { k, x: mx - (mx - SIM.vue.x) * q, y: my - (my - SIM.vue.y) * q };
  dessinerSimulation();
}, { passive: false });
$('#simuCanvas').addEventListener('pointerdown', (e) => {
  const dpr = window.devicePixelRatio || 1, x0 = SIM.vue.x, y0 = SIM.vue.y;
  const mv = (ev) => { SIM.vue.x = x0 + (ev.clientX - e.clientX) * dpr; SIM.vue.y = y0 + (ev.clientY - e.clientY) * dpr; dessinerSimulation(); };
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
});
$('#simuCanvas').addEventListener('dblclick', () => { SIM.vue = { k: 1, x: 0, y: 0 }; dessinerSimulation(); });

// ---------------------------------------------------------------- texte brodé (sans fenêtre Ink/Stitch)
const TX = { texte: 'Bonjour', police: null, echelle: 100, align: 'left', pour: null,
  lettres: 0, mots: 0, lignes: 0, coupes: 'off', tri: 'off', symboles: false };
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
      TX.lettres = j.letter_spacing || 0; TX.mots = j.word_spacing || 0; TX.lignes = j.line_height || 0;
      TX.coupes = ['off', 'line', 'word', 'glyph'][j.trim_option || 0] || 'off';
      TX.tri = ['off', 'all', 'line', 'word'][j.color_sort || 0] || 'off'; TX.symboles = !!j.use_trim_symbols;
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
    <details class="theme"><summary>Espacements, coupes et couleurs</summary>
      <div class="reglage"><div class="haut"><label>Espace entre les lettres</label><span class="val"><input type="number" step="0.5" id="txLet" value="${TX.lettres}"><span class="unite">mm</span></span></div></div>
      <div class="reglage"><div class="haut"><label>Espace entre les mots</label><span class="val"><input type="number" step="0.5" id="txMot" value="${TX.mots}"><span class="unite">mm</span></span></div></div>
      <div class="reglage"><div class="haut"><label>Interligne (en plus)</label><span class="val"><input type="number" step="0.5" id="txLig" value="${TX.lignes}"><span class="unite">mm</span></span></div></div>
      <div class="reglage"><div class="haut"><label>Couper le fil</label></div><select id="txCoupe">
        ${[['off', 'Jamais'], ['line', 'Après chaque ligne'], ['word', 'Après chaque mot'], ['glyph', 'Après chaque lettre']].map(([k, l]) => `<option value="${k}" ${TX.coupes === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="reglage"><div class="haut"><label>Regrouper les couleurs (polices multicolores)</label></div><select id="txTri">
        ${[['off', 'Non'], ['all', 'Tout le texte'], ['line', 'Par ligne'], ['word', 'Par mot']].map(([k, l]) => `<option value="${k}" ${TX.tri === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <label class="interrupteur"><span>Coupes par symboles de commande</span><input type="checkbox" id="txSym" ${TX.symboles ? 'checked' : ''}></label>
    </details>
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
      TX.lettres = +$('#txLet').value || 0; TX.mots = +$('#txMot').value || 0; TX.lignes = +$('#txLig').value || 0;
      TX.coupes = $('#txCoupe').value; TX.tri = $('#txTri').value; TX.symboles = $('#txSym').checked;
      const r = await api('lettrage', { remplacer: existant ? existant.id : null,
        params: { text: TX.texte, font: TX.police, scale: TX.echelle, 'text-align': TX.align, letter_spacing: TX.lettres,
          word_spacing: TX.mots, line_height: TX.lignes, trim: TX.coupes, 'color-sort': TX.tri, 'use-command-symbols': TX.symboles } },
        'Création du texte brodé…');
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
  S.etat = await api('etat');
  if (S.apresSatin && t.modifie) {                     // montre la nouvelle colonne satin
    const satins = S.etat.objets.filter((o) => o.types.includes('satin_column'));
    if (satins.length) S.sel = satins[satins.length - 1].id;
  }
  S.apresSatin = false;
  rendreTout();
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
function rendreBoutonLarge() { $('#bLarge').textContent = window.innerWidth >= 760 ? '⇆ Panneau étroit' : '⇆ Aperçu à gauche'; }
$('#bLarge').onclick = async () => {
  const large = window.innerWidth < 760;
  try {
    const r = await api('fenetre', { largeur: large ? Math.min(1100, Math.round(screen.availWidth * 0.55)) : 440 });
    if (!r.ok) message('Élargissez la fenêtre en tirant son bord gauche : l\'aperçu passe à gauche à partir de 760 pixels.');
  } catch (e) { message('Élargissez la fenêtre en tirant son bord gauche : l\'aperçu passe à gauche à partir de 760 pixels.'); }
};
window.addEventListener('resize', rendreBoutonLarge);
rendreBoutonLarge();
$('#bEnvoyer').onclick = async () => {
  const b = $('#bEnvoyer'); b.disabled = true; b.textContent = 'Envoi…';
  try {
    const r = await api('envoyer');
    if (!r.ok) message(r.message, true); else message('Synchronisé avec Inkscape.');
  } catch (e) { message(e.message, true); } finally {
    setTimeout(() => { b.disabled = false; b.textContent = '⇄ Synchroniser avec Inkscape'; }, 1500);
  }
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
  $('.titre').insertAdjacentHTML('beforeend', `<span class="muted small" title="Version du panneau">v${esc(S.etat.version_panneau || '')}</span>`);
  $('.titre').appendChild($('#bLarge'));
  const prefere = ['dst', 'pes', 'jef', 'exp', 'vp3', 'xxx'];
  const fmts = S.etat.formats.length ? S.etat.formats : prefere;
  const NOMS_FMT = { dst: 'Tajima', pes: 'Brother', jef: 'Janome', exp: 'Melco / Bernina', vp3: 'Husqvarna / Pfaff', xxx: 'Singer' };
  $('#fFormat').innerHTML = fmts.slice().sort((a, b) => (prefere.indexOf(a) + 1 || 99) - (prefere.indexOf(b) + 1 || 99))
    .map((f) => `<option value="${f}">.${f}${NOMS_FMT[f] ? ' (' + NOMS_FMT[f] + ')' : ''}</option>`).join('');
  await api('present');
  rendreTout();
  // lien direct vers un onglet : …/#points, #apercu, #export, #texte
  const [h, arg] = decodeURIComponent(location.hash.slice(1)).split('/');
  if (arg && h === 'objets') choisir([arg]);
  if (arg === 'realiste') MODE = 'realiste';
  if (h === 'texte') { changerVue('objets'); S.texte = true; rendreTout(); }
  else changerVue(['points', 'apercu', 'export'].includes(h) ? h : 'objets');
})();
