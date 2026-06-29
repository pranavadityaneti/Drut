/**
 * SprintEngine (mobile) — a REAL timed sprint, matching web SprintSession:
 * per-question countdown, speed-based scoring (calculateSprintScore), live score,
 * attempts saved to sprint_question_attempts, finalize at the end, results screen.
 *
 * Reuses QuestionCard for question/option rendering (math + correct/wrong feedback).
 * Free-tier gate + coupon checkout are wired exactly like SessionEngine.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import {
    authService,
    startSession,
    saveSprintAttempt,
    finalizeSprintSession,
    calculateSprintScore,
    resolveTargetSeconds,
    getPrimaryBoardForExam,
    isPaywallError,
    isFirstTimerSubscriber,
} from '@drut/shared';
import type { PlanId } from '@drut/shared';
import { QuestionCard } from './QuestionCard';
import { PaywallModal } from './PaywallModal';
import { RazorpayCheckoutModal } from './RazorpayCheckoutModal';

interface SprintConfig {
    exam: string;
    subject: string;
    chapters?: string[];
    difficulty?: string;
    questionCount?: number;
    mode?: string;
}

type Phase = 'loading' | 'running' | 'results' | 'paywall';

interface Results { score: number; correct: number; wrong: number; skipped: number; accuracy: number; avgMs: number; total: number; }

const FEEDBACK_MS = 650;   // brief correct/wrong flash before advancing
const TIMEOUT_MS = 350;

export const SprintEngine: React.FC<{ config: SprintConfig }> = ({ config }) => {
    const router = useRouter();
    const totalTarget = config.questionCount || 10;

    const [phase, setPhase] = useState<Phase>('loading');
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [answered, setAnswered] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [score, setScore] = useState(0);
    const [results, setResults] = useState<Results | null>(null);

    // Paywall → coupon/Razorpay checkout
    const [paywallReason, setPaywallReason] = useState<string | undefined>(undefined);
    const [showCheckout, setShowCheckout] = useState(false);
    const [checkoutPlan, setCheckoutPlan] = useState<PlanId | null>(null);
    const [checkoutCoupon, setCheckoutCoupon] = useState<string | null>(null);
    const [isFirstTimer, setIsFirstTimer] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);

    const ref = useRef({
        sessionId: null as string | null,
        userId: '',
        startTime: 0,
        targetMs: 0,
        correct: 0, wrong: 0, skipped: 0, score: 0,
        answers: [] as any[],
    });
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lockedRef = useRef(false);   // prevents double-record (tap racing the timeout)

    const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

    // --- Init: create session + fetch questions (gated; PaywallError → paywall) ---
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setPhase('loading');
            try {
                const user = await authService.getCurrentUser();
                if (!user) throw new Error('Not authenticated');
                ref.current.userId = user.id;

                const chapters = config.chapters || ['all'];
                const isAll = chapters.length === 1 && chapters[0] === 'all';
                const topic = isAll ? config.subject : chapters[0];
                const board = getPrimaryBoardForExam(config.exam);

                const { sessionId, questions: qs } = await startSession(
                    user.id, topic, totalTarget, config.exam, 'mixed', false, undefined, board, config.subject,
                );
                if (cancelled) return;
                if (!qs || qs.length === 0) {
                    Alert.alert('Sprint', 'No questions available for this selection.');
                    router.back();
                    return;
                }
                ref.current.sessionId = sessionId;
                // Normalize option ids so QuestionCard selection maps cleanly to an index.
                const normalized = qs.map((q: any) => ({
                    ...q,
                    options: (q.options || []).map((o: any, i: number) => ({ ...o, id: o.id || `opt-${i}` })),
                }));
                setQuestions(normalized);
                setCurrentIndex(0);
                setPhase('running');
            } catch (e: any) {
                if (cancelled) return;
                if (isPaywallError(e)) {
                    setPaywallReason(e.reason);
                    setPhase('paywall');
                    isFirstTimerSubscriber().then(setIsFirstTimer).catch(() => { });
                    return;
                }
                Alert.alert('Sprint', 'Could not start the sprint. Please try again.');
                router.back();
            }
        })();
        return () => { cancelled = true; stopTimer(); if (advanceRef.current) clearTimeout(advanceRef.current); };
    }, [reloadKey]);

    // --- Per-question countdown timer ---
    useEffect(() => {
        if (phase !== 'running' || questions.length === 0) return;
        const q = questions[currentIndex];
        if (!q) return;

        const targetSec = resolveTargetSeconds(q, config.exam, (q.difficulty as any) || 'Medium');
        ref.current.targetMs = targetSec * 1000;
        ref.current.startTime = Date.now();
        setSelectedId(null);
        setAnswered(false);
        setTimeLeft(targetSec);
        lockedRef.current = false;

        stopTimer();
        timerRef.current = setInterval(() => {
            const elapsed = (Date.now() - ref.current.startTime) / 1000;
            const remaining = Math.max(0, targetSec - elapsed);
            setTimeLeft(remaining);
            if (remaining <= 0) {
                stopTimer();
                recordAndAdvance(null, true);
            }
        }, 100);

        return () => stopTimer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex, phase, questions]);

    const recordAndAdvance = (optionIndex: number | null, isTimeout = false) => {
        const q = questions[currentIndex];
        if (!q || lockedRef.current) return;
        lockedRef.current = true;     // lock this question (tap vs timeout can't both fire)
        stopTimer();
        setAnswered(true);

        const timeMs = isTimeout ? ref.current.targetMs : Math.min(ref.current.targetMs, Date.now() - ref.current.startTime);
        let isCorrect = false;
        let result: 'correct' | 'wrong' | 'skipped' = 'skipped';
        if (isTimeout) result = 'skipped';   // timed-out = unattempted, NOT wrong
        else if (optionIndex !== null) { isCorrect = optionIndex === q.correctOptionIndex; result = isCorrect ? 'correct' : 'wrong'; }

        const difficulty = (q.difficulty as any) || 'Medium';
        // Unattempted (timeout/skip) scores 0 — no negative marking on a blank. Attempted
        // answers grade against the SAME target the user saw counting down.
        const earned = result === 'skipped'
            ? 0
            : calculateSprintScore(isCorrect, timeMs, config.exam, difficulty, ref.current.targetMs / 1000);
        ref.current.score += earned;
        if (isCorrect) ref.current.correct++; else if (result === 'wrong') ref.current.wrong++; else ref.current.skipped++;
        setScore(ref.current.score);

        const attempt = {
            questionId: q.uuid,
            result,
            timeTaken: timeMs,
            scoreEarned: earned,
            inputMethod: isTimeout ? 'timeout' : 'tap',
            questionData: q,
            selectedOptionIndex: optionIndex,
            targetTimeMs: ref.current.targetMs,
        };
        ref.current.answers.push(attempt);
        if (ref.current.sessionId) {
            saveSprintAttempt(ref.current.sessionId, ref.current.userId, attempt as any);
        }

        advanceRef.current = setTimeout(() => {
            const next = currentIndex + 1;
            if (next < questions.length) setCurrentIndex(next);
            else finishSession();
        }, isTimeout ? TIMEOUT_MS : FEEDBACK_MS);
    };

    const handlePick = (optionId: string) => {
        if (answered) return;
        const q = questions[currentIndex];
        const index = (q.options || []).findIndex((o: any) => o.id === optionId);
        setSelectedId(optionId);
        setAnswered(true);
        recordAndAdvance(index, false);
    };

    const finishSession = async () => {
        stopTimer();
        const r = ref.current;
        const total = r.answers.length;
        const totalTime = r.answers.reduce((a, x) => a + x.timeTaken, 0);
        const avgMs = total > 0 ? Math.round(totalTime / total) : 0;
        if (r.sessionId) {
            try {
                await finalizeSprintSession(r.sessionId, {
                    totalQuestions: total, correctCount: r.correct, wrongCount: r.wrong,
                    skippedCount: r.skipped, totalScore: r.score, avgTimeMs: avgMs,
                });
            } catch { /* non-fatal */ }
        }
        const answeredCount = r.correct + r.wrong + r.skipped;
        setResults({
            score: r.score, correct: r.correct, wrong: r.wrong, skipped: r.skipped,
            accuracy: answeredCount > 0 ? Math.round((r.correct / answeredCount) * 100) : 0,
            avgMs, total,
        });
        setPhase('results');
    };

    const paywallEls = (
        <>
            <PaywallModal
                visible={phase === 'paywall' && !showCheckout}
                onClose={() => router.back()}
                onUpgrade={(plan, coupon) => { setCheckoutPlan(plan); setCheckoutCoupon(coupon ?? null); setShowCheckout(true); }}
                isFirstTimer={isFirstTimer}
                reason={paywallReason}
            />
            <RazorpayCheckoutModal
                visible={showCheckout}
                plan={checkoutPlan}
                couponCode={checkoutCoupon}
                onClose={() => setShowCheckout(false)}
                onSuccess={() => { setShowCheckout(false); setReloadKey((k) => k + 1); }}
            />
        </>
    );

    if (phase === 'paywall') return <View style={styles.center}>{paywallEls}</View>;

    if (phase === 'loading') {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.dim}>Setting up Sprint…</Text>
            </View>
        );
    }

    if (phase === 'results' && results) {
        const r = results;
        return (
            <View style={styles.resultsWrap}>
                <Text style={styles.resultsKicker}>Sprint complete</Text>
                <Text style={styles.resultsScore}>{r.score}</Text>
                <Text style={styles.resultsScoreLabel}>points</Text>

                <View style={styles.statRow}>
                    <Stat label="Correct" value={String(r.correct)} color="#15803d" />
                    <Stat label="Wrong" value={String(r.wrong)} color="#b91c1c" />
                    <Stat label="Skipped" value={String(r.skipped)} color={Colors.textDim} />
                </View>
                <View style={styles.statRow}>
                    <Stat label="Accuracy" value={`${r.accuracy}%`} color={Colors.text} />
                    <Stat label="Avg time" value={`${(r.avgMs / 1000).toFixed(1)}s`} color={Colors.text} />
                    <Stat label="Questions" value={String(r.total)} color={Colors.text} />
                </View>

                <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()} activeOpacity={0.9}>
                    <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const q = questions[currentIndex];
    if (!q) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;

    const targetSec = ref.current.targetMs / 1000 || 1;
    const pct = Math.max(0, Math.min(100, (timeLeft / targetSec) * 100));
    const urgent = timeLeft <= 5;

    return (
        <View style={styles.container}>
            {/* Header: progress + live score */}
            <View style={styles.header}>
                <Text style={styles.counter}>Q {currentIndex + 1} / {questions.length}</Text>
                <Text style={styles.scorePill}>{score} pts</Text>
            </View>

            {/* Timer bar */}
            <View style={styles.timerTrack}>
                <View style={[styles.timerFill, { width: `${pct}%`, backgroundColor: urgent ? Colors.error : Colors.primary }]} />
            </View>
            <Text style={[styles.timerText, urgent && { color: Colors.error }]}>{timeLeft.toFixed(1)}s</Text>

            {/* Question + options (reuses practice QuestionCard) */}
            <QuestionCard
                key={q.uuid || currentIndex}
                question={q}
                selectedAnswer={selectedId}
                isSubmitted={answered}
                onSelectAnswer={handlePick}
            />

            {paywallEls}
        </View>
    );
};

