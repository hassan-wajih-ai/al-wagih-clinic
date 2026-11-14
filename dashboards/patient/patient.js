/**
 * منطق بوابة المريض الإلكترونية (Patient Controller)
 * نظام «الوجيه» لإدارة العيادات — يدعم الحجز النقدي وتعاقدات الشركات
 */

const PatientApp = {
    currentPatient: null,
    myAppointments: [],
    contracts: [],

    async init() {
        const authData = await Auth.protectRoute(['patient', 'admin', 'superadmin']);
        if (!authData) return;

        this.currentPatient = authData.profile;
        if (this.currentPatient) {
            document.getElementById('user-display-name').textContent = this.currentPatient.full_name || 'المريض';
        }

        await this.loadClinicsAndBranches();
        await this.loadContracts();
        await this.loadMyAppointments();
        this.bindEvents();
    },

    async loadClinicsAndBranches() {
        const clinicSelect = document.getElementById('clinic-select');
        const branchSelect = document.getElementById('branch-select');
        const doctorSelect = document.getElementById('doctor-select');

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

    async loadContracts() {
        const select = document.getElementById('patient-contract-select');
        if (!select) return;

        this.contracts = [
            { id: 'c1', name: 'شركة مصر للتأمين', discount: 20 },
            { id: 'c2', name: 'نقابة المهندسين', discount: 25 },
            { id: 'c3', name: 'بتروتريد للخدمات البترولية', discount: 30 },
            { id: 'c4', name: 'أكسا للتأمين (AXA)', discount: 15 }
        ];

        select.innerHTML = '<option value="">اختر جهة التعاقد التابع لها...</option>' +
            this.contracts.map(c => `
                <option value="${c.id}" data-discount="${c.discount}">
                    ${c.name} (تغطية وخصم ${c.discount}%)
                </option>
            `).join('');
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
        localStorage.setItem('alwagih_appointments', JSON.stringify(this.myAppointments));
    },

    async loadMyAppointments() {
        this.myAppointments = this.getStoredAppointments();
        this.renderAppointmentsTable();
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

            const payBadge = apt.payment_type === 'corporate' 
                ? `<div class="text-[10px] text-purple-700 font-bold mt-0.5">🏢 تعاقد: ${apt.contract_name || 'شركة'}</div>` 
                : `<div class="text-[10px] text-emerald-700 font-bold mt-0.5">💵 سداد نقدي</div>`;

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
                    <td class="py-3 px-4">
                        ${Utils.renderStatusBadge(apt.status)}
                        ${payBadge}
                    </td>
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
        if (apt) {
            apt.status = 'cancelled';
            this.saveStoredAppointments();
        }
        Utils.showToast('تم إلغاء الموعد بنجاح', 'info');
        this.renderAppointmentsTable();
    },

    bindEvents() {
        const paySelect = document.getElementById('patient-pay-type');
        const corpContainer = document.getElementById('patient-corp-container');

        if (paySelect && corpContainer) {
            paySelect.onchange = () => {
                if (paySelect.value === 'corporate') {
                    corpContainer.classList.remove('hidden');
                } else {
                    corpContainer.classList.add('hidden');
                }
            };
        }

        const form = document.getElementById('booking-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const clinicText = document.getElementById('clinic-select').selectedOptions[0].text;
                const branchText = document.getElementById('branch-select').selectedOptions[0].text;
                const doctorText = document.getElementById('doctor-select').selectedOptions[0].text;
                const date = document.getElementById('appointment-date').value || new Date().toISOString().split('T')[0];
                const payType = paySelect.value;
                const contractSelect = document.getElementById('patient-contract-select');

                let contractName = null;
                if (payType === 'corporate' && contractSelect.selectedIndex > 0) {
                    contractName = contractSelect.options[contractSelect.selectedIndex].text.split('(')[0].trim();
                }

                const newApt = {
                    id: 'apt_' + Date.now(),
                    clinic_name: clinicText,
                    branch_name: branchText,
                    doctor_name: doctorText,
                    date,
                    time_slot: '14:30',
                    payment_type: payType,
                    contract_name: contractName,
                    status: 'pending'
                };

                this.myAppointments.unshift(newApt);
                this.saveStoredAppointments();
                Utils.showToast('تم إرسال طلب الحجز بنجاح! سيتم مراجعته وتأكيده من الاستقبال', 'success');
                this.renderAppointmentsTable();
                form.reset();
            };
        }

        const feedbackForm = document.getElementById('feedback-form');
        if (feedbackForm) {
            feedbackForm.onsubmit = (e) => {
                e.preventDefault();
                Utils.showToast('شكراً لك! تم استلام تقييمك بنجاح', 'success');
                document.getElementById('feedback-modal').classList.add('hidden');
                feedbackForm.reset();
            };
        }
    },

    getMockAppointments() {
        return [
            { id: 'p_apt_1', clinic_name: 'عيادات الشفاء التخصصية', branch_name: 'فرع المعادي الرئيسي', doctor_name: 'د. أحمد الشناوي', date: '2026-11-10', time_slot: '11:00', payment_type: 'corporate', contract_name: 'شركة مصر للتأمين', status: 'completed' },
            { id: 'p_apt_2', clinic_name: 'عيادات الشفاء التخصصية', branch_name: 'فرع المعادي الرئيسي', doctor_name: 'د. سارة محمود', date: '2026-11-20', time_slot: '13:30', payment_type: 'cash', status: 'pending' }
        ];
    }
};

window.PatientApp = PatientApp;
document.addEventListener('DOMContentLoaded', () => PatientApp.init());
