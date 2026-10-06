export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const DURATION_MINUTES = [0, 15, 30, 45] as const;

export function durationToDecimal(hours: number, minutes: number): number {
  return hours + minutes / 60;
}

export function decimalToDuration(decimal: number): { hours: number; minutes: number } {
  const hours = Math.floor(decimal);
  let minutes = Math.round((decimal - hours) * 60);
  if (!DURATION_MINUTES.includes(minutes as (typeof DURATION_MINUTES)[number])) {
    minutes = DURATION_MINUTES.reduce((prev, curr) =>
      Math.abs(curr - minutes) < Math.abs(prev - minutes) ? curr : prev,
    );
  }
  if (hours >= 24) {
    return { hours: 24, minutes: 0 };
  }
  return { hours, minutes };
}

export function formatDuration(decimal: number): string {
  const { hours, minutes } = decimalToDuration(decimal);
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

export function validateDurationParts(hours: number, minutes: number): string | null {
  if (!Number.isInteger(hours) || hours < 0 || hours > 24) {
    return 'Selecciona un número de horas válido';
  }
  if (!DURATION_MINUTES.includes(minutes as (typeof DURATION_MINUTES)[number])) {
    return 'Los minutos deben ser 0, 15, 30 o 45';
  }
  if (hours === 0 && minutes === 0) {
    return 'Selecciona al menos 15 minutos';
  }
  if (hours === 24 && minutes > 0) {
    return 'No puedes añadir minutos si ya tienes 24 horas';
  }
  const total = durationToDecimal(hours, minutes);
  if (total > 24) {
    return 'No puedes registrar más de 24 horas en una entrada';
  }
  return null;
}

export function validateDayTotal(
  existingHours: number,
  newHours: number,
): string | null {
  if (existingHours + newHours > 24) {
    return 'No puedes exceder 24 horas en un día';
  }
  return null;
}
