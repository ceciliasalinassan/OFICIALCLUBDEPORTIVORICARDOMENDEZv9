'use strict';

const DATA_KEY = 'cdrm_final_data_v5_funcional';
const CFG_KEY = 'cdrm_supabase_cfg_v1';
const BUCKET = 'club-assets';
const ADMIN_PASS = 'ADMINRIMEN1932';

/* SUPABASE REAL FINAL ADMIN DEFAULT SAFE */
function setSupabaseRealDefaultAdminSafe(){
  try{
    const c = JSON.parse(localStorage.getItem(CFG_KEY) || '{}');
    if(!c.url || !c.key){
      localStorage.setItem(CFG_KEY, JSON.stringify({url:'https://xzcbdyabzgwfoylipgco.supabase.co', key:'sb_publishable_rFYVLbY_0uJvOLJ0jftWzw_jsmNwVkl'}));
    }
  }catch(e){
    localStorage.setItem(CFG_KEY, JSON.stringify({url:'https://xzcbdyabzgwfoylipgco.supabase.co', key:'sb_publishable_rFYVLbY_0uJvOLJ0jftWzw_jsmNwVkl'}));
  }
}
setSupabaseRealDefaultAdminSafe();


const SERIES = [
  "SERIE PEQUES","SERIE SEGUNDA INFANTIL","SERIE PRIMERA INFANTIL","SERIE JUVENILES",
  "SERIE ORO","SERIE SUPER SENIOR","SERIE SENIOR","SERIE SEGUNDA ADULTOS",
  "SERIE PRIMERA ADULTOS","SERIE PLATINOS","SERIE HONOR"
];

const DEFAULT_DATA = {
  settings:{
    clubName:'CLUB DEPORTIVO RICARDO MÉNDEZ',
    subtitle:'Portal oficial · San Carlos',
    founded:'12/08/1932',
    anniversary:'12/08',
    homeTitle:'RICARDO MÉNDEZ',
    homeTagline:'Más que un club, una familia.',
    homeText:'Sitio oficial del Club Deportivo Ricardo Méndez de San Carlos.',
    championships:'0',
    activeMembers:'0',
    series:'11'
  },
  siteConfig:{
    whatsapp:'56994413797',
    instagram:'https://www.instagram.com/cd_ricardomendez_sancarlos',
    facebook:'https://www.facebook.com/RICARDOMENDEZSANCARLOS',
    blue:'#00c8ff',
    gold:'#f7d36b'
  },
  appearance:{backgroundImage:'',blue:'#00c8ff',gold:'#f7d36b',overlay:35},
  nextMatch:{rival:'Por definir',logo:'',date:'',place:'',tournament:'',referee:'',broadcast:''},
  history:{text:'Club Deportivo Ricardo Méndez, institución deportiva de San Carlos fundada el 12 de agosto de 1932. Más que un club, una familia.',currentPresident:''},
  directors:[], presidents:[], results:[], news:[], gallery:[], fixture_images:[], standings:{}, sponsors:[], member_requests:[]
};

let supabaseClient = null;
const $ = id => document.getElementById(id);

function clone(x){ return JSON.parse(JSON.stringify(x)); }
function merge(a,b){
  if(Array.isArray(a)) return Array.isArray(b) ? b : a;
  if(a && typeof a === 'object' && b && typeof b === 'object'){
    const out = {...a};
    for(const k of Object.keys(b)) out[k] = merge(a[k], b[k]);
    return out;
  }
  return b ?? a;
}
function getData(){
  try{return merge(DEFAULT_DATA, JSON.parse(localStorage.getItem(DATA_KEY)||'{}'));}
  catch(e){return clone(DEFAULT_DATA);}
}
function saveData(d){ localStorage.setItem(DATA_KEY, JSON.stringify(merge(DEFAULT_DATA,d))); }

function normUrl(u){
  u=String(u||'').trim();
  if(u && !u.startsWith('http') && !u.includes('.supabase.co')) u='https://'+u+'.supabase.co';
  return u.replace(/\/rest\/v1\/?$/,'').replace(/\/$/,'');
}
function getCfg(){try{return JSON.parse(localStorage.getItem(CFG_KEY)||'{}')}catch(e){return {}}}
function setCfg(url,key){localStorage.setItem(CFG_KEY,JSON.stringify({url:normUrl(url),key:String(key||'').trim()}));}
function initSB(){
  const cfg=getCfg();
  if(!window.supabase || !cfg.url || !cfg.key) return false;
  supabaseClient = window.supabase.createClient(normUrl(cfg.url), cfg.key);
  return true;
}

function status(msg){ if($('statusLine')) $('statusLine').textContent = msg; }
function toast(msg,type='success'){
  let box=$('adminConfirmToast');
  if(!box){
    box=document.createElement('div');
    box.id='adminConfirmToast';
    box.className='admin-confirm-toast';
    document.body.appendChild(box);
  }
  box.className='admin-confirm-toast show '+type;
  box.innerHTML=`<strong>${type==='error'?'⚠️ Error':'✅ Listo'}</strong><span>${msg}</span>`;
  clearTimeout(window.__toastTimer);
  window.__toastTimer=setTimeout(()=>box.classList.remove('show'),3500);
}
function ok(msg){ toast(msg,'success'); status('Estado: '+msg); }
function err(e){ console.error(e); toast(e.message||String(e),'error'); status('Error: '+(e.message||e)); }

function safeFileName(file){
  const original=file?.name||'archivo.jpg';
  const ext=(original.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
  const base=original.replace(/\.[^.]+$/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,90)||'archivo';
  return `${Date.now()}_${Math.random().toString(36).slice(2,9)}_${base}.${ext}`;
}
function folderName(folder){
  return ({news:'news',gallery:'gallery',fixture:'fixture',fixtures:'fixture',media:'media',photos:'gallery',presidents:'presidents',sponsors:'sponsors',logos:'logos',backgrounds:'backgrounds',files:'files'}[folder]||folder||'media');
}
async function uploadFile(file, folder='media'){
  if(!file) return '';
  if(!initSB()) throw new Error('Primero guarda/conecta Supabase antes de subir archivos.');
  const path = `${folderName(folder)}/${safeFileName(file)}`;
  const {error}=await supabaseClient.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||'application/octet-stream'});
  if(error) throw new Error('No se pudo subir a club-assets: '+error.message);
  const {data}=supabaseClient.storage.from(BUCKET).getPublicUrl(path);
  if(!data?.publicUrl) throw new Error('No se pudo obtener URL pública.');
  return data.publicUrl;
}

/* Supabase tablas */
async function replaceTable(name, rows){
  if(name==='settings'){
    if(rows.length){
      const {error}=await supabaseClient.from('settings').upsert(rows,{onConflict:'key'});
      if(error) throw error;
    }
    return;
  }
  await supabaseClient.from(name).delete().neq('id','00000000-0000-0000-0000-000000000000');
  if(rows.length){
    const {error}=await supabaseClient.from(name).insert(rows);
    if(error) throw error;
  }
}
async function pushCloud(d){
  if(!initSB()) throw new Error('Supabase no conectado.');
  d=merge(DEFAULT_DATA,d);
  await replaceTable('settings',[
    {key:'settings',value:JSON.stringify(d.settings)},
    {key:'siteConfig',value:JSON.stringify(d.siteConfig)},
    {key:'appearance',value:JSON.stringify(d.appearance)},
    {key:'nextMatch',value:JSON.stringify(d.nextMatch)},
    {key:'history',value:JSON.stringify(d.history)},
    {key:'playerHighlights',value:JSON.stringify(d.playerHighlights||[])}
  ]);
  await replaceTable('directors',(d.directors||[]).map((x,i)=>({role:x.role||'',name:x.name||'',sort_order:i})));
  await replaceTable('sponsors',(d.sponsors||[]).map((x,i)=>({name:x.name||'',url:x.url||'',sort_order:i})));
  await replaceTable('fixture_images',(d.fixture_images||[]).map((x,i)=>({title:x.title||'',image:x.image||'',sort_order:i})));
  await replaceTable('results',(d.results||[]).map((x,i)=>({date_text:x.date||'',match:x.match||'',score:x.score||'',scorers:x.scorers||'',sort_order:i})));
  await replaceTable('news',(d.news||[]).map((x,i)=>({title:x.title||'',text:x.text||'',date_text:x.date||'',image:x.image||'',sort_order:i})));
  await replaceTable('gallery',(d.gallery||[]).map((x,i)=>({title:x.title||'',type:x.type||'image',url:x.url||'',sort_order:i})));
  await replaceTable('presidents',(d.presidents||[]).map((x,i)=>({name:x.name||'',period:x.period||'',image:x.image||'',sort_order:i})));
  const standings=[];
  Object.entries(d.standings||{}).forEach(([serie,rows])=>(rows||[]).forEach((x,i)=>standings.push({serie,team:x.team||'',pj:+x.pj||0,pg:+x.pg||0,pe:+x.pe||0,pp:+x.pp||0,gf:+x.gf||0,gc:+x.gc||0,dg:+x.dg||0,pts:+x.pts||0,sort_order:i})));
  await replaceTable('standings',standings);
}
async function pullCloud(){
  if(!initSB()) throw new Error('Supabase no conectado.');
  const d=clone(DEFAULT_DATA);
  let res=await supabaseClient.from('settings').select('*');
  if(!res.error && res.data) res.data.forEach(r=>{try{d[r.key]=JSON.parse(r.value)}catch(e){}});
  res=await supabaseClient.from('directors').select('*').order('sort_order',{ascending:true});
  if(!res.error&&res.data)d.directors=res.data.map(x=>({role:x.role,name:x.name}));
  res=await supabaseClient.from('sponsors').select('*').order('sort_order',{ascending:true});
  if(!res.error&&res.data)d.sponsors=res.data.map(x=>({name:x.name,url:x.url}));
  res=await supabaseClient.from('fixture_images').select('*').order('sort_order',{ascending:true});
  if(!res.error&&res.data)d.fixture_images=res.data.map(x=>({title:x.title,image:x.image}));
  res=await supabaseClient.from('results').select('*').order('sort_order',{ascending:true});
  if(!res.error&&res.data)d.results=res.data.map(x=>({date:x.date_text,match:x.match,score:x.score,scorers:x.scorers}));
  res=await supabaseClient.from('news').select('*').order('sort_order',{ascending:true});
  if(!res.error&&res.data)d.news=res.data.map(x=>({title:x.title,text:x.text,date:x.date_text,image:x.image}));
  res=await supabaseClient.from('gallery').select('*').order('sort_order',{ascending:true});
  if(!res.error&&res.data)d.gallery=res.data.map(x=>({title:x.title,type:x.type,url:x.url}));
  res=await supabaseClient.from('presidents').select('*').order('sort_order',{ascending:true});
  if(!res.error&&res.data)d.presidents=res.data.map(x=>({name:x.name,period:x.period,image:x.image}));
  res=await supabaseClient.from('standings').select('*').order('sort_order',{ascending:true});
  if(!res.error&&res.data){
    d.standings={};
    res.data.forEach(x=>{if(!d.standings[x.serie])d.standings[x.serie]=[];d.standings[x.serie].push({team:x.team,pj:x.pj,pg:x.pg,pe:x.pe,pp:x.pp,gf:x.gf,gc:x.gc,dg:x.dg,pts:x.pts});});
  }
  saveData(d);
  return d;
}
async function saveAll(d){
  saveData(d);
  try{ await pushCloud(d); ok('Información guardada correctamente.'); }
  catch(e){ saveData(d); toast('Guardado local. Revisa Supabase.','error'); status('Estado: guardado local. '+e.message); }
  fillAdmin();
}

/* Render listas admin */
function listHTML(arr, label){
  return (arr||[]).map((x,i)=>`<div class="list-item"><span>${label(x)}</span><button type="button" class="deleteItem" data-index="${i}">Eliminar</button></div>`).join('');
}
function renderAdminLists(){
  const d=getData();
  if($('directorsList')) $('directorsList').innerHTML=listHTML(d.directors,x=>`${x.role||''}: ${x.name||''}`);
  if($('presidentsList')) $('presidentsList').innerHTML=listHTML(d.presidents,x=>`${x.name||''} ${x.period||''}`);
  if($('resultsList')) $('resultsList').innerHTML=listHTML(d.results,x=>`${x.match||''} ${x.score||''}`);
  if($('newsList')) $('newsList').innerHTML=listHTML(d.news,x=>x.title||'Noticia');
  if($('galleryList')) $('galleryList').innerHTML=listHTML(d.gallery,x=>x.title||'Galería');
  if($('fixtureList')) $('fixtureList').innerHTML=listHTML(d.fixture_images,x=>x.title||'Fixture');
  if($('sponsorsList')) $('sponsorsList').innerHTML=listHTML(d.sponsors,x=>x.name||'Auspiciador');
}

/* llenar campos */
function fillAdmin(){
  const d=getData(), cfg=getCfg();
  if($('supabaseUrl')) $('supabaseUrl').value=cfg.url||'';
  if($('supabaseKey')) $('supabaseKey').value=cfg.key||'';
  if($('homeTitle')) $('homeTitle').value=d.settings.homeTitle||'';
  if($('homeIntroInput')) $('homeIntroInput').value=d.settings.homeText||'';
  if($('metricMembers')) $('metricMembers').value=d.settings.activeMembers||'';
  if($('metricTitles')) $('metricTitles').value=d.settings.championships||'';
  if($('siteWhatsapp')) $('siteWhatsapp').value=d.siteConfig.whatsapp||'';
  if($('siteInstagram')) $('siteInstagram').value=d.siteConfig.instagram||'';
  if($('siteFacebook')) $('siteFacebook').value=d.siteConfig.facebook||'';
  if($('siteColorBlue')) $('siteColorBlue').value=d.siteConfig.blue||'#00c8ff';
  if($('siteColorGold')) $('siteColorGold').value=d.siteConfig.gold||'#f7d36b';
  if($('matchRival')) $('matchRival').value=d.nextMatch.rival||'';
  if($('matchTournament')) $('matchTournament').value=d.nextMatch.tournament||'';
  if($('matchReferee')) $('matchReferee').value=d.nextMatch.referee||'';
  if($('matchBroadcast')) $('matchBroadcast').value=d.nextMatch.broadcast||'';
  if($('matchDate')) $('matchDate').value=d.nextMatch.date||'';
  if($('matchPlace')) $('matchPlace').value=d.nextMatch.place||'';
  if($('matchLogoUrl')) $('matchLogoUrl').value=d.nextMatch.logo||'';
  if($('historyText')) $('historyText').value=d.history.text||'';
  if($('presidentName')) $('presidentName').value=d.history.currentPresident||'';
  if($('backgroundUrl')) $('backgroundUrl').value=d.appearance.backgroundImage||'';
  if($('appearanceBlue')) $('appearanceBlue').value=d.appearance.blue||'#00c8ff';
  if($('appearanceGold')) $('appearanceGold').value=d.appearance.gold||'#f7d36b';
  if($('backgroundOverlay')) $('backgroundOverlay').value=d.appearance.overlay??35;
  if($('backgroundOverlayValue')) $('backgroundOverlayValue').textContent=(d.appearance.overlay??35)+'%';
  if($('backgroundPreview')) $('backgroundPreview').style.backgroundImage=d.appearance.backgroundImage?`url("${d.appearance.backgroundImage}")`:'url("estadio_real_publico.jpg")';
  if($('standingSerie') && !$('standingSerie').dataset.loaded){$('standingSerie').dataset.loaded='1';$('standingSerie').innerHTML=SERIES.map(s=>`<option>${s}</option>`).join('');}
  renderAdminLists();
}

/* acciones */
async function action(id){
  const d=getData();
  if(id==='saveSupabase'){setCfg($('supabaseUrl')?.value,$('supabaseKey')?.value);ok('Conexión Supabase guardada.');return;}
  if(id==='loadCloud'){await pullCloud();ok('Datos cargados desde Supabase.');fillAdmin();return;}
  if(id==='saveCloud'){await pushCloud(getData());ok('Datos subidos a Supabase.');return;}
  if(id==='saveGeneral'){d.settings.homeTitle=$('homeTitle')?.value||d.settings.homeTitle;d.settings.homeText=$('homeIntroInput')?.value||'';d.settings.activeMembers=$('metricMembers')?.value||'0';d.settings.championships=$('metricTitles')?.value||'0';d.siteConfig.whatsapp=$('siteWhatsapp')?.value||'';d.siteConfig.instagram=$('siteInstagram')?.value||'';d.siteConfig.facebook=$('siteFacebook')?.value||'';d.siteConfig.blue=$('siteColorBlue')?.value||'#00c8ff';d.siteConfig.gold=$('siteColorGold')?.value||'#f7d36b';await saveAll(d);return;}
  if(id==='saveMatch'){let logo=$('matchLogoUrl')?.value||'';const f=$('matchLogoFile')?.files?.[0];if(f)logo=await uploadFile(f,'logos');d.nextMatch={rival:$('matchRival')?.value||'Por definir',tournament:$('matchTournament')?.value||'',referee:$('matchReferee')?.value||'',broadcast:$('matchBroadcast')?.value||'',date:$('matchDate')?.value||'',place:$('matchPlace')?.value||'',logo};await saveAll(d);return;}
  if(id==='saveHistory'){d.history.text=$('historyText')?.value||'';d.history.currentPresident=$('presidentName')?.value||'';await saveAll(d);return;}
  if(id==='addDirector'){d.directors.push({role:$('directorRole')?.value||'',name:$('directorName')?.value||''});await saveAll(d);return;}
  if(id==='addPresident'){let image='';const f=$('presidentPhoto')?.files?.[0];if(f)image=await uploadFile(f,'presidents');d.presidents.unshift({name:$('presidentGalleryName')?.value||'',period:$('presidentPeriod')?.value||'',image});await saveAll(d);return;}
  if(id==='addResult'){d.results.unshift({date:$('resultDate')?.value||'',match:$('resultMatch')?.value||'',score:$('resultScore')?.value||''});await saveAll(d);return;}
  if(id==='addNews'){let image='';const f=$('newsImage')?.files?.[0];if(f)image=await uploadFile(f,'news');d.news.unshift({title:$('newsTitle')?.value||'',text:$('newsText')?.value||'',date:new Date().toLocaleDateString('es-CL'),image});await saveAll(d);return;}
  if(id==='addMedia'){let url=$('mediaUrl')?.value||'';let type='image';const f=$('mediaFile')?.files?.[0];if(f){url=await uploadFile(f,'gallery');type=f.type?.startsWith('video')?'video':'image';}d.gallery.unshift({title:$('mediaTitle')?.value||'',type,url});await saveAll(d);return;}
  if(id==='addFixture'){let image='';const f=$('fixtureImage')?.files?.[0];if(f)image=await uploadFile(f,'fixture');d.fixture_images.unshift({title:$('fixtureTitle')?.value||'',image});await saveAll(d);return;}
  if(id==='addStanding'){const serie=$('standingSerie')?.value||SERIES[0];if(!d.standings[serie])d.standings[serie]=[];const gf=+$('gf')?.value||0,gc=+$('gc')?.value||0;d.standings[serie].push({team:$('teamName')?.value||'',pj:+$('pj')?.value||0,pg:+$('pg')?.value||0,pe:+$('pe')?.value||0,pp:+$('pp')?.value||0,gf,gc,dg:gf-gc,pts:+$('pts')?.value||0});await saveAll(d);return;}
  if(id==='addSponsor'){let url=$('sponsorUrl')?.value||'';const f=($('sponsorFile')||$('sponsorLogo'))?.files?.[0];if(f)url=await uploadFile(f,'sponsors');d.sponsors.push({name:$('sponsorName')?.value||'',url});await saveAll(d);return;}
  if(id==='saveBackground'){let url=$('backgroundUrl')?.value||'';const f=$('backgroundFile')?.files?.[0];if(f)url=await uploadFile(f,'backgrounds');d.appearance.backgroundImage=url;await saveAll(d);return;}
  if(id==='restoreBackground'){d.appearance.backgroundImage='';await saveAll(d);return;}
  if(id==='saveAppearanceColors'){d.appearance.blue=$('appearanceBlue')?.value||'#00c8ff';d.appearance.gold=$('appearanceGold')?.value||'#f7d36b';d.appearance.overlay=$('backgroundOverlay')?.value||35;d.siteConfig.blue=d.appearance.blue;d.siteConfig.gold=d.appearance.gold;await saveAll(d);return;}
}

/* UI */
function openAdmin(){ $('loginPanel')?.classList.add('hidden'); $('adminPanel')?.classList.remove('hidden'); sessionStorage.setItem('cdrm_admin_ok','1'); fillAdmin(); }
function bindUI(){
  $('loginBtn')?.addEventListener('click',()=>{(($('adminPassword')?.value||'').trim()===ADMIN_PASS)?openAdmin():toast('Clave incorrecta','error');});
  $('adminPassword')?.addEventListener('keydown',e=>{if(e.key==='Enter')$('loginBtn')?.click();});
  if(sessionStorage.getItem('cdrm_admin_ok')==='1') openAdmin();

  document.querySelectorAll('.tabs button').forEach(btn=>{
    btn.addEventListener('click',()=>{document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.tab-content').forEach(t=>t.classList.add('hidden'));$(btn.dataset.tab)?.classList.remove('hidden');});
  });

  document.addEventListener('click',async e=>{
    const btn=e.target.closest('button'); if(!btn) return;
    if(btn.classList.contains('themePreset')){
      e.preventDefault(); const d=getData(); if(btn.dataset.theme==='nike'){d.appearance.blue='#0077ff';d.appearance.gold='#ffffff';d.appearance.overlay=42;}else if(btn.dataset.theme==='adidas'){d.appearance.blue='#00c8ff';d.appearance.gold='#f7d36b';d.appearance.overlay=38;}else{d.appearance.blue='#00bfff';d.appearance.gold='#f3c84b';d.appearance.overlay=35;}await saveAll(d);return;
    }
    const ids=['saveSupabase','loadCloud','saveCloud','saveGeneral','saveMatch','saveHistory','addDirector','addPresident','addResult','addNews','addMedia','addFixture','addStanding','addSponsor','saveBackground','restoreBackground','saveAppearanceColors'];
    if(ids.includes(btn.id)){
      e.preventDefault();
      const old=btn.textContent; btn.disabled=true; btn.textContent='Procesando...';
      try{await action(btn.id);}catch(ex){err(ex);}
      btn.textContent=old; btn.disabled=false;
    }
  },true);

  $('backgroundOverlay')?.addEventListener('input',()=>{if($('backgroundOverlayValue'))$('backgroundOverlayValue').textContent=$('backgroundOverlay').value+'%';});
  fillAdmin();
}

document.addEventListener('DOMContentLoaded', bindUI);


/* =========================================================
   IMPORTAR RESULTADOS DESDE EXCEL
   Columnas recomendadas: Fecha | Partido | Resultado | Goleadores
========================================================= */
function normalizeExcelHeader(value){
  return String(value || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,'')
    .trim();
}

function getExcelCell(row, headers, names, fallbackIndex){
  for(const name of names){
    const idx = headers.findIndex(h => h.includes(name));
    if(idx >= 0 && row[idx] !== undefined && row[idx] !== null) return row[idx];
  }
  return row[fallbackIndex] ?? '';
}

function excelDateToText(value){
  if(value === null || value === undefined) return '';
  if(typeof value === 'number' && window.XLSX && XLSX.SSF){
    try{ return XLSX.SSF.format('dd-mm-yyyy', value); }catch(e){}
  }
  if(value instanceof Date) return value.toLocaleDateString('es-CL');
  return String(value).trim();
}

async function importResultsFromExcelFile(file){
  if(!file) throw new Error('Selecciona un archivo Excel.');
  if(!window.XLSX) throw new Error('No se cargó la librería Excel. Revisa conexión a internet.');

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {type:'array', cellDates:true});
  const firstSheet = workbook.SheetNames[0];
  if(!firstSheet) throw new Error('El Excel no tiene hojas.');

  const sheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json(sheet, {header:1, defval:''});
  if(!rows || rows.length < 2) throw new Error('El Excel debe tener encabezados y al menos una fila.');

  const headers = (rows[0] || []).map(normalizeExcelHeader);
  const imported = [];

  for(let i=1; i<rows.length; i++){
    const row = rows[i] || [];
    if(row.every(v => String(v || '').trim() === '')) continue;

    const fecha = excelDateToText(getExcelCell(row, headers, ['fecha','dia','date'], 0));
    const partido = String(getExcelCell(row, headers, ['partido','encuentro','rival','match'], 1) || '').trim();
    const resultado = String(getExcelCell(row, headers, ['resultado','marcador','score'], 2) || '').trim();
    const goleadores = String(getExcelCell(row, headers, ['goleadores','anotadores','scorers','goles'], 3) || '').trim();

    if(!partido && !resultado) continue;
    imported.push({date: fecha, match: partido, score: resultado, scorers: goleadores});
  }

  if(!imported.length) throw new Error('No se encontraron resultados válidos en el Excel.');

  const d = getData();
  d.results = [...imported, ...(d.results || [])];
  await saveAll(d);
  fillAdmin();
  ok('Resultados importados desde Excel: ' + imported.length);
}

document.addEventListener('click', async function(e){
  const btn = e.target.closest('#importResultsExcel');
  if(!btn) return;
  e.preventDefault();
  e.stopPropagation();

  const file = document.getElementById('resultsExcelFile')?.files?.[0];
  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Importando...';

  try{
    await importResultsFromExcelFile(file);
  }catch(error){
    err(error);
  }finally{
    btn.disabled = false;
    btn.textContent = old;
  }
}, true);


/* =========================================================
   IMPORTADOR OFICIAL PLANILLA RICARDO MÉNDEZ
   Reconoce columnas: Serie | PJ | G | E | P | GF | GC | DF | PTS
   Actualiza:
   - Puntajes / Tabla General
   - Resultados con resumen de la fecha
========================================================= */
function rmNormalizeHeader(value){
  return String(value || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]/g,'')
    .trim();
}

