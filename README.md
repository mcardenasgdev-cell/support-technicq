# Technicq · Support

Práctica colaborativa en español para 1–40 participantes. 40 incidentes, cada uno con ficha de cliente y guía de soporte (80 perspectivas). HTML, CSS y JavaScript, servidor Node y SQLite, sin dependencias de producción.

La interfaz usa una consola oscura profesional con acentos verde terminal. El cambio visual no altera el alcance simulado de las reparaciones ni la separación de permisos.

## Probar localmente

Requiere Node 22.16 o posterior de la rama 22.

```bash
npm start
```

Abre http://localhost:8091. Crea una sala y comparte el código. Para probar dos personas en una computadora usa dos perfiles de navegador o una ventana privada: las pestañas del mismo perfil comparten identidad.

1. Los participantes entran con nombre o alias. Se asignan alternadamente a soporte y clientes.
2. Quien crea la sala puede iniciar cuando lo decida, incluso estando solo.
3. Cada cliente elige uno de 40 problemas y envía su ticket; puede tener tres abiertos por ronda.
4. Soporte toma un ticket, conversa, edita la configuración JSON o utiliza los controles y pulsa **Aplicar y verificar**.
5. El cliente prueba la operación y confirma el cierre. El Asistente proporciona respuestas absurdas deliberadamente; no usa IA externa ni claves.
6. A los cinco minutos se invierten los roles. Los tickets anteriores quedan congelados como historial. A los diez termina la sesión y se muestran resultados de ambas rondas.

La interfaz sincroniza cada dos segundos. El reloj y los permisos se calculan en el servidor. Para grupos impares un equipo tendrá una persona más. Se admiten nuevos participantes durante ambas rondas: se incorporan al tiempo restante sin reiniciar el reloj. Las salas terminadas no admiten nuevos ingresos. Las sesiones se recuperan al recargar y al reiniciar el servidor. Las salas caducan a las 24 horas; el proceso purga sus registros automáticamente.

## Alcance del laboratorio

28 casos usan un editor de configuración JSON con apariencia de editor de código; 12 usan controles. Los cambios solo afectan al ticket. No ejecuta HTML, JavaScript, comandos ni archivos aportados por estudiantes. Las pruebas comparan el contrato específico de cada incidente y actualizan el resultado simulado. El caso del botón de pago cambia además el estado real habilitado/deshabilitado de su botón de prueba. Los otros casos representan el efecto mediante una operación simulada y su resultado, no mediante sistemas operativos o servicios reales.

El cliente ve únicamente sus tickets, síntomas, conversación y acciones para probar y confirmar la solución. El código, la configuración, el diagnóstico y los criterios técnicos solo se envían a soporte; también se retiran de la vista al cambiar a cliente. El resumen final comparte únicamente resultados agregados.

Los criterios de aceptación son visibles para soporte: está pensado para una práctica inicial de diagnóstico, comunicación y verificación. No es un examen con respuestas secretas. Nombres, tickets y chat deben ser ficticios. El código de sala permite entrar durante la espera; compártelo únicamente con el equipo. Sin cuentas permanentes ni panel docente en esta versión.

## Subir y actualizar con un comando

Desde tu computadora local (donde están los archivos), no desde la consola del VPS:

```bash
bash /home/mariocardenas/Documentos/proyectos/support/deploy.sh root@IP_DEL_VPS
```

Sustituye `IP_DEL_VPS` por la IP pública o un nombre SSH resoluble. Requiere SSH, rsync, Node y npm locales; Docker Compose y rsync en el VPS. Usa tu autenticación SSH habitual. El comando ejecuta las pruebas, copia los archivos a `/opt/technicq-support`, reconstruye solo Support y espera hasta que esté saludable. Conserva `.env`, el volumen SQLite y los demás proyectos Docker. No usa Git remoto ni necesita subir el proyecto a GitHub.

Para la primera instalación, con el DNS de `support.technicq.net` apuntando al VPS y puertos 80/443 accesibles:

```bash
bash /home/mariocardenas/Documentos/proyectos/support/deploy.sh root@IP_DEL_VPS --setup TU_CORREO
```

