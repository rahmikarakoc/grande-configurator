export const COMPATIBILITY = {
  body: ['leather'],
  lining: ['leather'],
  detail: ['leather', 'hardware'],
  hardware: ['hardware'],
  stitching: ['thread']
};

export const LEATHER_TYPES = [
  { id:'waxy_pullup', name:'Waxy Pull-Up', roughness:0.45, clearcoat:0.20, bumpMap:'assets/textures/leather/leather-001_1_b.jpg', roughnessMap:'assets/textures/leather/leather-001_1_r.jpg', repeat:[3.2, 3.2] },
  { id:'pelle_first', name:'Pelle First',  roughness:0.38, clearcoat:0.30, normalMap:'assets/textures/leather/Pelle-First-4083-Normal.jpg', roughnessMap:'assets/textures/leather/Pelle-First-4083-Specular.jpg', repeat:[3.2, 3.2] },
  { id:'pelle_b',     name:'Pelle B Grain',roughness:0.42, clearcoat:0.25, normalMap:'assets/textures/leather/4-Pelle-B------col-3157-Front-Normal.jpg', roughnessMap:'assets/textures/leather/4-Pelle-B------col-3157-Front-Specular.jpg', repeat:[3.2, 3.2] },
  { id:'saffiano',    name:'Saffiano',     roughness:0.52, clearcoat:0.25, repeat:[3.2, 3.2] },
  { id:'napa',        name:'Napa',         roughness:0.40, clearcoat:0.35, repeat:[3.2, 3.2] },
  { id:'nubuk',       name:'Nubuk',        roughness:0.86, clearcoat:0.00, repeat:[3.2, 3.2] },
  { id:'suet',        name:'Süet',         roughness:0.95, clearcoat:0.00, repeat:[3.2, 3.2] }
];

export const LEATHER_COLORS = [
  { id:'siyah',       name:'Siyah',          hex:'#17150f', map:'assets/textures/leather/leather-001_1-zeus_d.jpg' },
  { id:'black_olive', name:'Siyah Zeytin',   hex:'#2b2d28', map:'assets/textures/leather/leather-001_1-black-olive_d.jpg' },
  { id:'cappuccino',  name:'Kapuçino',       hex:'#866b57', map:'assets/textures/leather/leather-001_1-cappu_d.jpg' },
  { id:'kestane',     name:'Kestane',        hex:'#583226', map:'assets/textures/leather/leather-001_1-chestnut_d.jpg' },
  { id:'derby',       name:'Derby Kahve',    hex:'#422e23', map:'assets/textures/leather/leather-001_1-derby_d.jpg' },
  { id:'honey',       name:'Bal Rengi',      hex:'#b67b45', map:'assets/textures/leather/leather-001_1-honey_d.jpg' },
  { id:'peat',        name:'Koyu Taba',      hex:'#3b322b', map:'assets/textures/leather/leather-001_1-peat_d.jpg' },
  { id:'slade',       name:'Slade Deri',     hex:'#5c4a3d', map:'assets/textures/leather/leather-001_1-slade_d.jpg' },
  { id:'terra',       name:'Kiremit',        hex:'#7c3d2b', map:'assets/textures/leather/leather-001_1-terra_d.jpg' },
  { id:'tobago',      name:'Tobago Kahve',   hex:'#3e2820', map:'assets/textures/leather/leather-001_1-tobago_d.jpg' },
  { id:'pelle_bordo', name:'Pelle Bordo',    hex:'#5c1f28', map:'assets/textures/leather/Pelle-First-4083-color.jpg' },
  { id:'pelle_taba',  name:'Pelle Taba',     hex:'#8a5a38', map:'assets/textures/leather/Pelle-First-col-4082-Color.jpg' },
  { id:'pelle_krem',  name:'Pelle Krem',     hex:'#d8c9b0', map:'assets/textures/leather/3-Pelle-First-col-4081-Front-Color.jpg' },
  { id:'pelle_siyah', name:'Pelle Siyah',    hex:'#181818', map:'assets/textures/leather/4-Pelle-B------col-3157-Front-Color.jpg' },
  { id:'pelle_lacivert', name:'Pelle Lacivert', hex:'#202634', map:'assets/textures/leather/4-Pelle-B------col-3158-Front-Color.jpg' },
  { id:'lacivert',    name:'Lacivert',       hex:'#22282f' },
  { id:'gri',         name:'Gri',            hex:'#4a4a4a' }
];

