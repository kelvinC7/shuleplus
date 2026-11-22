import { I } from '../utils/icons';

const M = (n, s, p, w = 0, f) => ({ n, s, p, w, f });

export const groups = [
  [
    'Students & Learning',
    [
      M('Student Management', '', 'user'),
      M('Academic', '', 'book'),
      M('Timetable', '', 'cal'),
      // M('TichaPortal', '', 'user'),
      // M('Curriculum', '', 'doc'),
      M('Discipline', '', 'shield', 1),
    ],
  ],
  [
    'Attendance & Safety',
    [
      M('Attendance', '', 'gate'),
      // M('Smart Transport', '', 'bus', 1),
    ],
  ],
  [
    'Parents & Messages',
    [
      M('Parent MIS', '', 'user'),
      M('ShuleChat', '', 'msg', 1),
      M('Circulars', '', 'doc', 1),
    ],
  ],
  [
    'Finance & Staff',
    [
      M('School Fees', '', 'pay'),
      M('School Budget', '', 'chart', 1),
      M('HR', '', 'user'),
      M('Payroll', '', 'pay'),
      M('KaziAdvance', '', 'card', 1),
    ],
  ],
  [
    'Operations',
    [
      // M('Assets', '', 'box'),
      // M('Inventory', '', 'box', 1),
      // M('Procurement', '', 'cart', 1),
      M('Action Plan', '', 'flag'),
    ],
  ],
  [
    'School Services',
    [
      // M('ShuleKit', '', 'box', 1),
      M('Uniforms', '', 'cart'),
      M('Dining/Cafeteria', '', 'coffee'),
      M('ShuleMart', '', 'cart', 1),
      // M('ShuleTrip', '', 'map', 1),
    ],
  ],
];

export const P = {
  user: I.user,
  book: I.book,
  pay: I.pay,
  bus: I.bus,
  cart: I.cart,
  msg: I.msg,
  gate: I.gate,
  cal: I.cal,
  chart: I.chart,
  shield: I.shield,
  card: I.card,
  box: I.box,
  globe: I.globe,
  flag: I.flag,
  doc: I.doc,
  coffee: I.coffee,
  map: I.map,
};
