(function(){
'use strict';
/*DATA-START*/
const KEY='almoxarifado-portas-v1';
const META=5, ALTA=10;
const CATS={chapa:'Chapa',eletrico:'Elétrico'};
const CAT_VAR={chapa:'var(--s-chapa)',eletrico:'var(--s-eletrico)'};
const UNITS=['m²','m','un','kg'];
const MOTIVOS=['Corte fora da medida','Defeito do material','Retrabalho','Sobra sem aproveitamento','Dano no manuseio','Outro'];
const MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const r2=x=>Math.round(x*100)/100, r3=x=>Math.round(x*1000)/1000, r4=x=>Math.round(x*10000)/10000;
const pad=n=>String(n).padStart(2,'0');
const isoOf=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=()=>isoOf(new Date());
const parseISO=s=>{const p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2]);};
const fmtData=s=>{const p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0];};
const monthLabel=k=>{const p=k.split('-');return MES[Number(p[1])-1]+'/'+p[0].slice(2);};
const monthLong=k=>{const p=k.split('-');return MES[Number(p[1])-1]+' de '+p[0];};
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3);
const nf=(v,max=2)=>Number(v).toLocaleString('pt-BR',{maximumFractionDigits:max});
const brl=(v,d=2)=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:d,maximumFractionDigits:d});
const qty=(v,un)=>nf(v,2)+' '+un;
function parseNum(s){
  s=String(s==null?'':s).trim().replace(/\s/g,'').replace(/^R\$/,'');
  if(s==='')return 0;
  if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(',','.');
  return /^\d*\.?\d+$/.test(s)?Number(s):NaN;
}
function rng(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

/* entrada com custo médio ponderado */
function entrada(m,q,custo){
  const ns=r3(m.saldo+q);
  m.custo=(m.saldo>0&&ns>0)?r4((m.saldo*m.custo+q*custo)/ns):r4(custo);
  m.saldo=ns;
}

/* dados de exemplo: 6 meses de movimento, gerados a partir de hoje */
function seed(){
  const R=rng(20261109);
  const rf=(a,b)=>a+(b-a)*R(), ri=(a,b)=>Math.floor(rf(a,b+1)), pick=a=>a[Math.floor(R()*a.length)];
  const r1=x=>Math.round(x*10)/10;
  const defs=[
    ['CH-012','Chapa inox 1,2 mm','chapa','m²',40,62.4,72],
    ['CH-020','Chapa inox 2,0 mm','chapa','m²',25,98.5,36],
    ['CH-030','Chapa inox 3,0 mm','chapa','m²',12,146,18],
    ['EL-001','Motor de porta 1/2 CV monofásico','eletrico','un',3,890,4],
    ['EL-002','Placa de comando','eletrico','un',3,420,4],
    ['EL-003','Contator 12 A','eletrico','un',5,94,10],
    ['EL-004','Fim de curso','eletrico','un',6,46,12],
    ['EL-005','Botoeira tripla','eletrico','un',4,38,8],
    ['EL-006','Sensor fotoelétrico','eletrico','un',4,135,6],
    ['EL-007','Cabo PP 3×1,5 mm²','eletrico','m',60,6.8,100],
    ['EL-008','Cabo flexível 1,5 mm²','eletrico','m',80,2.1,200],
    ['EL-009','Eletroduto flexível 3/4"','eletrico','m',40,4.5,100]
  ];
  const lote={},base={};
  const materiais=defs.map(d=>{const id='m'+d[0].replace('-','').toLowerCase();lote[id]=d[6];base[id]=d[5];return{id,codigo:d[0],nome:d[1],cat:d[2],un:d[3],minimo:d[4],custo:d[5],saldo:0};});
  const by=id=>materiais.find(m=>m.id===id);
  const S0={materiais,movimentos:[],ops:[],seq:0,demo:true};
  const end=new Date();end.setHours(0,0,0,0);
  const startD=new Date(end.getFullYear(),end.getMonth()-5,1);
  const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
  const monthIdx=d=>(d.getFullYear()-startD.getFullYear())*12+d.getMonth()-startD.getMonth();
  const forn={chapa:['Aços Oeste Distribuidora','Metalúrgica Planalto'],eletrico:['Eletro Sul Comercial','Casa dos Motores']};
  const clientes=['Frigorífico Oeste','Logística Rápida','Metal Sul Indústria','Cooperativa Agrícola Vale','Transportadora Horizonte','Supermercado Bom Preço','Distribuidora Catarinense','Cerâmica Planalto','Condomínio Empresarial Centro','Fábrica de Móveis Serra'];
  const sizes=[[3,3],[3.5,4],[4,4],[4,4.5],[5,4.5],[5,5],[6,5],[2.5,3]];
  const fatores=[1.25,1.2,1.1,1.0,.9,.85];
  let d0=new Date(startD);while(d0.getDay()===0||d0.getDay()===6)d0=addDays(d0,1);
  function compra(m,q,d){
    const price=r2(base[m.id]*(1+rf(-.03,.03)+.006*monthIdx(d)));
    S0.movimentos.push({id:uid(),seq:++S0.seq,data:isoOf(d),tipo:'entrada',matId:m.id,delta:q,custo:price,nf:String(ri(1200,9800)),forn:pick(forn[m.cat]),resp:'Marcos Silva',obs:''});
    entrada(m,q,price);
  }
  materiais.forEach(m=>compra(m,lote[m.id],d0));
  for(let d=new Date(startD);d<=end;d=addDays(d,1)){
    const dow=d.getDay();if(dow===0||dow===6)continue;
    if(R()>0.3)continue;
    const fac=fatores[Math.min(monthIdx(d),5)];
    const sz=pick(sizes),w=sz[0],h=sz[1],area=w*h;
    const items=[];
    const add=(id,prev,usada,perda,motivo)=>{if(usada+perda>0)items.push({matId:id,prevista:prev,usada,perda,motivo:perda>0?motivo:''});};
    const lossRate=()=>{const x=R();return(x<.6?rf(.06,.11):x<.9?rf(.11,.16):rf(.16,.22))*fac;};
    const chapa=(id,prev)=>{const perda=r2(prev*lossRate());add(id,prev,r2(prev*rf(.98,1.05)),perda,pick(MOTIVOS.slice(0,5)));};
    chapa('mch012',r2(area));
    if(R()<.6)chapa('mch020',r2(area*.18));
    if(R()<.25)chapa('mch030',r2(area*.06));
    const un=(id,q,p)=>{if(q<=0)return;const perda=R()<p*fac?1:0;add(id,q,q,perda,pick(['Defeito do material','Dano no manuseio']));};
    un('mel001',1,.02);un('mel002',1,.03);un('mel003',R()<.85?1:0,.03);un('mel004',2,.07);un('mel005',1,.02);un('mel006',R()<.5?2:0,.04);
    const cabo=(id,prev)=>{prev=r1(prev);add(id,prev,r1(prev*rf(.95,1.06)),r1(prev*rf(.02,.16)*fac),'Corte fora da medida');};
    cabo('mel007',w*2+h*1.5+4);cabo('mel008',w*3+h*2+6);cabo('mel009',h*2+4);
    for(const it of items){
      const m=by(it.matId),need=r3(it.usada+it.perda);
      if(m.saldo<need){const k=Math.ceil((need+m.minimo*.9-m.saldo)/lote[m.id]);const cd=addDays(d,-ri(1,3));compra(m,k*lote[m.id],cd<d0?d0:cd);}
    }
    const numero='OP-'+String(101+S0.ops.length).padStart(4,'0');
    const resp=pick(['Rafael Souza','Tiago Lima']),opId=uid();
    const op={id:opId,numero,cliente:pick(clientes),largura:w,altura:h,data:isoOf(d),resp,itens:[]};
    for(const it of items){
      const m=by(it.matId),custo=m.custo;
      op.itens.push({matId:m.id,prevista:it.prevista,usada:it.usada,perda:it.perda,motivo:it.motivo,custo});
      S0.movimentos.push({id:uid(),seq:++S0.seq,data:op.data,tipo:'saida',matId:m.id,delta:-r3(it.usada+it.perda),custo,op:numero,opId,resp,usada:it.usada,perda:it.perda,prevista:it.prevista,motivo:it.motivo,obs:''});
      m.saldo=r3(m.saldo-it.usada-it.perda);
    }
    S0.ops.push(op);
  }
  materiais.forEach(m=>{if(m.saldo<m.minimo&&R()<.65){const k=Math.ceil((m.minimo*1.5-m.saldo)/lote[m.id]);compra(m,k*lote[m.id],addDays(end,-ri(0,6)));}});
  const ajustes=[['mch012',-1.8,'Contagem semanal: retalho de chapa sem registro',-28],['mel007',-6,'Sobra de cabo descartada sem registro',-18],['mel004',-1,'Contagem mensal: fim de curso não localizado',-9],['mel005',1,'Contagem mensal: botoeira devolvida de obra',-5]];
  for(const a of ajustes){
    const m=by(a[0]);if(m.saldo+a[1]<0)continue;
    const dt=addDays(end,a[3]);
    S0.movimentos.push({id:uid(),seq:++S0.seq,data:isoOf(dt<d0?d0:dt),tipo:'ajuste',matId:m.id,delta:a[1],custo:m.custo,resp:'Marcos Silva',obs:a[2]});
    m.saldo=r3(m.saldo+a[1]);
  }
  return S0;
}

function load(){try{const raw=localStorage.getItem(KEY);if(!raw)return null;const d=JSON.parse(raw);if(d&&Array.isArray(d.materiais)&&Array.isArray(d.movimentos)&&Array.isArray(d.ops))return d;}catch(e){}return null;}
let S=load()||seed();
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}

