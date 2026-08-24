# GradTrack

**Sistema de Seguimiento de Trabajos de Grado**

Plataforma web para que una institución universitaria gestione la asignación de
trabajos de grado y, sobre todo, **monitoree las asesorías entre estudiantes y
directores**, detectando tempranamente a quienes se están quedando atrás.

El MVP está orientado a programas de maestría, con una arquitectura multiprograma
que admite pregrado, especializaciones y doctorados sin rehacer el sistema.

Flujo del núcleo:

```
Programa → Estudiante → Trabajo de grado → Director / Codirector
       → Asesorías → Asistencia → Compromisos → Alertas tempranas → Dashboard
```

---

## Requisitos

| Herramienta | Versión probada | Notas |
|---|---|---|
| Node.js | 20.20.2 | Mínimo 20.9 (requisito de Next.js 15) |
| pnpm | 9.15.9 | `corepack prepare pnpm@9.15.9 --activate` |
| PostgreSQL | 15 / 16 | Vía Docker o instalación local |
| Docker | opcional | Solo para levantar PostgreSQL |

Si no tienes pnpm:

```bash
corepack enable
corepack prepare pnpm@9.15.9 --activate
```

---

## Instalación

```bash
pnpm install
```

## Variables de entorno

```bash
cp .env.example .env
```

Genera un secreto real para la sesión:

```bash
openssl rand -base64 32   # pégalo en AUTH_SECRET y NEXTAUTH_SECRET
```

| Variable | Para qué sirve |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | Firma de la sesión (Auth.js) |
| `NEXTAUTH_URL` | URL pública de la aplicación |
| `APP_TIMEZONE` | Zona horaria institucional para presentar fechas (`America/Bogota`) |

## Base de datos

Con Docker:

```bash
docker compose up -d
```

Sin Docker (PostgreSQL local ya instalado):

```bash
createuser -s gradtrack || true
psql -d postgres -c "ALTER ROLE gradtrack LOGIN PASSWORD 'gradtrack_dev';"
createdb -O gradtrack gradtrack
```

## Prisma

```bash
pnpm prisma generate
pnpm prisma migrate dev
pnpm db:seed
```

> El cliente de Prisma se genera en `src/generated/prisma` y no se versiona:
> `pnpm install` lo regenera automáticamente (script `postinstall`).

## Desarrollo

```bash
pnpm dev
```

Abre <http://localhost:3000>.

## Pruebas

```bash
pnpm test        # unitarias (Vitest)
pnpm test:e2e    # extremo a extremo (Playwright); levanta la app y siembra la base
```

Las pruebas E2E ejecutan el seed antes de correr, así que **sobrescriben los datos
de la base configurada en `.env`**. Úsalas contra una base de desarrollo.

Además levantan la aplicación con `pnpm dev`, y el modo desarrollo **sobrescribe
el build de producción** (ambos usan `.next`). Si estabas sirviendo con
`pnpm start`, después de correr las pruebas hay que volver a `pnpm build`.

## Build de producción

```bash
pnpm build
pnpm start
```

## Otros comandos

| Comando | Qué hace |
|---|---|
| `pnpm lint` | ESLint sobre todo el proyecto |
| `pnpm typecheck` | TypeScript en modo estricto, sin emitir |
| `pnpm test:coverage` | Cobertura de las pruebas unitarias |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:reset` | Reinicia la base y vuelve a migrar |

---

## Credenciales de demostración

Creadas por `pnpm db:seed`. **Solo para desarrollo.**

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@gradtrack.test` | `Admin123*` |
| Coordinador (MED) | `coordinacion@gradtrack.test` | `Coord123*` |
| Coordinador (MING) | `coordinacion.ing@gradtrack.test` | `Coord123*` |
| Director 1 | `director1@gradtrack.test` | `Director123*` |
| Director 2 | `director2@gradtrack.test` | `Director123*` |
| Codirector | `codirector@gradtrack.test` | `Director123*` |
| Estudiante 1 — al día | `estudiante1@gradtrack.test` | `Estudiante123*` |
| Estudiante 2 — seguimiento | `estudiante2@gradtrack.test` | `Estudiante123*` |
| Estudiante 3 — alerta | `estudiante3@gradtrack.test` | `Estudiante123*` |
| Docente con contraseña temporal | `nuevo.docente@gradtrack.test` | `Aula2026` |
| Estudiantes 4 a 11 | `estudiante4..11@gradtrack.test` | `Estudiante123*` |
| Cohorte completa (14) | `cohorte1..14@gradtrack.test` | `Estudiante123*` |
| Especialización (3) | `ege1..3@gradtrack.test` | `Estudiante123*` |

