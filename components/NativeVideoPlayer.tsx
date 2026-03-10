import React, { useState } from 'react';
import {
  View, StyleSheet, Dimensions, TouchableOpacity,
  Text, Modal, FlatList,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { buildMpd } from '../utils/buildMpd';
import type { PlayUrlResponse } from '../services/types';

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = width * 0.5625;

interface Props {
  playData: PlayUrlResponse | null;
  qualities: { qn: number; desc: string }[];
  currentQn: number;
  onQualityChange: (qn: number) => void;
  onFullscreen: () => void;
  onMiniPlayer?: () => void;
  style?: object;
}

function buildMp4Html(url: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>* { margin:0; padding:0; box-sizing:border-box; background:#000; } video { width:100vw; height:100vh; object-fit:contain; display:block; }</style>
</head>
<body>
<video id="v" controls autoplay playsinline webkit-playsinline></video>
<script>document.getElementById('v').src = ${JSON.stringify(url)};</script>
</body>
</html>`;
}

function buildDashHtml(mpdStr: string): string {
  const mpdBase64 = `data:application/dash+xml;base64,${btoa(unescape(encodeURIComponent(mpdStr)))}`;
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>* { margin:0; padding:0; box-sizing:border-box; background:#000; } video { width:100vw; height:100vh; object-fit:contain; display:block; }</style>
</head>
<body>
<video id="v" autoplay controls playsinline webkit-playsinline></video>
<script src="https://cdn.dashjs.org/latest/dash.all.min.js"></script>
<script>
  var player = dashjs.MediaPlayer().create();
  player.initialize(document.getElementById('v'), ${JSON.stringify(mpdBase64)}, true);
  player.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: false } } } });
</script>
</body>
</html>`;
}

function getHtml(playData: PlayUrlResponse | null): string {
  if (!playData) return '<html><body style="background:#000"></body></html>';
  if (playData.dash) {
    const v = playData.dash.video[0];
    const a = playData.dash.audio[0];
    if (v && a) {
      const mpd = buildMpd(v.baseUrl, v.codecs, v.bandwidth, a.baseUrl, a.codecs, a.bandwidth);
      return buildDashHtml(mpd);
    }
  }
  const url = playData.durl?.[0]?.url;
  if (url) return buildMp4Html(url);
  return '<html><body style="background:#000"></body></html>';
}

export function NativeVideoPlayer({
  playData, qualities, currentQn, onQualityChange, onFullscreen, onMiniPlayer, style,
}: Props) {
  const [showQuality, setShowQuality] = useState(false);
  const currentDesc = qualities.find(q => q.qn === currentQn)?.desc ?? (currentQn ? String(currentQn) : 'HD');
  const html = getHtml(playData);

  return (
    <View style={[styles.container, style]}>
      <WebView
        key={html}
        source={{ html }}
        style={styles.webview}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        originWhitelist={['*']}
        scrollEnabled={false}
      />

      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={() => setShowQuality(true)}>
          <Text style={styles.qualityText}>{currentDesc}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} onPress={onFullscreen}>
          <Ionicons name="expand" size={18} color="#fff" />
        </TouchableOpacity>
        {onMiniPlayer && (
          <TouchableOpacity style={styles.ctrlBtn} onPress={onMiniPlayer}>
            <Ionicons name="tablet-portrait-outline" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={showQuality} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowQuality(false)}>
          <View style={styles.qualityList}>
            <Text style={styles.qualityTitle}>选择清晰度</Text>
            {qualities.map(q => (
              <TouchableOpacity
                key={q.qn}
                style={styles.qualityItem}
                onPress={() => {
                  setShowQuality(false);
                  onQualityChange(q.qn);
                }}
              >
                <Text style={[styles.qualityItemText, q.qn === currentQn && styles.qualityItemActive]}>
                  {q.desc}
                </Text>
                {q.qn === currentQn && <Ionicons name="checkmark" size={16} color="#00AEEC" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width, height: VIDEO_HEIGHT, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
  controls: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  ctrlBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 180,
  },
  qualityTitle: { fontSize: 15, fontWeight: '700', color: '#212121', paddingVertical: 10, textAlign: 'center' },
  qualityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  qualityItemText: { fontSize: 14, color: '#333' },
  qualityItemActive: { color: '#00AEEC', fontWeight: '700' },
});
