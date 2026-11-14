/**
 * منطق لوحة تحكم المحاسب المالي والرقابة المالية (Accountant Controller)
 * صلاحية حصرية للمحاسب والمدير العام لتعديل وإلغاء الحركات وإصدار الفواتير التعاقدية والكاش
 */

const AccountantApp = {
    currentAccountant: null,
    financialRecords: [],
    contracts: [],
    auditLogs: [],

    async init() {
        // حماية الصفحة: مقتصرة فقط على المحاسب والمدير العام
        const authData = await Auth.protectRoute(['accountant', 'superadmin']);
        if (!authData) return;

        this.currentAccountant = authData.profile;
        if (this.currentAccountant) {
            document.getElementById('user-display-name').textContent = this.currentAccountant.full_name || 'المحاسب المالي';
        }

        await this.loadFinancialData();
        this.bindEvents();
    },

    async loadFinancialData() {
        this.financialRecords = this.getMockFinancialRecords();

        // دمج أي كشوفات تم حجزها أو تأكيدها مؤخراً من الاستقبال أو المريض
        const storedAppts = localStorage.getItem('alwagih_appointments');
        if (storedAppts) {
            try {
                const appts = JSON.parse(storedAppts);
                appts.forEach(a => {
                    if (!this.financialRecords.some(r => r.id === a.id)) {
                        this.financialRecords.unshift({
                            id: a.id || 'rec_' + Date.now(),
                            patient_name: a.patient_name || (a.patient ? a.patient.full_name : 'مريض كشف'),
                            doctor_name: a.doctor_name || 'د. المناوب',
                            date: a.date || new Date().toISOString().split('T')[0],
                            payment_type: a.payment_type || 'cash',
                            contract_name: a.contract_name || '',
                            gross_amount: Number(a.amount || 200),
                            discount_amount: Number(a.discount_amount || 0),
                            patient_paid: Number(a.patient_paid_amount !== undefined ? a.patient_paid_amount : (a.payment_type === 'corporate' ? 0 : a.amount || 200)),
                            company_claim: Number(a.company_claim_amount || 0),
                            status: a.status || 'confirmed'
                        });
                    }
                });
            } catch (e) {}
        }

        this.contracts = this.getMockContracts();
        this.auditLogs = this.getMockAuditLogs();

        this.renderFinancialTable();
        this.renderContractsSelect();
        this.renderAuditLogsTable();
        this.updateFinancialKPIs();
    },

    renderFinancialTable() {
        const tbody = document.getElementById('financial-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.financialRecords.map(rec => {
            const isVoided = rec.status === 'voided' || rec.status === 'cancelled';
            const payTypeBadge = rec.payment_type === 'corporate'
                ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">🏢 تعاقد: ${rec.contract_name}</span>`
                : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">💵 نقدي</span>`;

            return `
                <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs ${isVoided ? 'opacity-50 bg-rose-50/30' : ''}">
                    <td class="py-3 px-4 font-mono font-bold text-slate-800">#${rec.id.slice(-6)}</td>
                    <td class="py-3 px-4 font-bold text-slate-900">${rec.patient_name}</td>
                    <td class="py-3 px-4 text-slate-600">${rec.doctor_name}</td>
                    <td class="py-3 px-4 font-mono text-slate-600">${rec.date}</td>
                    <td class="py-3 px-4">${payTypeBadge}</td>
                    <td class="py-3 px-4 font-bold font-mono">${Utils.formatCurrency(rec.gross_amount)}</td>
                    <td class="py-3 px-4 font-mono text-rose-600">-${Utils.formatCurrency(rec.discount_amount)}</td>
                    <td class="py-3 px-4 font-mono text-emerald-700 font-bold">${Utils.formatCurrency(rec.patient_paid)}</td>
                    <td class="py-3 px-4 font-mono text-purple-700 font-bold">${Utils.formatCurrency(rec.company_claim)}</td>
                    <td class="py-3 px-4">
                        ${isVoided 
                            ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">ملغى بموافقة مالية</span>' 
                            : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">معتمد</span>'}
                    </td>
                    <td class="py-3 px-4 text-center">
                        ${!isVoided ? `
                            <div class="flex items-center justify-center gap-1.5">
                                <button onclick="AccountantApp.openEditModal('${rec.id}')" class="px-2 py-1 text-[11px] font-bold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition">
                                    تعديل
                                </button>
                                <button onclick="AccountantApp.openVoidModal('${rec.id}')" class="px-2 py-1 text-[11px] font-bold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition">
                                    إلغاء الإجراء
                                </button>
                            </div>
                        ` : '<span class="text-slate-400 text-[10px]">مغلق</span>'}
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderContractsSelect() {
        const select = document.getElementById('corporate-invoice-contract-select');
        if (!select) return;

        select.innerHTML = this.contracts.map(c => `
            <option value="${c.id}">${c.name} (خصم ${c.discount_percentage}% | تحمل المريض ${c.patient_copay_percentage}%)</option>
        `).join('');
    },

    renderAuditLogsTable() {
        const tbody = document.getElementById('audit-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.auditLogs.map(log => `
            <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs font-mono">
                <td class="py-2.5 px-4 text-slate-500">${log.timestamp}</td>
                <td class="py-2.5 px-4 font-bold text-slate-800">${log.action_type}</td>
                <td class="py-2.5 px-4 text-slate-700">${log.authorized_by}</td>
                <td class="py-2.5 px-4 text-rose-700 font-sans">${log.reason}</td>
                <td class="py-2.5 px-4 text-slate-500 font-sans">${log.notes || '—'}</td>
            </tr>
        `).join('');
    },

    updateFinancialKPIs() {
        const totalCash = this.financialRecords
            .filter(r => r.status !== 'voided')
            .reduce((sum, r) => sum + Number(r.patient_paid || 0), 0);

        const totalCorporateClaims = this.financialRecords
            .filter(r => r.status !== 'voided')
            .reduce((sum, r) => sum + Number(r.company_claim || 0), 0);

        const totalDiscounts = this.financialRecords
            .filter(r => r.status !== 'voided')
            .reduce((sum, r) => sum + Number(r.discount_amount || 0), 0);

        document.getElementById('kpi-acc-cash').textContent = Utils.formatCurrency(totalCash);
        document.getElementById('kpi-acc-corp').textContent = Utils.formatCurrency(totalCorporateClaims);
        document.getElementById('kpi-acc-discount').textContent = Utils.formatCurrency(totalDiscounts);
        document.getElementById('kpi-acc-overrides').textContent = `${this.auditLogs.length} حركات مصرحة`;
    },

    // فتح نافذة الإلغاء المصرح
    openVoidModal(recordId) {
        document.getElementById('void-record-id').value = recordId;
        document.getElementById('void-reason-input').value = '';
        document.getElementById('void-modal').classList.remove('hidden');
    },

    // فتح نافذة التعديل المصرح
    openEditModal(recordId) {
        const rec = this.financialRecords.find(r => r.id === recordId);
        if (!rec) return;

        document.getElementById('edit-record-id').value = recordId;
        document.getElementById('edit-gross-amount').value = rec.gross_amount;
        document.getElementById('edit-patient-paid').value = rec.patient_paid;
        document.getElementById('edit-reason-input').value = '';
        document.getElementById('edit-modal').classList.remove('hidden');
    },

    // تصدير اليومية المالية إلى Excel
    exportFinancialLedgerExcel() {
        if (window.Reports) {
            Reports.exportFinancialLedgerToExcel(this.financialRecords);
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    // تصدير السجل الرقابي المالي إلى Excel
    exportAuditTrailExcel() {
        if (window.Reports) {
            Reports.exportAuditTrailToExcel(this.auditLogs);
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    // إصدار فاتورة مطالبة للشركة
    generateCorporateClaim() {
        const select = document.getElementById('corporate-invoice-contract-select');
        const contractId = select ? select.value : (this.contracts[0] ? this.contracts[0].id : null);
        const contract = this.contracts.find(c => c.id === contractId) || this.contracts[0];
        if (!contract) {
            Utils.showToast('يرجى تحديد شركة متعاقدة أولاً', 'warning');
            return;
        }
        if (!window.Reports) {
            Utils.showToast('جاري تحميل محرك التقارير...', 'info');
            return;
        }

        const appts = this.financialRecords.filter(r => r.payment_type === 'corporate' && r.status !== 'voided');
        const matchingAppts = appts.filter(r => r.contract_name === contract.name);
        const finalAppts = matchingAppts.length > 0 ? matchingAppts : appts;

        Reports.exportCorporateClaimToExcel(contract, finalAppts, `INV-CORP-${Date.now().toString().slice(-6)}`);
    },

    printCorporateClaim() {
        const select = document.getElementById('corporate-invoice-contract-select');
        const contractId = select ? select.value : (this.contracts[0] ? this.contracts[0].id : null);
        const contract = this.contracts.find(c => c.id === contractId) || this.contracts[0];
        if (!contract) {
            Utils.showToast('يرجى تحديد شركة متعاقدة أولاً', 'warning');
            return;
        }
        if (!window.Reports) {
            Utils.showToast('جاري تحميل محرك التقارير...', 'info');
            return;
        }

        const appts = this.financialRecords.filter(r => r.payment_type === 'corporate' && r.status !== 'voided');
        const matchingAppts = appts.filter(r => r.contract_name === contract.name);
        const finalAppts = matchingAppts.length > 0 ? matchingAppts : appts;

        Reports.printCorporateClaimPDF(contract, finalAppts, `INV-CORP-${Date.now().toString().slice(-6)}`);
    },

    bindEvents() {
        // تأكيد إلغاء الحركة المالية
        const voidForm = document.getElementById('void-form');
        if (voidForm) {
            voidForm.onsubmit = (e) => {
                e.preventDefault();
                const recordId = document.getElementById('void-record-id').value;
                const reason = document.getElementById('void-reason-input').value.trim();

                const rec = this.financialRecords.find(r => r.id === recordId);
                if (rec) {
                    rec.status = 'voided';
                    this.auditLogs.unshift({
                        timestamp: new Date().toLocaleString('ar-EG'),
                        action_type: 'إلغاء إجراء كشف (VOID)',
                        authorized_by: this.currentAccountant ? this.currentAccountant.full_name : 'المحاسب المالي',
                        reason: reason,
                        notes: `تم إلغاء الكشف #${recordId.slice(-6)} بقيمة ${rec.gross_amount} ج.م`
                    });

                    Utils.showToast(`تم إلغاء الحركة وتوثيق سبب الإلغاء في السجل الرقابي`, 'success');
                    document.getElementById('void-modal').classList.add('hidden');
                    this.renderFinancialTable();
                    this.renderAuditLogsTable();
                    this.updateFinancialKPIs();
                }
            };
        }

        // تأكيد تعديل الحركة المالية
        const editForm = document.getElementById('edit-form');
        if (editForm) {
            editForm.onsubmit = (e) => {
                e.preventDefault();
                const recordId = document.getElementById('edit-record-id').value;
                const newGross = parseFloat(document.getElementById('edit-gross-amount').value || 0);
                const newPaid = parseFloat(document.getElementById('edit-patient-paid').value || 0);
                const reason = document.getElementById('edit-reason-input').value.trim();

                const rec = this.financialRecords.find(r => r.id === recordId);
                if (rec) {
                    const prevAmount = rec.gross_amount;
                    rec.gross_amount = newGross;
                    rec.patient_paid = newPaid;

                    this.auditLogs.unshift({
                        timestamp: new Date().toLocaleString('ar-EG'),
                        action_type: 'تعديل قيمة مالية (EDIT)',
                        authorized_by: this.currentAccountant ? this.currentAccountant.full_name : 'المحاسب المالي',
                        reason: reason,
                        notes: `تعديل من ${prevAmount} ج.م إلى ${newGross} ج.م`
                    });

                    Utils.showToast(`تم تعديل القيمة وتوثيق العملية في سجل التدقيق المالي`, 'success');
                    document.getElementById('edit-modal').classList.add('hidden');
                    this.renderFinancialTable();
                    this.renderAuditLogsTable();
                    this.updateFinancialKPIs();
                }
            };
        }
    },

    getMockFinancialRecords() {
        return [
            { id: 'rec_1001', patient_name: 'أحمد سعيد عبد الله', doctor_name: 'د. أحمد الشناوي', date: '2026-11-14', payment_type: 'cash', gross_amount: 250, discount_amount: 0, patient_paid: 250, company_claim: 0, status: 'confirmed' },
            { id: 'rec_1002', patient_name: 'هالة محمود مرسي', doctor_name: 'د. سارة محمود', date: '2026-11-14', payment_type: 'corporate', contract_name: 'شركة مصر للتأمين', gross_amount: 300, discount_amount: 60, patient_paid: 60, company_claim: 180, status: 'confirmed' },
            { id: 'rec_1003', patient_name: 'محمود عبد العزيز', doctor_name: 'د. كريم عبد العزيز', date: '2026-11-14', payment_type: 'corporate', contract_name: 'نقابة المهندسين', gross_amount: 250, discount_amount: 62.5, patient_paid: 50, company_claim: 137.5, status: 'confirmed' },
            { id: 'rec_1004', patient_name: 'سارة خالد النجار', doctor_name: 'د. أحمد الشناوي', date: '2026-11-14', payment_type: 'cash', gross_amount: 200, discount_amount: 0, patient_paid: 200, company_claim: 0, status: 'confirmed' },
            { id: 'rec_1005', patient_name: 'طارق حسام مصطفى', doctor_name: 'د. سارة محمود', date: '2026-11-14', payment_type: 'corporate', contract_name: 'بتروتريد للخدمات البترولية', gross_amount: 350, discount_amount: 105, patient_paid: 70, company_claim: 175, status: 'confirmed' }
        ];
    },

    getMockContracts() {
        return [
            { id: 'c1', name: 'شركة مصر للتأمين', discount_percentage: 20, patient_copay_percentage: 20 },
            { id: 'c2', name: 'نقابة المهندسين', discount_percentage: 25, patient_copay_percentage: 20 },
            { id: 'c3', name: 'بتروتريد للخدمات البترولية', discount_percentage: 30, patient_copay_percentage: 20 },
            { id: 'c4', name: 'أكسا للتأمين الطبي (AXA)', discount_percentage: 15, patient_copay_percentage: 10 }
        ];
    },

    getMockAuditLogs() {
        return [
            { timestamp: '14/11/2026 11:30 ص', action_type: 'تعديل قيمة مالية (EDIT)', authorized_by: 'المحاسب المالي', reason: 'تصحيح خطأ استعلام كشف استشاري', notes: 'تعديل من 300 إلى 250 ج.م' },
            { timestamp: '14/11/2026 10:15 ص', action_type: 'إلغاء إجراء كشف (VOID)', authorized_by: 'المدير العام', reason: 'إلغاء حجز لمريض غادر قبل الكشف مع استرداد المبلغ', notes: 'الكشف #rec_982' }
        ];
    }
};

window.AccountantApp = AccountantApp;
document.addEventListener('DOMContentLoaded', () => AccountantApp.init());
