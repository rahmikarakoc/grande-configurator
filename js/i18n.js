/**
 * Saf sözlük + arama modülü — kendi durumu yok, app.js/store.js'e hiç bağımlı
 * değil (herhangi bir dosya doğrudan import edebilir). data.js'in Türkçe
 * string değerleri BURADA DEĞİŞTİRİLMEZ; bu, o değerlerin üzerine ek bir
 * çeviri katmanıdır — anahtarlar data.js'teki `id` alanlarını (ör. parça id,
 * deri tipi id) veya bu dosyaların kendi statik metinlerini birebir yansıtır.
 *
 * Kullanım: t('part.ana-govde', state.lang, dataDrivenTurkishFallback)
 * `fallback` genelde data.js'ten gelen ORİJİNAL Türkçe string'tir -- anahtar
 * sözlükte yoksa (ör. gelecekte data.js'e yeni bir id eklenip i18n.js
 * unutulursa) uygulama sessizce Türkçe'yi göstermeye devam eder, hiç boş
 * kalmaz.
 */
export const LANG = {
  tr: {
    /* ---- parça id'leri (PART_MAPS, isabel + purse, 13 benzersiz id) ---- */
    'part.ana-govde':     'Ana Gövde',
    'part.ust-parca':     'Üst Parça',
    'part.sag-yan-parca': 'Sağ Yan Parça',
    'part.sol-yan-parca': 'Sol Yan Parça',
    'part.taban-parcasi': 'Taban Parçası',
    'part.el-askisi':     'El Askısı',
    'part.fermuar-elcigi':'Fermuar Elciği',
    'part.fermuar-metali':'Fermuar Metali',
    'part.ust-bant':       'Üst Bant',
    'part.kemer':          'Kemerler',
    'part.deri-stoper':    'Deri Stoperler',
    'part.zincir':         'Zincir Askı',
    'part.fermuar':        'Fermuar Metali',
    'part.fermuar-serit':  'Fermuar Şeridi',
    'part.logo':           'Logo Plakası',
    'part.dikisler':       'Dikişler',
    'part.aski':           'Omuz Askısı',
    'part.kanca':          'Kanca',
    'part.kilit':          'Kilit',

    /* ---- ürüne göre ÇAKIŞAN id'ler ---- */
    'part.isabel.toka':    'Kemer Tokaları',
    'part.purse.toka':     'Toka',

    /* ---- deri tipleri ---- */
    'leatherType.saffiano': 'Saffiano',
    'leatherType.napa':     'Napa',
    'leatherType.nubuk':    'Nubuk',
    'leatherType.suet':     'Süet',

    /* ---- deri renkleri ---- */
    'leatherColor.siyah':    'Siyah',
    'leatherColor.taba':     'Taba',
    'leatherColor.kestane':  'Kestane',
    'leatherColor.bordo':    'Bordo',
    'leatherColor.lacivert': 'Lacivert',
    'leatherColor.krem':     'Krem',
    'leatherColor.gri':      'Gri',
    'leatherColor.kahve':    'Koyu Kahve',

    /* ---- donanım finişleri ---- */
    'hardware.altin':    'Altın',
    'hardware.gumus':    'Gümüş',
    'hardware.gunmetal': 'Gunmetal',
    'hardware.matsiyah': 'Mat Siyah',

    /* ---- iplik renkleri ---- */
    'thread.ton':   'Ton Sür Ton',
    'thread.krem':  'Kontrast Krem',
    'thread.bordo': 'Bordo',
    'thread.beyaz': 'Beyaz',

    /* ---- ürün adları (CATALOG + PART_MAPS) ---- */
    'product.bagg':   'Grande Bag',
    'product.isabel': 'Isabel',
    'product.purse':  'Purse',
    'product.elsa':   'Elsa',
    'product.mira':   'Mira',
    'product.lina':   'Lina',
    'product.nova':   'Nova',

    /* ---- ürün alt başlığı / title alanı (PART_MAPS) ---- */
    'productSub.bagg':   'Lüks Deri Çanta',
    'productSub.isabel': 'Kadın Çanta',
    'productSub.purse':  'Kadın Çanta',

    /* ---- katalog kategori adları ---- */
    'category.kadin-canta': 'Kadın Çanta',
    'category.omuz':        'Omuz Çantası',
    'category.clutch':      'Clutch',
    'category.sirt':        'Sırt Çantası',
    'category.cuzdan':      'Cüzdan',

    /* ---- "yakında" ürünlerin notları ---- */
    'soonNote.elsa': 'Deri · orta boy',
    'soonNote.mira': 'Süet · mini',
    'soonNote.lina': 'Napa · zincir askı',
    'soonNote.nova': 'Saffiano · ince',

    /* ---- statik arayüz metinleri ---- */
    'ui.products':          'Ürünler',
    'ui.productSummary':    'Ürün Özeti',
    'ui.takeScreenshot':    'Ekran Resmi',
    'ui.productInfo':       'Ürün Bilgisi',
    'ui.screenshotSaved':   'Ekran resmi indirildi ✨',
    'ui.undo':              'Geri Al',
    'ui.redo':              'İleri Al',
    'ui.center':            'Ortala',
    'ui.undone':            'Geri Alındı ↩',
    'ui.redone':            'İleri Alındı ↪',
    'ui.cameraReset':       'Ortalandı 🎯',
    'ui.texture':           'Doku',
    'ui.color':             'Renk',
    'ui.finish':            'Finiş',
    'ui.thread':            'İplik',
    'ui.category':          'Kategori',
    'ui.comingSoon':        'Yakında',
    'ui.parts':             'parça',
    'ui.productWord':       'ürün',
    'ui.hidePartsAria':     'Parçaları gizle',
    'ui.showAllPartsAria':  'Tüm parçaları göster',
    'ui.loadingModel':      'Model yükleniyor…',
    'ui.modelLoadFailed':   'Model yüklenemedi.',
    'ui.default':           'Varsayılan',
    'ui.yourConfiguration': 'Yapılandırman',
    'ui.copyLink':          'Bağlantıyı kopyala',
    'ui.downloadImage':     'Görseli indir'
  },

  en: {
    /* ---- part ids (PART_MAPS, isabel + purse, 13 unique ids) ---- */
    'part.ana-govde':     'Main Body',
    'part.ust-bant':       'Top Band',
    'part.kemer':          'Belts',
    'part.deri-stoper':    'Leather Stops',
    'part.zincir':         'Chain Strap',
    'part.fermuar':        'Zipper Hardware',
    'part.fermuar-serit':  'Zipper Tape',
    'part.logo':           'Logo Plate',
    'part.dikisler':       'Stitching',
    'part.aski':           'Shoulder Strap',
    'part.kanca':          'Hook',
    'part.kilit':          'Lock',

    /* ---- product-scoped COLLIDING ids -- see matching TR comment ---- */
    'part.isabel.toka':    'Belt Buckles',
    'part.purse.toka':     'Buckle',

    /* ---- leather types ---- */
    'leatherType.saffiano': 'Saffiano',
    'leatherType.napa':     'Napa',
    'leatherType.nubuk':    'Nubuck',
    'leatherType.suet':     'Suede',

    /* ---- leather colors ---- */
    'leatherColor.siyah':    'Black',
    'leatherColor.taba':     'Tan',
    'leatherColor.kestane':  'Chestnut',
    'leatherColor.bordo':    'Burgundy',
    'leatherColor.lacivert': 'Navy',
    'leatherColor.krem':     'Cream',
    'leatherColor.gri':      'Grey',
    'leatherColor.kahve':    'Dark Brown',

    /* ---- hardware finishes ---- */
    'hardware.altin':    'Gold',
    'hardware.gumus':    'Silver',
    'hardware.gunmetal': 'Gunmetal',
    'hardware.matsiyah': 'Matte Black',

    /* ---- thread colors ---- */
    'thread.ton':   'Tone-on-Tone',
    'thread.krem':  'Contrast Cream',
    'thread.bordo': 'Burgundy',
    'thread.beyaz': 'White',

    /* ---- product names (CATALOG + PART_MAPS) ---- */
    'product.isabel': 'Isabel',
    'product.purse':  'Purse',
    'product.elsa':   'Elsa',
    'product.mira':   'Mira',
    'product.lina':   'Lina',
    'product.nova':   'Nova',

    /* ---- product subtitle / title field (PART_MAPS) ---- */
    'productSub.isabel': "Women's Bag",
    'productSub.purse':  "Women's Bag",

    /* ---- catalog category names ---- */
    'category.kadin-canta': "Women's Bags",
    'category.omuz':        'Shoulder Bags',
    'category.clutch':      'Clutches',
    'category.sirt':        'Backpacks',
    'category.cuzdan':      'Wallets',

    /* ---- "coming soon" product notes ---- */
    'soonNote.elsa': 'Leather · mid size',
    'soonNote.mira': 'Suede · mini',
    'soonNote.lina': 'Napa · chain strap',
    'soonNote.nova': 'Saffiano · slim',

    /* ---- static UI copy ---- */
    'ui.products':          'Products',
    'ui.productSummary':    'Product Summary',
    'ui.texture':           'Texture',
    'ui.color':             'Color',
    'ui.finish':            'Finish',
    'ui.thread':            'Thread',
    'ui.category':          'Category',
    'ui.comingSoon':        'Coming soon',
    'ui.parts':             'parts',
    'ui.productWord':       'products',
    'ui.hidePartsAria':     'Hide parts',
    'ui.showAllPartsAria':  'Show all parts',
    'ui.loadingModel':      'Loading model…',
    'ui.modelLoadFailed':   'Model failed to load.',
    'ui.default':           'Default',
    'ui.yourConfiguration': 'Your Configuration',
    'ui.copyLink':          'Copy link',
    'ui.downloadImage':     'Download image'
  }
};

