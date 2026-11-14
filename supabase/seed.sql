-- ==============================================================================
-- بيانات تجريبية أولية لاختبار نظام الوجيه (Seed Data)
-- يتم تنفيذها بعد تشغيل schema.sql في Supabase SQL Editor
-- ==============================================================================

DO $$
DECLARE
    v_clinic_id UUID;
    v_branch_1_id UUID;
    v_branch_2_id UUID;
BEGIN
    -- 1. إضافة عيادة تجريبية
    INSERT INTO public.clinics (name, status)
    VALUES ('عيادات الشفاء التخصصية', 'active')
    RETURNING id INTO v_clinic_id;

    -- 2. إضافة فرعين للعيادة
    INSERT INTO public.branches (clinic_id, name, address, phone)
    VALUES 
        (v_clinic_id, 'فرع المعادي - القاهرة', 'شارع النصر، المعادي', '01011112222')
    RETURNING id INTO v_branch_1_id;

    INSERT INTO public.branches (clinic_id, name, address, phone)
    VALUES 
        (v_clinic_id, 'فرع التجمع الخامس', 'شارع التسعين الشمالي، التجمع', '01033334444')
    RETURNING id INTO v_branch_2_id;

    RAISE NOTICE 'تم إنشاء العيادة التجريبية بنجاح بن المعرف: %', v_clinic_id;
    RAISE NOTICE 'الفرع الأول: % | الفرع الثاني: %', v_branch_1_id, v_branch_2_id;
END $$;
