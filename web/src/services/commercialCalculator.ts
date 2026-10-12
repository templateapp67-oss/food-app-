import type { CommercialPlanConfig, OrderCalculationInput, OrderCalculationResult } from '../types/commercial';

/**
 * Format integer paise into an Indian Rupee string (e.g., ₹1,250.00).
 */
export function formatPaise(paise: number): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(Math.round(paise));
  const rupees = Math.floor(absPaise / 100);
  const remainder = absPaise % 100;
  
  const rupeesStr = rupees.toLocaleString('en-IN');
  const remainderStr = remainder.toString().padStart(2, '0');
  
  return `${isNegative ? '-' : ''}₹${rupeesStr}.${remainderStr}`;
}

/**
 * Format integer paise into short Rupee string without decimals if zero (e.g., ₹1,250).
 */
export function formatPaiseShort(paise: number): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(Math.round(paise));
  const rupees = Math.floor(absPaise / 100);
  const remainder = absPaise % 100;
  
  if (remainder === 0) {
    return `${isNegative ? '-' : ''}₹${rupees.toLocaleString('en-IN')}`;
  }
  return formatPaise(paise);
}

/**
 * Calculate commercial settlement for a restaurant order.
 * All financial math is conducted strictly in integer paise.
 */
export function calculateOrderSettlement(input: OrderCalculationInput): OrderCalculationResult {
  const {
    grossFoodValuePaise,
    restaurantDiscountPaise,
    nexoraDiscountPaise,
    packagingChargePaise,
    customerDeliveryFeePaise,
    customerPlatformFeePaise,
    tipPaise,
    deliveryPartnerPayoutPaise,
    deliveryModel,
    isLaunchOfferActive,
    refundAdjustmentPaise,
    plan,
  } = input;

  const warnings: string[] = [];

  // 1. Net Food Value = Gross Food Value minus restaurant-funded discount
  // Nexora-funded discount is NOT deducted from the restaurant's food earning
  const netFoodValuePaise = Math.max(0, grossFoodValuePaise - restaurantDiscountPaise);

  // 2. Commission base
  // Excludes delivery fee, platform fee, tips, taxes. Packaging included only if configured.
  let commissionBasePaise = netFoodValuePaise;
  if (plan.packagingInCommissionBase) {
    commissionBasePaise += packagingChargePaise;
  }

  // 3. Applicable commission rate
  let commissionBps = 0;
  if (isLaunchOfferActive && plan.launchOfferEnabled) {
    commissionBps = plan.launchOfferCommissionBps;
  } else {
    commissionBps = deliveryModel === 'self_delivery'
      ? plan.selfDeliveryCommissionBps
      : plan.nexoraDeliveryCommissionBps;
  }

  // Integer math: (base * bps + 5000) / 10000 for standard rounding
  const commissionPaise = Math.round((commissionBasePaise * commissionBps) / 10000);
  const commissionRatePercent = commissionBps / 100;

  // 4. Payment Gateway Fee (actual configured formula: bps + flat fee)
  // Applied on total amount collected via gateway (Food net + packaging + delivery + tip + platform fee)
  const customerCollectedPaise = Math.max(
    0,
    grossFoodValuePaise - restaurantDiscountPaise - nexoraDiscountPaise +
    packagingChargePaise + customerDeliveryFeePaise + customerPlatformFeePaise + tipPaise
  );
  
  const pgBpsFee = Math.round((customerCollectedPaise * plan.paymentGatewayFeeBps) / 10000);
  const paymentGatewayFeePaise = customerCollectedPaise > 0 ? (pgBpsFee + plan.paymentGatewayFlatPaise) : 0;

  // 5. Tax rules check
  // Never hard-code final legal/tax conclusions; must be approved by CA
  let taxGstOnCommissionPaise = 0;
  let taxTdsPaise = 0;
  const isTaxApproved = plan.taxConfigApproved;

  if (isTaxApproved) {
    // GST on commission (e.g. 18% on Nexora service charge)
    taxGstOnCommissionPaise = Math.round((commissionPaise * plan.taxGstBps) / 10000);
    // TDS u/s 194-O (e.g. 1% on Gross/Net food value according to approved policy)
    taxTdsPaise = Math.round((netFoodValuePaise * plan.taxTdsBps) / 10000);
  } else {
    warnings.push('Tax configuration requires approved CA sign-off. TDS and GST estimates are marked pending.');
  }

  // 6. Restaurant Payout Calculation
  // Restaurant receives:
  //   + Net Food Value (Gross - Restaurant discount)
  //   + Packaging charge (if charged by restaurant)
  //   + Tips (100% passed through)
  //   + Delivery fee (ONLY if self-delivery)
  // Deductions:
  //   - Commission
  //   - Payment Gateway Fee (if passed to restaurant)
  //   - Refund adjustments (verified order adjustments)
  //   - Approved taxes (GST on commission, TDS)
  
  const restaurantGrossEntitlementPaise = 
    netFoodValuePaise +
    packagingChargePaise +
    tipPaise +
    (deliveryModel === 'self_delivery' ? customerDeliveryFeePaise : 0);

  // Total deductions
  const deductionsWithoutTaxPaise = 
    commissionPaise +
    paymentGatewayFeePaise +
    refundAdjustmentPaise;

  const totalDeductionsPaise = isTaxApproved
    ? deductionsWithoutTaxPaise + taxGstOnCommissionPaise + taxTdsPaise
    : deductionsWithoutTaxPaise;

  const restaurantPayoutPaise = Math.max(0, restaurantGrossEntitlementPaise - totalDeductionsPaise);

  // 7. Nexora Revenue
  // Nexora earns commission + customer platform fee + (delivery fee if nexora delivery minus rider payout)
  const deliveryMarginPaise = deliveryModel === 'nexora_delivery'
    ? Math.max(0, customerDeliveryFeePaise - deliveryPartnerPayoutPaise)
    : 0;
  const nexoraRevenuePaise = commissionPaise + customerPlatformFeePaise + deliveryMarginPaise;

  // 8. Effective deduction percentage of food value
  const effectiveDeductionPercent = netFoodValuePaise > 0
    ? Math.round((totalDeductionsPaise / netFoodValuePaise) * 10000) / 100
    : 0;

  // 9. Structured line-by-line breakdown
  const lineBreakdown: OrderCalculationResult['lineBreakdown'] = [
    {
      label: 'Gross Food Value',
      labelHi: 'कुल फ़ूड मूल्य (डिस्काउंट से पहले)',
      amountPaise: grossFoodValuePaise,
      type: 'earning',
      tooltip: 'Menu item prices total before any discounts are applied.',
    },
    {
      label: 'Restaurant-funded Discount',
      labelHi: 'रेस्टोरेंट द्वारा दिया गया डिस्काउंट',
      amountPaise: -restaurantDiscountPaise,
      type: 'deduction',
      tooltip: 'Discounts funded by your kitchen. Deducted before computing commission.',
    },
    {
      label: 'Net Food Value (Commission Base)',
      labelHi: 'शुद्ध फ़ूड मूल्य (कमीशन आधार)',
      amountPaise: netFoodValuePaise,
      type: 'earning',
      tooltip: 'Gross food value minus restaurant-funded discount. Standard base for Nexora commission.',
    },
    {
      label: `Platform Commission (${commissionRatePercent}%)`,
      labelHi: `प्लेटफ़ॉर्म कमीशन (${commissionRatePercent}%)`,
      amountPaise: -commissionPaise,
      type: 'deduction',
      tooltip: isLaunchOfferActive 
        ? '0% launch offer active for your first 30 calendar days!' 
        : `Applied strictly on Net Food Value (${deliveryModel === 'self_delivery' ? '8% Self-delivery' : '12% Nexora delivery'}).`,
    },
    {
      label: 'Packaging Charge',
      labelHi: 'पैकेजिंग शुल्क',
      amountPaise: packagingChargePaise,
      type: 'earning',
      tooltip: plan.packagingInCommissionBase 
        ? 'Packaging charge (included in commission base as per plan).' 
        : 'Packaging charge earned by restaurant. Excluded from commission base.',
    },
    {
      label: 'Payment Gateway Fee',
      labelHi: 'पेमेंट गेटवे शुल्क (लागत अनुसार)',
      amountPaise: -paymentGatewayFeePaise,
      type: 'deduction',
      tooltip: `Actual payment processing fee (${(plan.paymentGatewayFeeBps / 100).toFixed(2)}% + ₹${(plan.paymentGatewayFlatPaise / 100).toFixed(2)}). Displayed separately with zero markup.`,
    },
  ];

  if (tipPaise > 0) {
    lineBreakdown.push({
      label: 'Customer Tip (100% to Kitchen/Rider)',
      labelHi: 'ग्राहक टिप (100% हस्तांतरण)',
      amountPaise: tipPaise,
      type: 'earning',
      tooltip: '100% of customer tip is passed through without any commission.',
    });
  }

  if (deliveryModel === 'self_delivery' && customerDeliveryFeePaise > 0) {
    lineBreakdown.push({
      label: 'Self-Delivery Fee Collected',
      labelHi: 'स्वयं डिलीवरी शुल्क (रेस्टोरेंट को देय)',
      amountPaise: customerDeliveryFeePaise,
      type: 'earning',
      tooltip: 'Delivery fee collected from customer and credited to you for self-delivery.',
    });
  }

  if (refundAdjustmentPaise > 0) {
    lineBreakdown.push({
      label: 'Order Refund / Adjustment',
      labelHi: 'रिफंड / समायोजन कटौती',
      amountPaise: -refundAdjustmentPaise,
      type: 'deduction',
      tooltip: 'Itemised deduction supported by verified order dispute and agreed policy.',
    });
  }

  if (isTaxApproved) {
    if (taxGstOnCommissionPaise > 0) {
      lineBreakdown.push({
        label: `GST on Commission (${(plan.taxGstBps / 100).toFixed(1)}%)`,
        labelHi: `कमीशन पर GST (${(plan.taxGstBps / 100).toFixed(1)}%)`,
        amountPaise: -taxGstOnCommissionPaise,
        type: 'deduction',
        tooltip: 'Goods and Services Tax on platform commission, verified by CA configuration.',
      });
    }
    if (taxTdsPaise > 0) {
      lineBreakdown.push({
        label: `TDS u/s 194-O (${(plan.taxTdsBps / 100).toFixed(1)}%)`,
        labelHi: `TDS धारा 194-O (${(plan.taxTdsBps / 100).toFixed(1)}%)`,
        amountPaise: -taxTdsPaise,
        type: 'deduction',
        tooltip: 'Statutory Tax Deducted at Source as per Indian Income Tax guidelines.',
      });
    }
  } else {
    lineBreakdown.push({
      label: 'Statutory Taxes (GST / TDS)',
      labelHi: 'वैधानिक कर (GST / TDS)',
      amountPaise: 0,
      type: 'neutral',
      tooltip: 'Pending CA/Lawyer Review. Not deducted until officially verified.',
    });
  }

  return {
    grossFoodValuePaise,
    restaurantDiscountPaise,
    nexoraDiscountPaise,
    netFoodValuePaise,
    commissionBasePaise,
    commissionRatePercent,
    commissionPaise,
    packagingChargePaise,
    packagingInBase: plan.packagingInCommissionBase,
    customerDeliveryFeePaise,
    customerPlatformFeePaise,
    tipPaise,
    deliveryPartnerPayoutPaise,
    paymentGatewayFeePaise,
    refundAdjustmentPaise,
    taxTdsPaise,
    taxGstOnCommissionPaise,
    totalDeductionsPaise,
    restaurantPayoutPaise,
    nexoraRevenuePaise,
    customerPaidTotalPaise: customerCollectedPaise,
    effectiveDeductionPercent,
    isTaxApproved,
    hasIncompleteEstimate: !isTaxApproved,
    warnings,
    lineBreakdown,
  };
}

