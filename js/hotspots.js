import * as THREE from 'three';
import { pickAnchor } from './anchor-pick.js';
import { partName } from './i18n.js';

const OCCLUSION_INTERVAL_MS = 60;
const SAMPLES_PER_MESH = 8;

export function initHotspots(layerEl, app) {
  const raycaster = new THREE.Raycaster();
  const projected = new THREE.Vector3();

  let entries = [];            // { part, el, candidates:Vector3[], anchorIndex }
  let occlusionDirty = true;
  let lastOcclusion = 0;

  /* ---- çapa adayları: bbox merkezi + seyreltilmiş yüzey noktaları ----
     Tek merkez nokta yetmez: Dikişler gibi ürünün çevresine yayılmış
     parçaların bbox merkezi gövdenin İÇİNDE kalır ve occlusion testi onu
     daima kapalı sayar (spec §4.2). */
  function buildCandidates(part) {
    const box = new THREE.Box3();
    for (const mesh of part.meshes) box.expandByObject(mesh);
    const candidates = [box.getCenter(new THREE.Vector3())];

    for (const mesh of part.meshes) {
      const pos = mesh.geometry?.attributes?.position;
      if (!pos) continue;
      const step = Math.max(1, Math.floor(pos.count / SAMPLES_PER_MESH));
      for (let i = 0; i < pos.count; i += step) {
        const v = new THREE.Vector3().fromBufferAttribute(pos, i);
        candidates.push(mesh.localToWorld(v));
      }
    }
    return candidates;
  }

  function rebuild(state) {
    layerEl.innerHTML = '';
    entries = state.parts.filter(p => p.primary).map(part => {
      const name = partName(state.productId, part, state.lang);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'hotspot';
      el.dataset.part = part.id;
      el.innerHTML = `<span class="tip"></span><span class="bead"></span>`;
      el.querySelector('.tip').textContent = name;
      el.setAttribute('aria-label', name);
      // {zoom:true}: nokta tıklaması "üründe tıklama" sayılır (kamera parçaya
      // yaklaşır, Görev 2) -- dock.js'in çip tıklamaları bunu YAPMAZ (2D UI
      // eylemi), bkz. app.js:selectPart.
      el.addEventListener('click', () => app.selectPart(part.id, { zoom: true }));
      layerEl.appendChild(el);
      return { part, el, candidates: buildCandidates(part), anchorIndex: -1 };
    });
    occlusionDirty = true;
  }

  function isVisibleFromCamera(worldPoint, part) {
    const origin = app.view.camera.position;
    const dir = worldPoint.clone().sub(origin);
    const distance = dir.length();
    raycaster.set(origin, dir.normalize());
    raycaster.far = distance + 0.001;

    const model = app.getModel();
    if (!model) return false;
    const hits = raycaster.intersectObject(model, true);
    for (const hit of hits) {
      if (!hit.object.visible) continue;
      // İlk gerçek çarpma bu parçaya aitse aday görünürdür.
      return part.meshes.includes(hit.object);
    }
    return true;    // hiçbir şeye çarpmadı — açıkta
  }

  function update() {
    const now = performance.now();
    const recheck = occlusionDirty && (now - lastOcclusion > OCCLUSION_INTERVAL_MS);
    if (recheck) { lastOcclusion = now; occlusionDirty = false; }

    const camera = app.view.camera;
    const selectedId = app.store.get().selectedPartId;

    for (const entry of entries) {
      // Yalnızca throttle penceresinde yeniden değerlendir — aday görünmüyorken
      // (anchorIndex === -1) her karede taramak throttle'ı anlamsız kılar:
      // pickAnchor, currentIndex=-1 ile tüm adayları lineer tarar ve her biri
      // için raycast yapar (parça başına ~46 adede kadar).
      if (recheck) {
        entry.anchorIndex = pickAnchor(
          entry.candidates,
          point => isVisibleFromCamera(point, entry.part),
          entry.anchorIndex
        );
      }
      if (entry.anchorIndex === -1) { entry.el.hidden = true; continue; }

      projected.copy(entry.candidates[entry.anchorIndex]).project(camera);
      if (projected.z > 1) { entry.el.hidden = true; continue; }   // kamera arkasında

      entry.el.hidden = false;
      const x = (projected.x * 0.5 + 0.5) * layerEl.clientWidth;
      const y = (-projected.y * 0.5 + 0.5) * layerEl.clientHeight;
      entry.el.style.transform = `translate(${x}px, ${y}px)`;
      entry.el.setAttribute('aria-pressed', String(entry.part.id === selectedId));
    }
  }

  /* ---- sürüklerken soluklaş ---- */
  const controls = app.view.controls;
  controls.addEventListener('start', () => layerEl.dataset.dragging = 'true');
  controls.addEventListener('end',   () => layerEl.dataset.dragging = 'false');
  app.view.onCameraChange(() => { occlusionDirty = true; });

  let lastKey = null;
  app.store.subscribe(state => {
    // loadSeq her başarılı loadProduct çağrısında artar, bu yüzden aynı ürünün
    // (productId değişmeden) yeniden yüklenmesinde bile burada bir değişiklik
    // yakalanır — eski, dispose edilmiş meshlere işaret eden entries kalmaz.
    // `lang` da ANAHTARA DAHİL: tooltip/aria-label metni yalnızca rebuild()
    // içinde yazılıyor (update() her karede yalnızca konum/aria-pressed
    // günceller) -- lang anahtarda olmasa dil değiştirildiğinde noktalar
    // ürün yeniden yüklenene kadar ESKİ dildeki ipucu metnini gösterirdi.
    const key = `${state.productId}::${state.loadSeq}::${state.lang}`;
    if (key !== lastKey) { lastKey = key; rebuild(state); }
  });
  rebuild(app.store.get());

  return { update };
}
