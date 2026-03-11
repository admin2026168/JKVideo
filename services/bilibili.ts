import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import pako from 'pako';
import type { VideoItem, Comment, PlayUrlResponse, QRCodeInfo, VideoShotData, HeatmapResponse, DanmakuItem } from './types';
import { signWbi } from '../utils/wbi';
import { parseDanmakuXml } from '../utils/danmaku';

const isWeb = Platform.OS === 'web';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const BASE = isWeb ? 'http://localhost:3001/bilibili-api' : 'https://api.bilibili.com';
const PASSPORT = isWeb ? 'http://localhost:3001/bilibili-passport' : 'https://passport.bilibili.com';
const COMMENT_BASE = isWeb
  ? 'http://localhost:3001/bilibili-comment'
  : 'https://comment.bilibili.com';

function generateBuvid3(): string {
  const h = () => Math.floor(Math.random() * 16).toString(16);
  const s = (n: number) => Array.from({ length: n }, h).join('');
  return `${s(8)}-${s(4)}-${s(4)}-${s(4)}-${s(12)}infoc`;
}

async function getBuvid3(): Promise<string> {
  let buvid3 = await AsyncStorage.getItem('buvid3');
  if (!buvid3) {
    buvid3 = generateBuvid3();
    await AsyncStorage.setItem('buvid3', buvid3);
  }
  return buvid3;
}

const api = axios.create({
  baseURL: BASE,
  timeout: 10000,
  headers: isWeb ? {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  } : {
    'User-Agent': UA,
    'Referer': 'https://www.bilibili.com',
    'Origin': 'https://www.bilibili.com',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  },
});

api.interceptors.request.use(async (config) => {
  const [sessdata, buvid3] = await Promise.all([
    AsyncStorage.getItem('SESSDATA'),
    getBuvid3(),
  ]);
  if (isWeb) {
    // Browsers block Cookie/Referer/Origin headers; relay via custom headers to proxy
    if (buvid3) config.headers['X-Buvid3'] = buvid3;
    if (sessdata) config.headers['X-Sessdata'] = sessdata;
  } else {
    const cookies: string[] = [`buvid3=${buvid3}`];
    if (sessdata) cookies.push(`SESSDATA=${sessdata}`);
    config.headers['Cookie'] = cookies.join('; ');
  }
  return config;
});

// WBI key cache (rotates ~daily, reuse within process lifetime)
let wbiKeys: { imgKey: string; subKey: string } | null = null;

async function getWbiKeys(): Promise<{ imgKey: string; subKey: string }> {
  if (wbiKeys) return wbiKeys;
  const res = await api.get('/x/web-interface/nav');
  const { img_url, sub_url } = res.data.data.wbi_img;
  const extract = (url: string) => url.split('/').pop()!.replace(/\.\w+$/, '');
  wbiKeys = { imgKey: extract(img_url), subKey: extract(sub_url) };
  return wbiKeys;
}

export async function getRecommendFeed(freshIdx = 0): Promise<VideoItem[]> {
  const { imgKey, subKey } = await getWbiKeys();
  const signed = signWbi(
    { fresh_type: 3, fresh_idx: freshIdx, fresh_idx_1h: freshIdx, ps: 21, feed_version: 'V8' },
    imgKey,
    subKey,
  );
  const res = await api.get('/x/web-interface/wbi/index/top/feed/rcmd', { params: signed });
  const items: any[] = res.data.data?.item ?? [];
  return items
    .map(item => ({
      ...item,
      aid: item.id ?? item.aid,
      pic: item.pic ?? item.cover,
      owner: item.owner ?? { mid: 0, name: item.owner_info?.name ?? '', face: item.owner_info?.face ?? '' },
    })) as VideoItem[];
}

export async function getPopularVideos(pn = 1): Promise<VideoItem[]> {
  const res = await api.get('/x/web-interface/popular', { params: { pn, ps: 20 } });
  return res.data.data.list as VideoItem[];
}

export async function getVideoDetail(bvid: string): Promise<VideoItem> {
  const res = await api.get('/x/web-interface/view', { params: { bvid } });
  return res.data.data as VideoItem;
}

