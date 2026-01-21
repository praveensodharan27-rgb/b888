'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiSearch } from 'react-icons/fi';

interface HeroOLXProps {
  onLocationChange?: (location: {
    latitude?: number;
    longitude?: number;
    locationSlug?: string;
  }) => void;
}

const BASE_EXAMPLE_SEARCHES = [
  '3 BHK flat for rent, Ernakulam',
  'BMW used car, Ernakulam',
  '2 BHK apartment, Kochi',
  'iPhone 14, Calicut',
  'Royal Enfield bike, Trivandrum',
  'Scooter for sale, Kozhikode'
];

export default function HeroOLX({ onLocationChange }: HeroOLXProps = {}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [showInputCursor, setShowInputCursor] = useState(true);
  const [exampleSearches, setExampleSearches] = useState(BASE_EXAMPLE_SEARCHES);
  const inputRef = useRef<HTMLInputElement>(null);
  const typewriterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cursorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isUiFrozen, setIsUiFrozen] = useState(false);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Typewriter effect for rotating phrases
  const [animatedText, setAnimatedText] = useState('');
  const [showTypewriterCursor, setShowTypewriterCursor] = useState(true);
  const typewriterRef = useRef<NodeJS.Timeout | null>(null);
  const cursorBlinkRef = useRef<NodeJS.Timeout | null>(null);
  const phraseCharIndexRef = useRef(0);
  const phraseDeletingRef = useRef(false);

  // Placeholder typewriter refs (resume without restart)
  const placeholderCharIndexRef = useRef(0);
  const placeholderDeletingRef = useRef(false);
  
  // Phrases to rotate through
  const PHRASES = ['you need', 'you love', 'near you', 'for you'];
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  
  // Animation timings (optimized for smooth, natural feel)
  const TYPE_SPEED = 70; // ms per character (smooth & readable)
  const ERASE_SPEED = 55; // ms per character (smooth erase)
  const PAUSE_AFTER_TYPE = 700; // ms pause after typing (short pause)
  const PAUSE_AFTER_ERASE = 0; // No gap – start next phrase immediately
  const START_DELAY = 0; // Start immediately (no initial delay)

  // Check user location and update examples (check localStorage first, then try geolocation)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateExamplesWithLocation = (hasLocation: boolean) => {
      if (hasLocation) {
        // Replace location part with "near you"
        setExampleSearches(
          BASE_EXAMPLE_SEARCHES.map(search => {
            // Format: <Product>, <Location> -> <Product>, near you
            const commaIndex = search.lastIndexOf(',');
            if (commaIndex !== -1) {
              return search.substring(0, commaIndex + 1) + ' near you';
            }
            return search;
          })
        );
      } else {
        setExampleSearches(BASE_EXAMPLE_SEARCHES);
      }
    };

    // Check localStorage first
    try {
      const storedLocation = localStorage.getItem('selected_location');
      const storedCoords = localStorage.getItem('selected_location_coords');
      
      const hasLocation = !!(storedLocation || storedCoords);

      if (hasLocation) {
        updateExamplesWithLocation(true);
        return;
      }
    } catch (error) {
      console.error('Error reading localStorage:', error);
    }

    // If no location in localStorage, try automatic geolocation detection
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Location detected successfully - show "near you"
          updateExamplesWithLocation(true);
          
          // Optionally save to localStorage for future use
          try {
            const coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            localStorage.setItem('selected_location_coords', JSON.stringify(coords));
          } catch (error) {
            console.error('Error saving coordinates:', error);
          }
        },
        (error) => {
          // Geolocation failed or denied - use default examples
          updateExamplesWithLocation(false);
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 300000 // Accept cached position up to 5 minutes
        }
      );
    } else {
      // Geolocation not supported - use default examples
      updateExamplesWithLocation(false);
    }
  }, []);

  const handleSearch = () => {
    // Only navigate to search page if search text is provided
    if (!search.trim()) {
      return; // Don't navigate if search is empty
    }

    // Check for persisted location from localStorage
    try {
      const storedLocation = localStorage.getItem('selected_location');
      const storedCoords = localStorage.getItem('selected_location_coords');
      
      let params = new URLSearchParams();
      params.append('search', search.trim());
      
      if (storedLocation) {
        const locationData = JSON.parse(storedLocation);
        params.append('location', locationData.slug);
        
        if (storedCoords) {
          const coords = JSON.parse(storedCoords);
          if (coords.latitude && coords.longitude) {
            params.append('latitude', String(coords.latitude));
            params.append('longitude', String(coords.longitude));
            params.append('radius', '50');
          }
        }
      }

      router.push(`/ads?${params.toString()}`);
    } catch (error) {
      // Fallback: just search without location
      router.push(`/ads?search=${encodeURIComponent(search.trim())}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Input cursor blinking animation
  useEffect(() => {
    if (isUiFrozen) {
      setShowInputCursor(false);
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
        cursorIntervalRef.current = null;
      }
      return;
    }
    if (search) {
      setShowInputCursor(false);
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
      return;
    }

    cursorIntervalRef.current = setInterval(() => {
      setShowInputCursor(prev => !prev);
    }, 530);

    return () => {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
    };
  }, [search]);

  // Typewriter cursor blinking animation (independent of typing)
  useEffect(() => {
    if (isUiFrozen) {
      setShowTypewriterCursor(false);
      if (cursorBlinkRef.current) {
        clearInterval(cursorBlinkRef.current);
        cursorBlinkRef.current = null;
      }
      return;
    }
    cursorBlinkRef.current = setInterval(() => {
      setShowTypewriterCursor(prev => !prev);
    }, 530); // Smooth blink rate

    return () => {
      if (cursorBlinkRef.current) {
        clearInterval(cursorBlinkRef.current);
      }
    };
  }, [isUiFrozen]);

  // Typewriter effect for rotating phrases - improved continuous looping
  useEffect(() => {
    const currentPhrase = PHRASES[currentPhraseIndex];

    if (isUiFrozen) {
      if (typewriterRef.current) {
        clearTimeout(typewriterRef.current);
        typewriterRef.current = null;
      }
      return;
    }

    let isActive = true;
    // Seed from current state so resume doesn't restart
    phraseCharIndexRef.current = Math.min(phraseCharIndexRef.current, currentPhrase.length);

    const typeChar = () => {
      if (!isActive || isUiFrozen) return;

      if (phraseCharIndexRef.current < currentPhrase.length) {
        setAnimatedText(currentPhrase.substring(0, phraseCharIndexRef.current + 1));
        phraseCharIndexRef.current++;
        typewriterRef.current = setTimeout(typeChar, TYPE_SPEED);
      } else {
        // Finished typing - pause before erasing
        typewriterRef.current = setTimeout(() => {
          if (isActive && !isUiFrozen) {
            phraseDeletingRef.current = true;
            eraseChar();
          }
        }, PAUSE_AFTER_TYPE);
      }
    };

    const eraseChar = () => {
      if (!isActive || isUiFrozen) return;

      if (phraseCharIndexRef.current > 0) {
        setAnimatedText(currentPhrase.substring(0, phraseCharIndexRef.current - 1));
        phraseCharIndexRef.current--;
        typewriterRef.current = setTimeout(eraseChar, ERASE_SPEED);
      } else {
        // Finished erasing - clear text and immediately move to next phrase
        setAnimatedText('');
        phraseDeletingRef.current = false;
        
        // Move to next phrase immediately (for continuous looping)
        const nextIndex = (currentPhraseIndex + 1) % PHRASES.length;
        
        // Start typing next phrase immediately (no waiting)
        typewriterRef.current = setTimeout(() => {
          if (isActive && !isUiFrozen) {
            phraseCharIndexRef.current = 0;
            setCurrentPhraseIndex(nextIndex);
            // Start typing will be triggered by the useEffect dependency
          }
        }, PAUSE_AFTER_ERASE);
      }
    };

    if (currentPhrase) {
      // Continue from current position + direction
      if (phraseDeletingRef.current) {
        eraseChar();
      } else {
        typeChar();
      }
    }

    return () => {
      isActive = false;
      if (typewriterRef.current) {
        clearTimeout(typewriterRef.current);
      }
    };
  }, [currentPhraseIndex, isUiFrozen]); // Re-run when phrase changes for continuous loop

  // Typewriter effect for placeholder
  useEffect(() => {
    if (isUiFrozen) {
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
        typewriterTimeoutRef.current = null;
      }
      return;
    }
    // Don't animate if user has typed something
    if (search) {
      setPlaceholder('');
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
      return;
    }

    const currentExample = exampleSearches[currentExampleIndex];
    let isActive = true;

    const typeChar = () => {
      if (!isActive || search || isUiFrozen) return;

      if (placeholderCharIndexRef.current < currentExample.length) {
        setPlaceholder(currentExample.substring(0, placeholderCharIndexRef.current + 1));
        placeholderCharIndexRef.current++;
        typewriterTimeoutRef.current = setTimeout(typeChar, 80);
      } else {
        // Wait before deleting
        typewriterTimeoutRef.current = setTimeout(() => {
          const deleteChars = () => {
            if (!isActive || search || isUiFrozen) return;

            if (placeholderCharIndexRef.current > 0) {
              setPlaceholder(currentExample.substring(0, placeholderCharIndexRef.current - 1));
              placeholderCharIndexRef.current--;
              typewriterTimeoutRef.current = setTimeout(deleteChars, 40);
            } else {
              // Move to next example
              placeholderDeletingRef.current = false;
              setCurrentExampleIndex((prev) => (prev + 1) % exampleSearches.length);
            }
          };
          placeholderDeletingRef.current = true;
          deleteChars();
        }, 2000);
      }
    };

    // Start typing after a delay
    typewriterTimeoutRef.current = setTimeout(typeChar, 500);

    return () => {
      isActive = false;
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
    };
  }, [search, currentExampleIndex, isUiFrozen]);

  // Freeze Hero animations when auth modal opens (from Navbar)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOpen = () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = null;
      }
      setIsUiFrozen(true);
    };

    const handleClose = () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
      // Resume only after modal fade-out finishes
      resumeTimeoutRef.current = setTimeout(() => {
        setIsUiFrozen(false);
      }, 220);
    };

    window.addEventListener('onLoginModalOpen', handleOpen as EventListener);
    window.addEventListener('onLoginModalClose', handleClose as EventListener);

    return () => {
      window.removeEventListener('onLoginModalOpen', handleOpen as EventListener);
      window.removeEventListener('onLoginModalClose', handleClose as EventListener);
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`relative w-full h-[350px] md:h-[400px] overflow-hidden ${isUiFrozen ? 'ui-frozen' : ''}`}>
      {/* Dark blurred background with bokeh effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="absolute inset-0 opacity-30">
          {/* Bokeh lights effect */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-yellow-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-40 h-40 bg-orange-400 rounded-full blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute bottom-32 left-1/4 w-36 h-36 bg-blue-400 rounded-full blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-purple-400 rounded-full blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 md:mb-4">
            Find everything{' '}
            <span className="inline-block min-w-[120px] text-left">
              <span className="font-bold" style={{ color: '#FFD700' }}>
                {animatedText}
              </span>
              <span 
                className={`inline-block w-0.5 h-[1em] ml-1 align-middle transition-opacity duration-300 ${
                  showTypewriterCursor ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ 
                  backgroundColor: '#FFD700',
                  verticalAlign: 'baseline'
                }}
              >
                |
              </span>
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white">
            Buy smart. Sell fast. Right near you.
          </p>
        </div>
      </div>
    </div>
  );
}
