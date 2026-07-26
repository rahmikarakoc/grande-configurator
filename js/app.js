import { createStore } from './store.js';
import { createScene } from './scene.js';
import { resolveParts, applyAssignment, defaultAssignmentFor, pulseSelection } from './parts.js';
import { PART_MAPS } from './data.js';
import { t } from './i18n.js';
import { initDock } from './dock.js';
import { initDockSheet } from './dock-sheet.js';
import { initHotspots } from './hotspots.js';
import { initSummary } from './summary.js';
import { initCatalog } from './catalog.js';
import { initLangSwitch } from './lang-switch.js';
import { initAlternativeUI } from './alternative-ui.js';
import * as THREE from 'three';

const wrapEl = document.getElementById('canvasWrap');
const loadingEl = document.getElementById('loading');
const view = createScene(wrapEl);

const LANG_KEY = 'grande-lang';
// localStorage'a güvenme: yalnızca 'tr'/'en' geçerli, başka her şey (bozuk
// veri, eski bir sürümden kalma farklı bir değer, null) sessizce 'tr'ye düşer.
// ERİŞİMİN KENDİSİ de try/catch'siz BIRAKILMAZ: bazı ortamlarda (gizli/özel
// gezinti, site verisi engellenmiş, sandbox'lı iframe) `localStorage`'a
// property erişimi bile senkron olarak throw eder -- bu throw, `store`
// modül-değerlendirme zamanında yakalanmazsa `app.js` hiç çalışmaz (kalıcı
// "Yükleniyor…" ekranı, sıfır dock çipi). Yalnızca DEĞERİ değil ERİŞİMİ de
// savunmaya alıyoruz.
function initialLang() {
  let stored = null;
  try { stored = localStorage.getItem(LANG_KEY); } catch { /* storage bloklanmış/erişilemez */ }
  return stored === 'tr' || stored === 'en' ? stored : 'tr';
}

const store = createStore({
  productId: null,
  parts: [],
  assignments: {},
  // Kullanıcının dock'tan gerçekten TIKLAYARAK seçtiği parça id'leri (bkz.
  // assign()). loadProduct'ın yükleme sırasında otomatik uyguladığı
  // varsayılan atamalar burada YER ALMAZ -- transferConfig'e hangi
  // atamaların "kullanıcının bilinçli tercihi" olduğunu bildirmek için
  // kullanılır (bkz. catalog.js:choose). Set kimliği her assign() çağrısında
  // YENİLENİR (mutate değil) -- store.set shallow-merge yaptığı için referans
  // değişmeden abonelere haber gitmez.
  explicitAssignments: new Set(),
  selectedPartId: null,
  catalogOpen: false,
  summaryOpen: false,
  dockCollapsed: false,
  lang: initialLang(),
  loadSeq: 0    // her başarılı loadProduct çağrısında artar; aynı ürünün
                // yeniden yüklenmesini de (productId değişmese bile) ayırt eder
});

function setLang(lang) {
  const next = lang === 'tr' || lang === 'en' ? lang : 'tr';
  // Önce UI: store.set her koşulda çalışmalı. localStorage.setItem quota
  // aşımında veya bazı gizli-gezinti modlarında throw eder -- bu satır
  // store.set'ten ÖNCE olsaydı throw setLang'ı bütünüyle keser ve dil hiç
  // değişmezdi (kullanıcı tıklaması görünürde hiçbir şey yapmaz). Kalıcılık
  // ikincil: başarısız olursa sessizce yutulur, dil değişimi yine de çalışır.
  store.set({ lang: next });
  try { localStorage.setItem(LANG_KEY, next); } catch { /* kalıcılık yok, sorun değil */ }
}

let currentModel = null;
let loadToken = 0;   // her loadProduct çağrısında artar; sadece EN SON çağrı sahneye yazar

const partById = id => store.get().parts.find(p => p.id === id);

