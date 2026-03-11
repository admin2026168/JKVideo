# Big Video Card Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-width "big card" as the last item of the homepage video list, which auto-plays the video muted (qn=16, 360P) when scrolled into view, with a 16:9 thumbnail that fades out once the video is ready.

**Architecture:** Transform `videos: VideoItem[]` into typed rows (`NormalRow | BigRow`) before rendering; FlatList renders rows via `numColumns={1}`; viewport detection uses FlatList's `onViewableItemsChanged`; `BigVideoCard` fetches play URL lazily and renders a `Video` component from `react-native-video` on top of the thumbnail.

**Tech Stack:** React Native, Expo SDK 55, react-native-video, Animated API, expo-router

---

## Chunk 1: Data utilities

### Task 1: Create `utils/videoRows.ts`

**Files:**
- Create: `utils/videoRows.ts`

- [ ] **Step 1: Create the file with types and transformation function**

```ts
// utils/videoRows.ts
import type { VideoItem } from '../services/types';

export interface NormalRow {
  type: 'pair';
  left: VideoItem;
  right: VideoItem | null;
}

export interface BigRow {
  type: 'big';
  item: VideoItem;
}

export type ListRow = NormalRow | BigRow;

/**
 * Transform a flat VideoItem array into display rows.
 * The last item always becomes a full-width BigRow.
 * All preceding items are grouped into NormalRow pairs.
 */
export function toListRows(videos: VideoItem[]): ListRow[] {
  if (videos.length === 0) return [];
  if (videos.length === 1) return [{ type: 'big', item: videos[0] }];

  const rows: ListRow[] = [];
  const body = videos.slice(0, videos.length - 1);

  for (let i = 0; i < body.length; i += 2) {
    rows.push({
      type: 'pair',
      left: body[i],
      right: body[i + 1] ?? null,
    });
  }

  rows.push({ type: 'big', item: videos[videos.length - 1] });
  return rows;
}
```

- [ ] **Step 2: Manual verification — open a JS REPL or add a temporary console.log**

In any component or the `_layout.tsx`, temporarily add:
```ts
import { toListRows } from '../utils/videoRows';
const sample = [{ bvid: 'A' }, { bvid: 'B' }, { bvid: 'C' }, { bvid: 'D' }, { bvid: 'E' }] as any;
console.log(JSON.stringify(toListRows(sample), null, 2));
// Expected: 2 pairs + 1 big row
```
Remove after verifying output.

- [ ] **Step 3: Commit**

```bash
git add utils/videoRows.ts
git commit -m "feat: add videoRows utility for big-card list layout"
```

---

## Chunk 2: BigVideoCard component

### Task 2: Create `components/BigVideoCard.tsx`

**Files:**
- Create: `components/BigVideoCard.tsx`

**Overview:** Displays a full-width card with a 16:9 thumbnail. When `isVisible` becomes true, fetches the play URL at qn=16 and renders a muted `Video`. When the video is ready to display, the thumbnail fades out. When `isVisible` becomes false, the video pauses.

- [ ] **Step 1: Create the component skeleton**

