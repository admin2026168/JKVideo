import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
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
import { useVideoStore } from "../../store/videoStore";
import { formatCount } from "../../utils/format";
import { proxyImageUrl } from "../../utils/imageUrl";

type Tab = "intro" | "comments";

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
  const {
    comments,
    loading: cmtLoading,
    load: loadComments,
  } = useComments(video?.aid ?? 0);
  const [tab, setTab] = useState<Tab>("comments");
  const [danmakus, setDanmakus] = useState<DanmakuItem[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [showDanmakuList, setShowDanmakuList] = useState(true);
  const { setVideo, clearVideo } = useVideoStore();

  useEffect(() => {
    clearVideo();
  }, [bvid]);

  useEffect(() => {
    if (video?.aid) loadComments();
  }, [video?.aid]);

  useEffect(() => {
    if (!video?.cid) return;
    getDanmaku(video.cid).then(setDanmakus);
  }, [video?.cid]);

  function handleMiniPlayer() {
    if (video) {
      setVideo(bvid as string, video.title, video.pic);
      router.back();
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          {video?.title ?? "视频详情"}
        </Text>
        <TouchableOpacity style={styles.miniBtn} onPress={handleMiniPlayer}>
          <Ionicons name="copy-outline" size={22} color="#212121" />
        </TouchableOpacity>
      </View>

      <VideoPlayer
        playData={playData}
        qualities={qualities}
        currentQn={currentQn}
        onQualityChange={changeQuality}
        onMiniPlayer={handleMiniPlayer}
        bvid={bvid as string}
        cid={video?.cid}
        danmakus={danmakus}
        onTimeUpdate={setCurrentTime}
      />
      <DanmakuList
        danmakus={danmakus}
        currentTime={currentTime}
        visible={showDanmakuList}
        onToggle={() => setShowDanmakuList((v) => !v)}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {videoLoading ? (
          <ActivityIndicator style={styles.loader} color="#00AEEC" />
        ) : video ? (
          <>
            <View style={styles.titleSection}>
              <Text style={styles.title}>{video.title}</Text>
              <View style={styles.statsRow}>
                <StatBadge icon="play" count={video.stat.view} />
                <StatBadge icon="heart" count={video.stat.like} />
                <StatBadge icon="star" count={video.stat.favorite} />
                <StatBadge icon="chatbubble" count={video.stat.reply} />
              </View>
            </View>

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
                  style={[
                    styles.tabLabel,
                    tab === "comments" && styles.tabActive,
                  ]}
                >
                  评论{" "}
                  {video.stat.reply > 0 ? formatCount(video.stat.reply) : ""}
                </Text>
                {tab === "comments" && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            </View>

            {tab === "intro" ? (
              <View style={styles.descBox}>
                <Text style={styles.descText}>{video.desc || "暂无简介"}</Text>
              </View>
            ) : (
              <>
                {comments.map((c) => (
                  <CommentItem key={c.rpid} item={c} />
                ))}
                {cmtLoading && (
                  <ActivityIndicator style={styles.loader} color="#00AEEC" />
                )}
                {!cmtLoading && comments.length > 0 && (
                  <TouchableOpacity
                    style={styles.loadMore}
                    onPress={loadComments}
                  >
                    <Text style={styles.loadMoreTxt}>加载更多评论</Text>
                  </TouchableOpacity>
                )}
                {!cmtLoading && comments.length === 0 && !videoLoading && (
                  <Text style={styles.emptyTxt}>暂无评论</Text>
                )}
              </>
            )}
          </>
        ) : null}
      </ScrollView>
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
  scroll: { flex: 1 },
  loader: { marginVertical: 30 },
  titleSection: { padding: 14 },
  title: {
    fontSize: 16,
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
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f0f0",
  },
  avatar: { width: 38, height: 38, borderRadius: 19, marginRight: 10 },
  upName: { flex: 1, fontSize: 14, color: "#212121", fontWeight: "500" },
  followBtn: {
    backgroundColor: "#00AEEC",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  followTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },
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
  tabLabel: { fontSize: 14, color: "#999" },
  tabActive: { color: "#00AEEC", fontWeight: "700" },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    width: 24,
    height: 2,
    backgroundColor: "#00AEEC",
    borderRadius: 1,
  },
  descBox: { padding: 16 },
  descText: { fontSize: 14, color: "#555", lineHeight: 22 },
  loadMore: { alignItems: "center", padding: 16 },
  loadMoreTxt: { color: "#00AEEC", fontSize: 13 },
  emptyTxt: { textAlign: "center", color: "#bbb", padding: 30 },
});
