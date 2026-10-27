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
    let r;
    try { r = await fetch('/api/' + nom, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); }
    catch (e) { throw new Error(`Le panneau ne répond plus (arrêté ou en cours de mise à jour) : appuyez sur ${S.etat && S.etat.raccourci || '⌘⌥B'} dans Inkscape.`); }
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
  texte_droit: '<path d="M4 20h36" stroke-dasharray="2 2"/><path d="M8 18l3-9 3 9M18 18v-9h3a2 2 0 0 1 0 4h-3M26 9h6M29 9v9M35 9l4 9"/>',
  texte_haut: '<path d="M4 26C12 6 32 6 40 26" stroke-dasharray="2 2"/><path d="M9 17l2-7 4 5M18 11l2-6 3 5M26 10l3-5 2 6M34 14l3-5 1 7"/>',
  texte_bas: '<path d="M4 6c8 20 28 20 36 0" stroke-dasharray="2 2"/><path d="M8 11l3 6 2-6M17 15l2 6 3-5M26 16l2-6 3 5M34 11l1 7 3-5"/>',
  texte_trace: '<path d="M3 22c6-14 12-14 18 0s12 14 20-4" stroke-dasharray="2 2"/><circle cx="3" cy="22" r="1.5"/><circle cx="41" cy="18" r="1.5"/><path d="M7 12l2-6 3 5M27 22l2 6 3-5"/>',
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
  satin_column: ['zigzag_spacing_mm', 'pull_compensation_mm', 'pull_compensation_percent', 'max_stitch_length_mm', 'split_method'],
  stroke: ['running_stitch_length_mm', 'repeats', 'zigzag_spacing_mm', 'line_count', 'min_line_dist_mm', 'satin_guide_pattern_position'],
};
// même réglage, sens différent selon le type : pour un satin, la longueur max. sert à découper les longs points
const NOMS_TYPE = { satin_column: { max_stitch_length_mm: 'Découpe des longs points (longueur max.)', split_method: 'Méthode de découpe',
  pull_compensation_mm: 'Compensation (mm)', pull_compensation_percent: 'Compensation (% de la largeur)',
  short_stitch_inset: 'Raccourcir de (% de la largeur)', short_stitch_distance_mm: 'quand les points sont à moins de' } };
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
  pull_compensation_percent: [0, 50, 1, 0], short_stitch_inset: [0, 100, 5, 15], short_stitch_distance_mm: [0, 2, 0.05, 0.25],
};
// réglages vides par défaut dans Ink/Stitch : ce que veut dire « vide » (sinon : « auto »)
const VIDE = { max_stitch_length_mm: 'non' };
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
const NOM_TYPE = { fill_stitch: 'Remplissage', satin_column: 'Satin', stroke: 'Trait', clone: 'Clone', lettrage: 'Texte', guide: 'Ligne guide' };
const ICO_TYPE = { fill_stitch: 'tatami_fill', satin_column: 'satin_column', stroke: 'running_stitch', clone: 'manual_stitch', lettrage: 'texte', guide: 'guided_fill' };

// Sélection : S.sel = objet principal ; S.choix = ensemble des objets choisis (plusieurs → réglages communs)
S.choix = new Set();
const choisis = () => S.etat.objets.filter((o) => S.choix.has(o.id));
function choisir(ids, ajouter = false) {
  S.aucun = false;                                  // « Tout désélectionner » : plus rien de choisi jusqu'au prochain clic
  if (!ajouter) S.choix = new Set();
  ids.forEach((i) => S.choix.add(i));
  S.sel = ids[ids.length - 1] || null;
  S.texte = false;
  rendreTout();
}
// isoler : des lunettes, « regarder de près » (pas la cible de « Suivre l'aiguille », pas la loupe du zoom)
const CIBLE = '<svg viewBox="0 0 24 24" stroke-linejoin="round"><circle cx="6.5" cy="14" r="3.8"/><circle cx="17.5" cy="14" r="3.8"/><path d="M10.3 13.2c1.1-.9 2.3-.9 3.4 0M2.7 13.2L4.5 7.5M21.3 13.2L19.5 7.5"/></svg>';
const OEIL = (vis) => vis ? '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'
  : '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 4.4-1"/></svg>';
async function basculerVisible(id, visible) {
  try { S.etat = await api('visible', { id, visible }); rendreTout(); apercuBientot(); } catch (e) { message(e.message, true); }
}

// glisser-déposer : réordonner objets et calques comme dans Inkscape (l'ordre est l'ordre de couture)
let glisse = null;
function glisser(li, id, calque) {
  li.draggable = true;
  // objet lâché sur l'en-tête d'un calque : bord du haut = entre deux calques (un calque à lui, « · avant … »),
  // le reste = dans le calque
  const zone = (e) => {
    if (!(calque && glisse && !glisse.calque)) return e.clientY > li.getBoundingClientRect().top + li.getBoundingClientRect().height / 2 ? 'apres' : 'avant';
    const r = li.getBoundingClientRect();
    return e.clientY < r.top + r.height * 0.4 ? 'entre' : 'dans';
  };
  li.addEventListener('dragstart', (e) => { glisse = { id, calque }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); li.classList.add('glisse'); });
  li.addEventListener('dragend', () => { li.classList.remove('glisse'); $$('#liste .avant, #liste .apres, #liste .dans, #liste .entre').forEach((x) => x.classList.remove('avant', 'apres', 'dans', 'entre')); });
  li.addEventListener('dragover', (e) => {
    if (!glisse || glisse.id === id) return;
    if (glisse.calque && !calque) return;                       // un calque se dépose sur un autre calque
    e.preventDefault();
    const z = zone(e);
    for (const k of ['avant', 'apres', 'dans', 'entre']) li.classList.toggle(k, k === z);
  });
  li.addEventListener('dragleave', () => li.classList.remove('avant', 'apres', 'dans', 'entre'));
  li.addEventListener('drop', async (e) => {
    e.preventDefault();
    const z = zone(e), g = glisse; glisse = null;
    li.classList.remove('avant', 'apres', 'dans', 'entre');
    if (!g || g.id === id) return;
    try {
      if (z === 'entre') {                                     // plusieurs objets choisis : ils suivent celui qu'on glisse
        const ids = S.choix.has(g.id) && S.choix.size > 1 ? [...S.choix] : [g.id];
        S.etat = await api('broder_ailleurs', { ids, cible: id, apres: false });
        message('Placé entre deux calques, dans un calque à lui : sa place à l\'écran ne change pas, seul l\'ordre de broderie change.');
      } else {                                                  // plusieurs objets choisis : tous suivent
        const ids = !g.calque && S.choix.has(g.id) && S.choix.size > 1 ? [...S.choix] : [g.id];
        S.etat = await api('placer', { id: g.id, ids, cible: id, apres: z === 'apres' });
      }
      S.simu = S.simuP = null; rendreTout(); apercuBientot();
    } catch (x) { message(x.message, true); }
  });
}

// calques repliés dans la liste (retenus d'une fois sur l'autre)
let REPLIES = new Set();
try { REPLIES = new Set(JSON.parse(localStorage.getItem('broderie.replies') || '[]')); } catch (e) { /* aucun */ }
function replier(cle, oui) {
  if (oui) REPLIES.add(cle); else REPLIES.delete(cle);
  try { localStorage.setItem('broderie.replies', JSON.stringify([...REPLIES])); } catch (e) { /* rien */ }
  rendreListe();
}
function rendreListe() {
  const ul = $('#liste'); ul.innerHTML = '';
  bandeauSelection();
  if (!S.choix.size && S.sel) S.choix.add(S.sel);
  const calques = new Map();
  for (const o of S.etat.objets) {
    const k = o.calque || '';
    if (!calques.has(k)) calques.set(k, { nom: o.calque_nom || 'Sans calque', objets: [] });
    calques.get(k).objets.push(o);
  }
  const plusieursCalques = calques.size > 1;
  let dernier = null;
  for (const [cle, c] of calques) {
    const replie = REPLIES.has(cle);
    const choisisIci = c.objets.filter((o) => S.choix.has(o.id)).length;     // sélection cachée dans un calque replié
    if (plusieursCalques || calques.size === 1 && c.objets.length > 1) {
      const h = document.createElement('li'); h.className = 'calque';
      const tous = c.objets.every((o) => S.choix.has(o.id));
      const cm = c.objets[0].calque_masque;
      const compte = replie && choisisIci
        ? `<span class="choix-cache" title="La sélection est dans ce calque replié">${choisisIci} choisi${choisisIci > 1 ? 's' : ''}</span>`
        : `<span class="type">${c.objets.length} objet${c.objets.length > 1 ? 's' : ''}</span>`;
      h.innerHTML = `<button class="replier" title="${replie ? 'Déplier ce calque' : 'Replier ce calque'}">${replie ? '▸' : '▾'}</button><span class="nom">${esc(c.nom)}</span>`
        + `<button class="tout-calque" title="Choisir tous les objets de ce calque (⌘-clic : les ajouter à la sélection)">Tout</button>${compte}`
        + (c.objets[0].calque ? `<button class="oeil" title="${cm ? 'Calque masqué : non brodé. Cliquer pour l’afficher' : 'Masquer ce calque (il ne sera pas brodé)'}">${OEIL(!cm)}</button>` : '');
      if (cm) h.classList.add('masque');
      if (replie && choisisIci) h.classList.add('contient-choix');
      const bo = h.querySelector('.oeil');
      if (bo) bo.onclick = (e) => { e.stopPropagation(); basculerVisible(c.objets[0].calque, cm); };
      $('.replier', h).onclick = (e) => { e.stopPropagation(); replier(cle, !replie); };
      $('.tout-calque', h).onclick = (e) => { e.stopPropagation(); choisir(c.objets.map((o) => o.id), e.metaKey || e.ctrlKey); };
      h.title = replie ? 'Déplier ce calque' : 'Replier ce calque';
      if (tous && S.choix.size > 1) h.classList.add('on');
      h.onclick = () => replier(cle, !replie);                 // la ligne replie ou déplie : la sélection n'est pas touchée
      if (c.objets[0].calque) glisser(h, c.objets[0].calque, true);
      ul.appendChild(h);
    }
    for (const o of replie ? [] : c.objets) {
      const t = typePrincipal(o);
      const li = document.createElement('li');
      li.className = 'objet' + (S.choix.has(o.id) ? ' on' : '') + (o.masque ? ' masque' : '');
      li.innerHTML = `<span class="pastille" style="background:${esc(o.couleur)}"></span><span class="nom">${esc(o.nom)}</span>
        <span class="type">${esc(NOM_TYPE[t] || t)}</span>
        <button class="fl" data-sens="-1" title="Coudre plus tôt">▲</button><button class="fl" data-sens="1" title="Coudre plus tard">▼</button>
        <button class="isoler${S.isole && S.isole.has(o.id) ? ' on' : ''}" title="${S.isole && S.isole.has(o.id) ? 'Isolé : cliquer pour tout réafficher' : 'Isoler : ne voir que lui (ou la sélection) dans l’aperçu et la simulation'}">${CIBLE}</button>
        <button class="oeil" title="${o.masque ? 'Masqué : non brodé. Cliquer pour l’afficher' : 'Masquer (ne pas broder)'}">${OEIL(!o.masque)}</button>`;
      if (S.isole && !S.isole.has(o.id)) li.classList.add('hors-isole');
      $('.isoler', li).onclick = (e) => {
        e.stopPropagation();
        isoler(S.choix.has(o.id) && S.choix.size > 1 ? [...S.choix] : [o.id]);
      };
      $('.oeil', li).onclick = (e) => {
        e.stopPropagation();
        if (o.calque_masque) { message('Son calque est masqué : cliquez sur l’œil du calque pour l’afficher.'); return; }
        basculerVisible(o.id, o.masque);
      };
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
      glisser(li, o.id, false);
      ul.appendChild(li);
      dernier = o;
    }
  }
  if (!S.etat.objets.length) ul.innerHTML = '<li class="muted small" style="cursor:default">Aucun objet. Dessinez une forme dans Inkscape, puis appuyez sur ⌘⌥B.</li>';
  boutonDeselection();
  const aide = $('#aideSelection');
  if (aide) aide.textContent = S.choix.size > 1 ? `${S.choix.size} objets choisis` : '⌘-clic : plusieurs · ⇧-clic : une suite · clic sur un calque : le replier · « Tout » : tout le calque · glisser : changer l’ordre';
  $('#carteListe .carte-titre span').title = '⌘-clic : plusieurs · ⇧-clic : une suite · clic sur un calque : le replier · « Tout » : tout le calque · glisser : changer l’ordre';
}

// Fond d'opacité 0 (curseur A à zéro dans Inkscape) : Ink/Stitch ne le brode pas, quelle que soit sa couleur
function alerteTransparent(objs) {
  const d = document.createElement('div'); d.className = 'alerte-transparent';
  d.innerHTML = `<b>Fond transparent : pas brodé.</b> L'opacité du fond est à 0 (curseur A dans Fond et contour d'Inkscape), `
    + `Ink/Stitch ne calcule aucun point. <button type="button" class="petit">Rendre le fond opaque</button>`;
  $('button', d).onclick = async () => {
    try { S.etat = await api('opaque', { ids: objs.map((x) => x.id) }); S.simu = S.simuP = null; rendreTout(); apercuBientot(); message('Fond rendu opaque : l\'objet sera brodé.'); }
    catch (e) { message(e.message, true); }
  };
  return d;
}
// Isoler : l'aperçu et la simulation ne montrent que ces objets. Rien ne change dans le dessin (ni Inkscape, ni export) :
// ce n'est pas l'œil, qui retire un objet de la broderie.
S.isole = null;
const idsVus = () => (S.isole && S.isole.size ? [...S.isole] : S.etat.selection);
function isoler(ids) {
  const meme = ids && S.isole && ids.length === S.isole.size && ids.every((i) => S.isole.has(i));
  S.isole = ids && ids.length && !meme ? new Set(ids) : null;
  S.recadrer = true;                                  // l'aperçu se cadre sur ce qui est montré
  const vieux = $('#apercu .barre-rendu'); if (vieux) vieux.replaceWith(barreRendu());
  S.simu = S.simuP = null; rendreListe(); apercuBientot();
  message(S.isole ? `Isolé : seulement ${S.isole.size > 1 ? `ces ${S.isole.size} objets` : 'cet objet'} dans l'aperçu et la simulation (le dessin ne change pas).` : 'Tout le dessin est de nouveau affiché.');
}
// « Tout désélectionner » dans l'en-tête de la liste, seulement quand quelque chose est choisi (Échap fait pareil)
function toutDeselectionner() { S.choix = new Set(); S.sel = null; S.aucun = true; S.texte = false; S.placer = null; modePlacement(); rendreTout(); }
function boutonDeselection() {
  let b = $('#bDeselect');
  if (!S.choix.size) { if (b) b.remove(); return; }
  if (!b) {
    b = document.createElement('button'); b.id = 'bDeselect'; b.type = 'button'; b.className = 'petit';
    b.textContent = 'Tout désélectionner'; b.title = 'Ne plus rien choisir (Échap)'; b.onclick = toutDeselectionner;
    $('#bTexte').before(b);
  }
}
// Liste limitée aux objets sélectionnés dans Inkscape au moment du ⌘⌥B : on le dit, et on peut revenir à tout le dessin
function bandeauSelection() {
  let b = $('#bandeauSelection');
  const n = S.etat.objets.length, total = S.etat.total || n;
  if (!(S.etat.selection || []).length || total <= n) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'bandeauSelection'; $('#liste').before(b); }
  b.innerHTML = `<span>Sélection d’Inkscape : <b>${n}</b> objet${n > 1 ? 's' : ''} sur ${total}</span><button type="button" class="petit">Tout le dessin</button>`;
  b.title = 'Au ⌘⌥B, des objets étaient sélectionnés dans Inkscape : la liste, l’aperçu et l’export se limitent à eux.';
  $('button', b).onclick = async () => {
    try { S.etat = await api('tout_le_dessin'); S.simu = S.simuP = null; rendreTout(); apercuBientot(); } catch (e) { message(e.message, true); }
  };
}

function changerCouleur(o, valeur) {
  const cibles = [];
  if (o.types.includes('fill_stitch') && o.remplissage && o.remplissage !== 'none') cibles.push('fill');
  if (o.contour && o.contour !== 'none') cibles.push('stroke');
  return (async () => {
    for (const quoi of cibles) S.etat = await api('couleur', { id: o.id, quoi, valeur });
    rendreListe(); rendreAttente(); apercuBientot();      // la fiche n'est pas redessinée : le sélecteur y reste accroché
  })();
}
// Sélecteur de couleur du Mac : il envoie une couleur à chaque mouvement de curseur. On ne touche pas à la fiche
// pendant ce temps (sinon le sélecteur perd son champ et Safari peut planter) : la couleur part après une pause.
function suivreCouleur(input, appliquer, apercuLocal) {
  let minut = null;
  const envoyer = () => { clearTimeout(minut); minut = null; S.choixCouleur = false; appliquer(input.value); };
  const bouger = () => {
    S.choixCouleur = true; if (apercuLocal) apercuLocal(input.value);
    clearTimeout(minut); minut = setTimeout(envoyer, 600);
  };
  input.addEventListener('input', bouger); input.addEventListener('change', bouger);
  input.addEventListener('blur', () => { if (minut) envoyer(); });
}

