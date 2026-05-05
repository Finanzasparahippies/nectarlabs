from rest_framework import viewsets
from .models import Post, Category
from rest_framework import serializers

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class PostSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    class Meta:
        model = Post
        fields = '__all__'

class PostViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Post.objects.filter(is_published=True).order_by('-created_at')
    serializer_class = PostSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        queryset = super().get_queryset()
        is_case_study = self.request.query_params.get('is_case_study', None)
        if is_case_study is not None:
            queryset = queryset.filter(is_case_study=is_case_study == 'true')
        return queryset
