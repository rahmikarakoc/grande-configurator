import { partName, t } from './i18n.js';
import {
  LEATHER_TYPES, LEATHER_COLORS, HARDWARE_FINISHES, THREAD_COLORS, COMPATIBILITY
} from './data.js';
import { assignmentHex } from './parts.js';
import * as THREE from 'three';

const find = (list, id) => list.find(x => x.id === id);

/**
 * Universal helper to make any element draggable via pointer events.
 */
export function makeDraggable(element, handle) {
  if (!element) return;
  const dragTarget = handle || element;
  let isDragging = false;
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;

  dragTarget.style.cursor = 'grab';

  dragTarget.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.resize-handle, button, input, select, textarea, .arc-swatch, .arc-chip, .side-tab, .part-item, .chip, .cat, .prod, .sw, .camera-trigger-btn, .preset-angle-btn, .capture-btn')) {
      return;
    }
    isDragging = true;
    element.dataset.isDragged = 'true';
    element.classList.add('is-dragging');
    dragTarget.style.cursor = 'grabbing';

    const rect = element.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = rect.left;
    initialTop = rect.top;

    element.style.position = 'fixed';
    element.style.left = `${initialLeft}px`;
    element.style.top = `${initialTop}px`;
    element.style.bottom = 'auto';
    element.style.right = 'auto';
    element.style.transform = 'none';

    try { dragTarget.setPointerCapture(e.pointerId); } catch {}
  });

  dragTarget.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newLeft = initialLeft + dx;
    let newTop = initialTop + dy;

    const maxLeft = window.innerWidth - element.offsetWidth;
    const maxTop = window.innerHeight - element.offsetHeight;
    newLeft = Math.max(0, Math.min(maxLeft, newLeft));
    newTop = Math.max(0, Math.min(maxTop, newTop));

    element.style.left = `${newLeft}px`;
    element.style.top = `${newTop}px`;
  });

  const stopDrag = (e) => {
    if (!isDragging) return;
    isDragging = false;
    element.classList.remove('is-dragging');
    dragTarget.style.cursor = 'grab';
    try { dragTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  dragTarget.addEventListener('pointerup', stopDrag);
  dragTarget.addEventListener('pointercancel', stopDrag);
}

/**
 * Universal helper to make any element resizable via a bottom-right resize grip.
 */
export function makeResizable(element, options = {}) {
  if (!element) return;

  const minW = options.minWidth || 120;
  const minH = options.minHeight || 60;
  const maxW = options.maxWidth || window.innerWidth - 40;
  const maxH = options.maxHeight || window.innerHeight - 40;

  let resizer = element.querySelector('.resize-handle');
  if (!resizer) {
    resizer = document.createElement('div');
    resizer.className = 'resize-handle';
    resizer.title = 'Boyutlandırmak için sürükleyin';
    resizer.innerHTML = '◢';
    element.appendChild(resizer);
  }

  let isResizing = false;
  let startX = 0, startY = 0;
  let startW = 0, startH = 0;

  resizer.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    isResizing = true;
    element.classList.add('is-resizing');

    startX = e.clientX;
    startY = e.clientY;
    startW = element.offsetWidth;
    startH = element.offsetHeight;

    try { resizer.setPointerCapture(e.pointerId); } catch {}
  });

  resizer.addEventListener('pointermove', (e) => {
    if (!isResizing) return;
    e.stopPropagation();

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newW = startW + dx;
    let newH = startH + dy;

    newW = Math.max(minW, Math.min(maxW, newW));
    newH = Math.max(minH, Math.min(maxH, newH));

    element.style.width = `${newW}px`;
    element.style.height = `${newH}px`;
    element.style.maxWidth = 'none';
    element.style.maxHeight = 'none';
  });

  const stopResize = (e) => {
    if (!isResizing) return;
    isResizing = false;
    element.classList.remove('is-resizing');
    try { resizer.releasePointerCapture(e.pointerId); } catch {}
  };

  resizer.addEventListener('pointerup', stopResize);
  resizer.addEventListener('pointercancel', stopResize);
}