// Couleurs déjà utilisées dans le dessin (tous calques) : un clic donne exactement la même aux objets choisis.
const hexa = (c) => (/^#[0-9a-f]{3}$/i.test(c) ? '#' + [...c.slice(1)].map((x) => x + x).join('') : (c || '#000000').slice(0, 7)).toLowerCase();
function nuancierDessin(choix, appliquer) {
  const groupes = new Map();
  for (const x of S.etat.objets) {
    if (!/^#[0-9a-f]{3}([0-9a-f]{3})?/i.test(x.couleur || '')) continue;
    const c = hexa(x.couleur);
    if (!groupes.has(c)) groupes.set(c, []);
    groupes.get(c).push(x.nom);
  }
  const d = document.createElement('div'); d.className = 'nuancier';
  if (groupes.size < 2 && choix.every((o) => groupes.has(hexa(o.couleur)))) return d;   // rien d'autre à proposer
  const actives = new Set(choix.map((o) => hexa(o.couleur)));
  d.innerHTML = '<div class="muted small">Couleurs déjà dans le dessin</div><div class="pastilles"></div>';
  [...groupes].forEach(([c, noms], i) => {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'pastille' + (actives.has(c) && actives.size === 1 ? ' on' : '');
    b.style.background = c;
    const fil = nomFil(c, i);
    b.title = (fil.startsWith('Fil ') ? c : fil) + ' — ' + noms.join(', ');
    if (noms.length > 1) b.innerHTML = `<span>${noms.length}</span>`;
    b.onclick = async () => { await appliquer(c); rendreProps(); };
    $('.pastilles', d).appendChild(b);
  });
  return d;
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
    if (o.lettres) {                                    // lettres d'un texte : toutes, ou une seule, d'un même type de forme
      const r = await api('lettres', { id: o.id, type: o.lettres.type, valeurs, lettre: o.lettres.lettre });
      S.etat = r.etat; rendreTout(); apercuBientot(); return;
    }
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
    return avecConseil(d, o, p);
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
    // réglage vide dans Ink/Stitch (découpe des longs points, angle d'un clone…) : désactivé ou automatique.
    // On ne montre pas une valeur qui ne serait pas appliquée : curseur grisé et case « Activer ».
    // Vide : bouton « Activer ». Activé : la flèche ↺ le désactive (retour à « non »).
    const vide = !modifie && (p.default === null || p.default === undefined || p.default === '');
    const etatVide = VIDE[p.name] || 'auto';
    const n = parseFloat(v ?? def);
    const razVide = (p.default === null || p.default === undefined || p.default === '')
      ? `<button class="raz" title="Désactiver (revenir à « ${VIDE[p.name] || 'auto'} »)">↺</button>` : raz;
    d.innerHTML = `<div class="haut"><label title="${aide}">${lib}</label><span class="val">${vide
      ? `<button type="button" class="activer" title="Appliquer la valeur proposée (${n} ${esc(p.unite || '')})">Activer</button>` : razVide}<input type="number" step="${pas}" value="${vide ? '' : n}" placeholder="${etatVide}">${unite}</span></div>
      <input type="range" min="${mi}" max="${ma}" step="${pas}" value="${n}">`;
    const num = $('input[type=number]', d), cur = $('input[type=range]', d);
    if (vide) { d.classList.add('inactif'); $('.activer', d).onclick = () => envoyer(o, { [p.name]: n }); }
    cur.oninput = () => { num.value = cur.value; };
    cur.onchange = () => envoyer(o, { [p.name]: cur.value });
    num.onchange = () => envoyer(o, { [p.name]: num.value });
  } else {
    d.innerHTML = `<div class="haut"><label title="${aide}">${lib}</label><span class="val">${raz}<input type="text" value="${esc(o.valeurs[p.name] ?? '')}" placeholder="${esc(valeurParDefaut(p) ?? 'auto')}">${unite}</span></div>`;
    $('input', d).onchange = (e) => envoyer(o, { [p.name]: e.target.value });
  }
  const raz0 = $('.raz', d); if (raz0) raz0.onclick = () => envoyer(o, { [p.name]: null });   // absent si le réglage est vide
  return avecConseil(d, o, p);
}

// ---------------------------------------------------------------- conseils (ⓘ) : bonne pratique en deux phrases,
// et la page de la documentation d'Ink/Stitch pour aller plus loin
const DOC = 'https://inkstitch.org/fr/docs/';
const DOC_SATIN = DOC + 'stitches/satin-column/', DOC_REMP = DOC + 'stitches/fill-stitch/', DOC_TRAIT = DOC + 'stitches/running-stitch/';
const CONSEILS = {
  'satin_column.zigzag_spacing_mm': ['Écart entre deux points de satin. 0,35 à 0,45 mm couvre bien ; plus serré, c\'est plus brillant mais le fil s\'entasse ; plus large pour un fil épais ou un effet léger.', DOC_SATIN + '#paramètres'],
  'satin_column.pull_compensation_mm': ['Le fil tire le tissu et la colonne se rétrécit : on l\'élargit d\'autant. 0,2 à 0,4 mm, davantage sur la maille et les tissus souples. Trop : les bords débordent.', DOC_SATIN + '#paramètres'],
  'satin_column.pull_compensation_percent': ['La même compensation, proportionnelle à la largeur : pratique pour un satin large ou de largeur variable (10 à 20 %). S\'ajoute à la compensation en mm.', DOC_SATIN + '#paramètres'],
  'satin_column.max_stitch_length_mm': ['Au-delà de 7 à 8 mm de large, les points de satin sont lâches et s\'accrochent. Activez la découpe (7 mm par exemple) : chaque point trop long est coupé en deux.', DOC_SATIN + '#paramètres'],
  'fill_stitch.row_spacing_mm': ['Écart entre les rangs. 0,25 à 0,4 mm selon le fil (fil 40 : environ 0,4). Trop serré, le tissu devient raide et l\'aiguille peut casser : regardez la carte de densité.', DOC_REMP + '#paramètres'],
  'fill_stitch.angle': ['Sens des rangs. Changez l\'angle entre deux zones voisines (45° et 135°) : elles se distinguent mieux et le tissu ne tire pas toujours dans le même sens.', DOC_REMP + '#paramètres'],
  'fill_stitch.max_stitch_length_mm': ['Longueur des points dans un rang : 3 à 4 mm. Plus court pour les petites zones ; plus long, c\'est plus brillant mais moins solide.', DOC_REMP + '#paramètres'],
  'stroke.running_stitch_length_mm': ['2 à 2,5 mm en général ; 1,5 mm dans les courbes serrées et les petits détails ; plus long pour un bâti.', DOC_TRAIT + '#paramétres'],
  'stroke.repeats': ['Nombre de passages sur le tracé. 2 ou 3 pour un trait plus visible (voir aussi le point Triple).', DOC_TRAIT + '#paramétres'],
  'fill_stitch.fill': ['Décochez pour ne pas broder l\'intérieur de cette forme : seul son contour (s\'il en a un) sera brodé.', DOC_REMP],
  contour_strategy: ['Façon de parcourir la forme : « Intérieur » suit les contours de proche en proche ; « Simple spirale » et « Double spirale » partent du bord vers le centre. Essayez-les dans l\'aperçu.', DOC_REMP + '#méthodes'],
  join_style: ['Forme des angles du remplissage contour : pointus (onglet) ou arrondis. Arrondi est plus doux sur les formes organiques.', DOC_REMP + '#méthodes'],
  avoid_self_crossing: ['Empêche le remplissage contour de passer sur lui-même : plus propre, un peu plus long à calculer.', DOC_REMP + '#méthodes'],
  clockwise: ['Sens de rotation du remplissage contour ou spirale. Sans effet sur la solidité, seulement sur l\'aspect des reflets.', DOC_REMP + '#méthodes'],
  meander_angle: ['Tourne le motif du méandre. Un angle différent entre deux zones voisines les distingue.', DOC_REMP + '#méthodes'],
  cross_stitch_method: ['Façon de broder chaque croix (simple, double, avec ou sans retour). Voyez l\'effet dans l\'aperçu en points.', DOC_REMP + '#méthodes'],
  contour_underlay_stitch_length_mm: ['Longueur des points de la sous-couche de contour : 2,5 à 3 mm. Plus court dans les courbes serrées.', DOC_SATIN + '#sous-couche-de-contour'],
  center_walk_underlay_stitch_length_mm: ['Longueur des points de la sous-couche centrale : 2,5 à 3 mm. Plus court pour une colonne très courbe.', DOC_SATIN + '#sous-couche-centrale'],
  trim_after: ['La machine coupe le fil après cet objet (si elle sait couper) : utile avant un long saut. Sinon, il faudra couper ce fil à la main.', DOC + 'commands/'],
  stop_after: ['La machine s\'arrête après cet objet : pour poser le tissu d\'un appliqué, couper un surplus ou vérifier.', DOC + 'commands/'],
};
const CONSEILS_BLOC = {
  'Sous-couche': ['Elle fixe le tissu avant le remplissage : indispensable sur la maille et les grandes zones, inutile sur les petits éléments.', DOC_REMP + '#underlay'],
  'Sous-couches (plusieurs possibles)': ['Centre : colonnes fines (moins de 2 mm). Contour : de 2 à 5 mm, bords nets. Contour + Zigzag : satins larges ou tissus épais.', DOC_SATIN + '#sous-couche-centrale'],
  'Points courts dans les courbes': ['Dans une courbe serrée, les points s\'entassent côté intérieur : Ink/Stitch y raccourcit un point sur deux. Les valeurs par défaut conviennent presque toujours.', DOC_SATIN + '#paramètres'],
  'Appliqué': ['Brodez sur un stabilisateur. Au 1er arrêt, posez le tissu sur la ligne de placement ; au 2e, découpez le surplus au ras de la fixation (ciseaux à appliqué) ; la bordure satin recouvre le bord. Bordure de 3 à 4 mm en général.', 'https://inkstitch.org/fr/tutorials/applique/'],
  'Ligne guide': ['Les rangs du remplissage suivent la courbe choisie, comme les nervures d’une feuille ou les mèches de cheveux. Une courbe douce, de la longueur de la forme, donne le plus beau résultat.', DOC_REMP + '#méthodes'],
  'Départ et fin de l’aiguille': ['Facultatif : sans repère, Ink/Stitch part au plus près de l\'aiguille. Placez la fin près de l\'objet suivant pour raccourcir le saut.', DOC_REMP + '#définir-les-points-de-départ-et-darrivée'],
};
function boutonConseil(c) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'info'; b.textContent = 'i'; b.title = 'Conseil';
  b.onclick = (e) => {
    e.preventDefault(); e.stopPropagation();
    const hote = b.closest('.reglage, .interrupteur, .bloc'), ouverte = hote && hote.querySelector(':scope > .bulle-info');
    $$('.bulle-info').forEach((x) => x.remove());
    if (ouverte) return;
    const bulle = document.createElement('div'); bulle.className = 'bulle-info';
    bulle.innerHTML = `${esc(c[0])} <a href="${c[1]}" target="_blank" rel="noopener">Documentation Ink/Stitch ↗</a>`;
    if (hote.classList.contains('bloc')) hote.querySelector('h2').after(bulle); else hote.appendChild(bulle);
  };
  return b;
}
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.bulle-info, button.info')) $$('.bulle-info').forEach((x) => x.remove()); });
// tous les réglages ont leur ⓘ : notre conseil s'il y en a un, sinon la description d'Ink/Stitch (en français)
function docPour(o, p) {
  if ((S.schema.element?.params || []).some((q) => q.name === p.name)) return DOC + 'params/';
  return { satin_column: DOC_SATIN + '#paramètres', fill_stitch: DOC_REMP + '#paramètres', stroke: DOC_TRAIT + '#paramétres' }[typePrincipal(o)] || DOC + 'params/';
}
// Ink/Stitch · Auto · Main : d'où vient la valeur d'un réglage calculé par le profil
function estAuto(o, noms) { return noms.every((n) => (o.auto || []).includes(n)); }
function modeReglage(o, noms) {
  const auto = estAuto(o, noms), main = !auto && noms.some((n) => o.valeurs[n] !== undefined);
  const d = document.createElement('span'); d.className = 'mode-reglage';
  const etats = [['inkstitch', 'Ink/Stitch', 'Valeur par défaut d\'Ink/Stitch'], ['auto', 'Auto', 'Calculée d\'après le profil du dessin (tissu, stabilisateur, fil) et la forme'], ['main', 'Main', 'Votre valeur : modifiez le réglage pour passer à la main']];
  const actif = auto ? 'auto' : main ? 'main' : 'inkstitch';
  for (const [k, lib, t] of etats) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = lib; b.title = t;
    b.className = k === actif ? 'on' : '';
    if (k === 'inkstitch') b.onclick = () => envoyer(o, Object.fromEntries(noms.map((n) => [n, null])));
    if (k === 'auto') b.onclick = async () => {
      try {
        const r = await api('auto', { ids: o.ids || [o.id], noms });
        S.etat = r.etat; S.simu = S.simuP = null; rendreTout(); apercuBientot();
        if (!S.profilVu && S.etat.profil) { S.profilVu = true; message(`Auto d'après le profil « ${S.etat.profils.tissu[S.etat.profil.tissu]} » : changez-le dans Export › Préparer la broderie.`); }
      } catch (e) { message(e.message, true); }
    };
    if (k === 'main') b.onclick = () => message('Modifiez la valeur (curseur ou case) : le réglage passe « à la main ».');
    d.appendChild(b);
  }
  return d;
}
const autoPour = (o, nom) => ((S.etat.profils || {}).auto || {})[typePrincipal(o)]?.includes(nom);
function avecConseil(d, o, p) {
  if (autoPour(o, p.name) && d.classList.contains('reglage')) {       // le sélecteur remplace la petite flèche ↺
    const h = $('.haut', d);
    if (h) { const raz = $('.raz', h); if (raz) raz.remove(); h.after(modeReglage(o, [p.name])); }
  }
  const nom = p.name;
  const c = CONSEILS[typePrincipal(o) + '.' + nom] || CONSEILS[nom] || (p.aide ? [p.aide.charAt(0).toUpperCase() + p.aide.slice(1), docPour(o, p)] : null);
  const lab = c && $('label', d);
  if (lab) lab.appendChild(boutonConseil(c));             // dans le libellé : reste collé au nom du réglage
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
  if (titre && CONSEILS_BLOC[titre]) $('h2', d).appendChild(boutonConseil(CONSEILS_BLOC[titre]));
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
  if (typ === 'fill_stitch' && actif === 'guided_fill' && !o.ids) out.push(blocGuide(o));
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
  if (ess.length) out.push(bloc('Paramètres ' + T.titre.toLowerCase(), ...ess.map((p) => reglage(o, p, (NOMS_TYPE[typ] || {})[p.name] || NOMS[p.name]))));
  // 3. sous-couche
  if (typ === 'fill_stitch') {
    if (parNom(typ, 'fill_underlay')) {
      const on = estVrai(valeur(o, parNom(typ, 'fill_underlay')) ?? true);
      out.push(bloc('Sous-couche', modeReglage(o, ['fill_underlay']), tuiles([['non', 'Sans', 'sans'], ['oui', 'Avec', 'avec']], on ? 'oui' : 'non', (k) => envoyer(o, { fill_underlay: k === 'oui' }))));
    }
  } else if (typ === 'satin_column') {
    const sc = [['center_walk_underlay', 'Centre', 'centre'], ['contour_underlay', 'Contour', 'contour'], ['zigzag_underlay', 'Zigzag', 'zigzag_sc']];
    const actifs = sc.filter(([n]) => estVrai(o.valeurs[n] ?? false)).map(([n]) => n);
    out.push(bloc('Sous-couches (plusieurs possibles)', modeReglage(o, sc.map(([n]) => n)), tuiles(sc, actifs, (n) => envoyer(o, { [n]: !actifs.includes(n) }), true)));
    // points courts : dans une courbe, un point sur deux est raccourci côté intérieur (moins de fil entassé)
    const pc = ['short_stitch_inset', 'short_stitch_distance_mm'].map((n) => parNom(typ, n)).filter((p) => p && visible(o, p, typ));
    if (pc.length) {
      out.push(bloc('Points courts dans les courbes', ...pc.map((p) => reglage(o, p, NOMS_TYPE.satin_column[p.name]))));
      pc.forEach((p) => ess.push(p));                   // déjà montrés : pas répétés dans « Plus de réglages »
    }
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

// Outils Ink/Stitch selon le type d'objet : les principaux en boutons, les autres dans « Plus d'outils ».
// (Lettrage, aperçu, simulateur, ordre, couleurs, copier/coller ont leur équivalent dans le panneau.)
const OUTILS = {
  stroke: [['stroke_to_satin', 'auto_run', 'redwork'], ['zigzag_line_to_satin', 'stroke_to_lpe_satin', 'outline', 'jump_to_stroke']],
  satin_column: [['auto_satin', 'cut_satin', 'flip', 'satin_to_stroke'], ['satin_multicolor']],
  fill_stitch: [['fill_to_stroke', 'knockdown_fill', 'break_apart'], ['fill_to_satin', 'gradient_blocks', 'tartan', 'cross_stitch_assistant']],
  tous: [[], ['troubleshoot', 'remove_embroidery_settings', 'transform_elements', 'remove_duplicated_points']],
};
function outils(o) {
  const types = [...o.types.filter((t) => OUTILS[t]), 'tous'];
  const principaux = [...new Set(types.flatMap((t) => OUTILS[t][0]))].filter(cmdPar);
  // une forme remplie + des traits (ses traverses) choisis ensemble : Remplissage en satin en premier
  if (o.multi && o.typesTous.includes('fill_stitch') && o.typesTous.includes('stroke') && cmdPar('fill_to_satin')) principaux.unshift('fill_to_satin');
  const autres = [...new Set(types.flatMap((t) => OUTILS[t][1]))].filter((e) => cmdPar(e) && !principaux.includes(e));
  const bouton = (e) => {
    const c = cmdPar(e);
    const b = document.createElement('button'); b.textContent = c.nom_fr + (c.fenetre ? '…' : ''); b.title = c.menu_fr + (c.fenetre ? ' · ouvre une fenêtre d’Ink/Stitch' : '');
    b.onclick = () => (c.params.length && !c.fenetre ? (S.cmd = c, rendreCommandes(), formCommande(c, o.ids || [o.id]), $('#dlgCmd').showModal())
      : commande(e, {}, o.ids || [o.id]));
    return b;
  };
  const d = document.createElement('div'); d.className = 'outils';
  principaux.forEach((e) => d.appendChild(bouton(e)));
  const blocO = bloc('Outils', d);
  if (autres.length) {
    const det = document.createElement('details'); det.className = 'theme';
    det.innerHTML = '<summary>Plus d’outils</summary>';
    const d2 = document.createElement('div'); d2.className = 'outils';
    autres.forEach((e) => d2.appendChild(bouton(e)));
    // les vrais points de l'aiguille deviennent des tracés modifiables (dentelle FSL, retouches)
    const f = document.createElement('button'); f.textContent = 'Figer en points (retouche point par point)';
    f.title = 'Le trajet réel de l’aiguille devient des tracés en point manuel : chaque nœud est un point, à déplacer dans Inkscape. '
      + 'L’original est masqué (œil fermé) pour revenir en arrière.';
    f.onclick = async () => {
      try {
        const r = await api('figer', { ids: o.ids || [o.id] }, 'Ink/Stitch calcule les points…');
        S.etat = r.etat; S.sel = r.ids[r.ids.length - 1]; S.choix = new Set(); rendreTout(); apercuBientot();
        message('Objet figé en points : synchronisez, puis retouchez les nœuds dans Inkscape (outil Nœuds, F2). L’original est masqué : rouvrez son œil pour revenir en arrière.');
      } catch (e) { message(e.message, true); }
    };
    d2.appendChild(f);
    det.appendChild(d2); blocO.appendChild(det);
  }
  return blocO;
}

// Réglages des lettres d'un texte : par type de forme (satin, remplissage, point droit), pour toutes les lettres
// ou une seule. Gardés sur le texte et réappliqués quand on le modifie (Ink/Stitch, lui, les perd).
const ESS_LETTRES = {
  satin_column: ['zigzag_spacing_mm', 'pull_compensation_mm', 'center_walk_underlay', 'contour_underlay', 'zigzag_underlay'],
  fill_stitch: ['row_spacing_mm', 'angle', 'pull_compensation_mm', 'fill_underlay'],
  stroke: ['running_stitch_length_mm', 'repeats'],
};
const TITRES_LETTRES = { satin_column: 'Satin des lettres', fill_stitch: 'Remplissage des lettres', stroke: 'Point droit des lettres' };
const NOMS_LETTRES = { center_walk_underlay: 'Sous-couche centrale', contour_underlay: 'Sous-couche contour', zigzag_underlay: 'Sous-couche zigzag',
  fill_underlay: 'Sous-couche', repeats: 'Passages' };
let lettreChoisie = { texte: null, lettre: null };
function reglagesLettres(o) {
  const d = document.createElement('div'); d.className = 'bloc';
  d.innerHTML = '<h2>Réglages des lettres</h2><span class="muted small">Lecture des lettres…</span>';
  (async () => {
    let r;
    try { r = (await api('lettres_resume', { id: o.id })).lettres; } catch (e) { d.lastChild.textContent = e.message; return; }
    if (!r || !d.isConnected) return;
    if (lettreChoisie.texte !== o.id) lettreChoisie = { texte: o.id, lettre: null };
    const k = lettreChoisie.lettre;
    d.innerHTML = '<h2>Réglages des lettres</h2>';
    // pour quelles lettres
    const choix = document.createElement('div'); choix.className = 'reglage';
    choix.innerHTML = `<div class="haut"><label>Appliquer à</label></div><select>${['<option value="">Toutes les lettres</option>']
      .concat(r.lettres.map((l, i) => `<option value="${i}" ${String(k) === String(i) ? 'selected' : ''}>Lettre ${i + 1} : « ${esc(l.car)} »</option>`)).join('')}</select>`;
    $('select', choix).onchange = (e) => { lettreChoisie.lettre = e.target.value === '' ? null : +e.target.value; rendreProps(); };
    d.appendChild(choix);
    // un groupe de curseurs par type de forme présent dans le texte (ou dans la lettre choisie)
    const typesIci = k === null ? Object.keys(r.types) : r.lettres[k].types;
    for (const typ of ['satin_column', 'fill_stitch', 'stroke'].filter((t) => typesIci.includes(t))) {
      const gardes = Object.assign({}, r.reglages.tous[typ] || {}, k === null ? {} : (r.reglages.lettres[k] || {})[typ] || {});
      const po = { id: o.id, lettres: { type: typ, lettre: k }, valeurs: Object.assign({}, r.types[typ].valeurs, gardes), types: [typ] };
      const params = ESS_LETTRES[typ].map((n) => parNom(typ, n)).filter((p) => p && visible(po, p, typ));
      const titre = `${TITRES_LETTRES[typ]}${k === null ? ` (${r.types[typ].nombre} formes)` : ''}`;
      d.appendChild(bloc(titre, ...params.map((p) => reglage(po, p, NOMS_LETTRES[p.name] || NOMS[p.name]))));
    }
    // adapter au tissu (toutes les lettres)
    const t = document.createElement('div'); t.className = 'ligne-tissu';
    t.innerHTML = `<select>${Object.entries(TISSUS).map(([cle, x]) => `<option value="${cle}">${esc(x.nom)}</option>`).join('')}</select><button class="petit">Adapter au tissu</button>`;
    $('button', t).onclick = async () => {
      const x = TISSUS[$('select', t).value];
      try {
        for (const typ of Object.keys(r.types)) if (x[typ]) await api('lettres', { id: o.id, type: typ, valeurs: x[typ] });
        S.etat = await api('etat'); rendreTout(); apercuBientot(); message(`Lettres réglées pour ${x.nom.toLowerCase()} (${x.conseil}).`);
      } catch (e) { message(e.message, true); }
    };
    d.appendChild(bloc('Adapter au tissu', t));
    // alertes de lisibilité
    if (!S.polices) { try { S.polices = (await api('polices')).polices; } catch (e) { /* sans la plage de la police */ } }
    if (!d.isConnected) return;
    const al = alertesLettres(o, r);
    if (al.length) { const a = document.createElement('div'); a.innerHTML = al.map((x) => `<div class="alerte">⚠ ${esc(x)}</div>`).join(''); d.appendChild(a); }
    // revenir aux réglages de la police
    const gardesTous = Object.keys(r.reglages.tous).length + Object.keys(r.reglages.lettres).length;
    const n = document.createElement('p'); n.className = 'muted small';
    n.textContent = 'Ces réglages sont gardés sur le texte : ils reviennent même si vous changez le texte, la police ou la taille.';
    d.appendChild(n);
    if (gardesTous) {
      const b = document.createElement('button'); b.className = 'petit'; b.textContent = 'Revenir aux réglages de la police';
      b.onclick = () => revenirPolice(o);
      d.appendChild(b);
    }
  })();
  return d;
}
function alertesLettres(o, r) {
  const out = [], h = r.hauteur_mm ? r.hauteur_mm / (r.lignes || 1) : null;
  if (h && h < 5) out.push(`Lettres d'environ ${h.toFixed(1)} mm : trop petites pour la plupart des polices (au moins 5 mm), ou choisissez une police « small ».`);
  const satin = r.types.satin_column;
  if (satin && h && h < 8) {
    const dens = parseFloat(Object.assign({}, satin.valeurs, r.reglages.tous.satin_column || {}).zigzag_spacing_mm);
    if (dens && dens < 0.35) out.push(`Satin dense (${dens} mm) sur des petites lettres : risque de bourrage ; essayez 0,4 mm.`);
  }
  try {
    const j = JSON.parse(o.valeurs.lettering || '{}'), pol = (S.polices || []).find((p) => p.id === j.font);
    if (pol && j.scale && (j.scale < pol.min * 100 - 0.5 || j.scale > pol.max * 100 + 0.5)) out.push(`Taille hors de la plage de la police (${Math.round(pol.min * 100)} à ${Math.round(pol.max * 100)} %).`);
  } catch (e) { /* texte illisible */ }
  return out;
}
// réglages d'un texte existant (gardés par Ink/Stitch sur le texte) → formulaire du texte
function chargerTexteDe(o) {
  try {
    const j = JSON.parse(o.valeurs.lettering || '{}');
    TX.texte = j.text ?? TX.texte; TX.echelle = j.scale ?? 100;
    TX.police = ((S.polices || []).find((p) => p.id === j.font) || {}).nom || TX.police;
    TX.align = ['left', 'center', 'right'][j.text_align || 0] || 'left';
    TX.lettres = j.letter_spacing || 0; TX.mots = j.word_spacing || 0; TX.lignes = j.line_height || 0;
    TX.coupes = ['off', 'line', 'word', 'glyph'][j.trim_option || 0] || 'off';
    TX.tri = ['off', 'all', 'line', 'word'][j.color_sort || 0] || 'off'; TX.symboles = !!j.use_trim_symbols;
    TX.courbure = parseFloat(o.arc || 0) || 0;
    TX.trace = o.trace || null; TX.position = o.position || 'center';
  } catch (e) { /* lettrage illisible : valeurs actuelles */ }
  TX.pour = o.id;
}
async function revenirPolice(o) {
  if (!S.polices) S.polices = (await api('polices')).polices;
  const avant = JSON.stringify(TX);
  try {
    chargerTexteDe(o);
    const r = await api('lettrage', { remplacer: o.id, ...requeteTexte(), sans_reglages: true }, 'Ink/Stitch refait le texte avec les réglages de la police…');
    S.etat = await api('etat'); S.sel = r.id; rendreTout(); apercuBientot(); message('Réglages de la police remis.');
  } catch (e) { message(e.message, true); } finally { Object.assign(TX, JSON.parse(avant)); }
}
// Adapter au tissu : valeurs de départ (notice, astuces de réglages), à affiner par un essai
const TISSUS = {
  coton: { nom: 'Coton, lin, toile', conseil: 'stabilisateur à déchirer',
    satin_column: { zigzag_spacing_mm: 0.4, pull_compensation_mm: 0.2, center_walk_underlay: true, contour_underlay: true, zigzag_underlay: false },
    fill_stitch: { row_spacing_mm: 0.3, pull_compensation_mm: 0.2, fill_underlay: true } },
  fin: { nom: 'Tissu fin, soie, voile', conseil: 'stabilisateur soluble ou fin',
    satin_column: { zigzag_spacing_mm: 0.45, pull_compensation_mm: 0.1, center_walk_underlay: true, contour_underlay: false, zigzag_underlay: false },
    fill_stitch: { row_spacing_mm: 0.35, pull_compensation_mm: 0.1, fill_underlay: false } },
  jersey: { nom: 'Jersey, tee-shirt', conseil: 'stabilisateur à découper',
    satin_column: { zigzag_spacing_mm: 0.4, pull_compensation_mm: 0.35, center_walk_underlay: true, contour_underlay: true, zigzag_underlay: true },
    fill_stitch: { row_spacing_mm: 0.3, pull_compensation_mm: 0.35, fill_underlay: true } },
  eponge: { nom: 'Sweat, polaire, éponge', conseil: 'à découper, avec un film soluble dessus',
    satin_column: { zigzag_spacing_mm: 0.35, pull_compensation_mm: 0.3, center_walk_underlay: true, contour_underlay: true, zigzag_underlay: true },
    fill_stitch: { row_spacing_mm: 0.25, pull_compensation_mm: 0.3, fill_underlay: true } },
  jean: { nom: 'Jean, toile épaisse', conseil: 'stabilisateur à déchirer, épais',
    satin_column: { zigzag_spacing_mm: 0.38, pull_compensation_mm: 0.2, center_walk_underlay: true, contour_underlay: true, zigzag_underlay: false },
    fill_stitch: { row_spacing_mm: 0.28, pull_compensation_mm: 0.2, fill_underlay: true } },
  cuir: { nom: 'Cuir, simili', conseil: 'stabilisateur à déchirer, peu de points',
    satin_column: { zigzag_spacing_mm: 0.45, pull_compensation_mm: 0.1, center_walk_underlay: true, contour_underlay: false, zigzag_underlay: false },
    fill_stitch: { row_spacing_mm: 0.4, pull_compensation_mm: 0.1, fill_underlay: false } },
};
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
  d.appendChild(menuFavoris(o));
  const sem = menuSemblables(o); if (sem) d.appendChild(sem);
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
// Appliqué (forme remplie) : Ink/Stitch n'a pas d'outil, seulement une méthode à suivre à la main ; ici, un clic
// crée les trois étapes à partir de la forme : placement, fixation, bordure satin, séparées par des arrêts machine
function blocApplique(o) {
  const d = document.createElement('div');
  d.innerHTML = `<p class="muted small">Un tissu cousu sur le support : 1 ligne de placement (arrêt : posez le tissu) · 2 fixation (arrêt : découpez le surplus) · 3 bordure satin. La forme d'origine est gardée, masquée.</p>
    <div class="ligne-tissu"><span class="small">Bordure satin de</span><input type="number" value="3" min="1" max="8" step="0.5" style="width:56px"><span class="small">mm</span><button type="button" class="petit">Créer l'appliqué</button></div>`;
  $('button', d).onclick = async () => {
    try {
      const r = await api('applique', { id: o.id, largeur: parseFloat($('input', d).value) || 3 });
      S.etat = r.etat; S.sel = `applique_${o.id}_bordure`; S.choix = new Set(); rendreTout(); apercuBientot();
      message('Appliqué créé : 1 placement (arrêt, posez le tissu) · 2 fixation (arrêt, découpez le tissu) · 3 bordure satin. La forme d\'origine est masquée.');
    } catch (e) { message(e.message, true); }
  };
  return bloc('Appliqué', d);
}
// Remplissage guidé : les rangs suivent une ligne guide (un tracé marqué par Ink/Stitch, dans le même groupe ou
// calque que la forme). On choisit le tracé ici ; le panneau le marque et le réunit à la forme si besoin.
function blocGuide(o) {
  const d = document.createElement('div');
  const g = o.guide && S.etat.objets.find((x) => x.id === o.guide);
  const candidats = S.etat.objets.filter((x) => x.id !== o.id && (x.types.includes('stroke') || x.types.includes('guide')) && !x.types.includes('fill_stitch'));
  d.innerHTML = `<div class="ligne-position"><span class="lib">Ligne guide</span><span class="etat ${g ? '' : 'muted'} small">${g ? '« ' + esc(g.nom) + ' »' : 'aucune : les rangs restent droits'}</span></div>`;
  const sel = document.createElement('select'); sel.className = 'favoris';
  sel.innerHTML = `<option value="">${g ? 'Changer de ligne guide…' : 'Choisir la ligne guide…'}</option>`
    + candidats.map((x) => `<option value="${esc(x.id)}">${esc(x.nom)}${x.calque_nom ? ' · ' + esc(x.calque_nom) : ''}</option>`).join('');
  sel.onchange = async () => {
    const v = sel.value; sel.value = ''; if (!v) return;
    try {
      S.etat = await api('guide', { id: o.id, guide: v }, 'Ink/Stitch prépare la ligne guide…');
      S.simu = S.simuP = null; rendreTout(); apercuBientot();
      message('Ligne guide en place : les rangs du remplissage suivent la courbe (elle-même n’est pas brodée).');
    } catch (e) { message(e.message, true); }
  };
  d.appendChild(sel);
  const a = document.createElement('p'); a.className = 'muted small';
  a.textContent = candidats.length ? 'Dessinez la courbe dans Inkscape (outil Plume), puis choisissez-la ici : elle n’est pas brodée, elle oriente les rangs.'
    : 'Dessinez d’abord la courbe dans Inkscape (outil Plume), puis ⌘⌥B : elle apparaîtra ici.';
  d.appendChild(a);
  return bloc('Ligne guide', d);
}
// Départ et fin d'un remplissage : sinon Ink/Stitch choisit. « Placer », puis un clic dans l'aperçu :
// le repère d'Ink/Stitch est posé là, et l'aiguille part (ou finit) au bord de la forme le plus proche.
const POSITIONS = [['starting_point', 'Départ', 'depart'], ['ending_point', 'Fin', 'fin']];
function blocPositions(o) {
  const pl = (S.etat.placees || {})[o.id] || {};
  const d = document.createElement('div'); d.className = 'positions';
  for (const [quoi, lib, cl] of POSITIONS) {
    const enCours = S.placer && S.placer.id === o.id && S.placer.quoi === quoi;
    const l = document.createElement('div'); l.className = 'ligne-position' + (enCours ? ' en-cours' : '');
    l.innerHTML = `<span class="repere ${cl}"></span><span class="lib">${lib}</span>
      <span class="etat muted small">${enCours ? 'cliquez dans l’aperçu…' : pl[quoi] ? 'placé' : 'automatique'}</span>`;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'petit' + (enCours ? ' on' : '');
    b.textContent = enCours ? 'Annuler' : pl[quoi] ? 'Déplacer' : 'Placer';
    b.onclick = () => { S.placer = enCours ? null : { id: o.id, quoi, lib }; modePlacement(); rendreProps(); };
    l.appendChild(b);
    if (pl[quoi] && !enCours) {
      const x = document.createElement('button'); x.type = 'button'; x.className = 'petit'; x.textContent = 'Automatique';
      x.title = 'Retirer le repère : Ink/Stitch choisit de nouveau'; x.onclick = () => poserPosition(o.id, quoi, { retirer: true });
      l.appendChild(x);
    }
    d.appendChild(l);
  }
  const a = document.createElement('p'); a.className = 'muted small';
  a.textContent = 'Facultatif : en automatique, Ink/Stitch choisit lui-même (il part au plus près de l’aiguille). « Placer » pour imposer un endroit, par exemple finir près de l’objet suivant ; « Automatique » pour revenir.';
  return bloc('Départ et fin de l’aiguille', d, a);
}
function modePlacement() {
  $('#apercu').classList.toggle('placement', !!S.placer);
  if (S.placer) message(`${S.placer.lib} : cliquez dans l’aperçu à l’endroit voulu (Échap : annuler).`);
}
async function poserPosition(id, quoi, extra) {
  try {
    S.etat = await api('position', { id, quoi, ...extra }, extra.retirer ? false : 'Ink/Stitch pose le repère…');
    S.simu = S.simuP = null; rendreTout(); apercuBientot();
    message(extra.retirer ? 'Repère retiré : Ink/Stitch choisit.' : 'Repère posé : l’aperçu montre le nouveau trajet. Il se déplace aussi dans Inkscape (symbole relié à la forme).');
  } catch (e) { message(e.message, true); }
}
// « Choisir les semblables » : tous les objets brodés du même point (au choix : avec les mêmes réglages),
// pour les régler ensemble ou les glisser ensemble dans la liste
function pointDe(o) {
  const t = typePrincipal(o), T = TYPES[t];
  if (!T) return t;
  if (t === 'stroke') {
    const m = valeur(o, parNom('stroke', 'stroke_method')) ?? 'running_stitch';
    return t + ':' + (m === 'running_stitch' && String(o.valeurs.bean_stitch_repeats || '0').trim() === '1' ? 'triple' : m);
  }
  return t + ':' + (valeur(o, parNom(t, T.param)) ?? T.choix[0][0]);
}
const sigReglages = (o) => JSON.stringify(Object.entries(o.valeurs).filter(([k]) => !NON_COPIES.has(k)).sort());
function menuSemblables(o) {
  const memePoint = S.etat.objets.filter((x) => pointDe(x) === pointDe(o));
  if (memePoint.length < 2) return null;
  const memes = memePoint.filter((x) => sigReglages(x) === sigReglages(o));
  const [t, k] = pointDe(o).split(':'), T = TYPES[t];
  const nom = (T && ([...T.choix, ['triple', 'Triple']].find((c) => c[0] === k) || [])[1]) || NOM_TYPE[t] || t;
  const sel = document.createElement('select'); sel.className = 'favoris';
  sel.innerHTML = `<option value="">◎ Choisir les semblables…</option><option value="point">Même point (${esc(nom)}) : ${memePoint.length} objets</option>`
    + (memes.length > 1 && memes.length < memePoint.length ? `<option value="reglages">Même point et mêmes réglages : ${memes.length} objets</option>` : '');
  sel.onchange = () => {
    const liste = sel.value === 'reglages' ? memes : memePoint; sel.value = '';
    choisir([...liste.filter((x) => x.id !== o.id).map((x) => x.id), o.id]);
    message(`${liste.length} objets choisis : les réglages s'appliquent à tous ; glissez-les ensemble dans la liste pour les broder à la suite.`);
  };
  return sel;
}
// Réglages favoris : « mon satin bordure », « tatami jersey »… enregistrés une fois, réappliqués d'un clic,
// dans n'importe quel dessin (même type de forme)
function menuFavoris(o) {
  const typ = typePrincipal(o), sel = document.createElement('select'); sel.className = 'favoris';
  const remplir = () => {
    const miens = (S.favoris || []).map((f, i) => [f, i]).filter(([f]) => f.type === typ);
    sel.innerHTML = `<option value="">★ Mes réglages favoris…</option>` + miens.map(([f, i]) => `<option value="a${i}">Appliquer « ${esc(f.nom)} »</option>`).join('')
      + `<option value="enr">＋ Enregistrer ces réglages…</option>` + (miens.length ? `<optgroup label="Supprimer">${miens.map(([f, i]) => `<option value="s${i}">Supprimer « ${esc(f.nom)} »</option>`).join('')}</optgroup>` : '');
  };
  if (!S.favoris) api('favoris').then((r) => { S.favoris = r.favoris; remplir(); }).catch(() => { S.favoris = []; });
  remplir();
  sel.onchange = async () => {
    const v = sel.value; sel.value = '';
    try {
      if (v === 'enr') {
        const nom = prompt(`Nom de ce favori (${(NOM_TYPE[typ] || typ).toLowerCase()}) :`, o.nom); if (!nom) return;
        const valeurs = Object.fromEntries(Object.entries(o.valeurs).filter(([k]) => !NON_COPIES.has(k)));
        S.favoris = (await api('favoris_ecrire', { favoris: [...S.favoris, { nom, type: typ, valeurs }] })).favoris;
        message(`Favori « ${nom} » enregistré : il est proposé pour toutes les formes « ${(NOM_TYPE[typ] || typ).toLowerCase()} ».`);
      } else if (v[0] === 's') {
        const f = S.favoris[+v.slice(1)];
        S.favoris = (await api('favoris_ecrire', { favoris: S.favoris.filter((x) => x !== f) })).favoris; message(`Favori « ${f.nom} » supprimé.`);
      } else if (v[0] === 'a') {
        const f = S.favoris[+v.slice(1)], cibles = o.ids ? S.etat.objets.filter((x) => o.ids.includes(x.id)) : [o];
        for (const c of cibles) {
          const val = { ...f.valeurs };
          for (const k of Object.keys(c.valeurs)) if (!(k in val) && !NON_COPIES.has(k)) val[k] = null;   // le favori en entier, pas un mélange
          S.etat = await api('params', { id: c.id, valeurs: val });
        }
        rendreTout(); apercuBientot(); message(`Favori « ${f.nom} » appliqué.`); return;
      }
      remplir();
    } catch (e) { message(e.message, true); }
  };
  return sel;
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
    remplissage: objs[0].remplissage, multi: true, typesTous: [...new Set(objs.flatMap((o) => o.types))],
    auto: (objs[0].auto || []).filter((n) => objs.every((x) => (x.auto || []).includes(n))) };
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
  if (objs.some((x) => x.transparent)) div.appendChild(alerteTransparent(objs.filter((x) => x.transparent)));
  const coul = document.createElement('div'); coul.className = 'ligne';
  coul.innerHTML = `<label>Couleur (tous)</label><span class="couleur"><input type="color" value="${(o.couleur || '#000000').slice(0, 7)}"></span>`;
  suivreCouleur($('input', coul), async (v) => { for (const x of objs) await changerCouleur(x, v); });
  div.appendChild(coul);
  div.appendChild(nuancierDessin(objs, async (v) => { for (const x of objs) await changerCouleur(x, v); }));
  const el = S.schema.element;
  if (el) {
    const fin = ['trim_after', 'stop_after'].map((n) => el.params.find((p) => p.name === n)).filter(Boolean);
    div.appendChild(bloc('Après chaque objet', ...fin.map((p) => reglage(o, p, p.name === 'trim_after' ? 'Couper le fil' : 'Arrêter la machine'))));
  }
  const ou = outils(o); if (ou) div.appendChild(ou);           // auto-satin… sur tous les objets choisis
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
  if (o.transparent) div.appendChild(alerteTransparent([o]));
  const coul = document.createElement('div'); coul.className = 'ligne';
  coul.innerHTML = `<label>Couleur</label><span class="couleur"><input type="color" value="${hexa(o.couleur)}"><span class="muted small">${esc(o.couleur)}</span></span>`;
  suivreCouleur($('input', coul), (v) => changerCouleur(o, v), (v) => { $('.muted', coul).textContent = v; ent.querySelector('.vignette').style.color = v; });
  if (t === 'guide') {                                // ligne guide : rien à régler, elle n'est pas brodée
    const a = document.createElement('p'); a.className = 'muted';
    const f = S.etat.objets.find((x) => x.guide === o.id);
    a.innerHTML = `Ligne guide${f ? ` du remplissage « ${esc(f.nom)} »` : ''} : elle n'est pas brodée, elle oriente les rangs. `
      + 'Modifiez sa forme dans Inkscape. Pour en refaire un trait brodé : dans Inkscape, Fond et contour › Style du contour › Marqueurs, mettez le marqueur de début à « aucun ».';
    div.appendChild(bloc(null, a));
    return;
  }
  if (t === 'lettrage') {
    const b = document.createElement('button'); b.className = 'principal'; b.textContent = 'Modifier le texte';
    b.onclick = () => { S.texte = true; rendreTout(); };
    div.appendChild(bloc('Texte brodé', b));
    div.appendChild(texteCourbe(o));
    div.appendChild(reglagesLettres(o));
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
  div.appendChild(nuancierDessin([o], (v) => changerCouleur(o, v)));
  if (o.types.includes('fill_stitch')) div.appendChild(blocPositions(o));
  const el = S.schema.element;
  if (el) {
    const fin = ['trim_after', 'stop_after'].map((n) => el.params.find((p) => p.name === n)).filter(Boolean);
    div.appendChild(bloc('Après cet objet', ...fin.map((p) => reglage(o, p, p.name === 'trim_after' ? 'Couper le fil' : 'Arrêter la machine'))));
  }
  if (o.balise === 'path' && (o.types.includes('satin_column') || o.types.includes('stroke'))) div.appendChild(railsEtTraverses(o));
  if (o.types.includes('fill_stitch')) div.appendChild(blocApplique(o));
  const ou = outils(o); if (ou) div.appendChild(ou);
  div.appendChild(plusDeReglages(o, [...typs, ...(o.types.includes('clone') ? ['clone'] : []), 'element'], montres));
}

function rendreTout() {
  const existants = new Set(S.etat.objets.map((o) => o.id));
  S.choix = new Set([...S.choix].filter((i) => existants.has(i)));
  if (S.isole) { S.isole = new Set([...S.isole].filter((i) => existants.has(i))); if (!S.isole.size) S.isole = null; }
  if (S.sel && !existants.has(S.sel)) S.sel = null;
  if (!S.sel && !S.aucun && S.etat.objets.length) S.sel = (S.etat.objets.find((o) => S.etat.selection.includes(o.id)) || S.etat.objets[0]).id;
  rendreListe(); if (!S.choixCouleur) rendreProps(); rendreAttente(); rendreAncien(); afficherSelection();   // sélecteur de couleur ouvert : fiche intacte
  $('#props').hidden = S.texte; $('#texte').hidden = !S.texte;
  if (S.texte) rendreTexte();
  if (S.vue === 'export') rendreExport();
  if (S.vue === 'points') rendreCadres();
}
function rendreAncien() {
  const b = $('#bandeauAncien');
  b.hidden = !S.etat.ancien;
  if (!S.etat.ancien) return;
  b.innerHTML = `<b>Dessin d'une ancienne version d'Ink/Stitch.</b> Ink/Stitch doit le mettre à jour avant de calculer les points.<br>
    <button id="baMaj">Mettre à jour avec Ink/Stitch</button><button id="baRecent">Ce dessin est récent : le marquer à jour</button>`;
  $('#baMaj').onclick = () => message('Dans Inkscape : Extensions › Ink/Stitch › Résolution de problèmes › Mettre à jour le svg d’Inkstitch. Ink/Stitch propose « Update » : cliquez-le, puis appuyez sur ⌘⌥B.');
  $('#baRecent').onclick = async () => { S.etat = await api('marquer_a_jour'); rendreTout(); apercuBientot(); };
}
// retour dans le panneau après être passé par Inkscape (la fenêtre reprend le focus) : rappel discret de synchroniser
let quitte = 0;
window.addEventListener('blur', () => { quitte = Date.now(); });
window.addEventListener('focus', () => {
  if (quitte && Date.now() - quitte > 3000 && !S.retourInkscape) { S.retourInkscape = true; if (S.etat) rendreAttente(); }
});
function rendreAttente() {
  const n = S.etat.attente || 0, i = $('#attenteInfo');
  if (S.etat.synchro !== S.synchroVue) { S.synchroVue = S.etat.synchro; S.retourInkscape = false; }   // le dessin vient d'arriver
  // Le panneau ne voit pas ce qu'on fait dans Inkscape : sans modification en attente, le bouton reste une invitation
  // (pas un « ✓ » vert trompeur) ; au retour d'Inkscape, il le rappelle.
  i.className = n ? 'on' : (S.retourInkscape ? 'rappel' : '');
  i.textContent = n ? `${n} modification${n > 1 ? 's' : ''} à envoyer à Inkscape`
    : S.retourInkscape ? 'De retour d’Inkscape ? Synchronisez pour reprendre vos changements.'
    : 'Modifié dans Inkscape ? Synchronisez (ou ⌘⌥B) pour mettre le panneau à jour.';
  $('#bAbandonner').hidden = !n;
  const b = $('#bEnvoyer');
  if (!b.disabled) {
    b.className = 'synchro ' + (n ? 'attente' : S.retourInkscape ? 'rappel' : 'calme');
    b.textContent = n ? `⇄ Synchroniser (${n})` : '⇄ Synchroniser';
  }
  const r = Object.entries(S.etat.reserve || {});
  if (r.length) i.title = 'Modifications gardées pour d\'autres dessins : ' + r.map(([k, v]) => `« ${k} » (${v})`).join(', ');
  if (S.etat.sans_dessin) i.textContent = 'Aucun dessin reçu : appuyez sur ⌘⌥B dans Inkscape.';
}

// ---------------------------------------------------------------- vues
// zoom de l'aperçu gardé séparément pour les Objets et la Simulation : passer de l'un à l'autre ne dézoome plus
const ZOOMS = {};
const cleZoom = () => (S.vue === 'points' ? 'simulation' : 'objets');
function changerVue(v) {
  ZOOMS[cleZoom()] = [vb, vb0];
  S.vue = v; message('');
  [vb, vb0] = ZOOMS[cleZoom()] || [null, null];
  $$('#vues button').forEach((b) => b.classList.toggle('on', b.dataset.vue === v));
  for (const k of ['objets', 'points', 'export']) $('#v-' + k).hidden = k !== v;
  if (v !== 'points') { arreterSimulation(); restaurerMode(); }
  // un seul aperçu, déplacé dans l'onglet affiché : en haut des Objets pour voir l'effet des réglages
  if (v === 'objets') { $('#emplApercuObjets').insertBefore($('#apercu'), $('#poignee')); if (S.texte) apercuTexteBientot(); else apercu(); }
  if (v === 'points') { rendreCadres(); rendreBati(); rendreStats('#stats').then(verifierCadre); modeSimulation(S.simMode); }
  if (v === 'export') { rendreExport(); rendreProfil(); }
}
// Simulation : « Animation » (le simulateur) ou « Réaliste » (le rendu d'Ink/Stitch), sur la même page blanche,
// avec le cadre schématisé ; le mode de l'aperçu des Objets est retrouvé en sortant
S.simMode = 'animation';
const MODES_SIMU = ['animation', 'realiste'];       // l'ancien mode Points est la « vue en points » de l'Animation
try { const m = localStorage.getItem('broderie.simMode'); if (MODES_SIMU.includes(m)) S.simMode = m; } catch (e) { /* défaut */ }
let modeObjets = null;
function restaurerMode() { if (modeObjets !== null) { MODE = modeObjets; modeObjets = null; } }
function modeSimulation(m) {
  S.simMode = m; try { localStorage.setItem('broderie.simMode', m); } catch (e) { /* rien */ }
  $$('#simMode button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
  const rendu = m !== 'animation';                       // Réaliste : le rendu d'Ink/Stitch, comme l'aperçu
  $('#simu').hidden = rendu; $('#emplApercu').hidden = !rendu;
  if (rendu) {
    arreterSimulation();
    if (modeObjets === null) modeObjets = MODE;
    MODE = m;
    $('#emplApercu').appendChild($('#apercu')); apercu();
  } else { restaurerMode(); chargerSimulation(); dessinerSimulation(); }
}
$$('#simMode button').forEach((b) => { b.onclick = () => modeSimulation(b.dataset.mode); });
$$('#vues button').forEach((b) => { b.onclick = () => changerVue(b.dataset.vue); });
// punaise : la carte « Calques et objets » reste en haut, seuls les réglages en dessous défilent
function epingler(oui) {
  $('#carteListe').classList.toggle('epingle', oui); $('#bEpingle').classList.toggle('on', oui);
  $('#v-objets .defile').classList.toggle('epinglee', oui);        // deux zones : la liste fixe, les réglages qui défilent
  $('#bEpingle').title = oui ? 'Désépingler : la liste défile avec les réglages' : 'Épingler : la liste reste en haut, seuls les réglages défilent';
  try { localStorage.setItem('broderie.epingle', oui ? '1' : '0'); } catch (e) { /* rien */ }
}
try { epingler(localStorage.getItem('broderie.epingle') !== '0'); } catch (e) { epingler(true); }
$('#bEpingle').onclick = () => epingler(!$('#carteListe').classList.contains('epingle'));
// poignée sous la liste : sa hauteur se règle à la souris (retenue d'une fois sur l'autre)
try { const h = localStorage.getItem('broderie.hauteurListe'); if (h) document.documentElement.style.setProperty('--hauteur-liste', h + 'px'); } catch (e) { /* rien */ }
$('#poigneeListe').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const l = $('#liste'), h0 = l.getBoundingClientRect().height, y0 = e.clientY;
  const hMax = Math.max(80, $('#v-objets .defile').clientHeight * 0.8 - 90);
  let h = h0;
  const mv = (ev) => { h = Math.max(60, Math.min(hMax, h0 + ev.clientY - y0)); document.documentElement.style.setProperty('--hauteur-liste', h + 'px'); };
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
    try { localStorage.setItem('broderie.hauteurListe', Math.round(h)); } catch (x) { /* rien */ } };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
});
$('#poigneeListe').addEventListener('dblclick', () => {
  document.documentElement.style.removeProperty('--hauteur-liste');
  try { localStorage.removeItem('broderie.hauteurListe'); } catch (e) { /* rien */ }
});
$('#bTexte').onclick = () => { S.texte = true; S.texteVu = null; TX.dims = null; const o = S.etat.objets.find((x) => x.id === S.sel); if (o && typePrincipal(o) !== 'lettrage') S.sel = null; TX.pour = null; rendreTout(); };

