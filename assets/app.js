const PRICE = '₩ 9,800';

let BEATS = [
  { id:'b01', title:'Ticki Tock',     genre:'R&B, Neo Soul',     bpm:68,  mood:'sensual', hot:true,  tags:['Waacking','Choreography'],
    preview:'https://cdn.pixabay.com/audio/2022/10/18/audio_31fc54f9c3.mp3', gumroad:'#' },
  { id:'b02', title:'Midnight Prowl', genre:'Trap, Dark',        bpm:72,  mood:'dark',    hot:true,  tags:['Choreography','Krump'],
    preview:'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3', gumroad:'#' },
  { id:'b03', title:'Sun Drip',       genre:'Lo-Fi, Funk',       bpm:86,  mood:'chill',   hot:true,  tags:['House','Locking'],
    preview:'https://cdn.pixabay.com/audio/2022/10/30/audio_347111d654.mp3', gumroad:'#' },
  { id:'b04', title:'Boom Room',      genre:'Hip-Hop, Bounce',   bpm:94,  mood:'bouncy',  tags:['Hip-Hop','Choreography'],
    preview:'https://cdn.pixabay.com/audio/2023/06/12/audio_0ca4d4bc61.mp3', gumroad:'#' },
  { id:'b05', title:'Concrete Grit',  genre:'Drill, Raw',        bpm:140, mood:'raw',     tags:['Krump','Hip-Hop'],
    preview:'https://cdn.pixabay.com/audio/2022/11/22/audio_fd51bd24cc.mp3', gumroad:'#' },
  { id:'b06', title:'Velvet Hours',   genre:'R&B, Neo Soul',     bpm:64,  mood:'sensual', tags:['Waacking','Choreography'],
    preview:'https://cdn.pixabay.com/audio/2022/03/10/audio_270f49b83f.mp3', gumroad:'#' },
  { id:'b07', title:'Night Mode',     genre:'Trap, Dark',        bpm:76,  mood:'dark',    tags:['Choreography','Krump'],
    preview:'https://cdn.pixabay.com/audio/2022/08/02/audio_2dde668d05.mp3', gumroad:'#' },
  { id:'b08', title:'Jelly Walk',     genre:'Funk, Groove',      bpm:82,  mood:'chill',   tags:['Locking','House'],
    preview:'https://cdn.pixabay.com/audio/2022/01/18/audio_d0c6ff1bdd.mp3', gumroad:'#' },
  { id:'b09', title:'Turbo Hop',      genre:'Jersey, Bounce',    bpm:138, mood:'bouncy',  tags:['Jersey','Hip-Hop'],
    preview:'https://cdn.pixabay.com/audio/2022/08/04/audio_a40f38ee45.mp3', gumroad:'#' },
  { id:'b10', title:'Alley Static',   genre:'Drill, Raw',        bpm:144, mood:'raw',     tags:['Krump','Hip-Hop'],
    preview:'https://cdn.pixabay.com/audio/2022/10/25/audio_0cb7c48de7.mp3', gumroad:'#' },
  { id:'b11', title:'Low Tide',       genre:'R&B, Ambient',      bpm:70,  mood:'sensual', tags:['Choreography','Waacking'],
    preview:'https://cdn.pixabay.com/audio/2023/01/11/audio_8a2afedf7e.mp3', gumroad:'#' },
  { id:'b12', title:'Black Room',     genre:'Trap, Dark',        bpm:80,  mood:'dark',    tags:['Krump','Choreography'],
    preview:'https://cdn.pixabay.com/audio/2022/10/30/audio_347111d654.mp3', gumroad:'#' },
];

let ALL_TAGS = [...new Set(BEATS.flatMap(b => b.tags))].sort();

/* ========== LOAD BEATS — Google Sheet + localStorage cache ========== */
// 곡 데이터는 Google Sheet에서 자동으로 불러옵니다.
// 두 번째 방문부터는 localStorage 캐시로 즉시 표시되고, 백그라운드에서 새 데이터를 받아옵니다.
//
// 시트 컬럼: id, title, genre, bpm, mood, tags(;로 구분), preview, gumroad, hot
// 시트 편집하시면: https://docs.google.com/spreadsheets/d/1FvHA... (원본 시트)
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRC420Lmntg_m7WA4i55CVy-osc35ajc_NzBNr6PU07wqBRWze3TXWGrGz21Ur2pSYiCwfNG2phWUST/pub?output=csv';
const CACHE_KEY = 'onda_beats_cache_v1';

