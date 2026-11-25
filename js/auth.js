const firebaseConfig = {
    apiKey: "AIzaSyA6C_-hIH9urkevjCqDJBhapQFm1toDYik",
    authDomain: "lugar-seguro-a39fb.firebaseapp.com",
    projectId: "lugar-seguro-a39fb",
    storageBucket: "lugar-seguro-a39fb.firebasestorage.app",
    messagingSenderId: "56374822758",
    appId: "1:56374822758:web:53971f50137e7c190e2aa7"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

function showScreen(screenId) {
    const publicScreens = ['screen-login', 'screen-register', 'screen-welcome', 'screen-forgot'];
    if (!publicScreens.includes(screenId) && !isLoggedIn()) {
        screenId = 'screen-login';
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');

    const bottomNav = document.getElementById('bottom-nav');
    if (publicScreens.includes(screenId)) {
        bottomNav.style.display = 'none';
    } else {
        bottomNav.style.display = 'flex';
    }
}

function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

async function loginWithEmail(email, password) {
    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        localStorage.setItem('firebase_token', await result.user.getIdToken());
        return result.user;
    } catch (error) {
        throw new Error(getAuthErrorMessage(error.code));
    }
}

async function registerWithEmail(email, password) {
    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        localStorage.setItem('firebase_token', await result.user.getIdToken());
        return result.user;
    } catch (error) {
        throw new Error(getAuthErrorMessage(error.code));
    }
}

async function loginWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        localStorage.setItem('firebase_token', await result.user.getIdToken());
        return result.user;
    } catch (error) {
        throw new Error(getAuthErrorMessage(error.code));
    }
}

async function logout() {
    await auth.signOut();
    localStorage.removeItem('firebase_token');
    localStorage.removeItem('app_theme');
    showScreen('screen-login');
}

function getAuthErrorMessage(code) {
    const messages = {
        'auth/email-already-in-use': 'Este email ya está registrado',
        'auth/invalid-email': 'Email inválido',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/user-not-found': 'No existe una cuenta con este email',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
        'auth/popup-closed-by-user': 'Se cerró la ventana de Google'
    };
    return messages[code] || 'Error de autenticación';
}

function getCurrentUser() {
    return auth.currentUser;
}

function isLoggedIn() {
    return !!auth.currentUser && !!localStorage.getItem('firebase_token');
}

function requireAuth() {
    if (!isLoggedIn()) {
        showScreen('screen-login');
        return false;
    }
    return true;
}

function initAuth() {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            await loginWithEmail(email, password);
            onLoginSuccess();
        } catch (error) {
            showToast(error.message);
        }
    });

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        try {
            await registerWithEmail(email, password);
            onLoginSuccess();
        } catch (error) {
            showToast(error.message);
        }
    });

    document.getElementById('btn-google').addEventListener('click', async () => {
        try {
            await loginWithGoogle();
            onLoginSuccess();
        } catch (error) {
            showToast(error.message);
        }
    });

    document.getElementById('link-register').addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('screen-register');
    });

    document.getElementById('link-login').addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('screen-login');
    });

    document.getElementById('link-forgot').addEventListener('click', (e) => {
        e.preventDefault();
        playClick();
        showScreen('screen-forgot');
    });

    document.getElementById('btn-back-forgot').addEventListener('click', (e) => {
        e.preventDefault();
        playClick();
        showScreen('screen-login');
    });

    document.getElementById('forgot-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;
        try {
            await auth.sendPasswordResetEmail(email);
            playSuccess();
            showToast('Enlace enviado. Revisa tu correo.');
            setTimeout(() => showScreen('screen-login'), 2000);
        } catch (error) {
            showToast(getAuthErrorMessage(error.code));
        }
    });

    document.getElementById('forgot-form').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('forgot-form').dispatchEvent(new Event('submit'));
        }
    });

    document.getElementById('login-form').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('login-form').dispatchEvent(new Event('submit'));
        }
    });

    document.getElementById('register-form').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('register-form').dispatchEvent(new Event('submit'));
        }
    });

    document.getElementById('btn-save-pin').addEventListener('click', async () => {
        const pin = document.getElementById('pin-input').value;
        if (pin.length !== 4) {
            showToast('PIN debe tener 4 dígitos');
            return;
        }
        try {
            await api.createPin(pin);
            showToast('Todo listo.');
            setTimeout(() => {
                showScreen('screen-home');
                startFondoAfterLogin();
            }, 1000);
        } catch (e) {
            showToast('Error al guardar PIN');
        }
    });

    document.getElementById('pin-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('btn-save-pin').click();
        }
    });
}

async function onLoginSuccess() {
    const user = getCurrentUser();
    if (!user) return;

    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
        showScreen('screen-welcome');
    } else {
        const data = userDoc.data();
        if (data.settings && data.settings.theme) {
            setTheme(data.settings.theme);
        }
        showScreen('screen-home');
        startFondoAfterLogin();
    }
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

function initTheme() {
    const savedTheme = localStorage.getItem('app_theme') || 'dark';
    setTheme(savedTheme);

    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setTheme(btn.dataset.theme);
        });
    });
}
