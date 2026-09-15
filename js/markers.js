/* ======================================================================
   3D LOCATION MARKERS (GATES & ADMIN BUILDING)
   ป้ายบอกตำแหน่งซุ้มประตู 1-4 และอาคารอำนวยการ
   — Anchor strictly to LngLat; no popup; no position:fixed override
====================================================================== */

/* ======================================================================
   4.1) CAMPUS GATES MARKERS
====================================================================== */
const gateMarkers = [];

function initGateMarkers() {
  // Clear any existing markers
  gateMarkers.forEach(m => m.remove());
  gateMarkers.length = 0;

  GATES_CONFIG.forEach(gateCfg => {
    const el = document.createElement('div');
    el.className = 'gate-marker';
    el.dataset.gateId = gateCfg.id;
    el.setAttribute('aria-label', gateCfg.name + ' — แตะเพื่อดูรายละเอียด');
    el.title = gateCfg.name;

    el.innerHTML = `
      <div class="gate-marker-badge">
        <span class="gate-marker-icon">🚪</span>
        <span>${gateCfg.shortName || gateCfg.name}</span>
      </div>
      <div class="gate-marker-pulse"></div>
    `;

    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      focusGate(gateCfg.id);
    });

    /*
      MARKER ANCHOR FIX:
      - anchor: 'bottom'  → the bottom-center of the element aligns to the LngLat point
      - This must NOT be overridden by position:fixed in CSS (see markers.css comments)
      - MapLibre's internal transform matrix positions the parent .maplibregl-marker
        element; we only control the child element styling inside it
    */
    const marker = new maplibregl.Marker({
      element: el,
      anchor: 'bottom'
    })
      .setLngLat(gateCfg.coords || gateCfg.coordinates)
      .addTo(map);

    gateMarkers.push(marker);
  });

  updateMarkersVisibility();
}


/* ======================================================================
   4.2) ADMIN BUILDING MARKER (อาคารอำนวยการ)
====================================================================== */
let adminMarker = null;

function initAdminMarker() {
  if (adminMarker) {
    adminMarker.remove();
    adminMarker = null;
  }

  const adminCoords = [102.788829, 17.399158];

  const el = document.createElement('div');
  el.className = 'admin-marker';
  el.dataset.bid = '11';
  el.setAttribute('aria-label', 'อาคารอำนวยการ — ศูนย์ติดต่อราชการหลัก');
  el.title = 'อาคารอำนวยการ (ติดต่อราชการ)';

  el.innerHTML = `
    <div class="admin-marker-badge">
      <span class="admin-marker-icon">🏛️</span>
      <span>อาคารอำนวยการ</span>
      <span class="admin-marker-tag">ติดต่อราชการ</span>
    </div>
    <div class="admin-marker-pulse"></div>
  `;

  el.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const f = buildingsData && buildingsData.features
      ? buildingsData.features.find(ft => Number(ft.properties.bid_id) === 11)
      : null;
    if (f) {
      focusBuilding(f);
    } else {
      focusBuilding({
        properties: {
          bid_id: 11,
          name: 'อาคารอำนวยการ',
          category: 'admin',
          color: '#f59e0b',
          isStar: true,
          starLabel: '⭐ จุดติดต่อราชการหลัก',
          visitorTip: 'ศูนย์ประสานงานและจุดติดต่อราชการหลักของวิทยาลัย ชั้น 1 งานทะเบียน การเงิน กิจการนักศึกษา',
          clickable: 'TRUE'
        },
        geometry: {
          type: 'Point',
          coordinates: adminCoords
        }
      });
    }
  });

  adminMarker = new maplibregl.Marker({
    element: el,
    anchor: 'bottom'
  })
    .setLngLat(adminCoords)
    .addTo(map);

  updateMarkersVisibility();
}


let markersVisible = true;
let lastShouldShow = null;
let lastIsCollapsed = null;

