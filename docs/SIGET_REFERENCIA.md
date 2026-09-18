# SIGET y el documento técnico del equipo

Nombre confirmado por el usuario: **SIGET — Sistema Integral de Gestión y Seguimiento de Trabajos de Grado**. Aunque el documento aún dice «nombre propuesto», la decisión comunicada por el equipo lo confirma.

Fuente de referencia: `Documento_tecnico_diseno_software_SIGET_v3_diligenciado.docx`, proporcionado por el usuario. Se conserva el Word original sin modificaciones. Las afirmaciones bibliográficas y de estado de ese documento son las del equipo, no verificaciones nuevas del repositorio local.

## Alcance y diferencias por resolver

| Decisión del documento | Situación local y trabajo pendiente |
| --- | --- |
| Gestión del conocimiento del proceso de trabajo de grado | El seguimiento académico existente es el núcleo. El prototipo de bitácora es complementario y no representa por sí solo el alcance de SIGET. |
| MVP centrado en un programa de maestría | El sistema existente permite varios niveles y su demostración incluye especialización. Alinear el escenario principal con maestría. |
| Porcentaje de asesorías confirmadas frente al mínimo del periodo | El sistema original conserva estados de semáforo. Cambiar la presentación y los reportes; acordar el tratamiento de más de 100% y mínimo cero antes de fijar reglas. |
| Alertas con causas explícitas | Conservar las causas de seguimiento, separadas del porcentaje. No interpretar el porcentaje como calidad de la tesis o competencia adquirida. |
| Solicitud de cambio de director y decisión del comité | El cambio directo e historial del sistema actual no sustituyen ese flujo. Implementar solicitud, revisión, decisión, notificación e historial. La coordinación puede registrar la decisión del comité en el MVP. |
| Nuxt 3 / Vue 3 / TypeScript | El sistema funcional es Next.js/React y el prototipo separado usa Nuxt 4/Vue 3. No declarar cumplimiento exacto del stack solicitado. Definir migración y versión objetivo. |
| Matriz bibliográfica propia del equipo | El documento incluye su selección 5/5/5. Usarla como base del equipo; la selección anterior del asistente es complementaria, no un reemplazo automático. |
| Estado del proyecto y repositorio remoto | El Word describe varios componentes como pendientes, aunque existen localmente. Conciliar evidencias antes de actualizar el documento o publicar. No se modificó el repositorio remoto. |

## Cambio aplicado

Nombre y descripción actualizados en los puntos visibles de la aplicación principal y en el código del prototipo. Se mantienen rutas de carpetas, nombre de la base, cuentas de demostración y claves de almacenamiento para conservar el acceso y los datos existentes. Las capturas de la semana 03 conservan valor histórico y deben regenerarse para una nueva entrega con la marca SIGET.
