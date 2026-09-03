// ========== 数据存储 ==========

const DB = {

  get(key, def) { try { return JSON.parse(localStorage.getItem('campus_' + key)) || def; } catch(e) { return def; } },

  set(key, val) { localStorage.setItem('campus_' + key, JSON.stringify(val)); }

};



let deliveries = DB.get('deliveries', []);

let interviews = DB.get('interviews', []);

let targets = DB.get('targets', []);

let appliedJobs = DB.get('appliedJobs', {});

let currentFilter = 'all';

let editingDeliveryId = null;

let editingInterviewId = null;

let editingTargetId = null;

let currentPage = 1;

const pageSize = 20;

let filteredJobs = [];

let activeFilters = { batch: [], location: [], industry: [], nature: [], exam: [] };



// ========== 工具函数 ==========

function getToday() { return new Date().toISOString().split('T')[0]; }

function getCurrentStage() {

  const m = new Date().getMonth() + 1;

  if (m >= 3 && m <= 4) return '春招';

  if (m >= 5 && m <= 6) return '暑期实习';

  if (m >= 7 && m <= 8) return '秋招提前批';

  if (m >= 9 && m <= 11) return '秋招正式批';

  return '秋招补录/寒假实习';

}

function daysUntil(dateStr) {

  if (!dateStr || dateStr === '招满为止' || dateStr === '尽快投递') return null;

  const target = new Date(dateStr.replace(/\//g, '-'));

  if (isNaN(target.getTime())) return null;

  const today = new Date(); today.setHours(0,0,0,0);

  return Math.ceil((target - today) / (1000*60*60*24));

}

function showToast(msg, type = 'success') {

  const toast = document.createElement('div');

  toast.className = 'toast';

  toast.style.background = type === 'error' ? '#dc2626' : '#16a34a';

  toast.textContent = msg;

  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2500);

}

function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('show'); }

function toggleGroup(id) {

  const g = document.getElementById(id);

  const arrow = document.getElementById(id + '-arrow');

  if (g.style.maxHeight === '0px') { g.style.maxHeight = '500px'; arrow.textContent = '▼'; }

  else { g.style.maxHeight = '0px'; arrow.textContent = '▶'; }

}

function extractUrl(text) {

  if (!text) return '#';

  const match = text.match(/https?:\/\/[^\s\)]+/);

  return match ? match[0] : '#';

}



// ========== 导航 ==========

document.querySelectorAll('.nav-item').forEach(item => {

  item.addEventListener('click', () => {

    const page = item.dataset.page;

    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

    item.classList.add('active');

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    document.getElementById('page-' + page).classList.add('active');

    document.getElementById('pageTitle').textContent = item.textContent.trim();

    if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('show');

    if (page === 'home') renderHome();

    if (page === 'platforms') renderPlatforms();

    if (page === 'majors') renderMajors();

    if (page === 'resume') renderResume();

    if (page === 'targets') renderTargets();

    if (page === 'deliveries') renderDeliveries();

    if (page === 'interviews') renderInterviews();

    if (page === 'dashboard') renderDashboard();

    if (page === 'reminders') renderReminders();

    if (page === 'settings') renderDataStats();

  });

});



function navigateTo(page) {

  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);

  if (navItem) {

    navItem.click();

  } else {

    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const target = document.getElementById('page-' + page);

    if (target) target.classList.add('active');

    document.getElementById('pageTitle').textContent = page === 'detail' ? '岗位详情' : '';

  }

}



// ========== 校招广场 ==========

const HOT_LOCATIONS = ['北京', '上海', '深圳', '广州', '杭州', '成都', '武汉', '南京', '西安', '苏州'];

const EXCLUDE_WORDS = ['全国', '远程', '不限', '线上', '均可', '其他', '-', '—', '多地', '若干'];

