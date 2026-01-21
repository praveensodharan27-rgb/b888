import { useState, useEffect, useRef } from 'react';

interface UseAnimatedSearchPlaceholderOptions {
  location?: string | null;
  isUserTyping: boolean;
  isPaused?: boolean;
  startDelay?: number;
  typeSpeed?: number;
  eraseSpeed?: number;
  pauseAfterType?: number;
  pauseAfterErase?: number;
}

const PHRASES = [
  '3 BHK flat near',
  'mobile near',
  'iPhone near',
  'car near',
  'bike near',
  'house near',
  'laptop near',
  'furniture near',
  'books near',
  'jobs near',
  'services near',
  'anything near',
];

// Adaptive speed with slight variation for natural feel - SLOWER
const getAdaptiveTypeSpeed = (baseSpeed: number, charIndex: number) => {
  // Add slight variation around base: smooth 120–150ms effective range
  const variation = Math.random() * 30 - 15; // -15 to +15ms
  return Math.max(120, Math.min(150, baseSpeed + variation));
};

// Easing-out erase speed (much slower, softer feel)
const getAdaptiveEraseSpeed = (baseSpeed: number, charIndex: number, totalLength: number) => {
  // Easing out: starts normal, gets slightly slower toward the end (calm, premium feel)
  const progress = charIndex / totalLength;
  const easingFactor = 1 + progress * 0.3; // up to 30% slower by end
  const variation = Math.random() * 30 - 15; // -15 to +15ms
  // Target range: ~110–140ms per character with easing
  return Math.max(110, Math.min(140, baseSpeed * easingFactor + variation));
};

