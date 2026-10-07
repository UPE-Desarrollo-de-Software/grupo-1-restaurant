# Instrucciones para GitHub Copilot

## 1. Contexto del proyecto

Este repositorio corresponde a un proyecto académico de desarrollo de una aplicación web para la gestión de un restaurante.

El proyecto está siendo desarrollado por un equipo de estudiantes. El código debe mantenerse comprensible, mantenible y acorde con las tecnologías y conocimientos actuales del equipo.

El objetivo no es solamente producir código funcional, sino también aprender y mantener una estructura que pueda ser comprendida y mantenida por todos los integrantes del equipo.

---

# 2. Tecnologías del proyecto

El proyecto utiliza principalmente:

### Frontend

* React
* TypeScript
* Vite
* HTML
* CSS
* Bootstrap

### Backend

* PHP
* Laravel
* MySQL

Cuando trabajes sobre una parte específica del proyecto, primero identificá qué tecnologías y patrones utiliza realmente esa parte antes de proponer cambios.

No introduzcas tecnologías o librerías adicionales sin consultar previamente.

Por ejemplo, no reemplaces Bootstrap por Tailwind CSS, Material UI u otra biblioteca simplemente porque consideres que ofrece una solución más conveniente.

---

# 3. Regla principal: respetar el código existente

Antes de modificar código existente:

1. Revisá la estructura actual del proyecto.
2. Identificá componentes, estilos y utilidades existentes que puedan reutilizarse.
3. Buscá implementaciones similares antes de crear una nueva.
4. Intentá seguir las convenciones que ya utiliza el proyecto.
5. Evitá introducir patrones completamente diferentes a los utilizados actualmente.

El código existente debe considerarse la principal referencia para mantener coherencia dentro del proyecto.

---

# 4. No realizar cambios drásticos sin consultar

Esta es una regla prioritaria.

NO realices cambios grandes, refactorizaciones generales o reorganizaciones de arquitectura sin consultar primero al desarrollador.

Antes de realizar cualquiera de las siguientes acciones, explicá qué querés cambiar y por qué:

* Reorganizar carpetas.
* Cambiar la arquitectura del frontend.
* Cambiar la arquitectura del backend.
* Modificar múltiples componentes no relacionados con la tarea.
* Cambiar el sistema de estilos.
* Reemplazar Bootstrap por otra tecnología.
* Incorporar nuevas librerías.
* Cambiar configuraciones importantes de Vite.
* Cambiar configuraciones importantes de TypeScript.
* Modificar archivos de configuración del proyecto.
* Renombrar o mover una gran cantidad de archivos.
* Realizar refactorizaciones que afecten varias partes del proyecto.
* Modificar APIs o contratos entre frontend y backend.
* Cambiar modelos o estructuras de datos existentes.

Si una solución requiere alguno de estos cambios, detenerse y explicar:

* Qué se quiere modificar.
* Por qué sería necesario.
* Qué archivos serían afectados.
* Qué riesgos o consecuencias podría tener.
* Qué alternativa menos invasiva existe.

Esperar confirmación antes de realizar cambios importantes.

---

# 5. Principio de cambios mínimos

Para resolver una tarea, preferí siempre la solución que requiera la menor cantidad razonable de modificaciones.

Por defecto:

* Modificá solamente los archivos necesarios.
* No refactorices código que no esté relacionado con la tarea.
* No cambies código que ya funciona solamente para adaptarlo a tu estilo personal.
* No reemplaces una implementación existente si puede extenderse o reutilizarse.
* No elimines código existente sin explicar previamente por qué.
* No generes archivos innecesarios.

Una tarea pequeña debe producir un cambio pequeño.

---

# 6. Desarrollo de componentes React

Antes de crear un componente nuevo:

1. Buscá componentes similares.
2. Revisá cómo están organizados actualmente los componentes.
3. Identificá qué partes pueden reutilizarse.
4. Revisá cómo se manejan actualmente las props.
5. Revisá cómo se manejan los estilos.
6. Revisá cómo se implementa el responsive design.

Los nuevos componentes deben seguir los patrones existentes siempre que sea posible.

Preferir componentes pequeños y reutilizables frente a componentes excesivamente grandes.

Evitar abstraer prematuramente.

No crear una arquitectura compleja para resolver una necesidad sencilla.

---

# 7. React y TypeScript

Utilizar componentes funcionales y las convenciones modernas de React que ya utilice el proyecto.

Utilizar TypeScript correctamente cuando corresponda.

Preferir interfaces o types claros para las props de los componentes.

Evitar:

* `any` salvo que exista una razón justificada.
* Estados innecesarios.
* `useEffect` cuando el problema pueda resolverse sin él.
* Lógica duplicada.
* Componentes excesivamente grandes.
* Abstracciones innecesarias.

No introducir patrones avanzados de React solamente por considerarlos "más profesionales".

La solución debe ser apropiada para el tamaño y complejidad actual del proyecto.

---

# 8. Bootstrap y CSS

Bootstrap forma parte de las tecnologías del proyecto y debe aprovecharse cuando sea apropiado.

Antes de escribir CSS personalizado, verificar si Bootstrap ya proporciona una utilidad adecuada.

Preferir:

* Grid de Bootstrap.
* Flex utilities.
* Spacing utilities.
* Responsive utilities.
* Componentes de Bootstrap cuando sean compatibles con el diseño.

