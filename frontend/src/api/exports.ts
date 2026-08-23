import { api, toQuery } from './client';
import type { Color } from './types';

export type ExportFormat = 'md' | 'csv' | 'json';

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const exportsApi = {
  document: async (documentId: number, format: ExportFormat) => {
    const { blob, filename } = await api.download(
      `/documents/${documentId}/export${toQuery({ format })}`,
    );
    save(blob, filename ?? `annotations.${format}`);
  },
  highlights: async (
    format: ExportFormat,
    filters: { tag?: string | null; color?: Color | null; collectionId?: number | null } = {},
  ) => {
    const { blob, filename } = await api.download(
      `/export${toQuery({
        format,
        tag: filters.tag,
        color: filters.color,
        collection_id: filters.collectionId,
      })}`,
    );
    save(blob, filename ?? `highlights.${format}`);
  },
};
