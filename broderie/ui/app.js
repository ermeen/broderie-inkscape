// Panneau de broderie : interface. Toutes les modifications passent par le serveur local,
// qui écrit les attributs inkstitch:* dans le dessin ; les points sont calculés par Ink/Stitch.
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const S = { etat: null, schema: null, sel: null, avance: false, cmd: null };
const NOMS_TYPES = { fill_stitch: 'Remplissage', satin_column: 'Satin', stroke: 'Contour', clone: 'Clone', lettrage: 'Lettrage' };
try { S.avance = localStorage.getItem('broderie.avance') === '1'; } catch (e) { /* stockage indisponible */ }

async function api(nom, data = {}, attente = false) {
  if (attente) { $('#attente').hidden = false; $('#attenteMsg').textContent = attente === true ? '' : attente; }
  try {
    const r = await fetch('/api/' + nom, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.erreur || r.statusText);
    return j;
  } finally { if (attente) $('#attente').hidden = true; }
}

function message(t, erreur = false) {
  const j = $('#journal');
  j.textContent = t; j.style.color = erreur ? 'var(--accent)' : '';
}

// ---------------------------------------------------------------- objets, ordre, couleurs
function rendreListe() {
  const ul = $('#liste'); ul.innerHTML = '';
  for (const o of S.etat.objets) {
    const li = document.createElement('li');
    li.className = o.id === S.sel ? 'on' : '';
    li.dataset.id = o.id;
    li.innerHTML = `<span class="pastille" style="background:${esc(o.couleur)}"></span>
      <span class="nom" title="${esc(o.id)}">${esc(o.nom)}<br><span class="badge">${o.types.map((t) => NOMS_TYPES[t] || t).join(' + ')}</span></span>
      <button class="fl" data-sens="-1" title="Coudre plus tôt">▲</button><button class="fl" data-sens="1" title="Coudre plus tard">▼</button>`;
    li.onclick = async (e) => {
      const b = e.target.closest('[data-sens]');
      if (b) { e.stopPropagation(); S.etat = await api('ordre', { id: o.id, sens: +b.dataset.sens }); rendreTout(); return; }
      S.sel = o.id; rendreTout();
    };
    ul.appendChild(li);
  }
  if (!S.etat.objets.length) ul.innerHTML = '<li class="muted">Aucun objet brodable.<br>Dessinez d\'abord une forme dans Inkscape (rectangle, tracé…), sélectionnez-la, puis rouvrez le panneau. Cliquez « Annuler » en bas à droite pour revenir à Inkscape.</li>';
  const cs = new Map();
  for (const o of S.etat.objets) for (const [k, q] of [['fill', o.remplissage], ['stroke', o.contour]]) {
    if (q && q !== 'none' && /^#[0-9a-f]{3,8}$/i.test(q) && (k === 'fill' ? o.types.includes('fill_stitch') : true)) {
      const c = q.toLowerCase(); if (!cs.has(c)) cs.set(c, []); cs.get(c).push([o.id, k]);
    }
  }
  const div = $('#couleurs'); div.innerHTML = '';
  for (const [c, cibles] of cs) {
    const l = document.createElement('label');
    l.innerHTML = `<input type="color" value="${c.length === 4 ? '#' + [...c.slice(1)].map((x) => x + x).join('') : c.slice(0, 7)}"> <span>${esc(c)}</span> <span class="muted small">${cibles.length} objet(s)</span>`;
    $('input', l).onchange = async (e) => {
      for (const [id, quoi] of cibles) S.etat = await api('couleur', { id, quoi, valeur: e.target.value });
      rendreTout();
    };
    div.appendChild(l);
  }
}

// ---------------------------------------------------------------- propriétés
function valeurParDefaut(p) {
  if (p.default === null || p.default === undefined || p.default === '') return null;
  if ((p.type === 'combo') && Array.isArray(p.options) && typeof p.default === 'number') return p.options[p.default];
  return p.default;
}
function valeur(o, p) { const v = o.valeurs[p.name]; return v === undefined ? valeurParDefaut(p) : v; }
function estVrai(v) { return ['yes', 'y', 'true', 't', '1'].includes(String(v).trim().toLowerCase()); }

function visible(o, p, params) {
  if (!p.select_items) return true;
  return p.select_items.some(([nom, val]) => {
    const q = params.find((x) => x.name === nom);
    if (!q) return S.avance;
    const v = valeur(o, q);
    return String(v) === String(val);
  });
}

