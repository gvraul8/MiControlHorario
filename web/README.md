# Mi Control Horario — Web (v1.0.0)

PWA para control de horas trabajadas: calendario, trabajos, estadísticas, PDF mensual. Auth e invitaciones con Firebase (Auth + Firestore).

## Requisitos

- Node.js 18+
- Cuenta Firebase (plan gratuito suficiente para ~20 usuarios)

## Configuración Firebase (una vez)

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com).
2. Activa **Authentication** → proveedores **Email/Password** y **Google**.
3. Crea una app **Web** y copia la configuración.
4. Activa **Firestore** en modo producción.
5. Activa **Hosting**.

### Variables de entorno

```bash
cp .env.example .env
```

Rellena `.env` con tus credenciales Firebase (`VITE_FIREBASE_*`).

### Invitar usuarios

Solo los emails preautorizados pueden entrar. Para invitar a alguien:

1. Abre **Firestore** en Firebase Console.
2. Crea la colección `allowedEmails` (si no existe).
3. Añade un documento con **ID = email en minúsculas** (ej. `juan@empresa.com`).
4. Campos del documento:

```json
{
  "email": "juan@empresa.com",
  "status": "pending",
  "invitedAt": "<timestamp>"
}
```

5. El empleado entra en la web y:
   - **Email/contraseña:** crea su contraseña la primera vez.
   - **Google:** debe usar exactamente ese correo invitado.

Tras el primer acceso, `status` pasa a `active` automáticamente.

### Reglas de seguridad

Despliega las reglas incluidas:

```bash
npm run firebase:rules
```

### Dominios autorizados (Google Sign-In)

En Firebase Console → Authentication → Settings → Authorized domains, añade:

- `localhost` (desarrollo)
- Tu dominio de producción (ej. `tu-proyecto.web.app`)

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:5173

## Despliegue desde GitHub (recomendado)

Tu PC **no actúa como servidor**: GitHub Actions compila la app y publica en **Firebase Hosting** (Google). Solo necesitas configurarlo **una vez**; después, cada `git push` a `develop` o `main` (con cambios en `web/`) despliega solo.

Workflow: `.github/workflows/deploy-web.yml`

### 1. Cuenta de servicio para CI (una vez)

1. Abre [Google Cloud Console](https://console.cloud.google.com/) → el proyecto vinculado a tu Firebase.
2. **IAM y administración** → **Cuentas de servicio** → **Crear cuenta de servicio** (nombre ej. `github-deploy`).
3. Asigna estos roles (mínimo):
   - **Firebase Hosting Admin**
   - **Cloud Datastore User** (para desplegar reglas de Firestore)
4. En la cuenta creada → **Claves** → **Añadir clave** → **JSON** → descarga el archivo (guárdalo en sitio seguro, no lo subas al repo).

### 2. Secrets en GitHub (una vez)

Repo en GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Crea estos secrets (los mismos valores que en tu `web/.env` local):

| Secret | Contenido |
|--------|-----------|
| `VITE_FIREBASE_API_KEY` | apiKey |
| `VITE_FIREBASE_AUTH_DOMAIN` | authDomain |
| `VITE_FIREBASE_PROJECT_ID` | projectId |
| `VITE_FIREBASE_STORAGE_BUCKET` | storageBucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | messagingSenderId |
| `VITE_FIREBASE_APP_ID` | appId |
| `FIREBASE_SERVICE_ACCOUNT` | **Todo el JSON** de la clave de la cuenta de servicio (pegar el contenido completo) |

El `projectId` debe coincidir con `web/.firebaserc` (`default`).

### 3. Publicar el workflow

Sube el repo (incluye `.github/workflows/deploy-web.yml`):

```bash
git push origin develop
```

En GitHub → pestaña **Actions** verás el job **Deploy Web to Firebase**. Si termina en verde, la app está en:

`https://<VITE_FIREBASE_PROJECT_ID>.web.app`

También puedes lanzarlo a mano: **Actions** → **Deploy Web to Firebase** → **Run workflow**.

### 4. Después del primer deploy

- **Authentication → Authorized domains**: añade `tu-proyecto.web.app` y `tu-proyecto.firebaseapp.com`.
- Invitaciones en Firestore (`allowedEmails`) siguen siendo las mismas que en local.

### Dominio propio (ej. `horario.gvraul.com`)

Firebase Console → **Hosting** → **Add custom domain** → DNS en tu registrador. Luego añade ese dominio en **Authorized domains**.

---

## Build y despliegue manual (opcional)

Desde tu PC, solo si quieres probar el deploy sin GitHub:

```bash
cd web
npm run build
npm run firebase:deploy
```

La primera vez: `npm run firebase:login` y `.firebaserc` apuntando a tu proyecto.

## Instalar como app (PWA)

### iPhone (Safari)

1. Abre la URL de la app en Safari.
2. Pulsa **Compartir** → **Añadir a pantalla de inicio**.

### Android (Chrome)

1. Abre la URL en Chrome.
2. Menú → **Instalar aplicación** o **Añadir a pantalla de inicio**.

La sesión permanece iniciada entre visitas (Firebase Auth con persistencia local).

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run preview` | Previsualizar build |
| `npm run firebase:rules` | Desplegar solo reglas Firestore |
| `npm run firebase:deploy` | Build + desplegar hosting y reglas |
| `npm run icons:process` | Regenerar iconos PWA desde `public/icon.png` (Python + Pillow) |

## Estructura de datos

```
allowedEmails/{emailLowercase}
  email, status, invitedAt

users/{uid}
  profile: { name, email }
  jobs: { "Trabajo A": { rate: 15 } }
  entries: { "2026-08-18": [{ job, hours }] }
```

## Notas

- La app Expo original en la raíz del repo se mantiene como referencia.
- Para producción con Google OAuth, configura la pantalla de consentimiento en Google Cloud Console (proyecto vinculado a Firebase).
