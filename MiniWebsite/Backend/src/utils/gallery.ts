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

export function galleryAlbums(items: GalleryItem[]): string[] {
  const albums = items.map((item) => item.album?.trim() || 'General');
  return [...new Set(albums)];
}

export function serializeGallery(items: GalleryItem[]): GalleryItem[] {
  return normalizeGallery(items).map((item, index) => ({
    id: item.id || `gallery-${index}`,
    url: item.url,
    caption: item.caption ?? '',
    album: item.album?.trim() || 'General',
  }));
}
