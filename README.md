# Lugar Seguro / Meditar

PWA (Progressive Web App) para meditar y respirar, para ayudar a reducir la ansiedad.

- Registro de check-ins diarios de energía (1-5).
- Respiraciones guiadas (inhala/exhala con cuentas regresivas y audios).
- Diario emocional con etiquetas y historial.
- Sesiones SOS / anclaje 5-4-3-2-1.
- Temas (oscuro/claro), audio de fondo, PIN de 4 dígitos.

## Arquitectura

- **Frontend**: estático en la raíz (`index.html`, `css/`, `js/`, `img/`, `audios/`, `icons/`, `sw.js`, `manifest.json`).
- **Backend**: opcional (legacy) en `server/` (Express + Firebase Admin). Ya no es usado por la app; la app habla directamente a Firestore.

### Datos

Los datos se guardan en **Firebase Firestore** (colecciones por usuario):
- `users/{uid}` → `{ pinHash, settings, ... }`
- `checkins/{id}` → `{ userId, date, energyLevel, timestamp }`
- `breathingSessions/{id}` → `{ userId, date, durationSeconds, completed, timestamp }`
- `journalEntries/{id}` → `{ userId, date, tags, text, timestamp, updatedAt }`
- `sosSessions/{id}` → `{ userId, type, durationMinutes, timestamp }`

## Despliegue en GitHub Pages

1. Subir el repo a GitHub (ej. `app-meditar`).
2. En el repo: **Settings → Pages → Source: GitHub Actions** (o rama `gh-pages`).
3. Firebase Console → **Authentication → Settings → Authorized domains** → agregar:
   - `lugar-seguro-a39fb.firebaseapp.com`
   - `TU-USUARIO.github.io`
4. Firestore Rules (ejemplo):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /checkins/{doc} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /breathingSessions/{doc} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /journalEntries/{doc} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /sosSessions/{doc} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

5. Deploy con Actions (ruta recomendada): workflow que haga checkout y publique la raíz.

## Local (legacy)

```bash
cd server
npm install
npm start
```

## Credenciales

- Firebase web config: `js/auth.js` (API key, authDomain, projectId, ...).
- Service account: `server/firebase-admin.json` (solo para el backend legacy, ya no se usa en el frontend).
- No subir `.env` ni `firebase-admin.json` (están en `.gitignore`).

## Notas

- El PIN se guarda con **bcrypt** (hash en cliente, bundle `js/vendor/bcrypt.js`).
- Service Worker cache-first para rutas same-origin; si cambias assets, subir `CACHE_NAME`.
- GitHub Pages sirve bajo subcarpeta (`/app-meditar/`), por eso SW y manifest usan rutas relativas.
