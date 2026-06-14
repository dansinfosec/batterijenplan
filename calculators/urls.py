from django.urls import path
from . import views

urlpatterns = [
    path(
        "thuisbatterij-calculator/", 
        views.thuisbatterij_calculator, 
        name="thuisbatterij_calculator"
        ),
    ]