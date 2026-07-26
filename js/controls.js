import * as THREE from 'three';

/**
 * Blender-style "Orbit Around Selection" camera controller.
 *
 * Replaces OrbitControls, which calls camera.lookAt(target) on every
 * update() and therefore always pins the pivot to the centre of the
 * screen. That makes panning break orbiting: after a pan the camera/
 * target pair sits off in space, and rotating swings the model through
 * a wide arc instead of spinning it in place.
 *
 * Here, orbiting rotates the camera's position AND orientation by the
 * exact same quaternion around a pivot (the model's world bbox centre,
 * supplied by options.getPivot()). That keeps whatever is at the pivot
 * fixed on screen regardless of where the camera has been panned to.
 * lookAt() is never used in the orbit/pan/dolly paths — see the class
 * doc above for why that matters.
 *
 * Mouse mapping: LEFT drag = orbit, MIDDLE drag = pan, wheel = dolly.
 *
 * Touch mapping (Pointer Events, tracked separately from the mouse path
 * above so desktop behaviour is untouched): ONE finger drag = orbit,
 * TWO finger drag = pan, pinch (2-finger distance change) = dolly. All
 * three go through the exact same orbit()/pan()/dollyByScale() math and
 * emit the same start/change/end events, so hotspots.js and scene.js's
 * onCameraChange need no touch-specific handling.
 */

const ROTATE_SPEED = 0.0075;   // radians per pixel of drag, for both yaw and pitch
const ZOOM_SPEED = 1.0;        // wheel "notches" -> distance scale exponent
const POLE_EPSILON = 0.999;    // |forward·worldUp| above this = too close to the pole
const MIN_PIVOT_DISTANCE = 1e-6;

