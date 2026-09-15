/* ======================================================================
   UI.JS — Interface Controls & Interactions
   InfoCard · Search (Desktop + Mobile Overlay) · Visitor Chips
   Legend · Camera Presets · Toast
====================================================================== */

const IS_MOBILE = () => window.innerWidth < 768;
let currentCategoryFilter = 'all';


/* ======================================================================
   INFO CARD — Building detail panel
====================================================================== */
const infoCard    = document.getElementById('infoCard');
const infoHero    = document.getElementById('infoHero');
const infoImage   = document.getElementById('infoImage');
const infoPhotoBadge = document.getElementById('infoPhotoBadge');
const visitorBar  = document.getElementById('visitorBar');
let currentFeature = null;

/* Image load/error */
if (infoImage) {
  infoImage.addEventListener('load', () => {
    if (infoImage.getAttribute('src')) {
      infoImage.classList.add('loaded');
      infoHero.classList.add('has-photo');
      infoHero.classList.remove('no-photo');
      if (infoPhotoBadge) infoPhotoBadge.style.display = 'flex';
    }
  });
  infoImage.addEventListener('error', () => {
    infoImage.classList.remove('loaded');
    infoHero.classList.remove('has-photo');
    infoHero.classList.add('no-photo');
    if (infoPhotoBadge) infoPhotoBadge.style.display = 'none';
  });
}

/* Click hero → open photo in new tab */
if (infoHero) {
  infoHero.addEventListener('click', (e) => {
    if (e.target.closest('#infoClose') || e.target.closest('#visitorStarBadge')) return;
    if (!infoHero.classList.contains('has-photo')) return;
    const src = infoImage ? infoImage.getAttribute('src') : null;
    if (src) window.open(src, '_blank');
  });
}

/**
 * openInfoCard — bind a GeoJSON feature's properties to the InfoCard DOM.
 */
function openInfoCard(feature) {
  currentFeature = feature;
  const props = (feature && feature.properties) ? feature.properties : {};
  const cat   = CATEGORY_MAP[props.category] || CATEGORY_MAP.academic;

  document.getElementById('infoHeroIcon').textContent = cat.icon || '🏛️';
  document.getElementById('heroGlow').style.background = props.color || cat.color || '#0284c7';

  /* Star badge */
  const starEl = document.getElementById('visitorStarBadge');
  if (props.isStar) {
    starEl.textContent = props.starLabel || '⭐ จุดบริการผู้มาติดต่อ';
    starEl.style.display = 'flex';
  } else {
    starEl.style.display = 'none';
  }

  /* Type badge */
  document.getElementById('infoType').textContent = cat.name || 'อาคารทั่วไป';
  document.getElementById('infoDot').style.background = props.color || cat.color;

  /* Name */
  const rawName = typeof props.name === 'string' ? props.name.trim() : '';
  const buildingName = (rawName && rawName !== '-') ? rawName : 'ไม่ระบุชื่ออาคาร';
  document.getElementById('infoName').textContent = buildingName;

  /* ID */
  const rawBid = props.bid_id;
  const hasValidBid = rawBid !== undefined && rawBid !== null
    && String(rawBid).trim() !== '' && String(rawBid).trim() !== '-';
  document.getElementById('infoId').textContent = hasValidBid ? `รหัสอาคาร #${rawBid}` : 'รหัสอาคาร —';

  /* Visitor tip */
  const tipText = (props.visitorTip && String(props.visitorTip).trim() !== '-')
    ? String(props.visitorTip).trim()
    : 'อาคารและพื้นที่ให้บริการของวิทยาลัยสารพัดช่างอุดรธานี';
  document.getElementById('infoVisitorTip').textContent = tipText;

  /* Description */
  let descText = '';
  if (props.description && String(props.description).trim() !== '' && String(props.description).trim() !== '-') {
    descText = String(props.description).trim();
  } else if (props.desc && String(props.desc).trim() !== '' && String(props.desc).trim() !== '-') {
    descText = String(props.desc).trim();
  } else {
    descText = tipText;
  }
  document.getElementById('infoDesc').textContent = descText;

  /* Hero photo */
  if (infoHero && infoImage) {
    infoImage.classList.remove('loaded');
    const photoUrl = getBuildingImageUrl(props);
    if (photoUrl) {
      infoHero.classList.add('has-photo');
      infoHero.classList.remove('no-photo');
      infoImage.src = photoUrl;
      infoImage.alt = buildingName;
      if (infoPhotoBadge) infoPhotoBadge.style.display = 'flex';
    } else {
      infoHero.classList.remove('has-photo');
      infoHero.classList.add('no-photo');
      infoImage.removeAttribute('src');
      if (infoPhotoBadge) infoPhotoBadge.style.display = 'none';
    }
  }

  /* Open card */
  infoCard.classList.add('open');

  /* Mobile: hide visitor bar, close search overlay & legend */
  if (IS_MOBILE()) {
    document.body.classList.add('info-open');
    closeSearchOverlay();
    closeMapLegend();
  }
}

