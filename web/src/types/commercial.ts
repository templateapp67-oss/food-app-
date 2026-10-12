export type UserRole = 
  | 'super_admin'
  | 'finance_admin'
  | 'legal_reviewer'
  | 'restaurant_onboarding_staff'
  | 'restaurant_owner'
  | 'restaurant_staff';

export type OnboardingStep = 'business_info' | 'operations' | 'compliance_consent';

export type VerificationStatus = 
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'More Information Required'
  | 'Approved'
  | 'Rejected'
  | 'Suspended';

export type DeliveryModel = 'self_delivery' | 'nexora_delivery' | 'hybrid';

export type EntityType = 
  | 'Sole Proprietorship'
  | 'Partnership Firm'
  | 'Limited Liability Partnership (LLP)'
  | 'Private Limited Company'
  | 'Public Limited Company'
  | 'One Person Company';

export type LegalReviewStatus = 
  | 'Draft'
  | 'Pending CA review'
  | 'Pending lawyer review'
  | 'Changes requested'
  | 'Approved for internal use'
  | 'Accepted by restaurant'
  | 'Superseded'
  | 'Expired';

export interface DocumentUpload {
  id: string;
  kind: 'pan' | 'fssai' | 'gst' | 'bank_proof' | 'owner_id' | 'signed_agreement';
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  verified: boolean;
  expiryDate?: string;
  rejectionReason?: string;
}

export interface RestaurantApplication {
  id: string;
  restaurantId?: string;
  legalBusinessName: string;
  brandName: string;
  entityType: EntityType;
  ownerName: string;
  registeredAddress: string;
  kitchenAddress: string;
  city: string;
  state: string;
  pincode: string;
  serviceArea: string;
  mobile: string;
  email: string;
  pan: string;
  gstin?: string;
  fssaiNumber: string;
  fssaiType: 'Registration' | 'State License' | 'Central License';
  fssaiIssueDate: string;
  fssaiExpiryDate: string;
  bankAccountHolder: string;
  bankAccountNumber: string;
  bankIfsc: string;
  documents: DocumentUpload[];
  status: VerificationStatus;
  cuisines: string[];
  openingDays: string[];
  openingHours: string;
  prepTimeMin: number;
  acceptanceWindowSec: number;
  packagingCapability: string;
  deliveryModel: DeliveryModel;
  emergencyContact: string;
  privacyAccepted: boolean;
  termsAccepted: boolean;
  termsAcceptedAt?: string;
  termsVersionId?: string;
  exceptionReason?: string;
  exceptionGrantedBy?: string;
  submittedAt?: string;
  updatedAt: string;
}

export interface CommercialPlanConfig {
  id: string;
  version: string;
  name: string;
  effectiveDate: string;
  status: 'draft' | 'approved' | 'active' | 'superseded';
  selfDeliveryCommissionBps: number; // 800 = 8.00%
  nexoraDeliveryCommissionBps: number; // 1200 = 12.00%
  packagingInCommissionBase: boolean; // default false
  launchOfferEnabled: boolean;
  launchOfferDays: number; // default 30
  launchOfferCommissionBps: number; // default 0
  postOfferSelfCommissionBps: number; // default 800
  postOfferNexoraCommissionBps: number; // default 1200
  freeListingPlanFeePaise: number; // 0
  paidSubscriptionMonthlyPaise: number; // e.g. 99900 = ₹999
  paidSubscriptionName: string;
  paidSubscriptionFeatures: string[];
  listingFeePaise: number; // 0
  mandatoryAdFeePaise: number; // 0
  paymentGatewayFeeBps: number; // e.g. 180 = 1.8%
  paymentGatewayFlatPaise: number; // e.g. 300 = ₹3
  paymentGatewayTaxConfigured: boolean; // default false (requires CA review)
  settlementDay: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  settlementCutoffHour: number; // 23:59 IST
  taxConfigApproved: boolean; // Must be approved by CA
  taxGstBps: number; // e.g. 500 = 5% or 1800 = 18%
  taxTdsBps: number; // e.g. 100 = 1% section 194-O
  reviewedByCaName?: string;
  reviewedByCaDate?: string;
  reviewedByLawyerName?: string;
  reviewedByLawyerDate?: string;
}

