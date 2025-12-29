/**
 * Admin Ingest Dashboard
 * Two-column layout with STRICT TAXONOMY ENFORCEMENT
 * Topic/Subtopic are SELECTED, never typed
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { ingestAndRefineQuestion, RefinedQuestion } from '../../../packages/shared/src/services/contentRefinery';
import { supabase } from '@drut/shared';
import { log } from '@drut/shared';
import {
    EXAM_TAXONOMY,
    getExamOptions,
    getTopicOptions,
    getSubtopicOptions,
    getExam,
    getTopic
} from '@drut/shared';

interface FormData {
    questionText: string;
    options: [string, string, string, string];
    correctOptionIndex: number;
    explanationFsm: string;
    explanationStandard: string;
    fsmTag: string;
    targetTimeSec: number;
    difficulty: 'easy' | 'medium' | 'hard';
}

const EMPTY_FORM: FormData = {
    questionText: '',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    explanationFsm: '',
    explanationStandard: '',
    fsmTag: '',
    targetTimeSec: 45,
    difficulty: 'medium',
};

export const AdminIngestion: React.FC = () => {
    // TAXONOMY SELECTION (enforced dropdowns)
    const [selectedExam, setSelectedExam] = useState<string>('');
    const [selectedTopic, setSelectedTopic] = useState<string>('');
    const [selectedSubtopic, setSelectedSubtopic] = useState<string>('');

    // Left column state
    const [rawInput, setRawInput] = useState('');
    const [isRefining, setIsRefining] = useState(false);
    const [refineError, setRefineError] = useState<string | null>(null);

    // Right column state (form)
    const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [saveMessage, setSaveMessage] = useState('');

    // Reset topic/subtopic when exam changes
    useEffect(() => {
        setSelectedTopic('');
        setSelectedSubtopic('');
    }, [selectedExam]);

    // Reset subtopic when topic changes
    useEffect(() => {
        setSelectedSubtopic('');
    }, [selectedTopic]);

    // Get current options based on selections
    const examOptions = getExamOptions();
    const topicOptions = getTopicOptions(selectedExam);
    const subtopicOptions = getSubtopicOptions(selectedExam, selectedTopic);

    // Get labels for display
    const examLabel = getExam(selectedExam)?.label || '';
    const topicLabel = getTopic(selectedExam, selectedTopic)?.label || '';

    // Handle AI Refinement
    const handleRefine = async () => {
        if (!selectedExam || !selectedTopic || !selectedSubtopic) {
            setRefineError('Please select Exam, Topic, and Subtopic first');
            return;
        }

        if (rawInput.trim().length < 30) {
            setRefineError('Please enter at least 30 characters');
            return;
        }

        setIsRefining(true);
        setRefineError(null);
        setSaveStatus('idle');

        try {
            // Pass context to AI so it knows the topic area
            const contextPrefix = `[Context: ${examLabel} > ${topicLabel}]\n\n`;
            const refined = await ingestAndRefineQuestion(contextPrefix + rawInput);

            // Auto-fill form with AI response (but NOT topic/subtopic - those are already selected!)
            setFormData({
                questionText: refined.question_text,
                options: refined.options as [string, string, string, string],
                correctOptionIndex: refined.correct_option_index,
                explanationFsm: refined.explanation_fsm,
                explanationStandard: refined.explanation_standard,
                fsmTag: refined.fsm_tag,
                targetTimeSec: refined.target_time_sec,
                difficulty: refined.difficulty,
            });

            log.info('[admin] Refined question successfully');
        } catch (error: any) {
            setRefineError(error.message);
            log.error('[admin] Refine error:', error.message);
        } finally {
            setIsRefining(false);
        }
    };

    // Handle form field changes
    const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...formData.options] as [string, string, string, string];
        newOptions[index] = value;
        setFormData(prev => ({ ...prev, options: newOptions }));
    };

    // Handle Save to Database
    const handleSave = async () => {
        // Validate taxonomy selection (MANDATORY)
        if (!selectedExam || !selectedTopic || !selectedSubtopic) {
            setSaveStatus('error');
            setSaveMessage('You MUST select Exam, Topic, and Subtopic');
            return;
        }

        // Validate form fields
        if (!formData.questionText || !formData.fsmTag) {
            setSaveStatus('error');
            setSaveMessage('Please fill in Question Text and FSM Tag');
            return;
        }

        setIsSaving(true);
        setSaveStatus('idle');

        try {
            // Get current user
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                throw new Error('You must be logged in to save questions');
            }

            // Get display labels for database storage
            const topic = getTopic(selectedExam, selectedTopic);
            const subtopic = topic?.subtopics.find(s => s.value === selectedSubtopic);

            // Construct question_data JSONB
            const questionData = {
                questionText: formData.questionText,
                options: formData.options.map(text => ({ text })),
                correctOptionIndex: formData.correctOptionIndex,
                timeTargets: {
                    jee_main: formData.targetTimeSec,
                    cat: Math.round(formData.targetTimeSec * 0.8),
                    eamcet: Math.round(formData.targetTimeSec * 1.2),
                },
                fastestSafeMethod: {
                    exists: true,
                    preconditions: `Use for: ${formData.fsmTag.replace(/-/g, ' ')}`,
                    steps: formData.explanationFsm.split(/[.;]/).filter(s => s.trim().length > 0),
                    sanityCheck: 'Verify answer magnitude and sign',
                },
                fullStepByStep: {
                    steps: formData.explanationStandard.split(/\d+[.)]\s*/).filter(s => s.trim().length > 5),
                },
                fsmTag: formData.fsmTag,
            };

            // Insert into cached_questions with EXACT taxonomy labels
            const { error } = await supabase
                .from('cached_questions')
                .insert({
                    question_id: `admin-${Date.now()}`,
                    exam_profile: selectedExam,
                    topic: topic?.label || selectedTopic,  // Use LABEL for DB storage
                    subtopic: subtopic?.label || selectedSubtopic,  // Use LABEL for DB storage
                    question_data: questionData,
                    fsm_tag: formData.fsmTag,
                    difficulty: formData.difficulty === 'easy' ? 'Easy' :
                        formData.difficulty === 'hard' ? 'Hard' : 'Medium',
                    created_by: session.user.id,
                });

            if (error) throw error;

            setSaveStatus('success');
            setSaveMessage(`✅ Saved to ${examLabel} > ${topic?.label}`);

            // Reset form after success (but keep taxonomy selection for bulk entry)
            setFormData(EMPTY_FORM);
            setRawInput('');

            log.info(`[admin] Saved question: ${selectedExam}/${topic?.label}/${subtopic?.label}`);

        } catch (error: any) {
            setSaveStatus('error');
            setSaveMessage(error.message);
            log.error('[admin] Save error:', error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Reset everything
    const handleReset = () => {
        setSelectedExam('');
        setSelectedTopic('');
        setSelectedSubtopic('');
        setFormData(EMPTY_FORM);
        setRawInput('');
        setRefineError(null);
        setSaveStatus('idle');
    };

    // Check if taxonomy is fully selected
    const isTaxonomyComplete = selectedExam && selectedTopic && selectedSubtopic;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <span className="text-3xl">🧪</span>
                        Admin Question Ingestion
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Select taxonomy → Paste question → Refine → Save
                    </p>
                </div>
                <Button variant="outline" onClick={handleReset}>
                    Clear All
                </Button>
            </div>

            {/* TAXONOMY SELECTION - MANDATORY FIRST STEP */}
            <Card className="border-2 border-emerald-200 bg-emerald-50">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <span>🎯</span>
                        Step 1: Select Taxonomy (Required)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Exam Select */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Exam Profile</label>
                            <Select
                                value={selectedExam}
                                onChange={(e) => setSelectedExam(e.target.value)}
                                options={[
                                    { value: '', label: '-- Select Exam --' },
                                    ...examOptions
                                ]}
                            />
                        </div>

                        {/* Topic Select */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Topic</label>
                            <Select
                                value={selectedTopic}
                                onChange={(e) => setSelectedTopic(e.target.value)}
                                options={[
                                    { value: '', label: selectedExam ? '-- Select Topic --' : '(Select Exam first)' },
                                    ...topicOptions
                                ]}
                                disabled={!selectedExam}
                            />
                        </div>

                        {/* Subtopic Select */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Subtopic</label>
                            <Select
                                value={selectedSubtopic}
                                onChange={(e) => setSelectedSubtopic(e.target.value)}
                                options={[
                                    { value: '', label: selectedTopic ? '-- Select Subtopic --' : '(Select Topic first)' },
                                    ...subtopicOptions
                                ]}
                                disabled={!selectedTopic}
                            />
                        </div>
                    </div>

                    {isTaxonomyComplete && (
                        <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
                            ✅ <strong>{examLabel}</strong> → <strong>{topicLabel}</strong> → <strong>{subtopicOptions.find(s => s.value === selectedSubtopic)?.label}</strong>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* LEFT COLUMN - Raw Input */}
                <Card className={`h-fit ${!isTaxonomyComplete ? 'opacity-50 pointer-events-none' : ''}`}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <span>📝</span>
                            Step 2: Paste Raw Question
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <textarea
                            value={rawInput}
                            onChange={(e) => setRawInput(e.target.value)}
                            placeholder={isTaxonomyComplete
                                ? `Paste your raw question here...

Example:
A train 150m long passes a platform 350m long in 25 seconds. What is the speed of the train?
(A) 72 km/hr  (B) 80 km/hr  (C) 60 km/hr  (D) 54 km/hr`
                                : 'Please select Exam, Topic, and Subtopic first...'}
                            className="w-full h-72 p-4 border rounded-lg font-mono text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                            disabled={isRefining || !isTaxonomyComplete}
                        />

                        {refineError && (
                            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                ❌ {refineError}
                            </div>
                        )}

                        <Button
                            onClick={handleRefine}
                            disabled={isRefining || rawInput.trim().length < 30 || !isTaxonomyComplete}
                            className="w-full py-6 text-lg"
                        >
                            {isRefining ? (
                                <span className="flex items-center gap-3">
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Refining with AI... (5-10 seconds)
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    ✨ Refine with AI
                                </span>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* RIGHT COLUMN - Structured Form */}
                <Card className={!isTaxonomyComplete ? 'opacity-50 pointer-events-none' : ''}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <span>📋</span>
                            Step 3: Review & Save
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">

                        {/* Question Text */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Question Text</label>
                            <textarea
                                value={formData.questionText}
                                onChange={(e) => updateField('questionText', e.target.value)}
                                className="w-full h-24 p-3 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                placeholder="Question text will appear here after refinement..."
                            />
                        </div>

                        {/* Options */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium">Options</label>
                            {formData.options.map((opt, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="w-8 h-8 flex items-center justify-center bg-muted rounded-md font-bold text-sm">
                                        {String.fromCharCode(65 + i)}
                                    </span>
                                    <input
                                        value={opt}
                                        onChange={(e) => updateOption(i, e.target.value)}
                                        className="flex-1 p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Correct Option & Difficulty */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Correct Option</label>
                                <Select
                                    value={String(formData.correctOptionIndex)}
                                    onChange={(e) => updateField('correctOptionIndex', parseInt(e.target.value))}
                                    options={[
                                        { value: '0', label: 'A' },
                                        { value: '1', label: 'B' },
                                        { value: '2', label: 'C' },
                                        { value: '3', label: 'D' },
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Difficulty</label>
                                <Select
                                    value={formData.difficulty}
                                    onChange={(e) => updateField('difficulty', e.target.value as 'easy' | 'medium' | 'hard')}
                                    options={[
                                        { value: 'easy', label: 'Easy' },
                                        { value: 'medium', label: 'Medium' },
                                        { value: 'hard', label: 'Hard' },
                                    ]}
                                />
                            </div>
                        </div>

                        {/* FSM Explanation */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                FSM Explanation <span className="text-xs text-muted-foreground">(Shortcut)</span>
                            </label>
                            <textarea
                                value={formData.explanationFsm}
                                onChange={(e) => updateField('explanationFsm', e.target.value)}
                                className="w-full h-16 p-3 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                placeholder="The fast method..."
                            />
                        </div>

                        {/* Standard Explanation */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Standard Explanation <span className="text-xs text-muted-foreground">(Textbook)</span>
                            </label>
                            <textarea
                                value={formData.explanationStandard}
                                onChange={(e) => updateField('explanationStandard', e.target.value)}
                                className="w-full h-16 p-3 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                placeholder="The full textbook solution..."
                            />
                        </div>

                        {/* FSM Tag & Target Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">FSM Tag</label>
                                <input
                                    value={formData.fsmTag}
                                    onChange={(e) => updateField('fsmTag', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                    className="w-full p-2 border rounded-lg text-sm font-mono bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="e.g., relative-speed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Target Time (sec)</label>
                                <input
                                    type="number"
                                    value={formData.targetTimeSec}
                                    onChange={(e) => updateField('targetTimeSec', parseInt(e.target.value) || 45)}
                                    className="w-full p-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    min={10}
                                    max={300}
                                />
                            </div>
                        </div>

                        {/* Save Status */}
                        {saveStatus !== 'idle' && (
                            <div className={`p-3 rounded-lg text-sm ${saveStatus === 'success'
                                ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
                                : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                                }`}>
                                {saveMessage}
                            </div>
                        )}

                        {/* Save Button */}
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !formData.questionText || !isTaxonomyComplete}
                            className="w-full py-6 text-lg bg-green-600 hover:bg-green-700"
                        >
                            {isSaving ? (
                                <span className="flex items-center gap-3">
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Saving...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    💾 Save to Database
                                </span>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
