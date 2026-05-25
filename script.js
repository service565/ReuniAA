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

function init() {
  Papa.parse(URL_REFLEXOES, {
    download: true,
    header: true,
    complete: function(results) {
      displayDailyReflection(results.data);
    }
  });

  Papa.parse(URL_REUNIOES, {
    download: true,
    header: true,
    complete: function(results) {
      dailyMeetingsData = results.data;
      applyFilter('PT');
    }
  });

  Papa.parse(URL_TEMATICAS, {
    download: true,
    header: true,
    complete: function(results) {
      loadThematicMeetings(results.data);
    }
  });
}

function displayDailyReflection(reflections) {
  const container = document.getElementById('daily-reflection');
  
  const todayRef = reflections.find(r => 
    r.Dia === currentDayStr && 
    r.Mês && r.Mês.trim().toLowerCase() === currentMonthName.toLowerCase()
  );

  if (todayRef) {
    const formattedText = todayRef.Texto.replace(/(ALCOÓLICOS ANÔNIMOS,\s*p\.?\s*\d+)/gi, '$1<br><br>');
    
    container.innerHTML = `
      <p><strong>${todayRef.Dia} de ${todayRef.Mês.trim()} - ${todayRef.Título}</strong></p>
      <p>${formattedText}</p>
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

    const meetingDays = meeting['Dia da Semana'] || '';
    const isToday = meetingDays.includes('Todos os dias') || 
                    meetingDays.includes(currentDayName) || 
                    meetingDays.includes(currentShortDayName);
    if (!isToday) return false;

    const lang = meeting['Idioma'] || '';
    const langCode = lang.toLowerCase().includes('inglês') || lang.toLowerCase().includes('english') ? 'EN' : 'PT';
    if (currentLangFilter !== 'ALL' && langCode !== currentLangFilter) return false;

    const timeStr = meeting['Horário de Início'];
    if (!timeStr) return false;
    
    const [mHour, mMinute] = timeStr.split(':').map(Number);
    if (mHour < currentHour) return false;
    if (mHour === currentHour && mMinute < currentMinute) return false;

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
    const isEnglish = meeting['Idioma'].toLowerCase().includes('inglês') || meeting['Idioma'].toLowerCase().includes('english');
    const flagImg = isEnglish ? '<img src="https://flagcdn.com/w20/gb.png" alt="UK" class="flag-icon">' : '<img src="https://flagcdn.com/w20/br.png" alt="BR" class="flag-icon">';
    const endTimeStr = meeting['Horário de Término'] ? ` às ${meeting['Horário de Término']}` : '';
    
    const notes = meeting['Anotações'] || '';
    let passwordHtml = '';
    if (notes.toLowerCase().includes('senha')) {
      passwordHtml = `<div class="meeting-password">${notes}</div>`;
    }
    
    // Processamento da tag condicional baseada no dia atual
    const rawAudience = meeting['Público'] ? meeting['Público'].trim() : '';
    let audienceHtml = '';
    
    if (rawAudience) {
      if (rawAudience.includes('/')) {
        const parts = rawAudience.split('/');
        const labelText = parts[0].trim();
        const conditionText = parts[1].trim().toLowerCase();
        
        // Mapeamento de termos comuns para o dia atual da semana
        const dayCheck = currentDayName.toLowerCase(); // ex: "segunda", "terça"
        
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
        // Se não houver barra, a tag aparece sempre que a reunião for listada
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

function loadThematicMeetings(data) {
  const container = document.getElementById('thematic-meetings-list');
  container.innerHTML = '';
  
  if (!data || data.length === 0) return;

  const currentDateTime = new Date();

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
    
    const detailsText = `Facilitador: ${item['Facilitador(a)'] || 'Não informado'}\nGrupo: ${item['Grupo'] || 'Não informado'}\nLink da reunião: ${item['Link']}`;
    const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(item['Título'])}&dates=${startIso}/${endIso}&details=${encodeURIComponent(detailsText)}&ctz=America/Sao_Paulo`;

    container.innerHTML += `
      <div class="thematic-card">
        <img src="${item['Imagem']}" alt="${item['Título']}" onerror="this.src='https://via.placeholder.com/300x150?text=Imagem+Indispon%C3%ADvel'">
        <div class="thematic-details">
          <div>
            <h3>${item['Título']}</h3>
            <p><strong>Facilitador(a):</strong> ${item['Facilitador(a)'] || 'Não informado'}</p>
            <p><strong>Data:</strong> ${item['Data']}</p>
            <p><strong>Hora:</strong> ${item['Hora']}</p>
            <p><strong>Grupo:</strong> ${item['Grupo'] || 'Não informado'}</p>
          </div>
          <div class="thematic-actions">
            <a href="${item['Link']}" target="_blank" class="btn-action btn-meeting-link">Link</a>
            <a href="${calendarLink}" target="_blank" class="btn-action btn-calendar-link">Lembrete na Agenda</a>
          </div>
        </div>
      </div>
    `;
  });
}

init();
