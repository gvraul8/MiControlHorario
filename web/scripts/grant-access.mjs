/**
 * Añade emails a Firestore allowedEmails (invitación a la web).
 *
 * Uso:
 *   npm run invite:grant -- user@example.com otro@example.com
 *   npm run invite:grant -- --file emails.txt
 *   npm run invite:grant -- --key C:\ruta\clave.json user@example.com
 *
 * Credenciales (una de):
 *   - Variable GOOGLE_APPLICATION_CREDENTIALS=ruta/al.json
 *   - Flag --key ruta/al.json
 *   - Archivo web/service-account.json (no commitear)
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, '..');

function loadDefaultProjectId() {
  const raw = readFileSync(resolve(webRoot, '.firebaserc'), 'utf8');
  const rc = JSON.parse(raw);
  return rc.projects?.default;
}

function parseArgs(argv) {
  const emails = [];
  let keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? null;
  let filePath = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--key' && argv[i + 1]) {
      keyPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--file' && argv[i + 1]) {
      filePath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      return { emails: [], keyPath, filePath, help: true };
    }
    if (arg.startsWith('-')) {
      console.warn(`Opción desconocida ignorada: ${arg}`);
      continue;
    }
    emails.push(arg);
  }

  if (filePath) {
    const absolute = resolve(process.cwd(), filePath);
    const content = readFileSync(absolute, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const part = trimmed.split(/[,;\s]+/)[0];
      if (part) emails.push(part);
    }
  }

  return { emails, keyPath, filePath, help: false };
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function resolveKeyPath(keyPath) {
  if (keyPath) return resolve(process.cwd(), keyPath);
  const local = resolve(webRoot, 'service-account.json');
  if (existsSync(local)) return local;
  return null;
}

function printHelp() {
  console.log(`
Invitar usuarios a Mi Control Horario (colección allowedEmails).

  npm run invite:grant -- email@empresa.com
  npm run invite:grant -- a@x.com b@y.com
  npm run invite:grant -- --file lista-emails.txt
  npm run invite:grant -- --key .\\mi-clave-firebase.json email@empresa.com

Archivo de lista: un email por línea (# comentarios). También acepta email,email en una línea.

Credenciales: JSON de cuenta de servicio (firebase-adminsdk) con permiso de escritura en Firestore.
  - Copia el JSON a web/service-account.json (está en .gitignore), o
  - $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\ruta\\clave.json"  (PowerShell)
`);
}

async function main() {
  const { emails, keyPath, help } = parseArgs(process.argv.slice(2));
  if (help) {
    printHelp();
    return;
  }

  const normalized = [...new Set(emails.map(normalizeEmail).filter(Boolean))];
  if (normalized.length === 0) {
    printHelp();
    process.exit(1);
  }

  const invalid = normalized.filter((e) => !isValidEmail(e));
  if (invalid.length > 0) {
    console.error('Emails no válidos:', invalid.join(', '));
    process.exit(1);
  }

  const keyFile = resolveKeyPath(keyPath);
  if (!keyFile || !existsSync(keyFile)) {
    console.error('No se encontró la clave de cuenta de servicio.');
    console.error('Usa --key, GOOGLE_APPLICATION_CREDENTIALS o web/service-account.json');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(readFileSync(keyFile, 'utf8'));
  const projectId = serviceAccount.project_id ?? loadDefaultProjectId();

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
  }

  const db = getFirestore();

  for (const email of normalized) {
    await db.doc(`allowedEmails/${email}`).set(
      {
        email,
        status: 'pending',
        invitedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    console.log(`✓ allowedEmails/${email}`);
  }

  console.log(`\nListo: ${normalized.length} email(s) invitado(s).`);
  console.log('Pueden entrar en la web con ese correo (contraseña o Google con el mismo email).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
