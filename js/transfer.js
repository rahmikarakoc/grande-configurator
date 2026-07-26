import { PART_MAPS, COMPATIBILITY } from './data.js';

/** Bir parça kategorisinin birincil malzeme ailesi (COMPATIBILITY'deki ilk giriş). */
function familyOf(category) {
  const families = COMPATIBILITY[category];
  return families && families.length ? families[0] : null;
}

/**
 * Ürün değişirken kullanıcının malzeme tercihlerini korur.
 * Parça kümeleri farklı olduğu için birebir kopyalama anlamsız; bunun yerine
 * her malzeme ailesinden ilk seçim alınıp yeni üründeki aynı aileye ait
 * TÜM parçalara uygulanır.
 *
 * `explicitPartIds` (opsiyonel 3. parametre) verildiğinde: sadece bu kümedeki
 * parça id'lerine ait atamalar "ilk seçim" adayı olabilir -- yüklemede
 * otomatik uygulanan varsayılan atamalar (kullanıcı hiç dokunmadı) aday bile
 * sayılmaz. Bir ailenin hiçbir açık (explicit) üyesi yoksa o aile için hiçbir
 * şey taşınmaz -- hedef ürünün kendi varsayılanı geçerli olur. Parametre hiç
 * verilmezse (undefined) davranış tıpatıp eskisiyle aynıdır (geriye dönük
 * uyumluluk -- mevcut 8 test bunu doğrular).
 */
export function transferConfig(fromAssignments, toProductId, explicitPartIds) {
  const def = PART_MAPS[toProductId];
  if (!def) return {};

  const pick = { leather: null, hardware: null, thread: null };
  for (const [partId, a] of Object.entries(fromAssignments || {})) {
    if (!a) continue;
    if (explicitPartIds && !explicitPartIds.has(partId)) continue;
    if (pick[a.group] === null && a.group in pick) pick[a.group] = a;
  }

  const out = {};
  for (const part of def.parts) {
    const family = familyOf(part.category);
    if (family && pick[family]) out[part.id] = { ...pick[family] };
  }
  return out;
}
