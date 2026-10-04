(() => {
  const markers = [...document.querySelectorAll('.garden-marker')];
  const byId = new Map(markers.map(marker => [marker.dataset.garden, marker]));
  const storageKey = 'suzhou-gardens-map-v1';
  let visited = '';
  const readStored = () => { try { return sessionStorage.getItem(storageKey) || ''; } catch { return ''; } };
  const show = id => {
    const marker = byId.get(id);
    if (!marker) return;
    const data = marker.dataset;
    document.querySelector('#preview-image').src = `assets/${id}.jpg`;
    document.querySelector('#preview-image').alt = data.alt;
    document.querySelector('#preview-name').firstChild.textContent = data.name;
    document.querySelector('#preview-theme').textContent = data.theme;
    document.querySelector('#preview-description').textContent = data.description;
  };
  const restore = () => {
    // A fixed set of garden IDs only; never use return URLs supplied by visitors.
    const hash = new URLSearchParams(location.hash.slice(1)).get('garden');
    visited = byId.has(hash) ? hash : readStored();
    markers.forEach(marker => marker.classList.toggle('is-current', marker.dataset.garden === visited));
    const current = byId.get(visited);
    document.querySelector('#return-note').textContent = current ? `刚看过${current.dataset.name}，再选一园。` : '';
    show(current ? visited : 'liuyuan');
  };
  markers.forEach(marker => {
    marker.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') show(marker.dataset.garden); });
    marker.addEventListener('focus', () => show(marker.dataset.garden));
    marker.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const id = marker.dataset.garden;
      try { sessionStorage.setItem(storageKey, id); } catch { /* Navigation works without storage. */ }
      history.replaceState(null, '', `#garden=${id}`);
      // Leave navigation to the real anchor: no animation timer or loading lock.
    });
  });
  document.querySelector('.map-markers').addEventListener('pointerleave', () => show(byId.has(visited) ? visited : 'liuyuan'));
  addEventListener('pageshow', restore);
  addEventListener('hashchange', restore);
  restore();
})();
