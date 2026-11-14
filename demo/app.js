const regions = {
  d01: ['광장시장 먹거리 골목', '경복궁 주변', '서촌 카페 골목'],
  d04: ['성수동 음식 거리', '서울숲', '성수동 카페 거리'],
  d14: ['망원시장 먹거리 골목', '망원한강공원', '연남동 카페 거리'],
};
const categories = [
  { label: '음식', outfit: '셰프 모자', style: 'food' },
  { label: '명소', outfit: '탐험가 모자', style: 'art' },
  { label: '카페', outfit: '바리스타 의상', style: 'coffee' },
];

const $ = id => document.getElementById(id);
const districtName = id => districts.find(district => district.id === id).name;
const storageKey = 'moa-initial-demo-v1';
const emptyState = () => ({ visits: {}, quests: {}, history: [], outfit: '' });
let state = load();
let selected = 'd01';
let moving = false;
let activeTab = 'explore';

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved?.visits && saved?.quests && Array.isArray(saved.history)) return saved;
  } catch {
    return emptyState();
  }
  return emptyState();
}

function save(message) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    $('status').textContent = message;
  } catch {
    $('status').textContent = message + ' 이 브라우저에서 기록 저장을 사용할 수 없습니다.';
  }
}

function count(id) {
  return (state.quests[id] || []).length;
}

function stage(id) {
  if (!state.visits[id]) return 0;
  if (count(id) === 3) return 3;
  return count(id) > 0 ? 2 : 1;
}

function drawMap() {
  $('map').innerHTML = districts.map(({ id, name, path, point }) => {
    const inDemo = Object.hasOwn(regions, id);
    const interaction = inDemo
      ? `data-region="${id}" role="button" tabindex="0" aria-label="${name} ${count(id)}개 완료" aria-pressed="${id === selected}"`
      : '';
    const label = inDemo ? `<text x="${point[0]}" y="${point[1]}">${name}</text>` : '';
    return `<path d="${path}" class="stage-${stage(id)}" data-selected="${id === selected}" ${interaction}
      fill-rule="evenodd"><title>${name}${inDemo ? '' : ' · 시범 지역 외'}</title></path>${label}`;
  }).join('');
  $('progress').textContent = `시범 지역 ${Object.keys(state.visits).length} / 3 방문`;
}

function drawQuests() {
  $('districts').innerHTML = Object.keys(regions).map(id =>
    `<button type="button" data-region="${id}" aria-pressed="${selected === id}">${districtName(id)}</button>`
  ).join('');
  const visited = Boolean(state.visits[selected]);
  const quests = regions[selected].map((place, index) => {
    const done = (state.quests[selected] || []).includes(index);
    const label = done ? '완료됨' : '미션 완료';
    return `<div class="quest">
      <div><small>${categories[index].label}</small><strong>${place}</strong></div>
      <button type="button" data-quest="${index}" aria-label="${place} ${label}" ${!visited || done ? 'disabled' : ''}>${label}</button>
    </div>`;
  }).join('');
  $('quest-panel').innerHTML = `<div class="district-summary">
    <h2>${districtName(selected)}</h2>
    <div>${visited ? `방문 ${state.visits[selected]}회 · 퀘스트 ${count(selected)} / 3` : '첫 방문 후 미션을 완료할 수 있어요.'}</div>
    <button type="button" id="depart" class="primary">이 지역으로 가상 이동</button>
  </div>${quests}`;
}

function drawHistory() {
  $('records').replaceChildren();
  for (const record of [...state.history].reverse()) {
    const item = document.createElement('li');
    const label = document.createElement('strong');
    const time = document.createElement('small');
    label.textContent = record.label;
    time.textContent = new Date(record.time).toLocaleString('ko-KR');
    item.append(label, time);
    $('records').append(item);
  }
  if (!state.history.length) $('records').textContent = '아직 가상 방문 기록이 없어요.';
}

function mascotWear() {
  return state.outfit || 'basic';
}

function hasOutfit(index) {
  return Object.values(state.quests).some(completed => completed.includes(index));
}

