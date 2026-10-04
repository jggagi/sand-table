import { describe, expect, it } from 'vitest';
import { getMapHref } from '../src/navigation/mapLink';

describe('地图往返的固定目的地', () => {
  it.each(['/liuyuan/', '/liuyuan/index.html'])('打包路径 %s 回到同站点地图', path => {
    expect(getMapHref(`https://example.test${path}?return=https://evil.test/`)).toBe('https://example.test/#garden=liuyuan');
  });
  it.each(['/', '/index.html', '/other/liuyuan/'])('独立园林路径 %s 回到既有 Site，忽略任意返回地址', path => {
    expect(getMapHref(`https://garden.test${path}?return=https://evil.test/`)).toBe('https://suzhou-gardens.jggagi.chatgpt.site/#garden=liuyuan');
  });
});
