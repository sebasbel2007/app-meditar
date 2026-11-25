let sosBreathingActive = false;
let sosBreathingTimeout = null;
let sosStartTime = null;
let sosCountdownInterval = null;

const SOS_GROUND_TEXTS = [
    "Inhala por la nariz, siente el aire llenar tu pecho.",
    "Sostén un momento. Siente la pausa.",
    "Exhala lento por la boca. Suelta todo.",
    "Cada respiración te trae más calma.",
    "Tu cuerpo sabe cómo sanar. Ayúdalo con aire.",
    "Estás a salvo. Solo respira.",
    "La tormenta pasa. Tú permaneces."
];

const SOS_PERSONALIZED = {
    1: ["El enojo es energía. Transfórmala en calma.", "Respira el fuego, exhala la ceniza."],
    2: ["Cada lágrima riega tu sanación.", "Tu dolor merece espacio. Respira con él."],
    3: ["La tristeza es visitante, no residente.", "Exhala la pena, inhala esperanza."],
    4: ["El equilibrio es poder. Manténlo.", "La calma también es una elección."],
    5: ["Tu luz interior es tu mejor medicina.", "La felicidad se multiplica al compartirla."]
};

function startGrounding() {
    const steps = [
        { count: 5, sense: 'cosas que ves', instruction: 'Mira a tu alrededor y nombra 5 cosas que puedes ver.' },
        { count: 4, sense: 'cosas que tocas', instruction: 'Toca 4 cosas y siente su textura.' },
        { count: 3, sense: 'cosas que escuchas', instruction: 'Escucha 3 sonidos a tu alrededor.' },
        { count: 2, sense: 'cosas que hueles', instruction: 'Identifica 2 olores que puedas percibir.' },
        { count: 1, sense: 'cosa que saboreas', instruction: 'Nota 1 sabor en tu boca.' }
    ];

    let currentStep = 0;

    function showStep() {
        if (currentStep >= steps.length) {
            endGrounding();
            return;
        }

        const step = steps[currentStep];
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        overlay.innerHTML = `
            <div class="popup-content">
                <h3>Anclaje 5-4-3-2-1</h3>
                <p style="font-size: 18px; margin-bottom: 16px;">${step.count} ${step.sense}</p>
                <p style="color: var(--text-secondary); margin-bottom: 24px;">${step.instruction}</p>
                <button class="btn-primary" id="btn-next-step">Siguiente</button>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('#btn-next-step').addEventListener('click', () => {
            overlay.remove();
            currentStep++;
            showStep();
        });
    }

    showStep();
}

function endGrounding() {
    api.saveSosSession('grounding').catch(() => {});
    showToast('Bien hecho. Estás a salvo.');
}

function startImpactBreathing() {
    sosBreathingActive = true;
    sosStartTime = Date.now();

    showScreen('screen-breathing');
    document.getElementById('bottom-nav').style.display = 'none';
    stopFondo();

    playBip();

    const circle = document.getElementById('breathing-circle');
    const text = document.getElementById('breathing-text');
    const ground = document.getElementById('breathing-ground');
    const countdownEl = document.getElementById('breathing-countdown');

    circle.style.background = 'linear-gradient(135deg, #ef4444, #f97316)';
    circle.innerHTML = '<img id="breathing-img" src="" alt="" class="breathing-img">';
    const breathingImg = document.getElementById('breathing-img');

    let phase = 0;
    const phases = [
        { name: 'Inhala profundo...', class: 'inhale', duration: 4000, img: PHASE_IMAGES.inhale, sound: 'inhale' },
        { name: 'Sostén...', class: 'inhale', duration: 4000, img: PHASE_IMAGES.sosten, sound: 'sosten' },
        { name: 'Exhala lento...', class: 'exhale', duration: 6000, img: PHASE_IMAGES.exhale, sound: 'exhale' },
        { name: 'Sostén...', class: 'exhale', duration: 2000, img: PHASE_IMAGES.sosten, sound: 'sosten' }
    ];

    let groundIndex = 0;
    const emotion = getLastEmotion();

    function updateCountdown() {
        const elapsed = Math.floor((Date.now() - sosStartTime) / 1000);
        const remaining = Math.max(0, 300 - elapsed);
        countdownEl.textContent = remaining;
    }

    sosCountdownInterval = setInterval(updateCountdown, 1000);
    updateCountdown();

    function runPhase() {
        if (!sosBreathingActive) return;

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

        const elapsed = Math.floor((Date.now() - sosStartTime) / 1000);

        if (elapsed >= groundIndex * 30 && groundIndex < SOS_GROUND_TEXTS.length) {
            if (groundIndex % 2 === 0) {
                const personalTexts = SOS_PERSONALIZED[emotion] || SOS_PERSONALIZED[3];
                ground.textContent = personalTexts[Math.floor(groundIndex / 2) % personalTexts.length];
            } else {
                ground.textContent = SOS_GROUND_TEXTS[groundIndex];
            }
            groundIndex++;
        }

        phase = (phase + 1) % phases.length;
        sosBreathingTimeout = setTimeout(runPhase, currentPhase.duration);
    }

    runPhase();

    ground.textContent = 'Respiración de impacto - 3 a 5 minutos';
}

function stopImpactBreathing() {
    if (!sosBreathingActive) return;
    sosBreathingActive = false;
    clearTimeout(sosBreathingTimeout);
    clearInterval(sosCountdownInterval);

    const elapsed = Math.floor((Date.now() - sosStartTime) / 1000);
    const minutes = Math.ceil(elapsed / 60);

    api.saveSosSession('breathing-impact', minutes).catch(() => {});

    stopGuidedAudio();
    const circle = document.getElementById('breathing-circle');
    circle.style.background = '';
    circle.innerHTML = '';

    document.getElementById('bottom-nav').style.display = 'flex';
    showScreen('screen-sos');
    startFondo();

    const emotion = getLastEmotion();
    const personalTexts = SOS_PERSONALIZED[emotion] || SOS_PERSONALIZED[3];
    showToast(personalTexts[Math.floor(Math.random() * personalTexts.length)]);
}

function initSos() {
    document.getElementById('btn-grounding').addEventListener('click', startGrounding);
    document.getElementById('btn-impact-breathing').addEventListener('click', startImpactBreathing);
    document.getElementById('btn-stop-breathing').addEventListener('click', () => {
        if (sosBreathingActive) {
            stopImpactBreathing();
        } else {
            stopBreathing();
        }
    });
}
