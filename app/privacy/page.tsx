export default function PrivacyPolicy() {
  return (
    <main className="max-w-4xl mx-auto p-8 py-12">
      <div className="space-y-8">
        <section>
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-gray-600 dark:text-gray-400">Last updated: November 2025</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Overview</h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            AutoPost is a social media automation tool that helps real estate professionals create and publish posts to Facebook and Instagram. We are committed to protecting your privacy and ensuring transparent handling of your data.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Data We Collect</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>Authentication Data:</strong> Your email address and authentication tokens from Google/Meta</li>
            <li><strong>Social Media Tokens:</strong> Access tokens from Facebook and Instagram for posting functionality</li>
            <li><strong>Account Information:</strong> Your profile data from connected Meta accounts (page name, username)</li>
            <li><strong>Usage Data:</strong> Timestamps of your activities for analytics and security</li>
            <li><strong>Uploaded Content:</strong> Images and captions you upload for posting</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Data</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li>To authenticate and authorize your account access</li>
            <li>To facilitate posting to your connected Facebook and Instagram accounts</li>
            <li>To provide analytics and usage statistics</li>
            <li>To improve our service and user experience</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Data Storage & Security</h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            All sensitive data, including authentication tokens, are encrypted using industry-standard encryption methods. We store data only as long as necessary to provide our services. Access tokens are automatically managed and refreshed by Meta's systems.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Your Data Rights (GDPR & Privacy Laws)</h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            You have the following rights regarding your personal data:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>Right to Access:</strong> Request a copy of all data we hold about you</li>
            <li><strong>Right to Rectification:</strong> Correct inaccurate personal data</li>
            <li><strong>Right to Erasure:</strong> Request deletion of your data (see section 6)</li>
            <li><strong>Right to Data Portability:</strong> Export your data in machine-readable format</li>
            <li><strong>Right to Withdraw Consent:</strong> Disconnect Meta accounts at any time</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Data Deletion & Account Closure</h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            You can manage your data and request deletion through our Privacy & Data portal:
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <p className="font-mono text-sm text-blue-900 dark:text-blue-200">
              {typeof window !== 'undefined' ? `${window.location.origin}/dashboard/privacy` : 'https://yoursite.com/dashboard/privacy'}
            </p>
          </div>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            In this portal, you can:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li>View all data we hold about you</li>
            <li>Export your data in JSON format</li>
            <li>Disconnect your Meta accounts</li>
            <li>Request permanent account deletion</li>
          </ul>
          <p className="mt-4 text-gray-700 dark:text-gray-300">
            When you request account deletion, we will:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li>Immediately disconnect your Meta tokens</li>
            <li>Delete all your personal data from our servers</li>
            <li>Notify Meta to revoke our access to your accounts</li>
            <li>Permanently remove your account and all associated data</li>
          </ul>
          <p className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-900 dark:text-yellow-200">
            <strong>Note:</strong> This action cannot be undone. After deletion, you will need to create a new account if you want to use AutoPost again.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Meta Data Handling</h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            We comply with Meta's Platform Terms and data handling requirements:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li>All data obtained from Meta is used solely for posting functionality</li>
            <li>We never share Meta data with third parties</li>
            <li>Access tokens are stored encrypted and never exposed</li>
            <li>You can revoke access at any time through Meta's settings or our platform</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Contact & Support</h2>
          <p className="text-gray-700 dark:text-gray-300">
            For any privacy concerns, data requests, or questions:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mt-2">
            <li><strong>Email:</strong> <a href="mailto:info@realtygenie.co" className="text-blue-600 dark:text-blue-400 hover:underline">info@realtygenie.co</a></li>
            <li><strong>Data Privacy Portal:</strong> <a href="/dashboard/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">/dashboard/privacy</a></li>
          </ul>
        </section>

        <section className="pt-8 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            By using AutoPost, you consent to this Privacy Policy. We reserve the right to update this policy at any time. Changes will be effective immediately upon posting.
          </p>
        </section>
      </div>
    </main>
  );
}