function drawCloset() {
  $('mascot').innerHTML = mascot();
  const equipped = categories.find(category => category.style === state.outfit);
  $('wearing').textContent = equipped ? `착용 중 · ${equipped.outfit}` : '기본 의상 착용 중';
  $('outfits').innerHTML = categories.map((category, index) => {
    const earned = hasOutfit(index);
    const wearing = category.style === state.outfit;
    return `<li><div><strong>${category.outfit}</strong><small>${category.label} 미션 1개 완료</small></div>
      <button type="button" data-outfit="${index}" ${earned ? '' : 'disabled'}>${wearing ? '벗기' : earned ? '착용' : '잠김'}</button></li>`;
  }).join('');
}

function render() {
  $('interactive').hidden = moving;
  $('moving').hidden = !moving;
  $('reset').disabled = moving;
  for (const button of document.querySelectorAll('[data-tab]')) {
    button.disabled = moving;
    if (button.dataset.tab === activeTab) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
    $(button.dataset.tab).hidden = button.dataset.tab !== activeTab;
  }
  drawMap();
  drawQuests();
  drawHistory();
  drawCloset();
}

function selectRegion(id, fromMap = false) {
  if (moving || !Object.hasOwn(regions, id)) return;
  selected = id;
  drawMap();
  drawQuests();
  const container = fromMap ? 'map' : 'districts';
  $(container).querySelector(`[data-region="${id}"]`).focus();
}

function startTravel() {
  moving = true;
  $('destination').textContent = `${districtName(selected)} · 도착하면 가상 주차를 눌러 주세요.`;
  $('status').textContent = '';
  render();
  $('moving-title').focus();
}

function park() {
  moving = false;
  const first = !state.visits[selected];
  state.visits[selected] = (state.visits[selected] || 0) + 1;
  const message = first ? `${districtName(selected)} 첫 방문을 기록했어요!` : `${districtName(selected)} 재방문을 기록했어요.`;
  state.history.push({ label: message, time: Date.now() });
  save(message);
  render();
  $('depart').focus();
}

function completeQuest(index) {
  if (!state.visits[selected]) return;
  const completed = state.quests[selected] ||= [];
  if (completed.includes(index)) return;
  const unlocked = !hasOutfit(index);
  completed.push(index);
  const category = categories[index];
  state.history.push({ label: `${districtName(selected)} · ${category.label} 미션 완료`, time: Date.now() });
  save(unlocked ? `미션 완료 · ${category.outfit} 해금!` : '미션을 완료했어요.');
  drawMap();
  drawQuests();
  drawHistory();
  drawCloset();
  $('depart').focus();
}

document.addEventListener('click', event => {
  const target = event.target.closest('button, [data-region]');
  if (!target || target.disabled) return;
  if (target.id === 'park' && moving) {
    park();
    return;
  }
  if (moving) return;
  if (target.dataset.region) {
    selectRegion(target.dataset.region, target.closest('svg') !== null);
  } else if (target.dataset.tab) {
    activeTab = target.dataset.tab;
    render();
  } else if (target.id === 'depart') {
    startTravel();
  } else if (target.dataset.quest !== undefined) {
    completeQuest(Number(target.dataset.quest));
  } else if (target.dataset.outfit !== undefined) {
    const index = Number(target.dataset.outfit);
    if (!hasOutfit(index)) return;
    const style = categories[index].style;
    state.outfit = state.outfit === style ? '' : style;
    save('모아의 의상을 저장했어요.');
    drawCloset();
    $('outfits').querySelector(`[data-outfit="${index}"]`).focus();
  } else if (target.id === 'reset' && confirm('가상 방문과 의상 기록을 초기화할까요?')) {
    state = emptyState();
    selected = 'd01';
    activeTab = 'explore';
    save('데모 기록을 초기화했어요.');
    render();
  }
});

$('map').addEventListener('keydown', event => {
  if (!event.target.dataset.region || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  selectRegion(event.target.dataset.region, true);
});

render();