function parseCSVLine(line){
  const out = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++){
    const c = line[i];
    if (c === '"' && line[i+1] === '"'){ cur += '"'; i++; }
    else if (c === '"') inQ = !inQ;
    else if (c === ',' && !inQ){ out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}
function parseCSV(text){
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim().length);
  if (!lines.length) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const cells = parseCSVLine(line);
    const row = {};
    headers.forEach((h, idx) => row[h] = (cells[idx] || '').trim());
    return row;
  });
}
function normaliseRow(r){
  return {
    id: r.id,
    title: r.title,
    genre: r.genre || '',
    bpm: r.bpm || '',
    mood: (r.mood || '').toLowerCase(),
    tags: (r.tags || '').split(/[;,|]/).map(s => s.trim()).filter(Boolean),
    preview: r.preview || '',
    gumroad: r.gumroad || '#',
    hot: /^(true|1|y|yes)$/i.test(String(r.hot || '').trim())
  };
}
function applyBeats(parsed){
  if (!parsed || !parsed.length) return false;
  BEATS = parsed.filter(b => b.id && b.title);
  ALL_TAGS = [...new Set(BEATS.flatMap(b => b.tags))].sort();
  return true;
}

// Try loading cached sheet data synchronously (super fast)
function loadFromCache(){
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const cached = JSON.parse(raw);
    if (!cached || !Array.isArray(cached.beats) || !cached.beats.length) return false;
    return applyBeats(cached.beats);
  } catch(e) { return false; }
}

// Always fetch fresh sheet data in the background
async function fetchFromSheet(){
  try {
    const res = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const parsed = parseCSV(text).map(normaliseRow).filter(b => b.id && b.title);
    if (parsed.length){
      const prevJson = JSON.stringify(BEATS);
      applyBeats(parsed);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ beats: parsed, t: Date.now() })); } catch(e){}
      // re-render only if data actually changed
      if (JSON.stringify(BEATS) !== prevJson){
        if (document.getElementById('beats-body') && typeof applyFilters === 'function'){
          applyFilters();
        }
        if (typeof initCarousel === 'function' && document.getElementById('hotTrack')){
          initCarousel();
        }
      }
      console.log('[ONDA] Loaded', BEATS.length, 'beats from Google Sheet');
    }
  } catch (e) {
    console.warn('[ONDA] Sheet load failed (using cache/fallback):', e);
  }
}

async function loadBeats(){
  // Step 1: cache hit → render instantly
  loadFromCache();
  // Step 2: kick off background refresh (don't await — UI renders immediately)
  fetchFromSheet();
}

const audio = document.getElementById('audio-player');
let currentEl = null;
let currentId = null;
let currentTitle = '';
let currentMeta = '';

if (audio) audio.volume = 0.85;

// Clean up any stale static rows from sounds.html that aren't inside #beats-body
(function clearStaleRows(){
  const tbody = document.getElementById('beats-body');
  if (!tbody) return;
  const table = tbody.closest('table');
  if (!table) return;
  table.querySelectorAll('tr.beat-row').forEach(tr => {
    if (!tbody.contains(tr)) tr.remove();
  });
  // also remove any extra tbodies that the browser may have synthesized
  table.querySelectorAll('tbody').forEach(tb => {
    if (tb !== tbody) tb.remove();
  });
})();

