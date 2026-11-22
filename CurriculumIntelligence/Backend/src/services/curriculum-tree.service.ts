import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { extractGradeLabel, gradeMatchesFilter, subjectMatchesFilter } from '../utils/curriculum-match';

export async function listPublishedCatalog(filters?: { subject?: string; grade?: string; language?: string }) {
  const books = await prisma.curriculumBook.findMany({
    where: {
      processingStatus: 'PUBLISHED',
      ...(filters?.language ? { language: filters.language } : {}),
    },
    orderBy: [{ subject: 'asc' }, { grade: 'asc' }, { title: 'asc' }],
    select: {
      id: true,
      title: true,
      subject: true,
      grade: true,
      language: true,
      edition: true,
      academicYear: true,
      version: true,
    },
  });

  let filtered = books;
  const gradeFilter = filters?.grade ? extractGradeLabel(filters.grade) || filters.grade : undefined;
  if (gradeFilter) {
    filtered = filtered.filter((b) => gradeMatchesFilter(b.grade, gradeFilter));
  }
  if (filters?.subject) {
    const bySubject = filtered.filter((b) => subjectMatchesFilter(b.subject, filters.subject!));
    if (bySubject.length) filtered = bySubject;
  }

  const subjects = [...new Set(filtered.map((b) => b.subject))].sort();
  const grades = [...new Set(filtered.map((b) => b.grade))].sort();

  return { books: filtered, subjects, grades };
}

export async function getBookTree(bookId: string, publishedOnly = true) {
  const book = await prisma.curriculumBook.findUnique({
    where: { id: bookId },
    include: {
      units: {
        orderBy: { sortOrder: 'asc' },
        include: {
          lessons: {
            orderBy: { sortOrder: 'asc' },
            include: {
              objectives: { orderBy: { sortOrder: 'asc' } },
            },
          },
        },
      },
    },
  });

  if (!book) throw new AppError(404, 'Book not found');
  if (publishedOnly && book.processingStatus !== 'PUBLISHED') {
    throw new AppError(403, 'Curriculum book is not published');
  }

  return book;
}

export async function getAdminBookTree(bookId: string) {
  return getBookTree(bookId, false);
}
