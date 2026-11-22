import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { AppError } from '../middleware/error.middleware';

function fieldValue(field: unknown): string {
  if (!field) return '';
  if (typeof field === 'object' && field !== null && 'value' in field) {
    const v = (field as { value: unknown }).value;
    if (Array.isArray(v)) return v.map(String).join('\n');
    return String(v ?? '');
  }
  if (Array.isArray(field)) return field.map(String).join('\n');
  return String(field);
}

export async function exportLessonPlanPdf(planContent: Record<string, unknown>, title: string) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('SHULE+ · LESSON PLAN', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(title, { align: 'center' });
    doc.moveDown();

    const general = planContent.general as Record<string, unknown>;
    doc.fontSize(14).text('A. General information');
    doc.fontSize(10);
    for (const [k, label] of [
      ['subject', 'Subject'],
      ['grade', 'Class'],
      ['durationMinutes', 'Duration'],
      ['classSize', 'Class size'],
    ]) {
      doc.text(`${label}: ${fieldValue(general?.[k])}`);
    }

    const prep = planContent.preparation as Record<string, unknown>;
    doc.moveDown().fontSize(14).text('B. Lesson preparation');
    doc.fontSize(10);
    doc.text(`Unit: ${fieldValue(prep?.unitTitle)}`);
    doc.text(`Lesson: ${fieldValue(prep?.lessonTitle)}`);
    doc.text(`Objective: ${fieldValue(prep?.instructionalObjective)}`);
    doc.text(`Materials: ${fieldValue(prep?.learningMaterials)}`);

    const procedure = planContent.procedure as { stages?: Array<Record<string, unknown>> };
    doc.moveDown().fontSize(14).text('C. Teaching and learning process');
    for (const stage of procedure?.stages ?? []) {
      doc.moveDown(0.5).fontSize(11).text(String(stage.title ?? stage.key));
      doc.fontSize(10).text(`Time: ${stage.minutes ?? '?'} min`);
      doc.text(`Teacher: ${fieldValue(stage.teacherActivities)}`);
      doc.text(`Learners: ${fieldValue(stage.learnerActivities)}`);
    }

    doc.end();
  });
}

export async function exportLessonPlanDocx(planContent: Record<string, unknown>, title: string) {
  const general = planContent.general as Record<string, unknown>;
  const prep = planContent.preparation as Record<string, unknown>;
  const procedure = planContent.procedure as { stages?: Array<Record<string, unknown>> };

  const children: Paragraph[] = [
    new Paragraph({ text: 'SHULE+ · LESSON PLAN', heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: title, heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ text: 'A. General information', heading: HeadingLevel.HEADING_3 }),
    new Paragraph({ children: [new TextRun(`Subject: ${fieldValue(general?.subject)}`)] }),
    new Paragraph({ children: [new TextRun(`Class: ${fieldValue(general?.grade)}`)] }),
    new Paragraph({ text: 'B. Lesson preparation', heading: HeadingLevel.HEADING_3 }),
    new Paragraph({ children: [new TextRun(`Lesson: ${fieldValue(prep?.lessonTitle)}`)] }),
    new Paragraph({ children: [new TextRun(`Objective: ${fieldValue(prep?.instructionalObjective)}`)] }),
    new Paragraph({ text: 'C. Teaching and learning process', heading: HeadingLevel.HEADING_3 }),
  ];

  for (const stage of procedure?.stages ?? []) {
    children.push(
      new Paragraph({ text: String(stage.title ?? stage.key), heading: HeadingLevel.HEADING_4 }),
      new Paragraph({ children: [new TextRun(`Teacher: ${fieldValue(stage.teacherActivities)}`)] }),
      new Paragraph({ children: [new TextRun(`Learners: ${fieldValue(stage.learnerActivities)}`)] })
    );
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

export function exportFilename(base: string, ext: 'pdf' | 'docx') {
  const safe = base.replace(/[^\w\- ]/g, '').trim().slice(0, 80) || 'lesson-plan';
  return `${safe}.${ext}`;
}

export function assertPlanContent(planContent: unknown): Record<string, unknown> {
  if (!planContent || typeof planContent !== 'object') {
    throw new AppError(400, 'Invalid plan content');
  }
  return planContent as Record<string, unknown>;
}
