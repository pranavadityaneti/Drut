import { PerformanceRecord } from '../types';
import { getSupabase } from '../lib/supabase';
import { log } from '../lib/log';

export const getPerformanceHistory = async (): Promise<PerformanceRecord[]> => {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('performance_records')
        .select('*')
        .eq('user_id', user.id);
    
    if (error) {
        log.error("Failed to fetch performance history:", error);
        return [];
    }
    return data;
};

export const savePerformanceRecord = async (record: Omit<PerformanceRecord, 'id' | 'timestamp' | 'userId'>) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client is not available to save record.");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const newRecord = {
        user_id: user.id,
        exam_profile: record.examProfile,
        topic: record.topic,
        sub_topic: record.subTopic,
        is_correct: record.isCorrect,
        time_taken: record.timeTaken,
        target_time: record.targetTime,
        question_text: record.questionText
    };

    const { error } = await supabase.from('performance_records').insert(newRecord);

    if (error) {
        log.error("Error saving performance record:", error);
        throw new Error("Could not save your progress.");
    }
};

export const clearPerformanceHistory = async (): Promise<void> => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client is not available to clear history.");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
        .from('performance_records')
        .delete()
        .eq('user_id', user.id);
    
    if (error) {
        log.error("Error clearing performance history:", error);
        throw new Error("Could not clear history.");
    }
};