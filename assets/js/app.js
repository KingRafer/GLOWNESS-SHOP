/* =====================================================
   CONFIG
===================================================== */
const WHATSAPP_NUMBER = '6285133352577'; // 085133352577
const SITE_NAME = 'GLOWNESS SHOP';

/* =====================================================
   MIDTRANS CONFIG
   - CLIENT_KEY aman ditaruh di sini (public key, bukan rahasia).
   - SERVER_KEY & OpenAI API key JANGAN ditaruh di file ini —
     keduanya disimpan sebagai secret di Supabase Edge Functions
     (lihat folder supabase-functions/ + DEPLOY_INSTRUCTIONS.md).
===================================================== */
const MIDTRANS_CLIENT_KEY = 'GANTI_DENGAN_CLIENT_KEY_MIDTRANS_KAMU';
const MIDTRANS_ENV = 'sandbox'; // ganti ke 'production' saat sudah live

/* =====================================================
   STORAGE (Supabase)
   Isi SUPABASE_URL dan SUPABASE_ANON_KEY dengan nilai dari
   Project Settings > API di dashboard Supabase kamu.
   Tabel yang dibutuhkan (jalankan di SQL Editor Supabase):

   CREATE TABLE app_storage (
     key text PRIMARY KEY,
     value jsonb NOT NULL,
     updated_at timestamptz DEFAULT now()
   );
   ALTER TABLE app_storage ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "public read" ON app_storage FOR SELECT USING (true);
   CREATE POLICY "public write" ON app_storage FOR INSERT WITH CHECK (true);
   CREATE POLICY "public update" ON app_storage FOR UPDATE USING (true);
===================================================== */
const SUPABASE_URL = 'https://ptfsmglrxusiowjkgwov.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rFfJMjOVsy0LpSiAmg9JEQ_HbGXLHx6';
let supa = null;
let supaReady = false;
try{
  if(window.supabase && SUPABASE_URL.startsWith('http')){
    supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    supaReady = true;
  }
}catch(e){ console.error('Supabase init gagal', e); }

const FUNCTIONS_BASE = SUPABASE_URL + '/functions/v1';
function functionHeaders(){
  return { 'Content-Type':'application/json', 'apikey':SUPABASE_ANON_KEY, 'Authorization':'Bearer '+SUPABASE_ANON_KEY };
}
function loadMidtransSnap(){
  if(document.getElementById('midtrans-snap-script')) return;
  const s = document.createElement('script');
  s.id = 'midtrans-snap-script';
  s.src = MIDTRANS_ENV === 'production' ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js';
  s.setAttribute('data-client-key', MIDTRANS_CLIENT_KEY);
  document.head.appendChild(s);
}
loadMidtransSnap();

async function loadShared(key, fallback){
  if(!supaReady){ return fallback; }
  try{
    const { data, error } = await supa.from('app_storage').select('value').eq('key', key).maybeSingle();
    if(error || !data) return fallback;
    return data.value;
  }catch(e){ console.error(e); return fallback; }
}
async function saveShared(key, value){
  if(!supaReady) return;
  try{
    await supa.from('app_storage').upsert({ key, value, updated_at: new Date().toISOString() });
  }catch(e){ console.error(e); }
}

/* =====================================================
   SEED DATA
===================================================== */
const SEED_PRODUCTS = [];
const SEED_PACKAGES = [
  {id:'pkg1', name:'Starter', price:0, desc:'Mulai jualan tanpa modal awal, cocok untuk pemula.', benefits:['Akses ke semua produk','Komisi standar dari selisih harga','Bahan promosi dasar','Support via komunitas']},
  {id:'pkg2', name:'Pro Seller', price:150000, desc:'Untuk seller yang lebih serius mengembangkan omset.', benefits:['Semua benefit Starter','Materi promosi & konten siap pakai','Prioritas stok produk','Support respon cepat']},
  {id:'pkg3', name:'Elite Partner', price:500000, desc:'Paket tertinggi dengan keuntungan paling maksimal.', benefits:['Semua benefit Pro Seller','Harga modal spesial','Mentor bisnis pribadi','Undangan event & pelatihan khusus']},
];
const SEED_USERS = [
  {id:'u1', name:'Dimas Pratama', email:'owner@oliv.id', password:'owner123', role:'owner', avatar:''},
  {id:'u2', name:'Sari Amalia', email:'admin@oliv.id', password:'admin123', role:'admin', avatar:''},
  {id:'u3', name:'Bagas Wirawan', email:'seller@oliv.id', password:'seller123', role:'seller', refCode:'BAGAS10', resellPrices:{p1:110000,p2:150000,p3:85000,p4:135000}, totalSpend:0, avatar:'', packageId:'pkg2', readNotifIds:[]},
  {id:'u4', name:'Putri Lestari', email:'customer@oliv.id', password:'customer123', role:'customer', totalSpend:620000, avatar:''},
];
const SEED_ORDERS = [
  {id:'o1001', buyerName:'Fajar S.', buyerWa:'081234500011', total:220000, status:'Selesai', date:'2026-08-18', refCode:'BAGAS10', items:[{id:'p1',name:'Propolis Tetes 20ml',qty:2,unitPrice:110000,basePrice:60000}], discount:0},
  {id:'o1002', buyerName:'Putri Lestari', buyerWa:'081234500022', total:135000, status:'Selesai', date:'2026-08-25', refCode:null, items:[{id:'p2',name:'Propolis Kapsul Softgel',qty:1,unitPrice:135000,basePrice:85000}], discount:0},
  {id:'o1003', buyerName:'Yoga R.', buyerWa:'081234500033', total:85000, status:'Diproses', date:'2026-09-01', refCode:'BAGAS10', items:[{id:'p3',name:'Propolis Throat Spray',qty:1,unitPrice:85000,basePrice:45000}], discount:0},
  {id:'o1004', buyerName:'Nadia P.', buyerWa:'081234500044', total:270000, status:'Selesai', date:'2026-09-04', refCode:'BAGAS10', items:[{id:'p2',name:'Propolis Kapsul Softgel',qty:1,unitPrice:150000,basePrice:85000},{id:'p3',name:'Propolis Throat Spray',qty:1,unitPrice:120000,basePrice:45000}], discount:0},
  {id:'o1005', buyerName:'Rian Hidayat', buyerWa:'081234500055', total:190000, status:'Diproses', date:'2026-09-06', refCode:null, items:[{id:'p1',name:'Propolis Tetes 20ml',qty:2,unitPrice:95000,basePrice:60000}], discount:0},
];
const SEED_WITHDRAWALS = [
  {id:'w1', sellerId:'u3', amount:70000, status:'Disetujui', date:'2026-08-20', method:'Transfer BCA'},
  {id:'w2', sellerId:'u3', amount:40000, status:'Menunggu', date:'2026-09-06', method:'DANA'},
];
const SEED_SETTINGS = {
  tiers:[
    {name:'Bronze', min:0, discount:0, color:'#8c7455'},
    {name:'Silver', min:500000, discount:5, color:'#cbb593'},
    {name:'Gold', min:1500000, discount:10, color:'#eda63a'},
    {name:'Platinum', min:3000000, discount:15, color:'#ffd889'},
  ],
  packages: SEED_PACKAGES,
  referralCodes:[
    {id:'rc1', code:'WELCOME10', discount:10, label:'Diskon pelanggan baru', active:true},
  ],
};
const SEED_NOTIFICATIONS = [
  {id:'n1', title:'Selamat Datang Seller GLOWNESS SHOP! 🎉', message:'Terima kasih sudah bergabung. Yuk mulai bagikan link referralmu dan pantau komisimu di dashboard.', date:'2026-08-15', from:'Tim Oliv Propolis'},
];
const SEED_ANNOUNCEMENT = {active:true, title:'Promo Ongkir Spesial!', message:'Gratis ongkir se-Indonesia untuk pembelian minimal Rp150.000 sepanjang bulan ini.', date:'2026-09-01'};

/* =====================================================
   STATE
===================================================== */
let state = {
  route: location.hash || '#/beranda',
  cart: [], cartOpen:false, productModal:null, toast:null,
  currentUser:null, // logged in user id
  authModal:null,   // {tab:'login'|'register', step:1|2, role:null}
  formModal:null,
  products:[], orders:[], users:[], withdrawals:[], settings:SEED_SETTINGS,
  notifications:[], announcement:null, announceDismissed:false,
  loaded:false,
  regTemp:{},       // temp holder for registration wizard values across steps
  theme: localStorage.getItem('oliv_theme') || 'dark',
  mobileMenuOpen:false,
  dashMenuOpen:false,
  aiOpen:false, aiMessages:[{role:'bot', text:'Halo! 👋 Saya asisten GLOWNESS SHOP. Ada yang bisa saya bantu soal produk, pengiriman, cara jadi seller, atau pesananmu?'}],
};
function toggleTheme(){
  state.theme = state.theme==='light' ? 'dark' : 'light';
  localStorage.setItem('oliv_theme', state.theme);
  document.documentElement.setAttribute('data-theme', state.theme);
  render();
}
function toggleMobileMenu(){ state.mobileMenuOpen = !state.mobileMenuOpen; render(); }
function closeMobileMenu(){ if(!state.mobileMenuOpen) return; state.mobileMenuOpen = false; render(); }
function toggleDashMenu(){ state.dashMenuOpen = !state.dashMenuOpen; render(); }
function closeDashMenu(){ if(!state.dashMenuOpen) return; state.dashMenuOpen = false; render(); }

function toast(msg){
  state.toast = msg; render();
  clearTimeout(window.__t); window.__t = setTimeout(()=>{state.toast=null; render();},2600);
}
function referralLink(code){
  const url = new URL(location.href);
  url.hash = '#/beranda';
  url.search = '';
  url.searchParams.set('ref', code);
  return url.toString();
}
async function copyReferralLink(code){
  const link = referralLink(code);
  try{
    if(navigator.clipboard && window.isSecureContext){
      await navigator.clipboard.writeText(link);
    }else{
      const helper = document.createElement('textarea');
      helper.value = link;
      helper.setAttribute('readonly','');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      helper.setSelectionRange(0, helper.value.length);
      const copied = document.execCommand('copy');
      helper.remove();
      if(!copied) throw new Error('copy command failed');
    }
    toast('Link referral berhasil disalin');
  }catch(err){
    console.error('Gagal menyalin link referral', err);
    toast('Link referral: ' + link);
  }
}
async function initData(){
  state.products = await loadShared('oliv_products', SEED_PRODUCTS);
  state.orders = await loadShared('oliv_orders', SEED_ORDERS);
  state.users = await loadShared('oliv_users', SEED_USERS);
  state.withdrawals = await loadShared('oliv_withdrawals', SEED_WITHDRAWALS);
  state.settings = await loadShared('oliv_settings', SEED_SETTINGS);
  state.notifications = await loadShared('oliv_notifications', SEED_NOTIFICATIONS);
  state.announcement = await loadShared('oliv_announcement', SEED_ANNOUNCEMENT);
  if(!state.settings.packages) state.settings.packages = SEED_PACKAGES;
  if(!state.settings.referralCodes) state.settings.referralCodes = SEED_SETTINGS.referralCodes;
  state.loaded = true;
  render();
  if(!supaReady){ console.warn('[Oliv Propolis] Belum terhubung ke Supabase — data tidak akan tersimpan permanen. Isi SUPABASE_URL & SUPABASE_ANON_KEY di kode.'); }
}
function persist(){
  saveShared('oliv_products', state.products);
  saveShared('oliv_orders', state.orders);
  saveShared('oliv_users', state.users);
  saveShared('oliv_withdrawals', state.withdrawals);
  saveShared('oliv_settings', state.settings);
  saveShared('oliv_notifications', state.notifications);
  saveShared('oliv_announcement', state.announcement);
}
function fmtRp(n){ return 'Rp' + Number(Math.round(n)).toLocaleString('id-ID'); }
function initials(name){ return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }
function currentUser(){ return state.users.find(u=>u.id===state.currentUser); }
function tierFor(spend){
  const tiers = state.settings.tiers;
  let cur = tiers[0];
  for(const t of tiers){ if(spend >= t.min) cur = t; }
  return cur;
}
function nextTier(spend){
  const tiers = state.settings.tiers;
  return tiers.find(t=>t.min > spend) || null;
}
function packageFor(id){ return (state.settings.packages||SEED_PACKAGES).find(p=>p.id===id) || (state.settings.packages||SEED_PACKAGES)[0]; }
/* Resolve what a referral/discount code entered at checkout means:
   - matches a seller's own referral code -> buy at that seller's resell prices
   - matches an active discount code -> percentage off subtotal
   - otherwise invalid */
function resolveRefCode(raw){
  const code = (raw||'').trim().toUpperCase();
  if(!code) return {type:'none'};
  const seller = state.users.find(x=>x.role==='seller' && x.refCode===code);
  if(seller) return {type:'seller', seller};
  const dc = (state.settings.referralCodes||[]).find(r=>r.code.toUpperCase()===code && r.active);
  if(dc) return {type:'discount', discountCode:dc};
  return {type:'invalid'};
}
function avatarHtml(u, sizeClass){
  if(u && u.avatar) return `<img src="${u.avatar}" alt="${u.name}">`;
  return initials(u?u.name:'?');
}

window.addEventListener('hashchange', ()=>{ state.route = location.hash || '#/beranda'; state.dashMenuOpen=false; render(); });

/* =====================================================
   PASSWORD TOGGLE HELPER
===================================================== */
function pwField(id, label, hint){
  return `<div class="field"><label>${label}</label><div class="pw-wrap">
    <input required type="password" id="${id}" autocomplete="new-password">
    <button type="button" class="pw-toggle" onclick="togglePw('${id}',this)" aria-label="Tampilkan kata sandi">👁️</button>
  </div>${hint?`<div class="field-hint">${hint}</div>`:''}</div>`;
}
function togglePw(id, btn){
  const el = document.getElementById(id);
  if(!el) return;
  if(el.type==='password'){ el.type='text'; btn.textContent='🙈'; }
  else { el.type='password'; btn.textContent='👁️'; }
}

/* =====================================================
   IMAGE UPLOAD HELPER (base64)
===================================================== */
function readImageInput(inputEl, cb){
  const file = inputEl.files && inputEl.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=> cb(reader.result);
  reader.readAsDataURL(file);
}

