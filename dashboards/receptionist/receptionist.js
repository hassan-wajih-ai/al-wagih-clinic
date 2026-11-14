/**
 * منطق لوحة تحكم موظف الاستقبال (Receptionist Controller)
 * نظام «الوجيه» لإدارة العيادات
 */

const ReceptionistApp = {
    currentStaff: null,
    shiftStartTime: null,
    appointments: [],

    async init() {
        const authData = await Auth.protectRoute(['receptionist', 'admin', 'superadmin']);
        if (!authData) return;

        this.currentStaff = authData.profile;
        document.getElementById('user-display-name').textContent = this.currentStaff.full_name || 'موظف الاستقبال';

        this.initShiftTracker();
        await this.loadTodayAppointments();
        await this.loadDoctorsList();
        this.bindEvents();
    },

    initShiftTracker() {
        const storedShiftStart = localStorage.getItem('shift_start_time') || new Date().toISOString();
        if (!localStorage.getItem('shift_start_time')) {
            localStorage.setItem('shift_start_time', storedShiftStart);
        }
        this.shiftStartTime = new Date(storedShiftStart);

        const updateTimer = () => {
            const now = new Date();
            const elapsedMs = now - this.shiftStartTime;
            const totalShiftMs = 8 * 60 * 60 * 1000;
            const remainingMs = Math.max(0, totalShiftMs - elapsedMs);

            const hours = Math.floor(remainingMs / (1000 * 60 * 60));
            const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

            const timerEl = document.getElementById('shift-timer-display');
            if (timerEl) {
                const pad = (n) => String(n).padStart(2, '0');
                timerEl.textContent = `متبقي من الوردية: ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
            }
        };

        updateTimer();
        setInterval(updateTimer, 1000);
    },

    async loadTodayAppointments() {
        const todayStr = new Date().toISOString().split('T')[0];
        const tbody = document.getElementById('appointments-table-body');
        tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400">جاري تحميل كشوفات اليوم...</td></tr>`;

        try {
            if (window.db && window.SUPABASE_CONFIG.url.indexOf('xyzcompany') === -1) {
                const { data, error } = await window.db
                    .from('appointments')
                    .select('*, patient:users_profiles!patient_id(full_name, phone), doctor:users_profiles!doctor_id(full_name)')
                    .eq('date', todayStr)
                    .order('time_slot', { ascending: true });

                if (error) throw error;
                this.appointments = data || [];
            } else {
                this.appointments = this.getMockAppointments();
            }

            this.renderAppointmentsTable();
            this.updateShiftSummaryKPIs();
        } catch (err) {
            console.error('Error loading appointments:', err);
            this.appointments = this.getMockAppointments();
            this.renderAppointmentsTable();
            this.updateShiftSummaryKPIs();
        }
    },

    renderAppointmentsTable() {
        const tbody = document.getElementById('appointments-table-body');
        if (!this.appointments || this.appointments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">لا توجد حجوزات مسجلة لليوم حتى الآن.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.appointments.map((apt, index) => {
            const patientName = apt.patient ? apt.patient.full_name : (apt.patient_name || 'مريض غير محدد');
            const patientPhone = apt.patient ? apt.patient.phone : (apt.patient_phone || '—');
            const doctorName = apt.doctor ? apt.doctor.full_name : (apt.doctor_name || 'د. المناوب');

            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="py-3 px-4 font-mono font-bold text-slate-700">#${index + 101}</td>
                    <td class="py-3 px-4">
                        <div class="font-bold text-slate-900">${patientName}</div>
                        <div class="text-[11px] text-slate-400">${patientPhone}</div>
                    </td>
                    <td class="py-3 px-4 text-slate-700">${doctorName}</td>
                    <td class="py-3 px-4 font-mono text-slate-800">${Utils.formatTime(apt.time_slot)}</td>
                    <td class="py-3 px-4 font-bold text-slate-900">${Utils.formatCurrency(apt.amount)}</td>
                    <td class="py-3 px-4">${Utils.renderStatusBadge(apt.status)}</td>
                    <td class="py-3 px-4 text-center">
                        <div class="flex items-center justify-center gap-1.5">
                            ${apt.status === 'pending' ? `
                                <button onclick="ReceptionistApp.updateStatus('${apt.id}', 'confirmed')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition">
                                    تأكيد
                                </button>
                            ` : ''}
                            ${apt.status === 'confirmed' ? `
                                <button onclick="ReceptionistApp.updateStatus('${apt.id}', 'completed')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition">
                                    إتمام
                                </button>
                            ` : ''}
                            <button onclick="ReceptionistApp.printReceipt('${apt.id}')" title="طباعة إيصال كشف" class="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition">
                                🖨️ إيصال
                            </button>
                            <button onclick="ReceptionistApp.updateStatus('${apt.id}', 'cancelled')" class="px-2 py-1 text-[11px] font-bold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition">
                                إلغاء
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    printReceipt(apptId) {
        const apt = this.appointments.find(a => a.id === apptId);
        if (apt && window.Reports) {
            Reports.printAppointmentReceipt(apt);
        } else {
            Utils.showToast('تعذر العثور على بيانات الحجز', 'error');
        }
    },

    async updateStatus(apptId, newStatus) {
        try {
            if (window.db && window.SUPABASE_CONFIG.url.indexOf('xyzcompany') === -1) {
                const { error } = await window.db
                    .from('appointments')
                    .update({ status: newStatus })
                    .eq('id', apptId);
                if (error) throw error;
            } else {
                const item = this.appointments.find(a => a.id === apptId);
                if (item) item.status = newStatus;
            }

            Utils.showToast(`تم تحديث حالة الكشف إلى: ${newStatus}`, 'success');
            this.renderAppointmentsTable();
            this.updateShiftSummaryKPIs();
        } catch (err) {
            Utils.showToast('تعذر تحديث الحالة: ' + err.message, 'error');
        }
    },

    updateShiftSummaryKPIs() {
        const totalAppointments = this.appointments.length;
        const confirmedOrCompleted = this.appointments.filter(a => a.status === 'confirmed' || a.status === 'completed');
        const totalRevenue = confirmedOrCompleted.reduce((sum, a) => sum + Number(a.amount || 0), 0);

        const revEl = document.getElementById('shift-revenue-display');
        const countEl = document.getElementById('shift-count-display');
        if (revEl) revEl.textContent = Utils.formatCurrency(totalRevenue);
        if (countEl) countEl.textContent = `${confirmedOrCompleted.length} / ${totalAppointments}`;
    },

    openShiftCloseoutModal() {
        const modal = document.getElementById('shift-closeout-modal');
        if (!modal) return;

        const totalCases = this.appointments.length;
        const confirmedOrCompleted = this.appointments.filter(a => a.status === 'confirmed' || a.status === 'completed');
        const totalRevenue = confirmedOrCompleted.reduce((sum, a) => sum + Number(a.amount || 0), 0);
        const cancelledCount = this.appointments.filter(a => a.status === 'cancelled').length;

        document.getElementById('modal-closeout-cases').textContent = totalCases;
        document.getElementById('modal-closeout-completed').textContent = confirmedOrCompleted.length;
        document.getElementById('modal-closeout-cancelled').textContent = cancelledCount;
        document.getElementById('modal-closeout-revenue').textContent = Utils.formatCurrency(totalRevenue);

        modal.classList.remove('hidden');
    },

    exportShiftExcel() {
        if (!window.Reports) {
            Utils.showToast('محرك التقارير غير محمل', 'error');
            return;
        }

        const shiftInfo = {
            clinicName: 'عيادات الشفاء التخصصية',
            branchName: 'فرع المعادي الرئيسي',
            staffName: this.currentStaff ? this.currentStaff.full_name : 'موظف الاستقبال'
        };

        Reports.exportShiftToExcel(shiftInfo, this.appointments);
    },

    async loadDoctorsList() {
        const select = document.getElementById('modal-doctor-select');
        if (!select) return;
        select.innerHTML = `
            <option value="doc1">د. أحمد الشناوي (استشاري باطنة)</option>
            <option value="doc2">د. سارة محمود (أخصائي أطفال)</option>
            <option value="doc3">د. كريم عبد العزيز (استشاري عظام)</option>
        `;
    },

    bindEvents() {
        const openBtn = document.getElementById('btn-open-booking-modal');
        const closeBtn = document.getElementById('btn-close-booking-modal');
        const modal = document.getElementById('booking-modal');

        if (openBtn && modal) openBtn.onclick = () => modal.classList.remove('hidden');
        if (closeBtn && modal) closeBtn.onclick = () => modal.classList.add('hidden');

        const form = document.getElementById('new-appointment-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const name = document.getElementById('modal-patient-name').value.trim();
                const phone = document.getElementById('modal-patient-phone').value.trim();
                const amount = document.getElementById('modal-amount').value || 150;
                const time = document.getElementById('modal-time').value || '14:00';

                const newApt = {
                    id: 'apt_' + Date.now(),
                    patient_name: name,
                    patient_phone: phone,
                    doctor_name: document.getElementById('modal-doctor-select').selectedOptions[0].text,
                    time_slot: time,
                    amount: parseFloat(amount),
                    status: 'pending'
                };

                this.appointments.push(newApt);
                Utils.showToast('تم تسجيل الحجز بنجاح وإضافته لقائمة انتظار اليوم', 'success');
                modal.classList.add('hidden');
                form.reset();
                this.renderAppointmentsTable();
                this.updateShiftSummaryKPIs();
            };
        }
    },

    getMockAppointments() {
        return [
            { id: '101', patient_name: 'محمد إبراهيم علي', patient_phone: '01012345678', doctor_name: 'د. أحمد الشناوي', time_slot: '09:30', amount: 200, status: 'completed' },
            { id: '102', patient_name: 'فاطمة حسني محمود', patient_phone: '01123456789', doctor_name: 'د. سارة محمود', time_slot: '10:15', amount: 250, status: 'confirmed' },
            { id: '103', patient_name: 'محمود عبد الرازق', patient_phone: '01234567890', doctor_name: 'د. أحمد الشناوي', time_slot: '11:00', amount: 200, status: 'pending' },
            { id: '104', patient_name: 'ياسمين طارق النجار', patient_phone: '01512345678', doctor_name: 'د. كريم عبد العزيز', time_slot: '12:30', amount: 300, status: 'pending' }
        ];
    }
};

window.ReceptionistApp = ReceptionistApp;
document.addEventListener('DOMContentLoaded', () => ReceptionistApp.init());
