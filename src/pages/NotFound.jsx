import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const { user } = useAuth();
  return (
    <div className="notfound">
      <span className="notfound-icon">
        <Compass size={26} />
      </span>
      <h1>404</h1>
      <h2>Page not found</h2>
      <p>The page you are looking for does not exist or you may not have access to it.</p>
      <Link to={user ? '/' : '/login'} className="btn btn-primary">
        {user ? 'Back to dashboard' : 'Go to sign in'}
      </Link>
    </div>
  );
}
