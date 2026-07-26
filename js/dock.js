import {
  LEATHER_TYPES, LEATHER_COLORS, HARDWARE_FINISHES, THREAD_COLORS, COMPATIBILITY
} from './data.js';
import { assignmentHex } from './parts.js';
import { t, partName } from './i18n.js';

/**
 * `chipsEl` (#dockRows, içinde #dock) yalnızca parça çipi satırını + +N/−
 * geçiş düğmesini tutar; `optionsEl` (#dockOptions) ayraç + yalnızca UYAN
 * seçenek satırlarını tutar. Bu ikisi artık AYRI cam panellerdir (Görev 1 --
 * masaüstünde #dockWrap'in column-reverse'ü ile #dock her zaman sabit altta,
 * #dockOptions onun üstünde büyür/küçülür); dock.js'in tek işi doğru
 * fragment'ı doğru konteynıra yazmak, panellerin konumlandırılmasıyla hiç
 * ilgilenmez (o tamamen CSS'te).
 */
export function initDock({ chipsEl, optionsEl }, app) {
  let builtFor = null;        // `${productId}::${selectedPartId}::${expanded}::${lang}`
  let expanded = false;

  function build(state) {
    const { lang } = state;
    const part = state.parts.find(p => p.id === state.selectedPartId);
    if (!part) { chipsEl.innerHTML = ''; optionsEl.innerHTML = ''; return; }

    const primaries = state.parts.filter(p => p.primary);
    const secondaries = state.parts.filter(p => !p.primary);

    const shown = expanded ? [...primaries, ...secondaries]
                           : [...primaries, ...secondaries.filter(p => p.id === part.id)];

    // --- çipler paneli: parça çipleri + +N/− ---
    const chipsFrag = document.createDocumentFragment();
    const partRow = document.createElement('div');
    partRow.className = 'row parts';
    for (const p of shown) {
      partRow.appendChild(partChip(p, state, lang));
    }
    const hiddenCount = secondaries.filter(p => !shown.includes(p)).length;
    if (hiddenCount > 0 || expanded) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'chip more';
      more.textContent = expanded ? '−' : `+${hiddenCount}`;
      more.setAttribute('aria-label', expanded
        ? t('ui.hidePartsAria', lang, 'Parçaları gizle')
        : t('ui.showAllPartsAria', lang, 'Tüm parçaları göster'));
      more.addEventListener('click', () => { expanded = !expanded; builtFor = null; render(app.store.get()); });
      partRow.appendChild(more);
    }
    chipsFrag.appendChild(partRow);
    chipsEl.innerHTML = '';
    chipsEl.appendChild(chipsFrag);

    // --- seçenekler paneli: ayraç + yalnızca UYAN gruplar ---
    const optionsFrag = document.createDocumentFragment();
    const hair = document.createElement('div');
    hair.className = 'hair';
    optionsFrag.appendChild(hair);

    const families = COMPATIBILITY[part.category] || [];
    if (families.includes('leather')) {
      optionsFrag.appendChild(chipRow(t('ui.texture', lang, 'Doku'), LEATHER_TYPES, 'leatherType', lang, 'leatherType'));
      optionsFrag.appendChild(swatchRow(t('ui.color', lang, 'Renk'), LEATHER_COLORS, 'leatherColor', lang, 'leatherColor'));
    }
    if (families.includes('hardware')) {
      optionsFrag.appendChild(chipRow(t('ui.finish', lang, 'Finiş'), HARDWARE_FINISHES, 'hardware', lang, 'hardware'));
    }
    if (families.includes('thread')) {
      optionsFrag.appendChild(swatchRow(t('ui.thread', lang, 'İplik'), THREAD_COLORS, 'thread', lang, 'thread'));
    }
    optionsEl.innerHTML = '';
    optionsEl.appendChild(optionsFrag);
  }

  function partChip(p, state, lang) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.part = p.id;
    b.setAttribute('aria-pressed', String(p.id === state.selectedPartId));
    b.innerHTML = `<span class="cdot"></span>${partName(state.productId, p, lang)}`;
    b.querySelector('.cdot').style.background = assignmentHex(state.assignments[p.id], p);
    b.addEventListener('click', () => app.selectPart(p.id));
    return b;
  }

  // `keyPrefix`: i18n anahtar öneki (ör. 'leatherType', 'hardware') --
  // `kind` ile aynı isimler ama ayrı parametre olarak tutuluyor, ileride
  // birbirinden ayrışırlarsa (ör. yeni bir malzeme ailesi eklenirse) build()
  // içindeki çağrı yerleri tek tek güncellenmeden burada ayarlanabilsin diye.
  function chipRow(label, list, kind, lang, keyPrefix) {
    const row = document.createElement('div');
    row.className = 'row opts';
    row.innerHTML = `<span class="lbl">${label}</span>`;
    for (const item of list) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.kind = kind;
      b.dataset.value = item.id;
      b.textContent = t(`${keyPrefix}.${item.id}`, lang, item.name);
      b.addEventListener('click', () => onPick(kind, item.id));
      row.appendChild(b);
    }
    return row;
  }

  function swatchRow(label, list, kind, lang, keyPrefix) {
    const row = document.createElement('div');
    row.className = 'row opts';
    row.innerHTML = `<span class="lbl">${label}</span>`;
    for (const item of list) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sw';
      b.dataset.kind = kind;
      b.dataset.value = item.id;
      const name = t(`${keyPrefix}.${item.id}`, lang, item.name);
      b.title = name;
      b.setAttribute('aria-label', name);
      b.style.background = item.hex;
      b.addEventListener('click', () => onPick(kind, item.id));
      row.appendChild(b);
    }
    return row;
  }

  function onPick(kind, value) {
    const state = app.store.get();
    const partId = state.selectedPartId;
    const current = state.assignments[partId];

    if (kind === 'leatherType') {
      app.assign(partId, { group:'leather', type:value,
        color: current?.group === 'leather' ? current.color : 'siyah' });
    } else if (kind === 'leatherColor') {
      app.assign(partId, { group:'leather',
        type: current?.group === 'leather' ? current.type : 'saffiano', color:value });
    } else if (kind === 'hardware') {
      app.assign(partId, { group:'hardware', finish:value });
    } else if (kind === 'thread') {
      app.assign(partId, { group:'thread', thread:value });
    }
  }

  /** DOM'u YENİDEN KURMAZ — sadece işaretleri ve renk noktalarını günceller. */
  function refresh(state) {
    const a = state.assignments[state.selectedPartId];

    for (const b of optionsEl.querySelectorAll('[data-kind]')) {
      const { kind, value } = b.dataset;
      let on = false;
      if (kind === 'leatherType')  on = a?.group === 'leather'  && a.type === value;
      if (kind === 'leatherColor') on = a?.group === 'leather'  && a.color === value;
      if (kind === 'hardware')     on = a?.group === 'hardware' && a.finish === value;
      if (kind === 'thread')       on = a?.group === 'thread'   && a.thread === value;
      b.setAttribute('aria-pressed', String(on));
    }

    for (const b of chipsEl.querySelectorAll('[data-part]')) {
      const id = b.dataset.part;
      const part = state.parts.find(p => p.id === id);
      b.setAttribute('aria-pressed', String(id === state.selectedPartId));
      b.querySelector('.cdot').style.background = assignmentHex(state.assignments[id], part);
    }
  }

  function render(state) {
    const key = `${state.productId}::${state.selectedPartId}::${expanded}::${state.lang}`;
    if (key !== builtFor) { builtFor = key; build(state); }
    refresh(state);
  }

  app.store.subscribe(render);
  render(app.store.get());
}
