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
        this.populateLabCatalogSelect();
        this.populateRadExamSelect();
        this.updateKPIs();
    },

    switchTab(tabId) {
        this.activeTab = tabId;
        const tabs = ['crm', 'hr_biometric', 'procurement', 'contracts', 'inventory', 'reports', 'lab', 'radiology'];
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
    }
};

window.ClinicAdminApp = ClinicAdminApp;
document.addEventListener('DOMContentLoaded', () => ClinicAdminApp.init());
