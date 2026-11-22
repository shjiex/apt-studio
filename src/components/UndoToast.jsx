import { useEffect } from 'react';
import Button from './Button.jsx';

// Confirms the last change and offers to undo it. Hides itself after 5 seconds.
function UndoToast({ message, onUndo, onDismiss }) {
  // App gives each toast a new key, so this effect runs once per toast.
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="toast" role="status">
      <span>{message}</span>
      <Button variant="white" size="sm" icon="undo" onClick={onUndo}>
        Undo
      </Button>
    </div>
  );
}

export default UndoToast;