const Stat: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
    <View style={styles.stat}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, gap: 12 },
    dim: { fontSize: 13, color: Colors.textDim, marginTop: 10 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14 },
    counter: { fontSize: 13, fontWeight: '700', color: Colors.textDim, letterSpacing: 1 },
    scorePill: { fontSize: 14, fontWeight: '800', color: '#3d7a0f' },
    timerTrack: { height: 6, backgroundColor: Colors.surface, borderRadius: 3, marginHorizontal: 16, marginTop: 10, overflow: 'hidden' },
    timerFill: { height: '100%', borderRadius: 3 },
    timerText: { alignSelf: 'flex-end', marginRight: 16, marginTop: 4, fontSize: 13, fontWeight: '700', color: Colors.textDim, fontVariant: ['tabular-nums'] },
    // Results
    resultsWrap: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
    resultsKicker: { fontSize: 13, fontWeight: '700', color: Colors.textDim, letterSpacing: 1, textTransform: 'uppercase' },
    resultsScore: { fontSize: 64, fontWeight: '900', color: '#3d7a0f', marginTop: 8 },
    resultsScoreLabel: { fontSize: 14, color: Colors.textDim, marginBottom: 28 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 16 },
    stat: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '800' },
    statLabel: { fontSize: 12, color: Colors.textDim, marginTop: 2 },
    doneBtn: { marginTop: 28, backgroundColor: Colors.primary, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
    doneBtnText: { fontSize: 17, fontWeight: '800', color: Colors.white },
});

export default SprintEngine;