const CITY_LIST = new Set(['北京', '上海', '天津', '重庆', '石家庄', '唐山', '秦皇岛', '邯郸', '邢台', '保定', '张家口', '承德', '沧州', '廊坊', '衡水', '太原', '大同', '阳泉', '长治', '晋城', '朔州', '晋中', '运城', '忻州', '临汾', '吕梁', '呼和浩特', '包头', '乌海', '赤峰', '通辽', '鄂尔多斯', '呼伦贝尔', '巴彦淖尔', '乌兰察布', '锡林浩特', '乌兰浩特', '沈阳', '大连', '鞍山', '抚顺', '本溪', '丹东', '锦州', '营口', '阜新', '辽阳', '盘锦', '铁岭', '朝阳', '葫芦岛', '长春', '吉林', '四平', '辽源', '通化', '白山', '松原', '白城', '延吉', '哈尔滨', '齐齐哈尔', '鸡西', '鹤岗', '双鸭山', '大庆', '伊春', '佳木斯', '七台河', '牡丹江', '黑河', '绥化', '加格达奇', '南京', '无锡', '徐州', '常州', '苏州', '南通', '连云港', '淮安', '盐城', '扬州', '镇江', '泰州', '宿迁', '昆山', '常熟', '张家港', '江阴', '宜兴', '太仓', '吴江', '启东', '海门', '如皋', '海安', '东台', '高邮', '仪征', '丹阳', '扬中', '句容', '靖江', '泰兴', '兴化', '沭阳', '泗阳', '泗洪', '睢宁', '邳州', '新沂', '溧阳', '金坛', '溧水', '高淳', '杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水', '义乌', '慈溪', '余姚', '乐清', '瑞安', '诸暨', '上虞', '嵊州', '临海', '温岭', '玉环', '桐乡', '海宁', '平湖', '东阳', '永康', '兰溪', '江山', '建德', '富阳', '临安', '余杭', '萧山', '柯桥', '椒江', '黄岩', '路桥', '洞头', '苍南', '平阳', '永嘉', '文成', '泰顺', '庆元', '龙泉', '青田', '遂昌', '松阳', '云和', '景宁', '缙云', '武义', '磐安', '合肥', '芜湖', '蚌埠', '淮南', '马鞍山', '淮北', '铜陵', '安庆', '黄山', '滁州', '阜阳', '宿州', '六安', '亳州', '池州', '宣城', '宁国', '桐城', '天长', '明光', '界首', '巢湖', '无为', '潜山', '广德', '当涂', '怀远', '固镇', '五河', '凤阳', '定远', '来安', '全椒', '福州', '厦门', '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德', '晋江', '石狮', '福清', '长乐', '永安', '邵武', '武夷山', '建瓯', '福安', '福鼎', '漳平', '龙海', '南安', '惠安', '安溪', '永春', '德化', '金门', '南昌', '景德镇', '萍乡', '九江', '新余', '鹰潭', '赣州', '吉安', '宜春', '抚州', '上饶', '瑞金', '井冈山', '丰城', '樟树', '高安', '乐平', '瑞昌', '共青城', '德兴', '贵溪', '龙南', '庐山', '婺源', '兴国', '于都', '济南', '青岛', '淄博', '枣庄', '东营', '烟台', '潍坊', '济宁', '泰安', '威海', '日照', '临沂', '德州', '聊城', '滨州', '菏泽', '莱芜', '章丘', '胶州', '即墨', '平度', '莱西', '龙口', '莱阳', '莱州', '蓬莱', '招远', '栖霞', '海阳', '青州', '诸城', '寿光', '安丘', '高密', '昌邑', '临朐', '昌乐', '曲阜', '兖州', '邹城', '新泰', '肥城', '荣成', '乳山', '文登', '乐陵', '禹城', '临清', '邹平', '滕州', '郑州', '开封', '洛阳', '平顶山', '安阳', '鹤壁', '新乡', '焦作', '濮阳', '许昌', '漯河', '三门峡', '南阳', '商丘', '信阳', '周口', '驻马店', '济源', '巩义', '荥阳', '新密', '新郑', '登封', '偃师', '孟州', '沁阳', '禹州', '长葛', '舞钢', '义马', '灵宝', '邓州', '永城', '项城', '固始', '武汉', '黄石', '十堰', '宜昌', '襄阳', '鄂州', '荆门', '孝感', '荆州', '黄冈', '咸宁', '随州', '恩施', '仙桃', '潜江', '天门', '神农架', '大冶', '宜都', '枝江', '当阳', '枣阳', '宜城', '老河口', '钟祥', '京山', '应城', '安陆', '汉川', '麻城', '武穴', '赤壁', '广水', '利川', '长沙', '株洲', '湘潭', '衡阳', '邵阳', '岳阳', '常德', '张家界', '益阳', '郴州', '永州', '怀化', '娄底', '湘西', '浏阳', '醴陵', '湘乡', '韶山', '耒阳', '常宁', '武冈', '汨罗', '临湘', '津市', '沅江', '资兴', '洪江', '冷水江', '涟源', '吉首', '广州', '韶关', '深圳', '珠海', '汕头', '佛山', '江门', '湛江', '茂名', '肇庆', '惠州', '梅州', '汕尾', '河源', '阳江', '清远', '东莞', '中山', '潮州', '揭阳', '云浮', '顺德', '南海', '番禺', '增城', '从化', '台山', '开平', '鹤山', '恩平', '高州', '化州', '信宜', '阳春', '英德', '连州', '普宁', '陆丰', '兴宁', '廉江', '雷州', '吴川', '遂溪', '徐闻', '南宁', '柳州', '桂林', '梧州', '北海', '防城港', '钦州', '贵港', '玉林', '百色', '贺州', '河池', '来宾', '崇左', '海口', '三亚', '三沙', '儋州', '五指山', '琼海', '文昌', '万宁', '东方', '定安', '屯昌', '澄迈', '临高', '成都', '自贡', '攀枝花', '泸州', '德阳', '绵阳', '广元', '遂宁', '内江', '乐山', '南充', '眉山', '宜宾', '广安', '达州', '雅安', '巴中', '资阳', '西昌', '马尔康', '康定', '都江堰', '彭州', '邛崃', '崇州', '简阳', '江油', '峨眉山', '阆中', '华蓥', '万源', '射洪', '隆昌', '会理', '贵阳', '六盘水', '遵义', '安顺', '毕节', '铜仁', '兴义', '凯里', '都匀', '福泉', '仁怀', '清镇', '赤水', '盘州', '昆明', '曲靖', '玉溪', '保山', '昭通', '丽江', '普洱', '临沧', '楚雄', '红河', '文山', '西双版纳', '大理', '德宏', '怒江', '迪庆', '宣威', '安宁', '个旧', '开远', '蒙自', '弥勒', '景洪', '芒市', '瑞丽', '拉萨', '日喀则', '昌都', '林芝', '山南', '那曲', '阿里', '西安', '铜川', '宝鸡', '咸阳', '渭南', '延安', '汉中', '榆林', '安康', '商洛', '韩城', '华阴', '兴平', '神木', '府谷', '兰州', '嘉峪关', '金昌', '白银', '天水', '武威', '张掖', '平凉', '酒泉', '庆阳', '定西', '陇南', '临夏', '合作', '敦煌', '玉门', '华亭', '西宁', '海东', '海西', '格尔木', '德令哈', '玉树', '共和', '同仁', '银川', '石嘴山', '吴忠', '固原', '中卫', '灵武', '青铜峡', '乌鲁木齐', '克拉玛依', '吐鲁番', '哈密', '昌吉', '博乐', '库尔勒', '阿克苏', '阿图什', '喀什', '和田', '伊宁', '塔城', '阿勒泰', '石河子', '阿拉尔', '图木舒克', '五家渠', '北屯', '铁门关', '双河', '可克达拉', '昆玉', '霍尔果斯', '香港', '澳门', '台北', '高雄', '台中', '台南', '新竹', '基隆', '嘉义', '桃园', '新北', '新加坡', '东京', '大阪', '首尔', '悉尼', '墨尔本', '纽约', '洛杉矶', '旧金山', '伦敦', '巴黎', '柏林', '温哥华', '多伦多', '曼谷', '雅加达', '吉隆坡', '马尼拉', '胡志明', '迪拜', '利雅得', '莫斯科', '圣彼得堡', '慕尼黑', '法兰克福', '阿姆斯特丹', '布鲁塞尔', '苏黎世', '日内瓦', '米兰', '罗马', '马德里', '巴塞罗那', '里斯本', '斯德哥尔摩', '奥斯陆', '哥本哈根', '赫尔辛基', '维也纳', '布达佩斯', '华沙', '基辅', '伊斯坦布尔', '开罗', '约翰内斯堡', '圣保罗', '墨西哥城', '波哥大', '利马', '圣地亚哥']);



const PROVINCES = ['北京','上海','天津','重庆','河北','山西','辽宁','吉林','黑龙江','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','海南','四川','贵州','云南','陕西','甘肃','青海','台湾','内蒙古','广西','西藏','宁夏','新疆','香港','澳门'];

const COUNTRIES = ['美国','日本','英国','法国','德国','韩国','新加坡','马来西亚','印度尼西亚','印度尼西','泰国','越南','澳大利亚','加拿大','俄罗斯','意大利','西班牙','荷兰','瑞士','瑞典','挪威','丹麦','芬兰','比利时','奥地利','波兰','葡萄牙','希腊','土耳其','印度','巴西','墨西哥','阿根廷','智利','埃及','南非','沙特','阿联酋','卡塔尔','以色列','伊朗','哈萨克斯坦','蒙古','缅甸','老挝','柬埔寨','菲律宾','新西兰','秘鲁','哥伦比亚','印度尼西亚'];



function canSplitIntoCities(w) {

  if (w.length < 4) return false;

  const n = w.length;

  const dp = new Array(n + 1).fill(false);

  dp[0] = true;

  for (let i = 1; i <= n; i++) {

    for (let j = Math.max(0, i - 6); j < i; j++) {

      if (dp[j] && CITY_LIST.has(w.slice(j, i))) { dp[i] = true; break; }

    }

  }

  return dp[n];

}



function isLikelyCity(c) {

  if (!c || c.length < 2 || c.length > 6) return false;

  if (/[0-9a-zA-Z.\u2022\u200c]/.test(c)) return false;

  if (c.includes('...') || c.includes('…')) return false;

  if (EXCLUDE_WORDS.includes(c)) return false;

  if (/^(全国|远程|线上|海外|不限|均可|多地|其他|若干|省内|境外|等|及|全国其他|全国多地|全国其它|全球高校|跟随项目|项目所在地|各区域就近分配|轮岗|城市|多地市|室内|户外)$/.test(c)) return false;

  if (/(省|自治区|自治州|地区|盟|区|县|镇|村|路|街|道|号|栋|楼|层|校区|基地|工业|园|院|大厦|公园|港|湾|新区|开发区|办事处|门店|仓库|工厂|分部|中心|集团|大学|学院|中学|小学|项目|所在地|就近|分配|区域|城市|同城|高校|其它)/.test(c)) return false;

  if (/^[-—·、]/.test(c)) return false;

  if (PROVINCES.includes(c) && !['北京','上海','天津','重庆'].includes(c)) return false;

  if (PROVINCES.some(p => c.length > p.length && c.startsWith(p))) return false;

  if (c.startsWith('全国') || c.startsWith('全球') || c.startsWith('各省')) return false;

  if (/^(北美|欧洲|亚太|港澳台|海外|国内|国外|西南|华东|华南|华北|华中|东北|西北|全国|各地|珠三角|长三角|京津冀|大湾区|境外|海外)$/.test(c)) return false;

  if (COUNTRIES.some(cnt => c.includes(cnt))) return false;

  if (canSplitIntoCities(c)) return false;

  return true;

}



