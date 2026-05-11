from django.contrib import admin
from .models import Ticket, Message

class MessageInline(admin.TabularInline):
    model = Message
    extra = 1
    readonly_fields = ('sender', 'created_at')

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('title', 'client', 'category', 'status', 'priority', 'created_at')
    list_filter = ('status', 'priority', 'category', 'created_at')
    search_fields = ('title', 'description', 'client__email')
    inlines = [MessageInline]
    
    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for instance in instances:
            if isinstance(instance, Message) and not instance.pk:
                instance.sender = request.user
            instance.save()
        formset.save_m2m()
