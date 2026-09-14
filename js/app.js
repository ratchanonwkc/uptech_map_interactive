/* ======================================================================
   MAIN APPLICATION BOOTSTRAP & ORCHESTRATION
   โหลด GeoJSON, ประสานงานระหว่างแผนที่ โมเดล 3D และ UI
====================================================================== */

let buildingsData = null;
let selectedId = null;
let currentCategoryFilter = 'all';

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

function isPointInPolygon(point, vs) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function findFeatureAt(point) {
  if (!buildingsData || !buildingsData.features) return null;
  const lngLat = map.unproject(point);
  const pt = [lngLat.lng, lngLat.lat];
  for (const f of buildingsData.features) {
    if (!f.geometry) continue;
    if (f.geometry.type === 'Polygon') {
      if (isPointInPolygon(pt, f.geometry.coordinates[0])) return f;
    } else if (f.geometry.type === 'MultiPolygon') {
      for (const poly of f.geometry.coordinates) {
        if (isPointInPolygon(pt, poly[0])) return f;
      }
    }
  }
  return null;
}

function focusBuilding(feature) {
  if (!feature) return;
  const centroid = getCentroid(feature);
  selectBuilding(feature, 18.3);
  map.flyTo({
    center: centroid,
    zoom: 18.3,
    pitch: 50,
    bearing: 95,
    duration: 1200
  });
}

function selectBuilding(feature, zoom = 18.2) {
  const props = feature.properties;
  const bid = Number(props.bid_id);
  selectedId = bid;

  if (campus3DLayer) {
    campus3DLayer.setSelectedBuilding(bid);
    campus3DLayer.setSelectedGate(null);
  }
  updateGateActiveState(null);
  updateAdminActiveState(bid === 11);

  showInfoCard(props, 'building');

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
        p.category = p.type === 'deco' ? 'parking' : 'academic';
      }
      if (!p.color) {
        p.color = p.type === 'deco' ? '#64748b' : '#0284c7';
      }
      if (!p.visitorTip) {
        p.visitorTip = 'อาคารและสิ่งอำนวยความสะดวกภายในวิทยาลัย';
      }
    });

    buildingsData = data;
    window.buildingsData = buildingsData;

    // อัปเดตพิกัด Centroid ของอาคาร 3D ให้ตรงกับ GeoJSON
    CUSTOM_MODELS_CONFIG.forEach(cfg => {
      const bid = Number(cfg.bid_id);
      const f = data.features.find(ft => Number(ft.properties.bid_id) === bid);
      if (f && campus3DLayer && campus3DLayer.updateCentroid) {
        const centroid = getCentroid(f);
        campus3DLayer.updateCentroid(bid, centroid);
      }
    });

    renderBuildingList('all');
    updateSearchMatches();
  }).catch(err => {
    console.warn('[GeoJSON Load Error]', err);
  });
});