export async function getPlayUrl(bvid: string, cid: number, qn = 64): Promise<PlayUrlResponse> {
  const isAndroid = Platform.OS === 'android';
  const params = isAndroid
    ? { bvid, cid, qn, fnval: 16, fourk: 1 }
    : { bvid, cid, qn, fnval: 0, platform: 'html5', fourk: 1 };
  const res = await api.get('/x/player/playurl', { params });
  return res.data.data as PlayUrlResponse;
}

export async function getUserInfo(): Promise<{ face: string; uname: string; mid: number }> {
  const res = await api.get('/x/web-interface/nav');
  const { face, uname, mid } = res.data.data;
  return { face: face ?? '', uname: uname ?? '', mid: mid ?? 0 };
}

export async function getComments(aid: number, pn = 1): Promise<Comment[]> {
  const res = await api.get('/x/v2/reply', {
    params: { oid: aid, type: 1, pn, ps: 20, sort: 2 },
  });
  return (res.data.data?.replies ?? []) as Comment[];
}

export async function getHeatmap(bvid: string): Promise<HeatmapResponse | null> {
  try {
    const res = await api.get('/pbp/data', { params: { bvid } });
    return res.data.data as HeatmapResponse;
  } catch { return null; }
}

export async function getVideoShot(bvid: string, cid: number): Promise<VideoShotData | null> {
  try {
    const res = await api.get('/x/player/videoshot', {
      params: { bvid, cid, index: 1 },
    });
    return res.data.data as VideoShotData;
  } catch { return null; }
}

export async function generateQRCode(): Promise<QRCodeInfo> {
  const headers = isWeb
    ? {}
    : { 'Referer': 'https://www.bilibili.com' };
  const res = await axios.get(`${PASSPORT}/x/passport-login/web/qrcode/generate`, { headers });
  return res.data.data as QRCodeInfo;
}

export async function pollQRCode(qrcode_key: string): Promise<{ code: number; cookie?: string }> {
  const headers = isWeb
    ? {}
    : { 'Referer': 'https://www.bilibili.com' };
  const res = await axios.get(`${PASSPORT}/x/passport-login/web/qrcode/poll`, {
    params: { qrcode_key },
    headers,
  });
  const { code } = res.data.data;
  let cookie: string | undefined;
  if (code === 0) {
    if (isWeb) {
      // Proxy relays SESSDATA via custom response header
      cookie = res.headers['x-sessdata'] as string | undefined;
    } else {
      const setCookie = res.headers['set-cookie'];
      const match = setCookie?.find((c: string) => c.includes('SESSDATA'));
      if (match) {
        cookie = match.split(';')[0].replace('SESSDATA=', '');
      }
    }
  }
  return { code, cookie };
}


export async function getDanmaku(cid: number): Promise<DanmakuItem[]> {
  try {
    if (isWeb) {
      // web 走代理，代理已解压，直接拿文本
      const res = await axios.get(`${COMMENT_BASE}/${cid}.xml`, {
        headers: {},
        responseType: 'text',
      });
      return parseDanmakuXml(res.data);
    }

    // Native 策略 1：responseType: 'text'，依赖 OkHttp 自动解压
    const res = await axios.get(`${COMMENT_BASE}/${cid}.xml`, {
      headers: { Referer: 'https://www.bilibili.com', 'User-Agent': UA },
      responseType: 'text',
    });

    if (typeof res.data === 'string' && res.data.includes('<d ')) {
      return parseDanmakuXml(res.data);
    }

    // 策略 2 回退：arraybuffer + pako 手动解压
    const res2 = await axios.get(`${COMMENT_BASE}/${cid}.xml`, {
      headers: { Referer: 'https://www.bilibili.com', 'User-Agent': UA },
      responseType: 'arraybuffer',
    });

    const bytes = new Uint8Array(res2.data as ArrayBuffer);
    let xmlText: string;
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      xmlText = pako.inflate(bytes, { to: 'string' });
    } else {
      xmlText = new TextDecoder('utf-8').decode(bytes);
    }
    return parseDanmakuXml(xmlText);
  } catch (e) {
    console.warn('getDanmaku failed:', e);
    return [];
  }
}
