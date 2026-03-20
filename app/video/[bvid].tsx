import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VideoPlayer } from "../../components/VideoPlayer";
import { CommentItem } from "../../components/CommentItem";
import { getDanmaku } from "../../services/bilibili";
import { DanmakuItem } from "../../services/types";
import DanmakuList from "../../components/DanmakuList";
import { useVideoDetail } from "../../hooks/useVideoDetail";
import { useComments } from "../../hooks/useComments";
import { useRelatedVideos } from "../../hooks/useRelatedVideos";
import { formatCount, formatDuration } from "../../utils/format";
import { proxyImageUrl } from "../../utils/imageUrl";
import { DownloadSheet } from "../../components/DownloadSheet";

type Tab = "intro" | "comments" | "danmaku";

export default function VideoDetailScreen() {
  const { bvid } = useLocalSearchParams<{ bvid: string }>();
  const router = useRouter();
  const {
    video,
    playData,
    loading: videoLoading,
    qualities,
    currentQn,
    changeQuality,
  } = useVideoDetail(bvid as string);
  const [commentSort, setCommentSort] = useState<0 | 2>(2);
  const {
    comments,
    loading: cmtLoading,
    hasMore: cmtHasMore,
    load: loadComments,
  } = useComments(video?.aid ?? 0, commentSort);
  const [tab, setTab] = useState<Tab>("intro");
  const [danmakus, setDanmakus] = useState<DanmakuItem[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [showDownload, setShowDownload] = useState(false);
  const {
    videos: relatedVideos,
    loading: relatedLoading,
    load: loadRelated,
  } = useRelatedVideos();

  useEffect(() => {
    loadRelated();
  }, []);

  useEffect(() => {
    if (video?.aid) loadComments();
  }, [video?.aid, commentSort]);

  useEffect(() => {
    if (!video?.cid) return;
    getDanmaku(video.cid).then(setDanmakus);
  }, [video?.cid]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* TopBar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          {video?.title ?? "视频详情"}
        </Text>
        <TouchableOpacity
          style={styles.miniBtn}
          onPress={() => setShowDownload(true)}
        >
          <Ionicons name="cloud-download-outline" size={22} color="#212121" />
        </TouchableOpacity>
      </View>

      {/* Video player — fixed 16:9 */}
      <VideoPlayer
        playData={playData}
        qualities={qualities}
        currentQn={currentQn}
        onQualityChange={changeQuality}
        bvid={bvid as string}
        cid={video?.cid}
        danmakus={danmakus}
        onTimeUpdate={setCurrentTime}
      />
      <DownloadSheet
        visible={showDownload}
        onClose={() => setShowDownload(false)}
        bvid={bvid as string}
        cid={video?.cid ?? 0}
        title={video?.title ?? ""}
        cover={video?.pic ?? ""}
        qualities={qualities}
      />

      {/* TabBar — sits directly below player, always visible once video loads */}
      {video && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setTab("intro")}
          >
            <Text
              style={[styles.tabLabel, tab === "intro" && styles.tabActive]}
            >
              简介
            </Text>
            {tab === "intro" && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setTab("comments")}
          >
            <Text
              style={[styles.tabLabel, tab === "comments" && styles.tabActive]}
            >
              评论
              {video.stat?.reply > 0 ? ` ${formatCount(video.stat.reply)}` : ""}
            </Text>
            {tab === "comments" && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setTab("danmaku")}
          >
            <Text
              style={[styles.tabLabel, tab === "danmaku" && styles.tabActive]}
            >
              弹幕
              {danmakus.length > 0 ? ` ${formatCount(danmakus.length)}` : ""}
            </Text>
            {tab === "danmaku" && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        </View>
      )}

      {/* Tab content */}
      {videoLoading ? (
        <ActivityIndicator style={styles.loader} color="#00AEEC" />
      ) : video ? (
        <>
          {tab === "intro" && (
            <FlatList<import("../../services/types").VideoItem>
              style={styles.tabScroll}
              data={relatedVideos}
              keyExtractor={(item) => item.bvid}
              showsVerticalScrollIndicator={false}
              onEndReached={() => {
                if (!relatedLoading) loadRelated();
              }}
              onEndReachedThreshold={0.5}
              ListHeaderComponent={
                <>
                  <View style={styles.upRow}>
                    <Image
                      source={{ uri: proxyImageUrl(video.owner.face) }}
                      style={styles.avatar}
                    />
                    <Text style={styles.upName}>{video.owner.name}</Text>
                    <TouchableOpacity style={styles.followBtn}>
                      <Text style={styles.followTxt}>+ 关注</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.titleSection}>
                    <Text style={styles.title}>{video.title}</Text>
                    <View style={styles.statsRow}>
                      <StatBadge icon="play" count={video.stat.view} />
                      <StatBadge icon="heart" count={video.stat.like} />
                      <StatBadge icon="star" count={video.stat.favorite} />
                      <StatBadge icon="chatbubble" count={video.stat.reply} />
                    </View>
                  </View>
                  {video.ugc_season && (
                    <SeasonSection
                      season={video.ugc_season}
                      currentBvid={bvid as string}
                      onEpisodePress={(epBvid) =>
                        router.replace(`/video/${epBvid}`)
                      }
                    />
                  )}
                  <View style={styles.descBox}>
                    <Text style={styles.descText}>
                      {video.desc || "暂无简介"}
                    </Text>
                  </View>
                  <View style={styles.relatedHeader}>
                    <Text style={styles.relatedHeaderText}>推荐视频</Text>
                  </View>
                </>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.relatedCard}
                  onPress={() => router.push(`/video/${item.bvid}` as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.relatedThumbWrap}>
                    <Image
                      source={{ uri: proxyImageUrl(item.pic) }}
                      style={styles.relatedThumb}
                      resizeMode="cover"
                    />
                    <View style={styles.relatedDuration}>
                      <Text style={styles.relatedDurationText}>
                        {formatDuration(item.duration)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.relatedInfo}>
                    <Text style={styles.relatedTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text style={styles.relatedOwner} numberOfLines={1}>
                        {item.owner?.name ?? ""}
                      </Text>
                      <Text style={styles.relatedView}>
                        {formatCount(item.stat?.view ?? 0)} 播放
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                !relatedLoading ? (
                  <ActivityIndicator style={styles.loader} color="#00AEEC" />
                ) : null
              }
              ListFooterComponent={
                relatedLoading ? (
                  <ActivityIndicator style={styles.loader} color="#00AEEC" />
                ) : null
              }
            />
          )}

          {tab === "comments" && (
            <FlatList
              style={styles.tabScroll}
              data={comments}
              keyExtractor={(c) => String(c.rpid)}
              renderItem={({ item }) => <CommentItem item={item} />}
              onEndReached={() => {
                if (cmtHasMore && !cmtLoading) loadComments();
              }}
              onEndReachedThreshold={0.3}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={styles.sortRow}>
                  <Text style={styles.sortLabel}>排序</Text>
                  <TouchableOpacity
                    style={[
                      styles.sortBtn,
                      commentSort === 2 && styles.sortBtnActive,
                    ]}
                    onPress={() => setCommentSort(2)}
                  >
                    <Text
                      style={[
                        styles.sortBtnTxt,
                        commentSort === 2 && styles.sortBtnTxtActive,
                      ]}
                    >
                      热门
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sortBtn,
                      commentSort === 0 && styles.sortBtnActive,
                    ]}
                    onPress={() => setCommentSort(0)}
                  >
                    <Text
                      style={[
                        styles.sortBtnTxt,
                        commentSort === 0 && styles.sortBtnTxtActive,
                      ]}
                    >
                      最新
                    </Text>
                  </TouchableOpacity>
                </View>
              }
              ListFooterComponent={
                cmtLoading ? (
                  <ActivityIndicator style={styles.loader} color="#00AEEC" />
                ) : !cmtHasMore && comments.length > 0 ? (
                  <Text style={styles.emptyTxt}>已加载全部评论</Text>
                ) : null
              }
              ListEmptyComponent={
                !cmtLoading ? (
                  <Text style={styles.emptyTxt}>暂无评论</Text>
                ) : null
              }
            />
          )}

          {/* 弹幕面板：始终挂载，切 tab 时用 display:none 隐藏而不卸载 */}
          <DanmakuList
            danmakus={danmakus}
            currentTime={currentTime}
            visible={tab === "danmaku"}
            onToggle={() => {}}
            hideHeader={true}
            style={[
              styles.danmakuTab,
              tab !== "danmaku" && { display: "none" },
            ]}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
}

