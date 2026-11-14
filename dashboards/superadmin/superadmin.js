/**
 * منطق لوحة تحكم الإدارة العليا (SuperAdmin Controller)
 * نظام «الوجيه» لإدارة العيادات
 */

const SuperAdminApp = {
    clinics: [],
    platformChartInstance: null,

    async init() {
        const authData = await Auth.protectRoute(['superadmin']);
        if (!authData) return;

        if (authData.profile) {
            document.getElementById('user-display-name').textContent = authData.profile.full_name || 'المدير العام';
        }

        await this.loadClinics();
        this.initPlatformChart();
        this.bindEvents();
    },

    async loadClinics() {
        try {
            if (window.db && window.SUPABASE_CONFIG.url.indexOf('xyzcompany') === -1) {
                const { data, error } = await window.db
                    .from('clinics')
                    .select('*, branches(count)')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                this.clinics = data || [];
            } else {
                this.clinics = this.getMockClinics();
            }

            this.renderClinicsTable();
            this.updateKPIs();
        } catch (err) {
            console.error('Error fetching clinics:', err);
            this.clinics = this.getMockClinics();
            this.renderClinicsTable();
            this.updateKPIs();
        }
    },

    renderClinicsTable() {
        const tbody = document.getElementById('clinics-table-body');
        if (!this.clinics || this.clinics.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400">لا توجد عيادات مسجلة بعد.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.clinics.map(clinic => {
            const branchesCount = clinic.branches_count || (clinic.branches ? clinic.branches.length : 1);
            const statusClass = clinic.status === 'active' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border-rose-200';
            const statusLabel = clinic.status === 'active' ? 'نشطة' : 'معلقة';

            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="py-3 px-4 font-bold text-slate-900">${clinic.name}</td>
                    <td class="py-3 px-4">
                        <span class="px-2.5 py-1 text-xs font-semibold rounded-full border ${statusClass}">
                            ${statusLabel}
                        </span>
                    </td>
                    <td class="py-3 px-4 text-slate-600 font-mono">${branchesCount} فرع</td>
                    <td class="py-3 px-4 text-slate-500">${Utils.formatDate(clinic.created_at)}</td>
                    <td class="py-3 px-4 text-center">
                        <div class="flex items-center justify-center gap-2">
                            <button onclick="SuperAdminApp.toggleStatus('${clinic.id}')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg border text-slate-700 hover:bg-slate-100 transition">
                                ${clinic.status === 'active' ? 'إيقاف مؤقت' : 'تفعيل'}
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    initPlatformChart() {
        const ctx = document.getElementById('platform-growth-chart');
        if (!ctx || typeof Chart === 'undefined') return;

        this.platformChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر'],
                datasets: [
                    {
                        label: 'إجمالي الحجوزات الشهرية',
                        data: [420, 780, 1150, 1620, 2340, 3100, 3890],
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'المرضى الجدد المسجلين',
                        data: [150, 290, 420, 610, 890, 1180, 1420],
                        borderColor: '#0284c7',
                        backgroundColor: 'transparent',
                        borderDash: [5, 5],
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { font: { family: 'Cairo', size: 12 } }
                    }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { font: { family: 'Cairo' } } },
                    x: { ticks: { font: { family: 'Cairo' } } }
                }
            }
        });
    },

    exportAllClinicsExcel() {
        if (typeof XLSX === 'undefined') {
            Utils.showToast('مكتبة SheetJS غير محملة', 'error');
            return;
        }

        const wb = XLSX.utils.book_new();
        const rows = this.clinics.map((c, idx) => ({
            'م': idx + 1,
            'اسم العيادة': c.name,
            'الحالة': c.status === 'active' ? 'نشطة' : 'معلقة',
            'عدد الفروع': c.branches_count || 1,
            'تاريخ الانضمام': c.created_at
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'العيادات المسجلة');
        XLSX.writeFile(wb, `سجل_العيادات_المنصة_${new Date().toISOString().split('T')[0]}.xlsx`);
        Utils.showToast('تم تصدير سجل عيادات المنصة بنجاح', 'success');
    },

    updateKPIs() {
        const totalClinics = this.clinics.length;
        const totalBranches = this.clinics.reduce((acc, c) => acc + (c.branches_count || 1), 0);

        document.getElementById('kpi-clinics').textContent = totalClinics;
        document.getElementById('kpi-branches').textContent = totalBranches;
        document.getElementById('kpi-patients').textContent = '1,420';
        document.getElementById('kpi-appointments').textContent = '3,890';
    },

    async toggleStatus(clinicId) {
        const clinic = this.clinics.find(c => c.id === clinicId);
        if (!clinic) return;

        const newStatus = clinic.status === 'active' ? 'suspended' : 'active';
        clinic.status = newStatus;

        if (window.db && window.SUPABASE_CONFIG.url.indexOf('xyzcompany') === -1) {
            await window.db.from('clinics').update({ status: newStatus }).eq('id', clinicId);
        }

        Utils.showToast(`تم تحديث حالة العيادة إلى: ${newStatus === 'active' ? 'نشطة' : 'معلقة'}`, 'success');
        this.renderClinicsTable();
    },

    bindEvents() {
        const form = document.getElementById('add-clinic-form');
        const modal = document.getElementById('add-clinic-modal');

        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const name = document.getElementById('clinic-name-input').value.trim();

                const newClinic = {
                    id: 'clinic_' + Date.now(),
                    name,
                    status: 'active',
                    branches_count: 1,
                    created_at: new Date().toISOString()
                };

                if (window.db && window.SUPABASE_CONFIG.url.indexOf('xyzcompany') === -1) {
                    const { data, error } = await window.db.from('clinics').insert([{ name, status: 'active' }]).select();
                    if (error) {
                        Utils.showToast(error.message, 'error');
                        return;
                    }
                    if (data && data[0]) newClinic.id = data[0].id;
                }

                this.clinics.unshift(newClinic);
                Utils.showToast('تمت إضافة العيادة الجديدة بنجاح للمنصة', 'success');
                modal.classList.add('hidden');
                form.reset();
                this.renderClinicsTable();
                this.updateKPIs();
            };
        }
    },

    getMockClinics() {
        return [
            { id: 'c1', name: 'مجموعة عيادات الشفاء التخصصية', status: 'active', branches_count: 3, created_at: '2026-01-10' },
            { id: 'c2', name: 'مركز الأمل لطب الأطفال ورعاية حديثي الولادة', status: 'active', branches_count: 2, created_at: '2026-02-01' },
            { id: 'c3', name: 'عيادات النور للعيون والليزر', status: 'active', branches_count: 1, created_at: '2026-02-15' }
        ];
    }
};

window.SuperAdminApp = SuperAdminApp;
document.addEventListener('DOMContentLoaded', () => SuperAdminApp.init());
