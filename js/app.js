/* ======================================================================
   MAIN APPLICATION BOOTSTRAP & ORCHESTRATION
   โหลด GeoJSON, ประสานงานระหว่างแผนที่ โมเดล 3D และ UI
====================================================================== */

let buildingsData = null;
let selectedId = null;
let hoveredId = null;
let currentHovered3DBid = null;
let currentHoveredGateId = null;
let lastMouseMoveTime = 0;

function isClickable(props) {
  if (!props) return false;
  const v = props.clickable;
  return v === true || String(v).toUpperCase() === 'TRUE';
}

function getCentroid(feature) {
  if (!feature || !feature.geometry) return CAMPUS_CENTER;
  if (feature.geometry.type === 'Point') return feature.geometry.coordinates;
  const coords = feature.geometry.coordinates;
  let ring = feature.geometry.type === 'Polygon' ? coords[0] : coords[0][0];
  let sx = 0, sy = 0;
  ring.forEach(([x, y]) => { sx += x; sy += y; });
  return [sx / ring.length, sy / ring.length];
}

function isDesktopPointer() {
  return window.innerWidth > 768 && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function check3DHit(point, lngLat) {
  if (!lngLat) return null;

  // 1) ตรวจสอบด้วย Three.js Raycaster ยิงแสงจากมุมกล้องลงสู่ 3D Mesh จริง (อาคารและซุ้มประตู)
  if (campus3DLayer && campus3DLayer.raycast) {
    const rayResult = campus3DLayer.raycast(point, lngLat);
    if (rayResult && rayResult.hit) {
      return rayResult;
    }
  }

  // 2) ตรวจสอบควบคู่กับพื้นที่แปลงที่ดิน (Polygon Footprint) บนแผนที่ เฉพาะอาคารที่โมเดลโหลดเสร็จแล้ว
  if (buildingsData && buildingsData.features) {
    const b3dIds = getLoaded3DBuildingIds();
    for (const bid of b3dIds) {
      const f = buildingsData.features.find(ft => Number(ft.properties.bid_id) === bid);
      if (f && f.geometry && f.geometry.coordinates) {
        const cfg = getModelConfig(bid) || {};
        const dLng = (Number(cfg.offsetX) || 0) * 0.0000095;
        const dLat = (Number(cfg.offsetY) || 0) * 0.0000090;

        const coords = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
        let inside = false;
        const x = lngLat.lng, y = lngLat.lat;
        for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
          const xi = coords[i][0] + dLng, yi = coords[i][1] + dLat;
          const xj = coords[j][0] + dLng, yj = coords[j][1] + dLat;
          const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        if (inside) return { hit: true, isGate: false, bid_id: bid };
      }
    }
  }
  return null;
}

function focusBuilding(feature) {
  const hoverTooltip = document.getElementById('hoverTooltip');
  if (hoverTooltip) hoverTooltip.classList.remove('show');
  const props = (feature && feature.properties) ? feature.properties : {};
  const bid = Number(props.bid_id);

  // ค้นหา feature ที่สมบูรณ์จาก buildingsData เพื่อให้ได้ Properties และ Geometry ที่ครบถ้วนที่สุด
  const targetFeature = (buildingsData && buildingsData.features)
    ? (buildingsData.features.find(ft => Number(ft.properties.bid_id) === bid) || feature)
    : feature;

  const center = getCentroid(targetFeature);

  // โหลดโมเดล 3D แบบ On-Demand ทันทีหากอาคารนี้มีไฟล์ 3D ใน Registry
  if (campus3DLayer && campus3DLayer.ensureBuildingLoaded) {
    campus3DLayer.ensureBuildingLoaded(bid);
  }

  setSelected(bid);

  map.flyTo({
    center: center,
    zoom: 18.8,
    pitch: 62,
    bearing: map.getBearing() + 15,
    speed: 0.9,
    curve: 1.3,
    essential: true
  });

  openInfoCard(targetFeature);
}

function setSelected(bid) {
  if (selectedId !== null) {
    map.setFeatureState({ source: 'buildings', id: selectedId }, { selected: false });
  }
  selectedId = bid;
  if (bid !== null) {
    map.setFeatureState({ source: 'buildings', id: bid }, { selected: true });
    // ยกเลิกการเลือกประตูเมื่อเลือกอาคาร
    if (campus3DLayer && campus3DLayer.setSelectedGate) {
      campus3DLayer.setSelectedGate(null);
    }
    document.querySelectorAll('.gate-marker').forEach(el => el.classList.remove('active'));
  }
  // อัปเดตสถานะ Active ของ Marker อาคารอำนวยการ
  document.querySelectorAll('.admin-marker').forEach(el => el.classList.toggle('active', Number(bid) === 11));

  // อัปเดตสถานะไฮไลต์ของโมเดล 3D ประจำอาคารที่ถูกเลือก
  if (campus3DLayer && campus3DLayer.setSelected) {
    campus3DLayer.setSelected(bid);
  }
  // อัปเดตการเน้นใน Sidebar list ด้วย
  document.querySelectorAll('.b-item').forEach(el => {
    el.classList.toggle('active', Number(el.dataset.bid) === bid);
  });
}

// ----------------------------------------------------------------------
// MAP LOAD EVENT: Initializing all sources, layers, models & markers
// ----------------------------------------------------------------------
map.on('load', () => {
  /* ไฟ 3D ทิศทางเฉียงเพื่อให้เงาตกกระทบข้างอาคารเกิดมิติตามธรรมชาติ */
  map.setLight({
    anchor: 'map',
    color: '#fff9f0',
    intensity: 0.58,
    position: [1.5, 215, 32]
  });

  /* 1) INVERSE BOUNDARY MASKING (Campus Island Aesthetic) */
  const initialMaskData = createInverseMask(CAMPUS_BOUNDARY);
  map.addSource('campus-outside-mask', {
    type: 'geojson',
    data: initialMaskData
  });

  map.addLayer({
    id: 'campus-outside-mask',
    type: 'fill',
    source: 'campus-outside-mask',
    paint: {
      'fill-color': '#0b0f19',
      'fill-opacity': 1.0
    }
  });

  if (window.location.protocol !== 'file:') {
    fetch(BOUNDARY_GEOJSON_PATH)
      .then(r => r.json())
      .then(boundaryGeo => {
        const updatedMask = createInverseMask(boundaryGeo);
        const maskSource = map.getSource('campus-outside-mask');
        if (maskSource) maskSource.setData(updatedMask);
      })
      .catch(err => console.warn('[Boundary Mask Update]', err));
  }

  /* 2) เส้นขอบเขตวิทยาลัย (Dashed Perimeter Line & Subtle Fill) */
  map.addSource('campus-boundary', {
    type: 'geojson',
    data: (window.location.protocol === 'file:') ? CAMPUS_BOUNDARY : BOUNDARY_GEOJSON_PATH
  });

  map.addLayer({
    id: 'campus-boundary-fill',
    type: 'fill',
    source: 'campus-boundary',
    paint: {
      'fill-color': '#38bdf8',
      'fill-opacity': 0.04
    }
  });

  map.addLayer({
    id: 'campus-boundary-line',
    type: 'line',
    source: 'campus-boundary',
    paint: {
      'line-color': '#38bdf8',
      'line-width': 2.8,
      'line-opacity': 0.85,
      'line-dasharray': [3, 2]
    }
  });

  /* 3) โหลด Source อาคาร */
  map.addSource('buildings', {
    type: 'geojson',
    data: GEOJSON_PATH,
    promoteId: 'bid_id'
  });

  map.addLayer({
    id: 'buildings-3d',
    type: 'fill-extrusion',
    source: 'buildings',
    filter: ['!', ['in', ['to-number', ['get', 'bid_id']], ['literal', getLoaded3DBuildingIds()]]],
    paint: {
      'fill-extrusion-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false], '#ffe600',
        ['boolean', ['feature-state', 'hovered'], false], '#ffffff',
        ['coalesce', ['get', 'color'], '#0284c7']
      ],
      'fill-extrusion-height': [
        'case',
        ['in', ['to-number', ['get', 'bid_id']], ['literal', getLoaded3DBuildingIds()]], 0,
        ['coalesce', ['to-number', ['get', 'height']], 3]
      ],
      'fill-extrusion-base': ['coalesce', ['to-number', ['get', 'base_height']], 0],
      'fill-extrusion-opacity': 0.94,
      'fill-extrusion-vertical-gradient': true
    }
  });

  map.addLayer({
    id: 'buildings-roof-line',
    type: 'line',
    source: 'buildings',
    filter: ['!', ['in', ['to-number', ['get', 'bid_id']], ['literal', getLoaded3DBuildingIds()]]],
    paint: {
      'line-color': '#ffffff',
      'line-width': 1.2,
      'line-opacity': 0.35
    }
  });

  /* 4) เพิ่ม Three.js Custom Layer */
  campus3DLayer = createCampus3DLayer();
  admin3DLayer = campus3DLayer;
  window.campus3DLayer = campus3DLayer;
  window.CAMPUS_3D_REGISTRY = CAMPUS_3D_REGISTRY;
  window.CUSTOM_MODELS_CONFIG = CUSTOM_MODELS_CONFIG;
  window.GATES_CONFIG = GATES_CONFIG;
  map.addLayer(campus3DLayer);

  /* 5) ติดตั้ง Markers */
  initGateMarkers();
  initAdminMarker();

  /* 6) ดึงข้อมูล GeoJSON อาคาร */
  fetch(GEOJSON_PATH).then(r => r.json()).then(data => {
    data.features.forEach(f => {
      const originalProps = Object.assign({}, f.properties);
      const originalBid = Number(originalProps.bid_id);
      const originalName = typeof originalProps.name === 'string' ? originalProps.name.trim() : '';

      const visitorOverride = VISITOR_BUILDINGS[originalBid];
      if (visitorOverride) {
        Object.assign(f.properties, visitorOverride);
        if (originalName && (!f.properties.name || f.properties.name === '-')) {
          f.properties.name = originalName;
        }
        if (originalProps.description && originalProps.description !== '-' && !f.properties.desc) {
          f.properties.desc = originalProps.description;
        }
      }

      const p = f.properties;
      p.bid_id = originalBid;
      if (!p.name) p.name = originalName || 'ไม่ระบุชื่ออาคาร';
      if (!p.category) {
        const name = (p.name || '').toLowerCase();
        if (name.includes('บ้านพัก') || name.includes('หอพัก')) {
          p.category = 'residential';
          p.color = '#818cf8';
          p.visitorTip = 'เขตที่พักอาศัยบุคลากร (พื้นที่ส่วนบุคคล)';
        } else if (name.includes('จอดรถ')) {
          p.category = 'parking';
          p.color = '#64748b';
          p.visitorTip = 'จุดจอดรถวิทยาลัย';
        } else {
          p.category = p.type === 'deco' ? 'parking' : 'academic';
          p.color = p.type === 'deco' ? '#64748b' : '#0284c7';
          p.visitorTip = 'อาคารและสิ่งอำนวยความสะดวกภายในวิทยาลัย';
        }
      }
    });

    buildingsData = data;
    window.buildingsData = buildingsData;

    // อัปเดตพิกัด Centroid ของอาคาร 3D ให้ตรงกับ GeoJSON
    get3DBuildingIds().forEach(bid => {
      const f = data.features.find(ft => Number(ft.properties.bid_id) === bid);
      if (f && campus3DLayer && campus3DLayer.updateCentroid) {
        campus3DLayer.updateCentroid(bid, getCentroid(f));
      }
    });

    // อัปเดตข้อมูลบนแผนที่เพื่อให้สี extruded สะท้อนข้อมูลใหม่ทันที
    if (map.getSource('buildings')) {
      map.getSource('buildings').setData(data);
    }

    // แสดงรายการอาคารทั้งหมดใน Sidebar
    renderBuildingList(data.features);
  }).catch(err => {
    showToast('ไม่พบไฟล์ uptech.geojson — โปรดวางไฟล์ไว้โฟลเดอร์เดียวกับ index.html');
    console.error('[GeoJSON Load Error]', err);
  });

  if (typeof map.setFog === 'function') map.setFog(null);
});

