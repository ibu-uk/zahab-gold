// ── Zahab Gold v2 — App Logic ─────────────────────────────────
let STATE = {
  user:null, goldUSD:3200.00, currencies:{}, branches:[],
  cart:[], holds:[], posKarat:'all', catFilter:'', invFilter:'',
  activeBranch:null, allItems:[],
  lang: localStorage.getItem('zahab_lang')||'en'
};

const AR = {
  'Dashboard':'لوحة التحكم','Point of Sale':'نقطة البيع','Invoices':'الفواتير',
  'Special Orders':'طلبات خاصة','Items Catalog':'كتالوج المنتجات','Add New Item':'إضافة منتج',
  'Karat Prices':'أسعار الكيلو','Low Stock Alerts':'تنبيهات المخزون','Categories':'الفئات',
  'Buyback (Buy Gold)':'شراء ذهب','Returns & Refunds':'المرتجعات','Purchase Orders':'أوامر الشراء',
  'Installments':'الأقساط','Branches (GCC)':'الفروع','Suppliers':'الموردون',
  'Currency':'العملات','Reports':'التقارير','Customers':'العملاء',
  'Users & Roles':'المستخدمون','Audit Log':'سجل النشاط','Settings':'الإعدادات'
};
function t(k){ return (STATE.lang==='ar'&&AR[k])?AR[k]:k; }

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async()=>{
  STATE.user = requireAuth(); if(!STATE.user)return;
  resetIdleTimer();
  if(STATE.lang==='ar') applyArabic();
  document.getElementById('user-av').textContent = (STATE.user.name||'U').charAt(0).toUpperCase();
  document.getElementById('user-av').title = STATE.user.name+' ('+STATE.user.role+')';
  await Promise.all([loadGoldRate(), loadCurrencies(), loadBranches()]);
  loadDashboard();
  setInterval(tickGoldPrice,60000);
  const today=new Date().toISOString().split('T')[0];
  const firstDay=new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().split('T')[0];
  const rF=document.getElementById('rep-from');if(rF)rF.value=firstDay;
  const rT=document.getElementById('rep-to');if(rT)rT.value=today;
  const trd=document.getElementById('tr-date');if(trd)trd.value=today;
});

// ── LANGUAGE ──────────────────────────────────────────────────
function toggleLang(){
  STATE.lang=STATE.lang==='en'?'ar':'en';
  localStorage.setItem('zahab_lang',STATE.lang);
  if(STATE.lang==='ar')applyArabic();else applyEnglish();
}
function applyArabic(){
  document.documentElement.setAttribute('dir','rtl');
  document.getElementById('lang-btn').textContent='EN';
}
function applyEnglish(){
  document.documentElement.setAttribute('dir','ltr');
  document.getElementById('lang-btn').textContent='AR';
}

// ── NAV ───────────────────────────────────────────────────────
const PAGE_TITLES={
  dashboard:'Dashboard',pos:'Point of Sale',invoices:'Invoices',orders:'Special Orders',
  items:'Items Catalog','add-item':'Add New Item','edit-item':'Edit Item',
  karats:'Karat Prices','low-stock':'Low Stock Alerts',categories:'Categories',
  buyback:'Buyback (Buy Gold)',returns:'Returns & Refunds',purchases:'Purchase Orders',
  installments:'Installments',branches:'Branches (GCC)',suppliers:'Suppliers',
  currency:'Currency',reports:'Reports',customers:'Customers',
  users:'Users & Roles',audit:'Audit Log',settings:'Settings'
};
const PAGE_LOAD={
  pos:loadPosItems,invoices:loadInvoices,orders:loadOrders,
  items:loadCatalog,karats:loadKarats,branches:loadBranchPage,
  currency:loadCurrency,reports:loadReport,customers:loadCustomers,
  settings:loadSettings,'add-item':initAddItem,users:loadUsers,
  'low-stock':loadLowStock,categories:loadCategories,
  buyback:loadBuyback,returns:loadReturns,purchases:loadPurchases,
  installments:loadInstallments,suppliers:loadSuppliers,audit:loadAuditLog
};
function nav(page,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const pg=document.getElementById('pg-'+page);
  if(pg)pg.classList.add('active');
  if(el)el.classList.add('active');
  else document.querySelectorAll('.nav-item').forEach(n=>{
    if(n.getAttribute('onclick')&&n.getAttribute('onclick').includes("'"+page+"'"))n.classList.add('active');
  });
  const ttl=PAGE_TITLES[page]||page;
  document.getElementById('pg-title').textContent=STATE.lang==='ar'?(AR[ttl]||ttl):ttl;
  if(PAGE_LOAD[page])PAGE_LOAD[page]();
  return false;
}
function logout(){API.clearToken();window.location.href='/login.html';}

// ── GOLD RATE ─────────────────────────────────────────────────
async function loadGoldRate(){
  try{
    const d=await API.goldRate();
    STATE.goldUSD=parseFloat(d.data.usd_per_oz)||3200;
    document.getElementById('gold-px').textContent='$'+STATE.goldUSD.toFixed(2);
    const gi=document.getElementById('gold-rate-input');if(gi)gi.value=STATE.goldUSD.toFixed(2);
  }catch(e){}
}
function tickGoldPrice(){loadGoldRate();}
async function saveGoldRate(){
  const v=parseFloat(document.getElementById('gold-rate-input').value);
  if(!v)return toast('Enter valid rate','error');
  try{await API.setGoldRate(v);STATE.goldUSD=v;document.getElementById('gold-px').textContent='$'+v.toFixed(2);toast('Gold rate updated');loadKarats();}
  catch(e){toast(e.message,'error');}
}
async function fetchLiveGoldRate(){
  try{toast('Fetching live rate...','info');const d=await API.liveGoldRate();
    STATE.goldUSD=parseFloat(d.data.usd_per_oz);
    document.getElementById('gold-px').textContent='$'+STATE.goldUSD.toFixed(2);
    const gi=document.getElementById('gold-rate-input');if(gi)gi.value=STATE.goldUSD.toFixed(2);
    toast('Live rate: $'+STATE.goldUSD.toFixed(2));loadKarats();
  }catch(e){toast(e.message,'error');}
}

// ── CURRENCIES ────────────────────────────────────────────────
async function loadCurrencies(){
  try{const d=await API.currencies();STATE.currencies={};d.data.forEach(c=>STATE.currencies[c.code]=parseFloat(c.rate_to_usd));}
  catch(e){STATE.currencies={KWD:0.308,SAR:3.75,AED:3.67,BHD:0.376,QAR:3.64,OMR:0.385,USD:1};}
}

// ── BRANCHES ─────────────────────────────────────────────────
async function loadBranches(){
  try{
    const d=await API.branches();STATE.branches=d.data;
    if(STATE.branches.length){
      const saved=STATE.user.branch_id;
      STATE.activeBranch=STATE.branches.find(b=>b.id===saved)||STATE.branches[0];
      document.getElementById('act-branch').textContent=STATE.activeBranch.name;
      document.getElementById('curr-lbl').textContent=STATE.activeBranch.currency_code;
    }
    ['ni-branch','om-branch','tr-from','tr-to','cm-branch'].forEach(id=>{
      const sel=document.getElementById(id);if(!sel)return;
      sel.innerHTML=STATE.branches.map(b=>`<option value="${b.id}">${b.flag||''} ${b.name}</option>`).join('');
    });
    const umb=document.getElementById('um-branch');
    if(umb)umb.innerHTML='<option value="">All Branches</option>'+STATE.branches.map(b=>`<option value="${b.id}">${b.flag||''} ${b.name}</option>`).join('');
    const pob=document.getElementById('po-branch');
    if(pob)pob.innerHTML=STATE.branches.map(b=>`<option value="${b.id}">${b.flag||''} ${b.name}</option>`).join('');
    const bbb=document.getElementById('bb-branch');
    if(bbb)bbb.innerHTML=STATE.branches.map(b=>`<option value="${b.id}">${b.flag||''} ${b.name}</option>`).join('');
    const retb=document.getElementById('ret-branch');
    if(retb)retb.innerHTML=STATE.branches.map(b=>`<option value="${b.id}">${b.flag||''} ${b.name}</option>`).join('');
  }catch(e){}
}

