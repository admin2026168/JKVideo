import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { VideoItem } from '../services/types';
import { formatCount, formatDuration } from '../utils/format';
import { proxyImageUrl } from '../utils/imageUrl';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 14) / 2;

interface Props {
  item: VideoItem;
  onPress: () => void;
}

export function VideoCard({ item, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.thumbContainer}>
        <Image
          source={{ uri: proxyImageUrl(item.pic) }}
          style={styles.thumb}
          resizeMode="cover"
        />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <View style={styles.meta}>
          <Ionicons name="play" size={11} color="#999" />
          <Text style={styles.metaText}>{formatCount(item.stat?.view ?? 0)}</Text>
        </View>
        <Text style={styles.owner} numberOfLines={1}>{item.owner?.name ?? ''}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, marginBottom: 6, backgroundColor: '#fff', borderRadius: 6, overflow: 'hidden' },
  thumbContainer: { position: 'relative' },
  thumb: { width: CARD_WIDTH, height: CARD_WIDTH * 0.5625 },
  durationBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  durationText: { color: '#fff', fontSize: 10 },
  info: { padding: 6 },
  title: { fontSize: 12, color: '#212121', lineHeight: 16, height: 32, marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaText: { fontSize: 11, color: '#999' },
  owner: { fontSize: 11, color: '#999', marginTop: 2 },
});
