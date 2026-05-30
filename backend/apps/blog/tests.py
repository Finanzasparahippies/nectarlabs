from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

from apps.users.models import User
from apps.blog.models import Post, Category

class BlogAppTests(APITestCase):
    def setUp(self):
        # Create author
        self.author = User.objects.create_superuser(
            email='author@example.com',
            username='author',
            password='password123',
            role=User.Role.ADMIN,
            is_email_verified=True
        )
        
        # Create categories
        self.cat1 = Category.objects.create(name="Tech", slug="tech")
        self.cat2 = Category.objects.create(name="Business", slug="business")
        
        # Create posts
        self.published_post = Post.objects.create(
            title="Published Tech Post",
            slug="published-tech-post",
            author=self.author,
            content="This is content of tech post",
            category=self.cat1,
            is_published=True,
            is_case_study=False
        )
        
        self.published_case_study = Post.objects.create(
            title="Published Business Case Study",
            slug="published-business-case-study",
            author=self.author,
            content="This is content of case study",
            category=self.cat2,
            is_published=True,
            is_case_study=True
        )
        
        self.unpublished_post = Post.objects.create(
            title="Unpublished Tech Post",
            slug="unpublished-tech-post",
            author=self.author,
            content="This is content of unpublished tech post",
            category=self.cat1,
            is_published=False,
            is_case_study=False
        )

    def test_list_only_returns_published_posts(self):
        """Verify that public list endpoint only returns published posts."""
        url = "/api/posts/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should return 2 posts (published_post and published_case_study)
        self.assertEqual(len(response.data), 2)
        slugs = [p['slug'] for p in response.data]
        self.assertIn("published-tech-post", slugs)
        self.assertIn("published-business-case-study", slugs)
        self.assertNotIn("unpublished-tech-post", slugs)

    def test_filter_by_is_case_study_true(self):
        """Verify query param filters only case studies."""
        url = "/api/posts/?is_case_study=true"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['slug'], "published-business-case-study")

    def test_filter_by_is_case_study_false(self):
        """Verify query param filters non-case studies."""
        url = "/api/posts/?is_case_study=false"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['slug'], "published-tech-post")

    def test_retrieve_published_post_succeeds(self):
        """Verify retrieving published post by slug works."""
        url = "/api/posts/published-tech-post/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "Published Tech Post")

    def test_retrieve_unpublished_post_fails_with_404(self):
        """Verify retrieving unpublished post returns 404."""
        url = "/api/posts/unpublished-tech-post/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_write_operations_return_405(self):
        """Verify that write operations (POST, PUT, DELETE) are blocked."""
        url = "/api/posts/"
        response = self.client.post(url, data={
            'title': 'New Post',
            'slug': 'new-post',
            'author': self.author.id,
            'content': 'Some content',
            'is_published': True
        })
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        
        detail_url = "/api/posts/published-tech-post/"
        response = self.client.put(detail_url, data={
            'title': 'Updated Title',
            'slug': 'published-tech-post',
            'author': self.author.id,
            'content': 'Updated content',
            'is_published': True
        })
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
