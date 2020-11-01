# chat/views.py
from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.models import User
from .models import Player

def index(request):
    return render(request, 'api/index.html')

def room(request, room_name):
    return render(request, 'api/room.html', {
        'room_name': room_name
    })

def create_user(request):
    username = request.GET['username']
    try:
        User.objects.get(username=username)
    except User.DoesNotExist:
        user = User.objects.create_user(username)
        player = Player.objects.create(user=user, is_imposter=False, sequence='')
        user.save()
        player.save()
        return JsonResponse({'message': 'success'})
    else:
        return JsonResponse({'message': 'Name taken.'})

def lobby(request):
    return render(request, 'api/lobby.html')
