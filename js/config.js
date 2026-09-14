/* ======================================================================
   CONFIGURATIONS & METADATA
   หมวดหมู่, ข้อมูลแนะนำผู้มาเยือน, ภาพถ่าย, โมเดล 3D และซุ้มประตู
====================================================================== */

const CATEGORY_MAP = {
  admin: { name: 'ติดต่อราชการ & ต้อนรับ', icon: '🏛️', color: '#f59e0b' },
  security: { name: 'ป้อมยาม & ประตูเข้า-ออก', icon: '🛡️', color: '#ef4444' },
  academic: { name: 'อาคารเรียน & โรงฝึกงาน', icon: '🎓', color: '#0284c7' },
  library: { name: 'วิทยบริการ & ห้องสมุด', icon: '📚', color: '#10b981' },
  dining: { name: 'โรงอาหาร คาเฟ่ & สวัสดิการ', icon: '☕', color: '#f97316' },
  hall: { name: 'หอประชุม & พิธีการ', icon: '🎪', color: '#ec4899' },
  parking: { name: 'ลานจอดรถ & สนับสนุน', icon: '🚗', color: '#64748b' },
  facility: { name: 'ห้องน้ำ & สุขาสาธารณะ', icon: '🚻', color: '#06b6d4' },
  residential: { name: 'เขตที่พักอาศัย (ส่วนบุคคล)', icon: '🏠', color: '#818cf8' }
};