/* ========== STICKY PLAYER BAR ========== */
const PREVIEW_LIMIT = 60; // seconds — 1분 미리듣기 제한
function ensurePlayerBar(){
  if (document.getElementById('player-bar')) return document.getElementById('player-bar');
  const bar = document.createElement('div');
  bar.id = 'player-bar';
  bar.className = 'player-bar hidden';
  bar.innerHTML = `
    <div class="pb-inner">
      <button class="pb-toggle" aria-label="Play/Pause">
        <svg class="pb-play"  viewBox="0 0 10 12"><polygon points="0,0 10,6 0,12"/></svg>
        <svg class="pb-pause" viewBox="0 0 10 12"><rect x="1" y="1" width="3" height="10"/><rect x="6" y="1" width="3" height="10"/></svg>
      </button>
      <div class="pb-meta">
        <div class="pb-title-row">
          <div class="pb-title"></div>
          <span class="pb-preview-badge">🔒 1분 미리듣기</span>
        </div>
        <div class="pb-sub"></div>
      </div>
      <div class="pb-time pb-cur">0:00</div>
      <div class="pb-track">
        <div class="pb-limit"></div>
        <div class="pb-fill"></div>
        <div class="pb-thumb"></div>
      </div>
      <div class="pb-time pb-dur">0:00</div>
      <button class="pb-close" aria-label="Close player">×</button>
    </div>
  `;
  document.body.appendChild(bar);

  const toggle = bar.querySelector('.pb-toggle');
  const track  = bar.querySelector('.pb-track');
  const fill   = bar.querySelector('.pb-fill');
  const thumb  = bar.querySelector('.pb-thumb');
  const limit  = bar.querySelector('.pb-limit');
  const cur    = bar.querySelector('.pb-cur');
  const dur    = bar.querySelector('.pb-dur');
  const closeBtn = bar.querySelector('.pb-close');

  toggle.addEventListener('click', () => {
    if (!audio) return;
    if (audio.paused){
      if (audio.currentTime >= PREVIEW_LIMIT) audio.currentTime = 0;
      audio.play();
    } else audio.pause();
  });

  closeBtn.addEventListener('click', () => {
    if (audio) audio.pause();
    bar.classList.add('hidden');
    stopCurrent();
  });

  function fmt(s){
    if (!isFinite(s)) return '0:00';
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s/60);
    const r = s % 60;
    return m + ':' + (r<10?'0':'') + r;
  }

  function updateLimitMarker(){
    if (!audio.duration || !isFinite(audio.duration)) {
      limit.style.left = '100%'; limit.style.width = '0%';
      return;
    }
    const limitPct = Math.min(100, (PREVIEW_LIMIT / audio.duration) * 100);
    limit.style.left = limitPct + '%';
    limit.style.width = (100 - limitPct) + '%';
  }

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    if (audio.currentTime >= PREVIEW_LIMIT){
      audio.pause();
      audio.currentTime = PREVIEW_LIMIT;
    }
    const pct = (audio.currentTime / audio.duration) * 100;
    fill.style.width = pct + '%';
    thumb.style.left = pct + '%';
    cur.textContent = fmt(audio.currentTime);
    dur.textContent = fmt(audio.duration);
  });
  audio.addEventListener('loadedmetadata', () => {
    dur.textContent = fmt(audio.duration);
    updateLimitMarker();
  });
  audio.addEventListener('play', () => bar.classList.add('is-playing'));
  audio.addEventListener('pause', () => bar.classList.remove('is-playing'));

  function seekFromEvent(e){
    const rect = track.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    if (audio.duration){
      const targetSec = audio.duration * pct;
      audio.currentTime = Math.min(targetSec, PREVIEW_LIMIT - 0.05);
    }
  }
  track.addEventListener('click', seekFromEvent);
  let dragging = false;
  track.addEventListener('mousedown', e => { dragging = true; seekFromEvent(e); });
  window.addEventListener('mousemove', e => { if (dragging) seekFromEvent(e); });
  window.addEventListener('mouseup', () => { dragging = false; });

  return bar;
}

function showPlayer(title, meta){
  const bar = ensurePlayerBar();
  bar.classList.remove('hidden');
  bar.querySelector('.pb-title').textContent = title || '';
  bar.querySelector('.pb-sub').textContent = meta || '';
}

function waveHtml(){
  let out = '';
  for (let i=0;i<22;i++){
    const h = 8 + Math.round(Math.random()*20);
    out += `<span style="height:${h}px"></span>`;
  }
  return out;
}

function stopCurrent(){
  if (currentEl) currentEl.classList.remove('playing');
  document.querySelectorAll('.playing').forEach(el => el.classList.remove('playing'));
  currentEl = null;
  currentId = null;
}

if (audio){
  audio.addEventListener('pause', () => {
    document.querySelectorAll('.playing').forEach(el => el.classList.remove('playing'));
  });
  audio.addEventListener('play', () => {
    if (currentId){
      document.querySelectorAll(`[data-id="${currentId}"]`).forEach(n => n.classList.add('playing'));
    }
  });
}

function togglePlay(el, id, src){
  if (!audio) return;
  if (currentId === id && !audio.paused){
    audio.pause();
    return;
  }
  if (currentId === id && audio.paused){
    audio.play();
    return;
  }
  stopCurrent();
  audio.src = src;
  audio.play().catch(err => console.log('playback blocked:', err));
  document.querySelectorAll(`[data-id="${id}"]`).forEach(n => n.classList.add('playing'));
  currentEl = el;
  currentId = id;

  // Pull a friendly title + meta off the element if available
  const beat = BEATS.find(b => b.id === id);
  const title = beat ? beat.title : (el.querySelector('.song-title, .title')?.textContent || 'Now playing');
  const meta  = beat ? `${beat.genre} · ${beat.bpm} BPM` : (el.querySelector('.meta')?.textContent || '');
  currentTitle = title; currentMeta = meta;
  showPlayer(title, meta);
}

if (audio) audio.addEventListener('ended', () => { stopCurrent(); const bar = document.getElementById('player-bar'); if (bar) bar.classList.remove('is-playing'); });