export interface PlanVersionRecord {
  id: string;
  planId: string;
  version: string;
  name: string;
  effectiveDate: string;
  status: 'draft' | 'approved' | 'active' | 'superseded';
  selfDeliveryCommissionBps: number;
  nexoraDeliveryCommissionBps: number;
  launchOfferDays: number;
  paymentGatewayFeeBps: number;
  changedBy: string;
  changedByRole: UserRole;
  reviewedByCa?: string;
  reviewedByCaDesignation?: string;
  reviewedByLawyer?: string;
  reviewedByLawyerDesignation?: string;
  approvalTimestamp?: string;
  changeSummary: string;
  auditHash: string;
}

export interface OrderCalculationInput {
  grossFoodValuePaise: number;
  restaurantDiscountPaise: number;
  nexoraDiscountPaise: number;
  packagingChargePaise: number;
  customerDeliveryFeePaise: number;
  deliveryPartnerPayoutPaise: number;
  customerPlatformFeePaise: number;
  tipPaise: number;
  deliveryModel: DeliveryModel;
  isLaunchOfferActive: boolean;
  refundAdjustmentPaise: number;
  plan: CommercialPlanConfig;
}

export interface OrderCalculationResult {
  grossFoodValuePaise: number;
  restaurantDiscountPaise: number;
  nexoraDiscountPaise: number;
  netFoodValuePaise: number;
  commissionBasePaise: number;
  commissionRatePercent: number;
  commissionPaise: number;
  packagingChargePaise: number;
  packagingInBase: boolean;
  customerDeliveryFeePaise: number;
  customerPlatformFeePaise: number;
  tipPaise: number;
  deliveryPartnerPayoutPaise: number;
  paymentGatewayFeePaise: number;
  refundAdjustmentPaise: number;
  taxTdsPaise: number;
  taxGstOnCommissionPaise: number;
  totalDeductionsPaise: number;
  restaurantPayoutPaise: number;
  nexoraRevenuePaise: number;
  customerPaidTotalPaise: number;
  effectiveDeductionPercent: number;
  isTaxApproved: boolean;
  hasIncompleteEstimate: boolean;
  warnings: string[];
  lineBreakdown: {
    label: string;
    labelHi: string;
    amountPaise: number;
    type: 'earning' | 'deduction' | 'neutral' | 'platform';
    tooltip: string;
  }[];
}

export interface AgreementClause {
  id: number;
  title: string;
  titleHi: string;
  category: 'Commercial' | 'Legal' | 'Tax' | 'Operations' | 'Privacy';
  reviewStatus: LegalReviewStatus;
  requiresReview: 'CA' | 'Lawyer' | 'Privacy Counsel' | 'None';
  content: string;
  contentHi: string;
  lastReviewedBy?: string;
  lastReviewedDate?: string;
  notes?: string;
}

export interface DisputeTicket {
  id: string;
  restaurantId: string;
  orderNumber: string;
  amountPaise: number;
  issueType: 'commission_discrepancy' | 'payout_delay' | 'refund_contested' | 'gateway_charge';
  description: string;
  status: 'Open' | 'Under Investigation' | 'Resolved' | 'Rejected';
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementStatement {
  id: string;
  statementNumber: string;
  restaurantName: string;
  cyclePeriod: string;
  grossOrdersCount: number;
  grossFoodValuePaise: number;
  restaurantDiscountsPaise: number;
  netFoodValuePaise: number;
  commissionDeductedPaise: number;
  gatewayFeeDeductedPaise: number;
  refundsAdjustedPaise: number;
  taxWithheldPaise: number;
  netPayablePaise: number;
  status: 'Draft' | 'Approved' | 'Dispatched' | 'Settled' | 'On Hold';
  settlementDate: string;
  utrReference?: string;
}

export interface CommercialAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: UserRole;
  action: string;
  target: string;
  details: string;
}
