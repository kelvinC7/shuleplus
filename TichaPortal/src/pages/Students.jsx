import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Loader2, Search, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import ConductMarksModal from '../components/ConductMarksModal';
import { teacherInnerSearchCls } from '../utils/teacherGradebookUi';
import { resolveStudentPhotoUrl, studentInitials } from '../utils/studentDisplay';

const CLASS_TEACHER_SCOPE = { scope: 'class_teacher' };

function StudentAvatar({ student, size = 'md' }) {
  const [broken, setBroken] = useState(false);
  const src = resolveStudentPhotoUrl(student?.student_photo_url);
  const dim = size === 'sm' ? 'h-9 w-9 text-xs' : 'h-11 w-11 text-sm';

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        className={`${dim} shrink-0 rounded-full border border-[#000435]/10 object-cover bg-slate-100`}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full border border-[#000435]/10 bg-[#000435]/5 font-semibold text-[#000435]`}
    >
      {studentInitials(student?.name)}
    </div>
  );
}

const Students = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadWarning, setLoadWarning] = useState('');
  const [isConductModalOpen, setIsConductModalOpen] = useState(false);
  const [conductStudent, setConductStudent] = useState(null);

  const loadClasses = useCallback(async () => {
    const res = await api.get('/teacher-portal/classes', { params: CLASS_TEACHER_SCOPE });
    const list = res.data?.success && Array.isArray(res.data.data) ? res.data.data : [];
    setClasses(list);
    setSelectedClass((prev) => prev || list[0] || '');
    return list;
  }, []);

  const loadStudents = useCallback(async (className) => {
    if (!className) {
      setStudents([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/teacher-portal/students', {
        params: { ...CLASS_TEACHER_SCOPE, class_name: className, className },
      });
      if (res.data?.success) {
        setStudents(res.data.data || []);
        setLoadWarning(res.data.warning || '');
      }
    } catch (e) {
      console.error(e);
      setStudents([]);
      setLoadWarning('Could not load students.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses().catch(console.error);
  }, [loadClasses]);

  useEffect(() => {
    if (selectedClass) loadStudents(selectedClass);
  }, [selectedClass, loadStudents]);

  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.id || '').toLowerCase().includes(q) ||
        String(s.student_code || '').toLowerCase().includes(q)
    );
  }, [students, searchTerm]);

  const openConduct = (student = null) => {
    setConductStudent(student);
    setIsConductModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="border-b border-[#000435]/10 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#FCB038]">Class teacher</p>
            <h1 className="text-xl font-bold text-[#000435] sm:text-2xl">My class students</h1>
            <p className="mt-1 text-sm text-slate-600">
              Roster and conduct marks for classes where you are assigned as class teacher in Academic.
            </p>
          </div>

          {classes.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {classes.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClass(cls)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedClass === cls
                      ? 'border-[#000435] bg-[#000435] text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-[#FCB038]'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          )}

          {classes.length === 1 && (
            <p className="text-sm font-semibold text-[#000435]">Class: {classes[0]}</p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search by name or ID…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${teacherInnerSearchCls} !pl-9 !shadow-none`}
                disabled={!selectedClass}
              />
            </div>
            <button
              type="button"
              onClick={() => openConduct(null)}
              disabled={!selectedClass || !students.length}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FCB038] px-4 py-2.5 text-sm font-semibold text-[#000435] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Activity className="h-4 w-4" />
              Conduct marks
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        {loadWarning && (
          <div className="mb-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {loadWarning}
          </div>
        )}

        {!classes.length && !loading && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-600">
            No class teacher assignment found. Ask your school to assign you as class teacher in Academic.
          </div>
        )}

        {selectedClass && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin text-[#FCB038]" />
                Loading students…
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">No students in this class.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <li
                    key={s.row_id || s.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5 sm:py-4"
                  >
                    <StudentAvatar student={s} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[#000435]">{s.name}</p>
                      <p className="text-xs text-slate-500">
                        {s.student_code || s.id}
                        {s.stream ? ` · ${s.grade} ${s.stream}` : s.grade ? ` · ${s.grade}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openConduct(s)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#000435] hover:border-[#FCB038] hover:bg-[#FCB038]/10"
                    >
                      Conduct
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!loading && filteredStudents.length > 0 && (
              <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500 sm:px-5">
                {filteredStudents.length} student{filteredStudents.length === 1 ? '' : 's'}
              </div>
            )}
          </div>
        )}
      </div>

      <ConductMarksModal
        isOpen={isConductModalOpen}
        onClose={() => setIsConductModalOpen(false)}
        initialStudent={conductStudent}
        students={students}
        className={selectedClass}
      />
    </div>
  );
};

export default Students;
