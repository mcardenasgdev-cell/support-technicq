// Cada fila define un fallo observable y un contrato de reparación independiente.
const cases = [
['Interfaz','Botón de pago bloqueado','El carrito tiene productos, pero Pagar está gris.','Abrir carrito y pulsar Pagar.','El botón debe aceptar clics.','disabled',true,false,'Pagar'],
['Interfaz','Capa invisible sobre el formulario','Veo Guardar, pero los clics no llegan.','Intentar guardar el perfil.','La capa decorativa no debe capturar eventos.','pointerEvents','auto','none','Guardar'],
['Interfaz','Menú oculto','No encuentro la navegación.','Abrir la página de inicio.','El menú debe ser visible.','display','none','flex','Abrir menú'],
['Interfaz','Texto ilegible','Las instrucciones parecen estar vacías.','Abrir las instrucciones.','El contraste mínimo es 4.5.','contrast',1,4.5,'Leer instrucciones'],
['Interfaz','Modal detrás del fondo','Se oscurece la pantalla, pero no puedo confirmar.','Abrir la confirmación.','El modal debe estar encima del fondo de nivel 100.','zIndex',1,101,'Confirmar'],
['Interfaz','Formulario sin etiqueta','Mi lector de pantalla no identifica el correo.','Enfocar el campo de correo.','El campo necesita la etiqueta Correo.','label','','Correo','Enfocar correo'],
['Interfaz','Diseño desborda el móvil','Tengo que desplazarme horizontalmente.','Abrir en una pantalla de 320 píxeles.','El ancho debe adaptarse al contenedor.','width','1200px','100%','Ver página móvil'],
['Interfaz','Animación interminable','La pantalla de carga nunca termina.','Entrar al panel.','El indicador debe dejar de cargar.','loading',true,false,'Abrir panel'],
['Validación','Correo válido rechazado','Mi dirección persona+curso@example.com no pasa.','Enviar formulario con ese correo.','La validación debe aceptar el signo +.','allowPlus',false,true,'Validar correo'],
['Validación','Teléfono pierde el prefijo','El sistema elimina +502 al guardar.','Guardar un teléfono internacional.','El teléfono debe tratarse como texto.','phoneType','number','string','Guardar teléfono'],
['Validación','Cantidad cero aceptada','Puedo comprar cero productos.','Enviar cantidad 0.','La cantidad mínima debe ser 1.','minQuantity',0,1,'Validar compra'],
['Validación','Contraseña con espacios cortada','Mi contraseña deja de funcionar después de guardarla.','Crear contraseña con espacio al final.','No se deben recortar las contraseñas.','trimPassword',true,false,'Probar acceso'],
['Datos','Precio multiplicado por cien','Un producto de Q25 aparece como Q2500.','Abrir el detalle del producto.','Los centavos deben convertirse dividiendo entre 100.','priceDivisor',1,100,'Consultar precio'],
['Datos','Total sin impuesto','La factura no incluye IVA.','Calcular Q100 más 12% de impuesto.','La tasa de IVA es 0.12.','taxRate',0,0.12,'Calcular factura'],
['Datos','Descuento duplica el total','Al aplicar cupón el precio aumenta.','Aplicar descuento al carrito.','El descuento debe restarse.','discountOperation','add','subtract','Aplicar cupón'],
['Datos','Fecha en zona incorrecta','Mi clase aparece al día siguiente.','Consultar el horario local.','Usar America/Guatemala.','timezone','Asia/Tokyo','America/Guatemala','Consultar horario'],
['Datos','Orden de tickets invertido','Los tickets nuevos aparecen al final.','Ordenar por fecha de creación.','Mostrar primero los más recientes.','sort','asc','desc','Ordenar tickets'],
['Datos','Búsqueda distingue mayúsculas','Buscar MARIA no encuentra a Maria.','Buscar el mismo nombre en mayúsculas.','La búsqueda debe ignorar mayúsculas.','caseSensitive',true,false,'Buscar Maria'],
['Red','API en ruta equivocada','El listado devuelve 404.','Cargar los usuarios.','Consultar /api/users.','endpoint','/api/user','/api/users','Cargar usuarios'],
['Red','Método HTTP incorrecto','Guardar devuelve 405.','Crear un ticket.','La creación requiere POST.','method','GET','POST','Crear registro'],
['Red','Respuesta interpretada como texto','Veo [object Object] en el panel.','Cargar los datos de la API.','Interpretar la respuesta como JSON.','responseType','text','json','Leer respuesta'],
['Red','Tiempo de espera muy corto','La consulta falla aunque el servicio responde.','Consultar una operación que tarda 2 segundos.','El timeout debe ser 5000 ms.','timeoutMs',100,5000,'Consultar servicio'],
['Red','Reintentos infinitos','Una caída genera cientos de solicitudes.','Revisar una respuesta 503.','Limitar a tres intentos.','maxRetries',999,3,'Probar reintentos'],
['Red','Contenido JSON rechazado','El servidor devuelve 415.','Enviar un objeto JSON.','Declarar application/json.','contentType','text/plain','application/json','Enviar JSON'],
['Acceso','Permiso de lectura ausente','Puedo entrar, pero no ver mis tickets.','Abrir Mis tickets.','Habilitar lectura de tickets.','canReadTickets',false,true,'Ver mis tickets'],
['Acceso','Sesión caduca de inmediato','Me pide entrar otra vez después de un segundo.','Iniciar sesión y abrir perfil.','La duración de la sesión es 1800 segundos.','sessionSeconds',1,1800,'Abrir perfil'],
['Acceso','Cuenta bloqueada','Mi usuario figura bloqueado.','Intentar acceder con mi cuenta.','Desbloquear solo la cuenta afectada.','locked',true,false,'Ingresar'],
['Acceso','Rol de solo lectura','No puedo editar el documento asignado.','Intentar modificar un documento.','Asignar editor a la cuenta afectada.','role','viewer','editor','Editar documento'],
['Sistema','Impresora en pausa','Los trabajos nunca salen de la cola.','Enviar un documento.','Reanudar la impresora.','paused',true,false,'Imprimir documento'],
['Sistema','Impresora equivocada','El documento va a otra oficina.','Revisar el destino de impresión.','Seleccionar Recepcion.','printer','Bodega','Recepcion','Imprimir documento'],
['Sistema','Audio silenciado','No escucho la videollamada.','Reproducir un audio.','Desactivar el silencio.','muted',true,false,'Probar audio'],
['Sistema','Micrófono sin permiso','La otra persona no me escucha.','Grabar una nota de voz.','Conceder permiso al micrófono.','microphone','denied','granted','Probar micrófono'],
['Sistema','Disco lleno','No puedo guardar un archivo pequeño.','Guardar un archivo de 5 MB.','Liberar al menos 100 MB en disco.','freeMB',0,100,'Guardar archivo'],
['Sistema','Servicio detenido','El portal interno no responde.','Consultar estado del servicio.','Iniciar el servicio.','service','stopped','running','Abrir portal'],
['Sistema','DNS equivocado','El nombre del portal no resuelve.','Consultar resolución del portal.','Usar el DNS 192.0.2.53.','dns','192.0.2.99','192.0.2.53','Resolver nombre'],
['Sistema','VPN desconectada','No puedo acceder a la intranet.','Abrir recurso interno.','Conectar la VPN.','vpn',false,true,'Abrir intranet'],
['Correo','Notificaciones apagadas','No recibo avisos de nuevos tickets.','Generar notificación.','Activar las notificaciones.','notifications',false,true,'Enviar aviso'],
['Correo','Buzón de destino incorrecto','El aviso llega al departamento equivocado.','Revisar destinatario del ticket.','Enviar a soporte@example.test.','recipient','ventas@example.test','soporte@example.test','Enviar correo'],
['Archivos','Exportación con separador incorrecto','Mi hoja abre todo en una columna.','Abrir el CSV con configuración regional del equipo.','Usar punto y coma como separador.','delimiter',',',';','Exportar CSV'],
['Archivos','Caracteres dañados','Los nombres con ñ aparecen corruptos.','Exportar el nombre Muñoz.','Codificar en UTF-8.','encoding','ASCII','UTF-8','Exportar nombres']
];
export const catalog = cases.map((c, i) => {
  const [category,title,client,reproduce,expected,key,bad,good,action] = c;
  return {id:i+1,category,title,client,reproduce,expected,key,action,
    mode:i < 28 ? 'editor' : 'controls',
    support:`Reproduce el fallo y revisa ${key}. ${expected} Comprueba el cambio con el cliente antes de cerrar.`,
    initial:JSON.stringify({[key]:bad},null,2), solution:JSON.stringify({[key]:good},null,2),
    options:[bad,good], priority:i%4 === 0?'Alta':'Normal'};
});
export function validateRepair(scenario, source) {
  try {
    const value = JSON.parse(source);
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      && Object.keys(value).length === 1 && value[scenario.key] === JSON.parse(scenario.solution)[scenario.key];
  } catch { return false; }
}
