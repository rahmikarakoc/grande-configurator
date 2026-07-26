/**
 * GLTFLoader node adlarını "sanitize" eder: nokta, köşeli parantez, iki nokta
 * ve slash SİLİNİR, boşluklar _ olur. Blender'daki "Bag.Isabel" sahnede
 * "BagIsabel" olarak gelir. Eşleme tablosunu okunabilir tutmak için her iki
 * tarafı da bu fonksiyondan geçiriyoruz.
 * (prototip/index.html:511-513'den birebir taşındı.)
 */
export function normName(name) {
  return (name || '').replace(/\s/g, '_').replace(/[\[\].:/]/g, '');
}

/** Parça tanımlarından normalize edilmiş node adı → parça id haritası kurar. */
export function buildNodeIndex(parts) {
  const index = new Map();
  for (const part of parts) {
    for (const node of part.nodes) index.set(normName(node), part.id);
  }
  return index;
}
