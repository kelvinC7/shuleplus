export const NT = [
 ['Today','Security','red','warn','Unknown visitor at Gate B','Not on today’s visitor list. Guard Jean Bosco is attending.','2 min','View camera',"closeSheet();go('live');setTimeout(()=>openCam(7),350)",1],
 ['Today','Transport','amber','bus','Bus 2 running 12 minutes late','Traffic on the Nkanka route. 41 students on board; parents have been alerted.','6 min','Track bus',"closeSheet();openBuses(2)",1],
 ['Today','Finance','green','pay','RWF 4.26M collected today','38 payments since 07:00. Term collection has reached 78% of RWF 312M.','18 min','',"",1],
 ['Today','Academic','navy','book','Mid-term marking 92% complete','S5 MEG Economics was the last batch submitted. 3 subjects still outstanding.','40 min','See subjects',"closeSheet();go('insights')",0],
 ['Today','Approvals','amber','doc','Babyeyi circular ready for your signature','Term 1 2027 fees and requirements, approved by the accountant.','1 h','Review',"closeSheet();go('approve')",0],
 ['Today','Staff','navy','user','2 teachers absent, 4 on approved leave','The Director of Studies arranged cover for S2C Chemistry and S5A Physics. All classes are teaching.','2 h','View classes',"closeSheet();openTeaching()",0],
 ['Yesterday','Finance','red','chart','Boarding & food is 8% over budget','Spending reached RWF 53.4M against a plan of RWF 49.6M.','Tue 16:20','Reallocate',"closeSheet();go('approve')",0],
 ['Yesterday','Academic','green','book','Attendance up 1.4 pts on last term','Weekly average 95.1% compared with 93.7% in Term 2.','Tue 15:00','',"",0],
 ['Yesterday','Security','navy','warn','Camera 10 offline','Boys’ dormitory camera stopped at 08:12. IT ticket #58 opened.','Tue 08:14','',"",0],
 ['This week','Parents','green','msg','212 of 240 S1 parents read the Sports Day notice','Read rate 88%, the highest this term.','Mon','',"",0],
 ['This week','Inventory','amber','box','5 items below reorder level','Exercise books, chalk, detergent, printer toner and maize flour.','Mon','Order now',"closeSheet();toast('Opening Procurement')",0],
];
