/**
 * Üst-sağ köşedeki TR/EN dil anahtarı. #priceBar'ın (Ürün Özeti CTA'sı)
 * SOLUNDA, #topRightWrap içinde bir kardeş olarak oturur (bkz.
 * konfigurator.html #topRightWrap/#langSwitch CSS'i). Diğer iki-durumlu
 * kontrollerle (ör. dock.js'in chip[aria-pressed]) AYNI görsel dili
 * kullanır -- burada da düz `.chip` düğmeleri + aria-pressed.
 *
 * Diğer init* modülleri gibi tek işi: DOM'u kurmak, store'u dinlemek,
 * tıklamada app.setLang(...)'i çağırmak. Kendi durumunu tutmaz -- aktif dil
 * tamamen store'daki state.lang'tan okunur.
 */
export function initLangSwitch(el, app) {
  el.innerHTML = `
    <button type="button" class="chip" data-lang="tr">TR</button>
    <button type="button" class="chip" data-lang="en">EN</button>`;

  for (const b of el.querySelectorAll('[data-lang]')) {
    b.addEventListener('click', () => app.setLang(b.dataset.lang));
  }

  function render(state) {
    for (const b of el.querySelectorAll('[data-lang]')) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang));
    }
    // Ekran okuyucular telaffuz/ses kurallarını BU niteliktan seçer --
    // güncellenmezse İngilizce arayüz Türkçe fonetikle okunmaya devam eder
    // (final-review-batch2.md I4). İlk render'da da (yalnızca switch'te
    // değil) çalışsın diye burada, her store event'inde çalışan render()
    // içinde -- app.js'i DOM'dan bağımsız tutma prensibini bozmadan.
    document.documentElement.lang = state.lang;
  }

  app.store.subscribe(render);
  render(app.store.get());
}
