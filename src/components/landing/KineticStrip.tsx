const ITEMS = [
  { label: 'xG Accuracy', value: '91.3%' },
  { label: 'League', value: 'Premier League' },
  { label: 'PL Clubs', value: '20' },
  { label: 'Players Tracked', value: '500+' },
  { label: 'Prediction Confidence', value: '87.2%' },
  { label: 'Injury Alerts Raised', value: '114' },
  { label: 'xG Accuracy', value: '91.3%' },
  { label: 'League', value: 'Premier League' },
  { label: 'PL Clubs', value: '20' },
  { label: 'Players Tracked', value: '500+' },
  { label: 'Prediction Confidence', value: '87.2%' },
  { label: 'Injury Alerts Raised', value: '114' },
];

export default function KineticStrip() {
  return (
    <div className="lstrip" aria-hidden="true">
      <div className="lstrip__track">
        {ITEMS.map((item, i) => (
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
