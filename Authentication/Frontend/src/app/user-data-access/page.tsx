import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/legal-document';

export const metadata: Metadata = {
  title: 'User Data Access & Acceptable Use — Shule+',
  description:
    'How users can retrieve their data from the Shule+ platform, and what users are allowed and not allowed to do.',
};

export default function UserDataAccessPage() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="User Data Access & Acceptable Use"
      effectiveDate="August 2, 2026"
      lastUpdated="August 2, 2026"
      summary="This document explains how you can access and retrieve your personal data from the Shule+ platform, and clearly describes what you are allowed and not allowed to do as a user. It complements our Privacy Policy and Terms & Conditions."
      sections={[
        {
          id: 'overview',
          heading: 'Overview',
          paragraphs: [
            'As a user of the Shule+ platform, you have control over the data you enter and you have clear rights over your personal data. This document brings together, in one place, everything you need to know about retrieving your data and the boundaries of acceptable behavior on the platform.',
          ],
        },
        {
          id: 'data-you-can-access',
          heading: 'Data You Can Retrieve',
          paragraphs: [
            'You are entitled to access and retrieve the personal data that relates to you, plus the operational data you are explicitly authorized to view by your organization. The table below summarizes the main categories.',
            'Access to operational data is always limited by your role, your organization\u2019s permissions, and applicable law.',
          ],
          bullets: [
            'Your profile data: name, email, phone number, role, organization, and account settings.',
            'Your authentication data: login activity, last sign-in, security and multi-factor settings.',
            'Your own records: data you entered into the platform, such as submissions, comments, and saved information.',
            'Authorized operational data: the data your role permits you to see (e.g., a teacher sees classes they teach, a bursar sees fee records they manage).',
            'Communication data: messages and notifications addressed to you.',
          ],
        },
        {
          id: 'how-to-retrieve',
          heading: 'How to Retrieve Your Data',
          paragraphs: [
            'You can retrieve your data in several ways, depending on what you need:',
          ],
          subSections: [
            {
              heading: 'View data in the platform',
              paragraphs: [
                'Most data can be viewed directly in the platform. Use the profile and settings pages to review your personal information, and the module pages to review operational records you are authorized to see.',
              ],
            },
            {
              heading: 'Export reports and files',
              paragraphs: [
                'Where an export feature is available, you can download your data in common formats (PDF, Excel, CSV). This covers the screens and records you are authorized to access.',
                'Some records may not be exportable where restricted by your organization\u2019s policies or applicable law.',
              ],
            },
            {
              heading: 'Submit a data request',
              paragraphs: [
                'To retrieve a complete copy of your personal data, or data you cannot export yourself, submit a data access request to your organization administrator or to us at privacy@shuleplus.com. We will respond within the timeframe required by applicable law.',
              ],
            },
          ],
          bullets: [
            'Keep your account details up to date so that requests and notifications reach you.',
            'Where an administrator manages your account, contact them first for organization-level records.',
            'We may ask you to verify your identity before fulfilling a request, to protect your data from unauthorized access.',
          ],
        },
        {
          id: 'correction-and-deletion',
          heading: 'Correcting and Deleting Your Data',
          paragraphs: [
            'You may correct inaccurate personal data at any time through your profile settings. You may also request deletion of your personal data, subject to legal and administrative retention requirements.',
            'When you leave an organization or your account is deactivated, your personal data will be handled in accordance with our Privacy Policy and data retention schedules.',
          ],
        },
        {
          id: 'what-you-are-allowed',
          heading: 'What You Are Allowed to Do',
          paragraphs: [
            'The Shule+ platform is designed to help your organization operate efficiently. As a user, you are permitted to:',
          ],
          bullets: [
            'Use the modules and features that your role and organization have granted you.',
            'Enter, update, and manage the operational data within the scope of your responsibilities.',
            'View and export data you are explicitly authorized to see, for legitimate operational purposes.',
            'Invite or manage other users if your role includes administrative privileges.',
            'Request support, report issues, and request copies of your personal data.',
            'Use the platform in a lawful manner that complies with these documents and your organization\u2019s policies.',
          ],
        },
        {
          id: 'what-you-are-not-allowed',
          heading: 'What You Are Not Allowed to Do',
          paragraphs: [
            'To protect every organization and user on the platform, the following actions are strictly prohibited:',
          ],
          bullets: [
            'Accessing, viewing, or retrieving data of other users or other organizations without authorization.',
            'Using another person\u2019s credentials or sharing your own credentials with anyone.',
            'Attempting to bypass role permissions, tenant isolation, or any security control.',
            'Downloading, scraping, or copying large volumes of data beyond what your role requires.',
            'Exporting or disclosing student, staff, or organizational data outside approved purposes.',
            'Modifying or deleting data that is outside your authorized scope.',
            'Using the platform to harass, defraud, or misrepresent.',
            'Uploading malicious software or unauthorized content.',
            'Reselling or re-licensing platform access.',
            'Interfering with the platform, its infrastructure, or other users\u2019 operations.',
          ],
        },
        {
          id: 'consequences',
          heading: 'Consequences of Misuse',
          paragraphs: [
            'Violations of acceptable use may lead to suspension or termination of your access, corrective or disciplinary action by your organization, and, where appropriate, legal action. Suspected fraud, abuse, or security incidents are investigated and may be reported to authorities.',
          ],
        },
        {
          id: 'accountability',
          heading: 'Your Responsibilities',
          paragraphs: [
            'You are accountable for the activity performed under your account. Use your access responsibly, respect the privacy of others, and report any suspected security issue or misuse to your administrator or to our support team.',
            'You are responsible for maintaining the confidentiality of your credentials, using the platform only within your authorized role, and promptly reporting any suspected unauthorized access, security incident, or misuse.',
          ],
        },
        {
          id: 'contact',
          heading: 'Questions and Requests',
          paragraphs: [
            'For data retrieval requests or questions about what you may or may not do on the platform, contact privacy@shuleplus.com or use the support channels in your account.',
          ],
        },
      ]}
    />
  );
}
