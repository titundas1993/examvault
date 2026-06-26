import React from "react";

export const metadata = {
  title: "Privacy Policy — ExamVault",
  description: "ExamVault Privacy Policy - How we collect, use, and protect your data",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-ev-navy mb-2">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: June 19, 2026</p>
        </div>

        {/* Content */}
        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-ev-navy mb-3">1. Introduction</h2>
            <p>
              ExamVault (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website (collectively, the &quot;Service&quot;). Please read this policy carefully. By using the Service, you agree to the practices described in this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ev-navy mb-3">2. Information We Collect</h2>
            <h3 className="text-lg font-semibold text-ev-navy mb-2">2.1 Personal Information</h3>
            <p>When you create an account or use our Service, we may collect:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Account Information:</strong> Your name, email address, and phone number when you register.</li>
              <li><strong>Profile Information:</strong> Profile photo and educational preferences you choose to provide.</li>
              <li><strong>Payment Information:</strong> When you purchase premium content, payment processing is handled by Razorpay. We do not store your full credit card or bank account details on our servers.</li>
            </ul>

            <h3 className="text-lg font-semibold text-ev-navy mb-2 mt-4">2.2 Usage Information</h3>
            <p>We automatically collect certain information when you use the Service, including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Test results, scores, and performance data.</li>
              <li>Content you have viewed or completed (progress tracking).</li>
              <li>Device information (device type, operating system, unique device identifiers).</li>
              <li>Log data (IP address, browser type, access times, pages viewed).</li>
            </ul>

            <h3 className="text-lg font-semibold text-ev-navy mb-2 mt-4">2.3 Information from Third Parties</h3>
            <p>We may collect information from third-party services, such as:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Google/Firebase Authentication:</strong> When you sign in using Google, we receive your name, email, and profile photo from your Google account.</li>
              <li><strong>Razorpay:</strong> Payment confirmation and transaction status.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ev-navy mb-3">3. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>To provide, maintain, and improve the Service.</li>
              <li>To create and manage your account and authenticate your identity.</li>
              <li>To deliver test results, performance analytics, and personalized learning recommendations.</li>
              <li>To process payments for premium content and subscriptions.</li>
              <li>To display your ranking on leaderboards (only if you opt in).</li>
              <li>To send notifications about new tests, announcements, and updates.</li>
              <li>To communicate with you about your account, support requests, and service changes.</li>
              <li>To monitor usage patterns and improve user experience.</li>
              <li>To detect, prevent, and address technical issues, fraud, or security threats.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ev-navy mb-3">4. How We Share Your Information</h2>
            <p>We do not sell your personal information. We may share your information only in the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Service Providers:</strong> We share information with third-party service providers who perform services on our behalf, such as Firebase (database and authentication), Razorpay (payment processing), and Vercel (hosting).</li>
              <li><strong>Leaderboards:</strong> If you participate in leaderboards, your name, photo, and score may be visible to other users.</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law, regulation, or legal process.</li>
              <li><strong>Safety:</strong> We may disclose information to protect the rights, property, or safety of ExamVault, our users, or the public.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ev-navy mb-3">5. Data Storage and Security</h2>
            <p>
              Your data is stored securely on Google Firebase servers with industry-standard encryption. We implement reasonable administrative, technical, and physical security measures to protect your information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
            <p>
              Data is stored on servers located in India. Your progress data is stored locally on your device using browser storage mechanisms and synced with our cloud servers when you are signed in.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ev-navy mb-3">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed to provide you the Service. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain certain information by law. Test results and leaderboard data may be retained in anonymized form.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ev-navy mb-3">7. Your Rights and Choices</h2>
            <p>You have the following rights regarding your personal information:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Access:</strong> You can view and update your profile information within the app at any time.</li>
              <li><strong>Deletion:</strong> You can request deletion of your account and associated data by contacting us at the email below.</li>
              <li><strong>Opt-out of Notifications:</strong> You can disable push notifications through your device settings.</li>
              <li><strong>Leaderboard Participation:</strong> You can choose whether or not to appear on leaderboards.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ev-navy mb-3">8. Children&apos;s Privacy</h2>
            <p>
              ExamVault is intended for students preparing for competitive examinations, typically aged 13 and above. We do not knowingly collect personal information from children under 13. If we learn that we have collected personal information from a child under 13, we will take steps to delete such information promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ev-navy mb-3">9. Third-Party Links</h2>
            <p>
              The Service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to read the privacy policies of any third-party services you access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ev-navy mb-3">10. Cookies and Tracking</h2>
            <p>
              We use Firebase Analytics and local storage to improve the Service. These tools may collect usage data through cookies and similar technologies. You can manage cookie preferences through your browser settings. Disabling cookies may affect certain features of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ev-navy mb-3">11. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after any changes constitutes acceptance of the updated Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ev-navy mb-3">12. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mt-3">
              <p><strong>ExamVault</strong></p>
              <p>Email: support@examvault.app</p>
              <p>Website: https://examvault-theta.vercel.app</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} ExamVault. All rights reserved.
        </div>
      </div>
    </div>
  );
}
