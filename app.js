'use strict';
const APP_VERSION = '0.1.0';
const FILES = ['vehicles', 'specs', 'parts', 'schedule', 'fuses', 'guides', 'faults', 'buying', 'sources'];
const D = {};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---- per-device storage (never required for the app to work) ----
const store = {
  get(k, d) { try { const v = localStorage.getItem('am.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('am.' + k, JSON.stringify(v)); } catch {} }
};
let car = store.get('car', null);
const model = () => D.vehicles.models.find(m => m.code === car) || null;

// ---- filtering by the chosen model ----
function applies(x) {
  const m = model();
  if (!m) return true;
  if (x.engine && !x.engine.includes(m.engine)) return false;
  if (x.drive && x.drive !== m.drive) return false;
  return true;
}
function fitTags(x) {
  if (model()) return '';
  const t = [];
  if (x.engine) t.push(x.engine.join(' / '));
  if (x.drive) t.push(x.drive);
  return t.map(s => `<span class="tag">${esc(s)}</span>`).join('');
}
const CONF = { official: 'Toyota manual', community: 'Owner-sourced', unverified: 'Unverified' };
function meta(x) {
  const src = (x.src || []).map(id => D.sources.find(s => s.id === id)).filter(Boolean)
    .map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.title)}">${esc(shortSrc(s))}</a>`).join(', ');
  return `<div class="meta">${x.conf ? `<span class="badge b-${esc(x.conf)}">${CONF[x.conf] || esc(x.conf)}</span>` : ''}${fitTags(x)}${src ? `<span class="src">${src}</span>` : ''}</div>`;
}
const shortSrc = s => s.id.startsWith('om-') ? 'Owner\'s manual ' + s.id.slice(3, 7) : s.title.split(' – ')[0];
const kmToMi = km => Math.round(km * 0.621371 / 500) * 500;
const fmtInt = n => Number(n).toLocaleString('en-GB');

// ---- views ----
const views = {
  home() {
    const m = model();
    return `<h1>${m ? esc(m.code) + ' · ' + esc(m.label) : '20-series Alphard & Vellfire'}</h1>
    <p class="lead">${esc(D.vehicles.generation.built)}. ${esc(D.vehicles.generation.note)}</p>
    ${m ? '' : `<div class="warn">Pick your model (top right) so everything shows only what applies to your car.</div>`}
    <div class="card"><h3>Decode a frame or model number</h3>
      <p class="note">Enter the chassis number from the V5C, auction sheet or the plate under the bonnet, e.g. <code>ANH20-8123456</code> or <code>DBA-ANH25W</code>.</p>
      <input id="frame" placeholder="ANH20-…" autocapitalize="characters" spellcheck="false"><div id="decoded" class="decoded"></div></div>
    <div class="grid">
      ${tile('#/specs', 'Specs & fluids', 'Oil, coolant, CVT, tyres, bulbs')}
      ${tile('#/service', 'Service schedule', 'What\'s due and when')}
      ${tile('#/parts', 'Part numbers', 'Filters, gaskets, suspension')}
      ${tile('#/fuses', 'Fuses', 'All 5 boxes, translated')}
      ${tile('#/guides', 'DIY guides', 'Step-by-step jobs')}
      ${tile('#/faults', 'Known faults', 'Symptoms → causes → fixes')}
      ${tile('#/buying', 'Buying an import', 'Checklist for a viewing')}
      ${tile('#/sources', 'Sources', 'Where every figure comes from')}
    </div>
    <p class="foot">Green = from Toyota's own manual · amber = owner/trade sources · red = unverified, double-check before relying on it. Not affiliated with Toyota. v${APP_VERSION}</p>`;
  },
  specs() {
    return `<h1>Specs & fluids</h1>` + D.specs.groups.map(g => {
      const items = g.items.map(it => {
        const rows = it.rows.filter(applies);
        if (!rows.length) return '';
        return `<div class="row"><div class="label">${esc(it.label)}</div>` + rows.map(r =>
          `<div class="val">${esc(r.value)}</div>${r.note ? `<div class="note">${esc(r.note)}</div>` : ''}${meta(r)}`).join('') + `</div>`;
      }).join('');
      return items ? `<h2 id="${esc(g.id)}">${esc(g.title)}</h2>${g.intro ? `<p class="note">${esc(g.intro)}</p>` : ''}<div class="card">${items}</div>` : '';
    }).join('');
  },
  parts() {
    const ps = D.parts.parts.filter(applies);
    return `<h1>Part numbers</h1><div class="warn">${esc(D.parts.intro)}</div><div class="card">` +
      ps.map(p => `<div class="row"><div class="label">${esc(p.item)}</div><div class="val"><code>${esc(p.number)}</code></div>${p.note ? `<div class="note">${esc(p.note)}</div>` : ''}${meta(p)}</div>`).join('') + `</div>`;
  },
  fuses() {
    return `<h1>Fuses</h1><p class="lead">${esc(D.fuses.intro)}</p>${meta({ src: D.fuses.src, conf: 'official' })}` +
      D.fuses.boxes.filter(applies).map(b => `<h2>${esc(b.name)}</h2><p class="note">${esc(b.where)}</p><div class="card"><table>
      <tr><th>#</th><th>Name</th><th>Amps</th><th>Circuit</th></tr>` +
      b.fuses.map(f => `<tr><td class="num">${f[0]}</td><td>${esc(f[1])}</td><td class="num">${esc(f[2])} A</td><td>${esc(f[3])}</td></tr>`).join('') + `</table></div>`).join('');
  },
  guides(id) {
    if (id) {
      const g = D.guides.find(x => x.id === id);
      if (!g) return `<p>Guide not found. <a href="#/guides">All guides</a></p>`;
      return `<p><a href="#/guides">‹ All guides</a></p><h1>${esc(g.title)}</h1>${meta(g)}
        <p class="note">Difficulty ${'●'.repeat(g.difficulty)}${'○'.repeat(5 - g.difficulty)} · about ${esc(g.time)}</p>
        ${g.warnings?.length ? g.warnings.map(w => `<div class="warn">${esc(w)}</div>`).join('') : ''}
        <div class="card"><h3>Tools</h3><ul>${g.tools.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        ${g.parts.length ? `<h3>Parts</h3><ul>${g.parts.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}</div>
        <div class="card"><h3>Steps</h3><ol class="steps">${g.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>
        <p><a class="btn" href="#/mycar?task=${encodeURIComponent(guideTask(g.id))}">Log this job</a></p>`;
    }
    return `<h1>DIY guides</h1><p class="lead">Written from the owner's manual and owners' write-ups. Your safety is your responsibility: support the car properly, and if in doubt, use a garage.</p>` +
      D.guides.filter(applies).map(g => `<a class="tile" style="margin:10px 0" href="#/guides/${esc(g.id)}"><b>${esc(g.title)}</b><span>${'●'.repeat(g.difficulty)}${'○'.repeat(5 - g.difficulty)} · ${esc(g.time)}</span>${meta(g)}</a>`).join('');
  },
  faults() {
    return `<h1>Known faults</h1><p class="lead">What owners report on this generation. Each entry links its sources; red ones still need confirming.</p>` +
      D.faults.filter(applies).map(f => `<div class="card"><h3>${esc(f.title)}</h3><span class="tag">${esc(f.area)}</span>
      <p class="val"><b>Symptoms:</b> ${esc(f.symptoms)}</p><p class="val"><b>Likely cause:</b> ${esc(f.cause)}</p><p class="val"><b>Fix:</b> ${esc(f.fix)}</p>
      ${f.guide ? `<p><a href="#/guides/${esc(f.guide)}">Step-by-step guide ›</a></p>` : ''}${meta(f)}</div>`).join('');
  },
  buying() {
    const ticks = store.get('buyTicks', {});
    return `<h1>Buying an import</h1><p class="lead">Take this to a viewing. Ticks are saved on this device only.</p>${meta({ src: D.buying.src, conf: 'community' })}
      <p><button class="btn ghost small" data-act="clearTicks">Clear ticks</button></p>` +
      D.buying.sections.map((s, i) => `<h2>${esc(s.title)}</h2><div class="card"><ul class="check">` +
      s.items.map((t, j) => `<li><label style="color:inherit;font-size:1rem;margin:0"><input type="checkbox" data-tick="${i}.${j}" ${ticks[i + '.' + j] ? 'checked' : ''}>${esc(t)}</label></li>`).join('') + `</ul></div>`).join('');
  },
  service() {
    const m = model(), severe = store.get('severe', false), log = store.get('log', []), odo = store.get('odo', null);
    const items = D.schedule.items.filter(applies);
    return `<h1>Service schedule</h1><p class="lead">${esc(D.schedule.intro)}</p>
      <p><label style="display:inline;color:inherit"><input type="checkbox" data-act="severe" style="width:auto" ${severe ? 'checked' : ''}> Severe use (short trips, towing, heavy loads)</label></p>
      ${odo ? `<p class="note">Current mileage: ${fmtInt(odo)} mi (update it in My Car).</p>` : `<p class="note">Add your mileage and log jobs in <a href="#/mycar">My Car</a> to see what's due.</p>`}
      <div class="card">` +
      items.map(it => {
        const iv = (severe && it.severe) || it.normal, st = dueStatus(it, iv, log, odo);
        const every = [iv.km ? `${fmtInt(kmToMi(iv.km))} mi` : '', iv.months ? (iv.months % 12 ? `${iv.months} months` : `${iv.months / 12} year${iv.months > 12 ? 's' : ''}`) : ''].filter(Boolean).join(' or ');
        return `<div class="row"><div class="label">${esc(it.task)}</div><div class="val">Every ${esc(every)}</div>
          <div class="status s-${st.cls}">${esc(st.text)}</div>${it.note ? `<div class="note">${esc(it.note)}</div>` : ''}${meta(it)}
          <div class="meta"><a class="btn ghost small" href="#/mycar?task=${encodeURIComponent(it.task)}">Log done</a>${it.guide ? `<a class="btn ghost small" href="#/guides/${esc(it.guide)}">How-to</a>` : ''}</div></div>`;
      }).join('') + `</div>${m ? '' : '<p class="note">Showing every model. Choose yours to hide jobs that don\'t apply.</p>'}`;
  },
  mycar(_, params) {
    const log = store.get('log', []).slice().sort((a, b) => b.date.localeCompare(a.date)), odo = store.get('odo', '');
    const tasks = [...new Set(D.schedule.items.filter(applies).map(i => i.task))];
    const pre = params.get('task') || '';
    return `<h1>My Car</h1><p class="lead">Your service log stays on this device. Use Export to back it up or move it to another phone.</p>
      <div class="card"><label for="odo">Current mileage (miles)</label><div style="display:flex;gap:8px"><input id="odo" type="number" inputmode="numeric" value="${esc(odo)}"><button class="btn" data-act="saveOdo">Save</button></div></div>
      <div class="card"><h3>Log a job</h3><div class="form2">
        <div><label for="lTask">Job</label><input id="lTask" list="taskList" value="${esc(pre)}"><datalist id="taskList">${tasks.map(t => `<option value="${esc(t)}">`).join('')}</datalist></div>
        <div><label for="lDate">Date</label><input id="lDate" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
        <div><label for="lMiles">Mileage</label><input id="lMiles" type="number" inputmode="numeric" value="${esc(odo)}"></div>
        <div><label for="lCost">Cost (£, optional)</label><input id="lCost" type="number" inputmode="decimal" step="0.01"></div></div>
        <label for="lNotes">Notes (parts used, who did it)</label><textarea id="lNotes" rows="2"></textarea>
        <p><button class="btn" data-act="addLog">Add to log</button></p></div>
      <h2>History</h2>${log.length ? `<div class="card"><table><tr><th>Date</th><th>Job</th><th>Miles</th><th></th></tr>` +
        log.map(e => `<tr><td class="num">${esc(e.date)}</td><td>${esc(e.task)}${e.notes ? `<div class="note">${esc(e.notes)}</div>` : ''}${e.cost ? `<div class="note">£${esc(e.cost)}</div>` : ''}</td><td class="num">${e.miles ? fmtInt(e.miles) : ''}</td>
        <td><button class="btn ghost small" data-act="delLog" data-id="${esc(e.id)}" aria-label="Delete entry">✕</button></td></tr>`).join('') + `</table></div>` : '<p class="note">Nothing logged yet.</p>'}
      <p><button class="btn ghost" data-act="export">Export backup</button> <label class="btn ghost" style="display:inline-block;color:var(--accent);margin:0">Import backup<input id="imp" type="file" accept="application/json" hidden></label></p>`;
  },
  sources() {
    return `<h1>Sources</h1><p class="lead">Every figure in the app links to one of these. Toyota's official manuals win wherever they disagree with anything else.</p>` +
      D.sources.map(s => `<div class="card"><h3><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></h3><span class="tag">${esc(s.kind)}</span>${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}</div>`).join('') +
      `<p class="foot">Toyota Japan has online manuals only from April 2010. For an earlier car (May 2008 – Mar 2010), a paper manual from the glovebox is the best check.</p>`;
  }
};
const tile = (href, t, s) => `<a class="tile" href="${href}"><b>${t}</b><span>${s}</span></a>`;
const guideTask = id => (D.schedule.items.find(i => i.guide === id) || {}).task || (D.guides.find(g => g.id === id) || {}).title || '';

function dueStatus(it, iv, log, odo) {
  const last = log.filter(e => e.task === it.task).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!last) return { cls: 'none', text: 'Not logged' };
  const now = new Date(), parts = [];
  let cls = 'ok';
  if (iv.months) {
    const due = new Date(last.date); due.setMonth(due.getMonth() + iv.months);
    const days = Math.round((due - now) / 864e5);
    if (days < 0) cls = 'over'; else if (days < 31 && cls !== 'over') cls = 'soon';
    parts.push(due.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }));
  }
  if (iv.km && last.miles && odo) {
    const dueMi = Number(last.miles) + kmToMi(iv.km), left = dueMi - odo;
    if (left < 0) cls = 'over'; else if (left < 1000 && cls !== 'over') cls = 'soon';
    parts.push(fmtInt(dueMi) + ' mi');
  }
  return { cls, text: (cls === 'over' ? 'Overdue · ' : cls === 'soon' ? 'Due soon · ' : 'Due ') + parts.join(' or ') };
}

