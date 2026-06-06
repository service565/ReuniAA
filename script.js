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
  Papa.parse(URL_REFLEXOES, {
    download: true,
    header: true,
    complete: function(results) {
      displayDailyReflection(results.data);
    },
    error: function(err) {
      console.error("Erro ao carregar reflexões:", err);
      const container = document.getElementById('daily-reflection');
      if (container) container.innerHTML = '<p>Não foi possível carregar a reflexão do dia. Verifique sua conexão.</p>';
    }
  });

  Papa.parse(URL_REUNIOES, {
    download: true,
    header: true,
    complete: function(results) {
      dailyMeetingsData = results.data;
      applyFilter('PT');
    },
    error: function(err) {
      console.error("Erro ao carregar reuniões:", err);
      const listElement = document.getElementById('meetings-list');
      if (listElement) listElement.innerHTML = '<li>Não foi possível carregar as reuniões. Verifique sua conexão.</li>';
    }
  });

  Papa.parse(URL_TEMATICAS, {
    download: true,
    header: true,
    complete: function(results) {
      loadThematicMeetings(results.data);
    },
    error: function(err) {
      console.error("Erro ao carregar temáticas:", err);
      const container = document.getElementById('thematic-meetings-list');
      if (container) container.innerHTML = '<p>Não foi possível carregar as reuniões temáticas. Verifique sua conexão.</p>';
    }
  });
}

