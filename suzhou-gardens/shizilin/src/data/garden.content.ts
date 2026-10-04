export const UI_CONTENT = {
  gardenName: '狮子林', seal: '石趣', romanName: 'SHIZILIN',
  title: '掌上狮子林', englishTitle: 'SHIZILIN / A GARDEN IN MINIATURE',
  location: '中国 · 苏州', milestone: '石境回转 · 文人画意',
  introduction: '石中藏路，岩间架桥，一池清水留白。',
  stageLabel: '可旋转与缩放的狮子林三维微缩景观', edition: '一园，四种凝望',
  presetHeading: '选择观景点', currentView: '当前观景', freeView: '自由观察',
  freeDescription: '循着洞壑与回廊，慢慢看见石境里藏着的路。',
  reset: '回到全园', desktopHint: '拖动旋转 · 滚轮缩放', touchHint: '单指旋转 · 双指缩放',
  loading: '正在布置石境…', ready: '园景就绪', errorStatus: '园景暂未就绪',
  errorTitle: '暂时无法展开园景',
  errorDescription: '请确认浏览器已开启 WebGL 与硬件加速，再重试或刷新页面。', retry: '重新加载园景',
  artNotice: '根据狮子林洞壑假山与池亭关系提炼的艺术化微缩景观，非等比例全园复原。',
  placeholderNotice: '洞壑、亭廊与桥径为程序化艺术造型。',
} as const;
export const VIEW_CONTENT = {
  overview: { label: '石境回转', eyebrow: '石 · 桥 · 水', description: '低而连绵的岩脊与一池留白，构成彼此相望的两半园景。' },
  rockery: { label: '洞壑寻径', eyebrow: '山腹有路', description: '透过石腹的洞道，看见上层小桥与下层幽径交错。' },
  waterside: { label: '池亭相望', eyebrow: '东侧池景', description: '小亭轻落在水面一角，岩影与桥线把视线引回石境。' },
  corridor: { label: '廊转见石', eyebrow: '曲折院界', description: '由廊与月洞的转折，窥见庭院另一侧的洞壑。' },
} as const;
