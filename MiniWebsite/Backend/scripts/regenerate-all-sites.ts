import { prisma } from '../src/config/database';
import { websiteService } from '../src/services/website.service';

async function main() {
  const sites = await prisma.schoolWebsite.findMany({
    select: { id: true, slug: true, status: true },
  });
  for (const site of sites) {
    const { publicUrl } = await websiteService.regenerate(site.id);
    console.log(`Regenerated ${site.slug} (${site.status}) -> ${publicUrl}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
