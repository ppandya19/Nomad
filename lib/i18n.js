// Central strings for the 6 test locales. t() falls back to English for
// missing entries; fmt fills {slots}. Place and collection names, cuisine
// names, and Google-rating labels stay untranslated by design.
export const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
];

export const LANG_NAMES = { en: 'English', zh: 'Mandarin Chinese', hi: 'Hindi', es: 'Spanish', fr: 'French', it: 'Italian' };

// Valid stored language code, or null. Mount-only: the first render must stay
// 'en'/gate-open so client HTML matches the server render (hydration).
export function storedLang(store){
  try{
    const s = (store || (typeof localStorage!=='undefined' ? localStorage : null))?.getItem('nomad-lang');
    return LOCALES.some(l=>l.code===s) ? s : null;
  }catch{ return null; }
}

// First-time guide: [title key, description key] per card, in walk order.
export const GUIDE_STEP_KEYS = [
  ['guide.s1t', 'guide.s1d'],
  ['guide.s2t', 'guide.s2d'],
  ['guide.s3t', 'guide.s3d'],
  ['guide.s4t', 'guide.s4d'],
  ['guide.s5t', 'guide.s5d'],
  ['guide.s6t', 'guide.s6d'],
];

export function guideSeen(store){
  try{
    const s = store || (typeof localStorage!=='undefined' ? localStorage : null);
    return s?.getItem('nomad-guide-seen') != null;
  }catch{ return false; }
}

export const CITY_SLUG = { 'New York':'nyc', 'Chicago':'chi', 'Miami':'mia', 'Italy':'ita', 'Mumbai':'bom' };

// Per-view page hints: view -> [[title key, desc key]] in walk order.
export const HINT_KEYS = {
  collections: [['hint.colls.1t', 'hint.colls.1d'], ['hint.colls.2t', 'hint.colls.2d']],
  collection: [['hint.colln.1t', 'hint.colln.1d'], ['hint.colln.2t', 'hint.colln.2d'], ['hint.colln.3t', 'hint.colln.3d'], ['hint.colln.4t', 'hint.colln.4d']],
  overview: [['hint.ov.1t', 'hint.ov.1d'], ['hint.ov.2t', 'hint.ov.2d'], ['hint.ov.3t', 'hint.ov.3d'], ['hint.ov.4t', 'hint.ov.4d'], ['hint.asst.t', 'hint.asst.d']],
  day: [['hint.day.1t', 'hint.day.1d'], ['hint.day.2t', 'hint.day.2d'], ['hint.day.3t', 'hint.day.3d'], ['hint.day.4t', 'hint.day.4d'], ['hint.day.5t', 'hint.day.5d'], ['hint.asst.t', 'hint.asst.d']],
  stop: [['hint.stop.1t', 'hint.stop.1d'], ['hint.stop.2t', 'hint.stop.2d']],
  stays: [['hint.stay.1t', 'hint.stay.1d'], ['hint.stay.2t', 'hint.stay.2d']],
  tips: [['hint.tips.1t', 'hint.tips.1d'], ['hint.tips.2t', 'hint.tips.2d']],
};

export function hintDoneViews(store){
  try{
    const s = store || (typeof localStorage!=='undefined' ? localStorage : null);
    const raw = s?.getItem('nomad-hintsdone');
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v==='object' && !Array.isArray(v) ? v : {};
  }catch{ return {}; }
}

export const STRINGS = {
  'gate.title': { en: 'Welcome to Nomad', zh: '欢迎来到 Nomad', hi: 'Nomad में आपका स्वागत है', es: 'Te damos la bienvenida a Nomad', fr: 'Bienvenue sur Nomad', it: 'Benvenuto su Nomad' },
  'gate.sub': { en: 'Choose your language to begin', zh: '选择语言以开始', hi: 'शुरू करने के लिए अपनी भाषा चुनें', es: 'Elige tu idioma para empezar', fr: 'Choisissez votre langue pour commencer', it: 'Scegli la lingua per iniziare' },
  'gate.back': { en: '‹ Back', zh: '‹ 返回', hi: '‹ वापस', es: '‹ Atrás', fr: '‹ Retour', it: '‹ Indietro' },
  'gate.note': { en: 'You can switch anytime from the top bar.', zh: '随时可以在顶部栏中切换。', hi: 'आप कभी भी शीर्ष बार से बदल सकते हैं।', es: 'Puedes cambiarlo en cualquier momento desde la barra superior.', fr: 'Vous pourrez le changer depuis la barre du haut.', it: 'Puoi cambiarla in qualsiasi momento dalla barra in alto.' },
  'mast.saved': { en: 'Saved', zh: '已存', hi: 'सहेजा हुआ', es: 'Guardados', fr: 'Enregistrés', it: 'Salvati' },
  'nav.trip': { en: 'Trip', zh: '行程', hi: 'यात्रा', es: 'Viaje', fr: 'Voyage', it: 'Viaggio' },
  'nav.stops': { en: 'Stops', zh: '站点', hi: 'स्टॉप', es: 'Paradas', fr: 'Arrêts', it: 'Tappe' },
  'nav.map': { en: 'Map', zh: '地图', hi: 'नक्शा', es: 'Mapa', fr: 'Carte', it: 'Mappa' },
  'nav.reels': { en: 'Reels', zh: '短片', hi: 'रील्स', es: 'Reels', fr: 'Reels', it: 'Reel' },
  'nav.food': { en: 'Food', zh: '美食', hi: 'खाना', es: 'Comida', fr: 'Repas', it: 'Cibo' },
  'nav.stay': { en: 'Stay', zh: '住宿', hi: 'होटल', es: 'Hotel', fr: 'Hôtel', it: 'Hotel' },
  'nav.tips': { en: 'Tips', zh: '贴士', hi: 'सुझाव', es: 'Consejos', fr: 'Conseils', it: 'Consigli' },
  'coll.title': { en: 'Collections', zh: '收藏', hi: 'संग्रह', es: 'Colecciones', fr: 'Collections', it: 'Raccolte' },
  'coll.sub': { en: 'Saved reels · pick one to plan a trip', zh: '已存短片 · 选择一个来规划行程', hi: 'सहेजी गई रील्स · यात्रा बनाने के लिए एक चुनें', es: 'Reels guardados · elige uno para planear un viaje', fr: 'Reels enregistrés · choisissez-en un pour planifier', it: 'Reel salvati · scegline uno per pianificare' },
  'coll.search': { en: 'Search collections...', zh: '搜索收藏…', hi: 'संग्रह खोजें…', es: 'Buscar colecciones…', fr: 'Rechercher…', it: 'Cerca nelle raccolte…' },
  'coll.empty': { en: 'No collections found', zh: '没有找到收藏', hi: 'कोई संग्रह नहीं मिला', es: 'Sin colecciones', fr: 'Aucune collection', it: 'Nessuna raccolta' },
  'colln.back': { en: '‹ All collections', zh: '‹ 所有收藏', hi: '‹ सभी संग्रह', es: '‹ Todas las colecciones', fr: '‹ Toutes les collections', it: '‹ Tutte le raccolte' },
  'colln.days': { en: 'Trip days', zh: '行程天数', hi: 'यात्रा के दिन', es: 'Días de viaje', fr: 'Jours', it: 'Giorni' },
  'colln.reels': { en: 'Reels in this collection', zh: '本收藏中的短片', hi: 'इस संग्रह की रील्स', es: 'Reels de esta colección', fr: 'Reels de cette collection', it: 'Reel di questa raccolta' },
  'colln.plan.none': { en: 'Select posts to plan', zh: '选择帖子以规划', hi: 'योजना के लिए पोस्ट चुनें', es: 'Selecciona publicaciones', fr: 'Sélectionnez des publications', it: 'Seleziona i post' },
  'colln.plan.some': { en: 'Plan by saved collection', zh: '按已存收藏规划', hi: 'सहेजे संग्रह से बनाएं', es: 'Planear desde guardados', fr: 'Planifier depuis la collection', it: 'Pianifica dai salvati' },
  'colln.plan.new': { en: 'Plan by saved collection · {n} new', zh: '按已存收藏规划 · 新增{n}个', hi: 'सहेजे संग्रह से बनाएं · {n} नए', es: 'Planear desde guardados · {n} nuevos', fr: 'Planifier depuis la collection · {n} nouveaux', it: 'Pianifica dai salvati · {n} nuovi' },
  'colln.auto': { en: 'Auto create · spread across {days}', zh: '自动创建 · 分散在{days}里', hi: 'अपने-आप बनाएं · {days} में फैलाएं', es: 'Creación auto · en {days}', fr: 'Création auto · sur {days}', it: 'Creazione auto · in {days}' },
};

export function t(lang, key, vars){
  const e = STRINGS[key];
  let s = (e && (e[lang] || e.en)) || key;
  if(vars) for(const k of Object.keys(vars)) s = s.replaceAll(`{${k}}`, vars[k]);
  return s;
}

export function daysUnit(n, lang){
  switch(lang){
    case 'zh': return `${n}天`;
    case 'hi': return `${n} दिन`;
    case 'es': return `${n} día${n>1?'s':''}`;
    case 'fr': return `${n} jour${n>1?'s':''}`;
    case 'it': return `${n} giorn${n>1?'i':'o'}`;
    default: return `${n} day${n>1?'s':''}`;
  }
}

export function dayName(n, lang){
  switch(lang){
    case 'zh': return `第${n}天`;
    case 'hi': return `दिन ${n}`;
    case 'es': return `Día ${n}`;
    case 'fr': return `Jour ${n}`;
    case 'it': return `Giorno ${n}`;
    default: return `Day ${n}`;
  }
}

export function stopsUnit(n, lang){
  switch(lang){
    case 'zh': return `${n}站`;
    case 'hi': return `${n} स्टॉप`;
    case 'es': return `${n} parada${n>1?'s':''}`;
    case 'fr': return `${n} arrêt${n>1?'s':''}`;
    case 'it': return `${n} tapp${n>1?'e':'a'}`;
    default: return `${n} stop${n>1?'s':''}`;
  }
}