/**
 * Standard default plan configuration for Nexora Food.
 * Reflects proposed launch terms with transparent defaults.
 */
export const DEFAULT_COMMERCIAL_PLAN: CommercialPlanConfig = {
  id: 'nexora-standard-2026',
  version: '1.0.0-PROPOSED',
  name: 'Nexora Standard Partner Plan',
  effectiveDate: '2026-10-15',
  status: 'active',
  selfDeliveryCommissionBps: 800, // 8.00%
  nexoraDeliveryCommissionBps: 1200, // 12.00%
  packagingInCommissionBase: false, // Default excluded
  launchOfferEnabled: true,
  launchOfferDays: 30,
  launchOfferCommissionBps: 0, // 0%
  postOfferSelfCommissionBps: 800,
  postOfferNexoraCommissionBps: 1200,
  freeListingPlanFeePaise: 0,
  paidSubscriptionMonthlyPaise: 99900, // ₹999/mo (optional)
  paidSubscriptionName: 'Nexora Pro Kitchen Growth',
  paidSubscriptionFeatures: [
    'Advanced Real-Time Revenue Analytics',
    'POS & Billing System API Integration',
    'Dynamic QR Digital Table Menu',
    'Targeted Neighbourhood Promotional Campaigns',
  ],
  listingFeePaise: 0,
  mandatoryAdFeePaise: 0,
  paymentGatewayFeeBps: 180, // 1.80% actual pass-through
  paymentGatewayFlatPaise: 0,
  paymentGatewayTaxConfigured: false,
  settlementDay: 'Wednesday',
  settlementCutoffHour: 23,
  taxConfigApproved: false, // Explicitly marked unapproved until CA review
  taxGstBps: 1800, // 18% GST on platform services (draft)
  taxTdsBps: 100, // 1% section 194-O (draft)
  reviewedByCaName: undefined,
  reviewedByCaDate: undefined,
  reviewedByLawyerName: undefined,
  reviewedByLawyerDate: undefined,
};
