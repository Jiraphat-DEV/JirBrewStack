import './AuthButton.css';

export default function AuthButton({ user, ready, error, signIn, signOut }) {
  // ก่อน auth resolve เว้นช่องไว้เฉยๆ การโชว์ปุ่ม "เข้าสู่ระบบ" ตอนนี้
  // คือการโชว์สถานะผิดให้คนที่ login อยู่เห็นราว 100ms
  if (!ready) return <div className="auth" />;

  if (!user) {
    return (
      <div className="auth">
        <button type="button" className="auth__login" onClick={signIn}>
          เข้าสู่ระบบ
        </button>
        {error && (
          <p className="auth__error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  const name = user.displayName || 'บัญชีของฉัน';

  return (
    <details className="auth">
      <summary className="auth__summary">
        {user.photoURL ? (
          // ไม่มี referrerPolicy แล้ว lh3.googleusercontent.com คืน 403 เป็นบางเคส
          <img
            className="auth__avatar"
            src={user.photoURL}
            alt={name}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="auth__avatar" aria-label={name}>
            {name.trim().charAt(0)}
          </span>
        )}
      </summary>
      <div className="auth__menu">
        <p className="auth__name">{name}</p>
        <button type="button" className="auth__signout" onClick={signOut}>
          ออกจากระบบ
        </button>
      </div>
    </details>
  );
}
