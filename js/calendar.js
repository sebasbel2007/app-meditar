let currentDate = new Date();
let summariesVerified = false;
let checkinData = {};

const EMOJI_MAP = {
    1: 'img/emociones/enojado.png',
    2: 'img/emociones/llorando.png',
    3: 'img/emociones/triste.png',
    4: 'img/emociones/cara neutral.png',
    5: 'img/emociones/feliz.png'
};

const EMOJI_LABELS = {
    1: 'Enojado',
    2: 'Llorando',
    3: 'Triste',
    4: 'Neutral',
    5: 'Feliz'
};

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

function formatDate(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    document.getElementById('month-year').textContent = `${MONTH_NAMES[month]} ${year}`;

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDate(year, month, day);
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;

        if (dateStr === todayStr) {
            dayEl.classList.add('today');
        }

        if (checkinData[dateStr]) {
            dayEl.classList.add('has-data');
            const img = document.createElement('img');
            img.src = EMOJI_MAP[checkinData[dateStr].avg];
            img.alt = EMOJI_LABELS[checkinData[dateStr].avg];
            img.className = 'calendar-emoji';
            dayEl.textContent = '';
            dayEl.appendChild(img);
        }

        dayEl.addEventListener('click', () => showDaySummary(dateStr));
        grid.appendChild(dayEl);
    }
}

async function loadCheckins() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = formatDate(year, month, 1);
    const endDate = formatDate(year, month, getDaysInMonth(year, month));

    try {
        const checkins = await api.getCheckins(startDate, endDate);
        checkinData = {};

        const dayGroups = {};
        checkins.forEach(c => {
            if (!dayGroups[c.date]) dayGroups[c.date] = [];
            dayGroups[c.date].push(c.energyLevel);
        });

        for (const [date, levels] of Object.entries(dayGroups)) {
            const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
            checkinData[date] = { avg: Math.ceil(avg), count: levels.length };
        }

        renderCalendar();
        updateMetrics(checkins);
    } catch (e) {
        // sin datos
    }
}

async function refreshCheckins() {
    await loadCheckins();
}

function updateMetrics(checkins) {
    const controlCount = checkins.length;
    document.getElementById('metric-control').textContent = controlCount;

    api.getBreathingSessions().then(sessions => {
        const totalMinutes = Math.floor(sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0) / 60);
        document.getElementById('metric-time').textContent = totalMinutes;
    }).catch(() => {
        document.getElementById('metric-time').textContent = '0';
    });
}

function showDaySummary(dateStr) {
    const data = checkinData[dateStr];
    const dayCheckins = data ? data.count : 0;
    const dayAvg = data ? data.avg : null;

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.innerHTML = `
        <div class="popup-content day-summary-popup">
            <div class="day-summary-emoji">
                ${dayAvg ? `<img src="${EMOJI_MAP[dayAvg]}" alt="${EMOJI_LABELS[dayAvg]}" class="day-summary-img">` : ''}
            </div>
            <div class="day-summary-info">
                <h3>${formatDateDisplay(dateStr)}</h3>
                <div class="day-summary-row">
                    <span class="day-summary-label">Estado de ánimo:</span>
                    <span class="day-summary-value">${dayAvg ? EMOJI_LABELS[dayAvg] : 'Sin datos'}</span>
                </div>
                <div class="day-summary-row">
                    <span class="day-summary-label">Registros:</span>
                    <span class="day-summary-value">${dayCheckins}</span>
                </div>
            </div>
            <button class="btn-secondary popup-close">Cerrar</button>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.popup-close').addEventListener('click', () => {
        overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

function formatDateDisplay(dateStr) {
    const [year, month, day] = dateStr.split('-');
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${parseInt(day)} de ${months[parseInt(month) - 1]} de ${year}`;
}

function initCalendar() {
    document.getElementById('pin-input-summaries').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('btn-verify-pin-summaries').click();
        }
    });

    document.getElementById('btn-verify-pin-summaries').addEventListener('click', async () => {
        const pin = document.getElementById('pin-input-summaries').value;
        if (pin.length !== 4) {
            showToast('PIN debe tener 4 dígitos');
            return;
        }
        try {
            await api.verifyPin(pin);
            playSuccess();
            summariesVerified = true;
            document.getElementById('pin-gate-summaries').style.display = 'none';
            document.getElementById('calendar-section').style.display = 'block';
            loadCheckins();
        } catch (e) {
            showToast('PIN incorrecto');
        }
    });

    document.getElementById('btn-prev-month').addEventListener('click', () => {
        playClick();
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
        loadCheckins();
    });

    document.getElementById('btn-next-month').addEventListener('click', () => {
        playClick();
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
        loadCheckins();
    });
}
