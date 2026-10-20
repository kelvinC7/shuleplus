/** Rwanda school strategic pillars — aligned with national planning priorities. */
export interface StrategicPillar {
  id: string;
  name: string;
  icon: string;
  color: string;
  themes: string[];
}

export const RWANDA_STRATEGIC_PILLARS: StrategicPillar[] = [
  {
    id: 'teaching-learning',
    name: 'Teaching & Learning',
    icon: '📚',
    color: '#3b82f6',
    themes: [
      'Improve student performance',
      'Literacy and numeracy improvement',
      'Remedial learning',
      'Exam preparation',
      'Teacher lesson preparation',
      'Classroom observation',
      'Reduce repetition',
    ],
  },
  {
    id: 'student-welfare',
    name: 'Student Welfare & Attendance',
    icon: '👨‍🎓',
    color: '#22c55e',
    themes: [
      'Daily attendance improvement',
      'Dropout prevention',
      'Early-warning system',
      'Identify at-risk students',
      'Counseling',
      'School feeding monitoring',
      'Student health and welfare',
    ],
  },
  {
    id: 'teacher-development',
    name: 'Teacher Development',
    icon: '👩‍🏫',
    color: '#f59e0b',
    themes: [
      'CPD activities',
      'Teacher training',
      'Peer learning',
      'Classroom observation',
      'Performance improvement plans',
      'Attendance and punctuality',
    ],
  },
  {
    id: 'ict-stem',
    name: 'ICT, STEM & Innovation',
    icon: '💻',
    color: '#8b5cf6',
    themes: [
      'Computer laboratory improvement',
      'Teacher ICT training',
      'Digital learning',
      'Robotics/coding/innovation activities',
      'STEM projects',
      'Internet improvement',
    ],
  },
  {
    id: 'inclusive-education',
    name: 'Inclusive Education',
    icon: '♿',
    color: '#ec4899',
    themes: [
      'Support students with disabilities',
      'Accessibility improvement',
      'Special education materials',
      'Inclusive classrooms',
      'Teacher support and training',
    ],
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure & Environment',
    icon: '🏫',
    color: '#f97316',
    themes: [
      'Classrooms',
      'Toilets',
      'Water',
      'Electricity',
      'Kitchen',
      'Playground',
      'School maintenance',
      'Tree planting',
      'Cleanliness',
      'Disaster preparedness',
    ],
  },
  {
    id: 'community-parent',
    name: 'Community & Parent Engagement',
    icon: '👨‍👩‍👧',
    color: '#14b8a6',
    themes: [
      'Parent meetings',
      'Home visits',
      'School-community activities',
      'PTA initiatives',
      'Awareness campaigns',
    ],
  },
  {
    id: 'career-guidance',
    name: 'Career Guidance & Student Development',
    icon: '🧑‍🎓',
    color: '#6366f1',
    themes: [
      'Career guidance',
      'Counseling',
      'Entrepreneurship',
      'Life skills',
      'Discipline improvement',
      'School clubs',
    ],
  },
  {
    id: 'governance',
    name: 'Governance & School Management',
    icon: '🏅',
    color: '#6b7280',
    themes: [
      'Leadership meetings',
      'Data-driven decisions',
      'Compliance activities',
      'School policies',
      'Internal audits',
      'Risk management',
    ],
  },
];

export const FUNDING_SOURCES = [
  'School Budget',
  'School Fees',
  'Government Support',
  'Parents',
  'PTA',
  'Donor',
  'NGO',
  'Partner',
  'School Generated Income',
  'Other',
] as const;

export const DEPARTMENTS = [
  'Administration',
  'Academic / Studies',
  'Finance / Bursar',
  'Discipline',
  'Welfare',
  'ICT',
  'Sports & Culture',
  'Maintenance',
  'Board / Leadership',
] as const;

export function pillarById(id: string): StrategicPillar | undefined {
  return RWANDA_STRATEGIC_PILLARS.find((p) => p.id === id);
}

export function pillarByName(name: string): StrategicPillar | undefined {
  return RWANDA_STRATEGIC_PILLARS.find((p) => p.name === name);
}
