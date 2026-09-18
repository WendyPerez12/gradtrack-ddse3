# Bitácora de Monitoreo y Control — Proyecto SIGET / GradTrack

**Curso:** Diseño y Desarrollo de Software Educativo III — DDSE3  
**Periodo:** 2026-2  
**Universidad:** Universidad de Córdoba  
**Proyecto:** SIGET — Sistema Integral de Gestión y Seguimiento de Trabajos de Grado *(nombre propuesto; anteriormente GradTrack)*  
**Repositorio:** WendyPerez12/gradtrack-ddse3  
**Última actualización:** 4 de septiembre de 2026

---

## 1. Estructura del Equipo y Roles

| Integrante | Rol Principal | Horario de Reunión / Trabajo | GitHub User |
|---|---|---|---|
| Sofia Marcela Madera Montilla | Líder / Scrum Master | Martes 4:00 p. m. – 6:00 p. m. / Viernes 10:00 a. m. – 12:00 m. | @smarcelam |
| Cristian Andres Anaya Correa | Desarrollador Backend | Martes 4:00 p. m. – 6:00 p. m. / Viernes 10:00 a. m. – 12:00 m. | @CristianAnaya06 |
| Wendy Vanessa Perez Martinez | Desarrolladora Frontend | Martes 4:00 p. m. – 6:00 p. m. / Viernes 10:00 a. m. – 12:00 m. | @WendyPerez12 |
| Dayanna Arrieta Muñoz | Diseñadora UI/UX e Instruccional | Martes 4:00 p. m. – 6:00 p. m. / Viernes 10:00 a. m. – 12:00 m. | @darrietamunoz08-cmyk |

---

## 2. Avances del Sprint / Semana 03

### 2.1 Entregables y avances cumplidos

- [x] Definición del problema y necesidad del proyecto.
- [x] Identificación de usuarios, actores y roles del sistema.
- [x] Definición del alcance inicial del MVP.
- [x] Definición del Product Backlog e historias de usuario iniciales.
- [x] Organización del trabajo mediante Scrum.
- [x] Desarrollo de la Fase II de MODESEC en versión preliminar y posterior corrección.
- [x] Elaboración del diagrama de contenidos con enfoque conceptual y palabras clave.
- [x] Precisión de que el término **Programa** representa el programa académico de maestría.
- [x] Incorporación de **Gestión del conocimiento** como categoría conceptual del proyecto.
- [x] Elaboración del guion técnico multimedial.
- [x] Diseño de la ventana estándar.
- [x] Elaboración de la descripción de ventanas.
- [x] Elaboración de la guía de metáforas e iconografía.
- [x] Elaboración y ajuste del mapa de navegación.
- [x] Sustitución del semáforo de colores por un indicador de seguimiento expresado mediante porcentaje.
- [x] Diseño del proceso institucional de cambio de director: solicitud, revisión, comité, decisión, notificación y conservación del histórico.
- [x] Sustitución de la Figura 6 por un **diagrama de secuencia del seguimiento de asesorías**.
- [x] Consolidación de los avances en el **Documento técnico de diseño de software v3**.
- [x] Elaboración de una matriz inicial de 15 artículos científicos de respaldo.
- [x] Creación del repositorio GitHub y de la bitácora `MONITOREO_SEMANAL.md`.
- [x] Envío de invitaciones de colaboración a los integrantes del equipo en GitHub.

### 2.2 Ajustes derivados de la retroalimentación del docente

Durante la revisión del trabajo correspondiente a la Guía 2 se recibieron observaciones que modificaron algunas decisiones del diseño inicial:

1. Reemplazar el semáforo de colores por un indicador porcentual de seguimiento.
2. Formalizar el cambio de director mediante intervención del comité y registro de la decisión.
3. Representar el **Programa** como el programa académico de maestría.
4. Rehacer el diagrama de contenidos para representar conceptos y palabras clave del dominio y no únicamente módulos funcionales.
5. Incorporar la categoría **Gestión del conocimiento**.
6. Explorar un nuevo nombre para el producto; se propone provisionalmente **SIGET**.
7. Reemplazar el flujo preliminar de seguimiento de asesorías por un **diagrama de secuencia**.

---

## 3. Evidencia de Ingeniería de Prompts — Técnica ROCAS

La técnica ROCAS organiza la interacción con inteligencia artificial a partir de cinco elementos: **Rol, Objetivo, Contexto, Acción y Salida**.

### ROCAS 01 — Corrección de la Fase II de MODESEC

**Prompt original utilizado:**

> “el diagrama de secuencias se va a crear para cambiar la Figura 6. Flujo preliminar de seguimiento de asesorías en GradTrack. Haz el documento con todas las correciones”

**R — Rol:**  
Actúa como arquitecto de software educativo y diseñador instruccional con experiencia en MODESEC, Scrum y modelado UML.

**O — Objetivo:**  
Actualizar el documento de la Fase II de MODESEC del proyecto, incorporando las correcciones realizadas por el docente y sustituyendo el flujo preliminar de asesorías por un diagrama de secuencia.

