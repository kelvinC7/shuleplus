import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/legal-document';

export const metadata: Metadata = {
  title: 'Terms & Conditions — Shule+',
  description:
    'The Terms and Conditions governing the use of the Shule+ platform, its modules, accounts and services.',
};

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Terms & Conditions"
      effectiveDate="August 2, 2026"
      lastUpdated="August 2, 2026"
      summary="These Terms & Conditions form a binding agreement between you (the user or organization) and SHULEPLUS, the operator of the Shule+ ecosystem. By creating an account, signing in, or using any Shule+ service, you accept these terms in full."
      sections={[
        {
          id: 'acceptance',
          heading: 'Acceptance of Terms',
          paragraphs: [
            'By accessing or using the Shule+ platform, including any module, portal, mobile application, API, or associated service, you agree to be bound by these Terms & Conditions and by our Privacy Policy. If you do not agree with any part of these terms, you must not use the platform.',
            'Where you register an account on behalf of an organization (a school, university, hospital, NGO, church, business, factory, or government institution), you confirm that you have the authority to bind that organization to these terms.',
          ],
        },
        {
          id: 'accounts',
          heading: 'Accounts, Credentials and Security',
          paragraphs: [
            'You are responsible for all activity that occurs under your account. You agree to keep your login credentials confidential and to notify us immediately of any unauthorized use of your account or any other security breach.',
            'We reserve the right to disable any user account or user credentials if, in our reasonable opinion, you have failed to comply with any provision of these terms, or if the account presents a security risk to the platform or to other users.',
          ],
          bullets: [
            'You must provide accurate, current and complete information during registration and keep it up to date.',
            'You must not share your password or allow any other person to access the platform using your credentials.',
            'You must not create accounts through unauthorized or automated means.',
            'Accounts created by automated means or with false identities may be terminated without notice.',
          ],
        },
        {
          id: 'acceptable-use',
          heading: 'Acceptable Use',
          paragraphs: [
            'You may use the platform only for lawful, legitimate operational purposes and only in accordance with the permissions granted to your role. You must not misuse the platform in any way.',
          ],
          bullets: [
            'Do not attempt to access, alter, or interfere with another organization\u2019s data, accounts, or systems.',
            'Do not probe, scan, or test the vulnerability of the platform without written authorization.',
            'Do not reverse engineer, decompile, or disassemble any part of the platform or its APIs.',
            'Do not upload malware, viruses, or any code designed to disrupt, damage, or limit the functioning of the platform.',
            'Do not use the platform to transmit spam, unlawful content, or content that violates the rights of others.',
            'Do not exceed the data, storage, or usage limits assigned to your subscription plan.',
            'Do not resell, sublicense, or provide the platform to third parties as a service without a written agreement.',
          ],
        },
        {
          id: 'subscriptions-and-fees',
          heading: 'Subscriptions and Fees',
          paragraphs: [
            'Access to certain modules and services requires a paid subscription. Subscription fees, billing cycles, and plan features are described at the time of purchase and in our pricing materials.',
            'Fees are payable in advance on the agreed billing cycle and are non-refundable except where required by applicable law. We may change subscription fees upon notice at least thirty (30) days before the start of the next billing cycle.',
          ],
          bullets: [
            'Failure to pay due fees may result in suspension of access until payment is settled.',
            'Continued non-payment may lead to termination of the account and, where permitted, deletion of stored data after a reasonable retention period.',
          ],
        },
        {
          id: 'intellectual-property',
          heading: 'Intellectual Property',
          paragraphs: [
            'The Shule+ platform, including its software, design, trademarks, logos, documentation, and all underlying technology, is owned by SHULEPLUS or its licensors and is protected by intellectual property laws.',
            'We grant you a limited, non-exclusive, non-transferable, revocable right to use the platform strictly in accordance with these terms. No other rights are granted. Your organization retains ownership of the data you input into the platform.',
          ],
        },
        {
          id: 'data-and-privacy',
          heading: 'Your Data and Privacy',
          paragraphs: [
            'You retain ownership of the data you enter into the platform. We process that data only to provide, maintain, and improve the services, and as described in our Privacy Policy.',
            'We implement reasonable technical and organizational safeguards to protect your data. You are responsible for ensuring that you have the necessary rights and consents to input personal data into the platform and to share it with us and with authorized users.',
          ],
          bullets: [
            'We do not sell your personal data or the data of your users.',
            'Data is stored in isolated, tenant-specific environments to prevent cross-organization access.',
            'We may use aggregated, de-identified data to improve the platform and for reporting.',
          ],
        },
        {
          id: 'service-availability',
          heading: 'Service Availability and Support',
          paragraphs: [
            'We aim to provide a highly available service but do not guarantee that the platform will be uninterrupted or error-free. Scheduled maintenance may result in temporary unavailability, and we will endeavor to provide advance notice where possible.',
            'Support is provided in accordance with your subscription plan. For critical incidents, we will respond promptly and keep you informed of progress.',
          ],
        },
        {
          id: 'limitation-of-liability',
          heading: 'Limitation of Liability',
          paragraphs: [
            'To the maximum extent permitted by law, SHULEPLUS shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of profits, revenue, data, or business opportunities, arising out of or relating to your use of the platform.',
            'Our total aggregate liability arising out of or relating to these terms or the platform shall not exceed the amount you paid us during the twelve (12) months preceding the claim.',
          ],
        },
        {
          id: 'termination',
          heading: 'Termination',
          paragraphs: [
            'You may stop using the platform at any time and may request closure of your account. We may suspend or terminate your access to the platform if you breach these terms, or as required by law.',
            'Upon request and subject to applicable law, your organization may export its data in a commonly used electronic format before account closure. Following termination, data will be retained or deleted in accordance with our Data Retention Policy and applicable legal requirements.',
          ],
        },
        {
          id: 'changes-to-terms',
          heading: 'Changes to These Terms',
          paragraphs: [
            'We may update these Terms & Conditions from time to time to reflect changes in our services, technology, or legal requirements. We will notify you of material changes through the platform or by email.',
            'Your continued use of the platform after changes take effect constitutes acceptance of the revised terms. If you do not agree to the revised terms, you must stop using the platform.',
          ],
        },
        {
          id: 'governing-law',
          heading: 'Governing Law',
          paragraphs: [
            'These Terms are governed by the laws of the Republic of Rwanda.',
            'Any disputes arising under these terms shall first be addressed through good-faith negotiation. Unresolved disputes shall be subject to the exclusive jurisdiction of the competent courts of the Republic of Rwanda.',
          ],
        },
        {
          id: 'contact',
          heading: 'Contact Us',
          paragraphs: [
            'If you have any questions about these Terms & Conditions, please contact us at support@shuleplus.com or through the support channels available in your account.',
          ],
        },
      ]}
    />
  );
}