/**
 * Seçilen parçanın kendi meshlerinden dünya-uzayı bbox'ı çıkarıp kamerayı
 * ona yaklaştırır (Görev 2). Yön DEĞİŞMEZ — yalnızca dolly/truck; bkz.
 * controls.js:flyTo. Küçük bir parça (ör. toka) için kutu küçük olur,
 * targetDistance de küçük çıkar -- yakın çekim; minDistance/maxDistance
 * clamp'i hem burada hem flyTo içinde savunmacı olarak uygulanıyor.
 */
function zoomToPart(part) {
  const box = new THREE.Box3();
  for (const mesh of part.meshes) box.expandByObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const raw = Math.max(size.x, size.y, size.z) * 2.6;
  const distance = THREE.MathUtils.clamp(raw, 0.65, view.controls.maxDistance);
  view.controls.flyTo(center, distance);
}

function selectPart(partId, opts = {}) {
  const part = partById(partId);
  if (!part || store.get().selectedPartId === partId) return;
  store.set({ selectedPartId: partId });
  pulseSelection(part);
  if (opts.zoom) zoomToPart(part);
}

/* ---------- Undo / Redo & Camera Reset Handler ---------- */
const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 40;

function pushHistoryState() {
  const currentAssignments = store.get().assignments;
  if (!currentAssignments) return;
  const clone = JSON.parse(JSON.stringify(currentAssignments));
  undoStack.push(clone);
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack.length = 0;
  updateHistoryUI();
}

export function undo() {
  if (!undoStack.length) return;
  const currentAssignments = store.get().assignments;
  redoStack.push(JSON.parse(JSON.stringify(currentAssignments)));

  const previousAssignments = undoStack.pop();
  applyAssignmentsSnapshot(previousAssignments);
  updateHistoryUI();
  showToast(t('ui.undone', store.get().lang, 'Geri Alındı ↩'));
}

export function redo() {
  if (!redoStack.length) return;
  const currentAssignments = store.get().assignments;
  undoStack.push(JSON.parse(JSON.stringify(currentAssignments)));

  const nextAssignments = redoStack.pop();
  applyAssignmentsSnapshot(nextAssignments);
  updateHistoryUI();
  showToast(t('ui.redone', store.get().lang, 'İleri Alındı ↪'));
}

function applyAssignmentsSnapshot(snapshot) {
  const parts = store.get().parts;
  if (!parts || !snapshot) return;
  for (const part of parts) {
    const a = snapshot[part.id];
    if (a) applyAssignment(part, a);
  }
  store.set(prev => ({
    ...prev,
    assignments: { ...snapshot }
  }));
}

export function resetCamera() {
  if (currentModel) {
    view.frameModel(currentModel);
    showToast(t('ui.cameraReset', store.get().lang, 'Ortalandı 🎯'));
  }
}