export function clipsUnit(n, lang){
  switch(lang){
    case 'zh': return `${n}条短片`;
    case 'hi': return `${n} क्लिप`;
    case 'es': return `${n} clip${n>1?'s':''}`;
    case 'fr': return `${n} clip${n>1?'s':''}`;
    case 'it': return `${n} clip`;
    default: return `${n} clip${n>1?'s':''}`;
  }
}

export function postsUnit(n, lang){
  switch(lang){
    case 'zh': return `${n}篇帖子`;
    case 'hi': return `${n} पोस्ट`;
    case 'es': return n>1 ? `${n} publicaciones` : `${n} publicación`;
    case 'fr': return `${n} publication${n>1?'s':''}`;
    case 'it': return `${n} post`;
    default: return `${n} post${n>1?'s':''}`;
  }
}

Object.assign(STRINGS, {
  'ov.days': { en: 'The days', zh: '每日安排', hi: 'दिन', es: 'Los días', fr: 'Les jours', it: 'I giorni' },
  'ov.summary': { en: 'Trip summary', zh: '行程概要', hi: 'यात्रा सारांश', es: 'Resumen del viaje', fr: 'Résumé du voyage', it: 'Riepilogo del viaggio' },
  'ov.tap': { en: 'tap a day to travel it', zh: '点一天开始游览', hi: 'घूमने के लिए कोई दिन दबाएं', es: 'toca un día para viajar', fr: 'touchez un jour pour partir', it: 'tocca un giorno per partire' },
  'ov.share': { en: 'Share itinerary on WhatsApp', zh: '通过 WhatsApp 分享行程', hi: 'WhatsApp पर यात्रा साझा करें', es: 'Compartir por WhatsApp', fr: 'Partager sur WhatsApp', it: 'Condividi su WhatsApp' },
  'ov.pdf': { en: 'Trip PDF', zh: '行程PDF', hi: 'यात्रा PDF', es: 'PDF del viaje', fr: 'PDF du voyage', it: 'PDF viaggio' },
  'ov.pdfing': { en: 'Making PDF…', zh: '正在生成PDF…', hi: 'PDF बन रही है…', es: 'Creando PDF…', fr: 'Création du PDF…', it: 'Creazione PDF…' },
  'ov.pdffail': { en: 'Couldn’t make the PDF — try again.', zh: 'PDF生成失败 — 请重试。', hi: 'PDF नहीं बना — फिर कोशिश करें।', es: 'No se pudo crear el PDF — inténtalo de nuevo.', fr: 'Échec de création du PDF — réessayez.', it: 'PDF non riuscito — riprova.' },
  'pdf.drive': { en: 'Drive', zh: '开车', hi: 'ड्राइव', es: 'Coche', fr: 'Voiture', it: 'Auto' },
  'pdf.transit': { en: 'Transit', zh: '公交', hi: 'ट्रांज़िट', es: 'Transporte', fr: 'Transports', it: 'Mezzi' },
  'pdf.walk': { en: 'Walk', zh: '步行', hi: 'पैदल', es: 'A pie', fr: 'Marche', it: 'Piedi' },
  'pdf.min': { en: 'min', zh: '分钟', hi: 'मिनट', es: 'min', fr: 'min', it: 'min' },
  'share.foodnear': { en: 'Food nearby', zh: '附近美食', hi: 'आस-पास खाना', es: 'Comida cercana', fr: 'Repas à proximité', it: 'Cibo vicino' },
  'trip.fallback': { en: '{city} trip', zh: '{city}之旅', hi: '{city} यात्रा', es: 'Viaje por {city}', fr: 'Voyage à {city}', it: 'Viaggio a {city}' },
  'stop.back': { en: '‹ Back to day', zh: '‹ 返回当日', hi: '‹ दिन पर वापस', es: '‹ Volver al día', fr: '‹ Retour au jour', it: '‹ Torna al giorno' },
  'stop.missing': { en: 'Stop not found', zh: '未找到站点', hi: 'स्टॉप नहीं मिला', es: 'Parada no encontrada', fr: 'Étape introuvable', it: 'Tappa non trovata' },
  'stop.prev': { en: '‹ Prev', zh: '‹ 上一个', hi: '‹ पिछला', es: '‹ Anterior', fr: '‹ Préc.', it: '‹ Prec' },
  'stop.next': { en: 'Next ›', zh: '下一个 ›', hi: 'अगला ›', es: 'Siguiente ›', fr: 'Suiv. ›', it: 'Avanti ›' },
  'stop.norating': { en: 'No rating yet', zh: '暂无评分', hi: 'अभी रेटिंग नहीं', es: 'Sin valoración', fr: 'Pas encore noté', it: 'Nessuna valutazione' },
  'stop.tab.reels': { en: 'reels', zh: '短片', hi: 'रील्स', es: 'reels', fr: 'reels', it: 'reel' },
  'stop.tab.reviews': { en: 'reviews', zh: '评价', hi: 'समीक्षाएं', es: 'reseñas', fr: 'avis', it: 'recensioni' },
  'stop.rev.loading': { en: 'Loading reviews…', zh: '正在加载评价…', hi: 'समीक्षाएं लोड हो रही हैं…', es: 'Cargando reseñas…', fr: 'Chargement des avis…', it: 'Caricamento recensioni…' },
  'stop.rev.title': { en: 'Google review summary', zh: 'Google 评价摘要', hi: 'Google समीक्षा सारांश', es: 'Resumen de reseñas de Google', fr: 'Résumé des avis Google', it: 'Riepilogo recensioni Google' },
  'stop.rev.none': { en: 'Connect Places billing for review summaries', zh: '连接 Places 计费以获取评价摘要', hi: 'समीक्षा सारांश के लिए Places बिलिंग जोड़ें', es: 'Conecta la facturación de Places', fr: 'Connectez la facturation Places', it: 'Collega la fatturazione Places' },
  'stop.noreels': { en: 'No reels yet for this stop', zh: '该站点暂无短片', hi: 'इस स्टॉप के लिए अभी रील्स नहीं', es: 'Sin reels aquí todavía', fr: 'Pas encore de reels ici', it: 'Ancora nessun reel qui' },
  'day.alldays': { en: '‹ All days', zh: '‹ 所有日期', hi: '‹ सभी दिन', es: '‹ Todos los días', fr: '‹ Tous les jours', it: '‹ Tutti i giorni' },
  'day.build': { en: 'Build the stops', zh: '规划站点', hi: 'स्टॉप बनाएं', es: 'Arma las paradas', fr: 'Composez les étapes', it: 'Costruisci le tappe' },
  'day.addstay': { en: 'Add stay', zh: '加住宿', hi: 'ठहराव जोड़ें', es: 'Añadir hotel', fr: 'Ajouter un hôtel', it: 'Aggiungi hotel' },
  'day.staysnear': { en: 'Stays near your stops', zh: '站点附近的住宿', hi: 'आपके स्टॉप के पास ठहराव', es: 'Hoteles cerca de ti', fr: 'Hôtels près de vous', it: 'Hotel vicino alle tappe' },
  'day.optimize': { en: 'Optimize', zh: '优化', hi: 'अनुकूलित करें', es: 'Optimizar', fr: 'Optimiser', it: 'Ottimizza' },
  'day.opt.optimal': { en: 'Already optimal', zh: '已经最优', hi: 'पहले से सर्वोत्तम', es: 'Ya es óptimo', fr: 'Déjà optimal', it: 'Già ottimale' },
  'day.search.try': { en: 'Try {place}...', zh: '试试{place}…', hi: '{place} आज़माएं…', es: 'Prueba {place}…', fr: 'Essayez {place}…', it: 'Prova {place}…' },
  'day.searching': { en: 'Searching…', zh: '搜索中…', hi: 'खोजा जा रहा है…', es: 'Buscando…', fr: 'Recherche…', it: 'Ricerca…' },
  'day.nostops': { en: 'No stops found', zh: '未找到站点', hi: 'कोई स्टॉप नहीं मिला', es: 'Sin resultados', fr: 'Aucune étape', it: 'Nessuna tappa' },
  'day.empty': { en: 'No stops yet', zh: '还没有站点', hi: 'अभी कोई स्टॉप नहीं', es: 'Sin paradas', fr: 'Aucune étape', it: 'Nessuna tappa' },
  'day.emptyhint': { en: 'Search above to start the day', zh: '在上方搜索以开始一天', hi: 'दिन शुरू करने के लिए ऊपर खोजें', es: 'Busca arriba para empezar', fr: 'Cherchez ci-dessus pour commencer', it: 'Cerca sopra per iniziare' },
  'day.clear': { en: 'Clear day', zh: '清空本日', hi: 'दिन साफ़ करें', es: 'Vaciar día', fr: 'Vider le jour', it: 'Svuota giorno' },
  'day.grip': { en: 'Drag to reorder', zh: '拖动以排序', hi: 'क्रम बदलने के लिए खींचें', es: 'Arrastra para ordenar', fr: 'Glisser pour réordonner', it: 'Trascina per riordinare' },
  'row.move': { en: 'Move to day', zh: '移到某天', hi: 'दिन बदलें', es: 'Mover de día', fr: 'Changer de jour', it: 'Sposta giorno' },
  'row.remove': { en: 'Remove', zh: '删除', hi: 'हटाएं', es: 'Quitar', fr: 'Retirer', it: 'Rimuovi' },
  'row.movetoday': { en: 'Move to day', zh: '移到某天', hi: 'दिन बदलें', es: 'Mover de día', fr: 'Changer de jour', it: 'Sposta giorno' },
  'map.title': { en: 'Route', zh: '路线', hi: 'मार्ग', es: 'Ruta', fr: 'Itinéraire', it: 'Percorso' },
  'map.offline': { en: 'Map offline', zh: '地图离线', hi: 'नक्शा ऑफ़लाइन', es: 'Mapa sin conexión', fr: 'Carte hors ligne', it: 'Mappa offline' },
  'map.offlineHint': { en: 'Add a Google Maps browser key · restart dev', zh: '添加 Google 地图浏览器密钥 · 重启开发服务', hi: 'Google Maps ब्राउज़र कुंजी जोड़ें · dev पुनः शुरू करें', es: 'Añade una clave de Maps · reinicia', fr: 'Ajoutez une clé Maps · relancez', it: 'Aggiungi una chiave Maps · riavvia' },
  'map.norating': { en: 'No Google rating yet', zh: '暂无 Google 评分', hi: 'अभी Google रेटिंग नहीं', es: 'Sin valoración de Google', fr: 'Pas de note Google', it: 'Nessuna valutazione Google' },
  'food.title': { en: 'Add food', zh: '加美食', hi: 'खाना जोड़ें', es: 'Añadir comida', fr: 'Ajouter un repas', it: 'Aggiungi cibo' },
  'food.sub.near': { en: 'Closest {cat} to your day', zh: '离行程最近的{cat}', hi: 'आपके दिन के सबसे पास {cat}', es: '{cat} más cercano', fr: '{cat} le plus proche', it: '{cat} più vicino' },
  'food.sub.top': { en: 'Top {cat} in {city}', zh: '{city}最棒的{cat}', hi: '{city} में बढ़िया {cat}', es: 'Top {cat} en {city}', fr: 'Top {cat} à {city}', it: 'Top {cat} a {city}' },
  'food.cat.local': { en: 'Local special', zh: '当地特色', hi: 'स्थानीय विशेष', es: 'Especial local', fr: 'Spécialité locale', it: 'Specialità locale' },
  'food.cat.coffee': { en: 'Coffee', zh: '咖啡', hi: 'कॉफ़ी', es: 'Café', fr: 'Café', it: 'Caffè' },
  'food.cat.lunch': { en: 'Lunch', zh: '午餐', hi: 'लंच', es: 'Almuerzo', fr: 'Déjeuner', it: 'Pranzo' },
  'food.cat.dinner': { en: 'Dinner', zh: '晚餐', hi: 'डिनर', es: 'Cena', fr: 'Dîner', it: 'Cena' },
  'food.empty.none': { en: 'No {cat} spots saved for {city} yet', zh: '{city}暂无{cat}推荐', hi: '{city} के लिए कोई {cat} नहीं', es: 'Sin {cat} guardados en {city}', fr: 'Pas encore de {cat} à {city}', it: 'Nessun {cat} salvato a {city}' },
  'food.cat.fine': { en: 'Fine dine', zh: '高档餐厅', hi: 'फाइन डाइन', es: 'Alta cocina', fr: 'Gastronomique', it: 'Ristorante elegante' },
  'food.meal.lunch': { en: 'lunch', zh: '午餐', hi: 'लंच', es: 'almuerzo', fr: 'déjeuner', it: 'pranzo' },
  'food.meal.dinner': { en: 'dinner', zh: '晚餐', hi: 'डिनर', es: 'cena', fr: 'dîner', it: 'cena' },
  'food.meal.coffee': { en: 'coffee', zh: '咖啡', hi: 'कॉफ़ी', es: 'café', fr: 'café', it: 'caffè' },
  'food.meal.nearby': { en: 'Nearby', zh: '附近', hi: 'आस-पास', es: 'Cercano', fr: 'Proche', it: 'Vicino' },
  'food.cuisine.live': { en: 'Restaurant', zh: '餐厅', hi: 'रेस्तरां', es: 'Restaurante', fr: 'Restaurant', it: 'Ristorante' },
  'reels.none': { en: 'No reels yet — add a stop with reels', zh: '暂无短片 — 添加一个有短片的站点', hi: 'अभी रील्स नहीं — रील्स वाला स्टॉप जोड़ें', es: 'Sin reels — añade una parada con reels', fr: 'Pas de reels — ajoutez une étape', it: 'Nessun reel — aggiungi una tappa con reel' },
  'reels.top': { en: 'TOP REEL', zh: '热门短片', hi: 'टॉप रील', es: 'TOP REEL', fr: 'TOP REEL', it: 'TOP REEL' },
  'pdf.reel': { en: 'Top reel', zh: '热门短片', hi: 'टॉप रील', es: 'Reel destacado', fr: 'Top reel', it: 'Top reel' },
  'reels.open': { en: 'Open reel, {views} views', zh: '打开短片，{views}次观看', hi: 'रील खोलें, {views} व्यूज', es: 'Abrir reel, {views} vistas', fr: 'Ouvrir, {views} vues', it: 'Apri reel, {views} visualizzazioni' },
  'stay.sub': { en: 'Top-rated stays in {city}', zh: '{city}评价最高的住宿', hi: '{city} में बेहतरीन ठहराव', es: 'Mejores hoteles en {city}', fr: 'Meilleurs hôtels à {city}', it: 'Migliori hotel a {city}' },
  'tips.title': { en: 'Travel tips', zh: '旅行贴士', hi: 'यात्रा सुझाव', es: 'Consejos de viaje', fr: 'Conseils de voyage', it: 'Consigli di viaggio' },
  'tips.sub': { en: 'Smart moves for {city}', zh: '{city}实用攻略', hi: '{city} के लिए काम की बातें', es: 'Claves para {city}', fr: 'L’essentiel pour {city}', it: 'Dritte utili per {city}' },
  'tips.around.t': { en: 'Getting around', zh: '市内出行', hi: 'घूमना-फिरना', es: 'Cómo moverse', fr: 'Se déplacer', it: 'Come muoversi' },
  'tips.around.nyc': { en: 'The subway runs 24/7 — tap in with your phone via OMNY. Yellow cabs and rideshares fill the gaps; crosstown, walking is often fastest.', zh: '地铁24小时运营 — 手机刷OMNY进站。黄色出租车和网约车补空缺；横穿城区时，步行往往最快。', hi: 'मेट्रो 24/7 चलती है — OMNY से फ़ोन टैप करके चढ़ें। पीली टैक्सी और कैब काम आएंगी; आर-पार जाने में पैदल अक्सर तेज़।', es: 'El metro funciona 24/7 — entra con el móvil vía OMNY. Taxis y apps cubren el resto; cruzando la ciudad, a pie suele ser más rápido.', fr: 'Le métro roule 24h/24 — validez avec votre téléphone via OMNY. Taxis et VTC complètent ; en traversée, marcher est souvent le plus rapide.', it: 'La metro va 24/7 — entra col telefono via OMNY. Taxi gialli e ride-sharing per il resto; di traverso, a piedi spesso è più veloce.' },
  'tips.around.chi': { en: 'The L trains loop downtown and reach both airports. Rideshares cover late nights; the lakefront trail is best on foot or by bike.', zh: 'L轻轨环绕市中心，直达两大机场。深夜靠网约车；湖滨步道最适合步行或骑行。', hi: 'L ट्रेनें डाउनटाउन घूमती हैं और दोनों हवाई अड्डों तक जाती हैं। देर रात कैब लें; झील किनारा पैदल या साइकिल से बढ़िया।', es: 'La L recorre el centro y llega a ambos aeropuertos. Apps para la noche; el paseo del lago, mejor a pie o en bici.', fr: 'Le L fait le tour du centre et dessert les deux aéroports. VTC la nuit ; le sentier du lac se fait à pied ou à vélo.', it: 'La L gira in centro e arriva ai due aeroporti. Ride-sharing di notte; il lungolago è meglio a piedi o in bici.' },
  'tips.around.mia': { en: 'Miami is spread out — rideshares or a rental car do most of the work. Metrorail and the free Metromover cover downtown and Brickell.', zh: '迈阿密很分散 — 主要靠网约车或租车。Metrorail和免费Metromover覆盖市中心和Brickell。', hi: 'मियामी फैला हुआ है — कैब या किराये की कार से ज़्यादा घूमेंगे। Metrorail और मुफ़्त Metromover डाउनटाउन और Brickell जाते हैं।', es: 'Miami es extenso — apps o coche de alquiler hacen casi todo. Metrorail y el Metromover gratis cubren el centro y Brickell.', fr: 'Miami est étendu — VTC ou voiture de location font l’essentiel. Metrorail et Metromover gratuit couvrent le centre et Brickell.', it: 'Miami è estesa — ride-sharing o auto a noleggio fanno quasi tutto. Metrorail e Metromover gratis coprono centro e Brickell.' },
  'tips.around.ita': { en: 'Frecciarossa and Italo high-speed trains link the big cities — book ahead for the best fares. Regional trains serve small towns; driving into old towns means ZTL zones, so watch the signs.', zh: 'Frecciarossa和Italo高铁连接大城市 — 提前订票最便宜。区间车去小镇；开车进老城注意ZTL限行区，看清路标。', hi: 'Frecciarossa और Italo तेज़ ट्रेनें बड़े शहर जोड़ती हैं — सस्ते किराए के लिए पहले बुक करें। छोटे शहरों के लिए क्षेत्रीय ट्रेनें; पुराने शहर में गाड़ी से ZTL ज़ोन का ध्यान रखें।', es: 'Los trenes veloces Frecciarossa e Italo unen las grandes ciudades — reserva antes para mejor precio. Regionales para pueblos; en coche atento a las zonas ZTL del casco antiguo.', fr: 'Les TGV Frecciarossa et Italo relient les grandes villes — réservez tôt pour les meilleurs prix. Trains régionaux pour les villages ; en voiture, attention aux zones ZTL des centres anciens.', it: 'Frecciarossa e Italo collegano le grandi città — prenota prima per le tariffe migliori. Regionali per i borghi; in auto attento alle ZTL dei centri storici.' },
  'tips.around.bom': { en: 'Local trains are the fastest way across the city — dodge rush-hour crowds if you can. The metro, autos, and rideshares cover the last mile; allow buffer time for traffic.', zh: '市郊火车是穿越全城最快的方式 — 尽量避开高峰人流。地铁、三轮车和网约车接最后一公里；路上多留堵车时间。', hi: 'लोकल ट्रेन शहर पार करने का सबसे तेज़ तरीका है — भीड़ से बचें तो बेहतर। मेट्रो, ऑटो और कैब आखिरी दूरी के लिए; ट्रैफ़िक के लिए समय ज़्यादा रखें।', es: 'Los trenes locales cruzan la ciudad más rápido — evita las aglomeraciones punta. Metro, autos y apps cubren el último tramo; deja margen para el tráfico.', fr: 'Les trains locaux traversent la ville le plus vite — évitez la foule des pointes. Métro, rickshaws et VTC pour le dernier kilomètre ; prévoyez large pour la circulation.', it: 'I treni locali attraversano la città più in fretta — evita la calca dell’ora di punta. Metro, risciò e ride-sharing per l’ultimo miglio; lascia margine per il traffico.' },
  'tips.around.offline': { en: 'Download an offline map before you head out — signal drops in stations and old-town lanes.', zh: '出门前下载离线地图 — 车站和老城小巷里常没信号。', hi: 'निकलने से पहले ऑफ़लाइन नक्शा उतार लें — स्टेशनों और पुरानी गलियों में सिग्नल जाता है।', es: 'Descarga un mapa sin conexión — la señal cae en estaciones y callejones.', fr: 'Téléchargez une carte hors ligne — le signal coupe dans les gares et les ruelles.', it: 'Scarica una mappa offline — il segnale salta in stazione e nei vicoli.' },
  'tips.flight.t': { en: 'Flights', zh: '机票', hi: 'उड़ानें', es: 'Vuelos', fr: 'Vols', it: 'Voli' },
  'tips.flight.1': { en: 'Book 4–8 weeks out for the best fares, and compare midweek departures — Tuesdays and Wednesdays are often cheapest.', zh: '提前4–8周订票最划算，多比周二、周三出发 — 工作日通常最便宜。', hi: 'सबसे अच्छे किराए के लिए 4–8 हफ़्ते पहले बुक करें, और हफ़्ते के बीच की उड़ानें देखें — मंगल-बुध अक्सर सस्ते।', es: 'Reserva con 4–8 semanas y compara salidas entre semana — martes y miércoles suelen ser lo más barato.', fr: 'Réservez 4 à 8 semaines avant et comparez les départs en semaine — mardi et mercredi sont souvent les moins chers.', it: 'Prenota con 4–8 settimane di anticipo e confronta le partenze infrasettimanali — martedì e mercoledì spesso costano meno.' },
  'tips.flight.2': { en: 'Fly carry-on only when you can, and download your boarding pass and entertainment before leaving for the airport.', zh: '能只带登机箱就别托运，去机场前下好登机牌和离线娱乐。', hi: 'हो सके तो सिर्फ़ केबिन बैग में सफ़र करें, और हवाई अड्डे से पहले बोर्डिंग पास व मनोरंजन डाउनलोड कर लें।', es: 'Viaja solo con equipaje de mano si puedes, y descarga tu tarjeta de embarque y entretenimiento antes de salir.', fr: 'Voyagez avec un seul bagage cabine si possible, et téléchargez carte d’embarquement et divertissements avant de partir.', it: 'Viaggia solo con bagaglio a mano se puoi, e scarica carta d’imbarco e intrattenimento prima di partire.' },
  'tips.car.t': { en: 'Rental car', zh: '租车', hi: 'किराये की कार', es: 'Coche de alquiler', fr: 'Voiture de location', it: 'Auto a noleggio' },
  'tips.car.book': { en: 'Popular agencies here:', zh: '热门租车公司：', hi: 'यहां लोकप्रिय एजेंसियां:', es: 'Agencias populares aquí:', fr: 'Agences populaires ici :', it: 'Agenzie popolari qui:' },
  'tips.car.1': { en: 'Book ahead in peak season, and compare the total with insurance and fees — not just the daily rate.', zh: '旺季提前订车，比价看含保险和杂费的总价 — 不只看日租金。', hi: 'पीक सीज़न में पहले बुक करें, और बीमा-फ़ीस समेत कुल कीमत मिलाएं — सिर्फ़ रोज़ का किराया नहीं।', es: 'Reserva antes en temporada alta y compara el total con seguro y cargos, no solo la tarifa diaria.', fr: 'Réservez tôt en haute saison et comparez le total avec assurance et frais, pas seulement le tarif jour.', it: 'Prenota prima in alta stagione e confronta il totale con assicurazione e spese, non solo la tariffa giornaliera.' },
  'tips.car.2': { en: 'Check license rules before you fly — many countries ask visitors for an international driving permit. Many travel cards include rental coverage, so check your card before paying for the counter plan.', zh: '出发前查驾照规定 — 很多国家要求国际驾照。不少旅行卡自带租车险，先查卡再决定要不要买柜台保险。', hi: 'उड़ान से पहले लाइसेंस नियम देखें — कई देशों में अंतरराष्ट्रीय परमिट चाहिए। कई ट्रैवल कार्ड में किराये का बीमा होता है, काउंटर प्लान से पहले कार्ड जांचें।', es: 'Revisa el carnet antes de volar — muchos países piden permiso internacional. Varias tarjetas incluyen cobertura, mírala antes de pagar el seguro del mostrador.', fr: 'Vérifiez le permis avant de partir — beaucoup de pays exigent un permis international. Plusieurs cartes incluent une assurance location, regardez avant de payer au comptoir.', it: 'Controlla la patente prima di partire — molti paesi chiedono la patente internazionale. Molte carte includono la copertura noleggio, verifica prima di pagare al banco.' },
  'tips.pack.t': { en: 'Packing essentials', zh: '打包必备', hi: 'ज़रूरी सामान', es: 'Esenciales', fr: 'Essentiels', it: 'Essenziali' },
  'tips.pack.1': { en: 'Comfortable walking shoes and layers — you’ll cover more ground on foot than you expect.', zh: '舒服的步行鞋加洋葱式穿衣 — 步行距离总超预期。', hi: 'आरामदायक जूते और तह वाले कपड़े — पैदल सोच से ज़्यादा घूमेंगे।', es: 'Calzado cómodo y capas — caminarás más de lo previsto.', fr: 'Chaussures confortables et couches — vous marcherez plus que prévu.', it: 'Scarpe comode e vestiti a strati — camminerai più del previsto.' },
  'tips.pack.2': { en: 'Universal adapter, power bank, and offline copies of bookings, ID, and insurance.', zh: '万能转换插头、充电宝，以及订单、证件和保险的离线备份。', hi: 'यूनिवर्सल एडाप्टर, पावर बैंक, और बुकिंग, पहचान व बीमा की ऑफ़लाइन प्रतियां।', es: 'Adaptador universal, batería externa y copias sin conexión de reservas, ID y seguro.', fr: 'Adaptateur universel, batterie externe et copies hors ligne des réservations, papiers et assurance.', it: 'Adattatore universale, power bank e copie offline di prenotazioni, documenti e assicurazione.' },
  'tips.stay.t': { en: 'Hotels & points', zh: '酒店与积分', hi: 'होटल और पॉइंट', es: 'Hoteles y puntos', fr: 'Hôtels et points', it: 'Hotel e punti' },
  'tips.stay.1': { en: 'Use your travel points to book a hotel.', zh: '用旅行积分订酒店。', hi: 'होटल बुक करने के लिए ट्रैवल पॉइंट इस्तेमाल करें।', es: 'Usa tus puntos para reservar hotel.', fr: 'Utilisez vos points pour réserver.', it: 'Usa i punti per prenotare l’hotel.' },
  'tips.stay.2': { en: 'Review your travel card benefits — some cards offer hotel credits, late checkout, and early check-in.', zh: '查看旅行卡福利 — 有些卡提供酒店积分、延迟退房和提前入住。', hi: 'अपने ट्रैवल कार्ड के लाभ देखें — कुछ कार्ड होटल क्रेडिट, देर से चेक-आउट और जल्दी चेक-इन देते हैं।', es: 'Revisa tu tarjeta: algunas ofrecen crédito hotelero y check-out tardío.', fr: 'Vérifiez votre carte : crédits hôtel et départ tardif possibles.', it: 'Controlla la carta: alcune offrono crediti hotel e late check-out.' },
  'stay.search': { en: 'Search hotels, hostels…', zh: '搜索酒店、青旅…', hi: 'होटल, हॉस्टल खोजें…', es: 'Busca hoteles, hostales…', fr: 'Hôtels, auberges…', it: 'Cerca hotel, ostelli…' },
  'stay.none': { en: 'No stays found', zh: '未找到住宿', hi: 'कोई ठहराव नहीं मिला', es: 'Sin hoteles', fr: 'Aucun hôtel', it: 'Nessun hotel' },
  'stay.picks': { en: 'Top picks', zh: '精选推荐', hi: 'खास पसंद', es: 'Destacados', fr: 'Coups de cœur', it: 'Top' },
  'stay.tipslink': { en: 'Travel tips →', zh: '旅行贴士 →', hi: 'यात्रा सुझाव →', es: 'Consejos de viaje →', fr: 'Conseils de voyage →', it: 'Consigli di viaggio →' },
  'stay.add': { en: 'Add {name} to day', zh: '将{name}加入本日', hi: '{name} को दिन में जोड़ें', es: 'Añadir {name}', fr: 'Ajouter {name}', it: 'Aggiungi {name}' },
  'reserve.required': { en: 'Reservations required', zh: '必须预订', hi: 'आरक्षण आवश्यक', es: 'Reserva obligatoria', fr: 'Réservation requise', it: 'Prenotazione obbligatoria' },
  'reserve.recommended': { en: 'Reservation recommended', zh: '建议预订', hi: 'आरक्षण की सलाह', es: 'Reserva recomendada', fr: 'Réservation conseillée', it: 'Prenotazione consigliata' },
  'chat.title': { en: 'Nomad Assistant', zh: 'Nomad Assistant', hi: 'Nomad Assistant', es: 'Nomad Assistant', fr: 'Nomad Assistant', it: 'Nomad Assistant' },
  'chat.close': { en: 'Close', zh: '关闭', hi: 'बंद करें', es: 'Cerrar', fr: 'Fermer', it: 'Chiudi' },
  'chat.hint': { en: 'Ask anything about this trip — or for picks outside it, like pizza near a stop.', zh: '问任何行程问题 — 也可以问行程之外的推荐，比如站点附近的披萨。', hi: 'इस यात्रा के बारे में कुछ भी पूछें — या बाहर की पसंद, जैसे स्टॉप के पास पिज़्ज़ा।', es: 'Pregunta lo que sea — o pide algo fuera del plan, como pizza.', fr: 'Posez vos questions — ou demandez hors programme, une pizza par ex.', it: 'Chiedi qualsiasi cosa — o qualcosa fuori programma, tipo pizza.' },
  'chat.s0': { en: 'Summarize my trip', zh: '总结我的行程', hi: 'मेरी यात्रा बताएं', es: 'Resume mi viaje', fr: 'Résume mon voyage', it: 'Riassumi il viaggio' },
  'chat.s1': { en: 'Is any day too packed?', zh: '哪天太满了？', hi: 'क्या कोई दिन बहुत भरा है?', es: '¿Algún día saturado?', fr: 'Un jour trop chargé ?', it: 'Qualche giorno troppo pieno?' },
  'chat.s2': { en: 'Suggest lunch near my route', zh: '推荐路线附近的午餐', hi: 'मेरे रास्ते के पास लंच बताएं', es: 'Almuerzo cerca de mi ruta', fr: 'Un déjeuner près du parcours', it: 'Pranzo vicino al percorso' },
  'chat.ph': { en: 'Ask about your trip or the city...', zh: '问行程或城市…', hi: 'यात्रा या शहर के बारे में पूछें…', es: 'Pregunta sobre el viaje…', fr: 'Une question sur le voyage…', it: 'Chiedi sul viaggio…' },
  'chat.send': { en: 'Send', zh: '发送', hi: 'भेजें', es: 'Enviar', fr: 'Envoyer', it: 'Invia' },
  'chat.ask': { en: 'Ask Nomad Assistant', zh: '询问 Nomad Assistant', hi: 'Nomad Assistant से पूछें', es: 'Preguntar a Nomad Assistant', fr: 'Demander à Nomad Assistant', it: 'Chiedi a Nomad Assistant' },
  'chat.err': { en: 'Agent request failed — try again', zh: '请求失败 — 请重试', hi: 'अनुरोध विफल — फिर कोशिश करें', es: 'Falló la petición — reintenta', fr: 'Échec — réessayez', it: 'Richiesta fallita — riprova' },
  'chat.edit.addq': { en: 'Add this stop?', zh: '加这个站点？', hi: 'यह स्टॉप जोड़ें?', es: '¿Añadir esta parada?', fr: 'Ajouter cette étape ?', it: 'Aggiungere questa tappa?' },
  'chat.edit.remq': { en: 'Remove this stop?', zh: '删除这个站点？', hi: 'यह स्टॉप हटाएं?', es: '¿Quitar esta parada?', fr: 'Retirer cette étape ?', it: 'Rimuovere questa tappa?' },
  'chat.edit.pick': { en: 'Which one?', zh: '哪一个？', hi: 'कौन-सी?', es: '¿Cuál?', fr: 'Laquelle ?', it: 'Quale?' },
  'chat.edit.none': { en: 'No match found', zh: '没有找到', hi: 'कुछ नहीं मिला', es: 'Sin resultados', fr: 'Aucun résultat', it: 'Nessun risultato' },
  'chat.edit.dupe': { en: 'Already on this day', zh: '本日已有', hi: 'इस दिन पहले से है', es: 'Ya está en este día', fr: 'Déjà dans ce jour', it: 'Già in questo giorno' },
  'chat.edit.kept': { en: 'Kept as is', zh: '保持不变', hi: 'जैसे थे वैसे', es: 'Sin cambios', fr: 'Inchangé', it: 'Invariato' },
  'chat.edit.yes': { en: 'Confirm', zh: '确认', hi: 'पुष्टि करें', es: 'Confirmar', fr: 'Confirmer', it: 'Conferma' },
  'chat.edit.no': { en: 'Cancel', zh: '取消', hi: 'रद्द करें', es: 'Cancelar', fr: 'Annuler', it: 'Annulla' },
  'chat.edit.added': { en: 'Added to {day}', zh: '已加入{day}', hi: '{day} में जोड़ा', es: 'Añadido: {day}', fr: 'Ajouté : {day}', it: 'Aggiunto: {day}' },
  'chat.edit.removed': { en: 'Removed from {day}', zh: '已从{day}删除', hi: '{day} से हटाया', es: 'Quitado: {day}', fr: 'Retiré : {day}', it: 'Rimosso: {day}' },
  'common.added': { en: 'Everything here is already in your stops — remove one to see it again', zh: '此处已全在行程中 — 删除一个可再次查看', hi: 'यहां सब कुछ आपके स्टॉप में है — देखने के लिए कोई हटाएं', es: 'Todo esto ya está en tus paradas', fr: 'Tout est déjà dans vos étapes', it: 'È già tutto nelle tue tappe' },
  'common.sample': { en: 'Sample ratings — connect Places for live Google data', zh: '示例评分 — 连接 Places 获取实时数据', hi: 'नमूना रेटिंग — लाइव Google डेटा के लिए Places जोड़ें', es: 'Datos de muestra — conecta Places', fr: 'Notes d’exemple — connectez Places', it: 'Valutazioni di esempio — collega Places' },
  'day.opt.saved': { en: 'Saved ≈{n} min', zh: '节省约{n}分钟', hi: '≈{n} मिनट बचे', es: '≈{n} min ahorrados', fr: '≈{n} min gagnées', it: '≈{n} min risparmiati' },
  'pace.slow': { en: 'slow', zh: '悠闲', hi: 'आरामदायक', es: 'tranquilo', fr: 'tranquille', it: 'tranquilla' },
  'pace.full': { en: 'full', zh: '充实', hi: 'भरपूर', es: 'completo', fr: 'bien rempli', it: 'intensa' },
  'pace.packed': { en: 'packed', zh: '紧凑', hi: 'भरा हुआ', es: 'intenso', fr: 'chargé', it: 'piena' },
  'guide.top': { en: 'How it works', zh: '使用指南', hi: 'कैसे काम करता है', es: 'Cómo funciona', fr: 'Comment ça marche', it: 'Come funziona' },
  'guide.step': { en: 'Step {n} of {total}', zh: '第{n}步，共{total}步', hi: 'चरण {n} / {total}', es: 'Paso {n} de {total}', fr: 'Étape {n} sur {total}', it: 'Passaggio {n} di {total}' },
  'guide.skip': { en: 'Skip', zh: '跳过', hi: 'छोड़ें', es: 'Omitir', fr: 'Passer', it: 'Salta' },
  'guide.back': { en: '‹ Back', zh: '‹ 返回', hi: '‹ वापस', es: '‹ Atrás', fr: '‹ Retour', it: '‹ Indietro' },
  'guide.next': { en: 'Next ›', zh: '下一步 ›', hi: 'आगे ›', es: 'Siguiente ›', fr: 'Suivant ›', it: 'Avanti ›' },
  'guide.start': { en: 'Start exploring', zh: '开始探索', hi: 'घूमना शुरू करें', es: 'Empezar a explorar', fr: "Commencer l'exploration", it: 'Inizia a esplorare' },
  'guide.help': { en: 'Help', zh: '帮助', hi: 'मदद', es: 'Ayuda', fr: 'Aide', it: 'Aiuto' },
  'guide.s1t': { en: 'Start from saved collections', zh: '从已存收藏开始', hi: 'सहेजे संग्रह से शुरू करें', es: 'Empieza desde tus colecciones', fr: 'Partez de vos collections', it: 'Parti dalle raccolte salvate' },
  'guide.s1d': { en: 'Nomad turns Instagram reel collections into trip plans. Pick a collection to see all its spots in one list.', zh: 'Nomad 能把 Instagram 短片收藏变成旅行计划。选择一个收藏，在一个列表中查看所有地点。', hi: 'Nomad Instagram रील संग्रहों को यात्रा योजना में बदल देता है। किसी संग्रह को चुनें और उसके सभी स्थान एक सूची में देखें।', es: 'Nomad convierte tus colecciones de reels de Instagram en planes de viaje. Elige una colección para ver todos sus lugares en una lista.', fr: 'Nomad transforme vos collections de reels Instagram en itinéraires. Choisissez une collection pour voir tous ses lieux dans une liste.', it: 'Nomad trasforma le tue raccolte di reel di Instagram in itinerari. Scegli una raccolta per vedere tutti i suoi luoghi in un elenco.' },
  'guide.s2t': { en: 'Choose posts, set your days', zh: '选择帖子，设定天数', hi: 'पोस्ट चुनें, दिन तय करें', es: 'Elige publicaciones y días', fr: 'Choisissez publications et jours', it: 'Scegli post e giorni' },
  'guide.s2d': { en: 'Tick the posts you like, set how many days you have, then plan from the collection — or auto-create to spread the best stops across your days.', zh: '勾选喜欢的帖子，设定旅行天数，然后从收藏生成计划——也可以自动创建，把最棒的站点分散到每一天。', hi: 'पसंदीदा पोस्ट चुनें, दिनों की संख्या तय करें, फिर संग्रह से योजना बनाएं — या अपने-आप बनाएं, जिससे बेहतरीन स्टॉप सभी दिनों में फैल जाएं।', es: 'Marca las publicaciones que te gusten, indica cuántos días tienes y planea desde la colección, o crea el viaje automáticamente para repartir las mejores paradas entre tus días.', fr: 'Cochez les publications qui vous plaisent, indiquez le nombre de jours, puis planifiez depuis la collection — ou laissez Nomad répartir les meilleures étapes sur vos jours.', it: 'Seleziona i post che ti piacciono, imposta quanti giorni hai, poi pianifica dalla raccolta — oppure crea tutto in automatico per distribuire le tappe migliori nei tuoi giorni.' },
  'guide.s3t': { en: 'Your trip, day by day', zh: '行程，一天一天看', hi: 'आपकी यात्रा, दिन-ब-दिन', es: 'Tu viaje, día a día', fr: 'Votre voyage, jour par jour', it: 'Il tuo viaggio, giorno per giorno' },
  'guide.s3d': { en: 'The overview lines up each day with a highlight. Open a day to drag stops into order, move them between days, and see drive times.', zh: '总览把每一天和亮点排在一起。打开某一天，可以拖动排序、在不同日子之间移动站点，并查看车程。', hi: 'झलक में हर दिन उसकी खासियत के साथ दिखता है। कोई दिन खोलकर स्टॉप को खींचकर क्रमबद्ध करें, दिनों के बीच ले जाएं और ड्राइव समय देखें।', es: 'El resumen ordena cada día con su momento destacado. Abre un día para reordenar paradas arrastrando, moverlas entre días y ver tiempos de conducción.', fr: "L'aperçu aligne chaque jour avec son moment fort. Ouvrez un jour pour réordonner les étapes, les déplacer d'un jour à l'autre et voir les temps de route.", it: "La panoramica allinea ogni giorno con il suo momento clou. Apri un giorno per riordinare le tappe trascinandole, spostarle tra i giorni e vedere i tempi di guida." },
  'guide.s4t': { en: 'Map, food and reels per day', zh: '每一天：地图、美食和短片', hi: 'हर दिन: नक्शा, खाना और रील्स', es: 'Mapa, comida y reels por día', fr: 'Carte, repas et reels par jour', it: 'Mappa, cibo e reel per giorno' },
  'guide.s4d': { en: 'Each day shows your route on a map, food picks near your stops grouped by craving, and the reels behind every stop.', zh: '每一天都会在地图上显示路线、按口味分类的附近美食推荐，以及每个站点背后的短片。', hi: 'हर दिन आपका रास्ता नक्शे पर, स्टॉप के पास पसंद के हिसाब से खाने के सुझाव, और हर स्टॉप की रील्स दिखाता है।', es: 'Cada día muestra tu ruta en un mapa, sugerencias de comida cerca de tus paradas agrupadas por antojo y los reels de cada parada.', fr: 'Chaque jour affiche votre itinéraire sur une carte, des idées repas près de vos étapes classées par envie, et les reels de chaque étape.', it: 'Ogni giorno mostra il tuo percorso su una mappa, consigli di cibo vicino alle tue tappe raggruppati per voglia, e i reel di ogni tappa.' },
  'guide.s5t': { en: 'Stops, stays and reviews', zh: '站点、住宿和评价', hi: 'स्टॉप, होटल और समीक्षाएं', es: 'Paradas, hoteles y reseñas', fr: 'Étapes, hôtels et avis', it: 'Tappe, hotel e recensioni' },
  'guide.s5d': { en: 'Open any stop for its top reels and a review summary. Add a stay nearby, and check Travel tips for getting around, flights, rentals, and packing.', zh: '打开任意站点，查看热门短片和评价摘要。在附近添加住宿，再去“旅行贴士”看出行、机票、租车和打包攻略。', hi: 'कोई भी स्टॉप खोलकर टॉप रील्स और समीक्षा सारांश देखें। पास में होटल जोड़ें, और घूमने, उड़ान, किराये व सामान के लिए यात्रा सुझाव देखें।', es: 'Abre cualquier parada para ver sus mejores reels y un resumen de reseñas. Añade un hotel cercano y mira los consejos de viaje: transporte, vuelos, alquiler y equipaje.', fr: 'Ouvrez une étape pour ses meilleurs reels et un résumé d’avis. Ajoutez un hôtel à proximité, puis voyez les conseils voyage : transports, vols, location et bagages.', it: 'Apri qualsiasi tappa per i suoi migliori reel e un riepilogo delle recensioni. Aggiungi un hotel vicino e guarda i consigli di viaggio: trasporti, voli, noleggio e bagagli.' },
  'guide.s6t': { en: 'Ask and share', zh: '提问与分享', hi: 'पूछें और साझा करें', es: 'Pregunta y comparte', fr: 'Demandez et partagez', it: 'Chiedi e condividi' },
  'guide.s6d': { en: 'The assistant answers questions about your trip in your language. When the plan looks good, share it to WhatsApp.', zh: '助手会用你的语言回答行程问题。计划满意后，一键分享到 WhatsApp。', hi: 'सहायक आपकी भाषा में यात्रा के सवालों के जवाब देता है। योजना पसंद आए तो उसे WhatsApp पर साझा करें।', es: 'El asistente responde preguntas sobre tu viaje en tu idioma. Cuando el plan te convenza, compártelo por WhatsApp.', fr: 'L’assistant répond à vos questions sur le voyage dans votre langue. Quand le plan vous plaît, partagez-le sur WhatsApp.', it: 'L’assistente risponde alle domande sul tuo viaggio nella tua lingua. Quando il piano ti convince, condividilo su WhatsApp.' },
  'hint.gotit': { en: 'Got it', zh: '知道了', hi: 'समझ गया', es: 'Entendido', fr: 'Compris', it: 'Capito' },
  'hint.skip.t': { en: 'Skip the tour?', zh: '跳过导览？', hi: 'टूर छोड़ें?', es: '¿Omitir el tour?', fr: 'Passer la visite ?', it: 'Saltare il tour?' },
  'hint.skip.d': { en: 'This stops hints on every page. Replay them anytime from Help.', zh: '这将停止所有页面的提示。可随时从帮助中重播。', hi: 'इससे सभी पेजों पर संकेत बंद होंगे। मदद से कभी भी दोबारा देखें।', es: 'Esto detiene las pistas en todas las páginas. Repítelas desde Ayuda.', fr: 'Cela coupe les astuces sur toutes les pages. Relancez-les depuis Aide.', it: 'Questo ferma i suggerimenti in ogni pagina. Riguardali da Aiuto.' },
  'hint.skip.continue': { en: 'Continue hints', zh: '继续提示', hi: 'संकेत जारी रखें', es: 'Seguir', fr: 'Continuer', it: 'Continua' },
  'hint.skip.yes': { en: 'Skip tutorial', zh: '跳过教程', hi: 'ट्यूटोरियल छोड़ें', es: 'Omitir tutorial', fr: 'Passer le tutoriel', it: 'Salta tutorial' },
  'guide.menu.how': { en: 'How it works', zh: '使用指南', hi: 'कैसे काम करता है', es: 'Cómo funciona', fr: 'Comment ça marche', it: 'Come funziona' },
  'guide.menu.hints': { en: 'Replay page hints', zh: '重播页面提示', hi: 'पेज संकेत दोहराएं', es: 'Repetir ayudas', fr: 'Revoir les aides', it: 'Ripeti i suggerimenti' },
  'hint.colls.1t': { en: 'Search your collections', zh: '搜索收藏', hi: 'संग्रह खोजें', es: 'Busca tus colecciones', fr: 'Cherchez vos collections', it: 'Cerca le raccolte' },
  'hint.colls.1d': { en: 'Find a saved collection by name or city. Next: tap a collection to see its posts.', zh: '按名称或城市查找已存收藏。下一步：点一个收藏查看帖子。', hi: 'नाम या शहर से सहेजा संग्रह खोजें। आगे: पोस्ट देखने के लिए संग्रह दबाएं।', es: 'Encuentra una colección por nombre o ciudad. Siguiente: toca una para ver sus publicaciones.', fr: 'Retrouvez une collection par nom ou ville. Ensuite : touchez-la pour voir ses publications.', it: 'Trova una raccolta salvata per nome o città. Poi: toccala per vedere i post.' },
  'hint.colls.2t': { en: 'Pick a collection', zh: '选择一个收藏', hi: 'संग्रह चुनें', es: 'Elige una colección', fr: 'Choisissez une collection', it: 'Scegli una raccolta' },
  'hint.colls.2d': { en: 'Each row is reels saved from one city. Tap it to tick posts and plan a trip.', zh: '每一行是一个城市的短片收藏。点它勾选帖子并规划行程。', hi: 'हर पंक्ति एक शहर की सहेजी रील्स है। पोस्ट चुनकर यात्रा बनाने के लिए दबाएं।', es: 'Cada fila son reels de una ciudad. Tócala para marcar publicaciones y planear.', fr: 'Chaque ligne, des reels d’une ville. Touchez-la pour cocher et planifier.', it: 'Ogni riga sono reel di una città. Toccala per selezionare post e pianificare.' },
  'hint.colln.1t': { en: 'Set trip days', zh: '设定旅行天数', hi: 'यात्रा के दिन तय करें', es: 'Fija los días', fr: 'Fixez les jours', it: 'Imposta i giorni' },
  'hint.colln.1d': { en: 'Choose how many days your trip runs, from 1 to 7.', zh: '选择行程天数，1 到 7 天。', hi: '1 से 7 तक, यात्रा कितने दिन की होगी चुनें।', es: 'Elige de 1 a 7 días para tu viaje.', fr: 'Choisissez de 1 à 7 jours de voyage.', it: 'Scegli da 1 a 7 giorni di viaggio.' },
  'hint.colln.2t': { en: 'Tick the posts you want', zh: '勾选想要的帖子', hi: 'पसंदीदा पोस्ट चुनें', es: 'Marca lo que quieras', fr: 'Cochez vos envies', it: 'Seleziona i post' },
  'hint.colln.2d': { en: 'Tap photos to include them — checked posts show their reels below. Next: plan from the bottom buttons.', zh: '点照片即可选中——选中的帖子会在下方显示短片。下一步：用底部按钮生成计划。', hi: 'शामिल करने के लिए फ़ोटो दबाएं — चुनी पोस्ट की रील्स नीचे दिखेंगी। आगे: नीचे के बटन से बनाएं।', es: 'Toca fotos para incluirlas — verás sus reels abajo. Siguiente: planea con los botones.', fr: 'Touchez les photos pour les inclure — leurs reels sont ci-dessous. Ensuite : planifiez en bas.', it: 'Tocca le foto per includerle — i reel sono qui sotto. Poi: pianifica dai pulsanti.' },
  'hint.colln.3t': { en: 'Plan by saved collection', zh: '按收藏生成计划', hi: 'संग्रह से योजना बनाएं', es: 'Planea desde guardados', fr: 'Planifiez depuis la collection', it: 'Pianifica dai salvati' },
  'hint.colln.3d': { en: 'Adds checked posts to your trip, skipping places already in. Next: review the day-by-day overview.', zh: '把选中的帖子加入行程，已有的地点会自动跳过。下一步：查看每日总览。', hi: 'चुनी पोस्ट यात्रा में जुड़ती हैं, मौजूदा जगहें छूट जाती हैं। आगे: दिन-ब-दिन झलक देखें।', es: 'Añade lo marcado a tu viaje, omitiendo repetidos. Siguiente: revisa el resumen por días.', fr: 'Ajoute vos choix au voyage, sans les doublons. Ensuite : l’aperçu jour par jour.', it: 'Aggiunge i post al viaggio, saltando i duplicati. Poi: rivedi la panoramica giorno per giorno.' },
  'hint.colln.4t': { en: 'Or auto-create', zh: '或自动创建', hi: 'या अपने-आप बनाएं', es: 'O crea en auto', fr: 'Ou en automatique', it: 'Oppure crea in auto' },
  'hint.colln.4d': { en: 'Spreads the best checked stops across your days by itself.', zh: '自动把最棒的站点分散到你的每一天。', hi: 'बेहतरीन स्टॉप खुद-ब-खुद सभी दिनों में फैल जाते हैं।', es: 'Reparte las mejores paradas entre tus días por sí solo.', fr: 'Répartit les meilleures étapes sur vos jours, tout seul.', it: 'Distribuisce da solo le tappe migliori nei tuoi giorni.' },
  'hint.ov.1t': { en: 'Open a day', zh: '打开某一天', hi: 'कोई दिन खोलें', es: 'Abre un día', fr: 'Ouvrez un jour', it: 'Apri un giorno' },
  'hint.ov.1d': { en: 'Each card is one day with its highlight. Tap to see stops, map, food and reels.', zh: '每张卡片是一天及其亮点。点开查看站点、地图、美食和短片。', hi: 'हर कार्ड एक दिन और उसकी खासियत है। स्टॉप, नक्शा, खाना और रील्स के लिए दबाएं।', es: 'Cada tarjeta es un día con su momento top. Tócala: paradas, mapa, comida y reels.', fr: 'Chaque carte, un jour et son temps fort. Touchez : étapes, carte, repas, reels.', it: 'Ogni scheda è un giorno con il suo clou. Tocca: tappe, mappa, cibo e reel.' },
  'hint.ov.2t': { en: 'Trip summary', zh: '行程概要', hi: 'यात्रा सारांश', es: 'Resumen del viaje', fr: 'Résumé du voyage', it: 'Riepilogo del viaggio' },
  'hint.ov.2d': { en: 'A travel-guide highlight of your whole trip, with tips for the days.', zh: '像旅行指南一样点评整个行程，并给出每日小贴士。', hi: 'पूरी यात्रा की खासियत, दिनों के सुझावों के साथ।', es: 'Lo destacado de tu viaje, con consejos por día.', fr: 'Les temps forts du voyage, avec des conseils par jour.', it: 'I momenti clou del viaggio, con consigli per i giorni.' },
  'hint.ov.3t': { en: 'Share to WhatsApp', zh: '分享到 WhatsApp', hi: 'WhatsApp पर साझा करें', es: 'Comparte por WhatsApp', fr: 'Partagez sur WhatsApp', it: 'Condividi su WhatsApp' },
  'hint.ov.3d': { en: 'Sends the finished itinerary to WhatsApp when the plan looks good.', zh: '计划满意后，把完整行程发到 WhatsApp。', hi: 'योजना पसंद आए तो पूरी यात्रा WhatsApp पर भेजें।', es: 'Envía el itinerario a WhatsApp cuando te convenza.', fr: 'Envoyez l’itinéraire sur WhatsApp quand il vous plaît.', it: 'Invia l’itinerario su WhatsApp quando ti convince.' },
  'hint.ov.4t': { en: 'Share as PDF', zh: '分享PDF', hi: 'PDF साझा करें', es: 'Compartir PDF', fr: 'Partager en PDF', it: 'Condividi PDF' },
  'hint.ov.4d': { en: 'A polished PDF with day photos and clean stop lists — send it to WhatsApp or save it.', zh: '带每日美图和清晰站点的精美PDF — 发到WhatsApp或保存。', hi: 'दिन की तस्वीरों व साफ़ स्टॉप सूची वाला बढ़िया PDF — WhatsApp पर भेजें या सहेजें।', es: 'Un PDF con fotos del día y paradas claras — envíalo por WhatsApp o guárdalo.', fr: 'Un beau PDF avec photos du jour et étapes claires — envoyez-le sur WhatsApp ou gardez-le.', it: 'Un bel PDF con foto del giorno ed elenco tappe — invialo su WhatsApp o salvalo.' },
  'hint.day.1t': { en: 'Switch days', zh: '切换日期', hi: 'दिन बदलें', es: 'Cambia de día', fr: 'Changez de jour', it: 'Cambia giorno' },
  'hint.day.1d': { en: 'Each number opens a day; Tips opens travel advice. Stops save automatically per day.', zh: '每个数字代表一天，“贴士”打开旅行攻略。站点按天自动保存。', hi: 'हर नंबर एक दिन खोलता है; “सुझाव” यात्रा सलाह खोलता है। स्टॉप हर दिन खुद सहेजते हैं।', es: 'Cada número abre un día; Consejos abre claves de viaje. Las paradas se guardan solas.', fr: 'Chaque numéro ouvre un jour ; Conseils ouvre les astuces voyage. Étapes sauvegardées seules.', it: 'Ogni numero apre un giorno; Consigli apre dritte di viaggio. Le tappe si salvano da sole.' },
  'hint.day.2t': { en: 'Jump around the day', zh: '在一天内跳转', hi: 'दिन में घूमें', es: 'Muévete por el día', fr: 'Naviguez dans le jour', it: 'Naviga nel giorno' },
  'hint.day.2d': { en: 'Hop to stops, map, reels, food or stay — or back to the trip overview.', zh: '快速跳到站点、地图、短片、美食或住宿，也可返回总览。', hi: 'स्टॉप, नक्शा, रील्स, खाना या होटल पर जाएं — या झलक पर वापस।', es: 'Salta a paradas, mapa, reels, comida u hotel — o al resumen.', fr: 'Allez aux étapes, carte, reels, repas, hôtel — ou à l’aperçu.', it: 'Salta a tappe, mappa, reel, cibo od hotel — o alla panoramica.' },
  'hint.day.3t': { en: 'Add any stop', zh: '添加任意站点', hi: 'कोई भी स्टॉप जोड़ें', es: 'Añade paradas', fr: 'Ajoutez des étapes', it: 'Aggiungi tappe' },
  'hint.day.3d': { en: 'Search places by name and tap a result to add it to this day.', zh: '按名称搜索地点，点结果即可加入本日。', hi: 'नाम से जगह खोजें और इस दिन में जोड़ने के लिए दबाएं।', es: 'Busca lugares por nombre y toca para añadirlos al día.', fr: 'Cherchez un lieu par nom, touchez pour l’ajouter au jour.', it: 'Cerca luoghi per nome e tocca per aggiungerli al giorno.' },
  'hint.day.4t': { en: 'Add a stay', zh: '添加住宿', hi: 'होटल जोड़ें', es: 'Añade hotel', fr: 'Ajoutez un hôtel', it: 'Aggiungi hotel' },
  'hint.day.4d': { en: 'Find a hotel near your stops, with tips on points and card perks.', zh: '在站点附近找酒店，还有积分和卡权益小贴士。', hi: 'स्टॉप के पास होटल खोजें, पॉइंट और कार्ड लाभों के सुझावों के साथ।', es: 'Hotel cerca de tus paradas, con consejos de puntos y tarjetas.', fr: 'Un hôtel près des étapes, conseils points et cartes inclus.', it: 'Hotel vicino alle tappe, con consigli su punti e carte.' },
  'hint.day.5t': { en: 'Shortest route', zh: '最短路线', hi: 'सबसे छोटा रास्ता', es: 'Ruta más corta', fr: 'Trajet le plus court', it: 'Percorso più breve' },
  'hint.day.5d': { en: 'Optimize reorders the day into the shortest drive. Next: open any stop for reels and reviews.', zh: '一键优化，把本日站点排成最短车程。下一步：打开站点看短片和评价。', hi: 'अनुकूलन दिन को सबसे छोटी ड्राइव में क्रमबद्ध करता है। आगे: रील्स और समीक्षा के लिए स्टॉप खोलें।', es: 'Optimizar ordena el día en coche. Siguiente: abre una parada.', fr: 'Optimiser ordonne le jour au plus court. Ensuite : ouvrez une étape.', it: 'Ottimizza ordina il giorno al minimo. Poi: apri una tappa.' },
  'hint.asst.t': { en: 'Nomad Assistant', zh: 'Nomad Assistant', hi: 'Nomad Assistant', es: 'Nomad Assistant', fr: 'Nomad Assistant', it: 'Nomad Assistant' },
  'hint.asst.d': { en: 'Ask it to add or remove stops, find food, or plan your day — it knows your trip.', zh: '让它加减站点、找美食或规划一天 — 它了解你的行程。', hi: 'स्टॉप जोड़ें या हटाएं, खाना खोजें, दिन की योजना बनाएं — यह आपकी यात्रा जानता है।', es: 'Pide añadir o quitar paradas, buscar comida o planear el día — conoce tu viaje.', fr: 'Demandez d’ajouter des étapes, de trouver un repas, de planifier — il connaît votre voyage.', it: 'Chiedi di aggiungere tappe, trovare cibo o pianificare — conosce il tuo viaggio.' },
  'hint.stop.1t': { en: 'Walk your stops', zh: '顺路游览站点', hi: 'स्टॉप दर स्टॉप चलें', es: 'Recorre tus paradas', fr: 'Parcourez vos étapes', it: 'Scorri le tappe' },
  'hint.stop.1d': { en: 'Step through the day’s stops in order, without going back.', zh: '不用返回，按顺序逐个游览本日站点。', hi: 'वापस जाए बिना दिन के स्टॉप क्रम से देखें।', es: 'Avanza por las paradas del día en orden, sin volver.', fr: 'Avancez dans les étapes du jour, sans retour.', it: 'Passa in ordine per le tappe del giorno, senza tornare.' },
  'hint.stop.2t': { en: 'Reels and reviews', zh: '短片和评价', hi: 'रील्स और समीक्षाएं', es: 'Reels y reseñas', fr: 'Reels et avis', it: 'Reel e recensioni' },
  'hint.stop.2d': { en: 'The top reels for this stop, plus a Google review summary.', zh: '本站点的热门短片，以及 Google 评价摘要。', hi: 'इस स्टॉप की टॉप रील्स और Google समीक्षा सारांश।', es: 'Los mejores reels de la parada y un resumen de Google.', fr: 'Les meilleurs reels de l’étape et un résumé Google.', it: 'I migliori reel della tappa e un riepilogo Google.' },
  'hint.stay.1t': { en: 'Search anywhere to stay', zh: '搜索住宿', hi: 'ठहरने की जगह खोजें', es: 'Busca dónde dormir', fr: 'Cherchez où dormir', it: 'Cerca dove dormire' },
  'hint.stay.1d': { en: 'Find hotels or hostels by name — tap a result to add it to your day.', zh: '按名称找酒店或青旅——点结果即可加入本日。', hi: 'नाम से होटल या हॉस्टल खोजें — दिन में जोड़ने के लिए दबाएं।', es: 'Hoteles u hostales por nombre — toca para añadirlos al día.', fr: 'Hôtels ou auberges par nom — touchez pour ajouter au jour.', it: 'Hotel od ostelli per nome — tocca per aggiungerli al giorno.' },
  'hint.stay.2t': { en: 'Top picks near stops', zh: '站点附近精选', hi: 'स्टॉप के पास खास', es: 'Top cerca de ti', fr: 'Top près de vous', it: 'Top vicino a te' },
  'hint.stay.2d': { en: 'Top-rated stays sorted around your stops. Tap + to add one to the day.', zh: '按站点排序的高分住宿。点 + 即可加入本日。', hi: 'आपके स्टॉप के आस-पास बेहतरीन ठहराव। + दबाकर दिन में जोड़ें।', es: 'Lo mejor valorado junto a tus paradas. Toca + para añadirlo.', fr: 'Le mieux noté près de vos étapes. Touchez + pour ajouter.', it: 'I meglio valutati vicino alle tappe. Tocca + per aggiungerli.' },
  'hint.tips.1t': { en: 'Getting around', zh: '市内出行', hi: 'घूमना-फिरना', es: 'Cómo moverse', fr: 'Se déplacer', it: 'Come muoversi' },
  'hint.tips.1d': { en: 'The fastest way to move in this city — transit, rides, or your own two feet.', zh: '这座城市最快的出行方式 — 公交、打车或步行。', hi: 'इस शहर में घूमने का सबसे तेज़ तरीका — परिवहन, कैब या पैदल।', es: 'Lo más rápido en esta ciudad — transporte, apps o a pie.', fr: 'Le plus rapide dans cette ville — transports, VTC ou à pied.', it: 'Il modo più rapido in questa città — mezzi, auto o a piedi.' },
  'hint.tips.2t': { en: 'Trip prep', zh: '行前准备', hi: 'यात्रा की तैयारी', es: 'Prepara el viaje', fr: 'Préparer le voyage', it: 'Prepara il viaggio' },
  'hint.tips.2d': { en: 'Flight, rental-car, packing, and hotel-points advice for the whole trip.', zh: '全程机票、租车、打包和酒店积分建议。', hi: 'पूरी यात्रा के लिए उड़ान, किराये, सामान व होटल-पॉइंट सलाह।', es: 'Consejos de vuelos, alquiler, equipaje y puntos de hotel.', fr: 'Conseils vols, location, bagages et points hôtel.', it: 'Consigli su voli, noleggio, bagagli e punti hotel.' },
});

