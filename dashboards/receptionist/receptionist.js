/**
 * منطق لوحة تحكم موظف الاستقبال (Receptionist Controller)
 * يدعم: ورديات 8 ساعات، الدفع النقدي، وتعاقدات الشركات مع احتساب نسب الخصم آلياً
 */

const ReceptionistApp = {
    currentStaff: null,
    shiftStartTime: null,
    appointments: [],
    contracts: [],

    async init() {
        const authData = await Auth.protectRoute(['receptionist', 'admin', 'superadmin']);
        if (!authData) return;

        this.currentStaff = authData.profile;
        document.getElementById('user-display-name').textContent = this.currentStaff.full_name || 'موظف الاستقبال';

        this.initShiftTracker();
        await this.loadContractsList();
        await this.loadTodayAppointments();
        await this.loadDoctorsList();
        this.bindEvents();

        window.addEventListener('alwagih_language_changed', () => this.renderAppointmentsTable());
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

    async loadContractsList() {
        try {
            if (window.db && window.SUPABASE_CONFIG.url.indexOf('xyzcompany') === -1) {
                const { data } = await window.db.from('corporate_contracts').select('*').eq('status', 'active');
                this.contracts = data || [];
            } else {
                this.contracts = this.getMockContracts();
            }

            const select = document.getElementById('modal-contract-select');
            if (select) {
                select.innerHTML = '<option value="">اختر الشركة أو جهة التعاقد...</option>' + 
                    this.contracts.map(c => `
                        <option value="${c.id}" data-discount="${c.discount_percentage}">
                            ${c.name} (خصم ${c.discount_percentage}%)
                        </option>
                    `).join('');
            }
        } catch (err) {
            this.contracts = this.getMockContracts();
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
        localStorage.setItem('alwagih_appointments', JSON.stringify(this.appointments));
    },

    async loadTodayAppointments() {
        const todayStr = new Date().toISOString().split('T')[0];
        const tbody = document.getElementById('appointments-table-body');
        tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400">جاري تحميل كشوفات اليوم...</td></tr>`;

        try {
            if (window.db && window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url.indexOf('xyzcompany') === -1) {
                const { data, error } = await window.db
                    .from('appointments')
                    .select('*, patient:users_profiles!patient_id(full_name, phone), doctor:users_profiles!doctor_id(full_name), corporate_contracts(name, discount_percentage)')
                    .eq('date', todayStr)
                    .order('time_slot', { ascending: true });

                if (error) throw error;
                this.appointments = data && data.length > 0 ? data : this.getStoredAppointments();
            } else {
                this.appointments = this.getStoredAppointments();
            }

            this.renderAppointmentsTable();
            this.updateShiftSummaryKPIs();
        } catch (err) {
            this.appointments = this.getStoredAppointments();
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

            const isCorp = apt.payment_type === 'corporate';
            const payBadge = isCorp 
                ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">🏢 ${apt.contract_name || 'تعاقد'} (-${apt.discount_percentage || 0}%)</span>`
                : `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">💵 نقدي</span>`;

            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
                    <td class="py-3 px-4 font-mono font-bold text-slate-700">#${index + 101}</td>
                    <td class="py-3 px-4">
                        <div class="font-bold text-slate-900">${patientName}</div>
                        <div class="text-[11px] text-slate-400">${patientPhone}</div>
                    </td>
                    <td class="py-3 px-4 text-slate-700">${doctorName}</td>
                    <td class="py-3 px-4 font-mono text-slate-800">${Utils.formatTime(apt.time_slot)}</td>
                    <td class="py-3 px-4">
                        <div class="font-bold text-slate-900">${Utils.formatCurrency(apt.amount)}</div>
                        <div class="mt-0.5">${payBadge}</div>
                    </td>
                    <td class="py-3 px-4">${Utils.renderStatusBadge(apt.status)}</td>
                    <td class="py-3 px-4 text-center">
                        <div class="flex items-center justify-center gap-1.5 flex-wrap">
                            <button onclick="ReceptionistApp.sendWhatsAppConfirmation('${apt.id}')" title="إرسال تأكيد الحجز بالواتساب" class="btn-press px-2 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition inline-flex items-center gap-1">
                                💬 واتساب
                            </button>
                            ${apt.status === 'pending' ? `
                                <button onclick="ReceptionistApp.updateStatus('${apt.id}', 'confirmed')" class="btn-press px-2.5 py-1 text-[11px] font-bold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition">
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
        }
    },

    async updateStatus(apptId, newStatus) {
        try {
            if (window.db && window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url.indexOf('xyzcompany') === -1) {
                await window.db.from('appointments').update({ status: newStatus }).eq('id', apptId);
            }
            const item = this.appointments.find(a => a.id === apptId);
            if (item) item.status = newStatus;
            this.saveStoredAppointments();

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
        
        const cashRevenue = confirmedOrCompleted
            .filter(a => a.payment_type !== 'corporate')
            .reduce((sum, a) => sum + Number(a.amount || 0), 0);
            
        const corporateClaims = confirmedOrCompleted
            .filter(a => a.payment_type === 'corporate')
            .reduce((sum, a) => sum + Number(a.company_claim_amount || a.amount || 0), 0);

        const revEl = document.getElementById('shift-revenue-display');
        const corpEl = document.getElementById('shift-corporate-display');
        const countEl = document.getElementById('shift-count-display');

        if (revEl) revEl.textContent = Utils.formatCurrency(cashRevenue);
        if (corpEl) corpEl.textContent = Utils.formatCurrency(corporateClaims);
        if (countEl) countEl.textContent = `${confirmedOrCompleted.length} / ${totalAppointments}`;
    },

    openShiftCloseoutModal() {
        const modal = document.getElementById('shift-closeout-modal');
        if (!modal) return;

        const totalCases = this.appointments.length;
        const confirmedOrCompleted = this.appointments.filter(a => a.status === 'confirmed' || a.status === 'completed');
        const cashRevenue = confirmedOrCompleted
            .filter(a => a.payment_type !== 'corporate')
            .reduce((sum, a) => sum + Number(a.amount || 0), 0);
        const corpClaims = confirmedOrCompleted
            .filter(a => a.payment_type === 'corporate')
            .reduce((sum, a) => sum + Number(a.company_claim_amount || a.amount || 0), 0);
        const cancelledCount = this.appointments.filter(a => a.status === 'cancelled').length;

        document.getElementById('modal-closeout-cases').textContent = totalCases;
        document.getElementById('modal-closeout-completed').textContent = confirmedOrCompleted.length;
        document.getElementById('modal-closeout-cancelled').textContent = cancelledCount;
        document.getElementById('modal-closeout-revenue').textContent = Utils.formatCurrency(cashRevenue);
        document.getElementById('modal-closeout-corp').textContent = Utils.formatCurrency(corpClaims);

        modal.classList.remove('hidden');
    },

    exportShiftExcel() {
        if (!window.Reports) return;
        const shiftInfo = {
            clinicName: 'عيادات الشفاء التخصصية',
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

        // التبديل بين الدفع النقدي والتعاقد في المودال
        const payTypeSelect = document.getElementById('modal-payment-type');
        const corpContainer = document.getElementById('modal-corporate-container');
        const amountInput = document.getElementById('modal-amount');
        const contractSelect = document.getElementById('modal-contract-select');
        const calcDisplay = document.getElementById('modal-calc-preview');

        const updateCalculations = () => {
            const isCorp = payTypeSelect.value === 'corporate';
            const baseAmount = Number(amountInput.value || 200);

            if (isCorp && contractSelect.selectedIndex > 0) {
                const opt = contractSelect.options[contractSelect.selectedIndex];
                const discRate = Number(opt.getAttribute('data-discount') || 0);
                const discVal = (baseAmount * discRate) / 100;
                const companyDue = baseAmount - discVal;

                calcDisplay.classList.remove('hidden');
                calcDisplay.innerHTML = `
                    <div class="text-[11px] text-purple-800 font-semibold">
                        خصم التعاقد (${discRate}%): ${discVal} ج.م | المستحق على الشركة للتحصيل: <span class="font-bold">${companyDue} ج.م</span>
                    </div>
                `;
            } else {
                calcDisplay.classList.add('hidden');
            }
        };

        if (payTypeSelect && corpContainer) {
            payTypeSelect.onchange = () => {
                if (payTypeSelect.value === 'corporate') {
                    corpContainer.classList.remove('hidden');
                } else {
                    corpContainer.classList.add('hidden');
                }
                updateCalculations();
            };
        }

        if (contractSelect) contractSelect.onchange = updateCalculations;
        if (amountInput) amountInput.oninput = updateCalculations;

        // نموذج إضافة حجز
        const form = document.getElementById('new-appointment-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const name = document.getElementById('modal-patient-name').value.trim();
                const phone = document.getElementById('modal-patient-phone').value.trim();
                const amount = parseFloat(document.getElementById('modal-amount').value || 200);
                const time = document.getElementById('modal-time').value || '14:00';
                const payType = payTypeSelect.value;

                let contractName = null;
                let discRate = 0;
                let discAmount = 0;
                let companyClaim = 0;
                let patientPaid = amount;

                if (payType === 'corporate' && contractSelect.selectedIndex > 0) {
                    const opt = contractSelect.options[contractSelect.selectedIndex];
                    contractName = opt.text.split('(')[0].trim();
                    discRate = Number(opt.getAttribute('data-discount') || 0);
                    discAmount = (amount * discRate) / 100;
                    companyClaim = amount - discAmount;
                    patientPaid = 0; // مسدد من الشركة أو حسب التعاقد
                }

                const newApt = {
                    id: 'apt_' + Date.now(),
                    patient_name: name,
                    patient_phone: phone,
                    doctor_name: document.getElementById('modal-doctor-select').selectedOptions[0].text,
                    time_slot: time,
                    amount,
                    payment_type: payType,
                    contract_name: contractName,
                    discount_percentage: discRate,
                    discount_amount: discAmount,
                    patient_paid_amount: patientPaid,
                    company_claim_amount: companyClaim,
                    status: 'pending'
                };

                this.appointments.unshift(newApt);
                this.saveStoredAppointments();
                Utils.showToast('تم تسجيل الحجز بنجاح. يمكنك إرسال رسالة الواتساب للمريض بالضغط على زر الواتساب في الجدول عند الحاجة', 'success');
                modal.classList.add('hidden');
                form.reset();
                corpContainer.classList.add('hidden');
                calcDisplay.classList.add('hidden');
                this.renderAppointmentsTable();
                this.updateShiftSummaryKPIs();
            };
        }
    },

    sendWhatsAppConfirmation(apptId) {
        const apt = this.appointments.find(a => a.id === apptId);
        if (apt && typeof WhatsAppService !== 'undefined') {
            WhatsAppService.showBookingConfirmationModal(apt);
        }
    },

    getMockContracts() {
        return [
            { id: 'c1', name: 'شركة مصر للتأمين', discount_percentage: 20 },
            { id: 'c2', name: 'نقابة المهندسين', discount_percentage: 25 },
            { id: 'c3', name: 'بتروتريد للخدمات البترولية', discount_percentage: 30 },
            { id: 'c4', name: 'أكسا للتأمين الطبي (AXA)', discount_percentage: 15 }
        ];
    },

    getMockAppointments() {
        return [
            { id: '101', patient_name: 'محمد إبراهيم علي', patient_phone: '01012345678', doctor_name: 'د. أحمد الشناوي', time_slot: '09:30', amount: 200, payment_type: 'cash', patient_paid_amount: 200, company_claim_amount: 0, status: 'completed' },
            { id: '102', patient_name: 'فاطمة حسني محمود', patient_phone: '01123456789', doctor_name: 'د. سارة محمود', time_slot: '10:15', amount: 250, payment_type: 'corporate', contract_name: 'شركة مصر للتأمين', discount_percentage: 20, patient_paid_amount: 0, company_claim_amount: 200, status: 'confirmed' },
            { id: '103', patient_name: 'محمود عبد الرازق', patient_phone: '01234567890', doctor_name: 'د. أحمد الشناوي', time_slot: '11:00', amount: 200, payment_type: 'corporate', contract_name: 'نقابة المهندسين', discount_percentage: 25, patient_paid_amount: 0, company_claim_amount: 150, status: 'pending' }
        ];
    }
};

window.ReceptionistApp = ReceptionistApp;
document.addEventListener('DOMContentLoaded', () => ReceptionistApp.init());
