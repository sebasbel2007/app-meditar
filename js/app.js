document.addEventListener('DOMContentLoaded', () => {
    initAudio();
    initAuth();
    initTheme();
    initBreathing();
    initJournal();
    initCalendar();
    initSos();
    initSettings();
    initNavigation();
    initRegistro();
    initOfflineDetection();
    initFondo();

    if (isLoggedIn()) {
        onLoginSuccess();
    } else {
        showScreen('screen-login');
    }
});

function initOfflineDetection() {
    window.addEventListener('offline', () => {
        showToast('Sin internet. Las respiraciones funcionan pero no se guardará nada.');
    });

    window.addEventListener('online', () => {
        showToast('Conexión restaurada.');
    });
}

function initFondo() {
    const startOnInteraction = () => {
        startFondo();
        document.removeEventListener('click', startOnInteraction);
        document.removeEventListener('touchstart', startOnInteraction);
    };
    document.addEventListener('click', startOnInteraction);
    document.addEventListener('touchstart', startOnInteraction);
}

function startFondoAfterLogin() {
    setTimeout(() => {
        startFondo();
    }, 500);
}

function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            playClick();
            const screen = item.dataset.screen;
            showScreen(`screen-${screen}`);

            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            if (screen === 'summaries' && !summariesVerified) {
                document.getElementById('pin-gate-summaries').style.display = 'flex';
                document.getElementById('calendar-section').style.display = 'none';
            }
            if (screen === 'journal' && !journalVerified) {
                document.getElementById('pin-gate-journal').style.display = 'flex';
                document.getElementById('journal-content').style.display = 'none';
            }
        });
    });
}

function initRegistro() {
    const slider = document.getElementById('energy-slider');
    const emojiText = document.getElementById('emoji-text');
    const saveBtn = document.getElementById('btn-save-registro');

    const emotions = {
        1: { label: 'Enojado', img: 'img/emociones/enojado.png' },
        2: { label: 'Llorando', img: 'img/emociones/llorando.png' },
        3: { label: 'Triste', img: 'img/emociones/triste.png' },
        4: { label: 'Neutral', img: 'img/emociones/cara neutral.png' },
        5: { label: 'Feliz', img: 'img/emociones/feliz.png' }
    };

    function updateEmotionDisplay(value) {
        const emotion = emotions[value];
        emojiText.innerHTML = `<img src="${emotion.img}" alt="${emotion.label}" class="emotion-icon"> <span>${emotion.label}</span>`;
    }

    slider.addEventListener('input', () => {
        updateEmotionDisplay(slider.value);
        saveBtn.style.display = 'block';
    });

    updateEmotionDisplay(3);

    saveBtn.addEventListener('click', async () => {
        const energyLevel = parseInt(slider.value);
        try {
            await api.saveCheckin(energyLevel);
            localStorage.setItem('last_emotion', energyLevel);
            playSuccess();
            showToast('Registro guardado');
            saveBtn.style.display = 'none';
            slider.value = 3;
            updateEmotionDisplay(3);
            if (typeof refreshCheckins === 'function') {
                refreshCheckins();
            }
        } catch (e) {
            showToast('Error al guardar');
        }
    });
}