/* ฐานข้อมูลเฉพาะอาคาร: ให้ความสำคัญกับผู้มาติดต่อ (Outsiders) โดยยึดบริบทจริงของวิทยาลัย */
const VISITOR_BUILDINGS = {
  11: {
    name: 'อาคารอำนวยการ',
    category: 'admin',
    color: '#f59e0b',
    clickable: true,
    isStar: true,
    starLabel: '⭐ จุดติดต่อราชการหลัก',
    visitorTip: 'ศูนย์รวมงานบริหารและติดต่อราชการ: งานทะเบียน, การเงิน, กิจการนักศึกษา, งานวิชาการ และห้องผู้บริหาร (จันทร์-ศุกร์ 08:30 - 16:30 น.)',
    desc: 'อาคารอำนวยการ ศูนย์ประสานงานและจุดติดต่อราชการหลักของวิทยาลัย'
  },
  17: {
    name: 'ประชาสัมพันธ์',
    category: 'admin',
    color: '#f59e0b',
    clickable: true,
    isStar: true,
    starLabel: '⭐ จุดแรกเข้า & สอบถามข้อมูล',
    visitorTip: 'สอบถามข้อมูลทั่วไป ตำแหน่งอาคาร และขอคำแนะนำการติดต่อฝ่ายงานต่างๆ',
    desc: 'จุดบริการประชาสัมพันธ์ ให้บริการข้อมูลข่าวสารทั่วไปและแนะนำสถานที่'
  },
  18: {
    name: 'ป้อมยาม',
    category: 'security',
    color: '#ef4444',
    clickable: true,
    isStar: true,
    starLabel: '🛡️ จุดตรวจ & แลกบัตร',
    visitorTip: 'ยานพาหนะบุคคลภายนอกกรุณาชะลอความเร็ว แลกบัตรเข้า-ออก และปฏิบัติตามคำแนะนำของเจ้าหน้าที่ รปภ.',
    desc: 'ป้อมยามและจุดรักษาความปลอดภัย ตรวจคัดกรองยานพาหนะตลอด 24 ชั่วโมง'
  },
  4: {
    name: 'ศูนย์บ่มเพาะวิสาหกิจวิทยาลัยสารพัดช่างอุดรธานี',
    category: 'admin',
    color: '#f59e0b',
    clickable: true,
    visitorTip: 'ศูนย์บ่มเพาะวิสาหกิจ ให้คำปรึกษาและสนับสนุนธุรกิจสิ่งประดิษฐ์และผลิตภัณฑ์ของนักศึกษา',
    desc: 'ศูนย์บ่มเพาะวิสาหกิจ วิทยาลัยสารพัดช่างอุดรธานี'
  },
  12: {
    name: 'อาคารวิทยบริการและห้องสมุด',
    category: 'library',
    color: '#10b981',
    clickable: true,
    isStar: true,
    starLabel: '📚 แหล่งเรียนรู้ & ห้องสมุด',
    visitorTip: 'ชั้น 1: ห้องสมุดและศูนย์วิทยบริการ / ชั้น 2: ห้องคอมพิวเตอร์และห้องเรียนภาษาต่างประเทศ',
    desc: 'อาคารวิทยบริการและห้องสมุด แหล่งค้นคว้าและบริการข้อมูลการเรียนรู้'
  },
  22: {
    name: 'โรงอาหาร',
    category: 'dining',
    color: '#f97316',
    clickable: true,
    isStar: true,
    starLabel: '🍽️ ศูนย์อาหาร & เครื่องดื่ม',
    visitorTip: 'บริการอาหารและเครื่องดื่มสำหรับนักเรียนนักศึกษา บุคลากร และผู้มาติดต่อ (เปิดบริการวันทำการ)',
    desc: 'โรงอาหารกลางของวิทยาลัยสารพัดช่างอุดรธานี'
  },
  19: {
    name: 'คาเฟ่',
    category: 'facility',
    color: '#64748b',
    clickable: false,
    visitorTip: 'อาคารคาเฟ่เดิม (ปัจจุบันไม่ได้เปิดใช้งาน)',
    desc: 'อาคารคาเฟ่เดิม (ปัจจุบันไม่ได้เปิดใช้งาน)'
  },
  20: {
    name: 'ร้านค้าเก่า',
    category: 'facility',
    color: '#64748b',
    clickable: false,
    visitorTip: 'อาคารร้านค้าเดิม (ปัจจุบันไม่ได้เปิดใช้งาน)',
    desc: 'อาคารร้านค้าเดิม (ปัจจุบันไม่ได้เปิดใช้งาน)'
  },
  16: {
    name: 'สหการและอื่นๆ',
    category: 'dining',
    color: '#f97316',
    clickable: true,
    visitorTip: 'ร้านค้าสหการ จำหน่ายเครื่องแบบนักเรียนนักศึกษา อุปกรณ์การเรียน เครื่องเขียน และของใช้ทั่วไป',
    desc: 'ร้านค้าสหการและบริการสวัสดิการวิทยาลัย'
  },
  31: {
    name: 'โดมอเนกประสงค์',
    category: 'hall',
    color: '#ec4899',
    clickable: true,
    isStar: true,
    starLabel: '🎪 อาคารโดมอเนกประสงค์',
    visitorTip: 'สถานที่จัดกิจกรรมสำคัญ เช่น กิจกรรมลูกเสือ การแข่งขันกีฬา พิธีการ และกิจกรรมส่วนรวม',
    desc: 'อาคารโดมอเนกประสงค์สำหรับกิจกรรมของวิทยาลัย'
  },
  6: {
    name: 'ที่จอดรถ',
    category: 'parking',
    color: '#64748b',
    clickable: true,
    isStar: true,
    starLabel: '🚗 ที่จอดรถผู้มาติดต่อ',
    visitorTip: 'ลานจอดรถสำหรับผู้มาติดต่อราชการ บริเวณด้านหน้าใกล้ทางเข้าและศูนย์บ่มเพาะวิสาหกิจ',
    desc: 'พื้นที่ลานจอดรถสำหรับผู้มาติดต่อราชการ'
  },
  8: {
    name: 'โรงจอดรถวิทยาลัย',
    category: 'parking',
    color: '#64748b',
    clickable: true,
    visitorTip: 'โรงจอดรถในร่มสำหรับรถส่วนกลางและยานพาหนะของบุคลากร',
    desc: 'โรงจอดรถในร่มของวิทยาลัย'
  },
  9: {
    name: 'ที่จอดรถ',
    category: 'parking',
    color: '#64748b',
    clickable: true,
    visitorTip: 'ลานจอดรถสำหรับนักเรียน นักศึกษา และผู้มาติดต่อ',
    desc: 'ลานจอดรถสำหรับนักเรียน นักศึกษา และผู้มาติดต่อ'
  },
  10: {
    name: 'ที่จอดรถ',
    category: 'parking',
    color: '#64748b',
    clickable: true,
    visitorTip: 'ลานจอดรถสำหรับนักเรียน นักศึกษา และผู้มาติดต่อ บริเวณใกล้โรงฝึกงาน',
    desc: 'ลานจอดรถสำหรับนักเรียน นักศึกษา และผู้มาติดต่อ'
  },
  23: {
    name: 'อาคารพัสดุกลาง',
    category: 'parking',
    color: '#64748b',
    clickable: true,
    visitorTip: 'อาคารงานพัสดุกลาง สำหรับจัดเก็บและดูแลครุภัณฑ์และวัสดุส่วนกลาง',
    desc: 'อาคารงานพัสดุกลางของวิทยาลัย'
  },
  24: {
    name: 'ห้องน้ำ 1',
    category: 'facility',
    color: '#06b6d4',
    clickable: true,
    visitorTip: 'อาคารสุขาส่วนกลาง สำหรับนักเรียนนักศึกษา บุคลากร และผู้มาติดต่อราชการ',
    desc: 'อาคารสุขาส่วนกลาง'
  },
  25: {
    name: 'ห้องน้ำ 2',
    category: 'facility',
    color: '#06b6d4',
    clickable: true,
    visitorTip: 'อาคารสุขาส่วนกลาง บริเวณใกล้โรงฝึกงาน',
    desc: 'อาคารสุขาส่วนกลาง'
  },
  1: {
    name: 'อาคารเรียนและปฎิบัตการ 3',
    category: 'academic',
    color: '#0284c7',
    clickable: true,
    visitorTip: 'หลักสูตรวิชาชีพระยะสั้น: เรียนทำอาหาร, ตัดผม, เสริมสวย, นวดแผนไทย และสปา',
    desc: 'อาคารเรียนหลักสูตรวิชาชีพระยะสั้น สำหรับนักศึกษาและประชาชนทั่วไป'
  },
  3: {
    name: 'อาคารเรียนและปฎิบัตการ 4',
    category: 'academic',
    color: '#0284c7',
    clickable: true,
    visitorTip: 'อาคารเรียนและฝึกปฏิบัติการของแผนกวิชาช่างไฟฟ้ากำลัง',
    desc: 'อาคารเรียนและฝึกปฏิบัติการของแผนกวิชาช่างไฟฟ้ากำลัง'
  },
  7: {
    name: 'ห้องเรียนตัดผมชาย',
    category: 'academic',
    color: '#0284c7',
    clickable: true,
    isStar: true,
    starLabel: '✂️ บริการตัดผมชาย',
    visitorTip: 'ห้องเรียนวิชาชีพตัดผมชาย และให้บริการตัดผมแก่ประชาชนทั่วไปและนักศึกษา',
    desc: 'ห้องเรียนและฝึกปฏิบัติการตัดผมชาย'
  },
  13: {
    name: 'อาคารเรียนและปฎิบัตการ 2',
    category: 'academic',
    color: '#0284c7',
    clickable: true,
    visitorTip: 'อาคารเรียนและฝึกปฏิบัติการของแผนกวิชาช่างอิเล็กทรอนิกส์',
    desc: 'อาคารเรียนและฝึกปฏิบัติการของแผนกวิชาช่างอิเล็กทรอนิกส์'
  },
  14: {
    name: 'อาคารเรียนและปฎิบัตการ 1',
    category: 'academic',
    color: '#0284c7',
    clickable: true,
    visitorTip: 'อาคารเรียนทั่วไป และห้องปฏิบัติการคอมพิวเตอร์ชั้น 2',
    desc: 'อาคารเรียนทั่วไปและห้องปฏิบัติการคอมพิวเตอร์'
  },
  15: {
    name: 'ห้องเรียนลีลาศ',
    category: 'academic',
    color: '#0284c7',
    clickable: true,
    visitorTip: 'ห้องเรียนและฝึกปฏิบัติการวิชาลีลาศ สำหรับกิจกรรมเข้าจังหวะและการแสดง',
    desc: 'ห้องเรียนและฝึกปฏิบัติการวิชาลีลาศ'
  },
  21: {
    name: 'อาคารเรียนและปฎิบัตการ 5',
    category: 'academic',
    color: '#0284c7',
    clickable: true,
    visitorTip: 'ชั้น 1: แผนกช่างยนต์ / ชั้น 2: แผนกคอมพิวเตอร์กราฟิก / ชั้น 3: แผนกการบัญชี',
    desc: 'อาคารเรียนและห้องปฏิบัติการของสาขาวิชาช่างยนต์ คอมพิวเตอร์กราฟิก และการบัญชี'
  },
  26: {
    name: 'โรงฝึกงาน',
    category: 'academic',
    color: '#0284c7',
    clickable: true,
    visitorTip: 'โรงฝึกปฏิบัติงานของแผนกวิชาช่างยนต์ สำหรับฝึกซ่อมบำรุงยานยนต์',
    desc: 'โรงฝึกปฏิบัติงานของแผนกวิชาช่างยนต์'
  },
  29: {
    name: 'โรงฝึกงานประเภทวิชาอุตสาหกรรม',
    category: 'academic',
    color: '#0284c7',
    clickable: true,
    visitorTip: 'โรงฝึกงานประเภทวิชาอุตสาหกรรม: ช่างเชื่อม ช่างกระจกและอะลูมิเนียม',
    desc: 'โรงฝึกงานประเภทวิชาอุตสาหกรรม สำหรับฝึกปฏิบัติงานช่างเชื่อม ช่างกระจกและอะลูมิเนียม'
  },
  30: {
    name: 'โรงฝึกงานแผนกช่างกลโรงงาน',
    category: 'academic',
    color: '#0284c7',
    clickable: true,
    visitorTip: 'โรงฝึกปฏิบัติงานของแผนกวิชาช่างกลโรงงาน สำหรับฝึกทักษะงานกลึง งานกัด และเครื่องมือกล',
    desc: 'โรงฝึกปฏิบัติงานของแผนกวิชาช่างกลโรงงาน'
  },
  2: {
    name: 'หอพักนักศึกษา',
    category: 'residential',
    color: '#818cf8',
    clickable: true,
    visitorTip: 'อาคารหอพักนักศึกษา (พื้นที่พักอาศัยส่วนบุคคล) บุคคลภายนอกโปรดติดต่อเจ้าหน้าที่ดูแลหอพัก',
    desc: 'อาคารหอพักนักศึกษาของวิทยาลัยสารพัดช่างอุดรธานี'
  }
};