export function footDays(n, lang){
  switch(lang){
    case 'zh': return `${n}天`;
    case 'hi': return `${n} दिन`;
    case 'es': return `${n} DÍA${n>1?'S':''}`;
    case 'fr': return `${n} JOUR${n>1?'S':''}`;
    case 'it': return `${n} GIORN${n>1?'I':'O'}`;
    default: return `${n} DAY${n>1?'S':''}`;
  }
}

export function stopOfLine(i, n, d, lang){
  switch(lang){
    case 'zh': return `第${d}天 · 第${i}/${n}站`;
    case 'hi': return `दिन ${d} · स्टॉप ${i}/${n}`;
    case 'es': return `PARADA ${i} DE ${n} · DÍA ${d}`;
    case 'fr': return `ÉTAPE ${i} SUR ${n} · JOUR ${d}`;
    case 'it': return `TAPPA ${i} DI ${n} · GIORNO ${d}`;
    default: return `STOP ${i} OF ${n} · DAY ${d}`;
  }
}

export function totalDriveLine(min, lang){
  switch(lang){
    case 'zh': return `总计驾驶 ${min} 分钟`;
    case 'hi': return `कुल ${min} मिनट ड्राइव`;
    case 'es': return `TOTAL ${min} MIN EN COCHE`;
    case 'fr': return `TOTAL ${min} MIN DE ROUTE`;
    case 'it': return `TOTALE ${min} MIN IN AUTO`;
    default: return `TOTAL ${min} MIN DRIVE`;
  }
}