export const HARDWARE_FINISHES = [
  { id:'altin',    name:'Altın',     hex:'#c9a227', roughness:0.22 },
  { id:'gumus',    name:'Gümüş',     hex:'#c3c7cc', roughness:0.18 },
  { id:'gunmetal', name:'Gunmetal',  hex:'#585d64', roughness:0.34 },
  { id:'matsiyah', name:'Mat Siyah', hex:'#24262b', roughness:0.58 }
];

export const THREAD_COLORS = [
  { id:'ton',   name:'Ton Sür Ton',   hex:'#2a2620' },
  { id:'krem',  name:'Kontrast Krem', hex:'#d9c9a8' },
  { id:'bordo', name:'Bordo',         hex:'#6b2430' },
  { id:'beyaz', name:'Beyaz',         hex:'#e8e4dc' }
];

export const DEFAULTS = {
  leatherType: 'pelle_first',
  leatherColor: 'siyah',
  hardware: 'gumus',
  thread: 'ton'
};

export const PART_MAPS = {
  isabel: {
    file: 'models/isabel.glb',
    title: 'Kadın Çanta',
    sku: 'ISABEL-01',
    parts: [
      { id:'ana-govde',     name:'Ana Gövde',      category:'body',      primary:true,
        nodes:['Bag.Isabel'] },
      { id:'ust-bant',      name:'Üst Bant',       category:'body',
        nodes:['Bands.Top'] },
      { id:'kemer',         name:'Kemerler',       category:'body',      primary:true,
        nodes:['Belt.L','Belt.R'] },
      { id:'deri-stoper',   name:'Deri Stoperler', category:'detail',
        nodes:['Leather.Stops'] },
      { id:'toka',          name:'Kemer Tokaları', category:'hardware',  primary:true,
        nodes:['Belt.Buckle','PinL','PinR','NurbsCircle.L','NurbsCircle.R'] },
      { id:'zincir',        name:'Zincir Askı',    category:'hardware',  primary:true,
        nodes:['Chain.HalfRound','CubanLink.L','CubanLink.R','Wire'] },
      { id:'fermuar',       name:'Fermuar Metali', category:'hardware',
        nodes:['Zipper.Wagon','Zipper.Teeth','Zipper.Puller','Zipper.Wagon2','Zipper.Teeth2','Zipper.Puller2','NurbsCircle','NurbsCircle2'] },
      { id:'fermuar-serit', name:'Fermuar Şeridi', category:'detail',
        nodes:['Zipper.Ribbon','Zipper.Ribbon2'] },
      { id:'logo',          name:'Logo Plakası',   category:'detail',
        nodes:['Elsje-S'] },
      { id:'dikisler',      name:'Dikişler',       category:'stitching', primary:true,
        nodes:['Bag.Stitches','Bands.Top.Stitch','Belt.Stitches.L','Belt.Stitches.R'] }
    ]
  },
  purse: {
    file: 'models/purse.glb',
    title: 'Kadın Çanta',
    sku: 'PURSE-01',
    parts: [
      { id:'ana-govde', name:'Ana Gövde',    category:'body',     primary:true, nodes:['main'] },
      { id:'aski',      name:'Omuz Askısı',  category:'body',     primary:true, nodes:['strap'] },
      { id:'toka',      name:'Toka',         category:'hardware', primary:true, nodes:['buckle'] },
      { id:'kanca',     name:'Kanca',        category:'hardware', primary:true, nodes:['hook'] },
      { id:'kilit',     name:'Kilit',        category:'hardware', primary:true, nodes:['lock'] }
    ]
  },
  bagg: {
    file: 'models/bagg.glb',
    title: 'Grande Lüks Çanta',
    sku: 'GRANDE-BAG-01',
    rotationY: Math.PI, // 180 degrees Y-rotation to face front camera
    parts: [
      { id:'ust-parca',       name:'Üst Parça',       category:'body',      primary:true,  nodes:['Üst_parça'] },
      { id:'sag-yan-parca',   name:'Sağ Yan Parça',   category:'body',      primary:true,  nodes:['Sağ_parça'] },
      { id:'sol-yan-parca',   name:'Sol Yan Parça',   category:'body',      primary:true,  nodes:['sol_parça'] },
      { id:'taban-parcasi',   name:'Taban Parçası',   category:'body',      primary:true,  nodes:['Taban_parça'] },
      { id:'el-askisi',       name:'El Askısı',       category:'body',      primary:true,  nodes:['Askılık'] },
      { id:'fermuar-elcigi',  name:'Fermuar Elciği',  category:'detail',    primary:true,  nodes:['Fermuar_Elcik'] },
      { id:'fermuar-serit',   name:'Fermuar Şeridi',  category:'detail',    primary:false, nodes:['Fermuar_Şerit'] },
      { id:'fermuar-metali',  name:'Fermuar Metali',  category:'hardware',  primary:true,  nodes:['Fermuar_Diş', 'Fermuar_kürsor', 'Fermuar_kürsör'] },
      { id:'logo',            name:'Logo Plakası',   category:'hardware',  primary:true,  nodes:['Grande_logo'] },
      { id:'dikisler',        name:'Dikişler',       category:'stitching', primary:true,  nodes:['Askılık_ip', 'Sağ_ve_sol_parça_ipileri', 'Taban_ip', 'Üst_parça_ipi', 'Fermuar_tutacağı_ipi'] }
    ]
  }
};

