import React, { useState } from 'react';
import {
  calculateOrderSettlement,
  formatPaise,
  DEFAULT_COMMERCIAL_PLAN,
} from '../../services/commercialCalculator';
import type { DeliveryModel, OrderCalculationInput, CommercialPlanConfig } from '../../types/commercial';
import type { Language } from '../../locales/commercialTranslations';
import { translations } from '../../locales/commercialTranslations';
import {
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Percent,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface Props {
  lang: Language;
  activePlan?: CommercialPlanConfig;
}

export default function CommercialCalculatorView({ lang, activePlan = DEFAULT_COMMERCIAL_PLAN }: Props) {
  const t = translations[lang];

  // Inputs in Rupees for natural input, converted to integer paise
  const [grossRupees, setGrossRupees] = useState<number>(500);
  const [restDiscountRupees, setRestDiscountRupees] = useState<number>(50);
  const [nexoraDiscountRupees, setNexoraDiscountRupees] = useState<number>(0);
  const [packagingRupees, setPackagingRupees] = useState<number>(15);
  const [deliveryFeeRupees, setDeliveryFeeRupees] = useState<number>(30);
  const [riderPayoutRupees, setRiderPayoutRupees] = useState<number>(30);
  const [tipRupees, setTipRupees] = useState<number>(0);
  const [refundRupees, setRefundRupees] = useState<number>(0);
  const [deliveryModel, setDeliveryModel] = useState<DeliveryModel>('nexora_delivery');
  const [launchOffer, setLaunchOffer] = useState<boolean>(false);
  const [packagingInBase, setPackagingInBase] = useState<boolean>(false);
  const [simulateTaxApproved, setSimulateTaxApproved] = useState<boolean>(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Compile inputs to integer paise
  const calculationInput: OrderCalculationInput = {
    grossFoodValuePaise: Math.round(grossRupees * 100),
    restaurantDiscountPaise: Math.round(restDiscountRupees * 100),
    nexoraDiscountPaise: Math.round(nexoraDiscountRupees * 100),
    packagingChargePaise: Math.round(packagingRupees * 100),
    customerDeliveryFeePaise: Math.round(deliveryFeeRupees * 100),
    deliveryPartnerPayoutPaise: Math.round(riderPayoutRupees * 100),
    customerPlatformFeePaise: 500, // ₹5 fixed platform fee (customer-facing)
    tipPaise: Math.round(tipRupees * 100),
    deliveryModel,
    isLaunchOfferActive: launchOffer,
    refundAdjustmentPaise: Math.round(refundRupees * 100),
    plan: {
      ...activePlan,
      packagingInCommissionBase: packagingInBase,
      taxConfigApproved: simulateTaxApproved || activePlan.taxConfigApproved,
    },
  };

  const result = calculateOrderSettlement(calculationInput);

  // Quick Preset Handlers
  const loadPresetSelf = () => {
    setGrossRupees(500);
    setRestDiscountRupees(50);
    setNexoraDiscountRupees(0);
    setPackagingRupees(0);
    setDeliveryFeeRupees(30);
    setRiderPayoutRupees(0);
    setTipRupees(0);
    setRefundRupees(0);
    setDeliveryModel('self_delivery');
    setLaunchOffer(false);
  };

  const loadPresetNexora = () => {
    setGrossRupees(500);
    setRestDiscountRupees(50);
    setNexoraDiscountRupees(0);
    setPackagingRupees(0);
    setDeliveryFeeRupees(35);
    setRiderPayoutRupees(30);
    setTipRupees(0);
    setRefundRupees(0);
    setDeliveryModel('nexora_delivery');
    setLaunchOffer(false);
  };

  const loadPresetLaunchOffer = () => {
    setGrossRupees(800);
    setRestDiscountRupees(80);
    setNexoraDiscountRupees(40);
    setPackagingRupees(20);
    setDeliveryFeeRupees(35);
    setRiderPayoutRupees(35);
    setTipRupees(20);
    setRefundRupees(0);
    setDeliveryModel('nexora_delivery');
    setLaunchOffer(true);
  };

  return (
    <div className="comm-panel">
      <div className="comm-panel-header">
        <div>
          <h2>{t.calcTitle}</h2>
          <p className="comm-muted">{t.calcSubtitle}</p>
        </div>
        <div className="comm-btn-group">
          <button type="button" className="comm-btn secondary" onClick={loadPresetSelf}>
            {t.testSelfDeliveryBtn}
          </button>
          <button type="button" className="comm-btn secondary" onClick={loadPresetNexora}>
            {t.testNexoraDeliveryBtn}
          </button>
          <button type="button" className="comm-btn secondary" onClick={loadPresetLaunchOffer}>
            <Sparkles size={14} /> {t.testLaunchOfferBtn}
          </button>
        </div>
      </div>

      {result.hasIncompleteEstimate && (
        <div className="comm-banner-disclaimer" style={{ marginBottom: '1.25rem' }}>
          <ShieldAlert size={18} />
          <div>
            <strong>Pending CA Tax Verification: </strong>
            {t.taxPendingNotice} TDS (Sec 194-O) and GST on commission are marked provisional until authorized CA sign-off.
          </div>
        </div>
      )}

      {/* Simulator Control Inputs */}
      <div className="comm-panel" style={{ background: '#f9fafb', marginBottom: '1.5rem', border: '1px solid #e5e7eb' }}>
        <h4 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600 }}>
          Order Inputs & Commercial Parameters
        </h4>
        <div className="comm-form-grid">
          <div className="comm-field">
            <label>{t.grossValueInput}</label>
            <input
              type="number"
              min="0"
              step="1"
              value={grossRupees}
              onChange={(e) => setGrossRupees(Math.max(0, Number(e.target.value) || 0))}
            />
            <small>Menu prices sum before discounts</small>
          </div>

          <div className="comm-field">
            <label>{t.restDiscountInput}</label>
            <input
              type="number"
              min="0"
              step="1"
              value={restDiscountRupees}
              onChange={(e) => setRestDiscountRupees(Math.max(0, Number(e.target.value) || 0))}
            />
            <small>Reduces commission calculation base</small>
          </div>

          <div className="comm-field">
            <label>{t.nexoraDiscountInput}</label>
            <input
              type="number"
              min="0"
              step="1"
              value={nexoraDiscountRupees}
              onChange={(e) => setNexoraDiscountRupees(Math.max(0, Number(e.target.value) || 0))}
            />
            <small>Funded by platform; not cut from your food earning</small>
          </div>

          <div className="comm-field">
            <label>{t.packagingInput}</label>
            <input
              type="number"
              min="0"
              step="1"
              value={packagingRupees}
              onChange={(e) => setPackagingRupees(Math.max(0, Number(e.target.value) || 0))}
            />
            <small>Retained by kitchen; commission excluded by default</small>
          </div>

          <div className="comm-field">
            <label>{t.deliveryModel}</label>
            <select
              value={deliveryModel}
              onChange={(e) => setDeliveryModel(e.target.value as DeliveryModel)}
            >
              <option value="self_delivery">{t.selfDelivery}</option>
              <option value="nexora_delivery">{t.nexoraDelivery}</option>
              <option value="hybrid">{t.hybridDelivery}</option>
            </select>
            <small>Self: 8% commission | Nexora Fleet: 12% commission</small>
          </div>

          <div className="comm-field">
            <label>{t.deliveryFeeInput}</label>
            <input
              type="number"
              min="0"
              step="1"
              value={deliveryFeeRupees}
              onChange={(e) => setDeliveryFeeRupees(Math.max(0, Number(e.target.value) || 0))}
            />
            <small>Self-delivery: credited to you | Fleet: kept for rider</small>
          </div>

          <div className="comm-field">
            <label>{t.tipInput}</label>
            <input
              type="number"
              min="0"
              step="1"
              value={tipRupees}
              onChange={(e) => setTipRupees(Math.max(0, Number(e.target.value) || 0))}
            />
            <small>100% passed through with 0% commission</small>
          </div>

          <div className="comm-field">
            <label>{t.refundInput}</label>
            <input
              type="number"
              min="0"
              step="1"
              value={refundRupees}
              onChange={(e) => setRefundRupees(Math.max(0, Number(e.target.value) || 0))}
            />
            <small>Substantiated food defect adjustment</small>
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={launchOffer}
              onChange={(e) => setLaunchOffer(e.target.checked)}
            />
            <strong>{t.launchOfferToggle}</strong>
          </label>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={packagingInBase}
              onChange={(e) => setPackagingInBase(e.target.checked)}
            />
            <span>{t.packagingInBaseToggle}</span>
          </label>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={simulateTaxApproved}
              onChange={(e) => setSimulateTaxApproved(e.target.checked)}
            />
            <span>Simulate CA-Approved Tax Rules (18% GST on Commission + 1% TDS)</span>
          </label>
        </div>
      </div>

      {/* Side-By-Side: What You Pay vs What You Receive */}
      <div className="comm-calc-split">
        {/* Left: What You Receive (Earnings) */}
        <div className="comm-calc-side left">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, color: '#065f46', fontSize: '1.125rem' }}>
              {t.sideBySideLeft}
            </h3>
            <span className="comm-badge approved">Kitchen Earning</span>
          </div>

          <div>
            <div className="comm-breakdown-row">
              <span>Gross Food Value (Menu items)</span>
              <strong className="earning">{formatPaise(result.grossFoodValuePaise)}</strong>
            </div>
            {result.restaurantDiscountPaise > 0 && (
              <div className="comm-breakdown-row">
                <span>Minus Restaurant Discount</span>
                <span className="deduction">-{formatPaise(result.restaurantDiscountPaise)}</span>
              </div>
            )}
            <div className="comm-breakdown-row" style={{ background: '#f0fdf4', padding: '0.5rem' }}>
              <strong>Net Food Value (Commission Base)</strong>
              <strong style={{ color: '#047857' }}>{formatPaise(result.netFoodValuePaise)}</strong>
            </div>
            {result.packagingChargePaise > 0 && (
              <div className="comm-breakdown-row">
                <span>Packaging Charge (Kept by Kitchen)</span>
                <span className="earning">+{formatPaise(result.packagingChargePaise)}</span>
              </div>
            )}
            {result.tipPaise > 0 && (
              <div className="comm-breakdown-row">
                <span>Customer Tip (100% Pass-Through)</span>
                <span className="earning">+{formatPaise(result.tipPaise)}</span>
              </div>
            )}
            {deliveryModel === 'self_delivery' && result.customerDeliveryFeePaise > 0 && (
              <div className="comm-breakdown-row">
                <span>Self-Delivery Fee (Credited to Kitchen)</span>
                <span className="earning">+{formatPaise(result.customerDeliveryFeePaise)}</span>
              </div>
            )}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '2px solid #a7f3d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>{t.payoutSummary}</span>
              <strong style={{ fontSize: '1.75rem', color: '#065f46' }}>
                {formatPaise(result.restaurantPayoutPaise)}
              </strong>
            </div>
            <small style={{ color: '#059669', display: 'block', marginTop: '0.25rem' }}>
              Disbursed in weekly bank settlement ({activePlan.settlementDay}s).
            </small>
          </div>
        </div>

        {/* Right: What You Pay (Deductions) */}
        <div className="comm-calc-side right">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, color: '#991b1b', fontSize: '1.125rem' }}>
              {t.sideBySideRight}
            </h3>
            <span className="comm-badge rejected">Transparent Deductions</span>
          </div>

          <div>
            <div className="comm-breakdown-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                Nexora Commission ({result.commissionRatePercent}%)
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => setActiveTooltip(activeTooltip === 'comm' ? null : 'comm')}
                >
                  <HelpCircle size={14} color="#6b7280" />
                </button>
              </span>
              <strong className="deduction">-{formatPaise(result.commissionPaise)}</strong>
            </div>
            {activeTooltip === 'comm' && (
              <div style={{ fontSize: '0.75rem', background: '#fee2e2', padding: '0.5rem', borderRadius: '4px', margin: '0.25rem 0' }}>
                Calculated on Net Food Value (₹{grossRupees - restDiscountRupees}). 
                {launchOffer ? ' 0% launch rate active!' : ` Rate: ${deliveryModel === 'self_delivery' ? '8% Self' : '12% Nexora fleet'}.`}
              </div>
            )}

            <div className="comm-breakdown-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                Payment Gateway Fee (Actual Cost)
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => setActiveTooltip(activeTooltip === 'pg' ? null : 'pg')}
                >
                  <HelpCircle size={14} color="#6b7280" />
                </button>
              </span>
              <strong className="deduction">-{formatPaise(result.paymentGatewayFeePaise)}</strong>
            </div>
            {activeTooltip === 'pg' && (
              <div style={{ fontSize: '0.75rem', background: '#fee2e2', padding: '0.5rem', borderRadius: '4px', margin: '0.25rem 0' }}>
                Pass-through fee at actual transaction cost ({(activePlan.paymentGatewayFeeBps / 100).toFixed(2)}%). Zero markup added by Nexora.
              </div>
            )}

            <div className="comm-breakdown-row">
              <span>Listing & Onboarding Fee</span>
              <span style={{ color: '#047857', fontWeight: 600 }}>₹0.00 (Zero / Free)</span>
            </div>

            <div className="comm-breakdown-row">
              <span>Mandatory Advertising Fee</span>
              <span style={{ color: '#047857', fontWeight: 600 }}>₹0.00 (Zero / Free)</span>
            </div>

            {result.refundAdjustmentPaise > 0 && (
              <div className="comm-breakdown-row">
                <span>Verified Refund / Food Defect</span>
                <span className="deduction">-{formatPaise(result.refundAdjustmentPaise)}</span>
              </div>
            )}

            {result.isTaxApproved ? (
              <>
                <div className="comm-breakdown-row">
                  <span>GST on Commission (18%)</span>
                  <span className="deduction">-{formatPaise(result.taxGstOnCommissionPaise)}</span>
                </div>
                <div className="comm-breakdown-row">
                  <span>TDS u/s 194-O (1%)</span>
                  <span className="deduction">-{formatPaise(result.taxTdsPaise)}</span>
                </div>
              </>
            ) : (
              <div className="comm-breakdown-row">
                <span>Statutory GST / TDS</span>
                <span className="neutral">Pending CA Sign-Off</span>
              </div>
            )}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '2px solid #fecaca' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>Total Deductions</span>
              <strong style={{ fontSize: '1.5rem', color: '#b91c1c' }}>
                -{formatPaise(result.totalDeductionsPaise)}
              </strong>
            </div>
            <small style={{ color: '#b91c1c', display: 'block', marginTop: '0.25rem' }}>
              {t.effectiveCut}: <strong>{result.effectiveDeductionPercent}%</strong> of Net Food Value.
            </small>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="comm-stat-summary">
        <div className="comm-stat-card highlight">
          <span>{t.payoutSummary}</span>
          <strong>{formatPaise(result.restaurantPayoutPaise)}</strong>
        </div>
        <div className="comm-stat-card">
          <span>{t.nexoraRevenueSummary}</span>
          <strong>{formatPaise(result.nexoraRevenuePaise)}</strong>
        </div>
        <div className="comm-stat-card">
          <span>{t.effectiveCut}</span>
          <strong>{result.effectiveDeductionPercent}%</strong>
        </div>
        <div className="comm-stat-card">
          <span>Customer Paid Total</span>
          <strong>{formatPaise(result.customerPaidTotalPaise)}</strong>
        </div>
      </div>
    </div>
  );
}