function updateHistoryUI() {
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  if (undoBtn) undoBtn.disabled = undoStack.length === 0;
  if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

window.addEventListener('keydown', e => {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

  const isCtrl = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();

  if (key === 'z') {
    if (isCtrl) {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else {
      e.preventDefault();
      resetCamera();
    }
  } else if (isCtrl && key === 'y') {
    e.preventDefault();
    redo();
  }
});

function assign(partId, assignment) {
  const part = partById(partId);
  if (!part) return;
  pushHistoryState();
  applyAssignment(part, assignment);
  store.set(prev => ({
    ...prev,
    assignments: { ...prev.assignments, [partId]: assignment },
    explicitAssignments: new Set(prev.explicitAssignments).add(partId)
  }));
}

async function loadProduct(productId, assignmentsOverride) {
  const def = PART_MAPS[productId];
  if (!def) { console.warn(`Bilinmeyen ürün: ${productId}`); return; }

  // Task 13'te ortaya çıkan yarış durumu için koruma: loadProduct'ın önceden
  // hiçbir eşzamanlılık koruması yoktu. Kullanıcı iki farklı ürüne art arda
  // hızlıca tıklarsa (katalog panelini tekrar açıp ikinci bir ürüne tıklayarak,
  // ya da programatik olarak), iki çağrı da view.loadModel()'i aynı anda
  // bekler; hangisi ÖNCE biterse DOSYA BOYUTUNA göre değişir, çağrı sırasına
  // göre değil. Daha ESKİ (önce başlamış) çağrı daha SONRA biterse, henüz
  // sahneye eklenmiş DAHA YENİ modeli disposeModel ile siler ve durumu kendi
  // (eski, artık istenmeyen) ürününe geri döndürür — kullanıcının son
  // tıklaması sessizce iptal olur (ölçüldü: purse sonra isabel çağrılınca
  // isabel önce bitip sahneye yazıyor, sonra purse biterken isabel'i silip
  // yerine kendini koyuyordu — bkz. task-13-report.md "Üçüncü kontrol").
  // Çözüm: her çağrı kendi jetonunu (token) yakalar; await sonrası, DAHA YENİ
  // bir çağrı başlamışsa (loadToken ilerlemişse) bu çağrı kendi sonucunu
  // sahneye hiç eklemeden atar.
  const token = ++loadToken;

  const lang = store.get().lang;
  loadingEl.hidden = false;
  loadingEl.textContent = t('ui.loadingModel', lang, 'Model yükleniyor…');

  let group;
  try {
    group = await view.loadModel(def.file, ratio => {
      if (token === loadToken) {
        const base = t('ui.loadingModel', lang, 'Model yükleniyor…');
        const pct = Math.round(ratio * 100);
        loadingEl.textContent = lang === 'en' ? `${base} ${pct}%` : `${base} %${pct}`;
      }
    });

    if (token !== loadToken) {
      view.disposeModel(group);
      return;
    }

    if (currentModel) view.disposeModel(currentModel);
    currentModel = group;
    if (def.rotationY !== undefined) group.rotation.y = def.rotationY;
    view.scene.add(group);
    view.frameModel(group);
    group.updateMatrixWorld(true);

    const parts = resolveParts(group, productId);

    const assignments = {};
    const explicitAssignments = new Set();
    for (const part of parts) {
      let a = assignmentsOverride?.[part.id];
      if (!a && productId === 'bagg') {
        if (part.id === 'ust-parca') {
          a = { group: 'leather', type: 'pelle_first', color: 'honey' };
        } else if (part.category === 'body' || part.category === 'detail') {
          a = { group: 'leather', type: 'pelle_first', color: 'siyah' };
        } else if (part.category === 'hardware') {
          a = { group: 'hardware', finish: 'gumus' };
        } else if (part.category === 'stitching') {
          a = { group: 'thread', thread: 'ton' };
        }
      }
      if (!a) a = defaultAssignmentFor(part.category);

      if (a) { applyAssignment(part, a); assignments[part.id] = a; }
      if (assignmentsOverride?.[part.id] !== undefined) explicitAssignments.add(part.id);
    }

    const initialPart = parts.find(p => p.id === 'taban-parcasi') || parts[0];

    store.set(prev => ({
      ...prev, productId, parts, assignments, explicitAssignments,
      selectedPartId: initialPart ? initialPart.id : null,
      loadSeq: prev.loadSeq + 1
    }));
  } catch (err) {
    if (token === loadToken) loadingEl.textContent = t('ui.modelLoadFailed', lang, 'Model yüklenemedi.');
    console.error(err);
  } finally {
    if (token === loadToken) {
      loadingEl.hidden = true;
      loadingEl.classList.add('hidden');
      loadingEl.style.display = 'none';
      loadingEl.style.visibility = 'hidden';
      loadingEl.style.opacity = '0';
    }
  }
}

/* ---------- modele tıklayarak seçim ---------- */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downPos = null;
// True while a second touch pointer has joined the current gesture. controls.js
// registers its own pointerdown handler on this same element FIRST (during
// createScene(), above), so by the time this listener runs, its touchPoints
// Map already reflects this pointerdown -- reusing that count instead of
// keeping a second, duplicate pointerId tracker here (bkz. review I5).
// Sticky until a FRESH single-finger gesture begins: a two-finger tap/short-pan
// otherwise overwrites downPos with the 2nd finger's position, and the 1st
// finger's independent pointerup can read a small `moved` distance and fire an
// unwanted selectPart(..., {zoom:true}).
let downWasMultiTouch = false;

view.renderer.domElement.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch') {
    const count = view.controls.getActiveTouchCount();
    if (count <= 1) downWasMultiTouch = false;   // yeni, tek-parmaklı bir hareketin başı
    else downWasMultiTouch = true;               // hareket ortasında 2. parmak katıldı
  }
  downPos = { x: e.clientX, y: e.clientY };
});

