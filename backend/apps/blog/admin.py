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

