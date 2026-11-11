
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem('ataf_'+k))??d}catch{return d}};
const save=(k,v)=>localStorage.setItem('ataf_'+k,JSON.stringify(v));
const demoMode = new URLSearchParams(window.location.search).get('demo');
const demoAdminPreview = demoMode === 'admin-preview';
const demoSignedIn = demoMode === 'authed' || demoAdminPreview;
let securityCaseFilter = 'all';
let adminCurrentView = 'overview';
let demoReviewedCount = 2;
let demoAssignments = [];
let demoAwards = [];
let demoCertificates=[];
let demoSecurityCases=[
  {id:'demo-case-3',actor_id:'demo-student-3',signal_type:'chat_unauthorized',details:'Attempted to send a classroom chat message without class access.',created_at:new Date(Date.now()-7200000).toISOString(),actor:{display_name:'New learner'}},
  {id:'demo-case-4',actor_id:null,reported_by:'demo-admin',signal_type:'system_breach',details:'Sample report: unexpected sign-in activity needs review.',created_at:new Date().toISOString(),reporter:{display_name:'Preview administrator'}}
];
let user=load('user',null), users=load('users',[]), classes=load('classes',[]), xp=load('xp',0), gamePoints=load('gamePoints',0), assignments=load('assignments',[]), classRole='student', boardMode='global';
const atafBot={name:'ATAFBot',emoji:'🤖',title:'Synth-powered typing coach',motto:'Powering up every keystroke.'};
let selectedLesson=0, selectedLessonStage=0, lessonView='guide', writingMode=null, writingTaskIndex=0, testDuration=60, testStarted=false, testDone=false, testStart=0, testTimer=null, checkpointGameActive=false, dictationEnabled=false, musicEnabled=true, pendingTrackAssessment=null, currentSurpriseTestAssignmentId=null, testRequiresFullDuration=false, completedTrackAssessments=new Set();
let lessonAccuracy={lessonIndex:0,attempts:0,correct:0,startedAt:0},testPreviousValue='',testMistakes=0;
let gameMusicTimer=null, gameAudioContext=null, activeGameTimer=null,activeGameKeyHandler=null;
const mascots=[
 {name:'Pip the Fox',emoji:'🦊',theme:'Forest Friends'},
 {name:'Nova the Astronaut',emoji:'👩‍🚀',theme:'Space Explorers'},
 {name:'Byte the Robot',emoji:'🤖',theme:'Robot Lab'},
 {name:'Zippy the Cheetah',emoji:'🐆',theme:'Speed Safari'},
 {name:'Coral the Dragon',emoji:'🐉',theme:'Dragon Quest'},
 {name:'Pixel the Wizard',emoji:'🧙',theme:'Magic Academy'}
];
const basicUnits=[
 {name:'Home Row Foundations',focus:'Start with F and J · then D/K, S/L, A/semicolon',tip:'Begin with your index fingers on F and J. Feel for the small raised bumps on those keys without looking down. Add D and K, then S and L, then A and semicolon. Return each finger to its home position after every reach.',keys:'fjdk sla;',prompts:['f j f j f j f j','ff jj fj jf fj jf','f j d k f j d k','fd jk fd jk fj dk','s l a ; s l a ;','as df jk l; as df jk l;','sad; fall; ask; lad;','dad; flask; all; lass;','j f d k s l a ;','a lad asks dad; dad falls;']},
 {name:'Home Row Reach',focus:'G and H · home-row words',tip:'Reach G with your left index finger and H with your right index finger. Bring each finger back to its home position.',keys:'asdfghjkl;',prompts:['fff ggg hhh jjj fgh jkl;','gh gh fg hj gh hj','had; hag; shall; flash;','a flag had a dash;','half; glad; hall; glass;','a small flag shall fall;','she had a flash; he had a laugh;','jag; hash; gash; dash;','a lad had a glass;','the flag shall hang high;']},
 {name:'Top Row Explorers',focus:'Q W E R T · Y U I O P',tip:'Reach up from the home row for top-row keys, then return your fingers to home position. Keep your wrists relaxed.',keys:'qwertyuiopasdfghjkl;',prompts:['eee iii rrr uuu ttt yyy','qwe rty uio op opq','we were quite quiet;','type your way; power;','write it right; quite well;','our quiet pet went out;','try to type with your left;','you were right to wait;','power your way to a new quest;','the writer wrote a pretty story;']},
 {name:'Bottom Row Builders',focus:'Z X C V · B N M',tip:'Reach down gently for the bottom row. Use the correct finger, then return to home row instead of stretching your whole hand.',keys:'zxcvbnmasdfghjkl;',prompts:['ccc xxx zzz vvv bbb nnn mmm','zxc cvb bnm mnb','mix box cab van;','move the next box;','many brave waves;','zoom past the blue van;','come back and move;','the brave fox can mix it;','a cozy cabin by the river;','we can move many boxes;']},
 {name:'Full Keyboard Adventure',focus:'All letters · spaces · simple capitals',tip:'Combine all three letter rows. Read a little ahead, use the right finger, and choose accuracy over speed.',keys:'abcdefghijklmnopqrstuvwxyz',prompts:['the quick fox jumps;','we can learn to type!','small steps build strong skills.','A red bird can fly.','the brave cat ran home;','Pack the blue box.','every key has a place;','we type, learn, and grow.','Bright stars shine above us.','The quick fox jumps over a lazy dog.']}
];
const intermediateUnits=[
 {name:'Fluency and Finger Control',focus:'All letters · steady rhythm',tip:'Use the correct finger and keep a steady rhythm. Accuracy comes first; speed grows with practice.',keys:'abcdefghijklmnopqrstuvwxyz',prompts:['asdf jkl; fdsa ;lkj','the red fox ran past the tree.','bright stars shine above the quiet lake.','A brave fox explores the forest path.','read the words before you type them.','steady hands make accurate typing.','we learn a little more each day.','look ahead and keep a calm rhythm.','practice builds skill one line at a time.','A curious mind can discover amazing things.']},
 {name:'Capital Letters and Shift',focus:'Shift · uppercase letters',tip:'For a capital letter, hold Shift with the hand opposite the letter you are typing. Release Shift after the letter.',keys:'abcdefghijklmnopqrstuvwxyz',prompts:['Mia and Noah practice every day.','Today We Learn New Skills.','Pip Visits The Green Forest.','Nova Flies To The Moon.','My Best Work Starts With Practice.','On Friday, Alex Read A New Book.','We Can Build, Explore, And Create.','The Robot Named Byte Helps Us Learn.','Remember To Use The Opposite Shift Key.','Learning New Skills Takes Patience And Practice.']},
 {name:'Punctuation Power',focus:'Period · comma · apostrophe · question mark · quotation marks',tip:'Notice punctuation before typing. Use Shift for symbols that require it, and keep spaces after commas and sentence-ending punctuation.',keys:'abcdefghijklmnopqrstuvwxyz',prompts:['Can we begin? Yes, we can!','First, read; next, type; then, review.','“Keep trying,” said Pip.','It is fun to learn, isn’t it?','Wait—look, the answer is here!','Mia said, “I can do this.”','What will you discover today?','Use commas, periods, and question marks.','The explorer’s map was ready; the journey began.','“Practice carefully,” Nova said, “and trust your progress.”']},
 {name:'Numbers and Symbols',focus:'Number row · common symbols',tip:'Reach to the number row without looking down for long. Use Shift for the symbols above numbers when needed.',keys:'1234567890',prompts:['room 12 starts at 9:15.','8 + 7 = 15; 20 - 4 = 16.','The club raised $125.50.','There are 24 students in 3 groups.','My code is 4072; check it twice.','The book costs $8.99 after a 10% discount.','Set the timer for 5:30, then begin.','A 3-mile walk took 45 minutes.','Use symbols like @, #, %, and & carefully.','The class collected 125 points, then earned 35 more: 160!']},
 {name:'Passage and Precision',focus:'Mixed keys · punctuation · numbers · fluent passages',tip:'Type in short bursts, glance ahead, and correct mistakes calmly. Finish the whole passage accurately before trying to go faster.',keys:'abcdefghijklmnopqrstuvwxyz',prompts:['Careful practice builds confidence, and confidence helps us try harder challenges.','Technology helps us create, communicate, explore ideas, and share what we learn.','Although progress can feel slow at first, each focused session makes the next one easier.','A good typist sits comfortably, keeps their eyes on the screen, and uses every finger.','On Monday at 10:30, our team began a new project and shared three creative ideas.','The explorer wrote, “Every small step counts!” and marked 100 points on the map.','Learning to type takes patience: read carefully, keep a steady rhythm, and celebrate improvement.','At 7:45, the class solved 12 puzzles, compared answers, and explained how they found each solution.','When we slow down enough to be accurate, we build habits that help us type faster later.','Great work is not about rushing; it is about focus, practice, and making progress one keystroke at a time.']}
];
const masterUnits=[
 {name:'Precision Under Pressure',focus:'Reliable accuracy · sustained rhythm',tip:'Maintain accuracy through longer passages. Read ahead, recover calmly from errors, and keep a consistent pace.',keys:'abcdefghijklmnopqrstuvwxyz',prompts:['Accuracy first; speed follows.','Steady rhythm, precise keystrokes.','Read ahead, then type with control.','Small corrections protect strong work.','Consistency makes difficult passages manageable.','Pause briefly, reset, and continue.','A calm pace supports better accuracy.','Each clean line builds reliable habits.','Control the rhythm instead of rushing.','Finish the passage with deliberate precision.']},
 {name:'Symbols and Structured Text',focus:'Numbers · punctuation · brackets · symbols',tip:'Practice the punctuation and symbols used in notes, data, and technical writing. Keep spacing consistent around each mark.',keys:'abcdefghijklmnopqrstuvwxyz0123456789.,;:!?()[]{}+-=*/@#',prompts:['Record: 18 items, 3 groups, 6 per group.','Check each value: 42, 57, and 63.','Plan (read → type → review) before sending.','Use [brackets], (parentheses), and {braces} carefully.','At 8:45, save draft_v2.txt and review it.','Compare 15% growth with a 0.15 increase.','Use labels: name, date, status, and result.','The total is 24 + 18 = 42; verify it.','Type symbols @ # & + = with steady control.','Review punctuation; then confirm every number.']},
 {name:'Professional Communication',focus:'Clear messages · tone · formatting',tip:'Type clear, organized messages with purposeful punctuation. Keep the reader in mind and proofread names, dates, and details.',keys:'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,;:!?\'"-',prompts:['Please review the draft before Friday.','Hello team, the updated schedule is ready.','Could you confirm the meeting time by 3:00?','Thanks for sharing your notes; I will review them today.','The report is attached. Please send corrections by noon.','Our next step is to test the plan and record the results.','I appreciate your feedback and will update the final version.','The project begins on Tuesday, 14 April, at 9:30 a.m.','Clear headings and concise sentences make information easier to use.','Before sending, verify the recipient, subject, dates, and attachments.']},
 {name:'Technical Text and Data',focus:'Code-like text · data labels · exact characters',tip:'Exact characters matter in technical notes and data. Slow down for capitalization, separators, symbols, and repeated patterns.',keys:'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_./:=+-<>[]{}',prompts:['status = ready; count = 24','item_07: value=3.50; check=true','path: /reports/grade_9/final.txt','if score >= 90: result = "pass"','name,score,attempts\\nAri,96,2','Use key:value pairs and consistent spacing.','Version 2.4.1 includes 18 updates.','Compare input[0] with output[0] carefully.','A reliable record has a label, value, and date.','Recheck every bracket, underscore, decimal, and separator.']},
 {name:'Mastery and Adaptability',focus:'Long-form fluency · editing · self-review',tip:'Apply accurate typing to unfamiliar, longer text. Adapt your rhythm to the material and proofread before finishing.',keys:'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,;:!?()[]{}+-=*/@#',prompts:['Strong typing combines accuracy, control, and thoughtful review.','When the material changes, adjust your rhythm without losing precision.','Draft clearly, revise carefully, and confirm the final details.','A dependable typist can move between prose, data, and symbols.','Review long passages in sections; correct errors without rushing.','Careful attention to names, numbers, and punctuation prevents avoidable mistakes.','The best pace is the fastest one you can maintain accurately.','Use feedback to identify patterns, then practice the skills that need work.','Before completing a task, check its structure, spelling, spacing, and meaning.','Mastery is consistent, adaptable work: read closely, type precisely, and review thoughtfully.']}
];
const makeLetterUnit=(name,letters,tip)=>({
 name,letters,focus:`New letter focus: ${letters.split('').join(' and ')}`,
 tip:`Practice ${letters.split('').join(' and ')} with the correct fingers, then return to home row. ${tip}`,
 keys:letters,
 prompts:Array.from({length:20},(_,i)=>{
   const [a,b]=letters.split('');
   const drills=[`${a} ${b} ${a} ${b} ${a} ${b} ${a} ${b}`,`${a}${a} ${b}${b} ${a}${b} ${b}${a}`,`${a} ${a} ${a} ${b} ${b} ${b} ${a} ${b}`,`${a}${b} ${a}${b} ${b}${a} ${b}${a}`,`${a} ${b} ${b} ${a} ${a} ${b} ${b} ${a}`];
   return drills[i%drills.length];
 })
});
const beginnerUnits=[
 makeLetterUnit('F and J Home Keys','fj','Find the raised bumps and anchor both index fingers.'),
 makeLetterUnit('D and K','dk','Reach one key inward from the home keys.'),
 makeLetterUnit('S and L','sl','Use the ring fingers and return to home row.'),
 makeLetterUnit('A and Semicolon','a;','Reach the pinky fingers gently without moving the whole hand.'),
 makeLetterUnit('G and H','gh','Reach the index fingers outward and return to F and J.'),
 makeLetterUnit('E and I','ei','Reach up from the home row with a relaxed hand.'),
 makeLetterUnit('R and U','ru','Use the index fingers for these upper-row reaches.'),
 makeLetterUnit('T and Y','ty','Reach to the center of the top row with the index fingers.'),
 makeLetterUnit('W and O','wo','Reach with the ring fingers, then reset.'),
 makeLetterUnit('Q and P','qp','Practice the outer top-row keys with light pinky reaches.')
];
const advancedUnits=[
 makeLetterUnit('Z and X','zx','Add bottom-row reaches while keeping wrists relaxed.'),
 makeLetterUnit('C and V','cv','Practice center-left bottom-row reaches.'),
 makeLetterUnit('B and N','bn','Use the index fingers for the middle bottom-row keys.'),
 makeLetterUnit('M and Comma','m,','Pair the M key with a precise right-hand punctuation reach.'),
 makeLetterUnit('Period and Slash','./','Practice accurate right-hand punctuation reaches.'),
 makeLetterUnit('Uppercase F and J','FJ','Use the opposite Shift key while reaching for each letter.'),
 makeLetterUnit('Uppercase D and K','DK','Coordinate Shift and the home-row reaches without tensing.'),
 makeLetterUnit('Number Row 1 and 2','12','Reach to number keys and return your hands to home row.'),
 makeLetterUnit('Number Row 3 and 4','34','Use the correct fingers for nearby number-row reaches.'),
 makeLetterUnit('Number Row 5 and 6','56','Keep a steady rhythm while alternating between both hands.')
];
const masteryUnits=[
 makeLetterUnit('Precision Pair F and J','fj','Maintain accuracy in repeated patterns before adding speed.'),
 makeLetterUnit('Precision Pair D and K','dk','Keep repeated reaches even and relaxed.'),
 makeLetterUnit('Precision Pair S and L','sl','Avoid looking down; return each finger to its home key.'),
 makeLetterUnit('Precision Pair A and Semicolon','a;','Control pinky reaches with minimal hand movement.'),
 makeLetterUnit('Precision Pair G and H','gh','Keep both index fingers independent and controlled.'),
 makeLetterUnit('Precision Pair E and I','ei','Combine upper-row reaches with consistent recovery.'),
 makeLetterUnit('Precision Pair R and U','ru','Build accuracy through changing hand patterns.'),
 makeLetterUnit('Precision Pair T and Y','ty','Use smooth transitions between hands.'),
 makeLetterUnit('Precision Pair W and O','wo','Keep both ring fingers precise through longer drills.'),
 makeLetterUnit('Precision Pair Q and P','qp','Finish with controlled outer-key reaches.')
];
const themesByGrade=[
 ['Forest Friends','Pip the Fox','🌳'],['Space Explorers','Nova the Astronaut','🚀'],['Robot Lab','Byte the Robot','🤖'],['Speed Safari','Zippy the Cheetah','🐆'],['Dragon Quest','Coral the Dragon','🐉'],['Magic Academy','Pixel the Wizard','🪄'],['Ocean Explorers','Marina the Dolphin','🐬'],['Sky Lab','Aero the Eagle','🦅'],['Future Foundry','Echo the Phoenix','🔥']
];
const lessonActions=['Meet the keys','Find your finger position','Practice the pattern','Build a short word','Type a word chain','Reach and return','Try a mini challenge','Build typing rhythm','Use the skill in words','Unit checkpoint','Warm-up review','Accuracy builder','Word sprint','Phrase practice','Rhythm round','Mixed-key review','Focus challenge','Real-world line','Personal best','Unit mastery'];
const essayBank=[
  'Practice every day, and your fingers will grow stronger. Strong habits make typing feel easy and calm.',
  'The tiny details matter when you type. Keep your eyes on the next word, stay relaxed, and finish with confidence.',
  'A brave student learns one key at a time. Accuracy comes before speed, and a steady rhythm creates progress.',
  'Typing is a skill that grows with patience. Each sentence builds confidence, one character at a time.',
  'Students who practice with purpose develop strong rhythm and better focus. A warm-up and a clear goal make every lesson easier.',
  'The best typists stay relaxed and look ahead. Smooth motion, accurate fingers, and a calm attitude can help every sentence feel simple.'
];
const assignmentTemplates=[
  {title:'Warm-up drill', type:'Quick practice', duration: '10 min', prompt:'Type the warm-up sentence slowly and focus on home-row accuracy.', rubric:['Accuracy goal: 90%+', 'Use the home row before speed', 'Finish the full sentence']},
  {title:'Word sprint', type:'Speed lesson', duration: '15 min', prompt:'Type your grade word list with a calm rhythm and correct spacing.', rubric:['Reach the target WPM', 'Keep spaces between words', 'Finish each line without rushing']},
  {title:'Sentence challenge', type:'Essay practice', duration: '20 min', prompt:'Complete the sentence practice with focus and a relaxed posture.', rubric:['Stay above 95% accuracy', 'Use smooth finger motion', 'Keep eyes on the next word']},
  {title:'Timed test', type:'Assessment', duration: '1–5 min', prompt:'Choose a timed test and aim for steady accuracy through the full session.', rubric:['Complete the entire test', 'Track your WPM', 'Aim for consistency not speed bursts']}
];
// ATAF recommended practice targets (guidelines, not universal or official standards). CPM counts correct characters per minute; 5 characters ≈ 1 word.
const gradeTargets={1:{wpm:'5–10',cpm:'25–50',accuracy:'90%+'},2:{wpm:'8–15',cpm:'40–75',accuracy:'92%+'},3:{wpm:'12–20',cpm:'60–100',accuracy:'93%+'},4:{wpm:'18–25',cpm:'90–125',accuracy:'95%+'},5:{wpm:'22–32',cpm:'110–160',accuracy:'95%+'},6:{wpm:'28–40',cpm:'140–200',accuracy:'96%+'},7:{wpm:'32–45',cpm:'160–225',accuracy:'96%+'},8:{wpm:'36–50',cpm:'180–250',accuracy:'97%+'},9:{wpm:'40–55',cpm:'200–275',accuracy:'97%+'}};
const gradeWordBank={
  1:['cat','sun','map','jam','red','fish','star','hop','bug','ship','cup','fox','rain','nest','tree','sand','glow','light','wing','pond'],
  2:['rabbit','planet','pencil','garden','school','window','rocket','forest','little','happy','breeze','camp','castle','market','dragon','smile','planet','brown','bright','music','tiger'],
  3:['adventure','journey','puzzle','science','basket','library','window','marble','volcano','pirate','whistle','treasure','balance','action','rocket','purple','yellow','guitar','horizon','compass','scooter'],
  4:['astronaut','explorer','penguin','mountain','starlight','perfect','freedom','velocity','circuit','creature','practice','milestone','currency','riddle','tornado','meadow','backpack','thunder','harvest','vacation','champion'],
  5:['efficiency','keyboard','practice','challenges','language','precision','strategy','triangle','marathon','admirable','discovery','technology','literacy','balance','momentum','velocity','spectrum','magnet','vocabulary','journey','harmony'],
  6:['civilization','inference','innovation','independence','sophisticated','diligence','imagination','leadership','discipline','adventure','resilience','brilliance','treasure','strategy','microphone','keyboarding','synchronization','elevation','curriculum','literature','trajectory'],
  7:['analysis','argument','evidence','evaluate','sequence','contrast','research','accurate','solution','efficient','variable','context','perspective','structure','reliable','document','estimate','function','pattern','revision'],
  8:['hypothesis','synthesis','interpretation','consequence','significant','communication','configuration','independent','measurement','consistent','investigation','equivalent','parameter','collaborate','visualization','algorithm','persuasive','reflection','precision','documentation'],
  9:['methodology','comprehensive','implementation','correlation','independently','responsibility','recommendation','infrastructure','interpretation','characteristic','collaboration','demonstration','optimization','verification','accessibility','configuration','representation','accountability','documentation','professional']
};
const trackLabels={Basic:'Beginner',Intermediate:'Intermediate',Master:'Master'};
const gradeNumbers=[1,2,3,4,5,6,7,8,9];
const gradeOrdinal=grade=>`${grade}${grade===1?'st':grade===2?'nd':grade===3?'rd':'th'}`;
const trackLabel=track=>trackLabels[track]||track;
const fingerMap={
  q:'left-pinky',w:'left-ring',e:'left-middle',r:'left-index',t:'left-index',y:'left-index',u:'right-index',i:'right-index',o:'right-middle',p:'right-ring',
  a:'left-pinky',s:'left-ring',d:'left-middle',f:'left-index',g:'left-index',h:'right-index',j:'right-index',k:'right-middle',l:'right-ring',';':'right-pinky',
  z:'left-pinky',x:'left-ring',c:'left-middle',v:'left-index',b:'left-index',n:'right-index',m:'right-index',',':'right-middle','.':'right-ring','/':'right-pinky',
  1:'left-pinky',2:'left-ring',3:'left-middle',4:'left-index',5:'left-index',6:'right-index',7:'right-index',8:'right-middle',9:'right-ring',0:'right-pinky',
  ' ':'space'};