const IMAGE_BASE_PATH = './image/อาคาร/';

const BUILDING_IMAGE_MAP = {
  1: 'อาคารระยะสั้น.jpg',                     // อาคารเรียนและปฎิบัตการ 3
  2: 'หอพักนักศึกษา.jpg',                      // หอพักนักศึกษา
  3: 'อาคารแผนกไฟฟ้า.jpg',                    // อาคารเรียนและปฎิบัตการ 4
  4: 'ศูนย์บ่มเพาะวิสาหกิจ.jpg',               // ศูนย์บ่มเพาะวิสาหกิจ
  7: 'ห้องเรียนตัดผมชาย.jpg',                 // ห้องเรียนตัดผมชาย
  11: 'อำนวยการ.jpg',                         // อาคารอำนวยการ
  12: 'อาคารวิทยบริการ.jpg',                   // อาคารวิทยบริการและห้องสมุด
  13: 'อาคารแผนกอิเล็ก.jpg',                  // อาคารเรียนและปฎิบัตการ 2
  14: 'อาคาร 1.jpg',                          // อาคารเรียนและปฎิบัตการ 1
  15: 'ห้องเรียนลีลาศ.jpg',                   // ห้องเรียนลีลาศ
  17: 'ห้องประชาสัมพันธ์.jpg',                // ประชาสัมพันธ์
  18: 'ป้อมยาม.jpg',                          // ป้อมยาม
  21: 'อาคาร5.jpg',                           // อาคารเรียนและปฎิบัตการ 5
  22: 'หอประชุมโรงอาหาร.jpg',                 // โรงอาหาร / หอประชุมโรงอาหาร
  23: 'งานพัสดุกลาง.jpg',                      // อาคารพัสดุกลาง
  24: 'ห้องน้ำ1.jpg',                         // ห้องน้ำ 1
  25: 'ห้องน้ำ2.jpg',                         // ห้องน้ำ 2
  26: 'โรงฝึกงานช่างยนต์.jpg',                 // โรงฝึกงาน
  29: 'โรงฝึกงานประเภทวิชาอุตสาหกรรม.jpg',    // โรงฝึกงานประเภทวิชาอุตสาหกรรม
  30: 'โรงฝึกงานแผนกช่างกลโรงงาน.jpg',        // โรงฝึกงานแผนกช่างกลโรงงาน
  31: 'โดมหอประชุม.jpg',                      // โดมอเนกประสงค์
};