`--setup` instala el archivo del sitio Nginx y solicita el certificado HTTPS con Certbot. Requiere Nginx, Certbot y el plugin `python3-certbot-nginx` ya instalados. Conserva un archivo existente de ese dominio para no sobrescribir certificados; si ya existe, verifica que apunte a `127.0.0.1:8091`. El ejemplo del sitio usa el puerto 8091; si personalizas `PUBLIC_PORT`, ajusta también Nginx. Repetir el comando sin `--setup` sirve para las siguientes actualizaciones. La solicitud del certificado debe completarse antes de usar la interfaz de producción.

Si ya estás dentro del VPS y los archivos nuevos ya fueron copiados:

```bash
cd /opt/technicq-support && bash ops/deploy-vps.sh
```

Este último comando reconstruye la copia del VPS: no descarga cambios de tu computadora. Si falla la compilación, el contenedor anterior sigue funcionando. Si falla la comprobación de salud después de reemplazarlo, el comando muestra los registros y devuelve error; no hay reversión automática. Para volver atrás, despliega una copia anterior del código con el mismo comando, conservando el volumen.

## VPS: support.technicq.net

Sigue el patrón de `academia academias`: Docker Compose, puerto localhost y proxy Nginx con HTTPS. Usa su propia imagen, volumen, proyecto Compose y puerto **8091**, sin reutilizar secretos ni modificar Academia. Verifica que 8091 esté libre; si lo cambias, cambia también `proxy_pass`.

Desde esta carpeta, después de copiarla al VPS:

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
curl --fail http://127.0.0.1:8091/api/health
```

Crea el registro DNS A de `support.technicq.net` apuntando al VPS (y AAAA solo si IPv6 está configurado). Instala la configuración adicional sin reemplazar los sitios existentes:

```bash
sudo cp ops/nginx.conf /etc/nginx/sites-available/support.technicq.net
sudo ln -s /etc/nginx/sites-available/support.technicq.net /etc/nginx/sites-enabled/support.technicq.net
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d support.technicq.net --redirect
curl --fail https://support.technicq.net/api/health
```

Requiere Nginx y Certbot con su plugin Nginx instalados, como en el VPS de Academia. `PUBLIC_ORIGIN` debe coincidir exactamente con el dominio HTTPS: activa cookies Secure y validación de origen. No uses la interfaz por HTTP con la configuración de producción. Para desarrollo local utiliza `npm start` sin esa variable.

El contenedor utiliza usuario `node`, sistema de archivos de solo lectura, capacidades retiradas, límites de recursos y volumen exclusivo `support-data`. No expone SQLite ni monta Docker o directorios del VPS. El proxy reemplaza X-Real-IP para la limitación de solicitudes. Se limita a 300 salas vigentes, 40 participantes por sala, 120 tickets por sala, 100 mensajes por ticket y 240 escrituras/minuto por IP (los grupos que comparten una IP comparten ese límite).

```bash
# Actualizar después de copiar una versión nueva
docker compose up -d --build
# Diagnóstico
docker compose logs --tail=100 support
# Detener sin borrar datos
docker compose down
```

No ejecutar `down -v` si quieres conservar los datos. Para una copia consistente, detener el servicio y copiar la carpeta data antes de volver a iniciarlo:

```bash
docker compose stop support
docker compose cp support:/app/data ./support-backup
docker compose start support
```

## Validación

```bash
npm test
node --check public/app.js
docker compose config --quiet
docker compose build
```

`tests/browser.mjs` comprueba el flujo de dos usuarios, borrador del editor, bot, intercambio, reparación por controles, resultados, recarga y anchos 320/768/1024/1440. Requiere una instalación de Playwright con Chromium; no es dependencia de ejecución. Se puede indicar su módulo y un Chromium ya instalado:

```bash
PLAYWRIGHT_MODULE=/ruta/playwright/index.mjs CHROMIUM_PATH=/ruta/chrome node tests/browser.mjs
```

Capturas locales en `test-results/` (ignoradas por Git). El catálogo completo está en `catalog.js`. SQLite integrado utiliza la API oficial de Node: https://nodejs.org/docs/latest-v22.x/api/sqlite.html (Node 22 emite un aviso de API experimental).
