import { assignmentHex } from './parts.js';
import {
  LEATHER_TYPES, LEATHER_COLORS, HARDWARE_FINISHES, THREAD_COLORS
} from './data.js';
import { t, partName } from './i18n.js';

const nameOf = (list, keyPrefix, id, lang) => {
  const item = list.find(x => x.id === id);
  return t(`${keyPrefix}.${id}`, lang, item?.name ?? id);
};

export function describeAssignment(a, lang = 'tr') {
  if (!a) return t('ui.default', lang, 'Varsayılan');
  if (a.group === 'leather')
    return `${nameOf(LEATHER_TYPES, 'leatherType', a.type, lang)} · ${nameOf(LEATHER_COLORS, 'leatherColor', a.color, lang)}`;
  if (a.group === 'hardware') return nameOf(HARDWARE_FINISHES, 'hardware', a.finish, lang);
  if (a.group === 'thread')   return nameOf(THREAD_COLORS, 'thread', a.thread, lang);
  return t('ui.default', lang, 'Varsayılan');
}

export function initSummary({ priceEl, cardEl, dockCtaEl }, app) {
  /* ---- sabit iskeletler (bir kez kurulur) ----
   * Buradaki metin render()'da (aşağıda) senkron olarak hemen ezilir --
   * kullanıcı hiçbir zaman bunu görmez -- ama yine de t() üzerinden geçsin
   * diye (modülün geri kalanıyla tutarlılık, ileride bu ilk render'ın
   * geciktiği bir senaryoda yanlış dilde donmasın diye) sabit Türkçe yerine
   * mevcut dili kullanıyoruz. */
  priceEl.innerHTML = `<button class="cta" type="button">${t('ui.productSummary', app.store.get().lang, 'Ürün Özeti')}</button>`;

  const ctaEl = priceEl.querySelector('.cta');
  const openSummary = () => app.store.set({ summaryOpen: true });

  ctaEl.addEventListener('click', openSummary);
  // dockCtaEl: 860px altında dock sheet'in içindeki tam genişlik CTA
  // (priceBar mobilde gizli — bkz. konfigurator.html @media). Aynı eylem.
  if (dockCtaEl) dockCtaEl.addEventListener('click', openSummary);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && app.store.get().summaryOpen) app.store.set({ summaryOpen: false });
  });
  document.addEventListener('pointerdown', e => {
    if (!app.store.get().summaryOpen) return;
    if (cardEl.contains(e.target) || priceEl.contains(e.target)) return;
    // dockCtaEl dışlanmazsa: sheet açıkken dockCta'ya dokunmak ÖNCE bu
    // pointerdown'da kapatır, SONRA kendi click'i tekrar açar -- görünür
    // bir titreme. priceEl'in kendi .cta'sı zaten dışlandığı için aynı
    // muameleyi dockCtaEl'e de uyguluyoruz.
    if (dockCtaEl && dockCtaEl.contains(e.target)) return;
    app.store.set({ summaryOpen: false });
  });

  /* ---- özet kartı ----
   * `cardEl.innerHTML`'i HER render()'da yeniden yazmak — açıkken parça
   * seçimi, katalog açma/kapama gibi kartla İLGİSİZ store güncellemelerinde
   * bile — dock.js'in build()/refresh() ayrımıyla kasıtlı olarak kaçındığı
   * aynı tuzak: aradaki bir yeniden kurulum, `pointerdown` ile `click`
   * arasında düğümü değiştirip tıklamayı YUTAR (Task 14'te data-act
   * butonlarına davranış bağlanınca bu gerçek bir risk). Bu yüzden kartın
   * GÖRÜNEN İÇERİĞİNİ (ürün + atamalar + toplam) özetleyen bir anahtar
   * tutuyoruz; değişmediyse DOM'a dokunmuyoruz. Bunu "basitleştirip" geri
   * almayın — bilinçli bir tercih.
   */
  let cardKey = null;
  function buildCard(state) {
    // `state.lang` anahtara dahil: dil değişse bile productId/assignments aynı
    // kalırsa anahtar öncesi haliyle eşleşir ve kart YENİDEN KURULMAZ -- açık
    // bir özet kartı, dil değiştirildiğinde eski dildeki parça adlarını ve
    // Doku/Renk açıklamalarını göstermeye devam ederdi (dock.js'in builtFor
    // anahtarında düzeltilen aynı sınıf risk).
    const key = `${state.productId}::${JSON.stringify(state.assignments)}::${state.lang}`;
    if (key === cardKey) return;
    cardKey = key;

    const { lang } = state;
    const rows = state.parts
      .filter(p => state.assignments[p.id])
      .map(p => `
        <div class="srow">
          <span class="dot" style="background:${assignmentHex(state.assignments[p.id], p)}"></span>
          <span class="nm">${partName(state.productId, p, lang)}</span>
          <span class="vl">${describeAssignment(state.assignments[p.id], lang)}</span>
        </div>`).join('');

    cardEl.innerHTML = `
      <div class="lbl">${t('ui.yourConfiguration', lang, 'Yapılandırman')}</div>
      ${rows}
      <div class="acts">
        <button class="chip" type="button" data-act="copy">${t('ui.copyLink', lang, 'Bağlantıyı kopyala')}</button>
        <button class="chip" type="button" data-act="image">${t('ui.downloadImage', lang, 'Görseli indir')}</button>
      </div>`;
  }

  function render(state) {
    if (!state.productId) return;

    ctaEl.textContent = t('ui.productSummary', state.lang, 'Ürün Özeti');
    if (dockCtaEl) dockCtaEl.textContent = t('ui.productSummary', state.lang, 'Ürün Özeti');

    cardEl.dataset.open = String(state.summaryOpen);
    if (state.summaryOpen) buildCard(state);
  }

  app.store.subscribe(render);
  render(app.store.get());
}