function rmNumber(value){
  const n = Number(String(value ?? '').replace(',', '.').trim());
  return Number.isFinite(n) ? n : 0;
}

function rmExcelDateToText(value){
  if(value === null || value === undefined) return '';
  if(typeof value === 'number' && window.XLSX && XLSX.SSF){
    try{ return XLSX.SSF.format('dd-mm-yyyy', value); }catch(e){}
  }
  if(value instanceof Date) return value.toLocaleDateString('es-CL');
  return String(value).trim();
}

function rmReadSheetRows(file){
  return new Promise((resolve, reject)=>{
    if(!file) return reject(new Error('Selecciona un archivo Excel.'));
    if(!window.XLSX) return reject(new Error('No se cargó la librería Excel.'));
    file.arrayBuffer().then(buffer=>{
      const workbook = XLSX.read(buffer, {type:'array', cellDates:true});
      const firstSheet = workbook.SheetNames[0];
      if(!firstSheet) throw new Error('El Excel no tiene hojas.');
      const sheet = workbook.Sheets[firstSheet];
      const rows = XLSX.utils.sheet_to_json(sheet, {header:1, defval:''});
      resolve({rows, sheetName:firstSheet});
    }).catch(reject);
  });
}

function rmParseOfficialStatsRows(rows){
  if(!rows || rows.length < 2) throw new Error('El Excel debe tener encabezados y al menos una fila.');
  const headers = (rows[0] || []).map(rmNormalizeHeader);

  const idx = {
    serie: headers.findIndex(h => h === 'serie' || h.includes('serie')),
    pj: headers.findIndex(h => h === 'pj' || h.includes('partidosjugados')),
    pg: headers.findIndex(h => h === 'g' || h === 'pg' || h.includes('ganados')),
    pe: headers.findIndex(h => h === 'e' || h === 'pe' || h.includes('empatados')),
    pp: headers.findIndex(h => h === 'p' || h === 'pp' || h.includes('perdidos')),
    gf: headers.findIndex(h => h === 'gf' || h.includes('golesfavor')),
    gc: headers.findIndex(h => h === 'gc' || h.includes('golescontra')),
    dg: headers.findIndex(h => h === 'df' || h === 'dg' || h.includes('diferencia')),
    pts: headers.findIndex(h => h === 'pts' || h === 'puntos')
  };

  const isOfficial = idx.serie >= 0 && idx.pj >= 0 && idx.pts >= 0 && idx.gf >= 0 && idx.gc >= 0;
  if(!isOfficial) return null;

  const rowsOut = [];
  let total = null;

  for(let i=1; i<rows.length; i++){
    const row = rows[i] || [];
    const serie = String(row[idx.serie] || '').trim();
    if(!serie) continue;

    const obj = {
      team: serie,
      pj: rmNumber(row[idx.pj]),
      pg: rmNumber(row[idx.pg]),
      pe: rmNumber(row[idx.pe]),
      pp: rmNumber(row[idx.pp]),
      gf: rmNumber(row[idx.gf]),
      gc: rmNumber(row[idx.gc]),
      dg: idx.dg >= 0 ? rmNumber(row[idx.dg]) : rmNumber(row[idx.gf]) - rmNumber(row[idx.gc]),
      pts: rmNumber(row[idx.pts])
    };

    if(serie.toLowerCase() === 'total'){
      total = obj;
    }else{
      rowsOut.push(obj);
    }
  }

  if(!rowsOut.length) throw new Error('No se encontraron series válidas en la planilla.');

  return {rows: rowsOut, total};
}

function rmParseResultRows(rows){
  if(!rows || rows.length < 2) throw new Error('El Excel debe tener encabezados y al menos una fila.');
  const headers = (rows[0] || []).map(rmNormalizeHeader);
  const find = names => headers.findIndex(h => names.some(n => h.includes(n)));
  const iFecha = find(['fecha','dia','date']);
  const iPartido = find(['partido','encuentro','rival','match']);
  const iResultado = find(['resultado','marcador','score']);
  const iGoleadores = find(['goleadores','anotadores','scorers','goles']);

  const imported = [];
  for(let i=1; i<rows.length; i++){
    const row = rows[i] || [];
    if(row.every(v => String(v || '').trim() === '')) continue;
    const fecha = rmExcelDateToText(row[iFecha >= 0 ? iFecha : 0]);
    const partido = String(row[iPartido >= 0 ? iPartido : 1] || '').trim();
    const resultado = String(row[iResultado >= 0 ? iResultado : 2] || '').trim();
    const goleadores = String(row[iGoleadores >= 0 ? iGoleadores : 3] || '').trim();
    if(!partido && !resultado) continue;
    imported.push({date: fecha, match: partido, score: resultado, scorers: goleadores});
  }
  return imported;
}

async function importOfficialPlanillaRicardoMendez(file, mode){
  const {rows, sheetName} = await rmReadSheetRows(file);
  const official = rmParseOfficialStatsRows(rows);
  const d = getData();

  if(official){
    d.standings = d.standings || {};
    d.standings['TABLA GENERAL'] = official.rows;

    const totalPts = official.total ? official.total.pts : official.rows.reduce((a,b)=>a+(Number(b.pts)||0),0);
    const totalPJ = official.total ? official.total.pj : official.rows.reduce((a,b)=>a+(Number(b.pj)||0),0);
    const totalDG = official.total ? official.total.dg : official.rows.reduce((a,b)=>a+(Number(b.dg)||0),0);
    // IMPORTANTE:
    // La planilla oficial de puntajes NO debe aparecer en Últimos Resultados.
    // Solo actualiza Puntajes / Posiciones.
    d.results = (d.results || []).filter(r => !isWrongStandingResultCard(r));

    await saveAll(d);
    fillAdmin();
    ok(`Planilla oficial importada: ${official.rows.length} series cargadas en Puntajes y resumen en Resultados.`);
    return;
  }

  const results = rmParseResultRows(rows);
  if(!results.length) throw new Error('El Excel no corresponde a resultados ni a la planilla oficial de puntajes.');
  d.results = [...results, ...(d.results || [])];
  await saveAll(d);
  fillAdmin();
  ok('Resultados importados desde Excel: ' + results.length);
}

// Reemplaza importador anterior para el botón de Resultados.
async function importResultsFromExcelFile(file){
  return importOfficialPlanillaRicardoMendez(file, 'results');
}

// Botón específico de Puntajes.
document.addEventListener('click', async function(e){
  const btn = e.target.closest('#importStandingsExcel');
  if(!btn) return;
  e.preventDefault();
  e.stopPropagation();

  const file = document.getElementById('standingsExcelFile')?.files?.[0];
  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Importando...';

  try{
    await importOfficialPlanillaRicardoMendez(file, 'standings');
  }catch(error){
    err(error);
  }finally{
    btn.disabled = false;
    btn.textContent = old;
  }
}, true);


/* =========================================================
   FIX DEFINITIVO: PLANILLA DE PUNTAJES NO VA A RESULTADOS
========================================================= */
function rmOfficialSeriesNames(){
  return [
    'Super Senior','Senior 35','1° Infantil','1º Infantil','2° Infantil','2º Infantil',
    'Peques','Juveniles','Serie de Oro','Serie Damas','Senior','Primera Adultos',
    'Segunda Adultos','Honor','Platinos','Serie Oro','Primera Infantil','Segunda Infantil',
    'TOTAL','Total'
  ];
}

function isWrongStandingResultCard(r){
  if(!r) return false;
  const match = String(r.match || '').trim().toLowerCase();
  const score = String(r.score || '').trim();
  const date = String(r.date || '').trim();
  const series = rmOfficialSeriesNames().map(x=>x.toLowerCase());
  const looksLikeSeries = series.some(s => match === s || match.includes(s));
  const scoreLooksNumeric = /^[0-9]+$/.test(score) || /^[0-9]+\s*$/.test(score);
  const dateLooksNumeric = /^[0-9]+$/.test(date);
  return looksLikeSeries || (scoreLooksNumeric && dateLooksNumeric);
}

if(typeof importOfficialPlanillaRicardoMendez === 'function' && !window.__fixPlanillaSoloPuntajes){
  window.__fixPlanillaSoloPuntajes = true;
  const oldImportOfficialPlanillaRicardoMendez = importOfficialPlanillaRicardoMendez;

  importOfficialPlanillaRicardoMendez = async function(file, mode){
    const before = getData();
    const beforeResults = Array.isArray(before.results) ? before.results.filter(r => !isWrongStandingResultCard(r) && r.match !== 'Resumen general por series') : [];

    await oldImportOfficialPlanillaRicardoMendez(file, mode);

    const after = getData();
    const officialRows = after.standings && after.standings['TABLA GENERAL'];

    if(officialRows && officialRows.length){
      after.results = beforeResults;
      await saveAll(after);
      fillAdmin();
      ok('Planilla cargada solo en Puntajes/Posiciones. Resultados limpiados correctamente.');
    }
  }
}

// Botón de limpieza manual por seguridad
async function cleanWrongResultsFromStandings(){
  const d = getData();
  d.results = (d.results || []).filter(r => !isWrongStandingResultCard(r) && r.match !== 'Resumen general por series');
  await saveAll(d);
  fillAdmin();
  ok('Resultados limpiados: se eliminaron tarjetas creadas por planilla de puntajes.');
}


document.addEventListener('click', async function(e){
  const btn = e.target.closest('#cleanWrongResults');
  if(!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Limpiando...';
  try{
    await cleanWrongResultsFromStandings();
  }catch(error){
    err(error);
  }finally{
    btn.disabled = false;
    btn.textContent = old;
  }
}, true);


/* =========================================================
   FIX SUPABASE: PUNTAJES NO SE GUARDAN EN RESULTS
   Limpia registros de series desde tabla results en Supabase.
========================================================= */
function rmSeriesResultNamesStrict(){
  return [
    'super senior','senior 35','1° infantil','1º infantil','1 infantil','2° infantil','2º infantil','2 infantil',
    'peques','juveniles','serie de oro','serie damas','senior','primera adultos','segunda adultos',
    'honor','platinos','serie oro','primera infantil','segunda infantil','total'
  ];
}

function isStandingRowInsideResultsStrict(r){
  if(!r) return false;
  const match = String(r.match || r.match_text || r.title || '').trim().toLowerCase();
  const date = String(r.date || r.date_text || '').trim();
  const score = String(r.score || '').trim();
  const scorers = String(r.scorers || '').trim().toLowerCase();
  const series = rmSeriesResultNamesStrict();

  if(match === 'resumen general por series') return true;
  if(scorers.includes('planilla oficial')) return true;
  if(series.some(s => match === s || match.includes(s))) return true;
  if(/^[0-9]+$/.test(date) && /^[0-9]+$/.test(score)) return true;
  return false;
}

async function cleanResultsTableFromStandingRowsSupabase(){
  const d = getData();
  d.results = (d.results || []).filter(r => !isStandingRowInsideResultsStrict(r));
  saveData(d);

  if(initSB && initSB()){
    try{
      const {data, error} = await supabaseClient.from('results').select('*');
      if(error) throw error;

      const ids = (data || [])
        .filter(isStandingRowInsideResultsStrict)
        .map(r => r.id)
        .filter(Boolean);

      if(ids.length){
        const {error: delErr} = await supabaseClient.from('results').delete().in('id', ids);
        if(delErr) throw delErr;
      }

      // Reinsertar solo resultados reales del navegador si hay.
      await replaceTable('results', (d.results || []).map((x,i)=>({
        date_text:x.date||'',
        match:x.match||'',
        score:x.score||'',
        scorers:x.scorers||'',
        sort_order:i
      })));
    }catch(e){
      console.warn('No se pudo limpiar tabla results en Supabase:', e);
      throw e;
    }
  }

  fillAdmin();
  ok('Tabla results limpiada: los puntajes ya no están en Resultados.');
}

// Override definitivo: si el Excel es planilla oficial, solo standings + limpiar results.
if(typeof importOfficialPlanillaRicardoMendez === 'function' && !window.__officialPlanillaOnlyStandingsFinal){
  window.__officialPlanillaOnlyStandingsFinal = true;
  const previousOfficialImporter = importOfficialPlanillaRicardoMendez;

  importOfficialPlanillaRicardoMendez = async function(file, mode){
    const {rows} = await rmReadSheetRows(file);
    const official = rmParseOfficialStatsRows(rows);
    const d = getData();

    if(official){
      d.standings = d.standings || {};
      d.standings['TABLA GENERAL'] = official.rows;
      d.results = (d.results || []).filter(r => !isStandingRowInsideResultsStrict(r));
      saveData(d);

      if(initSB && initSB()){
        // Guardar settings y todas las tablas normales, pero asegurar results limpio.
        await pushCloud(d);

        // Limpieza extra directa en Supabase por si ya existían registros antiguos.
        const {data, error} = await supabaseClient.from('results').select('*');
        if(!error && data){
          const ids = data.filter(isStandingRowInsideResultsStrict).map(r=>r.id).filter(Boolean);
          if(ids.length){
            await supabaseClient.from('results').delete().in('id', ids);
          }
        }
      }else{
        await saveAll(d);
      }

      fillAdmin();
      ok(`Planilla oficial cargada SOLO en Puntajes/Posiciones: ${official.rows.length} series.`);
      return;
    }

    return previousOfficialImporter(file, mode);
  }
}

// Botón manual para limpiar tabla results en Supabase.
document.addEventListener('click', async function(e){
  const btn = e.target.closest('#cleanWrongResults,#cleanSupabaseResults');
  if(!btn) return;
  e.preventDefault();
  e.stopPropagation();

  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Limpiando Supabase...';

  try{
    await cleanResultsTableFromStandingRowsSupabase();
  }catch(error){
    err(error);
  }finally{
    btn.disabled = false;
    btn.textContent = old;
  }
}, true);


/* =========================================================
   FIX FINAL 1: PUNTAJES NUNCA VAN A RESULTADOS
========================================================= */
function rmCleanTextFinal(v){
  return String(v || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim();
}

function rmIsStandingResultFinal(r){
  if(!r) return false;
  const match = rmCleanTextFinal(r.match || r.match_text || r.title || '');
  const score = String(r.score || '').trim();
  const date = String(r.date || r.date_text || '').trim();
  const scorers = rmCleanTextFinal(r.scorers || '');
  const series = [
    'super senior','senior 35','1 infantil','1° infantil','1º infantil','2 infantil','2° infantil','2º infantil',
    'peques','juveniles','serie de oro','serie damas','senior','primera adultos','segunda adultos',
    'honor','platinos','serie oro','primera infantil','segunda infantil','total','tabla general',
    'resumen general por series'
  ];
  if(series.some(s => match === s || match.includes(s))) return true;
  if(scorers.includes('planilla oficial')) return true;
  if(/^[0-9]+$/.test(date) && /^[0-9]+$/.test(score)) return true;
  return false;
}

function rmFilterRealResultsFinal(list){
  return (Array.isArray(list) ? list : []).filter(r => !rmIsStandingResultFinal(r));
}

async function rmDeleteStandingRowsFromSupabaseResultsFinal(){
  if(!(typeof initSB === 'function') || !initSB()) return;
  try{
    const {data, error} = await supabaseClient.from('results').select('*');
    if(error) throw error;
    const ids = (data || []).filter(rmIsStandingResultFinal).map(r => r.id).filter(Boolean);
    if(ids.length){
      const {error: delErr} = await supabaseClient.from('results').delete().in('id', ids);
      if(delErr) throw delErr;
    }
  }catch(e){
    console.warn('Limpieza directa de results falló:', e);
  }
}

// Intercepta pushCloud: results siempre se limpian antes de guardar en Supabase.
if(typeof pushCloud === 'function' && !window.__pushCloudNoStandingsInResultsFinal){
  window.__pushCloudNoStandingsInResultsFinal = true;
  const oldPushCloudNoStandings = pushCloud;
  pushCloud = async function(d){
    d = d || getData();
    d.results = rmFilterRealResultsFinal(d.results);
    saveData(d);
    await oldPushCloudNoStandings(d);
    await rmDeleteStandingRowsFromSupabaseResultsFinal();
  };
}

// Intercepta saveAll también para limpiar local y nube.
if(typeof saveAll === 'function' && !window.__saveAllNoStandingsInResultsFinal){
  window.__saveAllNoStandingsInResultsFinal = true;
  const oldSaveAllNoStandings = saveAll;
  saveAll = async function(d){
    d = d || getData();
    d.results = rmFilterRealResultsFinal(d.results);
    saveData(d);
    await oldSaveAllNoStandings(d);
    await rmDeleteStandingRowsFromSupabaseResultsFinal();
  };
}

// Importador definitivo: si detecta planilla de puntajes, solo standings.
if(typeof importOfficialPlanillaRicardoMendez === 'function' && !window.__onlyStandingsImporterRootFix){
  window.__onlyStandingsImporterRootFix = true;
  const oldImporterRootFix = importOfficialPlanillaRicardoMendez;

  importOfficialPlanillaRicardoMendez = async function(file, mode){
    const {rows} = await rmReadSheetRows(file);
    const official = rmParseOfficialStatsRows(rows);

    if(official){
      const d = getData();
      d.standings = d.standings || {};
      d.standings['TABLA GENERAL'] = official.rows;
      d.results = rmFilterRealResultsFinal(d.results);
      saveData(d);

      if(typeof pushCloud === 'function'){
        await pushCloud(d);
      }else{
        await saveAll(d);
      }

      await rmDeleteStandingRowsFromSupabaseResultsFinal();
      fillAdmin();
      ok('Puntajes cargados correctamente SOLO en Posiciones/Puntajes.');
      return;
    }

    // Si NO es planilla de puntajes, entonces sí puede ser resultados reales.
    return oldImporterRootFix(file, mode);
  };
}

// Botón manual definitivo para limpiar results.
async function limpiarResultsSupabaseDefinitivo(){
  const d = getData();
  d.results = rmFilterRealResultsFinal(d.results);
  saveData(d);
  await rmDeleteStandingRowsFromSupabaseResultsFinal();

  if(typeof pushCloud === 'function'){
    await pushCloud(d);
  }
  fillAdmin();
  ok('Resultados limpiados definitivamente. La tabla de puntajes quedó fuera de Resultados.');
}

document.addEventListener('click', async function(e){
  const btn = e.target.closest('#cleanSupabaseResults,#cleanWrongResults,#limpiarResultsDefinitivo');
  if(!btn) return;
  e.preventDefault();
  e.stopPropagation();

  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Limpiando...';
  try{
    await limpiarResultsSupabaseDefinitivo();
  }catch(error){
    err(error);
  }finally{
    btn.disabled = false;
    btn.textContent = old;
  }
}, true);


/* =========================================================
   FIX ADMIN TABS VISIBLES
========================================================= */
document.addEventListener('click', function(e){
  const tabBtn = e.target.closest('.tabs button');
  if(!tabBtn) return;
  setTimeout(function(){
    const id = tabBtn.dataset.tab;
    const panel = document.getElementById(id);
    if(panel && !panel.classList.contains('hidden')){
      panel.scrollIntoView({behavior:'smooth', block:'start'});
    }
  }, 80);
}, true);

document.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){
    try{
      if(typeof getCfg === 'function'){
        const cfg = getCfg();
        const statusEl = document.getElementById('statusLine');
        if(statusEl && cfg && cfg.url && cfg.key && statusEl.textContent.toLowerCase().includes('pendiente')){
          statusEl.textContent = 'Estado: Supabase configurado.';
        }
      }
    }catch(e){}
  }, 600);
});


