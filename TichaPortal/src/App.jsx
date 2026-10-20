import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AcademicSettingsProvider } from './hooks/useTpAcademic';
import Layout from './components/Layout';
import LiteTeacherRouteGuard from './components/LiteTeacherRouteGuard';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ShuleAvance from './pages/ShuleAvance';
import RepaymentSchedule from './pages/RepaymentSchedule';
import TichaDeals from './pages/TichaDeals';
import TichaDealDetails from './pages/TichaDealDetails';
import TichaDealPayments from './pages/TichaDealPayments';
import TrackingTichaDeals from './pages/TrackingTichaDeals';
import TichaAI from './pages/TichaAI';
import EnglishClub from './pages/EnglishClub';
import Students from './pages/Students';
import FeaturePlaceholders from './pages/FeaturePlaceholders';
import Timetable from './pages/Timetable';
import Attendance from './pages/Attendance';
import RoundRollCall from './pages/RoundRollCall';
import ExaminationEligibility from './pages/ExaminationEligibility';
import TeacherAttendanceView from './pages/TeacherAttendanceView';
import ClassRoomScan from './pages/ClassRoomScan';
import RecordMarks from './pages/RecordMarks';
import ViewMarks from './pages/ViewMarks';
import Requisitions from './pages/Requisitions';
import MarksRoutes from './pages/StudentsMarksPages/MarksRoutes';
import PurchaseRequests from './pages/PurchaseRequests';
import RequisitionsRes from './pages/RequisitionsRes';
import ChatCenter from './pages/ChatCenter';
import ParentMessages from './pages/ParentMessages';
import StaffPayroll from './pages/StaffPayroll';
import Permissions from './pages/Permissions';
import SchoolCalendar from './pages/SchoolCalendar';
import TeacherProfile from './pages/TeacherProfile';
import MyTeaching from './pages/MyTeaching';
import Homework from './pages/Homework';
import HomeworkDetailPage from './pages/homework/HomeworkDetailPage';
import LessonPlanEditor from './pages/lessonPlans/LessonPlanEditor';
import GenerateLessonPlanPage from './pages/lessonPlanning/GenerateLessonPlanPage';
import AllLessonPlansPage from './pages/lessonPlanning/AllLessonPlansPage';
import LessonPlanBookPage from './pages/lessonPlanning/LessonPlanBookPage';
import CoursePerformancePage from './pages/lessonPlanning/CoursePerformancePage';
import MyCourses from './pages/MyCourses';
import Examinations from './pages/Examinations';
import ExaminationRoom from './pages/ExaminationRoom';
import CoursesAndMarks from './pages/CoursesAndMarks';
import CreateAssessment from './pages/CreateAssessment';
import TeacherAssessmentsSchedule from './pages/TeacherAssessmentsSchedule';
import AssessmentMarks from './pages/AssessmentMarks';
import { TpToastProvider } from './components/TpToast';
import './index.css';

// ── Loading screen ────────────────────────────────────────────
const LoadingScreen = () => (
  <div className="min-h-screen bg-[#000435] flex flex-col items-center justify-center gap-4 font-sans px-6">
    <img src="/logo_white.png" alt="Shule+" className="h-10 w-auto max-w-[180px] object-contain" />
    <p className="text-white/70 text-sm font-medium animate-pulse">
      Loading Teacher Portal…
    </p>
  </div>
);

// ── Protected Route ───────────────────────────────────────────
const ProtectedRoute = ({ children, title }) => {
  const { teacher, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!teacher) return <Navigate to="/login" />;
  return (
    <LiteTeacherRouteGuard>
      <Layout title={title}>{children}</Layout>
    </LiteTeacherRouteGuard>
  );
};

const HomeRoute = () => (
  <ProtectedRoute title="Dashboard">
    <Dashboard />
  </ProtectedRoute>
);

