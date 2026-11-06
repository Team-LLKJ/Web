#!/usr/bin/env bash
set -Eeuo pipefail
revision=${1:?revision required}
[[ "$revision" =~ ^[a-f0-9]{40}$ ]]
source_dir=${2:?built artifact directory required}
test -s "$source_dir/index.html"
test -d "$source_dir/assets"
base=/var/www/lit-web
release="$base/releases/$revision"
sudo install -d -o ubuntu -g ubuntu "$base" "$base/releases"
if [ ! -d "$release" ]; then
  mkdir "$release"
  cp -R "$source_dir/." "$release/"
  chmod -R a+rX "$release"
fi
previous=$(readlink "$base/current" || true)
config=$(readlink -f /etc/nginx/sites-enabled/lit)
backup=$(mktemp)
sudo cp "$config" "$backup"
rollback() {
  trap - ERR
  echo 'Deployment failed; restoring previous frontend and nginx config' >&2
  if [ -n "$previous" ]; then ln -sfn "$previous" "$base/rollback-link"; mv -Tf "$base/rollback-link" "$base/current"; else rm -f "$base/current"; fi
  sudo cp "$backup" "$config"
  sudo nginx -t && sudo systemctl reload nginx
  rm -f "$backup"
  exit 1
}
trap rollback ERR
ln -sfn "$release" "$base/next-link"
mv -Tf "$base/next-link" "$base/current"
# Keep the existing TLS, ACME, request limits and backend proxy headers.
sudo python3 scripts/configure-web-nginx.py "$config"
sudo nginx -t
sudo systemctl reload nginx
probe=$(mktemp)
curl --fail --silent --show-error --retry 5 --retry-all-errors --retry-delay 1 --connect-timeout 5 --max-time 15 https://3.25.143.224/ -o "$probe"
cmp "$release/index.html" "$probe"
curl --fail --silent --show-error --connect-timeout 5 --max-time 15 https://3.25.143.224/__lit_spa_probe -o "$probe"
cmp "$release/index.html" "$probe"
curl --fail --silent --show-error --connect-timeout 5 --max-time 15 https://3.25.143.224/actuator/health/readiness
rm -f "$probe" "$backup"
trap - ERR
printf 'Frontend deployed: %s\n' "$revision"
# Retain the active release and the previous two releases for rollback.
python3 - "$base" <<'PY'
from pathlib import Path
import re,shutil,sys
base=Path(sys.argv[1]); active=(base/'current').resolve()
releases=sorted((p for p in (base/'releases').iterdir() if p.is_dir() and re.fullmatch('[a-f0-9]{40}',p.name)),key=lambda p:p.stat().st_mtime,reverse=True)
keep={active,*releases[:3]}
for p in releases:
 if p not in keep:shutil.rmtree(p)
PY