function champ(o, p) {
  const d = document.createElement('div');
  const v = o.valeurs[p.name];
  const modifie = v !== undefined;
  const def = valeurParDefaut(p);
  const unite = p.unite ? `<span class="u">${esc(p.unite)}</span>` : '';
  const aide = esc(p.aide || '') + (p.aide ? '\n' : '') + `inkstitch:${p.name}`;
  let w;
  if (p.type === 'boolean' || p.type === 'toggle') {
    d.className = 'champ chk' + (modifie ? ' modifie' : '');
    let on = estVrai(v === undefined ? (def ?? (p.type === 'toggle' ? true : false)) : v);
    if (p.inverse) on = !on;
    d.innerHTML = `<label title="${aide}"><input type="checkbox" ${on ? 'checked' : ''}> ${esc(p.libelle)}</label><button class="raz" title="Valeur par défaut">↺</button>`;
    $('input', d).onchange = (e) => envoyer(o, p.name, p.inverse ? !e.target.checked : e.target.checked);
  } else {
    d.className = 'champ' + (modifie ? ' modifie' : '');
    if (Array.isArray(p.options) && (p.type === 'dropdown' || p.type === 'combo')) {
      const cur = v === undefined ? (p.type === 'dropdown' ? (def ?? 0) : (def ?? p.options[0])) : v;
      w = `<select>${p.options.map((op, i) => {
        const val = p.type === 'dropdown' ? i : op;
        return `<option value="${esc(val)}" ${String(val) === String(cur) ? 'selected' : ''}>${esc((p.options_libelles || [])[i] || op)}</option>`;
      }).join('')}</select>`;
    } else {
      w = `<input type="text" value="${esc(v ?? '')}" placeholder="${esc(def ?? 'auto')}">`;
    }
    d.innerHTML = `<label title="${aide}">${esc(p.libelle)}${unite}</label>${w}<button class="raz" title="Valeur par défaut">↺</button>`;
    const el = $('select, input', d);
    el.onchange = () => envoyer(o, p.name, el.value);
  }
  $('.raz', d).onclick = () => envoyer(o, p.name, null);
  return d;
}

async function envoyer(o, nom, val) {
  try {
    S.etat = await api('params', { id: o.id, valeurs: { [nom]: val } });
    rendreTout();
    $('#etat').textContent = 'Modifié : ' + nom + ' (non encore appliqué dans Inkscape)';
  } catch (e) { message(e.message, true); }
}

function section(o, typ, titre) {
  const sc = S.schema[typ]; if (!sc) return null;
  const sec = document.createElement('div'); sec.className = 'section';
  sec.innerHTML = `<h3>${esc(titre || sc.titre)}</h3>`;
  const params = sc.params.slice().sort((a, b) => (a.sort_index ?? 50) - (b.sort_index ?? 50));
  const groupes = new Map();
  for (const p of params) {
    if (p.name === 'satin_column' && typ !== 'clone') continue;   // géré par « Type de trait »
    if (!S.avance && !p.courant) continue;
    if (!visible(o, p, params)) continue;
    const g = p.groupe || '';
    if (!groupes.has(g)) groupes.set(g, []);
    groupes.get(g).push(p);
  }
  for (const [g, ps] of groupes) {
    let cible = sec;
    if (g) {
      cible = document.createElement('div'); cible.className = 'groupe';
      cible.innerHTML = `<h4>${esc(g)}</h4>`; sec.appendChild(cible);
      // les réglages d'une sous-couche n'apparaissent que si elle est activée (sauf en mode avancé)
      const bascule = ps.find((p) => p.type === 'toggle');
      const actif = bascule ? estVrai(valeur(o, bascule) ?? true) : true;
      if (bascule && !actif && !S.avance) { cible.appendChild(champ(o, bascule)); continue; }
    }
    for (const p of ps) cible.appendChild(champ(o, p));
  }
  return sec;
}

