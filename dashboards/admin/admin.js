/**
 * منطق لوحة تحكم مدير العيادة الشامل المتطور (Enterprise Clinic Admin Controller)
 * يشمل: نظام CRM للمرضى، HR قوي بالبصمة والجزاءات والجدول التشغيلي، المخازن والمشتريات، والتعاقدات بنسبة التحمل Co-pay
 * يدعم التصدير الكامل لجميع الجداول والشيتات إلى ملفات Excel
 */

const ClinicAdminApp = {
    currentAdmin: null,
    activeTab: 'crm',
    crmPatients: [],
    attendanceLogs: [],
    penalties: [],
    roster: [],
    suppliers: [],
    inventory: [],
    contracts: [],
    employees: [],
    revenueChartInstance: null,

    async init() {
        const authData = await Auth.protectRoute(['admin', 'superadmin']);
        if (!authData) return;

        this.currentAdmin = authData.profile;
        if (this.currentAdmin) {
            const nameEl = document.getElementById('user-display-name');
            const titleEl = document.getElementById('clinic-title');
            if (nameEl) nameEl.textContent = this.currentAdmin.full_name || 'مدير العيادة';
            if (titleEl) titleEl.textContent = this.currentAdmin.clinics ? this.currentAdmin.clinics.name : 'إدارة العيادة والمستشفى';
        }

        await this.loadAllEnterpriseData();
        this.bindEvents();
    },

    async loadAllEnterpriseData() {
        this.crmPatients = this.getMockCRMPatients();
        this.attendanceLogs = this.getMockAttendanceLogs();
        this.penalties = this.getMockPenalties();
        this.roster = this.getMockRoster();
        this.suppliers = this.getMockSuppliers();
        this.inventory = this.getMockInventory();
        this.contracts = this.getMockContracts();
        this.employees = this.getMockEmployees();

        this.renderCRM();
        this.renderAttendance();
        this.renderPenalties();
        this.renderRoster();
        this.renderSuppliers();
        this.renderInventory();
        this.renderContracts();
        this.updateKPIs();
    },

    switchTab(tabId) {
        this.activeTab = tabId;
        const tabs = ['crm', 'hr_biometric', 'procurement', 'contracts', 'inventory'];
        tabs.forEach(t => {
            const el = document.getElementById(`tab-content-${t}`);
            const btn = document.getElementById(`tab-btn-${t}`);
            if (el) el.classList.toggle('hidden', t !== tabId);
            if (btn) {
                if (t === tabId) {
                    btn.className = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-sky-600 text-white shadow-sm transition';
                } else {
                    btn.className = 'px-3.5 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 transition';
                }
            }
        });
    },

    // 1. نظام CRM متكامل للمرضى
    renderCRM() {
        const tbody = document.getElementById('crm-table-body');
        if (!tbody) return;

        const stageBadges = {
            new: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">استفسار جديد</span>',
            contacted: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">تم التواصل</span>',
            booked: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">حجز موعد</span>',
            visited: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">تم الكشف</span>',
            follow_up: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">متابعة دورية</span>'
        };

        const tierBadges = {
            regular: '<span class="text-slate-500 font-semibold">عادي</span>',
            vip: '<span class="text-amber-600 font-bold">⭐ VIP</span>',
            chronic: '<span class="text-rose-600 font-bold">🩺 مزمن</span>',
            corporate: '<span class="text-purple-600 font-bold">🏢 تعاقد</span>'
        };

        tbody.innerHTML = this.crmPatients.map(p => `
            <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                <td class="py-3 px-4 font-bold text-slate-900">${p.full_name}</td>
                <td class="py-3 px-4 font-mono text-slate-600">${p.phone}</td>
                <td class="py-3 px-4 text-slate-700">${p.lead_source}</td>
                <td class="py-3 px-4">${tierBadges[p.patient_tier] || p.patient_tier}</td>
                <td class="py-3 px-4">${stageBadges[p.stage] || p.stage}</td>
                <td class="py-3 px-4 font-mono text-slate-500">${p.next_follow_up || '—'}</td>
                <td class="py-3 px-4 text-slate-500">${p.notes || '—'}</td>
                <td class="py-3 px-4 text-center">
                    <button onclick="Utils.showToast('تم إرسال رسالة تذكير للمريض', 'success')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200">
                        💬 تواصل
                    </button>
                </td>
            </tr>
        `).join('');
    },

    // 2. نظام HR: البصمة والجزاءات والجدول التشغيلي
    renderAttendance() {
        const tbody = document.getElementById('attendance-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.attendanceLogs.map(log => `
            <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                <td class="py-3 px-4 font-bold text-slate-900">${log.employee_name}</td>
                <td class="py-3 px-4 font-mono">${log.fingerprint_id}</td>
                <td class="py-3 px-4 font-mono text-emerald-700 font-bold">${log.check_in}</td>
                <td class="py-3 px-4 font-mono text-slate-700">${log.check_out || '—'}</td>
                <td class="py-3 px-4 font-mono ${log.late_minutes > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}">
                    ${log.late_minutes > 0 ? `${log.late_minutes} دقيقة تأخير` : 'منتظم'}
                </td>
                <td class="py-3 px-4 font-mono text-emerald-600">${log.overtime_minutes > 0 ? `+${log.overtime_minutes} دقيقة` : '—'}</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${log.status === 'present' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                        ${log.status === 'present' ? 'حاضر (بصمة)' : 'متأخر'}
                    </span>
                </td>
            </tr>
        `).join('');
    },

    renderPenalties() {
        const tbody = document.getElementById('penalties-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.penalties.map(p => `
            <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                <td class="py-2.5 px-4 font-bold text-slate-900">${p.employee_name}</td>
                <td class="py-2.5 px-4 text-slate-600">${p.date}</td>
                <td class="py-2.5 px-4 font-bold text-rose-600">${p.penalty_type === 'days' ? `خصم ${p.days} يوم` : `خصم ${Utils.formatCurrency(p.amount)}`}</td>
                <td class="py-2.5 px-4 text-slate-700">${p.reason}</td>
                <td class="py-2.5 px-4 text-slate-500">${p.issued_by}</td>
                <td class="py-2.5 px-4 text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">معتمد ومخصوم</span>
                </td>
            </tr>
        `).join('');
    },

    renderRoster() {
        const tbody = document.getElementById('roster-table-body');
        if (!tbody) return;

        const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        tbody.innerHTML = this.roster.map(r => `
            <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                <td class="py-2.5 px-4 font-bold text-slate-900">${r.employee_name}</td>
                <td class="py-2.5 px-4 text-slate-600">${r.job_title}</td>
                <td class="py-2.5 px-4 font-semibold text-sky-800">${days[r.day_of_week] || '—'}</td>
                <td class="py-2.5 px-4">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">${r.shift_name}</span>
                </td>
                <td class="py-2.5 px-4 font-mono text-slate-700">${r.hours}</td>
            </tr>
        `).join('');
    },

    // 3. نظام المشتريات والموردين
    renderSuppliers() {
        const tbody = document.getElementById('suppliers-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.suppliers.map(s => `
            <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                <td class="py-3 px-4 font-bold text-slate-900">${s.name}</td>
                <td class="py-3 px-4 text-slate-600">${s.contact_name}</td>
                <td class="py-3 px-4 font-mono text-slate-600">${s.phone}</td>
                <td class="py-3 px-4 font-mono text-slate-700">${s.last_order_date || '—'}</td>
                <td class="py-3 px-4 font-mono font-bold text-rose-700">${Utils.formatCurrency(s.balance_due)}</td>
                <td class="py-3 px-4 text-center">
                    <button onclick="Utils.showToast('تم فتح أمر شراء جديد للمورد', 'info')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                        + أمر شراء
                    </button>
                </td>
            </tr>
        `).join('');
    },

    // 4. جرد المخزن المتقدم مع رقم التشغيلة
    renderInventory() {
        const tbody = document.getElementById('inventory-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.inventory.map(item => {
            const isLow = item.quantity <= item.min_threshold;
            return `
                <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                    <td class="py-3 px-4 font-bold text-slate-900">${item.name}</td>
                    <td class="py-3 px-4 text-slate-600">${item.category}</td>
                    <td class="py-3 px-4 font-mono text-slate-500">${item.batch_number || 'BATCH-2026-A'}</td>
                    <td class="py-3 px-4 font-mono font-bold text-slate-800">${item.quantity} ${item.unit}</td>
                    <td class="py-3 px-4">
                        ${isLow ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 animate-pulse">⚠️ رصيد حرج</span>' : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">متوفر</span>'}
                    </td>
                    <td class="py-3 px-4 font-mono text-slate-600">${item.expiry_date}</td>
                    <td class="py-3 px-4 text-center">
                        <button onclick="ClinicAdminApp.adjustStock('${item.id}', 10)" class="px-2 py-1 text-[10px] font-bold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200">
                            + توريد 10
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
            Utils.showToast(`تم توريد ${qty} إلى رصيد: ${item.name}`, 'success');
            this.renderInventory();
        }
    },

    // 5. التعاقدات ونسبة الخصم وتحمل المريض Co-Pay
    renderContracts() {
        const tbody = document.getElementById('contracts-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.contracts.map(c => `
            <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                <td class="py-3 px-4 font-bold text-slate-900">${c.name}</td>
                <td class="py-3 px-4 font-extrabold text-purple-700 font-mono">${c.discount_percentage}% خصم</td>
                <td class="py-3 px-4 font-extrabold text-emerald-700 font-mono">${c.patient_copay_percentage}% تحمل المريض</td>
                <td class="py-3 px-4 font-mono text-slate-600">${Utils.formatCurrency(c.max_coverage || 5000)}</td>
                <td class="py-3 px-4 text-slate-600">${c.contact_person} (${c.phone})</td>
                <td class="py-3 px-4 text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">تعاقد نشط</span>
                </td>
            </tr>
        `).join('');
    },

    updateKPIs() {
        const kpiCrm = document.getElementById('kpi-crm-leads');
        const kpiAtt = document.getElementById('kpi-attendance-today');
        const kpiSup = document.getElementById('kpi-suppliers-balance');
        const kpiCon = document.getElementById('kpi-contracts-count');

        if (kpiCrm) kpiCrm.textContent = `${this.crmPatients.length} مرضى`;
        if (kpiAtt) kpiAtt.textContent = `${this.attendanceLogs.length} حاضرين بالبصمة`;
        if (kpiSup) kpiSup.textContent = Utils.formatCurrency(48500);
        if (kpiCon) kpiCon.textContent = `${this.contracts.length} شركات`;
    },

    // ==========================================
    // دوال تصدير شيتات Excel لجميع الأنظمة
    // ==========================================
    exportCRMExcel() {
        if (window.Reports) {
            Reports.exportCRMToExcel(this.crmPatients);
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    exportAttendanceExcel() {
        if (window.Reports) {
            Reports.exportAttendanceToExcel(this.attendanceLogs);
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    exportPenaltiesExcel() {
        if (window.Reports) {
            Reports.exportPenaltiesToExcel(this.penalties);
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    exportRosterExcel() {
        if (window.Reports) {
            Reports.exportRosterToExcel(this.roster);
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    exportSuppliersExcel() {
        if (window.Reports) {
            Reports.exportSuppliersToExcel(this.suppliers);
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    exportInventoryExcel() {
        if (window.Reports) {
            Reports.exportInventoryToExcel(this.inventory);
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    exportContractsExcel() {
        if (window.Reports) {
            Reports.exportContractsToExcel(this.contracts);
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    exportPayrollExcel() {
        if (window.Reports) {
            Reports.exportPayrollToExcel(this.employees, 'نوفمبر_2026');
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    bindEvents() {
        // إضافة مريض جديد في الـ CRM
        const crmForm = document.getElementById('add-crm-form');
        const crmModal = document.getElementById('add-crm-modal');
        if (crmForm && crmModal) {
            crmForm.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('crm-name-input').value.trim();
                const phone = document.getElementById('crm-phone-input').value.trim();
                const source = document.getElementById('crm-source-input').value;
                const tier = document.getElementById('crm-tier-input').value;
                const notes = document.getElementById('crm-notes-input').value.trim();

                this.crmPatients.unshift({
                    id: 'crm_' + Date.now(),
                    full_name: name,
                    phone,
                    lead_source: source,
                    patient_tier: tier,
                    stage: 'new',
                    notes
                });

                Utils.showToast(`تم تسجيل المريض ${name} بنجاح في نظام الـ CRM ومتابعة الرحلة`, 'success');
                crmModal.classList.add('hidden');
                crmForm.reset();
                this.renderCRM();
                this.updateKPIs();
            };
        }

        // إضافة جزاء مباشر من المدير
        const penaltyForm = document.getElementById('add-penalty-form');
        const penaltyModal = document.getElementById('add-penalty-modal');
        if (penaltyForm && penaltyModal) {
            penaltyForm.onsubmit = (e) => {
                e.preventDefault();
                const empName = document.getElementById('penalty-emp-select').value;
                const type = document.getElementById('penalty-type-select').value;
                const days = document.getElementById('penalty-days-input').value || 1;
                const amount = document.getElementById('penalty-amount-input').value || 100;
                const reason = document.getElementById('penalty-reason-input').value.trim();

                this.penalties.unshift({
                    id: 'pen_' + Date.now(),
                    employee_name: empName,
                    date: new Date().toISOString().split('T')[0],
                    penalty_type: type,
                    days: parseFloat(days),
                    amount: parseFloat(amount),
                    reason,
                    issued_by: this.currentAdmin ? this.currentAdmin.full_name : 'المدير المباشر'
                });

                Utils.showToast(`تم اعتماد الجزاء للموظف ${empName} وترحيله لخصومات الرواتب`, 'success');
                penaltyModal.classList.add('hidden');
                penaltyForm.reset();
                this.renderPenalties();
            };
        }
    },

    getMockCRMPatients() {
        return [
            { id: '1', full_name: 'طارق حسام مصطفى', phone: '01011223344', lead_source: 'فيسبوك / تواصل اجتماعي', patient_tier: 'vip', stage: 'new', notes: 'مهتم بكشف باطنة واستشارة عظام' },
            { id: '2', full_name: 'ياسمين عبد الرحمن', phone: '01122334455', lead_source: 'تعاقد شركة', patient_tier: 'corporate', stage: 'booked', notes: 'محولة من شركة مصر للتأمين' },
            { id: '3', full_name: 'حامد زكريا النمر', phone: '01233445566', lead_source: 'إحالة طبيب', patient_tier: 'chronic', stage: 'follow_up', notes: 'مريض سكري يحتاج متابعة كل أسبوعين' },
            { id: '4', full_name: 'سلوى محمود شاهين', phone: '01555667788', lead_source: 'ترشيح مريض سابق', patient_tier: 'regular', stage: 'visited', notes: 'تم الكشف مع د. سارة محمود' }
        ];
    },

    getMockAttendanceLogs() {
        return [
            { employee_name: 'د. أحمد الشناوي', fingerprint_id: 'FP-01', check_in: '08:55 ص', check_out: '04:05 م', late_minutes: 0, overtime_minutes: 10, status: 'present' },
            { employee_name: 'د. سارة محمود', fingerprint_id: 'FP-02', check_in: '09:18 ص', check_out: '—', late_minutes: 18, overtime_minutes: 0, status: 'late' },
            { employee_name: 'أحمد فؤاد (استقبال)', fingerprint_id: 'FP-03', check_in: '07:58 ص', check_out: '04:00 م', late_minutes: 0, overtime_minutes: 0, status: 'present' },
            { employee_name: 'ريم مصطفى (استقبال)', fingerprint_id: 'FP-04', check_in: '03:55 م', check_out: '—', late_minutes: 0, overtime_minutes: 0, status: 'present' },
            { employee_name: 'أمل إبراهيم (تمريض)', fingerprint_id: 'FP-05', check_in: '08:02 ص', check_out: '—', late_minutes: 2, overtime_minutes: 0, status: 'present' }
        ];
    },

    getMockPenalties() {
        return [
            { employee_name: 'ريم مصطفى', date: '2026-11-12', penalty_type: 'days', days: 0.5, amount: 0, reason: 'تأخير متكرر عن موعد استلام الوردية الصباحية بدون إذن مسبق', issued_by: 'المدير المباشر' },
            { employee_name: 'أمل إبراهيم', date: '2026-11-08', penalty_type: 'amount', days: 0, amount: 150, reason: 'عدم الالتزام بزي التعقيم الرسمي الموحد بغرفة العمليات الصغرى', issued_by: 'مدير العيادة' }
        ];
    },

    getMockRoster() {
        return [
            { employee_name: 'أحمد فؤاد', job_title: 'مشرف استقبال', day_of_week: 0, shift_name: 'صباحي (8 ص - 4 م)', hours: '8 ساعات' },
            { employee_name: 'ريم مصطفى', job_title: 'موظف استقبال', day_of_week: 0, shift_name: 'مسائي (4 م - 12 ص)', hours: '8 ساعات' },
            { employee_name: 'د. أحمد الشناوي', job_title: 'استشاري باطنة', day_of_week: 1, shift_name: 'صباحي (8 ص - 4 م)', hours: '8 ساعات' },
            { employee_name: 'د. سارة محمود', job_title: 'أخصائي أطفال', day_of_week: 1, shift_name: 'مسائي (4 م - 12 ص)', hours: '8 ساعات' },
            { employee_name: 'محمود عبد الرازق', job_title: 'تمريض طوارئ', day_of_week: 2, shift_name: 'ليلي / طوارئ (12 ص - 8 ص)', hours: '8 ساعات' }
        ];
    },

    getMockSuppliers() {
        return [
            { name: 'شركة المتحدة للأدوية والمستلزمات', contact_name: 'د. هاني رضوان', phone: '01099881122', last_order_date: '2026-11-10', balance_due: 28500 },
            { name: 'مؤسسة الشفاء لتجهيزات المعامل والتعقيم', contact_name: 'م. عماد شكري', phone: '01122334466', last_order_date: '2026-11-05', balance_due: 12000 },
            { name: 'الشركة الطبية الحديثة للسرنجات والمستهلكات', contact_name: 'أ. طارق زيدان', phone: '01244556677', last_order_date: '2026-11-12', balance_due: 8000 }
        ];
    },

    getMockInventory() {
        return [
            { id: 'i1', name: 'شاش طبي معقم 10*10سم', category: 'مستلزمات طبية', batch_number: 'BCH-2026-88', quantity: 8, min_threshold: 25, unit: 'علبة', expiry_date: '2027-06-30' },
            { id: 'i2', name: 'سرنجات طبية 5 سم (معقمة)', category: 'مستلزمات طبية', batch_number: 'BCH-2026-102', quantity: 180, min_threshold: 50, unit: 'قطعة', expiry_date: '2028-12-31' },
            { id: 'i3', name: 'محلول ملحي معقم (Saline 0.9%)', category: 'أدوية ومحاليل', batch_number: 'BCH-2026-44', quantity: 5, min_threshold: 20, unit: 'زجاجة', expiry_date: '2026-12-15' },
            { id: 'i4', name: 'جوانتيات طبية لاتكس (مقاس M)', category: 'مستلزمات وقاية', batch_number: 'BCH-2026-71', quantity: 45, min_threshold: 20, unit: 'علبة', expiry_date: '2029-05-20' },
            { id: 'i5', name: 'كانيولا وريدية زرقاء مقاس 22', category: 'مستلزمات طبية', batch_number: 'BCH-2026-39', quantity: 12, min_threshold: 30, unit: 'قطعة', expiry_date: '2027-11-01' }
        ];
    },

    getMockContracts() {
        return [
            { id: 'c1', name: 'شركة مصر للتأمين', discount_percentage: 20, patient_copay_percentage: 20, max_coverage: 5000, contact_person: 'أ. سامح عبد الفتاح', phone: '01011223344' },
            { id: 'c2', name: 'نقابة المهندسين', discount_percentage: 25, patient_copay_percentage: 20, max_coverage: 4000, contact_person: 'د. طارق مراد', phone: '01122334455' },
            { id: 'c3', name: 'بتروتريد للخدمات البترولية', discount_percentage: 30, patient_copay_percentage: 20, max_coverage: 6000, contact_person: 'م. خالد جلال', phone: '01233445566' },
            { id: 'c4', name: 'أكسا للتأمين الطبي (AXA)', discount_percentage: 15, patient_copay_percentage: 10, max_coverage: 8000, contact_person: 'أ. مروة الشريف', phone: '01555667788' }
        ];
    },

    getMockEmployees() {
        return [
            { full_name: 'د. أحمد الشناوي', job_title: 'استشاري باطنة', base_salary: 15000, allowances: 2500, deductions: 0, payroll_status: 'معتمد' },
            { full_name: 'د. سارة محمود', job_title: 'أخصائي أطفال', base_salary: 12000, allowances: 1800, deductions: 0, payroll_status: 'معتمد' },
            { full_name: 'أحمد فؤاد', job_title: 'مشرف استقبال', base_salary: 6000, allowances: 800, deductions: 0, payroll_status: 'معتمد' },
            { full_name: 'ريم مصطفى', job_title: 'موظف استقبال', base_salary: 4500, allowances: 500, deductions: 150, payroll_status: 'معتمد' },
            { full_name: 'أمل إبراهيم', job_title: 'تمريض', base_salary: 5000, allowances: 600, deductions: 150, payroll_status: 'معتمد' }
        ];
    }
};

window.ClinicAdminApp = ClinicAdminApp;
document.addEventListener('DOMContentLoaded', () => ClinicAdminApp.init());
