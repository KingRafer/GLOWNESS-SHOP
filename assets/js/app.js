/* =====================================================
   CONFIG
===================================================== */
const WHATSAPP_NUMBER = '6285133352577'; // 085133352577
const SITE_NAME = 'GLOWNESS SHOP';

/* =====================================================
   MIDTRANS CONFIG
   - CLIENT_KEY aman ditaruh di sini (public key, bukan rahasia).
   - SERVER_KEY JANGAN ditaruh di file ini — disimpan sebagai
     secret di Supabase Edge Functions.
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
if(MIDTRANS_CLIENT_KEY && !MIDTRANS_CLIENT_KEY.startsWith('GANTI')) loadMidtransSnap();

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
    const { error } = await supa.from('app_storage').upsert({ key, value, updated_at: new Date().toISOString() });
    if(error){ console.error('Gagal simpan', key, error); if(typeof toast==='function') toast('Gagal menyimpan ke database: ' + (error.message||'cek policy Supabase')); }
  }catch(e){ console.error(e); if(typeof toast==='function') toast('Gagal menyimpan ke database'); }
}

/* =====================================================
   SEED DATA
===================================================== */
const SEED_PRODUCTS = [];
const SEED_PAYMENTS = [
  {id:'pm1', type:'qris', name:'QRIS', accountNumber:'', accountName:'GLOWNESS SHOP', qrImage:'', note:'Scan QRIS memakai aplikasi bank atau e-wallet apa pun.', active:true},
  {id:'pm2', type:'ewallet', name:'GoPay', accountNumber:'', accountName:'GLOWNESS SHOP', qrImage:'', note:'', active:true},
  {id:'pm3', type:'ewallet', name:'DANA', accountNumber:'', accountName:'GLOWNESS SHOP', qrImage:'', note:'', active:true},
  {id:'pm4', type:'ewallet', name:'OVO', accountNumber:'', accountName:'GLOWNESS SHOP', qrImage:'', note:'', active:true},
  {id:'pm5', type:'ewallet', name:'ShopeePay', accountNumber:'', accountName:'GLOWNESS SHOP', qrImage:'', note:'', active:true},
  {id:'pm6', type:'bank', name:'Bank BCA', accountNumber:'', accountName:'GLOWNESS SHOP', qrImage:'', note:'', active:true},
  {id:'pm7', type:'bank', name:'Bank BRI', accountNumber:'', accountName:'GLOWNESS SHOP', qrImage:'', note:'', active:true},
  {id:'pm8', type:'bank', name:'Bank Mandiri', accountNumber:'', accountName:'GLOWNESS SHOP', qrImage:'', note:'', active:true},
  {id:'pm9', type:'bank', name:'Bank BNI', accountNumber:'', accountName:'GLOWNESS SHOP', qrImage:'', note:'', active:true},
];
const SEED_USERS = [
  {id:'u1', name:'Owner GLOWNESS', email:'owner@glowness.id', password:'owner123', role:'owner', avatar:''},
  {id:'u2', name:'Admin GLOWNESS', email:'admin@glowness.id', password:'admin123', role:'admin', avatar:''},
];
const SEED_ORDERS = [];
const SEED_WITHDRAWALS = [];
const SEED_BALANCE_LOGS = [];
const SEED_PENDING_LOGS = [];
const SEED_SETTINGS = {
  matrix:{width:3, depth:5},
  paymentMethods: SEED_PAYMENTS,
};
const SEED_NOTIFICATIONS = [
  {id:'n1', title:'Selamat Datang di GLOWNESS SHOP! 🎉', message:'Terima kasih sudah bergabung. Yuk mulai bagikan link referralmu dan pantau komisimu di dashboard.', date:'2026-08-15', from:'Tim GLOWNESS SHOP'},
];
const SEED_ANNOUNCEMENT = {active:true, title:'Promo Spesial!', message:'Belanja produk pilihan langsung dari GLOWNESS SHOP — kualitas terjamin, proses cepat, dan aman.', date:'2026-09-01'};

