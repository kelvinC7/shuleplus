import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { App, ModuleLayout } from '@/App';
import HomePage from '@/pages/HomePage';
import AcademicHomePage from '@/pages/AcademicHomePage';
import StudentsPage from '@/pages/StudentsPage';
import NewStudentPage from '@/pages/NewStudentPage';
import EditStudentPage from '@/pages/EditStudentPage';
import PromotionPage from '@/pages/PromotionPage';
import ClassesPage from '@/pages/ClassesPage';
import NewClassPage from '@/pages/NewClassPage';
import EditClassPage from '@/pages/EditClassPage';
import CoursesPage from '@/pages/CoursesPage';
import CourseCatalogPage from '@/pages/CourseCatalogPage';
import NewSubjectPage from '@/pages/NewSubjectPage';
import EditSubjectPage from '@/pages/EditSubjectPage';
import ExaminationsPage from '@/pages/ExaminationsPage';
import NewExamPage from '@/pages/NewExamPage';
import EditExamPage from '@/pages/EditExamPage';
import MarksPage from '@/pages/MarksPage';
import MarksRecordsPage from '@/pages/MarksRecordsPage';
import ReportCardsPage from '@/pages/ReportCardsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import GraduationPage from '@/pages/GraduationPage';
import AssessmentTemplatesPage from '@/pages/AssessmentTemplatesPage';
import NewAssessmentTemplatePage from '@/pages/NewAssessmentTemplatePage';
import EditAssessmentTemplatePage from '@/pages/EditAssessmentTemplatePage';
import AssignmentPage from '@/pages/AssignmentPage';
import AssessmentsPage from '@/pages/AssessmentsPage';
import AssessmentDetailPage from '@/pages/AssessmentDetailPage';
import MarkEntryPage from '@/pages/MarkEntryPage';
import GradingScalePage from '@/pages/GradingScalePage';
import ReportCardV2Page from '@/pages/ReportCardV2Page';
import AcademicDashboardPage from '@/pages/AcademicDashboardPage';
import CompetencyPage from '@/pages/CompetencyPage';
import MarkCorrectionsPage from '@/pages/MarkCorrectionsPage';
import TeachersPermissionPage from '@/pages/TeachersPermissionPage';
import RoundRollCallPage from '@/pages/RoundRollCallPage';
import TeacherPortalPage from '@/pages/TeacherPortalPage';
import TeacherCreateAssessmentPage from '@/pages/TeacherCreateAssessmentPage';
import TeacherMarkEntryPage from '@/pages/TeacherMarkEntryPage';
import TeacherAssessmentAnalyticsPage from '@/pages/TeacherAssessmentAnalyticsPage';
import ExamDashboardPage from '@/pages/exams/ExamDashboardPage';
import ExamSessionsPage from '@/pages/exams/ExamSessionsPage';
import ExamWizardPage from '@/pages/exams/ExamWizardPage';
import ExamTimetablePage from '@/pages/exams/ExamTimetablePage';
import ExamSeatingPage from '@/pages/exams/ExamSeatingPage';
import ExamInvigilatorsPage from '@/pages/exams/ExamInvigilatorsPage';
import ExamInvigilatorDeskPage from '@/pages/exams/ExamInvigilatorDeskPage';
import ExamLivePage from '@/pages/exams/ExamLivePage';
import ExamPublishedPage from '@/pages/exams/ExamPublishedPage';
import ExamReportsPage from '@/pages/exams/ExamReportsPage';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      // IAM default launch path; Academic home is /home
      { path: 'dashboard', element: <HomePage /> },
      {
        element: <ModuleLayout />,
        children: [
          { path: 'home', element: <AcademicHomePage /> },
          { path: 'students/new', element: <NewStudentPage /> },
          { path: 'students/:id/edit', element: <EditStudentPage /> },
          { path: 'students/promotion', element: <PromotionPage /> },
          { path: 'students', element: <StudentsPage /> },
          { path: 'classes/new', element: <NewClassPage /> },
          { path: 'classes/:id/edit', element: <EditClassPage /> },
          { path: 'classes', element: <ClassesPage /> },
          { path: 'courses', element: <Navigate to="/courses/catalog" replace /> },
          { path: 'courses/catalog', element: <CourseCatalogPage /> },
          { path: 'courses/by-class', element: <CoursesPage /> },
          { path: 'subjects/new', element: <NewSubjectPage /> },
          { path: 'subjects/:id/edit', element: <EditSubjectPage /> },
          { path: 'subjects', element: <Navigate to="/courses" replace /> },
          { path: 'exams', element: <ExamDashboardPage /> },
          { path: 'exams/invigilator-desk', element: <ExamInvigilatorDeskPage /> },
          { path: 'exams/sessions/new', element: <ExamWizardPage /> },
          { path: 'exams/sessions/:id/setup', element: <ExamWizardPage /> },
          { path: 'exams/sessions', element: <ExamSessionsPage /> },
          { path: 'exams/timetable', element: <ExamTimetablePage /> },
          { path: 'exams/seating', element: <ExamSeatingPage /> },
          { path: 'exams/seating/:section', element: <ExamSeatingPage /> },
          { path: 'exams/invigilators', element: <ExamInvigilatorsPage /> },
          { path: 'exams/invigilators/:section', element: <ExamInvigilatorsPage /> },
          { path: 'exams/live', element: <ExamLivePage /> },
          { path: 'exams/live/:section', element: <ExamLivePage /> },
          { path: 'exams/published', element: <ExamPublishedPage /> },
          { path: 'exams/reports', element: <ExamReportsPage /> },
          { path: 'exams/reports/:section', element: <ExamReportsPage /> },
          { path: 'examinations/new', element: <NewExamPage /> },
          { path: 'examinations/:id/edit', element: <EditExamPage /> },
          { path: 'examinations', element: <ExaminationsPage /> },
          { path: 'marks', element: <MarksPage /> },
          { path: 'marks-records', element: <MarksRecordsPage /> },
          { path: 'report-cards', element: <ReportCardsPage /> },
          { path: 'report-cards/v2', element: <ReportCardV2Page /> },
          { path: 'grading-scales', element: <GradingScalePage /> },
          { path: 'academic-dashboard', element: <AcademicDashboardPage /> },
          { path: 'competency', element: <CompetencyPage /> },
          { path: 'mark-corrections', element: <MarkCorrectionsPage /> },
          { path: 'teachers-permission', element: <TeachersPermissionPage /> },
          { path: 'round-roll-call', element: <RoundRollCallPage /> },
          { path: 'assessment-templates', element: <AssessmentTemplatesPage /> },
          { path: 'assessment-templates/new', element: <NewAssessmentTemplatePage /> },
          { path: 'assessment-templates/:id/edit', element: <EditAssessmentTemplatePage /> },
          { path: 'assessments', element: <AssessmentsPage /> },
          { path: 'assessments/:assessmentId', element: <AssessmentDetailPage /> },
          { path: 'mark-entry/:assessmentId', element: <MarkEntryPage /> },
          { path: 'assignments', element: <AssignmentPage /> },
          { path: 'analytics', element: <AnalyticsPage /> },
          { path: 'graduation', element: <GraduationPage /> },
          { path: 'teacher', element: <TeacherPortalPage /> },
          { path: 'teacher/create-assessment', element: <TeacherCreateAssessmentPage /> },
          { path: 'teacher/mark-entry/:assessmentId', element: <TeacherMarkEntryPage /> },
          { path: 'teacher/analytics/:assessmentId', element: <TeacherAssessmentAnalyticsPage /> },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
