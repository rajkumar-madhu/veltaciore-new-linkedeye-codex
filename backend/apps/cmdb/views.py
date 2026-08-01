from rest_framework import serializers, viewsets

from apps.tenants.mixins import TenantScopedQuerysetMixin
from .models import Article, ConfigItem


class ConfigItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfigItem
        fields = ["id", "name", "cls", "env", "region", "owner", "health", "deps"]


class ArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = ["id", "title", "cat", "views", "upd", "author", "rating", "tag"]


class ConfigItemViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = ConfigItem.objects.all()
    serializer_class = ConfigItemSerializer
    filterset_fields = ["cls", "env", "health"]
    search_fields = ["id", "name", "region", "owner"]


class ArticleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    filterset_fields = ["cat", "tag"]
    search_fields = ["id", "title", "author"]
