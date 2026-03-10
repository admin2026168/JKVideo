import { useState, useEffect, useRef } from 'react';
import { getVideoDetail, getPlayUrl } from '../services/bilibili';
import { useAuthStore } from '../store/authStore';
import type { VideoItem, PlayUrlResponse } from '../services/types';

export function useVideoDetail(bvid: string) {
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [playData, setPlayData] = useState<PlayUrlResponse | null>(null);
  const [qualities, setQualities] = useState<{ qn: number; desc: string }[]>([]);
  const [currentQn, setCurrentQn] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cidRef = useRef<number>(0);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  async function fetchPlayData(cid: number, qn: number, updateList = false) {
    const data = await getPlayUrl(bvid, cid, qn);
    setPlayData(data);
    setCurrentQn(data.quality);
    if (updateList && data.accept_quality?.length) {
      setQualities(
        data.accept_quality.map((q, i) => ({
          qn: q,
          desc: data.accept_description?.[i] ?? String(q),
        }))
      );
    }
  }

  async function changeQuality(qn: number) {
    await fetchPlayData(cidRef.current, qn);
  }

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const detail = await getVideoDetail(bvid);
        setVideo(detail);
        const cid = detail.pages?.[0]?.cid ?? detail.cid;
        cidRef.current = cid;
        await fetchPlayData(cid, 120, true);
      } catch (e: any) {
        setError(e.message ?? 'Load failed');
      } finally {
        setLoading(false);
      }
    }
    if (bvid) fetchData();
  }, [bvid]);

  // 登录状态变化时重新拉取清晰度列表（登录后可能获得更高画质）
  useEffect(() => {
    if (cidRef.current) {
      fetchPlayData(cidRef.current, 120, true).catch(() => {});
    }
  }, [isLoggedIn]);

  return { video, playData, loading, error, qualities, currentQn, changeQuality };
}
