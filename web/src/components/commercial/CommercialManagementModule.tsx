import React, { useState } from 'react';
import type {
  UserRole,
  RestaurantApplication,
  CommercialPlanConfig,
  AgreementClause,
  SettlementStatement,
  DisputeTicket,
  CommercialAuditLog,
} from '../../types/commercial';
import type { Language } from '../../locales/commercialTranslations';
import { translations } from '../../locales/commercialTranslations';
import {
  SAMPLE_APPLICATIONS,
  SAMPLE_COMMERCIAL_PLANS,
  MASTER_AGREEMENT_CLAUSES,
  SAMPLE_SETTLEMENTS,
  SAMPLE_DISPUTES,
  SAMPLE_AUDIT_LOGS,
} from '../../data/commercialSeeds';
import { DEFAULT_COMMERCIAL_PLAN } from '../../services/commercialCalculator';
import OnboardingFlow from './OnboardingFlow';
import CommercialCalculatorView from './CommercialCalculatorView';
import CommercialPlanManager from './CommercialPlanManager';
import AgreementViewer from './AgreementViewer';
import LegalReviewWorkflow from './LegalReviewWorkflow';
import PartnerDashboard from './PartnerDashboard';
import CommercialAdminDashboard from './CommercialAdminDashboard';
import NotificationTemplatesView from './NotificationTemplatesView';
import './commercial.css';
import {
  ShieldAlert,
  Globe2,
  Users,
  Calculator,
  Building2,
  FileText,
  Scale,
  LayoutDashboard,
  ShieldCheck,
  Bell,
  SlidersHorizontal,
} from 'lucide-react';

