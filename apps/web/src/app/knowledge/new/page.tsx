'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/utils';

export default function NewArticlePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await apiRequest('/kb/articles', {
        method: 'POST',
        body: JSON.stringify({
          title,
          content,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          sourceType: 'manual'
        }),
      });
      router.push('/knowledge');
    } catch (error) {
      console.error('Error creating article:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Nuevo Artículo</h1>
        <p className="text-muted-foreground">Crear artículo en Knowledge Base</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Artículo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">
                Título
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label htmlFor="content" className="block text-sm font-medium mb-1">
                Contenido
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 border rounded-md min-h-[200px]"
                required
              />
            </div>
            <div>
              <label htmlFor="tags" className="block text-sm font-medium mb-1">
                Tags (separados por coma)
              </label>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="tracking, pedidos, seguimiento"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Artículo'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
