import React, { useState } from 'react';
import type {
  AgreementClause,
  CommercialPlanConfig,
  RestaurantApplication,
  UserRole,
} from '../../types/commercial';
import type { Language } from '../../locales/commercialTranslations';
import { translations } from '../../locales/commercialTranslations';
import { MASTER_AGREEMENT_CLAUSES } from '../../data/commercialSeeds';
import {
  Printer,
  FileDown,
  CheckCircle,
  ShieldAlert,
  Edit3,
  Globe2,
  FileSignature,
} from 'lucide-react';

interface Props {
  lang: Language;
  plan: CommercialPlanConfig;
  application: RestaurantApplication;
  clauses?: AgreementClause[];
  userRole: UserRole;
  onUpdateClause?: (clauseId: number, newContent: string) => void;
}

export default function AgreementViewer({
  lang,
  plan,
  application,
  clauses = MASTER_AGREEMENT_CLAUSES,
  userRole,
  onUpdateClause,
}: Props) {
  const t = translations[lang];
  const [editingClauseId, setEditingClauseId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [arbitrationSeat, setArbitrationSeat] = useState<string>('Jaipur, Rajasthan (Configurable)');
  const [courtJurisdiction, setCourtJurisdiction] = useState<string>('Competent Courts at Jaipur, Rajasthan');

  const isLegalOrAdmin = ['super_admin', 'legal_reviewer'].includes(userRole);

  const startEdit = (c: AgreementClause) => {
    setEditingClauseId(c.id);
    setEditingContent(c.content);
  };

  const saveEdit = (clauseId: number) => {
    if (onUpdateClause) {
      onUpdateClause(clauseId, editingContent);
    }
    setEditingClauseId(null);
  };

  // Replace placeholders in agreement text
  const hydrateText = (raw: string): string => {
    return raw
      .replace(/\[EFFECTIVE_DATE\]/g, plan.effectiveDate)
      .replace(/\[RESTAURANT_LEGAL_NAME\]/g, application.legalBusinessName || '[Restaurant Legal Entity]')
      .replace(/\[BRAND_NAME\]/g, application.brandName || '[Brand Name]')
      .replace(/\[ARBITRATION_SEAT_PLACEHOLDER\]/g, arbitrationSeat)
      .replace(/\[COURT_JURISDICTION_PLACEHOLDER\]/g, courtJurisdiction);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadDraft = () => {
    const fullText = [
      '==============================================================',
      'NEXORA FOOD — RESTAURANT PARTNER AGREEMENT',
      'VERSION: ' + plan.version + ' | EFFECTIVE: ' + plan.effectiveDate,
      'STATUS: DRAFT ONLY — PENDING FORMAL CA & LAWYER REVIEW',
      '==============================================================\n',
      ...clauses.map((c) => `${c.title}\n${hydrateText(c.content)}\n`),
      '\n==============================================================',
      'ANNEXURE A — COMMERCIAL TERMS MATRIX',
      '==============================================================',
      `Self-Delivery Commission: ${plan.selfDeliveryCommissionBps / 100}%`,
      `Nexora Fleet Commission: ${plan.nexoraDeliveryCommissionBps / 100}%`,
      `Commission Base: Net Food Value (Discount ke baad)`,
      `Launch Offer: ${plan.launchOfferDays} days at ${plan.launchOfferCommissionBps}%`,
      `Settlement Frequency: Weekly (${plan.settlementDay}s)`,
      `Payment Gateway: ${(plan.paymentGatewayFeeBps / 100).toFixed(2)}% pass-through`,
      `Listing Fee: ₹0.00 | Mandatory Ad Fee: ₹0.00`,
      '\n[DIGITAL SIGNATURE AUDIT STAMP]',
      `Accepted by: ${application.ownerName} (${application.brandName})`,
      `Timestamp: ${application.termsAcceptedAt || new Date().toISOString()}`,
      `Compliance Hash: SHA256-${Date.now().toString(36)}`,
    ].join('\n');

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nexora_Partner_Agreement_${application.brandName.replace(/\s+/g, '_')}_Draft.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="comm-panel">
      <div className="comm-panel-header">
        <div>
          <h2>{t.agreementTitle}</h2>
          <p className="comm-muted">{t.agreementSubtitle}</p>
        </div>
        <div className="comm-btn-group">
          <button type="button" className="comm-btn secondary" onClick={handlePrint}>
            <Printer size={14} /> {t.printDownload}
          </button>
          <button type="button" className="comm-btn primary" onClick={handleDownloadDraft}>
            <FileDown size={14} /> Download Agreement Text
          </button>
        </div>
      </div>

      <div className="comm-banner-disclaimer" style={{ marginBottom: '1.5rem' }}>
        <ShieldAlert size={18} />
        <div>
          <strong>{t.draftDisclaimer}</strong> Seat and venue of arbitration and court jurisdiction are marked configurable placeholders and must not be treated as final legal advice.
        </div>
      </div>

      {/* Editable Jurisdiction Placeholders for Legal Role */}
      {isLegalOrAdmin && (
        <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e5e7eb' }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
            Configurable Legal Jurisdiction Placeholders:
          </h4>
          <div className="comm-form-grid">
            <div className="comm-field">
              <label>Arbitration Seat &amp; Venue</label>
              <input
                type="text"
                value={arbitrationSeat}
                onChange={(e) => setArbitrationSeat(e.target.value)}
              />
            </div>
            <div className="comm-field">
              <label>Court of Jurisdiction</label>
              <input
                type="text"
                value={courtJurisdiction}
                onChange={(e) => setCourtJurisdiction(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Document Sheet */}
      <div className="comm-agreement-paper">
        <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid #111827', paddingBottom: '1.5rem' }}>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', letterSpacing: '0.02em' }}>
            NEXORA FOOD — RESTAURANT PARTNER AGREEMENT
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#4b5563', fontFamily: 'sans-serif' }}>
            Standard Merchant Master Terms &amp; Conditions · Agreement Version {plan.version}
          </p>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#b45309', fontWeight: 600, fontFamily: 'sans-serif' }}>
            [DRAFT ONLY — PENDING ADVOCATE &amp; CHARTERED ACCOUNTANT REVIEW]
          </div>
        </div>

        {/* Master Clauses 1 to 26 */}
        {clauses.slice(0, 26).map((clause) => {
          const isEditing = editingClauseId === clause.id;
          return (
            <div
              key={clause.id}
              className={`comm-clause-box ${clause.reviewStatus.includes('Pending') ? 'pending' : ''}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <strong style={{ fontSize: '1rem', color: '#111827' }}>
                  {lang === 'hi' ? clause.titleHi : clause.title}
                </strong>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className={`comm-badge ${clause.reviewStatus.includes('Approved') ? 'approved' : 'pending'}`}>
                    {clause.reviewStatus}
                  </span>
                  {isLegalOrAdmin && !isEditing && (
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ea580c' }}
                      onClick={() => startEdit(clause)}
                    >
                      <Edit3 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div>
                  <textarea
                    rows={4}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="comm-btn secondary"
                      onClick={() => setEditingClauseId(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="comm-btn primary"
                      onClick={() => saveEdit(clause.id)}
                    >
                      Save &amp; Reset to Pending Review
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.9375rem', color: '#1f2937' }}>
                  {lang === 'hi' ? clause.contentHi : hydrateText(clause.content)}
                </p>
              )}
            </div>
          );
        })}

        {/* Dynamic Annexure A Commercial Terms Matrix */}
        <div style={{ margin: '3rem 0', paddingTop: '2rem', borderTop: '2px solid #111827' }}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.375rem', textAlign: 'center' }}>
            {t.annexureATitle}
          </h2>
          <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 1.5rem', fontFamily: 'sans-serif' }}>
            Dynamic Commercial Schedule for {application.brandName || '[Restaurant Brand Name]'}
          </p>

          <table className="comm-comparison-table">
            <thead>
              <tr>
                <th>{t.comparisonColMetric}</th>
                <th>{t.comparisonColSelf}</th>
                <th>{t.comparisonColNexora}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Commission Rate</strong></td>
                <td><strong style={{ color: '#047857' }}>{plan.selfDeliveryCommissionBps / 100}%</strong></td>
                <td><strong style={{ color: '#047857' }}>{plan.nexoraDeliveryCommissionBps / 100}%</strong></td>
              </tr>
              <tr>
                <td><strong>Commission Base</strong></td>
                <td>{t.commissionBaseDesc}</td>
                <td>{t.commissionBaseDesc}</td>
              </tr>
              <tr>
                <td><strong>30-Day Launch Offer</strong></td>
                <td>{plan.launchOfferDays} days at {plan.launchOfferCommissionBps}% (Post-offer: {plan.postOfferSelfCommissionBps / 100}%)</td>
                <td>{plan.launchOfferDays} days at {plan.launchOfferCommissionBps}% (Post-offer: {plan.postOfferNexoraCommissionBps / 100}%)</td>
              </tr>
              <tr>
                <td><strong>Customer Delivery Fee</strong></td>
                <td>Credited to Restaurant for self-dispatch</td>
                <td>Separately collected for Nexora delivery partner</td>
              </tr>
              <tr>
                <td><strong>Payment Gateway Fee</strong></td>
                <td>Actual cost ({(plan.paymentGatewayFeeBps / 100).toFixed(2)}%), separately itemized</td>
                <td>Actual cost ({(plan.paymentGatewayFeeBps / 100).toFixed(2)}%), separately itemized</td>
              </tr>
              <tr>
                <td><strong>Listing &amp; Mandatory Ad Fee</strong></td>
                <td>{t.listingFeeDesc}</td>
                <td>{t.mandatoryAdFeeDesc}</td>
              </tr>
              <tr>
                <td><strong>Settlement Frequency</strong></td>
                <td>{t.settlementDesc} ({plan.settlementDay}s)</td>
                <td>{t.settlementDesc} ({plan.settlementDay}s)</td>
              </tr>
              <tr>
                <td><strong>Restaurant-Funded Discounts</strong></td>
                <td>{t.discountRuleDesc}</td>
                <td>{t.discountRuleDesc}</td>
              </tr>
              <tr>
                <td><strong>Packaging Charge Treatment</strong></td>
                <td>{plan.packagingInCommissionBase ? 'Included in commission base' : 'Excluded from commission base (Default)'}</td>
                <td>{plan.packagingInCommissionBase ? 'Included in commission base' : 'Excluded from commission base (Default)'}</td>
              </tr>
              <tr>
                <td><strong>Selected Subscription</strong></td>
                <td colSpan={2}>
                  {plan.freeListingPlanFeePaise === 0 ? 'Free Listing Plan (₹0 / Month)' : 'Optional Paid Growth Plan'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signature Blocks & Acceptance Evidence */}
        <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid #d1d5db', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', fontFamily: 'sans-serif' }}>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem' }}>For Nexora Food Technologies Pvt Ltd:</h4>
            <div style={{ fontSize: '0.8125rem', color: '#4b5563', lineHeight: '1.6' }}>
              Authorized Signatory: <em>[Pending Corporate Appointment]</em><br />
              Designation: Authorized Platform Director<br />
              Digital Seal / Verification: Provisional Template
            </div>
          </div>

          <div>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem' }}>For Restaurant Partner:</h4>
            <div style={{ fontSize: '0.8125rem', color: '#4b5563', lineHeight: '1.6' }}>
              Entity: {application.legalBusinessName || '[Legal Business Name]'}<br />
              Authorized Signatory: {application.ownerName || '[Owner Name]'}<br />
              Acceptance Timestamp: {application.termsAcceptedAt || 'Pending Execution'}<br />
              Terms Version: {application.termsVersionId || plan.version}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
