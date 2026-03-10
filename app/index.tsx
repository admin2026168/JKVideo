import React, { useEffect, useState, useRef } from 'react';
import {
  View, StyleSheet,
  Text, TouchableOpacity, ActivityIndicator, Animated, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VideoCard } from '../components/VideoCard';
import { LoginModal } from '../components/LoginModal';
import { useVideoList } from '../hooks/useVideoList';
import { useAuthStore } from '../store/authStore';
import type { VideoItem } from '../services/types';

const HEADER_H = 44;
const TAB_H    = 38;
const NAV_H    = HEADER_H + TAB_H;

export default function HomeScreen() {
  const router = useRouter();
  const { videos, loading, refreshing, load, refresh } = useVideoList();
  const { isLoggedIn, face, logout } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);
  const insets = useSafeAreaInsets();

  const scrollY = useRef(new Animated.Value(0)).current;
  const clampedScroll = useRef(
    Animated.diffClamp(scrollY, 0, NAV_H)
  ).current;
  const headerTranslate = clampedScroll.interpolate({
    inputRange:  [0, NAV_H],
    outputRange: [0, -NAV_H],
    extrapolate: 'clamp',
  });

  useEffect(() => { load(); }, []);

  const renderItem = ({ item, index }: { item: VideoItem; index: number }) => (
    <View style={index % 2 === 0 ? styles.leftCol : styles.rightCol}>
      <VideoCard
        item={item}
        onPress={() => router.push(`/video/${item.bvid}` as any)}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <Animated.FlatList
        style={styles.listContainer}
        data={videos}
        keyExtractor={(item, index) => `${item.bvid}-${index}`}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{ paddingTop: insets.top + NAV_H + 8, paddingBottom: insets.bottom + 16 }}
        renderItem={renderItem}
        onRefresh={refresh}
        refreshing={refreshing}
        onEndReached={() => load()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator style={styles.footer} color="#00AEEC" /> : null}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      />

      {/* 绝对定位导航栏：paddingTop 手动适配刘海/状态栏 */}
      <Animated.View
        style={[
          styles.navBar,
          { paddingTop: insets.top, transform: [{ translateY: headerTranslate }] },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>哔哩哔哩</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerBtn}>
              <Ionicons name="search" size={22} color="#212121" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => isLoggedIn ? logout() : setShowLogin(true)}
            >
              {isLoggedIn && face ? (
                <Image source={{ uri: face }} style={styles.userAvatar} />
              ) : (
                <Ionicons name={isLoggedIn ? 'person' : 'person-outline'} size={22} color="#00AEEC" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabRow}>
          <Text style={styles.tabActive}>热门</Text>
          <View style={styles.tabUnderline} />
        </View>
      </Animated.View>

      <LoginModal visible={showLogin} onClose={() => setShowLogin(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f4f4' },
  listContainer: { flex: 1 },
  navBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
    // 安卓投影
    elevation: 2,
    // iOS 投影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  header: {
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  logo: { fontSize: 20, fontWeight: '800', color: '#00AEEC', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerBtn: { padding: 6 },
  userAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#eee' },
  tabRow: {
    height: TAB_H,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabActive: { fontSize: 15, fontWeight: '700', color: '#00AEEC' },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    width: 24,
    height: 2,
    backgroundColor: '#00AEEC',
    borderRadius: 1,
  },
  row: { paddingHorizontal: 8 },
  leftCol: { marginLeft: 4, marginRight: 2 },
  rightCol: { marginLeft: 2, marginRight: 4 },
  footer: { marginVertical: 16 },
});
