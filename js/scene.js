import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createControls } from './controls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MOBILE_BREAKPOINT_PX = 860;
const pixelRatioCap = () => (window.innerWidth <= MOBILE_BREAKPOINT_PX ? 1.5 : Math.min(window.devicePixelRatio, 2));

export function createScene(wrapEl) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,                    // CSS arka planı görünsün diye saydam
    preserveDrawingBuffer: true,    // görsel indirme için şart
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(pixelRatioCap());
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  // Realtime shadowMap is disabled for 60+ FPS GPU performance
  renderer.shadowMap.enabled = false;

  wrapEl.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);

  let pivotGroup = null;
  let cachedPivotCenter = new THREE.Vector3();

  // Instant O(1) cached pivot center return instead of traversing bbox on every drag pixel
  const controls = createControls(camera, renderer.domElement, {
    getPivot: () => (pivotGroup ? cachedPivotCenter : null)
  });
  controls.minDistance = 0.55;
  controls.maxDistance = 20;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment(renderer);
  scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
  roomEnv.dispose();

  // Optimized Key Light
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 5, 4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(-4, 2, -3);
  scene.add(fill);

  // High-performance procedural contact shadow texture for soft studio ground shadow
  function createContactShadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);

    const grad = ctx.createRadialGradient(256, 256, 10, 256, 256, 256);
    grad.addColorStop(0, 'rgba(15, 12, 10, 0.48)');
    grad.addColorStop(0.25, 'rgba(25, 20, 18, 0.30)');
    grad.addColorStop(0.6, 'rgba(40, 35, 30, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  const contactShadowMat = new THREE.MeshBasicMaterial({
    map: createContactShadowTexture(),
    transparent: true,
    opacity: 0.68,
    depthWrite: false
  });
  const contactShadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), contactShadowMat);
  contactShadowMesh.rotation.x = -Math.PI / 2;
  contactShadowMesh.position.y = 0.002;
  scene.add(contactShadowMesh);

  function resize() {
    const w = wrapEl.clientWidth, h = wrapEl.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(pixelRatioCap());
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(wrapEl);
  resize();

  const loader = new GLTFLoader();

  function loadModel(file, onProgress) {
    return new Promise((resolve, reject) => {
      loader.load(
        file,
        gltf => resolve(gltf.scene),
        evt => {
          if (onProgress) {
            if (evt.total && evt.total > 0) onProgress(evt.loaded / evt.total);
            else onProgress(1.0);
          }
        },
        reject
      );
    });
  }

  function disposeModel(group) {
    if (!group) return;
    const disposedTextures = new Set();
    group.traverse(o => {
      if (!o.isMesh) return;
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(m => {
        if (!m) return;
        Object.values(m).forEach(value => {
          if (value && value.isTexture && !disposedTextures.has(value)) {
            disposedTextures.add(value);
            value.dispose();
          }
        });
        m.dispose();
      });
    });
    scene.remove(group);
  }

  function frameModel(group) {
    pivotGroup = group;

    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Cache center for O(1) orbit controls pivot lookup
    cachedPivotCenter.copy(center);

    group.position.sub(center);
    group.position.y += size.y / 2;

    // Scale and position soft contact shadow under bottom base
    contactShadowMesh.scale.set(size.x * 1.35, size.z * 1.35, 1);
    contactShadowMesh.position.set(0, 0.002, 0);

    const isMobile = window.innerWidth <= 860;
    const distMult = isMobile ? 1.75 : 1.35;

    const dist = radius / (2 * Math.tan((camera.fov * Math.PI) / 360)) * distMult;
    camera.position.set(dist * 0.55, size.y * 0.65 + radius * 0.15, dist * 0.85);
    controls.target.set(0, size.y * 0.45, 0);
    camera.near = radius / 200;
    camera.far = radius * 60;
    camera.updateProjectionMatrix();

    camera.lookAt(controls.target);
    controls.update();
  }

  function onCameraChange(fn) {
    controls.addEventListener('change', fn);
    return () => controls.removeEventListener('change', fn);
  }

  function render() {
    controls.update();
    renderer.render(scene, camera);
  }

  return { scene, camera, controls, renderer,
           loadModel, disposeModel, frameModel, onCameraChange, render };
}
