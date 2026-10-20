export type TemplateOwnership = 'official' | 'school' | 'personal';

export interface SuggestedActivity {
  title: string;
  defaultSelected: boolean;
  frequency?: string;
  verification?: string;
}

export interface SuggestedKpi {
  name: string;
  baseline?: number;
  target: number;
  unit: string;
}

export interface OfficialTemplateDefinition {
  slug: string;
  name: string;
  description: string;
  categoryId: string;
  goals: string[];
  objectives: string[];
  suggestedActivities: SuggestedActivity[];
  suggestedKpis: SuggestedKpi[];
  evidenceRequirements: string[];
  suggestedTimelineMonths: number;
  budgetCategories: string[];
  strategicPillars: string[];
  schoolTypes: string[];
}

export interface TemplateCategoryDefinition {
  id: string;
  label: string;
  icon: string;
  templates: string[];
}

export const OFFICIAL_TEMPLATE_CATEGORIES: TemplateCategoryDefinition[] = [
  {
    id: 'academic',
    label: 'Academic & Learning',
    icon: '🏫',
    templates: [
      'Academic Performance Improvement',
      'Student Examination Preparation',
      'Literacy Improvement',
      'Numeracy & Mathematics Improvement',
      'Science & STEM Improvement',
      'English Language Improvement',
      'Remedial Learning Program',
      'Gifted & High-Performing Students',
      'Homework & Continuous Assessment Improvement',
      'Teaching & Learning Quality Improvement',
      'School Performance Improvement',
      'Student Learning Recovery Plan',
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance & Retention',
    icon: '👨‍🎓',
    templates: [
      'Student Attendance Improvement',
      'Dropout Prevention',
      'Student Retention Plan',
      'Late Arrival Reduction',
      'At-Risk Student Support',
      'Student Absenteeism Reduction',
      'Student Enrollment Growth',
      'Student Transition & Retention',
    ],
  },
  {
    id: 'teacher',
    label: 'Teacher Development',
    icon: '👩‍🏫',
    templates: [
      'Teacher Professional Development',
      'Teacher CPD Plan',
      'Classroom Observation Improvement',
      'Teacher Performance Improvement',
      'New Teacher Induction',
      'Teacher Mentorship Program',
      'Teacher Attendance & Punctuality',
      'Digital Skills for Teachers',
      'Subject Department Improvement',
      'School Leadership Development',
    ],
  },
  {
    id: 'ict',
    label: 'ICT & Digital Transformation',
    icon: '💻',
    templates: [
      'School Digital Transformation',
      'ICT Infrastructure Improvement',
      'Digital Learning Implementation',
      'Computer Lab Improvement',
      'Teacher ICT Training',
      'Student Digital Skills',
      'School Internet Improvement',
      'Digital Student Records',
      'ICT Safety & Data Protection',
      'Smart School Implementation',
    ],
  },
  {
    id: 'stem',
    label: 'STEM & Innovation',
    icon: '🧪',
    templates: [
      'STEM Development Plan',
      'Science Laboratory Improvement',
      'Innovation & Entrepreneurship',
      'Coding & Programming',
      'Robotics Program',
      'School Innovation Projects',
      'Science Competition Preparation',
      'Student Research Projects',
    ],
  },
  {
    id: 'inclusive',
    label: 'Inclusive Education',
    icon: '♿',
    templates: [
      'Inclusive Education Improvement',
      'Students with Disabilities Support',
      'Accessibility Improvement',
      'Special Learning Materials',
      'Inclusive Classroom Development',
      'Teacher Training on Inclusion',
      'Gender Equality & Participation',
      'Vulnerable Student Support',
    ],
  },
  {
    id: 'welfare',
    label: 'Student Welfare',
    icon: '❤️',
    templates: [
      'Student Wellbeing',
      'School Counseling Program',
      'Child Protection',
      'Student Discipline Improvement',
      'Anti-Bullying Program',
      'Mental Wellbeing & Psychosocial Support',
      'Life Skills Development',
      'Health & Hygiene',
      'School Safety',
      'Emergency & Disaster Preparedness',
    ],
  },
  {
    id: 'feeding',
    label: 'Feeding & Nutrition',
    icon: '🍎',
    templates: [
      'School Feeding Improvement',
      'Student Nutrition Improvement',
      'School Kitchen Improvement',
      'School Canteen Improvement',
      'Food Safety & Hygiene',
      'School Garden / Agriculture Program',
    ],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure & Facilities',
    icon: '🏗️',
    templates: [
      'School Infrastructure Improvement',
      'Classroom Renovation',
      'School Toilet Improvement',
      'Water & Sanitation',
      'Electricity Improvement',
      'School Security Improvement',
      'Library Improvement',
      'Laboratory Improvement',
      'Sports Facilities Improvement',
      'Playground Improvement',
      'Accessibility Infrastructure',
      'School Maintenance Plan',
    ],
  },
  {
    id: 'environment',
    label: 'Environment',
    icon: '🌱',
    templates: [
      'School Environmental Improvement',
      'Tree Planting',
      'Waste Management',
      'Clean School Campaign',
      'Water Conservation',
      'Energy Conservation',
      'School Garden',
      'Climate & Environmental Awareness',
    ],
  },
  {
    id: 'parents',
    label: 'Parents & Community',
    icon: '👨‍👩‍👧',
    templates: [
      'Parent Engagement',
      'Parent Meeting Program',
      'Parent Communication Improvement',
      'Community Engagement',
      'Parent Education & Awareness',
      'Home Visit Program',
      'School-Community Partnership',
      'PTA Improvement',
    ],
  },
  {
    id: 'student-dev',
    label: 'Student Development',
    icon: '🧑‍🎓',
    templates: [
      'Career Guidance',
      'Career & University Preparation',
      'Student Leadership',
      'Entrepreneurship',
      'Life Skills',
      'School Clubs Development',
      'Sports Development',
      'Arts & Culture',
      'Debate & Public Speaking',
      'Student Talent Development',
    ],
  },
  {
    id: 'governance',
    label: 'Governance & Management',
    icon: '🏛️',
    templates: [
      'School Governance Improvement',
      'School Strategic Improvement',
      'School Leadership Action Plan',
      'Data-Driven School Management',
      'School Policy Implementation',
      'Internal Monitoring & Evaluation',
      'School Compliance Plan',
      'Quality Assurance',
      'Risk Management',
      'School Accountability Improvement',
    ],
  },
  {
    id: 'finance',
    label: 'Finance & Resources',
    icon: '💰',
    templates: [
      'School Budget Improvement',
      'Financial Management Improvement',
      'Resource Mobilization',
      'Cost Reduction Plan',
      'Asset Management Improvement',
      'Procurement Improvement',
      'Inventory Management Improvement',
      'School Revenue Improvement',
    ],
  },
];

function slugify(categoryId: string, name: string): string {
  return `${categoryId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
}

function defaultActivities(name: string, categoryId: string): SuggestedActivity[] {
  const lower = name.toLowerCase();
  const base: SuggestedActivity[] = [
    { title: 'Conduct baseline assessment and gap analysis', defaultSelected: true, frequency: 'Once', verification: 'Baseline report' },
    { title: 'Define SMART targets with department leads', defaultSelected: true, frequency: 'Once', verification: 'Approved targets document' },
    { title: 'Assign responsible owners and support teams', defaultSelected: true, frequency: 'Once', verification: 'Responsibility matrix' },
    { title: 'Monthly progress review meetings', defaultSelected: true, frequency: 'Monthly', verification: 'Meeting minutes' },
    { title: 'Collect and verify evidence of implementation', defaultSelected: true, frequency: 'Monthly', verification: 'Evidence portfolio' },
    { title: 'Stakeholder awareness and communication campaign', defaultSelected: false, frequency: 'Quarterly', verification: 'Communication records' },
    { title: 'Mid-term evaluation and corrective actions', defaultSelected: false, frequency: 'Once', verification: 'Evaluation report' },
    { title: 'End-of-period impact assessment', defaultSelected: false, frequency: 'Once', verification: 'Impact assessment report' },
  ];

  if (categoryId === 'attendance' || lower.includes('attendance') || lower.includes('absenteeism') || lower.includes('late arrival')) {
    return [
      { title: 'Daily attendance monitoring and reporting', defaultSelected: true, frequency: 'Daily', verification: 'Attendance register' },
      { title: 'Parent notification for repeated absence', defaultSelected: true, frequency: 'Weekly', verification: 'SMS/call logs' },
      { title: 'Identify and support at-risk students', defaultSelected: true, frequency: 'Weekly', verification: 'At-risk student list' },
      { title: 'Weekly attendance review with class teachers', defaultSelected: true, frequency: 'Weekly', verification: 'Review minutes' },
      { title: 'Home visits for chronic absenteeism', defaultSelected: false, frequency: 'Monthly', verification: 'Visit reports' },
      { title: 'Attendance awareness campaign for students and parents', defaultSelected: false, frequency: 'Termly', verification: 'Campaign materials' },
      { title: 'Incentives for improved class attendance', defaultSelected: false, frequency: 'Monthly', verification: 'Incentive records' },
      { title: 'Termly attendance trend analysis', defaultSelected: true, frequency: 'Termly', verification: 'Trend report' },
    ];
  }

  if (lower.includes('mathematics') || lower.includes('numeracy')) {
    return [
      { title: 'Diagnose mathematics learning gaps by class', defaultSelected: true, frequency: 'Once', verification: 'Diagnostic results' },
      { title: 'Remedial mathematics sessions for struggling learners', defaultSelected: true, frequency: 'Weekly', verification: 'Session registers' },
      { title: 'Peer tutoring and mathematics clubs', defaultSelected: false, frequency: 'Weekly', verification: 'Club attendance' },
      { title: 'Teacher coaching on numeracy pedagogy', defaultSelected: true, frequency: 'Monthly', verification: 'Coaching logs' },
      { title: 'Use of manipulatives and practical mathematics', defaultSelected: false, frequency: 'Weekly', verification: 'Lesson observation' },
      { title: 'Monthly mathematics assessment tracking', defaultSelected: true, frequency: 'Monthly', verification: 'Assessment records' },
      { title: 'Parent workshops on supporting numeracy at home', defaultSelected: false, frequency: 'Termly', verification: 'Workshop attendance' },
      { title: 'Mathematics competition preparation', defaultSelected: false, frequency: 'Termly', verification: 'Competition results' },
    ];
  }

  if (lower.includes('discipline') || lower.includes('bullying') || lower.includes('wellbeing') || lower.includes('counseling')) {
    return [
      { title: 'Establish student behaviour tracking system', defaultSelected: true, frequency: 'Weekly', verification: 'Incident logs' },
      { title: 'Counselling sessions for affected students', defaultSelected: true, frequency: 'Weekly', verification: 'Counselling records' },
      { title: 'Anti-bullying awareness sessions', defaultSelected: true, frequency: 'Monthly', verification: 'Session reports' },
      { title: 'Teacher training on positive discipline', defaultSelected: true, frequency: 'Termly', verification: 'Training certificates' },
      { title: 'Peer support and mentorship programme', defaultSelected: false, frequency: 'Weekly', verification: 'Programme register' },
      { title: 'Parent engagement on student conduct', defaultSelected: false, frequency: 'Monthly', verification: 'Meeting minutes' },
      { title: 'Review and update school code of conduct', defaultSelected: false, frequency: 'Once', verification: 'Updated policy' },
      { title: 'Termly wellbeing survey and analysis', defaultSelected: true, frequency: 'Termly', verification: 'Survey report' },
    ];
  }

  if (categoryId === 'teacher' || lower.includes('teacher')) {
    return [
      { title: 'Identify teacher development needs', defaultSelected: true, frequency: 'Once', verification: 'TNA report' },
      { title: 'Deliver targeted CPD workshops', defaultSelected: true, frequency: 'Monthly', verification: 'Training records' },
      { title: 'Classroom observation and feedback cycles', defaultSelected: true, frequency: 'Monthly', verification: 'Observation forms' },
      { title: 'Mentoring for new or underperforming teachers', defaultSelected: true, frequency: 'Weekly', verification: 'Mentoring logs' },
      { title: 'Lesson planning quality reviews', defaultSelected: false, frequency: 'Weekly', verification: 'Review checklist' },
      { title: 'Subject department learning circles', defaultSelected: false, frequency: 'Monthly', verification: 'Meeting minutes' },
      { title: 'Teacher performance appraisal follow-up', defaultSelected: true, frequency: 'Termly', verification: 'Appraisal records' },
      { title: 'Share best practice through internal seminars', defaultSelected: false, frequency: 'Termly', verification: 'Seminar reports' },
    ];
  }

  if (categoryId === 'ict' || lower.includes('digital') || lower.includes('ict')) {
    return [
      { title: 'Audit current ICT infrastructure and gaps', defaultSelected: true, frequency: 'Once', verification: 'ICT audit report' },
      { title: 'Teacher training on digital tools', defaultSelected: true, frequency: 'Monthly', verification: 'Training attendance' },
      { title: 'Integrate digital resources into lessons', defaultSelected: true, frequency: 'Weekly', verification: 'Lesson plans' },
      { title: 'Maintain and upgrade ICT equipment', defaultSelected: false, frequency: 'Monthly', verification: 'Maintenance log' },
      { title: 'Student digital literacy sessions', defaultSelected: true, frequency: 'Weekly', verification: 'Session records' },
      { title: 'ICT safety and data protection training', defaultSelected: true, frequency: 'Termly', verification: 'Training certificates' },
      { title: 'Pilot smart classroom tools', defaultSelected: false, frequency: 'Termly', verification: 'Pilot evaluation' },
      { title: 'Monitor internet uptime and usage', defaultSelected: false, frequency: 'Weekly', verification: 'Uptime report' },
    ];
  }

  if (categoryId === 'finance' || lower.includes('budget') || lower.includes('financial')) {
    return [
      { title: 'Review current budget allocation and utilization', defaultSelected: true, frequency: 'Once', verification: 'Budget review report' },
      { title: 'Implement monthly expenditure tracking', defaultSelected: true, frequency: 'Monthly', verification: 'Expenditure reports' },
      { title: 'Identify cost-saving opportunities', defaultSelected: true, frequency: 'Quarterly', verification: 'Savings analysis' },
      { title: 'Strengthen procurement procedures', defaultSelected: false, frequency: 'Quarterly', verification: 'Procurement audit' },
      { title: 'Resource mobilization outreach to partners', defaultSelected: false, frequency: 'Quarterly', verification: 'Partnership records' },
      { title: 'Asset register update and verification', defaultSelected: true, frequency: 'Termly', verification: 'Asset register' },
      { title: 'Financial literacy training for budget holders', defaultSelected: false, frequency: 'Termly', verification: 'Training records' },
      { title: 'Quarterly financial performance review', defaultSelected: true, frequency: 'Quarterly', verification: 'Review minutes' },
    ];
  }

  if (categoryId === 'parents' || lower.includes('parent') || lower.includes('community') || lower.includes('pta')) {
    return [
      { title: 'Schedule regular parent meetings', defaultSelected: true, frequency: 'Monthly', verification: 'Meeting attendance' },
      { title: 'Improve parent communication channels (SMS, portal)', defaultSelected: true, frequency: 'Weekly', verification: 'Communication logs' },
      { title: 'Parent education workshops', defaultSelected: true, frequency: 'Termly', verification: 'Workshop reports' },
      { title: 'Home visit programme for priority cases', defaultSelected: false, frequency: 'Monthly', verification: 'Visit reports' },
      { title: 'Strengthen PTA governance and activities', defaultSelected: false, frequency: 'Monthly', verification: 'PTA minutes' },
      { title: 'Community partnership agreements', defaultSelected: false, frequency: 'Termly', verification: 'MoU records' },
      { title: 'Parent feedback collection and response', defaultSelected: true, frequency: 'Termly', verification: 'Feedback report' },
      { title: 'Celebrate community contributions', defaultSelected: false, frequency: 'Termly', verification: 'Event records' },
    ];
  }

  return base;
}

function defaultKpis(name: string, categoryId: string): SuggestedKpi[] {
  const lower = name.toLowerCase();
  if (categoryId === 'attendance' || lower.includes('attendance') || lower.includes('absenteeism')) {
    return [
      { name: 'Overall student attendance rate', baseline: 84, target: 95, unit: '%' },
      { name: 'Chronic absenteeism cases', baseline: 45, target: 15, unit: 'students' },
      { name: 'Late arrival rate', baseline: 12, target: 5, unit: '%' },
    ];
  }
  if (lower.includes('mathematics') || lower.includes('numeracy')) {
    return [
      { name: 'Mathematics average score', baseline: 48, target: 65, unit: '%' },
      { name: 'Learners meeting numeracy benchmark', baseline: 52, target: 75, unit: '%' },
      { name: 'Remedial session attendance', baseline: 60, target: 90, unit: '%' },
    ];
  }
  if (lower.includes('discipline') || lower.includes('bullying')) {
    return [
      { name: 'Discipline incidents per term', baseline: 32, target: 15, unit: 'cases' },
      { name: 'Repeat offenders', baseline: 18, target: 8, unit: 'students' },
      { name: 'Student satisfaction with school safety', baseline: 65, target: 85, unit: '%' },
    ];
  }
  if (categoryId === 'teacher' || lower.includes('teacher performance')) {
    return [
      { name: 'Teachers meeting performance standards', baseline: 72, target: 90, unit: '%' },
      { name: 'CPD hours completed per teacher', baseline: 8, target: 24, unit: 'hours' },
      { name: 'Teacher punctuality rate', baseline: 88, target: 98, unit: '%' },
    ];
  }
  if (categoryId === 'finance') {
    return [
      { name: 'Budget utilization rate', baseline: 65, target: 90, unit: '%' },
      { name: 'Unplanned expenditure', baseline: 15, target: 5, unit: '%' },
      { name: 'Revenue collection rate', baseline: 78, target: 95, unit: '%' },
    ];
  }
  return [
    { name: 'Implementation progress', baseline: 0, target: 100, unit: '%' },
    { name: 'Target indicator achievement', baseline: 50, target: 80, unit: '%' },
    { name: 'Stakeholder satisfaction', baseline: 60, target: 85, unit: '%' },
  ];
}

function defaultBudgetCategories(categoryId: string): string[] {
  const map: Record<string, string[]> = {
    academic: ['Teaching materials', 'Remedial sessions', 'Assessment tools', 'Training'],
    attendance: ['Communication', 'Home visits', 'Incentives', 'Monitoring tools'],
    teacher: ['CPD workshops', 'Training materials', 'Mentoring', 'Observation tools'],
    ict: ['Equipment', 'Internet', 'Software licences', 'Maintenance'],
    stem: ['Lab materials', 'Robotics kits', 'Competition fees', 'Training'],
    inclusive: ['Assistive devices', 'Special materials', 'Training', 'Accessibility'],
    welfare: ['Counselling', 'Awareness materials', 'Safety equipment', 'Training'],
    feeding: ['Food supplies', 'Kitchen equipment', 'Hygiene supplies', 'Garden inputs'],
    infrastructure: ['Construction', 'Repairs', 'Materials', 'Labour'],
    environment: ['Tree seedlings', 'Waste bins', 'Awareness materials', 'Garden tools'],
    parents: ['Communication', 'Workshops', 'Events', 'Transport'],
    'student-dev': ['Career materials', 'Club equipment', 'Events', 'Coaching'],
    governance: ['Training', 'Monitoring tools', 'Documentation', 'Consultancy'],
    finance: ['Systems', 'Training', 'Audit', 'Consultancy'],
  };
  return map[categoryId] ?? ['Materials', 'Training', 'Transport', 'Other'];
}

function defaultPillars(categoryId: string): string[] {
  const map: Record<string, string[]> = {
    academic: ['Quality of Education', 'Learning Outcomes'],
    attendance: ['Student Welfare', 'Retention & Attendance'],
    teacher: ['Teacher Professionalism', 'Quality of Education'],
    ict: ['ICT Integration', 'Digital Transformation'],
    stem: ['STEM & Innovation', 'Quality of Education'],
    inclusive: ['Inclusive Education', 'Equity & Access'],
    welfare: ['Student Welfare', 'Safety & Protection'],
    feeding: ['Student Welfare', 'Health & Nutrition'],
    infrastructure: ['Infrastructure', 'Learning Environment'],
    environment: ['Environment', 'Sustainability'],
    parents: ['Community Engagement', 'Parent Partnership'],
    'student-dev': ['Holistic Development', 'Career Readiness'],
    governance: ['Governance', 'Accountability'],
    finance: ['Financial Management', 'Resource Optimization'],
  };
  return map[categoryId] ?? ['School Improvement'];
}

function buildDescription(name: string, categoryLabel: string): string {
  return `Official Rwanda school improvement template for ${name.toLowerCase()}. Supports ${categoryLabel} planning with pre-defined goals, objectives, suggested activities, KPIs, and evidence requirements aligned to school action planning best practice.`;
}

export function buildOfficialTemplate(category: TemplateCategoryDefinition, name: string): OfficialTemplateDefinition {
  const slug = slugify(category.id, name);
  return {
    slug,
    name,
    description: buildDescription(name, category.label),
    categoryId: category.id,
    goals: [`Improve ${name.toLowerCase()} across the school`],
    objectives: [
      `Establish clear baseline and targets for ${name.toLowerCase()}`,
      `Implement monitored activities with assigned ownership`,
      `Achieve measurable improvement by end of academic year`,
    ],
    suggestedActivities: defaultActivities(name, category.id),
    suggestedKpis: defaultKpis(name, category.id),
    evidenceRequirements: [
      'Baseline assessment report',
      'Activity implementation records',
      'Progress review meeting minutes',
      'KPI tracking dashboard or spreadsheet',
      'Photographic or documentary evidence',
      'End-of-period evaluation report',
    ],
    suggestedTimelineMonths: 10,
    budgetCategories: defaultBudgetCategories(category.id),
    strategicPillars: defaultPillars(category.id),
    schoolTypes: ['Primary', 'Secondary', 'TVET', 'Combined'],
  };
}

export const ALL_OFFICIAL_TEMPLATES: OfficialTemplateDefinition[] = OFFICIAL_TEMPLATE_CATEGORIES.flatMap(
  (cat) => cat.templates.map((name) => buildOfficialTemplate(cat, name))
);

export const OFFICIAL_TEMPLATE_BY_SLUG = new Map(ALL_OFFICIAL_TEMPLATES.map((t) => [t.slug, t]));

/** Maps school data signals to recommended template slugs */
export const RECOMMENDATION_RULES: {
  slug: string;
  keywords: string[];
  metricLabel: string;
  defaultCurrent: number | string;
  defaultTarget: number | string;
  unit: string;
  severity: 'high' | 'medium' | 'low';
}[] = [
  { slug: 'attendance-student-attendance-improvement', keywords: ['attendance'], metricLabel: 'Attendance rate', defaultCurrent: 84, defaultTarget: 95, unit: '%', severity: 'high' },
  { slug: 'academic-numeracy-mathematics-improvement', keywords: ['math', 'numeracy'], metricLabel: 'Mathematics average', defaultCurrent: 48, defaultTarget: 65, unit: '%', severity: 'high' },
  { slug: 'welfare-student-discipline-improvement', keywords: ['discipline', 'conduct'], metricLabel: 'Discipline cases', defaultCurrent: 32, defaultTarget: 15, unit: 'cases', severity: 'medium' },
  { slug: 'teacher-teacher-performance-improvement', keywords: ['teacher'], metricLabel: 'Teacher performance', defaultCurrent: 72, defaultTarget: 90, unit: '%', severity: 'medium' },
  { slug: 'academic-literacy-improvement', keywords: ['literacy', 'reading'], metricLabel: 'Literacy rate', defaultCurrent: 55, defaultTarget: 75, unit: '%', severity: 'medium' },
  { slug: 'attendance-dropout-prevention', keywords: ['dropout', 'retention'], metricLabel: 'Dropout rate', defaultCurrent: 8, defaultTarget: 3, unit: '%', severity: 'high' },
  { slug: 'parents-parent-engagement', keywords: ['parent'], metricLabel: 'Parent engagement', defaultCurrent: 45, defaultTarget: 80, unit: '%', severity: 'low' },
  { slug: 'ict-digital-learning-implementation', keywords: ['ict', 'digital'], metricLabel: 'Digital lesson coverage', defaultCurrent: 30, defaultTarget: 70, unit: '%', severity: 'low' },
];