Los datos de demostración cubren **todo** lo que el sistema sabe representar:

- **Tres programas.** La coordinación de la demostración lleva dos (Maestría en
  Educación y Especialización en Gestión Educativa); la Maestría en Ingeniería
  es de otra coordinación y sirve para comprobar el aislamiento entre programas.
- **Los seis tipos de alerta** activos a la vez, incluida una ya gestionada
  —visible como «en seguimiento» con su nota— y una descartada.
- **Los cinco estados de asesoría**: programada, realizada, no realizada (con
  motivo), cancelada y reprogramada.
- **Los cuatro estados de trabajo**: activo, suspendido, terminado y cancelado.
- Un trabajo con **cambio de director**, para ver el histórico de supervisión.
- Un trabajo **sin director** y una estudiante de primer semestre **sin trabajo**.
- Compromisos pendientes, cumplidos y cancelados.
- Volumen suficiente (24 trabajos en la coordinación) para ver **filtros,
  ordenamiento y paginación** funcionando de verdad.

---

## Recorrido de demostración

1. Entra como **coordinador**: el panel responde de un vistazo cuántos estudiantes
   están al día, en seguimiento y en alerta, y quiénes son.
2. Crea un trabajo desde **Nuevo trabajo** y asígnale director.
3. Entra como **director**: revisa tus dirigidos y programa una asesoría.
4. Marca la asesoría como realizada, registra asistencia y compromisos, y acuerda
   la próxima fecha.
5. Entra como **estudiante**: verás el historial y tus compromisos, sin poder
   modificar nada.
6. Vuelve como coordinador: los indicadores y el semáforo ya reflejan el cambio.

---

## Gestión de cuentas

Las cuentas las crea la **administración del sistema** desde **Usuarios**; no hay
registro público. Al crear una cuenta o restablecer una contraseña se asigna una
**contraseña temporal**: la persona entra con ella y el sistema no la deja pasar
a ninguna otra pantalla hasta que la cambie.

| Situación | Qué hacer |
|---|---|
| Entra un estudiante nuevo | Administración → **Usuarios** → **Nueva cuenta**, rol Estudiante, programa, código y semestre |
| Llega un docente | Igual, con rol Docente y los programas donde va a dirigir |
| Alguien olvidó su contraseña | Administración → **Usuarios** → **Contraseña**, y se le entrega la temporal por un canal seguro |
| Alguien se retira | **Desactivar**. La cuenta no se borra: el historial académico se conserva y puede reactivarse |

Una cuenta que dirige trabajos activos no se puede desactivar sin reasignar
antes esas direcciones: el sistema lo impide y dice cuántas son.

La coordinación **consulta** el directorio de sus programas, pero no gestiona
cuentas. Cada persona cambia su propia contraseña en **Mi cuenta**.

---

## Levantarlo tú mismo

### Cada vez que enciendes el computador

```bash
# 1. Arrancar PostgreSQL (solo si no está corriendo)
brew services start postgresql@15

# 2. Ir al proyecto y levantar la aplicación
cd ~/gradtrack
pnpm dev
```

Abre <http://localhost:3000> e inicia sesión con las credenciales de arriba.
Para detenerlo: `Ctrl + C` en la terminal donde quedó corriendo.

### Modo producción en la misma máquina

Más rápido que `pnpm dev` y es lo que realmente se despliega:

```bash
cd ~/gradtrack
pnpm build     # compila (no lo ejecutes con `pnpm dev` corriendo)
pnpm start     # sirve en http://localhost:3000
```

### Volver a dejar los datos de demostración como al principio

```bash
pnpm db:seed
```

