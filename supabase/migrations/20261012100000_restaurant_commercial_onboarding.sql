-- ==============================================================================
-- NEXORA FOOD: Commercial Plans, Restaurant Onboarding, & Partner Agreements
-- Migration: 20261012100000_restaurant_commercial_onboarding.sql
-- Indian Compliance: INR integer paise, Asia/Kolkata timezone, RBAC enforcement
-- ==============================================================================

-- 1. Commercial Plan Master Table
CREATE TABLE IF NOT EXISTS public.nexora_commercial_plans (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    name TEXT NOT NULL,
    effective_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'approved', 'active', 'superseded')),
    self_delivery_commission_bps INTEGER NOT NULL DEFAULT 800,       -- 8.00%
    nexora_delivery_commission_bps INTEGER NOT NULL DEFAULT 1200,   -- 12.00%
    packaging_in_commission_base BOOLEAN NOT NULL DEFAULT FALSE,
    launch_offer_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    launch_offer_days INTEGER NOT NULL DEFAULT 30,
    launch_offer_commission_bps INTEGER NOT NULL DEFAULT 0,
    post_offer_self_commission_bps INTEGER NOT NULL DEFAULT 800,
    post_offer_nexora_commission_bps INTEGER NOT NULL DEFAULT 1200,
    free_listing_plan_fee_paise BIGINT NOT NULL DEFAULT 0,
    paid_subscription_monthly_paise BIGINT NOT NULL DEFAULT 99900,  -- ₹999.00
    paid_subscription_name TEXT NOT NULL DEFAULT 'Nexora Pro Kitchen Growth',
    paid_subscription_features JSONB NOT NULL DEFAULT '[]'::JSONB,
    listing_fee_paise BIGINT NOT NULL DEFAULT 0,
    mandatory_ad_fee_paise BIGINT NOT NULL DEFAULT 0,
    payment_gateway_fee_bps INTEGER NOT NULL DEFAULT 180,           -- 1.80% actual pass-through
    payment_gateway_flat_paise INTEGER NOT NULL DEFAULT 0,
    payment_gateway_tax_configured BOOLEAN NOT NULL DEFAULT FALSE,
    settlement_day TEXT NOT NULL DEFAULT 'Wednesday',
    settlement_cutoff_hour INTEGER NOT NULL DEFAULT 23,
    tax_config_approved BOOLEAN NOT NULL DEFAULT FALSE,             -- CA Review Required
    tax_gst_bps INTEGER NOT NULL DEFAULT 1800,                      -- 18.00% GST on service
    tax_tds_bps INTEGER NOT NULL DEFAULT 100,                       -- 1.00% Sec 194-O TDS
    reviewed_by_ca_name TEXT,
    reviewed_by_ca_date DATE,
    reviewed_by_lawyer_name TEXT,
    reviewed_by_lawyer_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Restaurant Onboarding Applications
