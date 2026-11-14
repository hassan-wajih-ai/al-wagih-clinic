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
    attendanceLogs: [],
    penalties: [],
    roster: [],
    suppliers: [],
    inventory: [],
    contracts: [],
    employees: [],
    revenueChartInstance: null,

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
        this.updateKPIs();
    },

    switchTab(tabId) {
        this.activeTab = tabId;
        const tabs = ['crm', 'hr_biometric', 'procurement', 'contracts', 'inventory'];
        tabs.forEach(t => {
            const el = document.getElementById(`tab-content-${t}`);
            const btn = document.getElementById(`tab-btn-${t}`);
            if (el) el.classList.toggle('hidden', t !== tabId);
            if (btn) {
                if (t === tabId) {
                    btn.className = 'px-3.5 py-2 text-xs font-bold rounded-xl bg-sky-600 text-white shadow-sm transition';
                } else {
                    btn.className = 'px-3.5 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 transition';
                }
            }
        });
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
    }
};

window.ClinicAdminApp = ClinicAdminApp;
document.addEventListener('DOMContentLoaded', () => ClinicAdminApp.init());
