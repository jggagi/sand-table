/** UI copy is independent of geometry and the camera controller. */
export const UI_CONTENT = {
  gardenName: '拙政园',
  seal: '拙',
  romanName: 'ZHUOZHENGYUAN',
  title: '掌上拙政园',
  englishTitle: 'ZHUOZHENGYUAN / A GARDEN IN MINIATURE',
  location: '中国 · 苏州',
  milestone: '水乡 · 微缩画境',
  introduction: '一池青绿，两岛树影，曲桥牵起远堂与小亭。',
  stageLabel: '可旋转与缩放的拙政园主题三维微缩景观',
  edition: '一园，四种凝望',
  presetHeading: '选择观景点',
  currentView: '当前观景',
  freeView: '自由观察',
  freeDescription: '沿着自己的视线，慢慢发现水、岛与廊的关系。',
  reset: '回到全园',
  desktopHint: '拖动旋转 · 滚轮缩放',
  touchHint: '单指旋转 · 双指缩放',
  loading: '正在布置园景…',
  ready: '园景就绪',
  errorStatus: '园景暂未就绪',
  errorTitle: '暂时无法展开园景',
  errorDescription: '请确认浏览器已开启 WebGL 与硬件加速，再重试或刷新页面。',
  retry: '重新加载园景',
  artNotice: '以拙政园水、岛、堂、亭的主题意象提炼的艺术化微缩景观，非测绘或等比例复原。',
  placeholderNotice: '建筑、桥廊与树群为程序化艺术造型；位置和比例经过压缩与重组。',
} as const;

/** Observation guides describe this miniature, not historical garden facts. */
export const VIEW_CONTENT = {
  overview: {
    label: '一池入掌',
    eyebrow: '水 · 岛 · 堂',
    description: '大片青绿水面环抱两座树岛，低矮堂屋收住远处的天际。',
  },
  lotus: {
    label: '荷风看亭',
    eyebrow: '偏西小亭',
    description: '看小亭依着树岛停在水边，荷叶与柔和树影留出呼吸的空隙。',
  },
  hall: {
    label: '隔水望堂',
    eyebrow: '北侧堂屋',
    description: '隔着舒展的水面看远香堂意象，屋脊低伏在树群之间。',
  },
  bridge: {
    label: '沿桥入廊',
    eyebrow: '曲桥 · 折廊',
    description: '桥线从亭边穿过树岛，向东岸折去，再由右侧廊线收束。',
  },
} as const;