// ---- frame number decoder ----
function decode(raw) {
  const s = raw.toUpperCase().replace(/\s+/g, '');
  if (!s) return '';
  const mt = s.match(/^(DBA-|CBA-|DAA-)?([A-Z]{3}\d{2})W?(?:-?(\d{5,8}))?$/);
  if (!mt) return `<p class="note">That doesn't look like a frame number. They start with three letters and two digits, e.g. ANH20.</p>`;
  const m = D.vehicles.models.find(x => x.frame === mt[2]);
  if (!m) return `<p class="note"><b>${esc(mt[2])}</b> isn't a 20-series Alphard/Vellfire code. This app covers ANH20/25, GGH20/25 and ATH20.</p>`;
  const e = D.vehicles.engines[m.engine];
  return `<div class="row"><b>${esc(m.code)}</b>: ${esc(m.label)}</div>
    <div class="note">Engine ${esc(m.engine)}: ${esc(e.name)}. Gearbox: ${esc(m.trans)}. Fuel: ${esc(e.fuel)}.</div>
    ${mt[1] ? `<div class="note">${esc(mt[1])} prefix: ${esc(D.vehicles.prefixes[mt[1]])}.</div>` : ''}
    ${mt[3] ? `<div class="note">Serial ${esc(mt[3])}. Use the full frame number on parts catalogues to get exact-fit parts.</div>` : ''}
    <p>${car === m.code ? '<span class="badge b-official">This is your selected model</span>' : `<button class="btn small" data-act="setCar" data-code="${esc(m.code)}">Set as my model</button>`}</p>`;
}

