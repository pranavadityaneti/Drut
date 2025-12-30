import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { TextbookManager } from './TextbookManager';
import { StagingManager } from './StagingManager';
import { BookOpen, Database, Upload } from 'lucide-react';

type Tab = 'textbooks' | 'questions';

export const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('textbooks');

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admin System</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage syllabus material and question bank content.
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex p-1 bg-muted rounded-lg">
                    <button
                        onClick={() => setActiveTab('textbooks')}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                            ${activeTab === 'textbooks'
                                ? 'bg-background shadow text-foreground'
                                : 'text-muted-foreground hover:bg-background/50'}
                        `}
                    >
                        <BookOpen className="h-4 w-4" />
                        Textbook RAG
                    </button>
                    <button
                        onClick={() => setActiveTab('questions')}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                            ${activeTab === 'questions'
                                ? 'bg-background shadow text-foreground'
                                : 'text-muted-foreground hover:bg-background/50'}
                        `}
                    >
                        <Database className="h-4 w-4" />
                        Question Bank
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[500px]">
                {activeTab === 'textbooks' && <TextbookManager />}
                {activeTab === 'questions' && <StagingManager />}
            </div>
        </div>
    );
};
