export const GROUP = "St Matthew's Schools";

export const BR = [
  { id: '28001', sh: 'Kamembe Main', cr: 'KM', name: "St Matthew's School", loc: 'Kamembe, Rusizi', lv: 'Nursery & Primary · Day', est: 1980, stu: 920, inn: 891, staff: 46, on: 44, fees: 81, billed: 138, ft: 1.84, health: 93, tn: [18, 18], note: ['green', 'All classes teaching, fees on track'], al: [['Leave request waiting', 'Ms. Uwase, 2 days from 28 Oct', "go('approve')"]] },
  { id: '28003', sh: 'Kamembe N&P', cr: 'KN', name: "St Matthew's School", loc: 'Kamembe, Rusizi', lv: 'Nursery & Primary · Day', est: 1998, stu: 540, inn: 516, staff: 28, on: 27, fees: 74, billed: 81, ft: 0.92, health: 90, tn: [12, 12], note: ['amber', '24 learners absent today, 11 in Nursery'], al: [['24 learners absent', '11 in Nursery, parents being called', "setBranch('28003')"]] },
  { id: '28004', sh: 'Kamembe Secondary', cr: 'KS', name: "Saint Matthew's School", loc: 'Kamembe, Rusizi', lv: 'O-Level · Boarding', est: 2010, stu: 610, inn: 602, staff: 41, on: 38, fees: 69, billed: 152.5, ft: 2.31, health: 86, tn: [9, 10], note: ['red', '1 class without a teacher, S2B Chemistry'], al: [['S2B Chemistry has no teacher', 'Director of Studies arranging cover', "setBranch('28004')"], ['Lab reagents PO due today', 'RWF 1,460,000 · Procurement', "go('approve')"]] },
  { id: '28002', sh: 'Gashonga', cr: 'GA', name: "St Matthew's School Gashonga", loc: 'Gashonga, Rusizi', lv: 'Nursery & Primary · Day', est: 2023, stu: 310, inn: 287, staff: 17, on: 17, fees: 63, billed: 37.2, ft: 0.41, health: 84, tn: [8, 8], note: ['amber', 'Fees at 63%, 74 families with balances'], al: [['Fees at 63% of term', '74 families still owe RWF 13.8M', "setBranch('28002')"]] },
  { id: '21001', sh: 'Nyamasheke', cr: 'NY', name: 'Saint Matthews Nyamasheke', loc: 'Kanjongo, Nyamasheke', lv: 'Nursery & Primary · Day', est: 2019, stu: 470, inn: 452, staff: 24, on: 23, fees: 77, billed: 61.1, ft: 0.88, health: 91, tn: [10, 10], note: ['green', 'All classes teaching'], al: [] },
  { id: '21002', sh: 'Ntendezi', cr: 'NT', name: "Saint Matthew's School Ntendezi", loc: 'Ruharambuga, Nyamasheke', lv: 'Nursery & Primary · Day & boarding', est: 2023, stu: 280, inn: 259, staff: 16, on: 15, fees: 58, billed: 33.6, ft: 0.36, health: 80, tn: [7, 8], note: ['red', 'Fees at 58%, lowest in the group'], al: [['Fees at 58%, lowest of 6', 'Budget reallocation also waiting', "go('approve')"], ['1 class without a teacher', 'P4 Mathematics, cover being arranged', "setBranch('21002')"]] },
];

export const brOf = (id) => BR.find((b) => b.id === id);
export const sum = (k) => BR.reduce((a, b) => a + b[k], 0);
export const pct = (a, b) => ((a / b) * 100).toFixed(1);