function extractLocations() {

  const jobs = window.jobsData || [];

  const set = new Set();

  const freq = {};

  jobs.forEach(j => {

    getJobLocations(j).forEach(c => {

      if (CITY_LIST.has(c)) { set.add(c); }

      else if (isLikelyCity(c)) { freq[c] = (freq[c] || 0) + 1; }

    });

  });

  // 兜底：不在城市表但启发式像城市且出现>=2次

  Object.keys(freq).forEach(c => {

    if (!set.has(c) && freq[c] >= 2) set.add(c);

  });

  return [...set];

}



function sortByPinyin(list) {

  return list.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));

}



let allLocations = [];



function initFilters() {

  const jobs = window.jobsData || [];

  const batches = [...new Set(jobs.flatMap(j => j.批次 || []))];

  const industries = [...new Set(jobs.flatMap(j => j.行业大类 || []))];

  const natures = [...new Set(jobs.flatMap(j => j.企业性质 || []))];

  const exams = [...new Set(jobs.flatMap(j => j.是否需要笔试 || []))];



  allLocations = sortByPinyin(extractLocations());



  renderFilterTags('batchFilters', batches, 'batch');

  renderLocationFilters();

  renderFilterTags('industryFilters', industries, 'industry');

  renderFilterTags('natureFilters', natures, 'nature');

  renderFilterTags('examFilters', exams, 'exam');

  updateFilterUI();

}



function filterTagHtml(key, value) {

  const escaped = String(value).replace(/'/g, "\\'");

  const active = activeFilters[key].includes(value) ? ' active' : '';

  return `<span class="filter-tag${active}" data-key="${key}" data-value="${value}" onclick="toggleFilter('${key}','${escaped}')">${value}</span>`;

}



function renderFilterTags(containerId, items, filterKey) {

  const container = document.getElementById(containerId);

  if (!container) return;

  container.innerHTML = items.map(item => filterTagHtml(filterKey, item)).join('');

}



function renderLocationFilters() {

  const container = document.getElementById('locationFilters');

  if (!container) return;

  const keyword = (document.getElementById('locationSearch').value || '').trim();



  const hot = HOT_LOCATIONS.filter(l => allLocations.includes(l) && (!keyword || l.includes(keyword)));

  const others = allLocations.filter(l => !HOT_LOCATIONS.includes(l) && (!keyword || l.includes(keyword)));



  let html = '';

  if (hot.length > 0) {

    html += '<div class="location-group-title">🔥 热门城市</div><div class="filter-tags" style="margin-bottom:8px">' +

      hot.map(l => filterTagHtml('location', l)).join('') + '</div>';

  }

  if (others.length > 0) {

    html += '<div class="location-group-title">📍 其他城市</div><div class="filter-tags">' +

      others.map(l => filterTagHtml('location', l)).join('') + '</div>';

  }

  if (!hot.length && !others.length) {

    html = '<div style="font-size:12px;color:#94a3b8;padding:8px">未找到匹配城市</div>';

  }

  container.innerHTML = html;

}



function toggleFilterPanel() {

  document.getElementById('filterDropdown').classList.toggle('open');

}



function toggleFilter(key, value) {

  const idx = activeFilters[key].indexOf(value);

  if (idx >= 0) activeFilters[key].splice(idx, 1);

  else activeFilters[key].push(value);



  document.querySelectorAll(`.filter-tag[data-key="${key}"]`).forEach(tag => {

    if (activeFilters[key].includes(tag.dataset.value)) tag.classList.add('active');

    else tag.classList.remove('active');

  });

  currentPage = 1;

  updateFilterUI();

  applyFilters();

}



function updateFilterUI() {

  const totalCount = Object.values(activeFilters).reduce((sum, arr) => sum + arr.length, 0);

  const badge = document.getElementById('filterCount');

  badge.textContent = totalCount;

  badge.style.display = totalCount > 0 ? 'inline-block' : 'none';



  const summary = [];

  if (activeFilters.batch.length) summary.push(`批次${activeFilters.batch.length}项`);

  if (activeFilters.location.length) summary.push(`地点${activeFilters.location.length}项`);

  if (activeFilters.industry.length) summary.push(`行业${activeFilters.industry.length}项`);

  if (activeFilters.nature.length) summary.push(`性质${activeFilters.nature.length}项`);

  if (activeFilters.exam.length) summary.push(`笔试${activeFilters.exam.length}项`);

  const el = document.getElementById('activeFilterSummary');

  if (el) el.textContent = summary.length > 0 ? '已选：' + summary.join('、') : '未选择筛选条件';

}



function resetFilters() {

  activeFilters = { batch: [], location: [], industry: [], nature: [], exam: [] };

  document.getElementById('searchInput').value = '';

  const locSearch = document.getElementById('locationSearch');

  if (locSearch) locSearch.value = '';

  document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));

  currentPage = 1;

  updateFilterUI();

  applyFilters();

}



function getJobLocations(job) {

  const locs = [];

  (job.工作地点 || []).forEach(l => {

    String(l).split(/[\s、,，/／；;]+/).forEach(c => { c = c.trim(); if (c) locs.push(c); });

  });

  if (job.工作地点文本) {

    String(job.工作地点文本).split(/[\s、,，/／；;]+/).forEach(c => { c = c.trim(); if (c) locs.push(c); });

  }

  return locs;

}



function applyFilters() {

  const jobs = window.jobsData || [];

  const search = document.getElementById('searchInput').value.toLowerCase();

  const sort = document.getElementById('sortSelect').value;



  filteredJobs = jobs.filter(job => {

    if (search) {

      const text = (job.公司名称 + job.招聘岗位 + (job.工作地点文本 || '') + (job.工作地点 || []).join('')).toLowerCase();

      if (!text.includes(search)) return false;

    }

    if (activeFilters.batch.length > 0 && !activeFilters.batch.some(b => (job.批次 || []).includes(b))) return false;

    if (activeFilters.location.length > 0) {

      const jobLocs = getJobLocations(job);

      if (!activeFilters.location.some(l => jobLocs.includes(l))) return false;

    }

    if (activeFilters.industry.length > 0 && !activeFilters.industry.some(i => (job.行业大类 || []).includes(i))) return false;

    if (activeFilters.nature.length > 0 && !activeFilters.nature.some(n => (job.企业性质 || []).includes(n))) return false;

    if (activeFilters.exam.length > 0 && !activeFilters.exam.some(e => (job.是否需要笔试 || []).includes(e))) return false;

    return true;

  });



  if (sort === 'date_desc') filteredJobs.sort((a,b) => new Date(b.更新时间) - new Date(a.更新时间));

  else if (sort === 'date_asc') filteredJobs.sort((a,b) => new Date(a.更新时间) - new Date(b.更新时间));

  else if (sort === 'deadline') filteredJobs.sort((a,b) => (daysUntil(a.截止时间)||9999) - (daysUntil(b.截止时间)||9999));



  document.getElementById('resultCount').textContent = filteredJobs.length;

  renderJobList();

  renderPagination();

}