function StatBadge({ icon, count }: { icon: string; count: number }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon as any} size={14} color="#999" />
      <Text style={styles.statText}>{formatCount(count)}</Text>
    </View>
  );
}

function SeasonSection({
  season,
  currentBvid,
  onEpisodePress,
}: {
  season: NonNullable<import("../../services/types").VideoItem["ugc_season"]>;
  currentBvid: string;
  onEpisodePress: (bvid: string) => void;
}) {
  const episodes = season.sections?.[0]?.episodes ?? [];
  const currentIndex = episodes.findIndex((ep) => ep.bvid === currentBvid);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (currentIndex <= 0 || episodes.length === 0) return;
    // 等布局完成再滚动
    const t = setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: currentIndex,
        viewPosition: 0.5, // 居中
        animated: false,
      });
    }, 200);
    return () => clearTimeout(t);
  }, [currentIndex, episodes.length]);

  return (
    <View style={styles.seasonBox}>
      <View style={styles.seasonHeader}>
        <Text style={styles.seasonTitle}>合集 · {season.title}</Text>
        <Text style={styles.seasonCount}>{season.ep_count}个视频</Text>
        <Ionicons name="chevron-forward" size={14} color="#999" />
      </View>
      <FlatList
        ref={listRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        data={episodes}
        keyExtractor={(ep) => ep.bvid}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
        // 每个卡片宽 120，gap 10，让 FlatList 直接算任意索引的偏移量
        getItemLayout={(_data, index) => ({
          length: 130,
          offset: 12 + index * 130,
          index,
        })}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item: ep, index }) => {
          const isCurrent = ep.bvid === currentBvid;
          return (
            <TouchableOpacity
              style={[styles.epCard, isCurrent && styles.epCardActive]}
              onPress={() => !isCurrent && onEpisodePress(ep.bvid)}
              activeOpacity={0.8}
            >
              {ep.arc?.pic && (
                <Image
                  source={{ uri: proxyImageUrl(ep.arc.pic) }}
                  style={styles.epThumb}
                />
              )}
              <Text style={[styles.epNum, isCurrent && styles.epNumActive]}>
                第{index + 1}集
              </Text>
              <Text style={styles.epTitle} numberOfLines={2}>
                {ep.title}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  backBtn: { padding: 4 },
  topTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 4,
    color: "#212121",
  },
  miniBtn: { padding: 4 },
  loader: { marginVertical: 30 },
  titleSection: {
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: "#212121",
    lineHeight: 22,
    marginBottom: 8,
  },
  statsRow: { flexDirection: "row", gap: 16 },
  stat: { flexDirection: "row", alignItems: "center", gap: 3 },
  statText: { fontSize: 12, color: "#999" },
  upRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 0,
    paddingTop: 12,
  },
  avatar: { width: 48, height: 48, borderRadius:30, marginRight: 10 },
  upName: { flex: 1, fontSize: 14, color: "#212121", fontWeight: "500" },
  followBtn: {
    backgroundColor: "#00AEEC",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 14,
  },
  followTxt: { color: "#fff", fontSize: 12, fontWeight: "500" },
  seasonBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#f0f0f0",
    paddingVertical: 10,
  },
  seasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 4,
  },
  seasonTitle: { flex: 1, fontSize: 13, fontWeight: "600", color: "#212121" },
  seasonCount: { fontSize: 12, color: "#999" },
  epCard: {
    width: 120,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#f8f8f8",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  epCardActive: { borderColor: "#00AEEC" },
  epThumb: { width: 120, height: 68, backgroundColor: "#eee" },
  epNum: { fontSize: 11, color: "#999", paddingHorizontal: 6, paddingTop: 4 },
  epNumActive: { color: "#00AEEC", fontWeight: "600" },
  epTitle: {
    fontSize: 12,
    color: "#333",
    paddingHorizontal: 6,
    paddingBottom: 6,
    lineHeight: 16,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  tabLabel: { fontSize: 13, color: "#999" },
  tabActive: { color: "#00AEEC" },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    width: 24,
    height: 2,
    backgroundColor: "#00AEEC",
    borderRadius: 1,
  },
  tabScroll: { flex: 1 },
  descBox: { padding: 16 },
  descText: { fontSize: 14, color: "#555", lineHeight: 22 },
  danmakuTab: { flex: 1 },
  emptyTxt: { textAlign: "center", color: "#bbb", padding: 30 },
  relatedHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#f4f4f4",
  },
  relatedHeaderText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#212121",
  },
  relatedCard: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f0f0",
    gap: 10,
  },
  relatedThumbWrap: {
    position: "relative",
    width: 120,
    height: 68,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#eee",
    flexShrink: 0,
  },
  relatedThumb: { width: 120, height: 68 },
  relatedDuration: {
    position: "absolute",
    bottom: 3,
    right: 3,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  relatedDurationText: { color: "#fff", fontSize: 10 },
  relatedInfo: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  relatedTitle: { fontSize: 13, color: "#212121", lineHeight: 18 },
  relatedOwner: { fontSize: 12, color: "#999" },
  relatedView: { fontSize: 11, color: "#bbb" },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f0f0",
  },
  sortLabel: { fontSize: 13, color: "#999", marginRight: 4 },
  sortBtn: {
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  sortBtnActive: { borderColor: "#00AEEC", backgroundColor: "#e8f7fd" },
  sortBtnTxt: { fontSize: 12, color: "#666" },
  sortBtnTxtActive: { color: "#00AEEC", fontWeight: "600" as const },
});