/**
 * ค้นหา URL ภาพถ่ายอาคารตาม Properties จาก GeoJSON
 * เรียงลำดับความสำคัญ: bid_id -> props.image -> คำค้นชื่อ/รายละเอียด -> null (เพื่อแสดง Fallback)
 */
function getBuildingImageUrl(props) {
  if (!props) return null;
  const bid = Number(props.bid_id);

  // 1. ตรวจสอบโดยตรงจาก bid_id ใน BUILDING_IMAGE_MAP
  if (BUILDING_IMAGE_MAP[bid]) {
    return encodeURI(`${IMAGE_BASE_PATH}${BUILDING_IMAGE_MAP[bid]}`);
  }

  // 2. ตรวจสอบฟิลด์ image หรือ photo หากมีระบุใน GeoJSON
  if (props.image && typeof props.image === 'string' && props.image.trim() !== '') {
    return props.image.trim();
  }
  if (props.photo && typeof props.photo === 'string' && props.photo.trim() !== '') {
    return props.photo.trim();
  }

  // 3. ค้นหาแบบ Dynamic resolution ตามชื่ออาคาร หรือคำอธิบาย
  const name = (props.name || '').trim();
  const desc = (props.description || props.desc || '').trim();

  const nameMatchRules = [
    { regex: /อำนวยการ/, file: 'อำนวยการ.jpg' },
    { regex: /วิทยบริการ|ห้องสมุด/, file: 'อาคารวิทยบริการ.jpg' },
    { regex: /ป้อมยาม/, file: 'ป้อมยาม.jpg' },
    { regex: /ประชาสัมพันธ์/, file: 'ห้องประชาสัมพันธ์.jpg' },
    { regex: /บ่มเพาะ/, file: 'ศูนย์บ่มเพาะวิสาหกิจ.jpg' },
    { regex: /โรงอาหาร/, file: 'หอประชุมโรงอาหาร.jpg' },
    { regex: /หอพักนักศึกษา/, file: 'หอพักนักศึกษา.jpg' },
    { regex: /ตัดผม/, file: 'ห้องเรียนตัดผมชาย.jpg' },
    { regex: /ลีลาศ/, file: 'ห้องเรียนลีลาศ.jpg' },
    { regex: /พัสดุกลาง|พัสดุ/, file: 'งานพัสดุกลาง.jpg' },
    { regex: /ห้องน้ำ\s*1/, file: 'ห้องน้ำ1.jpg' },
    { regex: /ห้องน้ำ\s*2/, file: 'ห้องน้ำ2.jpg' },
    { regex: /ช่างกลโรงงาน/, file: 'โรงฝึกงานแผนกช่างกลโรงงาน.jpg' },
    { regex: /อุตสาหกรรม/, file: 'โรงฝึกงานประเภทวิชาอุตสาหกรรม.jpg' },
    { regex: /ช่างยนต์/, file: 'โรงฝึกงานช่างยนต์.jpg' },
    { regex: /ไฟฟ้า/, file: 'อาคารแผนกไฟฟ้า.jpg' },
    { regex: /อิเล็ก/, file: 'อาคารแผนกอิเล็ก.jpg' },
    { regex: /ระยะสั้น/, file: 'อาคารระยะสั้น.jpg' },
    { regex: /โดม/, file: 'โดมหอประชุม.jpg' },
    { regex: /อาคาร\s*1(?!\d)/, file: 'อาคาร 1.jpg' },
    { regex: /อาคาร\s*5(?!\d)/, file: 'อาคาร5.jpg' }
  ];

  for (const rule of nameMatchRules) {
    if (rule.regex.test(name) || rule.regex.test(desc)) {
      return encodeURI(`${IMAGE_BASE_PATH}${rule.file}`);
    }
  }

  return null;
}


