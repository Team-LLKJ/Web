import pathlib
import subprocess
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).parents[1] / 'scripts/configure-web-nginx.py'

class NginxRoutingTest(unittest.TestCase):
    def test_preserves_tls_acme_and_api_proxy_and_is_idempotent(self):
        original = '''server {
 listen 80;
 location /.well-known/acme-challenge/ { root /var/www/lit-acme; }
 location / { return 301 https://$host$request_uri; }
}
server {
 listen 443 ssl;
 ssl_certificate /etc/lit/fullchain.pem;
 client_max_body_size 8m;
 location / {
  proxy_pass http://127.0.0.1:5174;
  proxy_set_header Host $host;
 }
}
'''
        with tempfile.TemporaryDirectory() as folder:
            path = pathlib.Path(folder) / 'site'
            path.write_text(original)
            subprocess.run(['python3', str(SCRIPT), str(path)], check=True)
            result = path.read_text()
            for value in ['listen 443 ssl;', 'ssl_certificate /etc/lit/fullchain.pem;', 'client_max_body_size 8m;', 'location /.well-known/acme-challenge/', 'return 301 https://$host$request_uri;', 'location ^~ /api/', 'location ^~ /actuator/', 'try_files $uri $uri/ /index.html;', 'try_files $uri =404;']:
                self.assertIn(value, result)
            self.assertEqual(result.count('proxy_pass http://127.0.0.1:5174;'), 2)
            self.assertEqual(result.count('proxy_set_header Host $host;'), 2)
            subprocess.run(['python3', str(SCRIPT), str(path)], check=True)
            self.assertEqual(path.read_text(), result)

    def test_unexpected_config_is_not_rewritten(self):
        with tempfile.TemporaryDirectory() as folder:
            path = pathlib.Path(folder) / 'site'
            original = 'server { location / { proxy_pass http://other:9000; } }'
            path.write_text(original)
            result = subprocess.run(['python3', str(SCRIPT), str(path)], capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(path.read_text(), original)

if __name__ == '__main__':
    unittest.main()
