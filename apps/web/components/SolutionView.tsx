import React, { useState } from 'react';
import { QuestionData } from '@drut/shared';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

interface SolutionViewProps {
  question: QuestionData;
}

type SolutionTab = 'fsm' | 'full';

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${active ? 'bg-emerald-500 text-white' : 'hover:bg-accent'
        }`}
    >
      {children}
    </button>
  );
};

const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2 text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
const BookOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2 text-blue-500"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>;
const XCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2 text-red-500"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>;

// Simple markdown renderer for the explanations
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const html = content
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>') // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-muted rounded-sm text-sm">$1</code>') // Inline code
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>'); // List items

  return <div className="prose prose-sm max-w-none space-y-2" dangerouslySetInnerHTML={{ __html: html }} />;
};


export const SolutionView: React.FC<SolutionViewProps> = ({ question }) => {
  const [activeTab, setActiveTab] = useState<SolutionTab>('fsm');
  const [expandedPhase, setExpandedPhase] = useState<string>('DIAGNOSE');

  const { correctOptionIndex } = question;
  // Handle case where options might be undefined or empty safely
  const correctOptionText = question.options?.[correctOptionIndex]?.text || "Option " + String.fromCharCode(65 + correctOptionIndex);
  const correctOptionLetter = String.fromCharCode(65 + correctOptionIndex);

  // Fallback to legacy structure if new one is missing
  const optimalPath = question.optimal_path || (question as any).fastestSafeMethod;
  const fullSolution = question.full_solution || (question as any).fullStepByStep;

  // Check if this is purely legacy data (no TAR/DEEP structure)
  const isLegacy = !optimalPath && !fullSolution;

  // Decide if optimal path is effectively available
  const hasOptimal = optimalPath && optimalPath.available !== false && (optimalPath.steps?.length > 0);

  if (isLegacy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Solution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 mb-6 bg-green-50 border border-green-200 rounded-md text-green-800 font-medium flex items-center">
            <CheckCircleIcon /> Correct Answer: ({correctOptionLetter}) {correctOptionText}
          </div>
          <div className="p-4 bg-slate-50 rounded-lg text-slate-700 leading-relaxed">
            <MarkdownRenderer content={question.solution || "Step-by-step solution available below."} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Solutions</CardTitle>
          <div className="flex items-center p-1 bg-muted rounded-lg">
            <TabButton active={activeTab === 'fsm'} onClick={() => setActiveTab('fsm')}>⚡ Optimal Path</TabButton>
            <TabButton active={activeTab === 'full'} onClick={() => setActiveTab('full')}>📖 Full Solution</TabButton>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="p-4 mb-6 bg-green-50 border border-green-200 rounded-md text-green-800 font-medium flex items-center">
          <CheckCircleIcon /> Correct Answer: ({correctOptionLetter}) {correctOptionText}
        </div>

        {activeTab === 'fsm' && (
          <div>
            <div className="mb-4 border-b pb-2">
              <h4 className="text-xs font-bold text-slate-500 tracking-[0.15em] uppercase">The T.A.R. Algorithm™</h4>
            </div>
            {hasOptimal ? (
              <div className="space-y-4">
                {optimalPath.steps.map((step: string, i: number) => (
                  <div key={i} className="flex gap-4 p-3 bg-accent/30 rounded-lg">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mt-0.5">
                      {i + 1}
                    </div>
                    <div className="text-sm">
                      <MarkdownRenderer content={step} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 bg-accent/50 rounded-lg">
                <div className="p-3 bg-slate-100 rounded-full mb-3">
                  <XCircleIcon />
                </div>
                <h4 className="font-semibold text-slate-700">Calculation Required</h4>
                <p className="text-slate-500 text-sm mt-1">No shortcut available. Use the D.E.E.P. methodology.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'full' && (
          <div>
            <div className="mb-4 border-b pb-2">
              <h4 className="text-xs font-bold text-slate-500 tracking-[0.15em] uppercase">The D.E.E.P. Framework™</h4>
            </div>
            {fullSolution?.phases ? (
              <div className="space-y-2">
                {fullSolution.phases.map((phase: any, idx: number) => {
                  const isExpanded = expandedPhase === phase.label;
                  return (
                    <div key={idx} className={`border rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-white'}`}>
                      <button
                        onClick={() => setExpandedPhase(isExpanded ? '' : phase.label)}
                        className="w-full flex items-center justify-between p-3 text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-bold tracking-wider ${isExpanded ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-700'}`}>{phase.label}</span>
                        </div>
                        <div className="text-slate-400">
                          {isExpanded ? '−' : '+'}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="p-4 pt-0 text-sm leading-relaxed border-t border-indigo-100/50">
                          <div className="mt-3 text-slate-700">
                            <MarkdownRenderer content={phase.content} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // Fallback for legacy "fullStepByStep" simple array
              fullSolution?.steps ? (
                <ul className="space-y-2 list-disc pl-5">
                  {fullSolution.steps.map((s: string, i: number) => (
                    <li key={i}><MarkdownRenderer content={s} /></li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 italic">Step-by-step solution available below.</p>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
