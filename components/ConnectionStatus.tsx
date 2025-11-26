'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiAlertCircle, FiInstagram, FiRefreshCw } from 'react-icons/fi';
import { FaFacebook } from 'react-icons/fa';

interface ConnectionStatusProps {
  userId: string;
}

interface PageInfo {
  pageId: string;
  pageName: string;
  igBusinessId?: string;
  igUsername?: string;
}

export function ConnectionStatus({ userId }: ConnectionStatusProps) {
  const [activePage, setActivePage] = useState<PageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPages, setHasPages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConnectionStatus = async () => {
    try {
      const response = await fetch(`/api/user/pages?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Connection status data:', data); // Debug log
        
        if (data.pages && data.pages.length > 0) {
          setHasPages(true);
          // Find the active page
          const active = data.pages.find((p: PageInfo & { isActive?: boolean }) => p.isActive);
          setActivePage(active || data.pages[0] || null);
        } else {
          setHasPages(false);
          setActivePage(null);
        }
      } else {
        console.error('Failed to fetch pages:', response.status);
        setHasPages(false);
        setActivePage(null);
      }
    } catch (error) {
      console.error('Failed to fetch connection status:', error);
      setHasPages(false);
      setActivePage(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchConnectionStatus();
    }
  }, [userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchConnectionStatus();
  };

  if (loading) {
    return null;
  }

  // If no pages at all, show connect Meta accounts message
  if (!hasPages || !activePage) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
      >
        <div className="flex items-start gap-3">
          <FiAlertCircle className="text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-1">No Facebook Page Connected</p>
            <p className="text-yellow-600 dark:text-yellow-400 text-sm">Please connect your Meta accounts to start posting.</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Check actual connection status
  const hasFacebook = !!activePage.pageId && !!activePage.pageName;
  const hasInstagram = !!activePage.igBusinessId && !!activePage.igUsername;
  const fullyConnected = hasFacebook && hasInstagram;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`mb-6 p-4 rounded-lg border ${
        fullyConnected
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      }`}
    >
      <div className="flex items-start gap-3">
        {fullyConnected ? (
          <FiCheckCircle className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
        ) : (
          <FiAlertCircle className="text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
        )}
        <div className="flex-1">
          <p className={`font-medium mb-2 ${
            fullyConnected
              ? 'text-green-800 dark:text-green-200'
              : 'text-yellow-800 dark:text-yellow-200'
          }`}>
            {fullyConnected ? 'Fully Connected' : 'Partial Connection'}
          </p>
          
          <div className="space-y-2">
            {/* Facebook Status */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${
                hasFacebook
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}>
                <FaFacebook className="text-sm" />
                <span className="text-xs font-medium">
                  {hasFacebook ? activePage.pageName : 'Not Connected'}
                </span>
                {hasFacebook && <FiCheckCircle className="text-xs" />}
              </div>
            </div>

            {/* Instagram Status */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${
                hasInstagram
                  ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}>
                <FiInstagram className="text-sm" />
                <span className="text-xs font-medium">
                  {hasInstagram ? `@${activePage.igUsername}` : 'Not Connected'}
                </span>
                {hasInstagram && <FiCheckCircle className="text-xs" />}
              </div>
            </div>
          </div>

          {!fullyConnected && hasFacebook && !hasInstagram && (
            <>
              <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-3 mb-2">
                Connect Instagram to your Facebook Page: Go to your Facebook Page settings → Instagram → Connect Account. Then reconnect below.
              </p>
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex-1 px-3 py-1.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Refreshing...' : 'Refresh Status'}
                </button>
                <a
                  href="/connect"
                  className="flex-1 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                >
                  Reconnect Meta
                </a>
              </div>
            </>
          )}
          {!fullyConnected && !hasFacebook && (
            <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-3">
              Connect a Facebook Page to continue.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
