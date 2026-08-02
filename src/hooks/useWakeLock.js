import { useEffect, useRef } from 'react';

// กันจอดับตอนจับเวลา ใช้ navigator.wakeLock ตรงๆ ไม่ต้องมี dependency
// เบราว์เซอร์ปล่อย lock เองเมื่อสลับแท็บ จึงต้องขอใหม่ตอนกลับมา visible
export function useWakeLock(active) {
  const lockRef = useRef(null);

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return undefined;
    let cancelled = false;

    const acquire = async () => {
      if (lockRef.current) return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          lock.release();
          return;
        }
        lock.addEventListener('release', () => {
          lockRef.current = null;
        });
        lockRef.current = lock;
      } catch {
        // ponytail: ไม่รองรับหรือถูกปฏิเสธ ปล่อยเงียบ timer ทำงานต่อปกติ
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
