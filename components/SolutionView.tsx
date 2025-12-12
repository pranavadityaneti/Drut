import React, { useState } from 'react';
import { QuestionData } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Explanation } from '../lib/explCache';

interface SolutionViewProps {
  question: QuestionData;
  explanation: Explanation;
}

type SolutionTab = 'fsm' | 'full';

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                active ? 'bg-emerald-500 text-white' : 'hover:bg-accent'
            }`}
        >
            {children}
        </button>
    );
};

const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2 text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const BookOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2 text-blue-500"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
const XCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2 text-red-500"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;

// Simple markdown renderer for the explanations
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const html = content
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
        .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-muted rounded-sm text-sm">$1</code>') // Inline code
        .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>'); // List items

    return <div className="prose prose-sm max-w-none space-y-2" dangerouslySetInnerHTML={{ __html: html }} />;
};


export const SolutionView: React.FC<SolutionViewProps> = ({ question, explanation }) => {
  const [activeTab, setActiveTab] = useState<SolutionTab>('fsm');

  const { correctOptionIndex } = question;
  const correctOptionLetter = String.fromCharCode(65 + correctOptionIndex);

  const hasFsm = explanation.fast_md && explanation.fast_md.length > 5;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle>Solutions</CardTitle>
            <div className="flex items-center p-1 bg-muted rounded-lg">
                <TabButton active={activeTab === 'fsm'} onClick={() => setActiveTab('fsm')}>Fastest Safe Method</TabButton>
                <TabButton active={activeTab === 'full'} onClick={() => setActiveTab('full')}>Full Step-by-Step</TabButton>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="p-4 mb-4 bg-green-50 border border-green-200 rounded-md text-green-800 font-medium flex items-center">
            <CheckCircleIcon /> Correct Answer: ({correctOptionLetter}) {question.options[correctOptionIndex].text}
        </div>

        {activeTab === 'fsm' && (
          <div>
            {hasFsm ? (
                <div className="space-y-6">
                    <MarkdownRenderer content={explanation.fast_md!} />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 bg-accent rounded-lg">
                    <XCircleIcon />
                    <h4 className="font-semibold mt-2">No Safe Shortcut Available</h4>
                    <p className="text-muted-foreground mt-1">For this question, the most reliable approach is the full step-by-step method.</p>
                </div>
            )}
          </div>
        )}

        {activeTab === 'full' && (
          <div>
             <h4 className="font-semibold text-lg flex items-center mb-4"><BookOpenIcon /> Steps</h4>
             {explanation.full_md ? (
                <MarkdownRenderer content={explanation.full_md} />
             ) : (
                <p className="text-muted-foreground">The full solution is being generated. It will appear here shortly.</p>
             )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
