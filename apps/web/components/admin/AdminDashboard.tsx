import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { KnowledgeBase } from './KnowledgeBase';
import { StagingManager } from './StagingManager';
import { QuestionSeeding } from './QuestionSeeding';
import { BookOpen, Database, FileSpreadsheet } from 'lucide-react';

/**
 * AdminDashboard — editorial refresh.
 *
 * Page header gets the label-uppercase eyebrow + display-h1 title + muted
 * subtitle treatment used elsewhere. Pill-toggle nav is replaced with the
 * new Tabs primitive (Radix-based, thin underline active state).
 */

export const AdminDashboard: React.FC = () => {
    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Page header */}
            <div className="flex flex-col gap-1.5">
                <p className="label-uppercase">Admin</p>
                <h1 className="text-[36px] leading-[1.05] font-bold tracking-[-0.02em] text-[var(--color-ink-1)]">
                    Content system
                </h1>
                <p className="text-[14px] text-[var(--color-ink-3)] mt-1">
                    Manage syllabus material and the question bank.
                </p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="textbooks">
                <TabsList>
                    <TabsTrigger value="textbooks">
                        <BookOpen className="h-4 w-4" />
                        Textbook RAG
                    </TabsTrigger>
                    <TabsTrigger value="questions">
                        <Database className="h-4 w-4" />
                        Staging
                    </TabsTrigger>
                    <TabsTrigger value="seeding">
                        <FileSpreadsheet className="h-4 w-4" />
                        Seeding
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="textbooks" className="min-h-[500px]">
                    <KnowledgeBase />
                </TabsContent>
                <TabsContent value="questions" className="min-h-[500px]">
                    <StagingManager />
                </TabsContent>
                <TabsContent value="seeding" className="min-h-[500px]">
                    <QuestionSeeding />
                </TabsContent>
            </Tabs>
        </div>
    );
};