/**
 * `lang` sözlükte yoksa (ör. localStorage bozulmuşsa) veya anahtar o dilde
 * eksikse Türkçe'ye, o da yoksa çağıranın verdiği `fallback`'e (genelde
 * data.js'ten gelen orijinal string), o da yoksa anahtarın kendisine düşer --
 * hiçbir çağıran boş bir string görmez.
 */
export function t(key, lang, fallback) {
  return LANG[lang]?.[key] ?? LANG.tr[key] ?? fallback ?? key;
}

/**
 * Parça adı çevirisi için TEK giriş noktası (dock.js/hotspots.js/summary.js
 * hepsi bunu kullanır, doğrudan `t('part.'+id, ...)` çağırmaz) -- data.js'te
 * aynı `id` iki üründe farklı bir şey adlandırabiliyor (ör. 'toka'), bu
 * yüzden önce ÜRÜNE ÖZEL anahtar (`part.<productId>.<id>`) denenir; o yoksa
 * (çoğu id için, çünkü çakışma yok) genel `part.<id>`'e, o da yoksa
 * data.js'ten gelen orijinal isme düşülür. Tüm parça-adı lookup'ları bu
 * fonksiyondan geçmeli -- yalnızca çakışan id'yi değil, tutarlılığı korumak
 * için (bkz. final-review-batch2.md I1).
 */
export function partName(productId, part, lang) {
  return t(`part.${productId}.${part.id}`, lang, t(`part.${part.id}`, lang, part.name));
}
