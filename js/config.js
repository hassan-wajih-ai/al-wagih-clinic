/**
 * إعدادات الاتصال بنظام Supabase والمحرك السحابي / المحلي المدمج
 * نظام الوجيه لإدارة العيادات والمراكز الطبية
 */

const SUPABASE_CONFIG = {
    // استبدل الرابط أدناه برابط مشروعك الفعلي من Supabase (إذا رغبت في الربط السحابي المباشر)
    url: 'https://wykyyncgjlveaejfeodm.supabase.co',
    // مفتاح anon public key الفعلي (يبدأ عادة بـ eyJ...)
    anonKey: 'sb_publishable_C9LAIZVkORpa2AzZ1REFAg_8EI3kIDE'
};

// فحص ما إذا كانت مفاتيح Supabase مدخلة بشكل صالح وحقيقي (وليس مفاتيح تجريبية أو وهمية)
function isSupabaseConfigured() {
    return Boolean(
        typeof SUPABASE_CONFIG !== 'undefined' &&
        SUPABASE_CONFIG.url &&
        !SUPABASE_CONFIG.url.includes('xyzcompany') &&
        !SUPABASE_CONFIG.url.includes('wykyyncgjlveaejfeodm') &&
        SUPABASE_CONFIG.anonKey &&
        SUPABASE_CONFIG.anonKey.startsWith('eyJ')
    );
}

// تهيئة عميل Supabase المشترك
let db = null;

function initSupabase() {
    if (typeof window === 'undefined') return null;

    if (!isSupabaseConfigured()) {
        // تشغيل وضع Standalone Offline / Demo Mode الفوري بدون أي أخطاء شبكة أو انتظار
        window.db = null;
        return null;
    }

    try {
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            db = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            window.db = db;
            return db;
        } else {
            console.warn('مكتبة Supabase لم تُحمل بعد.');
            return null;
        }
    } catch (err) {
        console.warn('فشل تهيئة Supabase، تم الانتقال تلقائياً للوضع المحلي المستقل:', err);
        window.db = null;
        return null;
    }
}

// جعل الدوال والمتغيرات متاحة عاماً
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.isSupabaseConfigured = isSupabaseConfigured;
window.initSupabase = initSupabase;

// تهيئة فورية آمنة
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initSupabase());
    } else {
        initSupabase();
    }
}
