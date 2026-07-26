import { CATALOG, PART_MAPS, PRICING } from './data.js';
import { transferConfig } from './transfer.js';
import { formatTRY } from './pricing.js';
import { t } from './i18n.js';

export function initCatalog({ triggerEl, panelEl }, app) {
  let activeCategoryId = CATALOG.find(c => c.products.some(p => !p.soon))?.id ?? CATALOG[0].id;

  triggerEl.addEventListener('click', () => {
    app.store.set(prev => ({ ...prev, catalogOpen: !prev.catalogOpen }));
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && app.store.get().catalogOpen) app.store.set({ catalogOpen: false });
  });
  document.addEventListener('pointerdown', e => {
    if (!app.store.get().catalogOpen) return;
    if (panelEl.contains(e.target) || triggerEl.contains(e.target)) return;
    app.store.set({ catalogOpen: false });
  });

  async function choose(productId, rowEl) {
    const state = app.store.get();
    if (productId === state.productId) { app.store.set({ catalogOpen: false }); return; }

    const carried = transferConfig(state.assignments, productId, state.explicitAssignments);
    app.store.set({ catalogOpen: false });

    const bar = rowEl.querySelector('.bar');
    if (bar) bar.style.width = '15%';
    await app.loadProduct(productId, carried);
    if (bar) bar.style.width = '0';
  }

  function build(state) {
    const { lang } = state;
    const category = CATALOG.find(c => c.id === activeCategoryId) ?? CATALOG[0];
    const categoryName = t('category.' + category.id, lang, category.name);

    const cats = document.createElement('div');
    cats.className = 'cats';
    cats.innerHTML = `<div class="lbl">${t('ui.category', lang, 'Kategori')}</div>`;
    for (const c of CATALOG) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cat';
      b.textContent = t('category.' + c.id, lang, c.name);
      b.setAttribute('aria-pressed', String(c.id === category.id));
      if (!c.products.length) b.disabled = true;
      else b.addEventListener('click', () => { activeCategoryId = c.id; build(app.store.get()); });
      cats.appendChild(b);
    }

    const prods = document.createElement('div');
    prods.className = 'prods';
    const productWord = t('ui.productWord', lang, 'ürün');
    prods.innerHTML =
      `<div class="lbl">${categoryName} · ${category.products.length} ${productWord}</div>`;
    for (const p of category.products) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'prod';
      const partCount = PART_MAPS[p.id]?.parts.length;
      const base = PRICING.base[p.id];
      const comingSoon = t('ui.comingSoon', lang, 'Yakında');
      const noteText = p.note ? t('soonNote.' + p.id, lang, p.note) : comingSoon;
      const partsWord = t('ui.parts', lang, 'parça');
      const price = formatTRY(base);
      const sub = p.soon ? noteText
                         : (lang === 'en' ? `${partCount} ${partsWord} · from ${price}`
                                          : `${partCount} ${partsWord} · ${price}'den`);
      const name = t('product.' + p.id, lang, p.name);
      row.innerHTML = `
        <span class="th"></span>
        <span><span class="nm">${name}</span><span class="sub">${sub}</span></span>
        ${p.soon ? `<span class="tag">${comingSoon}</span>` : ''}
        <span class="bar"></span>`;
      if (p.soon) row.disabled = true;
      else {
        row.setAttribute('aria-pressed', String(p.id === state.productId));
        row.addEventListener('click', () => choose(p.id, row));
      }
      prods.appendChild(row);
    }

    panelEl.innerHTML = '';
    panelEl.appendChild(cats);
    panelEl.appendChild(prods);
  }

  function render(state) {
    panelEl.dataset.open = String(state.catalogOpen);
    triggerEl.querySelector('.label').textContent = t('ui.products', state.lang, 'Ürünler');
    triggerEl.querySelector('.caret').textContent = state.catalogOpen ? '▴' : '▾';
    if (state.catalogOpen) build(state);
  }

  app.store.subscribe(render);
  render(app.store.get());
}
