import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '@drut/shared';
import { Upload, FileText, CheckCircle, Loader2, Trash2, Folder, ChevronRight, Home, Plus, FolderPlus, Edit } from 'lucide-react';
import * as pdfjsLibProxy from 'pdfjs-dist';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

// @ts-ignore
const pdfjsLib = pdfjsLibProxy.default || pdfjsLibProxy;

// Helper: PDF Worker Setup
try {
    if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }
} catch (e) { console.warn('PDF Worker setup warning:', e); }

// --- TYPES ---
interface KnowledgeNode {
    id: string;
    parent_id: string | null;
    name: string;
    node_type: 'board' | 'class' | 'subject' | 'topic' | 'folder';
    metadata: any;
    created_at: string;
    // Computed for UI
    children_count?: number;
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

export const KnowledgeBase: React.FC = () => {
    const [path, setPath] = useState<KnowledgeNode[]>([]);
    const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
    const [loading, setLoading] = useState(true);

    // Create Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newNodeName, setNewNodeName] = useState('');
    const [newNodeTag, setNewNodeTag] = useState(''); // Optional override
    const [createPending, setCreatePending] = useState(false);

    // Edit Modal State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingNode, setEditingNode] = useState<KnowledgeNode | null>(null);

    const currentFolder = path.length > 0 ? path[path.length - 1] : null;

    // Fetch Nodes on Path Change
    useEffect(() => {
        fetchNodes();
    }, [currentFolder]);

    const fetchNodes = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('knowledge_nodes')
                .select('*')
                .order('name');

            if (currentFolder) {
                query = query.eq('parent_id', currentFolder.id);
            } else {
                query = query.is('parent_id', null);
            }

            const { data, error } = await query;
            if (error) throw error;
            setNodes(data || []);
        } catch (err) {
            console.error('Error fetching nodes:', err);
        } finally {
            setLoading(false);
        }
    };

    // --- NAVIGATION ---
    const handleNavigate = (node: KnowledgeNode) => {
        setPath([...path, node]);
    };

    const handleBreadcrumbClick = (index: number) => {
        setPath(path.slice(0, index + 1));
    };

    const handleRootClick = () => {
        setPath([]);
    };

    // --- DELETION ---
    const handleDeleteNode = async (id: string) => {
        if (!confirm('Are you sure you want to delete this folder and all its contents?')) return;

        try {
            const { error } = await supabase.from('knowledge_nodes').delete().eq('id', id);
            if (error) throw error;
            fetchNodes();
        } catch (err: any) {
            alert('Delete failed: ' + err.message);
        }
    };

    // --- CREATION LOGIC ---
    const getNextNodeType = () => {
        if (!currentFolder) return 'board';
        if (currentFolder.node_type === 'board') return 'class';
        if (currentFolder.node_type === 'class') return 'subject';
        if (currentFolder.node_type === 'subject') return 'topic';
        return 'folder';
    };

    const handleCreateNode = async () => {
        if (!newNodeName.trim()) return;
        setCreatePending(true);
        try {
            const type = getNextNodeType();

            // Construct Metadata
            const meta: any = {};
            // Default logic: Tag = Name unless overridden
            const tagValue = newNodeTag.trim() || newNodeName.trim();

            if (type === 'board') meta.board = tagValue;
            if (type === 'class') meta.class = tagValue; // '11' or '12'
            if (type === 'subject') meta.subject = tagValue;

            const { error } = await supabase.from('knowledge_nodes').insert({
                parent_id: currentFolder?.id || null,
                name: newNodeName.trim(),
                node_type: type,
                metadata: meta
            });

            if (error) throw error;

            setIsCreateOpen(false);
            setNewNodeName('');
            setNewNodeTag('');
            fetchNodes();
        } catch (err: any) {
            alert('Failed to create folder: ' + err.message);
        } finally {
            setCreatePending(false);
        }
    };

    // --- EDIT LOGIC ---
    const handleEditStart = (node: KnowledgeNode) => {
        setEditingNode(node);
        setNewNodeName(node.name);
        // Extract tag from metadata based on type
        let tag = '';
        if (node.node_type === 'board') tag = node.metadata?.board || '';
        if (node.node_type === 'class') tag = node.metadata?.class || '';
        if (node.node_type === 'subject') tag = node.metadata?.subject || '';
        setNewNodeTag(tag);
        setIsEditOpen(true);
    };

    const handleUpdateNode = async () => {
        if (!editingNode || !newNodeName) return;
        setCreatePending(true);
        try {
            // Reconstruct Metadata
            const meta = { ...editingNode.metadata };
            // Update the relevant field based on type
            if (editingNode.node_type === 'board') meta.board = newNodeTag;
            if (editingNode.node_type === 'class') meta.class = newNodeTag;
            if (editingNode.node_type === 'subject') meta.subject = newNodeTag;

            const { error } = await supabase
                .from('knowledge_nodes')
                .update({ name: newNodeName, metadata: meta })
                .eq('id', editingNode.id);

            if (error) throw error;

            setIsEditOpen(false);
            setEditingNode(null);
            setNewNodeName('');
            setNewNodeTag('');
            fetchNodes(); // Refresh
        } catch (err: any) {
            alert('Error updating: ' + err.message);
        } finally {
            setCreatePending(false);
        }
    };

    // Combine metadata from path for context
    const currentContext = path.reduce((acc, node) => ({ ...acc, ...node.metadata }), {});

    // Determine if we are at a "Leaf" level where files can be uploaded
    // We allow files in 'subject', 'topic', or 'folder'
    const canUploadHere = currentFolder && ['subject', 'topic', 'folder'].includes(currentFolder.node_type);

    return (
        <div className="space-y-6">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 overflow-x-auto pb-2">
                <button
                    onClick={handleRootClick}
                    className={`flex items-center hover:text-primary whitespace-nowrap ${path.length === 0 ? 'font-bold text-primary' : ''}`}
                >
                    <Home className="h-4 w-4 mr-1" /> Root
                </button>
                {path.map((item, idx) => (
                    <React.Fragment key={item.id}>
                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                        <button
                            onClick={() => handleBreadcrumbClick(idx)}
                            className={`hover:text-primary whitespace-nowrap ${idx === path.length - 1 ? 'font-bold text-primary' : ''}`}
                        >
                            {item.name}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {/* Folder Grid */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold tracking-tight">
                        {currentFolder ? currentFolder.name : 'Knowledge Base'}
                    </h2>
                    <Button onClick={() => setIsCreateOpen(true)} size="sm" className="gap-2">
                        <FolderPlus className="h-4 w-4" />
                        Add {getNextNodeType().charAt(0).toUpperCase() + getNextNodeType().slice(1)}
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : (
                    <>
                        {nodes.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {nodes.map((node) => (
                                    <Card
                                        key={node.id}
                                        className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group relative"
                                    >
                                        <div onClick={() => handleNavigate(node)}>
                                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                                <FolderIcon type={node.node_type} />
                                                <div>
                                                    <CardTitle className="text-lg">{node.name}</CardTitle>
                                                    <CardDescription className="capitalize text-xs flex gap-2">
                                                        <span>{node.node_type}</span>
                                                        {/* Show Tag safely */}
                                                        {(node.metadata?.board || node.metadata?.class || node.metadata?.subject) && (
                                                            <span className="bg-slate-100 px-1 rounded text-slate-600">
                                                                {node.metadata.board || node.metadata.class || node.metadata.subject}
                                                            </span>
                                                        )}
                                                    </CardDescription>
                                                </div>
                                            </CardHeader>
                                        </div>

                                        {/* Actions (visible on hover) */}
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditStart(node);
                                            }}>
                                                <Edit className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-500" onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteNode(node.id);
                                            }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            !canUploadHere && <div className="text-center p-12 text-muted-foreground border-2 border-dashed rounded-xl">No folders yet. Create one to get started.</div>
                        )}
                    </>
                )}
            </div>

            {/* File Manager (Only visible if allowed type) */}
            {canUploadHere && (
                <>
                    <div className="my-8 border-t" />
                    <LeafFileManager
                        context={currentContext}
                        pathLabels={path.map(p => p.name)}
                    />
                </>
            )}

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New {getNextNodeType()}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                placeholder={`e.g. ${getNextNodeType() === 'class' ? 'Class 11' : 'Physics'}`}
                                value={newNodeName}
                                onChange={e => setNewNodeName(e.target.value)}
                            />
                        </div>

                        {getNextNodeType() === 'board' ? (
                            <div className="space-y-2">
                                <Label>Syllabus Standard (Board Mapping)</Label>
                                <select
                                    className="w-full flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={newNodeTag}
                                    onChange={e => setNewNodeTag(e.target.value)}
                                >
                                    <option value="">Select Standard...</option>
                                    <option value="Ncert">NCERT (For AP/TS State, EAPCET)</option>
                                    <option value="CBSE">CBSE (For JEE Main/Adv)</option>
                                    <option value="ICSE">ICSE</option>
                                    <option value="State">Other State Board</option>
                                </select>
                                <p className="text-xs text-muted-foreground">
                                    Maps this folder to the AI's syllabus knowledge.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>Tag Override (Optional)</Label>
                                <Input
                                    placeholder="Auto-generated if empty"
                                    value={newNodeTag}
                                    onChange={e => setNewNodeTag(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateNode} disabled={createPending || !newNodeName}>
                            {createPending ? <Loader2 className="animate-spin h-4 w-4" /> : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const FolderIcon = ({ type }: { type: string }) => {
    let colorClass = "bg-slate-100 text-slate-500";
    if (type === 'board') colorClass = "bg-blue-50 text-blue-600";
    if (type === 'class') colorClass = "bg-emerald-50 text-emerald-600";
    if (type === 'subject') colorClass = "bg-amber-50 text-amber-600";
    if (type === 'topic') colorClass = "bg-violet-50 text-violet-600";
    if (type === 'folder' || type === 'workbook') colorClass = "bg-pink-50 text-pink-600";

    return (
        <div className={`p-3 rounded-full transition-colors ${colorClass}`}>
            <Folder className="h-8 w-8 fill-current opacity-80" />
        </div>
    );
};

// --- LEAF COMPONENT ---
const LeafFileManager: React.FC<{ context: any, pathLabels: string[] }> = ({ context, pathLabels }) => {
    const [user, setUser] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [textbooks, setTextbooks] = useState<Textbook[]>([]);
    const [loading, setLoading] = useState(true);
    // Multi-file state
    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
    const [selectedContentType, setSelectedContentType] = useState<string>('textbook');
    // Link Dialog State
    const [isLinkOpen, setIsLinkOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkType, setLinkType] = useState('article'); // 'article', 'video'
    const [linkPending, setLinkPending] = useState(false);

    // Initial Load
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user));
        fetchFiles();
    }, [context]);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            // Filter strictly by the current Context
            let query = supabase.from('textbooks').select('*').order('uploaded_at', { ascending: false });

            // Apply filters ONLY if they exist in context (flexible)
            if (context.board) query = query.eq('board', context.board);
            if (context.class) query = query.eq('class_level', context.class);
            if (context.subject) query = query.eq('subject', context.subject);

            if (!context.board && !context.class && !context.subject) {
                // Safe default
            }

            const { data, error } = await query;
            if (error) throw error;
            setTextbooks(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadBatch = async () => {
        if (filesToUpload.length === 0) return;

        try {
            setIsUploading(true);

            let successCount = 0;

            for (let i = 0; i < filesToUpload.length; i++) {
                const file = filesToUpload[i];
                const title = file.name.replace('.pdf', '');

                setUploadStatus(`Processing ${i + 1}/${filesToUpload.length}: ${title}...`);

                // 1. Upload Storage
                const fileExt = file.name.split('.').pop();
                const fileName = `${title.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
                const { error: upErr } = await supabase.storage.from('textbooks').upload(fileName, file);
                if (upErr) throw upErr;

                // 2. Insert DB
                setUploadStatus(`Registering ${i + 1}/${filesToUpload.length}...`);
                const { data: tbData, error: dbErr } = await supabase.from('textbooks').insert({
                    title,
                    file_path: fileName,
                    board: context.board || 'general',
                    class_level: context.class || 'general',
                    subject: context.subject || 'general',
                    content_type: selectedContentType,
                    status: 'processing',
                    uploaded_by: user?.id
                }).select().single();

                if (dbErr) throw dbErr;

                // 3. Client Parse
                setUploadStatus(`Extracting Text ${i + 1}/${filesToUpload.length}...`);
                let extracted = '';
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                    const pdf = await loadingTask.promise;
                    for (let p = 1; p <= pdf.numPages; p++) {
                        const page = await pdf.getPage(p);
                        const textContent = await page.getTextContent();
                        extracted += textContent.items.map((item: any) => item.str).join(' ') + '\n';
                    }
                } catch (e) {
                    console.warn(e);
                }

                // 4. Ingest
                setUploadStatus(`Ingesting ${i + 1}/${filesToUpload.length}...`);
                const { error: fnErr } = await supabase.functions.invoke('ingest-textbook', {
                    body: { filePath: fileName, textContent: extracted }
                });

                if (fnErr) {
                    await supabase.from('textbooks').update({ status: 'error' }).eq('id', tbData.id);
                    console.error(fnErr);
                }

                successCount++;
            }

            setFilesToUpload([]);
            fetchFiles();
            alert(`Successfully uploaded ${successCount} files.`);

        } catch (err: any) {
            alert('Batch Error: ' + err.message);
        } finally {
            setIsUploading(false);
            setUploadStatus('');
        }
    };

    const handleDelete = async (id: string, path: string) => {
        if (!confirm('Delete this file?')) return;
        await supabase.from('textbooks').delete().eq('id', id);
        // Only remove from storage if it's a file path, not a URL
        if (!path.startsWith('http')) {
            await supabase.storage.from('textbooks').remove([path]);
        }
        fetchFiles();
    };

    const handleAddLink = async () => {
        if (!linkUrl) return;
        setLinkPending(true);
        try {
            // 1. Insert DB Row
            const { data: tbData, error: dbErr } = await supabase.from('textbooks').insert({
                title: linkUrl, // Will be updated by Ingest
                file_path: linkUrl, // Use URL as unique path
                board: context.board || 'general',
                class_level: context.class || 'general',
                subject: context.subject || 'general',
                content_type: linkType,
                url: linkUrl,
                status: 'processing',
                uploaded_by: user?.id
            }).select().single();
            if (dbErr) throw dbErr;

            // 2. Call Edge Function
            const { error: fnErr } = await supabase.functions.invoke('ingest-link', {
                body: { url: linkUrl, type: linkType, parentId: tbData.id }
            });

            if (fnErr) {
                await supabase.from('textbooks').update({ status: 'error' }).eq('id', tbData.id);
                console.error(fnErr);
                alert('Ingestion failed: ' + fnErr.message);
            } else {
                fetchFiles();
                setIsLinkOpen(false);
                setLinkUrl('');
            }
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setLinkPending(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Context Card */}
            <Card className="lg:col-span-1 h-fit">
                <CardHeader>
                    <CardTitle>Add Material</CardTitle>
                    <CardDescription>
                        Target: <span className="font-bold text-primary">{pathLabels.join(' > ')}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Content Type</Label>
                        <select
                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={selectedContentType}
                            onChange={(e) => setSelectedContentType(e.target.value)}
                        >
                            <option value="textbook">Textbook (Concepts)</option>
                            <option value="workbook">Workbook (Questions)</option>
                            <option value="article">Reference Article</option>
                            <option value="video">Video (YouTube)</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors relative">
                        <input
                            type="file"
                            accept=".pdf"
                            multiple
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => {
                                if (e.target.files) {
                                    setFilesToUpload(Array.from(e.target.files));
                                }
                            }}
                        />
                        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to Upload PDF(s)</p>
                        <p className="text-xs text-muted-foreground mt-1">Multi-select supported</p>
                    </div>

                    {filesToUpload.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-sm font-medium">{filesToUpload.length} files selected:</div>
                            <ul className="text-xs text-muted-foreground list-disc pl-4 max-h-32 overflow-y-auto">
                                {filesToUpload.map((f, i) => (
                                    <li key={i}>{f.name}</li>
                                ))}
                            </ul>
                            <Button className="w-full" onClick={handleUploadBatch} disabled={isUploading}>
                                {isUploading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : 'Start Upload'}
                            </Button>
                            <div className="text-xs text-center text-muted-foreground h-4">{uploadStatus}</div>
                        </div>
                    )}

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
                    </div>

                    <Button variant="outline" className="w-full gap-2" onClick={() => setIsLinkOpen(true)}>
                        <span>🔗 Add Link / Video</span>
                    </Button>
                </CardContent>
            </Card>

            {/* List */}
            <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Files</CardTitle></CardHeader>
                <CardContent>
                    {loading && <div className="text-center p-4">Loading...</div>}
                    {!loading && textbooks.length === 0 && <div className="text-center text-muted-foreground p-8">Empty folder.</div>}
                    <div className="space-y-2">
                        {textbooks.map(tb => (
                            <div key={tb.id} className="flex items-center justify-between p-3 border rounded bg-card">
                                <div className="flex items-center gap-3">
                                    <FileText className={`h-5 w-5 ${(tb as any).content_type === 'workbook' ? 'text-pink-500' : (tb as any).content_type === 'video' ? 'text-red-500' : 'text-blue-500'}`} />
                                    <div>
                                        <div className="font-medium text-sm truncate max-w-[200px]">{tb.title}</div>
                                        <div className="text-xs text-muted-foreground flex gap-2 items-center">
                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded uppercase text-[10px]">{(tb as any).content_type || 'textbook'}</span>
                                            <span>{new Date(tb.uploaded_at).toLocaleDateString()}</span>
                                            {tb.status === 'ready' && <span className="text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Ready</span>}
                                            {tb.status === 'processing' && <span className="text-blue-600 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Processing</span>}
                                            {tb.status === 'error' && <span className="text-red-600 flex items-center gap-1">Error</span>}
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(tb.id, tb.file_path)}>
                                    <Trash2 className="h-4 w-4 text-red-400" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Link Dialog */}
            <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Link / Video</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>URL</Label>
                            <Input
                                placeholder="https://..."
                                value={linkUrl}
                                onChange={e => {
                                    setLinkUrl(e.target.value);
                                    if (e.target.value.includes('youtube') || e.target.value.includes('youtu.be')) {
                                        setLinkType('video');
                                    }
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <select
                                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={linkType}
                                onChange={(e) => setLinkType(e.target.value)}
                            >
                                <option value="article">Web Article (Text)</option>
                                <option value="video">YouTube Video (Transcript)</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLinkOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddLink} disabled={linkPending || !linkUrl}>
                            {linkPending ? <Loader2 className="animate-spin h-4 w-4" /> : 'Evaluate & Add'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