const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

/**
 * ======================================================================
 * 2. MODULAR MULTI-MODEL CONFIGURATION (CUSTOM_MODELS_CONFIG)
 * ======================================================================
 * จัดการโมเดล 3D (.glb) ทั้งหมดของวิทยาลัยไว้ที่ศูนย์กลาง
 * - bid_id: รหัสอาคารจาก uptech.geojson
 * - name: ชื่ออาคาร
 * - modelPath: เส้นทางไฟล์โมเดล .glb
 * - fallbackModelPath: เส้นทางสำรอง (เช่น สลับตัวพิมพ์เล็ก/ใหญ่ หรือไฟล์สำรอง)
 * - dimensions: { width, depth, height } หน่วยเมตร สำหรับ Auto-scaling ผ่าน THREE.Box3
 * - rotationDeg: องศาปรับหมุนชดเชยเพื่อทาบพอดีกับภาพถ่ายดาวเทียม
 * - altitudeOffset: ค่าชดเชยความสูงลอยตัวจากพื้นดิน (เมตร)
 * - coordinates: พิกัด Centroid เริ่มต้น (จะถูกปรับปรุงอัตโนมัติตาม GeoJSON ทันทีที่โหลดเสร็จ)
 * - offsetX, offsetY: ชดเชยตำแหน่งแนวราบแบบละเอียด (เมตร)
 * - preload: สั่งดาวน์โหลดล่วงหน้าทันทีเมื่อเปิดแผนที่
 */
