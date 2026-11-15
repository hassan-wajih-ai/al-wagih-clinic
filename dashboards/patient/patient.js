/**
 * منطق بوابة المريض (Patient Portal Controller)
 * يدعم: حجز الكشوفات (نقدي / تعاقدات)، وإرسال رسائل تأكيد الواتساب الفورية، وتقييم الزيارات
 */

const PatientApp = {
    myAppointments: [],
    clinics: [],
    branches: [],
    doctors: [],
    contracts: [],

    async init() {
        const authData = await Auth.protectRoute(['patient', 'admin', 'superadmin']);
        if (!authData) return;

        const displayNameEl = document.getElementById('user-display-name');
        if (displayNameEl) {
            displayNameEl.textContent = (authData.profile && authData.profile.full_name) ? authData.profile.full_name : 'المريض الكريم';
        }

        const nameInput = document.getElementById('patient-name-input');
        if (nameInput && authData.profile && authData.profile.full_name) {
            nameInput.value = authData.profile.full_name;
        }

        await this.loadDropdownData();
        await this.loadMyAppointments();
        this.bindEvents();

        window.addEventListener('alwagih_language_changed', () => this.renderAppointmentsTable());
    },

    async loadDropdownData() {
        // بيانات العيادات والفروع والأطباء
        this.clinics = [
            { id: 'cl_1', name: 'عيادات الشفاء التخصصية' },
            { id: 'cl_2', name: 'مركز الوجيه للقلب والباطنة' },
            { id: 'cl_3', name: 'مستشفى الأمل التخصصي' }
        ];

        this.branches = [
            { id: 'br_1', name: 'فرع المعادي الرئيسي' },
            { id: 'br_2', name: 'فرع مدينة نصر' },
            { id: 'br_3', name: 'فرع المهندسين' }
        ];

        this.doctors = [
            { id: 'doc_1', name: 'د. أحمد الشناوي (استشاري باطنة)' },
            { id: 'doc_2', name: 'د. سارة محمود (أخصائي أطفال)' },
            { id: 'doc_3', name: 'د. كريم عبد العزيز (استشاري عظام)' }
        ];

        this.contracts = [
            { id: 'c1', name: 'شركة مصر للتأمين', discount: 20 },
            { id: 'c2', name: 'نقابة المهندسين', discount: 25 },
            { id: 'c3', name: 'بتروتريد للخدمات البترولية', discount: 30 },
            { id: 'c4', name: 'أكسا للتأمين الطبي (AXA)', discount: 15 }
        ];

        // تعبئة عناصر الاختيار
        const clinicSelect = document.getElementById('clinic-select');
        const branchSelect = document.getElementById('branch-select');
        const doctorSelect = document.getElementById('doctor-select');
        const contractSelect = document.getElementById('patient-contract-select');

        if (clinicSelect) {
            clinicSelect.innerHTML = '<option value="">اختر العيادة...</option>' + 
                this.clinics.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
        if (branchSelect) {
            branchSelect.innerHTML = '<option value="">اختر الفرع...</option>' + 
                this.branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
        }
        if (doctorSelect) {
            doctorSelect.innerHTML = '<option value="">اختر الطبيب...</option>' + 
                this.doctors.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        }
        if (contractSelect) {
            contractSelect.innerHTML = '<option value="">اختر جهة التعاقد / التأمين...</option>' + 
                this.contracts.map(c => `<option value="${c.id}">${c.name} (خصم ${c.discount}%)</option>`).join('');
        }
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
        if (!tbody) return;

        if (!this.myAppointments || this.myAppointments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400">لا توجد لديك حجوزات مسجلة بعد.</td></tr>`;
            return;
        }

        const isEnglish = (typeof I18n !== 'undefined' && I18n.currentLang === 'en');

        tbody.innerHTML = this.myAppointments.map(apt => {
            const clinicName = apt.clinic ? apt.clinic.name : (apt.clinic_name || 'عيادات الشفاء');
            const branchName = apt.branch ? apt.branch.name : (apt.branch_name || 'فرع المعادي');
            const doctorName = apt.doctor ? apt.doctor.full_name : (apt.doctor_name || 'د. أحمد الشناوي');

            let actionHtml = '';
            if (apt.status === 'completed') {
                actionHtml = `
                    <button onclick="PatientApp.openFeedbackModal('${apt.id}')" class="btn-press px-3 py-1 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-bold transition">
                        ⭐ تقييم
                    </button>
                `;
            } else if (apt.status === 'pending') {
                actionHtml = `
                    <button onclick="PatientApp.cancelAppointment('${apt.id}')" class="btn-press px-2.5 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-bold transition">
                        إلغاء
                    </button>
                `;
            }

            const waBtn = `
                <button onclick="PatientApp.openWhatsAppConfirm('${apt.id}')" title="تأكيد الحجز عبر واتساب" class="btn-press px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold transition inline-flex items-center gap-1">
                    <span>💬</span> <span>واتساب</span>
                </button>
            `;

            const payBadge = apt.payment_type === 'corporate' 
                ? `<div class="text-[10px] text-purple-700 dark:text-purple-300 font-bold mt-0.5">🏢 تعاقد: ${apt.contract_name || 'شركة'}</div>` 
                : `<div class="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold mt-0.5">💵 سداد نقدي</div>`;

            return `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800 text-xs">
                    <td class="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        <div>${clinicName}</div>
                        <div class="text-[11px] text-slate-400 font-normal">📍 ${branchName}</div>
                    </td>
                    <td class="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">${doctorName}</td>
                    <td class="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        <div>${Utils.formatDate(apt.date)}</div>
                        <div class="text-[11px] text-slate-400">${Utils.formatTime(apt.time_slot)}</div>
                    </td>
                    <td class="py-3 px-4">
                        ${Utils.renderStatusBadge(apt.status)}
                        ${payBadge}
                    </td>
                    <td class="py-3 px-4 text-center">
                        <div class="flex items-center justify-center gap-2">
                            ${waBtn}
                            ${actionHtml}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    openWhatsAppConfirm(apptId) {
        const apt = this.myAppointments.find(a => a.id === apptId);
        if (apt && typeof WhatsAppService !== 'undefined') {
            WhatsAppService.showBookingConfirmationModal(apt);
        }
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
                const clinicEl = document.getElementById('clinic-select');
                const branchEl = document.getElementById('branch-select');
                const doctorEl = document.getElementById('doctor-select');
                const patientName = (document.getElementById('patient-name-input') ? document.getElementById('patient-name-input').value.trim() : '') || 'المريض الكريم';
                const patientPhone = (document.getElementById('patient-phone-input') ? document.getElementById('patient-phone-input').value.trim() : '') || '01000000000';

                const clinicText = (clinicEl && clinicEl.selectedIndex >= 0 && clinicEl.options[clinicEl.selectedIndex]) ? clinicEl.options[clinicEl.selectedIndex].text : 'عيادات الشفاء التخصصية';
                const branchText = (branchEl && branchEl.selectedIndex >= 0 && branchEl.options[branchEl.selectedIndex]) ? branchEl.options[branchEl.selectedIndex].text : 'الفرع الرئيسي';
                const doctorText = (doctorEl && doctorEl.selectedIndex >= 0 && doctorEl.options[doctorEl.selectedIndex]) ? doctorEl.options[doctorEl.selectedIndex].text : 'د. أحمد الشناوي';
                const date = document.getElementById('appointment-date').value || new Date().toISOString().split('T')[0];
                const payType = paySelect ? paySelect.value : 'cash';
                const contractSelect = document.getElementById('patient-contract-select');

                let contractName = null;
                if (payType === 'corporate' && contractSelect && contractSelect.selectedIndex > 0) {
                    contractName = contractSelect.options[contractSelect.selectedIndex].text.split('(')[0].trim();
                }

                const newApt = {
                    id: 'apt_' + Date.now(),
                    patient_name: patientName,
                    patient_phone: patientPhone,
                    clinic_name: clinicText,
                    branch_name: branchText,
                    doctor_name: doctorText,
                    date,
                    time_slot: '14:30',
                    amount: 250,
                    payment_type: payType,
                    contract_name: contractName,
                    status: 'pending'
                };

                this.myAppointments.unshift(newApt);
                this.saveStoredAppointments();
                Utils.showToast('تم إرسال طلب الحجز بنجاح! جاري فتح تأكيد الواتساب...', 'success');
                this.renderAppointmentsTable();
                form.reset();

                // إطلاق نافذة تأكيد الواتساب المباشرة
                if (typeof WhatsAppService !== 'undefined') {
                    setTimeout(() => {
                        WhatsAppService.showBookingConfirmationModal(newApt);
                    }, 200);
                }
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
            { id: 'p_apt_1', patient_name: 'محمد إبراهيم علي', patient_phone: '01012345678', clinic_name: 'عيادات الشفاء التخصصية', branch_name: 'فرع المعادي الرئيسي', doctor_name: 'د. أحمد الشناوي', date: '2026-11-10', time_slot: '11:00', payment_type: 'corporate', contract_name: 'شركة مصر للتأمين', status: 'completed' },
            { id: 'p_apt_2', patient_name: 'محمد إبراهيم علي', patient_phone: '01012345678', clinic_name: 'عيادات الشفاء التخصصية', branch_name: 'فرع المعادي الرئيسي', doctor_name: 'د. سارة محمود', date: '2026-11-20', time_slot: '13:30', payment_type: 'cash', status: 'pending' }
        ];
    }
};

window.PatientApp = PatientApp;
document.addEventListener('DOMContentLoaded', () => PatientApp.init());