function invokeShare(data) {
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(data.title + '\n\n' + data.text + '\n\n' + data.url)}`;
  window.open(waUrl, '_blank');
}

function sharePage() {
  invokeShare({
    title: 'Reuniões de AA Hoje',
    text: 'Encontre reuniões online de AA, reflexões diárias e grupos temáticos.',
    url: window.location.href
  });
}

function shareReflectionEncoded(encodedData) {
  try {
    const data = JSON.parse(decodeURIComponent(encodedData));
    invokeShare({
      title: 'Reflexão Diária - AA',
      text: `*${data.title}*\n\n${data.text}`,
      url: window.location.href
    });
  } catch (e) {
    console.error("Erro ao compartilhar reflexão:", e);
  }
}

function shareThematicEncoded(encodedData) {
  try {
    const item = JSON.parse(decodeURIComponent(encodedData));
    
    let shareText = `*${item.title}*\n\n📅 Data: ${item.date}\n⏰ Hora: ${item.time}\n🗣 Facilitador: ${item.facilitator}\n👥 Grupo: ${item.group}\n\n🔗 Link da sala: ${item.link}`;
    
    if (item.image) {
      shareText += `\n🖼️ Imagem: ${item.image}`;
    }
    
    let shareData = {
      title: `Reunião Temática: ${item.title}`,
      text: shareText,
      url: window.location.href
    };

    invokeShare(shareData);

  } catch (e) {
    console.error("Erro ao compartilhar temática:", e);
  }
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
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function displayDailyReflection(reflections) {
  const container = document.getElementById('daily-reflection');
  
  const todayRef = reflections.find(r => 
    r.Dia === currentDayStr && 
    r.Mês && r.Mês.trim().toLowerCase() === currentMonthName.toLowerCase()
  );

  if (todayRef) {
    let text = todayRef.Texto;
    text = text.replace(/COMO BILL VÊ\s*(IT)?/gi, "NA OPINIÃO DE BILL");

    const citationRegex = /((ALCOÓLICOS ANÔNIMOS|DOZE PASSOS E DOZE TRADIÇÕES|NA OPINIÃO DE BILL|VIVER SÓBRIO|REFLEXÕES DIÁRIAS)[^.]+?p\.?\s*\d+)/i;

    let formattedText = text;
    if (citationRegex.test(text)) {
      formattedText = text.replace(citationRegex, '$1<br><br>');
    } else {
      const bookIsolatedRegex = /^(ALCOÓLICOS ANÔNIMOS|DOZE PASSOS E DOZE TRADIÇÕES|NA OPINIÃO DE BILL|VIVER SÓBRIO|REFLEXÕES DIÁRIAS)/i;
      formattedText = text.replace(bookIsolatedRegex, '$1<br><br>');
    }
    
    const titleText = `${todayRef.Dia} de ${todayRef.Mês.trim()} - ${todayRef.Título}`;
    const cleanContentForShare = formattedText.replace(/<[^>]*>?/gm, '');

    const textToSpeakEncoded = encodeURIComponent(`${titleText}. ${cleanContentForShare}`);
    const shareDataEncoded = encodeURIComponent(JSON.stringify({ title: titleText, text: cleanContentForShare }));

    let videoHtml = '';
    if (todayRef['Meditação']) {
      let videoLink = todayRef['Meditação'].trim();
      
      if (videoLink.includes('youtube.com/watch?v=')) {
         videoLink = videoLink.replace('watch?v=', 'embed/');
         if (videoLink.includes('&')) videoLink = videoLink.split('&')[0];
      } else if (videoLink.includes('youtu.be/')) {
         videoLink = videoLink.replace('youtu.be/', 'youtube.com/embed/');
         if (videoLink.includes('?')) videoLink = videoLink.split('?')[0];
      }

      videoHtml = `
        <hr class="meditation-divider">
        <h3 class="meditation-title">Meditação</h3>
        <div class="video-responsive">
          <iframe src="${videoLink}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="reflection-actions">
        <button class="btn-reflection" onclick="speakTextEncoded('${textToSpeakEncoded}')">🔊 Ouvir</button>
        <button class="btn-reflection" onclick="stopSpeaking()">⏹ Parar</button>
        <button class="btn-share-icon-circle" title="Compartilhar" onclick="shareReflectionEncoded('${shareDataEncoded}')">
          ${shareIconSVG}
        </button>
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

  // Recalcula hora atual a cada filtragem para não congelar após horas de uso
  const nowFilter = new Date();
  const currentHour = nowFilter.getHours();
  const currentMinute = nowFilter.getMinutes();

  currentFilteredMeetings = dailyMeetingsData.filter(meeting => {
    if (!meeting['Nome da Reunião']) return false;

    const meetingDays = meeting['Dia da Semana'] || '';
    const isToday = meetingDays.includes('Todos os dias') || 
                    meetingDays.includes(currentDayName) || 
                    meetingDays.includes(currentShortDayName);
    if (!isToday) return false;

    const lang = (meeting['Idioma'] || '').toLowerCase();
    let langCode = 'PT';
    if (lang.includes('inglês') || lang.includes('english') || lang === 'en') {
      langCode = 'EN';
    } else if (lang.includes('espanhol') || lang.includes('español') || lang === 'es') {
      langCode = 'ES';
    }

    if (currentLangFilter !== 'ALL' && langCode !== currentLangFilter) return false;

    const timeStr = meeting['Horário de Início'];
    if (!timeStr) return false;
    
    const [mHour, mMinute] = timeStr.split(':').map(Number);
    let endHour = mHour + 1; // Duração padrão de 1h se não especificado
    let endMinute = mMinute;

    if (meeting['Horário de Término']) {
      const parsedEnd = meeting['Horário de Término'].split(':').map(Number);
      if (parsedEnd.length === 2 && !isNaN(parsedEnd[0])) {
        endHour = parsedEnd[0];
        endMinute = parsedEnd[1];
      }
    }

    const currentMins = currentHour * 60 + currentMinute;
    const startMins = mHour * 60 + mMinute;
    let endMins = endHour * 60 + endMinute;

    // Se a reunião virar a meia-noite (ex: 23:00 às 01:00)
    if (endMins <= startMins) {
      endMins += 24 * 60;
    }

    // Apenas oculta a reunião se o horário atual já ultrapassou o término
    if (currentMins >= endMins) return false;

    return true;
  });

  currentFilteredMeetings.sort((a, b) => {
    return a['Horário de Início'].localeCompare(b['Horário de Início']);
  });

  renderPage();
}

