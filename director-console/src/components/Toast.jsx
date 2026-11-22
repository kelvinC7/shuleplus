export function Toast({ message, visible }) {
  return (
    <div className={`toast ${visible ? 'on' : ''}`}>
      <i />
      <span>{message}</span>
    </div>
  );
}
