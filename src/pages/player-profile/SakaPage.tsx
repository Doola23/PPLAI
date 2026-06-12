import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SakaPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/player-profile/bukayo-saka', { replace: true }); }, [navigate]);
  return null;
}
