-- ==============================================================================
-- نظام «الوجيه» لإدارة العيادات والمراكز الطبية (Al Wagih ERP & Clinic Suite)
-- قاعدة البيانات الشاملة: CRM، شؤون الموظفين والبصمة، المخازن والمشتريات،
-- التعاقدات والتحمل، والمحاسبة المالية المستقلة والتدقيق المالي
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

-- 3. جدول الملفات الشخصية والأدوار (يشمل المحاسب المالي accountant)
CREATE TABLE IF NOT EXISTS public.users_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'patient' 
        CHECK (role IN ('superadmin', 'admin', 'accountant', 'receptionist', 'doctor', 'patient')),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. جدول إدارة علاقات المرضى (Medical CRM & Leads)
CREATE TABLE IF NOT EXISTS public.crm_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    lead_source VARCHAR(100) DEFAULT 'تواصل مباشر' CHECK (lead_source IN ('فيسبوك / تواصل اجتماعي', 'إحالة طبيب', 'تعاقد شركة', 'ترشيح مريض سابق', 'تواصل مباشر / هاتف')),
    stage VARCHAR(50) DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'booked', 'visited', 'follow_up', 'lost')),
    patient_tier VARCHAR(50) DEFAULT 'regular' CHECK (patient_tier IN ('regular', 'vip', 'chronic', 'corporate')),
    last_contact_date TIMESTAMPTZ,
    next_follow_up_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.crm_patients IS 'إدارة رحلة المريض والتواصل والمتابعات ومصادر الاستقطاب';

-- 5. جدول الموارد البشرية وموظفي الكادر (HR Employees)
CREATE TABLE IF NOT EXISTS public.hr_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    fingerprint_id VARCHAR(50), -- رقم البصمة بجهاز البصمة
    full_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL DEFAULT 'طبي',
    base_salary NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    hire_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. جدول سجلات حضور وانصراف جهاز البصمة (Biometric Attendance Logs)
CREATE TABLE IF NOT EXISTS public.hr_attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIME NOT NULL,
    check_out TIME,
    late_minutes INT NOT NULL DEFAULT 0,
    overtime_minutes INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'late', 'absent', 'excused')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. جدول الجزاءات والخصومات المباشرة من المدير (HR Penalties & Deductions)
CREATE TABLE IF NOT EXISTS public.hr_penalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
    issued_by UUID NOT NULL REFERENCES public.users_profiles(id), -- المدير المباشر
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    penalty_type VARCHAR(50) NOT NULL CHECK (penalty_type IN ('deduction_days', 'fixed_amount', 'warning')),
    days_deducted NUMERIC(4, 1) DEFAULT 0,
    amount_deducted NUMERIC(10, 2) DEFAULT 0.00,
    reason TEXT NOT NULL,
    approved BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. جدول الجداول التشغيلية وتوزيع الورديات (Operational Staff Rosters)
CREATE TABLE IF NOT EXISTS public.hr_roster (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    shift_name VARCHAR(50) NOT NULL CHECK (shift_name IN ('صباحي (8 ص - 4 م)', 'مسائي (4 م - 12 ص)', 'ليلي / طوارئ (12 ص - 8 ص)')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. جدول الموردين وإدارة المشتريات (Procurement & Suppliers)
CREATE TABLE IF NOT EXISTS public.procurement_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(50),
    tax_number VARCHAR(100),
    address TEXT,
    balance_due NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. جدول أوامر الشراء وفواتير الموردين (Purchase Orders)
CREATE TABLE IF NOT EXISTS public.procurement_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.procurement_suppliers(id) ON DELETE CASCADE,
    order_number VARCHAR(100) NOT NULL UNIQUE,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'received' CHECK (status IN ('draft', 'ordered', 'received', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. جدول أصناف المخزن وكارت الصنف (Inventory Items & Ledger)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'مستلزمات طبية',
    batch_number VARCHAR(100),                            -- رقم التشغيلة
    unit VARCHAR(50) NOT NULL DEFAULT 'قطعة',
    quantity INT NOT NULL DEFAULT 0,
    min_threshold INT NOT NULL DEFAULT 15,
    unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expiry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. جدول حركات كارت الصنف (Item Card Transactions Ledger)
CREATE TABLE IF NOT EXISTS public.inventory_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('in_purchase', 'out_clinic', 'out_operation', 'inventory_adjustment')),
    quantity INT NOT NULL,
    balance_after INT NOT NULL,
    notes TEXT,
    performed_by UUID REFERENCES public.users_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. جدول التعاقدات والشركات المتقدم (مع نسبة تحمل المريض Co-Pay)
CREATE TABLE IF NOT EXISTS public.corporate_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,     -- نسبة خصم الشركة
    patient_copay_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,-- نسبة تحمل المريض (Co-pay %)
    max_coverage_limit NUMERIC(10, 2) DEFAULT 0.00,             -- الحد الأقصى للتغطية
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.corporate_contracts IS 'إدارة نسب خصم الشركات وتحمل المريض وسقوف التغطية';

-- 14. جدول كشوفات المواعيد المتكامل (Appointments with Full Financial Breakdown)
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
    
    payment_type VARCHAR(50) NOT NULL DEFAULT 'cash' CHECK (payment_type IN ('cash', 'corporate')),
    contract_id UUID REFERENCES public.corporate_contracts(id) ON DELETE SET NULL,
    
    gross_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,          -- إجمالي الكشف
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,       -- خصم التعاقد
    patient_copay_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,  -- المطلوب من المريض نقداً
    company_claim_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,  -- المستحق على الشركة
    
    -- قفل الإلغاء والتعديل (محمي للمحاسب والمدير فقط)
    is_locked BOOLEAN NOT NULL DEFAULT false,
    void_reason TEXT,
    modified_by UUID REFERENCES public.users_profiles(id),
    
    diagnosis TEXT,
    prescription TEXT,
    doctor_notes TEXT,
    created_by UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 15. جدول الفواتير والمطالبات المجمعة للشركات (Corporate Claim Invoices)
CREATE TABLE IF NOT EXISTS public.corporate_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES public.corporate_contracts(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_cases INT NOT NULL DEFAULT 0,
    gross_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_claim_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'collected', 'partially_collected')),
    created_by UUID REFERENCES public.users_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 16. سجل التدقيق المالي وحركات الإلغاء/التعديل (Financial Audit Logs)
CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL, -- VOID_APPOINTMENT, EDIT_AMOUNT, OVERRIDE_CLAIM
    record_id UUID NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    reason TEXT NOT NULL,
    authorized_by UUID NOT NULL REFERENCES public.users_profiles(id), -- المحاسب أو المدير العام فقط
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.financial_audit_logs IS 'سجل رقابي غير قابل للحذف لجميع التعديلات والإلغاءات المالية';

-- الفهارس
CREATE INDEX IF NOT EXISTS idx_crm_clinic ON public.crm_patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_emp ON public.hr_attendance_logs(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_inventory_batch ON public.inventory_items(batch_number);
CREATE INDEX IF NOT EXISTS idx_procurement_supplier ON public.procurement_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic ON public.financial_audit_logs(clinic_id, timestamp);
