import { Link } from 'react-router-dom';
import logoSrc from '../../assets/logo.svg';

interface LogoProps {
  height?: number;
  style?: React.CSSProperties;
}

export default function Logo({ height = 20, style = {} }: LogoProps) {
  return (
    <Link to="/" aria-label="PLAI home" style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, ...style }}>
      <img
        src={logoSrc}
        alt="PLAI"
        style={{ height, width: 'auto', display: 'block' }}
      />
    </Link>
  );
}
