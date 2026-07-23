import { useEffect, useState } from 'react';

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Time-of-day greeting. Starts neutral and resolves after mount — like
 * `useColorScheme` (`use-color-scheme.web.ts`), this avoids a hydration
 * mismatch on static web export, where the server-prerendered hour and the
 * client's actual hour at load time can differ.
 */
export function useGreeting() {
  const [greeting, setGreeting] = useState('Hello');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  return greeting;
}
