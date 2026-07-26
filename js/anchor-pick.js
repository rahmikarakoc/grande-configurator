/**
 * Görünür çapa adayını seçer. Yapışkandır: mevcut aday hâlâ görünüyorsa
 * korunur, böylece kamera dönerken nokta adaydan adaya zıplamaz.
 * @returns seçilen adayın indeksi, hiçbiri görünmüyorsa -1
 */
export function pickAnchor(candidates, isVisible, currentIndex) {
  if (!candidates.length) return -1;

  if (currentIndex >= 0 && currentIndex < candidates.length
      && isVisible(candidates[currentIndex])) {
    return currentIndex;
  }
  for (let i = 0; i < candidates.length; i++) {
    if (isVisible(candidates[i])) return i;
  }
  return -1;
}
