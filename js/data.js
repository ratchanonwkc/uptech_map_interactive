/* ======================================================================
   DATA & VIEWPORT CONSTANTS
   พิกัดศูนย์กลาง, ค่าขอบเขตวิทยาลัย (CAMPUS_BOUNDARY), ตรวจสอบอุปกรณ์
====================================================================== */

const GEOJSON_PATH = './uptech.geojson';
const CAMPUS_CENTER = [102.788900, 17.398900];

function isPhoneDevice() {
  const isNarrow = window.innerWidth <= 640;
  const isMobileUA = /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  return isNarrow || (isMobileUA && window.innerWidth < 768);
}

function getDefaultView() {
  if (isPhoneDevice()) {
    return { zoom: 17, pitch: 40, bearing: 185 };
  }
  return { zoom: 18, pitch: 40, bearing: 95 };
}

const DEFAULT_VIEW = getDefaultView();
const TOP_VIEW = { zoom: 17.6, pitch: 0, bearing: 0 };

const BOUNDARY_GEOJSON_PATH = './campus_boundary.geojson';

const CAMPUS_BOUNDARY = {
  type: "Feature",
  properties: {
    name: "เขตพื้นที่วิทยาลัยสารพัดช่างอุดรธานี"
  },
  geometry: {
    type: "Polygon",
    coordinates: [[
      [102.788976, 17.400062],
      [102.789269, 17.399928],
      [102.789486, 17.400272],
      [102.789921, 17.400061],
      [102.789957, 17.400167],
      [102.790147, 17.400111],
      [102.790094, 17.399925],
      [102.789536, 17.399694],
      [102.789219, 17.398733],
      [102.788982, 17.397889],
      [102.788773, 17.397330],
      [102.788620, 17.397085],
      [102.787629, 17.397535],
      [102.788976, 17.400062]
    ]]
  }
};