/**
 * closeInfoCard — fully resets DOM state and hides the panel.
 */
function closeInfoCard() {
  infoCard.classList.remove('open');
  document.body.classList.remove('info-open');
  setSelected(null);
  currentFeature = null;
  if (infoImage) {
    infoImage.classList.remove('loaded');
    infoImage.removeAttribute('src');
  }
  if (infoHero) infoHero.classList.remove('has-photo', 'no-photo');
}

document.getElementById('infoClose').addEventListener('click', () => closeInfoCard());

/* Navigation → Google Maps */
document.getElementById('btnGoogleMaps').addEventListener('click', () => {
  if (!currentFeature) return;
  const [lng, lat] = getCentroid(currentFeature);
  const name = encodeURIComponent(currentFeature.properties.name || 'UPTECH');
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
  showToast('กำลังเปิดเส้นทางใน Google Maps...');
});

/* Copy building name */
document.getElementById('btnCopyName').addEventListener('click', () => {
  if (!currentFeature) return;
  const name = currentFeature.properties.name || '';
  navigator.clipboard.writeText(name)
    .then(() => showToast(`คัดลอก "${name}" สำเร็จ!`))
    .catch(() => showToast('ไม่สามารถคัดลอกข้อความได้'));
});


/* ======================================================================
   SEARCH & BUILDING LIST — Desktop sidebar + Mobile overlay
====================================================================== */
const searchInput    = document.getElementById('searchInput');
const clearSearch    = document.getElementById('clearSearch');
const buildingList   = document.getElementById('buildingList');
const buildingCount  = document.getElementById('buildingCount');
const buildingListMobile = document.getElementById('buildingListMobile');

/**
 * Render building items into a target list element.
 */
