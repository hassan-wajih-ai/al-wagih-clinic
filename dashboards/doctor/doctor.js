/**
 * منطق لوحة تحكم الطبيب وغرفة الكشف (Doctor Controller)
 * نظام «الوجيه» لإدارة العيادات
 */

const DoctorApp = {
    currentDoctor: null,
    appointments: [],
    activeAppointment: null,

    async init() {
        // حماية الصفحة والتحقق من الصلاحيات
        const authData = await Auth.protectRoute(['doctor', 'admin', 'superadmin']);
        if (!authData) return;

        this.currentDoctor = authData.profile;
        document.getElementById('user-display-name').textContent = this.currentDoctor.full_name || 'د. الطبيب المعالج';
        document.getElementById('doctor-title').textContent = `عيادة: ${this.currentDoctor.full_name || 'الكشف الطبي'}`;

        await this.loadDoctorWaitingList();
        this.bindEvents();

        window.addEventListener('alwagih_language_changed', () => this.renderWaitingList());
    },

    getStoredAppointments() {
        const stored = localStorage.getItem('alwagih_appointments');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {}
        }
        const mock = this.getMockAppointments();
        localStorage.setItem('alwagih_appointments', JSON.stringify(mock));
        return mock;
    },

    saveStoredAppointments() {
        localStorage.setItem('alwagih_appointments', JSON.stringify(this.appointments));
    },

    /**
     * تحميل قائمة انتظار الطبيب لليوم الحالي
     */
    async loadDoctorWaitingList() {
        const todayStr = new Date().toISOString().split('T')[0];
        try {
            if (window.db && window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url.indexOf('xyzcompany') === -1) {
                const { data, error } = await window.db
                    .from('appointments')
                    .select('*, patient:users_profiles!patient_id(full_name, phone)')
                    .eq('date', todayStr)
                    .order('time_slot', { ascending: true });

                if (error) throw error;
                this.appointments = data && data.length > 0 ? data : this.getStoredAppointments();
            } else {
                this.appointments = this.getStoredAppointments();
            }

            this.renderWaitingList();
        } catch (err) {
            this.appointments = this.getStoredAppointments();
            this.renderWaitingList();
        }
    },

    /**
     * رسم قائمة الانتظار الحية
     */
    renderWaitingList() {
        const container = document.getElementById('waiting-list');
        const countBadge = document.getElementById('waiting-count-badge');
        
        const activeList = this.appointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
        if (countBadge) countBadge.textContent = `${activeList.length} مرضى بالانتظار`;

        if (!activeList || activeList.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <div class="text-2xl mb-1">🎉</div>
                    <div class="text-xs font-bold text-slate-700 dark:text-slate-300">لا توجد حالات انتظار حالياً</div>
                    <div class="text-[11px] text-slate-400 mt-1">تمت معاينة جميع المرضى المسجلين اليوم.</div>
                </div>
            `;
            return;
        }

        container.innerHTML = activeList.map((apt, index) => {
            const isCurrent = this.activeAppointment && this.activeAppointment.id === apt.id;
            const patientName = apt.patient ? apt.patient.full_name : apt.patient_name;
            const patientPhone = apt.patient ? apt.patient.phone : apt.patient_phone;

            return `
                <div class="card-hover p-4 rounded-2xl border transition-all ${isCurrent ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-300 dark:border-purple-700 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-200'}">
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="font-bold text-xs text-slate-900 dark:text-white">${patientName}</span>
                        <span class="font-mono text-xs font-semibold text-purple-700 dark:text-purple-300">${Utils.formatTime(apt.time_slot)}</span>
                    </div>
                    <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>هاتف: ${patientPhone}</span>
                        ${Utils.renderStatusBadge(apt.status)}
                    </div>
                    <div class="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                        <button onclick="DoctorApp.selectPatient('${apt.id}')" class="btn-press px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition flex items-center gap-1 shadow-sm">
                            <span>🩺 استدعاء وفحص</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * استدعاء مريض وبدء الكشف
     */
    async selectPatient(appointmentId) {
        const apt = this.appointments.find(a => a.id === appointmentId);
        if (!apt) return;

        this.activeAppointment = apt;
        apt.status = 'in_progress';

        // تحديث واجهة غرفة الفحص
        const patientName = apt.patient ? apt.patient.full_name : apt.patient_name;
        const patientPhone = apt.patient ? apt.patient.phone : apt.patient_phone;

        document.getElementById('current-patient-name').textContent = patientName;
        document.getElementById('current-patient-info').textContent = `الهاتف: ${patientPhone} | وقت الحجز: ${Utils.formatTime(apt.time_slot)}`;
        document.getElementById('diagnosis-input').value = apt.diagnosis || '';
        document.getElementById('prescription-input').value = apt.prescription || '';
        document.getElementById('notes-input').value = apt.doctor_notes || '';

        Utils.showToast(`جاري الآن فحص المريض: ${patientName}`, 'info');
        this.renderWaitingList();
    },

    /**
     * ربط أحداث نموذج الكشف
     */
    bindEvents() {
        const form = document.getElementById('consultation-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                if (!this.activeAppointment) {
                    Utils.showToast('يرجى اختيار مريض أولاً من قائمة الانتظار', 'warning');
                    return;
                }

                const diagnosis = document.getElementById('diagnosis-input').value.trim();
                const prescription = document.getElementById('prescription-input').value.trim();
                const notes = document.getElementById('notes-input').value.trim();

                try {
                    if (window.db && window.SUPABASE_CONFIG.url.indexOf('xyzcompany') === -1) {
                        const { error } = await window.db
                            .from('appointments')
                            .update({
                                status: 'completed',
                                diagnosis,
                                prescription,
                                doctor_notes: notes
                            })
                            .eq('id', this.activeAppointment.id);

                        if (error) throw error;
                    } else {
                        this.activeAppointment.status = 'completed';
                        this.activeAppointment.diagnosis = diagnosis;
                        this.activeAppointment.prescription = prescription;
                        this.activeAppointment.doctor_notes = notes;
                    }
                    this.saveStoredAppointments();

                    Utils.showToast('تم حفظ التشخيص والروشتة وإتمام الكشف بنجاح', 'success');
                    
                    // إعادة ضبط غرفة الفحص
                    this.activeAppointment = null;
                    document.getElementById('current-patient-name').textContent = '— لم يتم استدعاء مريض بعد —';
                    document.getElementById('current-patient-info').textContent = 'اختر مريضاً من قائمة الانتظار لبدء الكشف';
                    form.reset();

                    this.renderWaitingList();
                } catch (err) {
                    Utils.showToast('حدث خطأ أثناء حفظ الكشف: ' + err.message, 'error');
                }
            };
        }
    },

    /**
     * بيانات تجريبية للطبيب
     */
    getMockAppointments() {
        return [
            { id: 'apt_101', patient_name: 'أحمد سعيد عبد الله', patient_phone: '01099887766', time_slot: '10:00', status: 'confirmed', diagnosis: '', prescription: '' },
            { id: 'apt_102', patient_name: 'مريم عادل خليل', patient_phone: '01155443322', time_slot: '10:30', status: 'confirmed', diagnosis: '', prescription: '' },
            { id: 'apt_103', patient_name: 'يوسف حسام الشريف', patient_phone: '01244332211', time_slot: '11:15', status: 'pending', diagnosis: '', prescription: '' }
        ];
    }
};

window.DoctorApp = DoctorApp;
document.addEventListener('DOMContentLoaded', () => DoctorApp.init());
