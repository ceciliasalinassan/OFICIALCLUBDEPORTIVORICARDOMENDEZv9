
'use strict';

const DATA_KEY = 'cdrm_final_data_v5_funcional';
const CFG_KEY = 'cdrm_supabase_cfg_v1';
const BUCKET = 'club-assets';
const ADMIN_PASS = 'ADMINRIMEN1932';

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
  appearance:{
    backgroundImage:'',
    blue:'#00c8ff',
    gold:'#f7d36b',
    overlay:35
  },
  nextMatch:{rival:'Por definir',logo:'',date:'',place:'',tournament:'',referee:'',broadcast:''},
  history:{text:'Club Deportivo Ricardo Méndez, institución deportiva de San Carlos fundada el 12 de agosto de 1932. Más que un club, una familia.',currentPresident:''},
  directors:[],
  presidents:[],
  results:[],
  news:[],
  gallery:[],
  fixture_images:[],
  standings:{},
  sponsors:[],
  member_requests:[]
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
  try{ return merge(DEFAULT_DATA, JSON.parse(localStorage.getItem(DATA_KEY) || '{}')); }
  catch(e){ return clone(DEFAULT_DATA); }
}
function saveData(d){ localStorage.setItem(DATA_KEY, JSON.stringify(merge(DEFAULT_DATA,d))); }

function normUrl(u){
  u=String(u||'').trim();
  if(u && !u.startsWith('http') && !u.includes('.supabase.co')) u='https://'+u+'.supabase.co';
  return u.replace(/\/rest\/v1\/?$/,'').replace(/\/$/,'');
}
function getCfg(){try{const c=JSON.parse(localStorage.getItem(CFG_KEY)||'{}');return {url:c.url||PUBLIC_SUPABASE_URL,key:c.key||PUBLIC_SUPABASE_KEY}}catch(e){return {url:PUBLIC_SUPABASE_URL,key:PUBLIC_SUPABASE_KEY}}}
function setCfg(url,key){ localStorage.setItem(CFG_KEY, JSON.stringify({url:normUrl(url), key:String(key||'').trim()})); }
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
function setInline(msg,type='success'){
  if(!location.pathname.includes('admin')) return;
  let el=$('adminInlineConfirm');
  if(!el){
    el=document.createElement('div');
    el.id='adminInlineConfirm';
    el.className='admin-inline-confirm';
    (document.querySelector('#adminPanel')||document.body).prepend(el);
  }
  el.className='admin-inline-confirm '+type;
  el.textContent=(type==='error'?'⚠️ ':'✅ ')+msg;
}
function confirmOk(msg){ toast(msg,'success'); setInline(msg,'success'); }
function confirmError(msg){ toast(msg,'error'); setInline(msg,'error'); }

/* Archivos originales a Storage */
function safeFileName(file){
  const original = file?.name || 'archivo.jpg';
  const ext = (original.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g,'') || 'jpg';
  const base = original.replace(/\.[^.]+$/,'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9_-]+/g,'_')
    .replace(/^_+|_+$/g,'')
    .slice(0,90) || 'archivo';
  return `${Date.now()}_${Math.random().toString(36).slice(2,9)}_${base}.${ext}`;
}
function folderName(folder){
  const map = {news:'news',gallery:'gallery',fixture:'fixture',fixtures:'fixture',media:'media',photos:'gallery',presidents:'presidents',sponsors:'sponsors',logos:'logos',backgrounds:'backgrounds',files:'files'};
  return map[folder] || folder || 'media';
}
async function uploadFile(file, folder='media'){
  if(!file) return '';
  if(!initSB()) throw new Error('Primero conecta Supabase.');
  const path = `${folderName(folder)}/${safeFileName(file)}`;
  const {error} = await supabaseClient.storage.from(BUCKET).upload(path, file, {
    cacheControl:'3600',
    upsert:false,
    contentType:file.type || 'application/octet-stream'
  });
  if(error){
    console.error(error);
    throw new Error('No se pudo subir el archivo a club-assets. Revisa políticas de Storage.');
  }
  const {data} = supabaseClient.storage.from(BUCKET).getPublicUrl(path);
  if(!data || !data.publicUrl) throw new Error('No se pudo obtener URL pública.');
  confirmOk('Archivo cargado correctamente.');
  return data.publicUrl;
}
async function fileToData(file){ return uploadFile(file,'media'); }

/* Supabase */
async function replaceTable(name,rows){
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
  if(!initSB()) throw new Error('Supabase no conectado');
  d=merge(DEFAULT_DATA,d);
  await replaceTable('settings',[
    {key:'settings',value:JSON.stringify(d.settings)},
    {key:'siteConfig',value:JSON.stringify(d.siteConfig)},
    {key:'appearance',value:JSON.stringify(d.appearance)},
    {key:'nextMatch',value:JSON.stringify(d.nextMatch)},
    {key:'history',value:JSON.stringify(d.history)}
  ]);
  await replaceTable('directors',(d.directors||[]).map((x,i)=>({role:x.role||'',name:x.name||'',sort_order:i})));
  await replaceTable('sponsors',(d.sponsors||[]).map((x,i)=>({name:x.name||'',url:x.url||'',sort_order:i})));
  await replaceTable('fixture_images',(d.fixture_images||[]).map((x,i)=>({title:x.title||'',image:x.image||'',sort_order:i})));
  await replaceTable('results',(d.results||[]).map((x,i)=>({date_text:x.date||'',match:x.match||'',score:x.score||'',scorers:x.scorers||'',sort_order:i})));
  await replaceTable('news',(d.news||[]).map((x,i)=>({title:x.title||'',text:x.text||'',date_text:x.date||'',image:x.image||'',sort_order:i})));
  await replaceTable('gallery',(d.gallery||[]).map((x,i)=>({title:x.title||'',type:x.type||'image',url:x.url||'',sort_order:i})));
  await replaceTable('presidents',(d.presidents||[]).map((x,i)=>({name:x.name||'',period:x.period||'',image:x.image||'',sort_order:i})));
  const standings=[];
  Object.entries(d.standings||{}).forEach(([serie,rows])=>(rows||[]).forEach((x,i)=>standings.push({
    serie,team:x.team||'',pj:+x.pj||0,pg:+x.pg||0,pe:+x.pe||0,pp:+x.pp||0,gf:+x.gf||0,gc:+x.gc||0,dg:+x.dg||0,pts:+x.pts||0,sort_order:i
  })));
  await replaceTable('standings',standings);
}
async function pullCloud(){
  if(!initSB()) throw new Error('Supabase no conectado');
  const d=clone(DEFAULT_DATA);
  let res=await supabaseClient.from('settings').select('*');
  if(!res.error && res.data){
    res.data.forEach(r=>{ try{ d[r.key]=JSON.parse(r.value); }catch(e){} });
  }
  res=await supabaseClient.from('directors').select('*').order('sort_order',{ascending:true});
  if(!res.error && res.data) d.directors=res.data.map(x=>({role:x.role,name:x.name}));
  res=await supabaseClient.from('sponsors').select('*').order('sort_order',{ascending:true});
  if(!res.error && res.data) d.sponsors=res.data.map(x=>({name:x.name,url:x.url}));
  res=await supabaseClient.from('fixture_images').select('*').order('sort_order',{ascending:true});
  if(!res.error && res.data) d.fixture_images=res.data.map(x=>({title:x.title,image:x.image}));
  res=await supabaseClient.from('results').select('*').order('sort_order',{ascending:true});
  if(!res.error && res.data) d.results=res.data.map(x=>({date:x.date_text,match:x.match,score:x.score,scorers:x.scorers}));
  res=await supabaseClient.from('news').select('*').order('sort_order',{ascending:true});
  if(!res.error && res.data) d.news=res.data.map(x=>({title:x.title,text:x.text,date:x.date_text,image:x.image}));
  res=await supabaseClient.from('gallery').select('*').order('sort_order',{ascending:true});
  if(!res.error && res.data) d.gallery=res.data.map(x=>({title:x.title,type:x.type,url:x.url}));
  res=await supabaseClient.from('presidents').select('*').order('sort_order',{ascending:true});
  if(!res.error && res.data) d.presidents=res.data.map(x=>({name:x.name,period:x.period,image:x.image}));
  res=await supabaseClient.from('standings').select('*').order('sort_order',{ascending:true});
  if(!res.error && res.data){
    d.standings={};
    res.data.forEach(x=>{
      if(!d.standings[x.serie]) d.standings[x.serie]=[];
      d.standings[x.serie].push({team:x.team,pj:x.pj,pg:x.pg,pe:x.pe,pp:x.pp,gf:x.gf,gc:x.gc,dg:x.dg,pts:x.pts});
    });
  }
  saveData(d);
  return d;
}
async function saveAll(d){
  saveData(d);
  try{
    await pushCloud(d);
    status('Estado: guardado en Supabase.');
    confirmOk('Información guardada correctamente.');
  }catch(e){
    console.warn(e);
    status('Estado: guardado local. '+e.message);
    confirmError('Guardado local. Revisa Supabase.');
  }
  renderAll();
}

/* Apariencia */
function applyAppearance(d){
  d=d||getData();
  const app=d.appearance||{};
  const bg=app.backgroundImage||'';
  const blue=app.blue||d.siteConfig?.blue||'#00c8ff';
  const gold=app.gold||d.siteConfig?.gold||'#f7d36b';
  const overlay=Number(app.overlay ?? 35);
  document.documentElement.style.setProperty('--blue',blue);
  document.documentElement.style.setProperty('--gold',gold);
  document.documentElement.style.setProperty('--gold-soft',gold);
  document.documentElement.style.setProperty('--bg-overlay',overlay/100);
  if(bg){
    document.documentElement.style.setProperty('--custom-bg-image',`url("${bg}")`);
    document.body.classList.add('custom-background-active');
  }else{
    document.documentElement.style.removeProperty('--custom-bg-image');
    document.body.classList.remove('custom-background-active');
  }
}

/* Render público */
function imgTag(url,alt,cls=''){return url?`<img class="${cls}" src="${url}" alt="${alt||''}" loading="lazy">`:''}
function renderSponsorTicker(d){
  const el=$('sponsorTicker'); if(!el) return;
  const list=d.sponsors||[];
  if(!list.length){el.innerHTML='<div class="ticker-empty">CARGA TUS AUSPICIADORES DESDE ADMIN</div>';return;}
  el.innerHTML=[...list,...list].map(s=>`<div class="ticker-sponsor"><div class="ticker-logo-box">${imgTag(s.url,s.name,'ticker-sponsor-img')}</div><span>${s.name||''}</span></div>`).join('');
}
function renderSponsors(d){
  const el=$('sponsorsGrid'); if(!el) return;
  const list=d.sponsors||[];
  el.innerHTML=list.length?list.map(s=>`<article class="sponsor-card"><div class="sponsor-logo-box">${imgTag(s.url,s.name,'sponsor-img')||'<div class="sponsor-fallback">'+(s.name||'Auspiciador')+'</div>'}</div><h3>${s.name||''}</h3></article>`).join(''):'<div class="empty-state">Aún no hay auspiciadores cargados.</div>';
}
function renderPublic(){
  const d=getData();
  applyAppearance(d);
  if($('homeIntro')) $('homeIntro').textContent=d.settings.homeText||'';
  if($('metrics')) $('metrics').innerHTML=`<div class="metric"><span>Socios</span><b>${d.settings.activeMembers||0}</b></div><div class="metric"><span>Series</span><b>${d.settings.series||0}</b></div><div class="metric"><span>Campeonatos</span><b>${d.settings.championships||0}</b></div><div class="metric"><span>Fundado</span><b>1932</b></div>`;
  if($('nextMatchCard')){
    const n=d.nextMatch||{};
    $('nextMatchCard').innerHTML=`<h3 class="featured-title">★ Próximo partido</h3><div class="match-pro-logos"><div class="match-team local-team"><img class="match-logo-img" src="logo_ricardo_mendez.png"><span>Ricardo Méndez</span></div><strong>VS</strong><div class="match-team rival-team">${imgTag(n.logo,n.rival,'match-logo-img')||'<div class="sponsor-fallback">RIVAL</div>'}<span>${n.rival||'Por definir'}</span></div></div><div class="match-info"><h3 class="match-title">Ricardo Méndez vs ${n.rival||'Por definir'}</h3><p>${n.tournament||''}</p><p>${n.date||''}</p><b>${n.place||''}</b></div>`;
  }
  renderSponsorTicker(d); renderSponsors(d);
  if($('newsGrid')) $('newsGrid').innerHTML=(d.news||[]).map(n=>`<article class="news-card">${imgTag(n.image,n.title)}<h3>${n.title||''}</h3><p>${n.text||''}</p></article>`).join('')||'<div class="empty-state">Aún no hay noticias cargadas.</div>';
  if($('galleryGrid')) $('galleryGrid').innerHTML=(d.gallery||[]).map(m=>`<article class="media-card">${m.type==='video'?`<video controls src="${m.url}"></video>`:imgTag(m.url,m.title)}<h3>${m.title||''}</h3></article>`).join('')||'<div class="empty-state">Aún no hay fotos o videos cargados.</div>';
  if($('fixtureGrid')) $('fixtureGrid').innerHTML=(d.fixture_images||[]).map(f=>`<article class="fixture-card">${imgTag(f.image,f.title)}<h3>${f.title||''}</h3></article>`).join('')||'<div class="empty-state">Aún no hay fixture cargado.</div>';
  if($('presidentsGrid')) $('presidentsGrid').innerHTML=(d.presidents||[]).map(p=>`<article class="president-card">${imgTag(p.image,p.name)}<h3>${p.name||''}</h3><p>${p.period||''}</p></article>`).join('')||'<div class="empty-state">Aún no hay presidentes cargados.</div>';
  if($('resultsGrid')) $('resultsGrid').innerHTML=(d.results||[]).map(r=>`<article class="result-card"><h3>${r.match||''}</h3><b>${r.score||''}</b><p>${r.date||''}</p></article>`).join('')||'<div class="empty-state">Aún no hay resultados cargados.</div>';
  if($('historyBox')) $('historyBox').innerHTML=`<h2>Historia</h2><p>${d.history.text||''}</p>`;
  if($('serieSelect')){
    if(!$('serieSelect').dataset.loaded){$('serieSelect').innerHTML=SERIES.map(s=>`<option>${s}</option>`).join('');$('serieSelect').dataset.loaded='1';$('serieSelect').onchange=renderStandings;}
    renderStandings();
  }
}
function renderStandings(){
  const d=getData(), tbody=$('standingsRows'); if(!tbody)return;
  const serie=$('serieSelect')?.value||SERIES[0];
  const rows=(d.standings&&d.standings[serie])||[];
  tbody.innerHTML=rows.map((x,i)=>`<tr><td>${i+1}</td><td>${x.team||''}</td><td>${x.pj||0}</td><td>${x.pg||0}</td><td>${x.pe||0}</td><td>${x.pp||0}</td><td>${x.gf||0}</td><td>${x.gc||0}</td><td>${x.dg||0}</td><td>${x.pts||0}</td></tr>`).join('');
}
function renderAll(){renderPublic();}

/* Admin */
function openAdmin(){
  $('loginPanel')?.classList.add('hidden');
  $('adminPanel')?.classList.remove('hidden');
  try{sessionStorage.setItem('cdrm_admin_ok','1')}catch(e){}
  fillAdmin();
}
function listHTML(arr,label){return (arr||[]).map((x,i)=>`<div class="list-item"><span>${label(x)}</span><button data-del="${i}" type="button">Eliminar</button></div>`).join('')}
function bindDelete(listId,arrName){
  const el=$(listId); if(!el)return;
  el.querySelectorAll('[data-del]').forEach(btn=>btn.onclick=async()=>{const d=getData();d[arrName].splice(+btn.dataset.del,1);await saveAll(d);fillAdmin();});
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
  if($('standingsList')) $('standingsList').innerHTML=Object.entries(d.standings||{}).map(([s,rows])=>`<h4>${s}</h4>`+listHTML(rows,x=>`${x.team||''} - ${x.pts||0} pts`)).join('');
  bindDelete('directorsList','directors'); bindDelete('presidentsList','presidents'); bindDelete('resultsList','results'); bindDelete('newsList','news'); bindDelete('galleryList','gallery'); bindDelete('fixtureList','fixture_images'); bindDelete('sponsorsList','sponsors');
}
function fillAppearanceAdmin(){
  const d=getData(), app=d.appearance||{};
  if($('backgroundUrl')) $('backgroundUrl').value=app.backgroundImage||'';
  if($('appearanceBlue')) $('appearanceBlue').value=app.blue||d.siteConfig.blue||'#00c8ff';
  if($('appearanceGold')) $('appearanceGold').value=app.gold||d.siteConfig.gold||'#f7d36b';
  if($('backgroundOverlay')) $('backgroundOverlay').value=app.overlay??35;
  if($('backgroundOverlayValue')) $('backgroundOverlayValue').textContent=(app.overlay??35)+'%';
  if($('backgroundPreview')) $('backgroundPreview').style.backgroundImage=app.backgroundImage?`url("${app.backgroundImage}")`:'url("estadio_real_publico.jpg")';
}
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
  if($('siteColorBlue')) $('siteColorBlue').value=d.siteConfig.blue||'';
  if($('siteColorGold')) $('siteColorGold').value=d.siteConfig.gold||'';
  if($('matchRival')) $('matchRival').value=d.nextMatch.rival||'';
  if($('matchTournament')) $('matchTournament').value=d.nextMatch.tournament||'';
  if($('matchReferee')) $('matchReferee').value=d.nextMatch.referee||'';
  if($('matchBroadcast')) $('matchBroadcast').value=d.nextMatch.broadcast||'';
  if($('matchDate')) $('matchDate').value=d.nextMatch.date||'';
  if($('matchPlace')) $('matchPlace').value=d.nextMatch.place||'';
  if($('matchLogoUrl')) $('matchLogoUrl').value=d.nextMatch.logo||'';
  if($('historyText')) $('historyText').value=d.history.text||'';
  if($('presidentName')) $('presidentName').value=d.history.currentPresident||'';
  fillAppearanceAdmin(); renderAdminLists();
}
function bindTabs(){
  document.querySelectorAll('.tabs button').forEach(btn=>{
    if(btn.dataset.tabBound)return; btn.dataset.tabBound='1';
    btn.onclick=()=>{document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.tab-content').forEach(t=>t.classList.add('hidden'));$(btn.dataset.tab)?.classList.remove('hidden');};
  });
}
function bindAdmin(){
  if($('loginBtn')&&!$('loginBtn').dataset.bound){$('loginBtn').dataset.bound='1';$('loginBtn').onclick=()=>{(($('adminPassword')?.value||'').trim()===ADMIN_PASS)?openAdmin():confirmError('Clave incorrecta');};}
  $('adminPassword')?.addEventListener('keydown',e=>{if(e.key==='Enter')$('loginBtn')?.click();});
  try{if(sessionStorage.getItem('cdrm_admin_ok')==='1')openAdmin();}catch(e){}
  bindTabs();

  $('saveSupabase')?.addEventListener('click',()=>{setCfg($('supabaseUrl')?.value,$('supabaseKey')?.value);confirmOk('Conexión Supabase guardada.');});
  $('loadCloud')?.addEventListener('click',async()=>{try{await pullCloud();confirmOk('Datos cargados desde Supabase.');renderAll();fillAdmin();}catch(e){confirmError(e.message);}});
  $('saveCloud')?.addEventListener('click',async()=>{try{await pushCloud(getData());confirmOk('Datos subidos a Supabase.');}catch(e){confirmError(e.message);}});
  $('saveGeneral')?.addEventListener('click',async()=>{const d=getData();d.settings.homeTitle=$('homeTitle')?.value||d.settings.homeTitle;d.settings.homeText=$('homeIntroInput')?.value||'';d.settings.activeMembers=$('metricMembers')?.value||'0';d.settings.championships=$('metricTitles')?.value||'0';d.siteConfig.whatsapp=$('siteWhatsapp')?.value||'';d.siteConfig.instagram=$('siteInstagram')?.value||'';d.siteConfig.facebook=$('siteFacebook')?.value||'';d.siteConfig.blue=$('siteColorBlue')?.value||'#00c8ff';d.siteConfig.gold=$('siteColorGold')?.value||'#f7d36b';await saveAll(d);fillAdmin();});
  $('saveMatch')?.addEventListener('click',async()=>{try{const d=getData();let logo=$('matchLogoUrl')?.value||'';const f=$('matchLogoFile')?.files?.[0];if(f)logo=await uploadFile(f,'logos');d.nextMatch={rival:$('matchRival')?.value||'Por definir',tournament:$('matchTournament')?.value||'',referee:$('matchReferee')?.value||'',broadcast:$('matchBroadcast')?.value||'',date:$('matchDate')?.value||'',place:$('matchPlace')?.value||'',logo};await saveAll(d);fillAdmin();}catch(e){confirmError(e.message);}});
  $('saveHistory')?.addEventListener('click',async()=>{const d=getData();d.history.text=$('historyText')?.value||'';d.history.currentPresident=$('presidentName')?.value||'';await saveAll(d);fillAdmin();});
  $('addDirector')?.addEventListener('click',async()=>{const d=getData();d.directors.push({role:$('directorRole')?.value||'',name:$('directorName')?.value||''});await saveAll(d);fillAdmin();});
  $('addPresident')?.addEventListener('click',async()=>{try{const d=getData();let image='';const f=$('presidentPhoto')?.files?.[0];if(f)image=await uploadFile(f,'presidents');d.presidents.unshift({name:$('presidentGalleryName')?.value||'',period:$('presidentPeriod')?.value||'',image});await saveAll(d);fillAdmin();}catch(e){confirmError(e.message);}});
  $('addResult')?.addEventListener('click',async()=>{const d=getData();d.results.unshift({date:$('resultDate')?.value||'',match:$('resultMatch')?.value||'',score:$('resultScore')?.value||''});await saveAll(d);fillAdmin();});
  $('addNews')?.addEventListener('click',async()=>{try{const d=getData();let image='';const f=$('newsImage')?.files?.[0];if(f)image=await uploadFile(f,'news');d.news.unshift({title:$('newsTitle')?.value||'',text:$('newsText')?.value||'',date:new Date().toLocaleDateString('es-CL'),image});await saveAll(d);fillAdmin();}catch(e){confirmError(e.message);}});
  $('addMedia')?.addEventListener('click',async()=>{try{const d=getData();let url=$('mediaUrl')?.value||'';const f=$('mediaFile')?.files?.[0];let type='image';if(f){url=await uploadFile(f,'gallery');type=f.type&&f.type.startsWith('video')?'video':'image';}d.gallery.unshift({title:$('mediaTitle')?.value||'',type,url});await saveAll(d);fillAdmin();}catch(e){confirmError(e.message);}});
  $('addFixture')?.addEventListener('click',async()=>{try{const d=getData();let image='';const f=$('fixtureImage')?.files?.[0];if(f)image=await uploadFile(f,'fixture');d.fixture_images.unshift({title:$('fixtureTitle')?.value||'',image});await saveAll(d);fillAdmin();}catch(e){confirmError(e.message);}});
  $('addStanding')?.addEventListener('click',async()=>{const d=getData();const serie=$('standingSerie')?.value||SERIES[0];if(!d.standings[serie])d.standings[serie]=[];const gf=+$('gf')?.value||0,gc=+$('gc')?.value||0;d.standings[serie].push({team:$('teamName')?.value||'',pj:+$('pj')?.value||0,pg:+$('pg')?.value||0,pe:+$('pe')?.value||0,pp:+$('pp')?.value||0,gf,gc,dg:gf-gc,pts:+$('pts')?.value||0});await saveAll(d);fillAdmin();});
  $('addSponsor')?.addEventListener('click',async()=>{try{const d=getData();let url=$('sponsorUrl')?.value||'';const f=($('sponsorFile')||$('sponsorLogo'))?.files?.[0];if(f)url=await uploadFile(f,'sponsors');d.sponsors.push({name:$('sponsorName')?.value||'',url});await saveAll(d);fillAdmin();}catch(e){confirmError(e.message);}});
  $('saveBackground')?.addEventListener('click',async()=>{try{const d=getData();let url=$('backgroundUrl')?.value||'';const f=$('backgroundFile')?.files?.[0];if(f)url=await uploadFile(f,'backgrounds');d.appearance.backgroundImage=url;await saveAll(d);fillAdmin();}catch(e){confirmError(e.message);}});
  $('restoreBackground')?.addEventListener('click',async()=>{const d=getData();d.appearance.backgroundImage='';await saveAll(d);fillAdmin();});
  $('saveAppearanceColors')?.addEventListener('click',async()=>{const d=getData();d.appearance.blue=$('appearanceBlue')?.value||'#00c8ff';d.appearance.gold=$('appearanceGold')?.value||'#f7d36b';d.appearance.overlay=$('backgroundOverlay')?.value||35;d.siteConfig.blue=d.appearance.blue;d.siteConfig.gold=d.appearance.gold;await saveAll(d);fillAdmin();});
  $('backgroundOverlay')?.addEventListener('input',()=>{if($('backgroundOverlayValue'))$('backgroundOverlayValue').textContent=$('backgroundOverlay').value+'%';});
  document.querySelectorAll('.themePreset').forEach(btn=>{if(btn.dataset.themeBound)return;btn.dataset.themeBound='1';btn.onclick=async()=>{const d=getData();d.appearance=d.appearance||{};if(btn.dataset.theme==='nike'){d.appearance.blue='#0077ff';d.appearance.gold='#ffffff';d.appearance.overlay=42;}else if(btn.dataset.theme==='adidas'){d.appearance.blue='#00c8ff';d.appearance.gold='#f7d36b';d.appearance.overlay=38;}else{d.appearance.blue='#00bfff';d.appearance.gold='#f3c84b';d.appearance.overlay=35;}await saveAll(d);fillAdmin();};});
}

/* Form socios */
function bindSocioForm(){
  const form=$('socioForm'); if(!form||form.dataset.bound)return; form.dataset.bound='1';
  form.onsubmit=async e=>{e.preventDefault();const d=getData();d.member_requests.push({nombre:$('socioNombre')?.value||'',rut:$('socioRut')?.value||'',telefono:$('socioTelefono')?.value||'',correo:$('socioCorreo')?.value||'',serie:$('socioSerie')?.value||'',fecha:new Date().toISOString()});await saveAll(d);alert('Solicitud enviada correctamente.');form.reset();};
}

/* Lightbox */
function bindLightbox(){
  document.querySelectorAll('#newsGrid img,#galleryGrid img,#fixtureGrid img,#presidentsGrid img').forEach(img=>{
    if(img.dataset.lb)return; img.dataset.lb='1'; img.style.cursor='pointer';
    img.onclick=()=>{const div=document.createElement('div');div.className='image-lightbox-final show';div.innerHTML=`<button class="lightbox-final-close">×</button><img src="${img.src}">`;document.body.appendChild(div);div.onclick=e=>{if(e.target===div||e.target.className==='lightbox-final-close')div.remove();};};
  });
}

/* RM IA */
function bindRmIa(){
  const toggle=$('rmIaToggle'),panel=$('rmIaPanel'),form=$('rmIaForm'),input=$('rmIaInput'); if(!toggle||!panel||!form||toggle.dataset.bound)return; toggle.dataset.bound='1';
  toggle.onclick=()=>panel.classList.toggle('show'); $('rmIaClose')?.addEventListener('click',()=>panel.classList.remove('show'));
  const add=(t,w='bot')=>{const box=$('rmIaMessages');if(!box)return;const m=document.createElement('div');m.className='rm-ia-msg '+w;m.textContent=t;box.appendChild(m);box.scrollTop=box.scrollHeight;};
  const answer=q=>{const d=getData();q=q.toLowerCase();if(q.includes('partido')||q.includes('juega'))return d.nextMatch.rival&&d.nextMatch.rival!=='Por definir'?`Próximo partido: Ricardo Méndez vs ${d.nextMatch.rival}. ${d.nextMatch.date||''} ${d.nextMatch.place||''}`:'Aún no hay próximo partido cargado.';if(q.includes('noticia'))return(d.news||[]).length?`Hay ${d.news.length} noticia(s) cargada(s).`:'Aún no hay noticias cargadas.';if(q.includes('auspiciador'))return(d.sponsors||[]).length?`Hay ${d.sponsors.length} auspiciador(es).`:'Aún no hay auspiciadores cargados.';if(q.includes('socio'))return'Puedes hacerte socio usando el formulario o el botón Hazte socio.';if(q.includes('historia'))return d.history.text;return'Puedo responder sobre partido, noticias, socios, historia, fixture, resultados, tablas y auspiciadores.';};
  form.onsubmit=e=>{e.preventDefault();const q=input.value.trim();if(!q)return;input.value='';add(q,'user');setTimeout(()=>add(answer(q),'bot'),200);};
  document.querySelectorAll('.rm-ia-quick button').forEach(b=>b.onclick=()=>{const q=b.dataset.q||b.textContent;add(q,'user');setTimeout(()=>add(answer(q),'bot'),200);});
}

/* Acceso Admin */
(function(){
  function goAdmin(){location.href=location.origin+'/admin.html';}
  let typed='';
  document.addEventListener('keydown',e=>{const key=(e.key||'').toLowerCase();const tag=(e.target?.tagName||'').toLowerCase();const typing=['input','textarea','select'].includes(tag);if(key==='a'&&((e.ctrlKey&&e.altKey)||(e.ctrlKey&&e.shiftKey))){e.preventDefault();goAdmin();}if(!typing&&key.length===1){typed=(typed+key).slice(-10);if(typed.includes('admin'))goAdmin();}},true);
})();

document.addEventListener('DOMContentLoaded',()=>{
  renderAll();
  bindAdmin();
  bindSocioForm();
  bindRmIa();
  setTimeout(bindLightbox,300);
  setInterval(bindLightbox,1200);
});


/* =========================================================
   FIX DEFINITIVO BOTONES ADMIN
   Delegación global: todos los botones del Admin funcionan aunque el HTML cambie.
========================================================= */
async function adminActionById(id){
  const d = getData();

  try{
    if(id === 'saveSupabase'){
      setCfg(document.getElementById('supabaseUrl')?.value, document.getElementById('supabaseKey')?.value);
      confirmOk('Conexión Supabase guardada.');
      return;
    }

    if(id === 'loadCloud'){
      await pullCloud();
      confirmOk('Datos cargados desde Supabase.');
      renderAll();
      fillAdmin();
      return;
    }

    if(id === 'saveCloud'){
      await pushCloud(getData());
      confirmOk('Datos subidos a Supabase.');
      return;
    }

    if(id === 'saveGeneral'){
      d.settings.homeTitle = document.getElementById('homeTitle')?.value || d.settings.homeTitle;
      d.settings.homeText = document.getElementById('homeIntroInput')?.value || '';
      d.settings.activeMembers = document.getElementById('metricMembers')?.value || '0';
      d.settings.championships = document.getElementById('metricTitles')?.value || '0';
      d.siteConfig.whatsapp = document.getElementById('siteWhatsapp')?.value || '';
      d.siteConfig.instagram = document.getElementById('siteInstagram')?.value || '';
      d.siteConfig.facebook = document.getElementById('siteFacebook')?.value || '';
      d.siteConfig.blue = document.getElementById('siteColorBlue')?.value || '#00c8ff';
      d.siteConfig.gold = document.getElementById('siteColorGold')?.value || '#f7d36b';
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'saveMatch'){
      let logo = document.getElementById('matchLogoUrl')?.value || '';
      const f = document.getElementById('matchLogoFile')?.files?.[0];
      if(f) logo = await uploadFile(f, 'logos');
      d.nextMatch = {
        rival: document.getElementById('matchRival')?.value || 'Por definir',
        tournament: document.getElementById('matchTournament')?.value || '',
        referee: document.getElementById('matchReferee')?.value || '',
        broadcast: document.getElementById('matchBroadcast')?.value || '',
        date: document.getElementById('matchDate')?.value || '',
        place: document.getElementById('matchPlace')?.value || '',
        logo
      };
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'saveHistory'){
      d.history.text = document.getElementById('historyText')?.value || '';
      d.history.currentPresident = document.getElementById('presidentName')?.value || '';
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'addDirector'){
      d.directors.push({
        role: document.getElementById('directorRole')?.value || '',
        name: document.getElementById('directorName')?.value || ''
      });
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'addPresident'){
      let image = '';
      const f = document.getElementById('presidentPhoto')?.files?.[0];
      if(f) image = await uploadFile(f, 'presidents');
      d.presidents.unshift({
        name: document.getElementById('presidentGalleryName')?.value || '',
        period: document.getElementById('presidentPeriod')?.value || '',
        image
      });
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'addResult'){
      d.results.unshift({
        date: document.getElementById('resultDate')?.value || '',
        match: document.getElementById('resultMatch')?.value || '',
        score: document.getElementById('resultScore')?.value || ''
      });
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'addNews'){
      let image = '';
      const f = document.getElementById('newsImage')?.files?.[0];
      if(f) image = await uploadFile(f, 'news');
      d.news.unshift({
        title: document.getElementById('newsTitle')?.value || '',
        text: document.getElementById('newsText')?.value || '',
        date: new Date().toLocaleDateString('es-CL'),
        image
      });
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'addMedia'){
      let url = document.getElementById('mediaUrl')?.value || '';
      let type = 'image';
      const f = document.getElementById('mediaFile')?.files?.[0];
      if(f){
        url = await uploadFile(f, 'gallery');
        type = f.type && f.type.startsWith('video') ? 'video' : 'image';
      }
      d.gallery.unshift({
        title: document.getElementById('mediaTitle')?.value || '',
        type,
        url
      });
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'addFixture'){
      let image = '';
      const f = document.getElementById('fixtureImage')?.files?.[0];
      if(f) image = await uploadFile(f, 'fixture');
      d.fixture_images.unshift({
        title: document.getElementById('fixtureTitle')?.value || '',
        image
      });
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'addStanding'){
      const serie = document.getElementById('standingSerie')?.value || SERIES[0];
      if(!d.standings[serie]) d.standings[serie] = [];
      const gf = Number(document.getElementById('gf')?.value || 0);
      const gc = Number(document.getElementById('gc')?.value || 0);
      d.standings[serie].push({
        team: document.getElementById('teamName')?.value || '',
        pj: Number(document.getElementById('pj')?.value || 0),
        pg: Number(document.getElementById('pg')?.value || 0),
        pe: Number(document.getElementById('pe')?.value || 0),
        pp: Number(document.getElementById('pp')?.value || 0),
        gf, gc, dg: gf - gc,
        pts: Number(document.getElementById('pts')?.value || 0)
      });
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'addSponsor'){
      let url = document.getElementById('sponsorUrl')?.value || '';
      const fileInput = document.getElementById('sponsorFile') || document.getElementById('sponsorLogo');
      const f = fileInput?.files?.[0];
      if(f) url = await uploadFile(f, 'sponsors');
      d.sponsors.push({
        name: document.getElementById('sponsorName')?.value || '',
        url
      });
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'saveBackground'){
      let url = document.getElementById('backgroundUrl')?.value || '';
      const f = document.getElementById('backgroundFile')?.files?.[0];
      if(f) url = await uploadFile(f, 'backgrounds');
      d.appearance = d.appearance || {};
      d.appearance.backgroundImage = url;
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'restoreBackground'){
      d.appearance = d.appearance || {};
      d.appearance.backgroundImage = '';
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'saveAppearanceColors'){
      d.appearance = d.appearance || {};
      d.appearance.blue = document.getElementById('appearanceBlue')?.value || '#00c8ff';
      d.appearance.gold = document.getElementById('appearanceGold')?.value || '#f7d36b';
      d.appearance.overlay = document.getElementById('backgroundOverlay')?.value || 35;
      d.siteConfig.blue = d.appearance.blue;
      d.siteConfig.gold = d.appearance.gold;
      await saveAll(d);
      fillAdmin();
      return;
    }

  }catch(e){
    console.error('Error botón Admin:', id, e);
    confirmError(e.message || 'Error al ejecutar acción.');
  }
}

(function(){
  if(window.__ADMIN_BUTTONS_DELEGATED_FINAL) return;
  window.__ADMIN_BUTTONS_DELEGATED_FINAL = true;

  document.addEventListener('click', async function(e){
    const btn = e.target.closest('button');
    if(!btn) return;

    const id = btn.id || '';
    const adminIds = [
      'saveSupabase','loadCloud','saveCloud','saveGeneral','saveMatch','saveHistory',
      'addDirector','addPresident','addResult','addNews','addMedia','addFixture',
      'addStanding','addSponsor','saveBackground','restoreBackground','saveAppearanceColors'
    ];

    if(adminIds.includes(id)){
      e.preventDefault();
      e.stopPropagation();
      btn.disabled = true;
      const oldText = btn.textContent;
      btn.textContent = 'Procesando...';
      await adminActionById(id);
      btn.textContent = oldText;
      btn.disabled = false;
    }

    if(btn.classList.contains('themePreset')){
      e.preventDefault();
      e.stopPropagation();
      const d = getData();
      d.appearance = d.appearance || {};
      if(btn.dataset.theme === 'nike'){
        d.appearance.blue = '#0077ff';
        d.appearance.gold = '#ffffff';
        d.appearance.overlay = 42;
      }else if(btn.dataset.theme === 'adidas'){
        d.appearance.blue = '#00c8ff';
        d.appearance.gold = '#f7d36b';
        d.appearance.overlay = 38;
      }else{
        d.appearance.blue = '#00bfff';
        d.appearance.gold = '#f3c84b';
        d.appearance.overlay = 35;
      }
      await saveAll(d);
      fillAdmin();
    }
  }, true);
})();


/* FIX SELECT SERIES ADMIN */
document.addEventListener('DOMContentLoaded', ()=>{
  setTimeout(()=>{
    const sel = document.getElementById('standingSerie');
    if(sel && !sel.dataset.loadedSeries){
      sel.dataset.loadedSeries = '1';
      sel.innerHTML = SERIES.map(s=>`<option>${s}</option>`).join('');
    }
  }, 500);
});


/* =========================================================
   FIX VISUAL AUSPICIADORES SIN FONDO BLANCO
========================================================= */
function sponsorImgPremium(url, name, cls='sponsor-img'){
  if(!url) return `<div class="sponsor-fallback">${name || 'AUSPICIADOR'}</div>`;
  return `<img class="${cls}" src="${url}" alt="${name || 'Auspiciador'}" loading="lazy">`;
}
if(typeof renderSponsors === 'function' && !window.__sponsorRenderPremium){
  window.__sponsorRenderPremium = true;
  const oldRenderSponsorsPremium = renderSponsors;
  renderSponsors = function(d){
    d = d || getData();
    const el = document.getElementById('sponsorsGrid');
    if(!el) return oldRenderSponsorsPremium(d);
    const list = d.sponsors || [];
    el.innerHTML = list.length
      ? list.map(s=>`<article class="sponsor-card"><div class="sponsor-logo-box">${sponsorImgPremium(s.url, s.name, 'sponsor-img')}</div><h3>${s.name || ''}</h3></article>`).join('')
      : `<div class="empty-state">Aún no hay auspiciadores cargados.</div>`;
  }
}
if(typeof renderSponsorTicker === 'function' && !window.__tickerRenderPremium){
  window.__tickerRenderPremium = true;
  const oldTickerPremium = renderSponsorTicker;
  renderSponsorTicker = function(d){
    d = d || getData();
    const el = document.getElementById('sponsorTicker');
    if(!el) return oldTickerPremium(d);
    const list = d.sponsors || [];
    if(!list.length){
      el.innerHTML = `<div class="ticker-empty">CARGA TUS AUSPICIADORES DESDE ADMIN</div>`;
      return;
    }
    el.innerHTML = [...list,...list].map(s=>`<div class="ticker-sponsor"><div class="ticker-logo-box">${sponsorImgPremium(s.url, s.name, 'ticker-sponsor-img')}</div><span>${s.name || ''}</span></div>`).join('');
  }
}


/* =========================================================
   FIX PUBLICO SUPABASE PARA TODOS LOS VISITANTES
========================================================= */
const PUBLIC_SUPABASE_URL = 'https://xzcbdyabzgwfoylipgco.supabase.co';
const PUBLIC_SUPABASE_KEY = 'sb_publishable_rFYVLbY_0uJvOLJ0jftWzw_jsmNwVkl';

function ensurePublicSupabaseConfig(){
  try {
    const current = JSON.parse(localStorage.getItem(CFG_KEY) || '{}');
    if(!current.url || !current.key){
      localStorage.setItem(CFG_KEY, JSON.stringify({url: PUBLIC_SUPABASE_URL, key: PUBLIC_SUPABASE_KEY}));
    }
  } catch(e) {
    localStorage.setItem(CFG_KEY, JSON.stringify({url: PUBLIC_SUPABASE_URL, key: PUBLIC_SUPABASE_KEY}));
  }
}

async function loadPublicDataForAll(){
  try{
    ensurePublicSupabaseConfig();
    if(typeof pullCloud === 'function'){
      await pullCloud();
      if(typeof renderAll === 'function') renderAll();
      if(typeof renderPublic === 'function') renderPublic();
      console.log('Datos publicos cargados desde Supabase');
    }
  }catch(e){
    console.warn('No se pudieron cargar datos publicos desde Supabase:', e);
    if(typeof renderAll === 'function') renderAll();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(loadPublicDataForAll, 300);
});


/* =========================================================
   SUPABASE REAL FINAL - DATOS PUBLICOS PARA TODOS
========================================================= */
(function(){
  const REAL_SUPABASE_URL_FINAL = 'https://xzcbdyabzgwfoylipgco.supabase.co';
  const REAL_SUPABASE_KEY_FINAL = 'sb_publishable_rFYVLbY_0uJvOLJ0jftWzw_jsmNwVkl';

  function setRealPublicConfigFinal(){
    try{
      localStorage.setItem(CFG_KEY, JSON.stringify({
        url: REAL_SUPABASE_URL_FINAL,
        key: REAL_SUPABASE_KEY_FINAL
      }));
    }catch(e){ console.warn('No se pudo guardar config Supabase publica', e); }
  }

  async function loadRealPublicDataFinal(){
    try{
      setRealPublicConfigFinal();
      if(typeof pullCloud === 'function'){
        await pullCloud();
      }
      if(typeof renderAll === 'function') renderAll();
      if(typeof renderPublic === 'function') renderPublic();
      console.log('OK: datos públicos cargados desde Supabase real.');
    }catch(e){
      console.warn('Error cargando Supabase público real:', e);
      if(typeof renderAll === 'function') renderAll();
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(loadRealPublicDataFinal, 600);
  });
})();


/* =========================================================
   RENDER TABLA GENERAL / PUNTAJES DESDE EXCEL
========================================================= */
function getSeriesOptionsWithGeneral(d){
  const base = Array.isArray(SERIES) ? [...SERIES] : [];
  const keys = Object.keys((d && d.standings) || {});
  keys.forEach(k=>{ if(!base.includes(k)) base.unshift(k); });
  if((d?.standings || {})['TABLA GENERAL']){
    return ['TABLA GENERAL', ...base.filter(x=>x !== 'TABLA GENERAL')];
  }
  return base;
}

function renderCumulativeRowsFromGeneral(d){
  const tbody = document.getElementById('cumulativeRows');
  if(!tbody) return;
  d = d || getData();
  const rows = (d.standings && d.standings['TABLA GENERAL']) || [];
  if(!rows.length){
    tbody.innerHTML = '';
    return;
  }
  const sorted = [...rows].sort((a,b)=>(Number(b.pts)||0)-(Number(a.pts)||0));
  tbody.innerHTML = sorted.map((x,i)=>`<tr><td>${i+1}</td><td>${x.team||''}</td><td>${x.pj||0}</td><td>${x.pts||0}</td><td>${x.dg||0}</td></tr>`).join('');
}

// Sobrescribe renderStandings para incluir TABLA GENERAL.
if(typeof renderStandings === 'function' && !window.__rmRenderStandingsGeneral){
  window.__rmRenderStandingsGeneral = true;
  renderStandings = function(){
    const d=getData(), tbody=document.getElementById('standingsRows'); 
    if(!tbody) return;
    const select = document.getElementById('serieSelect');
    if(select && !select.dataset.loadedGeneral){
      select.innerHTML = getSeriesOptionsWithGeneral(d).map(s=>`<option>${s}</option>`).join('');
      select.dataset.loadedGeneral = '1';
      select.onchange = renderStandings;
    }
    const serie = select?.value || (d.standings && d.standings['TABLA GENERAL'] ? 'TABLA GENERAL' : (Array.isArray(SERIES) ? SERIES[0] : ''));
    const rows=(d.standings&&d.standings[serie])||[];
    tbody.innerHTML=rows.map((x,i)=>`<tr><td>${i+1}</td><td>${x.team||''}</td><td>${x.pj||0}</td><td>${x.pg||0}</td><td>${x.pe||0}</td><td>${x.pp||0}</td><td>${x.gf||0}</td><td>${x.gc||0}</td><td>${x.dg||0}</td><td>${x.pts||0}</td></tr>`).join('');
    renderCumulativeRowsFromGeneral(d);
  }
}

document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>renderCumulativeRowsFromGeneral(getData()),900));


/* =========================================================
   FILTRO PÚBLICO: PUNTAJES NO APARECEN EN RESULTADOS
========================================================= */
function isWrongStandingResultCardPublic(r){
  if(!r) return false;
  const match = String(r.match || '').trim().toLowerCase();
  const score = String(r.score || '').trim();
  const date = String(r.date || '').trim();
  const series = [
    'super senior','senior 35','1° infantil','1º infantil','2° infantil','2º infantil',
    'peques','juveniles','serie de oro','serie damas','senior','primera adultos',
    'segunda adultos','honor','platinos','serie oro','primera infantil','segunda infantil',
    'total','resumen general por series'
  ];
  return series.some(s => match === s || match.includes(s)) || (/^[0-9]+$/.test(score) && /^[0-9]+$/.test(date));
}

if(typeof renderPublic === 'function' && !window.__filterWrongResultsCardsPublic){
  window.__filterWrongResultsCardsPublic = true;
  const oldRenderPublicFilterResults = renderPublic;
  renderPublic = function(){
    const d = getData();
    if(d && Array.isArray(d.results)){
      d.results = d.results.filter(r => !isWrongStandingResultCardPublic(r));
      try{ saveData(d); }catch(e){}
    }
    oldRenderPublicFilterResults();
  }
}


/* =========================================================
   FILTRO FINAL PUBLICO RESULTS: OCULTAR FILAS DE PUNTAJES
========================================================= */
function isStandingRowInPublicResultsFinal(r){
  if(!r) return false;
  const match = String(r.match || '').trim().toLowerCase();
  const date = String(r.date || '').trim();
  const score = String(r.score || '').trim();
  const scorers = String(r.scorers || '').trim().toLowerCase();
  const series = [
    'super senior','senior 35','1° infantil','1º infantil','1 infantil','2° infantil','2º infantil','2 infantil',
    'peques','juveniles','serie de oro','serie damas','senior','primera adultos','segunda adultos',
    'honor','platinos','serie oro','primera infantil','segunda infantil','total','resumen general por series'
  ];
  return series.some(s => match === s || match.includes(s)) ||
         scorers.includes('planilla oficial') ||
         (/^[0-9]+$/.test(date) && /^[0-9]+$/.test(score));
}

if(typeof renderPublic === 'function' && !window.__finalPublicResultsFilterStandings){
  window.__finalPublicResultsFilterStandings = true;
  const previousRenderPublicFinalFilter = renderPublic;
  renderPublic = function(){
    const d = getData();
    if(d && Array.isArray(d.results)){
      d.results = d.results.filter(r => !isStandingRowInPublicResultsFinal(r));
      try{ saveData(d); }catch(e){}
    }
    return previousRenderPublicFinalFilter();
  };
}


/* =========================================================
   FIX FINAL PUBLICO: RESULTADOS SIN PUNTAJES
========================================================= */
function rmCleanTextPublicFinal(v){
  return String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
}
function rmIsStandingResultPublicFinal(r){
  if(!r) return false;
  const match = rmCleanTextPublicFinal(r.match || '');
  const score = String(r.score || '').trim();
  const date = String(r.date || '').trim();
  const scorers = rmCleanTextPublicFinal(r.scorers || '');
  const series = ['super senior','senior 35','1 infantil','1° infantil','1º infantil','2 infantil','2° infantil','2º infantil','peques','juveniles','serie de oro','serie damas','senior','primera adultos','segunda adultos','honor','platinos','serie oro','primera infantil','segunda infantil','total','tabla general','resumen general por series'];
  return series.some(s => match === s || match.includes(s)) || scorers.includes('planilla oficial') || (/^[0-9]+$/.test(date) && /^[0-9]+$/.test(score));
}
function rmFilterResultsPublicFinal(){
  const d = getData();
  if(d && Array.isArray(d.results)){
    d.results = d.results.filter(r => !rmIsStandingResultPublicFinal(r));
    try{ saveData(d); }catch(e){}
  }
  return d;
}
if(typeof renderPublic === 'function' && !window.__publicResultsFinalCleanRender){
  window.__publicResultsFinalCleanRender = true;
  const oldRenderPublicCleanFinal = renderPublic;
  renderPublic = function(){
    rmFilterResultsPublicFinal();
    return oldRenderPublicCleanFinal();
  };
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{rmFilterResultsPublicFinal(); if(typeof renderAll==='function') renderAll();},1200));


/* =========================================================
   TABLAS REALES FECHA 7 - SOLO PUNTAJES/POSICIONES
========================================================= */
const CDRM_STANDINGS_FECHA7 = {"Super Senior": [{"team": "Caupolicán", "pj": 7, "pg": 6, "pe": 0, "pp": 1, "gf": 17, "gc": 7, "dg": 10, "pts": 18}, {"team": "Manzana T.", "pj": 6, "pg": 5, "pe": 1, "pp": 0, "gf": 20, "gc": 4, "dg": 16, "pts": 16}, {"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 1, "pp": 1, "gf": 17, "gc": 6, "dg": 11, "pts": 16}, {"team": "Chacay", "pj": 6, "pg": 4, "pe": 0, "pp": 2, "gf": 9, "gc": 5, "dg": 4, "pts": 12}, {"team": "Estrella", "pj": 5, "pg": 3, "pe": 1, "pp": 1, "gf": 14, "gc": 3, "dg": 11, "pts": 10}, {"team": "Independiente", "pj": 6, "pg": 1, "pe": 1, "pp": 4, "gf": 6, "gc": 19, "dg": -13, "pts": 4}, {"team": "Cruz Azul", "pj": 5, "pg": 1, "pe": 0, "pp": 4, "gf": 6, "gc": 22, "dg": -16, "pts": 3}, {"team": "Barrabases", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 9, "dg": -9, "pts": 0}, {"team": "Unión", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 1, "gc": 15, "dg": -14, "pts": 0}], "Senior 35": [{"team": "Caupolicán", "pj": 7, "pg": 6, "pe": 1, "pp": 0, "gf": 26, "gc": 8, "dg": 18, "pts": 19}, {"team": "Manzana T.", "pj": 6, "pg": 5, "pe": 1, "pp": 0, "gf": 20, "gc": 9, "dg": 11, "pts": 16}, {"team": "Chacay", "pj": 6, "pg": 3, "pe": 1, "pp": 2, "gf": 13, "gc": 13, "dg": 0, "pts": 10}, {"team": "R. Méndez", "pj": 7, "pg": 2, "pe": 2, "pp": 3, "gf": 13, "gc": 11, "dg": 2, "pts": 8}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 2, "pp": 1, "gf": 10, "gc": 8, "dg": 2, "pts": 8}, {"team": "Cruz Azul", "pj": 5, "pg": 2, "pe": 1, "pp": 2, "gf": 9, "gc": 8, "dg": 1, "pts": 7}, {"team": "Independiente", "pj": 6, "pg": 2, "pe": 1, "pp": 3, "gf": 12, "gc": 17, "dg": -5, "pts": 7}, {"team": "Unión", "pj": 6, "pg": 0, "pe": 1, "pp": 5, "gf": 3, "gc": 26, "dg": -23, "pts": 1}, {"team": "Barrabases", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 6, "dg": -6, "pts": 0}], "1° Infantil": [{"team": "Caupolicán", "pj": 7, "pg": 7, "pe": 0, "pp": 0, "gf": 24, "gc": 2, "dg": 22, "pts": 21}, {"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 1, "pp": 1, "gf": 27, "gc": 7, "dg": 20, "pts": 16}, {"team": "Estrella", "pj": 5, "pg": 3, "pe": 2, "pp": 0, "gf": 22, "gc": 6, "dg": 16, "pts": 11}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 1, "pp": 2, "gf": 13, "gc": 10, "dg": 3, "pts": 10}, {"team": "Unión", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 20, "gc": 16, "dg": 4, "pts": 9}, {"team": "Chacay", "pj": 6, "pg": 2, "pe": 0, "pp": 4, "gf": 7, "gc": 15, "dg": -8, "pts": 6}, {"team": "Independiente", "pj": 6, "pg": 1, "pe": 0, "pp": 5, "gf": 12, "gc": 22, "dg": -10, "pts": 3}, {"team": "Cruz Azul", "pj": 5, "pg": 1, "pe": 0, "pp": 4, "gf": 8, "gc": 21, "dg": -13, "pts": 3}, {"team": "Manzana T.", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 2, "gc": 36, "dg": -34, "pts": 0}], "2° Infantil": [{"team": "Unión", "pj": 6, "pg": 5, "pe": 1, "pp": 0, "gf": 11, "gc": 2, "dg": 9, "pts": 16}, {"team": "R. Méndez", "pj": 7, "pg": 4, "pe": 1, "pp": 2, "gf": 10, "gc": 3, "dg": 7, "pts": 13}, {"team": "Estrella", "pj": 5, "pg": 4, "pe": 1, "pp": 0, "gf": 8, "gc": 2, "dg": 6, "pts": 13}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 2, "pp": 1, "gf": 17, "gc": 9, "dg": 8, "pts": 11}, {"team": "Independiente", "pj": 6, "pg": 3, "pe": 1, "pp": 2, "gf": 9, "gc": 7, "dg": 2, "pts": 10}, {"team": "Chacay", "pj": 6, "pg": 2, "pe": 0, "pp": 4, "gf": 6, "gc": 10, "dg": -4, "pts": 6}, {"team": "Caupolicán", "pj": 7, "pg": 2, "pe": 0, "pp": 5, "gf": 4, "gc": 23, "dg": -19, "pts": 6}, {"team": "Cruz Azul", "pj": 4, "pg": 0, "pe": 0, "pp": 4, "gf": 0, "gc": 4, "dg": -4, "pts": 0}, {"team": "Manzana T.", "pj": 5, "pg": 0, "pe": 0, "pp": 5, "gf": 1, "gc": 6, "dg": -5, "pts": 0}], "Peques": [{"team": "Chacay", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 29, "gc": 0, "dg": 29, "pts": 18}, {"team": "Manzana T.", "pj": 6, "pg": 5, "pe": 0, "pp": 1, "gf": 16, "gc": 4, "dg": 12, "pts": 15}, {"team": "Barrabases", "pj": 6, "pg": 4, "pe": 0, "pp": 2, "gf": 15, "gc": 3, "dg": 12, "pts": 12}, {"team": "Independiente", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 9, "gc": 13, "dg": -4, "pts": 9}, {"team": "Unión", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 6, "gc": 19, "dg": -13, "pts": 9}, {"team": "Caupolicán", "pj": 7, "pg": 3, "pe": 0, "pp": 4, "gf": 9, "gc": 28, "dg": -19, "pts": 9}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 0, "pp": 3, "gf": 8, "gc": 7, "dg": 1, "pts": 6}, {"team": "R. Méndez", "pj": 7, "pg": 1, "pe": 0, "pp": 6, "gf": 4, "gc": 17, "dg": -13, "pts": 3}, {"team": "Cruz Azul", "pj": 5, "pg": 0, "pe": 0, "pp": 5, "gf": 0, "gc": 5, "dg": -5, "pts": 0}], "Juveniles": [{"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 2, "pp": 0, "gf": 26, "gc": 4, "dg": 22, "pts": 17}, {"team": "Chacay", "pj": 6, "pg": 5, "pe": 1, "pp": 0, "gf": 19, "gc": 3, "dg": 16, "pts": 16}, {"team": "Caupolicán", "pj": 7, "pg": 5, "pe": 1, "pp": 1, "gf": 16, "gc": 9, "dg": 7, "pts": 16}, {"team": "Manzana T.", "pj": 6, "pg": 3, "pe": 2, "pp": 1, "gf": 14, "gc": 10, "dg": 4, "pts": 11}, {"team": "Estrella", "pj": 5, "pg": 3, "pe": 0, "pp": 2, "gf": 14, "gc": 8, "dg": 6, "pts": 9}, {"team": "Independiente", "pj": 6, "pg": 1, "pe": 1, "pp": 4, "gf": 7, "gc": 33, "dg": -26, "pts": 4}, {"team": "Unión", "pj": 6, "pg": 1, "pe": 0, "pp": 5, "gf": 9, "gc": 19, "dg": -10, "pts": 3}, {"team": "Cruz Azul", "pj": 5, "pg": 0, "pe": 1, "pp": 4, "gf": 8, "gc": 21, "dg": -13, "pts": 1}, {"team": "Barrabases", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 6, "dg": -6, "pts": 0}], "Serie de Oro": [{"team": "Manzana T.", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 20, "gc": 2, "dg": 18, "pts": 18}, {"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 2, "pp": 0, "gf": 9, "gc": 3, "dg": 6, "pts": 17}, {"team": "Caupolicán", "pj": 7, "pg": 3, "pe": 2, "pp": 2, "gf": 11, "gc": 14, "dg": -3, "pts": 11}, {"team": "Barrabases", "pj": 6, "pg": 2, "pe": 3, "pp": 1, "gf": 9, "gc": 4, "dg": 5, "pts": 9}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 2, "pp": 1, "gf": 8, "gc": 6, "dg": 2, "pts": 8}, {"team": "Chacay", "pj": 6, "pg": 2, "pe": 1, "pp": 3, "gf": 4, "gc": 9, "dg": -5, "pts": 7}, {"team": "Unión", "pj": 6, "pg": 2, "pe": 0, "pp": 4, "gf": 2, "gc": 14, "dg": -12, "pts": 6}, {"team": "Cruz Azul", "pj": 5, "pg": 0, "pe": 0, "pp": 5, "gf": 0, "gc": 5, "dg": -5, "pts": 0}, {"team": "Independiente", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 6, "dg": -6, "pts": 0}], "Serie Damas": [{"team": "Chacay", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 10, "gc": 0, "dg": 10, "pts": 18}, {"team": "Manzana T.", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 10, "gc": 0, "dg": 10, "pts": 18}, {"team": "Caupolicán", "pj": 7, "pg": 5, "pe": 0, "pp": 2, "gf": 5, "gc": 10, "dg": -5, "pts": 15}, {"team": "Estrella", "pj": 1, "pg": 0, "pe": 0, "pp": 1, "gf": 0, "gc": 1, "dg": -1, "pts": 0}, {"team": "R. Méndez", "pj": 2, "pg": 0, "pe": 0, "pp": 2, "gf": 0, "gc": 2, "dg": -2, "pts": 0}, {"team": "Barrabases", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}, {"team": "Cruz Azul", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}, {"team": "Independiente", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}, {"team": "Unión", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}], "2° Adulta": [{"team": "Manzana T.", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 21, "gc": 4, "dg": 17, "pts": 18}, {"team": "Independiente", "pj": 6, "pg": 4, "pe": 1, "pp": 1, "gf": 12, "gc": 7, "dg": 5, "pts": 13}, {"team": "R. Méndez", "pj": 7, "pg": 4, "pe": 1, "pp": 2, "gf": 8, "gc": 5, "dg": 3, "pts": 13}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 9, "gc": 8, "dg": 1, "pts": 9}, {"team": "Unión", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 9, "gc": 9, "dg": 0, "pts": 9}, {"team": "Cruz Azul", "pj": 5, "pg": 2, "pe": 1, "pp": 2, "gf": 11, "gc": 11, "dg": 0, "pts": 7}, {"team": "Caupolicán", "pj": 7, "pg": 2, "pe": 0, "pp": 5, "gf": 9, "gc": 21, "dg": -12, "pts": 6}, {"team": "Chacay", "pj": 6, "pg": 1, "pe": 1, "pp": 4, "gf": 4, "gc": 11, "dg": -7, "pts": 4}, {"team": "Estrella", "pj": 5, "pg": 0, "pe": 0, "pp": 5, "gf": 5, "gc": 12, "dg": -7, "pts": 0}], "1° Adulta": [{"team": "Unión", "pj": 6, "pg": 5, "pe": 0, "pp": 1, "gf": 14, "gc": 5, "dg": 9, "pts": 15}, {"team": "Manzana T.", "pj": 6, "pg": 4, "pe": 1, "pp": 1, "gf": 17, "gc": 5, "dg": 12, "pts": 13}, {"team": "Cruz Azul", "pj": 5, "pg": 4, "pe": 0, "pp": 1, "gf": 14, "gc": 6, "dg": 8, "pts": 12}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 9, "gc": 9, "dg": 0, "pts": 9}, {"team": "Caupolicán", "pj": 7, "pg": 2, "pe": 1, "pp": 4, "gf": 8, "gc": 16, "dg": -8, "pts": 7}, {"team": "R. Méndez", "pj": 7, "pg": 1, "pe": 3, "pp": 3, "gf": 9, "gc": 16, "dg": -7, "pts": 6}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 0, "pp": 3, "gf": 8, "gc": 15, "dg": -7, "pts": 6}, {"team": "Chacay", "pj": 6, "pg": 1, "pe": 2, "pp": 3, "gf": 7, "gc": 9, "dg": -2, "pts": 5}, {"team": "Independiente", "pj": 6, "pg": 0, "pe": 3, "pp": 3, "gf": 8, "gc": 13, "dg": -5, "pts": 3}], "Serie Platino": [{"team": "Caupolicán", "pj": 7, "pg": 4, "pe": 3, "pp": 0, "gf": 9, "gc": 5, "dg": 4, "pts": 15}, {"team": "Chacay", "pj": 6, "pg": 3, "pe": 3, "pp": 0, "gf": 11, "gc": 8, "dg": 3, "pts": 12}, {"team": "R. Méndez", "pj": 7, "pg": 3, "pe": 3, "pp": 1, "gf": 8, "gc": 7, "dg": 1, "pts": 12}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 1, "pp": 2, "gf": 10, "gc": 5, "dg": 5, "pts": 10}, {"team": "Independiente", "pj": 6, "pg": 2, "pe": 3, "pp": 1, "gf": 7, "gc": 6, "dg": 1, "pts": 9}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 1, "pp": 2, "gf": 2, "gc": 5, "dg": -3, "pts": 7}, {"team": "Cruz Azul", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}, {"team": "Manzana T.", "pj": 4, "pg": 0, "pe": 0, "pp": 4, "gf": 0, "gc": 4, "dg": -4, "pts": 0}, {"team": "Unión", "pj": 4, "pg": 0, "pe": 0, "pp": 4, "gf": 0, "gc": 4, "dg": -4, "pts": 0}], "Serie de Honor": [{"team": "Manzana T.", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 15, "gc": 3, "dg": 12, "pts": 18}, {"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 0, "pp": 2, "gf": 19, "gc": 7, "dg": 12, "pts": 15}, {"team": "Chacay", "pj": 6, "pg": 4, "pe": 1, "pp": 1, "gf": 8, "gc": 5, "dg": 3, "pts": 13}, {"team": "Caupolicán", "pj": 7, "pg": 3, "pe": 2, "pp": 2, "gf": 9, "gc": 11, "dg": -2, "pts": 11}, {"team": "Cruz Azul", "pj": 5, "pg": 3, "pe": 1, "pp": 1, "gf": 9, "gc": 6, "dg": 3, "pts": 10}, {"team": "Estrella", "pj": 5, "pg": 3, "pe": 0, "pp": 2, "gf": 4, "gc": 7, "dg": -3, "pts": 9}, {"team": "Independiente", "pj": 6, "pg": 1, "pe": 0, "pp": 5, "gf": 3, "gc": 15, "dg": -12, "pts": 3}, {"team": "Barrabases", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 6, "dg": -6, "pts": 0}, {"team": "Unión", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 1, "gc": 8, "dg": -7, "pts": 0}]};
const CDRM_SERIES_FECHA7 = ["Super Senior", "Senior 35", "1° Infantil", "2° Infantil", "Peques", "Juveniles", "Serie de Oro", "Serie Damas", "2° Adulta", "1° Adulta", "Serie Platino", "Serie de Honor"];

function cdrmCleanText(v){
  return String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
}
function cdrmIsStandingInResults(r){
  if(!r) return false;
  const match = cdrmCleanText(r.match || r.match_text || r.title || '');
  const score = String(r.score || '').trim();
  const date = String(r.date || r.date_text || '').trim();
  const series = CDRM_SERIES_FECHA7.map(cdrmCleanText);
  return series.some(s => match === s || match.includes(s)) ||
         match.includes('tabla general') ||
         match.includes('resumen general por series') ||
         (/^[0-9]+$/.test(date) && /^[0-9]+$/.test(score));
}
function cdrmCleanResultsLocal(){
  const d = getData();
  if(Array.isArray(d.results)){
    d.results = d.results.filter(r => !cdrmIsStandingInResults(r));
    try{ saveData(d); }catch(e){}
  }
  return d;
}
function cdrmEnsureStandingsFecha7(){
  const d = getData();
  if(!d.standings || !Object.keys(d.standings).length){
    d.standings = CDRM_STANDINGS_FECHA7;
    try{ saveData(d); }catch(e){}
  }
  return d;
}
function cdrmRenderStandingsFecha7(){
  const d = cdrmEnsureStandingsFecha7();
  const tbody = document.getElementById('standingsRows');
  const select = document.getElementById('serieSelect');
  if(!tbody || !select) return;

  const series = Object.keys(d.standings || CDRM_STANDINGS_FECHA7);
  const current = select.value;
  select.innerHTML = series.map(s => `<option value="${s}">${s}</option>`).join('');
  select.value = series.includes(current) ? current : series[0];
  select.onchange = cdrmRenderStandingsFecha7;

  const rows = (d.standings && d.standings[select.value]) || [];
  tbody.innerHTML = rows.map((x,i)=>`<tr>
    <td>${i+1}</td><td>${x.team||''}</td><td>${x.pj||0}</td><td>${x.pg||0}</td>
    <td>${x.pe||0}</td><td>${x.pp||0}</td><td>${x.gf||0}</td><td>${x.gc||0}</td>
    <td>${x.dg||0}</td><td>${x.pts||0}</td>
  </tr>`).join('');
}
if(typeof renderPublic === 'function' && !window.__cdrmRealStandingsRender){
  window.__cdrmRealStandingsRender = true;
  const oldRenderPublicRealStandings = renderPublic;
  renderPublic = function(){
    cdrmCleanResultsLocal();
    oldRenderPublicRealStandings();
    cdrmRenderStandingsFecha7();
  };
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{cdrmCleanResultsLocal(); cdrmRenderStandingsFecha7();},1000));

/* =========================================================
   SEPARACION DEFINITIVA RESULTADOS / PUNTAJES
========================================================= */
const CDRM_POSICIONES_FECHA7_FINAL = {"Super Senior": [{"team": "Caupolicán", "pj": 7, "pg": 6, "pe": 0, "pp": 1, "gf": 17, "gc": 7, "dg": 10, "pts": 18}, {"team": "Manzana T.", "pj": 6, "pg": 5, "pe": 1, "pp": 0, "gf": 20, "gc": 4, "dg": 16, "pts": 16}, {"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 1, "pp": 1, "gf": 17, "gc": 6, "dg": 11, "pts": 16}, {"team": "Chacay", "pj": 6, "pg": 4, "pe": 0, "pp": 2, "gf": 9, "gc": 5, "dg": 4, "pts": 12}, {"team": "Estrella", "pj": 5, "pg": 3, "pe": 1, "pp": 1, "gf": 14, "gc": 3, "dg": 11, "pts": 10}, {"team": "Independiente", "pj": 6, "pg": 1, "pe": 1, "pp": 4, "gf": 6, "gc": 19, "dg": -13, "pts": 4}, {"team": "Cruz Azul", "pj": 5, "pg": 1, "pe": 0, "pp": 4, "gf": 6, "gc": 22, "dg": -16, "pts": 3}, {"team": "Barrabases", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 9, "dg": -9, "pts": 0}, {"team": "Unión", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 1, "gc": 15, "dg": -14, "pts": 0}], "Senior 35": [{"team": "Caupolicán", "pj": 7, "pg": 6, "pe": 1, "pp": 0, "gf": 26, "gc": 8, "dg": 18, "pts": 19}, {"team": "Manzana T.", "pj": 6, "pg": 5, "pe": 1, "pp": 0, "gf": 20, "gc": 9, "dg": 11, "pts": 16}, {"team": "Chacay", "pj": 6, "pg": 3, "pe": 1, "pp": 2, "gf": 13, "gc": 13, "dg": 0, "pts": 10}, {"team": "R. Méndez", "pj": 7, "pg": 2, "pe": 2, "pp": 3, "gf": 13, "gc": 11, "dg": 2, "pts": 8}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 2, "pp": 1, "gf": 10, "gc": 8, "dg": 2, "pts": 8}, {"team": "Cruz Azul", "pj": 5, "pg": 2, "pe": 1, "pp": 2, "gf": 9, "gc": 8, "dg": 1, "pts": 7}, {"team": "Independiente", "pj": 6, "pg": 2, "pe": 1, "pp": 3, "gf": 12, "gc": 17, "dg": -5, "pts": 7}, {"team": "Unión", "pj": 6, "pg": 0, "pe": 1, "pp": 5, "gf": 3, "gc": 26, "dg": -23, "pts": 1}, {"team": "Barrabases", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 6, "dg": -6, "pts": 0}], "1° Infantil": [{"team": "Caupolicán", "pj": 7, "pg": 7, "pe": 0, "pp": 0, "gf": 24, "gc": 2, "dg": 22, "pts": 21}, {"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 1, "pp": 1, "gf": 27, "gc": 7, "dg": 20, "pts": 16}, {"team": "Estrella", "pj": 5, "pg": 3, "pe": 2, "pp": 0, "gf": 22, "gc": 6, "dg": 16, "pts": 11}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 1, "pp": 2, "gf": 13, "gc": 10, "dg": 3, "pts": 10}, {"team": "Unión", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 20, "gc": 16, "dg": 4, "pts": 9}, {"team": "Chacay", "pj": 6, "pg": 2, "pe": 0, "pp": 4, "gf": 7, "gc": 15, "dg": -8, "pts": 6}, {"team": "Independiente", "pj": 6, "pg": 1, "pe": 0, "pp": 5, "gf": 12, "gc": 22, "dg": -10, "pts": 3}, {"team": "Cruz Azul", "pj": 5, "pg": 1, "pe": 0, "pp": 4, "gf": 8, "gc": 21, "dg": -13, "pts": 3}, {"team": "Manzana T.", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 2, "gc": 36, "dg": -34, "pts": 0}], "2° Infantil": [{"team": "Unión", "pj": 6, "pg": 5, "pe": 1, "pp": 0, "gf": 11, "gc": 2, "dg": 9, "pts": 16}, {"team": "R. Méndez", "pj": 7, "pg": 4, "pe": 1, "pp": 2, "gf": 10, "gc": 3, "dg": 7, "pts": 13}, {"team": "Estrella", "pj": 5, "pg": 4, "pe": 1, "pp": 0, "gf": 8, "gc": 2, "dg": 6, "pts": 13}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 2, "pp": 1, "gf": 17, "gc": 9, "dg": 8, "pts": 11}, {"team": "Independiente", "pj": 6, "pg": 3, "pe": 1, "pp": 2, "gf": 9, "gc": 7, "dg": 2, "pts": 10}, {"team": "Chacay", "pj": 6, "pg": 2, "pe": 0, "pp": 4, "gf": 6, "gc": 10, "dg": -4, "pts": 6}, {"team": "Caupolicán", "pj": 7, "pg": 2, "pe": 0, "pp": 5, "gf": 4, "gc": 23, "dg": -19, "pts": 6}, {"team": "Cruz Azul", "pj": 4, "pg": 0, "pe": 0, "pp": 4, "gf": 0, "gc": 4, "dg": -4, "pts": 0}, {"team": "Manzana T.", "pj": 5, "pg": 0, "pe": 0, "pp": 5, "gf": 1, "gc": 6, "dg": -5, "pts": 0}], "Peques": [{"team": "Chacay", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 29, "gc": 0, "dg": 29, "pts": 18}, {"team": "Manzana T.", "pj": 6, "pg": 5, "pe": 0, "pp": 1, "gf": 16, "gc": 4, "dg": 12, "pts": 15}, {"team": "Barrabases", "pj": 6, "pg": 4, "pe": 0, "pp": 2, "gf": 15, "gc": 3, "dg": 12, "pts": 12}, {"team": "Independiente", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 9, "gc": 13, "dg": -4, "pts": 9}, {"team": "Unión", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 6, "gc": 19, "dg": -13, "pts": 9}, {"team": "Caupolicán", "pj": 7, "pg": 3, "pe": 0, "pp": 4, "gf": 9, "gc": 28, "dg": -19, "pts": 9}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 0, "pp": 3, "gf": 8, "gc": 7, "dg": 1, "pts": 6}, {"team": "R. Méndez", "pj": 7, "pg": 1, "pe": 0, "pp": 6, "gf": 4, "gc": 17, "dg": -13, "pts": 3}, {"team": "Cruz Azul", "pj": 5, "pg": 0, "pe": 0, "pp": 5, "gf": 0, "gc": 5, "dg": -5, "pts": 0}], "Juveniles": [{"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 2, "pp": 0, "gf": 26, "gc": 4, "dg": 22, "pts": 17}, {"team": "Chacay", "pj": 6, "pg": 5, "pe": 1, "pp": 0, "gf": 19, "gc": 3, "dg": 16, "pts": 16}, {"team": "Caupolicán", "pj": 7, "pg": 5, "pe": 1, "pp": 1, "gf": 16, "gc": 9, "dg": 7, "pts": 16}, {"team": "Manzana T.", "pj": 6, "pg": 3, "pe": 2, "pp": 1, "gf": 14, "gc": 10, "dg": 4, "pts": 11}, {"team": "Estrella", "pj": 5, "pg": 3, "pe": 0, "pp": 2, "gf": 14, "gc": 8, "dg": 6, "pts": 9}, {"team": "Independiente", "pj": 6, "pg": 1, "pe": 1, "pp": 4, "gf": 7, "gc": 33, "dg": -26, "pts": 4}, {"team": "Unión", "pj": 6, "pg": 1, "pe": 0, "pp": 5, "gf": 9, "gc": 19, "dg": -10, "pts": 3}, {"team": "Cruz Azul", "pj": 5, "pg": 0, "pe": 1, "pp": 4, "gf": 8, "gc": 21, "dg": -13, "pts": 1}, {"team": "Barrabases", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 6, "dg": -6, "pts": 0}], "Serie de Oro": [{"team": "Manzana T.", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 20, "gc": 2, "dg": 18, "pts": 18}, {"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 2, "pp": 0, "gf": 9, "gc": 3, "dg": 6, "pts": 17}, {"team": "Caupolicán", "pj": 7, "pg": 3, "pe": 2, "pp": 2, "gf": 11, "gc": 14, "dg": -3, "pts": 11}, {"team": "Barrabases", "pj": 6, "pg": 2, "pe": 3, "pp": 1, "gf": 9, "gc": 4, "dg": 5, "pts": 9}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 2, "pp": 1, "gf": 8, "gc": 6, "dg": 2, "pts": 8}, {"team": "Chacay", "pj": 6, "pg": 2, "pe": 1, "pp": 3, "gf": 4, "gc": 9, "dg": -5, "pts": 7}, {"team": "Unión", "pj": 6, "pg": 2, "pe": 0, "pp": 4, "gf": 2, "gc": 14, "dg": -12, "pts": 6}, {"team": "Cruz Azul", "pj": 5, "pg": 0, "pe": 0, "pp": 5, "gf": 0, "gc": 5, "dg": -5, "pts": 0}, {"team": "Independiente", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 6, "dg": -6, "pts": 0}], "Serie Damas": [{"team": "Chacay", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 10, "gc": 0, "dg": 10, "pts": 18}, {"team": "Manzana T.", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 10, "gc": 0, "dg": 10, "pts": 18}, {"team": "Caupolicán", "pj": 7, "pg": 5, "pe": 0, "pp": 2, "gf": 5, "gc": 10, "dg": -5, "pts": 15}, {"team": "Estrella", "pj": 1, "pg": 0, "pe": 0, "pp": 1, "gf": 0, "gc": 1, "dg": -1, "pts": 0}, {"team": "R. Méndez", "pj": 2, "pg": 0, "pe": 0, "pp": 2, "gf": 0, "gc": 2, "dg": -2, "pts": 0}, {"team": "Barrabases", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}, {"team": "Cruz Azul", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}, {"team": "Independiente", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}, {"team": "Unión", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}], "2° Adulta": [{"team": "Manzana T.", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 21, "gc": 4, "dg": 17, "pts": 18}, {"team": "Independiente", "pj": 6, "pg": 4, "pe": 1, "pp": 1, "gf": 12, "gc": 7, "dg": 5, "pts": 13}, {"team": "R. Méndez", "pj": 7, "pg": 4, "pe": 1, "pp": 2, "gf": 8, "gc": 5, "dg": 3, "pts": 13}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 9, "gc": 8, "dg": 1, "pts": 9}, {"team": "Unión", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 9, "gc": 9, "dg": 0, "pts": 9}, {"team": "Cruz Azul", "pj": 5, "pg": 2, "pe": 1, "pp": 2, "gf": 11, "gc": 11, "dg": 0, "pts": 7}, {"team": "Caupolicán", "pj": 7, "pg": 2, "pe": 0, "pp": 5, "gf": 9, "gc": 21, "dg": -12, "pts": 6}, {"team": "Chacay", "pj": 6, "pg": 1, "pe": 1, "pp": 4, "gf": 4, "gc": 11, "dg": -7, "pts": 4}, {"team": "Estrella", "pj": 5, "pg": 0, "pe": 0, "pp": 5, "gf": 5, "gc": 12, "dg": -7, "pts": 0}], "1° Adulta": [{"team": "Unión", "pj": 6, "pg": 5, "pe": 0, "pp": 1, "gf": 14, "gc": 5, "dg": 9, "pts": 15}, {"team": "Manzana T.", "pj": 6, "pg": 4, "pe": 1, "pp": 1, "gf": 17, "gc": 5, "dg": 12, "pts": 13}, {"team": "Cruz Azul", "pj": 5, "pg": 4, "pe": 0, "pp": 1, "gf": 14, "gc": 6, "dg": 8, "pts": 12}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 0, "pp": 3, "gf": 9, "gc": 9, "dg": 0, "pts": 9}, {"team": "Caupolicán", "pj": 7, "pg": 2, "pe": 1, "pp": 4, "gf": 8, "gc": 16, "dg": -8, "pts": 7}, {"team": "R. Méndez", "pj": 7, "pg": 1, "pe": 3, "pp": 3, "gf": 9, "gc": 16, "dg": -7, "pts": 6}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 0, "pp": 3, "gf": 8, "gc": 15, "dg": -7, "pts": 6}, {"team": "Chacay", "pj": 6, "pg": 1, "pe": 2, "pp": 3, "gf": 7, "gc": 9, "dg": -2, "pts": 5}, {"team": "Independiente", "pj": 6, "pg": 0, "pe": 3, "pp": 3, "gf": 8, "gc": 13, "dg": -5, "pts": 3}], "Serie Platino": [{"team": "Caupolicán", "pj": 7, "pg": 4, "pe": 3, "pp": 0, "gf": 9, "gc": 5, "dg": 4, "pts": 15}, {"team": "Chacay", "pj": 6, "pg": 3, "pe": 3, "pp": 0, "gf": 11, "gc": 8, "dg": 3, "pts": 12}, {"team": "R. Méndez", "pj": 7, "pg": 3, "pe": 3, "pp": 1, "gf": 8, "gc": 7, "dg": 1, "pts": 12}, {"team": "Barrabases", "pj": 6, "pg": 3, "pe": 1, "pp": 2, "gf": 10, "gc": 5, "dg": 5, "pts": 10}, {"team": "Independiente", "pj": 6, "pg": 2, "pe": 3, "pp": 1, "gf": 7, "gc": 6, "dg": 1, "pts": 9}, {"team": "Estrella", "pj": 5, "pg": 2, "pe": 1, "pp": 2, "gf": 2, "gc": 5, "dg": -3, "pts": 7}, {"team": "Cruz Azul", "pj": 3, "pg": 0, "pe": 0, "pp": 3, "gf": 0, "gc": 3, "dg": -3, "pts": 0}, {"team": "Manzana T.", "pj": 4, "pg": 0, "pe": 0, "pp": 4, "gf": 0, "gc": 4, "dg": -4, "pts": 0}, {"team": "Unión", "pj": 4, "pg": 0, "pe": 0, "pp": 4, "gf": 0, "gc": 4, "dg": -4, "pts": 0}], "Serie de Honor": [{"team": "Manzana T.", "pj": 6, "pg": 6, "pe": 0, "pp": 0, "gf": 15, "gc": 3, "dg": 12, "pts": 18}, {"team": "R. Méndez", "pj": 7, "pg": 5, "pe": 0, "pp": 2, "gf": 19, "gc": 7, "dg": 12, "pts": 15}, {"team": "Chacay", "pj": 6, "pg": 4, "pe": 1, "pp": 1, "gf": 8, "gc": 5, "dg": 3, "pts": 13}, {"team": "Caupolicán", "pj": 7, "pg": 3, "pe": 2, "pp": 2, "gf": 9, "gc": 11, "dg": -2, "pts": 11}, {"team": "Cruz Azul", "pj": 5, "pg": 3, "pe": 1, "pp": 1, "gf": 9, "gc": 6, "dg": 3, "pts": 10}, {"team": "Estrella", "pj": 5, "pg": 3, "pe": 0, "pp": 2, "gf": 4, "gc": 7, "dg": -3, "pts": 9}, {"team": "Independiente", "pj": 6, "pg": 1, "pe": 0, "pp": 5, "gf": 3, "gc": 15, "dg": -12, "pts": 3}, {"team": "Barrabases", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 0, "gc": 6, "dg": -6, "pts": 0}, {"team": "Unión", "pj": 6, "pg": 0, "pe": 0, "pp": 6, "gf": 1, "gc": 8, "dg": -7, "pts": 0}]};
const CDRM_SERIES_POSICIONES_FINAL = ["Super Senior", "Senior 35", "1° Infantil", "2° Infantil", "Peques", "Juveniles", "Serie de Oro", "Serie Damas", "2° Adulta", "1° Adulta", "Serie Platino", "Serie de Honor"];

function cdrmNormFinal(v){
  return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
}
function cdrmEsPuntajeEnResultadosFinal(r){
  if(!r) return false;
  const m = cdrmNormFinal(r.match || r.match_text || r.title || '');
  const d = String(r.date || r.date_text || '').trim();
  const s = String(r.score || '').trim();
  const g = cdrmNormFinal(r.scorers || '');
  const series = CDRM_SERIES_POSICIONES_FINAL.map(cdrmNormFinal);
  return series.some(x => m === x || m.includes(x)) || m.includes('tabla general') || m.includes('resumen general') || g.includes('planilla oficial') || (/^[0-9]+$/.test(d) && /^[0-9]+$/.test(s));
}
function cdrmLimpiarResultadosFinal(){
  const data = getData();
  data.results = Array.isArray(data.results) ? data.results.filter(x => !cdrmEsPuntajeEnResultadosFinal(x)) : [];
  try{ saveData(data); }catch(e){}
  return data;
}
function cdrmCargarTablasFecha7Local(){
  const data = cdrmLimpiarResultadosFinal();
  data.standings = CDRM_POSICIONES_FECHA7_FINAL;
  try{ saveData(data); }catch(e){}
  return data;
}
function cdrmRenderTablaPosicionesFinal(){
  const data = cdrmCargarTablasFecha7Local();
  const select = document.getElementById('serieSelect');
  const tbody = document.getElementById('standingsRows');
  if(!select || !tbody) return;
  const series = Object.keys(data.standings || CDRM_POSICIONES_FECHA7_FINAL);
  const actual = select.value;
  select.innerHTML = series.map(s=>`<option value="${s}">${s}</option>`).join('');
  select.value = series.includes(actual) ? actual : series[0];
  select.onchange = cdrmRenderTablaPosicionesFinal;
  const rows = data.standings[select.value] || [];
  tbody.innerHTML = rows.map((x,i)=>`<tr><td>${i+1}</td><td>${x.team}</td><td>${x.pj}</td><td>${x.pg}</td><td>${x.pe}</td><td>${x.pp}</td><td>${x.gf}</td><td>${x.gc}</td><td>${x.dg}</td><td>${x.pts}</td></tr>`).join('');
}
if(typeof renderPublic === 'function' && !window.__cdrmSeparacionPublicaFinal){
  window.__cdrmSeparacionPublicaFinal = true;
  const oldRenderPublic = renderPublic;
  renderPublic = function(){
    cdrmLimpiarResultadosFinal();
    oldRenderPublic();
    cdrmRenderTablaPosicionesFinal();
  };
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{cdrmLimpiarResultadosFinal(); cdrmRenderTablaPosicionesFinal();},800));


/* MEJORAS 8 PUNTOS */
function rmEsc8(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function rmClubRows8(d){d=d||getData();const rows=[];Object.entries(d.standings||{}).forEach(([serie,list])=>{if(!Array.isArray(list))return;const sorted=[...list].sort((a,b)=>(+b.pts||0)-(+a.pts||0)||(+b.dg||0)-(+a.dg||0));const ix=sorted.findIndex(r=>/r\.?\s*m[eé]ndez|ricardo/i.test(String(r.team||'')));if(ix>=0)rows.push({serie,position:ix+1,...sorted[ix]});});return rows;}
function rmDirectors8(d){d=d||getData();let el=document.getElementById('directorsGrid')||document.getElementById('directivaGrid')||document.getElementById('directivaList');if(!el){let sec=document.getElementById('directiva')||document.getElementById('directors');if(sec){el=document.createElement('div');el.id='directorsGrid';el.className='directors-grid';sec.appendChild(el);}}if(!el)return;const list=d.directors||[];el.innerHTML=list.length?list.map(x=>`<article class="director-card"><span>${rmEsc8(x.role||'Directiva')}</span><strong>${rmEsc8(x.name||'')}</strong></article>`).join(''):`<div class="empty-state">Directiva pendiente de cargar.</div>`;}
function rmCumulative8(d){d=d||getData();const tb=document.getElementById('cumulativeRows');if(!tb)return;const rows=rmClubRows8(d);if(!rows.length){tb.innerHTML='<tr><td colspan="5">Sin datos acumulados.</td></tr>';return;}const totals=rows.reduce((a,r)=>({pj:a.pj+(+r.pj||0),pts:a.pts+(+r.pts||0),dg:a.dg+(+r.dg||0)}),{pj:0,pts:0,dg:0});tb.innerHTML=rows.sort((a,b)=>(+b.pts||0)-(+a.pts||0)).map((r,i)=>`<tr><td>${i+1}</td><td>${rmEsc8(r.serie)}</td><td>${r.position}°</td><td>${r.pj||0}</td><td>${r.pts||0}</td></tr>`).join('')+`<tr class="total-row"><td colspan="3"><b>TOTAL CLUB</b></td><td>${totals.pj}</td><td>${totals.pts}</td></tr>`;}
function rmRanking8(d){d=d||getData();const tb=document.getElementById('seriesRankingRows');if(!tb)return;const rows=rmClubRows8(d).sort((a,b)=>(+b.pts||0)-(+a.pts||0)||(+a.position||99)-(+b.position||99));tb.innerHTML=rows.length?rows.map((r,i)=>`<tr><td>${i+1}</td><td>${rmEsc8(r.serie)}</td><td>${r.position}°</td><td>${r.pj||0}</td><td><b>${r.pts||0}</b></td><td>${r.dg||0}</td></tr>`).join(''):'<tr><td colspan="6">Sin datos de series.</td></tr>';}
function rmSponsorsBottom8(d){d=d||getData();const el=document.getElementById('sponsorsBottomGrid');if(!el)return;const list=d.sponsors||[];el.innerHTML=list.length?list.map(s=>`<article class="sponsor-card"><div class="sponsor-logo-box">${s.url?`<img class="sponsor-img" src="${rmEsc8(s.url)}" alt="${rmEsc8(s.name||'Auspiciador')}" loading="lazy">`:`<div class="sponsor-fallback">${rmEsc8(s.name||'AUSPICIADOR')}</div>`}</div><h3>${rmEsc8(s.name||'')}</h3></article>`).join(''):'<div class="empty-state">Auspiciadores pendientes de cargar.</div>';}
function rmAnniv8(d){d=d||getData();let date=d.settings?.anniversaryDate||d.settings?.anniversary||'12/08';let years=d.settings?.anniversaryYears||'Desde 1932';let de=document.getElementById('anniversaryDateText'),ye=document.getElementById('anniversaryYearsText');if(de)de.textContent=date;if(ye)ye.textContent=years;let label=d.settings?.championshipsLabel||'Campeonatos';document.querySelectorAll('.metric span,.stat span,.counter span').forEach(x=>{if(x.textContent.trim().toLowerCase()==='campeonatos')x.textContent=label;});}
function rmLogos8(){document.querySelectorAll('.match-logo-img,.match-team img,#nextMatchCard img,.next-match-card img').forEach(img=>{img.style.objectFit='contain';img.style.objectPosition='center';img.style.maxWidth='120px';img.style.maxHeight='120px';img.style.width='auto';img.style.height='auto';});}
function rmIAAns8(q){const d=getData(),t=String(q||'').toLowerCase(),rows=rmClubRows8(d),best=rows.sort((a,b)=>(b.pts||0)-(a.pts||0))[0];if(t.includes('directiva'))return(d.directors||[]).length?'Directiva: '+d.directors.map(x=>`${x.role}: ${x.name}`).join(' · '):'La directiva aún no está cargada.';if(t.includes('auspiciador'))return`El club tiene ${(d.sponsors||[]).length} auspiciadores cargados.`;if(t.includes('partido'))return`Próximo partido: ${d.nextMatch?.rival||'por definir'} · ${d.nextMatch?.date||'fecha por definir'} · ${d.nextMatch?.place||'lugar por definir'}.`;if(t.includes('tabla')||t.includes('puntaje')||t.includes('posicion'))return best?`La mejor serie es ${best.serie}, con ${best.pts} puntos y posición ${best.position}°.`:'Aún no hay tablas cargadas.';if(t.includes('aniversario'))return`Aniversario: ${d.settings?.anniversaryDate||'12/08'} (${d.settings?.anniversaryYears||'desde 1932'}).`;if(t.includes('historia'))return d.history?.text||'Historia pendiente de cargar.';return'Puedo responder sobre directiva, auspiciadores, próximo partido, tablas, puntajes, aniversario, historia, noticias y resultados.';}
function rmPatchIA8(){const input=document.getElementById('rmIaInput')||document.querySelector('.rm-ia-panel input'),send=document.getElementById('rmIaSend')||document.querySelector('.rm-ia-panel button'),body=document.getElementById('rmIaMessages')||document.querySelector('.rm-ia-messages');if(!input||!send||!body||send.dataset.rm8)return;send.dataset.rm8='1';const h=e=>{e.preventDefault();const q=input.value.trim();if(!q)return;body.insertAdjacentHTML('beforeend',`<div class="rm-ia-msg user">${rmEsc8(q)}</div><div class="rm-ia-msg bot">${rmEsc8(rmIAAns8(q))}</div>`);input.value='';body.scrollTop=body.scrollHeight;};send.addEventListener('click',h,true);input.addEventListener('keydown',e=>{if(e.key==='Enter')h(e);},true);}
function rmEnhance8(){const d=getData();rmDirectors8(d);rmCumulative8(d);rmRanking8(d);rmSponsorsBottom8(d);rmAnniv8(d);rmLogos8();rmPatchIA8();}
if(typeof renderPublic==='function'&&!window.__rm8){window.__rm8=true;const old=renderPublic;renderPublic=function(){old();rmEnhance8();};}
document.addEventListener('DOMContentLoaded',()=>setTimeout(rmEnhance8,1000));
document.addEventListener('DOMContentLoaded',()=>setTimeout(rmEnhance8,2000));


/* =========================================================
   MEJORAS PROFESIONALES FINALES
========================================================= */
function proEsc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function proClubRows(d){d=d||getData();const out=[];Object.entries(d.standings||{}).forEach(([serie,list])=>{if(!Array.isArray(list))return;const sorted=[...list].sort((a,b)=>(+b.pts||0)-(+a.pts||0)||(+b.dg||0)-(+a.dg||0)||(+b.gf||0)-(+a.gf||0));const ix=sorted.findIndex(r=>/r\.?\s*m[eé]ndez|ricardo/i.test(String(r.team||'')));if(ix>=0)out.push({serie,position:ix+1,...sorted[ix]});});return out;}
function proRenderAdvancedRanking(d){
  d=d||getData();const el=document.getElementById('advancedRankingGrid');if(!el)return;
  const rows=proClubRows(d);if(!rows.length){el.innerHTML='<div class="empty-state">Sin datos deportivos cargados.</div>';return;}
  const bestPts=[...rows].sort((a,b)=>(+b.pts||0)-(+a.pts||0))[0];
  const bestPos=[...rows].sort((a,b)=>(+a.position||99)-(+b.position||99))[0];
  const bestGF=[...rows].sort((a,b)=>(+b.gf||0)-(+a.gf||0))[0];
  const bestDef=[...rows].sort((a,b)=>(+a.gc||0)-(+b.gc||0))[0];
  const totals=rows.reduce((a,r)=>({pts:a.pts+(+r.pts||0),pj:a.pj+(+r.pj||0),gf:a.gf+(+r.gf||0),gc:a.gc+(+r.gc||0),dg:a.dg+(+r.dg||0)}),{pts:0,pj:0,gf:0,gc:0,dg:0});
  el.innerHTML=[
    ['Mejor puntaje',`${bestPts.serie}`,`${bestPts.pts} pts`],
    ['Mejor posición',`${bestPos.serie}`,`${bestPos.position}° lugar`],
    ['Más goleadora',`${bestGF.serie}`,`${bestGF.gf} GF`],
    ['Menos batida',`${bestDef.serie}`,`${bestDef.gc} GC`],
    ['Puntos acumulados','Club Ricardo Méndez',`${totals.pts} pts`],
    ['Goles acumulados','Club Ricardo Méndez',`${totals.gf} GF / ${totals.gc} GC`]
  ].map(x=>`<article class="advanced-card"><span>${proEsc(x[0])}</span><strong>${proEsc(x[1])}</strong><em>${proEsc(x[2])}</em></article>`).join('');
}
function proRenderCountdown(d){
  d=d||getData();const el=document.getElementById('matchCountdown');if(!el)return;
  const raw=d.nextMatch?.date || d.nextMatch?.datetime || '';
  let target=Date.parse(raw);
  if(!target || Number.isNaN(target)){el.innerHTML='<strong>Próximo partido</strong><p>Fecha por definir</p>';return;}
  const diff=Math.max(0,target-Date.now());
  const days=Math.floor(diff/86400000), hours=Math.floor(diff%86400000/3600000), mins=Math.floor(diff%3600000/60000);
  el.innerHTML=`<div><span>${days}</span><small>Días</small></div><div><span>${hours}</span><small>Horas</small></div><div><span>${mins}</span><small>Minutos</small></div>`;
}
function proRenderChampionships(d){
  d=d||getData();const el=document.getElementById('championshipsTimeline');if(!el)return;
  const list=d.championships||[];
  el.innerHTML=list.length?list.map(x=>`<article class="timeline-card"><strong>${proEsc(x.year||'')}</strong><h3>${proEsc(x.name||'Campeonato')}</h3><p>${proEsc(x.category||'')}</p></article>`).join(''):'<div class="empty-state">Historial de campeonatos pendiente de cargar.</div>';
}
function proRenderPresidentsHistory(d){
  d=d||getData();const el=document.getElementById('presidentsHistoryGrid');if(!el)return;
  const list=d.presidents||[];
  el.innerHTML=list.length?list.map(x=>`<article class="president-card">${x.url?`<img src="${proEsc(x.url)}" alt="${proEsc(x.name||'Presidente')}" loading="lazy">`:''}<h3>${proEsc(x.name||'')}</h3><p>${proEsc(x.period||'')}</p></article>`).join(''):'<div class="empty-state">Presidentes históricos pendientes de cargar.</div>';
}
function proMemberForm(){
  const form=document.getElementById('memberForm');if(!form||form.dataset.pro)return;form.dataset.pro='1';
  form.addEventListener('submit',e=>{
    e.preventDefault();const d=getData();
    const phone=(d.settings?.memberWhatsapp||'').replace(/\D/g,'')||'56900000000';
    const msg=`Hola, quiero ser socio del Club Deportivo Ricardo Méndez.%0A%0ANombre: ${encodeURIComponent(document.getElementById('memberName').value||'')}%0ARUT: ${encodeURIComponent(document.getElementById('memberRut').value||'')}%0ATeléfono: ${encodeURIComponent(document.getElementById('memberPhone').value||'')}%0ACorreo: ${encodeURIComponent(document.getElementById('memberEmail').value||'')}`;
    window.open(`https://wa.me/${phone}?text=${msg}`,'_blank');
  });
}
function proTvMode(){
  const btn=document.getElementById('openTvMode');if(!btn||btn.dataset.pro)return;btn.dataset.pro='1';
  btn.addEventListener('click',()=>{
    const d=getData();const rows=proClubRows(d).sort((a,b)=>(+b.pts||0)-(+a.pts||0)).slice(0,5);
    const w=window.open('','_blank');
    w.document.write(`<html><head><title>Modo TV Ricardo Méndez</title><style>body{margin:0;background:#020812;color:white;font-family:Arial;padding:30px}h1{color:#f7d36b;font-size:54px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}.card{background:#061426;border:1px solid #0077ff;border-radius:24px;padding:24px}li{font-size:28px;margin:12px 0}.sponsor{font-size:28px}</style></head><body><h1>Club Deportivo Ricardo Méndez</h1><div class="grid"><div class="card"><h2>Próximo Partido</h2><p style="font-size:32px">${proEsc(d.nextMatch?.rival||'Por definir')}</p><p>${proEsc(d.nextMatch?.date||'Fecha por definir')}</p></div><div class="card"><h2>Ranking de Series</h2><ol>${rows.map(r=>`<li>${proEsc(r.serie)}: ${r.pts} pts</li>`).join('')}</ol></div><div class="card"><h2>Noticias</h2><p>${proEsc(d.news?.[0]?.title||'Sin noticias')}</p></div><div class="card"><h2>Auspiciadores</h2><p class="sponsor">${(d.sponsors||[]).map(s=>proEsc(s.name)).join(' · ')}</p></div></div></body></html>`);
    w.document.close();
  });
}
function proIAExtraPatch(){
  if(window.__proIaExtra)return;window.__proIaExtra=true;
  window.proRMAnswer=function(q){
    const d=getData(),t=String(q||'').toLowerCase(),rows=proClubRows(d),best=rows.sort((a,b)=>(b.pts||0)-(a.pts||0))[0];
    if(t.includes('mejor serie'))return best?`La mejor serie por puntos es ${best.serie} con ${best.pts} puntos.`:'No hay datos.';
    if(t.includes('goleadora')){let g=[...rows].sort((a,b)=>(b.gf||0)-(a.gf||0))[0];return g?`${g.serie} es la serie más goleadora con ${g.gf} goles a favor.`:'No hay datos.';}
    if(t.includes('menos batida')){let g=[...rows].sort((a,b)=>(a.gc||0)-(b.gc||0))[0];return g?`${g.serie} es la menos batida con ${g.gc} goles en contra.`:'No hay datos.';}
    if(t.includes('socio'))return 'Para hacerte socio completa el formulario Hazte Socio y se enviará por WhatsApp.';
    if(t.includes('campeonato')||t.includes('palmar'))return (d.championships||[]).length?'Campeonatos: '+d.championships.map(c=>`${c.year} ${c.name} ${c.category}`).join(' · '):'Historial de campeonatos pendiente.';
    return null;
  };
}
function proRenderAll(){const d=getData();proRenderAdvancedRanking(d);proRenderCountdown(d);proRenderChampionships(d);proRenderPresidentsHistory(d);proMemberForm();proTvMode();proIAExtraPatch();}
if(typeof renderPublic==='function'&&!window.__proFinalRender){window.__proFinalRender=true;const old=renderPublic;renderPublic=function(){old();proRenderAll();};}
document.addEventListener('DOMContentLoaded',()=>{setInterval(()=>proRenderCountdown(getData()),30000);setTimeout(proRenderAll,1000);setTimeout(proRenderAll,2200);});


/* =========================================================
   ORDEN VISUAL FINAL + ACUMULADA + RELOJ 24H
========================================================= */
function ovfGet(id){ return document.getElementById(id); }
function ovfFindSection(ids, containsText){
  for(const id of ids){ const el=ovfGet(id); if(el) return el.closest('section') || el; }
  if(containsText){
    const secs=[...document.querySelectorAll('section,.section')];
    return secs.find(s=>containsText.some(t=>s.textContent.toLowerCase().includes(t)));
  }
  return null;
}
function ovfMoveAfter(container, node){
  if(container && node && node.parentNode) container.appendChild(node);
}
function ovfCreateOrderLayout(){
  let wrapper=ovfGet('orderedPageLayout');
  if(wrapper) return wrapper;
  wrapper=document.createElement('div');
  wrapper.id='orderedPageLayout';
  wrapper.className='ordered-page-layout';
  const main=document.querySelector('main') || document.body;
  main.appendChild(wrapper);
  return wrapper;
}
function ovfReorderSections(){
  const wrapper=ovfCreateOrderLayout();
  const summary=ovfGet('clubSummarySection');
  const directiva=ovfFindSection(['directorsGrid','directivaGrid','directivaList'],['directiva actual','directiva']);
  const historia=ovfFindSection(['historyText','historySection'],['historia']);
  const presidentes=ovfFindSection(['presidentsHistoryGrid','presidentsGrid','presidentsListPublic'],['presidentes']);
  const fixture=ovfFindSection(['fixtureGrid','fixtureList'],['fixture']);
  const posiciones=ovfFindSection(['standingsRows','serieSelect'],['tabla de posiciones','posiciones']);
  const acumulada=ovfFindSection(['cumulativeRows'],['tabla acumulada','acumulada']);
  const ranking=ovfFindSection(['seriesRankingRows','advancedRankingGrid'],['ranking']);
  const socio=ovfFindSection(['memberForm','memberSection'],['hazte socio','socio']);
  const sponsorsBottom=ovfGet('sponsorsBottomSection');
  [summary,directiva,historia,presidentes,fixture,posiciones,acumulada,ranking,socio,sponsorsBottom].filter(Boolean).forEach(n=>ovfMoveAfter(wrapper,n));
  // keep top carousel, hide duplicated middle sponsors except final section and ticker
  document.querySelectorAll('section,.section').forEach(sec=>{
    const txt=sec.textContent.toLowerCase();
    if(txt.includes('auspiciador') && sec.id!=='sponsorsBottomSection' && !sec.querySelector('#sponsorTicker') && !sec.closest('#sponsorsBottomSection')){
      if(sec.querySelector('#sponsorsGrid') || sec.id==='sponsors') sec.classList.add('hide-duplicate-sponsors');
    }
  });
}
function ovfRenderSummary(){
  const d=getData();
  const settings=d.settings||{};
  const seriesCount=Object.keys(d.standings||{}).length || (Array.isArray(window.SERIES)?SERIES.length:12);
  const socios=settings.membersCount || settings.socios || d.members?.length || 0;
  const foundation=settings.foundationDate || '12/08/1932';
  const anniversary=settings.anniversaryDate || settings.anniversary || '12/08';
  const champLabel=settings.championshipsLabel || 'Campeonato';
  const champText=settings.championshipsText || settings.championships || 'Editable';
  const set=(id,val)=>{const el=ovfGet(id); if(el) el.textContent=val;};
  set('summaryFoundation',foundation); set('summaryAnniversary',anniversary); set('summarySeries',seriesCount);
  set('summaryMembers',socios); set('summaryChampionshipLabel',champLabel); set('summaryChampionships',champText);
}
function ovfClubRows(d){
  d=d||getData(); const out=[];
  Object.entries(d.standings||{}).forEach(([serie,list])=>{
    if(!Array.isArray(list)) return;
    const sorted=[...list].sort((a,b)=>(+b.pts||0)-(+a.pts||0)||(+b.dg||0)-(+a.dg||0));
    const ix=sorted.findIndex(r=>/r\.?\s*m[eé]ndez|ricardo/i.test(String(r.team||'')));
    if(ix>=0) out.push({serie,position:ix+1,...sorted[ix]});
  });
  return out;
}
function ovfRenderAccumulated(){
  const d=getData(), tbody=ovfGet('cumulativeRows');
  if(!tbody) return;
  if(Array.isArray(d.accumulated) && d.accumulated.length){
    tbody.innerHTML=d.accumulated.map((r,i)=>`<tr><td>${i+1}</td><td>${r.club||r.team||''}</td><td>${r.pj||0}</td><td>${r.pts||0}</td><td>${r.dg||0}</td></tr>`).join('');
    return;
  }
  const rows=ovfClubRows(d);
  if(!rows.length){tbody.innerHTML='<tr><td colspan="5">Sin datos acumulados.</td></tr>'; return;}
  const totals=rows.reduce((a,r)=>({pj:a.pj+(+r.pj||0),pts:a.pts+(+r.pts||0),dg:a.dg+(+r.dg||0)}),{pj:0,pts:0,dg:0});
  tbody.innerHTML=rows.sort((a,b)=>(+b.pts||0)-(+a.pts||0)).map((r,i)=>`<tr><td>${i+1}</td><td>${r.serie}</td><td>${r.pj||0}</td><td>${r.pts||0}</td><td>${r.dg||0}</td></tr>`).join('')+
    `<tr class="total-row"><td colspan="2"><b>RICARDO MÉNDEZ TOTAL</b></td><td>${totals.pj}</td><td>${totals.pts}</td><td>${totals.dg}</td></tr>`;
}
function ovfMoveCountdownBelowMatch(){
  const match=ovfFindSection(['nextMatchCard'],['próximo partido','proximo partido']);
  const clock=ovfGet('nextMatchCountdownClock');
  if(match && clock && clock.parentNode!==match.parentNode){
    match.insertAdjacentElement('afterend', clock);
  }
}
function ovfRenderClock(){
  const now=new Date();
  const h=String(now.getHours()).padStart(2,'0'), m=String(now.getMinutes()).padStart(2,'0'), s=String(now.getSeconds()).padStart(2,'0');
  const live=ovfGet('liveClock24'); if(live) live.textContent=`${h}:${m}:${s}`;
  const d=getData(), target=Date.parse(d.nextMatch?.date || d.nextMatch?.datetime || '');
  const box=ovfGet('nextMatchCountdownInline');
  if(!box) return;
  if(!target || Number.isNaN(target)){box.innerHTML='<span>Próximo partido: fecha por definir</span>'; return;}
  const diff=Math.max(0,target-Date.now());
  const days=Math.floor(diff/86400000), hours=Math.floor(diff%86400000/3600000), mins=Math.floor(diff%3600000/60000);
  box.innerHTML=`<div><strong>${days}</strong><small>Días</small></div><div><strong>${hours}</strong><small>Horas</small></div><div><strong>${mins}</strong><small>Minutos</small></div>`;
}
function ovfFixMatchLogos(){
  document.querySelectorAll('.match-logo-img,.match-team img,#nextMatchCard img,.next-match-card img').forEach(img=>{
    img.style.objectFit='contain'; img.style.objectPosition='center'; img.style.width='auto'; img.style.height='auto'; img.style.maxWidth='110px'; img.style.maxHeight='110px';
  });
}
function ovfAll(){
  ovfReorderSections(); ovfRenderSummary(); ovfRenderAccumulated(); ovfMoveCountdownBelowMatch(); ovfRenderClock(); ovfFixMatchLogos();
}
if(typeof renderPublic==='function' && !window.__ovfRender){
  window.__ovfRender=true;
  const old=renderPublic;
  renderPublic=function(){ old(); ovfAll(); };
}
document.addEventListener('DOMContentLoaded',()=>{setTimeout(ovfAll,700);setTimeout(ovfAll,1800);setInterval(ovfRenderClock,1000);});


/* =========================================================
   TABLA ACUMULADA GENERAL DE TODOS LOS CLUBES
   Suma todas las series en competencia.
========================================================= */
function acumuladaNormClub(v){
  return String(v || '')
    .trim()
    .replace(/\s+/g,' ')
    .replace(/^R\.?\s*M[eé]ndez$/i,'R. Méndez')
    .replace(/^Ricardo\s+M[eé]ndez$/i,'R. Méndez')
    .replace(/^Manzana\s*T\.?$/i,'Manzana T.')
    .replace(/^Cruz\s+Azul$/i,'Cruz Azul');
}

function calcularAcumuladaTodosLosClubes(){
  const d = getData();
  const standings = d.standings || {};
  const clubes = {};

  Object.entries(standings).forEach(([serie, rows])=>{
    if(!Array.isArray(rows)) return;

    rows.forEach(r=>{
      const club = acumuladaNormClub(r.team || r.club || r.equipo || '');
      if(!club || club.toLowerCase() === 'total') return;

      if(!clubes[club]){
        clubes[club] = {
          club,
          series: 0,
          pj: 0,
          pg: 0,
          pe: 0,
          pp: 0,
          gf: 0,
          gc: 0,
          dg: 0,
          pts: 0
        };
      }

      clubes[club].series += 1;
      clubes[club].pj += Number(r.pj || 0);
      clubes[club].pg += Number(r.pg || r.g || 0);
      clubes[club].pe += Number(r.pe || r.e || 0);
      clubes[club].pp += Number(r.pp || r.p || 0);
      clubes[club].gf += Number(r.gf || 0);
      clubes[club].gc += Number(r.gc || 0);
      clubes[club].dg += Number(r.dg ?? r.df ?? ((Number(r.gf||0))-(Number(r.gc||0))));
      clubes[club].pts += Number(r.pts || 0);
    });
  });

  return Object.values(clubes).sort((a,b)=>
    (b.pts - a.pts) ||
    (b.dg - a.dg) ||
    (b.gf - a.gf) ||
    (a.gc - b.gc) ||
    a.club.localeCompare(b.club)
  );
}

function renderAcumuladaTodosLosClubes(){
  const tbody = document.getElementById('cumulativeRows');
  if(!tbody) return;

  const d = getData();

  // Si hay Excel de acumulada cargado manualmente, se respeta.
  let rows = Array.isArray(d.accumulated) && d.accumulated.length
    ? d.accumulated.map(x=>({
        club: x.club || x.team || x.equipo || '',
        series: x.series || x.seriesCount || '',
        pj: Number(x.pj||0),
        pg: Number(x.pg||0),
        pe: Number(x.pe||0),
        pp: Number(x.pp||0),
        gf: Number(x.gf||0),
        gc: Number(x.gc||0),
        dg: Number(x.dg ?? x.df ?? ((Number(x.gf||0))-(Number(x.gc||0)))),
        pts: Number(x.pts||0)
      })).sort((a,b)=>(b.pts-a.pts)||(b.dg-a.dg)||(b.gf-a.gf))
    : calcularAcumuladaTodosLosClubes();

  if(!rows.length){
    tbody.innerHTML = '<tr><td colspan="10">Sin datos para tabla acumulada.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((r,i)=>`
    <tr class="${/r\.?\s*m[eé]ndez|ricardo/i.test(r.club) ? 'club-highlight-row' : ''}">
      <td>${i+1}</td>
      <td>${r.club}</td>
      <td>${r.series || ''}</td>
      <td>${r.pj || 0}</td>
      <td>${r.pg || 0}</td>
      <td>${r.pe || 0}</td>
      <td>${r.pp || 0}</td>
      <td>${r.gf || 0}</td>
      <td>${r.gc || 0}</td>
      <td>${r.dg || 0}</td>
      <td><strong>${r.pts || 0}</strong></td>
    </tr>
  `).join('');
}

function asegurarCabeceraAcumuladaTodosClubes(){
  const tbody = document.getElementById('cumulativeRows');
  if(!tbody) return;
  const table = tbody.closest('table');
  if(!table) return;
  const thead = table.querySelector('thead');
  if(thead && !thead.dataset.acumuladaTodosClubes){
    thead.innerHTML = `
      <tr>
        <th>POS</th>
        <th>CLUB</th>
        <th>SERIES</th>
        <th>PJ</th>
        <th>G</th>
        <th>E</th>
        <th>P</th>
        <th>GF</th>
        <th>GC</th>
        <th>DG</th>
        <th>PTS</th>
      </tr>
    `;
    thead.dataset.acumuladaTodosClubes = '1';
  }
}

function actualizarAcumuladaTodosClubes(){
  asegurarCabeceraAcumuladaTodosClubes();
  renderAcumuladaTodosLosClubes();
}

if(typeof renderPublic === 'function' && !window.__acumuladaTodosClubesFinal){
  window.__acumuladaTodosClubesFinal = true;
  const oldRenderPublicAcumuladaTodos = renderPublic;
  renderPublic = function(){
    oldRenderPublicAcumuladaTodos();
    actualizarAcumuladaTodosClubes();
  };
}

document.addEventListener('DOMContentLoaded', ()=>{
  setTimeout(actualizarAcumuladaTodosClubes, 800);
  setTimeout(actualizarAcumuladaTodosClubes, 1800);
});


/* =========================================================
   FINAL REFORZADO - ESTABILIDAD GENERAL
========================================================= */
function finalEsc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function finalNorm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function finalUniqueByName(list){
  const seen=new Set();
  return (Array.isArray(list)?list:[]).filter(x=>{
    const k=finalNorm(x.name||x.title||x.club||x.team||JSON.stringify(x));
    if(!k || seen.has(k)) return false;
    seen.add(k); return true;
  });
}
function finalIsStandingResult(r){
  if(!r) return false;
  const m=finalNorm(r.match||r.match_text||r.title||'');
  const d=String(r.date||r.date_text||'').trim();
  const s=String(r.score||'').trim();
  const g=finalNorm(r.scorers||'');
  const series=['super senior','senior 35','1 infantil','2 infantil','peques','juveniles','serie de oro','serie damas','2 adulta','1 adulta','serie platino','serie de honor','tabla general','resumen general'];
  return series.some(x=>m.includes(x)) || g.includes('planilla oficial') || (/^[0-9]+$/.test(d)&&/^[0-9]+$/.test(s));
}
function finalCleanPublicData(){
  const d=getData();
  d.sponsors=finalUniqueByName(d.sponsors);
  d.news=finalUniqueByName(d.news);
  d.results=(Array.isArray(d.results)?d.results:[]).filter(r=>!finalIsStandingResult(r));
  try{saveData(d);}catch(e){}
  return d;
}
function finalCalculateAccumulatedAllClubs(d){
  d=d||getData();
  if(Array.isArray(d.accumulated)&&d.accumulated.length){
    return d.accumulated.sort((a,b)=>(+b.pts||0)-(+a.pts||0)||(+b.dg||0)-(+a.dg||0)||(+b.gf||0)-(+a.gf||0));
  }
  const clubs={};
  Object.values(d.standings||{}).forEach(rows=>{
    if(!Array.isArray(rows))return;
    rows.forEach(r=>{
      const club=String(r.team||r.club||r.equipo||'').trim();
      if(!club||club.toLowerCase()==='total')return;
      const key=finalNorm(club).replace('ricardo mendez','r. mendez');
      if(!clubs[key])clubs[key]={club:club.replace(/^Ricardo\s+M[eé]ndez$/i,'R. Méndez'),series:0,pj:0,pg:0,pe:0,pp:0,gf:0,gc:0,dg:0,pts:0};
      clubs[key].series++;
      clubs[key].pj+=+r.pj||0; clubs[key].pg+=+(r.pg??r.g)||0; clubs[key].pe+=+(r.pe??r.e)||0; clubs[key].pp+=+(r.pp??r.p)||0;
      clubs[key].gf+=+r.gf||0; clubs[key].gc+=+r.gc||0; clubs[key].dg+=+(r.dg??r.df??((+r.gf||0)-(+r.gc||0)))||0; clubs[key].pts+=+r.pts||0;
    });
  });
  return Object.values(clubs).sort((a,b)=>(b.pts-a.pts)||(b.dg-a.dg)||(b.gf-a.gf)||(a.gc-b.gc));
}
function finalRenderAccumulated(){
  const tb=document.getElementById('cumulativeRows'); if(!tb)return;
  const rows=finalCalculateAccumulatedAllClubs(getData());
  const table=tb.closest('table'); const th=table?.querySelector('thead');
  if(th) th.innerHTML='<tr><th>POS</th><th>CLUB</th><th>SERIES</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>PTS</th></tr>';
  tb.innerHTML=rows.length?rows.map((r,i)=>`<tr class="${/r\.?\s*m[eé]ndez|ricardo/i.test(r.club)?'club-highlight-row':''}"><td>${i+1}</td><td>${finalEsc(r.club)}</td><td>${r.series||''}</td><td>${r.pj||0}</td><td>${r.pg||0}</td><td>${r.pe||0}</td><td>${r.pp||0}</td><td>${r.gf||0}</td><td>${r.gc||0}</td><td>${r.dg||0}</td><td><b>${r.pts||0}</b></td></tr>`).join(''):'<tr><td colspan="11">Sin datos acumulados.</td></tr>';
}
function finalRenderSponsorsUnique(){
  const d=getData();
  const sponsors=finalUniqueByName(d.sponsors);
  const render=(el)=>{if(!el)return;el.innerHTML=sponsors.length?sponsors.map(s=>`<article class="sponsor-card"><div class="sponsor-logo-box">${s.url?`<img class="sponsor-img" src="${finalEsc(s.url)}" alt="${finalEsc(s.name||'Auspiciador')}" loading="lazy">`:`<div class="sponsor-fallback">${finalEsc(s.name||'AUSPICIADOR')}</div>`}</div><h3>${finalEsc(s.name||'')}</h3></article>`).join(''):'<div class="empty-state">Auspiciadores pendientes.</div>';};
  render(document.getElementById('sponsorsBottomGrid'));
}
function finalRenderDirectiva(){
  const d=getData();
  let el=document.getElementById('directorsGrid')||document.getElementById('directivaGrid')||document.getElementById('directivaList');
  if(!el){const sec=document.getElementById('directiva')||document.getElementById('directors'); if(sec){el=document.createElement('div');el.id='directorsGrid';el.className='directors-grid';sec.appendChild(el);}}
  if(!el)return;
  const list=Array.isArray(d.directors)?d.directors:[];
  el.innerHTML=list.length?list.map(x=>`<article class="director-card"><span>${finalEsc(x.role||'Cargo')}</span><strong>${finalEsc(x.name||'')}</strong></article>`).join(''):'<div class="empty-state">Directiva pendiente de cargar.</div>';
}
function finalFixMobileAndLogos(){
  document.querySelectorAll('.match-logo-img,.match-team img,#nextMatchCard img,.next-match-card img').forEach(img=>{img.style.objectFit='contain';img.style.objectPosition='center';img.style.width='auto';img.style.height='auto';img.style.maxWidth=innerWidth<780?'76px':'112px';img.style.maxHeight=innerWidth<780?'76px':'112px';});
  document.querySelectorAll('.hero-logo,.main-logo,.club-logo,.escudo-central,.big-logo,.watermark-logo').forEach(img=>{img.style.opacity='1';img.style.mixBlendMode='normal';});
}
function finalStatus(){
  const el=document.getElementById('systemStatusText');
  if(el)el.textContent='Sitio actualizado · Acumulada general por todos los clubes · Puntajes y Resultados separados.';
}
function finalRunAll(){
  finalCleanPublicData();
  finalRenderAccumulated();
  finalRenderSponsorsUnique();
  finalRenderDirectiva();
  finalFixMobileAndLogos();
  finalStatus();
}
if(typeof renderPublic==='function'&&!window.__finalReforzadoRender){
  window.__finalReforzadoRender=true;
  const old=renderPublic;
  renderPublic=function(){old();finalRunAll();};
}
document.addEventListener('DOMContentLoaded',()=>{setTimeout(finalRunAll,700);setTimeout(finalRunAll,1800);setTimeout(finalRunAll,3200);});


/* =========================================================
   REVISION PROFUNDA FINAL - SEPARACION REAL PUNTAJES / RESULTADOS
   - Resultados: solo marcadores reales de partidos.
   - Puntajes/Posiciones: tablas por serie.
   - Acumulada: todos los clubes en competencia.
========================================================= */
(function(){
  if(window.__RM_DEEP_FINAL_PUBLIC__) return;
  window.__RM_DEEP_FINAL_PUBLIC__ = true;

  function txt(v){
    return String(v || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/\s+/g,' ')
      .trim();
  }

  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function normalizeClubName(name){
    return String(name || '')
      .trim()
      .replace(/\s+/g,' ')
      .replace(/^Ricardo\s+M[eé]ndez$/i,'R. Méndez')
      .replace(/^R\.?\s*M[eé]ndez$/i,'R. Méndez')
      .replace(/^Manzana\s*T\.?$/i,'Manzana T.')
      .replace(/^Cruz\s+Azul$/i,'Cruz Azul');
  }

  function getSeriesNames(){
    const d = (typeof getData === 'function') ? getData() : {};
    const fromStandings = Object.keys(d.standings || {});
    const fallback = [
      'Super Senior','Senior 35','1° Infantil','2° Infantil','Peques','Juveniles',
      'Serie de Oro','Serie Damas','2° Adulta','1° Adulta','Serie Platino','Serie de Honor',
      'Primera Infantil','Segunda Infantil','Primera Adultos','Segunda Adultos',
      'Honor','Platinos','Serie Oro'
    ];
    return [...new Set([...fromStandings, ...fallback])].map(txt);
  }

  function isStandingLikeResult(r){
    if(!r) return false;
    const match = txt(r.match || r.match_text || r.title || r.serie || '');
    const date = String(r.date || r.date_text || '').trim();
    const score = String(r.score || r.resultado || '').trim();
    const scorers = txt(r.scorers || r.goleadores || r.description || '');
    const teams = txt(`${r.team || ''} ${r.club || ''} ${r.equipo || ''}`);

    const series = getSeriesNames();
    const looksLikeSeries = series.some(s => s && (match === s || match.includes(s) || teams.includes(s)));
    const hasStandingWords = /(tabla|posicion|puntaje|puntos|serie|resumen general|planilla oficial)/i.test(match + ' ' + scorers);
    const onlyNumbers = /^[0-9]+$/.test(date) && /^[0-9]+$/.test(score);

    // True match results usually have "vs", "-", ":", or club names. Do not remove those.
    const looksLikeRealMatch = /( vs | v\/s |-|:)/i.test(String(r.match || '')) && /\d+\s*[-:]\s*\d+/.test(score);

    return !looksLikeRealMatch && (looksLikeSeries || hasStandingWords || onlyNumbers);
  }

  function cleanResultsInMemory(){
    if(typeof getData !== 'function') return {};
    const d = getData();
    d.results = Array.isArray(d.results) ? d.results.filter(r => !isStandingLikeResult(r)) : [];
    // Remove duplicated sponsors by name
    if(Array.isArray(d.sponsors)){
      const seen = new Set();
      d.sponsors = d.sponsors.filter(s => {
        const key = txt(s.name || s.title || JSON.stringify(s));
        if(!key || seen.has(key)) return false;
        seen.add(key); return true;
      });
    }
    try{ if(typeof saveData === 'function') saveData(d); }catch(e){}
    return d;
  }

  function calculateAccumulatedAllClubs(){
    const d = cleanResultsInMemory();
    if(Array.isArray(d.accumulated) && d.accumulated.length){
      return d.accumulated.map(x => ({
        club: normalizeClubName(x.club || x.team || x.equipo || ''),
        series: Number(x.series || x.seriesCount || 0),
        pj: Number(x.pj || 0),
        pg: Number(x.pg || x.g || 0),
        pe: Number(x.pe || x.e || 0),
        pp: Number(x.pp || x.p || 0),
        gf: Number(x.gf || 0),
        gc: Number(x.gc || 0),
        dg: Number(x.dg ?? x.df ?? ((Number(x.gf||0))-(Number(x.gc||0)))),
        pts: Number(x.pts || x.puntos || 0)
      })).filter(x=>x.club).sort((a,b)=>(b.pts-a.pts)||(b.dg-a.dg)||(b.gf-a.gf)||(a.gc-b.gc));
    }

    const standings = d.standings || {};
    const clubs = {};
    Object.entries(standings).forEach(([serie, rows]) => {
      if(!Array.isArray(rows)) return;
      rows.forEach(r => {
        const club = normalizeClubName(r.team || r.club || r.equipo || '');
        if(!club || txt(club) === 'total') return;
        const key = txt(club);
        if(!clubs[key]){
          clubs[key] = { club, series:0, pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, dg:0, pts:0 };
        }
        clubs[key].series += 1;
        clubs[key].pj += Number(r.pj || 0);
        clubs[key].pg += Number(r.pg ?? r.g ?? 0);
        clubs[key].pe += Number(r.pe ?? r.e ?? 0);
        clubs[key].pp += Number(r.pp ?? r.p ?? 0);
        clubs[key].gf += Number(r.gf || 0);
        clubs[key].gc += Number(r.gc || 0);
        clubs[key].dg += Number(r.dg ?? r.df ?? ((Number(r.gf||0))-(Number(r.gc||0))));
        clubs[key].pts += Number(r.pts || r.puntos || 0);
      });
    });
    return Object.values(clubs).sort((a,b)=>(b.pts-a.pts)||(b.dg-a.dg)||(b.gf-a.gf)||(a.gc-b.gc));
  }

  function renderAccumulatedAllClubs(){
    const tbody = document.getElementById('cumulativeRows');
    if(!tbody) return;
    const table = tbody.closest('table');
    const thead = table && table.querySelector('thead');
    if(thead){
      thead.innerHTML = `<tr>
        <th>POS</th><th>CLUB</th><th>SERIES</th><th>PJ</th><th>G</th><th>E</th><th>P</th>
        <th>GF</th><th>GC</th><th>DG</th><th>PTS</th>
      </tr>`;
    }
    const rows = calculateAccumulatedAllClubs();
    tbody.innerHTML = rows.length ? rows.map((r,i)=>`
      <tr class="${/r\.?\s*m[eé]ndez|ricardo/i.test(r.club) ? 'club-highlight-row' : ''}">
        <td>${i+1}</td><td>${esc(r.club)}</td><td>${r.series || ''}</td><td>${r.pj}</td>
        <td>${r.pg}</td><td>${r.pe}</td><td>${r.pp}</td><td>${r.gf}</td><td>${r.gc}</td>
        <td>${r.dg}</td><td><strong>${r.pts}</strong></td>
      </tr>`).join('') : `<tr><td colspan="11">Sin datos para tabla acumulada.</td></tr>`;
  }

  function renderRankingBySeries(){
    const tbody = document.getElementById('seriesRankingRows');
    if(!tbody || typeof getData !== 'function') return;
    const d = cleanResultsInMemory();
    const rows = [];
    Object.entries(d.standings || {}).forEach(([serie, list])=>{
      if(!Array.isArray(list)) return;
      const sorted = [...list].sort((a,b)=>(Number(b.pts)||0)-(Number(a.pts)||0)||(Number(b.dg)||0)-(Number(a.dg)||0));
      const idx = sorted.findIndex(r => /r\.?\s*m[eé]ndez|ricardo/i.test(String(r.team||r.club||'')));
      if(idx >= 0){
        const r = sorted[idx];
        rows.push({serie, position:idx+1, pj:r.pj||0, pts:r.pts||0, dg:r.dg||0});
      }
    });
    rows.sort((a,b)=>(Number(b.pts)||0)-(Number(a.pts)||0)||(Number(a.position)||99)-(Number(b.position)||99));
    tbody.innerHTML = rows.length ? rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.serie)}</td><td>${r.position}°</td><td>${r.pj}</td><td><strong>${r.pts}</strong></td><td>${r.dg}</td></tr>`).join('') : `<tr><td colspan="6">Sin datos de ranking.</td></tr>`;
  }

  function hideDuplicatedSponsors(){
    document.querySelectorAll('section,.section').forEach(sec=>{
      const hasSponsorGrid = sec.querySelector('#sponsorsGrid');
      const isBottom = sec.id === 'sponsorsBottomSection' || sec.querySelector('#sponsorsBottomGrid');
      const hasTicker = sec.querySelector('#sponsorTicker') || sec.className.includes('ticker');
      if(hasSponsorGrid && !isBottom && !hasTicker) sec.classList.add('hide-duplicate-sponsors');
    });
  }

  function runDeepPublic(){
    cleanResultsInMemory();
    renderAccumulatedAllClubs();
    renderRankingBySeries();
    hideDuplicatedSponsors();
  }

  if(typeof renderPublic === 'function'){
    const old = renderPublic;
    renderPublic = function(){
      const result = old.apply(this, arguments);
      runDeepPublic();
      return result;
    };
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(runDeepPublic, 400);
    setTimeout(runDeepPublic, 1200);
    setTimeout(runDeepPublic, 2500);
  });

  window.rmDeepFinalCleanResults = cleanResultsInMemory;
  window.rmDeepFinalAccumulatedAllClubs = calculateAccumulatedAllClubs;
})();


/* FIX 3 PUNTOS HISTORIA NOTICIAS MOVIL */
(function(){
  if(window.__RM_FIX_3_PUNTOS__) return; window.__RM_FIX_3_PUNTOS__=true;
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function data(){try{return typeof getData==='function'?getData():{}}catch(e){return {}}}

  function ensureHistory(){
    let sec=document.getElementById('historyPrincipalSection');
    const main=document.querySelector('main')||document.body;
    if(!sec){
      sec=document.createElement('section'); sec.id='historyPrincipalSection'; sec.className='section history-principal-section';
      sec.innerHTML='<div class="history-principal-card"><div class="history-principal-text"><span class="eyebrow">Historia del Club</span><h2>Club Deportivo Ricardo Méndez</h2><p id="historyPrincipalText"></p><a href="#historySection" class="history-principal-btn">Ver historia completa</a></div><div class="history-principal-media" id="historyPrincipalMedia"></div></div>';
      main.prepend(sec);
    }
    const first=[...main.children].find(x=>x.tagName&&x.tagName.toLowerCase()==='section'&&x.id!=='historyPrincipalSection');
    if(first && first.previousElementSibling!==sec) main.insertBefore(sec, first);
  }

  function renderHistory(){
    ensureHistory();
    const d=data();
    const text=d.history?.text||d.historyText||d.settings?.historyText||'El Club Deportivo Ricardo Méndez fue fundado el 12 de agosto de 1932. Desde sus inicios ha sido una institución deportiva y social de San Carlos, formada por familias, jugadores, socios, dirigentes e hinchas que han mantenido viva su identidad, su historia y su compromiso con el fútbol amateur.';
    const img=d.history?.url||d.history?.image||d.historyImage||d.logo||'logo_ricardo_mendez.png';
    const t=document.getElementById('historyPrincipalText'), m=document.getElementById('historyPrincipalMedia');
    if(t) t.textContent=text.length>520?text.slice(0,520).trim()+'…':text;
    if(m) m.innerHTML=img?'<img src="'+esc(img)+'" alt="Historia Club Deportivo Ricardo Méndez" loading="lazy">':'';
  }

  function compactNews(){
    document.querySelectorAll('section,.section').forEach(sec=>{
      const tx=(sec.textContent||'').toLowerCase(), id=(sec.id||'').toLowerCase(), cl=(sec.className||'').toString().toLowerCase();
      if(id.includes('news')||id.includes('noticia')||cl.includes('news')||cl.includes('noticia')||tx.includes('noticias')) sec.classList.add('news-section-compact-final');
    });
    document.querySelectorAll('.news-card,.noticia-card,.card-news,[data-news-card],article').forEach(card=>{
      const cl=(card.className||'').toString().toLowerCase(), tx=(card.textContent||'').toLowerCase();
      if(cl.includes('news')||cl.includes('noticia')||tx.includes('noticia')){
        card.classList.add('news-compact-final');
        card.querySelectorAll('img').forEach(img=>img.classList.add('news-img-compact-final'));
      }
    });
  }

  function fixMobile(){
    const mobile=innerWidth<=900;
    document.documentElement.classList.toggle('rm-mobile-safe',mobile);
    if(!mobile) return;
    document.querySelectorAll('nav,aside,.sidebar,.side-menu,.left-menu,[class*="sidebar"],[class*="side-menu"],[class*="left"]').forEach(el=>{
      const r=el.getBoundingClientRect(), st=getComputedStyle(el);
      if(r.left<=5 && r.width>25 && r.width<140 && r.height>innerHeight*.35 && (st.position==='fixed'||st.position==='sticky'||r.height>innerHeight*.55)){
        el.classList.add('rm-bottom-mobile-nav');
      }
    });
    document.querySelectorAll('main,.main,.content,.page,.site-content,.public-content,.sections,.app,#app,body').forEach(el=>el.classList.add('rm-mobile-fullwidth'));
    document.querySelectorAll('table').forEach(table=>{ if(table.parentElement) table.parentElement.classList.add('rm-table-scroll'); });
    document.querySelectorAll('.match-logo-img,.match-team img,#nextMatchCard img,.next-match-card img').forEach(img=>{
      img.style.objectFit='contain'; img.style.objectPosition='center'; img.style.maxWidth='72px'; img.style.maxHeight='72px'; img.style.width='auto'; img.style.height='auto';
    });
  }

  function run(){renderHistory();compactNews();fixMobile();}
  if(typeof renderPublic==='function'){const old=renderPublic; renderPublic=function(){const r=old.apply(this,arguments); run(); return r;};}
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(run,300);setTimeout(run,1200);setTimeout(run,2600);});
  window.addEventListener('resize',()=>setTimeout(fixMobile,120));
})();


/* =========================================================
   MUSICA SUPERIOR - HIMNO RM
   Botón superior Play/Pausa. No reproduce automático.
========================================================= */
(function(){
  if(window.__RM_TOP_MUSIC_PLAYER__) return;
  window.__RM_TOP_MUSIC_PLAYER__ = true;

  function initTopMusicPlayer(){
    const audio = document.getElementById('clubMusicAudio');
    const btn = document.getElementById('musicToggleBtn');
    const icon = document.getElementById('musicIcon');
    const vol = document.getElementById('musicVolume');
    const wrap = document.getElementById('topMusicPlayer');

    if(!audio || !btn || !icon || !vol || !wrap || btn.dataset.ready) return;
    btn.dataset.ready = '1';

    audio.volume = Number(vol.value || 0.35);
    audio.loop = true;

    vol.addEventListener('input', ()=>{
      audio.volume = Number(vol.value || 0.35);
    });

    btn.addEventListener('click', async ()=>{
      try{
        if(audio.paused){
          await audio.play();
          icon.textContent = '⏸';
          btn.classList.add('playing');
          wrap.classList.add('playing');
        }else{
          audio.pause();
          icon.textContent = '▶';
          btn.classList.remove('playing');
          wrap.classList.remove('playing');
        }
      }catch(e){
        icon.textContent = '▶';
        btn.classList.remove('playing');
        wrap.classList.remove('playing');
        alert('Presiona nuevamente para activar la música.');
      }
    });

    audio.addEventListener('ended', ()=>{
      icon.textContent = '▶';
      btn.classList.remove('playing');
      wrap.classList.remove('playing');
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(initTopMusicPlayer, 250);
    setTimeout(initTopMusicPlayer, 1200);
  });
})();


/* MOBILE FINAL + CONTRASTE AZUL OSCURO */
(function(){
  if(window.__RM_MOBILE_CONTRASTE_FINAL__) return; window.__RM_MOBILE_CONTRASTE_FINAL__=true;
  function mobile(){return window.innerWidth<=920;}
  function force(){
    const isM=mobile(); document.documentElement.classList.toggle('rm-mobile-final',isM); document.body.classList.toggle('rm-mobile-final-body',isM);
    if(!isM) return;
    document.querySelectorAll('aside,nav,.sidebar,.side-menu,.left-menu,.vertical-menu,[class*="sidebar"],[class*="side-menu"],[class*="left-menu"]').forEach(el=>{
      const r=el.getBoundingClientRect(), st=getComputedStyle(el);
      const left=(r.left<=8&&r.width>=28&&r.width<=170&&r.height>=innerHeight*.35)||(st.position==='fixed'&&r.left<=8&&r.width<=190);
      if(left){el.classList.add('rm-force-bottom-nav');Object.assign(el.style,{position:'fixed',left:'0',right:'0',bottom:'0',top:'auto',width:'100vw',maxWidth:'100vw',height:'60px',minHeight:'60px',zIndex:'999999',overflowX:'auto',overflowY:'hidden'});}
    });
    document.querySelectorAll('body,main,#app,.app,.page,.main,.content,.site-content,.public-content,.sections,.container,.wrapper,.layout,.dashboard,.home,.homepage').forEach(el=>{
      el.classList.add('rm-force-full-mobile'); Object.assign(el.style,{maxWidth:'100%',width:'100%',marginLeft:'0',marginRight:'0',left:'0',right:'0',transform:'none',boxSizing:'border-box'});
    });
    document.querySelectorAll('section,.section,.card,.panel,.box,.glass,.fixture-card,.news-card,.sponsor-card,.history-principal-card').forEach(el=>{el.style.maxWidth='100%';el.style.boxSizing='border-box';});
    document.querySelectorAll('table').forEach(t=>{t.classList.add('rm-mobile-table'); if(t.parentElement)t.parentElement.classList.add('rm-mobile-table-wrap');});
    document.querySelectorAll('img').forEach(img=>img.style.maxWidth='100%');
    document.querySelectorAll('.match-logo-img,.match-team img,#nextMatchCard img,.next-match-card img').forEach(img=>Object.assign(img.style,{objectFit:'contain',objectPosition:'center',width:'auto',height:'auto',maxWidth:'70px',maxHeight:'70px'}));
    const music=document.getElementById('topMusicPlayer'); if(music) Object.assign(music.style,{top:'7px',right:'7px',transform:'scale(.88)',transformOrigin:'top right'});
  }
  function contrast(){
    document.querySelectorAll('.blue-text,.neon,.section-title,h1,h2,h3,.title,.subtitle,.menu a,.sidebar a,.side-menu a,.stat span,.metric span,[class*="blue"],[class*="celeste"],[class*="cyan"]').forEach(el=>el.classList.add('rm-dark-blue-text'));
  }
  function run(){force();contrast();}
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(run,250);setTimeout(run,900);setTimeout(run,2200);});
  window.addEventListener('resize',()=>setTimeout(run,120));
})();


/* =========================================================
   RELOJ Y FECHA - SIN CUENTA REGRESIVA
========================================================= */
(function(){
  if(window.__RM_RELOJ_FECHA_SIN_CUENTA__) return;
  window.__RM_RELOJ_FECHA_SIN_CUENTA__ = true;

  function ensureClockBox(){
    let box = document.getElementById('topDateClock');
    if(!box){
      box = document.createElement('div');
      box.id = 'topDateClock';
      box.className = 'top-date-clock';
      box.innerHTML = '<div class="clock-icon">🕒</div><div><strong id="siteClock24">00:00:00</strong><span id="siteDateText">Fecha actual</span></div>';
      document.body.prepend(box);
    }

    // Eliminar visualmente cualquier cuenta regresiva anterior
    document.querySelectorAll('#countdownSection,#matchCountdown,#nextMatchCountdownClock,#nextMatchCountdownInline,.countdown-section,.countdown-box,.countdown-inline').forEach(el=>{
      el.style.display = 'none';
      el.setAttribute('aria-hidden','true');
    });
  }

  function updateClockDate(){
    ensureClockBox();
    const now = new Date();
    const clock = document.getElementById('siteClock24');
    const date = document.getElementById('siteDateText');

    const hh = String(now.getHours()).padStart(2,'0');
    const mm = String(now.getMinutes()).padStart(2,'0');
    const ss = String(now.getSeconds()).padStart(2,'0');

    if(clock) clock.textContent = `${hh}:${mm}:${ss}`;

    const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const txt = `${dias[now.getDay()]}, ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;
    if(date) date.textContent = txt;
  }

  // Bloquear funciones antiguas de cuenta regresiva si existen
  window.proRenderCountdown = function(){};
  window.ovfRenderClock = function(){ updateClockDate(); };

  document.addEventListener('DOMContentLoaded', ()=>{
    updateClockDate();
    setInterval(updateClockDate, 1000);
    setTimeout(updateClockDate, 800);
    setTimeout(updateClockDate, 1800);
  });
})();


/* =========================================================
   FIX DIRECTIVA PUBLICA
   Muestra en la página web la Directiva cargada en Admin.
========================================================= */
(function(){
  if(window.__RM_FIX_DIRECTIVA_PUBLICA__) return;
  window.__RM_FIX_DIRECTIVA_PUBLICA__ = true;

  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function normPerson(x){
    if(!x) return null;
    const name = x.name || x.nombre || x.full_name || x.person || x.dirigente || x.title || '';
    const role = x.role || x.cargo || x.position || x.puesto || x.tipo || x.subtitle || 'Directiva';
    const phone = x.phone || x.telefono || x.whatsapp || '';
    const img = x.url || x.image || x.photo || x.foto || '';
    if(!String(name).trim() && !String(role).trim()) return null;
    return {name:String(name).trim(), role:String(role).trim(), phone:String(phone).trim(), img:String(img).trim()};
  }

  function getLocalDirectiva(){
    let d = {};
    try{ d = typeof getData === 'function' ? getData() : {}; }catch(e){ d = {}; }

    const candidates = [
      d.directors,
      d.directiva,
      d.board,
      d.directive,
      d.management,
      d.dirigentes,
      d.settings && d.settings.directors,
      d.settings && d.settings.directiva,
      d.club && d.club.directors,
      d.club && d.club.directiva
    ];

    let list = [];
    for(const c of candidates){
      if(Array.isArray(c) && c.length){
        list = c;
        break;
      }
    }

    return list.map(normPerson).filter(Boolean);
  }

  function ensureDirectivaSection(){
    let section = document.getElementById('directivaPublicSection');
    if(!section){
      section = document.createElement('section');
      section.id = 'directivaPublicSection';
      section.className = 'section directiva-public-section';
      section.innerHTML = `
        <div class="section-head">
          <h2>Directiva Actual</h2>
          <p>Dirigentes del Club Deportivo Ricardo Méndez</p>
        </div>
        <div id="directivaPublicGrid" class="directiva-public-grid"></div>
      `;
      const history = document.getElementById('historyPrincipalSection');
      if(history && history.parentNode){
        history.insertAdjacentElement('afterend', section);
      }else{
        const main = document.querySelector('main') || document.body;
        main.prepend(section);
      }
    }

    let grid = document.getElementById('directivaPublicGrid');
    if(!grid){
      grid = document.createElement('div');
      grid.id = 'directivaPublicGrid';
      grid.className = 'directiva-public-grid';
      section.appendChild(grid);
    }
    return grid;
  }

  function renderDirectiva(list){
    const grid = ensureDirectivaSection();

    if(!list || !list.length){
      grid.innerHTML = '<div class="empty-state">Directiva pendiente de cargar desde Admin.</div>';
      return;
    }

    grid.innerHTML = list.map(p => `
      <article class="directiva-public-card">
        ${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy">` : `<div class="directiva-avatar">RM</div>`}
        <div>
          <span>${esc(p.role || 'Directiva')}</span>
          <strong>${esc(p.name || '')}</strong>
          ${p.phone ? `<small>${esc(p.phone)}</small>` : ''}
        </div>
      </article>
    `).join('');

    // También llenar contenedores antiguos si existen
    document.querySelectorAll('#directorsGrid,#directivaGrid,#directivaList,.directors-grid').forEach(el=>{
      if(el.id === 'directivaPublicGrid') return;
      el.innerHTML = grid.innerHTML;
    });
  }

  async function loadDirectivaFromSupabase(){
    // Primero muestra lo local
    const local = getLocalDirectiva();
    if(local.length){
      renderDirectiva(local);
      return local;
    }

    // Si existe Supabase client, buscar en varias tablas posibles
    const tables = ['directors','directiva','board','dirigentes'];
    const client = window.supabaseClient || window.supabase || null;

    if(client && typeof client.from === 'function'){
      for(const table of tables){
        try{
          const {data, error} = await client.from(table).select('*');
          if(!error && Array.isArray(data) && data.length){
            const list = data.map(normPerson).filter(Boolean);
            if(list.length){
              // Guardar local para que renderice más rápido después
              try{
                const d = typeof getData === 'function' ? getData() : {};
                d.directors = list.map(x=>({name:x.name, role:x.role, phone:x.phone, url:x.img}));
                if(typeof saveData === 'function') saveData(d);
              }catch(e){}
              renderDirectiva(list);
              return list;
            }
          }
        }catch(e){}
      }
    }

    renderDirectiva([]);
    return [];
  }

  function runDirectivaFix(){
    const local = getLocalDirectiva();
    renderDirectiva(local);
    loadDirectivaFromSupabase();
  }

  if(typeof renderPublic === 'function'){
    const oldRenderPublicDirectiva = renderPublic;
    renderPublic = function(){
      const r = oldRenderPublicDirectiva.apply(this, arguments);
      setTimeout(runDirectivaFix, 100);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(runDirectivaFix, 400);
    setTimeout(runDirectivaFix, 1200);
    setTimeout(runDirectivaFix, 2500);
  });

  window.rmRenderDirectivaPublica = runDirectivaFix;
})();


/* =========================================================
   FIX DIRECTIVA PUBLICA REFORZADA - REVISION FINAL
   Garantiza que la directiva del Admin aparezca en la web pública.
========================================================= */
(function(){
  if(window.__RM_FIX_DIRECTIVA_REFORZADA_FINAL__) return;
  window.__RM_FIX_DIRECTIVA_REFORZADA_FINAL__ = true;

  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function tryJson(v){
    if(!v || typeof v !== 'string') return null;
    try{ return JSON.parse(v); }catch(e){ return null; }
  }

  function asArray(v){
    if(!v) return [];
    if(Array.isArray(v)) return v;
    const j = tryJson(v);
    if(Array.isArray(j)) return j;
    if(j && typeof j === 'object') return Object.values(j);
    if(typeof v === 'object') return Object.values(v);
    return [];
  }

  function normPerson(x){
    if(!x || typeof x !== 'object') return null;
    const name = x.name || x.nombre || x.full_name || x.person || x.dirigente || x.titulo || x.title || x.valor || '';
    const role = x.role || x.cargo || x.position || x.puesto || x.tipo || x.subtitle || x.label || 'Directiva';
    const phone = x.phone || x.telefono || x.whatsapp || x.celular || '';
    const img = x.url || x.image || x.photo || x.foto || x.img || '';
    if(!String(name).trim()) return null;
    return {name:String(name).trim(), role:String(role || 'Directiva').trim(), phone:String(phone).trim(), img:String(img).trim()};
  }

  function getDataSafe(){
    try{ return typeof getData === 'function' ? getData() : {}; }catch(e){ return {}; }
  }

  function getDirectivaLocal(){
    const d = getDataSafe();
    const candidates = [
      d.directors, d.directiva, d.board, d.directive, d.management, d.dirigentes,
      d.currentDirectors, d.currentBoard,
      d.settings && d.settings.directors,
      d.settings && d.settings.directiva,
      d.settings && d.settings.board,
      d.settings && d.settings.dirigentes,
      d.club && d.club.directors,
      d.club && d.club.directiva
    ];
    let list = [];
    for(const c of candidates){
      const arr = asArray(c).map(normPerson).filter(Boolean);
      if(arr.length){ list = arr; break; }
    }

    // Fallback: campos sueltos tipo presidente/tesorero/secretario
    if(!list.length){
      const s = d.settings || d.club || d;
      const roles = [
        ['Presidente', s.president || s.presidente || s.nombrePresidente],
        ['Vicepresidente', s.vicepresident || s.vicepresidente],
        ['Secretario', s.secretary || s.secretario],
        ['Tesorero', s.treasurer || s.tesorero],
        ['Delegado', s.delegate || s.delegado]
      ];
      list = roles.filter(x=>x[1]).map(x=>({role:x[0], name:String(x[1]), phone:'', img:''}));
    }
    return list;
  }

  function ensureSection(){
    let section = document.getElementById('directivaPublicSection');
    if(!section){
      section = document.createElement('section');
      section.id = 'directivaPublicSection';
      section.className = 'section directiva-public-section';
      section.innerHTML = '<div class="section-head"><h2>Directiva Actual</h2><p>Dirigentes del Club Deportivo Ricardo Méndez</p></div><div id="directivaPublicGrid" class="directiva-public-grid"></div>';
    }
    const main = document.querySelector('main') || document.body;
    const history = document.getElementById('historyPrincipalSection');
    if(history && history.parentNode && section.previousElementSibling !== history){
      history.insertAdjacentElement('afterend', section);
    }else if(!section.parentNode){
      main.prepend(section);
    }
    let grid = document.getElementById('directivaPublicGrid');
    if(!grid){
      grid = document.createElement('div');
      grid.id = 'directivaPublicGrid';
      grid.className = 'directiva-public-grid';
      section.appendChild(grid);
    }
    return grid;
  }

  function render(list){
    const grid = ensureSection();
    if(!list || !list.length){
      grid.innerHTML = '<div class="empty-state">Directiva pendiente de cargar desde Admin.</div>';
      return;
    }
    const html = list.map(p => `
      <article class="directiva-public-card">
        ${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy">` : `<div class="directiva-avatar">RM</div>`}
        <div>
          <span>${esc(p.role || 'Directiva')}</span>
          <strong>${esc(p.name)}</strong>
          ${p.phone ? `<small>${esc(p.phone)}</small>` : ''}
        </div>
      </article>
    `).join('');
    grid.innerHTML = html;

    document.querySelectorAll('#directorsGrid,#directivaGrid,#directivaList,.directors-grid').forEach(el=>{
      if(el.id !== 'directivaPublicGrid') el.innerHTML = html;
    });
  }

  async function fetchSupabase(){
    try{
      if(typeof initSB === 'function') initSB();
    }catch(e){}
    const client = window.supabaseClient && typeof window.supabaseClient.from === 'function' ? window.supabaseClient : null;
    if(!client) return [];
    const tables = ['directors','directiva','board','dirigentes'];
    for(const table of tables){
      try{
        const {data, error} = await client.from(table).select('*');
        if(!error){
          const arr = asArray(data).map(normPerson).filter(Boolean);
          if(arr.length) return arr;
        }
      }catch(e){}
    }
    return [];
  }

  async function run(){
    let list = getDirectivaLocal();
    render(list);
    if(list.length) return list;
    list = await fetchSupabase();
    if(list.length){
      try{
        const d = getDataSafe();
        d.directors = list.map(x=>({name:x.name, role:x.role, phone:x.phone, url:x.img}));
        if(typeof saveData === 'function') saveData(d);
      }catch(e){}
      render(list);
    }
    return list;
  }

  // Ejecutar después de cargas de datos
  if(typeof renderPublic === 'function'){
    const old = renderPublic;
    renderPublic = function(){
      const r = old.apply(this, arguments);
      setTimeout(run, 50);
      setTimeout(run, 500);
      return r;
    };
  }

  if(typeof pullCloud === 'function'){
    const oldPull = pullCloud;
    pullCloud = async function(){
      const r = await oldPull.apply(this, arguments);
      setTimeout(run, 200);
      setTimeout(run, 900);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(run, 250);
    setTimeout(run, 1000);
    setTimeout(run, 2500);
    setTimeout(run, 4500);
  });

  window.rmRenderDirectivaPublicaFinal = run;
})();


/* =========================================================
   FIX MUSICA + HISTORIA UNICA + SIN MODO TV + ORDEN HISTORIA/PRESIDENTES/DIRECTIVA
========================================================= */
(function(){
  if(window.__RM_FIX_MUSICA_HISTORIA_ORDEN__) return;
  window.__RM_FIX_MUSICA_HISTORIA_ORDEN__ = true;

  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function data(){try{return typeof getData==='function'?getData():{}}catch(e){return {}}}
  function main(){return document.querySelector('main')||document.body;}

  function ensureMusic(){
    let wrap=document.getElementById('topMusicPlayer');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='topMusicPlayer';
      wrap.className='top-music-player';
      wrap.innerHTML='<button id="musicToggleBtn" type="button" aria-label="Reproducir himno Ricardo Méndez"><span id="musicIcon">▶</span><strong>Himno RM</strong></button><input id="musicVolume" type="range" min="0" max="1" step="0.05" value="0.60" aria-label="Volumen música"><audio id="clubMusicAudio" preload="auto" loop playsinline><source src="./assets/himno-rimen.mp3" type="audio/mpeg"><source src="assets/himno-rimen.mp3" type="audio/mpeg"></audio>';
      document.body.prepend(wrap);
    }
    const audio=document.getElementById('clubMusicAudio');
    const btn=document.getElementById('musicToggleBtn');
    const icon=document.getElementById('musicIcon');
    const vol=document.getElementById('musicVolume');
    if(!audio||!btn||!icon||!vol||btn.dataset.musicReady==='1') return;
    btn.dataset.musicReady='1';
    audio.volume=Number(vol.value||0.60);
    audio.loop=true;
    audio.load();
    vol.addEventListener('input',()=>{audio.volume=Number(vol.value||0.60);});
    btn.addEventListener('click',async()=>{
      try{
        audio.volume=Number(vol.value||0.60);
        if(audio.paused){
          audio.load();
          await audio.play();
          icon.textContent='⏸';
          btn.classList.add('playing');
          wrap.classList.add('playing');
        }else{
          audio.pause();
          icon.textContent='▶';
          btn.classList.remove('playing');
          wrap.classList.remove('playing');
        }
      }catch(e){
        console.warn('Audio no pudo iniciar:',e);
        icon.textContent='▶';
        btn.classList.remove('playing');
        wrap.classList.remove('playing');
        const msg=document.createElement('span');
        msg.className='music-hint';
        msg.textContent='Toca nuevamente';
        if(!wrap.querySelector('.music-hint')) wrap.appendChild(msg);
      }
    }, {passive:false});
  }

  function ensureSection(id, html){
    let sec=document.getElementById(id);
    if(!sec){
      const tmp=document.createElement('div');
      tmp.innerHTML=html.trim();
      sec=tmp.firstElementChild;
      main().prepend(sec);
    }
    return sec;
  }

  function ensureHistory(){
    const sec=ensureSection('historyPrincipalSection', '<section id="historyPrincipalSection" class="section history-principal-section"><div class="history-principal-card"><div class="history-principal-text"><span class="eyebrow">Historia del Club</span><h2>Club Deportivo Ricardo Méndez</h2><p id="historyPrincipalText"></p></div><div class="history-principal-media" id="historyPrincipalMedia"></div></div></section>');
    const d=data();
    const text=d.history?.text||d.historyText||d.settings?.historyText||'El Club Deportivo Ricardo Méndez fue fundado el 12 de agosto de 1932. Desde sus inicios ha sido una institución deportiva y social de San Carlos, formada por familias, jugadores, socios, dirigentes e hinchas que han mantenido viva su identidad y compromiso con el fútbol amateur.';
    const img=d.history?.url||d.history?.image||d.historyImage||d.logo||'logo_ricardo_mendez.png';
    const t=document.getElementById('historyPrincipalText'), med=document.getElementById('historyPrincipalMedia');
    if(t) t.textContent=text;
    if(med) med.innerHTML=img?'<img src="'+esc(img)+'" alt="Historia Club Deportivo Ricardo Méndez" loading="lazy">':'';
    // Quitar link a historia completa porque no debe estar duplicada
    sec.querySelectorAll('a[href*="history"],.history-principal-btn').forEach(a=>a.remove());
    return sec;
  }

  function removeDuplicatedHistory(){
    document.querySelectorAll('section,.section').forEach(sec=>{
      if(sec.id==='historyPrincipalSection') return;
      const id=(sec.id||'').toLowerCase();
      const tx=(sec.textContent||'').toLowerCase();
      // Ocultar otras historias, sin tocar presidentes históricos
      if((id.includes('history') || id.includes('historia') || tx.includes('historia del club')) && !id.includes('president') && !tx.includes('presidentes históricos') && !tx.includes('galería de presidentes')){
        sec.classList.add('rm-hide-duplicated-history');
        sec.style.display='none';
      }
    });
  }

  function ensurePresidents(){
    const sec=ensureSection('presidentsHistorySection','<section id="presidentsHistorySection" class="section presidents-history-section"><div class="section-head"><h2>Galería de Presidentes</h2><p>Presidentes históricos del Club Deportivo Ricardo Méndez</p></div><div id="presidentsHistoryGrid" class="presidents-grid"></div></section>');
    let grid=document.getElementById('presidentsHistoryGrid');
    if(!grid){grid=document.createElement('div');grid.id='presidentsHistoryGrid';grid.className='presidents-grid';sec.appendChild(grid);}
    const d=data();
    const list=Array.isArray(d.presidents)?d.presidents:(Array.isArray(d.presidentes)?d.presidentes:[]);
    if(list.length){
      grid.innerHTML=list.map(p=>'<article class="president-card">'+(p.url||p.image||p.foto?'<img src="'+esc(p.url||p.image||p.foto)+'" alt="'+esc(p.name||p.nombre||'Presidente')+'" loading="lazy">':'')+'<h3>'+esc(p.name||p.nombre||'')+'</h3><p>'+esc(p.period||p.periodo||'')+'</p></article>').join('');
    }else{
      grid.innerHTML='<div class="empty-state">Galería de presidentes pendiente de cargar.</div>';
    }
    return sec;
  }

  function normPerson(x){
    if(!x||typeof x!=='object') return null;
    const name=x.name||x.nombre||x.full_name||x.person||x.dirigente||x.title||'';
    const role=x.role||x.cargo||x.position||x.puesto||'Directiva';
    const img=x.url||x.image||x.photo||x.foto||'';
    const phone=x.phone||x.telefono||x.whatsapp||'';
    if(!String(name).trim()) return null;
    return {name:String(name).trim(),role:String(role).trim(),img:String(img).trim(),phone:String(phone).trim()};
  }
  function asArr(v){if(Array.isArray(v))return v;if(v&&typeof v==='object')return Object.values(v);return [];}
  function getDirectiva(){
    const d=data();
    const c=[d.directors,d.directiva,d.board,d.dirigentes,d.settings&&d.settings.directors,d.settings&&d.settings.directiva];
    for(const v of c){const arr=asArr(v).map(normPerson).filter(Boolean);if(arr.length)return arr;}
    const s=d.settings||d.club||d;
    return [['Presidente',s.presidente||s.president],['Secretario',s.secretario||s.secretary],['Tesorero',s.tesorero||s.treasurer]].filter(x=>x[1]).map(x=>({role:x[0],name:String(x[1]),img:'',phone:''}));
  }

  function ensureDirectiva(){
    const sec=ensureSection('directivaPublicSection','<section id="directivaPublicSection" class="section directiva-public-section"><div class="section-head"><h2>Directiva Actual</h2><p>Dirigentes del Club Deportivo Ricardo Méndez</p></div><div id="directivaPublicGrid" class="directiva-public-grid"></div></section>');
    let grid=document.getElementById('directivaPublicGrid');
    if(!grid){grid=document.createElement('div');grid.id='directivaPublicGrid';grid.className='directiva-public-grid';sec.appendChild(grid);}
    const list=getDirectiva();
    grid.innerHTML=list.length?list.map(p=>'<article class="directiva-public-card">'+(p.img?'<img src="'+esc(p.img)+'" alt="'+esc(p.name)+'" loading="lazy">':'<div class="directiva-avatar">RM</div>')+'<div><span>'+esc(p.role)+'</span><strong>'+esc(p.name)+'</strong>'+(p.phone?'<small>'+esc(p.phone)+'</small>':'')+'</div></article>').join(''):'<div class="empty-state">Directiva pendiente de cargar desde Admin.</div>';
    return sec;
  }

  function removeTVMode(){
    document.querySelectorAll('#tvModeSection,#openTvMode,.tv-mode-section,[id*="TvMode"],[id*="tvMode"],[class*="tv-mode"]').forEach(el=>{
      el.style.display='none';
      el.setAttribute('aria-hidden','true');
      el.remove();
    });
  }

  function reorder(){
    const h=ensureHistory();
    const p=ensurePresidents();
    const d=ensureDirectiva();
    h.insertAdjacentElement('afterend',p);
    p.insertAdjacentElement('afterend',d);
  }

  function run(){
    ensureMusic();
    removeTVMode();
    reorder();
    removeDuplicatedHistory();
  }

  // Deshabilitar funciones antiguas del modo TV
  window.proTvMode=function(){};
  if(typeof renderPublic==='function'){
    const old=renderPublic;
    renderPublic=function(){const r=old.apply(this,arguments);setTimeout(run,80);return r;};
  }
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(run,200);setTimeout(run,1000);setTimeout(run,2500);});
})();


/* =========================================================
   CONTADOR DE VISITAS SUPERIOR
   - Usa Supabase si existe tabla site_visits.
   - Si no existe, usa respaldo local.
========================================================= */
(function(){
  if(window.__RM_VISITOR_COUNTER__) return;
  window.__RM_VISITOR_COUNTER__ = true;

  function ensureVisitorBox(){
    let box = document.getElementById('visitorCounterTop');
    if(!box){
      box = document.createElement('div');
      box.id = 'visitorCounterTop';
      box.className = 'visitor-counter-top';
      box.innerHTML = '<span>👁️</span><div><strong id="visitorCounterNumber">0</strong><small>Visitas</small></div>';
      document.body.prepend(box);
    }
    return box;
  }

  function setVisits(n){
    const el = document.getElementById('visitorCounterNumber');
    if(el) el.textContent = Number(n || 0).toLocaleString('es-CL');
  }

  function localVisitFallback(){
    const today = new Date().toISOString().slice(0,10);
    const keyDay = 'rm_visit_day';
    const keyCount = 'rm_visit_count_public';
    let count = Number(localStorage.getItem(keyCount) || '0');
    if(localStorage.getItem(keyDay) !== today){
      count += 1;
      localStorage.setItem(keyDay, today);
      localStorage.setItem(keyCount, String(count));
    }
    setVisits(count);
    return count;
  }

  async function supabaseVisitCounter(){
    try{
      if(typeof initSB === 'function') initSB();
      const client = window.supabaseClient && typeof window.supabaseClient.from === 'function' ? window.supabaseClient : null;
      if(!client) throw new Error('Sin Supabase');

      const today = new Date().toISOString().slice(0,10);
      const already = localStorage.getItem('rm_global_visit_day') === today;

      if(!already){
        const payload = {
          page: location.pathname || '/',
          user_agent: navigator.userAgent || '',
          created_at: new Date().toISOString()
        };
        const {error: insertError} = await client.from('site_visits').insert(payload);
        if(insertError) throw insertError;
        localStorage.setItem('rm_global_visit_day', today);
      }

      const {count, error} = await client
        .from('site_visits')
        .select('*', { count:'exact', head:true });

      if(error) throw error;
      setVisits(count || 0);
      return count || 0;
    }catch(e){
      return localVisitFallback();
    }
  }

  function initCounter(){
    ensureVisitorBox();
    setVisits(localStorage.getItem('rm_visit_count_public') || 0);
    supabaseVisitCounter();
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(initCounter, 300);
    setTimeout(initCounter, 1400);
  });
})();

/* MODO TV ELIMINADO REVISION OK */
(function(){
  if(window.__RM_REMOVE_TV_OK__) return; window.__RM_REMOVE_TV_OK__=true;
  function removeTV(){
    document.querySelectorAll('#tvModeSection,#openTvMode,.tv-mode-section,[class*="tv-mode"],[id*="tvMode"],[id*="TvMode"]').forEach(el=>el.remove());
  }
  window.proTvMode = function(){};
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(removeTV,250);setTimeout(removeTV,1200);});
})();

/* AUDIO REVISION OK */
(function(){
  if(window.__RM_AUDIO_REVIEW_OK__) return; window.__RM_AUDIO_REVIEW_OK__=true;
  document.addEventListener('DOMContentLoaded',()=>{
    const a=document.getElementById('clubMusicAudio');
    if(a && !a.querySelector('source[src="./assets/himno-rimen.mp3"]')){
      const s=document.createElement('source'); s.src='./assets/himno-rimen.mp3'; s.type='audio/mpeg'; a.prepend(s); a.load();
    }
  });
})();


/* =========================================================
   FIX BOTONES FACEBOOK / INSTAGRAM
   Siempre visibles en página pública.
========================================================= */
(function(){
  if(window.__RM_FIX_SOCIAL_BUTTONS__) return;
  window.__RM_FIX_SOCIAL_BUTTONS__ = true;

  const DEFAULT_FACEBOOK = 'https://www.facebook.com/ricardomendezsancarlos';
  const DEFAULT_INSTAGRAM = 'https://www.instagram.com/cd_ricardomendez_sancarlos';

  function getDataSafe(){
    try{ return typeof getData === 'function' ? getData() : {}; }catch(e){ return {}; }
  }

  function normalizeUrl(url, type){
    url = String(url || '').trim();
    if(!url) return type === 'facebook' ? DEFAULT_FACEBOOK : DEFAULT_INSTAGRAM;
    if(url.startsWith('@')){
      return type === 'instagram'
        ? 'https://www.instagram.com/' + url.replace('@','')
        : DEFAULT_FACEBOOK;
    }
    if(!/^https?:\/\//i.test(url)){
      if(type === 'instagram') return 'https://www.instagram.com/' + url.replace(/^instagram\.com\//,'');
      if(type === 'facebook') return 'https://www.facebook.com/' + url.replace(/^facebook\.com\//,'');
    }
    return url;
  }

  function ensureSocialButtons(){
    let box = document.getElementById('topSocialButtons');
    if(!box){
      box = document.createElement('div');
      box.id = 'topSocialButtons';
      box.className = 'top-social-buttons';
      box.innerHTML = '<a id="facebookBtnTop" target="_blank" rel="noopener" aria-label="Facebook Club Deportivo Ricardo Méndez">f</a><a id="instagramBtnTop" target="_blank" rel="noopener" aria-label="Instagram Club Deportivo Ricardo Méndez">◎</a>';
      document.body.prepend(box);
    }

    let fb = document.getElementById('facebookBtnTop');
    let ig = document.getElementById('instagramBtnTop');

    if(!fb){
      fb = document.createElement('a');
      fb.id = 'facebookBtnTop';
      fb.textContent = 'f';
      fb.target = '_blank';
      fb.rel = 'noopener';
      fb.setAttribute('aria-label','Facebook Club Deportivo Ricardo Méndez');
      box.appendChild(fb);
    }
    if(!ig){
      ig = document.createElement('a');
      ig.id = 'instagramBtnTop';
      ig.textContent = '◎';
      ig.target = '_blank';
      ig.rel = 'noopener';
      ig.setAttribute('aria-label','Instagram Club Deportivo Ricardo Méndez');
      box.appendChild(ig);
    }

    const d = getDataSafe();
    const facebook =
      d.socials?.facebook ||
      d.settings?.facebook ||
      d.facebook ||
      d.redes?.facebook ||
      DEFAULT_FACEBOOK;

    const instagram =
      d.socials?.instagram ||
      d.settings?.instagram ||
      d.instagram ||
      d.redes?.instagram ||
      'cd_ricardomendez_sancarlos';

    fb.href = normalizeUrl(facebook, 'facebook');
    ig.href = normalizeUrl(instagram, 'instagram');

    box.style.display = 'flex';
    fb.style.display = 'flex';
    ig.style.display = 'flex';
  }

  if(typeof renderPublic === 'function'){
    const oldRenderSocial = renderPublic;
    renderPublic = function(){
      const r = oldRenderSocial.apply(this, arguments);
      setTimeout(ensureSocialButtons, 80);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(ensureSocialButtons, 200);
    setTimeout(ensureSocialButtons, 1000);
    setTimeout(ensureSocialButtons, 2500);
  });

  window.rmFixSocialButtons = ensureSocialButtons;
})();


/* =========================================================
   HISTORIA Y DIRECTIVA COMPACTA
========================================================= */
(function(){
  if(window.__RM_HISTORIA_DIRECTIVA_COMPACTA__) return;
  window.__RM_HISTORIA_DIRECTIVA_COMPACTA__ = true;

  function getDataSafe(){
    try{return typeof getData === 'function' ? getData() : {};}catch(e){return {};}
  }

  function compactHistory(){
    const d = getDataSafe();
    const textEl = document.getElementById('historyPrincipalText');
    if(textEl){
      const original =
        d.history?.text ||
        d.historyText ||
        d.settings?.historyText ||
        textEl.textContent ||
        'El Club Deportivo Ricardo Méndez fue fundado el 12 de agosto de 1932. Desde sus inicios ha sido una institución deportiva y social de San Carlos, formada por familias, jugadores, socios, dirigentes e hinchas que han mantenido viva su identidad y compromiso con el fútbol amateur.';
      textEl.textContent = String(original).length > 330 ? String(original).slice(0,330).trim() + '…' : original;
    }

    const section = document.getElementById('historyPrincipalSection');
    if(section) section.classList.add('history-compact-final');

    const media = document.getElementById('historyPrincipalMedia');
    if(media) media.classList.add('history-media-compact-final');
  }

  function compactDirectiva(){
    const section = document.getElementById('directivaPublicSection');
    const grid = document.getElementById('directivaPublicGrid');

    if(section) section.classList.add('directiva-compact-section-final');
    if(grid) grid.classList.add('directiva-compact-grid-final');

    document.querySelectorAll('.directiva-public-card,.director-card').forEach(card=>{
      card.classList.add('directiva-compact-card-final');
    });
  }

  function compactPresidents(){
    const section = document.getElementById('presidentsHistorySection');
    const grid = document.getElementById('presidentsHistoryGrid');
    if(section) section.classList.add('presidents-compact-section-final');
    if(grid) grid.classList.add('presidents-compact-grid-final');
  }

  function runCompact(){
    compactHistory();
    compactPresidents();
    compactDirectiva();
  }

  if(typeof renderPublic === 'function'){
    const oldRenderCompact = renderPublic;
    renderPublic = function(){
      const r = oldRenderCompact.apply(this, arguments);
      setTimeout(runCompact, 80);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(runCompact, 200);
    setTimeout(runCompact, 1000);
    setTimeout(runCompact, 2500);
  });
})();


/* =========================================================
   FIX BOTONES LATERALES + MUSICA ROBUSTA
========================================================= */
(function(){
  if(window.__RM_FIX_LATERALES_MUSICA__) return;
  window.__RM_FIX_LATERALES_MUSICA__ = true;

  let rmAudio = null;

  function ensureSideButtons(){
    let box = document.getElementById('rmSideButtons');
    if(!box){
      box = document.createElement('div');
      box.id = 'rmSideButtons';
      box.className = 'rm-side-buttons';
      box.setAttribute('aria-label','Navegación rápida');
      box.innerHTML = `
        <a href="#historyPrincipalSection" title="Historia">🏠</a>
        <a href="#presidentsHistorySection" title="Presidentes">👥</a>
        <a href="#directivaPublicSection" title="Directiva">🛡️</a>
        <a href="#fixture" title="Fixture">📅</a>
        <a href="#standings" title="Posiciones">📊</a>
        <a href="#seriesRankingSection" title="Ranking">🏆</a>
        <a href="#memberSection" title="Hazte Socio">🤝</a>
        <a href="#sponsorsBottomSection" title="Auspiciadores">⭐</a>
        <a href="admin.html" title="Admin">⚙️</a>`;
      document.body.appendChild(box);
    }

    // Forzar visibilidad aunque CSS anterior haya escondido nav/aside
    box.style.display = 'flex';
    box.style.visibility = 'visible';
    box.style.opacity = '1';
    box.style.pointerEvents = 'auto';
    box.removeAttribute('hidden');
  }

  function ensureMusicPlayer(){
    let wrap = document.getElementById('topMusicPlayer');
    if(!wrap){
      wrap = document.createElement('div');
      wrap.id = 'topMusicPlayer';
      wrap.className = 'top-music-player';
      wrap.innerHTML = `
        <button id="musicToggleBtn" type="button" aria-label="Reproducir himno Ricardo Méndez">
          <span id="musicIcon">▶</span><strong>Himno RM</strong>
        </button>
        <input id="musicVolume" type="range" min="0" max="1" step="0.05" value="0.70" aria-label="Volumen música">
        <audio id="clubMusicAudio" preload="auto" loop playsinline>
          <source src="./assets/himno-rimen.mp3" type="audio/mpeg">
          <source src="/assets/himno-rimen.mp3" type="audio/mpeg">
          <source src="assets/himno-rimen.mp3" type="audio/mpeg">
        </audio>`;
      document.body.prepend(wrap);
    }

    const btn = document.getElementById('musicToggleBtn');
    const icon = document.getElementById('musicIcon');
    const vol = document.getElementById('musicVolume');
    const audioEl = document.getElementById('clubMusicAudio');
    if(!btn || !icon || !vol || btn.dataset.rmMusicOk === '1') return;

    btn.dataset.rmMusicOk = '1';

    function getAudio(){
      if(rmAudio) return rmAudio;
      // Audio creado por JS: suele funcionar mejor en celular al iniciar con click del usuario
      rmAudio = new Audio('./assets/himno-rimen.mp3');
      rmAudio.loop = true;
      rmAudio.preload = 'auto';
      rmAudio.volume = Number(vol.value || 0.70);
      rmAudio.addEventListener('error', () => {
        // fallback a ruta absoluta
        if(rmAudio && !rmAudio.dataset.fallback){
          rmAudio.dataset.fallback = '1';
          rmAudio.src = '/assets/himno-rimen.mp3';
          rmAudio.load();
        }
      });
      return rmAudio;
    }

    function setPlayingUI(playing){
      icon.textContent = playing ? '⏸' : '▶';
      btn.classList.toggle('playing', playing);
      wrap.classList.toggle('playing', playing);
    }

    vol.addEventListener('input', () => {
      const a = getAudio();
      a.volume = Number(vol.value || 0.70);
      if(audioEl) audioEl.volume = a.volume;
    });

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const a = getAudio();
      a.volume = Number(vol.value || 0.70);

      try{
        if(a.paused){
          await a.play();
          setPlayingUI(true);
        }else{
          a.pause();
          setPlayingUI(false);
        }
      }catch(err){
        console.warn('No se pudo reproducir Audio()', err);
        try{
          if(audioEl){
            audioEl.volume = Number(vol.value || 0.70);
            audioEl.loop = true;
            audioEl.load();
            await audioEl.play();
            rmAudio = audioEl;
            setPlayingUI(true);
            return;
          }
        }catch(err2){
          console.warn('No se pudo reproducir audio element', err2);
        }
        setPlayingUI(false);
        let hint = wrap.querySelector('.music-hint');
        if(!hint){
          hint = document.createElement('span');
          hint.className = 'music-hint';
          hint.textContent = 'Toca Play';
          wrap.appendChild(hint);
        }
      }
    }, {passive:false});
  }

  function run(){
    ensureSideButtons();
    ensureMusicPlayer();
  }

  if(typeof renderPublic === 'function'){
    const old = renderPublic;
    renderPublic = function(){
      const r = old.apply(this, arguments);
      setTimeout(run, 80);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(run, 100);
    setTimeout(run, 700);
    setTimeout(run, 1800);
  });

  window.addEventListener('resize', () => setTimeout(ensureSideButtons, 120));
})();





/* =========================================================
   ORDEN FINAL BOTONES / RELOJ / FOTOS
   - Botones ya no van al costado.
   - Música, Facebook/Instagram y reloj separados.
   - Noticias y fotos con mismo tamaño.
========================================================= */
(function(){
  if(window.__RM_ORDEN_BOTONES_RELOJ_FOTOS__) return;
  window.__RM_ORDEN_BOTONES_RELOJ_FOTOS__ = true;

  function ensureSideButtonsTop(){
    let box = document.getElementById('rmSideButtons');
    if(!box){
      box = document.createElement('div');
      box.id = 'rmSideButtons';
      box.className = 'rm-side-buttons';
      box.innerHTML = `
        <a href="#historyPrincipalSection" title="Historia">🏠</a>
        <a href="#presidentsHistorySection" title="Presidentes">👥</a>
        <a href="#directivaPublicSection" title="Directiva">🛡️</a>
        <a href="#fixture" title="Fixture">📅</a>
        <a href="#standings" title="Posiciones">📊</a>
        <a href="#seriesRankingSection" title="Ranking">🏆</a>
        <a href="#memberSection" title="Hazte Socio">🤝</a>
        <a href="#sponsorsBottomSection" title="Auspiciadores">⭐</a>
        <a href="admin.html" title="Admin">⚙️</a>`;
      document.body.appendChild(box);
    }
    box.classList.add('rm-top-quick-buttons');
    box.style.display = 'flex';
    box.style.visibility = 'visible';
    box.style.opacity = '1';
    box.style.pointerEvents = 'auto';
  }

  function fixTopControls(){
    const music = document.getElementById('topMusicPlayer');
    const social = document.getElementById('topSocialButtons');
    const clock = document.getElementById('topDateClock');

    if(music) music.classList.add('rm-music-fixed-final');
    if(social) social.classList.add('rm-social-fixed-final');
    if(clock) clock.classList.add('rm-clock-under-social-final');
  }

  function equalNewsAndPhotos(){
    document.querySelectorAll(
      '.news-card,.noticia-card,.card-news,.gallery-card,.photo-card,.gallery-item,.galeria-card,.galeria-item,[class*="news-card"],[class*="photo-card"],[class*="gallery-card"]'
    ).forEach(el=>{
      el.classList.add('rm-equal-media-card');
    });

    document.querySelectorAll(
      '.news-card img,.noticia-card img,.card-news img,.gallery-card img,.photo-card img,.gallery-item img,.galeria-card img,.galeria-item img,[class*="news-card"] img,[class*="photo-card"] img,[class*="gallery-card"] img'
    ).forEach(img=>{
      img.classList.add('rm-equal-media-img');
    });

    document.querySelectorAll(
      '.news-grid,.noticias-grid,.gallery-grid,.galeria-grid,.photos-grid,.photo-grid,[class*="news-grid"],[class*="gallery-grid"]'
    ).forEach(grid=>{
      grid.classList.add('rm-equal-media-grid');
    });
  }

  function removeLeftSpace(){
    document.documentElement.classList.add('rm-no-left-bar-final');
    document.body.classList.add('rm-no-left-bar-final');
    const main = document.querySelector('main');
    if(main) main.classList.add('rm-no-left-bar-final');
  }

  function run(){
    ensureSideButtonsTop();
    fixTopControls();
    equalNewsAndPhotos();
    removeLeftSpace();
  }

  if(typeof renderPublic === 'function'){
    const old = renderPublic;
    renderPublic = function(){
      const r = old.apply(this, arguments);
      setTimeout(run, 120);
      setTimeout(run, 800);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(run, 150);
    setTimeout(run, 900);
    setTimeout(run, 2200);
  });

  window.addEventListener('resize', ()=>setTimeout(run, 120));
})();


/* =========================================================
   AJUSTE VISUAL FINAL COMPACTO
========================================================= */
(function(){
  if(window.__RM_AJUSTE_VISUAL_FINAL_COMPACTO__) return;
  window.__RM_AJUSTE_VISUAL_FINAL_COMPACTO__ = true;

  function getDataSafe(){ try{return typeof getData==='function'?getData():{};}catch(e){return {};}}
  function restoreFullHistory(){
    const d=getDataSafe();
    const el=document.getElementById('historyPrincipalText');
    if(el){
      const full=d.history?.text||d.historyText||d.settings?.historyText||
      'El Club Deportivo Ricardo Méndez fue fundado el 12 de agosto de 1932, naciendo como una institución deportiva con un fuerte espíritu familiar y comunitario. Desde sus inicios, el club ha sido un lugar de encuentro para jugadores, socios, dirigentes, hinchas y familias que comparten la pasión por el fútbol y el amor por sus colores. A través de los años, Ricardo Méndez ha mantenido viva su identidad, formando generaciones de deportistas y fortaleciendo el compromiso con la comunidad de San Carlos.';
      el.textContent=String(full).replace(/…$/,'');
      el.classList.add('rm-history-full-text');
    }
    document.getElementById('historyPrincipalSection')?.classList.add('rm-history-full-compact');
  }
  function removePresGalleryDuplicate(){
    document.querySelectorAll('section,.section,.card,.panel,.box,.empty-state').forEach(el=>{
      const txt=(el.textContent||'').trim().toLowerCase();
      const id=(el.id||'').toLowerCase();
      if(txt.includes('galería de presidentes pendiente')||txt.includes('galeria de presidentes pendiente')){
        el.classList.add('rm-remove-pres-gallery-duplicate'); el.style.display='none';
      }
      if((txt.includes('galería de presidentes')||txt.includes('galeria de presidentes')) &&
         !txt.includes('presidentes históricos')&&!txt.includes('presidentes historicos') &&
         !id.includes('history')&&!id.includes('histor')){
        el.classList.add('rm-remove-pres-gallery-duplicate'); el.style.display='none';
      }
    });
    document.querySelectorAll('#presidentsHistorySection h2,.presidents-history-section h2').forEach(h=>h.textContent='Presidentes Históricos');
  }
  function arrangeTop(){
    document.getElementById('topMusicPlayer')?.classList.add('rm-top-music-separated');
    document.getElementById('topSocialButtons')?.classList.add('rm-social-under-music');
    document.getElementById('topDateClock')?.classList.add('rm-clock-under-social');
    document.getElementById('rmSideButtons')?.classList.add('rm-quick-buttons-over-history');
  }
  function compactPage(){
    document.documentElement.classList.add('rm-page-compact-final');
    document.body.classList.add('rm-page-compact-final');
    document.querySelector('main')?.classList.add('rm-page-compact-final');
  }
  function adjustMedia(){
    document.querySelectorAll('.news-grid,.noticias-grid,.gallery-grid,.galeria-grid,.photos-grid,.photo-grid,[class*="news-grid"],[class*="gallery-grid"],[class*="photo-grid"]').forEach(g=>g.classList.add('rm-media-auto-grid'));
    document.querySelectorAll('.news-card,.noticia-card,.card-news,.gallery-card,.photo-card,.gallery-item,.galeria-card,.galeria-item,[class*="news-card"],[class*="photo-card"],[class*="gallery-card"]').forEach(c=>c.classList.add('rm-media-auto-card'));
    document.querySelectorAll('.news-card img,.noticia-card img,.card-news img,.gallery-card img,.photo-card img,.gallery-item img,.galeria-card img,.galeria-item img,[class*="news-card"] img,[class*="photo-card"] img,[class*="gallery-card"] img').forEach(img=>img.classList.add('rm-media-auto-img'));
  }
  function run(){compactPage(); arrangeTop(); restoreFullHistory(); removePresGalleryDuplicate(); adjustMedia();}
  if(typeof renderPublic==='function'){const old=renderPublic; renderPublic=function(){const r=old.apply(this,arguments); setTimeout(run,100); setTimeout(run,900); return r;};}
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(run,150); setTimeout(run,900); setTimeout(run,2200); setTimeout(run,4200);});
  window.addEventListener('resize',()=>setTimeout(run,120));
})();


/* =========================================================
   REVISION OK FINAL - CONTROLES / COMPACTO / HISTORIA / MEDIA
========================================================= */
(function(){
  if(window.__RM_REVISION_OK_FINAL_CONTROLES__) return;
  window.__RM_REVISION_OK_FINAL_CONTROLES__ = true;

  function getDataSafe(){ try{return typeof getData==='function'?getData():{};}catch(e){return {};}}

  function makeTopStack(){
    let stack = document.getElementById('rmTopRightStack');
    if(!stack){
      stack = document.createElement('div');
      stack.id = 'rmTopRightStack';
      stack.className = 'rm-top-right-stack';
      document.body.appendChild(stack);
    }

    const music = document.getElementById('topMusicPlayer');
    const social = document.getElementById('topSocialButtons');
    const clock = document.getElementById('topDateClock');

    [music, social, clock].forEach(el=>{
      if(el && el.parentElement !== stack){
        stack.appendChild(el);
      }
      if(el){
        el.classList.add('rm-stacked-control');
        el.style.position = 'relative';
        el.style.top = 'auto';
        el.style.right = 'auto';
        el.style.left = 'auto';
        el.style.bottom = 'auto';
        el.style.transform = 'none';
      }
    });
  }

  function fixQuickButtons(){
    let box = document.getElementById('rmSideButtons');
    if(box){
      box.classList.add('rm-quick-center-compact-ok');
      box.style.position = '';
      box.style.left = '';
      box.style.top = '';
      box.style.right = '';
      box.style.bottom = '';
      box.style.transform = '';
    }
  }

  function fullHistory(){
    const d = getDataSafe();
    const el = document.getElementById('historyPrincipalText');
    if(el){
      const full = d.history?.text || d.historyText || d.settings?.historyText ||
        'El Club Deportivo Ricardo Méndez fue fundado el 12 de agosto de 1932, naciendo como una institución deportiva con un fuerte espíritu familiar y comunitario. Desde sus inicios, el club ha sido un lugar de encuentro para jugadores, socios, dirigentes, hinchas y familias que comparten la pasión por el fútbol y el amor por sus colores. A través de los años, Ricardo Méndez ha mantenido viva su identidad, formando generaciones de deportistas y fortaleciendo el compromiso con la comunidad de San Carlos.';
      el.textContent = String(full).replace(/…$/,'');
      el.classList.add('rm-history-full-visible-ok');
    }
    document.getElementById('historyPrincipalSection')?.classList.add('rm-history-full-visible-ok');
  }

  function removeDuplicatePresGallery(){
    document.querySelectorAll('section,.section,.card,.panel,.box,.empty-state').forEach(el=>{
      const txt = (el.textContent||'').toLowerCase();
      const id = (el.id||'').toLowerCase();
      if(txt.includes('galería de presidentes pendiente') || txt.includes('galeria de presidentes pendiente')){
        el.classList.add('rm-remove-pres-gallery-duplicate-ok');
        el.style.display = 'none';
      }
      if((txt.includes('galería de presidentes') || txt.includes('galeria de presidentes')) &&
         !txt.includes('presidentes históricos') && !txt.includes('presidentes historicos') &&
         !id.includes('history') && !id.includes('histor')){
        el.classList.add('rm-remove-pres-gallery-duplicate-ok');
        el.style.display = 'none';
      }
    });
    document.querySelectorAll('#presidentsHistorySection h2,.presidents-history-section h2').forEach(h=>h.textContent='Presidentes Históricos');
  }

  function mediaAuto(){
    document.querySelectorAll('.news-grid,.noticias-grid,.gallery-grid,.galeria-grid,.photos-grid,.photo-grid,[class*="news-grid"],[class*="gallery-grid"],[class*="photo-grid"]').forEach(g=>g.classList.add('rm-media-final-grid-ok'));
    document.querySelectorAll('.news-card,.noticia-card,.card-news,.gallery-card,.photo-card,.gallery-item,.galeria-card,.galeria-item,[class*="news-card"],[class*="photo-card"],[class*="gallery-card"]').forEach(c=>c.classList.add('rm-media-final-card-ok'));
    document.querySelectorAll('.news-card img,.noticia-card img,.card-news img,.gallery-card img,.photo-card img,.gallery-item img,.galeria-card img,.galeria-item img,[class*="news-card"] img,[class*="photo-card"] img,[class*="gallery-card"] img').forEach(img=>img.classList.add('rm-media-final-img-ok'));
  }

  function compactPage(){
    document.documentElement.classList.add('rm-compact-reviewed-ok');
    document.body.classList.add('rm-compact-reviewed-ok');
    document.querySelector('main')?.classList.add('rm-compact-reviewed-ok');
  }

  function run(){
    compactPage();
    makeTopStack();
    fixQuickButtons();
    fullHistory();
    removeDuplicatePresGallery();
    mediaAuto();
  }

  if(typeof renderPublic === 'function'){
    const old = renderPublic;
    renderPublic = function(){
      const r = old.apply(this, arguments);
      setTimeout(run, 80);
      setTimeout(run, 800);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(run,120);
    setTimeout(run,900);
    setTimeout(run,2200);
    setTimeout(run,4500);
  });
  window.addEventListener('resize',()=>setTimeout(run,120));
})();


/* =========================================================
   FIX PRESIDENTES HISTORICOS ARRIBA DE DIRECTIVA
   Visible siempre, antes de Directiva Actual.
========================================================= */
(function(){
  if(window.__RM_FIX_PRESIDENTES_HISTORICOS__) return;
  window.__RM_FIX_PRESIDENTES_HISTORICOS__ = true;

  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function tryJson(v){
    if(!v || typeof v !== 'string') return null;
    try{return JSON.parse(v);}catch(e){return null;}
  }

  function asArray(v){
    if(!v) return [];
    if(Array.isArray(v)) return v;
    const j = tryJson(v);
    if(Array.isArray(j)) return j;
    if(j && typeof j === 'object') return Object.values(j);
    if(typeof v === 'object') return Object.values(v);
    return [];
  }

  function getDataSafe(){
    try{return typeof getData === 'function' ? getData() : {};}catch(e){return {};}
  }

  function normPresident(p){
    if(!p || typeof p !== 'object') return null;
    const name = p.name || p.nombre || p.presidente || p.title || p.titulo || p.person || '';
    const period = p.period || p.periodo || p.years || p.anios || p.años || p.fecha || p.descripcion || '';
    const img = p.url || p.image || p.photo || p.foto || p.img || '';
    if(!String(name).trim()) return null;
    return {name:String(name).trim(), period:String(period || '').trim(), img:String(img || '').trim()};
  }

  function getLocalPresidents(){
    const d = getDataSafe();
    const candidates = [
      d.presidents,
      d.presidentes,
      d.historicPresidents,
      d.presidentesHistoricos,
      d.galeriaPresidentes,
      d.galleryPresidents,
      d.settings && d.settings.presidents,
      d.settings && d.settings.presidentes,
      d.club && d.club.presidents,
      d.club && d.club.presidentes
    ];
    for(const c of candidates){
      const arr = asArray(c).map(normPresident).filter(Boolean);
      if(arr.length) return arr;
    }
    return [];
  }

  function ensurePresidentsSection(){
    let section = document.getElementById('presidentsHistorySection');
    if(!section){
      section = document.createElement('section');
      section.id = 'presidentsHistorySection';
      section.className = 'section presidents-history-section';
      section.innerHTML = '<div class="section-head"><h2>Presidentes Históricos</h2><p>Personas que han guiado la institución</p></div><div id="presidentsHistoryGrid" class="presidents-grid presidents-history-grid"></div>';
    }
    section.style.display = 'block';
    section.style.visibility = 'visible';
    section.hidden = false;
    section.classList.add('rm-presidents-visible-final');

    const h2 = section.querySelector('h2');
    if(h2) h2.textContent = 'Presidentes Históricos';

    let grid = document.getElementById('presidentsHistoryGrid');
    if(!grid){
      grid = document.createElement('div');
      grid.id = 'presidentsHistoryGrid';
      grid.className = 'presidents-grid presidents-history-grid';
      section.appendChild(grid);
    }
    grid.style.display = 'grid';
    grid.style.visibility = 'visible';
    grid.hidden = false;

    return section;
  }

  function moveAboveDirectiva(){
    const section = ensurePresidentsSection();
    const directiva = document.getElementById('directivaPublicSection');
    const history = document.getElementById('historyPrincipalSection');
    const main = document.querySelector('main') || document.body;

    if(directiva && directiva.parentNode){
      directiva.parentNode.insertBefore(section, directiva);
    }else if(history && history.parentNode){
      history.insertAdjacentElement('afterend', section);
    }else if(!section.parentNode){
      main.prepend(section);
    }
  }

  function renderPresidents(list){
    moveAboveDirectiva();
    const grid = document.getElementById('presidentsHistoryGrid');
    if(!grid) return;

    if(list && list.length){
      grid.innerHTML = list.map(p => `
        <article class="president-history-card">
          ${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy">` : `<div class="president-history-avatar">RM</div>`}
          <div>
            <strong>${esc(p.name)}</strong>
            ${p.period ? `<span>${esc(p.period)}</span>` : ''}
          </div>
        </article>
      `).join('');
    }else{
      grid.innerHTML = '<div class="presidents-empty-visible">Presidentes históricos pendiente de cargar desde Admin.</div>';
    }
  }

  async function fetchSupabasePresidents(){
    try{ if(typeof initSB === 'function') initSB(); }catch(e){}
    const client = window.supabaseClient && typeof window.supabaseClient.from === 'function' ? window.supabaseClient : null;
    if(!client) return [];
    const tables = ['presidents','presidentes','historic_presidents','presidentes_historicos'];
    for(const table of tables){
      try{
        const {data, error} = await client.from(table).select('*');
        if(!error){
          const arr = asArray(data).map(normPresident).filter(Boolean);
          if(arr.length) return arr;
        }
      }catch(e){}
    }
    return [];
  }

  async function run(){
    moveAboveDirectiva();
    let list = getLocalPresidents();
    renderPresidents(list);
    if(list.length) return;
    list = await fetchSupabasePresidents();
    if(list.length) renderPresidents(list);
  }

  if(typeof renderPublic === 'function'){
    const old = renderPublic;
    renderPublic = function(){
      const r = old.apply(this, arguments);
      setTimeout(run, 80);
      setTimeout(run, 800);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(run, 120);
    setTimeout(run, 900);
    setTimeout(run, 2200);
    setTimeout(run, 4200);
  });

  window.rmRenderPresidentesHistoricos = run;
})();


/* PRESIDENTES HISTORICOS - REVISION FINAL OK */
(function(){
  if(window.__RM_PRESIDENTES_HISTORICOS_REVISION_FINAL_OK__) return;
  window.__RM_PRESIDENTES_HISTORICOS_REVISION_FINAL_OK__ = true;

  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }
  function tryJson(v){
    if(!v || typeof v !== 'string') return null;
    try{return JSON.parse(v);}catch(e){return null;}
  }
  function asArray(v){
    if(!v) return [];
    if(Array.isArray(v)) return v;
    var j = tryJson(v);
    if(Array.isArray(j)) return j;
    if(j && typeof j === 'object') return Object.values(j);
    if(typeof v === 'object') return Object.values(v);
    return [];
  }
  function getDataSafe(){
    try{return typeof getData === 'function' ? getData() : {};}catch(e){return {};}
  }
  function normPresident(p){
    if(!p || typeof p !== 'object') return null;
    var name = p.name || p.nombre || p.presidente || p.title || p.titulo || p.person || '';
    var period = p.period || p.periodo || p.years || p.anios || p.años || p.fecha || p.descripcion || '';
    var img = p.url || p.image || p.photo || p.foto || p.img || '';
    if(!String(name).trim()) return null;
    return {name:String(name).trim(), period:String(period || '').trim(), img:String(img || '').trim()};
  }
  function getLocalPresidents(){
    var d = getDataSafe();
    var candidates = [
      d.presidents,
      d.presidentes,
      d.historicPresidents,
      d.presidentesHistoricos,
      d.galeriaPresidentes,
      d.galleryPresidents,
      d.settings && d.settings.presidents,
      d.settings && d.settings.presidentes,
      d.club && d.club.presidents,
      d.club && d.club.presidentes
    ];
    for(var i=0;i<candidates.length;i++){
      var arr = asArray(candidates[i]).map(normPresident).filter(Boolean);
      if(arr.length) return arr;
    }
    return [];
  }
  function ensureSection(){
    var section = document.getElementById('presidentsHistorySection');
    if(!section){
      section = document.createElement('section');
      section.id = 'presidentsHistorySection';
      section.className = 'section presidents-history-section rm-presidents-section-final';
      section.innerHTML = '<div class="section-head"><h2>Presidentes Históricos</h2><p>Personas que han guiado la institución</p></div><div id="presidentsHistoryGrid" class="presidents-grid presidents-history-grid"></div>';
    }
    section.classList.add('rm-presidents-section-final');
    section.hidden = false;
    section.style.display = 'block';
    section.style.visibility = 'visible';
    section.style.opacity = '1';

    var h2 = section.querySelector('h2');
    if(h2) h2.textContent = 'Presidentes Históricos';

    var p = section.querySelector('.section-head p');
    if(p) p.textContent = 'Personas que han guiado la institución';

    var grid = document.getElementById('presidentsHistoryGrid');
    if(!grid){
      grid = document.createElement('div');
      grid.id = 'presidentsHistoryGrid';
      grid.className = 'presidents-grid presidents-history-grid';
      section.appendChild(grid);
    }
    grid.hidden = false;
    grid.style.display = 'grid';
    grid.style.visibility = 'visible';
    return section;
  }
  function moveAboveDirectiva(){
    var section = ensureSection();
    var directiva = document.getElementById('directivaPublicSection');
    var history = document.getElementById('historyPrincipalSection');
    var main = document.querySelector('main') || document.body;
    if(directiva && directiva.parentNode){
      directiva.parentNode.insertBefore(section, directiva);
    }else if(history && history.parentNode){
      history.insertAdjacentElement('afterend', section);
    }else if(!section.parentNode){
      main.prepend(section);
    }
  }
  function render(list){
    moveAboveDirectiva();
    var grid = document.getElementById('presidentsHistoryGrid');
    if(!grid) return;
    if(list && list.length){
      grid.innerHTML = list.map(function(p){
        var imgHtml = p.img ? '<img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" loading="lazy">' : '<div class="president-history-avatar-final">RM</div>';
        return '<article class="president-history-card-final">' + imgHtml + '<div><strong>' + esc(p.name) + '</strong>' + (p.period ? '<span>' + esc(p.period) + '</span>' : '') + '</div></article>';
      }).join('');
    }else{
      grid.innerHTML = '<div class="presidents-empty-final-ok">Presidentes históricos pendiente de cargar desde Admin.</div>';
    }
  }
  function hideDuplicateGalleryOnly(){
    document.querySelectorAll('section,.section,.card,.panel,.box,.empty-state').forEach(function(el){
      if(el.id === 'presidentsHistorySection') return;
      var txt = (el.textContent || '').toLowerCase();
      var id = (el.id || '').toLowerCase();
      if(txt.indexOf('galería de presidentes pendiente') >= 0 || txt.indexOf('galeria de presidentes pendiente') >= 0){
        el.classList.add('rm-hide-duplicated-pres-gallery');
        el.style.display = 'none';
      }
      if((txt.indexOf('galería de presidentes') >= 0 || txt.indexOf('galeria de presidentes') >= 0) &&
         txt.indexOf('presidentes históricos') < 0 && txt.indexOf('presidentes historicos') < 0 &&
         id.indexOf('history') < 0 && id.indexOf('histor') < 0){
        el.classList.add('rm-hide-duplicated-pres-gallery');
        el.style.display = 'none';
      }
    });
  }
  async function fetchSupabasePresidents(){
    try{ if(typeof initSB === 'function') initSB(); }catch(e){}
    var client = window.supabaseClient && typeof window.supabaseClient.from === 'function' ? window.supabaseClient : null;
    if(!client) return [];
    var tables = ['presidents','presidentes','historic_presidents','presidentes_historicos'];
    for(var i=0;i<tables.length;i++){
      try{
        var res = await client.from(tables[i]).select('*');
        if(!res.error){
          var arr = asArray(res.data).map(normPresident).filter(Boolean);
          if(arr.length) return arr;
        }
      }catch(e){}
    }
    return [];
  }
  async function run(){
    hideDuplicateGalleryOnly();
    var list = getLocalPresidents();
    render(list);
    if(!list.length){
      var remote = await fetchSupabasePresidents();
      if(remote.length) render(remote);
    }
    moveAboveDirectiva();
  }
  if(typeof renderPublic === 'function'){
    var old = renderPublic;
    renderPublic = function(){
      var r = old.apply(this, arguments);
      setTimeout(run, 80);
      setTimeout(run, 800);
      return r;
    };
  }
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(run, 120);
    setTimeout(run, 900);
    setTimeout(run, 2200);
    setTimeout(run, 4200);
  });
  window.rmRenderPresidentesHistoricosFinalOK = run;
})();


/* =========================================================
   FIX BOTONES SOBRE HISTORIA + LOGO DIRECTIVA + PRESIDENTES
========================================================= */
(function(){
  if(window.__RM_FIX_BOTONES_LOGO_DIRECTIVA_PRESIDENTES__) return;
  window.__RM_FIX_BOTONES_LOGO_DIRECTIVA_PRESIDENTES__ = true;

  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }

  function getDataSafe(){
    try{return typeof getData === 'function' ? getData() : {};}catch(e){return {};}
  }

  function tryJson(v){
    if(!v || typeof v !== 'string') return null;
    try{return JSON.parse(v);}catch(e){return null;}
  }

  function asArray(v){
    if(!v) return [];
    if(Array.isArray(v)) return v;
    var j = tryJson(v);
    if(Array.isArray(j)) return j;
    if(j && typeof j === 'object') return Object.values(j);
    if(typeof v === 'object') return Object.values(v);
    return [];
  }

  function ensureQuickButtons(){
    var box = document.getElementById('rmSideButtons');
    if(!box){
      box = document.createElement('div');
      box.id = 'rmSideButtons';
      box.className = 'rm-side-buttons rm-buttons-over-history-fixed';
      box.setAttribute('aria-label','Navegación rápida');
      box.innerHTML = '<a href="#historyPrincipalSection" title="Historia">🏠</a><a href="#presidentsHistorySection" title="Presidentes Históricos">👥</a><a href="#directivaPublicSection" title="Directiva">🛡️</a><a href="#fixture" title="Fixture">📅</a><a href="#standings" title="Posiciones">📊</a><a href="#seriesRankingSection" title="Ranking">🏆</a><a href="#memberSection" title="Hazte Socio">🤝</a><a href="#sponsorsBottomSection" title="Auspiciadores">⭐</a><a href="admin.html" title="Admin">⚙️</a>';
      document.body.appendChild(box);
    }
    box.classList.add('rm-buttons-over-history-fixed');
    box.hidden = false;
    box.style.display = 'flex';
    box.style.visibility = 'visible';
    box.style.opacity = '1';
  }

  function replaceDirectivaRMWithLogo(){
    document.querySelectorAll('.directiva-avatar, .directiva-public-card .directiva-avatar').forEach(function(el){
      if(el.querySelector('img')) return;
      el.innerHTML = '<img src="logo_ricardo_mendez.png" alt="Club Deportivo Ricardo Méndez">';
      el.classList.add('rm-directiva-logo-avatar');
    });

    document.querySelectorAll('.directiva-public-card').forEach(function(card){
      var first = card.querySelector('.directiva-avatar');
      if(!first){
        var img = card.querySelector('img');
        if(!img){
          var avatar = document.createElement('div');
          avatar.className = 'directiva-avatar rm-directiva-logo-avatar';
          avatar.innerHTML = '<img src="logo_ricardo_mendez.png" alt="Club Deportivo Ricardo Méndez">';
          card.prepend(avatar);
        }
      }
    });
  }

  function normPresident(p){
    if(!p || typeof p !== 'object') return null;
    var name = p.name || p.nombre || p.presidente || p.title || p.titulo || p.person || '';
    var period = p.period || p.periodo || p.years || p.anios || p.años || p.fecha || p.descripcion || '';
    var img = p.url || p.image || p.photo || p.foto || p.img || '';
    if(!String(name).trim()) return null;
    return {name:String(name).trim(), period:String(period || '').trim(), img:String(img || '').trim()};
  }

  function getLocalPresidents(){
    var d = getDataSafe();
    var candidates = [
      d.presidents, d.presidentes, d.historicPresidents, d.presidentesHistoricos,
      d.galeriaPresidentes, d.galleryPresidents,
      d.settings && d.settings.presidents, d.settings && d.settings.presidentes,
      d.club && d.club.presidents, d.club && d.club.presidentes
    ];
    for(var i=0;i<candidates.length;i++){
      var arr = asArray(candidates[i]).map(normPresident).filter(Boolean);
      if(arr.length) return arr;
    }
    return [];
  }

  function ensurePresidents(){
    var section = document.getElementById('presidentsHistorySection');
    if(!section){
      section = document.createElement('section');
      section.id = 'presidentsHistorySection';
      section.className = 'section presidents-history-section rm-presidents-section-final';
      section.innerHTML = '<div class="section-head"><h2>Presidentes Históricos</h2><p>Personas que han guiado la institución</p></div><div id="presidentsHistoryGrid" class="presidents-grid presidents-history-grid"></div>';
    }
    section.classList.add('rm-presidents-section-final');
    section.hidden = false;
    section.style.display = 'block';
    section.style.visibility = 'visible';
    section.style.opacity = '1';

    var h2 = section.querySelector('h2');
    if(h2) h2.textContent = 'Presidentes Históricos';

    var grid = document.getElementById('presidentsHistoryGrid');
    if(!grid){
      grid = document.createElement('div');
      grid.id = 'presidentsHistoryGrid';
      grid.className = 'presidents-grid presidents-history-grid';
      section.appendChild(grid);
    }
    grid.style.display = 'grid';
    grid.style.visibility = 'visible';
    return section;
  }

  function renderPresidents(){
    var section = ensurePresidents();
    var directiva = document.getElementById('directivaPublicSection');
    var history = document.getElementById('historyPrincipalSection');
    var main = document.querySelector('main') || document.body;

    if(directiva && directiva.parentNode){
      directiva.parentNode.insertBefore(section, directiva);
    }else if(history && history.parentNode){
      history.insertAdjacentElement('afterend', section);
    }else if(!section.parentNode){
      main.prepend(section);
    }

    var list = getLocalPresidents();
    var grid = document.getElementById('presidentsHistoryGrid');
    if(!grid) return;

    if(list.length){
      grid.innerHTML = list.map(function(p){
        var imgHtml = p.img ? '<img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" loading="lazy">' : '<div class="president-history-avatar-final">RM</div>';
        return '<article class="president-history-card-final">' + imgHtml + '<div><strong>' + esc(p.name) + '</strong>' + (p.period ? '<span>' + esc(p.period) + '</span>' : '') + '</div></article>';
      }).join('');
    }else{
      grid.innerHTML = '<div class="presidents-empty-final-ok">Presidentes históricos pendiente de cargar desde Admin.</div>';
    }
  }

  function hideDuplicateGallery(){
    document.querySelectorAll('section,.section,.card,.panel,.box,.empty-state').forEach(function(el){
      if(el.id === 'presidentsHistorySection') return;
      var txt = (el.textContent || '').toLowerCase();
      var id = (el.id || '').toLowerCase();
      if(txt.indexOf('galería de presidentes pendiente') >= 0 || txt.indexOf('galeria de presidentes pendiente') >= 0){
        el.style.display = 'none';
      }
      if((txt.indexOf('galería de presidentes') >= 0 || txt.indexOf('galeria de presidentes') >= 0) &&
         txt.indexOf('presidentes históricos') < 0 && txt.indexOf('presidentes historicos') < 0 &&
         id.indexOf('history') < 0 && id.indexOf('histor') < 0){
        el.style.display = 'none';
      }
    });
  }

  function run(){
    ensureQuickButtons();
    renderPresidents();
    replaceDirectivaRMWithLogo();
    hideDuplicateGallery();
  }

  if(typeof renderPublic === 'function'){
    var old = renderPublic;
    renderPublic = function(){
      var r = old.apply(this, arguments);
      setTimeout(run, 80);
      setTimeout(run, 800);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(run, 120);
    setTimeout(run, 900);
    setTimeout(run, 2200);
    setTimeout(run, 4200);
  });

  window.rmFixBotonesLogoDirectivaPresidentes = run;
})();


/* =========================================================
   MUSICA INLINE SIN 404 - NO DEPENDE DE ASSETS
========================================================= */
(function(){
  if(window.__RM_MUSICA_INLINE_SIN_404__) return;
  window.__RM_MUSICA_INLINE_SIN_404__ = true;

  var playerAudio = null;

  function ensureMusicBox(){
    var wrap = document.getElementById('topMusicPlayer');
    if(!wrap){
      wrap = document.createElement('div');
      wrap.id = 'topMusicPlayer';
      wrap.className = 'top-music-player rm-music-inline-final';
      wrap.innerHTML = '<button id="musicToggleBtn" type="button" aria-label="Reproducir himno Ricardo Méndez"><span id="musicIcon">▶</span><strong>Himno RM</strong></button><audio id="clubMusicAudio" class="club-music-audio" preload="metadata" loop playsinline controls></audio>';
      document.body.prepend(wrap);
    }
    return wrap;
  }

  function getAudio(){
    ensureMusicBox();
    var htmlAudio = document.getElementById('clubMusicAudio');
    if(!htmlAudio) return null;

    // Fuente principal: audio incrustado inline, no genera 404.
    if(window.RM_HIMNO_INLINE_SRC && htmlAudio.src !== window.RM_HIMNO_INLINE_SRC){
      htmlAudio.src = window.RM_HIMNO_INLINE_SRC;
    }

    htmlAudio.controls = true;
    htmlAudio.loop = true;
    htmlAudio.preload = 'metadata';
    htmlAudio.volume = 0.9;
    playerAudio = htmlAudio;
    return htmlAudio;
  }

  function setUI(){
    var audio = getAudio();
    var icon = document.getElementById('musicIcon');
    var btn = document.getElementById('musicToggleBtn');
    var wrap = document.getElementById('topMusicPlayer');
    var playing = audio && !audio.paused;
    if(icon) icon.textContent = playing ? '⏸' : '▶';
    if(btn) btn.classList.toggle('playing', playing);
    if(wrap) wrap.classList.toggle('playing', playing);
  }

  function bind(){
    ensureMusicBox();
    var audio = getAudio();
    var btn = document.getElementById('musicToggleBtn');

    if(audio && audio.dataset.inlineBound !== '1'){
      audio.dataset.inlineBound = '1';
      audio.addEventListener('play', setUI);
      audio.addEventListener('pause', setUI);
      audio.addEventListener('ended', setUI);
      audio.addEventListener('error', function(e){
        console.warn('Error de audio inline:', e);
      });
    }

    if(btn && btn.dataset.inlineMusicBtn !== '1'){
      btn.dataset.inlineMusicBtn = '1';
      btn.addEventListener('click', function(ev){
        ev.preventDefault();
        ev.stopPropagation();

        var a = getAudio();
        if(!a) return;

        if(a.paused){
          a.play().then(setUI).catch(function(err){
            console.warn('El navegador bloqueó el audio:', err);
            alert('Presiona Play en el control de audio visible para iniciar el himno.');
          });
        }else{
          a.pause();
          setUI();
        }
      }, false);
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(bind, 100);
    setTimeout(bind, 900);
    setTimeout(bind, 2200);
  });

  window.rmMusicaInlineSin404 = bind;
})();


/* =========================================================
   BOTONES DENTRO DE HISTORIA - SIN TAPAR TEXTO NI MUSICA
========================================================= */
(function(){
  if(window.__RM_BOTONES_DENTRO_HISTORIA__) return;
  window.__RM_BOTONES_DENTRO_HISTORIA__ = true;

  function ensureButtons(){
    var box = document.getElementById('rmSideButtons');
    if(!box){
      box = document.createElement('div');
      box.id = 'rmSideButtons';
      box.className = 'rm-side-buttons rm-buttons-inside-history';
      box.setAttribute('aria-label','Navegación rápida');
      box.innerHTML = '<a href="#historyPrincipalSection" title="Historia">🏠</a><a href="#presidentsHistorySection" title="Presidentes Históricos">👥</a><a href="#directivaPublicSection" title="Directiva">🛡️</a><a href="#fixture" title="Fixture">📅</a><a href="#standings" title="Posiciones">📊</a><a href="#seriesRankingSection" title="Ranking">🏆</a><a href="#memberSection" title="Hazte Socio">🤝</a><a href="#sponsorsBottomSection" title="Auspiciadores">⭐</a><a href="admin.html" title="Admin">⚙️</a>';
      document.body.appendChild(box);
    }
    box.classList.remove('rm-buttons-over-history-fixed','rm-quick-center-compact-ok','rm-quick-buttons-over-history');
    box.classList.add('rm-buttons-inside-history');
    box.hidden = false;
    box.style.display = 'flex';
    box.style.visibility = 'visible';
    box.style.opacity = '1';
    return box;
  }

  function placeButtonsInsideHistory(){
    var box = ensureButtons();
    var history = document.getElementById('historyPrincipalSection');
    if(!history) return;

    var text = history.querySelector('.history-principal-text') || history.querySelector('.history-text') || history;
    var title = text.querySelector('h2') || history.querySelector('h2');
    if(!title) return;

    var row = history.querySelector('.rm-history-title-row');
    if(!row){
      row = document.createElement('div');
      row.className = 'rm-history-title-row';
      title.parentNode.insertBefore(row, title);
      row.appendChild(title);
    }else if(title.parentNode !== row){
      row.insertBefore(title, row.firstChild);
    }

    if(box.parentNode !== row){
      row.appendChild(box);
    }

    // Dejar el texto debajo de la fila, sin superposición
    history.classList.add('rm-history-buttons-fixed-layout');
  }

  function fixTopControlsNoOverlap(){
    var music = document.getElementById('topMusicPlayer');
    var social = document.getElementById('topSocialButtons');
    var clock = document.getElementById('topDateClock');

    if(music) music.classList.add('rm-top-music-no-overlap');
    if(social) social.classList.add('rm-social-no-overlap');
    if(clock) clock.classList.add('rm-clock-no-overlap');
  }

  function run(){
    placeButtonsInsideHistory();
    fixTopControlsNoOverlap();
  }

  if(typeof renderPublic === 'function'){
    var old = renderPublic;
    renderPublic = function(){
      var r = old.apply(this, arguments);
      setTimeout(run, 80);
      setTimeout(run, 800);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(run, 100);
    setTimeout(run, 700);
    setTimeout(run, 1800);
    setTimeout(run, 3500);
  });

  window.addEventListener('resize', function(){ setTimeout(run, 120); });
  window.rmBotonesDentroHistoria = run;
})();


/* MOBILE INFO VISIBLE FINAL */
(function(){
  if(window.__RM_MOBILE_INFO_VISIBLE_FINAL__) return;
  window.__RM_MOBILE_INFO_VISIBLE_FINAL__ = true;
  function isMobile(){ return window.innerWidth <= 820; }
  function ensureMobileTopBar(){
    if(!isMobile()) return;
    var bar=document.getElementById('rmMobileTopBar');
    if(!bar){ bar=document.createElement('div'); bar.id='rmMobileTopBar'; bar.className='rm-mobile-top-bar'; document.body.prepend(bar); }
    ['visitorCounterTop','topMusicPlayer','topSocialButtons','topDateClock'].forEach(function(id){
      var el=document.getElementById(id);
      if(el && el.parentElement!==bar) bar.appendChild(el);
      if(el){
        el.classList.add('rm-mobile-control-visible');
        el.style.position='relative'; el.style.top='auto'; el.style.right='auto'; el.style.left='auto'; el.style.bottom='auto';
        el.style.transform='none'; el.style.display='flex'; el.style.visibility='visible'; el.style.opacity='1';
      }
    });
  }
  function forceContentVisible(){
    if(!isMobile()) return;
    document.documentElement.classList.add('rm-mobile-info-visible');
    document.body.classList.add('rm-mobile-info-visible');
    var selectors=[
      'main','#app','.app','.page','.main','.content','.site-content','.public-content','.sections','.container','.wrapper','.layout',
      'section','.section','#historyPrincipalSection','#presidentsHistorySection','#directivaPublicSection','#fixture','#standings',
      '#seriesRankingSection','#memberSection','#sponsorsBottomSection','.history-principal-section','.presidents-history-section',
      '.directiva-public-section','.news-grid','.gallery-grid','.photos-grid','.sponsors-grid','.directiva-public-grid','.card','.panel','.box','.glass'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(function(el){
      if(el.classList && (el.classList.contains('rm-hide-duplicated-history') || el.classList.contains('rm-remove-pres-gallery-duplicate') || el.classList.contains('rm-hide-duplicated-pres-gallery'))) return;
      el.hidden=false; el.style.visibility='visible'; el.style.opacity='1'; el.style.maxWidth='100%'; el.style.boxSizing='border-box'; el.style.transform='none';
      if(el.tagName && el.tagName.toLowerCase()==='section'){ el.style.display='block'; el.style.height='auto'; el.style.minHeight='0'; el.style.maxHeight='none'; el.style.overflow='visible'; }
    });
    var h=document.getElementById('historyPrincipalText');
    if(h){ h.style.display='block'; h.style.overflow='visible'; h.style.maxHeight='none'; h.style.webkitLineClamp='unset'; }
    var dg=document.getElementById('directivaPublicGrid');
    if(dg){ dg.style.display='grid'; dg.style.gridTemplateColumns='1fr'; dg.style.gap='8px'; }
    var presidents=document.getElementById('presidentsHistorySection'), directiva=document.getElementById('directivaPublicSection'), history=document.getElementById('historyPrincipalSection');
    if(presidents && directiva && directiva.parentNode){ directiva.parentNode.insertBefore(presidents,directiva); presidents.style.display='block'; presidents.style.visibility='visible'; }
    else if(presidents && history && history.parentNode){ history.insertAdjacentElement('afterend', presidents); }
    var nav=document.getElementById('rmSideButtons');
    if(nav){
      nav.style.display='flex'; nav.style.visibility='visible'; nav.style.opacity='1'; nav.style.position='fixed';
      nav.style.left='0'; nav.style.right='0'; nav.style.bottom='0'; nav.style.top='auto'; nav.style.transform='none';
    }
  }
  function run(){ ensureMobileTopBar(); forceContentVisible(); }
  if(typeof renderPublic==='function'){ var oldRender=renderPublic; renderPublic=function(){ var r=oldRender.apply(this,arguments); setTimeout(run,80); setTimeout(run,600); setTimeout(run,1400); return r; }; }
  document.addEventListener('DOMContentLoaded',function(){ setTimeout(run,100); setTimeout(run,700); setTimeout(run,1800); setTimeout(run,3500); });
  window.addEventListener('resize',function(){ setTimeout(run,150); });
  window.rmMobileInfoVisibleFinal=run;
})();


/* =========================================================
   FIX SUPABASE MOVIL - CARGA REAL EN CELULAR
   Fuerza que el celular descargue datos desde Supabase igual que PC.
========================================================= */
(function(){
  if(window.__RM_FIX_SUPABASE_MOVIL_FINAL__) return;
  window.__RM_FIX_SUPABASE_MOVIL_FINAL__ = true;

  const RM_SUPABASE_URL = "https://xzcbdyabzgwfoylipgco.supabase.co";
  const RM_SUPABASE_KEY = "sb_publishable_rFYVLbY_0uJvOLJ0jftWzw_jsmNwVkl";
  const RM_TABLE_CANDIDATES = ["directors", "fixture_images", "gallery", "news", "presidents", "results", "settings", "site_visits", "sponsors", "standings", "club_data", "site_data", "club_settings", "public_data", "data", "content"];
  const RM_STORAGE_KEYS = [
    'rmClubData','clubData','cd_rm_data','ricardoMendezData','club_ricardo_mendez_data',
    'rm_public_data','siteData','data'
  ];

  function isMobileLike(){
    return window.innerWidth <= 900 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  }

  function log(){
    try{ console.log.apply(console, ['[RM SUPABASE MOVIL]'].concat([].slice.call(arguments))); }catch(e){}
  }

  function loadScript(src){
    return new Promise(function(resolve, reject){
      if(document.querySelector('script[src="'+src+'"]')) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function ensureSupabase(){
    try{ if(typeof initSB === 'function') initSB(); }catch(e){}

    if(window.supabaseClient && typeof window.supabaseClient.from === 'function') return window.supabaseClient;
    if(window.sb && typeof window.sb.from === 'function') return window.sb;
    if(window._supabase && typeof window._supabase.from === 'function') return window._supabase;

    if(!(window.supabase && typeof window.supabase.createClient === 'function')){
      try{ await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'); }catch(e){ log('No cargó CDN Supabase', e); }
    }

    if(window.supabase && typeof window.supabase.createClient === 'function'){
      const client = window.supabase.createClient(RM_SUPABASE_URL, RM_SUPABASE_KEY);
      window.supabaseClient = client;
      window.sb = client;
      return client;
    }

    return null;
  }

  function getExistingData(){
    try{ if(typeof getData === 'function') return getData() || {}; }catch(e){}
    for(const k of RM_STORAGE_KEYS){
      try{
        const raw = localStorage.getItem(k);
        if(raw) return JSON.parse(raw);
      }catch(e){}
    }
    return {};
  }

  function saveEverywhere(data){
    if(!data || typeof data !== 'object') return;
    try{ if(typeof saveData === 'function') saveData(data); }catch(e){}
    for(const k of RM_STORAGE_KEYS){
      try{ localStorage.setItem(k, JSON.stringify(data)); }catch(e){}
    }
    try{ window.RM_DATA = data; }catch(e){}
    try{ window.clubData = data; }catch(e){}
  }

  function mergeDeep(target, source){
    if(!source || typeof source !== 'object') return target;
    if(Array.isArray(source)) return source;
    target = target && typeof target === 'object' && !Array.isArray(target) ? target : {};
    Object.keys(source).forEach(function(k){
      const sv = source[k];
      if(sv && typeof sv === 'object' && !Array.isArray(sv)){
        target[k] = mergeDeep(target[k], sv);
      }else if(sv !== undefined && sv !== null){
        target[k] = sv;
      }
    });
    return target;
  }

  function normalizeRecord(row){
    if(!row || typeof row !== 'object') return null;

    // Formatos tipo { key:'data', value:{...} } o { name:'x', data:{...} }
    if(row.data && typeof row.data === 'object') return row.data;
    if(row.value && typeof row.value === 'object') return row.value;
    if(row.content && typeof row.content === 'object') return row.content;
    if(row.payload && typeof row.payload === 'object') return row.payload;
    if(row.json && typeof row.json === 'object') return row.json;
    if(row.settings && typeof row.settings === 'object') return row.settings;

    // Si tiene JSON en texto
    for(const k of ['data','value','content','payload','json','settings']){
      if(typeof row[k] === 'string'){
        try{
          const parsed = JSON.parse(row[k]);
          if(parsed && typeof parsed === 'object') return parsed;
        }catch(e){}
      }
    }

    // Si es una fila de contenido útil completa
    const copy = Object.assign({}, row);
    delete copy.id; delete copy.created_at; delete copy.updated_at;
    return copy;
  }

  async function fetchTable(client, table){
    try{
      let q = client.from(table).select('*');
      const res = await q;
      if(res.error) throw res.error;
      if(!Array.isArray(res.data) || !res.data.length) return null;

      // Preferir filas marcadas como principal/public/main si existen
      const preferred = res.data.find(r => {
        const key = String(r.key || r.name || r.slug || r.type || r.page || '').toLowerCase();
        return ['main','public','home','club','data','site','settings','principal'].includes(key);
      }) || res.data[0];

      // Si tabla trae varias filas por sección, armar objeto por keys
      const built = {};
      let sectionRows = false;
      res.data.forEach(function(row){
        const key = row.key || row.name || row.slug || row.type || row.section;
        const val = normalizeRecord(row);
        if(key && val){
          built[key] = val;
          sectionRows = true;
        }
      });

      const single = normalizeRecord(preferred);
      if(sectionRows && Object.keys(built).length > 1){
        return mergeDeep(single && typeof single === 'object' ? single : {}, built);
      }
      return single;
    }catch(e){
      log('Tabla falló', table, e && e.message ? e.message : e);
      return null;
    }
  }

  async function fetchStorageData(client){
    // En caso de que la app guarde JSON en Storage, probar nombres comunes.
    const buckets = ['club-assets','public','assets'];
    const files = ['data.json','club-data.json','site-data.json','rm-data.json','public-data.json'];
    for(const bucket of buckets){
      for(const file of files){
        try{
          const res = await client.storage.from(bucket).download(file);
          if(res.error) continue;
          const text = await res.data.text();
          const parsed = JSON.parse(text);
          if(parsed && typeof parsed === 'object') return parsed;
        }catch(e){}
      }
    }
    return null;
  }

  async function pullSupabaseMobile(){
    const client = await ensureSupabase();
    if(!client){
      log('No hay cliente Supabase');
      return false;
    }

    let merged = getExistingData();
    let loaded = false;

    for(const table of RM_TABLE_CANDIDATES){
      const data = await fetchTable(client, table);
      if(data && typeof data === 'object' && Object.keys(data).length){
        merged = mergeDeep(merged, data);
        loaded = true;
        log('Datos cargados desde tabla', table);
      }
    }

    const storageData = await fetchStorageData(client);
    if(storageData){
      merged = mergeDeep(merged, storageData);
      loaded = true;
      log('Datos cargados desde Storage');
    }

    if(loaded){
      saveEverywhere(merged);
      try{ if(typeof renderPublic === 'function') renderPublic(); }catch(e){ log('renderPublic error', e); }
      try{ if(typeof renderAll === 'function') renderAll(); }catch(e){}
      try{ if(typeof loadRealPublicDataFinal === 'function') loadRealPublicDataFinal(); }catch(e){}
      try{ if(typeof window.rmRenderPresidentesHistoricosFinalOK === 'function') window.rmRenderPresidentesHistoricosFinalOK(); }catch(e){}
      try{ if(typeof window.rmMobileInfoVisibleFinal === 'function') window.rmMobileInfoVisibleFinal(); }catch(e){}
      document.dispatchEvent(new CustomEvent('rm:supabase-mobile-loaded', {detail: merged}));
      return true;
    }

    log('No se encontraron datos nuevos en Supabase');
    return false;
  }

  function runMobileLoad(){
    if(!isMobileLike()) return;
    // correr varias veces porque en móvil a veces el script de supabase carga tarde
    pullSupabaseMobile();
    setTimeout(pullSupabaseMobile, 1200);
    setTimeout(pullSupabaseMobile, 3200);
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(runMobileLoad, 300);
    setTimeout(runMobileLoad, 1800);
  });
  window.addEventListener('pageshow', function(){ setTimeout(runMobileLoad, 300); });
  window.addEventListener('focus', function(){ setTimeout(runMobileLoad, 300); });

  window.rmForzarSupabaseMovil = pullSupabaseMobile;
})();


/* REVISION FINAL 7 PUNTOS */
(function(){
 if(window.__RM_REVISION_FINAL_7_PUNTOS__) return;
 window.__RM_REVISION_FINAL_7_PUNTOS__=true;
 var RM_SUPABASE_URL="https://xzcbdyabzgwfoylipgco.supabase.co";
 var RM_SUPABASE_KEY="sb_publishable_rFYVLbY_0uJvOLJ0jftWzw_jsmNwVkl";

 function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
 function norm(t){return String(t||'').toLowerCase().replace(/\s+/g,' ').trim();}
 function getDataSafe(){try{if(typeof getData==='function')return getData()||{};}catch(e){}try{return JSON.parse(localStorage.getItem('rmClubData')||localStorage.getItem('clubData')||'{}');}catch(e){return {};}}
 function ensureSB(){try{if(typeof initSB==='function')initSB();}catch(e){}if(window.supabaseClient&&window.supabaseClient.from)return window.supabaseClient;if(window.sb&&window.sb.from)return window.sb;if(window.supabase&&window.supabase.createClient){window.supabaseClient=window.supabase.createClient(RM_SUPABASE_URL,RM_SUPABASE_KEY);window.sb=window.supabaseClient;return window.supabaseClient;}return null;}

 // 1. contador cada apertura
 async function countVisitEveryOpen(){
   if(window.__RM_COUNTED_THIS_OPEN__)return; window.__RM_COUNTED_THIS_OPEN__=true;
   ensureVisitorCounter();
   var num=document.getElementById('visitorCounterNumber');
   function set(n){if(num)num.textContent=Number(n||0).toLocaleString('es-CL');}
   var local=Number(localStorage.getItem('rm_visit_count_public')||'0')+1;
   localStorage.setItem('rm_visit_count_public',String(local)); set(local);
   var client=ensureSB(); if(!client)return;
   try{
     await client.from('site_visits').insert({page:location.pathname||'/',user_agent:navigator.userAgent||'',created_at:new Date().toISOString()});
     var r=await client.from('site_visits').select('*',{count:'exact',head:true});
     if(!r.error&&typeof r.count==='number')set(r.count);
   }catch(e){console.warn('[RM] contador Supabase falló, queda local',e);}
 }
 function ensureVisitorCounter(){
   if(document.getElementById('visitorCounterTop'))return;
   var box=document.createElement('div');box.id='visitorCounterTop';box.className='visitor-counter-top';
   box.innerHTML='<span>👁️</span><div><strong id="visitorCounterNumber">0</strong><small>Visitas</small></div>';
   document.body.prepend(box);
 }

 // 2 y 7. quitar duplicados
 function removeDuplicateIds(){
   var seen={};
   document.querySelectorAll('[id]').forEach(function(el){
     if(!el.id)return;
     if(!seen[el.id]){seen[el.id]=el;return;}
     if(['historyPrincipalSection','presidentsHistorySection','directivaPublicSection','rmSideButtons','topMusicPlayer','topSocialButtons','topDateClock','visitorCounterTop','memberRequestForm','statPlayersRegistered'].indexOf(el.id)>=0)el.remove();
   });
 }
 function removeDuplicateSections(){
   var seen={};
   document.querySelectorAll('section,.section').forEach(function(sec){
     if(sec.id&&['historyPrincipalSection','presidentsHistorySection','directivaPublicSection'].indexOf(sec.id)>=0)return;
     var h=sec.querySelector('h1,h2,h3,.section-title,.section-head h2');
     var title=norm(h?h.textContent:'');
     var key=['historia del club','directiva actual','presidentes históricos','presidentes historicos','auspiciadores oficiales','últimas noticias','ultimas noticias','galería','galeria','fixture','tabla de posiciones'].find(function(k){return title.indexOf(k)>=0;});
     if(!key)return;
     if(seen[key])sec.remove(); else seen[key]=sec;
   });
 }
 function dedupe(containerSel,itemSel,keyFn){
   document.querySelectorAll(containerSel).forEach(function(c){
     var seen=new Set();
     c.querySelectorAll(itemSel).forEach(function(it){
       var k=keyFn(it); if(!k)return;
       if(seen.has(k))it.remove(); else seen.add(k);
     });
   });
 }
 function removeDuplicateCards(){
   dedupe('#directivaPublicGrid,.directiva-public-grid','.directiva-public-card,.director-card',function(i){return norm(i.textContent);});
   dedupe('#presidentsHistoryGrid,.presidents-history-grid,.presidents-grid','.president-history-card-final,.president-card',function(i){return norm(i.textContent);});
   dedupe('.sponsors-grid,.sponsors-marquee,.sponsors-track,#sponsorsBottomSection','img,.sponsor-card,.sponsor-item,.sponsor-logo',function(i){var img=i.tagName==='IMG'?i:i.querySelector('img');return img?(img.src||img.getAttribute('src')||''):norm(i.textContent);});
   dedupe('.news-grid,.noticias-grid','.news-card,.noticia-card,.card-news',function(i){var img=i.querySelector('img');return norm(i.textContent)+'|'+(img?img.src:'');});
   dedupe('.gallery-grid,.galeria-grid,.photos-grid,.photo-grid','.gallery-card,.photo-card,.gallery-item,.galeria-card,.galeria-item,img',function(i){var img=i.tagName==='IMG'?i:i.querySelector('img');return img?(img.src||img.getAttribute('src')||''):norm(i.textContent);});
 }
 function removeAllDuplicates(){removeDuplicateIds();removeDuplicateSections();removeDuplicateCards();}

 // 3. auspiciadores ampliables
 function ensureLightbox(){
   var m=document.getElementById('rmSponsorLightbox');
   if(!m){
     m=document.createElement('div');m.id='rmSponsorLightbox';m.className='rm-sponsor-lightbox';
     m.innerHTML='<button type="button" class="rm-sponsor-lightbox-close">×</button><img alt="Auspiciador ampliado"><p>Haz clic fuera de la imagen para cerrar</p>';
     document.body.appendChild(m);
     m.addEventListener('click',function(e){if(e.target===m||e.target.classList.contains('rm-sponsor-lightbox-close'))m.classList.remove('open');});
     document.addEventListener('keydown',function(e){if(e.key==='Escape')m.classList.remove('open');});
   }
   return m;
 }
 function bindSponsorZoom(){
   var modal=ensureLightbox(), modalImg=modal.querySelector('img');
   document.querySelectorAll('#sponsorsBottomSection img,.sponsors-grid img,.sponsors-marquee img,.sponsors-track img,.sponsor-card img,.sponsor-item img,.sponsor-logo img,img[alt*="auspiciador" i]').forEach(function(img){
     if(img.dataset.rmSponsorZoom==='1')return; img.dataset.rmSponsorZoom='1'; img.style.cursor='zoom-in';
     img.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();modalImg.src=img.src||img.getAttribute('src')||'';modalImg.alt=img.alt||'Auspiciador';modal.classList.add('open');},false);
   });
 }

 // 4. presidentes sobre directiva
 function ensurePresidentsAboveDirectiva(){
   var p=document.getElementById('presidentsHistorySection');
   if(!p){p=document.createElement('section');p.id='presidentsHistorySection';p.className='section presidents-history-section rm-presidents-section-final';p.innerHTML='<div class="section-head"><h2>Presidentes Históricos</h2><p>Personas que han guiado la institución</p></div><div id="presidentsHistoryGrid" class="presidents-grid presidents-history-grid"><div class="presidents-empty-final-ok">Presidentes históricos pendiente de cargar desde Admin.</div></div>';}
   p.hidden=false;p.style.display='block';p.style.visibility='visible';
   var h=p.querySelector('h2'); if(h)h.textContent='Presidentes Históricos';
   var d=document.getElementById('directivaPublicSection'), hist=document.getElementById('historyPrincipalSection'), main=document.querySelector('main')||document.body;
   if(d&&d.parentNode)d.parentNode.insertBefore(p,d);else if(hist&&hist.parentNode)hist.insertAdjacentElement('afterend',p);else if(!p.parentNode)main.prepend(p);
 }

 // 5. jugadores inscritos
 function statsArea(){
   var c=Array.from(document.querySelectorAll('.stats,.metrics,.hero-stats,.club-stats,.counter-grid,.dashboard-cards,.summary-cards,.cards-row,.stat-grid'));
   var best=c.find(function(x){return /socios|series|campeonatos|fundado/i.test(x.textContent||'');});
   if(best)return best;
   var cards=Array.from(document.querySelectorAll('.card,.stat-card,.metric-card,.glass,.panel')).filter(function(x){return /socios|series|campeonatos|fundado/i.test(x.textContent||'');});
   return cards.length?cards[0].parentElement:null;
 }
 function playersCount(){var d=getDataSafe();return d.playersCount||d.jugadoresInscritos||d.registeredPlayers||(d.settings&&(d.settings.playersCount||d.settings.jugadoresInscritos))||0;}
 function ensurePlayersStat(){
   var existing=document.getElementById('statPlayersRegistered'); if(existing){var st=existing.querySelector('strong');if(st)st.textContent=playersCount();return;}
   var a=statsArea(); if(!a)return;
   var card=document.createElement('div');card.id='statPlayersRegistered';card.className='stat-card metric-card glass rm-players-stat-card';
   card.innerHTML='<span>Jugadores inscritos</span><strong>'+esc(playersCount())+'</strong>';
   a.appendChild(card);a.classList.add('rm-stats-with-players');
 }

 // 6. solicitud socio con +569
 function ensureMemberForm(){
   var s=document.getElementById('memberSection')||document.getElementById('sociosSection')||document.querySelector('[id*="socio" i],.member-section,.socios-section');
   if(!s){s=document.createElement('section');s.id='memberSection';s.className='section member-section';s.innerHTML='<div class="section-head"><h2>Hazte Socio</h2><p>Completa tus datos para solicitar inscripción</p></div>'; (document.querySelector('main')||document.body).appendChild(s);}
   var f=document.getElementById('memberRequestForm');
   if(!f){f=document.createElement('form');f.id='memberRequestForm';f.className='member-request-form rm-member-form-final';f.innerHTML='<label>Nombre completo<input name="nombre" type="text" required placeholder="Nombre y apellido"></label><label>RUT<input name="rut" type="text" required placeholder="12.345.678-9"></label><label>Teléfono<input id="memberPhoneInput" name="telefono" type="tel" required value="+569" placeholder="+569XXXXXXXX" pattern="\\+569[0-9]{8}" maxlength="12"></label><label>Correo<input name="correo" type="email" placeholder="correo@ejemplo.cl"></label><button type="submit">Enviar solicitud de socio</button><small class="member-phone-help">El teléfono debe comenzar con +569 y luego 8 números.</small>';s.appendChild(f);}
   var phone=f.querySelector('#memberPhoneInput')||f.querySelector('input[type="tel"],input[name*="fono" i],input[name*="telefono" i],input[name*="phone" i]');
   if(phone){
     phone.id='memberPhoneInput';phone.type='tel';phone.maxLength=12;phone.pattern='\\+569[0-9]{8}';phone.placeholder='+569XXXXXXXX';
     if(!phone.value||!phone.value.startsWith('+569'))phone.value='+569';
     if(phone.dataset.rmPhoneBound!=='1'){phone.dataset.rmPhoneBound='1';phone.addEventListener('input',function(){var digits=phone.value.replace(/\D/g,'');if(digits.startsWith('569'))digits=digits.slice(3);else if(digits.startsWith('56'))digits=digits.slice(2);else if(digits.startsWith('9'))digits=digits.slice(1);digits=digits.slice(0,8);phone.value='+569'+digits;});phone.addEventListener('focus',function(){if(!phone.value||!phone.value.startsWith('+569'))phone.value='+569';});}
   }
   if(f.dataset.rmSubmitBound!=='1'){f.dataset.rmSubmitBound='1';f.addEventListener('submit',function(e){e.preventDefault();var fd=new FormData(f);var tel=String(fd.get('telefono')||'').trim();if(!/^\+569\d{8}$/.test(tel)){alert('El teléfono debe comenzar con +569 y tener 8 números después.');return;}var msg='Solicitud de socio Club Deportivo Ricardo Méndez%0A'+'Nombre: '+encodeURIComponent(String(fd.get('nombre')||''))+'%0A'+'RUT: '+encodeURIComponent(String(fd.get('rut')||''))+'%0A'+'Teléfono: '+encodeURIComponent(tel)+'%0A'+'Correo: '+encodeURIComponent(String(fd.get('correo')||''));window.open('https://wa.me/569?text='+msg,'_blank');});}
 }

 function runFinal(){
   ensureVisitorCounter(); countVisitEveryOpen(); ensurePresidentsAboveDirectiva(); ensurePlayersStat(); ensureMemberForm(); bindSponsorZoom();
   setTimeout(removeAllDuplicates,60);
   setTimeout(function(){ensurePresidentsAboveDirectiva();ensurePlayersStat();bindSponsorZoom();removeAllDuplicates();},700);
 }
 if(typeof renderPublic==='function'){var old=renderPublic;renderPublic=function(){var r=old.apply(this,arguments);setTimeout(runFinal,80);setTimeout(runFinal,900);return r;};}
 document.addEventListener('DOMContentLoaded',function(){setTimeout(runFinal,100);setTimeout(runFinal,900);setTimeout(runFinal,2200);setTimeout(runFinal,4200);});
 window.addEventListener('pageshow',function(){setTimeout(runFinal,200);});
 window.addEventListener('resize',function(){setTimeout(runFinal,150);});
 window.rmRevisionFinal7Puntos=runFinal;
})();


/* FIX HAZTE SOCIO UNICO */
(function(){
 if(window.__RM_HAZTE_SOCIO_UNICO__) return;
 window.__RM_HAZTE_SOCIO_UNICO__=true;
 function tx(el){return String(el&&el.textContent||'').toLowerCase().replace(/\s+/g,' ').trim();}
 function isSocioSection(el){
   if(!el) return false;
   var h=el.querySelector&&el.querySelector('h1,h2,h3,.section-title,.section-head h2');
   var t=tx(h);
   return t.includes('hazte socio')||t.includes('solicitud de socio')||el.id==='memberSection'||el.id==='sociosSection'||(el.classList&&(el.classList.contains('member-section')||el.classList.contains('socios-section')));
 }
 function makeSection(){
   var s=document.createElement('section');
   s.id='memberSection';
   s.className='section member-section rm-member-section-unica';
   s.innerHTML='<div class="section-head"><h2>Hazte Socio</h2><p>Completa tus datos para solicitar inscripción</p></div><form id="memberRequestForm" class="member-request-form rm-member-form-final"><label>Nombre completo<input name="nombre" type="text" required placeholder="Nombre y apellido"></label><label>RUT<input name="rut" type="text" required placeholder="12.345.678-9"></label><label>Teléfono<input id="memberPhoneInput" name="telefono" type="tel" required value="+569" placeholder="+569XXXXXXXX" pattern="\\+569[0-9]{8}" maxlength="12"></label><label>Correo<input name="correo" type="email" placeholder="correo@ejemplo.cl"></label><button type="submit">Enviar solicitud de socio</button><small class="member-phone-help">El teléfono debe comenzar con +569 y luego 8 números.</small></form>';
   return s;
 }
 function phoneOk(form){
   var ph=form.querySelector('#memberPhoneInput')||form.querySelector('input[type="tel"],input[name*="fono" i],input[name*="telefono" i],input[name*="phone" i]');
   if(!ph) return;
   ph.id='memberPhoneInput'; ph.name=ph.name||'telefono'; ph.type='tel'; ph.maxLength=12; ph.pattern='\\+569[0-9]{8}'; ph.placeholder='+569XXXXXXXX';
   if(!ph.value||!ph.value.startsWith('+569')) ph.value='+569';
   if(ph.dataset.rmSocioPhone==='1') return;
   ph.dataset.rmSocioPhone='1';
   ph.addEventListener('input',function(){
     var d=ph.value.replace(/\D/g,'');
     if(d.startsWith('569')) d=d.slice(3); else if(d.startsWith('56')) d=d.slice(2); else if(d.startsWith('9')) d=d.slice(1);
     ph.value='+569'+d.slice(0,8);
   });
   ph.addEventListener('focus',function(){ if(!ph.value||!ph.value.startsWith('+569')) ph.value='+569'; });
 }
 function bindSubmit(form){
   if(!form||form.dataset.rmSocioSubmit==='1') return;
   form.dataset.rmSocioSubmit='1';
   form.addEventListener('submit',function(e){
     e.preventDefault();
     var fd=new FormData(form), tel=String(fd.get('telefono')||'').trim();
     if(!/^\+569\d{8}$/.test(tel)){alert('El teléfono debe comenzar con +569 y tener 8 números después.');return;}
     var msg='Solicitud de socio Club Deportivo Ricardo Méndez%0A'+'Nombre: '+encodeURIComponent(String(fd.get('nombre')||''))+'%0A'+'RUT: '+encodeURIComponent(String(fd.get('rut')||''))+'%0A'+'Teléfono: '+encodeURIComponent(tel)+'%0A'+'Correo: '+encodeURIComponent(String(fd.get('correo')||''));
     window.open('https://wa.me/569?text='+msg,'_blank');
   });
 }
 function fix(){
   var sections=Array.from(document.querySelectorAll('section,.section')).filter(isSocioSection);
   var main=sections.find(function(s){return s.id==='memberSection';})||sections.find(function(s){return s.querySelector('form');})||sections[0];
   if(!main){ main=makeSection(); (document.querySelector('main')||document.body).appendChild(main); }
   main.id='memberSection'; main.classList.add('rm-member-section-unica'); main.hidden=false; main.style.display='block'; main.style.visibility='visible';
   var head=main.querySelector('.section-head'); if(!head){head=document.createElement('div'); head.className='section-head'; main.prepend(head);}
   if(!head.querySelector('h2')) head.insertAdjacentHTML('afterbegin','<h2>Hazte Socio</h2>');
   head.querySelector('h2').textContent='Hazte Socio';
   if(!head.querySelector('p')) head.insertAdjacentHTML('beforeend','<p>Completa tus datos para solicitar inscripción</p>');
   var forms=Array.from(document.querySelectorAll('#memberRequestForm,form.member-request-form,form.rm-member-form-final'));
   var form=main.querySelector('#memberRequestForm,form.member-request-form,form.rm-member-form-final')||forms[0];
   if(!form){form=makeSection().querySelector('form'); main.appendChild(form);} else if(form.parentElement!==main) main.appendChild(form);
   form.id='memberRequestForm'; form.classList.add('rm-member-form-final'); phoneOk(form); bindSubmit(form);
   Array.from(document.querySelectorAll('#memberRequestForm,form.member-request-form,form.rm-member-form-final')).forEach(function(f){ if(f!==form) f.remove(); });
   Array.from(document.querySelectorAll('section,.section')).filter(isSocioSection).forEach(function(s){ if(s!==main) s.remove(); });
 }
 if(typeof renderPublic==='function'){var old=renderPublic;renderPublic=function(){var r=old.apply(this,arguments);setTimeout(fix,80);setTimeout(fix,900);return r;};}
 document.addEventListener('DOMContentLoaded',function(){setTimeout(fix,100);setTimeout(fix,900);setTimeout(fix,2200);setTimeout(fix,4200);});
 window.addEventListener('pageshow',function(){setTimeout(fix,200);});
 window.rmFixHazteSocioUnico=fix;
})();


/* =========================================================
   FIX HAZTE SOCIO UNICO V2 - REVISION FINAL
   Deja solo una sección "Hazte Socio" aunque otros scripts la recreen.
========================================================= */
(function(){
  if(window.__RM_HAZTE_SOCIO_UNICO_V2__) return;
  window.__RM_HAZTE_SOCIO_UNICO_V2__ = true;

  function text(el){
    return String(el && el.textContent ? el.textContent : '').toLowerCase().replace(/\s+/g,' ').trim();
  }

  function isSocioBlock(el){
    if(!el || el === document.body || el === document.documentElement) return false;

    var id = String(el.id || '').toLowerCase();
    var cls = String(el.className || '').toLowerCase();
    var heading = el.querySelector ? el.querySelector('h1,h2,h3,.section-title,.section-head h2,.card-title') : null;
    var ht = text(heading);
    var own = text(el);

    if(id === 'membersection' || id === 'sociossection') return true;
    if(cls.includes('member-section') || cls.includes('socios-section') || cls.includes('rm-member-section-unica')) return true;
    if(ht === 'hazte socio' || ht.includes('hazte socio') || ht.includes('solicitud de socio')) return true;

    // Bloques visuales que contienen el formulario o texto de socio.
    if(el.querySelector && el.querySelector('#memberRequestForm, form.member-request-form, form.rm-member-form-final')) return true;

    // No considerar botones/links del menú como sección duplicada.
    if(['A','BUTTON'].includes(el.tagName)) return false;

    // Tarjetas/paneles/secciones que solo repiten Hazte Socio.
    if((el.matches && el.matches('section,.section,.card,.panel,.box,.glass,.member-card,.socios-card,.cta-card,article')) &&
       own.includes('hazte socio') &&
       (own.includes('nombre') || own.includes('rut') || own.includes('teléfono') || own.includes('telefono') || own.includes('solicitud') || own.length < 450)){
      return true;
    }

    return false;
  }

  function createCanonicalSection(){
    var s = document.createElement('section');
    s.id = 'memberSection';
    s.className = 'section member-section rm-member-section-unica';
    s.innerHTML =
      '<div class="section-head"><h2>Hazte Socio</h2><p>Completa tus datos para solicitar inscripción</p></div>' +
      '<form id="memberRequestForm" class="member-request-form rm-member-form-final" autocomplete="on">' +
      '<label>Nombre completo<input name="nombre" type="text" required placeholder="Nombre y apellido"></label>' +
      '<label>RUT<input name="rut" type="text" required placeholder="12.345.678-9"></label>' +
      '<label>Teléfono<input id="memberPhoneInput" name="telefono" type="tel" required value="+569" placeholder="+569XXXXXXXX" pattern="\\+569[0-9]{8}" maxlength="12"></label>' +
      '<label>Correo<input name="correo" type="email" placeholder="correo@ejemplo.cl"></label>' +
      '<button type="submit">Enviar solicitud de socio</button>' +
      '<small class="member-phone-help">El teléfono debe comenzar con +569 y luego 8 números.</small>' +
      '</form>';
    return s;
  }

  function normalizePhone(phone){
    if(!phone) return;
    phone.id = 'memberPhoneInput';
    phone.name = phone.name || 'telefono';
    phone.type = 'tel';
    phone.maxLength = 12;
    phone.pattern = '\\+569[0-9]{8}';
    phone.placeholder = '+569XXXXXXXX';
    if(!phone.value || !phone.value.startsWith('+569')) phone.value = '+569';

    if(phone.dataset.rmPhoneV2 === '1') return;
    phone.dataset.rmPhoneV2 = '1';
    phone.addEventListener('input', function(){
      var digits = phone.value.replace(/\D/g,'');
      if(digits.startsWith('569')) digits = digits.slice(3);
      else if(digits.startsWith('56')) digits = digits.slice(2);
      else if(digits.startsWith('9')) digits = digits.slice(1);
      phone.value = '+569' + digits.slice(0, 8);
    });
    phone.addEventListener('focus', function(){
      if(!phone.value || !phone.value.startsWith('+569')) phone.value = '+569';
    });
  }

  function bindSubmit(form){
    if(!form || form.dataset.rmSubmitV2 === '1') return;
    form.dataset.rmSubmitV2 = '1';
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var fd = new FormData(form);
      var tel = String(fd.get('telefono') || '').trim();

      if(!/^\+569\d{8}$/.test(tel)){
        alert('El teléfono debe comenzar con +569 y tener 8 números después.');
        return;
      }

      var msg =
        'Solicitud de socio Club Deportivo Ricardo Méndez%0A' +
        'Nombre: ' + encodeURIComponent(String(fd.get('nombre') || '')) + '%0A' +
        'RUT: ' + encodeURIComponent(String(fd.get('rut') || '')) + '%0A' +
        'Teléfono: ' + encodeURIComponent(tel) + '%0A' +
        'Correo: ' + encodeURIComponent(String(fd.get('correo') || ''));

      window.open('https://wa.me/569?text=' + msg, '_blank');
    });
  }

  function chooseCanonical(blocks){
    return blocks.find(function(b){ return b.id === 'memberSection'; }) ||
           blocks.find(function(b){ return b.querySelector && b.querySelector('#memberRequestForm'); }) ||
           blocks.find(function(b){ return b.querySelector && b.querySelector('form'); }) ||
           blocks[0];
  }

  function fixHazteSocioUnicoV2(){
    var blocks = Array.from(document.querySelectorAll('section,.section,.card,.panel,.box,.glass,.member-card,.socios-card,.cta-card,article')).filter(isSocioBlock);

    var canonical = chooseCanonical(blocks);
    if(!canonical){
      canonical = createCanonicalSection();
      (document.querySelector('main') || document.body).appendChild(canonical);
    }

    canonical.id = 'memberSection';
    canonical.classList.add('section','member-section','rm-member-section-unica');
    canonical.hidden = false;
    canonical.style.display = 'block';
    canonical.style.visibility = 'visible';
    canonical.style.opacity = '1';

    var head = canonical.querySelector('.section-head');
    if(!head){
      head = document.createElement('div');
      head.className = 'section-head';
      canonical.prepend(head);
    }
    var h2 = head.querySelector('h2');
    if(!h2){
      h2 = document.createElement('h2');
      head.prepend(h2);
    }
    h2.textContent = 'Hazte Socio';

    if(!head.querySelector('p')){
      var p = document.createElement('p');
      p.textContent = 'Completa tus datos para solicitar inscripción';
      head.appendChild(p);
    }

    var allForms = Array.from(document.querySelectorAll('#memberRequestForm, form.member-request-form, form.rm-member-form-final'));
    var form = canonical.querySelector('#memberRequestForm, form.member-request-form, form.rm-member-form-final') || allForms[0];

    if(!form){
      form = createCanonicalSection().querySelector('form');
      canonical.appendChild(form);
    } else if(form.parentElement !== canonical) {
      canonical.appendChild(form);
    }

    form.id = 'memberRequestForm';
    form.classList.add('member-request-form','rm-member-form-final');

    var phone = form.querySelector('#memberPhoneInput') ||
      form.querySelector('input[type="tel"],input[name*="fono" i],input[name*="telefono" i],input[name*="phone" i]');
    if(!phone){
      var label = document.createElement('label');
      label.innerHTML = 'Teléfono<input id="memberPhoneInput" name="telefono" type="tel" required value="+569" placeholder="+569XXXXXXXX" pattern="\\+569[0-9]{8}" maxlength="12">';
      form.insertBefore(label, form.querySelector('button'));
      phone = label.querySelector('input');
    }
    normalizePhone(phone);
    bindSubmit(form);

    // Eliminar todos los otros formularios duplicados.
    Array.from(document.querySelectorAll('#memberRequestForm, form.member-request-form, form.rm-member-form-final')).forEach(function(f){
      if(f !== form) f.remove();
    });

    // Eliminar todos los otros bloques/secciones que repitan Hazte Socio.
    Array.from(document.querySelectorAll('section,.section,.card,.panel,.box,.glass,.member-card,.socios-card,.cta-card,article')).forEach(function(b){
      if(b !== canonical && isSocioBlock(b)) b.remove();
    });

    // Si quedó dentro de una tarjeta o bloque que puede duplicarse, mover al main.
    var container = document.querySelector('main') || document.body;
    if(canonical.parentElement !== container && canonical.parentElement && canonical.parentElement.matches('.card,.panel,.box,.glass,article')){
      container.appendChild(canonical);
    }

    // Marcar para CSS y para futuras revisiones.
    canonical.dataset.rmSocioUnico = '1';
  }

  if(typeof renderPublic === 'function'){
    var oldRender = renderPublic;
    renderPublic = function(){
      var r = oldRender.apply(this, arguments);
      setTimeout(fixHazteSocioUnicoV2, 80);
      setTimeout(fixHazteSocioUnicoV2, 900);
      setTimeout(fixHazteSocioUnicoV2, 1800);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(fixHazteSocioUnicoV2, 100);
    setTimeout(fixHazteSocioUnicoV2, 900);
    setTimeout(fixHazteSocioUnicoV2, 2200);
    setTimeout(fixHazteSocioUnicoV2, 4500);
    setTimeout(fixHazteSocioUnicoV2, 7000);
  });

  window.addEventListener('pageshow', function(){ setTimeout(fixHazteSocioUnicoV2, 200); });
  window.addEventListener('resize', function(){ setTimeout(fixHazteSocioUnicoV2, 150); });

  window.rmFixHazteSocioUnicoV2 = fixHazteSocioUnicoV2;
})();


/* =========================================================
   FIX AUSPICIADORES FINAL + MUSICA COSTADO HISTORIA
========================================================= */
(function(){
  if(window.__RM_FIX_SPONSORS_FINAL_MUSIC_HISTORY__) return;
  window.__RM_FIX_SPONSORS_FINAL_MUSIC_HISTORY__ = true;

  function mainContainer(){
    return document.querySelector('main') || document.querySelector('#app') || document.body;
  }

  function sponsorKey(img){
    return String((img && (img.src || img.getAttribute('src') || img.alt || '')) || '').trim();
  }

  function collectSponsorImages(){
    var imgs = [];
    var selectors = [
      '#sponsorsBottomSection img',
      '.sponsors-grid img',
      '.sponsors-marquee img',
      '.sponsors-track img',
      '.sponsor-card img',
      '.sponsor-item img',
      '.sponsor-logo img',
      '[class*="sponsor"] img',
      '[class*="auspiciador"] img',
      'img[alt*="auspiciador" i]',
      'img[alt*="sponsor" i]'
    ].join(',');

    document.querySelectorAll(selectors).forEach(function(img){
      var src = img.getAttribute('src') || img.src || '';
      if(!src || src.includes('logo_ricardo_mendez')) return;
      imgs.push(img);
    });

    var seen = new Set();
    return imgs.filter(function(img){
      var k = sponsorKey(img);
      if(!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  function ensureSponsorLightbox(){
    var modal = document.getElementById('rmSponsorLightbox');
    if(!modal){
      modal = document.createElement('div');
      modal.id = 'rmSponsorLightbox';
      modal.className = 'rm-sponsor-lightbox';
      modal.innerHTML = '<button type="button" class="rm-sponsor-lightbox-close" aria-label="Cerrar">×</button><img alt="Auspiciador ampliado"><p>Haz clic fuera de la imagen para cerrar</p>';
      document.body.appendChild(modal);
      modal.addEventListener('click', function(e){
        if(e.target === modal || e.target.classList.contains('rm-sponsor-lightbox-close')){
          modal.classList.remove('open');
        }
      });
      document.addEventListener('keydown', function(e){
        if(e.key === 'Escape') modal.classList.remove('open');
      });
    }
    return modal;
  }

  function bindSponsorZoom(){
    var modal = ensureSponsorLightbox();
    var modalImg = modal.querySelector('img');
    document.querySelectorAll('#sponsorsBottomSection img,.sponsors-final-grid img,.sponsors-grid img,.sponsors-marquee img,.sponsors-track img,.sponsor-card img,.sponsor-item img,.sponsor-logo img,[class*="auspiciador"] img,[class*="sponsor"] img').forEach(function(img){
      if(img.dataset.rmSponsorZoomFinal === '1') return;
      img.dataset.rmSponsorZoomFinal = '1';
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        modalImg.src = img.src || img.getAttribute('src') || '';
        modalImg.alt = img.alt || 'Auspiciador';
        modal.classList.add('open');
      }, false);
    });
  }

  function ensureBottomSponsors(){
    var section = document.getElementById('sponsorsBottomSection');
    if(!section){
      section = document.createElement('section');
      section.id = 'sponsorsBottomSection';
      section.className = 'section sponsors-bottom-section rm-sponsors-final-section';
      section.innerHTML = '<div class="section-head"><h2>Auspiciadores Oficiales</h2><p>Pincha un logo para ampliarlo</p></div><div id="sponsorsFinalGrid" class="sponsors-final-grid"></div>';
      mainContainer().appendChild(section);
    }

    section.hidden = false;
    section.style.display = 'block';
    section.style.visibility = 'visible';
    section.style.opacity = '1';
    section.classList.add('rm-sponsors-final-section');

    var grid = document.getElementById('sponsorsFinalGrid') || section.querySelector('.sponsors-final-grid,.sponsors-grid');
    if(!grid){
      grid = document.createElement('div');
      grid.id = 'sponsorsFinalGrid';
      grid.className = 'sponsors-final-grid';
      section.appendChild(grid);
    }

    var imgs = collectSponsorImages();
    var current = new Set(Array.from(grid.querySelectorAll('img')).map(function(i){ return sponsorKey(i); }));

    imgs.forEach(function(srcImg){
      var k = sponsorKey(srcImg);
      if(!k || current.has(k)) return;
      current.add(k);

      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'sponsor-final-card';
      card.innerHTML = '<img src="' + (srcImg.getAttribute('src') || srcImg.src) + '" alt="' + (srcImg.alt || 'Auspiciador') + '">';
      grid.appendChild(card);
    });

    // Si no encontró imágenes, dejar mensaje
    if(!grid.querySelector('img')){
      grid.innerHTML = '<div class="sponsors-empty-final">Auspiciadores pendientes de cargar desde Admin.</div>';
    }

    // Mover siempre al final real de la página, después de Hazte Socio si existe.
    var container = mainContainer();
    if(section.parentElement !== container){
      container.appendChild(section);
    }else{
      container.appendChild(section);
    }

    bindSponsorZoom();
  }

  function moveMusicToHistorySide(){
    var music = document.getElementById('topMusicPlayer');
    if(!music) return;

    var history = document.getElementById('historyPrincipalSection') || document.querySelector('.history-principal-section');
    if(!history) return;

    var target = history.querySelector('.rm-history-title-row') || history.querySelector('.history-principal-text') || history;
    if(!target) return;

    var holder = document.getElementById('rmMusicHistorySide');
    if(!holder){
      holder = document.createElement('div');
      holder.id = 'rmMusicHistorySide';
      holder.className = 'rm-music-history-side';
    }

    if(holder.parentElement !== target){
      target.appendChild(holder);
    }

    if(music.parentElement !== holder){
      holder.appendChild(music);
    }

    music.classList.add('rm-music-on-history-side');
    music.style.position = 'relative';
    music.style.top = 'auto';
    music.style.right = 'auto';
    music.style.left = 'auto';
    music.style.bottom = 'auto';
    music.style.transform = 'none';
    music.style.zIndex = '10';
    music.style.display = 'flex';
    music.style.visibility = 'visible';
    music.style.opacity = '1';
  }

  function runFix(){
    ensureBottomSponsors();
    moveMusicToHistorySide();
    bindSponsorZoom();
    setTimeout(function(){
      ensureBottomSponsors();
      moveMusicToHistorySide();
      bindSponsorZoom();
    }, 900);
  }

  if(typeof renderPublic === 'function'){
    var oldRender = renderPublic;
    renderPublic = function(){
      var r = oldRender.apply(this, arguments);
      setTimeout(runFix, 120);
      setTimeout(runFix, 1200);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(runFix, 150);
    setTimeout(runFix, 1000);
    setTimeout(runFix, 2500);
    setTimeout(runFix, 5000);
  });

  window.addEventListener('pageshow', function(){ setTimeout(runFix, 300); });
  window.addEventListener('resize', function(){ setTimeout(runFix, 180); });

  window.rmFixSponsorsFinalMusicHistory = runFix;
})();


/* =========================================================
   MEJORAS FINALES ORDENADAS
   - Carga Supabase visual
   - Última actualización
   - Próximo partido destacado
   - WhatsApp / compartir / instalar app
   - Últimos resultados compactos
   - Club en números ordenado
========================================================= */
(function(){
  if(window.__RM_MEJORAS_FINALES_ORDENADAS__) return;
  window.__RM_MEJORAS_FINALES_ORDENADAS__ = true;

  var RM_SUPABASE_URL = "https://xzcbdyabzgwfoylipgco.supabase.co";
  var RM_SUPABASE_KEY = "sb_publishable_rFYVLbY_0uJvOLJ0jftWzw_jsmNwVkl";
  var deferredInstallPrompt = null;

  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }

  function getDataSafe(){
    try{ if(typeof getData === 'function') return getData() || {}; }catch(e){}
    var keys = ['rmClubData','clubData','cd_rm_data','ricardoMendezData','club_ricardo_mendez_data','rm_public_data','siteData'];
    for(var i=0;i<keys.length;i++){
      try{
        var raw = localStorage.getItem(keys[i]);
        if(raw) return JSON.parse(raw);
      }catch(e){}
    }
    return window.RM_DATA || window.clubData || {};
  }

  function saveDataSafe(data){
    if(!data || typeof data !== 'object') return;
    ['rmClubData','clubData','cd_rm_data','ricardoMendezData','club_ricardo_mendez_data'].forEach(function(k){
      try{ localStorage.setItem(k, JSON.stringify(data)); }catch(e){}
    });
    try{ window.RM_DATA = data; window.clubData = data; }catch(e){}
  }

  function ensureSupabase(){
    try{ if(typeof initSB === 'function') initSB(); }catch(e){}
    if(window.supabaseClient && window.supabaseClient.from) return window.supabaseClient;
    if(window.sb && window.sb.from) return window.sb;
    if(window.supabase && window.supabase.createClient){
      window.supabaseClient = window.supabase.createClient(RM_SUPABASE_URL, RM_SUPABASE_KEY);
      window.sb = window.supabaseClient;
      return window.supabaseClient;
    }
    return null;
  }

  function ensureEnhancedSection(){
    var section = document.getElementById('rmEnhancedTopSection');
    if(!section){
      section = document.createElement('section');
      section.id = 'rmEnhancedTopSection';
      section.className = 'rm-enhanced-top-section';
      section.innerHTML =
        '<div id="rmLoadingNotice" class="rm-loading-notice"><span class="rm-loading-dot"></span><strong>Cargando información oficial del club...</strong></div>' +
        '<div class="rm-top-actions">' +
          '<div id="rmLastUpdate" class="rm-last-update">Última actualización: cargando...</div>' +
          '<button id="rmSharePageBtn" type="button">📲 Compartir página</button>' +
          '<button id="rmWhatsAppQuickBtn" type="button">💬 WhatsApp</button>' +
          '<button id="rmInstallAppBtn" type="button">⬇️ Instalar app</button>' +
        '</div>' +
        '<div class="rm-enhanced-grid">' +
          '<article id="rmNextMatchPanel" class="rm-next-match-panel"></article>' +
          '<article id="rmClubNumbersPanel" class="rm-club-numbers-panel"></article>' +
        '</div>' +
        '<article id="rmLatestResultsPanel" class="rm-latest-results-panel"></article>';
    }

    var main = document.querySelector('main') || document.querySelector('#app') || document.body;
    var history = document.getElementById('historyPrincipalSection');
    if(section.parentElement !== main){
      if(history && history.parentElement) history.parentElement.insertBefore(section, history);
      else main.insertBefore(section, main.firstChild);
    }else{
      if(history && section.nextElementSibling !== history && history.parentElement === main){
        main.insertBefore(section, history);
      }
    }
    return section;
  }

  function getSetting(){
    var d = getDataSafe();
    return d.settings || d.config || d.club || d || {};
  }

  function valueOf(paths, fallback){
    var d = getDataSafe();
    for(var i=0;i<paths.length;i++){
      var cur = d;
      var parts = paths[i].split('.');
      for(var j=0;j<parts.length;j++){ cur = cur && cur[parts[j]]; }
      if(cur !== undefined && cur !== null && cur !== '') return cur;
    }
    return fallback;
  }

  function countArray(paths){
    var d = getDataSafe();
    for(var i=0;i<paths.length;i++){
      var cur = d;
      var parts = paths[i].split('.');
      for(var j=0;j<parts.length;j++){ cur = cur && cur[parts[j]]; }
      if(Array.isArray(cur)) return cur.length;
    }
    return 0;
  }

  function formatDateTime(value){
    var dt = value ? new Date(value) : new Date();
    if(isNaN(dt.getTime())) dt = new Date();
    return dt.toLocaleDateString('es-CL') + ' ' + dt.toLocaleTimeString('es-CL', {hour:'2-digit',minute:'2-digit'});
  }

  function updateLoadingNotice(message, done){
    var el = document.getElementById('rmLoadingNotice');
    if(!el) return;
    el.innerHTML = (done ? '✅ ' : '<span class="rm-loading-dot"></span>') + '<strong>' + esc(message) + '</strong>';
    el.classList.toggle('done', !!done);
  }

  function renderLastUpdate(){
    var updated = valueOf(['updatedAt','lastUpdate','settings.updatedAt','settings.lastUpdate','config.updatedAt'], null);
    var text = 'Última actualización: ' + formatDateTime(updated || Date.now());
    var el = document.getElementById('rmLastUpdate');
    if(el) el.textContent = text;
  }

  function getNextMatch(){
    var d = getDataSafe();
    var m = d.nextMatch || d.proximoPartido || d.next_game || d.settings?.nextMatch || d.settings?.proximoPartido || d.match || null;
    if(Array.isArray(d.fixture) && d.fixture.length) m = m || d.fixture[0];
    if(Array.isArray(d.matches) && d.matches.length) m = m || d.matches[0];
    return m || {};
  }

  function renderNextMatch(){
    var m = getNextMatch();
    var rival = m.rival || m.opponent || m.equipo || m.team || m.club || 'Por confirmar';
    var fecha = m.fecha || m.date || m.day || 'Por confirmar';
    var hora = m.hora || m.time || '';
    var lugar = m.lugar || m.place || m.location || m.cancha || 'Por confirmar';
    var serie = m.serie || m.series || '';
    var logo = m.logo || m.logoRival || m.opponentLogo || '';

    var panel = document.getElementById('rmNextMatchPanel');
    if(!panel) return;
    panel.innerHTML =
      '<div class="rm-panel-title"><span>⚽</span><div><h3>Próximo Partido</h3><p>Información destacada para la comunidad</p></div></div>' +
      '<div class="rm-next-match-body">' +
        (logo ? '<img src="'+esc(logo)+'" alt="Logo rival">' : '<div class="rm-next-match-ball">RM</div>') +
        '<div class="rm-next-match-info">' +
          '<strong>Ricardo Méndez vs '+esc(rival)+'</strong>' +
          '<span>📅 '+esc(fecha)+(hora ? ' · '+esc(hora) : '')+'</span>' +
          '<span>📍 '+esc(lugar)+'</span>' +
          (serie ? '<span>🏷️ '+esc(serie)+'</span>' : '') +
        '</div>' +
      '</div>';
  }

  function renderClubNumbers(){
    var founded = valueOf(['founded','fundado','foundation','settings.founded','settings.fundado'], '12/08/1932');
    var socios = valueOf(['socios','members','settings.socios','settings.members'], countArray(['membersList','sociosList']));
    var series = valueOf(['seriesCount','series','settings.seriesCount','settings.series'], countArray(['seriesList','series']));
    var campeonatos = valueOf(['campeonatos','championships','settings.campeonatos','settings.championships'], 0);
    var jugadores = valueOf(['playersCount','jugadoresInscritos','registeredPlayers','settings.playersCount','settings.jugadoresInscritos'], 0);
    var visitas = (document.getElementById('visitorCounterNumber') && document.getElementById('visitorCounterNumber').textContent) || localStorage.getItem('rm_visit_count_public') || '0';

    var panel = document.getElementById('rmClubNumbersPanel');
    if(!panel) return;
    panel.innerHTML =
      '<div class="rm-panel-title"><span>📊</span><div><h3>Club en números</h3><p>Resumen oficial del Club Deportivo Ricardo Méndez</p></div></div>' +
      '<div class="rm-numbers-grid">' +
        '<div><span>Fundado</span><strong>'+esc(founded)+'</strong></div>' +
        '<div><span>Socios</span><strong>'+esc(socios)+'</strong></div>' +
        '<div><span>Series</span><strong>'+esc(series)+'</strong></div>' +
        '<div><span>Campeonatos</span><strong>'+esc(campeonatos)+'</strong></div>' +
        '<div><span>Jugadores inscritos</span><strong>'+esc(jugadores)+'</strong></div>' +
        '<div><span>Visitas</span><strong>'+esc(visitas)+'</strong></div>' +
      '</div>';
  }

  function getResults(){
    var d = getDataSafe();
    var arr = d.results || d.ultimosResultados || d.latestResults || d.resultados || [];
    if(!Array.isArray(arr)) arr = [];
    if(!arr.length){
      // Leer resultados visibles si ya están en DOM
      document.querySelectorAll('.result-card,.results-card,.resultado-card,[class*="result"]').forEach(function(card){
        var text = card.textContent && card.textContent.trim();
        if(text && text.length < 180) arr.push({texto:text});
      });
    }
    return arr.slice(0, 6);
  }

  function renderLatestResults(){
    var arr = getResults();
    var panel = document.getElementById('rmLatestResultsPanel');
    if(!panel) return;
    var html = '<div class="rm-panel-title"><span>🏁</span><div><h3>Últimos resultados</h3><p>Resumen compacto</p></div></div>';

    if(!arr.length){
      html += '<div class="rm-results-empty">Resultados pendientes de cargar desde Admin.</div>';
    }else{
      html += '<div class="rm-results-list">';
      arr.forEach(function(r){
        var serie = r.serie || r.series || r.category || '';
        var rival = r.rival || r.opponent || r.equipo || '';
        var marcador = r.marcador || r.score || r.resultado || r.texto || '';
        var fecha = r.fecha || r.date || '';
        html += '<div class="rm-result-mini">' +
          '<strong>'+esc(marcador || 'Resultado')+'</strong>' +
          '<span>'+esc([serie, rival, fecha].filter(Boolean).join(' · '))+'</span>' +
        '</div>';
      });
      html += '</div>';
    }
    panel.innerHTML = html;
  }

  function sharePage(){
    var title = 'Club Deportivo Ricardo Méndez';
    var text = 'Revisa la página oficial del Club Deportivo Ricardo Méndez';
    var url = location.href;
    if(navigator.share){
      navigator.share({title:title,text:text,url:url}).catch(function(){});
    }else{
      window.open('https://wa.me/?text=' + encodeURIComponent(text + ' ' + url), '_blank');
    }
  }

  function whatsAppQuick(){
    var d = getDataSafe();
    var phone = valueOf(['whatsapp','clubWhatsapp','phoneWhatsapp','settings.whatsapp','settings.clubWhatsapp','settings.phoneWhatsapp'], '');
    phone = String(phone || '').replace(/\D/g,'');
    var msg = 'Hola, quiero consultar por el Club Deportivo Ricardo Méndez.';
    if(phone.length >= 11) window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
    else window.open('https://wa.me/?text=' + encodeURIComponent(msg + ' ' + location.href), '_blank');
  }

  function bindActions(){
    var share = document.getElementById('rmSharePageBtn');
    if(share && share.dataset.bound !== '1'){
      share.dataset.bound = '1';
      share.addEventListener('click', sharePage);
    }

    var wsp = document.getElementById('rmWhatsAppQuickBtn');
    if(wsp && wsp.dataset.bound !== '1'){
      wsp.dataset.bound = '1';
      wsp.addEventListener('click', whatsAppQuick);
    }

    var install = document.getElementById('rmInstallAppBtn');
    if(install && install.dataset.bound !== '1'){
      install.dataset.bound = '1';
      install.addEventListener('click', async function(){
        if(deferredInstallPrompt){
          deferredInstallPrompt.prompt();
          try{ await deferredInstallPrompt.userChoice; }catch(e){}
          deferredInstallPrompt = null;
        }else{
          alert('Para instalar: abre el menú del navegador y elige “Agregar a pantalla de inicio”.');
        }
      });
    }
  }

  function hideOldNumbersDuplicated(){
    document.querySelectorAll('.stats,.metrics,.hero-stats,.club-stats,.counter-grid,.dashboard-cards,.summary-cards,.stat-grid').forEach(function(el){
      if(el.closest('#rmEnhancedTopSection')) return;
      var t = (el.textContent || '').toLowerCase();
      if(t.includes('fundado') && t.includes('socios') && t.includes('series')){
        el.classList.add('rm-old-numbers-hidden');
      }
    });
  }

  function ensureOrder(){
    var section = ensureEnhancedSection();
    var history = document.getElementById('historyPrincipalSection');
    var main = document.querySelector('main') || document.querySelector('#app') || document.body;
    if(history && section.parentElement === main) main.insertBefore(section, history);
  }

  async function forceSupabaseLoading(){
    updateLoadingNotice('Cargando información oficial del club...', false);
    var client = ensureSupabase();
    if(!client){
      setTimeout(function(){ updateLoadingNotice('Información cargada', true); }, 1200);
      return;
    }

    try{
      var merged = getDataSafe();
      var tables = ['settings','sponsors','news','gallery','fixture_images','presidents','directors','standings','results'];
      var changed = false;
      for(var i=0;i<tables.length;i++){
        try{
          var res = await client.from(tables[i]).select('*');
          if(!res.error && Array.isArray(res.data)){
            merged[tables[i]] = res.data;
            changed = true;
          }
        }catch(e){}
      }
      if(changed){
        merged.updatedAt = new Date().toISOString();
        saveDataSafe(merged);
      }
      updateLoadingNotice('Información oficial actualizada', true);
      renderAllEnhancements();
    }catch(e){
      updateLoadingNotice('Información cargada', true);
    }
  }

  function renderAllEnhancements(){
    ensureEnhancedSection();
    ensureOrder();
    renderLastUpdate();
    renderNextMatch();
    renderClubNumbers();
    renderLatestResults();
    bindActions();
    hideOldNumbersDuplicated();
  }

  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferredInstallPrompt = e;
    var btn = document.getElementById('rmInstallAppBtn');
    if(btn) btn.classList.add('available');
  });

  if(typeof renderPublic === 'function'){
    var oldRender = renderPublic;
    renderPublic = function(){
      var r = oldRender.apply(this, arguments);
      setTimeout(renderAllEnhancements, 100);
      setTimeout(renderAllEnhancements, 900);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(renderAllEnhancements, 100);
    setTimeout(forceSupabaseLoading, 500);
    setTimeout(renderAllEnhancements, 1800);
    setTimeout(renderAllEnhancements, 4200);
  });

  document.addEventListener('rm:supabase-mobile-loaded', function(){
    updateLoadingNotice('Información oficial actualizada', true);
    renderAllEnhancements();
  });

  window.addEventListener('pageshow', function(){ setTimeout(renderAllEnhancements, 200); });
  window.addEventListener('resize', function(){ setTimeout(renderAllEnhancements, 180); });

  window.rmMejorasFinalesOrdenadas = renderAllEnhancements;
})();


/* =========================================================
   REVISION OK FINAL - ORDEN Y DUPLICADOS
   Refuerza:
   - panel de mejoras antes de Historia
   - auspiciadores al final con zoom
   - música al costado de Historia
   - Hazte Socio único
========================================================= */
(function(){
  if(window.__RM_REVISION_OK_FINAL__) return;
  window.__RM_REVISION_OK_FINAL__ = true;

  function norm(t){ return String(t || '').toLowerCase().replace(/\s+/g,' ').trim(); }
  function main(){ return document.querySelector('main') || document.querySelector('#app') || document.body; }

  function isSocioBlock(el){
    if(!el || el === document.body || el === document.documentElement) return false;
    var h = el.querySelector && el.querySelector('h1,h2,h3,.section-title,.section-head h2,.card-title');
    var title = norm(h ? h.textContent : '');
    var id = String(el.id || '').toLowerCase();
    var cls = String(el.className || '').toLowerCase();
    if(id === 'membersection' || id === 'sociossection') return true;
    if(cls.includes('member-section') || cls.includes('socios-section') || cls.includes('rm-member-section-unica')) return true;
    if(title.includes('hazte socio') || title.includes('solicitud de socio')) return true;
    if(el.querySelector && el.querySelector('#memberRequestForm,form.member-request-form,form.rm-member-form-final')) return true;
    return false;
  }

  function fixHazteSocioUnico(){
    var blocks = Array.from(document.querySelectorAll('section,.section,.card,.panel,.box,.glass,article')).filter(isSocioBlock);
    var keep = blocks.find(function(b){ return b.id === 'memberSection'; }) ||
               blocks.find(function(b){ return b.querySelector && b.querySelector('form'); }) ||
               blocks[0];

    if(!keep){
      keep = document.createElement('section');
      keep.id = 'memberSection';
      keep.className = 'section member-section rm-member-section-unica';
      keep.innerHTML = '<div class="section-head"><h2>Hazte Socio</h2><p>Completa tus datos para solicitar inscripción</p></div><form id="memberRequestForm" class="member-request-form rm-member-form-final"><label>Nombre completo<input name="nombre" type="text" required placeholder="Nombre y apellido"></label><label>RUT<input name="rut" type="text" required placeholder="12.345.678-9"></label><label>Teléfono<input id="memberPhoneInput" name="telefono" type="tel" required value="+569" placeholder="+569XXXXXXXX" pattern="\\+569[0-9]{8}" maxlength="12"></label><label>Correo<input name="correo" type="email" placeholder="correo@ejemplo.cl"></label><button type="submit">Enviar solicitud de socio</button><small class="member-phone-help">El teléfono debe comenzar con +569 y luego 8 números.</small></form>';
      main().appendChild(keep);
    }

    keep.id = 'memberSection';
    keep.classList.add('section','member-section','rm-member-section-unica');
    keep.style.display = 'block';
    keep.style.visibility = 'visible';
    keep.hidden = false;

    var form = keep.querySelector('#memberRequestForm,form.member-request-form,form.rm-member-form-final') ||
               document.querySelector('#memberRequestForm,form.member-request-form,form.rm-member-form-final');
    if(form && form.parentElement !== keep) keep.appendChild(form);
    if(form){
      form.id = 'memberRequestForm';
      form.classList.add('member-request-form','rm-member-form-final');
      var phone = form.querySelector('#memberPhoneInput') || form.querySelector('input[type="tel"],input[name*="fono" i],input[name*="telefono" i],input[name*="phone" i]');
      if(phone){
        phone.id = 'memberPhoneInput';
        phone.name = phone.name || 'telefono';
        phone.type = 'tel';
        phone.maxLength = 12;
        phone.pattern = '\\+569[0-9]{8}';
        phone.placeholder = '+569XXXXXXXX';
        if(!phone.value || !phone.value.startsWith('+569')) phone.value = '+569';
        if(phone.dataset.rmPhoneRevisionOk !== '1'){
          phone.dataset.rmPhoneRevisionOk = '1';
          phone.addEventListener('input', function(){
            var d = phone.value.replace(/\D/g,'');
            if(d.startsWith('569')) d = d.slice(3);
            else if(d.startsWith('56')) d = d.slice(2);
            else if(d.startsWith('9')) d = d.slice(1);
            phone.value = '+569' + d.slice(0,8);
          });
        }
      }
    }

    Array.from(document.querySelectorAll('#memberRequestForm,form.member-request-form,form.rm-member-form-final')).forEach(function(f){
      if(f !== form) f.remove();
    });
    Array.from(document.querySelectorAll('section,.section,.card,.panel,.box,.glass,article')).filter(isSocioBlock).forEach(function(b){
      if(b !== keep) b.remove();
    });
  }

  function ensureLightbox(){
    var modal = document.getElementById('rmSponsorLightbox');
    if(!modal){
      modal = document.createElement('div');
      modal.id = 'rmSponsorLightbox';
      modal.className = 'rm-sponsor-lightbox';
      modal.innerHTML = '<button type="button" class="rm-sponsor-lightbox-close">×</button><img alt="Auspiciador ampliado"><p>Haz clic fuera de la imagen para cerrar</p>';
      document.body.appendChild(modal);
      modal.addEventListener('click', function(e){
        if(e.target === modal || e.target.classList.contains('rm-sponsor-lightbox-close')) modal.classList.remove('open');
      });
    }
    return modal;
  }

  function sponsorImages(){
    var selectors = '#sponsorsBottomSection img,.sponsors-final-grid img,.sponsors-grid img,.sponsors-marquee img,.sponsors-track img,.sponsor-card img,.sponsor-item img,[class*="sponsor"] img,[class*="auspiciador"] img';
    var seen = new Set(), out = [];
    document.querySelectorAll(selectors).forEach(function(img){
      var src = img.getAttribute('src') || img.src || '';
      if(!src || src.includes('logo_ricardo_mendez')) return;
      if(seen.has(src)) return;
      seen.add(src); out.push(img);
    });
    return out;
  }

  function sponsorsAtBottom(){
    var section = document.getElementById('sponsorsBottomSection');
    if(!section){
      section = document.createElement('section');
      section.id = 'sponsorsBottomSection';
      section.className = 'section sponsors-bottom-section rm-sponsors-final-section';
      section.innerHTML = '<div class="section-head"><h2>Auspiciadores Oficiales</h2><p>Pincha un logo para ampliarlo</p></div><div id="sponsorsFinalGrid" class="sponsors-final-grid"></div>';
    }
    section.classList.add('rm-sponsors-final-section');
    section.style.display = 'block';
    section.style.visibility = 'visible';
    section.hidden = false;

    var grid = document.getElementById('sponsorsFinalGrid') || section.querySelector('.sponsors-final-grid');
    if(!grid){
      grid = document.createElement('div');
      grid.id = 'sponsorsFinalGrid';
      grid.className = 'sponsors-final-grid';
      section.appendChild(grid);
    }

    var current = new Set(Array.from(grid.querySelectorAll('img')).map(function(i){ return i.getAttribute('src') || i.src || ''; }));
    sponsorImages().forEach(function(img){
      var src = img.getAttribute('src') || img.src || '';
      if(!src || current.has(src)) return;
      current.add(src);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sponsor-final-card';
      btn.innerHTML = '<img src="'+src+'" alt="'+(img.alt || 'Auspiciador')+'">';
      grid.appendChild(btn);
    });

    if(!grid.querySelector('img')){
      grid.innerHTML = '<div class="sponsors-empty-final">Auspiciadores pendientes de cargar desde Admin.</div>';
    }

    main().appendChild(section);
    bindSponsorZoom();
  }

  function bindSponsorZoom(){
    var modal = ensureLightbox();
    var modalImg = modal.querySelector('img');
    document.querySelectorAll('#sponsorsBottomSection img,.sponsors-final-grid img,.sponsors-grid img,.sponsors-marquee img,.sponsors-track img,.sponsor-card img,.sponsor-item img,[class*="sponsor"] img,[class*="auspiciador"] img').forEach(function(img){
      if(img.dataset.rmZoomRevisionOk === '1') return;
      img.dataset.rmZoomRevisionOk = '1';
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        modalImg.src = img.src || img.getAttribute('src') || '';
        modal.classList.add('open');
      });
    });
  }

  function musicBesideHistory(){
    var music = document.getElementById('topMusicPlayer');
    var history = document.getElementById('historyPrincipalSection') || document.querySelector('.history-principal-section');
    if(!music || !history) return;
    var row = history.querySelector('.rm-history-title-row') || history.querySelector('.history-principal-text') || history;
    var holder = document.getElementById('rmMusicHistorySide');
    if(!holder){
      holder = document.createElement('div');
      holder.id = 'rmMusicHistorySide';
      holder.className = 'rm-music-history-side';
    }
    if(holder.parentElement !== row) row.appendChild(holder);
    if(music.parentElement !== holder) holder.appendChild(music);
    music.classList.add('rm-music-on-history-side');
    ['position','top','right','left','bottom','transform'].forEach(function(prop){ music.style[prop] = prop === 'position' ? 'relative' : 'auto'; });
    music.style.display = 'flex';
    music.style.visibility = 'visible';
  }

  function panelBeforeHistory(){
    var panel = document.getElementById('rmEnhancedTopSection');
    var history = document.getElementById('historyPrincipalSection');
    if(panel && history && history.parentElement) history.parentElement.insertBefore(panel, history);
  }

  function run(){
    panelBeforeHistory();
    sponsorsAtBottom();
    musicBesideHistory();
    fixHazteSocioUnico();
    setTimeout(function(){
      panelBeforeHistory();
      sponsorsAtBottom();
      musicBesideHistory();
      fixHazteSocioUnico();
    }, 1000);
  }

  if(typeof renderPublic === 'function'){
    var old = renderPublic;
    renderPublic = function(){
      var r = old.apply(this, arguments);
      setTimeout(run, 100);
      setTimeout(run, 1200);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(run, 120);
    setTimeout(run, 1200);
    setTimeout(run, 3200);
    setTimeout(run, 6000);
  });

  window.addEventListener('pageshow', function(){ setTimeout(run, 250); });
  window.rmRevisionOkFinal = run;
})();


/* FIX DEFINITIVO HAZTE SOCIO DUPLICADO */
(function(){
 if(window.__RM_SOCIO_DUPLICADO_DEFINITIVO__)return;
 window.__RM_SOCIO_DUPLICADO_DEFINITIVO__=true;
 function txt(e){return String(e&&e.textContent||'').toLowerCase().replace(/\s+/g,' ').trim();}
 function isSocio(e){
   if(!e||e===document.body||e===document.documentElement)return false;
   var id=String(e.id||'').toLowerCase(), cls=String(e.className||'').toLowerCase();
   var h=e.querySelector&&e.querySelector('h1,h2,h3,.section-title,.section-head h2,.card-title');
   var ht=txt(h), all=txt(e);
   if(id==='membersection'||id==='sociossection')return true;
   if(cls.includes('member-section')||cls.includes('socios-section')||cls.includes('rm-member-section-unica'))return true;
   if(ht.includes('hazte socio')||ht.includes('solicitud de socio'))return true;
   if(e.querySelector&&e.querySelector('#memberRequestForm,form.member-request-form,form.rm-member-form-final'))return true;
   if(e.matches&&e.matches('section,.section,.card,.panel,.box,.glass,article,div')&&all.includes('hazte socio')&&(all.includes('nombre')||all.includes('rut')||all.includes('teléfono')||all.includes('telefono')||all.includes('whatsapp')))return true;
   return false;
 }
 function hasInputs(e){
   return !!(e&&e.querySelectorAll&&e.querySelectorAll('input').length>=2);
 }
 function closestBlock(el){
   var c=el;
   while(c&&c!==document.body){
     if(c.matches&&c.matches('section,.section,.card,.panel,.box,.glass,article,div')&&(isSocio(c)||hasInputs(c)))return c;
     c=c.parentElement;
   }
   return el;
 }
 function blocks(){
   var arr=[];
   document.querySelectorAll('section,.section,.card,.panel,.box,.glass,article,div').forEach(function(e){if(isSocio(e))arr.push(e);});
   document.querySelectorAll('#memberRequestForm,form.member-request-form,form.rm-member-form-final,input[type="tel"],input[placeholder*="Tel" i],input[placeholder*="tel" i]').forEach(function(e){var b=closestBlock(e); if(b)arr.push(b);});
   var seen=new Set();
   return arr.filter(function(b){if(!b||seen.has(b))return false;seen.add(b);return true;}).sort(function(a,b){return a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_PRECEDING?1:-1;});
 }
 function preferKeep(bs){
   var withInputs=bs.filter(hasInputs);
   var original=withInputs.find(function(b){
     return txt(b).includes('enviar solicitud por whatsapp') || txt(b).includes('únete a la familia') || txt(b).includes('unete a la familia');
   });
   if(original)return original;
   original=withInputs.find(function(b){return !(b.querySelector&&b.querySelector('#memberRequestForm.rm-member-form-final'));});
   return original||withInputs[0]||bs[0];
 }
 function phone(block){
   var ph=block&&(block.querySelector('#memberPhoneInput')||block.querySelector('input[type="tel"],input[name*="fono" i],input[name*="telefono" i],input[name*="phone" i],input[placeholder*="tel" i]'));
   if(!ph)return;
   ph.id='memberPhoneInput'; ph.name=ph.name||'telefono'; ph.type='tel'; ph.maxLength=12; ph.pattern='\\+569[0-9]{8}'; ph.placeholder='+569XXXXXXXX';
   if(!ph.value||!ph.value.startsWith('+569'))ph.value='+569';
   if(ph.dataset.rmSocioDef==='1')return;
   ph.dataset.rmSocioDef='1';
   ph.addEventListener('input',function(){var d=ph.value.replace(/\D/g,''); if(d.startsWith('569'))d=d.slice(3); else if(d.startsWith('56'))d=d.slice(2); else if(d.startsWith('9'))d=d.slice(1); ph.value='+569'+d.slice(0,8);});
 }
 function bind(block){
   if(!block||block.dataset.rmSocioBind==='1')return; block.dataset.rmSocioBind='1';
   function send(e){
     if(e)e.preventDefault();
     var nombre=(block.querySelector('input[name*="nombre" i],input[placeholder*="nombre" i]')||{}).value||'';
     var rut=(block.querySelector('input[name*="rut" i],input[placeholder*="rut" i]')||{}).value||'';
     var ph=block.querySelector('#memberPhoneInput,input[type="tel"],input[name*="telefono" i],input[placeholder*="tel" i]');
     var tel=ph?String(ph.value||'').trim():'';
     var correo=(block.querySelector('input[type="email"],input[name*="correo" i],input[placeholder*="correo" i],input[placeholder*="email" i]')||{}).value||'';
     if(!/^\+569\d{8}$/.test(tel)){alert('El teléfono debe comenzar con +569 y tener 8 números después.');return;}
     var msg='Solicitud de socio Club Deportivo Ricardo Méndez%0A'+'Nombre: '+encodeURIComponent(nombre)+'%0A'+'RUT: '+encodeURIComponent(rut)+'%0A'+'Teléfono: '+encodeURIComponent(tel)+'%0A'+'Correo: '+encodeURIComponent(correo);
     window.open('https://wa.me/569?text='+msg,'_blank');
   }
   var f=block.querySelector('form');
   if(f)f.addEventListener('submit',send);
   Array.from(block.querySelectorAll('button,a,input[type="submit"]')).forEach(function(b){
     var t=txt(b); if((t.includes('whatsapp')||t.includes('solicitud')||t.includes('enviar'))&&b.dataset.rmSocioBtn!=='1'){b.dataset.rmSocioBtn='1';b.addEventListener('click',send);}
   });
 }
 function cleanInside(keep){
   if(!keep)return;
   var allForms=Array.from(keep.querySelectorAll('form,#memberRequestForm,.rm-member-form-final,.member-request-form'));
   var keepForm=allForms.find(function(f){return !f.classList.contains('rm-member-form-final') || txt(f).includes('whatsapp');})||allForms[0];
   allForms.forEach(function(f){if(f!==keepForm&&f.parentElement)f.remove();});
 }
 function fix(){
   var bs=blocks(), keep=preferKeep(bs);
   if(!keep)return;
   keep.id='memberSection'; keep.classList.add('rm-socio-original-unico'); keep.hidden=false; keep.style.display=''; keep.style.visibility='visible';
   phone(keep); bind(keep); cleanInside(keep);
   blocks().forEach(function(b){if(b!==keep&&!keep.contains(b)&&!b.contains(keep)){b.remove();}});
   Array.from(document.querySelectorAll('#memberRequestForm,form.rm-member-form-final,form.member-request-form')).forEach(function(f){if(!keep.contains(f))f.remove();});
 }
 var obsStarted=false;
 function obs(){if(obsStarted)return;obsStarted=true;var tm;new MutationObserver(function(){clearTimeout(tm);tm=setTimeout(fix,80);}).observe(document.body,{childList:true,subtree:true});}
 if(typeof renderPublic==='function'){var old=renderPublic;renderPublic=function(){var r=old.apply(this,arguments);setTimeout(fix,100);setTimeout(fix,1200);return r;};}
 document.addEventListener('DOMContentLoaded',function(){[100,700,1500,3000,6000,9000].forEach(function(ms){setTimeout(function(){fix();obs();},ms);});});
 window.addEventListener('pageshow',function(){setTimeout(fix,200);});
 window.rmFixSocioDuplicadoDefinitivo=fix;
})();


/* =========================================================
   FIX AUSPICIADORES SOLO FINAL SIN FONDO BLANCO
   - Oculta carruseles/listados superiores de auspiciadores.
   - Deja una sola sección al final.
   - Logos ampliables al pinchar.
========================================================= */
(function(){
  if(window.__RM_AUSPICIADORES_SOLO_FINAL_SIN_BLANCO__) return;
  window.__RM_AUSPICIADORES_SOLO_FINAL_SIN_BLANCO__ = true;

  function main(){
    return document.querySelector('main') || document.querySelector('#app') || document.body;
  }

  function sponsorSrc(img){
    return String((img && (img.getAttribute('src') || img.src || '')) || '').trim();
  }

  function isClubLogo(src){
    return !src || src.includes('logo_ricardo_mendez') || src.includes('escudo') || src.includes('favicon');
  }

  function collectSponsors(){
    var selectors = [
      '#sponsorsBottomSection img',
      '.sponsors-final-grid img',
      '.sponsors-grid img',
      '.sponsors-marquee img',
      '.sponsors-track img',
      '.sponsor-card img',
      '.sponsor-item img',
      '.sponsor-logo img',
      '[class*="sponsor"] img',
      '[class*="auspiciador"] img',
      'img[alt*="auspiciador" i]',
      'img[alt*="sponsor" i]'
    ].join(',');

    var seen = new Set();
    var out = [];

    document.querySelectorAll(selectors).forEach(function(img){
      var src = sponsorSrc(img);
      if(isClubLogo(src)) return;
      if(seen.has(src)) return;
      seen.add(src);
      out.push({
        src: src,
        alt: img.alt || img.getAttribute('alt') || 'Auspiciador'
      });
    });

    return out;
  }

  function hideSponsorCarouselsExceptFinal(){
    document.querySelectorAll(
      '.sponsors-marquee,.sponsors-track,.sponsors-carousel,.sponsors-slider,.sponsors-strip,.sponsors-top,' +
      '.auspiciadores-marquee,.auspiciadores-track,.auspiciadores-carousel,.auspiciadores-slider,' +
      '[class*="sponsor"][class*="marquee"],[class*="sponsor"][class*="carousel"],[class*="sponsor"][class*="slider"],[class*="sponsor"][class*="track"],' +
      '[class*="auspiciador"][class*="marquee"],[class*="auspiciador"][class*="carousel"],[class*="auspiciador"][class*="slider"],[class*="auspiciador"][class*="track"]'
    ).forEach(function(el){
      if(el.closest('#sponsorsBottomSection')) return;
      el.classList.add('rm-sponsor-carousel-hidden');
      el.style.display = 'none';
      el.style.visibility = 'hidden';
      el.style.height = '0';
      el.style.overflow = 'hidden';
    });

    // Ocultar secciones superiores que tengan título auspiciadores, excepto la final.
    document.querySelectorAll('section,.section,.card,.panel,.box,.glass,article').forEach(function(el){
      if(el.id === 'sponsorsBottomSection' || el.closest('#sponsorsBottomSection')) return;
      var text = String(el.textContent || '').toLowerCase();
      var hasTitle = text.includes('auspiciadores oficiales') || text.includes('auspiciadores') || text.includes('sponsors');
      var hasImgs = el.querySelectorAll && el.querySelectorAll('img').length >= 2;
      if(hasTitle && hasImgs){
        el.classList.add('rm-sponsor-carousel-hidden');
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.height = '0';
        el.style.overflow = 'hidden';
      }
    });
  }

  function ensureLightbox(){
    var modal = document.getElementById('rmSponsorLightbox');
    if(!modal){
      modal = document.createElement('div');
      modal.id = 'rmSponsorLightbox';
      modal.className = 'rm-sponsor-lightbox';
      modal.innerHTML = '<button type="button" class="rm-sponsor-lightbox-close" aria-label="Cerrar">×</button><img alt="Auspiciador ampliado"><p>Haz clic fuera de la imagen para cerrar</p>';
      document.body.appendChild(modal);
      modal.addEventListener('click', function(e){
        if(e.target === modal || e.target.classList.contains('rm-sponsor-lightbox-close')){
          modal.classList.remove('open');
        }
      });
      document.addEventListener('keydown', function(e){
        if(e.key === 'Escape') modal.classList.remove('open');
      });
    }
    return modal;
  }

  function bindZoom(){
    var modal = ensureLightbox();
    var modalImg = modal.querySelector('img');

    document.querySelectorAll('#sponsorsBottomSection img,.sponsors-final-grid img').forEach(function(img){
      if(img.dataset.rmSponsorFinalZoom === '1') return;
      img.dataset.rmSponsorFinalZoom = '1';
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        modalImg.src = img.src || img.getAttribute('src') || '';
        modalImg.alt = img.alt || 'Auspiciador';
        modal.classList.add('open');
      }, false);
    });
  }

  function ensureFinalSponsors(){
    var sponsors = collectSponsors();

    var section = document.getElementById('sponsorsBottomSection');
    if(!section){
      section = document.createElement('section');
      section.id = 'sponsorsBottomSection';
      section.className = 'section sponsors-bottom-section rm-sponsors-final-section';
    }

    section.classList.add('rm-sponsors-final-section','rm-sponsors-sin-fondo-blanco');
    section.style.display = 'block';
    section.style.visibility = 'visible';
    section.style.opacity = '1';
    section.hidden = false;

    section.innerHTML =
      '<div class="section-head rm-sponsors-final-head">' +
        '<h2>★ Auspiciadores Oficiales ★</h2>' +
        '<p>Pincha un logo para ampliarlo</p>' +
      '</div>' +
      '<div id="sponsorsFinalGrid" class="sponsors-final-grid rm-sponsors-grid-final"></div>';

    var grid = section.querySelector('#sponsorsFinalGrid');

    if(!sponsors.length){
      grid.innerHTML = '<div class="sponsors-empty-final">Auspiciadores pendientes de cargar desde Admin.</div>';
    }else{
      sponsors.forEach(function(s){
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'sponsor-final-card rm-sponsor-no-white-card';
        card.innerHTML = '<img src="' + s.src + '" alt="' + s.alt + '">';
        grid.appendChild(card);
      });
    }

    main().appendChild(section);
    bindZoom();
  }

  function run(){
    var saved = collectSponsors();
    hideSponsorCarouselsExceptFinal();
    ensureFinalSponsors();

    // Si un render posterior crea otro carrusel, volver a ordenar.
    setTimeout(function(){
      hideSponsorCarouselsExceptFinal();
      ensureFinalSponsors();
    }, 900);
  }

  if(typeof renderPublic === 'function'){
    var old = renderPublic;
    renderPublic = function(){
      var r = old.apply(this, arguments);
      setTimeout(run, 120);
      setTimeout(run, 1200);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(run, 120);
    setTimeout(run, 1200);
    setTimeout(run, 2600);
    setTimeout(run, 5200);
  });

  window.addEventListener('pageshow', function(){ setTimeout(run, 250); });
  window.rmAuspiciadoresSoloFinalSinBlanco = run;
})();


/* =========================================================
   FIX TOTAL: NOTICIAS Y AUSPICIADORES SEPARADOS
   - Las noticias quedan solo en noticias.
   - Los auspiciadores se renderizan SOLO desde getData().sponsors.
   - El carrusel/listado superior se oculta.
   - La sección de auspiciadores queda SIEMPRE al final.
   - Sin fondo blanco y con zoom al pinchar.
========================================================= */
(function(){
  if(window.__RM_FIX_NOTICIAS_AUSPICIADORES_SEPARADOS__) return;
  window.__RM_FIX_NOTICIAS_AUSPICIADORES_SEPARADOS__ = true;

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

  function sponsorUrl(s){
    if(!s || typeof s !== 'object') return '';
    return String(
      s.url || s.logo || s.image || s.img || s.photo || s.foto || s.src || s.file_url || s.publicUrl || s.public_url || ''
    ).trim();
  }

  function sponsorName(s){
    if(!s || typeof s !== 'object') return 'Auspiciador';
    return String(s.name || s.nombre || s.title || s.titulo || s.business || s.empresa || 'Auspiciador').trim();
  }

  function isBadSponsorUrl(url){
    if(!url) return true;
    var u = String(url).toLowerCase();
    if(u.includes('logo_ricardo_mendez') || u.includes('favicon') || u.includes('escudo')) return true;
    // evitar imágenes de noticias si por error vienen con nombres de carpetas noticias/news
    if(u.includes('/news/') || u.includes('/noticias/') || u.includes('noticia')) return true;
    return false;
  }

  function getStrictSponsors(){
    var d = getDataSafe();
    var list = [];

    // SOLO fuentes de datos, no DOM.
    if(Array.isArray(d.sponsors)) list = list.concat(d.sponsors);
    if(Array.isArray(d.auspiciadores)) list = list.concat(d.auspiciadores);
    if(d.settings && Array.isArray(d.settings.sponsors)) list = list.concat(d.settings.sponsors);

    var seen = new Set();
    var clean = [];

    list.forEach(function(s){
      var url = sponsorUrl(s);
      if(isBadSponsorUrl(url)) return;
      if(seen.has(url)) return;
      seen.add(url);
      clean.push({
        name: sponsorName(s),
        url: url
      });
    });

    return clean;
  }

  function ensureLightbox(){
    var modal = document.getElementById('rmSponsorLightbox');
    if(!modal){
      modal = document.createElement('div');
      modal.id = 'rmSponsorLightbox';
      modal.className = 'rm-sponsor-lightbox';
      modal.innerHTML = '<button type="button" class="rm-sponsor-lightbox-close" aria-label="Cerrar">×</button><img alt="Auspiciador ampliado"><p>Haz clic fuera de la imagen para cerrar</p>';
      document.body.appendChild(modal);
      modal.addEventListener('click', function(e){
        if(e.target === modal || e.target.classList.contains('rm-sponsor-lightbox-close')){
          modal.classList.remove('open');
        }
      });
      document.addEventListener('keydown', function(e){
        if(e.key === 'Escape') modal.classList.remove('open');
      });
    }
    return modal;
  }

  function bindSponsorZoom(){
    var modal = ensureLightbox();
    var modalImg = modal.querySelector('img');
    document.querySelectorAll('#sponsorsBottomSection img,.sponsors-final-grid img').forEach(function(img){
      if(img.dataset.rmSponsorStrictZoom === '1') return;
      img.dataset.rmSponsorStrictZoom = '1';
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        modalImg.src = img.src || img.getAttribute('src') || '';
        modalImg.alt = img.alt || 'Auspiciador';
        modal.classList.add('open');
      }, false);
    });
  }

  function hideNonFinalSponsorBlocks(){
    // Oculta carruseles/listados de auspiciadores, pero nunca toca noticias.
    var selectors = [
      '#sponsorTicker',
      '#sponsorsGrid',
      '.sponsors-marquee',
      '.sponsors-track',
      '.sponsors-carousel',
      '.sponsors-slider',
      '.sponsors-strip',
      '.sponsors-top',
      '.auspiciadores-marquee',
      '.auspiciadores-track',
      '.auspiciadores-carousel',
      '.auspiciadores-slider',
      '[class*="sponsor"][class*="marquee"]',
      '[class*="sponsor"][class*="carousel"]',
      '[class*="sponsor"][class*="slider"]',
      '[class*="sponsor"][class*="track"]',
      '[class*="auspiciador"][class*="marquee"]',
      '[class*="auspiciador"][class*="carousel"]',
      '[class*="auspiciador"][class*="slider"]',
      '[class*="auspiciador"][class*="track"]'
    ].join(',');

    document.querySelectorAll(selectors).forEach(function(el){
      if(!el || el.closest('#sponsorsBottomSection')) return;
      if(el.closest('#newsGrid') || el.closest('.news-grid') || el.closest('.noticias-grid')) return;
      el.classList.add('rm-hide-non-final-sponsors');
      el.style.display = 'none';
      el.style.visibility = 'hidden';
      el.style.height = '0';
      el.style.maxHeight = '0';
      el.style.overflow = 'hidden';
    });

    // Ocultar secciones de auspiciadores que NO sean la final y NO sean noticias.
    document.querySelectorAll('section,.section,.card,.panel,.box,.glass,article').forEach(function(el){
      if(el.id === 'sponsorsBottomSection' || el.closest('#sponsorsBottomSection')) return;
      if(el.id === 'newsGrid' || el.closest('#newsGrid') || el.classList.contains('news-card') || el.closest('.news-grid') || el.closest('.noticias-grid')) return;

      var text = String(el.textContent || '').toLowerCase();
      var hasSponsorTitle = text.includes('auspiciadores oficiales') || text.includes('auspiciadores') || text.includes('sponsors');
      var hasSponsorNode = !!(el.querySelector && el.querySelector('#sponsorTicker,#sponsorsGrid,.sponsors-marquee,.sponsors-track,.sponsor-card,.sponsor-item'));

      if(hasSponsorTitle || hasSponsorNode){
        el.classList.add('rm-hide-non-final-sponsors');
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.height = '0';
        el.style.maxHeight = '0';
        el.style.overflow = 'hidden';
      }
    });
  }

  function renderFinalSponsorsStrict(){
    var sponsors = getStrictSponsors();

    var section = document.getElementById('sponsorsBottomSection');
    if(!section){
      section = document.createElement('section');
      section.id = 'sponsorsBottomSection';
    }

    section.className = 'section sponsors-bottom-section rm-sponsors-final-section rm-sponsors-sin-fondo-blanco';
    section.hidden = false;
    section.style.display = 'block';
    section.style.visibility = 'visible';
    section.style.opacity = '1';

    var html =
      '<div class="section-head rm-sponsors-final-head">' +
        '<h2>★ Auspiciadores Oficiales ★</h2>' +
        '<p>Pincha un logo para ampliarlo</p>' +
      '</div>' +
      '<div id="sponsorsFinalGrid" class="sponsors-final-grid rm-sponsors-grid-final">';

    if(!sponsors.length){
      html += '<div class="sponsors-empty-final">Auspiciadores pendientes de cargar desde Admin.</div>';
    }else{
      sponsors.forEach(function(s){
        html += '<button type="button" class="sponsor-final-card rm-sponsor-no-white-card">' +
          '<img src="' + esc(s.url) + '" alt="' + esc(s.name) + '" loading="lazy">' +
        '</button>';
      });
    }

    html += '</div>';
    section.innerHTML = html;

    // Siempre al final real de la página.
    main().appendChild(section);
    bindSponsorZoom();
  }

  function keepNewsClean(){
    // Re-renderizar noticias con solo d.news si el grid fue contaminado por logos o auspiciadores.
    var d = getDataSafe();
    var news = Array.isArray(d.news) ? d.news : [];
    var grid = document.getElementById('newsGrid');
    if(!grid) return;

    // Si existe función imgTag del sistema, usarla; si no, HTML seguro.
    function img(url, alt){
      return url ? '<img src="' + esc(url) + '" alt="' + esc(alt || '') + '" loading="lazy">' : '';
    }

    if(news.length){
      grid.innerHTML = news.map(function(n){
        return '<article class="news-card">' +
          img(n.image || n.url || n.img, n.title || n.titulo || 'Noticia') +
          '<h3>' + esc(n.title || n.titulo || '') + '</h3>' +
          '<p>' + esc(n.text || n.descripcion || n.description || '') + '</p>' +
        '</article>';
      }).join('');
    }
  }

  function run(){
    keepNewsClean();
    hideNonFinalSponsorBlocks();
    renderFinalSponsorsStrict();

    setTimeout(function(){
      keepNewsClean();
      hideNonFinalSponsorBlocks();
      renderFinalSponsorsStrict();
    }, 1000);

    setTimeout(function(){
      hideNonFinalSponsorBlocks();
      renderFinalSponsorsStrict();
    }, 3000);
  }

  if(typeof renderPublic === 'function'){
    var old = renderPublic;
    renderPublic = function(){
      var r = old.apply(this, arguments);
      setTimeout(run, 150);
      setTimeout(run, 1300);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(run, 150);
    setTimeout(run, 1300);
    setTimeout(run, 3000);
    setTimeout(run, 6000);
  });

  document.addEventListener('rm:supabase-mobile-loaded', function(){
    setTimeout(run, 150);
    setTimeout(run, 1200);
  });

  window.addEventListener('pageshow', function(){ setTimeout(run, 250); });

  window.rmSepararNoticiasAuspiciadoresFinal = run;
})();


/* =========================================================
   FIX NOTICIAS IMAGENES COMPACTAS
   Ajusta imágenes de noticias para que calcen en el recuadro.
========================================================= */
(function(){
  if(window.__RM_FIX_NOTICIAS_IMAGENES_COMPACTAS__) return;
  window.__RM_FIX_NOTICIAS_IMAGENES_COMPACTAS__ = true;

  function applyNewsCompact(){
    var grids = document.querySelectorAll('#newsGrid,.news-grid,.noticias-grid');
    grids.forEach(function(grid){
      grid.classList.add('rm-news-grid-compact');
      grid.style.display = 'grid';
    });

    document.querySelectorAll('#newsGrid .news-card,.news-grid .news-card,.noticias-grid .news-card,.noticia-card,.card-news').forEach(function(card){
      card.classList.add('rm-news-card-compact');
      var img = card.querySelector('img');
      if(img){
        img.classList.add('rm-news-img-fit');
        img.loading = 'lazy';
        img.style.objectFit = 'cover';
        img.style.width = '100%';
      }

      var title = card.querySelector('h3,h2,.news-title,.card-title');
      if(title) title.classList.add('rm-news-title-compact');

      var text = card.querySelector('p,.news-text,.card-text');
      if(text) text.classList.add('rm-news-text-compact');
    });
  }

  if(typeof renderPublic === 'function'){
    var oldRender = renderPublic;
    renderPublic = function(){
      var r = oldRender.apply(this, arguments);
      setTimeout(applyNewsCompact, 80);
      setTimeout(applyNewsCompact, 900);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(applyNewsCompact, 120);
    setTimeout(applyNewsCompact, 1000);
    setTimeout(applyNewsCompact, 2600);
    setTimeout(applyNewsCompact, 5200);
  });

  document.addEventListener('rm:supabase-mobile-loaded', function(){
    setTimeout(applyNewsCompact, 150);
    setTimeout(applyNewsCompact, 900);
  });

  window.addEventListener('pageshow', function(){
    setTimeout(applyNewsCompact, 250);
  });

  window.rmFixNoticiasImagenesCompactas = applyNewsCompact;
})();


/* =========================================================
   FIX NOTICIAS + RESULTADOS COMPACTOS EDITABLES + GALERIA
========================================================= */
(function(){
  if(window.__RM_FIX_NEWS_RESULTS_GALLERY__) return;
  window.__RM_FIX_NEWS_RESULTS_GALLERY__ = true;

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

  function getImage(obj){
    if(!obj) return '';
    return obj.image || obj.image_url || obj.imageUrl || obj.url || obj.img || obj.photo || obj.foto || obj.src || obj.file_url || obj.publicUrl || obj.public_url || '';
  }

  function ensureNewsSection(){
    var grid = document.getElementById('newsGrid');
    var section = grid ? grid.closest('section,.section') : null;

    if(!section){
      section = document.createElement('section');
      section.id = 'newsSection';
      section.className = 'section news-section';
      section.innerHTML = '<div class="section-head"><h2>Noticias</h2><p>Información oficial del club</p></div><div id="newsGrid" class="news-grid rm-news-grid-compact"></div>';
      var gallery = document.getElementById('galleryGrid');
      if(gallery && gallery.closest('section,.section')) main().insertBefore(section, gallery.closest('section,.section'));
      else main().appendChild(section);
      grid = section.querySelector('#newsGrid');
    }

    section.classList.remove('rm-hide-non-final-sponsors','hide-duplicate-sponsors');
    section.style.display = 'block';
    section.style.visibility = 'visible';
    section.style.opacity = '1';
    section.hidden = false;

    if(!grid){
      grid = document.createElement('div');
      grid.id = 'newsGrid';
      grid.className = 'news-grid rm-news-grid-compact';
      section.appendChild(grid);
    }

    grid.classList.add('rm-news-grid-compact');
    grid.style.display = 'grid';
    grid.style.visibility = 'visible';
    grid.style.opacity = '1';

    return grid;
  }

  function renderNewsFixed(){
    var d = getDataSafe();
    var news = Array.isArray(d.news) ? d.news : [];
    var grid = ensureNewsSection();

    if(!news.length){
      grid.innerHTML = '<div class="empty-state rm-news-empty">Aún no hay noticias cargadas.</div>';
      return;
    }

    grid.innerHTML = news.map(function(n){
      var title = n.title || n.titulo || n.name || 'Noticia';
      var text = n.text || n.descripcion || n.description || n.detalle || '';
      var img = getImage(n);
      return '<article class="news-card rm-news-card-compact">' +
        (img ? '<img class="rm-news-img-fit" src="'+esc(img)+'" alt="'+esc(title)+'" loading="lazy">' : '<div class="rm-news-no-img">RM</div>') +
        '<h3 class="rm-news-title-compact">'+esc(title)+'</h3>' +
        '<p class="rm-news-text-compact">'+esc(text)+'</p>' +
      '</article>';
    }).join('');
  }

  function removeOldLatestResults(){
    // Eliminar/ocultar panel viejo "Últimos resultados", pero conservar el nuevo "Resultados compactos"
    document.querySelectorAll('#rmLatestResultsPanel,.rm-latest-results-panel').forEach(function(el){
      el.remove();
    });

    document.querySelectorAll('section,.section,article,.card,.panel').forEach(function(el){
      if(el.id === 'rmCompactResultsPanel' || el.closest('#rmCompactResultsPanel')) return;
      var t = String(el.textContent || '').toLowerCase();
      if(t.includes('últimos resultados') || t.includes('ultimos resultados')){
        el.classList.add('rm-hide-latest-results-old');
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.height = '0';
        el.style.overflow = 'hidden';
      }
    });
  }

  function getCompactResults(){
    var d = getDataSafe();
    var arr = [];
    if(Array.isArray(d.compactResults)) arr = d.compactResults;
    else if(Array.isArray(d.resultadosCompactos)) arr = d.resultadosCompactos;
    else if(Array.isArray(d.results)) arr = d.results;
    else if(Array.isArray(d.resultados)) arr = d.resultados;
    return arr || [];
  }

  function ensureCompactResultsPanel(){
    var panel = document.getElementById('rmCompactResultsPanel');
    if(!panel){
      panel = document.createElement('section');
      panel.id = 'rmCompactResultsPanel';
      panel.className = 'section rm-compact-results-panel';
      panel.innerHTML = '<div class="section-head"><h2>Resultados compactos</h2><p>Marcadores editables desde Admin</p></div><div id="rmCompactResultsList" class="rm-compact-results-list"></div>';
    }

    var enhanced = document.getElementById('rmEnhancedTopSection');
    var history = document.getElementById('historyPrincipalSection');
    if(enhanced && enhanced.parentElement){
      enhanced.insertAdjacentElement('afterend', panel);
    }else if(history && history.parentElement){
      history.parentElement.insertBefore(panel, history);
    }else{
      main().insertBefore(panel, main().firstChild);
    }

    panel.style.display = 'block';
    panel.style.visibility = 'visible';
    panel.hidden = false;
    return panel;
  }

  function renderCompactResults(){
    removeOldLatestResults();
    var arr = getCompactResults();
    var panel = ensureCompactResultsPanel();
    var list = document.getElementById('rmCompactResultsList');
    if(!list){
      list = document.createElement('div');
      list.id = 'rmCompactResultsList';
      list.className = 'rm-compact-results-list';
      panel.appendChild(list);
    }

    if(!arr.length){
      list.innerHTML = '<div class="rm-results-empty">Resultados compactos pendientes de cargar desde Admin.</div>';
      return;
    }

    list.innerHTML = arr.slice(0, 10).map(function(r){
      var serie = r.serie || r.series || r.category || '';
      var local = r.local || r.equipoLocal || r.club || 'Ricardo Méndez';
      var rival = r.rival || r.opponent || r.equipo || r.visita || '';
      var marcador = r.marcador || r.score || r.resultado || r.texto || '';
      var fecha = r.fecha || r.date || '';
      return '<div class="rm-result-compact-card">' +
        '<strong>'+esc(marcador || (local + ' vs ' + rival))+'</strong>' +
        '<span>'+esc([serie, rival, fecha].filter(Boolean).join(' · '))+'</span>' +
      '</div>';
    }).join('');
  }

  function applyGalleryFit(){
    var grids = document.querySelectorAll('#galleryGrid,.gallery-grid,.galeria-grid,.photos-grid,.photo-grid');
    grids.forEach(function(grid){
      grid.classList.add('rm-gallery-grid-fit');
      grid.style.display = 'grid';
    });

    document.querySelectorAll('#galleryGrid .media-card,#galleryGrid .gallery-card,#galleryGrid .photo-card,#galleryGrid article,.gallery-grid .media-card,.gallery-grid .gallery-card,.gallery-grid .photo-card,.galeria-grid .media-card,.photos-grid .photo-card').forEach(function(card){
      card.classList.add('rm-gallery-card-fit');
      var img = card.querySelector('img');
      var video = card.querySelector('video');
      if(img){
        img.classList.add('rm-gallery-img-fit');
        img.loading = 'lazy';
      }
      if(video){
        video.classList.add('rm-gallery-img-fit');
      }
    });
  }

  function addAdminCompactResultsEditor(){
    // Solo en admin
    if(!/admin/i.test(location.pathname) && !document.querySelector('.admin,.admin-panel,#adminPanel')) return;
    if(document.getElementById('rmCompactResultsAdmin')) return;

    var host = document.querySelector('main') || document.body;
    var box = document.createElement('section');
    box.id = 'rmCompactResultsAdmin';
    box.className = 'admin-card rm-compact-results-admin';
    box.innerHTML =
      '<h2>Resultados compactos</h2>' +
      '<p>Agrega o edita los marcadores que se verán en la página pública.</p>' +
      '<div id="rmCompactResultsAdminList"></div>' +
      '<button type="button" id="rmAddCompactResultBtn">+ Agregar resultado compacto</button>' +
      '<button type="button" id="rmSaveCompactResultsBtn">Guardar resultados compactos</button>';

    host.appendChild(box);

    function renderEditor(){
      var d = getDataSafe();
      var arr = Array.isArray(d.compactResults) ? d.compactResults : (Array.isArray(d.results) ? d.results : []);
      var list = document.getElementById('rmCompactResultsAdminList');
      list.innerHTML = arr.map(function(r, i){
        return '<div class="rm-admin-result-row" data-i="'+i+'">' +
          '<input placeholder="Serie" value="'+esc(r.serie || r.series || '')+'">' +
          '<input placeholder="Rival" value="'+esc(r.rival || r.opponent || '')+'">' +
          '<input placeholder="Marcador" value="'+esc(r.marcador || r.score || r.resultado || '')+'">' +
          '<input placeholder="Fecha" value="'+esc(r.fecha || r.date || '')+'">' +
          '<button type="button" class="rmDeleteCompactResult">Eliminar</button>' +
        '</div>';
      }).join('');
      list.querySelectorAll('.rmDeleteCompactResult').forEach(function(btn){
        btn.addEventListener('click', function(){
          btn.closest('.rm-admin-result-row').remove();
        });
      });
    }

    document.getElementById('rmAddCompactResultBtn').addEventListener('click', function(){
      var list = document.getElementById('rmCompactResultsAdminList');
      var div = document.createElement('div');
      div.className = 'rm-admin-result-row';
      div.innerHTML =
        '<input placeholder="Serie">' +
        '<input placeholder="Rival">' +
        '<input placeholder="Marcador">' +
        '<input placeholder="Fecha">' +
        '<button type="button" class="rmDeleteCompactResult">Eliminar</button>';
      list.appendChild(div);
      div.querySelector('.rmDeleteCompactResult').addEventListener('click', function(){ div.remove(); });
    });

    document.getElementById('rmSaveCompactResultsBtn').addEventListener('click', async function(){
      var arr = [];
      document.querySelectorAll('#rmCompactResultsAdminList .rm-admin-result-row').forEach(function(row){
        var inp = row.querySelectorAll('input');
        arr.push({
          serie: inp[0].value.trim(),
          rival: inp[1].value.trim(),
          marcador: inp[2].value.trim(),
          fecha: inp[3].value.trim()
        });
      });
      var d = getDataSafe();
      d.compactResults = arr;
      d.results = arr;
      saveDataSafe(d);
      try{ if(typeof pushCloud === 'function') await pushCloud(); }catch(e){}
      try{ if(typeof renderPublic === 'function') renderPublic(); }catch(e){}
      alert('Resultados compactos guardados.');
    });

    renderEditor();
  }

  function runFix(){
    renderNewsFixed();
    renderCompactResults();
    applyGalleryFit();
    addAdminCompactResultsEditor();

    setTimeout(function(){
      renderNewsFixed();
      renderCompactResults();
      applyGalleryFit();
    }, 900);
  }

  if(typeof renderPublic === 'function'){
    var oldRender = renderPublic;
    renderPublic = function(){
      var r = oldRender.apply(this, arguments);
      setTimeout(runFix, 100);
      setTimeout(runFix, 1200);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(runFix, 120);
    setTimeout(runFix, 1200);
    setTimeout(runFix, 2600);
    setTimeout(runFix, 5200);
  });

  document.addEventListener('rm:supabase-mobile-loaded', function(){
    setTimeout(runFix, 150);
    setTimeout(runFix, 900);
  });

  window.addEventListener('pageshow', function(){
    setTimeout(runFix, 250);
  });

  window.rmFixNoticiasResultadosGaleria = runFix;
})();


/* =========================================================
   REVISION FINAL ZIP - NOTICIAS RESULTADOS GALERIA
   Garantiza:
   1. Noticias visibles.
   2. Elimina "Últimos resultados".
   3. Deja solo "Resultados compactos".
   4. Resultados compactos editables desde Admin.
   5. Galería ordenada y ajustada a imagen.
   6. Auspiciadores separados y solo al final.
========================================================= */
(function(){
  if(window.__RM_REVISION_FINAL_NRG__) return;
  window.__RM_REVISION_FINAL_NRG__ = true;

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

  function getImage(o){
    return (o && (o.image || o.image_url || o.imageUrl || o.url || o.img || o.photo || o.foto || o.src || o.file_url || o.publicUrl || o.public_url)) || '';
  }

  function ensureNews(){
    var grid = document.getElementById('newsGrid');
    var section = grid ? grid.closest('section,.section') : null;
    if(!section){
      section = document.createElement('section');
      section.id = 'newsSection';
      section.className = 'section news-section';
      section.innerHTML = '<div class="section-head"><h2>Noticias</h2><p>Información oficial del club</p></div><div id="newsGrid" class="news-grid rm-news-grid-compact"></div>';
      var gal = document.getElementById('galleryGrid');
      if(gal && gal.closest('section,.section')) main().insertBefore(section, gal.closest('section,.section'));
      else main().appendChild(section);
    }
    section.classList.remove('rm-hide-non-final-sponsors','hide-duplicate-sponsors','rm-hide-latest-results-old');
    section.style.display = 'block';
    section.style.visibility = 'visible';
    section.style.opacity = '1';
    section.hidden = false;

    grid = document.getElementById('newsGrid') || section.querySelector('.news-grid');
    if(!grid){
      grid = document.createElement('div');
      grid.id = 'newsGrid';
      grid.className = 'news-grid rm-news-grid-compact';
      section.appendChild(grid);
    }
    grid.classList.add('rm-news-grid-compact');
    grid.style.display = 'grid';
    grid.style.visibility = 'visible';
    grid.style.opacity = '1';
    return grid;
  }

  function renderNews(){
    var d = getDataSafe();
    var news = Array.isArray(d.news) ? d.news : [];
    var grid = ensureNews();
    if(!news.length){
      grid.innerHTML = '<div class="empty-state rm-news-empty">Aún no hay noticias cargadas.</div>';
      return;
    }
    grid.innerHTML = news.map(function(n){
      var title = n.title || n.titulo || n.name || 'Noticia';
      var text = n.text || n.descripcion || n.description || n.detalle || '';
      var img = getImage(n);
      return '<article class="news-card rm-news-card-compact">' +
        (img ? '<img class="rm-news-img-fit" src="'+esc(img)+'" alt="'+esc(title)+'" loading="lazy">' : '<div class="rm-news-no-img">RM</div>') +
        '<h3 class="rm-news-title-compact">'+esc(title)+'</h3>' +
        '<p class="rm-news-text-compact">'+esc(text)+'</p>' +
      '</article>';
    }).join('');
  }

  function removeLatestResultsOld(){
    document.querySelectorAll('#rmLatestResultsPanel,.rm-latest-results-panel').forEach(function(el){ el.remove(); });
    document.querySelectorAll('section,.section,article,.card,.panel').forEach(function(el){
      if(el.id === 'rmCompactResultsPanel' || el.closest('#rmCompactResultsPanel')) return;
      var t = String(el.textContent || '').toLowerCase();
      if(t.includes('últimos resultados') || t.includes('ultimos resultados')){
        el.classList.add('rm-hide-latest-results-old');
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.height = '0';
        el.style.overflow = 'hidden';
      }
    });
  }

  function resultData(){
    var d = getDataSafe();
    if(Array.isArray(d.compactResults)) return d.compactResults;
    if(Array.isArray(d.resultadosCompactos)) return d.resultadosCompactos;
    if(Array.isArray(d.results)) return d.results;
    if(Array.isArray(d.resultados)) return d.resultados;
    return [];
  }

  function ensureCompactPanel(){
    var panel = document.getElementById('rmCompactResultsPanel');
    if(!panel){
      panel = document.createElement('section');
      panel.id = 'rmCompactResultsPanel';
      panel.className = 'section rm-compact-results-panel';
      panel.innerHTML = '<div class="section-head"><h2>Resultados compactos</h2><p>Marcadores editables desde Admin</p></div><div id="rmCompactResultsList" class="rm-compact-results-list"></div>';
    }
    var enhanced = document.getElementById('rmEnhancedTopSection');
    var history = document.getElementById('historyPrincipalSection');
    if(enhanced && enhanced.parentElement) enhanced.insertAdjacentElement('afterend', panel);
    else if(history && history.parentElement) history.parentElement.insertBefore(panel, history);
    else main().insertBefore(panel, main().firstChild);
    panel.style.display = 'block';
    panel.style.visibility = 'visible';
    panel.hidden = false;
    return panel;
  }

  function renderCompactResults(){
    removeLatestResultsOld();
    var arr = resultData();
    var panel = ensureCompactPanel();
    var list = document.getElementById('rmCompactResultsList');
    if(!list){
      list = document.createElement('div');
      list.id = 'rmCompactResultsList';
      list.className = 'rm-compact-results-list';
      panel.appendChild(list);
    }
    if(!arr.length){
      list.innerHTML = '<div class="rm-results-empty">Resultados compactos pendientes de cargar desde Admin.</div>';
      return;
    }
    list.innerHTML = arr.slice(0,10).map(function(r){
      var serie = r.serie || r.series || r.category || '';
      var rival = r.rival || r.opponent || r.equipo || r.visita || '';
      var marcador = r.marcador || r.score || r.resultado || r.texto || '';
      var fecha = r.fecha || r.date || '';
      return '<div class="rm-result-compact-card"><strong>'+esc(marcador || 'Resultado')+'</strong><span>'+esc([serie,rival,fecha].filter(Boolean).join(' · '))+'</span></div>';
    }).join('');
  }

  function galleryFit(){
    document.querySelectorAll('#galleryGrid,.gallery-grid,.galeria-grid,.photos-grid,.photo-grid').forEach(function(grid){
      grid.classList.add('rm-gallery-grid-fit');
      grid.style.display = 'grid';
      grid.style.visibility = 'visible';
    });
    document.querySelectorAll('#galleryGrid .media-card,#galleryGrid .gallery-card,#galleryGrid .photo-card,#galleryGrid article,.gallery-grid .media-card,.gallery-grid .gallery-card,.gallery-grid .photo-card,.galeria-grid .media-card,.photos-grid .photo-card').forEach(function(card){
      card.classList.add('rm-gallery-card-fit');
      var img = card.querySelector('img');
      var video = card.querySelector('video');
      if(img){ img.classList.add('rm-gallery-img-fit'); img.loading = 'lazy'; }
      if(video){ video.classList.add('rm-gallery-img-fit'); }
    });
  }

  function sponsorsStrict(){
    var d = getDataSafe();
    var arr = [];
    if(Array.isArray(d.sponsors)) arr = arr.concat(d.sponsors);
    if(Array.isArray(d.auspiciadores)) arr = arr.concat(d.auspiciadores);
    var seen = new Set();
    return arr.map(function(s){
      return {
        name: s.name || s.nombre || s.title || s.titulo || 'Auspiciador',
        url: s.url || s.logo || s.image || s.img || s.foto || s.src || s.file_url || s.publicUrl || s.public_url || ''
      };
    }).filter(function(s){
      var u = String(s.url || '').toLowerCase();
      if(!u || u.includes('logo_ricardo_mendez') || u.includes('/news/') || u.includes('/noticias/') || u.includes('noticia')) return false;
      if(seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
  }

  function hideSponsorNonFinal(){
    document.querySelectorAll('#sponsorTicker,#sponsorsGrid,.sponsors-marquee,.sponsors-track,.sponsors-carousel,.sponsors-slider,.sponsor-card,.sponsor-item,[class*="sponsor"][class*="track"],[class*="sponsor"][class*="carousel"],[class*="auspiciador"][class*="track"],[class*="auspiciador"][class*="carousel"]').forEach(function(el){
      if(el.closest('#sponsorsBottomSection') || el.closest('#newsGrid') || el.closest('.news-grid')) return;
      el.classList.add('rm-hide-non-final-sponsors');
      el.style.display = 'none';
      el.style.visibility = 'hidden';
      el.style.height = '0';
      el.style.overflow = 'hidden';
    });
  }

  function ensureSponsorLightbox(){
    var modal = document.getElementById('rmSponsorLightbox');
    if(!modal){
      modal = document.createElement('div');
      modal.id = 'rmSponsorLightbox';
      modal.className = 'rm-sponsor-lightbox';
      modal.innerHTML = '<button type="button" class="rm-sponsor-lightbox-close">×</button><img alt="Auspiciador ampliado"><p>Haz clic fuera de la imagen para cerrar</p>';
      document.body.appendChild(modal);
      modal.addEventListener('click', function(e){
        if(e.target === modal || e.target.classList.contains('rm-sponsor-lightbox-close')) modal.classList.remove('open');
      });
    }
    return modal;
  }

  function renderSponsorsFinal(){
    var sponsors = sponsorsStrict();
    var section = document.getElementById('sponsorsBottomSection');
    if(!section){
      section = document.createElement('section');
      section.id = 'sponsorsBottomSection';
    }
    section.className = 'section sponsors-bottom-section rm-sponsors-final-section rm-sponsors-sin-fondo-blanco';
    section.hidden = false;
    section.style.display = 'block';
    section.style.visibility = 'visible';
    section.innerHTML = '<div class="section-head rm-sponsors-final-head"><h2>★ Auspiciadores Oficiales ★</h2><p>Pincha un logo para ampliarlo</p></div><div id="sponsorsFinalGrid" class="sponsors-final-grid rm-sponsors-grid-final"></div>';
    var grid = section.querySelector('#sponsorsFinalGrid');
    if(!sponsors.length) grid.innerHTML = '<div class="sponsors-empty-final">Auspiciadores pendientes de cargar desde Admin.</div>';
    else grid.innerHTML = sponsors.map(function(s){
      return '<button type="button" class="sponsor-final-card rm-sponsor-no-white-card"><img src="'+esc(s.url)+'" alt="'+esc(s.name)+'" loading="lazy"></button>';
    }).join('');
    main().appendChild(section);
    var modal = ensureSponsorLightbox();
    var modalImg = modal.querySelector('img');
    grid.querySelectorAll('img').forEach(function(img){
      img.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        modalImg.src = img.src || '';
        modal.classList.add('open');
      });
    });
  }

  function adminCompactEditor(){
    if(!/admin/i.test(location.pathname) && !document.querySelector('.admin,.admin-panel,#adminPanel')) return;
    if(document.getElementById('rmCompactResultsAdmin')) return;
    var host = document.querySelector('main') || document.body;
    var box = document.createElement('section');
    box.id = 'rmCompactResultsAdmin';
    box.className = 'admin-card rm-compact-results-admin';
    box.innerHTML = '<h2>Resultados compactos</h2><p>Agrega o edita los marcadores que se verán en la página pública.</p><div id="rmCompactResultsAdminList"></div><button type="button" id="rmAddCompactResultBtn">+ Agregar resultado compacto</button><button type="button" id="rmSaveCompactResultsBtn">Guardar resultados compactos</button>';
    host.appendChild(box);

    function renderRows(){
      var d = getDataSafe();
      var arr = Array.isArray(d.compactResults) ? d.compactResults : (Array.isArray(d.results) ? d.results : []);
      var list = document.getElementById('rmCompactResultsAdminList');
      list.innerHTML = arr.map(function(r){
        return '<div class="rm-admin-result-row"><input placeholder="Serie" value="'+esc(r.serie || r.series || '')+'"><input placeholder="Rival" value="'+esc(r.rival || r.opponent || '')+'"><input placeholder="Marcador" value="'+esc(r.marcador || r.score || r.resultado || '')+'"><input placeholder="Fecha" value="'+esc(r.fecha || r.date || '')+'"><button type="button" class="rmDeleteCompactResult">Eliminar</button></div>';
      }).join('');
      list.querySelectorAll('.rmDeleteCompactResult').forEach(function(btn){ btn.addEventListener('click', function(){ btn.closest('.rm-admin-result-row').remove(); }); });
    }

    document.getElementById('rmAddCompactResultBtn').addEventListener('click', function(){
      var div = document.createElement('div');
      div.className = 'rm-admin-result-row';
      div.innerHTML = '<input placeholder="Serie"><input placeholder="Rival"><input placeholder="Marcador"><input placeholder="Fecha"><button type="button" class="rmDeleteCompactResult">Eliminar</button>';
      document.getElementById('rmCompactResultsAdminList').appendChild(div);
      div.querySelector('.rmDeleteCompactResult').addEventListener('click', function(){ div.remove(); });
    });

    document.getElementById('rmSaveCompactResultsBtn').addEventListener('click', async function(){
      var arr = [];
      document.querySelectorAll('#rmCompactResultsAdminList .rm-admin-result-row').forEach(function(row){
        var i = row.querySelectorAll('input');
        arr.push({serie:i[0].value.trim(),rival:i[1].value.trim(),marcador:i[2].value.trim(),fecha:i[3].value.trim()});
      });
      var d = getDataSafe();
      d.compactResults = arr;
      d.results = arr;
      saveDataSafe(d);
      try{ if(typeof pushCloud === 'function') await pushCloud(); }catch(e){}
      alert('Resultados compactos guardados.');
    });

    renderRows();
  }

  function run(){
    renderNews();
    removeLatestResultsOld();
    renderCompactResults();
    galleryFit();
    hideSponsorNonFinal();
    renderSponsorsFinal();
    adminCompactEditor();
    setTimeout(function(){
      renderNews();
      removeLatestResultsOld();
      renderCompactResults();
      galleryFit();
      hideSponsorNonFinal();
      renderSponsorsFinal();
    }, 900);
  }

  if(typeof renderPublic === 'function'){
    var old = renderPublic;
    renderPublic = function(){
      var r = old.apply(this, arguments);
      setTimeout(run, 100);
      setTimeout(run, 1200);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    [120,900,2200,5200].forEach(function(t){ setTimeout(run,t); });
  });
  document.addEventListener('rm:supabase-mobile-loaded', function(){ setTimeout(run,150); setTimeout(run,1000); });
  window.addEventListener('pageshow', function(){ setTimeout(run,250); });
  window.rmRevisionFinalNRG = run;
})();


/* =========================================================
   FIX FINAL REAL: NOTICIAS + GALERIA COMPACTA + CARRUSEL ARRIBA
   - Noticias visibles desde Supabase/localStorage.
   - Carrusel de auspiciadores arriba visible.
   - Auspiciadores también al final.
   - No mezcla noticias con auspiciadores.
   - Recuadros de noticias y galería más chicos.
========================================================= */
(function(){
  if(window.__RM_FIX_FINAL_NEWS_GALLERY_SPONSORS__) return;
  window.__RM_FIX_FINAL_NEWS_GALLERY_SPONSORS__ = true;

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

  function getClient(){
    try{ if(typeof initSB === 'function') initSB(); }catch(e){}
    if(window.supabaseClient && window.supabaseClient.from) return window.supabaseClient;
    if(window.sb && window.sb.from) return window.sb;
    if(window.supabase && window.supabase.createClient){
      window.supabaseClient = window.supabase.createClient(RM_SUPABASE_URL, RM_SUPABASE_KEY);
      window.sb = window.supabaseClient;
      return window.supabaseClient;
    }
    return null;
  }

  async function fetchTable(name){
    var client = getClient();
    if(!client) return [];
    try{
      var res = await client.from(name).select('*');
      if(!res.error && Array.isArray(res.data)) return res.data;
    }catch(e){}
    return [];
  }

  function urlOf(o){
    return (o && (o.image || o.image_url || o.imageUrl || o.url || o.img || o.photo || o.foto || o.logo || o.src || o.file_url || o.publicUrl || o.public_url)) || '';
  }

  function titleOf(o, fallback){
    return (o && (o.title || o.titulo || o.name || o.nombre || o.empresa || o.business)) || fallback || '';
  }

  function textOf(o){
    return (o && (o.text || o.descripcion || o.description || o.detalle || o.body || o.content)) || '';
  }

  function validSponsorUrl(url){
    var u = String(url || '').toLowerCase();
    if(!u) return false;
    if(u.includes('logo_ricardo_mendez') || u.includes('favicon') || u.includes('escudo')) return false;
    if(u.includes('/news/') || u.includes('/noticias/') || u.includes('noticia')) return false;
    return true;
  }

  function sponsorsStrict(){
    var d = getDataSafe();
    var arr = [];
    if(Array.isArray(d.sponsors)) arr = arr.concat(d.sponsors);
    if(Array.isArray(d.auspiciadores)) arr = arr.concat(d.auspiciadores);
    if(d.settings && Array.isArray(d.settings.sponsors)) arr = arr.concat(d.settings.sponsors);

    var seen = new Set();
    return arr.map(function(s){
      return {name:titleOf(s,'Auspiciador'), url:urlOf(s)};
    }).filter(function(s){
      if(!validSponsorUrl(s.url)) return false;
      if(seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
  }

  function newsStrict(){
    var d = getDataSafe();
    return Array.isArray(d.news) ? d.news : [];
  }

  function galleryStrict(){
    var d = getDataSafe();
    return Array.isArray(d.gallery) ? d.gallery : [];
  }

  function unhide(el){
    if(!el) return;
    el.classList.remove('rm-hide-non-final-sponsors','hide-duplicate-sponsors','rm-hide-latest-results-old','rm-sponsor-carousel-hidden');
    el.style.display = '';
    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.style.height = '';
    el.style.maxHeight = '';
    el.style.overflow = '';
    el.hidden = false;
  }

  function ensureTopSponsorCarousel(){
    var sponsors = sponsorsStrict();

    var top = document.getElementById('rmSponsorsTopCarousel');
    if(!top){
      top = document.createElement('section');
      top.id = 'rmSponsorsTopCarousel';
      top.className = 'rm-sponsors-top-carousel section';
    }

    top.innerHTML =
      '<div class="rm-sponsors-top-title"><strong>Auspiciadores oficiales</strong><span>Carrusel superior</span></div>' +
      '<div id="rmSponsorsTopTrack" class="rm-sponsors-top-track"></div>';

    var track = top.querySelector('#rmSponsorsTopTrack');

    if(!sponsors.length){
      track.innerHTML = '<div class="rm-sponsors-top-empty">Auspiciadores pendientes de cargar desde Admin.</div>';
    }else{
      var repeated = sponsors.concat(sponsors);
      track.innerHTML = repeated.map(function(s){
        return '<div class="rm-top-sponsor-item"><img src="'+esc(s.url)+'" alt="'+esc(s.name)+'" loading="lazy"><span>'+esc(s.name)+'</span></div>';
      }).join('');
    }

    var history = document.getElementById('historyPrincipalSection');
    var enhanced = document.getElementById('rmEnhancedTopSection');
    var m = main();
    if(enhanced && enhanced.parentElement) enhanced.parentElement.insertBefore(top, enhanced);
    else if(history && history.parentElement) history.parentElement.insertBefore(top, history);
    else m.insertBefore(top, m.firstChild);

    unhide(top);
    return top;
  }

  function ensureNewsSection(){
    var grid = document.getElementById('newsGrid');
    var section = grid ? grid.closest('section,.section') : null;

    if(!section){
      section = document.createElement('section');
      section.id = 'newsSection';
      section.className = 'section news-section';
      section.innerHTML = '<div class="section-head"><h2>Noticias</h2><p>Información oficial del club</p></div><div id="newsGrid" class="news-grid rm-news-grid-small"></div>';
      var gallery = document.getElementById('galleryGrid');
      if(gallery && gallery.closest('section,.section')) main().insertBefore(section, gallery.closest('section,.section'));
      else main().appendChild(section);
      grid = section.querySelector('#newsGrid');
    }

    unhide(section);
    grid = document.getElementById('newsGrid') || section.querySelector('.news-grid');
    if(!grid){
      grid = document.createElement('div');
      grid.id = 'newsGrid';
      grid.className = 'news-grid rm-news-grid-small';
      section.appendChild(grid);
    }
    unhide(grid);
    grid.classList.add('rm-news-grid-small');
    grid.style.display = 'grid';
    return grid;
  }

  function renderNews(){
    var grid = ensureNewsSection();
    var news = newsStrict();

    if(!news.length){
      grid.innerHTML = '<div class="empty-state rm-news-empty">Aún no hay noticias cargadas.</div>';
      return;
    }

    grid.innerHTML = news.map(function(n){
      var title = titleOf(n,'Noticia');
      var txt = textOf(n);
      var img = urlOf(n);
      return '<article class="news-card rm-news-card-small">' +
        (img ? '<img class="rm-news-img-small" src="'+esc(img)+'" alt="'+esc(title)+'" loading="lazy">' : '<div class="rm-news-no-img-small">RM</div>') +
        '<h3>'+esc(title)+'</h3>' +
        '<p>'+esc(txt)+'</p>' +
      '</article>';
    }).join('');
  }

  function removeOldLatestResults(){
    document.querySelectorAll('#rmLatestResultsPanel,.rm-latest-results-panel').forEach(function(el){ el.remove(); });
    document.querySelectorAll('section,.section,article,.card,.panel').forEach(function(el){
      if(el.id === 'rmCompactResultsPanel' || el.closest('#rmCompactResultsPanel')) return;
      var t = String(el.textContent || '').toLowerCase();
      if(t.includes('últimos resultados') || t.includes('ultimos resultados')){
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.height = '0';
        el.style.overflow = 'hidden';
        el.classList.add('rm-hide-latest-results-old');
      }
    });
  }

  function resultData(){
    var d = getDataSafe();
    if(Array.isArray(d.compactResults)) return d.compactResults;
    if(Array.isArray(d.resultadosCompactos)) return d.resultadosCompactos;
    if(Array.isArray(d.results)) return d.results;
    if(Array.isArray(d.resultados)) return d.resultados;
    return [];
  }

  function renderCompactResults(){
    removeOldLatestResults();
    var panel = document.getElementById('rmCompactResultsPanel');
    if(!panel){
      panel = document.createElement('section');
      panel.id = 'rmCompactResultsPanel';
      panel.className = 'section rm-compact-results-panel';
      panel.innerHTML = '<div class="section-head"><h2>Resultados compactos</h2><p>Marcadores editables desde Admin</p></div><div id="rmCompactResultsList" class="rm-compact-results-list"></div>';
    }
    var top = document.getElementById('rmSponsorsTopCarousel');
    if(top && top.parentElement) top.insertAdjacentElement('afterend', panel);
    else main().insertBefore(panel, main().firstChild);
    unhide(panel);

    var list = document.getElementById('rmCompactResultsList');
    var arr = resultData();
    if(!list){
      list = document.createElement('div');
      list.id = 'rmCompactResultsList';
      list.className = 'rm-compact-results-list';
      panel.appendChild(list);
    }
    if(!arr.length){
      list.innerHTML = '<div class="rm-results-empty">Resultados compactos pendientes de cargar desde Admin.</div>';
    }else{
      list.innerHTML = arr.slice(0,10).map(function(r){
        var serie = r.serie || r.series || r.category || '';
        var rival = r.rival || r.opponent || r.equipo || r.visita || '';
        var marcador = r.marcador || r.score || r.resultado || r.texto || '';
        var fecha = r.fecha || r.date || '';
        return '<div class="rm-result-compact-card"><strong>'+esc(marcador || 'Resultado')+'</strong><span>'+esc([serie,rival,fecha].filter(Boolean).join(' · '))+'</span></div>';
      }).join('');
    }
  }

  function ensureGallery(){
    var grid = document.getElementById('galleryGrid');
    var section = grid ? grid.closest('section,.section') : null;
    if(section) unhide(section);
    if(grid){
      unhide(grid);
      grid.classList.add('rm-gallery-grid-small');
    }
  }

  function renderGallerySmall(){
    ensureGallery();
    var grid = document.getElementById('galleryGrid');
    if(!grid) return;
    var gallery = galleryStrict();

    if(gallery.length){
      grid.innerHTML = gallery.map(function(g){
        var title = titleOf(g,'Galería');
        var url = urlOf(g);
        var type = g.type || g.tipo || '';
        return '<article class="media-card rm-gallery-card-small">' +
          (type === 'video' ? '<video class="rm-gallery-img-small" controls src="'+esc(url)+'"></video>' : '<img class="rm-gallery-img-small" src="'+esc(url)+'" alt="'+esc(title)+'" loading="lazy">') +
          '<h3>'+esc(title)+'</h3>' +
        '</article>';
      }).join('');
    }else{
      document.querySelectorAll('#galleryGrid .media-card,#galleryGrid .gallery-card,#galleryGrid .photo-card,#galleryGrid article').forEach(function(card){
        card.classList.add('rm-gallery-card-small');
        var img = card.querySelector('img');
        var vid = card.querySelector('video');
        if(img) img.classList.add('rm-gallery-img-small');
        if(vid) vid.classList.add('rm-gallery-img-small');
      });
    }
  }

  function sponsorLightbox(){
    var modal = document.getElementById('rmSponsorLightbox');
    if(!modal){
      modal = document.createElement('div');
      modal.id = 'rmSponsorLightbox';
      modal.className = 'rm-sponsor-lightbox';
      modal.innerHTML = '<button type="button" class="rm-sponsor-lightbox-close">×</button><img alt="Auspiciador ampliado"><p>Haz clic fuera de la imagen para cerrar</p>';
      document.body.appendChild(modal);
      modal.addEventListener('click', function(e){
        if(e.target === modal || e.target.classList.contains('rm-sponsor-lightbox-close')) modal.classList.remove('open');
      });
    }
    return modal;
  }

  function renderSponsorsBottom(){
    var sponsors = sponsorsStrict();
    var section = document.getElementById('sponsorsBottomSection');
    if(!section){
      section = document.createElement('section');
      section.id = 'sponsorsBottomSection';
    }
    section.className = 'section sponsors-bottom-section rm-sponsors-final-section rm-sponsors-sin-fondo-blanco';
    section.innerHTML = '<div class="section-head rm-sponsors-final-head"><h2>★ Auspiciadores Oficiales ★</h2><p>Pincha un logo para ampliarlo</p></div><div id="sponsorsFinalGrid" class="sponsors-final-grid rm-sponsors-grid-final"></div>';
    var grid = section.querySelector('#sponsorsFinalGrid');
    if(!sponsors.length){
      grid.innerHTML = '<div class="sponsors-empty-final">Auspiciadores pendientes de cargar desde Admin.</div>';
    }else{
      grid.innerHTML = sponsors.map(function(s){
        return '<button type="button" class="sponsor-final-card rm-sponsor-no-white-card"><img src="'+esc(s.url)+'" alt="'+esc(s.name)+'" loading="lazy"></button>';
      }).join('');
    }
    main().appendChild(section);
    unhide(section);

    var modal = sponsorLightbox();
    var modalImg = modal.querySelector('img');
    grid.querySelectorAll('img').forEach(function(img){
      img.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        modalImg.src = img.src || '';
        modal.classList.add('open');
      });
    });
  }

  function adminCompactEditor(){
    if(!/admin/i.test(location.pathname) && !document.querySelector('.admin,.admin-panel,#adminPanel')) return;
    if(document.getElementById('rmCompactResultsAdmin')) return;

    var host = document.querySelector('main') || document.body;
    var box = document.createElement('section');
    box.id = 'rmCompactResultsAdmin';
    box.className = 'admin-card rm-compact-results-admin';
    box.innerHTML = '<h2>Resultados compactos</h2><p>Agrega o edita los marcadores visibles en la página pública.</p><div id="rmCompactResultsAdminList"></div><button type="button" id="rmAddCompactResultBtn">+ Agregar resultado compacto</button><button type="button" id="rmSaveCompactResultsBtn">Guardar resultados compactos</button>';
    host.appendChild(box);

    function renderRows(){
      var d = getDataSafe();
      var arr = Array.isArray(d.compactResults) ? d.compactResults : (Array.isArray(d.results) ? d.results : []);
      var list = document.getElementById('rmCompactResultsAdminList');
      list.innerHTML = arr.map(function(r){
        return '<div class="rm-admin-result-row"><input placeholder="Serie" value="'+esc(r.serie || r.series || '')+'"><input placeholder="Rival" value="'+esc(r.rival || r.opponent || '')+'"><input placeholder="Marcador" value="'+esc(r.marcador || r.score || r.resultado || '')+'"><input placeholder="Fecha" value="'+esc(r.fecha || r.date || '')+'"><button type="button" class="rmDeleteCompactResult">Eliminar</button></div>';
      }).join('');
      list.querySelectorAll('.rmDeleteCompactResult').forEach(function(btn){ btn.addEventListener('click', function(){ btn.closest('.rm-admin-result-row').remove(); }); });
    }

    document.getElementById('rmAddCompactResultBtn').addEventListener('click', function(){
      var div = document.createElement('div');
      div.className = 'rm-admin-result-row';
      div.innerHTML = '<input placeholder="Serie"><input placeholder="Rival"><input placeholder="Marcador"><input placeholder="Fecha"><button type="button" class="rmDeleteCompactResult">Eliminar</button>';
      document.getElementById('rmCompactResultsAdminList').appendChild(div);
      div.querySelector('.rmDeleteCompactResult').addEventListener('click', function(){ div.remove(); });
    });

    document.getElementById('rmSaveCompactResultsBtn').addEventListener('click', async function(){
      var arr = [];
      document.querySelectorAll('#rmCompactResultsAdminList .rm-admin-result-row').forEach(function(row){
        var i = row.querySelectorAll('input');
        arr.push({serie:i[0].value.trim(), rival:i[1].value.trim(), marcador:i[2].value.trim(), fecha:i[3].value.trim()});
      });
      var d = getDataSafe();
      d.compactResults = arr;
      d.results = arr;
      saveDataSafe(d);
      try{ if(typeof pushCloud === 'function') await pushCloud(); }catch(e){}
      alert('Resultados compactos guardados.');
    });

    renderRows();
  }

  async function loadDirectSupabase(){
    var d = getDataSafe();
    var changed = false;

    if(!Array.isArray(d.news) || !d.news.length){
      var news = await fetchTable('news');
      if(news.length){ d.news = news; changed = true; }
    }

    if(!Array.isArray(d.sponsors) || !d.sponsors.length){
      var sp = await fetchTable('sponsors');
      if(sp.length){ d.sponsors = sp; changed = true; }
    }

    if(!Array.isArray(d.gallery) || !d.gallery.length){
      var gal = await fetchTable('gallery');
      if(gal.length){ d.gallery = gal; changed = true; }
    }

    if(changed) saveDataSafe(d);
  }

  async function run(){
    await loadDirectSupabase();
    ensureTopSponsorCarousel();
    renderNews();
    removeOldLatestResults();
    renderCompactResults();
    renderGallerySmall();
    renderSponsorsBottom();
    adminCompactEditor();

    setTimeout(function(){
      ensureTopSponsorCarousel();
      renderNews();
      removeOldLatestResults();
      renderCompactResults();
      renderGallerySmall();
      renderSponsorsBottom();
    }, 1000);
  }

  if(typeof renderPublic === 'function'){
    var oldRender = renderPublic;
    renderPublic = function(){
      var r = oldRender.apply(this, arguments);
      setTimeout(run, 120);
      setTimeout(run, 1400);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(run, 120);
    setTimeout(run, 1400);
    setTimeout(run, 3200);
    setTimeout(run, 6500);
  });

  document.addEventListener('rm:supabase-mobile-loaded', function(){
    setTimeout(run, 150);
    setTimeout(run, 1100);
  });

  window.addEventListener('pageshow', function(){ setTimeout(run, 250); });
  window.rmFixFinalNewsGallerySponsors = run;
})();


/* =========================================================
   FIX DEFINITIVO NOTICIAS VISIBLES + RESULTADOS ENTRE PROXIMO PARTIDO E HISTORIA
========================================================= */
(function(){
  if(window.__RM_FIX_NEWS_VISIBLE_RESULTS_POSITION__) return;
  window.__RM_FIX_NEWS_VISIBLE_RESULTS_POSITION__ = true;

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

  async function restTable(table){
    try{
      var url = RM_SUPABASE_URL.replace(/\/$/,'') + '/rest/v1/' + table + '?select=*';
      var res = await fetch(url, {
        headers: {
          apikey: RM_SUPABASE_KEY,
          Authorization: 'Bearer ' + RM_SUPABASE_KEY
        }
      });
      if(!res.ok) return [];
      var data = await res.json();
      return Array.isArray(data) ? data : [];
    }catch(e){
      return [];
    }
  }

  function getImage(o){
    return (o && (o.image || o.image_url || o.imageUrl || o.url || o.img || o.photo || o.foto || o.src || o.file_url || o.publicUrl || o.public_url)) || '';
  }

  function getTitle(o, fallback){
    return (o && (o.title || o.titulo || o.name || o.nombre || o.subject || o.heading)) || fallback || '';
  }

  function getText(o){
    return (o && (o.text || o.descripcion || o.description || o.detalle || o.body || o.content || o.resumen)) || '';
  }

  function unhide(el){
    if(!el) return;
    el.classList.remove('rm-hide-non-final-sponsors','hide-duplicate-sponsors','rm-hide-latest-results-old','rm-sponsor-carousel-hidden');
    el.hidden = false;
    el.style.display = '';
    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.style.height = '';
    el.style.maxHeight = '';
    el.style.overflow = '';
  }

  function ensureNewsSection(){
    var grid = document.getElementById('newsGrid');
    var section = grid ? grid.closest('section,.section') : null;

    if(!section){
      section = document.createElement('section');
      section.id = 'newsSection';
      section.className = 'section news-section rm-news-section-visible';
      section.innerHTML =
        '<div class="section-head"><h2>Noticias</h2><p>Información oficial del club</p></div>' +
        '<div id="newsGrid" class="news-grid rm-news-grid-small"></div>';

      var gallery = document.getElementById('galleryGrid');
      var history = document.getElementById('historyPrincipalSection');
      if(gallery && gallery.closest('section,.section')) main().insertBefore(section, gallery.closest('section,.section'));
      else if(history && history.parentElement) history.parentElement.insertBefore(section, history.nextSibling);
      else main().appendChild(section);
      grid = section.querySelector('#newsGrid');
    }

    section.classList.add('rm-news-section-visible');
    unhide(section);

    grid = document.getElementById('newsGrid') || section.querySelector('.news-grid');
    if(!grid){
      grid = document.createElement('div');
      grid.id = 'newsGrid';
      grid.className = 'news-grid rm-news-grid-small';
      section.appendChild(grid);
    }
    grid.classList.add('rm-news-grid-small');
    unhide(grid);
    grid.style.display = 'grid';
    return grid;
  }

  function newsFromLocal(){
    var d = getDataSafe();
    if(Array.isArray(d.news) && d.news.length) return d.news;

    // Buscar en otras llaves de localStorage por si quedó guardado con otro nombre.
    var found = [];
    for(var i=0;i<localStorage.length;i++){
      try{
        var k = localStorage.key(i);
        var raw = localStorage.getItem(k);
        if(!raw || raw[0] !== '{' && raw[0] !== '[') continue;
        var obj = JSON.parse(raw);
        if(Array.isArray(obj.news) && obj.news.length) found = found.concat(obj.news);
        if(Array.isArray(obj.noticias) && obj.noticias.length) found = found.concat(obj.noticias);
      }catch(e){}
    }
    return found;
  }

  async function loadNewsData(){
    var news = newsFromLocal();
    if(news.length) return news;

    var direct = await restTable('news');
    if(direct.length){
      var d = getDataSafe();
      d.news = direct;
      saveDataSafe(d);
      return direct;
    }

    return [];
  }

  async function renderNewsVisible(){
    var grid = ensureNewsSection();

    // No borrar noticias existentes mientras carga.
    if(!grid.children.length){
      grid.innerHTML = '<div class="rm-news-loading">Cargando noticias oficiales...</div>';
    }

    var news = await loadNewsData();

    if(!news.length){
      // No ocultar la sección; dejar visible para que el admin sepa que está pendiente.
      grid.innerHTML = '<div class="empty-state rm-news-empty">Aún no hay noticias cargadas desde Admin.</div>';
      return;
    }

    grid.innerHTML = news.map(function(n){
      var title = getTitle(n, 'Noticia');
      var text = getText(n);
      var img = getImage(n);
      return '<article class="news-card rm-news-card-small">' +
        (img ? '<img class="rm-news-img-small" src="'+esc(img)+'" alt="'+esc(title)+'" loading="lazy">' : '<div class="rm-news-no-img-small">RM</div>') +
        '<h3>'+esc(title)+'</h3>' +
        '<p>'+esc(text)+'</p>' +
      '</article>';
    }).join('');
  }

  function removeOldLatestResults(){
    document.querySelectorAll('#rmLatestResultsPanel,.rm-latest-results-panel').forEach(function(el){ el.remove(); });
    document.querySelectorAll('section,.section,article,.card,.panel').forEach(function(el){
      if(el.id === 'rmCompactResultsPanel' || el.closest('#rmCompactResultsPanel')) return;
      var t = String(el.textContent || '').toLowerCase();
      if(t.includes('últimos resultados') || t.includes('ultimos resultados')){
        el.classList.add('rm-hide-latest-results-old');
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.height = '0';
        el.style.maxHeight = '0';
        el.style.overflow = 'hidden';
      }
    });
  }

  function resultData(){
    var d = getDataSafe();
    if(Array.isArray(d.compactResults)) return d.compactResults;
    if(Array.isArray(d.resultadosCompactos)) return d.resultadosCompactos;
    if(Array.isArray(d.results)) return d.results;
    if(Array.isArray(d.resultados)) return d.resultados;
    return [];
  }

  function ensureCompactResultsPanel(){
    var panel = document.getElementById('rmCompactResultsPanel');
    if(!panel){
      panel = document.createElement('section');
      panel.id = 'rmCompactResultsPanel';
      panel.className = 'section rm-compact-results-panel';
      panel.innerHTML =
        '<div class="section-head"><h2>Resultados compactos</h2><p>Marcadores editables desde Admin</p></div>' +
        '<div id="rmCompactResultsList" class="rm-compact-results-list"></div>';
    }

    // Ubicación exacta: entre Próximo Partido y la Historia.
    var history = document.getElementById('historyPrincipalSection') || document.querySelector('.history-principal-section');
    var nextMatch =
      document.getElementById('rmNextMatchPanel') ||
      document.querySelector('.next-match,.proximo-partido,.rm-next-match-panel,[id*="nextMatch"],[id*="proximo"]');

    if(history && history.parentElement){
      // Insertar justo antes de Historia para que quede después de los bloques superiores/Próximo partido.
      history.parentElement.insertBefore(panel, history);
    }else if(nextMatch){
      var after = nextMatch.closest('section,.section,article,.card,.panel') || nextMatch;
      after.insertAdjacentElement('afterend', panel);
    }else{
      main().insertBefore(panel, main().firstChild);
    }

    unhide(panel);
    panel.style.display = 'block';
    return panel;
  }

  function renderCompactResultsPosition(){
    removeOldLatestResults();
    var panel = ensureCompactResultsPanel();
    var list = document.getElementById('rmCompactResultsList');
    if(!list){
      list = document.createElement('div');
      list.id = 'rmCompactResultsList';
      list.className = 'rm-compact-results-list';
      panel.appendChild(list);
    }

    var arr = resultData();
    if(!arr.length){
      list.innerHTML = '<div class="rm-results-empty">Resultados compactos pendientes de cargar desde Admin.</div>';
      return;
    }

    list.innerHTML = arr.slice(0,10).map(function(r){
      var serie = r.serie || r.series || r.category || '';
      var rival = r.rival || r.opponent || r.equipo || r.visita || '';
      var marcador = r.marcador || r.score || r.resultado || r.texto || '';
      var fecha = r.fecha || r.date || '';
      return '<div class="rm-result-compact-card">' +
        '<strong>'+esc(marcador || 'Resultado')+'</strong>' +
        '<span>'+esc([serie, rival, fecha].filter(Boolean).join(' · '))+'</span>' +
      '</div>';
    }).join('');
  }

  function adminCompactEditor(){
    if(!/admin/i.test(location.pathname) && !document.querySelector('.admin,.admin-panel,#adminPanel')) return;
    if(document.getElementById('rmCompactResultsAdmin')) return;

    var host = document.querySelector('main') || document.body;
    var box = document.createElement('section');
    box.id = 'rmCompactResultsAdmin';
    box.className = 'admin-card rm-compact-results-admin';
    box.innerHTML =
      '<h2>Resultados compactos</h2>' +
      '<p>Agrega o edita los marcadores que se verán entre Próximo Partido e Historia.</p>' +
      '<div id="rmCompactResultsAdminList"></div>' +
      '<button type="button" id="rmAddCompactResultBtn">+ Agregar resultado compacto</button>' +
      '<button type="button" id="rmSaveCompactResultsBtn">Guardar resultados compactos</button>';
    host.appendChild(box);

    function renderRows(){
      var d = getDataSafe();
      var arr = Array.isArray(d.compactResults) ? d.compactResults : (Array.isArray(d.results) ? d.results : []);
      var list = document.getElementById('rmCompactResultsAdminList');
      list.innerHTML = arr.map(function(r){
        return '<div class="rm-admin-result-row">' +
          '<input placeholder="Serie" value="'+esc(r.serie || r.series || '')+'">' +
          '<input placeholder="Rival" value="'+esc(r.rival || r.opponent || '')+'">' +
          '<input placeholder="Marcador" value="'+esc(r.marcador || r.score || r.resultado || '')+'">' +
          '<input placeholder="Fecha" value="'+esc(r.fecha || r.date || '')+'">' +
          '<button type="button" class="rmDeleteCompactResult">Eliminar</button>' +
        '</div>';
      }).join('');
      list.querySelectorAll('.rmDeleteCompactResult').forEach(function(btn){
        btn.addEventListener('click', function(){ btn.closest('.rm-admin-result-row').remove(); });
      });
    }

    document.getElementById('rmAddCompactResultBtn').addEventListener('click', function(){
      var div = document.createElement('div');
      div.className = 'rm-admin-result-row';
      div.innerHTML =
        '<input placeholder="Serie">' +
        '<input placeholder="Rival">' +
        '<input placeholder="Marcador">' +
        '<input placeholder="Fecha">' +
        '<button type="button" class="rmDeleteCompactResult">Eliminar</button>';
      document.getElementById('rmCompactResultsAdminList').appendChild(div);
      div.querySelector('.rmDeleteCompactResult').addEventListener('click', function(){ div.remove(); });
    });

    document.getElementById('rmSaveCompactResultsBtn').addEventListener('click', async function(){
      var arr = [];
      document.querySelectorAll('#rmCompactResultsAdminList .rm-admin-result-row').forEach(function(row){
        var i = row.querySelectorAll('input');
        arr.push({serie:i[0].value.trim(), rival:i[1].value.trim(), marcador:i[2].value.trim(), fecha:i[3].value.trim()});
      });
      var d = getDataSafe();
      d.compactResults = arr;
      d.results = arr;
      saveDataSafe(d);
      try{ if(typeof pushCloud === 'function') await pushCloud(); }catch(e){}
      alert('Resultados compactos guardados.');
    });

    renderRows();
  }

  function applySmallGallery(){
    document.querySelectorAll('#galleryGrid,.gallery-grid,.galeria-grid,.photos-grid,.photo-grid').forEach(function(grid){
      grid.classList.add('rm-gallery-grid-small');
      unhide(grid);
      grid.style.display = 'grid';
    });

    document.querySelectorAll('#galleryGrid .media-card,#galleryGrid .gallery-card,#galleryGrid .photo-card,#galleryGrid article,.gallery-grid .media-card,.gallery-grid .gallery-card,.gallery-grid .photo-card').forEach(function(card){
      card.classList.add('rm-gallery-card-small');
      var img = card.querySelector('img');
      var vid = card.querySelector('video');
      if(img) img.classList.add('rm-gallery-img-small');
      if(vid) vid.classList.add('rm-gallery-img-small');
    });
  }

  function run(){
    renderNewsVisible();
    renderCompactResultsPosition();
    applySmallGallery();
    adminCompactEditor();

    setTimeout(function(){
      renderNewsVisible();
      renderCompactResultsPosition();
      applySmallGallery();
    }, 1000);

    setTimeout(function(){
      renderNewsVisible();
      renderCompactResultsPosition();
      applySmallGallery();
    }, 3000);
  }

  if(typeof renderPublic === 'function'){
    var oldRender = renderPublic;
    renderPublic = function(){
      var r = oldRender.apply(this, arguments);
      setTimeout(run, 120);
      setTimeout(run, 1300);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(run, 120);
    setTimeout(run, 1300);
    setTimeout(run, 3200);
    setTimeout(run, 6500);
  });

  document.addEventListener('rm:supabase-mobile-loaded', function(){
    setTimeout(run, 150);
    setTimeout(run, 1100);
  });

  window.addEventListener('pageshow', function(){ setTimeout(run, 250); });
  window.rmFixNewsVisibleResultsPosition = run;
})();


/* =========================================================
   FIX CARRUSEL SIN TAPAR + NOTICIAS GRANDES IMAGEN COMPLETA
========================================================= */
(function(){
  if(window.__RM_FIX_CARRUSEL_NOTICIAS_GRANDES__) return;
  window.__RM_FIX_CARRUSEL_NOTICIAS_GRANDES__ = true;

  function main(){
    return document.querySelector('main') || document.querySelector('#app') || document.body;
  }

  function moveCarouselBelowInfo(){
    var carousel = document.getElementById('rmSponsorsTopCarousel') || document.querySelector('.rm-sponsors-top-carousel');
    if(!carousel) return;

    carousel.id = 'rmSponsorsTopCarousel';
    carousel.classList.add('rm-sponsors-top-carousel','rm-carousel-separated-ok');

    // No debe quedar detrás del mensaje "Información cargada".
    var enhanced = document.getElementById('rmEnhancedTopSection');
    var history = document.getElementById('historyPrincipalSection') || document.querySelector('.history-principal-section');

    if(enhanced && enhanced.parentElement){
      enhanced.insertAdjacentElement('afterend', carousel);
    }else if(history && history.parentElement){
      history.parentElement.insertBefore(carousel, history);
    }else{
      main().insertBefore(carousel, main().firstChild);
    }

    carousel.style.position = 'relative';
    carousel.style.zIndex = '2';
    carousel.style.display = 'block';
    carousel.style.visibility = 'visible';
    carousel.style.opacity = '1';
    carousel.style.marginTop = '14px';
    carousel.style.marginBottom = '16px';
    carousel.style.clear = 'both';
  }

  function keepResultsBeforeHistory(){
    var panel = document.getElementById('rmCompactResultsPanel');
    var history = document.getElementById('historyPrincipalSection') || document.querySelector('.history-principal-section');
    if(panel && history && history.parentElement){
      history.parentElement.insertBefore(panel, history);
      panel.style.display = 'block';
      panel.style.visibility = 'visible';
    }
  }

  function newsLargeFullImage(){
    var grid = document.getElementById('newsGrid') || document.querySelector('.news-grid,.noticias-grid');
    if(grid){
      grid.classList.remove('rm-news-grid-small','rm-news-grid-compact');
      grid.classList.add('rm-news-grid-large-full');
      grid.style.display = 'grid';
      grid.style.visibility = 'visible';
      grid.style.opacity = '1';
    }

    document.querySelectorAll('#newsGrid .news-card,.news-grid .news-card,.noticias-grid .news-card,.news-card,.rm-news-card-small,.rm-news-card-compact').forEach(function(card){
      card.classList.remove('rm-news-card-small','rm-news-card-compact');
      card.classList.add('rm-news-card-large-full');
      card.style.display = 'flex';
      card.style.visibility = 'visible';
      card.style.opacity = '1';

      var img = card.querySelector('img');
      if(img){
        img.classList.remove('rm-news-img-small','rm-news-img-fit');
        img.classList.add('rm-news-img-large-full');
        img.style.objectFit = 'contain';
        img.style.objectPosition = 'center';
        img.style.width = '100%';
      }

      var empty = card.querySelector('.rm-news-no-img-small,.rm-news-no-img');
      if(empty){
        empty.classList.remove('rm-news-no-img-small');
        empty.classList.add('rm-news-no-img-large-full');
      }
    });
  }

  function run(){
    moveCarouselBelowInfo();
    keepResultsBeforeHistory();
    newsLargeFullImage();

    setTimeout(function(){
      moveCarouselBelowInfo();
      keepResultsBeforeHistory();
      newsLargeFullImage();
    }, 900);
  }

  if(typeof renderPublic === 'function'){
    var oldRender = renderPublic;
    renderPublic = function(){
      var r = oldRender.apply(this, arguments);
      setTimeout(run, 120);
      setTimeout(run, 1200);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(run, 120);
    setTimeout(run, 1200);
    setTimeout(run, 3000);
    setTimeout(run, 6000);
  });

  document.addEventListener('rm:supabase-mobile-loaded', function(){
    setTimeout(run, 150);
    setTimeout(run, 1000);
  });

  window.addEventListener('pageshow', function(){ setTimeout(run, 250); });

  window.rmFixCarruselNoticiasGrandes = run;
})();


/* =========================================================
   FIX SIN BOTON / AVISO INFORMACION CARGADA
   Oculta el aviso para que no tape el carrusel.
========================================================= */
(function(){
  if(window.__RM_FIX_HIDE_INFO_CARGADA__) return;
  window.__RM_FIX_HIDE_INFO_CARGADA__ = true;

  function hideInfoCargada(){
    var selectors = [
      '#rmLoadingNotice',
      '.rm-loading-notice',
      '#loadingNotice',
      '.loading-notice',
      '.data-loaded',
      '.info-loaded',
      '[id*="LoadingNotice"]',
      '[class*="LoadingNotice"]'
    ].join(',');

    document.querySelectorAll(selectors).forEach(function(el){
      var t = String(el.textContent || '').toLowerCase();
      if(t.includes('información cargada') || t.includes('informacion cargada') || t.includes('datos cargados') || el.id === 'rmLoadingNotice'){
        el.classList.add('rm-info-cargada-hidden');
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
        el.style.height = '0';
        el.style.minHeight = '0';
        el.style.maxHeight = '0';
        el.style.margin = '0';
        el.style.padding = '0';
        el.style.overflow = 'hidden';
      }
    });

    // Si el aviso viene como botón o etiqueta dentro del panel superior, también se oculta.
    document.querySelectorAll('button,span,div,p,strong').forEach(function(el){
      var t = String(el.textContent || '').toLowerCase().replace(/\s+/g,' ').trim();
      if(t === 'información cargada' || t === 'informacion cargada' || t.includes('información cargada') || t.includes('informacion cargada')){
        el.classList.add('rm-info-cargada-hidden');
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
        el.style.height = '0';
        el.style.minHeight = '0';
        el.style.maxHeight = '0';
        el.style.margin = '0';
        el.style.padding = '0';
        el.style.overflow = 'hidden';
      }
    });

    // Reacomoda el carrusel arriba y visible.
    var carousel = document.getElementById('rmSponsorsTopCarousel') || document.querySelector('.rm-sponsors-top-carousel');
    if(carousel){
      carousel.classList.add('rm-carousel-visible-final');
      carousel.style.display = 'block';
      carousel.style.visibility = 'visible';
      carousel.style.opacity = '1';
      carousel.style.position = 'relative';
      carousel.style.zIndex = '4';
      carousel.style.marginTop = '10px';
      carousel.style.marginBottom = '16px';
      carousel.style.clear = 'both';

      var enhanced = document.getElementById('rmEnhancedTopSection');
      var history = document.getElementById('historyPrincipalSection') || document.querySelector('.history-principal-section');
      if(enhanced && enhanced.parentElement){
        enhanced.insertAdjacentElement('afterend', carousel);
      }else if(history && history.parentElement){
        history.parentElement.insertBefore(carousel, history);
      }
    }

    // Evita que el panel superior reserve espacio raro.
    var enhanced = document.getElementById('rmEnhancedTopSection');
    if(enhanced){
      enhanced.classList.add('rm-enhanced-no-info-cargada');
      enhanced.style.overflow = 'visible';
      enhanced.style.marginBottom = '8px';
    }
  }

  if(typeof renderPublic === 'function'){
    var oldRender = renderPublic;
    renderPublic = function(){
      var r = oldRender.apply(this, arguments);
      setTimeout(hideInfoCargada, 80);
      setTimeout(hideInfoCargada, 900);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(hideInfoCargada, 80);
    setTimeout(hideInfoCargada, 800);
    setTimeout(hideInfoCargada, 1800);
    setTimeout(hideInfoCargada, 4000);
  });

  document.addEventListener('rm:supabase-mobile-loaded', function(){
    setTimeout(hideInfoCargada, 120);
    setTimeout(hideInfoCargada, 900);
  });

  window.addEventListener('pageshow', function(){ setTimeout(hideInfoCargada, 200); });

  window.rmHideInfoCargada = hideInfoCargada;
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