// ---------------------------------------------------------------- aperçu des points (zoom net par viewBox)
let vb0 = null, vb = null, vbTout = null, apercuDemande = 0, apercuEnCours = false;
// mode de rendu et couleur du tissu (retenus d'une fois sur l'autre)
let MODE = 'points', TISSU = '#ffffff';
const AFF = { sauts: true, penetrations: true, coupes: true, commandes: false, densite: false };
try { Object.assign(AFF, JSON.parse(localStorage.getItem('broderie.affichage') || '{}')); } catch (e) { /* défaut */ }
function interrupteursAffichage(liste, apres) {
  const d = document.createElement('span'); d.className = 'affichage';
  for (const [k, ic, t] of liste) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ico-rendu' + (AFF[k] ? ' on' : '');
    b.title = t; b.setAttribute('aria-pressed', !!AFF[k]); b.innerHTML = icone(ic);
    b.onclick = (e) => { e.stopPropagation(); AFF[k] = !AFF[k]; try { localStorage.setItem('broderie.affichage', JSON.stringify(AFF)); } catch (x) { /* rien */ } apres(); };
    d.appendChild(b);
  }
  return d;
}
// l'aperçu des Objets est toujours en points ; le rendu réaliste est dans l'onglet Simulation
try { TISSU = localStorage.getItem('broderie.tissu') || '#ffffff'; } catch (e) { /* sans stockage */ }
const rafraichirApercu = () => (S.texte ? apercuTexte() : apercu());
function barreRendu() {
  const d = document.createElement('div'); d.className = 'barre-rendu';
  if (MODE === 'points') d.appendChild(interrupteursAffichage([
    ['sauts', 'jump', 'Sauts : déplacements du fil sans broder (pointillés et grenouille)'],
    ['coupes', 'trim', 'Coupes, arrêts machine et changements de couleur'],
    ['densite', 'densite', 'Densité : rouge = trop dense, jaune = limite, vert = correct'],
    ['penetrations', 'npp', 'Pénétrations : points d\'entrée de l\'aiguille']], () => rafraichirApercu()));
  const outilsVue = document.createElement('span'); outilsVue.className = 'affichage';
  const tout = document.createElement('button'); tout.type = 'button'; tout.className = 'ico-rendu'; tout.title = 'Tout voir : recentrer le dessin (double-clic)';
  tout.innerHTML = icone('voir_tout'); tout.onclick = (e) => { e.stopPropagation(); toutVoir(); };
  const regle = document.createElement('button'); regle.type = 'button'; regle.className = 'ico-rendu' + (MESURE ? ' on' : '');
  regle.title = 'Règle : tirez entre deux points pour mesurer en mm (elle s\'accroche aux points d\'aiguille proches)';
  regle.innerHTML = icone('mesure');
  regle.onclick = (e) => { e.stopPropagation(); MESURE = !MESURE; regle.classList.toggle('on', MESURE); $('#apercu').classList.toggle('mesure', MESURE);
    if (!MESURE) $$('#apercu .mesure-panneau').forEach((x) => x.remove());
    message(MESURE ? 'Règle : tirez d\'un point à un autre dans l\'aperçu. Elle s\'accroche aux points d\'aiguille proches.' : ''); };
  outilsVue.append(tout, regle); d.appendChild(outilsVue);
  if (!(S.isole && S.isole.size)) {                    // isoler la sélection d'un clic
    const iso = document.createElement('button'); iso.type = 'button'; iso.className = 'ico-rendu isoler-sel';
    iso.innerHTML = CIBLE; iso.title = 'Isoler : ne voir que les objets choisis dans l’aperçu et la simulation (le dessin ne change pas)';
    iso.onclick = (e) => {
      e.stopPropagation();
      const ids = S.choix.size ? [...S.choix] : (S.sel ? [S.sel] : []);
      if (ids.length) isoler(ids); else message('Choisissez d’abord un ou plusieurs objets, puis Isoler.');
    };
    outilsVue.appendChild(iso);
  }
  if (S.isole && S.isole.size) {
    const iso = document.createElement('button'); iso.type = 'button'; iso.className = 'isole-actif';
    iso.textContent = `Isolé (${S.isole.size}) ✕`; iso.title = 'Tout réafficher';
    iso.onclick = (e) => { e.stopPropagation(); isoler(null); };
    d.appendChild(iso);
  }
  const c = document.createElement('label'); c.title = 'Couleur du tissu';
  c.innerHTML = `Tissu <input type="color" value="${TISSU}">`;
  $('input', c).oninput = (e) => { TISSU = e.target.value; $('#apercu').style.background = TISSU; majTissu(); try { localStorage.setItem('broderie.tissu', TISSU); } catch (x) { /* rien */ } };
  d.appendChild(c);
  d.addEventListener('pointerdown', (e) => e.stopPropagation());
  d.addEventListener('dblclick', (e) => e.stopPropagation());
  return d;
}
async function apercu() {
  if (S.vue !== 'points' && MODE !== 'points') { MODE = 'points'; modeObjets = null; }    // Objets : toujours en points
  const n = ++apercuDemande;
  if (apercuEnCours) return;
  apercuEnCours = true;
  const a = $('#apercu');
  const badge = document.createElement('div'); badge.className = 'calcul'; badge.textContent = 'Calcul des points…';
  a.appendChild(badge);
  try {
    badge.textContent = MODE === 'points' ? 'Calcul des points…' : 'Rendu réaliste…';
    const modeDemande = MODE;
    if (MODE === 'points' && (AFF.sauts || AFF.coupes)) donneesPoints().catch(() => {});   // en parallèle : sauts et coupes
    const r = await api('apercu', { ids: idsVus(), mode: MODE, options: { sauts: false, penetrations: AFF.penetrations } });
    if (modeDemande !== 'points' && S.vue !== 'points') { apercuDemande++; return; }    // rendu réaliste arrivé après le retour aux Objets
    if (!r.svg) { a.className = 'vide'; a.textContent = r.erreur || 'Aucun point.'; a.appendChild(barreRendu()); vb = vb0 = null; return; }
    const garder = vb && vb0;
    a.className = ''; a.innerHTML = r.svg; a.style.background = TISSU;
    a.appendChild(barreRendu());
    if (MODE === 'points' && AFF.densite) a.appendChild(legendeDensite());
    const svg = $('svg', a);
    const MM = { mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, px: 25.4 / 96, '': 25.4 / 96 };   // largeur de la page en mm
    const lw = /^([\d.]+)\s*(mm|cm|in|pt|px)?$/.exec(svg.getAttribute('width') || '');
    svg.removeAttribute('width'); svg.removeAttribute('height');
    let v = (svg.getAttribute('viewBox') || '0 0 100 100').split(/[ ,]+/).map(Number);
    svg.dataset.page = v.join(' ');                     // la page d'Inkscape (avant d'agrandir la vue)
    const uMM = lw ? v[2] / (parseFloat(lw[1]) * MM[lw[2] || '']) : 1;     // unités du dessin par mm
    svg.dataset.uMm = uMM;
    // vue de départ : la page et tout le motif (un texte posé hors de la page reste visible)
    const plan = [...svg.children].find((g) => g.tagName === 'g' || g.tagName === 'image');   // réaliste : une image
    if (plan) {
      try {
        const b = plan.getBBox(), m = svg.getCTM().inverse().multiply(plan.getCTM());
        const p0 = new DOMPoint(b.x, b.y).matrixTransform(m), p1 = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(m);
        const x0 = Math.min(v[0], p0.x, p1.x), y0 = Math.min(v[1], p0.y, p1.y);
        const x1 = Math.max(v[0] + v[2], p0.x, p1.x), y1 = Math.max(v[1] + v[3], p0.y, p1.y);
        if (b.width && (x0 < v[0] || y0 < v[1] || x1 > v[0] + v[2] || y1 > v[1] + v[3])) {
          const marge = 0.03 * Math.max(x1 - x0, y1 - y0);
          v = [x0 - marge, y0 - marge, x1 - x0 + 2 * marge, y1 - y0 + 2 * marge];
          svg.setAttribute('viewBox', v.join(' '));
        }
      } catch (e) { /* SVG pas encore mesurable : vue de la page */ }
    }
    if (S.vue === 'points' && SIM_AFF.cadre) v = dessinerCadreApercu(svg, plan, v, uMM);
    vb0 = v; vbTout = cadrageAffiche(svg, plan); if (!garder) vb = v.slice();
    if (S.recadrer && vbTout) { vb = vbTout.slice(); S.recadrer = false; }
    if (MODE !== 'points') habiller(svg, v); else { pointsAiguille(svg); contrasteFils(svg); superposerCommandes(svg); if (AFF.densite) carteDensite(svg); }
    zonesCliquables(svg);
    appliquerVue();
    afficherSelection(true);
    message('Clic : choisir un objet (⌘-clic : plusieurs) · glisser ou bouton du milieu : déplacer · molette : zoom · double-clic : tout voir');
  } catch (e) { message(e.message, true); } finally {
    apercuEnCours = false; badge.remove();
    if (n !== apercuDemande) apercu();
  }
}
// cadre schématisé sur le rendu réaliste, centré sur le motif (comme à l'export) ; renvoie la vue agrandie
function dessinerCadreApercu(svg, plan, v, u) {
  const c = cadreChoisi(); if (!c || !plan) return v;
  let b, m;
  try { b = plan.getBBox(); m = svg.getCTM().inverse().multiply(plan.getCTM()); } catch (e) { return v; }
  const p0 = new DOMPoint(b.x, b.y).matrixTransform(m), p1 = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(m);
  const w = c.largeur * u, h = c.hauteur * u;
  const pg = (svg.dataset.page || '').split(' ').map(Number);
  // motif « comme sur la feuille » : le cadre est la feuille (son centre) ; sinon centré sur le motif, comme la machine
  const surFeuille = S.etat.origine && pg.length === 4;
  const cx = surFeuille ? pg[0] + pg[2] / 2 : (p0.x + p1.x) / 2, cy = surFeuille ? pg[1] + pg[3] / 2 : (p0.y + p1.y) / 2;
  const NS = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'cadre-panneau'); g.setAttribute('pointer-events', 'none');
  g.innerHTML = `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${Math.min(w, h) * 0.04}" fill="none"
    stroke="#8a8f99" stroke-width="${0.4 * u}" stroke-dasharray="${2 * u} ${1.3 * u}"/>
    <text x="${cx - w / 2}" y="${cy - h / 2 - 1.5 * u}" font-size="${3.5 * u}" fill="#8a8f99" font-family="-apple-system, Segoe UI, sans-serif">Cadre ${c.largeur} × ${c.hauteur} mm</text>`;
  svg.appendChild(g);
  const x0 = Math.min(v[0], cx - w / 2 - 3 * u), y0 = Math.min(v[1], cy - h / 2 - 7 * u);
  const x1 = Math.max(v[0] + v[2], cx + w / 2 + 3 * u), y1 = Math.max(v[1] + v[3], cy + h / 2 + 3 * u);
  return [x0, y0, x1 - x0, y1 - y0];
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
function majTissu() { $$('#apercu .tissu-fond').forEach((r) => r.setAttribute('fill', TISSU)); contrasteFils($('#apercu > svg')); }

