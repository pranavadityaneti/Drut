import React, { useState, useEffect } from 'react';
import { EXAM_TAXONOMY, TopicDef } from '../../../../packages/shared/src/lib/taxonomy';
import { authService, fetchChapterSources, getPrimaryBoardForExam, classMatchesSelection, normalizeTargetExams } from '@drut/shared';
import type { ChapterSource } from '@drut/shared';
// @ts-ignore
import { supabase } from '@drut/shared';
const { getCurrentUser } = authService;
import { Check, ChevronDown } from 'lucide-react';

interface SprintSetupProps {
 onStart: (config: {
 examProfile: string;
 topic: string;
 subtopic: string;
 questionCount: number;
 classLevel?: string;
 board?: string;
 subject?: string;
 }) => void;
}

export const SprintSetup: React.FC<SprintSetupProps> = ({ onStart }) => {
 const [loading, setLoading] = useState(true);

 // User Data
 const [userExams, setUserExams] = useState<string[]>([]);
 const [userClass, setUserClass] = useState<string>('11');

 // Selections
 const [selectedExam, setSelectedExam] = useState<string>('');
 const [selectedSubject, setSelectedSubject] = useState<string>('');
 const [selectedTopic, setSelectedTopic] = useState<string>('');
 // Subtopic removed from UI
 const [questionCount, setQuestionCount] = useState<number>(10);

 // Dynamic Syllabus State
 const [dynamicTopics, setDynamicTopics] = useState<any[]>([]);

 // Picker v2 state — see PracticeSetup.tsx for full notes. Board is derived
 // from exam (not user-picked). Class includes "Both" option. NCERT checkbox
 // augments the chapter pool when state board is the primary source.
 const [chapterSources, setChapterSources] = useState<ChapterSource[]>([]);
 const [selectedClass, setSelectedClass] = useState<string>('Class 11');
 const [includeNcert, setIncludeNcert] = useState<boolean>(false);

 useEffect(() => {
 const init = async () => {
 try {
 const user = await getCurrentUser();
 if (user) {
 // Single shared normalizer (labels / legacy 'eamcet'/'both' / snake_case),
 // identical to mobile + PracticeSetup.
 const exams = normalizeTargetExams(
 (user.user_metadata?.target_exams && (user.user_metadata.target_exams as string[]).length)
 ? user.user_metadata.target_exams
 : user.user_metadata?.exam_profile
 );
 const cls = user.user_metadata?.class || '11';
 setUserExams(exams);
 setUserClass(cls);
 if (exams.length > 0) setSelectedExam(exams[0]);
 }
 } catch (err) {
 console.error("Failed to initialize SprintSetup:", err);
 } finally {
 setLoading(false);
 }
 };
 init();
 }, []);

 // Derived Logic
 const examDef = EXAM_TAXONOMY.find(e => e.value === selectedExam);

 // Dynamic Fetching Logic
 useEffect(() => {
 const fetchDynamicSyllabus = async () => {
 // Only fetch for specific exams
 if (!selectedExam || !['ap_eapcet', 'ts_eapcet'].includes(selectedExam)) {
 setDynamicTopics([]);
 return;
 }

 // We need to fetch topics from knowledge_nodes
 const { data, error } = await supabase
 .from('knowledge_nodes')
 .select('id, name, metadata')
 .eq('node_type', 'topic')
 // .eq('metadata->>subject', selectedSubject) // Optional: filtering by subject here or in JS
 // Since we don't have subject selected initially, fetch all for this "Textbook Set"?
 // Actually, we filter by subject in UI. Fetch all topics for now.
 // Improve: Filter by metadata->>subject if selectedSubject is set?
 // For now, fetch all topics to populate the Subject dropdown too.
 .limit(1000);

 if (data) {
 // Map to format
 const mapped = data.map((d: any) => ({
 label: d.name,
 value: d.name, // Use name as value for now
 subject: d.metadata?.subject || 'Unknown',
 class_level: '11', // Default or fetch?
 }));
 setDynamicTopics(mapped);
 }
 };

 fetchDynamicSyllabus();
 }, [selectedExam]);

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

 // Picker v2 derivation — see PracticeSetup.tsx for full notes
 const primaryBoard = getPrimaryBoardForExam(selectedExam);
 // Class-aware fallback — see PracticeSetup for full rationale
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

 interface DisplayChapter { id: string; name: string; label: string; board: string; classNameOfSource: string; }
 const displayedChapters: DisplayChapter[] = chapterSources
  .filter(s => effectiveBoards.includes(s.board))
  .filter(s => classMatchesSelection(s.class_name, selectedClass))
  .flatMap(s => s.chapters.map(c => ({
   id: c.id,
   name: c.name,
   label: (selectedClass === 'Both' || includeNcert)
    ? `${c.name} (${s.class_name}${effectiveBoards.length > 1 ? `, ${s.board}` : ''})`
    : c.name,
   board: s.board,
   classNameOfSource: s.class_name,
  })))
  .sort((a, b) => a.label.localeCompare(b.label));

 useEffect(() => {
  if (selectedTopic && !displayedChapters.some(c => c.name === selectedTopic) && selectedTopic !== 'all') {
   setSelectedTopic('');
  }
 }, [selectedClass, includeNcert, chapterSources.length]);

 // Subject Extraction
 const isDynamic = dynamicTopics.length > 0;

 // Get subjects from either Static or Dynamic source
 const sourceTopics = isDynamic ? dynamicTopics : (examDef?.topics || []);

 // Extract unique subjects
 const availableSubjects = Array.from(new Set(sourceTopics.map((t: any) => t.subject).filter(Boolean) || [])).sort();

 // Auto-select Subject
 useEffect(() => {
 if (availableSubjects.length > 0 && !selectedSubject) {
 setSelectedSubject(availableSubjects[0]);
 } else if (availableSubjects.length > 0 && !availableSubjects.includes(selectedSubject)) {
 setSelectedSubject(availableSubjects[0]);
 }
 }, [availableSubjects, selectedSubject, loading]); // Added dependencies

 // Topic Filtering
 let filteredTopics = sourceTopics.filter((t: any) => {
 // Strict Filtering
 if (!isDynamic) {
 if (userClass === '11' && t.class_level !== '11') return false;
 if (userClass === '12' && t.class_level !== '12') return false;
 } else {
 // For dynamic topics, we assume they might have class_level attached
 if (t.class_level) {
 if (userClass === '11' && t.class_level !== '11') return false;
 if (userClass === '12' && t.class_level !== '12') return false;
 }
 }

 if (selectedSubject && t.subject !== selectedSubject) return false;
 return true;
 }) || [];

 // Sort topics alphabetically if dynamic
 if (isDynamic) {
 filteredTopics.sort((a: any, b: any) => a.label.localeCompare(b.label));
 }

 // Deduplicate topics (Fixes Unique Key console errors)
 const uniqueTopicsMap = new Map();
 filteredTopics.forEach((t: any) => {
 if (!uniqueTopicsMap.has(t.value)) {
 uniqueTopicsMap.set(t.value, t);
 }
 });
 filteredTopics = Array.from(uniqueTopicsMap.values());

 // Add Select All (After sorting, so it stays at top)
 if (filteredTopics.length > 0) {
 filteredTopics.unshift({
 label: "Select All Chapters",
 value: "all",
 subject: selectedSubject,
 class_level: '11'
 });
 }


 // Handlers
 const handleExamChange = (examWait: string) => {
 if (examWait === selectedExam) return;
 setSelectedExam(examWait);
 setSelectedSubject('');
 setSelectedTopic('');
 };

 const handleSubjectChange = (subject: string) => {
 setSelectedSubject(subject);
 setSelectedTopic('');
 };

 const handleStart = () => {
 if (!selectedExam || !selectedTopic) return;

 // Board derived from picked chapter's source (picker v2 — no Board pill)
 const pickedChapterMeta = displayedChapters.find(c => c.name === selectedTopic);
 const isStateBoard = selectedExam.includes('eapcet') || selectedExam.includes('eamcet');
 const board = pickedChapterMeta?.board
  || effectivePrimaryBoard
  || (isStateBoard ? 'NCERT' : 'CBSE');
 const classLevel = pickedChapterMeta?.classNameOfSource || selectedClass || userClass;

 onStart({
 examProfile: selectedExam,
 topic: selectedTopic,
 subtopic: 'mixed',
 questionCount,
 classLevel,
 board,
 subject: selectedSubject
 });
 };

 if (loading) return <div className="flex h-full items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div></div>;

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
 className={`px - 6 py - 3 rounded - xl border text - sm font - medium transition - all duration - 200 flex items - center gap - 2 ${isSelected
 ? 'border-[var(--color-primary)] bg-[var(--color-accent)] text-[#3d7a0f] ring-1 ring-emerald-500'
 : 'border-slate-200 text-[var(--color-ink-2)] hover:border-slate-300 hover:bg-[var(--color-muted)]'
 } `}
 >
 {isSelected && <div className="w-2 h-2 rounded-full bg-[#3d7a0f]" />}
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
 className="w-full appearance-none bg-white border border-slate-200 text-[var(--color-ink-2)] text-sm rounded-xl p-3.5 pr-10 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer disabled:bg-[var(--color-muted)] disabled:text-[var(--color-ink-3)]"
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

 {/* Picker v2: Class (with Both) → Chapter, plus optional NCERT-include checkbox */}
 {chapterSources.length > 0 ? (
  <>
   <div>
    <label className="text-sm font-semibold text-[var(--color-ink-1)] mb-3 block">Class</label>
    <div className="flex flex-wrap gap-3">
     {(['Class 11', 'Class 12', 'Both'] as const).map(cls => {
      const isSelected = selectedClass === cls;
      return (
       <button key={cls}
        onClick={() => { setSelectedClass(cls); setSelectedTopic(''); }}
        className={`px-5 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 ${isSelected ? 'border-[var(--color-primary)] bg-[var(--color-accent)] text-[#3d7a0f] ring-1 ring-[var(--color-primary)]' : 'border-slate-200 text-[var(--color-ink-2)] hover:border-slate-300 hover:bg-[var(--color-muted)]'}`}>
        {cls}
       </button>
      );
     })}
    </div>
   </div>
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
   <p className="text-xs text-[var(--color-ink-3)] -mt-2">
    {stateBoardFellBack
     ? `Showing NCERT questions — your state board (${primaryBoard}) doesn't have ${selectedSubject || 'this subject'}${selectedClass !== 'Both' ? ` ${selectedClass}` : ''} textbooks loaded yet.`
     : `Source: ${effectiveBoards.join(' + ')} ${effectivePrimaryBoard === 'NCERT' ? '(national curriculum)' : '(your state board)'}`}
   </p>
   <div className="space-y-2">
    <label className="text-sm font-semibold text-[var(--color-ink-1)]">Chapter</label>
    <div className="relative">
     <select
      value={selectedTopic}
      onChange={(e) => setSelectedTopic(e.target.value)}
      className="w-full appearance-none bg-white border border-slate-200 text-[var(--color-ink-2)] text-sm rounded-xl p-3.5 pr-10 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer disabled:bg-[var(--color-muted)] disabled:text-[var(--color-ink-3)]"
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
  /* Legacy fallback dropdown when no knowledge_nodes data available */
  <div className="space-y-2">
   <label className="text-sm font-semibold text-[var(--color-ink-1)]">Chapter/Topic</label>
   <div className="relative">
    <select
     value={selectedTopic}
     onChange={(e) => setSelectedTopic(e.target.value)}
     className="w-full appearance-none bg-white border border-slate-200 text-[var(--color-ink-2)] text-sm rounded-xl p-3.5 pr-10 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer disabled:bg-[var(--color-muted)] disabled:text-[var(--color-ink-3)]"
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

 {/* 3. Count (Pills) */}
 <div>
 <label className="text-sm font-semibold text-[var(--color-ink-1)] mb-3 block">Question Count</label>
 <div className="flex flex-wrap gap-3">
 {[5, 10, 15, 20, 25, 30].map(count => (
 <button
 key={count}
 onClick={() => setQuestionCount(count)}
 className={`w - 12 h - 10 flex items - center justify - center rounded - lg border text - sm font - medium transition - all duration - 200 ${questionCount === count
 ? 'border-[var(--color-primary)] bg-[var(--color-accent)] text-[#3d7a0f]'
 : 'border-slate-200 text-[var(--color-ink-2)] hover:border-slate-300'
 } `}
 >
 {count}
 </button>
))}
 </div>
 </div>

 {/* Action */}
 <div className="pt-4">
 <button
 onClick={handleStart}
 disabled={!isReady}
 className={`w - full py - 4 rounded - xl font - bold text - lg transition - all duration - 200 ${isReady
 ? 'bg-[#3d7a0f] text-white hover:bg-[#2f600c] transform hover:-translate-y-0.5'
 : 'bg-[var(--color-muted)] text-[var(--color-ink-3)] cursor-not-allowed'
 } `}
 >
 Start Sprint
 </button>
 </div>

 </div>
 </div>
 </div>
);
};
