## Alcance del proyecto

La gestión interna permitirá administrar usuarios y permisos, menú, productos, promociones, mesas, reservas, pedidos y producción de cocina. Por su parte, la interfaz destinada al cliente (sin necesidad de iniciar sesión o gestionar un usuario como tal) permitirá consultar el menú, acceder al sistema mediante un código QR asociado a una mesa y código que brinda el mozo, personalizar productos, realizar y consultar pedidos, solicitar reservas y consultar el total de consumo, consultar cuenta total tanto web como impresa en papel, consultar estado de los pedidos.

Se podrá controlar la disponibilidad de los productos de la carta, habilitar o deshabilitar.

El módulo de mesas permitirá administrar la capacidad, plaza, disponibilidad y estado de cada mesa, así como asociar códigos QR y gestionar sesiones de atención. También se contempla la posibilidad de agrupar temporalmente dos o más mesas, permitiendo que estas se unan a una especie de grupo de mesa, donde estarían todas las mesas agrupadas, con su respectivo qr y el mozo les ofrecerá el código con el que podrán unirse a la misma sesión, donde cada persona perteneciente al mismo grupo y sesión, pueda armar su pedido, se enviará el pedido para que se arme la comanda una vez que todas las personas dentro de ese grupo confirmen su pedido, el sistema no permitirá que se envíe la comanda hasta que todos hayan confirmado o hasta que el mozo intervenga para cerrar la sesión de los pedidos y a su vez una vez que se cumplen la condición de que todos confirmaron su pedido individual se deberá confirmar el resumen del pedido total.

El sistema también contempla un módulo de reservas que pueden ser tanto por aplicación web como por teléfono del local, que permitirá consultar la disponibilidad de las mesas, registrar reservas y validar posibles conflictos de fecha, horario, capacidad y disponibilidad.

Como complemento, se incorporará un sistema de notificaciones y alertas internas, destinado a informar eventos relevantes como nuevos pedidos, pedidos listos, actualizaciones de estado o llamar mozos en caso de necesitar su atención en alguna mesa. La implementación de estas notificaciones estará orientada principalmente a mejorar la comunicación entre cliente, mozo, cocina y encargados.

Finalmente, se contempla un dashboard de estadísticas e historial, destinado a proporcionar información sobre la operación del establecimiento, como cantidad de pedidos, ventas, productos más solicitados, reservas. También se podrá registrar un historial de comandas para resolver casos de extravíos y un historial de determinadas acciones realizadas por los

usuarios para facilitar la trazabilidad de las operaciones.

## Límites del proyecto


El sistema estará limitado a las funcionalidades definidas en el alcance anterior. Cualquier funcionalidad que no se encuentre contemplada explícitamente en este documento quedará fuera de la entrega inicial.

En particular, no se contempla la implementación de un módulo de gestión de stock o inventario. El sistema podrá administrar la disponibilidad de los productos de la carta mediante su habilitación o deshabilitación manual, pero no realizará un control automático de insumos, recetas, cantidades disponibles ni descuentos de stock.

Asimismo, no se contempla la implementación de un módulo de delivery. Los pedidos gestionados por el sistema estarán orientados al consumo dentro del establecimiento y estarán asociados a una mesa y a su correspondiente sesión de atención.

La gestión de barra no formará parte de la entrega inicial. La producción contemplada en el alcance estará orientada exclusivamente al sector de cocina. Por lo tanto, el sistema no contará con un circuito independiente de recepción y preparación de pedidos para barra, o sea no va a haber comandas separadas, dedicadas a barra y cocina.

De igual manera la gestión de turnos de trabajo de los mozos no se contempla para la primera entrega del sistema, por lo tanto el sistema prescindirá de la asignación de horarios, de llegada y salida de los mozos, la rotación de atención de plazas y/o mesas.

El sistema tampoco contempla inicialmente la integración con plataformas externas de pago. La gestión de pagos electrónicos, integración con billeteras virtuales, tarjetas o pasarelas de pago quedará fuera del alcance de la primera versión. Se proyecta para una versión final del sistema.

No se contempla la integración directa con WhatsApp ni con otras plataformas externas de mensajería. El objetivo del sistema será centralizar dentro de la propia aplicación las operaciones que actualmente pueden realizarse mediante dichos medios.

No se contempla la implementación de un sistema contable, fiscal o de facturación electrónica.

Tampoco se contempla el desarrollo de una aplicación móvil nativa para Android o iOS. La solución será desarrollada como una aplicación web, accesible desde dispositivos compatibles mediante un navegador.

El sistema estará orientado a la gestión de un único establecimiento gastronómico. La administración de múltiples sucursales o establecimientos independientes quedará fuera del alcance inicial.

Finalmente, cualquier funcionalidad adicional que surja durante el desarrollo podrá ser evaluada como una posible ampliación, pero no formará parte de la entrega obligatoria si implica modificar sustancialmente el alcance, los tiempos o los recursos definidos

inicialmente.