// Sauts, coupes, arrêts et changements de couleur par-dessus l'aperçu (Ink/Stitch dessine les sauts comme du fil).
// Les points d'Ink/Stitch (0,1 mm, centrés sur le motif) sont recalés sur l'emprise du tracé de l'aperçu.
async function superposerCommandes(svg) {
  if (!AFF.sauts && !AFF.coupes) return;
  let d;
  try { d = await donneesPoints(); } catch (e) { return; }
  if (!svg.isConnected || !d.points.length) return;
  const plan = [...svg.children].find((g) => g.tagName === 'g' && !g.classList.contains('selection-panneau') && !g.classList.contains('reperes-panneau'));
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
  for (const [n, [x, y]] of icones) {
    if (n === 'jump' ? !AFF.sauts : !AFF.coupes) continue;
    const im = document.createElementNS(NS, 'image');
    im.setAttribute('href', `/icone/${n}.png`); im.setAttribute('class', 'icone-cmd');
    im.dataset.x = x; im.dataset.y = y;
    g.appendChild(im);
  }
  $$('.commandes-panneau', svg).forEach((x) => x.remove());
  svg.appendChild(g);
  tailleIcones(svg);
}
// Icônes des commandes : même taille à l'écran quel que soit le zoom (comme dans la Simulation)
function tailleIcones(svg) {
  const ims = svg ? svg.querySelectorAll('.icone-cmd') : []; if (!ims.length || !vb) return;
  const r = $('#apercu').getBoundingClientRect();
  const t = 20 * Math.max(vb[2] / Math.max(1, r.width), vb[3] / Math.max(1, r.height));   // 20 pixels
  for (const im of ims) {
    const x = +im.dataset.x, y = +im.dataset.y;
    im.setAttribute('x', x + t * 0.15); im.setAttribute('y', y - t * 1.1); im.setAttribute('width', t); im.setAttribute('height', t);
  }
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

// Fil presque de la couleur du tissu (blanc sur blanc…) : un fin liseré sombre (ou clair sur tissu foncé) pour voir
// son trajet ; la couleur du fil reste la vraie
function luminance(c) {
  const h = String(c || '#000').replace('#', ''), v = h.length === 3 ? [...h].map((x) => x + x) : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
  const [r, g, b] = v.map((x) => parseInt(x, 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const peuVisible = (fil, fond) => { const a = luminance(fil), b = luminance(fond); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) < 1.6; };
const liseré = (fond) => (luminance(fond) > 0.4 ? 'rgba(0,0,0,.7)' : 'rgba(255,255,255,.8)');
function contrasteFils(svg) {
  const plan = svg && svg.querySelector('#__inkstitch_stitch_plan__'); if (!plan) return;
  for (const g of plan.children) {
    const p = g.querySelector('path'); if (!p) continue;
    const c = ((p.getAttribute('style') || '').match(/stroke:\s*(#[0-9a-fA-F]{3,6})/) || [])[1];
    g.style.filter = c && peuVisible(c, TISSU) ? `drop-shadow(0 0 0.35px ${liseré(TISSU)}) drop-shadow(0 0 0.35px ${liseré(TISSU)})` : '';
  }
}

function appliquerVue() { const s = $('#apercu > svg'); if (s && vb) { s.setAttribute('viewBox', vb.join(' ')); tailleIcones(s); } }
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
$('#apercu').addEventListener('dblclick', toutVoir);
// « Tout voir » : cadre sur ce qui est brodé et affiché (calques masqués exclus), plus le cadre de la brodeuse
// dans la Simulation ; pas sur toute la feuille d'Inkscape
function toutVoir() { const v = vbTout || vb0; if (v) { vb = v.slice(); appliquerVue(); } }
function cadrageAffiche(svg, plan) {
  const boites = [];
  const ajouter = (el) => {
    try {
      const b = el.getBBox(); if (!b.width && !b.height) return;
      const m = svg.getCTM().inverse().multiply(el.getCTM());
      const p0 = new DOMPoint(b.x, b.y).matrixTransform(m), p1 = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(m);
      boites.push([Math.min(p0.x, p1.x), Math.min(p0.y, p1.y), Math.max(p0.x, p1.x), Math.max(p0.y, p1.y)]);
    } catch (e) { /* élément pas mesurable */ }
  };
  if (plan) ajouter(plan);
  $$('.cadre-panneau rect', svg).forEach(ajouter);
  if (!boites.length) return null;
  const x0 = Math.min(...boites.map((b) => b[0])), y0 = Math.min(...boites.map((b) => b[1]));
  const x1 = Math.max(...boites.map((b) => b[2])), y1 = Math.max(...boites.map((b) => b[3]));
  const marge = 0.04 * Math.max(x1 - x0, y1 - y0, 1);
  return [x0 - marge, y0 - marge, x1 - x0 + 2 * marge, y1 - y0 + 2 * marge];
}
$('#apercu').addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });   // pas de défilement auto
// Règle : mesure en mm entre deux points de l'aperçu, accrochée aux piqûres de l'aiguille (sommets du plan de broderie)
let MESURE = false;
function sommetsApercu(svg) {
  if (svg._sommets) return svg._sommets;
  const out = [];
  for (const p of svg.querySelectorAll('#__inkstitch_stitch_plan__ path')) {
    const n = (p.getAttribute('d') || '').match(/-?[\d.]+(?:e-?\d+)?/gi) || [];
    let m; try { m = svg.getCTM().inverse().multiply(p.getCTM()); } catch (e) { continue; }
    for (let i = 0; i + 1 < n.length; i += 2) { const q = new DOMPoint(+n[i], +n[i + 1]).matrixTransform(m); out.push([q.x, q.y]); }
  }
  return (svg._sommets = out);
}
function accroche(svg, x, y, seuil) {                       // point d'aiguille le plus proche (sinon le point visé)
  let best = null, d2 = seuil * seuil;
  for (const [a, b] of sommetsApercu(svg)) { const d = (a - x) ** 2 + (b - y) ** 2; if (d < d2) { d2 = d; best = [a, b]; } }
  return best ? { x: best[0], y: best[1], accroche: true } : { x, y, accroche: false };
}
$('#apercu').addEventListener('pointerdown', (e) => {
  if (!MESURE || e.button !== 0 || e.target.closest('.barre-rendu')) return;
  const svg = $('#apercu > svg'); if (!svg) return;
  e.stopImmediatePropagation(); e.preventDefault();
  const NS = 'http://www.w3.org/2000/svg', ctm = svg.getScreenCTM(), unPx = 1 / ctm.a;       // unités du dessin par pixel écran
  const ver = (ev) => { const q = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse()); return accroche(svg, q.x, q.y, 10 * unPx); };
  const a = ver(e), u = parseFloat(svg.dataset.uMm) || 1;
  $$('.mesure-panneau', svg).forEach((x) => x.remove());
  const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'mesure-panneau'); svg.appendChild(g);
  const trace = (b) => {
    const dmm = Math.hypot(b.x - a.x, b.y - a.y) / u;
    const rond = (p) => `<circle cx="${p.x}" cy="${p.y}" r="${4 * unPx}" fill="${p.accroche ? '#2f80ed' : '#fff'}" stroke="#2f80ed" stroke-width="${1.5 * unPx}"/>`;
    const t = `${dmm.toFixed(2).replace('.', ',')} mm`, fs = 13 * unPx, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 10 * unPx;
    g.innerHTML = `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#2f80ed" stroke-width="${1.5 * unPx}"/>${rond(a)}${rond(b)}
      <rect x="${mx - t.length * fs * 0.32}" y="${my - fs * 0.95}" width="${t.length * fs * 0.64}" height="${fs * 1.35}" rx="${4 * unPx}" fill="#2f80ed"/>
      <text x="${mx}" y="${my}" font-size="${fs}" fill="#fff" text-anchor="middle" font-family="-apple-system, Segoe UI, sans-serif">${t}</text>`;
    message(`Mesure : ${t}` + (a.accroche && b.accroche ? ' (d\'une piqûre à l\'autre)' : ''));
  };
  trace(a);
  const mv = (ev) => trace(ver(ev));
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
}, true);
$('#apercu').addEventListener('pointerdown', (e) => {
  if (S.placer && vb && e.button === 0 && !e.target.closest('.barre-rendu, .legende-densite')) {   // départ / fin à placer
    e.preventDefault();
    const p = versDessin(e), { id, quoi } = S.placer;
    S.placer = null; modePlacement();
    poserPosition(id, quoi, { x: p.x, y: p.y });
    return;
  }
  if (!vb || MESURE && e.button === 0 || e.target.closest('.barre-rendu, .legende-densite')) return;     // règle active : c'est elle qui mesure
  const p0 = versDessin(e), v0 = vb.slice();
  let bouge = e.button === 1;                                 // bouton du milieu : toujours déplacer
  const mv = (ev) => {
    if (!bouge && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 4) return;
    bouge = true; $('#apercu').classList.add('deplace');
    vb = [v0[0] - (ev.clientX - e.clientX) * p0.k, v0[1] - (ev.clientY - e.clientY) * p0.k, v0[2], v0[3]]; appliquerVue();
  };
  const up = (ev) => {
    document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
    $('#apercu').classList.remove('deplace');
    if (bouge || e.button !== 0) return;
    // plusieurs objets sous la souris : le plus petit (le sourcil plutôt que la tête qui l'entoure)
    const touches = [...new Set(document.elementsFromPoint(ev.clientX, ev.clientY).map((x) => x.closest && x.closest('[data-objet]')).filter(Boolean))];
    const aire = (z) => { try { const b = z.getBBox(); return b.width * b.height; } catch (x) { return Infinity; } };
    const cible = touches.sort((a, b) => aire(a) - aire(b))[0];
    if (cible) choisir([cible.dataset.objet], ev.metaKey || ev.ctrlKey);
    else if (!(ev.metaKey || ev.ctrlKey)) toutDeselectionner();       // clic dans le vide
  };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
});
// carte de densité d'Ink/Stitch par-dessus l'aperçu (calculée sur une copie du dessin)
// seuils de la carte de densité (ceux d'Ink/Stitch par défaut), retenus d'un dessin à l'autre
const DENS0 = { 'num-neighbors-red': 6, 'density-radius-red': 0.5, 'num-neighbors-yellow': 3, 'density-radius-yellow': 0.5 };
const DENS = { ...DENS0 };
try { Object.assign(DENS, JSON.parse(localStorage.getItem('broderie.densite') || '{}')); } catch (e) { /* défaut */ }
function legendeDensite() {
  const d = document.createElement('div'); d.className = 'legende-densite';
  const ligne = (cl, lib, n, r) => `<div class="ld"><i class="${cl}"></i><span class="ld-lib">${lib}</span>${n
    ? `<input type="number" data-k="${n}" min="1" max="99" step="1" value="${DENS[n]}"><span>points dans</span><input type="number" data-k="${r}" min="0.1" max="5" step="0.1" value="${DENS[r]}"><span>mm</span>` : ''}</div>`;
  d.innerHTML = `<div class="ld-titre">Carte de densité<button type="button" class="raz" title="Seuils d'Ink/Stitch">↺</button></div>`
    + ligne('rouge', 'Trop dense', 'num-neighbors-red', 'density-radius-red') + ligne('jaune', 'Limite', 'num-neighbors-yellow', 'density-radius-yellow')
    + ligne('vert', 'Correct');
  let minut = null;
  const recalculer = () => {
    try { localStorage.setItem('broderie.densite', JSON.stringify(DENS)); } catch (e) { /* rien */ }
    clearTimeout(minut); minut = setTimeout(() => { const svg = $('#apercu > svg'); if (svg) carteDensite(svg); }, 500);
  };
  $$('input', d).forEach((i) => { i.onchange = () => { const v = parseFloat(i.value); if (v > 0) { DENS[i.dataset.k] = v; recalculer(); } }; });
  $('.raz', d).onclick = () => { Object.assign(DENS, DENS0); $$('input', d).forEach((i) => { i.value = DENS[i.dataset.k]; }); recalculer(); };
  ['pointerdown', 'dblclick', 'wheel'].forEach((t) => d.addEventListener(t, (e) => e.stopPropagation()));
  return d;
}
async function carteDensite(svg) {
  let r;
  try { r = await api('densite', { ids: idsVus(), seuils: DENS }); } catch (e) { message(e.message, true); return; }
  if (!r.svg || !svg.isConnected) { if (r.erreur) message(r.erreur, true); return; }
  const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${r.svg}</svg>`, 'image/svg+xml');
  $$('.densite-panneau', svg).forEach((x) => x.remove());
  svg.appendChild(document.importNode(doc.documentElement.firstElementChild, true));
  const rouges = $$('.densite-panneau [id*="red"] circle, .densite-panneau [id*="red"] *', svg).length;
  message(rouges ? 'Densité : les points rouges sont trop serrés (risque de casse) — espacez les rangs ou réduisez les sous-couches.'
    : 'Densité : aucune zone trop serrée.');
}

// zones cliquables : le contour de chaque objet, invisible, par-dessus l'aperçu (dernier dessiné = devant)
async function zonesCliquables(svg) {
  let r;
  try { r = await api('contours'); } catch (e) { return; }
  if (!svg.isConnected) return;
  $$('.cibles-panneau', svg).forEach((x) => x.remove());
  const NS = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'cibles-panneau');
  for (const o of r.objets) {
    if (!o.svg || (S.isole && !S.isole.has(o.id))) continue;
    const doc = new DOMParser().parseFromString(o.svg, 'image/svg+xml');
    const n = document.importNode(doc.documentElement, true);
    n.removeAttribute('class'); n.dataset.objet = o.id;
    const ob = S.etat.objets.find((x) => x.id === o.id) || {};
    // un satin ne se clique que sur sa bande, un trait que sur sa ligne (pas tout l'intérieur d'un contour)
    const t0 = typePrincipal(ob.types ? ob : { types: [] });
    n.dataset.zone = t0 === 'satin_column' && (ob.sous_chemins || 1) >= 2 ? 'bande'
      : (ob.types || []).includes('fill_stitch') || t0 === 'lettrage' ? 'surface' : 'ligne';     // satin d'un seul trait : sa ligne
    const nom = ob.nom || o.id;
    const t = document.createElementNS(NS, 'title'); t.textContent = nom; n.appendChild(t);
    g.appendChild(n);
  }
  svg.insertBefore(g, $('.selection-panneau', svg) || null);
}
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
  const svg = $('#apercu > svg');
  if (!svg) return;
  const ids = S.choix.size ? [...S.choix] : (S.sel ? [S.sel] : []);
  const cle = ids.join(',') + '|' + S.etat.version + '|' + S.etat.attente;
  if (!force && selAffichee === cle && $('.selection-panneau', svg)) return;
  selAffichee = cle;
  $$('.selection-panneau, .reperes-panneau', svg).forEach((g) => g.remove());
  reperesPositions(svg, ids);
  for (const id of ids.slice(0, 60)) {
    try {
      const r = await api('contour', { id });
      if (!r.svg || !$('#apercu > svg') || selAffichee !== cle) return;
      const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
      $('#apercu > svg').appendChild(document.importNode(doc.documentElement, true));
    } catch (e) { /* contour indisponible : l'aperçu reste utilisable */ }
  }
  const rp = $('#apercu > svg .reperes-panneau'); if (rp) rp.parentNode.appendChild(rp);     // repères par-dessus les contours
}

// repères de départ (▶ vert) et de fin (■ rouge) des objets choisis
function reperesPositions(svg, ids) {
  const NS = 'http://www.w3.org/2000/svg', u = +svg.dataset.uMm || 1, r = 1.8 * u;
  const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'reperes-panneau');
  for (const id of ids) {
    for (const [quoi, [x, y]] of Object.entries((S.etat.placees || {})[id] || {})) {
      const dep = quoi === 'starting_point';
      g.insertAdjacentHTML('beforeend', `<g transform="translate(${x},${y})"><title>${dep ? 'Départ' : 'Fin'}</title>
        <circle r="${r}" fill="${dep ? '#2fa84f' : '#d64545'}" stroke="#fff" stroke-width="${0.35 * u}"/>
        ${dep ? `<path d="M${-0.55 * r},${-0.65 * r}L${0.75 * r},0L${-0.55 * r},${0.65 * r}z" fill="#fff"/>`
              : `<rect x="${-0.5 * r}" y="${-0.5 * r}" width="${r}" height="${r}" rx="${0.12 * r}" fill="#fff"/>`}</g>`);
    }
  }
  if (g.childNodes.length) svg.appendChild(g);
}

let minuterie = null;
function apercuBientot() {
  clearTimeout(minuterie);
  minuterie = setTimeout(() => {
    S.simu = S.simuP = null;
    if (S.vue === 'points') { if (S.simMode !== 'animation') apercu(); else chargerSimulation(); rendreStats('#stats').then(verifierCadre); }
    else if (S.vue === 'objets') { if (S.texte) apercuTexteBientot(); else apercu(); }
    else if (S.vue === 'export') { rendreExport(); rendreProfil(); }
  }, 400);
}

// ---------------------------------------------------------------- statistiques (points d'Ink/Stitch)
// une seule demande à la fois pour les mêmes objets : l'aperçu la lance tout de suite, en même temps que le dessin
// des points, et les sauts, la simulation ou les statistiques reprennent la même réponse
async function donneesPoints() {
  const cle = JSON.stringify(idsVus());
  if (S.simu && S.simuCle === cle) return S.simu;
  if (!S.simuP || S.simuPCle !== cle) {
    S.simuPCle = cle;
    S.simuP = api('points', { ids: idsVus() }).then((r) => { if (r.erreur) throw new Error(r.erreur); return r; });
    S.simuP.catch(() => { S.simuP = null; });
  }
  const p = S.simuP, r = await p;
  if (S.simuP === p) { S.simu = r; S.simuCle = cle; }
  return r;
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
function nomFil(c, i) {           // « Madeira Rayon 1307 Scarlet » si la couleur est celle d'une bobine
  const f = BOB.donnees && BOB.donnees.fils.find((x) => x.couleur === String(c).toLowerCase() && x.bobine && x.ecart < 0.5);
  return f ? `${BOB.donnees.marque} ${f.bobine.numero} ${f.bobine.nom}` : `Fil ${i + 1}`;
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
      <div class="legende">${s.fils.map((c, i) => `<span><i style="background:${esc(c)}"></i>${esc(nomFil(c, i))}</span>`).join('')}</div>`;
    S.dimensions = [s.larg, s.haut];
    return s;
  } catch (e) { div.innerHTML = `<span class="muted small">${esc(e.message)}</span>`; }
}
// Cadres de la brodeuse : liste personnelle (ajout, suppression), centrage du motif, cadre = page d'Inkscape
S.cadres = null;
const cadreChoisi = () => (S.cadres || [])[+$('#fCadre').value];
async function rendreExport() {
  await rendreCadres();                               // le cadre choisi (dans Simulation) est rappelé ici
  rendreBobines();
  await rendreStats('#statsExport');
  verifierCadre();
}
async function rendreCadres() {
  if (!S.cadres) S.cadres = (await api('cadres')).cadres;
  const sel = $('#fCadre');
  let c = 0; try { c = +(localStorage.getItem('broderie.cadreN') || 0); } catch (e) { /* sans stockage */ }
  const taille = (x) => `${x.largeur} × ${x.hauteur} mm`;
  const nomCadre = (x) => (x.nom || '').replace(/\s/g, '') === `${x.largeur}×${x.hauteur}` ? taille(x) : `${x.nom} — ${taille(x)}`;   // la taille une seule fois
  sel.innerHTML = S.cadres.map((x, i) => `<option value="${i}" ${i === c ? 'selected' : ''}>${esc(nomCadre(x))}</option>`).join('');
  sel.onchange = () => { try { localStorage.setItem('broderie.cadreN', sel.value); } catch (e) { /* rien */ } verifierCadre(); pageAuCadre();
    if (BATI.actif) envoyerBati(); else redessinerCadre(); };     // le bâti suit le nouveau cadre
  $('#cbCadrePage').onchange = () => { if ($('#cbCadrePage').checked) pageAuCadre(); };
  $('#fPosition').value = S.etat.origine ? 'feuille' : 'centre';
  verifierCadre();
}
// position du motif dans le cadre : centré (défaut d'Ink/Stitch) ou comme sur la feuille (origine au centre de la feuille)
$('#fPosition').onchange = async (e) => {
  const feuille = e.target.value === 'feuille';
  try {
    S.etat = await api('origine', { actif: feuille }, feuille ? 'Ink/Stitch pose le point d\'origine…' : null);
    if (feuille && !$('#cbCadrePage').checked) { $('#cbCadrePage').checked = true; await pageAuCadre(); }
    S.simu = S.simuP = null; rendreAttente(); redessinerCadre(); if (S.simMode === 'animation') chargerSimulation();
    message(feuille ? 'Le motif sera brodé à sa place sur la feuille (qui a la taille du cadre) : déplacez-le dans Inkscape pour le décaler.'
      : 'Le motif sera brodé au centre du cadre.');
  } catch (x) { message(x.message, true); e.target.value = feuille ? 'centre' : 'feuille'; }
};

// Vérifier avant d'exporter : dépistage d'Ink/Stitch (traduit), sauts sans coupe, densité, objets minuscules, cadre.
// Chaque problème renvoie à son objet (« Montrer ») et, quand c'est possible, se corrige d'un clic.
async function verifier() {
  const l = $('#verifListe'); l.className = 'muted small'; l.textContent = 'Ink/Stitch vérifie le dessin…';
  let r;
  try { r = await api('verifier', {}, 'Vérification du dessin…'); } catch (e) { l.textContent = e.message; return; }
  const pbs = r.problemes.slice();
  const c = cadreChoisi();
  if (c && S.dimensions) {
    const [w, h] = S.dimensions;
    if (w > c.largeur || h > c.hauteur) pbs.unshift({ gravite: 'erreur', titre: 'Le motif dépasse le cadre',
      detail: `Motif ${w.toFixed(0)} × ${h.toFixed(0)} mm, cadre ${c.largeur} × ${c.hauteur} mm : choisissez un plus grand cadre ou réduisez le motif.`, id: null });
  }
  l.className = '';
  if (!pbs.length) { l.innerHTML = '<div class="ok-texte">✓ Aucun problème trouvé : vous pouvez exporter.</div>'; return; }
  const ICO = { erreur: '⛔', alerte: '⚠', conseil: 'ℹ' };
  l.innerHTML = `<div class="small muted">${pbs.length} point(s) à regarder :</div>` + pbs.map((p, i) => `<div class="pb ${p.gravite}">
    <span class="pb-ico">${ICO[p.gravite] || '•'}</span><span class="pb-txt"><b>${esc(p.titre)}</b>${p.objet ? ` · ${esc(p.objet)}` : ''}<br>
    <span class="muted small">${esc(p.detail)}</span></span>
    <span class="pb-act">${p.id ? `<button class="petit" data-montrer="${i}">Montrer</button>` : ''}${p.corriger ? `<button class="petit principal" data-corriger="${i}">${esc(p.corriger.libelle)}</button>` : ''}</span></div>`).join('');
  $$('[data-montrer]', l).forEach((b) => { b.onclick = () => { changerVue('objets'); choisir([pbs[+b.dataset.montrer].id]); }; });
  $$('[data-corriger]', l).forEach((b) => { b.onclick = async () => {
    const p = pbs[+b.dataset.corriger];
    try {
      if (p.corriger.action === 'params') S.etat = await api('params', { id: p.id, valeurs: p.corriger.valeurs });
      else if (p.corriger.action === 'visible') S.etat = await api('visible', { id: p.id, visible: p.corriger.visible });
      else if (p.corriger.action === 'opaque') S.etat = await api('opaque', { id: p.id });
      S.simu = S.simuP = null; rendreTout(); verifier();
    } catch (e) { message(e.message, true); }
  }; });
}
$('#bVerifier').onclick = verifier;

// Préparer la broderie : adapter tout le dessin au tissu, regrouper les couleurs, couper les sauts longs
// Profil de broderie du dessin : tissu, stabilisateur, fil. Les réglages « auto » en sont calculés (côté serveur,
// règles documentées dans modele.py) et recalculés quand le profil change ; ceux réglés à la main ne bougent pas.
const PROFIL_TEXTE = { toile: 'jean', pique: 'jersey' };      // préréglages des lettres (TISSUS) les plus proches
function rendreProfil() {
  const P = S.etat.profils; if (!P) return;
  const p = Object.assign({ tissu: 'coton', stabilisateur: 'dechirer', fil: '40' }, S.etat.profil || {});
  for (const [id, k] of [['#prTissu', 'tissu'], ['#prStab', 'stabilisateur'], ['#prFil', 'fil']]) {
    $(id).innerHTML = Object.entries(P[k]).map(([c, nom]) => `<option value="${c}" ${c === p[k] ? 'selected' : ''}>${esc(nom)}</option>`).join('');
  }
  $('#prConseil').textContent = (S.etat.conseil_profil || []).map((c) => c.charAt(0).toUpperCase() + c.slice(1) + '.').join(' ')
    || (S.etat.profil ? 'Les réglages « auto » suivent ce profil.' : 'Choisissez le tissu, le stabilisateur et le fil : les réglages « auto » en sont calculés.');
}
for (const id of ['#prTissu', '#prStab', '#prFil']) {
  $(id).onchange = async () => {
    try {
      S.etat = await api('profil', { profil: { tissu: $('#prTissu').value, stabilisateur: $('#prStab').value, fil: $('#prFil').value } });
      S.simu = S.simuP = null; rendreTout(); rendreExport(); rendreProfil();
      message('Profil enregistré dans le dessin : les réglages « auto » sont recalculés, ceux réglés à la main ne changent pas.');
    } catch (e) { message(e.message, true); }
  };
}
$('#bPrTissu').onclick = async () => {
  try {
    if (!S.etat.profil) S.etat = await api('profil', { profil: { tissu: $('#prTissu').value, stabilisateur: $('#prStab').value, fil: $('#prFil').value } });
    const ids = S.etat.objets.filter((o) => ['satin_column', 'fill_stitch'].includes(typePrincipal(o))).map((o) => o.id);
    const r = await api('auto', { ids }, 'Calcul des réglages…');
    S.etat = r.etat;
    // textes : préréglage du tissu le plus proche, lettre par lettre (comme avant)
    const x = TISSUS[PROFIL_TEXTE[S.etat.profil.tissu] || S.etat.profil.tissu];
    let nt = 0;
    for (const o of S.etat.objets.filter((q) => typePrincipal(q) === 'lettrage')) {
      if (!x) break;
      const l = (await api('lettres_resume', { id: o.id })).lettres;
      for (const typ of Object.keys(l ? l.types : {})) if (x[typ]) await api('lettres', { id: o.id, type: typ, valeurs: x[typ] });
      nt++;
    }
    S.etat = await api('etat'); S.simu = S.simuP = null; rendreTout(); rendreExport(); rendreProfil();
    message(`${r.n} objet(s) en auto${nt ? `, ${nt} texte(s) réglé(s)` : ''}. Chaque réglage reste modifiable : la valeur passe alors « à la main ».`);
  } catch (e) { message(e.message, true); }
};
$('#bPrOrdre').onclick = async () => {
  const i = $('#prOrdreInfo'); i.textContent = 'Ink/Stitch compare…';
  try {
    const r = await api('optimiser', {}, 'Calcul du nouvel ordre…');
    if (!r.change) { i.textContent = 'Les couleurs sont déjà regroupées.'; return; }
    const gain = `changements de fil : ${r.avant.changements} → ${r.apres.changements} · sauts : ${r.avant.sauts} → ${r.apres.sauts}`;
    if (!confirm(`Regrouper les couleurs (calque par calque) ?\n${gain}\n\nVérifiez ensuite la simulation : un objet peut passer au-dessus d'un autre.`)) { i.textContent = gain; return; }
    const r2 = await api('optimiser', { appliquer: true });
    S.etat = r2.etat; S.simu = S.simuP = null; rendreTout(); rendreExport(); i.textContent = '✓ ' + gain;
  } catch (e) { i.textContent = ''; message(e.message, true); }
};
$('#bPrLiaison').onclick = async () => {
  try {
    const r = await api('relier_sauts', { max: +$('#prLiaison').value || 3 }, 'Ink/Stitch relie les sauts…');
    S.etat = r.etat; S.simu = S.simuP = null; rendreTout(); rendreExport();
    message(r.n ? `${r.n} saut(s) relié(s) par un point droit (nouveaux traits dans la liste, à masquer ou supprimer si l'un se voit).`
      : 'Aucun saut court à relier entre deux formes de même couleur.');
  } catch (e) { message(e.message, true); }
};
$('#bPrCoupes').onclick = async () => {
  try {
    const r = await api('couper_sauts', { seuil: +$('#prSeuil').value || 5 }, 'Recherche des sauts longs…');
    S.etat = r.etat; S.simu = S.simuP = null; rendreTout(); rendreExport();
    message(r.coupes ? `${r.coupes} coupe(s) ajoutée(s) après les sauts longs.` : 'Aucun saut long sans coupe.');
  } catch (e) { message(e.message, true); }
};

// Bobines : la marque de fil, et pour chaque couleur du dessin la bobine la plus proche (ou choisie à la main)
const BOB = { marque: null, choix: {}, donnees: null, ouvert: null, nuancier: null };
try { BOB.marque = localStorage.getItem('broderie.marque'); } catch (e) { /* sans stockage */ }
const PROCHE = (e) => e < 0.5 ? ['Identique', 'ok'] : e < 3 ? ['Identique à l’œil', 'ok'] : e < 8 ? ['Très proche', 'ok'] : e < 15 ? ['Approchant', 'moy'] : ['Éloigné', 'loin'];
const nomBobine = (b) => b ? `${BOB.donnees.marque} ${b.numero}` : '—';
async function rendreBobines() {
  const div = $('#bobines');
  try { BOB.donnees = await api('bobines', { marque: BOB.marque, choix: BOB.choix }); } catch (e) { div.innerHTML = `<span class="muted small">${esc(e.message)}</span>`; return; }
  const d = BOB.donnees; BOB.marque = d.marque;
  const aChanger = d.fils.filter((f) => f.bobine && f.ecart >= 0.5).length;
  div.innerHTML = `<div class="carte-titre"><span>Bobines</span><span class="muted small">${d.fils.length} fil(s) · ordre de couture</span></div>
    <label class="etiquette">Marque de fil</label>
    <div class="ligne-marque"><select id="bobMarque">${d.marques.map((m) => `<option ${m === d.marque ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>
      <span class="muted small">${d.marques.length} nuanciers</span></div>
    <div id="bobListe">${d.fils.map((f, i) => {
      const [lib, cl] = f.bobine ? PROCHE(f.ecart) : ['', ''];
      return `<div class="bob" data-c="${esc(f.couleur)}"><span class="n">${i + 1}</span>
        <span class="paire"><i class="pastille" style="background:${esc(f.couleur)}"></i>${icone('fleche')}<i class="bobine" style="--c:${esc(f.bobine ? f.bobine.couleur : '#888')}"></i></span>
        <span class="bob-txt"><b>${esc(nomBobine(f.bobine))}</b>${f.bobine ? ' · ' + esc(f.bobine.nom) : ''}<br><span class="muted small">${esc(f.objets.join(', '))}</span></span>
        ${lib ? `<span class="pastille-ecart ${cl}">${lib}</span>` : ''}<button class="petit bob-changer">Changer</button></div>
        ${BOB.ouvert === f.couleur ? '<div class="bob-choix"></div>' : ''}`;
    }).join('')}</div>
    <div class="bob-actions"><button class="principal" id="bobAppliquer" ${aChanger ? '' : 'disabled'}>Prendre les couleurs exactes des fils</button>
      <button id="bobListeFils">Liste des fils (texte)</button></div>
    <p class="muted small">À gauche la couleur du dessin, à droite la bobine. ${aChanger
      ? 'Le bouton bleu donne à vos objets la couleur exacte des bobines : Ink/Stitch reconnaît alors la marque, le numéro et le nom (liste des fils, fichiers .vp3 et .inf).'
      : 'Vos couleurs sont celles des bobines : Ink/Stitch reconnaît la marque, le numéro et le nom (liste des fils, fichiers .vp3 et .inf).'}</p>`;
  $('#bobMarque').onchange = (e) => { BOB.marque = e.target.value; BOB.choix = {}; BOB.ouvert = null; BOB.nuancier = null;
    try { localStorage.setItem('broderie.marque', BOB.marque); } catch (x) { /* rien */ } rendreBobines(); };
  $$('#bobListe .bob-changer').forEach((b) => { b.onclick = () => { const c = b.closest('.bob').dataset.c; BOB.ouvert = BOB.ouvert === c ? null : c; rendreBobines(); }; });
  if (BOB.ouvert) rendreNuancier($('#bobListe .bob-choix'));
  $('#bobAppliquer').onclick = async () => {
    const corr = {};
    for (const f of BOB.donnees.fils) if (f.bobine && f.ecart >= 0.5) corr[f.couleur] = f.bobine.couleur;
    try {
      S.etat = await api('appliquer_fils', { correspondances: corr });
      BOB.choix = {}; BOB.ouvert = null; S.simu = S.simuP = null;
      rendreAttente(); rendreBobines(); rendreStats('#statsExport');
      message(`${Object.keys(corr).length} couleur(s) remplacée(s) par celles des bobines. Synchronisez pour les envoyer à Inkscape.`);
    } catch (e) { message(e.message, true); }
  };
  $('#bobListeFils').onclick = () => {
    const l = [`Fils pour « ${S.etat.nom || 'dessin'} » — ${BOB.donnees.marque}`, ''];
    BOB.donnees.fils.forEach((f, i) => l.push(`${i + 1}. ${nomBobine(f.bobine)} ${f.bobine ? f.bobine.nom : ''} (${f.bobine ? f.bobine.couleur : f.couleur}) — ${f.objets.join(', ')}`));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([l.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' }));
    a.download = `${S.etat.nom || 'dessin'} - fils.txt`; a.click();
  };
}
async function rendreNuancier(div) {
  if (!BOB.nuancier || BOB.nuancier.marque !== BOB.marque) BOB.nuancier = { marque: BOB.marque, fils: (await api('nuancier', { marque: BOB.marque })).fils };
  const c = BOB.ouvert;
  div.innerHTML = `<input type="search" id="bobRecherche" placeholder="Numéro ou nom (ex. 1307, rouge, Scarlet)…"><div class="bob-grille"></div>`;
  const ecart = (a, b) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const [x, y] = [p(a), p(b)];
    return (x[0] - y[0]) ** 2 * 2 + (x[1] - y[1]) ** 2 * 4 + (x[2] - y[2]) ** 2 * 3; };
  const trie = [...BOB.nuancier.fils].sort((a, b) => ecart(c, a.couleur) - ecart(c, b.couleur));
  const afficher = (q) => {
    q = (q || '').toLowerCase().trim();
    const l = (q ? trie.filter((f) => f.numero.toLowerCase().includes(q) || f.nom.toLowerCase().includes(q)) : trie).slice(0, 60);
    $('.bob-grille', div).innerHTML = l.map((f) => `<button class="bob-teinte" title="${esc(f.numero + ' · ' + f.nom)}" data-c="${esc(f.couleur)}"><i style="background:${esc(f.couleur)}"></i><span>${esc(f.numero)}</span></button>`).join('')
      || '<span class="muted small">Aucune bobine.</span>';
    $$('.bob-teinte', div).forEach((b) => { b.onclick = () => { BOB.choix[c] = b.dataset.c; BOB.ouvert = null; rendreBobines(); }; });
  };
  $('#bobRecherche', div).oninput = (e) => afficher(e.target.value);
  afficher('');
  $('#bobRecherche', div).focus();
}
function verifierCadre() {
  const i = $('#cadreInfo'), c = cadreChoisi();
  if (!c || !S.dimensions) { i.textContent = ''; $('#cadreExport').textContent = ''; return; }
  let [w, h] = S.dimensions;
  if (S.etat.origine && S.simu && S.simu.points.length) {     // motif décalé : il doit tenir autour du centre du cadre
    let mx = 0, my = 0;
    for (const [x, y, k] of S.simu.points) if (k === 'STITCH') { mx = Math.max(mx, Math.abs(x)); my = Math.max(my, Math.abs(y)); }
    w = Math.max(w, mx / 5); h = Math.max(h, my / 5);            // 0,1 mm, de part et d'autre du centre
  }
  const ok = (w <= c.largeur && h <= c.hauteur);
  const tourne = !ok && !S.etat.origine && w <= c.hauteur && h <= c.largeur;
  i.innerHTML = ok ? `<span style="color:#5ec27a">✓ Le motif (${S.dimensions[0].toFixed(0)} × ${S.dimensions[1].toFixed(0)} mm) tient dans le cadre${S.etat.origine ? ', à sa place sur la feuille' : ''}.</span>`
    : S.etat.origine && S.dimensions[0] <= c.largeur && S.dimensions[1] <= c.hauteur
      ? `<span style="color:#f2b45a">⚠ Placé comme sur la feuille, le motif sort du cadre : rapprochez-le du centre de la feuille.</span>`
    : tourne ? `<span style="color:#f2b45a">⚠ Le motif tient seulement s'il est tourné d'un quart de tour (dans Inkscape).</span>`
    : `<span style="color:#f2b45a">⚠ Le motif (${w.toFixed(0)} × ${h.toFixed(0)} mm) dépasse ce cadre.</span>`;
  $('#cadreExport').innerHTML = `Cadre ${c.largeur} × ${c.hauteur} mm : ` + i.innerHTML + ' (à régler dans Simulation)';
}
// Bâti : faufilage autour du motif, brodé en premier ; curseurs écart, longueur de point, arrondi des angles
const BATI = { actif: false, ecart: 10, longueur: 5, arrondi: 6 };
try { Object.assign(BATI, JSON.parse(localStorage.getItem('broderie.bati') || '{}')); } catch (e) { /* défaut */ }
let minuterieBati = null;
function rendreBati() {
  const d = $('#bati'), present = S.etat && S.etat.bati;
  if (present) Object.assign(BATI, present, { actif: true });
  else BATI.actif = false;
  const curseur = (k, lib, min, max, pas) => `<div class="curseur-bati"><div class="haut"><span>${lib}</span><b id="bv-${k}">${BATI[k]} mm</b></div>
    <input type="range" data-k="${k}" min="${min}" max="${max}" step="${pas}" value="${BATI[k]}" ${BATI.actif ? '' : 'disabled'}></div>`;
  d.innerHTML = `<div class="carte-titre"><span>Bâti</span><label class="interrupteur" style="margin:0"><input type="checkbox" id="cbBati" ${BATI.actif ? 'checked' : ''}></label></div>
    ${curseur('ecart', 'Écart avec le motif', 2, 40, 1)}${curseur('longueur', 'Longueur de point', 2, 10, 0.5)}${curseur('arrondi', 'Arrondi des angles', 0, 30, 1)}
    ${present && present.depasse ? '<p class="small" style="color:#f2b45a">⚠ Le bâti sort du cadre : réduisez l\'écart.</p>' : ''}
    <p class="muted small">Brodé en premier, dans sa couleur (la machine s'arrête pour le fil de bâti), puis coupé. Sans points d'arrêt : il s'enlève facilement.</p>`;
  $('#cbBati').onchange = (e) => { BATI.actif = e.target.checked; envoyerBati(); };
  $$('#bati input[type=range]').forEach((r) => {
    r.oninput = () => { BATI[r.dataset.k] = +r.value; $('#bv-' + r.dataset.k).textContent = r.value + ' mm'; clearTimeout(minuterieBati); minuterieBati = setTimeout(envoyerBati, 350); };
  });
}
async function envoyerBati() {
  try { localStorage.setItem('broderie.bati', JSON.stringify(BATI)); } catch (e) { /* rien */ }
  try {
    const c = cadreChoisi();
    S.etat = await api('bati', { ...BATI, cadre_largeur: c ? c.largeur : null, cadre_hauteur: c ? c.hauteur : null });
    S.simu = S.simuP = null; rendreAttente(); rendreBati();
    if (S.simMode !== 'animation') apercu(); else chargerSimulation();
    rendreStats('#stats').then(verifierCadre);
    message(BATI.actif ? 'Bâti placé autour du motif : Synchroniser pour l\'envoyer à Inkscape.' : 'Bâti retiré : Synchroniser pour l\'enlever d\'Inkscape.');
  } catch (e) { message(e.message, true); BATI.actif = false; rendreBati(); }
}
// le cadre change : on le redessine dans la simulation
function redessinerCadre() { if (S.vue === 'points') { if (S.simMode !== 'animation') apercu(); else dessinerSimulation(); } }
$('#bCadreAjout').onclick = async () => {
  const l = +$('#ncL').value, h = +$('#ncH').value;
  if (!(l > 0 && h > 0)) { message('Indiquez la largeur et la hauteur du cadre en millimètres.', true); return; }
  S.cadres = (await api('cadres_ecrire', { cadres: [...S.cadres, { nom: $('#ncNom').value.trim() || `${l} × ${h}`, largeur: l, hauteur: h }] })).cadres;
  try { localStorage.setItem('broderie.cadreN', S.cadres.length - 1); } catch (e) { /* rien */ }
  $('#nouveauCadre').open = false; $('#ncNom').value = $('#ncL').value = $('#ncH').value = '';
  rendreCadres(); redessinerCadre(); message('Cadre ajouté.');
};
$('#bCadreSuppr').onclick = async () => {
  const n = +$('#fCadre').value, c = S.cadres[n];
  if (!c || !confirm(`Supprimer le cadre « ${c.nom} » de la liste ?`)) return;
  S.cadres = (await api('cadres_ecrire', { cadres: S.cadres.filter((_, i) => i !== n) })).cadres;
  try { localStorage.setItem('broderie.cadreN', 0); } catch (e) { /* rien */ }
  rendreCadres(); redessinerCadre(); message('Cadre supprimé.');
};
// choisir un cadre : la feuille d'Inkscape prend sa taille à la prochaine synchronisation (le motif ne bouge pas)
async function pageAuCadre() {
  const c = cadreChoisi(); if (!c || !$('#cbCadrePage').checked) return;
  try {
    S.etat = await api('cadre', { largeur: c.largeur, hauteur: c.hauteur, centrer: false, page: true });
    rendreAttente(); apercuBientot();
    message(`La feuille d'Inkscape prendra la taille du cadre ${c.largeur} × ${c.hauteur} mm : appuyez sur Synchroniser (ou ⌘⌥B).`);
  } catch (e) { message(e.message, true); }
}
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
const SIM_AFF = { npp: false, sauts: true, coupes: true, arrets: true, couleurs: true, mire: true, page: false, info: false, cadre: true, suivre: false, enpoints: false, fond: '#ffffff' };
const SIM_PREF = { epaisseur: 0.3, npp: 0.5, mireRayon: 12, mireEpaisseur: 2, mireCouleur: '#e74c3c', adapter: true };
try {
  Object.assign(SIM_AFF, JSON.parse(localStorage.getItem('broderie.simAff') || '{}'));
  if (localStorage.getItem('broderie.simMode') === 'points') { SIM_AFF.enpoints = true; localStorage.setItem('broderie.simMode', 'animation'); }
  Object.assign(SIM_PREF, JSON.parse(localStorage.getItem('broderie.simPref') || '{}'));
} catch (e) { /* valeurs par défaut */ }
const memoriser = () => { try { localStorage.setItem('broderie.simAff', JSON.stringify(SIM_AFF)); localStorage.setItem('broderie.simPref', JSON.stringify(SIM_PREF)); } catch (e) { /* rien */ } };
const NOM_CMD = { JUMP: 'Saut', TRIM: 'Coupe', STOP: 'Arrêt', COLOR_CHANGE: 'Changement de couleur', END: 'Fin' };
const ICONES = {};
for (const n of ['jump', 'trim', 'stop', 'color_change']) { const im = new Image(); im.src = `/icone/${n}.png`; ICONES[n] = im; }
// icônes des boutons, dessinées dans l'esprit des SF Symbols d'Apple (traits arrondis, couleur du texte)
const F = 'fill="currentColor" stroke="none"';
const SF = {
  npp: `<path d="M12 3v10.5"/><ellipse cx="12" cy="6.2" rx=".9" ry="1.9"/><path d="M11 13.5h2L12 16z" ${F}/><circle cx="6.5" cy="20" r="1.3" ${F}/><circle cx="12" cy="20" r="1.3" ${F}/><circle cx="17.5" cy="20" r="1.3" ${F}/>`,
  jump: `<path d="M4.5 15.2c0-3.6 3.4-6.2 7.5-6.2s7.5 2.6 7.5 6.2c0 2.4-3.4 4.3-7.5 4.3s-7.5-1.9-7.5-4.3z"/><circle cx="8.3" cy="8.3" r="2.6"/><circle cx="15.7" cy="8.3" r="2.6"/><circle cx="8.3" cy="8.3" r="1" ${F}/><circle cx="15.7" cy="8.3" r="1" ${F}/><path d="M9.3 15.4c1.7 1.1 3.7 1.1 5.4 0"/>`,
  trim: `<circle cx="6.5" cy="17.3" r="2.7"/><circle cx="17.5" cy="17.3" r="2.7"/><path d="M8.5 15.4 18.5 4M15.5 15.4 5.5 4"/>`,
  stop: `<circle cx="12" cy="12" r="8.5"/><path d="M10 9v6M14 9v6"/>`,
  color_change: `<rect x="6" y="3.5" width="12" height="3" rx="1.2"/><rect x="6" y="17.5" width="12" height="3" rx="1.2"/><path d="M8 6.5v11M16 6.5v11M8 9.7h8M8 12h8M8 14.3h8"/>`,
  densite: `<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M4 12h16M12 4v16"/><path d="M12 4h4.5A3.5 3.5 0 0 1 20 7.5V12h-8z" ${F} opacity=".75"/><path d="M4 12h8v8H7.5A3.5 3.5 0 0 1 4 16.5z" ${F} opacity=".35"/>`,
  cursor: `<circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5"/>`,
  page: `<rect x="4" y="5" width="16" height="14" rx="2.5"/>`,
  info: `<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.7" r="1" ${F}/>`,
  settings: `<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>`,
  restart: `<path d="M4.8 12A7.2 7.2 0 1 0 7 6.8"/><path d="M4.5 3.8v4.4h4.4"/>`,
  backward_command: `<path d="M6 5.5v13"/><path d="M18 6.5 9.5 12l8.5 5.5z" ${F}/>`,
  backward_stitch: `<path d="M14.5 6 8.5 12l6 6"/>`,
  play: `<path d="M8 5.8v12.4c0 .8.9 1.3 1.6.8l9.4-6.2a1 1 0 0 0 0-1.6L9.6 5c-.7-.5-1.6 0-1.6.8z" ${F}/>`,
  pause: `<rect x="6.5" y="5" width="3.6" height="14" rx="1.2" ${F}/><rect x="13.9" y="5" width="3.6" height="14" rx="1.2" ${F}/>`,
  forward_stitch: `<path d="M9.5 6l6 6-6 6"/>`,
  fleche: `<path d="M5 12h14M14 7l5 5-5 5"/>`,
  vue_points: `<circle cx="5" cy="17" r="1.6" ${F}/><circle cx="10" cy="11" r="1.6" ${F}/><circle cx="15" cy="15" r="1.6" ${F}/><circle cx="19.5" cy="7" r="1.6" ${F}/><path d="M5 17l5-6 5 4 4.5-8" stroke-width="1"/>`,
  voir_tout: `<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><rect x="9" y="9" width="6" height="6" rx="1"/>`,
  aiguille: `<circle cx="12" cy="12" r="2.2" ${F}/><circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>`,
  mesure: `<path d="M3.5 16.5 16.5 3.5l4 4-13 13z"/><path d="M7 13l1.8 1.8M9.5 10.5l2.5 2.5M12 8l1.8 1.8M14.5 5.5l2.5 2.5"/>`,
  cadre: `<rect x="3" y="3" width="18" height="18" rx="4"/><rect x="7.5" y="7.5" width="9" height="9" rx="1.5" stroke-dasharray="2 1.6"/>`,
  forward_command: `<path d="M18 5.5v13"/><path d="M6 6.5l8.5 5.5L6 17.5z" ${F}/>`,
  direction: `<path d="M4 8.5h15M15.5 5l3.5 3.5-3.5 3.5M20 15.5H5M8.5 12 5 15.5 8.5 19"/>`,
  slower: `<path d="M4.5 16.5a7.5 7.5 0 1 1 15 0"/><path d="M12 16.5 8 12.5"/><circle cx="12" cy="16.5" r="1.2" ${F}/>`,
  faster: `<path d="M4.5 16.5a7.5 7.5 0 1 1 15 0"/><path d="M12 16.5l4-4"/><circle cx="12" cy="16.5" r="1.2" ${F}/>`,
};
const icone = (n) => SF[n] ? `<svg class="sf" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${SF[n]}</svg>`
  : `<img src="/icone/${n}_dark.png" alt="">`;

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
  const c = SIM_AFF.cadre && cadreChoisi();
  if (c) {                                            // le cadre aussi (centré sur le motif, comme à l'export)
    x0 = Math.min(x0, -c.largeur * 5); x1 = Math.max(x1, c.largeur * 5);
    y0 = Math.min(y0, -c.hauteur * 5); y1 = Math.max(y1, c.hauteur * 5);
  }
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
  if (!SIM.pts || !SIM.pts.length || cv.width < 60 || cv.height < 60) return;    // zone pas encore à sa taille
  const { k, ox, oy } = cadreSimulation(cv);
  SIM.repere = { k, ox, oy };
  if (SIM_AFF.suivre) {                               // suivre l'aiguille : elle reste au centre de la vue
    const p = SIM.pts[Math.max(0, Math.min(SIM.i, SIM.pts.length) - 1)];
    if (p) { SIM.vue.x = cv.width / 2 - SIM.vue.k * (ox + p[0] * k); SIM.vue.y = cv.height / 2 - SIM.vue.k * (oy + p[1] * k); }
  }
  g.setTransform(SIM.vue.k, 0, 0, SIM.vue.k, SIM.vue.x, SIM.vue.y);
  const px = 1 / SIM.vue.k;                          // un pixel écran
  if (SIM_AFF.page && SIM.page) {
    const p = SIM.page;
    g.strokeStyle = '#888'; g.lineWidth = dpr * px; g.setLineDash([]);
    g.strokeRect(ox - p.cx * 10 * k, oy - p.cy * 10 * k, p.largeur * 10 * k, p.hauteur * 10 * k);
  }
  const X = (x) => ox + x * k, Y = (y) => oy + y * k;
  const cadre = SIM_AFF.cadre && cadreChoisi();
  if (cadre) {                                        // cadre schématisé : contour en pointillés et sa taille
    g.save(); g.strokeStyle = '#8a8f99'; g.lineWidth = 1.5 * dpr * px; g.setLineDash([6 * dpr * px, 4 * dpr * px]);
    const w = cadre.largeur * 10 * k, h = cadre.hauteur * 10 * k;
    g.beginPath(); g.roundRect(X(-cadre.largeur * 5), Y(-cadre.hauteur * 5), w, h, Math.min(w, h) * 0.04); g.stroke();
    g.fillStyle = '#8a8f99'; g.font = `${12 * dpr * px}px -apple-system, "Segoe UI", sans-serif`;
    g.fillText(`Cadre ${cadre.largeur} × ${cadre.hauteur} mm`, X(-cadre.largeur * 5), Y(-cadre.hauteur * 5) - 6 * dpr * px);
    g.restore();
  }
  const fin = Math.min(SIM.i, SIM.pts.length);
  // fil brodé, couleur par couleur
  const modePoints = SIM_AFF.enpoints;               // vue en points : fil fin et chaque piqûre de l'aiguille
  g.lineWidth = modePoints ? dpr * px : Math.max(dpr * px * 0.6, SIM_PREF.epaisseur * 10 * k); g.lineCap = 'round'; g.lineJoin = 'round';
  let fil = 0, prec = null, saut = false;
  const sauts = [], marques = [], trous = [];
  const fixerFil = (c) => {                            // fil peu visible sur le fond : liseré (voir contrasteFils)
    g.strokeStyle = c; const faible = peuVisible(c, SIM_AFF.fond);
    g.shadowColor = faible ? liseré(SIM_AFF.fond) : 'transparent'; g.shadowBlur = faible ? 2 * dpr * px : 0;
  };
  fixerFil(SIM.fils[0] || '#000'); g.beginPath();
  for (let i = 0; i < fin; i++) {
    const [x, y, c] = SIM.pts[i];
    if (c === 'STITCH') {
      if (prec) {
        if (saut) sauts.push(prec[0], prec[1], X(x), Y(y));
        else { g.moveTo(prec[0], prec[1]); g.lineTo(X(x), Y(y)); }
      }
      prec = [X(x), Y(y)]; saut = false;
      if (SIM_AFF.npp || modePoints) trous.push(X(x), Y(y));
      continue;
    }
    if (c === 'COLOR_CHANGE') {
      g.stroke(); fil++; fixerFil(SIM.fils[fil] || '#000'); g.beginPath();
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
  g.stroke(); g.shadowColor = 'transparent'; g.shadowBlur = 0;      // le liseré ne vaut que pour le fil
  if (SIM_AFF.sauts && sauts.length) {
    g.save(); g.strokeStyle = 'rgba(90,90,100,.85)'; g.lineWidth = 1.2 * dpr * px; g.setLineDash([5 * dpr * px, 4 * dpr * px]);
    g.beginPath(); for (let j = 0; j < sauts.length; j += 4) { g.moveTo(sauts[j], sauts[j + 1]); g.lineTo(sauts[j + 2], sauts[j + 3]); }
    g.stroke(); g.restore();
  }
  if (trous.length) {                                  // pénétrations de l'aiguille
    g.fillStyle = 'rgba(0,0,0,.75)';
    const r = modePoints ? 1.8 * dpr * px : Math.max(SIM_PREF.npp * 10 * k / 2, 1.2 * dpr * px);
    for (let j = 0; j < trous.length; j += 2) { g.beginPath(); g.arc(trous[j], trous[j + 1], r, 0, 7); g.fill(); }
  }
  const montre = { jump: SIM_AFF.sauts, trim: SIM_AFF.coupes, stop: SIM_AFF.arrets, color_change: SIM_AFF.couleurs };
  const t = 20 * dpr * px;
  for (const [n, x, y] of marques) {
    if (!montre[n] || !ICONES[n].complete) continue;
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x + t * 0.6, y - t * 0.6, t * 0.62, 0, 7); g.fill();
    g.drawImage(ICONES[n], x + t * 0.1, y - t * 1.1, t, t);
  }
  if (SIM.mesure) {                                   // règle : trait, piqûres accrochées et distance en mm
    const { a, b } = SIM.mesure, xa = X(a.x), ya = Y(a.y), xb = X(b.x), yb = Y(b.y);
    g.save(); g.strokeStyle = '#2f80ed'; g.fillStyle = '#2f80ed'; g.lineWidth = 1.5 * dpr * px; g.setLineDash([]);
    g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.stroke();
    for (const [q, xq, yq] of [[a, xa, ya], [b, xb, yb]]) { g.beginPath(); g.arc(xq, yq, 4 * dpr * px, 0, 7); g.fillStyle = q.accroche ? '#2f80ed' : '#fff'; g.fill(); g.stroke(); }
    const t = `${(Math.hypot(b.x - a.x, b.y - a.y) / 10).toFixed(2).replace('.', ',')} mm`;
    g.font = `600 ${13 * dpr * px}px -apple-system, "Segoe UI", sans-serif`;
    const lw = g.measureText(t).width + 12 * dpr * px, mx = (xa + xb) / 2, my = (ya + yb) / 2 - 14 * dpr * px;
    g.fillStyle = '#2f80ed'; g.beginPath(); g.roundRect(mx - lw / 2, my - 11 * dpr * px, lw, 20 * dpr * px, 5 * dpr * px); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, mx, my - 1 * dpr * px); g.restore();
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
const VUES_SIMU = [['enpoints', 'vue_points', 'Vue en points : fil fin et chaque piqûre de l\'aiguille'], ['suivre', 'aiguille', 'Suivre l\'aiguille : la vue reste centrée sur elle'], ['cadre', 'cadre', 'Cadre de la brodeuse'], ['npp', 'npp', 'Pénétrations de l\'aiguille (O)'], ['sauts', 'jump', 'Sauts'], ['coupes', 'trim', 'Coupes'],
  ['arrets', 'stop', 'Arrêts'], ['couleurs', 'color_change', 'Changements de couleur'], ['mire', 'cursor', 'Mire sur l\'aiguille'],
  ['page', 'page', 'Afficher la page'], ['info', 'info', 'Informations sur le motif']];
// Point suivant / précédent : un clic = un point ; bouton maintenu = les points défilent en continu,
// de plus en plus vite, et s'arrêtent dès qu'on relâche
function maintenir(b, sens) {
  let minut = null, debut = 0;
  const pas = () => {
    const t = Date.now() - debut, n = t < 1500 ? 1 : t < 3500 ? 3 : 10;       // accélère si on reste appuyé
    allerA(SIM.i + sens * n);
    minut = setTimeout(pas, t < 400 ? 400 : 40);
  };
  const arreter = () => { clearTimeout(minut); minut = null; };
  b.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (_) {} clearTimeout(minut); debut = Date.now(); pas(); });
  b.addEventListener('pointerup', arreter); b.addEventListener('pointercancel', arreter); b.addEventListener('lostpointercapture', arreter);
}
function construireBarresSimu() {
  const c = $('#simuControles'); c.innerHTML = '';
  for (const [k, [titre, f]] of Object.entries(ACTIONS_SIMU)) {
    const b = document.createElement('button'); b.className = 'ico-btn'; b.dataset.action = k; b.title = titre;
    b.innerHTML = icone(k);
    if (k === 'forward_stitch' || k === 'backward_stitch') maintenir(b, k === 'forward_stitch' ? 1 : -1);
    else b.onclick = f;
    c.appendChild(b);
  }
  const v = $('#simuVues'); v.innerHTML = '';
  for (const [k, ic, titre] of VUES_SIMU) {
    if (k === 'suivre') {                              // Tout voir, juste avant Suivre l'aiguille
      const tout = document.createElement('button'); tout.className = 'ico-btn'; tout.title = 'Tout voir : recentrer le dessin (double-clic sur la vue)';
      tout.innerHTML = icone('voir_tout'); tout.onclick = () => { SIM_AFF.suivre = false; memoriser(); SIM.vue = { k: 1, x: 0, y: 0 }; construireBarresSimu(); dessinerSimulation(); };
      v.appendChild(tout);
    }
    const b = document.createElement('button'); b.className = 'ico-btn bascule' + (SIM_AFF[k] ? ' on' : ''); b.title = titre;
    b.innerHTML = icone(ic);
    b.onclick = () => {
      SIM_AFF[k] = !SIM_AFF[k]; b.classList.toggle('on', SIM_AFF[k]); memoriser();
      if (k === 'suivre' && SIM_AFF.suivre && SIM.vue.k < 2) SIM.vue.k = 4;     // suivre de près
      dessinerPiste(); rendreInfoSimu(); dessinerSimulation();
    };
    v.appendChild(b);
    if (k === 'suivre') {                              // la règle, juste après Suivre l'aiguille
      const r = document.createElement('button'); r.className = 'ico-btn bascule' + (SIM.regle ? ' on' : '');
      r.title = 'Règle : tirez d\'une piqûre à une autre pour mesurer en mm'; r.innerHTML = icone('mesure');
      r.onclick = () => { SIM.regle = !SIM.regle; SIM.mesure = null; r.classList.toggle('on', SIM.regle); $('#simuCanvas').classList.toggle('mesure', SIM.regle);
        message(SIM.regle ? 'Règle : tirez d\'une piqûre à une autre dans la simulation.' : ''); dessinerSimulation(); };
      v.appendChild(r);
    }
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
  if (p) p.innerHTML = icone(SIM.lecture ? 'pause' : 'play');
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
  // hauteur maximale : la place disponible, moins les commandes du simulateur (la poignée reste visible)
  const autres = [...$('#simu').children].filter((x) => x !== v).reduce((t, x) => t + x.getBoundingClientRect().height, 0);
  const hMax = Math.max(140, $('#v-points').clientHeight - autres - 16);
  const mv = (ev) => { h = Math.max(140, Math.min(hMax, h0 + ev.clientY - y0)); document.documentElement.style.setProperty('--hauteur-simu', h + 'px'); dessinerSimulation(); };
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
window.addEventListener('resize', () => tailleIcones($('#apercu > svg')));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && S.placer) { S.placer = null; modePlacement(); rendreProps(); message('Placement annulé.'); return; }
  if (e.key === 'Escape' && !/input|textarea|select/i.test(e.target.tagName) && !$('dialog[open]') && S.choix.size) { toutDeselectionner(); return; }
  if (S.vue !== 'points' || /input|textarea|select/i.test(e.target.tagName)) return;
  const touches = { p: 'play', P: 'play', r: 'restart', R: 'restart', ArrowUp: 'faster', ArrowDown: 'slower', '+': 'forward_stitch',
    '=': 'forward_stitch', '-': 'backward_stitch', PageUp: 'forward_command', PageDown: 'backward_command' };
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { SIM.sens = e.key === 'ArrowLeft' ? -1 : 1; majBoutonsSimu(); e.preventDefault(); return; }
  if (e.key === 'o' || e.key === 'O') { SIM_AFF.npp = !SIM_AFF.npp; memoriser(); construireBarresSimu(); dessinerSimulation(); return; }
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
  if (SIM.regle && e.button === 0 && SIM.pts && SIM.repere) { mesurerSimulation(e); return; }
  const dpr = window.devicePixelRatio || 1, x0 = SIM.vue.x, y0 = SIM.vue.y;
  const mv = (ev) => { SIM.vue.x = x0 + (ev.clientX - e.clientX) * dpr; SIM.vue.y = y0 + (ev.clientY - e.clientY) * dpr; dessinerSimulation(); };
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
});
// règle de la simulation : points en 0,1 mm, accrochée à la piqûre la plus proche parmi celles déjà brodées
function mesurerSimulation(e) {
  const cv = $('#simuCanvas'), dpr = window.devicePixelRatio || 1, { k, ox, oy } = SIM.repere;
  const fin = Math.min(SIM.i, SIM.pts.length);
  const ver = (ev) => {
    const r = cv.getBoundingClientRect();
    const ux = ((ev.clientX - r.left) * dpr - SIM.vue.x) / SIM.vue.k, uy = ((ev.clientY - r.top) * dpr - SIM.vue.y) / SIM.vue.k;
    const x = (ux - ox) / k, y = (uy - oy) / k, seuil = 10 * dpr / (SIM.vue.k * k);
    let best = null, d2 = seuil * seuil;
    for (let i = 0; i < fin; i++) { const p = SIM.pts[i]; if (p[2] !== 'STITCH') continue; const d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < d2) { d2 = d; best = p; } }
    return best ? { x: best[0], y: best[1], accroche: true } : { x, y, accroche: false };
  };
  const a = ver(e);
  SIM.mesure = { a, b: a }; dessinerSimulation();
  const mv = (ev) => { SIM.mesure = { a, b: ver(ev) }; dessinerSimulation(); };
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
    const { b } = SIM.mesure; message(`Mesure : ${(Math.hypot(b.x - a.x, b.y - a.y) / 10).toFixed(2).replace('.', ',')} mm` + (a.accroche && b.accroche ? ' (d\'une piqûre à l\'autre)' : '')); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
}
$('#simuCanvas').addEventListener('dblclick', () => { SIM_AFF.suivre = false; memoriser(); SIM.vue = { k: 1, x: 0, y: 0 }; construireBarresSimu(); dessinerSimulation(); });

