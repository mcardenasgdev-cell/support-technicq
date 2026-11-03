# Support Lab
Práctica en español para equipos: salas privadas por código, mitad clientes / mitad soporte, 10 minutos y cambio de roles a los 5. El creador puede iniciar con cualquier cantidad de participantes, incluso solo; se admite número impar con diferencia máxima de uno. Entrada antes de iniciar y durante ambas rondas, conservando el reloj original; las salas terminadas no admiten nuevos participantes. Reconexión mediante cookie.

40 incidentes distintos con ficha de cliente (síntoma, reproducción, contexto) y de soporte (diagnóstico, criterio de aceptación, editor o controles). Tickets creados por clientes, atendidos por soporte, reparados mediante configuración declarativa y confirmados por el cliente. Chat por ticket y bot deliberadamente incoherente. Resultados al finalizar, historial conservado al cambiar roles. Los clientes solo reciben sus tickets, síntomas, reproducción, chat y acciones de prueba/confirmación. Editor, configuración y diagnóstico son exclusivos de soporte, filtrados en el servidor y retirados al cambiar de rol. El resultado global final usa estadísticas agregadas sin exponer tickets ajenos al cliente. Sin ejecución de código arbitrario ni acceso al sistema anfitrión.

Arquitectura: HTML/CSS/JS sin framework; HTTP Node y SQLite integrado. Un proceso, sincronización por consulta cada 2 s. SQLite persiste salas y sesiones; caducan en 24 horas. Docker Alpine, usuario node, volumen propio, puerto localhost 8091 y Nginx del VPS. No comparte credenciales ni base con Academia.

Orden: catálogo y reglas → servidor/persistencia → interfaz → pruebas → despliegue documentado.
Comandos: `npm start`, `npm test`, `docker compose up -d --build`.
Estructura: catalog.js, game.js, server.js, public/, tests/, ops/.
Estilo: módulos ES, funciones pequeñas, nombres descriptivos; `const role = roleFor(room, member, now);`.
Validación: pruebas node:test de 40 reparaciones, temporización, permisos, confirmación, persistencia y HTTP; navegador real para dos participantes y móvil.
Límites: validar toda entrada, parametrizar SQL, renderizar texto sin HTML de usuarios; nunca ejecutar contenido del editor ni tocar Academia. Publicación remota queda a cargo del usuario, que indicó que lo subirá al VPS.
Diseño: Technicq Support con estética de consola profesional oscura, superficies carbón y acentos verde terminal. Sin etiquetas educativas, de práctica o simulación en la interfaz. Mesa de soporte de tres columnas, cola legible, editor oscuro, chat lateral. Móvil apila paneles; estados de espera/error/finalización explícitos, navegación por teclado.
