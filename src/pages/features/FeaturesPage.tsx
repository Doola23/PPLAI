import '../../styles/landing.css';
import Navbar from '../../components/landing/Navbar';
import FeatureCards from '../../components/landing/FeatureCards';
import Footer from '../../components/landing/Footer';

export default function FeaturesPage() {
  return (
    <div className="bg-bg-black text-text-white min-h-screen overflow-x-hidden">
      <Navbar />
      <main>
        <FeatureCards />
      </main>
      <Footer />
    </div>
  );
}
