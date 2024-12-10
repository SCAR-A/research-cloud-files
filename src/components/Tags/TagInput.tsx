import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';

interface TagInputProps {
  tags: string[];
  suggestions?: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
}

export function TagInput({
  tags,
  suggestions = [],
  onAddTag,
  onRemoveTag,
  placeholder = '输入标签...',
  maxTags = Infinity,
  className = ''
}: TagInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const filtered = suggestions.filter(
      suggestion =>
        suggestion.toLowerCase().includes(input.toLowerCase()) &&
        !tags.includes(suggestion)
    );
    setFilteredSuggestions(filtered);
  }, [input, suggestions, tags]);

  useEffect(() => {
    function updateDropdownPosition() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !document.getElementById('tag-suggestions')?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    updateDropdownPosition();
    window.addEventListener('scroll', updateDropdownPosition, true);
    window.addEventListener('resize', updateDropdownPosition);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setShowSuggestions(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      if (tags.length < maxTags && !tags.includes(input.trim())) {
        onAddTag(input.trim());
        setInput('');
      }
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onRemoveTag(tags[tags.length - 1]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (tags.length < maxTags) {
      onAddTag(suggestion);
      setInput('');
      setShowSuggestions(false);
    }
  };

  const Suggestions = () => {
    if (!showSuggestions || filteredSuggestions.length === 0) return null;

    return createPortal(
      <motion.div
        id="tag-suggestions"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        style={{
          position: 'absolute',
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          zIndex: 9999
        }}
        className="bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto"
      >
        {filteredSuggestions.map((suggestion, index) => (
          <motion.button
            key={index}
            whileHover={{ backgroundColor: 'rgb(243, 244, 246)' }}
            onClick={() => handleSuggestionClick(suggestion)}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors"
          >
            {suggestion}
          </motion.button>
        ))}
      </motion.div>,
      document.body
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg bg-white min-h-[42px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <AnimatePresence>
          {tags.map((tag, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemoveTag(tag)}
                className="hover:text-blue-600 rounded-full p-0.5 hover:bg-blue-200 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <div className="flex-1 flex items-center min-w-[60px]">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder={tags.length < maxTags ? placeholder : ''}
            disabled={tags.length >= maxTags}
            className="flex-1 outline-none bg-transparent text-sm"
          />
          {suggestions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>
      <AnimatePresence>
        <Suggestions />
      </AnimatePresence>
    </div>
  );
}