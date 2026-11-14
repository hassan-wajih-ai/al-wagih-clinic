/**
 * منطق لوحة تحكم مدير العيادة (Clinic Admin Controller)
 * نظام «الوجيه» لإدارة العيادات
 */

const ClinicAdminApp = {
    currentAdmin: null,
    clinicInfo: null,
    branches: [],
    staff: [],
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

        await this.loadClinicData();
        this.initCharts();
        this.bindEvents();
    },

    async loadClinicData() {
        try {
            if (window.db && window.SUPABASE_CONFIG.url.indexOf('xyzcompany') === -1) {
                const { data: bData } = await window.db.from('branches').select('*');
                this.branches = bData || [];

                const { data: sData } = await window.db.from('users_profiles').select('*').in('role', ['doctor', 'receptionist']);
                this.staff = sData || [];
            } else {
                this.branches = this.getMockBranches();
                this.staff = this.getMockStaff();
            }

            this.renderBranches();
            this.renderStaff();
            this.updateKPIs();
        } catch (err) {
            console.error('Error loading clinic data:', err);
            this.branches = this.getMockBranches();
            this.staff = this.getMockStaff();
            this.renderBranches();
            this.renderStaff();
            this.updateKPIs();
        }
    },

    renderBranches() {
        const container = document.getElementById('branches-list');
        if (!container) return;

        container.innerHTML = this.branches.map(b => `
            <div class="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
                <div>
                    <h4 class="font-bold text-sm text-slate-800">${b.name}</h4>
                    <p class="text-xs text-slate-500 mt-0.5">📍 ${b.address || 'العنوان غير محدد'} | 📞 ${b.phone || '—'}</p>
                </div>
                <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">فرع نشط</span>
            </div>
        `).join('');
    },

    renderStaff() {
        const container = document.getElementById('staff-list');
        if (!container) return;

        container.innerHTML = this.staff.map(s => {
            const roleBadge = s.role === 'doctor' 
                ? '<span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700">طبيب</span>'
                : '<span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 text-teal-700">استقبال (8 ساعات)</span>';

            return `
                <div class="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                    <div>
                        <div class="font-bold text-slate-800">${s.full_name}</div>
                        <div class="text-[11px] text-slate-400 mt-0.5">${s.phone || 'لا يوجد هاتف'}</div>
                    </div>
                    <div>${roleBadge}</div>
                </div>
            `;
        }).join('');
    },

    updateKPIs() {
        const doctorsCount = this.staff.filter(s => s.role === 'doctor').length;
        const receptionistsCount = this.staff.filter(s => s.role === 'receptionist').length;

        document.getElementById('kpi-revenue').textContent = Utils.formatCurrency(4850);
        document.getElementById('kpi-today-appts').textContent = '24 كشف';
        document.getElementById('kpi-doctors').textContent = `${doctorsCount} أطباء`;
        document.getElementById('kpi-receptionists').textContent = `${receptionistsCount} موظف`;
    },

    initCharts() {
        if (!window.Reports) return;

        // رسم بياني للإيرادات الأسبوعية (Chart.js)
        this.revenueChartInstance = Reports.initRevenueChart('admin-revenue-chart', 
            ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
            [3500, 4200, 4800, 5100, 4850, 6400, 2900]
        );

        // رسم بياني لنسب الحضور مقابل الإلغاء
        this.attendanceChartInstance = Reports.initAttendanceChart('admin-attendance-chart', 82, 6, 12);
    },

    exportClinicSummaryExcel() {
        if (typeof XLSX === 'undefined') {
            Utils.showToast('مكتبة SheetJS غير محملة', 'error');
            return;
        }

        const wb = XLSX.utils.book_new();

        // بيانات الفروع
        const branchesData = this.branches.map((b, i) => ({
            'م': i + 1,
            'اسم الفرع': b.name,
            'العنوان': b.address,
            'الهاتف': b.phone
        }));
        const wsBranches = XLSX.utils.json_to_sheet(branchesData);
        XLSX.utils.book_append_sheet(wb, wsBranches, 'فروع العيادة');

        // بيانات الكادر الطبي
        const staffData = this.staff.map((s, i) => ({
            'م': i + 1,
            'الاسم': s.full_name,
            'الدور': s.role === 'doctor' ? 'طبيب' : 'موظف استقبال',
            'الهاتف': s.phone
        }));
        const wsStaff = XLSX.utils.json_to_sheet(staffData);
        XLSX.utils.book_append_sheet(wb, wsStaff, 'الكادر الطبي والإداري');

        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `التقرير_الشامل_للعيادة_${dateStr}.xlsx`);
        Utils.showToast('تم تصدير التقرير الشامل للعيادة إلى Excel بنجاح', 'success');
    },

    bindEvents() {
        const form = document.getElementById('add-branch-form');
        const modal = document.getElementById('add-branch-modal');

        if (form && modal) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const name = document.getElementById('branch-name-input').value.trim();
                const address = document.getElementById('branch-address-input').value.trim();
                const phone = document.getElementById('branch-phone-input').value.trim();

                const newBranch = {
                    id: 'b_' + Date.now(),
                    name,
                    address,
                    phone
                };

                this.branches.push(newBranch);
                Utils.showToast('تمت إضافة الفرع الجديد بنجاح', 'success');
                modal.classList.add('hidden');
                form.reset();
                this.renderBranches();
            };
        }
    },

    getMockBranches() {
        return [
            { id: 'b1', name: 'فرع المعادي الرئيسي', address: 'شارع النصر، المعادي', phone: '01011112222' },
            { id: 'b2', name: 'فرع التجمع الخامس', address: 'التسعين الشمالي، مول النخيل', phone: '01033334444' }
        ];
    },

    getMockStaff() {
        return [
            { id: 's1', full_name: 'د. أحمد الشناوي', role: 'doctor', phone: '01099881122' },
            { id: 's2', full_name: 'د. سارة محمود', role: 'doctor', phone: '01122334455' },
            { id: 's3', full_name: 'أحمد فؤاد', role: 'receptionist', phone: '01233445566' },
            { id: 's4', full_name: 'ريم مصطفى', role: 'receptionist', phone: '01555667788' }
        ];
    }
};

window.ClinicAdminApp = ClinicAdminApp;
document.addEventListener('DOMContentLoaded', () => ClinicAdminApp.init());