function renderJobList() {

  const container = document.getElementById('jobList');

  const start = (currentPage - 1) * pageSize;

  const pageJobs = filteredJobs.slice(start, start + pageSize);



  if (pageJobs.length === 0) {

    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">没有符合条件的岗位</div><div class="empty-state-desc">试试调整筛选条件或搜索关键词</div></div>';

    return;

  }



  container.innerHTML = pageJobs.map((job, idx) => {

    const jobId = start + idx;

    const isApplied = appliedJobs[job.公司名称 + '_' + job.招聘岗位];

    const days = daysUntil(job.截止时间);

    const deadlineText = days !== null ? `<span class="badge ${days <= 0 ? 'badge-red' : days <= 7 ? (days <= 3 ? 'badge-red' : 'badge-yellow') : 'badge-gray'}">${days <= 0 ? '已截止' : days + '天后截止'}</span>` : '';

    const locText = (job.工作地点 || []).slice(0, 3).join('、') || (job.工作地点文本 || '');

    return `<div class="job-card ${isApplied ? 'applied' : ''}" onclick="showJobDetail(${jobId})">

      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">

        <div style="font-size:16px;font-weight:600;color:#1e293b">${job.公司名称} ${isApplied ? '<span class="badge badge-green">已投递</span>' : ''}</div>

        ${deadlineText}

      </div>

      <div style="font-size:14px;font-weight:500;color:#2563eb;margin-bottom:8px">${job.招聘岗位 || ''}</div>

      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">

        ${(job.批次 || []).slice(0,2).map(b => `<span class="badge badge-blue">${b}</span>`).join('')}

        ${(job.行业大类 || []).slice(0,1).map(i => `<span class="badge badge-purple">${i}</span>`).join('')}

        ${(job.企业性质 || []).slice(0,1).map(n => `<span class="badge badge-gray">${n}</span>`).join('')}

      </div>

      <div style="font-size:12px;color:#64748b;display:flex;justify-content:space-between">

        <span>📍 ${locText || '-'}</span>

        <span>更新于 ${job.更新时间 || '-'}</span>

      </div>

    </div>`;

  }).join('');

}



function renderPagination() {

  const totalPages = Math.ceil(filteredJobs.length / pageSize);

  const container = document.getElementById('pagination');

  if (totalPages <= 1) { container.innerHTML = ''; return; }

  

  let pages = [];

  if (totalPages <= 7) pages = Array.from({length: totalPages}, (_, i) => i + 1);

  else {

    pages = [1];

    if (currentPage > 3) pages.push('...');

    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);

    if (currentPage < totalPages - 2) pages.push('...');

    pages.push(totalPages);

  }



  container.innerHTML = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">上一页</button>` +

    pages.map(p => p === '...' ? '<span style="padding:6px">...</span>' : 

      `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="goToPage(${p})">${p}</button>`).join('') +

    `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">下一页</button>`;

}



function goToPage(page) {

  currentPage = page;

  renderJobList();

  renderPagination();

  window.scrollTo({ top: 0, behavior: 'smooth' });

}



function showJobDetail(jobId) {

  const job = filteredJobs[jobId];

  if (!job) return;

  const isApplied = appliedJobs[job.公司名称 + '_' + job.招聘岗位];

  const days = daysUntil(job.截止时间);

  

  document.getElementById('jobDetail').innerHTML = `

    <div class="card">

      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">

        <div>

          <h2 style="font-size:22px;font-weight:700;margin:0 0 8px">${job.公司名称}</h2>

          <div style="display:flex;gap:6px;flex-wrap:wrap">

            ${(job.批次 || []).map(b => `<span class="badge badge-blue">${b}</span>`).join('')}

            ${(job.行业大类 || []).map(i => `<span class="badge badge-purple">${i}</span>`).join('')}

            ${(job.企业性质 || []).map(n => `<span class="badge badge-gray">${n}</span>`).join('')}

            ${(job.是否需要笔试 || []).map(e => `<span class="badge badge-yellow">${e}</span>`).join('')}

          </div>

        </div>

        <button class="btn ${isApplied ? 'btn-secondary' : 'btn-primary'}" onclick="toggleApply('${job.公司名称.replace(/'/g, "\\'")}','${job.招聘岗位.replace(/'/g, "\\'")}')">

          ${isApplied ? '✓ 已投递（点击取消）' : '📮 标记已投递'}

        </button>

      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

        <div><div style="font-size:12px;color:#64748b;margin-bottom:4px">招聘岗位</div><div style="font-size:14px;font-weight:500">${job.招聘岗位 || '-'}</div></div>

        <div><div style="font-size:12px;color:#64748b;margin-bottom:4px">工作地点</div><div style="font-size:14px;font-weight:500">${(job.工作地点 || []).join('、') || job.工作地点文本 || '-'}</div></div>

        <div><div style="font-size:12px;color:#64748b;margin-bottom:4px">截止时间</div><div style="font-size:14px;font-weight:500">${job.截止时间 || '-'} ${days !== null && days <= 7 ? `<span class="badge badge-red">${days <= 0 ? '即将截止' : days + '天后'}</span>` : ''}</div></div>

        <div><div style="font-size:12px;color:#64748b;margin-bottom:4px">更新时间</div><div style="font-size:14px;font-weight:500">${job.更新时间 || '-'}</div></div>

        <div><div style="font-size:12px;color:#64748b;margin-bottom:4px">行业大类</div><div style="font-size:14px;font-weight:500">${(job.行业大类 || []).join('、') || '-'}</div></div>

        <div><div style="font-size:12px;color:#64748b;margin-bottom:4px">企业性质</div><div style="font-size:14px;font-weight:500">${(job.企业性质 || []).join('、') || '-'}</div></div>

        <div><div style="font-size:12px;color:#64748b;margin-bottom:4px">招聘对象</div><div style="font-size:14px;font-weight:500">${(job.招聘对象 || []).join('、') || '-'}</div></div>

        <div><div style="font-size:12px;color:#64748b;margin-bottom:4px">是否需要笔试</div><div style="font-size:14px;font-weight:500">${(job.是否需要笔试 || []).join('、') || '-'}</div></div>

      </div>

      ${job['备注/提示'] ? `<div style="margin-bottom:16px;padding:12px;background:#fffbeb;border-radius:8px;border-left:4px solid #f59e0b"><div style="font-size:12px;font-weight:600;color:#b45309;margin-bottom:4px">📌 备注提示</div><div style="font-size:13px;color:#78350f;white-space:pre-line">${job['备注/提示']}</div></div>` : ''}

      <div style="display:flex;gap:12px;flex-wrap:wrap">

        ${job.投递方式 ? `<a href="${extractUrl(job.投递方式)}" target="_blank" class="btn btn-primary">🔗 前往投递</a>` : ''}

        ${job.官方公告 ? `<a href="${extractUrl(job.官方公告)}" target="_blank" class="btn btn-secondary">📢 查看官方公告</a>` : ''}

      </div>

    </div>

  `;

  navigateTo('detail');

}



function toggleApply(company, position) {

  const key = company + '_' + position;

  if (appliedJobs[key]) {

    delete appliedJobs[key];

    showToast('已取消投递标记');

  } else {

    appliedJobs[key] = { company, position, date: getToday() };

    if (!deliveries.find(d => d.company === company && d.position === position)) {

      deliveries.push({ id: Date.now().toString(), company, position, date: getToday(), status: '已投递', nextDate: '', industry: '', location: '', salary: '', note: '从校招广场标记' });

      DB.set('deliveries', deliveries);

    }

    showToast('已标记投递，自动添加到投递追踪');

  }

  DB.set('appliedJobs', appliedJobs);

  renderJobList();

  renderStats();

}



