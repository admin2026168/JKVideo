import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Image,
  RefreshControl,
  ViewToken,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VideoCard } from "../components/VideoCard";
import { LoginModal } from "../components/LoginModal";
import { useVideoList } from "../hooks/useVideoList";
import { useAuthStore } from "../store/authStore";
import { toListRows, type ListRow, type BigRow } from "../utils/videoRows";
import { BigVideoCard } from "../components/BigVideoCard";

const HEADER_H = 44;
const TAB_H = 38;
const NAV_H = HEADER_H + TAB_H;

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };

export default function HomeScreen() {
  const router = useRouter();
  const { videos, loading, refreshing, load, refresh } = useVideoList();
  const { isLoggedIn, face, logout } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);
  const insets = useSafeAreaInsets();

  const [visibleBigKey, setVisibleBigKey] = useState<string | null>(null);
  const rows = useMemo(() => toListRows(videos), [videos]);

  // useRef-wrapped to satisfy FlatList's requirement that onViewableItemsChanged never changes identity after mount
  const onViewableItemsChangedRef = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const bigRow = viewableItems.find(
        (v) => v.item && (v.item as ListRow).type === 'big',
      );
      setVisibleBigKey(
        bigRow ? (bigRow.item as BigRow).item.bvid : null,
      );
    },
  ).current;

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslate = scrollY.interpolate({
    inputRange: [0, NAV_H],
    outputRange: [0, -NAV_H],
    extrapolate: "clamp",
  });

  useEffect(() => {
    load();
  }, []);

  const renderItem = useCallback(({ item: row }: { item: ListRow }) => {
    if (row.type === 'big') {
      return (
        <BigVideoCard
          item={row.item}
          isVisible={visibleBigKey === row.item.bvid}
          onPress={() => router.push(`/video/${row.item.bvid}` as any)}
        />
      );
    }
    // Normal pair row
    const right = row.right;
    return (
      <View style={styles.row}>
        <View style={styles.leftCol}>
          <VideoCard
            item={row.left}
            onPress={() => router.push(`/video/${row.left.bvid}` as any)}
          />
        </View>
        {right && (
          <View style={styles.rightCol}>
            <VideoCard
              item={right}
              onPress={() => router.push(`/video/${right.bvid}` as any)}
            />
          </View>
        )}
      </View>
    );
  }, [visibleBigKey]);

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <Animated.FlatList
        style={styles.listContainer}
        data={rows}
        keyExtractor={(row: any) =>
          row.type === 'big'
            ? `big-${row.item.bvid}`
            : `pair-${row.left.bvid}-${row.right?.bvid ?? 'empty'}`
        }
        contentContainerStyle={{
          paddingTop: insets.top + NAV_H + 6,
          paddingBottom: insets.bottom + 16,
        }}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            progressViewOffset={insets.top + NAV_H}
          />
        }
        onEndReached={() => load()}
        onEndReachedThreshold={0.5}
        extraData={visibleBigKey}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onViewableItemsChanged={onViewableItemsChangedRef}
        ListFooterComponent={
          <View style={styles.footer}>
            {loading && <ActivityIndicator color="#00AEEC" />}
          </View>
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      />

      {/* 绝对定位导航栏：paddingTop 手动适配刘海/状态栏 */}
      <Animated.View
        style={[
          styles.navBar,
          {
            paddingTop: insets.top,
            transform: [{ translateY: headerTranslate }],
          },
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
              onPress={() => (isLoggedIn ? logout() : setShowLogin(true))}
            >
              {isLoggedIn && face ? (
                <Image source={{ uri: face }} style={styles.userAvatar} />
              ) : (
                <Ionicons
                  name={isLoggedIn ? "person" : "person-outline"}
                  size={22}
                  color="#00AEEC"
                />
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
  safe: { flex: 1, backgroundColor: "#f4f4f4" },
  listContainer: { flex: 1 },
  navBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#fff",
    overflow: "hidden",
    // 安卓投影
    elevation: 2,
    // iOS 投影
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  header: {
    height: HEADER_H,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  logo: {
    fontSize: 20,
    fontWeight: "800",
    color: "#00AEEC",
    letterSpacing: -0.5,
  },
  headerRight: { flexDirection: "row", gap: 8 },
  headerBtn: { padding: 6 },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#eee",
  },
  tabRow: {
    height: TAB_H,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  tabActive: { fontSize: 15, fontWeight: "700", color: "#00AEEC" },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 16,
    width: 24,
    height: 2,
    backgroundColor: "#00AEEC",
    borderRadius: 1,
  },
  row: { flexDirection: 'row', paddingHorizontal: 1, justifyContent: "flex-start" },
  leftCol: { marginLeft: 4, marginRight: 2 },
  rightCol: { marginLeft: 2, marginRight: 4 },
  footer: { height: 48, alignItems: "center", justifyContent: "center" },
});
