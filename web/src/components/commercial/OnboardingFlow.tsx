import React, { useState } from 'react';
import type {
  RestaurantApplication,
  OnboardingStep,
  EntityType,
  DeliveryModel,
  UserRole,
} from '../../types/commercial';
import type { Language } from '../../locales/commercialTranslations';
import { translations } from '../../locales/commercialTranslations';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Building2,
  UtensilsCrossed,
  ArrowRight,
  ArrowLeft,
  Save,
  Send,
  FileCheck,
} from 'lucide-react';

interface Props {
  lang: Language;
  application: RestaurantApplication;
  onSaveApplication: (app: RestaurantApplication) => void;
  userRole: UserRole;
}

export default function OnboardingFlow({ lang, application, onSaveApplication, userRole }: Props) {
  const t = translations[lang];
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('business_info');
  const [formData, setFormData] = useState<RestaurantApplication>(application);
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [exceptionReasonInput, setExceptionReasonInput] = useState('');
  const [saveToast, setSaveToast] = useState('');

  const triggerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(''), 3500);
  };

  const updateField = <K extends keyof RestaurantApplication>(field: K, value: RestaurantApplication[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDocumentUpload = (kind: RestaurantApplication['documents'][number]['kind']) => {
    // Simulate interactive document upload
    const mockFiles: Record<string, string> = {
      pan: 'pan_card_verified.pdf',
      fssai: 'fssai_license_2026.pdf',
      gst: 'gst_registration_certificate.pdf',
      bank_proof: 'cancelled_cheque_hdfc.pdf',
      owner_id: 'owner_aadhaar_card.pdf',
      signed_agreement: 'nexora_partner_agreement_signed.pdf',
    };

    const existingIndex = formData.documents.findIndex((d) => d.kind === kind);
    const newDoc = {
      id: 'doc-' + Date.now(),
      kind,
      fileName: mockFiles[kind] || 'document.pdf',
      fileSize: 245000,
      uploadedAt: new Date().toISOString().split('T')[0],
      verified: true,
      expiryDate: kind === 'fssai' ? formData.fssaiExpiryDate || '2027-12-31' : undefined,
    };

    let updatedDocs = [...formData.documents];
    if (existingIndex >= 0) {
      updatedDocs[existingIndex] = newDoc;
    } else {
      updatedDocs.push(newDoc);
    }

    const updated = {
      ...formData,
      documents: updatedDocs,
      updatedAt: new Date().toISOString(),
    };
    setFormData(updated);
    onSaveApplication(updated);
    triggerToast(`Document (${kind.toUpperCase()}) uploaded and recorded.`);
  };

  const handleSaveDraft = () => {
    onSaveApplication(formData);
    triggerToast('Onboarding progress saved as draft.');
  };

  const handleSubmitApplication = () => {
    // Validation
    if (!formData.legalBusinessName || !formData.brandName || !formData.pan || !formData.fssaiNumber) {
      alert('Please fill all mandatory fields (Legal name, Brand, PAN, FSSAI) before submitting.');
      return;
    }
    if (!formData.privacyAccepted || !formData.termsAccepted) {
      alert('Please accept the Privacy Policy and Commercial Terms in Step 3.');
      return;
    }

    const updated: RestaurantApplication = {
      ...formData,
      status: 'Submitted',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setFormData(updated);
    onSaveApplication(updated);
    triggerToast('Application submitted successfully for verification!');
  };

  const handleGrantException = () => {
    if (!exceptionReasonInput.trim()) {
      alert('Please provide a documented justification for the administrative exception.');
      return;
    }
    const updated: RestaurantApplication = {
      ...formData,
      status: 'Approved',
      exceptionReason: exceptionReasonInput.trim(),
      exceptionGrantedBy: `Authorized Admin (${userRole})`,
      updatedAt: new Date().toISOString(),
    };
    setFormData(updated);
    onSaveApplication(updated);
    setExceptionModalOpen(false);
    triggerToast('Administrative exception granted and recorded.');
  };

  // Document checklist statuses
  const docPan = formData.documents.find((d) => d.kind === 'pan');
  const docFssai = formData.documents.find((d) => d.kind === 'fssai');
  const docBank = formData.documents.find((d) => d.kind === 'bank_proof');
  const docOwnerId = formData.documents.find((d) => d.kind === 'owner_id');

  const allMandatoryDocsUploaded = Boolean(docPan && docFssai && docBank && docOwnerId);

  return (
    <div className="comm-panel">
      {saveToast && (
        <div className="comm-banner-disclaimer" style={{ background: '#ecfdf5', color: '#065f46', borderLeftColor: '#10b981', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} />
          {saveToast}
        </div>
      )}

      {/* Header and Step Tracker */}
      <div className="comm-panel-header">
        <div>
          <h2>{t.tabOnboarding}</h2>
          <p className="comm-muted">
            {formData.brandName || 'New Restaurant Partner'} · Status:{' '}
            <span className={`comm-badge ${formData.status.toLowerCase().replace(/\s+/g, '')}`}>
              {formData.status}
            </span>
          </p>
        </div>
        <div className="comm-btn-group">
          <button type="button" className="comm-btn secondary" onClick={handleSaveDraft}>
            <Save size={14} /> {t.saveDraft}
          </button>
          {['super_admin', 'restaurant_onboarding_staff'].includes(userRole) && (
            <button
              type="button"
              className="comm-btn secondary"
              style={{ color: '#b45309' }}
              onClick={() => setExceptionModalOpen(true)}
            >
              <ShieldCheck size={14} /> {t.grantException}
            </button>
          )}
        </div>
      </div>

      {/* Step Buttons */}
      <div className="comm-tabs-nav" style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          className={`comm-tab-btn ${currentStep === 'business_info' ? 'active' : ''}`}
          onClick={() => setCurrentStep('business_info')}
        >
          <Building2 size={16} /> {t.step1Title}
        </button>
        <button
          type="button"
          className={`comm-tab-btn ${currentStep === 'operations' ? 'active' : ''}`}
          onClick={() => setCurrentStep('operations')}
        >
          <UtensilsCrossed size={16} /> {t.step2Title}
        </button>
        <button
          type="button"
          className={`comm-tab-btn ${currentStep === 'compliance_consent' ? 'active' : ''}`}
          onClick={() => setCurrentStep('compliance_consent')}
        >
          <FileCheck size={16} /> {t.step3Title}
        </button>
      </div>

      {/* STEP A: Business & Owner Information */}
      {currentStep === 'business_info' && (
        <div>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1.25rem' }}>{t.step1Title}</h3>
          <div className="comm-form-grid">
            <div className="comm-field">
              <label>{t.legalName} *</label>
              <input
                type="text"
                required
                value={formData.legalBusinessName}
                onChange={(e) => updateField('legalBusinessName', e.target.value)}
                placeholder="e.g. Royal Rajputana Hospitality Pvt Ltd"
              />
            </div>

            <div className="comm-field">
              <label>{t.brandName} *</label>
              <input
                type="text"
                required
                value={formData.brandName}
                onChange={(e) => updateField('brandName', e.target.value)}
                placeholder="e.g. Royal Kitchen"
              />
            </div>

            <div className="comm-field">
              <label>{t.entityType} *</label>
              <select
                value={formData.entityType}
                onChange={(e) => updateField('entityType', e.target.value as EntityType)}
              >
                <option value="Sole Proprietorship">Sole Proprietorship</option>
                <option value="Partnership Firm">Partnership Firm</option>
                <option value="Limited Liability Partnership (LLP)">Limited Liability Partnership (LLP)</option>
                <option value="Private Limited Company">Private Limited Company</option>
                <option value="Public Limited Company">Public Limited Company</option>
                <option value="One Person Company">One Person Company</option>
              </select>
            </div>

            <div className="comm-field">
              <label>{t.ownerName} *</label>
              <input
                type="text"
                required
                value={formData.ownerName}
                onChange={(e) => updateField('ownerName', e.target.value)}
                placeholder="Full Legal Name"
              />
            </div>

            <div className="comm-field">
              <label>{t.mobile} *</label>
              <input
                type="tel"
                required
                pattern="[6-9][0-9]{9}"
                value={formData.mobile}
                onChange={(e) => updateField('mobile', e.target.value)}
                placeholder="10-digit Indian Mobile"
              />
            </div>

            <div className="comm-field">
              <label>{t.email} *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="partner@restaurant.com"
              />
            </div>

            <div className="comm-field">
              <label>{t.regAddress} *</label>
              <input
                type="text"
                required
                value={formData.registeredAddress}
                onChange={(e) => updateField('registeredAddress', e.target.value)}
                placeholder="Registered Office Address"
              />
            </div>

            <div className="comm-field">
              <label>{t.kitchenAddress} *</label>
              <input
                type="text"
                required
                value={formData.kitchenAddress}
                onChange={(e) => updateField('kitchenAddress', e.target.value)}
                placeholder="Physical Kitchen Address"
              />
            </div>

            <div className="comm-field">
              <label>{t.city} / {t.state} / {t.pincode} *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="Jaipur"
                />
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  placeholder="Rajasthan"
                />
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => updateField('pincode', e.target.value)}
                  placeholder="302001"
                />
              </div>
            </div>

            <div className="comm-field">
              <label>{t.serviceArea} *</label>
              <input
                type="text"
                required
                value={formData.serviceArea}
                onChange={(e) => updateField('serviceArea', e.target.value)}
                placeholder="e.g. C-Scheme / Raja Park"
              />
            </div>

            <div className="comm-field">
              <label>{t.pan} *</label>
              <input
                type="text"
                required
                maxLength={10}
                style={{ textTransform: 'uppercase' }}
                value={formData.pan}
                onChange={(e) => updateField('pan', e.target.value.toUpperCase())}
                placeholder="AAAAA9999A"
              />
            </div>

            <div className="comm-field">
              <label>{t.gstin}</label>
              <input
                type="text"
                maxLength={15}
                style={{ textTransform: 'uppercase' }}
                value={formData.gstin || ''}
                onChange={(e) => updateField('gstin', e.target.value.toUpperCase())}
                placeholder="08AAAAA9999A1Z5"
              />
              <small>Optional for entities under composition or threshold</small>
            </div>

            <div className="comm-field">
              <label>{t.fssaiNumber} *</label>
              <input
                type="text"
                required
                maxLength={14}
                value={formData.fssaiNumber}
                onChange={(e) => updateField('fssaiNumber', e.target.value)}
                placeholder="14-digit FSSAI number"
              />
            </div>

            <div className="comm-field">
              <label>{t.fssaiType} *</label>
              <select
                value={formData.fssaiType}
                onChange={(e) => updateField('fssaiType', e.target.value as RestaurantApplication['fssaiType'])}
              >
                <option value="Registration">Registration (Annual Turnover &lt; ₹12L)</option>
                <option value="State License">State License (Turnover ₹12L - ₹20Cr)</option>
                <option value="Central License">Central License (Large / Multi-state)</option>
              </select>
            </div>

            <div className="comm-field">
              <label>{t.fssaiIssueDate} &amp; {t.fssaiExpiryDate} *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input
                  type="date"
                  value={formData.fssaiIssueDate}
                  onChange={(e) => updateField('fssaiIssueDate', e.target.value)}
                />
                <input
                  type="date"
                  value={formData.fssaiExpiryDate}
                  onChange={(e) => updateField('fssaiExpiryDate', e.target.value)}
                />
              </div>
            </div>

            <div className="comm-field">
              <label>{t.bankHolder} *</label>
              <input
                type="text"
                required
                value={formData.bankAccountHolder}
                onChange={(e) => updateField('bankAccountHolder', e.target.value)}
                placeholder="Name as per Bank Record"
              />
            </div>

            <div className="comm-field">
              <label>{t.bankAccount} *</label>
              <input
                type="text"
                required
                value={formData.bankAccountNumber}
                onChange={(e) => updateField('bankAccountNumber', e.target.value)}
                placeholder="Account Number"
              />
            </div>

            <div className="comm-field">
              <label>{t.bankIfsc} *</label>
              <input
                type="text"
                required
                maxLength={11}
                style={{ textTransform: 'uppercase' }}
                value={formData.bankIfsc}
                onChange={(e) => updateField('bankIfsc', e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0000054"
              />
            </div>
          </div>

          {/* Document Uploads Sub-Section */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
            <h4 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: 600 }}>
              Mandatory Compliance Document Uploads
            </h4>
            <div className="comm-form-grid">
              {[
                { kind: 'pan' as const, label: t.uploadPan, req: true, doc: docPan },
                { kind: 'fssai' as const, label: t.uploadFssai, req: true, doc: docFssai },
                { kind: 'bank_proof' as const, label: t.uploadCheque, req: true, doc: docBank },
                { kind: 'owner_id' as const, label: t.uploadOwnerId, req: true, doc: docOwnerId },
                {
                  kind: 'gst' as const,
                  label: t.uploadGst,
                  req: false,
                  doc: formData.documents.find((d) => d.kind === 'gst'),
                },
              ].map((item) => (
                <div
                  key={item.kind}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '1rem',
                    background: item.doc ? '#f0fdf4' : '#fafafa',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.875rem' }}>{item.label}</strong>
                    {item.doc ? (
                      <span className="comm-badge approved">{t.documentUploaded}</span>
                    ) : item.req ? (
                      <span className="comm-badge rejected">{t.documentMissing}</span>
                    ) : (
                      <span className="comm-badge draft">Optional</span>
                    )}
                  </div>
                  {item.doc ? (
                    <div style={{ fontSize: '0.8125rem', marginTop: '0.5rem', color: '#166534' }}>
                      <FileText size={14} style={{ display: 'inline', marginRight: '4px' }} />
                      {item.doc.fileName}
                      {item.doc.expiryDate && (
                        <div style={{ color: '#b45309', fontSize: '0.75rem', marginTop: '2px' }}>
                          Expires: {item.doc.expiryDate}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="comm-btn secondary"
                      style={{ marginTop: '0.75rem', width: '100%', fontSize: '0.8125rem' }}
                      onClick={() => handleDocumentUpload(item.kind)}
                    >
                      <UploadCloud size={14} /> {t.uploadAction}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="comm-btn primary"
              onClick={() => setCurrentStep('operations')}
            >
              Continue to Step 2: Operations <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP B: Kitchen Operations */}
      {currentStep === 'operations' && (
        <div>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1.25rem' }}>{t.step2Title}</h3>
          <div className="comm-form-grid">
            <div className="comm-field">
              <label>{t.cuisines}</label>
              <input
                type="text"
                value={formData.cuisines.join(', ')}
                onChange={(e) =>
                  updateField(
                    'cuisines',
                    e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                  )
                }
                placeholder="e.g. North Indian, Biryani, Mughlai"
              />
              <small>Comma-separated food genres</small>
            </div>

            <div className="comm-field">
              <label>{t.openingHours}</label>
              <input
                type="text"
                value={formData.openingHours}
                onChange={(e) => updateField('openingHours', e.target.value)}
                placeholder="e.g. 11:00 AM - 11:30 PM"
              />
            </div>

            <div className="comm-field">
              <label>{t.prepTime}</label>
              <input
                type="number"
                min="5"
                max="90"
                value={formData.prepTimeMin}
                onChange={(e) => updateField('prepTimeMin', Number(e.target.value) || 20)}
              />
              <small>Average minutes needed to prepare and package a meal</small>
            </div>

            <div className="comm-field">
              <label>{t.acceptanceWindow}</label>
              <input
                type="number"
                min="30"
                max="300"
                value={formData.acceptanceWindowSec}
                onChange={(e) => updateField('acceptanceWindowSec', Number(e.target.value) || 90)}
              />
              <small>Time before automatic kitchen alert</small>
            </div>

            <div className="comm-field">
              <label>{t.deliveryModel} *</label>
              <select
                value={formData.deliveryModel}
                onChange={(e) => updateField('deliveryModel', e.target.value as DeliveryModel)}
              >
                <option value="self_delivery">{t.selfDelivery}</option>
                <option value="nexora_delivery">{t.nexoraDelivery}</option>
                <option value="hybrid">{t.hybridDelivery}</option>
              </select>
            </div>

            <div className="comm-field">
              <label>{t.emergencyContact} *</label>
              <input
                type="tel"
                value={formData.emergencyContact}
                onChange={(e) => updateField('emergencyContact', e.target.value)}
                placeholder="Direct Kitchen Escalation Phone"
              />
            </div>

            <div className="comm-field" style={{ gridColumn: 'span 2' }}>
              <label>{t.packagingCapability}</label>
              <textarea
                rows={2}
                value={formData.packagingCapability}
                onChange={(e) => updateField('packagingCapability', e.target.value)}
                placeholder="e.g. Tamper-evident branded paper boxes, spill-proof curry containers"
              />
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
            <button
              type="button"
              className="comm-btn secondary"
              onClick={() => setCurrentStep('business_info')}
            >
              <ArrowLeft size={14} /> Back to Step 1
            </button>
            <button
              type="button"
              className="comm-btn primary"
              onClick={() => setCurrentStep('compliance_consent')}
            >
              Continue to Step 3: Consent <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP C: Compliance and Consent */}
      {currentStep === 'compliance_consent' && (
        <div>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1.25rem' }}>{t.step3Title}</h3>

          <div
            style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9375rem', fontWeight: 600 }}>
              {t.checklistTitle}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {docPan ? <CheckCircle2 size={16} color="#166534" /> : <AlertCircle size={16} color="#dc2626" />}
                <span>PAN Card Uploaded &amp; Validated</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {docFssai ? <CheckCircle2 size={16} color="#166534" /> : <AlertCircle size={16} color="#dc2626" />}
                <span>Active FSSAI License ({formData.fssaiExpiryDate ? `Valid until ${formData.fssaiExpiryDate}` : 'Required'})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {docBank ? <CheckCircle2 size={16} color="#166534" /> : <AlertCircle size={16} color="#dc2626" />}
                <span>Bank Verification (Cancelled Cheque / Passbook)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {docOwnerId ? <CheckCircle2 size={16} color="#166534" /> : <AlertCircle size={16} color="#dc2626" />}
                <span>Owner Aadhaar / Official Identification</span>
              </div>
            </div>
          </div>

          {/* Consents */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.privacyAccepted}
                onChange={(e) => updateField('privacyAccepted', e.target.checked)}
                style={{ marginTop: '3px' }}
              />
              <span style={{ fontSize: '0.875rem' }}>{t.privacyNotice}</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.termsAccepted}
                onChange={(e) => {
                  updateField('termsAccepted', e.target.checked);
                  if (e.target.checked) {
                    updateField('termsAcceptedAt', new Date().toISOString());
                    updateField('termsVersionId', '1.0.0-PROPOSED');
                  }
                }}
                style={{ marginTop: '3px' }}
              />
              <span style={{ fontSize: '0.875rem' }}>
                <strong>{t.commercialTermsAcceptance}</strong>
                <br />
                <small style={{ color: '#6b7280' }}>
                  Commission Rate: {formData.deliveryModel === 'self_delivery' ? '8% Self' : '12% Nexora'} · First 30 Days: 0% Launch Offer.
                </small>
              </span>
            </label>
          </div>

          {formData.exceptionReason && (
            <div className="comm-banner-disclaimer" style={{ marginBottom: '1.5rem' }}>
              <ShieldCheck size={16} />
              <div>
                <strong>{t.adminExceptionNotice}</strong>
                <div>Reason: {formData.exceptionReason}</div>
                <small>Granted By: {formData.exceptionGrantedBy}</small>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="comm-btn secondary"
              onClick={() => setCurrentStep('operations')}
            >
              <ArrowLeft size={14} /> Back to Step 2
            </button>
            <button
              type="button"
              className="comm-btn primary"
              disabled={!allMandatoryDocsUploaded && !formData.exceptionReason}
              onClick={handleSubmitApplication}
            >
              <Send size={14} /> {t.submitApplication}
            </button>
          </div>
        </div>
      )}

      {/* Administrative Exception Modal */}
      {exceptionModalOpen && (
        <div className="modal-backdrop">
          <div className="comm-panel" style={{ maxWidth: '520px', width: '90%' }}>
            <div className="comm-panel-header">
              <h3>Admin Compliance Exception Override</h3>
              <button
                type="button"
                className="icon-button"
                onClick={() => setExceptionModalOpen(false)}
              >
                ×
              </button>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>
              As an authorized admin, you may grant a provisional onboarding approval even if specific secondary documents are pending renewal. An audit record will be logged with your timestamp.
            </p>
            <div className="comm-field" style={{ margin: '1rem 0' }}>
              <label>Documented Justification &amp; Grace Period</label>
              <textarea
                rows={3}
                required
                value={exceptionReasonInput}
                onChange={(e) => setExceptionReasonInput(e.target.value)}
                placeholder="e.g. FSSAI renewal receipt submitted; granted 14 days grace period."
              />
            </div>
            <div className="comm-btn-group" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="comm-btn secondary"
                onClick={() => setExceptionModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="comm-btn success"
                onClick={handleGrantException}
              >
                Record Exception &amp; Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
