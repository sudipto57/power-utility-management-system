import { createContext } from 'react';

// Holds { success(message), error(message) }. Use it through hooks/useToast.js
export const ToastContext = createContext(null);
