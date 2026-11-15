/**
 * نظام الترجمة واللغات (i18n) والوضع الليلي (Dark Mode) وخدمة تأكيد الواتساب
 * نظام الوجيه لإدارة العيادات والمراكز الطبية - Al Wagih Clinic Management
 */

const I18N_DICTIONARY = {
    ar: {
        // عام والتنقل
        app_title: "نظام الوجيه لإدارة العيادات والمستشفيات",
        app_subtitle: "نظام سحابي متكامل 100% لإدارة العيادات والمراكز الطبية",
        demo_tag: "نظام المؤسسات متعدد العيادات والفروع",
        login_title: "تسجيل الدخول للنظام",
        login_desc: "أدخل بيانات حسابك أو اختر أحد الأدوار للتجربة الفورية",
        email_label: "البريد الإلكتروني",
        email_placeholder: "admin@alwagih-clinic.com",
        password_label: "كلمة المرور",
        password_placeholder: "••••••••",
        login_btn: "تسجيل الدخول",
        demo_roles_title: "أدوار الدخول السريع (تجربة النظام بضغطة زر واحدة)",
        demo_roles_desc: "اختر أي رتبة للدخول الفوري وتجربة كافة وظائف النظام بدون كلمة مرور:",
        logout: "تسجيل الخروج",
        dark_mode: "الوضع الليلي",
        light_mode: "الوضع النهاري",
        language: "اللغة",
        switch_lang_btn: "English",
        close: "إغلاق",
        save: "حفظ",
        cancel: "إلغاء",
        delete: "حذف",
        edit: "تعديل",
        actions: "الإجراءات",
        status: "الحالة",
        date: "التاريخ",
        time: "الوقت",
        search: "بحث...",
        loading: "جاري التحميل...",
        confirm: "تأكيد",

        // الأدوار
        role_superadmin: "المدير العام (Super Admin)",
        role_admin: "مدير العيادة (Admin ERP)",
        role_accountant: "المحاسب المالي (Accountant)",
        role_receptionist: "الاستقبال والحجوزات (Receptionist)",
        role_doctor: "الطبيب وغرفة الكشف (Doctor)",
        role_patient: "بوابة المريض (Patient)",

        // الإحصائيات العامة
        kpi_crm_leads: "مرضى الـ CRM والمهتمين",
        kpi_attendance: "حضور جهاز البصمة لليوم",
        kpi_suppliers_due: "مستحقات موردي المشتريات",
        kpi_corporate_claims: "مطالبات شركات التأمين",
        kpi_cash_revenue: "نقدية الخزينة (Cash)",
        kpi_waiting_patients: "مرضى بقائمة الانتظار",

        // لوحة الإدارة والأقسام
        tab_crm: "🎯 الـ CRM ومتابعة المرضى والواتساب",
        tab_hr: "👥 الـ HR والبصمة والجزاءات والورديات",
        tab_inventory: "📦 المخازن والجرد الدوري للمواد",
        tab_procurement: "🛒 المشتريات والموردين وفواتير الشراء",
        tab_corporate: "🏢 التعاقدات والشركات ونسب الخصم",
        tab_reports: "📊 مركز التقارير والإحصائيات الشاملة",
        rep_analytics: "📈 تقرير الإحصائيات ومؤشرات الأداء",
        rep_financial: "💰 تقرير المالية والإيرادات",
        rep_procurement: "🛒 تقرير المشتريات وأوامر التوريد",
        rep_patient_visits: "🩺 تقرير المرضى بالزيارات والإجراءات الطبية",
        tab_audit: "🛡️ الرقابة والتدقيق وحركات النظام",

        // نظام الـ CRM والواتساب
        crm_pipeline_title: "مسار متابعة وتصنيف المرضى (Patient Pipeline)",
        crm_wa_title: "منصة رسائل الواتساب الفورية للعيادة (WhatsApp Studio)",
        crm_callcenter_title: "استوديو الكول سنتر وسجل المكالمات (Call Center)",
        crm_helpdesk_title: "خدمة العملاء وتذاكر الدعم والشكاوى (Help Desk)",
        btn_send_whatsapp: "إرسال عبر واتساب",
        btn_log_call: "تسجيل مكالمة",
        btn_new_ticket: "فتح تذكرة",
        template_reminder: "تذكير بموعد الكشف",
        template_prep: "تعليمات الصيام والتحضير",
        template_followup: "متابعة ما بعد الكشف الطبي",
        template_insurance: "تأكيد نسبة تحمل التأمين والخصم",
        template_custom: "رسالة حرة مخصصة",

        // المواعيد وتأكيد الحجز
        booking_new: "حجز كشف جديد",
        booking_desc: "اختر العيادة، الفرع، الطبيب، وطريقة المحاسبة",
        clinic: "العيادة",
        branch: "الفرع",
        doctor: "الطبيب",
        appointment_date: "تاريخ الموعد",
        payment_method: "طريقة السداد",
        pay_cash: "💵 سداد نقدي مباشر بالعيادة",
        pay_corporate: "🏢 تعاقد شركة / تأمين طبي ونقابات",
        contract_select: "اختر جهة التعاقد / التأمين",
        btn_book_now: "تأكيد وإتمام الحجز",
        booking_success_title: "🎉 تم تأكيد حجز الموعد بنجاح!",
        booking_wa_confirm_prompt: "هل ترغب في إرسال تفاصيل الموعد للمريض عبر الواتساب الآن؟",
        btn_send_wa_confirm: "💬 إرسال رسالة التأكيد عبر واتساب",
        booking_ref: "رقم الحجز المرجعي",

        // تصدير الشيتات
        export_excel: "تصدير شيت إكسل",
        export_pdf: "طباعة تقرير PDF",

        // الحالات
        status_pending: "قيد الانتظار",
        status_confirmed: "مؤكد",
        status_completed: "مكتمل",
        status_cancelled: "ملغي",

        // رسائل الواتساب الجاهزة
        wa_confirm_greeting: "مرحباً أستاذ/ة",
        wa_confirm_body: "تم تأكيد حجز موعدكم بنجاح في عيادات الوجيه التخصصية 🏥",
        wa_confirm_details: "📋 تفاصيل الحجز:",
        wa_confirm_ref: "• رقم الحجز:",
        wa_confirm_doctor: "• الطبيب:",
        wa_confirm_clinic: "• العيادة:",
        wa_confirm_date: "• الموعد:",
        wa_confirm_pay: "• طريقة السداد:",
        wa_confirm_note: "📍 يرجى الحضور قبل الموعد بـ 15 دقيقة لتأكيد الحضور في مكتب الاستقبال. نتمنى لكم دوام الصحة والعافية! 🩺"
    },
    en: {
        // General & Navigation
        app_title: "Al Wagih Hospital & Clinic ERP System",
        app_subtitle: "100% Free Cloud Multi-Tenant Healthcare & Clinic Suite",
        demo_tag: "Enterprise Multi-Tenant Healthcare System",
        login_title: "System Login Portal",
        login_desc: "Sign in with your credentials or select an instant demo role below",
        email_label: "Email Address",
        email_placeholder: "admin@alwagih-clinic.com",
        password_label: "Password",
        password_placeholder: "••••••••",
        login_btn: "Sign In",
        demo_roles_title: "Instant 1-Click Demo Roles (No Password Required)",
        demo_roles_desc: "Click any role below for instant unrestricted access to all features:",
        logout: "Sign Out",
        dark_mode: "Dark Mode",
        light_mode: "Light Mode",
        language: "Language",
        switch_lang_btn: "عربي",
        close: "Close",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        actions: "Actions",
        status: "Status",
        date: "Date",
        time: "Time",
        search: "Search...",
        loading: "Loading...",
        confirm: "Confirm",

        // Roles
        role_superadmin: "Super Admin",
        role_admin: "Clinic Admin (ERP)",
        role_accountant: "Financial Accountant",
        role_receptionist: "Receptionist",
        role_doctor: "Consultant Doctor",
        role_patient: "Patient Portal",

        // KPIs
        kpi_crm_leads: "CRM Patients & Leads",
        kpi_attendance: "Biometric Attendance Today",
        kpi_suppliers_due: "Procurement Payables Due",
        kpi_corporate_claims: "Insurance & Corporate Claims",
        kpi_cash_revenue: "Cash Register Revenue",
        kpi_waiting_patients: "Patients in Waiting List",

        // Admin Tabs
        tab_crm: "🎯 Medical CRM & WhatsApp Studio",
        tab_hr: "👥 HR, Biometrics, Penalties & Shifts",
        tab_inventory: "📦 Inventory & Periodic Stocktaking",
        tab_procurement: "🛒 Procurement & Supplier Bills",
        tab_corporate: "🏢 Corporate Contracts & Discounts",
        tab_reports: "📊 Reports & Analytics Hub",
        rep_analytics: "📈 Analytics & Clinic Statistics Report",
        rep_financial: "💰 Financial & Revenue Statement",
        rep_procurement: "🛒 Procurement & Purchase Orders",
        rep_patient_visits: "🩺 Patient Visits & Medical Procedures",
        tab_audit: "🛡️ Financial Audit & Security Logs",

        // CRM & WhatsApp
        crm_pipeline_title: "Patient Journey Pipeline & Classification",
        crm_wa_title: "Clinic Direct WhatsApp Messenger (Studio)",
        crm_callcenter_title: "Call Center Studio & Inbound/Outbound Log",
        crm_helpdesk_title: "Customer Service & Help Desk Tickets",
        btn_send_whatsapp: "Send via WhatsApp",
        btn_log_call: "Log Call",
        btn_new_ticket: "Open Ticket",
        template_reminder: "Appointment Reminder",
        template_prep: "Fasting & Prep Instructions",
        template_followup: "Post-Consultation Follow-Up",
        template_insurance: "Insurance Co-Pay Confirmation",
        template_custom: "Custom Text Message",

        // Appointments & Booking
        booking_new: "Book New Appointment",
        booking_desc: "Select clinic, branch, doctor, and payment method",
        clinic: "Clinic",
        branch: "Branch",
        doctor: "Doctor",
        appointment_date: "Appointment Date",
        payment_method: "Payment Method",
        pay_cash: "💵 Direct Cash at Clinic",
        pay_corporate: "🏢 Corporate Insurance / Syndicates",
        contract_select: "Select Insurance Provider",
        btn_book_now: "Confirm & Book Now",
        booking_success_title: "🎉 Appointment Confirmed Successfully!",
        booking_wa_confirm_prompt: "Would you like to send appointment confirmation details via WhatsApp now?",
        btn_send_wa_confirm: "💬 Send Confirmation via WhatsApp",
        booking_ref: "Booking Reference #",

        // Export
        export_excel: "Export to Excel",
        export_pdf: "Print PDF Report",

        // Statuses
        status_pending: "Pending",
        status_confirmed: "Confirmed",
        status_completed: "Completed",
        status_cancelled: "Cancelled",

        // WhatsApp Confirmation Message
        wa_confirm_greeting: "Dear",
        wa_confirm_body: "Your appointment has been successfully confirmed at Al Wagih Specialized Clinics 🏥",
        wa_confirm_details: "📋 Appointment Details:",
        wa_confirm_ref: "• Reference #:",
        wa_confirm_doctor: "• Doctor:",
        wa_confirm_clinic: "• Clinic:",
        wa_confirm_date: "• Date & Time:",
        wa_confirm_pay: "• Payment:",
        wa_confirm_note: "📍 Please arrive 15 minutes before your scheduled appointment time to complete reception check-in. Wishing you great health! 🩺"
    }
};