/* =========================================================
   ADMIN TABLAS REALES FECHA 7 - PUNTAJES NO RESULTADOS
========================================================= */
const CDRM_STANDINGS_FECHA7_ADMIN = {"Super Senior": [{"team": "Caupolicán", "pj": 7, "pg": 6, "pe": 0, "pp": 1, "gf": 17, "gc": 7, "dg": 10, "pts": 18}, {"team": "Manzana T.", "pj": 6, "pg": 5, "pe": 1, "pp": 0, "gf": 20, "gc": 4, "dg": 16, "pts": 16}, {"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 1, "pp": 1, "gf": 17, "gc": 6, "dg": 11, "pts": 16}, {"team": "Chacay", "pj": 6, "pg": 4, "pe": 0, "pp": 2, "gf": 9, "gc": 5, "dg": 4, "pts": 12}, {"team": "Estrella", "pj": 5, "pg": 3, "pe": 1, "pp": 1, "gf": 14, "gc": 3, "dg": 11, "pts": 10}, {"team": "Independiente", "pj": 6, "pg": 1, "pe": 1, "pp": 4, "gf": 6, "gc": 19, "dg": -13, "pts": 4}, {"team": "Cruz Azul", "pj": 5, "pg": 1, "pe": 0, "pp": 4, "gf": 6, "gc": 22, "dg": -16, "pts": 3}, {"team": "Barrabases", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 9, "dg": -9, "pts": 0}, {"team": "Unión", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 1, "gc": 15, "dg": -14, "pts": 0}], "Senior 35": [{"team": "Caupolicán", "pj": 7, "pg": 6, "pe": 1, "pp": 0, "gf": 26, "gc": 8, "dg": 18, "pts": 19}, {"team": "Manzana T.", "pj": 6, "pg": 5, "pe": 1, "pp": 0, "gf": 20, "gc": 9, "dg": 11, "pts": 16}, {"team": "Chacay", "pj": 6, "pg": 3, "pe": 1, "pp": 2, "gf": 13, "gc": 13, "dg": 0, "pts": 10}, {"team": "R. Méndez", "pj": 7, "pg": 2, "pe": 2, "pp": 3, "gf": 13, "gc": 11, "dg": 2, "pts": 8}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 2, "pp": 1, "gf": 10, "gc": 8, "dg": 2, "pts": 8}, {"team": "Cruz Azul", "pj": 5, "pg": 2, "pe": 1, "pp": 2, "gf": 9, "gc": 8, "dg": 1, "pts": 7}, {"team": "Independiente", "pj": 6, "pg": 2, "pe": 1, "pp": 3, "gf": 12, "gc": 17, "dg": -5, "pts": 7}, {"team": "Unión", "pj": 6, "pg": 0, "pe": 1, "pp": 5, "gf": 3, "gc": 26, "dg": -23, "pts": 1}, {"team": "Barrabases", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 6, "dg": -6, "pts": 0}], "1° Infantil": [{"team": "Caupolicán", "pj": 7, "pg": 7, "pe": 0, "pp": 0, "gf": 24, "gc": 2, "dg": 22, "pts": 21}, {"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 1, "pp": 1, "gf": 27, "gc": 7, "dg": 20, "pts": 16}, {"team": "Estrella", "pj": 5, "pg": 3, "pe": 2, "pp": 0, "gf": 22, "gc": 6, "dg": 16, "pts": 11}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 1, "pp": 2, "gf": 13, "gc": 10, "dg": 3, "pts": 10}, {"team": "Unión", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 20, "gc": 16, "dg": 4, "pts": 9}, {"team": "Chacay", "pj": 6, "pg": 2, "pe": 0, "pp": 4, "gf": 7, "gc": 15, "dg": -8, "pts": 6}, {"team": "Independiente", "pj": 6, "pg": 1, "pe": 0, "pp": 5, "gf": 12, "gc": 22, "dg": -10, "pts": 3}, {"team": "Cruz Azul", "pj": 5, "pg": 1, "pe": 0, "pp": 4, "gf": 8, "gc": 21, "dg": -13, "pts": 3}, {"team": "Manzana T.", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 2, "gc": 36, "dg": -34, "pts": 0}], "2° Infantil": [{"team": "Unión", "pj": 6, "pg": 5, "pe": 1, "pp": 0, "gf": 11, "gc": 2, "dg": 9, "pts": 16}, {"team": "R. Méndez", "pj": 7, "pg": 4, "pe": 1, "pp": 2, "gf": 10, "gc": 3, "dg": 7, "pts": 13}, {"team": "Estrella", "pj": 5, "pg": 4, "pe": 1, "pp": 0, "gf": 8, "gc": 2, "dg": 6, "pts": 13}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 2, "pp": 1, "gf": 17, "gc": 9, "dg": 8, "pts": 11}, {"team": "Independiente", "pj": 6, "pg": 3, "pe": 1, "pp": 2, "gf": 9, "gc": 7, "dg": 2, "pts": 10}, {"team": "Chacay", "pj": 6, "pg": 2, "pe": 0, "pp": 4, "gf": 6, "gc": 10, "dg": -4, "pts": 6}, {"team": "Caupolicán", "pj": 7, "pg": 2, "pe": 0, "pp": 5, "gf": 4, "gc": 23, "dg": -19, "pts": 6}, {"team": "Cruz Azul", "pj": 4, "pg": 0, "pe": 0, "pp": 4, "gf": 0, "gc": 4, "dg": -4, "pts": 0}, {"team": "Manzana T.", "pj": 5, "pg": 0, "pe": 0, "pp": 5, "gf": 1, "gc": 6, "dg": -5, "pts": 0}], "Peques": [{"team": "Chacay", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 29, "gc": 0, "dg": 29, "pts": 18}, {"team": "Manzana T.", "pj": 6, "pg": 5, "pe": 0, "pp": 1, "gf": 16, "gc": 4, "dg": 12, "pts": 15}, {"team": "Barrabases", "pj": 6, "pg": 4, "pe": 0, "pp": 2, "gf": 15, "gc": 3, "dg": 12, "pts": 12}, {"team": "Independiente", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 9, "gc": 13, "dg": -4, "pts": 9}, {"team": "Unión", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 6, "gc": 19, "dg": -13, "pts": 9}, {"team": "Caupolicán", "pj": 7, "pg": 3, "pe": 0, "pp": 4, "gf": 9, "gc": 28, "dg": -19, "pts": 9}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 0, "pp": 3, "gf": 8, "gc": 7, "dg": 1, "pts": 6}, {"team": "R. Méndez", "pj": 7, "pg": 1, "pe": 0, "pp": 6, "gf": 4, "gc": 17, "dg": -13, "pts": 3}, {"team": "Cruz Azul", "pj": 5, "pg": 0, "pe": 0, "pp": 5, "gf": 0, "gc": 5, "dg": -5, "pts": 0}], "Juveniles": [{"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 2, "pp": 0, "gf": 26, "gc": 4, "dg": 22, "pts": 17}, {"team": "Chacay", "pj": 6, "pg": 5, "pe": 1, "pp": 0, "gf": 19, "gc": 3, "dg": 16, "pts": 16}, {"team": "Caupolicán", "pj": 7, "pg": 5, "pe": 1, "pp": 1, "gf": 16, "gc": 9, "dg": 7, "pts": 16}, {"team": "Manzana T.", "pj": 6, "pg": 3, "pe": 2, "pp": 1, "gf": 14, "gc": 10, "dg": 4, "pts": 11}, {"team": "Estrella", "pj": 5, "pg": 3, "pe": 0, "pp": 2, "gf": 14, "gc": 8, "dg": 6, "pts": 9}, {"team": "Independiente", "pj": 6, "pg": 1, "pe": 1, "pp": 4, "gf": 7, "gc": 33, "dg": -26, "pts": 4}, {"team": "Unión", "pj": 6, "pg": 1, "pe": 0, "pp": 5, "gf": 9, "gc": 19, "dg": -10, "pts": 3}, {"team": "Cruz Azul", "pj": 5, "pg": 0, "pe": 1, "pp": 4, "gf": 8, "gc": 21, "dg": -13, "pts": 1}, {"team": "Barrabases", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 6, "dg": -6, "pts": 0}], "Serie de Oro": [{"team": "Manzana T.", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 20, "gc": 2, "dg": 18, "pts": 18}, {"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 2, "pp": 0, "gf": 9, "gc": 3, "dg": 6, "pts": 17}, {"team": "Caupolicán", "pj": 7, "pg": 3, "pe": 2, "pp": 2, "gf": 11, "gc": 14, "dg": -3, "pts": 11}, {"team": "Barrabases", "pj": 6, "pg": 2, "pe": 3, "pp": 1, "gf": 9, "gc": 4, "dg": 5, "pts": 9}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 2, "pp": 1, "gf": 8, "gc": 6, "dg": 2, "pts": 8}, {"team": "Chacay", "pj": 6, "pg": 2, "pe": 1, "pp": 3, "gf": 4, "gc": 9, "dg": -5, "pts": 7}, {"team": "Unión", "pj": 6, "pg": 2, "pe": 0, "pp": 4, "gf": 2, "gc": 14, "dg": -12, "pts": 6}, {"team": "Cruz Azul", "pj": 5, "pg": 0, "pe": 0, "pp": 5, "gf": 0, "gc": 5, "dg": -5, "pts": 0}, {"team": "Independiente", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 6, "dg": -6, "pts": 0}], "Serie Damas": [{"team": "Chacay", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 10, "gc": 0, "dg": 10, "pts": 18}, {"team": "Manzana T.", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 10, "gc": 0, "dg": 10, "pts": 18}, {"team": "Caupolicán", "pj": 7, "pg": 5, "pe": 0, "pp": 2, "gf": 5, "gc": 10, "dg": -5, "pts": 15}, {"team": "Estrella", "pj": 1, "pg": 0, "pe": 0, "pp": 1, "gf": 0, "gc": 1, "dg": -1, "pts": 0}, {"team": "R. Méndez", "pj": 2, "pg": 0, "pe": 0, "pp": 2, "gf": 0, "gc": 2, "dg": -2, "pts": 0}, {"team": "Barrabases", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}, {"team": "Cruz Azul", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}, {"team": "Independiente", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}, {"team": "Unión", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}], "2° Adulta": [{"team": "Manzana T.", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 21, "gc": 4, "dg": 17, "pts": 18}, {"team": "Independiente", "pj": 6, "pg": 4, "pe": 1, "pp": 1, "gf": 12, "gc": 7, "dg": 5, "pts": 13}, {"team": "R. Méndez", "pj": 7, "pg": 4, "pe": 1, "pp": 2, "gf": 8, "gc": 5, "dg": 3, "pts": 13}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 9, "gc": 8, "dg": 1, "pts": 9}, {"team": "Unión", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 9, "gc": 9, "dg": 0, "pts": 9}, {"team": "Cruz Azul", "pj": 5, "pg": 2, "pe": 1, "pp": 2, "gf": 11, "gc": 11, "dg": 0, "pts": 7}, {"team": "Caupolicán", "pj": 7, "pg": 2, "pe": 0, "pp": 5, "gf": 9, "gc": 21, "dg": -12, "pts": 6}, {"team": "Chacay", "pj": 6, "pg": 1, "pe": 1, "pp": 4, "gf": 4, "gc": 11, "dg": -7, "pts": 4}, {"team": "Estrella", "pj": 5, "pg": 0, "pe": 0, "pp": 5, "gf": 5, "gc": 12, "dg": -7, "pts": 0}], "1° Adulta": [{"team": "Unión", "pj": 6, "pg": 5, "pe": 0, "pp": 1, "gf": 14, "gc": 5, "dg": 9, "pts": 15}, {"team": "Manzana T.", "pj": 6, "pg": 4, "pe": 1, "pp": 1, "gf": 17, "gc": 5, "dg": 12, "pts": 13}, {"team": "Cruz Azul", "pj": 5, "pg": 4, "pe": 0, "pp": 1, "gf": 14, "gc": 6, "dg": 8, "pts": 12}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 9, "gc": 9, "dg": 0, "pts": 9}, {"team": "Caupolicán", "pj": 7, "pg": 2, "pe": 1, "pp": 4, "gf": 8, "gc": 16, "dg": -8, "pts": 7}, {"team": "R. Méndez", "pj": 7, "pg": 1, "pe": 3, "pp": 3, "gf": 9, "gc": 16, "dg": -7, "pts": 6}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 0, "pp": 3, "gf": 8, "gc": 15, "dg": -7, "pts": 6}, {"team": "Chacay", "pj": 6, "pg": 1, "pe": 2, "pp": 3, "gf": 7, "gc": 9, "dg": -2, "pts": 5}, {"team": "Independiente", "pj": 6, "pg": 0, "pe": 3, "pp": 3, "gf": 8, "gc": 13, "dg": -5, "pts": 3}], "Serie Platino": [{"team": "Caupolicán", "pj": 7, "pg": 4, "pe": 3, "pp": 0, "gf": 9, "gc": 5, "dg": 4, "pts": 15}, {"team": "Chacay", "pj": 6, "pg": 3, "pe": 3, "pp": 0, "gf": 11, "gc": 8, "dg": 3, "pts": 12}, {"team": "R. Méndez", "pj": 7, "pg": 3, "pe": 3, "pp": 1, "gf": 8, "gc": 7, "dg": 1, "pts": 12}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 1, "pp": 2, "gf": 10, "gc": 5, "dg": 5, "pts": 10}, {"team": "Independiente", "pj": 6, "pg": 2, "pe": 3, "pp": 1, "gf": 7, "gc": 6, "dg": 1, "pts": 9}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 1, "pp": 2, "gf": 2, "gc": 5, "dg": -3, "pts": 7}, {"team": "Cruz Azul", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}, {"team": "Manzana T.", "pj": 4, "pg": 0, "pe": 0, "pp": 4, "gf": 0, "gc": 4, "dg": -4, "pts": 0}, {"team": "Unión", "pj": 4, "pg": 0, "pe": 0, "pp": 4, "gf": 0, "gc": 4, "dg": -4, "pts": 0}], "Serie de Honor": [{"team": "Manzana T.", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 15, "gc": 3, "dg": 12, "pts": 18}, {"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 0, "pp": 2, "gf": 19, "gc": 7, "dg": 12, "pts": 15}, {"team": "Chacay", "pj": 6, "pg": 4, "pe": 1, "pp": 1, "gf": 8, "gc": 5, "dg": 3, "pts": 13}, {"team": "Caupolicán", "pj": 7, "pg": 3, "pe": 2, "pp": 2, "gf": 9, "gc": 11, "dg": -2, "pts": 11}, {"team": "Cruz Azul", "pj": 5, "pg": 3, "pe": 1, "pp": 1, "gf": 9, "gc": 6, "dg": 3, "pts": 10}, {"team": "Estrella", "pj": 5, "pg": 3, "pe": 0, "pp": 2, "gf": 4, "gc": 7, "dg": -3, "pts": 9}, {"team": "Independiente", "pj": 6, "pg": 1, "pe": 0, "pp": 5, "gf": 3, "gc": 15, "dg": -12, "pts": 3}, {"team": "Barrabases", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 6, "dg": -6, "pts": 0}, {"team": "Unión", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 1, "gc": 8, "dg": -7, "pts": 0}]};
const CDRM_SERIES_FECHA7_ADMIN = ["Super Senior", "Senior 35", "1° Infantil", "2° Infantil", "Peques", "Juveniles", "Serie de Oro", "Serie Damas", "2° Adulta", "1° Adulta", "Serie Platino", "Serie de Honor"];

function cdrmCleanTextAdmin(v){
  return String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
}
function cdrmIsStandingInResultsAdmin(r){
  if(!r) return false;
  const match = cdrmCleanTextAdmin(r.match || r.match_text || r.title || '');
  const score = String(r.score || '').trim();
  const date = String(r.date || r.date_text || '').trim();
  const series = CDRM_SERIES_FECHA7_ADMIN.map(cdrmCleanTextAdmin);
  return series.some(s => match === s || match.includes(s)) ||
         match.includes('tabla general') ||
         match.includes('resumen general por series') ||
         (/^[0-9]+$/.test(date) && /^[0-9]+$/.test(score));
}
async function cdrmDeleteStandingRowsFromResultsSupabase(){
  if(!(typeof initSB === 'function') || !initSB()) return;
  try{
    const {data} = await supabaseClient.from('results').select('*');
    const ids = (data || []).filter(cdrmIsStandingInResultsAdmin).map(x=>x.id).filter(Boolean);
    if(ids.length) await supabaseClient.from('results').delete().in('id', ids);
  }catch(e){ console.warn('No se pudo limpiar results en Supabase', e); }
}
async function cdrmSaveOfficialStandingsFecha7(){
  const d = getData();
  d.standings = CDRM_STANDINGS_FECHA7_ADMIN;
  d.results = (d.results || []).filter(r => !cdrmIsStandingInResultsAdmin(r));
  saveData(d);
  if(typeof pushCloud === 'function') await pushCloud(d);
  await cdrmDeleteStandingRowsFromResultsSupabase();
  fillAdmin();
  ok('Tablas oficiales Fecha 7 cargadas SOLO en Puntajes/Posiciones.');
}
if(typeof pushCloud === 'function' && !window.__cdrmPushCloudCleanResults){
  window.__cdrmPushCloudCleanResults = true;
  const oldPushCloudCleanResults = pushCloud;
  pushCloud = async function(d){
    d = d || getData();
    d.results = (d.results || []).filter(r => !cdrmIsStandingInResultsAdmin(r));
    saveData(d);
    await oldPushCloudCleanResults(d);
    await cdrmDeleteStandingRowsFromResultsSupabase();
  };
}
if(typeof importOfficialPlanillaRicardoMendez === 'function' && !window.__cdrmImporterOnlyStandings){
  window.__cdrmImporterOnlyStandings = true;
  const oldImporter = importOfficialPlanillaRicardoMendez;
  importOfficialPlanillaRicardoMendez = async function(file, mode){
    const {rows} = await rmReadSheetRows(file);
    const official = rmParseOfficialStatsRows(rows);
    if(official){
      const d = getData();
      d.standings = d.standings || {};
      d.standings['TABLA GENERAL'] = official.rows;
      d.results = (d.results || []).filter(r => !cdrmIsStandingInResultsAdmin(r));
      saveData(d);
      if(typeof pushCloud === 'function') await pushCloud(d);
      await cdrmDeleteStandingRowsFromResultsSupabase();
      fillAdmin();
      ok('Excel cargado SOLO en Puntajes/Posiciones.');
      return;
    }
    return oldImporter(file, mode);
  };
}
document.addEventListener('click', async function(e){
  const btn = e.target.closest('#loadOfficialStandingsFecha7,#limpiarResultsDefinitivo,#cleanSupabaseResults,#cleanWrongResults');
  if(!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Procesando...';
  try{
    if(btn.id === 'loadOfficialStandingsFecha7') await cdrmSaveOfficialStandingsFecha7();
    else {
      const d = getData();
      d.results = (d.results || []).filter(r => !cdrmIsStandingInResultsAdmin(r));
      saveData(d);
      if(typeof pushCloud === 'function') await pushCloud(d);
      await cdrmDeleteStandingRowsFromResultsSupabase();
      fillAdmin();
      ok('Resultados limpiados. Puntajes queda separado.');
    }
  }catch(error){ err(error); }
  finally{ btn.disabled=false; btn.textContent=old; }
}, true);

/* =========================================================
   ADMIN SEPARACION DEFINITIVA RESULTADOS / PUNTAJES
========================================================= */
const CDRM_POSICIONES_FECHA7_ADMIN_FINAL = {"Super Senior": [{"team": "Caupolicán", "pj": 7, "pg": 6, "pe": 0, "pp": 1, "gf": 17, "gc": 7, "dg": 10, "pts": 18}, {"team": "Manzana T.", "pj": 6, "pg": 5, "pe": 1, "pp": 0, "gf": 20, "gc": 4, "dg": 16, "pts": 16}, {"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 1, "pp": 1, "gf": 17, "gc": 6, "dg": 11, "pts": 16}, {"team": "Chacay", "pj": 6, "pg": 4, "pe": 0, "pp": 2, "gf": 9, "gc": 5, "dg": 4, "pts": 12}, {"team": "Estrella", "pj": 5, "pg": 3, "pe": 1, "pp": 1, "gf": 14, "gc": 3, "dg": 11, "pts": 10}, {"team": "Independiente", "pj": 6, "pg": 1, "pe": 1, "pp": 4, "gf": 6, "gc": 19, "dg": -13, "pts": 4}, {"team": "Cruz Azul", "pj": 5, "pg": 1, "pe": 0, "pp": 4, "gf": 6, "gc": 22, "dg": -16, "pts": 3}, {"team": "Barrabases", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 9, "dg": -9, "pts": 0}, {"team": "Unión", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 1, "gc": 15, "dg": -14, "pts": 0}], "Senior 35": [{"team": "Caupolicán", "pj": 7, "pg": 6, "pe": 1, "pp": 0, "gf": 26, "gc": 8, "dg": 18, "pts": 19}, {"team": "Manzana T.", "pj": 6, "pg": 5, "pe": 1, "pp": 0, "gf": 20, "gc": 9, "dg": 11, "pts": 16}, {"team": "Chacay", "pj": 6, "pg": 3, "pe": 1, "pp": 2, "gf": 13, "gc": 13, "dg": 0, "pts": 10}, {"team": "R. Méndez", "pj": 7, "pg": 2, "pe": 2, "pp": 3, "gf": 13, "gc": 11, "dg": 2, "pts": 8}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 2, "pp": 1, "gf": 10, "gc": 8, "dg": 2, "pts": 8}, {"team": "Cruz Azul", "pj": 5, "pg": 2, "pe": 1, "pp": 2, "gf": 9, "gc": 8, "dg": 1, "pts": 7}, {"team": "Independiente", "pj": 6, "pg": 2, "pe": 1, "pp": 3, "gf": 12, "gc": 17, "dg": -5, "pts": 7}, {"team": "Unión", "pj": 6, "pg": 0, "pe": 1, "pp": 5, "gf": 3, "gc": 26, "dg": -23, "pts": 1}, {"team": "Barrabases", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 6, "dg": -6, "pts": 0}], "1° Infantil": [{"team": "Caupolicán", "pj": 7, "pg": 7, "pe": 0, "pp": 0, "gf": 24, "gc": 2, "dg": 22, "pts": 21}, {"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 1, "pp": 1, "gf": 27, "gc": 7, "dg": 20, "pts": 16}, {"team": "Estrella", "pj": 5, "pg": 3, "pe": 2, "pp": 0, "gf": 22, "gc": 6, "dg": 16, "pts": 11}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 1, "pp": 2, "gf": 13, "gc": 10, "dg": 3, "pts": 10}, {"team": "Unión", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 20, "gc": 16, "dg": 4, "pts": 9}, {"team": "Chacay", "pj": 6, "pg": 2, "pe": 0, "pp": 4, "gf": 7, "gc": 15, "dg": -8, "pts": 6}, {"team": "Independiente", "pj": 6, "pg": 1, "pe": 0, "pp": 5, "gf": 12, "gc": 22, "dg": -10, "pts": 3}, {"team": "Cruz Azul", "pj": 5, "pg": 1, "pe": 0, "pp": 4, "gf": 8, "gc": 21, "dg": -13, "pts": 3}, {"team": "Manzana T.", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 2, "gc": 36, "dg": -34, "pts": 0}], "2° Infantil": [{"team": "Unión", "pj": 6, "pg": 5, "pe": 1, "pp": 0, "gf": 11, "gc": 2, "dg": 9, "pts": 16}, {"team": "R. Méndez", "pj": 7, "pg": 4, "pe": 1, "pp": 2, "gf": 10, "gc": 3, "dg": 7, "pts": 13}, {"team": "Estrella", "pj": 5, "pg": 4, "pe": 1, "pp": 0, "gf": 8, "gc": 2, "dg": 6, "pts": 13}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 2, "pp": 1, "gf": 17, "gc": 9, "dg": 8, "pts": 11}, {"team": "Independiente", "pj": 6, "pg": 3, "pe": 1, "pp": 2, "gf": 9, "gc": 7, "dg": 2, "pts": 10}, {"team": "Chacay", "pj": 6, "pg": 2, "pe": 0, "pp": 4, "gf": 6, "gc": 10, "dg": -4, "pts": 6}, {"team": "Caupolicán", "pj": 7, "pg": 2, "pe": 0, "pp": 5, "gf": 4, "gc": 23, "dg": -19, "pts": 6}, {"team": "Cruz Azul", "pj": 4, "pg": 0, "pe": 0, "pp": 4, "gf": 0, "gc": 4, "dg": -4, "pts": 0}, {"team": "Manzana T.", "pj": 5, "pg": 0, "pe": 0, "pp": 5, "gf": 1, "gc": 6, "dg": -5, "pts": 0}], "Peques": [{"team": "Chacay", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 29, "gc": 0, "dg": 29, "pts": 18}, {"team": "Manzana T.", "pj": 6, "pg": 5, "pe": 0, "pp": 1, "gf": 16, "gc": 4, "dg": 12, "pts": 15}, {"team": "Barrabases", "pj": 6, "pg": 4, "pe": 0, "pp": 2, "gf": 15, "gc": 3, "dg": 12, "pts": 12}, {"team": "Independiente", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 9, "gc": 13, "dg": -4, "pts": 9}, {"team": "Unión", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 6, "gc": 19, "dg": -13, "pts": 9}, {"team": "Caupolicán", "pj": 7, "pg": 3, "pe": 0, "pp": 4, "gf": 9, "gc": 28, "dg": -19, "pts": 9}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 0, "pp": 3, "gf": 8, "gc": 7, "dg": 1, "pts": 6}, {"team": "R. Méndez", "pj": 7, "pg": 1, "pe": 0, "pp": 6, "gf": 4, "gc": 17, "dg": -13, "pts": 3}, {"team": "Cruz Azul", "pj": 5, "pg": 0, "pe": 0, "pp": 5, "gf": 0, "gc": 5, "dg": -5, "pts": 0}], "Juveniles": [{"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 2, "pp": 0, "gf": 26, "gc": 4, "dg": 22, "pts": 17}, {"team": "Chacay", "pj": 6, "pg": 5, "pe": 1, "pp": 0, "gf": 19, "gc": 3, "dg": 16, "pts": 16}, {"team": "Caupolicán", "pj": 7, "pg": 5, "pe": 1, "pp": 1, "gf": 16, "gc": 9, "dg": 7, "pts": 16}, {"team": "Manzana T.", "pj": 6, "pg": 3, "pe": 2, "pp": 1, "gf": 14, "gc": 10, "dg": 4, "pts": 11}, {"team": "Estrella", "pj": 5, "pg": 3, "pe": 0, "pp": 2, "gf": 14, "gc": 8, "dg": 6, "pts": 9}, {"team": "Independiente", "pj": 6, "pg": 1, "pe": 1, "pp": 4, "gf": 7, "gc": 33, "dg": -26, "pts": 4}, {"team": "Unión", "pj": 6, "pg": 1, "pe": 0, "pp": 5, "gf": 9, "gc": 19, "dg": -10, "pts": 3}, {"team": "Cruz Azul", "pj": 5, "pg": 0, "pe": 1, "pp": 4, "gf": 8, "gc": 21, "dg": -13, "pts": 1}, {"team": "Barrabases", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 6, "dg": -6, "pts": 0}], "Serie de Oro": [{"team": "Manzana T.", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 20, "gc": 2, "dg": 18, "pts": 18}, {"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 2, "pp": 0, "gf": 9, "gc": 3, "dg": 6, "pts": 17}, {"team": "Caupolicán", "pj": 7, "pg": 3, "pe": 2, "pp": 2, "gf": 11, "gc": 14, "dg": -3, "pts": 11}, {"team": "Barrabases", "pj": 6, "pg": 2, "pe": 3, "pp": 1, "gf": 9, "gc": 4, "dg": 5, "pts": 9}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 2, "pp": 1, "gf": 8, "gc": 6, "dg": 2, "pts": 8}, {"team": "Chacay", "pj": 6, "pg": 2, "pe": 1, "pp": 3, "gf": 4, "gc": 9, "dg": -5, "pts": 7}, {"team": "Unión", "pj": 6, "pg": 2, "pe": 0, "pp": 4, "gf": 2, "gc": 14, "dg": -12, "pts": 6}, {"team": "Cruz Azul", "pj": 5, "pg": 0, "pe": 0, "pp": 5, "gf": 0, "gc": 5, "dg": -5, "pts": 0}, {"team": "Independiente", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 6, "dg": -6, "pts": 0}], "Serie Damas": [{"team": "Chacay", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 10, "gc": 0, "dg": 10, "pts": 18}, {"team": "Manzana T.", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 10, "gc": 0, "dg": 10, "pts": 18}, {"team": "Caupolicán", "pj": 7, "pg": 5, "pe": 0, "pp": 2, "gf": 5, "gc": 10, "dg": -5, "pts": 15}, {"team": "Estrella", "pj": 1, "pg": 0, "pe": 0, "pp": 1, "gf": 0, "gc": 1, "dg": -1, "pts": 0}, {"team": "R. Méndez", "pj": 2, "pg": 0, "pe": 0, "pp": 2, "gf": 0, "gc": 2, "dg": -2, "pts": 0}, {"team": "Barrabases", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}, {"team": "Cruz Azul", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}, {"team": "Independiente", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}, {"team": "Unión", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}], "2° Adulta": [{"team": "Manzana T.", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 21, "gc": 4, "dg": 17, "pts": 18}, {"team": "Independiente", "pj": 6, "pg": 4, "pe": 1, "pp": 1, "gf": 12, "gc": 7, "dg": 5, "pts": 13}, {"team": "R. Méndez", "pj": 7, "pg": 4, "pe": 1, "pp": 2, "gf": 8, "gc": 5, "dg": 3, "pts": 13}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 9, "gc": 8, "dg": 1, "pts": 9}, {"team": "Unión", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 9, "gc": 9, "dg": 0, "pts": 9}, {"team": "Cruz Azul", "pj": 5, "pg": 2, "pe": 1, "pp": 2, "gf": 11, "gc": 11, "dg": 0, "pts": 7}, {"team": "Caupolicán", "pj": 7, "pg": 2, "pe": 0, "pp": 5, "gf": 9, "gc": 21, "dg": -12, "pts": 6}, {"team": "Chacay", "pj": 6, "pg": 1, "pe": 1, "pp": 4, "gf": 4, "gc": 11, "dg": -7, "pts": 4}, {"team": "Estrella", "pj": 5, "pg": 0, "pe": 0, "pp": 5, "gf": 5, "gc": 12, "dg": -7, "pts": 0}], "1° Adulta": [{"team": "Unión", "pj": 6, "pg": 5, "pe": 0, "pp": 1, "gf": 14, "gc": 5, "dg": 9, "pts": 15}, {"team": "Manzana T.", "pj": 6, "pg": 4, "pe": 1, "pp": 1, "gf": 17, "gc": 5, "dg": 12, "pts": 13}, {"team": "Cruz Azul", "pj": 5, "pg": 4, "pe": 0, "pp": 1, "gf": 14, "gc": 6, "dg": 8, "pts": 12}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 9, "gc": 9, "dg": 0, "pts": 9}, {"team": "Caupolicán", "pj": 7, "pg": 2, "pe": 1, "pp": 4, "gf": 8, "gc": 16, "dg": -8, "pts": 7}, {"team": "R. Méndez", "pj": 7, "pg": 1, "pe": 3, "pp": 3, "gf": 9, "gc": 16, "dg": -7, "pts": 6}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 0, "pp": 3, "gf": 8, "gc": 15, "dg": -7, "pts": 6}, {"team": "Chacay", "pj": 6, "pg": 1, "pe": 2, "pp": 3, "gf": 7, "gc": 9, "dg": -2, "pts": 5}, {"team": "Independiente", "pj": 6, "pg": 0, "pe": 3, "pp": 3, "gf": 8, "gc": 13, "dg": -5, "pts": 3}], "Serie Platino": [{"team": "Caupolicán", "pj": 7, "pg": 4, "pe": 3, "pp": 0, "gf": 9, "gc": 5, "dg": 4, "pts": 15}, {"team": "Chacay", "pj": 6, "pg": 3, "pe": 3, "pp": 0, "gf": 11, "gc": 8, "dg": 3, "pts": 12}, {"team": "R. Méndez", "pj": 7, "pg": 3, "pe": 3, "pp": 1, "gf": 8, "gc": 7, "dg": 1, "pts": 12}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 1, "pp": 2, "gf": 10, "gc": 5, "dg": 5, "pts": 10}, {"team": "Independiente", "pj": 6, "pg": 2, "pe": 3, "pp": 1, "gf": 7, "gc": 6, "dg": 1, "pts": 9}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 1, "pp": 2, "gf": 2, "gc": 5, "dg": -3, "pts": 7}, {"team": "Cruz Azul", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}, {"team": "Manzana T.", "pj": 4, "pg": 0, "pe": 0, "pp": 4, "gf": 0, "gc": 4, "dg": -4, "pts": 0}, {"team": "Unión", "pj": 4, "pg": 0, "pe": 0, "pp": 4, "gf": 0, "gc": 4, "dg": -4, "pts": 0}], "Serie de Honor": [{"team": "Manzana T.", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 15, "gc": 3, "dg": 12, "pts": 18}, {"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 0, "pp": 2, "gf": 19, "gc": 7, "dg": 12, "pts": 15}, {"team": "Chacay", "pj": 6, "pg": 4, "pe": 1, "pp": 1, "gf": 8, "gc": 5, "dg": 3, "pts": 13}, {"team": "Caupolicán", "pj": 7, "pg": 3, "pe": 2, "pp": 2, "gf": 9, "gc": 11, "dg": -2, "pts": 11}, {"team": "Cruz Azul", "pj": 5, "pg": 3, "pe": 1, "pp": 1, "gf": 9, "gc": 6, "dg": 3, "pts": 10}, {"team": "Estrella", "pj": 5, "pg": 3, "pe": 0, "pp": 2, "gf": 4, "gc": 7, "dg": -3, "pts": 9}, {"team": "Independiente", "pj": 6, "pg": 1, "pe": 0, "pp": 5, "gf": 3, "gc": 15, "dg": -12, "pts": 3}, {"team": "Barrabases", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 6, "dg": -6, "pts": 0}, {"team": "Unión", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 1, "gc": 8, "dg": -7, "pts": 0}]};
const CDRM_SERIES_POSICIONES_ADMIN_FINAL = ["Super Senior", "Senior 35", "1° Infantil", "2° Infantil", "Peques", "Juveniles", "Serie de Oro", "Serie Damas", "2° Adulta", "1° Adulta", "Serie Platino", "Serie de Honor"];

function cdrmNormAdminFinal(v){
  return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
}
function cdrmEsPuntajeEnResultadosAdminFinal(r){
  if(!r) return false;
  const m = cdrmNormAdminFinal(r.match || r.match_text || r.title || '');
  const d = String(r.date || r.date_text || '').trim();
  const s = String(r.score || '').trim();
  const g = cdrmNormAdminFinal(r.scorers || '');
  const series = CDRM_SERIES_POSICIONES_ADMIN_FINAL.map(cdrmNormAdminFinal);
  return series.some(x => m === x || m.includes(x)) || m.includes('tabla general') || m.includes('resumen general') || g.includes('planilla oficial') || (/^[0-9]+$/.test(d) && /^[0-9]+$/.test(s));
}
async function cdrmLimpiarResultsSupabaseAdminFinal(){
  if(typeof initSB === 'function' && initSB()){
    try{
      const {data} = await supabaseClient.from('results').select('*');
      const ids = (data || []).filter(cdrmEsPuntajeEnResultadosAdminFinal).map(x=>x.id).filter(Boolean);
      if(ids.length) await supabaseClient.from('results').delete().in('id', ids);
    }catch(e){ console.warn('No se pudo limpiar results Supabase', e); }
  }
}
async function cdrmCargarPosicionesFecha7AdminFinal(){
  const data = getData();
  data.standings = CDRM_POSICIONES_FECHA7_ADMIN_FINAL;
  data.results = Array.isArray(data.results) ? data.results.filter(x => !cdrmEsPuntajeEnResultadosAdminFinal(x)) : [];
  saveData(data);
  if(typeof pushCloud === 'function') await pushCloud(data);
  await cdrmLimpiarResultsSupabaseAdminFinal();
  fillAdmin();
  ok('Tablas oficiales cargadas en PUNTAJES. Resultados quedó separado.');
}
if(typeof pushCloud === 'function' && !window.__cdrmPushSeparadoFinal){
  window.__cdrmPushSeparadoFinal = true;
  const oldPush = pushCloud;
  pushCloud = async function(data){
    data = data || getData();
    data.results = Array.isArray(data.results) ? data.results.filter(x => !cdrmEsPuntajeEnResultadosAdminFinal(x)) : [];
    saveData(data);
    await oldPush(data);
    await cdrmLimpiarResultsSupabaseAdminFinal();
  };
}
document.addEventListener('click', async function(e){
  const btn = e.target.closest('#loadOfficialStandingsFecha7,#limpiarResultsDefinitivo,#cleanSupabaseResults,#cleanWrongResults');
  if(!btn) return;
  e.preventDefault(); e.stopPropagation();
  const old = btn.textContent;
  btn.disabled = true; btn.textContent = 'Procesando...';
  try{
    await cdrmCargarPosicionesFecha7AdminFinal();
  }catch(error){ err(error); }
  finally{ btn.disabled = false; btn.textContent = old; }
}, true);


/* ADMIN MEJORAS 8 PUNTOS */
function rmFillAdmin8(){try{const d=getData();let a=document.getElementById('metricTitlesLabel'),b=document.getElementById('anniversaryDateInput'),c=document.getElementById('anniversaryYearsInput');if(a)a.value=d.settings?.championshipsLabel||'Campeonatos';if(b)b.value=d.settings?.anniversaryDate||d.settings?.anniversary||'12/08';if(c)c.value=d.settings?.anniversaryYears||'Desde 1932';}catch(e){}}
document.addEventListener('DOMContentLoaded',()=>setTimeout(rmFillAdmin8,700));
if(typeof action==='function'&&!window.__rmAdmin8){window.__rmAdmin8=true;const old=action;action=async function(id){if(id==='saveGeneral'){const d=getData();d.settings=d.settings||{};d.settings.championshipsLabel=document.getElementById('metricTitlesLabel')?.value||d.settings.championshipsLabel||'Campeonatos';d.settings.anniversaryDate=document.getElementById('anniversaryDateInput')?.value||d.settings.anniversaryDate||d.settings.anniversary||'12/08';d.settings.anniversaryYears=document.getElementById('anniversaryYearsInput')?.value||d.settings.anniversaryYears||'Desde 1932';saveData(d);}const res=await old(id);if(id==='saveGeneral'){const d=getData();d.settings=d.settings||{};d.settings.championshipsLabel=document.getElementById('metricTitlesLabel')?.value||d.settings.championshipsLabel||'Campeonatos';d.settings.anniversaryDate=document.getElementById('anniversaryDateInput')?.value||d.settings.anniversaryDate||d.settings.anniversary||'12/08';d.settings.anniversaryYears=document.getElementById('anniversaryYearsInput')?.value||d.settings.anniversaryYears||'Desde 1932';await saveAll(d);}return res;};}


/* =========================================================
   ADMIN MEJORAS PROFESIONALES
========================================================= */
function proFillAdmin(){
  const d=getData();
  const w=document.getElementById('memberWhatsappInput'); if(w) w.value=d.settings?.memberWhatsapp||'';
  const list=document.getElementById('championshipsAdminList');
  if(list){
    const arr=d.championships||[];
    list.innerHTML=arr.map((x,i)=>`<div class="admin-list-item"><b>${x.year}</b> ${x.name} - ${x.category} <button class="deleteChampionship" data-index="${i}" type="button">Eliminar</button></div>`).join('');
  }
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(proFillAdmin,800));
document.addEventListener('click',async function(e){
  const add=e.target.closest('#addChampionship');
  const save=e.target.closest('#saveProSettings');
  const del=e.target.closest('.deleteChampionship');
  if(!add&&!save&&!del)return;
  e.preventDefault();e.stopPropagation();
  const d=getData();d.settings=d.settings||{};
  if(add){
    d.championships=d.championships||[];
    d.championships.unshift({year:document.getElementById('champYear')?.value||'',name:document.getElementById('champName')?.value||'',category:document.getElementById('champCategory')?.value||''});
  }
  if(save){
    d.settings.memberWhatsapp=document.getElementById('memberWhatsappInput')?.value||'';
  }
  if(del){
    d.championships=d.championships||[];
    d.championships.splice(Number(del.dataset.index),1);
  }
  await saveAll(d);proFillAdmin();ok('Configuración profesional guardada.');
},true);


/* =========================================================
   ADMIN ORDEN VISUAL FINAL: EXCEL TABLA ACUMULADA
========================================================= */
function ovfNormHeader(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');}
async function ovfReadAccumulatedExcel(file){
  if(!file) throw new Error('Selecciona un Excel de tabla acumulada.');
  if(!window.XLSX) throw new Error('No se cargó la librería Excel.');
  const buffer=await file.arrayBuffer();
  const wb=XLSX.read(buffer,{type:'array',cellDates:true});
  const sh=wb.Sheets[wb.SheetNames[0]];
  const rows=XLSX.utils.sheet_to_json(sh,{header:1,defval:''});
  if(rows.length<2) throw new Error('El Excel no tiene datos.');
  const h=(rows[0]||[]).map(ovfNormHeader);
  const idx=(names,fb)=>{const i=h.findIndex(x=>names.some(n=>x.includes(n)));return i>=0?i:fb;};
  const iClub=idx(['club','equipo','institucion'],0), iPJ=idx(['pj','partidos'],1), iPts=idx(['pts','puntos'],2), iGF=idx(['gf','golesfavor'],3), iGC=idx(['gc','golescontra'],4), iDG=idx(['dg','df','diferencia'],5);
  return rows.slice(1).filter(r=>String(r[iClub]||'').trim()).map(r=>({
    club:String(r[iClub]||'').trim(),
    pj:Number(r[iPJ])||0,
    pts:Number(r[iPts])||0,
    gf:Number(r[iGF])||0,
    gc:Number(r[iGC])||0,
    dg:Number(r[iDG])||((Number(r[iGF])||0)-(Number(r[iGC])||0))
  })).sort((a,b)=>(b.pts-a.pts)||(b.dg-a.dg)||(b.gf-a.gf));
}
document.addEventListener('click',async function(e){
  const btn=e.target.closest('#importAccumulatedExcel');
  if(!btn) return;
  e.preventDefault(); e.stopPropagation();
  const old=btn.textContent; btn.disabled=true; btn.textContent='Importando...';
  try{
    const file=document.getElementById('accumulatedExcelFile')?.files?.[0];
    const rows=await ovfReadAccumulatedExcel(file);
    const d=getData(); d.accumulated=rows;
    await saveAll(d); fillAdmin(); ok('Tabla acumulada importada correctamente.');
  }catch(error){err(error);}
  finally{btn.disabled=false; btn.textContent=old;}
},true);


/* =========================================================
   ADMIN: EXCEL TABLA ACUMULADA TODOS LOS CLUBES
========================================================= */
function acumuladaExcelNormHeader(v){
  return String(v||'')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]/g,'');
}
async function importarAcumuladaTodosClubesExcel(file){
  if(!file) throw new Error('Selecciona el Excel de tabla acumulada.');
  if(!window.XLSX) throw new Error('No se cargó la librería Excel.');

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer,{type:'array',cellDates:true});
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});

  if(rows.length < 2) throw new Error('El Excel no tiene datos.');

  const headers = (rows[0]||[]).map(acumuladaExcelNormHeader);
  const find = (names, fallback)=> {
    const idx = headers.findIndex(h => names.some(n => h.includes(n)));
    return idx >= 0 ? idx : fallback;
  };

  const iClub = find(['club','equipo','institucion'],0);
  const iSeries = find(['series','serie'],1);
  const iPJ = find(['pj','partidosjugados'],2);
  const iPG = find(['pg','g','ganados'],3);
  const iPE = find(['pe','e','empatados'],4);
  const iPP = find(['pp','p','perdidos'],5);
  const iGF = find(['gf','golesfavor'],6);
  const iGC = find(['gc','golescontra'],7);
  const iDG = find(['dg','df','diferencia'],8);
  const iPTS = find(['pts','puntos'],9);

  const acumulada = rows.slice(1)
    .filter(r => String(r[iClub]||'').trim())
    .map(r => ({
      club: String(r[iClub]||'').trim(),
      series: Number(r[iSeries]||0),
      pj: Number(r[iPJ]||0),
      pg: Number(r[iPG]||0),
      pe: Number(r[iPE]||0),
      pp: Number(r[iPP]||0),
      gf: Number(r[iGF]||0),
      gc: Number(r[iGC]||0),
      dg: Number(r[iDG] ?? ((Number(r[iGF]||0))-(Number(r[iGC]||0)))),
      pts: Number(r[iPTS]||0)
    }))
    .sort((a,b)=>(b.pts-a.pts)||(b.dg-a.dg)||(b.gf-a.gf));

  if(!acumulada.length) throw new Error('No se encontraron clubes en el Excel.');

  const d = getData();
  d.accumulated = acumulada;
  await saveAll(d);
  fillAdmin();
  ok('Tabla acumulada general de todos los clubes importada correctamente.');
}

