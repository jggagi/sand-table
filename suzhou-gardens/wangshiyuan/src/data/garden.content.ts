/** UI copy is independent of geometry and the camera controller. */
export const UI_CONTENT = {
  gardenName: '网师园',
  seal: '网师',
  romanName: 'WANGSHIYUAN',
  title: '掌上网师园',
  englishTitle: 'WANGSHIYUAN / A GARDEN IN MINIATURE',
  location: '中国 · 苏州',
  milestone: '小园大境',
  introduction: '一池留白，几处亭廊，藏下层层庭院。',
  stageLabel: '可旋转与缩放的网师园艺术化三维微缩景观',
  edition: '一园，四种凝望',
  presetHeading: '选择观景点',
  currentView: '当前观景',
  freeView: '自由观察',
  freeDescription: '顺着池岸和廊墙，慢慢发现小园里的远近。',
  reset: '回到全园',
  desktopHint: '拖动旋转 · 滚轮缩放',
  touchHint: '单指旋转 · 双指缩放',
  loading: '正在布置园景…',
  ready: '园景就绪',
  errorStatus: '园景暂未就绪',
  errorTitle: '暂时无法展开园景',
  errorDescription: '请确认浏览器已开启 WebGL 与硬件加速，再重试或刷新页面。',
  retry: '重新加载园景',
  artNotice: '根据网师园代表性空间意象提炼的艺术化压缩景观，非等比例全园复原。',
  placeholderNotice: '建筑、山石与植物为程序化艺术造型。',
} as const;

/** Observation guides describe this miniature, not historical garden facts. */
export const VIEW_CONTENT = {
  overview: {
    label: '小园大境',
    eyebrow: '池 · 亭 · 院',
    description: '池面留出空白，亭廊与小院沿岸层层展开。',
  },
  pool: {
    label: '一池留白',
    eyebrow: '彩霞池意象',
    description: '靠近池岸，看水面怎样接住屋檐、树影与山石。',
  },
  pavilion: {
    label: '临水看亭',
    eyebrow: '月到风来亭意象',
    description: '亭柱向水面敞开，岸石与树影在身后收拢。',
  },
  courtyard: {
    label: '院深一隅',
    eyebrow: '殿春簃式院景',
    description: '沿着月洞门、廊墙和小屋，看一重重安静的空间。',
  },
} as const;
