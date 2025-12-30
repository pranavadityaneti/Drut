import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '@drut/shared';
import { Upload, FileSpreadsheet, Play, CheckCircle, AlertCircle, Loader2, X, RefreshCw } from 'lucide-react';

// ================= TYPES =================
interface StagingQuestion {
    id: string;
    source_text: string;
    subject: string;
    topic: string;
    subtopic: string;
    status: 'pending' | 'processing' | 'ready' | 'published' | 'error';
    error_message?: string;
    enriched_data?: any; // Contains solution, generated options etc.
    created_at: string;
}

interface CSVRow {
    topic: string;
    subtopic: string;
    question_text: string;
    // Optional fields in CSV
    options?: string;
    correct_option?: string;
}

// ================= COMPONENT =================
export const StagingManager: React.FC = () => {
    const [view, setView] = useState<'list' | 'upload'>('list');
    const [questions, setQuestions] = useState<StagingQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ pending: 0, ready: 0, published: 0 });

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [parsedCount, setParsedCount] = useState(0);

    // Initial Fetch
    useEffect(() => {
        if (view === 'list') fetchStagingQuestions();
    }, [view]);

    const fetchStagingQuestions = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('staging_questions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50); // Pagination needed in real app

            if (error) throw error;
            setQuestions(data || []);

            // Calculate simple stats (should be count queries in real app)
            const newStats = {
                pending: (data || []).filter(q => q.status === 'pending').length,
                ready: (data || []).filter(q => q.status === 'ready').length,
                published: (data || []).filter(q => q.status === 'published').length
            };
            setStats(newStats);

        } catch (error) {
            console.error('Error fetching staging:', error);
        } finally {
            setLoading(false);
        }
    };

    // ================= CSV HANDLING =================
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setIsUploading(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const rows = results.data as CSVRow[];
                setParsedCount(rows.length);

                // Prepare max 50 rows for insertion (prototype limit)
                const toInsert = rows.slice(0, 50).map(row => ({
                    source_text: row.question_text,
                    topic: row.topic || 'General',
                    subtopic: row.subtopic || 'General',
                    subject: 'Physics', // Default or from CSV
                    status: 'pending',
                    // Save other fields in raw data if needed
                    enriched_data: {
                        original_options: row.options,
                        original_correct: row.correct_option
                    }
                }));

                try {
                    const { error } = await supabase.from('staging_questions').insert(toInsert);
                    if (error) throw error;

                    setView('list'); // Switch back to list view
                } catch (err: any) {
                    alert('Upload failed: ' + err.message);
                } finally {
                    setIsUploading(false);
                }
            },
            error: (err) => {
                alert('CSV Error: ' + err.message);
                setIsUploading(false);
            }
        });
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'] },
        disabled: isUploading
    });

    // ================= ACTIONS =================
    const handleEnrich = async () => {
        // Trigger Edge Function to process 'pending' items
        try {
            const { error } = await supabase.functions.invoke('enrich-questions-batch', {});
            // Check status via toast
            if (error) throw error;
            alert('AI Enrichment started! This runs in the background. Refresh shortly.');
            fetchStagingQuestions();
        } catch (err: any) {
            alert('Enrich trigger failed: ' + err.message);
        }
    };

    const handlePublish = async (id: string, data: any) => {
        if (!confirm('Publish this question to live app?')) return;

        try {
            // 1. Insert to cached_questions
            const { error: pubError } = await supabase.from('cached_questions').insert({
                question_data: data.enriched_data, // The AI output
                topic: data.topic,
                subtopic: data.subtopic,
                question_id: `pub-${Date.now()}`,
                exam_profile: 'JEE Main' // or from data
            });
            if (pubError) throw pubError;

            // 2. Mark staging as published
            await supabase.from('staging_questions').update({ status: 'published' }).eq('id', id);

            fetchStagingQuestions();
        } catch (err: any) {
            alert('Publish failed: ' + err.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{stats.pending}</div>
                        <p className="text-xs text-muted-foreground">Pending AI Review</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
                        <p className="text-xs text-muted-foreground">Ready to Publish</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-600">{stats.published}</div>
                        <p className="text-xs text-muted-foreground">Published Live</p>
                    </CardContent>
                </Card>
            </div>

            {/* Toolbar */}
            <div className="flex justify-between">
                <div className="space-x-2">
                    <Button
                        variant={view === 'list' ? 'default' : 'outline'}
                        onClick={() => setView('list')}
                    >
                        Staging Table
                    </Button>
                    <Button
                        variant={view === 'upload' ? 'default' : 'outline'}
                        onClick={() => setView('upload')}
                    >
                        Upload CSV
                    </Button>
                </div>
                {view === 'list' && (
                    <div className="space-x-2">
                        <Button variant="outline" size="sm" onClick={fetchStagingQuestions}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                        </Button>
                        <Button variant="secondary" size="sm" onClick={handleEnrich}>
                            <Play className="h-4 w-4 mr-2" /> Start AI Enrichment
                        </Button>
                    </div>
                )}
            </div>

            {/* MAIN CONTENT */}
            {view === 'upload' && (
                <Card className="border-2 border-dashed">
                    <CardHeader>
                        <CardTitle>Upload Question CSV</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div
                            {...getRootProps()}
                            className={`
                                p-12 text-center cursor-pointer rounded-lg transition-colors
                                ${isDragActive ? 'bg-emerald-50 border-emerald-500' : 'bg-muted/50 hover:bg-muted'}
                            `}
                        >
                            <input {...getInputProps()} />
                            {isUploading ? (
                                <div className="flex flex-col items-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
                                    <p>Processing CSV...</p>
                                </div>
                            ) : (
                                <>
                                    <Upload className="h-10 w-10 mx-auto text-gray-400 mb-4" />
                                    <p className="font-medium">Drag & drop CSV here</p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Columns: question_text, topic, subtopic (optional: options, correct_option)
                                    </p>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {view === 'list' && (
                <Card>
                    <div className="rounded-md border">
                        <table className="min-w-full divide-y divide-border text-sm">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium">Topic</th>
                                    <th className="px-4 py-3 text-left font-medium w-1/3">Question</th>
                                    <th className="px-4 py-3 text-left font-medium">Status</th>
                                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                                ) : questions.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No questions in staging.</td></tr>
                                ) : (
                                    questions.map((q) => (
                                        <tr key={q.id} className="hover:bg-muted/30">
                                            <td className="px-4 py-3 align-top">
                                                <div className="font-medium">{q.topic}</div>
                                                <div className="text-xs text-muted-foreground">{q.subtopic}</div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="line-clamp-2">{q.source_text}</div>
                                                {q.enriched_data && (
                                                    <span className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                                        <CheckCircle className="h-3 w-3" /> AI Solved
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <span className={`
                                                    inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                                                    ${q.status === 'ready' ? 'bg-green-100 text-green-700' :
                                                        q.status === 'published' ? 'bg-blue-100 text-blue-700' :
                                                            q.status === 'error' ? 'bg-red-100 text-red-700' :
                                                                'bg-yellow-100 text-yellow-700'}
                                                `}>
                                                    {q.status}
                                                </span>
                                                {q.status === 'error' && (
                                                    <div className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={q.error_message}>
                                                        {q.error_message}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 align-top text-right space-x-2">
                                                {q.status === 'ready' && (
                                                    <Button size="sm" onClick={() => handlePublish(q.id, q)}>
                                                        Publish
                                                    </Button>
                                                )}
                                                {q.status === 'published' && (
                                                    <span className="text-xs text-muted-foreground">Live</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};
