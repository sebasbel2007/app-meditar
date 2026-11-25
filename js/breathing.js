let breathingInterval = null;
let breathingTimeout = null;
let breathingStartTime = null;
let isBreathing = false;
let countdownInterval = null;

const BREATHING_DURATION = 120;

const GROUND_TEXTS = [
    "Nota cómo el aire entra frío y sale tibio.",
    "Si tu mente se distrae, está bien. Vuelve aquí.",
    "Relaja los hombros. Despega la lengua del paladar.",
    "Tu respiración es tu ancla. Vuelve a ella.",
    "Cada exhalación te acerca más a la calma.",
    "Estás haciendo algo bueno por ti ahora mismo.",
    "Ya casi. Un último respiro profundo."
];

const PERSONALIZED_TEXTS = {
    1: [
        "Sé que todo ha sido pesado. Este momento es tuyo.",
        "Está bien sentir enojo. Respira y suéltalo.",
        "Eres más fuerte de lo que crees. Sigue respirando.",
        "Cada respiro te ayuda a soltar la carga.",
        "No estás solo en esto. Estás aquí, y eso importa."
    ],
    2: [
        "Está bien llorar. Las lágrimas también son liberación.",
        "Tu dolor es válido. Este espacio es seguro.",
        "Cada respiración es un abrazo hacia ti mismo.",
        "No tienes que ser fuerte ahora. Solo respira.",
        "Eres importante. Este momento de calma es para ti."
    ],
    3: [
        "Es normal sentirse así. No estás roto, estás sanando.",
        "La tristeza también pasará. Respira conmigo.",
        "Haces lo que puedes, y eso es suficiente.",
        "Cada exhalación se lleva un poco de peso.",
        "Eres valioso. Este momento te recuerda eso."
    ],
    4: [
        "Neutral también está bien. No tienes que forzar nada.",
        "Estás en equilibrio. Dispausa este momento.",
        "La calma también es un logro. Disfrútala.",
        "Cada respiración te ancla al presente.",
        "Estás bien. Solo sigue respirando."
    ],
    5: [
        "¡Qué bueno verte bien! Esta energía es merecida.",
        "Tu felicidad irradia. Sigue brillando.",
        "Cada respiración potencia esa luz interior.",
        "Eres increíble. Nunca lo olvides.",
        "La vida es mejor contigo en ella. Sigue adelante."
    ]
};

const COMPLETION_MESSAGES = [
    "Lo lograste. Ya estás listo. Cierra la app y vuelve a tu día.",
    "Bien hecho. El tiempo que te diste fue valioso.",
    "Lo conseguiste. Ahora estás más tranquilo que antes.",
    "Tu calma de hoy es tu fuerza de mañana. Bien ahí.",
    "Eres más fuerte de lo que piensas. Lo acabas de demostrar."
];

function getLastEmotion() {
    const saved = localStorage.getItem('last_emotion');
    return saved ? parseInt(saved) : 3;
}

function getPersonalizedText(emotionLevel, elapsed) {
    const texts = PERSONALIZED_TEXTS[emotionLevel] || PERSONALIZED_TEXTS[3];
    const index = Math.min(Math.floor(elapsed / 25), texts.length - 1);
    return texts[index];
}

function getRandomCompletionMessage() {
    return COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
}

function playBip() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value = 528;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {}
}

const PHASE_IMAGES = {
    inhale: 'img/respiraciones/inhala.png',
    exhale: 'img/respiraciones/exhala.png',
    sosten: 'img/respiraciones/sosten.png'
};

function startBreathing() {
    if (isBreathing) return;
    isBreathing = true;
    breathingStartTime = Date.now();

    showScreen('screen-breathing');
    document.getElementById('bottom-nav').style.display = 'none';
    stopFondo();

    playBip();

    const circle = document.getElementById('breathing-circle');
    const text = document.getElementById('breathing-text');
    const ground = document.getElementById('breathing-ground');
    const countdownEl = document.getElementById('breathing-countdown');

    circle.innerHTML = '<img id="breathing-img" src="" alt="" class="breathing-img">';
    const breathingImg = document.getElementById('breathing-img');

    let phase = 0;
    const phases = [
        { name: 'Inhala...', class: 'inhale', duration: 4000, img: PHASE_IMAGES.inhale, sound: 'inhale' },
        { name: 'Sostén...', class: 'inhale', duration: 4000, img: PHASE_IMAGES.sosten, sound: 'sosten' },
        { name: 'Exhala...', class: 'exhale', duration: 4000, img: PHASE_IMAGES.exhale, sound: 'exhale' },
        { name: 'Sostén...', class: 'exhale', duration: 4000, img: PHASE_IMAGES.sosten, sound: 'sosten' }
    ];

    let groundIndex = 0;

    function updateCountdown() {
        const elapsed = Math.floor((Date.now() - breathingStartTime) / 1000);
        const remaining = Math.max(0, BREATHING_DURATION - elapsed);
        countdownEl.textContent = remaining;
    }

    countdownInterval = setInterval(updateCountdown, 1000);
    updateCountdown();

    function runPhase() {
        if (!isBreathing) return;

        const currentPhase = phases[phase];
        text.textContent = currentPhase.name;
        circle.className = `breathing-circle ${currentPhase.class}`;
        breathingImg.src = currentPhase.img;

        if (currentPhase.sound === 'inhale') {
            playInhalar();
        } else if (currentPhase.sound === 'sosten') {
            playSosten();
        } else if (currentPhase.sound === 'exhale') {
            playExhalar();
        }

        const elapsed = Math.floor((Date.now() - breathingStartTime) / 1000);

        if (elapsed >= groundIndex * 25 && groundIndex < GROUND_TEXTS.length) {
            const emotion = getLastEmotion();
            if (groundIndex % 2 === 0) {
                ground.textContent = getPersonalizedText(emotion, elapsed);
            } else {
                ground.textContent = GROUND_TEXTS[groundIndex];
            }
            groundIndex++;
        }

        phase = (phase + 1) % phases.length;
        breathingTimeout = setTimeout(runPhase, currentPhase.duration);
    }

    runPhase();

    breathingTimeout = setTimeout(() => {
        completeBreathing();
    }, BREATHING_DURATION * 1000);
}

function stopBreathing() {
    if (!isBreathing) return;
    isBreathing = false;

    clearTimeout(breathingTimeout);
    clearInterval(breathingInterval);

    const elapsed = Math.floor((Date.now() - breathingStartTime) / 1000);
    const completed = elapsed >= BREATHING_DURATION;

    if (completed) {
        playBip();
        const emotion = getLastEmotion();
        const msg = emotion >= 4
            ? getRandomCompletionMessage()
            : getPersonalizedText(emotion, 120);
        showToast(msg);
    }

    api.saveBreathingSession(elapsed, completed).catch(() => {});

    stopGuidedAudio();
    document.getElementById('breathing-circle').innerHTML = '';
    document.getElementById('bottom-nav').style.display = 'flex';
    showScreen('screen-home');
    startFondo();
}

function completeBreathing() {
    stopBreathing();
}

function initBreathing() {
    document.getElementById('btn-breathe').addEventListener('click', startBreathing);
    document.getElementById('btn-stop-breathing').addEventListener('click', stopBreathing);
}
