import React, { useState, useEffect } from 'react';
import { EXAM_TAXONOMY, TopicDef } from '@drut/shared';
import { authService } from '@drut/shared';
const { getCurrentUser } = authService;
import { Check, ChevronDown } from 'lucide-react';

interface SprintSetupProps {
    onStart: (config: {
        examProfile: string;
        topic: string;
        subtopic: string;
        questionCount: number;
    }) => void;
}

export const SprintSetup: React.FC<SprintSetupProps> = ({ onStart }) => {
    const [loading, setLoading] = useState(true);

    // User Data
    const [userExams, setUserExams] = useState<string[]>([]);
    const [userClass, setUserClass] = useState<string>('11');

    // Selections
    const [selectedExam, setSelectedExam] = useState<string>('');
    const [selectedTopic, setSelectedTopic] = useState<string>('');
    const [selectedSubtopic, setSelectedSubtopic] = useState<string>('');
    const [questionCount, setQuestionCount] = useState<number>(10);

    useEffect(() => {
        const init = async () => {
            const user = await getCurrentUser();
            if (user) {
                let exams = (user.user_metadata?.target_exams || []) as string[];
                const cls = user.user_metadata?.class || '11';

                // Fallback
                if (exams.length === 0 && user.user_metadata?.exam_profile) exams.push(user.user_metadata.exam_profile);

                // Normalization: Map known variants to taxonomy keys if needed
                exams = exams.map(e => {
                    const clean = e.toLowerCase().replace(/[^a-z0-9]/g, '');
                    // Check if 'eamcet' is what we want for 'apeapcet'
                    if (clean.includes('eapcet') || clean.includes('eamcet')) return 'eamcet';
                    return e; // Return original if no special map needed, or if it matches taxonomy already
                });

                // Dedup
                exams = Array.from(new Set(exams));

                setUserExams(exams);
                setUserClass(cls);

                // Auto-select
                if (exams.length > 0) {
                    setSelectedExam(exams[0]);
                }
            }
            setLoading(false);
        };
        init();
    }, []);

    // Derived Logic
    const examDef = EXAM_TAXONOMY.find(e => e.value === selectedExam);

    // Topic Filtering
    let filteredTopics = examDef?.topics.filter(t => {
        if (userClass === '11') return t.class_level === '11';
        return true;
    }) || [];

    // Fallback: Show all if empty
    if (filteredTopics.length === 0 && examDef?.topics) {
        filteredTopics = examDef.topics;
    }

    const topicDef = filteredTopics.find(t => t.value === selectedTopic);

    // Handlers
    const handleExamChange = (examWait: string) => {
        if (examWait === selectedExam) return;
        setSelectedExam(examWait);
        setSelectedTopic('');
        setSelectedSubtopic('');
    };

    const handleStart = () => {
        if (!selectedExam || !selectedTopic) return;
        onStart({
            examProfile: selectedExam,
            topic: selectedTopic,
            subtopic: selectedSubtopic || 'mixed',
            questionCount
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
                    {/* 1. Object (Exam) */}
                    <div>
                        <label className="text-sm font-semibold text-slate-900 mb-3 block">Target Exam</label>
                        <div className="flex flex-wrap gap-4">
                            {userExams.map(examVal => {
                                const def = EXAM_TAXONOMY.find(e => e.value === examVal);
                                const isSelected = selectedExam === examVal;
                                const label = def?.label || examVal.toUpperCase(); // Fallback label if mapping fails

                                return (
                                    <button
                                        key={examVal}
                                        onClick={() => handleExamChange(examVal)}
                                        className={`px-6 py-3 rounded-xl border text-sm font-medium transition-all duration-200 flex items-center gap-2 ${isSelected
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500'
                                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        {isSelected && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. Type (Topic & Subtopic) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-900">Topic</label>
                            <div className="relative">
                                <select
                                    value={selectedTopic}
                                    onChange={(e) => {
                                        setSelectedTopic(e.target.value);
                                        setSelectedSubtopic('');
                                    }}
                                    className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-xl p-3.5 pr-10 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer"
                                    disabled={!selectedExam}
                                >
                                    <option value="" disabled>Select a Topic...</option>
                                    {filteredTopics.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-900">Subtopic <span className="text-slate-400 font-normal">(Optional)</span></label>
                            <div className="relative">
                                <select
                                    value={selectedSubtopic}
                                    onChange={(e) => setSelectedSubtopic(e.target.value)}
                                    className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-xl p-3.5 pr-10 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                                    disabled={!selectedTopic || (topicDef?.subtopics.length === 0)}
                                >
                                    <option value="">Mixed (All Subtopics)</option>
                                    {topicDef?.subtopics.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
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
                                    className={`w-12 h-10 flex items-center justify-center rounded-lg border text-sm font-medium transition-all duration-200 ${questionCount === count
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
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
                            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 ${isReady
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transform hover:-translate-y-0.5'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            Start Sprint
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};
