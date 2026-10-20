import { PrismaClient, WebsiteStatus } from '../src/generated/prisma';
import { slugify, websiteService } from '../src/services/website.service';

const SAINT_THEO_ORG_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Mini-Website module...');

  const tenant = await prisma.tenant.upsert({
    where: { organizationId: SAINT_THEO_ORG_ID },
    update: {},
    create: {
      organizationId: SAINT_THEO_ORG_ID,
      organizationCode: 'STTHEO',
      organizationName: 'Saint Theo School',
      district: 'Gasabo',
      status: 'ACTIVE',
    },
  });
  console.log(`Tenant: ${tenant.organizationName} (${tenant.organizationId})`);

  const existing = await prisma.schoolWebsite.findUnique({
    where: { organizationId: SAINT_THEO_ORG_ID },
  });

  const site = await prisma.schoolWebsite.upsert({
    where: { organizationId: SAINT_THEO_ORG_ID },
    update: {},
    create: {
      organizationId: SAINT_THEO_ORG_ID,
      organizationName: tenant.organizationName,
      slug: existing?.slug ?? slugify('Saint Theo School'),
      title: 'Saint Theo School',
      tagline: 'Nursery · Primary · Secondary',
      heroTitle: 'Shaping Bright Futures, One Learner at a Time',
      heroText:
        'Saint Theo School is a private school in Gasabo, Kigali, offering Nursery, Primary and Secondary education with a strong focus on academic excellence and character formation.',
      about:
        'Founded with a commitment to holistic education, Saint Theo School blends a rigorous academic programme with co-curricular excellence, discipline and care for every learner.\n\nOur qualified teachers, modern classrooms and safe campus make us a home away from home for your child.',
      admissionInfo:
        'Admissions are open for the 2026–2027 academic year across all levels (Nursery to A-Level). Fill in the application form on our website and our admissions team will contact you within a few working days.',
      primaryColor: '#001121',
      secondaryColor: '#f59e0b',
      status: WebsiteStatus.PUBLISHED,
      template: 'vschool',
      templateName: 'vSchool Classic',
      stats: [
        { label: 'Years of Excellence', value: '20+' },
        { label: 'Happy Learners', value: '950+' },
        { label: 'Qualified Staff', value: '65+' },
        { label: 'Subject Offerings', value: '18' },
      ],
      programs: [
        { name: 'Nursery', description: 'Play-based early learning for children aged 3–6 (N1–N3).' },
        { name: 'Primary', description: 'Strong foundations across P1–P6 with modern teaching methods.' },
        { name: 'O-Level', description: 'Ordinary Level studies (S1–S3) with a wide subject choice.' },
        { name: 'A-Level', description: 'Advanced Level combinations (S4–S6) preparing for university.' },
      ],
      news: [
        { title: '2026–2027 Admissions Now Open', date: 'August 2026', excerpt: 'Applications are open for Nursery to A-Level. Secure your place today.' },
        { title: 'Science Week 2026', date: 'June 2026', excerpt: 'Our learners showcased incredible projects during the annual Science Week.' },
        { title: 'Graduation Ceremony', date: 'May 2026', excerpt: 'Celebrating our P6, S3 and S6 graduates with their families and staff.' },
      ],
    },
  });
  console.log(`Website: ${site.title} → /${site.slug}`);

  const samplePage = await prisma.websitePage.findFirst({
    where: { websiteId: site.id },
  });
  if (!samplePage) {
    await prisma.websitePage.create({
      data: {
        websiteId: site.id,
        slug: 'why-choose-us',
        title: 'Why Choose Us',
        sortOrder: 1,
        content:
          '<h3>Academic Excellence</h3><p>We consistently achieve strong national examination results and our learners are prepared for top secondary schools and universities.</p><h3>Holistic Development</h3><p>Sports, arts, clubs and leadership opportunities are part of daily life at Saint Theo.</p><h3>Safe &amp; Caring Environment</h3><p>Our campus is secure, well-maintained and staffed by caring professionals who know every learner by name.</p>',
      },
    });
  }

  // Generate the published HTML file so the public site is live immediately.
  const regenerated = await websiteService.regenerate(site.id);
  console.log(`Published HTML generated (${regenerated.html.length} bytes) → http://localhost:3055/${site.slug}`);

  console.log('Mini-Website seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
