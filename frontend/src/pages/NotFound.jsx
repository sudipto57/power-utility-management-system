import useAuth from '../hooks/useAuth';
import Button from '../components/common/Button';
import Logo from '../components/common/Logo';
import { homePathFor } from '../utils/routes';

export default function NotFound() {
  const { user } = useAuth();
  return (
    <div className="app-backdrop flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="animate-float">
        <Logo compact />
      </div>
      <p className="mt-8 animate-fade-up text-7xl font-black tracking-tight text-slate-900">404</p>
      <h1 className="mt-2 animate-fade-up text-xl font-bold text-slate-800" style={{ animationDelay: '80ms' }}>
        Looks like this line is disconnected
      </h1>
      <p className="mt-2 animate-fade-up text-sm text-slate-500" style={{ animationDelay: '140ms' }}>
        The page you are looking for does not exist.
      </p>
      <Button
        variant="accent"
        icon="arrowLeft"
        to={user ? homePathFor(user) : '/login'}
        className="mt-8 animate-fade-up"
        style={{ animationDelay: '200ms' }}
      >
        Back to safety
      </Button>
    </div>
  );
}