export function initAlternativeUI(app) {
  const root = document.createElement('div');
  root.id = 'altUiContainer';
  document.body.appendChild(root);

  let isAltUiActive = true;
  let lastSelectedPartId = null;
  let activeAnglePreset = 'perspective';

  // Helper: Show toast notification
  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.dataset.show = 'true';
    setTimeout(() => { toast.dataset.show = 'false'; }, 2600);
  }

  // Helper: Export high-res PNG screenshot
  function downloadScreenshot() {
    app.view.render();
    const canvas = app.view.renderer.domElement;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `Grande-Bag-${activeAnglePreset}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(t('ui.screenshotSaved', app.store.get().lang, 'Ekran resmi indirildi ✨'));
  }

  // Camera Angle Presets Animation Helper
  function setCameraAngle(preset) {
    activeAnglePreset = preset;
    const model = app.getModel();
    if (!model) return;

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z);
    const isMobile = window.innerWidth <= 860;
    const distMult = isMobile ? 1.75 : 1.35;
    const dist = radius / (2 * Math.tan(fovRad / 2)) * distMult;

    let targetPos = new THREE.Vector3();
    let targetPivot = new THREE.Vector3(0, size.y * 0.45, 0);

    if (preset === 'front') {
      targetPos.set(0, size.y * 0.5, dist * 0.95);
    } else if (preset === 'side') {
      targetPos.set(dist * 1.05, size.y * 0.5, 0);
    } else if (preset === 'perspective') {
      targetPos.set(dist * 0.65, size.y * 0.75 + radius * 0.22, dist * 0.75);
    } else if (preset === 'back') {
      targetPos.set(0, size.y * 0.5, -dist * 0.95);
    } else if (preset === 'detail') {
      targetPos.set(dist * 0.42, size.y * 0.5, dist * 0.42);
    }

    animateCameraTo(targetPos, targetPivot);
  }

  function animateCameraTo(targetPos, targetPivot, duration = 500) {
    const startPos = app.view.camera.position.clone();
    const startTarget = app.view.controls.target.clone();
    const start = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      app.view.camera.position.lerpVectors(startPos, targetPos, eased);
      app.view.controls.target.lerpVectors(startTarget, targetPivot, eased);
      app.view.camera.lookAt(app.view.controls.target);
      app.view.controls.update();

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  // 1. Create Side Navigation Dock (Left Vertical Camera Dock - Compact Logo Only Initially)
  const sideDock = document.createElement('div');
  sideDock.id = 'sideDock';
  sideDock.className = 'glass draggable-panel';
  sideDock.innerHTML = `
    <div class="drag-grip" title="Taşımak için sürükleyin">⋮⋮</div>

    <button type="button" class="camera-trigger-btn" id="cameraLogoBtn" title="Kamera Açıları & Ekran Resmi">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    </button>

    <div class="camera-presets-wrapper" id="cameraPresetsWrapper">
      <div class="camera-header-label">Kamera Açıları</div>
      
      <button type="button" class="preset-angle-btn" data-preset="perspective">
        <span class="angle-icon">✦</span>
        <span>Perspektif (3/4)</span>
      </button>

      <button type="button" class="preset-angle-btn" data-preset="front">
        <span class="angle-icon">📷</span>
        <span>Ön Görünüm</span>
      </button>

      <button type="button" class="preset-angle-btn" data-preset="side">
        <span class="angle-icon">📐</span>
        <span>Yan Görünüm</span>
      </button>

      <button type="button" class="preset-angle-btn" data-preset="back">
        <span class="angle-icon">🔄</span>
        <span>Arka Görünüm</span>
      </button>

      <button type="button" class="preset-angle-btn" data-preset="detail">
        <span class="angle-icon">🔍</span>
        <span>Yakın Detay</span>
      </button>

      <button type="button" class="capture-btn" id="captureAngleBtn">
        <span>📸 Fotoğraf Çek / İndir</span>
      </button>
    </div>
  `;
  root.appendChild(sideDock);

  const partsPanel = document.createElement('div');
  partsPanel.id = 'partsPanel';
  partsPanel.className = 'glass panel draggable-panel';
  root.appendChild(partsPanel);

  // 3. Create Contextual Floating Arc / Radial Menu
  const radialArc = document.createElement('div');
  radialArc.id = 'radialArcMenu';
  radialArc.className = 'draggable-panel';
  root.appendChild(radialArc);

  // Make panels draggable!
  makeDraggable(sideDock);
  makeDraggable(partsPanel);
  makeDraggable(radialArc);

  // Make panels resizable!
  makeResizable(sideDock, { minWidth: 68, minHeight: 80 });
  makeResizable(partsPanel, { minWidth: 180, minHeight: 140 });
  makeResizable(radialArc, { minWidth: 230, minHeight: 100 });

  // Make existing classic dock and panels draggable and resizable as well!
  const origDockWrap = document.getElementById('dockWrap');
  if (origDockWrap) {
    makeDraggable(origDockWrap);
    makeResizable(origDockWrap, { minWidth: 260, minHeight: 60 });
  }
  const summaryCard = document.getElementById('summaryCard');
  if (summaryCard) {
    makeDraggable(summaryCard);
    makeResizable(summaryCard, { minWidth: 200, minHeight: 120 });
  }
  const catalogPanel = document.getElementById('catalogPanel');
  if (catalogPanel) {
    makeDraggable(catalogPanel);
    makeResizable(catalogPanel, { minWidth: 280, minHeight: 180 });
  }

  // 4. Create UI Mode Toggle
  const modeToggle = document.createElement('button');
  modeToggle.id = 'uiModeToggle';
  modeToggle.type = 'button';
  modeToggle.className = 'glass';
  modeToggle.innerHTML = `
    <span class="mode-icon">✦</span>
    <span class="mode-text">Radial Arc Arayüzü</span>
  `;
  document.body.appendChild(modeToggle);

  // Toggle Mode Handler
  modeToggle.addEventListener('click', () => {
    isAltUiActive = !isAltUiActive;
    root.style.display = isAltUiActive ? 'block' : 'none';
    modeToggle.classList.toggle('active', isAltUiActive);
    modeToggle.querySelector('.mode-text').textContent = isAltUiActive ? 'Radial Arc Arayüzü' : 'Klasik Dock Arayüzü';

    if (origDockWrap) {
      origDockWrap.style.display = isAltUiActive ? 'none' : 'flex';
    }
  });

  if (origDockWrap) origDockWrap.style.display = 'none';

  // Toggle Camera Angle Dock Expansion on Logo Click
  const cameraLogoBtn = sideDock.querySelector('#cameraLogoBtn');
  cameraLogoBtn.addEventListener('click', () => {
    sideDock.classList.toggle('expanded');
  });

  // Camera Angle Preset Buttons Listener
  sideDock.querySelectorAll('.preset-angle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sideDock.querySelectorAll('.preset-angle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const preset = btn.dataset.preset;
      setCameraAngle(preset);
    });
  });

  // Capture Screenshot Button Listener
  const captureAngleBtn = sideDock.querySelector('#captureAngleBtn');
  captureAngleBtn.addEventListener('click', () => {
    downloadScreenshot();
  });

  // Render Parts Panel List
  function renderPartsPanel(state) {
    if (!state.parts || !state.parts.length) {
      partsPanel.innerHTML = '';
      return;
    }
    const lang = state.lang;
    const selectedId = state.selectedPartId;

    let itemsHtml = '';
    state.parts.forEach(part => {
      const name = partName(state.productId, part, lang);
      const isSelected = part.id === selectedId;
      const hex = assignmentHex(state.assignments[part.id], part);

      itemsHtml += `
        <div class="part-item ${isSelected ? 'active' : ''}" data-part-id="${part.id}">
          <span class="part-name">${name}</span>
          <span class="part-dot" style="background-color: ${hex};"></span>
        </div>
      `;
    });

    const isMin = partsPanel.classList.contains('is-minimized');
    partsPanel.innerHTML = `
      <div class="parts-panel-header drag-handle">
        <span class="lbl">${t('ui.parts', lang, 'Parçalar')}</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button type="button" class="minimize-btn" id="minimizePartsBtn" title="Küçült / Büyüt">${isMin ? '+' : '—'}</button>
          <span class="drag-grip-small">⋮⋮</span>
        </div>
      </div>
      <div class="parts-panel-list">${itemsHtml}</div>
    `;

    makeResizable(partsPanel, { minWidth: 140, minHeight: 80 });

    const minBtn = partsPanel.querySelector('#minimizePartsBtn');
    const headerEl = partsPanel.querySelector('.parts-panel-header');

    const toggleMinimize = (e) => {
      if (e) e.stopPropagation();
      partsPanel.classList.toggle('is-minimized');
      const nowMin = partsPanel.classList.contains('is-minimized');
      if (minBtn) minBtn.textContent = nowMin ? '+' : '—';
    };

    if (minBtn) minBtn.addEventListener('click', toggleMinimize);
    if (headerEl) {
      headerEl.addEventListener('click', (e) => {
        if (e.target.closest('#minimizePartsBtn') || e.target.closest('.drag-grip-small')) return;
        toggleMinimize(e);
      });
    }

    partsPanel.querySelectorAll('.part-item').forEach(el => {
      el.addEventListener('click', () => {
        const partId = el.dataset.partId;
        app.selectPart(partId, { zoom: true });
      });
    });
  }

  // Render Curved Radial Arc Options for Selected Part
  function renderRadialArc(state) {
    const selectedId = state.selectedPartId;
    if (!selectedId || !isAltUiActive) {
      radialArc.classList.add('hidden');
      return;
    }

    if (selectedId !== lastSelectedPartId) {
      lastSelectedPartId = selectedId;
      radialArc.dataset.isDragged = 'false';
    }

    const part = app.partById(selectedId);
    if (!part) {
      radialArc.classList.add('hidden');
      return;
    }

    const lang = state.lang;
    const category = part.category;
    const family = (COMPATIBILITY[category] || [])[0];
    const currentAssign = state.assignments[selectedId] || {};

    let textureRowHtml = '';
    let colorRowHtml = '';

    if (family === 'leather') {
      const currentType = currentAssign.type || LEATHER_TYPES[0].id;
      const currentColor = currentAssign.color || LEATHER_COLORS[0].id;

      textureRowHtml = `
        <div class="arc-row texture-row">
          <span class="arc-label">${t('ui.texture', lang, 'Doku')}</span>
          <div class="arc-chips">
            ${LEATHER_TYPES.map(type => `
              <button type="button" class="arc-chip ${type.id === currentType ? 'active' : ''}" data-action="type" data-value="${type.id}">
                ${type.name}
              </button>
            `).join('')}
          </div>
        </div>
      `;

      colorRowHtml = `
        <div class="arc-row color-row">
          <span class="arc-label">${t('ui.color', lang, 'Renk')}</span>
          <div class="arc-swatches">
            ${LEATHER_COLORS.map(color => `
              <button type="button" class="arc-swatch ${color.id === currentColor ? 'active' : ''}" data-action="color" data-value="${color.id}" style="background-color: ${color.hex};" title="${color.name}">
              </button>
            `).join('')}
          </div>
        </div>
      `;
    } else if (family === 'hardware') {
      const currentFinish = currentAssign.finish || HARDWARE_FINISHES[0].id;

      colorRowHtml = `
        <div class="arc-row color-row">
          <span class="arc-label">${t('ui.finish', lang, 'Finiş')}</span>
          <div class="arc-swatches">
            ${HARDWARE_FINISHES.map(finish => `
              <button type="button" class="arc-swatch ${finish.id === currentFinish ? 'active' : ''}" data-action="finish" data-value="${finish.id}" style="background-color: ${finish.hex};" title="${finish.name}">
              </button>
            `).join('')}
          </div>
        </div>
      `;
    } else if (family === 'thread') {
      const currentThread = currentAssign.thread || THREAD_COLORS[0].id;

      colorRowHtml = `
        <div class="arc-row color-row">
          <span class="arc-label">${t('ui.thread', lang, 'İplik')}</span>
          <div class="arc-swatches">
            ${THREAD_COLORS.map(thread => `
              <button type="button" class="arc-swatch ${thread.id === currentThread ? 'active' : ''}" data-action="thread" data-value="${thread.id}" style="background-color: ${thread.hex};" title="${thread.name}">
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    const pName = partName(state.productId, part, lang);
    radialArc.innerHTML = `
      <div class="arc-header drag-handle">
        <span class="arc-part-title">${pName}</span>
        <span class="drag-grip-small">⋮⋮</span>
      </div>
      <div class="arc-body">
        ${textureRowHtml}
        ${colorRowHtml}
      </div>
    `;

    radialArc.classList.remove('hidden');

    makeResizable(radialArc, { minWidth: 230, minHeight: 100 });

    radialArc.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const val = btn.dataset.value;

        if (action === 'type') {
          app.assign(selectedId, { group: 'leather', type: val, color: currentAssign.color || 'siyah' });
        } else if (action === 'color') {
          app.assign(selectedId, { group: 'leather', type: currentAssign.type || 'saffiano', color: val });
        } else if (action === 'finish') {
          app.assign(selectedId, { group: 'hardware', finish: val });
        } else if (action === 'thread') {
          app.assign(selectedId, { group: 'thread', thread: val });
        }
      });
    });
  }

  // Update Radial Arc Screen Position attached to 3D hotspot or center
  const projected = new THREE.Vector3();
  const _tempBox = new THREE.Box3();
  const _tempCenter = new THREE.Vector3();

  function updateRadialArcPosition() {
    if (!isAltUiActive || radialArc.classList.contains('hidden')) return;

    if (radialArc.dataset.isDragged === 'true') return;

    const state = app.store.get();
    const selectedId = state.selectedPartId;
    if (!selectedId) return;

    const part = app.partById(selectedId);
    if (!part || !part.meshes || !part.meshes.length) return;

    _tempBox.setFromObject(part.meshes[0]);
    for (let i = 1; i < part.meshes.length; i++) {
      if (part.meshes[i]) _tempBox.expandByObject(part.meshes[i]);
    }
    _tempBox.getCenter(_tempCenter);

    const camera = app.view.camera;
    projected.copy(_tempCenter).project(camera);

    if (projected.z > 1) {
      radialArc.style.opacity = '0';
      return;
    }
    radialArc.style.opacity = '1';

    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    let x = (projected.x * 0.5 + 0.5) * canvasWidth;
    let y = (-projected.y * 0.5 + 0.5) * canvasHeight;

    x = Math.max(20, Math.min(canvasWidth - 360, x + 30));
    y = Math.max(80, Math.min(canvasHeight - 260, y - 90));

    radialArc.style.left = `${x}px`;
    radialArc.style.top = `${y}px`;
  }

  // History dock button click handlers
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const centerBtn = document.getElementById('centerBtn');

  if (undoBtn) undoBtn.addEventListener('click', () => app.undo());
  if (redoBtn) redoBtn.addEventListener('click', () => app.redo());
  if (centerBtn) centerBtn.addEventListener('click', () => app.resetCamera());

  let prevSelectedPartId = null;

  // Subscribe to store updates
  app.store.subscribe(state => {
    if (state.selectedPartId && state.selectedPartId !== prevSelectedPartId) {
      prevSelectedPartId = state.selectedPartId;
      // Un-minimize partsPanel when a 3D model region is clicked/selected
      partsPanel.classList.remove('is-minimized');
      const minBtn = partsPanel.querySelector('#minimizePartsBtn');
      if (minBtn) minBtn.textContent = '—';
    }
    renderPartsPanel(state);
    renderRadialArc(state);
  });

  // Initial render
  renderPartsPanel(app.store.get());
  renderRadialArc(app.store.get());

  return { update: updateRadialArcPosition };
}
