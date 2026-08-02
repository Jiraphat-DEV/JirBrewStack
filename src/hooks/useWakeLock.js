import { useEffect, useRef } from 'react';

// กันจอดับตอนจับเวลา ใช้ navigator.wakeLock ตรงๆ ไม่ต้องมี dependency
// เบราว์เซอร์ปล่อย lock เองเมื่อสลับแท็บ จึงต้องขอใหม่ตอนกลับมา visible
export function useWakeLock(active) {
  const lockRef = useRef(null);

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return undefined;
    let cancelled = false;
    // กันเรียก acquire ซ้อนระหว่างที่ request ก่อนหน้ายังไม่ resolve
    // lockRef.current เป็น null อยู่จนกว่า await จะเสร็จ เช็คแค่ lockRef ไม่พอ
    let pending = false;

    const acquire = async () => {
      if (lockRef.current || pending) return;
      pending = true;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          lock.release().catch(() => {});
          return;
        }
        lock.addEventListener('release', () => {
          lockRef.current = null;
        });
        lockRef.current = lock;
      } catch {
        // ponytail: ไม่รองรับหรือถูกปฏิเสธ ปล่อยเงียบ timer ทำงานต่อปกติ
      } finally {
        pending = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, [active]);
}
