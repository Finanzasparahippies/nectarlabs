from rest_framework import serializers
from .models import Project, TimeLog, FAQ

class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = '__all__'

class TimeLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeLog
        fields = '__all__'

class ProjectSerializer(serializers.ModelSerializer):
    logs = TimeLogSerializer(many=True, read_only=True)
    
    class Meta:
        model = Project
        fields = '__all__'
