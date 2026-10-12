# Nexora Food — Restaurant Partner Onboarding & Commercial Management Module

## 1. Overview & Business Objectives
Nexora Food is a food ordering and delivery marketplace designed to onboard Indian restaurant partners with transparent, lower-than-large-aggregator commercial terms.

### Key Commercial Baseline:
- **Self-Delivery Default Commission**: **8.00%** (800 bps)
- **Nexora Fleet Delivery Default Commission**: **12.00%** (1200 bps)
- **30-Day Launch Offer**: **0.00%** commission for the first 30 calendar days for eligible new restaurants
- **Commission Base**: **Net Food Value** (Gross Food Item Prices minus Restaurant-Funded Discounts)
- **Delivery Fee, Tips, Platform Fee, & Taxes**: Excluded from platform commission base by default
- **Listing Fee**: **₹0.00** (Zero onboarding fee)
- **Mandatory Advertising Fee**: **₹0.00** (Zero forced ad spend)
- **Payment Gateway Fee**: Actual transaction cost pass-through without platform markup
- **Settlement Schedule**: Weekly on scheduled day (default: Wednesdays for preceding cycle ending Sunday 23:59 IST)

---

## 2. Legal & Tax Safety Architecture
1. **Disclaimer**: Nexora Food does NOT claim to be a legal or tax authority.
2. **Review Status Enforcement**: All clauses relating to GST (Section 9(5) CGST Act), TDS (Section 194-O Income Tax Act), invoicing, refund liability, indemnity, and arbitration are marked **"Pending CA/Lawyer Review"** until an authorized professional sign-off is recorded.
3. **Automatic Invalidation**: Any edit made to reviewed legal wording automatically resets the clause's review status to `"Pending lawyer review"` or `"Pending CA review"`.
4. **No Auto-Publishing**: Changing a commercial rate or agreement template does not automatically modify active partner agreements. Explicit admin approval and electronic acceptance by affected restaurant partners is mandated.
5. **Configurable Jurisdiction**: The seat/venue of arbitration and competent courts are configurable placeholders (defaulting to Jaipur, Rajasthan for launch testing), explicitly marked `"Lawyer Review Required"` rather than hardcoded as legally final.

---

## 3. Role-Based Access Control (RBAC) Matrix

| Capability / Action | Super Admin | Finance Admin | Legal Reviewer | Onboarding Staff | Restaurant Owner | Restaurant Staff |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| View Payout Calculator & Simulation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submit Partner Onboarding Application | ✓ | — | — | ✓ | ✓ | — |
| Upload & Verify Indian Documents (FSSAI/PAN/GST/Bank) | ✓ | ✓ | — | ✓ | ✓ (Upload) | — |
| Grant Administrative Compliance Exception | ✓ | — | — | ✓ | — | — |
| Approve / Reject Onboarding Application | ✓ | ✓ | — | ✓ | — | — |
| Configure Commercial Plans & Versioning | ✓ | ✓ | — | — | — | — |
| Review & Approve Agreement Clauses (CA/Lawyer) | ✓ | ✓ (CA) | ✓ (Legal) | — | — | — |
| View Restaurant Statement & Weekly Payouts | ✓ | ✓ | — | — | ✓ | ✓ (View) |
| Reconcile Weekly Settlement Statements (UTR) | ✓ | ✓ | — | — | — | — |
| Submit Commercial Disputes & Refund Contests | ✓ | — | — | — | ✓ | — |
| Resolve Commercial Disputes | ✓ | ✓ | — | — | — | — |
| Export Statements to CSV / PDF | ✓ | ✓ | — | — | ✓ (Own) | — |

---

## 4. Financial Calculations & Integer Paise Math
All monetary quantities are calculated and stored as **integer paise** (1 Rupee = 100 paise), avoiding IEEE-754 floating-point inaccuracies.

### Core Calculation Formulas:
1. `Net Food Value = MAX(0, Gross Food Value - Restaurant Funded Discount)`
2. `Commission Base = Net Food Value + (Packaging in Base ? Packaging Charge : 0)`
3. `Commission = ROUND((Commission Base * Commission Rate Bps) / 10000)`
4. `Customer Collected = MAX(0, Gross Food - Rest Discount - Nexora Discount + Packaging + Delivery Fee + Platform Fee + Tip)`
5. `Payment Gateway Fee = ROUND((Customer Collected * Gateway Bps) / 10000) + Gateway Flat Paise`
6. `Restaurant Payout = Net Food Value + Packaging + Tips + (Self Delivery ? Delivery Fee : 0) - Commission - Gateway Fee - Verified Refunds - Approved Taxes`

### Safety Incomplete State:
If statutory tax configurations are not marked CA-approved, the calculator reports:
`Estimate incomplete — finance/legal configuration required`
and clearly distinguishes estimated net payouts from final settled payouts.

---

## 5. Indian Statutory Compliance Fields
- **Currency**: Indian Rupee (`INR`, `₹`)
- **Phone Number Format**: 10-digit mobile starting with `6-9` (`^[6-9][0-9]{9}$`)
- **Permanent Account Number (PAN)**: 10-character alphanumeric (`^[A-Z]{5}[0-9]{4}[A-Z]{1}$`)
- **GSTIN**: 15-character alphanumeric (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`)
- **FSSAI License / Registration**: 14-digit numeric (`^[0-9]{14}$`)
- **Bank IFSC Code**: 11-character format (`^[A-Z]{4}0[A-Z0-9]{6}$`)
- **Timezone**: `Asia/Kolkata` (IST)

---

## 6. List of Assumptions & Missing Business Information
The following elements are purposefully left as placeholders or configurable inputs until determined by authorized platform officers:
1. **Nexora Corporate Entity**: Legal name, Corporate Identification Number (CIN), registered office address, and authorized director signatory.
2. **Formal GST Determination**: Formal CA opinion on Section 9(5) CGST e-commerce operator reporting versus restaurant-direct invoicing.
3. **Formal TDS Policy**: Determination of Section 194-O deduction baseline (whether applied on Gross Food Value or Net Food Value).
4. **Third-Party Payment Gateway Credentials**: Live Razorpay / Cashfree Merchant ID and webhook signing secrets.
5. **SMS / WhatsApp Provider Credentials**: Twilio / Gupshup / Karix API keys for live messaging.