document.addEventListener('click', async function(e){
  const btn = e.target.closest('#importAccumulatedExcel');
  if(!btn) return;
  e.preventDefault();
  e.stopPropagation();

  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Importando acumulada...';

  try{
    const file = document.getElementById('accumulatedExcelFile')?.files?.[0];
    await importarAcumuladaTodosClubesExcel(file);
  }catch(error){
    err(error);
  }finally{
    btn.disabled = false;
    btn.textContent = old;
  }
}, true);


/* =========================================================
   ADMIN FINAL REFORZADO
========================================================= */
function finalAdminNorm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function finalAdminUnique(list){
  const seen=new Set();
  return (Array.isArray(list)?list:[]).filter(x=>{const k=finalAdminNorm(x.name||x.title||x.club||x.team||JSON.stringify(x));if(!k||seen.has(k))return false;seen.add(k);return true;});
}
function finalAdminIsStandingResult(r){
  const m=finalAdminNorm(r?.match||r?.match_text||r?.title||''), d=String(r?.date||r?.date_text||'').trim(), s=String(r?.score||'').trim(), g=finalAdminNorm(r?.scorers||'');
  const series=['super senior','senior 35','1 infantil','2 infantil','peques','juveniles','serie de oro','serie damas','2 adulta','1 adulta','serie platino','serie de honor','tabla general','resumen general'];
  return series.some(x=>m.includes(x))||g.includes('planilla oficial')||(/^[0-9]+$/.test(d)&&/^[0-9]+$/.test(s));
}
async function finalAdminCleanData(){
  const d=getData();
  d.sponsors=finalAdminUnique(d.sponsors);
  d.news=finalAdminUnique(d.news);
  d.results=(Array.isArray(d.results)?d.results:[]).filter(r=>!finalAdminIsStandingResult(r));
  saveData(d);
  if(typeof initSB==='function'&&initSB()){
    try{
      const {data}=await supabaseClient.from('results').select('*');
      const ids=(data||[]).filter(finalAdminIsStandingResult).map(x=>x.id).filter(Boolean);
      if(ids.length) await supabaseClient.from('results').delete().in('id',ids);
    }catch(e){console.warn('No se pudo limpiar results Supabase',e);}
  }
  if(typeof saveAll==='function') await saveAll(d);
  if(typeof fillAdmin==='function') fillAdmin();
  if(typeof ok==='function') ok('Datos limpiados, ordenados y guardados.');
}
function finalAdminExportBackup(){
  const d=getData();
  const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='respaldo_ricardo_mendez_'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a); a.click(); a.remove();
}
document.addEventListener('click',async function(e){
  const clean=e.target.closest('#finalCleanData');
  const backup=e.target.closest('#finalExportBackup');
  const cloud=e.target.closest('#finalForceSaveCloud');
  if(!clean&&!backup&&!cloud)return;
  e.preventDefault();e.stopPropagation();
  try{
    if(clean) await finalAdminCleanData();
    if(backup) finalAdminExportBackup();
    if(cloud){await finalAdminCleanData(); if(typeof ok==='function')ok('Todo guardado en Supabase.');}
  }catch(error){ if(typeof err==='function')err(error); else alert(error.message||error); }
},true);

if(typeof pushCloud==='function'&&!window.__finalAdminPushClean){
  window.__finalAdminPushClean=true;
  const oldPush=pushCloud;
  pushCloud=async function(d){
    d=d||getData();
    d.sponsors=finalAdminUnique(d.sponsors);
    d.results=(Array.isArray(d.results)?d.results:[]).filter(r=>!finalAdminIsStandingResult(r));
    saveData(d);
    return oldPush(d);
  };
}


