/* -------------------------------------------------------------
3.1 ตัวแปรระบบและการเชื่อมต่อ
------------------------------------------------------------- */
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwQBH2f0EnEn-Hoq-xlnIdI-dPJ5EKsigpafqIHaGq7mYzIMQ2vJLy8gf-m4oaxcja4/exec';
let currentUserRole = 'OWNER';
let myChart = null;
let DB = { categories: [], tasks: [], indicators: [], evidences: [], evaluations: {} };

/* -------------------------------------------------------------
3.2 ฟังก์ชันเริ่มต้นเมื่อเปิดเว็บ
------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();

    // อ่านค่า Role จาก URL (เช่น ?role=evaluator)
    const urlParams = new URLSearchParams(window.location.search);
    currentUserRole = urlParams.get('role') === 'evaluator' ? 'EVALUATOR' : 'OWNER';

    await fetchInitialData();
    setupUIForRole();
});

/* -------------------------------------------------------------
3.3 ฟังก์ชันติดต่อ API (Fetch)
------------------------------------------------------------- */
async function fetchInitialData() {
    Swal.fire({ title: 'กำลังโหลดข้อมูล...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    try {
        const res = await fetch(`${GAS_WEB_APP_URL}?action=getInitialData`);
        const result = await res.json();
        if (result.status === 'success') { DB = result.data; Swal.close(); }
    } catch (e) {
        Swal.fire('Error', 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error');
    }
}

async function apiPostCall(action, payload) {
    try {
        const res = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ action: action, data: payload })
        });
        return await res.json();
    } catch (e) {
        return { status: 'error', message: 'Network Error' };
    }
}

/* -------------------------------------------------------------
3.4 ฟังก์ชันจัดการ UI และ Navigation
------------------------------------------------------------- */
function setupUIForRole() {
    const isOwner = currentUserRole === 'OWNER';
    document.getElementById('userRoleDisplay').innerText = isOwner ? 'ผู้รับการประเมิน' : 'หัวหน้าผู้ประเมิน';

    const badge = document.getElementById('roleBadge');
    badge.innerHTML = isOwner ? 'โหมดผู้รับการประเมิน' : 'โหมดหัวหน้า (ผู้ประเมิน)';
    badge.className = isOwner ? 'px-3 py-1.5 rounded-lg border font-bold text-sm hidden md:block border-blue-200 bg-blue-50 text-royal-blue' 
                              : 'px-3 py-1.5 rounded-lg border font-bold text-sm hidden md:block border-orange-200 bg-orange-50 text-brand-orange';

    document.getElementById('nav-evidence').classList.toggle('hidden', !isOwner);
    document.getElementById('nav-evidence').classList.toggle('flex', isOwner);
    document.getElementById('nav-evaluate').classList.toggle('hidden', isOwner);
    document.getElementById('nav-evaluate').classList.toggle('flex', !isOwner);

    navigate('dashboard');
}

function navigate(viewId) {
    document.querySelectorAll('#mainContent > div').forEach(el => el.classList.add('hidden'));
    document.getElementById(`view-${viewId}`).classList.remove('hidden');

    if(viewId === 'dashboard') renderDashboard();
    if(viewId === 'categories') renderCategoriesView();
    if(viewId === 'evidence') renderEvidenceTable();
    if(viewId === 'evaluate') renderEvaluatorList();
}

function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    sb.classList.toggle('hidden'); sb.classList.toggle('flex');
    document.getElementById('sidebarOverlay').classList.toggle('hidden');
}

function showLinkModal() {
    const baseUrl = window.location.href.split('?')[0];
    document.getElementById('linkOwnerDisplay').innerText = baseUrl + '?role=owner';
    document.getElementById('linkEvaluatorDisplay').innerText = baseUrl + '?role=evaluator';
    document.getElementById('linkModal').classList.remove('hidden');
}

