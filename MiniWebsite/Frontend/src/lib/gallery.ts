export interface GalleryItem {
  id: string;
  url: string;
  caption?: string;
  album?: string;
}

export function normalizeGallery(raw: unknown): GalleryItem[] {
  if (!Array.isArray(raw)) return [];

  const items: GalleryItem[] = [];
  raw.forEach((item, index) => {
    if (typeof item === 'string') {
      const url = item.trim();
      if (!url) return;
      items.push({ id: `gallery-${index}`, url, caption: '', album: 'General' });
      return;
    }
    if (item && typeof item === 'object') {
      const row = item as { id?: string; url?: string; caption?: string; album?: string };
      const url = String(row.url ?? '').trim();
      if (!url) return;
      items.push({
        id: row.id?.trim() || `gallery-${index}`,
        url,
        caption: row.caption?.trim() || '',
        album: row.album?.trim() || 'General',
      });
    }
  });

  return items;
}

export function createGalleryItem(url: string, album = 'General'): GalleryItem {
  return {
    id: `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url,
    caption: '',
    album,
  };
}

export function galleryAlbums(items: GalleryItem[]): string[] {
  const albums = items.map((item) => item.album?.trim() || 'General');
  return [...new Set(albums)];
}