/* =========================================================
   REVISION PROFUNDA FINAL ADMIN
   Bloquea mezcla Puntajes/Resultados también al guardar en Supabase.
========================================================= */
(function(){
  if(window.__RM_DEEP_FINAL_ADMIN__) return;
  window.__RM_DEEP_FINAL_ADMIN__ = true;

  function txt(v){
    return String(v || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/\s+/g,' ')
      .trim();
  }

  function seriesNames(){
    const d = (typeof getData === 'function') ? getData() : {};
    return [...new Set([
      ...Object.keys(d.standings || {}),
      'Super Senior','Senior 35','1° Infantil','2° Infantil','Peques','Juveniles',
      'Serie de Oro','Serie Damas','2° Adulta','1° Adulta','Serie Platino','Serie de Honor',
      'Primera Infantil','Segunda Infantil','Primera Adultos','Segunda Adultos','Honor','Platinos'
    ])].map(txt);
  }

  function isStandingLikeResult(r){
    if(!r) return false;
    const match = txt(r.match || r.match_text || r.title || r.serie || '');
    const date = String(r.date || r.date_text || '').trim();
    const score = String(r.score || r.resultado || '').trim();
    const scorers = txt(r.scorers || r.goleadores || r.description || '');
    const teams = txt(`${r.team || ''} ${r.club || ''} ${r.equipo || ''}`);
    const series = seriesNames();
    const looksLikeSeries = series.some(s => s && (match === s || match.includes(s) || teams.includes(s)));
    const hasStandingWords = /(tabla|posicion|puntaje|puntos|serie|resumen general|planilla oficial)/i.test(match + ' ' + scorers);
    const onlyNumbers = /^[0-9]+$/.test(date) && /^[0-9]+$/.test(score);
    const looksLikeRealMatch = /( vs | v\/s |-|:)/i.test(String(r.match || '')) && /\d+\s*[-:]\s*\d+/.test(score);
    return !looksLikeRealMatch && (looksLikeSeries || hasStandingWords || onlyNumbers);
  }

  function uniqueByName(list){
    const seen = new Set();
    return (Array.isArray(list)?list:[]).filter(x=>{
      const key = txt(x.name || x.title || x.club || x.team || JSON.stringify(x));
      if(!key || seen.has(key)) return false;
      seen.add(key); return true;
    });
  }

  function cleanLocalData(){
    const d = getData();
    d.results = Array.isArray(d.results) ? d.results.filter(r => !isStandingLikeResult(r)) : [];
    d.sponsors = uniqueByName(d.sponsors);
    d.news = uniqueByName(d.news);
    saveData(d);
    return d;
  }

  async function cleanSupabaseResults(){
    if(!(typeof initSB === 'function') || !initSB()) return;
    try{
      const {data, error} = await supabaseClient.from('results').select('*');
      if(error) throw error;
      const ids = (data || []).filter(isStandingLikeResult).map(x=>x.id).filter(Boolean);
      if(ids.length){
        const {error: delErr} = await supabaseClient.from('results').delete().in('id', ids);
        if(delErr) throw delErr;
      }
    }catch(e){
      console.warn('Limpieza results Supabase falló:', e);
    }
  }

  async function deepCleanAndSave(){
    const d = cleanLocalData();
    await cleanSupabaseResults();
    if(typeof saveAll === 'function'){
      await saveAll(d);
    }
    if(typeof fillAdmin === 'function') fillAdmin();
    if(typeof ok === 'function') ok('Revisión profunda: datos limpiados y separados correctamente.');
  }

  // Interceptar pushCloud y saveAll para que nunca suban puntajes a results.
  if(typeof pushCloud === 'function'){
    const oldPush = pushCloud;
    pushCloud = async function(d){
      d = d || getData();
      d.results = Array.isArray(d.results) ? d.results.filter(r => !isStandingLikeResult(r)) : [];
      d.sponsors = uniqueByName(d.sponsors);
      saveData(d);
      const res = await oldPush.apply(this, [d]);
      await cleanSupabaseResults();
      return res;
    };
  }

  if(typeof saveAll === 'function'){
    const oldSaveAll = saveAll;
    saveAll = async function(d){
      d = d || getData();
      d.results = Array.isArray(d.results) ? d.results.filter(r => !isStandingLikeResult(r)) : [];
      d.sponsors = uniqueByName(d.sponsors);
      saveData(d);
      const res = await oldSaveAll.apply(this, [d]);
      await cleanSupabaseResults();
      return res;
    };
  }

  // Interceptar importador oficial: si es tabla, jamás tocar results.
  if(typeof importOfficialPlanillaRicardoMendez === 'function' && typeof rmReadSheetRows === 'function' && typeof rmParseOfficialStatsRows === 'function'){
    const oldImporter = importOfficialPlanillaRicardoMendez;
    importOfficialPlanillaRicardoMendez = async function(file, mode){
      const {rows} = await rmReadSheetRows(file);
      const official = rmParseOfficialStatsRows(rows);
      if(official){
        const d = cleanLocalData();
        d.standings = d.standings || {};
        d.standings['TABLA GENERAL'] = official.rows;
        d.results = d.results.filter(r => !isStandingLikeResult(r));
        saveData(d);
        if(typeof saveAll === 'function') await saveAll(d);
        await cleanSupabaseResults();
        if(typeof fillAdmin === 'function') fillAdmin();
        if(typeof ok === 'function') ok('Excel de Puntajes cargado SOLO en Puntajes/Posiciones.');
        return;
      }
      return oldImporter.apply(this, arguments);
    };
  }

  document.addEventListener('click', async function(e){
    const btn = e.target.closest('#finalDeepAuditClean,#finalCleanData,#limpiarResultsDefinitivo,#cleanSupabaseResults,#cleanWrongResults');
    if(!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Limpiando...';
    try{
      await deepCleanAndSave();
    }catch(error){
      if(typeof err === 'function') err(error); else alert(error.message || error);
    }finally{
      btn.disabled = false;
      btn.textContent = old;
    }
  }, true);

  window.rmDeepFinalAdminClean = deepCleanAndSave;
})();


/* FIX FINAL CARRUSEL SIEMPRE VISIBLE + CLUB EN NUMEROS EDITABLE */
(function(){
  if(window.__RM_FIX_CARRUSEL_NUMEROS_EDITABLE_FINAL__) return;
  window.__RM_FIX_CARRUSEL_NUMEROS_EDITABLE_FINAL__ = true;
  const RM_URL = "https://xzcbdyabzgwfoylipgco.supabase.co";
  const RM_KEY = "sb_publishable_rFYVLbY_0uJvOLJ0jftWzw_jsmNwVkl";
  const DATA_KEYS=['cdrm_final_data_v5_funcional','rmClubData','clubData','cd_rm_data','ricardoMendezData','club_ricardo_mendez_data'];
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function main(){return document.querySelector('main')||document.querySelector('#app')||document.body;}
  function getDataSafe(){
    try{ if(typeof getData==='function') return getData()||{}; }catch(e){}
    for(const k of DATA_KEYS){try{const r=localStorage.getItem(k); if(r) return JSON.parse(r);}catch(e){}}
    return window.RM_DATA||window.clubData||{};
  }
  function saveDataSafe(d){
    try{ if(typeof saveData==='function') saveData(d); }catch(e){}
    for(const k of DATA_KEYS){try{localStorage.setItem(k,JSON.stringify(d));}catch(e){}}
    try{window.RM_DATA=d; window.clubData=d;}catch(e){}
  }
  async function restSelect(table){
    try{
      const r=await fetch(RM_URL.replace(/\/$/,'')+'/rest/v1/'+table+'?select=*',{headers:{apikey:RM_KEY,Authorization:'Bearer '+RM_KEY}});
      if(!r.ok) return [];
      const j=await r.json(); return Array.isArray(j)?j:[];
    }catch(e){return []}
  }
  async function restUpsertSettings(settings){
    try{
      const rows=await restSelect('settings');
      const payload=Object.assign({},rows&&rows[0]?rows[0]:{},settings);
      if(payload.id==null && rows&&rows[0]&&rows[0].id!=null) payload.id=rows[0].id;
      const r=await fetch(RM_URL.replace(/\/$/,'')+'/rest/v1/settings',{method:'POST',headers:{apikey:RM_KEY,Authorization:'Bearer '+RM_KEY,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)});
      return r.ok;
    }catch(e){return false}
  }
  function urlOf(o){return (o&&(o.url||o.logo||o.image||o.image_url||o.imageUrl||o.img||o.photo||o.foto||o.src||o.file_url||o.publicUrl||o.public_url))||'';}
  function nameOf(o){return (o&&(o.name||o.nombre||o.title||o.titulo||o.empresa||o.business))||'Auspiciador';}
  function goodSponsor(u){u=String(u||'').toLowerCase(); return !!u && !u.includes('logo_ricardo_mendez') && !u.includes('favicon') && !u.includes('escudo') && !u.includes('/news/') && !u.includes('/noticias/') && !u.includes('noticia');}
  async function sponsorsStrict(){
    const d=getDataSafe(); let arr=[];
    if(Array.isArray(d.sponsors)) arr=arr.concat(d.sponsors);
    if(Array.isArray(d.auspiciadores)) arr=arr.concat(d.auspiciadores);
    if(d.settings && Array.isArray(d.settings.sponsors)) arr=arr.concat(d.settings.sponsors);
    if(!arr.length){ const r=await restSelect('sponsors'); if(r.length){arr=r; d.sponsors=r; saveDataSafe(d);} }
    const seen=new Set();
    return arr.map(s=>({name:nameOf(s),url:urlOf(s)})).filter(s=>{if(!goodSponsor(s.url)||seen.has(s.url))return false; seen.add(s.url); return true;});
  }
  function forceShow(el){
    if(!el)return; el.hidden=false;
    el.classList.remove('rm-hide-non-final-sponsors','hide-duplicate-sponsors','rm-sponsor-carousel-hidden','rm-info-cargada-hidden');
    el.classList.add('rm-carousel-force-visible');
    el.style.display='block'; el.style.visibility='visible'; el.style.opacity='1'; el.style.position='relative'; el.style.zIndex='999'; el.style.height='auto'; el.style.minHeight='86px'; el.style.maxHeight='none'; el.style.overflow='hidden';
  }
  async function renderTopCarousel(){
    const sponsors=await sponsorsStrict();
    let c=document.getElementById('rmSponsorsTopCarousel');
    if(!c){c=document.createElement('section'); c.id='rmSponsorsTopCarousel';}
    c.className='section rm-sponsors-top-carousel rm-carousel-force-visible';
    c.innerHTML='<div class="rm-sponsors-top-title"><strong>Auspiciadores oficiales</strong><span>Carrusel superior</span></div><div id="rmSponsorsTopTrack" class="rm-sponsors-top-track"></div>';
    const track=c.querySelector('#rmSponsorsTopTrack');
    if(!sponsors.length) track.innerHTML='<div class="rm-top-sponsor-item rm-top-sponsor-empty"><span>Auspiciadores pendientes de cargar desde Admin</span></div>';
    else track.innerHTML=sponsors.concat(sponsors,sponsors).map(s=>'<div class="rm-top-sponsor-item"><img src="'+esc(s.url)+'" alt="'+esc(s.name)+'" loading="lazy"><span>'+esc(s.name)+'</span></div>').join('');
    const enhanced=document.getElementById('rmEnhancedTopSection');
    const history=document.getElementById('historyPrincipalSection')||document.querySelector('.history-principal-section');
    if(enhanced&&enhanced.parentElement) enhanced.insertAdjacentElement('afterend',c);
    else if(history&&history.parentElement) history.parentElement.insertBefore(c,history);
    else main().insertBefore(c,main().firstChild);
    forceShow(c);
    document.querySelectorAll('.sponsors-marquee,.sponsors-track,.sponsors-carousel,.sponsors-slider,#sponsorTicker').forEach(e=>{if(!e.closest('#rmSponsorsTopCarousel')) e.style.display='none';});
  }
  function numbersData(){
    const d=getDataSafe(); d.settings=d.settings||{}; const s=d.settings;
    return {fundacion:s.foundationDate||s.fundacion||s.foundation||'12/08/1932',aniversario:s.anniversary||s.aniversario||'',series:s.series||s.seriesCount||s.totalSeries||'',socios:s.activeMembers||s.socios||s.members||'',campeonato:s.championship||s.campeonato||s.tournament||'',jugadores:s.registeredPlayers||s.jugadoresInscritos||s.players||''};
  }
  function renderNumbersPublic(){
    const n=numbersData(); let p=document.getElementById('rmClubNumbersPanel');
    if(!p){p=document.createElement('section'); p.id='rmClubNumbersPanel';}
    p.className='section rm-club-numbers-panel';
    p.innerHTML='<div class="section-head"><h2>Club en números</h2><p>Datos editables desde Admin</p></div><div class="rm-club-numbers-grid">'+
      [['Fundación',n.fundacion],['Aniversario',n.aniversario||'Editable'],['Series',n.series||'0'],['Socios',n.socios||'0'],['Campeonato',n.campeonato||'Editable'],['Jugadores inscritos',n.jugadores||'0']].map(x=>'<div class="rm-club-number-card"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>').join('')+'</div>';
    const car=document.getElementById('rmSponsorsTopCarousel'); const next=document.getElementById('rmNextMatchPanel')||document.querySelector('[id*="nextMatch"],[id*="proximo"],.rm-next-match-panel,.proximo-partido');
    if(car&&car.parentElement) car.insertAdjacentElement('afterend',p); else if(next) (next.closest('section,.section,.panel,.card')||next).insertAdjacentElement('afterend',p); else main().insertBefore(p,main().firstChild);
    p.style.display='block'; p.style.visibility='visible';
  }
  function adminEditor(){
    if(!/admin/i.test(location.pathname)&&!document.querySelector('.admin,.admin-panel,#adminPanel'))return;
    if(document.getElementById('rmClubNumbersAdmin'))return;
    const n=numbersData(); const host=document.querySelector('main')||document.body;
    const b=document.createElement('section'); b.id='rmClubNumbersAdmin'; b.className='admin-card rm-club-numbers-admin';
    b.innerHTML='<h2>Club en números</h2><p>Edita el panel público Club en números.</p><div class="rm-admin-numbers-grid">'+
      '<label>Fundación<input id="rmAdminFundacion" value="'+esc(n.fundacion)+'" placeholder="12/08/1932"></label>'+
      '<label>Aniversario<input id="rmAdminAniversario" value="'+esc(n.aniversario)+'" placeholder="94 años"></label>'+
      '<label>Series<input id="rmAdminSeries" value="'+esc(n.series)+'" placeholder="11"></label>'+
      '<label>Socios<input id="rmAdminSocios" value="'+esc(n.socios)+'" placeholder="150"></label>'+
      '<label>Campeonato<input id="rmAdminCampeonato" value="'+esc(n.campeonato)+'" placeholder="Campeonato 2026"></label>'+
      '<label>Jugadores inscritos<input id="rmAdminJugadores" value="'+esc(n.jugadores)+'" placeholder="120"></label>'+
      '</div><button type="button" id="rmSaveClubNumbersBtn">Guardar Club en números</button>';
    host.appendChild(b);
    document.getElementById('rmSaveClubNumbersBtn').addEventListener('click',async()=>{
      const d=getDataSafe(); d.settings=d.settings||{};
      d.settings.foundationDate=document.getElementById('rmAdminFundacion').value.trim(); d.settings.fundacion=d.settings.foundationDate;
      d.settings.anniversary=document.getElementById('rmAdminAniversario').value.trim(); d.settings.aniversario=d.settings.anniversary;
      d.settings.series=document.getElementById('rmAdminSeries').value.trim(); d.settings.seriesCount=d.settings.series;
      d.settings.activeMembers=document.getElementById('rmAdminSocios').value.trim(); d.settings.socios=d.settings.activeMembers;
      d.settings.championship=document.getElementById('rmAdminCampeonato').value.trim(); d.settings.campeonato=d.settings.championship;
      d.settings.registeredPlayers=document.getElementById('rmAdminJugadores').value.trim(); d.settings.jugadoresInscritos=d.settings.registeredPlayers;
      saveDataSafe(d); try{if(typeof pushCloud==='function') await pushCloud();}catch(e){} try{await restUpsertSettings(d.settings);}catch(e){} renderNumbersPublic(); alert('Club en números guardado.');
    });
  }
  function keepResultsBeforeHistory(){const p=document.getElementById('rmCompactResultsPanel'), h=document.getElementById('historyPrincipalSection')||document.querySelector('.history-principal-section'); if(p&&h&&h.parentElement){h.parentElement.insertBefore(p,h); p.style.display='block'; p.style.visibility='visible';}}
  async function run(){await renderTopCarousel(); renderNumbersPublic(); adminEditor(); keepResultsBeforeHistory(); setTimeout(async()=>{await renderTopCarousel(); renderNumbersPublic(); keepResultsBeforeHistory();},1000); setTimeout(async()=>{await renderTopCarousel(); renderNumbersPublic(); keepResultsBeforeHistory();},3000);}
  if(typeof renderPublic==='function'){const old=renderPublic; renderPublic=function(){const r=old.apply(this,arguments); setTimeout(run,120); setTimeout(run,1400); return r;};}
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(run,120); setTimeout(run,1400); setTimeout(run,3200); setTimeout(run,6500); try{new MutationObserver(()=>{clearTimeout(window.__rmCarrObs); window.__rmCarrObs=setTimeout(run,220);}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});}catch(e){}});
  document.addEventListener('rm:supabase-mobile-loaded',()=>{setTimeout(run,150); setTimeout(run,1200);}); window.addEventListener('pageshow',()=>setTimeout(run,250));
  window.rmFixCarruselClubNumerosAdmin=run;
})();


/* =========================================================
   REVISION OK CARRUSEL + CLUB EN NUMEROS ADMIN
   Revisión aplicada al ZIP subido.
========================================================= */
(function(){
  if(window.__RM_REVISION_OK_CARRUSEL_NUMEROS_ADMIN__) return;
  window.__RM_REVISION_OK_CARRUSEL_NUMEROS_ADMIN__ = true;

  var RM_SUPABASE_URL = "https://xzcbdyabzgwfoylipgco.supabase.co";
  var RM_SUPABASE_KEY = "sb_publishable_rFYVLbY_0uJvOLJ0jftWzw_jsmNwVkl";

  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }

  function main(){
    return document.querySelector('main') || document.querySelector('#app') || document.body;
  }

  function getDataSafe(){
    try{ if(typeof getData === 'function') return getData() || {}; }catch(e){}
    var keys = ['cdrm_final_data_v5_funcional','rmClubData','clubData','cd_rm_data','ricardoMendezData','club_ricardo_mendez_data'];
    for(var i=0;i<keys.length;i++){
      try{
        var raw = localStorage.getItem(keys[i]);
        if(raw) return JSON.parse(raw);
      }catch(e){}
    }
    return window.RM_DATA || window.clubData || {};
  }

  function saveDataSafe(d){
    try{ if(typeof saveData === 'function') saveData(d); }catch(e){}
    ['cdrm_final_data_v5_funcional','rmClubData','clubData','cd_rm_data','ricardoMendezData','club_ricardo_mendez_data'].forEach(function(k){
      try{ localStorage.setItem(k, JSON.stringify(d)); }catch(e){}
    });
    try{ window.RM_DATA = d; window.clubData = d; }catch(e){}
  }

  async function restSelect(table){
    try{
      var res = await fetch(RM_SUPABASE_URL.replace(/\/$/,'') + '/rest/v1/' + table + '?select=*', {
        headers: { apikey: RM_SUPABASE_KEY, Authorization: 'Bearer ' + RM_SUPABASE_KEY }
      });
      if(!res.ok) return [];
      var data = await res.json();
      return Array.isArray(data) ? data : [];
    }catch(e){ return []; }
  }

  async function restUpsertSettings(settings){
    try{
      var rows = await restSelect('settings');
      var row = rows && rows[0] ? rows[0] : {};
      var payload = Object.assign({}, row, settings);
      if(row.id != null) payload.id = row.id;
      var res = await fetch(RM_SUPABASE_URL.replace(/\/$/,'') + '/rest/v1/settings', {
        method:'POST',
        headers:{
          apikey:RM_SUPABASE_KEY,
          Authorization:'Bearer '+RM_SUPABASE_KEY,
          'Content-Type':'application/json',
          Prefer:'resolution=merge-duplicates,return=minimal'
        },
        body:JSON.stringify(payload)
      });
      return res.ok;
    }catch(e){ return false; }
  }

  function urlOf(o){
    return (o && (o.url || o.logo || o.image || o.image_url || o.imageUrl || o.img || o.photo || o.foto || o.src || o.file_url || o.publicUrl || o.public_url)) || '';
  }

  function nameOf(o){
    return (o && (o.name || o.nombre || o.title || o.titulo || o.empresa || o.business)) || 'Auspiciador';
  }

  function validSponsorUrl(u){
    u = String(u || '').toLowerCase();
    if(!u) return false;
    if(u.includes('logo_ricardo_mendez') || u.includes('favicon') || u.includes('escudo')) return false;
    if(u.includes('/news/') || u.includes('/noticias/') || u.includes('noticia')) return false;
    return true;
  }

  async function getSponsorsStrict(){
    var d = getDataSafe();
    var arr = [];
    if(Array.isArray(d.sponsors)) arr = arr.concat(d.sponsors);
    if(Array.isArray(d.auspiciadores)) arr = arr.concat(d.auspiciadores);
    if(d.settings && Array.isArray(d.settings.sponsors)) arr = arr.concat(d.settings.sponsors);
    if(!arr.length){
      var remote = await restSelect('sponsors');
      if(remote.length){
        arr = remote;
        d.sponsors = remote;
        saveDataSafe(d);
      }
    }
    var seen = new Set();
    return arr.map(function(s){ return {name:nameOf(s), url:urlOf(s)}; }).filter(function(s){
      if(!validSponsorUrl(s.url)) return false;
      if(seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
  }

  function forceShow(el){
    if(!el) return;
    el.classList.remove('rm-hide-non-final-sponsors','hide-duplicate-sponsors','rm-sponsor-carousel-hidden','rm-info-cargada-hidden');
    el.hidden = false;
    el.style.setProperty('display','block','important');
    el.style.setProperty('visibility','visible','important');
    el.style.setProperty('opacity','1','important');
    el.style.setProperty('height','auto','important');
    el.style.setProperty('min-height','86px','important');
    el.style.setProperty('max-height','none','important');
    el.style.setProperty('overflow','hidden','important');
  }

  async function renderTopCarousel(){
    var sponsors = await getSponsorsStrict();
    var carousel = document.getElementById('rmSponsorsTopCarousel');
    if(!carousel){
      carousel = document.createElement('section');
      carousel.id = 'rmSponsorsTopCarousel';
      carousel.className = 'section rm-sponsors-top-carousel rm-carousel-force-visible';
    }
    carousel.classList.add('rm-sponsors-top-carousel','rm-carousel-force-visible','rm-carousel-visible-final');
    carousel.innerHTML =
      '<div class="rm-sponsors-top-title"><strong>Auspiciadores oficiales</strong><span>Carrusel superior</span></div>' +
      '<div id="rmSponsorsTopTrack" class="rm-sponsors-top-track"></div>';

    var track = carousel.querySelector('#rmSponsorsTopTrack');
    if(!sponsors.length){
      track.innerHTML = '<div class="rm-top-sponsor-item rm-top-sponsor-empty"><span>Auspiciadores pendientes de cargar desde Admin</span></div>';
    }else{
      var list = sponsors.concat(sponsors).concat(sponsors);
      track.innerHTML = list.map(function(s){
        return '<div class="rm-top-sponsor-item"><img src="'+esc(s.url)+'" alt="'+esc(s.name)+'" loading="lazy"><span>'+esc(s.name)+'</span></div>';
      }).join('');
    }

    var enhanced = document.getElementById('rmEnhancedTopSection');
    var history = document.getElementById('historyPrincipalSection') || document.querySelector('.history-principal-section');
    if(enhanced && enhanced.parentElement) enhanced.insertAdjacentElement('afterend', carousel);
    else if(history && history.parentElement) history.parentElement.insertBefore(carousel, history);
    else main().insertBefore(carousel, main().firstChild);

    forceShow(carousel);
    carousel.style.setProperty('position','relative','important');
    carousel.style.setProperty('z-index','999','important');
    carousel.style.setProperty('margin','12px auto 14px auto','important');
    carousel.style.setProperty('clear','both','important');

    // Hide only old duplicate sponsor tracks, not this carousel.
    document.querySelectorAll('.sponsors-marquee,.sponsors-track,.sponsors-carousel,.sponsors-slider,#sponsorTicker').forEach(function(el){
      if(el.closest('#rmSponsorsTopCarousel')) return;
      el.style.setProperty('display','none','important');
    });
  }

  function numbersData(){
    var d = getDataSafe(); d.settings = d.settings || {};
    var s = d.settings;
    return {
      fundacion: s.foundationDate || s.fundacion || s.foundation || '12/08/1932',
      aniversario: s.anniversary || s.aniversario || '',
      series: s.series || s.seriesCount || s.totalSeries || '',
      socios: s.activeMembers || s.socios || s.members || '',
      campeonato: s.championship || s.campeonato || s.tournament || '',
      jugadores: s.registeredPlayers || s.jugadoresInscritos || s.players || ''
    };
  }

  function renderNumbersPublic(){
    var n = numbersData();
    var panel = document.getElementById('rmClubNumbersPanel');
    if(!panel){
      panel = document.createElement('section');
      panel.id = 'rmClubNumbersPanel';
      panel.className = 'section rm-club-numbers-panel';
    }
    panel.innerHTML =
      '<div class="section-head"><h2>Club en números</h2><p>Datos editables desde Admin</p></div>' +
      '<div class="rm-club-numbers-grid">' +
      '<div class="rm-club-number-card"><span>Fundación</span><strong>'+esc(n.fundacion)+'</strong></div>' +
      '<div class="rm-club-number-card"><span>Aniversario</span><strong>'+esc(n.aniversario || 'Editable')+'</strong></div>' +
      '<div class="rm-club-number-card"><span>Series</span><strong>'+esc(n.series || '0')+'</strong></div>' +
      '<div class="rm-club-number-card"><span>Socios</span><strong>'+esc(n.socios || '0')+'</strong></div>' +
      '<div class="rm-club-number-card"><span>Campeonato</span><strong>'+esc(n.campeonato || 'Editable')+'</strong></div>' +
      '<div class="rm-club-number-card"><span>Jugadores inscritos</span><strong>'+esc(n.jugadores || '0')+'</strong></div>' +
      '</div>';

    var carousel = document.getElementById('rmSponsorsTopCarousel');
    var compact = document.getElementById('rmCompactResultsPanel');
    if(carousel && carousel.parentElement) carousel.insertAdjacentElement('afterend', panel);
    else if(compact && compact.parentElement) compact.parentElement.insertBefore(panel, compact);
    else main().insertBefore(panel, main().firstChild);
    forceShow(panel);
  }

  function adminNumbersEditor(){
    if(!/admin/i.test(location.pathname) && !document.querySelector('.admin,.admin-panel,#adminPanel')) return;
    if(document.getElementById('rmClubNumbersAdmin')) return;

    var n = numbersData();
    var box = document.createElement('section');
    box.id = 'rmClubNumbersAdmin';
    box.className = 'admin-card rm-club-numbers-admin';
    box.innerHTML =
      '<h2>Club en números</h2>' +
      '<p>Edita los datos del panel público.</p>' +
      '<div class="rm-admin-numbers-grid">' +
      '<label>Fundación<input id="rmAdminFundacion" value="'+esc(n.fundacion)+'" placeholder="12/08/1932"></label>' +
      '<label>Aniversario<input id="rmAdminAniversario" value="'+esc(n.aniversario)+'" placeholder="94 años"></label>' +
      '<label>Series<input id="rmAdminSeries" value="'+esc(n.series)+'" placeholder="11"></label>' +
      '<label>Socios<input id="rmAdminSocios" value="'+esc(n.socios)+'" placeholder="150"></label>' +
      '<label>Campeonato<input id="rmAdminCampeonato" value="'+esc(n.campeonato)+'" placeholder="Campeonato 2026"></label>' +
      '<label>Jugadores inscritos<input id="rmAdminJugadores" value="'+esc(n.jugadores)+'" placeholder="120"></label>' +
      '</div>' +
      '<button type="button" id="rmSaveClubNumbersBtn">Guardar Club en números</button>';

    var host = document.querySelector('main') || document.body;
    host.appendChild(box);

    document.getElementById('rmSaveClubNumbersBtn').addEventListener('click', async function(){
      var d = getDataSafe(); d.settings = d.settings || {};
      d.settings.foundationDate = document.getElementById('rmAdminFundacion').value.trim();
      d.settings.fundacion = d.settings.foundationDate;
      d.settings.anniversary = document.getElementById('rmAdminAniversario').value.trim();
      d.settings.aniversario = d.settings.anniversary;
      d.settings.series = document.getElementById('rmAdminSeries').value.trim();
      d.settings.seriesCount = d.settings.series;
      d.settings.activeMembers = document.getElementById('rmAdminSocios').value.trim();
      d.settings.socios = d.settings.activeMembers;
      d.settings.championship = document.getElementById('rmAdminCampeonato').value.trim();
      d.settings.campeonato = d.settings.championship;
      d.settings.registeredPlayers = document.getElementById('rmAdminJugadores').value.trim();
      d.settings.jugadoresInscritos = d.settings.registeredPlayers;

      saveDataSafe(d);
      try{ if(typeof pushCloud === 'function') await pushCloud(); }catch(e){}
      await restUpsertSettings(d.settings);
      renderNumbersPublic();
      alert('Club en números guardado.');
    });
  }

  function keepCompactBeforeHistory(){
    var panel = document.getElementById('rmCompactResultsPanel');
    var history = document.getElementById('historyPrincipalSection') || document.querySelector('.history-principal-section');
    if(panel && history && history.parentElement){
      history.parentElement.insertBefore(panel, history);
      panel.style.setProperty('display','block','important');
      panel.style.setProperty('visibility','visible','important');
    }
  }

  async function run(){
    await renderTopCarousel();
    renderNumbersPublic();
    adminNumbersEditor();
    keepCompactBeforeHistory();

    setTimeout(async function(){ await renderTopCarousel(); renderNumbersPublic(); keepCompactBeforeHistory(); }, 900);
    setTimeout(async function(){ await renderTopCarousel(); renderNumbersPublic(); keepCompactBeforeHistory(); }, 2500);
  }

  if(typeof renderPublic === 'function'){
    var oldRender = renderPublic;
    renderPublic = function(){
      var r = oldRender.apply(this, arguments);
      setTimeout(run, 100);
      setTimeout(run, 1200);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(run, 100);
    setTimeout(run, 1200);
    setTimeout(run, 3000);
    setTimeout(run, 6000);
    try{
      var timer = null;
      var obs = new MutationObserver(function(){
        clearTimeout(timer);
        timer = setTimeout(run, 180);
      });
      obs.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['style','class','hidden']});
    }catch(e){}
  });
  document.addEventListener('rm:supabase-mobile-loaded', function(){ setTimeout(run, 150); });
  window.addEventListener('pageshow', function(){ setTimeout(run, 250); });
  window.rmRevisionOkCarruselNumerosAdmin = run;
})();


