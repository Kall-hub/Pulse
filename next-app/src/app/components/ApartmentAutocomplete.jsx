"use client";
import { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../Config/firebaseConfig';
import { BiBuildings, BiSearch } from 'react-icons/bi';

const ApartmentAutocomplete = ({ value, onChange, placeholder = "e.g. HILLCREST A612", autoFocus = true, onSelect = null }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);

  // Fetch buildings on mount
  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const buildingsSnapshot = await getDocs(collection(db, "buildings"));
        const buildingsData = buildingsSnapshot.docs.map(doc => ({
          building: doc.data().name,
          units: doc.data().units || []
        }));
        setBuildings(buildingsData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching buildings:", error);
        setLoading(false);
      }
    };
    fetchBuildings();
  }, []);

  // Generate suggestions based on input
  const generateSuggestions = (input) => {
    if (!input.trim()) {
      setSuggestions([]);
      return;
    }

    const query = input.toLowerCase();
    const allUnits = [];

    buildings.forEach(building => {
      building.units.forEach(unit => {
        const displayName = `${building.building} ${unit.number}`.toLowerCase();
        const fullName = `${building.building} ${unit.number}`;
        
        if (displayName.includes(query)) {
          allUnits.push({
            building: building.building,
            unit: unit.number,
            fullName
          });
        }
      });
    });

    // Sort by relevance (exact start match first, then contains)
    const sorted = allUnits.sort((a, b) => {
      const aStartsWith = a.fullName.toLowerCase().startsWith(query);
      const bStartsWith = b.fullName.toLowerCase().startsWith(query);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return a.fullName.localeCompare(b.fullName);
    });

    setSuggestions(sorted.slice(0, 8)); // Limit to 8 suggestions
    setIsOpen(true);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value.toUpperCase();
    onChange(newValue);
    generateSuggestions(newValue);
  };

  // Handle suggestion click
  const handleSelectSuggestion = (suggestion) => {
    const fullUnit = `${suggestion.building} ${suggestion.unit}`;
    onChange(fullUnit);
    setSuggestions([]);
    setIsOpen(false);
    if (onSelect) onSelect(fullUnit);
    
    // Trigger Pulse awareness that a unit was selected
    if (window.pulseAwareness) {
      window.pulseAwareness.onUnitSelected(fullUnit);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      <div className="relative">
        {/* Icon */}
        <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
        
        {/* Input */}
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (value.trim()) {
              setIsOpen(true);
            }
          }}
          className="w-full bg-slate-50 border border-slate-100 p-5 pl-12 rounded-2xl font-black uppercase outline-none focus:ring-2 ring-blue-600 text-slate-900 placeholder:text-slate-300 transition-all"
        />

        {/* Pulse indicator - shows app is aware */}
        {value && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {suggestions.length > 0 ? (
              <div className="text-[10px] font-black text-blue-600 flex items-center gap-1">
                <BiBuildings size={14} />
                <span>{suggestions.length} match</span>
              </div>
            ) : (
              <div className="text-[10px] font-bold text-slate-400">Pulse is thinking...</div>
            )}
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-64 overflow-y-auto custom-scrollbar">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0 flex items-center gap-3"
            >
              <BiBuildings className="text-blue-600 shrink-0" size={16} />
              <div>
                <p className="text-sm font-black text-slate-900">{suggestion.fullName}</p>
                <p className="text-[8px] text-slate-400">{suggestion.building}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && value && suggestions.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase">
            No exact matches found <span className="text-slate-300">— but you can type anything!</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default ApartmentAutocomplete;
