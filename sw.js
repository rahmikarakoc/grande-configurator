// Kasıtlı olarak minimal: yalnızca yükleme koşulunu sağlamak için var.
// Agresif önbellekleme YAPMAZ -- proje sık güncelleniyor, bayat bir sürümü
// kullanıcının elinde bırakmak istemiyoruz. Ağ isteklerine dokunmadan geçer.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});  // pass-through -- override etmeden geçsin
