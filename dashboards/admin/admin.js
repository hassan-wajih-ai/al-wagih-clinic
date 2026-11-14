/**
 * منطق لوحة تحكم مدير العيادة الشامل (Clinic Admin Controller)
 * يشمل: الفروع، التعاقدات والخصومات، مطالبات الشركات، جرد المخزن، والموارد البشرية HR
 */

const ClinicAdminApp = {
    currentAdmin: null,
    activeTab: 'analytics',
    branches: [],
    contracts: [],
    inventory: [],
    employees: [],
    revenueChartInstance: null,
    attendanceChartInstance: null,

    async init() {
        const authData = await Auth.protectRoute(['admin', 'superadmin']);
        if (!authData) return;

        this.currentAdmin = authData.profile;
        if (this.currentAdmin) {
            document.getElementById('user-display-name').textContent = this.currentAdmin.full_name || 'مدير العيادة';
            document.getElementById('clinic-title').textContent = this.currentAdmin.clinics ? this.currentAdmin.clinics.name : 'إدارة العيادة وفروعها';
        }

        await this.loadAllData();
        this.initCharts();
        this.bindEvents();
    },

    async loadAllData() {
        // تحميل الفروع، الشركات، المخزن، والموظفين
        this.branches = this.getMockBranches();
        this.contracts = this.getMockContracts();
        this.inventory = this.getMockInventory();
        this.employees = this.getMockEmployees();

        this.renderBranches();
        this.renderContracts();
        this.renderInventory();
        this.renderEmployees();
        this.updateKPIs();
    },

    switchTab(tabId) {
        this.activeTab = tabId;
        const tabs = ['analytics', 'contracts', 'inventory', 'hr', 'branches'];
        tabs.forEach(t => {
            const el = document.getElementById(`tab-content-${t}`);
            const btn = document.getElementById(`tab-btn-${t}`);
            if (el) el.classList.toggle('hidden', t !== tabId);
            if (btn) {
                if (t === tabId) {
                    btn.className = 'px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 text-white shadow-sm transition';
                } else {
                    btn.className = 'px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 transition';
                }
            }
        });
    },

    // 1. الشركات والتعاقدات والفواتير
    renderContracts() {
        const tbody = document.getElementById('contracts-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.contracts.map(c => `
            <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                <td class="py-3 px-4 font-bold text-slate-900">${c.name}</td>
                <td class="py-3 px-4">
                    <span class="px-2.5 py-1 text-xs font-extrabold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        ${c.discount_percentage}% خصم
                    </span>
                </td>
                <td class="py-3 px-4 text-slate-600">${c.contact_person || '—'} (${c.phone || '—'})</td>
                <td class="py-3 px-4 text-slate-600 font-mono">${c.active_cases || 15} حالة</td>
                <td class="py-3 px-4 font-bold text-slate-900">${Utils.formatCurrency(c.total_claim || 3200)}</td>
                <td class="py-3 px-4 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                        <button onclick="ClinicAdminApp.issueCorporateInvoice('${c.id}')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition">
                            📑 إصدار مطالبة
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // ملء قائمة الفواتير
        const select = document.getElementById('claim-contract-select');
        if (select) {
            select.innerHTML = this.contracts.map(c => `
                <option value="${c.id}">${c.name} (خصم ${c.discount_percentage}%)</option>
            `).join('');
        }
    },

    issueCorporateInvoice(contractId) {
        const contract = this.contracts.find(c => c.id === contractId);
        if (!contract || !window.Reports) return;

        // توليد كشوفات تجريبية للمطالبة
        const sampleAppts = [
            { patient_name: 'أحمد سعيد عبد الفتاح', file_number: 'FILE-1042', amount: 250, date: '2026-11-02', doctor_name: 'د. أحمد الشناوي' },
            { patient_name: 'هالة محمود مرسي', file_number: 'FILE-1088', amount: 200, date: '2026-11-05', doctor_name: 'د. سارة محمود' },
            { patient_name: 'محمود عبد العزيز', file_number: 'FILE-1120', amount: 300, date: '2026-11-09', doctor_name: 'د. كريم عبد العزيز' },
            { patient_name: 'نادية إبراهيم', file_number: 'FILE-1145', amount: 200, date: '2026-11-12', doctor_name: 'د. أحمد الشناوي' }
        ];

        Reports.exportCorporateClaimToExcel(contract, sampleAppts, `INV-${contract.id}-${Date.now().toString().slice(-4)}`);
    },

    printCorporateInvoice(contractId) {
        const contract = this.contracts.find(c => c.id === contractId) || this.contracts[0];
        if (!contract || !window.Reports) return;

        const sampleAppts = [
            { patient_name: 'أحمد سعيد عبد الفتاح', amount: 250, date: '2026-11-02', doctor_name: 'د. أحمد الشناوي' },
            { patient_name: 'هالة محمود مرسي', amount: 200, date: '2026-11-05', doctor_name: 'د. سارة محمود' },
            { patient_name: 'محمود عبد العزيز', amount: 300, date: '2026-11-09', doctor_name: 'د. كريم عبد العزيز' }
        ];

        Reports.printCorporateClaimPDF(contract, sampleAppts);
    },

    // 2. جرد المخزن والمستلزمات الطبية
    renderInventory() {
        const tbody = document.getElementById('inventory-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.inventory.map(item => {
            const isLow = item.quantity <= item.min_threshold;
            const badge = isLow 
                ? '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 animate-pulse">⚠️ رصيد منخفض</span>'
                : '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">متوفر</span>';

            return `
                <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                    <td class="py-3 px-4 font-bold text-slate-900">${item.name}</td>
                    <td class="py-3 px-4 text-slate-600">${item.category}</td>
                    <td class="py-3 px-4 font-mono font-bold text-slate-800">${item.quantity} ${item.unit}</td>
                    <td class="py-3 px-4 font-mono text-slate-500">${item.min_threshold} ${item.unit}</td>
                    <td class="py-3 px-4">${badge}</td>
                    <td class="py-3 px-4 font-mono">${item.expiry_date || '—'}</td>
                    <td class="py-3 px-4 text-center">
                        <button onclick="ClinicAdminApp.adjustStock('${item.id}', 10)" class="px-2 py-1 text-[10px] font-bold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200">
                            + إضافة 10
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    adjustStock(itemId, qty) {
        const item = this.inventory.find(i => i.id === itemId);
        if (item) {
            item.quantity += qty;
            Utils.showToast(`تمت إضافة ${qty} إلى رصيد: ${item.name}`, 'success');
            this.renderInventory();
        }
    },

    exportInventoryExcel() {
        if (window.Reports) Reports.exportInventoryToExcel(this.inventory);
    },

    // 3. الموارد البشرية والرواتب (HR & Payroll)
    renderEmployees() {
        const tbody = document.getElementById('hr-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.employees.map(emp => {
            const base = Number(emp.base_salary || 0);
            const allow = Number(emp.allowances || 0);
            const ded = Number(emp.deductions || 0);
            const net = base + allow - ded;

            return `
                <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                    <td class="py-3 px-4 font-bold text-slate-900">${emp.full_name}</td>
                    <td class="py-3 px-4 text-slate-600">${emp.job_title}</td>
                    <td class="py-3 px-4 font-mono text-slate-700">${Utils.formatCurrency(base)}</td>
                    <td class="py-3 px-4 font-mono text-emerald-600">+${Utils.formatCurrency(allow)}</td>
                    <td class="py-3 px-4 font-mono text-rose-600">-${Utils.formatCurrency(ded)}</td>
                    <td class="py-3 px-4 font-mono font-bold text-slate-900">${Utils.formatCurrency(net)}</td>
                    <td class="py-3 px-4 text-center">
                        <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">معتمد</span>
                    </td>
                </tr>
            `;
        }).join('');
    },

    exportPayrollExcel() {
        if (window.Reports) Reports.exportPayrollToExcel(this.employees, 'نوفمبر 2026');
    },

    // 4. الفروع ومؤشرات الأداء
    renderBranches() {
        const container = document.getElementById('branches-list');
        if (!container) return;

        container.innerHTML = this.branches.map(b => `
            <div class="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
                <div>
                    <h4 class="font-bold text-sm text-slate-800">${b.name}</h4>
                    <p class="text-xs text-slate-500 mt-0.5">📍 ${b.address} | 📞 ${b.phone}</p>
                </div>
                <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">فرع نشط</span>
            </div>
        `).join('');
    },

    updateKPIs() {
        const totalCash = 4850;
        const totalCorpClaims = this.contracts.reduce((acc, c) => acc + (c.total_claim || 0), 0);
        const lowStockCount = this.inventory.filter(i => i.quantity <= i.min_threshold).length;

        document.getElementById('kpi-revenue').textContent = Utils.formatCurrency(totalCash);
        document.getElementById('kpi-corporate-claims').textContent = Utils.formatCurrency(totalCorpClaims);
        document.getElementById('kpi-contracts-count').textContent = `${this.contracts.length} شركات`;
        document.getElementById('kpi-inventory-alerts').textContent = `${lowStockCount} أصناف حرجة`;
    },

    initCharts() {
        if (!window.Reports) return;

        this.revenueChartInstance = Reports.initRevenueChart('admin-revenue-chart', 
            ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
            [3500, 4200, 4800, 5100, 4850, 6400, 2900]
        );

        this.attendanceChartInstance = Reports.initAttendanceChart('admin-attendance-chart', 82, 6, 12);
    },

    exportClinicSummaryExcel() {
        if (typeof XLSX === 'undefined') return;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.contracts), 'الشركات المتعاقدة');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.inventory), 'جرد المستلزمات الطبية');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.employees), 'كادر الموظفين والرواتب');

        XLSX.writeFile(wb, `التقرير_الشامل_${new Date().toISOString().split('T')[0]}.xlsx`);
        Utils.showToast('تم تصدير التقرير الشامل بنجاح', 'success');
    },

    bindEvents() {
        // إضافة شركة متعاقدة جديدة
        const addContractForm = document.getElementById('add-contract-form');
        const addContractModal = document.getElementById('add-contract-modal');
        if (addContractForm && addContractModal) {
            addContractForm.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('contract-name-input').value.trim();
                const discount = parseFloat(document.getElementById('contract-discount-input').value || 0);
                const contact = document.getElementById('contract-contact-input').value.trim();
                const phone = document.getElementById('contract-phone-input').value.trim();

                const newContract = {
                    id: 'c_' + Date.now(),
                    name,
                    discount_percentage: discount,
                    contact_person: contact,
                    phone,
                    active_cases: 0,
                    total_claim: 0
                };

                this.contracts.unshift(newContract);
                Utils.showToast(`تمت إضافة شركة ${name} بنسبة خصم ${discount}% بنجاح`, 'success');
                addContractModal.classList.add('hidden');
                addContractForm.reset();
                this.renderContracts();
                this.updateKPIs();
            };
        }

        // إضافة صنف مخزن جديد
        const addStockForm = document.getElementById('add-stock-form');
        const addStockModal = document.getElementById('add-stock-modal');
        if (addStockForm && addStockModal) {
            addStockForm.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('stock-name-input').value.trim();
                const category = document.getElementById('stock-category-input').value;
                const qty = parseInt(document.getElementById('stock-qty-input').value || 0, 10);
                const minThreshold = parseInt(document.getElementById('stock-min-input').value || 10, 10);
                const unit = document.getElementById('stock-unit-input').value.trim() || 'قطعة';

                this.inventory.unshift({
                    id: 'inv_' + Date.now(),
                    name,
                    category,
                    quantity: qty,
                    min_threshold: minThreshold,
                    unit,
                    unit_price: 25,
                    expiry_date: '2028-01-01'
                });

                Utils.showToast(`تمت إضافة الصنف ${name} إلى المخزن`, 'success');
                addStockModal.classList.add('hidden');
                addStockForm.reset();
                this.renderInventory();
                this.updateKPIs();
            };
        }
    },

    getMockContracts() {
        return [
            { id: 'c1', name: 'شركة مصر للتأمين', discount_percentage: 20, contact_person: 'أ. سامح عبد الفتاح', phone: '01011223344', active_cases: 18, total_claim: 3600 },
            { id: 'c2', name: 'نقابة المهندسين', discount_percentage: 25, contact_person: 'د. طارق مراد', phone: '01122334455', active_cases: 24, total_claim: 4500 },
            { id: 'c3', name: 'بتروتريد للخدمات البترولية', discount_percentage: 30, contact_person: 'م. خالد جلال', phone: '01233445566', active_cases: 12, total_claim: 2520 },
            { id: 'c4', name: 'أكسا للتأمين الطبي (AXA)', discount_percentage: 15, contact_person: 'أ. مروة الشريف', phone: '01555667788', active_cases: 31, total_claim: 6580 }
        ];
    },

    getMockInventory() {
        return [
            { id: 'i1', name: 'شاش طبي معقم 10*10سم', category: 'مستلزمات طبية', quantity: 8, min_threshold: 20, unit: 'علبة', unit_price: 35, expiry_date: '2027-06-30' },
            { id: 'i2', name: 'سرنجات طبية 5 سم (معقمة)', category: 'مستلزمات طبية', quantity: 150, min_threshold: 50, unit: 'قطعة', unit_price: 5, expiry_date: '2028-12-31' },
            { id: 'i3', name: 'محلول ملحي معقم (Saline 0.9%)', category: 'أدوية ومحاليل', quantity: 5, min_threshold: 15, unit: 'زجاجة', unit_price: 25, expiry_date: '2026-12-15' },
            { id: 'i4', name: 'جوانتيات طبية لاتكس (مقاس M)', category: 'مستلزمات وقاية', quantity: 45, min_threshold: 20, unit: 'علبة', unit_price: 90, expiry_date: '2029-05-20' },
            { id: 'i5', name: 'كانيولا وريدية زرقاء مقاس 22', category: 'مستلزمات طبية', quantity: 12, min_threshold: 25, unit: 'قطعة', unit_price: 15, expiry_date: '2027-11-01' }
        ];
    },

    getMockEmployees() {
        return [
            { id: 'e1', full_name: 'د. أحمد الشناوي', job_title: 'استشاري باطنة وجهاز هضمي', base_salary: 15000, allowances: 2500, deductions: 0 },
            { id: 'e2', full_name: 'د. سارة محمود', job_title: 'أخصائي طب الأطفال', base_salary: 12000, allowances: 1800, deductions: 200 },
            { id: 'e3', full_name: 'أحمد فؤاد', job_title: 'مشرف استقبال (وردية صباحية)', base_salary: 5000, allowances: 800, deductions: 150 },
            { id: 'e4', full_name: 'ريم مصطفى', job_title: 'موظف استقبال وخزينة (وردية مسائية)', base_salary: 4800, allowances: 600, deductions: 0 },
            { id: 'e5', full_name: 'أمل إبراهيم', job_title: 'تمريض العيادة ومسؤول التعقيم', base_salary: 4500, allowances: 500, deductions: 100 }
        ];
    },

    getMockBranches() {
        return [
            { id: 'b1', name: 'فرع المعادي الرئيسي', address: 'شارع النصر، المعادي', phone: '01011112222' },
            { id: 'b2', name: 'فرع التجمع الخامس', address: 'التسعين الشمالي، مول النخيل', phone: '01033334444' }
        ];
    }
};

window.ClinicAdminApp = ClinicAdminApp;
document.addEventListener('DOMContentLoaded', () => ClinicAdminApp.init());
