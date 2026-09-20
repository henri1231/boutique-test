#from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def home(request):
    return JsonResponse({
        "status": "ok", 
        "message": "Boutique API en ligne !",
        "admin": "/admin/",
        "api": "/api/"
    })

urlpatterns = [
    path('', home, name='home'),
    path('admin/', admin.site.urls),
    #path('api/', include('boutique.urls')),
]

from django.conf import settings
from django.conf.urls.static import static
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
