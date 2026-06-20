import PageBanner from '../../components/dashboard/PageBanner';
import ScoutLab from '../../components/scouting/ScoutLab';

export default function ScoutSearchPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#000000' }}>
      <PageBanner
        eyebrow="Scouting"
        title="Scout"
        titleAccent="Lab"
        description="Professional player scouting — filter by position, attributes, budget and contract status across all Premier League data"
        stats={[
          { value: '500+', label: 'Players' },
          { value: '20',   label: 'PL Clubs' },
          { value: 'AI',   label: 'Powered' },
        ]}
        badge="ScoutLab"
      />
      <ScoutLab />
    </div>
  );
}