// ---- search across everything ----
let index = [];
function buildIndex() {
  index = [];
  D.specs.groups.forEach(g => g.items.forEach(it => it.rows.forEach(r => applies(r) && index.push({ t: it.label, s: r.value, h: '#/specs' }))));
  D.parts.parts.filter(applies).forEach(p => index.push({ t: p.item, s: p.number, h: '#/parts' }));
  D.fuses.boxes.filter(applies).forEach(b => b.fuses.forEach(f => index.push({ t: `Fuse ${f[1]} (${f[2]} A)`, s: `${b.name} #${f[0]}: ${f[3]}`, h: '#/fuses' })));
  D.guides.filter(applies).forEach(g => index.push({ t: g.title, s: 'Guide · ' + g.steps.join(' '), h: '#/guides/' + g.id }));
  D.faults.filter(applies).forEach(f => index.push({ t: f.title, s: 'Fault · ' + f.symptoms + ' ' + f.cause, h: '#/faults' }));
  D.schedule.items.filter(applies).forEach(i => index.push({ t: i.task, s: 'Service schedule', h: '#/service' }));
}
function searchView(q) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = index.filter(x => { const hay = (x.t + ' ' + x.s).toLowerCase(); return words.every(w => hay.includes(w)); }).slice(0, 40);
  return `<h1>Search: ${esc(q)}</h1>` + (hits.length ? `<div class="card">` + hits.map(x =>
    `<a class="hit row" href="${x.h}"><b>${esc(x.t)}</b><br><small>${esc(x.s.length > 140 ? x.s.slice(0, 140) + '…' : x.s)}</small></a>`).join('') + `</div>` : '<p class="note">No matches.</p>');
}

