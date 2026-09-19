import os
import sys

# Ajoute backend au path
BASE_DIR = os.path.dirname(__file__)
sys.path.append(os.path.join(BASE_DIR, '..', 'backend'))
sys.path.append(os.path.join(BASE_DIR, '..'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

from django.core.wsgi import get_wsgi_application
django_app = get_wsgi_application()

def app(environ, start_response):
    # FIX VERCEL : Vercel met PATH_INFO = /api/index.py au lieu de /admin/
    # On restaure la vraie URL
    path_info = environ.get('PATH_INFO', '')
    request_uri = environ.get('REQUEST_URI', '') or environ.get('RAW_URI', '') or environ.get('HTTP_X_ORIGINAL_URL', '')

    if path_info == '/api/index.py' or path_info.startswith('/api/index.py'):
        # La vraie route est dans REQUEST_URI qui contient /admin/ ou /api/...
        if request_uri:
            clean_path = request_uri.split('?')[0]
            # Si c'est encore /api/index.py, on met /
            if clean_path in ['/api/index.py', '/api/index']:
                clean_path = '/'
            environ['PATH_INFO'] = clean_path
        else:
            # Fallback : si on ne trouve pas, on force / pour éviter 404 sur api/index.py
            environ['PATH_INFO'] = '/'
        environ['SCRIPT_NAME'] = ''

    return django_app(environ, start_response)