/* -------------------------------------------------------------
3.5 ฟังก์ชัน Render ข้อมูล (Dashboard & Categories)
------------------------------------------------------------- */
function renderDashboard() {
    const totalInd = DB.indicators.length;
    const indWithEv = new Set(DB.evidences.flatMap(e => e.indicators)).size;

    document.getElementById('dashEvidenceCount').innerText = `${indWithEv}/${totalInd}`;
    document.getElementById('dashEvidencePercent').innerText = totalInd ? Math.round((indWithEv/totalInd)*100) + '%' : '0%';

    const container = document.getElementById('categoryCardsContainer');
    container.innerHTML = '';

    DB.categories.forEach(cat => {
        const tasksInCat = DB.tasks.filter(t => t.catId === cat.id);
        const taskIds = tasksInCat.map(t => t.id);
        const indInCat = DB.indicators.filter(i => taskIds.includes(i.taskId));
        
        let evCount = indInCat.filter(i => DB.evidences.some(e => e.indicators.includes(i.id))).length;
        const prog = indInCat.length ? Math.round((evCount / indInCat.length) * 100) : 0;
        
        container.innerHTML += `
            <div class="bg-white rounded-2xl border p-6">
                <h4 class="text-xl font-bold ${cat.textClass} mb-4">${cat.title} <span class="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded ml-2">น้ำหนัก ${cat.weight}%</span></h4>
                <div class="w-full bg-gray-100 rounded-full h-2.5 mb-2"><div class="bg-brand-orange h-2.5 rounded-full" style="width:${prog}%"></div></div>
                <p class="text-sm text-gray-500 text-right">${prog}% Complete</p>
            </div>
        `;
    });
}

function renderCategoriesView() {
    const container = document.getElementById('taskDetailsContainer');
    container.innerHTML = '';

    DB.categories.forEach(cat => {
        let html = `<div class="mb-8"><h3 class="text-xl font-bold bg-deep-navy text-white p-4 rounded-t-xl">${cat.title}</h3><div class="bg-white border p-4 rounded-b-xl">`;
        
        DB.tasks.filter(t => t.catId === cat.id).forEach(task => {
            html += `<div class="font-bold text-lg text-text-main mt-4 mb-2 pl-2 border-l-4 border-royal-blue">${task.title}</div>`;
            
            DB.indicators.filter(i => i.taskId === task.id).forEach(ind => {
                const evs = DB.evidences.filter(e => e.indicators.includes(ind.id));
                html += `
                    <div class="p-3 bg-gray-50 border rounded-lg mb-2 flex justify-between items-center cursor-pointer hover:border-royal-blue" onclick="document.getElementById('acc-${ind.id}').classList.toggle('open')">
                        <div><span class="font-bold text-royal-blue">${ind.code} ${ind.title}</span> (น้ำหนัก ${ind.weight})</div>
                        <div class="text-sm bg-white px-2 border rounded">${evs.length} หลักฐาน</div>
                    </div>
                    <div id="acc-${ind.id}" class="accordion-content bg-white border border-t-0 -mt-3 mb-2 rounded-b-lg px-4"><br>
                        <p class="text-sm text-gray-600 mb-2"><b>รายการหลักฐาน:</b></p>
                        ${evs.map(e => `<a href="${e.url}" target="_blank" class="block text-sm text-royal-blue mb-1">🔗 ${e.title}</a>`).join('') || '<span class="text-sm text-gray-400">- ไม่มี -</span>'}
                        <br><br>
                    </div>
                `;
            });
        });
        container.innerHTML += html + '</div></div>';
    });
}

/* -------------------------------------------------------------
3.6 ฟังก์ชันจัดการหลักฐาน (Evidence CRUD)
------------------------------------------------------------- */
function renderEvidenceTable() {
    const tbody = document.getElementById('evidenceTableBody');
    tbody.innerHTML = DB.evidences.map(e => `<tr class="border-b"> <td class="p-3">${e.title}</td><td class="p-3">${e.type}</td><td class="p-3">${e.indicators.join(', ')}</td> <td class="p-3 text-center"><button onclick="deleteEvidence('${e.id}')" class="text-red-500 hover:bg-red