/**
 * مدير الترجمة واللغات (I18n Manager)
 */
const I18n = {
    currentLang: 'ar',

    init() {
        this.currentLang = localStorage.getItem('alwagih_lang') || 'ar';
        this.applyLanguage(this.currentLang);
    },

    t(key, fallback = '') {
        const dict = I18N_DICTIONARY[this.currentLang] || I18N_DICTIONARY.ar;
        return dict[key] || fallback || key;
    },

    applyLanguage(lang) {
        this.currentLang = lang;
        localStorage.setItem('alwagih_lang', lang);

        const html = document.documentElement;
        if (html) {
            html.lang = lang;
            html.dir = lang === 'ar' ? 'rtl' : 'ltr';
        }

        // تحديث النصوص ذات السمة data-i18n
        if (document.querySelectorAll) {
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                const translation = this.t(key);
                if (translation) {
                    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                        el.placeholder = translation;
                    } else {
                        el.textContent = translation;
                    }
                }
            });

            // تحديث data-i18n-placeholder
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                const translation = this.t(key);
                if (translation) el.placeholder = translation;
            });

            // تحديث data-i18n-title
            document.querySelectorAll('[data-i18n-title]').forEach(el => {
                const key = el.getAttribute('data-i18n-title');
                const translation = this.t(key);
                if (translation) el.title = translation;
            });

            // تحديث زر تبديل اللغة
            const toggleBtns = document.querySelectorAll('.lang-toggle-btn');
            toggleBtns.forEach(btn => {
                btn.innerHTML = lang === 'ar' 
                    ? '<span class="font-bold text-sky-600">EN</span> <span class="text-xs">English</span>' 
                    : '<span class="font-bold text-emerald-600">ع</span> <span class="text-xs">عربي</span>';
            });
        }

        // إطلاق حدث تغيير اللغة لتحديث الجداول والرسوم البيانية
        if (typeof window !== 'undefined' && window.dispatchEvent && typeof CustomEvent !== 'undefined') {
            window.dispatchEvent(new CustomEvent('alwagih_language_changed', { detail: { lang } }));
        }
    },

    setLanguage(lang) {
        this.applyLanguage(lang);
    },

    toggleLanguage() {
        const newLang = this.currentLang === 'ar' ? 'en' : 'ar';
        this.applyLanguage(newLang);
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(newLang === 'ar' ? 'تم تحويل الواجهة إلى اللغة العربية' : 'Switched to English interface', 'info');
        }
    }
};