function renderPage() {
  const listElement = document.getElementById('meetings-list');
  const paginationControls = document.getElementById('pagination-controls');
  listElement.innerHTML = '';
  paginationControls.innerHTML = '';

  if (currentFilteredMeetings.length === 0) {
    listElement.innerHTML = '<li>Nenhuma reunião restante para o dia de hoje neste idioma.</li>';
    return;
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = currentFilteredMeetings.slice(startIndex, endIndex);

  pageItems.forEach(meeting => {
    const langStr = (meeting['Idioma'] || '').toLowerCase();
    let flagImg = '<img src="https://flagcdn.com/w20/br.png" alt="BR" class="flag-icon">';
    if (langStr.includes('inglês') || langStr.includes('english') || langStr === 'en') {
      flagImg = '<img src="https://flagcdn.com/w20/gb.png" alt="UK" class="flag-icon">';
    } else if (langStr.includes('espanhol') || langStr.includes('español') || langStr === 'es') {
      flagImg = '<img src="https://flagcdn.com/w20/es.png" alt="ES" class="flag-icon">';
    }

    const endTimeStr = meeting['Horário de Término'] ? ` às ${meeting['Horário de Término']}` : '';
    
    const notes = meeting['Anotações'] || '';
    let passwordHtml = '';
    if (notes.toLowerCase().includes('senha')) {
      passwordHtml = `<div class="meeting-password">${notes}</div>`;
    }
    
    const rawAudience = meeting['Público'] ? meeting['Público'].trim() : '';
    let audienceHtml = '';
    
    if (rawAudience) {
      if (rawAudience.includes('/')) {
        const parts = rawAudience.split('/');
        const labelText = parts[0].trim();
        const conditionText = parts[1].trim().toLowerCase();
        
        const dayCheck = currentDayName.toLowerCase(); 
        
        const shouldShowTag = conditionText.includes('sempre') || 
                              conditionText.includes('todos os dias') || 
                              conditionText.includes(dayCheck) ||
                              (dayCheck === 'segunda' && conditionText.includes('seg')) ||
                              (dayCheck === 'terça' && conditionText.includes('ter')) ||
                              (dayCheck === 'quarta' && conditionText.includes('qua')) ||
                              (dayCheck === 'quinta' && conditionText.includes('qui')) ||
                              (dayCheck === 'sexta' && conditionText.includes('sex')) ||
                              (dayCheck === 'sábado' && conditionText.includes('sáb')) ||
                              (dayCheck === 'domingo' && conditionText.includes('dom'));

        if (shouldShowTag) {
          audienceHtml = `<span class="audience-label">${labelText}</span>`;
        }
      } else {
        audienceHtml = `<span class="audience-label">${rawAudience}</span>`;
      }
    }
    
    listElement.innerHTML += `
      <li>
        <div class="meeting-info">
          ${flagImg}
          <div class="meeting-text-container">
            <div class="meeting-title-line">
              <span><strong>${meeting['Horário de Início']}${endTimeStr}</strong> - ${meeting['Nome da Reunião']}</span>
              ${audienceHtml}
            </div>
            ${passwordHtml}
          </div>
        </div>
        <a href="${meeting['Link da Reunião']}" target="_blank" class="btn-join">Acessar Sala</a>
      </li>
    `;
  });

  renderPagination();
}

function renderPagination() {
  const totalPages = Math.ceil(currentFilteredMeetings.length / itemsPerPage);
  const paginationControls = document.getElementById('pagination-controls');
  
  if (totalPages <= 1) return;

  paginationControls.innerHTML = `
    <button onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
    <span>Página ${currentPage} de ${totalPages}</span>
    <button onclick="changePage(1)" ${currentPage === totalPages ? 'disabled' : ''}>Próxima</button>
  `;
}

function changePage(direction) {
  currentPage += direction;
  renderPage();
}

function loadThematicMeetings(data) {
  const container = document.getElementById('thematic-meetings-list');
  container.innerHTML = '';
  
  if (!data || data.length === 0) return;

  const currentDateTime = new Date();
  const todayMidnight = new Date(currentDateTime.getFullYear(), currentDateTime.getMonth(), currentDateTime.getDate()).getTime();
  const tomorrowMidnight = new Date(currentDateTime.getFullYear(), currentDateTime.getMonth(), currentDateTime.getDate() + 1).getTime();

  const processedMeetings = data.map(item => {
    if (!item['Título'] || !item['Data'] || !item['Hora']) return null;
    
    const dateParts = item['Data'].split('/');
    const timeParts = item['Hora'].split(':');
    
    if (dateParts.length === 3 && timeParts.length >= 2) {
      const yyyy = parseInt(dateParts[2].trim());
      const mm = parseInt(dateParts[1].trim()) - 1; 
      const dd = parseInt(dateParts[0].trim());
      const hh = parseInt(timeParts[0].trim());
      const min = parseInt(timeParts[1].trim());
      
      const meetingDate = new Date(yyyy, mm, dd, hh, min);
      return { ...item, meetingDate };
    }
    return null;
  })
  .filter(item => item !== null && item.meetingDate >= currentDateTime)
  .sort((a, b) => a.meetingDate - b.meetingDate);

  if (processedMeetings.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #7f8c8d;">Nenhuma reunião temática agendada para os próximos dias.</p>';
    return;
  }

  processedMeetings.forEach(item => {
    const yyyy = item.meetingDate.getFullYear();
    const mm = String(item.meetingDate.getMonth() + 1).padStart(2, '0');
    const dd = String(item.meetingDate.getDate()).padStart(2, '0');
    const hh = String(item.meetingDate.getHours()).padStart(2, '0');
    const min = String(item.meetingDate.getMinutes()).padStart(2, '0');
    
    const startIso = `${yyyy}${mm}${dd}T${hh}${min}00`;
    const endHourComputed = String((item.meetingDate.getHours() + 1) % 24).padStart(2, '0');
    const endIso = `${yyyy}${mm}${dd}T${endHourComputed}${min}00`;
    
    const meetingMidnight = new Date(yyyy, item.meetingDate.getMonth(), item.meetingDate.getDate()).getTime();
    let dateTagHtml = '';
    
    if (meetingMidnight === todayMidnight) {
      dateTagHtml = '<span class="thematic-tag thematic-tag-hoje">Hoje</span>';
    } else if (meetingMidnight === tomorrowMidnight) {
      dateTagHtml = '<span class="thematic-tag thematic-tag-amanha">Amanhã</span>';
    }
    
    const detailsText = `Facilitador: ${item['Facilitador(a)'] || 'Não informado'}\nGrupo: ${item['Grupo'] || 'Não informado'}\nLink da reunião: ${item['Link']}`;
    const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(item['Título'])}&dates=${startIso}/${endIso}&details=${encodeURIComponent(detailsText)}&ctz=America/Sao_Paulo`;

    const shareDataEncoded = encodeURIComponent(JSON.stringify({
      title: item['Título'] || '',
      date: item['Data'] || '',
      time: item['Hora'] || '',
      facilitator: item['Facilitador(a)'] || 'Não informado',
      group: item['Grupo'] || 'Não informado',
      link: item['Link'] || '',
      image: item['Imagem'] || ''
    }));

    container.innerHTML += `
      <div class="thematic-card">
        <img src="${item['Imagem']}" alt="${item['Título']}" onerror="this.src='https://via.placeholder.com/300x150?text=Imagem+Indispon%C3%ADvel'">
        <div class="thematic-details">
          <div>
            <div class="thematic-header-line">
              <h3>${item['Título']} ${dateTagHtml}</h3>
              <button onclick="shareThematicEncoded('${shareDataEncoded}')" class="btn-share-icon-circle" title="Compartilhar">
                ${shareIconSVG}
              </button>
            </div>
            <p><strong>Facilitador(a):</strong> ${item['Facilitador(a)'] || 'Não informado'}</p>
            <p><strong>Data:</strong> ${item['Data']}</p>
            <p><strong>Hora:</strong> ${item['Hora']}</p>
            <p><strong>Grupo:</strong> ${item['Grupo'] || 'Não informado'}</p>
          </div>
          <div class="thematic-actions">
            <a href="${item['Link']}" target="_blank" class="btn-action btn-meeting-link">Acessar Sala</a>
            <a href="${calendarLink}" target="_blank" class="btn-action btn-calendar-link">Lembrete na Agenda</a>
          </div>
        </div>
      </div>
    `;
  });
}

init();
