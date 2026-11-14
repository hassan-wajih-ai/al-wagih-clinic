-- ==============================================================================
-- نظام «الوجيه» لإدارة العيادات (Al Wagih for Clinic Management)
-- تحديث سياسات أمان مستوى الصفوف (RLS) للجداول الجديدة
-- منصة: Supabase (PostgreSQL 15+)
-- ==============================================================================

-- 1. تفعيل RLS للجداول الإضافية
ALTER TABLE public.corporate_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_payrolls ENABLE ROW LEVEL SECURITY;

-- 2. سياسات التعاقدات والشركات (corporate_contracts)
CREATE POLICY "contracts_admin_all" ON public.corporate_contracts
    FOR ALL TO authenticated
    USING (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin')
    WITH CHECK (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin');

CREATE POLICY "contracts_staff_select" ON public.corporate_contracts
    FOR SELECT TO authenticated
    USING (clinic_id = public.current_user_clinic_id() OR public.is_superadmin());

-- 3. سياسات الفواتير والمطالبات (corporate_invoices)
CREATE POLICY "invoices_admin_all" ON public.corporate_invoices
    FOR ALL TO authenticated
    USING (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin')
    WITH CHECK (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin');

-- 4. سياسات المخازن والمستلزمات (inventory_items)
CREATE POLICY "inventory_admin_all" ON public.inventory_items
    FOR ALL TO authenticated
    USING (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin')
    WITH CHECK (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin');

CREATE POLICY "inventory_staff_select" ON public.inventory_items
    FOR SELECT TO authenticated
    USING (clinic_id = public.current_user_clinic_id() OR public.is_superadmin());

CREATE POLICY "inventory_transactions_admin_all" ON public.inventory_transactions
    FOR ALL TO authenticated
    USING (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin')
    WITH CHECK (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin');

-- 5. سياسات الموارد البشرية والرواتب (hr_employees & hr_payrolls)
CREATE POLICY "hr_admin_all" ON public.hr_employees
    FOR ALL TO authenticated
    USING (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin')
    WITH CHECK (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin');

CREATE POLICY "payroll_admin_all" ON public.hr_payrolls
    FOR ALL TO authenticated
    USING (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin')
    WITH CHECK (clinic_id = public.current_user_clinic_id() AND public.current_user_role() = 'admin');
