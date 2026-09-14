/* ======================================================================
   UI CONTROLS & INTERACTIONS
   InfoCard, ระบบค้นหา, Sidebar Drawer, ปุ่มมุมกล้อง, Toast
====================================================================== */

/* ======================================================================
   5) INFO CARD (รายละเอียดสำหรับบุคคลภายนอก & ผูกข้อมูล uptech.geojson)
====================================================================== */
const infoCard = document.getElementById('infoCard');
    const infoHero = document.getElementById('infoHero');
    const infoImage = document.getElementById('infoImage');
    const infoPhotoBadge = document.getElementById('infoPhotoBadge');
    let currentFeature = null;

    // การจัดการ Event โหลดภาพของ InfoCard
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
        // หากโหลดภาพไม่สำเร็จ ให้แสดงแบนเนอร์ไอคอนตามปกติ
        infoImage.classList.remove('loaded');
        infoHero.classList.remove('has-photo');
        infoHero.classList.add('no-photo');
        if (infoPhotoBadge) infoPhotoBadge.style.display = 'none';
      });
    }

    // คลิกที่รูปภาพเพื่อเปิดดูภาพขนาดใหญ่ความละเอียดสูง
    if (infoHero) {
      infoHero.addEventListener('click', (e) => {
        if (e.target.closest('#infoClose') || e.target.closest('#visitorStarBadge')) return;
        if (!infoHero.classList.contains('has-photo')) return;
        const currentSrc = infoImage ? infoImage.getAttribute('src') : null;
        if (currentSrc) {
          window.open(currentSrc, '_blank');
        }
      });
    }

    /**
     * แสดงข้อมูลอาคารใน InfoCard โดยดึงค่าตรงจาก properties ใน uptech.geojson
     * @param {Object} feature - GeoJSON Feature Object
     */
    function openInfoCard(feature) {
      currentFeature = feature;
      const props = (feature && feature.properties) ? feature.properties : {};
      const cat = CATEGORY_MAP[props.category] || CATEGORY_MAP.academic;

      // 1) ไอคอนหมวดหมู่ & เอฟเฟกต์ Glow (สำหรับกรณีที่ไม่มีรูปภาพ)
      document.getElementById('infoHeroIcon').textContent = cat.icon || '🏛️';
      document.getElementById('heroGlow').style.background = props.color || cat.color || '#0284c7';

      // 2) ป้าย Star Badge (จุดบริการสำคัญ)
      const starEl = document.getElementById('visitorStarBadge');
      if (props.isStar) {
        starEl.textContent = props.starLabel || '⭐ จุดบริการผู้มาเยือน';
        starEl.style.display = 'flex';
      } else {
        starEl.style.display = 'none';
      }

      // 3) ป้ายประเภทอาคาร (Type Pill Badge)
      document.getElementById('infoType').textContent = cat.name || 'อาคารทั่วไป';
      document.getElementById('infoDot').style.background = props.color || cat.color || '#0284c7';

      // 4) Dynamic Data Binding จาก uptech.geojson:
      // Title / Building Name: properties.name
      const rawName = typeof props.name === 'string' ? props.name.trim() : '';
      const buildingName = (rawName && rawName !== '-') ? rawName : 'ไม่ระบุชื่ออาคาร';
      document.getElementById('infoName').textContent = buildingName;

      // Building ID: properties.bid_id
      const rawBid = props.bid_id;
      const hasValidBid = rawBid !== undefined && rawBid !== null && String(rawBid).trim() !== '' && String(rawBid).trim() !== '-';
      document.getElementById('infoId').textContent = hasValidBid ? `รหัสอาคาร #${rawBid}` : 'รหัสอาคาร —';

      // Visitor Tip (คำแนะนำเฉพาะสำหรับบุคคลภายนอก)
      const tipText = (props.visitorTip && String(props.visitorTip).trim() !== '-')
        ? String(props.visitorTip).trim()
        : 'อาคารและพื้นที่ให้บริการของวิทยาลัยสารพัดช่างอุดรธานี';
      document.getElementById('infoVisitorTip').textContent = tipText;

      // Description / Departments: อ่านตรงจาก properties.description หรือ properties.desc
      let descText = '';
      if (props.description && String(props.description).trim() !== '' && String(props.description).trim() !== '-') {
        descText = String(props.description).trim();
      } else if (props.desc && String(props.desc).trim() !== '' && String(props.desc).trim() !== '-') {
        descText = String(props.desc).trim();
      } else if (props.visitorTip && String(props.visitorTip).trim() !== '') {
        descText = String(props.visitorTip).trim();
      } else {
        descText = 'ยังไม่มีรายละเอียดข้อมูลแผนกหรือการบริการสำหรับอาคารนี้';
      }
      document.getElementById('infoDesc').textContent = descText;

      // 5) Featured Building Photo at Top Hero:
      // เอาตัว banner icon และ glow ออกไปเลยสำหรับอาคารที่มีรูป โดยเปลี่ยนหัวแบนเนอร์ด้านบนเป็นภาพถ่ายขนาดใหญ่
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
          // หากไม่มีรูปภาพ: แสดง icon สถาปัตยกรรมและแสง Glow ตามเดิม
          infoHero.classList.remove('has-photo');
          infoHero.classList.add('no-photo');
          infoImage.removeAttribute('src');
          if (infoPhotoBadge) infoPhotoBadge.style.display = 'none';
        }
      }

      // แสดง InfoCard
      infoCard.classList.add('open');

      // บน Mobile ย่อ sidebar ลงเพื่อให้มองเห็น InfoCard ชัดเจน
      const sidebar = document.getElementById('sidebar');
      if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.remove('expanded');
      }
    }

    document.getElementById('infoClose').addEventListener('click', () => {
      infoCard.classList.remove('open');
      setSelected(null);
      currentFeature = null;
      if (infoImage) {
        infoImage.classList.remove('loaded');
      }
    });

    /* ปุ่มนำทาง Google Maps */
    document.getElementById('btnGoogleMaps').addEventListener('click', () => {
      if (!currentFeature) return;
      const [lng, lat] = getCentroid(currentFeature);
      const name = encodeURIComponent(currentFeature.properties.name || 'UPTECH');
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=&travelmode=driving`;
      window.open(url, '_blank');
      showToast('กำลังเปิดเส้นทางใน Google Maps...');
    });

    /* ปุ่มคัดลอกชื่ออาคาร */
    document.getElementById('btnCopyName').addEventListener('click', () => {
      if (!currentFeature) return;
      const name = currentFeature.properties.name || '';
      navigator.clipboard.writeText(name).then(() => {
        showToast(`คัดลอก "${name}" สำเร็จ!`);
      }).catch(() => {
        showToast('ไม่สามารถคัดลอกข้อความได้');
      });
    });

    /* ======================================================================

       6) SIDEBAR: ค้นหา + ตัวกรองหมวดหมู่ + รายการอาคาร
       ====================================================================== */
    const buildingList = document.getElementById('buildingList');
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    const buildingCount = document.getElementById('buildingCount');

    function renderBuildingList(features, query = '', category = 'all') {
      if (typeof features === 'string') {
        category = features;
        features = (buildingsData && buildingsData.features) ? buildingsData.features : [];
      } else if (!Array.isArray(features)) {
        features = (buildingsData && buildingsData.features) ? buildingsData.features : [];
      }
      if (!Array.isArray(features)) return;

      const q = (query || '').trim().toLowerCase();
      const filtered = [];

      features.forEach(f => {
        const p = f.properties;
        const name = (p.name || '').toLowerCase();
        const desc = (p.desc || p.description || '').toLowerCase();
        const tip = (p.visitorTip || '').toLowerCase();

        // กรองตาม Text
        if (q && !name.includes(q) && !desc.includes(q) && !tip.includes(q)) return;

        // กรองตาม Category
        if (category !== 'all') {
          if (category === 'admin' && p.category !== 'admin' && p.category !== 'security') return;
          else if (category !== 'admin' && p.category !== category) return;
        }

        filtered.push(f);
      });

      // ค้นหาซุ้มประตู 1-4
      const matchedGates = [];
      GATES_CONFIG.forEach(g => {
        const name = (g.name || '').toLowerCase();
        const desc = (g.desc || '').toLowerCase();
        const matchesQuery = !q || name.includes(q) || desc.includes(q) || 'ประตู'.includes(q) || 'ทางเข้า'.includes(q);
        const matchesCategory = (category === 'all' || category === 'admin' || category === 'security');
        if (matchesQuery && matchesCategory) {
          matchedGates.push(g);
        }
      });

      const totalItems = filtered.length + matchedGates.length;
      buildingCount.textContent = `${totalItems} จุดบริการ`;

      // แยกกลุ่ม อาคารสำคัญ/ผู้มาติดต่อ กับ สิ่งปลูกสร้างทั่วไป
      const starItems = [];
      const normalItems = [];

      filtered.forEach(f => {
        if (f.properties.isStar) starItems.push(f);
        else normalItems.push(f);
      });

      let html = '';

      // แสดงรายการซุ้มประตู (ถ้ามีผลการค้นหาตรง)
      if (matchedGates.length) {
        html += '<div class="list-section-title">🚪 ประตูทางเข้า-ออกวิทยาลัย</div>';
        matchedGates.forEach(g => {
          html += `
            <div class="b-item gate-list-item" data-gate-id="${g.id}" data-clickable="1">
              <div class="b-dot" style="background:#ef4444; color:#ef4444"></div>
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
        starItems.forEach(f => html += buildingItemHTML(f));
      }
      if (normalItems.length) {
        html += `<div class="list-section-title">${starItems.length || matchedGates.length ? 'อาคารและพื้นที่อื่นๆ' : 'ผลการค้นหา'}</div>`;
        normalItems.forEach(f => html += buildingItemHTML(f));
      }
      if (!totalItems) {
        html = '<div class="list-section-title" style="text-align:center; padding:24px 10px;">ไม่พบอาคารหรือประตูตามเงื่อนไขที่เลือก</div>';
      }

      buildingList.innerHTML = html;

      // ผูกคลิกอาคาร
      buildingList.querySelectorAll('.b-item[data-bid]').forEach(el => {
        el.addEventListener('click', () => {
          const bid = Number(el.dataset.bid);
          const feature = buildingsData.features.find(ft => ft.properties.bid_id === bid);
          if (feature) focusBuilding(feature);
        });
      });

      // ผูกคลิกซุ้มประตู
      buildingList.querySelectorAll('.gate-list-item').forEach(el => {
        el.addEventListener('click', () => {
          const gid = el.dataset.gateId;
          if (gid) focusGate(gid);
        });
      });
    }

    function buildingItemHTML(f) {
      const p = f.properties;
      const clickable = isClickable(p);
      const cat = CATEGORY_MAP[p.category] || CATEGORY_MAP.academic;
      const color = p.color || cat.color;
      const subText = p.visitorRole || (cat.icon + ' ' + cat.name);

      return `
    <div class="b-item ${clickable ? '' : 'disabled'} ${selectedId === p.bid_id ? 'active' : ''}"
         data-bid="${p.bid_id}" data-clickable="${clickable ? 1 : 0}">
      <div class="b-dot" style="background:${color}; color:${color}"></div>
      <div class="b-text">
        <div class="b-name">${p.name || 'ไม่ระบุชื่อ'}</div>
        <div class="b-sub">${subText}</div>
      </div>
      ${clickable ? '<div class="b-arrow">›</div>' : ''}
    </div>`;
    }

    /* Event Search Input */
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      clearSearch.classList.toggle('show', val.length > 0);
      if (buildingsData) renderBuildingList(buildingsData.features, val, currentCategoryFilter);
    });

    clearSearch.addEventListener('click', () => {
      searchInput.value = '';
      clearSearch.classList.remove('show');
      if (buildingsData) renderBuildingList(buildingsData.features, '', currentCategoryFilter);
    });

    /* Event Category Filter Buttons */
    document.querySelectorAll('#catFilter .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#catFilter .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategoryFilter = btn.dataset.cat;
        if (buildingsData) renderBuildingList(buildingsData.features, searchInput.value, currentCategoryFilter);
      });
    });

    /* ======================================================================
       7) VISITOR QUICK BAR BUTTONS
       ====================================================================== */
    document.querySelectorAll('.visitor-nav .v-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const bid = Number(chip.dataset.bid);
        if (!buildingsData) return;
        const feature = buildingsData.features.find(ft => ft.properties.bid_id === bid);
        if (feature) focusBuilding(feature);
      });
    });

    /* Legend items click to filter */
    document.querySelectorAll('.legend-item').forEach(item => {
      item.addEventListener('click', () => {
        const cat = item.dataset.cat;
        const filterBtn = document.querySelector(`#catFilter .filter-btn[data-cat="${cat}"]`);
        if (filterBtn) filterBtn.click();
        showToast(`กรองหมวดหมู่: ${item.querySelector('span:last-child').textContent}`);
      });
    });

    /* ======================================================================

       8) CAMERA PRESETS & LEGEND TOGGLE
       ====================================================================== */
    document.getElementById('btnReset').addEventListener('click', () => {
      setSelected(null);
      infoCard.classList.remove('open');
      const view = getDefaultView();
      map.flyTo({ center: CAMPUS_CENTER, zoom: view.zoom, pitch: view.pitch, bearing: view.bearing, speed: 1.1 });
      showToast('รีเซ็ตมุมมองแผนที่เริ่มต้น');
    });

    document.getElementById('btnTop').addEventListener('click', () => {
      map.flyTo({ center: map.getCenter(), zoom: TOP_VIEW.zoom, pitch: TOP_VIEW.pitch, bearing: TOP_VIEW.bearing, speed: 1.1 });
      showToast('เปลี่ยนเป็นมุมมองด้านบน 2D');
    });

    const btnToggleMarkers = document.getElementById('btnToggleMarkers');
    if (btnToggleMarkers) {
      btnToggleMarkers.addEventListener('click', () => {
        markersVisible = !markersVisible;
        btnToggleMarkers.classList.toggle('active', markersVisible);
        updateMarkersVisibility();
        showToast(markersVisible ? '📍 เปิดแสดงป้ายบอกตำแหน่ง' : '🚫 ปิดการแสดงป้ายบอกตำแหน่ง');
      });
    }

    const mapLegend = document.getElementById('mapLegend');
    // บนมือถือ ให้เริ่มต้นแบบย่อผังสีไว้ เพื่อไม่ให้บดบังพื้นที่แผนที่
    if (window.innerWidth <= 768) {
      mapLegend.classList.add('collapsed');
    }

    document.getElementById('legendHeader').addEventListener('click', () => {
      mapLegend.classList.toggle('collapsed');
    });
    document.getElementById('btnToggleLegend').addEventListener('click', () => {
      mapLegend.classList.toggle('collapsed');
    });

    /* ======================================================================
       9) MOBILE DRAWER & TOAST
       ====================================================================== */
    const sidebar = document.getElementById('sidebar');
    const sidebarHead = document.querySelector('.sidebar-head');
    sidebarHead.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON' && window.innerWidth <= 768) {
        sidebar.classList.toggle('expanded');
      }
    });

    let toastTimer;
    function showToast(msg) {
      const t = document.getElementById('toast');
      if (!t) return;
      t.innerHTML = `<span>🔔</span> <span>${msg}</span>`;
      t.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
    }