// ---------------------------------------------------------------- texte brodé (sans fenêtre Ink/Stitch)
// Aperçu avant d'ajouter : Ink/Stitch fabrique le texte sur un dessin vide (≈ 10 s, il recharge la police)
function lireTexte() {
  if (!$('#txTexte')) return;
  TX.texte = $('#txTexte').value;
  TX.lettres = +$('#txLet').value || 0; TX.mots = +$('#txMot').value || 0; TX.lignes = +$('#txLig').value || 0;
  TX.coupes = $('#txCoupe').value; TX.tri = $('#txTri').value; TX.symboles = $('#txSym').checked;
}
function requeteTexte() {
  return { params: { text: TX.texte, font: TX.police, scale: TX.echelle, 'text-align': TX.align, letter_spacing: TX.lettres,
    word_spacing: TX.mots, line_height: TX.lignes, trim: TX.coupes, 'color-sort': TX.tri, 'use-command-symbols': TX.symboles },
  arc: TX.trace ? { chemin: TX.trace, position: TX.position } : { courbure: TX.courbure } };
}
const cleTexte = () => JSON.stringify([requeteTexte(), MODE]);
let minuterieTexte = null, texteDemande = 0;
function apercuTexteBientot() { clearTimeout(minuterieTexte); minuterieTexte = setTimeout(apercuTexte, 1000); }
async function apercuTexte() {
  if (!S.texte || !TX.texte.trim()) return;
  const n = ++texteDemande, cle = cleTexte();
  const a = $('#apercu');
  $$('.calcul', a).forEach((x) => x.remove());
  const badge = document.createElement('div'); badge.className = 'calcul'; a.appendChild(badge);
  const t0 = Date.now();
  const tic = setInterval(() => { badge.textContent = `Aperçu du texte · Ink/Stitch calcule… ${Math.round((Date.now() - t0) / 1000)} s`; }, 250);
  try {
    const r = await api('apercu_texte', { ...requeteTexte(), mode: MODE });
    if (n !== texteDemande || !S.texte) return;                   // un aperçu plus récent est en route
    a.className = ''; a.innerHTML = r.svg; a.style.background = TISSU;
    const svg = $('svg', a);
    svg.removeAttribute('width'); svg.removeAttribute('height');
    const g = [...svg.children].find((x) => x.tagName === 'g');
    if (g) {                                                       // cadrer sur le texte
      const b = g.getBBox(), m = svg.getCTM().inverse().multiply(g.getCTM());
      const p0 = new DOMPoint(b.x, b.y).matrixTransform(m), p1 = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(m);
      const marge = Math.max(p1.x - p0.x, p1.y - p0.y) * 0.08;
      vb0 = [p0.x - marge, p0.y - marge, p1.x - p0.x + 2 * marge, p1.y - p0.y + 2 * marge]; vb = vb0.slice();
    }
    if (MODE !== 'points') habiller(svg, vb); else pointsAiguille(svg);
    appliquerVue();
    a.appendChild(barreRendu());
    const et = document.createElement('div'); et.className = 'etiquette-texte'; et.textContent = 'Aperçu du texte (pas encore dans le dessin)';
    a.appendChild(et);
    TX.dims = r; S.texteVu = cle;
    rendreInfoTexte();
  } catch (e) { if (n === texteDemande) message(e.message, true); } finally { clearInterval(tic); badge.remove(); }
}
function rendreInfoTexte() {
  const d = $('#txInfo'); if (!d) return;
  const r = TX.dims;
  if (!r) { d.innerHTML = '<span class="muted">L’aperçu apparaît à gauche quelques secondes après chaque changement.</span>'; return; }
  const lignes = Math.max(1, TX.texte.split('\n').length);
  const pol = (S.polices || []).find((p) => p.nom === TX.police) || {};
  const alertes = [];
  const hLigne = r.hauteur / lignes;
  if (TX.courbure === 0 && !TX.trace && hLigne < 5) alertes.push(`Lettres d’environ ${hLigne.toFixed(1)} mm : trop petit pour la plupart des polices ; agrandissez ou choisissez une police « small » / « tiny ».`);
  if (pol.min && (TX.echelle < pol.min * 100 - 0.5 || TX.echelle > pol.max * 100 + 0.5)) alertes.push(`Ink/Stitch limite cette police à ${Math.round(pol.min * 100)} – ${Math.round(pol.max * 100)} % : pour plus petit ou plus grand, choisissez une autre police (ex. version « small »).`);
  const c = (S.cadres || [])[+(localStorage.getItem('broderie.cadreN') || 0)];
  if (c && (r.largeur > c.largeur || r.hauteur > c.hauteur)) alertes.push(`Plus grand que le cadre ${c.largeur} × ${c.hauteur} mm.`);
  d.innerHTML = `<div class="dims-texte"><b>${r.largeur} × ${r.hauteur} mm</b> · ${r.points.toLocaleString('fr')} points</div>`
    + (alertes.length ? alertes.map((x) => `<div class="alerte">⚠ ${esc(x)}</div>`).join('') : '<div class="ok-texte">✓ Taille adaptée</div>');
}

