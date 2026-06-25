
/* =========================================================
   AJUSTES FUNCIONALES FINALES
   - sin paneles duplicados
   - Hazte Socio operativo
   - Música operativa
   - Facebook público
   - contador global de visitas por carga
========================================================= */
(function(){
  if(window.__RM_FINAL_FUNCTIONAL_FIXES__) return;
  window.__RM_FINAL_FUNCTIONAL_FIXES__ = true;

  const PUBLIC_FACEBOOK = 'https://www.facebook.com/ricardomendezsancarlos';
  const FALLBACK_WHATSAPP = '56994413797';

  function cleanNumber(value){
    return String(value || '').replace(/\D/g,'');
  }
  function officialWhatsapp(){
    try{
      const d = typeof getData === 'function' ? getData() : {};
      const candidate =
        d?.siteConfig?.whatsapp ||
        d?.settings?.memberWhatsapp ||
        d?.settings?.whatsapp ||
        d?.memberWhatsapp ||
        FALLBACK_WHATSAPP;
      const number = cleanNumber(candidate);
      return number.length >= 10 ? number : FALLBACK_WHATSAPP;
    }catch(e){
      return FALLBACK_WHATSAPP;
    }
  }
  function hideDuplicates(){
    document.querySelectorAll('.sponsor-ticker-section,.dual-home,#auspiciadores,#noticias,#galeria').forEach(el => {
      el.hidden = true;
      el.style.setProperty('display','none','important');
    });
  }

  function secureFacebook(){
    document.querySelectorAll('a[href*="facebook.com"],#facebookBtnTop,.social-top .fb').forEach(link => {
      link.href = PUBLIC_FACEBOOK;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.dataset.publicOnly = '1';
    });
    document.querySelectorAll('#rmSideButtons a[href*="admin"],a[title="Admin"]').forEach(link => link.remove());
  }

  function buildMemberForm(){
    let section = document.getElementById('memberSection');
    if(!section){
      section = document.createElement('section');
      section.id = 'memberSection';
      section.className = 'section member-section rm-member-section-unica';
      (document.querySelector('main') || document.body).appendChild(section);
    }

    section.hidden = false;
    section.style.removeProperty('display');
    section.innerHTML = `
      <div class="section-head">
        <h2>Hazte Socio</h2>
        <p>Ingresa tus datos y envía tu solicitud por WhatsApp.</p>
      </div>
      <form id="memberRequestForm" class="member-request-form rm-member-form-final" autocomplete="on">
        <label>Nombre completo
          <input name="nombre" type="text" required autocomplete="name" placeholder="Nombre y apellido">
        </label>
        <label>RUT
          <input name="rut" type="text" autocomplete="off" placeholder="12.345.678-9">
        </label>
        <label>Teléfono / WhatsApp
          <input id="memberPhoneInput" name="telefono" type="tel" inputmode="tel" required autocomplete="tel" placeholder="Ej: +56 9 1234 5678">
        </label>
        <label>Correo electrónico
          <input name="correo" type="email" autocomplete="email" placeholder="correo@ejemplo.cl">
        </label>
        <button type="submit">Enviar aviso por WhatsApp</button>
        <small class="member-phone-help">Tu número se incluirá en el aviso que recibirá el club.</small>
        <div id="rmMemberNotice" class="rm-member-notice-final" hidden></div>
      </form>`;

    const form = document.getElementById('memberRequestForm');
    const phone = document.getElementById('memberPhoneInput');
    const notice = document.getElementById('rmMemberNotice');

    phone.addEventListener('input', () => {
      const raw = phone.value;
      if(raw.length > 22) phone.value = raw.slice(0,22);
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(form);
      const name = String(data.get('nombre') || '').trim();
      const phoneValue = String(data.get('telefono') || '').trim();
      const digits = cleanNumber(phoneValue);

      if(digits.length < 8){
        notice.hidden = false;
        notice.textContent = 'Ingresa un número de teléfono válido para enviar el aviso.';
        return;
      }

      const text = [
        'Solicitud de socio · Club Deportivo Ricardo Méndez',
        '',
        'Nombre: ' + name,
        'RUT: ' + String(data.get('rut') || '').trim(),
        'Teléfono: ' + phoneValue,
        'Correo: ' + String(data.get('correo') || '').trim()
      ].join('\n');

      const link = 'https://wa.me/' + officialWhatsapp() + '?text=' + encodeURIComponent(text);
      notice.hidden = false;
      notice.textContent = 'Solicitud preparada. Se abrirá WhatsApp para enviar el aviso al club.';
      window.open(link, '_blank', 'noopener');
    });
  }

  function fixMusic(){
    let wrap = document.getElementById('topMusicPlayer');
    if(!wrap){
      wrap = document.createElement('div');
      wrap.id = 'topMusicPlayer';
      wrap.className = 'top-music-player';
      document.body.prepend(wrap);
    }

    let audio = document.getElementById('clubMusicAudio');
    if(!audio){
      audio = document.createElement('audio');
      audio.id = 'clubMusicAudio';
      audio.loop = true;
      audio.playsInline = true;
      wrap.appendChild(audio);
    }

    let volume = document.getElementById('musicVolume');
    if(!volume){
      volume = document.createElement('input');
      volume.id = 'musicVolume';
      volume.type = 'range';
      volume.min = '0';
      volume.max = '1';
      volume.step = '0.05';
      volume.value = '0.7';
      wrap.appendChild(volume);
    }

    let oldButton = document.getElementById('musicToggleBtn');
    if(!oldButton){
      oldButton = document.createElement('button');
      oldButton.id = 'musicToggleBtn';
      oldButton.type = 'button';
      oldButton.innerHTML = '<span id="musicIcon">▶</span><strong>Himno RM</strong>';
      wrap.prepend(oldButton);
    }

    const newButton = oldButton.cloneNode(true);
    oldButton.replaceWith(newButton);
    const icon = newButton.querySelector('#musicIcon') || newButton;

    audio.querySelectorAll('source').forEach(source => source.remove());
    audio.removeAttribute('src');
    audio.src = 'himno-rimen.mp3';
    audio.preload = 'metadata';
    audio.loop = true;
    audio.volume = Number(volume.value || 0.7);
    audio.load();

    newButton.classList.add('rm-music-working');
    volume.oninput = () => { audio.volume = Number(volume.value || 0.7); };

    newButton.onclick = async () => {
      try{
        if(audio.paused){
          await audio.play();
          icon.textContent = '⏸';
          newButton.classList.add('playing');
        }else{
          audio.pause();
          icon.textContent = '▶';
          newButton.classList.remove('playing');
        }
      }catch(error){
        icon.textContent = '▶';
        newButton.classList.remove('playing');
        const hint = document.getElementById('rmMusicFinalHint') || document.createElement('small');
        hint.id = 'rmMusicFinalHint';
        hint.className = 'music-hint';
        hint.textContent = 'No se pudo iniciar el himno. Vuelve a tocar Reproducir.';
        if(!hint.parentNode) wrap.appendChild(hint);
      }
    };
    audio.onpause = () => { icon.textContent = '▶'; newButton.classList.remove('playing'); };
    audio.onplay = () => { icon.textContent = '⏸'; newButton.classList.add('playing'); };
  }

  async function updateVisits(){
    if(window.__RM_VISIT_RECORDED_FINAL__) return;
    window.__RM_VISIT_RECORDED_FINAL__ = true;

    const display = document.getElementById('visitorCounterNumber');
    const setCount = value => {
      if(display) display.textContent = Number(value || 0).toLocaleString('es-CL');
    };

    try{
      if(typeof initSB !== 'function' || !initSB() || !window.supabaseClient){
        throw new Error('Supabase no disponible');
      }
      const client = window.supabaseClient;
      const payload = {
        page: location.pathname || '/',
        user_agent: navigator.userAgent || '',
        created_at: new Date().toISOString()
      };

      const inserted = await client.from('site_visits').insert(payload);
      if(inserted.error) throw inserted.error;

      const result = await client.from('site_visits').select('*', {count:'exact', head:true});
      if(result.error) throw result.error;
      setCount(result.count || 0);
    }catch(error){
      const key = 'rm_visits_local_every_load';
      const localCount = Number(localStorage.getItem(key) || '0') + 1;
      localStorage.setItem(key, String(localCount));
      setCount(localCount);
    }
  }

  function applyFinalFixes(){
    hideDuplicates();
    secureFacebook();
    buildMemberForm();
    fixMusic();
    updateVisits();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(applyFinalFixes, 300);
      setTimeout(applyFinalFixes, 1800);
      setTimeout(applyFinalFixes, 4800);
    }, {once:true});
  }else{
    applyFinalFixes();
  }
  window.rmApplyFinalFunctionalFixes = applyFinalFixes;
})();
