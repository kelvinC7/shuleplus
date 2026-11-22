import { classList } from './wizardData';

export const TT = [
 ['S1A','English','Divine Habiyaremye','Room 1','Reading comprehension: “The River Between”','in'],
 ['S1B','Mathematics','Eric Nkurunziza','Room 2','Integers and the number line','in'],
 ['S1C','Kinyarwanda','Marie Mukarugwiza','Room 3','Ikinyarwanda: imyandikire','in'],
 ['S1D','Biology','Dr. Ange Mukamana','Lab 1','Cell structure and functions','in'],
 ['S2A','Geography','Jean Kwizera','Room 5','Map reading: scale and direction','in'],
 ['S2B','French','Yvonne Ishimwe','Room 6','Le passé composé','in'],
 ['S2C','Chemistry','Bosco Manzi','Lab 2','Acids, bases and indicators','gap'],
 ['S2D','History','Samuel Rwigema','Room 8','The Berlin Conference 1884–85','in'],
 ['S3A','Mathematics','Eric Nkurunziza*','Room 9','Simultaneous equations','in'],
 ['S3B','Physics','Claude Ntwari','Lab 3','Ohm’s law practical','in'],
 ['S3C','English','Divine Habiyaremye*','Room 11','Persuasive essay writing','in'],
 ['S3D','Entrepreneurship','Aimée Uwamariya','Room 12','Business plan basics','in'],
 ['S4A','Mathematics','Eric Nkurunziza','Room 13','Quadratic equations: factorisation','in'],
 ['S4B','Economics','Patrick Rukundo','Room 14','Elasticity of demand','late'],
 ['S4C','History','Samuel Rwigema*','Room 15','Pre-colonial Rwanda','in'],
 ['S4D','Chemistry','Dr. Ange Mukamana*','Lab 2','Organic chemistry: alkanes','in'],
 ['S5A','Physics','Fiacre Ndahiro','Lab 3','Electromagnetic induction','gap'],
 ['S5B','Economics','Patrick Rukundo*','Room 18','National income accounting','in'],
 ['S5C','Geography','Jean Kwizera*','Room 19','Population dynamics','in'],
 ['S5D','Biology','Dr. Ange Mukamana*','Lab 1','Genetics: Mendel’s laws','in'],
 ['S6A','Mathematics','Olivier Hakizimana','Room 21','Integration by parts','in'],
 ['S6B','Entrepreneurship','Aimée Uwamariya*','Room 22','Financial statements','in'],
 ['S6C','English','Divine Habiyaremye*','Room 23','Literature: “Things Fall Apart”','in'],
 ['S6D','Chemistry','Claude Ntwari*','Lab 4','Chemical equilibrium','in'],
].map(([c,sub,t,room,topic,st],i)=>{const n=classList.find(x=>x.id===c).n;const ab=st==='gap'?0:(i*7)%4;return {c,sub,t:t.replace('*',''),room,topic,st,n,present:st==='gap'?n-(i%3):n-ab,cover:null}});
const FREE=[['Olivier Hakizimana','Mathematics, Physics · Deputy Head','2 periods today','Physics'],['Claude Ntwari','Physics, Chemistry','3 periods today','Chemistry Physics'],['Josiane Uwera','Chemistry, Biology','2 periods today','Chemistry'],['Yvonne Ishimwe','French','4 periods today',''],['Marie Mukarugwiza','Kinyarwanda','3 periods today','']];