/* =========================================================
   FIX CARRUSEL SUAVE SIN TIRITAR
   Movimiento continuo y estable, sin reiniciar el carrusel.
========================================================= */
(function(){
  if(window.__RM_CARRUSEL_SUAVE_FINAL__) return;
  window.__RM_CARRUSEL_SUAVE_FINAL__ = true;

  var RM_SUPABASE_URL = "https://xzcbdyabzgwfoylipgco.supabase.co";
  var RM_SUPABASE_KEY = "sb_publishable_rFYVLbY_0uJvOLJ0jftWzw_jsmNwVkl";
  var lastSponsorSignature = '';

  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }

  function main(){
    return document.querySelector('main') || document.querySelector('#app') || document.body;
  }

  function getDataSafe(){
    try{ if(typeof getData === 'function') return getData() || {}; }catch(e){}
    var keys = ['cdrm_final_data_v5_funcional','rmClubData','clubData','cd_rm_data','ricardoMendezData','club_ricardo_mendez_data'];
    for(var i=0;i<keys.length;i++){
      try{
        var raw = localStorage.getItem(keys[i]);
        if(raw) return JSON.parse(raw);
      }catch(e){}
    }
    return window.RM_DATA || window.clubData || {};
  }

  function saveDataSafe(d){
    try{ if(typeof saveData === 'function') saveData(d); }catch(e){}
    try{ localStorage.setItem('cdrm_final_data_v5_funcional', JSON.stringify(d)); }catch(e){}
    try{ window.RM_DATA = d; window.clubData = d; }catch(e){}
  }

  async function restSelect(table){
    try{
      var res = await fetch(RM_SUPABASE_URL.replace(/\/$/,'') + '/rest/v1/' + table + '?select=*', {
        headers: { apikey: RM_SUPABASE_KEY, Authorization: 'Bearer ' + RM_SUPABASE_KEY }
      });
      if(!res.ok) return [];
      var data = await res.json();
      return Array.isArray(data) ? data : [];
    }catch(e){ return []; }
  }

  function urlOf(o){
    return (o && (o.url || o.logo || o.image || o.image_url || o.imageUrl || o.img || o.photo || o.foto || o.src || o.file_url || o.publicUrl || o.public_url)) || '';
  }

  function nameOf(o){
    return (o && (o.name || o.nombre || o.title || o.titulo || o.empresa || o.business)) || 'Auspiciador';
  }

  function validSponsorUrl(u){
    u = String(u || '').toLowerCase();
    if(!u) return false;
    if(u.includes('logo_ricardo_mendez') || u.includes('favicon') || u.includes('escudo')) return false;
    if(u.includes('/news/') || u.includes('/noticias/') || u.includes('noticia')) return false;
    return true;
  }

  async function getSponsors(){
    var d = getDataSafe();
    var arr = [];
    if(Array.isArray(d.sponsors)) arr = arr.concat(d.sponsors);
    if(Array.isArray(d.auspiciadores)) arr = arr.concat(d.auspiciadores);
    if(d.settings && Array.isArray(d.settings.sponsors)) arr = arr.concat(d.settings.sponsors);

    if(!arr.length){
      var remote = await restSelect('sponsors');
      if(remote.length){
        arr = remote;
        d.sponsors = remote;
        saveDataSafe(d);
      }
    }

    var seen = new Set();
    return arr.map(function(s){
      return {name:nameOf(s), url:urlOf(s)};
    }).filter(function(s){
      if(!validSponsorUrl(s.url)) return false;
      if(seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
  }

  function buildTrackHtml(sponsors){
    if(!sponsors.length){
      return '<div class="rm-sponsor-loop-set"><div class="rm-top-sponsor-item rm-top-sponsor-empty"><span>Auspiciadores pendientes de cargar desde Admin</span></div></div>';
    }

    var set = '<div class="rm-sponsor-loop-set">' + sponsors.map(function(s){
      return '<div class="rm-top-sponsor-item"><img src="'+esc(s.url)+'" alt="'+esc(s.name)+'" loading="lazy"><span>'+esc(s.name)+'</span></div>';
    }).join('') + '</div>';

    // Dos sets iguales permiten movimiento continuo sin salto.
    return set + set;
  }

  async function renderSmoothCarousel(){
    var sponsors = await getSponsors();
    var signature = sponsors.map(function(s){ return s.url + '|' + s.name; }).join('::');

    var carousel = document.getElementById('rmSponsorsTopCarousel');
    if(!carousel){
      carousel = document.createElement('section');
      carousel.id = 'rmSponsorsTopCarousel';
      carousel.className = 'section rm-sponsors-top-carousel rm-carousel-suave-final';
    }

    carousel.classList.remove('rm-sponsor-carousel-hidden','rm-info-cargada-hidden','rm-hide-non-final-sponsors','hide-duplicate-sponsors');
    carousel.classList.add('rm-sponsors-top-carousel','rm-carousel-suave-final','rm-carousel-force-visible');

    // Reubicar sin reconstruir si no cambió la lista.
    var enhanced = document.getElementById('rmEnhancedTopSection');
    var history = document.getElementById('historyPrincipalSection') || document.querySelector('.history-principal-section');
    if(enhanced && enhanced.parentElement){
      enhanced.insertAdjacentElement('afterend', carousel);
    }else if(history && history.parentElement){
      history.parentElement.insertBefore(carousel, history);
    }else{
      main().insertBefore(carousel, main().firstChild);
    }

    if(carousel.dataset.rmSponsorSignature !== signature){
      carousel.dataset.rmSponsorSignature = signature;
      carousel.innerHTML =
        '<div class="rm-sponsors-top-title"><strong>Auspiciadores oficiales</strong><span>Carrusel superior</span></div>' +
        '<div class="rm-carousel-mask"><div id="rmSponsorsTopTrack" class="rm-sponsors-top-track rm-sponsors-top-track-smooth">' +
        buildTrackHtml(sponsors) +
        '</div></div>';
    }

    carousel.style.setProperty('display','block','important');
    carousel.style.setProperty('visibility','visible','important');
    carousel.style.setProperty('opacity','1','important');
    carousel.style.setProperty('position','relative','important');
    carousel.style.setProperty('z-index','999','important');
    carousel.style.setProperty('height','auto','important');
    carousel.style.setProperty('min-height','88px','important');
    carousel.style.setProperty('max-height','none','important');
    carousel.style.setProperty('overflow','hidden','important');

    var track = carousel.querySelector('#rmSponsorsTopTrack');
    if(track){
      track.style.animationPlayState = 'running';
      track.style.willChange = 'transform';
    }

    // Oculta carruseles antiguos duplicados, pero nunca el nuevo.
    document.querySelectorAll('.sponsors-marquee,.sponsors-track,.sponsors-carousel,.sponsors-slider,#sponsorTicker').forEach(function(el){
      if(el.closest('#rmSponsorsTopCarousel') || el.id === 'rmSponsorsTopCarousel') return;
      el.style.setProperty('display','none','important');
      el.style.setProperty('visibility','hidden','important');
    });
  }

  function stabilizeOnly(){
    var carousel = document.getElementById('rmSponsorsTopCarousel');
    if(!carousel) return;
    carousel.classList.add('rm-carousel-suave-final','rm-carousel-force-visible');
    carousel.style.setProperty('display','block','important');
    carousel.style.setProperty('visibility','visible','important');
    carousel.style.setProperty('opacity','1','important');
    carousel.style.setProperty('z-index','999','important');
    var track = carousel.querySelector('#rmSponsorsTopTrack');
    if(track) track.style.animationPlayState = 'running';
  }

  async function runOnce(){
    await renderSmoothCarousel();
    setTimeout(stabilizeOnly, 500);
    setTimeout(stabilizeOnly, 1500);
  }

  // Desactivar re-render externo del carrusel si existe; solo estabiliza.
  window.rmFixCarruselClubNumerosAdmin = stabilizeOnly;
  window.rmRevisionOkCarruselNumerosAdmin = stabilizeOnly;

  if(typeof renderPublic === 'function'){
    var oldRender = renderPublic;
    renderPublic = function(){
      var r = oldRender.apply(this, arguments);
      setTimeout(runOnce, 180);
      setTimeout(stabilizeOnly, 1400);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(runOnce, 150);
    setTimeout(stabilizeOnly, 900);
    setTimeout(stabilizeOnly, 2400);
  });

  document.addEventListener('rm:supabase-mobile-loaded', function(){
    setTimeout(runOnce, 180);
  });

  window.addEventListener('pageshow', function(){
    setTimeout(runOnce, 250);
  });

  window.rmCarruselSuaveFinal = runOnce;
})();


/* =========================================================
   FIX CARRUSEL MOVIMIENTO REAL JS
   Usa requestAnimationFrame para que el carrusel avance siempre.
========================================================= */
(function(){
  if(window.__RM_CARRUSEL_MOVIMIENTO_REAL_JS__) return;
  window.__RM_CARRUSEL_MOVIMIENTO_REAL_JS__ = true;

  var RM_SUPABASE_URL = "https://xzcbdyabzgwfoylipgco.supabase.co";
  var RM_SUPABASE_KEY = "sb_publishable_rFYVLbY_0uJvOLJ0jftWzw_jsmNwVkl";
  var rmCarouselFrame = null;
  var rmCarouselX = 0;
  var rmCarouselLastTs = 0;
  var rmCarouselSignature = '';
  var rmCarouselPaused = false;

  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }

  function main(){
    return document.querySelector('main') || document.querySelector('#app') || document.body;
  }

  function getDataSafe(){
    try{ if(typeof getData === 'function') return getData() || {}; }catch(e){}
    var keys = ['cdrm_final_data_v5_funcional','rmClubData','clubData','cd_rm_data','ricardoMendezData','club_ricardo_mendez_data'];
    for(var i=0;i<keys.length;i++){
      try{
        var raw = localStorage.getItem(keys[i]);
        if(raw) return JSON.parse(raw);
      }catch(e){}
    }
    return window.RM_DATA || window.clubData || {};
  }

  function saveDataSafe(d){
    try{ if(typeof saveData === 'function') saveData(d); }catch(e){}
    try{ localStorage.setItem('cdrm_final_data_v5_funcional', JSON.stringify(d)); }catch(e){}
    try{ window.RM_DATA = d; window.clubData = d; }catch(e){}
  }

  async function restSelect(table){
    try{
      var res = await fetch(RM_SUPABASE_URL.replace(/\/$/,'') + '/rest/v1/' + table + '?select=*', {
        headers: { apikey: RM_SUPABASE_KEY, Authorization: 'Bearer ' + RM_SUPABASE_KEY }
      });
      if(!res.ok) return [];
      var data = await res.json();
      return Array.isArray(data) ? data : [];
    }catch(e){ return []; }
  }

  function urlOf(o){
    return (o && (o.url || o.logo || o.image || o.image_url || o.imageUrl || o.img || o.photo || o.foto || o.src || o.file_url || o.publicUrl || o.public_url)) || '';
  }

  function nameOf(o){
    return (o && (o.name || o.nombre || o.title || o.titulo || o.empresa || o.business)) || 'Auspiciador';
  }

  function validSponsorUrl(u){
    u = String(u || '').toLowerCase();
    if(!u) return false;
    if(u.includes('logo_ricardo_mendez') || u.includes('favicon') || u.includes('escudo')) return false;
    if(u.includes('/news/') || u.includes('/noticias/') || u.includes('noticia')) return false;
    return true;
  }

  function sponsorsFromDOM(){
    var arr = [];
    document.querySelectorAll('#sponsorsBottomSection img,#sponsorsFinalGrid img,.sponsor-final-card img').forEach(function(img){
      var src = img.currentSrc || img.src || img.getAttribute('src') || '';
      if(validSponsorUrl(src)) arr.push({name: img.alt || 'Auspiciador', url: src});
    });
    return arr;
  }

  async function getSponsors(){
    var d = getDataSafe();
    var arr = [];
    if(Array.isArray(d.sponsors)) arr = arr.concat(d.sponsors);
    if(Array.isArray(d.auspiciadores)) arr = arr.concat(d.auspiciadores);
    if(d.settings && Array.isArray(d.settings.sponsors)) arr = arr.concat(d.settings.sponsors);

    if(!arr.length) arr = sponsorsFromDOM();

    if(!arr.length){
      var remote = await restSelect('sponsors');
      if(remote.length){
        arr = remote;
        d.sponsors = remote;
        saveDataSafe(d);
      }
    }

    var seen = new Set();
    var clean = arr.map(function(s){ return {name:nameOf(s), url:urlOf(s)}; }).filter(function(s){
      if(!validSponsorUrl(s.url)) return false;
      if(seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });

    return clean;
  }

  function getSetHtml(sponsors){
    if(!sponsors.length){
      return '<div class="rm-carousel-item-js rm-carousel-empty-js"><span>Auspiciadores pendientes de cargar desde Admin</span></div>';
    }
    return sponsors.map(function(s){
      return '<div class="rm-carousel-item-js"><img src="'+esc(s.url)+'" alt="'+esc(s.name)+'" loading="lazy"><span>'+esc(s.name)+'</span></div>';
    }).join('');
  }

  function stopOldCssAnimations(track){
    if(!track) return;
    track.style.animation = 'none';
    track.style.animationPlayState = 'paused';
  }

  function startRealMovement(){
    var track = document.getElementById('rmSponsorsTopTrack');
    var set1 = track ? track.querySelector('.rm-carousel-set-js') : null;
    if(!track || !set1) return;

    if(rmCarouselFrame) cancelAnimationFrame(rmCarouselFrame);
    rmCarouselFrame = null;
    rmCarouselLastTs = 0;

    function loop(ts){
      if(!rmCarouselLastTs) rmCarouselLastTs = ts;
      var dt = Math.min(40, ts - rmCarouselLastTs);
      rmCarouselLastTs = ts;

      var setWidth = set1.scrollWidth;
      if(setWidth < 10){
        rmCarouselFrame = requestAnimationFrame(loop);
        return;
      }

      if(!rmCarouselPaused){
        // Velocidad estable: pixeles por segundo.
        rmCarouselX += dt * 0.045;
        if(rmCarouselX >= setWidth){
          rmCarouselX = rmCarouselX - setWidth;
        }
        track.style.transform = 'translate3d(' + (-rmCarouselX) + 'px,0,0)';
      }

      rmCarouselFrame = requestAnimationFrame(loop);
    }

    rmCarouselFrame = requestAnimationFrame(loop);
  }

  async function renderCarouselMoving(){
    var sponsors = await getSponsors();
    var signature = sponsors.map(function(s){ return s.url + '|' + s.name; }).join('::');

    var carousel = document.getElementById('rmSponsorsTopCarousel');
    if(!carousel){
      carousel = document.createElement('section');
      carousel.id = 'rmSponsorsTopCarousel';
      carousel.className = 'section rm-sponsors-top-carousel rm-carousel-real-js';
    }

    carousel.classList.remove('rm-hide-non-final-sponsors','hide-duplicate-sponsors','rm-sponsor-carousel-hidden','rm-info-cargada-hidden');
    carousel.classList.add('rm-sponsors-top-carousel','rm-carousel-real-js','rm-carousel-force-visible');

    var enhanced = document.getElementById('rmEnhancedTopSection');
    var history = document.getElementById('historyPrincipalSection') || document.querySelector('.history-principal-section');
    if(enhanced && enhanced.parentElement) enhanced.insertAdjacentElement('afterend', carousel);
    else if(history && history.parentElement) history.parentElement.insertBefore(carousel, history);
    else main().insertBefore(carousel, main().firstChild);

    // Solo reconstruye si cambian los auspiciadores.
    if(carousel.dataset.rmMovingSignature !== signature){
      carousel.dataset.rmMovingSignature = signature;
      var setHtml = getSetHtml(sponsors);
      // 3 sets para que siempre exista recorrido visible incluso con pocos auspiciadores.
      carousel.innerHTML =
        '<div class="rm-sponsors-top-title"><strong>Auspiciadores oficiales</strong><span>Carrusel superior</span></div>' +
        '<div class="rm-carousel-viewport-js">' +
          '<div id="rmSponsorsTopTrack" class="rm-sponsors-top-track rm-carousel-track-js">' +
            '<div class="rm-carousel-set-js">'+setHtml+'</div>' +
            '<div class="rm-carousel-set-js">'+setHtml+'</div>' +
            '<div class="rm-carousel-set-js">'+setHtml+'</div>' +
          '</div>' +
        '</div>';
      rmCarouselX = 0;
      rmCarouselLastTs = 0;
    }

    carousel.hidden = false;
    carousel.style.setProperty('display','block','important');
    carousel.style.setProperty('visibility','visible','important');
    carousel.style.setProperty('opacity','1','important');
    carousel.style.setProperty('position','relative','important');
    carousel.style.setProperty('z-index','999','important');
    carousel.style.setProperty('height','auto','important');
    carousel.style.setProperty('min-height','88px','important');
    carousel.style.setProperty('max-height','none','important');
    carousel.style.setProperty('overflow','hidden','important');

    var track = document.getElementById('rmSponsorsTopTrack');
    stopOldCssAnimations(track);
    if(track){
      track.style.willChange = 'transform';
      track.style.transform = 'translate3d(' + (-rmCarouselX) + 'px,0,0)';
    }

    carousel.onmouseenter = function(){ rmCarouselPaused = true; };
    carousel.onmouseleave = function(){ rmCarouselPaused = false; };

    startRealMovement();

    document.querySelectorAll('.sponsors-marquee,.sponsors-track,.sponsors-carousel,.sponsors-slider,#sponsorTicker').forEach(function(el){
      if(el.closest('#rmSponsorsTopCarousel') || el.id === 'rmSponsorsTopCarousel') return;
      el.style.setProperty('display','none','important');
      el.style.setProperty('visibility','hidden','important');
    });
  }

  function keepVisibleOnly(){
    var carousel = document.getElementById('rmSponsorsTopCarousel');
    if(!carousel) return;
    carousel.hidden = false;
    carousel.classList.add('rm-carousel-real-js','rm-carousel-force-visible');
    carousel.style.setProperty('display','block','important');
    carousel.style.setProperty('visibility','visible','important');
    carousel.style.setProperty('opacity','1','important');
    var track = document.getElementById('rmSponsorsTopTrack');
    stopOldCssAnimations(track);
    if(!rmCarouselFrame) startRealMovement();
  }

  // Reemplaza funciones antiguas para que no reconstruyan ni frenen el movimiento.
  window.rmFixCarruselClubNumerosAdmin = keepVisibleOnly;
  window.rmRevisionOkCarruselNumerosAdmin = keepVisibleOnly;
  window.rmCarruselSuaveFinal = keepVisibleOnly;

  if(typeof renderPublic === 'function'){
    var oldRender = renderPublic;
    renderPublic = function(){
      var r = oldRender.apply(this, arguments);
      setTimeout(renderCarouselMoving, 160);
      setTimeout(keepVisibleOnly, 1300);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(renderCarouselMoving, 120);
    setTimeout(keepVisibleOnly, 900);
    setTimeout(keepVisibleOnly, 2200);
  });

  document.addEventListener('rm:supabase-mobile-loaded', function(){
    setTimeout(renderCarouselMoving, 160);
  });

  window.addEventListener('pageshow', function(){
    setTimeout(renderCarouselMoving, 220);
  });

  window.rmCarruselMovimientoReal = renderCarouselMoving;
})();


/* =========================================================
   REVISION FINAL CARRUSEL MOVIMIENTO VISIBLE
   Carrusel con movimiento real y visible incluso con pocos logos.
========================================================= */
(function(){
  if(window.__RM_CARRUSEL_VISIBLE_REVISION_FINAL__) return;
  window.__RM_CARRUSEL_VISIBLE_REVISION_FINAL__ = true;

  var RM_SUPABASE_URL = "https://xzcbdyabzgwfoylipgco.supabase.co";
  var RM_SUPABASE_KEY = "sb_publishable_rFYVLbY_0uJvOLJ0jftWzw_jsmNwVkl";
  var RM_ASSET_SPONSORS = [];
  var rmAnimId = null;
  var rmX = 0;
  var rmLast = 0;
  var rmPaused = false;

  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }

  function main(){
    return document.querySelector('main') || document.querySelector('#app') || document.body;
  }

  function getDataSafe(){
    try{ if(typeof getData === 'function') return getData() || {}; }catch(e){}
    var keys = ['cdrm_final_data_v5_funcional','rmClubData','clubData','cd_rm_data','ricardoMendezData','club_ricardo_mendez_data'];
    for(var i=0;i<keys.length;i++){
      try{
        var raw = localStorage.getItem(keys[i]);
        if(raw) return JSON.parse(raw);
      }catch(e){}
    }
    return window.RM_DATA || window.clubData || {};
  }

  function saveDataSafe(d){
    try{ if(typeof saveData === 'function') saveData(d); }catch(e){}
    try{ localStorage.setItem('cdrm_final_data_v5_funcional', JSON.stringify(d)); }catch(e){}
    try{ window.RM_DATA = d; window.clubData = d; }catch(e){}
  }

  async function restSelect(table){
    try{
      var res = await fetch(RM_SUPABASE_URL.replace(/\/$/,'') + '/rest/v1/' + table + '?select=*', {
        headers: { apikey: RM_SUPABASE_KEY, Authorization: 'Bearer ' + RM_SUPABASE_KEY }
      });
      if(!res.ok) return [];
      var data = await res.json();
      return Array.isArray(data) ? data : [];
    }catch(e){ return []; }
  }

  function urlOf(o){
    return (o && (o.url || o.logo || o.image || o.image_url || o.imageUrl || o.img || o.photo || o.foto || o.src || o.file_url || o.publicUrl || o.public_url)) || '';
  }

  function nameOf(o){
    return (o && (o.name || o.nombre || o.title || o.titulo || o.empresa || o.business)) || 'Auspiciador';
  }

  function validSponsorUrl(u){
    u = String(u || '').toLowerCase();
    if(!u) return false;
    if(u.includes('logo_ricardo_mendez') || u.includes('favicon') || u.includes('escudo')) return false;
    if(u.includes('/news/') || u.includes('/noticias/') || u.includes('noticia')) return false;
    if(u.includes('background') || u.includes('stadium') || u.includes('estadio')) return false;
    return true;
  }

  function sponsorsFromDOM(){
    var arr = [];
    document.querySelectorAll('#sponsorsBottomSection img,#sponsorsFinalGrid img,.sponsor-final-card img,.sponsors-bottom-section img').forEach(function(img){
      var src = img.currentSrc || img.src || img.getAttribute('src') || '';
      if(validSponsorUrl(src)) arr.push({name: img.alt || 'Auspiciador', url: src});
    });
    return arr;
  }

  async function getSponsors(){
    var d = getDataSafe();
    var arr = [];
    if(Array.isArray(d.sponsors)) arr = arr.concat(d.sponsors);
    if(Array.isArray(d.auspiciadores)) arr = arr.concat(d.auspiciadores);
    if(d.settings && Array.isArray(d.settings.sponsors)) arr = arr.concat(d.settings.sponsors);
    if(!arr.length) arr = sponsorsFromDOM();

    if(!arr.length){
      var remote = await restSelect('sponsors');
      if(remote.length){
        arr = remote;
        d.sponsors = remote;
        saveDataSafe(d);
      }
    }

    if(!arr.length && Array.isArray(RM_ASSET_SPONSORS) && RM_ASSET_SPONSORS.length){
      arr = RM_ASSET_SPONSORS;
    }

    var seen = new Set();
    var clean = arr.map(function(s){ return {name:nameOf(s), url:urlOf(s)}; }).filter(function(s){
      if(!validSponsorUrl(s.url)) return false;
      if(seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });

    return clean;
  }

  function itemHtml(sponsors){
    if(!sponsors.length){
      return '<div class="rm-carousel-item-real rm-carousel-empty-real"><span>Auspiciadores pendientes de cargar desde Admin</span></div>';
    }

    // Si hay pocos auspiciadores, repetir visualmente para que el avance se note.
    var base = sponsors.slice();
    while(base.length < 8) base = base.concat(sponsors);

    return base.map(function(s){
      return '<div class="rm-carousel-item-real"><img src="'+esc(s.url)+'" alt="'+esc(s.name)+'" loading="lazy"><span>'+esc(s.name)+'</span></div>';
    }).join('');
  }

  function buildCarousel(sponsors){
    var carousel = document.getElementById('rmSponsorsTopCarousel');
    if(!carousel){
      carousel = document.createElement('section');
      carousel.id = 'rmSponsorsTopCarousel';
      carousel.className = 'section rm-sponsors-top-carousel rm-carousel-real-visible';
    }

    carousel.classList.remove('rm-hide-non-final-sponsors','hide-duplicate-sponsors','rm-sponsor-carousel-hidden','rm-info-cargada-hidden');
    carousel.classList.add('rm-sponsors-top-carousel','rm-carousel-real-visible','rm-carousel-force-visible');

    var signature = sponsors.map(function(s){ return s.url + '|' + s.name; }).join('::') || 'empty';
    if(carousel.dataset.rmRealSignature !== signature){
      carousel.dataset.rmRealSignature = signature;
      var html = itemHtml(sponsors);
      carousel.innerHTML =
        '<div class="rm-sponsors-top-title"><strong>Auspiciadores oficiales</strong><span>Movimiento continuo</span></div>' +
        '<div class="rm-carousel-viewport-real">' +
          '<div id="rmSponsorsTopTrack" class="rm-carousel-track-real">' +
            '<div class="rm-carousel-set-real">'+html+'</div>' +
            '<div class="rm-carousel-set-real">'+html+'</div>' +
          '</div>' +
        '</div>';
      rmX = 0;
      rmLast = 0;
    }

    var enhanced = document.getElementById('rmEnhancedTopSection');
    var history = document.getElementById('historyPrincipalSection') || document.querySelector('.history-principal-section');
    if(enhanced && enhanced.parentElement) enhanced.insertAdjacentElement('afterend', carousel);
    else if(history && history.parentElement) history.parentElement.insertBefore(carousel, history);
    else main().insertBefore(carousel, main().firstChild);

    carousel.hidden = false;
    carousel.style.setProperty('display','block','important');
    carousel.style.setProperty('visibility','visible','important');
    carousel.style.setProperty('opacity','1','important');
    carousel.style.setProperty('position','relative','important');
    carousel.style.setProperty('z-index','999','important');
    carousel.style.setProperty('height','auto','important');
    carousel.style.setProperty('min-height','88px','important');
    carousel.style.setProperty('max-height','none','important');
    carousel.style.setProperty('overflow','hidden','important');

    carousel.onmouseenter = function(){ rmPaused = true; };
    carousel.onmouseleave = function(){ rmPaused = false; };

    return carousel;
  }

  function stopOldAnimations(){
    document.querySelectorAll('#rmSponsorsTopTrack,.rm-sponsors-top-track,.rm-sponsors-top-track-smooth').forEach(function(t){
      t.style.animation = 'none';
      t.style.transition = 'none';
    });
  }

  function startMove(){
    var track = document.getElementById('rmSponsorsTopTrack');
    var set = track ? track.querySelector('.rm-carousel-set-real') : null;
    if(!track || !set) return;

    stopOldAnimations();

    if(rmAnimId) cancelAnimationFrame(rmAnimId);
    rmAnimId = null;
    rmLast = 0;

    function loop(ts){
      if(!rmLast) rmLast = ts;
      var dt = Math.min(50, ts - rmLast);
      rmLast = ts;

      var setWidth = set.scrollWidth;
      if(setWidth > 20 && !rmPaused){
        rmX += dt * 0.070; // velocidad visible
        if(rmX >= setWidth) rmX -= setWidth;
        track.style.transform = 'translate3d(' + (-rmX) + 'px,0,0)';
      }

      rmAnimId = requestAnimationFrame(loop);
    }

    rmAnimId = requestAnimationFrame(loop);
  }

  async function renderMovingCarousel(){
    var sponsors = await getSponsors();
    buildCarousel(sponsors);
    startMove();

    // Ocultar carruseles antiguos duplicados.
    document.querySelectorAll('.sponsors-marquee,.sponsors-track,.sponsors-carousel,.sponsors-slider,#sponsorTicker').forEach(function(el){
      if(el.closest('#rmSponsorsTopCarousel') || el.id === 'rmSponsorsTopCarousel') return;
      el.style.setProperty('display','none','important');
      el.style.setProperty('visibility','hidden','important');
    });
  }

  function keepMoving(){
    var carousel = document.getElementById('rmSponsorsTopCarousel');
    var track = document.getElementById('rmSponsorsTopTrack');
    if(carousel){
      carousel.hidden = false;
      carousel.classList.add('rm-carousel-real-visible','rm-carousel-force-visible');
      carousel.style.setProperty('display','block','important');
      carousel.style.setProperty('visibility','visible','important');
      carousel.style.setProperty('opacity','1','important');
    }
    if(track){
      track.style.animation = 'none';
      track.style.transition = 'none';
    }
    if(!rmAnimId) startMove();
  }

  // Anular funciones viejas para que no frenen o reconstruyan el carrusel.
  window.rmFixCarruselClubNumerosAdmin = keepMoving;
  window.rmRevisionOkCarruselNumerosAdmin = keepMoving;
  window.rmCarruselSuaveFinal = keepMoving;
  window.rmCarruselMovimientoReal = renderMovingCarousel;

  if(typeof renderPublic === 'function'){
    var oldRender = renderPublic;
    renderPublic = function(){
      var r = oldRender.apply(this, arguments);
      setTimeout(renderMovingCarousel, 160);
      setTimeout(keepMoving, 1000);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(renderMovingCarousel, 120);
    setTimeout(keepMoving, 900);
    setTimeout(keepMoving, 2000);
    setTimeout(keepMoving, 4000);
  });

  document.addEventListener('rm:supabase-mobile-loaded', function(){
    setTimeout(renderMovingCarousel, 180);
  });

  window.addEventListener('pageshow', function(){
    setTimeout(renderMovingCarousel, 220);
  });

  window.rmCarruselVisibleRevisionFinal = renderMovingCarousel;
})();


/* =========================================================
   CARRUSEL DEFINITIVO CON MOVIMIENTO CSS CONTINUO
   Independiente del carrusel anterior para que no lo frenen.
========================================================= */
(function(){
  if(window.__RM_CARRUSEL_DEFINITIVO_MOVIENDO__) return;
  window.__RM_CARRUSEL_DEFINITIVO_MOVIENDO__ = true;

  var RM_SUPABASE_URL = "https://xzcbdyabzgwfoylipgco.supabase.co";
  var RM_SUPABASE_KEY = "sb_publishable_rFYVLbY_0uJvOLJ0jftWzw_jsmNwVkl";

  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }

  function main(){
    return document.querySelector('main') || document.querySelector('#app') || document.body;
  }

  function getDataSafe(){
    try{ if(typeof getData === 'function') return getData() || {}; }catch(e){}
    var keys = ['cdrm_final_data_v5_funcional','rmClubData','clubData','cd_rm_data','ricardoMendezData','club_ricardo_mendez_data'];
    for(var i=0;i<keys.length;i++){
      try{
        var raw = localStorage.getItem(keys[i]);
        if(raw) return JSON.parse(raw);
      }catch(e){}
    }
    return window.RM_DATA || window.clubData || {};
  }

  async function restSelect(table){
    try{
      var res = await fetch(RM_SUPABASE_URL.replace(/\/$/,'') + '/rest/v1/' + table + '?select=*', {
        headers: { apikey: RM_SUPABASE_KEY, Authorization: 'Bearer ' + RM_SUPABASE_KEY }
      });
      if(!res.ok) return [];
      var data = await res.json();
      return Array.isArray(data) ? data : [];
    }catch(e){ return []; }
  }

  function urlOf(o){
    return (o && (o.url || o.logo || o.image || o.image_url || o.imageUrl || o.img || o.photo || o.foto || o.src || o.file_url || o.publicUrl || o.public_url)) || '';
  }

  function nameOf(o){
    return (o && (o.name || o.nombre || o.title || o.titulo || o.empresa || o.business)) || 'Auspiciador';
  }

  function validUrl(u){
    u = String(u || '').toLowerCase();
    if(!u) return false;
    if(u.includes('logo_ricardo_mendez') || u.includes('favicon') || u.includes('escudo')) return false;
    if(u.includes('/news/') || u.includes('/noticias/') || u.includes('noticia')) return false;
    if(u.includes('background') || u.includes('stadium') || u.includes('estadio')) return false;
    return true;
  }

  function sponsorsFromDOM(){
    var arr = [];
    document.querySelectorAll('#sponsorsBottomSection img,#sponsorsFinalGrid img,.sponsor-final-card img,.sponsors-bottom-section img').forEach(function(img){
      var src = img.currentSrc || img.src || img.getAttribute('src') || '';
      if(validUrl(src)) arr.push({name: img.alt || 'Auspiciador', url: src});
    });
    return arr;
  }

  async function getSponsors(){
    var d = getDataSafe();
    var arr = [];
    if(Array.isArray(d.sponsors)) arr = arr.concat(d.sponsors);
    if(Array.isArray(d.auspiciadores)) arr = arr.concat(d.auspiciadores);
    if(d.settings && Array.isArray(d.settings.sponsors)) arr = arr.concat(d.settings.sponsors);
    if(!arr.length) arr = sponsorsFromDOM();

    if(!arr.length){
      var remote = await restSelect('sponsors');
      if(remote.length) arr = remote;
    }

    var seen = new Set();
    var clean = arr.map(function(s){ return {name:nameOf(s), url:urlOf(s)}; }).filter(function(s){
      if(!validUrl(s.url)) return false;
      if(seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });

    return clean;
  }

  function makeItems(sponsors){
    if(!sponsors.length){
      return '<div class="rm-def-carousel-item rm-def-carousel-empty"><span>Auspiciadores pendientes de cargar</span></div>' +
             '<div class="rm-def-carousel-item rm-def-carousel-empty"><span>Club Deportivo Ricardo Méndez</span></div>' +
             '<div class="rm-def-carousel-item rm-def-carousel-empty"><span>Más que un club, una familia</span></div>';
    }

    var base = sponsors.slice();
    while(base.length < 10) base = base.concat(sponsors);

    return base.map(function(s){
      return '<div class="rm-def-carousel-item"><img src="'+esc(s.url)+'" alt="'+esc(s.name)+'" loading="lazy"><span>'+esc(s.name)+'</span></div>';
    }).join('');
  }

  async function renderDefinitiveCarousel(){
    var sponsors = await getSponsors();
    var signature = sponsors.map(function(s){ return s.url + '|' + s.name; }).join('::') || 'empty';

    var old = document.getElementById('rmSponsorsTopCarousel');
    if(old){
      old.style.setProperty('display','none','important');
      old.style.setProperty('visibility','hidden','important');
      old.style.setProperty('height','0','important');
      old.style.setProperty('overflow','hidden','important');
    }

    var carousel = document.getElementById('rmSponsorsDefCarousel');
    if(!carousel){
      carousel = document.createElement('section');
      carousel.id = 'rmSponsorsDefCarousel';
      carousel.className = 'section rm-sponsors-def-carousel';
    }

    if(carousel.dataset.signature !== signature){
      carousel.dataset.signature = signature;
      var items = makeItems(sponsors);
      carousel.innerHTML =
        '<div class="rm-def-carousel-head"><strong>Auspiciadores oficiales</strong><span>Movimiento continuo</span></div>' +
        '<div class="rm-def-carousel-window">' +
          '<div class="rm-def-carousel-track">' +
            '<div class="rm-def-carousel-set">'+items+'</div>' +
            '<div class="rm-def-carousel-set">'+items+'</div>' +
          '</div>' +
        '</div>';
    }

    var enhanced = document.getElementById('rmEnhancedTopSection');
    var history = document.getElementById('historyPrincipalSection') || document.querySelector('.history-principal-section');

    if(enhanced && enhanced.parentElement){
      enhanced.insertAdjacentElement('afterend', carousel);
    }else if(history && history.parentElement){
      history.parentElement.insertBefore(carousel, history);
    }else{
      main().insertBefore(carousel, main().firstChild);
    }

    carousel.hidden = false;
    carousel.style.setProperty('display','block','important');
    carousel.style.setProperty('visibility','visible','important');
    carousel.style.setProperty('opacity','1','important');

    var track = carousel.querySelector('.rm-def-carousel-track');
    if(track){
      track.style.animation = 'rmDefCarouselMove 22s linear infinite';
      track.style.animationPlayState = 'running';
      track.style.transform = 'translate3d(0,0,0)';
    }

    document.querySelectorAll('.sponsors-marquee,.sponsors-track,.sponsors-carousel,.sponsors-slider,#sponsorTicker').forEach(function(el){
      if(el.closest('#rmSponsorsDefCarousel')) return;
      el.style.setProperty('display','none','important');
      el.style.setProperty('visibility','hidden','important');
    });
  }

  function keepAlive(){
    var c = document.getElementById('rmSponsorsDefCarousel');
    if(!c) return renderDefinitiveCarousel();
    c.style.setProperty('display','block','important');
    c.style.setProperty('visibility','visible','important');
    c.style.setProperty('opacity','1','important');
    var track = c.querySelector('.rm-def-carousel-track');
    if(track){
      track.style.animation = 'rmDefCarouselMove 22s linear infinite';
      track.style.animationPlayState = 'running';
    }
  }

  // Desactivar funciones viejas del carrusel anterior.
  window.rmFixCarruselClubNumerosAdmin = keepAlive;
  window.rmRevisionOkCarruselNumerosAdmin = keepAlive;
  window.rmCarruselSuaveFinal = keepAlive;
  window.rmCarruselMovimientoReal = keepAlive;
  window.rmCarruselVisibleRevisionFinal = keepAlive;

  if(typeof renderPublic === 'function'){
    var oldRender = renderPublic;
    renderPublic = function(){
      var r = oldRender.apply(this, arguments);
      setTimeout(renderDefinitiveCarousel, 180);
      setTimeout(keepAlive, 1000);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(renderDefinitiveCarousel, 120);
    setTimeout(keepAlive, 900);
    setTimeout(keepAlive, 2200);
    setTimeout(keepAlive, 4200);
  });

  document.addEventListener('rm:supabase-mobile-loaded', function(){
    setTimeout(renderDefinitiveCarousel, 180);
  });

  window.addEventListener('pageshow', function(){
    setTimeout(renderDefinitiveCarousel, 220);
  });

  window.rmCarruselDefinitivoMoviendo = renderDefinitiveCarousel;
})();


/* =========================================================
   FIX MANTENER MOVIMIENTO CONTINUO Y ELIMINAR SOLO CARRUSEL SUPERIOR
   Mantiene: #rmSponsorsDefCarousel / Movimiento Continuo
   Elimina: #rmSponsorsTopCarousel / Carrusel Superior
========================================================= */
(function(){
  if(window.__RM_KEEP_MOVIMIENTO_DELETE_CARRUSEL_SUPERIOR__) return;
  window.__RM_KEEP_MOVIMIENTO_DELETE_CARRUSEL_SUPERIOR__ = true;

  function forceShowMovimientoContinuo(){
    var good = document.getElementById('rmSponsorsDefCarousel') || document.querySelector('.rm-sponsors-def-carousel');
    if(!good) return;

    good.classList.remove('rm-carrusel-superior-eliminado');
    good.hidden = false;
    good.style.setProperty('display','block','important');
    good.style.setProperty('visibility','visible','important');
    good.style.setProperty('opacity','1','important');
    good.style.setProperty('height','auto','important');
    good.style.setProperty('min-height','90px','important');
    good.style.setProperty('max-height','none','important');
    good.style.setProperty('overflow','hidden','important');
    good.style.setProperty('pointer-events','auto','important');

    var track = good.querySelector('.rm-def-carousel-track');
    if(track){
      track.style.setProperty('animation','rmDefCarouselMove 22s linear infinite','important');
      track.style.setProperty('animation-play-state','running','important');
    }
  }

  function hideCarruselSuperior(){
    // Este es el carrusel de abajo que en la captura dice "Carrusel Superior".
    document.querySelectorAll('#rmSponsorsTopCarousel,.rm-sponsors-top-carousel').forEach(function(el){
      el.classList.add('rm-carrusel-superior-eliminado');
      el.hidden = true;
      el.style.setProperty('display','none','important');
      el.style.setProperty('visibility','hidden','important');
      el.style.setProperty('opacity','0','important');
      el.style.setProperty('height','0','important');
      el.style.setProperty('min-height','0','important');
      el.style.setProperty('max-height','0','important');
      el.style.setProperty('margin','0','important');
      el.style.setProperty('padding','0','important');
      el.style.setProperty('overflow','hidden','important');
      el.style.setProperty('pointer-events','none','important');
    });

    // Por si el carrusel viejo no trae ID, se elimina por texto exacto "Carrusel Superior",
    // pero NO se toca el que dice "Movimiento Continuo".
    document.querySelectorAll('section,div,article').forEach(function(el){
      if(el.closest('#rmSponsorsDefCarousel') || el.id === 'rmSponsorsDefCarousel') return;
      if(el.closest('#sponsorsBottomSection') || el.id === 'sponsorsBottomSection') return;

      var t = String(el.textContent || '').toLowerCase().replace(/\s+/g,' ');
      if(t.includes('carrusel superior') && t.includes('auspiciadores oficiales') && !t.includes('movimiento continuo')){
        el.classList.add('rm-carrusel-superior-eliminado');
        el.hidden = true;
        el.style.setProperty('display','none','important');
        el.style.setProperty('visibility','hidden','important');
        el.style.setProperty('opacity','0','important');
        el.style.setProperty('height','0','important');
        el.style.setProperty('min-height','0','important');
        el.style.setProperty('max-height','0','important');
        el.style.setProperty('margin','0','important');
        el.style.setProperty('padding','0','important');
        el.style.setProperty('overflow','hidden','important');
        el.style.setProperty('pointer-events','none','important');
      }
    });

    forceShowMovimientoContinuo();

    // Mantener auspiciadores finales visibles.
    var bottom = document.getElementById('sponsorsBottomSection') || document.querySelector('.sponsors-bottom-section');
    if(bottom){
      bottom.hidden = false;
      bottom.style.setProperty('display','block','important');
      bottom.style.setProperty('visibility','visible','important');
      bottom.style.setProperty('opacity','1','important');
      bottom.style.setProperty('height','auto','important');
      bottom.style.setProperty('max-height','none','important');
      bottom.style.setProperty('overflow','visible','important');
    }
  }

  // Anular solo las funciones que podrían volver a crear el carrusel viejo.
  window.rmFixCarruselClubNumerosAdmin = hideCarruselSuperior;
  window.rmRevisionOkCarruselNumerosAdmin = hideCarruselSuperior;
  window.rmCarruselSuaveFinal = hideCarruselSuperior;
  window.rmCarruselMovimientoReal = hideCarruselSuperior;
  window.rmCarruselVisibleRevisionFinal = hideCarruselSuperior;

  // No anulamos rmCarruselDefinitivoMoviendo porque ese es el bueno: Movimiento Continuo.

  if(typeof renderPublic === 'function'){
    var oldRender = renderPublic;
    renderPublic = function(){
      var r = oldRender.apply(this, arguments);
      setTimeout(hideCarruselSuperior, 80);
      setTimeout(hideCarruselSuperior, 900);
      setTimeout(forceShowMovimientoContinuo, 1100);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(hideCarruselSuperior, 80);
    setTimeout(hideCarruselSuperior, 700);
    setTimeout(hideCarruselSuperior, 1600);
    setTimeout(forceShowMovimientoContinuo, 2000);
    setTimeout(hideCarruselSuperior, 3500);

    try{
      var timer = null;
      var obs = new MutationObserver(function(){
        clearTimeout(timer);
        timer = setTimeout(hideCarruselSuperior, 140);
      });
      obs.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['style','class','hidden']});
    }catch(e){}
  });

  document.addEventListener('rm:supabase-mobile-loaded', function(){
    setTimeout(hideCarruselSuperior, 120);
    setTimeout(forceShowMovimientoContinuo, 500);
  });

  window.addEventListener('pageshow', function(){
    setTimeout(hideCarruselSuperior, 150);
    setTimeout(forceShowMovimientoContinuo, 500);
  });

  window.rmEliminarSoloCarruselSuperior = hideCarruselSuperior;
})();


