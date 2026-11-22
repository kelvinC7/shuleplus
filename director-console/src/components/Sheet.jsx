export function Sheet({ open, className = '', onClose, children }) {
  return (
    <>
      <div className={`scrim ${open ? 'on' : ''}`} onClick={onClose} />
      <div className={`sheet ${className} ${open ? 'on' : ''}`}>
        {children}
      </div>
    </>
  );
}
