/** Describes the miniature's composition, without claiming a surveyed reconstruction. */
export const UI_CONTENT = {
  gardenName: '沧浪亭', seal: '沧浪', romanName: 'CANG LANG TING',
  title: '掌上沧浪亭', englishTitle: 'CANG LANG TING / WATER BEYOND THE WALL',
  location: '中国 · 苏州', milestone: '艺术微缩 · 水外山林',
  introduction: '水在园外，山林在内；复廊将两边的风景轻轻连起。',
  stageLabel: '可旋转与缩放的沧浪亭三维微缩景观', edition: '一园，四种凝望',
  presetHeading: '选择观景点', currentView: '当前观景', freeView: '自由观察',
  freeDescription: '沿复廊看水，转过漏窗，山林又在另一边展开。',
  reset: '回到全园', desktopHint: '拖动旋转 · 滚轮缩放', touchHint: '单指旋转 · 双指缩放',
  loading: '正在布置园景…', ready: '园景就绪', errorStatus: '园景暂未就绪',
  errorTitle: '暂时无法展开园景', errorDescription: '请确认浏览器已开启 WebGL 与硬件加速，再重试或刷新页面。',
  retry: '重新加载园景',
  artNotice: '提炼沧浪亭“水外山林”与复廊借景关系的艺术化微缩景观，非等比例全园复原。',
  placeholderNotice: '建筑、丘石与植物为程序化艺术造型；位置与尺度经过压缩。',
} as const;
export const VIEW_CONTENT = {
  overview: { label: '水外山林', eyebrow: '全园 · 内外相望', description: '外河绕过园边，丘上的亭与密林向内展开。' },
  waterside: { label: '隔水看园', eyebrow: '外河 · 疏朗留白', description: '先看见开阔的河面，再看见廊后层层升起的山林。' },
  pavilion: { label: '丘上望亭', eyebrow: '山林 · 高处停留', description: '亭坐在小丘之上，松枝有高低，坡石有转折。' },
  corridor: { label: '复廊两望', eyebrow: '漏窗 · 水与山之间', description: '廊的两侧都敞开，透过真实漏窗，看见园内与园外相接。' },
} as const;