/* === RM NOTICIAS DESPLEGABLES + GALERIA POR SERIES === */
(function(){
 if(window.__RM_NEWS_GALLERY_FOLDERS__)return; window.__RM_NEWS_GALLERY_FOLDERS__=true;
 const SB_URL="https://xzcbdyabzgwfoylipgco.supabase.co", SB_KEY="sb_publishable_rFYVLbY_0uJvOLJ0jftWzw_jsmNwVkl", SERIES=["Peques", "Segunda Infantil", "Primera Infantil", "Juveniles", "Serie Oro", "Super Senior", "Senior", "Segunda Adultos", "Primera Adultos", "Platinos", "Honor", "General"], BUCKET='club-assets';
 const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const main=()=>document.querySelector('main')||document.querySelector('#app')||document.body;
 function data(){try{if(typeof getData==='function')return getData()||{}}catch(e){};for(const k of ['cdrm_final_data_v5_funcional','rmClubData','clubData','cd_rm_data','ricardoMendezData','club_ricardo_mendez_data']){try{let r=localStorage.getItem(k);if(r)return JSON.parse(r)}catch(e){}}return window.RM_DATA||window.clubData||{}}
 function save(d){try{if(typeof saveData==='function')saveData(d)}catch(e){};for(const k of ['cdrm_final_data_v5_funcional','rmClubData','clubData','cd_rm_data','ricardoMendezData','club_ricardo_mendez_data']){try{localStorage.setItem(k,JSON.stringify(d))}catch(e){}}window.RM_DATA=d;window.clubData=d}
 function client(){try{if(typeof initSB==='function')initSB()}catch(e){};if(window.supabaseClient?.from)return window.supabaseClient;if(window.sb?.from)return window.sb;if(window.supabase?.createClient){window.supabaseClient=window.supabase.createClient(SB_URL,SB_KEY);window.sb=window.supabaseClient;return window.sb}return null}
 async function rest(table){try{let r=await fetch(SB_URL.replace(/\/$/,'')+'/rest/v1/'+table+'?select=*',{headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY}});if(!r.ok)return[];let j=await r.json();return Array.isArray(j)?j:[]}catch(e){return[]}}
 async function insert(table,payload){try{let r=await fetch(SB_URL.replace(/\/$/,'')+'/rest/v1/'+table,{method:'POST',headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(payload)});if(!r.ok)return null;let j=await r.json();return Array.isArray(j)?j[0]:j}catch(e){return null}}
 async function upload(file,serie){let c=client(); if(!file||!c?.storage)return''; let safe=(file.name||'archivo').replace(/[^a-zA-Z0-9._-]/g,'_'); let path='gallery/'+String(serie||'general').replace(/\s+/g,'_').toLowerCase()+'/'+Date.now()+'_'+safe; try{let up=await c.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false}); if(up.error)return''; let pub=c.storage.from(BUCKET).getPublicUrl(path); return pub?.data?.publicUrl||''}catch(e){return''}}
 const urlOf=o=>o?.url||o?.image||o?.image_url||o?.imageUrl||o?.src||o?.file_url||o?.publicUrl||o?.public_url||o?.video||o?.video_url||'';
 const titleOf=(o,f='Galería')=>o?.title||o?.titulo||o?.name||o?.nombre||o?.descripcion||o?.description||f;
 const serieOf=o=>o?.serie||o?.series||o?.category||o?.categoria||o?.folder||o?.carpeta||'General';
 function typeOf(o){let u=urlOf(o).toLowerCase(),t=String(o?.type||o?.tipo||'').toLowerCase(); return t.includes('video')||/\.mp4|\.webm|\.mov|youtube|youtu\.be/.test(u)?'video':'photo'}
 function logo(){let img=document.querySelector('img[src*="logo_ricardo_mendez"],.club-logo img,.logo img');return img?.currentSrc||img?.src||'logo_ricardo_mendez.png'}
 async function newsData(){let d=data(); if(Array.isArray(d.news)&&d.news.length)return d.news; let r=await rest('news'); if(r.length){d.news=r;save(d)} return r}
 async function galData(){let d=data(); if(Array.isArray(d.gallery)&&d.gallery.length)return d.gallery; let r=await rest('gallery'); if(r.length){d.gallery=r;save(d)} return r}
 async function renderNews(){
  let news=await newsData(), old=document.getElementById('newsGrid')||document.querySelector('.news-grid,.noticias-grid'), oldSec=old?.closest('section,.section')||old?.parentElement;
  let sec=document.getElementById('rmNewsAccordionSection')||document.createElement('section'); sec.id='rmNewsAccordionSection'; sec.className='section rm-news-accordion-section';
  sec.innerHTML='<div class="rm-accordion-head"><div><h2>Noticias</h2><p>Información oficial del club</p></div><button type="button" id="rmToggleNewsBtn" class="rm-toggle-news-btn" aria-expanded="false"><span>+</span> Ver noticias</button></div><div id="rmNewsAccordionBody" class="rm-news-accordion-body" hidden><div class="rm-news-accordion-grid"></div></div>';
  let grid=sec.querySelector('.rm-news-accordion-grid');
  grid.innerHTML=news.length?news.map(n=>{let im=urlOf(n),ti=titleOf(n,'Noticia'),tx=n.text||n.descripcion||n.description||n.body||n.content||'';return '<article class="rm-news-accordion-card">'+(im?'<img src="'+esc(im)+'" alt="'+esc(ti)+'" loading="lazy">':'<div class="rm-news-no-img">RM</div>')+'<div class="rm-news-text"><h3>'+esc(ti)+'</h3><p>'+esc(tx)+'</p></div></article>'}).join(''):'<div class="rm-empty-box">Aún no hay noticias cargadas.</div>';
  if(oldSec&&oldSec!==sec&&oldSec.parentElement){oldSec.parentElement.insertBefore(sec,oldSec); oldSec.classList.add('rm-old-news-hidden'); oldSec.style.setProperty('display','none','important')} else if(!sec.parentElement){let h=document.getElementById('historyPrincipalSection')||document.querySelector('.history-principal-section'); h?.parentElement?h.parentElement.insertBefore(sec,h):main().appendChild(sec)}
  let btn=sec.querySelector('#rmToggleNewsBtn'), body=sec.querySelector('#rmNewsAccordionBody');
  btn.onclick=()=>{let open=!body.hidden; body.hidden=open; btn.setAttribute('aria-expanded',String(!open)); btn.innerHTML=open?'<span>+</span> Ver noticias':'<span>−</span> Ocultar noticias'; sec.classList.toggle('open',!open)};
 }
 function groups(items){let g={};SERIES.forEach(s=>g[s]=[]);items.forEach(it=>{let s=serieOf(it); if(!g[s])g[s]=[]; g[s].push(it)});return g}
 async function renderFolders(){
  let gal=await galData(), old=document.getElementById('galleryGrid')||document.querySelector('.gallery-grid,.galeria-grid,.photos-grid,.photo-grid'), oldSec=old?.closest('section,.section')||old?.parentElement, g=groups(gal), sec=document.getElementById('rmGalleryFoldersSection')||document.createElement('section');
  sec.id='rmGalleryFoldersSection'; sec.className='section rm-gallery-folders-section'; sec.innerHTML='<div class="section-head rm-gallery-folder-head"><h2>Fotos y videos por serie</h2><p>Carpetas ordenadas con el logo del club</p></div><div id="rmGalleryFolderGrid" class="rm-gallery-folder-grid"></div><div id="rmGalleryFolderContent" class="rm-gallery-folder-content" hidden></div>';
  let fg=sec.querySelector('#rmGalleryFolderGrid'), cont=sec.querySelector('#rmGalleryFolderContent'), lg=logo();
  fg.innerHTML=SERIES.map(s=>'<button type="button" class="rm-serie-folder" data-serie="'+esc(s)+'"><img src="'+esc(lg)+'" alt="Logo Ricardo Méndez"><strong>'+esc(s)+'</strong><span>'+((g[s]||[]).length)+' archivo'+(((g[s]||[]).length)==1?'':'s')+'</span></button>').join('');
  fg.querySelectorAll('.rm-serie-folder').forEach(b=>b.onclick=()=>{let s=b.dataset.serie, arr=g[s]||[]; fg.hidden=true; cont.hidden=false; cont.innerHTML='<div class="rm-folder-open-head"><button type="button" id="rmBackFoldersBtn">← Volver a carpetas</button><h3>'+esc(s)+'</h3></div><div class="rm-folder-media-grid">'+(arr.length?arr.map(it=>{let u=urlOf(it),t=titleOf(it,s); if(typeOf(it)==='video')return '<article class="rm-folder-media-card">'+(u.includes('youtube')||u.includes('youtu.be')?'<a href="'+esc(u)+'" target="_blank">▶ Ver video</a>':'<video src="'+esc(u)+'" controls></video>')+'<h4>'+esc(t)+'</h4></article>'; return '<article class="rm-folder-media-card"><img src="'+esc(u)+'" alt="'+esc(t)+'" loading="lazy"><h4>'+esc(t)+'</h4></article>'}).join(''):'<div class="rm-empty-box">Carpeta sin fotos ni videos todavía.</div>')+'</div>'; cont.querySelector('#rmBackFoldersBtn').onclick=()=>{cont.hidden=true;fg.hidden=false}});
  if(oldSec&&oldSec!==sec&&oldSec.parentElement){oldSec.parentElement.insertBefore(sec,oldSec); oldSec.classList.add('rm-old-gallery-hidden'); oldSec.style.setProperty('display','none','important')} else if(!sec.parentElement)main().appendChild(sec);
 }
 function adminPanel(){
  if(!/admin/i.test(location.pathname)&&!document.querySelector('.admin,.admin-panel,#adminPanel'))return; if(document.getElementById('rmGallerySeriesAdmin'))return;
  let box=document.createElement('section'); box.id='rmGallerySeriesAdmin'; box.className='admin-card rm-gallery-series-admin';
  box.innerHTML='<h2>Galería por series</h2><p>Asigna fotos/videos a una serie o agrega un nuevo archivo para que aparezca en carpetas.</p><div class="rm-admin-add-gallery"><input id="rmGalTitle" placeholder="Título foto/video"><select id="rmGalSerie">'+SERIES.map(s=>'<option>'+esc(s)+'</option>').join('')+'</select><select id="rmGalType"><option value="photo">Foto</option><option value="video">Video</option></select><input id="rmGalUrl" placeholder="URL imagen/video o subir archivo"><input id="rmGalFile" type="file" accept="image/*,video/*"><button type="button" id="rmAddGalleryBySerie">Agregar a carpeta</button></div><div id="rmGallerySeriesRows" class="rm-gallery-series-rows"></div><button type="button" id="rmSaveGallerySeries">Guardar cambios de series</button>';
  (document.querySelector('main')||document.body).appendChild(box);
  function rows(){let d=data(), arr=Array.isArray(d.gallery)?d.gallery:[], h=document.getElementById('rmGallerySeriesRows'); h.innerHTML=arr.map((it,i)=>'<div class="rm-gallery-series-row" data-idx="'+i+'"><span class="rm-mini-preview">'+(urlOf(it)?'<img src="'+esc(urlOf(it))+'">':'RM')+'</span><input class="rm-row-title" value="'+esc(titleOf(it,'Galería'))+'" placeholder="Título"><select class="rm-row-serie">'+SERIES.map(s=>'<option '+(s===serieOf(it)?'selected':'')+'>'+esc(s)+'</option>').join('')+'</select><button type="button" class="rmDeleteGalleryItem">Eliminar</button></div>').join(''); h.querySelectorAll('.rmDeleteGalleryItem').forEach(btn=>btn.onclick=()=>btn.closest('.rm-gallery-series-row').remove())}
  document.getElementById('rmAddGalleryBySerie').onclick=async()=>{let title=document.getElementById('rmGalTitle').value.trim(), serie=document.getElementById('rmGalSerie').value, type=document.getElementById('rmGalType').value, u=document.getElementById('rmGalUrl').value.trim(), file=document.getElementById('rmGalFile').files[0]; if(file){let up=await upload(file,serie); if(up)u=up} if(!u){alert('Debes colocar una URL o subir un archivo.');return} let d=data(); d.gallery=Array.isArray(d.gallery)?d.gallery:[]; let it={title:title||serie,titulo:title||serie,serie:serie,series:serie,type:type,tipo:type,url:u,image:u}; d.gallery.push(it); save(d); try{await insert('gallery',it)}catch(e){}; try{if(typeof pushCloud==='function')await pushCloud()}catch(e){}; rows(); alert('Archivo agregado a '+serie)};
  document.getElementById('rmSaveGallerySeries').onclick=async()=>{let d=data(), old=Array.isArray(d.gallery)?d.gallery:[], upd=[]; document.querySelectorAll('#rmGallerySeriesRows .rm-gallery-series-row').forEach(row=>{let it=old[Number(row.dataset.idx)]||{}, ti=row.querySelector('.rm-row-title').value.trim(), se=row.querySelector('.rm-row-serie').value; it.title=ti||it.title||se; it.titulo=it.title; it.serie=se; it.series=se; upd.push(it)}); d.gallery=upd; save(d); try{if(typeof pushCloud==='function')await pushCloud()}catch(e){}; alert('Series de galería guardadas.')};
  rows();
 }
 async function run(){await renderNews(); await renderFolders(); adminPanel()}
 if(typeof renderPublic==='function'){let old=renderPublic; renderPublic=function(){let r=old.apply(this,arguments); setTimeout(run,160); setTimeout(run,1400); return r}}
 document.addEventListener('DOMContentLoaded',()=>{setTimeout(run,160);setTimeout(run,1400);setTimeout(run,3200)});
 document.addEventListener('rm:supabase-mobile-loaded',()=>setTimeout(run,200));
 window.addEventListener('pageshow',()=>setTimeout(run,260));
 window.rmNoticiasGaleriaSeries=run;
})();


