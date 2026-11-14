// 상태·해금 규칙·화면 렌더링·데모 시뮬레이션·로컬 저장.
const $=id=>document.getElementById(id), KEY='moa-road-pleos-demo-v1';
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const qById=id=>QUESTS.find(q=>q.id===id), dById=id=>DISTRICTS.find(d=>d.id===id);
const blank=()=>({done:{},claimed:[],equipped:{outfit:null,tool:null,master:null,badge:null},favorites:[],route:[],active:null,detour:20});
let state=blank(), timer=null, toastTimer=null, selected=null, theme='all', pageSize=24, currentTab='explore', modalQuest=null;
const count=(t=null)=>Object.keys(state.done).filter(id=>!t||qById(id).theme===t).length;
const xp=()=>Object.keys(state.done).reduce((n,id)=>n+qById(id).xp,0);
const level=()=>Math.floor(xp()/500)+1;
const districtsDone=(t=null)=>new Set(Object.keys(state.done).filter(id=>!t||qById(id).theme===t).map(id=>qById(id).district)).size;
const districtCount=id=>Object.keys(state.done).filter(q=>qById(q).district===id).length;
const has=id=>state.claimed.includes(id);
const features=[
 {id:'pouch',icon:'🎒',name:'여행 포켓',need:3,kind:'count',parent:null,description:'즐겨찾기 용량 3 → 12곳',effect:'favorite'},
 {id:'planner',icon:'🗺️',name:'코스 플래너',need:2,kind:'district',parent:'pouch',description:'코스 보드 1 → 3곳 · 순서 편집',effect:'route'},
 {id:'journal',icon:'📔',name:'탐험 노트',need:6,kind:'count',parent:'pouch',description:'기록 메모 120 → 500자 · 완료 기록 편집',effect:'note'},
 {id:'atlas',icon:'🧭',name:'서울 아틀라스',need:8,kind:'district',parent:'planner',description:'코스 보드 3 → 5곳 · 즐겨찾기 12 → 30곳',effect:'route'},
 {id:'analytics',icon:'📊',name:'취향 리포트',need:5,kind:'themes',parent:'journal',description:'기록 화면에 테마별 완료 분포 열기',effect:'stats'},
 {id:'crown',icon:'👑',name:'서울 마스터',need:25,kind:'masterDistrict',parent:'atlas',description:'모아의 황금 비콘과 서울 마스터 칭호',effect:'cosmetic'}
];
function featureValue(f){return f.kind==='count'?count():f.kind==='district'?districtsDone():f.kind==='themes'?Object.keys(THEMES).filter(t=>count(t)>0).length:DISTRICTS.filter(d=>districtCount(d.id)===6).length}
function featureLabel(f){return f.kind==='count'?'퀘스트':f.kind==='district'?'서로 다른 구':f.kind==='themes'?'서로 다른 테마':'6개 완성한 구'}
function itemRequirement(id){
 const f=features.find(f=>f.id===id);if(f)return {ok:featureValue(f)>=f.need&&(!f.parent||has(f.parent)),pct:Math.min(100,featureValue(f)/f.need*100),text:`${featureLabel(f)} ${featureValue(f)} / ${f.need}${f.parent?' · 선행: '+features.find(x=>x.id===f.parent).name:''}`};
 if(id.startsWith('badge-')){const d=dById(id.slice(6));return {ok:!!d&&districtCount(d.id)===6,pct:d?districtCount(d.id)/6*100:0,text:d?`${d.name} ${districtCount(d.id)} / 6`:''}}
 const [t,rank]=id.split('-');if(!THEMES[t])return {ok:false,pct:0,text:'알 수 없는 아이템'};
 const n=count(t);if(rank==='outfit')return {ok:n>=1,pct:Math.min(100,n*100),text:`${THEMES[t].name} 완료 ${n} / 1`};
 if(rank==='tool')return {ok:n>=3&&has(t+'-outfit')&&level()>=2,pct:Math.min(100,n/3*100),text:`${THEMES[t].name} ${n} / 3 · Lv.${level()} / 2 · 선행 의상 보유`};
 if(rank==='master')return {ok:n>=5&&districtsDone(t)>=3&&has(t+'-tool'),pct:Math.min(100,n/5*100),text:`${THEMES[t].name} ${n} / 5 · ${districtsDone(t)} / 3개 구 · 선행 장비 보유`};
 return {ok:false,pct:0,text:''};
}
const itemIds=[...features.map(f=>f.id),...Object.keys(THEMES).flatMap(t=>['outfit','tool','master'].map(r=>t+'-'+r)),...DISTRICTS.map(d=>'badge-'+d.id)];
const caps=()=>({favorites:has('atlas')?30:has('pouch')?12:3,route:has('atlas')?5:has('planner')?3:1,note:has('journal')?500:120});
function normalize(input){
 const s=blank();if(!input||typeof input!=='object')return s;
 if(input.done&&typeof input.done==='object'&&!Array.isArray(input.done))for(const [id,rec] of Object.entries(input.done))if(qById(id)&&rec&&typeof rec==='object')s.done[id]={at:typeof rec.at==='string'&&!Number.isNaN(Date.parse(rec.at))?rec.at:new Date().toISOString(),note:typeof rec.note==='string'?rec.note.slice(0,500):'',proof:'simulation'};
 const previous=state;state=s;
 const requests=Array.isArray(input.claimed)?input.claimed.filter(x=>itemIds.includes(x)):[];
 for(let k=0;k<5;k++)for(const id of requests)if(!s.claimed.includes(id)&&itemRequirement(id).ok)s.claimed.push(id);
 if(input.equipped&&typeof input.equipped==='object')for(const slot of ['outfit','tool','master','badge']){const id=input.equipped[slot];if(typeof id==='string'&&s.claimed.includes(id)&&(slot==='badge'?id.startsWith('badge-'):id.endsWith('-'+slot)))s.equipped[slot]=id;}
 s.favorites=[...new Set(Array.isArray(input.favorites)?input.favorites:[])].filter(id=>qById(id)).slice(0,caps().favorites);
 s.route=[...new Set(Array.isArray(input.route)?input.route:[])].filter(id=>qById(id)).slice(0,caps().route);
 s.detour=[5,10,15,20].includes(input.detour)?input.detour:20;
 const a=input.active;if(a&&qById(a.id)&&!s.done[a.id]&&['accepted','driving','arrived','activity'].includes(a.phase)){
  s.active={id:a.id,phase:a.phase==='driving'?'accepted':a.phase,ticks:0,dwell:0,checks:[false,false,false],note:typeof a.note==='string'?a.note.slice(0,caps().note):'',safe:false,signals:{distance:40,accuracy:15,speed:0,gear:'P',brake:true,legal:false}};
 }
 state=previous;return s;
}
try {
 const stored = localStorage.getItem(KEY);
 if (stored) state = normalize(JSON.parse(stored));
} catch (error) {
 $('storageAlert').textContent = '저장된 기록을 읽지 못해 새 데모를 시작합니다.';
}
function save() {
 try {
  localStorage.setItem(KEY, JSON.stringify(state));
  $('saveStatus').textContent = '● 로컬 자동 저장';
 } catch (error) {
  $('saveStatus').textContent = '저장 실패';
  $('storageAlert').textContent = '앱 저장 공간을 사용할 수 없습니다.';
 }
}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500)}
function showTab(id){if(!['explore','quests','closet','journey','guide'].includes(id))return;currentTab=id;document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('nav [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));render();window.scrollTo({top:0,behavior:'smooth'})}
function gate(q){if(state.done[q.id])return '완료';if(q.tier===2&&!has(q.theme+'-tool'))return THEMES[q.theme].name+' 전문 장비 필요';if(q.detour>state.detour)return '추가 이동 여유 초과';return ''}
function mascotWear(){const t=state.equipped.outfit?.split('-')[0];return ({cafe:'coffee',food:'food',market:'food',art:'art',history:'art',park:'leaf',hike:'leaf',river:'water',basket:'food'})[t]||'basic'}
let mascotSerial=0;
function drawMascot(big=false){
 let svg=mascot(big),s=++mascotSerial;['moaBody','moaGlass','moaShadow'].forEach(id=>svg=svg.replaceAll(id,id+s));
 const t=state.equipped.outfit?.split('-')[0],tool=state.equipped.tool?.split('-')[0],master=state.equipped.master?.split('-')[0];
 let extra='';if(t){const c=THEMES[t].color;const shape=t==='food'||t==='cafe'?'<path d="M94 173 L94 197 Q120 206 146 197 L146 173 L134 180 L106 180Z"':t==='basket'?'<path d="M84 176 L96 168 L106 178 L134 178 L144 168 L156 176 L146 199 L94 199Z"':'<path d="M82 175 L102 173 L120 183 L138 173 L158 175 L150 197 Q120 209 90 197Z"';extra+=shape+` fill="${c}" stroke="white" stroke-width="2"/><text x="120" y="195" text-anchor="middle" font-size="15">${THEMES[t].emoji}</text>`;}
 if(tool)extra+=`<circle cx="190" cy="172" r="18" fill="white" stroke="${THEMES[tool].color}" stroke-width="3"/><text x="190" y="179" text-anchor="middle" font-size="21">${THEMES[tool].emoji}</text>`;
 if(master)extra+=`<g fill="${THEMES[master].color}"><path d="M30 65l4-10 4 10 10 4-10 4-4 10-4-10-10-4Z"/><path d="M205 50l3-8 3 8 8 3-8 3-3 8-3-8-8-3Z"/></g>`;
 if(has('crown'))extra+='<text x="120" y="29" text-anchor="middle" font-size="26">👑</text>';
 if(state.equipped.badge)extra+='<circle cx="65" cy="186" r="10" fill="#f2c66c" stroke="#fff" stroke-width="2"/><text x="65" y="190" text-anchor="middle" font-size="11">★</text>';
 return svg.replace('</svg>',extra+'</svg>');
}
function itemName(id){if(!id)return '기본';const f=features.find(f=>f.id===id);if(f)return f.name;if(id.startsWith('badge-'))return dById(id.slice(6)).name+' 배지';const [t,r]=id.split('-');return r==='outfit'?THEMES[t].outfit:r==='tool'?THEMES[t].name+' 전문 장비':THEMES[t].name+' 마스터 오라'}
function stat(icon,value,label){return `<div class="stat"><span class="icon">${icon}</span><div><strong>${value}</strong><small>${label}</small></div></div>`}
function render(){
 $('stats').innerHTML=stat('🗺️',districtsDone()+'<small> / 25</small>','발견한 동네')+stat('🚩',count()+'<small> / 150</small>','완료한 퀘스트')+stat('🎁',state.claimed.length+'<small> / 58</small>','해금한 아이템');
 $('detour').value=state.detour;$('level').textContent='Lv. '+level();$('xpText').textContent=(xp()%500)+' / 500 XP';$('xpBar').style.width=(xp()%500)/5+'%';$('sideMascot').innerHTML=drawMascot();$('bigMascot').innerHTML=drawMascot(true);
 $('equippedSummary').textContent=state.equipped.outfit?itemName(state.equipped.outfit):'기본 드라이브 스타일';
 $('districtTitle').textContent=selected?dById(selected).name+'의 작은 발견':'오늘의 작은 발견';
 drawMap();renderQuests();renderActive();renderCloset();renderJourney();save();
}
function project(lng,lat){return [40+(lng-126.76)/.44*740,590-(lat-37.425)/.285*550]}
function drawMap(){
 const colors=['#e4ebf4','#b7d8f5','#b7d8f5','#65a8e2','#65a8e2','#65a8e2','#2867ac'];
 let paths='',labels='';for(const f of GEO.features){const d=DISTRICTS.find(d=>d.name===f.properties.name);if(!d)continue;const coords=f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat();const path=coords.map(r=>'M'+r.map(p=>project(p[0],p[1]).map(x=>x.toFixed(1)).join(',')).join('L')+'Z').join(' ');const n=districtCount(d.id),[x,y]=project(d.lng,d.lat);paths+=`<path class="district ${selected===d.id?'selected':''}" d="${path}" fill="${colors[n]}" data-district="${d.id}" role="button" tabindex="0" aria-label="${d.name} ${n}개 완료, 퀘스트 보기"><title>${d.name} · ${n}/6 완료</title></path>`;labels+=`<text x="${x}" y="${y}" class="districtLabel">${d.name}</text>`;}
 let mark='';if(state.active){const q=qById(state.active.id),[x,y]=project(q.lng,q.lat);mark=`<g class="pinMark"><circle cx="${x}" cy="${y}" r="7" fill="#f6bc56" stroke="white" stroke-width="3"/><circle cx="${x}" cy="${y}" r="14" fill="none" stroke="#d5a142" stroke-dasharray="3 3"/></g>`;}
 $('map').innerHTML=paths+labels+mark;
 $('districtGrid').innerHTML=DISTRICTS.map(d=>`<button class="districtTile ${districtCount(d.id)===6?'master':''}" data-district="${d.id}">${d.name}<small>${districtCount(d.id)} / 6 ${districtCount(d.id)===6?'★':''}</small></button>`).join('');
}
function questCard(q){const t=THEMES[q.theme],why=gate(q),done=!!state.done[q.id];return `<article class="quest ${done?'done':''}"><div class="qtop"><div class="themeIcon" style="--tint:${t.color}18">${t.emoji}</div><div><span class="pill ${why&&!done?'lock':''}">${done?'✓ 완료':why?'🔒 '+(q.tier===2&&!has(q.theme+'-tool')?'심화 잠김':'시간 초과'):q.tier===2?'심화':'기본'}</span><button class="favorite ${state.favorites.includes(q.id)?'on':''}" data-favorite="${q.id}" aria-label="${q.place} 즐겨찾기" aria-pressed="${state.favorites.includes(q.id)}">${state.favorites.includes(q.id)?'★':'☆'}</button></div></div><div><div class="meta">${dById(q.district).name} · ${t.name}</div><h3>${q.title}</h3></div><div class="meta">활동 약 ${q.minutes}분 · 가상 추가 이동 +${q.detour}분</div><div class="qbottom"><span class="xp">✦ ${q.xp} XP</span><button data-detail="${q.id}" class="${why?'quiet':'primary'}">${done?'기록 보기':'미션 살펴보기 →'}</button></div></article>`}
function filtered(){const term=$('search').value.trim().toLowerCase(),d=$('districtFilter').value,status=$('statusFilter').value;let list=QUESTS.filter(q=>(!d||q.district===d)&&(theme==='all'||q.theme===theme)&&q.minutes<=Number($('timeFilter').value)&&(!term||[q.title,dById(q.district).name,THEMES[q.theme].name].join(' ').toLowerCase().includes(term))&&(status==='all'||status==='available'&&!gate(q)||status==='locked'&&gate(q)&&!state.done[q.id]||status==='done'&&state.done[q.id]||status==='favorite'&&state.favorites.includes(q.id)));if($('sort').value==='short')list.sort((a,b)=>a.minutes-b.minutes);else if($('sort').value==='xp')list.sort((a,b)=>b.xp-a.xp);else list.sort((a,b)=>Number(!!gate(a))-Number(!!gate(b)));return list}
function renderQuests(){
 $('themeChips').innerHTML=`<button class="chip ${theme==='all'?'active':''}" data-theme="all">전체 테마</button>`+Object.values(THEMES).map(t=>`<button class="chip ${theme===t.id?'active':''}" data-theme="${t.id}" aria-pressed="${theme===t.id}">${t.emoji} ${t.name}</button>`).join('');
 const list=filtered();$('resultCount').textContent=list.length+'개 퀘스트';$('questGrid').innerHTML=list.length?list.slice(0,pageSize).map(questCard).join(''):'<div class="empty">조건에 맞는 퀘스트가 없어요.<br>필터나 추가 이동 여유를 조정해 보세요.</div>';$('more').hidden=list.length<=pageSize;
 let featured=QUESTS.filter(q=>(!selected||q.district===selected));if(!selected)featured=featured.filter(q=>!gate(q));$('featured').innerHTML=featured.slice(0,selected?6:4).map(questCard).join('')||'<div class="empty">도전 가능한 퀘스트를 모두 모았어요. 차고에서 다음 장비를 해금해 보세요.</div>';
}
function selectDistrict(id){selected=id;$('districtFilter').value=id;pageSize=24;showTab('explore');$('districtTitle').scrollIntoView({behavior:'smooth',block:'center'})}
function openDetail(id){const q=qById(id);if(!q)return;modalQuest=id;const t=THEMES[q.theme],why=gate(q),rec=state.done[id],next=count(q.theme)<1?t.outfit:count(q.theme)<3?t.name+' 전문 장비':t.name+' 마스터 오라';$('detailBody').innerHTML=`<div class="detailHeader"><div><span class="eyebrow">${dById(q.district).name} / ${t.name} / ${q.tier===2?'심화':'기본'}</span><h2>${t.emoji} ${q.title}</h2></div><button data-close="detail" aria-label="상세 닫기">✕</button></div><div class="chips below"><span class="pill">${q.xp} XP · 최초 1회</span><span class="pill">활동 약 ${q.minutes}분</span><span class="pill">가상 우회 +${q.detour}분</span></div><div class="detailBlock"><h3>이번 동네에서 할 일</h3><ol>${t.tasks.map(s=>'<li>'+s+'</li>').join('')}</ol><p>${q.tier===2?'심화 퀘스트는 같은 테마의 기본 3개와 Lv.2, 선행 의상·전문 장비 해금이 필요합니다.':'기본 퀘스트는 처음부터 선택할 수 있습니다. 활동을 직접 확인한 뒤 완료합니다.'}</p></div><div class="note below">다음 성장 목표: <b>${next}</b><br>상세 조건과 해금 버튼은 ‘모아의 차고’에서 확인하세요.</div><div class="detailBlock"><h3>장소 데이터</h3><p>유형: ${['food','cafe'].includes(q.theme)?'거리·동네 내 자율 선택':'장소 주변 탐험'}<br>대표점: ${q.lat.toFixed(4)}, ${q.lng.toFixed(4)} · 개략 좌표<br>확인 수준: ${q.verified?'서울시 농구장 목록에서 존재 확인 · 상세 좌표·운영 미검증':'편집 후보 · 개별 운영·주소·좌표 현장 검증 전'}<br>주차: 별도 확인 필요 · 이 대표점은 주차 위치가 아닙니다.</p></div><div class="safetyBox below"><b>먼저 안전한 방문 계획</b><br>${q.theme==='hike'?'등산로 통제·기상·일몰을 확인하고, 정상 도달을 목표로 무리하지 마세요.':q.theme==='river'||q.theme==='basket'?'기상·침수·시설 통제와 예약 조건을 먼저 확인하세요.':'운영·예약·촬영 규정을 확인하고 주민과 이용객의 통행을 방해하지 마세요.'} 주차 후 도보로 이동하세요. 구매·음식 섭취는 완료의 필수 조건이 아닙니다.</div>${rec?`<div class="note below">데모 완료 · ${new Date(rec.at).toLocaleDateString('ko-KR')}<p>${escapeHTML(rec.note)||'메모 없음'}</p></div>`:''}<div class="actions below"><button class="primary" data-accept="${id}" ${why||state.active?'disabled':''}>${rec?'완료한 퀘스트':state.active?'다른 탐험 진행 중':why||'이 퀘스트 시작'}</button><button data-route="${id}" class="quiet">${state.route.includes(id)?'코스에서 빼기':'코스에 담기'}</button>${q.tier===2&&!has(q.theme+'-tool')?'<button data-gocloset="1" class="quiet">해금 트리 보기</button>':''}</div>`;if(!$('detail').open)$('detail').showModal()}
function claim(id){if(!itemIds.includes(id)||has(id))return;if(!itemRequirement(id).ok)return toast('아직 해금 조건을 충족하지 않았어요.');state.claimed.push(id);render();toast(itemName(id)+' 사용 제한이 풀렸어요!')}
function equip(id){if(!has(id))return;const slot=id.startsWith('badge-')?'badge':id.split('-')[1];if(!['outfit','tool','master','badge'].includes(slot))return;state.equipped[slot]=state.equipped[slot]===id?null:id;render();toast('모아의 스타일을 저장했어요.')}
function node(id,icon,title,description,slot=null){const r=itemRequirement(id),owned=has(id),wear=slot&&state.equipped[slot]===id;return `<div class="node ${owned?'owned':r.ok?'ready':''}"><div class="row"><span class="nodeIcon">${icon}</span><span class="pill">${wear?'착용 중':owned?'보유':r.ok?'해금 가능':'잠김'}</span></div><h4>${title}</h4><p>${description}</p><div class="condition">${r.text}</div><div class="progress"><i style="width:${r.pct}%"></i></div>${owned?(slot?`<button data-equip="${id}">${wear?'벗기':'착용하기'}</button>`:'<button disabled>기능 활성화됨</button>'):`<button data-claim="${id}" ${r.ok?'class="primary"':'disabled'}>${r.ok?'사용 제한 해제':'조건을 채워 주세요'}</button>`}</div>`}
function renderCloset(){
 $('featureTree').innerHTML=features.map(f=>node(f.id,f.icon,f.name,f.description)).join('');
 $('themeTree').innerHTML=Object.values(THEMES).map(t=>`<section class="treeRow"><div class="sectionTitle"><h3>${t.emoji} ${t.name} 성장 경로</h3><small>${count(t.id)}개 완료 · ${districtsDone(t.id)}개 구</small></div><div class="treeNodes">${node(t.id+'-outfit',t.emoji,'01 · '+t.outfit,'모아의 의상과 헬멧 색상을 바꾸는 첫 수집품.','outfit')}${node(t.id+'-tool','🎒','02 · '+t.name+' 전문 장비','이 테마의 심화 퀘스트 선택 제한 해제. 보유 시 적용되며 착용은 선택.','tool')}${node(t.id+'-master','✨','03 · '+t.name+' 마스터 오라','모아 주변에 테마 색 반짝임을 더하는 마스터 꾸미기.','master')}</div></section>`).join('');
 $('equipped').innerHTML=['outfit','tool','master','badge'].map(s=>`<span class="pill">${({outfit:'의상',tool:'장비',master:'오라',badge:'배지'})[s]} · ${itemName(state.equipped[s])}</span>`).join('');
 $('badges').innerHTML=DISTRICTS.map(d=>{const id='badge-'+d.id,r=itemRequirement(id);return `<button class="districtTile ${has(id)?'master':''}" data-${has(id)?'equip':'claim'}="${id}" ${has(id)||r.ok?'':'disabled'}>${has(id)?'🏅':r.ok?'🎁':'🔒'} ${d.name}<small>${state.equipped.badge===id?'착용 중':has(id)?'착용 가능':r.ok?'배지 해금':districtCount(d.id)+'/6 완료'}</small></button>`}).join('');
}
function toggleFavorite(id){if(state.favorites.includes(id))state.favorites=state.favorites.filter(x=>x!==id);else{if(state.favorites.length>=caps().favorites)return toast(`즐겨찾기는 ${caps().favorites}곳까지예요. 차고의 여행 포켓 / 아틀라스를 해금해 주세요.`);state.favorites.push(id)}render()}
function toggleRoute(id){if(state.route.includes(id))state.route=state.route.filter(x=>x!==id);else{if(state.route.length>=caps().route)return toast(`현재 코스는 ${caps().route}곳까지예요. 코스 플래너 / 아틀라스를 해금해 주세요.`);state.route.push(id)}render();if($('detail').open)openDetail(id);toast('코스 보드를 저장했어요.')}
function renderJourney(){
 $('journeyStats').innerHTML=stat('✦',xp(),'누적 경험치')+stat('🧩',Math.round(count()/150*100)+'%','전체 탐험 완성도')+stat('🏅',DISTRICTS.filter(d=>districtCount(d.id)===6).length,'6개 완성한 구');
 if(has('analytics'))$('journeyStats').innerHTML+=`<div class="panel" style="grid-column:1/-1"><h3>나의 테마 분포</h3>${Object.values(THEMES).map(t=>`<div class="row fine"><span>${t.emoji} ${t.name}</span><span>${count(t.id)} / ${QUESTS.filter(q=>q.theme===t.id).length}</span></div><div class="progress" style="margin:5px 0 12px"><i style="width:${count(t.id)/QUESTS.filter(q=>q.theme===t.id).length*100}%"></i></div>`).join('')}</div>`;
 $('routeCapacity').textContent=state.route.length+' / '+caps().route+'곳';$('routeBoard').innerHTML=state.route.length?state.route.map((id,i)=>`<div class="routeItem"><b>${i+1}</b><span>${escapeHTML(qById(id).place)}<small> · ${dById(qById(id).district).name}</small></span><button data-detail="${id}">보기</button><button data-up="${id}" ${i===0||!has('planner')?'disabled':''} aria-label="${qById(id).place} 위로">↑</button><button data-route="${id}" aria-label="${qById(id).place} 코스에서 삭제">✕</button></div>`).join(''):'<p class="fine">상세 미션에서 ‘코스에 담기’를 눌러 첫 장소를 추가하세요.</p>';
 const ids=Object.keys(state.done).sort((a,b)=>Date.parse(state.done[b].at)-Date.parse(state.done[a].at));
 $('history').innerHTML=ids.length?ids.map(id=>{const q=qById(id),r=state.done[id];return `<div class="event"><div class="row"><b>${THEMES[q.theme].emoji} ${q.place}</b><span class="xp">+${q.xp} XP</span></div><small>${dById(q.district).name} · ${new Date(r.at).toLocaleString('ko-KR')} · 시뮬레이션</small><p>${escapeHTML(r.note)||'메모 없이 남긴 작은 발견'}</p><div class="actions below"><button data-detail="${id}" class="quiet">상세</button><button data-editnote="${id}" class="quiet" ${has('journal')?'':'disabled'}>${has('journal')?'메모 편집':'탐험 노트 해금 후 편집'}</button></div></div>`}).join(''):'<div class="empty">아직 기록이 없어요. 첫 퀘스트를 시작해 보세요.</div>';
}
function accept(id){const q=qById(id);if(!q||gate(q)||state.active)return;state.active={id,phase:'accepted',ticks:0,dwell:0,checks:[false,false,false],note:'',safe:false,signals:{distance:40,accuracy:15,speed:0,gear:'P',brake:true,legal:false}};$('detail').close();render();$('activePanel').scrollIntoView({behavior:'smooth',block:'center'});toast('퀘스트 준비 완료. 가상 이동을 시작하세요.');}
function stopTimer(){clearInterval(timer);timer=null}
function startDrive(){const a=state.active;if(!a||a.phase!=='accepted')return;stopTimer();a.phase='driving';a.ticks=0;$('detail').close();document.querySelector('header').inert=true;document.querySelector('.app').inert=true;$('driveOverlay').hidden=false;$('stopDrive').focus();updateDrive();timer=setInterval(()=>{a.ticks++;if(a.ticks>=10){stopTimer();a.phase='arrived';hideDrive();render();toast('가상 도착! 적법한 주차 조건을 확인해 주세요.')}else{updateDrive();save()}},600);save()}
function hideDrive(){$('driveOverlay').hidden=true;document.querySelector('header').inert=false;document.querySelector('.app').inert=false}
function updateDrive(){const a=state.active;$('driveProgress').style.width=a.ticks*10+'%';$('driveText').textContent=`가상 경로 ${a.ticks*10}% · 실제 길 안내가 아닙니다.`}
function stopDrive(){stopTimer();if(state.active){state.active.phase='accepted';state.active.ticks=0}hideDrive();render();toast('가상 이동을 중지했어요. 다시 시작할 수 있어요.')}
function validDwell(a){const s=a.signals;return s.distance<=100&&s.distance>=0&&s.accuracy<=30&&s.accuracy>=0&&s.speed===0&&s.gear==='P'&&s.brake&&s.legal}
function dwellTick(){const a=state.active;if(!a||a.phase!=='arrived'){stopTimer();return}if(!validDwell(a)){a.dwell=0;stopTimer();renderActive();save();toast('주차·위치 조건을 벗어나 연속 체류가 초기화됐어요.');return}a.dwell=Math.min(300,a.dwell+30);if(a.dwell>=300){stopTimer();a.phase='activity';render();toast('가상 주변 도착 조건 충족. 활동은 별도로 확인해 주세요.')}else{renderActive();save()}}
function autoDwell(){const a=state.active;if(!a||a.phase!=='arrived')return;if(timer){stopTimer();renderActive();return}if(!validDwell(a))return toast('합법 주차와 모든 가상 신호 조건을 먼저 확인해 주세요.');timer=setInterval(dwellTick,700);renderActive()}
function cancelActive(){if(!state.active)return;stopTimer();state.active=null;hideDrive();render();toast('탐험을 취소했어요. 완료 기록과 보상은 추가되지 않았어요.')}
function renderActive(){
 const a=state.active;const labels={accepted:'준비',driving:'가상 이동',arrived:'주차 판정',activity:'활동 확인'};$('phaseBadge').textContent=a?labels[a.phase]:'대기';
 if(!a){$('activeContent').innerHTML='<p class="fine">마음에 드는 퀘스트를 골라보세요.<br>모아가 함께 준비할게요.</p><button class="primary wide below" data-tab="quests">퀘스트 찾기 →</button>';return}
 const q=qById(a.id),t=THEMES[q.theme];let body=`<h3 class="activeTitle">${t.emoji} ${q.title}</h3><div class="steps"><span class="ok">선택</span><span class="${a.phase==='arrived'||a.phase==='activity'?'ok':''}">주변 도착</span><span class="${a.phase==='activity'?'ok':''}">활동 확인</span></div>`;
 if(a.phase==='accepted')body+='<p class="fine">10단계 가상 이동 후, 정차 5분을 시뮬레이션합니다. 실제 차량·GPS는 사용하지 않습니다.</p><button class="primary wide below" id="startDrive">가상 이동 시작</button>';
 if(a.phase==='arrived'){const s=a.signals;body+=`<div class="note">가상 신호로 판정 시험하기<br>1스텝 = 가상 30초 / 자동 0.7초 간격</div><div class="controls"><label>대표점과 거리 (m)<input id="signalDistance" type="number" min="0" max="10000" value="${s.distance}"></label><label>정확도 오차 (m)<input id="signalAccuracy" type="number" min="0" max="1000" value="${s.accuracy}"></label><label>속도 (km/h)<input id="signalSpeed" type="number" min="0" max="200" value="${s.speed}"></label><label>기어<select id="signalGear"><option ${s.gear==='P'?'selected':''}>P</option><option ${s.gear==='D'?'selected':''}>D</option></select></label></div><label class="check"><input type="checkbox" id="signalBrake" ${s.brake?'checked':''}>가상 주차브레이크 작동</label><label class="check"><input type="checkbox" id="signalLegal" ${s.legal?'checked':''}>가상 합법 주차 지점 확인</label><div class="row"><span class="meter">${Math.floor(a.dwell/60)}:${String(a.dwell%60).padStart(2,'0')} <small>/ 5:00</small></span><span class="pill">${validDwell(a)?'조건 충족':'조건 확인 필요'}</span></div><div class="progress below"><i style="width:${a.dwell/3}%"></i></div><div class="actions below"><button id="tick" class="quiet">+30초 판정</button><button id="autoDwell" class="primary">${timer?'일시정지':'자동 판정'}</button></div><p class="fine below">반경 ≤100m · 정확도 ≤30m · 속도 0 · P · 주차브레이크 · 합법 주차. 신호가 바뀌어 조건을 벗어나면 체류가 초기화됩니다.</p>`;}
 if(a.phase==='activity')body+=`<div class="note">가상 주변 도착 완료. 아래 활동은 시연용 체크입니다.</div><label class="check"><input type="checkbox" id="activitySafe" ${a.safe?'checked':''}>운전 중이 아니며, 허용된 장소에서 안전하게 활동했음을 가정합니다.</label>${t.tasks.map((s,i)=>`<label class="check"><input type="checkbox" data-check="${i}" ${a.checks[i]?'checked':''}>${s}</label>`).join('')}<label class="below">발견 메모 · 최대 ${caps().note}자<textarea id="activeNote" maxlength="${caps().note}" placeholder="기억하고 싶은 작은 발견">${escapeHTML(a.note)}</textarea></label><button id="complete" class="primary wide below" ${a.safe&&a.checks.every(Boolean)?'':'disabled'}>데모 완료 · 보상 받기</button><p class="fine below">사진·위치·구매 인증 없이 저장하는 개인 기록입니다.</p>`;
 body+='<button id="cancelActive" class="textBtn wide below">이 탐험 취소</button>';$('activeContent').innerHTML=body;
}
function complete(){const a=state.active;if(!a||a.phase!=='activity'||!a.safe||!a.checks.every(Boolean)||state.done[a.id])return;const q=qById(a.id);state.done[a.id]={at:new Date().toISOString(),note:a.note.slice(0,caps().note),proof:'simulation'};state.active=null;stopTimer();render();const ready=itemIds.filter(id=>!has(id)&&itemRequirement(id).ok);$('rewardBody').innerHTML=`<div class="big">🎉</div><span class="eyebrow">A LITTLE DISCOVERY COLLECTED</span><h2>${dById(q.district).name}에 색을 더했어요!</h2><p>${q.place}<br><b>+${q.xp} XP</b> · ${districtCount(q.district)} / 6 완료</p><div class="note">${ready.length?ready.length+'개의 아이템을 해금할 수 있어요.<br>모아의 차고에서 사용 제한을 풀어주세요.':'다음 탐험에서 새로운 아이템을 만나보세요.'}</div><p class="fine below">가상 방문 데모 기록</p>`;$('reward').showModal()}
function editNote(id){if(!has('journal')||!state.done[id])return;modalQuest=id;$('detailBody').innerHTML=`<div class="sectionTitle"><h2>발견 메모 편집</h2><button data-close="detail" aria-label="닫기">✕</button></div><p>${qById(id).place}</p><label class="below">최대 500자<textarea id="editNote" maxlength="500">${escapeHTML(state.done[id].note)}</textarea></label><button data-savenote="${id}" class="primary wide below">메모 저장</button>`;$('detail').showModal()}
function changeSignal(el){const a=state.active;if(!a||a.phase!=='arrived')return;const mapping={signalDistance:'distance',signalAccuracy:'accuracy',signalSpeed:'speed',signalGear:'gear',signalBrake:'brake',signalLegal:'legal'},key=mapping[el.id];if(!key)return;stopTimer();a.signals[key]=el.type==='checkbox'?el.checked:el.id==='signalGear'?el.value:el.value===''?Infinity:Number(el.value);if(!validDwell(a))a.dwell=0;renderActive();save()}
$('districtFilter').innerHTML='<option value="">서울 전체 · 25개 구</option>'+DISTRICTS.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
document.addEventListener('click',e=>{
 const b=e.target.closest('button,[data-district]');if(!b||b.disabled)return;
 if(b.dataset.tab)showTab(b.dataset.tab);if(b.dataset.district)selectDistrict(b.dataset.district);if(b.dataset.detail)openDetail(b.dataset.detail);if(b.dataset.close)$(b.dataset.close).close();if(b.dataset.favorite)toggleFavorite(b.dataset.favorite);if(b.dataset.route)toggleRoute(b.dataset.route);if(b.dataset.accept)accept(b.dataset.accept);if(b.dataset.claim)claim(b.dataset.claim);if(b.dataset.equip)equip(b.dataset.equip);if(b.dataset.theme){theme=b.dataset.theme;pageSize=24;renderQuests()}if(b.dataset.gocloset){$('detail').close();showTab('closet')}if(b.dataset.editnote)editNote(b.dataset.editnote);if(b.dataset.savenote&&has('journal')&&state.done[b.dataset.savenote]){state.done[b.dataset.savenote].note=$('editNote').value.slice(0,500);$('detail').close();render();toast('메모를 저장했어요.')}
 if(b.dataset.up&&has('planner')){const i=state.route.indexOf(b.dataset.up);if(i>0){[state.route[i-1],state.route[i]]=[state.route[i],state.route[i-1]];render()}}
 const actions={startDrive,stopDrive,tick:dwellTick,autoDwell,cancelActive,complete,more:()=>{pageSize+=24;renderQuests()},closeReward:()=>$('reward').close(),undress:()=>{state.equipped={outfit:null,tool:null,master:null,badge:null};render()},allDistricts:()=>{selected=null;$('districtFilter').value='';render()},resetFilters:()=>{theme='all';selected=null;$('search').value='';$('districtFilter').value='';$('statusFilter').value='all';$('timeFilter').value='999';$('sort').value='default';pageSize=24;renderQuests()},reset:()=>{if(confirm('데모의 진행도, 아이템, 메모를 모두 초기화할까요?')){stopTimer();hideDrive();state=blank();render();toast('데모 기록을 초기화했어요.')}}};if(actions[b.id])actions[b.id]();
});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-district]:not(button)')){e.preventDefault();selectDistrict(e.target.dataset.district)}});
document.addEventListener('change',e=>{
 const el=e.target;if(el.id.startsWith('signal'))changeSignal(el);
 if(el.id==='detour'){if(state.active){toast('진행 중인 탐험을 마치거나 취소한 뒤 변경해 주세요.');el.value=state.detour;return}state.detour=Number(el.value);render()}
 if(['districtFilter','statusFilter','timeFilter','sort'].includes(el.id)){pageSize=24;renderQuests()}
 if(el.id==='activitySafe'&&state.active){state.active.safe=el.checked;const a=state.active;$('complete').disabled=!(a.safe&&a.checks.every(Boolean));save()}
 if(el.dataset.check!==undefined&&state.active){state.active.checks[Number(el.dataset.check)]=el.checked;const a=state.active;$('complete').disabled=!(a.safe&&a.checks.every(Boolean));save()}
});
$('search').addEventListener('input',()=>{pageSize=24;renderQuests()});
document.addEventListener('input',e=>{if(e.target.id==='activeNote'&&state.active){state.active.note=e.target.value.slice(0,caps().note);save()}});
function pauseSimulation() {
 if (!timer) return;
 stopTimer();
 if (state.active?.phase === 'driving') {
  state.active.phase = 'accepted';
  state.active.ticks = 0;
  hideDrive();
 }
 if (state.active?.phase === 'arrived') state.active.dwell = 0;
 renderActive();
 save();
}
function handleDemoBack() {
 const dialog = document.querySelector('dialog[open]');
 if (dialog) {
  dialog.close();
  return true;
 }
 if (state.active?.phase === 'driving') {
  stopDrive();
  return true;
 }
 if (currentTab !== 'explore') {
  showTab('explore');
  return true;
 }
 return false;
}
document.addEventListener('visibilitychange', () => {
 if (document.hidden) pauseSimulation();
});
window.addEventListener('beforeunload',()=>{stopTimer();save()});
render();