// ----------------------------------------------------------------------
// MAP INTERACTIONS (Hover, Raycasting & Click)
// ----------------------------------------------------------------------
map.on('mousemove', (e) => {
  if (!isDesktopPointer()) return;

  const hoverTooltip = document.getElementById('hoverTooltip');
  const htDot = document.getElementById('htDot');
  const htName = document.getElementById('htName');
  const htCat = document.getElementById('htCat');

  const now = performance.now();
  if (now - lastMouseMoveTime < 24) return;
  lastMouseMoveTime = now;

  const hit3D = check3DHit(e.point, e.lngLat);
  if (hit3D) {
    map.getCanvas().style.cursor = 'pointer';

    if (hit3D.isGate) {
      currentHoveredGateId = hit3D.gate_id;
      if (campus3DLayer) campus3DLayer.setHoveredGate(hit3D.gate_id);
      if (currentHovered3DBid !== null) {
        if (campus3DLayer) campus3DLayer.setHovered(null);
        currentHovered3DBid = null;
      }

      if (hoverTooltip) {
        const gateCfg = getGateConfig(hit3D.gate_id) || {};
        htDot.style.background = '#ef4444';
        htName.textContent = gateCfg.name || 'ซุ้มประตู';
        htCat.textContent = '🛡️ ป้อมยาม & ประตูเข้า-ออก';

        hoverTooltip.style.left = e.point.x + 'px';
        hoverTooltip.style.top = e.point.y + 'px';
        hoverTooltip.classList.add('show');
      }
      return;
    }

    currentHovered3DBid = hit3D.bid_id;
    if (campus3DLayer) campus3DLayer.setHovered(hit3D.bid_id);
    if (currentHoveredGateId !== null) {
      if (campus3DLayer) campus3DLayer.setHoveredGate(null);
      currentHoveredGateId = null;
    }

    if (hoverTooltip) {
      const meta = VISITOR_BUILDINGS[hit3D.bid_id] || (buildingsData?.features?.find(f => Number(f.properties.bid_id) === hit3D.bid_id)?.properties) || {};
      const catCfg = CATEGORY_MAP[meta.category || 'admin'] || CATEGORY_MAP.academic;
      htDot.style.background = meta.color || catCfg.color;
      htName.textContent = meta.name || 'อาคาร 3 มิติ';
      htCat.textContent = (catCfg.icon + ' ' + catCfg.name);

      hoverTooltip.style.left = e.point.x + 'px';
      hoverTooltip.style.top = e.point.y + 'px';
      hoverTooltip.classList.add('show');
    }
    return;
  }

  if (currentHovered3DBid !== null || currentHoveredGateId !== null) {
    currentHovered3DBid = null;
    currentHoveredGateId = null;
    if (campus3DLayer) {
      campus3DLayer.setHovered(null);
      campus3DLayer.setHoveredGate(null);
    }
    const feats = map.queryRenderedFeatures(e.point, { layers: ['buildings-3d'] });
    if (!feats.length && hoverTooltip) {
      map.getCanvas().style.cursor = '';
      hoverTooltip.classList.remove('show');
    }
  }
});