const TX = { texte: 'Bonjour', police: null, echelle: 100, align: 'left', pour: null, courbure: 0, trace: null, position: 'center',
  lettres: 0, mots: 0, lignes: 0, coupes: 'off', tri: 'off', symboles: false };
async function rendreTexte() {
  const div = $('#texte');
  if (!S.polices) {
    div.innerHTML = '<p class="muted">Chargement des polices…</p>';
    try { S.polices = (await api('polices')).polices; } catch (e) { div.innerHTML = `<p>${esc(e.message)}</p>`; return; }
  }
  const o = S.etat.objets.find((x) => x.id === S.sel);
  const existant = o && typePrincipal(o) === 'lettrage' ? o : null;
  if (existant && TX.pour !== existant.id) chargerTexteDe(existant);
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
    <div class="bloc"><h2>Forme</h2><div id="txForme"></div>
      <div class="reglage" id="txCourbeBloc"><div class="haut"><label>Courbure</label><span class="val"><input type="number" id="txCourbeN" min="5" max="100" step="5" value="${Math.abs(TX.courbure) || 40}"><span class="unite">%</span></span></div>
      <input type="range" id="txCourbe" min="5" max="100" step="5" value="${Math.abs(TX.courbure) || 40}"><span class="muted small">100 % : presque un cercle complet (écussons)</span></div>
      <div id="txTraceBloc"><div class="reglage"><div class="haut"><label>Courbe à suivre</label></div><select id="txTraceSel"></select></div>
      <div class="reglage"><div class="haut"><label>Placement sur la courbe</label></div><div class="outils" id="txPos"></div></div>
      <p class="muted small">Dessinez la courbe dans Inkscape (outil Bézier, Spirale, cercle…), synchronisez, puis choisissez-la ici. Elle doit être plus longue que le texte. Une fois le texte ajouté, la courbe est retirée de la broderie (œil fermé).</p></div></div>
    <div id="txInfo" class="small"></div>
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
  $('#txFermer').onclick = () => { S.texte = false; S.texteVu = null; rendreTout(); apercu(); };
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
  // Ink/Stitch ramène de toute façon la taille dans la plage de la police : la case fait de même
  $('#txEchN').onchange = (e) => { TX.echelle = Math.max(mi, Math.min(ma, +e.target.value || 100)); e.target.value = TX.echelle; $('#txEch').value = TX.echelle; };
  for (const [k, lib] of [['left', 'Gauche'], ['center', 'Centre'], ['right', 'Droite']]) {
    const b = document.createElement('button'); b.textContent = lib; if (TX.align === k) b.className = 'principal';
    b.onclick = () => { TX.align = k; TX.texte = $('#txTexte').value; rendreTexte(); };
    $('#txAlign').appendChild(b);
  }
  // forme : droit, arc vers le haut (arc-en-ciel), arc vers le bas (sourire)
  // ou sur une courbe dessinée dans Inkscape (spline, spirale, cercle…), avec « Lettrage le long d'un chemin »
  const courbes = S.etat.objets.filter((x) => typePrincipal(x) !== 'lettrage');
  if (TX.trace && !courbes.some((x) => x.id === TX.trace)) TX.trace = null;
  const forme = TX.trace ? 'trace' : TX.courbure > 0 ? 'haut' : TX.courbure < 0 ? 'bas' : 'droit';
  $('#txForme').appendChild(tuiles([['droit', 'Droit', 'texte_droit'], ['haut', 'Arc vers le haut', 'texte_haut'], ['bas', 'Arc vers le bas', 'texte_bas'],
    ['trace', 'Sur une courbe', 'texte_trace']], forme, (k) => {
    if (k === 'trace') {
      if (!courbes.length) { message('Dessinez d’abord une courbe dans Inkscape, puis synchronisez.', true); return; }
      TX.trace = TX.trace || (courbes.find((x) => x.types.includes('stroke')) || courbes[0]).id;
    } else {
      const c = Math.abs(TX.courbure) || +$('#txCourbe').value || 40;
      TX.trace = null; TX.courbure = k === 'droit' ? 0 : k === 'haut' ? c : -c;
    }
    lireTexte(); rendreTexte(); apercuTexteBientot();
  }));
  $('#txCourbeBloc').hidden = forme === 'droit' || forme === 'trace';
  $('#txTraceBloc').hidden = forme !== 'trace';
  $('#txTraceSel').innerHTML = courbes.map((x) => `<option value="${esc(x.id)}" ${x.id === TX.trace ? 'selected' : ''}>${esc(x.nom)}${x.calque_nom ? ' · ' + esc(x.calque_nom) : ''}</option>`).join('');
  $('#txTraceSel').onchange = (e) => { TX.trace = e.target.value; apercuTexteBientot(); };
  for (const [k, lib] of [['left', 'Au début'], ['center', 'Au centre'], ['stretch', 'Sur toute la courbe']]) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = lib; if (TX.position === k) b.className = 'principal';
    b.onclick = () => { TX.position = k; lireTexte(); rendreTexte(); apercuTexteBientot(); };
    $('#txPos').appendChild(b);
  }
  const courbe = (v) => { TX.courbure = Math.sign(TX.courbure || 1) * Math.max(5, Math.min(100, +v)); $('#txCourbe').value = $('#txCourbeN').value = Math.abs(TX.courbure); apercuTexteBientot(); };
  $('#txCourbe').oninput = (e) => { $('#txCourbeN').value = e.target.value; };
  $('#txCourbe').onchange = (e) => courbe(e.target.value);
  $('#txCourbeN').onchange = (e) => courbe(e.target.value);
  // tout changement relance l'aperçu du texte
  for (const id of ['#txTexte', '#txLet', '#txMot', '#txLig', '#txCoupe', '#txTri']) $(id).addEventListener('input', () => { lireTexte(); apercuTexteBientot(); });
  $('#txEch').addEventListener('change', apercuTexteBientot); $('#txEchN').addEventListener('change', apercuTexteBientot);
  rendreInfoTexte();
  if (!S.texteVu || S.texteVu !== cleTexte()) apercuTexteBientot();
  $('#txOk').onclick = async () => {
    TX.texte = $('#txTexte').value;
    if (!TX.texte.trim()) { message('Écrivez un texte.', true); return; }
    try {
      lireTexte();
      const r = await api('lettrage', { remplacer: existant ? existant.id : null, ...requeteTexte() }, 'Création du texte brodé (environ 10 secondes)…');
      S.etat = await api('etat'); S.sel = r.id || S.sel; TX.pour = null; S.texte = false; S.texteVu = null;
      rendreTout(); apercuBientot();
      message('Texte prêt. Appuyez sur « Synchroniser » (ou ⌘⌥B dans Inkscape) pour l\'ajouter au dessin.');
    } catch (e) { message(e.message, true); }
  };
}

