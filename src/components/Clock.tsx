"use client";

import { useState, useEffect } from 'react';

export function Clock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    // Set initial time on client to avoid hydration mismatch
    setTime(new Date());

    const timerId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, []);

  const formatTime = (date: Date | null) => {
    if (!date) {
      return '00:00:00';
    }
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };
  
  const formatDate = (date: Date | null) => {
     if (!date) {
      return '';
    }
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'full',
      }).format(date);
  }

  return (
    <div className="flex flex-col items-center">
        <p className="text-xl text-muted-foreground">{formatDate(time)}</p>
        <div className="text-7xl font-bold text-primary tracking-tighter md:text-8xl">
            {formatTime(time)}
        </div>
    </div>
  );
}
