'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiInstagram, FiLoader } from 'react-icons/fi';
import { FaFacebook } from 'react-icons/fa';

interface Page {
  pageId: string;
  pageName: string;
  category?: string;
  tasks?: string[];
  igBusinessId?: string;
  igUsername?: string;
  isActive: boolean;
}

interface PageSelectorProps {
  userId: string;
  onPageChange?: (pageId: string) => void;
}

export function PageSelector({ userId, onPageChange }: PageSelectorProps) {
  const [pages, setPages] = useState<Page[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPages();
  }, [userId]);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/user/pages?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch pages');
      }

      const data = await response.json();
      setPages(data.pages || []);
      setActivePageId(data.activePageId);
    } catch (err) {
      console.error('Error fetching pages:', err);
      setError('Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  const handlePageSelect = async (pageId: string) => {
    if (pageId === activePageId || switching) return;

    try {
      setSwitching(true);
      setError(null);

      const response = await fetch('/api/user/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pageId }),
      });

      if (!response.ok) {
        throw new Error('Failed to switch page');
      }

      const data = await response.json();
      setActivePageId(data.activePageId);
      setPages(pages.map(p => ({ ...p, isActive: p.pageId === pageId })));

      if (onPageChange) {
        onPageChange(pageId);
      }
    } catch (err) {
      console.error('Error switching page:', err);
      setError('Failed to switch page');
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-center gap-3">
          <FiLoader className="animate-spin text-zinc-600 dark:text-zinc-400" />
          <span className="text-zinc-600 dark:text-zinc-400 text-sm">Loading pages...</span>
        </div>
      </div>
    );
  }

  if (pages.length === 0) {
    return null; // Don't show if no pages
  }

  if (pages.length === 1) {
    // Show info card for single page
    const page = pages[0];
    return (
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <FaFacebook className="text-blue-600 dark:text-blue-400 text-xl mt-0.5" />
          <div className="flex-1">
            <h4 className="text-blue-900 dark:text-blue-200 font-medium">{page.pageName}</h4>
            <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
              {page.category || 'Facebook Page'}
            </p>
            {page.igUsername && (
              <div className="flex items-center gap-2 mt-2 text-sm text-blue-700 dark:text-blue-300">
                <FiInstagram />
                <span>@{page.igUsername}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
          Select Page for Posting
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Choose which page you want to publish to
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="grid gap-3">
        <AnimatePresence>
          {pages.map((page) => (
            <motion.button
              key={page.pageId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={() => handlePageSelect(page.pageId)}
              disabled={switching}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-left
                ${page.isActive
                  ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600'
                }
                ${switching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <FaFacebook className={`text-xl mt-0.5 ${page.isActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400'}`} />
                  <div className="flex-1">
                    <h4 className={`font-medium ${page.isActive ? 'text-blue-900 dark:text-blue-200' : 'text-zinc-900 dark:text-white'}`}>
                      {page.pageName}
                    </h4>
                    <p className={`text-sm mt-1 ${page.isActive ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-600 dark:text-zinc-400'}`}>
                      {page.category || 'Facebook Page'}
                    </p>
                    {page.igUsername && (
                      <div className={`flex items-center gap-2 mt-2 text-sm ${page.isActive ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-600 dark:text-zinc-400'}`}>
                        <FiInstagram />
                        <span>@{page.igUsername}</span>
                      </div>
                    )}
                  </div>
                </div>
                {page.isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 dark:bg-blue-400 text-white dark:text-blue-900"
                  >
                    <FiCheck className="text-sm" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
