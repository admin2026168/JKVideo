import { useState, useCallback, useRef } from 'react';
import { getRecommendFeed } from '../services/bilibili';
import type { VideoItem } from '../services/types';

export function useVideoList() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Use refs to avoid stale closures — load() has stable identity
  const loadingRef = useRef(false);
  const freshIdxRef = useRef(0);

  const load = useCallback(async (reset = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const idx = reset ? 0 : freshIdxRef.current;
    setLoading(true);
    try {
      const data = await getRecommendFeed(idx);
      setVideos(prev => reset ? data : [...prev, ...data]);
      freshIdxRef.current = idx + 1;
    } catch (e) {
      console.error('Failed to load videos', e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // stable — no stale closure risk

  const refresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  return { videos, loading, refreshing, load, refresh };
}