function renderToList(listEl, features, query, category) {
  if (!listEl) return;
  if (!Array.isArray(features)) return;

  const q = (query || '').trim().toLowerCase();

  const filtered = [];
  features.forEach(f => {
    const p = f.properties;
    const name = (p.name || '').toLowerCase();
    const desc = (p.desc || p.description || '').toLowerCase();
    const tip  = (p.visitorTip || '').toLowerCase();
    if (q && !name.includes(q) && !desc.includes(q) && !tip.includes(q)) return;
    if (category !== 'all') {
      if (category === 'admin' && p.category !== 'admin' && p.category !== 'security') return;
      else if (category !== 'admin' && p.category !== category) return;
    }
    filtered.push(f);
  });

  /* Match gates */
  const matchedGates = [];
  GATES_CONFIG.forEach(g => {
    const name = (g.name || '').toLowerCase();
    const desc = (g.desc || '').toLowerCase();
    const matchQ = !q || name.includes(q) || desc.includes(q)
      || 'ประตู'.includes(q) || 'ทางเข้า'.includes(q);
    const matchCat = (category === 'all' || category === 'admin' || category === 'security');
    if (matchQ && matchCat) matchedGates.push(g);
  });

  const starItems   = filtered.filter(f => f.properties.isStar);
  const normalItems = filtered.filter(f => !f.properties.isStar);
  const total = filtered.length + matchedGates.length;

  if (buildingCount) buildingCount.textContent = `${total} จุดบริการ`;

  let html = '';

  if (matchedGates.length) {
    html += '<div class="list-section-title">🚪 ประตูทางเข้า-ออกวิทยาลัย</div>';
    matchedGates.forEach(g => {
      html += `<div class="b-item gate-list-item" data-gate-id="${g.id}">
        <div class="b-dot" style="background:#ef4444"></div>
        <div class="b-text">
          <div class="b-name">${g.name}</div>
          <div class="b-sub">🛡️ ป้อมยาม & ประตูเข้า-ออก</div>
        </div>
        <div class="b-arrow">›</div>
      </div>`;
    });
  }

  if (starItems.length) {
    html += '<div class="list-section-title">⭐ จุดติดต่อสำคัญสำหรับผู้มาเยือน</div>';
    starItems.forEach(f => { html += buildingItemHTML(f); });
  }

  if (normalItems.length) {
    html += `<div class="list-section-title">${starItems.length || matchedGates.length ? 'อาคารและพื้นที่อื่นๆ' : 'ผลการค้นหา'}</div>`;
    normalItems.forEach(f => { html += buildingItemHTML(f); });
  }

  if (!total) {
    html = '<div class="list-section-title" style="text-align:center;padding:32px 16px;color:#94a3b8;">ไม่พบอาคารหรือประตูตามเงื่อนไขที่เลือก</div>';
  }

  listEl.innerHTML = html;

  /* Bind building clicks */
  listEl.querySelectorAll('.b-item[data-bid]').forEach(el => {
    el.addEventListener('click', () => {
      const bid = Number(el.dataset.bid);
      const feature = buildingsData.features.find(ft => ft.properties.bid_id === bid);
      if (feature) {
        if (IS_MOBILE()) closeSearchOverlay();
        focusBuilding(feature);
      }
    });
  });

  /* Bind gate clicks */
  listEl.querySelectorAll('.gate-list-item').forEach(el => {
    el.addEventListener('click', () => {
      const gid = el.dataset.gateId;
      if (gid) {
        if (IS_MOBILE()) closeSearchOverlay();
        focusGate(gid);
      }
    });
  });
}

function buildingItemHTML(f) {
  const p = f.properties;
  const clickable = (typeof isClickable === 'function')
    ? isClickable(p)
    : (p && (p.clickable === true || String(p.clickable).toUpperCase() === 'TRUE'));
  const cat   = CATEGORY_MAP[p.category] || CATEGORY_MAP.academic;
  const color  = p.color || cat.color;
  const sub    = p.visitorRole || (cat.icon + ' ' + cat.name);
  const isSelected = (typeof selectedId !== 'undefined' && selectedId !== null && selectedId === p.bid_id);
  return `<div class="b-item ${clickable ? '' : 'disabled'} ${isSelected ? 'active' : ''}"
       data-bid="${p.bid_id}">
    <div class="b-dot" style="background:${color}"></div>
    <div class="b-text">
      <div class="b-name">${p.name || 'ไม่ระบุชื่อ'}</div>
      <div class="b-sub">${sub}</div>
    </div>
    ${clickable ? '<div class="b-arrow">›</div>' : ''}
  </div>`;
}

/**
 * renderBuildingList — renders to BOTH desktop (#buildingList) and
 * mobile (#buildingListMobile) to keep them in sync.
 */
function renderBuildingList(features, query, category) {
  if (typeof features === 'string') {
    category = features;
    features = (buildingsData && buildingsData.features) ? buildingsData.features : [];
  } else if (!Array.isArray(features)) {
    features = (buildingsData && buildingsData.features) ? buildingsData.features : [];
  }
  query    = query    || (searchInput ? searchInput.value : '') || '';
  category = category || currentCategoryFilter;

  renderToList(buildingList,       features, query, category);
  renderToList(buildingListMobile, features, query, category);
}

/* ── Desktop search input ── */
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    if (clearSearch) clearSearch.classList.toggle('show', val.length > 0);
    if (buildingsData) renderBuildingList(buildingsData.features, val, currentCategoryFilter);
  });
}

if (clearSearch) {
  clearSearch.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    clearSearch.classList.remove('show');
    if (buildingsData) renderBuildingList(buildingsData.features, '', currentCategoryFilter);
  });
}

