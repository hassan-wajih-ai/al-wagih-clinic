-- ==============================================================================
-- نظام «الوجيه» لإدارة العيادات (Al Wagih for Clinic Management)
-- المرحلة 2: سياسات أمان مستوى الصفوف (Row Level Security - RLS Policies)
-- منصة: Supabase (PostgreSQL 15+)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. دوال مساعدة استعلامية سريعة (Security Definer Functions)
-- تعمل بصلاحيات عالية لتفادي مشكلة التكرار اللانهائي (Infinite Recursion) وتسريع الفحص
-- ------------------------------------------------------------------------------

-- جلب دور المستخدم الحالي
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS VARCHAR
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
    SELECT role FROM public.users_profiles WHERE id = auth.uid();
$$;

-- جلب معرف العيادة التابع لها المستخدم الحالي
CREATE OR REPLACE FUNCTION public.current_user_clinic_id()
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
    SELECT clinic_id FROM public.users_profiles WHERE id = auth.uid();
$$;

-- جلب معرف الفرع التابع له المستخدم الحالي
CREATE OR REPLACE FUNCTION public.current_user_branch_id()
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
    SELECT branch_id FROM public.users_profiles WHERE id = auth.uid();
$$;

-- هل المستخدم الحالي مدير عام (SuperAdmin)؟
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(public.current_user_role() = 'superadmin', false);
$$;

-- ------------------------------------------------------------------------------
-- 2. تفعيل RLS على جميع الجداول السبعة
-- ------------------------------------------------------------------------------
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. سياسات جدول العيادات (public.clinics)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "clinics_superadmin_all" ON public.clinics;
CREATE POLICY "clinics_superadmin_all" ON public.clinics
    FOR ALL TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "clinics_admin_select" ON public.clinics;
CREATE POLICY "clinics_admin_select" ON public.clinics
    FOR SELECT TO authenticated
    USING (
        id = public.current_user_clinic_id()
        OR public.current_user_role() = 'patient' AND status = 'active'
    );

DROP POLICY IF EXISTS "clinics_admin_update" ON public.clinics;
CREATE POLICY "clinics_admin_update" ON public.clinics
    FOR UPDATE TO authenticated
    USING (id = public.current_user_clinic_id() AND public.current_user_role() = 'admin')
    WITH CHECK (id = public.current_user_clinic_id() AND public.current_user_role() = 'admin');

-- ------------------------------------------------------------------------------
-- 4. سياسات جدول الفروع (public.branches)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "branches_superadmin_all" ON public.branches;
CREATE POLICY "branches_superadmin_all" ON public.branches
    FOR ALL TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "branches_clinic_admin_all" ON public.branches;