function getLessonStars(lessonIndex){
  const saved = load('lessonStars', {});
  return Number(saved[lessonIndex] || 0) || 0;
}
function setLessonStars(lessonIndex, stars){
  const saved = load('lessonStars', {});
  saved[lessonIndex] = Math.max(1, Math.min(3, Number(stars) || 1));
  save('lessonStars', saved);
}
function renderLessonStars(stars){
  const starMarkup = ['★','★','★'].map((star,i)=>`<span class="lesson-star ${i < stars ? 'filled' : 'empty'}">${star}</span>`).join('');
  return `<div class="lesson-stars" aria-label="Lesson star rating">${starMarkup}</div>`;
}
function buildGradeLessonText(grade,track,unitIndex,within){
  const bank=gradeWordBank[grade]||gradeWordBank[1];
  const words=[...bank];
  const phraseWords=[];
  const count=track==='Basic'?3:track==='Intermediate'?5:7;
  for(let i=0;i<count;i++){
    const word=words[(within*3 + unitIndex*5 + i + grade) % words.length];
    phraseWords.push(word);
  }
  const joined=phraseWords.join(' ');
  const punctuation=['.','!','?'];
  return joined + punctuation[(within + grade) % punctuation.length];
}
function buildLesson(grade,track,n){
 const unitIndex=Math.floor((n-1)/20);
 const within=(n-1)%20;
 const trackUnits=track==='Basic'?beginnerUnits:track==='Intermediate'?advancedUnits:masteryUnits;
 const unit=trackUnits[unitIndex],theme=themesByGrade[(grade-1)%themesByGrade.length];
 let text=buildGradeLessonText(grade,track,unitIndex,within);
 if(unit.prompts && typeof unit.prompts[within]==='string') text=unit.prompts[within];
 // Grade-appropriate character coaching changes by grade while the key-learning sequence stays consistent.
 const gradeCue=grade===1?'Take your time and type one key at a time.':grade===2?'Keep your fingers close to the home row.':grade===3?'Look ahead at the next few characters.':grade===4?'Aim for a smooth, even rhythm.':grade===5?'Balance accuracy with a comfortable pace.':grade===6?'Challenge yourself to stay accurate through the whole line.':grade===7?'Use a steady pace through longer, more detailed text.':grade===8?'Keep symbols, capitalization, and punctuation precise.':'Apply a consistent rhythm and proofread challenging passages.';
 const title=`${String(within+1).padStart(2,'0')} · ${unit.name}: ${lessonActions[within]}`;
 const checkpoint=within===9||within===19;
 const lessonTrackKey=track==='Beginner'?'basic':track==='Intermediate'?'intermediate':track.toLowerCase();
 return {grade,track,stage:unitIndex+1,number:n,title,desc:`${unit.tip} ${gradeCue}`,text,mascot:theme[1],mascotEmoji:theme[2],theme:theme[0],lessonNumber:n,unitNumber:unitIndex+1,unitLessonNumber:within+1,lessonKey:`g${grade}-${lessonTrackKey}-${String(n).padStart(2,'0')}`,focus:unit.focus,keys:unit.keys,tip:unit.tip,checkpoint};
}
// Preserve the original 50 lesson keys and indexes, then append ten new lessons to each unit.
const legacyLessonData=[1,2,3,4,5,6].flatMap(grade=>['Basic','Intermediate'].flatMap(track=>Array.from({length:50},(_,i)=>buildLesson(grade,track,i+1))));
const extensionLessonData=[1,2,3,4,5,6].flatMap(grade=>['Basic','Intermediate'].flatMap(track=>Array.from({length:50},(_,i)=>buildLesson(grade,track,i+51))));
const newLessonData=[
  [1,2,3,4,5,6].flatMap(grade=>Array.from({length:100},(_,i)=>buildLesson(grade,'Master',i+1))),
  [7,8,9].flatMap(grade=>['Basic','Intermediate','Master'].flatMap(track=>Array.from({length:100},(_,i)=>buildLesson(grade,track,i+1))))
].flat();
const finalLessonExtension=[1,2,3,4,5,6,7,8,9].flatMap(grade=>['Basic','Intermediate','Master'].flatMap(track=>Array.from({length:100},(_,i)=>buildLesson(grade,track,i+101))));
const lessonData=[...legacyLessonData,...extensionLessonData,...newLessonData,...finalLessonExtension];
const lessonSequence=lessonData.map((lesson,index)=>({lesson,index})).sort((a,b)=>
  a.lesson.grade-b.lesson.grade||
  (a.lesson.track===b.lesson.track?0:['Basic','Intermediate','Master'].indexOf(a.lesson.track)-['Basic','Intermediate','Master'].indexOf(b.lesson.track))||
  a.lesson.unitNumber-b.lesson.unitNumber||
  a.lesson.unitLessonNumber-b.lesson.unitLessonNumber
).map(item=>item.index);
const lessonIndexesByTrack=new Map();
lessonData.forEach((lesson,index)=>{
  const key=`${lesson.grade}:${lesson.track}`;
  if(!lessonIndexesByTrack.has(key))lessonIndexesByTrack.set(key,[]);
  lessonIndexesByTrack.get(key).push(index);
});
lessonIndexesByTrack.forEach(indexes=>indexes.sort((a,b)=>
  lessonData[a].unitNumber-lessonData[b].unitNumber||
  lessonData[a].unitLessonNumber-lessonData[b].unitLessonNumber
));
function normalizeLessonProgress(progressRows=[]){
  const keys = new Set((progressRows || []).map(row => String(row?.lesson_key || '')).filter(Boolean));
  const completedIndexes = [];
  lessonData.forEach((lesson, index) => {
    if (keys.has(lesson.lessonKey)) completedIndexes.push(index);
  });
  return completedIndexes;
}
function persist(){save('user',user);save('users',users);save('classes',classes);save('xp',xp);save('gamePoints',gamePoints)}
function toast(msg){let t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function go(page){if(!user){document.body.classList.add('auth-required');renderAuthGate(authMode);return}if(user.role==='admin'&&page!=='security'){page='security';adminCurrentView='overview'}if(user.role==='teacher'&&page!=='classes'){page='classes';toast('Teacher accounts are limited to classroom management.')}if(page==='security'&&user.role!=='admin'){toast('Trusted admin access is required.');return}$$('.home,.dashboard').forEach(x=>x.classList.remove('active','screen-enter'));const destination=$('#page-'+page);destination?.classList.add('active');if(destination){void destination.offsetWidth;destination.classList.add('screen-enter')}document.body.dataset.activePage=page;$$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));if(page==='lessons')renderLessons();if(page==='classes')renderClasses();if(page==='leaderboard')renderLeaderboard();if(page==='games')renderGameBoards();if(page==='progress')renderProgressDashboard();if(page==='tests')resetTest();if(page==='security')renderAdminView(adminCurrentView);window.scrollTo({top:0,behavior:'smooth'})}
$$('[data-page]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
const themeCatalog = {
  '': { label: 'ATAF Midnight', gradient: 'linear-gradient(135deg,#08090d,#ff4057,#4aa8ff)', coach: { name: 'ATAFBot', emoji: '🤖' } },
  ocean: { label: 'Ocean Explorer', gradient: 'linear-gradient(135deg,#06131b,#2dd4bf,#60a5fa)', coach: { name: 'Bubbles the Dolphin', emoji: '🐬' } },
  sunset: { label: 'Sunset Glow', gradient: 'linear-gradient(135deg,#1b0d13,#ff8b5e,#ffc857)', coach: { name: 'Sol the Fox', emoji: '🦊' } },
  forest: { label: 'Forest Quest', gradient: 'linear-gradient(135deg,#07130e,#7ee787,#e2c879)', coach: { name: 'Pip the Fox', emoji: '🦊' } },
  candy: { label: 'Candy Galaxy', gradient: 'linear-gradient(135deg,#160b1c,#ff68b4,#a78bfa)', coach: { name: 'Twinkle the Unicorn', emoji: '🦄' } },
  light: { label: 'Daylight', gradient: 'linear-gradient(135deg,#f1f3f8,#e82f4d,#1678c8)', coach: { name: 'Byte the Robot', emoji: '🤖' } },
  neon: { label: 'Neon Pulse', gradient: 'linear-gradient(135deg,#13091b,#00f5d4,#9b5de5)', coach: { name: 'Volt the Dragon', emoji: '🐲' } },
  sunrise: { label: 'Sunrise Sprint', gradient: 'linear-gradient(135deg,#1e0b0d,#ffb703,#fb8500)', coach: { name: 'Zippy the Cheetah', emoji: '🐆' } },
  aurora: { label: 'Aurora Drift', gradient: 'linear-gradient(135deg,#08181a,#52b788,#74c69d)', coach: { name: 'Lumi the Owl', emoji: '🦉' } },
  violet: { label: 'Violet Orbit', gradient: 'linear-gradient(135deg,#120b29,#8b5cf6,#f472b6)', coach: { name: 'Pixel the Wizard', emoji: '🧙' } },
  frogs: { label: 'Typing Frogs', gradient: 'linear-gradient(135deg,#09251b,#43b86b,#c9ef74)', coach: { name: 'Freddy the Frog', emoji: '🐸' } },
  birdies: { label: 'Birdies Bird', gradient: 'linear-gradient(135deg,#102542,#56b4e9,#ffe08a)', coach: { name: 'Birdie the Bluebird', emoji: '🐦' } }
};
const themeNames = Object.fromEntries(Object.entries(themeCatalog).map(([key, value]) => [key, value.label]));
function getThemeCoach(){return themeCatalog[load('theme','')]?.coach||themeCatalog[''].coach}
function characterMarkup(themeKey,character=getThemeCoach()){
  if(themeKey==='birdies')return '<svg class="character-art character-art-bird" viewBox="0 0 120 120" role="img" aria-label="Birdie the Bluebird"><ellipse cx="60" cy="72" rx="39" ry="33" fill="#278bd1"/><circle cx="60" cy="43" r="29" fill="#56b4e9"/><path d="M37 70c-15-2-22-12-24-24 16 1 27 9 32 21M83 70c15-2 22-12 24-24-16 1-27 9-32 21" fill="#1e6daf"/><ellipse cx="49" cy="43" rx="4" ry="6" fill="#102542"/><ellipse cx="71" cy="43" rx="4" ry="6" fill="#102542"/><path d="m55 54 5 8 6-8z" fill="#ffc857"/><ellipse cx="60" cy="88" rx="18" ry="8" fill="#f3f8ff"/><path d="m48 102-5 9m29-9 5 9" stroke="#ffc857" stroke-width="5" stroke-linecap="round"/><path d="M48 18c5-10 19-12 25-2" fill="none" stroke="#278bd1" stroke-width="6" stroke-linecap="round"/></svg>';
  if(themeKey===''||/robot/i.test(character.name))return '<svg class="character-art character-art-robot" viewBox="0 0 120 120" role="img" aria-label="ATAFBot"><path d="M60 12v13" stroke="#4aa8ff" stroke-width="6" stroke-linecap="round"/><circle cx="60" cy="10" r="6" fill="#ff4057"/><rect x="26" y="27" width="68" height="51" rx="17" fill="#d9e8f4" stroke="#4aa8ff" stroke-width="5"/><rect x="36" y="38" width="48" height="26" rx="10" fill="#101825"/><circle cx="49" cy="51" r="5" fill="#4ee0a0"/><circle cx="71" cy="51" r="5" fill="#4ee0a0"/><path d="M49 85h22v18H49z" fill="#4aa8ff"/><path d="M49 91H34v12h15m22-12h15v12H71" fill="none" stroke="#d9e8f4" stroke-width="7" stroke-linecap="round"/><path d="m53 104-6 7m20-7 6 7" stroke="#ff4057" stroke-width="6" stroke-linecap="round"/></svg>';
  return `<span class="character-art character-art-emoji" role="img" aria-label="${esc(character.name)}">${esc(character.emoji)}</span>`;
}
function openCharacterSelect(){
  const activeTheme=load('theme','');
  const cards=Object.entries(themeCatalog).map(([key,theme])=>`
    <button class="character-choice ${key===activeTheme?'selected':''}" type="button" data-character-theme="${esc(key)}" aria-pressed="${key===activeTheme}">
      <span class="character-choice-avatar" style="background:${theme.gradient}">${characterMarkup(key,theme.coach)}</span>
      <span class="character-choice-copy"><b>${esc(theme.coach.name)}</b><small>${esc(theme.label)} character</small></span>
      <span class="character-choice-check">${key===activeTheme?'✓ Selected':'Choose character'}</span>
    </button>`).join('');
  modal('Choose your typing character',`<section class="character-select-screen"><header class="character-select-hero"><span class="character-select-icon">${esc(getThemeCoach().emoji)}</span><div><p>YOUR XP COMPANION</p><h2>Choose your champion</h2><span>Your character levels up as you earn XP. Pick a character theme to match your world.</span></div></header><div class="character-choice-grid">${cards}</div><p class="character-select-note">The character and its matching theme stay together, so your guide, colors, and XP companion always fit.</p></section>`);
}
const gameCatalog = {
  rocket: { name: 'Rocket Words', emoji: '🚀', pointsPerWord: 10, objective:'Fuel the ship with words and launch as far as you can before time runs out.', action:'Rocket fueled — lift-off!', words: ['rocket','planet','keyboard','comet','typing','galaxy','brave','spark','journey','wonder','quick','future','magic','school','bright'] },
  bubble: { name: 'Bubble Pop', emoji: '🫧', pointsPerWord: 12, objective:'Type each bubble word before it floats away. You have 3 lives and 30 seconds!', action:'Pop! Bubble cleared.', words: ['bubble','river','cloud','glow','breeze','sunbeam','pop','drift','signal','spark','happy','fresh','mango','cabin','silver'] },
  dragon: { name: 'Dragon Dash', emoji: '🐉', pointsPerWord: 14, objective:'Feed your dragon words to charge its fire and race through the forest.', action:'Dragon flame charged!', words: ['dragon','forest','flame','ember','quest','myth','sprint','gold','blaze','wild','crown','lunar','bloom','stone','storm'] },
  rain: { name: 'Letter Rain', emoji: '🌧️', pointsPerWord: 9, objective:'Catch falling words before they reach the ground. Each catch clears the storm.', action:'Caught it! The storm clears.', words: ['rain','drop','letter','cloud','storm','shine','flash','drip','stream','mist','light','march','sound','rhythm','quartz'] },
  wizard: { name: 'Word Wizard', emoji: '🧙', pointsPerWord: 13, objective:'Cast a spell with every word. Build a streak to make each spell brighter.', action:'Spell cast! Magic streak grows.', words: ['magic','wizard','spell','portal','star','mystic','burst','lantern','dream','forest','rune','shield','sword','prism','quest'] },
  turbo: { name: 'Turbo Type', emoji: '🏎️', pointsPerWord: 15, objective:'Race through the checkpoints. Consecutive words boost your speed.', action:'Checkpoint passed — turbo boost!', words: ['turbo','velocity','boost','speed','zoom','trail','flight','signal','thunder','racer','delta','boost','orbit','momentum','pulse'] },
  meteor: { name: 'Meteor Match', emoji: '☄️', pointsPerWord: 12, objective:'Decode each meteor’s word before impact to protect your space shield.', action:'Meteor deflected — shield safe!', words: ['meteor','orbit','crash','nova','fuse','flare','signal','meteorite','moon','glint','cosmic','blink','echo','trail','orbit'] },
  treasure: { name: 'Treasure Tap', emoji: '💎', pointsPerWord: 11, objective:'Find three keys by typing their clues, then open the treasure chest.', action:'Key found! The chest is closer.', words: ['treasure','gold','map','cave','key','gem','pirate','island','coral','vault','coin','jewel','crown','harbor','stone'] },
  sky: { name: 'Sky Sprint', emoji: '✈️', pointsPerWord: 10, objective:'Guide your plane through clear-air gates and steer around storm clouds.', action:'Clear-air gate passed!', words: ['sky','cloud','wing','route','aero','flight','glide','horizon','chase','dawn','summit','wind','travel','gleam','skydive'] },
  garden: { name: 'Word Garden', emoji: '🌼', pointsPerWord: 11, objective:'Plant a seed with each word and grow a bright garden before time is up.', action:'Seed planted — your garden grows!', words: ['garden','petal','sprout','bloom','meadow','pollen','seedling','sunflower','orchard','fern','daisy','willow','grove','nectar','blossom'] },
  ocean: { name: 'Ocean Explorer', emoji: '🐬', pointsPerWord: 13, objective:'Help your dolphin friend collect pearls and explore the reef.', action:'Pearl collected — deeper we go!', words: ['ocean','dolphin','coral','current','seashell','whale','tidepool','seagrass','island','reef','sailor','harbor','wave','lagoon','deepsea'] },
  cipher: { name: 'Cipher Quest', emoji: '🔐', pointsPerWord: 15, objective:'Unscramble each secret code and type the decoded word to unlock the vault.', action:'Code cracked — vault progress!', words: ['cipher','decode','signal','pattern','sequence','puzzle','message','symbol','matrix','number','secret','logic','cipherkey','encrypt','solution'] },
  race: { name: 'Keystroke Grand Prix', emoji: '🏁', pointsPerWord: 20, duration: 90, objective:'Race three keyboard drivers. Type each track callout accurately to move your kart toward the finish.', action:'Clean lap! Your kart surges ahead.', words: ['steady hands guide your kart','quick fingers speed past the bridge','keep eyes ahead and type each turn','finish the course with careful typing'] }
};
let selectedGame = 'rocket';
let gameLeaderboardMode = 'global';
const levelStages=[
  {threshold:0,title:'Rookie',emoji:'👩‍💻',status:'Starting strong.'},
  {threshold:150,title:'Explorer',emoji:'🚀',status:'Building rhythm and confidence.'},
  {threshold:350,title:'Navigator',emoji:'🧭',status:'Your speed is growing.'},
  {threshold:650,title:'Champion',emoji:'🏆',status:'You are a top typist.'},
  {threshold:1100,title:'Legend',emoji:'🌟',status:'Typing mastery unlocked.'}
];
function getLevelMeta(levelXp){
  const level=Math.floor(levelXp/150)+1;
  const currentXp=levelXp % 150;
  const nextLevelXp=150 - currentXp;
  const stage=levelStages.reduce((best,stageDef)=> levelXp >= stageDef.threshold ? stageDef : best, levelStages[0]);
  return {level,currentXp,nextLevelXp,stage,progress:(currentXp/150)*100};
}
function renderProgressCard(){
  const selectedTheme=load('theme','');
  const currentTheme = themeNames[selectedTheme] || 'ATAF Midnight';
  const character=getThemeCoach();
  const totalXp = Number(xp || 0);
  const levelMeta = getLevelMeta(totalXp);
  const streakState = getStreakState();
  const displayName = user ? user.name : atafBot.name;
  const isTeacher = user && user.role === 'teacher';
  const avatarName = isTeacher ? '🧑‍🏫' : character.emoji;
  const titleText = isTeacher ? 'Teacher Mentor' : (user ? `${levelMeta.stage.title} · Level ${levelMeta.level}` : atafBot.title);
  const statusText = isTeacher ? 'Classroom leader and teaching guide.' : (user ? levelMeta.stage.status : atafBot.motto);
  const streakText = user ? `🔥 ${streakState.current}-day streak` : '🔥 New typing streak';
  const levelLabel = `Level ${levelMeta.level}`;
  const progressText = `${totalXp} / ${levelMeta.level * 150} XP`;
  const goalText = totalXp >= levelMeta.level * 150 ? 'Level up complete!' : `Next level in ${levelMeta.nextLevelXp} XP`;
  const nameEl = $('#characterName');
  const avatarEl = $('#characterAvatar');
  const badgeEl = $('#characterLevelBadge');
  const themeEl = $('#characterThemeName');
  const statusEl = $('#characterStatus');
  const xpBarEl = $('#xpBarFill');
  const xpMetaEl = $('#xpMetaText');
  const goalEl = $('#xpGoalText');
  if (avatarEl) avatarEl.innerHTML = isTeacher?avatarName:characterMarkup(selectedTheme,character);
  if (nameEl) nameEl.textContent = isTeacher ? `${displayName} · ${titleText}` : character.name;
  if (badgeEl) badgeEl.textContent = levelLabel;
  if (themeEl) themeEl.textContent = currentTheme;
  if (statusEl) statusEl.textContent = `${user?`${displayName}’s XP companion · `:''}${titleText} · ${statusText} • ${streakText}`;
  const characterCard=$('.character-card');
  if(characterCard)characterCard.style.setProperty('--character-gradient',themeCatalog[selectedTheme]?.gradient||themeCatalog[''].gradient);
  if (xpBarEl) xpBarEl.style.width = `${Math.min(100, levelMeta.progress)}%`;
  if (xpMetaEl) xpMetaEl.textContent = progressText;
  if (goalEl) goalEl.textContent = goalText;
  renderDailyChallenge();
  renderSkillBadges();
}

function getTodayKey(){
  const now=new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
function getDailyGoalState(){
  const today = getTodayKey();
  const stored = load('dailyGoalState', { date: today, xp: 0 });
  if (!stored || stored.date !== today) {
    const fresh = { date: today, xp: 0 };
    save('dailyGoalState', fresh);
    return fresh;
  }
  return stored;
}
function updateDailyGoalProgress(value){
  const state = getDailyGoalState();
  state.xp = Math.max(0, Number(state.xp || 0) + Number(value || 0));
  state.date = getTodayKey();
  save('dailyGoalState', state);
  return state;
}
function getDailyGoalTarget(){
  const grade = user && user.grade ? user.grade : 3;
  return Math.max(60, grade * 30 + 30);
}
function renderDailyChallenge(){
  const grade = user && user.grade ? user.grade : 3;
  const lessonsDone = Array.isArray(load('completedLessons', [])) ? load('completedLessons', []).length : 0;
  const dailyOptions = [
    'Type the sentence with calm rhythm and steady spacing.',
    'Finish the mini challenge with perfect home-row control.',
    'Match the target speed while keeping accuracy above 95%.',
    'Complete the sentence and focus on the next word, not the last one.'
  ];
  const prompt = `${gradeWordBank[grade]?.slice(0, 7).join(' ')}. ${dailyOptions[(lessonsDone + grade) % dailyOptions.length]}`;
  const targetWpm = Math.max(12, Math.min(42, grade * 5 + 8));
  const bonusXp = Math.max(25, grade * 10 + lessonsDone * 2);
  const goalState = getDailyGoalState();
  const goalTarget = getDailyGoalTarget();
  const goalProgress = Math.min(100, Math.round((Number(goalState.xp || 0) / goalTarget) * 100));
  const resumeState = load('resumeLesson', null);
  const resumeMarkup = resumeState ? `
    <div class="notice" style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
      <div><strong>Resume your last lesson</strong><br><span class="muted">${esc(resumeState.title || 'Latest lesson')} · Grade ${resumeState.grade || 1}</span></div>
      <button class="btn small primary" id="resumeLessonBtn" type="button">Resume now</button>
    </div>
  ` : '';
  const challengeHtml = `
    ${resumeMarkup}
    <div class="stats" style="margin-bottom:12px">
      <div class="stat-card"><small>GOAL</small><strong>${targetWpm} WPM</strong></div>
      <div class="stat-card"><small>ACCURACY</small><strong>95%+</strong></div>
      <div class="stat-card"><small>XP</small><strong>+${bonusXp}</strong></div>
    </div>
    <div class="practice-text" style="margin:0 0 12px">${esc(prompt)}</div>
    <div class="panel" style="padding:12px; margin-bottom:12px; border:1px solid var(--line); border-radius:12px; background:rgba(255,255,255,0.02)">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:12px; flex-wrap:wrap;">
        <strong>Daily typing goal</strong>
        <span class="muted">${Math.min(goalTarget, Number(goalState.xp || 0))}/${goalTarget} XP</span>
      </div>
      <div class="xp-bar"><span id="dailyGoalBar" style="width:${goalProgress}%"></span></div>
      <div class="muted" style="margin-top:8px;font-size:12px">${goalProgress}% complete today. Finish a lesson, test, or game to keep the streak alive.</div>
    </div>
    <div class="lesson-actions"><button class="btn primary" data-go="tests">Take the challenge</button><button class="btn" id="refreshChallengeBtnSecondary">New prompt</button></div>
  `;
  const host = $('#dailyChallenge');
  if (host) host.innerHTML = challengeHtml;
  const resumeBtn = document.getElementById('resumeLessonBtn');
  if (resumeBtn) {
    resumeBtn.onclick = () => {
      const resumeState = load('resumeLesson', null);
      if (!resumeState) return;
      selectedLesson = Number(resumeState.lessonIndex) || 0;
      selectedLessonStage = Number(resumeState.stage) || 0;
      go('lessons');
      renderLessons();
      toast('Resumed your last lesson.');
    };
  }
  const follow = document.getElementById('refreshChallengeBtn');
  if (follow) follow.onclick = () => renderDailyChallenge();
  const second = document.getElementById('refreshChallengeBtnSecondary');
  if (second) second.onclick = () => renderDailyChallenge();
}

function getStreakState(){
  const today = getTodayKey();
  const defaultState = { lastActiveDate: '', current: 0 };
  const state = load('typingStreak', defaultState);
  const lastDate = state?.lastActiveDate || '';
  const diffDays = lastDate ? Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${lastDate}T00:00:00Z`)) / 86400000) : Infinity;
  return {lastActiveDate:lastDate,current:diffDays>=0&&diffDays<=1?Math.max(0,Number(state.current)||0):0};
}
function recordPracticeActivity(kind='practice',details={}){
  const today=getTodayKey(),stored=load('typingStreak',{lastActiveDate:'',current:0}),lastDate=stored.lastActiveDate||'';
  const diffDays=lastDate?Math.round((Date.parse(`${today}T00:00:00Z`)-Date.parse(`${lastDate}T00:00:00Z`))/86400000):Infinity;
  const streakState={lastActiveDate:today,current:diffDays===0?Math.max(1,Number(stored.current)||1):diffDays===1?Math.max(0,Number(stored.current)||0)+1:1};
  save('typingStreak',streakState);
  const savedHistory=load('practiceActivityByDate',{});
  const history=savedHistory&&typeof savedHistory==='object'&&!Array.isArray(savedHistory)?savedHistory:{};
  const day=history[today]||{sessions:0,lessons:0,tests:0,games:0,xp:0};
  day.sessions=(Number(day.sessions)||0)+1;
  if(kind==='lesson'||kind==='test'||kind==='game')day[`${kind}s`]=(Number(day[`${kind}s`])||0)+1;
  day.xp=(Number(day.xp)||0)+Math.max(0,Number(details.xp)||0);
  history[today]=day;
  save('practiceActivityByDate',history);
  if(kind==='test'){
    const savedTests=load('typingTestHistory',[]);
    const tests=Array.isArray(savedTests)?savedTests:[];
    tests.unshift({date:today,wpm:Number(details.wpm)||0,accuracy:Number(details.accuracy)||0,duration:Number(details.duration)||0,mode:String(details.mode||'practice')});
    save('typingTestHistory',tests.slice(0,20));
  }
  if($('#page-progress')?.classList.contains('active'))renderProgressDashboard();
  return streakState.current;
}
function saveResumeState(lessonIndex = selectedLesson, stageIndex = selectedLessonStage){
  const lesson = lessonData[lessonIndex];
  if (!lesson) return;
  save('resumeLesson', {
    lessonIndex,
    stage: stageIndex,
    title: lesson.title,
    track: lesson.track,
    grade: lesson.grade
  });
}
function getSkillBadges(){
  const completed = Array.isArray(load('completedLessons', [])) ? load('completedLessons', []).length : 0;
  const streak = getStreakState().current;
  const bestGame = Object.values(load('gameBestScores', {})).reduce((max, value) => Math.max(max, Number(value) || 0), 0);
  return [
    { name: 'Home Row Hero', detail: 'Finish 1 lesson', earned: completed >= 1 },
    { name: 'Streak Starter', detail: `Keep a ${Math.max(1, streak)}-day streak`, earned: streak >= 1 },
    { name: 'Word Builder', detail: 'Reach 10 lessons', earned: completed >= 10 },
    { name: 'Steady Fingers', detail: 'Reach 25 lessons', earned: completed >= 25 },
    { name: 'Accuracy Ace', detail: 'Earn 250 XP', earned: (xp || 0) >= 250 },
    { name: 'Speed Star', detail: 'Hit 20 WPM or better', earned: (xp || 0) >= 400 },
    { name: 'Game Master', detail: `Top game score ${bestGame} pts`, earned: bestGame >= 100 },
    { name: 'Typing Legend', detail: 'Earn 750 XP', earned: (xp || 0) >= 750 }
  ];
}
function renderSkillBadges(){
  const badges = getSkillBadges();
  const host = $('#skillBadges');
  if (!host) return;
  host.innerHTML = badges.map((badge) => `
    <div class="feature-card" style="padding:14px;border:${badge.earned ? '1px solid rgba(255,209,102,.6)' : '1px solid var(--line)'};opacity:${badge.earned ? 1 : 0.75};">
      <div class="feature-icon" style="font-size:22px">${badge.earned ? '✅' : '🔒'}</div>
      <h3>${badge.name}</h3>
      <p>${badge.detail}</p>
    </div>
  `).join('');
}
function renderProgressDashboard(grade=Number($('#progressGrade')?.value||user?.grade||1)){
  const host=$('#progressDashboard');
  if(!host)return;
  grade=gradeNumbers.includes(Number(grade))?Number(grade):1;
  const completed=load('completedLessons',[]);
  const completedSet=new Set(Array.isArray(completed)?completed:[]);
  const savedActivities=load('practiceActivityByDate',{});
  const activities=savedActivities&&typeof savedActivities==='object'&&!Array.isArray(savedActivities)?savedActivities:{};
  const today=getTodayKey(),goal=getDailyGoalState(),goalTarget=getDailyGoalTarget();
  const totalLessons=completedSet.size,totalXp=Number(xp)||0,level=getLevelMeta(totalXp),currentStreak=getStreakState().current;
  const gradeUnlocked=isGradeUnlocked(grade,completed);
  const savedTestHistory=load('typingTestHistory',[]);
  const history=(Array.isArray(savedTestHistory)?savedTestHistory:[]).filter(test=>test&&Number.isFinite(Number(test.wpm))&&Number.isFinite(Number(test.accuracy)));
  const bestTest=history.reduce((best,test)=>Number(test.wpm)>Number(best?.wpm||0)?test:best,null);
  const averageAccuracy=history.length?Math.round(history.reduce((sum,test)=>sum+Number(test.accuracy),0)/history.length):0;
  const week=[];
  for(let offset=6;offset>=0;offset--){
    const date=new Date(Date.parse(`${today}T00:00:00Z`)-offset*86400000).toISOString().slice(0,10);
    const day=activities[date]||{};
    week.push({date,sessions:Number(day.sessions)||0,lessons:Number(day.lessons)||0,tests:Number(day.tests)||0,games:Number(day.games)||0});
  }
  const maxSessions=Math.max(1,...week.map(day=>day.sessions));
  const trackRows=['Basic','Intermediate','Master'].map(track=>{
    const indexes=lessonData.map((lesson,index)=>({lesson,index})).filter(item=>item.lesson.grade===grade&&item.lesson.track===track);
    const count=indexes.filter(item=>completedSet.has(item.index)).length;
    const percent=Math.round(count/Math.max(1,indexes.length)*100);
    const unlocked=gradeUnlocked&&isTrackUnlocked(grade,track,completed);
    return `<div class="progress-track-row"><div class="progress-track-heading"><b>${trackLabel(track)}${unlocked?'':' · 🔒'}</b><span>${count}/200 lessons · ${percent}%</span></div><div class="xp-bar"><span style="width:${percent}%"></span></div><small>${unlocked?'Continue your course in order.':'Complete the previous course and its one-minute test to unlock.'}</small></div>`;
  }).join('');
  const badges=getSkillBadges(),earned=badges.filter(badge=>badge.earned).length;
  const recentTests=history.slice(0,5).map(test=>`<div class="progress-test-row"><span><b>${Number(test.wpm)} WPM</b><small>${esc(test.mode)} · ${Number(test.duration)} sec</small></span><strong>${Number(test.accuracy)}% accuracy</strong><time>${esc(test.date)}</time></div>`).join('');
  host.innerHTML=`
    <div class="stats progress-overview">
      <div class="stat-card"><small>LESSONS COMPLETE</small><strong>${totalLessons.toLocaleString()}</strong><span>of ${lessonData.length.toLocaleString()} in the full curriculum</span></div>
      <div class="stat-card"><small>TOTAL XP</small><strong>${totalXp.toLocaleString()}</strong><span>${level.stage.title} · Level ${level.level}</span></div>
      <div class="stat-card"><small>CURRENT STREAK</small><strong>🔥 ${currentStreak} ${currentStreak===1?'day':'days'}</strong><span>Practice today to keep it going</span></div>
      <div class="stat-card"><small>BEST TEST</small><strong>${bestTest?`${Number(bestTest.wpm)} WPM`:'—'}</strong><span>${bestTest?`${Number(bestTest.accuracy)}% accuracy`:'Finish a test to set a record'}</span></div>
    </div>
    <div class="panel progress-goal-panel">
      <div class="progress-panel-heading"><div><h3>🎯 Today’s practice goal</h3><p>${Math.min(Number(goal.xp)||0,goalTarget)} of ${goalTarget} XP · ${Math.min(100,Math.round((Number(goal.xp||0)/goalTarget)*100))}% complete</p></div><button class="btn small primary" data-go="lessons">Practice now</button></div>
      <div class="xp-bar"><span style="width:${Math.min(100,Math.round((Number(goal.xp||0)/goalTarget)*100))}%"></span></div>
    </div>
    <div class="progress-dashboard-grid">
      <section class="panel progress-panel"><div class="progress-panel-heading"><div><h3>📅 Last 7 days</h3><p>${week.reduce((sum,day)=>sum+day.sessions,0)} practice sessions this week</p></div></div><div class="activity-chart" role="img" aria-label="Daily practice sessions over the last seven days">${week.map(day=>`<div class="activity-day" title="${day.date}: ${day.sessions} sessions"><span>${day.sessions||''}</span><div class="activity-bar-wrap"><i style="height:${day.sessions?Math.max(8,Math.round(day.sessions/maxSessions*100)):3}%"></i></div><small>${new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined,{weekday:'short'})}</small></div>`).join('')}</div><div class="activity-legend"><span>⌨ ${week.reduce((sum,day)=>sum+day.lessons,0)} lessons</span><span>🏁 ${week.reduce((sum,day)=>sum+day.tests,0)} tests</span><span>🎮 ${week.reduce((sum,day)=>sum+day.games,0)} games</span></div></section>
      <section class="panel progress-panel"><div class="progress-panel-heading"><div><h3>🧭 Course progress</h3><p>Choose a grade to see your track-by-track journey.</p></div><label class="progress-grade-select">Grade <select id="progressGrade">${gradeNumbers.map(item=>`<option value="${item}" ${item===grade?'selected':''}>${item}${isGradeUnlocked(item,completed)?'':' · locked'}</option>`).join('')}</select></label></div><div class="progress-track-list">${trackRows}</div><button class="btn small" id="progressContinue" type="button" ${gradeUnlocked?'':'disabled'}>${gradeUnlocked?`Continue Grade ${grade} lessons →`:'Finish the previous grade to unlock this path'}</button></section>
    </div>
    <div class="progress-dashboard-grid progress-lower-grid">
      <section class="panel progress-panel"><div class="progress-panel-heading"><div><h3>🏅 Achievements</h3><p>${earned} of ${badges.length} badges earned</p></div></div><div class="progress-badge-grid">${badges.map(badge=>`<div class="progress-badge ${badge.earned?'earned':''}"><span>${badge.earned?'🏅':'🔒'}</span><b>${esc(badge.name)}</b><small>${esc(badge.detail)}</small></div>`).join('')}</div></section>
      <section class="panel progress-panel"><div class="progress-panel-heading"><div><h3>🏁 Recent typing tests · this device</h3><p>${history.length?`Average accuracy: ${averageAccuracy}%`:'Your recent test history is stored in this browser.'}</p></div><button class="btn small" data-go="tests">Take a test</button></div>${recentTests?`<div class="progress-test-list">${recentTests}</div>`:'<div class="progress-empty">No test results yet. Take a quick test on this device and your results will appear here.</div>'}</section>
    </div>`;
  host.insertAdjacentHTML('beforeend','<section id="studentClassAwards" class="student-awards" aria-live="polite"></section>');
  loadStudentClassAwards();
  $('#progressLevelBadge').textContent=`Level ${level.level} · ${level.currentXp}/150 XP`;
  $('#progressGrade').onchange=event=>renderProgressDashboard(Number(event.target.value));
  $('#progressContinue').onclick=()=>{
    if(!isGradeUnlocked(grade,completed)){toast('Complete the previous grade and its assessments first.');return}
    const track=['Basic','Intermediate','Master'].find(item=>isTrackUnlocked(grade,item,completed))||'Basic';
    selectedLesson=firstIncompleteLesson(grade,track,completed);
    selectedLessonStage=0;
    go('lessons');
  };
  host.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>go(button.dataset.go)));
}
async function loadStudentClassAwards(){
  const container=$('#studentClassAwards');
  if(!container||!user||user.role==='admin')return;
  if(!supabaseReady){container.hidden=true;return}
  const [certificateCheck,awardResult,certificateResult]=await Promise.all([
    supabaseClient.rpc('get_weekly_leaderboard',{p_board_type:'typing',p_scope:'global',p_classroom_id:null,p_game_key:null}),
    supabaseClient.from('class_awards').select('award_key,note,created_at,classrooms(name)').order('created_at',{ascending:false}).limit(20),
    supabaseClient.from('leaderboard_certificates').select('board_scope,board_type,game_key,classroom_id,period_start,place,score').order('period_start',{ascending:false}).limit(20)
  ]);
  if(certificateCheck.error){
    console.error('Could not check weekly certificates',certificateCheck.error);
  }
  if(awardResult.error||certificateResult.error){
    const error=awardResult.error||certificateResult.error;
    console.error('Could not load student awards and certificates',error);
    container.innerHTML='<h3>🌟 Awards & certificates</h3><p class="muted">Recognition could not be loaded. Try again after checking the latest Supabase schema.</p>';
    return;
  }
  const labels={accuracy_star:'Accuracy Star',practice_streak:'Practice Streak',helpful_classmate:'Helpful Classmate',great_effort:'Great Effort'};
  const certificates=certificateResult.data||[];
  const certificateCards=certificates.map(item=>{
    const board=item.board_type==='typing'?'Typing points':item.game_key?`${gameCatalog[item.game_key]?.name||item.game_key} game`: 'All games';
    const scope=item.board_scope==='global'?'Global':classes.find(classroom=>classroom.id===item.classroom_id)?.name||'Class leaderboard';
    return `<article class="student-award-card leaderboard-certificate"><b>🏆 Weekly ${esc(board)} certificate</b><small>${esc(scope)} · ${placeLabel(item.place)} place · Week of ${new Date(`${item.period_start}T00:00:00Z`).toLocaleDateString(undefined,{timeZone:'UTC'})}</small><small>${Number(item.score).toLocaleString()} points</small></article>`;
  }).join('');
  const awards=awardResult.data||[];
  const awardCards=awards.map(item=>`<article class="student-award-card"><b>🏅 ${esc(labels[item.award_key]||'Classroom award')}</b><small>${esc(item.classrooms?.name||'Your classroom')} · ${new Date(item.created_at).toLocaleDateString()}</small>${item.note?`<small>${esc(item.note)}</small>`:''}</article>`).join('');
  container.innerHTML=`<h3>🌟 Awards & certificates</h3>${certificateCards||awardCards?`<div class="student-award-grid">${certificateCards}${awardCards}</div>`:'<p class="muted">Weekly certificates and classroom awards will appear here.</p>'}`;
}
function ensureGameAudioContext(){const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return null;if(!gameAudioContext)gameAudioContext=new Ctx();return gameAudioContext}
function playTone(freq,duration=0.18,type='sine',volume=0.04,delay=0){const ctx=ensureGameAudioContext();if(!ctx||!musicEnabled)return;const start=ctx.currentTime+delay;const osc=ctx.createOscillator();const gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,start);gain.gain.setValueAtTime(0.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+0.02);gain.gain.exponentialRampToValueAtTime(0.0001,start+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+duration+0.05)}
function startGameMusic(){if(!musicEnabled)return;const ctx=ensureGameAudioContext();if(!ctx)return;if(ctx.state==='suspended')ctx.resume();if(gameMusicTimer)return;const notes=[220,277,330,392,330,277,349,440];let step=0;gameMusicTimer=setInterval(()=>{const freq=notes[step%notes.length];playTone(freq,0.18,step%2===0?'square':'triangle',step%2===0?0.035:0.025);if(step%3===0)playTone(freq/2,0.2,'sine',0.02);step+=1;},320)}
function stopGameMusic(){if(gameMusicTimer){clearInterval(gameMusicTimer);gameMusicTimer=null}}
function pulseGameMusicGood(){if(!musicEnabled)return;playTone(523.25,0.12,'triangle',0.03);playTone(659.25,0.14,'sine',0.02,0.08)}
function setTheme(t){
  if(!Object.hasOwn(themeCatalog,t))t='';
  Object.keys(themeCatalog).filter(Boolean).forEach(theme=>document.body.classList.remove('theme-'+theme));
  if(t) document.body.classList.add('theme-'+t);
  save('theme',t);renderProgressCard();if($('#page-lessons')?.classList.contains('active'))renderLessons();toast((themeNames[t]||'ATAF Midnight')+' theme applied')
}
setTheme(load('theme',''));
function modal(title,html){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;const modalElement=$('#modalBackdrop .modal');modalElement.classList.toggle('game-modal',html.includes('game-play-screen'));modalElement.classList.toggle('character-modal',html.includes('character-select-screen'));$('#modalBackdrop').classList.add('open')}
function closeModal(){stopGameMusic();if(activeGameTimer){clearInterval(activeGameTimer);activeGameTimer=null}if(activeGameKeyHandler){document.removeEventListener('keydown',activeGameKeyHandler);activeGameKeyHandler=null}$('#modalBackdrop').classList.remove('open','game-preview-expanded');$('#modalBackdrop .modal').classList.remove('game-fullscreen-preview')}
$('#closeModal').onclick=closeModal;$('#modalBackdrop').addEventListener('click',e=>{if(e.target.id==='modalBackdrop')closeModal()});
const supabaseConfig = window.ATAF_CONFIG || {};
const supabaseReady = !!(window.supabase && supabaseConfig.SUPABASE_URL && supabaseConfig.SUPABASE_ANON_KEY && !supabaseConfig.SUPABASE_URL.includes('PASTE_') && !supabaseConfig.SUPABASE_ANON_KEY.includes('PASTE_'));
const supabaseClient = supabaseReady ? window.supabase.createClient(supabaseConfig.SUPABASE_URL, supabaseConfig.SUPABASE_ANON_KEY) : null;
let authMode='signup';
function renderAuthGate(mode='signup'){
  authMode=mode==='signin'?'signin':'signup';
  const signingIn=authMode==='signin';
  $('#authHeading').textContent=signingIn?'Welcome back.':'Create your account.';
  $('#authLead').textContent=signingIn?'Log in to continue to your lessons, games, progress, and classrooms.':'Sign up to unlock lessons, games, saved progress, and classrooms.';
  $('#authSignupTab').classList.toggle('selected',!signingIn);$('#authSigninTab').classList.toggle('selected',signingIn);
  $('#authNameField').style.display=signingIn?'none':'grid';$('#authName').required=!signingIn;
  $('#authUsernameLabel').textContent=signingIn?'@USERNAME OR EMAIL':'@USERNAME';
  $('#authUsername').placeholder=signingIn?'@alex_typist':'Choose a username (3–24 letters, numbers, or _)';
  $('#authEmailField').style.display=signingIn?'none':'grid';$('#authEmail').required=!signingIn;
  $('#authPassword').autocomplete=signingIn?'current-password':'new-password';$('#authPassword').placeholder=signingIn?'Enter your password':'At least 12 characters';
  $('#authPassword').minLength=signingIn?8:12;
  $('#authPasswordConfirmField').style.display=signingIn?'none':'grid';$('#authPasswordConfirm').required=!signingIn;$('#authPasswordConfirm').disabled=signingIn;$('#authPasswordConfirm').minLength=signingIn?0:12;
  $('#authSecuritySteps').style.display=signingIn?'none':'block';
  $('#authGateSubmit').textContent=signingIn?'Log in':'Create account';$('#authGateError').textContent='';
  const setup=$('#authSetupNotice');
  const providerButtons = [$('#googleSignInBtn')].filter(Boolean);
  if(!supabaseReady){setup.style.display='block';setup.innerHTML='Account access is not configured yet. Add your Supabase Project URL and publishable/anon key in <b>config.js</b>, then run <b>supabase/schema.sql</b> in your Supabase SQL Editor. Sign-up and log-in will be enabled after setup.';$('#authGateSubmit').disabled=true;$('#authName').disabled=true;$('#authUsername').disabled=true;$('#authEmail').disabled=true;$('#authPassword').disabled=true;$('#authPasswordConfirm').disabled=true;$('#authSignupTab').disabled=true;$('#authSigninTab').disabled=true;providerButtons.forEach(button=>button.disabled=true);}
  else {setup.style.display='none';$('#authGateSubmit').disabled=false;$('#authName').disabled=false;$('#authUsername').disabled=false;$('#authEmail').disabled=false;$('#authPassword').disabled=false;$('#authPasswordConfirm').disabled=signingIn;$('#authSignupTab').disabled=false;$('#authSigninTab').disabled=false;providerButtons.forEach(button=>button.disabled=false);}
}

function getAuthRedirectUrl(){
  const configuredRedirect=supabaseConfig.SUPABASE_AUTH_REDIRECT_URL?.trim();
  const redirectUrl=new URL(configuredRedirect||window.location.href);
  if(!['http:','https:'].includes(redirectUrl.protocol))throw new Error('Open Atomic Typing from a local web server or deployed HTTPS site before using account sign-in.');
  redirectUrl.search='';redirectUrl.hash='';
  return redirectUrl.href;
}
function validateEmailSignupPassword(password,confirmation){
  if(password.length<12)return 'Use a password with at least 12 characters.';
  if(!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/\d/.test(password)||!/[^A-Za-z0-9]/.test(password))return 'Use uppercase and lowercase letters, a number, and a symbol in your password.';
  if(password!==confirmation)return 'The passwords do not match.';
  return '';
}
function normalizeUsername(value){return String(value||'').trim().replace(/^@/,'').toLowerCase()}
function validateUsername(value){
  return /^[a-z0-9_]{3,24}$/.test(normalizeUsername(value))?'':"Choose a username with 3–24 letters, numbers, or underscores.";
}
async function startOAuthProvider(providerKey){
  const map = { google:{label:'Google', provider:'google'} };
  const entry = map[providerKey];
  if(!entry){throw new Error('Unsupported sign-in provider.')}
  if(!supabaseReady || !supabaseClient){
    $('#authGateError').textContent='OAuth is not active yet. Add your Supabase project URL and anon key in config.js, then enable the provider in Supabase Auth.';
    return;
  }
  let redirectTo;
  try{
    redirectTo=getAuthRedirectUrl();
  }catch(err){
    $('#authGateError').textContent=err.message||'Google sign-in redirect URL is invalid.';
    return;
  }
  const button=$('#googleSignInBtn');
  if(button)button.disabled=true;
  $('#authGateError').textContent='';
  try {
    const {data,error} = await supabaseClient.auth.signInWithOAuth({
      provider: entry.provider,
      options: { redirectTo, queryParams: { prompt: 'select_account' } }
    });
    if(error) throw error;
    if(data?.url){ window.location.assign(data.url); return; }
    throw new Error('Google sign-in did not return a redirect URL. Check that the Google provider is enabled in Supabase.');
  } catch(err){
    const msg = err.message || 'OAuth sign-in failed.';
    $('#authGateError').textContent = msg;
    toast(msg);
    if(button)button.disabled=false;
  }
}

$('#authSignupTab').onclick=()=>renderAuthGate('signup');$('#authSigninTab').onclick=()=>renderAuthGate('signin');
$('#googleSignInBtn').onclick=()=>startOAuthProvider('google');
$('#authGateForm').onsubmit=async e=>{
  e.preventDefault();if(!supabaseReady){renderAuthGate(authMode);return}
  const f=new FormData(e.currentTarget),email=String(f.get('email')||'').trim().toLowerCase(),password=String(f.get('password')||''),name=String(f.get('name')||'').trim();
  const identity=String(f.get('username')||'').trim(),username=normalizeUsername(identity);
  const submit=$('#authGateSubmit');submit.disabled=true;submit.textContent=authMode==='signin'?'Logging in…':'Creating account…';$('#authGateError').textContent='';
  try{
    if(authMode==='signup'){
      const usernameProblem=validateUsername(identity);
      if(usernameProblem)throw new Error(usernameProblem);
      const passwordProblem=validateEmailSignupPassword(password,String(f.get('passwordConfirm')||''));
      if(passwordProblem)throw new Error(passwordProblem);
      const redirectTo=getAuthRedirectUrl();
      const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{display_name:name||'Typist',username},emailRedirectTo:redirectTo}});if(error)throw error;
      if(!data.session){$('#authGateError').textContent='Account created. Check your email to confirm your address, then log in here.';submit.disabled=false;submit.textContent='Create account';return}
      await syncAuthenticatedUser(data.user);if(!user)throw new Error('Your account was created, but the profile is not ready yet. Check that supabase/schema.sql has been run.');go(user.role==='teacher'?'classes':'home');toast('Account created securely!');
    } else {
      let data,error;
      if(identity.includes('@')&&!identity.startsWith('@'))({data,error}=await supabaseClient.auth.signInWithPassword({email:identity.toLowerCase(),password}));
      else{
        const result=await supabaseClient.functions.invoke('username-sign-in',{body:{username,password}});
        if(result.error)throw new Error('Username sign-in is unavailable. Deploy the username-sign-in Edge Function, or try signing in with your email.');
        if(!result.data?.access_token||!result.data?.refresh_token)throw new Error('Invalid username or password.');
        ({data,error}=await supabaseClient.auth.setSession({access_token:result.data.access_token,refresh_token:result.data.refresh_token}));
      }
      if(error)throw error;
      await syncAuthenticatedUser(data.user);if(!user)throw new Error('Your profile could not be loaded. Check the Supabase schema.');go(user.role==='teacher'?'classes':'home');toast('Welcome back, '+user.name+'!');
    }
  }catch(err){$('#authGateError').textContent=err.message||'Could not authenticate. Please try again.';submit.disabled=false;submit.textContent=authMode==='signin'?'Log in':'Create account'}
};
function applyRoleAccess(){
  const teacher=user?.role==='teacher';
  const admin=user?.role==='admin';
  $$('.nav button').forEach(b=>{b.style.display=admin?'none':teacher?(b.dataset.page==='classes'?'':'none'):''});
  $$('[data-admin-only]').forEach(item=>{item.style.display='none'});
  const create=$('#createClassBtn');if(create)create.style.display=teacher?'':'none';
  const join=$('#joinClassBtn');if(join)join.style.display=teacher?'none':'';
  $$('[data-role]').forEach(b=>b.style.display='none');
  const tools=$('.teacher-tools');if(tools)tools.style.display='none';
  const classTitle=$('#page-classes .page-title p');if(classTitle)classTitle.textContent=teacher?'Create and manage your classrooms, codes, and student join requests.':'Join your teacher’s classroom with a class code.';
  const boardTitle=$('#page-classes .section-head');if(boardTitle)boardTitle.style.display=teacher?'none':'';
  if(teacher){$$('.home,.dashboard').forEach(x=>x.classList.remove('active'));$('#page-classes').classList.add('active');}
}

function resolveOAuthRole(profile){
  return profile?.role==='teacher'||profile?.role==='admin'?profile.role:'student';
}

async function syncAuthenticatedUser(authUser){
  if(!authUser){user=null;save('user',null);persist();updateHeader();return}
  let profile=null;
  try { const {data,error}=await supabaseClient.from('profiles').select('id,display_name,username,role,grade,xp,game_points').eq('id',authUser.id).single(); if(error) throw error; profile=data; }
  catch(err){ console.error('Could not load ATAF profile',err); toast('Signed in, but profile setup needs attention. Run the Supabase schema SQL.'); }
  const selectedRole = resolveOAuthRole(profile);
  user={id:authUser.id,name:profile?.display_name || authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'Typist',username:profile?.username||'',email:authUser.email,role:selectedRole,xp:profile?.xp || 0,gamePoints:profile?.game_points || 0,grade:profile?.grade || 1,joined:[]};
  xp=user.xp; gamePoints=user.gamePoints; users=users.filter(u=>u.id!==user.id); users.push(user); save('user',user); persist(); updateHeader(); renderClasses(); renderLeaderboard(); renderGameBoards();
}
function accountForm(mode='signup'){
  if(!supabaseReady){modal('Connect Supabase first',`<p>Real password accounts are not enabled yet because this deployment has no Supabase configuration.</p><p class="muted">Open <b>config.js</b> and add your Supabase Project URL and publishable/anon key, then run <b>supabase/schema.sql</b> in the Supabase SQL Editor.</p><button class="btn primary" data-dismiss-modal>Got it</button>`);return}
  modal(mode==='signin'?'Sign in to ATAF Typing':'Create your ATAF account',`<form id="accountForm">${mode==='signup'?`<div class="field"><label>DISPLAY NAME</label><input name="name" required maxlength="60" placeholder="e.g. Alex"></div>`:''}<div class="field"><label>${mode==='signin'?'@USERNAME OR EMAIL':'@USERNAME'}</label><input name="username" type="text" required minlength="3" maxlength="64" autocomplete="username" placeholder="${mode==='signin'?'@alex_typist':'Choose a username (3–24 letters, numbers, or _)'}"></div>${mode==='signup'?`<div class="field"><label>EMAIL</label><input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></div>`:''}<div class="field"><label>PASSWORD</label><input name="password" type="password" required minlength="${mode==='signin'?8:12}" autocomplete="${mode==='signin'?'current-password':'new-password'}" placeholder="${mode==='signin'?'Enter your password':'12+ chars with upper/lowercase, number & symbol'}"></div>${mode==='signup'?`<div class="field"><label>CONFIRM PASSWORD</label><input name="passwordConfirm" type="password" required minlength="12" autocomplete="new-password" placeholder="Re-enter your password"></div><p class="muted">Atomic PSD checks password strength and asks you to verify your email before first sign-in.</p>`:''}${mode==='signin'?`<button type="button" class="ghost" id="forgotPassword">Forgot password? Use your email</button>`:''}<p id="authError" class="muted" role="status" style="font-size:12px"></p><button class="btn primary" style="width:100%" type="submit">${mode==='signin'?'Sign in securely':'Create account'}</button><p class="muted" style="font-size:12px;margin-top:12px">${mode==='signin'?`New here? <a href="#" id="switchAuth">Create an account</a>`:`Already have an account? <a href="#" id="switchAuth">Sign in</a>`}</p></form>`);
  if(mode==='signup'){
    $('#accountForm').addEventListener('submit',event=>{
      const fields=new FormData(event.currentTarget);
      const problem=validateEmailSignupPassword(String(fields.get('password')||''),String(fields.get('passwordConfirm')||''));
      if(problem){event.preventDefault();event.stopImmediatePropagation();$('#authError').textContent=problem}
    },true);
  }
  $('#switchAuth').onclick=e=>{e.preventDefault();accountForm(mode==='signin'?'signup':'signin')};
  if($('#forgotPassword')) $('#forgotPassword').onclick=async()=>{
    const identity=$('#accountForm').elements.username.value.trim();
    const email=identity.includes('@')&&!identity.startsWith('@')?identity.toLowerCase():'';
    if(!email){$('#authError').textContent='Enter your account email in the username field to request a reset.';return}
    try{
      const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:getAuthRedirectUrl()});
      if(error)throw error;
      $('#authError').textContent='If an account exists for that email, a password reset link will be sent.';
    }catch(error){
      $('#authError').textContent=error.message||'Could not request a password reset.';
    }
  };
  $('#accountForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),email=String(f.get('email')).trim().toLowerCase(),password=String(f.get('password')),name=String(f.get('name')||'').trim(),submit=e.target.querySelector('[type="submit"]');submit.disabled=true;submit.textContent='Please wait…';$('#authError').textContent='';
    const identity=String(f.get('username')||'').trim(),username=normalizeUsername(identity);
    try{
      if(mode==='signup'){
        const usernameProblem=validateUsername(identity);
        if(usernameProblem)throw new Error(usernameProblem);
        const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{display_name:name||'Typist',username},emailRedirectTo:getAuthRedirectUrl()}});if(error)throw error;
        if(!data.session){$('#authError').textContent='Account created. Check your email to confirm your address, then sign in.';submit.disabled=false;submit.textContent='Create account';return}
        await syncAuthenticatedUser(data.user);closeModal();toast('Account created securely!');go('home');
      } else {
        let data,error;
        if(identity.includes('@')&&!identity.startsWith('@'))({data,error}=await supabaseClient.auth.signInWithPassword({email:identity.toLowerCase(),password}));
        else{
          const result=await supabaseClient.functions.invoke('username-sign-in',{body:{username,password}});
          if(result.error)throw new Error('Username sign-in is unavailable. Deploy the username-sign-in Edge Function, or try signing in with your email.');
          if(!result.data?.access_token||!result.data?.refresh_token)throw new Error('Invalid username or password.');
          ({data,error}=await supabaseClient.auth.setSession({access_token:result.data.access_token,refresh_token:result.data.refresh_token}));
        }
        if(error)throw error;await syncAuthenticatedUser(data.user);closeModal();toast('Welcome back, '+user.name+'!');go('home');
      }
    }catch(err){$('#authError').textContent=err.message || 'Could not authenticate. Please try again.';submit.disabled=false;submit.textContent=mode==='signin'?'Sign in securely':'Create account'}
  };
}
function openAccountPanel(){
  modal('Your account',`<p>Signed in as <b>${esc(user.name)}</b> (${esc(user.role)}).</p><p class="muted">Username: <b>${user.username?'@'+esc(user.username):'not set'}</b> · Personal XP: ${xp} · Game points: ${gamePoints}</p><form id="usernameForm"><div class="field"><label for="accountUsername">@USERNAME</label><input id="accountUsername" name="username" type="text" minlength="3" maxlength="25" autocomplete="username" value="${esc(user.username||'')}" placeholder="3–24 letters, numbers, or _" required></div><p class="muted" id="usernameFormError" role="status"></p><button class="btn primary" type="submit">Save username</button></form><button class="btn" id="signOutBtn" style="margin-top:12px">Sign out</button>`);
  $('#usernameForm').onsubmit=async event=>{
    event.preventDefault();
    const username=normalizeUsername(new FormData(event.currentTarget).get('username')),problem=validateUsername(username),submit=event.currentTarget.querySelector('[type="submit"]');
    if(problem){$('#usernameFormError').textContent=problem;return}
    submit.disabled=true;
    try{
      const {error}=await supabaseClient.from('profiles').update({username}).eq('id',user.id);
      if(error)throw error;
      user.username=username;save('user',user);$('#usernameFormError').textContent='Username saved.';toast('Username saved.');
    }catch(error){$('#usernameFormError').textContent=error.message||'Could not save this username.'}
    finally{submit.disabled=false}
  };
}
$('#signInBtn').onclick=()=>{if(!user){document.body.classList.add('auth-required');renderAuthGate('signin')}else openAccountPanel()};
$('#accountBtn').onclick=()=>user?openAccountPanel():(document.body.classList.add('auth-required'),renderAuthGate('signup'));
document.addEventListener('click',async e=>{if(e.target && e.target.id==='signOutBtn'){if(supabaseClient){const {error}=await supabaseClient.auth.signOut();if(error){toast(error.message);return}}user=null;classes=[];remoteProfiles=[];save('user',null);persist();updateHeader();closeModal();renderAuthGate('signin');toast('Signed out.')}});
// Authentication initialization is handled by initializeBackend() below.
function updateHeader(){if(user){document.body.classList.remove('auth-required');$('#signInBtn').textContent=user.name;$('#accountBtn').textContent='My account ▾';applyRoleAccess();renderProgressCard()}else{document.body.classList.add('auth-required');$('#signInBtn').textContent='Sign in';$('#accountBtn').textContent='Create account ↗';$$('.nav button').forEach(b=>b.style.display='');$$('[data-admin-only]').forEach(item=>item.style.display='none');renderProgressCard();}}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function ensureUser(){if(!user){document.body.classList.add('auth-required');renderAuthGate('signup');return false}return true}
function renderHomeLevels(){$('#homeLevels').innerHTML=gradeNumbers.map((g,i)=>`<div class="feature-card ${isGradeUnlocked(g)?'':'grade-locked'}" data-lesson="${lessonData.findIndex(l=>l.grade===g)}"><div class="feature-icon">${['🌱','🧭','🧩','⚡','🚀','🏆','📚','🔭','🎓'][i]}</div><h3>${gradeOrdinal(g)} grade${isGradeUnlocked(g)?'':' 🔒'}</h3><p>600 lessons · 30 units</p><p class="muted">Target: ${gradeTargets[g].wpm} WPM · ${gradeTargets[g].cpm} CPM</p><span class="text-link">${isGradeUnlocked(g)?'Start level →':'Finish the previous grade first'}</span></div>`).join('');$$('[data-lesson]').forEach(b=>b.onclick=()=>{const lesson=lessonData[+b.dataset.lesson];if(!isGradeUnlocked(lesson.grade)){toast('Complete the previous grade and its assessments first.');return}selectedLesson=firstIncompleteLesson(lesson.grade,'Basic');selectedLessonStage=0;lessonView='guide';go('lessons')})}
function renderCurriculumPath(){$('#curriculumPath').innerHTML=gradeNumbers.map((g,i)=>{const gradeLessons=lessonData.map((lesson,index)=>({lesson,index})).filter(item=>item.lesson.grade===g),done=gradeLessons.filter(item=>load('completedLessons',[]).includes(item.index)).length,unlocked=isGradeUnlocked(g);return `<button class="path-step ${unlocked?'':'grade-locked'}" data-path-grade="${g}" ${unlocked?'':'aria-disabled="true"'}><span class="path-number">${['🌱','🧭','🧩','⚡','🚀','🏆','📚','🔭','🎓'][i]}</span><b>${gradeOrdinal(g)} grade${unlocked?'':' 🔒'}</b><small>${done}/600 lessons</small><small>200 Beginner · 200 Intermediate · 200 Master</small></button>`}).join('');$$('[data-path-grade]').forEach(b=>b.onclick=()=>{const grade=+b.dataset.pathGrade;if(!isGradeUnlocked(grade)){toast('Complete the previous grade and its assessments first.');return}selectedLesson=firstIncompleteLesson(grade,'Basic');selectedLessonStage=0;lessonView='guide';go('lessons')})}
renderProgressCard();
function buildLessonStages(lesson){
  const wordRow = lesson.text;
  const challengeText = `${lesson.text} ${lesson.text}`.slice(0, 140);
  const dictationPrompt=(lesson.text||'').trim().split(/\s+/).reduce((phrase,word)=>phrase&&(phrase+' '+word).length<=42?phrase+' '+word:phrase,'')||lesson.text.slice(0,42);
  const keyList = Array.from(new Set((lesson.keys || 'abcdefghijklmnopqrstuvwxyz').toLowerCase().replace(/[^a-z]/g, '').split(''))).slice(0, 6);
  const stages = [
    {id:'intro', label:'Intro', explanation:`Meet your typing guide. ${lesson.desc}`, prompt: lesson.text, keyCards: ['Warm-up', 'Keep eyes on the text', 'Use relaxed wrists']},
    {id:'keys', label:'Key focus', explanation:`Focus on ${keyList.join(' • ')}. ${lesson.focus}`, prompt: `${keyList.join(' ')} ${keyList.join(' ')}`.slice(0, 80), keyCards: keyList.map(ch => ({letter: ch.toUpperCase(), tip: `Use ${ch.toUpperCase()} with the correct finger.`}))},
    {id:'words', label:'Word build', explanation:'Build confidence with short words before sentences.', prompt: `${wordRow}`, keyCards: ['Word bank', 'Full words', 'Slow down and space correctly']},
    {id:'sentences', label:'Sentence line', explanation:'Type with a smooth rhythm and correct spacing.', prompt: challengeText, keyCards: ['Look ahead', 'Stay relaxed', 'Finish the whole line']},
    {id:'timed', label:'Timed drill', explanation:'Try the same sentence again at a steady pace.', prompt: challengeText.split(' ').slice(0, 12).join(' '), keyCards: ['Steady pace', 'Check accuracy', 'Finish without rushing']},
    {id:'review', label:'Review', explanation:'Repeat the pattern and return fingers to home row.', prompt: `${lesson.keys.slice(0, 16)} ${lesson.keys.slice(0, 16)}`.slice(0, 120), keyCards: ['Home row', 'Smooth return', 'Accuracy first']},
    {id:'mini', label:'Mini challenge', explanation:'Build speed with a short game-style challenge.', prompt: lesson.text, keyCards: ['Short burst', 'Minimal errors', 'Keep rhythm']},
    {id:'passage', label:'Passage', explanation:'Use a longer line to strengthen fluency and control.', prompt: challengeText, keyCards: ['Longer text', 'Watch spacing', 'Stay consistent']},
    {id:'dictation', label:'Listen & type', explanation:'Listen to one short phrase, remember the words, and type them without a visible copy. There is no timer.', prompt:dictationPrompt, listenOnly:true, keyCards:['Short phrase', 'Listen at a calm pace', 'Replay when you need']},
    {id:'checkpoint', label:'Checkpoint', explanation:'Finish the lesson with a confidence-building review set.', prompt: challengeText, keyCards: ['Final review', 'Accuracy target', 'Ready for challenge']}
  ];
  if(lesson.unitNumber===1&&lesson.unitLessonNumber===1&&/f and j/i.test(lesson.focus)){
    stages.splice(2,0,
      {id:'hold-f',label:'Hold F + type J',explanation:'Keep F held down with your left index finger while tapping J six times with your right index finger.',prompt:'jjjjjj',holdKey:'f',keyCards:['Hold F','Tap J six times','Keep both hands relaxed']},
      {id:'hold-j',label:'Hold J + type F',explanation:'Keep J held down with your right index finger while tapping F six times with your left index finger.',prompt:'ffffff',holdKey:'j',keyCards:['Hold J','Tap F six times','Return both fingers to home row']}
    );
  }
  const phaseByStage={
    intro:'learn',keys:'learn','hold-f':'learn','hold-j':'learn',
    words:'practice',review:'practice',
    sentences:'apply',passage:'apply',dictation:'apply',
    timed:'challenge',mini:'challenge',checkpoint:'challenge'
  };
  const keyOnlyLesson=lesson.unitLessonNumber<=2;
  if(keyOnlyLesson){
    const forward=keyList.join('')||'asdf';
    const reverse=[...forward].reverse().join('');
    const drills={
      intro:forward.repeat(2),
      keys:`${forward}${reverse}${forward}`,
      words:forward.repeat(3),
      sentences:`${forward}${reverse}${forward}${reverse}`,
      timed:`${forward}${reverse}${forward}`,
      review:`${reverse}${forward}${reverse}`,
      mini:`${forward}${reverse}`,
      passage:`${forward}${reverse}${forward}${reverse}${forward}`,
      checkpoint:`${reverse}${forward}${reverse}`
    };
    return stages.filter(stage=>stage.id!=='dictation').map(stage=>{
      if(stage.holdKey)return {...stage,phase:phaseByStage[stage.id]||'challenge',keyOnly:true};
      const labels={intro:'Key warm-up',keys:'Key focus',words:'Key pattern',sentences:'Smooth pattern',timed:'Steady drill',review:'Key review',mini:'Mini challenge',passage:'Pattern practice',checkpoint:'Key checkpoint'};
      const explanations={intro:'Warm up with the focus keys. This drill has no spaces.',keys:`Practice ${keyList.join(' · ')} in a short pattern. No spaces for this drill.`,words:'Repeat the focus-key pattern with an even rhythm. This drill has no spaces.',sentences:'Build a smooth rhythm across the focus keys. This drill has no spaces.',timed:'Type the focus-key pattern calmly. There is no timer and no spaces in this drill.',review:'Review the focus keys without spaces, then return your fingers to home row.',mini:'Try a short focus-key challenge without spaces.',passage:'Continue the focus-key pattern. This drill has no spaces.',checkpoint:'Finish this focus-key review without spaces.'};
      return {...stage,label:labels[stage.id]||stage.label,explanation:explanations[stage.id]||stage.explanation,prompt:drills[stage.id]||forward.repeat(2),listenOnly:false,keyOnly:true,phase:phaseByStage[stage.id]||'challenge'};
    });
  }
  return stages.map(stage=>({...stage,phase:phaseByStage[stage.id]||'challenge'}));
}
function isTrackUnlocked(grade,track,completed=load('completedLessons',[])){
  if(track==='Basic')return true;
  const prerequisite=track==='Intermediate'?'Basic':'Intermediate';
  const prerequisiteIndexes=lessonIndexesByTrack.get(`${grade}:${prerequisite}`)||[];
  return prerequisiteIndexes.length===200&&prerequisiteIndexes.every(index=>completed.includes(index))&&completedTrackAssessments.has(`${grade}-${prerequisite}`);
}
function isLessonUnlocked(index,completed=load('completedLessons',[])){
  if(completed.includes(index))return true;
  const lesson=lessonData[index];
  if(!lesson)return false;
  const trackIndexes=lessonIndexesByTrack.get(`${lesson.grade}:${lesson.track}`)||[];
  const position=trackIndexes.indexOf(index);
  return position>=0&&trackIndexes.slice(0,position).every(previousIndex=>completed.includes(previousIndex));
}
function isGradeUnlocked(grade,completed=load('completedLessons',[])){
  if(grade<=1)return true;
  const previousGrade=grade-1;
  return ['Basic','Intermediate','Master'].every(track=>{
    const indexes=lessonIndexesByTrack.get(`${previousGrade}:${track}`)||[];
    return indexes.length===200&&indexes.every(index=>completed.includes(index))&&completedTrackAssessments.has(`${previousGrade}-${track}`);
  });
}
function firstIncompleteLesson(grade,track,completed=load('completedLessons',[])){
  const indexes=lessonIndexesByTrack.get(`${grade}:${track}`)||[];
  return indexes.find(index=>!completed.includes(index))??indexes[0]??0;
}
function renderWritingStudio(){
  const studio=$('#writingStudio');
  const lessonLayout=$('#lessonLayout');
  studio.hidden=!writingMode||writingMode==='lessons';
  lessonLayout.hidden=Boolean(writingMode&&writingMode!=='lessons');
  $$('[data-writing-mode]').forEach(button=>button.classList.toggle('selected',button.dataset.writingMode===writingMode));
  if(!writingMode||writingMode==='lessons'){studio.innerHTML='';return}

  const activities={
    career:{
      title:'Career typing',
      description:'Practice common workplace writing: clear email, a short schedule update, and a resume skill line.',
      tasks:[
        {name:'Professional email',lesson:'A clear email has a greeting, a short purpose, and a polite sign-off.',target:'Hello Ms. Rivera, I can meet Tuesday at 10 a.m. Thank you, Jordan.'},
        {name:'Schedule update',lesson:'Put the important details first so teammates can quickly scan an update.',target:'Project check-in: Thursday, 2 p.m. Room 4. Please bring your notes.'},
        {name:'Resume skill line',lesson:'Use concise, truthful skill statements. Never add experience you do not have.',target:'Skills: clear communication, careful research, and reliable teamwork.'}
      ]
    },
    mla:{
      title:'MLA learning',
      description:'Learn a basic MLA heading and practice an in-text citation. Follow your teacher’s current edition and assignment directions.',
      tasks:[
        {name:'Paper heading',lesson:'A student paper commonly places the student, instructor, course, and date on separate lines, followed by a centered title. This practice shows the order; follow your instructor’s formatting directions.',target:'Jordan Lee\nMs. Rivera\nEnglish 8\n8 November 2026\nA Place to Begin'},
        {name:'In-text citation',lesson:'A parenthetical citation usually gives the author’s last name and page number when available. This made-up classroom example is for formatting practice only; do not cite it as a real source.',target:'Small steps can lead to big changes (Rivera 2).'},
        {name:'Works Cited entry',lesson:'A Works Cited entry starts with the author and includes the source title and publication details. This is a fictional example for practice, not a real source to cite.',target:'Rivera, Ana. "Small Steps." Class Handout, 2026.'}
      ]
    }
  };
  const targetMarkup=text=>text.split('\n').map((line,index,lines)=>`<span class="writing-target-line${lines.length>1&&index===lines.length-1?' writing-target-title':''}">${[...line].map(char=>char===' '?'<span class="writing-space-marker" aria-label="space">SP</span>':`<span>${esc(char)}</span>`).join('')}</span>`).join('');
  if(writingMode==='stories'){
    const prompts=[
      'A mysterious map appears inside a library book.',
      'Invent something that solves a small problem at school.',
      'Write about a character who learns to ask for help.'
    ];
    const promptIndex=Math.max(0,Math.min(prompts.length-1,writingTaskIndex));
    const drafts=load('writingStoryDrafts',{});
    const draft=drafts[promptIndex]||{title:'',body:''};
    studio.innerHTML=`<div class="writing-studio-heading"><div><h3>Story studio</h3><p>Choose an idea, plan a beginning, middle, and ending, then write in your own words.</p></div><span class="pill">YOUR WORDS · YOUR STORY</span></div><div class="writing-task-picker" role="group" aria-label="Story prompts">${prompts.map((prompt,index)=>`<button class="btn small ${index===promptIndex?'selected':''}" type="button" data-story-prompt="${index}">Idea ${index+1}</button>`).join('')}</div><p class="writing-lesson"><b>Story spark:</b> ${esc(prompts[promptIndex])}</p><div class="story-writing-grid"><label>Story title<input id="storyTitle" maxlength="80" placeholder="Give your story a title" value="${esc(draft.title)}"></label><label>Your story<textarea id="storyBody" rows="10" maxlength="5000" placeholder="Start with a character, a place, and something that changes...">${esc(draft.body)}</textarea></label></div><div class="story-writing-footer"><span id="storyWordCount">${draft.body.trim()?draft.body.trim().split(/\s+/).length:0} words · saved on this device</span><span>Try: beginning → problem → choice → ending</span></div>`;
    $$('[data-story-prompt]').forEach(button=>button.onclick=()=>{writingTaskIndex=Number(button.dataset.storyPrompt);renderWritingStudio()});
    const persistStory=()=>{
      const updated=load('writingStoryDrafts',{});
      updated[promptIndex]={title:$('#storyTitle').value,body:$('#storyBody').value};
      save('writingStoryDrafts',updated);
      const words=$('#storyBody').value.trim().split(/\s+/).filter(Boolean).length;
      $('#storyWordCount').textContent=`${words} ${words===1?'word':'words'} · saved on this device`;
    };
    $('#storyTitle').addEventListener('input',persistStory);
    $('#storyBody').addEventListener('input',persistStory);
    return;
  }

  const activity=activities[writingMode];
  if(!activity){writingMode=null;renderWritingStudio();return}
  const taskIndex=Math.max(0,Math.min(activity.tasks.length-1,writingTaskIndex));
  const task=activity.tasks[taskIndex];
  const progress=load('writingTaskProgress',[]);
  studio.innerHTML=`<div class="writing-studio-heading"><div><h3>${activity.title}</h3><p>${activity.description}</p></div><span class="pill">NO TIMER · ACCURACY FIRST</span></div><div class="writing-task-picker" role="group" aria-label="${activity.title} exercises">${activity.tasks.map((item,index)=>`<button class="btn small ${progress.includes(`${writingMode}-${index}`)?'complete':''} ${index===taskIndex?'selected':''}" type="button" data-writing-task="${index}">${progress.includes(`${writingMode}-${index}`)?'✓ ':''}${esc(item.name)}</button>`).join('')}</div><p class="writing-lesson"><b>Learn:</b> ${esc(task.lesson)}</p><p class="writing-instruction"><b>Type this example:</b> Spaces are marked <span class="writing-space-marker">SP</span>; each line break starts a new line.</p><div class="writing-target" aria-label="Practice text">${targetMarkup(task.target)}</div><label class="writing-entry-label" for="writingPracticeInput">Your typing</label><textarea id="writingPracticeInput" rows="${task.target.includes('\n')?6:3}" spellcheck="false" placeholder="Type the example above at a comfortable pace."></textarea><div class="writing-practice-status"><span id="writingPracticeProgress">0 / ${task.target.length} characters</span><span id="writingPracticeFeedback" role="status" aria-live="polite">No timer—take your time and focus on accuracy.</span></div><div class="writing-practice-actions"><button class="btn" type="button" id="writingPracticeClear">Clear</button><button class="btn primary" type="button" id="writingPracticeComplete" disabled>Check practice</button></div>`;
  $$('[data-writing-task]').forEach(button=>button.onclick=()=>{writingTaskIndex=Number(button.dataset.writingTask);renderWritingStudio()});
  const input=$('#writingPracticeInput'),complete=$('#writingPracticeComplete');
  const updatePractice=()=>{
    const value=input.value;
    const exact=value===task.target;
    let matched=0;
    while(matched<value.length&&matched<task.target.length&&value[matched]===task.target[matched])matched++;
    $('#writingPracticeProgress').textContent=`${Math.min(value.length,task.target.length)} / ${task.target.length} characters`;
    $('#writingPracticeFeedback').textContent=exact?'Exactly right—ready to check your practice.':matched<value.length?'Check your text and keep going at your own pace.':'No timer—take your time and focus on accuracy.';
    complete.disabled=!exact;
  };
  input.addEventListener('input',updatePractice);
  $('#writingPracticeClear').onclick=()=>{input.value='';updatePractice();input.focus()};
  complete.onclick=()=>{
    if(input.value!==task.target)return;
    const completed=load('writingTaskProgress',[]);
    const key=`${writingMode}-${taskIndex}`;
    if(!completed.includes(key)){completed.push(key);save('writingTaskProgress',completed)}
    $('#writingPracticeFeedback').textContent='Practice complete! You can choose another exercise or repeat this one.';
    complete.disabled=true;
    const taskButton=$(`[data-writing-task="${taskIndex}"]`);
    if(taskButton){taskButton.classList.add('complete');taskButton.textContent=`✓ ${task.name}`}
  };
}
let activeLessonKeydown=null,activeLessonKeyup=null;
function renderLessons(){
  if(activeLessonKeydown)document.removeEventListener('keydown',activeLessonKeydown);
  if(activeLessonKeyup)document.removeEventListener('keyup',activeLessonKeyup);
  activeLessonKeydown=null;activeLessonKeyup=null;
  $('#xpPill').textContent='⭐ '+xp+' XP';
  const completed=load('completedLessons',[]);
  let activeLesson=lessonData[selectedLesson]||lessonData[0];
  if(!isGradeUnlocked(activeLesson.grade,completed)){
    const firstGrade=gradeNumbers.find(grade=>isGradeUnlocked(grade,completed))||1;
    selectedLesson=firstIncompleteLesson(firstGrade,'Basic',completed);
    activeLesson=lessonData[selectedLesson];
    selectedLessonStage=0;
    lessonView='guide';
  }
  if(!isTrackUnlocked(activeLesson.grade,activeLesson.track,completed)){
    selectedLesson=firstIncompleteLesson(activeLesson.grade,'Basic',completed);
    activeLesson=lessonData[selectedLesson];
    selectedLessonStage=0;
    lessonView='guide';
  }
  if(!isLessonUnlocked(selectedLesson,completed)){
    selectedLesson=firstIncompleteLesson(activeLesson.grade,activeLesson.track,completed);
    activeLesson=lessonData[selectedLesson];
    selectedLessonStage=0;
    lessonView='guide';
  }
  if(lessonAccuracy.lessonIndex!==selectedLesson)lessonAccuracy={lessonIndex:selectedLesson,attempts:0,correct:0,startedAt:0};
  if(completed.includes(selectedLesson)){selectedLessonStage=0;lessonView='guide'}
  saveResumeState(selectedLesson, selectedLessonStage);
  const stageTabs=buildLessonStages(activeLesson);
  const stage=stageTabs[Math.min(selectedLessonStage, stageTabs.length - 1)];
  const coach=getThemeCoach();
  const stageKey=stage.prompt.match(/[a-z]/i)?.[0]?.toLowerCase()||'';
  const lessonPhases=[
    {id:'learn',label:'Learn',hint:'See the skill and finger technique.'},
    {id:'practice',label:'Practice',hint:'Build control with keys and words.'},
    {id:'apply',label:'Apply',hint:'Use the skill in real text.'},
    {id:'challenge',label:'Challenge',hint:'Check fluency and review.'}
  ];
  const activePhaseIndex=lessonPhases.findIndex(phase=>phase.id===stage.phase);
  const lessonPathMarkup=`<ol class="lesson-learning-path" aria-label="Lesson learning path">${lessonPhases.map((phase,index)=>`<li class="${index===activePhaseIndex?'current':index<activePhaseIndex?'complete':''}" ${index===activePhaseIndex?'aria-current="step"':''}><span>${index<activePhaseIndex?'✓':index+1}</span><b>${phase.label}</b></li>`).join('')}</ol><p class="lesson-phase-hint">${esc(lessonPhases[activePhaseIndex]?.hint||'Keep practicing one step at a time.')}</p>`;
  const fingerNames={'left-pinky':'left little finger','left-ring':'left ring finger','left-middle':'left middle finger','left-index':'left index finger','right-index':'right index finger','right-middle':'right middle finger','right-ring':'right ring finger','right-pinky':'right little finger'};
  const fingerInstruction=fingerNames[fingerMap[stageKey]]?`For ${stageKey.toUpperCase()}, use your ${fingerNames[fingerMap[stageKey]]}, then return to the home row.`:'Use the finger guide below, and return your fingers to the home row after each reach.';
  const lessonInstruction=`${coach.name} says: Objective: ${stage.label} — ${stage.explanation||activeLesson.focus} How to type it: ${stage.holdKey?stage.explanation:`${activeLesson.tip||activeLesson.focus} ${fingerInstruction}`}`;
  const coachTips=[
    lessonInstruction,
    `Key strategy: ${activeLesson.focus}. ${activeLesson.tip||'Use the matching finger, then bring it back to the home row.'}`,
    'Posture check: sit back with your feet supported, relax your shoulders, and keep your wrists level.',
    'Go slowly enough to stay accurate. Look a little ahead, use a light touch, and let speed grow with practice.'
  ];
  const lessonStars = getLessonStars(selectedLesson);
  const trackLessons=(lessonIndexesByTrack.get(`${activeLesson.grade}:${activeLesson.track}`)||[]).map(index=>({lesson:lessonData[index],index}));
  const unitMarkup=Array.from({length:10},(_,unitIndex)=>{
    const unitLessons=trackLessons.filter(item=>item.lesson.unitNumber===unitIndex+1);
    const unitDone=unitLessons.filter(item=>completed.includes(item.index)).length;
    const unitUnlocked=unitIndex===0||trackLessons.filter(item=>item.lesson.unitNumber<unitIndex+1).every(item=>completed.includes(item.index));
    const games=`<div class="unit-games"><b>Unit ${unitIndex+1} games</b><button type="button" class="btn small" data-unit-game="${activeLesson.grade}:${activeLesson.track}:${unitIndex+1}:sprint" ${unitUnlocked?'':'disabled'}>${unitUnlocked?'⚡':'🔒'} Key Sprint</button><button type="button" class="btn small" data-unit-game="${activeLesson.grade}:${activeLesson.track}:${unitIndex+1}:garden" ${unitUnlocked?'':'disabled'}>${unitUnlocked?'🌿':'🔒'} Word Garden</button>${unitUnlocked?'':'<small>Complete the previous unit to unlock these games.</small>'}</div>`;
    const lessonAndGameBreaks=unitLessons.map(({lesson,index},lessonPosition)=>{
      const locked=!isLessonUnlocked(index,completed);
      const lessonCard=`<button class="${index===selectedLesson?'selected':''}" data-li="${index}" ${locked?'disabled aria-disabled="true"':''}><b>${completed.includes(index)?'✓ ':locked?'🔒 ':''}${lesson.title}</b><small>Lesson ${lesson.unitLessonNumber} of 20${lesson.checkpoint?' · Checkpoint':''}</small></button>`;
      const gameMode=lesson.unitLessonNumber===5?'sprint':lesson.unitLessonNumber===15?'garden':null;
      if(!gameMode)return lessonCard;
      const gameUnlocked=unitLessons.slice(0,lessonPosition+1).every(item=>completed.includes(item.index));
      const gameName=gameMode==='sprint'?'Key Sprint':'Word Garden';
      const gameLabel=gameUnlocked?`🎮 Take a break: ${gameName}`:`🔒 ${gameName} unlocks after lesson ${lesson.unitLessonNumber}`;
      const gameButton=`<button type="button" class="unit-game-break" data-unit-game="${activeLesson.grade}:${activeLesson.track}:${unitIndex+1}:${gameMode}" ${gameUnlocked?'':'disabled aria-disabled="true"'}><span>${gameLabel}</span><small>${gameUnlocked?'Play a short game with this unit’s words.':'Finish this lesson to unlock an optional game break.'}</small></button>`;
      return lessonCard+gameButton;
    }).join('');
    return `<details class="lesson-unit" ${unitIndex===activeLesson.unitNumber-1?'open':''}><summary><span><b>Unit ${unitIndex+1} · ${unitLessons[0]?.lesson.title.split(': ')[0].replace(/^\d+ · /,'')||'Typing skills'}</b><small>${unitDone}/20 lessons · ${Math.round(unitDone/20*100)}% complete</small></span><i>${unitDone===20?'✓':'+'}</i></summary>${games}<div class="lesson-unit-list">${lessonAndGameBreaks}</div></details>`;
  }).join('');
  $('#lessonNav').innerHTML=`<div class="field"><label>GRADE</label><select id="lessonGradeFilter">${gradeNumbers.map(g=>`<option value="${g}" ${g===activeLesson.grade?'selected':''} ${isGradeUnlocked(g,completed)?'':'disabled'}>Grade ${g}${isGradeUnlocked(g,completed)?'':' 🔒'}</option>`).join('')}</select></div><div class="toolbar">${['Basic','Intermediate','Master'].map(track=>{const locked=!isTrackUnlocked(activeLesson.grade,track,completed);return `<button class="btn small ${activeLesson.track===track?'selected':''} ${locked?'locked':''}" data-track-filter="${track}" aria-disabled="${locked}">${trackLabel(track)}${locked?' 🔒':''}</button>`}).join('')}</div><div class="lesson-nav-summary"><b>${trackLabel(activeLesson.track)}: 200 lessons</b><span>10 units · 20 lessons each</span></div>${unitMarkup}`;
  $('#lessonGradeFilter').onchange=e=>{const grade=+e.target.value;if(!isGradeUnlocked(grade,completed)){toast('Complete the previous grade and its assessments first.');return}const nextTrack=isTrackUnlocked(grade,activeLesson.track,completed)?activeLesson.track:'Basic';selectedLesson=firstIncompleteLesson(grade,nextTrack,completed);selectedLessonStage=0;lessonView='guide';saveResumeState(selectedLesson, selectedLessonStage);renderLessons()};$$('[data-track-filter]').forEach(b=>b.onclick=()=>{if(!isTrackUnlocked(activeLesson.grade,b.dataset.trackFilter,completed)){const prerequisite=b.dataset.trackFilter==='Master'?'Intermediate':'Beginner';toast(`Finish all 200 ${prerequisite} lessons and its one-minute test in this grade to unlock ${trackLabel(b.dataset.trackFilter)}.`);return}selectedLesson=firstIncompleteLesson(activeLesson.grade,b.dataset.trackFilter,completed);selectedLessonStage=0;lessonView='guide';saveResumeState(selectedLesson, selectedLessonStage);renderLessons()});$$('[data-li]').forEach(b=>b.onclick=()=>{const index=+b.dataset.li;if(!isLessonUnlocked(index,completed)){toast('Complete the earlier lessons in this unit first.');return}selectedLesson=index;selectedLessonStage=0;lessonView='guide';saveResumeState(selectedLesson, selectedLessonStage);renderLessons()});
  const gradeLabel=gradeOrdinal(activeLesson.grade);
  const keyRows=['qwertyuiop','asdfghjkl;','zxcvbnm'];
  $('#lessonContent').innerHTML=`<div class="lesson-view-tabs" role="tablist" aria-label="Lesson screens"><button class="btn selected" type="button" role="tab" data-lesson-view="guide" aria-selected="${lessonView==='guide'}">🎯 Lesson guide</button><button class="btn" type="button" role="tab" data-lesson-view="typing" aria-selected="${lessonView==='typing'}">⌨️ Focus typing</button></div>
  <section class="lesson-guide-view" data-lesson-panel="guide" role="tabpanel" ${lessonView==='guide'?'':'hidden'}>
  <div class="lesson-topline"><div class="lesson-kicker">✦ ${gradeLabel.toUpperCase()} GRADE · ${trackLabel(activeLesson.track).toUpperCase()} PATH · UNIT ${activeLesson.unitNumber}/10</div><span class="lesson-status">${completed.includes(selectedLesson)?'✓ COMPLETED':'● UNIT LESSON '+activeLesson.unitLessonNumber+'/20'}</span></div>
  <h2 class="lesson-title">${activeLesson.title}</h2><p class="lesson-desc">${activeLesson.desc}</p>
  ${renderLessonStars(lessonStars)}
  <section class="mascot-coach" aria-label="${esc(coach.name)} lesson guide"><span class="mascot-face" aria-hidden="true">${esc(coach.emoji)}</span><div class="mascot-coach-content"><b>${esc(coach.name)} · Today’s objective and key tip</b><p id="lessonCoachMessage" aria-live="polite">${esc(coachTips[0])}</p><div class="mascot-coach-actions"><button class="btn small" id="lessonCoachNext" type="button">Another tip</button><button class="btn small" id="lessonCoachSpeak" type="button">🔊 Hear objective</button></div></div></section>
  <div class="lesson-stage-switch" aria-live="polite"><span>SCREEN ${selectedLessonStage+1} OF ${stageTabs.length}</span><b>${esc(stage.label)}</b></div>
  ${lessonPathMarkup}
  <div class="lesson-focus"><b>Stage focus:</b> ${esc(stage.explanation || activeLesson.focus)}</div>
  <div class="lesson-key-guide">${(stage.keyCards||[]).map(item=>typeof item === 'string' ? `<div class="lesson-key-card"><strong>✦</strong><span>${esc(item)}</span></div>` : `<div class="lesson-key-card"><strong>${esc(item.letter || 'Key')}</strong><span>${esc(item.tip || 'Typing tip')}</span></div>`).join('')}</div>
  ${stage.listenOnly?'<button class="btn small lesson-dictation-speak" id="lessonDictationSpeakGuide" type="button">🔊 Hear the phrase</button>':''}
  <button class="btn primary lesson-start-typing" type="button" data-lesson-view="typing">Start focused typing →</button>
  </section>
  <section class="lesson-typing-view" data-lesson-panel="typing" role="tabpanel" tabindex="-1" ${lessonView==='typing'?'':'hidden'} aria-label="Focused typing practice">
  <div class="typing-coach-reminder"><span class="mascot-face" aria-hidden="true">${esc(coach.emoji)}</span><div><b>${esc(coach.name)}’s objective</b><p>${esc(lessonInstruction)}</p></div><button class="btn small" id="lessonFocusSpeak" type="button" aria-label="Hear the lesson objective">🔊</button></div>
  <div class="lesson-stage-switch" aria-live="polite"><span>SCREEN ${selectedLessonStage+1} OF ${stageTabs.length}</span><b>${esc(stage.label)}</b></div>
  ${lessonPathMarkup}
  <section class="typing-focus-card" aria-label="Typing practice screen">
  <div class="lesson-prompt-label"><span>⌨️ TYPE WITH YOUR KEYBOARD</span><span id="lessonPromptCount">0 / ${stage.prompt.length}</span></div>
  ${stage.holdKey?`<div class="hold-key-instruction">Hold <kbd>${stage.holdKey.toUpperCase()}</kbd> down, then tap the highlighted key.</div>`:''}
  ${stage.listenOnly?'<div class="lesson-dictation-controls"><p>Listen first, then type the phrase from memory.</p><button class="btn small" id="lessonDictationSpeak" type="button">🔊 Hear the phrase</button></div>':''}
  <div class="lesson-progress-track"><span id="lessonProgressFill" style="width:0%"></span></div>
  <div class="practice-text typing-screen-prompt" id="lessonPrompt" aria-live="polite"></div>
  <p class="typing-screen-hint" id="lessonAutoStatus">Press the keys on your keyboard. Your next key will light up below.</p>
  </section>
  <div class="stats lesson-metrics"><div class="stat-card"><small>ACCURACY</small><strong id="lessonAccuracy">—</strong></div><div class="stat-card"><small>CHARACTERS</small><strong id="lessonChars">0</strong></div><div class="stat-card"><small>CHARACTERS / MIN</small><strong id="lessonCpm">0 <small>CPM</small></strong></div><div class="stat-card"><small>WORDS / MIN</small><strong id="lessonWpm">0 <small>WPM</small></strong></div></div><div class="lesson-focus" style="margin-top:10px"><b>Grade ${activeLesson.grade} recommended target:</b> ${gradeTargets[activeLesson.grade].wpm} WPM · ${gradeTargets[activeLesson.grade].cpm} CPM · ${gradeTargets[activeLesson.grade].accuracy} accuracy <span class="muted">(practice goal, not a pass/fail rule)</span></div>
  <div class="virtual-keyboard"><div class="keyboard-heading"><b>⌨️ Virtual keyboard</b><span>Blue underline = home row · Red = next key · colored keys = finger guide</span></div>${keyRows.map(row=>`<div class="vk-row">${row.split('').map(ch=>`<button class="vk-key ${fingerMap[ch.toLowerCase()] || ''} ${'asdfjkl;'.includes(ch)?'home-key':''}" data-vkey="${ch}" aria-label="Type ${ch}">${ch.toUpperCase()}</button>`).join('')}</div>`).join('')}<div class="vk-row"><button class="vk-key space-key" data-vkey=" ">SPACE</button></div></div>
  <div class="lesson-actions"><span class="muted">Finish this screen to unlock the next one.</span><button class="btn" id="clearLesson" type="button">↻ Try again</button></div>
  <div class="lesson-tip"><span>💡</span><div><b>Typing tip</b><br>Keep your wrists relaxed, return your fingers to the home row, and focus on accuracy before speed.</div></div>
  </section>`;
  const setLessonView=view=>{
    lessonView=view;
    $$('[data-lesson-panel]').forEach(panel=>panel.hidden=panel.dataset.lessonPanel!==view);
    $$('[data-lesson-view]').forEach(button=>{const selected=button.dataset.lessonView===view;button.classList.toggle('selected',selected);button.setAttribute('aria-selected',String(selected))});
    $('#page-lessons').classList.toggle('lesson-focus-mode',view==='typing');
    if(view==='typing'){
      const typingPanel=$('#lessonContent [data-lesson-panel="typing"]');
      $('#lessonContent .typing-focus-card').scrollIntoView({block:'center',behavior:'auto'});
      typingPanel.focus({preventScroll:true});
    }
  };
  $$('[data-lesson-view]').forEach(button=>button.onclick=()=>setLessonView(button.dataset.lessonView));
  let coachTipIndex=0;
  $('#lessonCoachNext').onclick=()=>{
    coachTipIndex=(coachTipIndex+1)%coachTips.length;
    $('#lessonCoachMessage').textContent=coachTips[coachTipIndex];
  };
  const speakLessonText=(text,rate=.94)=>{
    if(!('speechSynthesis' in window)||typeof window.SpeechSynthesisUtterance!=='function'){
      toast('Audio guidance is not available in this browser.');
      return;
    }
    const speech=new window.SpeechSynthesisUtterance(text);
    const voices=window.speechSynthesis.getVoices();
    const englishVoices=voices.filter(voice=>voice.lang.toLowerCase().startsWith('en'));
    speech.voice=englishVoices.find(voice=>/natural|neural|premium|enhanced/i.test(voice.name))||englishVoices[0]||voices[0]||null;
    speech.rate=rate;
    speech.pitch=1;
    speech.volume=1;
    window.speechSynthesis.cancel();
    if(!voices.length)toast('Using your device’s default speech voice. Voice options depend on your browser and device.');
    window.speechSynthesis.speak(speech);
  };
  $('#lessonCoachSpeak').onclick=()=>speakLessonText($('#lessonCoachMessage').textContent);
  if(stage.listenOnly){
    $('#lessonDictationSpeak')?.addEventListener('click',()=>speakLessonText(stage.prompt,.65));
    $('#lessonDictationSpeakGuide')?.addEventListener('click',()=>speakLessonText(stage.prompt,.65));
  }
  $('#lessonFocusSpeak').onclick=()=>$('#lessonCoachSpeak').click();
  window.speechSynthesis?.cancel();
  const prompt=$('#lessonPrompt');
  let lessonBuffer='',lessonFinished=false;
  const heldKeys=new Set();
  function recordLessonAttempt(correct){
    if(!lessonAccuracy.startedAt)lessonAccuracy.startedAt=Date.now();
    lessonAccuracy.attempts++;
    if(correct)lessonAccuracy.correct++;
  }
  function paint(){
    let html='';
    if(stage.listenOnly)html=`<span class="lesson-listen-prompt">${lessonBuffer.length?'Keep typing from memory…':'Press “Hear the phrase,” then type from memory.'}</span>`;
    else for(let i=0;i<stage.prompt.length;i++){
      const ch=stage.prompt[i],typed=lessonBuffer[i];
      let cls='char';
      if(typed!==undefined){if(typed===ch)cls+=' done';else cls+=' missed'}
      else if(i===lessonBuffer.length)cls+=' current';
      html+=`<span class="${cls}${ch===' '?' lesson-space-marker':''}"${ch===' '?' aria-label="Space" title="Space"':''}>${ch===' '?'SP':esc(ch)}</span>`;
    }
    prompt.innerHTML=html;
    $('#lessonChars').textContent=lessonBuffer.length;
    $('#lessonPromptCount').textContent=`${Math.min(lessonBuffer.length,stage.prompt.length)} / ${stage.prompt.length}`;
    $('#lessonAccuracy').textContent=lessonAccuracy.attempts?Math.round(lessonAccuracy.correct/lessonAccuracy.attempts*100)+'%':'—';
    const elapsedMinutes=lessonAccuracy.startedAt?Math.max((Date.now()-lessonAccuracy.startedAt)/60000,1/60):0;
    const cpm=elapsedMinutes?Math.round(lessonAccuracy.correct/elapsedMinutes):0,wpm=elapsedMinutes?Math.round((lessonAccuracy.correct/5)/elapsedMinutes):0;
    $('#lessonCpm').innerHTML=cpm+' <small>CPM</small>';
    $('#lessonWpm').innerHTML=wpm+' <small>WPM</small>';
    $('#lessonProgressFill').style.width=Math.min(100,lessonBuffer.length/stage.prompt.length*100)+'%';
    const nextKey=stage.prompt[lessonBuffer.length]?.toLowerCase();
    $$('.vk-key').forEach(button=>{
      const keyValue=(button.dataset.vkey||'').toLowerCase();
      button.classList.toggle('next-key',keyValue===nextKey);
      button.classList.toggle('held-key',heldKeys.has(keyValue));
      button.classList.toggle('home-key',keyValue&&'asdfjkl;'.includes(keyValue));
      const finger=fingerMap[keyValue]||'';
      if(finger)button.classList.add(finger);
      else button.classList.remove('left-pinky','left-ring','left-middle','left-index','right-index','right-middle','right-ring','right-pinky','space');
    });
    if(!lessonFinished&&lessonBuffer.length>=stage.prompt.length)finishLessonScreen();
  }
  function typeLessonKey(key){
    if(lessonFinished)return;
    if(stage.holdKey&&key.toLowerCase()===stage.holdKey){heldKeys.add(stage.holdKey);paint();return}
    if(stage.holdKey&&!heldKeys.has(stage.holdKey)){
      recordLessonAttempt(false);
      $('#lessonAccuracy').textContent=Math.round(lessonAccuracy.correct/lessonAccuracy.attempts*100)+'%';
      $('#lessonAutoStatus').textContent=`Hold ${stage.holdKey.toUpperCase()} down before typing ${stage.prompt[lessonBuffer.length]?.toUpperCase()||'the next key'}.`;
      return;
    }
    if(lessonBuffer.length<stage.prompt.length){
      if(key!==stage.prompt[lessonBuffer.length]){recordLessonAttempt(false);$('#lessonAccuracy').textContent=Math.round(lessonAccuracy.correct/lessonAccuracy.attempts*100)+'%';$('#lessonAutoStatus').textContent='Not that key yet — follow the highlighted key and try again.';return}
      recordLessonAttempt(true);lessonBuffer+=key;$('#lessonAutoStatus').textContent='Keep your eyes on the highlighted key.';paint()
    }
  }
  function finishLessonScreen(){
    lessonFinished=true;
    if(selectedLessonStage<stageTabs.length-1){
      $('#lessonAutoStatus').textContent='Screen complete! Get ready for the next typing challenge.';
      setTimeout(()=>{selectedLessonStage++;lessonView='guide';saveResumeState(selectedLesson,selectedLessonStage);renderLessons()},650);
    }else completeLessonAutomatically();
  }
  async function completeLessonAutomatically(){
    let done=load('completedLessons',[]),wasDone=done.includes(selectedLesson);
    const finalElapsed=Math.max((Date.now()-(lessonAccuracy.startedAt||Date.now()))/60000,1/60);const finalCorrect=lessonAccuracy.correct;const finalAccuracy=lessonAccuracy.attempts?Math.round(finalCorrect/lessonAccuracy.attempts*100):100,finalCpm=Math.round(finalCorrect/finalElapsed),finalWpm=Math.round((finalCorrect/5)/finalElapsed);
    let bonusStars = 1;
    if (finalAccuracy >= 98 && finalWpm >= 18) bonusStars = 3;
    else if (finalAccuracy >= 90 || finalWpm >= 10) bonusStars = 2;
    if(!wasDone){done.push(selectedLesson);save('completedLessons',done);setLessonStars(selectedLesson, bonusStars);xp+=25;updateDailyGoalProgress(25);recordPracticeActivity('lesson',{xp:25});if(user){user.xp=xp;user.grade=Math.max(user.grade||1,activeLesson.grade)}persist()} else { setLessonStars(selectedLesson, Math.max(getLessonStars(selectedLesson), bonusStars)); }
    const coachingTip=finalAccuracy>=98?'Excellent accuracy! Keep the same relaxed finger movements.':finalAccuracy>=90?'Good effort! Next time, watch the highlighted keys and aim for a few more correct characters.':'Keep practicing slowly. Look at the target letters, use the suggested fingers, and focus on accuracy before speed.';$('#lessonAutoStatus').textContent=`🎉 Lesson complete! ${finalWpm} WPM · ${finalCpm} CPM · ${finalAccuracy}% accuracy. Tip: ${coachingTip}`;toast(wasDone?`Lesson complete: ${finalWpm} WPM · ${finalAccuracy}% accuracy`:`Lesson complete! ${finalWpm} WPM · ${finalAccuracy}% accuracy · +25 XP 🌟`);
    renderHomeLevels();renderCurriculumPath();renderProgressCard();renderLessons();
    if(user&&supabaseReady){const {data,error}=await supabaseClient.rpc('complete_typing_lesson',{p_grade:activeLesson.grade,p_track:activeLesson.track,p_lesson_key:activeLesson.lessonKey});if(error)toast('Saved on this device; cloud sync issue: '+error.message);else await refreshRemoteData()}
    if(activeLesson.checkpoint){setTimeout(()=>{const checkpointCoach=getThemeCoach();modal('🎮 '+activeLesson.theme+' checkpoint!',`<div class="game-art" style="font-size:46px">${esc(checkpointCoach.emoji)}</div><h3>${esc(checkpointCoach.name)} says: mission complete!</h3><p>You finished the ${trackLabel(activeLesson.track)} unit ${activeLesson.unitNumber}, lesson ${activeLesson.unitLessonNumber} of 20. Time for your checkpoint game!</p><p class="muted">Play a 30-second typing game to celebrate your progress.</p><button class="btn primary" id="checkpointPlay">Play checkpoint game</button> <button class="btn" id="checkpointLater">Not now</button>`);$('#checkpointPlay').onclick=()=>{closeModal();checkpointGameActive=true;startGame(['rocket','bubble','dragon','rain','wizard','turbo'][(activeLesson.grade-1)%6],true)};$('#checkpointLater').onclick=()=>{closeModal();advanceLesson()};},350)}else setTimeout(advanceLesson,3500);
  }
  function advanceLesson(){
    if(activeLesson.lessonNumber===200&&!completedTrackAssessments.has(`${activeLesson.grade}-${activeLesson.track}`)){
      modal('🏁 Level complete!',`<h3>You finished all 200 ${trackLabel(activeLesson.track)} lessons for Grade ${activeLesson.grade}!</h3><p>Take the required one-minute typing test to check your accuracy and speed.</p><button class="btn primary" id="trackFinalTest">Start 1-minute test</button>`);
      $('#trackFinalTest').onclick=()=>{closeModal();pendingTrackAssessment={grade:activeLesson.grade,track:activeLesson.track};testRequiresFullDuration=true;testDuration=60;$$('[data-duration]').forEach(button=>button.classList.toggle('selected',Number(button.dataset.duration)===60));resetTest();go('tests')};
      return;
    }
    const nextIndex=firstIncompleteLesson(activeLesson.grade,activeLesson.track,load('completedLessons',[]));
    if(nextIndex!==selectedLesson){selectedLesson=nextIndex;selectedLessonStage=0;lessonView='guide';saveResumeState(selectedLesson, selectedLessonStage);renderLessons()}
    else toast('You completed all 200 lessons in this track! Take the required assessment to unlock the next track.');
  }
  activeLessonKeydown=event=>{
    if(!$('#page-lessons').classList.contains('active')||$('#modalBackdrop').classList.contains('open')||event.ctrlKey||event.metaKey||event.altKey||event.target.closest('input,textarea,select'))return;
    if(lessonView!=='typing')return;
    const key=event.key;
    if(key==='Backspace'){event.preventDefault();lessonBuffer=lessonBuffer.slice(0,-1);paint();return}
    if(key.length!==1)return;
    event.preventDefault();
    if(stage.holdKey&&key.toLowerCase()===stage.holdKey){heldKeys.add(stage.holdKey);paint();return}
    typeLessonKey(key);
  };
  activeLessonKeyup=event=>{
    if(lessonView!=='typing')return;
    const key=event.key.toLowerCase();
    if(heldKeys.delete(key))paint();
  };
  document.addEventListener('keydown',activeLessonKeydown);
  document.addEventListener('keyup',activeLessonKeyup);
  paint();
  $$('[data-vkey]').forEach(button=>button.onclick=()=>{
    const key=button.dataset.vkey;
    if(stage.holdKey&&key.toLowerCase()===stage.holdKey){
      if(heldKeys.has(stage.holdKey))heldKeys.delete(stage.holdKey);else heldKeys.add(stage.holdKey);
      paint();return;
    }
    typeLessonKey(key===' '? ' ':stage.prompt[lessonBuffer.length]?.toLowerCase()===key.toLowerCase()?stage.prompt[lessonBuffer.length]:key);
  });
  $('#clearLesson').onclick=()=>{if(lessonFinished)return;lessonBuffer='';heldKeys.clear();$('#lessonAutoStatus').textContent=stage.holdKey?`Hold ${stage.holdKey.toUpperCase()} down, then tap the highlighted key.`:'Press the keys on your keyboard. Your next key will light up below.';paint()};
  $$('[data-writing-mode]').forEach(button=>button.onclick=()=>{
    writingMode=button.dataset.writingMode==='lessons'?null:button.dataset.writingMode;
    writingTaskIndex=0;
    renderWritingStudio();
  });
  renderWritingStudio();
}
let testMode = 'warmup';

function generateTestPrompt(){
  const warmups = [
    'Type calm and steady. Keep your fingers on the home row and trust your rhythm.',
    'Every small practice session builds stronger typing hands and better focus.',
    'Begin slowly, keep your eyes ahead, and finish with confident keystrokes.'
  ];
  const sentenceSet = [
    'Typing helps us share ideas with the world. Practice a little every day, focus on accuracy, and speed will follow. Great typists stay relaxed and keep a steady rhythm.',
    'The quick fox jumps over the quiet lake. Each small step helps a brave learner build stronger habits and more confidence.',
    'Writers, coders, and scientists all use keyboard skills every day. Strong practice habits turn small progress into bigger results.'
  ];
  const challengeSet = [
    'Quick hands, calm focus, and steady rhythm create strong typing skills for every challenge ahead.',
    'Travel to the next level by keeping a smooth flow, accurate spacing, and a steady pace.',
    'Type with purpose, watch the next word, and finish each sentence with confident control.'
  ];
  const dictationSet = [
    'Practice every day and your fingers will grow stronger. Keep your eyes on the text and return to a steady rhythm.',
    'The best typists stay relaxed, look ahead, and finish short bursts with accurate, calm motions.',
    'A steady pace often wins more than a rushed effort. Finish the sentence, keep spacing correct, and trust your rhythm.'
  ];
  const pool = testMode === 'warmup' ? warmups : testMode === 'sentence' ? sentenceSet : testMode === 'challenge' ? challengeSet : dictationSet;
  return pool[Math.floor(Math.random()*pool.length)];
}

function setTestMode(mode){
  testMode = mode;
  dictationEnabled = mode === 'dictation';
  const toggle = $('#testDictationToggle');
  if (toggle) toggle.checked = dictationEnabled;
  $$('.btn[data-test-mode]').forEach(btn => btn.classList.toggle('selected', btn.dataset.testMode === mode));
  $('#testModeLabel').textContent = mode === 'warmup' ? 'Warm-up' : mode === 'sentence' ? 'Sentence' : mode === 'challenge' ? 'Challenge' : 'Dictation';
  $('#testGoal').textContent = mode === 'challenge' ? '40 WPM' : mode === 'dictation' ? '30 WPM' : '25 WPM';
  resetTest();
}

function resetTest(){
  clearInterval(testTimer);
  testStarted=false;testDone=false;testStart=0;
  testPreviousValue='';testMistakes=0;
  $('#testPrompt').textContent=generateTestPrompt();
  $('#timeLeft').textContent=testDuration+'s';
  $('#testWpm').innerHTML='0 <small>WPM</small>';
  $('#testCpm').innerHTML='0 <small>CPM</small>';
  $('#testAccuracy').textContent='100%';
  $('#testXp').textContent='+0';
  $('#testInput').value='';
  $('#testInput').disabled=false;
  $('#testMessage').textContent = dictationEnabled ? 'Dictation mode is on. Type the sentence clearly and keep a calm pace.' : testMode === 'challenge' ? 'Challenge mode: keep a strong pace while staying accurate.' : 'Your timer starts when you type the first character.';
  $('#testBestStreak').textContent = '0';
  $('#finishTest').disabled=testRequiresFullDuration;
}
$$('[data-duration]').forEach(b=>b.onclick=()=>{if(testRequiresFullDuration&&Number(b.dataset.duration)!==60){toast('This assigned test must be completed for one full minute.');return}testDuration=+b.dataset.duration;$$('[data-duration]').forEach(x=>x.classList.toggle('selected',x===b));resetTest()});
$$('[data-test-mode]').forEach(b=>b.onclick=()=>setTestMode(b.dataset.testMode));
$('#testDictationToggle').onchange = function(){ dictationEnabled = this.checked; if (dictationEnabled) setTestMode('dictation'); else setTestMode(testMode === 'dictation' ? 'warmup' : testMode); };
function trackTestInput(val,txt){
  let prefix=0;
  while(prefix<testPreviousValue.length&&prefix<val.length&&testPreviousValue[prefix]===val[prefix])prefix++;
  let suffix=0;
  while(suffix<testPreviousValue.length-prefix&&suffix<val.length-prefix&&testPreviousValue[testPreviousValue.length-1-suffix]===val[val.length-1-suffix])suffix++;
  const inserted=val.slice(prefix,val.length-suffix);
  for(let i=0;i<inserted.length;i++)if(inserted[i]!==txt[prefix+i])testMistakes++;
  testPreviousValue=val;
}
function updateTest(){let val=$('#testInput').value,txt=$('#testPrompt').textContent,correct=0;for(let i=0;i<Math.min(val.length,txt.length);i++)if(val[i]===txt[i])correct++;let elapsed=testStarted?Math.max(1,(Date.now()-testStart)/1000):0;const cpm=elapsed?Math.round(correct/(elapsed/60)):0,attempted=val.length+testMistakes;$('#testCpm').innerHTML=cpm+' <small>CPM</small>';$('#testWpm').innerHTML=Math.round(cpm/5)+' <small>WPM</small>';$('#testAccuracy').textContent=(attempted?Math.round(correct/attempted*100):100)+'%';if(testStarted)$('#timeLeft').textContent=Math.max(0,Math.ceil(testDuration-elapsed))+'s';if(testStarted&&elapsed>=testDuration)finishTest()}
$('#testInput').addEventListener('input',()=>{if(testDone)return;trackTestInput($('#testInput').value,$('#testPrompt').textContent);if(!testStarted){testStarted=true;testStart=Date.now();testTimer=setInterval(updateTest,250)}updateTest()});
function demoPeople(){let base=[{name:'Skyler',xp:1280,gamePoints:950},{name:'Jordan',xp:1040,gamePoints:820},{name:'Taylor',xp:875,gamePoints:780},{name:'Riley',xp:710,gamePoints:600},{name:'Casey',xp:530,gamePoints:420}];if(user)base.push({name:user.name,xp,gamePoints});return base}
function rowsBoard(list,field){list.sort((a,b)=>(b[field]||0)-(a[field]||0));return list.map((p,i)=>`<div class="leader-row"><div class="rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${['🥇','🥈','🥉'][i]||('#'+(i+1))}</div><div class="person"><b>${esc(p.name)}${user&&p.name===user.name?' (you)':''}</b><small>${i===0?'Top typist':i===1?'Rising star':i===2?'Great progress':'Keep it up!'}</small></div><div class="points">${p[field]||0} pts</div></div>`).join('')}
$$('[data-board]').forEach(b=>b.onclick=()=>{boardMode=b.dataset.board;$$('[data-board]').forEach(x=>x.classList.toggle('selected',x===b));renderLeaderboard()});
function renderAssignments(){
  if(!$('#assignmentsList')) return;
  $('#assignmentsList').innerHTML='<div class="empty">Assignments and feedback are posted inside each classroom so teachers can manage them for the right students.</div>';
}
function renderClasses(){let mine=classes.filter(c=>classRole==='teacher'?user&&c.teacherId===user.id:true);$('#classesList').innerHTML=mine.length?mine.map(c=>`<div class="class-card"><div class="eyebrow">CLASSROOM · ${esc(c.code)}</div><h3>${esc(c.name)}</h3><div class="class-meta">Teacher: ${esc(c.teacherName)} · Grade ${c.grade} · ${trackLabel(c.track||'Basic')} · ${c.members.length} students</div><p class="muted">${esc(c.description||'A place to practice, play, and grow together.')}</p><div class="class-actions"><button class="btn small" onclick="requestJoin('${c.id}')">Request to join</button><button class="btn small" onclick="viewClass('${c.id}')">Open class</button>${user&&c.teacherId===user.id?`<button class="btn small" onclick="editClass('${c.id}')">Manage</button><button class="btn small" onclick="deleteClass('${c.id}')">Delete</button>`:''}</div></div>`).join(''):'<div class="empty" style="grid-column:1/-1">No classes to show yet. Teachers can create a class; students can request to join with a class code.</div>';let cl=classes.find(c=>user&&c.members.includes(user.id));let list=cl?cl.members.map(id=>users.find(u=>u.id===id)).filter(Boolean).map(u=>({name:u.name,xp:u.xp||0})):[];$('#classLeaderboard').innerHTML=list.length?rowsBoard(list,'xp'):'<div class="empty">Join a class and start earning points to appear here.</div>';renderAssignments();}
$('#createAssignmentBtn').onclick=()=>{if(!ensureUser())return;if(user.role!=='teacher'){toast('Only classroom teachers can post assignments.');return}const ownClasses=classes.filter(item=>item.teacherId===user.id);if(!ownClasses.length){toast('Create a classroom before posting assignments.');return}modal('Choose a classroom',`<p>Select a class to open its assignment and comment tools.</p><div class="field"><label>CLASSROOM</label><select id="assignmentClassChoice">${ownClasses.map(item=>`<option value="${escSafe(item.id)}">${escSafe(item.name)} · Grade ${item.grade}</option>`).join('')}</select></div><button class="btn primary" id="openAssignmentClass">Open classroom</button>`);$('#openAssignmentClass').onclick=()=>{const id=$('#assignmentClassChoice').value;closeModal();viewClass(id)}};
$$('[data-role]').forEach(b=>b.onclick=()=>{classRole=b.dataset.role;$$('[data-role]').forEach(x=>x.classList.toggle('selected',x===b));if(classRole==='teacher'&&(!user||user.role!=='teacher'))toast('Create or sign in to a teacher demo account to manage classes.');renderClasses()});
$('#createClassBtn').onclick=()=>{if(!ensureUser())return;if(user.role!=='teacher'){toast('Switch to a teacher account to create a class.');accountForm('signup');return}modal('Create a classroom',`<form id="classForm"><div class="field"><label>CLASS NAME</label><input name="name" required placeholder="e.g. Room 12 Typing Club"></div><div class="form-grid"><div class="field"><label>GRADE LEVEL</label><select name="grade">${gradeNumbers.map(g=>`<option value="${g}">${gradeOrdinal(g)} grade</option>`).join('')}</select></div><div class="field"><label>STARTING TRACK</label><select name="track"><option value="Basic">Beginner</option><option value="Intermediate">Intermediate</option><option value="Master">Master</option></select></div></div><div class="field"><label>DESCRIPTION (OPTIONAL)</label><input name="desc" placeholder="Let's build our typing skills!"></div><button class="btn primary" type="submit" style="width:100%">Create class & generate code</button></form>`);$('#classForm').onsubmit=e=>{e.preventDefault();let f=new FormData(e.target),c={id:Date.now().toString(36),name:f.get('name'),grade:+f.get('grade'),track:f.get('track'),description:f.get('desc'),teacherId:user.id,teacherName:user.name,code:Math.random().toString(36).slice(2,7).toUpperCase(),members:[user.id],requests:[],gameRestrictions:[]};classes.push(c);if(!user.joined)user.joined=[];user.joined.push(c.id);users=users.filter(u=>u.id!==user.id);users.push(user);persist();closeModal();renderClasses();toast('Class created! Code: '+c.code)}};
$('#joinClassBtn').onclick=()=>{if(!ensureUser())return;modal('Join a class',`<form id="joinForm"><div class="field"><label>CLASS CODE</label><input name="code" required placeholder="e.g. A7B2Q" style="text-transform:uppercase"></div><p class="muted">Your teacher must approve your request before you join.</p><button class="btn primary" type="submit" style="width:100%">Request permission</button></form>`);$('#joinForm').onsubmit=e=>{e.preventDefault();let code=new FormData(e.target).get('code').trim().toUpperCase(),c=classes.find(c=>c.code===code);if(!c){toast('We could not find that class code.');return}requestJoin(c.id);closeModal()}};
function requestJoin(id){if(!ensureUser())return;let c=classes.find(c=>c.id===id);if(!c)return;if(c.members.includes(user.id)){toast('You are already in this class.');return}if(!c.requests.includes(user.id))c.requests.push(user.id);persist();toast('Join request sent to '+c.teacherName+'!');if(user.role==='teacher'&&c.teacherId===user.id)viewClass(id)}
function viewClass(id){let c=classes.find(c=>c.id===id);if(!c)return;let isTeacher=user&&c.teacherId===user.id;modal(c.name,`<div class="eyebrow">CLASS CODE · ${c.code}</div><p class="muted">Grade ${c.grade} · ${trackLabel(c.track||'Basic')} track · Teacher ${esc(c.teacherName)}</p><h3>Students (${c.members.length})</h3><div>${c.members.map(id=>{let u=users.find(x=>x.id===id);return u?`<div class="leader-row"><div class="person"><b>${esc(u.name)}</b><small>${u.id===c.teacherId?'Teacher':'Student'}</small></div><div class="points">${u.xp||0} XP</div>${isTeacher&&u.id!==c.teacherId?`<button class="btn small" onclick="removeStudent('${c.id}','${u.id}')">Remove</button>`:''}</div>`:''}).join('')}</div>${isTeacher?`<h3 style="margin-top:20px">Join requests (${c.requests.length})</h3>${c.requests.length?c.requests.map(id=>{let u=users.find(x=>x.id===id);return u?`<div class="leader-row"><div class="person"><b>${esc(u.name)}</b><small>Waiting for permission</small></div><button class="btn small primary" onclick="approveJoin('${c.id}','${u.id}')">Approve</button><button class="btn small" onclick="denyJoin('${c.id}','${u.id}')">Deny</button></div>`:''}).join(''):'<p class="muted">No pending requests.</p>'}<div class="field" style="margin-top:16px"><label>MOVE CLASS TO NEXT TRACK</label><select id="nextTrack"><option value="Basic" ${c.track==='Basic'?'selected':''}>Beginner</option><option value="Intermediate" ${c.track==='Intermediate'?'selected':''}>Advanced</option><option value="Master" ${c.track==='Master'?'selected':''}>Master</option></select></div><h3 style="margin-top:20px">Game access</h3><div class="field" style="margin-top:8px">${Object.entries(gameCatalog).map(([key,game])=>`<label class="checkbox-row" style="display:flex;align-items:center;gap:8px;margin:8px 0"><input type="checkbox" data-class-game-toggle value="${key}" ${((c.gameRestrictions||[]).includes(key)?'':'checked')}> <span>${game.emoji} ${game.name}</span></label>`).join('')}</div><button class="btn blue" id="saveTrack">Save class track</button><button class="btn" id="saveGameRestrictions" style="margin-top:10px">Save game permissions</button>`:''}`);if(isTeacher){$('#saveTrack').onclick=()=>{c.track=$('#nextTrack').value;persist();closeModal();renderClasses();toast('Class track updated to '+trackLabel(c.track))};$('#saveGameRestrictions').onclick=()=>{const selected=[...document.querySelectorAll('[data-class-game-toggle]')].filter(input=>!input.checked).map(input=>input.value);c.gameRestrictions=selected;persist();renderClasses();toast('Game restrictions updated.');closeModal();}}}
function approveJoin(cid,uid){let c=classes.find(c=>c.id===cid),u=users.find(u=>u.id===uid);if(!c||!u||!user||c.teacherId!==user.id)return;c.requests=c.requests.filter(id=>id!==uid);if(!c.members.includes(uid))c.members.push(uid);u.joined=u.joined||[];if(!u.joined.includes(cid))u.joined.push(cid);persist();viewClass(cid);renderClasses();toast(u.name+' joined the class!')}
function denyJoin(cid,uid){let c=classes.find(c=>c.id===cid);if(!c||!user||c.teacherId!==user.id)return;c.requests=c.requests.filter(id=>id!==uid);persist();viewClass(cid);toast('Request declined.')}
function removeStudent(cid,uid){let c=classes.find(c=>c.id===cid);if(!c||!user||c.teacherId!==user.id)return;c.members=c.members.filter(id=>id!==uid);persist();viewClass(cid);renderClasses();toast('Student removed from class.')}
function editClass(id){viewClass(id)}
function deleteClass(id){let c=classes.find(c=>c.id===id);if(!c||!user||c.teacherId!==user.id)return;if(confirm('Delete '+c.name+'? This removes this class and its membership.')){classes=classes.filter(x=>x.id!==id);persist();renderClasses();toast('Class deleted.')}}
function renderClassChat(classId){return `
  <div class="panel" style="margin-top:18px;padding:16px">
    <div class="section-head" style="margin:0 0 10px"><div><h3 style="margin:0">💬 Class chat</h3><p style="margin:4px 0 0">Share updates, goals, and quick feedback with approved class members.</p></div><button class="btn small" id="refreshClassChat" data-class-id="${esc(classId)}">Refresh</button></div>
    <div id="classChatMessages" class="chat-thread" aria-live="polite" style="display:grid;gap:10px;max-height:240px;overflow:auto;padding-right:4px"><div class="empty">Loading class chat…</div></div>
    <div class="field" style="margin-top:12px">
      <label for="classChatInput">MESSAGE</label>
      <textarea id="classChatInput" rows="3" maxlength="300" placeholder="Share a quick update or question..."></textarea>
    </div>
    <div class="class-actions"><button class="btn primary" id="sendClassChatBtn" data-class-id="${esc(classId)}">Send to class</button></div>
    <p class="muted" style="font-size:12px;margin:10px 0 0">Atomic PSD logs blocked unauthorized access. Up to six messages in 30 seconds and repeated messages are allowed.</p>
  </div>
`;} 
// ---- Supabase-backed production data layer (overrides demo-only data handlers) ----
let remoteProfiles = [];
let completedRemoteKeys = new Set();
function escSafe(v){return esc(String(v??''))}
function requireConfigured(){if(!supabaseReady){toast('Connect Supabase in config.js first.');return false}return true}
async function refreshRemoteData(){
  if(!user || !supabaseClient) return;
  try {
    const canReadClassroomData=user.role!=='admin';
    const [classRes, memberRes, profileRes, progressRes, assessmentRes] = await Promise.all([
      canReadClassroomData?supabaseClient.from('classrooms').select('*').order('created_at',{ascending:false}):Promise.resolve({data:[],error:null}),
      canReadClassroomData?supabaseClient.from('class_memberships').select('classroom_id,student_id,status,requested_at,profiles:profiles!class_memberships_student_id_fkey(id,display_name,role,grade,xp,game_points)'):Promise.resolve({data:[],error:null}),
      supabaseClient.from('profiles').select('id,display_name,role,grade,xp,game_points').order('xp',{ascending:false}),
      supabaseClient.from('lesson_progress').select('lesson_key,grade,track').eq('student_id',user.id),
      supabaseClient.from('track_assessments').select('grade,track').eq('student_id',user.id)
    ]);
    if(classRes.error) throw classRes.error;
    if(memberRes.error) throw memberRes.error;
    if(profileRes.error) throw profileRes.error;
    if(progressRes.error) throw progressRes.error;
    if(assessmentRes.error) throw assessmentRes.error;
    remoteProfiles=(profileRes.data||[]).map(p=>({id:p.id,name:p.display_name,role:p.role,grade:p.grade||1,xp:p.xp||0,gamePoints:p.game_points||0}));
    users=remoteProfiles;
    classes=(classRes.data||[]).map(c=>{
      const memberships=(memberRes.data||[]).filter(m=>m.classroom_id===c.id);
      const members=memberships.filter(m=>m.status==='approved').map(m=>m.student_id);
      if(!members.includes(c.teacher_id)) members.unshift(c.teacher_id);
      return {id:c.id,name:c.name,grade:c.grade,track:c.track,description:c.description,studentChatEnabled:c.student_chat_enabled===true,studentCommentsEnabled:c.student_comments_enabled!==false,teacherId:c.teacher_id,teacherName:remoteProfiles.find(p=>p.id===c.teacher_id)?.name||'Teacher',code:c.code,members,requests:memberships.filter(m=>m.status==='pending').map(m=>m.student_id),membershipRows:memberships};
    });
    completedRemoteKeys=new Set((progressRes.data||[]).map(x=>String(x.lesson_key || '')));
    completedTrackAssessments=new Set((assessmentRes.data||[]).map(item=>`${item.grade}-${item.track}`));
    const completedIndexes = normalizeLessonProgress(progressRes.data || []);
    save('completedLessons', completedIndexes);
    const p=remoteProfiles.find(x=>x.id===user.id);
    if(p){user={...user,...p};xp=p.xp||0;gamePoints=p.gamePoints||0;save('user',user);save('xp',xp);save('gamePoints',gamePoints)}
    updateHeader();renderClasses();renderLeaderboard();renderGameBoards();renderHomeLevels();
  } catch(err) { console.error('ATAF data sync failed',err); toast('Could not sync data: '+(err.message||'check your Supabase schema and policies')); }
}
async function syncAuthenticatedUser(authUser){
  if(!authUser){user=null;save('user',null);persist();updateHeader();return}
  try {
    const {data:profile,error}=await supabaseClient.from('profiles').select('id,display_name,username,role,grade,xp,game_points').eq('id',authUser.id).single();
    if(error) throw error;
    user={id:authUser.id,name:profile.display_name,username:profile.username||'',email:authUser.email,role:profile.role,xp:profile.xp||0,gamePoints:profile.game_points||0,grade:profile.grade||1,joined:[]};
    xp=user.xp;gamePoints=user.gamePoints;save('user',user);persist();updateHeader();await refreshRemoteData();
    if(location.hash.includes('type=recovery') || location.hash.includes('access_token=')) passwordRecoveryModal();
  } catch(err){console.error(err);toast('Signed in, but profile setup failed. Run supabase/schema.sql.');}
}
function passwordRecoveryModal(){
  modal('Set a new password',`<form id="newPasswordForm"><div class="field"><label>NEW PASSWORD</label><input name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters"></div><p id="passwordResetError" class="muted" role="status"></p><button class="btn primary" type="submit" style="width:100%">Update password</button></form>`);
  $('#newPasswordForm').onsubmit=async e=>{e.preventDefault();const password=new FormData(e.target).get('password');const {error}=await supabaseClient.auth.updateUser({password});if(error)$('#passwordResetError').textContent=error.message;else{closeModal();history.replaceState(null,'',location.pathname);toast('Password updated successfully.')}};
}
function renderClasses(){
  const own=classes.filter(c=>user?.role==='teacher'&&c.teacherId===user.id);
  const joined=classes.filter(c=>user&&c.members.includes(user.id)&&c.teacherId!==user.id);
  const visible=user?.role==='teacher'?own:own.concat(joined);
  $('#classesList').innerHTML=visible.length?visible.map(c=>`<div class="class-card"><div class="eyebrow">CLASSROOM · ${escSafe(c.code)}</div><h3>${escSafe(c.name)}</h3><div class="class-meta">Teacher: ${escSafe(c.teacherName)} · Grade ${c.grade} · ${Math.max(0,c.members.length-(c.members.includes(c.teacherId)?1:0))} students</div><p class="muted">${escSafe(c.description||'A place to practice, play, and grow together.')}</p><div class="class-actions"><button class="btn small" data-open-class="${escSafe(c.id)}">Open class</button>${user?.role==='teacher'&&c.teacherId===user.id?`<button class="btn small" data-edit-class="${escSafe(c.id)}">Manage</button><button class="btn small" data-delete-class="${escSafe(c.id)}">Delete</button>`:''}</div></div>`).join(''):'<div class="empty" style="grid-column:1/-1">No classrooms yet. A teacher can create one, then share its class code with students.</div>';
  const cl=classes.find(c=>user&&c.members.includes(user.id));
  renderClassTypingBoard(cl);
  renderAssignments();
}
function renderAdminView(view='overview'){
  if(user?.role!=='admin')return;
  const allowed=['overview','awards','security','terminal'];
  adminCurrentView=allowed.includes(view)?view:'overview';
  $('#adminIdentity').textContent=user.email||user.name||'Trusted administrator';
  $('#adminRoleStatus').textContent=demoAdminPreview?'Local preview role only':'Role verified by profile';
  const previewNotice=$('#adminPreviewNotice');
  previewNotice.hidden=!demoAdminPreview;
  previewNotice.textContent='Admin preview for ayaansh.atomic810@gmail.com · Local sample data only; no real account or database changes.';
  $$('.admin-view').forEach(section=>section.classList.toggle('active',section.id===`adminView${adminCurrentView[0].toUpperCase()+adminCurrentView.slice(1)}`));
  $$('[data-admin-view]').forEach(button=>button.classList.toggle('selected',button.dataset.adminView===adminCurrentView));
  const labels={overview:'Home',awards:'Certificates',security:'Atomic PSD',terminal:'Command Terminal'};
  $('#adminCurrentView').textContent=labels[adminCurrentView];
  if(adminCurrentView==='overview')renderAdminOverview();
  if(adminCurrentView==='awards')loadAdminCertificates();
  if(adminCurrentView==='security')renderSecurityCases();
  if(adminCurrentView==='terminal')$('#adminCommandInput')?.focus();
}
async function renderAdminOverview(){
  const studentCount=remoteProfiles.filter(profile=>profile.role==='student').length;
  $('#adminOverviewStudentCount').textContent=String(studentCount);
  if(demoAdminPreview){
    $('#adminOpenCount').textContent=String(demoSecurityCases.length);
    $('#adminSecurityBadge').textContent=String(demoSecurityCases.length);
    return;
  }
  const {count,error}=await supabaseClient.from('security_cases').select('id',{count:'exact',head:true}).eq('status','open');
  if(error){
    console.error('Could not load admin security count',error);
    $('#adminOpenCount').textContent='—';
    $('#adminSecurityBadge').textContent='!';
    toast('Could not load the open security report count.');
    return;
  }
  $('#adminOpenCount').textContent=String(count||0);
  $('#adminSecurityBadge').textContent=String(count||0);
}
async function loadAdminCertificates(){
  const container=$('#adminCertificateList');
  if(!container)return;
  if(demoAdminPreview){
    container.innerHTML=demoCertificates.length?demoCertificates.slice(0,12).map(item=>`<article class="admin-record"><b>${placeLabel(item.place)} place · ${esc(item.studentName)}</b><span>${esc(item.boardLabel)} · ${esc(item.scopeLabel)}</span><small>Week of ${new Date(`${item.periodStart}T00:00:00Z`).toLocaleDateString(undefined,{timeZone:'UTC'})} · ${Number(item.score).toLocaleString()} points</small></article>`).join(''):'<div class="admin-empty"><b>No weekly certificates issued</b><small>Preview awards are local-only.</small></div>';
    return;
  }
  container.textContent='Loading certificate history…';
  const {data,error}=await supabaseClient.from('leaderboard_certificates')
    .select('student_id,board_scope,board_type,game_key,period_start,place,score')
    .order('period_start',{ascending:false}).order('place').limit(30);
  if(error){console.error('Could not load weekly leaderboard certificates',error);container.textContent='Could not load certificate history. Apply the latest Supabase schema.';return}
  container.innerHTML=data.length?data.map(item=>{
    const profile=remoteProfiles.find(entry=>entry.id===item.student_id);
    const boardLabel=item.board_type==='typing'?'Typing points':item.game_key?`${gameCatalog[item.game_key]?.name||item.game_key} game`:'All games';
    const scopeLabel=item.board_scope==='global'?'Global':'Class leaderboard';
    return `<article class="admin-record"><b>${placeLabel(item.place)} place · ${esc(profile?.name||'Student')}</b><span>${esc(boardLabel)} · ${esc(scopeLabel)}</span><small>Week of ${new Date(`${item.period_start}T00:00:00Z`).toLocaleDateString(undefined,{timeZone:'UTC'})} · ${Number(item.score).toLocaleString()} points</small></article>`;
  }).join(''):'<div class="admin-empty"><b>No weekly certificates issued</b><small>Top three weekly placements appear here after certificates are awarded.</small></div>';
}
async function renderSecurityCases(){
  const container=$('#securityCasesList');
  if(!container||user?.role!=='admin')return;
  const identity=$('#adminIdentity');
  if(identity)identity.textContent=user.email||user.name||'Trusted administrator';
  const roleStatus=$('#adminRoleStatus');
  if(roleStatus)roleStatus.textContent=demoAdminPreview?'Local preview role only':'Role verified by profile';
  const previewNotice=$('#adminPreviewNotice');
  if(previewNotice){
    previewNotice.hidden=!demoAdminPreview;
    previewNotice.textContent='Admin preview for ayaansh.atomic810@gmail.com · Local sample data only; no real account or database changes.';
  }
  let data,error,openCasesCount=null,reviewedCount=null,todayCount=null;
  if(demoAdminPreview){
    data=demoSecurityCases;
    reviewedCount=demoReviewedCount;
    todayCount=data.filter(item=>new Date(item.created_at).toDateString()===new Date().toDateString()).length;
  }else{
    container.textContent='Loading review queue…';
    const todayStart=new Date();todayStart.setHours(0,0,0,0);
    const [openResult,openCountResult,reviewedResult,todayResult]=await Promise.all([
      supabaseClient.from('security_cases')
          .select('id,actor_id,reported_by,signal_type,details,created_at,actor:profiles!security_cases_actor_id_fkey(display_name),reporter:profiles!security_cases_reported_by_fkey(display_name)')
        .eq('status','open').order('created_at',{ascending:false}).limit(100),
      supabaseClient.from('security_cases').select('id',{count:'exact',head:true}).eq('status','open'),
      supabaseClient.from('security_cases').select('id',{count:'exact',head:true}).neq('status','open'),
      supabaseClient.from('security_cases').select('id',{count:'exact',head:true}).gte('created_at',todayStart.toISOString())
    ]);
    ({data,error}=openResult);
    if(error){
      container.textContent='Could not load the review queue. Run the updated Supabase schema and try again.';
      console.error('Could not load Atomic PSD review queue',error);
      toast('Could not load review queue: '+error.message);
      return;
    }
    if(openCountResult.error||reviewedResult.error||todayResult.error){
      console.error('Could not load all Atomic PSD dashboard metrics',openCountResult.error||reviewedResult.error||todayResult.error);
      toast('Some admin dashboard counts could not be loaded.');
    }else{
      openCasesCount=openCountResult.count;
      reviewedCount=reviewedResult.count;
      todayCount=todayResult.count;
    }
  }
  const openMetric=$('#adminSecurityOpenCount'),overviewMetric=$('#adminOpenCount'),todayMetric=$('#adminTodayCount'),reviewedMetric=$('#adminReviewedCount'),queueCount=$('#adminQueueCount');
  const openText=String(demoAdminPreview?data.length:(openCasesCount??'—'));
  if(openMetric)openMetric.textContent=openText;
  if(overviewMetric)overviewMetric.textContent=openText;
  $('#adminSecurityBadge').textContent=String(demoAdminPreview?data.length:(openCasesCount??'—'));
  if(todayMetric)todayMetric.textContent=todayCount===null?'—':String(todayCount);
  if(reviewedMetric)reviewedMetric.textContent=reviewedCount===null?'—':String(reviewedCount);
  if(queueCount)queueCount.textContent=`${demoAdminPreview?data.length:(openCasesCount??data.length)} OPEN`;
  container.replaceChildren();
  const filteredData=securityCaseFilter==='all'?data:data.filter(item=>item.signal_type===securityCaseFilter);
  if(!filteredData.length){
    const empty=document.createElement('div');empty.className='admin-empty';empty.innerHTML=data.length?'No signals match this filter.':'<span>✓</span><b>Queue is clear</b><small>No open security signals need review.</small>';
    container.append(empty);return;
  }
  const labels={chat_unauthorized:'Blocked unauthorized access attempt',system_breach:'System breach report'};
  for(const item of filteredData){
    const card=document.createElement('article');card.className='admin-signal';
    const top=document.createElement('div');top.className='admin-signal-top';
    const icon=document.createElement('span');icon.className=`admin-signal-icon ${item.signal_type==='chat_unauthorized'?'is-red':'is-blue'}`;icon.textContent=item.signal_type==='chat_unauthorized'?'!':'◈';
    const title=document.createElement('h3');title.textContent=labels[item.signal_type]||'Security signal';
    const time=document.createElement('time');time.className='admin-signal-time';time.dateTime=item.created_at;time.textContent=new Date(item.created_at).toLocaleString();
    const summary=document.createElement('div');summary.className='admin-signal-summary';summary.append(icon,title,time);top.append(summary);
    const who=document.createElement('p');who.className='admin-signal-meta';who.textContent=item.actor_id
      ?`Account: ${item.actor?.display_name||'Unknown user'}`
      :`System report · Submitted by ${item.reporter?.display_name||'administrator'}`;
    const detail=document.createElement('p');detail.className='admin-signal-detail';detail.textContent=item.details;
    const actions=document.createElement('div');actions.className='admin-signal-actions';
    if(item.actor_id&&item.signal_type==='chat_unauthorized'){
      const button=document.createElement('button');button.type='button';button.className='btn small primary';
      button.dataset.securityCaseId=item.id;button.dataset.disposition='ban';button.textContent='Ban account';actions.append(button);
    }
    {
      const button=document.createElement('button');button.type='button';button.className='btn small';
      button.dataset.securityCaseId=item.id;button.dataset.disposition='false_positive';button.textContent='Mark false positive';actions.append(button);
    }
    card.append(top,who,detail,actions);container.append(card);
  }
}
async function runBandwidthTest(){
  if(!['http:','https:'].includes(location.protocol))throw new Error('Bandwidth test is available on the hosted website.');
  const testUrl=new URL(location.pathname,location.origin);
  testUrl.searchParams.set('psd_bandwidth_check',String(Date.now()));
  const startedAt=performance.now();
  const response=await fetch(testUrl,{cache:'no-store',credentials:'same-origin'});
  if(!response.ok)throw new Error(`Website responded with HTTP ${response.status}.`);
  const bytes=(await response.blob()).size;
  const elapsedSeconds=Math.max((performance.now()-startedAt)/1000,0.001);
  return `${(bytes*8/elapsedSeconds/1_000_000).toFixed(2)} Mbps estimated download to this website (${(elapsedSeconds*1000).toFixed(0)} ms, ${bytes.toLocaleString()} bytes). This is a page-transfer estimate, not a full ISP speed test.`;
}
async function runAdminCommand(rawCommand){
  if(user?.role!=='admin')throw new Error('Trusted administrator access is required.');
  const command=rawCommand.trim();
  const normalized=command.toLowerCase();
  if(!command||normalized==='help'){
    return 'Available: help, status, security queue, bandwidth test, report breach <summary>. Arbitrary shell commands are not supported.';
  }
  if(normalized==='status'){
    return `Admin session: verified · Supabase: ${supabaseReady?'configured':'not configured'} · Classroom records: unavailable in the admin workspace.`;
  }
  if(normalized==='security queue'){
    await renderSecurityCases();
    return 'Atomic PSD review queue refreshed.';
  }
  if(normalized==='bandwidth test')return await runBandwidthTest();
  if(normalized.startsWith('report breach ')){
    const details=command.slice('report breach '.length).trim();
    if(!details)throw new Error('Add a short report summary after "report breach".');
    if(details.length>280)throw new Error('Report summary must be 280 characters or fewer.');
    if(demoAdminPreview)return 'Preview only: this breach report was not saved.';
    const {error}=await supabaseClient.rpc('report_system_breach',{p_details:details});
    if(error)throw error;
    await renderSecurityCases();
    return 'System-breach report submitted to the Atomic PSD queue.';
  }
  throw new Error('Unknown command. Type help to see the supported commands.');
}
document.addEventListener('click',async event=>{
  const target=event.target;
  if(!(target instanceof Element))return;
  const certificateButton=target.closest('#adminIssueWeeklyCertificates');
  if(certificateButton){
    if(user?.role!=='admin'){toast('Trusted admin access is required.');return}
    const status=$('#adminCertificateStatus');
    certificateButton.disabled=true;status.textContent='Awarding certificates for the last completed week…';
    if(demoAdminPreview){
      const previousWeek=new Date();previousWeek.setUTCHours(0,0,0,0);previousWeek.setUTCDate(previousWeek.getUTCDate()-((previousWeek.getUTCDay()+6)%7)-7);
      const periodStart=previousWeek.toISOString().slice(0,10);
      const students=remoteProfiles.filter(profile=>profile.role==='student').slice(0,3);
      demoCertificates=[
        ...students.map((student,index)=>({studentName:student.name,place:index+1,boardLabel:'Typing points',scopeLabel:'Global',periodStart,score:[1250,970,840][index]})),
        ...students.map((student,index)=>({studentName:student.name,place:index+1,boardLabel:'All games',scopeLabel:'Global',periodStart,score:[790,620,450][index]}))
      ];
      status.textContent='Preview only: sample certificates are not saved to an account or database.';
      await loadAdminCertificates();
    }else{
      const {data,error}=await supabaseClient.rpc('award_weekly_leaderboard_certificates');
      if(error){
        console.error('Could not award weekly leaderboard certificates',error);
        status.textContent='Could not award certificates: '+error.message;
        certificateButton.disabled=false;return;
      }
      status.textContent=Number(data)>0
        ?`Awarded ${Number(data)} certificate${Number(data)===1?'':'s'} for the last completed week.`
        :'Certificates for last week were already issued, or no eligible scores were recorded.';
      await loadAdminCertificates();
    }
    certificateButton.disabled=false;return;
  }
  if(target.closest('#refreshSecurityCases')){await renderSecurityCases();return}
  const filterButton=target.closest('[data-security-filter]');
  if(filterButton){
    securityCaseFilter=filterButton.dataset.securityFilter||'all';
    $$('[data-security-filter]').forEach(button=>button.classList.toggle('selected',button===filterButton));
    await renderSecurityCases();return;
  }
  const reviewButton=target.closest('[data-security-case-id]');
  if(!reviewButton)return;
  if(user?.role!=='admin'){toast('Trusted admin access is required.');return}
  if(reviewButton.dataset.disposition==='ban'&&!confirm('Ban this account? The account will be blocked from signing in for 100 years. This action is recorded in Supabase Auth and the security review history.'))return;
  if(demoAdminPreview){
    demoReviewedCount++;
    demoSecurityCases=demoSecurityCases.filter(item=>item.id!==reviewButton.dataset.securityCaseId);
    toast(reviewButton.dataset.disposition==='ban'?'Preview only: no real account was banned.':'Preview only: sample report marked false positive.');
    await renderSecurityCases();
    return;
  }
  reviewButton.disabled=true;
  if(reviewButton.dataset.disposition==='ban'){
    const {error}=await supabaseClient.functions.invoke('review-security-case',{body:{caseId:reviewButton.dataset.securityCaseId,confirmation:'BAN'}});
    if(error){reviewButton.disabled=false;toast('Could not ban account: '+error.message);return}
    toast('Account banned and security case recorded.');
    await renderSecurityCases();return;
  }
  const {error}=await supabaseClient.rpc('review_security_case',{
    p_case_id:reviewButton.dataset.securityCaseId,
    p_disposition:'false_positive',
    p_note:null
  });
  if(error){reviewButton.disabled=false;toast('Could not review security case: '+error.message);return}
  toast('Security case updated.');
  await renderSecurityCases();
});
function localWeeklyBoard(boardType,scope,classroom,gameKey=null){
  let people=remoteProfiles.length?remoteProfiles:demoPeople().map((person,index)=>({id:`demo-${index}`,name:person.name,role:'student',xp:person.xp,gamePoints:person.gamePoints}));
  if(scope==='class'){
    const members=new Set(classroom?.members||[]);
    people=people.filter(person=>members.has(person.id));
  }
  return people.map(person=>({
    id:person.id,name:person.name,
    score:boardType==='typing'?Number(person.xp||0):Number(person.gamePoints||0)
  })).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name))
    .map((person,index)=>({...person,place:index+1,week_start:new Date().toISOString().slice(0,10)}));
}
async function fetchWeeklyBoard(boardType,scope,classroomId=null,gameKey=null){
  if(demoSignedIn||!supabaseReady||!user){
    const classroom=classes.find(item=>item.id===classroomId);
    return {data:localWeeklyBoard(boardType,scope,classroom,gameKey),error:null};
  }
  return supabaseClient.rpc('get_weekly_leaderboard',{
    p_board_type:boardType,p_scope:scope,p_classroom_id:classroomId,p_game_key:gameKey
  });
}
function updatePeriodLabel(targetId,weekStart){
  const target=$(targetId);
  if(!target)return;
  const date=weekStart?new Date(`${weekStart}T00:00:00Z`):new Date();
  const monday=new Date(date);
  monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7));
  const sunday=new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate()+6);
  target.textContent=`Week of ${monday.toLocaleDateString(undefined,{timeZone:'UTC'})} · resets Monday UTC`;
}
function placeLabel(place){
  const rank=Number(place);
  return `${rank}${rank===1?'st':rank===2?'nd':'rd'}`;
}
function boardRowsMarkup(rows,field,emptyMessage){
  if(!rows?.length)return `<div class="empty">${emptyMessage}</div>`;
  const entries=rows.map(row=>({id:row.student_id||row.id,name:row.display_name||row.name,[field]:Number(row.score??row[field]??0)}));
  return rowsBoard(entries,field);
}
let leaderboardRequestId=0,gameBoardRequestId=0,classTypingRequestId=0;
async function renderClassTypingBoard(classroom){
  const container=$('#classLeaderboard');
  if(!container)return;
  if(!classroom){container.innerHTML='<div class="empty">Join a class to see its weekly leaderboard.</div>';return}
  const requestId=++classTypingRequestId;
  const {data,error}=await fetchWeeklyBoard('typing','class',classroom.id);
  if(requestId!==classTypingRequestId)return;
  if(error){console.error('Could not load weekly class typing leaderboard',error);container.innerHTML='<div class="empty">Weekly class rankings could not be loaded. Apply the latest Supabase schema.</div>';toast('Could not load weekly class leaderboard: '+error.message);return}
  updatePeriodLabel('#classLeaderboardPeriod',data?.[0]?.week_start);
  container.innerHTML=boardRowsMarkup(data,'xp','No typing points earned in this class yet this week.');
}
async function renderLeaderboard(){
  const container=$('#mainLeaderboard');
  if(!container)return;
  const requestId=++leaderboardRequestId;
  const scope=boardMode==='class'||boardMode==='classgames'?'class':'global';
  const type=boardMode==='games'||boardMode==='classgames'?'game':'typing';
  const classroom=scope==='class'?classes.find(item=>user&&item.members.includes(user.id)):null;
  if(scope==='class'&&!classroom){container.innerHTML='<div class="empty">Join a class to see its weekly leaderboard.</div>';return}
  container.innerHTML='<div class="empty">Loading this week’s leaderboard…</div>';
  const {data,error}=await fetchWeeklyBoard(type,scope,classroom?.id||null,type==='game'?null:null);
  if(requestId!==leaderboardRequestId)return;
  if(error){console.error('Could not load weekly leaderboard',error);container.innerHTML='<div class="empty">Weekly rankings could not be loaded. Apply the latest Supabase schema.</div>';toast('Could not load weekly leaderboard: '+error.message);return}
  updatePeriodLabel('#mainLeaderboardPeriod',data?.[0]?.week_start);
  container.innerHTML=boardRowsMarkup(data,type==='typing'?'xp':'gamePoints','No points earned this week yet.');
}
async function renderGameBoards(){
  const gameKey=selectedGame||'rocket';
  const gameBestScores=load('gameBestScores',{});
  const selector=$('#gameSelector');
  if(selector)selector.value=gameKey;
  const boardSelector=$('#gameBoardSelector');
  if(boardSelector)boardSelector.value=gameLeaderboardMode;
  $$('.game-card').forEach(card=>{
    const key=card.dataset.gameKey||'rocket';
    const bestEl=card.querySelector('.game-best');
    if(bestEl)bestEl.textContent=`Best: ${Number(gameBestScores[key]||0)} pts`;
  });
  const globalContainer=$('#gameGlobalBoard'),classContainer=$('#gameClassBoard');
  if(!globalContainer||!classContainer)return;
  const requestId=++gameBoardRequestId;
  globalContainer.innerHTML='<div class="empty">Loading this week’s game scores…</div>';
  const classroom=classes.find(item=>user&&item.members.includes(user.id));
  const [globalResult,classResult]=await Promise.all([
    fetchWeeklyBoard('game','global',null,gameKey),
    classroom?fetchWeeklyBoard('game','class',classroom.id,gameKey):Promise.resolve({data:[],error:null})
  ]);
  if(requestId!==gameBoardRequestId)return;
  if(globalResult.error){
    console.error('Could not load weekly global game leaderboard',globalResult.error);
    globalContainer.innerHTML='<div class="empty">Weekly game rankings could not be loaded. Apply the latest Supabase schema.</div>';
    toast('Could not load weekly game leaderboard: '+globalResult.error.message);
  }else{
    updatePeriodLabel('#gameGlobalPeriod',globalResult.data?.[0]?.week_start);
    globalContainer.innerHTML=boardRowsMarkup(globalResult.data,'gamePoints','No game points earned this week yet.');
  }
  if(classResult.error){
    console.error('Could not load weekly class game leaderboard',classResult.error);
    classContainer.innerHTML='<div class="empty">Weekly class game rankings could not be loaded.</div>';
    toast('Could not load weekly class game leaderboard: '+classResult.error.message);
  }else{
    updatePeriodLabel('#gameClassPeriod',classResult.data?.[0]?.week_start);
    classContainer.innerHTML=classroom
      ?boardRowsMarkup(classResult.data,'gamePoints','No game points earned in this class yet this week.')
      :'<div class="empty">Join a class to see its weekly game leaderboard.</div>';
  }
}
$('#gameSelector')?.addEventListener('change', (event) => {
  selectedGame = event.target.value || 'rocket';
  renderGameBoards();
});
$('#gameBoardSelector')?.addEventListener('change', (event) => {
  gameLeaderboardMode = event.target.value || 'global';
  renderGameBoards();
});
$('#createClassBtn').onclick=()=>{
  if(!ensureUser())return;if(!['teacher','admin'].includes(user.role)){toast('Teacher access must be granted by your administrator.');return}
  modal('Create a classroom',`<form id="classForm"><div class="field"><label>CLASS NAME</label><input name="name" required maxlength="100" placeholder="e.g. Room 12 Typing Club"></div><div class="form-grid"><div class="field"><label>GRADE LEVEL</label><select name="grade">${gradeNumbers.map(g=>`<option value="${g}">${gradeOrdinal(g)} grade</option>`).join('')}</select></div><div class="field"><label>STARTING TRACK</label><select name="track"><option value="Basic">Beginner</option><option value="Intermediate">Intermediate</option><option value="Master">Master</option></select></div></div><div class="field"><label>DESCRIPTION (OPTIONAL)</label><input name="desc" maxlength="500" placeholder="Let's build our typing skills!"></div><label class="checkbox-row"><input name="studentChatEnabled" type="checkbox"> Enable student class chat</label><label class="checkbox-row"><input name="studentCommentsEnabled" type="checkbox" checked> Allow student comments on assignments</label><button class="btn primary" type="submit" style="width:100%">Create class & generate code</button><p id="classError" class="muted"></p></form>`);
  $('#classForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const submit=e.target.querySelector('[type=submit]');submit.disabled=true;const {data,error}=await supabaseClient.from('classrooms').insert({name:String(f.get('name')).trim(),grade:+f.get('grade'),track:f.get('track'),description:String(f.get('desc')||'').trim(),student_chat_enabled:f.has('studentChatEnabled'),student_comments_enabled:f.has('studentCommentsEnabled'),teacher_id:user.id}).select().single();submit.disabled=false;if(error){$('#classError').textContent=error.message;return}await refreshRemoteData();closeModal();toast('Class created! Share code: '+data.code);viewClass(data.id)};
};
$('#joinClassBtn').onclick=()=>{if(!ensureUser())return;modal('Join a classroom',`<form id="joinForm"><div class="field"><label>CLASS CODE</label><input name="code" required maxlength="12" placeholder="Enter your teacher's class code" style="text-transform:uppercase"></div><p class="muted">Your teacher must approve your request before you join.</p><p id="joinError" class="muted"></p><button class="btn primary" type="submit" style="width:100%">Request to join</button></form>`);$('#joinForm').onsubmit=async e=>{e.preventDefault();const code=new FormData(e.target).get('code');const {data,error}=await supabaseClient.rpc('join_class_by_code',{p_code:String(code).trim().toUpperCase()});if(error){$('#joinError').textContent=error.message;return}closeModal();toast('Join request sent. Your teacher must approve it.');await refreshRemoteData();};};
async function requestJoin(id){toast('Use “Join a classroom” and enter the code your teacher shared.');}
function renderClassAssignments(classId,canPostAssignments,commentsEnabled){
  return `<section class="panel" style="margin-top:18px;padding:16px">
    <div class="section-head" style="margin:0 0 12px"><div><h3 style="margin:0">📝 Class assignments & comments</h3><p style="margin:4px 0 0">Assignments and feedback for this classroom.</p></div></div>
    ${canPostAssignments?`<form data-class-assignment-form data-class-id="${escSafe(classId)}" class="panel" style="padding:14px;margin-bottom:14px">
      <div class="field"><label>POST TYPE</label><select name="assignmentType"><option value="assignment">Typing assignment</option><option value="surprise_test">Surprise 1-minute typing test</option></select></div>
      <div class="field"><label>TITLE</label><input name="title" required maxlength="120" placeholder="e.g. Home row accuracy practice"></div>
      <div class="field"><label>INSTRUCTIONS</label><textarea name="body" required maxlength="2000" rows="3" placeholder="Tell students what to practice..."></textarea></div>
      <div class="field"><label>DUE DATE (OPTIONAL)</label><input name="dueAt" type="datetime-local"></div>
      <p class="muted" data-assignment-status role="status"></p><button class="btn primary" type="submit">Post to this class</button>
    </form>`:''}
    <div id="classAssignmentsList" class="cards"><div class="empty">Loading class assignments…</div></div>
    ${commentsEnabled?'':'<p class="muted">Student comments are turned off for this class. Teachers can still post feedback.</p>'}
  </section>`;
}
async function loadClassAssignments(classroomId,allowStudentComments){
  const container=$('#classAssignmentsList');
  if(!container)return;
  const {data:assignments,error}=await supabaseClient.from('class_assignments')
    .select('id,title,body,assignment_type,due_at,created_at,teacher_id')
    .eq('classroom_id',classroomId).order('created_at',{ascending:false});
  if(error){console.error('Could not load classroom assignments',error);container.textContent='Could not load assignments. Check that the updated Supabase schema has been applied.';return}
  if(!assignments.length){container.innerHTML='<div class="empty">No assignments yet. The teacher can post one for this class.</div>';return}
  const ids=assignments.map(item=>item.id);
  const {data:comments,error:commentsError}=await supabaseClient.from('class_assignment_comments')
    .select('id,assignment_id,author_id,body,created_at').in('assignment_id',ids).order('created_at');
  if(commentsError){console.error('Could not load assignment comments',commentsError);container.textContent='Could not load assignment comments.';return}
  const {data:attempts,error:attemptError}=await supabaseClient.from('class_assignment_attempts')
    .select('assignment_id,student_id,wpm,accuracy,completed_at').in('assignment_id',ids);
  if(attemptError){console.error('Could not load surprise test results',attemptError);container.textContent='Could not load class test results.';return}
  const commentsByAssignment=new Map();
  for(const comment of comments||[]){const rows=commentsByAssignment.get(comment.assignment_id)||[];rows.push(comment);commentsByAssignment.set(comment.assignment_id,rows)}
  const classroom=classes.find(item=>item.id===classroomId);
  container.innerHTML=assignments.map(assignment=>{
    const isSurprise=assignment.assignment_type==='surprise_test';
    const assignmentComments=commentsByAssignment.get(assignment.id)||[];
    const commentMarkup=assignmentComments.map(comment=>{
      const author=remoteProfiles.find(profile=>profile.id===comment.author_id);
      return `<div class="leader-row"><div class="person"><b>${escSafe(author?.name||'Class member')}</b><small>${new Date(comment.created_at).toLocaleString()}</small><span>${escSafe(comment.body)}</span></div>${user?.id===comment.author_id||user?.id===classroom?.teacherId?`<button class="btn small" data-delete-assignment-comment="${escSafe(comment.id)}">Delete</button>`:''}</div>`;
    }).join('')||'<p class="muted">No comments yet.</p>';
    return `<article class="assignment-card" data-class-id="${escSafe(classroomId)}">
      <div class="eyebrow">${isSurprise?'⏱️ SURPRISE TEST · 1 MINUTE':'CLASS ASSIGNMENT'}</div><h3>${escSafe(assignment.title)}</h3>
      <div class="assignment-meta">Posted ${new Date(assignment.created_at).toLocaleString()}${assignment.due_at?' · Due '+new Date(assignment.due_at).toLocaleString():''}</div>
      <p class="muted">${escSafe(assignment.body)}</p>
      ${isSurprise?`<button class="btn primary" data-start-surprise-test="${escSafe(assignment.id)}">Start 1-minute test</button><div class="assignment-attempts"><b>Test results</b>${(attempts||[]).filter(attempt=>attempt.assignment_id===assignment.id).map(attempt=>`<div class="class-meta">${escSafe(remoteProfiles.find(profile=>profile.id===attempt.student_id)?.name||'Student')} · ${attempt.wpm} WPM · ${attempt.accuracy}% · ${new Date(attempt.completed_at).toLocaleString()}</div>`).join('')||'<p class="muted">No completed tests yet.</p>'}</div>`:''}
      ${user?.role==='teacher'&&user.id===classroom?.teacherId?`<button class="btn small" data-delete-class-assignment="${escSafe(assignment.id)}">Delete post</button>`:''}
      <div class="assignment-comments"><h4>Comments & feedback</h4>${commentMarkup}
        ${(user?.id===classroom?.teacherId||allowStudentComments)?`<form data-assignment-comment-form data-class-id="${escSafe(classroomId)}" data-assignment-id="${escSafe(assignment.id)}" class="class-actions"><input name="body" required maxlength="1000" placeholder="Write a comment or feedback" aria-label="Comment"><button class="btn small" type="submit">Comment</button></form>`:''}
      </div>
    </article>`;
  }).join('');
}
function viewClass(id){
  const c=classes.find(c=>c.id===id);
  if(!c)return;
  const isTeacher=user?.role==='teacher'&&c.teacherId===user.id;
  const members=c.members.map(uid=>remoteProfiles.find(p=>p.id===uid)).filter(Boolean);
  const pending=(c.membershipRows||[]).filter(m=>m.status==='pending').map(m=>m.profiles).filter(Boolean);
  const awardStudents=members.filter(p=>p.id!==c.teacherId&&p.role==='student');
  modal(c.name,`
    <div class="eyebrow">CLASS CODE · ${escSafe(c.code)}</div>
    <p class="muted">Grade ${c.grade} · ${escSafe(trackLabel(c.track||'Basic'))} track · Teacher ${escSafe(c.teacherName)}</p>
    ${isTeacher?`<p><button class="btn small" id="copyClassCode">Copy class code</button></p>`:''}
    <h3>Students (${members.filter(p=>p.id!==c.teacherId).length})</h3>
    <div>${members.filter(p=>p.id!==c.teacherId).map(p=>`<div class="leader-row"><div class="person"><b>${escSafe(p.name)}</b><small>Grade ${p.grade} · ${p.xp||0} XP</small></div>${isTeacher?`<button class="btn small" data-remove-student="${escSafe(p.id)}" data-class-id="${escSafe(c.id)}">Remove</button>`:''}</div>`).join('')||'<p class="muted">No approved students yet.</p>'}</div>
    ${isTeacher?`<form id="teacherClassAwardForm" data-class-id="${escSafe(c.id)}" class="admin-form-card panel"><h3>Give a classroom award</h3><p class="muted">Recognize effort; awards do not add XP or change rankings.</p><div class="field"><label>APPROVED STUDENT</label><select name="student" required ${awardStudents.length?'':'disabled'}><option value="">${awardStudents.length?'Choose a student':'No approved students yet'}</option>${awardStudents.map(p=>`<option value="${escSafe(p.id)}">${escSafe(p.name)} · Grade ${p.grade}</option>`).join('')}</select></div><div class="field"><label>AWARD</label><select name="award"><option value="great_effort">Great Effort</option><option value="accuracy_star">Accuracy Star</option><option value="practice_streak">Practice Streak</option><option value="helpful_classmate">Helpful Classmate</option></select></div><div class="field"><label>PERSONAL NOTE (OPTIONAL)</label><textarea name="note" maxlength="240" rows="2" placeholder="What did they do well?"></textarea></div><p class="muted" data-teacher-award-status role="status"></p><button class="btn primary" type="submit" ${awardStudents.length?'':'disabled'}>Grant award</button></form>`:''}
    ${isTeacher?`<h3 style="margin-top:20px">Join requests (${pending.length})</h3>${pending.map(p=>`<div class="leader-row"><div class="person"><b>${escSafe(p.display_name)}</b><small>Waiting for permission</small></div><button class="btn small primary" data-approve-join="${escSafe(p.id)}" data-class-id="${escSafe(c.id)}">Approve</button><button class="btn small" data-deny-join="${escSafe(p.id)}" data-class-id="${escSafe(c.id)}">Deny</button></div>`).join('')||'<p class="muted">No pending requests.</p>'}<div class="field" style="margin-top:16px"><label>CLASS GRADE</label><select id="classGrade">${gradeNumbers.map(g=>`<option value="${g}" ${c.grade===g?'selected':''}>Grade ${g}</option>`).join('')}</select></div><div class="field"><label>LEARNING TRACK</label><select id="nextTrack"><option value="Basic" ${c.track==='Basic'?'selected':''}>Beginner</option><option value="Intermediate" ${c.track==='Intermediate'?'selected':''}>Intermediate</option><option value="Master" ${c.track==='Master'?'selected':''}>Master</option></select></div><label class="checkbox-row"><input id="studentChatEnabled" type="checkbox" ${c.studentChatEnabled?'checked':''}> Enable student class chat</label><label class="checkbox-row"><input id="studentCommentsEnabled" type="checkbox" ${c.studentCommentsEnabled?'checked':''}> Allow student comments on assignments</label><button class="btn blue" id="saveTrack">Save class settings</button>`:''}
    ${isTeacher||c.studentChatEnabled?renderClassChat(c.id):'<div class="notice" style="margin-top:18px">Student chat is disabled. Ask your teacher if you need to share a class message.</div>'}
    ${renderClassAssignments(c.id,isTeacher&&user?.role==='teacher',c.studentCommentsEnabled)}
  `);
  if(isTeacher||c.studentChatEnabled)loadClassChatMessages(c.id);
  loadClassAssignments(c.id,c.studentCommentsEnabled);
  if(isTeacher){
    $('#copyClassCode').onclick=()=>navigator.clipboard?.writeText(c.code).then(()=>toast('Class code copied')).catch(()=>toast('Class code: '+c.code));
    $('#saveTrack').onclick=async()=>{
      const {error}=await supabaseClient.from('classrooms').update({track:$('#nextTrack').value,grade:+$('#classGrade').value,student_chat_enabled:$('#studentChatEnabled').checked,student_comments_enabled:$('#studentCommentsEnabled').checked}).eq('id',c.id);
      if(error){toast(error.message);return}
      await refreshRemoteData();closeModal();viewClass(c.id);toast('Class settings saved');
    };
  }
}
async function loadClassChatMessages(classroomId){
  const container=$('#classChatMessages');
  if(!container)return;
  const {data,error}=await supabaseClient.from('class_chat_messages')
    .select('id,sender_id,body,created_at,profiles:profiles!class_chat_messages_sender_id_fkey(display_name,role)')
    .eq('classroom_id',classroomId).order('created_at',{ascending:false}).limit(60);
  if(error){
    container.textContent='Could not load class chat. Run the updated Supabase schema and try again.';
    console.error('Could not load classroom chat',error);
    toast('Could not load class chat: '+error.message);
    return;
  }
  container.replaceChildren();
  if(!data.length){
    const empty=document.createElement('div');empty.className='empty';empty.textContent='No messages yet. Start the conversation.';
    container.append(empty);return;
  }
  for(const message of data.reverse()){
    const bubble=document.createElement('div');
    bubble.className='chat-bubble';
    bubble.style.cssText='max-width:84%;padding:10px 12px;border-radius:12px;background:'+(message.sender_id===user.id?'#1d3c58':'#1a1d2a')+';border:1px solid var(--line);margin-left:'+(message.sender_id===user.id?'auto':'0');
    const label=document.createElement('div');
    label.style.cssText='font-size:11px;color:var(--muted);margin-bottom:4px;font-weight:800';
    label.textContent=(message.profiles?.display_name||'Class member')+' · '+(message.profiles?.role==='teacher'?'Teacher':'Student')+' · '+new Date(message.created_at).toLocaleString();
    const body=document.createElement('div');body.textContent=message.body;
    bubble.append(label,body);container.append(bubble);
  }
  container.scrollTop=container.scrollHeight;
}

document.addEventListener('click',async event=>{
  const target=event.target;
  if(!(target instanceof Element))return;
  const adminViewButton=target.closest('[data-admin-view]');
  if(adminViewButton){renderAdminView(adminViewButton.dataset.adminView);return}
  if(target.closest('#refreshAdminData')){
    if(demoAdminPreview){renderAdminView(adminCurrentView);return}
    await refreshRemoteData();renderAdminView(adminCurrentView);return;
  }
  if(target.closest('[data-character-picker]')){openCharacterSelect();return}
  const characterTheme=target.closest('[data-character-theme]');
  if(characterTheme){setTheme(characterTheme.dataset.characterTheme);closeModal();toast(`${getThemeCoach().name} is now your XP character.`);return}
  const unitGame=target.closest('[data-unit-game]');
  if(unitGame){
    const [grade,track,unitNumber,mode]=unitGame.dataset.unitGame.split(':');
    startUnitGame(Number(grade),track,Number(unitNumber),mode);
    return;
  }
  const gameStart=target.closest('[data-game-start]');
  if(gameStart){startGame(gameStart.dataset.gameStart);return}
  const raceModeButton=target.closest('[data-race-mode]');
  if(raceModeButton){launchGrandPrix(raceModeButton.dataset.raceMode);return}
  const themeSelect=target.closest('[data-theme-select]');
  if(themeSelect){setTheme(themeSelect.dataset.themeSelect);return}
  if(target.closest('[data-dismiss-modal]')){closeModal();return}
  const openClass=target.closest('[data-open-class]');
  if(openClass){viewClass(openClass.dataset.openClass);return}
  const editClassButton=target.closest('[data-edit-class]');
  if(editClassButton){editClass(editClassButton.dataset.editClass);return}
  const deleteClassButton=target.closest('[data-delete-class]');
  if(deleteClassButton){await deleteClass(deleteClassButton.dataset.deleteClass);return}
  const removeClassStudent=target.closest('[data-remove-student]');
  if(removeClassStudent){await removeStudent(removeClassStudent.dataset.classId,removeClassStudent.dataset.removeStudent);return}
  const approveClassJoin=target.closest('[data-approve-join]');
  if(approveClassJoin){await approveJoin(approveClassJoin.dataset.classId,approveClassJoin.dataset.approveJoin);return}
  const denyClassJoin=target.closest('[data-deny-join]');
  if(denyClassJoin){await denyJoin(denyClassJoin.dataset.classId,denyClassJoin.dataset.denyJoin);return}
  const startSurprise=target.closest('[data-start-surprise-test]');
  if(startSurprise){currentSurpriseTestAssignmentId=startSurprise.dataset.startSurpriseTest;testRequiresFullDuration=true;testDuration=60;$$('[data-duration]').forEach(button=>button.classList.toggle('selected',Number(button.dataset.duration)===60));resetTest();go('tests');toast('Surprise test ready. Your one-minute timer starts when you begin typing.');return}
  const deleteAssignment=target.closest('[data-delete-class-assignment]');
  if(deleteAssignment){
    if(user?.role!=='teacher'){toast('Only classroom teachers can manage assignments.');return}
    const assignmentId=deleteAssignment.dataset.deleteClassAssignment;
    const {error}=await supabaseClient.from('class_assignments').delete().eq('id',assignmentId);
    if(error){toast('Could not delete assignment: '+error.message);return}
    toast('Class post deleted.');const classroomId=deleteAssignment.closest('[data-class-id]')?.dataset.classId;if(classroomId)viewClass(classroomId);return;
  }
  const deleteComment=target.closest('[data-delete-assignment-comment]');
  if(deleteComment){
    const {error}=await supabaseClient.from('class_assignment_comments').delete().eq('id',deleteComment.dataset.deleteAssignmentComment);
    if(error){toast('Could not delete comment: '+error.message);return}
    const classroomId=deleteComment.closest('[data-class-id]')?.dataset.classId;
    if(classroomId)loadClassAssignments(classroomId,classes.find(item=>item.id===classroomId)?.studentCommentsEnabled);else toast('Comment deleted. Reopen the class to refresh comments.');
    return;
  }
  const refreshButton=target.closest('#refreshClassChat');
  if(refreshButton){await loadClassChatMessages(refreshButton.dataset.classId);return}
  const sendButton=target.closest('#sendClassChatBtn');
  if(sendButton){
    const classroomId=sendButton.dataset.classId;
    const body=$('#classChatInput').value;
    sendButton.disabled=true;
    try{
      const {data,error}=await supabaseClient.rpc('send_class_chat_message',{p_classroom_id:classroomId,p_body:body});
      if(error)throw error;
      const result=Array.isArray(data)?data[0]:data;
      if(!result?.accepted){
        const messages={rate_limited:'Please wait before sending more than six messages in 30 seconds.',not_authorized:'Only approved class members can send messages.',chat_disabled:'Your teacher has disabled student chat for this class.'};
        toast(messages[result?.reason]||'Message was not accepted.');
        return;
      }
      $('#classChatInput').value='';
      await loadClassChatMessages(classroomId);
    }catch(error){
      console.error('Could not send classroom message',error);
      toast('Could not send message: '+(error.message||'check the Supabase schema and policies'));
    }finally{
      if(sendButton.isConnected)sendButton.disabled=false;
    }
  }
});
document.addEventListener('submit',async event=>{
  const form=event.target;
  if(!(form instanceof HTMLFormElement))return;
  if(form.id==='adminCommandForm'){
    event.preventDefault();
    const input=$('#adminCommandInput'),output=$('#adminCommandOutput'),submit=form.querySelector('[type=submit]');
    submit.disabled=true;output.textContent='Running…';
    try{output.textContent=await runAdminCommand(input.value)}catch(error){output.textContent=error.message||'Command failed.'}
    submit.disabled=false;
    return;
  }
  if(form.matches('#teacherClassAwardForm')){
    event.preventDefault();
    if(user?.role!=='teacher'){toast('Only classroom teachers can grant class awards.');return}
    const fields=new FormData(form),status=form.querySelector('[data-teacher-award-status]'),submit=form.querySelector('[type=submit]');
    const classroom=classes.find(item=>item.id===form.dataset.classId&&item.teacherId===user.id);
    const student=remoteProfiles.find(profile=>profile.id===String(fields.get('student')));
    const awardKey=String(fields.get('award')),note=String(fields.get('note')||'').trim();
    const awardLabels={accuracy_star:'Accuracy Star',practice_streak:'Practice Streak',helpful_classmate:'Helpful Classmate',great_effort:'Great Effort'};
    if(!classroom||!student||!classroom.members.includes(student.id)||student.role!=='student'){
      status.textContent='Choose an approved student from your class.';
      return;
    }
    submit.disabled=true;status.textContent='Granting award…';
    const {error}=await supabaseClient.rpc('grant_class_award',{
      p_classroom_id:classroom.id,p_student_id:student.id,p_award_key:awardKey,p_note:note
    });
    if(error){submit.disabled=false;status.textContent='Could not grant award: '+error.message;return}
    submit.disabled=false;form.reset();status.textContent='Award granted. The student can see it on their Progress page.';
    toast(`${awardLabels[awardKey]||'Award'} granted to ${student.name}.`);
    return;
  }
  if(form.matches('[data-class-assignment-form]')){
    event.preventDefault();
    const fields=new FormData(form),status=form.querySelector('[data-assignment-status]'),submit=form.querySelector('[type=submit]');
    if(user?.role!=='teacher'){status.textContent='Only classroom teachers can post assignments.';return}
    submit.disabled=true;status.textContent='Posting…';
    const dueValue=String(fields.get('dueAt')||'');
    const {error}=await supabaseClient.from('class_assignments').insert({
      classroom_id:form.dataset.classId,teacher_id:user.id,title:String(fields.get('title')).trim(),
      body:String(fields.get('body')).trim(),assignment_type:String(fields.get('assignmentType')),
      due_at:dueValue?new Date(dueValue).toISOString():null
    });
    submit.disabled=false;
    if(error){status.textContent='Could not post: '+error.message;return}
    toast(fields.get('assignmentType')==='surprise_test'?'Surprise test posted to class.':'Assignment posted to class.');
    viewClass(form.dataset.classId);return;
  }
  if(form.matches('[data-assignment-comment-form]')){
    event.preventDefault();
    const assignmentId=form.dataset.assignmentId,body=String(new FormData(form).get('body')).trim(),classroomId=form.dataset.classId;
    const {error}=await supabaseClient.from('class_assignment_comments').insert({assignment_id:assignmentId,author_id:user.id,body});
    if(error){toast('Could not post comment: '+error.message);return}
    if(classroomId)loadClassAssignments(classroomId,classes.find(item=>item.id===classroomId)?.studentCommentsEnabled);
    else toast('Comment posted.');
  }
});
async function approveJoin(cid,uid){const {error}=await supabaseClient.rpc('review_class_join',{p_classroom_id:cid,p_student_id:uid,p_approve:true});if(error){toast(error.message);return}await refreshRemoteData();viewClass(cid);toast('Student approved!')}
async function denyJoin(cid,uid){const {error}=await supabaseClient.rpc('review_class_join',{p_classroom_id:cid,p_student_id:uid,p_approve:false});if(error){toast(error.message);return}await refreshRemoteData();viewClass(cid);toast('Request declined.')}
async function removeStudent(cid,uid){const {error}=await supabaseClient.rpc('remove_class_student',{p_classroom_id:cid,p_student_id:uid});if(error){toast(error.message);return}await refreshRemoteData();viewClass(cid);toast('Student removed from class.')}
function editClass(id){viewClass(id)}
async function deleteClass(id){const c=classes.find(c=>c.id===id);if(!c||user?.role!=='teacher'||c.teacherId!==user.id)return;if(confirm('Delete '+c.name+'? This removes this class and its membership.')){const {error}=await supabaseClient.from('classrooms').delete().eq('id',id);if(error){toast(error.message);return}await refreshRemoteData();renderClasses();toast('Class deleted.')}}


async function finishTest(){
  if(testDone)return;
  if(!testStarted){toast('Type a few words first!');return}
  if(testRequiresFullDuration&&(Date.now()-testStart)<testDuration*1000){toast('Keep typing until the full one-minute test is complete.');return}
  testDone=true;clearInterval(testTimer);$('#testInput').disabled=true;
  const val=$('#testInput').value,elapsed=Math.max(1,Math.min(testDuration,(Date.now()-testStart)/1000)),txt=$('#testPrompt').textContent;
  let correct=0;for(let i=0;i<Math.min(val.length,txt.length);i++)if(val[i]===txt[i])correct++;
  const cpm=Math.round(correct/(elapsed/60)),wpm=Math.round(cpm/5),attempted=val.length+testMistakes,acc=attempted?Math.round(correct/attempted*100):0;
  $('#testWpm').innerHTML=wpm+' <small>WPM</small>';$('#testCpm').innerHTML=cpm+' <small>CPM</small>';$('#testAccuracy').textContent=acc+'%';$('#timeLeft').textContent='Done';
  updateDailyGoalProgress(Math.max(20,Math.round(wpm*2+acc/10)));recordPracticeActivity('test',{wpm,accuracy:acc,duration:testDuration,mode:testMode});
  if(user){
    const {error}=await supabaseClient.rpc('save_typing_test',{p_wpm:wpm,p_accuracy:acc,p_duration:testDuration});
    if(error){toast('Test finished, but save failed: '+error.message);return}
    if(currentSurpriseTestAssignmentId){
      const {error:classTestError}=await supabaseClient.rpc('complete_class_surprise_test',{p_assignment_id:currentSurpriseTestAssignmentId,p_wpm:wpm,p_accuracy:acc,p_duration:testDuration});
      if(classTestError){toast('Test saved, but classroom result could not be recorded: '+classTestError.message);return}
      currentSurpriseTestAssignmentId=null;
      $('#testMessage').textContent=`Surprise test saved: ${wpm} WPM at ${acc}% accuracy.`;
    }
    if(pendingTrackAssessment){
      const assessment=pendingTrackAssessment;
      const {error:assessmentError}=await supabaseClient.rpc('complete_track_assessment',{p_grade:assessment.grade,p_track:assessment.track,p_wpm:wpm,p_accuracy:acc,p_duration:testDuration});
      if(assessmentError){toast('Test saved, but the level assessment did not unlock: '+assessmentError.message);return}
      completedTrackAssessments.add(`${assessment.grade}-${assessment.track}`);
      pendingTrackAssessment=null;
      $('#testMessage').textContent=`Final one-minute test saved: ${wpm} WPM at ${acc}% accuracy. The next level is unlocked!`;
    }else $('#testMessage').textContent=`Test saved online: ${wpm} WPM at ${acc}% accuracy.`;
    testRequiresFullDuration=false;
    await refreshRemoteData();$('#testXp').textContent='Saved';toast('Test result saved to your account!');
  }else{$('#testXp').textContent='+0';$('#testMessage').textContent=`Practice result: ${wpm} WPM at ${acc}% accuracy. Sign in to save results.`;toast('Practice complete! Sign in to save your score.')}
}

function getAvailableGamesForUser(){
  const gameKeys=Object.keys(gameCatalog);
  if(!user||user.role!=='student')return gameKeys;
  const restrictedGames=new Set(classes
    .filter(classroom=>classroom.members?.includes(user.id))
    .flatMap(classroom=>Array.isArray(classroom.gameRestrictions)?classroom.gameRestrictions:[]));
  return gameKeys.filter(gameKey=>!restrictedGames.has(gameKey));
}
function startUnitGame(grade,track,unitNumber,mode){
  const unitLessons=lessonData.filter(lesson=>lesson.grade===grade&&lesson.track===track&&lesson.unitNumber===unitNumber);
  if(!unitLessons.length){toast('This unit game is not available.');return}
  const words=[...new Set(unitLessons.flatMap(lesson=>lesson.text.toLowerCase().match(/[a-z]{2,12}/g)||[]))];
  const options={name:`${mode==='sprint'?'Key Sprint':'Word Garden'} · Grade ${grade}, Unit ${unitNumber}`,emoji:mode==='sprint'?'⚡':'🌿',words:words.length?words:gameCatalog.rocket.words,duration:40,pointsPerWord:mode==='sprint'?12:10,scene:mode==='sprint'?'sprint':'garden'};
  startGame(mode==='sprint'?'rocket':'garden',true,options);
}
const raceSkinOptions={
  starter:{name:'Starter Kart',emoji:'🏎️'},
  comet:{name:'Comet Kart',emoji:'🚙'},
  neon:{name:'Neon Kart',emoji:'🏎️'},
  nebula:{name:'Nebula Kart',emoji:'🚀'},
  gold:{name:'Gold Kart',emoji:'🏆'}
};
async function loadRaceSkinInventory(){
  const saved=load('raceSkins',['starter']);
  if(!user||!supabaseReady||!supabaseClient)return Array.isArray(saved)?saved:['starter'];
  const {data,error}=await supabaseClient.from('race_skins').select('skin_id').eq('student_id',user.id);
  if(error){console.error('Could not load race skins',error);toast('Could not load kart skins. Apply the latest Supabase schema and try again.');return Array.isArray(saved)?saved:['starter']}
  const skins=['starter',...data.map(row=>row.skin_id).filter(skin=>Object.hasOwn(raceSkinOptions,skin))];
  save('raceSkins',skins);
  return skins;
}
async function launchGrandPrix(mode='cpu'){
  if(!ensureUser())return;
  if(mode==='cpu'){
    const publishPublicRaceTime=$('#publicRaceConsent')?.checked===true;
    let raceSessionId=null;
    if(publishPublicRaceTime&&supabaseReady&&supabaseClient){
      const {data,error}=await supabaseClient.rpc('begin_race_challenge',{p_scope:'solo',p_opponent_race_id:null});
      if(error){console.error('Could not start anonymous public race session',error);toast('Could not start a public race session. Check the latest Supabase schema.');return}
      const session=Array.isArray(data)?data[0]:data;
      if(!session?.race_session_id){toast('The public race session could not be started. Please try again.');return}
      raceSessionId=session.race_session_id;
    }else if(publishPublicRaceTime)toast('Configure Supabase to share this race time publicly.');
    startGame('race',false,{
      raceMode:'cpu',
      raceSkin:load('selectedRaceSkin','starter'),
      racePublishPublicly:publishPublicRaceTime&&Boolean(raceSessionId),
      raceSessionId
    });
    return;
  }
  if(!['class','public'].includes(mode))return;
  if(!supabaseReady||!supabaseClient){toast('Online races need your Supabase project configured and the latest schema applied. CPU races are ready now.');return}
  const {data,error}=await supabaseClient.rpc('get_race_opponents',{p_scope:mode});
  if(error){console.error('Could not load race opponents',error);toast(mode==='class'?'Could not load classmates. Join an approved class and apply the latest Supabase schema.':'Could not load public rivals. Apply the latest Supabase schema and try again.');return}
  if(!data?.length){toast(mode==='class'?'No classmates have finished a Grand Prix race yet.':'No public rival records yet. Be the first to set a race time!');return}
  const skins=await loadRaceSkinInventory();
  const formatTime=milliseconds=>(Number(milliseconds)/1000).toFixed(1)+'s';
  const scopeLabel=mode==='class'?'Classmate':'Public rival';
  modal('🏁 Choose a rival',`<p>${mode==='class'?'Challenge a classmate’s best-time ghost.':'Challenge an anonymous public player’s best-time ghost.'} No chat, contact details, or live messaging.</p><div class="field"><label for="raceOpponentSelect">RIVAL</label><select id="raceOpponentSelect">${data.map((rival,index)=>`<option value="${esc(rival.race_id)}" data-index="${index}">${esc(rival.rival_name)} · ${formatTime(rival.finish_ms)}</option>`).join('')}</select></div><div class="field"><label for="raceSkinSelect">KART SKIN</label><select id="raceSkinSelect">${skins.map(skin=>`<option value="${esc(skin)}">${raceSkinOptions[skin].emoji} ${esc(raceSkinOptions[skin].name)}</option>`).join('')}</select></div><p class="muted">Finish all four callouts faster than your rival to win. Beating a human rival can unlock a new skin.</p><button class="btn primary" type="button" id="confirmRaceOpponent">Start ${scopeLabel.toLowerCase()} race →</button>`);
  $('#confirmRaceOpponent').onclick=async()=>{
    const option=$('#raceOpponentSelect').selectedOptions[0];
    const opponent=data[Number(option.dataset.index)];
    const skin=$('#raceSkinSelect').value;
    const confirm=$('#confirmRaceOpponent');
    confirm.disabled=true;
    const {data:sessionData,error:sessionError}=await supabaseClient.rpc('begin_race_challenge',{
      p_scope:mode,
      p_opponent_race_id:opponent.race_id
    });
    if(sessionError){
      console.error('Could not start Grand Prix challenge',sessionError);
      toast('Could not start this race. Refresh your rivals and try again.');
      confirm.disabled=false;
      return;
    }
    const session=Array.isArray(sessionData)?sessionData[0]:sessionData;
    if(!session?.race_session_id){toast('The race session could not be started. Please try again.');confirm.disabled=false;return}
    closeModal();
    save('selectedRaceSkin',skin);
    startGame('race',false,{
      raceMode:mode,
      opponent:{race_id:opponent.race_id,rival_name:session.rival_name,finish_ms:session.rival_finish_ms},
      raceSkin:skin,
      raceSessionId:session.race_session_id
    });
  };
}
function startGame(kind,bypassAuth=false,gameOptions=null){
  if(!bypassAuth&&!ensureUser())return;
  const currentGame = gameOptions?{...(gameCatalog[kind]||gameCatalog.rocket),...gameOptions}:(gameCatalog[kind]||gameCatalog.rocket);
  const allowedGames = getAvailableGamesForUser();
  const gameBestScores = load('gameBestScores', {});
  if (user && user.role === 'student' && !allowedGames.includes(kind)) {
    toast('This game is restricted by your teacher for this class.');
    return;
  }
  const words = currentGame.words || gameCatalog.rocket.words;
  const coach=getThemeCoach(),activeTheme=load('theme',''),isBubble=kind==='bubble';
  const isRace=kind==='race';
  const raceMode=isRace?currentGame.raceMode||'cpu':'cpu';
  const racePublishPublicly=isRace&&currentGame.racePublishPublicly===true;
  const raceSessionId=isRace?currentGame.raceSessionId||null:null;
  const raceOpponent=isRace?currentGame.opponent||null:null;
  const raceSkin=isRace&&Object.hasOwn(raceSkinOptions,currentGame.raceSkin||load('selectedRaceSkin','starter'))?currentGame.raceSkin||load('selectedRaceSkin','starter'):'starter';
  const playerKartEmoji=raceSkinOptions[raceSkin].emoji;
  const raceStartedAt=performance.now();
  let raceRound=0;
  let racePenaltyMs=0,raceWon=false,raceAwardMessage='';
  let target = isRace?words[raceRound]:words[Math.floor(Math.random()*words.length)],buffer='',score=0,streak=0,best=0,seconds=currentGame.duration||30,done=false,paused=false,lives=3,bubbleSeconds=6,keysFound=0,raceErrors=0;
  const raceDrivers=raceOpponent
    ?[{id:'rival',name:raceOpponent.rival_name,emoji:'🚘',progress:0,speed:0,finishMs:Number(raceOpponent.finish_ms)}]
    :[{id:'comet',name:'Comet',emoji:'🚙',progress:0,speed:1.05},{id:'nova',name:'Nova',emoji:'🏎️',progress:0,speed:1.2},{id:'bolt',name:'Bolt',emoji:'🚕',progress:0,speed:1.35}];
  startGameMusic();
  const scene=currentGame.scene||kind;
  const specialLabel={rocket:'DISTANCE',dragon:'FIRE CHARGE',rain:'CLOUDS CLEARED',wizard:'MAGIC',turbo:'CHECKPOINTS',meteor:'METEORS CLEARED',treasure:'KEYS',sky:'AIR GATES',garden:'FLOWERS',ocean:'PEARLS',cipher:'CODES CRACKED',race:'RACE POSITION'}[kind]||'MISSIONS';
  const specialValue=()=>kind==='rocket'?`${score*120} m`:kind==='dragon'?`${streak} 🔥`:kind==='rain'?`${score} drops`:kind==='wizard'?`${streak}x`:kind==='turbo'?`${Math.floor(score/3)} gates`:kind==='meteor'?`${score} cleared`:kind==='treasure'?`${keysFound%3|| (keysFound?3:0)}/3`:kind==='sky'?`${score} gates`:kind==='garden'?`${score} blooms`:kind==='ocean'?`${score} pearls`:kind==='cipher'?`${score%3|| (score?3:0)}/3`:kind==='race'?'4th place':String(score);
  const specialMarkup=isBubble?`<div class="stat-card game-special-stat game-lives-stat"><small>LIVES</small><strong id="gLives" aria-label="3 lives">❤️❤️❤️</strong></div>`:`<div class="stat-card game-special-stat"><small>${specialLabel}</small><strong id="gSpecial">${specialValue()}</strong></div>`;
  const bubbleMarkup=isBubble?`<div class="bubble-deadline"><div><b>Bubble escape meter</b><span id="bubbleTimeLabel">6s before it floats away</span></div><div class="bubble-deadline-track"><span id="bubbleDeadlineFill"></span></div></div>`:'';
  const clueMarkup=kind==='cipher'?'<div class="cipher-clue"><small>UNSCRAMBLE THIS CODE</small><b id="gameClue"></b></div>':'';
  const raceTrackMarkup=isRace?`<div class="race-track" id="raceTrack" aria-label="Race positions"><div class="race-lane race-lane-player"><b>You</b><div class="race-lane-track"><span class="race-finish">🏁</span><i id="racePlayerKart">${playerKartEmoji}</i></div></div>${raceDrivers.map(driver=>`<div class="race-lane"><b>${esc(driver.name)}</b><div class="race-lane-track"><span class="race-finish">🏁</span><i id="raceKart-${driver.id}">${driver.emoji}</i></div></div>`).join('')}</div>`:'';
  const raceCalloutsMarkup=isRace?`<ol class="race-callouts" id="raceCallouts" aria-label="All race callouts">${words.map((phrase,index)=>`<li class="${index===0?'current':''}" data-race-callout="${index}">${[...phrase].map(char=>char===' '?' <span class="race-callout-space" aria-label="space">SP</span> ':esc(char)).join('')}</li>`).join('')}</ol>`:'';
  const objective=currentGame.objective||'Type each word to complete the mission.';
  modal('🎮 '+currentGame.name,`<div class="game-play-screen" data-game-scene="${esc(scene)}"><div class="game-scene-art" aria-hidden="true"><span class="game-scene-orb"></span><span class="game-character-scene">${characterMarkup(activeTheme,coach)}</span><span id="gameSceneEmoji">${currentGame.emoji}</span><span class="game-scene-spark">✦</span><span class="game-scene-decor"></span></div><div class="game-topline"><div class="atafbot-game-card"><div class="atafbot-avatar" aria-hidden="true">${esc(coach.emoji)}</div><div class="atafbot-copy"><strong>${esc(coach.name)}</strong><small>Your guide for this world · Type to play!</small></div></div><div class="game-controls"><button class="btn small music-toggle" id="gameMusicToggle" type="button">${musicEnabled?'Music on':'Music off'}</button><button class="btn small" id="gameFullscreenToggle" type="button" aria-pressed="false">Fullscreen</button><button class="btn small" id="gamePauseToggle" type="button" aria-pressed="false"${raceSessionId?' disabled title="Pause is unavailable during server-timed races"':''}>Pause</button></div></div><div class="game-objective"><b>MISSION</b><span>${esc(objective)}</span></div><div class="stats"><div class="stat-card"><small>TIME LEFT</small><strong id="gTime">${seconds}s</strong></div><div class="stat-card"><small>${isBubble?'BUBBLES POPPED':isRace?'LINES TYPED':'WORDS'}</small><strong id="gScore">0</strong></div><div class="stat-card"><small>${isBubble?'LIFE STREAK':'CURRENT STREAK'}</small><strong id="gStreak">0</strong></div>${specialMarkup}</div><div class="game-world"><div class="game-world-title">${esc(currentGame.name)} <span id="gameRound">· Round ${isRace?1:1}</span></div><p class="muted" id="gameInstruction">${isBubble?'Type the whole bubble word before the bubble reaches the top!':isRace?'Type the highlighted track callout. The complete race text stays visible below.':' '+esc(objective)}</p>${bubbleMarkup}${clueMarkup}${raceCalloutsMarkup}<div class="game-target-word ${isRace?'game-race-prompt':''}" id="gTarget" aria-live="polite"></div><div class="game-feedback" id="gameFeedback" role="status" aria-live="polite">Ready when you are — start typing!</div>${isRace?raceTrackMarkup:`<div class="game-lane"><span id="gameLaneProgress"></span><i id="gameRunner">${currentGame.emoji}</i></div>`}</div><div class="game-play-footer"><span>⌨️ Use your physical keyboard${isRace?' · SP marks a space':''}</span><span>${isRace?'Finish all 4 callouts to win':`${currentGame.pointsPerWord} points per word`} · <span id="gamePauseHint">Timer running</span></span></div></div>`);
  $('#modalBody').tabIndex=-1;$('#modalBody').focus();
  const timer=setInterval(()=>{if(paused)return;seconds--;const el=$('#gTime');if(el)el.textContent=seconds+'s';if(isBubble){bubbleSeconds--;const bubbleFill=$('#bubbleDeadlineFill');if(bubbleFill)bubbleFill.style.width=`${Math.max(0,bubbleSeconds/6*100)}%`;const bubbleLabel=$('#bubbleTimeLabel');if(bubbleLabel)bubbleLabel.textContent=`${Math.max(0,bubbleSeconds)}s before it floats away`;if(bubbleSeconds<=0)bubbleEscaped()}if(isRace)advanceRaceDrivers();if(seconds<=0)end()},1000);activeGameTimer=timer;
  const toggle=document.getElementById('gameMusicToggle');if(toggle){toggle.onclick=()=>{musicEnabled=!musicEnabled;if(musicEnabled)startGameMusic();else stopGameMusic();toggle.textContent=musicEnabled?'Music on':'Music off';$('#modalBody').focus()}};
  const fullscreenToggle=document.getElementById('gameFullscreenToggle');
  if(fullscreenToggle)fullscreenToggle.onclick=()=>{
    const gameModal=$('#modalBackdrop .modal');
    const expanded=gameModal.classList.toggle('game-fullscreen-preview');
    $('#modalBackdrop').classList.toggle('game-preview-expanded',expanded);
    fullscreenToggle.textContent=expanded?'Exit fullscreen':'Fullscreen';
    fullscreenToggle.setAttribute('aria-pressed',String(expanded));
    $('#modalBody').focus();
  };
  const pauseToggle=document.getElementById('gamePauseToggle');
  if(pauseToggle)pauseToggle.onclick=()=>{paused=!paused;pauseToggle.textContent=paused?'Resume':'Pause';pauseToggle.setAttribute('aria-pressed',String(paused));$('.game-play-screen').dataset.paused=String(paused);$('#gamePauseHint').textContent=paused?'Paused':'Timer running';$('#gamePauseOverlay')?.remove();if(paused){stopGameMusic();const overlay=document.createElement('div');overlay.id='gamePauseOverlay';overlay.className='game-pause-overlay';overlay.setAttribute('role','status');overlay.textContent='Paused — take a breath, then resume when you’re ready.';$('#gTarget').after(overlay)}else if(musicEnabled)startGameMusic();$('#modalBody').focus()};
  function getCipherClue(word){if(word.length<2)return word;const shifted=word.slice(1)+word[0];return shifted===word?`${word.split('').reverse().join('')} · backwards`:shifted}
  function racePlayerProgress(){return Math.min(100,((score+buffer.length/target.length)/words.length)*100)}
  function renderRacePositions(){
    const player=racePlayerProgress(),playerKart=$('#racePlayerKart');
    if(playerKart)playerKart.style.left=`${Math.min(96,2+player*.94)}%`;
    raceDrivers.forEach(driver=>{
      if(driver.finishMs)driver.progress=Math.min(100,((performance.now()-raceStartedAt+racePenaltyMs)/driver.finishMs)*100);
      const kart=$(`#raceKart-${driver.id}`);if(kart)kart.style.left=`${Math.min(96,2+driver.progress*.94)}%`;
    });
    const place=1+raceDrivers.filter(driver=>driver.progress>player).length,special=$('#gSpecial');
    if(special)special.textContent=`${place}${place===1?'st':place===2?'nd':place===3?'rd':'th'}`;
  }
  function advanceRaceDrivers(){
    raceDrivers.forEach(driver=>{if(driver.finishMs)driver.progress=Math.min(100,((performance.now()-raceStartedAt+racePenaltyMs)/driver.finishMs)*100);else driver.progress=Math.min(100,driver.progress+driver.speed)});
    renderRacePositions();
    if(raceDrivers.some(driver=>driver.progress>=100)){const winner=raceDrivers.find(driver=>driver.progress>=100);$('#gameFeedback').textContent=`${winner.name} crossed the finish line!`;end(`${winner.name} won the race`)}
  }
  function paintTarget(){
    const targetEl=$('#gTarget');if(!targetEl)return;
    targetEl.innerHTML=[...target].map((letter,index)=>{const status=index<buffer.length?(buffer[index]===letter.toLowerCase()?'typed-correct':'typed-wrong'):index===buffer.length?'typed-next':'';return `<span class="${status}${letter===' '?' game-space-marker':''}"${letter===' '?' aria-label="Space" title="Space"':''}>${letter===' '?'SP':esc(letter)}</span>`}).join('');
    if(isRace)$$('[data-race-callout]').forEach((callout,index)=>callout.classList.toggle('current',index===raceRound));
    const laneProgress=$('#gameLaneProgress'),runner=$('#gameRunner'),progress=buffer.length/target.length*100;
    if(laneProgress)laneProgress.style.width=`${Math.min(100,progress)}%`;
    if(runner)runner.style.left=`${Math.min(88,progress*.88)}%`;
    if(isRace)renderRacePositions();
    if(kind==='cipher')$('#gameClue').textContent=getCipherClue(target)
  }
  function updateGameSpecial(){const special=$('#gSpecial');if(special)special.textContent=specialValue();if(kind==='treasure'&&keysFound>0&&keysFound%3===0){$('#gameSceneEmoji').textContent='🎉💎';$('#gameFeedback').textContent='Treasure chest opened! Keep searching for another set of keys.'}if(kind==='garden'&&score>0)$('#gameSceneEmoji').textContent=score%3===0?'🌻':score%3===1?'🌱':'🌼'}
  function next(){target=isRace?words[raceRound]:words[Math.floor(Math.random()*words.length)];buffer='';if(isBubble)bubbleSeconds=6;$('#gScore').textContent=score;$('#gStreak').textContent=streak;$('#gameRound').textContent=`· ${isRace?'Callout':'Round'} ${score+1}`;$('#gameFeedback').textContent=isBubble?'New bubble! Type its word before it floats away.':isRace?'Next callout — keep your kart moving!':'New word — keep the streak going!';if(isBubble){const fill=$('#bubbleDeadlineFill');if(fill)fill.style.width='100%';const label=$('#bubbleTimeLabel');if(label)label.textContent='6s before it floats away'}updateGameSpecial();paintTarget()}
  function bubbleEscaped(){if(!isBubble||done)return;lives--;streak=0;$('#gLives').textContent='❤️'.repeat(lives)+'🖤'.repeat(3-lives);$('#gLives').setAttribute('aria-label',`${lives} lives remaining`);$('#gStreak').textContent=streak;$('#gameSceneEmoji').textContent='💨';if(lives<=0){$('#gameFeedback').textContent='All three bubbles escaped! Game over.';end('Bubble Pop: all 3 lives used');return}next();$('#gameSceneEmoji').textContent='🫧';$('#gameFeedback').textContent=`${coach.name}: That bubble escaped! ${lives} ${lives===1?'life':'lives'} left.`}
  async function end(reason=isBubble&&lives<=0?'All bubbles escaped!':`Time’s up! ${currentGame.action||'Mission complete!'}`){
    if(done)return;
    done=true;clearInterval(timer);if(activeGameTimer===timer)activeGameTimer=null;
    if(activeGameKeyHandler){document.removeEventListener('keydown',activeGameKeyHandler);activeGameKeyHandler=null}
    stopGameMusic();
    const points=score*currentGame.pointsPerWord;
    gameBestScores[kind]=Math.max(Number(gameBestScores[kind]||0),Number(points||0));
    save('gameBestScores',gameBestScores);
    updateDailyGoalProgress(Math.max(15,Math.round(points/4)));
    recordPracticeActivity('game',{points});
    if(supabaseReady&&supabaseClient){
      const {error}=await supabaseClient.rpc('save_typing_game',{p_game_key:kind,p_points:points});
      if(error)toast('Game ended; score could not be saved: '+error.message);
      else await refreshRemoteData();
    }
    if(isRace&&raceSessionId&&score>=words.length&&supabaseReady&&supabaseClient){
      const {data,error}=await supabaseClient.rpc('complete_race_challenge',{p_race_session_id:raceSessionId});
      if(error){
        console.error('Could not complete server-timed Grand Prix race',error);
        toast('Race finished, but its server-timed result could not be saved. Check the latest Supabase schema.');
      }else{
        const result=Array.isArray(data)?data[0]:data;
        if(raceMode==='cpu'&&racePublishPublicly){
          raceAwardMessage='Your best time is now available as an anonymous public rival. No profile name or contact details are shared.';
        }else if(result?.won){
          raceAwardMessage=result.skin_id
            ?`You beat ${result.rival_name} and unlocked the ${raceSkinOptions[result.skin_id]?.name||'new'}!`
            :`You beat ${result.rival_name}! You have unlocked all kart skins.`;
          const inventory=load('raceSkins',['starter']);
          if(result.skin_id&&!inventory.includes(result.skin_id)){inventory.push(result.skin_id);save('raceSkins',inventory)}
        }else if(raceOpponent)raceAwardMessage='Your race was saved. Keep practicing to beat this rival’s best time.';
      }
    }
    const resultDetail=isRace
      ?`You finished ${score} of ${words.length} callouts with ${raceErrors} wrong-key penalties.${raceOpponent?` Rival time: ${(raceOpponent.finish_ms/1000).toFixed(1)} seconds.`:''}`
      :`You typed ${score} ${isBubble?'bubbles':'words'} with a best streak of ${best}${isBubble?` and finished with ${lives}/3 lives`:''}.`;
    $('#modalBody').innerHTML=`<div class="game-result-screen"><div class="game-result-character">${esc(coach.emoji)}</div><p class="game-result-kicker">${esc(coach.name)} · ${esc(currentGame.name)}</p><h2>${esc(reason)}</h2><p>${esc(currentGame.action||'Great practice!')} ${esc(resultDetail)}</p>${raceAwardMessage?`<p class="race-award-message">${esc(raceAwardMessage)}</p>`:''}<div class="stats"><div class="stat-card"><small>GAME POINTS</small><strong>+${points}</strong></div><div class="stat-card"><small>${isBubble?'BUBBLES POPPED':isRace?'CALLOUTS CLEARED':'WORDS'}</small><strong>${score}</strong></div>${isBubble?`<div class="stat-card"><small>LIVES LEFT</small><strong>${lives}/3</strong></div>`:''}</div><button class="btn primary" id="playAgain" type="button">Play again</button> <button class="btn" id="gameDone" type="button">Done</button></div>`;
    $('#playAgain').onclick=()=>{closeModal();if(isRace){launchGrandPrix(raceMode);return}startGame(kind,bypassAuth,gameOptions)};
    $('#gameDone').onclick=()=>{closeModal();renderGameBoards();if(checkpointGameActive){checkpointGameActive=false;advanceLesson()}};
    renderGameBoards();renderProgressCard();renderSkillBadges();
  }
  activeGameKeyHandler=event=>{
    if(done||paused||!$('#modalBackdrop').classList.contains('open')||event.ctrlKey||event.metaKey||event.altKey||event.target.closest('button,input,textarea,select'))return;
    if(event.key==='Backspace'){event.preventDefault();buffer=buffer.slice(0,-1);paintTarget();return}
    if(event.key.length!==1)return;
    event.preventDefault();
    if(isRace&&event.key.toLowerCase()!==target[buffer.length]){raceErrors++;racePenaltyMs+=1000;seconds=Math.max(0,seconds-1);$('#gTime').textContent=seconds+'s';$('#gameFeedback').textContent='Wrong key — one second penalty. Follow the highlighted character.';if(seconds<=0)end('Time ran out before the finish');return}
    buffer+=event.key.toLowerCase();paintTarget();
    if(buffer.length>=target.length){
      if(buffer===target.toLowerCase()){score++;streak++;best=Math.max(best,streak);if(kind==='treasure'){keysFound++;if(keysFound%3===0)$('#gameFeedback').textContent='Three keys! The treasure chest opens!'}else $('#gameFeedback').textContent=currentGame.action||'Great typing!';if(isBubble){$('#gameSceneEmoji').textContent='💥';$('#gTarget').classList.add('bubble-pop');$('.game-character-scene').classList.add('bubble-blasting')}else $('#gameSceneEmoji').classList.add('game-bounce');setTimeout(()=>{$('#gameSceneEmoji')?.classList.remove('game-bounce');$('#gTarget')?.classList.remove('bubble-pop');$('.game-character-scene')?.classList.remove('bubble-blasting');if(isBubble)$('#gameSceneEmoji').textContent='🫧'},350);pulseGameMusicGood();if(isRace){raceRound=score;if(score>=words.length){raceWon=!raceOpponent||performance.now()-raceStartedAt+racePenaltyMs<raceOpponent.finish_ms;end(raceWon?(raceOpponent?`You beat ${raceOpponent.rival_name}!`:'You won the Keystroke Grand Prix!'):`${raceOpponent.rival_name} set the faster time`);return}}next()}
      else{streak=0;buffer='';$('#gStreak').textContent=streak;$('#gameFeedback').textContent='Not quite — try that word again.';paintTarget()}
    }
  };
  document.addEventListener('keydown',activeGameKeyHandler);paintTarget();
}

async function initializeBackend(){
  if (demoSignedIn) {
    user = demoAdminPreview
      ? {id:'demo-admin-preview',name:'ayaansh.atomic810@gmail.com',email:'ayaansh.atomic810@gmail.com',role:'admin',xp:860,gamePoints:740,grade:4,joined:[]}
      : { id: 'demo-ataf-student', name: 'Ava Learner', email: 'ava@ataf.demo', role: 'student', xp: 860, gamePoints: 740, grade: 4, joined: [] };
    if(demoAdminPreview){
      remoteProfiles=[
        {id:'demo-admin-preview',name:'Administrator',role:'admin',grade:1,xp:0,gamePoints:0},
        {id:'demo-student-1',name:'Avery Student',role:'student',grade:4,xp:425,gamePoints:180},
        {id:'demo-student-2',name:'Jordan Student',role:'student',grade:5,xp:680,gamePoints:320},
        {id:'demo-student-3',name:'Casey Student',role:'student',grade:3,xp:210,gamePoints:95},
        {id:'demo-teacher-1',name:'Morgan Teacher',role:'teacher',grade:1,xp:0,gamePoints:0}
      ];
      classes=[
        {id:'demo-class-1',name:'Room 12 Typing Club',grade:4,track:'Basic',description:'Practice and grow together.',studentChatEnabled:true,studentCommentsEnabled:true,teacherId:'demo-teacher-1',teacherName:'Morgan Teacher',code:'ATF412',members:['demo-teacher-1','demo-student-1','demo-student-2'],requests:[],membershipRows:[]},
        {id:'demo-class-2',name:'Keyboard Explorers',grade:3,track:'Intermediate',description:'Building typing fluency.',studentChatEnabled:false,studentCommentsEnabled:true,teacherId:'demo-teacher-1',teacherName:'Morgan Teacher',code:'ATF305',members:['demo-teacher-1','demo-student-3'],requests:[],membershipRows:[]}
      ];
      demoAssignments=[{id:'demo-assignment-1',title:'Home row accuracy practice',className:'Room 12 Typing Club',type:'assignment',createdAt:new Date(Date.now()-86400000).toISOString()}];
      demoAwards=[];
      demoReviewedCount=2;
    }
    xp = user.xp; gamePoints = user.gamePoints; save('user', user); save('xp', xp); save('gamePoints', gamePoints);
    document.body.classList.remove('auth-required');
    updateHeader(); renderProgressCard(); renderHomeLevels(); renderCurriculumPath(); renderLessons(); renderClasses(); renderLeaderboard(); renderGameBoards(); go(demoAdminPreview?'security':'home'); return;
  }
  renderAuthGate('signup');renderHomeLevels();renderCurriculumPath();document.body.classList.add('auth-required');renderLessons();renderClasses();renderLeaderboard();renderGameBoards();
  if(!supabaseReady){user=null;users=[];classes=[];remoteProfiles=[];xp=0;gamePoints=0;save('user',null);persist();console.warn('ATAF Supabase config missing. Configure config.js to enable real accounts and cloud data.');updateHeader();renderAuthGate('signup');return}
  const {data:{session}}=await supabaseClient.auth.getSession();if(session?.user){await syncAuthenticatedUser(session.user);if(user)go(user.role==='teacher'?'classes':'home')}else{user=null;users=[];classes=[];remoteProfiles=[];xp=0;gamePoints=0;save('user',null);persist();updateHeader();renderAuthGate('signup');renderClasses();renderLeaderboard();renderGameBoards()}
  supabaseClient.auth.onAuthStateChange((event,session)=>{setTimeout(async()=>{if(session?.user){await syncAuthenticatedUser(session.user);if(user)go(user.role==='teacher'?'classes':'home')}else if(event==='SIGNED_OUT'){user=null;classes=[];remoteProfiles=[];save('user',null);persist();updateHeader();renderAuthGate('signin');renderClasses();renderLeaderboard();renderGameBoards()}},0)});
}

initializeBackend();
