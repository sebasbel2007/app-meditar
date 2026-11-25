require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const admin = require('firebase-admin');

const serviceAccount = require('./firebase-admin.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split('Bearer ')[1];
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
}

app.post('/api/verify-token', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No autorizado' });
        }
        const token = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        res.json({ uid: decoded.uid, email: decoded.email });
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
});

app.post('/api/pin/create', verifyToken, async (req, res) => {
    try {
        const { pin } = req.body;
        if (!pin || pin.length !== 4) {
            return res.status(400).json({ error: 'PIN debe tener 4 dígitos' });
        }

        const pinHash = await bcrypt.hash(pin, 10);
        await db.collection('users').doc(req.user.uid).set({
            pinHash,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar PIN' });
    }
});

app.post('/api/pin/verify', verifyToken, async (req, res) => {
    try {
        const { pin } = req.body;
        if (!pin || pin.length !== 4) {
            return res.status(400).json({ error: 'PIN debe tener 4 dígitos' });
        }

        const userDoc = await db.collection('users').doc(req.user.uid).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const userData = userDoc.data();
        if (!userData.pinHash) {
            return res.status(404).json({ error: 'PIN no configurado' });
        }

        const isValid = await bcrypt.compare(pin, userData.pinHash);
        if (!isValid) {
            return res.status(401).json({ error: 'PIN incorrecto' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al verificar PIN' });
    }
});

app.post('/api/checkin', verifyToken, async (req, res) => {
    try {
        const { energyLevel, date } = req.body;
        if (!energyLevel || energyLevel < 1 || energyLevel > 5) {
            return res.status(400).json({ error: 'Nivel de energía inválido' });
        }

        const dateStr = date || new Date().toISOString().split('T')[0];

        await db.collection('checkins').add({
            userId: req.user.uid,
            date: dateStr,
            energyLevel,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar check-in' });
    }
});

app.get('/api/checkin', verifyToken, async (req, res) => {
    try {
        const { start, end } = req.query;
        let query = db.collection('checkins').where('userId', '==', req.user.uid);

        if (start) {
            query = query.where('date', '>=', start);
        }
        if (end) {
            query = query.where('date', '<=', end);
        }

        const snapshot = await query.get();
        const checkins = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(checkins);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener check-ins' });
    }
});

app.post('/api/breathing-session', verifyToken, async (req, res) => {
    try {
        const { durationSeconds, completed } = req.body;
        if (!durationSeconds) {
            return res.status(400).json({ error: 'Duración requerida' });
        }

        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        await db.collection('breathingSessions').add({
            userId: req.user.uid,
            date: dateStr,
            durationSeconds,
            completed: completed || false,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar sesión' });
    }
});

app.get('/api/breathing-sessions', verifyToken, async (req, res) => {
    try {
        const snapshot = await db.collection('breathingSessions')
            .where('userId', '==', req.user.uid)
            .get();

        const sessions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener sesiones' });
    }
});

app.post('/api/journal', verifyToken, async (req, res) => {
    try {
        const { date, tags, text } = req.body;
        if (!date) {
            return res.status(400).json({ error: 'Fecha requerida' });
        }

        const existing = await db.collection('journalEntries')
            .where('userId', '==', req.user.uid)
            .where('date', '==', date)
            .get();

        if (existing.empty) {
            await db.collection('journalEntries').add({
                userId: req.user.uid,
                date,
                tags: tags || [],
                text: text || '',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } else {
            const docRef = db.collection('journalEntries').doc(existing.docs[0].id);
            await docRef.update({
                tags: tags || [],
                text: text || '',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar entrada' });
    }
});

app.get('/api/journal/:date', verifyToken, async (req, res) => {
    try {
        const { date } = req.params;
        const snapshot = await db.collection('journalEntries')
            .where('userId', '==', req.user.uid)
            .where('date', '==', date)
            .get();

        if (snapshot.empty) {
            return res.json(null);
        }

        const entry = snapshot.docs[0].data();
        res.json(entry);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener entrada' });
    }
});

app.get('/api/journal', verifyToken, async (req, res) => {
    try {
        const snapshot = await db.collection('journalEntries')
            .where('userId', '==', req.user.uid)
            .get();

        const entries = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(entries);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener entradas' });
    }
});

app.put('/api/settings', verifyToken, async (req, res) => {
    try {
        const settings = req.body;
        await db.collection('users').doc(req.user.uid).set({
            settings,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar ajustes' });
    }
});

app.get('/api/settings', verifyToken, async (req, res) => {
    try {
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        if (!userDoc.exists) {
            return res.json({});
        }
        res.json(userDoc.data().settings || {});
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener ajustes' });
    }
});

app.post('/api/sos-session', verifyToken, async (req, res) => {
    try {
        const { type, durationMinutes } = req.body;
        if (!type) {
            return res.status(400).json({ error: 'Tipo requerido' });
        }

        await db.collection('sosSessions').add({
            userId: req.user.uid,
            type,
            durationMinutes: durationMinutes || null,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar sesión SOS' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
