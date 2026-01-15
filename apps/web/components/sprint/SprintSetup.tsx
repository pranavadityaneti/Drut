import React, { useState, useEffect } from 'react';
import { EXAM_TAXONOMY, TopicDef } from '../../../../packages/shared/src/lib/taxonomy';
import { authService } from '@drut/shared';
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

    useEffect(() => {
        const init = async () => {
            try {
                const user = await getCurrentUser();
                if (user) {
                    let exams = (user.user_metadata?.target_exams || []) as string[];
                    const cls = user.user_metadata?.class || '11';

                    // Fallback
                    if (exams.length === 0 && user.user_metadata?.exam_profile) exams.push(user.user_metadata.exam_profile);

                    // Normalization - removing forced eamcet mapping, using taxonomy availability
                    const availableExamValues = new Set(EXAM_TAXONOMY.map(e => e.value));
                    const cleanExams: string[] = [];

                    exams.forEach(e => {
                        const clean = e.toLowerCase().replace(/[^a-z0-9_]/g, '');
                        if (clean === 'eamcet') {
                            if (availableExamValues.has('ap_eapcet')) cleanExams.push('ap_eapcet');
                            if (availableExamValues.has('ts_eapcet')) cleanExams.push('ts_eapcet');
                            return;
                        }
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

                    // Dedup
                    exams = Array.from(new Set(cleanExams));

                    setUserExams(exams);
                    setUserClass(cls);

                    // Auto-select
                    if (exams.length > 0) {
                        setSelectedExam(exams[0]);
                    }
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

        // Board inference
        const isStateBoard = selectedExam.includes('eapcet') || selectedExam.includes('eamcet');
        const board = isStateBoard ? 'Ncert' : 'CBSE';

        onStart({
            examProfile: selectedExam,
            topic: selectedTopic,
            subtopic: 'mixed',
            questionCount,
            classLevel: userClass,
            board,
            subject: selectedSubject
        });
    };

    if (loading) return <div className="flex h-full items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>;

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
                                        className={`px - 6 py - 3 rounded - xl border text - sm font - medium transition - all duration - 200 flex items - center gap - 2 ${isSelected
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500'
                                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                            } `}
                                    >
                                        {isSelected && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. Subject & Topic Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Subject Logic */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-900">Subject</label>
                            <div className="relative">
                                <select
                                    value={selectedSubject}
                                    onChange={(e) => handleSubjectChange(e.target.value)}
                                    className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-xl p-3.5 pr-10 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
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

                        {/* Topic Logic */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-900">Chapter/Topic</label>
                            <div className="relative">
                                <select
                                    value={selectedTopic}
                                    onChange={(e) => setSelectedTopic(e.target.value)}
                                    className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-xl p-3.5 pr-10 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
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

                    {/* 3. Count (Pills) */}
                    <div>
                        <label className="text-sm font-semibold text-slate-900 mb-3 block">Question Count</label>
                        <div className="flex flex-wrap gap-3">
                            {[5, 10, 15, 20, 25, 30].map(count => (
                                <button
                                    key={count}
                                    onClick={() => setQuestionCount(count)}
                                    className={`w - 12 h - 10 flex items - center justify - center rounded - lg border text - sm font - medium transition - all duration - 200 ${questionCount === count
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
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
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transform hover:-translate-y-0.5'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
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
