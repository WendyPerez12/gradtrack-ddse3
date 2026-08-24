# Roles y permisos

Las reglas viven en [`src/lib/permissions/rules.ts`](../src/lib/permissions/rules.ts)
como funciones puras, y los *guards* de
[`src/lib/permissions/guards.ts`](../src/lib/permissions/guards.ts) las aplican
en el servidor después de cargar el contexto real desde la base.

> Ocultar un botón en el cliente **no** es autorización. Cada página y cada
> Server Action verifica los permisos de nuevo en el servidor.

## Roles

| Rol | Quién es |
|---|---|
| `ADMIN` | Administración del sistema. Ve todo. |
| `COORDINADOR` | Coordina uno o varios programas. Solo ve los suyos. |
| `DIRECTOR` | Cuenta de docente. Su relación con cada trabajo define lo que puede hacer allí. |
| `CODIRECTOR` | Existe en el enum, pero no se crean cuentas con este rol: un docente es codirector *de un trabajo*, no en general. |
| `ESTUDIANTE` | Ve únicamente su propio proceso, en solo lectura. |

Un mismo docente puede ser director de un trabajo y codirector de otro; los
permisos se resuelven por su relación con cada trabajo, no por su cargo.

## Matriz

| Acción | Admin | Coordinador | Director | Codirector | Estudiante |
|---|---|---|---|---|---|
| Ver todos los trabajos | Sí | Solo sus programas | No | No | No |
| Ver un trabajo | Sí | Sus programas | Donde participa o participó | Donde participa | Solo el propio |
| Crear trabajo de grado | Sí | Sí | No | No | No |
| Editar datos del trabajo | Sí | Sí | No | No | No |
| Asignar o cambiar director | Sí | Sí | No | No | No |
| Asignar o retirar codirector | Sí | Sí | No | No | No |
| Programar asesoría | Sí | Sí | Sí (activo) | Sí (activo) | No |
| Reprogramar o cancelar asesoría | Sí | Sí | Sí (activo) | Sí (activo) | No |
| **Confirmar asesoría realizada** | Sí | **No** | Sí (activo) | Sí (activo) | **No** |
| Marcar asesoría como no realizada | Sí | No | Sí (activo) | Sí (activo) | No |
| Registrar asistencia y compromisos | Sí | Sí | Sí (activo) | Sí (activo) | No |
| Cerrar o reabrir un compromiso | Sí | Sí | Sí (activo) | Sí (activo) | No |
| Ver alertas | Sí | Sus programas | Sus trabajos | Sus trabajos | Las de su proceso |
| Gestionar o descartar una alerta | Sí | Sí | Sí (activo) | Sí (activo) | No |
| Ver el panel de seguimiento | Sí | Sus programas | Sus dirigidos | Sus trabajos | Su proceso |
| Reportes y exportación CSV | Sí | Sus programas | No | No | No |
| Configurar umbrales del programa | Sí | Sus programas | No | No | No |
| Ver auditoría | Sí | No | No | No | No |

«activo» significa que la supervisión está vigente: un director anterior conserva
la lectura del trabajo, pero ya no puede escribir en él.

## Dos decisiones que conviene revisar con la coordinación

1. **El coordinador no confirma asesorías.** La confirmación es la evidencia de
   que la sesión ocurrió y por eso queda en manos de quien estuvo en ella. Si el
   programa prefiere permitirlo, basta cambiar `canUserConfirmAdvisory`.
2. **El estudiante no marca asesorías.** Puede verlo todo, pero no registra ni
   confirma nada. Si más adelante se quiere que solicite asesorías, el modelo ya
   lo soporta (la asesoría guarda quién la creó).

## Alcance por programa

El actor lleva en su sesión la lista de programas a los que pertenece. El helper
`thesisScopeWhere()` traduce ese alcance a una cláusula de Prisma, así que el
filtrado ocurre en la consulta y no después: un coordinador jamás recibe del
servidor datos de un programa ajeno.

Si alguien cambia un identificador en la URL, la respuesta es **404**, no 403:
un mensaje de «prohibido» confirmaría que ese trabajo existe.
