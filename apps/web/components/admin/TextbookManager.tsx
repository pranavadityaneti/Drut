import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '@drut/shared';
import { Upload, Book, FileText, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { Select } from '../ui/Select'; // Assuming we have this, or use native select

interface Textbook {
    id: string;
    title: string;
    subject: string;
    board: string;
    class_level: string;
    file_path: string; // Added field
    status: 'processing' | 'ready' | 'error';
    uploaded_at: string;
}

export const TextbookManager: React.FC = () => {
    const [textbooks, setTextbooks] = useState<Textbook[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    // Upload Form State
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('Physics');
    const [board, setBoard] = useState('CBSE');
    const [classLevel, setClassLevel] = useState('11');

    useEffect(() => {
        fetchTextbooks();
    }, []);

    const fetchTextbooks = async () => {
        try {
            const { data, error } = await supabase
                .from('textbooks')
                .select('*')
                .order('uploaded_at', { ascending: false });

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
            // Auto-fill title if empty
            if (!title) {
                setTitle(selectedFile.name.replace('.pdf', ''));
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);

        try {
            // 1. Upload file to Storage
            const filePath = `textbooks/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const { error: uploadError } = await supabase.storage
                .from('textbooks') // Ensure this bucket exists!
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Insert metadata to DB
            const { error: dbError } = await supabase
                .from('textbooks')
                .insert({
                    title,
                    subject,
                    board,
                    class_level: classLevel,
                    file_path: filePath,
                    status: 'processing' // Edge Function will pick this up
                });

            if (dbError) throw dbError;

            // 3. Reset form and refresh list
            setFile(null);
            setTitle('');
            await fetchTextbooks();

            // Trigger Edge Function (fire and forget, or let trigger handle it)
            // For now, assuming DB trigger or separate Cron will handle 'processing' rows
            // Or we can invoke explicitly:
            await supabase.functions.invoke('ingest-textbook', {
                body: { filePath } // Payload specific to function
            });

        } catch (error: any) {
            console.error('Upload failed:', error.message);
            alert(`Upload failed: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string, filePath: string) => {
        if (!confirm('Are you sure? This will delete the book and all associated embeddings.')) return;

        try {
            // Delete from DB (cascade deletes chunks)
            await supabase.from('textbooks').delete().match({ id });

            // Delete from Storage
            // Note: We might need the full path logic here if filePath stored is relative
            // await supabase.storage.from('textbooks').remove([filePath]);

            fetchTextbooks();
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Sidebar */}
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
                            <select
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full p-2 mt-1 border rounded-md text-sm bg-background"
                            >
                                <option>Physics</option>
                                <option>Chemistry</option>
                                <option>Maths</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Board</label>
                            <select
                                value={board}
                                onChange={(e) => setBoard(e.target.value)}
                                className="w-full p-2 mt-1 border rounded-md text-sm bg-background"
                            >
                                <option>CBSE</option>
                                <option>TSBIE</option>
                                <option>ICSE</option>
                                <option>Ncert</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium">Class</label>
                        <select
                            value={classLevel}
                            onChange={(e) => setClassLevel(e.target.value)}
                            className="w-full p-2 mt-1 border rounded-md text-sm bg-background"
                        >
                            <option>11</option>
                            <option>12</option>
                        </select>
                    </div>

                    <Button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className="w-full"
                    >
                        {isUploading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : 'Upload & Process'}
                    </Button>
                </CardContent>
            </Card>

            {/* List of Textbooks */}
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
                                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(book.id, book.file_path)}>
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
