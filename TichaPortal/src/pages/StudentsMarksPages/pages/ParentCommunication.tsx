import TeacherParentChat from '../../../components/TeacherParentChat';

export default function ParentCommunication() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-navy">Parent communication</h1>
        <p className="mt-1 text-sm text-gray-500">Pick a student and parent, then chat in real time.</p>
      </div>
      <TeacherParentChat showHero={false} />
    </div>
  );
}
