const GARDEN_ID = 'liuyuan';
const SITE_MAP = 'https://suzhou-gardens.jggagi.chatgpt.site/';

/** Fixed navigation destinations, independent of referrers or visitor URL inputs. */
export function getMapHref(currentUrl: string): string {
  const current = new URL(currentUrl);
  const parts = current.pathname.split('/').filter(Boolean);
  const packaged = parts.length === 1 && parts[0] === GARDEN_ID
    || parts.length === 2 && parts[0] === GARDEN_ID && parts[1] === 'index.html';
  const map = new URL(packaged ? '/' : SITE_MAP, current.origin);
  map.hash = `garden=${GARDEN_ID}`;
  return map.href;
}
