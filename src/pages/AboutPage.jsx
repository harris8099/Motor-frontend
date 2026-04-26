import { Brain, Code, User, ExternalLink, Cpu, Activity, Thermometer, Zap, BarChart2, TrendingDown, Shield, Wrench, Clock } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import './PageStyles.css';

// ── Data ─────────────────────────────────────────────────────────────────────
const OWNER = {
  name: 'TUF',
  role: 'Embedded Systems & ML Engineer',
  description:
    'Smart Motor Monitoring System — a real-time IoT + Machine Learning platform for predictive industrial motor maintenance. Built with FastAPI, PostgreSQL, React, and ESP32.',
  github: 'https://github.com',
  linkedin: 'https://linkedin.com',
};

const ML_MODELS = [
  {
    category: 'Anomaly Detection',
    icon: Shield,
    color: 'var(--accent-danger)',
    models: [
      {
        name: 'Isolation Forest',
        library: 'scikit-learn',
        what: 'Detects unusual motor readings by isolating data points that deviate from normal historical behaviour.',
        output: 'Anomaly score + most anomalous parameter',
      },
      {
        name: 'Local Outlier Factor (LOF)',
        library: 'scikit-learn',
        what: 'Compares a reading to its 20 nearest neighbours in feature space to detect local density anomalies.',
        output: 'LOF score + anomalous parameter',
      },
      {
        name: 'Elliptic Envelope',
        library: 'scikit-learn',
        what: 'Fits a Gaussian distribution to historical data and uses Mahalanobis distance to flag outliers.',
        output: 'Elliptic score + Mahalanobis distance',
      },
      {
        name: 'One-Class SVM',
        library: 'scikit-learn',
        what: 'An ensemble member used in the advanced multi-model anomaly voting system.',
        output: 'Part of ensemble anomaly vote',
      },
    ],
  },
  {
    category: 'Temperature Prediction',
    icon: Thermometer,
    color: 'var(--accent-warm)',
    models: [
      {
        name: 'Linear Regression (Trend)',
        library: 'scikit-learn',
        what: 'Fits a linear trend to historical temperature readings to predict when the motor will exceed its safety limit.',
        output: 'Predicted peak temp + time to threshold',
      },
      {
        name: 'Ridge Regression',
        library: 'scikit-learn',
        what: 'Uses power, current, RPM and vibration as predictors to estimate future motor temperature with L2 regularisation.',
        output: 'Predicted avg temp vs. safety limit',
      },
    ],
  },
  {
    category: 'Power & Efficiency',
    icon: Zap,
    color: 'var(--accent-1)',
    models: [
      {
        name: 'Lasso Regression',
        library: 'scikit-learn',
        what: 'Predicts expected power draw from motor conditions. A large deviation flags an electrical anomaly.',
        output: 'Expected vs actual power + deviation %',
      },
      {
        name: 'Polynomial Regression',
        library: 'numpy / scikit-learn',
        what: 'Fits a degree-2 polynomial to historical efficiency (RPM/power) to detect long-term degradation.',
        output: 'Degradation rate + future projection',
      },
      {
        name: 'Support Vector Regression (SVR)',
        library: 'scikit-learn',
        what: 'Predicts expected motor efficiency using an RBF kernel. Flags when actual efficiency falls below prediction.',
        output: 'Efficiency drop % + actual vs. predicted',
      },
    ],
  },
  {
    category: 'Bearing & Vibration',
    icon: Activity,
    color: 'var(--accent-success)',
    models: [
      {
        name: 'NASA Bearing Health Model',
        library: 'Custom physics-based',
        what: 'Implements NASA\'s PRONOSTIA / FEMTO bearing degradation framework using RMS, crest factor, kurtosis, and spectral analysis to estimate bearing health index.',
        output: 'Bearing health index (0–1) + fault type + recommendation',
      },
      {
        name: 'Gradient Boosting Regressor (GBR)',
        library: 'scikit-learn',
        what: 'Predicts future vibration magnitude from power, current, RPM and temperature readings.',
        output: 'Predicted vibration increase %',
      },
      {
        name: 'Statistical Z-Score Analysis',
        library: 'numpy',
        what: 'Computes the Z-score of current vibration magnitude against historical mean and standard deviation.',
        output: 'Z-score + trend slope',
      },
    ],
  },
  {
    category: 'Stall Risk',
    icon: TrendingDown,
    color: 'var(--accent-danger)',
    models: [
      {
        name: 'Random Forest Classifier',
        library: 'scikit-learn',
        what: 'Classifies current operating conditions as stall-risk or safe based on current, RPM, and efficiency features.',
        output: 'Stall probability + risk factors',
      },
      {
        name: 'Threshold + Efficiency Analysis',
        library: 'Custom',
        what: 'Rule-based check: high current near stall limit + low RPM + declining efficiency trend triggers a stall warning.',
        output: 'Risk score + specific cause',
      },
    ],
  },
  {
    category: 'Remaining Useful Life & Maintenance',
    icon: Clock,
    color: 'var(--accent-1)',
    models: [
      {
        name: 'Multi-indicator RUL Model',
        library: 'Custom + numpy',
        what: 'Combines temperature health, vibration health, efficiency health, and uptime-based wear into a composite health index. Estimates remaining life in days.',
        output: 'Health index (%) + RUL days + maintenance priority',
      },
      {
        name: 'Stress-factor Maintenance Predictor',
        library: 'Custom',
        what: 'Counts stress events (overtemp, overcurrent, high vibration) and adjusts the scheduled maintenance interval accordingly.',
        output: 'Adjusted hours remaining + usage pattern',
      },
    ],
  },
  {
    category: 'AI Language Model',
    icon: Brain,
    color: 'var(--accent-1)',
    models: [
      {
        name: 'Google Gemini 2.0 Flash',
        library: 'Google Generative AI API',
        what: 'On-demand AI analysis. In Commentary mode: explains ML model results in plain language. In Prediction mode: estimates 24 h failure probability and recommends maintenance actions.',
        output: 'Plain-English commentary or structured JSON prediction',
      },
    ],
  },
];

