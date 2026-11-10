import { createContext } from 'react';

// Holds { user, checking, login, logout }. Use it through hooks/useAuth.js
export const AuthContext = createContext(null);
