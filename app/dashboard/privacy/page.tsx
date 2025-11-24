'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiChevronLeft, FiDownload, FiTrash2, FiAlertTriangle, FiCheckCircle, FiLoader, FiShield, FiDatabase, FiUser } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import { UserNavbar } from '@/components/UserNavbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface UserData {
  profile: {
    userId: string;
    email: string;
    userName: string;
    createdAt: string;
    lastActivity: string;
  };
  metaConnections: {
    pageId?: string;
    pageName?: string;
    igBusinessId?: string;
    igUsername?: string;
    connected: boolean;
    lastTokenRefresh?: string;
  };
  contentData: {
    totalPosts: number;
    totalImages: number;
    storageUsed: string;
  };
  activityLog: Array<{
    action: string;
    timestamp: string;
    details: string;
  }>;
}

export default function PrivacyDataPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (isAuthenticated && user?.email) {
      fetchUserData();
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchUserData = async () => {
    if (!user?.email) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/user/privacy-data?email=${encodeURIComponent(user.email)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      setUserData(data);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load privacy data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    if (!user?.email) return;

    setExportLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/user/export-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `autopost-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess('Data exported successfully! Check your downloads folder.');
    } catch (error) {
      console.error('Error exporting data:', error);
      setError('Failed to export data. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteMetaConnection = async () => {
    if (!user?.email) return;

    setDeleteLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/user/delete-meta-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });

      if (!response.ok) {
        throw new Error('Failed to delete Meta connection');
      }

      setSuccess('Meta account connection removed successfully.');
      await fetchUserData(); // Refresh data
    } catch (error) {
      console.error('Error deleting Meta connection:', error);
      setError('Failed to remove Meta connection. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.email || deleteConfirmText !== 'DELETE MY ACCOUNT') return;

    setDeleteLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: user.email,
          confirmationText: deleteConfirmText
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      // Redirect to confirmation page
      router.push('/account-deleted');
    } catch (error) {
      console.error('Error deleting account:', error);
      setError('Failed to delete account. Please try again.');
      setDeleteLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <FiLoader className="text-4xl animate-spin text-zinc-900 dark:text-white mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400 font-medium">Loading privacy data...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <UserNavbar showCancelUpload={false} />
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20 pt-16">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors mb-6"
          >
            <FiChevronLeft />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FiShield className="text-blue-600 dark:text-blue-400 text-xl" />
            </div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Privacy & Data</h1>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg">
            Manage your data, privacy settings, and account deletion options.
          </p>
        </motion.div>

        {/* Error/Success Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <FiAlertTriangle />
              <span>{error}</span>
            </div>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
          >
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <FiCheckCircle />
              <span>{success}</span>
            </div>
          </motion.div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Account Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <FiUser className="text-blue-600 dark:text-blue-400 text-xl" />
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Account Information</h2>
              </div>

              {userData && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Email</label>
                    <p className="text-zinc-900 dark:text-white">{userData.profile.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Username</label>
                    <p className="text-zinc-900 dark:text-white">{userData.profile.userName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Account Created</label>
                    <p className="text-zinc-900 dark:text-white">{new Date(userData.profile.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Last Activity</label>
                    <p className="text-zinc-900 dark:text-white">{new Date(userData.profile.lastActivity).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Connected Accounts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <FiDatabase className="text-purple-600 dark:text-purple-400 text-xl" />
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Connected Accounts</h2>
              </div>

              {userData?.metaConnections.connected ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FiCheckCircle className="text-green-600 dark:text-green-400" />
                      <span className="font-medium text-green-800 dark:text-green-200">Meta Accounts Connected</span>
                    </div>
                    {userData.metaConnections.pageName && (
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Facebook: {userData.metaConnections.pageName}
                      </p>
                    )}
                    {userData.metaConnections.igUsername && (
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Instagram: @{userData.metaConnections.igUsername}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    onClick={handleDeleteMetaConnection}
                    disabled={deleteLoading}
                    variant="outline"
                    className="w-full text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    {deleteLoading ? (
                      <>
                        <FiLoader className="animate-spin mr-2" />
                        Disconnecting...
                      </>
                    ) : (
                      <>
                        <FiTrash2 className="mr-2" />
                        Disconnect Meta Accounts
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-200">No Meta accounts connected</p>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Data Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <FiDatabase className="text-orange-600 dark:text-orange-400 text-xl" />
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Data Summary</h2>
              </div>

              {userData && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Total Posts</span>
                    <span className="font-medium text-zinc-900 dark:text-white">{userData.contentData.totalPosts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Images Uploaded</span>
                    <span className="font-medium text-zinc-900 dark:text-white">{userData.contentData.totalImages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Storage Used</span>
                    <span className="font-medium text-zinc-900 dark:text-white">{userData.contentData.storageUsed}</span>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Data Export */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <FiDownload className="text-blue-600 dark:text-blue-400 text-xl" />
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Export Your Data</h2>
              </div>

              <p className="text-zinc-600 dark:text-zinc-400 mb-4 text-sm">
                Download a complete copy of all your data in JSON format. This includes your profile information, posts, and activity history.
              </p>

              <Button
                onClick={handleExportData}
                disabled={exportLoading}
                className="w-full"
              >
                {exportLoading ? (
                  <>
                    <FiLoader className="animate-spin mr-2" />
                    Preparing Export...
                  </>
                ) : (
                  <>
                    <FiDownload className="mr-2" />
                    Download My Data
                  </>
                )}
              </Button>
            </Card>
          </motion.div>
        </div>

        {/* Account Deletion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8"
        >
          <Card className="p-6 border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3 mb-4">
              <FiAlertTriangle className="text-red-600 dark:text-red-400 text-xl" />
              <h2 className="text-xl font-semibold text-red-900 dark:text-red-200">Delete Account</h2>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-800 dark:text-red-200 font-medium mb-2">⚠️ This action cannot be undone!</p>
              <p className="text-red-700 dark:text-red-300 text-sm">
                Deleting your account will permanently remove:
              </p>
              <ul className="text-red-700 dark:text-red-300 text-sm mt-2 ml-4 list-disc">
                <li>Your profile and account information</li>
                <li>All uploaded images and content</li>
                <li>Social media connections and tokens</li>
                <li>Post history and analytics data</li>
              </ul>
            </div>

            {!showDeleteConfirm ? (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="outline"
                className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <FiTrash2 className="mr-2" />
                Delete My Account
              </Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Type "DELETE MY ACCOUNT" to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE MY ACCOUNT"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'DELETE MY ACCOUNT' || deleteLoading}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {deleteLoading ? (
                      <>
                        <FiLoader className="animate-spin mr-2" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <FiTrash2 className="mr-2" />
                        Delete Account
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
        </div>
      </div>
    </>
  );
}