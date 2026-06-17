/**
 * reportService — submit a "report this question" entry from the
 * QuestionCard on web or mobile. The Supabase DB webhook on
 * question_reports.INSERT triggers report-question-notify which
 * emails support@drut.club.
 */

import { getSupabase } from '../lib/supabase';
import type { QuestionReportSubmit, QuestionReport } from '../types/subscription';

export async function submitQuestionReport(report: QuestionReportSubmit): Promise<QuestionReport> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const row = {
        user_id:       user?.id ?? null,
        question_id:   report.question_id,
        category:      report.category,
        message:       report.message ?? null,
        exam_profile:  report.exam_profile ?? null,
        subject:       report.subject ?? null,
        client:        report.client,
    };

    const { data, error } = await supabase
        .from('question_reports')
        .insert(row)
        .select()
        .single();

    if (error) throw new Error(error.message || 'submitQuestionReport failed');
    return data as QuestionReport;
}
