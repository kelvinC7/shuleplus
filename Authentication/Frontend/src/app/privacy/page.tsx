import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/legal-document';

export const metadata: Metadata = {
  title: 'Privacy Policy — Shule+',
  description:
    'How the Shule+ platform collects, uses, stores, and protects the personal data of users and organizations.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Privacy Policy"
      effectiveDate="August 2, 2026"
      lastUpdated="August 2, 2026"
      summary="This Privacy Policy explains what personal data SHULEPLUS and the Shule+ platform collect, why we collect it, how we use and protect it, and the rights you have over your data. We process personal data responsibly, lawfully, and transparently."
      sections={[
        {
          id: 'scope',
          heading: 'Scope of This Policy',
          paragraphs: [
            'This Privacy Policy applies to all personal data processed by the Shule+ ecosystem, including the authentication platform, all modules, portals, mobile applications, APIs, and related services.',
            'Where your organization is the data controller and we process data on its behalf, this policy supplements, and does not replace, the terms agreed between your organization and us.',
          ],
        },
        {
          id: 'who-we-are',
          heading: 'Who We Are and the Data Controller',
          paragraphs: [
            'The Shule+ platform is operated by SHULEPLUS, the legal entity responsible for the personal data processed in connection with your account and your organization\u2019s subscription. SHULEPLUS acts as the data controller for platform-level personal data, such as account, billing, and support information.',
            'Where your organization subscribes to the platform and controls the data it enters, your organization acts as the data controller and SHULEPLUS acts as a data processor on its behalf, processing data in accordance with your organization\u2019s instructions and the applicable service agreement.',
          ],
        },
        {
          id: 'data-we-collect',
          heading: 'Data We Collect',
          paragraphs: [
            'We collect only the personal data necessary to operate the platform and deliver the services you request. The categories of data we collect are summarized below.',
          ],
          subSections: [
            {
              heading: 'Account and identity data',
              paragraphs: [
                'Information you provide during registration and profile management, including name, email address, phone number, role, organization, and login credentials. We may also collect password hashes, multi-factor authentication settings, and security questions.',
              ],
            },
            {
              heading: 'Usage and technical data',
              paragraphs: [
                'Information about how you interact with the platform, including device information, IP address, browser type, pages visited, timestamps, and API usage. We also record audit and activity logs to maintain security and accountability.',
              ],
            },
            {
              heading: 'Organizational data',
              paragraphs: [
                'Data entered by your organization for operational purposes, such as student, staff, parent, financial, inventory, attendance, and academic records. This data is processed under your organization\u2019s instructions and is only accessible to authorized users.',
              ],
            },
            {
              heading: 'Communication data',
              paragraphs: [
                'Records of your communications with our support team, including emails, chat transcripts, and submitted forms, so that we can respond to your inquiries and improve our service.',
              ],
            },
          ],
        },
        {
          id: 'how-we-use-data',
          heading: 'How We Use Your Data',
          paragraphs: ['We use personal data for the following purposes:'],
          bullets: [
            'To create, authenticate, and manage your account and to secure access to the platform.',
            'To provide, operate, maintain, and improve the modules and services you subscribe to.',
            'To communicate with you about your account, billing, service updates, and security notices.',
            'To detect, prevent, and investigate fraud, abuse, and security incidents.',
            'To comply with legal obligations and enforce our Terms & Conditions.',
            'To generate aggregated, de-identified analytics that help us understand usage and improve the platform.',
          ],
        },
        {
          id: 'legal-bases',
          heading: 'Legal Bases for Processing',
          paragraphs: [
            'Where required by data protection law, we rely on the following legal bases for processing personal data:',
          ],
          bullets: [
            'Contract: processing necessary to perform the service agreement you or your organization entered into with us.',
            'Legitimate interest: processing needed for security, fraud prevention, and service improvement, balanced against your rights.',
            'Legal obligation: processing required to comply with applicable laws and regulations.',
            'Consent: processing that we perform only after obtaining your explicit consent, which you may withdraw at any time.',
          ],
        },
        {
          id: 'data-sharing',
          heading: 'Who We Share Data With',
          paragraphs: [
            'We do not sell your personal data. We share personal data only in the following circumstances:',
          ],
          bullets: [
            'With authorized users within your organization, according to the roles and permissions granted by your administrators.',
            'With trusted service providers who help us operate the platform (hosting, SMS/email delivery, payment processing, support), under strict data-processing agreements.',
            'With legal authorities, regulators, or law enforcement when required by law or in response to a valid legal request.',
            'With professional advisers (auditors, lawyers) where necessary to protect our legal rights.',
            'In connection with a merger, acquisition, or sale of assets, with appropriate confidentiality protections.',
          ],
        },
        {
          id: 'data-retention',
          heading: 'Data Retention',
          paragraphs: [
            'We retain personal data only for as long as necessary to fulfill the purposes described in this policy, to comply with legal obligations, or to resolve disputes.',
            'When your account is closed or your organization\u2019s subscription ends, we will delete or anonymize personal data after a reasonable retention period, unless we are legally required to keep it.',
          ],
        },
        {
          id: 'data-security',
          heading: 'Data Security',
          paragraphs: [
            'We implement appropriate technical and organizational measures to protect personal data against unauthorized access, alteration, disclosure, or destruction. These include encryption in transit and at rest, role-based access controls, tenant-isolated storage, multi-factor authentication, and continuous security monitoring.',
            'Despite these safeguards, no method of transmission or storage is completely secure. You are responsible for protecting your own credentials and devices.',
          ],
        },
        {
          id: 'breach-notification',
          heading: 'Data Breach Notification',
          paragraphs: [
            'We maintain incident response procedures designed to detect, contain, and remediate security incidents involving personal data.',
            'In the event of a personal data breach that is likely to result in a risk to your rights and freedoms, we will notify affected users and organizations without undue delay, and notify the National Cyber Security Authority (NCSA) of Rwanda or other relevant supervisory authority where required by applicable law.',
            'Where feasible, notifications will include a description of the nature of the breach, the categories and approximate number of data subjects and records affected, and the measures we are taking to mitigate potential adverse effects.',
          ],
        },
        {
          id: 'children-data',
          heading: 'Data of Children',
          paragraphs: [
            'The platform may be used to manage data relating to students and minors. We process such data only under the instruction and authority of the responsible school or organization, which remains responsible for obtaining the necessary parental or legal guardian consents.',
            'We do not knowingly collect personal data of minors outside the context of authorized organizational use.',
          ],
        },
        {
          id: 'international-transfers',
          heading: 'International Data Transfers',
          paragraphs: [
            'Your data may be processed in countries other than your own. When we transfer personal data across borders, we take steps to ensure it receives an equivalent level of protection through appropriate safeguards, such as contractual clauses or recognized certification mechanisms.',
          ],
        },
        {
          id: 'rwanda-compliance',
          heading: 'Rwandan Data Protection Compliance',
          paragraphs: [
            'As the Republic of Rwanda is our primary market, SHULEPLUS processes personal data in compliance with Law No. 058/2021 of 13/10/2021 relating to the protection of personal data and privacy in Rwanda, together with any implementing rules issued by the National Cyber Security Authority (NCSA).',
            'We are committed to the data protection principles of lawfulness, transparency, purpose limitation, data minimization, accuracy, storage limitation, integrity, and confidentiality set out in applicable law, including the Rwandan legal framework.',
          ],
        },
        {
          id: 'your-rights',
          heading: 'Your Privacy Rights',
          paragraphs: [
            'Depending on your jurisdiction, you may have the right to:',
          ],
          bullets: [
            'Access a copy of the personal data we hold about you.',
            'Request correction of inaccurate or incomplete data.',
            'Request deletion of your personal data, subject to legal retention requirements.',
            'Object to or restrict certain processing activities.',
            'Request portability of your data in a structured, machine-readable format.',
            'Withdraw consent where processing is based on consent.',
          ],
          subSections: [
            {
              heading: 'How to exercise your rights',
              paragraphs: [
                'You can exercise these rights by contacting us at privacy@shuleplus.com. Where data is controlled by your organization, we will work with your organization to respond to requests. We respond to all legitimate requests within the timeframes required by applicable law.',
              ],
            },
          ],
        },
        {
          id: 'cookies',
          heading: 'Cookies and Similar Technologies',
          paragraphs: [
            'We use cookies and similar technologies to keep you signed in, remember your preferences, and understand how the platform is used. You can control cookies through your browser settings, but disabling them may affect the functionality of the platform.',
          ],
        },
        {
          id: 'changes-to-policy',
          heading: 'Changes to This Policy',
          paragraphs: [
            'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the platform or by email before the changes take effect.',
            'Each revision includes an effective date, which is indicated at the top of this policy together with the date it was last updated. The effective date tells you when the policy became applicable.',
          ],
        },
        {
          id: 'contact',
          heading: 'Contact Us',
          paragraphs: [
            'For questions or concerns about this Privacy Policy or about how SHULEPLUS handles your data, contact us at privacy@shuleplus.com. You also have the right to lodge a complaint with the National Cyber Security Authority (NCSA) of Rwanda or another supervisory authority in your jurisdiction.',
          ],
        },
      ]}
    />
  );
}