// ----------------------------------------------------------------------
// MAP INTERACTIONS (Hover, Raycasting & Click)
// ----------------------------------------------------------------------
map.on('mousemove', (e) => {
  const tooltip = document.getElementById('hoverTooltip');
  if (isPhoneDevice()) {
    if (tooltip) tooltip.classList.remove('show');
    return;
  }

  let hit3D = null;
  if (campus3DLayer && typeof campus3DLayer.raycast === 'function') {
    hit3D = campus3DLayer.raycast(e.point);
  }

  if (hit3D) {
    map.getCanvas().style.cursor = 'pointer';

    if (hit3D.type === 'gate') {
      campus3DLayer.setHoveredGate(hit3D.gateId);
      campus3DLayer.setHoveredBuilding(null);
      const gateCfg = getGateConfig(hit3D.gateId);
      if (gateCfg && tooltip) {
        tooltip.querySelector('#htDot').style.background = '#ef4444';
        tooltip.querySelector('#htName').textContent = gateCfg.name;
        tooltip.querySelector('#htCat').textContent = '🛡️ ซุ้มประตูทางเข้า-ออก';
        tooltip.style.left = (e.point.x + 16) + 'px';
        tooltip.style.top = (e.point.y + 16) + 'px';
        tooltip.classList.add('show');
      }
      return;
    }

    if (hit3D.bid_id) {
      campus3DLayer.setHoveredBuilding(hit3D.bid_id);
      campus3DLayer.setHoveredGate(null);
      const meta = VISITOR_BUILDINGS[hit3D.bid_id] || (buildingsData?.features?.find(f => Number(f.properties.bid_id) === hit3D.bid_id)?.properties);
      const catCfg = CATEGORY_MAP[meta?.category || 'admin'] || CATEGORY_MAP.academic;
      if (tooltip) {
        tooltip.querySelector('#htDot').style.background = catCfg.color;
        tooltip.querySelector('#htName').textContent = meta?.name || ('อาคาร ID ' + hit3D.bid_id);
        tooltip.querySelector('#htCat').textContent = catCfg.name;
        tooltip.style.left = (e.point.x + 16) + 'px';
        tooltip.style.top = (e.point.y + 16) + 'px';
        tooltip.classList.add('show');
      }
      return;
    }
  }

  if (campus3DLayer) {
    campus3DLayer.setHoveredBuilding(null);
    campus3DLayer.setHoveredGate(null);
  }

  const feature = findFeatureAt(e.point);
  if (feature && isClickable(feature.properties)) {
    map.getCanvas().style.cursor = 'pointer';
    const props = feature.properties;
    const cat = CATEGORY_MAP[props.category] || CATEGORY_MAP.academic;
    if (tooltip) {
      tooltip.querySelector('#htDot').style.background = cat.color;
      tooltip.querySelector('#htName').textContent = props.name;
      tooltip.querySelector('#htCat').textContent = cat.name;
      tooltip.style.left = (e.point.x + 16) + 'px';
      tooltip.style.top = (e.point.y + 16) + 'px';
      tooltip.classList.add('show');
    }
  } else {
    map.getCanvas().style.cursor = '';
    if (tooltip) tooltip.classList.remove('show');
  }
});

map.on('mouseleave', () => {
  const tooltip = document.getElementById('hoverTooltip');
  if (tooltip) tooltip.classList.remove('show');
  if (campus3DLayer) {
    campus3DLayer.setHoveredBuilding(null);
    campus3DLayer.setHoveredGate(null);
  }
});

map.on('click', (e) => {
  let hit3D = null;
  if (campus3DLayer && typeof campus3DLayer.raycast === 'function') {
    hit3D = campus3DLayer.raycast(e.point);
  }

  if (hit3D) {
    if (hit3D.type === 'gate') {
      const gateCfg = getGateConfig(hit3D.gateId);
      if (gateCfg) {
        campus3DLayer.setSelectedGate(gateCfg.id);
        campus3DLayer.setSelectedBuilding(null);
        updateGateActiveState(gateCfg.id);
        updateAdminActiveState(false);
        showInfoCard(gateCfg, 'gate');
        map.flyTo({
          center: gateCfg.coords,
          zoom: 18.5,
          pitch: 50,
          bearing: 95,
          duration: 1000
        });
        return;
      }
    }

    if (hit3D.bid_id) {
      const f = buildingsData?.features?.find(ft => Number(ft.properties.bid_id) === hit3D.bid_id);
      if (f) {
        focusBuilding(f);
      } else {
        const dummy = { properties: { bid_id: hit3D.bid_id, name: 'อาคาร ID ' + hit3D.bid_id } };
        selectBuilding(dummy);
      }
      return;
    }
  }

  const feature = findFeatureAt(e.point);
  if (feature && isClickable(feature.properties)) {
    focusBuilding(feature);
  } else {
    selectedId = null;
    if (campus3DLayer) {
      campus3DLayer.setSelectedBuilding(null);
      campus3DLayer.setSelectedGate(null);
    }
    updateGateActiveState(null);
    updateAdminActiveState(false);
    hideInfoCard();
    document.querySelectorAll('.b-item').forEach(el => el.classList.remove('active'));
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideInfoCard();
    selectedId = null;
    if (campus3DLayer) {
      campus3DLayer.setSelectedBuilding(null);
      campus3DLayer.setSelectedGate(null);
    }
    updateGateActiveState(null);
    updateAdminActiveState(false);
  }
});
