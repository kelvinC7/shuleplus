import type { YoAuthor, YoComment, YoStory } from '../types/yoinfo';

/**
 * MOCK DATA — replace with backend responses later (see services/yoinfo-api.ts).
 *
 * yoInfo is a general news feed for school directors and other leaders
 * (scholars, government officials, professionals). It carries NO private school
 * data (fees, attendance, learners…). All outlets, figures and stories below are
 * invented placeholders. Photos in /public/yoinfo are placeholders too.
 */

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const A: Record<string, YoAuthor> = {
  daily: { id: 'a1', name: 'Yo Daily', handle: 'yodaily', color: '#FCB038', verified: true, bio: 'Your daily briefing on what matters for leaders.', followers: 48200, kind: 'page' },
  policy: { id: 'a2', name: 'Policy Brief', handle: 'policybrief', color: '#3E7BFA', verified: true, bio: 'Plain-language analysis of public policy and reform.', followers: 21400, kind: 'page' },
  campus: { id: 'a3', name: 'Campus Review', handle: 'campusreview', color: '#168A55', verified: true, bio: 'News and views from universities, colleges and schools.', followers: 16900, kind: 'page' },
  econ: { id: 'a4', name: 'Economy Watch', handle: 'economywatch', color: '#B5771A', verified: true, bio: 'Markets, trade, jobs and growth, explained.', followers: 33100, kind: 'page' },
  tech: { id: 'a5', name: 'Tech & Society', handle: 'techsociety', color: '#0E8FA3', bio: 'How technology is changing government, work and daily life.', followers: 27800, kind: 'page' },
  green: { id: 'a6', name: 'Green Desk', handle: 'greendesk', color: '#6BAA3A', bio: 'Conservation, climate and sustainable development.', followers: 19500, kind: 'page' },
  lead: { id: 'a7', name: 'Leaders Digest', handle: 'leadersdigest', color: '#7C5CFA', verified: true, bio: 'Ideas and habits from leaders across sectors.', followers: 52300, kind: 'page' },
  health: { id: 'a8', name: 'Health Desk', handle: 'healthdesk', color: '#D64545', bio: 'Evidence-based health and wellbeing for busy people.', followers: 14200, kind: 'page' },
  research: { id: 'a9', name: 'Research Digest', handle: 'researchdigest', color: '#13213D', bio: 'Summaries of new studies, in minutes not hours.', followers: 9800, kind: 'page' },
  civil: { id: 'a10', name: 'Civil Society Watch', handle: 'civilsocietywatch', color: '#C2548A', bio: 'Stories from NGOs, faith groups and community builders.', followers: 7600, kind: 'page' },
};