const FallbackRoute = () => <Navigate to="/" replace />;
// ── Routes ────────────────────────────────────────────────────
function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Core pages */}
      <Route path="/" element={<HomeRoute />} />
      <Route path="/dashboard" element={<HomeRoute />} />
      <Route path="/shule-avance" element={<ProtectedRoute title="Ticha Avance">    <ShuleAvance />                                                  </ProtectedRoute>} />
      <Route path="/repayment-schedule" element={<ProtectedRoute title="Repayment Schedule"><RepaymentSchedule /></ProtectedRoute>} />
      <Route path="/ticha-deals" element={<ProtectedRoute title="Ticha Deals">      <TichaDeals />                                                   </ProtectedRoute>} />
      <Route path="/ticha-deals/tracking" element={<ProtectedRoute title="Deal tracking"> <TrackingTichaDeals />                                  </ProtectedRoute>} />
      <Route path="/ticha-deals/pay" element={<ProtectedRoute title="Pay deal">       <TichaDealPayments />                                           </ProtectedRoute>} />
      <Route path="/ticha-deals/:id" element={<ProtectedRoute title="Deal Details"> <TichaDealDetails />                                             </ProtectedRoute>} />
      <Route path="/ticha-ai" element={<ProtectedRoute title="TichaAI">           <TichaAI />                                                      </ProtectedRoute>} />
      <Route path="/english-club" element={<ProtectedRoute title="English Club">      <EnglishClub />                                                  </ProtectedRoute>} />
      <Route path="/my-teaching" element={<ProtectedRoute title="My Teaching"><MyTeaching /></ProtectedRoute>} />
      <Route path="/homework" element={<ProtectedRoute title="Homework"><Homework /></ProtectedRoute>} />
      <Route path="/homework/:id" element={<ProtectedRoute title="Homework Details"><HomeworkDetailPage /></ProtectedRoute>} />
      <Route path="/lesson-planning" element={<Navigate to="/lesson-planning/generate" replace />} />
      <Route path="/lesson-planning/generate" element={<ProtectedRoute title="Generate Lesson Plan"><GenerateLessonPlanPage /></ProtectedRoute>} />
      <Route path="/lesson-planning/all" element={<ProtectedRoute title="All Lesson Plans"><AllLessonPlansPage /></ProtectedRoute>} />
      <Route path="/lesson-planning/book" element={<ProtectedRoute title="Lesson Plan Book"><LessonPlanBookPage /></ProtectedRoute>} />
      <Route path="/lesson-planning/performance" element={<ProtectedRoute title="Course Performance"><CoursePerformancePage /></ProtectedRoute>} />
      <Route path="/lesson-plans" element={<Navigate to="/lesson-planning/all" replace />} />
      <Route path="/lesson-plans/create" element={<Navigate to="/lesson-planning/generate" replace />} />
      <Route path="/lesson-plans/:id" element={<ProtectedRoute title="Lesson Plan"><LessonPlanEditor /></ProtectedRoute>} />
      <Route path="/my-courses" element={<ProtectedRoute title="My Courses"><MyCourses /></ProtectedRoute>} />
      <Route path="/examinations" element={<ProtectedRoute title="Examinations"><Examinations /></ProtectedRoute>} />
      <Route path="/examinations/:roomName" element={<ProtectedRoute title="Exam room"><ExaminationRoom /></ProtectedRoute>} />
      <Route path="/assessments" element={<ProtectedRoute title="Courses & Marks"><CoursesAndMarks /></ProtectedRoute>} />
      <Route path="/assessments/schedule" element={<ProtectedRoute title="Assessments"><TeacherAssessmentsSchedule /></ProtectedRoute>} />
      <Route path="/assessments/create" element={<ProtectedRoute title="Create Assessment"><CreateAssessment /></ProtectedRoute>} />
      <Route path="/assessments/:id/marks" element={<ProtectedRoute title="Enter marks"><AssessmentMarks /></ProtectedRoute>} />
      <Route path="/classroom-scan" element={<Navigate to="/class-room-scan" replace />} />
      <Route path="/my-attendance" element={<Navigate to="/teacher-attendance" replace />} />
      <Route path="/roll-call" element={<Navigate to="/round-roll-call" replace />} />
      <Route path="/calendar" element={<Navigate to="/school-calendar" replace />} />

      {/* New sidebar pages */}
      <Route path="/students" element={<ProtectedRoute title="Students">          <Students />                                                     </ProtectedRoute>} />
      <Route path="/timetable" element={<ProtectedRoute title="Timetable">         <Timetable />                                                    </ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute title="Attendance">        <Attendance />                                                   </ProtectedRoute>} />
      <Route path="/class-room-scan" element={<ProtectedRoute title="Classroom scan"><ClassRoomScan /></ProtectedRoute>} />
      <Route path="/round-roll-call" element={<ProtectedRoute title="Round Roll Call"> <RoundRollCall /> </ProtectedRoute>} />
      <Route path="/teacher-attendance" element={<ProtectedRoute title="Teacher Attendance"> <TeacherAttendanceView /> </ProtectedRoute>} />
      <Route path="/requisitions" element={<ProtectedRoute title="Requisitions">    <Requisitions />                                                 </ProtectedRoute>} />
      <Route path="/purchase-requests" element={<ProtectedRoute title="Purchase Requests"><PurchaseRequests /></ProtectedRoute>} />
      <Route path="/requisitionsRes" element={<ProtectedRoute title="Requisitions"> <RequisitionsRes />                                              </ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute title="Chat center">            <ChatCenter />                                                   </ProtectedRoute>} />
      <Route path="/parent-messages" element={<ProtectedRoute title="Parent messages"><ParentMessages /></ProtectedRoute>} />
      <Route path="/payroll" element={<ProtectedRoute title="My Payroll">          <StaffPayroll />                                                 </ProtectedRoute>} />
      <Route path="/marks/view" element={<ProtectedRoute title="View Student Marks"><ViewMarks /></ProtectedRoute>} />
      <Route path="/marks/record" element={<ProtectedRoute title="Record Marks"><RecordMarks /></ProtectedRoute>} />
      <Route path="/marks/*" element={<ProtectedRoute title="Marks & Exams"><MarksRoutes /></ProtectedRoute>} />
      <Route
        path="/exam-eligibility"
        element={<ProtectedRoute title="Examination list"><ExaminationEligibility /></ProtectedRoute>}
      />
      <Route path="/permissions" element={<ProtectedRoute title="Permissions"><Permissions /></ProtectedRoute>} />
      <Route path="/school-calendar" element={<ProtectedRoute title="School Calendar"><SchoolCalendar /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute title="My Profile"><TeacherProfile /></ProtectedRoute>} />

      <Route path="*" element={<FallbackRoute />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AcademicSettingsProvider>
        <TpToastProvider>
          <Router>
            <AppContent />
          </Router>
        </TpToastProvider>
      </AcademicSettingsProvider>
    </AuthProvider>
  );
}

export default App;
