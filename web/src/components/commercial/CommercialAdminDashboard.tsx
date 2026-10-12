import React, { useState } from 'react';
import type {
  RestaurantApplication,
  SettlementStatement,
  DisputeTicket,
  CommercialAuditLog,
  CommercialPlanConfig,
  UserRole,
} from '../../types/commercial';
import type { Language } from '../../locales/commercialTranslations';
import { translations } from '../../locales/commercialTranslations';
import { formatPaise } from '../../services/commercialCalculator';
import {
  FileSpreadsheet,
  CheckCircle,
  Clock,
  ShieldCheck,
  TrendingUp,
  Download,
  Search,
  Filter,
  Check,
  X,
  History,
} from 'lucide-react';

interface Props {
  lang: Language;
  applications: RestaurantApplication[];
  statements: SettlementStatement[];
  disputes: DisputeTicket[];
  auditLogs: CommercialAuditLog[];
  activePlan: CommercialPlanConfig;
  userRole: UserRole;
  onUpdateApplicationStatus: (appId: string, status: RestaurantApplication['status']) => void;
  onResolveDispute: (disputeId: string, notes: string) => void;
  onReconcileSettlement: (statementId: string, utr: string) => void;
}

export default function CommercialAdminDashboard({
  lang,
  applications,
  statements,
  disputes,
  auditLogs,
  activePlan,
  userRole,
  onUpdateApplicationStatus,
  onResolveDispute,
  onReconcileSettlement,
}: Props) {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pipeline' | 'settlements' | 'disputes' | 'audit'>('pipeline');
  const [utrInput, setUtrInput] = useState<Record<string, string>>({});
  const [resolutionInput, setResolutionInput] = useState<Record<string, string>>({});

  const filteredApps = applications.filter(
    (a) =>
      a.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.legalBusinessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalFoodGross = statements.reduce((sum, s) => sum + s.grossFoodValuePaise, 0);
  const totalCommission = statements.reduce((sum, s) => sum + s.commissionDeductedPaise, 0);
  const totalDisbursed = statements.reduce((sum, s) => sum + s.netPayablePaise, 0);

  // CSV Export for Authorized Roles
  const exportCsv = () => {
    const headers = [
      'Statement Number',
      'Restaurant Name',
      'Cycle Period',
      'Orders Count',
      'Gross Food Value (Paise)',
      'Commission (Paise)',
      'Gateway Fee (Paise)',
      'Refunds (Paise)',
      'Net Payable (Paise)',
      'Status',
      'UTR Reference',
    ];

    const rows = statements.map((s) => [
      s.statementNumber,
      `"${s.restaurantName}"`,
      `"${s.cyclePeriod}"`,
      s.grossOrdersCount,
      s.grossFoodValuePaise,
      s.commissionDeductedPaise,
      s.gatewayFeeDeductedPaise,
      s.refundsAdjustedPaise,
      s.netPayablePaise,
      s.status,
      s.utrReference || 'PENDING',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Nexora_Settlements_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="comm-panel">
      <div className="comm-panel-header">
        <div>
          <h2>{t.adminTitle}</h2>
          <p className="comm-muted">{t.adminSubtitle}</p>
        </div>
        <div className="comm-btn-group">
          {['super_admin', 'finance_admin'].includes(userRole) && (
            <button type="button" className="comm-btn primary" onClick={exportCsv}>
              <Download size={14} /> {t.exportCsv}
            </button>
          )}
        </div>
      </div>

      {/* Aggregate Financial Metrics */}
      <div className="comm-stat-summary" style={{ marginBottom: '1.5rem' }}>
        <div className="comm-stat-card">
          <span>Total Gross Food GMV</span>
          <strong>{formatPaise(totalFoodGross)}</strong>
          <small>Across verified platform partners</small>
        </div>
        <div className="comm-stat-card highlight">
          <span>Total Commission Realized</span>
          <strong>{formatPaise(totalCommission)}</strong>
          <small>Net Nexora marketplace earnings</small>
        </div>
        <div className="comm-stat-card">
          <span>Net Partner Payouts Disbursed</span>
          <strong>{formatPaise(totalDisbursed)}</strong>
          <small>Disbursed via automated NEFT/RTGS</small>
        </div>
        <div className="comm-stat-card">
          <span>Pending Document Audits</span>
          <strong style={{ color: '#d97706' }}>
            {applications.filter((a) => a.status === 'Under Review' || a.status === 'Submitted').length}
          </strong>
          <small>Awaiting onboarding verification</small>
        </div>
      </div>

      {/* Admin Tab Selector */}
      <div className="comm-tabs-nav" style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          className={`comm-tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('pipeline')}
        >
          Restaurant Onboarding Pipeline ({applications.length})
        </button>
        <button
          type="button"
          className={`comm-tab-btn ${activeTab === 'settlements' ? 'active' : ''}`}
          onClick={() => setActiveTab('settlements')}
        >
          Settlement Reconciliation ({statements.length})
        </button>
        <button
          type="button"
          className={`comm-tab-btn ${activeTab === 'disputes' ? 'active' : ''}`}
          onClick={() => setActiveTab('disputes')}
        >
          Dispute Queue ({disputes.filter((d) => d.status !== 'Resolved').length} Open)
        </button>
        <button
          type="button"
          className={`comm-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          Commercial Audit Trail
        </button>
      </div>

      {/* Tab 1: Onboarding Pipeline */}
      {activeTab === 'pipeline' && (
        <div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
              <input
                type="text"
                placeholder="Search by restaurant, legal name, or area..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="comm-comparison-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Brand &amp; Legal Entity</th>
                  <th>Location</th>
                  <th>Entity Type</th>
                  <th>FSSAI Expiry</th>
                  <th>Delivery Model</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.brandName}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{a.legalBusinessName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>PAN: {a.pan}</div>
                    </td>
                    <td>
                      {a.serviceArea}, {a.city}
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>PIN: {a.pincode}</div>
                    </td>
                    <td>{a.entityType}</td>
                    <td>
                      <span style={{ color: '#b45309' }}>{a.fssaiExpiryDate || 'Not specified'}</span>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize' }}>
                        {a.deliveryModel.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`comm-badge ${a.status.toLowerCase().replace(/\s+/g, '')}`}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {a.status !== 'Approved' && (
                          <button
                            type="button"
                            className="comm-btn success"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => onUpdateApplicationStatus(a.id, 'Approved')}
                          >
                            <Check size={12} /> Approve
                          </button>
                        )}
                        {a.status !== 'Rejected' && (
                          <button
                            type="button"
                            className="comm-btn secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#b91c1c' }}
                            onClick={() => onUpdateApplicationStatus(a.id, 'Rejected')}
                          >
                            <X size={12} /> Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Settlement Reconciliation */}
      {activeTab === 'settlements' && (
        <div style={{ overflowX: 'auto' }}>
          <table className="comm-comparison-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Statement #</th>
                <th>Restaurant</th>
                <th>Cycle Period</th>
                <th>Gross Orders</th>
                <th>Net Payable</th>
                <th>Status</th>
                <th>UTR Bank Reference</th>
                <th>Reconcile</th>
              </tr>
            </thead>
            <tbody>
              {statements.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.statementNumber}</strong></td>
                  <td>{s.restaurantName}</td>
                  <td>{s.cyclePeriod}</td>
                  <td>{s.grossOrdersCount}</td>
                  <td><strong style={{ color: '#047857' }}>{formatPaise(s.netPayablePaise)}</strong></td>
                  <td>
                    <span className={`comm-badge ${s.status === 'Settled' ? 'approved' : 'pending'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td>
                    {s.utrReference ? (
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{s.utrReference}</span>
                    ) : (
                      <input
                        type="text"
                        placeholder="Enter Bank UTR Ref"
                        value={utrInput[s.id] || ''}
                        onChange={(e) => setUtrInput({ ...utrInput, [s.id]: e.target.value })}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                      />
                    )}
                  </td>
                  <td>
                    {!s.utrReference && (
                      <button
                        type="button"
                        className="comm-btn primary"
                        style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
                        onClick={() => {
                          const val = utrInput[s.id];
                          if (!val) {
                            alert('Please enter a valid bank UTR reference.');
                            return;
                          }
                          onReconcileSettlement(s.id, val);
                        }}
                      >
                        Confirm UTR
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Dispute Queue */}
      {activeTab === 'disputes' && (
        <div>
          {disputes.map((d) => (
            <div
              key={d.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1.25rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong style={{ fontSize: '1rem' }}>Order #{d.orderNumber}</strong> ·{' '}
                  <span style={{ color: '#6b7280' }}>Disputed: {formatPaise(d.amountPaise)}</span>
                  <div style={{ fontSize: '0.8125rem', color: '#b45309', marginTop: '2px', textTransform: 'capitalize' }}>
                    Type: {d.issueType.replace('_', ' ')}
                  </div>
                </div>
                <span className={`comm-badge ${d.status === 'Resolved' ? 'approved' : 'pending'}`}>
                  {d.status}
                </span>
              </div>

              <p style={{ fontSize: '0.875rem', color: '#374151', margin: '0.75rem 0' }}>
                {d.description}
              </p>

              {d.status !== 'Resolved' ? (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <input
                    type="text"
                    placeholder="Enter resolution notes / credit memo reference..."
                    value={resolutionInput[d.id] || ''}
                    onChange={(e) => setResolutionInput({ ...resolutionInput, [d.id]: e.target.value })}
                    style={{ flex: 1, padding: '0.35rem 0.625rem', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.8125rem' }}
                  />
                  <button
                    type="button"
                    className="comm-btn success"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem' }}
                    onClick={() => {
                      const notes = resolutionInput[d.id] || 'Reconciled and approved by Finance Desk.';
                      onResolveDispute(d.id, notes);
                    }}
                  >
                    Mark Resolved
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '0.8125rem', color: '#047857', background: '#ecfdf5', padding: '0.5rem', borderRadius: '4px' }}>
                  ✓ Resolution: {d.resolutionNotes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Audit Trail */}
      {activeTab === 'audit' && (
        <div style={{ overflowX: 'auto' }}>
          <table className="comm-comparison-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </span>
                  </td>
                  <td><strong>{log.actor}</strong></td>
                  <td><span className="comm-badge review">{log.actorRole}</span></td>
                  <td>{log.action}</td>
                  <td>{log.target}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