/* =====================================================
   STATE
===================================================== */
let state = {
  route: location.hash || '#/beranda',
  cart: [], cartOpen:false, productModal:null, toast:null,
  currentUser:null, // logged in user id
  authModal:null,   // {tab:'login'|'register', step:1|2, role:null}
  formModal:null,
  products:[], orders:[], users:[], withdrawals:[], balanceLogs:[], pendingLogs:[], settings:SEED_SETTINGS,
  notifications:[], announcement:null, announceDismissed:false,
  chats:[], chatOpen:false, chatActiveId:null, chatDraft:'', chatSearch:'',
  userSearch:'', userShowPass:{},
  loaded:false,
  regTemp:{},       // temp holder for registration wizard values across steps
  theme: localStorage.getItem('glowness_theme') || 'dark',
  searchQuery:'', navSearchValue:'',
  mobileMenuOpen:false,
  dashMenuOpen:false,
  proofDraft:null, proofCache:{}, proofBusy:false,
};
function brandMark(size){
  const s = size || 38;
  return `<div class="brand-mark" style="width:${s}px;height:${s}px;"><img src="assets/img/logo.webp" alt="GLOWNESS" width="${s}" height="${s}" onerror="this.onerror=null;this.src='assets/img/logo-sm.png'"></div>`;
}
function themeToggleBtn(){
  return `<button class="theme-toggle" onclick="toggleTheme()" aria-label="Ganti tema">${state.theme==='light'?ic('moon'):ic('sun')}</button>`;
}
/* Lightweight SVG icons (no emoji stickers) */
function ic(name, size){
  const s = size || 18;
  const icons = {
    cart: `<path d="M6 6h15l-1.5 9h-12z"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M6 6L5 3H2"/>`,
    bag: `<path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>`,
    chat: `<path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 1 1 18 0z"/>`,
    user: `<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>`,
    home: `<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>`,
    search: `<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>`,
    sun: `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`,
    moon: `<path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z"/>`,
    menu: `<path d="M4 7h16M4 12h16M4 17h16"/>`,
    close: `<path d="M6 6l12 12M18 6L6 18"/>`,
    check: `<path d="M5 13l4 4L19 7"/>`,
    package: `<path d="M12 2l9 5v10l-9 5-9-5V7l9-5z"/><path d="M12 12l9-5M12 12v10M12 12L3 7"/>`,
    tag: `<path d="M20 12l-8 8-9-9V3h8l9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>`,
    star: `<path d="M12 2l3 7h7l-5.5 4.5L19 21l-7-4.5L5 21l2.5-7.5L2 9h7z"/>`,
    shield: `<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/>`,
    truck: `<path d="M1 7h13v10H1zM14 10h4l3 3v4h-7V10z"/><circle cx="5.5" cy="18.5" r="1.5"/><circle cx="17.5" cy="18.5" r="1.5"/>`,
    map: `<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>`,
    lock: `<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>`,
    bell: `<path d="M6 16h12l-1-2V10a5 5 0 0 0-10 0v4l-1 2z"/><path d="M10 19a2 2 0 0 0 4 0"/>`,
    wallet: `<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="16" cy="14" r="1.5"/>`,
    link: `<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>`,
    chart: `<path d="M4 19V5M4 19h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>`,
    logout: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>`,
    send: `<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>`,
    image: `<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>`,
    trash: `<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>`,
    edit: `<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>`,
    plus: `<path d="M12 5v14M5 12h14"/>`,
    store: `<path d="M3 9l1-5h16l1 5"/><path d="M3 9h18v11H3z"/><path d="M9 20v-6h6v6"/>`,
  };
  const d = icons[name] || icons.package;
  return `<svg class="ic-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}
function toggleTheme(){
  state.theme = state.theme==='light' ? 'dark' : 'light';
  localStorage.setItem('glowness_theme', state.theme);
  document.documentElement.setAttribute('data-theme', state.theme);
  render();
}
function toggleMobileMenu(){ state.mobileMenuOpen = !state.mobileMenuOpen; render(); }
function closeMobileMenu(){ if(!state.mobileMenuOpen) return; state.mobileMenuOpen = false; render(); }
function toggleDashMenu(){ state.dashMenuOpen = !state.dashMenuOpen; render(); }
function closeDashMenu(){ if(!state.dashMenuOpen) return; state.dashMenuOpen = false; render(); }

function doSearch(){
  const el = document.getElementById('navSearch');
  const v = el ? el.value.trim() : '';
  state.searchQuery = v;
  state.navSearchValue = v;
  state.mobileMenuOpen = false;
  state.route = '#/produk';
  location.hash = '#/produk';
  render();
}
function clearSearch(){
  state.searchQuery = '';
  state.navSearchValue = '';
  render();
}
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
  state.balanceLogs = await loadShared('oliv_balance_logs', SEED_BALANCE_LOGS);
  state.pendingLogs = await loadShared('oliv_pending_logs', SEED_PENDING_LOGS);
  state.settings = await loadShared('oliv_settings', SEED_SETTINGS);
  state.notifications = await loadShared('oliv_notifications', SEED_NOTIFICATIONS);
  state.announcement = await loadShared('oliv_announcement', SEED_ANNOUNCEMENT);
  state.chats = await loadShared('oliv_chats', []);
  if(!Array.isArray(state.chats)) state.chats = [];
  delete state.settings.packages;
  if(!state.settings.paymentMethods) state.settings.paymentMethods = SEED_PAYMENTS;
  if(!state.settings.matrix) state.settings.matrix = {width:3, depth:5};
  delete state.settings.tiers;
  delete state.settings.referralCodes;
  state.users.forEach(u=>{ if(u.role==='member'){ if(u.parentId===undefined) u.parentId=null; if(u.sponsorId===undefined) u.sponsorId=null; } });
  restoreSession();
  state.loaded = true;
  render();
  if(!supaReady){ console.warn('[GLOWNESS SHOP] Belum terhubung ke Supabase — data tidak akan tersimpan permanen. Isi SUPABASE_URL & SUPABASE_ANON_KEY di kode.'); }
}
function persist(){
  saveShared('oliv_products', state.products);
  saveShared('oliv_orders', state.orders);
  saveShared('oliv_users', state.users);
  saveShared('oliv_withdrawals', state.withdrawals);
  saveShared('oliv_balance_logs', state.balanceLogs);
  saveShared('oliv_pending_logs', state.pendingLogs);
  saveShared('oliv_settings', state.settings);
  saveShared('oliv_notifications', state.notifications);
  saveShared('oliv_announcement', state.announcement);
  saveShared('oliv_chats', state.chats);
}
/* ---------- referral capture, escape, copy ---------- */
(function(){ try{ const r=new URLSearchParams(location.search).get('ref'); if(r) localStorage.setItem('gl_ref', r.trim().toUpperCase()); }catch(e){} })();
function pendingRef(){ try{ return localStorage.getItem('gl_ref')||''; }catch(e){ return ''; } }
function esc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
async function copyText(text, msg){
  try{
    if(navigator.clipboard && window.isSecureContext){ await navigator.clipboard.writeText(text); }
    else{
      const h=document.createElement('textarea'); h.value=text; h.setAttribute('readonly','');
      h.style.position='fixed'; h.style.opacity='0'; document.body.appendChild(h); h.select();
      const ok=document.execCommand('copy'); h.remove(); if(!ok) throw new Error('copy failed');
    }
    toast(msg||'Berhasil disalin');
  }catch(err){ toast('Salin manual: '+text); }
}
function shrinkImage(dataUrl, max, cb){
  const img=new Image();
  img.onload=()=>{
    const r=Math.min(1, max/Math.max(img.width,img.height));
    const c=document.createElement('canvas'); c.width=Math.round(img.width*r); c.height=Math.round(img.height*r);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    cb(c.toDataURL('image/png'));
  };
  img.onerror=()=>cb(dataUrl);
  img.src=dataUrl;
}

/* ---------- MATRIX REFERRAL ----------
   sponsorId = seller yang mengajak (pemilik kode referral)
   parentId  = posisi di pohon matrix (bisa berbeda dari sponsor karena spillover)
   Lebar (width) & kedalaman (depth) diatur admin di Pengaturan. */
function matrixCfg(){ const m=(state.settings&&state.settings.matrix)||{}; return {width:Math.max(1,Number(m.width)||3), depth:Math.max(1,Number(m.depth)||5)}; }
function sellerChildren(id){ return state.users.filter(x=>x.role==='member' && x.parentId===id); }
function sellerByCode(code){ const c=(code||'').trim().toUpperCase(); if(!c) return null; return state.users.find(x=>x.role==='member' && (x.refCode||'').toUpperCase()===c) || null; }
function findPlacement(sponsorId){
  const {width}=matrixCfg();
  const queue=[sponsorId];
  while(queue.length){
    const id=queue.shift(); const kids=sellerChildren(id);
    if(kids.length<width) return id;
    kids.forEach(k=>queue.push(k.id));
  }
  return sponsorId;
}
function matrixLevels(rootId){
  const {width,depth}=matrixCfg();
  const levels=[]; let cur=[rootId];
  for(let l=1;l<=depth;l++){
    const next=[]; cur.forEach(id=>sellerChildren(id).forEach(k=>next.push(k.id)));
    levels.push({level:l, filled:next.length, capacity:Math.pow(width,l)});
    cur=next;
  }
  return levels;
}
function downlineCount(id){ return matrixLevels(id).reduce((a,l)=>a+l.filled,0); }
function matrixItems(id, level, maxDepth){
  return sellerChildren(id).map(k=>`<li><div class="mx-node"><div class="av">${avatarHtml(k)}</div><div><b>${esc(k.name)}</b><small>Level ${level} · ${esc(k.refCode)} · ${downlineCount(k.id)} di bawahnya</small></div></div>${level<maxDepth && sellerChildren(k.id).length?`<ul class="mx-tree">${matrixItems(k.id,level+1,maxDepth)}</ul>`:''}</li>`).join('');
}

/* ---------- PEMBAYARAN ---------- */
function activePayments(){ return (state.settings.paymentMethods||[]).filter(p=>p.active); }
function payTypeLabel(t){ return ({qris:'QRIS', ewallet:'E-Wallet', bank:'Transfer Bank', other:'Lainnya'})[t]||'Lainnya'; }
function payIcon(t){ return ({qris:'📱', ewallet:'👛', bank:'🏦', other:'💳'})[t]||'💳'; }
function paymentDetailHtml(p){
  let h='<div class="pay-detail">';
  if(p.qrImage) h+=`<img class="pay-qr" src="${p.qrImage}" alt="QR ${esc(p.name)}">`;
  if(p.accountNumber) h+=`<div class="pay-row"><span>${p.type==='bank'?'No. Rekening':'Nomor'} ${esc(p.name)}</span><b>${esc(p.accountNumber)}</b><button type="button" class="icon-btn" data-v="${esc(p.accountNumber)}" onclick="copyText(this.dataset.v,'Nomor berhasil disalin')">Salin</button></div>`;
  if(p.accountName) h+=`<div class="pay-row"><span>Atas Nama</span><b>${esc(p.accountName)}</b></div>`;
  if(!p.qrImage && !p.accountNumber) h+=`<div class="field-hint">Detail metode ini belum diisi admin. Konfirmasi lewat WhatsApp untuk info pembayaran.</div>`;
  if(p.note) h+=`<div class="field-hint" style="margin-top:8px;">${esc(p.note)}</div>`;
  return h+'</div>';
}
function updatePaymentDetail(){
  const box=document.getElementById('co-pay-detail'); if(!box) return;
  const sel=document.querySelector('input[name="co-pay"]:checked');
  const p=sel?(state.settings.paymentMethods||[]).find(m=>m.id===sel.value):null;
  box.innerHTML = p ? paymentDetailHtml(p) : '';
}

function fmtRp(n){ return 'Rp' + Number(Math.round(n)).toLocaleString('id-ID'); }
function initials(name){ return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }
function currentUser(){ return state.users.find(u=>u.id===state.currentUser); }
function resolveRefCode(raw){
  const code = (raw||'').trim().toUpperCase();
  if(!code) return {type:'none'};
  const member = state.users.find(x=>x.role==='member' && x.refCode===code);
  if(member) return {type:'member', member};
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
function buildWaMessage({name, wa, address, items, subtotal, total, refCode, orderId, paymentName}){
  let lines = [];
  lines.push(`Halo ${SITE_NAME}, saya ingin ${orderId?'konfirmasi pembayaran untuk pesanan #'+orderId:'memesan'}:`);
  lines.push('');
  items.forEach((it,i)=>{
    lines.push(`${i+1}. ${it.name} x${it.qty} = ${fmtRp(it.unitPrice*it.qty)}`);
  });
  lines.push('');
  lines.push(`Subtotal: ${fmtRp(subtotal)}`);
  if(refCode) lines.push(`Kode Referral: ${refCode}`);
  lines.push(`Total: ${fmtRp(total)}`);
  if(paymentName) lines.push(`Metode Pembayaran: ${paymentName}`);
  lines.push('');
  lines.push(`Nama: ${name}`);
  lines.push(`No. WhatsApp: ${wa}`);
  if(address) lines.push(`Alamat Pengiriman: ${address}`);
  lines.push('');
  lines.push(orderId ? 'Bukti pembayaran saya lampirkan di chat ini. Terima kasih! 🙏' : 'Mohon konfirmasi pesanan saya. Terima kasih! 🙏');
  return lines.join('\n');
}
function openWhatsAppOrder(payload){
  const msg = buildWaMessage(payload);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}


/* =====================================================
   BUKTI PEMBAYARAN
   - Foto dikompres di browser (JPEG, sisi terpanjang 1000px) lalu
     disimpan di key terpisah `oliv_proof_<orderId>` supaya data
     pesanan (oliv_orders) tidak membengkak.
   - paymentStatus: 'Belum Dibayar' → 'Menunggu Konfirmasi'
                    → 'Terkonfirmasi' | 'Ditolak' (boleh upload ulang)
===================================================== */
const PROOF_MAX_FILE_MB = 10;
function orderNeedsProof(o){ return o && o.paymentMethod!=='midtrans'; }
function payStatusOf(o){ return o.paymentStatus || (o.paymentMethod==='midtrans' ? 'Online' : 'Belum Dibayar'); }
function payStatusBadge(o){
  const st = payStatusOf(o);
  if(st==='Terkonfirmasi') return `<span class="badge badge-green">✓ Terkonfirmasi</span>`;
  if(st==='Menunggu Konfirmasi') return `<span class="badge badge-gold">⏳ Menunggu Konfirmasi</span>`;
  if(st==='Ditolak') return `<span class="badge badge-red">Ditolak</span>`;
  if(st==='Online') return `<span class="badge badge-grey">Midtrans</span>`;
  return `<span class="badge badge-grey">Belum Dibayar</span>`;
}
function pendingProofCount(){ return state.orders.filter(o=>o.paymentStatus==='Menunggu Konfirmasi').length; }
function compressProofImage(file, cb){
  const reader = new FileReader();
  reader.onerror = ()=>cb(null);
  reader.onload = ()=>{
    const img = new Image();
    img.onerror = ()=>cb(null);
    img.onload = ()=>{
      const MAX = 1000;
      const r = Math.min(1, MAX/Math.max(img.width,img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width*r); c.height = Math.round(img.height*r);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0,0,c.width,c.height);
      ctx.drawImage(img,0,0,c.width,c.height);
      cb(c.toDataURL('image/jpeg', 0.75));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
function handleProofSelect(inputEl, orderId){
  const file = inputEl.files && inputEl.files[0];
  if(!file) return;
  if(!/^image\//.test(file.type)){ toast('File harus berupa foto (JPG/PNG)'); inputEl.value=''; return; }
  if(file.size > PROOF_MAX_FILE_MB*1024*1024){ toast('Ukuran foto maksimal '+PROOF_MAX_FILE_MB+'MB'); inputEl.value=''; return; }
  compressProofImage(file, (data)=>{
    if(!data){ toast('Foto tidak bisa dibaca, coba foto lain'); return; }
    state.proofDraft = {orderId, image:data};
    render();
  });
}
function clearProofDraft(){ state.proofDraft=null; render(); }

/* Ambil order terbaru dari server sebelum diubah, supaya perubahan dari
   perangkat lain (mis. admin sedang konfirmasi) tidak tertimpa. */
async function mutateOrder(id, fn){
  const fresh = await loadShared('oliv_orders', state.orders);
  const list = Array.isArray(fresh) ? fresh : state.orders;
  const o = list.find(x=>x.id===id);
  if(!o) return null;
  fn(o);
  state.orders = list;
  await saveShared('oliv_orders', state.orders);
  return o;
}
async function submitPaymentProof(orderId){
  const d = state.proofDraft;
  if(state.proofBusy) return;
  if(!d || d.orderId!==orderId){ toast('Pilih foto bukti pembayaran dulu'); return; }
  state.proofBusy = true; render();
  try{
    const now = new Date().toISOString();
    await saveShared('oliv_proof_'+orderId, {image:d.image, uploadedAt:now});
    state.proofCache[orderId] = {image:d.image, uploadedAt:now};
    const o = await mutateOrder(orderId, (x)=>{
      x.paymentStatus='Menunggu Konfirmasi'; x.proofAt=now; x.paymentNote='';
    });
    if(!o) throw new Error('Pesanan tidak ditemukan');
    state.proofDraft = null;
    toast('Bukti pembayaran terkirim. Menunggu konfirmasi admin.');
  }catch(err){
    console.error(err);
    toast('Gagal mengirim bukti pembayaran, coba lagi.');
  }finally{
    state.proofBusy = false; render();
  }
}
async function loadProof(orderId){
  if(state.proofCache[orderId]) return state.proofCache[orderId];
  const v = await loadShared('oliv_proof_'+orderId, null);
  if(v && v.image){ state.proofCache[orderId] = v; return v; }
  return null;
}
async function openProofView(orderId){
  state.formModal = {type:'proofview', orderId, loading:!state.proofCache[orderId]};
  render();
  if(state.formModal && state.formModal.loading){
    await loadProof(orderId);
    if(state.formModal && state.formModal.type==='proofview' && state.formModal.orderId===orderId){
      state.formModal.loading=false; render();
    }
  }
}
function openPayProof(orderId){
  state.proofDraft = null;
  state.formModal = {type:'payinfo', orderId, fresh:false};
  render();
  if(!state.proofCache[orderId]) loadProof(orderId).then(()=>{ if(state.formModal && state.formModal.orderId===orderId) render(); });
}
async function confirmPaymentProof(orderId){
  const u = currentUser();
  const o = await mutateOrder(orderId, (x)=>{
    x.paymentStatus='Terkonfirmasi'; x.paymentNote=''; x.paymentReviewedAt=new Date().toISOString(); x.paymentReviewedBy=u?u.name:'Admin';
  });
  if(!o){ toast('Pesanan tidak ditemukan'); return; }
  state.formModal=null; render(); toast('Pembayaran pesanan #'+orderId+' dikonfirmasi');
}
async function rejectPaymentProof(orderId){
  const reason = prompt('Alasan penolakan (akan terlihat oleh pembeli):', 'Bukti tidak jelas / nominal tidak sesuai');
  if(reason===null) return;
  const u = currentUser();
  const o = await mutateOrder(orderId, (x)=>{
    x.paymentStatus='Ditolak'; x.paymentNote=reason.trim(); x.paymentReviewedAt=new Date().toISOString(); x.paymentReviewedBy=u?u.name:'Admin';
  });
  if(!o){ toast('Pesanan tidak ditemukan'); return; }
  state.formModal=null; render(); toast('Bukti pembayaran #'+orderId+' ditolak');
}
function proofUploadBlock(o){
  const st = payStatusOf(o);
  const d = state.proofDraft && state.proofDraft.orderId===o.id ? state.proofDraft : null;
  const saved = state.proofCache[o.id];
  if(!orderNeedsProof(o)) return '';
  let h = `<div class="proof-box"><div style="font-weight:600;margin-bottom:8px;">Bukti Pembayaran</div>`;
  if(st==='Terkonfirmasi'){
    h += `<div class="field-hint" style="color:var(--leaf);">✓ Pembayaranmu sudah dikonfirmasi admin. Terima kasih!</div>`;
    if(saved) h += `<img class="proof-img" src="${saved.image}" alt="Bukti pembayaran">`;
    return h+'</div>';
  }
  if(st==='Menunggu Konfirmasi' && !d){
    h += `<div class="field-hint" style="color:var(--gold-2);">⏳ Bukti sudah terkirim, menunggu konfirmasi admin.</div>`;
    if(saved) h += `<img class="proof-img" src="${saved.image}" alt="Bukti pembayaran">`;
    h += `<label class="btn btn-ghost btn-sm proof-pick" style="margin-top:10px;">Kirim Ulang Foto Lain<input type="file" accept="image/*" onchange="handleProofSelect(this,'${o.id}')"></label></div>`;
    return h;
  }
  if(st==='Ditolak' && !d){
    h += `<div class="field-hint" style="color:var(--red);">Bukti sebelumnya ditolak${o.paymentNote?': '+esc(o.paymentNote):''}. Silakan kirim ulang.</div>`;
  } else if(!d){
    h += `<div class="field-hint">Sudah transfer? Unggah foto/screenshot bukti pembayaran agar admin bisa mengonfirmasi pesananmu.</div>`;
  }
  if(d){
    h += `<img class="proof-img" src="${d.image}" alt="Pratinjau bukti pembayaran">
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn btn-primary" style="flex:1;" ${state.proofBusy?'disabled':''} onclick="submitPaymentProof('${o.id}')">${state.proofBusy?'Mengirim...':'Kirim Bukti Pembayaran'}</button>
        <button class="btn btn-ghost" ${state.proofBusy?'disabled':''} onclick="clearProofDraft()">Ganti</button>
      </div>`;
  } else {
    h += `<label class="btn btn-soft btn-block proof-pick" style="margin-top:10px;">📷 Pilih Foto Bukti Pembayaran<input type="file" accept="image/*" onchange="handleProofSelect(this,'${o.id}')"></label>`;
  }
  return h+'</div>';
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
    if(u.role==='admin'||u.role==='owner'){ dest = '#/portal/dashboard'; label='Portal Admin'; short='Portal'; }
    right = `
      <div class="acc-pill">
        <button class="btn btn-soft btn-sm" onclick="location.hash='${dest}'"><span class="lbl-full">${label}</span><span class="lbl-short">${short}</span></button>
        <a class="logout" onclick="doLogout()">Keluar</a>
      </div>`;
  }
  const burger = `<button class="burger-btn" onclick="toggleMobileMenu()" aria-label="Menu">${state.mobileMenuOpen?ic('close',18):ic('menu',18)}</button>`;
  return `
  <div class="cnav">
    <div class="wrap cnav-inner">
      <a class="brand" href="#/beranda">${brandMark(38)}<div class="brand-txt">${SITE_NAME}<small>Belanja Mudah · Hidup Lebih Indah</small></div></a>
      <div class="search-box">
        <input type="text" id="navSearch" value="${esc(state.navSearchValue)}" placeholder="Cari produk..." onkeydown="if(event.key==='Enter'){event.preventDefault();doSearch();}">
        <button type="button" onclick="doSearch()" aria-label="Cari">🔍</button>
      </div>
      ${state.mobileMenuOpen?`<div class="mobile-menu-backdrop" onclick="closeMobileMenu()"></div><div class="mobile-menu">
        <a href="#/beranda" onclick="closeMobileMenu()" class="${state.route==='#/beranda'?'active':''}">Beranda</a>
        <a href="#/produk" onclick="closeMobileMenu()" class="${state.route==='#/produk'?'active':''}">Produk</a>
        <a href="#/jadi-seller" onclick="closeMobileMenu()" class="${state.route==='#/jadi-seller'?'active':''}">Peluang Bisnis</a>
        <a href="#/akun/chat" onclick="closeMobileMenu()">💬 Chat Admin</a>
      </div>`:''}
      <div class="cnav-links">
        <a href="#/beranda" class="${state.route==='#/beranda'?'active':''}">Beranda</a>
        <a href="#/produk" class="${state.route==='#/produk'?'active':''}">Produk</a>
        <a href="#/jadi-seller" class="${state.route==='#/jadi-seller'?'active':''}">Peluang Bisnis</a>
      </div>
      <div class="nav-right">
        ${themeToggleBtn()}
        <button class="cart-pill" onclick="openCart()">${ic('cart',16)} <span class="cart-count">${state.cart.reduce((a,c)=>a+c.qty,0)}</span></button>
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
  const stats = [
    {v:(state.products.length||0)+'+', l:'Produk Pilihan'},
    {v:'24/7', l:'Layanan Aktif'},
    {v:(activePayments().length||0)+'+', l:'Metode Pembayaran'},
  ];
  return `
  <div class="hero">
    <div class="wrap hero-grid">
      <div>
        <div class="kicker">Belanja Cerdas · Produk Pilihan</div>
        <h1>Belanja di ${SITE_NAME}, <span class="gold">temukan produk favoritmu di sini.</span></h1>
        <p>Jelajahi katalog produk pilihan ${SITE_NAME} dengan proses belanja yang mudah, cepat, dan aman — langsung dari satu tempat.</p>
        <div class="hero-actions">
          <button class="btn btn-primary" onclick="location.hash='#/produk'">Belanja Sekarang</button>
          <button class="btn btn-ghost" onclick="document.getElementById('produk')?.scrollIntoView({behavior:'smooth'})">Lihat Produk</button>
        </div>
        <div class="hero-stats">
          ${stats.map(s=>`<div class="stat"><strong>${s.v}</strong><span>${s.l}</span></div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}
function Why(){
  return `
  <div class="wrap section">
    <div class="section-head">
      <div class="kicker">Kenapa ${SITE_NAME}</div>
      <h2>Belanja yang nyaman dan terpercaya</h2>
      <p>Kami menghadirkan pengalaman belanja online yang mudah, cepat, dan aman untuk kebutuhanmu.</p>
    </div>
    <div class="why-row">
      <div class="why-card"><div class="em">${ic('bag',28)}</div><h4>Produk Pilihan Berkualitas</h4><p>Setiap produk dikurasi agar sesuai kebutuhan dan sepadan dengan harga yang kamu bayar.</p></div>
      <div class="why-card"><div class="em">${ic('shield',28)}</div><h4>Checkout Aman & Cepat</h4><p>Berbagai metode pembayaran, proses pesanan yang jelas, dan konfirmasi langsung lewat WhatsApp.</p></div>
      <div class="why-card"><div class="em">${ic('chat',28)}</div><h4>Siap Membantu</h4><p>Ada pertanyaan? Tim kami siap membantu lewat chat admin atau WhatsApp kapan saja kamu butuh.</p></div>
    </div>
  </div>`;
}
function prodThumb(p){
  return p.image ? `<img src="${p.image}" alt="${p.name}">` : p.icon;
}
function ProductGrid(limit, query){
  let list = state.products;
  if(query){
    const q = query.toLowerCase();
    list = list.filter(p=>(p.name||'').toLowerCase().includes(q) || (p.desc||'').toLowerCase().includes(q));
  }
  if(limit) list = list.slice(0,limit);
  if(list.length===0){
    return `<div class="empty-state"><div class="em">🍯</div>${query?`Tidak ada produk yang cocok dengan "${esc(query)}".`:'Belum ada produk tersedia saat ini.'}</div>`;
  }
  return `<div class="prod-grid">
    ${list.map(p=>`
      <div class="prod-card" onclick="openProduct('${p.id}')">
        <div class="prod-thumb-wrap">
          ${p.image?`<img class="prod-img-flat" src="${p.image}" alt="${p.name}">`:`<div class="prod-hex">${ic('package',28)}</div>`}
          <span class="prod-badge">Tersedia</span>
        </div>
        <h3>${p.name}</h3>
        <p>${p.desc}</p>
        <div class="prod-price">${fmtRp(p.price)}<small>${p.tag}</small></div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <button class="btn btn-primary btn-sm btn-block" onclick="event.stopPropagation();buyNow('${p.id}')">Beli Sekarang</button>
          <button class="btn btn-ghost btn-sm btn-block" onclick="event.stopPropagation();openProduct('${p.id}')">Detail</button>
        </div>
      </div>`).join('')}
  </div>`;
}
function ProdukSection(){
  return `
  <div class="wrap section" id="produk">
    <div class="section-head">
      <div class="kicker">Produk Kami</div>
      <h2>Produk pilihan ${SITE_NAME}</h2>
      <p>Temukan produk favoritmu dengan proses checkout yang mudah, cepat, dan aman.</p>
    </div>
    ${ProductGrid()}
  </div>`;
}
function SellerCta(){
  return `
  <div class="wrap section" id="jadi-seller">
    <div class="reseller-cta">
      <div>
        <div class="kicker">Peluang Bisnis</div>
        <h2>Ubah belanjamu jadi peluang bisnis</h2>
        <div class="reseller-points">
          <div class="pt"><div class="n">1</div><div><b>Daftar, gratis</b><span>Belanja seperti biasa, bagikan kode referralmu, dan dapatkan komisi dari setiap penjualan.</span></div></div>
          <div class="pt"><div class="n">2</div><div><b>Bagikan kode referral</b><span>Ajak teman dan keluarga bergabung, dan bangun jaringan mitra dalam struktur matrix.</span></div></div>
          <div class="pt"><div class="n">3</div><div><b>Pantau & tarik komisi</b><span>Dashboard real-time untuk order, komisi, dan pertumbuhan jaringanmu.</span></div></div>
        </div>
        <button class="btn btn-primary" onclick="openAuth('register')">Daftar Sekarang</button>
      </div>
      <div class="reseller-visual">
        <div class="fake-stat"><div class="l">Biaya pendaftaran</div><div class="v" style="color:var(--gold-2)">Gratis</div></div>
        <div class="fake-stat"><div class="l">Sistem Komisi</div><div class="v">Otomatis</div></div>
        <div class="fake-stat"><div class="l">Kode referral pribadi</div><div class="v">Otomatis</div></div>
        <div class="fake-stat"><div class="l">Jaringan referral</div><div class="v" style="color:var(--leaf)">Matrix</div></div>
      </div>
    </div>
  </div>`;
}
function Foot(){
  return `<footer><div class="wrap foot-row">
    <div class="brand" style="font-size:14.5px;">${brandMark(28)}${SITE_NAME}</div>
    <div class="text-dim">© 2026 ${SITE_NAME}. Tim internal? <a onclick="openAuth('login')" style="color:var(--gold-2);font-weight:600;">Masuk ke Portal →</a></div>
  </div></footer>`;
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
      <div class="modal-top"><div>${p.image?`<img class="prod-img-flat" style="width:110px;height:110px;" src="${p.image}" alt="${p.name}">`:`<div class="prod-hex" style="margin:0 0 12px;">${ic('package',28)}</div>`}<h3>${p.name}</h3></div><button class="x-btn" onclick="closeProduct()">${ic('close',16)}</button></div>
      <p style="color:var(--text-dim);font-size:14px;line-height:1.65;">${p.desc}</p>
      <div style="display:flex;justify-content:space-between;align-items:center;margin:18px 0 20px;padding:14px 16px;background:var(--card);border-radius:var(--radius-md);">
        <div><div style="font-size:11px;color:var(--text-dimmer);">Harga retail</div><div style="font-size:20px;font-weight:700;">${fmtRp(p.price)}</div></div>
        <span class="badge badge-gold">${p.tag}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="btn btn-primary btn-block" onclick="buyNow('${p.id}')">Beli Sekarang</button>
        <button class="btn btn-ghost btn-block" onclick="addToCart('${p.id}')">Tambah ke Keranjang</button>
      </div>
    </div>
  </div>`;
}
function openProduct(id){ state.productModal=id; render(); }
function closeProduct(){ state.productModal=null; render(); }
function openCart(){ state.cartOpen=true; render(); }
function closeCart(){ state.cartOpen=false; render(); }
function addToCart(pid){
  const p = state.products.find(x=>x.id===pid);
  if(!p) return;
  const ex = state.cart.find(c=>c.id===pid);
  if(ex) ex.qty++; else state.cart.push({id:p.id, name:p.name, price:p.price, qty:1});
  state.productModal=null; state.cartOpen=true; toast('Ditambahkan ke keranjang');
}
function buyNow(pid){
  const p = state.products.find(x=>x.id===pid);
  if(!p) return;
  state.cart = [{id:p.id, name:p.name, price:p.price, qty:1}];
  state.productModal=null; state.cartOpen=false;
  openCheckout();
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
      ${state.cart.length===0?`<div class="empty-state"><div class="em">${ic('cart',32)}</div>Keranjang masih kosong.</div>`:
      state.cart.map(c=>{
        const prod = state.products.find(p=>p.id===c.id);
        return `
      <div class="cart-item"><div class="ic">${prod&&prod.image?`<img src="${prod.image}">`:`${ic('package',20)}`}</div>
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
function openCheckout(){ if(state.cart.length===0) return; state.formModal={type:'checkout'}; render(); setTimeout(()=>{ updateCheckoutSummary(); updatePaymentDetail(); onCheckoutAddrChange(); },0); }
function closeFormModal(){ state.formModal=null; render(); }

function CheckoutModal(){
  if(!state.formModal || state.formModal.type!=='checkout') return '';
  const u = currentUser();
  const methods = activePayments();
  const midtransOn = MIDTRANS_CLIENT_KEY && !MIDTRANS_CLIENT_KEY.startsWith('GANTI');
  return `
  <div class="overlay" onclick="if(event.target===this) closeFormModal()">
    <div class="modal">
      <div class="modal-top"><h3>Checkout Pesanan</h3><button class="x-btn" onclick="closeFormModal()">✕</button></div>
      <form onsubmit="submitCheckout(event)">
        <div class="field"><label>Nama Kamu</label><input required id="co-name" value="${esc(u?u.name:'')}"></div>
        <div class="field"><label>Nomor WhatsApp</label><input required id="co-wa" placeholder="08xxxxxxxxxx"></div>
        ${checkoutAddressBlock(u)}
        <div class="field"><label>Kode Referral (opsional)</label><input id="co-ref" value="${esc(pendingRef())}" oninput="updateCheckoutSummary()" placeholder="Contoh: BAGAS10">
          <div class="field-hint">Punya kode referral dari mitra yang mengajakmu? Masukkan di sini agar komisi masuk ke jaringannya.</div>
          <div id="co-ref-hint" style="margin-top:6px;"></div>
        </div>
        <div id="co-summary" style="padding:14px 16px;background:var(--card);border-radius:var(--radius-md);margin-bottom:18px;"></div>
        <div class="field"><label>Metode Pembayaran</label>
          ${methods.length===0?`<div class="field-hint">Metode pembayaran belum diatur. Pesananmu akan dikonfirmasi lewat WhatsApp.</div>`:
          `<div class="pay-list">${methods.map((p,i)=>`
            <label class="pay-opt"><input type="radio" name="co-pay" value="${p.id}" ${i===0?'checked':''} onchange="updatePaymentDetail()">
              <span class="pay-ic">${payIcon(p.type)}</span><span><b>${esc(p.name)}</b><small>${payTypeLabel(p.type)}</small></span></label>`).join('')}</div>
          <div id="co-pay-detail"></div>`}
        </div>
        <button class="btn btn-primary btn-block" type="submit">Buat Pesanan & Lihat Cara Bayar</button>
        ${midtransOn?`<button id="midtrans-pay-btn" type="button" class="btn btn-ghost btn-block" style="margin-top:10px;" onclick="payWithMidtrans()">💳 Bayar Otomatis (Midtrans)</button>`:''}
        <div class="field-hint" style="text-align:center;margin-top:10px;"></div>
      </form>
    </div>
  </div>`;
}
function checkoutCalc(refInput){
  const subtotal = state.cart.reduce((a,c)=>a+c.price*c.qty,0);
  const res = resolveRefCode(refInput);
  const mode = res.type==='member' ? 'member' : (res.type==='invalid' ? 'invalid' : 'none');
  return {subtotal, total:subtotal, mode, res};
}
function updateCheckoutSummary(){
  const refEl = document.getElementById('co-ref');
  const summaryEl = document.getElementById('co-summary');
  const hintEl = document.getElementById('co-ref-hint');
  if(!refEl || !summaryEl) return;
  const c = checkoutCalc(refEl.value);
  let rows = `<div style="display:flex;justify-content:space-between;font-size:13.5px;color:var(--text-dim);margin-bottom:6px;"><span>Subtotal</span><span>${fmtRp(c.subtotal)}</span></div>`;
  rows += `<div style="display:flex;justify-content:space-between;font-weight:700;padding-top:8px;border-top:1px solid var(--border);"><span>Total</span><span>${fmtRp(c.total)}</span></div>`;
  summaryEl.innerHTML = rows;
  if(hintEl){
    if(c.mode==='member') hintEl.innerHTML = `<span style="color:var(--leaf);font-size:12px;">✓ Kode referral <b>${c.res.member.refCode}</b> valid — komisi masuk ke mitra ini.</span>`;
    else if(c.mode==='invalid') hintEl.innerHTML = `<span style="color:var(--red);font-size:12px;">Kode tidak ditemukan.</span>`;
    else hintEl.innerHTML = '';
  }
}
/* Bangun objek order dari isi keranjang + kode referral yang dipakai.
   Dipakai bersama oleh alur WhatsApp manual maupun alur Midtrans online. */
function buildOrderObject(name, wa, refInput, paymentMethod, ship){
  const c = checkoutCalc(refInput);
  const member = c.mode==='member' ? c.res.member : null;
  const items = state.cart.map(cc=>({id:cc.id, name:cc.name, qty:cc.qty, unitPrice:cc.price, basePrice: (state.products.find(p=>p.id===cc.id)||{}).basePrice||0}));
  const order = {
    id:'o'+Math.floor(1000+Math.random()*9000), buyerName:name, buyerWa:wa, buyerAddress: ship?addressFull(ship):'', shipping: ship||null, total:c.total, status:'Diproses',
    date:new Date().toISOString().slice(0,10), refCode: member?member.refCode:null,
    items, paymentMethod: paymentMethod||'whatsapp',
    userId: (currentUser()||{}).id || null,
    paymentStatus: paymentMethod==='midtrans' ? undefined : 'Belum Dibayar'
  };
  return {order, c, member};
}
function submitCheckout(e){
  e.preventDefault();
  const name = document.getElementById('co-name').value.trim();
  const wa = document.getElementById('co-wa').value.trim();
  const ga = getCheckoutAddress();
  if(ga.error){ toast(ga.error); return; }
  const refInput = document.getElementById('co-ref').value.trim().toUpperCase();
  const methods = activePayments();
  const sel = document.querySelector('input[name="co-pay"]:checked');
  const pm = sel ? methods.find(m=>m.id===sel.value) : null;
  if(methods.length && !pm){ toast('Pilih metode pembayaran dulu'); return; }
  const u = currentUser();
  const {order, c} = buildOrderObject(name, wa, refInput, pm ? pm.name : 'Konfirmasi WhatsApp', ga.addr);
  order.paymentMethodId = pm ? pm.id : null;
  state.orders.unshift(order);
  if(u && u.role==='member'){ u.totalSpend = (u.totalSpend||0) + c.total; }
  persist();
  state.cart=[]; state.cartOpen=false;
  state.proofDraft = null;
  state.formModal = {type:'payinfo', orderId:order.id, fresh:true};
  render();
}
function PaymentInfoModal(){
  const f = state.formModal;
  if(!f || f.type!=='payinfo') return '';
  const o = state.orders.find(x=>x.id===f.orderId);
  if(!o) return '';
  const pm = (state.settings.paymentMethods||[]).find(m=>m.id===o.paymentMethodId);
  return `
  <div class="overlay" onclick="if(event.target===this) closeFormModal()">
    <div class="modal">
      <div class="modal-top"><h3>${f.fresh?`Pesanan #${o.id} Dibuat 🎉`:`Pembayaran Pesanan #${o.id}`}</h3><button class="x-btn" onclick="closeFormModal()">✕</button></div>
      <div style="padding:14px 16px;background:var(--card);border-radius:var(--radius-md);margin-bottom:16px;">
        <div style="font-size:12px;color:var(--text-dimmer);">Total yang harus dibayar</div>
        <div style="font-size:24px;font-weight:700;">${fmtRp(o.total)}</div>
      </div>
      ${pm ? `<div style="font-weight:600;margin-bottom:8px;">Bayar via ${esc(pm.name)}</div>${paymentDetailHtml(pm)}` : `<div class="field-hint">Admin akan mengirim info pembayaran lewat WhatsApp.</div>`}
      ${proofUploadBlock(o)}
      <div class="field-hint" style="margin:14px 0;">${orderNeedsProof(o)?'Pesananmu diproses setelah pembayaran dikonfirmasi admin. Bukti bisa dikirim nanti dari menu Riwayat Pesanan.':'Pesananmu akan segera diproses.'}</div>
    </div>
  </div>`;
}
function confirmPaymentWa(id){
  const o = state.orders.find(x=>x.id===id); if(!o) return;
  openWhatsAppOrder({
    orderId:o.id, name:o.buyerName, wa:o.buyerWa, address:o.buyerAddress, items:o.items,
    subtotal:o.items.reduce((a,i)=>a+i.unitPrice*i.qty,0), total:o.total,
    refCode:o.refCode||null, paymentName:o.paymentMethod,
  });
}
async function payWithMidtrans(){
  const name = document.getElementById('co-name').value.trim();
  const wa = document.getElementById('co-wa').value.trim();
  if(!name || !wa){ toast('Isi nama & nomor WhatsApp dulu'); return; }
  const ga = getCheckoutAddress();
  if(ga.error){ toast(ga.error); return; }
  if(!window.snap){ toast('Modul pembayaran belum siap, coba lagi sebentar.'); loadMidtransSnap(); return; }
  const refInput = document.getElementById('co-ref').value.trim().toUpperCase();
  const {order} = buildOrderObject(name, wa, refInput, 'midtrans', ga.addr);

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
    { const cu=currentUser(); if(cu && ga.isNew) addAddressToUser(cu, ga.addr, false); }
    persist();
    state.cart=[]; state.cartOpen=false; state.formModal=null; render();

    window.snap.pay(data.token, {
      onSuccess: function(){ toast('Pembayaran berhasil! Pesanan sedang diproses.'); const u=currentUser(); if(u&&u.role==='member'){ u.totalSpend=(u.totalSpend||0)+order.total; persist(); } },
      onPending: function(){ toast('Menunggu pembayaranmu diselesaikan.'); },
      onError: function(){ toast('Pembayaran gagal, silakan coba lagi atau pakai WhatsApp.'); },
      onClose: function(){ toast('Jendela pembayaran ditutup sebelum selesai.'); },
    });
  }catch(err){
    console.error(err);
    toast('Gagal memproses pembayaran online. Coba metode WhatsApp.');
  }finally{
    if(btn){ btn.disabled=false; btn.textContent='💳 Bayar Otomatis (Midtrans)'; }
  }
}

/* =====================================================
   AUTH: LOGIN / REGISTER
===================================================== */
function openAuth(tab){
  state.authModal = {tab: tab||'login'};
  state.regTemp = {};
  render();
}
function closeAuth(){ state.authModal=null; render(); }
function setAuthTab(tab){ state.authModal = {tab}; render(); }

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
      </div>
    </div>`;
  }
  // register: satu langkah — tidak ada pilihan peran, semua akun otomatis jadi mitra referral
  return `
  <div class="overlay" onclick="if(event.target===this) closeAuth()">
    <div class="modal">
      <div class="modal-top"><h3>Buat Akun Baru</h3><button class="x-btn" onclick="closeAuth()">✕</button></div>
      <div class="auth-tabs">
        <div class="auth-tab" onclick="setAuthTab('login')">Masuk</div>
        <div class="auth-tab active">Daftar</div>
      </div>
      <form onsubmit="submitRegistration(event)">
        <div class="field"><label>Nama Lengkap</label><input required id="rg-name"></div>
        <div class="field"><label>Email</label><input required type="email" id="rg-email"></div>
        ${pwField('rg-pass','Buat Kata Sandi')}
        <div class="field"><label>Kode Referral Upline (opsional)</label><input id="rg-upline" value="${esc(pendingRef())}" placeholder="Contoh: BAGAS10" style="text-transform:uppercase;">
          <div class="field-hint">Punya kode dari pengguna lain? Isi agar kamu masuk ke jaringan matrix-nya.</div></div>
        <button class="btn btn-primary btn-block" type="submit">Buat Akun</button>
      </form>
    </div>
  </div>`;
}
function submitRegistration(e){
  e.preventDefault();
  const t = state.regTemp = state.regTemp || {};
  t.name = document.getElementById('rg-name').value;
  t.email = document.getElementById('rg-email').value;
  t.password = document.getElementById('rg-pass').value;
  t.uplineCode = document.getElementById('rg-upline').value.trim().toUpperCase();
  if(t.uplineCode && !sellerByCode(t.uplineCode)){
    toast('Kode referral upline tidak ditemukan.'); return;
  }
  if(state.users.some(u=>u.email.toLowerCase()===t.email.toLowerCase())){
    toast('Email sudah terdaftar, coba masuk.'); return;
  }
  finishRegistration();
}
function finishRegistration(){
  const t = state.regTemp;
  const id = 'u'+Date.now();
  let code, guard=0;
  do{ code = t.name.split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g,'')+Math.floor(Math.random()*90+10); guard++; }
  while(guard<20 && state.users.some(x=>x.refCode===code));
  const sponsor = sellerByCode(t.uplineCode);
  const parentId = sponsor ? findPlacement(sponsor.id) : null;
  const user = { id, name:t.name, email:t.email, password:t.password, role:'member', avatar:'', refCode:code, readNotifIds:[], sponsorId: sponsor?sponsor.id:null, parentId, totalSpend:0 };
  state.users.push(user);
  state.currentUser = id;
  saveSession(id);
  persist();
  state.authModal=null;
  toast('Akun berhasil dibuat! Selamat datang, ' + t.name.split(' ')[0]);
  if(sponsor && parentId!==sponsor.id) setTimeout(()=>toast('Posisi sponsor penuh, kamu ditempatkan otomatis di jaringannya (spillover).'), 2800);
  location.hash = '#/akun';
}
function saveSession(uid){
  try{
    if(uid) localStorage.setItem('glowness_uid', uid);
    else localStorage.removeItem('glowness_uid');
  }catch(e){}
}
function restoreSession(){
  try{
    const uid = localStorage.getItem('glowness_uid');
    if(!uid) return;
    if(state.users.some(u=>u.id===uid)) state.currentUser = uid;
    else localStorage.removeItem('glowness_uid');
  }catch(e){}
}
function submitLogin(e){
  e.preventDefault();
  const email = document.getElementById('lg-email').value.trim().toLowerCase();
  const pass = document.getElementById('lg-pass').value;
  const u = state.users.find(x=>x.email.toLowerCase()===email && x.password===pass);
  if(!u){ toast('Email atau kata sandi salah'); return; }
  state.currentUser = u.id;
  saveSession(u.id);
  state.authModal=null;
  toast('Berhasil masuk, halo ' + u.name.split(' ')[0]);
  if(u.role==='admin'||u.role==='owner') location.hash='#/portal/dashboard';
  else location.hash='#/akun';
}
function doLogout(){
  state.currentUser=null;
  saveSession(null);
  location.hash='#/beranda';
  render();
}

/* =====================================================
   CUSTOMER ACCOUNT PAGES (#/akun, #/akun/pesanan, #/akun/profil, #/akun/keamanan)
===================================================== */
function CustomerSidebar(u, active, unreadNotif){
  if(unreadNotif===undefined){
    unreadNotif = (state.notifications||[]).filter(n=>!(u.readNotifIds||[]).includes(n.id)).length;
  }
  const chatUnread = chatUnreadForUser(u.id);
  const items = [
    {icon:'chart', label:'Ringkasan', route:'#/akun'},
    {icon:'star', label:'Dashboard Mitra', route:'#/seller'},
    {icon:'bag', label:'Riwayat Pesanan', route:'#/akun/pesanan'},
    {icon:'link', label:'Referral & Matrix', route:'#/seller/referral'},
    {icon:'chat', label:'Chat Admin', route:'#/akun/chat', badge:chatUnread},
    {icon:'bell', label:'Pemberitahuan', route:'#/seller/pemberitahuan', badge:unreadNotif},
    {icon:'user', label:'Profil Saya', route:'#/akun/profil'},
    {icon:'map', label:'Alamat Saya', route:'#/akun/alamat'},
    {icon:'lock', label:'Keamanan', route:'#/akun/keamanan'},
    {icon:'wallet', label:'Penarikan Dana', route:'#/seller/penarikan'},
  ];
  return `
  <div class="sidebar">
    <div class="brand">${brandMark(30)}GLOWNESS</div>
    <button class="dash-menu-btn" onclick="toggleDashMenu()" aria-label="Menu">${state.dashMenuOpen?ic('close',18):ic('menu',18)}</button>
    ${state.dashMenuOpen?`<div class="dash-sidebar-backdrop" onclick="closeDashMenu()"></div>`:''}
    <div class="sidebar-nav ${state.dashMenuOpen?'open':''}">
      <div class="side-user"><div class="av">${avatarHtml(u)}</div><div><div class="name">${u.name}</div><div class="role">Member</div></div></div>
      <div class="nav-label">Menu</div>
      ${items.map(it=>`<a class="nav-item ${active===it.route?'active':''}" href="${it.route}" onclick="closeDashMenu()"><span class="ic">${ic(it.icon,16)}</span>${it.label}${it.badge?`<span class="nav-badge">${it.badge}</span>`:''}</a>`).join('')}
      <div class="sidebar-foot">
        <div class="sidebar-theme">${themeToggleBtn()}<span style="font-size:12.5px;color:var(--text-dim);">Tema ${state.theme==='light'?'Terang':'Gelap'}</span></div>
        <a class="nav-item" href="#/beranda" onclick="closeDashMenu()"><span class="ic">${ic('store',16)}</span>Lihat Toko</a>
        <a class="nav-item" onclick="doLogout()"><span class="ic">${ic('logout',16)}</span>Keluar</a>
      </div>
    </div>
  </div>`;
}
function SellerSidebar(u, active, unreadNotif){ return CustomerSidebar(u, active, unreadNotif); }
function pageAkunRingkasan(u){
  const myOrders = myOwnOrders(u);
  const recentOrders = myOrders.slice(0,5);
  return `
  <div class="pg-head"><div><h1 class="serif">Halo, ${u.name.split(' ')[0]} 👋</h1><p>Kelola akun & pantau peluang bisnismu di sini.</p></div></div>
  <div class="stat-grid">
    <div class="stat-card"><div class="lbl">Total Belanja</div><div class="val">${fmtRp(u.totalSpend||0)}</div></div>
    <div class="stat-card"><div class="lbl">Jumlah Pesanan</div><div class="val">${myOrders.length}</div></div>
    <div class="stat-card"><div class="lbl">Kode Referral</div><div class="val" style="font-size:17px;">${esc(u.refCode||'-')}</div></div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Pesanan Terbaru</h3><a onclick="location.hash='#/akun/pesanan'" style="font-size:12.5px;color:var(--gold-2);font-weight:600;">Lihat semua →</a></div>
    <div class="table-scroll">${ordersTableSimple(recentOrders,true)}</div>
  </div>`;
}
function myOwnOrders(u){ return state.orders.filter(o=>o.userId ? o.userId===u.id : o.buyerName===u.name); }
function pageAkunPesanan(u){
  const myOrders = myOwnOrders(u);
  return `
  <div class="pg-head"><div><h1>Riwayat Pesanan</h1><p>Semua transaksi yang pernah kamu buat.</p></div></div>
  <div class="panel">
    <div class="table-scroll">${ordersTableSimple(myOrders,true)}</div>
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
    <div class="field"><label>Alamat</label><a class="btn btn-soft btn-sm" href="#/akun/alamat">📍 Kelola Alamat Saya</a></div>
    <button class="btn btn-primary" onclick="saveProfileName()">Simpan Profil</button>
  </div>`;
}
/* =====================================================
   ALAMAT PENGIRIMAN (banyak alamat per akun)
   user.addresses = [{id,label,recipient,phone,street,district,city,province,postal,note,isDefault}]
===================================================== */
const ADDR_LABELS = ['Rumah','Kantor','Kos / Apartemen','Toko','Lainnya'];
function userAddresses(u){ return (u && Array.isArray(u.addresses)) ? u.addresses : []; }
function defaultAddress(u){ const l=userAddresses(u); return l.find(a=>a.isDefault) || l[0] || null; }
function addressLine(a){
  if(!a) return '';
  const parts = [a.street, a.district, a.city, a.province].filter(Boolean).join(', ');
  return parts + (a.postal ? ' '+a.postal : '');
}
function addressFull(a){
  if(!a) return '';
  let s = `${a.recipient||''}${a.phone?' ('+a.phone+')':''} — ${addressLine(a)}`;
  if(a.note) s += ` [Patokan: ${a.note}]`;
  return s;
}
function userAddrText(u){
  const d = defaultAddress(u);
  return d ? addressFull(d) : (u.address||'');
}
function userAddrHtml(u){
  const l = userAddresses(u);
  if(!l.length) return u.address ? `<span style="font-size:12.5px;">${esc(u.address)}</span>` : '<span style="color:var(--text-dimmer);">Belum diisi</span>';
  return l.map(a=>`<div style="margin-bottom:10px;line-height:1.5;">
    <span class="badge badge-copper">${esc(a.label)}</span>${a.isDefault?' <span class="badge badge-green">Utama</span>':''}
    <div style="font-weight:600;font-size:13px;margin-top:3px;">${esc(a.recipient)} · ${esc(a.phone)}</div>
    <div style="font-size:12.5px;color:var(--text-dim);white-space:normal;">${esc(addressLine(a))}${a.note?`<br>Patokan: ${esc(a.note)}`:''}</div>
  </div>`).join('');
}
function addrFieldsHtml(p, a){
  a = a || {};
  const lab = a.label || 'Rumah';
  const two = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';
  return `
    <div class="field"><label>Label Alamat</label>
      <select id="${p}-label">${ADDR_LABELS.map(l=>`<option ${l===lab?'selected':''}>${l}</option>`).join('')}</select></div>
    <div style="${two}">
      <div class="field"><label>Nama Penerima</label><input id="${p}-recipient" value="${esc(a.recipient||'')}"></div>
      <div class="field"><label>No. HP Penerima</label><input id="${p}-phone" value="${esc(a.phone||'')}" placeholder="08xxxxxxxxxx"></div>
    </div>
    <div class="field"><label>Alamat Lengkap</label><textarea id="${p}-street" placeholder="Nama jalan, nomor rumah, RT/RW, gedung">${esc(a.street||'')}</textarea></div>
    <div style="${two}">
      <div class="field"><label>Kelurahan / Kecamatan</label><input id="${p}-district" value="${esc(a.district||'')}" placeholder="Contoh: Medan Petisah"></div>
      <div class="field"><label>Kota / Kabupaten</label><input id="${p}-city" value="${esc(a.city||'')}" placeholder="Contoh: Medan"></div>
    </div>
    <div style="${two}">
      <div class="field"><label>Provinsi</label><input id="${p}-province" value="${esc(a.province||'')}" placeholder="Contoh: Sumatera Utara"></div>
      <div class="field"><label>Kode Pos</label><input id="${p}-postal" value="${esc(a.postal||'')}" inputmode="numeric" maxlength="5" placeholder="5 digit"></div>
    </div>
    <div class="field"><label>Patokan / Catatan Kurir (opsional)</label><input id="${p}-note" value="${esc(a.note||'')}" placeholder="Contoh: pagar hitam, dekat masjid"></div>`;
}
function readAddrFields(p){
  const g = id => (document.getElementById(p+'-'+id)||{value:''}).value.trim();
  const a = { label:g('label')||'Rumah', recipient:g('recipient'), phone:g('phone'), street:g('street'),
              district:g('district'), city:g('city'), province:g('province'), postal:g('postal'), note:g('note') };
  if(!a.recipient) return {error:'Nama penerima wajib diisi'};
  if(!a.phone) return {error:'No. HP penerima wajib diisi'};
  if(!a.street) return {error:'Alamat lengkap wajib diisi'};
  if(!a.district) return {error:'Kelurahan / Kecamatan wajib diisi'};
  if(!a.city) return {error:'Kota / Kabupaten wajib diisi'};
  if(!a.province) return {error:'Provinsi wajib diisi'};
  if(!/^\d{5}$/.test(a.postal)) return {error:'Kode pos harus 5 digit angka'};
  return {addr:a};
}
function addAddressToUser(u, a, makeDefault){
  if(!Array.isArray(u.addresses)) u.addresses = [];
  const first = u.addresses.length===0;
  const rec = Object.assign({id:'ad'+Date.now()+Math.floor(Math.random()*100)}, a, {isDefault: first || !!makeDefault});
  if(rec.isDefault) u.addresses.forEach(x=>x.isDefault=false);
  rec.isDefault = first || !!makeDefault;
  u.addresses.push(rec);
  return rec;
}
function pageAkunAlamat(u){
  const list = userAddresses(u);
  return `
  <div class="pg-head"><div><h1>Alamat Saya</h1><p>Alamat tujuan pengiriman pesananmu. Wajib ada saat memesan.</p></div>
    <button class="btn btn-primary btn-sm" onclick="openAddressForm()">+ Tambah Alamat</button></div>
  ${list.length===0 ? `<div class="panel"><div class="empty-state"><div class="em">📍</div>Belum ada alamat. Klik “Tambah Alamat” untuk menambahkan.${u.address?`<div class="field-hint" style="margin-top:8px;">Alamat lama di profil: ${esc(u.address)}</div>`:''}</div></div>` :
  list.map(a=>`
  <div class="panel" style="margin-bottom:14px;">
    <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start;">
      <div style="min-width:0;flex:1;">
        <div style="margin-bottom:6px;"><span class="badge badge-copper">${esc(a.label)}</span> ${a.isDefault?'<span class="badge badge-green">Utama</span>':''}</div>
        <div style="font-weight:600;">${esc(a.recipient)} · ${esc(a.phone)}</div>
        <div style="font-size:13.5px;color:var(--text-dim);line-height:1.6;margin-top:4px;">${esc(addressLine(a))}</div>
        ${a.note?`<div class="field-hint">Patokan: ${esc(a.note)}</div>`:''}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${a.isDefault?'':`<button class="btn btn-soft btn-sm" onclick="setDefaultAddress('${a.id}')">Jadikan Utama</button>`}
        <button class="btn btn-ghost btn-sm" onclick="openAddressForm('${a.id}')">Ubah</button>
        <button class="btn btn-danger btn-sm" onclick="deleteAddress('${a.id}')">Hapus</button>
      </div>
    </div>
  </div>`).join('')}`;
}
function openAddressForm(id){ state.formModal = {type:'address', id:id||null}; render(); }
function AddressModal(){
  const f = state.formModal;
  if(!f || f.type!=='address') return '';
  const u = currentUser();
  const a = f.id ? userAddresses(u).find(x=>x.id===f.id) : null;
  const base = a || {recipient:u?u.name:''};
  const isDef = a ? a.isDefault : true;
  return `
  <div class="overlay" onclick="if(event.target===this) closeFormModal()">
    <div class="modal">
      <div class="modal-top"><h3>${a?'Ubah Alamat':'Tambah Alamat'}</h3><button class="x-btn" onclick="closeFormModal()">✕</button></div>
      <form onsubmit="saveAddress(event)">
        ${addrFieldsHtml('af', base)}
        <div class="field" style="display:flex;align-items:center;gap:10px;"><input type="checkbox" id="af-default" style="width:auto;" ${isDef?'checked':''}><label style="margin:0;">Jadikan alamat utama</label></div>
        <button class="btn btn-primary btn-block" type="submit">Simpan Alamat</button>
      </form>
    </div>
  </div>`;
}
function saveAddress(e){
  e.preventDefault();
  const u = currentUser(); if(!u) return;
  const r = readAddrFields('af');
  if(r.error){ toast(r.error); return; }
  const makeDef = document.getElementById('af-default').checked;
  const id = state.formModal && state.formModal.id;
  if(id){
    const ex = userAddresses(u).find(x=>x.id===id);
    if(ex){
      Object.assign(ex, r.addr);
      if(makeDef){ u.addresses.forEach(x=>x.isDefault=false); ex.isDefault = true; }
    }
  }else{
    addAddressToUser(u, r.addr, makeDef);
  }
  persist(); state.formModal=null; render(); toast('Alamat disimpan');
}
function setDefaultAddress(id){
  const u = currentUser(); if(!u) return;
  userAddresses(u).forEach(x=>x.isDefault = (x.id===id));
  persist(); render(); toast('Alamat utama diperbarui');
}
function deleteAddress(id){
  const u = currentUser(); if(!u) return;
  if(!confirm('Hapus alamat ini?')) return;
  const wasDef = (userAddresses(u).find(x=>x.id===id)||{}).isDefault;
  u.addresses = userAddresses(u).filter(x=>x.id!==id);
  if(wasDef && u.addresses.length) u.addresses[0].isDefault = true;
  persist(); render(); toast('Alamat dihapus');
}
/* --- blok alamat di checkout: hanya pilih dari Alamat Saya --- */
function checkoutAddressBlock(u){
  const list = userAddresses(u);
  const def = defaultAddress(u);
  if(!u || u.role!=='member'){
    return `<div class="field"><label>Alamat Pengiriman</label>
      <div class="addr-locked">
        <div class="addr-locked-ic">${ic('map',22)}</div>
        <div>Login dulu, lalu isi alamat di <b>Akun → Alamat Saya</b> sebelum checkout.</div>
        <button type="button" class="btn btn-soft btn-sm" style="margin-top:10px;" onclick="closeFormModal();openAuth('login')">Masuk / Daftar</button>
      </div></div>`;
  }
  if(!list.length){
    return `<div class="field"><label>Alamat Pengiriman</label>
      <div class="addr-locked">
        <div class="addr-locked-ic">${ic('map',22)}</div>
        <div>Belum ada alamat tersimpan. Tambahkan dulu di menu Alamat Saya.</div>
        <a class="btn btn-soft btn-sm" style="margin-top:10px;" href="#/akun/alamat" onclick="closeFormModal()">Kelola Alamat</a>
      </div></div>`;
  }
  return `
  <div class="field"><label>Alamat Pengiriman</label>
    <select id="co-addr-sel" onchange="onCheckoutAddrChange()" required>
      ${list.map(a=>`<option value="${a.id}" ${def&&def.id===a.id?'selected':''}>${esc(a.label)} — ${esc(a.recipient)}${a.isDefault?' (Utama)':''}</option>`).join('')}
    </select>
    <div id="co-addr-preview" class="field-hint" style="margin-top:8px;line-height:1.6;"></div>
    <div class="field-hint" style="margin-top:6px;">Ubah atau tambah alamat lewat <a href="#/akun/alamat" onclick="closeFormModal()" style="color:var(--gold-2);font-weight:600;">Akun → Alamat Saya</a>.</div>
  </div>`;
}
function onCheckoutAddrChange(){
  const sel = document.getElementById('co-addr-sel');
  const pv = document.getElementById('co-addr-preview');
  if(!sel || !pv) return;
  const a = userAddresses(currentUser()).find(x=>x.id===sel.value);
  pv.innerHTML = a ? `${esc(a.recipient)} · ${esc(a.phone)}<br>${esc(addressLine(a))}${a.note?`<br>Patokan: ${esc(a.note)}`:''}` : '';
}
/* ambil alamat dari checkout → hanya alamat tersimpan */
function getCheckoutAddress(){
  const u = currentUser();
  if(!u || u.role!=='member') return {error:'Login dulu dan isi alamat di Akun → Alamat Saya'};
  const list = userAddresses(u);
  if(!list.length) return {error:'Tambahkan alamat di Akun → Alamat Saya sebelum checkout'};
  const sel = document.getElementById('co-addr-sel');
  const id = sel ? sel.value : (defaultAddress(u)||{}).id;
  const a = list.find(x=>x.id===id) || defaultAddress(u);
  if(!a) return {error:'Pilih alamat pengiriman'};
  return {addr:a, isNew:false};
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
  if(!u || u.role!=='member'){ location.hash='#/beranda'; return ''; }
  let content;
  switch(state.route){
    case '#/akun/pesanan': content = pageAkunPesanan(u); break;
    case '#/akun/profil': content = pageAkunProfil(u); break;
    case '#/akun/alamat': content = pageAkunAlamat(u); break;
    case '#/akun/keamanan': content = pageAkunKeamanan(u); break;
    case '#/akun/chat': content = pageAkunChat(u); break;
    default: content = pageAkunRingkasan(u);
  }
  return `<div class="dash-wrap">${CustomerSidebar(u, state.route)}<div class="dash-main">${content}</div></div>${PaymentInfoModal()}${AddressModal()}${Toast()}`;
}

/* =====================================================
   CHAT ADMIN (web)
   Thread: {id, userId, userName, guestName?, messages:[{id,from,text,at,read}], updatedAt}
===================================================== */
function guestChatKey(){
  try{
    let k = localStorage.getItem('gl_guest_chat');
    if(!k){ k = 'g'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); localStorage.setItem('gl_guest_chat', k); }
    return k;
  }catch(e){ return 'guest'; }
}
function myChatThreadId(){
  const u = currentUser();
  if(u && u.role==='member') return u.id;
  return guestChatKey();
}
function getOrCreateThread(uid, name){
  let t = (state.chats||[]).find(c=>c.userId===uid);
  if(!t){
    t = {id:'ch'+Date.now().toString(36), userId:uid, userName:name||'Pengunjung', messages:[], updatedAt:new Date().toISOString()};
    state.chats = state.chats || [];
    state.chats.unshift(t);
  }
  return t;
}
function chatUnreadForUser(uid){
  const t = (state.chats||[]).find(c=>c.userId===uid);
  if(!t) return 0;
  return (t.messages||[]).filter(m=>m.from==='admin' && !m.read).length;
}
function chatUnreadForAdmin(){
  return (state.chats||[]).reduce((n,t)=>n+(t.messages||[]).filter(m=>m.from==='user' && !m.read).length, 0);
}
function markChatRead(thread, asRole){
  if(!thread) return;
  let changed = false;
  (thread.messages||[]).forEach(m=>{
    if(asRole==='user' && m.from==='admin' && !m.read){ m.read=true; changed=true; }
    if(asRole==='admin' && m.from==='user' && !m.read){ m.read=true; changed=true; }
  });
  if(changed) persist();
}
function sendChatMessage(text, from, imageData){
  text = (text||'').trim();
  if(!text && !imageData) return;
  const u = currentUser();
  let uid, name;
  if(from==='admin'){
    const active = state.chatActiveId;
    if(!active){ toast('Pilih percakapan dulu'); return; }
    const t = (state.chats||[]).find(c=>c.id===active || c.userId===active);
    if(!t){ toast('Percakapan tidak ditemukan'); return; }
    t.messages.push({id:'m'+Date.now(), from:'admin', text, image:imageData||null, at:new Date().toISOString(), read:false, name:u?u.name:'Admin'});
    t.updatedAt = new Date().toISOString();
    state.chatDraft = '';
    persist(); render();
    setTimeout(()=>{ const el=document.getElementById('chat-msgs'); if(el) el.scrollTop=el.scrollHeight; }, 50);
    return;
  }
  if(u && u.role==='member'){ uid = u.id; name = u.name; }
  else {
    const nameEl = document.getElementById('chat-guest-name');
    name = (nameEl && nameEl.value.trim()) || 'Pengunjung';
    uid = guestChatKey();
  }
  const t = getOrCreateThread(uid, name);
  t.userName = name;
  t.messages.push({id:'m'+Date.now(), from:'user', text, image:imageData||null, at:new Date().toISOString(), read:false, name});
  t.updatedAt = new Date().toISOString();
  state.chatDraft = '';
  persist(); render();
  setTimeout(()=>{ const el=document.getElementById('chat-msgs'); if(el) el.scrollTop=el.scrollHeight; }, 50);
}
function openChatWidget(){
  state.chatOpen = true;
  const uid = myChatThreadId();
  const t = (state.chats||[]).find(c=>c.userId===uid);
  if(t) markChatRead(t, 'user');
  render();
  setTimeout(()=>{ const el=document.getElementById('chat-msgs'); if(el) el.scrollTop=el.scrollHeight; }, 60);
}
function closeChatWidget(){ state.chatOpen=false; render(); }
function selectAdminChat(id){
  state.chatActiveId = id;
  const t = (state.chats||[]).find(c=>c.id===id || c.userId===id);
  markChatRead(t, 'admin');
  render();
  setTimeout(()=>{ const el=document.getElementById('chat-msgs'); if(el) el.scrollTop=el.scrollHeight; }, 50);
}
function chatAvatarLetter(name){
  const n = (name||'?').trim();
  return (n[0]||'?').toUpperCase();
}
function chatUserById(uid){
  return (state.users||[]).find(x=>x.id===uid) || null;
}
function chatAvatarHtml(uid, name, cls){
  const u = uid ? chatUserById(uid) : null;
  const c = cls || 'dm-avatar';
  if(u && u.avatar) return `<div class="${c}"><img src="${u.avatar}" alt="${esc(u.name||name||'')}"></div>`;
  return `<div class="${c}">${chatAvatarLetter(u?u.name:name)}</div>`;
}
function chatTimeShort(iso){
  if(!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = (now-d)/1000;
  if(diff < 60) return 'baru saja';
  if(diff < 3600) return Math.floor(diff/60)+'m';
  if(diff < 86400) return Math.floor(diff/3600)+'j';
  return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short'});
}
function chatTimeMsg(iso){
  if(!iso) return '';
  return new Date(iso).toLocaleString('id-ID',{hour:'2-digit',minute:'2-digit'});
}
function chatBubbleHtml(msgs, perspective, threadUserId){
  /* perspective: 'user' = member view (user bubbles on right), 'admin' = admin view (admin on right) */
  if(!msgs || !msgs.length) return `<div class="chat-empty"><div class="chat-empty-icon">💬</div><div>Belum ada pesan.<br>Mulai percakapan di bawah.</div></div>`;
  let html = '';
  let lastDay = '';
  msgs.forEach(m=>{
    const day = m.at ? new Date(m.at).toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'}) : '';
    if(day && day!==lastDay){
      html += `<div class="chat-day"><span>${esc(day)}</span></div>`;
      lastDay = day;
    }
    const isMe = perspective==='admin' ? (m.from==='admin') : (m.from==='user');
    const time = chatTimeMsg(m.at);
    let body = '';
    if(m.image){
      body += `<div class="chat-imgs"><a href="${m.image}" target="_blank" rel="noopener"><img src="${m.image}" alt="lampiran"></a></div>`;
    }
    if(m.text) body += `<div class="chat-text">${esc(m.text)}</div>`;
    let av = '';
    if(!isMe){
      if(m.from==='admin') av = `<div class="chat-av admin-av">${brandMark(28)}</div>`;
      else av = chatAvatarHtml(threadUserId || m.userId, m.name, 'chat-av');
    }
    html += `<div class="chat-row-msg ${isMe?'me':'them'}">
      ${av}
      <div class="chat-bubble ${isMe?'me':'them'}">
        ${body}
        <div class="chat-meta">${time}${isMe?' · You':''}</div>
      </div>
    </div>`;
  });
  return html;
}
function chatComposeHtml(fromRole){
  return `
  <div class="chat-compose dm-compose">
    <div class="chat-compose-bar">
      <label class="chat-tool chat-tool-icon" title="Kirim foto" aria-label="Kirim foto">
        <input type="file" accept="image/*" class="hide" onchange="attachChatImage(this,'${fromRole}')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
      </label>
      <input id="chat-input" class="chat-input-main" placeholder="Tulis pesan..." value="${esc(state.chatDraft||'')}" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChatMessage(this.value,'${fromRole}');}">
      <button class="chat-send-btn" onclick="sendChatMessage(document.getElementById('chat-input').value,'${fromRole}')" aria-label="Kirim">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
  </div>`;
}
function attachChatImage(input, fromRole){
  const f = input.files && input.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    shrinkImage(reader.result, 900, (small)=>{
      sendChatMessage('', fromRole, small);
    });
  };
  reader.readAsDataURL(f);
  input.value = '';
}
function ChatWidget(){
  const u = currentUser();
  if(u && (u.role==='admin'||u.role==='owner')) return '';
  const uid = myChatThreadId();
  const t = (state.chats||[]).find(c=>c.userId===uid);
  const unread = t ? (t.messages||[]).filter(m=>m.from==='admin' && !m.read).length : 0;
  if(!state.chatOpen){
    return `<button class="chat-fab" onclick="openChatWidget()" aria-label="Chat Admin"><svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>${unread?`<span class="chat-fab-badge">${unread}</span>`:''}</button>`;
  }
  const guest = !(u && u.role==='member');
  return `
  <div class="chat-widget dm-shell">
    <div class="chat-head dm-head">
      <div class="chat-head-info">
        <div class="dm-avatar admin">${brandMark(36)}</div>
        <div><b>Admin GLOWNESS</b><small class="online-dot">● Online</small></div>
      </div>
      <button class="x-btn" onclick="closeChatWidget()" aria-label="Tutup">✕</button>
    </div>
    <div class="chat-msgs dm-msgs" id="chat-msgs">${chatBubbleHtml(t?t.messages:[], 'user', uid)}</div>
    ${guest?`<div class="chat-guest-bar"><input id="chat-guest-name" placeholder="Namamu (opsional)" value="${esc(t&&t.userName!=='Pengunjung'?t.userName:'')}"></div>`:''}
    ${chatComposeHtml('user')}
  </div>`;
}
function pageAkunChat(u){
  const t = getOrCreateThread(u.id, u.name);
  markChatRead(t, 'user');
  return `
  <div class="dm-page">
    <div class="dm-shell dm-full">
      <div class="chat-head dm-head">
        <div class="chat-head-info">
          <div class="dm-avatar admin">${brandMark(40)}</div>
          <div><b>Admin GLOWNESS</b><small class="online-dot">● Online · Chat Admin</small></div>
        </div>
      </div>
      <div class="chat-msgs dm-msgs" id="chat-msgs">${chatBubbleHtml(t.messages, 'user', u.id)}</div>
      ${chatComposeHtml('user')}
    </div>
  </div>`;
}
function pageStaffChat(){
  const threads = (state.chats||[]).slice().sort((a,b)=>new Date(b.updatedAt||0)-new Date(a.updatedAt||0));
  let active = threads.find(c=>c.id===state.chatActiveId || c.userId===state.chatActiveId);
  if(!active && threads[0]){ active = threads[0]; state.chatActiveId = active.id; markChatRead(active,'admin'); }
  const q = (state.chatSearch||'').toLowerCase();
  const filtered = q ? threads.filter(t=>(t.userName||'').toLowerCase().includes(q)||(t.userId||'').toLowerCase().includes(q)) : threads;
  return `
  <div class="dm-page dm-admin-page">
    <div class="dm-shell dm-full dm-admin">
      <aside class="dm-sidebar">
        <div class="dm-side-top">
          <div class="dm-side-title">Messages</div>
          <div class="dm-search-wrap">
            <span class="dm-search-ic" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></span>
            <input class="dm-search" placeholder="Cari percakapan..." value="${esc(state.chatSearch||'')}" oninput="state.chatSearch=this.value;render()">
          </div>
        </div>
        <div class="dm-side-list">
          <div class="dm-section-label">Pesan</div>
          ${filtered.length===0?`<div class="chat-empty" style="padding:24px 12px;">Belum ada percakapan.</div>`:
            filtered.map(t=>{
              const last = (t.messages||[])[(t.messages||[]).length-1];
              const unread = (t.messages||[]).filter(m=>m.from==='user'&&!m.read).length;
              const preview = last ? (last.image?'Foto':(last.text||'—')) : '—';
              return `<button class="dm-item ${active&&active.id===t.id?'active':''}" onclick="selectAdminChat('${t.id}')">
                ${chatAvatarHtml(t.userId, t.userName, 'dm-avatar')}
                <div class="dm-item-body">
                  <div class="dm-item-top"><b>${esc(t.userName||'Pengunjung')}</b><span>${chatTimeShort(t.updatedAt)}</span></div>
                  <div class="dm-item-preview">${unread?`<em>baru:</em> `:''}${esc(preview)}</div>
                </div>
                ${unread?`<span class="dm-unread">${unread}</span>`:''}
              </button>`;
            }).join('')}
        </div>
      </aside>
      <section class="dm-main">
        ${!active?`<div class="chat-empty"><div class="chat-empty-icon">💬</div><div>Pilih percakapan di kiri.</div></div>`:`
          <div class="chat-head dm-head">
            <div class="chat-head-info">
              ${chatAvatarHtml(active.userId, active.userName, 'dm-avatar')}
              <div><b>${esc(active.userName||'Pengunjung')}</b><small>${esc(active.userId)}</small></div>
            </div>
          </div>
          <div class="chat-msgs dm-msgs" id="chat-msgs">${chatBubbleHtml(active.messages, 'admin', active.userId)}</div>
          ${chatComposeHtml('admin')}
        `}
      </section>
    </div>
  </div>`;
}
function ordersTableSimple(orders, payActions){
  if(orders.length===0) return `<div class="empty-state"><div class="em">🧾</div>Belum ada pesanan.</div>`;
  if(!payActions){
    return `<div class="table-scroll"><table><thead><tr><th>ID</th><th>Produk</th><th>Total</th><th>Status</th></tr></thead><tbody>
    ${orders.map(o=>`<tr><td>#${o.id}</td><td>${o.items.map(i=>i.name+' x'+i.qty).join(', ')}</td><td>${fmtRp(o.total)}</td><td>${statusBadge(o.status)}</td></tr>`).join('')}
  </tbody></table></div>`;
  }
  return `<div class="table-scroll"><table><thead><tr><th>ID</th><th>Produk</th><th>Total</th><th>Status</th><th>Pembayaran</th><th></th></tr></thead><tbody>
    ${orders.map(o=>{
      const st = payStatusOf(o);
      let act = '';
      if(orderNeedsProof(o) && o.status!=='Dibatalkan'){
        if(st==='Belum Dibayar') act = `<button class="btn btn-primary btn-sm" onclick="openPayProof('${o.id}')">Upload Bukti</button>`;
        else if(st==='Ditolak') act = `<button class="btn btn-danger btn-sm" onclick="openPayProof('${o.id}')">Kirim Ulang</button>`;
        else act = `<button class="btn btn-ghost btn-sm" onclick="openPayProof('${o.id}')">Lihat</button>`;
      }
      return `<tr><td>#${o.id}</td><td>${o.items.map(i=>i.name+' x'+i.qty).join(', ')}</td><td>${fmtRp(o.total)}</td><td>${statusBadge(o.status)}</td><td>${payStatusBadge(o)}${st==='Ditolak'&&o.paymentNote?`<div class="field-hint" style="margin-top:4px;">${esc(o.paymentNote)}</div>`:''}</td><td>${act}</td></tr>`;
    }).join('')}
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
/* ---------- KOMISI PENDING & SALDO MANUAL ----------
   Komisi dari order referral (tidak dibatalkan) otomatis tercatat sebagai PENDING.
   Saldo mitra TIDAK bertambah otomatis: admin mengisinya manual (Portal → Mitra → Isi Saldo),
   dicatat di state.balanceLogs. Saldo tersedia = total isian admin − pengurangan admin − penarikan (Menunggu/Disetujui).
   Pengurangan saldo (Portal → Mitra → Kurangi) TIDAK menaikkan komisi pending. */
function sellerCommissionTotal(u){
  return ordersForSeller(u.refCode).filter(o=>o.status!=='Dibatalkan')
    .reduce((a,o)=>a+o.items.reduce((s,i)=>s+commissionForOrderItem(i),0),0);
}
function sellerCredited(id){ return (state.balanceLogs||[]).filter(l=>l.sellerId===id && Number(l.amount)>0).reduce((a,l)=>a+Number(l.amount||0),0); }
function sellerDeducted(id){ return (state.balanceLogs||[]).filter(l=>l.sellerId===id && Number(l.amount)<0).reduce((a,l)=>a+Math.abs(Number(l.amount||0)),0); }
function sellerReserved(id){ return state.withdrawals.filter(w=>w.sellerId===id && w.status!=='Ditolak').reduce((a,w)=>a+w.amount,0); }
function sellerBalance(id){ return sellerCredited(id) - sellerDeducted(id) - sellerReserved(id); }
/* Admin bisa mengoreksi Komisi Pending secara manual (mis. salah hitung, ada order di luar sistem, dsb).
   Koreksi dicatat sebagai selisih (delta) di state.pendingLogs, bukan menimpa nilai otomatis. */
function sellerPendingAdjustment(id){ return (state.pendingLogs||[]).filter(l=>l.sellerId===id).reduce((a,l)=>a+Number(l.amount||0),0); }
function sellerPending(u){ return Math.max(sellerCommissionTotal(u) - sellerCredited(u.id) + sellerPendingAdjustment(u.id), 0); }

function pageSeller(){
  const u = currentUser();
  if(!u || u.role!=='member'){ location.hash='#/beranda'; return ''; }
  const myOrders = ordersForSeller(u.refCode);
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
  const sellers = state.users.filter(x=>x.role==='member');
  const leaderboard = sellers.map(s=>{
    const os = ordersForSeller(s.refCode).filter(o=>o.status==='Selesai');
    const comm = os.reduce((a,o)=>a+o.items.reduce((x,i)=>x+commissionForOrderItem(i),0),0);
    return {id:s.id, name:s.name, comm};
  }).sort((a,b)=>b.comm-a.comm);
  const myRank = leaderboard.findIndex(l=>l.id===u.id)+1;

  const downCount = downlineCount(u.id);
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
        <a class="btn btn-soft btn-sm" href="#/seller/referral">🔗 Referral & Matrix</a></div>
      <div class="stat-grid">
        <div class="stat-card"><div class="lbl">Komisi Pending</div><div class="val" style="color:var(--gold,#f5b301)">${fmtRp(sellerPending(u))}</div><div class="sub">Menunggu admin memasukkan ke saldo</div></div>
        <div class="stat-card"><div class="lbl">Saldo Bisa Ditarik</div><div class="val">${fmtRp(Math.max(sellerBalance(u.id),0))}</div><div class="sub">Diisi manual oleh admin</div></div>
        <div class="stat-card"><div class="lbl">Sudah Ditarik</div><div class="val">${fmtRp(withdrawn)}</div><div class="sub">Peringkat #${myRank||'-'} dari ${leaderboard.length} mitra</div></div>
        <div class="stat-card"><div class="lbl">Total Order</div><div class="val">${myOrders.length}</div></div>
      </div>
      <div class="ref-box">
        <div><div style="font-size:12.5px;color:var(--text-dim);margin-bottom:6px;">Kode & Link Referral Kamu</div><div class="ref-code">${u.refCode}</div></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;"><button class="btn btn-soft" onclick="copyReferralLink('${u.refCode}')">Salin Link Referral</button><a class="btn btn-ghost" href="#/seller/referral">Lihat Matrix</a></div>
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
          <div class="panel-head"><h3>🏆 Papan Peringkat Mitra</h3></div>
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
          <div class="fake-stat"><div class="l">Anggota jaringan matrix</div><div class="v">${downCount}</div></div>
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
function pageSellerPenarikan(){
  const u = currentUser();
  if(!u || u.role!=='member'){ location.hash='#/beranda'; return ''; }
  const list = state.withdrawals.filter(w=>w.sellerId===u.id);
  const available = sellerBalance(u.id);
  const logs = (state.balanceLogs||[]).filter(l=>l.sellerId===u.id);
  return `
  <div class="dash-wrap">
    ${SellerSidebar(u,'#/seller/penarikan')}
    <div class="dash-main">
      <div class="pg-head">
        <div><h1>Penarikan Dana</h1><p>Ajukan penarikan dari saldo yang sudah diisi admin.</p></div>
        <button class="btn btn-primary" onclick="openWithdrawForm()">+ Ajukan Penarikan</button>
      </div>
      <div class="stat-grid" style="margin-bottom:22px;">
        <div class="stat-card"><div class="lbl">Saldo Bisa Ditarik</div><div class="val">${fmtRp(Math.max(available,0))}</div><div class="sub">Diisi manual oleh admin</div></div>
        <div class="stat-card"><div class="lbl">Komisi Pending</div><div class="val">${fmtRp(sellerPending(u))}</div><div class="sub">Belum masuk saldo</div></div>
      </div>
      <div class="panel" style="margin-bottom:22px;">
        <div class="panel-head"><h3>Riwayat Mutasi Saldo</h3></div>
        <div class="table-scroll"><table><thead><tr><th>Tanggal</th><th>Jumlah</th><th>Catatan</th></tr></thead><tbody>
        ${logs.length===0?`<tr><td colspan="3"><div class="empty-state"><div class="em">🧾</div>Belum ada mutasi saldo.</div></td></tr>`:
        logs.map(l=>`<tr><td>${l.date}</td><td style="color:${l.amount<0?'var(--red)':'var(--leaf)'};">${l.amount<0?'-':'+'}${fmtRp(Math.abs(l.amount))}</td><td>${esc(l.note)||'-'}</td></tr>`).join('')}
        </tbody></table></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Riwayat Penarikan</h3></div>
        <div class="table-scroll"><table><thead><tr><th>Jumlah</th><th>Metode</th><th>Nama Pemilik</th><th>Alamat Penarikan</th><th>Tanggal</th><th>Status</th></tr></thead><tbody>
        ${list.length===0?`<tr><td colspan="6"><div class="empty-state"><div class="em">💳</div>Belum ada permintaan.</div></td></tr>`:
        list.map(w=>`<tr><td>${fmtRp(w.amount)}</td><td>${w.method}</td><td>${w.holder||'-'}</td><td>${w.address||'-'}</td><td>${w.date}</td><td>${w.status==='Disetujui'?'<span class="badge badge-green">Disetujui</span>':w.status==='Ditolak'?'<span class="badge badge-red">Ditolak</span>':'<span class="badge badge-gold">Menunggu</span>'}</td></tr>`).join('')}
        </tbody></table></div>
      </div>
    </div>
  </div>`;
}
function pageSellerReferral(){
  const u = currentUser();
  if(!u || u.role!=='member'){ location.hash='#/beranda'; return ''; }
  const {width, depth} = matrixCfg();
  const levels = matrixLevels(u.id);
  const total = levels.reduce((a,l)=>a+l.filled,0);
  const capacityTotal = levels.reduce((a,l)=>a+l.capacity,0);
  const direct = state.users.filter(x=>x.sponsorId===u.id);
  const kids = sellerChildren(u.id);
  const sponsor = state.users.find(x=>x.id===u.sponsorId);
  const link = referralLink(u.refCode);
  const waText = encodeURIComponent(`Belanja di ${SITE_NAME}, ubah pengeluaran jadi pemasukan! Gabung lewat link referralku: ${link}`);
  const emptySlots = Math.max(0, width - kids.length);
  return `
  <div class="dash-wrap">
    ${SellerSidebar(u,'#/seller/referral')}
    <div class="dash-main">
      <div class="pg-head"><div><h1>Referral & Matrix</h1><p>Bagikan kodemu, ajak mitra baru, dan pantau pertumbuhan jaringan matrix-mu.</p></div></div>
      <div class="ref-box">
        <div>
          <div style="font-size:12.5px;color:var(--text-dim);margin-bottom:6px;">Kode Referral Kamu</div>
          <div class="ref-code">${esc(u.refCode)}</div>
          <div class="field-hint" style="margin-top:8px;word-break:break-all;">${esc(link)}</div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-soft" onclick="copyReferralLink('${esc(u.refCode)}')">Salin Link</button>
          <button class="btn btn-ghost" data-v="${esc(u.refCode)}" onclick="copyText(this.dataset.v,'Kode referral disalin')">Salin Kode</button>
          <a class="btn btn-wa" href="https://wa.me/?text=${waText}" target="_blank" rel="noopener">Bagikan via WhatsApp</a>
        </div>
      </div>
      <div class="stat-grid">
        <div class="stat-card"><div class="lbl">Total Jaringan</div><div class="val">${total}</div><div class="sub">dari kapasitas ${capacityTotal.toLocaleString('id-ID')}</div></div>
        <div class="stat-card"><div class="lbl">Referral Langsung</div><div class="val">${direct.length}</div><div class="sub">yang mendaftar dari kodemu</div></div>
        <div class="stat-card"><div class="lbl">Posisi Level 1</div><div class="val">${kids.length} / ${width}</div><div class="sub">${emptySlots} slot kosong</div></div>
        <div class="stat-card"><div class="lbl">Sponsor Kamu</div><div class="val" style="font-size:17px;">${sponsor?esc(sponsor.name):SITE_NAME}</div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Struktur Matrix ${width} × ${depth}</h3></div>
        <div class="field-hint" style="margin-bottom:14px;">Tiap mitra punya maksimal ${width} posisi langsung, sedalam ${depth} level. Jika posisi sponsor penuh, mitra baru otomatis ditempatkan di bawah jaringan sponsor (spillover) sehingga semua posisi terisi merata.</div>
        <div class="table-scroll"><table><thead><tr><th>Level</th><th>Terisi</th><th>Kapasitas</th><th style="min-width:140px;">Progres</th></tr></thead><tbody>
          ${levels.map(l=>`<tr><td>Level ${l.level}</td><td>${l.filled}</td><td>${l.capacity.toLocaleString('id-ID')}</td><td><div class="progress-bar"><div class="fill" style="width:${Math.min(100,Math.round(l.filled/l.capacity*100))}%"></div></div></td></tr>`).join('')}
        </tbody></table></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Pohon Jaringan</h3></div>
        <ul class="mx-tree mx-root"><li>
          <div class="mx-node me"><div class="av">${avatarHtml(u)}</div><div><b>${esc(u.name)} (Kamu)</b><small>${esc(u.refCode)}</small></div></div>
          <ul class="mx-tree">
            ${matrixItems(u.id,1,depth)}
            ${Array.from({length:emptySlots}).map(()=>`<li><div class="mx-node empty"><div class="av">＋</div><div><b>Slot kosong</b><small>Ajak mitra baru dengan kodemu</small></div></div></li>`).join('')}
          </ul>
        </li></ul>
      </div>
    </div>
  </div>`;
}
function pageSellerNotif(){
  const u = currentUser();
  if(!u || u.role!=='member'){ location.hash='#/beranda'; return ''; }
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
        <div class="field"><label>Alamat</label><a class="btn btn-soft btn-sm" href="#/akun/alamat">📍 Kelola Alamat Saya</a></div>
        <button class="btn btn-primary" onclick="saveProfileName()">Simpan Profil</button>
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
  u.name = name;
  const addrEl = document.getElementById('prof-address');
  if(addrEl) u.address = addrEl.value.trim();
  persist(); render(); toast('Profil disimpan');
}
function saveProfilePassword(e){
  e.preventDefault();
  const u = currentUser();
  const oldPass = document.getElementById('prof-pass-old').value;
  const newPass = document.getElementById('prof-pass-new').value;
  if(oldPass !== u.password){ toast('Kata sandi saat ini salah'); return; }
  u.password = newPass; persist(); render(); toast('Kata sandi berhasil diperbarui');
}

/* =====================================================
   ADMIN/OWNER PORTAL
===================================================== */
function navItemsStaff(){
  return [
    {icon:'chart', label:'Dashboard', route:'#/portal/dashboard'},
    {icon:'package', label:'Produk', route:'#/portal/produk'},
    {icon:'bag', label:'Pesanan', route:'#/portal/pesanan', badge:pendingProofCount()},
    {icon:'chat', label:'Chat', route:'#/portal/chat', badge:chatUnreadForAdmin()},
    {icon:'user', label:'Pengguna', route:'#/portal/pengguna'},
    {icon:'star', label:'Mitra', route:'#/portal/seller'},
    {icon:'wallet', label:'Metode Pembayaran', route:'#/portal/pembayaran'},
    {icon:'bell', label:'Pemberitahuan', route:'#/portal/pemberitahuan'},
    {icon:'tag', label:'Pengumuman', route:'#/portal/pengumuman'},
    {icon:'chart', label:'Keuangan', route:'#/portal/keuangan'},
    {icon:'wallet', label:'Penarikan Dana', route:'#/portal/penarikan'},
    {icon:'lock', label:'Pengaturan', route:'#/portal/pengaturan'},
  ];
}
function StaffSidebar(u){
  const items = navItemsStaff();
  return `
  <div class="sidebar">
    <div class="brand">${brandMark(30)}GLOWNESS</div>
    <button class="dash-menu-btn" onclick="toggleDashMenu()" aria-label="Menu">${state.dashMenuOpen?ic('close',18):ic('menu',18)}</button>
    ${state.dashMenuOpen?`<div class="dash-sidebar-backdrop" onclick="closeDashMenu()"></div>`:''}
    <div class="sidebar-nav ${state.dashMenuOpen?'open':''}">
      <div class="side-user"><div class="av">${avatarHtml(u)}</div><div><div class="name">${u.name}</div><div class="role">${u.role}</div></div></div>
      <div class="nav-label">Menu</div>
      ${items.map(it=>`<a class="nav-item ${state.route===it.route?'active':''}" href="${it.route}" onclick="closeDashMenu()"><span class="ic">${ic(it.icon,16)}</span>${it.label}${it.badge?`<span class="nav-badge">${it.badge}</span>`:''}</a>`).join('')}
      <div class="sidebar-foot">
        <div class="sidebar-theme">${themeToggleBtn()}<span style="font-size:12.5px;color:var(--text-dim);">Tema ${state.theme==='light'?'Terang':'Gelap'}</span></div>
        <a class="nav-item" href="#/beranda" onclick="closeDashMenu()"><span class="ic">${ic('store',16)}</span>Lihat Toko</a>
        <a class="nav-item" onclick="doLogout()"><span class="ic">${ic('logout',16)}</span>Keluar</a>
      </div>
    </div>
  </div>`;
}
function pageStaffDashboard(){
  const doneOrders = state.orders.filter(o=>o.status==='Selesai');
  const revenue = doneOrders.reduce((a,o)=>a+o.total,0);
  const commission = doneOrders.reduce((a,o)=>a+o.items.reduce((s,i)=>s+ (o.refCode? commissionForOrderItem(i):0),0),0);
  const sellers = state.users.filter(u=>u.role==='member');
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
    <div class="stat-card"><div class="lbl">Komisi Order Selesai</div><div class="val">${fmtRp(commission)}</div><div class="sub">${pendingWithdraw} penarikan menunggu</div></div>
    <div class="stat-card"><div class="lbl">Total Pengguna</div><div class="val">${sellers.length}</div></div>
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
      <div class="panel-head"><h3>🏆 Top Mitra</h3></div>
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
  return `<div class="table-scroll"><table><thead><tr><th>ID</th><th>Pembeli</th><th>Produk</th><th>Total</th><th>Pembayaran</th><th>Bukti Bayar</th><th>Referral</th><th>Status</th><th></th></tr></thead><tbody>
    ${orders.map(o=>`<tr>
      <td>#${o.id}</td><td>${esc(o.buyerName)}${o.buyerAddress?`<div class="field-hint" style="max-width:220px;white-space:normal;">📍 ${esc(o.buyerAddress)}</div>`:''}</td><td>${o.items.map(i=>i.name+' x'+i.qty).join(', ')}</td><td>${fmtRp(o.total)}</td>
      <td>${esc(o.paymentMethod&&o.paymentMethod!=='whatsapp'?o.paymentMethod:'—')}</td>
      <td>${payStatusBadge(o)}${orderNeedsProof(o)&&o.proofAt?`<div><button class="btn btn-soft btn-sm" style="margin-top:6px;" onclick="openProofView('${o.id}')">${o.paymentStatus==='Menunggu Konfirmasi'?'Tinjau':'Lihat'}</button></div>`:''}</td>
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
  delete state.proofCache[id];
  saveShared('oliv_proof_'+id, {}); // kosongkan bukti (tabel tidak punya policy DELETE)
  persist(); render(); toast('Pesanan dihapus');
}

function pageStaffProduk(){
  return `
  <div class="pg-head"><div><h1>Produk</h1><p>Kelola katalog produk, gambar, & harga modal untuk perhitungan komisi mitra.</p></div>
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
  return `<div class="pg-head"><div><h1>Pesanan</h1><p>Semua pesanan dari toko & link referral mitra. Admin/owner bisa menghapus pesanan yang keliru.</p></div></div>
  <div class="panel">${ordersTableStaff(state.orders)}</div>`;
}

function toggleUserPass(id){
  state.userShowPass = state.userShowPass || {};
  state.userShowPass[id] = !state.userShowPass[id];
  render();
}
function copyUserPass(pass){
  const v = pass || '';
  if(!v){ toast('Password kosong'); return; }
  try{
    if(navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(v);
    else {
      const t = document.createElement('textarea'); t.value=v; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    toast('Password disalin');
  }catch(e){ toast('Password: '+v); }
}
function pageStaffPengguna(){
  const q = (state.userSearch||'').trim().toLowerCase();
  let list = state.users.slice();
  if(q){
    list = list.filter(u=>{
      const hay = [u.name, u.email, u.role, u.refCode, u.password, u.address].map(x=>(x||'').toString().toLowerCase()).join(' ');
      const addrs = userAddresses(u).map(a=>[a.label,a.recipient,a.phone,a.street,a.city].join(' ')).join(' ').toLowerCase();
      return hay.includes(q) || addrs.includes(q);
    });
  }
  return `
  <div class="pg-head"><div><h1>Pengguna</h1><p>Kelola akun staf dan pengguna. Cari nama, email, role, kode referral, atau password.</p></div>
    <button class="btn btn-primary" onclick="openUserForm()">+ Tambah Pengguna</button></div>
  <div class="panel">
    <div class="user-search-bar">
      <span class="user-search-ic">${typeof ic==='function'?ic('search',16):'🔍'}</span>
      <input type="search" class="user-search-input" placeholder="Cari pengguna (nama, email, role, kode, password…)" value="${esc(state.userSearch||'')}" oninput="state.userSearch=this.value;render()">
      ${q?`<button type="button" class="btn btn-ghost btn-sm" onclick="state.userSearch='';render()">Hapus</button>`:''}
      <span class="user-search-count">${list.length} / ${state.users.length}</span>
    </div>
    <div class="table-scroll"><table><thead><tr><th>Nama</th><th>Email</th><th>Password</th><th>Role</th><th>Info</th><th>Alamat</th><th></th></tr></thead><tbody>
    ${list.length===0?`<tr><td colspan="7"><div class="empty-state"><div class="em">${typeof ic==='function'?ic('user',28):''}</div>Tidak ada pengguna yang cocok${q?` dengan “${esc(state.userSearch)}”`:''}.</div></td></tr>`:
    list.map(u=>{
      const show = state.userShowPass && state.userShowPass[u.id];
      const pass = u.password || '';
      return `<tr>
      <td><b>${esc(u.name)}</b></td>
      <td>${esc(u.email)}</td>
      <td>
        <div class="pass-cell">
          <code class="pass-val">${show ? esc(pass) : '••••••••'}</code>
          <button type="button" class="icon-btn" title="${show?'Sembunyikan':'Tampilkan'}" onclick="toggleUserPass('${u.id}')">${show?'🙈':'👁️'}</button>
          <button type="button" class="icon-btn" title="Salin password" onclick="copyUserPass(${JSON.stringify(pass)})">📋</button>
        </div>
      </td>
      <td><span class="badge ${u.role==='owner'?'badge-gold':u.role==='admin'?'badge-copper':u.role==='member'?'badge-green':'badge-grey'}">${u.role}</span></td>
      <td>${u.role==='member'?'Kode: '+esc(u.refCode||'-')+' · '+fmtRp(u.totalSpend||0)+' belanja · Saldo '+fmtRp(Math.max(sellerBalance(u.id),0)):'—'}</td>
      <td style="min-width:200px;max-width:320px;white-space:normal;">${userAddrHtml(u)}</td>
      <td class="row-actions"><button class="icon-btn" onclick="openUserForm('${u.id}')">✎</button><button class="icon-btn danger" onclick="deleteUser('${u.id}')">🗑</button></td>
    </tr>`;
    }).join('')}
  </tbody></table></div></div>`;
}
function openUserForm(id){ state.formModal={type:'user', id:id||null}; render(); }
function deleteUser(id){
  if(id===state.currentUser){ toast('Tidak bisa menghapus akun sendiri'); return; }
  const u = state.users.find(x=>x.id===id);
  const label = u ? (u.name || u.email || id) : id;
  if(!confirm('Yakin ingin menghapus akun?\n\nAkun: '+label+'\n\nTindakan ini tidak bisa dibatalkan.')) return;
  state.users = state.users.filter(x=>x.id!==id);
  try{ if(localStorage.getItem('glowness_uid')===id) localStorage.removeItem('glowness_uid'); }catch(e){}
  persist(); render(); toast('Pengguna dihapus');
}
function submitUserForm(e){
  e.preventDefault();
  const id = state.formModal.id;
  const role = document.getElementById('uf-role').value;
  const passEl = document.getElementById('uf-pass');
  const data = { name:document.getElementById('uf-name').value, email:document.getElementById('uf-email').value, role, address:document.getElementById('uf-address').value.trim() };
  if(passEl && passEl.value.trim()) data.password = passEl.value.trim();
  if(role==='member'){
    const existing = id ? state.users.find(u=>u.id===id) : null;
    data.refCode = document.getElementById('uf-ref').value.toUpperCase() || (existing&&existing.refCode) || 'REF'+Math.floor(Math.random()*900+100);
    data.readNotifIds = (existing&&existing.readNotifIds) || [];
    data.totalSpend = (existing&&existing.totalSpend) || 0;
    data.sponsorId = existing ? existing.sponsorId : null;
    data.parentId = existing ? existing.parentId : null;
  }
  if(id){ Object.assign(state.users.find(u=>u.id===id), data); }
  else { state.users.push({id:'u'+Date.now(), password: data.password || 'ganti123', avatar:'', ...data}); }
  persist(); state.formModal=null; render(); toast('Pengguna disimpan');
}

function pageStaffSeller(){
  const sellers = state.users.filter(u=>u.role==='member');
  return `
  <div class="pg-head"><div><h1>Mitra</h1><p>Overview performa referral. Atur komisi pending & saldo mitra di sini.</p></div></div>
  <div class="panel"><div class="table-scroll"><table><thead><tr><th>Mitra</th><th>Kode Referral</th><th>Upline</th><th>Jaringan</th><th>Order</th><th>Komisi Pending</th><th>Saldo</th><th></th></tr></thead><tbody>
    ${sellers.map(s=>{
      const os = ordersForSeller(s.refCode);
      const pend = sellerPending(s), bal = sellerBalance(s.id);
      return `<tr><td style="display:flex;align-items:center;gap:10px;"><span class="av" style="width:32px;height:32px;border-radius:50%;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--gold),var(--copper));font-size:12px;font-weight:700;color:#fff;flex-shrink:0;">${avatarHtml(s)}</span><b>${esc(s.name)}</b></td>
        <td><div style="display:flex;gap:6px;align-items:center;">
          <input id="ref-inp-${s.id}" value="${s.refCode}" style="width:120px;background:var(--card);border:1px solid var(--border-strong);color:var(--text);padding:7px 9px;border-radius:8px;font-size:12.5px;text-transform:uppercase;">
          <button class="icon-btn" onclick="updateSellerRefCode('${s.id}')" title="Simpan kode referral">💾</button>
        </div></td>
        <td>${(state.users.find(x=>x.id===s.parentId)||{}).name||'—'}</td><td>${downlineCount(s.id)}</td><td>${os.length}</td>
        <td><b style="color:var(--gold-2)">${fmtRp(pend)}</b>${sellerPendingAdjustment(s.id)?`<div class="field-hint" style="margin:0;">koreksi ${sellerPendingAdjustment(s.id)<0?'-':'+'}${fmtRp(Math.abs(sellerPendingAdjustment(s.id)))}</div>`:''}<div style="margin-top:6px;"><button class="btn btn-soft btn-sm" onclick="openPendingForm('${s.id}')">Atur Pending</button></div></td>
        <td><b>${fmtRp(bal)}</b></td>
        <td class="row-actions"><button class="btn btn-soft btn-sm" onclick="openBalanceForm('${s.id}')" title="Isi saldo mitra">+ Isi Saldo</button><button class="btn btn-ghost btn-sm" style="color:var(--red);" onclick="openBalanceForm('${s.id}','kurang')" title="Kurangi saldo mitra">− Kurangi</button><button class="icon-btn" onclick="openUserForm('${s.id}')" title="Edit lengkap">✎</button></td></tr>`;
    }).join('')}
  </tbody></table></div></div>
  <div class="panel" style="margin-top:22px;">
    <div class="panel-head"><h3>Riwayat Mutasi Saldo</h3></div>
    <div class="table-scroll"><table><thead><tr><th>Tanggal</th><th>Mitra</th><th>Jumlah</th><th>Catatan</th><th>Oleh</th></tr></thead><tbody>
    ${(state.balanceLogs||[]).length===0?`<tr><td colspan="5"><div class="empty-state"><div class="em">🧾</div>Belum ada mutasi saldo.</div></td></tr>`:
    state.balanceLogs.map(l=>{
      const m = state.users.find(x=>x.id===l.sellerId);
      return `<tr><td>${l.date}</td><td>${m?esc(m.name):'-'}</td><td style="color:${l.amount<0?'var(--red)':'var(--leaf)'};">${l.amount<0?'-':'+'}${fmtRp(Math.abs(l.amount))}</td><td>${esc(l.note)||'-'}</td><td>${esc(l.by)||'-'}</td></tr>`;
    }).join('')}
    </tbody></table></div>
  </div>
  <div class="panel" style="margin-top:22px;">
    <div class="panel-head"><h3>Riwayat Koreksi Komisi Pending</h3></div>
    <div class="table-scroll"><table><thead><tr><th>Tanggal</th><th>Mitra</th><th>Koreksi</th><th>Catatan</th><th>Oleh</th></tr></thead><tbody>
    ${(state.pendingLogs||[]).length===0?`<tr><td colspan="5"><div class="empty-state"><div class="em">🧾</div>Belum ada koreksi komisi pending.</div></td></tr>`:
    state.pendingLogs.map(l=>{
      const m = state.users.find(x=>x.id===l.sellerId);
      return `<tr><td>${l.date}</td><td>${m?esc(m.name):'-'}</td><td style="color:${l.amount<0?'var(--red)':'var(--leaf)'};">${l.amount<0?'-':'+'}${fmtRp(Math.abs(l.amount))}</td><td>${esc(l.note)||'-'}</td><td>${esc(l.by)||'-'}</td></tr>`;
    }).join('')}
    </tbody></table></div>
  </div>`;
}
function openPendingForm(id){ state.formModal={type:'pendingAdjust', sellerId:id}; render(); }
function submitPendingForm(e){
  e.preventDefault();
  const staff = currentUser();
  if(!staff || !(staff.role==='owner'||staff.role==='admin')) return;
  const sellerId = state.formModal.sellerId;
  const seller = state.users.find(x=>x.id===sellerId);
  if(!seller) return;
  const target = Math.round(Number(document.getElementById('pf-target').value));
  const note = document.getElementById('pf-note').value.trim() || 'Penyesuaian manual admin';
  if(isNaN(target) || target < 0){ toast('Isi nominal komisi pending yang valid (≥ 0)'); return; }
  const current = sellerPending(seller);
  const delta = target - current;
  if(delta===0){ toast('Nilai sama dengan komisi pending saat ini'); state.formModal=null; render(); return; }
  state.pendingLogs = state.pendingLogs || [];
  state.pendingLogs.unshift({id:'p'+Date.now(), sellerId, amount:delta, note, date:new Date().toISOString().slice(0,10), by:staff.name});
  persist(); state.formModal=null; render();
  toast('Komisi pending '+seller.name+' diatur ke '+fmtRp(target));
}
function openBalanceForm(id, mode){ state.formModal={type:'balance', sellerId:id, mode: mode==='kurang'?'kurang':'tambah'}; render(); }
function submitBalanceForm(e){
  e.preventDefault();
  const staff = currentUser();
  if(!staff || !(staff.role==='owner'||staff.role==='admin')) return;
  const sellerId = state.formModal.sellerId;
  const mode = state.formModal.mode==='kurang' ? 'kurang' : 'tambah';
  const seller = state.users.find(x=>x.id===sellerId);
  if(!seller) return;
  const value = Math.abs(Math.round(Number(document.getElementById('bf-amount').value)));
  const note = document.getElementById('bf-note').value.trim();
  if(!value){ toast('Isi jumlah saldo yang valid (lebih dari 0)'); return; }
  if(mode==='kurang'){
    const avail = Math.max(sellerBalance(sellerId),0);
    if(!note){ toast('Isi alasan pengurangan saldo'); return; }
    if(value > avail){ toast('Pengurangan melebihi saldo tersedia ('+fmtRp(avail)+')'); return; }
  }
  const amount = mode==='kurang' ? -value : value;
  state.balanceLogs.unshift({id:'b'+Date.now(), sellerId, amount, type:mode, note, date:new Date().toISOString().slice(0,10), by:staff.name});
  persist(); state.formModal=null; render();
  toast('Saldo '+seller.name+(mode==='kurang'?' dikurangi ':' ditambah ')+fmtRp(value));
}
function updateSellerRefCode(id){
  const inp = document.getElementById('ref-inp-'+id);
  if(!inp) return;
  const val = inp.value.trim().toUpperCase().replace(/\s+/g,'');
  if(!val){ toast('Kode referral tidak boleh kosong'); return; }
  const dupUser = state.users.find(u=>u.role==='member' && u.refCode===val && u.id!==id);
  if(dupUser){ toast('Kode referral sudah dipakai mitra lain'); return; }
  const seller = state.users.find(u=>u.id===id);
  const oldCode = seller.refCode;
  seller.refCode = val;
  state.orders.forEach(o=>{ if(o.refCode===oldCode) o.refCode = val; });
  persist(); render(); toast('Kode referral '+seller.name+' diperbarui menjadi '+val);
}

function pageStaffPembayaran(){
  const list = state.settings.paymentMethods||[];
  return `
  <div class="pg-head"><div><h1>Metode Pembayaran</h1><p>Atur QRIS, e-wallet, dan rekening bank yang tampil di checkout. Nomor dan atas nama bisa diubah kapan saja.</p></div>
    <button class="btn btn-primary" onclick="openPaymentForm()">+ Tambah Metode</button></div>
  <div class="panel">
    ${list.length===0?`<div class="empty-state"><div class="em">🏦</div>Belum ada metode pembayaran.</div>`:
    `<div class="table-scroll"><table><thead><tr><th>Metode</th><th>Jenis</th><th>No. Rekening / HP</th><th>Atas Nama</th><th>QR</th><th>Status</th><th></th></tr></thead><tbody>
    ${list.map(p=>`<tr>
      <td><b>${esc(p.name)}</b></td>
      <td><span class="badge badge-copper">${payTypeLabel(p.type)}</span></td>
      <td>${p.accountNumber?esc(p.accountNumber):'<span class="text-dim">Belum diisi</span>'}</td>
      <td>${esc(p.accountName)||'—'}</td>
      <td>${p.qrImage?`<img class="pay-thumb" src="${p.qrImage}" alt="QR">`:'—'}</td>
      <td>${p.active?'<span class="badge badge-green">Aktif</span>':'<span class="badge badge-grey">Nonaktif</span>'}</td>
      <td><div class="row-actions">
        <button class="icon-btn" onclick="openPaymentForm('${p.id}')" title="Edit">✎</button>
        <button class="icon-btn" onclick="togglePayment('${p.id}')" title="${p.active?'Nonaktifkan':'Aktifkan'}">${p.active?'⏸':'▶️'}</button>
        <button class="icon-btn danger" onclick="deletePayment('${p.id}')" title="Hapus">🗑</button>
      </div></td></tr>`).join('')}
    </tbody></table></div>`}
  </div>`;
}
function openPaymentForm(id){
  const p = id ? (state.settings.paymentMethods||[]).find(x=>x.id===id) : null;
  state.formModal = {type:'payment', id:id||null, draft: p ? {...p} : {type:'bank', name:'', accountNumber:'', accountName:'', note:'', active:true, qrImage:''}};
  render();
}
function readPaymentDraft(){
  const d = state.formModal && state.formModal.draft; if(!d) return;
  const g = id=>document.getElementById(id);
  if(!g('pmf-name')) return;
  d.type = g('pmf-type').value; d.name = g('pmf-name').value; d.accountNumber = g('pmf-number').value;
  d.accountName = g('pmf-holder').value; d.note = g('pmf-note').value; d.active = g('pmf-active').checked;
}
function handlePaymentQrChange(inputEl){
  readImageInput(inputEl, (dataUrl)=>{
    shrinkImage(dataUrl, 700, (small)=>{ readPaymentDraft(); state.formModal.draft.qrImage = small; render(); });
  });
}
function removePaymentQr(){ readPaymentDraft(); state.formModal.draft.qrImage=''; render(); }
function submitPaymentForm(e){
  e.preventDefault(); readPaymentDraft();
  const d = state.formModal.draft, id = state.formModal.id;
  const data = {type:d.type, name:d.name.trim(), accountNumber:d.accountNumber.trim(), accountName:d.accountName.trim(), note:d.note.trim(), active:!!d.active, qrImage:d.qrImage||''};
  if(!data.name){ toast('Nama metode wajib diisi'); return; }
  if(!state.settings.paymentMethods) state.settings.paymentMethods = [];
  if(id){ Object.assign(state.settings.paymentMethods.find(p=>p.id===id), data); }
  else { state.settings.paymentMethods.push({id:'pm'+Date.now(), ...data}); }
  persist(); state.formModal=null; render(); toast('Metode pembayaran disimpan');
}
function togglePayment(id){
  const p = (state.settings.paymentMethods||[]).find(x=>x.id===id); if(!p) return;
  p.active = !p.active; persist(); render(); toast(p.active?'Metode diaktifkan':'Metode dinonaktifkan');
}
function deletePayment(id){
  if(!confirm('Hapus metode pembayaran ini?')) return;
  state.settings.paymentMethods = (state.settings.paymentMethods||[]).filter(p=>p.id!==id);
  persist(); render(); toast('Metode pembayaran dihapus');
}
function saveMatrix(){
  const w = Math.max(1, Math.min(10, Number(document.getElementById('mx-width').value)||3));
  const d = Math.max(1, Math.min(10, Number(document.getElementById('mx-depth').value)||5));
  state.settings.matrix = {width:w, depth:d};
  persist(); render(); toast('Pengaturan matrix disimpan');
}

function pageStaffPemberitahuan(){
  const list = [...(state.notifications||[])].sort((a,b)=>b.date.localeCompare(a.date));
  return `
  <div class="pg-head"><div><h1>Pemberitahuan Mitra</h1><p>Kirim info, pembaruan, atau pengumuman khusus untuk semua mitra.</p></div>
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
  persist(); state.formModal=null; render(); toast('Pemberitahuan terkirim ke semua mitra');
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
  const mitra = state.users.filter(u=>u.role==='member');
  const komisiSelesai = u => ordersForSeller(u.refCode).filter(o=>o.status==='Selesai').reduce((a,o)=>a+o.items.reduce((s,i)=>s+commissionForOrderItem(i),0),0);
  const sumWd = (id,st) => state.withdrawals.filter(w=>(id?w.sellerId===id:true) && w.status===st).reduce((a,w)=>a+w.amount,0);

  // Toko: omzet, modal, laba kotor (hanya pesanan Selesai)
  let omzet = 0, modal = 0;
  doneOrders.forEach(o=>o.items.forEach(i=>{ omzet += i.unitPrice*i.qty; modal += i.basePrice*i.qty; }));
  const labaKotor = omzet - modal;

  // Mitra: komisi, saldo, penarikan
  const komisiOrder   = mitra.reduce((a,u)=>a+komisiSelesai(u),0);
  const komisiPending = mitra.reduce((a,u)=>a+sellerPending(u),0);
  const saldoMasuk    = mitra.reduce((a,u)=>a+sellerCredited(u.id),0);
  const saldoKurang   = mitra.reduce((a,u)=>a+sellerDeducted(u.id),0);
  const komisiSaldo   = saldoMasuk - saldoKurang;               // komisi yang benar-benar sudah jadi saldo mitra
  const saldoTersedia = mitra.reduce((a,u)=>a+Math.max(sellerBalance(u.id),0),0);
  const cair = sumWd(null,'Disetujui'), menunggu = sumWd(null,'Menunggu');
  const labaBersih = labaKotor - komisiSaldo;

  const perMitra = mitra.map(u=>({
    name:u.name, komisi:komisiSelesai(u), pending:sellerPending(u), masuk:sellerCredited(u.id),
    kurang:sellerDeducted(u.id), cair:sumWd(u.id,'Disetujui'), saldo:Math.max(sellerBalance(u.id),0)
  })).sort((a,b)=>b.saldo-a.saldo);

  const perProduct = {};
  doneOrders.forEach(o=>o.items.forEach(i=>{
    perProduct[i.id] = perProduct[i.id] || {name:i.name, qty:0, revenue:0, modal:0};
    perProduct[i.id].qty += i.qty;
    perProduct[i.id].revenue += i.unitPrice*i.qty;
    perProduct[i.id].modal += i.basePrice*i.qty;
  }));
  const prodRows = Object.values(perProduct).map(p=>({...p, profit:p.revenue-p.modal})).sort((a,b)=>b.revenue-a.revenue);
  const maxRevenue = Math.max(1, ...prodRows.map(p=>p.revenue));

  const perMonth = {};
  doneOrders.forEach(o=>{ const k=o.date.slice(0,7); perMonth[k]=(perMonth[k]||0)+o.total; });
  const monthKeys = Object.keys(perMonth).sort();
  const maxMonth = Math.max(1, ...monthKeys.map(k=>perMonth[k]));

  const badgeWd = st => st==='Disetujui'?'<span class="badge badge-green">Disetujui</span>':st==='Ditolak'?'<span class="badge badge-red">Ditolak</span>':'<span class="badge badge-gold">Menunggu</span>';
  const logs = (state.balanceLogs||[]).slice(0,50);

  return `
  <div class="pg-head"><div><h1>Keuangan</h1><p>Ringkasan keuangan ${SITE_NAME}: omzet, modal, komisi mitra, saldo, dan penarikan.</p></div></div>

  <div class="stat-grid">
    <div class="stat-card"><div class="lbl">Omzet (Pesanan Selesai)</div><div class="val">${fmtRp(omzet)}</div><div class="sub">${doneOrders.length} transaksi selesai</div></div>
    <div class="stat-card"><div class="lbl">Modal Barang Terjual</div><div class="val">${fmtRp(modal)}</div></div>
    <div class="stat-card"><div class="lbl">Laba Kotor</div><div class="val">${fmtRp(labaKotor)}</div><div class="sub">Omzet − modal</div></div>
    <div class="stat-card"><div class="lbl">Laba Bersih</div><div class="val" style="color:var(--leaf)">${fmtRp(labaBersih)}</div><div class="sub">Laba kotor − saldo komisi mitra · jika pending dicairkan: ${fmtRp(labaBersih-komisiPending)}</div></div>
  </div>

  <div class="stat-grid">
    <div class="stat-card"><div class="lbl">Komisi Order Selesai</div><div class="val">${fmtRp(komisiOrder)}</div><div class="sub">Dari order berkode referral</div></div>
    <div class="stat-card"><div class="lbl">Komisi Pending</div><div class="val" style="color:var(--gold,#f5b301)">${fmtRp(komisiPending)}</div><div class="sub">Belum dimasukkan admin ke saldo</div></div>
    <div class="stat-card"><div class="lbl">Saldo Masuk (Bersih)</div><div class="val">${fmtRp(komisiSaldo)}</div><div class="sub">Diisi ${fmtRp(saldoMasuk)} · Dikurangi ${fmtRp(saldoKurang)}</div></div>
    <div class="stat-card"><div class="lbl">Saldo Pengguna Tersedia</div><div class="val">${fmtRp(saldoTersedia)}</div><div class="sub">Belum diajukan penarikan</div></div>
    <div class="stat-card"><div class="lbl">Penarikan Menunggu</div><div class="val">${fmtRp(menunggu)}</div></div>
    <div class="stat-card"><div class="lbl">Sudah Dicairkan</div><div class="val">${fmtRp(cair)}</div></div>
  </div>
  <div class="field-hint" style="margin:-6px 0 22px;">Komisi menjadi beban laba saat admin memasukkannya ke saldo (Mitra → Isi Saldo). Pengurangan saldo memperkecil beban tersebut.</div>

  <div class="panel-grid2">
    <div class="panel">
      <div class="panel-head"><h3>Pendapatan per Produk</h3></div>
      ${prodRows.length===0?`<div class="empty-state"><div class="em">💰</div>Belum ada transaksi selesai.</div>`:
      prodRows.map(p=>`
        <div class="bar-row">
          <div class="lb"><span>${esc(p.name)} · ${p.qty} unit</span><b>${fmtRp(p.revenue)}</b></div>
          <div class="progress-bar"><div class="fill" style="width:${Math.round(p.revenue/maxRevenue*100)}%"></div></div>
        </div>`).join('')}
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Omzet per Bulan</h3></div>
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
    prodRows.map(p=>`<tr><td><b>${esc(p.name)}</b></td><td>${p.qty}</td><td>${fmtRp(p.revenue)}</td><td>${fmtRp(p.modal)}</td><td style="color:var(--leaf);">${fmtRp(p.profit)}</td></tr>`).join('')}
    </tbody></table></div>
  </div>

  <div class="panel" style="margin-top:22px;">
    <div class="panel-head"><h3>Rekap Keuangan per Pengguna</h3></div>
    <div class="table-scroll"><table><thead><tr><th>Pengguna</th><th>Komisi Order Selesai</th><th>Komisi Pending</th><th>Saldo Masuk</th><th>Dikurangi</th><th>Sudah Dicairkan</th><th>Saldo Tersedia</th></tr></thead><tbody>
    ${perMitra.length===0?`<tr><td colspan="7"><div class="empty-state"><div class="em">👥</div>Belum ada pengguna.</div></td></tr>`:
    perMitra.map(m=>`<tr><td><b>${esc(m.name)}</b></td><td>${fmtRp(m.komisi)}</td><td>${fmtRp(m.pending)}</td><td>${fmtRp(m.masuk)}</td><td style="color:var(--red);">${m.kurang?'-'+fmtRp(m.kurang):fmtRp(0)}</td><td>${fmtRp(m.cair)}</td><td><b>${fmtRp(m.saldo)}</b></td></tr>`).join('')}
    </tbody></table></div>
  </div>

  <div class="panel" style="margin-top:22px;">
    <div class="panel-head"><h3>Mutasi Saldo Terbaru</h3></div>
    <div class="table-scroll"><table><thead><tr><th>Tanggal</th><th>Pengguna</th><th>Jenis</th><th>Jumlah</th><th>Catatan</th><th>Oleh</th></tr></thead><tbody>
    ${logs.length===0?`<tr><td colspan="6"><div class="empty-state"><div class="em">🧾</div>Belum ada mutasi saldo.</div></td></tr>`:
    logs.map(l=>{
      const m = state.users.find(x=>x.id===l.sellerId);
      const neg = Number(l.amount)<0;
      return `<tr><td>${l.date}</td><td>${m?esc(m.name):'-'}</td><td>${neg?'<span class="badge badge-red">Dikurangi</span>':'<span class="badge badge-green">Ditambah</span>'}</td><td style="color:${neg?'var(--red)':'var(--leaf)'};">${neg?'-':'+'}${fmtRp(Math.abs(l.amount))}</td><td>${esc(l.note)||'-'}</td><td>${esc(l.by)||'-'}</td></tr>`;
    }).join('')}
    </tbody></table></div>
  </div>

  <div class="panel" style="margin-top:22px;">
    <div class="panel-head"><h3>Riwayat Penarikan Dana</h3></div>
    <div class="table-scroll"><table><thead><tr><th>Pengguna</th><th>Jumlah</th><th>Metode</th><th>Nama Pemilik</th><th>Alamat Penarikan</th><th>Tanggal</th><th>Status</th></tr></thead><tbody>
    ${state.withdrawals.length===0?`<tr><td colspan="7"><div class="empty-state"><div class="em">💳</div>Belum ada penarikan.</div></td></tr>`:
    state.withdrawals.map(w=>{
      const s = state.users.find(u=>u.id===w.sellerId);
      return `<tr><td>${s?esc(s.name):'-'}</td><td>${fmtRp(w.amount)}</td><td>${esc(w.method)}</td><td>${esc(w.holder)||'-'}</td><td>${esc(w.address)||'-'}</td><td>${w.date}</td><td>${badgeWd(w.status)}</td></tr>`;
    }).join('')}
    </tbody></table></div>
  </div>`;
}

function pageStaffPenarikan(){
  return `
  <div class="pg-head"><div><h1>Penarikan Dana</h1><p>Setujui atau tolak permintaan penarikan mitra.</p></div></div>
  <div class="panel"><div class="table-scroll"><table><thead><tr><th>Mitra</th><th>Jumlah</th><th>Metode</th><th>Nama Pemilik</th><th>Alamat Penarikan</th><th>Tanggal</th><th>Status</th><th></th></tr></thead><tbody>
    ${state.withdrawals.length===0?`<tr><td colspan="8"><div class="empty-state"><div class="em">💳</div>Belum ada permintaan.</div></td></tr>`:
    state.withdrawals.map(w=>{
      const s = state.users.find(u=>u.id===w.sellerId);
      return `<tr><td>${s?s.name:'-'}</td><td>${fmtRp(w.amount)}</td><td>${w.method}</td><td>${w.holder||'-'}</td><td>${w.address||'-'}</td><td>${w.date}</td>
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
  const methods = state.settings.paymentMethods||[];
  const pm = methods.find(m=>m.id===document.getElementById('wf-method').value);
  if(!pm){ toast('Pilih metode penarikan dulu'); return; }
  const holder = document.getElementById('wf-holder').value.trim();
  const address = document.getElementById('wf-address').value.trim();
  const amount = Number(document.getElementById('wf-amount').value);
  if(!holder || !address || !amount){ toast('Lengkapi semua data penarikan'); return; }
  if(amount > sellerBalance(u.id)){ toast('Jumlah melebihi saldo yang bisa ditarik ('+fmtRp(Math.max(sellerBalance(u.id),0))+')'); return; }
  state.withdrawals.unshift({id:'w'+Date.now(), sellerId:u.id, amount, method:pm.name, methodId:pm.id, holder, address, status:'Menunggu', date:new Date().toISOString().slice(0,10)});
  persist(); state.formModal=null; render(); toast('Permintaan penarikan dikirim');
}

function pageStaffPengaturan(){
  return `
  <div class="pg-head"><div><h1>Pengaturan</h1><p>Atur struktur matrix jaringan referral mitra.</p></div></div>
  <div class="panel">
    <div class="panel-head"><h3>Struktur Matrix Referral Mitra</h3></div>
    <div class="field-hint" style="margin-bottom:14px;">Lebar = jumlah posisi langsung per mitra. Kedalaman = jumlah level yang dihitung & ditampilkan. Mitra baru yang posisi sponsornya penuh otomatis ditempatkan di bawah jaringan sponsor (spillover).</div>
    <div class="reseller-price-row"><div class="nm">Lebar (posisi per mitra)</div><input type="number" min="1" max="10" id="mx-width" value="${matrixCfg().width}"></div>
    <div class="reseller-price-row"><div class="nm">Kedalaman (jumlah level)</div><input type="number" min="1" max="10" id="mx-depth" value="${matrixCfg().depth}"></div>
    <button class="btn btn-primary" style="margin-top:16px;" onclick="saveMatrix()">Simpan Pengaturan Matrix</button>
  </div>`;
}

function PortalFormModals(){
  if(!state.formModal) return '';
  const t = state.formModal.type;
  if(t==='proofview'){
    const o = state.orders.find(x=>x.id===state.formModal.orderId);
    if(!o) return '';
    const pr = state.proofCache[o.id];
    const st = payStatusOf(o);
    return `<div class="overlay" onclick="if(event.target===this) closeFormModal()"><div class="modal">
      <div class="modal-top"><h3>Bukti Pembayaran #${o.id}</h3><button class="x-btn" onclick="closeFormModal()">✕</button></div>
      <div style="padding:12px 14px;background:var(--card);border-radius:var(--radius-md);margin-bottom:14px;font-size:13.5px;line-height:1.7;">
        <div><span style="color:var(--text-dimmer);">Pembeli:</span> <b>${esc(o.buyerName)}</b> · ${esc(o.buyerWa||'-')}</div>
        <div><span style="color:var(--text-dimmer);">Alamat:</span> ${esc(o.buyerAddress||'-')}</div>
        <div><span style="color:var(--text-dimmer);">Total:</span> <b>${fmtRp(o.total)}</b> · ${esc(o.paymentMethod||'-')}</div>
        <div><span style="color:var(--text-dimmer);">Status:</span> ${payStatusBadge(o)}</div>
        ${o.proofAt?`<div><span style="color:var(--text-dimmer);">Dikirim:</span> ${new Date(o.proofAt).toLocaleString('id-ID')}</div>`:''}
        ${st==='Ditolak'&&o.paymentNote?`<div><span style="color:var(--text-dimmer);">Alasan ditolak:</span> ${esc(o.paymentNote)}</div>`:''}
      </div>
      ${state.formModal.loading?`<div class="empty-state">Memuat foto…</div>`:(pr&&pr.image?`<a href="${pr.image}" target="_blank" rel="noopener"><img class="proof-img" src="${pr.image}" alt="Bukti pembayaran"></a><div class="field-hint" style="margin-top:6px;">Klik foto untuk membuka ukuran penuh.</div>`:`<div class="empty-state">Foto bukti tidak ditemukan.</div>`)}
      <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;">
        ${st!=='Terkonfirmasi'?`<button class="btn btn-leaf" style="flex:1;" onclick="confirmPaymentProof('${o.id}')">✓ Konfirmasi Pembayaran</button>`:''}
        ${st!=='Ditolak'?`<button class="btn btn-danger" style="flex:1;" onclick="rejectPaymentProof('${o.id}')">✕ Tolak</button>`:''}
      </div>
    </div></div>`;
  }
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
        <div class="field"><label>Nama</label><input id="uf-name" required value="${u?esc(u.name):''}"></div>
        <div class="field"><label>Email</label><input id="uf-email" type="email" required value="${u?esc(u.email):''}"></div>
        <div class="field"><label>Password ${u?'(isi untuk mengubah)':''}</label>
          <div class="pw-wrap">
            <input id="uf-pass" type="text" value="${u?esc(u.password||''):''}" placeholder="${u?'Kosongkan jika tidak diubah':'Password awal'}" ${u?'':'required'} autocomplete="off">
          </div>
          <div class="field-hint">Admin dapat melihat & mengubah password pengguna.</div>
        </div>
        <div class="field"><label>Role</label><select id="uf-role" onchange="document.getElementById('uf-ref-wrap').style.display=this.value==='member'?'block':'none'">
          ${['owner','admin','member'].map(r=>`<option value="${r}" ${u&&u.role===r?'selected':''}>${r==='member'?'member (mitra referral)':r}</option>`).join('')}
        </select></div>
        <div id="uf-ref-wrap" style="${u&&u.role==='member'?'':'display:none'}"><div class="field"><label>Kode Referral</label><input id="uf-ref" value="${u?esc(u.refCode||''):''}" placeholder="Otomatis jika kosong"></div></div>
        <div class="field"><label>Alamat</label><textarea id="uf-address" placeholder="Alamat lengkap pengguna">${u?esc(u.address||''):''}</textarea></div>
        <button class="btn btn-primary btn-block" type="submit">Simpan Pengguna</button>
      </form></div></div>`;
  }
  if(t==='balance'){
    const m = state.users.find(x=>x.id===state.formModal.sellerId);
    if(!m) return '';
    const kurang = state.formModal.mode==='kurang';
    const avail = Math.max(sellerBalance(m.id),0);
    return `<div class="overlay" onclick="if(event.target===this) closeFormModal()"><div class="modal">
      <div class="modal-top"><h3>${kurang?'Kurangi Saldo Pengguna':'Isi Saldo Mitra'}</h3><button class="x-btn" onclick="closeFormModal()">✕</button></div>
      <form onsubmit="submitBalanceForm(event)">
        <div class="fake-stat"><div class="l">Pengguna</div><div class="v">${esc(m.name)}</div></div>
        ${kurang?'':`<div class="fake-stat"><div class="l">Komisi pending</div><div class="v">${fmtRp(sellerPending(m))}</div></div>`}
        <div class="fake-stat"><div class="l">Saldo saat ini</div><div class="v">${fmtRp(avail)}</div></div>
        <div class="field" style="margin-top:14px;"><label>Jumlah (Rp)</label><input id="bf-amount" type="number" min="1" step="1" ${kurang?`max="${avail}"`:''} required placeholder="Contoh: ${kurang?'50000':'150000'}"><div class="field-hint">${kurang?'Maksimal sebesar saldo yang tersedia. Saldo yang sedang diajukan penarikan tidak bisa dikurangi.':'Isi angka positif. Untuk mengurangi saldo gunakan tombol Kurangi.'}</div></div>
        <div class="field"><label>${kurang?'Alasan pengurangan':'Catatan (opsional)'}</label><input id="bf-note" ${kurang?'required':''} placeholder="${kurang?'Contoh: Salah input saldo / koreksi order #1024':'Contoh: Komisi order #1024, 1025'}"></div>
        <button class="btn btn-primary btn-block" type="submit" ${kurang?'style="background:var(--red);border-color:var(--red);"':''}>${kurang?'Kurangi Saldo':'Simpan Saldo'}</button>
      </form></div></div>`;
  }
  if(t==='pendingAdjust'){
    const m = state.users.find(x=>x.id===state.formModal.sellerId);
    if(!m) return '';
    const curr = sellerPending(m);
    const auto = sellerCommissionTotal(m) - sellerCredited(m.id);
    return `<div class="overlay" onclick="if(event.target===this) closeFormModal()"><div class="modal">
      <div class="modal-top"><h3>Atur Komisi Pending</h3><button class="x-btn" onclick="closeFormModal()">✕</button></div>
      <form onsubmit="submitPendingForm(event)">
        <div class="fake-stat"><div class="l">Mitra</div><div class="v">${esc(m.name)}</div></div>
        <div class="fake-stat"><div class="l">Pending saat ini</div><div class="v" style="color:var(--gold-2)">${fmtRp(curr)}</div></div>
        <div class="fake-stat"><div class="l">Hitungan otomatis (order − saldo masuk)</div><div class="v">${fmtRp(Math.max(auto,0))}</div></div>
        <div class="field" style="margin-top:14px;"><label>Set Komisi Pending (Rp)</label>
          <input id="pf-target" type="number" min="0" step="1000" required value="${curr}" style="font-size:18px;font-weight:700;">
          <div class="field-hint">Admin bebas mengatur nominal berapa pun (≥ 0). Nilai ini langsung tampil di dashboard mitra. Semua perubahan tercatat di riwayat koreksi.</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
          <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('pf-target').value=0">Set 0</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('pf-target').value=${Math.max(auto,0)}">Pakai hitungan otomatis</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('pf-target').value=${curr}">Kembali ke saat ini</button>
        </div>
        <div class="field"><label>Catatan</label><input id="pf-note" placeholder="Contoh: Bonus manual / koreksi order #1024"></div>
        <button class="btn btn-primary btn-block" type="submit">Simpan Komisi Pending</button>
      </form></div></div>`;
  }
  if(t==='withdraw'){
    const methods = (state.settings.paymentMethods||[]).filter(p=>p.active);
    return `<div class="overlay" onclick="if(event.target===this) closeFormModal()"><div class="modal">
      <div class="modal-top"><h3>Ajukan Penarikan Dana</h3><button class="x-btn" onclick="closeFormModal()">✕</button></div>
      <form onsubmit="submitWithdrawForm(event)">
        <div class="field"><label>Tarik Dana ke</label>
          ${methods.length===0?`<div class="field-hint">Belum ada metode pencairan aktif dari admin. Hubungi admin untuk mengaktifkan metode pembayaran.</div>`:
          `<select id="wf-method" required>${methods.map(m=>`<option value="${m.id}">${esc(m.name)} (${payTypeLabel(m.type)})</option>`).join('')}</select>`}
        </div>
        <div class="field"><label>Nama Pemilik</label><input id="wf-holder" required placeholder="Nama sesuai rekening/akun tujuan"></div>
        <div class="field"><label>Alamat Penarikan</label><input id="wf-address" required placeholder="No. rekening / No. HP / alamat e-wallet tujuan"></div>
        <div class="field"><label>Jumlah (Rp)</label><input id="wf-amount" type="number" min="1" required></div>
        <button class="btn btn-primary btn-block" type="submit" ${methods.length===0?'disabled':''}>Kirim Permintaan</button>
      </form></div></div>`;
  }
  if(t==='payment'){
    const d = state.formModal.draft || {};
    return `<div class="overlay" onclick="if(event.target===this) closeFormModal()"><div class="modal">
      <div class="modal-top"><h3>${state.formModal.id?'Edit':'Tambah'} Metode Pembayaran</h3><button class="x-btn" onclick="closeFormModal()">✕</button></div>
      <form onsubmit="submitPaymentForm(event)">
        <div class="field"><label>Jenis</label><select id="pmf-type">
          ${['qris','ewallet','bank','other'].map(k=>`<option value="${k}" ${d.type===k?'selected':''}>${payTypeLabel(k)}</option>`).join('')}
        </select></div>
        <div class="field"><label>Nama Metode</label><input id="pmf-name" required value="${esc(d.name)}" placeholder="Contoh: GoPay, DANA, Bank BCA"></div>
        <div class="field"><label>No. Rekening / Nomor HP</label><input id="pmf-number" value="${esc(d.accountNumber)}" placeholder="Kosongkan bila hanya QRIS"></div>
        <div class="field"><label>Atas Nama</label><input id="pmf-holder" value="${esc(d.accountName)}"></div>
        <div class="field"><label>Gambar QR (opsional)</label>
          <div class="img-drop">
            ${d.qrImage?`<img class="prev" src="${d.qrImage}" style="max-width:200px;">`:`<div class="lbl" style="margin-bottom:8px;">Belum ada gambar QR.</div>`}
            <input type="file" accept="image/*" onchange="handlePaymentQrChange(this)">
            <div class="lbl">Klik untuk ${d.qrImage?'ganti':'unggah'} gambar QR</div>
          </div>
          ${d.qrImage?`<a style="color:var(--red);font-size:12px;" onclick="removePaymentQr()">Hapus gambar QR</a>`:''}
        </div>
        <div class="field"><label>Catatan untuk pembeli (opsional)</label><textarea id="pmf-note" placeholder="Contoh: Transfer sesuai nominal sampai 3 digit terakhir">${esc(d.note)}</textarea></div>
        <div class="field" style="display:flex;align-items:center;gap:10px;"><input type="checkbox" id="pmf-active" ${d.active?'checked':''} style="width:auto;"><label style="margin:0;">Tampilkan di checkout</label></div>
        <button class="btn btn-primary btn-block" type="submit">Simpan Metode</button>
      </form></div></div>`;
  }
  if(t==='notif'){
    return `<div class="overlay" onclick="if(event.target===this) closeFormModal()"><div class="modal">
      <div class="modal-top"><h3>Kirim Pemberitahuan ke Mitra</h3><button class="x-btn" onclick="closeFormModal()">✕</button></div>
      <form onsubmit="submitNotifForm(event)">
        <div class="field"><label>Judul</label><input id="nf-title" required placeholder="Contoh: Update Stok Produk"></div>
        <div class="field"><label>Pesan</label><textarea id="nf-message" required placeholder="Tulis info atau pembaruan untuk mitra..."></textarea></div>
        <button class="btn btn-primary btn-block" type="submit">Kirim ke Semua Mitra</button>
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
    case '#/portal/pembayaran': content = pageStaffPembayaran(); break;
    case '#/portal/pemberitahuan': content = pageStaffPemberitahuan(); break;
    case '#/portal/pengumuman': content = pageStaffPengumuman(); break;
    case '#/portal/keuangan': content = pageStaffKeuangan(); break;
    case '#/portal/penarikan': content = pageStaffPenarikan(); break;
    case '#/portal/pengaturan': content = pageStaffPengaturan(); break;
    case '#/portal/chat': content = pageStaffChat(); break;
    default: content = pageStaffDashboard();
  }
  return `<div class="dash-wrap">${StaffSidebar(u)}<div class="dash-main">${content}</div></div>${PortalFormModals()}${Toast()}`;
}

/* =====================================================
   ROUTER / RENDER
===================================================== */
function Toast(){ return state.toast ? `<div class="toast"><span class="dotg"></span>${state.toast}</div>` : ''; }

function renderPublicPage(inner){
  return `${Nav()}${inner}${Foot()}${ProductModal()}${CartDrawer()}${CheckoutModal()}${PaymentInfoModal()}${AuthModal()}${ChatWidget()}${Toast()}`;
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
  } else if(r==='#/seller/referral'){
    html = pageSellerReferral() + Toast();
  } else if(r==='#/seller/pemberitahuan'){
    html = pageSellerNotif() + Toast();
  } else if(r==='#/seller/profil'){
    html = pageSellerProfil() + Toast();
  } else if(r==='#/seller/penarikan'){
    html = pageSellerPenarikan() + PortalFormModals() + Toast();
  } else if(r.startsWith('#/akun')){
    html = renderAkunCustomer();
  } else if(r==='#/produk'){
    const q = state.searchQuery;
    html = renderPublicPage(`<div class="wrap section" style="padding-top:50px;"><div class="section-head"><div class="kicker">Katalog</div><h2>${q?`Hasil pencarian: "${esc(q)}"`:`Semua Produk ${SITE_NAME}`}</h2>${q?`<button class="btn btn-ghost btn-sm" style="margin-top:14px;" onclick="clearSearch()">✕ Hapus pencarian</button>`:''}</div>${ProductGrid(null, q)}</div>`);
  } else if(r==='#/jadi-seller'){
    html = renderPublicPage(SellerCta());
  } else {
    html = renderPublicPage(`${Hero()}${Why()}${ProdukSection()}`);
  }
  document.getElementById('app').innerHTML = html;
  requestAnimationFrame(initReveal);
}

/* Lightweight scroll-reveal (IntersectionObserver, no lib) */
function initReveal(){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('.section-head, .why-card, .reseller-cta > div, .stat-card, .panel, .pkg-card');
  if(!els.length) return;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  },{threshold:0.12, rootMargin:'0px 0px -40px 0px'});
  els.forEach((el,i)=>{
    el.classList.add('reveal');
    if(i % 4 === 1) el.classList.add('reveal-delay-1');
    else if(i % 4 === 2) el.classList.add('reveal-delay-2');
    else if(i % 4 === 3) el.classList.add('reveal-delay-3');
    io.observe(el);
  });
}

/* Nav shadow on scroll */
(function(){
  let ticking = false;
  window.addEventListener('scroll', ()=>{
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(()=>{
      const nav = document.querySelector('.cnav');
      if(nav) nav.classList.toggle('scrolled', window.scrollY > 8);
      ticking = false;
    });
  }, {passive:true});
})();

state.route = location.hash || '#/beranda';
initData();
