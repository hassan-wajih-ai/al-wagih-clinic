/**
 * نظام إدارة المصادقة وتوجيه الأدوار (Auth & Role Routing)
 */

const Auth = {
    // خريطة مسارات لوحات التحكم بحسب الدور
    ROLE_ROUTES: {
        superadmin: 'dashboards/superadmin/index.html',
        admin: 'dashboards/admin/index.html',
        receptionist: 'dashboards/receptionist/index.html',
        doctor: 'dashboards/doctor/index.html',
        patient: 'dashboards/patient/index.html'
    },

    /**
     * الحصول على المسار النسبي الصحيح بناءً على موقع الصفحة الحالي
     */
    getRelativePath(targetPath) {
        const isSubDir = window.location.pathname.includes('/dashboards/');
        return isSubDir ? `../../${targetPath}` : `./${targetPath}`;
    },

    /**
     * تسجيل الدخول بالبريد الإلكتروني وكلمة المرور
     * @param {string} email 
     * @param {string} password 
     */
    async login(email, password) {
        if (!window.db) initSupabase();
        if (!window.db) {
            Utils.showToast('تعذر الاتصال بقاعدة البيانات. تأكد من إعدادات Supabase.', 'error');
            return null;
        }

        try {
            const { data, error } = await window.db.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // جلب ملف المستخدم لمعرفة الدور والنطاق
            const profile = await this.getUserProfile(data.user.id);
            if (!profile) {
                throw new Error('لم يتم العثور على الملف الشخصي أو الصلاحيات الخاصة بهذا المستخدم.');
            }

            Utils.showToast(`أهلاً بك يا ${profile.full_name || 'مستخدمنا الكريم'}`, 'success');

            // توجيه المستخدم حسب الدور
            this.redirectByRole(profile.role);
            return { user: data.user, profile };
        } catch (err) {
            console.error('Login error:', err);
            Utils.showToast(err.message || 'فشل تسجيل الدخول. تحقق من البيانات المدخلة.', 'error');
            return null;
        }
    },

    /**
     * جلب الملف الشخصي وتفاصيل الدور من جدول users_profiles
     * @param {string} userId 
     */
    async getUserProfile(userId) {
        if (!window.db) initSupabase();
        const { data, error } = await window.db
            .from('users_profiles')
            .select('*, clinics(name), branches(name)')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Fetch profile error:', error);
            return null;
        }
        localStorage.setItem('alwagih_profile', JSON.stringify(data));
        return data;
    },

    /**
     * استرجاع الملف الشخصي المحفوظ محلياً
     */
    getCurrentProfile() {
        const stored = localStorage.getItem('alwagih_profile');
        return stored ? JSON.parse(stored) : null;
    },

    /**
     * توجيه المستخدم بناءً على دوره
     * @param {string} role 
     */
    redirectByRole(role) {
        const route = this.ROLE_ROUTES[role] || this.ROLE_ROUTES.patient;
        const targetUrl = this.getRelativePath(route);
        setTimeout(() => {
            window.location.href = targetUrl;
        }, 500);
    },

    /**
     * حماية الصفحة والتحقق من الصلاحيات المطلوبة
     * @param {string[]} allowedRoles - الأدوار المصرح لها بفتح الصفحة
     */
    async protectRoute(allowedRoles = []) {
        if (!window.db) initSupabase();
        
        // التحقق من وجود جلسة نشطة
        const { data: { session } } = await window.db.auth.getSession();
        if (!session) {
            // توجيه لصفحة تسجيل الدخول
            window.location.href = this.getRelativePath('index.html');
            return null;
        }

        const profile = this.getCurrentProfile() || await this.getUserProfile(session.user.id);
        if (!profile) {
            await this.logout();
            return null;
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
            alert('عذراً! ليس لديك الصلاحية للوصول إلى هذه اللوحة.');
            this.redirectByRole(profile.role);
            return null;
        }

        return { user: session.user, profile };
    },

    /**
     * تسجيل الخروج
     */
    async logout() {
        if (window.db) {
            await window.db.auth.signOut();
        }
        localStorage.removeItem('alwagih_profile');
        window.location.href = this.getRelativePath('index.html');
    }
};

window.Auth = Auth;