// ---- routing ----
function route() {
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  const [name, id] = path.split('/');
  const v = views[name || 'home'] || views.home;
  $('#view').innerHTML = v(id, new URLSearchParams(qs || ''));
  document.querySelectorAll('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === (name || 'home') || (a.dataset.tab === 'specs' && ['parts', 'fuses'].includes(name)) || (a.dataset.tab === 'guides' && name === 'faults')));
  $('#q').value = '';
  window.scrollTo(0, 0);
}
function setCar(code) {
  car = code; store.set('car', code);
  const m = model();
  $('#carBtn').textContent = m ? m.code : 'Choose model';
  buildIndex(); route();
}

// ---- events ----
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'setCar') setCar(b.dataset.code);
  if (act === 'clearTicks') { store.set('buyTicks', {}); route(); }
  if (act === 'saveOdo') { const v = parseInt($('#odo').value, 10); store.set('odo', v > 0 ? v : null); route(); }
  if (act === 'addLog') {
    const task = $('#lTask').value.trim(), date = $('#lDate').value;
    if (!task || !date) { alert('Add a job name and date.'); return; }
    const miles = parseInt($('#lMiles').value, 10) || null;
    const log = store.get('log', []);
    log.push({ id: Date.now().toString(36), task, date, miles, cost: $('#lCost').value || null, notes: $('#lNotes').value.trim() });
    store.set('log', log);
    if (miles && miles > (store.get('odo', 0) || 0)) store.set('odo', miles);
    location.hash = '#/mycar';
    route();
  }
  if (act === 'delLog' && confirm('Delete this log entry?')) { store.set('log', store.get('log', []).filter(x => x.id !== b.dataset.id)); route(); }
  if (act === 'export') {
    const blob = new Blob([JSON.stringify({ app: 'alvel-garage', v: 1, car, odo: store.get('odo', null), log: store.get('log', []) }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `alvel-garage-log-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
});
document.addEventListener('change', e => {
  if (e.target.dataset.tick) { const t = store.get('buyTicks', {}); t[e.target.dataset.tick] = e.target.checked; store.set('buyTicks', t); }
  if (e.target.dataset.act === 'severe') { store.set('severe', e.target.checked); route(); }
  if (e.target.id === 'imp' && e.target.files[0]) {
    e.target.files[0].text().then(txt => {
      const d = JSON.parse(txt);
      if (d.app !== 'alvel-garage' || !Array.isArray(d.log)) throw new Error('not a backup');
      if (!confirm(`Replace this device's log with the backup (${d.log.length} entries)?`)) return;
      store.set('log', d.log); store.set('odo', d.odo ?? null); if (d.car) setCar(d.car); route();
    }).catch(() => alert('That file isn\'t an AlVel Garage backup.'));
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'frame') $('#decoded').innerHTML = decode(e.target.value);
  if (e.target.id === 'q') { const q = e.target.value.trim(); if (q.length > 1) $('#view').innerHTML = searchView(q); else if (!q) route(); }
});
$('#carBtn').addEventListener('click', () => {
  $('#carList').innerHTML = D.vehicles.models.map(m => `<button class="pick ${car === m.code ? 'on' : ''}" value="${m.code}"><b>${m.code}</b><small>${esc(m.label)} · ${esc(m.engine)} · ${esc(m.trans)}</small></button>`).join('') +
    `<button class="pick" value="">Show all models<small>See every variant's data, tagged</small></button>`;
  $('#carDlg').returnValue = 'cancel';
  $('#carDlg').showModal();
});
$('#carDlg').addEventListener('close', () => { const v = $('#carDlg').returnValue; if (v !== 'cancel') setCar(v || null); });
window.addEventListener('hashchange', route);

// ---- start ----
Promise.all(FILES.map(f => fetch(`data/${f}.json`).then(r => { if (!r.ok) throw new Error(f); return r.json(); }).then(j => { D[f] = j; })))
  .then(() => { $('#carBtn').textContent = model() ? model().code : 'Choose model'; buildIndex(); route(); })
  .catch(err => { $('#view').innerHTML = `<p>Couldn't load the data (${esc(err.message)}). If you're offline, open the app once while online so it can save a copy.</p>`; });
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js');