export const CATALOG = [
  { id:'kadin-canta', name:'Kadın Çanta', products:[
    { id:'bagg',   name:'Grande Bag' },
    { id:'isabel', name:'Isabel' },
    { id:'purse',  name:'Purse' },
    { id:'elsa',   name:'Elsa', soon:true, note:'Deri · orta boy' },
    { id:'mira',   name:'Mira', soon:true, note:'Süet · mini' }
  ]},
  { id:'omuz', name:'Omuz Çantası', products:[
    { id:'lina', name:'Lina', soon:true, note:'Napa · zincir askı' }
  ]},
  { id:'clutch', name:'Clutch', products:[
    { id:'nova', name:'Nova', soon:true, note:'Saffiano · ince' }
  ]},
  { id:'sirt',   name:'Sırt Çantası', products:[] },
  { id:'cuzdan', name:'Cüzdan',       products:[] }
];

export const PRICING = {
  base: { bagg: 15800, isabel: 12900, purse: 8400 },
  upgrades: {
    'leatherType.napa':      { label:'Napa deri',         amount:900 },
    'leatherType.nubuk':     { label:'Nubuk deri',        amount:600 },
    'leatherType.suet':      { label:'Süet deri',         amount:600 },
    'leatherColor.bordo':    { label:'Bordo özel renk',   amount:300 },
    'leatherColor.lacivert': { label:'Lacivert özel renk',amount:300 },
    'hardware.altin':        { label:'Altın donanım',     amount:750 },
    'hardware.gunmetal':     { label:'Gunmetal donanım',  amount:350 },
    'hardware.matsiyah':     { label:'Mat siyah donanım', amount:350 },
    'thread.krem':           { label:'Kontrast dikiş',    amount:300 }
  }
};
