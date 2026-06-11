from django.contrib import admin
from .models import Category, Post

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'category', 'is_published', 'is_case_study', 'created_at')
    list_filter = ('is_published', 'is_case_study', 'category', 'author')
    search_fields = ('title', 'content')
    prepopulated_fields = {'slug': ('title',)}
    date_hierarchy = 'created_at'
    actions = ['send_to_newsletter']

    @admin.action(description='Enviar post seleccionado por newsletter')
    def send_to_newsletter(self, request, queryset):
        from apps.newsletter.models import Subscriber, send_newsletter_email
        from django.conf import settings
        from django.contrib import messages
        
        sent_count = 0
        subscribers = Subscriber.objects.filter(tenant__isnull=True, is_active=True)
        if not subscribers.exists():
            self.message_user(request, "No hay suscriptores activos para la plataforma principal.", messages.WARNING)
            return

        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://nectarlabs.dev')

        for post in queryset:
            subject = f"Nuevo Post: {post.title}"
            for sub in subscribers:
                context = {
                    "subject": subject,
                    "title": post.title,
                    "content": post.content,
                    "cta_url": f"{frontend_url}/blog/{post.slug}",
                    "cta_text": "Leer Artículo",
                    "unsubscribe_url": f"{frontend_url}/unsubscribe?email={sub.email}&token={sub.token}"
                }
                try:
                    send_newsletter_email(
                        subject=subject,
                        template_name="generic",
                        context=context,
                        recipient_list=[sub.email],
                        tenant=None
                    )
                    sent_count += 1
                except Exception as e:
                    self.message_user(request, f"Error al enviar correo a {sub.email}: {e}", messages.ERROR)

        self.message_user(request, f"Se enviaron con éxito {sent_count} correos a suscriptores.", messages.SUCCESS)

