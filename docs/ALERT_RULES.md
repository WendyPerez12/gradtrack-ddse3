# Reglas de alerta temprana

Implementadas en [`src/modules/monitoring/monitoring.ts`](../src/modules/monitoring/monitoring.ts)
como una función pura, `evaluateAlerts(input)`, que recibe la fecha actual como
parámetro. Ningún umbral está escrito en el código: todos vienen de
`ProgramSettings` y se editan desde **Configuración**.

## Parámetros del programa

| Parámetro | Valor inicial | Qué controla |
|---|---|---|
| `minimumAdvisoriesPerPeriod` | 2 | Asesorías realizadas exigidas por periodo |
| `warningDaysWithoutAdvisory` | 30 | Inactividad que pasa a seguimiento |
| `criticalDaysWithoutAdvisory` | 45 | Inactividad que exige intervención |
| `riskWindowDaysBeforeDeadline` | 28 | Antelación con que se avisa del mínimo en riesgo |
| `missedAdvisoryGraceDays` | 7 | Margen para confirmar o reprogramar una cita vencida |
| `requireNextAdvisoryDate` | false | Exigir la próxima fecha al confirmar |
| `alertsEnabled` | true | Interruptor general del programa |

Precondiciones comunes: el trabajo está `ACTIVE`, tiene **director activo** y el
programa tiene las alertas habilitadas. Un trabajo sin director no genera
alertas —no sería justo atribuírselas a nadie—, pero aparece en amarillo con la
razón «sin director asignado» y en el indicador *Sin director* del panel.

---

## NO_FIRST_ADVISORY — Sin primera asesoría

**Descripción.** Se asignó director y todavía no hay ninguna asesoría realizada.

**Condición.** `asesoríasRealizadas = 0` y han pasado más de
`warningDaysWithoutAdvisory` días desde la asignación del director (o desde el
inicio del periodo, si no hay fecha de asignación).

**Severidad.** `WARNING`; sube a `CRITICAL` al alcanzar `criticalDaysWithoutAdvisory`.

**Cómo se resuelve.** Se cierra sola cuando se confirma la primera asesoría.
La coordinación también puede registrar una gestión y dejarla en el histórico.

---

## INACTIVITY — Inactividad

**Descripción.** Hubo asesorías, pero hace demasiado que no ocurre ninguna.

**Condición.** Días entre la última asesoría realizada y hoy:

| Rango | Estado |
|---|---|
| 0 – 29 | Al día |
| 30 – 44 | Seguimiento (`WARNING`) |
| 45 o más | Crítico (`CRITICAL`) |

**Cómo se resuelve.** Confirmando una nueva asesoría.

---

## MISSED_ADVISORY — Asesoría incumplida

**Descripción.** Una asesoría programada ya pasó y nadie la confirmó ni la
reprogramó.

**Condición.** Existe una asesoría en estado `SCHEDULED` cuya fecha quedó atrás
hace más de `missedAdvisoryGraceDays` días.

**Severidad.** `WARNING`.

**Cómo se resuelve.** Marcándola como realizada, como no realizada (con motivo)
o reprogramándola. El estado nunca cambia solo: la trazabilidad exige que alguien
diga qué pasó.

---

## NO_NEXT_ADVISORY — Sin próxima asesoría

**Descripción.** Después de una asesoría no quedó acordada la siguiente.

**Condición.** `requireNextAdvisoryDate` está activo, hay al menos una asesoría
realizada y no existe ni una asesoría futura programada ni una próxima fecha
acordada.

**Severidad.** `INFO` — no cambia el semáforo, es un recordatorio.

**Cómo se resuelve.** Programando la siguiente sesión.

---

## MINIMUM_ADVISORIES_RISK — Mínimo en riesgo

**Descripción.** El periodo está por cerrar y el estudiante no llegará al mínimo.

**Condición.** `asesoríasRealizadas < minimumAdvisoriesPerPeriod` y faltan
`riskWindowDaysBeforeDeadline` días o menos para la fecha límite del periodo
(`advisoryDeadline` si existe; si no, `endDate`).

**Severidad.** `WARNING`.

**Cómo se resuelve.** Alcanzando el mínimo antes del cierre.

---

## MINIMUM_ADVISORIES_NOT_MET — Mínimo incumplido

**Descripción.** El periodo cerró sin cumplir el mínimo.

**Condición.** Pasó la fecha límite y `asesoríasRealizadas < minimumAdvisoriesPerPeriod`.

**Severidad.** `CRITICAL`.

**Cómo se resuelve.** No se resuelve sola: es un hecho del periodo. La
coordinación registra la gestión y la alerta queda en el histórico del trabajo.

---

## Semáforo

El estado del trabajo es la severidad más alta de sus alertas activas:

| Estado | Cuándo | Etiqueta |
|---|---|---|
| `ALERT` | Alguna alerta `CRITICAL` | Alerta (rojo) |
| `FOLLOW_UP` | Alguna `WARNING`, o el trabajo no tiene director | Seguimiento (amarillo) |
| `ON_TRACK` | Sin alertas relevantes | Al día (verde) |

El color nunca comunica solo: cada estado lleva icono con forma propia y su
etiqueta en texto.

## Persistencia y ciclo de vida

El semáforo se calcula en vivo; las alertas se guardan para conservar el
histórico. `syncThesisAlerts()` corre después de cada cambio en asesorías o
supervisión, y también desde el botón **Recalcular alertas**:

- una alerta que las reglas justifican y no está activa → se crea;
- una activa que sigue justificada → se actualiza mensaje y severidad,
  **conservando la gestión** que alguien haya registrado;
- una activa que ya no aplica → pasa a `RESOLVED` con su fecha, sin persona
  asociada (fue automática);
- un tipo **descartado** por una persona dentro del periodo no se vuelve a
  levantar: «no aplica» es una decisión, no un estado transitorio.

### Gestionar no es cerrar

Registrar la gestión **no cierra la alerta**. La condición que la originó sigue
siendo cierta —el estudiante sigue sin asesorías— y cerrarla haría que el
siguiente recálculo la levantara otra vez con fecha nueva, perdiendo la nota.

En su lugar la alerta queda activa y marcada **en seguimiento**, con quién la
gestionó, cuándo y qué hizo. En la bandeja las no gestionadas van primero: son
las que la coordinación tiene que atender hoy. La alerta se resuelve sola
cuando el hecho cambia.

| Situación | Estado | Qué se ve |
|---|---|---|
| Recién detectada | `ACTIVE` | En la bandeja, sin marca |
| Alguien registró qué hizo | `ACTIVE` + gestión | «En seguimiento» con la nota |
| La condición dejó de aplicar | `RESOLVED` | En el histórico, resuelta automáticamente |
| Una persona decidió que no aplica | `DISMISSED` | En el histórico, no reaparece en el periodo |

Nada se borra nunca.