CREATE TABLE IF NOT EXISTS public.nexora_restaurant_applications (
    id TEXT PRIMARY KEY,
    restaurant_id UUID REFERENCES public.nexora_food_restaurants(id) ON DELETE SET NULL,
    legal_business_name TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    registered_address TEXT NOT NULL,
    kitchen_address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Jaipur',
    state TEXT NOT NULL DEFAULT 'Rajasthan',
    pincode TEXT NOT NULL,
    service_area TEXT NOT NULL,
    mobile TEXT NOT NULL CHECK (mobile ~ '^[6-9][0-9]{9}$'),
    email TEXT NOT NULL,
    pan TEXT NOT NULL CHECK (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$'),
    gstin TEXT CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'),
    fssai_number TEXT NOT NULL CHECK (fssai_number ~ '^[0-9]{14}$'),
    fssai_type TEXT NOT NULL,
    fssai_issue_date DATE NOT NULL,
    fssai_expiry_date DATE NOT NULL,
    bank_account_holder TEXT NOT NULL,
    bank_account_number TEXT NOT NULL,
    bank_ifsc TEXT NOT NULL CHECK (bank_ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
    documents JSONB NOT NULL DEFAULT '[]'::JSONB,
    status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Draft', 'Submitted', 'Under Review', 'More Information Required', 'Approved', 'Rejected', 'Suspended')),
    cuisines JSONB NOT NULL DEFAULT '[]'::JSONB,
    opening_days JSONB NOT NULL DEFAULT '[]'::JSONB,
    opening_hours TEXT NOT NULL,
    prep_time_min INTEGER NOT NULL DEFAULT 20,
    acceptance_window_sec INTEGER NOT NULL DEFAULT 90,
    packaging_capability TEXT NOT NULL,
    delivery_model TEXT NOT NULL DEFAULT 'nexora_delivery' CHECK (delivery_model IN ('self_delivery', 'nexora_delivery', 'hybrid')),
    emergency_contact TEXT NOT NULL,
    privacy_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    terms_accepted_at TIMESTAMPTZ,
    terms_version_id TEXT,
    exception_reason TEXT,
    exception_granted_by TEXT,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Version-Controlled Master Agreement Clauses
CREATE TABLE IF NOT EXISTS public.nexora_agreement_clauses (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    title_hi TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Commercial', 'Legal', 'Tax', 'Operations', 'Privacy')),
    review_status TEXT NOT NULL DEFAULT 'Pending lawyer review' CHECK (review_status IN ('Draft', 'Pending CA review', 'Pending lawyer review', 'Changes requested', 'Approved for internal use', 'Accepted by restaurant', 'Superseded', 'Expired')),
    requires_review TEXT NOT NULL CHECK (requires_review IN ('CA', 'Lawyer', 'Privacy Counsel', 'None')),
    content TEXT NOT NULL,
    content_hi TEXT NOT NULL,
    last_reviewed_by TEXT,
    last_reviewed_date DATE,
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Weekly Settlement Statements
CREATE TABLE IF NOT EXISTS public.nexora_settlement_statements (
    id TEXT PRIMARY KEY,
    statement_number TEXT NOT NULL UNIQUE,
    restaurant_name TEXT NOT NULL,
    cycle_period TEXT NOT NULL,
    gross_orders_count INTEGER NOT NULL DEFAULT 0,
    gross_food_value_paise BIGINT NOT NULL DEFAULT 0,
    restaurant_discounts_paise BIGINT NOT NULL DEFAULT 0,
    net_food_value_paise BIGINT NOT NULL DEFAULT 0,
    commission_deducted_paise BIGINT NOT NULL DEFAULT 0,
    gateway_fee_deducted_paise BIGINT NOT NULL DEFAULT 0,
    refunds_adjusted_paise BIGINT NOT NULL DEFAULT 0,
    tax_withheld_paise BIGINT NOT NULL DEFAULT 0,
    net_payable_paise BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Approved', 'Dispatched', 'Settled', 'On Hold')),
    settlement_date DATE NOT NULL,
    utr_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Commercial Disputes and Reconciliation Tickets
CREATE TABLE IF NOT EXISTS public.nexora_commercial_disputes (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    order_number TEXT NOT NULL,
    amount_paise BIGINT NOT NULL DEFAULT 0,
    issue_type TEXT NOT NULL CHECK (issue_type IN ('commission_discrepancy', 'payout_delay', 'refund_contested', 'gateway_charge')),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Under Investigation', 'Resolved', 'Rejected')),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Commercial Audit Trail
CREATE TABLE IF NOT EXISTS public.nexora_commercial_audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    details TEXT NOT NULL
);

-- Row-Level Security Enablement
ALTER TABLE public.nexora_commercial_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexora_restaurant_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexora_agreement_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexora_settlement_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexora_commercial_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexora_commercial_audit_logs ENABLE ROW LEVEL SECURITY;

-- Read policy: Anyone authenticated can view active commercial plans & clauses
CREATE POLICY "Public authenticated can read active commercial plans"
    ON public.nexora_commercial_plans FOR SELECT
    USING (status IN ('active', 'approved'));

CREATE POLICY "Public authenticated can read agreement clauses"
    ON public.nexora_agreement_clauses FOR SELECT
    USING (true);

-- Admin & Finance access policies
CREATE POLICY "Admins full management of commercial plans"
    ON public.nexora_commercial_plans FOR ALL
    USING (EXISTS (SELECT 1 FROM public.nexora_food_user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'finance_admin')));

CREATE POLICY "Admins full management of applications"
    ON public.nexora_restaurant_applications FOR ALL
    USING (EXISTS (SELECT 1 FROM public.nexora_food_user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'finance_admin', 'restaurant_onboarding_staff')));

CREATE POLICY "Admins full management of statements"
    ON public.nexora_settlement_statements FOR ALL
    USING (EXISTS (SELECT 1 FROM public.nexora_food_user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'finance_admin')));

CREATE POLICY "Audit logs insertable and viewable by authorized staff"
    ON public.nexora_commercial_audit_logs FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.nexora_food_user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'finance_admin', 'legal_reviewer')));