const matById=id=>S.materiais.find(m=>m.id===id);
const inCat=(m,cat)=>cat==='all'||(m&&m.cat===cat);
const inRange=(date,r)=>(!r.start||date>=r.start)&&date<=r.end;
const byCat=(a,b)=>a.cat!==b.cat?(a.cat==='chapa'?-1:1):a.codigo.localeCompare(b.codigo);
function monthStart(off){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+off);return isoOf(d);}
function rangeFor(p){if(p==='all')return{start:null,end:today()};const n=Number(p);return{start:monthStart(-(n-1)),end:today()};}
function prevRange(p){if(p==='all')return null;const n=Number(p);const e=parseISO(monthStart(-(n-1)));e.setDate(e.getDate()-1);return{start:monthStart(-(2*n-1)),end:isoOf(e)};}
function monthsOf(r){
  let first=r.start;
  if(!first){first=S.movimentos.length?S.movimentos.reduce((a,m)=>m.data<a?m.data:a,S.movimentos[0].data):today();}
  const out=[];const d=parseISO(first);d.setDate(1);const end=parseISO(r.end);
  while(d<=end){out.push(isoOf(d).slice(0,7));d.setMonth(d.getMonth()+1);}
  return out;
}
const saidas=(r,cat)=>S.movimentos.filter(m=>m.tipo==='saida'&&inRange(m.data,r)&&inCat(matById(m.matId),cat));
function lossStats(movs){let cons=0,perda=0;for(const m of movs){cons+=(m.usada+m.perda)*m.custo;perda+=m.perda*m.custo;}return{cons,perda,pct:cons>0?perda/cons*100:0};}
function lossStatus(p){return p<=META?{k:'good',t:'Dentro da meta'}:p<=ALTA?{k:'warn',t:'Acima da meta'}:{k:'crit',t:'Perda alta'};}
function opStats(op,cat){let cons=0,perda=0;for(const i of op.itens){if(!inCat(matById(i.matId),cat))continue;cons+=(i.usada+i.perda)*i.custo;perda+=i.perda*i.custo;}return{cons,perda,pct:cons>0?perda/cons*100:0};}
function stockStatus(m){return m.saldo<=0?{k:'crit',t:'Sem estoque'}:m.saldo<m.minimo?{k:'warn',t:'Abaixo do mínimo'}:{k:'good',t:'Ok'};}
function nextOP(){let mx=100;for(const o of S.ops){const n=parseInt(String(o.numero).replace(/\D/g,''),10);if(n>mx)mx=n;}return'OP-'+String(mx+1).padStart(4,'0');}

function commitEntrada(h,lines){
  for(const l of lines){const m=matById(l.matId);
    S.movimentos.push({id:uid(),seq:++S.seq,data:h.data,tipo:'entrada',matId:m.id,delta:l.qtd,custo:l.custo,nf:h.nf,forn:h.forn,resp:h.resp,obs:''});
    entrada(m,l.qtd,l.custo);}
  save();
}
function commitPorta(h,items){
  const opId=uid();
  const op={id:opId,numero:h.numero,cliente:h.cliente,largura:h.l,altura:h.h,data:h.data,resp:h.resp,itens:[]};
  for(const it of items){const m=matById(it.matId),custo=m.custo;
    op.itens.push({matId:m.id,prevista:it.prev,usada:it.usada,perda:it.perda,motivo:it.motivo,custo});
    S.movimentos.push({id:uid(),seq:++S.seq,data:h.data,tipo:'saida',matId:m.id,delta:-r3(it.usada+it.perda),custo,op:h.numero,opId,resp:h.resp,usada:it.usada,perda:it.perda,prevista:it.prev,motivo:it.motivo,obs:''});
    m.saldo=r3(m.saldo-it.usada-it.perda);}
  S.ops.push(op);save();return op;
}
function commitAjuste(m,contagem,resp,obs){
  const delta=r3(contagem-m.saldo);
  S.movimentos.push({id:uid(),seq:++S.seq,data:today(),tipo:'ajuste',matId:m.id,delta,custo:m.custo,resp,obs});
  m.saldo=r3(contagem);save();return delta;
}
/*DATA-END*/

/* ---------- interface ---------- */
const $=(s,el)=>(el||document).querySelector(s);
const $$=(s,el)=>[...(el||document).querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const UI={per:'6',cat:'all',ecat:'all',eq:'',htab:'mov',htipo:'all',hmat:'all',hq:'',hn:40,redraw:null};
const D={ent:null,porta:null};

const PI={
  good:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  warn:'<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
  crit:'<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  neutral:'<circle cx="12" cy="12" r="3"/>',
  in:'<path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"/>',
  out:'<path d="M12 16V5m0 0l-4 4m4-4l4 4M5 20h14"/>',
  adj:'<path d="M4 8h12m0 0l-3-3m3 3l-3 3M20 16H8m0 0l3-3m-3 3l3 3"/>',
  up:'<path d="M12 19V6m0 0l-5 5m5-5l5 5"/>',
  down:'<path d="M12 5v13m0 0l-5-5m5 5l5-5"/>'
};
const pill=(k,t)=>`<span class="pill"><svg class="pi ${k==='in'||k==='out'||k==='adj'?'neutral':k}" viewBox="0 0 24 24" aria-hidden="true">${PI[k]}</svg>${esc(t)}</span>`;
const pctTxt=p=>nf(p,1)+'%';
const catChip=c=>`<span class="chip"><i class="sw" style="background:${CAT_VAR[c]};margin:0"></i>${CATS[c]}</span>`;

function toast(msg){const t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>{t.hidden=true;},3800);}
function openModal(html,o){
  o=o||{};closeModal();
  const ov=document.createElement('div');ov.className='ov';
  ov.innerHTML=`<div class="md${o.wide?' wide':''}" role="dialog" aria-modal="true" aria-label="${esc(o.label||'Janela')}">${html}</div>`;
  ov.addEventListener('mousedown',e=>{if(e.target===ov)closeModal();});
  ov.addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeModal();});
  $('#modal-root').appendChild(ov);document.body.style.overflow='hidden';
  const f=ov.querySelector('[data-focus]')||ov.querySelector('input,select,textarea,button');if(f)f.focus();
  return ov.firstElementChild;
}
function closeModal(){$('#modal-root').innerHTML='';document.body.style.overflow='';}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});

/* tooltips */
const tipEl=$('#tip');
function showTip(html,x,y){
  tipEl.innerHTML=html;tipEl.style.display='block';
  const w=tipEl.offsetWidth,h=tipEl.offsetHeight,vw=document.documentElement.clientWidth,vh=window.innerHeight;
  let L=x+14,T=y+14;if(L+w>vw-8)L=x-w-14;if(L<8)L=8;if(T+h>vh-8)T=y-h-14;if(T<8)T=8;
  tipEl.style.left=L+'px';tipEl.style.top=T+'px';
}
const hideTip=()=>{tipEl.style.display='none';};
function bindTips(host){
  const mv=e=>{const t=e.target.closest('[data-tip]');if(!t||!host.contains(t)){hideTip();return;}showTip(t.getAttribute('data-tip'),e.clientX,e.clientY);};
  host.addEventListener('pointermove',mv);host.addEventListener('pointerdown',mv);host.addEventListener('pointerleave',hideTip);
  host.addEventListener('focusin',e=>{const t=e.target.closest('[data-tip]');if(!t)return;const b=t.getBoundingClientRect();showTip(t.getAttribute('data-tip'),b.left+b.width/2,b.top+b.height/2);});
  host.addEventListener('focusout',hideTip);
}

/* ---------- gráficos ---------- */
function niceScale(vmax,n){
  n=n||4;if(vmax<=0)return{max:n,step:1};
  const raw=vmax/n,p=Math.pow(10,Math.floor(Math.log10(raw))),f=raw/p;
  const s=(f<=1?1:f<=2?2:f<=5?5:10)*p;
  return{max:Math.ceil(vmax/s-1e-9)*s,step:s};
}
const tickMoney=(v,max)=>v===0?'0':(max>=10000?nf(v/1000,1)+' mil':nf(v,0));
const tipRow=(c,name,val,extra)=>`<div class="tr"><span><i class="sw" style="background:${c}"></i>${esc(name)}</span><b>${val}</b></div>${extra?`<div class="tt">${extra}</div>`:''}`;

