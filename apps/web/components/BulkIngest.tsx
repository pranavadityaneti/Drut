/**
 * BulkIngest Component
 * 
 * CSV Upload interface for bulk question ingestion with auto-cloning.
 * Strict CSV format - human defines the logic, AI generates variants.
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { supabase } from '@drut/shared';

// ============================================================
// Types
// ============================================================

interface CSVRow {
    topic: string;
    subtopic: string;
    question_text: string;
    options: string; // Pipe-separated: A|B|C|D
    correct_option: 'A' | 'B' | 'C' | 'D';
    fsm_explanation: string;
    fsm_tag: string;
    target_time: string;
}

interface ParsedQuestion {
    topic: string;
    subtopic: string;
    question_text: string;
    options: string[];
    correct_option_index: number;
    explanation_fsm: string;
    fsm_tag: string;
    target_time_sec: number;
    difficulty: 'easy' | 'medium' | 'hard';
}

interface UploadProgress {
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
    current: string;
    errors: string[];
}

// ============================================================
// Constants
// ============================================================

const REQUIRED_COLUMNS = [
    'topic',
    'subtopic',
    'question_text',
    'options',
    'correct_option',
    'fsm_explanation',
    'fsm_tag',
    'target_time'
];

const SAMPLE_CSV = `topic,subtopic,question_text,options,correct_option,fsm_explanation,fsm_tag,target_time
Time Speed Distance,Time & Work,"If A can complete a work in 10 days and B in 15 days, how many days will they take together?",6|5|8|7,A,"Use LCM method: LCM(10,15)=30 units. A=3u/day, B=2u/day. Together=5u/day. Time=30/5=6 days",time-work-lcm-method,45`;

// ============================================================
// Component
// ============================================================

export const BulkIngest: React.FC = () => {
    const [csvData, setCsvData] = useState<CSVRow[]>([]);
    const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [uploadComplete, setUploadComplete] = useState(false);

    // Parse CSV file
    const handleDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setParseError(null);
        setCsvData([]);
        setParsedQuestions([]);
        setUploadComplete(false);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                // Validate columns
                const headers = results.meta.fields || [];
                const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));

                if (missingColumns.length > 0) {
                    setParseError(`Missing required columns: ${missingColumns.join(', ')}`);
                    return;
                }

                // Parse and validate rows
                const rows = results.data as CSVRow[];
                const parsed: ParsedQuestion[] = [];
                const errors: string[] = [];

                rows.forEach((row, index) => {
                    try {
                        const question = parseRow(row, index);
                        parsed.push(question);
                    } catch (err: any) {
                        errors.push(`Row ${index + 2}: ${err.message}`);
                    }
                });

                if (errors.length > 0 && parsed.length === 0) {
                    setParseError(errors.join('\n'));
                    return;
                }

                setCsvData(rows);
                setParsedQuestions(parsed);

                if (errors.length > 0) {
                    setParseError(`${errors.length} rows had errors and were skipped`);
                }
            },
            error: (error) => {
                setParseError(`CSV parsing error: ${error.message}`);
            }
        });
    }, []);

    // Parse a single row
    const parseRow = (row: CSVRow, index: number): ParsedQuestion => {
        // Validate required fields
        if (!row.question_text?.trim()) {
            throw new Error('Missing question_text');
        }
        if (!row.options?.trim()) {
            throw new Error('Missing options');
        }
        if (!row.fsm_tag?.trim()) {
            throw new Error('Missing fsm_tag');
        }

        // Parse options (pipe-separated)
        const options = row.options.split('|').map(o => o.trim());
        if (options.length !== 4) {
            throw new Error(`Expected 4 options, got ${options.length}`);
        }

        // Parse correct option (A/B/C/D to index)
        const correctLetter = row.correct_option?.toUpperCase().trim();
        if (!['A', 'B', 'C', 'D'].includes(correctLetter)) {
            throw new Error(`Invalid correct_option: ${row.correct_option}`);
        }
        const correct_option_index = correctLetter.charCodeAt(0) - 65;

        // Parse target time
        const target_time_sec = parseInt(row.target_time, 10) || 60;
        if (target_time_sec < 10 || target_time_sec > 300) {
            throw new Error(`Invalid target_time: ${row.target_time} (must be 10-300)`);
        }

        // Validate fsm_tag format
        if (!/^[a-z0-9-]+$/.test(row.fsm_tag)) {
            throw new Error(`Invalid fsm_tag format: ${row.fsm_tag} (must be lowercase kebab-case)`);
        }

        return {
            topic: row.topic?.trim() || 'General',
            subtopic: row.subtopic?.trim() || 'General',
            question_text: row.question_text.trim(),
            options,
            correct_option_index,
            explanation_fsm: row.fsm_explanation?.trim() || '',
            fsm_tag: row.fsm_tag.trim(),
            target_time_sec,
            difficulty: 'medium', // Default, can be extended
        };
    };

    // Upload and clone questions
    const handleUpload = async () => {
        if (parsedQuestions.length === 0) return;

        setIsUploading(true);
        setProgress({
            total: parsedQuestions.length,
            processed: 0,
            succeeded: 0,
            failed: 0,
            current: 'Starting...',
            errors: []
        });

        try {
            // Call Edge Function for server-side processing
            const { data, error } = await supabase.functions.invoke('bulk-ingest', {
                body: { questions: parsedQuestions }
            });

            if (error) {
                throw new Error(error.message);
            }

            setProgress(prev => prev ? {
                ...prev,
                processed: parsedQuestions.length,
                succeeded: data.succeeded || 0,
                failed: data.failed || 0,
                current: 'Complete!',
                errors: data.errors || []
            } : null);

            setUploadComplete(true);

        } catch (err: any) {
            setProgress(prev => prev ? {
                ...prev,
                current: 'Failed',
                errors: [...prev.errors, err.message]
            } : null);
        } finally {
            setIsUploading(false);
        }
    };

    // Dropzone setup
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: handleDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.csv']
        },
        maxFiles: 1,
        disabled: isUploading
    });

    // Reset state
    const handleReset = () => {
        setCsvData([]);
        setParsedQuestions([]);
        setParseError(null);
        setProgress(null);
        setUploadComplete(false);
    };

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">Bulk Question Ingestion</h1>
                <p className="text-muted-foreground mt-1">
                    Upload a CSV of master questions. Each will auto-generate 3 variants for the Prove-It loop.
                </p>
            </div>

            {/* Upload Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                        CSV Upload
                    </CardTitle>
                    <CardDescription>
                        Required columns: topic, subtopic, question_text, options (A|B|C|D), correct_option, fsm_explanation, fsm_tag, target_time
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Drop Zone */}
                    {!csvData.length && !uploadComplete && (
                        <div
                            {...getRootProps()}
                            className={`
                                border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
                                ${isDragActive
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'}
                            `}
                        >
                            <input {...getInputProps()} />
                            <Upload className="h-10 w-10 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-600 font-medium">
                                {isDragActive ? 'Drop the CSV here...' : 'Drag & drop a CSV file, or click to select'}
                            </p>
                            <p className="text-sm text-gray-400 mt-2">
                                Only .csv files accepted
                            </p>
                        </div>
                    )}

                    {/* Parse Error */}
                    {parseError && (
                        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-red-700 font-medium">Parse Error</p>
                                <pre className="text-sm text-red-600 mt-1 whitespace-pre-wrap">{parseError}</pre>
                            </div>
                        </div>
                    )}

                    {/* Preview Table */}
                    {parsedQuestions.length > 0 && !uploadComplete && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">{parsedQuestions.length}</span> questions parsed successfully
                                </p>
                                <Button variant="ghost" size="sm" onClick={handleReset}>
                                    <X className="h-4 w-4 mr-1" /> Clear
                                </Button>
                            </div>

                            <div className="border rounded-xl overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FSM Tag</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {parsedQuestions.slice(0, 5).map((q, i) => (
                                            <tr key={i}>
                                                <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{q.subtopic}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate">{q.question_text}</td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                        {q.fsm_tag}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedQuestions.length > 5 && (
                                    <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500">
                                        + {parsedQuestions.length - 5} more rows
                                    </div>
                                )}
                            </div>

                            {/* Upload Button */}
                            <Button
                                onClick={handleUpload}
                                disabled={isUploading}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload & Generate Clones
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Progress */}
                    {progress && !uploadComplete && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{progress.current}</span>
                                <span className="font-medium">{progress.processed}/{progress.total}</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 transition-all duration-300"
                                    style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Success State */}
                    {uploadComplete && progress && (
                        <div className="text-center py-8">
                            <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-500 mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Complete!</h3>
                            <p className="text-gray-600 mb-4">
                                Successfully processed <span className="font-medium text-emerald-600">{progress.succeeded}</span> questions
                                with {progress.succeeded * 3} variants generated.
                            </p>
                            {progress.failed > 0 && (
                                <p className="text-sm text-red-600 mb-4">
                                    {progress.failed} questions failed
                                </p>
                            )}
                            <Button onClick={handleReset} variant="outline">
                                Upload More
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Sample CSV */}
            <Card>
                <CardHeader>
                    <CardTitle>Sample CSV Format</CardTitle>
                </CardHeader>
                <CardContent>
                    <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
                        {SAMPLE_CSV}
                    </pre>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                            const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'sample_bulk_questions.csv';
                            a.click();
                        }}
                    >
                        Download Sample CSV
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default BulkIngest;
