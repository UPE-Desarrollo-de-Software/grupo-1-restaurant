# Página de Reservas — Frontend

## Contexto

Estamos desarrollando una aplicación web para la gestión de un restaurante.

El proyecto utiliza:

* React
* Vite
* JavaScript/TypeScript según la estructura existente del proyecto
* HTML
* CSS
* Bootstrap
* Laravel
* PHP
* MySQL

En este momento el objetivo es trabajar **exclusivamente sobre el frontend**.

Ya existe una **página de descripción/detalle de producto** que debe utilizarse como referencia visual y estructural para mantener coherencia dentro de la aplicación.

---

# Objetivo

Desarrollar la **página de reservas de mesa** utilizando exclusivamente datos mockeados.

La página debe permitir al usuario simular el proceso completo de realizar una reserva, aunque todavía no exista conexión con el backend.

El objetivo de esta etapa es conseguir una interfaz:

* Funcional desde el punto de vista del usuario.
* Visualmente coherente con el resto de la aplicación.
* Responsive.
* Implementada con React.
* Basada en Bootstrap cuando sea conveniente.
* Preparada para conectar posteriormente con Laravel/API.

---

# Restricción principal

## NO modificar el backend

Durante esta tarea **NO se deben modificar archivos relacionados con Laravel, PHP, modelos, controladores, servicios, rutas, migraciones, base de datos ni ninguna otra parte del backend**.

No crear endpoints.

No modificar endpoints existentes.

No modificar modelos.

No modificar controladores.

No modificar migraciones.

No modificar configuraciones del backend.

Todo el funcionamiento de la página debe resolverse exclusivamente en el frontend utilizando datos mockeados.

Si en algún momento es necesario simular una respuesta del backend, hacerlo mediante objetos, arrays o archivos mock dentro del frontend.

---

# Alcance

La primera versión debe implementar únicamente el flujo visual y funcional de una reserva.

El usuario debería poder:

1. Acceder a la página de reservas.
2. Seleccionar una fecha.
3. Seleccionar la cantidad de personas.
4. Seleccionar un horario disponible.
5. Introducir sus datos personales.
6. Visualizar un resumen de la reserva.
7. Validar los datos ingresados.
8. Confirmar la reserva de forma simulada.
9. Recibir una confirmación visual de que la reserva fue realizada correctamente.

No es necesario persistir la reserva en una base de datos.

---

# Estructura propuesta

La página debería organizarse aproximadamente de la siguiente manera:

```text
Página de Reservas
│
├── Header / Navbar
│
├── Título
│   ├── "Reservá tu mesa"
│   └── Breve descripción
│
├── Formulario de reserva
│   │
│   ├── Fecha
│   ├── Cantidad de personas
│   └── Horario
│
├── Datos del cliente
│   ├── Nombre
│   ├── Email
│   └── Teléfono
│
├── Resumen de reserva
│   ├── Fecha
│   ├── Hora
│   └── Cantidad de personas
│
└── Botón "Confirmar reserva"
```

La estructura puede modificarse si existe una alternativa claramente mejor desde el punto de vista de UX.

---

# Datos mockeados

Utilizar datos ficticios para simular la disponibilidad del restaurante.

Por ejemplo:

```javascript
const horariosDisponibles = [
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "20:00",
    "20:30",
    "21:00",
    "21:30",
    "22:00"
];
```

También puede existir información mockeada sobre disponibilidad:

```javascript
const disponibilidad = {
    "2026-10-10": ["20:00", "20:30", "21:00"],
    "2026-10-11": ["12:30", "13:00", "21:00", "21:30"],
    "2026-10-12": ["20:30", "21:00", "22:00"]
};
```

Los datos son solamente ilustrativos.

La implementación puede utilizar una estructura diferente si resulta más adecuada para React.

---

# Comportamiento esperado

## Fecha

El usuario debe poder seleccionar una fecha.

La interfaz debería impedir, cuando sea posible, seleccionar fechas anteriores al día actual.

La disponibilidad de horarios puede variar dependiendo de la fecha seleccionada.

---

## Cantidad de personas

Permitir seleccionar la cantidad de comensales.

Por ejemplo:

```text
1 persona
2 personas
3 personas
4 personas
5 personas
6 personas
```