const CUSTOM_MODELS_CONFIG = [
  {
    bid_id: 11,
    name: 'อาคารอำนวยการ',
    modelPath: './3D/bid_11.glb',
    fallbackModelPath: './3d/อาคารอำนวยการ.glb',
    dimensions: { width: 34, depth: 16, height: 11 },
    rotationDeg: 180,
    altitudeOffset: 0,
    heading: 26,
    offsetX: 0,
    offsetY: 0,
    coordinates: [102.788829, 17.399158],
    preload: true
  },
  {
    bid_id: 3,
    name: 'อาคารเรียนและปฎิบัตการ 4',
    modelPath: './3D/bid_3.glb',
    fallbackModelPath: './3d/bid_3.glb',
    dimensions: { width: 45, depth: 16, height: 16 },
    rotationDeg: 90,
    altitudeOffset: 0,
    heading: 26,
    offsetX: -5,
    offsetY: 3,
    coordinates: [102.789686, 17.400088],
    preload: true
  },
  {
    bid_id: 31,
    name: 'โดมอเนกประสงค์',
    modelPath: './3D/bid_31.glb',
    fallbackModelPath: './3d/bid_31.glb',
    dimensions: { width: 48, depth: 24, height: 10 },
    rotationDeg: 90,
    altitudeOffset: 0,
    heading: 26,
    offsetX: 0,
    offsetY: 0,
    coordinates: [102.788168, 17.397905],
    preload: true
  },
  {
    bid_id: 1,
    name: 'อาคารเรียนและปฏิบัติการ 3 (วิชาชีพระยะสั้น)',
    modelPath: './3D/bid_1.glb',
    fallbackModelPath: './3d/bid_1.glb',
    dimensions: { width: 36, depth: 18, height: 15.5 },
    rotationDeg: 270,
    altitudeOffset: 0,
    heading: 26,
    offsetX: 4,
    offsetY: 4,
    coordinates: [102.789076, 17.399814],
    preload: true
  },
  {
    bid_id: 12,
    name: 'อาคารวิทยบริการและห้องสมุด',
    modelPath: './3D/bid_12.glb',
    fallbackModelPath: './3d/bid_12.glb',
    dimensions: { width: 30, depth: 22, height: 8.5 },
    rotationDeg: 180,
    altitudeOffset: 0,
    heading: 26,
    offsetX: -3,
    offsetY: 5,
    coordinates: [102.789231, 17.399181],
    preload: true
  },
  {
    bid_id: 14,
    name: 'อาคารเรียนและปฏิบัติการ 1',
    modelPath: './3D/bid_14.glb',
    fallbackModelPath: './3d/bid_14.glb',
    dimensions: { width: 53, depth: 14, height: 9 },
    rotationDeg: 88,
    altitudeOffset: 0,
    heading: 26,
    offsetX: 7,
    offsetY: -2,
    coordinates: [102.788775, 17.398800],
    preload: true
  },
  {
    bid_id: 13,
    name: 'อาคารเรียนและปฏิบัติการ 2 (ช่างอิเล็กทรอนิกส์)',
    modelPath: './3D/bid_13.glb',
    fallbackModelPath: './3d/bid_13.glb',
    dimensions: { width: 30, depth: 15, height: 11 },
    rotationDeg: 90,
    altitudeOffset: 0,
    heading: 26,
    offsetX: 4,
    offsetY: 2,
    coordinates: [102.789127, 17.399011],
    preload: true
  },
  {
    bid_id: 21,
    name: 'อาคารเรียนและปฏิบัติการ 5',
    modelPath: './3D/bid_21.glb',
    fallbackModelPath: './3d/bid_21.glb',
    dimensions: { width: 56, depth: 26, height: 16 },
    rotationDeg: 180,
    altitudeOffset: 0,
    heading: 26,
    offsetX: 0,
    offsetY: 0,
    coordinates: [102.788492, 17.398535],
    preload: true
  },
  {
    bid_id: 29,
    name: 'โรงฝึกงานประเภทวิชาอุตสาหกรรม',
    modelPath: './3D/bid_29.glb',
    fallbackModelPath: './3d/bid_29.glb',
    dimensions: { width: 55, depth: 26, height: 6 },
    rotationDeg: 90,
    altitudeOffset: 0,
    heading: 26,
    offsetX: 4,
    offsetY: 0,
    coordinates: [102.788277, 17.398142],
    preload: true
  },
  {
    bid_id: 26,
    name: 'โรงฝึกงาน',
    modelPath: './3D/bid_26.glb',
    fallbackModelPath: './3d/bid_26.glb',
    dimensions: { width: 28, depth: 26, height: 6 },
    rotationDeg: 0,
    altitudeOffset: 0,
    heading: 26,
    offsetX: 8,
    offsetY: 4,
    coordinates: [102.788746, 17.398315],
    preload: true
  },
  {
    bid_id: 30,
    name: 'โรงฝึกงานแผนกช่างกลโรงงาน',
    modelPath: './3D/bid_30.glb',
    fallbackModelPath: './3d/bid_30.glb',
    dimensions: { width: 36, depth: 22, height: 6 },
    rotationDeg: 90,
    altitudeOffset: 0,
    heading: 26,
    offsetX: 2,
    offsetY: 0,
    coordinates: [102.787974, 17.397762],
    preload: true
  },
  {
    bid_id: 2,
    name: 'หอพักนักศึกษา',
    modelPath: './3D/bid_2.glb',
    fallbackModelPath: './3d/bid_2.glb',
    dimensions: { width: 28, depth: 16, height: 16 },
    rotationDeg: 0,
    altitudeOffset: 0,
    heading: 26,
    offsetX: 2,
    offsetY: -5,
    coordinates: [102.789395, 17.400001],
    preload: true
  }
];