/* =========================================================
   FECHA 8: TABLAS REALES + NOTICIAS VISIBLES
========================================================= */
(function(){
  if(window.__RM_FECHA8_NOTICIAS_FINAL__) return;
  window.__RM_FECHA8_NOTICIAS_FINAL__ = true;

  const SB_URL = "https://xzcbdyabzgwfoylipgco.supabase.co";
  const SB_KEY = "sb_publishable_rFYVLbY_0uJvOLJ0jftWzw_jsmNwVkl";
  const FECHA8 = {"Peques": [["Chacay", 7, 7, 0, 0, 34, 0, 34, 21], ["Barrabases", 7, 5, 0, 2, 16, 3, 13, 15], ["Manzana T.", 7, 5, 0, 2, 16, 9, 7, 15], ["Unión", 7, 4, 0, 3, 8, 19, -11, 12], ["Caupolicán", 8, 3, 1, 4, 10, 29, -19, 10], ["Independiente", 7, 3, 0, 4, 9, 15, -6, 9], ["Estrella", 6, 2, 1, 3, 9, 8, 1, 7], ["R. Méndez", 7, 1, 0, 6, 4, 17, -13, 3], ["Cruz Azul", 6, 0, 0, 6, 0, 6, -6, 0]], "Segunda Infantil": [["Unión", 7, 5, 2, 0, 12, 3, 9, 17], ["Estrella", 6, 5, 1, 0, 10, 3, 7, 16], ["Barrabases", 7, 4, 2, 1, 18, 9, 9, 14], ["R. Méndez", 7, 4, 1, 2, 10, 3, 7, 13], ["Independiente", 7, 3, 2, 2, 10, 8, 2, 11], ["Chacay", 6, 2, 0, 4, 6, 10, -4, 6], ["Caupolicán", 8, 2, 0, 6, 5, 25, -20, 6], ["Manzana T.", 5, 0, 0, 5, 1, 6, -5, 0], ["Cruz Azul", 5, 0, 0, 5, 0, 5, -5, 0]], "Primera Infantil": [["Caupolicán", 8, 7, 1, 0, 26, 4, 22, 22], ["R. Méndez", 7, 5, 1, 1, 27, 7, 20, 16], ["Barrabases", 7, 4, 1, 2, 19, 10, 9, 13], ["Estrella", 6, 3, 3, 0, 24, 8, 16, 12], ["Unión", 7, 4, 0, 3, 27, 19, 8, 12], ["Chacay", 7, 3, 0, 4, 11, 15, -4, 9], ["Independiente", 7, 1, 0, 6, 15, 29, -14, 3], ["Cruz Azul", 6, 1, 0, 5, 8, 27, -19, 3], ["Manzana T.", 7, 0, 0, 7, 2, 40, -38, 0]], "Juveniles": [["R. Méndez", 7, 5, 2, 0, 26, 4, 22, 17], ["Chacay", 7, 5, 1, 1, 19, 9, 10, 16], ["Caupolicán", 8, 5, 1, 2, 17, 13, 4, 16], ["Manzana T.", 7, 4, 2, 1, 20, 10, 10, 14], ["Estrella", 6, 4, 0, 2, 18, 9, 9, 12], ["Unión", 7, 2, 0, 5, 14, 21, -7, 6], ["Cruz Azul", 6, 1, 1, 4, 9, 21, -12, 4], ["Independiente", 7, 1, 1, 5, 9, 38, -29, 4], ["Barrabases", 7, 0, 0, 7, 0, 7, -7, 0]], "Serie de Oro": [["Manzana T.", 7, 7, 0, 0, 21, 2, 19, 21], ["R. Méndez", 7, 5, 2, 0, 9, 3, 6, 17], ["Barrabases", 7, 3, 3, 1, 10, 4, 6, 12], ["Estrella", 6, 3, 2, 1, 10, 7, 3, 11], ["Caupolicán", 8, 3, 2, 3, 12, 16, -4, 11], ["Unión", 7, 3, 0, 4, 3, 14, -11, 9], ["Chacay", 7, 2, 1, 4, 4, 10, -6, 7], ["Cruz Azul", 6, 0, 0, 6, 0, 6, -6, 0], ["Independiente", 7, 0, 0, 7, 0, 7, -7, 0]], "Super Senior": [["Manzana T.", 7, 6, 1, 0, 22, 5, 17, 19], ["Caupolicán", 8, 6, 1, 1, 18, 8, 10, 19], ["R. Méndez", 7, 5, 1, 1, 17, 6, 11, 16], ["Chacay", 7, 4, 0, 3, 10, 7, 3, 12], ["Estrella", 6, 3, 2, 1, 15, 4, 11, 11], ["Cruz Azul", 6, 2, 0, 4, 7, 22, -15, 6], ["Independiente", 7, 1, 2, 4, 8, 21, -13, 5], ["Unión", 7, 0, 1, 6, 3, 17, -14, 1], ["Barrabases", 7, 0, 0, 7, 0, 10, -10, 0]], "Senior 35": [["Caupolicán", 8, 7, 1, 0, 28, 8, 20, 22], ["Manzana T.", 7, 6, 1, 0, 27, 9, 18, 19], ["Independiente", 7, 3, 1, 3, 21, 19, 2, 10], ["Cruz Azul", 6, 3, 1, 2, 10, 8, 2, 10], ["Chacay", 7, 3, 1, 3, 13, 20, -7, 10], ["R. Méndez", 7, 2, 2, 3, 13, 11, 2, 8], ["Estrella", 6, 2, 2, 2, 10, 10, 0, 8], ["Unión", 7, 0, 1, 6, 5, 35, -30, 1], ["Barrabases", 7, 0, 0, 7, 0, 7, -7, 0]], "Serie Damas": [["Chacay", 7, 7, 0, 0, 11, 0, 11, 21], ["Manzana T.", 7, 6, 0, 1, 10, 1, 9, 18], ["Caupolicán", 8, 6, 0, 2, 6, 10, -4, 18], ["Estrella", 2, 0, 0, 2, 0, 2, -2, 0], ["R. Méndez", 2, 0, 0, 2, 0, 2, -2, 0], ["Barrabases", 3, 0, 0, 3, 0, 3, -3, 0], ["Cruz Azul", 3, 0, 0, 3, 0, 3, -3, 0], ["Independiente", 3, 0, 0, 3, 0, 3, -3, 0], ["Unión", 3, 0, 0, 3, 0, 3, -3, 0]], "Serie de Honor": [["Manzana T.", 7, 7, 0, 0, 20, 4, 16, 21], ["R. Méndez", 7, 5, 0, 2, 19, 7, 12, 15], ["Caupolicán", 8, 4, 2, 2, 10, 11, -1, 14], ["Cruz Azul", 6, 4, 1, 1, 10, 6, 4, 13], ["Chacay", 7, 4, 1, 2, 9, 10, -1, 13], ["Estrella", 6, 3, 0, 3, 4, 8, -4, 9], ["Independiente", 6, 1, 0, 5, 3, 15, -12, 3], ["Unión", 6, 0, 0, 6, 1, 8, -7, 0], ["Barrabases", 7, 0, 0, 7, 0, 7, -7, 0]], "Primera Adulta": [["Unión", 7, 6, 0, 1, 17, 5, 12, 18], ["Cruz Azul", 6, 5, 0, 1, 15, 6, 9, 15], ["Manzana T.", 7, 4, 2, 1, 17, 5, 12, 14], ["Barrabases", 7, 3, 0, 4, 9, 10, -1, 9], ["Caupolicán", 7, 2, 1, 4, 8, 16, -8, 7], ["Chacay", 7, 1, 3, 3, 7, 9, -2, 6], ["R. Méndez", 7, 1, 3, 3, 9, 16, -7, 6], ["Estrella", 5, 2, 0, 3, 8, 15, -7, 6], ["Independiente", 7, 0, 3, 4, 8, 16, -8, 3]], "Segunda Adulta": [["Manzana T.", 7, 7, 0, 0, 26, 6, 20, 21], ["Independiente", 7, 5, 1, 1, 15, 8, 7, 16], ["R. Méndez", 7, 4, 1, 2, 8, 5, 3, 13], ["Barrabases", 7, 4, 0, 3, 11, 8, 3, 12], ["Unión", 7, 3, 0, 4, 10, 12, -2, 9], ["Cruz Azul", 6, 2, 1, 3, 11, 13, -2, 7], ["Caupolicán", 7, 2, 0, 5, 9, 21, -12, 6], ["Chacay", 7, 1, 1, 5, 6, 16, -10, 4], ["Estrella", 5, 0, 0, 5, 5, 12, -7, 0]], "Serie Platino": [["Chacay", 7, 4, 3, 0, 12, 8, 4, 15], ["Caupolicán", 7, 4, 3, 0, 9, 5, 4, 15], ["Barrabases", 7, 4, 1, 2, 11, 5, 6, 13], ["Independiente", 7, 3, 3, 1, 8, 6, 2, 12], ["R. Méndez", 7, 3, 3, 1, 8, 7, 1, 12], ["Estrella", 5, 2, 1, 2, 2, 5, -3, 7], ["Cruz Azul", 4, 0, 0, 4, 0, 4, -4, 0], ["Manzana T.", 5, 0, 0, 5, 0, 5, -5, 0], ["Unión", 5, 0, 0, 5, 0, 5, -5, 0]]};

  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function main(){
    return document.querySelector('main') || document.body;
  }
  function currentData(){
    try{ if(typeof getData === 'function') return getData() || {}; }catch(e){}
    for(const key of ['cdrm_final_data_v5_funcional','rmClubData','clubData','cd_rm_data','ricardoMendezData','club_ricardo_mendez_data']){
      try{ const raw = localStorage.getItem(key); if(raw) return JSON.parse(raw); }catch(e){}
    }
    return window.RM_DATA || window.clubData || {};
  }
  async function getNews(){
    const d = currentData();
    if(Array.isArray(d.news) && d.news.length) return d.news;
    try{
      const res = await fetch(SB_URL.replace(/\/$/,'') + '/rest/v1/news?select=*', {
        headers: {apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY}
      });
      if(res.ok){
        const rows = await res.json();
        if(Array.isArray(rows)) return rows;
      }
    }catch(e){}
    return [];
  }
  function newsTitle(n){
    return n.title || n.titulo || n.name || n.nombre || 'Noticia';
  }
  function newsText(n){
    return n.text || n.descripcion || n.description || n.body || n.content || '';
  }
  function newsImage(n){
    return n.image || n.image_url || n.imageUrl || n.url || n.img || n.photo || n.foto || n.src || '';
  }

  function ensureNews(){
    let box = document.getElementById('rmNovedadesFinal');
    if(!box){
      box = document.createElement('div');
      box.id = 'rmNovedadesFinal';
      box.className = 'rm-novedades-final';
    }
    box.innerHTML =
      '<div class="rm-novedades-head">' +
        '<div><span class="rm-novedades-kicker">ACTUALIDAD DEL CLUB</span><h2>Noticias</h2><p>Información oficial de Ricardo Méndez</p></div>' +
        '<button type="button" id="rmNovedadesToggle"><b>+</b> Ver noticias</button>' +
      '</div>' +
      '<div id="rmNovedadesBody" hidden><div id="rmNovedadesGrid" class="rm-novedades-grid"><div class="rm-novedades-loading">Cargando noticias...</div></div></div>';

    const old = document.getElementById('noticias');
    const positions = document.getElementById('posiciones');
    if(old && old.parentElement){
      old.parentElement.insertBefore(box, old);
      old.style.setProperty('display','none','important');
    } else if(positions && positions.parentElement) {
      positions.parentElement.insertBefore(box, positions);
    } else {
      main().appendChild(box);
    }

    const body = box.querySelector('#rmNovedadesBody');
    const button = box.querySelector('#rmNovedadesToggle');
    button.onclick = () => {
      const isOpen = !body.hidden;
      body.hidden = isOpen;
      button.innerHTML = isOpen ? '<b>+</b> Ver noticias' : '<b>−</b> Ocultar noticias';
    };

    getNews().then(rows => {
      const grid = box.querySelector('#rmNovedadesGrid');
      if(!rows.length){
        grid.innerHTML = '<div class="rm-novedades-empty">No hay noticias publicadas todavía. Agrégalas desde el Administrador.</div>';
        return;
      }
      grid.innerHTML = rows.map(n => {
        const title = newsTitle(n), text = newsText(n), image = newsImage(n);
        return '<article class="rm-novedad-card">' +
          (image ? '<img src="'+esc(image)+'" alt="'+esc(title)+'" loading="lazy">' : '<div class="rm-novedad-no-image">RM</div>') +
          '<div><h3>'+esc(title)+'</h3><p>'+esc(text)+'</p></div>' +
        '</article>';
      }).join('');

      const home = document.getElementById('homeNewsPreview');
      if(home){
        home.innerHTML = rows.slice(0,2).map(n => '<div class="rm-home-news-mini"><strong>'+esc(newsTitle(n))+'</strong><span>'+esc(newsText(n)).slice(0,90)+'</span></div>').join('');
      }
    });
  }

  function renderFecha8(){
    let block = document.getElementById('rmFecha8Standings');
    if(!block){
      block = document.createElement('div');
      block.id = 'rmFecha8Standings';
      block.className = 'rm-fecha8-standings';
    }
    const original = document.getElementById('posiciones');
    if(original && original.parentElement){
      original.parentElement.insertBefore(block, original);
      original.style.setProperty('display','none','important');
    } else {
      main().appendChild(block);
    }

    const series = Object.keys(FECHA8);
    block.innerHTML =
      '<div class="rm-fecha8-head">' +
        '<div><span>ANFA 2026</span><h2>Tabla de posiciones · Fecha 8</h2><p>Tablas oficiales cargadas para cada serie.</p></div>' +
        '<select id="rmFecha8SerieSelect">'+series.map(s => '<option value="'+esc(s)+'">'+esc(s)+'</option>').join('')+'</select>' +
      '</div>' +
      '<div class="rm-fecha8-tabs">'+series.map((s,i) => '<button type="button" class="rm-fecha8-tab '+(i===0?'active':'')+'" data-serie="'+esc(s)+'">'+esc(s)+'</button>').join('')+'</div>' +
      '<div class="rm-fecha8-table-wrap"><table class="rm-fecha8-table"><thead><tr><th>Pos</th><th>Equipo</th><th>J</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DF</th><th>PTS</th></tr></thead><tbody id="rmFecha8Rows"></tbody></table></div>';

    const select = block.querySelector('#rmFecha8SerieSelect');
    const rows = block.querySelector('#rmFecha8Rows');

    function showSerie(name){
      const list = FECHA8[name] || [];
      rows.innerHTML = list.map((r,i) => '<tr class="'+(String(r[0]).toLowerCase().includes('méndez')?'rm-club-row':'')+'"><td>'+ (i+1) +'</td><td>'+esc(r[0])+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+r[3]+'</td><td>'+r[4]+'</td><td>'+r[5]+'</td><td>'+r[6]+'</td><td>'+r[7]+'</td><td><strong>'+r[8]+'</strong></td></tr>').join('');
      select.value = name;
      block.querySelectorAll('.rm-fecha8-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.serie === name));
    }
    select.onchange = () => showSerie(select.value);
    block.querySelectorAll('.rm-fecha8-tab').forEach(btn => btn.onclick = () => showSerie(btn.dataset.serie));
    showSerie(series[0]);
    window.RM_FECHA8_STANDINGS = FECHA8;
  }

  function boot(){
    ensureNews();
    renderFecha8();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  [800, 2200, 5000, 9000].forEach(ms => setTimeout(boot, ms));
  window.rmFecha8NoticiasFinal = boot;
})();