export function nearStopLine(i, min, lang){
  switch(lang){
    case 'zh': return `靠近站点${i} · 步行约${min}分钟`;
    case 'hi': return `स्टॉप ${i} के पास · ~${min} मिनट पैदल`;
    case 'es': return `CERCA PARADA ${i} · ~${min} MIN A PIE`;
    case 'fr': return `PRÈS ÉTAPE ${i} · ~${min} MIN À PIED`;
    case 'it': return `VICINO TAPPA ${i} · ~${min} MIN A PIEDI`;
    default: return `NEAR STOP ${i} · ~${min} MIN WALK`;
  }
}

export function inCityLine(cityU, lang){
  switch(lang){
    case 'zh': return `位于${cityU}`;
    case 'hi': return `${cityU} में`;
    case 'es': return `EN ${cityU}`;
    case 'fr': return `À ${cityU}`;
    case 'it': return `A ${cityU}`;
    default: return `IN ${cityU}`;
  }
}

export function mapFootLine(day, n, lang){
  switch(lang){
    case 'zh': return `第${day}天路线 · ${n}站`;
    case 'hi': return `दिन ${day} मार्ग · ${n} स्टॉप`;
    case 'es': return `DÍA ${day} · ${n} PARADAS`;
    case 'fr': return `JOUR ${day} · ${n} ARRÊTS`;
    case 'it': return `GIORNO ${day} · ${n} TAPPE`;
    default: return `DAY ${day} ROUTE · ${n} STOPS`;
  }
}

