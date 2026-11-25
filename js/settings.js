let audioFondo = null;
let audioInhalar = null;
let audioSosten = null;
let audioExhalar = null;
let isFondoPlaying = false;

function initAudio() {
    audioFondo = document.getElementById('audio-fondo');
    audioInhalar = document.getElementById('audio-inhalar');
    audioSosten = document.getElementById('audio-sosten');
    audioExhalar = document.getElementById('audio-exhalar');

    const savedVolume = localStorage.getItem('audio_volume');
    const volume = savedVolume !== null ? parseInt(savedVolume) : 50;
    audioFondo.volume = volume / 100;

    const musicEnabled = localStorage.getItem('audio_music_enabled');
    if (musicEnabled === 'false') {
        audioFondo.muted = true;
    }

    const guidedEnabled = localStorage.getItem('audio_guided_enabled');
    window.guidedAudioEnabled = guidedEnabled !== 'false';
}

function startFondo() {
    if (!audioFondo) return;
    const musicEnabled = localStorage.getItem('audio_music_enabled');
    if (musicEnabled === 'false') return;
    if (isFondoPlaying) return;
    audioFondo.play().then(() => {
        isFondoPlaying = true;
    }).catch(() => {});
}

function stopFondo() {
    if (!audioFondo) return;
    audioFondo.pause();
    isFondoPlaying = false;
}

function playInhalar() {
    if (!window.guidedAudioEnabled || !audioInhalar) return;
    setTimeout(() => {
        audioInhalar.currentTime = 0;
        audioInhalar.play().catch(() => {});
    }, 2000);
}

function playSosten() {
    if (!window.guidedAudioEnabled || !audioSosten) return;
    audioSosten.currentTime = 0;
    audioSosten.play().catch(() => {});
    setTimeout(() => {
        audioSosten.pause();
        audioSosten.currentTime = 0;
    }, 4000);
}

function playExhalar() {
    if (!window.guidedAudioEnabled || !audioExhalar) return;
    setTimeout(() => {
        audioExhalar.currentTime = 0;
        audioExhalar.play().catch(() => {});
    }, 1000);
}

function stopGuidedAudio() {
    if (audioInhalar) {
        audioInhalar.pause();
        audioInhalar.currentTime = 0;
    }
    if (audioSosten) {
        audioSosten.pause();
        audioSosten.currentTime = 0;
    }
    if (audioExhalar) {
        audioExhalar.pause();
        audioExhalar.currentTime = 0;
    }
}

function playClick() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
}

function playSuccess() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value = 1200;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
}

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('btn-install');
    if (installBtn) {
        installBtn.style.display = 'block';
    }
});

window.addEventListener('appinstalled', () => {
    const installBtn = document.getElementById('btn-install');
    if (installBtn) {
        installBtn.style.display = 'none';
    }
    deferredPrompt = null;
    showToast('App instalada correctamente');
});

function initSettings() {
    document.getElementById('btn-logout').addEventListener('click', () => {
        logout();
    });

    const installBtn = document.getElementById('btn-install');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    installBtn.style.display = 'none';
                }
                deferredPrompt = null;
            } else {
                showToast('Para instalar: menú del navegador → "Añadir a pantalla de inicio"');
            }
        });
    }

    document.getElementById('btn-change-pin').addEventListener('click', () => {
        const newPin = prompt('Ingresa tu nuevo PIN (4 dígitos):');
        if (newPin && newPin.length === 4) {
            api.createPin(newPin).then(() => {
                showToast('PIN actualizado');
            }).catch(() => {
                showToast('Error al actualizar PIN');
            });
        } else if (newPin) {
            showToast('PIN debe tener 4 dígitos');
        }
    });

    const toggleMusic = document.getElementById('toggle-music');
    const toggleGuided = document.getElementById('toggle-guided');
    const volumeSlider = document.getElementById('volume-slider');

    const musicEnabled = localStorage.getItem('audio_music_enabled');
    toggleMusic.checked = musicEnabled !== 'false';

    const guidedEnabled = localStorage.getItem('audio_guided_enabled');
    toggleGuided.checked = guidedEnabled !== 'false';

    const savedVolume = localStorage.getItem('audio_volume');
    volumeSlider.value = savedVolume || 50;

    toggleMusic.addEventListener('change', () => {
        playClick();
        localStorage.setItem('audio_music_enabled', toggleMusic.checked);
        if (toggleMusic.checked) {
            audioFondo.muted = false;
            startFondo();
        } else {
            stopFondo();
        }
    });

    toggleGuided.addEventListener('change', () => {
        playClick();
        localStorage.setItem('audio_guided_enabled', toggleGuided.checked);
        window.guidedAudioEnabled = toggleGuided.checked;
    });

    volumeSlider.addEventListener('input', () => {
        localStorage.setItem('audio_volume', volumeSlider.value);
        if (audioFondo) {
            audioFondo.volume = volumeSlider.value / 100;
            if (volumeSlider.value > 0) {
                audioFondo.muted = false;
            }
        }
    });
}
