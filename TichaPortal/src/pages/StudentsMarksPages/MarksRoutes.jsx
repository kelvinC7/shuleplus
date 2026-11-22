import { Routes, Route, Navigate } from 'react-router-dom';
import MarksLayout from './components/Layout/DashboardLayout';

import MarksDashboard from './pages/Dashboard';
import TeacherInsights from './pages/TeacherInsights';
import MarksCenter from './pages/MarksCenter.jsx';
import Assessments from './pages/Assessments';
import GradeBook from './pages/GradeBook';
import StudentProfiles from './pages/StudentProfiles';
import AtRiskStudents from './pages/AtRiskStudents';
import StudentPerformance from './pages/StudentPerformance';
import RecordCompetencies from './pages/RecordCompetencies.jsx';
import AttendanceAnalysis from './pages/AttendanceAnalysis';
import ParentCommunication from './pages/ParentCommunication';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import PerformanceReports from './pages/PerformanceReports';
import ReportCardComments from './pages/ReportCardComments';
import InterventionPlans from './pages/InterventionPlans';
import ClassPerformance from './pages/ClassPerformance';

export default function MarksRoutes() {
  return (
    <Routes>
      <Route element={<MarksLayout />}>
        <Route index element={<MarksDashboard />} />
        <Route path="insights" element={<TeacherInsights />} />
        {/* Old "record marks" page is gone — recording happens in the wizard on Marks Center */}
        <Route path="record" element={<Navigate to="/marks/marks-center?record=1" replace />} />
        <Route path="record-marks" element={<Navigate to="/marks/marks-center?record=1" replace />} />
        <Route path="register-marks" element={<Navigate to="/marks/marks-center?record=1" replace />} />
        <Route path="marks-center" element={<MarksCenter />} />
        <Route path="assessments" element={<Assessments />} />
        <Route path="grade-book" element={<GradeBook />} />
        <Route path="student-profiles" element={<StudentProfiles />} />
        <Route path="at-risk" element={<AtRiskStudents />} />
        <Route path="student-performance" element={<StudentPerformance />} />
        <Route path="competencies" element={<RecordCompetencies />} />
        <Route path="class-performance" element={<ClassPerformance />} />
        <Route path="attendance" element={<Navigate to="/period-attendance" replace />} />
        <Route path="attendance-analytics" element={<AttendanceAnalysis />} />
        <Route path="parent-communication" element={<ParentCommunication />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="reports" element={<Reports />} />
        <Route path="report-comments" element={<ReportCardComments />} />
        <Route path="performance-reports" element={<PerformanceReports />} />
        <Route path="interventions" element={<InterventionPlans />} />
        <Route path="*" element={<Navigate to="/marks" replace />} />
      </Route>
    </Routes>
  );
}