export function useAnimatedSearchPlaceholder({
  location,
  isUserTyping,
  isPaused = false,
  startDelay = 350,
  typeSpeed = 135, // Base speed for ~120–150ms range
  eraseSpeed = 125, // Base speed for ~110–140ms range with easing
  pauseAfterType = 5000, // 5s pause after full text (clear readability)
  pauseAfterErase = 3000, // 3s gap between phrases
}: UseAnimatedSearchPlaceholderOptions) {
  const [displayText, setDisplayText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [opacity, setOpacity] = useState(1); // For fade-out effect
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cursorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);
  const isPausedRef = useRef(isPaused);
  const prevLocationRef = useRef<string>('');
  const isUserTypingRef = useRef(isUserTyping);
  const locationTextRef = useRef<string>('');
  const currentPhraseIndexRef = useRef(currentPhraseIndex);
  const charIndexRef = useRef(0);
  const typeNextCharRef = useRef<(() => void) | null>(null);
  const fadeOutStepRef = useRef<(() => void) | null>(null);

  // Get location text (default to "your city" if empty)
  const locationText = location && location.trim() ? location.trim() : 'your city';
  
  // Update refs
  isUserTypingRef.current = isUserTyping;
  locationTextRef.current = locationText;
  currentPhraseIndexRef.current = currentPhraseIndex;
  isPausedRef.current = isPaused;
  
  // Get current phrase with location
  const getCurrentPhrase = () => {
    const phrase = PHRASES[currentPhraseIndexRef.current];
    return `${phrase} ${locationTextRef.current}`;
  };

  // Smooth cursor blinking (softer, less flashy)
  useEffect(() => {
    if (isPaused) {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
        cursorIntervalRef.current = null;
      }
      // Freeze cursor state while paused (prevents background repaint flicker)
      setShowCursor(false);
      return;
    }

    let cursorState = true;
    cursorIntervalRef.current = setInterval(() => {
      cursorState = !cursorState;
      setShowCursor(cursorState);
    }, 600); // Slower blink for softer feel

    return () => {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
    };
  }, [isPaused]);

  // Store function references in refs to keep them stable
  const startTypingRef = useRef<() => void>();
  const startErasingRef = useRef<() => void>();

  // Define typing function with adaptive speed
  const startTyping = () => {
    if (isPausedRef.current) return;
    setIsTyping(true);
    setIsErasing(false);
    setOpacity(1); // Reset opacity when starting to type
    charIndexRef.current = 0;

    const typeNextChar = () => {
      if (isPausedRef.current) return; // Pause without resetting progress

      // Check if user started typing (should stop)
      if (isUserTypingRef.current) {
        setIsTyping(false);
        setDisplayText('');
        return;
      }
      
      // Get fresh phrase and location from refs
      const freshPhrase = PHRASES[currentPhraseIndexRef.current];
      const freshLocation = locationTextRef.current;
      const freshCurrentPhrase = `${freshPhrase} ${freshLocation}`;
      
      if (charIndexRef.current < freshCurrentPhrase.length) {
        setDisplayText(freshCurrentPhrase.substring(0, charIndexRef.current + 1));
        charIndexRef.current++;
        // Use adaptive speed for natural feel
        const adaptiveSpeed = getAdaptiveTypeSpeed(typeSpeed, charIndexRef.current);
        timeoutRef.current = setTimeout(typeNextChar, adaptiveSpeed);
      } else {
        // Finished typing, pause then erase
        setIsTyping(false);
        timeoutRef.current = setTimeout(() => {
          if (startErasingRef.current && !isUserTypingRef.current && !isPausedRef.current) {
            startErasingRef.current();
          }
        }, pauseAfterType);
      }
    };

    typeNextCharRef.current = typeNextChar;
    typeNextChar();
  };

  // Define erasing function with fade-out effect
  const startErasing = () => {
    if (isPausedRef.current) return;
    setIsTyping(false);
    setIsErasing(true);
    // Get current phrase for fade-out
    const phrase = PHRASES[currentPhraseIndexRef.current];
    const currentLocation = locationTextRef.current;
    const currentPhrase = `${phrase} ${currentLocation}`;
    
    // Keep full text visible, just fade it out
    setDisplayText(currentPhrase);
    setOpacity(1); // Start at full opacity
    
    // Calculate fade-out duration based on phrase length (smooth fade)
    const fadeSteps = 20; // Number of fade steps for smooth transition
    const fadeDuration = currentPhrase.length * eraseSpeed; // Total fade time
    const fadeStepDuration = fadeDuration / fadeSteps;
    let currentStep = 0;

    const fadeOut = () => {
      if (isPausedRef.current) return; // Pause without resetting progress

      // Check if user started typing (should stop)
      if (isUserTypingRef.current) {
        setIsErasing(false);
        setDisplayText('');
        setOpacity(1);
        return;
      }
      
      // Get fresh phrase in case location changed (update text but keep fading)
      const freshPhrase = PHRASES[currentPhraseIndexRef.current];
      const freshLocation = locationTextRef.current;
      const freshCurrentPhrase = `${freshPhrase} ${freshLocation}`;
      setDisplayText(freshCurrentPhrase);
      
      if (currentStep < fadeSteps) {
        // Gradually reduce opacity
        const newOpacity = 1 - (currentStep / fadeSteps);
        setOpacity(newOpacity);
        currentStep++;
        timeoutRef.current = setTimeout(fadeOut, fadeStepDuration);
      } else {
        // Fade complete, clear text and wait 5 seconds
        setIsErasing(false);
        setDisplayText('');
        setOpacity(1); // Reset opacity for next phrase
        
        // Move to next phrase immediately (for continuous looping)
        setCurrentPhraseIndex((prev) => {
          const next = (prev + 1) % PHRASES.length;
          currentPhraseIndexRef.current = next;
          return next;
        });
        
        // Wait 5 seconds then start typing next phrase
        timeoutRef.current = setTimeout(() => {
          if (startTypingRef.current && !isUserTypingRef.current && !isPausedRef.current) {
            startTypingRef.current();
          }
        }, pauseAfterErase);
      }
    };

    fadeOutStepRef.current = fadeOut;
    fadeOut();
  };

  // Store functions in refs
  startTypingRef.current = startTyping;
  startErasingRef.current = startErasing;

  // Pause/resume controller for external UI states (e.g., modals)
  useEffect(() => {
    if (isPaused) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Resume from the exact point we paused
    if (!isUserTyping && isTyping && typeNextCharRef.current) {
      timeoutRef.current = setTimeout(() => typeNextCharRef.current && typeNextCharRef.current(), 0);
    } else if (!isUserTyping && isErasing && fadeOutStepRef.current) {
      timeoutRef.current = setTimeout(() => fadeOutStepRef.current && fadeOutStepRef.current(), 0);
    } else if (!hasStartedRef.current && !isTyping && !isErasing) {
      // If animation never started, allow the normal start logic to run
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        if (startTypingRef.current && !isUserTypingRef.current && !isPausedRef.current) {
          hasStartedRef.current = true;
          startTypingRef.current();
        }
      }, startDelay);
    }
  }, [isPaused, isTyping, isErasing, isUserTyping, startDelay]);

  // Smooth location update during animation (no restart)
  useEffect(() => {
    if (prevLocationRef.current !== locationText && (isTyping || isErasing)) {
      // Location changed during animation - update smoothly
      const currentPhrase = getCurrentPhrase();
      const basePhrase = PHRASES[currentPhraseIndexRef.current];
      
      if (isTyping) {
        // Update location part while typing
        const currentLength = displayText.length;
        if (currentLength > basePhrase.length) {
          // Already typed base phrase, update location part smoothly
          const newLocationPart = ` ${locationText}`;
          const locationCharsTyped = currentLength - basePhrase.length;
          setDisplayText(basePhrase + newLocationPart.substring(0, Math.min(locationCharsTyped, newLocationPart.length)));
        }
      } else if (isErasing) {
        // Update location part while fading out (keep full text, just update it)
        const fullPhrase = getCurrentPhrase();
        setDisplayText(fullPhrase); // Keep full text visible during fade
      }
      prevLocationRef.current = locationText;
    }
  }, [locationText, isTyping, isErasing, displayText]);

  // If location changes while idle, restart animation immediately so it doesn't look stuck
  useEffect(() => {
    if (prevLocationRef.current === locationText) return;
    prevLocationRef.current = locationText;

    // Only restart when user is not typing and animation isn't already running
    if (!isUserTyping && !isTyping && !isErasing) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setDisplayText('');
      hasStartedRef.current = true;
      // Start typing with the updated location right away
      if (startTypingRef.current && !isPausedRef.current) {
        startTypingRef.current();
      }
    }
  }, [locationText, isUserTyping, isTyping, isErasing]);

  // Main animation effect - start only when not typing
  useEffect(() => {
    if (isPaused) return;
    // Clear timeout if user starts typing
    if (isUserTyping) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setDisplayText('');
      setIsTyping(false);
      setIsErasing(false);
      hasStartedRef.current = false;
      return;
    }

    // Start animation after initial delay (only once)
    if (!hasStartedRef.current && !isTyping && !isErasing) {
      hasStartedRef.current = true;
      prevLocationRef.current = locationText;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        if (startTypingRef.current && !isUserTypingRef.current) {
          startTypingRef.current();
        }
      }, startDelay);
    }
  }, [isUserTyping, locationText]);

  // Safety: restart if animation stops unexpectedly (ensures continuous looping)
  useEffect(() => {
    if (isPaused) return;
    if (!isUserTyping && !isTyping && !isErasing && displayText === '' && hasStartedRef.current) {
      // Animation stopped - restart it to continue looping
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Small delay before restarting to ensure smooth transition
      timeoutRef.current = setTimeout(() => {
        if (startTypingRef.current && !isUserTypingRef.current) {
          startTypingRef.current();
        }
      }, 200);
    }
  }, [isUserTyping, isTyping, isErasing, displayText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
    };
  }, []);

  // Return placeholder text with smooth cursor
  // Show animated text or show first phrase while waiting to start
  let animated = displayText;
  
  // If animation hasn't started yet, show first phrase as preview
  if (!animated && !isUserTyping && !hasStartedRef.current) {
    const firstPhrase = PHRASES[0];
    const locationText = location && location.trim() ? location.trim() : 'your city';
    animated = `${firstPhrase} ${locationText}`;
  }
  
  // Build placeholder text
  const placeholder = animated ? `Search ${animated}${showCursor && !isUserTyping ? '|' : ''}` : '';

  // Return text and opacity for fade-out effect
  return { text: placeholder, opacity: isErasing ? opacity : 1 };
}

// Export type for return value
export type AnimatedPlaceholderResult = { text: string; opacity: number };
