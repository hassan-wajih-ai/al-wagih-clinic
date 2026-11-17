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
        if (!select || select.selectedIndex === -1) return;

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

    openOrderLabModal() {
        if (!this.activeAppointment) {
            Utils.showToast('يرجى استدعاء مريض أولاً من قائمة الانتظار', 'warning');
            return;
        }
        const patientName = this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name;
        document.getElementById('doc-lab-patient-name').value = patientName;
        this.populateDocLabCatalog('all');
        document.getElementById('doctor-lab-modal').classList.remove('hidden');
    },

    submitOrderLab() {
        if (!this.activeAppointment) return;
        const patientName = this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name;
        const testSelect = document.getElementById('doc-lab-test-select');
        const testName = testSelect.options[testSelect.selectedIndex]?.text || 'تحليل طبي';
        const notes = document.getElementById('doc-lab-notes').value.trim();

        const currentRx = document.getElementById('prescription-input').value;
        document.getElementById('prescription-input').value = (currentRx ? currentRx + '\n' : '') + `[طلب فحص معملي]: ${testName} ${notes ? '(' + notes + ')' : ''}`;

        Utils.showToast(`تم إرسال طلب التحليل (${testName}) للمختبر وتوثيقه بالروشتة 🧪`, 'success');
        document.getElementById('doctor-lab-modal').classList.add('hidden');
    },

    populateDocRadCatalog(selectedMod) {
        const select = document.getElementById('doc-rad-exam-select');
        if (!select) return;

        const allExams = (window.MedicalCatalog && MedicalCatalog.radiologyExams) ? MedicalCatalog.radiologyExams : [];
        const mod = selectedMod || (document.getElementById('doc-rad-mod-select')?.value || 'all');
        const list = allExams.filter(e => mod === 'all' || e.modality === mod);

        if (list.length === 0) {
            select.innerHTML = '<option value="">لا توجد فحوصات في هذا الجهاز</option>';
            return;
        }

        select.innerHTML = list.map(e => `
            <option value="${e.key || e.id}" data-contrast="${e.contrast ? '1' : '0'}" data-cost="${e.cost}" data-duration="${e.duration_min}" data-prep="${e.prep_notes_ar || ''}">
                [${e.modality}] ${e.name_ar} - ${e.name_en} (${Utils.formatCurrency(e.cost)})
            </option>
        `).join('');

        this.onDocRadExamChanged();
    },

    onDocRadModalityChanged() {
        const mod = document.getElementById('doc-rad-mod-select')?.value || 'all';
        this.populateDocRadCatalog(mod);
    },

    onDocRadExamChanged() {
        const select = document.getElementById('doc-rad-exam-select');
        if (!select || select.selectedIndex === -1) return;

        const opt = select.options[select.selectedIndex];
        if (!opt) return;

        const hasContrast = opt.getAttribute('data-contrast') === '1';
        const cost = opt.getAttribute('data-cost') || '250';
        const prep = opt.getAttribute('data-prep') || '';

        const contrastEl = document.getElementById('doc-rad-contrast-preview');
        const prepEl = document.getElementById('doc-rad-prep-preview');
        const costEl = document.getElementById('doc-rad-cost-preview');

        if (contrastEl) {
            contrastEl.textContent = hasContrast ? '⚠️ بالصبغة (Contrast)' : 'بدون صبغة (Plain)';
            contrastEl.className = hasContrast ? 'font-black text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300';
        }
        if (prepEl) prepEl.textContent = prep || (hasContrast ? 'فحص وظائف كلى وصيام 4-6 ساعات' : 'بدون تحضير خاص');
        if (costEl) costEl.textContent = `${Utils.formatCurrency(parseFloat(cost))}`;
    },

    openOrderRadModal() {
        if (!this.activeAppointment) {
            Utils.showToast('يرجى استدعاء مريض أولاً من قائمة الانتظار', 'warning');
            return;
        }
        const patientName = this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name;
        document.getElementById('doc-rad-patient-name').value = patientName;
        this.populateDocRadCatalog('all');
        document.getElementById('doctor-rad-modal').classList.remove('hidden');
    },

    submitOrderRad() {
        if (!this.activeAppointment) return;
        const patientName = this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name;
        const examSelect = document.getElementById('doc-rad-exam-select');
        const examName = examSelect.options[examSelect.selectedIndex]?.text || 'فحص أشعة';
        const notes = document.getElementById('doc-rad-notes').value.trim();

        const currentRx = document.getElementById('prescription-input').value;
        document.getElementById('prescription-input').value = (currentRx ? currentRx + '\n' : '') + `[طلب أشعة]: ${examName} ${notes ? '(الدواعي: ' + notes + ')' : ''}`;

        Utils.showToast(`تم إرسال طلب الأشعة (${examName}) لقسم الأشعة وتوثيقه بالروشتة 🩻`, 'success');
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
            <option value="${p.id}" data-fee="${p.fee}" data-comm="${p.doctor_commission_rate}" data-duration="${p.duration_min}" data-room="${p.room || 'غرفة كشف'}">
                ${p.name_ar} - ${p.name_en} (${Utils.formatCurrency(p.fee)})
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
        if (!select || select.selectedIndex === -1) return;

        const opt = select.options[select.selectedIndex];
        if (!opt) return;

        const fee = parseFloat(opt.getAttribute('data-fee') || '250');
        const commRate = parseFloat(opt.getAttribute('data-comm') || '35');
        const duration = opt.getAttribute('data-duration') || '15';
        const room = opt.getAttribute('data-room') || 'غرفة كشف تخصصية';

        const commVal = Math.round(fee * (commRate / 100));

        const feeEl = document.getElementById('doc-proc-fee-preview');
        const commEl = document.getElementById('doc-proc-commission-preview');
        const durEl = document.getElementById('doc-proc-duration-preview');
        const roomEl = document.getElementById('doc-proc-room-preview');

        if (feeEl) feeEl.textContent = `${Utils.formatCurrency(fee)}`;
        if (commEl) commEl.textContent = `${commRate}% (${Utils.formatCurrency(commVal)})`;
        if (durEl) durEl.textContent = `المدة: ${duration} دقيقة`;
        if (roomEl) roomEl.textContent = room;
    },

    openOrderProcedureModal() {
        if (!this.activeAppointment) {
            Utils.showToast('يرجى استدعاء مريض أولاً من قائمة الانتظار', 'warning');
            return;
        }
        const patientName = this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name;
        document.getElementById('doc-proc-patient-name').value = patientName;
        this.populateDocProcedures('all');
        document.getElementById('doctor-procedure-modal').classList.remove('hidden');
    },

    submitOrderProcedure() {
        if (!this.activeAppointment) return;
        const select = document.getElementById('doc-proc-select');
        const procName = select.options[select.selectedIndex]?.text || 'إجراء طبي';
        const notes = document.getElementById('doc-proc-notes').value.trim();

        const currentRx = document.getElementById('prescription-input').value;
        document.getElementById('prescription-input').value = (currentRx ? currentRx + '\n' : '') + `[إجراء طبي مُنجز بالعيادة]: ${procName} ${notes ? '(' + notes + ')' : ''}`;

        Utils.showToast(`تم توثيق الإجراء الطبي (${procName}) واحتساب عمولة الطبيب بنجاح 🩺`, 'success');
        document.getElementById('doctor-procedure-modal').classList.add('hidden');
    },

    openPatientHistoryResultsModal() {
        if (!this.activeAppointment) {
            Utils.showToast('يرجى استدعاء مريض أولاً لاستعراض ملفه ونتائجه السابقة', 'warning');
            return;
        }
        const container = document.getElementById('doctor-history-content');
        
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

        document.getElementById('doctor-history-modal').classList.remove('hidden');
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
        const selectedOpt = select.options[select.selectedIndex];
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
    }
};

window.DoctorApp = DoctorApp;
document.addEventListener('DOMContentLoaded', () => DoctorApp.init());
