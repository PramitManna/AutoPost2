'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface UserNavbarProps {
  onCancelUpload?: () => void;
  showCancelUpload?: boolean;
}

export function UserNavbar({ onCancelUpload, showCancelUpload = false }: UserNavbarProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="fixed top-0 left-0 w-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800 z-[100] px-4 py-2">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          AutoPost
        </div>
        
        <div className="flex items-center gap-3">
          {/* Cancel Upload Button */}
          {showCancelUpload && onCancelUpload && (
            <Button
              onClick={onCancelUpload}
              variant="outline"
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 hover:border-red-500/50 rounded-lg transition-all duration-200 font-medium text-sm"
            >
              Cancel Upload
            </Button>
          )}

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="User profile menu"
            >
              {user?.user_metadata?.name?.[0]?.toUpperCase() || 'U'}
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-56 z-50"
                >
                  <Card className="shadow-lg border-gray-200 dark:border-gray-700">
                    <div className="p-4 space-y-3">
                      {/* User Info */}
                      <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-600">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                          {user?.user_metadata?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {user?.user_metadata?.name || 'User'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user?.email}
                          </p>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="space-y-1">
                        <Button
                          onClick={() => {
                            router.push('/dashboard');
                            setIsDropdownOpen(false);
                          }}
                          variant="ghost"
                          className="w-full justify-start text-left h-auto p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <span className="text-sm">Go to Dashboard</span>
                        </Button>
                        
                        <Button
                          onClick={() => {
                            router.push('/dashboard/privacy');
                            setIsDropdownOpen(false);
                          }}
                          variant="ghost"
                          className="w-full justify-start text-left h-auto p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <span className="text-sm">Profile Info</span>
                        </Button>
                        
                        <Button
                          onClick={() => {
                            router.push('/privacy');
                            setIsDropdownOpen(false);
                          }}
                          variant="ghost"
                          className="w-full justify-start text-left h-auto p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <span className="text-sm">Privacy & Policy</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}