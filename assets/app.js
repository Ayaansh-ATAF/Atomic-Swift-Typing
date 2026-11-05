
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem('ataf_'+k))??d}catch{return d}};
const save=(k,v)=>localStorage.setItem('ataf_'+k,JSON.stringify(v));
const demoSignedIn = new URLSearchParams(window.location.search).get('demo') === 'authed';
let user=load('user',null), users=load('users',[]), classes=load('classes',[]), xp=load('xp',0), gamePoints=load('gamePoints',0), assignments=load('assignments',[]), classRole='student', boardMode='global';
const atafBot={name:'ATAFBot',emoji:'🤖',title:'Synth-powered typing coach',motto:'Powering up every keystroke.'};
let selectedLesson=0, selectedLessonStage=0, testDuration=60, testStarted=false, testDone=false, testStart=0, testTimer=null, checkpointGameActive=false, dictationEnabled=false, musicEnabled=true, pendingTrackAssessment=null, currentSurpriseTestAssignmentId=null, testRequiresFullDuration=false, completedTrackAssessments=new Set();
let gameMusicTimer=null, gameAudioContext=null;
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
 return {grade,track,stage:unitIndex+1,number:n,title,desc:`${theme[1]} from ${theme[0]} says: ${unit.tip} ${gradeCue}`,text,mascot:theme[1],mascotEmoji:theme[2],theme:theme[0],lessonNumber:n,unitNumber:unitIndex+1,unitLessonNumber:within+1,lessonKey:`g${grade}-${lessonTrackKey}-${String(n).padStart(2,'0')}`,focus:unit.focus,keys:unit.keys,checkpoint};
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
function go(page){if(!user){document.body.classList.add('auth-required');renderAuthGate(authMode);return}if(user.role==='teacher'&&page!=='classes'){page='classes';toast('Teacher accounts are limited to classroom management.')}if(page==='security'&&user.role!=='admin'){toast('Trusted admin access is required.');return}$$('.home,.dashboard').forEach(x=>x.classList.remove('active'));$('#page-'+page)?.classList.add('active');$$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));if(page==='lessons')renderLessons();if(page==='classes')renderClasses();if(page==='leaderboard')renderLeaderboard();if(page==='games')renderGameBoards();if(page==='tests')resetTest();if(page==='security')renderSecurityCases();window.scrollTo({top:0,behavior:'smooth'})}
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
  violet: { label: 'Violet Orbit', gradient: 'linear-gradient(135deg,#120b29,#8b5cf6,#f472b6)', coach: { name: 'Pixel the Wizard', emoji: '🧙' } }
};
const themeNames = Object.fromEntries(Object.entries(themeCatalog).map(([key, value]) => [key, value.label]));
function getThemeCoach(){return themeCatalog[load('theme','')]?.coach||themeCatalog[''].coach}
const gameCatalog = {
  rocket: { name: 'Rocket Words', emoji: '🚀', pointsPerWord: 10, words: ['rocket','planet','keyboard','comet','typing','galaxy','brave','spark','journey','wonder','quick','future','magic','school','bright'] },
  bubble: { name: 'Bubble Pop', emoji: '🫧', pointsPerWord: 12, words: ['bubble','river','cloud','glow','breeze','sunbeam','pop','drift','signal','spark','happy','fresh','mango','cabin','silver'] },
  dragon: { name: 'Dragon Dash', emoji: '🐉', pointsPerWord: 14, words: ['dragon','forest','flame','ember','quest','myth','sprint','gold','blaze','wild','crown','lunar','bloom','stone','storm'] },
  rain: { name: 'Letter Rain', emoji: '🌧️', pointsPerWord: 9, words: ['rain','drop','letter','cloud','storm','shine','flash','drip','stream','mist','light','march','sound','rhythm','quartz'] },
  wizard: { name: 'Word Wizard', emoji: '🧙', pointsPerWord: 13, words: ['magic','wizard','spell','portal','star','mystic','burst','lantern','dream','forest','rune','shield','sword','prism','quest'] },
  turbo: { name: 'Turbo Type', emoji: '🏎️', pointsPerWord: 15, words: ['turbo','velocity','boost','speed','zoom','trail','flight','signal','thunder','racer','delta','boost','orbit','momentum','pulse'] },
  meteor: { name: 'Meteor Match', emoji: '☄️', pointsPerWord: 12, words: ['meteor','orbit','crash','nova','fuse','flare','signal','meteorite','moon','glint','cosmic','blink','echo','trail','orbit'] },
  treasure: { name: 'Treasure Tap', emoji: '💎', pointsPerWord: 11, words: ['treasure','gold','map','cave','key','gem','pirate','island','coral','vault','coin','jewel','crown','harbor','stone'] },
  sky: { name: 'Sky Sprint', emoji: '✈️', pointsPerWord: 10, words: ['sky','cloud','wing','route','aero','flight','glide','horizon','chase','dawn','summit','wind','travel','gleam','skydive'] },
  garden: { name: 'Word Garden', emoji: '🌼', pointsPerWord: 11, words: ['garden','petal','sprout','bloom','meadow','pollen','seedling','sunflower','orchard','fern','daisy','willow','grove','nectar','blossom'] },
  ocean: { name: 'Ocean Explorer', emoji: '🐬', pointsPerWord: 13, words: ['ocean','dolphin','coral','current','seashell','whale','tidepool','seagrass','island','reef','sailor','harbor','wave','lagoon','deepsea'] },
  cipher: { name: 'Cipher Quest', emoji: '🔐', pointsPerWord: 15, words: ['cipher','decode','signal','pattern','sequence','puzzle','message','symbol','matrix','number','secret','logic','cipherkey','encrypt','solution'] }
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
  const currentTheme = themeNames[load('theme','')] || 'ATAF Midnight';
  const totalXp = Number(xp || 0);
  const levelMeta = getLevelMeta(totalXp);
  const streakState = getStreakState();
  const displayName = user ? user.name : atafBot.name;
  const isTeacher = user && user.role === 'teacher';
  const avatarName = isTeacher ? '🧑‍🏫' : (user ? (levelMeta.stage.emoji || atafBot.emoji) : atafBot.emoji);
  const titleText = isTeacher ? 'Teacher Mentor' : (user ? `${levelMeta.stage.title} Typist` : atafBot.title);
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
  if (avatarEl) avatarEl.textContent = avatarName;
  if (nameEl) nameEl.textContent = `${displayName} · ${titleText}`;
  if (badgeEl) badgeEl.textContent = levelLabel;
  if (themeEl) themeEl.textContent = currentTheme;
  if (statusEl) statusEl.textContent = `${statusText} • ${streakText}`;
  if (xpBarEl) xpBarEl.style.width = `${Math.min(100, levelMeta.progress)}%`;
  if (xpMetaEl) xpMetaEl.textContent = progressText;
  if (goalEl) goalEl.textContent = goalText;
  renderDailyChallenge();
  renderSkillBadges();
}

