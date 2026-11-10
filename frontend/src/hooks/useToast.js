import { useContext } from 'react';
import { ToastContext } from '../context/toast-context';

/** const toast = useToast();  toast.success('Saved');  toast.error('Oops'); */
export default function useToast() {
  return useContext(ToastContext);
}
