import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { VideoItem, Comment, PlayUrlResponse, QRCodeInfo } from './types';

const isWeb = Platform.OS === 'web';
const BASE     = isWeb ? 'http://localhost:3001/bilibili-api'      : 'https://api.bilibili.com';
const PASSPORT = isWeb ? 'http://localhost:3001/bilibili-passport' : 'https://passport.bilibili.com';

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
    'Accept':          'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  } : {
    'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer':         'https://www.bilibili.com',
    'Origin':          'https://www.bilibili.com',
    'Accept':          'application/json, text/plain, */*',
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
    if (buvid3)   config.headers['X-Buvid3']  = buvid3;
    if (sessdata) config.headers['X-Sessdata'] = sessdata;
  } else {
    const cookies: string[] = [`buvid3=${buvid3}`];
    if (sessdata) cookies.push(`SESSDATA=${sessdata}`);
    config.headers['Cookie'] = cookies.join('; ');
  }
  return config;
});

export async function getPopularVideos(pn = 1): Promise<VideoItem[]> {
  const res = await api.get('/x/web-interface/popular', { params: { pn, ps: 20 } });
  return res.data.data.list as VideoItem[];
}

export async function getVideoDetail(bvid: string): Promise<VideoItem> {
  const res = await api.get('/x/web-interface/view', { params: { bvid } });
  return res.data.data as VideoItem;
}

export async function getPlayUrl(bvid: string, cid: number, qn = 64): Promise<PlayUrlResponse> {
  const fnval = qn >= 80 ? 16 : 0;
  const res = await api.get('/x/player/playurl', {
    params: { bvid, cid, qn, fnval, platform: 'html5', fourk: 1 },
  });
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
