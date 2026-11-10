import { useContext } from 'react';
import { AuthContext } from '../context/auth-context';

/** const { user, login, logout } = useAuth(); */
export default function useAuth() {
  return useContext(AuthContext);
}
