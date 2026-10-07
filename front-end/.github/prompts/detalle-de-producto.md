# Página de detalle de producto

Quiero desarrollar una nueva página de frontend para visualizar el detalle de un producto del restaurante.

## Objetivo

Crear una página de detalle de producto que permita al usuario visualizar la información completa de un producto del menú.

La página debería contemplar, como mínimo:

* Imagen del producto.
* Nombre del producto.
* Descripción.
* Precio.
* Categoría.
* Ingredientes, si la información está disponible.
* Estado/disponibilidad del producto, si corresponde.
* Una acción para agregar el producto al pedido.
* Una forma clara de volver al menú o a la lista de productos.

El diseño debe ser claro, moderno y consistente con el resto de la aplicación.

## Referencia visual

Voy a proporcionar una imagen/mockup como referencia visual.La misma esta en la carpeta reference.

Utilizala para analizar:

* Distribución de los elementos.
* Jerarquía visual.
* Espaciado.
* Tamaños.
* Composición.
* Comportamiento responsive.

La imagen es una referencia del resultado visual esperado.

No copies literalmente la implementación de la imagen ni introduzcas tecnologías que no utiliza nuestro proyecto.

Adaptá el diseño a las convenciones visuales y técnicas existentes.

## Antes de implementar

No modifiques archivos inmediatamente.

Primero analizá el proyecto y buscá:

1. Componentes relacionados con productos.
2. Componentes relacionados con el menú.
3. Tipos o interfaces de productos.
4. Datos mock o datos provenientes del backend.
5. Rutas existentes.
6. Componentes de navegación existentes.
7. Componentes de botones, cards u otros elementos reutilizables.
8. Estilos existentes.
9. Uso actual de Bootstrap.
10. Cualquier implementación existente que pueda servir como referencia.

Después explicame brevemente:

* Qué componentes existentes reutilizarías.
* Qué componente o página nueva proponés crear.
* Dónde debería ubicarse.
* Cómo manejarías el producto que se está visualizando.
* Qué archivos sería necesario crear o modificar.
* Si necesitás realizar algún cambio fuera del frontend de esta funcionalidad.

No implementes todavía si encontrás varias alternativas razonables.

## Implementación

Una vez definida la estrategia, implementar la página utilizando las tecnologías existentes del proyecto:

* React.
* TypeScript.
* Vite.
* Bootstrap.
* CSS existente.

Preferir la reutilización de componentes antes que crear implementaciones duplicadas.

La página debe ser responsive y funcionar correctamente en:

* Mobile.
* Tablet.
* Desktop.

Utilizar las utilidades responsive de Bootstrap siempre que sean adecuadas.

Utilizar CSS personalizado solamente cuando sea necesario para conseguir el diseño deseado.

## Manejo del producto

Antes de inventar una fuente de datos nueva, revisar cómo se manejan actualmente los productos en el proyecto.

Si ya existe un modelo, tipo, servicio, endpoint o estructura de datos para productos, reutilizarlo.

Si todavía no existe una integración con backend para esta vista, utilizar una solución temporal coherente con la arquitectura actual y dejar claramente indicado qué parte deberá conectarse posteriormente con la API.

No crear una segunda estructura de datos para productos si ya existe una.

## Navegación

Revisar cómo está implementado actualmente el routing.

Si el proyecto ya utiliza React Router u otro sistema de navegación, utilizar la solución existente.

No incorporar una nueva librería de routing.

La página debería poder recibir o identificar el producto que se desea visualizar de acuerdo con el mecanismo de navegación existente.

## Acción "Agregar al pedido"

La página debe incluir una acción visual para agregar el producto al pedido.

Si el proyecto todavía no tiene implementada la lógica de carrito/pedido:

* Crear únicamente la interfaz necesaria para esta tarea.
* No inventar una arquitectura completa de carrito.
* No implementar un sistema global de estado si todavía no existe.
* Dejar preparada la estructura para conectar posteriormente la acción con la lógica real.

## Restricciones importantes

No realizar:

* Refactorizaciones generales.
* Cambios de arquitectura.
* Reorganización de carpetas.
* Cambios del sistema de estilos.
* Migración de Bootstrap a otra tecnología.
* Nuevas dependencias.
* Modificaciones innecesarias del backend.
* Cambios en componentes no relacionados.

Si considerás que alguno de estos cambios es necesario, detenete y consultame antes de realizarlo.

Preferí siempre la solución más pequeña y coherente con la estructura actual del proyecto.

## Resultado esperado

Al finalizar:

1. Indicá qué archivos creaste.
2. Indicá qué archivos modificaste.
3. Explicá brevemente cómo funciona la página.
4. Explicá cómo recibe/identifica el producto.
5. Explicá qué componentes existentes reutilizaste.
6. Indicá qué parte queda preparada para conectar con el backend, si corresponde.
7. Señalá cualquier decisión técnica importante.
8. Indicá cómo puedo probar la página localmente.

No realices cambios fuera del alcance de esta funcionalidad.