function getTodayKey(){
  return new Date().toISOString().slice(0, 10);
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
  const defaultState = { lastActiveDate: today, current: 1 };
  const state = load('typingStreak', defaultState);
  const lastDate = state?.lastActiveDate || today;
  const diffDays = Math.round((new Date(today) - new Date(lastDate)) / 86400000);
  let next = { ...defaultState, ...state, lastActiveDate: today };
  if (diffDays === 0) {
    next.current = Math.max(1, Number(next.current) || 1);
  } else if (diffDays === 1) {
    next.current = Math.max(1, Number(next.current) || 1) + 1;
  } else {
    next.current = 1;
  }
  save('typingStreak', next);
  return next;
}
function recordPracticeActivity(){
  const streakState = getStreakState();
  save('typingStreak', streakState);
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
function renderSkillBadges(){
  const completed = Array.isArray(load('completedLessons', [])) ? load('completedLessons', []).length : 0;
  const streak = getStreakState().current;
  const bestGame = Object.values(load('gameBestScores', {})).reduce((max, value) => Math.max(max, Number(value) || 0), 0);
  const badges = [
    { name: 'Home Row Hero', detail: 'Finish 1 lesson', earned: completed >= 1 },
    { name: 'Streak Starter', detail: `Keep a ${Math.max(1, streak)}-day streak`, earned: streak >= 1 },
    { name: 'Word Builder', detail: 'Reach 10 lessons', earned: completed >= 10 },
    { name: 'Steady Fingers', detail: 'Reach 25 lessons', earned: completed >= 25 },
    { name: 'Accuracy Ace', detail: 'Earn 250 XP', earned: (xp || 0) >= 250 },
    { name: 'Speed Star', detail: 'Hit 20 WPM or better', earned: (xp || 0) >= 400 },
    { name: 'Game Master', detail: `Top game score ${bestGame} pts`, earned: bestGame >= 100 },
    { name: 'Typing Legend', detail: 'Earn 750 XP', earned: (xp || 0) >= 750 }
  ];
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
function ensureGameAudioContext(){const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return null;if(!gameAudioContext)gameAudioContext=new Ctx();return gameAudioContext}
function playTone(freq,duration=0.18,type='sine',volume=0.04,delay=0){const ctx=ensureGameAudioContext();if(!ctx||!musicEnabled)return;const start=ctx.currentTime+delay;const osc=ctx.createOscillator();const gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,start);gain.gain.setValueAtTime(0.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+0.02);gain.gain.exponentialRampToValueAtTime(0.0001,start+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+duration+0.05)}
function startGameMusic(){if(!musicEnabled)return;const ctx=ensureGameAudioContext();if(!ctx)return;if(ctx.state==='suspended')ctx.resume();if(gameMusicTimer)return;const notes=[220,277,330,392,330,277,349,440];let step=0;gameMusicTimer=setInterval(()=>{const freq=notes[step%notes.length];playTone(freq,0.18,step%2===0?'square':'triangle',step%2===0?0.035:0.025);if(step%3===0)playTone(freq/2,0.2,'sine',0.02);step+=1;},320)}
function stopGameMusic(){if(gameMusicTimer){clearInterval(gameMusicTimer);gameMusicTimer=null}}
function pulseGameMusicGood(){if(!musicEnabled)return;playTone(523.25,0.12,'triangle',0.03);playTone(659.25,0.14,'sine',0.02,0.08)}
function setTheme(t){
  if(!Object.hasOwn(themeCatalog,t))t='';
  Object.keys(themeCatalog).filter(Boolean).forEach(theme=>document.body.classList.remove('theme-'+theme));
  if(t) document.body.classList.add('theme-'+t);
  save('theme',t);renderProgressCard();toast((themeNames[t]||'ATAF Midnight')+' theme applied')
}
setTheme(load('theme',''));
function modal(title,html){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;$('#modalBackdrop').classList.add('open')}
function closeModal(){stopGameMusic();$('#modalBackdrop').classList.remove('open')}
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
  $('#authPassword').autocomplete=signingIn?'current-password':'new-password';$('#authPassword').placeholder=signingIn?'Enter your password':'At least 8 characters';
  $('#authGateSubmit').textContent=signingIn?'Log in':'Create account';$('#authGateError').textContent='';
  const setup=$('#authSetupNotice');
  const providerButtons = [$('#googleSignInBtn')].filter(Boolean);
  if(!supabaseReady){setup.style.display='block';setup.innerHTML='Account access is not configured yet. Add your Supabase Project URL and publishable/anon key in <b>config.js</b>, then run <b>supabase/schema.sql</b> in your Supabase SQL Editor. Sign-up and log-in will be enabled after setup.';$('#authGateSubmit').disabled=true;$('#authName').disabled=true;$('#authEmail').disabled=true;$('#authPassword').disabled=true;$('#authSignupTab').disabled=true;$('#authSigninTab').disabled=true;providerButtons.forEach(button=>button.disabled=true);}
  else {setup.style.display='none';$('#authGateSubmit').disabled=false;$('#authName').disabled=false;$('#authEmail').disabled=false;$('#authPassword').disabled=false;$('#authSignupTab').disabled=false;$('#authSigninTab').disabled=false;providerButtons.forEach(button=>button.disabled=false);}
}

async function startOAuthProvider(providerKey){
  const map = { google:{label:'Google', provider:'google'} };
  const entry = map[providerKey];
  if(!entry){return}
  if(!supabaseReady || !supabaseClient){
    $('#authGateError').textContent='OAuth is not active yet. Add your Supabase project URL and anon key in config.js, then enable the provider in Supabase Auth.';
    return;
  }
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  try {
    const {data,error} = await supabaseClient.auth.signInWithOAuth({
      provider: entry.provider,
      options: { redirectTo, queryParams: { prompt: 'select_account' } }
    });
    if(error) throw error;
    if(data?.url){ window.location.assign(data.url); return; }
    toast(entry.label + ' sign-in is ready.');
  } catch(err){
    const msg = err.message || 'OAuth sign-in failed.';
    $('#authGateError').textContent = msg;
    toast(msg);
  }
}

