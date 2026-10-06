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

## Build y despliegue

```bash
npm run build
npm run firebase:deploy
```

La primera vez (usa la CLI `firebase-tools`, no el paquete `firebase` del SDK):

```bash
cd web
npm install
npm run firebase:login
npx firebase use --add
```

Copia `.firebaserc.example` a `.firebaserc` si aún no lo tienes. Selecciona tu proyecto Firebase.

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
