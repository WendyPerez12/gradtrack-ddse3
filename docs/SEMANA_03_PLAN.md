# Adecuación de GradTrack a la guía de la semana 03

Fuente: `Guia_Estudiante_semana_03.docx`, facilitada el 18 de septiembre de 2026. Este plan distingue los requisitos del producto de las evidencias de la entrega académica. La guía pide iniciar el frontend en Nuxt; no exige reemplazar la base de datos ni terminar una migración integral durante esta semana.

## Diagnóstico inicial

| Criterio de la guía | Evidencia actual | Trabajo necesario |
| --- | --- | --- |
| Frontend Nuxt y Vue 3 | El proyecto usa Next.js y React | Crear el frontend Nuxt o acordar una migración integral |
| Control del usuario | Hay cancelación en formularios, diálogos y navegación por roles | Verificar regreso, cierre con teclado, recuperación del foco y reversibilidad de acciones locales |
| Reducir carga de memoria | El panel muestra director, fechas, compromisos y estado | Organizar los contenidos por tarea y acompañar formularios con ayudas accesibles |
| Consistencia | Componentes compartidos y tokens visuales en `globals.css` | Conservar la identidad y los patrones al implementar Vue |
| Máximo 3 interacciones hasta contenido formativo | No hay mapa formal ni catálogo de contenidos formativos | Definir contenidos de apoyo al trabajo de grado y comprobar rutas en escritorio y móvil |
| Mockups de alta fidelidad | Existen pantallas implementadas, sin entrega de mockups | Preparar vistas de panel, seguimiento y recursos; capturarlas y rotularlas |
| Fundamentación Pressman, Sommerville y MODESEC | No hay trazabilidad específica a la guía | Documentar decisiones; consultar los textos institucionales antes de atribuir detalles no incluidos en la guía |
| 15 artículos científicos, distribución 5/5/5 | No hay base bibliográfica en `docs` | Seleccionar artículos, verificar metadatos y registrar qué decisión sustenta cada uno |
| Figuras compuestas y sección GUI en IMRyD | No existe evidencia preparada para el artículo | Preparar figura y texto metodológico sin inventar resultados de aprendizaje o pruebas con usuarios |
| Plan previo a implementación | Este documento | Mantener estados y pruebas verificables |
| Uso de Antigravity y Browser Subagent | No se ha acreditado ese flujo de herramientas | Registrar las herramientas realmente utilizadas; no atribuir a Antigravity pruebas ejecutadas con otra herramienta |

## Plan de implementación

1. Resolver el alcance del frontend: una implementación académica separada permite conservar la aplicación existente; una migración integral requiere trasladar autenticación, permisos, Server Actions y todas las vistas.
2. Aplicar las reglas de interacción a los componentes comunes: nombres accesibles, ayudas asociadas a controles, navegación con teclado, cancelación y foco visible.
3. Definir el mapa del estudiante y su metáfora pedagógica: una bitácora de investigación con planificación, asesorías y reflexión sobre compromisos. El número de asesorías no se presentará como medición de competencias adquiridas.
4. Implementar las vistas iniciales de Nuxt con TypeScript y componentes reutilizables. Identificar expresamente cualquier dato de demostración; no simular autenticación o persistencia real.
5. Construir las evidencias de diseño y la base bibliográfica. La documentación oficial del framework y WCAG son fuentes técnicas adicionales, no sustituyen los 15 artículos.
6. Ejecutar comprobaciones de tipos, pruebas de navegación y revisión visual en escritorio y móvil. No ejecutar el setup E2E existente contra la base del usuario porque resiembra sus datos.
7. Actualizar la matriz con resultados observados y pendientes. No declarar cumplimiento total mientras falten evidencias institucionales, bibliográficas o pruebas con usuarios.

## Criterios de aceptación

- Cada pantalla muestra dónde está el estudiante y cómo regresar.
- Toda acción local de edición permite cancelar; se ofrece deshacer cuando su semántica es segura.
- Las ayudas y errores de formulario están asociados programáticamente al control.
- Los estados usan texto además del color.
- Desde el panel, cada recurso formativo requiere como máximo tres activaciones, incluyendo la apertura del menú móvil cuando corresponda.
- Las vistas de Nuxt funcionan en escritorio y móvil y no producen errores de consola en los recorridos probados.
- La base bibliográfica distingue existencia del artículo, acceso a su contenido y verificación de indexación; no confunde un preprint con un artículo indexado.
- Las pruebas automatizadas no se presentan como sustituto de una evaluación de usabilidad con estudiantes.

## Límites de verificación

Los libros de la carpeta institucional `lib ing sw/` y el anexo audiovisual no están disponibles en este proyecto. Las reglas atribuidas a esos textos provienen por ahora de la guía facilitada. El uso efectivo de Google Antigravity no puede acreditarse mediante cambios de código.

## Estado al cierre de esta implementación

Se creó la implementación académica separada en `../gradtrack-nuxt`, disponible en el puerto 3001. La aplicación original permanece en su carpeta. Se completaron las vistas iniciales, el mapa de navegación, las capturas de alta fidelidad, la figura GUI, el texto metodológico y una selección bibliográfica 5/5/5 con límites de verificación explícitos.

La compilación y los tipos de Nuxt pasaron. Las pruebas funcionales pasaron en escritorio y móvil. En el código original se corrigieron atributos de formularios y nombres de diálogos; TypeScript pasó, pero ESLint quedó bloqueado por un plugin ausente de la instalación existente.

El estado no es «cumplimiento académico total»: faltan la comprobación institucional de indexación, el contraste de los textos de referencia, las pruebas con estudiantes y la evidencia de uso de Antigravity si se exige. El alcance de integración o migración completa sigue abierto. Ver `SEMANA_03_DISENO.md` para las evidencias y `SEMANA_03_BIBLIOGRAFIA.md` para las fuentes.