/* ── Desktop category filter ── */
document.querySelectorAll('#catFilter .filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#catFilter .filter-btn').forEach(b => b.classList.remove('active'));
    /* Sync mobile filter */
    document.querySelectorAll('#catFilterMobile .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const mobileSync = document.querySelector(`#catFilterMobile .filter-btn[data-cat="${btn.dataset.cat}"]`);
    if (mobileSync) mobileSync.classList.add('active');
    currentCategoryFilter = btn.dataset.cat;
    if (buildingsData) renderBuildingList(buildingsData.features, searchInput ? searchInput.value : '', currentCategoryFilter);
  });
});


/* ======================================================================
   SEARCH OVERLAY — Mobile only
====================================================================== */
const searchOverlay      = document.getElementById('searchOverlay');
const searchInputMobile  = document.getElementById('searchInputMobile');
const clearSearchMobile  = document.getElementById('clearSearchMobile');

function openSearchOverlay() {
  if (!searchOverlay) return;
  searchOverlay.classList.add('open');
  closeMapLegend();
  /* Auto-focus search input after transition */
  setTimeout(() => { if (searchInputMobile) searchInputMobile.focus(); }, 300);
  /* Render current list */
  if (buildingsData) renderBuildingList(buildingsData.features, '', currentCategoryFilter);
}

function closeSearchOverlay() {
  if (!searchOverlay) return;
  searchOverlay.classList.remove('open');
  if (searchInputMobile) {
    searchInputMobile.value = '';
    if (clearSearchMobile) clearSearchMobile.classList.remove('show');
  }
}

const btnOpenSearch  = document.getElementById('btnOpenSearch');
const btnCloseSearch = document.getElementById('btnCloseSearch');

if (btnOpenSearch)  btnOpenSearch.addEventListener('click', openSearchOverlay);
if (btnCloseSearch) btnCloseSearch.addEventListener('click', closeSearchOverlay);

/* Mobile search input */
if (searchInputMobile) {
  searchInputMobile.addEventListener('input', (e) => {
    const val = e.target.value;
    if (clearSearchMobile) clearSearchMobile.classList.toggle('show', val.length > 0);
    if (buildingsData) renderBuildingList(buildingsData.features, val, currentCategoryFilter);
  });
}

if (clearSearchMobile) {
  clearSearchMobile.addEventListener('click', () => {
    if (searchInputMobile) searchInputMobile.value = '';
    clearSearchMobile.classList.remove('show');
    if (buildingsData) renderBuildingList(buildingsData.features, '', currentCategoryFilter);
  });
}

/* Mobile category filter */
document.querySelectorAll('#catFilterMobile .filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#catFilterMobile .filter-btn').forEach(b => b.classList.remove('active'));
    /* Sync desktop filter */
    document.querySelectorAll('#catFilter .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const desktopSync = document.querySelector(`#catFilter .filter-btn[data-cat="${btn.dataset.cat}"]`);
    if (desktopSync) desktopSync.classList.add('active');
    currentCategoryFilter = btn.dataset.cat;
    const q = searchInputMobile ? searchInputMobile.value : '';
    if (buildingsData) renderBuildingList(buildingsData.features, q, currentCategoryFilter);
  });
});

/* Close search overlay on Escape */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && searchOverlay && searchOverlay.classList.contains('open')) {
    closeSearchOverlay();
  }
});


/* ======================================================================
   VISITOR CHIPS — Desktop (sidebar strip) + Mobile (visitor bar)
   Bound by data-bid attribute on all .v-chip elements
====================================================================== */
document.querySelectorAll('.v-chip[data-bid]').forEach(chip => {
  chip.addEventListener('click', () => {
    const bid = Number(chip.dataset.bid);
    if (!buildingsData) return;
    const feature = buildingsData.features.find(ft => ft.properties.bid_id === bid);
    if (feature) {
      if (IS_MOBILE()) closeSearchOverlay();
      focusBuilding(feature);
    }
  });
});