/**
 * Controls marker visibility based on zoom level and markersVisible toggle.
 *
 * Performance optimization: Caches lastShouldShow and lastIsCollapsed
 * so 99% of zoom frames during pinch/drag return instantly with 0 DOM mutations.
 */
function updateMarkersVisibility(force = false) {
  if (!map) return;
  const z = map.getZoom();
  const isMobile = window.innerWidth <= 768;

  const minVisibleZoom = isMobile ? 16.3 : 15.6;
  const collapseZoom   = isMobile ? 17.2 : 16.5;

  const shouldShow  = markersVisible && (z >= minVisibleZoom);
  const isCollapsed = z < collapseZoom;

  if (!force && shouldShow === lastShouldShow && isCollapsed === lastIsCollapsed) return;
  lastShouldShow = shouldShow;
  lastIsCollapsed = isCollapsed;

  const applyToEl = (el) => {
    if (!el) return;
    el.style.visibility = shouldShow ? 'visible' : 'hidden';
    el.style.pointerEvents = shouldShow ? 'auto' : 'none';
    if (shouldShow) {
      el.classList.toggle('collapsed', isCollapsed);
      el.style.transform = isCollapsed ? 'scale(0.88)' : 'scale(1)';
    }
  };

  gateMarkers.forEach(m => applyToEl(m.getElement()));
  if (adminMarker) applyToEl(adminMarker.getElement());
}

map.on('zoom', () => updateMarkersVisibility(false));
window.addEventListener('resize', () => updateMarkersVisibility(true));


/* ======================================================================
   FOCUS GATE — fly to gate and open InfoCard
====================================================================== */
function focusGate(gateId) {
  const hoverTooltip = document.getElementById('hoverTooltip');
  if (hoverTooltip) hoverTooltip.classList.remove('show');

  const gateCfg = getGateConfig(gateId);
  if (!gateCfg) return;

  setSelected(null);
  if (campus3DLayer && campus3DLayer.setSelectedGate) {
    campus3DLayer.setSelectedGate(gateId);
  }

  document.querySelectorAll('.gate-marker').forEach(el => {
    el.classList.toggle('active', el.dataset.gateId === gateId);
  });
  document.querySelectorAll('.admin-marker').forEach(el => el.classList.remove('active'));

  const coords = gateCfg.coords || gateCfg.coordinates;
  map.flyTo({
    center: coords,
    zoom: 19.2,
    pitch: 58,
    bearing: (gateCfg.heading || 26) + 4,
    speed: 0.9,
    curve: 1.3,
    essential: true
  });

  openGateInfoCard(gateCfg);
}


/* ======================================================================
   GATE INFO CARD — build a synthetic GeoJSON feature for the gate
====================================================================== */
function openGateInfoCard(gateConfig) {
  const coords = gateConfig.coords || gateConfig.coordinates;
  const gateFeature = {
    properties: {
      bid_id: null,
      name: gateConfig.name,
      category: 'security',
      color: '#ef4444',
      isStar: gateConfig.isMain || gateConfig.id === 'gate-1',
      starLabel: gateConfig.isMain ? '⭐ ทางเข้าหลักวิทยาลัย' : '🛡️ ประตูทางเข้า-ออก',
      visitorTip: gateConfig.isMain
        ? 'ทางเข้าหลักติดถนนมิตรภาพ ตรงข้ามป้อมยาม สำหรับรถยนต์ บุคคลภายนอก และการติดต่อราชการ'
        : 'ประตูทางเข้า-ออกวิทยาลัย สำหรับนักเรียนนักศึกษา บุคลากร และยานพาหนะ',
      desc: gateConfig.desc || `ซุ้มประตูทางเข้า-ออกของวิทยาลัย (${gateConfig.name})`,
      isGate: true,
      gate_id: gateConfig.id
    },
    geometry: {
      type: 'Point',
      coordinates: coords
    }
  };
  openInfoCard(gateFeature);
}
