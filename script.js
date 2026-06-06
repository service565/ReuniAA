const SHEET_ID = '1o8Qlr5gVE7mhOSQUSDvabBNcopmb2ccEesZKJ0KKEKo';
const noCache = Math.floor(Math.random() * 1000000);

const URL_REUNIOES = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Reuniões&nocache=${noCache}`;
const URL_REFLEXOES = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Reflexões&nocache=${noCache}`;
const URL_TEMATICAS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Tematicas&nocache=${noCache}`;

let dailyMeetingsData = [];
let currentFilteredMeetings = [];
let currentPage = 1;
const itemsPerPage = 12;
let currentLangFilter = 'PT';

const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const shortDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const now = new Date();
const currentDayOfWeek = now.getDay();
const currentDayName = daysOfWeek[currentDayOfWeek];
const currentShortDayName = shortDays[currentDayOfWeek];
const currentDayStr = now.getDate().toString();
const currentMonthName = months[now.getMonth()];
const currentHour = now.getHours();
const currentMinute = now.getMinutes();

let currentSpeech = null;

const shareIconSVG = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`;

function installApp() {
  alert('Para adicionar um atalho na tela inicial:\n\n📱 NO IPHONE (Safari):\nToque no botão de "Compartilhar" (quadrado com seta para cima) na barra inferior e escolha "Adicionar à Tela de Início".\n\n🤖 NO ANDROID (Chrome):\nToque nos 3 pontos no canto superior direito e escolha "Adicionar à tela inicial".');
}

function init() {
  Papa.parse(URL_REFLEXOES, { download: true, header: true, complete: function(results) { displayDailyReflection(results.data); } });
  Papa.parse(URL_REUNIOES, { download: true, header: true, complete: function(results) { dailyMeetingsData = results.data; applyFilter('PT'); } });
  Papa.parse(URL_TEMATICAS, { download: true, header: true, complete: function(results) { loadThematicMeetings(results.data); } });
}

function invokeShare(data) {
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(data.title + '\n\n' + data.text + '\n\n' + data.url)}`;
  window.open(waUrl, '_blank');
}

function sharePage() {
  invokeShare({ title: 'Reuniões de AA Hoje', text: 'Encontre reuniões online de AA, reflexões diárias e grupos temáticos.', url: window.location.href });
}

function shareReflectionEncoded(encodedData) {
  try {
    const data = JSON.parse(decodeURIComponent(encodedData));
    invokeShare({ title: 'Reflexão Diária - AA', text: `*${data.title}*\n\n${data.text}`, url: window.location.href });
  } catch (e) { console.error("Erro ao compartilhar reflexão:", e); }
}

function shareThematicEncoded(encodedData) {
  try {
    const item = JSON.parse(decodeURIComponent(encodedData));
    let shareText = `*${item.title}*\n\n📅 Data: ${item.date}\n⏰ Hora: ${item.time}\n🗣 Facilitador: ${item.facilitator}\n👥 Grupo: ${item.group}\n\n🔗 Link da sala: ${item.link}`;
    if (item.image) shareText += `\n🖼️ Imagem: ${item.image}`;
    invokeShare({ title: `Reunião Temática: ${item.title}`, text: shareText, url: window.location.href });
  } catch (e) { console.error("Erro ao compartilhar temática:", e); }
}

function speakTextEncoded(encodedText) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const text = decodeURIComponent(encodedText);
    currentSpeech = new SpeechSynthesisUtterance(text);
    currentSpeech.lang = 'pt-BR';
    window.speechSynthesis.speak(currentSpeech);
  } else {
    alert("Seu navegador não suporta leitura em voz alta.");
  }
}

function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function displayDailyReflection(reflections) {
  const container = document.getElementById('daily-reflection');
  const todayRef = reflections.find(r => r.Dia === currentDayStr && r.Mês && r.Mês.trim().toLowerCase() === currentMonthName.toLowerCase());

  if (todayRef) {
    let text = todayRef.Texto;
    text = text.replace(/COMO BILL VÊ\s*(IT)?/gi, "NA OPINIÃO DE BILL");
    const citationRegex = /((ALCOÓLICOS ANÔNIMOS|DOZE PASSOS E DOZE TRADIÇÕES|NA OPINIÃO DE BILL|VIVER SÓBRIO|REFLEXÕES DIÁRIAS)[^.]+?p\.?\s*\d+)/i;
    let formattedText = text.replace(citationRegex, '$1<br><br>');
    const titleText = `${todayRef.Dia} de ${todayRef.Mês.trim()} - ${todayRef.Título}`;
    const cleanContentForShare = formattedText.replace(/<[^>]*>?/gm, '');

    let videoHtml = '';
    if (todayRef['Meditação']) {
      let videoLink = todayRef['Meditação'].trim();
      if (videoLink.includes('youtube.com/watch?v=')) videoLink = videoLink.replace('watch?v=', 'embed/').split('&')[0];
      else if (videoLink.includes('youtu.be/')) videoLink = videoLink.replace('youtu.be/', 'youtube.com/embed/').split('?')[0];
      videoHtml = `<hr class="meditation-divider"><h3 class="meditation-title">Meditação</h3><div class="video-responsive"><iframe src="${videoLink}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }

    container.innerHTML = `
      <div class="reflection-actions">
        <button class="btn-reflection" onclick="speakTextEncoded('${encodeURIComponent(`${titleText}. ${cleanContentForShare}`)}')">🔊 Ouvir</button>
        <button class="btn-reflection" onclick="stopSpeaking()">⏹ Parar</button>
        <button class="btn-share-icon-circle" title="Compartilhar" onclick="shareReflectionEncoded('${encodeURIComponent(JSON.stringify({ title: titleText, text: cleanContentForShare }))}')">${shareIconSVG}</button>
      </div>
      <p><strong>${titleText}</strong></p>
      <p>${formattedText}</p>
      ${videoHtml}
    `;
  } else {
    container.innerHTML = `<p>Reflexão do dia não encontrada.</p>`;
  }
}