CREATE POLICY "branches_clinic_admin_all" ON public.branches
    FOR ALL TO authenticated
    USING (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin')
    WITH CHECK (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "branches_staff_and_patients_select" ON public.branches;
CREATE POLICY "branches_staff_and_patients_select" ON public.branches
    FOR SELECT TO authenticated
    USING (
        clinic_id = public.current_user_clinic_id()
        OR public.current_user_role() = 'patient'
    );

-- ------------------------------------------------------------------------------
-- 5. سياسات جدول الملفات الشخصية (public.users_profiles)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_superadmin_all" ON public.users_profiles;
CREATE POLICY "profiles_superadmin_all" ON public.users_profiles
    FOR ALL TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "profiles_read_own" ON public.users_profiles;
CREATE POLICY "profiles_read_own" ON public.users_profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.users_profiles;
CREATE POLICY "profiles_update_own" ON public.users_profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_admin_manage_clinic_staff" ON public.users_profiles;
CREATE POLICY "profiles_admin_manage_clinic_staff" ON public.users_profiles
    FOR ALL TO authenticated
    USING (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin')
    WITH CHECK (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "profiles_receptionist_and_doctor_view" ON public.users_profiles;
CREATE POLICY "profiles_receptionist_and_doctor_view" ON public.users_profiles
    FOR SELECT TO authenticated
    USING (
        -- موظف الاستقبال والطبيب يريان طاقم عيادتهم ومرضاهم
        clinic_id = public.current_user_clinic_id()
        OR role = 'patient'
    );

-- ------------------------------------------------------------------------------
-- 6. سياسات جدول ربط المرضى بالعيادات (public.clinic_patients)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "clinic_patients_superadmin_all" ON public.clinic_patients;
CREATE POLICY "clinic_patients_superadmin_all" ON public.clinic_patients
    FOR ALL TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "clinic_patients_clinic_staff_all" ON public.clinic_patients;
CREATE POLICY "clinic_patients_clinic_staff_all" ON public.clinic_patients
    FOR ALL TO authenticated
    USING (
        clinic_id = public.current_user_clinic_id() 
        AND public.current_user_role() IN ('admin', 'receptionist', 'doctor')
    )
    WITH CHECK (
        clinic_id = public.current_user_clinic_id() 
        AND public.current_user_role() IN ('admin', 'receptionist')
    );

DROP POLICY IF EXISTS "clinic_patients_patient_read" ON public.clinic_patients;
CREATE POLICY "clinic_patients_patient_read" ON public.clinic_patients
    FOR SELECT TO authenticated
    USING (patient_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 7. سياسات جدول الورديات (public.shifts)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "shifts_superadmin_all" ON public.shifts;
CREATE POLICY "shifts_superadmin_all" ON public.shifts
    FOR ALL TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "shifts_admin_all" ON public.shifts;
CREATE POLICY "shifts_admin_all" ON public.shifts
    FOR ALL TO authenticated
    USING (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin')
    WITH CHECK (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "shifts_staff_select" ON public.shifts;
CREATE POLICY "shifts_staff_select" ON public.shifts
    FOR SELECT TO authenticated
    USING (clinic_id = public.current_user_clinic_id());

-- ------------------------------------------------------------------------------
-- 8. سياسات جدول الحجوزات والمواعيد (public.appointments)
-- النواة التشغيلية لنظام الوجيه
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "appointments_superadmin_all" ON public.appointments;
CREATE POLICY "appointments_superadmin_all" ON public.appointments
    FOR ALL TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "appointments_admin_all" ON public.appointments;
CREATE POLICY "appointments_admin_all" ON public.appointments
    FOR ALL TO authenticated
    USING (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin')
    WITH CHECK (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "appointments_receptionist_branch_all" ON public.appointments;
CREATE POLICY "appointments_receptionist_branch_all" ON public.appointments
    FOR ALL TO authenticated
    USING (
        clinic_id = public.current_user_clinic_id() 
        AND branch_id = public.current_user_branch_id()
        AND public.current_user_role() = 'receptionist'
    )
    WITH CHECK (
        clinic_id = public.current_user_clinic_id() 
        AND branch_id = public.current_user_branch_id()
        AND public.current_user_role() = 'receptionist'
    );

DROP POLICY IF EXISTS "appointments_doctor_select_and_update" ON public.appointments;
CREATE POLICY "appointments_doctor_select_and_update" ON public.appointments
    FOR SELECT TO authenticated
    USING (doctor_id = auth.uid() OR (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'doctor'));

DROP POLICY IF EXISTS "appointments_doctor_update_examination" ON public.appointments;
CREATE POLICY "appointments_doctor_update_examination" ON public.appointments
    FOR UPDATE TO authenticated
    USING (doctor_id = auth.uid() AND public.current_user_role() = 'doctor')
    WITH CHECK (doctor_id = auth.uid() AND public.current_user_role() = 'doctor');

DROP POLICY IF EXISTS "appointments_patient_select" ON public.appointments;
CREATE POLICY "appointments_patient_select" ON public.appointments
    FOR SELECT TO authenticated
    USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "appointments_patient_insert" ON public.appointments;
CREATE POLICY "appointments_patient_insert" ON public.appointments
    FOR INSERT TO authenticated
    WITH CHECK (patient_id = auth.uid());

DROP POLICY IF EXISTS "appointments_patient_cancel" ON public.appointments;
CREATE POLICY "appointments_patient_cancel" ON public.appointments
    FOR UPDATE TO authenticated
    USING (patient_id = auth.uid() AND status = 'pending')
    WITH CHECK (patient_id = auth.uid() AND status = 'cancelled');

-- ------------------------------------------------------------------------------
-- 9. سياسات جدول التقييمات والملاحظات (public.feedback)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "feedback_superadmin_all" ON public.feedback;
CREATE POLICY "feedback_superadmin_all" ON public.feedback
    FOR ALL TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "feedback_admin_select" ON public.feedback;
CREATE POLICY "feedback_admin_select" ON public.feedback
    FOR SELECT TO authenticated
    USING (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "feedback_patient_own" ON public.feedback;
CREATE POLICY "feedback_patient_own" ON public.feedback
    FOR ALL TO authenticated
    USING (patient_id = auth.uid())
    WITH CHECK (patient_id = auth.uid());
