import { getSupabase } from '../lib/supabase';
import { log } from '../lib/log';

export interface SubTopicAnalytics {
    topic: string;
    subTopic: string;
    total: number;
    correct: number;
    accuracy: number;
    avgTime: number;
}

export interface AnalyticsData {
    totalQuestions: number;
    overallAccuracy: number;
    averageTime: number;
    bySubTopic: SubTopicAnalytics[];
    weakestSubTopics: SubTopicAnalytics[];
}

export const getAnalytics = async (): Promise<AnalyticsData> => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client is not available to fetch analytics.");

    // FIX: Corrected the RPC function name to match the one defined in the database schema.
    // The previous name 'get_user_analytics' was incorrect and caused the API call to fail.
    const { data, error } = await supabase.rpc('get_user_dashboard_analytics');

    if (error) {
        log.error('Error fetching analytics:', error);
        throw new Error('Could not load analytics data.');
    }
    
    // The RPC function returns a JSON object with a structure we define.
    // Here, we assume it matches the AnalyticsData interface.
    return data as AnalyticsData;
};