Borra lo que hayas capturado durante la demostración y vuelve a sembrar los
escenarios. Úsalo antes de cada presentación.

### Desde otro equipo de la misma red

`pnpm dev` imprime una segunda dirección, del estilo
`http://192.168.1.42:3000`. Sirve para abrir el sistema desde un celular o
desde el portátil de otra persona conectada a la misma red.

---

## Problemas frecuentes

| Síntoma | Qué pasó | Solución |
|---|---|---|
| `pnpm: command not found` | Falta habilitar pnpm | `corepack enable && corepack prepare pnpm@9.15.9 --activate` |
| `Can't reach database server` | PostgreSQL apagado | `brew services start postgresql@15` |
| `lock file "postmaster.pid" already exists` | PostgreSQL quedó mal apagado y dejó un archivo huérfano | Verifica que no haya un proceso real con ese PID (`ps -p <PID>`); si no lo hay, borra `/opt/homebrew/var/postgresql@15/postmaster.pid` y arranca otra vez |
| `Port 3000 is already in use` | Quedó una instancia anterior | `lsof -ti:3000 \| xargs kill -9` |
| Todo responde 404 de un momento a otro | Se corrió `pnpm build` con `pnpm dev` levantado | Detén el servidor y vuelve a ejecutar `pnpm dev` |
| `Could not find a production build` al hacer `pnpm start` | Algo corrió `next dev` después del build: ambos usan la carpeta `.next` y el modo desarrollo la sobrescribe. Le pasa, por ejemplo, a `pnpm test:e2e` | Vuelve a ejecutar `pnpm build` y luego `pnpm start` |
| `Unknown argument ...` de Prisma | Se aplicó una migración con el servidor corriendo | Detén el servidor, `pnpm prisma generate`, y levántalo de nuevo |

---

## Estado del proyecto

**Esto es un MVP verificado, no un sistema en producción.** Funciona de punta a
punta, tiene pruebas y aguanta una demostración real ante la coordinación, pero
antes de ponerlo a operar con estudiantes de verdad falta lo siguiente.

### Bloqueantes

| Falta | Por qué importa |
|---|---|
| **Secreto de sesión real** | El `.env` de desarrollo trae un valor de ejemplo. En el servidor hay que generar uno con `openssl rand -base64 32`. |
| **HTTPS y dominio** | Las cookies de sesión solo viajan seguras sobre HTTPS. Hay que definir `NEXTAUTH_URL` con el dominio real y servir detrás de TLS. |
| **Respaldos de la base** | No hay política de copias ni de restauración. |
| **Tratamiento de datos personales** | El sistema guarda datos de estudiantes y docentes: la institución debe definir política de privacidad, consentimiento y retención (Ley 1581 de 2012). |

### Importante, pero no bloqueante

- **Notificaciones por correo**: hoy las alertas solo se ven entrando al sistema, y la recuperación de contraseña es asistida (la administración asigna una temporal) porque no hay canal para un enlace de recuperación.
- **Monitoreo y registro de errores** en el servidor.
- **Integración continua** que corra `lint`, `typecheck`, `test` y `build` en cada cambio, con una base de datos propia para las pruebas (la suite E2E **borra y resiembra** la base que apunte `DATABASE_URL`).
- **Límite de intentos por instancia**: el contador vive en memoria; con varios servidores hay que moverlo a Redis.
- **Rendimiento a escala**: el filtrado y el ordenamiento por estado se resuelven en memoria porque el semáforo es estado derivado. Correcto para cientos de trabajos; con miles hay que precalcular.

Ver [docs/ROADMAP.md](docs/ROADMAP.md) para el detalle.

---

## Documentación

| Documento | Contenido |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, capas, flujo de datos y decisiones |
| [docs/DATABASE.md](docs/DATABASE.md) | Entidades, relaciones y diagrama |
| [docs/ROLES_AND_PERMISSIONS.md](docs/ROLES_AND_PERMISSIONS.md) | Matriz de permisos |
| [docs/ALERT_RULES.md](docs/ALERT_RULES.md) | Reglas del motor de alertas |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Qué sigue después del MVP |
