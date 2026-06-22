import React from "react";

export const metadata = {
  title: "Delete Account — ExamVault",
  description: "Request account and data deletion for ExamVault",
};

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-ev-navy mb-2">Delete Your Account</h1>
          <p className="text-gray-500 text-sm">ExamVault Account & Data Deletion Request</p>
        </div>

        {/* Content */}
        <div className="space-y-6 text-gray-700 leading-relaxed">

          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-red-700 mb-2">⚠️ Important Warning</h2>
            <p className="text-red-600">
              Deleting your account is <strong>permanent and irreversible</strong>. All your data will be permanently erased and cannot be recovered.
            </p>
          </div>

          {/* What gets deleted */}
          <section>
            <h2 className="text-xl font-bold text-ev-navy mb-3">What Data Will Be Deleted</h2>
            <p>When you request account deletion, the following data will be <strong>permanently removed</strong>:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li><strong>Profile Information</strong> — Name, email address, phone number, profile photo</li>
              <li><strong>Account Data</strong> — Firebase authentication credentials</li>
              <li><strong>Test History</strong> — Mock test scores, quiz results, leaderboard entries</li>
              <li><strong>Payment Records</strong> — Subscription history, payment transactions</li>
              <li><strong>Preferences</strong> — App settings, language preferences, notification settings</li>
              <li><strong>Premium Access</strong> — Any active premium subscription will be cancelled</li>
            </ul>
          </section>

          {/* What is retained */}
          <section>
            <h2 className="text-xl font-bold text-ev-navy mb-3">Data Retention</h2>
            <p>The following data may be retained for legal or operational reasons:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li><strong>Transaction Records</strong> — Basic payment records retained for 30 days as required by financial regulations</li>
              <li><strong>Anonymized Analytics</strong> — Aggregated, non-personal usage data that cannot identify you</li>
            </ul>
            <p className="mt-3">All retained data will be automatically deleted within <strong>30 days</strong> of your deletion request.</p>
          </section>

          {/* How to request */}
          <section className="bg-gray-50 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-ev-navy mb-3">How to Request Account Deletion</h2>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-ev-navy text-white flex items-center justify-center font-bold text-sm">1</span>
                <div>
                  <h3 className="font-semibold text-ev-navy">Via Email</h3>
                  <p>Send an email to <strong>lkstudeoandcomputering@gmail.com</strong> with the subject line <strong>&quot;Account Deletion Request&quot;</strong>. Include the email address or phone number associated with your ExamVault account.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-ev-navy text-white flex items-center justify-center font-bold text-sm">2</span>
                <div>
                  <h3 className="font-semibold text-ev-navy">Verification</h3>
                  <p>We will verify your identity by sending a confirmation to your registered email or phone number. You must confirm the deletion request to proceed.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-ev-navy text-white flex items-center justify-center font-bold text-sm">3</span>
                <div>
                  <h3 className="font-semibold text-ev-navy">Processing</h3>
                  <p>Your account and all associated data will be deleted within <strong>7 business days</strong> of confirmation. You will receive a confirmation email once deletion is complete.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Timeline */}
          <section>
            <h2 className="text-xl font-bold text-ev-navy mb-3">Deletion Timeline</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-ev-navy text-white">
                    <th className="px-4 py-3 text-left rounded-tl-lg">Step</th>
                    <th className="px-4 py-3 text-left">Action</th>
                    <th className="px-4 py-3 text-left rounded-tr-lg">Timeframe</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium">1</td>
                    <td className="px-4 py-3">Deletion request received</td>
                    <td className="px-4 py-3">Day 0</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium">2</td>
                    <td className="px-4 py-3">Identity verification</td>
                    <td className="px-4 py-3">Day 0–1</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium">3</td>
                    <td className="px-4 py-3">Account deactivated (no access)</td>
                    <td className="px-4 py-3">Day 1</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium">4</td>
                    <td className="px-4 py-3">All data permanently deleted</td>
                    <td className="px-4 py-3">Day 1–7</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">5</td>
                    <td className="px-4 py-3">Confirmation email sent</td>
                    <td className="px-4 py-3">Day 7</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-blue-50 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-ev-navy mb-3">Need Help?</h2>
            <p>If you have any questions about account deletion or need assistance, please contact us:</p>
            <p className="mt-2">
              <strong>Email:</strong> lkstudeoandcomputering@gmail.com<br />
              <strong>Subject:</strong> Account Deletion Request
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
