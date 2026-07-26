import {
  PART_MAPS, COMPATIBILITY,
  LEATHER_TYPES, LEATHER_COLORS, HARDWARE_FINISHES, THREAD_COLORS
} from './data.js';

const has = (list, id) => list.some(x => x.id === id);

export function serializeConfig(productId, assignments) {
  const p = new URLSearchParams();
  p.set('m', productId);
  for (const [partId, a] of Object.entries(assignments)) {
    if (!a) continue;
    if (a.group === 'leather')       p.set(partId, `L.${a.type}.${a.color}`);
    else if (a.group === 'hardware') p.set(partId, `H.${a.finish}`);
    else if (a.group === 'thread')   p.set(partId, `T.${a.thread}`);
  }
  // URLSearchParams noktayı kodlamaz; hash okunabilir kalır.
  return '#' + p.toString();
}

function decodeAssignment(value, partCategory, partId, warn) {
  const allowed = COMPATIBILITY[partCategory] || [];
  const bits = value.split('.');
  if (bits[0] === 'L' && bits.length === 3) {
    if (!allowed.includes('leather')) {
      warn(`URL: "${partId}" deri kabul etmiyor, atlandı`); return null;
    }
    if (!has(LEATHER_TYPES, bits[1]) || !has(LEATHER_COLORS, bits[2])) {
      warn(`URL: "${partId}" için geçersiz deri "${value}", varsayılana düşüldü`); return null;
    }
    return { group:'leather', type:bits[1], color:bits[2] };
  }
  if (bits[0] === 'H' && bits.length === 2) {
    if (!allowed.includes('hardware')) {
      warn(`URL: "${partId}" donanım kabul etmiyor, atlandı`); return null;
    }
    if (!has(HARDWARE_FINISHES, bits[1])) {
      warn(`URL: "${partId}" için geçersiz finiş "${value}", varsayılana düşüldü`); return null;
    }
    return { group:'hardware', finish:bits[1] };
  }
  if (bits[0] === 'T' && bits.length === 2) {
    if (!allowed.includes('thread')) {
      warn(`URL: "${partId}" iplik kabul etmiyor, atlandı`); return null;
    }
    if (!has(THREAD_COLORS, bits[1])) {
      warn(`URL: "${partId}" için geçersiz iplik "${value}", varsayılana düşüldü`); return null;
    }
    return { group:'thread', thread:bits[1] };
  }
  warn(`URL: "${partId}" için tanınmayan değer "${value}"`);
  return null;
}

export function parseConfig(hash, warn = console.warn) {
  const raw = (hash || '').replace(/^#/, '');
  if (!raw) return { productId: null, assignments: {} };

  const p = new URLSearchParams(raw);
  const productId = p.get('m');
  const def = productId ? PART_MAPS[productId] : null;
  if (!def) {
    if (productId) warn(`URL: bilinmeyen ürün "${productId}"`);
    return { productId: null, assignments: {} };
  }

  const byId = new Map(def.parts.map(x => [x.id, x]));
  const assignments = {};
  for (const [key, value] of p) {
    if (key === 'm') continue;
    const part = byId.get(key);
    if (!part) { warn(`URL: bilinmeyen parça "${key}" yok sayıldı`); continue; }
    const a = decodeAssignment(value, part.category, key, warn);
    if (a) assignments[key] = a;
  }
  return { productId, assignments };
}