/**
 * مدير الوضع الليلي (Dark Mode Manager)
 */
const ThemeManager = {
    currentTheme: 'light',

    init() {
        const saved = (typeof localStorage !== 'undefined' && localStorage.getItem) ? localStorage.getItem('alwagih_theme') : null;
        if (saved) {
            this.currentTheme = saved;
        } else if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.currentTheme = 'dark';
        } else {
            this.currentTheme = 'light';
        }
        this.applyTheme(this.currentTheme);
    },

    applyTheme(theme) {
        this.currentTheme = theme;
        if (typeof localStorage !== 'undefined' && localStorage.setItem) {
            localStorage.setItem('alwagih_theme', theme);
        }

        const html = document.documentElement;
        if (html && html.classList) {
            if (theme === 'dark') {
                html.classList.add('dark');
            } else {
                html.classList.remove('dark');
            }
        }

        // تحديث أزرار تبديل الثيم
        if (document.querySelectorAll) {
            const themeBtns = document.querySelectorAll('.theme-toggle-btn');
            themeBtns.forEach(btn => {
                btn.innerHTML = theme === 'dark' 
                    ? '<span class="text-amber-400 text-sm">☀️</span> <span class="text-xs font-semibold hidden sm:inline" data-i18n="light_mode">نهاري</span>' 
                    : '<span class="text-slate-600 dark:text-slate-300 text-sm">🌙</span> <span class="text-xs font-semibold hidden sm:inline" data-i18n="dark_mode">ليلي</span>';
            });
        }

        if (typeof window !== 'undefined' && window.dispatchEvent && typeof CustomEvent !== 'undefined') {
            window.dispatchEvent(new CustomEvent('alwagih_theme_changed', { detail: { theme } }));
        }
    },

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(newTheme === 'dark' ? 'تم تفعيل الوضع الليلي 🌙' : 'تم تفعيل الوضع النهاري ☀️', 'info');
        }
    }
};

