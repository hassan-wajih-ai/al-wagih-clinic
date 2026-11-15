/**
 * منطق لوحة تحكم الطبيب وغرفة الكشف (Doctor Controller)
 * نظام «الوجيه» لإدارة العيادات
 */

const DoctorApp = {
    currentDoctor: null,
    appointments: [],
    activeAppointment: null,
    currentPrescriptionItems: [],

    async init() {
        // حماية الصفحة والتحقق من الصلاحيات
        const authData = await Auth.protectRoute(['doctor', 'admin', 'superadmin']);
        if (!authData) return;

        this.currentDoctor = authData.profile;
        document.getElementById('user-display-name').textContent = this.currentDoctor.full_name || 'د. الطبيب المعالج';
        document.getElementById('doctor-title').textContent = `عيادة: ${this.currentDoctor.full_name || 'الكشف الطبي'}`;

        this.populateDrugSelect();
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

    openOrderLabModal() {
        if (!this.activeAppointment) {
            Utils.showToast('يرجى استدعاء مريض أولاً من قائمة الانتظار', 'warning');
            return;
        }
        const patientName = this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name;
        document.getElementById('doc-lab-patient-name').value = patientName;
        document.getElementById('doctor-lab-modal').classList.remove('hidden');
    },

    submitOrderLab() {
        if (!this.activeAppointment) return;
        const patientName = this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name;
        const testSelect = document.getElementById('doc-lab-test-select');
        const testName = testSelect.options[testSelect.selectedIndex].text;
        const notes = document.getElementById('doc-lab-notes').value.trim();

        const currentRx = document.getElementById('prescription-input').value;
        document.getElementById('prescription-input').value = (currentRx ? currentRx + '\n' : '') + `[طلب فحص معملي]: ${testName} ${notes ? '(' + notes + ')' : ''}`;

        Utils.showToast(`تم إرسال طلب التحليل (${testName}) للمختبر وتوثيقه بالروشتة 🧪`, 'success');
        document.getElementById('doctor-lab-modal').classList.add('hidden');
    },

    openOrderRadModal() {
        if (!this.activeAppointment) {
            Utils.showToast('يرجى استدعاء مريض أولاً من قائمة الانتظار', 'warning');
            return;
        }
        const patientName = this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name;
        document.getElementById('doc-rad-patient-name').value = patientName;
        document.getElementById('doctor-rad-modal').classList.remove('hidden');
    },

    submitOrderRad() {
        if (!this.activeAppointment) return;
        const patientName = this.activeAppointment.patient ? this.activeAppointment.patient.full_name : this.activeAppointment.patient_name;
        const examSelect = document.getElementById('doc-rad-exam-select');
        const examName = examSelect.options[examSelect.selectedIndex].text;
        const notes = document.getElementById('doc-rad-notes').value.trim();

        const currentRx = document.getElementById('prescription-input').value;
        document.getElementById('prescription-input').value = (currentRx ? currentRx + '\n' : '') + `[طلب أشعة]: ${examName} ${notes ? '(الدواعي: ' + notes + ')' : ''}`;

        Utils.showToast(`تم إرسال طلب الأشعة (${examName}) لقسم الأشعة وتوثيقه بالروشتة 🩻`, 'success');
        document.getElementById('doctor-rad-modal').classList.add('hidden');
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
        select.innerHTML = '<option value="">-- اختر صنفاً من صيدلية العيادة --</option>' +
            drugs.map(d => `<option value="${d.name}" data-dosage="${d.strength}" data-instructions="${d.default_inst || ''}" data-price="${d.price || 40}">${d.name} (${d.strength})</option>`).join('');
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
    }
};

window.DoctorApp = DoctorApp;
document.addEventListener('DOMContentLoaded', () => DoctorApp.init());