/* ========== SOUNDS TABLE (if present) ========== */
const beatsBody = document.getElementById('beats-body');
const moodBtns = document.querySelectorAll('.filter-btn');
const tagsWrap = document.getElementById('tag-filters');
const searchInput = document.getElementById('beat-search');

let activeMood = 'all';
let activeTags = new Set();
let searchQuery = '';

/* ========== CART ========== */
const SINGLE_PRICE = 9800;
const BUNDLE_PRICE = 15000; // 3-pack
// 주문 알림을 받는 Google Form (응답은 ondaroombeat@gmail.com Google Sheet에 누적)
// Gmail로도 알림 받으시려면: 폼 응답 시트 열기 → 도구 → 알림 규칙 → "양식 사용자가 양식을 제출하는 경우" 체크
const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdmAMwEbw4ePt8cUJuaITH7N0JPO3KO0gmGMF_dz8R5wbyHfg/formResponse';
const cart = new Set();
try { JSON.parse(localStorage.getItem('onda_cart') || '[]').forEach(id => cart.add(id)); } catch(e){}

function saveCart(){
  try { localStorage.setItem('onda_cart', JSON.stringify([...cart])); } catch(e){}
}

function calcCart(){
  const items = [...cart].map(id => BEATS.find(b => b.id === id)).filter(Boolean);
  const n = items.length;
  const bundles = Math.floor(n / 3);
  const singles = n - bundles * 3;
  const subtotal = n * SINGLE_PRICE;
  const total = bundles * BUNDLE_PRICE + singles * SINGLE_PRICE;
  const discount = subtotal - total;
  return { items, n, bundles, singles, subtotal, total, discount };
}

function fmt(n){ return '₩ ' + n.toLocaleString('ko-KR'); }

/* === Floating cart bar === */
function ensureCartBar(){
  if (document.getElementById('cart-bar')) return document.getElementById('cart-bar');
  const bar = document.createElement('div');
  bar.id = 'cart-bar';
  bar.className = 'cart-bar hidden';
  bar.innerHTML = `
    <div class="cart-bar-inner">
      <div class="cart-bar-left">
        <span class="cart-count"><b>0</b>곡 선택됨</span>
        <span class="cart-promo" id="cart-promo"></span>
      </div>
      <div class="cart-bar-right">
        <span class="cart-total"><span class="cart-total-old"></span><b id="cart-total-val">₩ 0</b></span>
        <button class="cart-buy-btn" id="cart-buy">구매하기 →</button>
      </div>
    </div>
  `;
  document.body.appendChild(bar);
  bar.querySelector('#cart-buy').addEventListener('click', openCheckout);
  return bar;
}

