-- ==============================================================================
-- نظام «الوجيه» لإدارة العيادات (Al Wagih for Clinic Management)
-- هيكل قاعدة البيانات المتكامل (يشمل: المخازن، الموارد البشرية، التعاقدات، والفواتير)
-- منصة: Supabase (PostgreSQL 15+)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. جدول العيادات (Clinics)
CREATE TABLE IF NOT EXISTS public.clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. جدول الفروع (Branches)
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. جدول الشركات والجهات المتعاقدة ونسب الخصم (Corporate Contracts & Insurance)
CREATE TABLE IF NOT EXISTS public.corporate_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('daily', 'weekly', 'monthly')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.corporate_contracts IS 'إدارة الشركات المتعاقدة (تأمين، نقابات، هيئات) ونسب الخصم المعتمدة';

-- 4. جدول فواتير ومطالبات الشركات الدورية (Corporate Claim Invoices)
CREATE TABLE IF NOT EXISTS public.corporate_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES public.corporate_contracts(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_cases INT NOT NULL DEFAULT 0,
    gross_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_claim_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'collected', 'partially_collected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.corporate_invoices IS 'إصدار الفواتير المجمعة بنهاية الشهر أو اليوم باسم الشركة المتعاقدة للتحصيل';

-- 5. جدول الملفات الشخصية للمستخدمين والأدوار (Users Profiles)
CREATE TABLE IF NOT EXISTS public.users_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'patient' CHECK (role IN ('superadmin', 'admin', 'receptionist', 'doctor', 'patient')),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. جدول ربط المرضى بالعيادات (Clinic Patients)
CREATE TABLE IF NOT EXISTS public.clinic_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    file_number VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_clinic_patient UNIQUE (clinic_id, patient_id)
);

-- 7. جدول الورديات (Shifts)
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. جدول الحجوزات والمواعيد والكشوفات المطوّر (Appointments with Corporate Billing)
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
    
    -- نظام التحصيل والتعاقدات
    payment_type VARCHAR(50) NOT NULL DEFAULT 'cash' CHECK (payment_type IN ('cash', 'corporate')),
    contract_id UUID REFERENCES public.corporate_contracts(id) ON DELETE SET NULL,
    corporate_invoice_id UUID REFERENCES public.corporate_invoices(id) ON DELETE SET NULL,
    
    gross_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,       -- إجمالي قيمة الكشف قبل الخصم
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,    -- قيمة الخصم بناء على نسبة التعاقد
    patient_paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,-- المسدد نقداً من المريض (Co-pay)
    company_claim_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,-- المبلغ المتبقي للمطالبة من الشركة
    
    -- حقول الكشف الطبي والروشتة
    diagnosis TEXT,
    prescription TEXT,
    doctor_notes TEXT,
    created_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. جدول المخزن وجرد المستلزمات الطبية (Inventory & Stock)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'مستلزمات طبية',
    unit VARCHAR(50) NOT NULL DEFAULT 'قطعة',               -- علبة، شريط، أمبول، قطعة
    quantity INT NOT NULL DEFAULT 0,                        -- الرصيد الحالي
    min_threshold INT NOT NULL DEFAULT 10,                  -- حد إعادة الطلب للتنبيه عند النقص
    unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expiry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.inventory_items IS 'إدارة أصناف ومخزون الأدوية والمستلزمات الطبية وتنبيهات الجرد';

-- 10. جدول حركات وصرف المخزن (Inventory Transactions)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('in', 'out', 'adjustment')),
    quantity INT NOT NULL,
    notes TEXT,
    performed_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. جدول موظفي الموارد البشرية (HR Employees)
CREATE TABLE IF NOT EXISTS public.hr_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    base_salary NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    hire_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.hr_employees IS 'إدارة ملفات الكادر الطبي والإداري ومسيرات الرواتب';

-- 12. جدول مسيرات الرواتب الشهرية (HR Payroll)
CREATE TABLE IF NOT EXISTS public.hr_payrolls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
    month_year VARCHAR(7) NOT NULL,                         -- مثال: 2026-11
    base_salary NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    allowances NUMERIC(10, 2) NOT NULL DEFAULT 0.00,        -- بدلات ومكافآت
    deductions NUMERIC(10, 2) NOT NULL DEFAULT 0.00,        -- استقطاعات وخصومات
    net_salary NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    payment_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_employee_month_payroll UNIQUE (employee_id, month_year)
);

-- 13. جدول التقييمات والملاحظات (Feedback)
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

-- ==============================================================================
-- الفهارس لتحسين سرعة الاستعلامات (Indexes)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_contracts_clinic ON public.corporate_contracts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_invoices_clinic_contract ON public.corporate_invoices(clinic_id, contract_id);
CREATE INDEX IF NOT EXISTS idx_appointments_payment ON public.appointments(payment_type, contract_id);
CREATE INDEX IF NOT EXISTS idx_inventory_clinic_branch ON public.inventory_items(clinic_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_hr_clinic ON public.hr_employees(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payroll_month ON public.hr_payrolls(clinic_id, month_year);