function renderStats() {

  const jobs = window.jobsData || [];

  const total = jobs.length;

  const upcoming = jobs.filter(j => { const d = daysUntil(j.截止时间); return d !== null && d >= 0 && d <= 7; }).length;

  const batches = {};

  jobs.forEach(j => (j.批次 || []).forEach(b => batches[b] = (batches[b] || 0) + 1));

  

  const stats = [

    { label: '在招岗位总数', value: total, color: '#2563eb', action: 'resetFilters()' },

    { label: '7天内即将截止', value: upcoming, color: '#dc2626', action: 'filterUpcoming()' },

  ];

  

  const batchOrder = ['秋招', '实习', '暑期实习', '日常实习', '春招', '秋招提前批', '寒假实习'];

  batchOrder.forEach(b => {

    if (batches[b]) stats.push({ label: b, value: batches[b], color: '#64748b', action: `filterByBatch('${b}')` });

  });



  document.getElementById('statsRow').innerHTML = stats.map(s => 

    `<div class="stat-card" onclick="${s.action}">

      <div class="stat-number" style="color:${s.color}">${s.value}</div>

      <div class="stat-label">${s.label}</div>

    </div>`

  ).join('');

}



function filterUpcoming() {

  resetFilters();

  const jobs = window.jobsData || [];

  filteredJobs = jobs.filter(j => { const d = daysUntil(j.截止时间); return d !== null && d >= 0 && d <= 7; });

  document.getElementById('resultCount').textContent = filteredJobs.length;

  renderJobList();

  renderPagination();

}



function filterByBatch(batch) {

  resetFilters();

  activeFilters.batch = [batch];

  document.querySelector(`.filter-tag[data-key="batch"][data-value="${batch}"]`)?.classList.add('active');

  applyFilters();

}



function renderHome() {

  renderStats();

  applyFilters();

}



// ========== 平台导航 ==========

function renderPlatforms() {

  const platforms = window.platformsData || [];

  const container = document.getElementById('platformList');

  

  const categories = [

    { key: '官方平台', title: '🏛️ 官方平台' },

    { key: '央企', title: '🏢 央企招聘' },

    { key: '其他央企', title: '🏢 更多央企' },

    { key: '地方社保局', title: '📋 地方人社局（事业编）' },

    { key: '综合平台', title: '🔗 综合招聘平台' },

  ];



  container.innerHTML = categories.map(cat => {

    const items = platforms.filter(p => p[cat.key]);

    if (items.length === 0) return '';

    return `<div class="card">

      <h3 style="font-size:15px;font-weight:600;margin:0 0 12px">${cat.title} <span class="badge badge-gray">${items.length}</span></h3>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">

        ${items.map(item => {

          const text = item[cat.key];

          const url = extractUrl(text);

          const name = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/https?:\/\/[^\s]+/g, '').trim();

          return `<a href="${url}" target="_blank" style="display:block;padding:12px;background:#f8fafc;border-radius:8px;text-decoration:none;color:#334155;transition:all .2s;border:1px solid #e2e8f0" onmouseover="this.style.borderColor='#2563eb';this.style.background='#eff6ff'" onmouseout="this.style.borderColor='#e2e8f0';this.style.background='#f8fafc'">

            <div style="font-size:13px;font-weight:500">${name || url}</div>

          </a>`;

        }).join('')}

      </div>

    </div>`;

  }).join('');

}



// ========== 专业参考 ==========

let majorCategory = 'all';

function renderMajors() {

  const majors = window.majorsData || [];

  const search = document.getElementById('majorSearch').value.toLowerCase();

  

  const tabs = ['all', '哲学', '经济学', '法学', '教育学', '文学', '历史学', '理学', '工学', '农学', '医学', '管理学', '艺术学'];

  document.getElementById('majorCategoryTabs').innerHTML = tabs.map(t => 

    `<button class="btn btn-sm ${majorCategory === t ? 'btn-primary' : 'btn-secondary'}" onclick="setMajorCategory('${t}')">${t === 'all' ? '全部' : t}</button>`

  ).join('');



  let filtered = majors;

  if (majorCategory !== 'all') filtered = majors.filter(m => (m.专业名称 || '').includes(majorCategory));

  if (search) filtered = filtered.filter(m => 

    (m.专业名称 || '').toLowerCase().includes(search) || 

    (m.适合的岗位和公司 || '').toLowerCase().includes(search)

  );



  const container = document.getElementById('majorList');

  if (filtered.length === 0) {

    container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8">没有找到相关专业</div>';

    return;

  }



  container.innerHTML = filtered.map(m => `

    <div class="card" style="padding:16px;margin-bottom:10px">

      <div style="font-size:15px;font-weight:600;margin-bottom:8px">${m.专业名称 || '-'}</div>

      <div style="font-size:13px;color:#475569;line-height:1.8;white-space:pre-line">${m.适合的岗位和公司 || '-'}</div>

    </div>

  `).join('');

}

function setMajorCategory(c) { majorCategory = c; renderMajors(); }



// ========== 简历模板 ==========

const resumeSections = [

  { title: '个人信息', icon: '👤', content: `姓名：胡超强

电话：138-XXXX-XXXX

邮箱：example@email.com

现居城市：广东东莞

求职意向：机械设计工程师 / 非标自动化工程师

期望薪资：8-12K

到岗时间：随时到岗` },

  { title: '教育背景', icon: '🎓', content: `2022.09 - 2026.06  萍乡学院  机械设计制造及其自动化  本科

• GPA：3.5/4.0（专业前30%）

• 主修课程：机械设计、机械原理、材料力学、互换性与测量技术、液压与气动、PLC编程、SolidWorks、AutoCAD

• 英语水平：CET-6（520分）

• 荣誉：校级二等奖学金×2、三好学生` },

  { title: '实习经历', icon: '💼', content: `2025.03 - 2025.09  深圳市鑫信腾科技有限公司  机械设计实习生

• 负责非标自动化设备的SolidWorks三维建模与工程图出图，完成15+套设备零件图与装配图

• 参与设备BOM清单整理与物料选型，协助工程师完成气动元件、传感器、电机选型

• 跟进设备装配调试，记录并解决装配过程中10+个结构干涉问题

• 收获：熟练掌握SolidWorks高级装配、工程图标准化，了解非标设备从设计到交付的全流程` },

  { title: '项目经历', icon: '🔧', content: `2025.09 - 2026.01  基于PLC的物料分拣系统设计  项目负责人

• 设计一套基于西门子S7-1200 PLC的自动物料分拣系统，完成机械结构设计、电气原理图绘制与PLC程序编写

• 使用SolidWorks完成传送带、分拣机构、机架的三维建模与装配，输出完整工程图

• 编写梯形图程序实现物料识别、分拣、计数等功能，通过TIA Portal仿真验证

• 项目获校级机械创新设计大赛三等奖



2024.10 - 2025.01  多功能桌面级3D打印机改进设计  组员

• 针对现有FDM 3D打印机打印精度不足问题，设计改进Z轴双丝杠传动结构

• 使用ANSYS进行关键零件有限元分析，优化结构刚度

• 改进后打印层厚从0.2mm提升至0.1mm` },

  { title: '技能证书', icon: '📋', content: `• 软件技能：SolidWorks（熟练）、AutoCAD（熟练）、ANSYS（基础）、Mastercam（基础）

• 编程技能：PLC梯形图编程（西门子/三菱）、C语言基础、Python基础

• 专业技能：机械设计、公差配合、气动元件选型、传感器应用、非标设备装配调试

• 证书：大学英语六级、计算机二级、SolidWorks认证助理工程师、驾驶证C1

• 自我评价：动手能力强，善于从装配调试中发现设计问题并改进；有6个月非标自动化实习经验；学习能力强，能快速掌握新软件和新工艺。` }

];



