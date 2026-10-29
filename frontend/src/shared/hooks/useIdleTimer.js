import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook theo dõi trạng thái tương tác người dùng (Inactivity Timeout)
 * Sau timeoutMs không có thao tác chuột/bàn phím, đánh dấu isIdle = true
 * 
 * @param {number} timeoutMs Thời gian giới hạn không tương tác (mặc định 30 phút = 1800000ms)
 * @param {Function} onIdle Callback kích hoạt khi bắt đầu rơi vào trạng thái nhàn rỗi
 */
export function useIdleTimer({ timeoutMs = 30 * 60 * 1000, onIdle } = {}) {
  const [isIdle, setIsIdle] = useState(false);
  const lastActiveRef = useRef(Date.now());
  const timerRef = useRef(null);
  const throttleRef = useRef(0);

  // Đặt lại đồng hồ đếm ngược nhàn rỗi
  const resetTimer = useCallback(() => {
    lastActiveRef.current = Date.now();
    setIsIdle(false);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setIsIdle(true);
      if (onIdle) {
        onIdle();
      }
    }, timeoutMs);
  }, [timeoutMs, onIdle]);

  // Xử lý sự kiện tương tác người dùng (được throttle 2 giây để tối ưu performance)
  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    if (now - throttleRef.current > 2000) {
      throttleRef.current = now;
      if (!isIdle) {
        lastActiveRef.current = now;
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          setIsIdle(true);
          if (onIdle) {
            onIdle();
          }
        }, timeoutMs);
      }
    }
  }, [isIdle, timeoutMs, onIdle]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'wheel'];

    // Khởi tạo timer ban đầu
    resetTimer();

    // Đăng ký event listeners
    events.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });
    };
  }, [handleUserActivity, resetTimer]);

  return {
    isIdle,
    setIsIdle,
    resetTimer,
    lastActiveTime: lastActiveRef.current
  };
}

export default useIdleTimer;