map.on('mousemove', 'buildings-3d', (e) => {
  if (!isDesktopPointer()) return;
  if (currentHovered3DBid !== null || currentHoveredGateId !== null) return;
  if (!e.features.length) return;
  const f = e.features[0];
  const p = f.properties;
  const hoverTooltip = document.getElementById('hoverTooltip');
  const htDot = document.getElementById('htDot');
  const htName = document.getElementById('htName');
  const htCat = document.getElementById('htCat');

  map.getCanvas().style.cursor = isClickable(p) ? 'pointer' : '';

  if (p.name && p.name !== '-' && hoverTooltip) {
    const catCfg = CATEGORY_MAP[p.category] || CATEGORY_MAP.academic;
    htDot.style.background = p.color || catCfg.color;
    htName.textContent = p.name;
    htCat.textContent = (catCfg.icon + ' ' + catCfg.name);

    hoverTooltip.style.left = e.point.x + 'px';
    hoverTooltip.style.top = e.point.y + 'px';
    hoverTooltip.classList.add('show');
  }

  if (f.id !== undefined) {
    if (hoveredId !== null && hoveredId !== f.id) {
      map.setFeatureState({ source: 'buildings', id: hoveredId }, { hovered: false });
    }
    hoveredId = f.id;
    map.setFeatureState({ source: 'buildings', id: hoveredId }, { hovered: true });
  }
});

