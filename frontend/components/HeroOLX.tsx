'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
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

const ANIMATED_WORDS = ['your city', 'your love', 'your place'];

const HERO_CATEGORY_DEFAULTS = [
  { slug: 'electronics-appliances', subSlug: 'laptops', name: 'LAPTOP', icon: 'laptop_mac' },
  { slug: 'mobiles', subSlug: 'mobile-phones', name: 'MOBILE', icon: 'smartphone' },
  { slug: 'vehicles', subSlug: 'cars', name: 'CAR', icon: 'directions_car' },
  { slug: 'services', subSlug: undefined, name: 'SERVICE', icon: 'build' },
  { slug: 'jobs', subSlug: undefined, name: 'JOB', icon: 'work' },
  { slug: 'properties', subSlug: undefined, name: 'PROPERTY', icon: 'home' },
];

const CATEGORY_ICON_MAP: Record<string, string> = {
  mobiles: 'smartphone', electronics: 'smartphone', 'electronics-appliances': 'laptop',
  laptops: 'laptop', vehicles: 'directions_car', cars: 'directions_car', bikes: 'two_wheeler',
  properties: 'home', 'for-rent-houses-apartments': 'apartment', 'for-sale-houses-apartments': 'home',
  furniture: 'chair', fashion: 'watch', jewellery: 'diamond', pets: 'pets', books: 'menu_book',
  jobs: 'work', sports: 'sports_soccer', services: 'build',
};

export default function HeroOLX({ onLocationChange }: HeroOLXProps = {}) {
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
  
  // Animated words for heading
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const wordTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Animated words effect for heading
  useEffect(() => {
    const currentWord = ANIMATED_WORDS[currentWordIndex];
    let charIndex = isDeleting ? currentWord.length : 0;
    let isActive = true;

    const animateWord = () => {
      if (!isActive) return;

      if (!isDeleting && charIndex < currentWord.length) {
        // Typing
        setCurrentWord(currentWord.substring(0, charIndex + 1));
        charIndex++;
        wordTimeoutRef.current = setTimeout(animateWord, 100);
      } else if (isDeleting && charIndex > 0) {
        // Deleting
        setCurrentWord(currentWord.substring(0, charIndex - 1));
        charIndex--;
        wordTimeoutRef.current = setTimeout(animateWord, 50);
      } else if (!isDeleting && charIndex === currentWord.length) {
        // Finished typing, wait then delete
        wordTimeoutRef.current = setTimeout(() => {
          setIsDeleting(true);
          animateWord();
        }, 2000);
      } else if (isDeleting && charIndex === 0) {
        // Finished deleting, move to next word
        setIsDeleting(false);
        setCurrentWordIndex((prev) => (prev + 1) % ANIMATED_WORDS.length);
        wordTimeoutRef.current = setTimeout(animateWord, 500);
      }
    };

    animateWord();

    return () => {
      isActive = false;
      if (wordTimeoutRef.current) {
        clearTimeout(wordTimeoutRef.current);
      }
    };
  }, [currentWordIndex, isDeleting]);

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

  // Hero category buttons: Laptop, Mobile, Car, Service, Job, Property
  const heroCategories = useMemo(() => HERO_CATEGORY_DEFAULTS, []);

  const handleCategoryClick = (slug: string, subSlug?: string) => {
    const params = new URLSearchParams();
    params.set('category', slug);
    if (subSlug) params.set('subcategory', subSlug);
    router.push(`/ads?${params.toString()}`);
  };

  return (
    <div className="relative w-full min-h-[340px] md:min-h-[400px] overflow-hidden">
      {/* Dark blue gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
        <div className="absolute inset-0 opacity-30">
          {/* Bokeh lights effect */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-yellow-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-40 h-40 bg-orange-400 rounded-full blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute bottom-32 left-1/4 w-36 h-36 bg-blue-400 rounded-full blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-purple-400 rounded-full blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        </div>
      </div>

      {/* Content - all centered, width aligned with main content */}
      <div className="relative z-10 min-h-[340px] md:min-h-[400px] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-6">
        <div className="w-full max-w-[1400px] mx-auto flex flex-col items-center justify-center gap-6 md:gap-8">
          {/* Heading - centered */}
          <div className="flex flex-col items-center justify-center text-center">
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-3 md:mb-4 tracking-tight">
              Find anything in{' '}
              <span className="inline-block min-w-[200px] text-left">
                <span className="text-yellow-400">{currentWord}</span>
                <span className={`inline-block w-0.5 h-8 md:h-10 bg-yellow-400 ml-1 align-middle ${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}>
                  {' '}
                </span>
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-200">
              Buy and sell cars, properties, and more near you
            </p>
          </div>

          {/* 6 Category cards - glassmorphism style, centered row */}
          <div className="w-full flex justify-center overflow-x-auto scrollbar-hide">
            <div className="grid grid-cols-6 gap-2 sm:gap-3 md:gap-4 place-items-center min-w-0 max-w-2xl mx-auto">
              {heroCategories.map((cat) => (
                <button
                  key={`${cat.slug}-${cat.subSlug || ''}-${cat.name}`}
                  type="button"
                  onClick={() => handleCategoryClick(cat.slug, cat.subSlug)}
                  className="group flex flex-col items-center justify-center gap-2 py-4 px-3 min-h-[calc(5rem+1px)] rounded-2xl border border-white/[0.15] bg-white/[0.05] hover:bg-white/[0.1] hover:border-white/25 transition-all duration-300 w-full max-w-[79px] md:max-w-[91px]"
                >
                  <span
                    className="material-symbols-outlined flex items-center justify-center text-[28px] md:text-[30px] text-[#4499FF] group-hover:text-yellow-400 transition-all duration-300 group-hover:drop-shadow-[0_0_12px_rgba(250,204,21,0.8)] group-hover:scale-110"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {cat.icon}
                  </span>
                  <span className="text-[11px] md:text-xs font-semibold text-white/95 uppercase tracking-widest text-center leading-tight">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