function drawStack(host,months,series,tipFn,label){
  const W=Math.floor(host.clientWidth);if(W<120)return;
  const H=232,M={l:52,r:10,t:10,b:28};
  const tot=months.map((_,i)=>series.reduce((a,s)=>a+s.vals[i],0));
  const sc=niceScale(Math.max.apply(null,tot.concat([1]))),n=Math.round(sc.max/sc.step);
  const iw=W-M.l-M.r,ih=H-M.t-M.b,band=iw/months.length;
  const X=i=>M.l+band*(i+.5),Y=v=>M.t+ih*(1-v/sc.max),bw=Math.min(24,band*.6);
  let s='';
  for(let i=0;i<=n;i++){const v=i*sc.step,y=Y(v);s+=`<line class="${i?'gr':'ax'}" x1="${M.l}" x2="${W-M.r}" y1="${y}" y2="${y}"/><text class="tk" x="${M.l-8}" y="${y+4}" text-anchor="end">${tickMoney(v,sc.max)}</text>`;}
  const skip=band<34?2:1;
  months.forEach((k,i)=>{if(i%skip===0)s+=`<text class="tk" x="${X(i)}" y="${H-8}" text-anchor="middle">${monthLabel(k)}</text>`;});
  months.forEach((k,i)=>{
    let cum=0;const segs=series.filter(sr=>sr.vals[i]>0);
    segs.forEach((sr,j)=>{
      const y1=Y(cum),y2=Y(cum+sr.vals[i]);cum+=sr.vals[i];
      let bottom=y1-(j>0?1:0),top=y2+(j<segs.length-1?1:0);
      if(bottom-top<2)top=bottom-2;
      const x=X(i)-bw/2;
      if(j===segs.length-1){const r=Math.min(4,(bottom-top)/2);s+=`<path d="M${x},${bottom}V${top+r}a${r},${r} 0 0 1 ${r},${-r}H${x+bw-r}a${r},${r} 0 0 1 ${r},${r}V${bottom}Z" fill="${sr.color}"/>`;}
      else s+=`<rect x="${x}" y="${top}" width="${bw}" height="${bottom-top}" fill="${sr.color}"/>`;
    });
  });
  months.forEach((k,i)=>{s+=`<rect class="hit" tabindex="0" x="${M.l+band*i}" y="${M.t}" width="${band}" height="${ih}" data-tip="${esc(tipFn(i))}" aria-label="${esc(monthLong(k)+': '+brl(tot[i]))}"/>`;});
  host.innerHTML=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${s}</svg>`;
}

function drawLine(host,months,series,tipFn,label){
  const W=Math.floor(host.clientWidth);if(W<120)return;
  const H=232,M={l:46,r:12,t:14,b:28};
  const all=[];series.forEach(sr=>sr.vals.forEach(v=>{if(v!=null)all.push(v);}));
  const sc=niceScale(Math.max.apply(null,all.concat([META*1.15]))),n=Math.round(sc.max/sc.step);
  const iw=W-M.l-M.r,ih=H-M.t-M.b,band=iw/months.length;
  const X=i=>M.l+band*(i+.5),Y=v=>M.t+ih*(1-v/sc.max);
  let s='';
  for(let i=0;i<=n;i++){const v=i*sc.step,y=Y(v);s+=`<line class="${i?'gr':'ax'}" x1="${M.l}" x2="${W-M.r}" y1="${y}" y2="${y}"/><text class="tk" x="${M.l-8}" y="${y+4}" text-anchor="end">${nf(v,1)}%</text>`;}
  const skip=band<34?2:1;
  months.forEach((k,i)=>{if(i%skip===0)s+=`<text class="tk" x="${X(i)}" y="${H-8}" text-anchor="middle">${monthLabel(k)}</text>`;});
  s+=`<line class="meta-l" x1="${M.l}" x2="${W-M.r}" y1="${Y(META)}" y2="${Y(META)}"/><text class="tk" x="${M.l+4}" y="${Y(META)-5}">Meta ${META}%</text>`;
  const lastVals=series.map(sr=>{for(let i=sr.vals.length-1;i>=0;i--)if(sr.vals[i]!=null)return{i,v:sr.vals[i]};return null;});
  series.forEach((sr,si)=>{
    let d='',pen=false;
    sr.vals.forEach((v,i)=>{if(v==null){pen=false;return;}d+=(pen?'L':'M')+X(i)+','+Y(v);pen=true;});
    s+=`<path d="${d}" fill="none" stroke="${sr.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    sr.vals.forEach((v,i)=>{if(v!=null)s+=`<circle cx="${X(i)}" cy="${Y(v)}" r="4" fill="${sr.color}" stroke="var(--surface)" stroke-width="2"/>`;});
    const lv=lastVals[si];
    if(lv){const above=series.length<2||si===0?lv.v>=(lastVals[1-si]?lastVals[1-si].v:-1):lv.v>(lastVals[0]?lastVals[0].v:-1);
      s+=`<text class="tl" x="${Math.min(X(lv.i),W-M.r-16)}" y="${(above||Y(lv.v)+17>H-M.b-3)?Y(lv.v)-11:Y(lv.v)+17}" text-anchor="middle">${nf(lv.v,1)}%</text>`;}
  });
  months.forEach((k,i)=>{s+=`<rect class="hit" tabindex="0" x="${M.l+band*i}" y="${M.t}" width="${band}" height="${ih}" data-tip="${esc(tipFn(i))}" aria-label="${esc(monthLong(k))}"/>`;});
  host.innerHTML=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${s}</svg>`;
}

/* ---------- peças de tela ---------- */
const head=(t,sub,acts)=>`<header class="top"><div><h1>${t}</h1><p>${sub}</p></div><div class="acts">${acts||''}</div></header>`;
const seg=(name,opts,val)=>`<div class="seg" role="group" aria-label="${name}">${opts.map(o=>`<button type="button" data-seg="${name}" data-v="${o[0]}" aria-pressed="${o[0]===val}">${o[1]}</button>`).join('')}</div>`;
function matOptions(sel){
  let h='<option value="">Selecione o material</option>';
  for(const c of Object.keys(CATS)){
    h+=`<optgroup label="${CATS[c]}">`+S.materiais.filter(m=>m.cat===c).sort(byCat).map(m=>`<option value="${m.id}"${m.id===sel?' selected':''}>${esc(m.codigo)} · ${esc(m.nome)}</option>`).join('')+'</optgroup>';
  }
  return h;
}
function refreshLists(){
  const set=(id,arr)=>{$('#'+id).innerHTML=[...new Set(arr.filter(Boolean))].sort().map(v=>`<option value="${esc(v)}">`).join('');};
  set('dl-resp',S.movimentos.map(m=>m.resp).concat(S.ops.map(o=>o.resp)));
  set('dl-forn',S.movimentos.filter(m=>m.tipo==='entrada').map(m=>m.forn));
  set('dl-cli',S.ops.map(o=>o.cliente));
}
function renderFoot(){
  $('#foot').innerHTML=`<p>Dados salvos neste navegador.</p><button class="lnk" type="button" data-act="backup">Backup dos dados</button><button class="lnk" type="button" data-act="${S.demo?'zerar':'exemplo'}">${S.demo?'Começar do zero':'Recarregar dados de exemplo'}</button>`;
}
const errBox=list=>`<div class="alert" role="alert"><b>Revise antes de salvar</b><ul>${list.map(e=>`<li>${esc(e)}</li>`).join('')}</ul></div>`;
const tableBlock=(h,rows,foot)=>`<div class="scroll"><table class="tbl"><thead><tr>${h}</tr></thead><tbody>${rows}</tbody>${foot||''}</table></div>`;

/* ---------- painel ---------- */
function chartCard(id,title,sub,legend,tbl,hasData,emptyMsg){
  return `<section class="card"><div class="card-h"><div><h3>${title}</h3><p class="sub">${sub}</p></div>${hasData?`<button type="button" class="btn sm ghost" data-toggle="${id}" aria-pressed="false">Ver tabela</button>`:''}</div>${hasData?`${legend}<div class="viz" id="v-${id}"></div><div class="scroll" id="t-${id}" hidden>${tbl}</div>`:`<p class="empty">${emptyMsg}</p>`}</section>`;
}
function vPainel(root){
  const rg=rangeFor(UI.per),cat=UI.cat;
  const perTxt={'3':'últimos 3 meses','6':'últimos 6 meses',all:'todo o histórico'}[UI.per];
  const sal=saidas(rg,cat),st=lossStats(sal),ls=lossStatus(st.pct);
  const pr=prevRange(UI.per);let delta=null;
  if(pr){const ps=lossStats(saidas(pr,cat));if(ps.cons>0&&st.cons>0)delta=st.pct-ps.pct;}
  const ops=S.ops.filter(o=>inRange(o.data,rg)&&o.itens.some(i=>inCat(matById(i.matId),cat)));
  const mats=S.materiais.filter(m=>inCat(m,cat));
  const estV=mats.reduce((a,m)=>a+m.saldo*m.custo,0);
  const baixos=mats.filter(m=>m.saldo<m.minimo).sort((a,b)=>a.saldo/a.minimo-b.saldo/b.minimo);
  const aj=S.movimentos.filter(m=>m.tipo==='ajuste'&&inRange(m.data,rg)&&inCat(matById(m.matId),cat));
  const falta=aj.reduce((a,m)=>a+(m.delta<0?-m.delta*m.custo:0),0),sobra=aj.reduce((a,m)=>a+(m.delta>0?m.delta*m.custo:0),0);
  const months=monthsOf(rg),cats=cat==='all'?['chapa','eletrico']:[cat];
  const perM=months.map(k=>{const o={k};cats.forEach(c=>{o[c]=lossStats(saidas({start:k+'-01',end:k+'-31'},c));});o.all=lossStats(saidas({start:k+'-01',end:k+'-31'},cat));return o;});
  const catTxt=cat==='all'?'':' · '+CATS[cat];

  /* perda por material */
  const gm={};sal.forEach(m=>{const g=gm[m.matId]||(gm[m.matId]={perdaQ:0,consQ:0,perdaV:0});g.perdaQ+=m.perda;g.consQ+=m.usada+m.perda;g.perdaV+=m.perda*m.custo;});
  const top=Object.keys(gm).map(id=>({m:matById(id),g:gm[id]})).filter(x=>x.g.perdaV>0).sort((a,b)=>b.g.perdaV-a.g.perdaV).slice(0,8);
  const topMax=top.length?top[0].g.perdaV:1;
  const hb=top.map((x,i)=>`<div class="hb-row" tabindex="0" data-tip="${esc(`<div class="th">${esc(x.m.nome)}</div>`+tipRow(CAT_VAR[x.m.cat],'Perdido',brl(x.g.perdaV),`${qty(x.g.perdaQ,x.m.un)} de ${qty(x.g.consQ,x.m.un)} consumidos (${pctTxt(x.g.perdaQ/x.g.consQ*100)})`))}">
    <div class="hb-name">${esc(x.m.nome)}<small>${esc(x.m.codigo)}</small></div>
    <div class="hb-track"><div class="hb-bar" style="width:${Math.max(1,x.g.perdaV/topMax*100)}%;background:${CAT_VAR[x.m.cat]}"></div></div>
    <div class="hb-val">${brl(x.g.perdaV,0)}</div></div>`).join('');

  const lowHtml=baixos.length?baixos.slice(0,7).map(m=>{const s=stockStatus(m);return `<div class="low-row"><div><b>${esc(m.nome)}</b><small>${qty(m.saldo,m.un)} em estoque · mínimo ${qty(m.minimo,m.un)}</small></div><div>${pill(s.k,s.t)} <button type="button" class="btn sm" data-act="entrada-mat" data-id="${m.id}">Registrar entrada</button></div></div>`;}).join(''):'<p class="empty">Nenhum material abaixo do mínimo.</p>';

  const lastOps=ops.slice().sort((a,b)=>a.data<b.data?1:a.data>b.data?-1:b.numero.localeCompare(a.numero)).slice(0,8);
  const opRows=lastOps.map(o=>{const s=opStats(o,cat),q=lossStatus(s.pct);return `<tr><td><button type="button" class="olink" data-op="${o.id}">${esc(o.numero)}</button></td><td>${esc(o.cliente)}</td><td class="num">${nf(o.largura)} × ${nf(o.altura)} m</td><td class="num">${fmtData(o.data)}</td><td class="num">${brl(s.cons)}</td><td class="num">${brl(s.perda)}</td><td class="num"><span class="meter" aria-hidden="true"><i style="width:${Math.min(100,s.pct/15*100)}%;background:var(--${q.k})"></i></span>${pctTxt(s.pct)}</td><td>${pill(q.k,q.t)}</td></tr>`;}).join('');

  const stackTbl=tableBlock('<th>Mês</th>'+cats.map(c=>`<th class="num">${CATS[c]} (R$)</th>`).join('')+(cats.length>1?'<th class="num">Total (R$)</th>':'')+'<th class="num">% de perda</th>',
    perM.map(x=>`<tr><td>${monthLabel(x.k)}</td>${cats.map(c=>`<td class="num">${brl(x[c].perda)}</td>`).join('')}${cats.length>1?`<td class="num">${brl(x.all.perda)}</td>`:''}<td class="num">${x.all.cons>0?pctTxt(x.all.pct):'—'}</td></tr>`).join(''));
  const lineTbl=tableBlock('<th>Mês</th>'+cats.map(c=>`<th class="num">${CATS[c]}</th>`).join(''),
    perM.map(x=>`<tr><td>${monthLabel(x.k)}</td>${cats.map(c=>`<td class="num">${x[c].cons>0?pctTxt(x[c].pct):'—'}</td>`).join('')}</tr>`).join(''));
  const legendCats=cats.length>1?`<div class="legend">${cats.map(c=>`<span><i class="sw" style="background:${CAT_VAR[c]}"></i>${CATS[c]}</span>`).join('')}</div>`:'';

  root.innerHTML=head('Painel de perdas','Quanto material entrou, saiu e foi perdido na fabricação das portas.',
    '<a class="btn" href="#entrada">Registrar entrada</a><a class="btn primary" href="#porta">Cadastrar porta</a>')+
  (S.demo?`<div class="notice"><span>Você está vendo dados de exemplo. Registre entradas e portas para ver os seus números.</span><button type="button" class="btn sm" data-act="zerar">Começar do zero</button></div>`:'')+
  `<div class="filters"><div class="fg"><span>Período</span>${seg('per',[['3','3 meses'],['6','6 meses'],['all','Tudo']],UI.per)}</div><div class="fg"><span>Material</span>${seg('cat',[['all','Todos'],['chapa','Chapa'],['eletrico','Elétrico']],UI.cat)}</div></div>
  <section class="card hero"><div><div class="eyebrow">Perdido em matéria-prima · ${perTxt}${catTxt}</div><div class="hero-fig">${brl(st.perda,0)}</div>
    <div class="hero-sub">${st.cons>0?`<span><b>${pctTxt(st.pct)}</b> de tudo que foi consumido (${brl(st.cons,0)})</span>${pill(ls.k,ls.t)}`:'<span>Nenhum consumo registrado no período.</span>'}</div></div>
    <div class="hero-side">
      <div><div class="eyebrow">Meta de perda</div><div>Até <b>${META}%</b>. Acima de ${ALTA}% é perda alta.</div></div>
      ${delta!=null?`<div><div class="eyebrow">Frente ao período anterior</div><div style="display:flex;gap:6px;align-items:center"><svg class="pi ${delta<=0?'good':'crit'}" viewBox="0 0 24 24" aria-hidden="true">${delta<=0?PI.down:PI.up}</svg><b>${delta<=0?'−':'+'}${nf(Math.abs(delta),1)} p.p.</b> <span class="tm">${delta<=0?'perda menor':'perda maior'}</span></div></div>`:''}
      <div><div class="eyebrow">Divergências de inventário</div><div>${aj.length?`<b>${brl(falta,0)}</b> em falta e ${brl(sobra,0)} de sobra em ${aj.length} ${aj.length>1?'contagens':'contagem'}`:'Nenhuma divergência apurada.'}</div></div>
    </div></section>
  <div class="tiles">
    <div class="tile"><div class="l">Valor em estoque</div><div class="v">${brl(estV,0)}</div><div class="n">${mats.length} materiais, a custo médio</div></div>
    <div class="tile"><div class="l">Portas produzidas</div><div class="v">${ops.length}</div><div class="n">${perTxt}</div></div>
    <div class="tile"><div class="l">Material consumido</div><div class="v">${brl(st.cons,0)}</div><div class="n">usado + perdido</div></div>
    <div class="tile"><div class="l">Abaixo do mínimo</div><div class="v">${baixos.length}</div><div class="n">de ${mats.length} materiais</div></div>
  </div>
  <div class="row2">
    ${chartCard('c1','Perda por mês',`Valor perdido em R$${catTxt}. O mês atual está em andamento.`,legendCats,stackTbl,sal.length>0,'Ainda não há portas registradas neste período.')}
    ${chartCard('c2','Percentual de perda por mês',`Perda sobre o consumo${catTxt}`,legendCats,lineTbl,sal.length>0,'Ainda não há portas registradas neste período.')}
  </div>
  <div class="row2">
    <section class="card"><div class="card-h"><div><h3>Onde mais se perde</h3><p class="sub">Valor perdido por material, ${perTxt}</p></div></div>${cat==='all'?`<div class="legend"><span><i class="sw" style="background:var(--s-chapa)"></i>Chapa</span><span><i class="sw" style="background:var(--s-eletrico)"></i>Elétrico</span></div>`:''}${top.length?`<div class="hb" id="hb">${hb}</div>`:'<p class="empty">Nenhuma perda registrada neste período.</p>'}</section>
    <section class="card"><div class="card-h"><div><h3>Reposição</h3><p class="sub">Materiais abaixo do estoque mínimo</p></div></div><div class="low">${lowHtml}</div></section>
  </div>
  <section class="card"><div class="card-h"><div><h3>Últimas portas</h3><p class="sub">Consumo e perda de cada ordem de produção${catTxt}</p></div><a class="btn sm ghost" href="#historico" data-act="ver-portas">Ver todas</a></div>
    ${lastOps.length?tableBlock('<th>OP</th><th>Cliente</th><th class="num">Medidas</th><th class="num">Data</th><th class="num">Consumo</th><th class="num">Perda</th><th class="num">% perda</th><th>Situação</th>',opRows):'<p class="empty">Nenhuma porta registrada neste período.</p>'}</section>`;

  const c1=$('#v-c1'),c2=$('#v-c2');
  if(c1){bindTips(c1);bindTips(c2);}
  if($('#hb'))bindTips($('#hb'));
  UI.redraw=()=>{
    if(c1&&!c1.hidden)drawStack(c1,months,cats.map(c=>({name:CATS[c],color:CAT_VAR[c],vals:perM.map(x=>r2(x[c].perda))})),i=>{
      const x=perM[i];return `<div class="th">${monthLong(x.k)}</div>`+cats.map(c=>tipRow(CAT_VAR[c],CATS[c],brl(x[c].perda),x[c].cons>0?pctTxt(x[c].pct)+' do consumo':'')).join('')+(cats.length>1?`<div class="tt">Total ${brl(x.all.perda)} · ${x.all.cons>0?pctTxt(x.all.pct):'sem consumo'}</div>`:'');
    },`Perda em reais por mês, de ${monthLabel(months[0])} a ${monthLabel(months[months.length-1])}`);
    if(c2&&!c2.hidden)drawLine(c2,months,cats.map(c=>({name:CATS[c],color:CAT_VAR[c],vals:perM.map(x=>x[c].cons>0?x[c].pct:null)})),i=>{
      const x=perM[i];return `<div class="th">${monthLong(x.k)}</div>`+cats.map(c=>tipRow(CAT_VAR[c],CATS[c],x[c].cons>0?pctTxt(x[c].pct):'—',x[c].cons>0?brl(x[c].perda)+' de '+brl(x[c].cons):'')).join('')+`<div class="tt">Meta ${META}%</div>`;
    },`Percentual de perda por mês, meta ${META}%`);
  };
  UI.redraw();
}

/* ---------- estoque ---------- */
function vEstoque(root){
  root.innerHTML=head('Estoque','Saldo atual de chapas e materiais elétricos, a custo médio.','<button type="button" class="btn primary" data-act="novo-material">Novo material</button>')+
  `<div class="filters">${seg('ecat',[['all','Todos'],['chapa','Chapa'],['eletrico','Elétrico']],UI.ecat)}<div class="f search"><label class="sr" for="eq">Buscar material</label><input id="eq" type="search" placeholder="Buscar por código ou nome" value="${esc(UI.eq)}"></div></div><section class="card" id="est-body"></section>`;
  const upd=()=>{
    const q=UI.eq.trim().toLowerCase();
    const list=S.materiais.filter(m=>inCat(m,UI.ecat)&&(!q||(m.codigo+' '+m.nome).toLowerCase().includes(q))).sort(byCat);
    const tot=list.reduce((a,m)=>a+m.saldo*m.custo,0);
    $('#est-body').innerHTML=list.length?tableBlock('<th>Material</th><th>Categoria</th><th class="num">Saldo</th><th class="num">Mínimo</th><th class="num">Custo médio</th><th class="num">Valor em estoque</th><th>Situação</th><th></th>',
      list.map(m=>{const s=stockStatus(m);return `<tr><td><b>${esc(m.nome)}</b><div class="mono tm">${esc(m.codigo)}</div></td><td>${catChip(m.cat)}</td><td class="num">${qty(m.saldo,m.un)}</td><td class="num">${qty(m.minimo,m.un)}</td><td class="num">${brl(m.custo)}</td><td class="num">${brl(m.saldo*m.custo)}</td><td>${pill(s.k,s.t)}</td><td class="num"><button type="button" class="btn sm" data-act="entrada-mat" data-id="${m.id}">Entrada</button> <button type="button" class="btn sm" data-act="contagem" data-id="${m.id}">Contagem</button></td></tr>`;}).join(''),
      `<tfoot><tr><td colspan="5">Total em estoque</td><td class="num">${brl(tot)}</td><td colspan="2"></td></tr></tfoot>`):'<p class="empty">Nenhum material encontrado.</p>';
  };
  upd();$('#eq').addEventListener('input',e=>{UI.eq=e.target.value;upd();});
}
function openMaterial(){
  const m=openModal(`<h2>Novo material</h2><form id="f-mat" novalidate><div id="mm-err"></div><div class="fgrid">
    <div class="f"><label for="mm-cat">Categoria</label><select id="mm-cat"><option value="chapa">Chapa</option><option value="eletrico">Elétrico</option></select></div>
    <div class="f"><label for="mm-cod">Código</label><input id="mm-cod" placeholder="Ex.: CH-040"></div>
    <div class="f" style="grid-column:1/-1"><label for="mm-nome">Nome do material</label><input id="mm-nome" data-focus placeholder="Ex.: Chapa inox 1,5 mm"></div>
    <div class="f"><label for="mm-un">Unidade</label><select id="mm-un">${UNITS.map(u=>`<option>${u}</option>`).join('')}</select></div>
    <div class="f"><label for="mm-custo">Custo unitário (R$)</label><input id="mm-custo" inputmode="decimal" placeholder="0,00"></div>
    <div class="f"><label for="mm-min">Estoque mínimo</label><input id="mm-min" inputmode="decimal" placeholder="0"></div>
    <div class="f"><label for="mm-ini">Saldo inicial (opcional)</label><input id="mm-ini" inputmode="decimal" placeholder="0"></div>
    <div class="f" style="grid-column:1/-1"><label for="mm-resp">Responsável pelo cadastro</label><input id="mm-resp" list="dl-resp" autocomplete="off"></div></div>
    <div class="md-end"><button type="button" class="btn" data-close>Cancelar</button><button type="submit" class="btn primary">Cadastrar material</button></div></form>`,{label:'Novo material'});
  $('#mm-cat',m).addEventListener('change',e=>{$('#mm-un',m).value=e.target.value==='chapa'?'m²':'un';});
  $('#f-mat',m).addEventListener('submit',e=>{
    e.preventDefault();
    const v=id=>$('#'+id,m).value.trim(),err=[];
    const cat=v('mm-cat'),nome=v('mm-nome'),custo=parseNum(v('mm-custo')),min=parseNum(v('mm-min')),ini=parseNum(v('mm-ini')),resp=v('mm-resp');
    let cod=v('mm-cod').toUpperCase();
    if(!nome)err.push('Informe o nome do material.');
    if(isNaN(custo)||custo<=0)err.push('Informe o custo unitário, maior que zero.');
    if(isNaN(min)||min<0)err.push('O estoque mínimo precisa ser um número.');
    if(isNaN(ini)||ini<0)err.push('O saldo inicial precisa ser um número.');
    if(ini>0&&!resp)err.push('Informe o responsável para registrar o saldo inicial.');
    if(!cod){const pre=cat==='chapa'?'CH-':'EL-';let n=1;while(S.materiais.some(x=>x.codigo===pre+String(n).padStart(3,'0')))n++;cod=pre+String(n).padStart(3,'0');}
    if(S.materiais.some(x=>x.codigo===cod))err.push('Já existe um material com o código '+cod+'.');
    if(err.length){$('#mm-err',m).innerHTML=errBox(err);return;}
    const mat={id:'m'+uid(),codigo:cod,nome,cat,un:v('mm-un'),minimo:min,custo:r4(custo),saldo:0};
    S.materiais.push(mat);
    if(ini>0)commitEntrada({data:today(),nf:'Saldo inicial',forn:'—',resp},[{matId:mat.id,qtd:ini,custo}]);else save();
    closeModal();toast('Material '+cod+' cadastrado.');render();
  });
}
function openContagem(id){
  const mat=matById(id);if(!mat)return;
  const m=openModal(`<h2>Contagem física</h2><p class="sub" style="margin-bottom:12px">${esc(mat.codigo)} · ${esc(mat.nome)}</p><form id="f-cnt" novalidate><div id="cc-err"></div>
    <div class="facts"><div><span>Saldo no sistema</span><b>${qty(mat.saldo,mat.un)}</b></div><div><span>Custo médio</span><b>${brl(mat.custo)}</b></div></div>
    <div class="fgrid"><div class="f"><label for="cc-n">Quantidade contada (${esc(mat.un)})</label><input id="cc-n" data-focus inputmode="decimal"></div>
    <div class="f"><label>Divergência</label><output class="out" id="cc-d">—</output></div>
    <div class="f" style="grid-column:1/-1"><label for="cc-o">Observação</label><input id="cc-o" placeholder="Ex.: retalho descartado sem registro"></div>
    <div class="f" style="grid-column:1/-1"><label for="cc-r">Responsável pela contagem</label><input id="cc-r" list="dl-resp" autocomplete="off"></div></div>
    <div class="md-end"><button type="button" class="btn" data-close>Cancelar</button><button type="submit" class="btn primary">Registrar contagem</button></div></form>`,{label:'Contagem física'});
  $('#cc-n',m).addEventListener('input',()=>{const n=parseNum($('#cc-n',m).value);const o=$('#cc-d',m);if(isNaN(n)||$('#cc-n',m).value.trim()===''){o.textContent='—';return;}const d=r3(n-mat.saldo);o.textContent=d===0?'Confere':(d>0?'+':'−')+qty(Math.abs(d),mat.un)+' ('+brl(Math.abs(d)*mat.custo)+')';});
  $('#f-cnt',m).addEventListener('submit',e=>{
    e.preventDefault();
    const raw=$('#cc-n',m).value.trim(),n=parseNum(raw),resp=$('#cc-r',m).value.trim(),err=[];
    if(raw===''||isNaN(n)||n<0)err.push('Informe a quantidade contada.');
    if(!resp)err.push('Informe o responsável pela contagem.');
    if(err.length){$('#cc-err',m).innerHTML=errBox(err);return;}
    if(r3(n-mat.saldo)===0){closeModal();toast('Estoque confere com a contagem. Nenhum ajuste necessário.');return;}
    const d=commitAjuste(mat,n,resp,$('#cc-o',m).value.trim()||'Contagem física');
    closeModal();toast('Ajuste de '+(d>0?'+':'−')+qty(Math.abs(d),mat.un)+' registrado em '+mat.codigo+'.');render();
  });
}

/* ---------- entrada ---------- */
function newEnt(){return{data:today(),nf:'',forn:'',resp:'',lines:[{matId:'',qtd:'',custo:''}]};}
function entHint(l){
  const m=matById(l.matId);if(!m)return'Escolha o material para ver o saldo e o novo custo médio.';
  const q=parseNum(l.qtd),c=parseNum(l.custo);
  let s=`Saldo atual <b>${qty(m.saldo,m.un)}</b>`;
  if(q>0){s+=` → depois da entrada <b>${qty(m.saldo+q,m.un)}</b>`;if(c>0){const nc=m.saldo>0?(m.saldo*m.custo+q*c)/(m.saldo+q):c;s+=` · custo médio ${brl(m.custo)} → <b>${brl(nc)}</b>`;}}
  else s+=` · custo médio ${brl(m.custo)}`;
  return s;
}
function entLineHtml(l,i){
  const m=matById(l.matId);
  return `<div class="line ent" data-i="${i}"><div class="f f-mat"><label for="e-m${i}">Material</label><select id="e-m${i}" data-k="matId">${matOptions(l.matId)}</select></div>
  <div class="f"><label for="e-q${i}">Quantidade <span class="u">${m?esc(m.un):''}</span></label><input id="e-q${i}" data-k="qtd" inputmode="decimal" value="${esc(l.qtd)}"></div>
  <div class="f"><label for="e-c${i}">Valor unitário (R$)</label><input id="e-c${i}" data-k="custo" inputmode="decimal" value="${esc(l.custo)}"></div>
  <div class="f"><label>Subtotal</label><output class="out o-sub">—</output></div>
  <button type="button" class="btn sm ghost rm" data-rm aria-label="Remover item">Remover</button><p class="hint"></p></div>`;
}
function vEntrada(root){
  if(!D.ent)D.ent=newEnt();const d=D.ent;
  const rec=S.movimentos.filter(m=>m.tipo==='entrada').sort((a,b)=>a.data<b.data?1:a.data>b.data?-1:b.seq-a.seq).slice(0,6);
  root.innerHTML=head('Entrada de material','Registre chapas e materiais elétricos recebidos, com nota fiscal e responsável.')+
  `<div class="layout2"><section class="card"><form id="f-ent" novalidate><div id="e-err"></div>
    <div class="fgrid"><div class="f"><label for="e-data">Data de recebimento</label><input type="date" id="e-data" data-h="data" max="${today()}" value="${esc(d.data)}"></div>
    <div class="f"><label for="e-nf">Nota fiscal</label><input id="e-nf" data-h="nf" placeholder="Número da NF" value="${esc(d.nf)}"></div>
    <div class="f"><label for="e-forn">Fornecedor</label><input id="e-forn" data-h="forn" list="dl-forn" autocomplete="off" value="${esc(d.forn)}"></div>
    <div class="f"><label for="e-resp">Responsável pelo recebimento</label><input id="e-resp" data-h="resp" list="dl-resp" autocomplete="off" value="${esc(d.resp)}"></div></div>
    <h3 class="section-t">Itens da nota</h3><div class="lines" id="e-lines">${d.lines.map(entLineHtml).join('')}</div>
    <div class="form-end"><button type="button" class="btn" id="e-add">Adicionar item</button></div>
    <div class="totals"><div class="t"><span>Total da nota</span><b id="e-tot">R$ 0,00</b></div><button type="submit" class="btn primary">Registrar entrada</button></div></form></section>
    <section class="card"><h3>Últimas entradas</h3><div class="recent" style="margin-top:8px">${rec.map(m=>{const mt=matById(m.matId);return `<div class="r"><div><b>${esc(mt.nome)}</b><small>${fmtData(m.data)} · NF ${esc(m.nf||'—')} · ${esc(m.resp)}</small></div><div class="num" style="text-align:right;white-space:nowrap"><b>+${qty(m.delta,mt.un)}</b><small>${brl(m.delta*m.custo)}</small></div></div>`;}).join('')||'<p class="empty">Nenhuma entrada registrada.</p>'}</div></section></div>`;
  const form=$('#f-ent');
  const calc=()=>{
    let tot=0;
    $$('.line',form).forEach((el,i)=>{
      const l=d.lines[i],q=parseNum(l.qtd),c=parseNum(l.custo),sub=(q>0&&c>0)?q*c:0;tot+=sub;
      $('.o-sub',el).textContent=sub>0?brl(sub):'—';$('.hint',el).innerHTML=entHint(l);
      const m=matById(l.matId);$('.u',el).textContent=m?m.un:'';
    });
    $('#e-tot').textContent=brl(tot);
  };
  form.addEventListener('input',e=>{
    const t=e.target;
    if(t.dataset.h){d[t.dataset.h]=t.value;return;}
    const el=t.closest('.line');if(!el||!t.dataset.k)return;
    const l=d.lines[Number(el.dataset.i)];l[t.dataset.k]=t.value;
    if(t.dataset.k==='matId'&&!l.custo){const m=matById(l.matId);if(m){l.custo=String(r2(m.custo)).replace('.',',');$('[data-k="custo"]',el).value=l.custo;}}
    calc();
  });
  form.addEventListener('click',e=>{
    const rm=e.target.closest('[data-rm]');
    if(rm){const i=Number(rm.closest('.line').dataset.i);d.lines.splice(i,1);if(!d.lines.length)d.lines.push({matId:'',qtd:'',custo:''});$('#e-lines').innerHTML=d.lines.map(entLineHtml).join('');calc();}
  });
  $('#e-add').addEventListener('click',()=>{d.lines.push({matId:'',qtd:'',custo:''});$('#e-lines').innerHTML=d.lines.map(entLineHtml).join('');calc();});
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const err=[],ok=[];
    if(!d.data)err.push('Informe a data de recebimento.');else if(d.data>today())err.push('A data de recebimento não pode ser futura.');
    if(!d.nf.trim())err.push('Informe o número da nota fiscal.');
    if(!d.forn.trim())err.push('Informe o fornecedor.');
    if(!d.resp.trim())err.push('Informe o responsável pelo recebimento.');
    d.lines.forEach((l,i)=>{
      if(!l.matId&&!l.qtd&&!l.custo)return;
      const q=parseNum(l.qtd),c=parseNum(l.custo),n='Item '+(i+1)+': ';
      if(!l.matId)err.push(n+'escolha o material.');
      else if(isNaN(q)||q<=0)err.push(n+'informe a quantidade, maior que zero.');
      else if(isNaN(c)||c<=0)err.push(n+'informe o valor unitário, maior que zero.');
      else ok.push({matId:l.matId,qtd:q,custo:c});
    });
    if(!ok.length&&!err.length)err.push('Adicione pelo menos um item com material, quantidade e valor.');
    if(err.length){$('#e-err').innerHTML=errBox(err);$('#e-err').scrollIntoView({block:'nearest'});return;}
    commitEntrada({data:d.data,nf:d.nf.trim(),forn:d.forn.trim(),resp:d.resp.trim()},ok);
    const resp=d.resp;D.ent=newEnt();D.ent.resp=resp;
    toast('Entrada registrada: '+ok.length+(ok.length>1?' itens somados':' item somado')+' ao estoque.');render();
  });
  calc();
}

/* ---------- nova porta ---------- */
const newLine=matId=>({matId:matId||'',prev:'',usada:'',perda:'',motivo:''});
function newPorta(){
  const c=S.materiais.filter(m=>m.cat==='chapa').sort(byCat)[0],e=S.materiais.filter(m=>m.cat==='eletrico').sort(byCat)[0];
  return{numero:'',cliente:'',l:'',h:'',data:today(),resp:'',lines:[newLine(c&&c.id),newLine(e&&e.id)]};
}
function portaLineHtml(l,i){
  const m=matById(l.matId),u=m?esc(m.un):'';
  return `<div class="line pl" data-i="${i}"><div class="f f-mat"><label for="p-m${i}">Material</label><select id="p-m${i}" data-k="matId">${matOptions(l.matId)}</select></div>
  <div class="f"><label for="p-p${i}">Previsto <span class="u">${u}</span></label><input id="p-p${i}" data-k="prev" inputmode="decimal" value="${esc(l.prev)}"></div>
  <div class="f"><label for="p-u${i}">Utilizado <span class="u">${u}</span></label><input id="p-u${i}" data-k="usada" inputmode="decimal" value="${esc(l.usada)}"></div>
  <div class="f"><label for="p-d${i}">Perda <span class="u">${u}</span></label><input id="p-d${i}" data-k="perda" inputmode="decimal" value="${esc(l.perda)}"></div>
  <div class="f f-mot"><label for="p-o${i}">Motivo da perda</label><select id="p-o${i}" data-k="motivo"><option value="">—</option>${MOTIVOS.map(x=>`<option${x===l.motivo?' selected':''}>${esc(x)}</option>`).join('')}</select></div>
  <button type="button" class="btn sm ghost rm" data-rm aria-label="Remover material">Remover</button><p class="hint"></p></div>`;
}
function vPorta(root){
  if(!D.porta)D.porta=newPorta();const d=D.porta;
  root.innerHTML=head('Nova porta','Cadastre a porta e o que foi gasto nela. A baixa no estoque é automática ao salvar.','<button type="button" class="btn" id="p-demo">Preencher exemplo</button>')+
  `<section class="card"><form id="f-por" novalidate><div id="p-err"></div>
    <div class="fgrid c3"><div class="f"><label for="p-num">Ordem de produção</label><input id="p-num" data-h="numero" class="mono" placeholder="${esc(nextOP())}" value="${esc(d.numero)}"></div>
    <div class="f"><label for="p-cli">Cliente</label><input id="p-cli" data-h="cliente" list="dl-cli" autocomplete="off" value="${esc(d.cliente)}"></div>
    <div class="f"><label for="p-l">Largura (m)</label><input id="p-l" data-h="l" inputmode="decimal" value="${esc(d.l)}"></div>
    <div class="f"><label for="p-h">Altura (m)</label><input id="p-h" data-h="h" inputmode="decimal" value="${esc(d.h)}"></div>
    <div class="f"><label for="p-data">Data</label><input type="date" id="p-data" data-h="data" max="${today()}" value="${esc(d.data)}"></div></div>
    <h3 class="section-t">Material usado na porta</h3><div class="lines" id="p-lines">${d.lines.map(portaLineHtml).join('')}</div>
    <div class="form-end"><button type="button" class="btn" id="p-add">Adicionar material</button><span class="sub">Utilizado + perda = quantidade que sai do estoque. Sobra aproveitável fica no estoque.</span></div>
    <div class="totals"><div class="t"><span>Material utilizado</span><b id="t-u">R$ 0,00</b></div><div class="t"><span>Perda</span><b id="t-p">R$ 0,00</b></div><div class="t"><span>% de perda</span><b id="t-pc">—</b></div><div id="t-st"></div><button type="submit" class="btn primary">Salvar porta e dar baixa</button></div></form></section>`;
  const form=$('#f-por');
  const calc=()=>{
    const dem={};
    d.lines.forEach(l=>{if(!l.matId)return;const u=parseNum(l.usada),p=parseNum(l.perda);dem[l.matId]=(dem[l.matId]||0)+(isNaN(u)?0:u)+(isNaN(p)?0:p);});
    let cu=0,cp=0;
    $$('.line',form).forEach((el,i)=>{
      const l=d.lines[i],m=matById(l.matId),u=parseNum(l.usada),p=parseNum(l.perda),pv=parseNum(l.prev);
      const uu=isNaN(u)?0:u,pp=isNaN(p)?0:p;
      $$('.u',el).forEach(x=>{x.textContent=m?m.un:'';});
      const mot=$('[data-k="motivo"]',el);mot.disabled=!(pp>0);if(!(pp>0)&&l.motivo){l.motivo='';mot.value='';}
      let hint='Escolha o material. A baixa no estoque é automática ao salvar.',bad=false,warnT='';
      if(m){
        bad=(dem[m.id]||0)>m.saldo+1e-9;
        hint=`Saldo <b>${qty(m.saldo,m.un)}</b> · baixa <b>${qty(uu+pp,m.un)}</b> → fica <b>${qty(m.saldo-(dem[m.id]||0),m.un)}</b> · custo da baixa ${brl((uu+pp)*m.custo)}`;
        if(pv>0&&uu>0){const dv=uu-pv;hint+=` · desvio ${dv>=0?'+':'−'}${nf(Math.abs(dv),2)} ${m.un} frente ao previsto`;}
        cu+=uu*m.custo;cp+=pp*m.custo;
        if(bad)warnT=`Estoque insuficiente: faltam ${qty((dem[m.id]||0)-m.saldo,m.un)}. Registre uma entrada antes.`;
      }
      el.classList.toggle('bad',bad);
      $('.hint',el).innerHTML=hint;
      let w=$('.warnt',el);if(warnT){if(!w){w=document.createElement('p');w.className='warnt';el.appendChild(w);}w.textContent=warnT;}else if(w)w.remove();
    });
    const tot=cu+cp,pc=tot>0?cp/tot*100:0,s=lossStatus(pc);
    $('#t-u').textContent=brl(cu);$('#t-p').textContent=brl(cp);$('#t-pc').textContent=tot>0?pctTxt(pc):'—';$('#t-st').innerHTML=tot>0?pill(s.k,s.t):'';
  };
  const suggestPrev=l=>{const m=matById(l.matId),a=parseNum(d.l)*parseNum(d.h);if(m&&m.un==='m²'&&!l.prev&&a>0)l.prev=String(r2(a)).replace('.',',');};
  form.addEventListener('input',e=>{
    const t=e.target;
    if(t.dataset.h){d[t.dataset.h]=t.value;return;}
    const el=t.closest('.line');if(!el||!t.dataset.k)return;
    const l=d.lines[Number(el.dataset.i)];l[t.dataset.k]=t.value;
    if(t.dataset.k==='matId'){suggestPrev(l);$('[data-k="prev"]',el).value=l.prev;}
    calc();
  });
  form.addEventListener('click',e=>{
    const rm=e.target.closest('[data-rm]');
    if(rm){d.lines.splice(Number(rm.closest('.line').dataset.i),1);if(!d.lines.length)d.lines.push(newLine());$('#p-lines').innerHTML=d.lines.map(portaLineHtml).join('');calc();}
  });
  $('#p-add').addEventListener('click',()=>{d.lines.push(newLine());$('#p-lines').innerHTML=d.lines.map(portaLineHtml).join('');calc();});
  $('#p-demo').addEventListener('click',()=>{
    const f=c=>{const m=S.materiais.find(x=>x.codigo===c);return m?m.id:'';};
    const lines=[
      {matId:f('CH-012'),prev:'18',usada:'18,4',perda:'1,6',motivo:'Corte fora da medida'},
      {matId:f('CH-020'),prev:'3,2',usada:'3,2',perda:'',motivo:''},
      {matId:f('EL-001'),prev:'1',usada:'1',perda:'',motivo:''},
      {matId:f('EL-004'),prev:'2',usada:'2',perda:'1',motivo:'Defeito do material'},
      {matId:f('EL-007'),prev:'14',usada:'14,5',perda:'1',motivo:'Corte fora da medida'}
    ].filter(l=>{const m=matById(l.matId);return m&&m.saldo>=parseNum(l.usada)+parseNum(l.perda);});
    if(!lines.length){toast('Não há saldo para o exemplo. Registre uma entrada primeiro.');return;}
    D.porta={numero:'',cliente:'Frigorífico Oeste',l:'4',h:'4,5',data:today(),resp:d.resp||'Rafael Souza',lines};
    render();
  });
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const err=[],items=[],num=(d.numero.trim()||nextOP()).toUpperCase();
    if(S.ops.some(o=>o.numero.toUpperCase()===num))err.push('A ordem de produção '+num+' já existe.');
    if(!d.cliente.trim())err.push('Informe o cliente.');
    const L=parseNum(d.l),H=parseNum(d.h);
    if(isNaN(L)||L<=0||isNaN(H)||H<=0)err.push('Informe a largura e a altura da porta, em metros.');
    if(!d.data)err.push('Informe a data.');else if(d.data>today())err.push('A data não pode ser futura.');
    if(!d.resp.trim())err.push('Informe o responsável pela retirada.');
    const dem={};
    d.lines.forEach((l,i)=>{
      if(!l.matId&&!l.usada&&!l.perda&&!l.prev)return;
      const n='Material '+(i+1)+': ',u=parseNum(l.usada),p=parseNum(l.perda),pv=parseNum(l.prev);
      if(!l.matId){err.push(n+'escolha o material.');return;}
      if(isNaN(u)||isNaN(p)||isNaN(pv)||u<0||p<0||pv<0){err.push(n+'use apenas números nas quantidades.');return;}
      if(u+p<=0){err.push(n+'informe a quantidade utilizada ou a perda.');return;}
      if(p>0&&!l.motivo){err.push(n+'informe o motivo da perda.');return;}
      dem[l.matId]=(dem[l.matId]||0)+u+p;
      items.push({matId:l.matId,prev:pv,usada:u,perda:p,motivo:p>0?l.motivo:''});
    });
    if(!items.length&&!err.length)err.push('Adicione pelo menos um material com a quantidade utilizada.');
    Object.keys(dem).forEach(id=>{const m=matById(id);if(dem[id]>m.saldo+1e-9)err.push('Estoque insuficiente de '+m.nome+': saldo '+qty(m.saldo,m.un)+', necessário '+qty(dem[id],m.un)+'.');});
    if(err.length){$('#p-err').innerHTML=errBox(err);$('#p-err').scrollIntoView({block:'nearest'});return;}
    const op=commitPorta({numero:num,cliente:d.cliente.trim(),l:L,h:H,data:d.data,resp:d.resp.trim()},items);
    const resp=d.resp;D.porta=newPorta();D.porta.resp=resp;
    toast('Porta '+op.numero+' salva. Baixa feita em '+items.length+(items.length>1?' materiais.':' material.'));render();
  });
  calc();
}

/* ---------- histórico ---------- */
function openOp(id){
  const o=S.ops.find(x=>x.id===id);if(!o)return;
  const s=opStats(o,'all'),q=lossStatus(s.pct);
  openModal(`<h2>${esc(o.numero)} · ${esc(o.cliente)}</h2>
  <div class="facts"><div><span>Medidas</span><b>${nf(o.largura)} × ${nf(o.altura)} m</b></div><div><span>Data</span><b>${fmtData(o.data)}</b></div><div><span>Responsável</span><b>${esc(o.resp)}</b></div><div><span>Material consumido</span><b>${brl(s.cons)}</b></div><div><span>Perda</span><b>${brl(s.perda)} (${pctTxt(s.pct)})</b></div><div><span>Situação</span>${pill(q.k,q.t)}</div></div>
  ${tableBlock('<th>Material</th><th class="num">Previsto</th><th class="num">Utilizado</th><th class="num">Perda</th><th class="num">Perda (R$)</th><th>Motivo</th>',o.itens.map(i=>{const m=matById(i.matId);return `<tr><td><b>${esc(m.nome)}</b><div class="mono tm">${esc(m.codigo)}</div></td><td class="num">${i.prevista>0?qty(i.prevista,m.un):'—'}</td><td class="num">${qty(i.usada,m.un)}</td><td class="num">${i.perda>0?qty(i.perda,m.un):'—'}</td><td class="num">${i.perda>0?brl(i.perda*i.custo):'—'}</td><td>${esc(i.motivo||'—')}</td></tr>`;}).join(''))}
  <div class="md-end"><button type="button" class="btn primary" data-close data-focus>Fechar</button></div>`,{wide:true,label:'Detalhe da porta '+o.numero});
}
function vHistorico(root){
  root.innerHTML=head('Histórico','Todas as entradas, saídas e ajustes, com responsável e documento.')+
  `<div class="filters">${seg('htab',[['mov','Movimentações'],['portas','Portas produzidas']],UI.htab)}</div><div class="filters" id="h-f"></div><section class="card" id="h-body"></section>`;
  const mov=UI.htab==='mov';
  $('#h-f').innerHTML=(mov?`${seg('htipo',[['all','Todas'],['entrada','Entradas'],['saida','Saídas'],['ajuste','Ajustes']],UI.htipo)}<div class="f"><label class="sr" for="hmat">Material</label><select id="hmat"><option value="all">Todos os materiais</option>${S.materiais.slice().sort(byCat).map(m=>`<option value="${m.id}"${UI.hmat===m.id?' selected':''}>${esc(m.codigo)} · ${esc(m.nome)}</option>`).join('')}</select></div>`:'')+
    `<div class="f search"><label class="sr" for="hq">Buscar</label><input id="hq" type="search" placeholder="${mov?'Buscar por OP, NF, responsável ou observação':'Buscar por OP, cliente ou responsável'}" value="${esc(UI.hq)}"></div>`;
  const upd=()=>{
    const q=UI.hq.trim().toLowerCase(),body=$('#h-body');
    if(mov){
      let list=S.movimentos.slice().sort((a,b)=>a.data<b.data?1:a.data>b.data?-1:b.seq-a.seq);
      if(UI.htipo!=='all')list=list.filter(m=>m.tipo===UI.htipo);
      if(UI.hmat!=='all')list=list.filter(m=>m.matId===UI.hmat);
      if(q)list=list.filter(m=>{const mt=matById(m.matId);return[m.op,m.nf,m.resp,m.forn,m.obs,mt.nome,mt.codigo].join(' ').toLowerCase().includes(q);});
      const shown=list.slice(0,UI.hn);
      body.innerHTML=shown.length?tableBlock('<th>Data</th><th>Tipo</th><th>Material</th><th class="num">Quantidade</th><th class="num">Valor</th><th>Documento</th><th>Responsável</th><th>Detalhe</th>',shown.map(m=>{
        const mt=matById(m.matId),k=m.tipo==='entrada'?'in':m.tipo==='saida'?'out':'adj',t=m.tipo==='entrada'?'Entrada':m.tipo==='saida'?'Saída':'Ajuste';
        const doc=m.tipo==='saida'?`<span class="mono">${esc(m.op)}</span>`:m.tipo==='entrada'?`NF ${esc(m.nf||'—')}`:'Contagem';
        const det=m.tipo==='saida'?`usado ${qty(m.usada,mt.un)}${m.perda>0?` · perda ${qty(m.perda,mt.un)} (${brl(m.perda*m.custo)}) · ${esc(m.motivo)}`:''}`:m.tipo==='entrada'?esc(m.forn||''):esc(m.obs||'');
        return `<tr><td class="num">${fmtData(m.data)}</td><td>${pill(k,t)}</td><td><b>${esc(mt.nome)}</b><div class="mono tm">${esc(mt.codigo)}</div></td><td class="num">${m.delta>0?'+':'−'}${qty(Math.abs(m.delta),mt.un)}</td><td class="num">${brl(Math.abs(m.delta)*m.custo)}</td><td>${doc}</td><td>${esc(m.resp)}</td><td class="tm">${det}</td></tr>`;}).join(''))+
        (list.length>shown.length?`<div class="form-end"><span class="sub">Mostrando ${shown.length} de ${list.length}</span><button type="button" class="btn" data-act="mais">Mostrar mais</button></div>`:`<p class="sub" style="margin-top:10px">${list.length} ${list.length>1?'movimentações':'movimentação'}</p>`):'<p class="empty">Nenhuma movimentação com esses filtros.</p>';
    }else{
      let list=S.ops.slice().sort((a,b)=>a.data<b.data?1:a.data>b.data?-1:b.numero.localeCompare(a.numero));
      if(q)list=list.filter(o=>[o.numero,o.cliente,o.resp].join(' ').toLowerCase().includes(q));
      const shown=list.slice(0,UI.hn);
      body.innerHTML=shown.length?tableBlock('<th>OP</th><th>Cliente</th><th class="num">Medidas</th><th class="num">Data</th><th>Responsável</th><th class="num">Consumo</th><th class="num">Perda</th><th class="num">% perda</th><th>Situação</th>',shown.map(o=>{const s=opStats(o,'all'),qq=lossStatus(s.pct);return `<tr><td><button type="button" class="olink" data-op="${o.id}">${esc(o.numero)}</button></td><td>${esc(o.cliente)}</td><td class="num">${nf(o.largura)} × ${nf(o.altura)} m</td><td class="num">${fmtData(o.data)}</td><td>${esc(o.resp)}</td><td class="num">${brl(s.cons)}</td><td class="num">${brl(s.perda)}</td><td class="num"><span class="meter" aria-hidden="true"><i style="width:${Math.min(100,s.pct/15*100)}%;background:var(--${qq.k})"></i></span>${pctTxt(s.pct)}</td><td>${pill(qq.k,qq.t)}</td></tr>`;}).join(''))+
        (list.length>shown.length?`<div class="form-end"><span class="sub">Mostrando ${shown.length} de ${list.length}</span><button type="button" class="btn" data-act="mais">Mostrar mais</button></div>`:''):'<p class="empty">Nenhuma porta encontrada.</p>';
    }
  };
  upd();
  $('#hq').addEventListener('input',e=>{UI.hq=e.target.value;UI.hn=40;upd();});
  const hm=$('#hmat');if(hm)hm.addEventListener('change',e=>{UI.hmat=e.target.value;UI.hn=40;upd();});
}

/* ---------- backup e reinício ---------- */
function openBackup(){
  const json=JSON.stringify(S);
  const m=openModal(`<h2>Backup dos dados</h2><p class="sub" style="margin-bottom:12px">Os dados ficam salvos só neste navegador. Copie o texto abaixo e guarde em um arquivo para não perder nada.</p>
  <div class="f"><label for="bk-out">Dados atuais</label><textarea id="bk-out" readonly rows="4">${esc(json)}</textarea></div>
  <div class="md-end" style="margin-top:8px"><button type="button" class="btn" id="bk-copy">Copiar dados</button></div><hr>
  <div class="f"><label for="bk-in">Restaurar a partir de um backup</label><textarea id="bk-in" rows="4" placeholder="Cole aqui os dados copiados"></textarea></div><div id="bk-err"></div>
  <div class="md-end"><button type="button" class="btn" data-close>Fechar</button><button type="button" class="btn primary" id="bk-rest">Restaurar</button></div>`,{label:'Backup dos dados'});
  $('#bk-copy',m).addEventListener('click',()=>{
    const fb=()=>{const t=$('#bk-out',m);t.focus();t.select();toast('Texto selecionado. Use Ctrl+C para copiar.');};
    try{navigator.clipboard.writeText(json).then(()=>toast('Dados copiados.'),fb);}catch(e){fb();}
  });
  $('#bk-rest',m).addEventListener('click',()=>{
    try{const d=JSON.parse($('#bk-in',m).value);if(!(d&&Array.isArray(d.materiais)&&Array.isArray(d.movimentos)&&Array.isArray(d.ops)))throw 0;S=d;save();closeModal();toast('Backup restaurado.');render();}
    catch(e){$('#bk-err',m).innerHTML=errBox(['O texto colado não é um backup válido.']);}
  });
}
function confirmReset(kind){
  const zero=kind==='zerar';
  const m=openModal(`<h2>${zero?'Começar do zero?':'Recarregar dados de exemplo?'}</h2><p style="margin-bottom:6px">${zero?'Isso apaga as movimentações e as portas de exemplo. O cadastro de materiais continua, com saldo zerado.':'Isso apaga tudo o que foi registrado e volta aos dados de exemplo.'}</p><p class="sub">Se quiser guardar os dados atuais, faça o backup antes.</p>
  <div class="md-end"><button type="button" class="btn" data-close data-focus>Cancelar</button><button type="button" class="btn primary" id="rs-ok">${zero?'Apagar e começar':'Recarregar exemplo'}</button></div>`,{label:'Confirmação'});
  $('#rs-ok',m).addEventListener('click',()=>{
    if(zero){S.materiais.forEach(x=>{x.saldo=0;});S.movimentos=[];S.ops=[];S.seq=0;S.demo=false;}else{S=seed();}
    D.ent=null;D.porta=null;save();closeModal();toast(zero?'Pronto. Registre a primeira entrada.':'Dados de exemplo carregados.');render();
  });
}

/* ---------- navegação ---------- */
const VIEWS={painel:vPainel,estoque:vEstoque,entrada:vEntrada,porta:vPorta,historico:vHistorico};
const routeName=()=>{const h=(location.hash||'').replace('#','');return VIEWS[h]?h:'painel';};
function render(){
  const r=routeName();hideTip();UI.redraw=null;
  $$('#nav a').forEach(a=>{const on=a.dataset.r===r;a.classList.toggle('on',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  refreshLists();renderFoot();VIEWS[r]($('#view'));
}
const ACT={
  'novo-material':openMaterial,
  'contagem':a=>openContagem(a.id),
  'entrada-mat':a=>{if(!D.ent)D.ent=newEnt();const l=D.ent.lines[0];if(l.matId&&l.matId!==a.id)D.ent.lines.push({matId:a.id,qtd:'',custo:''});else l.matId=a.id;if(location.hash==='#entrada')render();else location.hash='entrada';},
  'mais':()=>{UI.hn+=40;render();},
  'backup':openBackup,
  'zerar':()=>confirmReset('zerar'),
  'exemplo':()=>confirmReset('exemplo'),
  'ver-portas':()=>{UI.htab='portas';}
};
document.addEventListener('click',e=>{
  const sg=e.target.closest('[data-seg]');
  if(sg){UI[sg.dataset.seg]=sg.dataset.v;if(sg.dataset.seg==='htab'||sg.dataset.seg==='htipo')UI.hn=40;render();return;}
  const tg=e.target.closest('[data-toggle]');
  if(tg){const id=tg.dataset.toggle,on=tg.getAttribute('aria-pressed')!=='true';tg.setAttribute('aria-pressed',String(on));tg.textContent=on?'Ver gráfico':'Ver tabela';$('#v-'+id).hidden=on;$('#t-'+id).hidden=!on;if(!on&&UI.redraw)UI.redraw();return;}
  const op=e.target.closest('[data-op]');
  if(op){openOp(op.dataset.op);return;}
  const ac=e.target.closest('[data-act]');
  if(ac&&ACT[ac.dataset.act]){ACT[ac.dataset.act](ac.dataset);}
});
window.addEventListener('hashchange',render);
let lastW=0;
if(window.ResizeObserver){new ResizeObserver(()=>{const w=$('#view').clientWidth;if(w!==lastW){lastW=w;if(UI.redraw)UI.redraw();}}).observe($('#view'));}
render();
})();
