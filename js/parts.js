import * as THREE from 'three';
import { normName, buildNodeIndex } from './naming.js';
import {
  PART_MAPS, COMPATIBILITY, DEFAULTS,
  LEATHER_TYPES, LEATHER_COLORS, HARDWARE_FINISHES, THREAD_COLORS
} from './data.js';

// High-performance texture cache manager with consistent texture scaling
const textureCache = new Map();
const textureLoader = new THREE.TextureLoader();

function loadTexture(path, repeat = [3.2, 3.2]) {
  if (!path) return null;
  const rx = repeat[0] || 3.2;
  const ry = repeat[1] || 3.2;
  const key = `${path}::${rx}x${ry}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const tex = textureLoader.load(path);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  textureCache.set(key, tex);
  return tex;
}

/**
 * Her mesh için, kendisinden yukarı doğru en YAKIN eşleşen node adını bulur.
 * Böylece alt-node'lar (ör. Belt.L'in çocuğu PinL) doğru parçaya gider.
 */
export function resolveParts(group, productId) {
  const def = PART_MAPS[productId];
  const nodeToPart = buildNodeIndex(def.parts);

  const parts = def.parts.map(p => ({
    id: p.id, name: p.name, category: p.category, primary: !!p.primary,
    meshes: [], materials: [], baseHex: '#999999'
  }));
  const byId = new Map(parts.map(p => [p.id, p]));
  const unmapped = [];

  group.traverse(obj => {
    if (!obj.isMesh) return;

    let node = obj, partId = null;
    while (node) {
      const key = normName(node.name);
      if (key && nodeToPart.has(key)) { partId = nodeToPart.get(key); break; }
      node = node.parent;
    }
    if (!partId) { unmapped.push(obj.name || '(isimsiz)'); return; }

    const part = byId.get(partId);
    part.meshes.push(obj);

    // Klonlama: paylaşılan materyal tek parçaya atama yapınca hepsini değiştirmesin
    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map(m => m.clone());
      obj.material.forEach(m => part.materials.push(m));
    } else {
      obj.material = obj.material.clone();
      part.materials.push(obj.material);
    }
  });

  const resolved = parts.filter(p => p.meshes.length > 0);
  if (unmapped.length) console.warn('Eşlenmemiş meshler:', unmapped);

  normalizePbr(resolved);
  return resolved;
}

/** glTF'teki hatalı PBR değerlerini kategoriye göre düzeltir. */
function normalizePbr(parts) {
  for (const part of parts) {
    for (const m of part.materials) {
      if (part.category === 'hardware') {
        m.metalness = 1.0;
        if (m.roughness > 0.8) m.roughness = 0.3;
      } else {
        m.metalness = 0.0;                 // deri / astar / dikiş metal değildir
        if (m.roughness < 0.25) m.roughness = 0.5;
      }
    }
    part.baseHex = '#' + (part.materials[0]?.color?.getHexString() || '999999');
  }
}

const find = (list, id) => list.find(x => x.id === id);

export function defaultAssignmentFor(category) {
  const family = (COMPATIBILITY[category] || [])[0];
  if (family === 'leather')  return { group:'leather', type:DEFAULTS.leatherType, color:DEFAULTS.leatherColor };
  if (family === 'hardware') return { group:'hardware', finish:DEFAULTS.hardware };
  if (family === 'thread')   return { group:'thread', thread:DEFAULTS.thread };
  return null;
}

export function assignmentHex(assignment, part) {
  if (!assignment) return part ? part.baseHex : '#999999';
  if (assignment.group === 'leather')  return find(LEATHER_COLORS, assignment.color)?.hex ?? '#999999';
  if (assignment.group === 'hardware') return find(HARDWARE_FINISHES, assignment.finish)?.hex ?? '#999999';
  if (assignment.group === 'thread')   return find(THREAD_COLORS, assignment.thread)?.hex ?? '#999999';
  return '#999999';
}

export function applyAssignment(part, assignment) {
  if (!assignment) return;

  if (assignment.group === 'leather') {
    const type = find(LEATHER_TYPES, assignment.type);
    const color = find(LEATHER_COLORS, assignment.color);
    if (!type || !color) return;

    const repeat = type.repeat || [3.2, 3.2];
    const mapTex = color.map ? loadTexture(color.map, repeat) : null;
    const bumpTex = type.bumpMap ? loadTexture(type.bumpMap, repeat) : null;
    const normalTex = type.normalMap ? loadTexture(type.normalMap, repeat) : null;
    const roughTex = type.roughnessMap ? loadTexture(type.roughnessMap, repeat) : null;

    for (const m of part.materials) {
      const hadMap = m.map !== mapTex;
      const hadBump = m.bumpMap !== bumpTex;
      const hadNormal = m.normalMap !== normalTex;
      const hadRough = m.roughnessMap !== roughTex;

      m.map = mapTex;
      m.bumpMap = bumpTex;
      if (bumpTex) m.bumpScale = 0.04;
      m.normalMap = normalTex;
      if (normalTex && m.normalScale) m.normalScale.set(0.65, 0.65);
      m.roughnessMap = roughTex;

      m.color.set(color.hex);
      m.metalness = 0;
      m.roughness = type.roughness;
      if ('clearcoat' in m) m.clearcoat = type.clearcoat;

      if (hadMap || hadBump || hadNormal || hadRough) m.needsUpdate = true;
    }
    return;
  }

  if (assignment.group === 'hardware') {
    const f = find(HARDWARE_FINISHES, assignment.finish);
    if (!f) return;
    for (const m of part.materials) {
      const hadMap = m.map !== null;
      const hadBump = m.bumpMap !== null;
      const hadNormal = m.normalMap !== null;

      m.map = null;
      m.bumpMap = null;
      m.normalMap = null;
      m.roughnessMap = null;

      m.color.set(f.hex);
      m.metalness = 1;
      m.roughness = f.roughness;

      if (hadMap || hadBump || hadNormal) m.needsUpdate = true;
    }
    return;
  }

  if (assignment.group === 'thread') {
    const t = find(THREAD_COLORS, assignment.thread);
    if (!t) return;
    for (const m of part.materials) {
      const hadMap = m.map !== null;
      const hadBump = m.bumpMap !== null;
      const hadNormal = m.normalMap !== null;

      m.map = null;
      m.bumpMap = null;
      m.normalMap = null;
      m.roughnessMap = null;

      m.color.set(t.hex);
      m.metalness = 0;
      m.roughness = 0.75;

      if (hadMap || hadBump || hadNormal) m.needsUpdate = true;
    }
  }
}

/**
 * Seçim geri bildirimi: KALICI boya değil, ~300 ms'de sönümlenen bir darbe.
 */
const PULSE_MS = 300;
const PULSE_COLOR = new THREE.Color('#ffffff');

const activePulses = new WeakMap();

export function pulseSelection(part) {
  const existing = activePulses.get(part);
  let saved;

  if (existing) {
    cancelAnimationFrame(existing.raf);
    saved = existing.saved;
  } else {
    const targets = part.materials.filter(m => m && m.emissive);
    if (!targets.length) return;
    saved = targets.map(m => ({
      m, color: m.emissive.clone(), intensity: m.emissiveIntensity ?? 1
    }));
  }

  const start = performance.now();

  function step(now) {
    const t = Math.min((now - start) / PULSE_MS, 1);
    const eased = 1 - t * t;
    for (const s of saved) {
      s.m.emissive.copy(PULSE_COLOR);
      s.m.emissiveIntensity = 0.35 * eased;
    }
    if (t < 1) {
      const raf = requestAnimationFrame(step);
      activePulses.set(part, { raf, saved });
      return;
    }
    for (const s of saved) {
      s.m.emissive.copy(s.color);
      s.m.emissiveIntensity = s.intensity;
    }
    activePulses.delete(part);
  }
  const raf = requestAnimationFrame(step);
  activePulses.set(part, { raf, saved });
}
