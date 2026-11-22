import Icon from './Icon.jsx';

// One button for the whole app. variant is 'primary' (near-black),
// 'secondary' (grey) or 'white' (for use on the grey stage).
function Button({ children, variant = 'secondary', size = 'md', icon, fill = false, ...rest }) {
  const classes = ['btn', `btn--${variant}`, `btn--${size}`];
  if (fill) classes.push('btn--fill');
  if (!children) classes.push('btn--icon-only');
  return (
    <button type="button" className={classes.join(' ')} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

export default Button;