view.renderer.domElement.addEventListener('pointerup', e => {
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
  downPos = null;
  if (e.pointerType === 'touch' && downWasMultiTouch) return;   // çok-parmaklı hareket, tıklama değil
  if (moved > 5 || !currentModel) return;    // sürükleme, tıklama değil

  const rect = view.renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, view.camera);

  for (const hit of raycaster.intersectObject(currentModel, true)) {
    if (!hit.object.visible) continue;
    const part = store.get().parts.find(p => p.meshes.includes(hit.object));
    if (part) { selectPart(part.id, { zoom: true }); return; }
  }
});

// downPos daha önce yalnızca pointerup'ta temizleniyordu; pointercancel'de
// (ör. tarayıcı hareketi süpürme/gezinme jesti olarak devralırsa) sıkışıp
// kalırsa bir sonraki gerçek tıklama yanlışlıkla "sürükleme" sanılabilirdi.
view.renderer.domElement.addEventListener('pointercancel', () => {
  downPos = null;
});

export const app = { store, view, selectPart, assign, loadProduct, partById, setLang,
                     undo, redo, resetCamera, getModel: () => currentModel };

/* ---------- başlat ---------- */
await loadProduct('bagg');

// PWA yükleme koşulu: bazı tarayıcılar "Install" istemini yalnızca kayıtlı
// bir service worker varsa gösterir. sw.js kasıtlı olarak minimal (agresif
// önbellekleme yapmaz) -- bkz. sw.js. Kayıt başarısız olsa bile uygulama
// normal şekilde çalışmaya devam eder.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW kaydı başarısız:', err));
}

// ——— BAĞLANTI NOKTASI ———
// Task 10-14'ün init* çağrıları TAM BURAYA girer: loadProduct'tan sonra,
// tick()'ten önce. Modüller ilk render'larında dolu bir duruma ihtiyaç duyar.

// Görev 1: #dockWrap altında #dock (çipler) ve #dockOptions (seçenek
// satırları) artık İKİ AYRI cam panel -- #dock'un yüksekliği hiç
// değişmediği için (yalnızca #dockRows'u dolduruyor) çip satırı seçenek
// sayısı değişince zıplamıyor. dock.js yalnızca #dockRows (çipler) ve
// #dockOptions'ı (seçenekler) kurar/temizler; #dockHandle/#dockCta'ya
// (mobil sheet kabuğu, dock-sheet.js yönetir) hiç dokunmaz.
initDock({ chipsEl: document.getElementById('dockRows'), optionsEl: document.getElementById('dockOptions') }, app);
initDockSheet(document.getElementById('dock'), document.getElementById('dockHandle'), app);
const hotspots = initHotspots(document.getElementById('hotspotLayer'), app);
initSummary({
  priceEl: document.getElementById('priceBar'),
  cardEl: document.getElementById('summaryCard'),
  dockCtaEl: document.getElementById('dockCta')
}, app);
initCatalog({
  triggerEl: document.getElementById('catalogTrigger'),
  panelEl: document.getElementById('catalogPanel')
}, app);
initLangSwitch(document.getElementById('langSwitch'), app);
const altUi = initAlternativeUI(app);

(function tick() { requestAnimationFrame(tick); view.render(); hotspots.update(); altUi.update(); })();

window.__app = app;   // Playwright doğrulaması için
