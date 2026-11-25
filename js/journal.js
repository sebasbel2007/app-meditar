const DEFAULT_TAGS = ['Colegio', 'Familia', 'Amigos', 'Futuro', 'Cansancio', 'Redes Sociales', 'Noche', 'Insomnio'];
let selectedTags = [];
let customTags = [];
let journalVerified = false;

function getTodayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(dateStr) {
    const [year, month, day] = dateStr.split('-');
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${parseInt(day)} de ${months[parseInt(month) - 1]} de ${year}`;
}

function renderTags() {
    const cloud = document.getElementById('tags-cloud');
    cloud.innerHTML = '';

    const allTags = [...DEFAULT_TAGS, ...customTags];
    allTags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = `tag-btn ${selectedTags.includes(tag) ? 'active' : ''}`;
        btn.textContent = tag;
        btn.addEventListener('click', () => {
            if (selectedTags.includes(tag)) {
                selectedTags = selectedTags.filter(t => t !== tag);
            } else {
                selectedTags.push(tag);
            }
            renderTags();
        });
        cloud.appendChild(btn);
    });
}

async function loadJournal() {
    const today = getTodayStr();
    try {
        const entry = await api.getJournal(today);
        if (entry) {
            document.getElementById('journal-text').value = entry.text || '';
            selectedTags = entry.tags || [];
            renderTags();
        }
    } catch (e) {
        // no hay entrada hoy
    }
}

async function saveJournal() {
    const today = getTodayStr();
    const text = document.getElementById('journal-text').value;

    try {
        await api.saveJournal(today, selectedTags, text);
        showToast('Entrada guardada');
    } catch (e) {
        showToast('Error al guardar');
    }
}

async function loadHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const entries = await api.getJournals();
        entries.sort((a, b) => b.date.localeCompare(a.date));

        if (entries.length === 0) {
            list.innerHTML = '<p class="history-empty">Aún no hay entradas. ¡Escribe tu primera!</p>';
            return;
        }

        list.innerHTML = '';
        entries.forEach(entry => {
            const card = document.createElement('div');
            card.className = 'history-card';

            const tagsHtml = (entry.tags || []).map(tag => `<span class="history-tag">${tag}</span>`).join('');
            const preview = (entry.text || '').substring(0, 100);
            const hasMore = (entry.text || '').length > 100;

            card.innerHTML = `
                <div class="history-card-header">
                    <span class="history-date">${formatDateDisplay(entry.date)}</span>
                </div>
                ${tagsHtml ? `<div class="history-tags">${tagsHtml}</div>` : ''}
                <p class="history-preview">${preview}${hasMore ? '...' : ''}</p>
            `;

            card.addEventListener('click', () => {
                showEntryDetail(entry);
            });

            list.appendChild(card);
        });
    } catch (e) {
        list.innerHTML = '<p class="history-empty">Error al cargar historial</p>';
    }
}

function showEntryDetail(entry) {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';

    const tagsHtml = (entry.tags || []).map(tag => `<span class="history-tag">${tag}</span>`).join('');

    overlay.innerHTML = `
        <div class="popup-content">
            <h3>${formatDateDisplay(entry.date)}</h3>
            ${tagsHtml ? `<div class="history-tags" style="margin-bottom: 16px;">${tagsHtml}</div>` : ''}
            <p class="entry-text" style="white-space: pre-wrap; color: var(--text-primary);">${entry.text || ''}</p>
            <div class="entry-actions">
                <button class="btn-primary btn-edit-entry">Editar</button>
                <button class="btn-secondary popup-close">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.popup-close').addEventListener('click', () => {
        overlay.remove();
    });

    overlay.querySelector('.btn-edit-entry').addEventListener('click', () => {
        overlay.remove();
        editEntry(entry);
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

function editEntry(entry) {
    document.getElementById('journal-menu').style.display = 'none';
    document.getElementById('journal-history').style.display = 'none';
    document.getElementById('journal-content').style.display = 'block';
    document.getElementById('journal-date').textContent = entry.date;
    document.getElementById('journal-text').value = entry.text || '';
    selectedTags = entry.tags || [];
    renderTags();
}

function showJournalMenu() {
    document.getElementById('journal-menu').style.display = 'flex';
    document.getElementById('journal-content').style.display = 'none';
    document.getElementById('journal-history').style.display = 'none';
}

function showJournalWrite() {
    document.getElementById('journal-menu').style.display = 'none';
    document.getElementById('journal-content').style.display = 'block';
    document.getElementById('journal-history').style.display = 'none';
    document.getElementById('journal-date').textContent = getTodayStr();
    renderTags();
    loadJournal();
}

function showJournalHistory() {
    document.getElementById('journal-menu').style.display = 'none';
    document.getElementById('journal-content').style.display = 'none';
    document.getElementById('journal-history').style.display = 'block';
    loadHistory();
}

function initJournal() {
    document.getElementById('pin-input-journal').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('btn-verify-pin-journal').click();
        }
    });

    document.getElementById('btn-verify-pin-journal').addEventListener('click', async () => {
        const pin = document.getElementById('pin-input-journal').value;
        if (pin.length !== 4) {
            showToast('PIN debe tener 4 dígitos');
            return;
        }
        try {
            await api.verifyPin(pin);
            journalVerified = true;
            document.getElementById('pin-gate-journal').style.display = 'none';
            showJournalMenu();
        } catch (e) {
            showToast('PIN incorrecto');
        }
    });

    document.getElementById('btn-write-today').addEventListener('click', showJournalWrite);
    document.getElementById('btn-view-history').addEventListener('click', showJournalHistory);
    document.getElementById('btn-back-menu').addEventListener('click', showJournalMenu);
    document.getElementById('btn-back-history').addEventListener('click', showJournalMenu);

    document.getElementById('btn-add-tag').addEventListener('click', () => {
        const input = document.getElementById('custom-tag');
        const tag = input.value.trim();
        if (tag && !customTags.includes(tag) && !DEFAULT_TAGS.includes(tag)) {
            customTags.push(tag);
            input.value = '';
            renderTags();
        }
    });

    document.getElementById('btn-save-journal').addEventListener('click', saveJournal);
}