function renderResume() {

  document.getElementById('resumeSections').innerHTML = resumeSections.map((s, idx) => `

    <div class="card" style="margin-bottom:12px">

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">

        <h4 style="font-size:15px;font-weight:600;margin:0">${s.icon} ${s.title}</h4>

        <button class="btn btn-secondary btn-sm" onclick="copyResumeSection(${idx})">📋 复制</button>

      </div>

      <pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;line-height:1.8;color:#334155;margin:0;background:#f8fafc;padding:12px;border-radius:8px">${s.content}</pre>

    </div>

  `).join('');

}

function copyResumeSection(idx) {

  navigator.clipboard.writeText(resumeSections[idx].content).then(() => showToast('已复制到剪贴板'));

}

function copyResumeAll() {

  const all = resumeSections.map(s => `【${s.title}】\n${s.content}`).join('\n\n');

  navigator.clipboard.writeText(all).then(() => showToast('全部简历已复制'));

}



// ========== 目标公司 ==========

function renderTargets() {

  const container = document.getElementById('targetList');

  if (targets.length === 0) {

    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏢</div><div class="empty-state-title">还没有目标公司</div><div class="empty-state-desc">列出心仪公司，按冲刺/稳妥/保底分类</div><button class="btn btn-primary btn-sm" onclick="openTargetModal()">➕ 添加公司</button></div>';

    return;

  }

  const priorityOrder = { '冲刺': 0, '稳妥': 1, '保底': 2 };

  const sorted = [...targets].sort((a,b) => (priorityOrder[a.priority] || 9) - (priorityOrder[b.priority] || 9));

  container.innerHTML = `<div class="table-wrap"><table><thead><tr><th>公司</th><th>意向岗位</th><th>优先级</th><th>状态</th><th>备注</th><th>操作</th></tr></thead><tbody>${sorted.map(t => `<tr>

    <td style="font-weight:500">${t.company}</td>

    <td>${t.position || '-'}</td>

    <td><span class="badge ${t.priority==='冲刺'?'badge-red':t.priority==='稳妥'?'badge-blue':'badge-green'}">${t.priority}</span></td>

    <td><span class="badge badge-gray">${t.status}</span></td>

    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.note || '-'}</td>

    <td><button class="btn btn-secondary btn-sm" onclick="editTarget('${t.id}')">编辑</button> <button class="btn btn-danger btn-sm" style="background:#fee2e2;color:#dc2626" onclick="deleteTarget('${t.id}')">删除</button></td>

  </tr>`).join('')}</tbody></table></div>`;

}

function openTargetModal(id) {

  editingTargetId = id || null;

  document.getElementById('targetModalTitle').textContent = id ? '编辑公司' : '添加目标公司';

  if (id) {

    const t = targets.find(x => x.id === id);

    document.getElementById('t_company').value = t.company;

    document.getElementById('t_position').value = t.position || '';

    document.getElementById('t_priority').value = t.priority;

    document.getElementById('t_status').value = t.status;

    document.getElementById('t_note').value = t.note || '';

  } else {

    ['t_company','t_position','t_note'].forEach(i => document.getElementById(i).value = '');

    document.getElementById('t_priority').value = '稳妥';

    document.getElementById('t_status').value = '未投递';

  }

  document.getElementById('targetModal').classList.add('active');

}

function saveTarget() {

  const company = document.getElementById('t_company').value.trim();

  if (!company) { showToast('请填写公司名称', 'error'); return; }

  const data = { id: editingTargetId || Date.now().toString(), company, position: document.getElementById('t_position').value, priority: document.getElementById('t_priority').value, status: document.getElementById('t_status').value, note: document.getElementById('t_note').value };

  if (editingTargetId) { const idx = targets.findIndex(x => x.id === editingTargetId); targets[idx] = data; }

  else targets.push(data);

  DB.set('targets', targets);

  closeModal('targetModal');

  renderTargets();

  showToast('保存成功');

}

function editTarget(id) { openTargetModal(id); }

function deleteTarget(id) { if (confirm('确定删除吗？')) { targets = targets.filter(x => x.id !== id); DB.set('targets', targets); renderTargets(); showToast('已删除'); } }



// ========== 投递追踪 ==========

document.querySelectorAll('#deliveryFilterBtns .filter-btn').forEach(btn => {

  btn.addEventListener('click', () => {

    document.querySelectorAll('#deliveryFilterBtns .filter-btn').forEach(b => b.classList.remove('active'));

    btn.classList.add('active');

    currentFilter = btn.dataset.filter;

    renderDeliveries();

  });

});



function renderDeliveries() {

  const search = document.getElementById('deliverySearch').value.toLowerCase();

  let list = deliveries;

  if (currentFilter !== 'all') list = list.filter(d => d.status === currentFilter);

  if (search) list = list.filter(d => d.company.toLowerCase().includes(search) || d.position.toLowerCase().includes(search));

  list = list.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));



  const container = document.getElementById('deliveryList');

  if (list.length === 0) {

    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-title">${deliveries.length === 0 ? '还没有投递记录' : '没有符合条件的记录'}</div><div class="empty-state-desc">${deliveries.length === 0 ? '去校招广场找岗位，点击「标记已投递」自动记录' : '试试其他筛选条件'}</div>${deliveries.length === 0 ? '<button class="btn btn-primary btn-sm" onclick="openDeliveryModal()">➕ 新增投递</button>' : ''}</div>`;

    return;

  }

  container.innerHTML = `<div class="table-wrap"><table><thead><tr><th>公司</th><th>岗位</th><th>投递时间</th><th>状态</th><th>下一节点</th><th>地点</th><th>操作</th></tr></thead><tbody>${list.map(d => `<tr>

    <td style="font-weight:500">${d.company}</td>

    <td>${d.position}</td>

    <td>${d.date || '-'}</td>

    <td><select onchange="updateDeliveryStatus('${d.id}',this.value)" style="width:auto;padding:2px 6px;font-size:12px">${['已投递','简历筛选中','笔试中','面试中','Offer','已签约','已拒绝'].map(s => `<option ${s===d.status?'selected':''}>${s}</option>`).join('')}</select></td>

    <td>${d.nextDate || '-'}</td>

    <td>${d.location || '-'}</td>

    <td><button class="btn btn-secondary btn-sm" onclick="editDelivery('${d.id}')">编辑</button> <button class="btn btn-danger btn-sm" style="background:#fee2e2;color:#dc2626" onclick="deleteDelivery('${d.id}')">删除</button></td>

  </tr>`).join('')}</tbody></table></div>`;

}

function updateDeliveryStatus(id, status) { const d = deliveries.find(x => x.id === id); if (d) { d.status = status; DB.set('deliveries', deliveries); showToast('状态已更新'); } }

