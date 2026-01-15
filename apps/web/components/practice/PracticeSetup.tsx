import React, { useState, useEffect } from 'react';
import { EXAM_TAXONOMY, TopicDef } from '../../../../packages/shared/src/lib/taxonomy';
import { authService } from '@drut/shared';
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


    // Derived Logic
    const examDef = EXAM_TAXONOMY.find(e => e.value === selectedExam);

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

        // Board inference
        const isStateBoard = selectedExam.includes('eapcet') || selectedExam.includes('eamcet');
        const board = isStateBoard ? 'Ncert' : 'CBSE'; // Simplified map

        onStart({
            examProfile: selectedExam,
            topic: selectedTopic,
            // Subtopic is always mixed/all now
            subtopic: 'mixed',
            difficulty: difficulty,
            classLevel: userClass,
            board: board,
            subject: selectedSubject,
            language: language // Add Language
        });
    };

    if (loading) return <div className="flex min-h-[50vh] items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

    const isReady = selectedExam && selectedTopic;

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4 bg-slate-50/50">
            <div className="w-full max-w-2xl bg-white shadow-xl rounded-3xl p-8 md:p-10 border border-slate-100">

                {/* Header */}
                <h1 className="text-2xl font-bold text-slate-900 mb-8">Configuration</h1>

                <div className="space-y-8">
                    {/* 1. Exam Selection */}
                    <div>
                        <label className="text-sm font-semibold text-slate-900 mb-3 block">Target Exam</label>
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
                                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. Subject & Topic Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Subject Dropdown */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-900">Subject</label>
                            <div className="relative">
                                <select
                                    value={selectedSubject}
                                    onChange={(e) => handleSubjectChange(e.target.value)}
                                    className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-xl p-3.5 pr-10 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                                    disabled={!selectedExam || availableSubjects.length === 0}
                                >
                                    <option value="" disabled>Select Subject...</option>
                                    {availableSubjects.map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        {/* Topic Dropdown */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-900">Chapter/Topic</label>
                            <div className="relative">
                                <select
                                    value={selectedTopic}
                                    onChange={(e) => setSelectedTopic(e.target.value)}
                                    className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-xl p-3.5 pr-10 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                                    disabled={!selectedSubject || filteredTopics.length === 0}
                                >
                                    <option value="" disabled>Select Chapter...</option>
                                    {filteredTopics.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            </div>
                        </div>
                    </div>



                    {/* 4. Difficulty */}
                    <div>
                        <label className="text-sm font-semibold text-slate-900 mb-3 block">Difficulty Level</label>
                        <div className="grid grid-cols-3 gap-4">
                            {(['Easy', 'Medium', 'Hard'] as const).map((level) => {
                                const isSelected = difficulty === level;
                                let colorClass = '';
                                if (level === 'Easy') colorClass = isSelected ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500' : 'hover:border-emerald-200 hover:bg-emerald-50';
                                if (level === 'Medium') colorClass = isSelected ? 'bg-amber-50 border-amber-500 text-amber-700 ring-1 ring-amber-500' : 'hover:border-amber-200 hover:bg-amber-50';
                                if (level === 'Hard') colorClass = isSelected ? 'bg-rose-50 border-rose-500 text-rose-700 ring-1 ring-rose-500' : 'hover:border-rose-200 hover:bg-rose-50';

                                return (
                                    <button
                                        key={level}
                                        onClick={() => setDifficulty(level)}
                                        className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${isSelected ? colorClass : 'border-slate-200 text-slate-600 ' + colorClass}`}
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
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
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
