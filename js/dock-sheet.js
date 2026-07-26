const TAP_THRESHOLD = 5;

export function initDockSheet(dockEl, handleEl, app) {
  if (!dockEl || !handleEl) return;

  let startY = null;
  const dockWrap = dockEl.closest('#dockWrap') || dockEl;

  // Add click & drag handlers to handleEl
  handleEl.addEventListener('pointerdown', e => {
    startY = e.clientY;
    if (handleEl.setPointerCapture) {
      try { handleEl.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
  });

  handleEl.addEventListener('pointerup', e => {
    if (startY === null) return;
    const dy = e.clientY - startY;
    startY = null;

    if (Math.abs(dy) < TAP_THRESHOLD) {
      app.store.set(prev => ({ ...prev, dockCollapsed: !prev.dockCollapsed }));
    } else if (dy > 0) {
      app.store.set({ dockCollapsed: true });   // dragged down
    } else {
      app.store.set({ dockCollapsed: false });  // dragged up
    }
  });

  // Subscribe to store state
  app.store.subscribe(state => {
    const isCollapsed = Boolean(state.dockCollapsed);
    dockEl.dataset.collapsed = String(isCollapsed);
    if (dockWrap) {
      dockWrap.dataset.collapsed = String(isCollapsed);
      if (isCollapsed) {
        dockWrap.classList.add('is-collapsed');
      } else {
        dockWrap.classList.remove('is-collapsed');
      }
    }
  });

  const initialCollapsed = Boolean(app.store.get().dockCollapsed);
  dockEl.dataset.collapsed = String(initialCollapsed);
  if (dockWrap) {
    dockWrap.dataset.collapsed = String(initialCollapsed);
    if (initialCollapsed) dockWrap.classList.add('is-collapsed');
  }
}
