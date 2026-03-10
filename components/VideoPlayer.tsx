import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, Text, Platform, Modal, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeVideoPlayer } from './NativeVideoPlayer';
import type { PlayUrlResponse } from '../services/types';

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = width * 0.5625;

interface Props {
  playData: PlayUrlResponse | null;
  qualities: { qn: number; desc: string }[];
  currentQn: number;
  onQualityChange: (qn: number) => void;
  onMiniPlayer?: () => void;
}

export function VideoPlayer({ playData, qualities, currentQn, onQualityChange, onMiniPlayer }: Props) {
  const [fullscreen, setFullscreen] = useState(false);

  if (!playData) {
    return (
      <View style={[styles.container, styles.placeholder]}>
        <Text style={styles.placeholderText}>视频加载中...</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    const url = playData.durl?.[0]?.url ?? '';
    return (
      <View style={styles.container}>
        <video
          src={url}
          style={{ width: '100%', height: '100%', backgroundColor: '#000' } as any}
          controls
          playsInline
        />
      </View>
    );
  }

  return (
    <>
      <NativeVideoPlayer
        playData={playData}
        qualities={qualities}
        currentQn={currentQn}
        onQualityChange={onQualityChange}
        onFullscreen={() => setFullscreen(true)}
        onMiniPlayer={onMiniPlayer}
      />

      <Modal visible={fullscreen} animationType="fade" statusBarTranslucent>
        <StatusBar hidden />
        <View style={styles.fullscreenContainer}>
          <NativeVideoPlayer
            playData={playData}
            qualities={qualities}
            currentQn={currentQn}
            onQualityChange={onQualityChange}
            onFullscreen={() => setFullscreen(false)}
            style={{ width: '100%', height: '100%' } as any}
          />
          <TouchableOpacity style={styles.closeBtn} onPress={() => setFullscreen(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { width, height: VIDEO_HEIGHT, backgroundColor: '#000' },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#fff', fontSize: 14 },
  fullscreenContainer: { flex: 1, backgroundColor: '#000' },
  closeBtn: {
    position: 'absolute',
    top: 40,
    right: 16,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
  },
});
