/**
 * إعدادات الاتصال بنظام Supabase
 * يتم ملء المفاتيح من لوحة تحكم مشروع Supabase المجاني (Project Settings -> API)
 */

const SUPABASE_CONFIG = {
    // استبدل الرابط أدناه برابط مشروعك الفعلي من Supabase
    url: 'https://wykyyncgjlveaejfeodm.supabase.co',
    anonKey: 'sb_publishable_C9LAIZVkORpa2AzZ1REFAg_8EI3kIDE'  // استبدل المفتاح أدناه بمفتاح anon public key
};

// تهيئة عميل Supabase المشترك
let db = null;

function initSupabase() {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        db = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        window.db = db;
        return db;
    } else {
        console.warn('مكتبة Supabase لم تُحمل بعد.');
        return null;
    }
}

// محاولة التهيئة الفورية عند توفر المكتبة
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        initSupabase();
    });
}
