import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { LatexText } from '../ui/LatexText';
import { supabase } from '@drut/shared';
import { CheckCircle, X, RefreshCw, Loader2 } from 'lucide-react';

/**
 * AiBatchReview — admin review surface for OpenAI-pipeline questions.
 *
 * Lists cached_questions with verification_status='ai-openai-staged' (generated
 * by scripts/generate-chapter.mjs, audit-gated, NOT yet served), renders each in
 * the new "B+C mix" format, and lets an admin Approve (-> 'ai-openai-audited',
 * which the web + mobile trust gates serve) or Reject (-> 'ai-openai-rejected',
 * stays unserved). Updates are permitted by migration 042's scoped RLS policy.
 */

const LETTERS = ['A', 'B', 'C', 'D'];

interface StagedRow {
  id: string;
  subject: string;
  topic: string;
  subtopic: string;
  difficulty: string;
  class_level: string;
  question_data: any;
}

export const AiBatchReview: React.FC = () => {
  const [rows, setRows] = useState<StagedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [counts, setCounts] = useState({ staged: 0, audited: 0, rejected: 0 });

  const fetchStaged = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cached_questions')
        .select('id,subject,topic,subtopic,difficulty,class_level,question_data')
        .eq('verification_status', 'ai-openai-staged')
        .order('generated_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setRows(data || []);

      // lightweight status counts
      const tally = async (status: string) => {
        const { count } = await supabase
          .from('cached_questions')
          .select('id', { count: 'exact', head: true })
          .eq('verification_status', status);
        return count || 0;
      };
      setCounts({
        staged: await tally('ai-openai-staged'),
        audited: await tally('ai-openai-audited'),
        rejected: await tally('ai-openai-rejected'),
      });
    } catch (err: any) {
      console.error('AiBatchReview fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaged(); }, [fetchStaged]);

  const review = async (id: string, status: 'ai-openai-audited' | 'ai-openai-rejected') => {
    setBusyId(id);
    try {
      const { error } = await supabase
        .from('cached_questions')
        .update({ verification_status: status })
        .eq('id', id);
      if (error) throw error;
      setRows(prev => prev.filter(r => r.id !== id));
      setCounts(c => ({
        staged: Math.max(0, c.staged - 1),
        audited: c.audited + (status === 'ai-openai-audited' ? 1 : 0),
        rejected: c.rejected + (status === 'ai-openai-rejected' ? 1 : 0),
      }));
    } catch (err: any) {
      alert('Review failed: ' + (err.message || err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6">
          <p className="label-uppercase">Awaiting review</p>
          <div className="text-[28px] leading-none font-bold tracking-tight num-tabular text-[var(--color-ink-1)] mt-1.5">{counts.staged}</div>
          <p className="text-[11px] text-[var(--color-ink-3)] mt-2">ai-openai-staged (not served)</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="label-uppercase">Approved</p>
          <div className="text-[28px] leading-none font-bold tracking-tight num-tabular text-[#3d7a0f] mt-1.5">{counts.audited}</div>
          <p className="text-[11px] text-[var(--color-ink-3)] mt-2">Live in practice</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="label-uppercase">Rejected</p>
          <div className="text-[28px] leading-none font-bold tracking-tight num-tabular text-[var(--color-destructive)] mt-1.5">{counts.rejected}</div>
          <p className="text-[11px] text-[var(--color-ink-3)] mt-2">Discarded</p>
        </CardContent></Card>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-[13px] text-[var(--color-ink-3)]">Review AI-generated questions before they go live. Approve adds them to the served pool; reject keeps them out.</p>
        <Button variant="outline" size="sm" onClick={fetchStaged}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No questions awaiting review.</CardContent></Card>
      ) : (
        rows.map((r) => {
          const q = r.question_data || {};
          const fs = q.fullSolution || {};
          return (
            <Card key={r.id}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-[6px] bg-[var(--color-ink-1)] text-[var(--color-primary)] text-[11px] font-bold">{r.subject}</span>
                  <span className="text-[12px] text-[var(--color-ink-3)] font-medium">{r.topic} · {r.subtopic} · class {r.class_level}</span>
                  <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-muted)]">{r.difficulty}</span>
                </div>

                <div className="text-[15px]"><LatexText text={q.questionText || ''} /></div>

                <ol className="space-y-1.5">
                  {(q.options || []).map((o: any, k: number) => (
                    <li key={k} className={`flex gap-2 items-start text-[14px] p-2 rounded-[8px] ${k === q.correctOptionIndex ? 'bg-[rgba(180,250,141,0.18)] ring-1 ring-[#3d7a0f]' : ''}`}>
                      <span className="font-bold text-[var(--color-ink-3)]">{LETTERS[k]}</span>
                      <span className="flex-1"><LatexText text={o.text || ''} /></span>
                      {k === q.correctOptionIndex && <span className="text-[11px] font-bold text-[#3d7a0f]">✓</span>}
                    </li>
                  ))}
                </ol>

                {/* Quick Method */}
                {q.quickMethod?.steps?.length > 0 && (
                  <div>
                    <div className="text-[12px] font-bold text-[var(--color-ink-2)] mb-1.5">⚡ Quick Method</div>
                    <ol className="list-decimal pl-5 space-y-1 text-[13px]">
                      {q.quickMethod.steps.map((s: string, i: number) => <li key={i}><LatexText text={s} /></li>)}
                    </ol>
                  </div>
                )}

                {/* Full Solution */}
                {fs.approach && (
                  <div>
                    <div className="text-[12px] font-bold text-[var(--color-ink-2)] mb-1.5">🔬 Full Solution</div>
                    <div className="text-[13px] italic text-[var(--color-ink-2)] mb-2"><LatexText text={fs.approach} /></div>
                    <div className="space-y-2">
                      {(fs.steps || []).map((c: any, i: number) => (
                        <div key={i} className="text-[13px]">
                          <LatexText text={c.text || ''} />
                          {c.display ? <div className="text-center my-1"><LatexText text={`$$${c.display}$$`} /></div> : null}
                        </div>
                      ))}
                    </div>
                    {fs.answer && <div className="mt-2 text-[13px] font-semibold"><LatexText text={fs.answer} /></div>}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-ink-5)]">
                  <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => review(r.id, 'ai-openai-rejected')}>
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button size="sm" variant="ink" disabled={busyId === r.id} onClick={() => review(r.id, 'ai-openai-audited')}>
                    {busyId === r.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />} Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};
