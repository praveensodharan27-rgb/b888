'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiSearch } from 'react-icons/fi';

interface HeroOGNOXProps {
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

export default function HeroOGNOX({ onLocationChange }: HeroOGNOXProps = {}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [exampleSearches, setExampleSearches] = useState(BASE_EXAMPLE_SEARCHES);
  const inputRef = useRef<HTMLInputElement>(null);
  const typewriterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cursorIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Cursor blinking animation
  useEffect(() => {
    if (search) {
      setShowCursor(false);
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
      return;
    }

    cursorIntervalRef.current = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);

    return () => {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
    };
  }, [search]);

  // Typewriter effect for placeholder
  useEffect(() => {
    // Don't animate if user has typed something
    if (search) {
      setPlaceholder('');
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
      return;
    }

    const currentExample = exampleSearches[currentExampleIndex];
    let charIndex = 0;
    let isActive = true;

    const typeChar = () => {
      if (!isActive || search) return;

      if (charIndex < currentExample.length) {
        setPlaceholder(currentExample.substring(0, charIndex + 1));
        charIndex++;
        typewriterTimeoutRef.current = setTimeout(typeChar, 80);
      } else {
        // Wait before deleting
        typewriterTimeoutRef.current = setTimeout(() => {
          const deleteChars = () => {
            if (!isActive || search) return;

            if (charIndex > 0) {
              setPlaceholder(currentExample.substring(0, charIndex - 1));
              charIndex--;
              typewriterTimeoutRef.current = setTimeout(deleteChars, 40);
            } else {
              // Move to next example
              setCurrentExampleIndex((prev) => (prev + 1) % exampleSearches.length);
            }
          };
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
  }, [search, currentExampleIndex]);

  return (
    <div className="relative w-full h-[350px] md:h-[400px] overflow-hidden">
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
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 md:mb-4">
            Find anything in your city
          </h1>
          <p className="text-lg md:text-xl text-gray-200">
            Buy and sell cars, properties, and more near you
          </p>
        </div>

        {/* Large Search Bar */}
        <div className="w-full max-w-4xl">
          <div className={`bg-white rounded-lg shadow-2xl flex flex-col md:flex-row items-stretch md:items-center overflow-hidden transition-all duration-300 ease-out ${
            isFocused ? 'md:scale-[1.01] md:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.25)] ring-2 ring-yellow-400/40' : ''
          }`}>
            {/* Search Input */}
            <div className="flex-1 flex items-center px-4 md:px-6 py-4 md:py-5">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm md:text-base text-gray-500 hidden sm:inline">Looking for?</span>
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyPress={handleKeyPress}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder=""
                    className="w-full text-sm md:text-base text-gray-700 border-none outline-none bg-transparent transition-all duration-300"
                  />
                  {!search && (
                    <div className="absolute inset-0 flex items-center pointer-events-none">
                      <span className="text-sm md:text-base text-gray-400">
                        {placeholder}
                        <span className={`inline-block w-0.5 h-4 md:h-5 bg-yellow-400 ml-0.5 align-middle ${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}>
                          {' '}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-6 md:px-8 py-4 md:py-5 flex items-center justify-center gap-2 transition-all duration-300"
            >
              <FiSearch className={`w-5 h-5 transition-transform duration-300 ease-out ${isFocused ? 'scale-105' : 'scale-100'}`} />
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
