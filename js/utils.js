/**
 * الدوال المساعدة العامة لنظام «الوجيه» لإدارة العيادات
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
            container.className = 'fixed bottom-5 left-5 z-50 flex flex-col gap-2 max-w-sm w-full';
            document.body.appendChild(container);
        }

        const colors = {
            success: 'bg-emerald-600 text-white',
            error: 'bg-rose-600 text-white',
            warning: 'bg-amber-500 text-white',
            info: 'bg-sky-600 text-white'
        };

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `flex items-center justify-between p-4 rounded-xl shadow-lg transform transition-all duration-300 translate-y-3 opacity-0 ${colors[type] || colors.info}`;
        toast.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="font-bold text-lg">${icons[type] || '•'}</span>
                <span class="text-sm font-medium leading-relaxed">${message}</span>
            </div>
            <button onclick="this.parentElement.remove()" class="text-white/80 hover:text-white mr-2 text-sm font-bold">✕</button>
        `;

        container.appendChild(toast);

        // تشغيل الحركة
        setTimeout(() => {
            toast.classList.remove('translate-y-3', 'opacity-0');
        }, 10);

        // إخفاء تلقائي بعد 4 ثوانٍ
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    /**
     * تنسيق التاريخ باللغة العربية
     * @param {string|Date} dateStr 
     * @returns {string}
     */
    formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    /**
     * تنسيق الوقت بنظام 12 ساعة
     * @param {string} timeStr 
     * @returns {string}
     */
    formatTime(timeStr) {
        if (!timeStr) return '—';
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours, 10);
        const suffix = h >= 12 ? 'م' : 'ص';
        const formattedHour = ((h + 11) % 12 + 1);
        return `${formattedHour}:${minutes} ${suffix}`;
    },

    /**
     * تنسيق المبالغ المالية
     * @param {number} amount 
     * @param {string} currency 
     */
    formatCurrency(amount, currency = 'ج.م') {
        const val = Number(amount) || 0;
        return `${val.toLocaleString('ar-EG')} ${currency}`;
    },

    /**
     * تحويل حالة الحجز إلى شارة لونية واضحة
     * @param {'pending'|'confirmed'|'in_progress'|'completed'|'cancelled'} status 
     */
    renderStatusBadge(status) {
        const badges = {
            pending: { text: 'قيد الانتظار', class: 'bg-amber-100 text-amber-700 border border-amber-300' },
            confirmed: { text: 'مؤكد', class: 'bg-sky-100 text-sky-700 border border-sky-300' },
            in_progress: { text: 'جاري الكشف', class: 'bg-purple-100 text-purple-700 border border-purple-300 animate-pulse' },
            completed: { text: 'مكتمل', class: 'bg-emerald-100 text-emerald-700 border border-emerald-300' },
            cancelled: { text: 'ملغى', class: 'bg-rose-100 text-rose-700 border border-rose-300' }
        };

        const b = badges[status] || { text: status, class: 'bg-slate-100 text-slate-700' };
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
    }
};

window.Utils = Utils;
