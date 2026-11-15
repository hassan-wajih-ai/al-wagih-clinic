/**
 * الدوال المساعدة العامة لنظام «الوجيه» لإدارة العيادات
 * تدعم: التنبيهات المرئية، ثنائية اللغة (عربي / إنجليزي)، الوضع الليلي، وتنسيق الأرقام والتواريخ
 */

const Utils = {
    /**
     * إظهار تنبيه مرئي منبثق (Toast Notification)
     * @param {string} message - نص الرسالة
     * @param {'success'|'error'|'warning'|'info'} type - نوع التنبيه
     */
    showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed bottom-5 left-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none';
            document.body.appendChild(container);
        }

        const colors = {
            success: 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-emerald-500/20',
            error: 'bg-rose-600 dark:bg-rose-700 text-white shadow-rose-500/20',
            warning: 'bg-amber-500 dark:bg-amber-600 text-white shadow-amber-500/20',
            info: 'bg-sky-600 dark:bg-sky-700 text-white shadow-sky-500/20'
        };

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `pointer-events-auto flex items-center justify-between p-4 rounded-2xl shadow-xl transform transition-all duration-300 translate-y-3 opacity-0 animate-slide-up ${colors[type] || colors.info}`;
        toast.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="font-bold text-lg w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">${icons[type] || '•'}</span>
                <span class="text-xs sm:text-sm font-semibold leading-relaxed">${message}</span>
            </div>
            <button onclick="if(this.parentElement.remove) this.parentElement.remove(); else if(this.parentElement.parentNode) this.parentElement.parentNode.removeChild(this.parentElement);" class="text-white/80 hover:text-white mr-2 text-sm font-bold w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition">✕</button>
        `;

        container.appendChild(toast);

        // تشغيل الحركة
        setTimeout(() => {
            toast.classList.remove('translate-y-3', 'opacity-0');
        }, 10);

        // إخفاء تلقائي بعد 4 ثوانٍ
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => {
                if (toast.remove) toast.remove();
                else if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 4000);
    },

    /**
     * تنسيق التاريخ بحسب اللغة المختارة
     * @param {string|Date} dateStr 
     * @returns {string}
     */
    formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        const lang = (typeof I18n !== 'undefined' && I18n.currentLang === 'en') ? 'en-US' : 'ar-EG';
        return d.toLocaleDateString(lang, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    /**
     * تنسيق الوقت بنظام 12 ساعة بحسب اللغة المختارة
     * @param {string} timeStr 
     * @returns {string}
     */
    formatTime(timeStr) {
        if (!timeStr) return '—';
        const isEnglish = (typeof I18n !== 'undefined' && I18n.currentLang === 'en');
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours, 10);
        const suffix = isEnglish ? (h >= 12 ? 'PM' : 'AM') : (h >= 12 ? 'م' : 'ص');
        const formattedHour = ((h + 11) % 12 + 1);
        return `${formattedHour}:${minutes} ${suffix}`;
    },

    /**
     * تنسيق المبالغ المالية مع مراعاة اللغة
     * @param {number} amount 
     * @param {string} currency 
     */
    formatCurrency(amount, currency = null) {
        const val = Number(amount) || 0;
        const isEnglish = (typeof I18n !== 'undefined' && I18n.currentLang === 'en');
        const curr = currency || (isEnglish ? 'EGP' : 'ج.م');
        const locale = isEnglish ? 'en-US' : 'ar-EG';
        return `${val.toLocaleString(locale)} ${curr}`;
    },

    /**
     * تحويل حالة الحجز إلى شارة لونية واضحة
     * @param {'pending'|'confirmed'|'in_progress'|'completed'|'cancelled'} status 
     */
    renderStatusBadge(status) {
        const isEnglish = (typeof I18n !== 'undefined' && I18n.currentLang === 'en');
        const badges = {
            pending: { 
                text: isEnglish ? 'Pending' : 'قيد الانتظار', 
                class: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700' 
            },
            confirmed: { 
                text: isEnglish ? 'Confirmed' : 'مؤكد', 
                class: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border border-sky-300 dark:border-sky-700' 
            },
            in_progress: { 
                text: isEnglish ? 'In Progress' : 'جاري الكشف', 
                class: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-700 animate-pulse' 
            },
            completed: { 
                text: isEnglish ? 'Completed' : 'مكتمل', 
                class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' 
            },
            cancelled: { 
                text: isEnglish ? 'Cancelled' : 'ملغى', 
                class: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-300 dark:border-rose-700' 
            }
        };

        const b = badges[status] || { text: status, class: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
        return `<span class="px-2.5 py-1 text-xs font-semibold rounded-full ${b.class}">${b.text}</span>`;
    },

    /**
     * حساب بداية ونهاية الوردية (8 ساعات) بناء على وقت البدء
     * @param {string} startTime 
     */
    calculateShiftHours(startTime) {
        if (!startTime) return { start: '00:00', end: '08:00' };
        const [h, m] = startTime.split(':').map(Number);
        const endHour = (h + 8) % 24;
        const pad = (n) => String(n).padStart(2, '0');
        return {
            start: `${pad(h)}:${pad(m)}`,
            end: `${pad(endHour)}:${pad(m)}`
        };
    },

    /**
     * إدراج أزرار التحكم بالثيم (Dark Mode) واللغة (i18n) تلقائياً في شريط الرأس
     */
    injectHeaderControls() {
        const header = document.querySelector('header');
        if (!header) return;

        // التحقق مما إذا كانت الأزرار مضافة بالفعل
        if (header.querySelector('.lang-toggle-btn') || header.querySelector('.theme-toggle-btn')) {
            return;
        }

        const navRight = header.querySelector('.max-w-7xl > div:last-child, .max-w-5xl > div:last-child, header > div > div:last-child');
        if (!navRight) return;

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'flex items-center gap-2';
        controlsDiv.innerHTML = `
            <!-- Theme Toggle Button -->
            <button onclick="ThemeManager.toggleTheme()" class="theme-toggle-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm" title="تبديل الثيم / Toggle Dark Mode">
                <span class="text-sm">🌙</span>
            </button>

            <!-- Language Switcher Button -->
            <button onclick="I18n.toggleLanguage()" class="lang-toggle-btn flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm" title="تبديل اللغة / Switch Language">
                <span class="font-bold text-sky-600">EN</span>
                <span class="text-xs">English</span>
            </button>
        `;

        navRight.insertBefore(controlsDiv, navRight.firstChild);

        // تحديث الأزرار بالحالة الحالية
        if (typeof ThemeManager !== 'undefined') ThemeManager.applyTheme(ThemeManager.currentTheme);
        if (typeof I18n !== 'undefined') I18n.applyLanguage(I18n.currentLang);
    }
};

window.Utils = Utils;

// محاولة إدراج عناصر التحكم باللغة والثيم تلقائياً
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        Utils.injectHeaderControls();
    });
}
