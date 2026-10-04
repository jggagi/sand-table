/** UI copy is independent of geometry and the camera controller. */
export const UI_CONTENT = {
  title: '掌上留园',
  englishTitle: 'LIUYUAN / A GARDEN IN MINIATURE',
  location: '中国 · 苏州',
  milestone: '水 · 廊 · 石',
  introduction: '水面舒展，廊院层叠，奇石独立。',
  stageLabel: '可旋转与缩放的留园三维微缩景观',
  edition: '一园，四种凝望',
  presetHeading: '选择观景点',
  currentView: '当前观景',
  freeView: '自由观察',
  freeDescription: '沿着自己的视线，慢慢发现水、廊与石的关系。',
  reset: '回到全园',
  desktopHint: '拖动旋转 · 滚轮缩放',
  touchHint: '单指旋转 · 双指缩放',
  loading: '正在布置园景…',
  ready: '园景就绪',
  errorStatus: '园景暂未就绪',
  errorTitle: '暂时无法展开园景',
  errorDescription: '请确认浏览器已开启 WebGL 与硬件加速，再重试或刷新页面。',
  retry: '重新加载园景',
  artNotice: '根据留园代表性空间提炼的艺术化微缩景观，非等比例全园复原。',
  placeholderNotice: '建筑与石峰为程序化艺术造型。',
} as const;

/** Observation guides describe this miniature, not historical garden facts. */
export const VIEW_CONTENT = {
  overview: {
    label: '全园入掌',
    eyebrow: '水 · 廊 · 石',
    description: '一边是舒展的水面，一边是层叠的庭院。',
  },
  waterside: {
    label: '临水看楼',
    eyebrow: '中部池景',
    description: '建筑与树石错落，让水面成为画面的留白。',
  },
  corridor: {
    label: '廊间一瞥',
    eyebrow: '转折廊院',
    description: '从墙与廊之间，看见藏在后面的另一层空间。',
  },
  guanyun: {
    label: '庭中观石',
    eyebrow: '东部庭院',
    description: '把视线留给石峰的轮廓，与庭院之间的空隙。',
  },
} as const;