const CAT_KEYS = { 'local special': 'food.cat.local', 'coffee': 'food.cat.coffee', 'lunch': 'food.cat.lunch', 'dinner': 'food.cat.dinner', 'fine dine': 'food.cat.fine' };
export function foodCatLabel(cat, lang){
  return CAT_KEYS[cat] ? t(lang, CAT_KEYS[cat]) : cat;
}

const MEAL_KEYS = { lunch: 'food.meal.lunch', dinner: 'food.meal.dinner', coffee: 'food.meal.coffee', Nearby: 'food.meal.nearby' };
export function mealLabel(meal, lang){
  return MEAL_KEYS[meal] ? t(lang, MEAL_KEYS[meal]) : (meal || '');
}

export function paceWord(n, lang){
  if(n<=2) return t(lang, 'pace.slow');
  if(n<=4) return t(lang, 'pace.full');
  return t(lang, 'pace.packed');
}

export function travelDur(m, lang){
  if(m<60){
    switch(lang){
      case 'zh': return `${m}分钟`;
      case 'hi': return `${m} मिनट`;
      default: return `${m} min`;
    }
  }
  const h = Math.floor(m/60), r = m%60;
  switch(lang){
    case 'zh': return `${h}小时${r}分钟`;
    case 'hi': return `${h} घंटे ${r} मिनट`;
    case 'es': case 'fr': case 'it': return `${h} h ${r} min`;
    default: return `${h}h ${r}m`;
  }
}
