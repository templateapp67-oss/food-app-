import React, { useState } from 'react';
import type { Language } from '../../locales/commercialTranslations';
import { translations } from '../../locales/commercialTranslations';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  ShieldAlert,
  Send,
  CheckCircle,
  Copy,
} from 'lucide-react';

interface Props {
  lang: Language;
}

interface TemplateItem {
  id: string;
  category: string;
  title: string;
  channel: 'SMS' | 'Email' | 'WhatsApp';
  templateEn: string;
  templateHi: string;
}

export default function NotificationTemplatesView({ lang }: Props) {
  const t = translations[lang];
  const [selectedChannel, setSelectedChannel] = useState<'All' | 'SMS' | 'Email' | 'WhatsApp'>('All');
  const [testSentMsg, setTestSentMsg] = useState('');

  const templates: TemplateItem[] = [
    {
      id: 'tpl-1',
      category: 'Onboarding',
      title: 'Application Submitted',
      channel: 'WhatsApp',
      templateEn: 'Namaste {{owner_name}}, your Nexora Food partner application for {{brand_name}} is received (Ref: {{app_id}}). Our compliance desk is reviewing your documents.',
      templateHi: 'नमस्ते {{owner_name}}, {{brand_name}} के लिए आपका नेक्सोरा फ़ूड आवेदन प्राप्त हुआ है (संदर्भ: {{app_id}})। हमारी टीम दस्तावेज़ों की समीक्षा कर रही है।',
    },
    {
      id: 'tpl-2',
      category: 'Compliance',
      title: 'FSSAI License Near Expiry Alert',
      channel: 'SMS',
      templateEn: 'URGENT: Your FSSAI license for {{brand_name}} expires on {{expiry_date}}. Upload renewal certificate on Nexora Partner Portal within 15 days to avoid listing disruption.',
      templateHi: 'जरूरी सूचना: {{brand_name}} का FSSAI लाइसेंस {{expiry_date}} को समाप्त हो रहा है। लिस्टिंग चालू रखने हेतु नेक्सोरा पार्टनर पोर्टल पर नवीनीकरण रसीद अपलोड करें।',
    },
    {
      id: 'tpl-3',
      category: 'Commercial',
      title: 'Restaurant Approved & Agreement Ready',
      channel: 'Email',
      templateEn: 'Congratulations {{owner_name}}! {{brand_name}} has been approved. Your 30-Day 0% Commission Launch Offer is ready. Review and digitally execute your Partner Agreement now.',
      templateHi: 'बधाई {{owner_name}}! {{brand_name}} को स्वीकृति मिल गई है। आपका 30-दिवसीय 0% कमीशन लॉन्च ऑफ़र तैयार है। अनुबंध की समीक्षा करें और हस्ताक्षर करें।',
    },
    {
      id: 'tpl-4',
      category: 'Commercial',
      title: '0% Launch Offer Expiry Reminder',
      channel: 'WhatsApp',
      templateEn: 'Reminder: Your 0% commission promotional period for {{brand_name}} ends in 5 days (on {{end_date}}). Your standard transparent partner rate ({{post_rate}}%) will apply thereafter.',
      templateHi: 'स्मरण पत्र: {{brand_name}} के लिए 0% कमीशन ऑफ़र 5 दिनों में ({{end_date}} को) समाप्त हो रहा है। इसके बाद आपकी मानक दर ({{post_rate}}%) लागू होगी।',
    },
    {
      id: 'tpl-5',
      category: 'Settlements',
      title: 'Weekly Payout Initiated / Settled',
      channel: 'SMS',
      templateEn: 'Nexora Settlement: Net payout of {{amount}} for order cycle {{cycle}} has been transferred to {{bank_account}} (UTR: {{utr}}). View detailed statement in Partner Portal.',
      templateHi: 'नेक्सोरा भुगतान: ऑर्डर चक्र {{cycle}} का शुद्ध भुगतान {{amount}} आपके बैंक खाते में स्थानांतरित कर दिया गया है (UTR: {{utr}})। विवरण पोर्टल में देखें।',
    },
    {
      id: 'tpl-6',
      category: 'Disputes',
      title: 'Refund / Commercial Dispute Resolved',
      channel: 'Email',
      templateEn: 'Update on Order #{{order_number}} dispute: Our finance reconciliation team has investigated the claim and approved an adjustment credit of {{amount}}. View statement W{{week}}.',
      templateHi: 'ऑर्डर #{{order_number}} विवाद अपडेट: हमारी टीम ने दावे की जांच कर {{amount}} का समायोजन क्रेडिट स्वीकृत किया है।',
    },
    {
      id: 'tpl-7',
      category: 'Subscription',
      title: 'Subscription Renewal / Payment Status',
      channel: 'WhatsApp',
      templateEn: 'Your Nexora Pro Kitchen subscription (₹{{price}}/mo) will renew on {{renewal_date}}. To modify or cancel, manage in Partner Dashboard > Subscription Settings.',
      templateHi: 'आपका नेक्सोरा प्रो किचन सब्सक्रिप्शन (₹{{price}}/माह) {{renewal_date}} को नवीनीकृत होगा। बदलाव या रद्द करने हेतु पार्टनर डैशबोर्ड देखें।',
    },
  ];

  const filtered = selectedChannel === 'All' ? templates : templates.filter((tpl) => tpl.channel === selectedChannel);

  const simulateTest = (tpl: TemplateItem) => {
    setTestSentMsg(`Simulated ${tpl.channel} test sent to admin test inbox for "${tpl.title}". Production gateways remain disabled.`);
    setTimeout(() => setTestSentMsg(''), 4500);
  };

  return (
    <div className="comm-panel">
      <div className="comm-panel-header">
        <div>
          <h2>{t.notifTitle}</h2>
          <p className="comm-muted">{t.notifSubtitle}</p>
        </div>
      </div>

      <div className="comm-banner-disclaimer" style={{ marginBottom: '1.25rem' }}>
        <ShieldAlert size={18} />
        <div>
          <strong>Production Safety Guard: </strong>
          {t.notifSafetyNotice} Real SMS/WhatsApp APIs will not trigger until authorized credentials are affirmatively configured in environment variables.
        </div>
      </div>

      {testSentMsg && (
        <div className="comm-banner-disclaimer" style={{ background: '#ecfdf5', color: '#065f46', borderLeftColor: '#10b981', marginBottom: '1rem' }}>
          <CheckCircle size={16} />
          {testSentMsg}
        </div>
      )}

      {/* Channel Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['All', 'SMS', 'Email', 'WhatsApp'] as const).map((ch) => (
          <button
            key={ch}
            type="button"
            className={`comm-tab-btn ${selectedChannel === ch ? 'active' : ''}`}
            onClick={() => setSelectedChannel(ch)}
          >
            {ch === 'SMS' && <Smartphone size={14} />}
            {ch === 'Email' && <Mail size={14} />}
            {ch === 'WhatsApp' && <MessageSquare size={14} />}
            {ch} Templates
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {filtered.map((tpl) => (
          <div
            key={tpl.id}
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="comm-badge review">{tpl.channel}</span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Category: {tpl.category}</span>
              </div>
              <strong style={{ fontSize: '0.9375rem', color: '#111827', display: 'block', marginBottom: '0.75rem' }}>
                {tpl.title}
              </strong>
              <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8125rem', lineHeight: '1.5', color: '#374151', border: '1px solid #f3f4f6' }}>
                {lang === 'hi' ? tpl.templateHi : tpl.templateEn}
              </div>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="comm-btn secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                onClick={() => simulateTest(tpl)}
              >
                <Send size={12} /> Test Simulation
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
