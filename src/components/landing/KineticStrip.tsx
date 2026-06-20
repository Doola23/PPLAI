import { useEffect, useState } from 'react';
import { injuriesService } from '../../services/injuries.service';

function buildItems(highRiskCount: number | null) {
  const base = [
    { label: 'xG Prediction R²', value: '0.89' },
    { label: 'League', value: 'Premier League' },
    { label: 'PL Clubs', value: '20' },
    { label: 'Players Tracked', value: '2,168+' },
    { label: 'Prediction Confidence', value: '53.4%' },
    { label: 'Injury Alerts Raised', value: highRiskCount !== null ? highRiskCount.toLocaleString() : '—' },
  ];
  return [...base, ...base];
}

export default function KineticStrip() {
  const [highRiskCount, setHighRiskCount] = useState<number | null>(null);
  useEffect(() => {
    injuriesService.getPredictions()
      .then(rows => setHighRiskCount(rows.filter(p => injuriesService.riskLevel(p) === 'High').length))
      .catch(() => {});
  }, []);

  const items = buildItems(highRiskCount);

  return (
    <div className="lstrip" aria-hidden="true">
      <div className="lstrip__track">
        {items.map((item, i) => (
          <span key={i} className="lstrip__item">
            <span className="lstrip__val">{item.value}</span>
            <span className="lstrip__sep" aria-hidden="true">—</span>
            <span className="lstrip__label">{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