function rendreProps() {
  const div = $('#props'); div.innerHTML = '';
  const o = S.etat.objets.find((x) => x.id === S.sel);
  if (!o) { div.innerHTML = '<p class="muted">Sélectionnez un objet dans la liste.</p>'; return; }
  const ent = document.createElement('p');
  ent.className = 'muted small';
  ent.textContent = `${o.nom} · <${o.balise}>` + (o.balise === 'path' ? ` · ${o.sous_chemins} sous-chemin(s)` : '');
  div.appendChild(ent);
  if (o.types.includes('lettrage')) {
    const sec = document.createElement('div'); sec.className = 'section';
    sec.innerHTML = '<h3>Lettrage</h3><p class="muted small">Texte créé avec l\'outil Lettrage d\'Ink/Stitch.</p><button>Modifier le texte…</button>';
    $('button', sec).onclick = () => commande('lettering', {}, [o.id]);
    div.appendChild(sec);
  }
  if (o.contour && o.contour !== 'none') {
    const sec = document.createElement('div'); sec.className = 'section';
    const satin = o.types.includes('satin_column');
    sec.innerHTML = `<h3>Type de trait</h3><div class="champ"><label>Broder le trait comme</label>
      <select><option value="stroke" ${satin ? '' : 'selected'}>Point droit, ripple, zigzag…</option><option value="satin" ${satin ? 'selected' : ''}>Colonne satin</option></select><span></span></div>`
      + (satin && o.balise === 'path' && o.sous_chemins < 2 ? '<p class="muted small">Une colonne satin a besoin de deux rails (deux sous-chemins). Commande utile : « Convertir un trait en satin ».</p>' : '');
    $('select', sec).onchange = (e) => envoyer(o, 'satin_column', e.target.value === 'satin' ? true : null);
    div.appendChild(sec);
  }
  for (const t of o.types) if (t !== 'lettrage') { const s = section(o, t); if (s) div.appendChild(s); }
  const g = section(o, 'element'); if (g) div.appendChild(g);
}

function rendreTout() {
  if (S.sel && !S.etat.objets.some((o) => o.id === S.sel)) S.sel = null;
  if (!S.sel && S.etat.objets.length) S.sel = S.etat.objets[0].id;
  rendreListe(); rendreProps();
}

