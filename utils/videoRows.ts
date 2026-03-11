import type { VideoItem } from '../services/types';

export interface NormalRow {
  type: 'pair';
  left: VideoItem;
  right: VideoItem | null;
}

export interface BigRow {
  type: 'big';
  item: VideoItem;
}

export type ListRow = NormalRow | BigRow;

const PAGE = 21; // matches API page size

/**
 * Transform a flat VideoItem array into display rows.
 * Videos are chunked by page size (20). The last item of each chunk
 * becomes a full-width BigRow so BigVideoCards stay at stable positions
 * even as more pages are loaded.
 */

export function toListRows(videos: VideoItem[]): ListRow[] {
  if (videos.length === 0) return [];
  const rows: ListRow[] = [];
  for (let start = 0; start < videos.length; start += PAGE) {
    const chunk = videos.slice(start, start + PAGE);
    const body = chunk.slice(0, chunk.length - 1);
    for (let i = 0; i < body.length; i += 2) {
      rows.push({ type: 'pair', left: body[i], right: body[i + 1] ?? null });
    }
    rows.push({ type: 'big', item: chunk[chunk.length - 1] });
  }

  return rows;
}