// ---------------------------------------------------------------- toutes les commandes Ink/Stitch (rarement utiles)
const cmdPar = (ext) => (S.etat.commandes || []).find((c) => c.extension === ext);
async function commande(ext, params = {}, ids = null) {
  const c = cmdPar(ext);
  if (ext === 'fill_to_satin') {          // sans traverse, Ink/Stitch ouvre une fenêtre d'erreur (en anglais)
    const objs = (ids || S.etat.selection || []).map((i) => S.etat.objets.find((o) => o.id === i)).filter(Boolean);
    if (!objs.some((o) => o.types.includes('fill_stitch')) || !objs.some((o) => o.types.includes('stroke') && !o.types.includes('fill_stitch'))) {
      message('Remplissage en satin : choisissez la forme remplie ET ses traverses (petits traits qui la coupent d\'un bord à l\'autre, ⌘-clic dans la liste).', true);
      return;
    }
  }
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
function formCommande(c, ids = null) {     // ids : objets choisis dans le panneau (sinon la sélection d'Inkscape)
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
  b.onclick = () => { $('#dlgCmd').close(); commande(c.extension, vals, ids); };
  f.appendChild(b);
}

// ---------------------------------------------------------------- démarrage
$('#bExport').onclick = () => {
  const f = $('#fFormat').value;
  location.href = `/export?format=${encodeURIComponent(f)}&ids=${encodeURIComponent((S.etat.selection || []).join(','))}`;
  message(`Fichier ${f.toUpperCase()} enregistré dans Téléchargements.`);
};
function rendreBoutonLarge() { $('#bLarge').classList.toggle('on', window.innerWidth >= 760); }
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
    setTimeout(() => { b.disabled = false; rendreAttente(); }, 1500);
  }
};
$('#bFichePdf').onclick = () => commande('print');
// ouvrir un fichier de broderie (.pes, .dst…) : converti par Ink/Stitch et ouvert dans Inkscape
$('#bOuvrirMachine').onclick = async () => {
  try {
    const c = await api('choisir', { mode: 'file' }, 'Choisissez le fichier de broderie.');
    if (!c.chemin) return;
    const r = await api('ouvrir_machine', { chemin: c.chemin }, 'Ink/Stitch lit le fichier…');
    const i = r.infos || {};
    message(`${r.ouvert ? 'Ouvert dans Inkscape' : 'Enregistré'} : ${r.svg.split(/[\\/]/).pop()} · ${(i.points || 0).toLocaleString('fr')} points, `
      + `${i.fils || 0} fil(s), ${i.largeur || 0} × ${i.hauteur || 0} mm. Dans Inkscape, appuyez sur ⌘⌥B pour l'avoir dans le panneau.`);
  } catch (e) { message(e.message, true); }
};
// Fiche machine en français : à imprimer ou à enregistrer en PDF (Fichier › Imprimer › PDF).
// Fils dans l'ordre de couture avec leur bobine, longueur de fil par couleur (somme des points), cadre, bâti, durée.
$('#bFiche').onclick = async () => {
  const w = window.open('', '_blank');                  // ouverte tout de suite : sinon Safari la bloque
  if (!w) { message('Autorisez les fenêtres surgissantes pour 127.0.0.1 dans Safari.', true); return; }
  w.document.write('<p style="font:15px -apple-system,sans-serif;padding:30px">Préparation de la fiche…</p>');
  try {
    const d = await donneesPoints(), st = calculerStats(d);
    if (!BOB.donnees) BOB.donnees = await api('bobines', { marque: BOB.marque, choix: BOB.choix });
    const ap = await api('apercu', { ids: S.etat.selection, mode: 'points', options: { sauts: false, penetrations: false } });
    // longueur de fil par couleur : somme des points brodés (fil du dessus, sans les sauts)
    const fils = d.fils.map((c) => ({ couleur: c, mm: 0, points: 0 }));
    let f = 0, prec = null;
    for (const [x, y, c] of d.points) {
      if (c === 'COLOR_CHANGE') { f = Math.min(f + 1, fils.length - 1); prec = null; continue; }
      if (c !== 'STITCH') { prec = null; continue; }
      if (prec) fils[f].mm += Math.hypot(x - prec[0], y - prec[1]) / 10;
      fils[f].points++; prec = [x, y];
    }
    const bob = (c) => (BOB.donnees.fils || []).find((x) => x.couleur === String(c).toLowerCase()) || {};
    const longueur = (mm) => { const m = mm * 1.15 / 1000; return m < 1 ? `${Math.max(1, Math.round(m * 100))} cm` : `${m.toFixed(1).replace('.', ',')} m`; };
    const c = cadreChoisi(), bati = S.etat.bati, duree = st.min < 1 ? '< 1 min' : Math.round(st.min) + ' min';
    const lignes = fils.map((x, i) => {
      const b = bob(x.couleur);
      return `<tr><td class="n">${i + 1}</td><td><span class="pa" style="background:${esc(x.couleur)}"></span></td>
        <td><b>${b.bobine ? esc(`${BOB.donnees.marque} ${b.bobine.numero}`) : '—'}</b>${b.bobine ? ' · ' + esc(b.bobine.nom) : ''}<br><span class="m">${esc((b.objets || []).join(', '))}</span></td>
        <td class="d">${x.points.toLocaleString('fr')}</td><td class="d">≈ ${longueur(x.mm)}</td></tr>`;
    }).join('');
    const svg = (ap.svg || '').replace(/<svg /, '<svg style="width:100%;height:100%" ');
    w.document.open();
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Fiche – ${esc(S.etat.nom || 'dessin')}</title><style>
      body{font:13px -apple-system,"Segoe UI",sans-serif;color:#222;margin:28px} h1{font-size:22px;margin:0 0 2px} .m{color:#777;font-size:11.5px}
      .haut{display:flex;gap:24px;margin:18px 0} .img{width:300px;height:300px;border:1px solid #ddd;border-radius:8px;padding:8px;flex:none}
      .infos div{margin:5px 0} .infos b{display:inline-block;min-width:150px;color:#555;font-weight:500}
      table{width:100%;border-collapse:collapse;margin-top:6px} td,th{padding:6px 8px;border-bottom:1px solid #eee;text-align:left;vertical-align:top}
      th{font-size:11px;text-transform:uppercase;color:#777} .n{width:22px;color:#777} .d{text-align:right;white-space:nowrap}
      .pa{display:inline-block;width:22px;height:22px;border-radius:5px;border:1px solid #bbb} .imp{margin-top:18px}
      @media print{.imp{display:none} body{margin:12mm}}</style></head><body>
      <h1>${esc(S.etat.nom || 'Dessin')}</h1><div class="m">Fiche machine · Broderie ${esc(S.etat.version_panneau || '')} · ${new Date().toLocaleDateString('fr')}</div>
      <div class="haut"><div class="img">${svg}</div><div class="infos">
        <div><b>Dimensions</b>${st.larg.toFixed(1)} × ${st.haut.toFixed(1)} mm</div>
        <div><b>Points</b>${st.n.toLocaleString('fr')}</div><div><b>Durée estimée</b>${duree}</div>
        <div><b>Fils</b>${fils.length} · ${st.coupes} coupe(s)</div>
        <div><b>Cadre</b>${c ? `${esc(c.nom)} (${c.largeur} × ${c.hauteur} mm)` : '—'}</div>
        <div><b>Bâti</b>${bati ? `oui, à ${bati.ecart} mm du motif, brodé en premier` : 'non'}</div>
        <div><b>Fil total</b>≈ ${longueur(fils.reduce((t, x) => t + x.mm, 0))}</div></div></div>
      <h2 style="font-size:15px">Fils dans l'ordre de couture</h2>
      <table><tr><th></th><th></th><th>Bobine · objets</th><th class="d">Points</th><th class="d">Fil (dessus)</th></tr>${lignes}</table>
      <p class="m">Longueur de fil estimée : longueur des points + 15 % (tension et piqûres). Prévoyez de la marge.</p>
      <button class="imp" onclick="print()">Imprimer ou enregistrer en PDF</button></body></html>`);
    w.document.close();
  } catch (e) { w.document.body.textContent = 'Fiche impossible : ' + e.message; }
};
$('#bPlus').onclick = () => { rendreCommandes(); $('#dlgCmd').showModal(); $('#cmdRecherche').focus(); };
$('#cmdRecherche').oninput = rendreCommandes;
$('#bAbandonner').onclick = async () => { S.etat = await api('abandonner'); rendreTout(); apercuBientot(); message('Modifications annulées.'); };

async function surveiller() {
  try {
    const r = await api('present');
    // panneau mis à jour pendant que la page était ouverte : on recharge, sinon l'ancien affichage côtoie le nouveau programme
    if (r.panneau && S.etat && S.etat.version_panneau && r.panneau !== S.etat.version_panneau) { location.reload(); return; }
    if (S.tache && r.tache && r.tache.fini && r.tache.extension === S.tache.extension) await tacheFinie(r.tache);
    else if (S.etat && r.version !== S.etat.version) { S.etat = await api('etat'); rendreTout(); apercuBientot(); }
  } catch (e) { $('#attenteInfo').textContent = 'Panneau arrêté : appuyez sur ⌘⌥B dans Inkscape.'; }
}
setInterval(surveiller, 2000);

// Hors macOS, les touches s'appellent autrement : ⌘⌥B devient Ctrl+Alt+B, ⌘-clic devient Ctrl-clic…
// (les textes du panneau et les messages du serveur sont écrits pour le Mac, on les traduit à l'affichage)
function adapterTouches(raccourci) {
  const conv = (t) => t.replace(/⌘⌥B/g, raccourci).replace(/Cmd\+Option\+B/g, raccourci).replace(/⌘-clic/g, 'Ctrl-clic').replace(/⇧-clic/g, 'Maj-clic')
    .replace(/⌘K/g, 'Ctrl+K').replace(/Cmd\+Z/g, 'Ctrl+Z');
  const passer = (racine) => {
    const w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (/⌘|⇧-clic|Cmd\+/.test(n.nodeValue)) n.nodeValue = conv(n.nodeValue);
    if (racine.querySelectorAll) for (const e of [racine, ...racine.querySelectorAll('[title]')]) {
      const t = e.getAttribute && e.getAttribute('title'); if (t && /⌘|Cmd\+/.test(t)) e.setAttribute('title', conv(t));
    }
  };
  passer(document.body);
  new MutationObserver((ms) => ms.forEach((m) => { m.addedNodes.forEach((n) => passer(n.nodeType === 1 ? n : n.parentNode || document.body));
    if (m.type === 'characterData' && /⌘|Cmd\+/.test(m.target.nodeValue)) m.target.nodeValue = conv(m.target.nodeValue); }))
    .observe(document.body, { childList: true, subtree: true, characterData: true });
}

(async () => {
  try {
    [S.etat, S.schema] = await Promise.all([api('etat'), api('schema')]);
  } catch (e) { message('Impossible de joindre le panneau : ' + e.message, true); return; }
  $('.titre').insertAdjacentHTML('beforeend', `<span class="version-appli" title="Version du panneau">v${esc(S.etat.version_panneau || '')}</span>`);
  if (S.etat.mac === false) adapterTouches(S.etat.raccourci);
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
  if (h === 'apercu' || (h === 'points' && arg)) S.simMode = arg === 'points' ? 'animation' : MODES_SIMU.includes(arg) ? arg : 'realiste';   // ancien onglet Aperçu
  if (h === 'texte') { changerVue('objets'); S.texte = true; rendreTout(); }
  else changerVue(h === 'apercu' ? 'points' : ['points', 'export'].includes(h) ? h : 'objets');
})();
