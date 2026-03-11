# Big Video Card — 设计文档

**日期：** 2026-03-11
**状态：** 已批准

## 需求

首页热门视频双列列表中，每次加载更多后，**列表最末尾的最后一个卡片**以"大卡片"形式呈现，占据两列全宽空间。大卡片在滚动进入视口时静音自动播放视频内容，默认使用最低画质（qn=16，360P）。

## 数据结构

### 行类型（`utils/videoRows.ts`）

```ts
type NormalRow = { type: 'pair'; left: VideoItem; right: VideoItem | null };
type BigRow    = { type: 'big';  item: VideoItem };
type ListRow   = NormalRow | BigRow;
```

### 行化规则

- 除最后一项外，所有视频两两配对为 `NormalRow`
- 最后一项始终为 `BigRow`
- 空列表返回 `[]`
- 仅 1 个 item 时直接生成 `BigRow`

示例：
```
videos = [A, B, C, D, E]
rows   = [
  { type: 'pair', left: A, right: B },
  { type: 'pair', left: C, right: D },
  { type: 'big',  item: E },
]
```

## BigVideoCard 组件

### 文件：`components/BigVideoCard.tsx`

### Props

```ts
interface BigVideoCardProps {
  item: VideoItem;
  isVisible: boolean;
  onPress: () => void;
}
```

### 层次结构

```
BigVideoCard (TouchableOpacity)
├── 封面图 (Image, 16:9 全宽)
├── 视频播放器 (react-native-video <Video>, position: absolute, isVisible 时加载；直接使用 <Video> 而非 NativeVideoPlayer，因为不需要控制条/热力图等全功能组件)
│   └── muted, autoplay, qn=16
├── 封面遮罩 (Animated.View, opacity 1→0 淡出)
└── 底部信息栏
    ├── 标题 (numberOfLines=2)
    ├── 播放量 + 弹幕数
    └── UP主名称
```

### 生命周期

| 状态 | 行为 |
|---|---|
| `isVisible=false` | 仅渲染封面图，不请求播放 URL |
| `isVisible=true` | 调用 `getPlayUrl(bvid, cid, 16)`，加载 NativeVideoPlayer |
| 视频可播放（`canplay` 事件） | 封面图淡出（Animated，300ms） |
| `isVisible=false`（离开视口） | 注入 JS 暂停视频，封面恢复 |

### 画质

`qn=16`（360P），B 站最低公开档，无需登录，适合静音自动播放场景。

## FlatList 集成（`app/index.tsx`）

### 改动

| 属性 | 改动前 | 改动后 |
|---|---|---|
| `data` | `videos: VideoItem[]` | `rows: ListRow[]` |
| `numColumns` | `2` | `1` |
| `columnWrapperStyle` | 存在 | 删除 |
| `renderItem` | 单卡片 | 按 `row.type` 分支渲染 |

### 视口检测

```ts
const viewabilityConfig = {
  itemVisiblePercentThreshold: 50,
};

// useRef 包裹，避免 FlatList prop 变更警告
const onViewableItemsChanged = useRef(({ viewableItems }) => {
  const bigItem = viewableItems.find(v => v.item.type === 'big');
  setVisibleBigKey(bigItem ? bigItem.key : null);
}).current;
```

`BigVideoCard` 接收 `isVisible={row.item.bvid === visibleBigKey}`。

## 新增 / 修改文件

| 文件 | 操作 |
|---|---|
| `utils/videoRows.ts` | 新增 — 行化函数与类型 |
| `components/BigVideoCard.tsx` | 新增 — 大卡片组件 |
| `app/index.tsx` | 修改 — FlatList 重构 |
| `services/bilibili.ts` | 无需修改（`getPlayUrl` 已支持 qn 参数） |

## 不在范围内

- 搜索、动态、DASH 播放等其他功能
- 大卡片的点击行为与普通卡片一致（跳转视频详情页）
- 画质切换 UI（大卡片固定 qn=16）
