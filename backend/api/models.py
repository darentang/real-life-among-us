from django.db import models
from django.contrib.auth.models import User

class Player(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    is_imposter = models.BooleanField()
    sequence = models.CharField(max_length=50)