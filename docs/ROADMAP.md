# Roadmap

El MVP cubre el núcleo académico: asignación, seguimiento, asesorías,
compromisos, alertas y dashboards. Lo que sigue, en orden de valor.

## Siguiente iteración

| Módulo | Qué implica |
|---|---|
| **Notificaciones por correo** | Implementar un `EmailChannel` en `NotificationService`. La arquitectura ya lo admite sin tocar los servicios de negocio. Resumen semanal a coordinación y aviso al director cuando su dirigido entra en rojo. |
| **Autenticación institucional** | Proveedor de Google Workspace o Microsoft 365 en Auth.js, conservando el rol en la base. |
| **Recuperación de contraseña por correo** | Hoy es asistida: la administración asigna una temporal. El autoservicio necesita el canal de correo. |
| **Carga masiva** | Importar estudiantes, docentes y cohortes desde CSV al abrir cada periodo. |
| **Solicitud de asesoría por el estudiante** | El estudiante propone fecha y el director confirma. El modelo ya guarda quién creó cada asesoría. |

## Programas adicionales

- **Pregrado**, **especializaciones** y **doctorado**: el modelo es multiprograma
  y los umbrales son configurables; falta validar reglas propias de cada nivel.
- **Comité curricular** como rol con aval formal de las asignaciones.

## Evaluación del trabajo de grado

- Jurados y su asignación.
- Sustentaciones: programación, acta y resultado.
- Rúbricas y calificación.
- Conceptos periódicos del par corrector.

## Documentos

- Repositorio de versiones del documento de tesis.
- Entrega de avances asociada a cada asesoría.
- Firma electrónica de actas.
- Integración con repositorio institucional y con antiplagio.

## Analítica

- Series históricas por cohorte y por director.
- Tiempos medios de graduación y de respuesta.
- Reportes exportables en Excel y PDF.
- Tablero institucional multiprograma.

## Integraciones

- Sistema académico de la universidad (matrícula, cohortes, semestres).
- Calendario (Google Calendar / Outlook) para las asesorías.
- WhatsApp para recordatorios, a través del canal de notificaciones.

## Deuda técnica reconocida

- El filtrado por estado y el ordenamiento se hacen en memoria porque el semáforo
  es estado derivado. Con miles de trabajos habrá que materializar una vista o
  precalcular el estado por periodo.
- La sincronización de alertas escribe trabajo por trabajo (ya sin recargar el
  estado de cada uno); con volúmenes altos conviene un trabajo programado (cron)
  por programa.
- El límite de intentos de inicio de sesión es por proceso: con varias instancias
  hay que moverlo a Redis o a una tabla.
- No hay aún pruebas de integración sobre las Server Actions; las cubren las E2E.
