import type { DanmakuItem } from '../services/types';

export function parseDanmakuXml(xml: string): DanmakuItem[] {
  const re = /<d p="([^"]+)">([^<]*)<\/d>/g;
  const items: DanmakuItem[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const p = m[1].split(',');
    if (p.length < 4) continue;
    const time = parseFloat(p[0]);
    const mode = parseInt(p[1], 10);
    const text = m[2]
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
    if (!text || isNaN(time)) continue;
    if (mode !== 1 && mode !== 4 && mode !== 5) continue;
    items.push({ time, mode: mode as 1|4|5, fontSize: parseInt(p[2],10), color: parseInt(p[3],10), text });
  }
  return items.sort((a, b) => a.time - b.time);
}


export function danmakuColorToCss(color: number): string {
  return '#' + (color >>> 0 & 0xFFFFFF).toString(16).padStart(6, '0');
}

