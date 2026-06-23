import React, { useState, useEffect } from 'react';
import { EXAM_TAXONOMY, TopicDef } from '../../../../packages/shared/src/lib/taxonomy';
import { authService, fetchChapterSources, getPrimaryBoardForExam, classMatchesSelection } from '@drut/shared';
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

 // Chapter sources from fetchChapterSources — drives the new picker shape:
 //   Subject → Class (with Both option) → Chapter (+ NCERT-include checkbox).
 // Board is no longer user-picked: it's derived from selectedExam via
 // getPrimaryBoardForExam, with NCERT fallback when the state board has
 // no chapters ingested for the subject (e.g., BIEAP Chemistry today).
 const [chapterSources, setChapterSources] = useState<ChapterSource[]>([]);
 const [selectedClass, setSelectedClass] = useState<string>('Class 11');
 const [includeNcert, setIncludeNcert] = useState<boolean>(false);

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

 // Picker derivation (new shape):
 // 1. primaryBoard = derived from exam (BIEAP / TSBIE / NCERT)
 // 2. If primaryBoard has no chapters for this subject → silent fallback to NCERT
 // 3. effectiveBoards = [primaryBoard or fallback] + (includeNcert && primary !== NCERT ? [NCERT] : [])
 // 4. displayedChapters = chapters from effectiveBoards × selectedClass, with labels
 const primaryBoard = getPrimaryBoardForExam(selectedExam);
 // Check that the primary board has content for THIS class specifically
 // (not just the subject). BIEAP today has only 1st Year content — picking
 // Class 12 should silently fall back to NCERT instead of showing an empty
 // chapter dropdown.
 const primaryHasContentForSelection = chapterSources.some(s =>
  s.board === primaryBoard && classMatchesSelection(s.class_name, selectedClass)
 );
 const effectivePrimaryBoard = primaryHasContentForSelection ? primaryBoard : 'NCERT';
 const stateBoardFellBack = primaryBoard !== 'NCERT' && !primaryHasContentForSelection;

 const effectiveBoards = (() => {
  const set = new Set<string>([effectivePrimaryBoard]);
  if (includeNcert && effectivePrimaryBoard !== 'NCERT') set.add('NCERT');
  return Array.from(set);
 })();

 // Each displayed chapter carries its source so handleStart can pass the
 // correct board to the backend RAG filter.
 interface DisplayChapter { id: string; name: string; label: string; board: string; classNameOfSource: string; }
 const displayedChapters: DisplayChapter[] = chapterSources
  .filter(s => effectiveBoards.includes(s.board))
  .filter(s => classMatchesSelection(s.class_name, selectedClass))
  .flatMap(s => s.chapters.map(c => ({
   id: c.id,
   name: c.name,
   // Label: include class always when "Both" picked, include board when NCERT is also shown
   label: (selectedClass === 'Both' || includeNcert)
    ? `${c.name} (${s.class_name}${effectiveBoards.length > 1 ? `, ${s.board}` : ''})`
    : c.name,
   board: s.board,
   classNameOfSource: s.class_name,
  })))
  .sort((a, b) => a.label.localeCompare(b.label));

 // Reset chapter when class or NCERT-include changes
 useEffect(() => {
  if (selectedTopic && !displayedChapters.some(c => c.name === selectedTopic) && selectedTopic !== 'all') {
   setSelectedTopic('');
  }
 }, [selectedClass, includeNcert, chapterSources.length]);

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

 // Board: derived from the picked chapter's source (not user-picked anymore).
 // The chapter dropdown lists chapters from one or more boards (primary state
 // board plus optional NCERT). Look up which board the picked chapter came from.
 // Falls back to NCERT for the "All Chapters" case or non-EAPCET legacy path.
 const pickedChapterMeta = displayedChapters.find(c => c.name === selectedTopic);
 const isStateBoard = selectedExam.includes('eapcet') || selectedExam.includes('eamcet');
 const board = pickedChapterMeta?.board
  || effectivePrimaryBoard
  || (isStateBoard ? 'NCERT' : 'CBSE');

 // Class: prefer the source class of the picked chapter (so "Both" resolves
 // to a concrete class). Falls back to user profile class.
 const classLevel = pickedChapterMeta?.classNameOfSource || selectedClass || userClass;

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

 {/* New picker: Class (with Both) → Chapter, plus optional NCERT-include toggle.
     Board is no longer user-picked — it's derived from exam (BIEAP for AP EAPCET,
     TSBIE for TS EAPCET, NCERT otherwise) with NCERT fallback when state board
     has no chapters for this subject. */}
 {chapterSources.length > 0 ? (
  <>
   {/* Class pills (Class 11 / Class 12 / Both) */}
   <div>
    <label className="text-sm font-semibold text-[var(--color-ink-1)] mb-3 block">Class</label>
    <div className="flex flex-wrap gap-3">
     {(['Class 11', 'Class 12', 'Both'] as const).map(cls => {
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

   {/* NCERT-include checkbox (hidden when primary board is already NCERT) */}
   {effectivePrimaryBoard !== 'NCERT' && chapterSources.some(s => s.board === 'NCERT') && (
    <label className="flex items-center gap-3 cursor-pointer select-none">
     <input
      type="checkbox"
      checked={includeNcert}
      onChange={(e) => { setIncludeNcert(e.target.checked); setSelectedTopic(''); }}
      className="w-4 h-4 accent-[var(--color-primary)]"
     />
     <span className="text-sm text-[var(--color-ink-2)]">
      Also practice NCERT national-level questions for extra rigor
     </span>
    </label>
   )}

   {/* Source footnote — surfaces which board the questions are coming from */}
   <p className="text-xs text-[var(--color-ink-3)] -mt-2">
    {stateBoardFellBack
     ? `Showing NCERT questions — your state board (${primaryBoard}) doesn't have ${selectedSubject || 'this subject'}${selectedClass !== 'Both' ? ` ${selectedClass}` : ''} textbooks loaded yet.`
     : `Source: ${effectiveBoards.join(' + ')} ${effectivePrimaryBoard === 'NCERT' ? '(national curriculum)' : '(your state board)'}`}
   </p>

   {/* Chapter dropdown — filtered by class + effective boards, labels disambiguate when needed */}
   <div className="space-y-2">
    <label className="text-sm font-semibold text-[var(--color-ink-1)]">Chapter</label>
    <div className="relative">
     <select
      value={selectedTopic}
      onChange={(e) => setSelectedTopic(e.target.value)}
      className="w-full appearance-none bg-white border border-slate-200 text-[var(--color-ink-2)] text-sm rounded-xl p-3.5 pr-10 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer disabled:bg-[var(--color-muted)] disabled:text-[var(--color-ink-3)]"
      disabled={displayedChapters.length === 0}
     >
      <option value="" disabled>Select Chapter...</option>
      <option value="all">All Chapters</option>
      {displayedChapters.map(c => (
       <option key={c.id} value={c.name}>{c.label}</option>
      ))}
     </select>
     <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-3)] pointer-events-none" size={16} />
    </div>
   </div>
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
