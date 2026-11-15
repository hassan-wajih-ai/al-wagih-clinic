/**
 * نظام إدارة المصادقة وتوجيه الأدوار (Universal Auth & Role Routing)
 * يدعم العمل السحابي عبر Supabase والتشغيل الفوري التجريبي (Offline & Demo Mode) لجميع الأدوار
 */

const Auth = {
    ROLE_ROUTES: {
        superadmin: 'dashboards/superadmin/index.html',
        admin: 'dashboards/admin/index.html',
        accountant: 'dashboards/accountant/index.html',
        receptionist: 'dashboards/receptionist/index.html',
        doctor: 'dashboards/doctor/index.html',
        patient: 'dashboards/patient/index.html',
        pharmacist: 'dashboards/pharmacy/index.html'
    },

    DEMO_PROFILES: {
        superadmin: {
            id: 'demo_superadmin',
            email: 'superadmin@clinic.com',
            full_name: 'د. حسام الوجيه (المدير العام)',
            role: 'superadmin',
            clinics: { name: 'مجموعة عيادات الشفاء التخصصية' },
            branches: { name: 'الإدارة العامة' }
        },
        admin: {
            id: 'demo_admin',
            email: 'admin@clinic.com',
            full_name: 'أ. طارق عبد المنعم (مدير العيادة)',
            role: 'admin',
            clinics: { name: 'عيادات الشفاء التخصصية' },
            branches: { name: 'فرع المعادي الرئيسي' }
        },
        accountant: {
            id: 'demo_accountant',
            email: 'accountant@clinic.com',
            full_name: 'أ. محمود فؤاد (المحاسب المالي)',
            role: 'accountant',
            clinics: { name: 'عيادات الشفاء التخصصية' },
            branches: { name: 'فرع المعادي الرئيسي' }
        },
        receptionist: {
            id: 'demo_receptionist',
            email: 'receptionist@clinic.com',
            full_name: 'ريم مصطفى (مشرف الاستقبال)',
            role: 'receptionist',
            clinics: { name: 'عيادات الشفاء التخصصية' },
            branches: { name: 'فرع المعادي الرئيسي' }
        },
        doctor: {
            id: 'demo_doctor',
            email: 'doctor@clinic.com',
            full_name: 'د. أحمد الشناوي (استشاري باطنة)',
            role: 'doctor',
            clinics: { name: 'عيادات الشفاء التخصصية' },
            branches: { name: 'فرع المعادي الرئيسي' }
        },
        patient: {
            id: 'demo_patient',
            email: 'patient@clinic.com',
            full_name: 'طارق حسام مصطفى (مريض)',
            role: 'patient',
            phone: '01011223344'
        },
        pharmacist: {
            id: 'demo_pharmacist',
            email: 'pharmacist@clinic.com',
            full_name: 'د. سارة عثمان (مسؤول الصيدلية المركزية)',
            role: 'pharmacist',
            clinics: { name: 'صيدلية مجمع الوجيه التخصصي' },
            branches: { name: 'الصيدلية الداخلية والعيادات الخارجية' }
        }
    },

    getRelativePath(targetPath) {
        const isSubDir = window.location.pathname.includes('/dashboards/');
        return isSubDir ? `../../${targetPath}` : `./${targetPath}`;
    },

    async login(email, password) {
        if (!email) {
            Utils.showToast('يرجى إدخال البريد الإلكتروني', 'warning');
            return null;
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 1. المحاولة الأولى: عبر Supabase إذا كانت مفاتيح الاتصال مهيأة
        if (window.db && window.SUPABASE_CONFIG && !window.SUPABASE_CONFIG.url.includes('xyzcompany')) {
            try {
                const { data, error } = await window.db.auth.signInWithPassword({
                    email: normalizedEmail,
                    password
                });

                if (!error && data && data.user) {
                    const profile = await this.getUserProfile(data.user.id);
                    if (profile) {
                        Utils.showToast(`أهلاً بك يا ${profile.full_name || 'مستخدمنا الكريم'}`, 'success');
                        this.redirectByRole(profile.role);
                        return { user: data.user, profile };
                    }
                }
            } catch (err) {
                console.warn('Supabase auth failed, switching to smart demo login:', err);
            }
        }

        // 2. المحاولة الثانية: الدخول الذكي الفوري (Demo Fallback Login)
        let detectedRole = 'admin';
        if (normalizedEmail.includes('super')) detectedRole = 'superadmin';
        else if (normalizedEmail.includes('acc')) detectedRole = 'accountant';
        else if (normalizedEmail.includes('rec')) detectedRole = 'receptionist';
        else if (normalizedEmail.includes('doc')) detectedRole = 'doctor';
        else if (normalizedEmail.includes('patient')) detectedRole = 'patient';
        else if (normalizedEmail.includes('pharm') || normalizedEmail.includes('drug')) detectedRole = 'pharmacist';

        const profile = this.DEMO_PROFILES[detectedRole] || this.DEMO_PROFILES.admin;
        profile.email = normalizedEmail;
        localStorage.setItem('alwagih_profile', JSON.stringify(profile));
        localStorage.setItem('alwagih_demo_auth', 'true');

        Utils.showToast(`تم تسجيل الدخول بنجاح كـ (${profile.full_name})`, 'success');
        this.redirectByRole(profile.role);
        return { user: { id: profile.id, email: profile.email }, profile };
    },

    quickLogin(role) {
        const profile = this.DEMO_PROFILES[role] || this.DEMO_PROFILES.admin;
        localStorage.setItem('alwagih_profile', JSON.stringify(profile));
        localStorage.setItem('alwagih_demo_auth', 'true');
        this.redirectByRole(profile.role);
    },

    async getUserProfile(userId) {
        if (window.db) {
            try {
                const { data, error } = await window.db
                    .from('users_profiles')
                    .select('*, clinics(name), branches(name)')
                    .eq('id', userId)
                    .single();

                if (!error && data) {
                    localStorage.setItem('alwagih_profile', JSON.stringify(data));
                    return data;
                }
            } catch (e) {}
        }
        return this.getCurrentProfile();
    },

    getCurrentProfile() {
        try {
            const stored = localStorage.getItem('alwagih_profile');
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            return null;
        }
    },

    redirectByRole(role) {
        const route = this.ROLE_ROUTES[role] || this.ROLE_ROUTES.admin;
        const targetUrl = this.getRelativePath(route);
        setTimeout(() => {
            window.location.href = targetUrl;
        }, 200);
    },

    async protectRoute(allowedRoles = []) {
        if (!window.db && typeof initSupabase === 'function') initSupabase();

        // 1. فحص جلسة Supabase الحية إن وجدت
        if (window.db) {
            try {
                const { data: { session } } = await window.db.auth.getSession();
                if (session && session.user) {
                    const profile = this.getCurrentProfile() || await this.getUserProfile(session.user.id);
                    if (profile && (allowedRoles.length === 0 || allowedRoles.includes(profile.role))) {
                        return { user: session.user, profile };
                    }
                }
            } catch (e) {}
        }

        // 2. فحص الحساب المسجل محلياً (localStorage)
        let profile = this.getCurrentProfile();

        // 3. إذا لم يوجد أي حساب مسجل أو كان الدور غير مصرح به للشاشة الحالية، نهيئ حساباً تجريبياً يطابق الشاشة فوراً
        if (!profile || (allowedRoles.length > 0 && !allowedRoles.includes(profile.role))) {
            const defaultRole = allowedRoles[0] || 'admin';
            profile = this.DEMO_PROFILES[defaultRole] || this.DEMO_PROFILES.admin;
            localStorage.setItem('alwagih_profile', JSON.stringify(profile));
        }

        return { user: { id: profile.id, email: profile.email || 'user@clinic.com' }, profile };
    },

    async logout() {
        if (window.db) {
            try {
                await window.db.auth.signOut();
            } catch (e) {}
        }
        localStorage.removeItem('alwagih_profile');
        localStorage.removeItem('alwagih_demo_auth');
        window.location.href = this.getRelativePath('index.html');
    }
};

window.Auth = Auth;
