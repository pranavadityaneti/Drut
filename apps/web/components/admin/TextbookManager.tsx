import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '@drut/shared';
import { Upload, Book, FileText, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { Select } from '../ui/Select';
import * as pdfjsLibProxy from 'pdfjs-dist';
// @ts-ignore
const pdfjsLib = pdfjsLibProxy.default || pdfjsLibProxy;

// Set worker to CDN to avoid Vite build/worker issues
try {
    if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
        // Use unpkg with .mjs extension for v5 compatibility
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }
} catch (e) {
    console.warn('PDF Worker setup warning:', e);
}

interface Textbook {
    id: string;
    title: string;
    subject: string;
    board: string;
    class_level: string;
    file_path: string;
    status: 'processing' | 'ready' | 'error';
    uploaded_at: string;
}

export const TextbookManager: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('Physics');
    const [board, setBoard] = useState('Ncert');
    const [classLevel, setClassLevel] = useState('11');
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(''); // Text feedback for user
    const [params, setParams] = useState({
        q: '',
        subject: '',
        board: '',
        class_level: ''
    });

    const [textbooks, setTextbooks] = useState<Textbook[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch User
        supabase.auth.getUser().then(({ data }) => setUser(data.user));
    }, []);

    useEffect(() => {
        fetchTextbooks();
    }, [params]);

    const fetchTextbooks = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('textbooks')
                .select('*')
                .order('uploaded_at', { ascending: false });

            if (params.subject && params.subject !== 'all') query = query.eq('subject', params.subject);
            if (params.board && params.board !== 'all') query = query.eq('board', params.board);
            if (params.class_level && params.class_level !== 'all') query = query.eq('class_level', params.class_level);
            if (params.q) query = query.ilike('title', `%${params.q}%`);

            const { data, error } = await query;
            if (error) throw error;
            setTextbooks(data || []);
        } catch (error) {
            console.error('Error fetching textbooks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            if (!title) {
                setTitle(selectedFile.name.replace('.pdf', ''));
            }
        }
    };

    /**
     * Extracts text using Client-Side Browser RAM.
     * Pros: No 50MB Server limit, no 128MB RAM Server Crash.
     */
    const extractTextClientSide = async (file: File): Promise<string> => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;

            let fullText = '';
            console.log(`[Client] PDF loaded: ${pdf.numPages} pages.`);

            // Extract text page by page
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += pageText + ' \n';

                // Optional: Update progress
                if (i % 10 === 0) setUploadStatus(`Extracting text: Page ${i}/${pdf.numPages}...`);
            }
            return fullText;
        } catch (error) {
            console.error('Client-side parsing failed:', error);
            throw new Error('Failed to extract text. File might be corrupted or encrypted.');
        }
    };

    const handleUpload = async () => {
        if (!file || !title) return;

        try {
            setIsUploading(true);
            setUploadStatus('Uploading PDF for archival...');

            // 1. Upload File to Storage (Archival)
            const fileExt = file.name.split('.').pop();
            const fileName = `${title.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('textbooks')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Insert Metadata into DB
            setUploadStatus('Registering textbook...');
            const { data: tbData, error: dbError } = await supabase
                .from('textbooks')
                .insert({
                    title,
                    subject,
                    board,
                    class_level: classLevel,
                    file_path: filePath,
                    status: 'processing',
                    uploaded_by: user?.id
                })
                .select()
                .single();

            if (dbError) throw dbError;

            // 3. Extract Text Client-Side
            setUploadStatus('Extracting text (Browser)...');
            let extractedText = '';
            try {
                extractedText = await extractTextClientSide(file);
                console.log(`Extracted ${extractedText.length} characters.`);

                if (extractedText.trim().length < 50) {
                    alert('Warning: Extracted text is very short (Scanned PDF?). AI context might be empty.');
                }
            } catch (err) {
                console.warn('Client extraction failed:', err);
                alert('Text extraction failed. Processing will continue on server (may fail if file is large).');
            }

            // 4. Send Text to Backend
            setUploadStatus('Ingesting chunks...');
            const { error: ingestError } = await supabase.functions.invoke('ingest-textbook', {
                body: {
                    filePath,
                    textContent: extractedText
                }
            });

            if (ingestError) {
                console.error('Ingest request failed:', ingestError);
                // Mark error in DB
                await supabase.from('textbooks').update({ status: 'error', error_message: 'Ingestion Request Failed' }).eq('id', tbData.id);
            } else {
                console.log('Ingestion triggered successfully');
            }

            // Reset
            setFile(null);
            setTitle('');
            setUploadStatus('');
            fetchTextbooks();

        } catch (error: any) {
            console.error('Upload failed:', error);
            alert(`Upload failed: ${error.message}`);
            setUploadStatus('Failed');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string, filePath: string) => {
        if (!confirm('Are you sure? This will delete the book and all associated embeddings.')) return;
        try {
            // Delete from DB (cascade deletes chunks)
            const { error: dbError } = await supabase.from('textbooks').delete().eq('id', id);
            if (dbError) throw dbError;

            // Delete from Storage
            const { error: storageError } = await supabase.storage.from('textbooks').remove([filePath]);
            if (storageError) {
                console.warn('Storage delete failed (potentially already deleted):', storageError);
                // We don't throw here to ensure UI updates if DB row is gone
            }

            fetchTextbooks();
            alert('Textbook deleted successfully');
        } catch (error: any) {
            console.error('Delete failed:', error);
            alert(`Delete failed: ${error.message || error.error_description || JSON.stringify(error)}`);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 h-fit">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" /> Upload Textbook
                    </CardTitle>
                    <CardDescription>Upload PDF to train the syllabus context.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">PDF File</label>
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileChange}
                            className="w-full mt-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Title</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-2 mt-1 border rounded-md text-sm bg-background"
                            placeholder="e.g. Physics Vol 1"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-sm font-medium">Subject</label>
                            <Select
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                options={[
                                    { value: 'Physics', label: 'Physics' },
                                    { value: 'Chemistry', label: 'Chemistry' },
                                    { value: 'Maths', label: 'Maths' }
                                ]}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Board</label>
                            <Select
                                value={board}
                                onChange={(e) => setBoard(e.target.value)}
                                options={[
                                    { value: 'CBSE', label: 'CBSE' },
                                    { value: 'TSBIE', label: 'TSBIE' },
                                    { value: 'ICSE', label: 'ICSE' },
                                    { value: 'Ncert', label: 'Ncert' }
                                ]}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium">Class</label>
                        <Select
                            value={classLevel}
                            onChange={(e) => setClassLevel(e.target.value)}
                            options={[
                                { value: '11', label: '11' },
                                { value: '12', label: '12' }
                            ]}
                        />
                    </div>

                    <Button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className="w-full"
                    >
                        {isUploading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="animate-spin h-4 w-4" />
                                {uploadStatus || 'Processing...'}
                            </div>
                        ) : 'Upload & Process'}
                    </Button>
                </CardContent>
            </Card>

            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Book className="h-5 w-5" /> Library
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : textbooks.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                            <p className="text-muted-foreground">No textbooks uploaded yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {textbooks.map((book) => (
                                <div key={book.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-sm">{book.title}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                                                    {book.board} · {book.subject} · {book.class_level}
                                                </span>
                                                {book.status === 'ready' && (
                                                    <span className="text-xs flex items-center gap-1 text-green-600">
                                                        <CheckCircle className="h-3 w-3" /> Ready
                                                    </span>
                                                )}
                                                {book.status === 'processing' && (
                                                    <span className="text-xs flex items-center gap-1 text-blue-600">
                                                        <Loader2 className="h-3 w-3 animate-spin" /> Processing
                                                    </span>
                                                )}
                                                {book.status === 'error' && (
                                                    <span className="text-xs flex items-center gap-1 text-red-600">
                                                        <AlertCircle className="h-3 w-3" /> Error
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDelete(book.id, book.file_path);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
