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
| Estudiantes 4 a 7 | `estudiante4..7@gradtrack.test` | `Estudiante123*` |

El segundo programa (Maestría en Ingeniería) existe para comprobar que una
coordinación **no** ve los trabajos de otro programa.

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

## Documentación

| Documento | Contenido |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, capas, flujo de datos y decisiones |
| [docs/DATABASE.md](docs/DATABASE.md) | Entidades, relaciones y diagrama |
| [docs/ROLES_AND_PERMISSIONS.md](docs/ROLES_AND_PERMISSIONS.md) | Matriz de permisos |
| [docs/ALERT_RULES.md](docs/ALERT_RULES.md) | Reglas del motor de alertas |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Qué sigue después del MVP |
