import React, { useState } from 'react';
import type { AgreementClause, LegalReviewStatus, UserRole } from '../../types/commercial';
import type { Language } from '../../locales/commercialTranslations';
import { translations } from '../../locales/commercialTranslations';
import {
  ShieldAlert,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  FileText,
  UserCheck,
  Check,
  X,
  MessageSquare,
} from 'lucide-react';

interface Props {
  lang: Language;
  clauses: AgreementClause[];
  onUpdateClauses: (updated: AgreementClause[]) => void;
  userRole: UserRole;
}

export default function LegalReviewWorkflow({ lang, clauses, onUpdateClauses, userRole }: Props) {
  const t = translations[lang];
  const [selectedClauseId, setSelectedClauseId] = useState<number>(clauses[0]?.id || 1);
  const [reviewerNameInput, setReviewerNameInput] = useState('Adv. Vikas Jain');
  const [designationInput, setDesignationInput] = useState('Advocate, High Court of Rajasthan');
  const [commentsInput, setCommentsInput] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const isLegalOrCaOrAdmin = ['super_admin', 'finance_admin', 'legal_reviewer'].includes(userRole);
  const activeClause = clauses.find((c) => c.id === selectedClauseId) || clauses[0];

  const handleStatusChange = (newStatus: LegalReviewStatus) => {
    const updated = clauses.map((c) => {
      if (c.id === selectedClauseId) {
        return {
          ...c,
          reviewStatus: newStatus,
          lastReviewedBy: `${reviewerNameInput} (${designationInput})`,
          lastReviewedDate: new Date().toISOString().split('T')[0],
          notes: commentsInput || c.notes,
        };
      }
      return c;
    });

    onUpdateClauses(updated);
    setToastMessage(`Clause #${selectedClauseId} marked "${newStatus}". Audit logged.`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  return (
    <div className="comm-panel">
      <div className="comm-panel-header">
        <div>
          <h2>{t.legalReviewTitle}</h2>
          <p className="comm-muted">{t.legalReviewSubtitle}</p>
        </div>
        <span className="comm-badge review">{t.legalSafetyBadge}</span>
      </div>

      <div className="comm-banner-disclaimer" style={{ marginBottom: '1.25rem' }}>
        <AlertTriangle size={18} />
        <div>
          <strong>Automatic Status Guard: </strong>
          {t.autoResetWarning} Any edit to contractual or tax provisions resets approval to pending.
        </div>
      </div>

      {toastMessage && (
        <div className="comm-banner-disclaimer" style={{ background: '#ecfdf5', color: '#065f46', borderLeftColor: '#10b981', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} />
          {toastMessage}
        </div>
      )}

      {/* Reviewer Credentials Strip */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
        <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
          Reviewer Credentials &amp; Professional Attribution
        </h4>
        <div className="comm-form-grid">
          <div className="comm-field">
            <label>{t.reviewerName}</label>
            <input
              type="text"
              disabled={!isLegalOrCaOrAdmin}
              value={reviewerNameInput}
              onChange={(e) => setReviewerNameInput(e.target.value)}
            />
          </div>
          <div className="comm-field">
            <label>{t.designation}</label>
            <input
              type="text"
              disabled={!isLegalOrCaOrAdmin}
              value={designationInput}
              onChange={(e) => setDesignationInput(e.target.value)}
              placeholder="e.g. FCA (Chartered Accountant) / Advocate"
            />
          </div>
          <div className="comm-field">
            <label>Review Notes / CA Opinion Reference</label>
            <input
              type="text"
              disabled={!isLegalOrCaOrAdmin}
              value={commentsInput}
              onChange={(e) => setCommentsInput(e.target.value)}
              placeholder="e.g. Verified against Sec 9(5) CGST Act & Sec 194-O"
            />
          </div>
        </div>
      </div>

      {/* Clause Selector & Details Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) 1fr', gap: '1.5rem' }}>
        {/* Clause List */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', maxHeight: '520px', overflowY: 'auto' }}>
          {clauses.map((c) => {
            const isSelected = c.id === selectedClauseId;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedClauseId(c.id)}
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  background: isSelected ? '#fff7ed' : '#ffffff',
                  borderLeft: isSelected ? '4px solid #ea580c' : '4px solid transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.8125rem', color: isSelected ? '#ea580c' : '#111827' }}>
                    {c.title}
                  </strong>
                  <span className={`comm-badge ${c.reviewStatus.includes('Approved') ? 'approved' : 'pending'}`}>
                    {c.requiresReview}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                  Status: {c.reviewStatus}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Clause Review Workbench */}
        <div className="comm-panel" style={{ border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem' }}>{activeClause.title}</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>
                Category: <strong>{activeClause.category}</strong> · Professional Review Needed:{' '}
                <strong>{activeClause.requiresReview}</strong>
              </p>
            </div>
            <span className={`comm-badge ${activeClause.reviewStatus.includes('Approved') ? 'approved' : 'pending'}`}>
              {activeClause.reviewStatus}
            </span>
          </div>

          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '6px', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '1.25rem', border: '1px solid #e5e7eb' }}>
            {activeClause.content}
          </div>

          {activeClause.lastReviewedBy && (
            <div style={{ fontSize: '0.8125rem', color: '#047857', marginBottom: '1.25rem', background: '#ecfdf5', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
              <UserCheck size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Reviewed by <strong>{activeClause.lastReviewedBy}</strong> on{' '}
              <strong>{activeClause.lastReviewedDate}</strong>.
              {activeClause.notes && <div>Notes: {activeClause.notes}</div>}
            </div>
          )}

          {/* Action Buttons for Authorized Reviewer */}
          {isLegalOrCaOrAdmin ? (
            <div className="comm-btn-group">
              <button
                type="button"
                className="comm-btn success"
                onClick={() => handleStatusChange('Approved for internal use')}
              >
                <Check size={14} /> {t.approveClause}
              </button>
              <button
                type="button"
                className="comm-btn secondary"
                style={{ color: '#b91c1c' }}
                onClick={() => handleStatusChange('Changes requested')}
              >
                <X size={14} /> {t.requestChanges}
              </button>
              <button
                type="button"
                className="comm-btn secondary"
                onClick={() => handleStatusChange('Pending lawyer review')}
              >
                <Clock size={14} /> Mark Pending Lawyer Review
              </button>
              <button
                type="button"
                className="comm-btn secondary"
                onClick={() => handleStatusChange('Pending CA review')}
              >
                <Clock size={14} /> Mark Pending CA Review
              </button>
            </div>
          ) : (
            <div style={{ fontSize: '0.8125rem', color: '#6b7280', fontStyle: 'italic' }}>
              Sign-off actions are restricted to Legal Reviewers, Finance Admins, and Super Admins.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