$('#authSignupTab').onclick=()=>renderAuthGate('signup');$('#authSigninTab').onclick=()=>renderAuthGate('signin');
$('#googleSignInBtn').onclick=()=>startOAuthProvider('google');
$('#authGateForm').onsubmit=async e=>{
  e.preventDefault();if(!supabaseReady){renderAuthGate(authMode);return}
  const f=new FormData(e.currentTarget),email=String(f.get('email')||'').trim().toLowerCase(),password=String(f.get('password')||''),name=String(f.get('name')||'').trim();
  const submit=$('#authGateSubmit');submit.disabled=true;submit.textContent=authMode==='signin'?'Logging in…':'Creating account…';$('#authGateError').textContent='';
  try{
    if(authMode==='signup'){
      const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{display_name:name||'Typist'},emailRedirectTo:location.origin}});if(error)throw error;
      if(!data.session){$('#authGateError').textContent='Account created. Check your email to confirm your address, then log in here.';submit.disabled=false;submit.textContent='Create account';return}
      await syncAuthenticatedUser(data.user);if(!user)throw new Error('Your account was created, but the profile is not ready yet. Check that supabase/schema.sql has been run.');go(user.role==='teacher'?'classes':'home');toast('Account created securely!');
    } else {
      const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});if(error)throw error;
      await syncAuthenticatedUser(data.user);if(!user)throw new Error('Your profile could not be loaded. Check the Supabase schema.');go(user.role==='teacher'?'classes':'home');toast('Welcome back, '+user.name+'!');
    }
  }catch(err){$('#authGateError').textContent=err.message||'Could not authenticate. Please try again.';submit.disabled=false;submit.textContent=authMode==='signin'?'Log in':'Create account'}
};
function applyRoleAccess(){
  const teacher=user?.role==='teacher';
  $$('.nav button').forEach(b=>{b.style.display=teacher?(b.dataset.page==='classes'?'':'none'):''});
  $$('[data-admin-only]').forEach(item=>{item.style.display=user?.role==='admin'?'':'none'});
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
  try { const {data,error}=await supabaseClient.from('profiles').select('id,display_name,role,grade,xp,game_points').eq('id',authUser.id).single(); if(error) throw error; profile=data; }
  catch(err){ console.error('Could not load ATAF profile',err); toast('Signed in, but profile setup needs attention. Run the Supabase schema SQL.'); }
  const selectedRole = resolveOAuthRole(profile);
  user={id:authUser.id,name:profile?.display_name || authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'Typist',email:authUser.email,role:selectedRole,xp:profile?.xp || 0,gamePoints:profile?.game_points || 0,grade:profile?.grade || 1,joined:[]};
  xp=user.xp; gamePoints=user.gamePoints; users=users.filter(u=>u.id!==user.id); users.push(user); save('user',user); persist(); updateHeader(); renderClasses(); renderLeaderboard(); renderGameBoards();
}
function accountForm(mode='signup'){
  if(!supabaseReady){modal('Connect Supabase first',`<p>Real password accounts are not enabled yet because this deployment has no Supabase configuration.</p><p class="muted">Open <b>config.js</b> and add your Supabase Project URL and publishable/anon key, then run <b>supabase/schema.sql</b> in the Supabase SQL Editor.</p><button class="btn primary" data-dismiss-modal>Got it</button>`);return}
  modal(mode==='signin'?'Sign in to ATAF Typing':'Create your ATAF account',`<form id="accountForm">${mode==='signup'?`<div class="field"><label>DISPLAY NAME</label><input name="name" required maxlength="60" placeholder="e.g. Alex"></div>`:''}<div class="field"><label>EMAIL</label><input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></div><div class="field"><label>PASSWORD</label><input name="password" type="password" required minlength="8" autocomplete="${mode==='signin'?'current-password':'new-password'}" placeholder="At least 8 characters"></div>${mode==='signin'?`<button type="button" class="ghost" id="forgotPassword">Forgot password?</button>`:''}<p id="authError" class="muted" role="status" style="font-size:12px"></p><button class="btn primary" style="width:100%" type="submit">${mode==='signin'?'Sign in securely':'Create account'}</button><p class="muted" style="font-size:12px;margin-top:12px">${mode==='signin'?`New here? <a href="#" id="switchAuth">Create an account</a>`:`Already have an account? <a href="#" id="switchAuth">Sign in</a>`}</p></form>`);
  $('#switchAuth').onclick=e=>{e.preventDefault();accountForm(mode==='signin'?'signup':'signin')};
  if($('#forgotPassword')) $('#forgotPassword').onclick=async()=>{const email=$('#accountForm').elements.email.value.trim();if(!email){$('#authError').textContent='Enter your email first.';return}const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin});$('#authError').textContent=error?error.message:'If an account exists for that email, a password reset link will be sent.'};
  $('#accountForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),email=String(f.get('email')).trim().toLowerCase(),password=String(f.get('password')),name=String(f.get('name')||'').trim(),submit=e.target.querySelector('[type="submit"]');submit.disabled=true;submit.textContent='Please wait…';$('#authError').textContent='';
    try{
      if(mode==='signup'){
        const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{display_name:name || 'Typist'},emailRedirectTo:location.origin}});if(error)throw error;
        if(!data.session){$('#authError').textContent='Account created. Check your email to confirm your address, then sign in.';submit.disabled=false;submit.textContent='Create account';return}
        await syncAuthenticatedUser(data.user);closeModal();toast('Account created securely!');go('home');
      } else {
        const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});if(error)throw error;await syncAuthenticatedUser(data.user);closeModal();toast('Welcome back, '+user.name+'!');go('home');
      }
    }catch(err){$('#authError').textContent=err.message || 'Could not authenticate. Please try again.';submit.disabled=false;submit.textContent=mode==='signin'?'Sign in securely':'Create account'}
  };
}
$('#signInBtn').onclick=()=>{if(!user){document.body.classList.add('auth-required');renderAuthGate('signin')}else modal('Your account',`<p>Signed in as <b>${esc(user.name)}</b> (${esc(user.role)}).</p><p class="muted">Personal XP: ${xp} · Game points: ${gamePoints}</p><button class="btn" id="signOutBtn">Sign out</button>`)};
$('#accountBtn').onclick=()=>user?modal('Your account',`<p>Signed in as <b>${esc(user.name)}</b> (${esc(user.role)}).</p><p class="muted">Personal XP: ${xp} · Game points: ${gamePoints}</p><button class="btn" id="signOutBtn">Sign out</button>`):(document.body.classList.add('auth-required'),renderAuthGate('signup'));
document.addEventListener('click',async e=>{if(e.target && e.target.id==='signOutBtn'){if(supabaseClient){const {error}=await supabaseClient.auth.signOut();if(error){toast(error.message);return}}user=null;classes=[];remoteProfiles=[];save('user',null);persist();updateHeader();closeModal();renderAuthGate('signin');toast('Signed out.')}});
// Authentication initialization is handled by initializeBackend() below.
function updateHeader(){if(user){document.body.classList.remove('auth-required');$('#signInBtn').textContent=user.name;$('#accountBtn').textContent='My account ▾';applyRoleAccess();renderProgressCard()}else{document.body.classList.add('auth-required');$('#signInBtn').textContent='Sign in';$('#accountBtn').textContent='Create account ↗';$$('.nav button').forEach(b=>b.style.display='');$$('[data-admin-only]').forEach(item=>item.style.display='none');renderProgressCard();}}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function ensureUser(){if(!user){document.body.classList.add('auth-required');renderAuthGate('signup');return false}return true}
function renderHomeLevels(){$('#homeLevels').innerHTML=gradeNumbers.map((g,i)=>`<div class="feature-card" data-lesson="${lessonData.findIndex(l=>l.grade===g)}"><div class="feature-icon">${['🌱','🧭','🧩','⚡','🚀','🏆','📚','🔭','🎓'][i]}</div><h3>${gradeOrdinal(g)} grade</h3><p>600 lessons · 30 units</p><p class="muted">Target: ${gradeTargets[g].wpm} WPM · ${gradeTargets[g].cpm} CPM</p><span class="text-link">Start level →</span></div>`).join('');$$('[data-lesson]').forEach(b=>b.onclick=()=>{selectedLesson=+b.dataset.lesson;go('lessons')})}
function renderCurriculumPath(){$('#curriculumPath').innerHTML=gradeNumbers.map((g,i)=>{const gradeLessons=lessonData.map((lesson,index)=>({lesson,index})).filter(item=>item.lesson.grade===g),done=gradeLessons.filter(item=>load('completedLessons',[]).includes(item.index)).length;return `<button class="path-step" data-path-grade="${g}"><span class="path-number">${['🌱','🧭','🧩','⚡','🚀','🏆','📚','🔭','🎓'][i]}</span><b>${gradeOrdinal(g)} grade</b><small>${done}/600 lessons</small><small>200 Beginner · 200 Intermediate · 200 Master</small></button>`}).join('');$$('[data-path-grade]').forEach(b=>b.onclick=()=>{selectedLesson=lessonData.findIndex(l=>l.grade===+b.dataset.pathGrade);go('lessons')})}
renderProgressCard();
function buildLessonStages(lesson){
  const wordRow = lesson.text;
  const challengeText = `${lesson.text} ${lesson.text}`.slice(0, 140);
  const keyList = Array.from(new Set((lesson.keys || 'abcdefghijklmnopqrstuvwxyz').toLowerCase().replace(/[^a-z]/g, '').split(''))).slice(0, 6);
  return [
    {id:'intro', label:'Intro', explanation:`Meet ${lesson.mascot}. ${lesson.desc}`, prompt: lesson.text, keyCards: ['Warm-up', 'Keep eyes on the text', 'Use relaxed wrists']},
    {id:'keys', label:'Key focus', explanation:`Focus on ${keyList.join(' • ')}. ${lesson.focus}`, prompt: `${keyList.join(' ')} ${keyList.join(' ')}`.slice(0, 80), keyCards: keyList.map(ch => ({letter: ch.toUpperCase(), tip: `Use ${ch.toUpperCase()} with the correct finger.`}))},
    {id:'words', label:'Word build', explanation:'Build confidence with short words before sentences.', prompt: `${wordRow}`, keyCards: ['Word bank', 'Full words', 'Slow down and space correctly']},
    {id:'sentences', label:'Sentence line', explanation:'Type with a smooth rhythm and correct spacing.', prompt: challengeText, keyCards: ['Look ahead', 'Stay relaxed', 'Finish the whole line']},
    {id:'timed', label:'Timed drill', explanation:'Try the same sentence again at a steady pace.', prompt: challengeText.split(' ').slice(0, 12).join(' '), keyCards: ['Steady pace', 'Check accuracy', 'Finish without rushing']},
    {id:'review', label:'Review', explanation:'Repeat the pattern and return fingers to home row.', prompt: `${lesson.keys.slice(0, 16)} ${lesson.keys.slice(0, 16)}`.slice(0, 120), keyCards: ['Home row', 'Smooth return', 'Accuracy first']},
    {id:'mini', label:'Mini challenge', explanation:'Build speed with a short game-style challenge.', prompt: lesson.text, keyCards: ['Short burst', 'Minimal errors', 'Keep rhythm']},
    {id:'passage', label:'Passage', explanation:'Use a longer line to strengthen fluency and control.', prompt: challengeText, keyCards: ['Longer text', 'Watch spacing', 'Stay consistent']},
    {id:'dictation', label:'Dictation', explanation:'Listen to the sentence pattern and type the words in order.', prompt: challengeText, keyCards: ['Listen', 'Type carefully', 'Check with the text']},
    {id:'checkpoint', label:'Checkpoint', explanation:'Finish the lesson with a confidence-building review set.', prompt: challengeText, keyCards: ['Final review', 'Accuracy target', 'Ready for challenge']}
  ];
}
function isTrackUnlocked(grade,track,completed=load('completedLessons',[])){
  if(user?.role==='teacher'||user?.role==='admin'||track==='Basic')return true;
  const prerequisite=track==='Intermediate'?'Basic':'Intermediate';
  const prerequisiteIndexes=lessonData.map((lesson,index)=>({lesson,index}))
    .filter(item=>item.lesson.grade===grade&&item.lesson.track===prerequisite);
  return prerequisiteIndexes.length===200&&prerequisiteIndexes.every(item=>completed.includes(item.index))&&completedTrackAssessments.has(`${grade}-${prerequisite}`);
}
function renderLessons(){
  $('#xpPill').textContent='⭐ '+xp+' XP';
  const completed=load('completedLessons',[]);
  let activeLesson=lessonData[selectedLesson]||lessonData[0];
  if(!isTrackUnlocked(activeLesson.grade,activeLesson.track,completed)){
    selectedLesson=lessonData.findIndex(lesson=>lesson.grade===activeLesson.grade&&lesson.track==='Basic');
    activeLesson=lessonData[selectedLesson];
  }
  saveResumeState(selectedLesson, selectedLessonStage);
  const stageTabs=buildLessonStages(activeLesson);
  const stage=stageTabs[Math.min(selectedLessonStage, stageTabs.length - 1)];
  const coach=getThemeCoach();
  const coachTips=[
    `${stage.explanation||activeLesson.focus} ${activeLesson.desc}`,
    `Key strategy: ${activeLesson.focus}. Use the matching finger, then bring it back to the home row.`,
    'Posture check: sit back with your feet supported, relax your shoulders, and keep your wrists level.',
    'Go slowly enough to stay accurate. Look a little ahead, use a light touch, and let speed grow with practice.'
  ];
  const lessonStars = getLessonStars(selectedLesson);
  const trackLessons=lessonData.map((lesson,index)=>({lesson,index})).filter(item=>item.lesson.grade===activeLesson.grade&&item.lesson.track===activeLesson.track);
  const unitMarkup=Array.from({length:10},(_,unitIndex)=>{
    const unitLessons=trackLessons.filter(item=>item.lesson.unitNumber===unitIndex+1);
    const unitDone=unitLessons.filter(item=>completed.includes(item.index)).length;
    return `<details class="lesson-unit" ${unitIndex===activeLesson.unitNumber-1?'open':''}><summary><span><b>Unit ${unitIndex+1} · ${unitLessons[0]?.lesson.title.split(': ')[0].replace(/^\d+ · /,'')||'Typing skills'}</b><small>${unitDone}/20 lessons · ${Math.round(unitDone/20*100)}% complete</small></span><i>${unitDone===20?'✓':'+'}</i></summary><div class="lesson-unit-list">${unitLessons.map(({lesson,index})=>`<button class="${index===selectedLesson?'selected':''}" data-li="${index}"><b>${completed.includes(index)?'✓ ':''}${lesson.title}</b><small>Lesson ${lesson.unitLessonNumber} of 20${lesson.checkpoint?' · Checkpoint':''}</small></button>`).join('')}</div></details>`;
  }).join('');
  $('#lessonNav').innerHTML=`<div class="field"><label>GRADE</label><select id="lessonGradeFilter">${gradeNumbers.map(g=>`<option value="${g}" ${g===activeLesson.grade?'selected':''}>Grade ${g}</option>`).join('')}</select></div><div class="toolbar">${['Basic','Intermediate','Master'].map(track=>{const locked=!isTrackUnlocked(activeLesson.grade,track,completed);return `<button class="btn small ${activeLesson.track===track?'selected':''} ${locked?'locked':''}" data-track-filter="${track}" aria-disabled="${locked}">${trackLabel(track)}${locked?' 🔒':''}</button>`}).join('')}</div><div class="lesson-nav-summary"><b>${trackLabel(activeLesson.track)}: 200 lessons</b><span>10 units · 20 lessons each</span></div>${unitMarkup}`;
  $('#lessonGradeFilter').onchange=e=>{const grade=+e.target.value;const nextTrack=isTrackUnlocked(grade,activeLesson.track,completed)?activeLesson.track:'Basic';selectedLesson=lessonData.findIndex(l=>l.grade===grade&&l.track===nextTrack);selectedLessonStage=0;saveResumeState(selectedLesson, selectedLessonStage);renderLessons()};$$('[data-track-filter]').forEach(b=>b.onclick=()=>{if(!isTrackUnlocked(activeLesson.grade,b.dataset.trackFilter,completed)){const prerequisite=b.dataset.trackFilter==='Master'?'Intermediate':'Beginner';toast(`Finish all 200 ${prerequisite} lessons and its one-minute test in this grade to unlock ${trackLabel(b.dataset.trackFilter)}.`);return}selectedLesson=lessonData.findIndex(l=>l.grade===activeLesson.grade&&l.track===b.dataset.trackFilter);selectedLessonStage=0;saveResumeState(selectedLesson, selectedLessonStage);renderLessons()});$$('[data-li]').forEach(b=>b.onclick=()=>{selectedLesson=+b.dataset.li;selectedLessonStage=0;saveResumeState(selectedLesson, selectedLessonStage);renderLessons()});
  const gradeLabel=gradeOrdinal(activeLesson.grade);
  const keyRows=['qwertyuiop','asdfghjkl;','zxcvbnm'];
  $('#lessonContent').innerHTML=`  <div class="lesson-topline"><div class="lesson-kicker">✦ ${gradeLabel.toUpperCase()} GRADE · ${trackLabel(activeLesson.track).toUpperCase()} PATH · UNIT ${activeLesson.unitNumber}/10</div><span class="lesson-status">${completed.includes(selectedLesson)?'✓ COMPLETED':'● UNIT LESSON '+activeLesson.unitLessonNumber+'/20'}</span></div>
  <h2 class="lesson-title">${activeLesson.title}</h2><p class="lesson-desc">${activeLesson.desc}</p>
  ${renderLessonStars(lessonStars)}
  <section class="mascot-coach" aria-label="${esc(coach.name)} lesson guide"><span class="mascot-face" aria-hidden="true">${esc(coach.emoji)}</span><div class="mascot-coach-content"><b>${esc(coach.name)} · Your typing guide</b><p id="lessonCoachMessage" aria-live="polite">${esc(coachTips[0])}</p><div class="mascot-coach-actions"><button class="btn small" id="lessonCoachNext" type="button">Another tip</button><button class="btn small" id="lessonCoachSpeak" type="button">🔊 Hear tip</button></div></div></section>
  <div class="lesson-tab-list">${stageTabs.map((tab, idx)=>`<button class="lesson-tab ${idx===selectedLessonStage?'active':''}" data-stage-index="${idx}">${tab.label}</button>`).join('')}</div>
  <div class="lesson-focus"><b>Stage focus:</b> ${esc(stage.explanation || activeLesson.focus)}</div>
  <div class="lesson-key-guide">${(stage.keyCards||[]).map(item=>typeof item === 'string' ? `<div class="lesson-key-card"><strong>✦</strong><span>${esc(item)}</span></div>` : `<div class="lesson-key-card"><strong>${esc(item.letter || 'Key')}</strong><span>${esc(item.tip || 'Typing tip')}</span></div>`).join('')}</div>
  <div class="lesson-progress-track"><span id="lessonProgressFill" style="width:0%"></span></div>
  <div class="lesson-prompt-box"><div class="lesson-prompt-label"><span>TYPE THE TEXT BELOW</span><span id="lessonPromptCount">0 / ${stage.prompt.length} CHARACTERS</span></div><div class="practice-text" id="lessonPrompt" aria-live="polite"></div></div>
  <input class="typing-input" id="lessonInput" maxlength="${stage.prompt.length}" placeholder="Type all the way to the end. Mistakes are okay—keep going!" aria-label="Lesson typing input" spellcheck="false" autocapitalize="off" autocomplete="off">
  <div class="stats lesson-metrics"><div class="stat-card"><small>ACCURACY</small><strong id="lessonAccuracy">100%</strong></div><div class="stat-card"><small>CHARACTERS</small><strong id="lessonChars">0</strong></div><div class="stat-card"><small>CHARACTERS / MIN</small><strong id="lessonCpm">0 <small>CPM</small></strong></div><div class="stat-card"><small>WORDS / MIN</small><strong id="lessonWpm">0 <small>WPM</small></strong></div></div><div class="lesson-focus" style="margin-top:10px"><b>Grade ${activeLesson.grade} recommended target:</b> ${gradeTargets[activeLesson.grade].wpm} WPM · ${gradeTargets[activeLesson.grade].cpm} CPM · ${gradeTargets[activeLesson.grade].accuracy} accuracy <span class="muted">(practice goal, not a pass/fail rule)</span></div>
  <div class="virtual-keyboard"><div class="keyboard-heading"><b>⌨️ Virtual keyboard</b><span>Blue underline = home row · Red = next key · colored keys = finger guide</span></div>${keyRows.map(row=>`<div class="vk-row">${row.split('').map(ch=>`<button class="vk-key ${fingerMap[ch.toLowerCase()] || ''} ${'asdfjkl;'.includes(ch)?'home-key':''}" data-vkey="${ch}" aria-label="Type ${ch}">${ch.toUpperCase()}</button>`).join('')}</div>`).join('')}<div class="vk-row"><button class="vk-key space-key" data-vkey=" ">SPACE</button></div></div>
  <div class="lesson-actions"><span class="muted" id="lessonAutoStatus">⌨️ Keep going if you make a mistake—no need to backspace. Finish the whole line!</span><button class="btn" id="clearLesson">↻ Try again</button><button class="btn" id="nextLesson">Skip to next →</button></div>
  <div class="lesson-tip"><span>💡</span><div><b>Typing tip</b><br>Keep your wrists relaxed, return your fingers to the home row, and focus on accuracy before speed.</div></div>`;
  let coachTipIndex=0;
  $('#lessonCoachNext').onclick=()=>{
    coachTipIndex=(coachTipIndex+1)%coachTips.length;
    $('#lessonCoachMessage').textContent=coachTips[coachTipIndex];
  };
  $('#lessonCoachSpeak').onclick=()=>{
    if(!('speechSynthesis' in window)||typeof window.SpeechSynthesisUtterance!=='function'){
      toast('Audio guidance is not available in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new window.SpeechSynthesisUtterance($('#lessonCoachMessage').textContent));
  };
  window.speechSynthesis?.cancel();
  const prompt=$('#lessonPrompt'), inp=$('#lessonInput');
  let lessonFinished=false,lessonStartTime=0;
  function paint(){const val=inp.value;if(val.length&&!lessonStartTime)lessonStartTime=Date.now();let correct=0;let html='';for(let i=0;i<stage.prompt.length;i++){const ch=stage.prompt[i],typed=val[i];let cls='char';if(typed!==undefined){if(typed===ch){cls+=' done';correct++}else cls+=' missed'}else if(i===val.length)cls+=' current';html+=`<span class="${cls}">${ch===' '?'&nbsp;':esc(ch)}</span>`}prompt.innerHTML=html;$('#lessonChars').textContent=val.length;$('#lessonPromptCount').textContent=`${Math.min(val.length,stage.prompt.length)} / ${stage.prompt.length} CHARACTERS`;$('#lessonAccuracy').textContent=(val.length?Math.round(correct/val.length*100):100)+'%';const elapsedMinutes=lessonStartTime?Math.max((Date.now()-lessonStartTime)/60000,1/60):0;const cpm=elapsedMinutes?Math.round(correct/elapsedMinutes):0;const wpm=elapsedMinutes?Math.round((correct/5)/elapsedMinutes):0;$('#lessonCpm').innerHTML=cpm+' <small>CPM</small>';$('#lessonWpm').innerHTML=wpm+' <small>WPM</small>';$('#lessonProgressFill').style.width=Math.min(100,val.length/stage.prompt.length*100)+'%';
  const nextKey = stage.prompt[val.length]?.toLowerCase();
  $$('.vk-key').forEach(k=>{const keyValue=(k.dataset.vkey||'').toLowerCase();k.classList.toggle('next-key', keyValue===nextKey);k.classList.toggle('home-key', keyValue && 'asdfjkl;'.includes(keyValue)); const finger = fingerMap[keyValue] || '';
    if (finger) k.classList.add(finger);
    else k.classList.remove('left-pinky','left-ring','left-middle','left-index','right-index','right-middle','right-ring','right-pinky','space');
  });
    if(!lessonFinished&&val.length>=stage.prompt.length){lessonFinished=true;inp.disabled=true;completeLessonAutomatically()}
  }
  async function completeLessonAutomatically(){
    let done=load('completedLessons',[]),wasDone=done.includes(selectedLesson);
    const finalElapsed=Math.max((Date.now()-(lessonStartTime||Date.now()))/60000,1/60);const finalCorrect=[...stage.prompt].filter((ch,i)=>inp.value[i]===ch).length;const finalAccuracy=Math.round(finalCorrect/stage.prompt.length*100),finalCpm=Math.round(finalCorrect/finalElapsed),finalWpm=Math.round((finalCorrect/5)/finalElapsed);
    let bonusStars = 1;
    if (finalAccuracy >= 98 && finalWpm >= 18) bonusStars = 3;
    else if (finalAccuracy >= 90 || finalWpm >= 10) bonusStars = 2;
    if(!wasDone){done.push(selectedLesson);save('completedLessons',done);setLessonStars(selectedLesson, bonusStars);xp+=25;updateDailyGoalProgress(25);recordPracticeActivity();if(user){user.xp=xp;user.grade=Math.max(user.grade||1,activeLesson.grade)}persist()} else { setLessonStars(selectedLesson, Math.max(getLessonStars(selectedLesson), bonusStars)); }
    const coachingTip=finalAccuracy>=98?'Excellent accuracy! Keep the same relaxed finger movements.':finalAccuracy>=90?'Good effort! Next time, watch the highlighted keys and aim for a few more correct characters.':'Keep practicing slowly. Look at the target letters, use the suggested fingers, and focus on accuracy before speed.';$('#lessonAutoStatus').textContent=`🎉 Lesson complete! ${finalWpm} WPM · ${finalCpm} CPM · ${finalAccuracy}% accuracy. Tip: ${coachingTip}`;toast(wasDone?`Lesson complete: ${finalWpm} WPM · ${finalAccuracy}% accuracy`:`Lesson complete! ${finalWpm} WPM · ${finalAccuracy}% accuracy · +25 XP 🌟`);
    renderHomeLevels();renderCurriculumPath();renderProgressCard();renderLessons();
    if(user&&supabaseReady){const {data,error}=await supabaseClient.rpc('complete_typing_lesson',{p_grade:activeLesson.grade,p_track:activeLesson.track,p_lesson_key:activeLesson.lessonKey});if(error)toast('Saved on this device; cloud sync issue: '+error.message);else await refreshRemoteData()}
    if(activeLesson.checkpoint){setTimeout(()=>{modal('🎮 '+activeLesson.theme+' checkpoint!',`<div class="game-art" style="font-size:46px">${activeLesson.mascotEmoji}</div><h3>${activeLesson.mascot} says: mission complete!</h3><p>You finished the ${trackLabel(activeLesson.track)} unit ${activeLesson.unitNumber}, lesson ${activeLesson.unitLessonNumber} of 20. Time for your checkpoint game!</p><p class="muted">Play a 30-second typing game to celebrate your progress.</p><button class="btn primary" id="checkpointPlay">Play checkpoint game</button> <button class="btn" id="checkpointLater">Not now</button>`);$('#checkpointPlay').onclick=()=>{closeModal();checkpointGameActive=true;startGame(['rocket','bubble','dragon','rain','wizard','turbo'][(activeLesson.grade-1)%6],true)};$('#checkpointLater').onclick=()=>{closeModal();advanceLesson()};},350)}else setTimeout(advanceLesson,3500);
  }
  function advanceLesson(){
    if(activeLesson.lessonNumber===200&&!completedTrackAssessments.has(`${activeLesson.grade}-${activeLesson.track}`)){
      modal('🏁 Level complete!',`<h3>You finished all 200 ${trackLabel(activeLesson.track)} lessons for Grade ${activeLesson.grade}!</h3><p>Take the required one-minute typing test to check your accuracy and speed.</p><button class="btn primary" id="trackFinalTest">Start 1-minute test</button>`);
      $('#trackFinalTest').onclick=()=>{closeModal();pendingTrackAssessment={grade:activeLesson.grade,track:activeLesson.track};testRequiresFullDuration=true;testDuration=60;$$('[data-duration]').forEach(button=>button.classList.toggle('selected',Number(button.dataset.duration)===60));resetTest();go('tests')};
      return;
    }
    const currentPosition=lessonSequence.indexOf(selectedLesson);
    if(currentPosition>=0&&currentPosition<lessonSequence.length-1){selectedLesson=lessonSequence[currentPosition+1];selectedLessonStage=0;saveResumeState(selectedLesson, selectedLessonStage);renderLessons()}
    else toast('You completed all 5,400 Atomic Typing lessons! Incredible work!');
  }
  inp.addEventListener('input',paint);
  inp.addEventListener('keyup',e=>{if(e.key==='Backspace'||e.key==='Delete'||e.key.startsWith('Arrow'))paint()});
  inp.addEventListener('beforeinput',e=>{if(e.inputType==='deleteContentBackward'||e.inputType==='deleteContentForward')requestAnimationFrame(paint)});
  paint();inp.focus();
  $$('[data-vkey]').forEach(k=>k.onclick=()=>{if(inp.disabled)return;inp.focus();const key=k.dataset.vkey;const start=inp.selectionStart,end=inp.selectionEnd;inp.setRangeText(key,start,end,'end');inp.dispatchEvent(new Event('input'))});
  $('#clearLesson').onclick=()=>{if(lessonFinished)return;inp.value='';inp.focus();paint()};
  $('#nextLesson').onclick=()=>{advanceLesson()};
  $$('.lesson-tab').forEach(button => button.onclick = () => { selectedLessonStage = Number(button.dataset.stageIndex); saveResumeState(selectedLesson, selectedLessonStage); renderLessons(); });
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
function updateTest(){let val=$('#testInput').value,txt=$('#testPrompt').textContent,correct=0;for(let i=0;i<Math.min(val.length,txt.length);i++)if(val[i]===txt[i])correct++;let elapsed=testStarted?Math.max(1,(Date.now()-testStart)/1000):0;const cpm=elapsed?Math.round(correct/(elapsed/60)):0;$('#testCpm').innerHTML=cpm+' <small>CPM</small>';$('#testWpm').innerHTML=Math.round(cpm/5)+' <small>WPM</small>';$('#testAccuracy').textContent=(val.length?Math.round(correct/val.length*100):100)+'%';if(testStarted)$('#timeLeft').textContent=Math.max(0,Math.ceil(testDuration-elapsed))+'s';if(testStarted&&elapsed>=testDuration)finishTest()}
$('#testInput').addEventListener('input',()=>{if(testDone)return;if(!testStarted){testStarted=true;testStart=Date.now();testTimer=setInterval(updateTest,250)}updateTest()});
function demoPeople(){let base=[{name:'Skyler',xp:1280,gamePoints:950},{name:'Jordan',xp:1040,gamePoints:820},{name:'Taylor',xp:875,gamePoints:780},{name:'Riley',xp:710,gamePoints:600},{name:'Casey',xp:530,gamePoints:420}];if(user)base.push({name:user.name,xp,gamePoints});return base}
function rowsBoard(list,field){list.sort((a,b)=>(b[field]||0)-(a[field]||0));return list.map((p,i)=>`<div class="leader-row"><div class="rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${['🥇','🥈','🥉'][i]||('#'+(i+1))}</div><div class="person"><b>${esc(p.name)}${user&&p.name===user.name?' (you)':''}</b><small>${i===0?'Top typist':i===1?'Rising star':i===2?'Great progress':'Keep it up!'}</small></div><div class="points">${p[field]||0} pts</div></div>`).join('')}
function renderLeaderboard(){let mode=boardMode;let list=demoPeople(),field=mode==='games'||mode==='classgames'?'gamePoints':'xp';if(mode==='class'||mode==='classgames'){let cl=classes.find(c=>user&&c.members.includes(user.id));list=cl?cl.members.map(id=>{let u=users.find(x=>x.id===id);return u?{name:u.name,xp:u.xp||0,gamePoints:u.gamePoints||0}:null}).filter(Boolean):[];if(!list.length)list=[{name:'Your class is waiting',xp:0,gamePoints:0}]}$('#mainLeaderboard').innerHTML=rowsBoard(list,field)||'<div class="empty">Join a class to see its leaderboard.</div>'}
$$('[data-board]').forEach(b=>b.onclick=()=>{boardMode=b.dataset.board;$$('[data-board]').forEach(x=>x.classList.toggle('selected',x===b));renderLeaderboard()});
function renderGameBoards(){
  const gameKey = selectedGame || 'rocket';
  const gameBestScores = load('gameBestScores', {});
  const globalList = (remoteProfiles.length ? remoteProfiles : demoPeople()).map(p => ({
    name: p.name,
    gamePoints: Number((p.gameScores && p.gameScores[gameKey]) || p.gamePoints || 0)
  })).sort((a, b) => (b.gamePoints || 0) - (a.gamePoints || 0));
  $('#gameGlobalBoard').innerHTML = globalList.length ? rowsBoard(globalList,'gamePoints') : '<div class="empty">Game rankings appear after players finish games.</div>';
  const cl = classes.find(c => user && c.members.includes(user.id));
  const members = cl ? cl.members.map(id => (remoteProfiles.find(p => p.id === id) || users.find(u => u.id === id))).filter(Boolean).map(p => ({
    name: p.name,
    gamePoints: Number((p.gameScores && p.gameScores[gameKey]) || p.gamePoints || 0)
  })) : [];
  $('#gameClassBoard').innerHTML = members.length ? rowsBoard(members,'gamePoints') : '<div class="empty">Join a class to see class game rankings.</div>';
  $$('.game-card').forEach(card => {
    const key = card.dataset.gameKey || 'rocket';
    const best = Number(gameBestScores[key] || 0);
    const bestEl = card.querySelector('.game-best');
    if (bestEl) bestEl.textContent = `Best: ${best} pts`;
  });
  const selector = $('#gameSelector');
  if (selector) selector.value = gameKey;
  const boardSelector = $('#gameBoardSelector');
  if (boardSelector) boardSelector.value = gameLeaderboardMode;
}

$('#gameSelector')?.addEventListener('change', (event) => {
  selectedGame = event.target.value || 'rocket';
  renderGameBoards();
});
$('#gameBoardSelector')?.addEventListener('change', (event) => {
  gameLeaderboardMode = event.target.value || 'global';
  renderGameBoards();
});
function renderAssignments(){
  if(!$('#assignmentsList')) return;
  $('#assignmentsList').innerHTML='<div class="empty">Assignments and feedback are posted inside each classroom so teachers can manage them for the right students.</div>';
}
function renderClasses(){let mine=classes.filter(c=>classRole==='teacher'?user&&c.teacherId===user.id:true);$('#classesList').innerHTML=mine.length?mine.map(c=>`<div class="class-card"><div class="eyebrow">CLASSROOM · ${esc(c.code)}</div><h3>${esc(c.name)}</h3><div class="class-meta">Teacher: ${esc(c.teacherName)} · Grade ${c.grade} · ${trackLabel(c.track||'Basic')} · ${c.members.length} students</div><p class="muted">${esc(c.description||'A place to practice, play, and grow together.')}</p><div class="class-actions"><button class="btn small" onclick="requestJoin('${c.id}')">Request to join</button><button class="btn small" onclick="viewClass('${c.id}')">Open class</button>${user&&c.teacherId===user.id?`<button class="btn small" onclick="editClass('${c.id}')">Manage</button><button class="btn small" onclick="deleteClass('${c.id}')">Delete</button>`:''}</div></div>`).join(''):'<div class="empty" style="grid-column:1/-1">No classes to show yet. Teachers can create a class; students can request to join with a class code.</div>';let cl=classes.find(c=>user&&c.members.includes(user.id));let list=cl?cl.members.map(id=>users.find(u=>u.id===id)).filter(Boolean).map(u=>({name:u.name,xp:u.xp||0})):[];$('#classLeaderboard').innerHTML=list.length?rowsBoard(list,'xp'):'<div class="empty">Join a class and start earning points to appear here.</div>';renderAssignments();}
$('#createAssignmentBtn').onclick=()=>{if(!ensureUser())return;if(!['teacher','admin'].includes(user.role)){toast('Teacher access is required to post assignments.');return}const ownClasses=classes.filter(item=>item.teacherId===user.id);if(!ownClasses.length){toast('Create a classroom before posting assignments.');return}modal('Choose a classroom',`<p>Select a class to open its assignment and comment tools.</p><div class="field"><label>CLASSROOM</label><select id="assignmentClassChoice">${ownClasses.map(item=>`<option value="${escSafe(item.id)}">${escSafe(item.name)} · Grade ${item.grade}</option>`).join('')}</select></div><button class="btn primary" id="openAssignmentClass">Open classroom</button>`);$('#openAssignmentClass').onclick=()=>{const id=$('#assignmentClassChoice').value;closeModal();viewClass(id)}};
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
    <p class="muted" style="font-size:12px;margin:10px 0 0">Atomic PSD checks message access, repeated posts, and message bursts. Signals are queued for admin review; chat is not continuously monitored.</p>
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
    const [classRes, memberRes, profileRes, progressRes, assessmentRes] = await Promise.all([
      supabaseClient.from('classrooms').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('class_memberships').select('classroom_id,student_id,status,requested_at,profiles:profiles!class_memberships_student_id_fkey(id,display_name,role,grade,xp,game_points)'),
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
    const {data:profile,error}=await supabaseClient.from('profiles').select('id,display_name,role,grade,xp,game_points').eq('id',authUser.id).single();
    if(error) throw error;
    user={id:authUser.id,name:profile.display_name,email:authUser.email,role:profile.role,xp:profile.xp||0,gamePoints:profile.game_points||0,grade:profile.grade||1,joined:[]};
    xp=user.xp;gamePoints=user.gamePoints;save('user',user);persist();updateHeader();await refreshRemoteData();
    if(location.hash.includes('type=recovery') || location.hash.includes('access_token=')) passwordRecoveryModal();
  } catch(err){console.error(err);toast('Signed in, but profile setup failed. Run supabase/schema.sql.');}
}
function passwordRecoveryModal(){
  modal('Set a new password',`<form id="newPasswordForm"><div class="field"><label>NEW PASSWORD</label><input name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters"></div><p id="passwordResetError" class="muted" role="status"></p><button class="btn primary" type="submit" style="width:100%">Update password</button></form>`);
  $('#newPasswordForm').onsubmit=async e=>{e.preventDefault();const password=new FormData(e.target).get('password');const {error}=await supabaseClient.auth.updateUser({password});if(error)$('#passwordResetError').textContent=error.message;else{closeModal();history.replaceState(null,'',location.pathname);toast('Password updated successfully.')}};
}
function renderClasses(){
  const own=classes.filter(c=>user&&c.teacherId===user.id);
  const joined=classes.filter(c=>user&&c.members.includes(user.id)&&c.teacherId!==user.id);
  const visible=user?.role==='teacher'?own:own.concat(joined);
  $('#classesList').innerHTML=visible.length?visible.map(c=>`<div class="class-card"><div class="eyebrow">CLASSROOM · ${escSafe(c.code)}</div><h3>${escSafe(c.name)}</h3><div class="class-meta">Teacher: ${escSafe(c.teacherName)} · Grade ${c.grade} · ${Math.max(0,c.members.length-(c.members.includes(c.teacherId)?1:0))} students</div><p class="muted">${escSafe(c.description||'A place to practice, play, and grow together.')}</p><div class="class-actions"><button class="btn small" data-open-class="${escSafe(c.id)}">Open class</button>${user&&c.teacherId===user.id?`<button class="btn small" data-edit-class="${escSafe(c.id)}">Manage</button><button class="btn small" data-delete-class="${escSafe(c.id)}">Delete</button>`:''}</div></div>`).join(''):'<div class="empty" style="grid-column:1/-1">No classrooms yet. A teacher can create one, then share its class code with students.</div>';
  const cl=classes.find(c=>user&&c.members.includes(user.id));const list=cl?cl.members.map(id=>remoteProfiles.find(p=>p.id===id)).filter(Boolean).map(p=>({name:p.name,xp:p.xp||0})):[];
  $('#classLeaderboard').innerHTML=list.length?rowsBoard(list,'xp'):'<div class="empty">Join a class and start earning points to appear here.</div>';
  renderAssignments();
}
async function renderSecurityCases(){
  const container=$('#securityCasesList');
  if(!container||user?.role!=='admin')return;
  container.textContent='Loading review queue…';
  const {data,error}=await supabaseClient.from('security_cases')
    .select('id,actor_id,classroom_id,signal_type,details,created_at,profiles:profiles!security_cases_actor_id_fkey(display_name),classrooms(name)')
    .eq('status','open').order('created_at',{ascending:false}).limit(100);
  if(error){
    container.textContent='Could not load the review queue. Run the updated Supabase schema and try again.';
    console.error('Could not load Atomic PSD review queue',error);
    toast('Could not load review queue: '+error.message);
    return;
  }
  container.replaceChildren();
  if(!data.length){
    const empty=document.createElement('div');empty.className='empty';empty.textContent='No open security signals.';
    container.append(empty);return;
  }
  const labels={chat_rate_limit:'Message burst',chat_repeat:'Repeated message',chat_unauthorized:'Unauthorized chat attempt'};
  for(const item of data){
    const card=document.createElement('article');card.className='panel';
    const title=document.createElement('h3');title.textContent=labels[item.signal_type]||'Security signal';
    const who=document.createElement('p');who.className='muted';who.textContent=(item.profiles?.display_name||'Unknown user')+' · '+(item.classrooms?.name||'Class unavailable')+' · '+new Date(item.created_at).toLocaleString();
    const detail=document.createElement('p');detail.textContent=item.details;
    const actions=document.createElement('div');actions.className='class-actions';
    for(const [disposition,label] of [['reviewed','Mark reviewed'],['false_positive','Mark false positive']]){
      const button=document.createElement('button');button.type='button';button.className='btn small';
      button.dataset.securityCaseId=item.id;button.dataset.disposition=disposition;button.textContent=label;actions.append(button);
    }
    card.append(title,who,detail,actions);container.append(card);
  }
}
document.addEventListener('click',async event=>{
  const target=event.target;
  if(!(target instanceof Element))return;
  if(target.closest('#refreshSecurityCases')){await renderSecurityCases();return}
  const reviewButton=target.closest('[data-security-case-id]');
  if(!reviewButton)return;
  if(user?.role!=='admin'){toast('Trusted admin access is required.');return}
  reviewButton.disabled=true;
  const {error}=await supabaseClient.rpc('review_security_case',{
    p_case_id:reviewButton.dataset.securityCaseId,
    p_disposition:reviewButton.dataset.disposition,
    p_note:null
  });
  if(error){reviewButton.disabled=false;toast('Could not review security case: '+error.message);return}
  toast('Security case updated.');
  await renderSecurityCases();
});
function renderLeaderboard(){
  const field=(boardMode==='games'||boardMode==='classgames')?'gamePoints':'xp';let list=[];
  if(boardMode==='class'||boardMode==='classgames'){const cl=classes.find(c=>user&&c.members.includes(user.id));list=cl?cl.members.map(id=>remoteProfiles.find(p=>p.id===id)).filter(Boolean).map(p=>({name:p.name,xp:p.xp||0,gamePoints:p.gamePoints||0})):[];}
  else list=remoteProfiles.map(p=>({name:p.name,xp:p.xp||0,gamePoints:p.gamePoints||0}));
  $('#mainLeaderboard').innerHTML=list.length?rowsBoard(list,field):'<div class="empty">Sign in and complete lessons to populate the live leaderboard.</div>';
}
function renderGameBoards(){
  const gameKey = selectedGame || 'rocket';
  const gameBestScores = load('gameBestScores', {});
  const globalList = (remoteProfiles.length ? remoteProfiles : demoPeople()).map(p => ({
    name: p.name,
    gamePoints: Number((p.gameScores && p.gameScores[gameKey]) || p.gamePoints || 0)
  })).sort((a, b) => (b.gamePoints || 0) - (a.gamePoints || 0));
  $('#gameGlobalBoard').innerHTML = globalList.length ? rowsBoard(globalList,'gamePoints') : '<div class="empty">Game rankings appear after players finish games.</div>';
  const cl = classes.find(c => user && c.members.includes(user.id));
  const members = cl ? cl.members.map(id => (remoteProfiles.find(p => p.id === id) || users.find(u => u.id === id))).filter(Boolean).map(p => ({
    name: p.name,
    gamePoints: Number((p.gameScores && p.gameScores[gameKey]) || p.gamePoints || 0)
  })) : [];
  $('#gameClassBoard').innerHTML = members.length ? rowsBoard(members,'gamePoints') : '<div class="empty">Join a class to see class game rankings.</div>';
  $$('.game-card').forEach(card => {
    const key = card.dataset.gameKey || 'rocket';
    const best = Number(gameBestScores[key] || 0);
    const bestEl = card.querySelector('.game-best');
    if (bestEl) bestEl.textContent = `Best: ${best} pts`;
  });
  const selector = $('#gameSelector');
  if (selector) selector.value = gameKey;
  const boardSelector = $('#gameBoardSelector');
  if (boardSelector) boardSelector.value = gameLeaderboardMode;
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
function renderClassAssignments(classId,isTeacher,commentsEnabled){
  return `<section class="panel" style="margin-top:18px;padding:16px">
    <div class="section-head" style="margin:0 0 12px"><div><h3 style="margin:0">📝 Class assignments & comments</h3><p style="margin:4px 0 0">Assignments and feedback for this classroom.</p></div></div>
    ${isTeacher?`<form data-class-assignment-form data-class-id="${escSafe(classId)}" class="panel" style="padding:14px;margin-bottom:14px">
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
      ${user?.id===classroom?.teacherId?`<button class="btn small" data-delete-class-assignment="${escSafe(assignment.id)}">Delete post</button>`:''}
      <div class="assignment-comments"><h4>Comments & feedback</h4>${commentMarkup}
        ${(user?.id===classroom?.teacherId||allowStudentComments)?`<form data-assignment-comment-form data-class-id="${escSafe(classroomId)}" data-assignment-id="${escSafe(assignment.id)}" class="class-actions"><input name="body" required maxlength="1000" placeholder="Write a comment or feedback" aria-label="Comment"><button class="btn small" type="submit">Comment</button></form>`:''}
      </div>
    </article>`;
  }).join('');
}
function viewClass(id){
  const c=classes.find(c=>c.id===id);
  if(!c)return;
  const isTeacher=user&&c.teacherId===user.id;
  const members=c.members.map(uid=>remoteProfiles.find(p=>p.id===uid)).filter(Boolean);
  const pending=(c.membershipRows||[]).filter(m=>m.status==='pending').map(m=>m.profiles).filter(Boolean);
  modal(c.name,`
    <div class="eyebrow">CLASS CODE · ${escSafe(c.code)}</div>
    <p class="muted">Grade ${c.grade} · ${escSafe(trackLabel(c.track||'Basic'))} track · Teacher ${escSafe(c.teacherName)}</p>
    ${isTeacher?`<p><button class="btn small" id="copyClassCode">Copy class code</button></p>`:''}
    <h3>Students (${members.filter(p=>p.id!==c.teacherId).length})</h3>
    <div>${members.filter(p=>p.id!==c.teacherId).map(p=>`<div class="leader-row"><div class="person"><b>${escSafe(p.name)}</b><small>Grade ${p.grade} · ${p.xp||0} XP</small></div>${isTeacher?`<button class="btn small" data-remove-student="${escSafe(p.id)}" data-class-id="${escSafe(c.id)}">Remove</button>`:''}</div>`).join('')||'<p class="muted">No approved students yet.</p>'}</div>
    ${isTeacher?`<h3 style="margin-top:20px">Join requests (${pending.length})</h3>${pending.map(p=>`<div class="leader-row"><div class="person"><b>${escSafe(p.display_name)}</b><small>Waiting for permission</small></div><button class="btn small primary" data-approve-join="${escSafe(p.id)}" data-class-id="${escSafe(c.id)}">Approve</button><button class="btn small" data-deny-join="${escSafe(p.id)}" data-class-id="${escSafe(c.id)}">Deny</button></div>`).join('')||'<p class="muted">No pending requests.</p>'}<div class="field" style="margin-top:16px"><label>CLASS GRADE</label><select id="classGrade">${gradeNumbers.map(g=>`<option value="${g}" ${c.grade===g?'selected':''}>Grade ${g}</option>`).join('')}</select></div><div class="field"><label>LEARNING TRACK</label><select id="nextTrack"><option value="Basic" ${c.track==='Basic'?'selected':''}>Beginner</option><option value="Intermediate" ${c.track==='Intermediate'?'selected':''}>Intermediate</option><option value="Master" ${c.track==='Master'?'selected':''}>Master</option></select></div><label class="checkbox-row"><input id="studentChatEnabled" type="checkbox" ${c.studentChatEnabled?'checked':''}> Enable student class chat</label><label class="checkbox-row"><input id="studentCommentsEnabled" type="checkbox" ${c.studentCommentsEnabled?'checked':''}> Allow student comments on assignments</label><button class="btn blue" id="saveTrack">Save class settings</button>`:''}
    ${isTeacher||c.studentChatEnabled?renderClassChat(c.id):'<div class="notice" style="margin-top:18px">Student chat is disabled. Ask your teacher if you need to share a class message.</div>'}
    ${renderClassAssignments(c.id,isTeacher,c.studentCommentsEnabled)}
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
  const gameStart=target.closest('[data-game-start]');
  if(gameStart){startGame(gameStart.dataset.gameStart);return}
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
        const messages={rate_limited:'Please wait a moment before sending another message.',repeated_message:'Please avoid sending the same message repeatedly.',not_authorized:'Only approved class members can send messages.',chat_disabled:'Your teacher has disabled student chat for this class.'};
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
  if(form.matches('[data-class-assignment-form]')){
    event.preventDefault();
    const fields=new FormData(form),status=form.querySelector('[data-assignment-status]'),submit=form.querySelector('[type=submit]');
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
async function deleteClass(id){const c=classes.find(c=>c.id===id);if(!c||!user||c.teacherId!==user.id)return;if(confirm('Delete '+c.name+'? This removes this class and its membership.')){const {error}=await supabaseClient.from('classrooms').delete().eq('id',id);if(error){toast(error.message);return}await refreshRemoteData();renderClasses();toast('Class deleted.')}}


async function finishTest(){
  if(testDone)return;
  if(!testStarted){toast('Type a few words first!');return}
  if(testRequiresFullDuration&&(Date.now()-testStart)<testDuration*1000){toast('Keep typing until the full one-minute test is complete.');return}
  testDone=true;clearInterval(testTimer);$('#testInput').disabled=true;
  const val=$('#testInput').value,elapsed=Math.max(1,Math.min(testDuration,(Date.now()-testStart)/1000)),txt=$('#testPrompt').textContent;
  let correct=0;for(let i=0;i<Math.min(val.length,txt.length);i++)if(val[i]===txt[i])correct++;
  const cpm=Math.round(correct/(elapsed/60)),wpm=Math.round(cpm/5),acc=val.length?Math.round(correct/val.length*100):0;
  $('#testWpm').innerHTML=wpm+' <small>WPM</small>';$('#testCpm').innerHTML=cpm+' <small>CPM</small>';$('#testAccuracy').textContent=acc+'%';$('#timeLeft').textContent='Done';
  updateDailyGoalProgress(Math.max(20,Math.round(wpm*2+acc/10)));recordPracticeActivity();
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

function startGame(kind,bypassAuth=false){
  if(!bypassAuth&&!ensureUser())return;
  const currentGame = gameCatalog[kind] || gameCatalog.rocket;
  const allowedGames = getAvailableGamesForUser();
  const gameBestScores = load('gameBestScores', {});
  if (user && user.role === 'student' && !allowedGames.includes(kind)) {
    toast('This game is restricted by your teacher for this class.');
    return;
  }
  const words = currentGame.words || gameCatalog.rocket.words;
  let target = words[Math.floor(Math.random()*words.length)],score=0,streak=0,best=0,seconds=30,done=false;
  startGameMusic();
  modal('🎮 '+currentGame.name,`<div class="atafbot-game-card"><div class="atafbot-avatar">${atafBot.emoji}</div><div class="atafbot-copy"><strong>${atafBot.name}</strong><small>${atafBot.motto}</small></div><button class="btn small music-toggle" id="gameMusicToggle">${musicEnabled?'Music on':'Music off'}</button></div><div class="stats"><div class="stat-card"><small>TIME LEFT</small><strong id="gTime">30s</strong></div><div class="stat-card"><small>WORDS</small><strong id="gScore">0</strong></div><div class="stat-card"><small>STREAK</small><strong id="gStreak">0</strong></div></div><div class="game-art" style="font-size:44px">${currentGame.emoji}</div><p class="muted">Type the word shown, then press Enter. Keep your streak going!</p><div class="practice-text" id="gTarget" style="text-align:center;font-size:32px">${target}</div><input class="typing-input" id="gInput" style="min-height:0" autocomplete="off" placeholder="Type the word…" autofocus><p class="muted">Every correct word earns ${currentGame.pointsPerWord} game points.</p>`);
  const timer=setInterval(()=>{seconds--;const el=$('#gTime');if(el)el.textContent=seconds+'s';if(seconds<=0)end()},1000);
  const toggle=document.getElementById('gameMusicToggle');if(toggle){toggle.onclick=()=>{musicEnabled=!musicEnabled;if(musicEnabled)startGameMusic();else stopGameMusic();toggle.textContent=musicEnabled?'Music on':'Music off'}};
  function next(){target=words[Math.floor(Math.random()*words.length)];$('#gTarget').textContent=target;$('#gInput').value='';$('#gScore').textContent=score;$('#gStreak').textContent=streak}
  async function end(){if(done)return;done=true;clearInterval(timer);stopGameMusic();const points=score*currentGame.pointsPerWord;gameBestScores[kind] = Math.max(Number(gameBestScores[kind] || 0), Number(points || 0));save('gameBestScores', gameBestScores);updateDailyGoalProgress(Math.max(15, Math.round(points / 4)));recordPracticeActivity();if(supabaseReady&&supabaseClient){const {error}=await supabaseClient.rpc('save_typing_game',{p_game_key:kind,p_points:points});if(error)toast('Game ended; score could not be saved: '+error.message);else await refreshRemoteData();}$('#modalBody').innerHTML=`<div style="text-align:center;padding:10px"><div style="font-size:55px">🏆</div><h2>Nice typing!</h2><p>You typed <b>${score}</b> words with a best streak of <b>${best}</b>.</p><div class="stats"><div class="stat-card"><small>GAME POINTS</small><strong>+${points}</strong></div><div class="stat-card"><small>WORDS</small><strong>${score}</strong></div></div><button class="btn primary" id="playAgain">Play again</button> <button class="btn" id="gameDone">Done</button></div>`;$('#playAgain').onclick=()=>{closeModal();startGame(kind)};$('#gameDone').onclick=()=>{closeModal();renderGameBoards();if(checkpointGameActive){checkpointGameActive=false;advanceLesson()}};renderGameBoards();renderProgressCard();renderSkillBadges()}$('#gInput').focus();$('#gInput').onkeydown=e=>{if(e.key==='Enter'&&!done){if(e.target.value.trim().toLowerCase()===target){score++;streak++;best=Math.max(best,streak);pulseGameMusicGood();next()}else{streak=0;$('#gStreak').textContent=streak}}};}

async function initializeBackend(){
  if (demoSignedIn && !user) {
    user = { id: 'demo-ataf-student', name: 'Ava Learner', email: 'ava@ataf.demo', role: 'student', xp: 860, gamePoints: 740, grade: 4, joined: [] };
    xp = user.xp; gamePoints = user.gamePoints; save('user', user); save('xp', xp); save('gamePoints', gamePoints);
    document.body.classList.remove('auth-required');
    updateHeader(); renderProgressCard(); renderHomeLevels(); renderCurriculumPath(); renderLessons(); renderClasses(); renderLeaderboard(); renderGameBoards(); go('home'); return;
  }
  renderAuthGate('signup');renderHomeLevels();renderCurriculumPath();document.body.classList.add('auth-required');renderLessons();renderClasses();renderLeaderboard();renderGameBoards();
  if(!supabaseReady){user=null;users=[];classes=[];remoteProfiles=[];xp=0;gamePoints=0;save('user',null);persist();console.warn('ATAF Supabase config missing. Configure config.js to enable real accounts and cloud data.');updateHeader();renderAuthGate('signup');return}
  const {data:{session}}=await supabaseClient.auth.getSession();if(session?.user){await syncAuthenticatedUser(session.user);if(user)go(user.role==='teacher'?'classes':'home')}else{user=null;users=[];classes=[];remoteProfiles=[];xp=0;gamePoints=0;save('user',null);persist();updateHeader();renderAuthGate('signup');renderClasses();renderLeaderboard();renderGameBoards()}
  supabaseClient.auth.onAuthStateChange((event,session)=>{setTimeout(async()=>{if(session?.user){await syncAuthenticatedUser(session.user);if(user)go(user.role==='teacher'?'classes':'home')}else if(event==='SIGNED_OUT'){user=null;classes=[];remoteProfiles=[];save('user',null);persist();updateHeader();renderAuthGate('signin');renderClasses();renderLeaderboard();renderGameBoards()}},0)});
}

initializeBackend();
