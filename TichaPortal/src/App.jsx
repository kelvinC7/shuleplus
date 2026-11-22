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
import Timetable from './pages/Timetable';
import ExaminationEligibility from './pages/ExaminationEligibility';
import ClassRoomScan from './pages/ClassRoomScan';
import RoundRollCall from './pages/RoundRollCall';
import ClassAttendance from './pages/ClassAttendance';
import ClassStudentsAttendance from './pages/ClassStudentsAttendance';
import Requisitions from './pages/Requisitions';
import MarksRoutes from './pages/StudentsMarksPages/MarksRoutes';
import PurchaseRequests from './pages/PurchaseRequests';
import ChatCenter from './pages/ChatCenter';
import ParentMessages from './pages/ParentMessages';
import StaffPayroll from './pages/StaffPayroll';
import Permissions from './pages/Permissions';
import SchoolCalendar from './pages/SchoolCalendar';
import TeacherProfile from './pages/TeacherProfile';
import Console from './pages/Console';
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
import ExaminationLists from './pages/ExaminationLists';
import CreateAssessment from './pages/CreateAssessment';
import TeacherAssessmentsSchedule from './pages/TeacherAssessmentsSchedule';
import AssessmentMarks from './pages/AssessmentMarks';
import Splash from './components/Splash';
import YoInfoPage from './pages/YoInfo/YoInfoPage';
import { TpToastProvider } from './components/TpToast';
import PwaPrompts from './components/PwaPrompts';
import './index.css';

// ── Loading screen ────────────────────────────────────────────
const LoadingScreen = () => <Splash />;

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

const AttendancePageRoute = ({ title = 'Attendance' }) => (
  <ProtectedRoute title={title}>
    <RoundRollCall />
  </ProtectedRoute>
);

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
      <Route path="/lesson-planning/generate" element={<Navigate to="/lesson-planning/all" replace />} />
      <Route path="/lesson-planning/all" element={<ProtectedRoute title="All Lesson Plans"><AllLessonPlansPage /></ProtectedRoute>} />
      <Route path="/lesson-planning/book" element={<ProtectedRoute title="Lesson Plan Book"><LessonPlanBookPage /></ProtectedRoute>} />
      <Route path="/lesson-planning/performance" element={<ProtectedRoute title="Course Performance"><CoursePerformancePage /></ProtectedRoute>} />
      <Route path="/lesson-plans" element={<Navigate to="/lesson-planning/all" replace />} />
      <Route path="/lesson-plans/create" element={<Navigate to="/lesson-planning/generate" replace />} />
      <Route path="/lesson-plans/:id" element={<ProtectedRoute title="Lesson Plan"><LessonPlanEditor /></ProtectedRoute>} />
      <Route path="/my-courses" element={<ProtectedRoute title="My Courses"><MyCourses /></ProtectedRoute>} />
      <Route path="/examinations" element={<ProtectedRoute title="Examinations"><Examinations /></ProtectedRoute>} />
      <Route path="/examinations/:roomName" element={<ProtectedRoute title="Exam room"><ExaminationRoom /></ProtectedRoute>} />
      <Route path="/examination-lists" element={<ProtectedRoute title="Examination Lists"><ExaminationLists /></ProtectedRoute>} />
      <Route path="/assessments" element={<Navigate to="/assessments/schedule" replace />} />
      <Route path="/assessments/schedule" element={<ProtectedRoute title="Assessments"><TeacherAssessmentsSchedule /></ProtectedRoute>} />
      <Route path="/assessments/create" element={<ProtectedRoute title="Create Assessment"><CreateAssessment /></ProtectedRoute>} />
      <Route path="/assessments/:id/marks" element={<ProtectedRoute title="Enter marks"><AssessmentMarks /></ProtectedRoute>} />
      <Route path="/classroom-scan" element={<Navigate to="/class-room-scan" replace />} />
      <Route path="/my-attendance" element={<ProtectedRoute title="My Attendance"><ClassAttendance title="My Attendance" description="Your in/out attendance records from card or tab taps." /></ProtectedRoute>} />
      <Route path="/roll-call" element={<AttendancePageRoute title="Class Attendance" />} />
      <Route path="/calendar" element={<Navigate to="/school-calendar" replace />} />

      {/* New sidebar pages */}
      <Route path="/students" element={<ProtectedRoute title="Students">          <Students />                                                     </ProtectedRoute>} />
      <Route path="/timetable" element={<ProtectedRoute title="Timetable">         <Timetable />                                                    </ProtectedRoute>} />
      <Route path="/attendance" element={<AttendancePageRoute title="Class Attendance" />} />
      <Route path="/class-room-scan" element={<ProtectedRoute title="Classroom scan"><ClassRoomScan /></ProtectedRoute>} />
      <Route path="/round-roll-call" element={<AttendancePageRoute title="Round Roll Call" />} />
      <Route path="/period-attendance" element={<ProtectedRoute title="Class Attendance"><ClassAttendance title="Class Attendance" description="Your in/out attendance records from card or tab taps." /></ProtectedRoute>} />
      <Route path="/teacher-attendance" element={<ProtectedRoute title="My Attendance"><ClassAttendance title="My Attendance" description="Your in/out attendance records from card or tab taps." /></ProtectedRoute>} />
      <Route path="/class-students-attendance" element={<ProtectedRoute title="Class Students Attendance"><ClassStudentsAttendance /></ProtectedRoute>} />
      <Route path="/requisitions" element={<ProtectedRoute title="Requisitions">    <Requisitions />                                                 </ProtectedRoute>} />
      <Route path="/purchase-requests" element={<ProtectedRoute title="Purchase Requests"><PurchaseRequests /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute title="Chat center">            <ChatCenter />                                                   </ProtectedRoute>} />
      <Route path="/parent-messages" element={<ProtectedRoute title="Parent messages"><ParentMessages /></ProtectedRoute>} />
      <Route path="/payroll" element={<ProtectedRoute title="My Payroll">          <StaffPayroll />                                                 </ProtectedRoute>} />
      <Route path="/marks/view" element={<Navigate to="/marks/marks-center" replace />} />
      <Route path="/marks/*" element={<ProtectedRoute title="Marks & Exams"><MarksRoutes /></ProtectedRoute>} />
      <Route
        path="/exam-eligibility"
        element={<ProtectedRoute title="Examination list"><ExaminationEligibility /></ProtectedRoute>}
      />
      <Route path="/permissions" element={<ProtectedRoute title="Permissions"><Permissions /></ProtectedRoute>} />
      <Route path="/school-calendar" element={<ProtectedRoute title="School Calendar"><SchoolCalendar /></ProtectedRoute>} />
      <Route path="/yoinfo" element={<ProtectedRoute title="yoInfo"><YoInfoPage /></ProtectedRoute>} />
      <Route path="/console" element={<ProtectedRoute title="Console"><Console /></ProtectedRoute>} />
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
          <PwaPrompts />
        </TpToastProvider>
      </AcademicSettingsProvider>
    </AuthProvider>
  );
}

export default App;
