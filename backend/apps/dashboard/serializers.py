from rest_framework import serializers
from .models import Project, TimeLog, FAQ, ProjectAdvance

class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = '__all__'

class TimeLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeLog
        fields = '__all__'

class ProjectAdvanceSerializer(serializers.ModelSerializer):
    delivered_by_email = serializers.EmailField(source='delivered_by.email', read_only=True)

    class Meta:
        model = ProjectAdvance
        fields = '__all__'

class ProjectSerializer(serializers.ModelSerializer):
    logs = TimeLogSerializer(many=True, read_only=True)
    advances = ProjectAdvanceSerializer(many=True, read_only=True)
    plan_hours = serializers.ReadOnlyField()
    used_hours_current_month = serializers.ReadOnlyField()
    remaining_hours_current_month = serializers.ReadOnlyField()
    unlocked_milestones = serializers.ReadOnlyField()
    
    class Meta:
        model = Project
        fields = '__all__'
