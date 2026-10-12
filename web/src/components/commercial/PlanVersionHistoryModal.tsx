import React, { useState } from 'react';
import type { PlanVersionRecord, UserRole } from '../../types/commercial';
import type { Language } from '../../locales/commercialTranslations';
import {
  X,
  History,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Download,
  Search,
  Filter,
  UserCheck,
  FileText,
  Lock,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  versions: PlanVersionRecord[];
  activePlanId: string;
  lang: Language;
}

export default function PlanVersionHistoryModal({
  isOpen,
  onClose,
  versions,
  activePlanId,
  lang,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'approved' | 'superseded' | 'draft'>('all');

  if (!isOpen) return null;

  // Filter versions by plan ID or show all if search is active
  const filtered = versions.filter((v) => {
    const matchesPlan = searchTerm ? true : v.planId === activePlanId;
    const matchesSearch =
      v.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.changeSummary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.reviewedByCa && v.reviewedByCa.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (v.reviewedByLawyer && v.reviewedByLawyer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      v.changedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesPlan && matchesSearch && matchesStatus;
  });

  const exportAuditCsv = () => {
    const headers = [
      'Version',
      'Plan Name',
      'Status',
      'Effective Date',
      'Self-Delivery Commission (%)',
      'Nexora Fleet Commission (%)',
      'Launch Offer Days',
      'Payment Gateway Fee (Bps)',
      'Modified By',
      'Role',
      'CA Reviewer',
      'CA Designation',
      'Legal Reviewer',
      'Legal Designation',
      'Approval Timestamp (IST)',
      'Change Summary',
      'Audit Verification Hash',
    ];

    const rows = versions.map((v) => [
      `"${v.version}"`,
      `"${v.name}"`,
      v.status,
      v.effectiveDate,
      (v.selfDeliveryCommissionBps / 100).toFixed(2),
      (v.nexoraDeliveryCommissionBps / 100).toFixed(2),
      v.launchOfferDays,
      v.paymentGatewayFeeBps,
      `"${v.changedBy}"`,
      v.changedByRole,
      `"${v.reviewedByCa || 'N/A'}"`,
      `"${v.reviewedByCaDesignation || 'N/A'}"`,
      `"${v.reviewedByLawyer || 'N/A'}"`,
      `"${v.reviewedByLawyerDesignation || 'N/A'}"`,
      `"${v.approvalTimestamp ? new Date(v.approvalTimestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Pending'}"`,
      `"${v.changeSummary.replace(/"/g, '""')}"`,
      `"${v.auditHash}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Nexora_Commercial_Rate_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section
        className="modal wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-modal-title"
        style={{ maxWidth: '980px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={20} color="#ea580c" />
              <h2 id="audit-modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                Commercial Rate Audit Trail &amp; Version History
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>
              Immutable audit log of commercial rate updates, reviewer attestations, and statutory approvals.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="comm-btn secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
              onClick={exportAuditCsv}
            >
              <Download size={13} /> Export Audit Log (CSV)
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Close version history modal"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Legal Safety Notice Banner */}
        <div className="comm-banner-disclaimer" style={{ margin: '1rem 0' }}>
          <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.8125rem' }}>
            <strong>Legal Audit Trail Compliance: </strong>
            In accordance with Indian commercial contract governance, all rate modifications are versioned with reviewer identity, timestamp, and audit hashes. Revisions do not automatically publish or bind existing restaurant partners without recorded acceptance.
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              placeholder="Search by version, reviewer name, or summary..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.75rem', fontSize: '0.8125rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {(['all', 'active', 'approved', 'superseded', 'draft'] as const).map((st) => (
              <button
                key={st}
                type="button"
                className={`comm-btn ${statusFilter === st ? 'primary' : 'secondary'}`}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem', textTransform: 'capitalize' }}
                onClick={() => setStatusFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline of Plan Versions */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              No commercial plan versions match your search criteria.
            </div>
          ) : (
            filtered.map((ver) => (
              <div
                key={ver.id}
                style={{
                  background: '#ffffff',
                  border: ver.status === 'active' ? '2px solid #10b981' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                {/* Top Row: Version Badge, Plan Name, Status */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.9375rem',
                        background: '#f3f4f6',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        color: '#111827',
                      }}
                    >
                      v{ver.version}
                    </span>
                    <strong style={{ fontSize: '1rem', color: '#111827' }}>{ver.name}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`comm-badge ${ver.status}`}>
                      {ver.status}
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                      Effective: <strong>{ver.effectiveDate}</strong>
                    </span>
                  </div>
                </div>

                {/* Rate Metrics Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '0.5rem',
                    background: '#f9fafb',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    marginBottom: '0.75rem',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div>
                    <span style={{ color: '#6b7280' }}>Self-Delivery:</span>{' '}
                    <strong style={{ color: '#047857' }}>{(ver.selfDeliveryCommissionBps / 100).toFixed(2)}%</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>Nexora Fleet:</span>{' '}
                    <strong style={{ color: '#047857' }}>{(ver.nexoraDeliveryCommissionBps / 100).toFixed(2)}%</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>Launch Offer:</span>{' '}
                    <strong>{ver.launchOfferDays} Days (0%)</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>Payment Gateway:</span>{' '}
                    <strong>{(ver.paymentGatewayFeeBps / 100).toFixed(2)}% Actual</strong>
                  </div>
                </div>

                {/* Change Summary */}
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#374151', lineHeight: '1.5' }}>
                  <strong>Change Description: </strong>
                  {ver.changeSummary}
                </p>

                {/* Reviewer Attestations Strip */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '0.75rem',
                    borderTop: '1px solid #f3f4f6',
                    paddingTop: '0.75rem',
                    fontSize: '0.75rem',
                    color: '#4b5563',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <UserCheck size={13} color="#047857" /> CA Review Sign-Off:
                    </div>
                    {ver.reviewedByCa ? (
                      <div>
                        {ver.reviewedByCa} · <em>{ver.reviewedByCaDesignation}</em>
                      </div>
                    ) : (
                      <span style={{ color: '#b45309' }}>Pending CA Formal Review</span>
                    )}
                  </div>

                  <div>
                    <div style={{ fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <UserCheck size={13} color="#047857" /> Legal / Advocate Review:
                    </div>
                    {ver.reviewedByLawyer ? (
                      <div>
                        {ver.reviewedByLawyer} · <em>{ver.reviewedByLawyerDesignation}</em>
                      </div>
                    ) : (
                      <span style={{ color: '#b45309' }}>Pending Legal Counsel Review</span>
                    )}
                  </div>

                  <div>
                    <div style={{ fontWeight: 600, color: '#111827' }}>Recorded Modifier:</div>
                    <div>
                      {ver.changedBy} (<span style={{ textTransform: 'capitalize' }}>{ver.changedByRole.replace('_', ' ')}</span>)
                    </div>
                    <div style={{ color: '#6b7280' }}>
                      {ver.approvalTimestamp
                        ? new Date(ver.approvalTimestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                        : 'Draft Stage'}
                    </div>
                  </div>
                </div>

                {/* Immutable Audit Hash */}
                <div
                  style={{
                    marginTop: '0.5rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px dashed #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.6875rem',
                    color: '#6b7280',
                    fontFamily: 'monospace',
                  }}
                >
                  <span>
                    <Lock size={10} style={{ display: 'inline', marginRight: '3px' }} />
                    Audit Hash: {ver.auditHash}
                  </span>
                  <span>Timezone: Asia/Kolkata (IST)</span>
                </div>
              </div>
            ))
          )}
        </div>

        <footer style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="comm-btn secondary" onClick={onClose}>
            Close Audit Trail
          </button>
        </footer>
      </section>
    </div>
  );
}