```tsx
// components/BigVideoCard.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Dimensions, Animated,
} from 'react-native';
import Video from 'react-native-video';
import { Ionicons } from '@expo/vector-icons';
import { buildDashMpdUri } from '../utils/dash';
import { getPlayUrl, getVideoDetail } from '../services/bilibili';
import { proxyImageUrl } from '../utils/imageUrl';
import { formatCount, formatDuration } from '../utils/format';
import type { VideoItem } from '../services/types';
import { useRouter } from 'expo-router';

const { width: SCREEN_W } = Dimensions.get('window');
const THUMB_H = SCREEN_W * 0.5625; // 16:9

const HEADERS = {
  Referer: 'https://www.bilibili.com',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

interface Props {
  item: VideoItem;
  isVisible: boolean;
  onPress: () => void;
}

export function BigVideoCard({ item, isVisible, onPress }: Props) {
  const [videoUrl, setVideoUrl] = useState<string | undefined>();
  const [isDash, setIsDash] = useState(false);
  const [paused, setPaused] = useState(true);
  const thumbOpacity = useRef(new Animated.Value(1)).current;

  // Fetch play URL when visible for the first time
  useEffect(() => {
    if (!isVisible || videoUrl) return;

    (async () => {
      try {
        // cid may be missing from feed items; fetch detail if needed
        let cid = item.cid;
        if (!cid) {
          const detail = await getVideoDetail(item.bvid);
          cid = detail.cid ?? detail.pages?.[0]?.cid;
        }
        if (!cid) return;

        const playData = await getPlayUrl(item.bvid, cid, 16);

        if (playData.dash) {
          setIsDash(true);
          try {
            const mpdUri = await buildDashMpdUri(playData, 16);
            setVideoUrl(mpdUri);
          } catch {
            setVideoUrl(playData.dash.video[0]?.baseUrl);
          }
        } else {
          setVideoUrl(playData.durl?.[0]?.url);
        }
      } catch (e) {
        console.warn('BigVideoCard: failed to load play URL', e);
      }
    })();
  }, [isVisible]);

  // Pause/resume when visibility changes
  useEffect(() => {
    if (!videoUrl) return;
    setPaused(!isVisible);
    if (!isVisible) {
      // Restore thumbnail when leaving viewport
      Animated.timing(thumbOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
  }, [isVisible, videoUrl]);

  const handleVideoReady = () => {
    setPaused(false);
    Animated.timing(thumbOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Media area */}
      <View style={styles.mediaContainer}>
        {/* Thumbnail */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: thumbOpacity }]}>
          <Image
            source={{ uri: proxyImageUrl(item.pic) }}
            style={styles.thumb}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Duration badge on thumbnail */}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
        </View>

        {/* Video player — only mounted when URL is available */}
        {videoUrl && (
          <Video
            source={
              isDash
                ? { uri: videoUrl, type: 'mpd', headers: HEADERS }
                : { uri: videoUrl, headers: HEADERS }
            }
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            muted
            paused={paused}
            repeat
            controls={false}
            onReadyForDisplay={handleVideoReady}
          />
        )}
      </View>

      {/* Info */}
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
  card: {
    marginHorizontal: 4,
    marginBottom: 6,
    backgroundColor: '#fff',
    borderRadius: 6,
    overflow: 'hidden',
  },
  mediaContainer: {
    width: SCREEN_W - 8,
    height: THUMB_H,
  },
  thumb: {
    width: SCREEN_W - 8,
    height: THUMB_H,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 2,
  },
  durationText: { color: '#fff', fontSize: 10 },
  info: { padding: 8 },
  title: { fontSize: 14, color: '#212121', lineHeight: 18, marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaText: { fontSize: 11, color: '#999' },
  owner: { fontSize: 11, color: '#999', marginTop: 2 },
});
```

- [ ] **Step 2: Verify the component builds (no TypeScript errors)**

```bash
cd C:\claude-code-studly\reactBilibiliApp
npx tsc --noEmit
```
Expected: no errors related to `BigVideoCard.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/BigVideoCard.tsx
git commit -m "feat: add BigVideoCard with muted autoplay at qn=16"
```

---

## Chunk 3: FlatList integration

### Task 3: Refactor `app/index.tsx` to use row-based layout

**Files:**
- Modify: `app/index.tsx`