// ---------------------------------------------------------------- aperçu
let vue = { s: 1, x: 0, y: 0 };
async function apercu() {
  try {
    const r = await api('apercu', { ids: S.etat.selection }, 'Calcul des points');
    const a = $('#apercu');
    if (!r.svg) { a.className = 'vide'; a.textContent = r.erreur || 'Aucun point.'; message(r.erreur || '', true); return; }
    a.className = ''; a.innerHTML = r.svg; vue = { s: 1, x: 0, y: 0 }; appliquerVue();
    const n = (r.svg.match(/ d="/g) || []).length;
    message(`Points calculés par Ink/Stitch (${n} tracé(s)). Molette : zoom · glisser : déplacer.`);
  } catch (e) { message(e.message, true); }
}
function appliquerVue() { const s = $('#apercu svg'); if (s) s.style.transform = `translate(${vue.x}px,${vue.y}px) scale(${vue.s})`; }
$('#apercu').addEventListener('wheel', (e) => {
  if (!$('#apercu svg')) return; e.preventDefault();
  const r = e.currentTarget.getBoundingClientRect(); const k = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  const px = e.clientX - r.left, py = e.clientY - r.top;
  vue.x = px - (px - vue.x) * k; vue.y = py - (py - vue.y) * k; vue.s *= k; appliquerVue();
}, { passive: false });
$('#apercu').addEventListener('pointerdown', (e) => {
  if (!$('#apercu svg')) return;
  const x0 = e.clientX - vue.x, y0 = e.clientY - vue.y;
  const mv = (ev) => { vue.x = ev.clientX - x0; vue.y = ev.clientY - y0; appliquerVue(); };
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
});

// ---------------------------------------------------------------- commandes Ink/Stitch
async function commande(ext, params = {}, ids = null) {
  try {
    const r = await api('commande', { extension: ext, params, ids: ids || S.etat.selection }, 'Une fenêtre d\'Ink/Stitch peut s\'ouvrir : fermez-la pour revenir ici.');
    S.etat = await api('etat'); rendreTout();
    message(r.modifie ? `Commande « ${ext} » appliquée au dessin.` : (r.erreur || `Commande « ${ext} » terminée sans modification.`), !!r.erreur && !r.modifie);
  } catch (e) { message(e.message, true); }
}

function rendreCommandes() {
  const q = $('#cmdRecherche').value.trim().toLowerCase();
  const ul = $('#cmdListe'); ul.innerHTML = '';
  let menu = null;
  const cmds = S.etat.commandes.slice().sort((a, b) => (a.menu + a.nom).localeCompare(b.menu + b.nom));
  for (const c of cmds) {
    if (q && !(c.nom + ' ' + c.menu + ' ' + c.extension).toLowerCase().includes(q)) continue;
    if (c.menu !== menu) { menu = c.menu; const h = document.createElement('li'); h.className = 'menu'; h.textContent = (menu || 'Ink/Stitch').replace('Ink/Stitch/', '').replace('Ink/Stitch', 'Général'); ul.appendChild(h); }
    const li = document.createElement('li'); li.className = 'c' + (S.cmd === c ? ' on' : ''); li.textContent = c.nom;
    li.onclick = () => { S.cmd = c; rendreCommandes(); formCommande(c); };
    ul.appendChild(li);
  }
}

function formCommande(c) {
  const f = $('#cmdForm');
  f.innerHTML = `<h3>${esc(c.nom)}</h3><p class="muted small">${esc(c.menu)} · --extension=${esc(c.extension)}</p>`;
  const vals = {};
  for (const p of c.params) {
    if (!p.name || ['notebook', 'page'].includes(p.type) || p.type === null) continue;
    if (p.type === 'description' || p.type === 'label') continue;
    const d = document.createElement('div'); d.className = 'champ';
    const lib = esc(p.label || p.name);
    vals[p.name] = p.default;
    if (p.type === 'boolean') {
      d.className = 'champ chk';
      d.innerHTML = `<label><input type="checkbox" ${estVrai(p.default) ? 'checked' : ''}> ${lib}</label><span></span>`;
      $('input', d).onchange = (e) => { vals[p.name] = e.target.checked; };
      vals[p.name] = estVrai(p.default);
    } else if (p.options) {
      d.innerHTML = `<label>${lib}</label><select>${p.options.map((o) => `<option ${o === p.default ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select><span></span>`;
      if (!p.options.includes(p.default)) vals[p.name] = p.options[0];
      $('select', d).onchange = (e) => { vals[p.name] = e.target.value; };
    } else {
      d.innerHTML = `<label>${lib}</label><input type="text" value="${esc(p.default)}"><span></span>`;
      $('input', d).onchange = (e) => { vals[p.name] = e.target.value; };
    }
    f.appendChild(d);
  }
  const b = document.createElement('button'); b.type = 'button'; b.className = 'principal'; b.textContent = 'Exécuter';
  b.onclick = () => { $('#dlgCmd').close(); commande(c.extension, vals); };
  f.appendChild(b);
}

// ---------------------------------------------------------------- démarrage
$('#bApercu').onclick = apercu;
$('#bSimu').onclick = async () => { await api('simulateur', { ids: S.etat.selection }); message('Le simulateur d\'Ink/Stitch s\'ouvre dans une fenêtre séparée.'); };
$('#bLettrage').onclick = () => commande('lettering');
$('#bExport').onclick = () => {
  const f = $('#fFormat').value;
  location.href = `/export?format=${encodeURIComponent(f)}&ids=${encodeURIComponent((S.etat.selection || []).join(','))}`;
  message(`Export ${f.toUpperCase()} par Ink/Stitch : le fichier arrive dans Téléchargements.`);
};
$('#bCommandes').onclick = () => { rendreCommandes(); $('#dlgCmd').showModal(); $('#cmdRecherche').focus(); };
$('#cmdRecherche').oninput = rendreCommandes;
$('#avance').checked = S.avance;
$('#avance').onchange = (e) => { S.avance = e.target.checked; try { localStorage.setItem('broderie.avance', S.avance ? '1' : '0'); } catch (x) { /* rien */ } rendreProps(); };
$('#bAnnuler').onclick = async () => { await api('terminer', { appliquer: false }); document.body.innerHTML = '<p style="padding:30px">Fermé sans modifier le dessin. Vous pouvez fermer cet onglet et revenir à Inkscape.</p>'; };
$('#bAppliquer').onclick = async () => { await api('terminer', { appliquer: true }); document.body.innerHTML = '<p style="padding:30px">Réglages appliqués. Vous pouvez fermer cet onglet et revenir à Inkscape (Cmd+Z pour annuler).</p>'; };

// signe de vie : si cet onglet est fermé, l'extension rend la main à Inkscape (sans modification)
setInterval(() => { fetch('/api/present', { method: 'POST', body: '{}' }).catch(() => {}); }, 3000);
fetch('/api/present', { method: 'POST', body: '{}' }).catch(() => {});

(async () => {
  try {
    [S.etat, S.schema] = await Promise.all([api('etat'), api('schema')]);
  } catch (e) { message('Impossible de joindre l\'extension : ' + e.message, true); return; }
  const m = S.etat.moteur;
  $('#moteur').textContent = m.chemin ? `· Ink/Stitch ${m.version || ''}` : '· Ink/Stitch introuvable';
  $('#fFormat').innerHTML = S.etat.formats.map((f) => `<option value="${f}" ${f === 'dst' ? 'selected' : ''}>${f.toUpperCase()}</option>`).join('');
  $('#etat').textContent = S.etat.selection.length ? `${S.etat.selection.length} objet(s) sélectionné(s) dans Inkscape` : 'Aucune sélection : tout le dessin';
  rendreTout();
})();
