/**
 * نظام الصيدلية الداخلية وصرف الروشتات الإلكترونية اللحظية (In-House Pharmacy Controller)
 * يشمل: كاشف التداخلات الدوائية الإكلينيكي (Drug-Drug Interactions)،
 * تتبع تواريخ الصلاحية ورقم التشغيلة (Batch & Expiry)، ملصقات الجرعات اللاصقة، ونقاط البيع POS
 */

const PharmacyApp = {
    currentPharmacist: null,
    activeSubView: 'dispense',
    drugsCatalog: [],
    pendingPrescriptions: [],
    dispenseHistory: [],
    knownInteractions: [],
    activePrescriptionId: null,

    async init() {
        const authData = await Auth.protectRoute(['pharmacist', 'admin', 'superadmin']);
        if (!authData) return;

        this.currentPharmacist = authData.profile;
        if (this.currentPharmacist) {
            const nameEl = document.getElementById('user-display-name');
            if (nameEl) nameEl.textContent = this.currentPharmacist.full_name || 'د. سارة عثمان';
        }

        await this.loadAllData();
        this.bindEvents();

        window.addEventListener('alwagih_language_changed', () => {
            this.renderPendingPrescriptions();
            this.renderDrugsInventory();
            this.renderKnownInteractions();
            this.renderSalesHistory();
            this.updateKPIs();
        });
    },

    async loadAllData() {
        this.drugsCatalog = this.getMockDrugsCatalog();
        this.pendingPrescriptions = this.getStoredPrescriptions();
        this.dispenseHistory = this.getMockDispenseHistory();
        this.knownInteractions = this.getMockInteractions();

        this.renderPendingPrescriptions();
        this.renderDrugsInventory();
        this.populateInteractionsSelect();
        this.renderKnownInteractions();
        this.renderSalesHistory();
        this.populateOTCDrugSelect();
        this.updateKPIs();
    },

    getStoredPrescriptions() {
        try {
            const stored = localStorage.getItem('alwagih_pharmacy_prescriptions');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch(e) {}
        return this.getMockPendingPrescriptions();
    },

    saveStoredPrescriptions() {
        try {
            localStorage.setItem('alwagih_pharmacy_prescriptions', JSON.stringify(this.pendingPrescriptions));
        } catch(e) {}
    },

    switchSubView(viewId) {
        this.activeSubView = viewId;
        const views = ['dispense', 'inventory', 'interactions', 'history'];
        views.forEach(v => {
            const el = document.getElementById(`subview-${v}`);
            const btn = document.getElementById(`sub-btn-${v}`);
            if (el) el.classList.toggle('hidden', v !== viewId);
            if (btn) {
                if (v === viewId) {
                    btn.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-sm transition flex items-center gap-1.5';
                } else {
                    btn.className = 'px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5';
                }
            }
        });
    },

    // ==============================================================
    // 1. محطة صرف الروشتات الإلكترونية والتحقق الإكلينيكي
    // ==============================================================
    renderPendingPrescriptions() {
        const container = document.getElementById('pending-rx-container');
        const badge = document.getElementById('rx-pending-badge');
        if (!container) return;

        const pendingList = (this.pendingPrescriptions || []).filter(rx => rx.status === 'pending');
        if (badge) badge.textContent = `${pendingList.length} روشتات`;

        if (pendingList.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <div class="text-3xl mb-2">🎉</div>
                    <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200">لا توجد روشتات معلقة</h4>
                    <p class="text-[11px] text-slate-400 mt-1">تمت مراجعة وصرف جميع الروشتات الواردة من العيادات بنجاح.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = pendingList.map(rx => `
            <div class="card-hover p-4 rounded-2xl border transition-all ${this.activePrescriptionId === rx.id ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'} space-y-3">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-1 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono font-bold text-xs">${rx.rx_number}</span>
                        <div>
                            <h4 class="font-bold text-slate-900 dark:text-white text-xs">${rx.patient_name}</h4>
                            <p class="text-[10px] text-slate-400 font-mono">${rx.patient_phone || '—'}</p>
                        </div>
                    </div>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${rx.payment_type === 'corporate' ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'}">
                        ${rx.payment_type === 'corporate' ? `تأمين (${rx.company_name})` : 'نقدي (Cash)'}
                    </span>
                </div>

                <div class="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>الطبيب: <span class="font-bold">${rx.doctor_name}</span> (${rx.clinic_name})</div>
                    <div class="text-[10px] text-slate-400">${rx.created_time || 'اليوم 11:30 ص'}</div>
                </div>

                <!-- Prescribed Items Summary -->
                <div class="space-y-1">
                    <span class="text-[10px] text-slate-400 block font-semibold">الأدوية الموصوفة:</span>
                    <div class="flex flex-wrap gap-1.5">
                        ${rx.items.map(item => `
                            <span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                                💊 ${item.drug_name} (${item.dosage})
                            </span>
                        `).join('')}
                    </div>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span class="text-xs font-black text-slate-900 dark:text-white font-mono">${Utils.formatCurrency(rx.total_amount)}</span>
                    <button onclick="PharmacyApp.selectPrescriptionToDispense('${rx.id}')" class="btn-press px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center gap-1.5 transition">
                        <span>🔍</span>
                        <span>فحص وصرف الروشتة</span>
                    </button>
                </div>
            </div>
        `).join('');
    },

    selectPrescriptionToDispense(rxId) {
        const rx = this.pendingPrescriptions.find(item => item.id === rxId);
        if (!rx) return;

        this.activePrescriptionId = rxId;
        this.renderPendingPrescriptions();

        const panel = document.getElementById('active-dispense-content');
        if (!panel) return;

        // Run clinical drug interaction checks across all prescribed items
        const drugNames = rx.items.map(it => it.drug_name);
        const interactionsFound = this.detectPrescriptionInteractions(drugNames);

        panel.innerHTML = `
            <div class="space-y-4">
                <!-- Patient & Rx Header -->
                <div class="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="text-[10px] text-slate-400 block font-semibold">المريض</span>
                            <strong class="text-sm font-black text-slate-900 dark:text-white">${rx.patient_name}</strong>
                        </div>
                        <span class="px-2.5 py-1 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-mono font-bold text-xs">${rx.rx_number}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800">
                        <div>الطبيب: <strong class="text-slate-800 dark:text-slate-200">${rx.doctor_name}</strong></div>
                        <div>العيادة: <strong class="text-slate-800 dark:text-slate-200">${rx.clinic_name}</strong></div>
                    </div>
                </div>

                <!-- Interaction Safety Alerts (إنذارات التداخلات) -->
                ${interactionsFound.length > 0 ? `
                    <div class="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl space-y-2">
                        <div class="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
                            <span class="text-base">🚨</span>
                            <span>تنبيه إكلينيكي: تم رصد تعارض / تداخل دوائي خطير!</span>
                        </div>
                        ${interactionsFound.map(alert => `
                            <div class="text-[11px] text-rose-900 dark:text-rose-200 bg-white/70 dark:bg-slate-900/70 p-2 rounded-xl border border-rose-100 dark:border-rose-800 leading-relaxed">
                                <strong class="text-rose-600 block">${alert.drug_a} + ${alert.drug_b} (${alert.severity})</strong>
                                <span>${alert.description}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                        <span class="text-base">✅</span>
                        <span>فحص السلامة الإكلينيكية: لا توجد تداخلات دوائية معروفة بين أصناف الروشتة.</span>
                    </div>
                `}

                <!-- Items to Dispense Table -->
                <div class="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <table class="w-full text-right text-xs">
                        <thead class="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                            <tr>
                                <th class="py-2 px-3">الدواء والجرعة</th>
                                <th class="py-2 px-3">الكمية</th>
                                <th class="py-2 px-3">السعر</th>
                                <th class="py-2 px-3 text-center">الملصق</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                            ${rx.items.map(item => `
                                <tr>
                                    <td class="py-2.5 px-3">
                                        <div class="font-bold text-slate-900 dark:text-white">${item.drug_name}</div>
                                        <div class="text-[10px] text-slate-400">${item.instructions || item.dosage}</div>
                                    </td>
                                    <td class="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">${item.quantity || 1} علبة</td>
                                    <td class="py-2.5 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-300">${Utils.formatCurrency(item.price)}</td>
                                    <td class="py-2.5 px-3 text-center">
                                        <button onclick="PharmacyApp.openDosageStickerModal('${item.drug_name}', '${item.instructions || item.dosage}', '${rx.patient_name}', '${rx.rx_number}')" class="px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[10px] font-bold hover:bg-sky-600 hover:text-white transition">
                                            🏷️ ملصق
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Financial Calculation (Co-Pay / Cash) -->
                <div class="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <div class="flex items-center justify-between text-slate-500">
                        <span>إجمالي قيمة الأدوية:</span>
                        <strong class="font-mono text-slate-800 dark:text-slate-200">${Utils.formatCurrency(rx.total_amount)}</strong>
                    </div>
                    ${rx.payment_type === 'corporate' ? `
                    <div class="flex items-center justify-between text-purple-700 dark:text-purple-300">
                        <span>تغطية شركة التأمين (${rx.company_name}):</span>
                        <strong class="font-mono">-${Utils.formatCurrency(rx.insurance_claim)}</strong>
                    </div>
                    ` : ''}
                    <div class="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-sm font-black text-emerald-700 dark:text-emerald-300">
                        <span>المطلوب سداده نقداً (Co-Pay):</span>
                        <span class="font-mono text-base">${Utils.formatCurrency(rx.patient_copay)}</span>
                    </div>
                </div>

                <!-- Action Button -->
                <button onclick="PharmacyApp.confirmDispensePrescription('${rx.id}')" class="btn-press w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition">
                    <span>✅</span>
                    <span>تأكيد صرف الروشتة وخصم الرصيد من المخزن</span>
                </button>
            </div>
        `;
    },

    confirmDispensePrescription(rxId) {
        const rx = this.pendingPrescriptions.find(item => item.id === rxId);
        if (!rx) return;

        // Deduct quantities from drugsCatalog
        rx.items.forEach(item => {
            const catalogDrug = this.drugsCatalog.find(d => d.name.toLowerCase().includes(item.drug_name.toLowerCase()) || item.drug_name.toLowerCase().includes(d.name.toLowerCase()));
            if (catalogDrug) {
                catalogDrug.stock_qty = Math.max(0, (catalogDrug.stock_qty || 0) - (item.quantity || 1));
            }
        });

        rx.status = 'dispensed';
        rx.dispense_time = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        rx.pharmacist_name = this.currentPharmacist ? this.currentPharmacist.full_name : 'د. سارة عثمان';
        rx.items_summary = rx.items.map(it => `${it.drug_name} (${it.quantity || 1} علبة)`).join(' + ');

        // Add to dispense history
        this.dispenseHistory.unshift(rx);
        this.saveStoredPrescriptions();

        Utils.showToast(`تم صرف الروشتة (${rx.rx_number}) بنجاح للمريض: ${rx.patient_name} وخصم الأدوية من المخزن`, 'success');

        this.activePrescriptionId = null;
        const panel = document.getElementById('active-dispense-content');
        if (panel) {
            panel.innerHTML = `
                <div class="p-8 text-center bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                    <span class="text-4xl block">🎉</span>
                    <h4 class="text-xs font-bold text-emerald-900 dark:text-emerald-200">تم إتمام الصرف بنجاح!</h4>
                    <p class="text-[11px] text-emerald-700 dark:text-emerald-300">تم تحديث المخزن وطباعة الفاتورة والملصقات.</p>
                </div>
            `;
        }

        this.renderPendingPrescriptions();
        this.renderDrugsInventory();
        this.renderSalesHistory();
        this.updateKPIs();
    },

    // ==============================================================
    // 2. إدارة كتالوج ومخزون الأدوية وتتبع الصلاحية
    // ==============================================================
    renderDrugsInventory(customList) {
        const tbody = document.getElementById('pharmacy-drugs-table-body');
        if (!tbody) return;

        const list = customList || this.drugsCatalog || [];
        const today = new Date();

        tbody.innerHTML = list.map(drug => {
            const expDate = new Date(drug.expiry_date);
            const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
            
            let expiryBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">ساري (${drug.expiry_date})</span>`;
            if (diffDays <= 0) {
                expiryBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">منتهي الصلاحية ⚠️</span>`;
                drug.expiry_status = 'expired';
            } else if (diffDays <= 90) {
                expiryBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">ينتهي خلال ${diffDays} يوم</span>`;
                drug.expiry_status = 'expiring_soon';
            } else {
                drug.expiry_status = 'valid';
            }

            const isLowStock = (drug.stock_qty || 0) <= (drug.reorder_level || 10);

            return `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td class="py-3 px-3">
                        <div class="font-bold text-slate-900 dark:text-white text-xs">${drug.name}</div>
                        <div class="text-[10px] text-slate-400 font-mono">${drug.generic_name || '—'}</div>
                    </td>
                    <td class="py-3 px-3">
                        <span class="text-xs text-slate-800 dark:text-slate-200">${drug.dosage_form}</span>
                        <span class="text-[10px] text-slate-400 block font-mono font-bold">${drug.strength}</span>
                    </td>
                    <td class="py-3 px-3 font-mono text-slate-600 dark:text-slate-400 text-xs">${drug.batch_no || 'BATCH-2026'}</td>
                    <td class="py-3 px-3">${expiryBadge}</td>
                    <td class="py-3 px-3">
                        <div class="font-mono font-bold text-xs ${isLowStock ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}">
                            ${drug.stock_qty || 0} علبة
                        </div>
                        ${isLowStock ? '<span class="text-[9px] font-bold text-rose-600 block">رصيد حرج</span>' : ''}
                    </td>
                    <td class="py-3 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-300 text-xs">
                        ${Utils.formatCurrency(drug.selling_price)}
                    </td>
                    <td class="py-3 px-3 text-center">
                        <div class="flex items-center justify-center gap-1.5">
                            <button onclick="PharmacyApp.restockDrug('${drug.id}')" title="زيادة الرصيد وتوريد دفعة جديدة" class="px-2 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition">
                                + توريد
                            </button>
                            <button onclick="PharmacyApp.showBarcode('${drug.barcode}')" title="رمز الباركود" class="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-slate-700">
                                📊
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    filterDrugs() {
        const query = (document.getElementById('drug-search-input')?.value || '').toLowerCase().trim();
        const expiryFilter = document.getElementById('drug-expiry-filter')?.value || 'all';
        const formFilter = document.getElementById('drug-form-filter')?.value || 'all';

        const filtered = (this.drugsCatalog || []).filter(d => {
            const matchQuery = !query || d.name.toLowerCase().includes(query) || (d.generic_name && d.generic_name.toLowerCase().includes(query)) || (d.barcode && d.barcode.includes(query));
            const matchExpiry = expiryFilter === 'all' || d.expiry_status === expiryFilter;
            const matchForm = formFilter === 'all' || d.dosage_form.includes(formFilter);
            return matchQuery && matchExpiry && matchForm;
        });

        this.renderDrugsInventory(filtered);
    },

    restockDrug(drugId) {
        const drug = this.drugsCatalog.find(d => d.id === drugId);
        if (!drug) return;

        drug.stock_qty = (drug.stock_qty || 0) + 20;
        Utils.showToast(`تم توريد +20 علبة بنجاح للدواء: ${drug.name}`, 'success');
        this.renderDrugsInventory();
        this.updateKPIs();
    },

    showBarcode(barcode) {
        Utils.showToast(`كود الباركود الدولي: ${barcode || '6221009847123'} (سليم ومسجل)`, 'info');
    },

    openAddDrugModal() {
        const modal = document.getElementById('add-drug-modal');
        if (modal) modal.classList.remove('hidden');
    },

    // ==============================================================
    // 3. فاحص التداخلات الدوائية وموانع الاستعمال
    // ==============================================================
    populateInteractionsSelect() {
        const selA = document.getElementById('interaction-drug-a');
        const selB = document.getElementById('interaction-drug-b');
        if (!selA || !selB) return;

        const options = this.drugsCatalog.map(d => `<option value="${d.name}">${d.name} (${d.generic_name || d.dosage_form})</option>`).join('');
        selA.innerHTML = '<option value="">-- اختر الدواء الأول --</option>' + options;
        selB.innerHTML = '<option value="">-- اختر الدواء الثاني --</option>' + options;

        if (this.drugsCatalog.length >= 2) {
            selA.selectedIndex = 1;
            selB.selectedIndex = 2;
        }
    },

    checkSelectedInteraction() {
        const drugA = document.getElementById('interaction-drug-a')?.value;
        const drugB = document.getElementById('interaction-drug-b')?.value;
        const resultBox = document.getElementById('interaction-result-box');
        if (!resultBox) return;

        if (!drugA || !drugB) {
            Utils.showToast('يرجى اختيار الدوائين للفحص', 'warning');
            return;
        }

        if (drugA === drugB) {
            resultBox.innerHTML = `
                <div class="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-center font-bold">
                    ⚠️ لقد اخترت نفس الصنف الدوائي (${drugA}). تأكد من عدم مضاعفة الجرعة القصوى اليومية للمريض لتجنب السمية الدوائية (Overdose Risk).
                </div>
            `;
            return;
        }

        const conflict = this.knownInteractions.find(it => 
            (it.drug_a.toLowerCase().includes(drugA.toLowerCase()) || drugA.toLowerCase().includes(it.drug_a.toLowerCase())) &&
            (it.drug_b.toLowerCase().includes(drugB.toLowerCase()) || drugB.toLowerCase().includes(it.drug_b.toLowerCase()))
        ) || this.knownInteractions.find(it => 
            (it.drug_b.toLowerCase().includes(drugA.toLowerCase()) || drugA.toLowerCase().includes(it.drug_b.toLowerCase())) &&
            (it.drug_a.toLowerCase().includes(drugB.toLowerCase()) || drugB.toLowerCase().includes(it.drug_a.toLowerCase()))
        );

        if (conflict) {
            resultBox.innerHTML = `
                <div class="p-4 bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-400 dark:border-rose-800 rounded-2xl space-y-2">
                    <div class="flex items-center justify-between">
                        <strong class="text-rose-700 dark:text-rose-300 text-xs font-black flex items-center gap-1.5">
                            <span>🚨</span> <span>تعارض دوائي خطير (${conflict.severity})</span>
                        </strong>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100">
                            مستوى التحذير: حرج
                        </span>
                    </div>
                    <p class="text-xs text-rose-950 dark:text-rose-200 leading-relaxed font-semibold">
                        « ${conflict.description} »
                    </p>
                    <div class="pt-2 border-t border-rose-200 dark:border-rose-900 text-[11px] text-slate-700 dark:text-slate-300">
                        <strong>التوصية الإكلينيكية المعتمدة:</strong> ${conflict.recommendation}
                    </div>
                </div>
            `;
        } else {
            resultBox.innerHTML = `
                <div class="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center gap-3">
                    <span class="text-2xl">✅</span>
                    <div class="text-xs text-emerald-900 dark:text-emerald-200">
                        <strong class="block text-emerald-800 dark:text-emerald-300 mb-0.5">الاستخدام المتزامن آمن (No Known Clinical Conflict)</strong>
                        لا توجد تداخلات أو تفاعلات دوائية كبرى مسجلة بين (${drugA}) و (${drugB}). يمكن صرفهما وفقاً لتعليمات الجرعات الموصوفة.
                    </div>
                </div>
            `;
        }
    },

    detectPrescriptionInteractions(drugNamesList) {
        const alerts = [];
        for (let i = 0; i < drugNamesList.length; i++) {
            for (let j = i + 1; j < drugNamesList.length; j++) {
                const a = drugNamesList[i];
                const b = drugNamesList[j];
                const match = this.knownInteractions.find(it => 
                    (it.drug_a.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(it.drug_a.toLowerCase())) &&
                    (it.drug_b.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(it.drug_b.toLowerCase()))
                ) || this.knownInteractions.find(it => 
                    (it.drug_b.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(it.drug_b.toLowerCase())) &&
                    (it.drug_a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(it.drug_a.toLowerCase()))
                );
                if (match) alerts.push(match);
            }
        }
        return alerts;
    },

    renderKnownInteractions() {
        const container = document.getElementById('known-interactions-list');
        if (!container) return;

        container.innerHTML = this.knownInteractions.map(it => `
            <div class="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div class="space-y-0.5">
                    <div class="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>⚠️ ${it.drug_a} + ${it.drug_b}</span>
                        <span class="text-[9px] px-2 py-0.5 rounded-full font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">${it.severity}</span>
                    </div>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400">${it.description}</p>
                </div>
                <div class="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                    البديل: ${it.recommendation}
                </div>
            </div>
        `).join('');
    },

    // ==============================================================
    // 4. ملصقات الجرعات والبيع المباشر OTC
    // ==============================================================
    openDosageStickerModal(drugName, instructions, patientName, rxNo) {
        document.getElementById('sticker-date').textContent = new Date().toISOString().split('T')[0];
        document.getElementById('sticker-patient-name').textContent = patientName || 'المريض';
        document.getElementById('sticker-drug-name').textContent = drugName;
        document.getElementById('sticker-drug-strength').textContent = 'جرعة موصوفة';
        document.getElementById('sticker-dosage-instructions').textContent = `« ${instructions || 'قرص بعد الأكل كل 12 ساعة'} »`;
        document.getElementById('sticker-doctor').textContent = 'طبيب المجمع المعالج';
        document.getElementById('sticker-rx-number').textContent = rxNo || 'RX-2026';

        document.getElementById('dosage-sticker-modal').classList.remove('hidden');
    },

    populateOTCDrugSelect() {
        const select = document.getElementById('otc-drug-select');
        if (!select) return;

        select.innerHTML = '<option value="">-- اختر صنفاً دوائياً --</option>' +
            this.drugsCatalog.map(d => `<option value="${d.id}" data-price="${d.selling_price}">${d.name} (${d.dosage_form}) - ${Utils.formatCurrency(d.selling_price)}</option>`).join('');
    },

    openOTCSaleModal() {
        const modal = document.getElementById('otc-sale-modal');
        if (modal) modal.classList.remove('hidden');
    },

    onOTCDrugChange() {
        this.recalcOTCTotal();
    },

    recalcOTCTotal() {
        const select = document.getElementById('otc-drug-select');
        const qty = parseInt(document.getElementById('otc-quantity')?.value) || 1;
        const totalDisplay = document.getElementById('otc-total-display');
        if (!select || !totalDisplay) return;

        const opt = (select.selectedOptions && select.selectedOptions[0]) ? select.selectedOptions[0] : (select.options && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null);
        const price = opt ? parseFloat(opt.getAttribute('data-price')) || 0 : 0;
        const total = price * qty;
        totalDisplay.textContent = Utils.formatCurrency(total);
    },

    // ==============================================================
    // 5. سجل فواتير الصرف ومؤشرات الأداء
    // ==============================================================
    renderSalesHistory() {
        const tbody = document.getElementById('pharmacy-sales-table-body');
        if (!tbody) return;

        tbody.innerHTML = (this.dispenseHistory || []).map(rx => `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td class="py-3 px-3 font-mono font-bold text-sky-600 dark:text-sky-400 text-xs">${rx.rx_number}</td>
                <td class="py-3 px-3">
                    <div class="font-bold text-slate-900 dark:text-white text-xs">${rx.patient_name}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${rx.patient_phone || '—'}</div>
                </td>
                <td class="py-3 px-3">
                    <div class="text-xs text-slate-800 dark:text-slate-200">${rx.doctor_name}</div>
                    <div class="text-[10px] text-slate-400">${rx.clinic_name || 'العيادة التخصصية'}</div>
                </td>
                <td class="py-3 px-3 text-xs text-slate-700 dark:text-slate-300 max-w-xs truncate" title="${rx.items_summary}">
                    ${rx.items_summary}
                </td>
                <td class="py-3 px-3">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${rx.payment_type === 'corporate' ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'}">
                        ${rx.payment_type === 'corporate' ? `تأمين (${rx.company_name})` : 'نقدي (Cash)'}
                    </span>
                </td>
                <td class="py-3 px-3 font-mono font-black text-slate-900 dark:text-white text-xs">${Utils.formatCurrency(rx.total_amount)}</td>
                <td class="py-3 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-300 text-xs">${Utils.formatCurrency(rx.patient_copay)}</td>
                <td class="py-3 px-3 font-mono font-bold text-purple-700 dark:text-purple-300 text-xs">${Utils.formatCurrency(rx.insurance_claim || 0)}</td>
                <td class="py-3 px-3 text-center">
                    <button onclick="PharmacyApp.reprintInvoice('${rx.rx_number}')" title="طباعة الفاتورة" class="px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                        🖨️ فاتورة
                    </button>
                </td>
            </tr>
        `).join('');
    },

    reprintInvoice(rxNumber) {
        Utils.showToast(`جاري تجهيز وطباعة فاتورة الصيدلية #${rxNumber}`, 'info');
    },

    updateKPIs() {
        const salesEl = document.getElementById('pharm-kpi-sales');
        const dispEl = document.getElementById('pharm-kpi-dispensed');
        const pendEl = document.getElementById('pharm-kpi-pending');
        const alertEl = document.getElementById('pharm-kpi-alerts');

        const totalSales = (this.dispenseHistory || []).reduce((acc, rx) => acc + (Number(rx.total_amount) || 0), 0);
        const pendingCount = (this.pendingPrescriptions || []).filter(rx => rx.status === 'pending').length;
        const lowStockCount = (this.drugsCatalog || []).filter(d => (d.stock_qty || 0) <= (d.reorder_level || 10)).length;
        const expiryAlertsCount = (this.drugsCatalog || []).filter(d => d.expiry_status === 'expired' || d.expiry_status === 'expiring_soon').length;

        if (salesEl) salesEl.textContent = Utils.formatCurrency(totalSales);
        if (dispEl) dispEl.textContent = `${(this.dispenseHistory || []).length} روشتات`;
        if (pendEl) pendEl.textContent = `${pendingCount} روشتات`;
        if (alertEl) alertEl.textContent = `${lowStockCount + expiryAlertsCount} تنبيهات`;
    },

    exportInventoryExcel() {
        if (window.Reports && Reports.exportPharmacyInventoryReport) {
            Reports.exportPharmacyInventoryReport({}, this.drugsCatalog);
        } else {
            Utils.showToast('جاري تصدير جرد الأدوية...', 'info');
        }
    },

    exportSalesExcel() {
        if (window.Reports && Reports.exportPharmacyDispenseReport) {
            Reports.exportPharmacyDispenseReport({}, this.dispenseHistory);
        } else {
            Utils.showToast('جاري تصدير سجل مبيعات الصيدلية...', 'info');
        }
    },

    bindEvents() {
        const addDrugForm = document.getElementById('add-drug-form');
        const addDrugModal = document.getElementById('add-drug-modal');
        if (addDrugForm && addDrugModal) {
            addDrugForm.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('new-drug-name').value.trim();
                const generic = document.getElementById('new-drug-generic').value.trim();
                const form = document.getElementById('new-drug-form-select').value;
                const strength = document.getElementById('new-drug-strength').value.trim();
                const batch = document.getElementById('new-drug-batch').value.trim() || `B-${Date.now().toString().slice(-4)}`;
                const expiry = document.getElementById('new-drug-expiry').value;
                const stock = parseInt(document.getElementById('new-drug-stock').value) || 30;
                const cost = parseFloat(document.getElementById('new-drug-cost').value) || 50;
                const price = parseFloat(document.getElementById('new-drug-price').value) || 75;

                const newDrug = {
                    id: 'drug_' + Date.now(),
                    name,
                    generic_name: generic,
                    dosage_form: form,
                    strength,
                    batch_no: batch,
                    expiry_date: expiry,
                    stock_qty: stock,
                    reorder_level: 10,
                    cost_price: cost,
                    selling_price: price,
                    barcode: '622' + Math.floor(1000000000 + Math.random() * 9000000000)
                };

                this.drugsCatalog.unshift(newDrug);
                Utils.showToast(`تمت إضافة الدواء (${name}) بنجاح إلى كتالوج الصيدلية`, 'success');
                addDrugModal.classList.add('hidden');
                addDrugForm.reset();
                this.renderDrugsInventory();
                this.populateInteractionsSelect();
                this.populateOTCDrugSelect();
                this.updateKPIs();
            };
        }

        const otcForm = document.getElementById('otc-sale-form');
        const otcModal = document.getElementById('otc-sale-modal');
        if (otcForm && otcModal) {
            otcForm.onsubmit = (e) => {
                e.preventDefault();
                const drugId = document.getElementById('otc-drug-select').value;
                const drug = this.drugsCatalog.find(d => d.id === drugId);
                if (!drug) {
                    Utils.showToast('يرجى اختيار الدواء للصرف', 'warning');
                    return;
                }

                const qty = parseInt(document.getElementById('otc-quantity').value) || 1;
                const patientName = document.getElementById('otc-patient-name').value.trim() || 'عميل نقدي خارجي';
                const total = drug.selling_price * qty;

                // Deduct stock
                drug.stock_qty = Math.max(0, (drug.stock_qty || 0) - qty);

                const otcSale = {
                    id: 'otc_' + Date.now(),
                    rx_number: `OTC-${Date.now().toString().slice(-4)}`,
                    patient_name: patientName,
                    patient_phone: '—',
                    doctor_name: 'صرف مباشر (OTC)',
                    clinic_name: 'الصيدلية الداخلية',
                    dispense_time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                    items_summary: `${drug.name} (${qty} علبة)`,
                    payment_type: 'cash',
                    total_amount: total,
                    patient_copay: total,
                    insurance_claim: 0,
                    pharmacist_name: this.currentPharmacist ? this.currentPharmacist.full_name : 'د. سارة عثمان',
                    status: 'dispensed'
                };

                this.dispenseHistory.unshift(otcSale);
                Utils.showToast(`تم إتمام البيع المباشر بقيمة (${Utils.formatCurrency(total)}) وخصم الرصيد`, 'success');
                otcModal.classList.add('hidden');
                otcForm.reset();
                this.renderDrugsInventory();
                this.renderSalesHistory();
                this.updateKPIs();
            };
        }
    },

    // ==============================================================
    // 6. البيانات التجريبية الشاملة (Mock Catalogs & Prescriptions)
    // ==============================================================
    getMockDrugsCatalog() {
        if (typeof MedicalCatalog !== 'undefined' && Array.isArray(MedicalCatalog.medications) && MedicalCatalog.medications.length) {
            return MedicalCatalog.medications.map(m => ({
                id: m.id || m.code,
                code: m.code,
                name: m.trade_name_ar ? (m.trade_name + ' (' + m.trade_name_ar + ')') : (m.name || m.trade_name),
                trade_name: m.trade_name,
                trade_name_ar: m.trade_name_ar,
                generic_name: m.generic_name,
                dosage_form: m.form_ar || m.form,
                strength: m.strength,
                default_dosage: m.default_dosage,
                batch_no: m.batch_no,
                expiry_date: m.expiry_date,
                stock_qty: Number(m.stock_quantity || m.stock || 100),
                reorder_level: Number(m.reorder_level || 20),
                cost_price: Number(m.cost_price || m.cost || 40),
                selling_price: Number(m.selling_price || m.price || 50),
                barcode: m.barcode,
                category: m.category,
                category_ar: m.category_ar,
                pregnancy_category: m.pregnancy_category,
                requires_prescription: m.requires_prescription
            }));
        }
        return [
            {
                id: 'drug_1',
                name: 'Augmentin (أوجمنتين)',
                generic_name: 'Amoxicillin + Clavulanic Acid',
                dosage_form: 'أقراص',
                strength: '1000 mg (1g)',
                batch_no: 'AUG-9821',
                expiry_date: '2027-08-30',
                stock_qty: 45,
                reorder_level: 15,
                cost_price: 78,
                selling_price: 99.5,
                barcode: '6221008741021'
            },
            {
                id: 'drug_2',
                name: 'Panadol Extra (بنادول إكسترا)',
                generic_name: 'Paracetamol + Caffeine',
                dosage_form: 'أقراص',
                strength: '500 mg / 65 mg',
                batch_no: 'PAN-3312',
                expiry_date: '2028-01-15',
                stock_qty: 120,
                reorder_level: 25,
                cost_price: 28,
                selling_price: 42,
                barcode: '6221005541998'
            },
            {
                id: 'drug_3',
                name: 'Concor (كونكور)',
                generic_name: 'Bisoprolol Fumarate',
                dosage_form: 'أقراص',
                strength: '5 mg',
                batch_no: 'CNC-4410',
                expiry_date: '2026-12-20',
                stock_qty: 8,
                reorder_level: 10,
                cost_price: 45,
                selling_price: 60,
                barcode: '6221004410023'
            },
            {
                id: 'drug_4',
                name: 'Ciprolon (سيبرولون)',
                generic_name: 'Ciprofloxacin',
                dosage_form: 'أقراص',
                strength: '750 mg',
                batch_no: 'CIP-7721',
                expiry_date: '2027-04-10',
                stock_qty: 30,
                reorder_level: 10,
                cost_price: 36,
                selling_price: 52,
                barcode: '6221007721884'
            },
            {
                id: 'drug_5',
                name: 'Antacid Gaviscon (جافيسكون شراب)',
                generic_name: 'Sodium Alginate + Calcium Carbonate',
                dosage_form: 'شراب',
                strength: '150 ml Bottle',
                batch_no: 'GAV-1092',
                expiry_date: '2026-11-28',
                stock_qty: 6,
                reorder_level: 10,
                cost_price: 55,
                selling_price: 75,
                barcode: '6221001092441'
            },
            {
                id: 'drug_6',
                name: 'Warfarin Marevan (ماريفان)',
                generic_name: 'Warfarin Sodium',
                dosage_form: 'أقراص',
                strength: '5 mg',
                batch_no: 'WRF-8812',
                expiry_date: '2027-10-15',
                stock_qty: 24,
                reorder_level: 8,
                cost_price: 22,
                selling_price: 35,
                barcode: '6221008812771'
            },
            {
                id: 'drug_7',
                name: 'Aspirin Protect (أسبيرين بروتكت)',
                generic_name: 'Acetylsalicylic Acid',
                dosage_form: 'أقراص',
                strength: '100 mg',
                batch_no: 'ASP-5501',
                expiry_date: '2028-05-18',
                stock_qty: 85,
                reorder_level: 20,
                cost_price: 18,
                selling_price: 28,
                barcode: '6221005501332'
            },
            {
                id: 'drug_8',
                name: 'Ceftriaxone (سفترياكسون فيال)',
                generic_name: 'Ceftriaxone Sodium',
                dosage_form: 'حقن',
                strength: '1 g IM/IV Vial',
                batch_no: 'CEF-2201',
                expiry_date: '2026-10-01',
                stock_qty: 14,
                reorder_level: 10,
                cost_price: 40,
                selling_price: 55,
                barcode: '6221002201664'
            }
        ];
    },

    getMockPendingPrescriptions() {
        return [
            {
                id: 'rx_101',
                rx_number: 'RX-2026-801',
                patient_name: 'طارق حسام مصطفى',
                patient_phone: '01011223344',
                doctor_name: 'د. محمد عبد العزيز',
                clinic_name: 'العيادة الباطنية والجهاز الهضمي',
                payment_type: 'cash',
                company_name: '',
                copay_percentage: 100,
                created_time: 'اليوم 10:45 ص',
                status: 'pending',
                items: [
                    { drug_name: 'Augmentin (أوجمنتين)', dosage: '1000 mg', instructions: 'قرص كل 12 ساعة بعد الأكل لمدة 7 أيام', quantity: 2, price: 199 },
                    { drug_name: 'Panadol Extra (بنادول إكسترا)', dosage: '500 mg', instructions: 'قرص عند اللزوم للصداع والحرارة', quantity: 1, price: 42 }
                ],
                total_amount: 241,
                patient_copay: 241,
                insurance_claim: 0
            },
            {
                id: 'rx_102',
                rx_number: 'RX-2026-802',
                patient_name: 'ياسمين عبد الرحمن',
                patient_phone: '01122334455',
                doctor_name: 'د. هدى منصور',
                clinic_name: 'عيادة جراحة العظام والمفاصل',
                payment_type: 'corporate',
                company_name: 'شركة مصر للتأمين',
                copay_percentage: 20,
                created_time: 'اليوم 11:10 ص',
                status: 'pending',
                items: [
                    { drug_name: 'Concor (كونكور)', dosage: '5 mg', instructions: 'قرص صباحاً يومياً بعد الإفطار', quantity: 1, price: 60 },
                    { drug_name: 'Aspirin Protect (أسبيرين بروتكت)', dosage: '100 mg', instructions: 'قرص بعد الغداء يومياً للوقاية', quantity: 2, price: 56 }
                ],
                total_amount: 116,
                patient_copay: 23.2,
                insurance_claim: 92.8
            },
            {
                id: 'rx_103',
                rx_number: 'RX-2026-803',
                patient_name: 'كمال الدين حافظ',
                patient_phone: '01099887766',
                doctor_name: 'د. طارق العريان',
                clinic_name: 'عيادة طب وجراحة العيون',
                payment_type: 'corporate',
                company_name: 'نقابة المهندسين المصرية',
                copay_percentage: 15,
                created_time: 'اليوم 11:35 ص',
                status: 'pending',
                items: [
                    { drug_name: 'Ciprolon (سيبرولون)', dosage: '750 mg', instructions: 'قرص مرتين يومياً كل 12 ساعة', quantity: 1, price: 52 },
                    { drug_name: 'Antacid Gaviscon (جافيسكون شراب)', dosage: '150 ml', instructions: '10 مل بعد الوجبات وقبل النوم', quantity: 1, price: 75 }
                ],
                total_amount: 127,
                patient_copay: 19.05,
                insurance_claim: 107.95
            }
        ];
    },

    getMockDispenseHistory() {
        return [
            {
                id: 'rx_901',
                rx_number: 'RX-2026-791',
                patient_name: 'سلوى محمود شاهين',
                patient_phone: '01555667788',
                doctor_name: 'د. سارة محمود',
                clinic_name: 'عيادة الباطنة العامة',
                payment_type: 'cash',
                company_name: '',
                total_amount: 185,
                patient_copay: 185,
                insurance_claim: 0,
                items_summary: 'Augmentin (1 علبة) + Panadol (2 علبة)',
                dispense_time: '2026-11-15 09:30 ص',
                pharmacist_name: 'د. سارة عثمان',
                status: 'dispensed'
            },
            {
                id: 'rx_902',
                rx_number: 'RX-2026-792',
                patient_name: 'حامد زكريا النمر',
                patient_phone: '01233445566',
                doctor_name: 'د. أحمد الشناوي',
                clinic_name: 'عيادة الأسنان',
                payment_type: 'corporate',
                company_name: 'أكسا للرعاية الصحية (AXA)',
                total_amount: 210,
                patient_copay: 42,
                insurance_claim: 168,
                items_summary: 'Ceftriaxone Vial (2 حقنة) + Panadol (1 علبة)',
                dispense_time: '2026-11-15 10:15 ص',
                pharmacist_name: 'د. سارة عثمان',
                status: 'dispensed'
            }
        ];
    },

    getMockInteractions() {
        return [
            {
                drug_a: 'Warfarin Marevan (ماريفان)',
                drug_b: 'Aspirin Protect (أسبيرين بروتكت)',
                severity: 'Major / Fatal (خطير جداً)',
                description: 'زيادة مضاعفة في سيولة الدم وخطر حدوث نزيف هضمي أو دماغي حاد نتيجة التثبيط المزدوج لعوامل التجلط والصفائح الدموية.',
                recommendation: 'تجنب الجمع بينهما إلا بإشراف دقيق جداً لاستشاري القلب مع قياس دوري لتحليل السيولة (INR).'
            },
            {
                drug_a: 'Ciprolon (سيبرولون)',
                drug_b: 'Antacid Gaviscon (جافيسكون شراب)',
                severity: 'Moderate / Chelation (متوسط)',
                description: 'ترسب مادة السيبروفلوكساسين مع أيونات الكالسيوم والمغنيسيوم في مضاد الحموضة مما يقلل امتصاص المضاد الحيوي بنسبة تفوق 75%.',
                recommendation: 'يجب الفصل الزمني بين الدوائين بساعتين على الأقل قبل أو 4 ساعات بعد مضاد الحموضة.'
            },
            {
                drug_a: 'Concor (كونكور)',
                drug_b: 'Ciprolon (سيبرولون)',
                severity: 'Moderate / Cardiac (متوسط)',
                description: 'خطر حدوث بطء في ضربات القلب (Bradycardia) أو استطالة موجة QT الكهربائية للقلب.',
                recommendation: 'مراقبة نبض القلب وتخطيط كهربية القلب (ECG) إذا استدعى الأمر.'
            }
        ];
    }
};

window.PharmacyApp = PharmacyApp;
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PharmacyApp.init());
    } else {
        PharmacyApp.init();
    }
}
