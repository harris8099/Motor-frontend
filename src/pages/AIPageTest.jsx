import React from 'react';
import { useParams } from 'react-router-dom';
import { Brain, Bot, Radar, ShieldCheck, Wrench } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import './PageStyles.css';

function AIPageTest() {
  const { deviceId } = useParams();

  const models = [
    { name: 'Anomaly Detection', status: 'Monitoring live telemetry', icon: Radar },
    { name: 'Thermal Risk Model', status: 'Tracking heat drift and thresholds', icon: Brain },
    { name: 'Maintenance Advisor', status: 'Summarizing service priorities', icon: Wrench },
    { name: 'Protection Layer', status: 'Watching critical fault patterns', icon: ShieldCheck },
  ];

  return (
    <div className="page-container">
      <Breadcrumbs />

      <header className="page-header">
        <div className="header-with-icon">
          <div className="header-icon-wrapper ai">
            <Brain size={28} />
          </div>
          <div>
            <h1>AI Insights</h1>
            <p className="page-subtitle">Operational guidance and model status for {deviceId}</p>
          </div>
        </div>
      </header>

      <section className="ai-hero-section">
        <div className="ai-hero-card">
          <div className="ai-hero-icon">
            <Bot size={28} />
          </div>
          <div className="ai-hero-content">
            <h2>Analysis workspace is available</h2>
            <p>
              This fallback view keeps the interface stable while backend-powered insight modules are
              being connected. It is styled to match the rest of the dashboard instead of looking like
              a temporary dev screen.
            </p>
          </div>
        </div>
      </section>

      <section className="ai-models-section">
        <h2>Model Coverage</h2>
        <div className="ai-models-grid">
          {models.map((model) => {
            const Icon = model.icon;
            return (
              <div key={model.name} className="ai-model-card">
                <div className="ai-model-header">
                  <Icon size={18} />
                  <h3>{model.name}</h3>
                </div>
                <p className="ai-model-desc">{model.status}</p>
                <div className="ai-model-status">
                  <span className="status-dot" />
                  Ready
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default AIPageTest;