export default function CommercialManagementModule() {
  const [lang, setLang] = useState<Language>('en');
  const [userRole, setUserRole] = useState<UserRole>('restaurant_owner');
  const [activeTab, setActiveTab] = useState<string>('calculator');

  // Shared application & plan state
  const [applications, setApplications] = useState<RestaurantApplication[]>(SAMPLE_APPLICATIONS);
  const [selectedAppId, setSelectedAppId] = useState<string>(SAMPLE_APPLICATIONS[0].id);
  const [plans, setPlans] = useState<CommercialPlanConfig[]>(SAMPLE_COMMERCIAL_PLANS);
  const [activePlanId, setActivePlanId] = useState<string>(SAMPLE_COMMERCIAL_PLANS[0].id);
  const [clauses, setClauses] = useState<AgreementClause[]>(MASTER_AGREEMENT_CLAUSES);
  const [statements, setStatements] = useState<SettlementStatement[]>(SAMPLE_SETTLEMENTS);
  const [disputes, setDisputes] = useState<DisputeTicket[]>(SAMPLE_DISPUTES);
  const [auditLogs, setAuditLogs] = useState<CommercialAuditLog[]>(SAMPLE_AUDIT_LOGS);

  const t = translations[lang];
  const currentApp = applications.find((a) => a.id === selectedAppId) || applications[0];
  const currentPlan = plans.find((p) => p.id === activePlanId) || DEFAULT_COMMERCIAL_PLAN;

  const logCommercialAction = (action: string, target: string, details: string) => {
    const newLog: CommercialAuditLog = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      actor: `User (${userRole})`,
      actorRole: userRole,
      action,
      target,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const handleSaveApplication = (updated: RestaurantApplication) => {
    setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    logCommercialAction('Update Application', updated.brandName, `Status: ${updated.status}`);
  };

  const handleUpdatePlan = (updated: CommercialPlanConfig) => {
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    logCommercialAction(
      'Update Commercial Plan',
      updated.name,
      `Self: ${updated.selfDeliveryCommissionBps / 100}%, Nexora: ${updated.nexoraDeliveryCommissionBps / 100}%`
    );
  };

  const handleUpdateClause = (clauseId: number, newContent: string) => {
    setClauses((prev) =>
      prev.map((c) =>
        c.id === clauseId
          ? {
              ...c,
              content: newContent,
              reviewStatus: 'Pending lawyer review', // Auto-resets review status upon edit!
              notes: 'Content revised by authorized admin; review status auto-reset.',
            }
          : c
      )
    );
    logCommercialAction(
      'Revise Agreement Clause',
      `Clause #${clauseId}`,
      'Clause wording updated. Review status automatically reset to Pending.'
    );
  };

  const handleUpdateApplicationStatus = (appId: string, status: RestaurantApplication['status']) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status, updatedAt: new Date().toISOString() } : a))
    );
    const target = applications.find((a) => a.id === appId)?.brandName || appId;
    logCommercialAction('Update Partner Status', target, `Marked status as ${status}`);
  };

  const handleResolveDispute = (disputeId: string, resolutionNotes: string) => {
    setDisputes((prev) =>
      prev.map((d) =>
        d.id === disputeId
          ? {
              ...d,
              status: 'Resolved',
              resolutionNotes,
              updatedAt: new Date().toISOString(),
            }
          : d
      )
    );
    logCommercialAction('Resolve Dispute', `Dispute #${disputeId}`, resolutionNotes);
  };

  const handleReconcileSettlement = (statementId: string, utr: string) => {
    setStatements((prev) =>
      prev.map((s) =>
        s.id === statementId
          ? {
              ...s,
              status: 'Settled',
              utrReference: utr,
              settlementDate: new Date().toISOString().split('T')[0],
            }
          : s
      )
    );
    logCommercialAction('Reconcile Settlement', `Statement #${statementId}`, `Attached UTR: ${utr}`);
  };

  const handleAddDispute = (data: Omit<DisputeTicket, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    const newDispute: DisputeTicket = {
      ...data,
      id: 'disp-' + Date.now(),
      status: 'Open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDisputes((prev) => [newDispute, ...prev]);
    logCommercialAction('Submit Dispute', `Order #${data.orderNumber}`, data.description);
  };

  return (
    <div className="comm-container">
      <aside className="notice" role="status">{lang === 'hi' ? 'नमूना कार्यक्षेत्र: आवेदन, योजनाएँ, समीक्षा और भुगतान विवरण अभी परीक्षण डेटा हैं। बदलाव live database में सेव नहीं होते। भूमिका चयन केवल preview है।' : 'Sample workspace: applications, plans, reviews and payout statements are test data. Changes are not saved to the live database. Role selection is for preview only.'}</aside>
      {/* Top Legal / Tax Safety Banner */}
      <div className="comm-banner-disclaimer">
        <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>{t.legalSafetyBadge}: </strong>
          {t.disclaimerBanner}
        </div>
      </div>

      {/* Header Bar with Language and Role Switchers */}
      <div className="comm-header-bar">
        <div className="comm-header-titles">
          <h1>{t.moduleTitle}</h1>
          <p>{t.moduleSubtitle}</p>
        </div>

        <div className="comm-header-controls">
          {/* Language Toggle */}
          <button
            type="button"
            className="comm-lang-btn"
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
          >
            <Globe2 size={15} />
            <span>{t.languageToggle}</span>
          </button>

          {/* Role Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{t.roleLabel}</span>
            <select
              aria-label="Role Switcher"
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as UserRole)}
              style={{
                padding: '0.35rem 0.625rem',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '0.8125rem',
                fontWeight: 600,
                background: '#ffffff',
                color: '#111827',
              }}
            >
              <option value="restaurant_owner">Restaurant Owner</option>
              <option value="super_admin">Super Admin</option>
              <option value="finance_admin">Finance Admin</option>
              <option value="legal_reviewer">Legal / CA Reviewer</option>
              <option value="restaurant_onboarding_staff">Onboarding Staff</option>
              <option value="restaurant_staff">Restaurant Staff</option>
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="comm-tabs-nav">
        <button
          type="button"
          className={`comm-tab-btn ${activeTab === 'calculator' ? 'active' : ''}`}
          onClick={() => setActiveTab('calculator')}
        >
          <Calculator size={16} /> {t.tabCalculator}
        </button>
        <button
          type="button"
          className={`comm-tab-btn ${activeTab === 'onboarding' ? 'active' : ''}`}
          onClick={() => setActiveTab('onboarding')}
        >
          <Building2 size={16} /> {t.tabOnboarding}
        </button>
        <button
          type="button"
          className={`comm-tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          <SlidersHorizontal size={16} /> {t.tabPlans}
        </button>
        <button
          type="button"
          className={`comm-tab-btn ${activeTab === 'agreement' ? 'active' : ''}`}
          onClick={() => setActiveTab('agreement')}
        >
          <FileText size={16} /> {t.tabAgreement}
        </button>
        <button
          type="button"
          className={`comm-tab-btn ${activeTab === 'legal_review' ? 'active' : ''}`}
          onClick={() => setActiveTab('legal_review')}
        >
          <Scale size={16} /> {t.tabLegalReview}
        </button>
        <button
          type="button"
          className={`comm-tab-btn ${activeTab === 'partner_dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('partner_dashboard')}
        >
          <LayoutDashboard size={16} /> {t.tabPartnerDashboard}
        </button>
        <button
          type="button"
          className={`comm-tab-btn ${activeTab === 'admin_dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('admin_dashboard')}
        >
          <ShieldCheck size={16} /> {t.tabAdminDashboard}
        </button>
        <button
          type="button"
          className={`comm-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={16} /> {t.tabNotifications}
        </button>
      </div>

      {/* Main Content Area Routing */}
      {activeTab === 'calculator' && (
        <CommercialCalculatorView lang={lang} activePlan={currentPlan} />
      )}

      {activeTab === 'onboarding' && (
        <OnboardingFlow
          lang={lang}
          application={currentApp}
          onSaveApplication={handleSaveApplication}
          userRole={userRole}
        />
      )}

      {activeTab === 'plans' && (
        <CommercialPlanManager
          lang={lang}
          plans={plans}
          activePlanId={activePlanId}
          onSelectPlan={setActivePlanId}
          onUpdatePlan={handleUpdatePlan}
          userRole={userRole}
        />
      )}

      {activeTab === 'agreement' && (
        <AgreementViewer
          lang={lang}
          plan={currentPlan}
          application={currentApp}
          clauses={clauses}
          userRole={userRole}
          onUpdateClause={handleUpdateClause}
        />
      )}

      {activeTab === 'legal_review' && (
        <LegalReviewWorkflow
          lang={lang}
          clauses={clauses}
          onUpdateClauses={setClauses}
          userRole={userRole}
        />
      )}

      {activeTab === 'partner_dashboard' && (
        <PartnerDashboard
          lang={lang}
          application={currentApp}
          plan={currentPlan}
          statements={statements}
          disputes={disputes}
          onSubmitDispute={handleAddDispute}
          onNavigateTab={setActiveTab}
        />
      )}

      {activeTab === 'admin_dashboard' && (
        <CommercialAdminDashboard
          lang={lang}
          applications={applications}
          statements={statements}
          disputes={disputes}
          auditLogs={auditLogs}
          activePlan={currentPlan}
          userRole={userRole}
          onUpdateApplicationStatus={handleUpdateApplicationStatus}
          onResolveDispute={handleResolveDispute}
          onReconcileSettlement={handleReconcileSettlement}
        />
      )}

      {activeTab === 'notifications' && (
        <NotificationTemplatesView lang={lang} />
      )}
    </div>
  );
}