const TECH_STACK = [
  { name: 'FastAPI', role: 'Backend API framework', url: 'https://fastapi.tiangolo.com' },
  { name: 'PostgreSQL / Neon', role: 'Time-series sensor database', url: 'https://neon.tech' },
  { name: 'SQLAlchemy (async)', role: 'ORM + async DB access', url: 'https://sqlalchemy.org' },
  { name: 'scikit-learn', role: '12 ML models across 6 categories', url: 'https://scikit-learn.org' },
  { name: 'numpy / scipy', role: 'Statistical signal processing', url: 'https://numpy.org' },
  { name: 'Google Gemini API', role: 'AI commentary & prediction', url: 'https://ai.google.dev' },
  { name: 'React + Vite', role: 'Frontend SPA framework', url: 'https://vitejs.dev' },
  { name: 'Chart.js', role: 'Telemetry charts', url: 'https://chartjs.org' },
  { name: 'ESP32', role: 'IoT sensor microcontroller', url: 'https://espressif.com' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function AboutPage() {
  return (
    <div className="page-container">
      <Breadcrumbs />

      <header className="page-header">
        <div className="header-with-icon">
          <div className="header-icon-wrapper ai">
            <Brain size={28} />
          </div>
          <div>
            <h1>About This System</h1>
            <p className="page-subtitle">ML models, technology stack, and project information</p>
          </div>
        </div>
      </header>

      {/* ── Owner card ───────────────────────────────────────────────── */}
      <section className="about-owner-section">
        <div className="about-owner-card">
          <div className="about-owner-avatar">
            <User size={36} />
          </div>
          <div className="about-owner-info">
            <h2>{OWNER.name}</h2>
            <p className="about-owner-role">{OWNER.role}</p>
            <p className="about-owner-desc">{OWNER.description}</p>
            <div className="about-owner-links">
              <a href={OWNER.github} target="_blank" rel="noopener noreferrer" className="about-link-btn">
                <Code size={16} />
                GitHub
              </a>
              <a href={OWNER.linkedin} target="_blank" rel="noopener noreferrer" className="about-link-btn">
                <ExternalLink size={16} />
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── ML Models ─────────────────────────────────────────────────── */}
      <section className="about-models-section">
        <h2>Machine Learning Models</h2>
        <p className="page-subtitle" style={{ marginBottom: '1.5rem' }}>
          {ML_MODELS.reduce((acc, c) => acc + c.models.length, 0)} models across{' '}
          {ML_MODELS.length} categories run automatically on every sensor payload.
        </p>

        {ML_MODELS.map((category) => {
          const Icon = category.icon;
          return (
            <div key={category.category} className="about-category">
              <div className="about-category-header">
                <div className="about-category-icon" style={{ background: `${category.color}18`, color: category.color }}>
                  <Icon size={18} />
                </div>
                <h3>{category.category}</h3>
              </div>

              <div className="about-models-grid">
                {category.models.map((m) => (
                  <div key={m.name} className="about-model-card">
                    <div className="about-model-name">{m.name}</div>
                    <div className="about-model-library">{m.library}</div>
                    <p className="about-model-what">{m.what}</p>
                    <div className="about-model-output">
                      <span className="about-output-label">Output</span>
                      <span>{m.output}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* ── Tech Stack ────────────────────────────────────────────────── */}
      <section className="about-stack-section">
        <h2>Technology Stack</h2>
        <div className="about-stack-grid">
          {TECH_STACK.map((t) => (
            <a
              key={t.name}
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="about-stack-card"
            >
              <div className="about-stack-name">
                {t.name}
                <ExternalLink size={12} />
              </div>
              <div className="about-stack-role">{t.role}</div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
