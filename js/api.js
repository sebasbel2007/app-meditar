// La app ya no depende de un backend Express.
// Se conecta directamente a Firestore (SDK de Firebase en el navegador).
const firestoreRef = firebase.firestore();

function getUid() {
    const user = firebase.auth().currentUser;
    if (!user) {
        throw new Error('No hay sesión activa');
    }
    return user.uid;
}

function getNowDateStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function getUserDoc() {
    const uid = getUid();
    const snap = await firestoreRef.collection('users').doc(uid).get();
    return snap;
}

async function verifyToken() {
    const user = firebase.auth().currentUser;
    if (!user) {
        throw new Error('No autorizado');
    }
    return user;
}

async function createPin(pin) {
    const bcrypt = window.dcodeIO ? window.dcodeIO.bcrypt : window.bcrypt;
    const pinHash = await bcrypt.hash(pin, 10);
    const uid = getUid();
    const { FieldValue } = firebase.firestore;
    await firestoreRef.collection('users').doc(uid).set({
        pinHash,
        createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
}

async function verifyPin(pin) {
    const snap = await getUserDoc();
    if (!snap.exists) {
        throw new Error('PIN no configurado');
    }
    const bcrypt = window.dcodeIO ? window.dcodeIO.bcrypt : window.bcrypt;
    const isValid = await bcrypt.compare(pin, snap.data().pinHash);
    if (!isValid) {
        throw new Error('PIN incorrecto');
    }
}

async function saveCheckin(energyLevel) {
    const uid = getUid();
    const dateStr = getNowDateStr();
    const { FieldValue } = firebase.firestore;
    await firestoreRef.collection('checkins').add({
        userId: uid,
        date: dateStr,
        energyLevel,
        timestamp: FieldValue.serverTimestamp()
    });
}

async function getCheckins(startDate, endDate) {
    const uid = getUid();
    let query = firestoreRef.collection('checkins').where('userId', '==', uid);
    if (startDate) {
        query = query.where('date', '>=', startDate);
    }
    if (endDate) {
        query = query.where('date', '<=', endDate);
    }
    const snapshot = await query.get();
    const checkins = [];
    snapshot.forEach(doc => {
        checkins.push({ id: doc.id, ...doc.data() });
    });
    return checkins;
}

async function saveBreathingSession(durationSeconds, completed) {
    const uid = getUid();
    const dateStr = getNowDateStr();
    const { FieldValue } = firebase.firestore;
    await firestoreRef.collection('breathingSessions').add({
        userId: uid,
        date: dateStr,
        durationSeconds,
        completed: completed || false,
        timestamp: FieldValue.serverTimestamp()
    });
}

async function getBreathingSessions() {
    const uid = getUid();
    const snapshot = await firestoreRef.collection('breathingSessions')
        .where('userId', '==', uid)
        .get();
    const sessions = [];
    snapshot.forEach(doc => {
        sessions.push({ id: doc.id, ...doc.data() });
    });
    return sessions;
}

async function saveJournal(date, tags, text) {
    const uid = getUid();
    const { FieldValue } = firebase.firestore;
    const existing = await firestoreRef.collection('journalEntries')
        .where('userId', '==', uid)
        .where('date', '==', date)
        .get();

    const entryData = {
        userId: uid,
        date,
        tags: tags || [],
        text: text || '',
        updatedAt: FieldValue.serverTimestamp()
    };

    if (existing.empty) {
        await firestoreRef.collection('journalEntries').add({
            ...entryData,
            timestamp: FieldValue.serverTimestamp()
        });
    } else {
        const docRef = firestoreRef.collection('journalEntries').doc(existing.docs[0].id);
        await docRef.update({
            tags: tags || [],
            text: text || '',
            updatedAt: FieldValue.serverTimestamp()
        });
    }
}

async function getJournal(date) {
    const uid = getUid();
    const snapshot = await firestoreRef.collection('journalEntries')
        .where('userId', '==', uid)
        .where('date', '==', date)
        .get();
    if (snapshot.empty) {
        return null;
    }
    const entry = snapshot.docs[0].data();
    return { id: snapshot.docs[0].id, ...entry };
}

async function getJournals() {
    const uid = getUid();
    const snapshot = await firestoreRef.collection('journalEntries')
        .where('userId', '==', uid)
        .get();
    const entries = [];
    snapshot.forEach(doc => {
        entries.push({ id: doc.id, ...doc.data() });
    });
    return entries;
}

async function updateSettings(settings) {
    const uid = getUid();
    const { FieldValue } = firebase.firestore;
    await firestoreRef.collection('users').doc(uid).set({
        settings,
        updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
}

async function getSettings() {
    const uid = getUid();
    const snap = await firestoreRef.collection('users').doc(uid).get();
    if (!snap.exists) {
        return {};
    }
    return snap.data().settings || {};
}

async function saveSosSession(type, durationMinutes = null) {
    const uid = getUid();
    const { FieldValue } = firebase.firestore;
    await firestoreRef.collection('sosSessions').add({
        userId: uid,
        type,
        durationMinutes: durationMinutes || null,
        timestamp: FieldValue.serverTimestamp()
    });
}

const api = {
    verifyToken,
    createPin,
    verifyPin,
    saveCheckin,
    getCheckins,
    saveBreathingSession,
    getBreathingSessions,
    saveJournal,
    getJournal,
    getJournals,
    updateSettings,
    getSettings,
    saveSosSession
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { api, firestoreRef };
}
