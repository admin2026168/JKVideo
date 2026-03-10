export interface VideoItem {
  bvid: string;
  aid: number;
  title: string;
  pic: string;
  owner: {
    mid: number;
    name: string;
    face: string;
  };
  stat: {
    view: number;
    danmaku: number;
    reply: number;
    like: number;
    coin: number;
    favorite: number;
  };
  duration: number;
  desc: string;
  cid: number;
  pages?: Array<{ cid: number; part: string }>;
}

export interface Comment {
  rpid: number;
  content: { message: string };
  member: {
    uname: string;
    avatar: string;
  };
  like: number;
  ctime: number;
  replies: Comment[] | null;
}

export interface PlayUrlResponse {
  durl?: Array<{
    url: string;
    length: number;
    size: number;
  }>;
  dash?: {
    video: Array<{ id: number; baseUrl: string; codecs: string; bandwidth: number }>;
    audio: Array<{ id: number; baseUrl: string; codecs: string; bandwidth: number }>;
  };
  quality: number;
  accept_quality: number[];
  accept_description: string[];
}

export interface QRCodeInfo {
  url: string;
  qrcode_key: string;
}
