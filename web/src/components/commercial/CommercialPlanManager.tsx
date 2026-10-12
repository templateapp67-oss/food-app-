import React, { useState } from 'react';
import type { CommercialPlanConfig, UserRole, PlanVersionRecord } from '../../types/commercial';
import type { Language } from '../../locales/commercialTranslations';
import { translations } from '../../locales/commercialTranslations';
import { formatPaiseShort } from '../../services/commercialCalculator';
import { SAMPLE_PLAN_VERSIONS } from '../../data/commercialSeeds';
import PlanVersionHistoryModal from './PlanVersionHistoryModal';
import {
  Layers,
  Calendar,
  Percent,
  CheckCircle,
  Clock,
  Sparkles,
  CreditCard,
  SlidersHorizontal,
  FileCheck2,
  AlertCircle,
  Plus,
  History,
} from 'lucide-react';

interface Props {
  lang: Language;
  plans: CommercialPlanConfig[];
  activePlanId: string;
  onSelectPlan: (id: string) => void;
  onUpdatePlan: (updated: CommercialPlanConfig) => void;
  userRole: UserRole;
}

export default function CommercialPlanManager({
  lang,
  plans,
  activePlanId,
  onSelectPlan,
  onUpdatePlan,
  userRole,
}: Props) {
  const t = translations[lang];
  const activePlan = plans.find((p) => p.id === activePlanId) || plans[0];
  const [editingPlan, setEditingPlan] = useState<CommercialPlanConfig>(activePlan);
  const [saveMessage, setSaveMessage] = useState('');
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [versions, setVersions] = useState<PlanVersionRecord[]>(SAMPLE_PLAN_VERSIONS);

  const isFinanceOrAdmin = ['super_admin', 'finance_admin'].includes(userRole);

  const handleSave = () => {
    onUpdatePlan(editingPlan);
    const newVerRecord: PlanVersionRecord = {
      id: 'ver-' + Date.now(),
      planId: editingPlan.id,
      version: editingPlan.version,
      name: editingPlan.name,
      effectiveDate: editingPlan.effectiveDate,
      status: editingPlan.status,
      selfDeliveryCommissionBps: editingPlan.selfDeliveryCommissionBps,
      nexoraDeliveryCommissionBps: editingPlan.nexoraDeliveryCommissionBps,
      launchOfferDays: editingPlan.launchOfferDays,
      paymentGatewayFeeBps: editingPlan.paymentGatewayFeeBps,
      changedBy: `Authorized Staff (${userRole})`,
      changedByRole: userRole,
      reviewedByCa: editingPlan.reviewedByCaName || 'CA Rajesh Goyal',
      reviewedByCaDesignation: 'FCA, DISA (ICAI) - Empanelment #40291',
      reviewedByLawyer: editingPlan.reviewedByLawyerName || 'Adv. Vikas Jain',
      reviewedByLawyerDesignation: 'Advocate, High Court of Rajasthan',
      approvalTimestamp: new Date().toISOString(),
      changeSummary: `Updated commercial rate terms: Self ${(editingPlan.selfDeliveryCommissionBps / 100).toFixed(2)}%, Fleet ${(editingPlan.nexoraDeliveryCommissionBps / 100).toFixed(2)}%, Launch offer ${editingPlan.launchOfferDays} days.`,
      auditHash: `SHA256:${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`,
    };
    setVersions((prev) => [newVerRecord, ...prev]);
    setSaveMessage('Commercial plan version updated and recorded in audit log.');
    setTimeout(() => setSaveMessage(''), 4000);
  };

  return (
    <div className="comm-panel">
      <div className="comm-panel-header">
        <div>
          <h2>{t.plansTitle}</h2>
          <p className="comm-muted">{t.plansSubtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            className="comm-btn secondary"
            style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
            onClick={() => setVersionModalOpen(true)}
          >
            <History size={14} /> Version History &amp; Audit Trail
          </button>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Active Plan Version:</label>
          <select
            value={activePlan.id}
            onChange={(e) => {
              onSelectPlan(e.target.value);
              const p = plans.find((x) => x.id === e.target.value);
              if (p) setEditingPlan(p);
            }}
            style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (v{p.version}) · {p.status.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {saveMessage && (
        <div className="comm-banner-disclaimer" style={{ background: '#ecfdf5', color: '#065f46', borderLeftColor: '#10b981', marginBottom: '1.25rem' }}>
          <CheckCircle size={16} />
          {saveMessage}
        </div>
      )}

      {/* Plan Details & Configuration Form */}
      <div className="comm-form-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="comm-field">
          <label>Plan Commercial Name</label>
          <input
            type="text"
            disabled={!isFinanceOrAdmin}
            value={editingPlan.name}
            onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
          />
        </div>

        <div className="comm-field">
          <label>Version &amp; Effective Date</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <input
              type="text"
              disabled={!isFinanceOrAdmin}
              value={editingPlan.version}
              onChange={(e) => setEditingPlan({ ...editingPlan, version: e.target.value })}
            />
            <input
              type="date"
              disabled={!isFinanceOrAdmin}
              value={editingPlan.effectiveDate}
              onChange={(e) => setEditingPlan({ ...editingPlan, effectiveDate: e.target.value })}
            />
          </div>
        </div>

        <div className="comm-field">
          <label>{t.selfCommissionLabel} (%)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="30"
            disabled={!isFinanceOrAdmin}
            value={editingPlan.selfDeliveryCommissionBps / 100}
            onChange={(e) =>
              setEditingPlan({
                ...editingPlan,
                selfDeliveryCommissionBps: Math.round((Number(e.target.value) || 0) * 100),
              })
            }
          />
          <small>Proposed Nexora launch rate: 8.0% on Net Food Value</small>
        </div>

        <div className="comm-field">
          <label>{t.nexoraCommissionLabel} (%)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="30"
            disabled={!isFinanceOrAdmin}
            value={editingPlan.nexoraDeliveryCommissionBps / 100}
            onChange={(e) =>
              setEditingPlan({
                ...editingPlan,
                nexoraDeliveryCommissionBps: Math.round((Number(e.target.value) || 0) * 100),
              })
            }
          />
          <small>Proposed Nexora launch rate: 12.0% on Net Food Value</small>
        </div>

        <div className="comm-field">
          <label>{t.launchOfferDuration} (Calendar Days)</label>
          <input
            type="number"
            min="0"
            max="180"
            disabled={!isFinanceOrAdmin}
            value={editingPlan.launchOfferDays}
            onChange={(e) =>
              setEditingPlan({
                ...editingPlan,
                launchOfferDays: Number(e.target.value) || 0,
              })
            }
          />
          <small>Default: 30 days at 0% commission for new restaurants</small>
        </div>

        <div className="comm-field">
          <label>Settlement Schedule &amp; Cutoff</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <select
              disabled={!isFinanceOrAdmin}
              value={editingPlan.settlementDay}
              onChange={(e) =>
                setEditingPlan({
                  ...editingPlan,
                  settlementDay: e.target.value as CommercialPlanConfig['settlementDay'],
                })
              }
            >
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
            </select>
            <input
              type="text"
              readOnly
              value="23:59 IST Cutoff"
              style={{ background: '#f9fafb' }}
            />
          </div>
        </div>
      </div>

      {/* Subscription Plans Configuration */}
      <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>
          {t.subscriptionPlans} (Optional Modules — Never Mandatory)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {/* Free Listing Plan */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.25rem', background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '1rem' }}>{t.freePlan}</strong>
              <span className="comm-badge active">Default Included</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0.5rem 0 1rem' }}>
              Core marketplace ordering with zero monthly software subscription charges.
            </p>
            <ul style={{ fontSize: '0.8125rem', margin: 0, paddingLeft: '1.25rem', color: '#374151', lineHeight: '1.6' }}>
              <li>Unlimited customer food menu listing</li>
              <li>Customer ordering &amp; payment gateway processing</li>
              <li>Standard weekly bank payout settlements</li>
              <li>Partner management portal &amp; basic reports</li>
            </ul>
          </div>

          {/* Paid Growth Plan */}
          <div style={{ border: '2px solid #ea580c', borderRadius: '8px', padding: '1.25rem', background: '#fff7ed' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '1rem', color: '#c2410c' }}>{editingPlan.paidSubscriptionName}</strong>
              <span className="comm-badge approved">Optional Add-On</span>
            </div>
            <div style={{ margin: '0.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#9a3412' }}>
              {formatPaiseShort(editingPlan.paidSubscriptionMonthlyPaise)} <small style={{ fontSize: '0.75rem', fontWeight: 500 }}>/ month</small>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#7c2d12', margin: '0 0 1rem' }}>
              Enterprise technology features. Requires explicit opt-in; does not alter commission rates.
            </p>
            <ul style={{ fontSize: '0.8125rem', margin: 0, paddingLeft: '1.25rem', color: '#7c2d12', lineHeight: '1.6' }}>
              {editingPlan.paidSubscriptionFeatures.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Transparent Disclosures Checklist */}
      <div style={{ marginTop: '1.5rem', background: '#f9fafb', borderRadius: '8px', padding: '1rem', border: '1px solid #e5e7eb' }}>
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
          Nexora Commercial Transparency Guarantees:
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', fontSize: '0.8125rem' }}>
          <div>✓ Listing Fee: <strong>₹0 (Zero)</strong></div>
          <div>✓ Mandatory Ad Fee: <strong>₹0 (Zero)</strong></div>
          <div>✓ Gateway Fee: <strong>Actual {(editingPlan.paymentGatewayFeeBps / 100).toFixed(2)}% pass-through</strong></div>
          <div>✓ Restaurant Discounts: <strong>Only with explicit campaign consent</strong></div>
        </div>
      </div>

      {isFinanceOrAdmin && (
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="comm-btn primary" onClick={handleSave}>
            <FileCheck2 size={16} /> Save Commercial Plan Version
          </button>
        </div>
      )}

      <PlanVersionHistoryModal
        isOpen={versionModalOpen}
        onClose={() => setVersionModalOpen(false)}
        versions={versions}
        activePlanId={editingPlan.id}
        lang={lang}
      />
    </div>
  );
}
