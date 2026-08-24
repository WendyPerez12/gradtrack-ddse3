# Arquitectura

## Stack

| Capa | Tecnología |
|---|---|
| Interfaz | Next.js 15 (App Router), React 19, TypeScript estricto, Tailwind CSS 4 |
| Servidor | Server Components, Server Actions y Route Handlers de Next.js |
| Datos | PostgreSQL + Prisma 7 (adaptador `@prisma/adapter-pg`) |
| Autenticación | Auth.js / NextAuth v4 con proveedor de credenciales y sesión JWT |
| Validación | Zod, en cliente y servidor |
| Pruebas | Vitest (unitarias) y Playwright (extremo a extremo) |

No hay servidor Express aparte: todo el backend son capacidades server-side de
Next.js. La arquitectura es un **monolito modular**, no microservicios.

### Por qué estas versiones

Todas las dependencias principales están en su última versión **estable**; no se
usa ninguna beta, alpha ni RC.

- **Next.js 15.5** en lugar de 16: es la línea estable verificada de extremo a
  extremo con el resto del stack. Subir a 16 es un cambio acotado (`pnpm up next`)
  y compatible con `next-auth@4.24.15`, que ya declara soporte para 16.
- **NextAuth v4** en lugar de Auth.js v5: v5 sigue publicándose como beta.
- **Prisma 7** exige un *driver adapter*; por eso el proyecto incluye `pg` y
  `@prisma/adapter-pg`, y la URL de conexión vive en `prisma.config.ts`.

## Estructura

```text
src/
├── app/
│   ├── (app)/            Rutas privadas: layout con sesión + Server Actions
│   │   ├── panel/        Dashboard según rol
│   │   ├── trabajos/     Listado, creación y ficha del trabajo
│   │   ├── asesorias/    Listado transversal de asesorías
│   │   ├── alertas/      Bandeja de alertas
│   │   ├── reportes/     Reporte de seguimiento
│   │   ├── configuracion/Umbrales y periodos por programa
│   │   └── auditoria/    Registro de auditoría (ADMIN)
│   ├── api/
│   │   ├── auth/         Route handler de NextAuth
│   │   └── reportes/     Exportación CSV
│   └── login/            Autenticación pública
├── components/
│   ├── ui/               Primitivas reutilizables (botón, tabla, modal, estados…)
│   ├── layout/           Shell, navegación y campana de notificaciones
│   ├── dashboard/        Paneles por rol, indicadores y configuración
│   ├── thesis/           Tabla, filtros, formularios y supervisión
│   ├── advisory/         Acciones de asesoría, línea de tiempo, compromisos
│   └── alerts/           Acciones sobre alertas
├── lib/
│   ├── auth/             Configuración de NextAuth y helpers de sesión
│   ├── db/               Cliente Prisma único por proceso
│   ├── permissions/      Reglas puras (rules.ts) + guards con base de datos
│   ├── validations/      Esquemas Zod
│   ├── dates.ts          Normalización de días calendario
│   ├── errors.ts         Errores de aplicación y ActionResult
│   └── navigation.ts     Menú por rol y nombre del sistema
├── modules/              Lógica de negocio por dominio
│   ├── monitoring/       Servicio central de estado + motor de alertas (puro)
│   ├── theses/           Trabajos, supervisión y consultas del listado
│   ├── advisories/       Asesorías, asistencia y compromisos
│   ├── alerts/           Sincronización y gestión de alertas
│   ├── programs/         Periodos y configuración
│   ├── notifications/    NotificationService (canal interno)
│   └── audit/            Registro de auditoría
└── types/                Ampliación de tipos de NextAuth
```

Las fronteras se respetan en una dirección: **interfaz → módulos → persistencia**.
Los componentes nunca consultan Prisma con lógica de negocio adentro; los módulos
nunca importan React.

## Flujo de datos

1. Una página (Server Component) resuelve la sesión con `requireActor()`.
2. Aplica el alcance del actor (`thesisScopeWhere`) y consulta a través de un
   módulo del dominio.
3. `getMonitoringRows()` carga trabajos y su contexto en dos consultas y delega
   en la lógica pura `getThesisMonitoringStatus()`.
4. La interfaz solo pinta lo que ese servicio devolvió: el semáforo se calcula
   en un solo lugar.
5. Las mutaciones son Server Actions que validan con Zod, verifican permisos con
   los *guards*, ejecutan el servicio en una transacción y devuelven un
   `ActionResult` uniforme.

## Estado derivado y estado persistido

El semáforo, el conteo de asesorías cumplidas, los días de inactividad y la
próxima cita **se derivan siempre** de los datos reales; no se guardan.

Las **alertas sí se persisten**, pero solo como histórico: `syncThesisAlerts()`
compara lo que dictan las reglas contra las alertas `ACTIVE` de la base, crea las
nuevas, actualiza el mensaje de las vigentes y marca como `RESOLVED` las que ya
no aplican. Nada se borra. La sincronización se dispara después de cada mutación
de asesorías o supervisión, y manualmente desde **Recalcular alertas**.

## Seguridad

- Contraseñas con **bcrypt** (10 rondas). `passwordHash` nunca sale del servidor.
- Sesión JWT firmada; el rol y los programas del usuario viajan en el token.
- `middleware.ts` bloquea las rutas privadas sin sesión, pero **no es la
  autorización**: cada página y cada Server Action vuelven a verificar permisos
  en el servidor.
- Cambiar el id en la URL no revela nada: si el actor no tiene acceso, la
  respuesta es *no encontrado*, no *prohibido*.
- Identificadores `cuid()`, nunca secuenciales.
- Los errores se traducen a mensajes para personas; el detalle técnico solo se
  registra en el servidor.

## Fechas

Toda la lógica académica razona en días de calendario. `src/lib/dates.ts`
distingue dos cosas que suelen confundirse:

- `toCalendarDay()` — para columnas `@db.Date`, que ya son un día y solo se
  truncan en UTC.
- `toInstitutionalDay()` — para instantes reales (`new Date()`, `assignedAt`),
  que sí se convierten a la zona institucional antes de saber a qué día pertenecen.

Ninguna función del dominio llama a `new Date()` por su cuenta: `currentDate`
siempre entra como parámetro, para que las pruebas sean reproducibles.