**Changes:**
- Add `useMemo` to existing React import; add `ViewToken` to react-native import
- Import `toListRows`, `ListRow`, `BigRow` from `utils/videoRows`
- Import `BigVideoCard` from `components/BigVideoCard`
- Derive `rows` from `videos` via `useMemo`
- Remove `numColumns={2}` and `columnWrapperStyle` prop (keep `styles.row` — it's used in pair renderItem)
- Add `VIEWABILITY_CONFIG` constant (module-level)
- Add `onViewableItemsChangedRef` (useRef-wrapped)
- Add `visibleBigKey` state
- Update `renderItem` to branch on row type
- Update `keyExtractor` for row keys

- [ ] **Step 1: Update imports in `app/index.tsx`**

1a. In the existing `import React, { useEffect, useState, useRef } from "react"` line, add `useMemo`:
```ts
import React, { useEffect, useState, useRef, useMemo } from "react";
```

1b. In the existing `import { ... } from "react-native"` block, add `ViewToken`:
```ts
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
```

1c. Add these new imports after the existing import block (use double quotes to match the file style):
```ts
import { toListRows, type ListRow, type BigRow } from "../utils/videoRows";
import { BigVideoCard } from "../components/BigVideoCard";
```

- [ ] **Step 2: Add module-level viewability config (outside the component)**

Add after the `NAV_H` constants:
```ts
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };
```

- [ ] **Step 3: Add state and derived data inside `HomeScreen`**

Add inside `HomeScreen`, after the existing `useRef` lines. **Order matters:** declare state first, then memo, then the ref (the ref's closure captures `setVisibleBigKey`):
```ts
const [visibleBigKey, setVisibleBigKey] = useState<string | null>(null);
const rows = useMemo(() => toListRows(videos), [videos]);

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
```

- [ ] **Step 4: Replace `renderItem` with a row-aware version**

Replace the existing `renderItem` function:
```ts
const renderItem = ({ item: row }: { item: ListRow }) => {
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
  return (
    <View style={styles.row}>
      <View style={styles.leftCol}>
        <VideoCard
          item={row.left}
          onPress={() => router.push(`/video/${row.left.bvid}` as any)}
        />
      </View>
      {row.right && (
        <View style={styles.rightCol}>
          <VideoCard
            item={row.right}
            onPress={() => router.push(`/video/${row.right!.bvid}` as any)}
          />
        </View>
      )}
    </View>
  );
};
```

- [ ] **Step 5: Update `styles.row` in the StyleSheet**

`styles.row` was previously used as `columnWrapperStyle` — FlatList automatically applies `flexDirection: 'row'` to column wrappers. Now that it becomes an explicit `<View style={styles.row}>`, `flexDirection: 'row'` must be added explicitly or the pair columns will stack vertically.

Find the `row` entry in `StyleSheet.create({...})` and update it:
```ts
row: { flexDirection: 'row', paddingHorizontal: 1, justifyContent: "flex-start" },
```

- [ ] **Step 6: Update the FlatList props**

In the `Animated.FlatList`, make these changes:

1. Change `data={videos}` → `data={rows}`
2. Change `keyExtractor` to:
```ts
keyExtractor={(row: any, index) =>
  row.type === 'big'
    ? `big-${row.item.bvid}`
    : `pair-${row.left.bvid}-${row.right?.bvid ?? 'empty'}-${index}`
}
```
3. Remove `numColumns={2}`
4. Remove the `columnWrapperStyle={styles.row}` **prop** from FlatList. Do NOT delete the `styles.row` StyleSheet entry — it is still referenced in the pair renderItem's `<View style={styles.row}>` (and now has `flexDirection: 'row'` from Step 5).
5. Add after `onEndReachedThreshold`:
```ts
viewabilityConfig={VIEWABILITY_CONFIG}
onViewableItemsChanged={onViewableItemsChangedRef}
```

Note: `react-native-video` is already installed in this project (confirmed by `components/NativeVideoPlayer.tsx` which imports `Video` from it). No additional installation needed.

- [ ] **Step 7: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 8: Run the app and verify visually**

```bash
expo start --port 8082
```

Check:
1. Homepage renders two-column layout for normal cards
2. Last card is full-width with 16:9 thumbnail
3. Scrolling to the last card starts muted video after a brief delay
4. Thumbnail fades out when video is ready
5. Scrolling away from the big card pauses the video
6. After loading more items, the entire row list is recomputed: the previously-last item now appears in a normal pair row, and the new last item appears as the big card at the bottom
7. When the number of normal (non-big) items is odd, the last pair row shows a single card on the left with an empty right slot

- [ ] **Step 9: Commit**

```bash
git add app/index.tsx
git commit -m "feat: refactor homepage FlatList for big-card layout with viewport autoplay"
```