map.on('mouseleave', 'buildings-3d', () => {
  if (!isDesktopPointer()) return;
  if (currentHovered3DBid !== null || currentHoveredGateId !== null) return;
  map.getCanvas().style.cursor = '';
  const hoverTooltip = document.getElementById('hoverTooltip');
  if (hoverTooltip) hoverTooltip.classList.remove('show');
  if (hoveredId !== null) {
    map.setFeatureState({ source: 'buildings', id: hoveredId }, { hovered: false });
    hoveredId = null;
  }
});

map.on('mouseleave', () => {
  if (!isDesktopPointer()) return;
  const hoverTooltip = document.getElementById('hoverTooltip');
  if (hoverTooltip) hoverTooltip.classList.remove('show');
  if (campus3DLayer) {
    campus3DLayer.setHovered(null);
    campus3DLayer.setHoveredGate(null);
  }
});

map.on('click', (e) => {
  const hoverTooltip = document.getElementById('hoverTooltip');
  if (hoverTooltip) hoverTooltip.classList.remove('show');

  const hit3D = check3DHit(e.point, e.lngLat);
  if (hit3D) {
    if (hit3D.isGate) {
      focusGate(hit3D.gate_id);
      return;
    }
    const f = buildingsData && buildingsData.features ?
      buildingsData.features.find(ft => Number(ft.properties.bid_id) === hit3D.bid_id) : null;
    if (f) {
      focusBuilding(f);
      return;
    }
  }

  // คลิกโดนอาคาร 3D Extrusion
  const feats = map.queryRenderedFeatures(e.point, { layers: ['buildings-3d'] });
  if (feats.length && isClickable(feats[0].properties)) {
    focusBuilding(feats[0]);
    return;
  }

  // Click on empty space — deselect everything and close InfoCard
  setSelected(null);
  if (typeof closeInfoCard === 'function') closeInfoCard();
  if (campus3DLayer) {
    campus3DLayer.setSelected(null);
    campus3DLayer.setSelectedGate(null);
  }
  document.querySelectorAll('.gate-marker').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.admin-marker').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.b-item').forEach(el => el.classList.remove('active'));
});

map.on('click', 'buildings-3d', (e) => {
  const hoverTooltip = document.getElementById('hoverTooltip');
  if (hoverTooltip) hoverTooltip.classList.remove('show');
  const f = e.features[0];
  if (!isClickable(f.properties)) return;
  focusBuilding(f);
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (typeof closeInfoCard === 'function') closeInfoCard();
    if (campus3DLayer) {
      campus3DLayer.setSelected(null);
      campus3DLayer.setSelectedGate(null);
    }
    document.querySelectorAll('.gate-marker').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.admin-marker').forEach(el => el.classList.remove('active'));
  }
});
