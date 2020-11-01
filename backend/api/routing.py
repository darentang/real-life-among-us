from django.urls import re_path, path

from . import consumers

websocket_urlpatterns = [
    # re_path(r'ws/api/(?P<room_name>\w+)/$', consumers.ChatConsumer.as_asgi()),
    path('ws/api/lobby/', consumers.LobbyConsumer.as_asgi()),
]