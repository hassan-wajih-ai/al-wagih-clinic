/**
 * منطق بوابة المريض الإلكترونية (Patient Controller)
 * نظام «الوجيه» لإدارة العيادات
 */

const PatientApp = {
    currentPatient: null,
    myAppointments: [],
    clinics: [],

    async init() {
        const authData = await Auth.protectRoute(['patient', 'admin', 'superadmin']);
        if (!authData) return;

        this.currentPatient = authData.profile;
        if (this.currentPatient) {
            document.getElementById('user-display-name').textContent = this.currentPatient.full_name || 'المريض';
        }

        await this.loadClinicsAndBranches();
        await this.loadMyAppointments();
        this.bindEvents();
    },

    async loadClinicsAndBranches() {
        const clinicSelect = document.getElementById('clinic-select');
        const branchSelect = document.getElementById('branch-select');
        const doctorSelect = document.getElementById('doctor-select');

        // بيانات تجريبية فورية للعيادات
        clinicSelect.innerHTML = `
            <option value="">اختر العيادة...</option>
            <option value="c1" selected>عيادات الشفاء التخصصية</option>
            <option value="c2">مركز الأمل للأطفال</option>
        `;

        branchSelect.innerHTML = `
            <option value="">اختر الفرع...</option>
            <option value="b1" selected>فرع المعادي الرئيسي</option>
            <option value="b2">فرع التجمع الخامس</option>
        `;

        doctorSelect.innerHTML = `
            <option value="">اختر الطبيب...</option>
            <option value="doc1" selected>د. أحمد الشناوي (باطنة وجهاز هضمي)</option>
            <option value="doc2">د. سارة محمود (طب الأطفال)</option>
        `;
    },

    async loadMyAppointments() {
        try {
            if (window.db && window.SUPABASE_CONFIG.url.indexOf('xyzcompany') === -1) {
                const { data, error } = await window.db
                    .from('appointments')
                    .select('*, clinic:clinics(name), branch:branches(name), doctor:users_profiles!doctor_id(full_name)')
                    .eq('patient_id', this.currentPatient.id)
                    .order('date', { ascending: false });

                if (error) throw error;
                this.myAppointments = data || [];
            } else {
                this.myAppointments = this.getMockAppointments();
            }

            this.renderAppointmentsTable();
        } catch (err) {
            console.error('Error fetching patient appointments:', err);
            this.myAppointments = this.getMockAppointments();
            this.renderAppointmentsTable();
        }
    },

    renderAppointmentsTable() {
        const tbody = document.getElementById('patient-appointments-table');
        if (!this.myAppointments || this.myAppointments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400">لا توجد لديك حجوزات مسجلة بعد.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.myAppointments.map(apt => {
            const clinicName = apt.clinic ? apt.clinic.name : (apt.clinic_name || 'عيادات الشفاء');
            const branchName = apt.branch ? apt.branch.name : (apt.branch_name || 'فرع المعادي');
            const doctorName = apt.doctor ? apt.doctor.full_name : (apt.doctor_name || 'د. أحمد الشناوي');

            let actionHtml = '—';
            if (apt.status === 'completed') {
                actionHtml = `
                    <button onclick="PatientApp.openFeedbackModal('${apt.id}')" class="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition">
                        ⭐ تقييم الزيارة
                    </button>
                `;
            } else if (apt.status === 'pending') {
                actionHtml = `
                    <button onclick="PatientApp.cancelAppointment('${apt.id}')" class="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition">
                        إلغاء الموعد
                    </button>
                `;
            }

            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="py-3 px-4 font-bold text-slate-900">
                        <div>${clinicName}</div>
                        <div class="text-[11px] text-slate-400 font-normal">📍 ${branchName}</div>
                    </td>
                    <td class="py-3 px-4 text-slate-700">${doctorName}</td>
                    <td class="py-3 px-4 font-mono text-slate-600">
                        <div>${Utils.formatDate(apt.date)}</div>
                        <div class="text-[11px] text-slate-400">${Utils.formatTime(apt.time_slot)}</div>
                    </td>
                    <td class="py-3 px-4">${Utils.renderStatusBadge(apt.status)}</td>
                    <td class="py-3 px-4 text-center">${actionHtml}</td>
                </tr>
            `;
        }).join('');
    },

    openFeedbackModal(appointmentId) {
        document.getElementById('feedback-appointment-id').value = appointmentId;
        document.getElementById('feedback-modal').classList.remove('hidden');
    },

    async cancelAppointment(appointmentId) {
        if (!confirm('هل أنت متأكد من رغبتك في إلغاء هذا الموعد؟')) return;

        const apt = this.myAppointments.find(a => a.id === appointmentId);
        if (apt) apt.status = 'cancelled';

        Utils.showToast('تم إلغاء الموعد بنجاح', 'info');
        this.renderAppointmentsTable();
    },

    bindEvents() {
        // حجز كشف جديد
        const form = document.getElementById('booking-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const clinicText = document.getElementById('clinic-select').selectedOptions[0].text;
                const branchText = document.getElementById('branch-select').selectedOptions[0].text;
                const doctorText = document.getElementById('doctor-select').selectedOptions[0].text;
                const date = document.getElementById('appointment-date').value || new Date().toISOString().split('T')[0];

                const newApt = {
                    id: 'apt_' + Date.now(),
                    clinic_name: clinicText,
                    branch_name: branchText,
                    doctor_name: doctorText,
                    date,
                    time_slot: '14:30',
                    status: 'pending'
                };

                this.myAppointments.unshift(newApt);
                Utils.showToast('تم إرسال طلب الحجز بنجاح! سيتم تأكيده من الاستقبال', 'success');
                this.renderAppointmentsTable();
            };
        }

        // إرسال التقييم
        const feedbackForm = document.getElementById('feedback-form');
        if (feedbackForm) {
            feedbackForm.onsubmit = (e) => {
                e.preventDefault();
                Utils.showToast('شكراً لك! تم استلام تقييمك وملاحظاتك بنجاح', 'success');
                document.getElementById('feedback-modal').classList.add('hidden');
                feedbackForm.reset();
            };
        }
    },

    getMockAppointments() {
        return [
            { id: 'p_apt_1', clinic_name: 'عيادات الشفاء التخصصية', branch_name: 'فرع المعادي الرئيسي', doctor_name: 'د. أحمد الشناوي', date: '2026-11-10', time_slot: '11:00', status: 'completed' },
            { id: 'p_apt_2', clinic_name: 'عيادات الشفاء التخصصية', branch_name: 'فرع المعادي الرئيسي', doctor_name: 'د. سارة محمود', date: '2026-11-20', time_slot: '13:30', status: 'pending' }
        ];
    }
};

window.PatientApp = PatientApp;
document.addEventListener('DOMContentLoaded', () => PatientApp.init());
