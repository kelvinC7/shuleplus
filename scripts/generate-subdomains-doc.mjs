#!/usr/bin/env node
/**
 * Generate Word document with production + staging subdomain tables.
 * Usage: node scripts/generate-subdomains-doc.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  WidthType,
  BorderStyle,
  PageBreak,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(REPO_ROOT, 'config', 'subdomains.json');
const OUT_PATH = path.join(REPO_ROOT, 'config', 'ShulePlus-Subdomains.docx');

const BORDER = {
  top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
};

function fe(sub, domain) {
  return sub ? `${sub}.${domain}` : domain;
}

function api(sub, domain) {
  return `${sub}-api.${domain}`;
}

function cell(text, opts = {}) {
  return new TableCell({
    borders: BORDER,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: String(text),
            bold: opts.bold ?? false,
            font: 'Calibri',
            size: opts.size ?? 20,
          }),
        ],
      }),
    ],
  });
}

function headerRow(cols, widths) {
  return new TableRow({
    children: cols.map((t, i) =>
      cell(t, { bold: true, width: widths[i], size: 20 })
    ),
  });
}

function dataRow(cols, widths) {
  return new TableRow({
    children: cols.map((t, i) => cell(t, { width: widths[i], size: 18 })),
  });
}

function buildPlatformTable(prod, staging, platform) {
  const widths = [22, 26, 26, 26];
  const rows = [
    headerRow(['Service', 'Production frontend', 'Production API', 'Staging frontend / API'], widths),
    dataRow(
      [
        'Marketing',
        fe(platform.marketing, prod),
        '—',
        fe(platform.marketing, staging),
      ],
      widths
    ),
    dataRow(
      [
        'IAM (login & admin)',
        fe(platform.app, prod),
        fe(platform.api, prod),
        `${fe(platform.app, staging)} / ${fe(platform.api, staging)}`,
      ],
      widths
    ),
    dataRow(
      [
        'Notifications API',
        '—',
        fe(platform.notificationsApi, prod),
        fe(platform.notificationsApi, staging),
      ],
      widths
    ),
  ];
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

function buildModulesTable(prod, staging, modules) {
  const widths = [20, 20, 20, 20, 20];
  const rows = [
    headerRow(
      ['Module', 'Prod frontend', 'Prod API', 'Staging frontend', 'Staging API'],
      widths
    ),
  ];

  const seen = new Set();
  for (const mod of modules) {
    const key = mod.subdomain;
    if (seen.has(key) && mod.slug === 'cafeteria') {
      rows.push(
        dataRow(
          [
            `${mod.name} (alias)`,
            fe(mod.subdomain, prod),
            api(mod.subdomain, prod),
            fe(mod.subdomain, staging),
            api(mod.subdomain, staging),
          ],
          widths
        )
      );
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(
      dataRow(
        [
          mod.name,
          fe(mod.subdomain, prod),
          api(mod.subdomain, prod),
          fe(mod.subdomain, staging),
          api(mod.subdomain, staging),
        ],
        widths
      )
    );
  }

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

function sectionTitle(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, font: 'Calibri', size: 28 })],
  });
}

function body(text) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text, font: 'Calibri', size: 22 })],
  });
}

async function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const prod = config.baseDomain;
  const staging = config.stagingDomain ?? `staging.${prod}`;
  const { platform, modules } = config;
  const moduleCount = modules.length;
  const generated = new Date().toISOString().slice(0, 10);

  const doc = new Document({
    creator: 'ShulePlus',
    title: 'ShulePlus Subdomain Map',
    description: 'Production and staging subdomain reference',
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            children: [
              new TextRun({
                text: 'ShulePlus Subdomain Map',
                bold: true,
                font: 'Calibri',
                size: 36,
              }),
            ],
          }),
          body(`Generated: ${generated}`),
          body(`Production domain: ${prod}`),
          body(`Staging domain: ${staging}`),
          body(
            'Pattern: UI → {subdomain}.{domain} · API → {subdomain}-api.{domain}'
          ),
          body(
            `Total modules in this document: ${moduleCount} (cafeteria shares canteen URLs)`
          ),

          sectionTitle('Platform services'),
          buildPlatformTable(prod, staging, platform),

          sectionTitle(`All modules (${moduleCount})`),
          body(
            'Production and staging URLs are listed side by side for every module.'
          ),
          buildModulesTable(prod, staging, modules),

          new Paragraph({ children: [new PageBreak()] }),

          sectionTitle('Apply URLs to IAM database'),
          body(`Production: npm run subdomains:apply`),
          body(
            `Staging:  node scripts/apply-module-subdomains.mjs --domain=${staging}`
          ),
          body('Source:   config/subdomains.json'),
          body(`Regenerate: npm run subdomains:doc`),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUT_PATH, buffer);

  console.log(`Wrote ${OUT_PATH}`);
  console.log(`  Production: ${prod}`);
  console.log(`  Staging:    ${staging}`);
  console.log(`  Modules:    ${moduleCount} rows`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