/* ======================================================================
   CAMERA PRESETS
====================================================================== */
document.getElementById('btnReset').addEventListener('click', () => {
  closeInfoCard();
  const view = getDefaultView();
  map.flyTo({ center: CAMPUS_CENTER, zoom: view.zoom, pitch: view.pitch, bearing: view.bearing, speed: 1.1 });
  showToast('รีเซ็ตมุมมองแผนที่เริ่มต้น');
});

document.getElementById('btnTop').addEventListener('click', () => {
  map.flyTo({ center: map.getCenter(), zoom: TOP_VIEW.zoom, pitch: TOP_VIEW.pitch, bearing: TOP_VIEW.bearing, speed: 1.1 });
  showToast('เปลี่ยนเป็นมุมมองด้านบน 2D');
});

/* Toggle markers button */
const btnToggleMarkers = document.getElementById('btnToggleMarkers');
if (btnToggleMarkers) {
  btnToggleMarkers.addEventListener('click', () => {
    markersVisible = !markersVisible;
    btnToggleMarkers.classList.toggle('hdr-active', markersVisible);
    updateMarkersVisibility(true);
    showToast(markersVisible ? '📍 เปิดแสดงป้ายบอกตำแหน่ง' : '🚫 ปิดการแสดงป้ายบอกตำแหน่ง');
  });
}


/* ======================================================================
   MAP LEGEND
====================================================================== */
const mapLegend      = document.getElementById('mapLegend');
const legendBackdrop = document.getElementById('legendBackdrop');
const legendCloseBtn = document.getElementById('legendCloseBtn');
const legendHeader   = document.getElementById('legendHeader');
const btnToggleLegend = document.getElementById('btnToggleLegend');

/* Desktop: start collapsed */
if (mapLegend && !IS_MOBILE()) {
  mapLegend.classList.add('collapsed');
}

function openMapLegend() {
  if (!mapLegend) return;
  if (IS_MOBILE()) {
    mapLegend.classList.add('mobile-open');
    if (legendBackdrop) legendBackdrop.classList.add('active');
    closeSearchOverlay();
  } else {
    mapLegend.classList.remove('collapsed');
  }
}

function closeMapLegend() {
  if (!mapLegend) return;
  if (IS_MOBILE()) {
    mapLegend.classList.remove('mobile-open');
    if (legendBackdrop) legendBackdrop.classList.remove('active');
  } else {
    mapLegend.classList.add('collapsed');
  }
}

function toggleMapLegend() {
  if (!mapLegend) return;
  if (IS_MOBILE()) {
    mapLegend.classList.contains('mobile-open') ? closeMapLegend() : openMapLegend();
  } else {
    mapLegend.classList.toggle('collapsed');
  }
}

if (btnToggleLegend)  btnToggleLegend.addEventListener('click', toggleMapLegend);
if (legendBackdrop)   legendBackdrop.addEventListener('click', closeMapLegend);
if (legendCloseBtn)   legendCloseBtn.addEventListener('click', (e) => { e.stopPropagation(); closeMapLegend(); });

if (legendHeader) {
  legendHeader.addEventListener('click', (e) => {
    if (e.target.closest('#legendCloseBtn')) return;
    if (!IS_MOBILE()) mapLegend.classList.toggle('collapsed');
  });
}

/* Legend items → filter building list */
document.querySelectorAll('.legend-item').forEach(item => {
  item.addEventListener('click', () => {
    const cat = item.dataset.cat;
    /* Activate filter button */
    document.querySelectorAll('#catFilter .filter-btn, #catFilterMobile .filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.cat === cat);
    });
    currentCategoryFilter = cat;
    if (buildingsData) renderBuildingList(buildingsData.features, '', cat);
    const label = item.querySelector('span:last-child').textContent;
    closeMapLegend();
    if (IS_MOBILE()) openSearchOverlay();
    showToast(`กรองหมวดหมู่: ${label}`);
  });
});


/* ======================================================================
   SIDEBAR COMPAT — kept for JS references in app.js
   Sidebar is desktop-only; these are no-ops on mobile
====================================================================== */
function setSidebarExpanded() {
  /* Sidebar is always visible on desktop and not a sheet on mobile. No-op. */
}


/* ======================================================================
   TOAST
====================================================================== */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = `<span>🔔</span> <span>${msg}</span>`;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}
