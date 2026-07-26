import { PRICING } from './data.js';

/** Seçili malzemelerden fiyat anahtarlarının KÜMESİNİ çıkarır — küme olduğu
 *  için aynı malzeme kaç parçada kullanılırsa kullanılsın bir kez sayılır. */
export function upgradeKeys(assignments) {
  const keys = new Set();
  for (const a of Object.values(assignments)) {
    if (!a) continue;
    if (a.group === 'leather') {
      keys.add('leatherType.' + a.type);
      keys.add('leatherColor.' + a.color);
    } else if (a.group === 'hardware') {
      keys.add('hardware.' + a.finish);
    } else if (a.group === 'thread') {
      keys.add('thread.' + a.thread);
    }
  }
  return keys;
}

export function priceBreakdown(productId, assignments) {
  const base = PRICING.base[productId] ?? 0;
  const lines = [];
  for (const key of upgradeKeys(assignments)) {
    const u = PRICING.upgrades[key];
    if (u && u.amount > 0) lines.push({ key, label: u.label, amount: u.amount });
  }
  lines.sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label, 'tr'));
  const total = lines.reduce((sum, l) => sum + l.amount, base);
  return { base, lines, total };
}

export function formatTRY(n) {
  return '₺' + Math.round(n).toLocaleString('tr-TR');
}