export const MOCK_STORIES: YoStory[] = [
  {
    id: 's1',
    category: 'Policy',
    headline: 'Road safety moves into the classroom as officials back early-years training',
    summary:
      'Traffic officers and primary schools are piloting hands-on sessions where young children practise crossing signals, a low-cost approach policymakers hope to scale nationwide.',
    body: [
      'A joint programme between traffic police and primary schools is putting road safety education in front of children long before they travel alone.',
      'Sessions are practical: pupils hold signal paddles, take turns acting as marshals and learn why we stop, look and cross only at marked crossings.',
      'Officials say early habits matter, and that children often carry the message home to parents and drivers in their families.',
      'Policy analysts note that the model is cheap to run and easy to replicate, and are calling for clear metrics so results can be compared across districts.',
    ],
    image: '/yoinfo/road-safety.webp',
    author: A.policy,
    publishedAt: ago(42),
    readMins: 3,
    location: 'Kigali',
    likes: 2840,
    comments: 143,
    shares: 312,
  },
  {
    id: 's2',
    category: 'Education',
    headline: 'Exam season: why spot checks in exam rooms protect public trust in results',
    summary:
      'Education officials are visiting exam rooms during national assessments, a visible reminder that credible results depend on process as much as on pupils.',
    body: [
      'As national exams get under way, officials are visiting exam rooms to see that procedures are followed from the opening of papers to the collection of scripts.',
      'Education researchers argue that visible oversight strengthens confidence in results among families, universities and employers.',
      'Commentators also point to the human side: calm, well-prepared invigilators and a quiet room make a measurable difference to candidates.',
      'The debate now is how technology, from secure paper tracking to digital marking, can add integrity without adding burden.',
    ],
    image: '/yoinfo/exam-visit.webp',
    author: A.campus,
    publishedAt: ago(95),
    readMins: 3,
    location: 'Nyarugenge',
    likes: 1920,
    comments: 87,
    shares: 204,
  },
  {
    id: 's3',
    category: 'Economy',
    headline: 'Growth outlook: analysts see services and agriculture leading the next year',
    summary:
      'A round-up of forecasts suggests steady expansion, with services, construction and agricultural value-addition expected to carry the momentum.',
    big: '5.1%',
    gradient: ['#0E2A3F', '#000435'],
    body: [
      'Economists surveyed this month expect steady growth next year, supported by services, construction and a recovering export sector.',
      'The main risks they cite are global price swings, borrowing costs and weather shocks to farming.',
      'Several analysts say the biggest long-term lever is skills: a workforce that can move into higher-value work.',
      'The headline figure here is a sample number for the preview, not a real forecast.',
    ],
    author: A.econ,
    publishedAt: ago(180),
    readMins: 3,
    likes: 764,
    comments: 41,
    shares: 58,
  },
  {
    id: 's4',
    category: 'Technology',
    headline: 'Mobile-first public services: citizens are doing more of their paperwork on a phone',
    summary:
      'From payments to permits, governments in the region are shifting services to mobile. Experts say design and trust, not just coverage, decide whether people use them.',
    body: [
      'More public services can now be reached from a basic smartphone: applications, payments, appointments and notifications.',
      'Researchers who study digital adoption say usability and trust matter as much as network coverage. People return to services that are simple, fast and secure.',
      'Local-language interfaces and help in person remain important, especially for first-time users.',
      'The next challenge is making sure data is protected and that people who are offline are not left behind.',
    ],
    image: '/yoinfo/parent-app.webp',
    imageFit: 'contain',
    imageBg: '#EFE7D8',
    author: A.tech,
    publishedAt: ago(260),
    readMins: 4,
    likes: 3105,
    comments: 212,
    shares: 441,
  },
  {
    id: 's5',
    category: 'Environment',
    headline: 'Conservation pays: how protecting mountain gorillas funds clinics, roads and schools',
    summary:
      'Revenue-sharing from wildlife tourism has become one of the region’s best-known conservation models, and a case study in linking nature to local development.',
    body: [
      'Silverback gorillas are among the best-known symbols of conservation success in the region.',
      'A share of tourism income is directed to surrounding communities, supporting health centres, classrooms and small infrastructure.',
      'Scholars see it as a case study for policy: when people benefit directly from protected areas, protection tends to last.',
      'Experts add that growth must be managed carefully so that visitor numbers do not harm the habitat that attracts them.',
    ],
    image: '/yoinfo/gorilla.webp',
    author: A.green,
    publishedAt: ago(340),
    readMins: 4,
    location: 'Volcanoes region',
    likes: 5210,
    comments: 389,
    shares: 902,
  },
  {
    id: 's6',
    category: 'Economy',
    headline: 'Tea harvest rises with good rains. The next prize is value-addition',
    summary:
      'Growers report a strong season, and policy discussion is shifting from volume to processing, branding and higher-margin exports.',
    body: [
      'Rolling green slopes are busy again as pickers fill their baskets at dawn, and cooperatives report a healthy season.',
      'Analysts say the real gains lie beyond the farm gate: processing, packaging and branding that let producers capture more of the final price.',
      'Financing and training for young growers are recurring themes in policy forums.',
      'Climate resilience, from shade management to water use, is increasingly part of the conversation.',
    ],
    image: '/yoinfo/tea-harvest.webp',
    author: A.econ,
    publishedAt: ago(520),
    readMins: 3,
    location: 'Western Province',
    likes: 1387,
    comments: 66,
    shares: 120,
  },
  {
    id: 's7',
    category: 'Research',
    headline: 'Skills gap: employers want graduates who can do, not only know',
    summary:
      'A sample employer survey suggests graduates are strong on theory but need more practical, workplace-ready skills. Universities are responding with internships and project-based courses.',
    big: '1 in 3',
    gradient: ['#1D1856', '#000435'],
    body: [
      'In the survey, roughly one in three employers said new graduates needed significant on-the-job training before they were productive.',
      'Respondents asked for stronger communication, problem-solving and digital skills alongside technical knowledge.',
      'Universities and colleges are expanding internships, apprenticeships and industry-linked projects.',
      'The figure shown is sample data for the preview.',
    ],
    author: A.research,
    publishedAt: ago(700),
    readMins: 4,
    likes: 944,
    comments: 29,
    shares: 77,
  },
  {
    id: 's8',
    category: 'Society',
    headline: 'Faith-based and civil society groups expand support for vulnerable families',
    summary:
      'Partnerships between community organisations and local authorities are widening access to family support, food assistance and child protection services.',
    body: [
      'Volunteers and staff from a local charity gathered to mark the opening of a new community support point.',
      'The services on offer include family support, food assistance and help for children at risk of dropping out of school.',
      'Civil society observers say these partnerships work best when roles are clear and referrals between agencies are fast.',
      'Organisers are appealing for skilled volunteers, including retired professionals.',
    ],
    image: '/yoinfo/community-outreach.webp',
    author: A.civil,
    publishedAt: ago(1_000),
    readMins: 3,
    location: 'Kigali',
    likes: 2230,
    comments: 118,
    shares: 265,
  },
  {
    id: 's9',
    category: 'Leadership',
    headline: 'Five habits of leaders who decide faster without losing trust',
    summary:
      'Speed and trust are not opposites. Executives and public-sector leaders describe the routines that help them decide quickly and still bring people along.',
    gradient: ['#13213D', '#000435'],
    body: [
      'Name the decision and its owner first. Most delays come from unclear ownership, not hard choices.',
      'Separate reversible from irreversible decisions. Move fast on the first kind, slow down on the second.',
      'Write down the reasoning, so people can disagree with the logic rather than the person.',
      'Close the loop. Tell those affected what was decided and why, even when the answer is no.',
      'Review outcomes openly. A culture that learns from misses makes quicker calls next time.',
    ],
    author: A.lead,
    publishedAt: ago(1_300),
    readMins: 3,
    likes: 4012,
    comments: 276,
    shares: 1204,
  },
  {
    id: 's10',
    category: 'Health',
    headline: 'Sleep is a performance tool: why senior leaders are rethinking the late-night inbox',
    summary:
      'Occupational-health specialists say consistent sleep protects judgement and mood, and that organisations set the tone for after-hours messaging.',
    big: '7–8 h',
    gradient: ['#3A0B16', '#000435'],
    body: [
      'Specialists generally advise adults to aim for seven to nine hours of sleep, and note that chronic shortfalls affect memory, mood and decision-making.',
      'Some organisations now agree norms for after-hours messages so that urgent matters are clear and everything else can wait.',
      'Leaders who model rest give permission to their teams to do the same.',
      'This is general information, not medical advice. Speak to a health professional about personal concerns.',
    ],
    author: A.health,
    publishedAt: ago(1_900),
    readMins: 3,
    likes: 1672,
    comments: 94,
    shares: 388,
  },
  {
    id: 's11',
    category: 'Policy',
    headline: 'Public–private partnerships: what a stronger framework could unlock',
    summary:
      'Policy specialists argue that clear rules on risk-sharing, transparency and procurement could draw more investment into infrastructure and services.',
    gradient: ['#0E2A3F', '#13213D'],
    body: [
      'Public–private partnerships can bring capital and expertise, but only when the rules are clear to both sides.',
      'Specialists point to three essentials: transparent procurement, fair sharing of risk and independent monitoring of results.',
      'Critics warn that poorly designed contracts can leave the public with long-term costs, which is why oversight matters.',
      'Expect more discussion as governments review their frameworks.',
    ],
    author: A.policy,
    publishedAt: ago(2_400),
    readMins: 4,
    likes: 610,
    comments: 35,
    shares: 91,
  },
  {
    id: 's12',
    category: 'Technology',
    headline: 'AI in the public sector: put guardrails first, then scale',
    summary:
      'Governments and universities are drafting guidance on responsible AI: where it can save time, where humans must stay in the loop, and how to protect personal data.',
    gradient: ['#1B2D52', '#000435'],
    body: [
      'Public bodies are experimenting with AI for translation, document search and service chat, with an eye on cost and speed.',
      'Experts recommend starting with low-risk uses, keeping a human reviewer for decisions that affect people and publishing clear rules on data use.',
      'Universities are updating their own policies on AI in teaching, research and assessment.',
      'The consensus: build trust with transparency, then expand.',
    ],
    author: A.tech,
    publishedAt: ago(3_000),
    readMins: 4,
    likes: 2788,
    comments: 198,
    shares: 640,
  },
];