function updateCartBar(){
  const bar = ensureCartBar();
  const { n, bundles, singles, subtotal, total, discount } = calcCart();
  if (!n){ bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  bar.querySelector('.cart-count b').textContent = n;
  const totalEl = bar.querySelector('#cart-total-val');
  const oldEl = bar.querySelector('.cart-total-old');
  totalEl.textContent = fmt(total);
  if (discount > 0){
    oldEl.textContent = fmt(subtotal);
    oldEl.style.display = 'inline';
  } else {
    oldEl.style.display = 'none';
  }
  const promoEl = bar.querySelector('#cart-promo');
  if (bundles >= 1){
    promoEl.textContent = `· 묶음 할인 ${bundles}회 적용 (-${fmt(discount)})`;
  } else {
    const more = 3 - n;
    promoEl.textContent = more > 0 ? `· ${more}곡 더 담으면 묶음 할인 적용 (-₩ 14,400)` : '';
  }
  // sync header check-all
  const allCheck = document.getElementById('check-all');
  if (allCheck){
    const visible = [...beatsBody.querySelectorAll('.row-check')];
    allCheck.checked = visible.length > 0 && visible.every(c => c.checked);
  }
}

/* === Checkout modal === */
function ensureCheckout(){
  if (document.getElementById('checkout-modal')) return document.getElementById('checkout-modal');
  const m = document.createElement('div');
  m.id = 'checkout-modal';
  m.className = 'checkout-modal hidden';
  m.innerHTML = `
    <div class="checkout-backdrop"></div>
    <div class="checkout-card">
      <button class="checkout-close" aria-label="닫기">×</button>

      <!-- STEP 1: Cart review -->
      <div class="checkout-step" data-step="cart">
        <div class="checkout-head">
          <div>
            <div class="checkout-kicker">/ CHECKOUT</div>
            <h3>장바구니</h3>
          </div>
        </div>
        <div class="checkout-list" id="checkout-list"></div>
        <div class="checkout-promo-notice" id="checkout-promo"></div>
        <div class="checkout-summary">
          <div class="row"><span>소계</span><span id="co-subtotal">₩ 0</span></div>
          <div class="row discount" id="co-discount-row"><span>3곡 묶음 할인</span><span id="co-discount">-₩ 0</span></div>
          <div class="row total"><span>총 결제 금액</span><span id="co-total">₩ 0</span></div>
        </div>
        <div class="checkout-actions">
          <button class="checkout-secondary" id="keep-shopping">← 더 둘러보기</button>
          <button class="checkout-pay" id="checkout-pay">결제하기 →</button>
        </div>
      </div>

      <!-- STEP 2: Payment info -->
      <div class="checkout-step hidden" data-step="pay">
        <div class="checkout-head">
          <div>
            <div class="checkout-kicker">/ PAYMENT</div>
            <h3>결제 안내</h3>
          </div>
        </div>

        <div class="pay-summary">
          <span>총 결제 금액</span>
          <b id="pay-total">₩ 0</b>
        </div>

        <label class="pay-field">
          <span class="pay-field-label">음원 받을 이메일 <em>*</em></span>
          <input type="email" id="pay-email" placeholder="you@example.com" autocomplete="email" />
          <span class="pay-field-hint" id="pay-email-hint">입금 확인 후 이 이메일로 음원 파일을 보내드립니다.</span>
        </label>

        <div class="bank-card">
          <div class="bank-row">
            <span class="bank-label">은행</span>
            <span class="bank-value">카카오뱅크</span>
          </div>
          <div class="bank-row">
            <span class="bank-label">예금주</span>
            <span class="bank-value">디어뮤직스튜디오</span>
          </div>
          <div class="bank-row">
            <span class="bank-label">계좌번호</span>
            <span class="bank-value bank-account">3333-31-2035748 <button class="bank-copy" type="button" data-copy="3333312035748">복사</button></span>
          </div>
          <div class="bank-row bank-amount">
            <span class="bank-label">입금 금액</span>
            <span class="bank-value" id="pay-bank-amount">₩ 0</span>
          </div>
        </div>

        <div class="pay-notice">
          <div class="pay-notice-item">
            <strong>📨 음원 발송 안내</strong>
            <p>입금 확인 후 영업일 기준 <b>24시간 이내</b>에 입력하신 이메일로 음원 파일(WAV/MP3) 다운로드 링크를 보내드립니다.</p>
          </div>
          <div class="pay-notice-item warn">
            <strong>⚠️ 환불 불가 안내</strong>
            <p>디지털 음원의 특성상 <b>입금 완료 후 환불은 불가</b>합니다. 결제 전 미리듣기로 충분히 확인해 주세요.</p>
          </div>
        </div>

        <div class="checkout-actions">
          <button class="checkout-secondary" id="back-to-cart">← 장바구니로</button>
          <button class="checkout-pay" id="submit-payment">결제하기</button>
        </div>
      </div>

      <!-- STEP 3: Confirmation -->
      <div class="checkout-step hidden" data-step="done">
        <div class="checkout-done">
          <div class="checkout-done-icon">✓</div>
          <h3>접수 완료!</h3>
          <p>주문번호 <b id="done-order">—</b></p>
          <p>위 계좌로 <b id="done-amount">₩ 0</b>을 입금해 주시면<br/>
          <b id="done-email">your email</b>으로 음원을 보내드립니다.</p>
          <p class="checkout-done-sub">입금 후 24시간 안에 메일이 도착하지 않으면<br/>ondaroombeat@gmail.com 으로 알려주세요.</p>
          <button class="checkout-pay" id="done-close">확인</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  m.querySelector('.checkout-close').addEventListener('click', closeCheckout);
  m.querySelector('.checkout-backdrop').addEventListener('click', closeCheckout);
  m.querySelector('#keep-shopping').addEventListener('click', closeCheckout);
  m.querySelector('#checkout-pay').addEventListener('click', () => {
    if (!calcCart().n){ return; }
    goToStep(m, 'pay');
    // update pay totals
    const t = calcCart().total;
    m.querySelector('#pay-total').textContent = fmt(t);
    m.querySelector('#pay-bank-amount').textContent = fmt(t);
  });
  m.querySelector('#back-to-cart').addEventListener('click', () => goToStep(m, 'cart'));
  m.querySelector('#submit-payment').addEventListener('click', async () => {
    const emailEl = m.querySelector('#pay-email');
    const hint = m.querySelector('#pay-email-hint');
    const email = emailEl.value.trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!ok){
      emailEl.classList.add('invalid');
      hint.textContent = '올바른 이메일 주소를 입력해 주세요.';
      hint.classList.add('error');
      emailEl.focus();
      return;
    }
    const { items, total, bundles, singles } = calcCart();
    const orderId = 'ONDA-' + Date.now().toString(36).toUpperCase();
    const tracksList = items.map(b => `• ${b.title} (${b.genre}, ${b.bpm}BPM) [${b.id}]`).join('\n');
    const orderSummary =
`📦 신규 주문 — ONDA beat
주문번호: ${orderId}
일시: ${new Date().toLocaleString('ko-KR')}

[ 고객 이메일 — 음원 발송 주소 ]
${email}

[ 주문 곡 (${items.length}곡) ]
${tracksList}

[ 결제 정보 ]
묶음(3곡): ${bundles}건 × ₩15,000
단품: ${singles}곡 × ₩9,800
총 입금 예정 금액: ${fmt(total)}
`;

    // Submit order to Google Form (no signup, no CORS issue with mode: 'no-cors')
    // Replies go to ondaroombeat@gmail.com Google Sheet + Gmail alerts (if enabled in form settings)
    const btn = m.querySelector('#submit-payment');
    btn.disabled = true;
    btn.textContent = '전송 중…';
    try {
      const formData = new FormData();
      formData.append('entry.247651292', orderId);                                    // 주문번호
      formData.append('entry.296273000', new Date().toLocaleString('ko-KR'));         // 일시
      formData.append('entry.288100514', email);                                      // 고객이메일
      formData.append('entry.1538608366', items.map(b => `${b.title} [${b.id}]`).join(', ')); // 곡리스트
      formData.append('entry.96241666', String(total));                               // 결제금액
      await fetch(GOOGLE_FORM_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: formData
      });
    } catch (e) {
      console.log('Form submit failed (will still confirm to user):', e);
    }
    btn.disabled = false;
    btn.textContent = '결제하기';

    m.querySelector('#done-amount').textContent = fmt(total);
    m.querySelector('#done-email').textContent = email;
    m.querySelector('#done-order').textContent = orderId;
    goToStep(m, 'done');
  });
  m.querySelector('#done-close').addEventListener('click', () => {
    // clear cart and close
    cart.clear();
    saveCart();
    updateCartBar();
    if (beatsBody) beatsBody.querySelectorAll('.row-check').forEach(c => c.checked = false);
    closeCheckout();
    goToStep(m, 'cart');
  });
  // copy account number
  m.querySelectorAll('.bank-copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        const orig = btn.textContent;
        btn.textContent = '복사됨!';
        setTimeout(() => { btn.textContent = orig; }, 1400);
      } catch(e){}
    });
  });
  // email validity reset
  m.querySelector('#pay-email').addEventListener('input', () => {
    const el = m.querySelector('#pay-email');
    const hint = m.querySelector('#pay-email-hint');
    el.classList.remove('invalid');
    hint.classList.remove('error');
    hint.textContent = '입금 확인 후 이 이메일로 음원 파일을 보내드립니다.';
  });
  return m;
}

function goToStep(modal, step){
  modal.querySelectorAll('.checkout-step').forEach(el => {
    el.classList.toggle('hidden', el.dataset.step !== step);
  });
}

function renderCheckout(){
  const m = ensureCheckout();
  const { items, n, bundles, subtotal, total, discount } = calcCart();
  const list = m.querySelector('#checkout-list');
  if (!items.length){
    list.innerHTML = `<div class="checkout-empty">장바구니가 비어있습니다.</div>`;
  } else {
    list.innerHTML = items.map(b => `
      <div class="checkout-item">
        <div class="ci-info">
          <div class="ci-title">${b.title}</div>
          <div class="ci-meta">${b.genre} · ${b.bpm} BPM · ${b.tags.join(' / ')}</div>
        </div>
        <div class="ci-price">${fmt(SINGLE_PRICE)}</div>
        <button class="ci-remove" data-id="${b.id}" aria-label="제거">×</button>
      </div>
    `).join('');
    list.querySelectorAll('.ci-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        cart.delete(btn.dataset.id);
        saveCart();
        renderCheckout();
        updateCartBar();
        // uncheck row
        const row = beatsBody && beatsBody.querySelector(`.row-check[data-id="${btn.dataset.id}"]`);
        if (row) row.checked = false;
      });
    });
  }
  m.querySelector('#co-subtotal').textContent = fmt(subtotal);
  m.querySelector('#co-discount').textContent = '-' + fmt(discount);
  m.querySelector('#co-discount-row').style.display = discount > 0 ? 'flex' : 'none';
  m.querySelector('#co-total').textContent = fmt(total);
  const promo = m.querySelector('#checkout-promo');
  if (n > 0 && n < 3){
    promo.textContent = `🎁 ${3-n}곡만 더 담으면 3곡 묶음 ₩15,000 (-₩14,400 할인) 적용!`;
    promo.style.display = 'block';
  } else if (n >= 3 && n % 3 !== 0){
    const need = 3 - (n % 3);
    promo.textContent = `🎁 ${need}곡만 더 담으면 추가 묶음 할인이 적용됩니다.`;
    promo.style.display = 'block';
  } else {
    promo.style.display = 'none';
  }
}

function openCheckout(){
  const m = ensureCheckout();
  goToStep(m, 'cart');
  renderCheckout();
  m.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeCheckout(){
  const m = document.getElementById('checkout-modal');
  if (m) m.classList.add('hidden');
  document.body.style.overflow = '';
}


function renderBeats(beats){
  if (!beatsBody) return;
  beatsBody.innerHTML = beats.map(b => `
    <tr class="beat-row" data-id="${b.id}" data-src="${b.preview}" data-mood="${b.mood}">
      <td class="check-cell">
        <label class="checkbox">
          <input type="checkbox" class="row-check" data-id="${b.id}" ${cart.has(b.id) ? 'checked' : ''}/>
          <span class="checkbox-box"></span>
        </label>
      </td>
      <td>
        <button class="play-btn" aria-label="Play ${b.title}">
          <svg class="play-icon" viewBox="0 0 10 12"><polygon points="0,0 10,6 0,12"/></svg>
          <svg class="pause-icon" viewBox="0 0 10 12"><rect x="1" y="1" width="3" height="10"/><rect x="6" y="1" width="3" height="10"/></svg>
        </button>
      </td>
      <td>
        <span class="song-title">${b.title}</span>
        <div class="song-tags">${b.tags.map(t => `<span class="song-tag">${t}</span>`).join('')}</div>
      </td>
      <td class="wave-cell"><div class="wave">${waveHtml()}</div></td>
      <td class="genre-cell"><span class="song-genre">${b.genre}</span></td>
      <td><span class="song-bpm">${b.bpm}</span></td>
      <td style="text-align:center;">
        <button class="dl-link buy-btn" data-id="${b.id}" aria-label="장바구니에 담기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        </button>
      </td>
    </tr>
  `).join('');

  beatsBody.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.beat-row');
      togglePlay(row, row.dataset.id, row.dataset.src);
    });
  });
  beatsBody.querySelectorAll('.beat-row').forEach(row => {
    row.querySelector('.song-title').addEventListener('click', () => {
      togglePlay(row, row.dataset.id, row.dataset.src);
    });
  });
  // checkbox toggles cart
  beatsBody.querySelectorAll('.row-check').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) cart.add(cb.dataset.id);
      else cart.delete(cb.dataset.id);
      saveCart();
      updateCartBar();
    });
  });
  // buy button = add to cart + open checkout
  beatsBody.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cart.add(btn.dataset.id);
      saveCart();
      // also tick the row's checkbox
      const row = btn.closest('.beat-row');
      const cb = row.querySelector('.row-check');
      if (cb) cb.checked = true;
      updateCartBar();
      openCheckout();
    });
  });

  if (currentId){
    const match = beatsBody.querySelector(`.beat-row[data-id="${currentId}"]`);
    if (match) match.classList.add('playing');
  }

  if (!beats.length){
    beatsBody.innerHTML = `<tr><td colspan="7" class="empty-state">검색 결과가 없습니다. 다른 무드나 태그로 시도해 보세요.</td></tr>`;
  }
}

function applyFilters(){
  let list = BEATS;
  if (activeMood !== 'all') list = list.filter(b => b.mood === activeMood);
  if (activeTags.size) list = list.filter(b => b.tags.some(t => activeTags.has(t)));
  if (searchQuery){
    const q = searchQuery.toLowerCase();
    list = list.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.genre.toLowerCase().includes(q) ||
      b.tags.join(' ').toLowerCase().includes(q)
    );
  }
  // stop audio if current song is filtered out
  if (currentId){
    const stillHere = list.find(b => b.id === currentId);
    const inCarousel = BEATS.filter(b => b.hot).find(b => b.id === currentId);
    if (!stillHere && !inCarousel){
      audio.pause();
      stopCurrent();
    }
  }
  renderBeats(list);
}

function initSoundsUI(){
  if (!beatsBody) return;
  // mood filter (single-select)
  moodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      moodBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeMood = btn.dataset.mood;
      applyFilters();
    });
  });

  // dance tag filters (multi-select chips)
  if (tagsWrap){
    tagsWrap.innerHTML = ALL_TAGS.map(t => `<button class="tag-chip" data-tag="${t}">${t}</button>`).join('');
    tagsWrap.querySelectorAll('.tag-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.dataset.tag;
        if (activeTags.has(tag)){ activeTags.delete(tag); chip.classList.remove('on'); }
        else { activeTags.add(tag); chip.classList.add('on'); }
        applyFilters();
      });
    });
  }

  // search
  if (searchInput){
    searchInput.addEventListener('input', e => {
      searchQuery = e.target.value.trim();
      applyFilters();
    });
  }

  // check-all toggle
  const checkAll = document.getElementById('check-all');
  if (checkAll){
    checkAll.addEventListener('change', () => {
      const visibleChecks = beatsBody.querySelectorAll('.row-check');
      visibleChecks.forEach(cb => {
        cb.checked = checkAll.checked;
        if (checkAll.checked) cart.add(cb.dataset.id);
        else cart.delete(cb.dataset.id);
      });
      saveCart();
      updateCartBar();
    });
  }

  renderBeats(BEATS);
  updateCartBar();
}

/* ========== HOT BEAT CAROUSEL (if present) ========== */
const track = document.getElementById('hotTrack');
const dotsWrap = document.getElementById('hotDots');

function initCarousel(){
  if (!track || !dotsWrap) return;
  const hotBeats = BEATS.filter(b => b.hot);
  let hotIdx = 0;

  track.innerHTML = hotBeats.map((b, i) => `
    <div class="carousel-slide" data-id="${b.id}" data-src="${b.preview}">
      <div style="display:flex;align-items:center;gap:24px;min-width:0;">
        <div class="num">0${i+1}</div>
        <div>
          <div class="title">${b.title}</div>
          <div class="meta">${b.genre}</div>
          <div class="slide-tags">${(b.tags || []).map(t => `<span class="slide-tag">${t}</span>`).join('')}</div>
        </div>
      </div>
      <div class="bpm-badge">${b.bpm} BPM</div>
      <button class="carousel-play" aria-label="Play ${b.title}">
        <svg class="play-icon" viewBox="0 0 10 12"><polygon points="0,0 10,6 0,12"/></svg>
        <svg class="pause-icon" viewBox="0 0 10 12"><rect x="1" y="1" width="3" height="10"/><rect x="6" y="1" width="3" height="10"/></svg>
      </button>
      <a class="carousel-buy" href="${b.gumroad}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v14"/><polyline points="7 12 12 17 17 12"/><line x1="5" y1="21" x2="19" y2="21"/></svg>
      </a>
    </div>
  `).join('');

  dotsWrap.innerHTML = hotBeats.map((_, i) => `<span${i===0?' class="on"':''}></span>`).join('');

  function goToSlide(i){
    hotIdx = (i + hotBeats.length) % hotBeats.length;
    const slides = track.querySelectorAll('.carousel-slide');
    const slide = slides[hotIdx];
    const vp = track.parentElement;
    let shiftPx = 0;
    if (slide && vp){
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      shiftPx = vp.clientWidth / 2 - slideCenter;
    }
    track.style.transform = `translateX(${shiftPx}px)`;
    dotsWrap.querySelectorAll('span').forEach((d, idx) => d.classList.toggle('on', idx === hotIdx));
    slides.forEach((s, idx) => s.classList.toggle('is-active', idx === hotIdx));
  }
  window.addEventListener('resize', () => goToSlide(hotIdx));

  const prev = document.getElementById('hotPrev');
  const next = document.getElementById('hotNext');
  if (prev) prev.onclick = () => goToSlide(hotIdx - 1);
  if (next) next.onclick = () => goToSlide(hotIdx + 1);
  dotsWrap.querySelectorAll('span').forEach((d, i) => d.onclick = () => goToSlide(i));

  // touch swipe (mobile)
  const vp = track.closest('.carousel-viewport') || track.parentElement;
  let touchX = null;
  vp.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  vp.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) goToSlide(hotIdx + (dx < 0 ? 1 : -1));
    touchX = null;
  }, { passive: true });

  track.querySelectorAll('.carousel-slide').forEach(slide => {
    const btn = slide.querySelector('.carousel-play');
    btn.addEventListener('click', () => {
      togglePlay(slide, slide.dataset.id, slide.dataset.src);
    });
  });

  // activate first slide
  goToSlide(0);
}

/* ========== INIT — load data then render ========== */
loadBeats().then(() => {
  initSoundsUI();
  initCarousel();
});

/* ========== FAQ (if present) ========== */
document.querySelectorAll('.faq-q').forEach(q => {
  q.addEventListener('click', () => {
    const item = q.closest('.faq-item');
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});
