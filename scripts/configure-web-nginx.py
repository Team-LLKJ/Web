"""Replace only the existing HTTPS catch-all backend proxy with SPA routing."""
from pathlib import Path
import re, sys
path = Path(sys.argv[1])
text = path.read_text()
marker = '# LIT_WEB_SPA_V1'
if marker in text:
    raise SystemExit(0)
blocks = []
for match in re.finditer(r'location\s+/\s*\{', text):
    depth = 1
    end = match.end()
    while depth and end < len(text):
        depth += (text[end] == '{') - (text[end] == '}')
        end += 1
    body = text[match.end():end-1]
    if re.search(r'proxy_pass\s+http://127\.0\.0\.1:5174\s*;', body):
        blocks.append((match.start(), end, body))
if len(blocks) != 1:
    raise SystemExit('Expected exactly one existing LIT backend catch-all proxy; config left unchanged')
start, end, proxy = blocks[0]
replacement = '''# LIT_WEB_SPA_V1
    location ^~ /api/ {''' + proxy + '''}
    location ^~ /actuator/ {''' + proxy + '''}
    location /assets/ {
        root /var/www/lit-web/current;
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    location = /index.html {
        root /var/www/lit-web/current;
        add_header Cache-Control "no-cache";
    }
    location / {
        root /var/www/lit-web/current;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }'''
path.write_text(text[:start] + replacement + text[end:])