function applyFilter(langFilter) {
  currentLangFilter = langFilter;
  currentPage = 1;
  currentFilteredMeetings = dailyMeetingsData.filter(meeting => {
    if (!meeting['Nome da Reunião']) return false;
    const meetingDays = (meeting['Dia da Semana'] || '').toLowerCase();
    const todayLower = currentDayName.toLowerCase();
    const shortTodayLower = currentShortDayName.toLowerCase();
    const isToday = meetingDays.includes('todos os dias') || meetingDays.includes(todayLower) || meetingDays.includes(shortTodayLower) || (meetingDays.includes('seg a sex') && ['segunda', 'terça', 'quarta', 'quinta', 'sexta'].includes(todayLower));
    if (!isToday) return false;
    
    const timeStr = meeting['Horário de Início'];
    if (!timeStr) return false;
    const [mHour, mMinute] = timeStr.split(':').map(Number);
    let endHour = mHour + 1;
    let endMinute = mMinute;
    if (meeting['Horário de Término']) {
      const parsedEnd = meeting['Horário de Término'].split(':').map(Number);
      if (parsedEnd.length === 2 && !isNaN(parsedEnd[0])) { endHour = parsedEnd[0]; endMinute = parsedEnd[1]; }
    }
    const currentMins = currentHour * 60 + currentMinute;
    let endMins = endHour * 60 + endMinute;
    if (endMins <= (mHour * 60 + mMinute)) endMins += 24 * 60;
    return currentMins < endMins;
  }).sort((a, b) => a['Horário de Início'].localeCompare(b['Horário de Início']));
  renderPage();
}

function renderPage() {
  const listElement = document.getElementById('meetings-list');
  const paginationControls = document.getElementById('pagination-controls');
  listElement.innerHTML = '';
  paginationControls.innerHTML = '';
  if (currentFilteredMeetings.length === 0) { listElement.innerHTML = '<li>Nenhuma reunião restante para o dia de hoje.</li>'; return; }
  const pageItems = currentFilteredMeetings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  pageItems.forEach(meeting => {
    listElement.innerHTML += `<li><div class="meeting-info"><strong>${meeting['Horário de Início']}</strong> - ${meeting['Nome da Reunião']}</div><a href="${meeting['Link da Reunião']}" target="_blank" class="btn-join">Acessar Sala</a></li>`;
  });
  renderPagination();
}

function renderPagination() {
  const totalPages = Math.ceil(currentFilteredMeetings.length / itemsPerPage);
  if (totalPages <= 1) return;
  document.getElementById('pagination-controls').innerHTML = `<button onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button><span>Pág ${currentPage}/${totalPages}</span><button onclick="changePage(1)" ${currentPage === totalPages ? 'disabled' : ''}>Próxima</button>`;
}

function changePage(direction) { currentPage += direction; renderPage(); }

function loadThematicMeetings(data) {
  const container = document.getElementById('thematic-meetings-list');
  container.innerHTML = '';
  const processed = data.map(i => ({...i, d: new Date(i['Data'].split('/')[2], i['Data'].split('/')[1]-1, i['Data'].split('/')[0], i['Hora'].split(':')[0], i['Hora'].split(':')[1])})).filter(i => i.d >= new Date()).sort((a, b) => a.d - b.d);
  processed.forEach(item => {
    container.innerHTML += `<div class="thematic-card"><h3>${item['Título']}</h3><p>Facilitador: ${item['Facilitador(a)']}</p><a href="${item['Link']}" target="_blank" class="btn-action btn-meeting-link">Acessar Sala</a></div>`;
  });
}

init();
