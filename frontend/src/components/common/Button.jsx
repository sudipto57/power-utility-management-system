import { Link } from 'react-router-dom';
import Icon from './Icon';
import Spinner from './Spinner';
import { buttonClass } from '../../utils/ui';

/**
 * <Button variant="accent" icon="plus" onClick={...}>Add</Button>
 * <Button to="/admin/customers/new">Add</Button>   (renders a link that looks like a button)
 * variants: primary | accent | secondary | success | danger | ghost      sizes: sm | md | lg
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  to,
  type = 'button',
  className = '',
  children,
  disabled,
  ...props
}) {
  const classes = buttonClass(variant, size, className);
  const content = (
    <>
      {loading ? <Spinner className="h-4 w-4" /> : icon ? <Icon name={icon} className="h-4 w-4" /> : null}
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
}
