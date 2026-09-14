/* ======================================================================
   MAP SETUP & LAYERS (MapLibre GL JS)
   สร้างแผนที่, จำกัดขอบเขต (maxBounds), Inverse Masking (Turf.js)
====================================================================== */


    // คำนวณ Bounding Box ของขอบเขตวิทยาลัยผ่าน Turf.js หรือ fallback
    const campusBbox = (typeof turf !== 'undefined' && turf.bbox)
      ? turf.bbox(CAMPUS_BOUNDARY)
      : [102.787629, 17.397085, 102.790147, 17.400272];

    const padBounds = 0.0020;
    const campusBounds = [
      [campusBbox[0] - padBounds, campusBbox[1] - padBounds], // Southwest coordinates [minLng, minLat]
      [campusBbox[2] + padBounds, campusBbox[3] + padBounds]  // Northeast coordinates [maxLng, maxLat]
    ];

    const RASTER_BOUNDS = [
      campusBbox[0] - 0.0030, campusBbox[1] - 0.0030,
      campusBbox[2] + 0.0030, campusBbox[3] + 0.0030
    ];

    /* ======================================================================
       2) MapLibre GL Map Setup
       ====================================================================== */
    const mapStyle = {
      version: 8,
      sources: {
        "satellite": {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          ],
          tileSize: 256,
          bounds: RASTER_BOUNDS,
          maxzoom: 19,
          attribution: "Esri, Maxar, Earthstar Geographics"
        }
      },
      layers: [
        { id: "bg", type: "background", paint: { "background-color": "#0b0f19" } },
        { id: "satellite-layer", type: "raster", source: "satellite", minzoom: 0, maxzoom: 20 }
      ]
    };

    const map = new maplibregl.Map({
      container: "map",
      style: mapStyle,
      center: CAMPUS_CENTER,
      zoom: DEFAULT_VIEW.zoom,
      pitch: DEFAULT_VIEW.pitch,
      bearing: DEFAULT_VIEW.bearing,
      antialias: true,
      maxPitch: 75,
      minZoom: 16,
      maxZoom: 19,
      renderWorldCopies: false,
      maxBounds: campusBounds
    });

    // กำหนดขอบเขตกล้องแบบรัดกุม (Camera Bounds Constraint) ป้องกันผู้ใช้เลื่อนแผนที่หลุดออกจากวิทยาลัย
    map.setMaxBounds(campusBounds);

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    let buildingsData = null;
    let selectedId = null;
    let currentCategoryFilter = 'all';

    /* ======================================================================
       3D CAMPUS MODELS REGISTRY & MULTI-BUILDING SYSTEM
       - รองรับไฟล์บีบอัด DRACO (.glb / .gltf) ช่วยลดขนาดไฟล์ลง 70-90%
       - สถาปัตยกรรม Single Three.js Custom Layer รองรับการขยายได้ถึง 49 อาคาร
       - จัดการหน่วยความจำ (VRAM), Draw calls ต่ำ และมีระบบ On-Demand / Lazy Load

/* ฟังก์ชันสร้าง Inverted Masking (Campus Island Aesthetic) */
function createInverseMask(boundaryData) {
  if (typeof turf !== 'undefined' && turf.mask) {
    try {
      return turf.mask(boundaryData);
    } catch (e) {
      console.warn('[Turf Mask Error]', e);
    }
  }
  // Fallback Inverted Polygon with Campus Hole
  const ring = (boundaryData && boundaryData.geometry && boundaryData.geometry.coordinates)
    ? boundaryData.geometry.coordinates[0]
    : ((boundaryData && boundaryData.features && boundaryData.features[0] && boundaryData.features[0].geometry)
      ? boundaryData.features[0].geometry.coordinates[0]
      : CAMPUS_BOUNDARY.geometry.coordinates[0]);
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [[180, 90], [-180, 90], [-180, -90], [180, -90], [180, 90]],
        ring
      ]
    }
  };
}
