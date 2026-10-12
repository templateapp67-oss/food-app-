import React, { useState } from 'react';
import type {
  RestaurantApplication,
  CommercialPlanConfig,
  SettlementStatement,
  DisputeTicket,
} from '../../types/commercial';
import type { Language } from '../../locales/commercialTranslations';
import { translations } from '../../locales/commercialTranslations';
import { formatPaise } from '../../services/commercialCalculator';
import {
  Store,
  Clock,
  Sparkles,
  Wallet,
  FileText,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  ArrowRight,
  Send,
  Download,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  lang: Language;
  application: RestaurantApplication;
  plan: CommercialPlanConfig;
  statements: SettlementStatement[];
  disputes: DisputeTicket[];
  onSubmitDispute: (dispute: Omit<DisputeTicket, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  onNavigateTab: (tab: string) => void;
}

export default function PartnerDashboard({
  lang,
  application,
  plan,
  statements,
  disputes,
  onSubmitDispute,
  onNavigateTab,
}: Props) {
  const t = translations[lang];

  // Dispute form state
  const [orderNum, setOrderNum] = useState('');
  const [amountRupees, setAmountRupees] = useState<number>(0);
  const [issueType, setIssueType] = useState<DisputeTicket['issueType']>('commission_discrepancy');
  const [desc, setDesc] = useState('');
  const [disputeToast, setDisputeToast] = useState('');

  // Subscription state
  const [subscriptionActive, setSubscriptionActive] = useState(false);

  // 30-day countdown
  const launchOfferActive = true;
  const daysRemaining = 24;

  const handleDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNum || !desc) {
      alert('Please provide the order number and description.');
      return;
    }
    onSubmitDispute({
      restaurantId: application.id,
      orderNumber: orderNum,
      amountPaise: Math.round(amountRupees * 100),
      issueType,
      description: desc,
    });
    setOrderNum('');
    setAmountRupees(0);
    setDesc('');
    setDisputeToast('Commercial dispute submitted. Our finance review team will audit within 24-48 hours.');
    setTimeout(() => setDisputeToast(''), 4000);
  };

  return (
    <div className="comm-panel">
      {/* Header */}
      <div className="comm-panel-header">
        <div>
          <h2>{application.brandName || 'Partner Kitchen'} — {t.partnerPortalTitle}</h2>
          <p className="comm-muted">{t.partnerPortalSubtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="comm-badge approved">Active Jaipur Kitchen</span>
          <button type="button" className="comm-btn secondary" onClick={() => onNavigateTab('agreement')}>
            <FileText size={14} /> View Signed Agreement
          </button>
        </div>
      </div>

      {disputeToast && (
        <div className="comm-banner-disclaimer" style={{ background: '#ecfdf5', color: '#065f46', borderLeftColor: '#10b981', marginBottom: '1.25rem' }}>
          <CheckCircle size={16} />
          {disputeToast}
        </div>
      )}

      {/* Launch Offer & Key Plan Overview Grid */}
      <div className="comm-stat-summary" style={{ marginBottom: '1.5rem' }}>
        {launchOfferActive && (
          <div className="comm-stat-card highlight" style={{ background: '#fff7ed', borderColor: '#fdba74' }}>
            <span style={{ color: '#c2410c' }}>
              <Sparkles size={14} style={{ display: 'inline', marginRight: '4px' }} />
              {t.daysRemainingOffer}
            </span>
            <strong style={{ color: '#9a3412', fontSize: '1.625rem' }}>
              {daysRemaining} Days (0% Commission)
            </strong>
            <small style={{ color: '#c2410c' }}>
              Post-offer rate: {application.deliveryModel === 'self_delivery' ? '8% Self' : '12% Nexora fleet'}
            </small>
          </div>
        )}

        <div className="comm-stat-card">
          <span>{t.currentDeliveryModel}</span>
          <strong style={{ textTransform: 'capitalize' }}>
            {application.deliveryModel.replace('_', ' ')}
          </strong>
          <small>
            Base rate:{' '}
            {application.deliveryModel === 'self_delivery'
              ? `${plan.selfDeliveryCommissionBps / 100}%`
              : `${plan.nexoraDeliveryCommissionBps / 100}%`}
          </small>
        </div>

        <div className="comm-stat-card">
          <span>{t.settlementCycle}</span>
          <strong>Every {plan.settlementDay}</strong>
          <small>Direct NEFT/RTGS to {application.bankAccountHolder}</small>
        </div>

        <div className="comm-stat-card">
          <span>Compliance Status</span>
          <strong style={{ color: '#047857' }}>
            <ShieldCheck size={18} style={{ display: 'inline', marginRight: '4px' }} />
            All Documents Verified
          </strong>
          <small>FSSAI valid up to {application.fssaiExpiryDate || '2027-04-09'}</small>
        </div>
      </div>

      {/* Optional Subscription Module Controls */}
      <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
              Subscription Tier: {subscriptionActive ? plan.paidSubscriptionName : t.freePlan}
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>
              {subscriptionActive
                ? `Active monthly subscription (₹${plan.paidSubscriptionMonthlyPaise / 100}/mo). Next renewal: 01 Nov 2026.`
                : 'Free marketplace plan active. Core ordering with zero software fee.'}
            </p>
          </div>
          <div>
            {subscriptionActive ? (
              <button
                type="button"
                className="comm-btn secondary"
                style={{ color: '#b91c1c' }}
                onClick={() => setSubscriptionActive(false)}
              >
                Cancel Subscription Renewal
              </button>
            ) : (
              <button
                type="button"
                className="comm-btn primary"
                onClick={() => setSubscriptionActive(true)}
              >
                Upgrade to {plan.paidSubscriptionName} (₹{plan.paidSubscriptionMonthlyPaise / 100}/mo)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent Settlement Statements */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>{t.recentStatements}</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="comm-comparison-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Statement #</th>
                <th>Cycle Period</th>
                <th>Orders</th>
                <th>Gross Food</th>
                <th>Commission</th>
                <th>Gateway Fee</th>
                <th>Refunds</th>
                <th>Net Disbursed</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {statements.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.statementNumber}</strong></td>
                  <td>{s.cyclePeriod}</td>
                  <td>{s.grossOrdersCount}</td>
                  <td>{formatPaise(s.grossFoodValuePaise)}</td>
                  <td style={{ color: '#b91c1c' }}>-{formatPaise(s.commissionDeductedPaise)}</td>
                  <td style={{ color: '#b91c1c' }}>-{formatPaise(s.gatewayFeeDeductedPaise)}</td>
                  <td style={{ color: s.refundsAdjustedPaise > 0 ? '#b91c1c' : '#6b7280' }}>
                    {s.refundsAdjustedPaise > 0 ? `-${formatPaise(s.refundsAdjustedPaise)}` : '₹0.00'}
                  </td>
                  <td><strong style={{ color: '#047857' }}>{formatPaise(s.netPayablePaise)}</strong></td>
                  <td>
                    <span className={`comm-badge ${s.status === 'Settled' ? 'approved' : 'pending'}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Support & Commercial Dispute Submission */}
      <div style={{ background: '#fafafa', borderRadius: '8px', padding: '1.25rem', border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem' }}>{t.submitDispute}</h3>
        <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: '#6b7280' }}>
          Notice a discrepancy in commission calculation, payment gateway pass-through, or customer refund? Submit a ticket for reconciliation.
        </p>

        <form onSubmit={handleDisputeSubmit} className="comm-form-grid">
          <div className="comm-field">
            <label>Order Number *</label>
            <input
              type="text"
              required
              value={orderNum}
              onChange={(e) => setOrderNum(e.target.value)}
              placeholder="e.g. NEX-ORD-98412"
            />
          </div>

          <div className="comm-field">
            <label>{t.disputeReason} *</label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value as DisputeTicket['issueType'])}
            >
              <option value="commission_discrepancy">Commission Deduction Discrepancy</option>
              <option value="refund_contested">Contested Customer Refund / Spillage</option>
              <option value="gateway_charge">Payment Gateway Cost Inquiry</option>
              <option value="payout_delay">Settlement Disbursement Delay</option>
            </select>
          </div>

          <div className="comm-field">
            <label>Disputed Amount (₹)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={amountRupees}
              onChange={(e) => setAmountRupees(Number(e.target.value) || 0)}
            />
          </div>

          <div className="comm-field" style={{ gridColumn: 'span 3' }}>
            <label>{t.disputeDesc} *</label>
            <textarea
              rows={2}
              required
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Provide evidence or context regarding packaging photos, order slips, or rate applied..."
            />
          </div>

          <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="comm-btn primary">
              <Send size={14} /> Submit Commercial Dispute
            </button>
          </div>
        </form>

        {/* Existing Open Disputes */}
        {disputes.length > 0 && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem' }}>Active Support Tickets:</h4>
            {disputes.map((d) => (
              <div
                key={d.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.875rem' }}>{d.orderNumber}</strong> ·{' '}
                  <span style={{ color: '#6b7280', fontSize: '0.8125rem' }}>{d.issueType.replace('_', ' ')}</span>
                  <div style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: '2px' }}>{d.description}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`comm-badge ${d.status === 'Resolved' ? 'approved' : 'pending'}`}>
                    {d.status}
                  </span>
                  {d.resolutionNotes && (
                    <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '4px' }}>
                      {d.resolutionNotes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
