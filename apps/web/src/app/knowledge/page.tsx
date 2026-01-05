'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/utils';
import Link from 'next/link';

interface Article {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
}

export default function KnowledgePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    try {
      const data = await apiRequest<Article[]>('/kb/articles');
      setArticles(data);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      loadArticles();
      return;
    }

    try {
      const data = await apiRequest<Article[]>(`/kb/search?q=${encodeURIComponent(searchQuery)}`);
      setArticles(data);
    } catch (error) {
      console.error('Error searching:', error);
    }
  }

  if (loading) {
    return <div>Cargando artículos...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Información</h1>
          <p className="text-muted-foreground">Base de conocimientos</p>
        </div>
        <Link href="/knowledge/new">
          <Button>Nuevo Artículo</Button>
        </Link>
      </div>

      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar información..."
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <Button onClick={handleSearch}>Buscar</Button>
        </div>
      </div>

      <div className="space-y-4">
        {articles.map((article) => (
          <Card key={article.id}>
            <CardHeader>
              <CardTitle>{article.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3">{article.content}</p>
              <div className="flex gap-2 mt-2">
                {article.tags.map((tag) => (
                  <span key={tag} className="px-2 py-1 bg-muted rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Creado: {new Date(article.createdAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
        {articles.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay artículos
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