// ── DASHBOARD ─────────────────────────────────────────────────
async function loadDashboard(){
  try{
    const today=new Date().toISOString().split('T')[0];
    const [stats,invD,ordD]=await Promise.all([API.dashboardStats(),API.invoices({from_date:today,to_date:today}),API.orders({status:'pending'})]);
    const s=stats.data; const curr=STATE.activeBranch?.currency_code||'KWD';
    document.getElementById('ds-sales').textContent=fmtCurr(s.today_sales?.revenue||0,curr);
    document.getElementById('ds-inv').textContent=s.today_sales?.count||0;
    document.getElementById('ds-weight').textContent=parseFloat(s.today_sales?.weight||0).toFixed(1)+'g';
    document.getElementById('ds-orders').textContent=s.orders?.total||0;
    // Low stock strip
    if((s.low_stock||0)>0){const st=document.getElementById('dash-low-strip');if(st){st.style.display='flex';st.querySelector('span').textContent=(s.low_stock)+' items below minimum stock';}}
    // Recent invoices
    const invs=invD.data||[];
    document.getElementById('dash-inv-list').innerHTML=invs.slice(0,6).map(i=>
      `<tr><td style="color:var(--gold);font-size:11px">${i.invoice_number}</td><td>${i.customer_name||'Walk-in'}</td><td style="color:var(--gold)">${fmtCurr(i.total,i.currency_code)}</td><td><span class="badge ${i.payment_status==='paid'?'green':i.payment_status==='pending'?'gold':'red'}">${i.payment_status}</span></td></tr>`
    ).join('')||'<tr><td colspan="4" class="empty"><i class="ti ti-check"></i>No sales today</td></tr>';
    // Pending orders
    const ords=ordD.data||[];
    document.getElementById('dash-orders-list').innerHTML=ords.slice(0,5).map(o=>
      `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--brd)"><div style="width:36px;height:36px;background:var(--bg3);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px">💍</div><div style="flex:1"><div style="font-size:12px;color:var(--tx)">${o.customer_name||'Walk-in'}</div><div style="font-size:10px;color:var(--tx3)">${(o.description||'').slice(0,35)}...</div></div><span class="badge ${o.status==='ready'?'green':o.status==='pending'?'blue':'gold'}">${o.status}</span></div>`
    ).join('')||'<div class="empty"><i class="ti ti-check"></i>No pending orders</div>';
    renderDashboardCharts();
  }catch(e){console.error(e);}
}
async function renderDashboardCharts(){
  try{
    if(typeof Chart==='undefined')return;
    const [histD,repD]=await Promise.all([API.goldHistory(),API.salesReport()]);
    const gc=document.getElementById('gold-chart');
    if(gc&&histD.data?.length){
      if(window._gc)window._gc.destroy();
      window._gc=new Chart(gc,{type:'line',data:{labels:histD.data.map(r=>r.date.slice(5)),datasets:[{label:'XAU/USD',data:histD.data.map(r=>parseFloat(r.usd_per_oz)),borderColor:'#C9A84C',backgroundColor:'rgba(201,168,76,.1)',tension:.3,fill:true,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#706858',font:{size:9}},grid:{color:'rgba(42,42,58,.5)'}},y:{ticks:{color:'#706858',font:{size:9}},grid:{color:'rgba(42,42,58,.5)'}}} }});
    }
    const sc=document.getElementById('sales-chart');const byDay=repD.data?.by_day||[];
    if(sc&&byDay.length){
      if(window._sc)window._sc.destroy();
      window._sc=new Chart(sc,{type:'bar',data:{labels:byDay.slice(-14).map(d=>d.day.slice(5)),datasets:[{label:'Revenue',data:byDay.slice(-14).map(d=>parseFloat(d.revenue)),backgroundColor:'rgba(201,168,76,.5)',borderColor:'#C9A84C',borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#706858',font:{size:9}},grid:{color:'rgba(42,42,58,.5)'}},y:{ticks:{color:'#706858',font:{size:9}},grid:{color:'rgba(42,42,58,.5)'}}} }});
    }
    const kc=document.getElementById('karat-chart');const byK=repD.data?.by_karat||[];
    if(kc&&byK.length){
      if(window._kc)window._kc.destroy();
      window._kc=new Chart(kc,{type:'doughnut',data:{labels:byK.map(k=>k.karat),datasets:[{data:byK.map(k=>parseFloat(k.revenue)),backgroundColor:['#C9A84C','#8B6914','#F0D080','#5a4010','#b8860b','#daa520']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#B0A88C',font:{size:10}}}}}});
    }
  }catch(e){}
}

// ── POS ───────────────────────────────────────────────────────
async function loadPosItems(){
  document.getElementById('pos-grid').innerHTML='<div class="loading"><i class="ti ti-refresh"></i>Loading...</div>';
  try{
    const bid=STATE.activeBranch?.id;
    const q={branch_id:bid};
    if(STATE.posKarat!=='all')q.karat=STATE.posKarat;
    const s=document.getElementById('pos-q')?.value;if(s)q.search=s;
    const d=await API.items(q);STATE.allItems=d.data;
    renderPosGrid(d.data);await loadCustomersSelect();
  }catch(e){document.getElementById('pos-grid').innerHTML=`<div class="empty"><i class="ti ti-alert-circle"></i>${e.message}</div>`;}
}
function renderPosGrid(items){
  const curr=document.getElementById('pos-curr')?.value||STATE.activeBranch?.currency_code||'KWD';
  const rate=STATE.currencies[curr]||0.308;
  const vat=parseFloat(STATE.activeBranch?.vat_rate||0);
  const d3=['KWD','BHD','OMR'].includes(curr)?3:2;
  document.getElementById('pos-grid').innerHTML=items.map(it=>{
    const p=calcPriceWithVat(STATE.goldUSD,it.karat,it.weight_grams,it.making_pct,rate,vat);
    const inCart=STATE.cart.find(c=>c.id===it.id);
    const imgSrc=it.images?'/uploads/items/'+it.images.split('|')[0]:null;
    const qty=it.stock?.qty??0;const minQty=it.stock?.min_qty??1;
    const sc=qty===0?'out':qty<=minQty?'low':'ok';
    const sl=qty===0?'Out':qty<=minQty?qty+' left':qty;
    return `<div class="item-card${inCart?' sel':''}${qty===0?' out-of-stock':''}" onclick="${qty>0?'addToCart('+it.id+')':'void(0)'}">
      <div class="item-img">${imgSrc?`<img src="${imgSrc}" alt="${it.name}"/>`:(it.icon||'💍')}</div>
      <div class="item-info">
        <div class="item-name">${STATE.lang==='ar'&&it.name_ar?it.name_ar:it.name}</div>
        <div class="item-sku">${it.sku} • ${it.karat}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px">
          <div class="item-price">${curr} ${p.toFixed(d3)}</div>
          <span class="stock-badge stock-${sc}">${sl}</span>
        </div>
        <div style="font-size:10px;color:var(--tx3)">${it.weight_grams}g${inCart?` <span class="badge green">In Cart</span>`:''}</div>
      </div></div>`;
  }).join('')||'<div class="empty"><i class="ti ti-diamond"></i>No items found</div>';
}
function posSearch(){
  const q=document.getElementById('pos-q').value.toLowerCase();
  if(!q){renderPosGrid(STATE.allItems);return;}
  renderPosGrid(STATE.allItems.filter(i=>i.name.toLowerCase().includes(q)||i.sku.toLowerCase().includes(q)||(i.name_ar||'').includes(q)));
}
function posBarcodeScan(e){
  if(e.key!=='Enter')return;
  const sku=document.getElementById('pos-scan')?.value.trim();if(!sku)return;
  const it=STATE.allItems.find(i=>i.sku===sku||i.sku.toLowerCase()===sku.toLowerCase());
  if(it){addToCart(it.id);toast('Added: '+it.name);document.getElementById('pos-scan').value='';}
  else{toast('SKU not found: '+sku,'error');}
}
function setPosKarat(k,el){
  STATE.posKarat=k;
  document.querySelectorAll('#pos-karat-filter .chip').forEach(c=>c.classList.remove('active'));
  if(el)el.classList.add('active');loadPosItems();
}
function addToCart(id){
  const it=STATE.allItems.find(i=>i.id===id);if(!it)return;
  const avail=it.stock?.qty??999;const ex=STATE.cart.find(c=>c.id===id);
  if(avail===0){toast('Out of stock','error');return;}
  if(ex&&ex.qty>=avail){toast(`Only ${avail} in stock`,'error');return;}
  if(ex)ex.qty++;else STATE.cart.push({...it,qty:1});
  updateCartUI();renderPosGrid(STATE.allItems);
}
function changeCartQty(id,delta){
  const c=STATE.cart.find(x=>x.id===id);if(!c)return;
  const nq=c.qty+delta;const av=c.stock?.qty??999;
  if(nq<1){removeFromCart(id);return;}
  if(nq>av){toast('Only '+av+' in stock','error');return;}
  c.qty=nq;updateCartUI();renderPosGrid(STATE.allItems);
}
function removeFromCart(id){STATE.cart=STATE.cart.filter(c=>c.id!==id);updateCartUI();renderPosGrid(STATE.allItems);}
function clearCart(){STATE.cart=[];updateCartUI();renderPosGrid(STATE.allItems);}
function updateCartUI(){
  const curr=document.getElementById('pos-curr')?.value||STATE.activeBranch?.currency_code||'KWD';
  const rate=STATE.currencies[curr]||0.308;
  const vat=parseFloat(STATE.activeBranch?.vat_rate||0);
  if(!STATE.cart.length){
    document.getElementById('cart-body').innerHTML='<div class="empty"><i class="ti ti-diamond"></i>No items added</div>';
    ['ct-sub','ct-making','ct-disc-val','ct-vat'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent='0.000';});
    const t=document.getElementById('ct-total');if(t)t.textContent=curr+' 0.000';
    const vl=document.getElementById('ct-vat-lbl');if(vl)vl.textContent='VAT ('+vat+'%)';
    return;
  }
  document.getElementById('cart-body').innerHTML=STATE.cart.map(c=>{
    const p=calcPrice(STATE.goldUSD,c.karat,c.weight_grams,c.making_pct,rate);
    return `<div class="cart-item"><div><div style="color:var(--tx);font-weight:500">${STATE.lang==='ar'&&c.name_ar?c.name_ar:c.name}</div><div style="color:var(--tx3);font-size:10px">${c.karat} • ${c.weight_grams}g × ${c.qty}&nbsp;<button onclick="changeCartQty(${c.id},-1)" style="background:none;border:none;color:var(--tx3);cursor:pointer;font-size:13px">−</button><button onclick="changeCartQty(${c.id},1)" style="background:none;border:none;color:var(--tx3);cursor:pointer;font-size:13px">+</button></div></div><div style="display:flex;align-items:center;gap:8px"><span style="color:var(--gold);font-weight:700">${(p*c.qty).toFixed(3)}</span><button onclick="removeFromCart(${c.id})" style="background:none;border:none;color:var(--red);cursor:pointer">✕</button></div></div>`;
  }).join('');updateCartTotal();
}
function updateCartTotal(){
  const curr=document.getElementById('pos-curr')?.value||STATE.activeBranch?.currency_code||'KWD';
  const rate=STATE.currencies[curr]||0.308;
  const vat=parseFloat(STATE.activeBranch?.vat_rate||0);
  const disc=parseFloat(document.getElementById('ct-disc')?.value||0);
  let sub=0,making=0;
  STATE.cart.forEach(c=>{
    const gpg=(STATE.goldUSD*rate)/31.1035*(KARAT_PURITY[c.karat]||21/24);
    const gv=gpg*c.weight_grams*c.qty;const mk=gv*(c.making_pct/100);sub+=gv+mk;making+=mk;
  });
  const da=sub*(disc/100);const va=(sub-da)*(vat/100);const total=sub-da+va;
  const d3=['KWD','BHD','OMR'].includes(curr)?3:2;
  const s=document.getElementById('ct-sub');if(s)s.textContent=sub.toFixed(d3);
  const m=document.getElementById('ct-making');if(m)m.textContent=making.toFixed(d3);
  const dv=document.getElementById('ct-disc-val');if(dv)dv.textContent=da.toFixed(d3);
  const v=document.getElementById('ct-vat');if(v)v.textContent=va.toFixed(d3);
  const vl=document.getElementById('ct-vat-lbl');if(vl)vl.textContent=`VAT (${vat}%)`;
  const t=document.getElementById('ct-total');if(t)t.textContent=curr+' '+total.toFixed(d3);
}
async function completeSale(){
  if(!STATE.cart.length)return toast('Add items to cart first','error');
  const curr=document.getElementById('pos-curr')?.value||STATE.activeBranch?.currency_code||'KWD';
  const rate=STATE.currencies[curr]||0.308;
  const disc=parseFloat(document.getElementById('ct-disc')?.value||0);
  const items=STATE.cart.map(c=>({item_id:c.id,name:c.name,karat:c.karat,weight_grams:c.weight_grams,making_pct:c.making_pct,qty:c.qty,branch_id:STATE.activeBranch?.id}));
  try{
    const r=await API.createInvoice({branch_id:STATE.activeBranch?.id||1,customer_id:document.getElementById('pos-cust')?.value||null,currency_code:curr,exchange_rate:rate,gold_rate_usd:STATE.goldUSD,discount_pct:disc,payment_method:document.getElementById('pos-pay')?.value||'cash',payment_status:'paid',items});
    showSuccess('Sale Complete!',`Invoice <strong>${r.invoice_number}</strong><br>Total: <strong>${fmtCurr(r.total,curr)}</strong>`,'Print Invoice',()=>{loadInvoiceModal(r.id);});
    STATE.cart.forEach(c=>{const it=STATE.allItems.find(i=>i.id===c.id);if(it&&it.stock)it.stock.qty=Math.max(0,it.stock.qty-c.qty);});
    clearCart();
  }catch(e){toast(e.message,'error');}
}
async function holdCart(){
  if(!STATE.cart.length)return toast('Cart is empty','error');
  const label='Hold '+(STATE.holds.length+1);
  STATE.holds.push({label,cart:[...STATE.cart],ts:Date.now()});
  clearCart();toast('Sale held as "'+label+'"');renderHolds();
}
function renderHolds(){
  const p=document.getElementById('hold-panel');if(!p)return;
  if(!STATE.holds.length){p.style.display='none';return;}
  p.style.display='block';
  p.innerHTML='<div style="font-size:10px;color:var(--tx3);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Held Sales</div>'+
    STATE.holds.map((h,i)=>`<div class="hold-item"><span style="color:var(--tx)">${h.label}</span><span style="color:var(--tx3)">${h.cart.length} items</span><button class="btn btn-gold btn-sm" onclick="resumeHold(${i})">Resume</button><button class="btn btn-out btn-sm" onclick="dropHold(${i})">✕</button></div>`).join('');
}
function resumeHold(i){
  STATE.cart=[...STATE.holds[i].cart];STATE.holds.splice(i,1);
  updateCartUI();renderPosGrid(STATE.allItems);renderHolds();toast('Hold resumed');
}
function dropHold(i){STATE.holds.splice(i,1);renderHolds();}
async function loadCustomersSelect(){
  try{const d=await API.customers({limit:500});const opts='<option value="">Walk-in</option>'+d.data.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');['pos-cust','om-cust'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=opts;});}catch(e){}
}

// ── INVOICES ──────────────────────────────────────────────────
async function loadInvoices(){
  try{
    const q={};if(STATE.invFilter)q.status=STATE.invFilter;
    const d=await API.invoices(q);
    document.getElementById('inv-table').innerHTML=d.data.map(i=>
      `<tr><td style="color:var(--gold);font-size:11px;font-weight:600">${i.invoice_number}</td><td style="color:var(--tx3);font-size:11px">${i.created_at?.split('T')[0]||''}</td><td>${i.customer_name||'Walk-in'}</td><td>${i.branch_name||''}</td><td style="color:var(--gold);font-weight:600">${fmtCurr(i.total,i.currency_code)}</td><td><span class="badge blue">${i.currency_code}</span></td><td><span class="badge gold">${i.payment_method||''}</span></td><td><span class="badge ${i.payment_status==='paid'?'green':i.payment_status==='pending'?'gold':i.payment_status==='refunded'?'blue':'red'}">${i.payment_status}</span></td><td><div style="display:flex;gap:4px"><button class="btn btn-out btn-sm" onclick="loadInvoiceModal(${i.id})" title="View"><i class="ti ti-eye"></i></button><button class="btn btn-out btn-sm" onclick="openReturnFromInvoice(${i.id},'${i.invoice_number}')" title="Return"><i class="ti ti-rotate-clockwise"></i></button></div></td></tr>`
    ).join('')||'<tr><td colspan="9" class="empty"><i class="ti ti-file-invoice"></i>No invoices found</td></tr>';
  }catch(e){toast(e.message,'error');}
}
function setInvFilter(f,el){STATE.invFilter=f;document.querySelectorAll('#pg-invoices .chip').forEach(c=>c.classList.remove('active'));if(el)el.classList.add('active');loadInvoices();}
async function loadInvoiceModal(id){
  try{
    const d=await API.invoice(id);const inv=d.data;const items=inv.items||[];
    const rows=items.map(it=>`<tr><td>${it.name}</td><td><span class="badge gold">${it.karat}</span></td><td>${it.weight_grams}g</td><td>${it.qty}</td><td>${fmtCurr(it.unit_price,inv.currency_code)}</td><td style="color:var(--gold)">${fmtCurr(it.line_total,inv.currency_code)}</td></tr>`).join('');
    const curr=inv.currency_code;
    document.getElementById('inv-modal-body').innerHTML=`<div class="inv-box" id="print-area">
      <div class="inv-hdr"><div><div class="inv-ttl">⚜ ZAHAB</div><div style="font-size:10px;color:var(--tx3);letter-spacing:2px">GOLD & JEWELRY</div><div style="font-size:11px;color:var(--tx3)">${inv.branch_name||''}</div></div>
      <div style="text-align:right"><div class="inv-ttl" style="font-size:16px">INVOICE</div><div style="font-size:11px;color:var(--tx3);line-height:1.8">No: <span style="color:var(--tx2)">${inv.invoice_number}</span><br>Date: <span style="color:var(--tx2)">${inv.created_at?.split('T')[0]||''}</span><br>Customer: <span style="color:var(--tx2)">${inv.customer_name||'Walk-in'}</span><br>Cashier: <span style="color:var(--tx2)">${inv.cashier_name||''}</span></div></div></div>
      <table><thead><tr><th>Item</th><th>Karat</th><th>Weight</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="inv-total-box"><div class="inv-total-row"><span>Subtotal</span><span>${fmtCurr(inv.subtotal,curr)}</span></div><div class="inv-total-row"><span>Discount (${inv.discount_pct||0}%)</span><span>-${fmtCurr(inv.discount_amount||0,curr)}</span></div><div class="inv-total-row"><span>VAT (${inv.vat_pct||0}%)</span><span>${fmtCurr(inv.vat_amount,curr)}</span></div><div class="inv-total-row grand"><span>TOTAL</span><span>${fmtCurr(inv.total,curr)}</span></div></div>
      <div style="margin-top:12px;font-size:10px;color:var(--tx3);text-align:center">Gold rate: USD ${inv.gold_rate_usd}/oz — Payment: ${inv.payment_method||'cash'}<br>Thank you for your purchase • شكراً لتسوقكم معنا</div></div>`;
    document.getElementById('inv-modal').classList.add('open');
  }catch(e){toast(e.message,'error');}
}
function openReturnFromInvoice(id,num){
  document.getElementById('ret-inv-id').value=id;
  document.getElementById('ret-inv-num').textContent=num;
  document.getElementById('return-modal').classList.add('open');
}

// ── SPECIAL ORDERS ────────────────────────────────────────────
async function loadOrders(){
  try{
    const d=await API.orders();const ords=d.data;
    const cnt=s=>ords.filter(o=>o.status===s).length;
    document.getElementById('ord-total').textContent=ords.length;
    document.getElementById('ord-pending').textContent=cnt('pending');
    document.getElementById('ord-progress').textContent=ords.filter(o=>['design','fabrication','quality'].includes(o.status)).length;
    document.getElementById('ord-ready').textContent=cnt('ready');
    document.getElementById('ord-table').innerHTML=ords.map(o=>
      `<tr><td style="color:var(--gold);font-weight:600;font-size:11px">${o.order_number}</td><td>${o.customer_name||'Walk-in'}</td><td style="font-size:11px;max-width:130px">${(o.description||'').slice(0,40)}${(o.description?.length||0)>40?'...':''}</td><td>${o.branch_name||''}</td><td><span class="badge gold">${o.karat}</span></td><td>${o.approx_weight||'—'}g</td><td style="color:var(--gold)">${fmtCurr(o.estimated_total||0,o.currency_code)}</td><td style="font-size:11px;color:var(--tx3)">${o.due_date||'—'}</td><td><span class="badge ${o.status==='ready'?'green':o.status==='pending'?'blue':o.status==='delivered'?'green':'gold'}">${o.status}</span></td><td><div style="display:flex;gap:4px"><button class="btn btn-out btn-sm" onclick="viewOrder(${o.id})"><i class="ti ti-eye"></i></button>${o.customer_phone?`<button class="btn btn-wa btn-sm" onclick="openWhatsApp('${o.customer_phone}','Your order ${o.order_number} status: ${o.status}. Zahab Gold')" title="WhatsApp"><i class="ti ti-brand-whatsapp"></i></button>`:''}</div></td></tr>`
    ).join('')||'<tr><td colspan="10" class="empty"><i class="ti ti-package"></i>No orders found</td></tr>';
  }catch(e){toast(e.message,'error');}
}
function openOrderModal(){loadCustomersSelect();document.getElementById('order-modal').classList.add('open');}
async function saveOrder(){
  const form=new FormData();
  form.append('branch_id',document.getElementById('om-branch')?.value||(STATE.activeBranch?.id||1));
  form.append('customer_id',document.getElementById('om-cust')?.value||'');
  form.append('description',document.getElementById('om-desc')?.value||'');
  form.append('description_ar',document.getElementById('om-desc-ar')?.value||'');
  form.append('karat',document.getElementById('om-karat')?.value||'21K');
  form.append('approx_weight',document.getElementById('om-weight')?.value||'');
  form.append('advance_amount',document.getElementById('om-advance')?.value||0);
  form.append('estimated_total',document.getElementById('om-total')?.value||'');
  form.append('currency_code',document.getElementById('om-curr')?.value||'KWD');
  form.append('due_date',document.getElementById('om-due')?.value||'');
  const imgs=document.getElementById('om-imgs')?.files;if(imgs)Array.from(imgs).forEach(f=>form.append('images',f));
  try{const r=await API.form('/orders',form);closeModal('order-modal');showSuccess('Order Placed!',`Order <strong>${r.order_number}</strong> created.`);loadOrders();}catch(e){toast(e.message,'error');}
}
async function viewOrder(id){
  try{
    const d=await API.order(id);const o=d.data;const tl=o.timeline||[];
    const steps=['pending','design','fabrication','quality','ready','delivered'];const curIdx=steps.indexOf(o.status);
    document.getElementById('inv-modal-body').innerHTML=`<div>
      <div style="display:flex;justify-content:space-between;margin-bottom:12px"><div><div style="font-family:Georgia,serif;font-size:15px;color:var(--gold)">${o.order_number}</div><div style="font-size:12px;color:var(--tx3)">${o.customer_name||'Walk-in'} — ${o.branch_name||''}</div></div><span class="badge ${o.status==='ready'?'green':o.status==='pending'?'blue':'gold'}">${o.status}</span></div>
      <div class="card" style="margin-bottom:12px"><div style="font-size:12px;color:var(--tx2)">${o.description}</div>${o.description_ar?`<div style="font-size:12px;color:var(--tx3);direction:rtl;text-align:right;font-family:'Cairo',sans-serif">${o.description_ar}</div>`:''}<div style="display:flex;gap:20px;margin-top:10px"><div><div style="font-size:10px;color:var(--tx3)">Karat</div><div style="color:var(--gold);font-weight:700">${o.karat}</div></div><div><div style="font-size:10px;color:var(--tx3)">Weight</div><div>${o.approx_weight||'—'}g</div></div><div><div style="font-size:10px;color:var(--tx3)">Estimated</div><div style="color:var(--gold);font-weight:700">${fmtCurr(o.estimated_total||0,o.currency_code)}</div></div><div><div style="font-size:10px;color:var(--tx3)">Advance</div><div>${fmtCurr(o.advance_amount||0,o.advance_currency||'KWD')}</div></div><div><div style="font-size:10px;color:var(--tx3)">Due</div><div>${o.due_date||'—'}</div></div></div></div>
      <div style="font-size:13px;font-weight:600;color:var(--tx);margin-bottom:12px">Order Timeline</div>
      <div>${steps.map((s,i)=>{const done=i<curIdx;const active=i===curIdx;const tlEnt=tl.find(t=>t.status===s);return `<div class="tl-item"><div class="tl-dot ${done?'done':active?'active':''}">${done?'✓':'○'}</div><div><div style="font-size:12px;font-weight:600;color:${done?'var(--green)':active?'var(--gold)':'var(--tx3)'}">${s.charAt(0).toUpperCase()+s.slice(1)}</div>${tlEnt?`<div style="font-size:10px;color:var(--tx3)">${tlEnt.created_at?.split('T')[0]||''} ${tlEnt.notes?'— '+tlEnt.notes:''} ${tlEnt.updated_by?'by '+tlEnt.updated_by:''}</div>`:''}</div></div>`;}).join('')}</div>
      ${o.status!=='delivered'?`<div style="margin-top:14px;display:flex;gap:8px"><select class="fi" id="os-status" style="max-width:200px">${steps.filter((_,i)=>i>curIdx).map(s=>`<option value="${s}">${s}</option>`).join('')}</select><input class="fi" id="os-notes" placeholder="Notes (optional)" style="flex:1"/><button class="btn btn-gold btn-sm" onclick="updateOrderStatus(${o.id})"><i class="ti ti-check"></i>Update</button></div>`:''}
      ${o.customer_phone?`<button class="btn btn-wa btn-sm" style="margin-top:10px" onclick="openWhatsApp('${o.customer_phone}','Your order ${o.order_number} status: ${o.status}. Zahab Gold')"><i class="ti ti-brand-whatsapp"></i> Notify Customer</button>`:''}
    </div>`;
    document.getElementById('inv-modal').classList.add('open');
  }catch(e){toast(e.message,'error');}
}
async function updateOrderStatus(id){
  const s=document.getElementById('os-status')?.value;const n=document.getElementById('os-notes')?.value;
  if(!s)return;
  try{await API.updateOrderStatus(id,s,n);toast('Status updated');closeModal('inv-modal');loadOrders();}catch(e){toast(e.message,'error');}
}

// ── CATALOG ───────────────────────────────────────────────────
async function loadCatalog(){
  try{
    const cats=await API.categories();
    const fb=document.getElementById('cat-filter');
    if(fb&&cats.data)fb.innerHTML='<button class="chip active" onclick="setCatFilter(\'\',this)">All</button>'+cats.data.map(c=>`<button class="chip" onclick="setCatFilter('${c.id}',this)">${c.icon||''} ${STATE.lang==='ar'&&c.name_ar?c.name_ar:c.name}</button>`).join('');
    const q={};if(STATE.catFilter)q.category_id=STATE.catFilter;
    const s=document.getElementById('cat-q')?.value;if(s)q.search=s;
    q.branch_id=STATE.activeBranch?.id;
    const d=await API.items(q);
    const curr=STATE.activeBranch?.currency_code||'KWD';const rate=STATE.currencies[curr]||0.308;
    document.getElementById('cat-grid').innerHTML=d.data.map(it=>{
      const p=calcPrice(STATE.goldUSD,it.karat,it.weight_grams,it.making_pct,rate);
      const imgSrc=it.images?'/uploads/items/'+it.images.split('|')[0]:null;
      const qty=it.stock?.qty??0;const sc=qty===0?'out':qty<=(it.stock?.min_qty??1)?'low':'ok';
      return `<div class="item-card" onclick="openItemDetail(${it.id})">
        <div class="item-img">${imgSrc?`<img src="${imgSrc}" alt="${it.name}"/>`:(it.icon||'💍')}</div>
        <div class="item-info">
          <div class="item-name">${STATE.lang==='ar'&&it.name_ar?it.name_ar:it.name}</div>
          <div class="item-sku">${it.sku}</div>
          <div style="display:flex;gap:4px;margin:4px 0"><span class="badge gold">${it.karat}</span><span class="badge blue">${STATE.lang==='ar'&&it.category_name_ar?it.category_name_ar:it.category_name||''}</span></div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div class="item-price">${curr} ${p.toFixed(3)}</div>
            <span class="stock-badge stock-${sc}">${qty}</span>
          </div>
          <div style="font-size:10px;color:var(--tx3)">${it.weight_grams}g</div>
          <div style="display:flex;gap:4px;margin-top:6px">
            <button class="btn btn-out btn-sm" onclick="event.stopPropagation();openItemEdit(${it.id})" title="Edit"><i class="ti ti-edit"></i></button>
            <button class="btn btn-red btn-sm" onclick="event.stopPropagation();deleteItemConfirm(${it.id},'${it.name}')" title="Delete"><i class="ti ti-trash"></i></button>
          </div>
        </div></div>`;
    }).join('')||'<div class="empty"><i class="ti ti-diamond"></i>No items found</div>';
  }catch(e){toast(e.message,'error');}
}
function setCatFilter(f,el){STATE.catFilter=f;document.querySelectorAll('#cat-filter .chip').forEach(c=>c.classList.remove('active'));if(el)el.classList.add('active');loadCatalog();}
async function openItemDetail(id){
  try{
    const d=await API.item(id);const it=d.data;
    const curr=STATE.activeBranch?.currency_code||'KWD';const rate=STATE.currencies[curr]||0.308;
    const p=calcPrice(STATE.goldUSD,it.karat,it.weight_grams,it.making_pct,rate);
    const imgH=it.images?.length?it.images.map(img=>`<img src="/uploads/items/${img.filename}" style="width:80px;height:80px;border-radius:8px;object-fit:cover;border:1px solid var(--brd)"/>`).join(''):'<div style="font-size:48px;text-align:center">💍</div>';
    document.getElementById('inv-modal-body').innerHTML=`<div style="text-align:center;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:16px">${imgH}</div>
      <div class="fr2" style="margin-bottom:10px"><div><span style="font-size:10px;color:var(--tx3)">SKU</span><div>${it.sku}</div></div><div><span style="font-size:10px;color:var(--tx3)">Karat</span><div><span class="badge gold">${it.karat}</span></div></div></div>
      <div class="fr2" style="margin-bottom:10px"><div><span style="font-size:10px;color:var(--tx3)">Weight</span><div>${it.weight_grams}g</div></div><div><span style="font-size:10px;color:var(--tx3)">Making</span><div>${it.making_pct}%</div></div></div>
      ${it.stock?.length?`<div style="margin-bottom:10px"><span style="font-size:10px;color:var(--tx3)">Stock per Branch</span><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">${it.stock.map(s=>`<span class="badge ${s.qty===0?'red':s.qty<=s.min_qty?'gold':'green'}">${s.branch_name}: ${s.qty}</span>`).join('')}</div></div>`:''}
      <div style="margin-bottom:12px"><span style="font-size:10px;color:var(--tx3)">Price</span><div style="font-size:22px;font-weight:700;color:var(--gold);font-family:Georgia,serif">${fmtCurr(p,curr)}</div></div>
      ${it.description?`<div><span style="font-size:10px;color:var(--tx3)">Description</span><div style="font-size:12px;color:var(--tx2)">${it.description}</div></div>`:''}
      ${it.description_ar?`<div style="margin-top:8px"><span style="font-size:10px;color:var(--tx3)">الوصف</span><div style="font-size:12px;color:var(--tx2);direction:rtl;text-align:right;font-family:'Cairo',sans-serif">${it.description_ar}</div></div>`:''}
      <div style="margin-top:14px;display:flex;gap:8px"><button class="btn btn-gold" style="flex:1;justify-content:center" onclick="if(!STATE.allItems.find(i=>i.id===${it.id}))STATE.allItems.push(${JSON.stringify(it).replace(/</g,'&lt;')});addToCart(${it.id});closeModal('inv-modal');nav('pos')"><i class="ti ti-shopping-cart"></i>Add to Cart</button><button class="btn btn-out" onclick="closeModal('inv-modal');openItemEdit(${it.id})"><i class="ti ti-edit"></i>Edit</button></div>`;
    if(!STATE.allItems.find(i=>i.id===it.id))STATE.allItems.push(it);
    document.getElementById('inv-modal').classList.add('open');
  }catch(e){toast(e.message,'error');}
}
async function deleteItemConfirm(id,name){
  const ok=await confirm2(`Deactivate item "${name}"? It will be hidden from catalog and POS.`,'Deactivate Item');
  if(!ok)return;
  try{await API.deleteItem(id);toast('Item deactivated');loadCatalog();}catch(e){toast(e.message,'error');}
}

// ── EDIT ITEM ─────────────────────────────────────────────────
async function openItemEdit(id){
  try{
    const d=await API.item(id);const it=d.data;
    const cats=await API.categories();
    const sel=document.getElementById('ei-cat');
    if(sel)sel.innerHTML=cats.data.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    // Populate form
    document.getElementById('ei-id').value=id;
    document.getElementById('ei-name').value=it.name||'';
    document.getElementById('ei-name-ar').value=it.name_ar||'';
    document.getElementById('ei-sku').value=it.sku||'';
    if(sel)sel.value=it.category_id;
    document.getElementById('ei-karat').value=it.karat||'21K';
    document.getElementById('ei-weight').value=it.weight_grams||'';
    document.getElementById('ei-making').value=it.making_pct||8;
    document.getElementById('ei-desc').value=it.description||'';
    document.getElementById('ei-desc-ar').value=it.description_ar||'';
    document.getElementById('ei-active').value=it.is_active??1;
    // Stock per branch
    const sb=document.getElementById('ei-stock-grid');
    if(sb&&it.stock){sb.innerHTML=it.stock.map(s=>`<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--brd)"><span style="flex:1;font-size:12px">${s.branch_name}</span><input type="number" value="${s.qty}" min="0" style="width:60px;background:var(--bg3);border:1px solid var(--brd);color:var(--tx);padding:3px 6px;border-radius:4px;font-size:12px" data-bid="${s.branch_id}" class="stock-inp"/><input type="number" value="${s.min_qty}" min="1" style="width:50px;background:var(--bg3);border:1px solid var(--brd);color:var(--tx);padding:3px 6px;border-radius:4px;font-size:12px" data-bid="${s.branch_id}" class="minstock-inp" placeholder="min"/></div>`).join('');}
    // Existing images
    const ip=document.getElementById('ei-img-prev');if(ip)ip.innerHTML=it.images?.map(img=>`<div style="position:relative;width:72px;height:72px"><img src="/uploads/items/${img.filename}" style="width:72px;height:72px;border-radius:8px;object-fit:cover;border:1px solid var(--brd)"/><button onclick="removeEditImage(${img.id},this.parentNode)" style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:var(--red);color:#fff;border:none;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center">×</button></div>`).join('')||'';
    document.getElementById('item-edit-modal').classList.add('open');
  }catch(e){toast(e.message,'error');}
}
function removeEditImage(imgId,el){
  el.remove();
  const hidden=document.createElement('input');hidden.type='hidden';hidden.name='remove_img';hidden.value=imgId;hidden.className='rm-img-input';
  document.getElementById('item-edit-modal').appendChild(hidden);
}
async function saveItemEdit(){
  const id=document.getElementById('ei-id').value;if(!id)return;
  const form=new FormData();
  form.append('name',document.getElementById('ei-name')?.value||'');
  form.append('name_ar',document.getElementById('ei-name-ar')?.value||'');
  form.append('category_id',document.getElementById('ei-cat')?.value||1);
  form.append('karat',document.getElementById('ei-karat')?.value||'21K');
  form.append('weight_grams',document.getElementById('ei-weight')?.value||1);
  form.append('making_pct',document.getElementById('ei-making')?.value||8);
  form.append('description',document.getElementById('ei-desc')?.value||'');
  form.append('description_ar',document.getElementById('ei-desc-ar')?.value||'');
  form.append('is_active',document.getElementById('ei-active')?.value??1);
  // Stock updates
  const stInputs=document.querySelectorAll('.stock-inp');const mnInputs=document.querySelectorAll('.minstock-inp');
  const branches=[];
  stInputs.forEach(inp=>{const bid=inp.getAttribute('data-bid');const mn=document.querySelector(`.minstock-inp[data-bid="${bid}"]`);branches.push({branch_id:parseInt(bid),qty:parseInt(inp.value||0),min_qty:parseInt(mn?.value||1)});});
  if(branches.length)form.append('branches',JSON.stringify(branches));
  // Remove images
  const rmIds=[...document.querySelectorAll('.rm-img-input')].map(i=>i.value);
  if(rmIds.length)form.append('remove_images',JSON.stringify(rmIds));
  // New images
  const imgs=document.getElementById('ei-imgs')?.files;if(imgs)Array.from(imgs).forEach(f=>form.append('images',f));
  try{await API.updateItem(id,form);closeModal('item-edit-modal');toast('Item updated');loadCatalog();}catch(e){toast(e.message,'error');}
}

// ── ADD ITEM ──────────────────────────────────────────────────
async function initAddItem(){
  try{const d=await API.categories();const sel=document.getElementById('ni-cat');if(sel)sel.innerHTML=d.data.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');}catch(e){}
}
function previewImgs(e){
  const prev=document.getElementById('ni-img-prev');
  Array.from(e.target.files).forEach(f=>{const r=new FileReader();r.onload=ev=>{const d=document.createElement('div');d.style.cssText='width:72px;height:72px;border-radius:8px;overflow:hidden;border:1px solid var(--brd)';d.innerHTML=`<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover"/>`;prev.appendChild(d);};r.readAsDataURL(f);});
}
function previewPrice(){
  const w=parseFloat(document.getElementById('ni-weight')?.value||0);const m=parseFloat(document.getElementById('ni-making')?.value||8);const k=document.getElementById('ni-karat')?.value||'21K';
  const grid=document.getElementById('price-prev-grid');if(!grid)return;
  if(!w){grid.innerHTML='<div style="color:var(--tx3);font-size:12px;grid-column:1/-1">Enter weight to preview</div>';return;}
  grid.innerHTML=['24K','22K','21K','18K','14K'].map(kk=>{const rate=STATE.currencies['KWD']||0.308;const p=calcPrice(STATE.goldUSD,kk,w,m,rate);return `<div style="background:var(--bg3);border:1px solid ${kk===k?'var(--gold)':'var(--brd)'};border-radius:8px;padding:10px;text-align:center"><div style="font-size:15px;font-weight:700;color:var(--gold)">${kk}</div><div style="font-size:11px;color:var(--tx3)">KWD ${p.toFixed(3)}</div></div>`;}).join('');
}
async function saveItem(){
  const name=document.getElementById('ni-name')?.value;if(!name)return toast('Item name required','error');
  const sku=document.getElementById('ni-sku')?.value;if(!sku)return toast('SKU required','error');
  const form=new FormData();
  form.append('name',name);form.append('name_ar',document.getElementById('ni-name-ar')?.value||'');
  form.append('sku',sku);form.append('category_id',document.getElementById('ni-cat')?.value||1);
  form.append('karat',document.getElementById('ni-karat')?.value||'21K');
  form.append('weight_grams',document.getElementById('ni-weight')?.value||1);
  form.append('making_pct',document.getElementById('ni-making')?.value||8);
  form.append('description',document.getElementById('ni-desc')?.value||'');
  form.append('description_ar',document.getElementById('ni-desc-ar')?.value||'');
  const bid=document.getElementById('ni-branch')?.value;
  if(bid)form.append('branches',JSON.stringify([{branch_id:bid,qty:parseInt(document.getElementById('ni-qty')?.value||1),min_qty:1}]));
  const imgs=document.getElementById('ni-imgs')?.files;if(imgs)Array.from(imgs).forEach(f=>form.append('images',f));
  try{await API.addItem(form);showSuccess('Item Saved!',`"${name}" added to catalog.`);['ni-name','ni-name-ar','ni-sku','ni-weight','ni-making','ni-desc','ni-desc-ar'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});document.getElementById('ni-img-prev').innerHTML='';document.getElementById('ni-qty').value=1;}
  catch(e){toast(e.message,'error');}
}

// ── KARATS ────────────────────────────────────────────────────
async function loadKarats(){
  document.getElementById('karat-rate-notice').textContent=`Gold XAU/USD: $${STATE.goldUSD.toFixed(2)} — ${new Date().toLocaleTimeString()}`;
  const karats=[['24K',1],['22K',22/24],['21K',21/24],['18K',18/24],['14K',14/24],['9K',9/24]];
  document.getElementById('karat-grid').innerHTML=karats.map(([k,p])=>{
    const perGKWD=(STATE.goldUSD*(STATE.currencies['KWD']||0.308))/31.1035*p;
    const perGSAR=(STATE.goldUSD*(STATE.currencies['SAR']||3.75))/31.1035*p;
    const perGAED=(STATE.goldUSD*(STATE.currencies['AED']||3.67))/31.1035*p;
    return `<div class="stat-card ${k==='21K'?'gold-brd':''}"><div class="stat-lbl">${k} — ${(p*100).toFixed(1)}% Pure</div><div class="stat-val gold">KWD ${perGKWD.toFixed(3)}/g</div><div style="font-size:11px;color:var(--tx3)">SAR ${perGSAR.toFixed(2)} • AED ${perGAED.toFixed(2)}</div></div>`;
  }).join('');
  try{const d=await API.makingCharges();document.getElementById('making-table').innerHTML=d.data.map(m=>`<tr><td>${m.category}</td><td><span class="badge gold">${m.karat}</span></td><td><input type="number" value="${m.making_pct}" step="0.5" style="width:70px;background:var(--bg3);border:1px solid var(--brd);color:var(--tx);padding:3px 6px;border-radius:4px;font-size:12px" onchange="updateMaking('${m.category}','${m.karat}',this.value)"/></td><td><span style="font-size:10px;color:var(--tx3)">%</span></td></tr>`).join('');}catch(e){}
}
async function updateMaking(cat,karat,pct){try{await API.updateMaking({category:cat,karat,making_pct:parseFloat(pct)});toast('Making charge updated');}catch(e){toast(e.message,'error');}}

// ── LOW STOCK ─────────────────────────────────────────────────
async function loadLowStock(){
  try{
    const bid=STATE.activeBranch?.id;
    const d=await API.lowStock(bid?{branch_id:bid}:{});
    document.getElementById('low-stock-table').innerHTML=d.data.map(it=>`<tr><td style="color:var(--gold);font-size:11px">${it.sku}</td><td>${it.name}${it.name_ar?`<div style="font-size:10px;color:var(--tx3);direction:rtl">${it.name_ar}</div>`:''}</td><td>${it.branch_name}</td><td><span class="badge gold">${it.karat}</span></td><td style="color:${it.qty===0?'var(--red)':'var(--orange)'};font-weight:700">${it.qty}</td><td>${it.min_qty}</td><td><button class="btn btn-gold btn-sm" onclick="nav('purchases')"><i class="ti ti-plus"></i>Order</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty"><i class="ti ti-check"></i>All items are well-stocked</td></tr>';
    document.getElementById('low-stock-count').textContent=d.data.length;
  }catch(e){toast(e.message,'error');}
}

// ── CATEGORIES ────────────────────────────────────────────────
async function loadCategories(){
  try{
    const d=await API.categories();
    document.getElementById('cat-manage-grid').innerHTML=d.data.map(c=>`<div class="cat-card" onclick="openCategoryModal(${c.id},'${c.name}','${c.name_ar||''}','${c.icon||''}',${c.sort_order||0})"><span class="cat-icon">${c.icon||'💍'}</span><div class="cat-name">${c.name}</div><div class="cat-name-ar">${c.name_ar||''}</div></div>`).join('');
  }catch(e){toast(e.message,'error');}
}
function openCategoryModal(id,name,nameAr,icon,sort){
  document.getElementById('cm-id').value=id||'';
  document.getElementById('cm-name').value=name||'';
  document.getElementById('cm-name-ar').value=nameAr||'';
  document.getElementById('cm-icon').value=icon||'💍';
  document.getElementById('cm-sort').value=sort||0;
  document.getElementById('cm-title').textContent=id?'Edit Category':'New Category';
  document.getElementById('cat-modal').classList.add('open');
}
async function saveCategory(){
  const id=document.getElementById('cm-id').value;
  const data={name:document.getElementById('cm-name').value,name_ar:document.getElementById('cm-name-ar').value,icon:document.getElementById('cm-icon').value,sort_order:parseInt(document.getElementById('cm-sort').value||0)};
  if(!data.name)return toast('Category name required','error');
  try{
    if(id)await API.updateCategory(id,data);else await API.addCategory(data);
    closeModal('cat-modal');toast(id?'Category updated':'Category created');loadCategories();
  }catch(e){toast(e.message,'error');}
}
async function deleteCategoryConfirm(id,name){
  const ok=await confirm2(`Delete category "${name}"?`,'Delete Category');if(!ok)return;
  try{await API.deleteCategory(id);toast('Category deleted');loadCategories();}catch(e){toast(e.message,'error');}
}

// ── BUYBACK ───────────────────────────────────────────────────
async function loadBuyback(){
  try{
    const bid=STATE.activeBranch?.id;
    const d=await API.buybacks(bid?{branch_id:bid}:{});
    document.getElementById('buyback-table').innerHTML=d.data.map(b=>`<tr><td style="color:var(--gold);font-size:11px;font-weight:600">${b.buyback_number}</td><td style="font-size:11px;color:var(--tx3)">${b.created_at?.split('T')[0]||''}</td><td>${b.customer_name||'Walk-in'}</td><td>${b.branch_name||''}</td><td><span class="badge gold">${b.karat}</span></td><td>${parseFloat(b.gross_weight||0).toFixed(3)}g</td><td>${parseFloat(b.net_weight||0).toFixed(3)}g</td><td style="color:var(--gold);font-weight:600">${fmtCurr(b.amount_paid,b.currency_code)}</td><td><span class="badge green">${b.payment_method}</span></td></tr>`).join('')||'<tr><td colspan="9" class="empty"><i class="ti ti-coins"></i>No buyback records</td></tr>';
    // Totals
    const total=d.data.reduce((s,b)=>s+parseFloat(b.amount_paid||0),0);
    document.getElementById('bb-total-paid').textContent=fmtCurr(total,STATE.activeBranch?.currency_code||'KWD');
    document.getElementById('bb-count').textContent=d.data.length;
  }catch(e){toast(e.message,'error');}
}
async function calcBuybackPreview(){
  const karat=document.getElementById('bb-karat')?.value||'21K';
  const gross=parseFloat(document.getElementById('bb-gross')?.value||0);
  const ded=parseFloat(document.getElementById('bb-deduct')?.value||0);
  const curr=document.getElementById('bb-curr')?.value||STATE.activeBranch?.currency_code||'KWD';
  if(!gross)return;
  try{
    const rate=STATE.currencies[curr]||0.308;
    const d=await API.calcBuyback({karat,gross_weight:gross,deduction_pct:ded,gold_rate_usd:STATE.goldUSD,exchange_rate:rate,currency_code:curr});
    document.getElementById('bb-net-weight').textContent=d.data.net_weight+'g';
    document.getElementById('bb-amount-preview').textContent=curr+' '+d.data.amount_payable;
    document.getElementById('bb-per-gram').textContent=curr+' '+d.data.per_gram+'/g';
    document.getElementById('bb-amount').value=d.data.amount_payable;
    document.getElementById('bb-net').value=d.data.net_weight;
  }catch(e){}
}
async function saveBuyback(){
  const curr=document.getElementById('bb-curr')?.value||'KWD';
  const rate=STATE.currencies[curr]||0.308;
  const data={
    branch_id:document.getElementById('bb-branch')?.value||(STATE.activeBranch?.id||1),
    customer_id:document.getElementById('bb-cust')?.value||null,
    item_description:document.getElementById('bb-desc')?.value||null,
    karat:document.getElementById('bb-karat')?.value||'21K',
    gross_weight:document.getElementById('bb-gross')?.value||0,
    net_weight:document.getElementById('bb-net')?.value||0,
    deduction_pct:document.getElementById('bb-deduct')?.value||0,
    purity_tested:document.getElementById('bb-tested')?.checked?1:0,
    gold_rate_usd:STATE.goldUSD,exchange_rate:rate,
    amount_paid:document.getElementById('bb-amount')?.value||0,
    currency_code:curr,
    payment_method:document.getElementById('bb-payment')?.value||'cash',
    notes:document.getElementById('bb-notes')?.value||null
  };
  if(!data.gross_weight||!data.amount_paid)return toast('Fill in weight and amount','error');
  try{const r=await API.createBuyback(data);showSuccess('Buyback Recorded!',`Buyback <strong>${r.buyback_number}</strong> saved.`);loadBuyback();clearBuybackForm();}catch(e){toast(e.message,'error');}
}
function clearBuybackForm(){['bb-desc','bb-gross','bb-net','bb-deduct','bb-amount','bb-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});document.getElementById('bb-amount-preview').textContent='—';document.getElementById('bb-net-weight').textContent='—';}

// ── RETURNS ───────────────────────────────────────────────────
async function loadReturns(){
  try{
    const d=await API.returns();
    document.getElementById('returns-table').innerHTML=d.data.map(r=>`<tr><td style="color:var(--gold);font-size:11px;font-weight:600">${r.return_number}</td><td style="font-size:11px;color:var(--tx3)">${r.created_at?.split('T')[0]||''}</td><td>${r.invoice_number||''}</td><td>${r.customer_name||'Walk-in'}</td><td>${r.branch_name||''}</td><td>${r.return_type}</td><td style="color:var(--gold)">${fmtCurr(r.refund_amount,r.currency_code)}</td><td>${r.refund_method}</td><td><span class="badge ${r.status==='completed'?'green':r.status==='rejected'?'red':r.status==='approved'?'blue':'gold'}">${r.status}</span></td><td>${r.status==='pending'?`<div style="display:flex;gap:4px"><button class="btn btn-out btn-sm" onclick="approveReturn(${r.id},'approved')" style="color:var(--green);border-color:var(--green)"><i class="ti ti-check"></i></button><button class="btn btn-red btn-sm" onclick="approveReturn(${r.id},'rejected')"><i class="ti ti-x"></i></button></div>`:r.status==='approved'?`<button class="btn btn-gold btn-sm" onclick="approveReturn(${r.id},'completed')"><i class="ti ti-check"></i>Complete</button>`:''}</td></tr>`).join('')||'<tr><td colspan="10" class="empty"><i class="ti ti-rotate-clockwise"></i>No returns found</td></tr>';
  }catch(e){toast(e.message,'error');}
}
async function saveReturn(){
  const data={
    invoice_id:document.getElementById('ret-inv-id')?.value,
    reason:document.getElementById('ret-reason')?.value||null,
    return_type:document.getElementById('ret-type')?.value||'full',
    refund_amount:document.getElementById('ret-amount')?.value||0,
    currency_code:document.getElementById('ret-curr')?.value||STATE.activeBranch?.currency_code||'KWD',
    refund_method:document.getElementById('ret-method')?.value||'cash',
    notes:document.getElementById('ret-notes')?.value||null
  };
  if(!data.invoice_id)return toast('Invoice ID required','error');
  try{const r=await API.createReturn(data);closeModal('return-modal');showSuccess('Return Created!',`Return <strong>${r.return_number}</strong> pending approval.`);if(document.getElementById('pg-returns')?.classList.contains('active'))loadReturns();}catch(e){toast(e.message,'error');}
}
async function approveReturn(id,status){
  try{await API.updateReturnStatus(id,status,'');toast('Return '+status);loadReturns();}catch(e){toast(e.message,'error');}
}

// ── PURCHASE ORDERS ───────────────────────────────────────────
async function loadPurchases(){
  try{
    const bid=STATE.activeBranch?.id;
    const d=await API.purchases(bid?{branch_id:bid}:{});
    document.getElementById('po-table').innerHTML=d.data.map(po=>`<tr><td style="color:var(--gold);font-size:11px;font-weight:600">${po.po_number}</td><td style="font-size:11px;color:var(--tx3)">${po.created_at?.split('T')[0]||''}</td><td>${po.branch_name||''}</td><td>${po.supplier_name||'—'}</td><td style="color:var(--gold)">${fmtCurr(po.total_cost,po.currency_code)}</td><td>${po.order_date||'—'}</td><td><span class="badge ${po.status==='received'?'green':po.status==='ordered'?'blue':po.status==='cancelled'?'red':'gold'}">${po.status}</span></td><td><div style="display:flex;gap:4px">${po.status==='draft'?`<button class="btn btn-gold btn-sm" onclick="advancePO(${po.id},'ordered')"><i class="ti ti-send"></i>Order</button>`:''}${po.status==='ordered'?`<button class="btn btn-gold btn-sm" onclick="advancePO(${po.id},'received')"><i class="ti ti-package"></i>Receive</button>`:''}${po.status==='draft'?`<button class="btn btn-red btn-sm" onclick="advancePO(${po.id},'cancelled')"><i class="ti ti-x"></i></button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="8" class="empty"><i class="ti ti-package-import"></i>No purchase orders</td></tr>';
  }catch(e){toast(e.message,'error');}
}
function openPurchaseModal(){loadSuppliersSelect();document.getElementById('po-items-list').innerHTML='';addPOItem();document.getElementById('purchase-modal').classList.add('open');}
async function loadSuppliersSelect(){
  try{const d=await API.suppliers();const sel=document.getElementById('po-supplier');if(sel)sel.innerHTML='<option value="">Select supplier</option>'+d.data.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');}catch(e){}
}
function addPOItem(){
  const list=document.getElementById('po-items-list');if(!list)return;
  const div=document.createElement('div');div.style.cssText='display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:8px;margin-bottom:8px;align-items:center';
  div.innerHTML=`<input class="fi" placeholder="Item name / SKU" style="font-size:12px"/><select class="fi" style="font-size:12px"><option>24K</option><option>22K</option><option selected>21K</option><option>18K</option><option>14K</option></select><input class="fi" type="number" placeholder="Qty" value="1" min="1" style="font-size:12px"/><input class="fi" type="number" placeholder="Unit cost" step="0.001" style="font-size:12px"/><button onclick="this.parentNode.remove()" class="btn btn-red btn-sm"><i class="ti ti-x"></i></button>`;
  list.appendChild(div);
}
async function savePurchase(){
  const bid=document.getElementById('po-branch')?.value||(STATE.activeBranch?.id||1);
  const rows=document.getElementById('po-items-list').children;
  const items=[...rows].map(row=>{const inp=row.querySelectorAll('input,select');return{name:inp[0]?.value||'',karat:inp[1]?.value||'21K',qty:parseInt(inp[2]?.value||1),unit_cost:parseFloat(inp[3]?.value||0)};}).filter(i=>i.name);
  if(!items.length)return toast('Add at least one item','error');
  const data={branch_id:bid,supplier_id:document.getElementById('po-supplier')?.value||null,currency_code:document.getElementById('po-curr')?.value||'KWD',order_date:document.getElementById('po-date')?.value||null,notes:document.getElementById('po-notes')?.value||null,items};
  try{const r=await API.createPurchase(data);closeModal('purchase-modal');showSuccess('PO Created!',`Purchase order <strong>${r.po_number}</strong> created.`);loadPurchases();}catch(e){toast(e.message,'error');}
}
async function advancePO(id,status){
  try{await API.updatePOStatus(id,status);toast('PO marked as '+status+(status==='received'?' — stock updated!':''));loadPurchases();}catch(e){toast(e.message,'error');}
}

// ── INSTALLMENTS ──────────────────────────────────────────────
async function loadInstallments(){
  try{
    const bid=STATE.activeBranch?.id;
    const d=await API.installments(bid?{branch_id:bid}:{});
    document.getElementById('inst-table').innerHTML=d.data.map(p=>{
      const pct=p.num_installments>0?(p.paid_count/p.num_installments*100):0;
      return `<tr><td style="color:var(--gold);font-size:11px;font-weight:600">${p.plan_number}</td><td>${p.invoice_number||''}</td><td>${p.customer_name||'—'}</td><td style="color:var(--gold)">${fmtCurr(p.total_amount,p.currency_code)}</td><td>${fmtCurr(p.installment_amount,p.currency_code)}</td><td>${p.num_installments}x</td><td><div class="inst-progress"><div class="inst-progress-fill" style="width:${pct.toFixed(0)}%"></div></div><div style="font-size:10px;color:var(--tx3)">${p.paid_count||0}/${p.num_installments} paid</div></td><td>${p.overdue_count>0?`<span class="badge red">${p.overdue_count} overdue</span>`:'<span class="badge green">OK</span>'}</td><td><span class="badge ${p.status==='completed'?'green':p.status==='defaulted'?'red':'gold'}">${p.status}</span></td><td><button class="btn btn-out btn-sm" onclick="viewInstallment(${p.id})"><i class="ti ti-eye"></i></button></td></tr>`;
    }).join('')||'<tr><td colspan="10" class="empty"><i class="ti ti-credit-card"></i>No installment plans</td></tr>';
  }catch(e){toast(e.message,'error');}
}
async function viewInstallment(id){
  try{
    const d=await API.installment(id);const p=d.data;
    document.getElementById('inv-modal-body').innerHTML=`<div>
      <div style="display:flex;justify-content:space-between;margin-bottom:12px"><div><div style="font-family:Georgia,serif;font-size:15px;color:var(--gold)">${p.plan_number}</div><div style="font-size:12px;color:var(--tx3)">${p.customer_name||'—'} — Invoice ${p.invoice_number}</div></div><span class="badge ${p.status==='completed'?'green':'gold'}">${p.status}</span></div>
      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">
        <div class="stat-card"><div class="stat-lbl">Total</div><div class="stat-val gold">${fmtCurr(p.total_amount,p.currency_code)}</div></div>
        <div class="stat-card"><div class="stat-lbl">Per Installment</div><div class="stat-val">${fmtCurr(p.installment_amount,p.currency_code)}</div></div>
        <div class="stat-card"><div class="stat-lbl">Start Date</div><div class="stat-val" style="font-size:14px">${p.start_date||'—'}</div></div>
      </div>
      <table><thead><tr><th>#</th><th>Due Date</th><th>Amount</th><th>Status</th><th>Paid Date</th><th>Action</th></tr></thead><tbody>
      ${(p.payments||[]).map(pay=>`<tr><td>${pay.installment_no}</td><td>${pay.due_date}</td><td style="color:var(--gold)">${fmtCurr(pay.amount,p.currency_code)}</td><td><span class="badge ${pay.status==='paid'?'green':pay.status==='overdue'?'red':'gold'}">${pay.status}</span></td><td style="font-size:11px;color:var(--tx3)">${pay.paid_date||'—'}</td><td>${pay.status!=='paid'?`<button class="btn btn-gold btn-sm" onclick="recordInstallmentPayment(${p.id},${pay.id},${pay.amount},'${p.currency_code}')"><i class="ti ti-check"></i>Pay</button>`:''}</td></tr>`).join('')}
      </tbody></table>
      ${p.customer_phone?`<button class="btn btn-wa btn-sm" style="margin-top:12px" onclick="openWhatsApp('${p.customer_phone}','Dear ${p.customer_name||'Customer'}, your installment payment is due. Plan: ${p.plan_number}. Zahab Gold')"><i class="ti ti-brand-whatsapp"></i> Send Reminder</button>`:''}
    </div>`;
    document.getElementById('inv-modal').classList.add('open');
  }catch(e){toast(e.message,'error');}
}
async function recordInstallmentPayment(planId,payId,amount,curr){
  const method=prompt('Payment method (cash/card/knet/bank_transfer):','cash');if(!method)return;
  try{const r=await API.payInstallment(planId,payId,{amount,payment_method:method});toast(r.all_paid?'All paid! Plan completed.':'Payment recorded');closeModal('inv-modal');loadInstallments();}catch(e){toast(e.message,'error');}
}

// ── BRANCHES ─────────────────────────────────────────────────
async function loadBranchPage(){
  try{
    const d=await API.branches();STATE.branches=d.data;
    document.getElementById('branch-grid').innerHTML=d.data.map(b=>`<div style="background:var(--bg2);border:1px solid ${STATE.activeBranch?.id===b.id?'var(--gold)':'var(--brd)'};border-radius:10px;padding:14px;cursor:pointer" onclick="setActiveBranch(${b.id})">
      <div style="font-size:24px;margin-bottom:8px">${b.flag||'🏪'}</div>
      <div style="font-size:13px;font-weight:600;color:var(--tx)">${b.name} ${STATE.activeBranch?.id===b.id?'<span class="badge green">Active</span>':''}</div>
      <div style="font-size:11px;color:var(--tx3)">${b.city||''}, ${b.country_name||''} • ${b.currency_code}</div>
      <div style="font-size:11px;color:var(--tx3);margin-top:4px">${b.manager_name||''}</div>
      <div style="font-size:10px;color:var(--tx3)">${b.phone||''}</div>
      <div style="font-size:10px;color:var(--gold);margin-top:4px">VAT: ${b.vat_rate||0}%</div>
      <button class="btn btn-out btn-sm" style="margin-top:8px" onclick="event.stopPropagation();openBranchModal(${b.id},'${b.name}','${b.city||''}','${b.phone||''}','${b.email||''}','${b.manager_name||''}',${b.country_id})"><i class="ti ti-edit"></i>Edit</button>
    </div>`).join('');
    // Comparison with real data (fetch invoice summary per branch)
    try{
      const rep=await API.salesReport({});
      const branchMap={};rep.data.by_branch.forEach(b=>{branchMap[b.branch_id]=b;});
      document.getElementById('branch-cmp-table').innerHTML=d.data.map(b=>{const bd=branchMap[b.id]||{};return `<tr><td style="font-weight:600">${b.flag||''} ${b.name}</td><td>${b.country_name||''}</td><td><span class="badge blue">${b.currency_code}</span></td><td>${bd.invoices||0}</td><td style="color:var(--gold)">${bd.revenue?fmtCurr(bd.revenue,bd.currency_code||b.currency_code):'—'}</td><td>—</td><td><span class="badge green">Active</span></td></tr>`;}).join('');
    }catch(e2){}
    // Transfer item select
    const itemD=await API.items();const sel=document.getElementById('tr-item');
    if(sel)sel.innerHTML=itemD.data.map(i=>`<option value="${i.id}">${i.name} (${i.sku})</option>`).join('');
  }catch(e){toast(e.message,'error');}
}
function setActiveBranch(id){
  STATE.activeBranch=STATE.branches.find(b=>b.id===id);
  if(STATE.activeBranch){document.getElementById('act-branch').textContent=STATE.activeBranch.name;document.getElementById('curr-lbl').textContent=STATE.activeBranch.currency_code;toast('Active branch: '+STATE.activeBranch.name);}
  loadBranchPage();
}
function openBranchModal(id,name,city,phone,email,manager,countryId){
  document.getElementById('bm-id').value=id||'';
  document.getElementById('bm-name').value=name||'';
  document.getElementById('bm-city').value=city||'';
  document.getElementById('bm-phone').value=phone||'';
  document.getElementById('bm-email').value=email||'';
  document.getElementById('bm-manager').value=manager||'';
  if(countryId)document.getElementById('bm-country').value=countryId;
  document.getElementById('bm-title').textContent=id?'Edit Branch':'Add Branch';
  document.getElementById('branch-modal').classList.add('open');
}
async function saveBranch(){
  const id=document.getElementById('bm-id').value;
  const data={name:document.getElementById('bm-name').value,city:document.getElementById('bm-city').value,phone:document.getElementById('bm-phone').value,email:document.getElementById('bm-email').value,manager_name:document.getElementById('bm-manager').value,country_id:document.getElementById('bm-country').value};
  if(!data.name)return toast('Branch name required','error');
  try{
    if(id)await API.updateBranch(id,data);else await API.addBranch(data);
    closeModal('branch-modal');toast(id?'Branch updated':'Branch added');loadBranchPage();loadBranches();
  }catch(e){toast(e.message,'error');}
}
function switchTab(group,tab,el){document.querySelectorAll('.'+group+'-tab').forEach(p=>p.style.display='none');document.getElementById(group+'-tab-'+tab).style.display='block';document.querySelectorAll('#pg-'+group+'s .tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');}
async function doTransfer(){
  try{
    await API.transfer({from_branch_id:document.getElementById('tr-from')?.value,to_branch_id:document.getElementById('tr-to')?.value,item_id:document.getElementById('tr-item')?.value,qty:parseInt(document.getElementById('tr-qty')?.value||1),notes:document.getElementById('tr-notes')?.value,transfer_date:document.getElementById('tr-date')?.value});
    showSuccess('Transfer Complete!','Stock has been moved and inventory updated.');
  }catch(e){toast(e.message,'error');}
}

// ── SUPPLIERS ─────────────────────────────────────────────────
async function loadSuppliers(){
  try{
    const s=document.getElementById('sup-q')?.value;
    const d=await API.suppliers(s?{search:s}:{});
    document.getElementById('suppliers-table').innerHTML=d.data.map(s=>`<tr><td style="font-weight:600">${s.name}</td><td style="direction:rtl;text-align:right">${s.name_ar||''}</td><td>${s.country||'—'}</td><td>${s.contact_person||'—'}</td><td style="font-size:11px">${s.phone||'—'}</td><td style="font-size:11px">${s.email||'—'}</td><td><div style="display:flex;gap:4px"><button class="btn btn-out btn-sm" onclick="openSupplierModal(${s.id},'${s.name}','${s.name_ar||''}','${s.country||''}','${s.contact_person||''}','${s.phone||''}','${s.email||''}','${s.city||''}')"><i class="ti ti-edit"></i></button><button class="btn btn-red btn-sm" onclick="deleteSupplierConfirm(${s.id},'${s.name}')"><i class="ti ti-trash"></i></button></div></td></tr>`).join('')||'<tr><td colspan="7" class="empty"><i class="ti ti-truck"></i>No suppliers found</td></tr>';
  }catch(e){toast(e.message,'error');}
}
function openSupplierModal(id,name,nameAr,country,contact,phone,email,city){
  document.getElementById('sm-id').value=id||'';
  document.getElementById('sm-name').value=name||'';
  document.getElementById('sm-name-ar').value=nameAr||'';
  document.getElementById('sm-country').value=country||'';
  document.getElementById('sm-city').value=city||'';
  document.getElementById('sm-contact').value=contact||'';
  document.getElementById('sm-phone').value=phone||'';
  document.getElementById('sm-email').value=email||'';
  document.getElementById('sm-title').textContent=id?'Edit Supplier':'New Supplier';
  document.getElementById('supplier-modal').classList.add('open');
}
async function saveSupplier(){
  const id=document.getElementById('sm-id').value;
  const data={name:document.getElementById('sm-name').value,name_ar:document.getElementById('sm-name-ar').value,country:document.getElementById('sm-country').value,city:document.getElementById('sm-city').value,contact_person:document.getElementById('sm-contact').value,phone:document.getElementById('sm-phone').value,email:document.getElementById('sm-email').value};
  if(!data.name)return toast('Supplier name required','error');
  try{if(id)await API.updateSupplier(id,data);else await API.addSupplier(data);closeModal('supplier-modal');toast(id?'Supplier updated':'Supplier added');loadSuppliers();}catch(e){toast(e.message,'error');}
}
async function deleteSupplierConfirm(id,name){
  const ok=await confirm2('Deactivate supplier "'+name+'"?','Deactivate Supplier');if(!ok)return;
  try{await API.deleteSupplier(id);toast('Supplier deactivated');loadSuppliers();}catch(e){toast(e.message,'error');}
}

// ── CURRENCY ─────────────────────────────────────────────────
async function loadCurrency(){
  await loadCurrencies();
  const d=await API.currencies();
  document.getElementById('curr-list').innerHTML=d.data.map(c=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--brd)">
    <div style="display:flex;align-items:center;gap:10px"><span style="font-size:20px">${c.code==='KWD'?'🇰🇼':c.code==='SAR'?'🇸🇦':c.code==='AED'?'🇦🇪':c.code==='BHD'?'🇧🇭':c.code==='QAR'?'🇶🇦':c.code==='OMR'?'🇴🇲':c.code==='USD'?'🇺🇸':c.code==='EUR'?'🇪🇺':c.code==='GBP'?'🇬🇧':'🌍'}</span><div><div style="font-size:13px;color:var(--tx)">${c.name}</div><div style="font-size:10px;color:var(--tx3)">${c.code}</div></div></div>
    <div style="text-align:right;display:flex;align-items:center;gap:8px"><input type="number" step="0.0001" value="${parseFloat(c.rate_to_usd).toFixed(4)}" style="width:90px;background:var(--bg3);border:1px solid var(--brd);color:var(--gold);padding:4px 8px;border-radius:6px;font-size:12px;text-align:right" onchange="API.updateCurrency('${c.code}',this.value).then(()=>toast('Rate updated')).catch(e=>toast(e.message,'error'))"/><span style="font-size:11px;color:var(--tx3)">/USD</span></div></div>`
  ).join('');
  const rate=STATE.goldUSD;
  document.getElementById('gold-per-curr').innerHTML=d.data.map(c=>{const perG=rate*c.rate_to_usd/31.1035;return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--brd);font-size:12px"><span>${c.code} per gram (24K)</span><span style="color:var(--gold);font-weight:700">${c.code} ${perG.toFixed(['KWD','BHD','OMR'].includes(c.code)?3:2)}</span></div>`;}).join('');
  doConvert();
}
function doConvert(){
  const amt=parseFloat(document.getElementById('conv-amt')?.value||0);
  const from=document.getElementById('conv-from')?.value||'KWD';const to=document.getElementById('conv-to')?.value||'AED';
  const rf=STATE.currencies[from]||0.308;const rt=STATE.currencies[to]||3.67;
  const result=amt/rf*rt;const rate=rt/rf;const d3=['KWD','BHD','OMR'].includes(to)?3:2;
  const r=document.getElementById('conv-result');if(r)r.textContent=result.toFixed(d3)+' '+to;
  const rl=document.getElementById('conv-rate-lbl');if(rl)rl.textContent=`1 ${from} = ${rate.toFixed(4)} ${to}`;
}

// ── REPORTS ───────────────────────────────────────────────────
async function loadReport(){
  try{
    const from=document.getElementById('rep-from')?.value;const to=document.getElementById('rep-to')?.value;
    const q={};if(from)q.from_date=from;if(to)q.to_date=to;
    const d=await API.salesReport(q);const s=d.data.summary;const curr=STATE.activeBranch?.currency_code||'KWD';
    document.getElementById('rep-stats').innerHTML=`
      <div class="stat-card gold-brd"><div class="stat-lbl">Revenue</div><div class="stat-val gold">${fmtCurr(s.total_revenue||0,curr)}</div></div>
      <div class="stat-card"><div class="stat-lbl">Invoices</div><div class="stat-val">${s.invoice_count||0}</div></div>
      <div class="stat-card"><div class="stat-lbl">Avg Transaction</div><div class="stat-val">${fmtCurr(s.avg_transaction||0,curr)}</div></div>
      <div class="stat-card"><div class="stat-lbl">Gold Sold</div><div class="stat-val">${parseFloat(s.total_weight_grams||0).toFixed(1)}g</div></div>
      <div class="stat-card"><div class="stat-lbl">Customers</div><div class="stat-val">${s.unique_customers||0}</div></div>`;
    document.getElementById('rep-karat').innerHTML=d.data.by_karat.map(k=>`<tr><td><span class="badge gold">${k.karat}</span></td><td>${parseFloat(k.weight||0).toFixed(1)}g</td><td style="color:var(--gold)">${fmtCurr(k.revenue||0,curr)}</td><td>${k.units||0}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">No data</td></tr>';
    document.getElementById('rep-branch').innerHTML=d.data.by_branch.map(b=>`<tr><td style="font-weight:600">${b.branch}</td><td>${b.invoices||0}</td><td style="color:var(--gold)">${fmtCurr(b.revenue||0,b.currency_code||curr)}</td></tr>`).join('')||'<tr><td colspan="3" class="empty">No data</td></tr>';
    // Store for export
    window._lastReport=d.data;
    // Render day chart
    const byDay=d.data.by_day||[];const dc=document.getElementById('rep-chart');
    if(dc&&byDay.length&&typeof Chart!=='undefined'){if(window._rc)window._rc.destroy();window._rc=new Chart(dc,{type:'line',data:{labels:byDay.map(d=>d.day.slice(5)),datasets:[{label:'Revenue',data:byDay.map(d=>parseFloat(d.revenue)),borderColor:'#C9A84C',backgroundColor:'rgba(201,168,76,.1)',tension:.3,fill:true}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#706858',font:{size:9}}},y:{ticks:{color:'#706858',font:{size:9}}}}}});}
  }catch(e){toast(e.message,'error');}
}
function exportReport(type){
  const r=window._lastReport;if(!r)return toast('Run a report first','error');
  if(type==='sales'){exportCSV(r.by_day,'sales-by-day');}
  else if(type==='karat'){exportCSV(r.by_karat,'sales-by-karat');}
  else if(type==='branch'){exportCSV(r.by_branch,'sales-by-branch');}
}

// ── CUSTOMERS ────────────────────────────────────────────────
async function loadCustomers(){
  try{
    const s=document.getElementById('cust-q')?.value;
    const d=await API.customers(s?{search:s}:{});
    document.getElementById('cust-table').innerHTML=d.data.map(c=>`<tr><td style="font-weight:600">${c.name}</td><td style="font-size:11px">${c.phone||'—'}</td><td>${c.nationality||'—'}</td><td style="font-size:11px">${c.id_number||'—'}</td><td><span class="badge gold">${c.loyalty_points||0} pts</span></td><td>${c.branch_name||'—'}</td><td><div style="display:flex;gap:4px"><button class="btn btn-out btn-sm" onclick="viewCustomer(${c.id})" title="View"><i class="ti ti-eye"></i></button><button class="btn btn-out btn-sm" onclick="openEditCustomer(${c.id})" title="Edit"><i class="ti ti-edit"></i></button>${c.phone?`<button class="btn btn-wa btn-sm" onclick="openWhatsApp('${c.phone}','Hello ${c.name}, welcome to Zahab Gold!')" title="WhatsApp"><i class="ti ti-brand-whatsapp"></i></button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="7" class="empty"><i class="ti ti-users"></i>No customers found</td></tr>';
  }catch(e){toast(e.message,'error');}
}
async function viewCustomer(id){
  try{
    const d=await API.customer(id);const c=d.data;
    document.getElementById('inv-modal-body').innerHTML=`<div>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
        <div style="width:48px;height:48px;border-radius:50%;background:var(--gold-d);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:var(--tx)">${(c.name||'C').charAt(0).toUpperCase()}</div>
        <div><div style="font-size:15px;font-weight:600;color:var(--tx)">${c.name}</div><div style="font-size:12px;color:var(--tx3)">${c.nationality||''} ${c.phone?'• '+c.phone:''}</div></div>
        <span class="badge gold" style="margin-left:auto">${c.loyalty_points||0} pts</span>
      </div>
      <div class="fr2" style="margin-bottom:12px">
        <div><span style="font-size:10px;color:var(--tx3)">ID Number</span><div>${c.id_number||'—'}</div></div>
        <div><span style="font-size:10px;color:var(--tx3)">Email</span><div>${c.email||'—'}</div></div>
      </div>
      ${c.notes?`<div style="margin-bottom:12px"><span style="font-size:10px;color:var(--tx3)">Notes</span><div style="font-size:12px;color:var(--tx2)">${c.notes}</div></div>`:''}
      <div style="font-size:13px;font-weight:600;color:var(--tx);margin-bottom:8px">Purchase History</div>
      <table><thead><tr><th>Invoice</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>
      ${(c.invoices||[]).map(i=>`<tr><td style="color:var(--gold);font-size:11px">${i.invoice_number}</td><td>${fmtCurr(i.total,i.currency_code)}</td><td><span class="badge ${i.payment_status==='paid'?'green':'gold'}">${i.payment_status}</span></td><td style="font-size:11px;color:var(--tx3)">${i.created_at?.split('T')[0]||''}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">No purchases yet</td></tr>'}
      </tbody></table>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn btn-out" onclick="closeModal('inv-modal');openEditCustomer(${c.id})"><i class="ti ti-edit"></i>Edit</button>
        ${c.phone?`<button class="btn btn-wa" onclick="openWhatsApp('${c.phone}','Hello ${c.name}, welcome to Zahab Gold!')"><i class="ti ti-brand-whatsapp"></i>WhatsApp</button>`:''}
      </div>
    </div>`;
    document.getElementById('inv-modal').classList.add('open');
  }catch(e){toast(e.message,'error');}
}
function openAddCustomer(){document.getElementById('cm2-id').value='';['cm2-name','cm2-phone','cm2-email','cm2-nat','cm2-id','cm2-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});document.getElementById('cm2-title').textContent='Add Customer';document.getElementById('cust-modal2').classList.add('open');}
async function openEditCustomer(id){
  try{const d=await API.customer(id);const c=d.data;document.getElementById('cm2-id').value=id;document.getElementById('cm2-name').value=c.name||'';document.getElementById('cm2-phone').value=c.phone||'';document.getElementById('cm2-email').value=c.email||'';document.getElementById('cm2-nat').value=c.nationality||'';document.getElementById('cm2-id').value=c.id_number||'';document.getElementById('cm2-notes').value=c.notes||'';document.getElementById('cm2-title').textContent='Edit Customer — '+c.name;document.getElementById('cust-modal2').classList.add('open');}catch(e){toast(e.message,'error');}
}
async function saveCustomer2(){
  const id=document.getElementById('cm2-id').value;
  const data={name:document.getElementById('cm2-name')?.value,phone:document.getElementById('cm2-phone')?.value,email:document.getElementById('cm2-email')?.value,nationality:document.getElementById('cm2-nat')?.value,id_number:document.getElementById('cm2-idn')?.value,notes:document.getElementById('cm2-notes')?.value,branch_id:STATE.activeBranch?.id};
  if(!data.name)return toast('Name required','error');
  try{if(id)await API.updateCustomer(id,data);else await API.addCustomer(data);closeModal('cust-modal2');toast(id?'Customer updated':'Customer added');loadCustomers();}catch(e){toast(e.message,'error');}
}

// ── USERS ─────────────────────────────────────────────────────
const ROLE_PERMS={1:{name:'Admin',color:'gold',desc:'Full access — all modules, all branches, user management, settings.'},2:{name:'Manager',color:'blue',desc:'Sales, Invoices, Orders, Reports, Items, Customers, Buyback. No users/settings.'},3:{name:'Cashier',color:'green',desc:'Point of Sale, Invoices, Orders, Customers, Buyback.'},4:{name:'Inventory',color:'orange',desc:'Items Catalog and Stock management only.'}};
async function loadUsers(){
  try{
    const [uData,bData]=await Promise.all([API.get('/users'),API.branches()]);
    const users=uData.data;
    document.getElementById('usr-stats').innerHTML=`<div class="stat-card gold-brd"><div class="stat-lbl">Total Users</div><div class="stat-val gold">${users.length}</div></div><div class="stat-card"><div class="stat-lbl">Admins</div><div class="stat-val" style="color:var(--gold)">${users.filter(u=>u.role_id===1).length}</div></div><div class="stat-card"><div class="stat-lbl">Managers</div><div class="stat-val" style="color:var(--blue)">${users.filter(u=>u.role_id===2).length}</div></div><div class="stat-card"><div class="stat-lbl">Cashiers</div><div class="stat-val" style="color:var(--green)">${users.filter(u=>u.role_id===3).length}</div></div>`;
    document.getElementById('usr-table').innerHTML=users.map(u=>`<tr><td><div style="display:flex;align-items:center;gap:8px"><div style="width:30px;height:30px;border-radius:50%;background:var(--gold-d);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--tx)">${(u.name||'U').charAt(0).toUpperCase()}</div><span style="font-weight:500">${u.name}</span></div></td><td style="color:var(--tx3);font-size:11px">${u.email}</td><td><span class="badge ${u.role_id===1?'gold':u.role_id===2?'blue':u.role_id===3?'green':'orange'}">${u.role_name}</span></td><td style="font-size:11px">${u.branch_name||'<span style="color:var(--tx3)">All Branches</span>'}</td><td style="font-size:11px;color:var(--tx3)">${u.phone||'—'}</td><td style="font-size:11px;color:var(--tx3)">${u.last_login?u.last_login.split('T')[0]:'Never'}</td><td><span class="badge ${u.is_active?'green':'red'}">${u.is_active?'Active':'Inactive'}</span></td><td><div style="display:flex;gap:4px"><button class="btn btn-out btn-sm" onclick="editUser(${u.id})" title="Edit"><i class="ti ti-edit"></i></button>${u.is_active?`<button class="btn btn-red btn-sm" onclick="toggleUser(${u.id},0)" title="Deactivate"><i class="ti ti-user-off"></i></button>`:`<button class="btn btn-out btn-sm" style="color:var(--green);border-color:var(--green)" onclick="toggleUser(${u.id},1)" title="Activate"><i class="ti ti-user-check"></i></button>`}</div></td></tr>`).join('')||'<tr><td colspan="8" class="empty"><i class="ti ti-users"></i>No users</td></tr>';
    const sel=document.getElementById('um-branch');if(sel)sel.innerHTML='<option value="">All Branches</option>'+bData.data.map(b=>`<option value="${b.id}">${b.flag||''} ${b.name}</option>`).join('');
  }catch(e){toast(e.message,'error');}
}
function openAddUser(){['um-id','um-name','um-email','um-pass','um-phone'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});document.getElementById('um-role').value='3';document.getElementById('um-active').value='1';document.getElementById('um-title').textContent='Add New User';document.getElementById('um-pass-hint').style.display='none';updateRoleDesc();document.getElementById('user-modal').classList.add('open');}
async function editUser(id){
  try{const d=await API.get('/users/'+id);const u=d.data;document.getElementById('um-id').value=u.id;document.getElementById('um-name').value=u.name;document.getElementById('um-email').value=u.email;document.getElementById('um-pass').value='';document.getElementById('um-phone').value=u.phone||'';document.getElementById('um-role').value=u.role_id;document.getElementById('um-active').value=u.is_active?'1':'0';const br=document.getElementById('um-branch');if(br)br.value=u.branch_id||'';document.getElementById('um-title').textContent='Edit — '+u.name;document.getElementById('um-pass-hint').style.display='inline';updateRoleDesc();document.getElementById('user-modal').classList.add('open');}catch(e){toast(e.message,'error');}
}
function updateRoleDesc(){const rid=parseInt(document.getElementById('um-role')?.value||3);const d=document.getElementById('um-role-desc');const r=ROLE_PERMS[rid];if(d&&r)d.innerHTML=`<span class="badge ${rid===1?'gold':rid===2?'blue':rid===3?'green':'orange'}" style="margin-bottom:6px;display:inline-flex">${r.name}</span><br>${r.desc}`;}
async function saveUser(){
  const id=document.getElementById('um-id').value;const name=document.getElementById('um-name').value.trim();const email=document.getElementById('um-email').value.trim();const pass=document.getElementById('um-pass').value;const phone=document.getElementById('um-phone').value.trim();const role_id=document.getElementById('um-role').value;const branch_id=document.getElementById('um-branch').value;const is_active=document.getElementById('um-active').value;
  if(!name)return toast('Name required','error');if(!email)return toast('Email required','error');if(!id&&!pass)return toast('Password required for new user','error');if(pass&&pass.length<6)return toast('Password min 6 chars','error');
  const body={name,email,phone,role_id:parseInt(role_id),branch_id:branch_id?parseInt(branch_id):null,is_active:parseInt(is_active)};if(pass)body.password=pass;
  try{if(id)await API.put('/users/'+id,body);else await API.post('/users',body);closeModal('user-modal');toast(id?'User updated':'User created');loadUsers();}catch(e){toast(e.message,'error');}
}
async function toggleUser(id,active){
  const ok=await confirm2('Are you sure you want to '+(active?'activate':'deactivate')+' this user?','Confirm');if(!ok)return;
  try{if(active)await API.put('/users/'+id+'/activate',{});else await API.del('/users/'+id);toast('User '+(active?'activated':'deactivated'));loadUsers();}catch(e){toast(e.message,'error');}
}
document.addEventListener('change',e=>{if(e.target&&e.target.id==='um-role')updateRoleDesc();});

// ── AUDIT LOG ─────────────────────────────────────────────────
async function loadAuditLog(){
  try{
    const d=await API.auditLog({limit:100});
    const moduleColors={auth:'blue',invoices:'green',items:'gold',buybacks:'orange',returns:'red',transfers:'blue',settings:'orange'};
    document.getElementById('audit-table').innerHTML=d.data.map(a=>`<tr class="audit-row"><td>${a.created_at?.replace('T',' ').slice(0,19)||''}</td><td style="font-weight:500">${a.user_name||'system'}</td><td><span class="badge ${moduleColors[a.module]||'gold'}">${a.module||'—'}</span></td><td>${a.action.replace(/_/g,' ')}</td><td style="color:var(--tx3);font-size:11px">${a.details?JSON.stringify(JSON.parse(a.details||'{}')).slice(0,60):'—'}</td></tr>`).join('')||'<tr><td colspan="5" class="empty"><i class="ti ti-history"></i>No activity yet</td></tr>';
  }catch(e){toast(e.message,'error');}
}

// ── SETTINGS ─────────────────────────────────────────────────
async function loadSettings(){
  try{
    const d=await API.settings();const s=d.data;
    if(s.shop_name)document.getElementById('set-name').value=s.shop_name;
    if(s.shop_name_ar)document.getElementById('set-name-ar').value=s.shop_name_ar;
    if(s.invoice_prefix)document.getElementById('set-prefix').value=s.invoice_prefix;
    if(s.default_currency)document.getElementById('set-curr').value=s.default_currency;
    if(s.invoice_language)document.getElementById('set-lang').value=s.invoice_language;
    if(s.vat_rate)document.getElementById('set-vat').value=s.vat_rate;
    if(s.show_gold_rate_on_invoice)document.getElementById('set-show-rate').checked=s.show_gold_rate_on_invoice==='1';
    const tm=document.getElementById('set-timeout');if(tm&&s.session_timeout_minutes)tm.value=s.session_timeout_minutes;
  }catch(e){}
}
async function saveSettings(){
  try{
    const settings={shop_name:document.getElementById('set-name')?.value,shop_name_ar:document.getElementById('set-name-ar')?.value,invoice_prefix:document.getElementById('set-prefix')?.value,default_currency:document.getElementById('set-curr')?.value,invoice_language:document.getElementById('set-lang')?.value,vat_rate:document.getElementById('set-vat')?.value,show_gold_rate_on_invoice:document.getElementById('set-show-rate')?.checked?'1':'0'};
    const tm=document.getElementById('set-timeout');if(tm)settings.session_timeout_minutes=tm.value;
    await API.saveSettings({settings});toast('Settings saved');
    localStorage.setItem('zahab_timeout',settings.session_timeout_minutes||'30');
  }catch(e){toast(e.message,'error');}
}
async function changePass(){
  const op=document.getElementById('old-pass')?.value;const np=document.getElementById('new-pass')?.value;
  if(!op||!np)return toast('Fill both password fields','error');
  try{await API.post('/auth/change-password',{old_password:op,new_password:np});toast('Password changed');document.getElementById('old-pass').value='';document.getElementById('new-pass').value='';}catch(e){toast(e.message,'error');}
}

// ── HELPERS ───────────────────────────────────────────────────
function showSuccess(title,msg,actionLabel,actionFn){
  document.getElementById('sm-title').textContent=title;
  document.getElementById('sm-msg').innerHTML=msg||'';
  const btn=document.getElementById('sm-action');
  if(actionLabel&&actionFn){btn.style.display='inline-flex';btn.textContent=actionLabel;btn.onclick=()=>{closeModal('success-modal');actionFn();};}
  else{btn.style.display='none';}
  document.getElementById('success-modal').classList.add('open');
}
function closeModal(id){document.getElementById(id)?.classList.remove('open');}
document.querySelectorAll('.modal-bg').forEach(m=>{m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');});});
