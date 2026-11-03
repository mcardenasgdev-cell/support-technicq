#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if [[ $# != 1 && $# != 3 ]]; then
  echo "Uso: bash deploy.sh usuario@IP [--setup correo@ejemplo.com]" >&2
  exit 2
fi
remote=$1
if [[ ! $remote =~ ^[a-zA-Z0-9_][a-zA-Z0-9_.-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]]; then
  echo 'Destino inválido. Usa usuario@IP o usuario@dominio.' >&2
  exit 2
fi
mode=${2:-update}
email=${3:-}
if [[ $# == 3 && ( $mode != --setup || ! $email =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ) ]]; then
  echo 'Para la instalación inicial usa --setup y un correo válido para Certbot.' >&2
  exit 2
fi
for tool in ssh rsync node npm; do
  command -v "$tool" >/dev/null || { echo "Falta $tool en esta computadora." >&2; exit 1; }
done
node --check public/app.js
npm test
ssh "$remote" 'command -v rsync >/dev/null && docker compose version >/dev/null && mkdir -p /opt/technicq-support'
# Sin --delete: conserva .env y archivos propios del servidor. SQLite vive en un volumen aparte.
rsync -az --exclude='.git/' --exclude='.env' --exclude='data/' \
  --exclude='node_modules/' --exclude='test-results/' --exclude='support-backup/' \
  ./ "$remote:/opt/technicq-support/"
# Los argumentos remotos solo contienen caracteres permitidos por la validación anterior.
ssh "$remote" "cd /opt/technicq-support && bash ops/deploy-vps.sh '$mode' '$email'"
