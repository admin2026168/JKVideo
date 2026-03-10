import React, { useRef } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  Animated, PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVideoStore } from '../store/videoStore';

export function MiniPlayer() {
  const { isActive, bvid, title, cover, clearVideo } = useVideoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
      },
    })
  ).current;

  if (!isActive) return null;

  const bottomOffset = insets.bottom + 16;

  return (
    <Animated.View
      style={[styles.container, { bottom: bottomOffset, transform: pan.getTranslateTransform() }]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.main}
        onPress={() => router.push(`/video/${bvid}` as any)}
        activeOpacity={0.85}
      >
        <Image source={{ uri: cover }} style={styles.cover} />
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.closeBtn} onPress={clearVideo}>
        <Ionicons name="close" size={14} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    width: 160,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  main: { flex: 1 },
  cover: { width: '100%', height: 64, backgroundColor: '#333' },
  title: {
    color: '#fff',
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 4,
    lineHeight: 14,
  },
  closeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