/**
 * ======================================================================
 * 2.1 CAMPUS GATES CONFIGURATION & PLACEMENT (GATES_CONFIG)
 * ======================================================================
 * ซุ้มประตูทางเข้า-ออกทั้ง 4 จุดของวิทยาลัย
 * ใช้โมเดล 3D เดียวกัน (gate.glb) โหลดครั้งเดียวและ Clone วางตำแหน่งทั้ง 4 จุด
 */
const GATES_CONFIG = [
  {
    id: 'gate-1',
    gateNum: 1,
    name: 'ประตู 1 (ทางเข้าหลัก)',
    shortName: 'ประตู 1',
    coords: [102.788490, 17.399091],
    coordinates: [102.788490, 17.399091],
    rotationDeg: 0,
    heading: 26,
    dimensions: { width: 12, depth: 2, height: 5.8 },
    modelPath: './3D/gate.glb',
    fallbackModelPath: './3d/gate.glb',
    isMain: true,
    desc: 'ประตูทางเข้าหลักติดถนนมิตรภาพ ด้านหน้าอาคารอำนวยการและป้อมยาม สำหรับรถยนต์ บุคคลภายนอก และการติดต่อราชการ'
  },
  {
    id: 'gate-2',
    gateNum: 2,
    name: 'ประตู 2',
    shortName: 'ประตู 2',
    coords: [102.788800, 17.399695],
    coordinates: [102.788800, 17.399695],
    rotationDeg: 0,
    heading: 26,
    dimensions: { width: 10, depth: 1.8, height: 5 },
    modelPath: './3D/gate.glb',
    fallbackModelPath: './3d/gate.glb',
    isMain: false,
    desc: 'ประตูทางเข้า-ออกฝั่งทิศเหนือ ใกล้อาคารเรียน 3 และหอพักนักศึกษา สำหรับนักเรียนนักศึกษาและบุคลากร'
  },
  {
    id: 'gate-3',
    gateNum: 3,
    name: 'ประตู 3',
    shortName: 'ประตู 3',
    coords: [102.788124, 17.398426],
    coordinates: [102.788124, 17.398426],
    rotationDeg: 0,
    heading: 26,
    dimensions: { width: 10, depth: 1.8, height: 5 },
    modelPath: './3D/gate.glb',
    fallbackModelPath: './3d/gate.glb',
    isMain: false,
    desc: 'ประตูทางเข้า-ออกบริเวณกลุ่มอาคารโรงฝึกงานอุตสาหกรรม สำหรับยานพาหนะและการขนส่งอุปกรณ์'
  },
  {
    id: 'gate-4',
    gateNum: 4,
    name: 'ประตู 4',
    shortName: 'ประตู 4',
    coords: [102.787736, 17.397710],
    coordinates: [102.787736, 17.397710],
    rotationDeg: 0,
    heading: 26,
    dimensions: { width: 8, depth: 1.6, height: 4.8 },
    modelPath: './3D/gate.glb',
    fallbackModelPath: './3d/gate.glb',
    isMain: false,
    desc: 'ประตูทางเข้า-ออกฝั่งทิศใต้ ใกล้โดมอเนกประสงค์และแผนกช่างกลโรงงาน'
  }
];

