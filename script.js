const SHEET_ID = '1o8Qlr5gVE7mhOSQUSDvabBNcopmb2ccEesZKJ0KKEKo';
const URL_REUNIOES = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Reuniões`;
const URL_REFLEXOES = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Reflexões`;
const URL_TEMATICAS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Tematicas`;

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
    
    listElement.innerHTML += `
      <li>
        <div class="meeting-info">
          ${flagImg}
          <span><strong>${meeting['Horário de Início']}${endTimeStr}</strong> - ${meeting['Nome da Reunião']}</span>
        </div>
        <a href="${meeting['Link da Reunião']}" target="_blank">Acessar Sala</a>
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

  data.forEach(item => {
    if (!item['Título']) return; 

    container.innerHTML += `
      <div class="thematic-card">
        <img src="${item['Imagem']}" alt="${item['Título']}">
        <h3>${item['Título']}</h3>
        <p><strong>Data:</strong> ${item['Data']}</p>
        <p><strong>Hora:</strong> ${item['Hora']}</p>
        <a href="${item['Link']}" target="_blank">Saiba mais</a>
      </div>
    `;
  });
}

init();