import { useState, useEffect, useCallback, useRef } from 'react';

export function useTimer(steps, totalTime) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef(null);
  const lastStepRef = useRef(-1);

  const currentStepIndex = steps.findIndex((step, index) => {
    const nextStep = steps[index + 1];
    const stepEnd = nextStep ? nextStep.startTime : totalTime;
    return elapsedTime >= step.startTime && elapsedTime < stepEnd;
  });

  const activeStepIndex = currentStepIndex === -1 && elapsedTime >= totalTime
    ? steps.length - 1
    : currentStepIndex;

  const currentStep = steps[activeStepIndex] || steps[0];
  const nextStep = steps[activeStepIndex + 1];

  const stepEndTime = nextStep ? nextStep.startTime : totalTime;
  const stepTimeRemaining = Math.max(0, stepEndTime - elapsedTime);
  const totalTimeRemaining = Math.max(0, totalTime - elapsedTime);

  const stepChanged = activeStepIndex !== lastStepRef.current && lastStepRef.current !== -1;

  useEffect(() => {
    lastStepRef.current = activeStepIndex;
  }, [activeStepIndex]);

  useEffect(() => {
    if (isRunning && !isComplete) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const next = prev + 1;
          if (next >= totalTime) {
            setIsRunning(false);
            setIsComplete(true);
            return totalTime;
          }
          return next;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isComplete, totalTime]);

  const start = useCallback(() => {
    if (!isComplete) {
      setIsRunning(true);
    }
  }, [isComplete]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const toggle = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, start, pause]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setElapsedTime(0);
    setIsComplete(false);
    lastStepRef.current = -1;
  }, []);

  // ข้ามไปยังเวลาที่ระบุ ใช้ตอนผู้ใช้กดเลือก step เอง
  // เพราะขั้นตอนจริงเสร็จเร็วหรือช้ากว่าเวลาที่ตั้งไว้เสมอ
  // ไม่แตะ isRunning นอกจากกรณีข้ามไปจนจบ กำลังเดินอยู่ก็เดินต่อ หยุดอยู่ก็ยังหยุด
  const seek = useCallback((seconds) => {
    const target = Math.max(0, Math.min(seconds, totalTime));
    const done = target >= totalTime;
    setElapsedTime(target);
    setIsComplete(done);
    if (done) setIsRunning(false);
  }, [totalTime]);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    elapsedTime,
    isRunning,
    isComplete,
    currentStepIndex: activeStepIndex,
    currentStep,
    stepTimeRemaining,
    totalTimeRemaining,
    stepChanged,
    progress: (elapsedTime / totalTime) * 100,
    start,
    pause,
    toggle,
    reset,
    seek,
    formatTime,
  };
}
