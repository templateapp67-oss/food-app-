import { describe, it, expect } from 'vitest';
import {
  calculateOrderSettlement,
  formatPaise,
  formatPaiseShort,
  DEFAULT_COMMERCIAL_PLAN,
} from './commercialCalculator';
import type { CommercialPlanConfig, OrderCalculationInput } from '../types/commercial';

describe('Commercial Settlement Calculator (Integer Paise)', () => {
  it('formats integer paise into correct Indian Rupee representations', () => {
    expect(formatPaise(125000)).toBe('₹1,250.00');
    expect(formatPaise(50)).toBe('₹0.50');
    expect(formatPaise(0)).toBe('₹0.00');
    expect(formatPaise(-3600)).toBe('-₹36.00');
    expect(formatPaiseShort(125000)).toBe('₹1,250');
    expect(formatPaiseShort(125050)).toBe('₹1,250.50');
  });

  it('calculates Self-Delivery order as per specification example', () => {
    // Gross: ₹500, Restaurant discount: ₹50, Net: ₹450, 8% commission = ₹36
    const input: OrderCalculationInput = {
      grossFoodValuePaise: 50000,
      restaurantDiscountPaise: 5000,
      nexoraDiscountPaise: 0,
      packagingChargePaise: 0,
      customerDeliveryFeePaise: 3000, // ₹30 delivery fee
      deliveryPartnerPayoutPaise: 0,
      customerPlatformFeePaise: 0,
      tipPaise: 0,
      deliveryModel: 'self_delivery',
      isLaunchOfferActive: false,
      refundAdjustmentPaise: 0,
      plan: {
        ...DEFAULT_COMMERCIAL_PLAN,
        paymentGatewayFeeBps: 0, // Zero out gateway for pure commission check
        paymentGatewayFlatPaise: 0,
      },
    };

    const res = calculateOrderSettlement(input);
    expect(res.grossFoodValuePaise).toBe(50000);
    expect(res.restaurantDiscountPaise).toBe(5000);
    expect(res.netFoodValuePaise).toBe(45000);
    expect(res.commissionBasePaise).toBe(45000);
    expect(res.commissionRatePercent).toBe(8);
    expect(res.commissionPaise).toBe(3600); // 8% of ₹450 = ₹36.00
    // Self-delivery fee belongs to restaurant
    expect(res.restaurantPayoutPaise).toBe(45000 + 3000 - 3600); // ₹444.00
  });

  it('calculates Nexora-Delivery order as per specification example', () => {
    // Gross: ₹500, Restaurant discount: ₹50, Net: ₹450, 12% commission = ₹54
    const input: OrderCalculationInput = {
      grossFoodValuePaise: 50000,
      restaurantDiscountPaise: 5000,
      nexoraDiscountPaise: 0,
      packagingChargePaise: 0,
      customerDeliveryFeePaise: 3500,
      deliveryPartnerPayoutPaise: 3000,
      customerPlatformFeePaise: 500,
      tipPaise: 0,
      deliveryModel: 'nexora_delivery',
      isLaunchOfferActive: false,
      refundAdjustmentPaise: 0,
      plan: {
        ...DEFAULT_COMMERCIAL_PLAN,
        paymentGatewayFeeBps: 0,
        paymentGatewayFlatPaise: 0,
      },
    };

    const res = calculateOrderSettlement(input);
    expect(res.netFoodValuePaise).toBe(45000);
    expect(res.commissionRatePercent).toBe(12);
    expect(res.commissionPaise).toBe(5400); // 12% of ₹450 = ₹54.00
    // Customer delivery fee is kept for platform/rider delivery, not credited to restaurant
    expect(res.restaurantPayoutPaise).toBe(45000 - 5400); // ₹396.00
  });

  it('applies 0% commission when 30-day launch offer is active', () => {
    const input: OrderCalculationInput = {
      grossFoodValuePaise: 80000,
      restaurantDiscountPaise: 10000,
      nexoraDiscountPaise: 5000,
      packagingChargePaise: 2000,
      customerDeliveryFeePaise: 3000,
      deliveryPartnerPayoutPaise: 3000,
      customerPlatformFeePaise: 0,
      tipPaise: 0,
      deliveryModel: 'nexora_delivery',
      isLaunchOfferActive: true,
      refundAdjustmentPaise: 0,
      plan: {
        ...DEFAULT_COMMERCIAL_PLAN,
        launchOfferEnabled: true,
        launchOfferCommissionBps: 0,
        paymentGatewayFeeBps: 0,
      },
    };

    const res = calculateOrderSettlement(input);
    expect(res.netFoodValuePaise).toBe(70000);
    expect(res.commissionRatePercent).toBe(0);
    expect(res.commissionPaise).toBe(0);
    // Restaurant gets Net Food Value + Packaging = ₹720
    expect(res.restaurantPayoutPaise).toBe(70000 + 2000);
  });

  it('does not deduct Nexora-funded discounts from restaurant food earning', () => {
    // Gross: ₹1,000, Nexora discount: ₹200 (funded by platform), Restaurant discount: ₹0
    const input: OrderCalculationInput = {
      grossFoodValuePaise: 100000,
      restaurantDiscountPaise: 0,
      nexoraDiscountPaise: 20000,
      packagingChargePaise: 0,
      customerDeliveryFeePaise: 0,
      deliveryPartnerPayoutPaise: 0,
      customerPlatformFeePaise: 0,
      tipPaise: 0,
      deliveryModel: 'nexora_delivery',
      isLaunchOfferActive: false,
      refundAdjustmentPaise: 0,
      plan: {
        ...DEFAULT_COMMERCIAL_PLAN,
        paymentGatewayFeeBps: 0,
      },
    };

    const res = calculateOrderSettlement(input);
    expect(res.netFoodValuePaise).toBe(100000); // Net food value is full ₹1,000
    expect(res.commissionPaise).toBe(12000); // 12% of ₹1000 = ₹120
    expect(res.restaurantPayoutPaise).toBe(88000); // ₹880
  });

  it('excludes packaging charge from commission base by default, and includes it only when configured', () => {
    const baseInput: OrderCalculationInput = {
      grossFoodValuePaise: 50000,
      restaurantDiscountPaise: 0,
      nexoraDiscountPaise: 0,
      packagingChargePaise: 3000, // ₹30
      customerDeliveryFeePaise: 0,
      deliveryPartnerPayoutPaise: 0,
      customerPlatformFeePaise: 0,
      tipPaise: 0,
      deliveryModel: 'self_delivery', // 8%
      isLaunchOfferActive: false,
      refundAdjustmentPaise: 0,
      plan: {
        ...DEFAULT_COMMERCIAL_PLAN,
        packagingInCommissionBase: false,
        paymentGatewayFeeBps: 0,
      },
    };

    // Default: excluded from commission base
    const resExcluded = calculateOrderSettlement(baseInput);
    expect(resExcluded.commissionBasePaise).toBe(50000);
    expect(resExcluded.commissionPaise).toBe(4000); // 8% of ₹500 = ₹40

    // Configured: included in commission base
    const resIncluded = calculateOrderSettlement({
      ...baseInput,
      plan: {
        ...baseInput.plan,
        packagingInCommissionBase: true,
      },
    });
    expect(resIncluded.commissionBasePaise).toBe(53000);
    expect(resIncluded.commissionPaise).toBe(Math.round((53000 * 800) / 10000)); // 8% of ₹530 = ₹42.40 -> 4240 paise
  });

  it('marks tax calculations pending and warns if tax config is unapproved by CA', () => {
    const input: OrderCalculationInput = {
      grossFoodValuePaise: 60000,
      restaurantDiscountPaise: 0,
      nexoraDiscountPaise: 0,
      packagingChargePaise: 0,
      customerDeliveryFeePaise: 0,
      deliveryPartnerPayoutPaise: 0,
      customerPlatformFeePaise: 0,
      tipPaise: 0,
      deliveryModel: 'self_delivery',
      isLaunchOfferActive: false,
      refundAdjustmentPaise: 0,
      plan: {
        ...DEFAULT_COMMERCIAL_PLAN,
        taxConfigApproved: false,
      },
    };

    const res = calculateOrderSettlement(input);
    expect(res.isTaxApproved).toBe(false);
    expect(res.hasIncompleteEstimate).toBe(true);
    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.taxTdsPaise).toBe(0);
    expect(res.taxGstOnCommissionPaise).toBe(0);
  });

  it('calculates GST on commission and TDS once CA approval is recorded', () => {
    const input: OrderCalculationInput = {
      grossFoodValuePaise: 100000, // ₹1,000
      restaurantDiscountPaise: 0,
      nexoraDiscountPaise: 0,
      packagingChargePaise: 0,
      customerDeliveryFeePaise: 0,
      deliveryPartnerPayoutPaise: 0,
      customerPlatformFeePaise: 0,
      tipPaise: 0,
      deliveryModel: 'nexora_delivery', // 12% = ₹120 commission (12000 paise)
      isLaunchOfferActive: false,
      refundAdjustmentPaise: 0,
      plan: {
        ...DEFAULT_COMMERCIAL_PLAN,
        paymentGatewayFeeBps: 0,
        taxConfigApproved: true,
        taxGstBps: 1800, // 18% GST on commission = ₹21.60 (2160 paise)
        taxTdsBps: 100, // 1% TDS on food value = ₹10.00 (1000 paise)
      },
    };

    const res = calculateOrderSettlement(input);
    expect(res.isTaxApproved).toBe(true);
    expect(res.commissionPaise).toBe(12000);
    expect(res.taxGstOnCommissionPaise).toBe(2160);
    expect(res.taxTdsPaise).toBe(1000);
    // Payout = 100,000 - 12,000 (comm) - 2,160 (gst) - 1,000 (tds) = 84,840 paise (₹848.40)
    expect(res.restaurantPayoutPaise).toBe(84840);
  });

  it('properly subtracts supported refund adjustments with itemised audit', () => {
    const input: OrderCalculationInput = {
      grossFoodValuePaise: 50000,
      restaurantDiscountPaise: 0,
      nexoraDiscountPaise: 0,
      packagingChargePaise: 0,
      customerDeliveryFeePaise: 0,
      deliveryPartnerPayoutPaise: 0,
      customerPlatformFeePaise: 0,
      tipPaise: 0,
      deliveryModel: 'self_delivery',
      isLaunchOfferActive: false,
      refundAdjustmentPaise: 15000, // ₹150 refund adjustment
      plan: {
        ...DEFAULT_COMMERCIAL_PLAN,
        paymentGatewayFeeBps: 0,
      },
    };

    const res = calculateOrderSettlement(input);
    expect(res.refundAdjustmentPaise).toBe(15000);
    // Net food 50,000 - commission 4,000 - refund 15,000 = 31,000
    expect(res.restaurantPayoutPaise).toBe(31000);
  });

  it('handles edge case of 0 gross value or fully discounted orders without negative payout', () => {
    const input: OrderCalculationInput = {
      grossFoodValuePaise: 0,
      restaurantDiscountPaise: 0,
      nexoraDiscountPaise: 0,
      packagingChargePaise: 0,
      customerDeliveryFeePaise: 0,
      deliveryPartnerPayoutPaise: 0,
      customerPlatformFeePaise: 0,
      tipPaise: 0,
      deliveryModel: 'self_delivery',
      isLaunchOfferActive: false,
      refundAdjustmentPaise: 5000,
      plan: DEFAULT_COMMERCIAL_PLAN,
    };

    const res = calculateOrderSettlement(input);
    expect(res.restaurantPayoutPaise).toBe(0);
    expect(res.commissionPaise).toBe(0);
  });
});