**C — Contexto:**  
El proyecto corresponde a una aplicación web para el seguimiento de trabajos de grado en programas de maestría. El diseño inicial utilizaba un semáforo de colores, contemplaba un cambio directo de director y representaba el diagrama de contenidos como módulos del software. El docente indicó utilizar porcentaje de seguimiento, incorporar la decisión del comité en el cambio de director, precisar que el programa corresponde a la maestría, trabajar palabras clave y gestión del conocimiento, buscar otro nombre y reemplazar el flujo de asesorías por un diagrama de secuencia.

**A — Acción:**

1. Revisar el documento existente de la Fase II de MODESEC.
2. Rehacer el diagrama de contenidos con conceptos y palabras clave.
3. Cambiar el semáforo por un indicador porcentual.
4. Incorporar el proceso de solicitud y decisión de cambio de director con participación del comité y notificaciones.
5. Integrar Gestión del conocimiento como categoría conceptual.
6. Mantener la estructura de ventana estándar, descripción de ventanas, guía de metáforas y mapa de navegación.
7. Reemplazar la Figura 6 por un diagrama de secuencia del seguimiento de asesorías.
8. Mantener trazabilidad entre las correcciones y los elementos de diseño.

**S — Salida:**  
Documento Word actualizado, organizado por apartados de MODESEC, con figuras corregidas y un diagrama de secuencia UML que sustituya la Figura 6 anterior.

**Herramienta IA:** ChatGPT.  
**Resultado obtenido:** Documento corregido de la Fase II de MODESEC con las observaciones del docente integradas.  
**Iteración realizada:** Se revisó posteriormente el documento para conservar SIGET como nombre provisional y diferenciar las decisiones validadas de aquellas que siguen pendientes.

---

### ROCAS 02 — Consolidación del documento técnico de diseño

**Prompt original utilizado:**

> “Ahora todo lo que hemos avanzado tenemos que colocarlo en este documento”

**R — Rol:**  
Actúa como analista de requisitos, arquitecto de software educativo y redactor técnico especializado en documentación de proyectos de desarrollo ágil.

**O — Objetivo:**  
Integrar los avances realizados del proyecto dentro de la plantilla oficial del Documento técnico de diseño de software v3, sin inventar información que todavía no haya sido desarrollada o validada.

**C — Contexto:**  
El equipo ya cuenta con definición del problema, alcance del MVP, actores, historias de usuario, Product Backlog, planificación Scrum, Fase II de MODESEC, correcciones del docente, modelo de seguimiento por porcentaje, proceso de cambio de director con comité, diagrama de secuencia de asesorías, matriz bibliográfica inicial y repositorio GitHub.

**A — Acción:**

1. Analizar la estructura de la plantilla técnica.
2. Ubicar cada avance existente en el apartado correspondiente.
3. Integrar Scrum, MODESEC y MOCAVI de forma coherente.
4. Incorporar requerimientos funcionales y no funcionales.
5. Integrar los modelos y diagramas elaborados.
6. Incluir las correcciones realizadas por el docente.
7. Identificar claramente los apartados que siguen pendientes.
8. Mantener coherencia entre necesidades, historias de usuario, requisitos y solución propuesta.

**S — Salida:**  
Documento Word técnico consolidado, organizado según la plantilla suministrada, con tablas, figuras, matrices de trazabilidad, roadmap y estado de los pendientes.

**Herramienta IA:** ChatGPT.  
**Resultado obtenido:** Documento técnico consolidado con los avances disponibles y diferenciación explícita entre elementos realizados y pendientes.  
**Iteración realizada:** Se revisó la coherencia entre el documento técnico y las correcciones de MODESEC para evitar conservar decisiones descartadas, como el semáforo de colores.

---

## 4. Cuellos de Botella y Apoyo Requerido

### Riesgos / Bloqueos actuales

- Definir y validar la fórmula exacta del porcentaje de seguimiento.
- Confirmar si **SIGET** será el nombre definitivo del producto.
- Ajustar los artículos de arquitectura/frontend para que sean coherentes con Nuxt 3, Vue 3 y TypeScript.
- Diseñar los mockups de alta fidelidad solicitados para la Semana 03.
- Iniciar el frontend en Nuxt 3 / Vue 3.
- Disponer de los formatos o lineamientos formales de LIDERAR y SECMALI, si el docente requiere su aplicación específica.

### Apoyo / validación requerida del docente

- Validar la forma de calcular el porcentaje de seguimiento del estudiante.
- Confirmar la pertinencia del nuevo nombre del producto.
- Validar el diagrama de contenidos corregido y el diagrama de secuencia de asesorías.
- Precisar el nivel de profundidad esperado para LIDERAR y SECMALI.

---

## 5. Próximos Compromisos

- [ ] Definir la fórmula del porcentaje de seguimiento.
- [ ] Confirmar el nombre definitivo del software.
- [ ] Diseñar los mockups de alta fidelidad.
- [ ] Revisar y ajustar los 5 artículos de arquitectura/frontend hacia Nuxt/Vue 3/TypeScript.
- [ ] Elaborar el Implementation Plan del frontend.
- [ ] Inicializar el proyecto en Nuxt 3 y Vue 3.
- [ ] Implementar la primera pantalla funcional.
- [ ] Realizar pruebas visuales de las interfaces implementadas.
- [ ] Preparar y ensayar el Pitch en inglés de 1 minuto.
- [ ] Mantener actualizada esta bitácora al cierre de cada Semana B.