La implementación puede utilizar un `<select>`, botones, tarjetas u otro componente apropiado.

---

## Horario

Mostrar solamente los horarios disponibles para la fecha seleccionada.

Ejemplo:

```text
20:00
20:30
21:00
21:30
22:00
```

Los horarios deben reaccionar a los cambios realizados por el usuario.

Si una fecha no tiene disponibilidad, mostrar un mensaje apropiado.

Ejemplo:

> No hay horarios disponibles para esta fecha.

---

# Datos del cliente

El formulario debe solicitar como mínimo:

* Nombre
* Email
* Teléfono

Los campos deben tener validaciones básicas.

Ejemplos:

* Nombre obligatorio.
* Email obligatorio y con formato válido.
* Teléfono obligatorio.
* Fecha obligatoria.
* Cantidad de personas obligatoria.
* Horario obligatorio.

Los errores deben mostrarse de manera clara y amigable.

---

# Resumen de reserva

Mientras el usuario completa el formulario, mostrar un resumen actualizado.

Ejemplo:

```text
Tu reserva

Fecha
Sábado 10 de octubre

Hora
21:00

Personas
4 personas

Nombre
Ciro Coria
```

El resumen debe actualizarse automáticamente cuando cambien los datos.

---

# Confirmación

Al presionar:

**"Confirmar reserva"**

debe realizarse una validación final.

Si los datos son correctos, mostrar una confirmación visual.

Por ejemplo:

```text
¡Reserva confirmada!

Tu mesa fue reservada correctamente.

Fecha: 10/10/2026
Hora: 21:00
Personas: 4

Te esperamos.
```

No realizar ninguna petición al backend.

La confirmación debe ser completamente simulada en el frontend.

---

# React

La implementación debe utilizar React de acuerdo con la arquitectura existente del proyecto.

Evitar construir toda la página como un único componente monolítico.

Separar componentes cuando tenga sentido.

Una posible estructura podría ser:

```text
components/
│
├── ReservaForm
├── SelectorFecha
├── SelectorPersonas
├── SelectorHorario
├── DatosCliente
├── ResumenReserva
└── ConfirmacionReserva
```

La estructura exacta queda a criterio de la implementación y debe respetar la organización existente del proyecto.

No crear componentes innecesarios solamente por dividir código.

---

# Estado

Utilizar el estado de React para manejar:

* Fecha seleccionada.
* Cantidad de personas.
* Horario seleccionado.
* Nombre.
* Email.
* Teléfono.
* Estado de validación.
* Estado de confirmación.

Por ejemplo:

```javascript
const [fecha, setFecha] = useState("");
const [personas, setPersonas] = useState(2);
const [horario, setHorario] = useState("");
const [nombre, setNombre] = useState("");
const [email, setEmail] = useState("");
const [telefono, setTelefono] = useState("");
const [reservaConfirmada, setReservaConfirmada] = useState(false);
```

La implementación puede utilizar una estrategia diferente si resulta más apropiada.

---

# Bootstrap y estilos

Utilizar Bootstrap para:

* Grid y layout.
* Formularios.
* Botones.
* Espaciado.
* Responsive.
* Componentes básicos.

Evitar crear CSS personalizado cuando Bootstrap ya resuelva correctamente la necesidad.

Sin embargo, utilizar CSS propio cuando sea necesario para conseguir el diseño visual de la aplicación.

No abusar de estilos inline.

---

# Responsive

La página debe funcionar correctamente en:

* Mobile.
* Tablet.
* Desktop.

Diseñar primero pensando en una pantalla pequeña y utilizar las clases responsive de Bootstrap para adaptar el layout.

Ejemplo:

```text
Mobile
┌─────────────────────┐
│      Reserva        │
│                     │
│ Fecha               │
│ [___________]       │
│                     │
│ Personas            │
│ [___________]       │
│                     │
│ Horario             │
│ [___________]       │
│                     │
│ Datos personales    │
│                     │
│ Resumen             │
│                     │
│ [Confirmar reserva] │
└─────────────────────┘
```

En desktop puede utilizarse un layout de dos columnas:

