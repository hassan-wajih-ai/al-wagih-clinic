/**
 * منطق لوحة تحكم الطبيب وغرفة الكشف (Doctor Controller)
 * نظام «الوجيه» لإدارة العيادات
 */

const DoctorApp = {
    currentDoctor: null,
    appointments: [],
    activeAppointment: null,
    currentPrescriptionItems: [],
    activeClinicMode: 'general',
    dentalTeethState: {},
    dentalTreatmentPlan: [],
    selectedTooth: null,

    async init() {
        // حماية الصفحة والتحقق من الصلاحيات
        const authData = await Auth.protectRoute(['doctor', 'admin', 'superadmin']);
        if (!authData) return;

        this.currentDoctor = authData.profile;
        document.getElementById('user-display-name').textContent = this.currentDoctor.full_name || 'د. الطبيب المعالج';
        document.getElementById('doctor-title').textContent = `عيادة: ${this.currentDoctor.full_name || 'الكشف الطبي'}`;

        this.populateDrugSelect();
        this.populateDocLabCatalog();
        this.populateDocRadCatalog();
        this.populateDocProcedures();
        this.initDentalOdontogram();
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
            if (typeof isSupabaseConfigured === 'function' && isSupabaseConfigured() && window.db) {
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

        // تفعيل أول مريض في الانتظار تلقائياً لتكون كافة الأزرار والأيقونات جاهزة للعمل فورياً
        if (!this.activeAppointment && this.appointments && this.appointments.length > 0) {
            const firstWaiting = this.appointments.find(a => a.status === 'waiting' || a.status === 'in_progress') || this.appointments[0];
            if (firstWaiting) this.selectAppointment(firstWaiting);
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

        this.currentPrescriptionItems = [];
        this.renderPrescriptionItems();
        this.checkInteractions();

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
                const autoSendPharmacy = document.getElementById('doc-auto-send-pharmacy')?.checked ?? true;

                const patientName = this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name;
                const patientPhone = this.activeAppointment.patient ? this.activeAppointment.patient.phone : this.activeAppointment.patient_phone;

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

                    // إرسال الروشتة إلكترونياً للصيدلية الداخلية إذا رغب الطبيب
                    if (autoSendPharmacy && (this.currentPrescriptionItems.length > 0 || prescription.length > 0)) {
                        this.dispatchPrescriptionToPharmacy(patientName, patientPhone, diagnosis, prescription);
                    }

                    Utils.showToast('تم حفظ التشخيص والروشتة وإتمام الكشف بنجاح', 'success');
                    
                    // إعادة ضبط غرفة الفحص
                    this.activeAppointment = null;
                    this.currentPrescriptionItems = [];
                    this.renderPrescriptionItems();
                    this.checkInteractions();

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
    },

    populateDocLabCatalog(selectedCat) {
        const select = document.getElementById('doc-lab-test-select');
        if (!select) return;

        const allTests = (window.MedicalCatalog && MedicalCatalog.labTests) ? MedicalCatalog.labTests : [];
        const cat = selectedCat || (document.getElementById('doc-lab-cat-select')?.value || 'all');
        const list = allTests.filter(t => cat === 'all' || t.category === cat);

        if (list.length === 0) {
            select.innerHTML = '<option value="">لا توجد فحوصات في هذا التصنيف</option>';
            return;
        }

        select.innerHTML = list.map(t => `
            <option value="${t.key || t.id}" data-tube="${t.tube_name_ar}" data-cost="${t.cost}" data-fasting="${t.fasting_hours || 0}" data-prep="${t.prep_notes_ar || ''}">
                ${t.name_ar} - ${t.name_en} (${Utils.formatCurrency(t.cost)})
            </option>
        `).join('');

        this.onDocLabTestChanged();
    },

    onDocLabCategoryChanged() {
        const cat = document.getElementById('doc-lab-cat-select')?.value || 'all';
        this.populateDocLabCatalog(cat);
    },

    onDocLabTestChanged() {
        const select = document.getElementById('doc-lab-test-select');
        if (!select || !select.options || select.selectedIndex < 0 || !select.options[select.selectedIndex]) return;

        const opt = select.options[select.selectedIndex];
        if (!opt) return;

        const tube = opt.getAttribute('data-tube') || 'أنبوبة فحص';
        const cost = opt.getAttribute('data-cost') || '250';
        const fasting = opt.getAttribute('data-fasting') || '0';
        const prep = opt.getAttribute('data-prep') || '';

        const tubeEl = document.getElementById('doc-lab-tube-preview');
        const prepEl = document.getElementById('doc-lab-prep-preview');
        const costEl = document.getElementById('doc-lab-cost-preview');

        if (tubeEl) tubeEl.textContent = tube;
        if (prepEl) prepEl.textContent = prep ? prep : (parseInt(fasting) > 0 ? `صيام ${fasting} ساعة` : 'بدون صيام');
        if (costEl) costEl.textContent = `${Utils.formatCurrency(parseFloat(cost))}`;
    },

    ensureActivePatient() {
        if (!this.activeAppointment) {
            if (this.appointments && this.appointments.length > 0) {
                const firstWaiting = this.appointments.find(a => a.status === 'waiting' || a.status === 'in_progress') || this.appointments[0];
                this.selectAppointment(firstWaiting);
            } else {
                this.activeAppointment = {
                    id: 'demo_appt_curr',
                    patient_id: 'p_curr',
                    patient_name: 'محمد عبد الرحمن محمود',
                    patient: { full_name: 'محمد عبد الرحمن محمود', phone: '01099887766' },
                    age: 42,
                    gender: 'male',
                    status: 'waiting',
                    time_slot: '10:00 ص'
                };
            }
        }
        return this.activeAppointment;
    },

    openOrderLabModal() {
        this.ensureActivePatient();
        const patientName = this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name;
        const nameInput = document.getElementById('doc-lab-patient-name');
        if (nameInput) nameInput.value = patientName;
        this.populateDocLabCatalog('all');
        const modal = document.getElementById('doctor-lab-modal');
        if (modal) modal.classList.remove('hidden');
    },

    closeOrderLabModal() {
        const modal = document.getElementById('doctor-lab-modal');
        if (modal) modal.classList.add('hidden');
    },

    submitOrderLab() {
        if (!this.activeAppointment) return;
        const patientName = this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name;
        const patientPhone = this.activeAppointment.patient?.phone || this.activeAppointment.patient_phone || '';
        const testSelect = document.getElementById('doc-lab-test-select');
        const testVal = testSelect.value;
        const testItem = window.MedicalCatalog ? MedicalCatalog.getLabTest(testVal) : null;
        const testName = testItem ? (testItem.name_ar + ' (' + testItem.name_en + ')') : (testSelect.options[testSelect.selectedIndex]?.text || 'تحليل طبي');
        const notes = document.getElementById('doc-lab-notes').value.trim();

        // 1. تحديث نص الروشتة الحالية
        const currentRx = document.getElementById('prescription-input').value;
        document.getElementById('prescription-input').value = (currentRx ? currentRx + '\n' : '') + `[طلب فحص معملي]: ${testName} ${notes ? '(' + notes + ')' : ''}`;

        // 2. تسجيل أمر فحص مخبري منظم في التخزين المحلي لسحب العينات
        const newLabOrder = {
            id: 'LAB-' + Date.now(),
            patient_id: this.activeAppointment.patient_id || this.activeAppointment.id,
            patient_name: patientName,
            patient_phone: patientPhone,
            doctor_name: this.doctor ? (this.doctor.full_name || 'طبيب الكشف') : 'طبيب الكشف',
            clinic_name: this.doctor ? (this.doctor.clinic_name || 'العيادة التخصصية') : 'العيادة التخصصية',
            test_key: testVal,
            test_name: testItem ? testItem.name_ar : testName,
            test_name_en: testItem ? testItem.name_en : '',
            test_code: testItem ? testItem.code : 'LAB-REQ',
            tube: testItem ? testItem.tube : 'أنبوبة معملية',
            tube_name_ar: testItem ? testItem.tube_name_ar : 'أنبوبة فحص',
            tube_color: testItem ? testItem.tube_color : 'purple',
            fasting_hours: testItem ? (testItem.fasting_hours || 0) : 0,
            prep: testItem ? (testItem.prep || testItem.prep_notes_ar) : '',
            cost: testItem ? (testItem.cost || testItem.price) : 150,
            status: 'pending_sampling',
            sample_barcode: 'SMP-' + Math.floor(100000 + Math.random() * 900000),
            notes: notes,
            created_at: new Date().toISOString()
        };

        try {
            const stored = localStorage.getItem('alwagih_lab_orders');
            let list = stored ? JSON.parse(stored) : [];
            list.unshift(newLabOrder);
            localStorage.setItem('alwagih_lab_orders', JSON.stringify(list));
        } catch(e) {}

        Utils.showToast(`تم إرسال طلب التحليل (${newLabOrder.test_name}) لمركز سحب العينات والمختبر 🧪`, 'success');
        document.getElementById('doctor-lab-modal').classList.add('hidden');
    },

    populateDocRadCatalog(selectedMod) {
        const select = document.getElementById('doc-rad-exam-select');
        if (!select) return;

        const allExams = (window.MedicalCatalog && MedicalCatalog.radiologyExams) ? MedicalCatalog.radiologyExams : [];
        const mod = selectedMod || (document.getElementById('doc-rad-mod-select')?.value || 'all');
        const contrastFilter = this.currentRadContrastFilter || 'all';

        let list = allExams;
        if (mod !== 'all') {
            list = list.filter(e => e.modality === mod || e.category === mod);
        }
        if (contrastFilter === 'contrast') {
            list = list.filter(e => e.contrast === true);
        } else if (contrastFilter === 'plain') {
            list = list.filter(e => e.contrast === false);
        }

        if (list.length === 0) {
            select.innerHTML = '<option value="">لا توجد فحوصات مطابقة للبحث أو الفلتر المحدد</option>';
            return;
        }

        select.innerHTML = list.map(e => `
            <option value="${e.key || e.id}" data-contrast="${e.contrast ? '1' : '0'}" data-cost="${e.cost || e.price}" data-duration="${e.duration_mins || 15}" data-prep="${e.prep_notes_ar || e.prep || ''}">
                ${e.contrast ? '⚠️ [بالصبغة] ' : '[عادي] '} [${e.modality}] ${e.name_ar} - ${e.name_en} (${Utils.formatCurrency(e.cost || e.price)})
            </option>
        `).join('');

        this.onDocRadExamChanged();
    },

    onDocRadModalityChanged() {
        const mod = document.getElementById('doc-rad-mod-select')?.value || 'all';
        this.populateDocRadCatalog(mod);
    },

    onDocRadContrastFilterChanged(filter) {
        this.currentRadContrastFilter = filter || 'all';
        const mod = document.getElementById('doc-rad-mod-select')?.value || 'all';
        this.populateDocRadCatalog(mod);
    },

    onDocRadExamChanged() {
        const select = document.getElementById('doc-rad-exam-select');
        if (!select || !select.options || select.selectedIndex < 0 || !select.options[select.selectedIndex]) return;

        const opt = select.options[select.selectedIndex];
        if (!opt) return;

        const hasContrast = opt.getAttribute('data-contrast') === '1';
        const cost = opt.getAttribute('data-cost') || '300';
        const prep = opt.getAttribute('data-prep') || '';

        const contrastEl = document.getElementById('doc-rad-contrast-preview');
        const prepEl = document.getElementById('doc-rad-prep-preview');
        const costEl = document.getElementById('doc-rad-cost-preview');

        if (contrastEl) {
            contrastEl.textContent = hasContrast ? '⚠️ بالصبغة (Contrast Required - وظائف كلى)' : 'بدون صبغة (Plain)';
            contrastEl.className = hasContrast ? 'font-black text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300 font-bold';
        }
        if (prepEl) prepEl.textContent = prep || (hasContrast ? 'فحص وظائف كلى حديث وصيام 4-6 ساعات' : 'بدون تحضير خاص');
        if (costEl) costEl.textContent = `${Utils.formatCurrency(parseFloat(cost))}`;
    },

    openOrderRadModal() {
        this.ensureActivePatient();
        const patientName = this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name;
        const nameInput = document.getElementById('doc-rad-patient-name');
        if (nameInput) nameInput.value = patientName;
        this.currentRadContrastFilter = 'all';
        this.populateDocRadCatalog('all');
        const modal = document.getElementById('doctor-rad-modal');
        if (modal) modal.classList.remove('hidden');
    },

    closeOrderRadModal() {
        const modal = document.getElementById('doctor-rad-modal');
        if (modal) modal.classList.add('hidden');
    },

    submitOrderRad() {
        if (!this.activeAppointment) return;
        const patientName = this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name;
        const patientPhone = this.activeAppointment.patient?.phone || this.activeAppointment.patient_phone || '';
        const examSelect = document.getElementById('doc-rad-exam-select');
        const examVal = examSelect.value;
        const examItem = window.MedicalCatalog ? MedicalCatalog.getRadiologyExam(examVal) : null;
        const examName = examItem ? (examItem.name_ar + ' (' + examItem.name_en + ')') : (examSelect.options[examSelect.selectedIndex]?.text || 'فحص أشعة');
        const notes = document.getElementById('doc-rad-notes').value.trim();

        // 1. تحديث نص الروشتة الحالية
        const currentRx = document.getElementById('prescription-input').value;
        document.getElementById('prescription-input').value = (currentRx ? currentRx + '\n' : '') + `[طلب فحص أشعة]: ${examName} ${notes ? '(الدواعي: ' + notes + ')' : ''}`;

        // 2. تسجيل أمر أشعة منظم
        const newRadOrder = {
            id: 'RAD-' + Date.now(),
            patient_id: this.activeAppointment.patient_id || this.activeAppointment.id,
            patient_name: patientName,
            patient_phone: patientPhone,
            doctor_name: this.doctor ? (this.doctor.full_name || 'طبيب الكشف') : 'طبيب الكشف',
            clinic_name: this.doctor ? (this.doctor.clinic_name || 'العيادة التخصصية') : 'العيادة التخصصية',
            exam_key: examVal,
            exam_name: examItem ? examItem.name_ar : examName,
            exam_name_en: examItem ? examItem.name_en : '',
            exam_code: examItem ? examItem.code : 'RAD-REQ',
            modality: examItem ? examItem.modality : 'X-Ray',
            contrast: examItem ? examItem.contrast : false,
            contrast_type: examItem ? examItem.contrast_type : 'None',
            body_part: examItem ? (examItem.body_part_ar || examItem.body_part) : 'عام',
            prep: examItem ? (examItem.prep || examItem.prep_notes_ar) : '',
            cost: examItem ? (examItem.cost || examItem.price) : 300,
            status: 'scheduled',
            notes: notes,
            created_at: new Date().toISOString()
        };

        try {
            const stored = localStorage.getItem('alwagih_rad_orders');
            let list = stored ? JSON.parse(stored) : [];
            list.unshift(newRadOrder);
            localStorage.setItem('alwagih_rad_orders', JSON.stringify(list));
        } catch(e) {}

        Utils.showToast(`تم إرسال طلب الأشعة (${newRadOrder.exam_name}) لقسم الأشعة وتوثيقه بالروشتة 🩻`, 'success');
        document.getElementById('doctor-rad-modal').classList.add('hidden');
    },

    // Clinic Procedures in Doctor Dashboard
    populateDocProcedures(selectedSpecialty) {
        const select = document.getElementById('doc-proc-select');
        if (!select) return;

        const allProcs = (window.MedicalCatalog && MedicalCatalog.clinicProcedures) ? MedicalCatalog.clinicProcedures : [];
        const spec = selectedSpecialty || (document.getElementById('doc-proc-specialty-select')?.value || 'all');
        const list = allProcs.filter(p => spec === 'all' || p.specialty === spec);

        if (list.length === 0) {
            select.innerHTML = '<option value="">لا توجد إجراءات في هذا التخصص</option>';
            return;
        }

        select.innerHTML = list.map(p => `
            <option value="${p.code || p.id}" data-fee="${p.fee || p.price}" data-comm="${p.doctor_commission_rate}" data-duration="${p.duration || '15 دقيقة'}" data-room="${p.equipment || 'غرفة كشف تخصصية'}">
                [${p.specialty_name || p.specialty}] ${p.name_ar || p.name} (${Utils.formatCurrency(p.fee || p.price)})
            </option>
        `).join('');

        this.onDocProcSelected();
    },

    onDocProcSpecialtyChanged() {
        const spec = document.getElementById('doc-proc-specialty-select')?.value || 'all';
        this.populateDocProcedures(spec);
    },

    onDocProcSelected() {
        const select = document.getElementById('doc-proc-select');
        if (!select || !select.options || select.selectedIndex < 0 || !select.options[select.selectedIndex]) return;

        const opt = select.options[select.selectedIndex];
        if (!opt) return;

        const fee = parseFloat(opt.getAttribute('data-fee') || '250');
        const commRate = parseFloat(opt.getAttribute('data-comm') || '35');
        const duration = opt.getAttribute('data-duration') || '15 دقيقة';
        const room = opt.getAttribute('data-room') || 'غرفة كشف تخصصية';

        const commVal = Math.round(fee * (commRate / 100));

        const feeEl = document.getElementById('doc-proc-fee-preview');
        const commEl = document.getElementById('doc-proc-commission-preview');
        const durEl = document.getElementById('doc-proc-duration-preview');
        const roomEl = document.getElementById('doc-proc-room-preview');

        if (feeEl) feeEl.textContent = `${Utils.formatCurrency(fee)}`;
        if (commEl) commEl.textContent = `${commRate}% (${Utils.formatCurrency(commVal)})`;
        if (durEl) durEl.textContent = `المدة: ${duration}`;
        if (roomEl) roomEl.textContent = room;
    },

    openOrderProcedureModal() {
        this.ensureActivePatient();
        const patientName = this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name;
        const nameInput = document.getElementById('doc-proc-patient-name');
        if (nameInput) nameInput.value = patientName;
        this.populateDocProcedures('all');
        const modal = document.getElementById('doctor-procedure-modal');
        if (modal) modal.classList.remove('hidden');
    },

    closeOrderProcedureModal() {
        const modal = document.getElementById('doctor-procedure-modal');
        if (modal) modal.classList.add('hidden');
    },

    submitOrderProcedure() {
        if (!this.activeAppointment) return;
        const patientName = this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name;
        const select = document.getElementById('doc-proc-select');
        const procVal = select.value;
        const procItem = window.MedicalCatalog ? MedicalCatalog.getClinicProcedure(procVal) : null;
        const procName = procItem ? procItem.name_ar : (select.options[select.selectedIndex]?.text || 'إجراء طبي');
        const notes = document.getElementById('doc-proc-notes').value.trim();

        // 1. تحديث نص الروشتة الحالية
        const currentRx = document.getElementById('prescription-input').value;
        document.getElementById('prescription-input').value = (currentRx ? currentRx + '\n' : '') + `[إجراء طبي مُنجز بالعيادة]: ${procName} ${notes ? '(' + notes + ')' : ''}`;

        // 2. تسجيل الإجراء المنفذ في سجل الإجراءات لحساب عمولة الطبيب
        const newPerformedProc = {
            id: 'PROC-' + Date.now(),
            patient_id: this.activeAppointment.patient_id || this.activeAppointment.id,
            patient_name: patientName,
            doctor_name: this.doctor ? (this.doctor.full_name || 'طبيب الكشف') : 'طبيب الكشف',
            procedure_code: procItem ? procItem.code : procVal,
            procedure_name: procName,
            specialty: procItem ? procItem.specialty : 'general',
            specialty_name: procItem ? procItem.specialty_name : 'عام',
            fee: procItem ? (procItem.fee || procItem.price) : 250,
            doctor_commission_rate: procItem ? procItem.doctor_commission_rate : 35,
            doctor_commission_amount: procItem ? Math.round((procItem.fee || procItem.price) * (procItem.doctor_commission_rate / 100)) : 85,
            notes: notes,
            created_at: new Date().toISOString()
        };

        try {
            const stored = localStorage.getItem('alwagih_performed_procedures');
            let list = stored ? JSON.parse(stored) : [];
            list.unshift(newPerformedProc);
            localStorage.setItem('alwagih_performed_procedures', JSON.stringify(list));
        } catch(e) {}

        Utils.showToast(`تم توثيق الإجراء الطبي (${procName}) واحتساب عمولة الطبيب بنجاح 🩺`, 'success');
        document.getElementById('doctor-procedure-modal').classList.add('hidden');
    },

    openPatientHistoryResultsModal() {
        this.ensureActivePatient();
        const container = document.getElementById('doctor-history-content');
        if (container) {
            container.innerHTML = `
                <div class="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span>🧪</span> <span>صورة دم كاملة CBC (عينة: LAB-2026-8801)</span>
                        </span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">معتمدة ومكتملة</span>
                    </div>
                    <div class="text-xs text-slate-600 dark:text-slate-400 font-mono">
                        Hb: 14.2 g/dL • RBCs: 4.8 M/uL • WBCs: 7.1 K/uL • PLT: 260 K/uL
                    </div>
                    <div class="text-[11px] text-slate-500 mt-1">التعليق: صورة دم طبيعية، لا توجد دلالات لفقر دم.</div>
                </div>

                <div class="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span>🩻</span> <span>رنين مغناطيسي على الفقرات القطنية (RAD-2026-4401)</span>
                        </span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">معتمد وموقع</span>
                    </div>
                    <div class="text-xs text-indigo-900 dark:text-indigo-300 font-bold">
                        الانطباع: L4-L5 posterior disc protrusion producing thecal sac impingement.
                    </div>
                    <div class="text-[11px] text-slate-500 mt-1">استشاري الأشعة: د. مروان البدري • التاريخ: 2026-11-15</div>
                </div>
            `;
        }

        const modal = document.getElementById('doctor-history-modal');
        if (modal) modal.classList.remove('hidden');
    },

    closePatientHistoryResultsModal() {
        const modal = document.getElementById('doctor-history-modal');
        if (modal) modal.classList.add('hidden');
    },

    /**
     * نداء المريض صوتياً وبث الإشعار على شاشة التلفزيون (Queue TV)
     */
    callActivePatientVoice() {
        if (!this.activeAppointment) {
            Utils.showToast('يرجى اختيار مريض من قائمة الانتظار للنداء', 'warning');
            return;
        }

        const patientName = this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name;
        const clinicName = 'العيادة التخصصية';
        const roomNo = '101';
        const ticketNo = 'A-' + (100 + (parseInt(this.activeAppointment.id.replace(/\D/g, '') || 1) % 90));

        this.playQueueChime();
        this.speakQueueAnnouncement(ticketNo, clinicName, roomNo);

        try {
            localStorage.setItem('alwagih_queue_last_call', JSON.stringify({
                ticket_no: ticketNo,
                patient_name: patientName,
                clinic: clinicName,
                room_no: roomNo,
                timestamp: Date.now()
            }));
        } catch(e) {}

        Utils.showToast(`🔊 جاري الآن نداء المريض: ${patientName} على شاشة التلفزيون`, 'info');
    },

    playQueueChime() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const now = ctx.currentTime;
            
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(523.25, now);
            gain1.gain.setValueAtTime(0.25, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.5);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(783.99, now + 0.25);
            gain2.gain.setValueAtTime(0.25, now + 0.25);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.25);
            osc2.stop(now + 0.9);
        } catch(e) {}
    },

    speakQueueAnnouncement(ticketNo, clinicName, roomNo) {
        if (!('speechSynthesis' in window)) return;
        try {
            window.speechSynthesis.cancel();
            const text = `تذكرة رقم ${ticketNo}، عيادة ${clinicName}، غرفة ${roomNo}`;
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = 'ar-SA';
            utter.rate = 0.92;
            const voices = window.speechSynthesis.getVoices();
            const arVoice = voices.find(v => v.lang && v.lang.startsWith('ar'));
            if (arVoice) utter.voice = arVoice;
            window.speechSynthesis.speak(utter);
        } catch(e) {}
    },

    openMyCommissionsModal() {
        const modal = document.getElementById('doctor-my-commissions-modal');
        if (modal) modal.classList.remove('hidden');
    },

    closeMyCommissionsModal() {
        const modal = document.getElementById('doctor-my-commissions-modal');
        if (modal) modal.classList.add('hidden');
    },

    // =========================================================================
    // الصيدلية الإلكترونية وفاحص التداخلات الدوائية (E-Prescription & CDS)
    // =========================================================================
    getPharmacyDrugs() {
        if (typeof MedicalCatalog !== 'undefined' && Array.isArray(MedicalCatalog.medications) && MedicalCatalog.medications.length) {
            return MedicalCatalog.medications.map(m => ({
                id: m.id || m.code,
                name: m.trade_name_ar ? (m.trade_name + ' (' + m.trade_name_ar + ')') : (m.name || m.trade_name),
                trade_name: m.trade_name,
                trade_name_ar: m.trade_name_ar,
                generic: m.generic_name,
                strength: m.strength,
                default_inst: m.default_dosage,
                price: m.selling_price || m.price || 40,
                cost: m.cost_price || m.cost || 30,
                stock: m.stock_quantity || m.stock || 100,
                category: m.category,
                category_ar: m.category_ar,
                form: m.form
            }));
        }
        const stored = localStorage.getItem('alwagih_pharmacy_drugs');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) {}
        }
        return [
            { id: 'drug_1', name: 'Augmentin (أوجمنتين)', generic: 'Amoxicillin + Clavulanic Acid', strength: '1000 mg', default_inst: 'قرص كل 12 ساعة بعد الأكل لمدة 7 أيام', price: 99.5 },
            { id: 'drug_2', name: 'Panadol Extra (بنادول إكسترا)', generic: 'Paracetamol + Caffeine', strength: '500 mg', default_inst: 'قرص عند اللزوم للصداع والحرارة', price: 42 },
            { id: 'drug_3', name: 'Concor (كونكور)', generic: 'Bisoprolol Fumarate', strength: '5 mg', default_inst: 'قرص صباحاً يومياً بعد الإفطار', price: 60 },
            { id: 'drug_4', name: 'Ciprolon (سيبرولون)', generic: 'Ciprofloxacin', strength: '750 mg', default_inst: 'قرص كل 12 ساعة بعد الأكل', price: 52 },
            { id: 'drug_5', name: 'Antacid Gaviscon (جافيسكون شراب)', generic: 'Sodium Alginate + Calcium', strength: '150 ml', default_inst: '10 مل بعد الوجبات وقبل النوم', price: 75 },
            { id: 'drug_6', name: 'Warfarin Marevan (ماريفان)', generic: 'Warfarin Sodium', strength: '5 mg', default_inst: 'قرص مساءً حسب جدول السيولة INR', price: 35 },
            { id: 'drug_7', name: 'Aspirin Protect (أسبيرين بروتكت)', generic: 'Acetylsalicylic Acid', strength: '100 mg', default_inst: 'قرص بعد الغداء يومياً للوقاية', price: 28 },
            { id: 'drug_8', name: 'Ceftriaxone (سفترياكسون فيال)', generic: 'Ceftriaxone Sodium', strength: '1 g Vial', default_inst: 'حقنة عضلية كل 24 ساعة بعد اختبار الحساسية', price: 55 }
        ];
    },

    populateDrugSelect() {
        const select = document.getElementById('doc-drug-select');
        if (!select) return;
        const drugs = this.getPharmacyDrugs();

        // تجميع الأصناف حسب المجموعة العلاجية لتسهيل اختيار الطبيب
        const categories = {};
        drugs.forEach(d => {
            const cat = d.category_ar || 'أدوية عامة';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(d);
        });

        let html = '<option value="">-- اختر صنفاً من صيدلية العيادة (124+ دواء) --</option>';
        for (const [catName, list] of Object.entries(categories)) {
            html += `<optgroup label="💊 ${catName}">`;
            list.forEach(d => {
                html += `<option value="${d.name}" data-dosage="${d.strength}" data-instructions="${d.default_inst || ''}" data-price="${d.price || 40}">${d.name} [${d.strength}]</option>`;
            });
            html += '</optgroup>';
        }

        select.innerHTML = html;
    },

    onDrugSelectChange() {
        const select = document.getElementById('doc-drug-select');
        if (!select) return;
        const selectedOpt = (select.selectedIndex >= 0 && select.options) ? select.options[select.selectedIndex] : null;
        if (!selectedOpt || !selectedOpt.value) return;

        const dosageInput = document.getElementById('doc-drug-dosage');
        const instInput = document.getElementById('doc-drug-instructions');

        if (dosageInput && selectedOpt.dataset.dosage) dosageInput.value = selectedOpt.dataset.dosage;
        if (instInput && selectedOpt.dataset.instructions) instInput.value = selectedOpt.dataset.instructions;
    },

    addPrescriptionItem() {
        const select = document.getElementById('doc-drug-select');
        const dosageInput = document.getElementById('doc-drug-dosage');
        const instInput = document.getElementById('doc-drug-instructions');

        let drugName = select ? select.value : '';
        const dosage = dosageInput ? dosageInput.value.trim() : '';
        const instructions = instInput ? instInput.value.trim() : '';
        const selectedOpt = select ? select.options[select.selectedIndex] : null;
        const price = selectedOpt && selectedOpt.dataset.price ? parseFloat(selectedOpt.dataset.price) : 50;

        if (!drugName) {
            Utils.showToast('يرجى اختيار صنف دواء من القائمة أولاً', 'warning');
            return;
        }

        const newItem = {
            drug_name: drugName,
            dosage: dosage || 'جرعة قياسية',
            instructions: instructions || 'حسب إرشادات الطبيب',
            quantity: 1,
            price: price
        };

        this.currentPrescriptionItems.push(newItem);
        this.renderPrescriptionItems();
        this.checkInteractions();
        this.syncPrescriptionText();

        if (select) select.value = '';
        if (dosageInput) dosageInput.value = '';
        if (instInput) instInput.value = '';

        Utils.showToast(`تمت إضافة (${drugName}) إلى الروشتة بنجاح`, 'success');
    },

    removePrescriptionItem(index) {
        if (index >= 0 && index < this.currentPrescriptionItems.length) {
            this.currentPrescriptionItems.splice(index, 1);
            this.renderPrescriptionItems();
            this.checkInteractions();
            this.syncPrescriptionText();
        }
    },

    renderPrescriptionItems() {
        const container = document.getElementById('doc-rx-items-container');
        const tbody = document.getElementById('doc-rx-items-tbody');
        const totalBadge = document.getElementById('doc-rx-total-badge');

        if (!container || !tbody) return;

        if (this.currentPrescriptionItems.length === 0) {
            container.classList.add('hidden');
            if (totalBadge) totalBadge.textContent = '';
            return;
        }

        container.classList.remove('hidden');
        let total = 0;

        tbody.innerHTML = this.currentPrescriptionItems.map((item, idx) => {
            const itemTotal = (item.price || 0) * (item.quantity || 1);
            total += itemTotal;
            return `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td class="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">${item.drug_name}</td>
                    <td class="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-400">
                        <span class="font-mono font-bold text-purple-700 dark:text-purple-300">${item.dosage}</span> - ${item.instructions}
                    </td>
                    <td class="py-2 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">${item.quantity || 1} علبة</td>
                    <td class="py-2 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-300">${Utils.formatCurrency(itemTotal)}</td>
                    <td class="py-2 px-3 text-center">
                        <button type="button" onclick="DoctorApp.removePrescriptionItem(${idx})" class="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs">✕</button>
                    </td>
                </tr>
            `;
        }).join('');

        if (totalBadge) totalBadge.textContent = `إجمالي الروشتة التقديري: ${Utils.formatCurrency(total)}`;
    },

    checkInteractions() {
        const alertBox = document.getElementById('doc-interaction-alerts');
        if (!alertBox) return;

        const drugs = this.currentPrescriptionItems.map(item => (item.drug_name || '').toLowerCase());
        const alerts = [];

        // قواعد التداخلات الإكلينيكية
        const hasWarfarin = drugs.some(d => d.includes('warfarin') || d.includes('ماريفان'));
        const hasAspirin = drugs.some(d => d.includes('aspirin') || d.includes('أسبيرين'));
        const hasCipro = drugs.some(d => d.includes('cipro') || d.includes('سيبرولون'));
        const hasAntacid = drugs.some(d => d.includes('antacid') || d.includes('gaviscon') || d.includes('جافيسكون'));
        const hasConcor = drugs.some(d => d.includes('concor') || d.includes('bisoprolol') || d.includes('كونكور'));
        const hasAugmentin = drugs.some(d => d.includes('augmentin') || d.includes('أوجمنتين'));

        if (hasWarfarin && hasAspirin) {
            alerts.push({
                severity: 'high',
                title: 'تداخل عالي الخطورة (Major Interaction): Warfarin + Aspirin',
                desc: 'مزيج الوارفارين والأسبرين يرفع خطر النزيف المعدي الحاد والداخلي بأكثر من 300%. يُوصى ببديل آمن أو مراقبة دقيقة ومكثفة لـ INR.'
            });
        }

        if (hasCipro && hasAntacid) {
            alerts.push({
                severity: 'moderate',
                title: 'تداخل متوسط (Moderate Interaction): Ciprofloxacin + Antacid',
                desc: 'مركبات الكالسيوم والألومنيوم والماغنيسيوم تمخلب السيبروفلوكساسين وتقلل امتصاصه الحيوي حتى 70%. يجب الفصل بساعتين على الأقل.'
            });
        }

        if (hasConcor && hasCipro) {
            alerts.push({
                severity: 'moderate',
                title: 'تداخل محتمل (Moderate Interaction): Concor + Ciprofloxacin',
                desc: 'قد يزيد السيبروفلوكساسين من احتمالية إطالة فترة QT وبطء نبضات القلب (Bradycardia) لدى مرضى حاصرات بيتا.'
            });
        }

        if (hasWarfarin && hasAugmentin) {
            alerts.push({
                severity: 'moderate',
                title: 'تداخل محتمل (Moderate Interaction): Warfarin + Augmentin',
                desc: 'المضادات الحيوية واسعة المجال تثبط فلورا الأمعاء المصنعة لفيتامين K مما يرفع حساسية الوارفارين ويزيد الـ INR.'
            });
        }

        if (alerts.length === 0) {
            alertBox.classList.add('hidden');
            alertBox.innerHTML = '';
            return;
        }

        alertBox.classList.remove('hidden');
        alertBox.innerHTML = alerts.map(a => `
            <div class="p-3 rounded-2xl border ${a.severity === 'high' ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200' : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'}">
                <div class="flex items-center gap-2 font-bold text-xs mb-1">
                    <span>${a.severity === 'high' ? '🚨' : '⚠️'}</span>
                    <span>${a.title}</span>
                </div>
                <div class="text-[11px] leading-relaxed opacity-90">${a.desc}</div>
            </div>
        `).join('');
    },

    syncPrescriptionText() {
        const textarea = document.getElementById('prescription-input');
        if (!textarea) return;

        if (this.currentPrescriptionItems.length === 0) {
            return;
        }

        const lines = this.currentPrescriptionItems.map((item, idx) => {
            return `${idx + 1}. ${item.drug_name} (${item.dosage}) - ${item.instructions} [الكمية: ${item.quantity || 1} علبة]`;
        });

        textarea.value = lines.join('\n');
    },

    dispatchPrescriptionToPharmacy(patientName, patientPhone, diagnosis, prescriptionText) {
        try {
            const stored = localStorage.getItem('alwagih_pharmacy_prescriptions');
            let rxs = [];
            if (stored) {
                try { rxs = JSON.parse(stored); } catch (e) {}
            }

            const rxItems = this.currentPrescriptionItems.length > 0 ? this.currentPrescriptionItems : [
                { drug_name: prescriptionText.slice(0, 40) || 'علاج دوائي مركب', dosage: 'حسب إرشادات الطبيب', instructions: prescriptionText, quantity: 1, price: 60 }
            ];

            let total = 0;
            rxItems.forEach(i => total += (i.price || 50) * (i.quantity || 1));

            const newRx = {
                id: 'rx_' + Date.now(),
                rx_number: 'RX-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900),
                patient_name: patientName,
                patient_phone: patientPhone,
                doctor_name: this.currentDoctor ? this.currentDoctor.full_name : 'د. استشاري العيادة',
                clinic_name: 'عيادة الكشف الطبي',
                payment_type: 'cash',
                company_name: '',
                copay_percentage: 100,
                created_time: 'اليوم ' + new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                status: 'pending',
                diagnosis: diagnosis || '',
                items: rxItems,
                total_amount: total,
                patient_copay: total,
                insurance_claim: 0
            };

            rxs.unshift(newRx);
            localStorage.setItem('alwagih_pharmacy_prescriptions', JSON.stringify(rxs));
            Utils.showToast(`✓ تم إرسال الروشتة (#${newRx.rx_number}) بنجاح إلى صيدلية المجمع لصرفها فوراً`, 'success');
        } catch (e) {
            console.error('Failed to dispatch prescription to pharmacy:', e);
        }
    },

    // =========================================================================
    // التبديل بين أنماط العيادات (General, Dental, Day Surgery)
    // =========================================================================
    switchClinicMode(mode) {
        this.activeClinicMode = mode;
        const modes = ['general', 'dental', 'surgery'];
        modes.forEach(m => {
            const btn = document.getElementById(`doc-mode-btn-${m}`);
            const container = document.getElementById(`doc-mode-${m}-container`);
            const isActive = m === mode;

            if (btn) {
                if (isActive) {
                    btn.className = 'btn-press px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white shadow-sm transition flex items-center gap-1.5';
                } else {
                    btn.className = 'btn-press px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5';
                }
            }
            if (container) {
                container.classList.toggle('hidden', !isActive);
            }
        });

        if (mode === 'dental') {
            this.renderDentalOdontogram();
            this.renderDentalTreatmentPlan();
        }
    },

    // =========================================================================
    // عيادة ومخطط الأسنان التفاعلي (Interactive Dental Odontogram FDI 11-48)
    // =========================================================================
    initDentalOdontogram() {
        const upperArch = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
        const lowerArch = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

        upperArch.concat(lowerArch).forEach(num => {
            if (!this.dentalTeethState[num]) {
                this.dentalTeethState[num] = {
                    condition: 'sound',
                    surfaces: [],
                    procedure: '',
                    cost: 0
                };
            }
        });

        const upperContainer = document.getElementById('dental-arch-upper');
        const lowerContainer = document.getElementById('dental-arch-lower');

        if (upperContainer) {
            upperContainer.innerHTML = upperArch.map(num => this.createToothButtonHTML(num)).join('');
        }
        if (lowerContainer) {
            lowerContainer.innerHTML = lowerArch.map(num => this.createToothButtonHTML(num)).join('');
        }

        this.renderDentalOdontogram();
    },

    getToothAnatomicalName(num) {
        const names = {
            11: 'قاطع مركزي علوي أيمن (UR1)', 12: 'قاطع جانبي علوي أيمن (UR2)', 13: 'ناب علوي أيمن (UR3)', 14: 'ضاحك أول علوي أيمن (UR4)', 15: 'ضاحك ثانٍ علوي أيمن (UR5)', 16: 'ضرس أول علوي أيمن (UR6)', 17: 'ضرس ثانٍ علوي أيمن (UR7)', 18: 'ضرس عقل علوي أيمن (UR8)',
            21: 'قاطع مركزي علوي أيسر (UL1)', 22: 'قاطع جانبي علوي أيسر (UL2)', 23: 'ناب علوي أيسر (UL3)', 24: 'ضاحك أول علوي أيسر (UL4)', 25: 'ضاحك ثانٍ علوي أيسر (UL5)', 26: 'ضرس أول علوي أيسر (UL6)', 27: 'ضرس ثانٍ علوي أيسر (UL7)', 28: 'ضرس عقل علوي أيسر (UL8)',
            41: 'قاطع مركزي سفلي أيمن (LR1)', 42: 'قاطع جانبي سفلي أيمن (LR2)', 43: 'ناب سفلي أيمن (LR3)', 44: 'ضاحك أول سفلي أيمن (LR4)', 45: 'ضاحك ثانٍ سفلي أيمن (LR5)', 46: 'ضرس أول سفلي أيمن (LR6)', 47: 'ضرس ثانٍ سفلي أيمن (LR7)', 48: 'ضرس عقل سفلي أيمن (LR8)',
            31: 'قاطع مركزي سفلي أيسر (LL1)', 32: 'قاطع جانبي سفلي أيسر (LL2)', 33: 'ناب سفلي أيسر (LL3)', 34: 'ضاحك أول سفلي أيسر (LL4)', 35: 'ضاحك ثانٍ سفلي أيسر (LL5)', 36: 'ضرس أول سفلي أيسر (LL6)', 37: 'ضرس ثانٍ سفلي أيسر (LL7)', 38: 'ضرس عقل سفلي أيسر (LL8)'
        };
        return names[num] || `سن رقم ${num}`;
    },

    createToothButtonHTML(num) {
        return `
            <button type="button" id="tooth-btn-${num}" onclick="DoctorApp.openToothModal(${num})" class="btn-press p-1.5 rounded-xl border flex flex-col items-center justify-between text-center transition min-w-[50px] h-[72px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-500 shadow-sm">
                <span class="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">#${num}</span>
                <span id="tooth-icon-${num}" class="text-base my-0.5">🦷</span>
                <span id="tooth-badge-${num}" class="text-[8px] font-bold px-1 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 truncate max-w-full">
                    سليم
                </span>
            </button>
        `;
    },

    renderDentalOdontogram() {
        Object.keys(this.dentalTeethState).forEach(numStr => {
            const num = parseInt(numStr);
            const state = this.dentalTeethState[num];
            const btn = document.getElementById(`tooth-btn-${num}`);
            const iconEl = document.getElementById(`tooth-icon-${num}`);
            const badgeEl = document.getElementById(`tooth-badge-${num}`);
            if (!btn || !badgeEl || !state) return;

            const cond = state.condition || 'sound';
            let bgClass = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800';
            let badgeText = 'سليم';
            let badgeClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';

            if (cond === 'caries') {
                bgClass = 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700';
                badgeText = 'تسوس';
                badgeClass = 'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200';
            } else if (cond === 'composite') {
                bgClass = 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-700';
                badgeText = 'حشو';
                badgeClass = 'bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200';
            } else if (cond === 'endo') {
                bgClass = 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700';
                badgeText = 'عصب';
                badgeClass = 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200';
            } else if (cond === 'crown') {
                bgClass = 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-700';
                badgeText = 'طربوش';
                badgeClass = 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
            } else if (cond === 'implant') {
                bgClass = 'bg-teal-50 dark:bg-teal-950/40 border-teal-400 dark:border-teal-700';
                badgeText = 'زراعة';
                badgeClass = 'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200';
            } else if (cond === 'extracted') {
                bgClass = 'bg-slate-200 dark:bg-slate-800 border-slate-400 opacity-60';
                badgeText = 'مخلوع';
                badgeClass = 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200';
            }

            btn.className = `btn-press p-1.5 rounded-xl border flex flex-col items-center justify-between text-center transition min-w-[50px] h-[72px] shadow-sm ${bgClass}`;
            badgeEl.textContent = badgeText;
            badgeEl.className = `text-[8px] font-bold px-1 py-0.2 rounded-md truncate max-w-full ${badgeClass}`;
        });
    },

    openToothModal(toothNumber) {
        this.selectedTooth = toothNumber;
        const modal = document.getElementById('doc-dental-tooth-modal');
        if (!modal) return;

        const toothState = this.dentalTeethState[toothNumber] || { condition: 'sound', surfaces: [], procedure: '', cost: 0 };
        document.getElementById('modal-tooth-number').textContent = toothNumber;
        document.getElementById('modal-tooth-name').textContent = this.getToothAnatomicalName(toothNumber);

        const condSelect = document.getElementById('modal-tooth-condition');
        if (condSelect) condSelect.value = toothState.condition || 'sound';

        ['o', 'm', 'd', 'b', 'l'].forEach(s => {
            const el = document.getElementById(`surf-${s}`);
            if (el) el.checked = (toothState.surfaces || []).includes(s.toUpperCase());
        });

        document.getElementById('modal-tooth-procedure').value = toothState.procedure || 'فحص وتشخيص';
        document.getElementById('modal-tooth-cost').value = toothState.cost || 0;

        modal.classList.remove('hidden');
    },

    closeToothModal() {
        const modal = document.getElementById('doc-dental-tooth-modal');
        if (modal) modal.classList.add('hidden');
        this.selectedTooth = null;
    },

    onToothConditionChange() {
        const cond = document.getElementById('modal-tooth-condition')?.value;
        const procInput = document.getElementById('modal-tooth-procedure');
        const costInput = document.getElementById('modal-tooth-cost');
        if (!procInput || !costInput) return;

        const defaults = {
            sound: { proc: 'سليم - فحص دوري', cost: 0 },
            caries: { proc: 'حشو كمبوزيت ضوئي تجميلي', cost: 650 },
            composite: { proc: 'حشو تجميلي ليزر معزز', cost: 700 },
            endo: { proc: 'علاج جذور وعصب بالموتور الآلي', cost: 1500 },
            crown: { proc: 'تركيبة طربوش زيركون معتمد', cost: 2200 },
            implant: { proc: 'زراعة أسنان تيتانيوم جراحية', cost: 9500 },
            extracted: { proc: 'خلع جراحي للسن المتضرر', cost: 500 }
        };

        const def = defaults[cond] || defaults.sound;
        procInput.value = def.proc;
        costInput.value = def.cost;
    },

    applyToothTreatment() {
        if (!this.selectedTooth) return;
        const cond = document.getElementById('modal-tooth-condition').value;
        const proc = document.getElementById('modal-tooth-procedure').value.trim();
        const cost = parseFloat(document.getElementById('modal-tooth-cost').value) || 0;

        const surfaces = [];
        ['o', 'm', 'd', 'b', 'l'].forEach(s => {
            if (document.getElementById(`surf-${s}`)?.checked) surfaces.push(s.toUpperCase());
        });

        this.dentalTeethState[this.selectedTooth] = {
            condition: cond,
            surfaces: surfaces,
            procedure: proc,
            cost: cost
        };

        const existingIdx = this.dentalTreatmentPlan.findIndex(i => i.tooth_number === this.selectedTooth);
        const planItem = {
            tooth_number: this.selectedTooth,
            tooth_name: this.getToothAnatomicalName(this.selectedTooth),
            condition: cond,
            surface: surfaces.length > 0 ? surfaces.join('-') : 'التاج الكامل',
            procedure_name: proc,
            cost: cost,
            status: 'completed'
        };

        if (cond === 'sound') {
            if (existingIdx !== -1) this.dentalTreatmentPlan.splice(existingIdx, 1);
        } else {
            if (existingIdx !== -1) {
                this.dentalTreatmentPlan[existingIdx] = planItem;
            } else {
                this.dentalTreatmentPlan.push(planItem);
            }
        }

        this.renderDentalOdontogram();
        this.renderDentalTreatmentPlan();
        this.closeToothModal();
        Utils.showToast(`تم تحديث حالة السن (#${this.selectedTooth}) بنجاح`, 'success');
    },

    renderDentalTreatmentPlan() {
        const tbody = document.getElementById('dental-plan-tbody');
        const costBadge = document.getElementById('dental-total-cost-badge');
        if (!tbody) return;

        if (this.dentalTreatmentPlan.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400 text-xs">لا توجد إجراءات مسجلة بالمخطط حتى الآن</td></tr>`;
            if (costBadge) costBadge.textContent = 'إجمالي الخطة: 0 ج.م';
            return;
        }

        let total = 0;
        tbody.innerHTML = this.dentalTreatmentPlan.map((item, idx) => {
            total += (item.cost || 0);
            return `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td class="py-2.5 px-3 font-mono font-bold text-teal-600 dark:text-teal-400">#${item.tooth_number}</td>
                    <td class="py-2.5 px-3 font-bold text-slate-900 dark:text-white text-xs">${item.tooth_name}</td>
                    <td class="py-2.5 px-3 text-xs text-slate-700 dark:text-slate-300">${item.procedure_name}</td>
                    <td class="py-2.5 px-3 font-mono text-xs text-purple-600 dark:text-purple-400">${item.surface}</td>
                    <td class="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">${Utils.formatCurrency(item.cost)}</td>
                    <td class="py-2.5 px-3">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            مُعتمد
                        </span>
                    </td>
                    <td class="py-2.5 px-3 text-center">
                        <button type="button" onclick="DoctorApp.removeDentalTreatment(${idx})" class="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded text-xs">✕</button>
                    </td>
                </tr>
            `;
        }).join('');

        if (costBadge) costBadge.textContent = `إجمالي الخطة: ${Utils.formatCurrency(total)}`;
    },

    removeDentalTreatment(idx) {
        if (idx >= 0 && idx < this.dentalTreatmentPlan.length) {
            const item = this.dentalTreatmentPlan[idx];
            if (this.dentalTeethState[item.tooth_number]) {
                this.dentalTeethState[item.tooth_number] = { condition: 'sound', surfaces: [], procedure: '', cost: 0 };
            }
            this.dentalTreatmentPlan.splice(idx, 1);
            this.renderDentalOdontogram();
            this.renderDentalTreatmentPlan();
            Utils.showToast('تم حذف الإجراء من خطة الأسنان', 'info');
        }
    },

    resetDentalChart() {
        if (!confirm('هل تريد إعادة تعيين كافة أسنان المخطط وإلغاء التحديدات؟')) return;
        Object.keys(this.dentalTeethState).forEach(k => {
            this.dentalTeethState[k] = { condition: 'sound', surfaces: [], procedure: '', cost: 0 };
        });
        this.dentalTreatmentPlan = [];
        this.renderDentalOdontogram();
        this.renderDentalTreatmentPlan();
        Utils.showToast('تمت إعادة ضبط مخطط الأسنان بالكامل', 'info');
    },

    saveDentalTreatmentPlan() {
        const patientName = this.activeAppointment ? (this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name) : 'مريض العيادة';
        const patientPhone = this.activeAppointment ? (this.activeAppointment.patient ? this.activeAppointment.patient.phone : this.activeAppointment.patient_phone) : '01011223344';

        if (this.dentalTreatmentPlan.length === 0) {
            Utils.showToast('يرجى تحديد أسنات وإجراءات في المخطط أولاً', 'warning');
            return;
        }

        try {
            const stored = localStorage.getItem('alwagih_dental_procedures');
            let list = stored ? JSON.parse(stored) : [];
            this.dentalTreatmentPlan.forEach(p => {
                list.unshift({
                    id: 'dental_' + Date.now() + '_' + p.tooth_number,
                    patient_name: patientName,
                    patient_phone: patientPhone,
                    doctor_name: this.currentDoctor ? this.currentDoctor.full_name : 'د. أحمد الشناوي',
                    tooth_number: p.tooth_number,
                    tooth_name: p.tooth_name,
                    surface: p.surface,
                    procedure_name: p.procedure_name,
                    cost: p.cost,
                    procedure_date: new Date().toISOString().split('T')[0],
                    payment_type: 'cash',
                    status: 'completed'
                });
            });
            localStorage.setItem('alwagih_dental_procedures', JSON.stringify(list));
            Utils.showToast(`✓ تم حفظ ${this.dentalTreatmentPlan.length} إجراء أسنان واعتمادها بملف المريض`, 'success');
        } catch (e) {
            console.error('Failed to save dental plan:', e);
        }
    },

    printDentalTreatmentPlan() {
        window.print();
    },

    // =========================================================================
    // وحدة جراحة اليوم الواحد والعمليات (Day Surgery & Consent)
    // =========================================================================
    openSurgicalConsentModal() {
        const patientName = this.activeAppointment ? (this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name) : 'المريض المسجل';
        const surgeryName = document.getElementById('doc-surgery-name')?.value.trim() || 'تدخل جراحي صغرى';
        const anesthesia = document.getElementById('doc-surgery-anesthesia')?.value || 'موضعي (Local)';
        const surgeonName = this.currentDoctor ? this.currentDoctor.full_name : 'د. الجراح الاستشاري';

        document.getElementById('consent-patient-name').textContent = patientName;
        document.getElementById('consent-surgery-name').textContent = surgeryName;
        document.getElementById('consent-surgeon-name').textContent = surgeonName;
        document.getElementById('consent-anesthesia').textContent = anesthesia;

        const modal = document.getElementById('doc-surgical-consent-modal');
        if (modal) modal.classList.remove('hidden');
    },

    saveSurgeryProcedure() {
        const patientName = this.activeAppointment ? (this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name) : 'المريض الجراحي';
        const patientPhone = this.activeAppointment ? (this.activeAppointment.patient ? this.activeAppointment.patient.phone : this.activeAppointment.patient_phone) : '01011223344';
        const surgeryName = document.getElementById('doc-surgery-name')?.value.trim();
        const anesthesia = document.getElementById('doc-surgery-anesthesia')?.value || 'موضعي (Local)';
        const orRoom = document.getElementById('doc-surgery-room')?.value || 'غرفة العمليات 1';
        const recoveryBed = document.getElementById('doc-surgery-bed')?.value || 'سرير 1';
        const notes = document.getElementById('doc-surgery-notes')?.value.trim();
        const postop = document.getElementById('doc-surgery-postop')?.value.trim();
        const cost = parseFloat(document.getElementById('doc-surgery-cost')?.value) || 1500;

        if (!surgeryName) {
            Utils.showToast('يرجى إدخال اسم العملية الجراحية أولاً', 'warning');
            return;
        }

        const newSurgery = {
            id: 'surg_' + Date.now(),
            surgery_code: 'OR-' + (100 + Math.floor(Math.random() * 900)),
            patient_name: patientName,
            patient_phone: patientPhone,
            surgeon_name: this.currentDoctor ? this.currentDoctor.full_name : 'د. الجراح الاستشاري',
            anesthesiologist_name: 'د. خالد عبد السميع',
            procedure_name: surgeryName,
            anesthesia_type: anesthesia,
            or_room: orRoom,
            recovery_bed: recoveryBed,
            surgery_date: new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
            who_checklist_passed: true,
            consent_signed: true,
            notes: notes || 'تمت العملية الجراحية بدون مضاعفات تذكر مع استقرار العلامات الحيوية',
            postop_instructions: postop || 'غيار معقم يومياً مع تجنب الإجهاد ومراجعة العيادة بعد 7 أيام',
            total_cost: cost,
            status: 'completed'
        };

        try {
            const stored = localStorage.getItem('alwagih_day_surgeries');
            let list = stored ? JSON.parse(stored) : [];
            list.unshift(newSurgery);
            localStorage.setItem('alwagih_day_surgeries', JSON.stringify(list));
            Utils.showToast(`✓ تم اعتماد وتوثيق العملية الجراحية (#${newSurgery.surgery_code}) بنجاح`, 'success');
        } catch (e) {
            console.error('Failed to save surgery:', e);
        }
    },

    // =========================================================================
    // محرك طباعة الروشتة الطبية الرسمية والإيصال الحراري (Prescription Printing Engine)
    // =========================================================================
    currentRxPrintFormat: 'a4',

    openPrintPrescriptionModal(format) {
        this.ensureActivePatient();
        this.currentRxPrintFormat = format || 'a4';
        this.switchRxPrintFormat(this.currentRxPrintFormat);
        const modal = document.getElementById('doctor-prescription-print-modal');
        if (modal) modal.classList.remove('hidden');
    },

    closePrintPrescriptionModal() {
        const modal = document.getElementById('doctor-prescription-print-modal');
        if (modal) modal.classList.add('hidden');
    },

    switchRxPrintFormat(format) {
        this.currentRxPrintFormat = format || 'a4';
        const btnA4 = document.getElementById('rx-format-btn-a4');
        const btnThermal = document.getElementById('rx-format-btn-thermal');
        if (btnA4 && btnThermal) {
            if (this.currentRxPrintFormat === 'a4') {
                btnA4.className = 'px-3 py-1 rounded-lg bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-sm transition';
                btnThermal.className = 'px-3 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 transition';
            } else {
                btnThermal.className = 'px-3 py-1 rounded-lg bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-sm transition';
                btnA4.className = 'px-3 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 transition';
            }
        }
        const box = document.getElementById('rx-live-preview-box');
        if (box) {
            box.innerHTML = this.renderRxPreviewHTML(this.currentRxPrintFormat);
        }
    },

    renderRxPreviewHTML(format) {
        const apt = this.activeAppointment || (this.appointments && this.appointments[0]) || { patient_name: 'محمد عبد الرحمن محمود', patient: { full_name: 'محمد عبد الرحمن محمود', phone: '01099887766' } };
        const patientName = apt.patient ? (apt.patient.full_name || apt.patient_name) : (apt.patient_name || 'محمد عبد الرحمن محمود');
        const patientPhone = apt.patient?.phone || apt.patient_phone || '01099887766';
        const docName = (this.currentDoctor && this.currentDoctor.full_name) ? this.currentDoctor.full_name : 'د. أحمد الشناوي (استشاري باطنة)';
        const clinicName = (this.currentDoctor && this.currentDoctor.clinics && this.currentDoctor.clinics.name) ? this.currentDoctor.clinics.name : 'عيادات الشفاء التخصصية';
        const diagnosis = document.getElementById('diagnosis-input')?.value.trim() || 'كشف ومتابعة طبية عامة';
        const freeRxText = document.getElementById('prescription-input')?.value.trim() || '';
        const notes = document.getElementById('notes-input')?.value.trim() || '';
        const dateStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        const rxNumber = 'RX-' + Math.floor(100000 + Math.random() * 900000);

        const items = this.currentPrescriptionItems || [];

        if (format === 'thermal') {
            // نمط إيصال حراري فوري 80mm
            return `
            <div class="max-w-[360px] mx-auto p-4 bg-white text-slate-900 font-mono text-xs rounded-xl shadow border border-slate-200">
                <div class="text-center pb-2 border-b-2 border-dashed border-slate-300 space-y-1">
                    <div class="text-base font-black tracking-wider">مجمع الواجح الطبي التخصصي</div>
                    <div class="text-[11px] font-bold text-slate-600">${clinicName}</div>
                    <div class="text-[10px] text-slate-500">${docName} — ترخيص مزاولة: 94812</div>
                    <div class="text-[9px] text-slate-400">رقم الروشتة: ${rxNumber}</div>
                </div>

                <div class="py-2 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                    <div><span class="font-bold">المريض:</span> ${patientName}</div>
                    <div><span class="font-bold">الهاتف:</span> ${patientPhone}</div>
                    <div><span class="font-bold">التاريخ:</span> ${dateStr} - ${timeStr}</div>
                    <div><span class="font-bold">التشخيص:</span> ${diagnosis}</div>
                </div>

                <div class="py-2.5 border-b-2 border-dashed border-slate-300 space-y-2">
                    <div class="font-black text-sm text-center">℞ قائمة العلاج الدوائي</div>
                    ${items.length > 0 ? items.map((it, i) => `
                        <div class="p-1.5 bg-slate-50 rounded border border-slate-200">
                            <div class="font-bold text-[11px] text-slate-900">${i + 1}. ${it.drug_name}</div>
                            <div class="text-[10px] text-slate-700">${it.dosage || 'جرعة قياسية'}</div>
                            <div class="text-[9px] text-purple-700 font-semibold">${it.instructions || 'حسب إرشادات الطبيب'}</div>
                        </div>
                    `).join('') : `<div class="text-[11px] p-2 bg-slate-50 rounded">${freeRxText || 'العلاج الموصوف مدون بواسطة الطبيب'}</div>`}
                </div>

                ${freeRxText && items.length > 0 ? `
                <div class="py-2 border-b border-dashed border-slate-300 text-[10px] text-slate-700">
                    <span class="font-bold block">فحوصات وتوجيهات إضافية:</span>
                    ${freeRxText.replace(/\n/g, '<br>')}
                </div>` : ''}

                <div class="pt-3 text-center space-y-1.5">
                    <div class="text-[10px] text-slate-500">تمنياتنا لكم بالشفاء العاجل 🌸</div>
                    <div class="text-[9px] font-mono text-slate-400">للصرف الفوري من صيدلية المجمع — خط ساخن: 19821</div>
                    <div class="h-6 flex items-center justify-center font-mono text-[9px] tracking-widest text-slate-400">||| |||| || ||||| |||| ||</div>
                </div>
            </div>`;
        }

        // نمط روشتة A4 الطبي الرسمي المعتمد
        return `
        <div class="max-w-[700px] mx-auto p-6 bg-white text-slate-900 rounded-2xl shadow border border-slate-300 space-y-4">
            <!-- ترويسة الروشتة الرسمية -->
            <div class="flex items-center justify-between pb-4 border-b-2 border-purple-600">
                <div class="text-right space-y-1">
                    <h2 class="text-lg font-black text-purple-900">مجمع عيادات الواجح الطبي التخصصي</h2>
                    <h3 class="text-xs font-bold text-slate-700">${clinicName}</h3>
                    <p class="text-[11px] text-slate-500 font-medium">${docName} — استشاري التخصص</p>
                    <p class="text-[10px] text-slate-400 font-mono">ترخيص وزارة الصحة: 94812/2026</p>
                </div>
                <div class="text-center">
                    <div class="w-16 h-16 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-2xl shadow-md mx-auto">و</div>
                    <span class="text-[9px] text-purple-700 font-black block mt-1">AL WAGIH CLINIC</span>
                </div>
                <div class="text-left space-y-1 font-mono text-xs">
                    <div class="font-bold text-slate-800">التاريخ: ${dateStr}</div>
                    <div class="text-slate-500">الوقت: ${timeStr}</div>
                    <div class="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[10px]">كود: ${rxNumber}</div>
                </div>
            </div>

            <!-- بيانات المريض والعلامات الحيوية -->
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div><span class="text-slate-400 block text-[10px]">اسم المريض:</span><span class="font-bold text-slate-900">${patientName}</span></div>
                <div><span class="text-slate-400 block text-[10px]">الهاتف:</span><span class="font-mono text-slate-700">${patientPhone}</span></div>
                <div><span class="text-slate-400 block text-[10px]">التشخيص السريري:</span><span class="font-bold text-purple-800">${diagnosis}</span></div>
                <div><span class="text-slate-400 block text-[10px]">العلامات الحيوية:</span><span class="font-mono text-slate-700">BP: 120/80 • Pulse: 75</span></div>
            </div>

            <!-- علامة وقائمة الأدوية ℞ -->
            <div class="space-y-3 pt-2">
                <div class="flex items-center gap-2 border-b border-purple-200 pb-1">
                    <span class="text-2xl font-black text-purple-700 font-serif">℞</span>
                    <span class="text-xs font-bold text-slate-800">الوصفة الدوائية الرسمية (Prescription Items)</span>
                </div>

                ${items.length > 0 ? `
                <table class="w-full text-right text-xs border border-slate-200 rounded-xl overflow-hidden">
                    <thead class="bg-purple-50/70 text-purple-900 font-bold text-[11px]">
                        <tr>
                            <th class="py-2 px-3">م</th>
                            <th class="py-2 px-3">اسم الدواء والمستحضر</th>
                            <th class="py-2 px-3">الجرعة المحددة</th>
                            <th class="py-2 px-3">تعليمات وطريقة الاستخدام</th>
                            <th class="py-2 px-3 text-center">الكمية</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 font-medium">
                        ${items.map((it, i) => `
                            <tr class="hover:bg-slate-50">
                                <td class="py-2 px-3 text-slate-400">${i + 1}</td>
                                <td class="py-2 px-3 font-bold text-slate-900">${it.drug_name}</td>
                                <td class="py-2 px-3 text-slate-700 font-mono">${it.dosage || 'جرعة قياسية'}</td>
                                <td class="py-2 px-3 text-purple-700">${it.instructions || 'حسب إرشادات الطبيب'}</td>
                                <td class="py-2 px-3 text-center font-bold text-slate-800">${it.quantity || 1}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>` : `<div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 whitespace-pre-line">${freeRxText || 'العلاج الطبي الموصوف مدون من قبل الطبيب'}</div>`}
            </div>

            ${freeRxText && items.length > 0 ? `
            <div class="p-3 bg-purple-50/40 rounded-xl border border-purple-100 text-xs space-y-1">
                <span class="font-bold text-purple-900 block text-[11px]">فحوصات وتحاليل واستشارات إضافية:</span>
                <p class="text-slate-700 whitespace-pre-line">${freeRxText}</p>
            </div>` : ''}

            ${notes ? `
            <div class="text-[11px] text-slate-600 bg-amber-50/40 p-2.5 rounded-lg border border-amber-200">
                <span class="font-bold text-amber-900">نصائح وإرشادات المتابعة:</span> ${notes}
            </div>` : ''}

            <!-- تذييل الروشتة والتوقيع وخاتم العيادة -->
            <div class="pt-6 border-t border-slate-200 flex items-end justify-between text-xs">
                <div class="space-y-1 text-[10px] text-slate-500 font-mono">
                    <div>مجمع عيادات الواجح التخصصي — رعاية طبية متكاملة</div>
                    <div>العنوان: شارع النيل، الدور الثالث • خط ساخن: 19821 • واتساب: 01000000000</div>
                    <div class="text-[9px] text-slate-400">رمز التحقق الإلكتروني: ${rxNumber} — صالحة لمدة 7 أيام</div>
                </div>
                <div class="text-center space-y-2">
                    <div class="w-36 border-b-2 border-slate-400 pb-1 font-bold text-slate-900 text-xs">توقيع وخاتم الطبيب المعالج</div>
                    <span class="text-[10px] text-purple-700 font-bold block">${docName}</span>
                </div>
            </div>
        </div>`;
    },

    printCurrentPrescription() {
        const printArea = document.getElementById('print-area');
        if (!printArea) return;
        printArea.innerHTML = this.renderRxPreviewHTML(this.currentRxPrintFormat);
        window.print();
    },

    saveAndPrintPrescription() {
        // التحقق من وجود روشتة
        const form = document.getElementById('consultation-form');
        if (form) {
            this.handleConsultationSubmit(new Event('submit'));
        }
        setTimeout(() => {
            this.openPrintPrescriptionModal('a4');
        }, 300);
    },

    // =========================================================================
    // مركز سحب العينات وباركود الأنابيب المعملية (Specimen Sampling & Tube Barcode Hub)
    // =========================================================================
    openSamplingHubModal() {
        this.ensureActivePatient();
        const apt = this.activeAppointment || { patient_name: 'محمد عبد الرحمن محمود', patient: { full_name: 'محمد عبد الرحمن محمود' } };
        const patientName = apt.patient ? (apt.patient.full_name || apt.patient_name) : (apt.patient_name || 'محمد عبد الرحمن محمود');
        const docName = (this.currentDoctor && this.currentDoctor.full_name) ? this.currentDoctor.full_name : 'د. أحمد الشناوي';
        
        const patEl = document.getElementById('sampling-patient-name');
        const docEl = document.getElementById('sampling-doctor-name');
        const timeEl = document.getElementById('sampling-timestamp');
        if (patEl) patEl.textContent = patientName;
        if (docEl) docEl.textContent = docName;
        if (timeEl) timeEl.textContent = new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });

        this.renderSamplingOrders();
        const modal = document.getElementById('doctor-sampling-hub-modal');
        if (modal) modal.classList.remove('hidden');
    },

    closeSamplingHubModal() {
        const modal = document.getElementById('doctor-sampling-hub-modal');
        if (modal) modal.classList.add('hidden');
    },

    getStoredLabOrders() {
        try {
            const stored = localStorage.getItem('alwagih_lab_orders');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch(e) {}

        // إذا لم توجد طلبات مخبرية سابقة، ننشئ طلبات نموذجية للمريض الحالي لعرض قوة النظام
        const patientName = this.activeAppointment ? (this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name) : 'المريض الحالي';
        const sampleOrders = [
            {
                id: 'LAB-' + (Date.now() - 10000),
                patient_name: patientName,
                doctor_name: 'د. استشاري الكشف',
                test_code: 'HEM-001',
                test_name: 'صورة دم كاملة (Complete Blood Count - CBC)',
                tube: 'أنبوبة موف EDTA معقمة 🟣',
                tube_color: 'purple',
                tube_name_ar: 'أنبوبة موف EDTA',
                fasting_hours: 0,
                cost: 160,
                status: 'pending_sampling',
                sample_barcode: 'SMP-891240',
                created_at: new Date().toISOString()
            },
            {
                id: 'LAB-' + (Date.now() - 5000),
                patient_name: patientName,
                doctor_name: 'د. استشاري الكشف',
                test_code: 'BIO-019',
                test_name: 'صورة الدهون الكاملة (Lipid Profile Panel)',
                tube: 'أنبوبة صفراء جل 🟡',
                tube_color: 'yellow',
                tube_name_ar: 'أنبوبة سيروم صفراء جل',
                fasting_hours: 12,
                cost: 260,
                status: 'pending_sampling',
                sample_barcode: 'SMP-891241',
                created_at: new Date().toISOString()
            },
            {
                id: 'LAB-' + Date.now(),
                patient_name: patientName,
                doctor_name: 'د. استشاري الكشف',
                test_code: 'END-001',
                test_name: 'تحليل هرمون المنبه للدرقية (TSH Ultra-sensitive)',
                tube: 'أنبوبة صفراء جل 🟡',
                tube_color: 'yellow',
                tube_name_ar: 'أنبوبة سيروم صفراء جل',
                fasting_hours: 0,
                cost: 190,
                status: 'pending_sampling',
                sample_barcode: 'SMP-891242',
                created_at: new Date().toISOString()
            }
        ];
        localStorage.setItem('alwagih_lab_orders', JSON.stringify(sampleOrders));
        return sampleOrders;
    },

    renderSamplingOrders() {
        const container = document.getElementById('sampling-orders-list-container');
        if (!container) return;

        const allOrders = this.getStoredLabOrders();
        const patientName = this.activeAppointment ? (this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name) : '';
        const patientOrders = allOrders.filter(o => !patientName || o.patient_name === patientName || o.patient_name.includes(patientName.split(' ')[0]));

        const listToRender = patientOrders.length > 0 ? patientOrders : allOrders.slice(0, 5);

        const badgeCount = document.getElementById('sampling-tests-count-badge');
        if (badgeCount) badgeCount.textContent = `${listToRender.length} فحوصات مطلوبة`;

        if (listToRender.length === 0) {
            container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-2xl">لا توجد تحاليل مطلوبة حالياً لهذا المريض. يمكنك طلب فحص بالضغط على زر "طلب تحاليل طبية".</div>`;
            return;
        }

        const tubeColorsMap = {
            purple: { bg: 'bg-purple-100 dark:bg-purple-950/70', text: 'text-purple-800 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-800', icon: '🟣' },
            yellow: { bg: 'bg-amber-100 dark:bg-amber-950/70', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-800', icon: '🟡' },
            blue: { bg: 'bg-sky-100 dark:bg-sky-950/70', text: 'text-sky-800 dark:text-sky-300', border: 'border-sky-300 dark:border-sky-800', icon: '🔵' },
            green: { bg: 'bg-emerald-100 dark:bg-emerald-950/70', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-800', icon: '🟢' },
            red: { bg: 'bg-rose-100 dark:bg-rose-950/70', text: 'text-rose-800 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-800', icon: '🔴' }
        };

        container.innerHTML = listToRender.map(o => {
            const isCollected = o.status === 'sample_collected' || o.status === 'completed';
            const tubeInfo = tubeColorsMap[o.tube_color] || tubeColorsMap.purple;

            return `
            <div class="p-3.5 rounded-2xl border ${isCollected ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'} flex flex-wrap items-center justify-between gap-3 transition">
                <div class="flex items-center gap-3">
                    <span class="w-10 h-10 rounded-2xl ${tubeInfo.bg} ${tubeInfo.text} flex items-center justify-center text-lg font-black border ${tubeInfo.border}">
                        ${tubeInfo.icon}
                    </span>
                    <div>
                        <div class="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                            <span>${o.test_name}</span>
                            <span class="font-mono text-[10px] text-slate-400">#${o.test_code || 'LAB'}</span>
                        </div>
                        <div class="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3 mt-0.5">
                            <span class="font-bold ${tubeInfo.text}">${o.tube_name_ar || o.tube || 'أنبوبة فحص'}</span>
                            <span>•</span>
                            <span>${(o.fasting_hours && o.fasting_hours > 0) ? ('صيام ' + o.fasting_hours + ' ساعة ⏱️') : 'بدون صيام'}</span>
                            <span>•</span>
                            <span class="font-mono text-purple-600 font-bold">${Utils.formatCurrency(o.cost || 150)}</span>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <div class="text-left font-mono text-[10px] pl-2 border-l border-slate-200 dark:border-slate-800">
                        <span class="text-slate-400 block">باركود العينة:</span>
                        <span class="font-bold text-slate-900 dark:text-white tracking-widest">${o.sample_barcode || 'SMP-891240'}</span>
                    </div>

                    ${isCollected ? `
                        <span class="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                            <span>✓</span>
                            <span>تم السحب</span>
                        </span>
                    ` : `
                        <button type="button" onclick="DoctorApp.collectSample('${o.id}')" class="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm">
                            <span>🩸</span>
                            <span>تأكيد سحب العينة</span>
                        </button>
                    `}

                    <button type="button" onclick="DoctorApp.printTubeLabel('${o.id}')" class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1" title="طباعة لاصق باركود للأنبوبة 50x30 مم">
                        <span>🏷️</span>
                        <span>طباعة اللاصق</span>
                    </button>
                </div>
            </div>`;
        }).join('');
    },

    collectSample(orderId) {
        try {
            const stored = localStorage.getItem('alwagih_lab_orders');
            let list = stored ? JSON.parse(stored) : [];
            const idx = list.findIndex(o => o.id === orderId);
            if (idx !== -1) {
                list[idx].status = 'sample_collected';
                list[idx].collected_at = new Date().toISOString();
                list[idx].collector_name = this.doctor ? (this.doctor.full_name || 'فني سحب العينات') : 'فني سحب العينات';
                localStorage.setItem('alwagih_lab_orders', JSON.stringify(list));
                this.renderSamplingOrders();
                Utils.showToast(`✓ تم تأكيد سحب العينة بنجاح وربط الباركود (${list[idx].sample_barcode})`, 'success');
            }
        } catch(e) {}
    },

    collectAllSamplesForActivePatient() {
        try {
            const stored = localStorage.getItem('alwagih_lab_orders');
            let list = stored ? JSON.parse(stored) : [];
            const patientName = this.activeAppointment ? (this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name) : '';
            
            list.forEach(o => {
                if (!patientName || o.patient_name === patientName || o.patient_name.includes(patientName.split(' ')[0])) {
                    o.status = 'sample_collected';
                    o.collected_at = new Date().toISOString();
                    o.collector_name = this.doctor ? (this.doctor.full_name || 'فني سحب العينات') : 'فني سحب العينات';
                }
            });
            localStorage.setItem('alwagih_lab_orders', JSON.stringify(list));
            this.renderSamplingOrders();
            Utils.showToast('✓ تم تأكيد سحب كافة العينات المعملية المطلوبة للمريض بنجاح', 'success');
        } catch(e) {}
    },

    printTubeLabel(orderId) {
        const stored = localStorage.getItem('alwagih_lab_orders');
        const list = stored ? JSON.parse(stored) : [];
        const order = list.find(o => o.id === orderId) || list[0];
        if (!order) return;

        const patientName = order.patient_name || (this.activeAppointment?.patient?.full_name || 'المريض');
        const barcode = order.sample_barcode || ('SMP-' + Math.floor(100000 + Math.random() * 900000));
        const testCode = order.test_code || 'LAB';
        const tube = order.tube_name_ar || order.tube || 'EDTA';
        const dateStr = new Date().toLocaleDateString('ar-EG');
        const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

        const labelHTML = `
        <div style="width: 50mm; height: 30mm; padding: 2mm; font-family: monospace; font-size: 8pt; line-height: 1.2; text-align: right; direction: rtl; border: 1px dashed #ccc; box-sizing: border-box; background: #fff; color: #000;">
            <div style="font-weight: bold; font-size: 8.5pt; border-bottom: 1px solid #000; padding-bottom: 1mm; margin-bottom: 1mm; display: flex; justify-content: space-between;">
                <span>مجمع الواجح</span>
                <span>${tube}</span>
            </div>
            <div style="font-size: 8pt; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${patientName}
            </div>
            <div style="font-size: 7.5pt; color: #333;">
                فحص: ${testCode} • ${order.test_name?.split('(')[0] || 'تحليل'}
            </div>
            <div style="text-align: center; font-weight: bold; letter-spacing: 2px; font-size: 9pt; margin: 1mm 0;">
                *${barcode}*
            </div>
            <div style="font-size: 6.5pt; display: flex; justify-content: space-between; color: #555;">
                <span>${dateStr} ${timeStr}</span>
                <span>${barcode}</span>
            </div>
        </div>`;

        const printArea = document.getElementById('print-area');
        if (printArea) {
            printArea.innerHTML = labelHTML;
            window.print();
        }
    },

    printLabRequisitionSlip() {
        const stored = localStorage.getItem('alwagih_lab_orders');
        const list = stored ? JSON.parse(stored) : [];
        const patientName = this.activeAppointment ? (this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name) : 'المريض';
        const patientOrders = list.filter(o => !patientName || o.patient_name === patientName || o.patient_name.includes(patientName.split(' ')[0]));
        const ordersToPrint = patientOrders.length > 0 ? patientOrders : list.slice(0, 5);

        const slipHTML = `
        <div style="max-width: 650px; margin: 0 auto; padding: 20px; font-family: system-ui, sans-serif; direction: rtl; text-align: right; background: #fff; color: #000; border: 1px solid #ddd; border-radius: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 15px;">
                <div>
                    <h2 style="margin: 0; color: #0369a1; font-size: 16pt;">مجمع عيادات الواجح الطبي — إذن تحويل المختبر وسحب العينات</h2>
                    <p style="margin: 3px 0 0; font-size: 9pt; color: #666;">LIS Laboratory Diagnostic Requisition & Specimen Manifest</p>
                </div>
                <div style="text-align: left; font-size: 9pt;">
                    <div>التاريخ: ${new Date().toLocaleDateString('ar-EG')}</div>
                    <div>الوقت: ${new Date().toLocaleTimeString('ar-EG')}</div>
                </div>
            </div>

            <div style="background: #f8fafc; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 9pt; display: flex; justify-content: space-between;">
                <div><strong>المريض:</strong> ${patientName}</div>
                <div><strong>الطبيب المحول:</strong> ${this.doctor?.full_name || 'د. استشاري الكشف'}</div>
                <div><strong>العيادة:</strong> ${this.doctor?.clinic_name || 'الباطنة العامة'}</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 15px;">
                <thead>
                    <tr style="background: #e0f2fe; color: #0369a1; text-align: right;">
                        <th style="padding: 8px; border: 1px solid #bae6fd;">م</th>
                        <th style="padding: 8px; border: 1px solid #bae6fd;">اسم الفحص المخبري</th>
                        <th style="padding: 8px; border: 1px solid #bae6fd;">الكود</th>
                        <th style="padding: 8px; border: 1px solid #bae6fd;">نوع الأنبوبة والعينة</th>
                        <th style="padding: 8px; border: 1px solid #bae6fd;">شروط الصيام</th>
                        <th style="padding: 8px; border: 1px solid #bae6fd;">باركود العينة</th>
                    </tr>
                </thead>
                <tbody>
                    ${ordersToPrint.map((o, i) => `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #e2e8f0;">${i + 1}</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${o.test_name}</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; font-family: monospace;">${o.test_code || 'LAB'}</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0;">${o.tube_name_ar || o.tube || 'سيروم'}</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0;">${(o.fasting_hours && o.fasting_hours > 0) ? ('صيام ' + o.fasting_hours + ' ساعة') : 'بدون صيام'}</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold;">${o.sample_barcode || 'SMP-891240'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; font-size: 9pt;">
                <div>توقيع فني سحب العينات: ...........................</div>
                <div>توقيع الطبيب المحول: ...........................</div>
                <div>خاتم المختبر المعتمد</div>
            </div>
        </div>`;

        const printArea = document.getElementById('print-area');
        if (printArea) {
            printArea.innerHTML = slipHTML;
            window.print();
        }
    }
};

window.DoctorApp = DoctorApp;
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => DoctorApp.init());
    } else {
        DoctorApp.init();
    }
}
