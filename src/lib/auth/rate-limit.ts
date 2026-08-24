/**
 * Límite de intentos de inicio de sesión.
 *
 * Contador en memoria del proceso: suficiente para una instalación de un solo
 * servidor y para frenar un ataque de fuerza bruta básico. Si el sistema se
 * despliega con varias instancias, esto debe moverse a Redis o a una tabla;
 * está aislado aquí justamente para que ese cambio sea de un solo archivo.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface Attempt {
  count: number;
  firstAt: number;
}

const attempts = new Map<string, Attempt>();

function prune(now: number): void {
  for (const [key, attempt] of attempts) {
    if (now - attempt.firstAt > WINDOW_MS) attempts.delete(key);
  }
}

/** ¿Este correo agotó sus intentos dentro de la ventana? */
export function isLocked(email: string, now: number = Date.now()): boolean {
  prune(now);
  const attempt = attempts.get(email.toLowerCase());
  if (!attempt) return false;
  if (now - attempt.firstAt > WINDOW_MS) {
    attempts.delete(email.toLowerCase());
    return false;
  }
  return attempt.count >= MAX_ATTEMPTS;
}

export function registerFailure(email: string, now: number = Date.now()): void {
  const key = email.toLowerCase();
  const attempt = attempts.get(key);
  if (!attempt || now - attempt.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return;
  }
  attempt.count += 1;
}

export function clearFailures(email: string): void {
  attempts.delete(email.toLowerCase());
}

/** Solo para pruebas: vacía el registro. */
export function resetRateLimit(): void {
  attempts.clear();
}

export const RATE_LIMIT = { WINDOW_MS, MAX_ATTEMPTS };