```text
┌───────────────────────────────────────────────┐
│              RESERVÁ TU MESA                 │
│                                               │
│ ┌────────────────────┐  ┌──────────────────┐ │
│ │ Datos de reserva   │  │ Resumen          │ │
│ │                    │  │                  │ │
│ │ Fecha              │  │ Fecha            │ │
│ │ Personas           │  │ Hora             │ │
│ │ Horario            │  │ Personas         │ │
│ │                    │  │                  │ │
│ │ Datos personales   │  │                  │ │
│ │                    │  │                  │ │
│ │ [Confirmar]        │  │                  │ │
│ └────────────────────┘  └──────────────────┘ │
└───────────────────────────────────────────────┘
```

---

# UX

La experiencia debe ser sencilla.

El usuario debería entender inmediatamente:

1. Qué está reservando.
2. Qué información necesita proporcionar.
3. Qué horarios están disponibles.
4. Qué datos ingresó.
5. Qué ocurrirá al confirmar.

Evitar formularios excesivamente largos.

Utilizar mensajes claros.

Evitar errores silenciosos.

Los estados de la interfaz deben ser evidentes:

* Campo vacío.
* Campo seleccionado.
* Error.
* Sin disponibilidad.
* Reserva confirmada.

---

# Diseño visual

Utilizar la página de **detalle de producto existente** como referencia para:

* Tipografías.
* Colores.
* Espaciados.
* Bordes.
* Botones.
* Cards.
* Navbar.
* Estilo general.

No crear un diseño visual completamente desconectado del resto de la aplicación.

La nueva página debe sentirse como parte de la misma aplicación.

Si existen componentes reutilizables en el proyecto, priorizar su reutilización.

---

# Arquitectura y código existente

Antes de crear archivos nuevos:

1. Revisar cómo está organizada actualmente la carpeta frontend.
2. Identificar cómo está implementada la página de detalle de producto.
3. Identificar componentes reutilizables.
4. Identificar cómo se manejan actualmente las rutas.
5. Seguir las convenciones de nombres existentes.
6. Evitar modificar archivos que no sean necesarios para implementar la página de reservas.

No reorganizar todo el proyecto.

No realizar refactors generales.

No modificar componentes existentes salvo que sea estrictamente necesario para integrar la nueva página.

---

# Datos mock

Los datos mock deben estar claramente separados de la lógica visual cuando sea posible.

Por ejemplo:

```text
src/
├── components/
├── pages/
├── data/
│   └── reservasMock.js
└── ...
```

La ubicación final debe respetar la arquitectura existente.

El objetivo es que posteriormente resulte sencillo reemplazar:

```text
Datos mock
     ↓
API Laravel
```

sin tener que rehacer toda la interfaz.

---

# Fuera de alcance

En esta etapa NO implementar:

* Conexión con Laravel.
* Fetch hacia la API.
* Axios.
* Autenticación.
* Persistencia de reservas.
* Base de datos.
* Creación de endpoints.
* Modificación de controladores.
* Modificación de modelos.
* Modificación de migraciones.
* Sistema real de disponibilidad.
* Sistema real de usuarios.
* Emails de confirmación.

Todo esto queda para una etapa posterior.

---

# Criterios de finalización

La tarea se considera terminada cuando:

* [ ] Existe una página de reservas accesible desde React.
* [ ] La página respeta el diseño general de la aplicación.
* [ ] El usuario puede seleccionar una fecha.
* [ ] El usuario puede seleccionar cantidad de personas.
* [ ] Los horarios cambian según la fecha seleccionada.
* [ ] El usuario puede introducir sus datos.
* [ ] Existen validaciones básicas.
* [ ] Existe un resumen dinámico.
* [ ] El usuario puede confirmar la reserva.
* [ ] Se muestra una pantalla/mensaje de confirmación.
* [ ] Todo funciona utilizando datos mockeados.
* [ ] La página es responsive.
* [ ] No se modificó ningún archivo del backend.
* [ ] No se agregaron dependencias innecesarias.
* [ ] No se realizaron refactors generales del proyecto.

---

# Regla fundamental

**En esta etapa estamos construyendo y validando exclusivamente la experiencia frontend de reservas.**

Priorizar:

**UX → React → componentes → estado → datos mock → responsive → integración futura**

No intentar resolver todavía la comunicación con Laravel.

La implementación debe quedar preparada para que posteriormente los datos mockeados puedan ser reemplazados por datos provenientes de la API sin tener que rediseñar completamente la interfaz.