const COMMENTERS: Array<[string, string]> = [
  ['Dr. Uwase', '#FCB038'],
  ['J. Mugisha', '#3E7BFA'],
  ['Prof. Aline', '#168A55'],
  ['E. Habimana', '#7C5CFA'],
  ['Ingabire', '#D64545'],
  ['K. Nsengiyumva', '#0E8FA3'],
  ['Nshuti', '#B5771A'],
  ['M. Kamanzi', '#6BAA3A'],
];

const TEXTS = [
  'Well put. The implementation details will decide how this plays out.',
  'Would love to see the underlying data behind this.',
  'This is exactly the conversation we need to be having.',
  'Good reminder that process matters as much as outcomes.',
  'Sharing with my team. Very relevant for our planning.',
  'Curious how this compares with other countries in the region.',
  'Proud of the progress. Keep it up! 🇷🇼',
  'Practical and clear. More like this please.',
  'The long-term view is what policymakers often miss.',
  'Great read 👏',
];

/** Deterministic mock comments so the same story always shows the same thread. */
export function mockCommentsFor(storyId: string, count: number): YoComment[] {
  const seed = Number(storyId.replace(/\D/g, '')) || 1;
  const n = Math.min(count, 8);
  return Array.from({ length: n }, (_, i) => {
    const [user, color] = COMMENTERS[(seed + i) % COMMENTERS.length];
    return {
      id: `${storyId}-c${i}`,
      storyId,
      user,
      color,
      text: TEXTS[(seed * 3 + i) % TEXTS.length],
      createdAt: ago(8 + i * 37 + seed * 3),
      likes: ((seed * 17 + i * 31) % 120) + 1,
    };
  });
}