/* =====================================================
   WHATSAPP CHECKOUT MESSAGE
===================================================== */
function buildWaMessage({name, wa, items, subtotal, discountPct, total, refCode}){
  let lines = [];
  lines.push(`Halo ${SITE_NAME}, saya ingin memesan:`);
  lines.push('');
  items.forEach((it,i)=>{
    lines.push(`${i+1}. ${it.name} x${it.qty} = ${fmtRp(it.unitPrice*it.qty)}`);
  });
  lines.push('');
  lines.push(`Subtotal: ${fmtRp(subtotal)}`);
  if(discountPct>0) lines.push(`Diskon: ${discountPct}%`);
  if(refCode) lines.push(`Kode Referral: ${refCode}`);
  lines.push(`Total: ${fmtRp(total)}`);
  lines.push('');
  lines.push(`Nama: ${name}`);
  lines.push(`No. WhatsApp: ${wa}`);
  lines.push('');
  lines.push('Mohon konfirmasi pesanan saya. Terima kasih! 🙏');
  return lines.join('\n');
}
function openWhatsAppOrder(payload){
  const msg = buildWaMessage(payload);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

/* =====================================================
   ANNOUNCEMENT BANNER
===================================================== */
function AnnounceBar(){
  const a = state.announcement;
  if(!a || !a.active || state.announceDismissed) return '';
  return `<div class="announce-bar"><div class="wrap announce-inner">
    📣 <span><b>${a.title}</b> — ${a.message}</span>
    <button class="announce-close" onclick="dismissAnnounce()">✕</button>
  </div></div>`;
}
function dismissAnnounce(){ state.announceDismissed = true; render(); }

/* =====================================================
   NAVBAR
===================================================== */
function Nav(){
  const u = currentUser();
  let right = `<button class="btn btn-soft btn-sm" onclick="openAuth('login')"><span class="lbl-full">Masuk / Daftar</span><span class="lbl-short">Masuk</span></button>`;
  if(u){
    let dest = '#/akun';
    let label = 'Akun Saya', short='Akun';
    if(u.role==='seller'){ dest = '#/seller'; label='Dashboard Seller'; short='Seller'; }
    if(u.role==='admin'||u.role==='owner'){ dest = '#/portal/dashboard'; label='Portal Admin'; short='Portal'; }
    right = `
      <div class="acc-pill">
        <button class="btn btn-soft btn-sm" onclick="location.hash='${dest}'"><span class="lbl-full">${label}</span><span class="lbl-short">${short}</span></button>
        <a class="logout" onclick="doLogout()">Keluar</a>
      </div>`;
  }
  const themeBtn = `<button class="theme-toggle" onclick="toggleTheme()" aria-label="Ganti tema">${state.theme==='light'?'🌙':'☀️'}</button>`;
  const burger = `<button class="burger-btn" onclick="toggleMobileMenu()" aria-label="Menu">${state.mobileMenuOpen?'✕':'☰'}</button>`;
  return `
  <div class="cnav">
    <div class="wrap cnav-inner">
      <div class="brand"><div class="brand-mark">🐝</div><div class="brand-txt">${SITE_NAME}<small>Alami · Murni · Berkhasiat</small></div></div>
      ${state.mobileMenuOpen?`<div class="mobile-menu-backdrop" onclick="closeMobileMenu()"></div><div class="mobile-menu">
        <a href="#/beranda" onclick="closeMobileMenu()" class="${state.route==='#/beranda'?'active':''}">Beranda</a>
        <a href="#/produk" onclick="closeMobileMenu()" class="${state.route==='#/produk'?'active':''}">Produk</a>
        <a href="#/diskon" onclick="closeMobileMenu()" class="${state.route==='#/diskon'?'active':''}">Program Diskon</a>
        <a href="#/jadi-seller" onclick="closeMobileMenu()" class="${state.route==='#/jadi-seller'?'active':''}">Jadi Seller</a>
      </div>`:''}
      <div class="cnav-links">
        <a href="#/beranda" class="${state.route==='#/beranda'?'active':''}">Beranda</a>
        <a href="#/produk" class="${state.route==='#/produk'?'active':''}">Produk</a>
        <a href="#/diskon" class="${state.route==='#/diskon'?'active':''}">Program Diskon</a>
        <a href="#/jadi-seller" class="${state.route==='#/jadi-seller'?'active':''}">Jadi Seller</a>
      </div>
      <div class="nav-right">
        ${themeBtn}
        <button class="cart-pill" onclick="openCart()">🧺 <span class="cart-count">${state.cart.reduce((a,c)=>a+c.qty,0)}</span></button>
        ${right}
        ${burger}
      </div>
    </div>
  </div>
  ${AnnounceBar()}`;
}

/* =====================================================
   HOME
===================================================== */
function Hero(){
  return `
  <div class="hero">
    <div class="wrap hero-grid">
      <div>
        <div class="kicker"></div>
        <h1>GLOWNESS SHOP, <span class="gold">untuk tubuh yang lebih tangguh.</span></h1>
        <p>${SITE_NAME} diproses higienis dari propolis mentah pilihan untuk mendukung daya tahan tubuh dan menjaga kesehatan setiap hari.</p>
        <div class="hero-actions">
          <button class="btn btn-primary" onclick="location.hash='#/produk'">Lihat Semua Produk</button>
          <button class="btn btn-ghost" onclick="location.hash='#/jadi-seller'">Gabung Jadi Seller</button>
        </div>
      </div>
      <div class="hero-side">
        <div class="row"><div class="ic">🎁</div><div><h4>Diskon Member Bertingkat</h4><p>Makin sering belanja, makin besar diskon yang kamu dapat.</p></div></div>
        <div class="row"><div class="ic">📈</div><div><h4>Untung Jadi Seller</h4><p>Atur harga jualmu sendiri & pantau komisi secara real-time.</p></div></div>
        <div class="row"><div class="ic">🛡️</div><div><h4>Higienis & Terpercaya</h4><p>Diproses dari propolis mentah dengan standar kebersihan ketat.</p></div></div>
      </div>
    </div>
  </div>`;
}
function Why(){
  return `
  <div class="wrap section">
    <div class="section-head">
      <div class="kicker">Kenapa ${SITE_NAME}</div>
      <h2>Diproses sederhana, tetap alami</h2>
      <p>Kami menjaga proses seminimal mungkin agar khasiat propolis tetap utuh sampai ke tanganmu.</p>
    </div>
    <div class="why-row">
      <div class="why-card"><div class="em">🐝</div><h4>Propolis Pilihan</h4><p>Kualitas bahan terbaik</p></div>
      <div class="why-card"><div class="em">🧪</div><h4>Diuji Sebelum Kemasan</h4><p>Setiap batch melalui pemeriksaan kualitas sebelum dikemas.</p></div>
      <div class="why-card"><div class="em">📦</div><h4>Dikemas Higienis</h4><p>Proses pengemasan menjaga kemurnian & kebersihan produk.</p></div>
    </div>
  </div>`;
}
function prodThumb(p){
  return p.image ? `<img src="${p.image}" alt="${p.name}">` : p.icon;
}
function ProductGrid(limit){
  const list = limit ? state.products.slice(0,limit) : state.products;
  if(list.length===0){
    return `<div class="empty-state"><div class="em">🍯</div>Belum ada produk tersedia saat ini.</div>`;
  }
  return `<div class="prod-grid">
    ${list.map(p=>`
      <div class="prod-card" onclick="openProduct('${p.id}')">
        ${p.image?`<img class="prod-img-flat" src="${p.image}" alt="${p.name}">`:`<div class="prod-hex">${p.icon}</div>`}
        <h3>${p.name}</h3>
        <p>${p.desc}</p>
        <div class="prod-price">${fmtRp(p.price)}<small>${p.tag}</small></div>
        <button class="btn btn-ghost btn-sm btn-block" onclick="event.stopPropagation();openProduct('${p.id}')">Lihat Detail</button>
      </div>`).join('')}
  </div>`;
}
function ProdukSection(){
  return `
  <div class="wrap section" id="produk">
    <div class="section-head">
      <div class="kicker">Produk Kami</div>
      <h2>Lini produk propolis ${SITE_NAME.split(' ')[0]}</h2>
      <p>Pilih bentuk yang paling nyaman untuk kebutuhanmu sehari-hari.</p>
    </div>
    ${ProductGrid()}
  </div>`;
}
function DiskonTeaser(){
  const tiers = state.settings.tiers;
  const codes = (state.settings.referralCodes||[]).filter(c=>c.active);
  return `
  <div class="section-alt">
    <div class="wrap section">
      <div class="section-head">
        <div class="kicker">Untuk Pelanggan</div>
        <h2>Program Diskon Member</h2>
        <p>Daftar sebagai Customer, dan diskonmu otomatis naik seiring total belanjamu. Punya kode referral atau kode diskon? Pakai saat checkout.</p>
      </div>
      <div class="table-scroll"><table class="tier-table">
        <thead><tr><th>Tingkat</th><th>Minimal Belanja</th><th>Diskon Setiap Pembelian</th></tr></thead>
        <tbody>
          ${tiers.map(t=>`<tr><td><span class="tier-dot" style="background:${t.color}"></span>${t.name}</td><td>${fmtRp(t.min)}</td><td>${t.discount}%</td></tr>`).join('')}
        </tbody>
      </table></div>
      ${codes.length>0?`
      <div style="margin-top:26px;">
        <h4 style="margin:0 0 12px;font-size:15px;">Kode Diskon Aktif</h4>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          ${codes.map(c=>`<div style="background:var(--card);border:1px solid var(--border-strong);border-radius:var(--radius-md);padding:10px 16px;">
            <span class="ref-code" style="font-size:14px;">${c.code}</span>
            <div style="font-size:12px;color:var(--text-dimmer);margin-top:2px;">${c.discount}% off${c.label?' · '+c.label:''}</div>
          </div>`).join('')}
        </div>
      </div>`:''}
      <div style="margin-top:22px;"><button class="btn btn-primary" onclick="openAuth('register','customer')">Daftar Jadi Member</button></div>
    </div>
  </div>`;
}
function SellerCta(){
  return `
  <div class="wrap section" id="jadi-seller">
    <div class="reseller-cta">
      <div>
        <div class="kicker">Untuk Seller</div>
        <h2>Jual propolis dengan hargamu sendiri</h2>
        <div class="reseller-points">
          <div class="pt"><div class="n">1</div><div><b>Atur harga jual sendiri</b><span>Tentukan margin keuntungan tiap produk sesuai strategi kamu.</span></div></div>
          <div class="pt"><div class="n">2</div><div><b>Dashboard seller profesional</b><span>Link referral pribadi, riwayat order, dan status komisi dalam satu tempat.</span></div></div>
          <div class="pt"><div class="n">3</div><div><b>Statistik komisi real-time</b><span>Pantau performa penjualan per produk dan tarik komisi kapan saja.</span></div></div>
        </div>
        <button class="btn btn-primary" onclick="openAuth('register','seller')">Daftar Sebagai Seller</button>
      </div>
      <div class="reseller-visual">
        <div class="fake-stat"><div class="l">Komisi bulan ini</div><div class="v" style="color:var(--gold-2)">Rp1.240.000</div></div>
        <div class="fake-stat"><div class="l">Order dari link kamu</div><div class="v">18</div></div>
        <div class="fake-stat"><div class="l">Produk terlaris</div><div class="v">BOS PROPOLIS</div></div>
        <div class="fake-stat"><div class="l">Status penarikan</div><div class="v" style="color:var(--leaf)">Aktif</div></div>
      </div>
    </div>
  </div>`;
}
function Foot(){
  return `<footer><div class="wrap foot-row">
    <div class="brand" style="font-size:14.5px;"><div class="brand-mark" style="width:28px;height:28px;font-size:13px;">🐝</div>${SITE_NAME}</div>
    <div class="text-dim">© 2026 ${SITE_NAME}. Tim internal? <a onclick="openAuth('login')" style="color:var(--gold-2);font-weight:600;">Masuk ke Portal →</a></div>
  </div></footer>
  <div class="demo-box"><div class="wrap">
    <span><b>Demo Owner:</b> owner@oliv.id / owner123</span>
    <span><b>Demo Admin:</b> admin@oliv.id / admin123</span>
    <span><b>Demo Seller:</b> seller@oliv.id / seller123</span>
    <span><b>Demo Customer:</b> customer@oliv.id / customer123</span>
  </div></div>`;
}

/* =====================================================
   PRODUCT MODAL / CART / CHECKOUT
===================================================== */
function ProductModal(){
  if(!state.productModal) return '';
  const p = state.products.find(x=>x.id===state.productModal);
  if(!p) return '';
  return `
  <div class="overlay" onclick="if(event.target===this) closeProduct()">
    <div class="modal">
      <div class="modal-top"><div>${p.image?`<img class="prod-img-flat" style="width:110px;height:110px;" src="${p.image}" alt="${p.name}">`:`<div class="prod-hex" style="margin:0 0 12px;">${p.icon}</div>`}<h3>${p.name}</h3></div><button class="x-btn" onclick="closeProduct()">✕</button></div>
      <p style="color:var(--text-dim);font-size:14px;line-height:1.65;">${p.desc}</p>
      <div style="display:flex;justify-content:space-between;align-items:center;margin:18px 0 20px;padding:14px 16px;background:var(--card);border-radius:var(--radius-md);">
        <div><div style="font-size:11px;color:var(--text-dimmer);">Harga retail</div><div style="font-size:20px;font-weight:700;">${fmtRp(p.price)}</div></div>
        <span class="badge badge-gold">${p.tag}</span>
      </div>
      <button class="btn btn-primary btn-block" onclick="addToCart('${p.id}')">Tambah ke Keranjang</button>
    </div>
  </div>`;
}
function openProduct(id){ state.productModal=id; render(); }
function closeProduct(){ state.productModal=null; render(); }
function openCart(){ state.cartOpen=true; render(); }
function closeCart(){ state.cartOpen=false; render(); }
function addToCart(pid){
  const p = state.products.find(x=>x.id===pid);
  const ex = state.cart.find(c=>c.id===pid);
  if(ex) ex.qty++; else state.cart.push({id:p.id, name:p.name, price:p.price, qty:1});
  state.productModal=null; state.cartOpen=true; toast('Ditambahkan ke keranjang');
}
function changeQty(id,d){ const it=state.cart.find(c=>c.id===id); it.qty+=d; if(it.qty<=0) state.cart=state.cart.filter(c=>c.id!==id); render(); }
function removeFromCart(id){ state.cart = state.cart.filter(c=>c.id!==id); render(); }

function CartDrawer(){
  if(!state.cartOpen) return '';
  const subtotal = state.cart.reduce((a,c)=>a+c.price*c.qty,0);
  return `
  <div class="drawer-wrap"><div class="drawer-backdrop" onclick="closeCart()"></div>
  <div class="drawer">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><h3 style="margin:0;">Keranjang</h3><button class="x-btn" onclick="closeCart()">✕</button></div>
    <div style="flex:1;overflow-y:auto;">
      ${state.cart.length===0?`<div class="empty-state"><div class="em">🧺</div>Keranjang masih kosong.</div>`:
      state.cart.map(c=>{
        const prod = state.products.find(p=>p.id===c.id);
        return `
      <div class="cart-item"><div class="ic">${prod&&prod.image?`<img src="${prod.image}">`:'🍯'}</div>
        <div class="info"><h4>${c.name}</h4><div class="p">${fmtRp(c.price)}</div>
          <div class="qty-ctrl"><button onclick="changeQty('${c.id}',-1)">−</button><span>${c.qty}</span><button onclick="changeQty('${c.id}',1)">+</button>
          <a style="margin-left:auto;color:var(--red);font-size:12px;" onclick="removeFromCart('${c.id}')">Hapus</a></div>
        </div></div>`;}).join('')}
    </div>
    ${state.cart.length>0?`
    <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:12px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:14px;font-weight:700;"><span>Subtotal</span><span>${fmtRp(subtotal)}</span></div>
      <button class="btn btn-primary btn-block" onclick="openCheckout()">Checkout</button>
    </div>`:''}
  </div></div>`;
}
function openCheckout(){ if(state.cart.length===0) return; state.formModal={type:'checkout'}; render(); setTimeout(updateCheckoutSummary,0); }
function closeFormModal(){ state.formModal=null; render(); }

function CheckoutModal(){
  if(!state.formModal || state.formModal.type!=='checkout') return '';
  const u = currentUser();
  const tier = (u && u.role==='customer') ? tierFor(u.totalSpend||0) : null;
  return `
  <div class="overlay" onclick="if(event.target===this) closeFormModal()">
    <div class="modal">
      <div class="modal-top"><h3>Checkout Pesanan</h3><button class="x-btn" onclick="closeFormModal()">✕</button></div>
      <form onsubmit="submitCheckout(event)">
        <div class="field"><label>Nama Kamu</label><input required id="co-name" value="${u?u.name:''}"></div>
        <div class="field"><label>Nomor WhatsApp</label><input required id="co-wa" placeholder="08xxxxxxxxxx"></div>
        <div class="field"><label>Kode Referral / Diskon (opsional)</label><input id="co-ref" oninput="updateCheckoutSummary()" placeholder="Contoh: BAGAS10 atau WELCOME10">
          <div class="field-hint">Masukkan kode seller untuk beli sesuai harga yang mereka tentukan, atau kode diskon untuk potongan langsung. ${tier?`Sebagai member ${tier.name} kamu otomatis dapat diskon ${tier.discount}% bila tidak memakai kode lain.`:''}</div>
          <div id="co-ref-hint" style="margin-top:6px;"></div>
        </div>
        <div id="co-summary" style="padding:14px 16px;background:var(--card);border-radius:var(--radius-md);margin-bottom:18px;"></div>
        <button id="midtrans-pay-btn" type="button" class="btn btn-primary btn-block" style="margin-bottom:10px;" onclick="payWithMidtrans()">💳 Bayar Online (Kartu/QRIS/VA)</button>
        <button class="btn btn-wa btn-block" type="submit">🟢 Pesan via WhatsApp</button>
        <div class="field-hint" style="text-align:center;margin-top:10px;">Bayar online lewat Midtrans (kartu, QRIS, e-wallet, VA), atau pesan manual lalu konfirmasi via WhatsApp.</div>
      </form>
    </div>
  </div>`;
}
function checkoutCalc(refInput){
  const u = currentUser();
  const subtotal = state.cart.reduce((a,c)=>a+c.price*c.qty,0);
  const res = resolveRefCode(refInput);
  let total = subtotal, discountPct = 0, mode = 'none', note = null;
  if(res.type==='seller'){
    total = state.cart.reduce((a,c)=>a+((res.seller.resellPrices && res.seller.resellPrices[c.id]) || c.price)*c.qty,0);
    mode = 'seller';
  } else {
    let memberPct = (u && u.role==='customer') ? tierFor(u.totalSpend||0).discount : 0;
    if(res.type==='discount'){
      discountPct = Math.max(memberPct, res.discountCode.discount);
      mode = discountPct===res.discountCode.discount && res.discountCode.discount>=memberPct ? 'discount' : 'member';
    } else {
      discountPct = memberPct;
      mode = memberPct>0 ? 'member' : 'none';
      if(res.type==='invalid') note = 'invalid';
    }
    total = Math.round(subtotal * (1 - discountPct/100));
  }
  return {subtotal, total, discountPct, mode, res, note};
}
function updateCheckoutSummary(){
  const refEl = document.getElementById('co-ref');
  const summaryEl = document.getElementById('co-summary');
  const hintEl = document.getElementById('co-ref-hint');
  if(!refEl || !summaryEl) return;
  const c = checkoutCalc(refEl.value);
  let rows = `<div style="display:flex;justify-content:space-between;font-size:13.5px;color:var(--text-dim);margin-bottom:6px;"><span>Subtotal</span><span>${fmtRp(c.subtotal)}</span></div>`;
  if(c.mode==='seller'){
    rows += `<div style="display:flex;justify-content:space-between;font-size:13.5px;color:var(--text-dim);margin-bottom:6px;"><span>Harga sesuai seller</span><span>${fmtRp(c.total)}</span></div>`;
  } else if(c.discountPct>0){
    const cut = Math.round(c.subtotal*c.discountPct/100);
    rows += `<div style="display:flex;justify-content:space-between;font-size:13.5px;color:var(--leaf);margin-bottom:6px;"><span>Diskon ${c.discountPct}%</span><span>-${fmtRp(cut)}</span></div>`;
  }
  rows += `<div style="display:flex;justify-content:space-between;font-weight:700;padding-top:8px;border-top:1px solid var(--border);"><span>Total</span><span>${fmtRp(c.total)}</span></div>`;
  summaryEl.innerHTML = rows;
  if(hintEl){
    if(c.mode==='seller') hintEl.innerHTML = `<span style="color:var(--leaf);font-size:12px;">✓ Kode seller <b>${c.res.seller.refCode}</b> valid — harga mengikuti penjual ini.</span>`;
    else if(c.res.type==='discount') hintEl.innerHTML = `<span style="color:var(--leaf);font-size:12px;">✓ Kode diskon <b>${c.res.discountCode.code}</b> valid — ${c.res.discountCode.label||'potongan harga'}.</span>`;
    else if(c.res.type==='invalid') hintEl.innerHTML = `<span style="color:var(--red);font-size:12px;">Kode tidak ditemukan atau tidak aktif.</span>`;
    else hintEl.innerHTML = '';
  }
}
/* Bangun objek order dari isi keranjang + kode referral/diskon yang dipakai.
   Dipakai bersama oleh alur WhatsApp manual maupun alur Midtrans online. */
function buildOrderObject(name, wa, refInput, paymentMethod){
  const c = checkoutCalc(refInput);
  const seller = c.mode==='seller' ? c.res.seller : null;
  let items = [];
  if(seller){
    items = state.cart.map(cc=>{
      const prod = state.products.find(p=>p.id===cc.id);
      const unit = (seller.resellPrices && seller.resellPrices[cc.id]) || cc.price;
      return {id:cc.id, name:cc.name, qty:cc.qty, unitPrice:unit, basePrice: prod?prod.basePrice:0};
    });
  } else {
    items = state.cart.map(cc=>({id:cc.id, name:cc.name, qty:cc.qty, unitPrice:cc.price, basePrice: (state.products.find(p=>p.id===cc.id)||{}).basePrice||0}));
  }
  const order = {
    id:'o'+Math.floor(1000+Math.random()*9000), buyerName:name, buyerWa:wa, total:c.total, status:'Diproses',
    date:new Date().toISOString().slice(0,10), refCode: seller?seller.refCode:null,
    discountCode: c.res.type==='discount' ? c.res.discountCode.code : null,
    items, discount:c.discountPct, paymentMethod: paymentMethod||'whatsapp'
  };
  return {order, c, seller};
}
function submitCheckout(e){
  e.preventDefault();
  const name = document.getElementById('co-name').value;
  const wa = document.getElementById('co-wa').value;
  const refInput = document.getElementById('co-ref').value.trim().toUpperCase();
  const u = currentUser();
  const {order, c, seller} = buildOrderObject(name, wa, refInput, 'whatsapp');
  state.orders.unshift(order);
  if(u && u.role==='customer'){ u.totalSpend = (u.totalSpend||0) + c.total; }
  persist();

  openWhatsAppOrder({
    name, wa, items: order.items,
    subtotal: seller ? c.total : c.subtotal,
    discountPct: c.discountPct, total:c.total,
    refCode: seller ? seller.refCode : (c.res.type==='discount' ? c.res.discountCode.code : null),
  });

  state.cart=[]; state.cartOpen=false; state.formModal=null;
  toast('Pesanan dibuat! Selesaikan konfirmasi di WhatsApp yang baru terbuka.');
}

/* Alur pembayaran online via Midtrans Snap.
   Token transaksi dibuat lewat Edge Function 'midtrans-snap' (server key
   Midtrans tidak pernah terekspos ke browser). */
async function payWithMidtrans(){
  const name = document.getElementById('co-name').value.trim();
  const wa = document.getElementById('co-wa').value.trim();
  if(!name || !wa){ toast('Isi nama & nomor WhatsApp dulu'); return; }
  if(!window.snap){ toast('Modul pembayaran belum siap, coba lagi sebentar.'); loadMidtransSnap(); return; }
  const refInput = document.getElementById('co-ref').value.trim().toUpperCase();
  const {order} = buildOrderObject(name, wa, refInput, 'midtrans');

  const btn = document.getElementById('midtrans-pay-btn');
  if(btn){ btn.disabled = true; btn.textContent = 'Memproses...'; }
  try{
    const res = await fetch(`${FUNCTIONS_BASE}/midtrans-snap`, {
      method:'POST', headers: functionHeaders(),
      body: JSON.stringify({
        order_id: order.id,
        gross_amount: order.total,
        customer: { first_name: name, phone: wa },
        items: order.items.map(i=>({ id:i.id, price:i.unitPrice, quantity:i.qty, name:i.name })),
      }),
    });
    const data = await res.json();
    if(!res.ok || !data.token) throw new Error(data.error || 'Gagal membuat transaksi Midtrans');

    state.orders.unshift(order);
    persist();
    state.cart=[]; state.cartOpen=false; state.formModal=null; render();

    window.snap.pay(data.token, {
      onSuccess: function(){ toast('Pembayaran berhasil! Pesanan sedang diproses.'); const u=currentUser(); if(u&&u.role==='customer'){ u.totalSpend=(u.totalSpend||0)+order.total; persist(); } },
      onPending: function(){ toast('Menunggu pembayaranmu diselesaikan.'); },
      onError: function(){ toast('Pembayaran gagal, silakan coba lagi atau pakai WhatsApp.'); },
      onClose: function(){ toast('Jendela pembayaran ditutup sebelum selesai.'); },
    });
  }catch(err){
    console.error(err);
    toast('Gagal memproses pembayaran online. Coba metode WhatsApp.');
  }finally{
    if(btn){ btn.disabled=false; btn.textContent='💳 Bayar Online (Kartu/QRIS/VA)'; }
  }
}

/* =====================================================
   AUTH: LOGIN / REGISTER
===================================================== */
function openAuth(tab, presetRole){
  state.authModal = {tab: tab||'login', step:1, role: presetRole||null};
  state.regTemp = {};
  render();
}
function closeAuth(){ state.authModal=null; render(); }
function setAuthTab(tab){ state.authModal = {tab, step:1, role:null}; render(); }

function AuthModal(){
  const a = state.authModal;
  if(!a) return '';
  if(a.tab==='login'){
    return `
    <div class="overlay" onclick="if(event.target===this) closeAuth()">
      <div class="modal">
        <div class="modal-top"><h3>Masuk ke Akun</h3><button class="x-btn" onclick="closeAuth()">✕</button></div>
        <div class="auth-tabs">
          <div class="auth-tab active">Masuk</div>
          <div class="auth-tab" onclick="setAuthTab('register')">Daftar</div>
        </div>
        <form onsubmit="submitLogin(event)">
          <div class="field"><label>Email</label><input required type="email" id="lg-email"></div>
          ${pwField('lg-pass','Kata Sandi')}
          <button class="btn btn-primary btn-block" type="submit">Masuk</button>
        </form>
        <p style="font-size:11.5px;color:var(--text-dimmer);margin-top:16px;">Demo staf: owner@oliv.id / owner123 · admin@oliv.id / admin123 · seller@oliv.id / seller123 · customer@oliv.id / customer123</p>
      </div>
    </div>`;
  }
  // register wizard (2 steps only — no more "set selling price" screen)
  if(a.step===1){
    return `
    <div class="overlay" onclick="if(event.target===this) closeAuth()">
      <div class="modal">
        <div class="modal-top"><h3>Buat Akun Baru</h3><button class="x-btn" onclick="closeAuth()">✕</button></div>
        <div class="auth-tabs">
          <div class="auth-tab" onclick="setAuthTab('login')">Masuk</div>
          <div class="auth-tab active">Daftar</div>
        </div>
        <div class="step-dots"><span class="on"></span><span></span></div>
        <form onsubmit="submitRegStep1(event)">
          <div class="field"><label>Nama Lengkap</label><input required id="rg-name"></div>
          <div class="field"><label>Email</label><input required type="email" id="rg-email"></div>
          ${pwField('rg-pass','Buat Kata Sandi')}
          <button class="btn btn-primary btn-block" type="submit">Lanjut</button>
        </form>
      </div>
    </div>`;
  }
  if(a.step===2){
    return `
    <div class="overlay" onclick="if(event.target===this) closeAuth()">
      <div class="modal">
        <div class="modal-top"><h3>Daftar Sebagai Apa?</h3><button class="x-btn" onclick="closeAuth()">✕</button></div>
        <div class="step-dots"><span class="on"></span><span class="on"></span></div>
        <div class="role-cards">
          <div class="role-card ${a.role==='customer'?'selected':''}" onclick="pickRole('customer')">
            <div class="em">🛍️</div><h4>Customer</h4><p>Belanja langsung & dapat diskon member yang naik tiap transaksi.</p>
          </div>
          <div class="role-card ${a.role==='seller'?'selected':''}" onclick="pickRole('seller')">
            <div class="em">📊</div><h4>Seller</h4><p>Atur harga jualmu sendiri & dapat dashboard komisi seller.</p>
          </div>
        </div>
        <button class="btn btn-primary btn-block" ${a.role?'':'disabled'} onclick="finishRegistration()">Selesai & Buat Akun</button>
      </div>
    </div>`;
  }
  return '';
}
function submitRegStep1(e){
  e.preventDefault();
  state.regTemp.name = document.getElementById('rg-name').value;
  state.regTemp.email = document.getElementById('rg-email').value;
  state.regTemp.password = document.getElementById('rg-pass').value;
  if(state.users.some(u=>u.email.toLowerCase()===state.regTemp.email.toLowerCase())){
    toast('Email sudah terdaftar, coba masuk.'); return;
  }
  state.authModal.step = 2; render();
}
function pickRole(role){ state.authModal.role = role; render(); }
function finishRegistration(){
  const role = state.authModal.role;
  const t = state.regTemp;
  const id = 'u'+Date.now();
  let extra = {};
  if(role==='seller'){
    // default resell price = suggested retail price, no manual "set price" step at signup
    const resellPrices = {};
    state.products.forEach(p=>{ resellPrices[p.id] = p.price; });
    extra = { refCode: t.name.split(' ')[0].toUpperCase()+Math.floor(Math.random()*90+10), resellPrices, packageId:'pkg1', readNotifIds:[] };
  }
  if(role==='customer'){ extra = {totalSpend:0}; }
  const user = { id, name:t.name, email:t.email, password:t.password, role, avatar:'', ...extra };
  state.users.push(user);
  state.currentUser = id;
  persist();
  state.authModal=null;
  toast('Akun berhasil dibuat! Selamat datang, ' + t.name.split(' ')[0]);
  location.hash = role==='seller' ? '#/seller' : '#/akun';
}
function submitLogin(e){
  e.preventDefault();
  const email = document.getElementById('lg-email').value.trim().toLowerCase();
  const pass = document.getElementById('lg-pass').value;
  const u = state.users.find(x=>x.email.toLowerCase()===email && x.password===pass);
  if(!u){ toast('Email atau kata sandi salah'); return; }
  state.currentUser = u.id;
  state.authModal=null;
  toast('Berhasil masuk, halo ' + u.name.split(' ')[0]);
  if(u.role==='admin'||u.role==='owner') location.hash='#/portal/dashboard';
  else if(u.role==='seller') location.hash='#/seller';
  else location.hash='#/akun';
}
function doLogout(){ state.currentUser=null; location.hash='#/beranda'; }

/* =====================================================
   CUSTOMER ACCOUNT PAGES (#/akun, #/akun/pesanan, #/akun/profil, #/akun/keamanan)
===================================================== */
function CustomerSidebar(u, active){
  const items = [
    {icon:'📊', label:'Ringkasan', route:'#/akun'},
    {icon:'🧾', label:'Riwayat Pesanan', route:'#/akun/pesanan'},
    {icon:'👤', label:'Profil Saya', route:'#/akun/profil'},
    {icon:'🔒', label:'Keamanan', route:'#/akun/keamanan'},
  ];
  return `
  <div class="sidebar">
    <div class="brand"><div class="brand-mark" style="width:30px;height:30px;font-size:14px;">🐝</div>Oliv</div>
    <button class="dash-menu-btn" onclick="toggleDashMenu()" aria-label="Menu">⋮</button>
    <div class="sidebar-nav ${state.dashMenuOpen?'open':''}">
      <div class="side-user"><div class="av">${avatarHtml(u)}</div><div><div class="name">${u.name}</div><div class="role">Member</div></div></div>
      <div class="nav-label">Menu</div>
      ${items.map(it=>`<a class="nav-item ${active===it.route?'active':''}" href="${it.route}" onclick="closeDashMenu()"><span class="ic">${it.icon}</span>${it.label}</a>`).join('')}
      <div class="sidebar-foot">
        <a class="nav-item" href="#/beranda" onclick="closeDashMenu()"><span class="ic">🏬</span>Lihat Toko</a>
        <a class="nav-item" onclick="doLogout()"><span class="ic">🚪</span>Keluar</a>
      </div>
    </div>
  </div>`;
}
function pageAkunRingkasan(u){
  const tier = tierFor(u.totalSpend||0);
  const nt = nextTier(u.totalSpend||0);
  const progress = nt ? Math.min(100, Math.round((u.totalSpend/nt.min)*100)) : 100;
  const myOrders = state.orders.filter(o=>o.buyerName===u.name);
  const recentOrders = myOrders.slice(0,5);
  return `
  <div class="pg-head"><div><h1 class="serif">Halo, ${u.name.split(' ')[0]} 👋</h1><p>Kelola akun & pantau diskon membermu di sini.</p></div></div>
  <div class="stat-grid">
    <div class="stat-card"><div class="lbl">Tingkat Member</div><div class="val" style="color:${tier.color}">${tier.name}</div></div>
    <div class="stat-card"><div class="lbl">Diskon Aktif</div><div class="val">${tier.discount}%</div></div>
    <div class="stat-card"><div class="lbl">Total Belanja</div><div class="val">${fmtRp(u.totalSpend||0)}</div></div>
    <div class="stat-card"><div class="lbl">Jumlah Pesanan</div><div class="val">${myOrders.length}</div></div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Progres Menuju Tingkat Berikutnya</h3></div>
    ${nt ? `<p style="font-size:13px;color:var(--text-dim);margin:0 0 4px;">Belanja ${fmtRp(Math.max(nt.min-(u.totalSpend||0),0))} lagi untuk naik ke ${nt.name} (diskon ${nt.discount}%).</p>
    <div class="progress-bar"><div class="fill" style="width:${progress}%"></div></div>` :
    `<p style="font-size:13px;color:var(--leaf);">Kamu sudah di tingkat tertinggi! 🎉</p>`}
    <div class="field-hint" style="margin-top:10px;">Punya kode referral dari seller atau kode diskon? Masukkan saat checkout untuk potongan tambahan.</div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Pesanan Terbaru</h3><a onclick="location.hash='#/akun/pesanan'" style="font-size:12.5px;color:var(--gold-2);font-weight:600;">Lihat semua →</a></div>
    <div class="table-scroll">${ordersTableSimple(recentOrders)}</div>
  </div>`;
}
function pageAkunPesanan(u){
  const myOrders = state.orders.filter(o=>o.buyerName===u.name);
  return `
  <div class="pg-head"><div><h1>Riwayat Pesanan</h1><p>Semua transaksi yang pernah kamu buat.</p></div></div>
  <div class="panel">
    <div class="table-scroll">${ordersTableSimple(myOrders)}</div>
  </div>`;
}
function pageAkunProfil(u){
  return `
  <div class="pg-head"><div><h1>Profil Saya</h1><p>Perbarui foto dan nama akunmu.</p></div></div>
  <div class="panel">
    <div class="avatar-upload">
      <div class="av-big" id="profile-avatar-preview">${avatarHtml(u)}</div>
      <div>
        <div class="file-btn btn btn-soft btn-sm">📷 Ganti Foto Profil<input type="file" accept="image/*" onchange="handleAvatarChange(this)"></div>
        <div class="field-hint" style="margin-top:8px;">Format JPG/PNG, maksimal ±2MB.</div>
      </div>
    </div>
    <div class="field"><label>Nama Lengkap</label><input id="prof-name" value="${u.name}"></div>
    <div class="field"><label>Email</label><input value="${u.email}" disabled style="opacity:.6;"></div>
    <button class="btn btn-primary" onclick="saveProfileName()">Simpan Nama</button>
  </div>`;
}
function pageAkunKeamanan(u){
  return `
  <div class="pg-head"><div><h1>Keamanan</h1><p>Ubah kata sandi akunmu secara berkala.</p></div></div>
  <div class="panel">
    <div class="panel-head"><h3>Ubah Kata Sandi</h3></div>
    <form onsubmit="saveProfilePassword(event)">
      ${pwField('prof-pass-old','Kata Sandi Saat Ini')}
      ${pwField('prof-pass-new','Kata Sandi Baru')}
      <button class="btn btn-primary" type="submit">Simpan Kata Sandi</button>
    </form>
  </div>`;
}
function renderAkunCustomer(){
  const u = currentUser();
  if(!u || u.role!=='customer'){ location.hash='#/beranda'; return ''; }
  let content;
  switch(state.route){
    case '#/akun/pesanan': content = pageAkunPesanan(u); break;
    case '#/akun/profil': content = pageAkunProfil(u); break;
    case '#/akun/keamanan': content = pageAkunKeamanan(u); break;
    default: content = pageAkunRingkasan(u);
  }
  return `<div class="dash-wrap">${CustomerSidebar(u, state.route)}<div class="dash-main">${content}</div></div>${Toast()}`;
}
function ordersTableSimple(orders){
  if(orders.length===0) return `<div class="empty-state"><div class="em">🧾</div>Belum ada pesanan.</div>`;
  return `<div class="table-scroll"><table><thead><tr><th>ID</th><th>Produk</th><th>Total</th><th>Status</th></tr></thead><tbody>
    ${orders.map(o=>`<tr><td>#${o.id}</td><td>${o.items.map(i=>i.name+' x'+i.qty).join(', ')}</td><td>${fmtRp(o.total)}</td><td>${statusBadge(o.status)}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function statusBadge(s){
  if(s==='Selesai') return `<span class="badge badge-green">Selesai</span>`;
  if(s==='Diproses') return `<span class="badge badge-gold">Diproses</span>`;
  return `<span class="badge badge-red">Dibatalkan</span>`;
}

/* =====================================================
   SELLER DASHBOARD (#/seller)
===================================================== */
function commissionForOrderItem(item){ return (item.unitPrice - item.basePrice) * item.qty; }
function ordersForSeller(refCode){ return state.orders.filter(o=>o.refCode===refCode); }

function pageSeller(){
  const u = currentUser();
  if(!u || u.role!=='seller'){ location.hash='#/beranda'; return ''; }
  const myOrders = ordersForSeller(u.refCode);
  const doneOrders = myOrders.filter(o=>o.status==='Selesai');
  const doneComm = doneOrders.reduce((a,o)=>a+o.items.reduce((s,i)=>s+commissionForOrderItem(i),0),0);
  const pendComm = myOrders.filter(o=>o.status==='Diproses').reduce((a,o)=>a+o.items.reduce((s,i)=>s+commissionForOrderItem(i),0),0);
  const withdrawn = state.withdrawals.filter(w=>w.sellerId===u.id && w.status==='Disetujui').reduce((a,w)=>a+w.amount,0);
  // per-product breakdown
  const perProduct = {};
  myOrders.forEach(o=>o.items.forEach(i=>{
    perProduct[i.id] = perProduct[i.id] || {name:i.name, qty:0, comm:0};
    perProduct[i.id].qty += i.qty; perProduct[i.id].comm += commissionForOrderItem(i);
  }));
  const rows = Object.values(perProduct).sort((a,b)=>b.comm-a.comm);
  const maxComm = Math.max(1, ...rows.map(r=>r.comm));
  const bestProduct = rows[0] ? rows[0].name : '—';

  // leaderboard among all sellers by completed commission
  const sellers = state.users.filter(x=>x.role==='seller');
  const leaderboard = sellers.map(s=>{
    const os = ordersForSeller(s.refCode).filter(o=>o.status==='Selesai');
    const comm = os.reduce((a,o)=>a+o.items.reduce((x,i)=>x+commissionForOrderItem(i),0),0);
    return {id:s.id, name:s.name, comm};
  }).sort((a,b)=>b.comm-a.comm);
  const myRank = leaderboard.findIndex(l=>l.id===u.id)+1;

  const pkg = packageFor(u.packageId);
  const unreadNotif = (state.notifications||[]).filter(n=>!(u.readNotifIds||[]).includes(n.id)).length;

  // simple weekly trend from order dates (last 7 distinct dates present in this seller's orders, fallback demo values)
  const trendMap = {};
  myOrders.forEach(o=>{ trendMap[o.date] = (trendMap[o.date]||0) + o.items.reduce((s,i)=>s+commissionForOrderItem(i),0); });
  const trendDates = Object.keys(trendMap).sort().slice(-6);
  const trendMax = Math.max(1, ...trendDates.map(d=>trendMap[d]));

  return `
  <div class="dash-wrap">
    ${SellerSidebar(u,'#/seller', unreadNotif)}
    <div class="dash-main">
      <div class="pg-head"><div><h1>Dashboard Seller</h1><p>Statistik komisi dan performa penjualan dari link referralmu.</p></div>
        <span class="badge badge-gold">Paket: ${pkg.name}</span></div>
      <div class="stat-grid">
        <div class="stat-card"><div class="lbl">Komisi Cair</div><div class="val">${fmtRp(doneComm)}</div></div>
        <div class="stat-card"><div class="lbl">Komisi Pending</div><div class="val">${fmtRp(pendComm)}</div></div>
        <div class="stat-card"><div class="lbl">Total Order</div><div class="val">${myOrders.length}</div></div>
        <div class="stat-card"><div class="lbl">Sudah Ditarik</div><div class="val">${fmtRp(withdrawn)}</div><div class="sub">Peringkat #${myRank||'-'} dari ${leaderboard.length} seller</div></div>
      </div>
      <div class="ref-box">
        <div><div style="font-size:12.5px;color:var(--text-dim);margin-bottom:6px;">Kode & Link Referral Kamu</div><div class="ref-code">${u.refCode}</div></div>
        <button class="btn btn-soft" onclick="copyReferralLink('${u.refCode}')">Salin Link Referral</button>
      </div>
      <div class="panel-grid2">
        <div class="panel">
          <div class="panel-head"><h3>Statistik Komisi per Produk</h3></div>
          ${rows.length===0?`<div class="empty-state"><div class="em">📊</div>Belum ada penjualan.</div>`:
          rows.map(r=>`
            <div class="bar-row">
              <div class="lb"><span>${r.name} · ${r.qty} terjual</span><b>${fmtRp(r.comm)}</b></div>
              <div class="progress-bar"><div class="fill" style="width:${Math.round(r.comm/maxComm*100)}%"></div></div>
            </div>`).join('')}
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Tren Komisi Terbaru</h3></div>
          ${trendDates.length===0?`<div class="empty-state"><div class="em">📈</div>Belum ada data tren.</div>`:
          trendDates.map(d=>`
            <div class="bar-row">
              <div class="lb"><span>${d}</span><b>${fmtRp(trendMap[d])}</b></div>
              <div class="progress-bar"><div class="fill" style="width:${Math.round(trendMap[d]/trendMax*100)}%"></div></div>
            </div>`).join('')}
        </div>
      </div>
      <div class="panel-grid2">
        <div class="panel">
          <div class="panel-head"><h3>🏆 Papan Peringkat Seller</h3></div>
          ${leaderboard.length===0?`<div class="empty-state"><div class="em">🏆</div>Belum ada data.</div>`:
          leaderboard.slice(0,5).map((l,i)=>`
            <div class="leader-row">
              <div class="leader-rank ${i===0?'top':''}">${i+1}</div>
              <div class="nm">${l.name}${l.id===u.id?' (Kamu)':''}</div>
              <div class="v">${fmtRp(l.comm)}</div>
            </div>`).join('')}
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Ringkasan Cepat</h3></div>
          <div class="fake-stat"><div class="l">Produk terlaris kamu</div><div class="v">${bestProduct}</div></div>
          <div class="fake-stat"><div class="l">Paket seller aktif</div><div class="v">${pkg.name}</div></div>
          <div class="fake-stat"><div class="l">Pemberitahuan belum dibaca</div><div class="v">${unreadNotif}</div></div>
          <div class="fake-stat"><div class="l">Order menunggu diproses</div><div class="v">${myOrders.filter(o=>o.status==='Diproses').length}</div></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Riwayat Order dari Referralmu</h3></div>
        ${ordersTableSimple(myOrders)}
      </div>
    </div>
  </div>`;
}
function pageSellerHarga(){
  const u = currentUser();
  if(!u || u.role!=='seller'){ location.hash='#/beranda'; return ''; }
  return `
  <div class="dash-wrap">
    ${SellerSidebar(u,'#/seller/harga')}
    <div class="dash-main">
      <div class="pg-head"><div><h1>Atur Harga Jual</h1><p>Tentukan harga jualmu sendiri untuk tiap produk. Selisih dari harga modal adalah komisimu.</p></div></div>
      <div class="panel">
        ${state.products.length===0?`<div class="empty-state"><div class="em">🍯</div>Belum ada produk yang bisa diatur harganya.</div>`:
        state.products.map(p=>`
          <div class="reseller-price-row">
            <div class="nm">${p.name}<div class="modal-p">Harga modal ${fmtRp(p.basePrice)} · Harga retail resmi ${fmtRp(p.price)}</div></div>
            <input type="number" min="${p.basePrice}" id="edit-rp-${p.id}" value="${(u.resellPrices&&u.resellPrices[p.id])||p.price}">
          </div>`).join('')}
        <button class="btn btn-primary" style="margin-top:18px;" onclick="saveResellPrices()">Simpan Harga Jual</button>
      </div>
    </div>
  </div>`;
}
function saveResellPrices(){
  const u = currentUser();
  u.resellPrices = u.resellPrices || {};
  state.products.forEach(p=>{ u.resellPrices[p.id] = Number(document.getElementById('edit-rp-'+p.id).value) || p.basePrice; });
  persist(); toast('Harga jual disimpan'); render();
}
function pageSellerPenarikan(){
  const u = currentUser();
  const list = state.withdrawals.filter(w=>w.sellerId===u.id);
  const myOrders = ordersForSeller(u.refCode);
  const available = myOrders.filter(o=>o.status==='Selesai').reduce((a,o)=>a+o.items.reduce((s,i)=>s+commissionForOrderItem(i),0),0)
    - state.withdrawals.filter(w=>w.sellerId===u.id && w.status!=='Ditolak').reduce((a,w)=>a+w.amount,0);
  return `
  <div class="dash-wrap">
    ${SellerSidebar(u,'#/seller/penarikan')}
    <div class="dash-main">
      <div class="pg-head">
        <div><h1>Penarikan Dana</h1><p>Ajukan pencairan komisi ke rekeningmu.</p></div>
        <button class="btn btn-primary" onclick="openWithdrawForm()">+ Ajukan Penarikan</button>
      </div>
      <div class="stat-card" style="max-width:260px;margin-bottom:22px;"><div class="lbl">Saldo Bisa Ditarik</div><div class="val">${fmtRp(Math.max(available,0))}</div></div>
      <div class="panel">
        <div class="table-scroll"><table><thead><tr><th>Jumlah</th><th>Metode</th><th>Tanggal</th><th>Status</th></tr></thead><tbody>
        ${list.length===0?`<tr><td colspan="4"><div class="empty-state"><div class="em">💳</div>Belum ada permintaan.</div></td></tr>`:
        list.map(w=>`<tr><td>${fmtRp(w.amount)}</td><td>${w.method}</td><td>${w.date}</td><td>${w.status==='Disetujui'?'<span class="badge badge-green">Disetujui</span>':w.status==='Ditolak'?'<span class="badge badge-red">Ditolak</span>':'<span class="badge badge-gold">Menunggu</span>'}</td></tr>`).join('')}
        </tbody></table></div>
      </div>
    </div>
  </div>`;
}
function pageSellerPaket(){
  const u = currentUser();
  if(!u || u.role!=='seller'){ location.hash='#/beranda'; return ''; }
  const packages = state.settings.packages || SEED_PACKAGES;
  return `
  <div class="dash-wrap">
    ${SellerSidebar(u,'#/seller/paket')}
    <div class="dash-main">
      <div class="pg-head"><div><h1>Paket Produk Seller</h1><p>Pilih paket penjualan yang sesuai dengan target bisnismu. Kamu bisa berganti paket kapan saja.</p></div></div>
      <div class="pkg-grid">
        ${packages.map(pk=>`
          <div class="pkg-card ${u.packageId===pk.id?'active':''}">
            ${u.packageId===pk.id?`<span class="pkg-current-tag">Paket Aktif</span>`:''}
            <h4>${pk.name}</h4>
            <div class="pkg-price">${pk.price>0?fmtRp(pk.price):'Gratis'}${pk.price>0?'<small> /sekali daftar</small>':''}</div>
            <div class="pkg-desc">${pk.desc}</div>
            <ul class="pkg-benefits">${pk.benefits.map(b=>`<li>${b}</li>`).join('')}</ul>
            <button class="btn ${u.packageId===pk.id?'btn-ghost':'btn-primary'} btn-block" ${u.packageId===pk.id?'disabled':''} onclick="chooseSellerPackage('${pk.id}')">${u.packageId===pk.id?'Sedang Dipakai':'Pilih Paket Ini'}</button>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}
function chooseSellerPackage(pkgId){
  const u = currentUser();
  u.packageId = pkgId;
  persist(); render();
  toast('Paket seller diperbarui ke ' + packageFor(pkgId).name);
}
function pageSellerNotif(){
  const u = currentUser();
  if(!u || u.role!=='seller'){ location.hash='#/beranda'; return ''; }
  const list = [...(state.notifications||[])].sort((a,b)=> b.date.localeCompare(a.date));
  return `
  <div class="dash-wrap">
    ${SellerSidebar(u,'#/seller/pemberitahuan')}
    <div class="dash-main">
      <div class="pg-head">
        <div><h1>Pemberitahuan</h1><p>Info & pembaruan terbaru dari admin/owner ${SITE_NAME}.</p></div>
        ${list.length>0?`<button class="btn btn-ghost btn-sm" onclick="markAllNotifRead()">Tandai Semua Dibaca</button>`:''}
      </div>
      <div class="panel">
        ${list.length===0?`<div class="empty-state"><div class="em">🔔</div>Belum ada pemberitahuan.</div>`:
        list.map(n=>{
          const read = (u.readNotifIds||[]).includes(n.id);
          return `<div class="notif-item ${read?'read':''}">
            <div class="dot"></div>
            <div><h4>${n.title}</h4><p>${n.message}</p><div class="meta">${n.date} · dari ${n.from||'Tim '+SITE_NAME}</div></div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}
function markAllNotifRead(){
  const u = currentUser();
  u.readNotifIds = (state.notifications||[]).map(n=>n.id);
  persist(); render();
}
function pageSellerProfil(){
  const u = currentUser();
  if(!u) { location.hash='#/beranda'; return ''; }
  return `
  <div class="dash-wrap">
    ${SellerSidebar(u,'#/seller/profil')}
    <div class="dash-main">
      <div class="pg-head"><div><h1>Profil Saya</h1><p>Ubah nama, kata sandi, dan foto profilmu.</p></div></div>
      <div class="panel">
        <div class="avatar-upload">
          <div class="av-big" id="profile-avatar-preview">${avatarHtml(u)}</div>
          <div>
            <div class="file-btn btn btn-soft btn-sm">📷 Ganti Foto Profil<input type="file" accept="image/*" onchange="handleAvatarChange(this)"></div>
            <div class="field-hint" style="margin-top:8px;">Format JPG/PNG, maksimal ±2MB.</div>
          </div>
        </div>
        <div class="field"><label>Nama Lengkap</label><input id="prof-name" value="${u.name}"></div>
        <div class="field"><label>Email</label><input value="${u.email}" disabled style="opacity:.6;"></div>
        <button class="btn btn-primary" onclick="saveProfileName()">Simpan Nama</button>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Ubah Kata Sandi</h3></div>
        <form onsubmit="saveProfilePassword(event)">
          ${pwField('prof-pass-old','Kata Sandi Saat Ini')}
          ${pwField('prof-pass-new','Kata Sandi Baru')}
          <button class="btn btn-primary" type="submit">Simpan Kata Sandi</button>
        </form>
      </div>
    </div>
  </div>`;
}
function handleAvatarChange(inputEl){
  readImageInput(inputEl, (dataUrl)=>{
    const u = currentUser();
    u.avatar = dataUrl;
    persist(); render(); toast('Foto profil diperbarui');
  });
}
function saveProfileName(){
  const u = currentUser();
  const name = document.getElementById('prof-name').value.trim();
  if(!name){ toast('Nama tidak boleh kosong'); return; }
  u.name = name; persist(); render(); toast('Nama disimpan');
}
function saveProfilePassword(e){
  e.preventDefault();
  const u = currentUser();
  const oldPass = document.getElementById('prof-pass-old').value;
  const newPass = document.getElementById('prof-pass-new').value;
  if(oldPass !== u.password){ toast('Kata sandi saat ini salah'); return; }
  u.password = newPass; persist(); render(); toast('Kata sandi berhasil diperbarui');
}
function SellerSidebar(u, active, unreadNotif){
  if(unreadNotif===undefined){
    unreadNotif = (state.notifications||[]).filter(n=>!(u.readNotifIds||[]).includes(n.id)).length;
  }
  const items = [
    {icon:'📊', label:'Dashboard', route:'#/seller'},
    {icon:'💲', label:'Atur Harga Jual', route:'#/seller/harga'},
    {icon:'📦', label:'Paket Produk', route:'#/seller/paket'},
    {icon:'🔔', label:'Pemberitahuan', route:'#/seller/pemberitahuan', badge:unreadNotif},
    {icon:'👤', label:'Profil Saya', route:'#/seller/profil'},
    {icon:'💳', label:'Penarikan Dana', route:'#/seller/penarikan'},
  ];
  return `
  <div class="sidebar">
    <div class="brand"><div class="brand-mark" style="width:30px;height:30px;font-size:14px;">🐝</div>Oliv</div>
    <button class="dash-menu-btn" onclick="toggleDashMenu()" aria-label="Menu">⋮</button>
    <div class="sidebar-nav ${state.dashMenuOpen?'open':''}">
      <div class="side-user"><div class="av">${avatarHtml(u)}</div><div><div class="name">${u.name}</div><div class="role">Seller</div></div></div>
      <div class="nav-label">Menu</div>
      ${items.map(it=>`<a class="nav-item ${active===it.route?'active':''}" href="${it.route}" onclick="closeDashMenu()"><span class="ic">${it.icon}</span>${it.label}${it.badge?`<span class="nav-badge">${it.badge}</span>`:''}</a>`).join('')}
      <div class="sidebar-foot">
        <a class="nav-item" href="#/beranda" onclick="closeDashMenu()"><span class="ic">🏬</span>Lihat Toko</a>
        <a class="nav-item" onclick="doLogout()"><span class="ic">🚪</span>Keluar</a>
      </div>
    </div>
  </div>`;
}

/* =====================================================
   ADMIN/OWNER PORTAL
===================================================== */
function navItemsStaff(){
  return [
    {icon:'📊', label:'Dashboard', route:'#/portal/dashboard'},
    {icon:'🍯', label:'Produk', route:'#/portal/produk'},
    {icon:'🧾', label:'Pesanan', route:'#/portal/pesanan'},
    {icon:'👥', label:'Pengguna', route:'#/portal/pengguna'},
    {icon:'🤝', label:'Seller', route:'#/portal/seller'},
    {icon:'🎁', label:'Paket Seller', route:'#/portal/paket'},
    {icon:'🔔', label:'Pemberitahuan', route:'#/portal/pemberitahuan'},
    {icon:'📣', label:'Pengumuman', route:'#/portal/pengumuman'},
    {icon:'💰', label:'Keuangan', route:'#/portal/keuangan'},
    {icon:'💳', label:'Penarikan Dana', route:'#/portal/penarikan'},
    {icon:'⚙️', label:'Pengaturan', route:'#/portal/pengaturan'},
  ];
}
function StaffSidebar(u){
  const items = navItemsStaff();
  return `
  <div class="sidebar">
    <div class="brand"><div class="brand-mark" style="width:30px;height:30px;font-size:14px;">🐝</div>Oliv</div>
    <button class="dash-menu-btn" onclick="toggleDashMenu()" aria-label="Menu">⋮</button>
    <div class="sidebar-nav ${state.dashMenuOpen?'open':''}">
      <div class="side-user"><div class="av">${avatarHtml(u)}</div><div><div class="name">${u.name}</div><div class="role">${u.role}</div></div></div>
      <div class="nav-label">Menu</div>
      ${items.map(it=>`<a class="nav-item ${state.route===it.route?'active':''}" href="${it.route}" onclick="closeDashMenu()"><span class="ic">${it.icon}</span>${it.label}</a>`).join('')}
      <div class="sidebar-foot">
        <a class="nav-item" href="#/beranda" onclick="closeDashMenu()"><span class="ic">🏬</span>Lihat Toko</a>
        <a class="nav-item" onclick="doLogout()"><span class="ic">🚪</span>Keluar</a>
      </div>
    </div>
  </div>`;
}
function pageStaffDashboard(){
  const doneOrders = state.orders.filter(o=>o.status==='Selesai');
  const revenue = doneOrders.reduce((a,o)=>a+o.total,0);
  const commission = doneOrders.reduce((a,o)=>a+o.items.reduce((s,i)=>s+ (o.refCode? commissionForOrderItem(i):0),0),0);
  const sellers = state.users.filter(u=>u.role==='seller');
  const customers = state.users.filter(u=>u.role==='customer');
  const pendingOrders = state.orders.filter(o=>o.status==='Diproses').length;
  const pendingWithdraw = state.withdrawals.filter(w=>w.status==='Menunggu').length;

  // top products by qty sold (Selesai)
  const perProduct = {};
  doneOrders.forEach(o=>o.items.forEach(i=>{
    perProduct[i.id] = perProduct[i.id] || {name:i.name, qty:0, revenue:0};
    perProduct[i.id].qty += i.qty; perProduct[i.id].revenue += i.unitPrice*i.qty;
  }));
  const topProducts = Object.values(perProduct).sort((a,b)=>b.qty-a.qty).slice(0,5);
  const maxQty = Math.max(1, ...topProducts.map(p=>p.qty));

  // seller leaderboard
  const leaderboard = sellers.map(s=>{
    const os = ordersForSeller(s.refCode).filter(o=>o.status==='Selesai');
    const comm = os.reduce((a,o)=>a+o.items.reduce((x,i)=>x+commissionForOrderItem(i),0),0);
    return {name:s.name, comm, orders:os.length};
  }).sort((a,b)=>b.comm-a.comm).slice(0,5);

  return `
  <div class="pg-head"><div><h1>Dashboard</h1><p>Ringkasan performa toko ${SITE_NAME}.</p></div></div>
  <div class="stat-grid">
    <div class="stat-card"><div class="lbl">Total Pesanan</div><div class="val">${state.orders.length}</div><div class="sub">${pendingOrders} sedang diproses</div></div>
    <div class="stat-card"><div class="lbl">Pendapatan (Selesai)</div><div class="val">${fmtRp(revenue)}</div></div>
    <div class="stat-card"><div class="lbl">Komisi Seller</div><div class="val">${fmtRp(commission)}</div><div class="sub">${pendingWithdraw} penarikan menunggu</div></div>
    <div class="stat-card"><div class="lbl">Seller / Customer</div><div class="val">${sellers.length} / ${customers.length}</div></div>
  </div>
  <div class="panel-grid2">
    <div class="panel">
      <div class="panel-head"><h3>Produk Terlaris</h3></div>
      ${topProducts.length===0?`<div class="empty-state"><div class="em">📦</div>Belum ada data penjualan.</div>`:
      topProducts.map(p=>`
        <div class="bar-row">
          <div class="lb"><span>${p.name} · ${p.qty} terjual</span><b>${fmtRp(p.revenue)}</b></div>
          <div class="progress-bar"><div class="fill" style="width:${Math.round(p.qty/maxQty*100)}%"></div></div>
        </div>`).join('')}
    </div>
    <div class="panel">
      <div class="panel-head"><h3>🏆 Top Seller</h3></div>
      ${leaderboard.length===0?`<div class="empty-state"><div class="em">🏆</div>Belum ada data.</div>`:
      leaderboard.map((l,i)=>`
        <div class="leader-row">
          <div class="leader-rank ${i===0?'top':''}">${i+1}</div>
          <div class="nm">${l.name}</div>
          <div class="v">${fmtRp(l.comm)}</div>
        </div>`).join('')}
    </div>
  </div>
  <div class="panel"><div class="panel-head"><h3>Pesanan Terbaru</h3></div>${ordersTableStaff(state.orders.slice(0,6))}</div>`;
}
function ordersTableStaff(orders){
  if(orders.length===0) return `<div class="empty-state"><div class="em">🧾</div>Belum ada pesanan.</div>`;
  return `<div class="table-scroll"><table><thead><tr><th>ID</th><th>Pembeli</th><th>Produk</th><th>Total</th><th>Referral</th><th>Status</th><th></th></tr></thead><tbody>
    ${orders.map(o=>`<tr>
      <td>#${o.id}</td><td>${o.buyerName}</td><td>${o.items.map(i=>i.name+' x'+i.qty).join(', ')}</td><td>${fmtRp(o.total)}</td>
      <td>${o.refCode?`<span class="badge badge-copper">${o.refCode}</span>`:'<span class="badge badge-grey">—</span>'}</td>
      <td>${statusBadge(o.status)}</td>
      <td class="row-actions">
        <select onchange="updateOrderStatus('${o.id}',this.value)" style="background:var(--card);border:1px solid var(--border-strong);color:var(--text);border-radius:8px;padding:6px 8px;font-size:12.5px;">
          ${['Diproses','Selesai','Dibatalkan'].map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
        <button class="icon-btn danger" title="Hapus pesanan" onclick="deleteOrder('${o.id}')">🗑</button>
      </td>
    </tr>`).join('')}
  </tbody></table></div>`;
}
function updateOrderStatus(id,status){ state.orders.find(o=>o.id===id).status=status; persist(); render(); }
function deleteOrder(id){
  if(!confirm('Hapus pesanan #'+id+'? Tindakan ini tidak bisa dibatalkan.')) return;
  state.orders = state.orders.filter(o=>o.id!==id);
  persist(); render(); toast('Pesanan dihapus');
}

function pageStaffProduk(){
  return `
  <div class="pg-head"><div><h1>Produk</h1><p>Kelola katalog produk, gambar, & harga modal untuk perhitungan komisi seller.</p></div>
    <button class="btn btn-primary" onclick="openProductForm()">+ Tambah Produk</button></div>
  <div class="panel">${state.products.length===0?`<div class="empty-state"><div class="em">🍯</div>Belum ada produk. Klik "+ Tambah Produk" untuk membuat produk pertamamu.</div>`:`<div class="table-scroll"><table><thead><tr><th>Produk</th><th>Harga Modal</th><th>Harga Retail</th><th>Tag</th><th></th></tr></thead><tbody>
    ${state.products.map(p=>`<tr>
      <td style="display:flex;align-items:center;gap:10px;"><span style="width:32px;height:32px;border-radius:8px;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;background:var(--card);flex-shrink:0;">${p.image?`<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;">`:p.icon}</span><b>${p.name}</b></td>
      <td>${fmtRp(p.basePrice)}</td><td>${fmtRp(p.price)}</td><td><span class="badge badge-gold">${p.tag}</span></td>
      <td class="row-actions"><button class="icon-btn" onclick="openProductForm('${p.id}')">✎</button><button class="icon-btn danger" onclick="deleteProduct('${p.id}')">🗑</button></td>
    </tr>`).join('')}
  </tbody></table></div>`}</div>`;
}
function openProductForm(id){ state.formModal={type:'product', id:id||null, imageData:null}; render(); }
function deleteProduct(id){
  if(!confirm('Hapus produk ini dari katalog?')) return;
  state.products = state.products.filter(p=>p.id!==id); persist(); render(); toast('Produk dihapus');
}
function handleProductImageChange(inputEl){
  readImageInput(inputEl, (dataUrl)=>{
    state.formModal.imageData = dataUrl;
    render();
  });
}
function submitProductForm(e){
  e.preventDefault();
  const id = state.formModal.id;
  const existing = id ? state.products.find(p=>p.id===id) : null;
  const data = {
    name: document.getElementById('pf-name').value,
    tag: document.getElementById('pf-tag').value,
    desc: document.getElementById('pf-desc').value,
    basePrice: Number(document.getElementById('pf-base').value),
    price: Number(document.getElementById('pf-price').value),
    image: state.formModal.imageData !== null ? state.formModal.imageData : (existing?existing.image:''),
  };
  if(id){ Object.assign(existing, data); }
  else { const icons=['💧','💊','🌿','✨','🍯']; state.products.push({id:'p'+Date.now(), icon:icons[state.products.length%icons.length], ...data}); }
  persist(); state.formModal=null; render(); toast('Produk disimpan');
}

function pageStaffPesanan(){
  return `<div class="pg-head"><div><h1>Pesanan</h1><p>Semua pesanan dari toko & link seller. Admin/owner bisa menghapus pesanan yang keliru.</p></div></div>
  <div class="panel">${ordersTableStaff(state.orders)}</div>`;
}

function pageStaffPengguna(){
  return `
  <div class="pg-head"><div><h1>Pengguna</h1><p>Kelola akun staf, seller, dan customer.</p></div>
    <button class="btn btn-primary" onclick="openUserForm()">+ Tambah Pengguna</button></div>
  <div class="panel"><div class="table-scroll"><table><thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Info</th><th></th></tr></thead><tbody>
    ${state.users.map(u=>`<tr>
      <td><b>${u.name}</b></td><td>${u.email}</td>
      <td><span class="badge ${u.role==='owner'?'badge-gold':u.role==='admin'?'badge-copper':u.role==='seller'?'badge-green':'badge-grey'}">${u.role}</span></td>
      <td>${u.role==='seller'?'Kode: '+u.refCode:u.role==='customer'?fmtRp(u.totalSpend||0)+' belanja':'—'}</td>
      <td class="row-actions"><button class="icon-btn" onclick="openUserForm('${u.id}')">✎</button><button class="icon-btn danger" onclick="deleteUser('${u.id}')">🗑</button></td>
    </tr>`).join('')}
  </tbody></table></div></div>`;
}
function openUserForm(id){ state.formModal={type:'user', id:id||null}; render(); }
function deleteUser(id){ if(id===state.currentUser){toast('Tidak bisa menghapus akun sendiri');return;} state.users=state.users.filter(u=>u.id!==id); persist(); render(); toast('Pengguna dihapus'); }
function submitUserForm(e){
  e.preventDefault();
  const id = state.formModal.id;
  const role = document.getElementById('uf-role').value;
  const data = { name:document.getElementById('uf-name').value, email:document.getElementById('uf-email').value, role };
  if(role==='seller'){ data.refCode = document.getElementById('uf-ref').value.toUpperCase() || 'REF'+Math.floor(Math.random()*900+100); data.resellPrices = data.resellPrices || {}; data.packageId = data.packageId || 'pkg1'; data.readNotifIds = data.readNotifIds || []; }
  if(role==='customer'){ data.totalSpend = 0; }
  if(id){ Object.assign(state.users.find(u=>u.id===id), data); }
  else { state.users.push({id:'u'+Date.now(), password:'ganti123', avatar:'', ...data}); }
  persist(); state.formModal=null; render(); toast('Pengguna disimpan');
}

function pageStaffSeller(){
  const sellers = state.users.filter(u=>u.role==='seller');
  return `
  <div class="pg-head"><div><h1>Seller</h1><p>Overview harga jual & performa tiap seller. Kode referral seller bisa diubah langsung di sini.</p></div></div>
  <div class="panel"><div class="table-scroll"><table><thead><tr><th>Seller</th><th>Kode Referral</th><th>Paket</th><th>Order</th><th>Total Komisi</th><th></th></tr></thead><tbody>
    ${sellers.map(s=>{
      const os = ordersForSeller(s.refCode);
      const comm = os.filter(o=>o.status==='Selesai').reduce((a,o)=>a+o.items.reduce((x,i)=>x+commissionForOrderItem(i),0),0);
      return `<tr><td><b>${s.name}</b></td>
        <td><div style="display:flex;gap:6px;align-items:center;">
          <input id="ref-inp-${s.id}" value="${s.refCode}" style="width:120px;background:var(--card);border:1px solid var(--border-strong);color:var(--text);padding:7px 9px;border-radius:8px;font-size:12.5px;text-transform:uppercase;">
          <button class="icon-btn" onclick="updateSellerRefCode('${s.id}')" title="Simpan kode referral">💾</button>
        </div></td>
        <td><span class="badge badge-gold">${packageFor(s.packageId).name}</span></td><td>${os.length}</td><td>${fmtRp(comm)}</td>
        <td><button class="icon-btn" onclick="openUserForm('${s.id}')" title="Edit lengkap">✎</button></td></tr>`;
    }).join('')}
  </tbody></table></div></div>`;
}
function updateSellerRefCode(id){
  const inp = document.getElementById('ref-inp-'+id);
  if(!inp) return;
  const val = inp.value.trim().toUpperCase().replace(/\s+/g,'');
  if(!val){ toast('Kode referral tidak boleh kosong'); return; }
  const dupUser = state.users.find(u=>u.role==='seller' && u.refCode===val && u.id!==id);
  if(dupUser){ toast('Kode referral sudah dipakai seller lain'); return; }
  const dupCode = (state.settings.referralCodes||[]).find(c=>c.code===val);
  if(dupCode){ toast('Kode ini sudah dipakai sebagai kode diskon'); return; }
  const seller = state.users.find(u=>u.id===id);
  const oldCode = seller.refCode;
  seller.refCode = val;
  state.orders.forEach(o=>{ if(o.refCode===oldCode) o.refCode = val; });
  persist(); render(); toast('Kode referral '+seller.name+' diperbarui menjadi '+val);
}

function pageStaffPaket(){
  const packages = state.settings.packages || SEED_PACKAGES;
  return `
  <div class="pg-head"><div><h1>Paket Seller</h1><p>Kelola paket penjualan yang bisa dipilih oleh seller.</p></div>
    <button class="btn btn-primary" onclick="openPackageForm()">+ Tambah Paket</button></div>
  <div class="pkg-grid">
    ${packages.map(pk=>`
      <div class="pkg-card">
        <h4>${pk.name}</h4>
        <div class="pkg-price">${pk.price>0?fmtRp(pk.price):'Gratis'}</div>
        <div class="pkg-desc">${pk.desc}</div>
        <ul class="pkg-benefits">${pk.benefits.map(b=>`<li>${b}</li>`).join('')}</ul>
        <div class="row-actions">
          <button class="icon-btn" style="flex:1;" onclick="openPackageForm('${pk.id}')">✎ Edit</button>
          <button class="icon-btn danger" onclick="deletePackage('${pk.id}')">🗑 Hapus</button>
        </div>
      </div>`).join('')}
  </div>`;
}
function openPackageForm(id){ state.formModal={type:'package', id:id||null}; render(); }
function deletePackage(id){
  if((state.settings.packages||[]).length<=1){ toast('Minimal harus ada 1 paket'); return; }
  if(!confirm('Hapus paket ini?')) return;
  state.settings.packages = state.settings.packages.filter(p=>p.id!==id);
  state.users.forEach(u=>{ if(u.role==='seller' && u.packageId===id) u.packageId = state.settings.packages[0].id; });
  persist(); render(); toast('Paket dihapus');
}
function submitPackageForm(e){
  e.preventDefault();
  const id = state.formModal.id;
  const data = {
    name: document.getElementById('pkf-name').value,
    price: Number(document.getElementById('pkf-price').value)||0,
    desc: document.getElementById('pkf-desc').value,
    benefits: document.getElementById('pkf-benefits').value.split('\n').map(s=>s.trim()).filter(Boolean),
  };
  if(!state.settings.packages) state.settings.packages = [];
  if(id){ Object.assign(state.settings.packages.find(p=>p.id===id), data); }
  else { state.settings.packages.push({id:'pkg'+Date.now(), ...data}); }
  persist(); state.formModal=null; render(); toast('Paket disimpan');
}

function pageStaffPemberitahuan(){
  const list = [...(state.notifications||[])].sort((a,b)=>b.date.localeCompare(a.date));
  return `
  <div class="pg-head"><div><h1>Pemberitahuan Seller</h1><p>Kirim info, pembaruan, atau pengumuman khusus untuk semua seller.</p></div>
    <button class="btn btn-primary" onclick="openNotifForm()">+ Kirim Pemberitahuan</button></div>
  <div class="panel">
    ${list.length===0?`<div class="empty-state"><div class="em">🔔</div>Belum ada pemberitahuan terkirim.</div>`:
    list.map(n=>`<div class="notif-item">
      <div class="dot"></div>
      <div style="flex:1;"><h4>${n.title}</h4><p>${n.message}</p><div class="meta">${n.date} · dari ${n.from}</div></div>
      <button class="icon-btn danger" title="Hapus" onclick="deleteNotif('${n.id}')">🗑</button>
    </div>`).join('')}
  </div>`;
}
function openNotifForm(){ state.formModal={type:'notif'}; render(); }
function deleteNotif(id){
  state.notifications = state.notifications.filter(n=>n.id!==id);
  persist(); render(); toast('Pemberitahuan dihapus');
}
function submitNotifForm(e){
  e.preventDefault();
  const u = currentUser();
  const n = {
    id:'n'+Date.now(),
    title: document.getElementById('nf-title').value,
    message: document.getElementById('nf-message').value,
    date: new Date().toISOString().slice(0,10),
    from: u.name,
  };
  state.notifications.unshift(n);
  persist(); state.formModal=null; render(); toast('Pemberitahuan terkirim ke semua seller');
}

function pageStaffPengumuman(){
  const a = state.announcement || {active:false,title:'',message:''};
  return `
  <div class="pg-head"><div><h1>Pengumuman</h1><p>Pengumuman ini akan tampil sebagai banner di halaman utama untuk semua pengunjung.</p></div></div>
  <div class="panel">
    <form onsubmit="saveAnnouncement(event)">
      <div class="field"><label>Judul Pengumuman</label><input id="an-title" required value="${a.title||''}"></div>
      <div class="field"><label>Isi Pengumuman</label><textarea id="an-message" required>${a.message||''}</textarea></div>
      <div class="field" style="display:flex;align-items:center;gap:10px;">
        <input type="checkbox" id="an-active" ${a.active?'checked':''} style="width:auto;">
        <label style="margin:0;">Tampilkan pengumuman di halaman utama</label>
      </div>
      <button class="btn btn-primary" type="submit">Simpan Pengumuman</button>
    </form>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Pratinjau</h3></div>
    ${a.active? `<div class="announce-bar" style="border-radius:var(--radius-md);"><div class="announce-inner" style="padding:0 4px;">📣 <span><b>${a.title||'Judul'}</b> — ${a.message||'Isi pengumuman'}</span></div></div>` : `<p style="font-size:13px;color:var(--text-dimmer);">Pengumuman sedang tidak ditampilkan.</p>`}
  </div>`;
}
function saveAnnouncement(e){
  e.preventDefault();
  state.announcement = {
    active: document.getElementById('an-active').checked,
    title: document.getElementById('an-title').value,
    message: document.getElementById('an-message').value,
    date: new Date().toISOString().slice(0,10),
  };
  state.announceDismissed = false;
  persist(); render(); toast('Pengumuman disimpan');
}

function pageStaffKeuangan(){
  const doneOrders = state.orders.filter(o=>o.status==='Selesai');
  const pendingOrders = state.orders.filter(o=>o.status==='Diproses');

  let grossSales = 0, modalTerjual = 0, komisiTerbayar = 0, komisiPending = 0;
  doneOrders.forEach(o=>{
    o.items.forEach(i=>{
      grossSales += i.unitPrice*i.qty;
      modalTerjual += i.basePrice*i.qty;
      if(o.refCode) komisiTerbayar += commissionForOrderItem(i);
    });
  });
  pendingOrders.forEach(o=>{
    o.items.forEach(i=>{ if(o.refCode) komisiPending += commissionForOrderItem(i); });
  });
  const labaKotor = grossSales - modalTerjual;
  const labaBersih = labaKotor - komisiTerbayar;
  const totalDitarik = state.withdrawals.filter(w=>w.status==='Disetujui').reduce((a,w)=>a+w.amount,0);
  const totalMenunggu = state.withdrawals.filter(w=>w.status==='Menunggu').reduce((a,w)=>a+w.amount,0);
  const sisaKomisiSeller = komisiTerbayar - totalDitarik;

  // per product
  const perProduct = {};
  doneOrders.forEach(o=>o.items.forEach(i=>{
    perProduct[i.id] = perProduct[i.id] || {name:i.name, qty:0, revenue:0, modal:0};
    perProduct[i.id].qty += i.qty;
    perProduct[i.id].revenue += i.unitPrice*i.qty;
    perProduct[i.id].modal += i.basePrice*i.qty;
  }));
  const prodRows = Object.values(perProduct).map(p=>({...p, profit:p.revenue-p.modal})).sort((a,b)=>b.revenue-a.revenue);
  const maxRevenue = Math.max(1, ...prodRows.map(p=>p.revenue));

  // per month
  const perMonth = {};
  doneOrders.forEach(o=>{
    const key = o.date.slice(0,7);
    perMonth[key] = (perMonth[key]||0) + o.total;
  });
  const monthKeys = Object.keys(perMonth).sort();
  const maxMonth = Math.max(1, ...monthKeys.map(k=>perMonth[k]));

  return `
  <div class="pg-head"><div><h1>Keuangan</h1><p>Ringkasan keuangan lengkap toko ${SITE_NAME} — omset, modal, komisi, dan laba bersih.</p></div></div>
  <div class="stat-grid">
    <div class="stat-card"><div class="lbl">Omset Kotor (Selesai)</div><div class="val">${fmtRp(grossSales)}</div></div>
    <div class="stat-card"><div class="lbl">Modal Barang Terjual</div><div class="val">${fmtRp(modalTerjual)}</div></div>
    <div class="stat-card"><div class="lbl">Komisi Seller Terbayar</div><div class="val">${fmtRp(komisiTerbayar)}</div><div class="sub">Pending: ${fmtRp(komisiPending)}</div></div>
    <div class="stat-card"><div class="lbl">Laba Bersih Perusahaan</div><div class="val" style="color:var(--leaf)">${fmtRp(labaBersih)}</div><div class="sub">Laba kotor ${fmtRp(labaKotor)}</div></div>
  </div>
  <div class="stat-grid">
    <div class="stat-card"><div class="lbl">Total Dicairkan ke Seller</div><div class="val">${fmtRp(totalDitarik)}</div></div>
    <div class="stat-card"><div class="lbl">Penarikan Menunggu</div><div class="val">${fmtRp(totalMenunggu)}</div></div>
    <div class="stat-card"><div class="lbl">Sisa Komisi Belum Ditarik</div><div class="val">${fmtRp(Math.max(sisaKomisiSeller,0))}</div></div>
    <div class="stat-card"><div class="lbl">Jumlah Transaksi Selesai</div><div class="val">${doneOrders.length}</div></div>
  </div>
  <div class="panel-grid2">
    <div class="panel">
      <div class="panel-head"><h3>Pendapatan per Produk</h3></div>
      ${prodRows.length===0?`<div class="empty-state"><div class="em">💰</div>Belum ada transaksi selesai.</div>`:
      prodRows.map(p=>`
        <div class="bar-row">
          <div class="lb"><span>${p.name} · ${p.qty} unit</span><b>${fmtRp(p.revenue)}</b></div>
          <div class="progress-bar"><div class="fill" style="width:${Math.round(p.revenue/maxRevenue*100)}%"></div></div>
        </div>`).join('')}
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Omset per Bulan</h3></div>
      ${monthKeys.length===0?`<div class="empty-state"><div class="em">📅</div>Belum ada data bulanan.</div>`:
      monthKeys.map(m=>`
        <div class="bar-row">
          <div class="lb"><span>${m}</span><b>${fmtRp(perMonth[m])}</b></div>
          <div class="progress-bar"><div class="fill" style="width:${Math.round(perMonth[m]/maxMonth*100)}%"></div></div>
        </div>`).join('')}
    </div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Rincian per Produk (Selesai)</h3></div>
    <div class="table-scroll"><table><thead><tr><th>Produk</th><th>Unit Terjual</th><th>Pendapatan</th><th>Modal</th><th>Laba Kotor</th></tr></thead><tbody>
    ${prodRows.length===0?`<tr><td colspan="5"><div class="empty-state"><div class="em">📦</div>Belum ada data.</div></td></tr>`:
    prodRows.map(p=>`<tr><td><b>${p.name}</b></td><td>${p.qty}</td><td>${fmtRp(p.revenue)}</td><td>${fmtRp(p.modal)}</td><td style="color:var(--leaf);">${fmtRp(p.profit)}</td></tr>`).join('')}
    </tbody></table></div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Riwayat Penarikan Dana Seller</h3></div>
    <div class="table-scroll"><table><thead><tr><th>Seller</th><th>Jumlah</th><th>Metode</th><th>Tanggal</th><th>Status</th></tr></thead><tbody>
    ${state.withdrawals.length===0?`<tr><td colspan="5"><div class="empty-state"><div class="em">💳</div>Belum ada penarikan.</div></td></tr>`:
    state.withdrawals.map(w=>{
      const s = state.users.find(u=>u.id===w.sellerId);
      return `<tr><td>${s?s.name:'-'}</td><td>${fmtRp(w.amount)}</td><td>${w.method}</td><td>${w.date}</td><td>${w.status==='Disetujui'?'<span class="badge badge-green">Disetujui</span>':w.status==='Ditolak'?'<span class="badge badge-red">Ditolak</span>':'<span class="badge badge-gold">Menunggu</span>'}</td></tr>`;
    }).join('')}
    </tbody></table></div>
  </div>`;
}

function pageStaffPenarikan(){
  return `
  <div class="pg-head"><div><h1>Penarikan Dana</h1><p>Setujui atau tolak permintaan penarikan seller.</p></div></div>
  <div class="panel"><div class="table-scroll"><table><thead><tr><th>Seller</th><th>Jumlah</th><th>Metode</th><th>Tanggal</th><th>Status</th><th></th></tr></thead><tbody>
    ${state.withdrawals.length===0?`<tr><td colspan="6"><div class="empty-state"><div class="em">💳</div>Belum ada permintaan.</div></td></tr>`:
    state.withdrawals.map(w=>{
      const s = state.users.find(u=>u.id===w.sellerId);
      return `<tr><td>${s?s.name:'-'}</td><td>${fmtRp(w.amount)}</td><td>${w.method}</td><td>${w.date}</td>
      <td>${w.status==='Disetujui'?'<span class="badge badge-green">Disetujui</span>':w.status==='Ditolak'?'<span class="badge badge-red">Ditolak</span>':'<span class="badge badge-gold">Menunggu</span>'}</td>
      <td class="row-actions">${w.status==='Menunggu'?`<button class="icon-btn" onclick="setWithdrawStatus('${w.id}','Disetujui')">✔</button><button class="icon-btn" onclick="setWithdrawStatus('${w.id}','Ditolak')">✕</button>`:''}</td>
      </tr>`;
    }).join('')}
  </tbody></table></div></div>`;
}
function setWithdrawStatus(id,status){ state.withdrawals.find(w=>w.id===id).status=status; persist(); render(); toast('Status diperbarui'); }
function openWithdrawForm(){ state.formModal={type:'withdraw'}; render(); }
function submitWithdrawForm(e){
  e.preventDefault();
  const u = currentUser();
  state.withdrawals.unshift({id:'w'+Date.now(), sellerId:u.id, amount:Number(document.getElementById('wf-amount').value), method:document.getElementById('wf-method').value, status:'Menunggu', date:new Date().toISOString().slice(0,10)});
  persist(); state.formModal=null; render(); toast('Permintaan penarikan dikirim');
}

function pageStaffPengaturan(){
  const codes = state.settings.referralCodes||[];
  return `
  <div class="pg-head"><div><h1>Pengaturan</h1><p>Atur program diskon member & kode referral/diskon.</p></div></div>
  <div class="panel">
    <div class="panel-head"><h3>Tingkat Diskon Member</h3><button class="btn btn-soft btn-sm" onclick="addTier()">+ Tambah Tingkat</button></div>
    <div class="field-hint" style="margin-bottom:14px;">Diskon ini berlaku otomatis sesuai total belanja kumulatif pelanggan saat checkout tanpa kode lain.</div>
    ${state.settings.tiers.map((t,idx)=>`
      <div class="reseller-price-row">
        <input type="color" id="tier-color-${idx}" value="${t.color}" title="Warna" style="width:34px;height:34px;padding:2px;border-radius:8px;border:1px solid var(--border-strong);background:var(--card);flex-shrink:0;">
        <input id="tier-name-${idx}" value="${t.name}" style="width:120px;" placeholder="Nama tingkat">
        <input type="number" id="tier-min-${idx}" value="${t.min}" style="width:140px;" placeholder="Min belanja">
        <input type="number" id="tier-disc-${idx}" value="${t.discount}" style="width:90px;" placeholder="Diskon %">
        <button class="icon-btn" onclick="removeTier(${idx})" title="Hapus tingkat">🗑</button>
      </div>`).join('')}
    <button class="btn btn-primary" style="margin-top:16px;" onclick="saveTiers()">Simpan Program Diskon Member</button>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Kode Referral / Diskon</h3><button class="btn btn-soft btn-sm" onclick="openReferralCodeForm()">+ Tambah Kode</button></div>
    <div class="field-hint" style="margin-bottom:14px;">Kode ini bisa dipakai pelanggan mana pun saat checkout untuk potongan langsung — terpisah dari kode referral milik seller.</div>
    ${codes.length===0?`<div class="empty-state"><div class="em">🏷️</div>Belum ada kode diskon.</div>`:
    `<div class="table-scroll"><table><thead><tr><th>Kode</th><th>Diskon</th><th>Label</th><th>Status</th><th></th></tr></thead><tbody>
      ${codes.map(c=>`<tr>
        <td><span class="badge badge-copper">${c.code}</span></td>
        <td>${c.discount}%</td>
        <td>${c.label||'—'}</td>
        <td>${c.active?'<span class="badge badge-green">Aktif</span>':'<span class="badge badge-grey">Nonaktif</span>'}</td>
        <td><div class="row-actions">
          <button class="icon-btn" onclick="openReferralCodeForm('${c.id}')" title="Edit">✎</button>
          <button class="icon-btn" onclick="toggleReferralCode('${c.id}')" title="${c.active?'Nonaktifkan':'Aktifkan'}">${c.active?'⏸':'▶️'}</button>
          <button class="icon-btn" onclick="deleteReferralCode('${c.id}')" title="Hapus">🗑</button>
        </div></td>
      </tr>`).join('')}
    </tbody></table></div>`}
  </div>`;
}
function addTier(){ state.settings.tiers.push({name:'Tingkat Baru', min:0, discount:0, color:'#eda63a'}); render(); }
function removeTier(idx){
  if(state.settings.tiers.length<=1){ toast('Minimal harus ada 1 tingkat diskon'); return; }
  state.settings.tiers.splice(idx,1);
  persist(); render(); toast('Tingkat diskon dihapus');
}
function saveTiers(){
  state.settings.tiers.forEach((t,idx)=>{
    const nameEl = document.getElementById('tier-name-'+idx);
    const colorEl = document.getElementById('tier-color-'+idx);
    if(nameEl && nameEl.value.trim()) t.name = nameEl.value.trim();
    if(colorEl) t.color = colorEl.value;
    t.min = Number(document.getElementById('tier-min-'+idx).value)||0;
    t.discount = Number(document.getElementById('tier-disc-'+idx).value)||0;
  });
  state.settings.tiers.sort((a,b)=>a.min-b.min);
  persist(); toast('Program diskon member disimpan'); render();
}
function openReferralCodeForm(id){ state.formModal={type:'refcode', id:id||null}; render(); }
function toggleReferralCode(id){
  const c = (state.settings.referralCodes||[]).find(x=>x.id===id);
  if(!c) return;
  c.active = !c.active; persist(); render(); toast(c.active?'Kode diaktifkan':'Kode dinonaktifkan');
}
function deleteReferralCode(id){
  state.settings.referralCodes = (state.settings.referralCodes||[]).filter(x=>x.id!==id);
  persist(); render(); toast('Kode diskon dihapus');
}
function submitReferralCodeForm(e){
  e.preventDefault();
  const id = state.formModal.id;
  const code = document.getElementById('rcf-code').value.trim().toUpperCase().replace(/\s+/g,'');
  const discount = Number(document.getElementById('rcf-discount').value)||0;
  const label = document.getElementById('rcf-label').value.trim();
  const active = document.getElementById('rcf-active').checked;
  if(!code){ toast('Kode wajib diisi'); return; }
  const dupSeller = state.users.find(u=>u.role==='seller' && u.refCode===code);
  if(dupSeller){ toast('Kode ini sudah dipakai sebagai kode referral seller'); return; }
  const dupCode = (state.settings.referralCodes||[]).find(c=>c.code===code && c.id!==id);
  if(dupCode){ toast('Kode diskon ini sudah ada'); return; }
  if(!state.settings.referralCodes) state.settings.referralCodes=[];
  if(id){ Object.assign(state.settings.referralCodes.find(c=>c.id===id), {code, discount, label, active}); }
  else { state.settings.referralCodes.push({id:'rc'+Date.now(), code, discount, label, active}); }
  persist(); state.formModal=null; render(); toast('Kode diskon disimpan');
}

function PortalFormModals(){
  if(!state.formModal) return '';
  const t = state.formModal.type;
  if(t==='product'){
    const p = state.formModal.id ? state.products.find(x=>x.id===state.formModal.id) : null;
    const previewSrc = state.formModal.imageData !== null && state.formModal.imageData !== undefined ? state.formModal.imageData : (p?p.image:'');
    return `<div class="overlay" onclick="if(event.target===this) closeFormModal()"><div class="modal">
      <div class="modal-top"><h3>${p?'Edit':'Tambah'} Produk</h3><button class="x-btn" onclick="closeFormModal()">✕</button></div>
      <form onsubmit="submitProductForm(event)">
        <div class="field"><label>Gambar Produk</label>
          <div class="img-drop">
            ${previewSrc?`<img class="prev" src="${previewSrc}">`:`<div class="lbl" style="margin-bottom:8px;">Belum ada gambar, tampil ikon default di beranda.</div>`}
            <input type="file" accept="image/*" onchange="handleProductImageChange(this)">
            <div class="lbl">Klik atau seret gambar ke sini untuk ${previewSrc?'ganti':'unggah'} gambar</div>
          </div>
        </div>
        <div class="field"><label>Nama Produk</label><input id="pf-name" required value="${p?p.name:''}"></div>
        <div class="field"><label>Tag Singkat</label><input id="pf-tag" required value="${p?p.tag:''}"></div>
        <div class="field"><label>Harga Modal (Rp)</label><input id="pf-base" type="number" required value="${p?p.basePrice:''}"></div>
        <div class="field"><label>Harga Retail (Rp)</label><input id="pf-price" type="number" required value="${p?p.price:''}"></div>
        <div class="field"><label>Deskripsi</label><textarea id="pf-desc" required>${p?p.desc:''}</textarea></div>
        <button class="btn btn-primary btn-block" type="submit">Simpan Produk</button>
      </form></div></div>`;
  }
  if(t==='user'){
    const u = state.formModal.id ? state.users.find(x=>x.id===state.formModal.id) : null;
    return `<div class="overlay" onclick="if(event.target===this) closeFormModal()"><div class="modal">
      <div class="modal-top"><h3>${u?'Edit':'Tambah'} Pengguna</h3><button class="x-btn" onclick="closeFormModal()">✕</button></div>
      <form onsubmit="submitUserForm(event)">
        <div class="field"><label>Nama</label><input id="uf-name" required value="${u?u.name:''}"></div>
        <div class="field"><label>Email</label><input id="uf-email" required value="${u?u.email:''}"></div>
        <div class="field"><label>Role</label><select id="uf-role" onchange="document.getElementById('uf-ref-wrap').style.display=this.value==='seller'?'block':'none'">
          ${['owner','admin','seller','customer'].map(r=>`<option value="${r}" ${u&&u.role===r?'selected':''}>${r}</option>`).join('')}
        </select></div>
        <div id="uf-ref-wrap" style="${u&&u.role==='seller'?'':'display:none'}"><div class="field"><label>Kode Referral</label><input id="uf-ref" value="${u?u.refCode||'':''}" placeholder="Otomatis jika kosong"></div></div>
        <button class="btn btn-primary btn-block" type="submit">Simpan Pengguna</button>
      </form></div></div>`;
  }
  if(t==='withdraw'){
    return `<div class="overlay" onclick="if(event.target===this) closeFormModal()"><div class="modal">
      <div class="modal-top"><h3>Ajukan Penarikan Dana</h3><button class="x-btn" onclick="closeFormModal()">✕</button></div>
      <form onsubmit="submitWithdrawForm(event)">
        <div class="field"><label>Jumlah (Rp)</label><input id="wf-amount" type="number" required></div>
        <div class="field"><label>Metode Pencairan</label><select id="wf-method"><option>Transfer BCA</option><option>Transfer BRI</option><option>Transfer Mandiri</option><option>DANA</option><option>OVO</option></select></div>
        <button class="btn btn-primary btn-block" type="submit">Kirim Permintaan</button>
      </form></div></div>`;
  }
  if(t==='package'){
    const pk = state.formModal.id ? (state.settings.packages||[]).find(x=>x.id===state.formModal.id) : null;
    return `<div class="overlay" onclick="if(event.target===this) closeFormModal()"><div class="modal">
      <div class="modal-top"><h3>${pk?'Edit':'Tambah'} Paket Seller</h3><button class="x-btn" onclick="closeFormModal()">✕</button></div>
      <form onsubmit="submitPackageForm(event)">
        <div class="field"><label>Nama Paket</label><input id="pkf-name" required value="${pk?pk.name:''}"></div>
        <div class="field"><label>Harga Paket (Rp, isi 0 jika gratis)</label><input id="pkf-price" type="number" required value="${pk?pk.price:0}"></div>
        <div class="field"><label>Deskripsi Singkat</label><textarea id="pkf-desc" required>${pk?pk.desc:''}</textarea></div>
        <div class="field"><label>Benefit (satu baris = satu benefit)</label><textarea id="pkf-benefits" required style="min-height:110px;">${pk?pk.benefits.join('\n'):''}</textarea></div>
        <button class="btn btn-primary btn-block" type="submit">Simpan Paket</button>
      </form></div></div>`;
  }
  if(t==='refcode'){
    const c = state.formModal.id ? (state.settings.referralCodes||[]).find(x=>x.id===state.formModal.id) : null;
    return `<div class="overlay" onclick="if(event.target===this) closeFormModal()"><div class="modal">
      <div class="modal-top"><h3>${c?'Edit':'Tambah'} Kode Referral / Diskon</h3><button class="x-btn" onclick="closeFormModal()">✕</button></div>
      <form onsubmit="submitReferralCodeForm(event)">
        <div class="field"><label>Kode</label><input id="rcf-code" required value="${c?c.code:''}" placeholder="Contoh: WELCOME10" style="text-transform:uppercase;"></div>
        <div class="field"><label>Diskon (%)</label><input id="rcf-discount" type="number" min="0" max="100" required value="${c?c.discount:10}"></div>
        <div class="field"><label>Label / Keterangan</label><input id="rcf-label" value="${c?c.label||'':''}" placeholder="Contoh: Diskon pelanggan baru"></div>
        <div class="field" style="display:flex;align-items:center;gap:10px;"><input type="checkbox" id="rcf-active" ${c?(c.active?'checked':''):'checked'} style="width:auto;"><label style="margin:0;">Aktifkan kode ini</label></div>
        <button class="btn btn-primary btn-block" type="submit">Simpan Kode</button>
      </form></div></div>`;
  }
  if(t==='notif'){
    return `<div class="overlay" onclick="if(event.target===this) closeFormModal()"><div class="modal">
      <div class="modal-top"><h3>Kirim Pemberitahuan ke Seller</h3><button class="x-btn" onclick="closeFormModal()">✕</button></div>
      <form onsubmit="submitNotifForm(event)">
        <div class="field"><label>Judul</label><input id="nf-title" required placeholder="Contoh: Update Stok Produk"></div>
        <div class="field"><label>Pesan</label><textarea id="nf-message" required placeholder="Tulis info atau pembaruan untuk seller..."></textarea></div>
        <button class="btn btn-primary btn-block" type="submit">Kirim ke Semua Seller</button>
      </form></div></div>`;
  }
  return '';
}

function renderStaffPortal(){
  const u = currentUser();
  if(!u || !(u.role==='owner'||u.role==='admin')){ openAuth('login'); location.hash='#/beranda'; return ''; }
  let content;
  switch(state.route){
    case '#/portal/produk': content = pageStaffProduk(); break;
    case '#/portal/pesanan': content = pageStaffPesanan(); break;
    case '#/portal/pengguna': content = pageStaffPengguna(); break;
    case '#/portal/seller': content = pageStaffSeller(); break;
    case '#/portal/paket': content = pageStaffPaket(); break;
    case '#/portal/pemberitahuan': content = pageStaffPemberitahuan(); break;
    case '#/portal/pengumuman': content = pageStaffPengumuman(); break;
    case '#/portal/keuangan': content = pageStaffKeuangan(); break;
    case '#/portal/penarikan': content = pageStaffPenarikan(); break;
    case '#/portal/pengaturan': content = pageStaffPengaturan(); break;
    default: content = pageStaffDashboard();
  }
  return `<div class="dash-wrap">${StaffSidebar(u)}<div class="dash-main">${content}</div></div>${PortalFormModals()}${Toast()}`;
}

/* =====================================================
   ROUTER / RENDER
===================================================== */
function Toast(){ return state.toast ? `<div class="toast"><span class="dotg"></span>${state.toast}</div>` : ''; }

/* =====================================================
   AI AGENT (rule-based customer help widget)
===================================================== */
const AI_QUICK_REPLIES = ['Rekomendasi produk','Cara jadi seller','Lacak pesanan saya','Cara pembayaran','Ongkos kirim'];
function AiWidget(){
  if(state.route.startsWith('#/portal')) return ''; // sembunyikan di portal admin
  if(!state.aiOpen){
    return `<button class="ai-fab" onclick="toggleAi()" aria-label="Bantuan AI">💬</button>`;
  }
  return `
  <div class="ai-panel">
    <div class="ai-panel-head">
      <div><b>Asisten Oliv Propolis</b><span class="ai-status"><span class="ai-status-dot"></span>Online</span></div>
      <button class="x-btn" onclick="toggleAi()">✕</button>
    </div>
    <div class="ai-msgs" id="ai-msgs-box">
      ${state.aiMessages.map(m=>`<div class="ai-msg ${m.role==='user'?'user':'bot'}">${m.text}</div>`).join('')}
      ${state.aiThinking?`<div class="ai-msg bot">Mengetik...</div>`:''}
    </div>
    <div class="ai-quick">${AI_QUICK_REPLIES.map(q=>`<button onclick="sendAiQuick('${q.replace(/'/g,"\\'")}')">${q}</button>`).join('')}</div>
    <div class="ai-input-row">
      <input id="ai-input" placeholder="Tulis pertanyaanmu..." onkeydown="if(event.key==='Enter')sendAiInput()">
      <button onclick="sendAiInput()">➤</button>
    </div>
  </div>`;
}
function toggleAi(){ state.aiOpen = !state.aiOpen; render(); }
function sendAiQuick(text){ handleAiUserMessage(text); }
function sendAiInput(){
  const el = document.getElementById('ai-input');
  const text = el.value.trim();
  if(!text) return;
  el.value = '';
  handleAiUserMessage(text);
}
async function handleAiUserMessage(text){
  state.aiMessages.push({role:'user', text});
  state.aiThinking = true;
  render();
  let reply;
  try{
    reply = await fetchAiReply(text);
  }catch(err){
    console.warn('AI online tidak tersedia, pakai jawaban bawaan.', err);
    reply = aiReplyFallback(text);
  }
  state.aiThinking = false;
  state.aiMessages.push({role:'bot', text: reply});
  render();
}
/* Tanya ke OpenAI lewat Edge Function 'ai-chat' (API key OpenAI
   disimpan sebagai secret di server, tidak pernah ada di browser). */
async function fetchAiReply(text){
  const history = state.aiMessages.slice(-8).map(m=>({ role: m.role==='user' ? 'user' : 'assistant', content: m.text }));
  const res = await fetch(`${FUNCTIONS_BASE}/ai-chat`, {
    method:'POST', headers: functionHeaders(),
    body: JSON.stringify({
      message: text,
      history,
      context: {
        siteName: SITE_NAME,
        whatsapp: WHATSAPP_NUMBER,
        products: state.products.map(p=>({ name:p.name, price:p.price, desc:p.desc, tag:p.tag })),
      },
    }),
  });
  if(!res.ok) throw new Error('AI request gagal: ' + res.status);
  const data = await res.json();
  if(!data.reply) throw new Error('Respons AI kosong');
  return data.reply;
}
/* Jawaban cadangan berbasis aturan — dipakai otomatis kalau Edge Function
   ai-chat belum di-deploy atau sedang offline, supaya chat tetap jalan. */
function aiReplyFallback(raw){
  const t = raw.toLowerCase();
  const u = currentUser();
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}`;
  if(/produk|rekomend|tetes|kapsul|spray|serum|beauty/.test(t)){
    if(state.products.length===0){
      return `Saat ini katalog produk kami sedang diperbarui, belum ada produk yang tersedia. Silakan cek kembali sebentar lagi ya, atau hubungi kami via WhatsApp: <a href="${waLink}" target="_blank" style="color:var(--gold-2);text-decoration:underline;">Chat WhatsApp</a>`;
    }
    const list = state.products.map(p=>`• ${p.name} — ${fmtRp(p.price)}`).join('<br>');
    return `Produk kami saat ini:<br>${list}<br><br>Mau saya bantu pilihkan sesuai kebutuhanmu (daya tahan tubuh, tenggorokan, atau perawatan kulit)?`;
  }
  if(/seller|jual|komisi|reseller|afiliasi|referral/.test(t)){
    return `Jadi seller Oliv Propolis gratis mulai dari paket Starter tanpa modal! Kamu dapat kode referral, komisi dari selisih harga jual, dan bisa naik ke paket Pro Seller / Elite Partner untuk benefit lebih besar. Klik menu "Jadi Seller" di navigasi untuk mendaftar.`;
  }
  if(/lacak|pesanan|order|status pesanan|resi/.test(t)){
    if(u && u.role==='customer'){
      const myOrders = state.orders.filter(o=>o.buyerName===u.name);
      if(myOrders.length){
        return `Pesananmu:<br>${myOrders.map(o=>`• #${o.id} — ${o.status}`).join('<br>')}<br><br>Detail lengkap ada di halaman Akun Saya.`;
      }
      return `Kamu belum punya riwayat pesanan nih. Yuk mulai belanja dulu di halaman Produk 🙂`;
    }
    return `Untuk melacak status pesanan, silakan login dulu ke akunmu lalu buka menu "Akun Saya". Kalau belum punya akun, kamu bisa cek langsung via WhatsApp kami: ${waLink}`;
  }
  if(/bayar|pembayaran|transfer|metode|cara beli|checkout/.test(t)){
    return `Setelah checkout, admin kami akan konfirmasi pembayaran via WhatsApp (transfer bank/e-wallet). Tinggal klik produk yang kamu mau → tambah ke keranjang → checkout, nanti diarahkan ke WhatsApp untuk konfirmasi.`;
  }
  if(/ongkir|kirim|pengiriman|sampai|estimasi/.test(t)){
    return `Pengiriman dilayani ke seluruh Indonesia. Cek juga menu "Program Diskon" — sering ada promo gratis ongkir untuk pembelian minimal tertentu!`;
  }
  if(/diskon|promo|tier|member/.test(t)){
    return `Semakin banyak belanja, tingkat membermu naik (Bronze → Silver → Gold → Platinum) dan diskon otomatis makin besar. Cek progresmu di halaman Akun Saya.`;
  }
  if(/halo|hai|hi|pagi|siang|sore|malam/.test(t)){
    return `Hai juga! 👋 Ada yang bisa saya bantu soal produk, seller, atau pesanan?`;
  }
  if(/makasih|terima kasih|thanks/.test(t)){
    return `Sama-sama! Kalau ada pertanyaan lain, saya di sini 😊`;
  }
  return `Hmm, untuk pertanyaan itu saya belum punya jawaban pasti. Coba hubungi tim kami langsung via WhatsApp ya, lebih cepat dibantu: <a href="${waLink}" target="_blank" style="color:var(--gold-2);text-decoration:underline;">Chat WhatsApp</a>`;
}

function renderPublicPage(inner){
  return `${Nav()}${inner}${Foot()}${ProductModal()}${CartDrawer()}${CheckoutModal()}${AuthModal()}${Toast()}`;
}

function render(){
  if(!state.loaded){
    document.getElementById('app').innerHTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;color:var(--text-dimmer);">Memuat ${SITE_NAME}…</div>`;
    return;
  }
  const r = state.route;
  let html;
  if(r.startsWith('#/portal')){
    html = renderStaffPortal();
  } else if(r==='#/seller'){
    html = pageSeller() + PortalFormModals() + Toast();
  } else if(r==='#/seller/harga'){
    html = pageSellerHarga() + PortalFormModals() + Toast();
  } else if(r==='#/seller/paket'){
    html = pageSellerPaket() + Toast();
  } else if(r==='#/seller/pemberitahuan'){
    html = pageSellerNotif() + Toast();
  } else if(r==='#/seller/profil'){
    html = pageSellerProfil() + Toast();
  } else if(r==='#/seller/penarikan'){
    html = pageSellerPenarikan() + PortalFormModals() + Toast();
  } else if(r.startsWith('#/akun')){
    html = renderAkunCustomer();
  } else if(r==='#/produk'){
    html = renderPublicPage(`<div class="wrap section" style="padding-top:50px;"><div class="section-head"><div class="kicker">Katalog</div><h2>Semua Produk ${SITE_NAME}</h2></div>${ProductGrid()}</div>`);
  } else if(r==='#/diskon'){
    html = renderPublicPage(DiskonTeaser());
  } else if(r==='#/jadi-seller'){
    html = renderPublicPage(SellerCta());
  } else {
    html = renderPublicPage(`${Hero()}${Why()}${ProdukSection()}${DiskonTeaser()}${SellerCta()}`);
  }
  document.getElementById('app').innerHTML = html + AiWidget();
  const aiBox = document.getElementById('ai-msgs-box');
  if(aiBox) aiBox.scrollTop = aiBox.scrollHeight;
}

state.route = location.hash || '#/beranda';
initData();