export function createControls(camera, domElement, options = {}) {
  const getPivot = typeof options.getPivot === 'function' ? options.getPivot : () => null;

  const api = {
    target: new THREE.Vector3(),
    minDistance: 0,
    maxDistance: Infinity,
  };

  const listeners = { start: [], change: [], end: [] };

  function addEventListener(type, fn) {
    if (!listeners[type]) listeners[type] = [];
    listeners[type].push(fn);
  }
  function removeEventListener(type, fn) {
    const arr = listeners[type];
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i !== -1) arr.splice(i, 1);
  }
  function emit(type) {
    for (const fn of listeners[type].slice()) fn({ type, target: api });
  }

  function currentPivot() {
    const p = getPivot();
    return p || api.target;
  }

  // ---- scratch objects, reused across calls to avoid per-frame allocation ----
  const _offset = new THREE.Vector3();
  const _qYaw = new THREE.Quaternion();
  const _qPitch = new THREE.Quaternion();
  const _q = new THREE.Quaternion();
  const _right = new THREE.Vector3();
  const _up = new THREE.Vector3();
  const _forward = new THREE.Vector3();
  const _testForward = new THREE.Vector3();
  const _worldUp = new THREE.Vector3(0, 1, 0);
  const _gesturePivot = new THREE.Vector3();

  /** Rotate the camera about `pivot` (fixed for the duration of the drag gesture). */
  function orbit(dx, dy, pivot) {
    const yaw = -dx * ROTATE_SPEED;
    const pitch = -dy * ROTATE_SPEED;

    _right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    _qYaw.setFromAxisAngle(_worldUp, yaw);
    _qPitch.setFromAxisAngle(_right, pitch);

    _q.copy(_qYaw).multiply(_qPitch);   // q = qYaw * qPitch

    // Would applying the pitch push the camera over a pole? Yaw about worldUp
    // never changes forward's dot with worldUp, so it's enough to test pitch alone.
    _forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    _testForward.copy(_forward).applyQuaternion(_qPitch);
    if (Math.abs(_testForward.dot(_worldUp)) > POLE_EPSILON) {
      _q.copy(_qYaw);   // drop pitch for this frame, keep yaw only
    }

    _offset.copy(camera.position).sub(pivot).applyQuaternion(_q);
    camera.position.copy(pivot).add(_offset);
    camera.quaternion.premultiply(_q);

    emit('change');
  }

  /** Translate the camera along its own right/up axes, scaled by distance & FOV. */
  function pan(dx, dy, pivot) {
    const distance = camera.position.distanceTo(pivot);
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const targetDistance = distance * Math.tan(vFov / 2);
    const height = domElement.clientHeight || 1;
    const scale = (2 * targetDistance) / height;

    _right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    _up.set(0, 1, 0).applyQuaternion(camera.quaternion);

    // Camera translates in the same screen-relative direction as the drag
    // (drag right -> camera moves toward +right -> static content shifts
    // left on screen, the standard "pan the camera" convention).
    camera.position.addScaledVector(_right, dx * scale);
    camera.position.addScaledVector(_up, -dy * scale);

    emit('change');
  }

  /**
   * Move the camera along its forward axis so the pivot distance is scaled
   * by `scale` (scale < 1 moves closer, > 1 moves farther), clamped to
   * [minDistance, maxDistance].
   */
  function dollyByScale(scale) {
    const pivot = currentPivot();
    _offset.copy(camera.position).sub(pivot);
    const distance = Math.max(_offset.length(), MIN_PIVOT_DISTANCE);

    const newDistance = THREE.MathUtils.clamp(distance * scale, api.minDistance, api.maxDistance);

    _forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(_forward, distance - newDistance);

    emit('change');
  }

  /** Wheel-notch dolly: each call is a fixed +/-5% step, independent of deltaY's magnitude. */
  function dolly(deltaY) {
    const zoomScale = Math.pow(0.95, ZOOM_SPEED);
    dollyByScale(deltaY < 0 ? zoomScale : 1 / zoomScale);
  }

  // ---- flyTo: hotspot/mesh tıklamasıyla tetiklenen dolly-e-doğru animasyonu
  // (Görev 2). Sürekli aktif bir sürükleme/başka flyTo ile AYNI karede
  // camera.position üzerinde çakışmamaları için tek bir rAF tutamacında
  // tutuluyor -- yeni bir flyTo ya da bir sürükleme başlarsa öncekini iptal
  // eder (bkz. cancelFlyTo çağrıları aşağıda onPointerDown/onTouchPointerDown/
  // onWheel içinde). ----
  let flyToRaf = null;

  function cancelFlyTo() {
    if (flyToRaf !== null) {
      cancelAnimationFrame(flyToRaf);
      flyToRaf = null;
      // flyTo() always emits 'start'; if we're cancelling a flight that was
      // actually in progress, that 'start' must be balanced with an 'end' or
      // consumers (hotspots.js's [data-dragging] fade) get stuck forever.
      // Only emitted when a flight was really running -- calling cancelFlyTo()
      // when nothing is flying (the common case, e.g. every onPointerDown)
      // must NOT emit a spurious 'end'.
      emit('end');
    }
  }

  /**
   * Kamerayı, YÖNÜNÜ (quaternion) DEĞİŞTİRMEDEN, `targetPoint`e doğru
   * `targetDistance` uzaklığa gelecek şekilde `duration` ms'de kaydırır
   * (dolly/truck -- lookAt() ASLA çağrılmaz, bu denetleyicinin genel
   * kuralına uygun). Uçuş boyunca her karede 'change' yayınlanır (hotspots.js
   * occlusion önbelleğini geçersiz kılmaya devam etsin diye), başında
   * 'start' ve bitişinde 'end' yayınlanır (sürüklemenin yaptığı gibi --
   * nokta soluklaşması burada da çalışsın diye).
   */
  function flyTo(targetPoint, targetDistance, duration = 450) {
    cancelFlyTo();

    const startPos = camera.position.clone();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const distance = THREE.MathUtils.clamp(targetDistance, api.minDistance, api.maxDistance);
    const endPos = new THREE.Vector3().copy(targetPoint).addScaledVector(forward, -distance);

    const start = performance.now();
    emit('start');

    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);   // ease-out (kübik)
      camera.position.lerpVectors(startPos, endPos, eased);
      emit('change');

      if (t < 1) {
        flyToRaf = requestAnimationFrame(step);
      } else {
        flyToRaf = null;
        emit('end');
      }
    }
    flyToRaf = requestAnimationFrame(step);
  }

  // ---- DOM event wiring ----
  let mode = null;   // null | 'orbit' | 'pan'  -- mouse gesture, driven by e.button
  let lastX = 0, lastY = 0;

  // ---- touch gesture state (tracked independently of the mouse `mode` above,
  // so a touchscreen laptop can't corrupt mouse behaviour and vice versa) ----
  const touchPoints = new Map();   // pointerId -> {x, y}, touch pointers only
  let touchMode = null;            // null | 'orbit' (1 finger) | 'gesture' (2 finger pan+pinch)
  let touchOrbitLastX = 0, touchOrbitLastY = 0;
  let touchLastMidX = 0, touchLastMidY = 0;
  let touchLastDist = 0;

  function touchMidAndDist() {
    const [a, b] = touchPoints.values();
    return {
      midX: (a.x + b.x) / 2,
      midY: (a.y + b.y) / 2,
      dist: Math.hypot(a.x - b.x, a.y - b.y),
    };
  }

  function onTouchPointerDown(e) {
    if (touchPoints.size >= 2) return;   // 3rd+ finger ignored, doesn't disturb the active gesture
    cancelFlyTo();   // yeni bir dokunma sürüklemesi devam eden bir flyTo'yu keser
    touchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.preventDefault();

    if (domElement.setPointerCapture) {
      try { domElement.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    domElement.addEventListener('pointermove', onPointerMove);
    domElement.addEventListener('pointerup', onPointerUp);
    domElement.addEventListener('pointercancel', onPointerUp);

    if (touchPoints.size === 1) {
      _gesturePivot.copy(currentPivot());
      touchOrbitLastX = e.clientX;
      touchOrbitLastY = e.clientY;
      touchMode = 'orbit';
      emit('start');
    } else if (touchPoints.size === 2) {
      _gesturePivot.copy(currentPivot());
      const { midX, midY, dist } = touchMidAndDist();
      touchLastMidX = midX; touchLastMidY = midY; touchLastDist = dist;
      touchMode = 'gesture';
    }
  }

  function onTouchPointerMove(e) {
    if (!touchPoints.has(e.pointerId)) return;
    touchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (touchMode === 'orbit' && touchPoints.size === 1) {
      const dx = e.clientX - touchOrbitLastX;
      const dy = e.clientY - touchOrbitLastY;
      touchOrbitLastX = e.clientX;
      touchOrbitLastY = e.clientY;
      if (dx !== 0 || dy !== 0) orbit(dx, dy, _gesturePivot);
    } else if (touchMode === 'gesture' && touchPoints.size === 2) {
      const { midX, midY, dist } = touchMidAndDist();
      const dx = midX - touchLastMidX;
      const dy = midY - touchLastMidY;
      touchLastMidX = midX; touchLastMidY = midY;
      if (dx !== 0 || dy !== 0) pan(dx, dy, _gesturePivot);

      // Proportional pinch (ratio of distances), NOT the wheel's fixed-step
      // dolly(): pointermove fires far more often than wheel notches, so
      // routing pinch through the fixed +/-5%-per-call step would make it
      // wildly oversensitive. dollyByScale still enforces the same clamps.
      if (touchLastDist > 0 && dist !== touchLastDist) {
        dollyByScale(touchLastDist / dist);
      }
      touchLastDist = dist;
    }
  }

  function onTouchPointerUp(e) {
    if (!touchPoints.has(e.pointerId)) return;
    touchPoints.delete(e.pointerId);
    if (domElement.releasePointerCapture) {
      try { domElement.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    }

    if (touchPoints.size === 0) {
      touchMode = null;
      domElement.removeEventListener('pointermove', onPointerMove);
      domElement.removeEventListener('pointerup', onPointerUp);
      domElement.removeEventListener('pointercancel', onPointerUp);
      emit('end');
    } else if (touchPoints.size === 1) {
      // Dropped from 2 fingers to 1: keep the gesture alive as an orbit,
      // re-baselined on the remaining finger's CURRENT position so there's
      // no jump (no 'start'/'end' emitted -- it's a continuous gesture).
      const [p] = touchPoints.values();
      touchOrbitLastX = p.x;
      touchOrbitLastY = p.y;
      _gesturePivot.copy(currentPivot());
      touchMode = 'orbit';
    }
  }

  function onPointerDown(e) {
    if (e.pointerType === 'touch') { onTouchPointerDown(e); return; }

    if (e.button === 0) mode = 'orbit';
    else if (e.button === 1) mode = 'pan';
    else return;

    cancelFlyTo();   // yeni bir fare sürüklemesi devam eden bir flyTo'yu keser
    e.preventDefault();
    lastX = e.clientX;
    lastY = e.clientY;
    _gesturePivot.copy(currentPivot());

    if (domElement.setPointerCapture) {
      try { domElement.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    domElement.addEventListener('pointermove', onPointerMove);
    domElement.addEventListener('pointerup', onPointerUp);
    emit('start');
  }

  function onPointerMove(e) {
    if (e.pointerType === 'touch') { onTouchPointerMove(e); return; }

    if (!mode) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    if (dx === 0 && dy === 0) return;

    if (mode === 'orbit') orbit(dx, dy, _gesturePivot);
    else if (mode === 'pan') pan(dx, dy, _gesturePivot);
  }

  function onPointerUp(e) {
    if (e.pointerType === 'touch') { onTouchPointerUp(e); return; }

    if (!mode) return;
    mode = null;
    if (domElement.releasePointerCapture) {
      try { domElement.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    domElement.removeEventListener('pointermove', onPointerMove);
    domElement.removeEventListener('pointerup', onPointerUp);
    emit('end');
  }

  function onWheel(e) {
    e.preventDefault();
    cancelFlyTo();   // tekerlek dolly'si de devam eden bir flyTo ile camera.position üzerinde çakışmasın
    dolly(e.deltaY);
  }

  function onContextMenu(e) {
    e.preventDefault();
  }

  domElement.addEventListener('pointerdown', onPointerDown);
  domElement.addEventListener('wheel', onWheel, { passive: false });
  domElement.addEventListener('contextmenu', onContextMenu);

  /** No damping/inertia in this controller — safe no-op kept for API parity. */
  function update() {}

  function dispose() {
    domElement.removeEventListener('pointerdown', onPointerDown);
    domElement.removeEventListener('wheel', onWheel);
    domElement.removeEventListener('contextmenu', onContextMenu);
    domElement.removeEventListener('pointermove', onPointerMove);
    domElement.removeEventListener('pointerup', onPointerUp);
    domElement.removeEventListener('pointercancel', onPointerUp);
  }

  api.addEventListener = addEventListener;
  api.removeEventListener = removeEventListener;
  api.update = update;
  api.dispose = dispose;
  api.flyTo = flyTo;
  // Exposed so app.js's mesh-pick handler can detect an in-progress
  // multi-touch gesture (I5 fix) without keeping its own duplicate pointerId
  // tracking -- this Map is the single source of truth for active touch points.
  api.getActiveTouchCount = () => touchPoints.size;

  return api;
}
