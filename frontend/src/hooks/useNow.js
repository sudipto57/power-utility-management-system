import { useEffect, useState } from 'react';

/** Live clock: gives the current time and reads it again every `everyMs` milliseconds. */
export default function useNow(everyMs = 1000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), everyMs);
    return () => clearInterval(timer); // stop the timer when the component closes
  }, [everyMs]);

  return now;
}
