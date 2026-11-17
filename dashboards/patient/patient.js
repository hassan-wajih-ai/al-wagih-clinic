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
    activePrepFilter: 'all',

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
        this.renderLiveQueueTicket();
        this.renderMedicalPackages();
        this.renderMedicalResultsTable();
        this.renderPatientPrepGuide('all');
        this.renderPatientPrescriptions();
        this.renderPatientProcedures();
        this.bindEvents();

        window.addEventListener('alwagih_language_changed', () => {
            this.renderAppointmentsTable();
            this.renderMedicalPackages();
            this.renderMedicalResultsTable();
            this.renderPatientPrepGuide();
            this.renderPatientPrescriptions();
            this.renderPatientProcedures();
        });
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
                Utils.showToast('تم إرسال طلب الحجز بنجاح! يمكنك إرسال تفاصيل الحجز عبر الواتساب متى رغبت.', 'success');
                this.renderAppointmentsTable();
                this.showBookingSuccessBanner(newApt);
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
            { id: 'p_apt_1', patient_name: 'محمد إبراهيم علي', patient_phone: '01012345678', clinic_name: 'عيادات الشفاء التخصصية', branch_name: 'فرع المعادي الرئيسي', doctor_name: 'د. أحمد الشناوي', date: '2026-11-10', time_slot: '11:00', payment_type: 'corporate', contract_name: 'شركة مصر للتأمين', status: 'completed' },
            { id: 'p_apt_2', patient_name: 'محمد إبراهيم علي', patient_phone: '01012345678', clinic_name: 'عيادات الشفاء التخصصية', branch_name: 'فرع المعادي الرئيسي', doctor_name: 'د. سارة محمود', date: '2026-11-20', time_slot: '13:30', payment_type: 'cash', status: 'pending' }
        ];
    },

    renderMedicalResultsTable() {
        const tbody = document.getElementById('patient-results-table');
        if (!tbody) return;

        const results = [
            {
                id: 'res_lab_1',
                code: 'LAB-2026-8801',
                type: 'تحاليل مخبرية',
                icon: '🧪',
                name: 'صورة دم كاملة (CBC Glycated & Panel)',
                date: '2026-11-15',
                status: 'معتمدة ومكتملة',
                status_class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                summary: 'الهيموجلوبين: 14.2 g/dL • الصفائح: 260 K/uL • كرات الدم البيضاء: 7.1 K/uL (طبيعي)',
                doctor: 'د. هاني عثمان (استشاري باثولوجيا إكلينيكية)'
            },
            {
                id: 'res_rad_1',
                code: 'RAD-2026-4401',
                type: 'أشعة تشخيصية',
                icon: '🩻',
                name: 'رنين مغناطيسي على الفقرات القطنية (Lumbar MRI)',
                date: '2026-11-15',
                status: 'معتمد وموقع',
                status_class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                summary: 'L4-L5 posterior disc protrusion producing thecal sac impingement.',
                doctor: 'د. مروان البدري (استشاري أشعة تشخيصية)'
            }
        ];

        tbody.innerHTML = results.map(r => `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                <td class="py-3.5 px-4 font-mono font-bold text-cyan-700 dark:text-cyan-400 text-xs">
                    ${r.code}
                </td>
                <td class="py-3.5 px-4">
                    <div class="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>${r.icon}</span> <span>${r.name}</span>
                    </div>
                    <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">${r.summary}</div>
                </td>
                <td class="py-3.5 px-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                    ${r.date}
                </td>
                <td class="py-3.5 px-4">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${r.status_class}">
                        ✓ ${r.status}
                    </span>
                    <div class="text-[10px] text-slate-400 mt-0.5">${r.doctor}</div>
                </td>
                <td class="py-3.5 px-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <button onclick="PatientApp.openResultDetail('${r.code}')" class="btn-press px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 dark:bg-slate-800 text-white shadow-sm flex items-center gap-1">
                            <span>📄</span> <span>عرض التقرير</span>
                        </button>
                        <button onclick="PatientApp.sendResultWhatsApp('${r.code}', '${r.name}')" class="btn-press px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1" title="استلام النتيجة عبر واتساب">
                            <span>💬</span> <span>واتساب</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    openResultDetail(code) {
        Utils.showToast(`تقرير الفحص (${code}) موثق ومعتمد رسمياً مع كود QR. يمكنك طباعته من العيادة أو حفظه على هاتفك.`, 'info');
    },

    sendResultWhatsApp(code, name) {
        const phone = '01012345678';
        const msg = `مرحباً، أود استلام التقرير الطبي المعتمد للفحص (${name}) كود (${code}) من مجمع الوجيه الطبي.`;
        window.open(`https://wa.me/2${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    },

    // =========================================================================
    // تذكرة الانتظار الرقمية الذكية للمريض (Live Queue Ticket)
    // =========================================================================
    renderLiveQueueTicket() {
        const card = document.getElementById('patient-live-ticket-card');
        const ticketNoEl = document.getElementById('patient-live-ticket-no');
        const clinicInfoEl = document.getElementById('patient-live-clinic-info');
        const stateTextEl = document.getElementById('patient-queue-state-text');
        const estTimeEl = document.getElementById('patient-est-time');
        const nowCallingAlert = document.getElementById('patient-now-calling-alert');

        if (!card) return;

        // التحقق من وجود حجز مؤكد للمريض اليوم
        const activeApt = this.myAppointments.find(a => a.status !== 'completed' && a.status !== 'cancelled');
        if (!activeApt) {
            card.classList.add('hidden');
            return;
        }

        card.classList.remove('hidden');
        const ticketNo = 'A-102';
        if (ticketNoEl) ticketNoEl.textContent = ticketNo;
        if (clinicInfoEl) clinicInfoEl.textContent = `${activeApt.clinic_name || 'عيادات الشفاء'} — ${activeApt.doctor_name || 'د. استشاري'} (غرفة 101)`;

        // التحقق من آخر نداء في شاشة الصالة
        let lastCall = null;
        try {
            const stored = localStorage.getItem('alwagih_queue_last_call');
            if (stored) lastCall = JSON.parse(stored);
        } catch (e) {}

        const isCurrentlyCalled = lastCall && (lastCall.ticket_no === ticketNo || lastCall.patient_name === activeApt.patient_name);

        if (isCurrentlyCalled) {
            if (nowCallingAlert) nowCallingAlert.classList.remove('hidden');
            if (stateTextEl) stateTextEl.textContent = '📢 دورك الآن في غرفة الكشف!';
            if (estTimeEl) estTimeEl.textContent = 'تفضل بالدخول للطبيب فوراً';
        } else {
            if (nowCallingAlert) nowCallingAlert.classList.add('hidden');
            if (stateTextEl) stateTextEl.textContent = 'أمامك 1 مريض فقط';
            if (estTimeEl) estTimeEl.textContent = 'الوقت التقديري: ~ 8 دقائق';
        }
    },

    // =========================================================================
    // محفظة الروشتات وصرف الأدوية بالباركود (My E-Prescriptions Wallet)
    // =========================================================================
    getPatientPrescriptions() {
        const stored = localStorage.getItem('alwagih_pharmacy_prescriptions');
        if (stored) {
            try {
                const all = JSON.parse(stored);
                if (all && all.length > 0) return all;
            } catch (e) {}
        }
        return [
            {
                id: 'rx_101',
                rx_number: 'RX-2026-801',
                patient_name: 'طارق حسام مصطفى',
                doctor_name: 'د. محمد عبد العزيز',
                clinic_name: 'العيادة الباطنية والجهاز الهضمي',
                created_time: '2026-11-15 10:45 ص',
                status: 'pending',
                barcode: '6221008741021',
                items: [
                    { drug_name: 'Augmentin (أوجمنتين)', dosage: '1000 mg', instructions: 'قرص كل 12 ساعة بعد الأكل لمدة 7 أيام', quantity: 2, price: 199 },
                    { drug_name: 'Panadol Extra (بنادول إكسترا)', dosage: '500 mg', instructions: 'قرص عند اللزوم للصداع والحرارة', quantity: 1, price: 42 }
                ],
                total_amount: 241
            },
            {
                id: 'rx_901',
                rx_number: 'RX-2026-791',
                patient_name: 'طارق حسام مصطفى',
                doctor_name: 'د. سارة محمود',
                clinic_name: 'عيادة الباطنة العامة',
                created_time: '2026-11-10 11:20 ص',
                status: 'dispensed',
                barcode: '6221005541998',
                items: [
                    { drug_name: 'Concor (كونكور)', dosage: '5 mg', instructions: 'قرص صباحاً يومياً بعد الإفطار', quantity: 1, price: 60 }
                ],
                total_amount: 60
            }
        ];
    },

    renderPatientPrescriptions() {
        const tbody = document.getElementById('patient-prescriptions-table');
        if (!tbody) return;

        const prescriptions = this.getPatientPrescriptions();
        if (prescriptions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400 text-xs">لا توجد روشتات مسجلة في محفظتك</td></tr>`;
            return;
        }

        tbody.innerHTML = prescriptions.map(rx => {
            const isDispensed = rx.status === 'dispensed';
            const itemsSummary = (rx.items || []).map(i => i.drug_name).join(' + ') || 'أدوية علاجية متعددة';

            return `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td class="py-3.5 px-4 font-mono font-bold text-sky-600 dark:text-sky-400 text-xs">
                        ${rx.rx_number}
                        <div class="text-[10px] text-slate-400 font-sans">${rx.created_time || 'اليوم'}</div>
                    </td>
                    <td class="py-3.5 px-4">
                        <div class="font-bold text-slate-900 dark:text-white text-xs">${rx.doctor_name || 'د. الاستشاري'}</div>
                        <div class="text-[10px] text-slate-400">${rx.clinic_name || 'العيادة التخصصية'}</div>
                    </td>
                    <td class="py-3.5 px-4 text-xs text-slate-700 dark:text-slate-300">
                        <div class="font-semibold">${itemsSummary}</div>
                        <div class="text-[10px] text-slate-400">${(rx.items || []).length} أصناف موصوفة</div>
                    </td>
                    <td class="py-3.5 px-4">
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${isDispensed ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'}">
                            ${isDispensed ? '✓ تم الصرف بالصيدلية' : '⏳ جاهزة للصرف بصيدلية المجمع'}
                        </span>
                    </td>
                    <td class="py-3.5 px-4 text-center">
                        <button onclick="PatientApp.openPatientRxDetailsModal('${rx.id}')" class="btn-press px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm flex items-center justify-center gap-1.5 mx-auto">
                            <span>📲</span>
                            <span>إظهار الباركود والروشتة</span>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    openPatientRxDetailsModal(rxId) {
        const prescriptions = this.getPatientPrescriptions();
        const rx = prescriptions.find(r => r.id === rxId) || prescriptions[0];
        if (!rx) return;

        document.getElementById('pt-modal-rx-number').textContent = `روشتة إلكترونية #${rx.rx_number}`;
        document.getElementById('pt-modal-doctor-clinic').textContent = `${rx.doctor_name} — ${rx.clinic_name}`;
        document.getElementById('pt-modal-code-text').textContent = `RX-CODE: ${rx.barcode || '6221008741021'}`;

        const itemsContainer = document.getElementById('pt-modal-items-list');
        if (itemsContainer) {
            itemsContainer.innerHTML = (rx.items || []).map((item, idx) => `
                <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                    <div class="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                        <span>${idx + 1}. ${item.drug_name}</span>
                        <span class="font-mono text-purple-600 dark:text-purple-400">${item.dosage || ''}</span>
                    </div>
                    <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        التعليمات: ${item.instructions || 'حسب إرشادات الطبيب'}
                    </div>
                </div>
            `).join('');
        }

        const modal = document.getElementById('patient-rx-details-modal');
        if (modal) modal.classList.remove('hidden');
    },

    // =========================================================================
    // سجل علاجات الأسنان والعمليات الجراحية للمريض
    // =========================================================================
    renderPatientProcedures() {
        const tbody = document.getElementById('patient-procedures-table');
        if (!tbody) return;

        let dentals = [];
        let surgeries = [];

        try {
            const d = localStorage.getItem('alwagih_dental_procedures');
            if (d) dentals = JSON.parse(d);
            const s = localStorage.getItem('alwagih_day_surgeries');
            if (s) surgeries = JSON.parse(s);
        } catch (e) {}

        if (dentals.length === 0 && surgeries.length === 0) {
            // بيانات تجريبية افتراضية للمريض
            dentals = [
                {
                    tooth_number: 16,
                    tooth_name: 'ضرس أول علوي أيمن (UR6)',
                    procedure_name: 'حشو ضوئي تجميلي طبقات (Composite)',
                    procedure_date: '2026-11-12',
                    doctor_name: 'د. أحمد الشناوي',
                    status: 'completed'
                }
            ];
            surgeries = [
                {
                    procedure_name: 'خياطة جرح تجميلي سطحي مع غرز Vicryl',
                    surgeon_name: 'د. طارق العريان',
                    surgery_date: '2026-11-05',
                    postop_instructions: 'غيار معقم يومياً مع تجنب الإجهاد ومراجعة العيادة بعد 7 أيام',
                    status: 'completed'
                }
            ];
        }

        const all = [
            ...dentals.map(d => ({
                type: '🦷 طب وجراحة الأسنان',
                title: `${d.procedure_name} (سن #${d.tooth_number} - ${d.tooth_name})`,
                doctor: d.doctor_name || 'د. طبيب الأسنان',
                date: d.procedure_date || '2026-11-12',
                notes: 'تم فحص السن والإطباق بنجاح ومتابعة بعد 6 أشهر',
                status: 'تم الإجراء بنجاح'
            })),
            ...surgeries.map(s => ({
                type: '🏥 جراحة اليوم الواحد',
                title: s.procedure_name,
                doctor: s.surgeon_name || 'د. الجراح الاستشاري',
                date: s.surgery_date || '2026-11-05',
                notes: s.postop_instructions || 'تمت الجراحة بنجاح واستقرار العلامات الحيوية',
                status: 'تمت بنجاح'
            }))
        ];

        tbody.innerHTML = all.map(p => `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td class="py-3.5 px-4">
                    <span class="font-bold text-xs text-slate-900 dark:text-white">${p.type}</span>
                    <div class="text-[11px] text-purple-700 dark:text-purple-300 font-semibold mt-0.5">${p.title}</div>
                </td>
                <td class="py-3.5 px-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                    ${p.doctor}
                </td>
                <td class="py-3.5 px-4 font-mono text-xs text-slate-500">
                    ${p.date}
                </td>
                <td class="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                    ${p.notes}
                </td>
                <td class="py-3.5 px-4 text-center">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        ✓ ${p.status}
                    </span>
                </td>
            </tr>
        `).join('');
    },

    showBookingSuccessBanner(apt, customMsg) {
        const banner = document.getElementById('patient-booking-success-banner');
        const msgEl = document.getElementById('patient-booking-success-msg');
        const btn = document.getElementById('patient-banner-whatsapp-btn');
        if (!banner) return;

        if (msgEl) {
            msgEl.textContent = customMsg || `تم تأكيد حجزك برقم #${apt.id.slice(-6)} مع ${apt.doctor_name} بتاريخ ${apt.date}. يمكنك إرسال تفاصيل الموعد عبر الواتساب بالضغط على الزر أدناه.`;
        }

        if (btn) {
            btn.onclick = () => {
                this.openWhatsAppConfirm(apt.id);
            };
        }

        banner.classList.remove('hidden');
        banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    renderMedicalPackages() {
        const container = document.getElementById('patient-packages-container');
        if (!container) return;

        const packages = this.getMockMedicalPackages();
        container.innerHTML = packages.map(pkg => `
            <div class="card-hover bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between transition relative overflow-hidden group">
                <div class="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500"></div>
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <span class="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            ${pkg.badge}
                        </span>
                        <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                            توفير ${pkg.savings_percentage}%
                        </span>
                    </div>

                    <h4 class="text-base font-black text-slate-900 dark:text-white mb-1">${pkg.name}</h4>
                    <p class="text-xs text-slate-400 mb-4">${pkg.category}</p>

                    <div class="space-y-2 mb-5">
                        ${pkg.services.map(s => `
                            <div class="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                                <span class="text-emerald-500 font-bold shrink-0">✓</span>
                                <span>${s}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <div class="text-[11px] text-slate-400 line-through">${Utils.formatCurrency(pkg.regular_price)}</div>
                        <div class="text-lg font-black text-emerald-600 dark:text-emerald-400">${Utils.formatCurrency(pkg.package_price)}</div>
                    </div>
                    <button onclick="PatientApp.bookPackage('${pkg.id}')" class="btn-press px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition flex items-center gap-1.5">
                        <span>احجز الباقة الآن</span>
                        <span>🎯</span>
                    </button>
                </div>
            </div>
        `).join('');
    },

    bookPackage(packageId) {
        const pkg = this.getMockMedicalPackages().find(p => p.id === packageId);
        if (!pkg) return;

        const nameInput = document.getElementById('patient-name-input');
        const phoneInput = document.getElementById('patient-phone-input');
        const patientName = (nameInput && nameInput.value.trim()) || (this.currentPatient && this.currentPatient.full_name) || 'مريض الوجيه';
        const patientPhone = (phoneInput && phoneInput.value.trim()) || '01012345678';

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];

        const newApt = {
            id: 'pkg_apt_' + Date.now(),
            patient_name: patientName,
            patient_phone: patientPhone,
            clinic_name: 'مركز الفحص الطبي الشامل والوقاية',
            branch_name: 'فرع المعادي الرئيسي',
            doctor_name: 'فريق الفحص الطبي المتكامل',
            package_name: pkg.name,
            date: dateStr,
            time_slot: '10:00',
            amount: pkg.package_price,
            payment_type: 'cash',
            status: 'pending'
        };

        this.myAppointments.unshift(newApt);
        this.saveStoredAppointments();
        Utils.showToast(`تم حجز "${pkg.name}" بنجاح بسعر ${Utils.formatCurrency(pkg.package_price)}!`, 'success');
        this.renderAppointmentsTable();
        this.showBookingSuccessBanner(newApt, `تم تأكيد حجزك في "${pkg.name}". نسبة التوفير: ${pkg.savings_percentage}%! يمكنك مشاركة تفاصيل الحجز بالواتساب.`);
    },

    getMockMedicalPackages() {
        const stored = localStorage.getItem('alwagih_medical_packages');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) {}
        }
        return [
            {
                id: 'pkg_comprehensive',
                code: 'PKG-CHECKUP-01',
                name: 'باقة الفحص الطبي الشامل (Executive Checkup)',
                category: 'فحص طبي وقائي وباطني',
                badge: 'الأكثر طلباً ⭐',
                regular_price: 1450,
                package_price: 950,
                savings_percentage: 34,
                bookings_count: 84,
                status: 'active',
                services: [
                    'استشارة وفحص سريري باطنة عامة',
                    'تحليل صورة دم كاملة (CBC)',
                    'فحص سكر صائم ودهون كاملة (Lipid Profile)',
                    'وظائف كبد وكلى كاملة (Liver & Kidney Panel)',
                    'سونار وقائي للبطن والحوض (Abdominal US)',
                    'كشف وقائي للأسنان واللثة'
                ]
            },
            {
                id: 'pkg_diabetic',
                code: 'PKG-CARDIO-02',
                name: 'باقة رعاية السكري وصحة القلب (Cardio-Diabetic Care)',
                category: 'أمراض مزمنة وغدد',
                badge: 'عناية متخصصة 🩺',
                regular_price: 1100,
                package_price: 750,
                savings_percentage: 32,
                bookings_count: 62,
                status: 'active',
                services: [
                    'استشارة استشاري سكر وغدد صماء',
                    'تحليل سكر تراكمي (HbA1c)',
                    'تحليل زلال بول دقيق (Microalbuminuria)',
                    'تخطيط ورسم قلب كهربائي (ECG)',
                    'فحص قاع العين وقائي لمضاعفات السكر'
                ]
            },
            {
                id: 'pkg_women',
                code: 'PKG-WOMEN-03',
                name: 'باقة صحة المرأة ومتابعة الحمل (Women & Maternity)',
                category: 'صحة المرأة ورعاية الأجنة',
                badge: 'عناية فائقة 🌸',
                regular_price: 1600,
                package_price: 1100,
                savings_percentage: 31,
                bookings_count: 53,
                status: 'active',
                services: [
                    'كشف استشارية نساء وتوليد',
                    'أشعة سونار رباعي الأبعاد (4D Ultrasound)',
                    'فحص مخزون حديد وفيتامينات (Ferritin + Vit D)',
                    'مزرعة بول وتحليل مسحة وقائية',
                    'جلسة استشارة تغذية للحوامل والرضاعة'
                ]
            },
            {
                id: 'pkg_dental',
                code: 'PKG-DENTAL-04',
                name: 'باقة ابتسامة هوليوود والعناية الفموية (Dental Care)',
                category: 'طب وجراحة الأسنان',
                badge: 'ابتسامة مشرقة ✨',
                regular_price: 900,
                package_price: 550,
                savings_percentage: 39,
                bookings_count: 97,
                status: 'active',
                services: [
                    'فحص فموي وشجري كامل 32 سناً (Odontogram)',
                    'أشعة بانوراما رقمية للفكين (OPG X-Ray)',
                    'جلسة تنظيف وتلميع أسنان بالموجات الصوتية',
                    'إزالة الترسبات الجيرية والتصبغات السطحية',
                    'جلسة فلورايد وقائي لحماية المينا'
                ]
            },
            {
                id: 'pkg_athletic',
                code: 'PKG-FITNESS-05',
                name: 'باقة اللياقة والفحص الرياضي للشباب (Athletic Screening)',
                category: 'طب رياضي ولياقة بدنية',
                badge: 'صحة ولياقة ⚡',
                regular_price: 1250,
                package_price: 800,
                savings_percentage: 36,
                bookings_count: 41,
                status: 'active',
                services: [
                    'فحص لياقة قلبية ومؤشرات الحيوية',
                    'تحليل صورة دم كاملة وأملاح الدم (Electrolytes)',
                    'فحص فيتامين د وكالسيوم ومغنسيوم (Vit D + Ca + Mg)',
                    'فحص العمود الفقري والتوازن العضلي',
                    'استشارة أخصائي علاج طبيعي وإصابات ملاعب'
                ]
            }
        ];
    },

    // =========================================================================
    // دليل التحاليل والأشعة وإرشادات التحضير للمريض (Patient Prep Guide)
    // =========================================================================
    renderPatientPrepGuide(customFilter, customQuery) {
        const grid = document.getElementById('patient-prep-guide-grid');
        if (!grid) return;

        const filter = customFilter !== undefined ? customFilter : this.activePrepFilter;
        const query = customQuery !== undefined ? customQuery : (document.getElementById('patient-prep-search-input')?.value || '').toLowerCase().trim();

        const labTests = (window.MedicalCatalog && MedicalCatalog.labTests) ? MedicalCatalog.labTests : [];
        const radExams = (window.MedicalCatalog && MedicalCatalog.radiologyExams) ? MedicalCatalog.radiologyExams : [];

        let items = [];

        labTests.forEach(t => {
            const isFasting = (t.fasting_hours && t.fasting_hours > 0);
            let categoryMatch = true;
            if (filter === 'fasting') categoryMatch = isFasting;
            else if (filter === 'non_fasting') categoryMatch = !isFasting;
            else if (filter === 'contrast' || filter === 'us') categoryMatch = false;

            if (categoryMatch) {
                items.push({
                    type: 'lab',
                    icon: '🧪',
                    name_ar: t.name_ar,
                    name_en: t.name_en,
                    category: t.category,
                    tube: t.tube_name_ar,
                    badge: isFasting ? `صيام ${t.fasting_hours} ساعة` : 'بدون صيام',
                    badgeColor: isFasting ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                    prep: t.prep_notes_ar || (isFasting ? `يتطلب صيام تام عن الأكل والشرب (عدا الماء) لمدة ${t.fasting_hours} ساعة` : 'يمكن إجراؤه في أي وقت دون شروط صيام خاصة'),
                    tat: t.tat_hours ? `النتيجة خلال ${t.tat_hours} ساعة` : 'النتيجة نفس اليوم',
                    cost: t.cost
                });
            }
        });

        radExams.forEach(e => {
            const hasContrast = e.contrast;
            const isUS = e.modality === 'Ultrasound';
            let categoryMatch = true;
            if (filter === 'contrast') categoryMatch = hasContrast;
            else if (filter === 'us') categoryMatch = isUS;
            else if (filter === 'fasting' || filter === 'non_fasting') categoryMatch = false;

            if (categoryMatch) {
                items.push({
                    type: 'rad',
                    icon: '🩻',
                    name_ar: e.name_ar,
                    name_en: e.name_en,
                    category: e.modality,
                    tube: e.body_region,
                    badge: hasContrast ? 'بالصبغة (Contrast)' : (isUS ? 'سونار / موجات' : e.modality),
                    badgeColor: hasContrast ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
                    prep: e.prep_notes_ar || (hasContrast ? 'فحص وظائف كلى حديث (Creatinine) وصيام 4-6 ساعات' : 'بدون تحضيرات مسبقة خاصة'),
                    tat: `المدة ${e.duration_min} دقيقة`,
                    cost: e.cost
                });
            }
        });

        if (query) {
            items = items.filter(it => 
                it.name_ar.toLowerCase().includes(query) || 
                it.name_en.toLowerCase().includes(query) ||
                (it.prep && it.prep.toLowerCase().includes(query)) ||
                (it.category && it.category.toLowerCase().includes(query))
            );
        }

        if (items.length === 0) {
            grid.innerHTML = `<div class="col-span-full py-8 text-center text-xs text-slate-400">لا توجد تحاليل أو أشعة مطابقة لمعايير البحث الحالية.</div>`;
            return;
        }

        grid.innerHTML = items.slice(0, 18).map(it => `
            <div class="card-hover p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">${it.icon}</span>
                        <div>
                            <h4 class="font-bold text-slate-900 dark:text-white text-xs">${it.name_ar}</h4>
                            <p class="text-[10px] text-slate-400 font-mono">${it.name_en}</p>
                        </div>
                    </div>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${it.badgeColor} shrink-0">${it.badge}</span>
                </div>
                <div class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    <div class="font-bold text-slate-700 dark:text-slate-200 mb-0.5">📌 إرشادات التحضير:</div>
                    ${it.prep}
                </div>
                <div class="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-slate-500">
                    <span>⏱️ ${it.tat}</span>
                    <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">${Utils.formatCurrency(it.cost)}</span>
                </div>
            </div>
        `).join('');
    },

    filterPatientPrep(filter) {
        this.activePrepFilter = filter;
        const pills = ['all', 'fasting', 'non_fasting', 'contrast', 'us'];
        pills.forEach(p => {
            const btn = document.getElementById(`prep-pill-${p}`);
            if (btn) {
                if (p === filter) {
                    btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white transition';
                } else {
                    btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition';
                }
            }
        });
        this.renderPatientPrepGuide(filter);
    },

    searchPatientPrep() {
        const query = (document.getElementById('patient-prep-search-input')?.value || '').toLowerCase().trim();
        this.renderPatientPrepGuide(undefined, query);
    }
};

window.PatientApp = PatientApp;
document.addEventListener('DOMContentLoaded', () => PatientApp.init());