function openDeliveryModal(id) {

  editingDeliveryId = id || null;

  document.getElementById('deliveryModalTitle').textContent = id ? '编辑投递' : '新增投递';

  if (id) {

    const d = deliveries.find(x => x.id === id);

    document.getElementById('d_company').value = d.company;

    document.getElementById('d_position').value = d.position;

    document.getElementById('d_date').value = d.date || '';

    document.getElementById('d_status').value = d.status;

    document.getElementById('d_nextDate').value = d.nextDate || '';

    document.getElementById('d_industry').value = d.industry || '';

    document.getElementById('d_location').value = d.location || '';

    document.getElementById('d_salary').value = d.salary || '';

    document.getElementById('d_note').value = d.note || '';

  } else {

    ['d_company','d_position','d_date','d_nextDate','d_industry','d_location','d_salary','d_note'].forEach(i => document.getElementById(i).value = '');

    document.getElementById('d_status').value = '已投递';

    document.getElementById('d_date').value = getToday();

  }

  document.getElementById('deliveryModal').classList.add('active');

}

function saveDelivery() {

  const company = document.getElementById('d_company').value.trim();

  const position = document.getElementById('d_position').value.trim();

  if (!company || !position) { showToast('请填写公司和岗位', 'error'); return; }

  const data = { id: editingDeliveryId || Date.now().toString(), company, position, date: document.getElementById('d_date').value, status: document.getElementById('d_status').value, nextDate: document.getElementById('d_nextDate').value, industry: document.getElementById('d_industry').value, location: document.getElementById('d_location').value, salary: document.getElementById('d_salary').value, note: document.getElementById('d_note').value };

  if (editingDeliveryId) { const idx = deliveries.findIndex(x => x.id === editingDeliveryId); deliveries[idx] = data; }

  else deliveries.push(data);

  DB.set('deliveries', deliveries);

  closeModal('deliveryModal');

  renderDeliveries();

  showToast('保存成功');

}

function editDelivery(id) { openDeliveryModal(id); }

function deleteDelivery(id) { if (confirm('确定删除吗？')) { deliveries = deliveries.filter(x => x.id !== id); DB.set('deliveries', deliveries); renderDeliveries(); showToast('已删除'); } }

function exportDeliveries() {

  if (deliveries.length === 0) { showToast('没有数据可导出', 'error'); return; }

  const data = deliveries.map(d => ({ '公司名称': d.company, '岗位名称': d.position, '投递时间': d.date, '状态': d.status, '下一节点': d.nextDate, '行业': d.industry, '地点': d.location, '薪资': d.salary, '备注': d.note }));

  let csv = '\uFEFF' + Object.keys(data[0]).join(',') + '\n';

  data.forEach(row => { csv += Object.values(row).map(v => `"${(v||'').toString().replace(/"/g,'""')}"`).join(',') + '\n'; });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');

  a.href = url; a.download = `秋招投递记录_${getToday()}.csv`;

  a.click(); URL.revokeObjectURL(url);

  showToast('已导出CSV（可用Excel打开）');

}



// ========== 面试复盘 ==========

function renderInterviews() {

  const container = document.getElementById('interviewList');

  if (interviews.length === 0) {

    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎤</div><div class="empty-state-title">还没有面试复盘</div><div class="empty-state-desc">每次面试后及时复盘，记录问题和改进方向</div><button class="btn btn-primary btn-sm" onclick="openInterviewModal()">➕ 新增复盘</button></div>';

    return;

  }

  const sorted = [...interviews].sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));

  container.innerHTML = sorted.map(i => `

    <div class="card" style="margin-bottom:12px">

      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">

        <div>

          <div style="font-size:15px;font-weight:600">${i.company} ${i.position ? '- ' + i.position : ''}</div>

          <div style="font-size:12px;color:#64748b;margin-top:4px">${i.date || '-'} · ${i.round} · ${i.type} · <span class="badge ${i.result==='通过'?'badge-green':i.result==='未通过'?'badge-red':'badge-yellow'}">${i.result}</span></div>

        </div>

        <div style="display:flex;gap:6px">

          <button class="btn btn-secondary btn-sm" onclick="editInterview('${i.id}')">编辑</button>

          <button class="btn btn-danger btn-sm" style="background:#fee2e2;color:#dc2626" onclick="deleteInterview('${i.id}')">删除</button>

        </div>

      </div>

      ${i.questions ? `<div style="margin-bottom:8px"><div style="font-size:12px;font-weight:600;color:#475569;margin-bottom:4px">❓ 被问到的问题</div><div style="font-size:13px;color:#334155;white-space:pre-line;background:#f8fafc;padding:8px 12px;border-radius:6px">${i.questions}</div></div>` : ''}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">

        ${i.good ? `<div><div style="font-size:12px;font-weight:600;color:#16a34a">✅ 答得好</div><div style="font-size:13px;color:#334155">${i.good}</div></div>` : ''}

        ${i.bad ? `<div><div style="font-size:12px;font-weight:600;color:#dc2626">❌ 待改进</div><div style="font-size:13px;color:#334155">${i.bad}</div></div>` : ''}

      </div>

      ${i.improve ? `<div style="margin-top:8px"><div style="font-size:12px;font-weight:600;color:#2563eb">💡 改进方向</div><div style="font-size:13px;color:#334155">${i.improve}</div></div>` : ''}

    </div>

  `).join('');

}

function openInterviewModal(id) {

  editingInterviewId = id || null;

  document.getElementById('interviewModalTitle').textContent = id ? '编辑复盘' : '新增面试复盘';

  if (id) {

    const i = interviews.find(x => x.id === id);

    document.getElementById('i_company').value = i.company;

    document.getElementById('i_position').value = i.position || '';

    document.getElementById('i_date').value = i.date || '';

    document.getElementById('i_round').value = i.round;

    document.getElementById('i_type').value = i.type;

    document.getElementById('i_result').value = i.result;

    document.getElementById('i_questions').value = i.questions || '';

    document.getElementById('i_good').value = i.good || '';

    document.getElementById('i_bad').value = i.bad || '';

    document.getElementById('i_improve').value = i.improve || '';

  } else {

    ['i_company','i_position','i_date','i_questions','i_good','i_bad','i_improve'].forEach(i => document.getElementById(i).value = '');

    document.getElementById('i_round').value = '一面';

    document.getElementById('i_type').value = '视频';

    document.getElementById('i_result').value = '待结果';

    document.getElementById('i_date').value = getToday();

  }

  document.getElementById('interviewModal').classList.add('active');

}

function saveInterview() {

  const company = document.getElementById('i_company').value.trim();

  if (!company) { showToast('请填写公司名称', 'error'); return; }

  const data = { id: editingInterviewId || Date.now().toString(), company, position: document.getElementById('i_position').value, date: document.getElementById('i_date').value, round: document.getElementById('i_round').value, type: document.getElementById('i_type').value, result: document.getElementById('i_result').value, questions: document.getElementById('i_questions').value, good: document.getElementById('i_good').value, bad: document.getElementById('i_bad').value, improve: document.getElementById('i_improve').value };

  if (editingInterviewId) { const idx = interviews.findIndex(x => x.id === editingInterviewId); interviews[idx] = data; }

  else interviews.push(data);

  DB.set('interviews', interviews);

  closeModal('interviewModal');

  renderInterviews();

  showToast('复盘已保存');

}

function editInterview(id) { openInterviewModal(id); }

function deleteInterview(id) { if (confirm('确定删除吗？')) { interviews = interviews.filter(x => x.id !== id); DB.set('interviews', interviews); renderInterviews(); showToast('已删除'); } }



// ========== 统计仪表盘 ==========

