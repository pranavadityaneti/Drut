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
  <p className="label-uppercase">Pending</p>
  <div className="text-[28px] leading-none font-bold tracking-tight num-tabular text-[var(--color-ink-1)] mt-1.5">{stats.pending}</div>
  <p className="text-[11px] text-[var(--color-ink-3)] mt-2">Awaiting AI review</p>
  </CardContent>
  </Card>
  <Card>
  <CardContent className="pt-6">
  <p className="label-uppercase">Ready</p>
  <div className="text-[28px] leading-none font-bold tracking-tight num-tabular text-[#3d7a0f] mt-1.5">{stats.ready}</div>
  <p className="text-[11px] text-[var(--color-ink-3)] mt-2">Ready to publish</p>
  </CardContent>
  </Card>
  <Card className="relative overflow-hidden">
  <CardContent className="pt-6">
  <p className="label-uppercase">Published</p>
  <div className="text-[28px] leading-none font-bold tracking-tight num-tabular text-[var(--color-accent-warm)] mt-1.5">{stats.published}</div>
  <p className="text-[11px] text-[var(--color-ink-3)] mt-2">Live in the app</p>
  </CardContent>
  <span aria-hidden className="absolute left-5 right-5 bottom-0 h-[2px] rounded-full bg-[var(--color-accent-warm)]" />
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
  p-12 text-center cursor-pointer rounded-[14px] transition-colors
  ${isDragActive ? 'bg-[var(--color-accent)] ring-hairline-strong' : 'bg-[var(--color-muted)] hover:bg-[var(--color-ink-5)]'}
  `}
  >
  <input {...getInputProps()} />
  {isUploading ? (
  <div className="flex flex-col items-center">
  <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)] mb-2" />
  <p className="text-[13px] text-[var(--color-ink-2)]">Processing CSV…</p>
  </div>
  ) : (
  <>
  <Upload className="h-8 w-8 mx-auto text-[var(--color-ink-3)] mb-3" />
  <p className="text-[14px] font-semibold tracking-tight text-[var(--color-ink-1)]">Drag &amp; drop CSV here</p>
  <p className="text-[12px] text-[var(--color-ink-3)] mt-2">
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
  <div className="rounded-[18px] overflow-hidden">
  <table className="min-w-full divide-y divide-[var(--color-ink-5)] text-[13px]">
  <thead className="bg-[var(--color-muted)]">
  <tr>
  <th className="px-4 py-3 text-left label-uppercase">Topic</th>
  <th className="px-4 py-3 text-left label-uppercase w-1/3">Question</th>
  <th className="px-4 py-3 text-left label-uppercase">Status</th>
  <th className="px-4 py-3 text-right label-uppercase">Actions</th>
  </tr>
  </thead>
  <tbody className="divide-y divide-border">
  {loading ? (
  <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
  ) : questions.length === 0 ? (
  <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No questions in staging.</td></tr>
  ) : (
  questions.map((q) => (
  <tr key={q.id} className="hover:bg-[var(--color-muted)] transition-colors">
  <td className="px-4 py-3 align-top">
  <div className="font-semibold text-[13px] tracking-tight text-[var(--color-ink-1)]">{q.topic}</div>
  <div className="text-[11px] text-[var(--color-ink-3)] mt-0.5">{q.subtopic}</div>
  </td>
  <td className="px-4 py-3 align-top">
  <div className="line-clamp-2 text-[13px] text-[var(--color-ink-1)]">{q.source_text}</div>
  {q.enriched_data && (
  <span className="text-[11px] text-[#3d7a0f] flex items-center gap-1 mt-1.5 font-medium">
  <CheckCircle className="h-3 w-3" /> AI solved
  </span>
  )}
  </td>
  <td className="px-4 py-3 align-top">
  <span className={`
  inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-[11px] font-semibold tracking-tight bg-[var(--color-muted)]
  ${q.status === 'ready' ? 'text-[#3d7a0f]' :
  q.status === 'published' ? 'text-[var(--color-accent-warm-foreground)]' :
  q.status === 'error' ? 'text-[var(--color-destructive)]' :
  'text-[var(--color-ink-2)]'}
  `}>
  <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${
  q.status === 'ready' ? 'bg-[var(--color-primary)]' :
  q.status === 'published' ? 'bg-[var(--color-accent-warm)]' :
  q.status === 'error' ? 'bg-[var(--color-destructive)]' :
  'bg-[var(--color-ink-3)]'
  }`} />
  {q.status}
  </span>
  {q.status === 'error' && (
  <div className="text-[11px] text-[var(--color-destructive)] mt-1 max-w-[150px] truncate" title={q.error_message}>
  {q.error_message}
  </div>
  )}
  </td>
  <td className="px-4 py-3 align-top text-right space-x-2">
  {q.status === 'ready' && (
  <Button size="sm" variant="ink" onClick={() => handlePublish(q.id, q)}>
  Publish
  </Button>
  )}
  {q.status === 'published' && (
  <span className="label-uppercase">Live</span>
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
