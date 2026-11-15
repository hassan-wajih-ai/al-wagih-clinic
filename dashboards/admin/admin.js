/**
 * منطق لوحة تحكم مدير العيادة الشامل المتطور (Enterprise Clinic Admin Controller)
 * يشمل: نظام Medical CRM متكامل (واتساب طبي، كول سنتر، وخدمة عملاء)،
 * ونظام HR قوي بالبصمة والجزاءات والجدول التشغيلي، المخازن والمشتريات، والتعاقدات
 */

const ClinicAdminApp = {
    currentAdmin: null,
    activeTab: 'crm',
    activeCrmSubTab: 'pipeline',
    crmPatients: [],
    callLogs: [],
    supportTickets: [],
    sentWhatsAppMessages: [],
    activeWhatsAppPatientId: null,
    activeReportsSubTab: 'analytics',
    attendanceLogs: [],
    penalties: [],
    roster: [],
    suppliers: [],
    inventory: [],
    contracts: [],
    employees: [],
    patientVisits: [],
    financialReportData: {},
    procurementOrders: [],
    analyticsStatsData: {},
    labOrders: [],
    radiologyStudies: [],
    labCatalog: [],
    radiologyTemplates: {},
    queueRooms: [],
    waitingTickets: [],
    doctorCommissions: [],
    pharmacyDrugs: [],
    pharmacyPrescriptions: [],
    selectedBranch: 'all',
    branches: [],
    branchTransfers: [],
    medicalPackages: [],
    scanViewerState: { invert: false, highContrast: false },
    revenueChartInstance: null,
    analyticsTrendChartInstance: null,
    analyticsProceduresChartInstance: null,

    async init() {
        const authData = await Auth.protectRoute(['admin', 'superadmin']);
        if (!authData) return;

        this.currentAdmin = authData.profile;
        if (this.currentAdmin) {
            const nameEl = document.getElementById('user-display-name');
            const titleEl = document.getElementById('clinic-title');
            if (nameEl) nameEl.textContent = this.currentAdmin.full_name || 'مدير العيادة';
            if (titleEl) titleEl.textContent = this.currentAdmin.clinics ? this.currentAdmin.clinics.name : 'إدارة العيادة والمستشفى';
        }

        await this.loadAllEnterpriseData();
        this.bindEvents();

        const targetTab = localStorage.getItem('alwagih_admin_target_tab');
        if (targetTab) {
            localStorage.removeItem('alwagih_admin_target_tab');
            this.switchTab(targetTab);
        }

        window.addEventListener('alwagih_language_changed', () => {
            this.renderCRM();
            this.renderCallCenter();
            this.renderHelpDesk();
            this.renderAttendance();
            this.renderPenalties();
            this.renderRoster();
            this.renderSuppliers();
            this.renderInventory();
            this.renderContracts();
            this.renderReportsHub();
            this.renderLabOrders();
            this.renderRadiologyStudies();
            this.renderQueueBoard();
            this.renderDoctorCommissions();
            this.renderAdminPharmacy();
            this.renderAdminSurgerySuite();
            this.renderAdminMultiBranch();
            this.updateKPIs();
        });
    },

    async loadAllEnterpriseData() {
        this.crmPatients = this.getMockCRMPatients();
        this.callLogs = this.getMockCallLogs();
        this.supportTickets = this.getMockSupportTickets();
        this.sentWhatsAppMessages = this.getMockWhatsAppMessages();
        this.attendanceLogs = this.getMockAttendanceLogs();
        this.penalties = this.getMockPenalties();
        this.roster = this.getMockRoster();
        this.suppliers = this.getMockSuppliers();
        this.inventory = this.getMockInventory();
        this.contracts = this.getMockContracts();
        this.employees = this.getMockEmployees();
        this.patientVisits = this.getMockPatientVisits();
        this.financialReportData = this.getMockFinancialReportData();
        this.procurementOrders = this.getMockProcurementOrders();
        this.analyticsStatsData = this.getMockAnalyticsStatsData();
        this.labCatalog = this.getMockLabCatalog();
        this.labOrders = this.getMockLabOrders();
        this.radiologyTemplates = this.getMockRadiologyTemplates();
        this.radiologyStudies = this.getMockRadiologyStudies();
        this.queueRooms = this.getMockQueueRooms();
        this.waitingTickets = this.getMockWaitingTickets();
        this.doctorCommissions = this.getMockDoctorCommissions();
        this.pharmacyDrugs = this.getMockPharmacyDrugs();
        this.pharmacyPrescriptions = this.getMockPharmacyPrescriptions();
        this.daySurgeries = this.getMockDaySurgeries();
        this.dentalProcedures = this.getMockDentalProcedures();
        this.branches = this.getMockBranches();
        this.branchTransfers = this.getMockBranchTransfers();
        this.medicalPackages = this.getMockMedicalPackages();

        this.renderCRM();
        this.renderCallCenter();
        this.renderHelpDesk();
        this.renderWhatsAppHistory();
        this.populateWhatsAppPatients();
        this.renderAttendance();
        this.renderPenalties();
        this.renderRoster();
        this.renderSuppliers();
        this.renderInventory();
        this.renderContracts();
        this.renderReportsHub();
        this.renderLabOrders();
        this.renderRadiologyStudies();
        this.renderQueueBoard();
        this.renderDoctorCommissions();
        this.renderAdminPharmacy();
        this.renderAdminSurgerySuite();
        this.renderAdminMultiBranch();
        this.populateLabCatalogSelect();
        this.populateRadExamSelect();
        this.updateKPIs();
    },

    switchTab(tabId) {
        this.activeTab = tabId;
        const tabs = ['crm', 'hr_biometric', 'procurement', 'contracts', 'inventory', 'reports', 'lab', 'radiology', 'queue', 'commissions', 'pharmacy', 'surgery', 'multibranch'];
        tabs.forEach(t => {
            const el = document.getElementById(`tab-content-${t}`);
            const btn = document.getElementById(`tab-btn-${t}`);
            if (el) el.classList.toggle('hidden', t !== tabId);
            if (btn) {
                if (t === tabId) {
                    btn.className = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-sky-600 text-white shadow-sm transition';
                } else {
                    btn.className = 'px-3.5 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition';
                }
            }
        });
        if (tabId === 'reports') {
            this.switchReportsSubTab(this.activeReportsSubTab || 'analytics');
        } else if (tabId === 'lab') {
            this.renderLabOrders();
        } else if (tabId === 'radiology') {
            this.renderRadiologyStudies();
        } else if (tabId === 'queue') {
            this.renderQueueBoard();
        } else if (tabId === 'commissions') {
            this.renderDoctorCommissions();
        } else if (tabId === 'pharmacy') {
            this.renderAdminPharmacy();
        } else if (tabId === 'surgery') {
            this.renderAdminSurgerySuite();
        } else if (tabId === 'multibranch') {
            this.renderAdminMultiBranch();
        }
    },

    switchCrmSubTab(subTabId) {
        this.activeCrmSubTab = subTabId;
        const subviews = ['pipeline', 'whatsapp', 'callcenter', 'helpdesk'];
        subviews.forEach(s => {
            const el = document.getElementById(`crm-subview-${s}`);
            const btn = document.getElementById(`crm-sub-btn-${s}`);
            if (el) el.classList.toggle('hidden', s !== subTabId);
            if (btn) {
                if (s === subTabId) {
                    btn.className = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-sky-600 text-white shadow-sm transition';
                } else {
                    btn.className = 'px-3.5 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 transition';
                }
            }
        });
    },

    // 1. نظام CRM متكامل للمرضى
    renderCRM() {
        const tbody = document.getElementById('crm-table-body');
        if (!tbody) return;

        const stageBadges = {
            new: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">استفسار جديد</span>',
            contacted: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">تم التواصل</span>',
            booked: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">حجز موعد</span>',
            visited: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">تم الكشف</span>',
            follow_up: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">متابعة دورية</span>'
        };

        const tierBadges = {
            regular: '<span class="text-slate-500 font-semibold">عادي</span>',
            vip: '<span class="text-amber-600 font-bold">⭐ VIP</span>',
            chronic: '<span class="text-rose-600 font-bold">🩺 مزمن</span>',
            corporate: '<span class="text-purple-600 font-bold">🏢 تعاقد</span>'
        };

        tbody.innerHTML = this.crmPatients.map(p => `
            <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                <td class="py-3 px-4 font-bold text-slate-900">${p.full_name}</td>
                <td class="py-3 px-4 font-mono text-slate-600">${p.phone}</td>
                <td class="py-3 px-4 text-slate-700">${p.lead_source}</td>
                <td class="py-3 px-4">${tierBadges[p.patient_tier] || p.patient_tier}</td>
                <td class="py-3 px-4">${stageBadges[p.stage] || p.stage}</td>
                <td class="py-3 px-4 font-mono text-slate-500">${p.next_follow_up || '—'}</td>
                <td class="py-3 px-4 text-slate-500">${p.notes || '—'}</td>
                <td class="py-3 px-4 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                        <button onclick="ClinicAdminApp.openWhatsAppModal('${p.id}')" title="مراسلة عبر واتساب" class="px-2 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition flex items-center gap-1">
                            <span>💬 واتساب</span>
                        </button>
                        <button onclick="ClinicAdminApp.openCallModal('${p.id}')" title="تسجيل مكالمة كول سنتر" class="px-2 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition flex items-center gap-1">
                            <span>📞 اتصال</span>
                        </button>
                        <button onclick="ClinicAdminApp.openTicketModal('${p.id}')" title="تذكرة شكوى أو دعم" class="px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition flex items-center gap-1">
                            <span>🎧 تذكرة</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    // 2. كول سنتر ومركز الاتصالات (Call Center)
    renderCallCenter() {
        const tbody = document.getElementById('callcenter-table-body');
        if (!tbody) return;

        const outcomeBadges = {
            booked: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">✓ حجز موعد كشف</span>',
            confirmed: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">تأكيد حجز قائم</span>',
            callback: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">⏳ طلب معاودة لاحقاً</span>',
            no_answer: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">لم يرد / مغلق</span>',
            busy: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">الرقم مشغول</span>',
            inquiry: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">استفسار خدمات وأسعار</span>',
            cancelled: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">إلغاء حجز</span>'
        };

        tbody.innerHTML = this.callLogs.map(c => `
            <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                <td class="py-3 px-4 font-bold text-slate-900">${c.patient_name}</td>
                <td class="py-3 px-4 font-mono text-slate-600">${c.phone}</td>
                <td class="py-3 px-4 font-semibold text-slate-700">${c.call_type === 'inbound' ? '📥 واردة' : '📤 صادرة'}</td>
                <td class="py-3 px-4">${outcomeBadges[c.outcome] || c.outcome}</td>
                <td class="py-3 px-4 font-mono text-slate-600">${c.duration || '01:30'}</td>
                <td class="py-3 px-4 text-slate-700">${c.agent}</td>
                <td class="py-3 px-4 font-mono text-slate-500">${c.timestamp}</td>
                <td class="py-3 px-4 text-slate-600">${c.notes || '—'}</td>
            </tr>
        `).join('');
    },

    // 3. خدمة العملاء والشكاوى (Customer Service & Help Desk)
    renderHelpDesk() {
        const tbody = document.getElementById('helpdesk-table-body');
        if (!tbody) return;

        const priorityBadges = {
            urgent: '<span class="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">🔴 عاجل جداً</span>',
            medium: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">🟡 متوسط</span>',
            normal: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">🟢 عادي</span>'
        };

        const statusBadges = {
            open: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">مفتوحة</span>',
            in_progress: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">قيد المتابعة</span>',
            resolved: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">✓ تم الحل والرضا</span>'
        };

        tbody.innerHTML = this.supportTickets.map(t => `
            <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                <td class="py-3 px-4 font-mono font-bold text-slate-800">#${t.id}</td>
                <td class="py-3 px-4">
                    <div class="font-bold text-slate-900">${t.patient_name}</div>
                    <div class="text-[11px] font-mono text-slate-500">${t.phone}</div>
                </td>
                <td class="py-3 px-4 font-semibold text-slate-700">${t.category}</td>
                <td class="py-3 px-4">${priorityBadges[t.priority] || t.priority}</td>
                <td class="py-3 px-4">${statusBadges[t.status] || t.status}</td>
                <td class="py-3 px-4 font-mono text-slate-500">${t.created_at}</td>
                <td class="py-3 px-4 text-slate-700">${t.issue}</td>
                <td class="py-3 px-4 text-slate-600 font-medium">${t.resolution || 'قيد بحث الشكوى'}</td>
                <td class="py-3 px-4 text-center">
                    ${t.status !== 'resolved' ? `
                        <button onclick="ClinicAdminApp.resolveTicket('${t.id}')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition">
                            ✓ حل الشكوى
                        </button>
                    ` : '<span class="text-emerald-700 font-bold text-xs">⭐⭐⭐⭐⭐ ممتاز</span>'}
                </td>
            </tr>
        `).join('');
    },

    resolveTicket(ticketId) {
        const t = this.supportTickets.find(item => item.id === ticketId);
        if (t) {
            t.status = 'resolved';
            t.resolution = 'تم التواصل مع المريض وتقديم حل مرضي والتأكد من رضاه التام';
            t.csat = 5;
            Utils.showToast(`تم حل التذكرة #${ticketId} بنجاح وتسجيل رضا العميل`, 'success');
            this.renderHelpDesk();
            this.updateKPIs();
        }
    },

    // 4. استوديو واتساب الطبي المباشر (WhatsApp Messenger Studio)
    populateWhatsAppPatients() {
        const select = document.getElementById('wa-patient-select');
        if (!select) return;

        select.innerHTML = '<option value="">-- اختر مريضاً من القائمة --</option>' +
            this.crmPatients.map(p => `
                <option value="${p.id}" data-phone="${p.phone}" data-name="${p.full_name}">${p.full_name} (${p.phone})</option>
            `).join('');
    },

    onWhatsAppPatientChange() {
        const select = document.getElementById('wa-patient-select');
        if (!select || !select.value) return;

        const opt = select.options[select.selectedIndex];
        const phone = opt.getAttribute('data-phone') || '';
        const phoneInput = document.getElementById('wa-phone-input');
        if (phoneInput) phoneInput.value = phone;

        this.applyWhatsAppTemplate('reminder');
    },

    applyWhatsAppTemplate(templateKey) {
        const select = document.getElementById('wa-patient-select');
        let patientName = 'عزيزي المريض';
        if (select && select.selectedIndex > 0) {
            patientName = select.options[select.selectedIndex].getAttribute('data-name') || patientName;
        }

        const msgInput = document.getElementById('wa-message-input');
        if (!msgInput) return;

        msgInput.value = this.getTemplateText(templateKey, patientName);
        this.updateWhatsAppPreview();
    },

    getTemplateText(key, name) {
        switch (key) {
            case 'reminder':
                return `مرحباً بك أستاذ/ة ${name} في عيادات الشفاء التخصصية 🏥\nنود تذكير سيادتكم بموعد الكشف الطبي القادم غداً الساعة 11:00 ص.\n🩺 الطبيب المعالج: د. أحمد الشناوي (استشاري باطنة وجهاز هضمي)\n📍 العنوان: فرع المعادي الرئيسي - شارع النصر\nلتأكيد الحضور نرجو الرد بكلمة (تأكيد) أو (تعديل). نتمنى لكم دوام الصحة!`;
            case 'instructions':
                return `عزيزي المريض ${name} 🩺\nحرصاً على دقة نتائج الفحوصات والتحاليل الطبية المقررة لسيادتكم:\n1- يرجى الصيام لمدة 8 ساعات قبل الموعد.\n2- شرب الماء مسموح.\n3- يرجى إحضار أي تحاليل أو أشعات سابقة.\nفريق عيادات الشفاء في خدمتكم دائماً.`;
            case 'followup':
                return `أهلاً بك أستاذ/ة ${name} 🌸\nفريق المتابعة والاطمئنان بعيادات الشفاء يتمنى لكم السلامة ويسأل عن صحتكم بعد زيارتكم الأخيرة.\nهل بدأتم في تناول العلاج الموصوف؟ وإذا كان لديكم أي استفسار دوائي يسعدنا التواصل معكم والرد فوراً.`;
            case 'copay':
                return `مرحباً أستاذ/ة ${name} 🏢\nنود إعلامكم باعتماد خطاب التغطية الطبية التابع لشركة التأمين / التعاقد بنسبة خصم معتمدة ونسبة تحمل المريض (Co-Pay).\nيرجى إبراز بطاقة التأمين عند شباك الاستقبال. دمتم بصحة وعافية!`;
            default:
                return `مرحباً أستاذ/ة ${name}، نتواصل معكم من عيادات الشفاء التخصصية بخصوص متابعتكم الطبية.`;
        }
    },

    updateWhatsAppPreview() {
        const text = document.getElementById('wa-message-input').value;
        const previewEl = document.getElementById('wa-preview-text');
        if (previewEl) {
            previewEl.textContent = text || 'معاينة نص الرسالة...';
        }
    },

    sendWhatsAppDirect() {
        const phoneInput = document.getElementById('wa-phone-input');
        const textInput = document.getElementById('wa-message-input');
        if (!phoneInput || !textInput) return;

        const phone = phoneInput.value.trim();
        const text = textInput.value.trim();

        if (!phone || !text) {
            Utils.showToast('يرجى التأكد من كتابة رقم الهاتف ونص الرسالة', 'warning');
            return;
        }

        const cleanPhone = this.formatWhatsAppPhone(phone);
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');

        this.sentWhatsAppMessages.unshift({
            phone,
            text,
            timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
            status: 'تم الإرسال عبر WhatsApp'
        });

        Utils.showToast(`تم فتح تطبيق واتساب ومراسلة الرقم: ${phone}`, 'success');
        this.renderWhatsAppHistory();
        this.updateKPIs();
    },

    copyWhatsAppText() {
        const text = document.getElementById('wa-message-input').value;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            Utils.showToast('تم نسخ نص الرسالة إلى الحافظة بنجاح', 'success');
        }
    },

    renderWhatsAppHistory() {
        const container = document.getElementById('wa-history-list');
        if (!container) return;

        if (this.sentWhatsAppMessages.length === 0) {
            container.innerHTML = '<div class="text-xs text-slate-400 py-2">لا توجد رسائل واتساب مرسلة حديثاً.</div>';
            return;
        }

        container.innerHTML = this.sentWhatsAppMessages.slice(0, 5).map(m => `
            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                    <span class="text-emerald-600 font-bold">💬</span>
                    <span class="font-mono font-bold text-slate-800">${m.phone}</span>
                    <span class="text-slate-500 truncate max-w-xs sm:max-w-md">${m.text.slice(0, 60)}...</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="font-mono text-[10px] text-slate-400">${m.timestamp}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">${m.status}</span>
                </div>
            </div>
        `).join('');
    },

    formatWhatsAppPhone(phone) {
        let clean = phone.replace(/[^\d]/g, '');
        if (clean.startsWith('01')) clean = '20' + clean.slice(1);
        else if (clean.startsWith('1')) clean = '20' + clean;
        return clean;
    },

    // أزرار المودال السريع لمراسلة المريض بالواتساب
    openWhatsAppModal(patientId) {
        const p = this.crmPatients.find(item => item.id === patientId);
        if (!p) return;

        this.activeWhatsAppPatientId = patientId;
        document.getElementById('modal-wa-patient-name').textContent = p.full_name;
        document.getElementById('modal-wa-patient-phone').textContent = p.phone;

        this.setModalWhatsAppTemplate('reminder');
        document.getElementById('whatsapp-modal').classList.remove('hidden');
    },

    setModalWhatsAppTemplate(templateKey) {
        const p = this.crmPatients.find(item => item.id === this.activeWhatsAppPatientId);
        const name = p ? p.full_name : 'عزيزي المريض';
        const msgText = this.getTemplateText(templateKey, name);
        document.getElementById('modal-wa-message-text').value = msgText;
    },

    sendModalWhatsApp() {
        const p = this.crmPatients.find(item => item.id === this.activeWhatsAppPatientId);
        if (!p) return;

        const text = document.getElementById('modal-wa-message-text').value.trim();
        const cleanPhone = this.formatWhatsAppPhone(p.phone);
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');

        this.sentWhatsAppMessages.unshift({
            phone: p.phone,
            text,
            timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
            status: 'تم الإرسال عبر WhatsApp'
        });

        Utils.showToast(`تم فتح محادثة واتساب مع المريض: ${p.full_name}`, 'success');
        document.getElementById('whatsapp-modal').classList.add('hidden');
        this.renderWhatsAppHistory();
        this.updateKPIs();
    },

    openCallModal(patientId) {
        const p = this.crmPatients.find(item => item.id === patientId);
        if (p) {
            document.getElementById('call-patient-name').value = p.full_name;
            document.getElementById('call-patient-phone').value = p.phone;
        }
        document.getElementById('callcenter-modal').classList.remove('hidden');
    },

    openTicketModal(patientId) {
        const p = this.crmPatients.find(item => item.id === patientId);
        if (p) {
            document.getElementById('ticket-patient-name').value = p.full_name;
            document.getElementById('ticket-patient-phone').value = p.phone;
        }
        document.getElementById('ticket-modal').classList.remove('hidden');
    },

    // 5. نظام HR: البصمة والجزاءات والجدول التشغيلي
    renderAttendance() {
        const tbody = document.getElementById('attendance-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.attendanceLogs.map(log => `
            <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                <td class="py-3 px-4 font-bold text-slate-900">${log.employee_name}</td>
                <td class="py-3 px-4 font-mono">${log.fingerprint_id}</td>
                <td class="py-3 px-4 font-mono text-emerald-700 font-bold">${log.check_in}</td>
                <td class="py-3 px-4 font-mono text-slate-700">${log.check_out || '—'}</td>
                <td class="py-3 px-4 font-mono ${log.late_minutes > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}">
                    ${log.late_minutes > 0 ? `${log.late_minutes} دقيقة تأخير` : 'منتظم'}
                </td>
                <td class="py-3 px-4 font-mono text-emerald-600">${log.overtime_minutes > 0 ? `+${log.overtime_minutes} دقيقة` : '—'}</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${log.status === 'present' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                        ${log.status === 'present' ? 'حاضر (بصمة)' : 'متأخر'}
                    </span>
                </td>
            </tr>
        `).join('');
    },

    renderPenalties() {
        const tbody = document.getElementById('penalties-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.penalties.map(p => `
            <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                <td class="py-2.5 px-4 font-bold text-slate-900">${p.employee_name}</td>
                <td class="py-2.5 px-4 text-slate-600">${p.date}</td>
                <td class="py-2.5 px-4 font-bold text-rose-600">${p.penalty_type === 'days' ? `خصم ${p.days} يوم` : `خصم ${Utils.formatCurrency(p.amount)}`}</td>
                <td class="py-2.5 px-4 text-slate-700">${p.reason}</td>
                <td class="py-2.5 px-4 text-slate-500">${p.issued_by}</td>
                <td class="py-2.5 px-4 text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">معتمد ومخصوم</span>
                </td>
            </tr>
        `).join('');
    },

    renderRoster() {
        const tbody = document.getElementById('roster-table-body');
        if (!tbody) return;

        const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        tbody.innerHTML = this.roster.map(r => `
            <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                <td class="py-2.5 px-4 font-bold text-slate-900">${r.employee_name}</td>
                <td class="py-2.5 px-4 text-slate-600">${r.job_title}</td>
                <td class="py-2.5 px-4 font-semibold text-sky-800">${days[r.day_of_week] || '—'}</td>
                <td class="py-2.5 px-4">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">${r.shift_name}</span>
                </td>
                <td class="py-2.5 px-4 font-mono text-slate-700">${r.hours}</td>
            </tr>
        `).join('');
    },

    // 6. نظام المشتريات والموردين
    renderSuppliers() {
        const tbody = document.getElementById('suppliers-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.suppliers.map(s => `
            <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                <td class="py-3 px-4 font-bold text-slate-900">${s.name}</td>
                <td class="py-3 px-4 text-slate-600">${s.contact_name}</td>
                <td class="py-3 px-4 font-mono text-slate-600">${s.phone}</td>
                <td class="py-3 px-4 font-mono text-slate-700">${s.last_order_date || '—'}</td>
                <td class="py-3 px-4 font-mono font-bold text-rose-700">${Utils.formatCurrency(s.balance_due)}</td>
                <td class="py-3 px-4 text-center">
                    <button onclick="Utils.showToast('تم فتح أمر شراء جديد للمورد', 'info')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                        + أمر شراء
                    </button>
                </td>
            </tr>
        `).join('');
    },

    // 7. جرد المخزن المتقدم مع رقم التشغيلة
    renderInventory() {
        const tbody = document.getElementById('inventory-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.inventory.map(item => {
            const isLow = item.quantity <= item.min_threshold;
            return `
                <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                    <td class="py-3 px-4 font-bold text-slate-900">${item.name}</td>
                    <td class="py-3 px-4 text-slate-600">${item.category}</td>
                    <td class="py-3 px-4 font-mono text-slate-500">${item.batch_number || 'BATCH-2026-A'}</td>
                    <td class="py-3 px-4 font-mono font-bold text-slate-800">${item.quantity} ${item.unit}</td>
                    <td class="py-3 px-4">
                        ${isLow ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 animate-pulse">⚠️ رصيد حرج</span>' : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">متوفر</span>'}
                    </td>
                    <td class="py-3 px-4 font-mono text-slate-600">${item.expiry_date}</td>
                    <td class="py-3 px-4 text-center">
                        <button onclick="ClinicAdminApp.adjustStock('${item.id}', 10)" class="px-2 py-1 text-[10px] font-bold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200">
                            + توريد 10
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    adjustStock(itemId, qty) {
        const item = this.inventory.find(i => i.id === itemId);
        if (item) {
            item.quantity += qty;
            Utils.showToast(`تم توريد ${qty} إلى رصيد: ${item.name}`, 'success');
            this.renderInventory();
        }
    },

    // 8. التعاقدات ونسبة الخصم وتحمل المريض Co-Pay
    renderContracts() {
        const tbody = document.getElementById('contracts-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.contracts.map(c => `
            <tr class="hover:bg-slate-50 border-b border-slate-100 text-xs">
                <td class="py-3 px-4 font-bold text-slate-900">${c.name}</td>
                <td class="py-3 px-4 font-extrabold text-purple-700 font-mono">${c.discount_percentage}% خصم</td>
                <td class="py-3 px-4 font-extrabold text-emerald-700 font-mono">${c.patient_copay_percentage}% تحمل المريض</td>
                <td class="py-3 px-4 font-mono text-slate-600">${Utils.formatCurrency(c.max_coverage || 5000)}</td>
                <td class="py-3 px-4 text-slate-600">${c.contact_person} (${c.phone})</td>
                <td class="py-3 px-4 text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">تعاقد نشط</span>
                </td>
            </tr>
        `).join('');
    },

    updateKPIs() {
        const kpiCrm = document.getElementById('kpi-crm-leads');
        const kpiAtt = document.getElementById('kpi-attendance-today');
        const kpiSup = document.getElementById('kpi-suppliers-balance');
        const kpiCon = document.getElementById('kpi-contracts-count');

        if (kpiCrm) kpiCrm.textContent = `${this.crmPatients.length} مرضى`;
        if (kpiAtt) kpiAtt.textContent = `${this.attendanceLogs.length} حاضرين بالبصمة`;
        if (kpiSup) kpiSup.textContent = Utils.formatCurrency(48500);
        if (kpiCon) kpiCon.textContent = `${this.contracts.length} شركات`;

        // Mini CRM KPIs
        const crmTotal = document.getElementById('crm-kpi-total');
        const crmWa = document.getElementById('crm-kpi-wa-count');
        const crmCalls = document.getElementById('crm-kpi-calls-count');
        const crmTickets = document.getElementById('crm-kpi-tickets-count');

        if (crmTotal) crmTotal.textContent = `${this.crmPatients.length} مرضى`;
        if (crmWa) crmWa.textContent = `${this.sentWhatsAppMessages.length} رسالة`;
        if (crmCalls) crmCalls.textContent = `${this.callLogs.length} مكالمة`;
        if (crmTickets) crmTickets.textContent = `⭐⭐⭐⭐⭐ 4.9`;

        // LIS Lab KPIs
        const labTotal = document.getElementById('lab-kpi-total');
        const labPending = document.getElementById('lab-kpi-pending');
        const labCompleted = document.getElementById('lab-kpi-completed');
        const labCritical = document.getElementById('lab-kpi-critical');
        const labCount = document.getElementById('lab-table-count');

        if (labTotal) labTotal.textContent = `${this.labOrders.length} عينة`;
        if (labPending) labPending.textContent = `${this.labOrders.filter(o => o.status === 'pending' || o.status === 'in_progress').length} قيد التحليل`;
        if (labCompleted) labCompleted.textContent = `${this.labOrders.filter(o => o.status === 'verified').length} معتمدة`;
        if (labCritical) labCritical.textContent = `${this.labOrders.filter(o => o.flag === 'panic').length} حرجة`;
        if (labCount) labCount.textContent = `${this.labOrders.length} عينة`;

        // RIS Radiology KPIs
        const radTotal = document.getElementById('rad-kpi-total');
        const radPending = document.getElementById('rad-kpi-pending');
        const radCompleted = document.getElementById('rad-kpi-completed');
        const radModalities = document.getElementById('rad-kpi-modalities');
        const radCount = document.getElementById('rad-table-count');

        if (radTotal) radTotal.textContent = `${this.radiologyStudies.length} دراسة`;
        if (radPending) radPending.textContent = `${this.radiologyStudies.filter(s => s.status !== 'signed').length} بانتظار التقرير`;
        if (radCompleted) radCompleted.textContent = `${this.radiologyStudies.filter(s => s.status === 'signed').length} معتمدة وموقعة`;
        if (radModalities) radModalities.textContent = `4 أجهزة نشطة`;
        if (radCount) radCount.textContent = `${this.radiologyStudies.length} فحص`;

        // Smart Waiting Queue KPIs
        const queueTotal = document.getElementById('queue-kpi-total');
        const queueCompleted = document.getElementById('queue-kpi-completed');
        const queueWaiting = document.getElementById('queue-kpi-waiting');
        const queueAvgWait = document.getElementById('queue-kpi-avg-wait');
        const queueBadge = document.getElementById('admin-waiting-badge');

        const waitingCount = (this.waitingTickets || []).filter(t => t.status === 'waiting').length;
        if (queueTotal) queueTotal.textContent = `${(this.waitingTickets || []).length + 18}`;
        if (queueCompleted) queueCompleted.textContent = `18`;
        if (queueWaiting) queueWaiting.textContent = `${waitingCount}`;
        if (queueAvgWait) queueAvgWait.textContent = `12 دقيقة`;
        if (queueBadge) queueBadge.textContent = `${waitingCount} تذاكر`;

        // Doctor Commissions KPIs
        const commGross = document.getElementById('comm-kpi-gross');
        const commClinic = document.getElementById('comm-kpi-clinic-share');
        const commNet = document.getElementById('comm-kpi-net-payout');
        const commPaid = document.getElementById('comm-kpi-paid');
        const commCount = document.getElementById('comm-table-count');

        const docs = this.doctorCommissions || [];
        const grossSum = docs.reduce((acc, d) => acc + (Number(d.gross_revenue) || 0), 0);
        const clinicSum = docs.reduce((acc, d) => acc + (Number(d.clinic_share) || 0), 0);
        const netPendingSum = docs.filter(d => d.status !== 'paid').reduce((acc, d) => acc + (Number(d.net_payable) || 0), 0);
        const paidSum = docs.filter(d => d.status === 'paid').reduce((acc, d) => acc + (Number(d.net_payable) || 0), 0);

        if (commGross) commGross.textContent = Utils.formatCurrency(grossSum);
        if (commClinic) commClinic.textContent = Utils.formatCurrency(clinicSum);
        if (commNet) commNet.textContent = Utils.formatCurrency(netPendingSum);
        if (commPaid) commPaid.textContent = Utils.formatCurrency(paidSum);
        if (commCount) commCount.textContent = `${docs.length} أطباء`;

        // Pharmacy KPIs
        const pharmSales = document.getElementById('admin-pharm-kpi-sales');
        const pharmDisp = document.getElementById('admin-pharm-kpi-dispensed');
        const pharmPend = document.getElementById('admin-pharm-kpi-pending');
        const pharmAlerts = document.getElementById('admin-pharm-kpi-alerts');
        const pharmDrugsCount = document.getElementById('admin-pharm-drugs-count');
        const pharmRxCount = document.getElementById('admin-pharm-rx-count');

        const drugs = this.pharmacyDrugs || [];
        const rxs = this.pharmacyPrescriptions || [];
        const totalSales = rxs.filter(r => r.status === 'dispensed').reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0);
        const dispensedCount = rxs.filter(r => r.status === 'dispensed').length;
        const pendingRxCount = rxs.filter(r => r.status === 'pending').length;
        const lowStockCount = drugs.filter(d => (d.stock_qty || 0) <= (d.reorder_level || 10)).length;
        const expiryAlerts = drugs.filter(d => d.expiry_status === 'expired' || d.expiry_status === 'expiring_soon').length;

        if (pharmSales) pharmSales.textContent = Utils.formatCurrency(totalSales);
        if (pharmDisp) pharmDisp.textContent = `${dispensedCount}`;
        if (pharmPend) pharmPend.textContent = `${pendingRxCount}`;
        if (pharmAlerts) pharmAlerts.textContent = `${lowStockCount + expiryAlerts}`;
        if (pharmDrugsCount) pharmDrugsCount.textContent = `${drugs.length} صنف`;
        if (pharmRxCount) pharmRxCount.textContent = `${rxs.length} روشتة`;

        // Day Surgery & Dental KPIs
        const surgTotalEl = document.getElementById('admin-surgery-kpi-total');
        const surgOccupancyEl = document.getElementById('admin-surgery-kpi-occupancy');
        const dentalCountEl = document.getElementById('admin-dental-kpi-count');
        const surgRevenueEl = document.getElementById('admin-surgery-kpi-revenue');
        const surgTableCount = document.getElementById('admin-surgery-count');
        const dentalTableCount = document.getElementById('admin-dental-count');

        const surgList = this.daySurgeries || [];
        const dentalList = this.dentalProcedures || [];

        let surgRev = 0;
        surgList.forEach(s => surgRev += (Number(s.total_cost) || 0));
        dentalList.forEach(d => surgRev += (Number(d.cost) || 0));

        if (surgTotalEl) surgTotalEl.textContent = `${surgList.length} عملية`;
        if (surgOccupancyEl) surgOccupancyEl.textContent = `${Math.min(100, Math.round((surgList.length / 4) * 100))}%`;
        if (dentalCountEl) dentalCountEl.textContent = `${dentalList.length} سن`;
        if (surgRevenueEl) surgRevenueEl.textContent = Utils.formatCurrency(surgRev || 28500);
        if (surgTableCount) surgTableCount.textContent = `${surgList.length} عملية`;
        if (dentalTableCount) dentalTableCount.textContent = `${dentalList.length} إجراء`;
    },

    // ==========================================
    // دوال تصدير شيتات Excel لجميع الأنظمة
    // ==========================================
    exportCRMExcel() {
        if (window.Reports) {
            Reports.exportCRMToExcel(this.crmPatients);
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    exportCallCenterExcel() {
        if (window.Reports) {
            Reports.exportCallCenterToExcel(this.callLogs);
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    exportHelpDeskExcel() {
        if (window.Reports) {
            Reports.exportHelpDeskToExcel(this.supportTickets);
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    exportAttendanceExcel() {
        if (window.Reports) {
            Reports.exportAttendanceToExcel(this.attendanceLogs);
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    exportPenaltiesExcel() {
        if (window.Reports) {
            Reports.exportPenaltiesToExcel(this.penalties);
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    exportRosterExcel() {
        if (window.Reports) {
            Reports.exportRosterToExcel(this.roster);
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    exportSuppliersExcel() {
        if (window.Reports) {
            Reports.exportSuppliersToExcel(this.suppliers);
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    exportInventoryExcel() {
        if (window.Reports) {
            Reports.exportInventoryToExcel(this.inventory);
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    exportContractsExcel() {
        if (window.Reports) {
            Reports.exportContractsToExcel(this.contracts);
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    exportPayrollExcel() {
        if (window.Reports) {
            Reports.exportPayrollToExcel(this.employees, 'نوفمبر_2026');
        } else {
            Utils.showToast('جاري تهيئة محرك التصدير...', 'info');
        }
    },

    bindEvents() {
        // إضافة مريض جديد في الـ CRM
        const crmForm = document.getElementById('add-crm-form');
        const crmModal = document.getElementById('add-crm-modal');
        if (crmForm && crmModal) {
            crmForm.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('crm-name-input').value.trim();
                const phone = document.getElementById('crm-phone-input').value.trim();
                const source = document.getElementById('crm-source-input').value;
                const tier = document.getElementById('crm-tier-input').value;
                const notes = document.getElementById('crm-notes-input').value.trim();

                this.crmPatients.unshift({
                    id: 'crm_' + Date.now(),
                    full_name: name,
                    phone,
                    lead_source: source,
                    patient_tier: tier,
                    stage: 'new',
                    notes
                });

                Utils.showToast(`تم تسجيل المريض ${name} بنجاح في نظام الـ CRM ومتابعة الرحلة`, 'success');
                crmModal.classList.add('hidden');
                crmForm.reset();
                this.renderCRM();
                this.populateWhatsAppPatients();
                this.updateKPIs();
            };
        }

        // تسجيل مكالمة كول سنتر جديدة
        const callForm = document.getElementById('callcenter-form');
        const callModal = document.getElementById('callcenter-modal');
        if (callForm && callModal) {
            callForm.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('call-patient-name').value.trim();
                const phone = document.getElementById('call-patient-phone').value.trim();
                const callType = document.getElementById('call-type-select').value;
                const outcome = document.getElementById('call-outcome-select').value;
                const duration = document.getElementById('call-duration-input').value.trim();
                const agent = document.getElementById('call-agent-input').value.trim();
                const notes = document.getElementById('call-notes-input').value.trim();

                this.callLogs.unshift({
                    id: 'call_' + Date.now(),
                    patient_name: name,
                    phone,
                    call_type: callType,
                    outcome,
                    duration,
                    agent,
                    timestamp: new Date().toLocaleString('ar-EG'),
                    notes
                });

                // إذا كانت النتيجة حجز موعد، يتم تحديث مرحلة المريض في الـ CRM تلقائياً
                const p = this.crmPatients.find(item => item.phone === phone || item.full_name === name);
                if (p && outcome === 'booked') {
                    p.stage = 'booked';
                    this.renderCRM();
                }

                Utils.showToast(`تم توثيق المكالمة مع المريض ${name} في سجل الكول سنتر`, 'success');
                callModal.classList.add('hidden');
                callForm.reset();
                this.renderCallCenter();
                this.updateKPIs();
            };
        }

        // فتح تذكرة خدمة عملاء جديدة
        const ticketForm = document.getElementById('ticket-form');
        const ticketModal = document.getElementById('ticket-modal');
        if (ticketForm && ticketModal) {
            ticketForm.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('ticket-patient-name').value.trim();
                const phone = document.getElementById('ticket-patient-phone').value.trim();
                const category = document.getElementById('ticket-category-select').value;
                const priority = document.getElementById('ticket-priority-select').value;
                const issue = document.getElementById('ticket-issue-input').value.trim();

                const newId = 'TICK-' + Math.floor(100 + Math.random() * 900);
                this.supportTickets.unshift({
                    id: newId,
                    patient_name: name,
                    phone,
                    category,
                    priority,
                    status: 'open',
                    agent: this.currentAdmin ? this.currentAdmin.full_name : 'فريق خدمة العملاء',
                    created_at: new Date().toLocaleString('ar-EG'),
                    issue,
                    resolution: '',
                    csat: 0
                });

                Utils.showToast(`تم فتح تذكرة خدمة العملاء #${newId} وتعيينها للمتابعة`, 'success');
                ticketModal.classList.add('hidden');
                ticketForm.reset();
                this.renderHelpDesk();
                this.updateKPIs();
            };
        }

        // إضافة جزاء مباشر من المدير
        const penaltyForm = document.getElementById('add-penalty-form');
        const penaltyModal = document.getElementById('add-penalty-modal');
        if (penaltyForm && penaltyModal) {
            penaltyForm.onsubmit = (e) => {
                e.preventDefault();
                const empName = document.getElementById('penalty-emp-select').value;
                const type = document.getElementById('penalty-type-select').value;
                const days = document.getElementById('penalty-days-input').value || 1;
                const amount = document.getElementById('penalty-amount-input').value || 100;
                const reason = document.getElementById('penalty-reason-input').value.trim();

                this.penalties.unshift({
                    id: 'pen_' + Date.now(),
                    employee_name: empName,
                    date: new Date().toISOString().split('T')[0],
                    penalty_type: type,
                    days: parseFloat(days),
                    amount: parseFloat(amount),
                    reason,
                    issued_by: this.currentAdmin ? this.currentAdmin.full_name : 'المدير المباشر'
                });

                Utils.showToast(`تم اعتماد الجزاء للموظف ${empName} وترحيله لخصومات الرواتب`, 'success');
                penaltyModal.classList.add('hidden');
                penaltyForm.reset();
                this.renderPenalties();
            };
        }

        // ==========================================
        // نماذج وأحداث المعمل (LIS Forms)
        // ==========================================
        const labOrderForm = document.getElementById('lab-order-form');
        const labOrderModal = document.getElementById('lab-order-modal');
        if (labOrderForm && labOrderModal) {
            labOrderForm.onsubmit = (e) => {
                e.preventDefault();
                const patientName = document.getElementById('lab-order-patient-name').value.trim();
                const patientPhone = document.getElementById('lab-order-patient-phone').value.trim();
                const patientAge = document.getElementById('lab-order-patient-age').value || 30;
                const patientGender = document.getElementById('lab-order-patient-gender').value;
                const testKey = document.getElementById('lab-order-test-select').value;
                const tubeType = document.getElementById('lab-order-tube-type').value;
                const doctorName = document.getElementById('lab-order-doctor-input').value.trim();
                const paymentType = document.getElementById('lab-order-payment-type').value;
                const cost = parseFloat(document.getElementById('lab-order-cost-input').value) || 250;
                const contractSelect = document.getElementById('lab-order-contract-select');
                const contractName = contractSelect && contractSelect.value ? contractSelect.options[contractSelect.selectedIndex].text : 'تأمين طبي';

                const catalogItem = this.labCatalog.find(c => c.key === testKey) || this.labCatalog[0];
                const sampleNum = Math.floor(1000 + Math.random() * 9000);
                const sampleId = `LAB-2026-${sampleNum}`;

                const newOrder = {
                    id: 'lab_' + Date.now(),
                    sample_id: sampleId,
                    patient_name: patientName,
                    patient_phone: patientPhone,
                    patient_age: patientAge,
                    patient_gender: patientGender,
                    test_key: testKey,
                    test_name: catalogItem ? catalogItem.name : 'فحص معملي',
                    tube_type: tubeType,
                    doctor_name: doctorName,
                    sample_date: new Date().toISOString().split('T')[0],
                    cost: cost,
                    payment_type: paymentType,
                    contract_name: paymentType === 'corporate' ? contractName : null,
                    status: 'pending',
                    status_label: 'بانتظار السحب (Pending)',
                    flag: 'normal',
                    parameters: catalogItem && catalogItem.parameters ? JSON.parse(JSON.stringify(catalogItem.parameters)) : [],
                    comment: 'العينة بانتظار السحب والتحليل على أجهزة المعمل الآلية.',
                    verified_by: null
                };

                this.labOrders.unshift(newOrder);
                Utils.showToast(`تم إصدار طلب التحليل بنجاح برقم عينة (${sampleId})`, 'success');
                labOrderModal.classList.add('hidden');
                labOrderForm.reset();
                this.renderLabOrders();
                this.updateKPIs();
            };
        }

        const labResultsForm = document.getElementById('lab-results-form');
        const labResultsModal = document.getElementById('lab-results-modal');
        if (labResultsForm && labResultsModal) {
            labResultsForm.onsubmit = (e) => {
                e.preventDefault();
                const orderId = document.getElementById('lab-results-active-order-id').value;
                const order = this.labOrders.find(o => o.id === orderId);
                if (!order) return;

                let highestFlag = 'normal';
                if (order.parameters) {
                    order.parameters.forEach((param, idx) => {
                        const inputEl = document.getElementById(`lab-param-input-${idx}`);
                        if (inputEl) {
                            param.value = inputEl.value;
                            const val = parseFloat(inputEl.value);
                            if (!isNaN(val)) {
                                if (param.panic_high && val >= param.panic_high) {
                                    param.flag = 'panic';
                                    highestFlag = 'panic';
                                } else if (param.panic_low && val <= param.panic_low) {
                                    param.flag = 'panic';
                                    highestFlag = 'panic';
                                } else if (param.max && val > param.max) {
                                    param.flag = 'high';
                                    if (highestFlag !== 'panic') highestFlag = 'high';
                                } else if (param.min && val < param.min) {
                                    param.flag = 'low';
                                    if (highestFlag !== 'panic') highestFlag = 'low';
                                } else {
                                    param.flag = 'normal';
                                }
                            }
                        }
                    });
                }

                order.flag = highestFlag;
                order.comment = document.getElementById('lab-results-comment').value.trim() || 'الفحص معتمد سريرياً.';
                const isApproved = document.getElementById('lab-results-approve-check').checked;
                if (isApproved) {
                    order.status = 'verified';
                    order.status_label = 'معتمدة ومكتملة';
                    order.verified_by = 'د. هاني عثمان (استشاري باثولوجيا إكلينيكية)';
                } else {
                    order.status = 'in_progress';
                    order.status_label = 'قيد المراجعة';
                }

                Utils.showToast(`تم حفظ وتحديث نتائج الفحص للعينة (${order.sample_id}) بنجاح`, 'success');
                labResultsModal.classList.add('hidden');
                this.renderLabOrders();
                this.updateKPIs();
            };
        }

        // ==========================================
        // نماذج وأحداث الأشعة (RIS Forms)
        // ==========================================
        const radOrderForm = document.getElementById('rad-order-form');
        const radOrderModal = document.getElementById('rad-order-modal');
        if (radOrderForm && radOrderModal) {
            radOrderForm.onsubmit = (e) => {
                e.preventDefault();
                const patientName = document.getElementById('rad-order-patient-name').value.trim();
                const patientPhone = document.getElementById('rad-order-patient-phone').value.trim();
                const modality = document.getElementById('rad-order-modality-select').value;
                const exam = document.getElementById('rad-order-exam-select').value;
                const contrast = document.getElementById('rad-order-contrast-check').checked;
                const doctorName = document.getElementById('rad-order-doctor-input').value.trim();
                const paymentType = document.getElementById('rad-order-payment-type').value;
                const cost = parseFloat(document.getElementById('rad-order-cost-input').value) || 450;

                const studyNum = Math.floor(1000 + Math.random() * 9000);
                const studyId = `RAD-2026-${studyNum}`;

                const newStudy = {
                    id: 'rad_' + Date.now(),
                    study_id: studyId,
                    patient_name: patientName,
                    patient_phone: patientPhone,
                    patient_age: 40,
                    patient_gender: 'male',
                    modality: modality,
                    exam_name: exam,
                    contrast: contrast,
                    doctor_name: doctorName,
                    study_date: new Date().toISOString().split('T')[0],
                    cost: cost,
                    payment_type: paymentType,
                    status: 'drafting',
                    status_label: 'قيد كتابة التقرير (Drafting)',
                    technique: `Digital ${modality} examination performed using standard acquisition protocols.`,
                    findings: 'Study completed, awaiting radiologist dictation.',
                    impression: 'Pending evaluation.',
                    radiologist_name: 'د. مروان البدري (استشاري أشعة تشخيصية)',
                    image_url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80'
                };

                this.radiologyStudies.unshift(newStudy);
                Utils.showToast(`تم حجز فحص الأشعة بنجاح برقم دراسة (${studyId})`, 'success');
                radOrderModal.classList.add('hidden');
                radOrderForm.reset();
                this.renderRadiologyStudies();
                this.updateKPIs();
            };
        }

        const radReportForm = document.getElementById('rad-report-form');
        const radReportModal = document.getElementById('rad-report-modal');
        if (radReportForm && radReportModal) {
            radReportForm.onsubmit = (e) => {
                e.preventDefault();
                const studyId = document.getElementById('rad-report-active-study-id').value;
                const study = this.radiologyStudies.find(s => s.id === studyId);
                if (!study) return;

                study.technique = document.getElementById('rad-report-technique').value.trim();
                study.findings = document.getElementById('rad-report-findings').value.trim();
                study.impression = document.getElementById('rad-report-impression').value.trim();
                study.radiologist_name = document.getElementById('rad-report-sign-doctor').value.trim() || 'د. مروان البدري';
                
                const isSigned = document.getElementById('rad-report-signed-check').checked;
                if (isSigned) {
                    study.status = 'signed';
                    study.status_label = 'معتمد وموقع';
                } else {
                    study.status = 'drafting';
                    study.status_label = 'مسودة قيد المراجعة';
                }

                Utils.showToast(`تم حفظ وتوقيع تقرير الأشعة للدراسة (${study.study_id}) بنجاح`, 'success');
                radReportModal.classList.add('hidden');
                this.renderRadiologyStudies();
                this.updateKPIs();
            };
        }

        // ==========================================
        // نماذج وأحداث صالة الانتظار الذكية (Queue)
        // ==========================================
        const queueTicketForm = document.getElementById('queue-ticket-form');
        const queueTicketModal = document.getElementById('queue-ticket-modal');
        if (queueTicketForm && queueTicketModal) {
            queueTicketForm.onsubmit = (e) => {
                e.preventDefault();
                const patientName = document.getElementById('ticket-patient-name').value.trim();
                const patientPhone = document.getElementById('ticket-patient-phone').value.trim();
                const clinic = document.getElementById('ticket-clinic-select').value;
                const doctor = document.getElementById('ticket-doctor-select').value;
                const priority = document.getElementById('ticket-priority-select').value;
                const service = document.getElementById('ticket-service-type').value;
                const notes = document.getElementById('ticket-notes').value.trim();

                const letterMap = {
                    'العيادة الباطنية التخصصية': 'A',
                    'عيادة جراحة العظام': 'B',
                    'عيادة طب وجراحة العيون': 'C',
                    'عيادة الجلدية والليزر': 'D',
                    'عيادة طب وجراحة الأسنان': 'E',
                    'معمل التحاليل الطبية (LIS)': 'L',
                    'مركز الأشعة التشخيصية (RIS)': 'R'
                };
                const prefix = letterMap[clinic] || 'Q';
                const nextNum = 100 + (this.waitingTickets.length + 1) * 2;
                const ticketNo = `${prefix}-${nextNum}`;

                const newTicket = {
                    id: 'tkt_' + Date.now(),
                    ticket_no: ticketNo,
                    patient_name: patientName,
                    patient_phone: patientPhone || '—',
                    clinic: clinic,
                    doctor: doctor,
                    service: service,
                    priority: priority,
                    priority_label: priority === 'emergency' ? 'طوارئ 🚨' : priority === 'vip' ? 'VIP ⭐' : priority === 'urgent' ? 'مستعجل' : 'عادي',
                    status: 'waiting',
                    time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                    notes: notes || '—'
                };

                this.waitingTickets.unshift(newTicket);

                // Sync with TV queue display in localStorage
                try {
                    const tvQueue = JSON.parse(localStorage.getItem('alwagih_queue_tickets') || '[]');
                    tvQueue.unshift(newTicket);
                    localStorage.setItem('alwagih_queue_tickets', JSON.stringify(tvQueue));
                } catch (err) {}

                Utils.showToast(`تم إصدار تذكرة الانتظار (${ticketNo}) للمريض: ${patientName}`, 'success');
                queueTicketModal.classList.add('hidden');
                queueTicketForm.reset();
                this.renderQueueBoard();
                this.updateKPIs();
            };
        }

        // ==========================================
        // نماذج وأحداث عمولات الأطباء (Commissions)
        // ==========================================
        const commRulesForm = document.getElementById('doctor-commission-rules-form');
        const commRulesModal = document.getElementById('doctor-commission-rules-modal');
        if (commRulesForm && commRulesModal) {
            commRulesForm.onsubmit = (e) => {
                e.preventDefault();
                const docId = document.getElementById('rules-doctor-id').value;
                const doc = this.doctorCommissions.find(d => d.id === docId);
                if (doc) {
                    doc.consult_split_pct = parseFloat(document.getElementById('rules-consult-split').value) || 0;
                    doc.procedure_split_pct = parseFloat(document.getElementById('rules-procedure-split').value) || 0;
                    doc.lab_comm_pct = parseFloat(document.getElementById('rules-lab-comm').value) || 0;
                    doc.rad_comm_pct = parseFloat(document.getElementById('rules-rad-comm').value) || 0;
                    doc.deduction_pct = parseFloat(document.getElementById('rules-deduction-rate').value) || 0;

                    this.recalcDoctorCommission(doc);
                    Utils.showToast(`تم تحديث نسب وقواعد العمولات للطبيب (${doc.doctor_name}) بنجاح`, 'success');
                    commRulesModal.classList.add('hidden');
                    this.renderDoctorCommissions();
                    this.updateKPIs();
                }
            };
        }

        const payoutForm = document.getElementById('doctor-payout-form');
        const payoutModal = document.getElementById('doctor-payout-modal');
        if (payoutForm && payoutModal) {
            payoutForm.onsubmit = (e) => {
                e.preventDefault();
                const docId = document.getElementById('payout-doctor-id').value;
                const doc = this.doctorCommissions.find(d => d.id === docId);
                if (doc) {
                    const method = document.getElementById('payout-payment-method').value;
                    const ref = document.getElementById('payout-reference-no').value.trim() || `VCH-${Date.now().toString().slice(-4)}`;
                    const notes = document.getElementById('payout-notes').value.trim();

                    doc.status = 'paid';
                    doc.payment_date = new Date().toISOString().split('T')[0];
                    doc.paid_date = doc.payment_date;
                    doc.payment_method = method;
                    doc.voucher_no = ref;
                    doc.receipt_no = ref;
                    doc.payout_notes = notes;

                    Utils.showToast(`تم اعتماد وصرف مستحقات (${Utils.formatCurrency(doc.net_payable)}) للطبيب: ${doc.doctor_name}`, 'success');
                    payoutModal.classList.add('hidden');
                    payoutForm.reset();
                    this.renderDoctorCommissions();
                    this.updateKPIs();
                }
            };
        }

        const adminDrugForm = document.getElementById('admin-add-drug-form');
        const adminDrugModal = document.getElementById('admin-add-drug-modal');
        if (adminDrugForm && adminDrugModal) {
            adminDrugForm.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('admin-drug-name').value.trim();
                const generic = document.getElementById('admin-drug-generic').value.trim();
                const form = document.getElementById('admin-drug-form-select').value;
                const strength = document.getElementById('admin-drug-strength').value.trim();
                const batch = document.getElementById('admin-drug-batch').value.trim() || `B-${Date.now().toString().slice(-4)}`;
                const expiry = document.getElementById('admin-drug-expiry').value;
                const stock = parseInt(document.getElementById('admin-drug-stock').value) || 40;
                const cost = parseFloat(document.getElementById('admin-drug-cost').value) || 60;
                const price = parseFloat(document.getElementById('admin-drug-price').value) || 80;

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

                this.pharmacyDrugs.unshift(newDrug);
                Utils.showToast(`تمت إضافة الدواء (${name}) بنجاح إلى صيدلية المجمع`, 'success');
                adminDrugModal.classList.add('hidden');
                adminDrugForm.reset();
                this.renderAdminPharmacy();
                this.updateKPIs();
            };
        }

        const adminSurgForm = document.getElementById('admin-add-surgery-form');
        const adminSurgModal = document.getElementById('admin-add-surgery-modal');
        if (adminSurgForm && adminSurgModal) {
            adminSurgForm.onsubmit = (e) => {
                e.preventDefault();
                const ptName = document.getElementById('admin-surg-pt-name').value.trim();
                const ptPhone = document.getElementById('admin-surg-pt-phone').value.trim();
                const procName = document.getElementById('admin-surg-proc-name').value.trim();
                const doctor = document.getElementById('admin-surg-doctor').value.trim();
                const anesthesia = document.getElementById('admin-surg-anesthesia').value;
                const room = document.getElementById('admin-surg-room').value;
                const cost = parseFloat(document.getElementById('admin-surg-cost').value) || 2000;

                const newSurgery = {
                    id: 'surg_' + Date.now(),
                    surgery_code: 'OR-' + Math.floor(100 + Math.random() * 900),
                    patient_name: ptName,
                    patient_phone: ptPhone,
                    procedure_name: procName,
                    surgeon_name: doctor,
                    anesthesiologist_name: 'د. خالد عبد السميع',
                    anesthesia_type: anesthesia,
                    or_room: room,
                    recovery_bed: 'سرير الإفاقة 1',
                    surgery_date: new Date().toISOString().split('T')[0] + ' 10:00 ص',
                    who_checklist_passed: true,
                    consent_signed: true,
                    total_cost: cost,
                    status: 'completed',
                    notes: 'تمت الجراحة بنجاح واستقرار العلامات الحيوية'
                };

                this.daySurgeries.unshift(newSurgery);
                try {
                    localStorage.setItem('alwagih_day_surgeries', JSON.stringify(this.daySurgeries));
                } catch(e) {}

                Utils.showToast(`تمت جدولة وتوثيق العملية الجراحية (#${newSurgery.surgery_code}) بنجاح`, 'success');
                adminSurgModal.classList.add('hidden');
                adminSurgForm.reset();
                this.renderAdminSurgerySuite();
                this.updateKPIs();
            };
        }

        const adminPkgForm = document.getElementById('admin-add-package-form');
        const adminPkgModal = document.getElementById('admin-add-package-modal');
        if (adminPkgForm && adminPkgModal) {
            adminPkgForm.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('admin-pkg-name').value.trim();
                const category = document.getElementById('admin-pkg-category').value;
                const badge = document.getElementById('admin-pkg-badge').value.trim();
                const regPrice = parseFloat(document.getElementById('admin-pkg-reg-price').value) || 1200;
                const offerPrice = parseFloat(document.getElementById('admin-pkg-offer-price').value) || 800;
                const servicesRaw = document.getElementById('admin-pkg-services').value.trim();
                const services = servicesRaw.split('\n').map(s => s.trim()).filter(Boolean);
                const savingsPct = Math.round(((regPrice - offerPrice) / regPrice) * 100);

                const newPkg = {
                    id: 'pkg_' + Date.now(),
                    code: 'PKG-' + Math.floor(100 + Math.random() * 900),
                    name,
                    category,
                    badge,
                    regular_price: regPrice,
                    package_price: offerPrice,
                    savings_percentage: savingsPct > 0 ? savingsPct : 25,
                    bookings_count: 0,
                    status: 'active',
                    services: services.length > 0 ? services : ['استشارة طبية متخصصة', 'فحوصات معملية وسونار']
                };

                this.medicalPackages.unshift(newPkg);
                try {
                    localStorage.setItem('alwagih_medical_packages', JSON.stringify(this.medicalPackages));
                } catch(e) {}

                Utils.showToast(`تمت إضافة باقة (${name}) بنجاح واعتمادها في النظام 🎁`, 'success');
                adminPkgModal.classList.add('hidden');
                adminPkgForm.reset();
                this.renderAdminMultiBranch();
                this.updateKPIs();
            };
        }
    },

    getMockCRMPatients() {
        return [
            { id: '1', full_name: 'طارق حسام مصطفى', phone: '01011223344', lead_source: 'فيسبوك / تواصل اجتماعي', patient_tier: 'vip', stage: 'new', next_follow_up: '2026-11-16', notes: 'مهتم بكشف باطنة وسونار' },
            { id: '2', full_name: 'ياسمين عبد الرحمن', phone: '01122334455', lead_source: 'تعاقد شركة', patient_tier: 'corporate', stage: 'booked', next_follow_up: '2026-11-18', notes: 'محولة من شركة مصر للتأمين' },
            { id: '3', full_name: 'حامد زكريا النمر', phone: '01233445566', lead_source: 'إحالة طبيب', patient_tier: 'chronic', stage: 'follow_up', next_follow_up: '2026-11-20', notes: 'مريض سكري يحتاج متابعة كل أسبوعين' },
            { id: '4', full_name: 'سلوى محمود شاهين', phone: '01555667788', lead_source: 'ترشيح مريض سابق', patient_tier: 'regular', stage: 'visited', next_follow_up: '—', notes: 'تم الكشف مع د. سارة محمود' }
        ];
    },

    getMockCallLogs() {
        return [
            { id: 'call_1', patient_name: 'طارق حسام مصطفى', phone: '01011223344', call_type: 'outbound', outcome: 'booked', duration: '02:15', agent: 'أحمد فؤاد (كول سنتر)', timestamp: '14/11/2026 10:30 ص', notes: 'تم حجز كشف باطنة مع د. أحمد الشناوي يوم الأحد القادم' },
            { id: 'call_2', patient_name: 'ياسمين عبد الرحمن', phone: '01122334455', call_type: 'inbound', outcome: 'confirmed', duration: '01:10', agent: 'ريم مصطفى (خدمة عملاء)', timestamp: '14/11/2026 11:15 ص', notes: 'تأكيد الحضور واستفسار عن نسبة تحمل شركة مصر للتأمين' },
            { id: 'call_3', patient_name: 'حامد زكريا النمر', phone: '01233445566', call_type: 'outbound', outcome: 'callback', duration: '00:45', agent: 'أحمد فؤاد (كول سنتر)', timestamp: '14/11/2026 12:00 م', notes: 'طلب معاودة الاتصال بعد الساعة 5 مساءً لمراجعة مواعيد التحاليل' },
            { id: 'call_4', patient_name: 'سلوى محمود شاهين', phone: '01555667788', call_type: 'inbound', outcome: 'inquiry', duration: '03:20', agent: 'ريم مصطفى (خدمة عملاء)', timestamp: '14/11/2026 01:40 م', notes: 'استفسار عن أسعار السونار وتواجد استشاري الأطفال' }
        ];
    },

    getMockSupportTickets() {
        return [
            { id: 'TICK-101', patient_name: 'طارق حسام مصطفى', phone: '01011223344', category: 'استفسار مالي وفواتير', priority: 'medium', status: 'resolved', agent: 'أحمد فؤاد', created_at: '14/11/2026 09:15 ص', issue: 'استفسار عن فاتورة الكشف والخصم المعتمد للتعاقد', resolution: 'تم شرح تفاصيل الخصم 20% وإرسال الفاتورة عبر واتساب', csat: 5 },
            { id: 'TICK-102', patient_name: 'خالد مصطفى العوضي', phone: '01099887711', category: 'شكوى تأخير مواعيد', priority: 'urgent', status: 'in_progress', agent: 'ريم مصطفى', created_at: '14/11/2026 11:30 ص', issue: 'تأخر موعد الدخول لغرفة الفحص 20 دقيقة عن الموعد المحدد', resolution: 'جاري التنسيق مع الاستقبال لتقديم اعتذار ودخوله فوراً', csat: 3 },
            { id: 'TICK-103', patient_name: 'منار السيد عبد ربه', phone: '01288776655', category: 'نتائج تحاليل وأشعة', priority: 'normal', status: 'open', agent: 'أحمد فؤاد', created_at: '14/11/2026 02:10 م', issue: 'طلب استلام نتائج تحاليل السكر التراكمي إلكترونياً عبر واتساب', resolution: 'في انتظار توقيع استشاري المعمل لإرسالها فوراً', csat: 4 }
        ];
    },

    getMockWhatsAppMessages() {
        return [
            { phone: '01011223344', text: 'مرحباً أستاذ طارق، نود تذكيرك بموعد كشفك القادم غداً الساعة 11:00 ص بعيادات الشفاء...', timestamp: '10:45 ص', status: 'تم الإرسال عبر WhatsApp' },
            { phone: '01122334455', text: 'أهلاً أستاذة ياسمين، تم اعتماد نسبة الخصم التعاقدية 20% لشركة مصر للتأمين...', timestamp: '11:20 ص', status: 'تم الإرسال عبر WhatsApp' },
            { phone: '01233445566', text: 'عزيزي المريض حامد النمر، تذكيراً بالصيام 8 ساعات قبل تحاليل السكر الصباحية...', timestamp: '12:10 م', status: 'تم الإرسال عبر WhatsApp' }
        ];
    },

    getMockAttendanceLogs() {
        return [
            { employee_name: 'د. أحمد الشناوي', fingerprint_id: 'FP-01', check_in: '08:55 ص', check_out: '04:05 م', late_minutes: 0, overtime_minutes: 10, status: 'present' },
            { employee_name: 'د. سارة محمود', fingerprint_id: 'FP-02', check_in: '09:18 ص', check_out: '—', late_minutes: 18, overtime_minutes: 0, status: 'late' },
            { employee_name: 'أحمد فؤاد (استقبال)', fingerprint_id: 'FP-03', check_in: '07:58 ص', check_out: '04:00 م', late_minutes: 0, overtime_minutes: 0, status: 'present' },
            { employee_name: 'ريم مصطفى (استقبال)', fingerprint_id: 'FP-04', check_in: '03:55 م', check_out: '—', late_minutes: 0, overtime_minutes: 0, status: 'present' },
            { employee_name: 'أمل إبراهيم (تمريض)', fingerprint_id: 'FP-05', check_in: '08:02 ص', check_out: '—', late_minutes: 2, overtime_minutes: 0, status: 'present' }
        ];
    },

    getMockPenalties() {
        return [
            { employee_name: 'ريم مصطفى', date: '2026-11-12', penalty_type: 'days', days: 0.5, amount: 0, reason: 'تأخير متكرر عن موعد استلام الوردية الصباحية بدون إذن مسبق', issued_by: 'المدير المباشر' },
            { employee_name: 'أمل إبراهيم', date: '2026-11-08', penalty_type: 'amount', days: 0, amount: 150, reason: 'عدم الالتزام بزي التعقيم الرسمي الموحد بغرفة العمليات الصغرى', issued_by: 'مدير العيادة' }
        ];
    },

    getMockRoster() {
        return [
            { employee_name: 'أحمد فؤاد', job_title: 'مشرف استقبال', day_of_week: 0, shift_name: 'صباحي (8 ص - 4 م)', hours: '8 ساعات' },
            { employee_name: 'ريم مصطفى', job_title: 'موظف استقبال', day_of_week: 0, shift_name: 'مسائي (4 م - 12 ص)', hours: '8 ساعات' },
            { employee_name: 'د. أحمد الشناوي', job_title: 'استشاري باطنة', day_of_week: 1, shift_name: 'صباحي (8 ص - 4 م)', hours: '8 ساعات' },
            { employee_name: 'د. سارة محمود', job_title: 'أخصائي أطفال', day_of_week: 1, shift_name: 'مسائي (4 م - 12 ص)', hours: '8 ساعات' },
            { employee_name: 'محمود عبد الرازق', job_title: 'تمريض طوارئ', day_of_week: 2, shift_name: 'ليلي / طوارئ (12 ص - 8 ص)', hours: '8 ساعات' }
        ];
    },

    getMockSuppliers() {
        return [
            { name: 'شركة المتحدة للأدوية والمستلزمات', contact_name: 'د. هاني رضوان', phone: '01099881122', last_order_date: '2026-11-10', balance_due: 28500 },
            { name: 'مؤسسة الشفاء لتجهيزات المعامل والتعقيم', contact_name: 'م. عماد شكري', phone: '01122334466', last_order_date: '2026-11-05', balance_due: 12000 },
            { name: 'الشركة الطبية الحديثة للسرنجات والمستهلكات', contact_name: 'أ. طارق زيدان', phone: '01244556677', last_order_date: '2026-11-12', balance_due: 8000 }
        ];
    },

    getMockInventory() {
        return [
            { id: 'i1', name: 'شاش طبي معقم 10*10سم', category: 'مستلزمات طبية', batch_number: 'BCH-2026-88', quantity: 8, min_threshold: 25, unit: 'علبة', expiry_date: '2027-06-30' },
            { id: 'i2', name: 'سرنجات طبية 5 سم (معقمة)', category: 'مستلزمات طبية', batch_number: 'BCH-2026-102', quantity: 180, min_threshold: 50, unit: 'قطعة', expiry_date: '2028-12-31' },
            { id: 'i3', name: 'محلول ملحي معقم (Saline 0.9%)', category: 'أدوية ومحاليل', batch_number: 'BCH-2026-44', quantity: 5, min_threshold: 20, unit: 'زجاجة', expiry_date: '2026-12-15' },
            { id: 'i4', name: 'جوانتيات طبية لاتكس (مقاس M)', category: 'مستلزمات وقاية', batch_number: 'BCH-2026-71', quantity: 45, min_threshold: 20, unit: 'علبة', expiry_date: '2029-05-20' },
            { id: 'i5', name: 'كانيولا وريدية زرقاء مقاس 22', category: 'مستلزمات طبية', batch_number: 'BCH-2026-39', quantity: 12, min_threshold: 30, unit: 'قطعة', expiry_date: '2027-11-01' }
        ];
    },

    getMockContracts() {
        return [
            { id: 'c1', name: 'شركة مصر للتأمين', discount_percentage: 20, patient_copay_percentage: 20, max_coverage: 5000, contact_person: 'أ. سامح عبد الفتاح', phone: '01011223344' },
            { id: 'c2', name: 'نقابة المهندسين', discount_percentage: 25, patient_copay_percentage: 20, max_coverage: 4000, contact_person: 'د. طارق مراد', phone: '01122334455' },
            { id: 'c3', name: 'بتروتريد للخدمات البترولية', discount_percentage: 30, patient_copay_percentage: 20, max_coverage: 6000, contact_person: 'م. خالد جلال', phone: '01233445566' },
            { id: 'c4', name: 'أكسا للتأمين الطبي (AXA)', discount_percentage: 15, patient_copay_percentage: 10, max_coverage: 8000, contact_person: 'أ. مروة الشريف', phone: '01555667788' }
        ];
    },

    getMockEmployees() {
        return [
            { full_name: 'د. أحمد الشناوي', job_title: 'استشاري باطنة', base_salary: 15000, allowances: 2500, deductions: 0, payroll_status: 'معتمد' },
            { full_name: 'د. سارة محمود', job_title: 'أخصائي أطفال', base_salary: 12000, allowances: 1800, deductions: 0, payroll_status: 'معتمد' },
            { full_name: 'أحمد فؤاد', job_title: 'مشرف استقبال', base_salary: 6000, allowances: 800, deductions: 0, payroll_status: 'معتمد' },
            { full_name: 'ريم مصطفى', job_title: 'موظف استقبال', base_salary: 4500, allowances: 500, deductions: 150, payroll_status: 'معتمد' },
            { full_name: 'أمل إبراهيم', job_title: 'تمريض', base_salary: 5000, allowances: 600, deductions: 150, payroll_status: 'معتمد' }
        ];
    },

    // ==========================================
    // 6. مركز التقارير الشاملة والإحصائيات
    // ==========================================
    switchReportsSubTab(subTabId) {
        this.activeReportsSubTab = subTabId;
        const subviews = ['analytics', 'financial', 'procurement', 'patient_visits'];
        subviews.forEach(s => {
            const el = document.getElementById(`reports-subview-${s}`);
            const btn = document.getElementById(`reports-sub-btn-${s}`);
            if (el) el.classList.toggle('hidden', s !== subTabId);
            if (btn) {
                if (s === subTabId) {
                    btn.className = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-sky-600 text-white shadow-sm transition';
                } else {
                    btn.className = 'px-3.5 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition';
                }
            }
        });

        if (subTabId === 'analytics') this.renderAnalyticsCharts();
    },

    renderReportsHub() {
        this.renderAnalyticsReport();
        this.renderFinancialReport();
        this.renderProcurementReport();
        this.renderPatientVisitsReport();
    },

    renderAnalyticsReport() {
        const stats = this.analyticsStatsData || {};
        const elVisits = document.getElementById('stat-total-visits');
        const elRate = document.getElementById('stat-attendance-rate');
        const elWait = document.getElementById('stat-avg-wait');
        const elCsat = document.getElementById('stat-csat-rating');

        if (elVisits) elVisits.textContent = `${stats.totalVisits || 348} زيارة`;
        if (elRate) elRate.textContent = `${stats.attendanceRate || 94}%`;
        if (elWait) elWait.textContent = `${stats.avgWaitTime || 12} دقيقة`;
        if (elCsat) elCsat.textContent = `${stats.csatRating || 4.9} ⭐`;

        const docTbody = document.getElementById('analytics-doctor-table');
        if (docTbody && stats.doctorBreakdown) {
            docTbody.innerHTML = stats.doctorBreakdown.map((doc, idx) => `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800 text-xs">
                    <td class="py-2.5 px-3 font-bold text-slate-900 dark:text-white">${doc.name}</td>
                    <td class="py-2.5 px-3 text-slate-500 dark:text-slate-400">${doc.specialty}</td>
                    <td class="py-2.5 px-3 font-mono font-bold">${doc.cases_count}</td>
                    <td class="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">${Utils.formatCurrency(doc.revenue)}</td>
                </tr>
            `).join('');
        }
    },

    renderAnalyticsCharts() {
        if (typeof Chart === 'undefined') return;

        // 1. رسم بياني لاتجاه الزيارات الشهري
        const ctxTrend = document.getElementById('chart-visits-trend');
        if (ctxTrend) {
            if (this.analyticsTrendChartInstance) {
                this.analyticsTrendChartInstance.destroy();
            }
            this.analyticsTrendChartInstance = new Chart(ctxTrend, {
                type: 'bar',
                data: {
                    labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
                    datasets: [
                        { label: 'كشوفات الكاش', data: [28, 35, 42, 38, 45, 52], backgroundColor: '#0284c7', borderRadius: 8 },
                        { label: 'كشوفات التعاقد والتأمين', data: [19, 24, 30, 26, 33, 40], backgroundColor: '#a855f7', borderRadius: 8 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', labels: { font: { family: 'Cairo', size: 11 } } } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.1)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // 2. رسم بياني للإجراءات الطبية الأكثر طلباً
        const ctxProc = document.getElementById('chart-procedures-share');
        if (ctxProc) {
            if (this.analyticsProceduresChartInstance) {
                this.analyticsProceduresChartInstance.destroy();
            }
            this.analyticsProceduresChartInstance = new Chart(ctxProc, {
                type: 'doughnut',
                data: {
                    labels: ['كشف استشاري', 'تخطيط قلب ECG', 'أشعة وسونار', 'فحوصات معملية', 'جلسات علاج طبيعي'],
                    datasets: [{
                        data: [45, 20, 15, 12, 8],
                        backgroundColor: ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { font: { family: 'Cairo', size: 10 } } } }
                }
            });
        }
    },

    renderFinancialReport() {
        const fin = this.financialReportData || {};
        const elCash = document.getElementById('fin-kpi-cash');
        const elCorp = document.getElementById('fin-kpi-corp');
        const elExp = document.getElementById('fin-kpi-exp');
        const elProfit = document.getElementById('fin-kpi-profit');

        if (elCash) elCash.textContent = Utils.formatCurrency(fin.totalCash || 0);
        if (elCorp) elCorp.textContent = Utils.formatCurrency(fin.totalCorporate || 0);
        if (elExp) elExp.textContent = Utils.formatCurrency(fin.totalExpenses || 0);
        if (elProfit) elProfit.textContent = Utils.formatCurrency(fin.netProfit || 0);

        const tbody = document.getElementById('financial-report-table-body');
        if (tbody && fin.transactions) {
            tbody.innerHTML = fin.transactions.map((tx, idx) => {
                const isCredit = Number(tx.credit || 0) > 0;
                return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800 text-xs">
                        <td class="py-3 px-3 font-mono font-bold text-slate-500">#${tx.ref_no}</td>
                        <td class="py-3 px-3 text-slate-600 dark:text-slate-300">${tx.date}</td>
                        <td class="py-3 px-3">
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isCredit ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'}">
                                ${tx.type === 'income' ? 'إيراد كشوفات' : (tx.type === 'corporate_claim' ? 'مطالبة تأمين' : 'مصروف تشغيلي')}
                            </span>
                        </td>
                        <td class="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">${tx.description}</td>
                        <td class="py-3 px-3 text-slate-500 dark:text-slate-400">${tx.account}</td>
                        <td class="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">${tx.credit ? Utils.formatCurrency(tx.credit) : '—'}</td>
                        <td class="py-3 px-3 font-mono font-bold text-rose-600 dark:text-rose-400">${tx.debit ? Utils.formatCurrency(tx.debit) : '—'}</td>
                        <td class="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">${Utils.formatCurrency(tx.balance)}</td>
                    </tr>
                `;
            }).join('');
        }
    },

    renderProcurementReport() {
        const orders = this.procurementOrders || [];
        const totalAmount = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        const paidAmount = orders.reduce((sum, o) => sum + Number(o.paid_amount || 0), 0);
        const dueAmount = orders.reduce((sum, o) => sum + Number(o.remaining_amount || 0), 0);

        const elTotal = document.getElementById('proc-kpi-total');
        const elPaid = document.getElementById('proc-kpi-paid');
        const elDue = document.getElementById('proc-kpi-due');

        if (elTotal) elTotal.textContent = Utils.formatCurrency(totalAmount);
        if (elPaid) elPaid.textContent = Utils.formatCurrency(paidAmount);
        if (elDue) elDue.textContent = Utils.formatCurrency(dueAmount);

        const tbody = document.getElementById('procurement-report-table-body');
        if (tbody) {
            tbody.innerHTML = orders.map((ord, idx) => `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800 text-xs">
                    <td class="py-3 px-3 font-mono font-bold text-sky-600 dark:text-sky-400">${ord.po_number}</td>
                    <td class="py-3 px-3">
                        <div class="font-bold text-slate-900 dark:text-white">${ord.supplier_name}</div>
                        <div class="text-[11px] text-slate-400">${ord.supplier_phone}</div>
                    </td>
                    <td class="py-3 px-3 text-slate-600 dark:text-slate-300">${ord.order_date}</td>
                    <td class="py-3 px-3 font-bold">${ord.items_count} أصناف</td>
                    <td class="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">${Utils.formatCurrency(ord.total_amount)}</td>
                    <td class="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">${Utils.formatCurrency(ord.paid_amount)}</td>
                    <td class="py-3 px-3 font-mono text-rose-600 dark:text-rose-400 font-bold">${Utils.formatCurrency(ord.remaining_amount)}</td>
                    <td class="py-3 px-3">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${ord.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'}">
                            ${ord.payment_status === 'paid' ? 'مسدد بالكامل' : 'آجل معلق'}
                        </span>
                    </td>
                    <td class="py-3 px-3 font-mono text-slate-400">${ord.tax_invoice_no}</td>
                </tr>
            `).join('');
        }
    },

    renderPatientVisitsReport(filterQuery = '') {
        let visits = this.patientVisits || [];
        if (filterQuery) {
            const q = filterQuery.toLowerCase();
            visits = visits.filter(v => 
                (v.patient_name && v.patient_name.toLowerCase().includes(q)) ||
                (v.doctor_name && v.doctor_name.toLowerCase().includes(q)) ||
                (v.procedure_name && v.procedure_name.toLowerCase().includes(q)) ||
                (v.patient_phone && v.patient_phone.includes(q))
            );
        }

        const elTotalVisits = document.getElementById('pv-kpi-total');
        const elTotalProcs = document.getElementById('pv-kpi-procedures');
        const elCashCases = document.getElementById('pv-kpi-cash');
        const elCorpCases = document.getElementById('pv-kpi-corp');

        if (elTotalVisits) elTotalVisits.textContent = `${visits.length} زيارات`;
        if (elTotalProcs) elTotalProcs.textContent = `${visits.length} إجراءات منفذة`;
        if (elCashCases) elCashCases.textContent = `${visits.filter(v => v.payment_type !== 'corporate').length} كاش`;
        if (elCorpCases) elCorpCases.textContent = `${visits.filter(v => v.payment_type === 'corporate').length} تعاقد`;

        const tbody = document.getElementById('patient-visits-report-table-body');
        if (tbody) {
            if (visits.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-slate-400">لا توجد زيارات مطابقة لشرط البحث</td></tr>`;
                return;
            }

            tbody.innerHTML = visits.map((v, idx) => {
                const isCorp = v.payment_type === 'corporate';
                return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800 text-xs">
                        <td class="py-3 px-3 font-mono font-bold text-slate-500">${v.patient_file_no}</td>
                        <td class="py-3 px-3">
                            <div class="font-bold text-slate-900 dark:text-white">${v.patient_name}</div>
                            <div class="text-[11px] text-slate-400">${v.patient_phone} • ${v.patient_age} سنة (${v.patient_gender === 'female' ? 'أنثى' : 'ذكر'})</div>
                        </td>
                        <td class="py-3 px-3">
                            <div class="font-bold text-purple-700 dark:text-purple-300">${v.procedure_name}</div>
                            <div class="text-[11px] text-slate-500 dark:text-slate-400">${v.diagnosis}</div>
                        </td>
                        <td class="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">${v.doctor_name}</td>
                        <td class="py-3 px-3 font-mono text-slate-500">
                            <div>${v.date}</div>
                            <div class="text-[10px] text-slate-400">${Utils.formatTime(v.time_slot)}</div>
                        </td>
                        <td class="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">${Utils.formatCurrency(v.procedure_cost)}</td>
                        <td class="py-3 px-3">
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isCorp ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'}">
                                ${isCorp ? `🏢 تعاقد (${v.contract_name || 'تأمين'})` : '💵 نقدي'}
                            </span>
                        </td>
                        <td class="py-3 px-3 text-center">
                            <button onclick="WhatsAppService.showBookingConfirmationModal({patient_name: '${v.patient_name}', doctor_name: '${v.doctor_name}', date: '${v.date}', time_slot: '${v.time_slot}', patient_phone: '${v.patient_phone}'})" title="إرسال تأكيد واتساب" class="btn-press px-2 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition inline-flex items-center gap-1">
                                💬 واتساب
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    },

    exportAnalyticsReportExcel() {
        if (!window.Reports) return;
        Reports.exportAnalyticsStatisticsReport({}, this.analyticsStatsData);
    },

    exportFinancialReportExcel() {
        if (!window.Reports) return;
        Reports.exportComprehensiveFinancialReport({}, this.financialReportData);
    },

    exportProcurementReportExcel() {
        if (!window.Reports) return;
        Reports.exportProcurementReport({}, this.procurementOrders);
    },

    exportPatientVisitsReportExcel() {
        if (!window.Reports) return;
        Reports.exportPatientVisitsAndProceduresReport({}, this.patientVisits);
    },

    getMockPatientVisits() {
        return [
            { id: 'pv_1', patient_file_no: 'FL-1001', patient_name: 'أحمد محمود السعيد', patient_phone: '01012345678', patient_age: 42, patient_gender: 'male', date: '2026-11-15', time_slot: '10:30', doctor_name: 'د. أحمد الشناوي', clinic_name: 'عيادات الشفاء', branch_name: 'فرع المعادي الرئيسي', procedure_name: 'كشف استشاري باطنة + رسم قلب ECG', diagnosis: 'ارتفاع ضغط دم غير منتظم واجهاد', prescription: 'كونكور 5 مجم صباحاً + أسبرين أطفال يومياً', procedure_cost: 350, payment_type: 'cash', discount_percentage: 0, status: 'completed' },
            { id: 'pv_2', patient_file_no: 'FL-1002', patient_name: 'سارة عبد الرحمن', patient_phone: '01123456789', patient_age: 28, patient_gender: 'female', date: '2026-11-15', time_slot: '11:15', doctor_name: 'د. سارة محمود', clinic_name: 'عيادات الشفاء', branch_name: 'فرع المعادي الرئيسي', procedure_name: 'كشف أطفال + جلسة استنشاق نبيولايزر', diagnosis: 'نوبة حساسية صدرية والتهاب شعبي', prescription: 'فنتولين جلسات + مضاد حيوي شراب', procedure_cost: 280, payment_type: 'corporate', contract_name: 'شركة مصر للتأمين', discount_percentage: 20, status: 'completed' },
            { id: 'pv_3', patient_file_no: 'FL-1003', patient_name: 'محمود عبد الرازق', patient_phone: '01234567890', patient_age: 55, patient_gender: 'male', date: '2026-11-14', time_slot: '12:00', doctor_name: 'د. كريم عبد العزيز', clinic_name: 'عيادات الشفاء', branch_name: 'فرع المعادي الرئيسي', procedure_name: 'كشف عظام + حقن مفصل الركبة الموضعي', diagnosis: 'خشونة متقدمة بمفصل الركبة اليمنى', prescription: 'مضاد التهاب وكبسولات جيلوكوزامين', procedure_cost: 500, payment_type: 'corporate', contract_name: 'نقابة المهندسين', discount_percentage: 25, status: 'completed' },
            { id: 'pv_4', patient_file_no: 'FL-1004', patient_name: 'منى إبراهيم خليل', patient_phone: '01567890123', patient_age: 34, patient_gender: 'female', date: '2026-11-14', time_slot: '13:30', doctor_name: 'د. أحمد الشناوي', clinic_name: 'عيادات الشفاء', branch_name: 'فرع المعادي الرئيسي', procedure_name: 'فحص سونار تلفزيوني على البطن والحوض', diagnosis: 'دهون خفيفة على الكبد وتغيرات روتينية', prescription: 'حمية غذائية ومكمل غذائي للكبد', procedure_cost: 400, payment_type: 'cash', discount_percentage: 0, status: 'completed' },
            { id: 'pv_5', patient_file_no: 'FL-1005', patient_name: 'ياسر عصام مصطفى', patient_phone: '01099887766', patient_age: 39, patient_gender: 'male', date: '2026-11-13', time_slot: '14:45', doctor_name: 'د. سارة محمود', clinic_name: 'عيادات الشفاء', branch_name: 'فرع المعادي الرئيسي', procedure_name: 'كشف طبي دوري ومتابعة نمو', diagnosis: 'صحة عامة ممتازة ونمو طبيعي', prescription: 'فيتامينات متعددة ومعادن', procedure_cost: 200, payment_type: 'corporate', contract_name: 'أكسا للتأمين الطبي (AXA)', discount_percentage: 15, status: 'completed' }
        ];
    },

    getMockFinancialReportData() {
        return {
            totalCash: 86400,
            totalCorporate: 48900,
            totalExpenses: 34200,
            doctorCommissions: 42000,
            netProfit: 59100,
            transactions: [
                { ref_no: 'TX-101', date: '2026-11-15', type: 'income', description: 'إيراد كشوفات الخزينة النقدية (وردية الصباح)', account: 'الخزينة النقدية الرئيسية', credit: 14200, debit: 0, balance: 14200, authorized_by: 'المحاسب المالي' },
                { ref_no: 'TX-102', date: '2026-11-15', type: 'corporate_claim', description: 'مطالبة كشوفات تعاقد شركة مصر للتأمين', account: 'حساب العملاء والشركات', credit: 8600, debit: 0, balance: 22800, authorized_by: 'المحاسب المالي' },
                { ref_no: 'TX-103', date: '2026-11-14', type: 'expense', description: 'سداد دفعة توريد مستلزمات طبية وسرنجات معقمة', account: 'مستلزمات ومشتريات طبية', credit: 0, debit: 6500, balance: 16300, authorized_by: 'المدير العام' },
                { ref_no: 'TX-104', date: '2026-11-14', type: 'expense', description: 'سداد عمولات وكشوفات الأطباء الاستشاريين', account: 'مستحقات الأطباء', credit: 0, debit: 11000, balance: 5300, authorized_by: 'المحاسب المالي' },
                { ref_no: 'TX-105', date: '2026-11-13', type: 'income', description: 'إيراد كشوفات الخزينة النقدية (وردية المساء)', account: 'الخزينة النقدية الرئيسية', credit: 18500, debit: 0, balance: 23800, authorized_by: 'المحاسب المالي' },
                { ref_no: 'TX-106', date: '2026-11-13', type: 'corporate_claim', description: 'مطالبة كشوفات نقابة المهندسين والخدمات البترولية', account: 'حساب العملاء والشركات', credit: 12400, debit: 0, balance: 36200, authorized_by: 'المحاسب المالي' }
            ]
        };
    },

    getMockProcurementOrders() {
        return [
            {
                po_number: 'PO-2026-081',
                supplier_name: 'شركة الفا ميديكال للمستلزمات الطبية',
                supplier_phone: '01011223344',
                order_date: '2026-11-10',
                delivery_date: '2026-11-12',
                items_count: 3,
                total_amount: 14500,
                paid_amount: 14500,
                remaining_amount: 0,
                payment_status: 'paid',
                delivery_status: 'delivered',
                tax_invoice_no: 'INV-TAX-9981'
            },
            {
                po_number: 'PO-2026-082',
                supplier_name: 'مؤسسة الشروق للأدوية والمحاليل الوريدية',
                supplier_phone: '01122334455',
                order_date: '2026-11-08',
                delivery_date: '2026-11-11',
                items_count: 2,
                total_amount: 22000,
                paid_amount: 12000,
                remaining_amount: 10000,
                payment_status: 'partial',
                delivery_status: 'delivered',
                tax_invoice_no: 'INV-TAX-8840'
            },
            {
                po_number: 'PO-2026-083',
                supplier_name: 'شركة النيل للكيماويات والمطهرات الطبية',
                supplier_phone: '01233445566',
                order_date: '2026-11-05',
                delivery_date: '2026-11-07',
                items_count: 2,
                total_amount: 8800,
                paid_amount: 8800,
                remaining_amount: 0,
                payment_status: 'paid',
                delivery_status: 'delivered',
                tax_invoice_no: 'INV-TAX-7721'
            }
        ];
    },

    getMockAnalyticsStatsData() {
        return {
            totalVisits: 348,
            attendanceRate: 94,
            corporateShare: 46,
            cashShare: 54,
            avgWaitTime: 12,
            csatRating: 4.9,
            doctorBreakdown: [
                { name: 'د. أحمد الشناوي', specialty: 'استشاري باطنة وقلب', cases_count: 142, revenue: 49700 },
                { name: 'د. سارة محمود', specialty: 'أخصائي أطفال وحديثي ولادة', cases_count: 118, revenue: 33040 },
                { name: 'د. كريم عبد العزيز', specialty: 'استشاري جراحة عظام ومفاصل', cases_count: 88, revenue: 44000 }
            ],
            topProcedures: [
                { name: 'كشف استشاري وفحص سريري', clinic: 'باطنة وأطفال وعظام', count: 260, total_revenue: 65000, share_percentage: 51 },
                { name: 'تخطيط قلب كهربائي ECG', clinic: 'عيادة القلب والباطنة', count: 48, total_revenue: 14400, share_percentage: 11 },
                { name: 'فحص سونار بطن وحوض', clinic: 'باطنة وجهاز هضمي', count: 32, total_revenue: 12800, share_percentage: 10 },
                { name: 'حقن مفصل الركبة الموضعي', clinic: 'عيادة العظام', count: 24, total_revenue: 12000, share_percentage: 9 },
                { name: 'جلسات استنشاق وتوسيع شعب', clinic: 'عيادة الأطفال', count: 38, total_revenue: 7600, share_percentage: 6 }
            ]
        };
    },

    // =========================================================================
    // موديول المعمل والتحاليل الطبية (LIS - Laboratory Information System)
    // =========================================================================
    renderLabOrders(customList) {
        const tbody = document.getElementById('lab-orders-table-body');
        if (!tbody) return;

        const list = customList || this.labOrders;
        if (!list || list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-xs text-slate-400">لا توجد عينات أو تحاليل مسجلة حالياً.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(order => {
            let statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">بانتظار السحب</span>';
            if (order.status === 'in_progress') {
                statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">قيد التحليل</span>';
            } else if (order.status === 'verified') {
                statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">معتمدة ومكتملة</span>';
            }

            let flagBadge = '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">طبيعي Normal</span>';
            if (order.flag === 'panic') {
                flagBadge = '<span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-600 text-white animate-pulse">🚨 حرج Panic</span>';
            } else if (order.flag === 'high') {
                flagBadge = '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">مرتفع High</span>';
            } else if (order.flag === 'low') {
                flagBadge = '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">منخفض Low</span>';
            }

            let tubeBadgeClass = 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300';
            if (order.tube_type.includes('أصفر') || order.tube_type.includes('Yellow') || order.tube_type.includes('Serum')) {
                tubeBadgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
            } else if (order.tube_type.includes('أزرق') || order.tube_type.includes('Blue')) {
                tubeBadgeClass = 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300';
            }

            return `
                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td class="py-3 px-3">
                        <div class="font-mono font-bold text-cyan-700 dark:text-cyan-400 text-xs">${order.sample_id}</div>
                        <div class="text-[10px] text-slate-400 font-mono">${order.sample_date}</div>
                    </td>
                    <td class="py-3 px-3">
                        <div class="font-bold text-slate-900 dark:text-white">${order.patient_name}</div>
                        <div class="text-[11px] text-slate-400 font-mono">${order.patient_phone} • ${order.patient_age} سنة</div>
                    </td>
                    <td class="py-3 px-3">
                        <div class="font-bold text-slate-800 dark:text-slate-200">${order.test_name}</div>
                        <div class="text-[10px] text-slate-400">${order.parameters ? order.parameters.length + ' بارامترات' : 'فحص مجمع'}</div>
                    </td>
                    <td class="py-3 px-3">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${tubeBadgeClass}">${order.tube_type}</span>
                    </td>
                    <td class="py-3 px-3">
                        <div class="text-xs text-slate-700 dark:text-slate-300">${order.doctor_name}</div>
                    </td>
                    <td class="py-3 px-3">
                        <div class="font-mono font-bold text-emerald-600 dark:text-emerald-400">${Utils.formatCurrency(order.cost)}</div>
                        <div class="text-[10px] text-slate-400">${order.payment_type === 'corporate' ? 'تعاقد (' + (order.contract_name || 'تأمين') + ')' : 'سداد نقدي'}</div>
                    </td>
                    <td class="py-3 px-3">
                        <div class="flex flex-col gap-1 items-start">
                            ${statusBadge}
                            ${flagBadge}
                        </div>
                    </td>
                    <td class="py-3 px-3 text-center">
                        <div class="flex items-center justify-center gap-1">
                            <button onclick="ClinicAdminApp.openLabBarcodeModal('${order.id}')" title="طباعة ملصق الباركود الحراري للأنبوبة" class="btn-press p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                                🏷️
                            </button>
                            <button onclick="ClinicAdminApp.openLabResultsModal('${order.id}')" title="إدخال ومراجعة النتائج والبارامترات" class="btn-press p-1.5 rounded-lg text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950">
                                📝
                            </button>
                            <button onclick="ClinicAdminApp.openLabPrintModal('${order.id}')" title="طباعة التقرير الطبي المخبري الرسمي" class="btn-press p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                                🖨️
                            </button>
                            <button onclick="ClinicAdminApp.sendLabWhatsApp('${order.id}')" title="إرسال النتيجة للمريض عبر واتساب" class="btn-press p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950">
                                💬
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    filterLabOrders() {
        const query = (document.getElementById('lab-search-input')?.value || '').toLowerCase().trim();
        const statusFilter = document.getElementById('lab-status-filter')?.value || 'all';

        const filtered = this.labOrders.filter(o => {
            const matchQuery = !query || 
                o.patient_name.toLowerCase().includes(query) || 
                o.sample_id.toLowerCase().includes(query) || 
                o.test_name.toLowerCase().includes(query) || 
                (o.patient_phone && o.patient_phone.includes(query));
            
            let matchStatus = true;
            if (statusFilter === 'panic') {
                matchStatus = o.flag === 'panic';
            } else if (statusFilter !== 'all') {
                matchStatus = o.status === statusFilter;
            }

            return matchQuery && matchStatus;
        });

        this.renderLabOrders(filtered);
    },

    populateLabCatalogSelect() {
        const select = document.getElementById('lab-order-test-select');
        if (!select) return;

        select.innerHTML = this.labCatalog.map(item => `
            <option value="${item.key}" data-tube="${item.tube}" data-cost="${item.cost}">${item.name} (${Utils.formatCurrency(item.cost)})</option>
        `).join('');

        if (this.labCatalog.length > 0) {
            this.onLabTestSelected(this.labCatalog[0].key);
        }

        const contractSelect = document.getElementById('lab-order-contract-select');
        if (contractSelect && this.contracts) {
            contractSelect.innerHTML = this.contracts.map(c => `
                <option value="${c.id}">${c.company_name} (تحمل ${c.copay_percentage || 20}%)</option>
            `).join('');
        }
    },

    onLabTestSelected(testKey) {
        const item = this.labCatalog.find(c => c.key === testKey);
        if (!item) return;

        const tubeInput = document.getElementById('lab-order-tube-type');
        const costInput = document.getElementById('lab-order-cost-input');
        if (tubeInput) tubeInput.value = item.tube;
        if (costInput) costInput.value = item.cost;
    },

    toggleLabPaymentContract(val) {
        const row = document.getElementById('lab-order-contract-row');
        if (row) {
            row.classList.toggle('hidden', val !== 'corporate');
        }
    },

    openNewLabOrderModal() {
        const modal = document.getElementById('lab-order-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    },

    openLabBarcodeModal(orderId) {
        const order = this.labOrders.find(o => o.id === orderId);
        if (!order) return;

        const modal = document.getElementById('lab-barcode-modal');
        if (!modal) return;

        document.getElementById('barcode-patient-name').textContent = order.patient_name;
        document.getElementById('barcode-patient-info').textContent = `${order.patient_age} سنة • ${order.patient_gender === 'female' ? 'أنثى' : 'ذكر'}`;
        document.getElementById('barcode-test-name').textContent = order.test_name;
        document.getElementById('barcode-tube-cap').textContent = order.tube_type;
        document.getElementById('barcode-sample-id').textContent = order.sample_id;
        document.getElementById('barcode-timestamp').textContent = `${order.sample_date} 10:30 AM`;

        modal.classList.remove('hidden');
    },

    openLabResultsModal(orderId) {
        const order = this.labOrders.find(o => o.id === orderId);
        if (!order) return;

        const modal = document.getElementById('lab-results-modal');
        if (!modal) return;

        document.getElementById('lab-results-active-order-id').value = order.id;
        document.getElementById('lab-results-modal-subtitle').textContent = `عينة رقم: ${order.sample_id} | المريض: ${order.patient_name} (${order.test_name})`;
        document.getElementById('lab-results-comment').value = order.comment || '';
        document.getElementById('lab-results-approve-check').checked = order.status === 'verified';

        const tbody = document.getElementById('lab-results-parameters-tbody');
        if (tbody) {
            if (!order.parameters || order.parameters.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-400">لا توجد معايير فردية مسجلة لهذا الفحص.</td></tr>`;
            } else {
                tbody.innerHTML = order.parameters.map((param, idx) => {
                    let flagBadge = '<span class="text-[10px] text-slate-400">طبيعي</span>';
                    if (param.flag === 'panic') flagBadge = '<span class="text-[10px] font-black text-rose-600 animate-pulse">🚨 حرج Panic</span>';
                    else if (param.flag === 'high') flagBadge = '<span class="text-[10px] font-bold text-rose-500">مرتفع High</span>';
                    else if (param.flag === 'low') flagBadge = '<span class="text-[10px] font-bold text-blue-500">منخفض Low</span>';

                    return `
                        <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td class="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                ${param.name}
                            </td>
                            <td class="py-2.5 px-3">
                                <input type="text" id="lab-param-input-${idx}" value="${param.value !== undefined ? param.value : param.default || ''}" class="w-24 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500">
                            </td>
                            <td class="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                                ${param.unit}
                            </td>
                            <td class="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                                ${param.ref}
                            </td>
                            <td class="py-2.5 px-3 text-center">
                                ${flagBadge}
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        modal.classList.remove('hidden');
    },

    openLabPrintModal(orderId) {
        const order = this.labOrders.find(o => o.id === orderId);
        if (!order) return;

        const modal = document.getElementById('lab-print-modal');
        if (!modal) return;

        document.getElementById('print-lab-sample-id').textContent = order.sample_id;
        document.getElementById('print-lab-date').textContent = order.sample_date;
        document.getElementById('print-lab-patient-name').textContent = order.patient_name;
        document.getElementById('print-lab-patient-info').textContent = `${order.patient_age} سنة / ${order.patient_gender === 'female' ? 'أنثى' : 'ذكر'}`;
        document.getElementById('print-lab-doctor').textContent = order.doctor_name;
        document.getElementById('print-lab-test-name').textContent = order.test_name;
        document.getElementById('print-lab-comment').textContent = order.comment || 'القيم المخبرية مطابقة للمعايير السريرية.';
        document.getElementById('print-lab-verified-by').textContent = order.verified_by || 'د. هاني عثمان (استشاري باثولوجيا إكلينيكية)';

        const tbody = document.getElementById('print-lab-results-tbody');
        if (tbody) {
            if (!order.parameters || order.parameters.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="py-3 text-center text-slate-400">فحص مخبري مكتمل وسليم.</td></tr>`;
            } else {
                tbody.innerHTML = order.parameters.map(param => {
                    let flagBadge = '<span class="text-emerald-700 font-bold">طبيعي (Normal)</span>';
                    let valClass = 'font-bold text-slate-900';
                    if (param.flag === 'panic') {
                        flagBadge = '<span class="text-rose-700 font-black">🚨 حرج (Panic)</span>';
                        valClass = 'font-black text-rose-700 underline';
                    } else if (param.flag === 'high') {
                        flagBadge = '<span class="text-rose-600 font-bold">مرتفع (High)</span>';
                        valClass = 'font-bold text-rose-600';
                    } else if (param.flag === 'low') {
                        flagBadge = '<span class="text-blue-600 font-bold">منخفض (Low)</span>';
                        valClass = 'font-bold text-blue-600';
                    }

                    return `
                        <tr>
                            <td class="py-2 px-3 font-semibold text-slate-800">${param.name}</td>
                            <td class="py-2 px-3 font-mono ${valClass}">${param.value || param.default || '—'}</td>
                            <td class="py-2 px-3 font-mono text-slate-500">${param.unit}</td>
                            <td class="py-2 px-3 font-mono text-slate-600">${param.ref}</td>
                            <td class="py-2 px-3 text-center text-[11px]">${flagBadge}</td>
                        </tr>
                    `;
                }).join('');
            }
        }

        modal.classList.remove('hidden');
    },

    sendLabWhatsApp(orderId) {
        const order = this.labOrders.find(o => o.id === orderId);
        if (!order) return;

        const phone = (order.patient_phone || '').replace(/[^0-9]/g, '');
        const patientName = order.patient_name;
        const msg = `مرحباً أستاذ/ة ${patientName}،\nنفيدكم بصدور واعتماد نتيجة فحصكم المخبري (${order.test_name}) برقم عينة (${order.sample_id}) من مختبرات الوجيه الطبية.\nيمكنكم استعراض وطباعة تقريركم الطبي المعتمد بالكامل عبر الرابط:\nhttps://hassan-wajih-ai.github.io/al-wagih-clinic/dashboards/patient/index.html\nمع تمنياتنا لكم بدوام الصحة والعافية!`;

        const waUrl = `https://wa.me/2${phone}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');
        Utils.showToast(`جاري فتح محادثة WhatsApp للمريض ${patientName}`, 'info');
    },

    exportLabReportExcel() {
        if (window.Reports && Reports.exportLabTestsReport) {
            Reports.exportLabTestsReport({}, this.labOrders);
        } else {
            Utils.showToast('جاري تصدير تقرير المعمل...', 'info');
        }
    },

    // =========================================================================
    // موديول الأشعة التشخيصية (RIS - Radiology Information System)
    // =========================================================================
    renderRadiologyStudies(customList) {
        const tbody = document.getElementById('rad-studies-table-body');
        if (!tbody) return;

        const list = customList || this.radiologyStudies;
        if (!list || list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-xs text-slate-400">لا توجد دراسات أشعة مسجلة حالياً.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(study => {
            let statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">مجدول</span>';
            if (study.status === 'drafting') {
                statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">قيد كتابة التقرير</span>';
            } else if (study.status === 'signed') {
                statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">معتمد وموقع</span>';
            }

            let modBadge = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300';
            if (study.modality === 'MRI') modBadge = 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300';
            else if (study.modality === 'CT') modBadge = 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300';
            else if (study.modality === 'Ultrasound') modBadge = 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300';

            return `
                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td class="py-3 px-3">
                        <div class="font-mono font-bold text-indigo-700 dark:text-indigo-400 text-xs">${study.study_id}</div>
                        <div class="text-[10px] text-slate-400 font-mono">${study.study_date}</div>
                    </td>
                    <td class="py-3 px-3">
                        <div class="font-bold text-slate-900 dark:text-white">${study.patient_name}</div>
                        <div class="text-[11px] text-slate-400 font-mono">${study.patient_phone}</div>
                    </td>
                    <td class="py-3 px-3">
                        <div class="flex items-center gap-1.5">
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${modBadge}">${study.modality}</span>
                            <span class="font-bold text-slate-800 dark:text-slate-200">${study.exam_name}</span>
                        </div>
                    </td>
                    <td class="py-3 px-3">
                        <span class="px-2 py-0.5 rounded text-[10px] font-medium ${study.contrast ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}">
                            ${study.contrast ? 'مع صبغة (Contrast)' : 'بدون صبغة (Plain)'}
                        </span>
                    </td>
                    <td class="py-3 px-3">
                        <div class="text-xs text-slate-700 dark:text-slate-300">${study.doctor_name}</div>
                    </td>
                    <td class="py-3 px-3">
                        <div class="font-mono font-bold text-emerald-600 dark:text-emerald-400">${Utils.formatCurrency(study.cost)}</div>
                        <div class="text-[10px] text-slate-400">${study.payment_type === 'corporate' ? 'تعاقد شركة' : 'سداد نقدي'}</div>
                    </td>
                    <td class="py-3 px-3">
                        ${statusBadge}
                    </td>
                    <td class="py-3 px-3 text-center">
                        <div class="flex items-center justify-center gap-1">
                            <button onclick="ClinicAdminApp.openRadReportModal('${study.id}')" title="كتابة ومراجعة التقرير بالقوالب الجاهزة" class="btn-press p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950">
                                📝
                            </button>
                            <button onclick="ClinicAdminApp.openRadViewerModal('${study.id}')" title="استعراض الصور الرقمية وعارض DICOM" class="btn-press p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950">
                                🖼️
                            </button>
                            <button onclick="ClinicAdminApp.openRadPrintModal('${study.id}')" title="طباعة تقرير الأشعة الرسمي" class="btn-press p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                                🖨️
                            </button>
                            <button onclick="ClinicAdminApp.sendRadWhatsApp('${study.id}')" title="إرسال التقرير للمريض عبر واتساب" class="btn-press p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950">
                                💬
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    filterRadStudies() {
        const query = (document.getElementById('rad-search-input')?.value || '').toLowerCase().trim();
        const modalityFilter = document.getElementById('rad-modality-filter')?.value || 'all';

        const filtered = this.radiologyStudies.filter(s => {
            const matchQuery = !query || 
                s.patient_name.toLowerCase().includes(query) || 
                s.study_id.toLowerCase().includes(query) || 
                s.exam_name.toLowerCase().includes(query) || 
                (s.patient_phone && s.patient_phone.includes(query));
            
            const matchModality = modalityFilter === 'all' || s.modality === modalityFilter;

            return matchQuery && matchModality;
        });

        this.renderRadiologyStudies(filtered);
    },

    populateRadExamSelect() {
        const modSelect = document.getElementById('rad-order-modality-select');
        if (modSelect) {
            this.onRadModalitySelected(modSelect.value);
        }
    },

    onRadModalitySelected(modality) {
        const examSelect = document.getElementById('rad-order-exam-select');
        const costInput = document.getElementById('rad-order-cost-input');
        if (!examSelect) return;

        const modalityExams = {
            'X-Ray': [
                { name: 'أشعة سينية على الصدر (Chest X-Ray PA)', cost: 250 },
                { name: 'أشعة عادية على مفصل الركبة (Knee AP & Lateral)', cost: 280 },
                { name: 'أشعة على الفقرات القطنية والعجزية (Lumbosacral AP & Lat)', cost: 320 },
                { name: 'أشعة على الجيوب الأنفية (PNS Water’s view)', cost: 220 }
            ],
            'MRI': [
                { name: 'رنين مغناطيسي على الفقرات القطنية (Lumbar MRI)', cost: 1200 },
                { name: 'رنين مغناطيسي على المخ (Brain MRI)', cost: 1400 },
                { name: 'رنين مغناطيسي على مفصل الركبة (Knee MRI)', cost: 1200 },
                { name: 'رنين مغناطيسي على الكتف (Shoulder MRI)', cost: 1250 }
            ],
            'CT': [
                { name: 'أشعة مقطعية على المخ (Brain CT)', cost: 850 },
                { name: 'أشعة مقطعية على الصدر (Chest CT High Resolution)', cost: 1100 },
                { name: 'أشعة مقطعية ثلاثية المراحل على البطن والحوض (Triphasic CT Abdomen)', cost: 1600 }
            ],
            'Ultrasound': [
                { name: 'سونار على البطن والحوض (Pelvi-Abdominal Ultrasound)', cost: 450 },
                { name: 'سونار ودوبلر ملون على شرايين الساقين (Lower Limb Arterial Doppler)', cost: 650 },
                { name: 'سونار على الغدة الدرقية (Thyroid Ultrasound)', cost: 400 }
            ],
            'Mammography': [
                { name: 'أشعة ماموجرام رقمية على الثديين (Bilateral Digital Mammography)', cost: 900 }
            ]
        };

        const list = modalityExams[modality] || modalityExams['X-Ray'];
        examSelect.innerHTML = list.map(item => `
            <option value="${item.name}" data-cost="${item.cost}">${item.name} (${Utils.formatCurrency(item.cost)})</option>
        `).join('');

        if (costInput && list.length > 0) {
            costInput.value = list[0].cost;
        }
    },

    onRadExamSelected(examName) {
        const examSelect = document.getElementById('rad-order-exam-select');
        const costInput = document.getElementById('rad-order-cost-input');
        if (!examSelect || !costInput) return;

        const opt = examSelect.options[examSelect.selectedIndex];
        if (opt) {
            const cost = opt.getAttribute('data-cost');
            if (cost) costInput.value = cost;
        }
    },

    openNewRadOrderModal() {
        const modal = document.getElementById('rad-order-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    },

    openRadReportModal(studyId) {
        const study = this.radiologyStudies.find(s => s.id === studyId);
        if (!study) return;

        const modal = document.getElementById('rad-report-modal');
        if (!modal) return;

        document.getElementById('rad-report-active-study-id').value = study.id;
        document.getElementById('rad-report-modal-subtitle').textContent = `دراسة رقم: ${study.study_id} | المريض: ${study.patient_name} (${study.exam_name})`;
        document.getElementById('rad-report-technique').value = study.technique || '';
        document.getElementById('rad-report-findings').value = study.findings || '';
        document.getElementById('rad-report-impression').value = study.impression || '';
        document.getElementById('rad-report-sign-doctor').value = study.radiologist_name || 'د. مروان البدري (استشاري أشعة تشخيصية)';
        document.getElementById('rad-report-signed-check').checked = study.status === 'signed';

        modal.classList.remove('hidden');
    },

    loadRadTemplate(templateKey) {
        if (!templateKey || !this.radiologyTemplates[templateKey]) return;

        const tpl = this.radiologyTemplates[templateKey];
        const techInput = document.getElementById('rad-report-technique');
        const findInput = document.getElementById('rad-report-findings');
        const impInput = document.getElementById('rad-report-impression');

        if (techInput) techInput.value = tpl.technique;
        if (findInput) findInput.value = tpl.findings;
        if (impInput) impInput.value = tpl.impression;

        Utils.showToast('تم تحميل القالب الطبي الجاهز بنجاح ⚡', 'success');
    },

    openRadViewerModal(studyId) {
        const study = this.radiologyStudies.find(s => s.id === studyId);
        if (!study) return;

        const modal = document.getElementById('rad-viewer-modal');
        if (!modal) return;

        document.getElementById('rad-viewer-title').textContent = `عارض الصور الطبية: ${study.exam_name}`;
        document.getElementById('rad-viewer-subtitle').textContent = `دراسة رقم: ${study.study_id} | ${study.modality} Study`;
        document.getElementById('rad-viewer-hud-name').textContent = study.patient_name;
        document.getElementById('rad-viewer-hud-id').textContent = study.study_id;
        document.getElementById('rad-viewer-hud-modality').textContent = study.modality;

        const img = document.getElementById('rad-viewer-img');
        if (img) {
            img.src = study.image_url || 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80';
        }

        this.resetScanViewer();
        modal.classList.remove('hidden');
    },

    toggleScanInvert() {
        const img = document.getElementById('rad-viewer-img');
        if (!img) return;

        this.scanViewerState.invert = !this.scanViewerState.invert;
        img.classList.toggle('dicom-inverted', this.scanViewerState.invert);
    },

    toggleScanContrast() {
        const img = document.getElementById('rad-viewer-img');
        if (!img) return;

        this.scanViewerState.highContrast = !this.scanViewerState.highContrast;
        img.classList.toggle('dicom-high-contrast', this.scanViewerState.highContrast);
    },

    resetScanViewer() {
        const img = document.getElementById('rad-viewer-img');
        if (!img) return;

        this.scanViewerState = { invert: false, highContrast: false };
        img.classList.remove('dicom-inverted', 'dicom-high-contrast');
    },

    openRadPrintModal(studyId) {
        const study = this.radiologyStudies.find(s => s.id === studyId);
        if (!study) return;

        const modal = document.getElementById('rad-print-modal');
        if (!modal) return;

        document.getElementById('print-rad-study-id').textContent = study.study_id;
        document.getElementById('print-rad-date').textContent = study.study_date;
        document.getElementById('print-rad-patient-name').textContent = study.patient_name;
        document.getElementById('print-rad-patient-info').textContent = `${study.patient_age || 38} سنة / ${study.patient_gender === 'female' ? 'أنثى' : 'ذكر'}`;
        document.getElementById('print-rad-exam-name').textContent = `${study.modality} - ${study.exam_name}`;
        document.getElementById('print-rad-doctor').textContent = study.doctor_name;
        document.getElementById('print-rad-technique').textContent = study.technique || 'Standard acquisition.';
        document.getElementById('print-rad-findings').textContent = study.findings || 'No acute findings.';
        document.getElementById('print-rad-impression').textContent = study.impression || 'Unremarkable study.';
        document.getElementById('print-rad-verified-by').textContent = study.radiologist_name || 'د. مروان البدري (استشاري أشعة تشخيصية)';

        modal.classList.remove('hidden');
    },

    sendRadWhatsApp(studyId) {
        const study = this.radiologyStudies.find(s => s.id === studyId);
        if (!study) return;

        const phone = (study.patient_phone || '').replace(/[^0-9]/g, '');
        const patientName = study.patient_name;
        const msg = `مرحباً أستاذ/ة ${patientName}،\nنفيدكم باعتماد تقرير فحص الأشعة (${study.exam_name}) برقم دراسة (${study.study_id}) من مركز الوجيه للأشعة التشخيصية.\nالتشخيص والانطباع الطبي:\n« ${study.impression || 'سليم وطبيعي'} »\nيمكنكم استعراض التقرير والصور الطبية عبر الرابط:\nhttps://hassan-wajih-ai.github.io/al-wagih-clinic/dashboards/patient/index.html\nمع تمنياتنا لكم بتمام الشفاء والعافية!`;

        const waUrl = `https://wa.me/2${phone}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');
        Utils.showToast(`جاري فتح محادثة WhatsApp للمريض ${patientName}`, 'info');
    },

    exportRadReportExcel() {
        if (window.Reports && Reports.exportRadiologyReport) {
            Reports.exportRadiologyReport({}, this.radiologyStudies);
        } else {
            Utils.showToast('جاري تصدير تقرير الأشعة...', 'info');
        }
    },

    // =========================================================================
    // دوال ونظام صالة الانتظار والنداء الذكي (Smart Waiting Queue System)
    // =========================================================================
    renderQueueBoard() {
        const roomsGrid = document.getElementById('admin-rooms-grid');
        const queueTbody = document.getElementById('admin-queue-table-body');
        const badge = document.getElementById('admin-waiting-badge');

        if (roomsGrid) {
            roomsGrid.innerHTML = (this.queueRooms || []).map(r => `
                <div class="card-hover p-4 rounded-2xl border transition-all ${r.status === 'busy' ? 'bg-sky-50/60 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800' : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'} space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="w-8 h-8 rounded-xl bg-sky-600 text-white font-bold text-xs flex items-center justify-center font-mono shadow-sm">${r.room_no}</span>
                            <div>
                                <h4 class="font-bold text-slate-900 dark:text-white text-xs">${r.clinic_name}</h4>
                                <p class="text-[10px] text-slate-500 dark:text-slate-400">${r.doctor_name}</p>
                            </div>
                        </div>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'busy' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}">
                            ${r.status === 'busy' ? 'غرفة كشف نشطة' : 'غرفة متاحة'}
                        </span>
                    </div>

                    <div class="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <span class="text-[10px] text-slate-400 block font-semibold">التذكرة الحالية (Now Calling)</span>
                            <strong class="text-lg font-black text-sky-600 font-mono">${r.current_ticket || '—'}</strong>
                        </div>
                        <div class="text-left">
                            <span class="text-[10px] text-slate-400 block font-semibold">المريض الحالي</span>
                            <span class="text-xs font-bold text-slate-800 dark:text-slate-200">${r.current_patient || 'لا يوجد مريض'}</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 pt-1">
                        <button onclick="ClinicAdminApp.callNextQueueVoice('${r.id}')" class="btn-press flex-1 py-1.5 px-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm">
                            <span>🔊</span> <span>نداء المريض التالي</span>
                        </button>
                        <button onclick="ClinicAdminApp.finishRoomTicket('${r.id}')" class="btn-press py-1.5 px-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition">
                            إنهاء
                        </button>
                    </div>
                </div>
            `).join('');
        }

        if (queueTbody) {
            const waiting = (this.waitingTickets || []).filter(t => t.status === 'waiting');
            if (badge) badge.textContent = `${waiting.length} تذاكر`;

            if (waiting.length === 0) {
                queueTbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="py-8 text-center text-slate-400">
                            <div class="text-2xl mb-1">🎉</div>
                            <div class="text-xs font-bold">صالة الانتظار خالية تماماً</div>
                            <div class="text-[10px] text-slate-400">تم الكشف على جميع المرضى المسجلين</div>
                        </td>
                    </tr>
                `;
            } else {
                queueTbody.innerHTML = waiting.map(t => `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td class="py-2.5 px-3">
                            <span class="font-mono font-black text-sky-600 dark:text-sky-400 text-xs">${t.ticket_no}</span>
                            <span class="mr-1 text-[9px] px-1.5 py-0.5 rounded font-bold ${t.priority === 'emergency' ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300' : t.priority === 'vip' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}">${t.priority_label || 'عادي'}</span>
                        </td>
                        <td class="py-2.5 px-3">
                            <div class="font-bold text-slate-900 dark:text-white text-xs">${t.patient_name}</div>
                            <div class="text-[10px] text-slate-400 font-mono">${t.patient_phone || '—'}</div>
                        </td>
                        <td class="py-2.5 px-3">
                            <div class="text-slate-800 dark:text-slate-200 text-xs">${t.clinic}</div>
                            <div class="text-[10px] text-slate-400">${t.doctor || 'طبيب مناوب'}</div>
                        </td>
                        <td class="py-2.5 px-3 text-center">
                            <button onclick="ClinicAdminApp.callSpecificTicket('${t.id}')" class="btn-press px-2.5 py-1 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 hover:bg-sky-600 hover:text-white rounded-lg text-xs font-bold border border-sky-200 dark:border-sky-800 transition flex items-center gap-1 mx-auto">
                                <span>🔊</span> <span>نداء</span>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    },

    callNextQueueVoice(roomId) {
        let room = (this.queueRooms || []).find(r => r.id === roomId);
        if (!room && this.queueRooms && this.queueRooms.length > 0) {
            room = this.queueRooms[0];
        }
        if (!room) return;

        let nextTicket = (this.waitingTickets || []).find(t => t.status === 'waiting' && (t.clinic.includes(room.clinic_short) || t.clinic === room.clinic_name));
        if (!nextTicket) {
            nextTicket = (this.waitingTickets || []).find(t => t.status === 'waiting');
        }

        if (nextTicket) {
            nextTicket.status = 'called';
            room.status = 'busy';
            room.current_ticket = nextTicket.ticket_no;
            room.current_patient = nextTicket.patient_name;

            this.playQueueChime();
            this.speakQueueTicket(nextTicket.ticket_no, room.clinic_short || room.clinic_name, room.room_no);

            try {
                localStorage.setItem('alwagih_queue_last_call', JSON.stringify({
                    ticket_no: nextTicket.ticket_no,
                    patient_name: nextTicket.patient_name,
                    clinic: room.clinic_name,
                    room_no: room.room_no,
                    timestamp: Date.now()
                }));
            } catch(e) {}

            Utils.showToast(`🔊 تم استدعاء التذكرة (${nextTicket.ticket_no}) للمريض: ${nextTicket.patient_name} -> ${room.clinic_name}`, 'info');
        } else {
            this.playQueueChime();
            this.speakQueueTicket(room.current_ticket || 'A-101', room.clinic_short || room.clinic_name, room.room_no);
            Utils.showToast(`تم إعادة النداء للغرفة (${room.room_no})`, 'info');
        }

        this.renderQueueBoard();
        this.updateKPIs();
    },

    callSpecificTicket(ticketId) {
        const ticket = (this.waitingTickets || []).find(t => t.id === ticketId);
        if (!ticket) return;

        let room = (this.queueRooms || []).find(r => r.clinic_name === ticket.clinic || ticket.clinic.includes(r.clinic_short));
        if (!room && this.queueRooms && this.queueRooms.length > 0) room = this.queueRooms[0];

        ticket.status = 'called';
        if (room) {
            room.status = 'busy';
            room.current_ticket = ticket.ticket_no;
            room.current_patient = ticket.patient_name;
        }

        const roomNo = room ? room.room_no : '101';
        this.playQueueChime();
        this.speakQueueTicket(ticket.ticket_no, ticket.clinic, roomNo);

        try {
            localStorage.setItem('alwagih_queue_last_call', JSON.stringify({
                ticket_no: ticket.ticket_no,
                patient_name: ticket.patient_name,
                clinic: ticket.clinic,
                room_no: roomNo,
                timestamp: Date.now()
            }));
        } catch(e) {}

        Utils.showToast(`🔊 تم استدعاء التذكرة (${ticket.ticket_no}) للمريض: ${ticket.patient_name}`, 'info');
        this.renderQueueBoard();
        this.updateKPIs();
    },

    finishRoomTicket(roomId) {
        const room = (this.queueRooms || []).find(r => r.id === roomId);
        if (!room) return;

        Utils.showToast(`تم إنهاء فحص التذكرة (${room.current_ticket}) في غرفة ${room.room_no}`, 'success');
        room.status = 'idle';
        room.current_ticket = '—';
        room.current_patient = '—';
        this.renderQueueBoard();
        this.updateKPIs();
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

    speakQueueTicket(ticketNo, clinicName, roomNo) {
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

    openNewQueueTicketModal() {
        const modal = document.getElementById('queue-ticket-modal');
        if (modal) modal.classList.remove('hidden');
    },

    // =========================================================================
    // دوال ونظام عمولات وتسويات الأطباء (Doctor Commissions & Splits)
    // =========================================================================
    recalcDoctorCommission(doc) {
        const consultDoc = (doc.consultation_revenue * doc.consult_split_pct) / 100;
        const procDoc = (doc.procedure_revenue * doc.procedure_split_pct) / 100;
        const labDoc = (doc.lab_referrals_revenue * doc.lab_comm_pct) / 100;
        const radDoc = (doc.rad_referrals_revenue * doc.rad_comm_pct) / 100;
        const grossDoctor = consultDoc + procDoc + labDoc + radDoc;

        const deductions = (doc.procedure_revenue * doc.deduction_pct) / 100;
        const net = Math.max(0, grossDoctor - deductions);

        doc.doctor_gross = grossDoctor;
        doc.consultation_amount = consultDoc;
        doc.procedure_amount = procDoc;
        doc.referrals_amount = labDoc + radDoc;
        doc.deductions_amount = deductions;
        doc.deductions = deductions;
        doc.net_payable = net;
        doc.net_payout = net;
        doc.clinic_share = doc.gross_revenue - grossDoctor + deductions;
    },

    renderDoctorCommissions(customList) {
        const tbody = document.getElementById('doctor-commissions-table-body');
        const countEl = document.getElementById('comm-table-count');
        if (!tbody) return;

        const list = customList || this.doctorCommissions || [];
        if (countEl) countEl.textContent = `${list.length} طبيب`;

        if (list.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="py-8 text-center text-slate-400">
                        <div class="text-2xl mb-1">🔍</div>
                        <div class="text-xs font-bold">لا توجد تسويات أو عمولات مطابقة للبحث</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = list.map(doc => `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td class="py-3 px-3">
                    <div class="font-bold text-slate-900 dark:text-white text-xs">${doc.doctor_name}</div>
                    <div class="text-[10px] text-slate-400">${doc.specialty} — غرفة ${doc.room}</div>
                </td>
                <td class="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">${doc.cases_count} حالة</td>
                <td class="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white text-xs">${Utils.formatCurrency(doc.gross_revenue)}</td>
                <td class="py-3 px-3">
                    <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">${doc.consult_split_pct}%</span>
                    <span class="text-[10px] text-slate-400 block">${Utils.formatCurrency(doc.consultation_amount || ((doc.consultation_revenue * doc.consult_split_pct) / 100))}</span>
                </td>
                <td class="py-3 px-3">
                    <span class="text-xs font-bold text-sky-600 dark:text-sky-400 font-mono">${doc.procedure_split_pct}%</span>
                    <span class="text-[10px] text-slate-400 block">${Utils.formatCurrency(doc.procedure_amount || ((doc.procedure_revenue * doc.procedure_split_pct) / 100))}</span>
                </td>
                <td class="py-3 px-3">
                    <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">${doc.lab_comm_pct}% LIS / ${doc.rad_comm_pct}% RIS</span>
                    <span class="text-[10px] text-slate-400 block">${Utils.formatCurrency(doc.referrals_amount || (((doc.lab_referrals_revenue * doc.lab_comm_pct) + (doc.rad_referrals_revenue * doc.rad_comm_pct)) / 100))}</span>
                </td>
                <td class="py-3 px-3 font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                    -${Utils.formatCurrency(doc.deductions_amount || doc.deductions || 0)}
                    <span class="text-[10px] text-slate-400 block">${doc.deduction_pct}% مستهلكات</span>
                </td>
                <td class="py-3 px-3 font-mono font-black text-emerald-700 dark:text-emerald-300 text-xs">
                    ${Utils.formatCurrency(doc.net_payable)}
                </td>
                <td class="py-3 px-3">
                    ${doc.status === 'paid'
                        ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">✓ تم الصرف (${doc.payment_date || doc.paid_date || 'نوفمبر'})</span>`
                        : `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">⏳ مستحق للصرف</span>`
                    }
                </td>
                <td class="py-3 px-3">
                    <div class="flex items-center justify-center gap-1.5">
                        <button onclick="ClinicAdminApp.openDoctorStatementModal('${doc.id}')" title="كشف حساب رسمي معتمد للطباعة" class="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition">
                            📑
                        </button>
                        <button onclick="ClinicAdminApp.openCommissionRulesModal('${doc.id}')" title="تعديل نسب وقواعد الطبيب" class="p-1.5 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 transition">
                            ⚙️
                        </button>
                        ${doc.status !== 'paid' ? `
                        <button onclick="ClinicAdminApp.openDoctorPayoutModal('${doc.id}')" title="صرف وتسوية المستحقات" class="px-2.5 py-1 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center gap-1 transition">
                            <span>💵</span> <span>صرف</span>
                        </button>
                        ` : `
                        <button onclick="ClinicAdminApp.openDoctorPayoutReceipt('${doc.id}')" title="عرض إيصال وسند الصرف" class="px-2 py-1 rounded-xl text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800">
                            سند #${doc.voucher_no || 'VCH'}
                        </button>
                        `}
                    </div>
                </td>
            </tr>
        `).join('');
    },

    filterDoctorCommissions() {
        const query = (document.getElementById('comm-search-input')?.value || '').toLowerCase().trim();
        const status = document.getElementById('comm-status-filter')?.value || 'all';

        const filtered = (this.doctorCommissions || []).filter(doc => {
            const matchQuery = !query || doc.doctor_name.toLowerCase().includes(query) || doc.specialty.toLowerCase().includes(query);
            const matchStatus = status === 'all' || doc.status === status;
            return matchQuery && matchStatus;
        });

        this.renderDoctorCommissions(filtered);
    },

    openCommissionRulesModal(docId) {
        let doc = (this.doctorCommissions || []).find(d => d.id === docId);
        if (!doc && this.doctorCommissions && this.doctorCommissions.length > 0) doc = this.doctorCommissions[0];
        if (!doc) return;

        document.getElementById('rules-doctor-id').value = doc.id;
        document.getElementById('rules-doctor-name').value = `${doc.doctor_name} (${doc.specialty})`;
        document.getElementById('rules-consult-split').value = doc.consult_split_pct;
        document.getElementById('rules-procedure-split').value = doc.procedure_split_pct;
        document.getElementById('rules-lab-comm').value = doc.lab_comm_pct;
        document.getElementById('rules-rad-comm').value = doc.rad_comm_pct;
        document.getElementById('rules-deduction-rate').value = doc.deduction_pct;

        document.getElementById('doctor-commission-rules-modal').classList.remove('hidden');
    },

    openDoctorStatementModal(docId) {
        const doc = (this.doctorCommissions || []).find(d => d.id === docId);
        if (!doc) return;

        document.getElementById('stmt-number').textContent = `STMT-2026-0${doc.id.replace('doc_', '')}`;
        document.getElementById('stmt-date').textContent = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('stmt-doctor-name').textContent = doc.doctor_name;
        document.getElementById('stmt-doctor-spec').textContent = doc.specialty;
        document.getElementById('stmt-doctor-room').textContent = `غرفة ${doc.room}`;
        document.getElementById('stmt-doctor-status').textContent = doc.status === 'paid' ? 'تم الصرف والتسوية (Paid)' : 'جاهز للصرف المالي (Pending)';
        document.getElementById('stmt-sign-doctor-name').textContent = doc.doctor_name;

        document.getElementById('stmt-gross-rev').textContent = Utils.formatCurrency(doc.gross_revenue);
        document.getElementById('stmt-deductions').textContent = `-${Utils.formatCurrency(doc.deductions_amount)}`;
        document.getElementById('stmt-net-pay').textContent = Utils.formatCurrency(doc.net_payable);

        const linesTable = document.getElementById('stmt-table-lines');
        if (linesTable) {
            linesTable.innerHTML = `
                <tr>
                    <td class="py-2.5 px-3 font-semibold">كشوفات واستشارات العيادة</td>
                    <td class="py-2.5 px-3 font-mono">${Math.round(doc.cases_count * 0.7)} كشف</td>
                    <td class="py-2.5 px-3 font-mono">${Utils.formatCurrency(doc.consultation_revenue)}</td>
                    <td class="py-2.5 px-3 font-mono font-bold text-indigo-700">${doc.consult_split_pct}%</td>
                    <td class="py-2.5 px-3 font-mono font-bold text-left text-slate-900">${Utils.formatCurrency((doc.consultation_revenue * doc.consult_split_pct) / 100)}</td>
                </tr>
                <tr>
                    <td class="py-2.5 px-3 font-semibold">إجراءات وجراحات العيادة</td>
                    <td class="py-2.5 px-3 font-mono">${Math.round(doc.cases_count * 0.3)} إجراء</td>
                    <td class="py-2.5 px-3 font-mono">${Utils.formatCurrency(doc.procedure_revenue)}</td>
                    <td class="py-2.5 px-3 font-mono font-bold text-sky-700">${doc.procedure_split_pct}%</td>
                    <td class="py-2.5 px-3 font-mono font-bold text-left text-slate-900">${Utils.formatCurrency((doc.procedure_revenue * doc.procedure_split_pct) / 100)}</td>
                </tr>
                <tr>
                    <td class="py-2.5 px-3 font-semibold">عمولات إحالات التحاليل الطبية (LIS)</td>
                    <td class="py-2.5 px-3 font-mono">14 إحالة</td>
                    <td class="py-2.5 px-3 font-mono">${Utils.formatCurrency(doc.lab_referrals_revenue)}</td>
                    <td class="py-2.5 px-3 font-mono font-bold text-emerald-700">${doc.lab_comm_pct}%</td>
                    <td class="py-2.5 px-3 font-mono font-bold text-left text-slate-900">${Utils.formatCurrency((doc.lab_referrals_revenue * doc.lab_comm_pct) / 100)}</td>
                </tr>
                <tr>
                    <td class="py-2.5 px-3 font-semibold">عمولات إحالات مركز الأشعة (RIS)</td>
                    <td class="py-2.5 px-3 font-mono">9 إحالات</td>
                    <td class="py-2.5 px-3 font-mono">${Utils.formatCurrency(doc.rad_referrals_revenue)}</td>
                    <td class="py-2.5 px-3 font-mono font-bold text-teal-700">${doc.rad_comm_pct}%</td>
                    <td class="py-2.5 px-3 font-mono font-bold text-left text-slate-900">${Utils.formatCurrency((doc.rad_referrals_revenue * doc.rad_comm_pct) / 100)}</td>
                </tr>
                <tr class="bg-rose-50/50">
                    <td class="py-2.5 px-3 font-semibold text-rose-700">استقطاع مستهلكات ومواد العمليات</td>
                    <td class="py-2.5 px-3 font-mono text-rose-700">—</td>
                    <td class="py-2.5 px-3 font-mono text-rose-700">—</td>
                    <td class="py-2.5 px-3 font-mono font-bold text-rose-700">-${doc.deduction_pct}%</td>
                    <td class="py-2.5 px-3 font-mono font-bold text-left text-rose-700">-${Utils.formatCurrency(doc.deductions_amount)}</td>
                </tr>
            `;
        }

        document.getElementById('doctor-statement-modal').classList.remove('hidden');
    },

    openDoctorPayoutModal(docId) {
        const doc = (this.doctorCommissions || []).find(d => d.id === docId);
        if (!doc) return;

        document.getElementById('payout-doctor-id').value = doc.id;
        document.getElementById('payout-doc-name-display').textContent = `${doc.doctor_name} (${doc.specialty})`;
        document.getElementById('payout-amount-display').textContent = Utils.formatCurrency(doc.net_payable);
        document.getElementById('payout-reference-no').value = `VCH-${Date.now().toString().slice(-4)}`;

        document.getElementById('doctor-payout-modal').classList.remove('hidden');
    },

    openDoctorPayoutReceipt(docId) {
        const doc = (this.doctorCommissions || []).find(d => d.id === docId);
        if (!doc) return;
        Utils.showToast(`سند الصرف #${doc.voucher_no || doc.receipt_no || 'VCH'} بقيمة ${Utils.formatCurrency(doc.net_payable)} مصروف عبر (${doc.payment_method || 'الخزينة'})`, 'info');
    },

    exportDoctorCommissionsExcel() {
        if (window.Reports && Reports.exportDoctorCommissionsReport) {
            Reports.exportDoctorCommissionsReport({
                date: new Date().toLocaleDateString('ar-EG'),
                filterStatus: document.getElementById('comm-status-filter')?.value || 'all'
            }, this.doctorCommissions);
        } else {
            Utils.showToast('جاري تصدير شيت عمولات الأطباء...', 'info');
        }
    },

    // =========================================================================
    // دوال ونظام الصيدلية والروشتات الإلكترونية للمدير (Pharmacy Management)
    // =========================================================================
    renderAdminPharmacy(customDrugsList) {
        const drugsTbody = document.getElementById('admin-pharmacy-drugs-table-body');
        const rxTbody = document.getElementById('admin-pharmacy-rx-table-body');
        const drugsCountEl = document.getElementById('admin-pharm-drugs-count');
        const rxCountEl = document.getElementById('admin-pharm-rx-count');

        const drugs = customDrugsList || this.pharmacyDrugs || [];
        const rxs = this.pharmacyPrescriptions || [];
        const today = new Date();

        if (drugsCountEl) drugsCountEl.textContent = `${drugs.length} صنف`;
        if (rxCountEl) rxCountEl.textContent = `${rxs.length} روشتة`;

        if (drugsTbody) {
            if (drugs.length === 0) {
                drugsTbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400 text-xs">لا توجد أصناف مطابقة للبحث</td></tr>`;
            } else {
                drugsTbody.innerHTML = drugs.map(drug => {
                    const expDate = new Date(drug.expiry_date);
                    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
                    let expBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">ساري</span>`;
                    if (diffDays <= 0) {
                        expBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">منتهي الصلاحية</span>`;
                        drug.expiry_status = 'expired';
                    } else if (diffDays <= 90) {
                        expBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">ينتهي خلال ${diffDays} يوم</span>`;
                        drug.expiry_status = 'expiring_soon';
                    } else {
                        drug.expiry_status = 'valid';
                    }

                    const isLowStock = (drug.stock_qty || 0) <= (drug.reorder_level || 10);

                    return `
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                            <td class="py-2.5 px-3">
                                <div class="font-bold text-slate-900 dark:text-white text-xs">${drug.name}</div>
                                <div class="text-[10px] text-slate-400 font-mono">${drug.strength} - ${drug.dosage_form}</div>
                            </td>
                            <td class="py-2.5 px-3">${expBadge}</td>
                            <td class="py-2.5 px-3">
                                <span class="font-mono font-bold text-xs ${isLowStock ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}">
                                    ${drug.stock_qty} علبة
                                </span>
                            </td>
                            <td class="py-2.5 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-300 text-xs">
                                ${Utils.formatCurrency(drug.selling_price)}
                            </td>
                            <td class="py-2.5 px-3 text-center">
                                <button onclick="ClinicAdminApp.adminRestockDrug('${drug.id}')" class="px-2 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition">
                                    + توريد
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        if (rxTbody) {
            rxTbody.innerHTML = rxs.map(rx => `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td class="py-2.5 px-3">
                        <span class="font-mono font-bold text-sky-600 dark:text-sky-400 text-xs">${rx.rx_number}</span>
                        <div class="text-[10px] text-slate-400">${rx.items ? rx.items.length : 1} أصناف</div>
                    </td>
                    <td class="py-2.5 px-3">
                        <div class="font-bold text-slate-900 dark:text-white text-xs">${rx.patient_name}</div>
                        <div class="text-[10px] text-slate-400">${rx.doctor_name}</div>
                    </td>
                    <td class="py-2.5 px-3">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${rx.status === 'dispensed' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'}">
                            ${rx.status === 'dispensed' ? '✓ تم الصرف' : '⏳ قيد الصرف'}
                        </span>
                    </td>
                    <td class="py-2.5 px-3 text-center">
                        <button onclick="ClinicAdminApp.openAdminRxDetailsModal('${rx.id}')" class="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                            👁️
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    },

    adminRestockDrug(drugId) {
        const drug = this.pharmacyDrugs.find(d => d.id === drugId);
        if (!drug) return;
        drug.stock_qty = (drug.stock_qty || 0) + 20;
        Utils.showToast(`تم زيادة رصيد (${drug.name}) بمقدار +20 علبة بنجاح`, 'success');
        this.renderAdminPharmacy();
        this.updateKPIs();
    },

    filterAdminPharmacy() {
        const query = (document.getElementById('admin-pharm-search-input')?.value || '').toLowerCase().trim();
        const filterType = document.getElementById('admin-pharm-filter-type')?.value || 'all';

        const filtered = (this.pharmacyDrugs || []).filter(d => {
            const matchQuery = !query || d.name.toLowerCase().includes(query) || (d.generic_name && d.generic_name.toLowerCase().includes(query));
            let matchType = true;
            if (filterType === 'low_stock') matchType = (d.stock_qty || 0) <= (d.reorder_level || 10);
            else if (filterType === 'expiring_soon') matchType = d.expiry_status === 'expiring_soon' || d.expiry_status === 'expired';
            return matchQuery && matchType;
        });

        this.renderAdminPharmacy(filtered);
    },

    openAdminAddDrugModal() {
        const modal = document.getElementById('admin-add-drug-modal');
        if (modal) modal.classList.remove('hidden');
    },

    openAdminRxDetailsModal(rxId) {
        const rx = this.pharmacyPrescriptions.find(r => r.id === rxId);
        if (!rx) return;

        document.getElementById('admin-rx-modal-title').textContent = `روشتة طبية #${rx.rx_number}`;
        document.getElementById('admin-rx-modal-subtitle').textContent = `المريض: ${rx.patient_name} | الطبيب: ${rx.doctor_name}`;

        const content = document.getElementById('admin-rx-modal-content');
        if (content) {
            content.innerHTML = `
                <div class="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div class="flex justify-between"><span>العيادة:</span><strong>${rx.clinic_name}</strong></div>
                    <div class="flex justify-between"><span>تاريخ الإنشاء:</span><span class="font-mono">${rx.created_time || 'اليوم'}</span></div>
                    <div class="flex justify-between"><span>نوع الدفع:</span><strong>${rx.payment_type === 'corporate' ? `تأمين (${rx.company_name})` : 'نقدي'}</strong></div>
                    <div class="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1 font-bold">
                        <span>إجمالي القيمة:</span>
                        <span class="font-mono text-emerald-600">${Utils.formatCurrency(rx.total_amount)}</span>
                    </div>
                </div>

                <div class="space-y-1 text-xs">
                    <span class="font-bold text-slate-700 dark:text-slate-300 block">الأدوية الموصوفة والجرعات:</span>
                    ${rx.items.map(it => `
                        <div class="p-2.5 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <strong class="text-slate-900 dark:text-white block">${it.drug_name}</strong>
                                <span class="text-[10px] text-slate-400">${it.instructions || it.dosage}</span>
                            </div>
                            <span class="font-mono font-bold text-emerald-600">${Utils.formatCurrency(it.price)}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        document.getElementById('admin-rx-details-modal').classList.remove('hidden');
    },

    exportAdminPharmacyInventoryExcel() {
        if (window.Reports && Reports.exportPharmacyInventoryReport) {
            Reports.exportPharmacyInventoryReport({}, this.pharmacyDrugs);
        } else {
            Utils.showToast('جاري تصدير جرد الأدوية...', 'info');
        }
    },

    exportAdminPharmacySalesExcel() {
        if (window.Reports && Reports.exportPharmacyDispenseReport) {
            Reports.exportPharmacyDispenseReport({}, this.pharmacyPrescriptions);
        } else {
            Utils.showToast('جاري تصدير مبيعات الصيدلية...', 'info');
        }
    },

    // =========================================================================
    // دوال جراحة اليوم الواحد والعمليات والأسنان (Day Surgery & Dental Operations)
    // =========================================================================
    renderAdminSurgerySuite() {
        const surgTbody = document.getElementById('admin-surgery-table-body');
        const dentalTbody = document.getElementById('admin-dental-table-body');
        const surgCountEl = document.getElementById('admin-surgery-count');
        const dentalCountEl = document.getElementById('admin-dental-count');

        const surgeries = this.daySurgeries || [];
        const dentals = this.dentalProcedures || [];

        if (surgCountEl) surgCountEl.textContent = `${surgeries.length} عملية`;
        if (dentalCountEl) dentalCountEl.textContent = `${dentals.length} إجراء`;

        if (surgTbody) {
            if (surgeries.length === 0) {
                surgTbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400 text-xs">لا توجد عمليات جراحية مسجلة</td></tr>`;
            } else {
                surgTbody.innerHTML = surgeries.map(s => `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td class="py-2.5 px-3">
                            <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">#${s.surgery_code}</span>
                            <div class="font-bold text-slate-900 dark:text-white text-xs">${s.procedure_name}</div>
                            <div class="text-[10px] text-slate-400">المريض: ${s.patient_name}</div>
                        </td>
                        <td class="py-2.5 px-3 text-xs">
                            <div class="font-semibold text-slate-800 dark:text-slate-200">${s.surgeon_name}</div>
                            <div class="text-[10px] text-purple-600 dark:text-purple-400">${s.anesthesia_type}</div>
                        </td>
                        <td class="py-2.5 px-3 text-xs">
                            <div class="font-bold text-slate-700 dark:text-slate-300">${s.or_room}</div>
                            <div class="text-[10px] text-slate-400 font-mono">${s.recovery_bed}</div>
                        </td>
                        <td class="py-2.5 px-3">
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
                                ✓ WHO معتمد
                            </span>
                        </td>
                        <td class="py-2.5 px-3 font-mono font-bold text-emerald-600 text-xs">
                            ${Utils.formatCurrency(s.total_cost || 1500)}
                        </td>
                        <td class="py-2.5 px-3 text-center">
                            <button onclick="ClinicAdminApp.openAdminSurgeryDetailsModal('${s.id}')" class="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                                👁️
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }

        if (dentalTbody) {
            if (dentals.length === 0) {
                dentalTbody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-slate-400 text-xs">لا توجد إجراءات أسنان مسجلة</td></tr>`;
            } else {
                dentalTbody.innerHTML = dentals.map(d => `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td class="py-2.5 px-3">
                            <span class="font-mono font-bold text-teal-600 dark:text-teal-400 text-xs">سن #${d.tooth_number}</span>
                            <div class="font-bold text-slate-900 dark:text-white text-xs">${d.patient_name}</div>
                            <div class="text-[10px] text-slate-400">${d.tooth_name || 'سن دائم'}</div>
                        </td>
                        <td class="py-2.5 px-3 text-xs">
                            <div class="font-semibold text-slate-800 dark:text-slate-200">${d.procedure_name}</div>
                            <div class="text-[10px] text-purple-600 dark:text-purple-400 font-mono">${d.surface || 'السطح الإطباقي'}</div>
                        </td>
                        <td class="py-2.5 px-3 font-mono font-bold text-emerald-600 text-xs">
                            ${Utils.formatCurrency(d.cost || 650)}
                        </td>
                        <td class="py-2.5 px-3">
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                ✓ مكتمل
                            </span>
                        </td>
                    </tr>
                `).join('');
            }
        }
    },

    openAdminSurgeryDetailsModal(surgeryId) {
        const s = (this.daySurgeries || []).find(item => item.id === surgeryId) || (this.daySurgeries || [])[0];
        if (!s) return;

        document.getElementById('admin-surg-modal-title').textContent = `تفاصيل العملية الجراحية #${s.surgery_code}`;
        document.getElementById('admin-surg-modal-subtitle').textContent = `المريض: ${s.patient_name} | الجراح: ${s.surgeon_name}`;

        const content = document.getElementById('admin-surg-modal-content');
        if (content) {
            content.innerHTML = `
                <div class="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                    <div class="flex justify-between"><span>اسم التدخل الجراحي:</span><strong class="text-slate-900 dark:text-white">${s.procedure_name}</strong></div>
                    <div class="flex justify-between"><span>نوع التخدير:</span><strong class="text-purple-600 dark:text-purple-400">${s.anesthesia_type}</strong></div>
                    <div class="flex justify-between"><span>غرفة العمليات وسرير الإفاقة:</span><span class="font-mono">${s.or_room} | ${s.recovery_bed}</span></div>
                    <div class="flex justify-between"><span>تاريخ وتوقيت الجراحة:</span><span class="font-mono">${s.surgery_date || '2026-11-15 10:00 ص'}</span></div>
                    <div class="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1.5 font-bold">
                        <span>إجمالي تكلفة العملية:</span>
                        <span class="font-mono text-emerald-600">${Utils.formatCurrency(s.total_cost || 2000)}</span>
                    </div>
                </div>

                <div class="p-3 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-xs space-y-1">
                    <strong class="text-cyan-900 dark:text-cyan-300 block">✓ معايير التحقق الجراحي الآمن لمنظمة الصحة العالمية (WHO Checklist):</strong>
                    <div class="text-[11px] text-cyan-800 dark:text-cyan-200 opacity-90">
                        • تم توثيق إذن وموافقة المريض (Informed Consent) إلكترونياً بنجاح.<br>
                        • تم تأكيد هوية المريض وموضع الشق الجراحي قبل التخدير (Sign In).<br>
                        • تم مطابقة الفريق الجراحي والمضاد الحيوي الوقائي قبل البدء (Time Out).<br>
                        • تم عد ومطابقة الشاش والآلات الجراحية 100% قبل إغلاق الجرح (Sign Out).
                    </div>
                </div>

                <div class="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                    <strong class="text-slate-900 dark:text-white block">ملاحظات الجراح الاستشاري والتقرير:</strong>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400">${s.notes || 'تمت العملية الجراحية بدون مضاعفات مع استقرار تام للعلامات الحيوية'}</p>
                </div>
            `;
        }

        document.getElementById('admin-surgery-details-modal').classList.remove('hidden');
    },

    openAdminAddSurgeryModal() {
        const modal = document.getElementById('admin-add-surgery-modal');
        if (modal) modal.classList.remove('hidden');
    },

    exportAdminDaySurgeryExcel() {
        if (window.Reports && Reports.exportDaySurgeryReport) {
            Reports.exportDaySurgeryReport(this.daySurgeries);
        } else {
            Utils.showToast('جاري تصدير سجل العمليات الجراحية...', 'info');
        }
    },

    exportAdminDentalExcel() {
        if (window.Reports && Reports.exportDentalProceduresReport) {
            Reports.exportDentalProceduresReport(this.dentalProcedures);
        } else {
            Utils.showToast('جاري تصدير سجل إجراءات الأسنان...', 'info');
        }
    },

    changeBranchFilter(branchId) {
        this.selectedBranch = branchId || 'all';
        const branchNames = {
            all: 'كافة الفروع مجمعة (الكل)',
            br_maadi: 'فرع المعادي الرئيسي (HQ)',
            br_nasr: 'فرع مدينة نصر',
            br_mohandessin: 'فرع المهندسين',
            br_tagamoa: 'فرع التجمع الخامس'
        };
        const branchName = branchNames[this.selectedBranch] || this.selectedBranch;
        Utils.showToast(`تم تبديل نطاق العرض إلى: ${branchName} 🏢`, 'info');
        this.renderAdminMultiBranch();
        this.updateKPIs();
    },

    renderAdminMultiBranch() {
        const branches = this.branches || this.getMockBranches();
        const transfers = this.branchTransfers || this.getMockBranchTransfers();
        const packages = this.medicalPackages || this.getMockMedicalPackages();

        // 1. Update KPIs
        const totalBranches = branches.length;
        const totalRevenue = branches.reduce((sum, b) => sum + Number(b.monthly_revenue || 0), 0);
        const topBranch = [...branches].sort((a, b) => (b.occupancy_rate || 0) - (a.occupancy_rate || 0))[0];
        const totalPkgBookings = packages.reduce((sum, p) => sum + Number(p.bookings_count || 0), 0);
        const totalPkgSales = packages.reduce((sum, p) => sum + (Number(p.bookings_count || 0) * Number(p.package_price || 0)), 0);

        const kpiBranchesEl = document.getElementById('admin-mb-kpi-branches');
        const kpiRevenueEl = document.getElementById('admin-mb-kpi-revenue');
        const kpiTopBranchEl = document.getElementById('admin-mb-kpi-top-branch');
        const kpiPkgSalesEl = document.getElementById('admin-mb-kpi-pkg-sales');

        if (kpiBranchesEl) kpiBranchesEl.textContent = `${totalBranches} فروع`;
        if (kpiRevenueEl) {
            if (this.selectedBranch !== 'all') {
                const curB = branches.find(b => b.id === this.selectedBranch);
                kpiRevenueEl.textContent = curB ? Utils.formatCurrency(curB.monthly_revenue) : Utils.formatCurrency(totalRevenue);
            } else {
                kpiRevenueEl.textContent = Utils.formatCurrency(totalRevenue);
            }
        }
        if (kpiTopBranchEl && topBranch) kpiTopBranchEl.textContent = `${topBranch.short_name || topBranch.name} (${topBranch.occupancy_rate}%)`;
        if (kpiPkgSalesEl) kpiPkgSalesEl.textContent = `${totalPkgBookings} باقة (${Utils.formatCurrency(totalPkgSales)})`;

        // 2. Render Branches Comparison Table
        const branchTbody = document.getElementById('admin-branches-table-body');
        if (branchTbody) {
            branchTbody.innerHTML = branches.map(b => {
                const isSelected = this.selectedBranch === b.id;
                const occ = b.occupancy_rate || 75;
                const occColor = occ >= 85 ? 'bg-emerald-500' : (occ >= 75 ? 'bg-sky-500' : 'bg-amber-500');

                return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800 ${isSelected ? 'bg-sky-50/50 dark:bg-sky-950/30' : ''}">
                        <td class="py-3 px-3">
                            <div class="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>${b.name}</span>
                                <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">${b.code}</span>
                            </div>
                            <div class="text-[11px] text-slate-400">المدير: ${b.manager} | 📍 ${b.address}</div>
                        </td>
                        <td class="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                            <div>${b.clinics_count} عيادات تخصصية</div>
                            <div class="text-[11px] text-slate-400 font-normal">👨‍⚕️ ${b.doctors_count} طبيب مناوب</div>
                        </td>
                        <td class="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ${Utils.formatCurrency(b.monthly_revenue)}
                        </td>
                        <td class="py-3 px-3">
                            <div class="flex items-center gap-2">
                                <div class="w-16 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div class="${occColor} h-2 rounded-full" style="width: ${occ}%"></div>
                                </div>
                                <span class="font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px]">${occ}%</span>
                            </div>
                        </td>
                        <td class="py-3 px-3">
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                ${b.status === 'active' ? 'نشط 100%' : 'صيانة'}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // 3. Render Inter-Branch Referrals Table
        const transferTbody = document.getElementById('admin-transfers-table-body');
        if (transferTbody) {
            transferTbody.innerHTML = transfers.map(t => {
                const statusBadge = t.status === 'completed'
                    ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">تم الفحص</span>'
                    : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">قيد الإجراء</span>';

                return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800">
                        <td class="py-3 px-3">
                            <div class="font-bold text-slate-900 dark:text-white">${t.patient_name}</div>
                            <div class="text-[10px] text-slate-400 font-mono">${t.date}</div>
                        </td>
                        <td class="py-3 px-3 text-[11px]">
                            <div class="text-slate-500">من: <strong class="text-slate-700 dark:text-slate-300">${t.from_branch}</strong></div>
                            <div class="text-indigo-600 dark:text-indigo-400 font-bold">إلى: ${t.to_branch} ➔</div>
                        </td>
                        <td class="py-3 px-3">
                            <div class="font-semibold text-slate-800 dark:text-slate-200 text-xs">${t.reason}</div>
                            <div class="text-[10px] text-slate-400">${t.doctor_name}</div>
                        </td>
                        <td class="py-3 px-3">
                            ${statusBadge}
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // 4. Render Medical Packages Table
        const pkgTbody = document.getElementById('admin-packages-table-body');
        if (pkgTbody) {
            pkgTbody.innerHTML = packages.map(pkg => {
                const servicesText = Array.isArray(pkg.services) 
                    ? pkg.services.map(s => `<span class="inline-block bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] ml-1 mb-1">✓ ${s}</span>`).join('') 
                    : pkg.services;

                return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800 text-xs">
                        <td class="py-3 px-4">
                            <div class="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>${pkg.name}</span>
                            </div>
                            <div class="flex items-center gap-1.5 mt-0.5">
                                <span class="font-mono text-[10px] text-slate-400">${pkg.code}</span>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">${pkg.badge}</span>
                            </div>
                        </td>
                        <td class="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            ${pkg.category}
                        </td>
                        <td class="py-3 px-4 max-w-xs">
                            <div class="flex flex-wrap">${servicesText}</div>
                        </td>
                        <td class="py-3 px-4 font-mono text-slate-400 line-through">
                            ${Utils.formatCurrency(pkg.regular_price)}
                        </td>
                        <td class="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ${Utils.formatCurrency(pkg.package_price)}
                        </td>
                        <td class="py-3 px-4">
                            <span class="px-2 py-0.5 rounded-lg text-[11px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                توفير ${pkg.savings_percentage}%
                            </span>
                        </td>
                        <td class="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                            ${pkg.bookings_count} حجز
                        </td>
                        <td class="py-3 px-4">
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${pkg.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}">
                                ${pkg.status === 'active' ? 'متاح للحجز' : 'معطل'}
                            </span>
                        </td>
                        <td class="py-3 px-4 text-center">
                            <button onclick="ClinicAdminApp.togglePackageStatus('${pkg.id}')" class="btn-press px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                ${pkg.status === 'active' ? 'إيقاف مؤقت' : 'تفعيل'}
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    },

    openAdminAddPackageModal() {
        const modal = document.getElementById('admin-add-package-modal');
        if (modal) modal.classList.remove('hidden');
    },

    togglePackageStatus(pkgId) {
        const pkg = (this.medicalPackages || []).find(p => p.id === pkgId);
        if (pkg) {
            pkg.status = pkg.status === 'active' ? 'inactive' : 'active';
            try {
                localStorage.setItem('alwagih_medical_packages', JSON.stringify(this.medicalPackages));
            } catch(e) {}
            Utils.showToast(`تم تحديث حالة الباقة (${pkg.name})`, 'success');
            this.renderAdminMultiBranch();
        }
    },

    exportAdminMultiBranchExcel() {
        if (window.Reports && Reports.exportMultiBranchReport) {
            Reports.exportMultiBranchReport(this.branches, this.branchTransfers);
        } else {
            Utils.showToast('جاري تصدير تقرير الفروع المجمعة...', 'info');
        }
    },

    exportAdminPackagesExcel() {
        if (window.Reports && Reports.exportMedicalPackagesReport) {
            Reports.exportMedicalPackagesReport(this.medicalPackages);
        } else {
            Utils.showToast('جاري تصدير تقرير باقات الفحص الطبي الشامل...', 'info');
        }
    },

    getMockBranches() {
        return [
            {
                id: 'br_maadi',
                code: 'BR-MAADI-01',
                name: 'فرع المعادي الرئيسي (HQ)',
                short_name: 'المعادي الرئيسي',
                address: 'مبنى الشفاء الطبي - شارع النصر، المعادي',
                manager: 'د. هاني رضوان',
                clinics_count: 12,
                doctors_count: 28,
                monthly_revenue: 485000,
                occupancy_rate: 88,
                status: 'active'
            },
            {
                id: 'br_nasr',
                code: 'BR-NASR-02',
                name: 'فرع مدينة نصر',
                short_name: 'مدينة نصر',
                address: 'شارع مكرم عبيد - تقاطع النزهة',
                manager: 'د. سميرة فوزي',
                clinics_count: 10,
                doctors_count: 22,
                monthly_revenue: 375000,
                occupancy_rate: 82,
                status: 'active'
            },
            {
                id: 'br_mohandessin',
                code: 'BR-ENG-03',
                name: 'فرع المهندسين',
                short_name: 'المهندسين',
                address: 'شارع جامعة الدول العربية - المهندسين',
                manager: 'د. إيهاب ممدوح',
                clinics_count: 8,
                doctors_count: 18,
                monthly_revenue: 310000,
                occupancy_rate: 76,
                status: 'active'
            },
            {
                id: 'br_tagamoa',
                code: 'BR-TAGAMOA-04',
                name: 'فرع التجمع الخامس (القاهرة الجديدة)',
                short_name: 'التجمع الخامس',
                address: 'القطاع التجاري - التسعين الجنوبي',
                manager: 'د. ريم المهدي',
                clinics_count: 14,
                doctors_count: 32,
                monthly_revenue: 520000,
                occupancy_rate: 91,
                status: 'active'
            }
        ];
    },

    getMockBranchTransfers() {
        return [
            {
                id: 'tr_101',
                patient_name: 'كريم عصام بدر',
                from_branch: 'فرع المهندسين',
                to_branch: 'فرع المعادي الرئيسي',
                reason: 'رنين مغناطيسي 3 تسلا (MRI High Field)',
                doctor_name: 'د. طارق العريان',
                date: '2026-11-15',
                status: 'completed'
            },
            {
                id: 'tr_102',
                patient_name: 'منى سعيد علام',
                from_branch: 'فرع مدينة نصر',
                to_branch: 'فرع التجمع الخامس',
                reason: 'فحص ليزك وتصحيح إبصار متقدم (Femto-LASIK)',
                doctor_name: 'د. هدى منصور',
                date: '2026-11-15',
                status: 'in_progress'
            },
            {
                id: 'tr_103',
                patient_name: 'شريف محمود عبد الله',
                from_branch: 'فرع المعادي الرئيسي',
                to_branch: 'فرع مدينة نصر',
                reason: 'قسطرة قلبية وجراحة أوعية دقيقة',
                doctor_name: 'د. أحمد الشناوي',
                date: '2026-11-14',
                status: 'completed'
            },
            {
                id: 'tr_104',
                patient_name: 'دعاء عبد الوهاب',
                from_branch: 'فرع التجمع الخامس',
                to_branch: 'فرع المهندسين',
                reason: 'استشارة جراحة تجميلية وأسنان متقدمة',
                doctor_name: 'د. سارة محمود',
                date: '2026-11-13',
                status: 'completed'
            }
        ];
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
                category: 'فحص وقائي وباطني',
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

    getMockDaySurgeries() {
        const stored = localStorage.getItem('alwagih_day_surgeries');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) {}
        }
        return [
            {
                id: 'surg_501',
                surgery_code: 'OR-501',
                patient_name: 'طارق حسام مصطفى',
                patient_phone: '01011223344',
                procedure_name: 'استئصال كيس دهني سطحي مع خياطة تجميلية Vicryl',
                surgeon_name: 'د. طارق العريان',
                anesthesiologist_name: 'د. خالد عبد السميع',
                anesthesia_type: 'موضعي (Local)',
                or_room: 'غرفة العمليات الصغرى 1',
                recovery_bed: 'سرير الإفاقة 1',
                surgery_date: '2026-11-15 09:30 ص',
                who_checklist_passed: true,
                consent_signed: true,
                total_cost: 1800,
                status: 'completed',
                notes: 'تم استئصال الكيس بالكامل وإرسال عينة للباثولوجي، النزيف بسيط والغرز سليمة'
            },
            {
                id: 'surg_502',
                surgery_code: 'OR-502',
                patient_name: 'ياسمين عبد الرحمن',
                patient_phone: '01122334455',
                procedure_name: 'منظار تشخيصي للمعدة والاثني عشر (EGD Scope)',
                surgeon_name: 'د. محمد عبد العزيز',
                anesthesiologist_name: 'د. خالد عبد السميع',
                anesthesia_type: 'مهدئ وريدي (IV Sedation)',
                or_room: 'غرفة المناظير والتنظير',
                recovery_bed: 'سرير الإفاقة 2',
                surgery_date: '2026-11-15 10:45 ص',
                who_checklist_passed: true,
                consent_signed: true,
                total_cost: 3200,
                status: 'completed',
                notes: 'تم فحص المريء والمعدة والاثني عشر وأخذ عينة للجرثومة الحلزونية'
            },
            {
                id: 'surg_503',
                surgery_code: 'OR-503',
                patient_name: 'حامد زكريا النمر',
                patient_phone: '01233445566',
                procedure_name: 'تصحيح واستئصال ظفر غائر جراحياً مع كي المصفوفة',
                surgeon_name: 'د. هدى منصور',
                anesthesiologist_name: 'د. استشاري تخدير',
                anesthesia_type: 'موضعي (Local Block)',
                or_room: 'غرفة العمليات الصغرى 2',
                recovery_bed: 'سرير الإفاقة 3',
                surgery_date: '2026-11-14 12:00 م',
                who_checklist_passed: true,
                consent_signed: true,
                total_cost: 1200,
                status: 'completed',
                notes: 'تم تخدير إحصار موضعي لإصبع القدم واستئصال الحافة والكي الفينولي'
            }
        ];
    },

    getMockDentalProcedures() {
        const stored = localStorage.getItem('alwagih_dental_procedures');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) {}
        }
        return [
            {
                id: 'dental_101',
                patient_name: 'طارق حسام مصطفى',
                patient_phone: '01011223344',
                doctor_name: 'د. أحمد الشناوي',
                tooth_number: 16,
                tooth_name: 'ضرس أول علوي أيمن (UR6)',
                surface: 'O-M (إطباقي إنسي)',
                procedure_name: 'حشو ضوئي تجميلي طبقات (Composite)',
                cost: 650,
                procedure_date: '2026-11-15',
                payment_type: 'cash',
                status: 'completed'
            },
            {
                id: 'dental_102',
                patient_name: 'سلوى محمود شاهين',
                patient_phone: '01555667788',
                doctor_name: 'د. أحمد الشناوي',
                tooth_number: 21,
                tooth_name: 'قاطع مركزي علوي أيسر (UL1)',
                surface: 'تاج كامل زيركون',
                procedure_name: 'تركيبة طربوش زيركون تجميلي معتمد (Crown)',
                cost: 2200,
                procedure_date: '2026-11-14',
                payment_type: 'corporate',
                status: 'completed'
            },
            {
                id: 'dental_103',
                patient_name: 'ياسمين عبد الرحمن',
                patient_phone: '01122334455',
                doctor_name: 'د. أحمد الشناوي',
                tooth_number: 46,
                tooth_name: 'ضرس أول سفلي أيمن (LR6)',
                surface: 'قنوات الجذور الـ 3',
                procedure_name: 'علاج جذور وعصب آلي بالموتور (Rotary Endo)',
                cost: 1600,
                procedure_date: '2026-11-13',
                payment_type: 'corporate',
                status: 'completed'
            },
            {
                id: 'dental_104',
                patient_name: 'كمال الدين حافظ',
                patient_phone: '01099887766',
                doctor_name: 'د. أحمد الشناوي',
                tooth_number: 36,
                tooth_name: 'ضرس أول سفلي أيسر (LL6)',
                surface: 'عظم الفك السفلي',
                procedure_name: 'زراعة سن جراحية مع غرسة تيتانيوم (Implant)',
                cost: 9500,
                procedure_date: '2026-11-12',
                payment_type: 'cash',
                status: 'completed'
            }
        ];
    },

    // =========================================================================
    // مولدات البيانات التجريبية للمعمل والأشعة (Mock Catalogs & Studies)
    // =========================================================================
    getMockLabCatalog() {
        return [
            {
                key: 'cbc',
                name: 'صورة دم كاملة (Complete Blood Count - CBC)',
                tube: 'أنبوبة موف (EDTA Purple) 🟣',
                cost: 250,
                parameters: [
                    { name: 'Hemoglobin (Hb)', default: '14.2', unit: 'g/dL', ref: '12.0 - 16.0', min: 12.0, max: 16.0, panic_low: 7.0, panic_high: 20.0 },
                    { name: 'RBCs Count', default: '4.8', unit: 'M/uL', ref: '4.2 - 5.4', min: 4.2, max: 5.4 },
                    { name: 'WBCs Count', default: '7.1', unit: 'K/uL', ref: '4.0 - 11.0', min: 4.0, max: 11.0, panic_high: 30.0 },
                    { name: 'Platelets (PLT)', default: '260', unit: 'K/uL', ref: '150 - 450', min: 150, max: 450, panic_low: 50 },
                    { name: 'Hematocrit (PCV)', default: '42.5', unit: '%', ref: '37.0 - 48.0', min: 37.0, max: 48.0 }
                ]
            },
            {
                key: 'liver',
                name: 'وظائف كبد شاملة (Comprehensive Liver Panel)',
                tube: 'أنبوبة صفراء (Serum Gel) 🟡',
                cost: 380,
                parameters: [
                    { name: 'ALT (SGPT)', default: '28', unit: 'U/L', ref: '7 - 56', min: 7, max: 56, panic_high: 250 },
                    { name: 'AST (SGOT)', default: '24', unit: 'U/L', ref: '10 - 40', min: 10, max: 40, panic_high: 250 },
                    { name: 'Total Bilirubin', default: '0.8', unit: 'mg/dL', ref: '0.2 - 1.2', min: 0.2, max: 1.2, panic_high: 12.0 },
                    { name: 'Direct Bilirubin', default: '0.2', unit: 'mg/dL', ref: '0.0 - 0.3', min: 0.0, max: 0.3 },
                    { name: 'Serum Albumin', default: '4.4', unit: 'g/dL', ref: '3.5 - 5.0', min: 3.5, max: 5.0 }
                ]
            },
            {
                key: 'kidney',
                name: 'وظائف كلى (Renal Function Panel)',
                tube: 'أنبوبة صفراء (Serum Gel) 🟡',
                cost: 290,
                parameters: [
                    { name: 'Serum Creatinine', default: '0.9', unit: 'mg/dL', ref: '0.6 - 1.2', min: 0.6, max: 1.2, panic_high: 3.5 },
                    { name: 'Blood Urea', default: '28', unit: 'mg/dL', ref: '15 - 45', min: 15, max: 45, panic_high: 100 },
                    { name: 'Serum Uric Acid', default: '5.2', unit: 'mg/dL', ref: '3.5 - 7.2', min: 3.5, max: 7.2 }
                ]
            },
            {
                key: 'lipid',
                name: 'دهون الدم الكاملة (Lipid Profile)',
                tube: 'أنبوبة صفراء (Serum Gel) 🟡',
                cost: 350,
                parameters: [
                    { name: 'Total Cholesterol', default: '185', unit: 'mg/dL', ref: '< 200', min: 0, max: 200 },
                    { name: 'Triglycerides', default: '140', unit: 'mg/dL', ref: '< 150', min: 0, max: 150 },
                    { name: 'HDL Cholesterol', default: '52', unit: 'mg/dL', ref: '> 40', min: 40, max: 999 },
                    { name: 'LDL Cholesterol', default: '95', unit: 'mg/dL', ref: '< 100', min: 0, max: 100 }
                ]
            },
            {
                key: 'hba1c',
                name: 'السكر التراكمي (HbA1c Glycated Hemoglobin)',
                tube: 'أنبوبة موف (EDTA Purple) 🟣',
                cost: 220,
                parameters: [
                    { name: 'HbA1c', default: '5.4', unit: '%', ref: '4.0 - 5.6', min: 4.0, max: 5.6, panic_high: 12.0 }
                ]
            },
            {
                key: 'thyroid',
                name: 'هرمونات الغدة الدرقية (TSH, FT3, FT4)',
                tube: 'أنبوبة صفراء (Serum Gel) 🟡',
                cost: 480,
                parameters: [
                    { name: 'TSH', default: '2.1', unit: 'uIU/mL', ref: '0.4 - 4.0', min: 0.4, max: 4.0 },
                    { name: 'Free T3', default: '3.2', unit: 'pg/mL', ref: '2.3 - 4.2', min: 2.3, max: 4.2 },
                    { name: 'Free T4', default: '1.3', unit: 'ng/dL', ref: '0.8 - 1.8', min: 0.8, max: 1.8 }
                ]
            }
        ];
    },

    getMockLabOrders() {
        return [
            {
                id: 'lab_1',
                sample_id: 'LAB-2026-8801',
                patient_name: 'أحمد سعيد عبد الله',
                patient_phone: '01099887766',
                patient_age: 38,
                patient_gender: 'male',
                test_key: 'cbc',
                test_name: 'صورة دم كاملة (CBC)',
                tube_type: 'أنبوبة موف (EDTA Purple) 🟣',
                doctor_name: 'د. أحمد الشناوي (استشاري باطنة)',
                sample_date: '2026-11-15',
                cost: 250,
                payment_type: 'cash',
                contract_name: null,
                status: 'verified',
                status_label: 'معتمدة ومكتملة',
                flag: 'normal',
                parameters: [
                    { name: 'Hemoglobin (Hb)', value: '14.2', unit: 'g/dL', ref: '12.0 - 16.0', flag: 'normal' },
                    { name: 'RBCs Count', value: '4.8', unit: 'M/uL', ref: '4.2 - 5.4', flag: 'normal' },
                    { name: 'WBCs Count', value: '7.1', unit: 'K/uL', ref: '4.0 - 11.0', flag: 'normal' },
                    { name: 'Platelets (PLT)', value: '260', unit: 'K/uL', ref: '150 - 450', flag: 'normal' },
                    { name: 'Hematocrit (PCV)', value: '42.5', unit: '%', ref: '37.0 - 48.0', flag: 'normal' }
                ],
                comment: 'صورة دم طبيعية ومتوازنة، لا توجد دلالات لفقر دم أو عدوى حادة.',
                verified_by: 'د. هاني عثمان (استشاري باثولوجيا إكلينيكية)'
            },
            {
                id: 'lab_2',
                sample_id: 'LAB-2026-8802',
                patient_name: 'مريم عادل خليل',
                patient_phone: '01155443322',
                patient_age: 29,
                patient_gender: 'female',
                test_key: 'liver',
                test_name: 'وظائف كبد شاملة (Liver Panel)',
                tube_type: 'أنبوبة صفراء (Serum Gel) 🟡',
                doctor_name: 'د. أحمد الشناوي (استشاري باطنة)',
                sample_date: '2026-11-15',
                cost: 380,
                payment_type: 'corporate',
                contract_name: 'مصر للتأمين',
                status: 'in_progress',
                status_label: 'قيد التحليل',
                flag: 'high',
                parameters: [
                    { name: 'ALT (SGPT)', value: '68', unit: 'U/L', ref: '7 - 56', flag: 'high' },
                    { name: 'AST (SGOT)', value: '42', unit: 'U/L', ref: '10 - 40', flag: 'high' },
                    { name: 'Total Bilirubin', value: '0.9', unit: 'mg/dL', ref: '0.2 - 1.2', flag: 'normal' },
                    { name: 'Serum Albumin', value: '4.2', unit: 'g/dL', ref: '3.5 - 5.0', flag: 'normal' }
                ],
                comment: 'ارتفاع طفيف في إنزيمات الكبد ALT/AST، يُنصح بعمل سونار على البطن لمتابعة دهون الكبد.',
                verified_by: null
            },
            {
                id: 'lab_3',
                sample_id: 'LAB-2026-8803',
                patient_name: 'يوسف حسام الشريف',
                patient_phone: '01244332211',
                patient_age: 54,
                patient_gender: 'male',
                test_key: 'kidney',
                test_name: 'وظائف كلى (Renal Panel)',
                tube_type: 'أنبوبة صفراء (Serum Gel) 🟡',
                doctor_name: 'د. كريم عبد العزيز (استشاري عظام)',
                sample_date: '2026-11-15',
                cost: 290,
                payment_type: 'cash',
                contract_name: null,
                status: 'verified',
                status_label: 'معتمدة ومكتملة',
                flag: 'panic',
                parameters: [
                    { name: 'Serum Creatinine', value: '3.8', unit: 'mg/dL', ref: '0.6 - 1.2', flag: 'panic' },
                    { name: 'Blood Urea', value: '92', unit: 'mg/dL', ref: '15 - 45', flag: 'panic' },
                    { name: 'Serum Uric Acid', value: '8.4', unit: 'mg/dL', ref: '3.5 - 7.2', flag: 'high' }
                ],
                comment: '🚨 تنبيه قيمة حرجة: قصور كلوي حاد مع ارتفاع شديد في الكرياتينين واليوريا. تم إخطار الطبيب المعالج تليفونياً فوراً.',
                verified_by: 'د. هاني عثمان (استشاري باثولوجيا إكلينيكية)'
            },
            {
                id: 'lab_4',
                sample_id: 'LAB-2026-8804',
                patient_name: 'فاطمة محمود إبراهيم',
                patient_phone: '01011223344',
                patient_age: 42,
                patient_gender: 'female',
                test_key: 'hba1c',
                test_name: 'السكر التراكمي (HbA1c Glycated)',
                tube_type: 'أنبوبة موف (EDTA Purple) 🟣',
                doctor_name: 'د. سارة محمود (أخصائي أطفال وباطنة)',
                sample_date: '2026-11-14',
                cost: 220,
                payment_type: 'cash',
                contract_name: null,
                status: 'verified',
                status_label: 'معتمدة ومكتملة',
                flag: 'normal',
                parameters: [
                    { name: 'HbA1c', value: '5.3', unit: '%', ref: '4.0 - 5.6', flag: 'normal' }
                ],
                comment: 'معدل سكر تراكمي سليم ومثالي، بدون أي بوادر سكري.',
                verified_by: 'د. هاني عثمان (استشاري باثولوجيا إكلينيكية)'
            }
        ];
    },

    getMockRadiologyTemplates() {
        return {
            chest_normal: {
                technique: 'PA projection of the chest obtained in full inspiration using standard radiographic parameters.',
                findings: 'The cardiac silhouette and mediastinal contours are within normal limits for age and body habitus.\nNo focal airspace consolidation, pneumothorax, or pleural effusion is identified.\nThe pulmonary vasculature is normal. Bilateral diaphragmatic contours and costophrenic angles are sharp and clear.\nVisualized osseous structures of the thoracic cage demonstrate no acute fracture.',
                impression: 'Normal chest radiography. No evidence of acute cardiopulmonary disease.'
            },
            lumbar_mri: {
                technique: 'Sagittal and axial T1 and T2 weighted MR images of the lumbosacral spine performed on a 1.5 Tesla scanner.',
                findings: 'Normal lumbar lordosis is maintained with no vertebral subluxation.\nVertebral body heights and marrow signal intensities are preserved.\nL4-L5 level demonstrates moderate posterior central and paracentral disc protrusion indenting the thecal sac and causing mild bilateral neural foraminal narrowing.\nL5-S1 disc shows mild annular bulge with preserved disc space height.\nConus medullaris ends at normal L1 level with normal signal.',
                impression: 'L4-L5 posterior disc protrusion producing anterior thecal sac indentation and mild bilateral foraminal narrowing. Clinical correlation with lower limb radiculopathy is recommended.'
            },
            brain_ct: {
                technique: 'Axial contiguous 5mm unenhanced CT slices of the brain from base to vertex.',
                findings: 'No evidence of acute intracranial hemorrhage, mass effect, or midline shift.\nVentricles and basal cisterns are within normal age-appropriate limits.\nGray-white matter differentiation is preserved.\nCranial vault and skull base are intact with clear paranasal sinuses.',
                impression: 'Normal unenhanced brain CT study. No acute intracranial pathology.'
            },
            pelvi_us: {
                technique: 'Real-time grayscale and color Doppler ultrasound examination of the abdomen and pelvis.',
                findings: 'Liver demonstrates normal size, smooth contour, and homogeneous echotexture with no focal hepatic lesions.\nGallbladder is well-distended with thin wall and calculus-free lumen.\nBoth kidneys show normal size, cortical thickness, and cortico-medullary differentiation with no stones or backpressure.\nSpleen, pancreas, and urinary bladder are unremarkable.',
                impression: 'Normal pelvi-abdominal ultrasound study. No sonographic abnormality detected.'
            },
            knee_xray: {
                technique: 'Weight-bearing anteroposterior and lateral projections of the right knee.',
                findings: 'Mild narrowing of the medial joint compartment. Mild marginal osteophytic lipping noted along the medial tibial plateau and patellar margins.\nNo joint effusion, bony fracture, or dislocation is identified.',
                impression: 'Findings consistent with mild right knee osteoarthritis (Kellgren-Lawrence Grade II).'
            }
        };
    },

    getMockRadiologyStudies() {
        return [
            {
                id: 'rad_1',
                study_id: 'RAD-2026-4401',
                patient_name: 'أحمد سعيد عبد الله',
                patient_phone: '01099887766',
                patient_age: 38,
                patient_gender: 'male',
                modality: 'MRI',
                exam_name: 'رنين مغناطيسي على الفقرات القطنية (Lumbar Spine)',
                contrast: false,
                doctor_name: 'د. كريم عبد العزيز (استشاري عظام)',
                study_date: '2026-11-15',
                cost: 1200,
                payment_type: 'cash',
                status: 'signed',
                status_label: 'معتمد وموقع',
                technique: 'Sagittal and axial T1 and T2 weighted MR images of the lumbosacral spine on a 1.5 Tesla scanner.',
                findings: 'L4-L5 level demonstrates posterior central and paracentral disc protrusion indenting the anterior thecal sac and causing mild bilateral neural foraminal compromise. Other lumbar disc levels show preserved disc height and contour.',
                impression: 'L4-L5 posterior disc herniation with thecal sac impingement. Clinical correlation with radiculopathy advised.',
                radiologist_name: 'د. مروان البدري (استشاري أشعة تشخيصية)',
                image_url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'rad_2',
                study_id: 'RAD-2026-4402',
                patient_name: 'مريم عادل خليل',
                patient_phone: '01155443322',
                patient_age: 29,
                patient_gender: 'female',
                modality: 'Ultrasound',
                exam_name: 'سونار على البطن والحوض (Pelvi-Abdominal US)',
                contrast: false,
                doctor_name: 'د. أحمد الشناوي (استشاري باطنة)',
                study_date: '2026-11-15',
                cost: 450,
                payment_type: 'corporate',
                status: 'drafting',
                status_label: 'قيد كتابة التقرير',
                technique: 'Real-time grayscale and color Doppler ultrasound examination of the abdomen and pelvis.',
                findings: 'Liver demonstrates mild diffuse increase in parenchymal echogenicity consistent with grade I fatty infiltration. Gallbladder and kidneys are normal.',
                impression: 'Mild diffuse hepatic steatosis (Fatty Liver Grade I). Otherwise unremarkable.',
                radiologist_name: 'د. مروان البدري (استشاري أشعة تشخيصية)',
                image_url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'rad_3',
                study_id: 'RAD-2026-4403',
                patient_name: 'كمال نبيل صقر',
                patient_phone: '01012345678',
                patient_age: 61,
                patient_gender: 'male',
                modality: 'CT',
                exam_name: 'أشعة مقطعية على المخ (Brain CT)',
                contrast: true,
                doctor_name: 'د. أحمد الشناوي (استشاري باطنة)',
                study_date: '2026-11-14',
                cost: 950,
                payment_type: 'cash',
                status: 'signed',
                status_label: 'معتمد وموقع',
                technique: 'Axial contiguous unenhanced and contrast-enhanced CT slices of the brain.',
                findings: 'No evidence of acute intracranial hemorrhage or territorial infarction. Ventricles and cisterns are within normal age limits. Gray-white matter differentiation is preserved.',
                impression: 'Normal unenhanced and enhanced brain CT study. No acute infarction or intracranial bleed.',
                radiologist_name: 'د. مروان البدري (استشاري أشعة تشخيصية)',
                image_url: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'rad_4',
                study_id: 'RAD-2026-4404',
                patient_name: 'ياسمين رضا توفيق',
                patient_phone: '01223344556',
                patient_age: 45,
                patient_gender: 'female',
                modality: 'X-Ray',
                exam_name: 'أشعة سينية على الصدر (Chest X-Ray PA)',
                contrast: false,
                doctor_name: 'د. سارة محمود (أخصائي أطفال وباطنة)',
                study_date: '2026-11-15',
                cost: 250,
                payment_type: 'cash',
                status: 'signed',
                status_label: 'معتمد وموقع',
                technique: 'PA projection of the chest in full inspiration.',
                findings: 'Cardiac silhouette and mediastinum are within normal limits. Lungs are clear with no focal consolidation or effusion. Costophrenic angles are free.',
                impression: 'Normal chest radiography.',
                radiologist_name: 'د. مروان البدري (استشاري أشعة تشخيصية)',
                image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80'
            }
        ];
    },

    getMockQueueRooms() {
        return [
            { id: 'room_101', room_no: '101', clinic_name: 'العيادة الباطنية التخصصية', clinic_short: 'باطنة', doctor_name: 'د. محمد عبد العزيز', current_ticket: 'A-104', current_patient: 'كمال الدين حافظ', status: 'busy' },
            { id: 'room_102', room_no: '102', clinic_name: 'عيادة جراحة العظام والمفاصل', clinic_short: 'عظام', doctor_name: 'د. هدى منصور', current_ticket: 'B-206', current_patient: 'سمير فوزي عطية', status: 'busy' },
            { id: 'room_103', room_no: '103', clinic_name: 'عيادة طب وجراحة العيون', clinic_short: 'عيون', doctor_name: 'د. طارق العريان', current_ticket: 'C-302', current_patient: 'ندى أسامة رشدي', status: 'busy' },
            { id: 'room_104', room_no: '104', clinic_name: 'عيادة الجلدية والليزر', clinic_short: 'جلدية', doctor_name: 'د. ريم المهدي', current_ticket: 'D-401', current_patient: 'هالة عصام الدين', status: 'busy' }
        ];
    },

    getMockWaitingTickets() {
        return [
            { id: 'tkt_1', ticket_no: 'A-106', patient_name: 'حسين علاء مرسي', patient_phone: '01019283746', clinic: 'العيادة الباطنية التخصصية', doctor: 'د. محمد عبد العزيز', priority: 'normal', priority_label: 'عادي', status: 'waiting', time: '11:15 ص' },
            { id: 'tkt_2', ticket_no: 'B-208', patient_name: 'محمود جابر صبحي', patient_phone: '01123456789', clinic: 'عيادة جراحة العظام والمفاصل', doctor: 'د. هدى منصور', priority: 'urgent', priority_label: 'مستعجل ⚡', status: 'waiting', time: '11:20 ص' },
            { id: 'tkt_3', ticket_no: 'C-304', patient_name: 'شيرين كمال الشريف', patient_phone: '01239847561', clinic: 'عيادة طب وجراحة العيون', doctor: 'د. طارق العريان', priority: 'normal', priority_label: 'عادي', status: 'waiting', time: '11:25 ص' },
            { id: 'tkt_4', ticket_no: 'D-403', patient_name: 'داليا وفيق الشريف', patient_phone: '01551234987', clinic: 'عيادة الجلدية والليزر', doctor: 'د. ريم المهدي', priority: 'vip', priority_label: 'VIP ⭐', status: 'waiting', time: '11:30 ص' },
            { id: 'tkt_5', ticket_no: 'A-108', patient_name: 'إبراهيم توفيق السيد', patient_phone: '01099887766', clinic: 'العيادة الباطنية التخصصية', doctor: 'د. محمد عبد العزيز', priority: 'emergency', priority_label: 'طوارئ 🚨', status: 'waiting', time: '11:32 ص' },
            { id: 'tkt_6', ticket_no: 'E-502', patient_name: 'ياسر محمد رضوان', patient_phone: '01112233445', clinic: 'عيادة طب وجراحة الأسنان', doctor: 'د. أحمد الشناوي', priority: 'normal', priority_label: 'عادي', status: 'waiting', time: '11:40 ص' }
        ];
    },

    getMockDoctorCommissions() {
        const docs = [
            {
                id: 'doc_1',
                doctor_name: 'د. محمد عبد العزيز',
                specialty: 'استشاري الأمراض الباطنية والجهاز الهضمي',
                room: '101',
                cases_count: 48,
                consultation_revenue: 14400,
                procedure_revenue: 6000,
                lab_referrals_revenue: 4200,
                rad_referrals_revenue: 3500,
                gross_revenue: 28100,
                consult_split_pct: 65,
                procedure_split_pct: 75,
                lab_comm_pct: 15,
                rad_comm_pct: 15,
                deduction_pct: 5,
                status: 'pending',
                voucher_no: '',
                payment_date: '',
                paid_date: '',
                receipt_no: '',
                payment_method: ''
            },
            {
                id: 'doc_2',
                doctor_name: 'د. هدى منصور',
                specialty: 'استشاري جراحة العظام والمناظير',
                room: '102',
                cases_count: 36,
                consultation_revenue: 12600,
                procedure_revenue: 18500,
                lab_referrals_revenue: 2800,
                rad_referrals_revenue: 8400,
                gross_revenue: 42300,
                consult_split_pct: 70,
                procedure_split_pct: 80,
                lab_comm_pct: 15,
                rad_comm_pct: 20,
                deduction_pct: 7,
                status: 'pending',
                voucher_no: '',
                payment_date: '',
                paid_date: '',
                receipt_no: '',
                payment_method: ''
            },
            {
                id: 'doc_3',
                doctor_name: 'د. طارق العريان',
                specialty: 'استشاري طب وجراحة العيون والليزر',
                room: '103',
                cases_count: 42,
                consultation_revenue: 14700,
                procedure_revenue: 12000,
                lab_referrals_revenue: 1500,
                rad_referrals_revenue: 2100,
                gross_revenue: 30300,
                consult_split_pct: 70,
                procedure_split_pct: 75,
                lab_comm_pct: 10,
                rad_comm_pct: 10,
                deduction_pct: 5,
                status: 'paid',
                voucher_no: 'VCH-9811',
                payment_date: '2026-11-14',
                paid_date: '2026-11-14',
                receipt_no: 'VCH-9811',
                payment_method: 'تحويل بنكي'
            },
            {
                id: 'doc_4',
                doctor_name: 'د. ريم المهدي',
                specialty: 'أخصائي الجلدية والتجميل والليزر',
                room: '104',
                cases_count: 55,
                consultation_revenue: 16500,
                procedure_revenue: 24000,
                lab_referrals_revenue: 3200,
                rad_referrals_revenue: 800,
                gross_revenue: 44500,
                consult_split_pct: 60,
                procedure_split_pct: 70,
                lab_comm_pct: 12,
                rad_comm_pct: 10,
                deduction_pct: 8,
                status: 'pending',
                voucher_no: '',
                payment_date: '',
                paid_date: '',
                receipt_no: '',
                payment_method: ''
            },
            {
                id: 'doc_5',
                doctor_name: 'د. أحمد الشناوي',
                specialty: 'استشاري جراحة وزراعة الأسنان',
                room: '105',
                cases_count: 31,
                consultation_revenue: 7750,
                procedure_revenue: 32000,
                lab_referrals_revenue: 1200,
                rad_referrals_revenue: 4500,
                gross_revenue: 45450,
                consult_split_pct: 60,
                procedure_split_pct: 70,
                lab_comm_pct: 10,
                rad_comm_pct: 15,
                deduction_pct: 10,
                status: 'paid',
                voucher_no: 'VCH-9812',
                payment_date: '2026-11-13',
                paid_date: '2026-11-13',
                receipt_no: 'VCH-9812',
                payment_method: 'شيك بنكي معتمد'
            }
        ];

        docs.forEach(doc => this.recalcDoctorCommission(doc));
        return docs;
    },

    getMockPharmacyDrugs() {
        const stored = localStorage.getItem('alwagih_pharmacy_drugs');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { }
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

    getMockPharmacyPrescriptions() {
        const stored = localStorage.getItem('alwagih_pharmacy_prescriptions');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { }
        }
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
            },
            {
                id: 'rx_901',
                rx_number: 'RX-2026-791',
                patient_name: 'سلوى محمود شاهين',
                patient_phone: '01555667788',
                doctor_name: 'د. سارة محمود',
                clinic_name: 'عيادة الباطنة العامة',
                payment_type: 'cash',
                company_name: '',
                copay_percentage: 100,
                created_time: '2026-11-15 09:30 ص',
                status: 'dispensed',
                items: [
                    { drug_name: 'Augmentin (أوجمنتين)', dosage: '1000 mg', instructions: 'قرص مرتين يومياً', quantity: 1, price: 99.5 },
                    { drug_name: 'Panadol Extra (بنادول إكسترا)', dosage: '500 mg', instructions: 'عند اللزوم', quantity: 2, price: 84 }
                ],
                total_amount: 183.5,
                patient_copay: 183.5,
                insurance_claim: 0
            }
        ];
    }
};

window.ClinicAdminApp = ClinicAdminApp;
document.addEventListener('DOMContentLoaded', () => ClinicAdminApp.init());