function getGateConfig(gateId) {
  return GATES_CONFIG.find(g => g.id === gateId);
}

// สร้าง Map Registry สำหรับค้นหาแบบ O(1) พร้อมคงความเข้ากันได้ย้อนหลัง
const CAMPUS_3D_REGISTRY = {};
CUSTOM_MODELS_CONFIG.forEach(cfg => {
  CAMPUS_3D_REGISTRY[cfg.bid_id] = cfg;
});

// ฟังก์ชันค้นหา Config โมเดล 3D
function getModelConfig(bid) {
  return CAMPUS_3D_REGISTRY[Number(bid)] || CUSTOM_MODELS_CONFIG.find(m => m.bid_id === Number(bid));
}

// คืนค่ารายการ ID อาคารทั้งหมดที่มีโมเดล 3D เพื่อซ่อนกล่อง Extrusion เดิมอัตโนมัติ
function get3DBuildingIds() {
  return CUSTOM_MODELS_CONFIG.map(m => Number(m.bid_id));
}

// เพื่อความเข้ากันได้ย้อนหลัง
const ADMIN_MODEL_CONFIG = CAMPUS_3D_REGISTRY[11];

let campus3DLayer = null;
let admin3DLayer = null;

// ติดตาม ID อาคารที่โมเดล 3D โหลดเสร็จและพร้อมแสดงผลแล้ว 100%
const loaded3DBuildingIds = new Set();

function getLoaded3DBuildingIds() {
  return Array.from(loaded3DBuildingIds);
}
