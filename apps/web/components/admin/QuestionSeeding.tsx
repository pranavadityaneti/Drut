import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Save, X } from 'lucide-react';
import readXlsxFile from 'read-excel-file';
import { supabase } from '@drut/shared';
import {
    getExamOptions,
    getTopicOptions,
    getSubtopicOptions,
    getExam,
    getTopic
} from '@drut/shared';

// Type definitions for parsing
interface ParsedQuestion {
    id: number;
    questionText: string;
    options: [string, string, string, string];
    correctOptionIndex: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    isValid: boolean;
    errors: string[];
    diagramFileName?: string;
    diagramFile?: File;
}

export const QuestionSeeding: React.FC = () => {
    // Taxonomy State
    const [selectedExam, setSelectedExam] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedTopic, setSelectedTopic] = useState<string>(''); // Acts as "Chapter"
    const [selectedSubtopic, setSelectedSubtopic] = useState<string>(''); // Hidden, defaults to 'General'

    // File Parsed State
    const [file, setFile] = useState<File | null>(null);
    const [parsedRows, setParsedRows] = useState<ParsedQuestion[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Sync State
    const [isSimulating, setIsSimulating] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStats, setSyncStats] = useState<{ total: number; success: number; failed: number } | null>(null);

    // Reset taxonomy when parent changes
    useEffect(() => {
        setSelectedClass('');
        setSelectedSubject('');
        setSelectedTopic('');
    }, [selectedExam]);

    useEffect(() => {
        setSelectedSubject('');
        setSelectedTopic('');
    }, [selectedClass]);

    useEffect(() => {
        setSelectedTopic('');
    }, [selectedSubject]);

    // Helpers
    const examOptions = getExamOptions();

    // Get unique subjects from current exam's topics
    const getUniqueSubjects = (examVal: string) => {
        if (!examVal) return [];
        // Hardcoded standard subjects or derived
        // Ideally derive from taxonomy, but for now standard 3
        return [
            { value: 'Mathematics', label: 'Mathematics' },
            { value: 'Physics', label: 'Physics' },
            { value: 'Chemistry', label: 'Chemistry' }
        ];
    };

    // Filter topics (Chapters) based on Exam + Class + Subject
    const getFilteredTopics = (examVal: string, classVal: string, subjectVal: string) => {
        const exam = getExam(examVal);
        if (!exam) return [];
        return exam.topics
            .filter(t => t.class_level === classVal && t.subject === subjectVal)
            .map(t => ({ value: t.value, label: t.label }));
    };

    const isTaxonomyComplete = selectedExam && selectedClass && selectedSubject && selectedTopic;

    // --- PARSING LOGIC ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setIsProcessing(true);
        setParsedRows([]);
        setSyncStats(null);

        try {
            const rows = await readXlsxFile(uploadedFile);

            if (rows.length === 0) return;

            const header = rows[0].map((c: any) => String(c).toLowerCase().trim());

            const colMap = {
                question: header.findIndex(h => h.includes('question')),
                optA: header.findIndex(h => h.includes('option a')),
                optB: header.findIndex(h => h.includes('option b')),
                optC: header.findIndex(h => h.includes('option c')),
                optD: header.findIndex(h => h.includes('option d')),
                answer: header.findIndex(h => h.includes('answer')), // Expect 'A', 'B', 'C', 'D'
                difficulty: header.findIndex(h => h.includes('difficulty')),
                image: header.findIndex(h => h.includes('image') || h.includes('diagram'))
            };

            // Validate Header
            if (Object.values({ ...colMap, image: 0 }).some(idx => idx === -1)) { // Image is optional, others required
                const missing = Object.entries(colMap).filter(([k, v]) => k !== 'image' && v === -1).map(([k]) => k);
                if (missing.length > 0) throw new Error(`Invalid Header. Missing: ${missing.join(', ')}`);
            }

            const parsed: ParsedQuestion[] = rows.slice(1).map((row, index) => {
                const qText = String(row[colMap.question] || '').trim();
                const opts = [
                    String(row[colMap.optA] || '').trim(),
                    String(row[colMap.optB] || '').trim(),
                    String(row[colMap.optC] || '').trim(),
                    String(row[colMap.optD] || '').trim(),
                ] as [string, string, string, string];

                const ansRaw = String(row[colMap.answer] || '').toUpperCase().trim();
                const diffRaw = String(row[colMap.difficulty] || '').toLowerCase().trim();
                const imageFileRaw = colMap.image !== -1 ? String(row[colMap.image] || '').trim() : '';

                // Validation
                const errors: string[] = [];
                if (!qText) errors.push("Missing Question Text");
                if (opts.some(o => !o)) errors.push("Missing Options");

                // Map Answer (A/B/C/D) to Index (0-3)
                let correctIdx = -1;
                if (['A', 'B', 'C', 'D'].includes(ansRaw)) {
                    correctIdx = ansRaw.charCodeAt(0) - 65;
                } else {
                    // Try to match text?
                    const matchIdx = opts.findIndex(o => o.toUpperCase() === ansRaw);
                    if (matchIdx !== -1) correctIdx = matchIdx;
                    else errors.push(`Invalid Answer: ${ansRaw}`);
                }

                // Map Difficulty
                let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
                if (['easy', 'medium', 'hard'].includes(diffRaw)) {
                    difficulty = (diffRaw.charAt(0).toUpperCase() + diffRaw.slice(1)) as any;
                } else if (diffRaw) {
                    errors.push(`Invalid Difficulty: ${diffRaw}`);
                }

                return {
                    id: index + 1,
                    questionText: qText,
                    options: opts,
                    correctOptionIndex: correctIdx,
                    difficulty,
                    isValid: errors.length === 0,
                    errors,
                    diagramFileName: imageFileRaw
                };
            });

            setParsedRows(parsed);
            // Attempt auto-match if images already uploaded
            if (diagramFiles.length > 0) {
                matchDiagrams(parsed, diagramFiles);
            }

        } catch (error: any) {
            alert(`Error parsing file: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- IMAGE HANDLING ---
    const [diagramFiles, setDiagramFiles] = useState<File[]>([]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setDiagramFiles(prev => [...prev, ...newFiles]);
            // Re-match logic
            matchDiagrams(parsedRows, [...diagramFiles, ...newFiles]);
        }
    };

    const matchDiagrams = (rows: ParsedQuestion[], files: File[]) => {
        const updatedRows = rows.map(row => {
            if (!row.diagramFileName) return row;
            // Case insensitive match
            const match = files.find(f => f.name.toLowerCase() === row.diagramFileName!.toLowerCase());
            return { ...row, diagramFile: match };
        });
        setParsedRows(updatedRows);
    };

    const clearImages = () => {
        setDiagramFiles([]);
        setParsedRows(parsedRows.map(r => ({ ...r, diagramFile: undefined })));
    };

    // --- SYNC LOGIC ---
    const handleSync = async () => {
        if (!isTaxonomyComplete || parsedRows.length === 0) return;

        setIsSyncing(true);
        const validRows = parsedRows.filter(r => r.isValid);
        let successCount = 0;
        let failCount = 0;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            alert("No user session found");
            setIsSyncing(false);
            return;
        }

        const batchId = `BATCH-${Date.now()}`;
        const topicLabel = getTopic(selectedExam, selectedTopic)?.label || selectedTopic;
        const subtopicLabel = 'General';

        // Process in chunks of 10
        const CHUNK_SIZE = 10;
        for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
            const chunk = validRows.slice(i, i + CHUNK_SIZE);

            // Upload Images for this chunk first (Parallel)
            const chunkWithUrls = await Promise.all(chunk.map(async (row) => {
                let imageUrl = null;
                if (row.diagramFile) {
                    try {
                        const fileExt = row.diagramFile.name.split('.').pop();
                        const fileName = `seed_${session.user.id.slice(0, 5)}_${Date.now()}_${row.id}.${fileExt}`;
                        const { data, error } = await supabase.storage
                            .from('question-assets') // Bucket must exist
                            .upload(fileName, row.diagramFile);

                        if (!error && data) {
                            const { data: { publicUrl } } = supabase.storage
                                .from('question-assets')
                                .getPublicUrl(fileName);
                            imageUrl = publicUrl;
                        } else {
                            console.error(`Failed to upload image for Q${row.id}:`, error);
                        }
                    } catch (e) {
                        console.error(`Exception uploading image for Q${row.id}`, e);
                    }
                }
                return { ...row, imageUrl };
            }));


            const payload = chunkWithUrls.map(row => ({
                question_id: `seed-${session.user.id.slice(0, 5)}-${Date.now()}-${row.id}`,
                exam_profile: selectedExam,
                topic: topicLabel,
                subtopic: subtopicLabel,
                difficulty: row.difficulty,
                fsm_tag: 'general',
                question_data: {
                    questionText: row.questionText,
                    options: row.options.map(text => ({ text })),
                    correctOptionIndex: row.correctOptionIndex,
                    timeTargets: { jee_main: 60, cat: 60 },
                    visualDescription: null,
                    diagramRequired: !!row.imageUrl, // Flag if diagram exists
                    image_url: row.imageUrl || null, // Add URL
                    source: 'admin_upload',
                    batch_id: batchId,
                    upload_row_index: row.id,
                    class_level: selectedClass,
                    subject: selectedSubject
                },
                created_by: session.user.id,
                times_served: 0
            }));

            const { error } = await supabase.from('cached_questions').insert(payload);

            if (error) {
                console.error("Batch insert error:", error);
                failCount += chunk.length;
            } else {
                successCount += chunk.length;
            }
        }

        setSyncStats({ total: validRows.length, success: successCount, failed: failCount });
        setIsSyncing(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                        Bulk Question Seeding
                    </h2>
                    <p className="text-muted-foreground">Upload Excel/CSV to seed static questions for AI augmentation.</p>
                </div>
                {syncStats && (
                    <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-lg flex items-center gap-4">
                        <span className="text-emerald-800 font-bold">Batch: {syncStats.success} / {syncStats.total} Uploaded</span>
                        <Button size="sm" variant="ghost" onClick={() => { setSyncStats(null); setParsedRows([]); setFile(null); clearImages(); }}>Clear</Button>
                    </div>
                )}
            </div>

            {/* Step 1: Taxonomy */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">1. Select Target Context (Required)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* 1. Exam */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Exam Profile</label>
                        <Select
                            value={selectedExam}
                            onChange={(e) => setSelectedExam(e.target.value)}
                            options={[{ value: '', label: '-- Select --' }, ...examOptions]}
                        />
                    </div>

                    {/* 2. Class */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Class</label>
                        <Select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            options={[
                                { value: '', label: '-- Select --' },
                                { value: '11', label: 'Class 11 (1st Year)' },
                                { value: '12', label: 'Class 12 (2nd Year)' }
                            ]}
                        />
                    </div>

                    {/* 3. Subject */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Subject</label>
                        <Select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            options={[
                                { value: '', label: '-- Select --' },
                                ...getUniqueSubjects(selectedExam)
                            ]}
                            disabled={!selectedExam}
                        />
                    </div>

                    {/* 4. Chapter (Topic) */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Chapter</label>
                        <Select
                            value={selectedTopic}
                            onChange={(e) => setSelectedTopic(e.target.value)}
                            options={[
                                { value: '', label: '-- Select --' },
                                ...getFilteredTopics(selectedExam, selectedClass, selectedSubject)
                            ]}
                            disabled={!selectedSubject || !selectedClass}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Step 2: Upload */}
            <Card className={!isTaxonomyComplete ? 'opacity-50 pointer-events-none' : ''}>
                <CardHeader>
                    <CardTitle className="text-lg">2. Upload Spreadsheet</CardTitle>
                    <CardDescription>
                        Columns: <strong>Question, Option A...D, Answer, Difficulty, Image (Filename)</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!file ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:bg-gray-50 transition-colors">
                            <input
                                type="file"
                                accept=".xlsx, .csv"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                <Upload className="w-10 h-10 text-gray-400" />
                                <span className="font-medium text-gray-700">Click to upload .xlsx or .csv</span>
                            </label>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-100 p-2 rounded">
                                    <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="font-medium">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setFile(null); setParsedRows([]); }}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Step 3: Upload Diagrams */}
            <Card className={!isTaxonomyComplete || !file ? 'opacity-50 pointer-events-none' : ''}>
                <CardHeader>
                    <CardTitle className="text-lg">3. Upload Diagrams (Optional)</CardTitle>
                    <CardDescription>
                        Drag & Drop multiple images matching the filenames in 'Image' column.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl p-6 text-center hover:bg-blue-50 transition-colors">
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="image-upload"
                        />
                        <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-2">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">🖼️</span>
                                <span className="font-bold text-blue-700">
                                    {diagramFiles.length > 0 ? `${diagramFiles.length} Images Selected` : 'Select Images'}
                                </span>
                            </div>
                            {diagramFiles.length === 0 && <span className="text-sm text-blue-600">Click to browse multiple files</span>}
                        </label>
                        {diagramFiles.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                {diagramFiles.slice(0, 5).map((f, i) => (
                                    <span key={i} className="text-xs bg-white border px-2 py-1 rounded shadow-sm">{f.name}</span>
                                ))}
                                {diagramFiles.length > 5 && <span className="text-xs text-muted-foreground">+{diagramFiles.length - 5} more</span>}
                                <Button size="sm" variant="outline" onClick={clearImages} className="ml-2 h-6 text-xs text-red-500">Clear All</Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>


            {/* Step 4: Preview & Sync */}
            {parsedRows.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg">
                            Preview ({parsedRows.filter(r => r.isValid).length} valid, {parsedRows.filter(r => !r.isValid).length} invalid)
                        </h3>
                        <Button
                            onClick={handleSync}
                            disabled={isSyncing || parsedRows.every(r => !r.isValid)}
                            className="bg-primary hover:bg-primary/90 text-white gap-2"
                        >
                            {isSyncing ? 'Syncing...' : <><Save className="w-4 h-4" /> Sync to Database</>}
                        </Button>
                    </div>

                    <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
                        <div className="max-h-[500px] overflow-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-muted/50 sticky top-0 backdrop-blur-sm">
                                    <tr>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Image</th>
                                        <th className="px-4 py-3">Question</th>
                                        <th className="px-4 py-3">Correct</th>
                                        <th className="px-4 py-3">Difficulty</th>
                                        <th className="px-4 py-3">Issues</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {parsedRows.map((row) => (
                                        <tr key={row.id} className={row.isValid ? 'hover:bg-muted/30' : 'bg-red-50 hover:bg-red-100 dark:bg-red-900/10'}>
                                            <td className="px-4 py-3">
                                                {row.isValid
                                                    ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                                                    : <AlertCircle className="w-5 h-5 text-red-500" />
                                                }
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.diagramFileName ? (
                                                    row.diagramFile ? (
                                                        <span className="text-xs flex items-center gap-1 text-emerald-600 font-medium">
                                                            <CheckCircle className="w-3 h-3" /> Found
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs flex items-center gap-1 text-orange-600 font-medium" title={`Expected: ${row.diagramFileName}`}>
                                                            <AlertCircle className="w-3 h-3" /> Missing
                                                        </span>
                                                    )
                                                ) : <span className="text-xs text-muted-foreground">-</span>}
                                            </td>
                                            <td className="px-4 py-3 max-w-md truncate" title={row.questionText}>
                                                {row.questionText || <span className="text-muted-foreground italic">(Empty)</span>}
                                            </td>
                                            <td className="px-4 py-3 font-mono">
                                                {row.correctOptionIndex !== -1 ? String.fromCharCode(65 + row.correctOptionIndex) : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${row.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                                                    row.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                    {row.difficulty}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-red-600 font-medium text-xs">
                                                {row.errors.join(', ')}
                                                {row.diagramFileName && !row.diagramFile && (
                                                    <span className="block text-orange-600">Image file missing</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
