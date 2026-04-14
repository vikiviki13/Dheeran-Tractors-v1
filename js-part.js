  <script>
    /* ===================== APP STATE ===================== */
    const state = {
      currentScreen: 'splash',
      currentTab: 'dashboard',
      currentSlide: 0,
      editingId: null,
      currentDetailId: null,
      currentPhotoCell: -1,
      currentFormExtras: [],
      reportRange: 'month',
      reportStart: null,
      reportEnd: null,
      filterMode: 'all',
      searchQuery: '',
      listings: [],
      settings: {
        name: 'Rajan Kumar',
        phone: '+91 98765 43210',
        location: 'Karnataka',
        darkMode: false,
        notifications: true,
        autoSave: true
      },
      currentFormExtras: []
    };

    /* ===================== SUPABASE CONFIG ===================== */
    const SUPABASE_URL = 'YOUR_SUPABASE_URL';
    const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
    const supabase = (SUPABASE_URL !== 'YOUR_SUPABASE_URL') ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

    /* ===================== MODELS MAP ===================== */
    // No longer needed after switching to text inputs

    /* ===================== INIT ===================== */
    window.addEventListener('load', async () => {
      // Load listings from Supabase
      if (supabase) {
        try {
          const { data, error } = await supabase.from('listings').select('*').order('createdAt', { ascending: false });
          if (error) throw error;
          state.listings = data || [];
        } catch (err) {
          console.error('Supabase fetch error:', err);
          state.listings = [];
        }
      } else {
        console.warn('Supabase not configured. Using empty list.');
        state.listings = [];
      }
      renderListings();
      refreshDashboard();
      refreshReports();

      // Load settings
      const savedSettings = localStorage.getItem('dt_settings');
      if (savedSettings) { Object.assign(state.settings, JSON.parse(savedSettings)); applySettings(); }

      // Set greeting
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,';
      document.getElementById('dashGreeting').textContent = greeting;

      // Auto-progress to onboarding
      setTimeout(() => goTo('onboarding'), 2200);

      initOTP();
    });

    async function saveListingToDB(listing) {
      if (!supabase) return;
      try {
        const { error } = await supabase.from('listings').upsert(listing);
        if (error) throw error;
      } catch (err) {
        console.error('Supabase save error:', err);
        showToast('Error syncing with database', 'error');
      }
    }

    function saveListings() {
      // Logic removed as per "ONLY from database" requirement
      // But we can keep locally for faster UI updates if desired
      // localStorage.setItem('dt_listings', JSON.stringify(state.listings));
    }

    function applySettings() {
      const trimmedName = state.settings.name.trim() || 'User';
      document.getElementById('dashName').textContent = trimmedName + ' 👋';
      document.getElementById('settingsAvatar').textContent = trimmedName.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
      document.getElementById('settingsName').textContent = trimmedName;
      document.getElementById('settingsContact').textContent = state.settings.phone;
      document.getElementById('f-contact').value = state.settings.phone.replace('+91 ', '');
    }

    /* ===================== NAVIGATION ===================== */
    function goTo(screenId) {
      if (state.currentScreen === screenId) return;
      const current = document.getElementById(state.currentScreen);
      const next = document.getElementById(screenId);
      
      if (current) {
        current.classList.remove('active');
        if (screenId === 'mainApp') {
          current.classList.add('hidden');
          current.classList.remove('slide-left');
        } else {
          current.classList.add('slide-left');
          const cid = current.id;
          setTimeout(() => { 
            const c = document.getElementById(cid);
            if (!c.classList.contains('active')) c.classList.add('hidden'); 
          }, 300);
        }
      }
      
      next.classList.remove('hidden', 'slide-left');
      void next.offsetWidth; // Force reflow
      next.classList.add('active');
      
      state.currentScreen = screenId;
      if (screenId === 'mainApp') { refreshDashboard(); refreshListings(); refreshReports(); }
    }

    function switchTo(screenId) {
      goTo(screenId);
      if (screenId === 'add-screen' && state.editingId === null) { resetForm(); }
      if (screenId === 'mainApp') { state.editingId = null; }
    }

    function switchTab(tab) {
      ['dashboard', 'listings', 'reports', 'settings'].forEach(t => {
        const el = document.getElementById('tab-' + t);
        const nav = document.getElementById('nav-' + t);
        if (t === tab) { el.style.display = 'flex'; nav && nav.classList.add('active'); }
        else { el.style.display = 'none'; nav && nav.classList.remove('active'); }
      });
      state.currentTab = tab;
      if (tab === 'reports') refreshReports();
    }

    /* ===================== ONBOARDING ===================== */
    let onboardSlide = 0;
    function nextSlide() {
      const totalSlides = 3;
      if (onboardSlide < totalSlides - 1) {
        document.getElementById('slide-' + onboardSlide).style.transform = 'translateX(-100%)';
        onboardSlide++;
        document.getElementById('slide-' + onboardSlide).style.transform = 'translateX(0)';
        for (let i = 0; i < totalSlides; i++) {
          document.getElementById('od-' + i).classList.toggle('active', i === onboardSlide);
        }
        if (onboardSlide === totalSlides - 1) {
          document.getElementById('onboardNext').style.display = 'none';
          document.getElementById('onboardStart').style.display = 'block';
        }
      }
    }

    /* ===================== AUTH ===================== */
    function sendOTP() {
      const phone = document.getElementById('phoneInput').value.trim();
      if (phone.length < 10) { showToast('Please enter a valid 10-digit number', 'error'); return; }
      document.getElementById('otpPhoneDisplay').textContent = phone;
      document.getElementById('authPhasePhone').style.display = 'none';
      document.getElementById('authPhaseOTP').style.display = 'flex';
      document.getElementById('otp0').focus();
      showToast('OTP sent to +91 ' + phone, 'success');
    }
    function initOTP() {
      const inputs = Array.from(document.querySelectorAll('.otp-input'));
      inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
          input.value = input.value.replace(/\D/g, ''); // Ensure numeric
          if (input.value && index < inputs.length - 1) {
            inputs[index + 1].focus();
          }
        });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !input.value && index > 0) {
            inputs[index - 1].focus();
            inputs[index - 1].value = '';
          }
        });
        input.addEventListener('paste', (e) => {
          e.preventDefault();
          const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, inputs.length);
          pasteData.split('').forEach((char, i) => {
            inputs[i].value = char;
            if (i < inputs.length - 1) inputs[i + 1].focus();
          });
          if (pasteData.length > 0) inputs[Math.min(pasteData.length - 1, inputs.length - 1)].focus();
        });
      });
    }

    function verifyOTP() {
      const otp = [0, 1, 2, 3].map(i => document.getElementById('otp' + i).value).join('');
      if (otp.length < 4) { showToast('Please enter complete OTP', 'error'); return; }
      showToast('Welcome back, ' + state.settings.name + '! 🚜', 'success');
      [0, 1, 2, 3].forEach(i => document.getElementById('otp' + i).value = '');
      setTimeout(() => goTo('mainApp'), 600);
    }
    function backToPhone() {
      document.getElementById('authPhasePhone').style.display = 'flex';
      document.getElementById('authPhaseOTP').style.display = 'none';
    }
    function resendOTP() { showToast('OTP resent!', 'info'); }

    /* ===================== FORM ===================== */
    function toggleSection(head) {
      const body = head.nextElementSibling;
      const chevron = head.querySelector('.fs-chevron');
      body.classList.toggle('collapsed');
      chevron.classList.toggle('open');
      updateFormProgress();
    }

    function updateFormProgress() {
      const sections = document.querySelectorAll('#addForm .form-section');
      const open = document.querySelectorAll('#addForm .fs-body:not(.collapsed)').length;
      const pct = Math.round((open / sections.length) * 100);
      document.getElementById('formProgress').textContent = open + '/' + sections.length;
      document.getElementById('formProgressBar').style.width = pct + '%';
    }

    function formatRegNumber(el) {
      let val = el.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      let formatted = "";
      if (val.length > 0) formatted += val.slice(0, 2);
      if (val.length > 2) formatted += " " + val.slice(2, 4);
      if (val.length > 4) {
        let series = "";
        let numberStart = 6;
        // If 6th char (index 5) is a letter, series is 2 chars
        if (val.length > 5 && /[A-Z]/.test(val[5])) {
          series = val.slice(4, 6);
          numberStart = 6;
        } else {
          series = val.slice(4, 5);
          numberStart = 5;
        }
        formatted += " " + series;
        if (val.length > numberStart) {
          formatted += " " + val.slice(numberStart, numberStart + 4);
        }
      }
      el.value = formatted.slice(0, 13);
    }

    function toggleCommissionType() {
      const type = document.getElementById('f-comm-type').value;
      const pctGroup = document.getElementById('commPctGroup');
      const amountLabel = document.getElementById('commAmountLabel');
      const amountInput = document.getElementById('f-commission');

      if (type === 'percent') {
        pctGroup.style.display = 'flex';
        amountLabel.textContent = 'Calculated Commission (₹)';
        amountInput.readOnly = true;
        amountInput.style.background = 'var(--green-light)';
        calculateCommission();
      } else {
        pctGroup.style.display = 'none';
        amountLabel.textContent = 'Commission (₹)';
        amountInput.readOnly = false;
        amountInput.style.background = 'var(--bg)';
      }
    }

    function calculateCommission() {
      const type = document.getElementById('f-comm-type').value;
      if (type !== 'percent') return;

      const price = parseFloat(document.getElementById('f-price').value) || 0;
      const pct = parseFloat(document.getElementById('f-comm-pct').value) || 0;
      const amount = Math.round((price * pct) / 100);
      document.getElementById('f-commission').value = amount;
    }

    function addExtraValue() {
      const input = document.getElementById('extraInput');
      const val = input.value.trim();
      if (val && !state.currentFormExtras.includes(val)) {
        state.currentFormExtras.push(val);
        input.value = '';
        renderExtrasChips();
      }
    }

    function removeExtraValue(index) {
      state.currentFormExtras.splice(index, 1);
      renderExtrasChips();
    }

    function renderExtrasChips() {
      const container = document.getElementById('extrasChips');
      container.innerHTML = state.currentFormExtras.map((ex, i) => `
        <div class="chip">
          ${ex}
          <span class="chip-delete" onclick="removeExtraValue(${i})">✕</span>
        </div>
      `).join('');
    }

    function toggleChip(el) { el.classList.toggle('active'); }

    function updateRangeStyle(input) {
      if (!input) return;
      const pct = (input.value - input.min) / (input.max - input.min) * 100;
      input.style.background = `linear-gradient(to right, var(--green) ${pct}%, var(--border-card) ${pct}%)`;
    }

    function updateModels() { /* Concept removed */ }

    function resetForm() {
      document.getElementById('f-brand').value = '';
      document.getElementById('f-model').value = '';
      document.getElementById('f-year').value = '';
      document.getElementById('f-hp').value = '';
      document.getElementById('f-location').value = '';
      document.getElementById('f-price').value = '';
      document.getElementById('f-commission').value = '';
      document.getElementById('f-comm-type').value = 'manual';
      document.getElementById('f-comm-pct').value = '';
      toggleCommissionType();
      document.getElementById('f-desc').value = '';
      document.getElementById('f-status').value = 'available';
      document.getElementById('f-contact').value = state.settings.phone.replace('+91 ', '');
      document.getElementById('f-gear').value = '';
      document.getElementById('f-steering').value = '';
      document.getElementById('f-brake').value = '';
      document.getElementById('f-clutch').value = '';
      document.getElementById('f-bookType').value = '';
      state.currentFormExtras = [];
      renderExtrasChips();
      document.getElementById('addScreenTitle').textContent = 'Add Tractor';
      state.editingId = null;
      // Reset condition inputs
      const defaults = { 'f-condition': 75, 'f-engine-cond': 80, 'f-tyre-cond': 70 };
      ['f-condition', 'f-engine-cond', 'f-tyre-cond'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = defaults[id]; }
      });
    }

    function saveDraft() {
      showToast('💾 Draft saved!', 'success');
      document.getElementById('addScreenSub').textContent = '💾 Saved just now';
    }

    let photoUploads = {};
    function triggerPhotoUpload(idx) {
      state.currentPhotoCell = idx;
      document.getElementById('photoFileInput').click();
    }
    function handlePhotoUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        photoUploads[state.currentPhotoCell] = ev.target.result;
        const cell = document.querySelectorAll('#photoGrid .photo-cell')[state.currentPhotoCell];
        cell.classList.add('has-image');
        cell.innerHTML = `<img class="photo-preview" src="${ev.target.result}" alt="photo"/>`;
        showToast('Photo added!', 'success');
      };
      reader.readAsDataURL(file);
    }

    async function publishListing() {
      // CLEAR PREVIOUS ERRORS
      document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));

      const requiredFields = [
        'f-brand', 'f-model', 'f-year', 'f-hp', 'f-location',
        'f-gear', 'f-steering', 'f-brake', 'f-clutch',
        'f-condition', 'f-engine-cond', 'f-tyre-cond', 'f-condition-notes',
        'f-reg', 'f-bookType', 'f-loan', 'f-insurance', 'f-status',
        'f-price', 'f-comm-type', 'f-commission', 'f-contact', 'f-desc'
      ];
      if (document.getElementById('f-comm-type').value === 'percent') {
        requiredFields.push('f-comm-pct');
      }

      let errors = [];
      requiredFields.forEach(id => {
        const el = document.getElementById(id);
        if (!el.value || el.value.trim() === '') {
          el.classList.add('invalid');
          errors.push(id);
        }
      });

      if (state.currentFormExtras.length === 0) {
        errors.push('Extras (Add at least one feature)');
        showToast('Please add at least one Feature/Extra', 'error');
      }

      const photoCount = Object.keys(photoUploads).length;
      if (photoCount === 0) {
        errors.push('Photos (Upload at least one)');
        showToast('Please upload at least one Photo', 'error');
      }

      const regEl = document.getElementById('f-reg');
      const regRegex = /^[A-Z]{2}\s[0-9]{2}\s[A-Z]{1,2}\s[0-9]{4}$/;
      if (regEl.value && !regRegex.test(regEl.value)) {
        regEl.classList.add('invalid');
        errors.push('f-reg (Format: TN 32 BK 1094)');
      }

      if (errors.length > 0) {
        showToast(`Please fill all mandatory fields (${errors.length} missing)`, 'error');
        // Expand the first section with an error
        const firstErrorEl = document.getElementById(errors[0]);
        if (firstErrorEl) {
          const sectionBody = firstErrorEl.closest('.fs-body');
          if (sectionBody && sectionBody.classList.contains('collapsed')) {
            toggleSection(sectionBody.previousElementSibling);
          }
          firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      const brand = document.getElementById('f-brand').value;
      const model = document.getElementById('f-model').value;
      const year = document.getElementById('f-year').value;
      const price = document.getElementById('f-price').value;
      const bookType = document.getElementById('f-bookType').value;

      const extras = [...state.currentFormExtras];
      const listing = {
        id: state.editingId || Date.now(),
        brand, model, year,
        hp: document.getElementById('f-hp').value || '—',
        location: document.getElementById('f-location').value || '—',
        price: parseInt(price),
        commType: document.getElementById('f-comm-type').value,
        commPct: parseFloat(document.getElementById('f-comm-pct').value) || 0,
        commission: parseInt(document.getElementById('f-commission').value) || 0,
        status: document.getElementById('f-status').value,
        condition: parseInt(document.getElementById('f-condition').value),
        engineCond: parseInt(document.getElementById('f-engine-cond').value),
        tyreCond: parseInt(document.getElementById('f-tyre-cond').value),
        condNotes: document.getElementById('f-condition-notes').value,
        gear: document.getElementById('f-gear').value || '—',
        steering: document.getElementById('f-steering').value || '—',
        brake: document.getElementById('f-brake').value || '—',
        clutch: document.getElementById('f-clutch').value || '—',
        extras,
        reg: document.getElementById('f-reg').value || '—',
        bookType,
        loan: document.getElementById('f-loan').value || '—',
        insurance: document.getElementById('f-insurance').value || '—',
        emoji: '🚜',
        desc: document.getElementById('f-desc').value || '',
        createdAt: new Date().toISOString()
      };

      if (state.editingId) {
        const idx = state.listings.findIndex(l => l.id === state.editingId);
        if (idx !== -1) state.listings[idx] = listing;
        showToast('✅ Listing updated!', 'success');
      } else {
        state.listings.unshift(listing);
        showToast('🎉 Listing published!', 'success');
      }
      
      await saveListingToDB(listing);
      state.editingId = null;
      setTimeout(() => switchTo('mainApp'), 500);
    }

    function changeListingStatus(id, newStatus, event) {
      if (event) event.stopPropagation();
      const listing = state.listings.find(l => l.id === id);
      if (listing) {
        listing.status = newStatus;
        saveListings();
        renderListings();
        refreshDashboard();
        refreshReports();
        showToast(`Status updated to ${newStatus}`, 'success');
      }
    }

    /* ===================== DATE PICKER LOGIC ===================== */
    function openDatePicker() { document.getElementById('datePickerOverlay').classList.add('open'); }
    function closeDatePicker() { document.getElementById('datePickerOverlay').classList.remove('open'); }

    function setRangePreset(mode) {
      state.reportRange = mode;
      document.querySelectorAll('.dp-preset-btn').forEach(btn => {
        const btnText = btn.textContent.toLowerCase().replace(/\s/g, '');
        const targetMode = mode.toLowerCase();
        btn.classList.toggle('active', btnText === targetMode);
      });
      if (mode !== 'custom') {
        document.getElementById('dpFrom').value = '';
        document.getElementById('dpTo').value = '';
      }
    }

    function markCustomRange() {
      state.reportRange = 'custom';
      document.querySelectorAll('.dp-preset-btn').forEach(btn => btn.classList.remove('active'));
    }

    function applyDatePicker() {
      const mode = state.reportRange;
      const now = new Date();
      let start = null, end = null;
      let label = 'Custom Range';
      if (mode === 'today') { start = new Date(now.setHours(0,0,0,0)); label = 'Today'; }
      else if (mode === 'yesterday') {
        const d = new Date(); d.setDate(d.getDate() - 1);
        start = new Date(d.setHours(0,0,0,0));
        end = new Date(d.setHours(23,59,59,999));
        label = 'Yesterday';
      } else if (mode === 'last7') {
        const d = new Date(); d.setDate(d.getDate() - 7);
        start = new Date(d.setHours(0,0,0,0)); label = 'Last 7 Days';
      } else if (mode === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1); label = 'This Month';
      } else if (mode === 'all') { start = null; label = 'All Time'; }
      else if (mode === 'custom') {
        const from = document.getElementById('dpFrom').value;
        const to = document.getElementById('dpTo').value;
        if (!from || !to) { showToast('Please select both dates', 'error'); return; }
        start = new Date(from); start.setHours(0,0,0,0);
        end = new Date(to); end.setHours(23,59,59,999);
        label = `${from} - ${to}`;
      }
      state.reportStart = start ? start.getTime() : null;
      state.reportEnd = end ? end.getTime() : null;
      document.getElementById('reportRangeText').textContent = label;
      refreshReports();
      closeDatePicker();
      showToast('Date filter applied', 'success');
    }

    function isListingInRange(l) {
      if (!state.reportStart && !state.reportEnd) return true;
      const created = l.createdAt ? new Date(l.createdAt).getTime() : 0;
      if (state.reportStart && created < state.reportStart) return false;
      if (state.reportEnd && created > state.reportEnd) return false;
      return true;
    }

    /* ===================== DASHBOARD ===================== */
    function refreshDashboard() {
      const activeListings = state.listings.filter(isListingInRange);
      const total = activeListings.length;
      const avail = activeListings.filter(l => l.status === 'available').length;
      const sold = activeListings.filter(l => l.status === 'sold').length;
      const comm = activeListings.reduce((s, l) => s + (l.commission || 0), 0);
      const soldComm = activeListings.filter(l => l.status === 'sold').reduce((s, l) => s + (l.commission || 0), 0);

      document.getElementById('statTotal').textContent = total;
      document.getElementById('statAvail').textContent = avail;
      document.getElementById('statSold').textContent = sold;
      document.getElementById('dashCommission').textContent = '₹' + comm.toLocaleString('en-IN');
      document.getElementById('dashCommissionChange').textContent = '+₹' + soldComm.toLocaleString('en-IN') + ' from sold';

      const recent = state.listings.slice(0, 6);
      const html = recent.map(l => `
    <div class="listing-mini" onclick="openDetail(${l.id})">
      <div class="lm-img">${l.emoji}</div>
      <div class="lm-body">
        <div class="lm-price">₹${(l.price / 100000).toFixed(1)}L</div>
        <div class="lm-model">${l.brand} ${l.model}</div>
        <div class="lm-year">${l.year}</div>
        <div class="status-badge ${l.status === 'available' ? 'sb-avail' : l.status === 'sold' ? 'sb-sold' : 'sb-reserved'}">${l.status.charAt(0).toUpperCase() + l.status.slice(1)}</div>
      </div>
    </div>`).join('');
      document.getElementById('recentListings').innerHTML = html || '<div style="padding:10px;color:var(--text-muted);font-size:13px;">No listings yet</div>';
      document.getElementById('listingsCount').textContent = total + ' tractors';
    }

    /* ===================== LISTINGS ===================== */
    let filterMode = 'all';
    function setFilter(mode, el) {
      filterMode = mode;
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      renderListings();
    }
    function filterListings() { renderListings(); }
    function renderListings() {
      const q = (document.getElementById('searchInput').value || '').toLowerCase();
      const list = state.listings.filter(l => {
        const matchQ = !q || (l.brand + ' ' + l.model + ' ' + l.year).toLowerCase().includes(q);
        const matchF = filterMode === 'all' || l.status === filterMode || l.brand.toLowerCase() === filterMode;
        return matchQ && matchF;
      });
      const html = list.map(l => `
    <div class="listing-row" onclick="openDetail(${l.id})">
      <div class="lr-img">${l.emoji}</div>
      <div class="lr-body">
        <div class="lr-price">₹${l.price.toLocaleString('en-IN')}</div>
        <div class="lr-model">${l.brand} ${l.model}</div>
        <div class="lr-specs">${l.year} · ${l.hp} · ${l.gear} · ${l.location}</div>
        <div class="lr-footer">
          <select class="status-dropdown ${l.status === 'available' ? 'sd-avail' : l.status === 'sold' ? 'sd-sold' : 'sd-reserved'}" 
                  onclick="event.stopPropagation()" 
                  onchange="changeListingStatus(${l.id}, this.value, event)">
            <option value="available" ${l.status === 'available' ? 'selected' : ''}>Available</option>
            <option value="sold" ${l.status === 'sold' ? 'selected' : ''}>Sold</option>
            <option value="reserved" ${l.status === 'reserved' ? 'selected' : ''}>Reserved</option>
          </select>
          <div class="lr-actions">
            <div class="lr-action" onclick="event.stopPropagation();editListing(${l.id})">✏️</div>
            <div class="lr-action" onclick="event.stopPropagation();shareListing(${l.id})">📤</div>
          </div>
        </div>
      </div>
    </div>`).join('');

      if (state.listings.length === 0) {
        document.getElementById('listingsList').innerHTML = `
          <div class="empty-state" style="padding:40px 20px; text-align:center;">
            <div class="empty-icon" style="font-size:48px; margin-bottom:16px;">🚜</div>
            <div class="empty-title" style="font-size:18px; font-weight:700; color:var(--text); margin-bottom:8px;">No listings available</div>
            <div class="empty-desc" style="font-size:14px; color:var(--text-sec); margin-bottom:24px;">Add your first tractor to get started</div>
            <button class="btn-primary" onclick="goTo('add-screen')" style="max-width:200px; margin:0 auto;">+ Add Tractor</button>
          </div>`;
      } else {
        document.getElementById('listingsList').innerHTML = html || `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <div class="empty-title">No results found</div>
            <div class="empty-desc">Try adjusting your filters or search query.</div>
          </div>`;
      }
    }
    function refreshListings() { renderListings(); }

    /* ===================== DETAIL ===================== */
    function openDetail(id) {
      const l = state.listings.find(x => x.id === id);
      if (!l) return;
      state.currentDetailId = id;
      document.getElementById('detailEmoji').textContent = l.emoji;
      document.getElementById('detailPrice').textContent = '₹' + l.price.toLocaleString('en-IN');
      document.getElementById('detailModel').textContent = l.brand + ' ' + l.model;
      document.getElementById('detailLocation').textContent = '📍 ' + l.location + ' · ' + l.year;
      document.getElementById('detailBadge').innerHTML = `<div class="status-badge ${l.status === 'available' ? 'sb-avail' : l.status === 'sold' ? 'sb-sold' : 'sb-reserved'}" style="font-size:11px;padding:4px 11px;">${l.status.charAt(0).toUpperCase() + l.status.slice(1)}</div>`;
      document.getElementById('detailSpecs').innerHTML = `
    <div class="spec-card"><div class="spec-emoji">⚡</div><div class="spec-val">${l.hp}</div><div class="spec-key">Power</div></div>
    <div class="spec-card"><div class="spec-emoji">⚙️</div><div class="spec-val">${l.gear}</div><div class="spec-key">Gearbox</div></div>
    <div class="spec-card"><div class="spec-emoji">🔧</div><div class="spec-val">${l.clutch}</div><div class="spec-key">Clutch</div></div>
    <div class="spec-card"><div class="spec-emoji">🏎️</div><div class="spec-val">${l.steering}</div><div class="spec-key">Steering</div></div>
    <div class="spec-card"><div class="spec-emoji">🛑</div><div class="spec-val">${l.brake}</div><div class="spec-key">Brake</div></div>
    <div class="spec-card"><div class="spec-emoji">🔋</div><div class="spec-val">${l.condition}%</div><div class="spec-key">Condition</div></div>`;
      const props = [
        ['Registration', l.reg], ['Book Type', l.bookType], ['Loan Status', l.loan], ['Insurance', l.insurance],
        ['Commission', '₹' + (l.commission || 0).toLocaleString('en-IN')],
        ['Extras', (l.extras || []).join(', ') || '—'],
        ['Description', l.desc || '—']
      ];
      document.getElementById('detailProps').innerHTML = props.map(([k, v]) => `<div class="detail-prop"><div class="dp-key">${k}</div><div class="dp-val">${v}</div></div>`).join('');
      goTo('detail-screen');
    }

    function editCurrentListing() { editListing(state.currentDetailId); }
    function shareListing(id) { state.currentDetailId = id; shareCurrentListing(); }
    function shareCurrentListing() {
      const l = state.listings.find(x => x.id === state.currentDetailId);
      if (!l) return;
      populatePoster(l);
      goTo('share-screen');
    }
    function deleteCurrentListing() {
      openModal('Delete Listing?', [
        { icon: '🗑️', label: 'Yes, delete this listing', action: 'confirmDelete()' },
      ]);
    }
    async function confirmDelete() {
      const idToDelete = state.currentDetailId;
      state.listings = state.listings.filter(l => l.id !== idToDelete);
      
      if (supabase) {
        try {
          const { error } = await supabase.from('listings').delete().eq('id', idToDelete);
          if (error) throw error;
        } catch (err) {
          console.error('Supabase delete error:', err);
          showToast('Error deleting from database', 'error');
        }
      }

      closeModal();
      showToast('Listing deleted', 'info');
      switchTo('mainApp');
      renderListings();
      refreshDashboard();
      refreshReports();
    }
    function editListing(id) {
      const l = state.listings.find(x => x.id === id);
      if (!l) return;
      state.editingId = id;
      document.getElementById('addScreenTitle').textContent = 'Edit Tractor';
      goTo('add-screen');
      // Pre-fill
      document.getElementById('f-brand').value = l.brand;
      document.getElementById('f-model').value = l.model;
      document.getElementById('f-year').value = l.year;
      document.getElementById('f-hp').value = (l.hp === '—' || !l.hp) ? '' : (l.hp.includes('HP') ? l.hp : l.hp + ' HP');
      document.getElementById('f-location').value = l.location;
      document.getElementById('f-hours').value = l.hours ? l.hours.replace(/,/g, '') : '';
      document.getElementById('f-price').value = l.price;
      document.getElementById('f-comm-type').value = l.commType || 'manual';
      document.getElementById('f-comm-pct').value = l.commPct || '';
      toggleCommissionType();
      document.getElementById('f-commission').value = l.commission;
      document.getElementById('f-status').value = l.status;
      document.getElementById('f-condition').value = l.condition || '';
      document.getElementById('f-gear').value = l.gear || '';
      document.getElementById('f-steering').value = l.steering || '';
      document.getElementById('f-brake').value = l.brake || '';
      document.getElementById('f-clutch').value = l.clutch || '';
      document.getElementById('f-bookType').value = l.bookType || '';

      // Set engine and tyre condition to some generic value or leave empty if not saved
      document.getElementById('f-engine-cond').value = '';
      document.getElementById('f-tyre-cond').value = '';

      state.currentFormExtras = l.extras ? [...l.extras] : [];
      renderExtrasChips();
    }
    function showDetailMenu() {
      openModal('Actions', [
        { icon: '🔗', label: 'Copy Share Link', action: 'copyListingLink(state.currentDetailId);closeModal()' },
        { icon: '✏️', label: 'Edit Listing', action: 'editCurrentListing();closeModal()' },
        { icon: '📤', label: 'Share Image/Poster', action: 'shareCurrentListing();closeModal()' },
        { icon: '🔄', label: 'Mark as Sold', action: 'markSold();closeModal()' },
        { icon: '🗑️', label: 'Delete Listing', action: 'confirmDelete()' }
      ]);
    }
    function markSold() {
      const l = state.listings.find(x => x.id === state.currentDetailId);
      if (l) { l.status = 'sold'; saveListings(); showToast('Marked as sold!', 'success'); openDetail(l.id); }
    }

    /* ===================== SHARE / POSTER ===================== */
    function populatePoster(l) {
      document.getElementById('posterEmoji').textContent = l.emoji;
      document.getElementById('posterPrice').textContent = '₹' + l.price.toLocaleString('en-IN');
      document.getElementById('posterModel').textContent = l.brand + ' ' + l.model + ' · ' + l.year;
      document.getElementById('posterSpecs').innerHTML = [
        l.hp ? `<div class="poster-spec-tag">⚡ ${l.hp}</div>` : '',
        l.gear ? `<div class="poster-spec-tag">⚙️ ${l.gear}</div>` : '',
        l.condition ? `<div class="poster-spec-tag">🔋 ${l.condition}% cond.</div>` : ''
      ].join('');
      document.getElementById('posterBroker').textContent = state.settings.name;
      document.getElementById('posterPhone').textContent = state.settings.phone;
      // Caption
      const extras = (l.extras || []).slice(0, 4).join(', ');
      document.getElementById('captionBox').textContent =
        `🚜 *${l.brand} ${l.model}* for Sale!

💰 Price: ₹${l.price.toLocaleString('en-IN')} ${l.loan === 'Cleared' ? '(Loan Free)' : ''}
📅 Year: ${l.year}
⚡ Power: ${l.hp}
⚙️ Gear: ${l.gear}
🏎️ Steering: ${l.steering}
🛑 Brake: ${l.brake}
🔧 Clutch: ${l.clutch}
🔋 Condition: ${l.condition}%
📍 Location: ${l.location}
📖 Book Type: ${l.bookType}
${extras ? '✨ Extras: ' + extras + '\n' : ''}
📞 Contact: ${state.settings.phone}
👤 ${state.settings.name}

#tractorsale #${l.brand.toLowerCase().replace(' ', '')} #${l.model.toLowerCase().replace(/\s+/g, '')} #farmmachinery #karnataka #dheeerantractors`;
    }

    function setShareTab(tab, el) {
      document.querySelectorAll('.share-tab').forEach(t => t.classList.remove('active'));
      el.classList.add('active');
      document.getElementById('shareTabPoster').style.display = tab === 'poster' ? 'block' : 'none';
      document.getElementById('shareTabPdf').style.display = tab === 'pdf' ? 'block' : 'none';
      document.getElementById('shareTabCaption').style.display = tab === 'caption' ? 'block' : 'none';
    }

    function shareWhatsApp() {
      const l = state.listings.find(x => x.id === state.currentDetailId);
      if (!l) return;
      const text = `🚜 *${l.brand} ${l.model}* for Sale!\n💰 ₹${l.price.toLocaleString('en-IN')}\n📅 ${l.year} · ${l.hp} · ${l.gear}\n🔋 ${l.condition}% condition\n📍 ${l.location}\n📞 ${state.settings.phone}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
    function shareInstagram() { showToast('📸 Open Instagram and paste from clipboard!', 'info'); copyCaption(); }
    function copyPosterLink() { copyListingLink(state.currentDetailId); }
    function copyListingLink(id) {
      if (!id) id = state.currentDetailId;
      const url = `${window.location.origin}${window.location.pathname}?id=${id}`;
      navigator.clipboard.writeText(url).then(() => {
        showToast('🔗 Link copied to clipboard!', 'success');
      }).catch(err => {
        // Fallback for older browsers
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast('🔗 Link copied!', 'success');
      });
    }

    function initSharingLink() {
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get('id');
      if (id) {
        const checkExist = setInterval(() => {
          if (state.listings.length > 0) {
            clearInterval(checkExist);
            openDetail(parseInt(id));
            history.replaceState(null, '', window.location.pathname);
          }
        }, 100);
        setTimeout(() => clearInterval(checkExist), 3000);
      }
    }

    function copyCaption() {
      const text = document.getElementById('captionBox').textContent;
      navigator.clipboard.writeText(text).then(() => showToast('📋 Caption copied!', 'success')).catch(() => showToast('📋 Caption ready to copy!', 'info'));
    }

    /* ===================== REPORTS ===================== */
    function exportToExcel() {
      showToast('📊 Preparing Excel file...', 'info');
      setTimeout(() => {
        const rows = [
          ['ID', 'Brand', 'Model', 'Year', 'HP', 'Price', 'Location', 'Status', 'Commission', 'Reg. No', 'Book Type', 'Loan']
        ];
        state.listings.forEach(l => {
          rows.push([
            l.id, l.brand, l.model, l.year, l.hp, l.price, l.location, l.status, l.commission, l.reg, l.bookType, l.loan
          ]);
        });
        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `listings_report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('✅ Excel Exported!', 'success');
      }, 800);
    }

    function exportToPDF() {
      showToast('📄 Preparing PDF Report...', 'info');
      const container = document.getElementById('printArea');
      container.innerHTML = `
        <div class="print-header">
          <div><div class="print-title">Dheeeran Tractors Report</div><div class="print-meta">Generated on ${new Date().toLocaleDateString()}</div></div>
          <div style="text-align:right;"><div style="font-weight:700;">${state.settings.name}</div><div style="font-size:12px;">${state.settings.phone}</div></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:30px;">
          <div style="padding:15px;background:#f9f9f9;border-radius:8px;">Total Listings: <strong>${state.listings.length}</strong></div>
          <div style="padding:15px;background:#f9f9f9;border-radius:8px;">Sold: <strong>${state.listings.filter(x => x.status === 'sold').length}</strong></div>
          <div style="padding:15px;background:#f9f9f9;border-radius:8px;">Total Earnings: <strong>₹${state.listings.reduce((s, x) => s + (x.commission || 0), 0).toLocaleString('en-IN')}</strong></div>
        </div>
        <div>
          ${state.listings.map(l => `
            <div class="print-listing">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div><h3 style="margin:0;color:#1F7A4C;">${l.brand} ${l.model} (${l.year})</h3><div style="margin-top:4px;">₹${l.price.toLocaleString('en-IN')} · ${l.status.toUpperCase()}</div></div>
                <div style="font-size:24px;">${l.emoji}</div>
              </div>
              <div class="print-grid">
                <div>
                   <div class="print-prop"><span>Power</span><span>${l.hp}</span></div>
                   <div class="print-prop"><span>Gearbox</span><span>${l.gear}</span></div>
                   <div class="print-prop"><span>Location</span><span>${l.location}</span></div>
                   <div class="print-prop"><span>Reg. Number</span><span>${l.reg}</span></div>
                </div>
                <div>
                   <div class="print-prop"><span>Condition</span><span>${l.condition}%</span></div>
                   <div class="print-prop"><span>Steering</span><span>${l.steering}</span></div>
                   <div class="print-prop"><span>Brake/Clutch</span><span>${l.brake} · ${l.clutch}</span></div>
                   <div class="print-prop"><span>Book Type</span><span>${l.bookType}</span></div>
                </div>
              </div>
              ${l.desc ? `<div style="margin-top:15px;font-size:12px;color:#666;line-height:1.4;"><strong>Notes:</strong> ${l.desc}</div>` : ''}
            </div>
          `).join('')}
        </div>
      `;
      container.classList.add('active');
      setTimeout(() => {
        window.print();
        container.classList.remove('active');
        container.innerHTML = '';
      }, 500);
    }

    function refreshReports() {
      const activeListings = state.listings.filter(isListingInRange);
      const total = activeListings.length;
      const sold = activeListings.filter(l => l.status === 'sold').length;
      const comm = activeListings.reduce((s, l) => s + (l.commission || 0), 0);
      document.getElementById('repTotal').textContent = total;
      document.getElementById('repSold').textContent = sold;
      document.getElementById('repCommission').textContent = '₹' + comm.toLocaleString('en-IN');
      document.getElementById('repTotalTrend').textContent = '+' + Math.min(total, 3) + ' in period';
      document.getElementById('repSoldTrend').textContent = '+' + sold + ' in period';
      document.getElementById('repCommTrend').textContent = '+₹' + Math.round(comm * 0.4).toLocaleString('en-IN') + ' in period';

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const vals = [2, 3, 5, Math.max(total, 1), 4, 7];
      const max = Math.max(...vals);
      document.getElementById('monthlyBars').innerHTML = months.map((m, i) => {
        const h = Math.round((vals[i] / max) * 70);
        const hl = i === 3;
        return `<div class="bar-col"><div class="bar-num ${hl ? 'hl' : ''}">${vals[i]}</div><div class="bar-fill ${hl ? 'highlight' : ''}" style="height:${h}px;"></div></div>`;
      }).join('');
      document.getElementById('monthlyLabels').innerHTML = months.map(m => `<div class="bcl-item">${m}</div>`).join('');
    }

    /* ===================== SOLD DETAILS LOGIC ===================== */
    function openSoldDetails() {
      renderSoldTable();
      goTo('sold-details-screen');
    }

    function closeSoldDetails() {
      switchTo('mainApp');
      setTab('reports');
    }

    function renderSoldTable() {
      const q = (document.getElementById('soldSearchInput').value || '').toLowerCase();
      const soldList = state.listings.filter(l => l.status === 'sold' && isListingInRange(l));
      
      const filtered = soldList.filter(l => 
        (l.brand + ' ' + l.model).toLowerCase().includes(q)
      );

      document.getElementById('soldDetailsSubtitle').textContent = `${filtered.length} items in current filter`;

      // Group by Brand
      const groups = filtered.reduce((acc, l) => {
        const key = l.brand.toUpperCase();
        if (!acc[key]) acc[key] = [];
        acc[key].push(l);
        return acc;
      }, {});

      let html = '';
      if (filtered.length === 0) {
        html = '<tr><td colspan="3" style="text-align:center;padding:40px;color:var(--text-muted);">No sold items found for this filter.</td></tr>';
      } else {
        Object.keys(groups).sort().forEach(brand => {
          const items = groups[brand];
          const brandTotal = items.reduce((s, i) => s + i.price, 0);
          html += `
            <tr class="category-row">
              <td colspan="2">${brand} (${items.length} units)</td>
              <td style="text-align:right;">₹${brandTotal.toLocaleString('en-IN')}</td>
            </tr>
          `;
          items.forEach(l => {
            html += `
              <tr>
                <td>
                  <div style="font-weight:600;">${l.model} (${l.year})</div>
                  <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Reg: ${l.reg}</div>
                </td>
                <td style="text-align:right;font-weight:700;">₹${l.price.toLocaleString('en-IN')}</td>
                <td style="text-align:right;" class="comm-val">₹${(l.commission || 0).toLocaleString('en-IN')}</td>
              </tr>
            `;
          });
        });
      }
      document.getElementById('soldTableBody').innerHTML = html;
    }

    /* ===================== SETTINGS ===================== */
    function toggleFeature(key) {
      const map = { dark: 'toggleDark', notif: 'toggleNotif', autoSave: 'toggleAutoSave' };
      const el = document.getElementById(map[key]);
      el.classList.toggle('on');
      if (key === 'dark') showToast('Dark mode coming soon!', 'info');
      else showToast(el.classList.contains('on') ? 'Enabled' : 'Disabled', 'success');
    }
    function editProfile() {
      const name = prompt('Enter your name:', state.settings.name);
      if (name && name.trim()) {
        state.settings.name = name.trim();
        localStorage.setItem('dt_settings', JSON.stringify(state.settings));
        applySettings();
        showToast('Profile updated!', 'success');
      }
    }
    function editContactNumber() {
      const num = prompt('Enter default contact number:', state.settings.phone);
      if (num && num.trim()) {
        state.settings.phone = num.trim();
        localStorage.setItem('dt_settings', JSON.stringify(state.settings));
        applySettings();
        showToast('Contact updated!', 'success');
      }
    }
    function addCustomField() {
      openModal('Select Field Type', [
        { icon: '📝', label: 'Text Field', action: 'addCustomFieldPrompt("Text");closeModal()' },
        { icon: '🔢', label: 'Number Field', action: 'addCustomFieldPrompt("Number");closeModal()' },
        { icon: '🔽', label: 'Dropdown List', action: 'addCustomFieldPrompt("Dropdown");closeModal()' },
        { icon: '☑️', label: 'Checkbox', action: 'addCustomFieldPrompt("Checkbox");closeModal()' },
        { icon: '💯', label: 'Percentage', action: 'addCustomFieldPrompt("%");closeModal()' }
      ]);
    }

    function addCustomFieldPrompt(type) {
      const name = prompt(`Enter name for ${type} field:`);
      if (!name) return;
      const cfList = document.getElementById('cfList');
      const badges = { Text: 'cfb-text', Number: 'cfb-text', Dropdown: 'cfb-drop', Checkbox: 'cfb-text', '%': 'cfb-pct' };
      cfList.insertAdjacentHTML('beforeend', `
    <div class="cf-row">
      <div class="cf-drag">⋮⋮</div>
      <div class="cf-info"><div class="cf-name">${name}</div><div class="cf-type-text">${type} field</div></div>
      <div class="cf-badge ${badges[type] || 'cfb-text'}">${type}</div>
    </div>`);
      showToast('Custom field added!', 'success');
    }
    function logout() {
      if (confirm('Logout from Dheeeran Tractors?')) {
        backToPhone();
        document.getElementById('phoneInput').value = '';
        goTo('auth');
        showToast('Logged out', 'info');
      }
    }

    /* ===================== MODAL ===================== */
    function openModal(title, options) {
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalBody').innerHTML = options.map(o =>
        `<div class="modal-option" onclick="${o.action}"><div class="mo-icon">${o.icon}</div><div class="mo-label">${o.label}</div></div>`
      ).join('');
      document.getElementById('modalOverlay').classList.add('open');
    }
    function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }
    document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === document.getElementById('modalOverlay')) closeModal(); });

    /* ===================== TOAST ===================== */
    function showToast(msg, type = 'success') {
      const c = document.getElementById('toastContainer');
      const el = document.createElement('div');
      el.className = `toast toast-${type}`;
      el.innerHTML = `<div class="toast-dot"></div>${msg}`;
      c.appendChild(el);
      setTimeout(() => el.remove(), 2900);
    }

    /* ===================== RANGE INIT ===================== */
    window.addEventListener('DOMContentLoaded', () => {
      ['f-condition', 'f-engine-cond', 'f-tyre-cond'].forEach(id => {
        const el = document.getElementById(id);
        if (el) updateRangeStyle(el);
      });
      // Commission calculation listener
      const priceInput = document.getElementById('f-price');
      if (priceInput) {
        priceInput.addEventListener('input', () => {
          if (document.getElementById('f-comm-type').value === 'percent') calculateCommission();
        });
      }
      initSharingLink();
    });
  </script>