El CSS personalizado debe utilizarse cuando realmente sea necesario para adaptar el diseño visual del proyecto.

No agregar una gran cantidad de CSS personalizado si una solución sencilla con Bootstrap es suficiente.

Mantener los estilos coherentes con los componentes existentes.

---

# 9. Diseño responsive

Todos los componentes y vistas del frontend deben considerar diferentes tamaños de pantalla.

Utilizar primero las herramientas responsive disponibles en Bootstrap.

Cuando se requieran media queries personalizadas, mantenerlas simples y justificadas.

No diseñar exclusivamente para desktop.

Revisar especialmente:

* Mobile.
* Tablet.
* Desktop.

---

# 10. Referencias visuales, mockups e imágenes

El desarrollador puede proporcionar imágenes, capturas de pantalla, wireframes o mockups como referencia visual.

Cuando se proporcione una imagen:

1. Analizar la estructura visual.
2. Identificar jerarquía de elementos.
3. Analizar distribución y espaciado.
4. Identificar tamaños relativos.
5. Observar comportamiento visual esperado.
6. Adaptar el diseño a las tecnologías y estilos existentes del proyecto.

La imagen representa una referencia del resultado visual esperado, no una instrucción para copiar literalmente su código o tecnología.

La implementación debe respetar las convenciones existentes del proyecto.

Si la imagen entra en conflicto con decisiones técnicas existentes, explicarlo antes de realizar cambios importantes.

---

# 11. Antes de implementar una tarea

Cuando una tarea sea relativamente compleja, primero analizar el proyecto y presentar brevemente:

* Qué archivos deberían modificarse.
* Qué archivos nuevos serían necesarios.
* Qué componentes existentes podrían reutilizarse.
* Qué estrategia de implementación se propone.

Para tareas pequeñas y claramente definidas, se puede proceder directamente sin una explicación extensa.

---

# 12. Comunicación durante el desarrollo

Cuando exista más de una forma razonable de implementar una funcionalidad, explicar brevemente las alternativas y recomendar una.

Si existe incertidumbre sobre un requisito funcional o visual, preguntar antes de asumir.

No inventar requisitos.

No asumir que una parte del proyecto debe ser modificada solamente porque una solución alternativa sería "mejor" desde el punto de vista personal.

Priorizar las decisiones tomadas por el equipo.

---

# 13. Explicaciones orientadas al aprendizaje

El desarrollador está aprendiendo React, TypeScript, Bootstrap y otras tecnologías mientras participa en este proyecto.

Cuando una tarea implique un concepto nuevo o una decisión técnica importante:

* Explicar brevemente qué se está haciendo.
* Explicar por qué se eligió esa solución.
* Señalar conceptos importantes de React, TypeScript, Bootstrap o CSS involucrados.
* Evitar explicaciones innecesariamente extensas cuando la tarea sea sencilla.

No limitarse a generar código sin contexto cuando una explicación ayudaría a comprender la implementación.

---

# 14. No sobreingeniería

No utilizar una solución compleja cuando una solución sencilla es suficiente.

Evitar introducir:

* Patrones de diseño innecesarios.
* Abstracciones prematuras.
* Sistemas de configuración innecesarios.
* Nuevas dependencias sin necesidad.
* Arquitecturas complejas para funcionalidades simples.

El código debe ser suficientemente bueno para resolver el problema actual y permitir su evolución posterior.

---

# 15. Dependencias y nuevas tecnologías

No instalar nuevas dependencias automáticamente.

Antes de agregar una dependencia:

1. Explicar para qué se necesita.
2. Explicar qué problema resuelve.
3. Verificar si el proyecto ya tiene una alternativa.
4. Consultar antes de instalarla.

No reemplazar tecnologías existentes por otras sin aprobación.

---

# 16. Backend y API

Cuando se trabaje con Laravel/PHP:

* Respetar la arquitectura existente.
* Revisar primero controllers, services, models y rutas existentes.
* Reutilizar servicios y estructuras existentes cuando corresponda.
* No modificar endpoints existentes sin consultar.
* No cambiar contratos de API sin verificar primero quién los consume.

Si una modificación del backend afecta al frontend, explicarlo antes de realizar cambios relacionados.

---

# 17. Git

El proyecto utiliza Git y trabajo colaborativo mediante ramas.

No realizar operaciones destructivas de Git.

No ejecutar automáticamente acciones como:

* `git reset --hard`
* `git clean`
* Reescritura de historial.
* Eliminación de ramas.
* Force push.

Si una acción de Git pudiera provocar pérdida de trabajo, detenerse y consultar.

Los commits deben ser pequeños y relacionados con la tarea correspondiente.

---

# 18. Regla final

La prioridad al trabajar en este repositorio es:

1. Mantener la funcionalidad existente.
2. Respetar la arquitectura y tecnologías actuales.
3. Realizar cambios pequeños y controlados.
4. Reutilizar código existente.
5. Mantener el código simple y comprensible.
6. Evitar cambios no solicitados.
7. Consultar antes de realizar cambios estructurales.
8. Ayudar al desarrollador a comprender el código que se está implementando.

Cuando exista una solución simple y otra más compleja, preferir la simple salvo que exista una razón concreta para utilizar la solución más compleja.
