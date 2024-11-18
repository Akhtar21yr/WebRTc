from django.urls import path
from .consumers import ChatConsumer

ws_urlpattern = [
    path('',ChatConsumer.as_asgi()),
]