/**
 * خدمة إرسال وتأكيد رسائل الواتساب للحجوزات (WhatsApp Confirmation Engine)
 */
const WhatsAppService = {
    /**
     * تجهيز نص رسالة تأكيد الحجز (عربي وإنجليزي)
     */
    generateConfirmationText(details) {
        const lang = I18n.currentLang;
        const patientName = details.patient_name || details.patientName || 'المريض الكريم';
        const doctorName = details.doctor_name || details.doctorName || 'طبيب العيادة';
        const clinicName = details.clinic_name || details.clinicName || 'عيادات الوجيه التخصصية';
        const branchName = details.branch_name || details.branchName || 'الفرع الرئيسي';
        const date = details.date || new Date().toISOString().split('T')[0];
        const time = details.time_slot || details.time || '14:00';
        const refId = details.id || ('REF-' + Math.floor(100000 + Math.random() * 900000));
        const payType = details.payment_type === 'corporate' 
            ? `تعاقد شركة (${details.contract_name || 'تأمين طبي'})` 
            : 'سداد نقدي مباشر (Cash)';

        if (lang === 'en') {
            return `*${I18n.t('wa_confirm_greeting')} ${patientName}*,

${I18n.t('wa_confirm_body')}

${I18n.t('wa_confirm_details')}
${I18n.t('wa_confirm_ref')} *#${refId}*
${I18n.t('wa_confirm_doctor')} ${doctorName}
${I18n.t('wa_confirm_clinic')} ${clinicName} - ${branchName}
${I18n.t('wa_confirm_date')} ${date} @ ${time}
${I18n.t('wa_confirm_pay')} ${payType}

${I18n.t('wa_confirm_note')}`;
        } else {
            return `*${I18n.t('wa_confirm_greeting')} ${patientName}*،

${I18n.t('wa_confirm_body')}

${I18n.t('wa_confirm_details')}
${I18n.t('wa_confirm_ref')} *#${refId}*
${I18n.t('wa_confirm_doctor')} ${doctorName}
${I18n.t('wa_confirm_clinic')} ${clinicName} (${branchName})
${I18n.t('wa_confirm_date')} ${date} الساعة ${time}
${I18n.t('wa_confirm_pay')} ${payType}

${I18n.t('wa_confirm_note')}`;
        }
    },

    /**
     * فتح رابط واتساب مباشرة بالرسالة المجهزة
     */
    openWhatsApp(phone, messageText) {
        let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('01')) {
            cleanPhone = '2' + cleanPhone; // إضافة كود مصر إذا كان 01xxxxxxxxx
        }
        const encoded = encodeURIComponent(messageText);
        const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
        
        // تسجيل الحركة في سجل الـ CRM
        this.logToCRM({
            patient_phone: phone || 'غير محدد',
            message: messageText,
            timestamp: new Date().toISOString(),
            status: 'sent'
        });

        window.open(url, '_blank');
    },

    /**
     * حفظ سجل رسائل الواتساب المشترك
     */
    logToCRM(entry) {
        try {
            const key = 'alwagih_crm_communications';
            const logs = JSON.parse(localStorage.getItem(key) || '[]');
            logs.unshift(entry);
            localStorage.setItem(key, JSON.stringify(logs.slice(0, 100)));
        } catch (e) {
            console.error('Failed to log WhatsApp communication', e);
        }
    },

    /**
     * إظهار نافذة منبثقة تأكيدية تفاعلية فور إتمام الحجز
     */
    showBookingConfirmationModal(details) {
        let modal = document.getElementById('booking-whatsapp-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'booking-whatsapp-modal';
            modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in';
            document.body.appendChild(modal);
        }

        const patientName = details.patient_name || details.patientName || 'المريض الكريم';
        const phone = details.patient_phone || details.patientPhone || '';
        const doctorName = details.doctor_name || details.doctorName || 'طبيب العيادة';
        const date = details.date || new Date().toISOString().split('T')[0];
        const time = details.time_slot || details.time || '14:00';
        const refId = details.id || ('REF-' + Math.floor(100000 + Math.random() * 900000));
        const messageText = this.generateConfirmationText(details);

        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-in relative text-slate-800 dark:text-slate-100">
                <!-- Close Button -->
                <button onclick="document.getElementById('booking-whatsapp-modal').classList.add('hidden')" class="absolute top-4 left-4 sm:top-5 sm:left-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition">✕</button>

                <!-- Header Icon & Title -->
                <div class="text-center space-y-2">
                    <div class="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner">
                        ✓
                    </div>
                    <h3 class="text-xl font-black text-slate-900 dark:text-white" data-i18n="booking_success_title">${I18n.t('booking_success_title')}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400" data-i18n="booking_wa_confirm_prompt">${I18n.t('booking_wa_confirm_prompt')}</p>
                </div>

                <!-- Booking Summary Card -->
                <div class="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                    <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                        <span class="text-slate-500 dark:text-slate-400" data-i18n="booking_ref">${I18n.t('booking_ref')}</span>
                        <span class="font-mono font-bold text-sky-600 dark:text-sky-400">#${refId}</span>
                    </div>
                    <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                        <span class="text-slate-500 dark:text-slate-400" data-i18n="patient_name">${I18n.t('patient_name')}</span>
                        <span class="font-bold">${patientName}</span>
                    </div>
                    <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                        <span class="text-slate-500 dark:text-slate-400" data-i18n="doctor">${I18n.t('doctor')}</span>
                        <span class="font-bold">${doctorName}</span>
                    </div>
                    <div class="flex justify-between items-center py-1">
                        <span class="text-slate-500 dark:text-slate-400" data-i18n="appointment_date">${I18n.t('appointment_date')}</span>
                        <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">${date} - ${time}</span>
                    </div>
                </div>

                <!-- Phone input if needed -->
                <div class="mt-4">
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1" data-i18n="phone">رقم هاتف المريض (الواتساب)</label>
                    <input type="tel" id="wa-modal-phone" value="${phone}" placeholder="010xxxxxxxx" class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500">
                </div>

                <!-- Action Buttons -->
                <div class="mt-6 flex flex-col sm:flex-row gap-3">
                    <button id="btn-confirm-send-wa" class="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all">
                        <span class="text-base">💬</span>
                        <span data-i18n="btn_send_wa_confirm">${I18n.t('btn_send_wa_confirm')}</span>
                    </button>
                    <button onclick="document.getElementById('booking-whatsapp-modal').classList.add('hidden')" class="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs transition">
                        ${I18n.t('close')}
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');

        document.getElementById('btn-confirm-send-wa').onclick = () => {
            const inputPhone = document.getElementById('wa-modal-phone').value.trim() || phone;
            this.openWhatsApp(inputPhone, messageText);
            modal.classList.add('hidden');
            if (typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast(I18n.currentLang === 'ar' ? 'تم فتح واتساب لإرسال رسالة التأكيد 💬' : 'Opening WhatsApp for confirmation 💬', 'success');
            }
        };
    }
};

// تشغيل فوري لإعداد الوضع الليلي واللغة قبل اكتمال تحميل الصفحة لتجنب الوميض (No flicker)
if (typeof window !== 'undefined') {
    ThemeManager.init();
    window.I18n = I18n;
    window.ThemeManager = ThemeManager;
    window.WhatsAppService = WhatsAppService;

    document.addEventListener('DOMContentLoaded', () => {
        I18n.init();
        ThemeManager.init();
    });
}
