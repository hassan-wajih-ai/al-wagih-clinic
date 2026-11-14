-- ==============================================================================
-- نظام «الوجيه» لإدارة العيادات (Al Wagih for Clinic Management)
-- المرحلة 1: إنشاء وتجهيز هيكل قاعدة البيانات الكامل (Database Schema)
-- منصة: Supabase (PostgreSQL 15+)
-- ==============================================================================

-- تفعيل الامتدادات المطلوبة لتوليد المعرفات الفريدة UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. جدول العيادات والمراكز الطبية (Clinics)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.clinics IS 'تسجيل بيانات العيادات والمراكز الطبية المستقلة على المنصة';

-- ==============================================================================
-- 2. جدول الفروع (Branches)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.branches IS 'ربط كل فرع بالعيادة الأم التابع لها';

-- ==============================================================================
-- 3. جدول الملفات الشخصية للمستخدمين والأدوار (Users Profiles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'patient' CHECK (role IN ('superadmin', 'admin', 'receptionist', 'doctor', 'patient')),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.users_profiles IS 'تخزين بيانات المستخدمين وتحديد الدور ونطاق العمل (العيادة والفرع)';

-- ==============================================================================
-- 4. جدول ربط المرضى بالعيادات (Clinic Patients)
-- علاقة Many-to-Many تسمح للمريض بمراجعة أكثر من عيادة بحسابه الواحد مع رقم ملف خاص بكل عيادة
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clinic_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    file_number VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_clinic_patient UNIQUE (clinic_id, patient_id)
);

COMMENT ON TABLE public.clinic_patients IS 'جدول وسيط يتيح للمريض الانتماء لأكثر من عيادة برقم ملف مستقل';

-- ==============================================================================
-- 5. جدول ورديات وساعات العمل (Shifts)
-- إدارة جداول عمل الأطباء وموظفي الاستقبال (ورديات 8 ساعات)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0: الأحد، 6: السبت
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.shifts IS 'إدارة جداول عمل الأطباء وموظفي الاستقبال وورديات الـ 8 ساعات';

-- ==============================================================================
-- 6. جدول الحجوزات والمواعيد والكشوفات (Appointments)
-- يشمل الحقول الأساسية + حقول التشخيص والروشتة الطبية التي تم إقرارها في المرحلة 0
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slot TIME NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    -- حقول الكشف الطبي والروشتة الاختيارية للطبيب
    diagnosis TEXT,
    prescription TEXT,
    doctor_notes TEXT,
    created_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.appointments IS 'تسجيل الحجوزات ومتابعة حالتها وقيمة الكشف والملاحظات الطبية والروشتة';

-- ==============================================================================
-- 7. جدول التقييمات والملاحظات (Feedback)
-- حفظ تقييمات واستفسارات المرضى المرتبطة بالمواعيد المنتهية
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_appointment_feedback UNIQUE (appointment_id)
);

COMMENT ON TABLE public.feedback IS 'حفظ تقييمات وملاحظات المرضى على الخدمة والمواعيد';

-- ==============================================================================
-- الفهارس لتحسين سرعة الاستعلامات (Indexes)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_branches_clinic_id ON public.branches(clinic_id);
CREATE INDEX IF NOT EXISTS idx_users_clinic_branch ON public.users_profiles(clinic_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users_profiles(role);
CREATE INDEX IF NOT EXISTS idx_clinic_patients_clinic ON public.clinic_patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_patients_patient ON public.clinic_patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_shifts_staff ON public.shifts(staff_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_appointments_lookup ON public.appointments(clinic_id, branch_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON public.appointments(doctor_id, date, time_slot);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_feedback_clinic ON public.feedback(clinic_id);

-- ==============================================================================
-- مشغل تلقائي (Trigger): مزامنة المستخدمين الجدد عند التسجيل في Supabase Auth
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users_profiles (id, full_name, phone, role, clinic_id, branch_id)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
        new.raw_user_meta_data->>'phone',
        COALESCE(new.raw_user_meta_data->>'role', 'patient'),
        (new.raw_user_meta_data->>'clinic_id')::uuid,
        (new.raw_user_meta_data->>'branch_id')::uuid
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ربط المشغل بجدول auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
