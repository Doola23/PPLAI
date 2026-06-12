import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HaalandPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/player-profile/erling-haaland', { replace: true }); }, [navigate]);
  return null;
}