function renderDashboard() {

  const total = deliveries.length;

  const progress = deliveries.filter(d => ['已投递','简历筛选中','笔试中'].includes(d.status)).length;

  const interview = deliveries.filter(d => d.status === '面试中').length;

  const offer = deliveries.filter(d => ['Offer','已签约'].includes(d.status)).length;

  const reject = deliveries.filter(d => d.status === '已拒绝').length;

  const interviewCount = interviews.length;

  const passCount = interviews.filter(i => i.result === '通过').length;

  const successRate = interviewCount > 0 ? Math.round(passCount / interviewCount * 100) : 0;



  const funnelData = [

    { label: '已投递', count: total, color: '#2563eb' },

    { label: '简历筛选/笔试', count: deliveries.filter(d => ['简历筛选中','笔试中'].includes(d.status)).length, color: '#3b82f6' },

    { label: '面试中', count: interview, color: '#9333ea' },

    { label: 'Offer', count: offer, color: '#16a34a' },

    { label: '已签约', count: deliveries.filter(d => d.status === '已签约').length, color: '#15803d' },

  ];

  const maxCount = Math.max(...funnelData.map(f => f.count), 1);



  document.getElementById('dashboardContent').innerHTML = `

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px">

      <div class="stat-card"><div class="stat-number">${total}</div><div class="stat-label">投递总数</div></div>

      <div class="stat-card"><div class="stat-number" style="color:#2563eb">${progress}</div><div class="stat-label">进行中</div></div>

      <div class="stat-card"><div class="stat-number" style="color:#9333ea">${interview}</div><div class="stat-label">面试中</div></div>

      <div class="stat-card"><div class="stat-number" style="color:#16a34a">${offer}</div><div class="stat-label">Offer数</div></div>

      <div class="stat-card"><div class="stat-number" style="color:#dc2626">${reject}</div><div class="stat-label">已拒绝</div></div>

      <div class="stat-card"><div class="stat-number" style="color:#f59e0b">${successRate}%</div><div class="stat-label">面试通过率</div></div>

    </div>

    <div class="card">

      <h3 style="font-size:15px;font-weight:600;margin:0 0 16px">📈 投递漏斗</h3>

      ${funnelData.map(f => `

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">

          <div style="width:120px;font-size:13px;color:#475569;text-align:right">${f.label}</div>

          <div style="flex:1;height:32px;background:${f.color}20;border-radius:4px;display:flex;align-items:center;padding-left:10px;font-size:13px;font-weight:500;color:${f.color};min-width:40px;width:${Math.max(f.count/maxCount*100, 8)}%">${f.count}</div>

        </div>

      `).join('')}

    </div>

    <div class="card">

      <h3 style="font-size:15px;font-weight:600;margin:0 0 12px">📋 最近投递</h3>

      ${deliveries.length === 0 ? '<div style="text-align:center;padding:20px;color:#94a3b8;font-size:13px">暂无投递记录</div>' : 

        `<div class="table-wrap"><table><thead><tr><th>公司</th><th>岗位</th><th>投递时间</th><th>状态</th></tr></thead><tbody>${deliveries.slice(0,5).map(d => `<tr><td style="font-weight:500">${d.company}</td><td>${d.position}</td><td>${d.date || '-'}</td><td><span class="badge badge-blue">${d.status}</span></td></tr>`).join('')}</tbody></table></div>`}

    </div>

  `;

}



// ========== 节点提醒 ==========

function renderReminders() {

  const all = [];

  deliveries.forEach(d => { if (d.nextDate) all.push({ type: '投递节点', company: d.company, position: d.position, date: d.nextDate, status: d.status }); });

  interviews.forEach(i => { if (i.date) all.push({ type: '面试', company: i.company, position: i.position, date: i.date, status: i.round + ' ' + i.type }); });

  all.sort((a,b) => new Date(a.date) - new Date(b.date));



  const container = document.getElementById('reminderList');

  if (all.length === 0) {

    container.innerHTML = '<div style="text-align:center;padding:30px;color:#94a3b8;font-size:13px">暂无待办事项，添加投递或面试后自动生成提醒</div>';

    return;

  }

  container.innerHTML = all.map(r => {

    const days = daysUntil(r.date);

    let badge = '';

    if (days !== null) {

      if (days < 0) badge = '<span class="badge badge-gray">已过</span>';

      else if (days === 0) badge = '<span class="badge badge-red">今天</span>';

      else if (days <= 3) badge = `<span class="badge badge-red">${days}天后</span>`;

      else if (days <= 7) badge = `<span class="badge badge-yellow">${days}天后</span>`;

      else badge = `<span class="badge badge-gray">${days}天后</span>`;

    }

    return `<div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:8px;margin-bottom:8px;${days !== null && days >= 0 && days <= 3 ? 'background:#fef2f2;border-left:4px solid #ef4444' : days !== null && days >= 0 && days <= 7 ? 'background:#fffbeb;border-left:4px solid #f59e0b' : 'background:#f8fafc'}">

      <span style="font-size:18px">${r.type === '面试' ? '🎤' : '📮'}</span>

      <div style="flex:1">

        <div style="font-size:13px;font-weight:500">${r.company} - ${r.position}</div>

        <div style="font-size:11px;color:#64748b">${r.type} · ${r.date} · ${r.status}</div>

      </div>

      ${badge}

    </div>`;

  }).join('');

}



// ========== 数据管理 ==========

function renderDataStats() {

  document.getElementById('dataStats').innerHTML = `

    投递记录：${deliveries.length} 条<br>

    面试复盘：${interviews.length} 条<br>

    目标公司：${targets.length} 家<br>

    已标记投递岗位：${Object.keys(appliedJobs).length} 条<br>

    校招岗位数据：${(window.jobsData || []).length} 条<br>

    专业参考：${(window.majorsData || []).length} 条<br>

    数据存储：浏览器本地（localStorage）<br>

    最后更新：${new Date().toLocaleString('zh-CN')}

  `;

}

function exportAllData() {

  const data = { deliveries, interviews, targets, appliedJobs, exportTime: new Date().toISOString(), version: '1.0' };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');

  a.href = url; a.download = `秋招求职数据备份_${getToday()}.json`;

  a.click(); URL.revokeObjectURL(url);

  showToast('数据已导出');

}

function importAllData(event) {

  const file = event.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e) => {

    try {

      const data = JSON.parse(e.target.result);

      if (data.deliveries) deliveries = data.deliveries;

      if (data.interviews) interviews = data.interviews;

      if (data.targets) targets = data.targets;

      if (data.appliedJobs) appliedJobs = data.appliedJobs;

      DB.set('deliveries', deliveries);

      DB.set('interviews', interviews);

      DB.set('targets', targets);

      DB.set('appliedJobs', appliedJobs);

      showToast('数据导入成功');

      renderDataStats();

    } catch(err) { showToast('导入失败：文件格式错误', 'error'); }

  };

  reader.readAsText(file);

}

function clearAllData() {

  if (confirm('确定清空所有数据吗？此操作不可恢复，建议先导出备份！')) {

    if (confirm('再次确认：真的要删除所有投递记录、面试复盘、目标公司吗？')) {

      ['deliveries','interviews','targets','appliedJobs'].forEach(k => localStorage.removeItem('campus_' + k));

      deliveries = []; interviews = []; targets = []; appliedJobs = {};

      renderDataStats();

      showToast('所有数据已清空');

    }

  }

}



// ========== 初始化 ==========

document.getElementById('todayDate').textContent = new Date().toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric', weekday:'long' });

document.getElementById('currentStage').textContent = getCurrentStage();

document.getElementById('todayBadge').textContent = getCurrentStage();



function initApp() {

  if (window.jobsData) {

    initFilters();

    renderHome();

  } else {

    setTimeout(initApp, 100);

  }

}

initApp();



document.querySelectorAll('.modal-overlay').forEach(overlay => {

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });

});

