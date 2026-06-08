import React, { useState, useEffect } from 'react';
import { EXAM_TAXONOMY, TopicDef } from '../../../../packages/shared/src/lib/taxonomy';
import { authService, fetchChapterSources } from '@drut/shared';
import type { ChapterSource } from '@drut/shared';
// @ts-ignore
import { supabase } from '@drut/shared'; // Ensure we can import supabase client
const { getCurrentUser } = authService;
import { ChevronDown } from 'lucide-react';

interface PracticeSetupProps {
 onStart: (config: {
 examProfile: string;
 topic: string;
 subtopic: string;
 difficulty: 'Easy' | 'Medium' | 'Hard';
 classLevel?: string;
 board?: string;
 subject?: string;
 language?: 'English' | 'Telugu' | 'Hindi';
 }) => void;
}

export const PracticeSetup: React.FC<PracticeSetupProps> = ({ onStart }) => {
 const [loading, setLoading] = useState(true);

 // User Data
 const [userExams, setUserExams] = useState<string[]>([]);
 const [userClass, setUserClass] = useState<string>('11');

 // Selections
 const [selectedExam, setSelectedExam] = useState<string>('');
 const [selectedSubject, setSelectedSubject] = useState<string>('');
 const [selectedTopic, setSelectedTopic] = useState<string>('');
 const [language, setLanguage] = useState<'English' | 'Telugu' | 'Hindi'>('English');
 // Subtopic is removed from UI, will default to 'mixed'
 const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

 // Dynamic Data
 const [dynamicTopics, setDynamicTopics] = useState<any[]>([]);

 // Chapter sources from fetchChapterSources — drives the 3-step Board → Class → Chapter
 // picker. Populated when the selected subject has chapters in knowledge_nodes (EAPCET).
 // When empty, falls back to the legacy flat-dropdown path below.
 const [chapterSources, setChapterSources] = useState<ChapterSource[]>([]);
 const [selectedBoard, setSelectedBoard] = useState<string>('');
 const [selectedClass, setSelectedClass] = useState<string>('');

 useEffect(() => {
 const init = async () => {
 // ... (existing user init logic) ...
 try {
 const user = await getCurrentUser();
 if (user) {
 let exams = (user.user_metadata?.target_exams || []) as string[];
 const cls = user.user_metadata?.class || '11';

 // Fallback
 if (exams.length === 0 && user.user_metadata?.exam_profile) exams.push(user.user_metadata.exam_profile);

 const availableExamValues = new Set(EXAM_TAXONOMY.map(e => e.value));
 const cleanExams: string[] = [];

 exams.forEach(e => {
 const clean = e.toLowerCase().replace(/[^a-z0-9_]/g, '');
 if (clean === 'eamcet') {
 if (availableExamValues.has('ap_eapcet')) cleanExams.push('ap_eapcet');
 if (availableExamValues.has('ts_eapcet')) cleanExams.push('ts_eapcet');
 return;
 }
 // Fix for legacy/mismatched values (e.g. APEAPCET -> apeapcet vs ap_eapcet)
 if (clean === 'apeapcet') {
 if (availableExamValues.has('ap_eapcet')) cleanExams.push('ap_eapcet');
 return;
 }
 if (clean === 'tgeapcet') {
 if (availableExamValues.has('ts_eapcet')) cleanExams.push('ts_eapcet');
 return;
 }

 cleanExams.push(clean);
 });

 const finalExams = Array.from(new Set(cleanExams));
 setUserExams(finalExams);
 setUserClass(cls);

 if (finalExams.length > 0) {
 setSelectedExam(finalExams[0]);
 }
 }
 } catch (err) {
 console.error("Failed to initialize PracticeSetup:", err);
 } finally {
 setLoading(false);
 }
 };
 init();
 }, []);

 // Fetch Dynamic Topics when Exam/Subject Changes
 useEffect(() => {
 const fetchDynamic = async () => {
 if (!selectedExam || !selectedSubject) return;

 // Only fetch for EAPCET exams where we have uploaded textbooks
 if (selectedExam === 'ap_eapcet' || selectedExam === 'ts_eapcet') {
 try {
 console.log('Fetching dynamic topics for:', selectedExam, selectedSubject);

 // Fetch from knowledge_nodes where node_type='topic' (our chapters)
 // And filter by metadata->>subject matching selectedSubject
 // Note: Supabase JSON filtering syntax
 const { data, error } = await supabase
 .from('knowledge_nodes')
 .select('name, metadata')
 .eq('node_type', 'topic')
 // We assume knowledge_nodes are shared, or strictly linked to textbooks.
 // Our ingest logic set metadata: { textbook_id: ..., subject: ... }
 // Filter by subject in metadata
 .eq('metadata->>subject', selectedSubject);

 if (error) {
 console.error('Error fetching dynamic topics:', error);
 return;
 }

 if (data && data.length > 0) {
 console.log('Reference Loaded:', data.length, 'chapters');
 const topics = data.map((d: any) => ({
 label: d.name,
 value: d.name,
 subject: d.metadata.subject,
 class_level: d.metadata.class_level || '11'
 }));

 // Add "Select All" option
 topics.unshift({
 label: "Select All Chapters",
 value: "all",
 subject: selectedSubject,
 class_level: '11' // Dummy
 });

 setDynamicTopics(topics);
 } else {
 // If no DB data, fall back to empty (or static if we wanted mixed mode)
 setDynamicTopics([]);
 }

 } catch (err) {
 console.error('Fetch error:', err);
 }
 } else {
 setDynamicTopics([]);
 }
 };

 fetchDynamic();
 }, [selectedExam, selectedSubject]);

 // Fetch grouped chapter sources for the 3-step picker (Board → Class → Chapter)
 useEffect(() => {
  const loadSources = async () => {
   if (!selectedSubject) {
    setChapterSources([]);
    return;
   }
   const sources = await fetchChapterSources(selectedSubject);
   setChapterSources(sources);
  };
  loadSources();
 }, [selectedSubject]);

 // Derived Logic
 const examDef = EXAM_TAXONOMY.find(e => e.value === selectedExam);

 // Board / Class / Chapter derivation from chapterSources
 const availableBoards = Array.from(new Set(chapterSources.map(s => s.board))).sort();
 const availableClasses = Array.from(new Set(
  chapterSources.filter(s => !selectedBoard || s.board === selectedBoard).map(s => s.class_name)
 )).sort();
 const selectedSourceForChapters = chapterSources.find(
  s => s.board === selectedBoard && s.class_name === selectedClass
 );
 const sourceChapters = selectedSourceForChapters?.chapters ?? [];

 // Auto-select Board / Class when there's only one option, or reset when filters narrow
 useEffect(() => {
  if (availableBoards.length === 0) {
   if (selectedBoard) setSelectedBoard('');
   return;
  }
  if (!selectedBoard || !availableBoards.includes(selectedBoard)) {
   setSelectedBoard(availableBoards[0]);
  }
 }, [availableBoards.join('|')]);

 useEffect(() => {
  if (availableClasses.length === 0) {
   if (selectedClass) setSelectedClass('');
   return;
  }
  if (!selectedClass || !availableClasses.includes(selectedClass)) {
   setSelectedClass(availableClasses[0]);
  }
 }, [availableClasses.join('|')]);

 // Subject Extraction
 // Use static definition for available Subjects (safe bet as textbooks follow these)
 const availableSubjects = Array.from(new Set(examDef?.topics.map(t => t.subject).filter(Boolean) || [])).sort();

 // Auto-select Subject
 useEffect(() => {
 if (availableSubjects.length > 0 && !selectedSubject) {
 setSelectedSubject(availableSubjects[0]);
 } else if (availableSubjects.length > 0 && !availableSubjects.includes(selectedSubject)) {
 setSelectedSubject(availableSubjects[0]);
 }
 }, [availableSubjects, selectedSubject]);

 // Topic Filtering
 let filteredTopics: any[] = [];

 // DECISION: Prefer Dynamic if available, else Static
 if ((selectedExam === 'ap_eapcet' || selectedExam === 'ts_eapcet') && dynamicTopics.length > 0) {
 filteredTopics = dynamicTopics; // Already filtered by subject in fetch
 } else {
 // Validation: Static fallback
 filteredTopics = examDef?.topics.filter(t => {
 // Strict Filtering Logic
 if (userClass === '11' && t.class_level !== '11') return false;
 if (userClass === '12' && t.class_level !== '12') return false;
 // If userClass is 'Both' or 'Reappear', seeing everything is correct.

 if (selectedSubject && t.subject !== selectedSubject) return false;
 return true;
 }) || [];
 }

 // Deduplicate topics (Fixes Unique Key console errors)
 const uniqueTopicsMap = new Map();
 filteredTopics.forEach(t => {
 if (!uniqueTopicsMap.has(t.value)) {
 uniqueTopicsMap.set(t.value, t);
 }
 });
 filteredTopics = Array.from(uniqueTopicsMap.values());

 // Handlers
 const handleExamChange = (examWait: string) => {
 if (examWait === selectedExam) return;
 setSelectedExam(examWait);
 setSelectedSubject('');
 setSelectedTopic('');
 setDynamicTopics([]); // Clear old dynamic data
 };


 const handleSubjectChange = (subject: string) => {
 setSelectedSubject(subject);
 setSelectedTopic('');
 };

 const handleStart = () => {
 if (!selectedExam || !selectedTopic) return;

 // Board: prefer the user's explicit Board pill choice from the new 3-step
 // picker. Falls back to the previous heuristic only when chapter sources
 // weren't loaded (e.g., non-EAPCET exams that still use static taxonomy).
 const isStateBoard = selectedExam.includes('eapcet') || selectedExam.includes('eamcet');
 const board = selectedBoard || (isStateBoard ? 'NCERT' : 'CBSE');

 // Class: prefer the explicit Class pill choice; fall back to user profile class
 const classLevel = selectedClass || userClass;

 onStart({
 examProfile: selectedExam,
 topic: selectedTopic,
 subtopic: 'mixed',
 difficulty: difficulty,
 classLevel: classLevel,
 board: board,
 subject: selectedSubject,
 language: language
 });
 };

 if (loading) return <div className="flex min-h-[50vh] items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

 const isReady = selectedExam && selectedTopic;

 return (
 <div className="min-h-[80vh] flex items-center justify-center p-4 bg-[var(--color-muted)]/50">
 <div className="w-full max-w-2xl bg-white shadow-xl rounded-3xl p-8 md:p-10 border border-slate-100">

 {/* Header */}
 <h1 className="text-2xl font-bold text-[var(--color-ink-1)] mb-8">Configuration</h1>

 <div className="space-y-8">
 {/* 1. Exam Selection */}
 <div>
 <label className="text-sm font-semibold text-[var(--color-ink-1)] mb-3 block">Target Exam</label>
 <div className="flex flex-wrap gap-4">
 {userExams.map(examVal => {
 const def = EXAM_TAXONOMY.find(e => e.value === examVal);
 const isSelected = selectedExam === examVal;
 const label = def?.label || examVal.toUpperCase().replace(/_/g, ' ');

 return (
 <button
 key={examVal}
 onClick={() => handleExamChange(examVal)}
 className={`px-6 py-3 rounded-xl border text-sm font-medium transition-all duration-200 flex items-center gap-2 ${isSelected
 ? 'border-primary bg-primary/10 text-primary-foreground ring-1 ring-primary'
 : 'border-slate-200 text-[var(--color-ink-2)] hover:border-slate-300 hover:bg-[var(--color-muted)]'
 }`}
 >
 {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
 {label}
 </button>
);
 })}
 </div>
 </div>

 {/* 2. Subject */}
 <div className="space-y-2">
 <label className="text-sm font-semibold text-[var(--color-ink-1)]">Subject</label>
 <div className="relative">
 <select
 value={selectedSubject}
 onChange={(e) => handleSubjectChange(e.target.value)}
 className="w-full appearance-none bg-white border border-slate-200 text-[var(--color-ink-2)] text-sm rounded-xl p-3.5 pr-10 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer disabled:bg-[var(--color-muted)] disabled:text-[var(--color-ink-3)]"
 disabled={!selectedExam || availableSubjects.length === 0}
 >
 <option value="" disabled>Select Subject...</option>
 {availableSubjects.map(sub => (
 <option key={sub} value={sub}>{sub}</option>
))}
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-3)] pointer-events-none" size={16} />
 </div>
 </div>

 {/* 3. Board → Class → Chapter picker (when knowledge_nodes data available) */}
 {chapterSources.length > 0 ? (
  <>
   {/* Board pills */}
   <div>
    <label className="text-sm font-semibold text-[var(--color-ink-1)] mb-3 block">Board</label>
    <div className="flex flex-wrap gap-3">
     {availableBoards.map(board => {
      const isSelected = selectedBoard === board;
      return (
       <button
        key={board}
        onClick={() => { setSelectedBoard(board); setSelectedClass(''); setSelectedTopic(''); }}
        className={`px-5 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 ${isSelected
         ? 'border-[var(--color-primary)] bg-[var(--color-accent)] text-[#3d7a0f] ring-1 ring-[var(--color-primary)]'
         : 'border-slate-200 text-[var(--color-ink-2)] hover:border-slate-300 hover:bg-[var(--color-muted)]'
         }`}
       >
        {board}
       </button>
      );
     })}
    </div>
   </div>

   {/* Class pills */}
   {selectedBoard && (
    <div>
     <label className="text-sm font-semibold text-[var(--color-ink-1)] mb-3 block">Class</label>
     <div className="flex flex-wrap gap-3">
      {availableClasses.map(cls => {
       const isSelected = selectedClass === cls;
       return (
        <button
         key={cls}
         onClick={() => { setSelectedClass(cls); setSelectedTopic(''); }}
         className={`px-5 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 ${isSelected
          ? 'border-[var(--color-primary)] bg-[var(--color-accent)] text-[#3d7a0f] ring-1 ring-[var(--color-primary)]'
          : 'border-slate-200 text-[var(--color-ink-2)] hover:border-slate-300 hover:bg-[var(--color-muted)]'
          }`}
        >
         {cls}
        </button>
       );
      })}
     </div>
    </div>
   )}

   {/* Chapter dropdown (filtered to selected board × class × subject) */}
   {selectedBoard && selectedClass && (
    <div className="space-y-2">
     <label className="text-sm font-semibold text-[var(--color-ink-1)]">Chapter</label>
     <div className="relative">
      <select
       value={selectedTopic}
       onChange={(e) => setSelectedTopic(e.target.value)}
       className="w-full appearance-none bg-white border border-slate-200 text-[var(--color-ink-2)] text-sm rounded-xl p-3.5 pr-10 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer disabled:bg-[var(--color-muted)] disabled:text-[var(--color-ink-3)]"
       disabled={sourceChapters.length === 0}
      >
       <option value="" disabled>Select Chapter...</option>
       <option value="all">All Chapters</option>
       {sourceChapters.map(c => (
        <option key={c.id} value={c.name}>{c.name}</option>
       ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-3)] pointer-events-none" size={16} />
     </div>
    </div>
   )}
  </>
 ) : (
  /* Legacy fallback dropdown when no knowledge_nodes data is available
     (e.g., non-EAPCET exams that still use static EXAM_TAXONOMY) */
  <div className="space-y-2">
   <label className="text-sm font-semibold text-[var(--color-ink-1)]">Chapter/Topic</label>
   <div className="relative">
    <select
     value={selectedTopic}
     onChange={(e) => setSelectedTopic(e.target.value)}
     className="w-full appearance-none bg-white border border-slate-200 text-[var(--color-ink-2)] text-sm rounded-xl p-3.5 pr-10 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer disabled:bg-[var(--color-muted)] disabled:text-[var(--color-ink-3)]"
     disabled={!selectedSubject || filteredTopics.length === 0}
    >
     <option value="" disabled>Select Chapter...</option>
     {filteredTopics.map(t => (
      <option key={t.value} value={t.value}>{t.label}</option>
     ))}
    </select>
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-3)] pointer-events-none" size={16} />
   </div>
  </div>
 )}



 {/* 4. Difficulty */}
 <div>
 <label className="text-sm font-semibold text-[var(--color-ink-1)] mb-3 block">Difficulty Level</label>
 <div className="grid grid-cols-3 gap-4">
 {(['Easy', 'Medium', 'Hard'] as const).map((level) => {
 const isSelected = difficulty === level;
 let colorClass = '';
 if (level === 'Easy') colorClass = isSelected ? 'bg-[var(--color-accent)] border-[var(--color-primary)] text-[#3d7a0f] ring-1 ring-emerald-500' : 'hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]';
 if (level === 'Medium') colorClass = isSelected ? 'bg-[var(--color-accent-warm-soft)] border-amber-500 text-[var(--color-accent-warm-foreground)] ring-1 ring-amber-500' : 'hover:border-[var(--color-accent-warm-soft)] hover:bg-[var(--color-accent-warm-soft)]';
 if (level === 'Hard') colorClass = isSelected ? 'bg-rose-50 border-rose-500 text-rose-700 ring-1 ring-rose-500' : 'hover:border-rose-200 hover:bg-rose-50';

 return (
 <button
 key={level}
 onClick={() => setDifficulty(level)}
 className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${isSelected ? colorClass : 'border-slate-200 text-[var(--color-ink-2)] ' + colorClass}`}
 >
 {level}
 </button>
);
 })}
 </div>
 </div>

 {/* Action */}
 <div className="pt-8">
 <button
 onClick={handleStart}
 disabled={!isReady}
 className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 ${isReady
 ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transform hover:-translate-y-0.5'
 : 'bg-[var(--color-muted)] text-[var(--color-ink-3)] cursor-not-allowed'
 }`}
 >
 Enter Practice Arena
 </button>
 </div>

 </div>
 </div>
 </div>
);
};
