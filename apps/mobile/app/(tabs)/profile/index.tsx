import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    User,
    Settings,
    BookOpen,
    HelpCircle,
    LogOut,
    ChevronRight,
    MapPin,
    Phone,
    Mail,
    GraduationCap,
    Target,
    Calendar,
    Building2,
    Crown,
} from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';
import { profileService, authService, UserProfile, normalizeTargetExams, getCurrentSubscription, isProActive, PRICING, type Subscription, type PlanId } from '@drut/shared';
import { PaywallModal } from '../../../components/PaywallModal';
import { RazorpayCheckoutModal } from '../../../components/RazorpayCheckoutModal';

const MENU_ITEMS = [
    { id: 'account-settings', label: 'Account Settings', icon: Settings },
    { id: 'exam-preferences', label: 'Exam Preferences', icon: BookOpen },
    { id: 'help-support', label: 'Help & Support', icon: HelpCircle },
];

// Friendly labels for stored values
const EXAM_LABEL: Record<string, string> = {
    ap_eapcet: 'AP EAPCET',
    ts_eapcet: 'TG EAPCET',
    jee_main: 'JEE Main',
};

const YEAR_IN_SCHOOL_LABEL: Record<string, string> = {
    '11': 'Class 11',
    '12': 'Class 12',
    'Reappear': 'Reappear',
};

const REFERRAL_LABEL: Record<string, string> = {
    friend: 'Friend / Word of mouth',
    instagram: 'Instagram',
    youtube: 'YouTube',
    google: 'Google Search',
    coaching: 'Coaching Center',
    other: 'Other',
    prefer_not_to_say: 'Prefer not to say',
};

const formatSubDate = (iso: string): string => {
    try {
        return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return iso;
    }
};

export default function ProfileScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [userMeta, setUserMeta] = useState<Record<string, any> | null>(null);
    const [userEmail, setUserEmail] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [sub, setSub] = useState<Subscription | null>(null);
    const [showPaywall, setShowPaywall] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [checkoutPlan, setCheckoutPlan] = useState<PlanId | null>(null);
    const [checkoutCoupon, setCheckoutCoupon] = useState<string | null>(null);
    const isPro = isProActive(sub);

    const refreshSub = React.useCallback(() => {
        getCurrentSubscription().then(setSub).catch(() => setSub(null));
    }, []);

    useEffect(() => {
        loadProfile();
        refreshSub();
    }, [refreshSub]);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const [data, user] = await Promise.all([
                profileService.getProfile(),
                authService.getCurrentUser(),
            ]);
            setProfile(data);
            setUserMeta(user?.user_metadata || null);
            // Use real email if signed up via email; for WhatsApp users use email_address from metadata
            setUserEmail(
                user?.user_metadata?.email_address ||
                (user?.email?.endsWith('@phone.drut.club') ? '' : user?.email || '')
            );
        } finally {
            setLoading(false);
        }
    };

    const handleShowProfile = () => {
        router.push('/(tabs)/profile/edit-profile');
    };

    const handleMenuPress = (id: string) => {
        router.push(`/(tabs)/profile/${id}` as any);
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await authService.logout();
                        router.replace('/(public)/login');
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    // Derive friendly labels from raw metadata
    const fullName = userMeta?.full_name || profile?.fullName || 'Set your name';
    const city = userMeta?.city;
    const phoneNumber = userMeta?.phone_number;
    const school = userMeta?.school_name;
    const coaching = userMeta?.coaching_center;
    const yearInSchool = userMeta?.year_in_school;
    const targetExams: string[] = normalizeTargetExams(
        (Array.isArray(userMeta?.target_exams) && userMeta!.target_exams.length) ? userMeta!.target_exams : userMeta?.exam_profile
    );
    const examYear = userMeta?.target_exam_year;
    const referralSource = userMeta?.referral_source;

    const targetExamLabel = targetExams.length
        ? targetExams.map(v => EXAM_LABEL[v] || v).join(' + ')
        : null;

    const yearInSchoolLabel = yearInSchool ? YEAR_IN_SCHOOL_LABEL[yearInSchool] : null;
    const examYearLabel = examYear === 'unknown' ? 'Not sure yet' : examYear;
    const referralLabel = referralSource ? REFERRAL_LABEL[referralSource] : null;

    // Contact rows (filter out empties)
    const contactRows = [
        userEmail && { icon: Mail, label: 'Email', value: userEmail },
        phoneNumber && { icon: Phone, label: 'Phone', value: `+91 ${phoneNumber.replace(/^91/, '')}` },
        city && { icon: MapPin, label: 'Location', value: city },
    ].filter(Boolean) as Array<{ icon: any; label: string; value: string }>;

    // Academic rows
    const academicRows = [
        yearInSchoolLabel && { icon: GraduationCap, label: 'Year', value: yearInSchoolLabel },
        targetExamLabel && { icon: Target, label: 'Target Exam', value: targetExamLabel },
        examYearLabel && { icon: Calendar, label: 'Exam Year', value: examYearLabel },
        school && { icon: GraduationCap, label: 'School', value: school },
        coaching && { icon: Building2, label: 'Coaching', value: coaching },
    ].filter(Boolean) as Array<{ icon: any; label: string; value: string }>;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <Text style={styles.headerTitle}>Profile</Text>

                {/* User Card */}
                <TouchableOpacity style={styles.userCard} onPress={handleShowProfile}>
                    <View style={styles.avatarContainer}>
                        {profile?.avatarUrl ? (
                            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <User size={32} color={Colors.textDim} />
                            </View>
                        )}
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{fullName}</Text>
                        {city && <Text style={styles.userSubtitle}>{city}</Text>}
                    </View>
                    <ChevronRight size={24} color={Colors.textDim} />
                </TouchableOpacity>

                {/* Subscription */}
                <Text style={styles.sectionTitle}>Subscription</Text>
                {isPro && sub ? (
                    <View style={styles.infoContainer}>
                        <View style={[styles.infoRow, styles.infoRowBorder]}>
                            <Crown size={20} color={Colors.primary} />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>Plan</Text>
                                <Text style={styles.infoValue}>Drut Pro · {PRICING[sub.plan]?.label || sub.plan}</Text>
                            </View>
                            <View style={styles.proBadge}>
                                <Text style={styles.proBadgeText}>Active</Text>
                            </View>
                        </View>
                        <View style={styles.infoRow}>
                            <Calendar size={20} color={Colors.primary} />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>Valid until</Text>
                                <Text style={styles.infoValue}>{formatSubDate(sub.expires_at)}</Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.freeCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.freeTitle}>Free plan</Text>
                            <Text style={styles.freeSub}>20 questions a day. Go Pro for unlimited practice & every feature.</Text>
                        </View>
                        <TouchableOpacity style={styles.upgradeBtn} onPress={() => setShowPaywall(true)} activeOpacity={0.85}>
                            <Text style={styles.upgradeBtnText}>Upgrade</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Contact Info */}
                {contactRows.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Contact</Text>
                        <View style={styles.infoContainer}>
                            {contactRows.map((row, index) => (
                                <View
                                    key={row.label}
                                    style={[
                                        styles.infoRow,
                                        index < contactRows.length - 1 && styles.infoRowBorder,
                                    ]}
                                >
                                    <row.icon size={20} color={Colors.primary} />
                                    <View style={styles.infoTextContainer}>
                                        <Text style={styles.infoLabel}>{row.label}</Text>
                                        <Text style={styles.infoValue}>{row.value}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                {/* EAPCET Profile */}
                {academicRows.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>EAPCET Profile</Text>
                        <View style={styles.infoContainer}>
                            {academicRows.map((row, index) => (
                                <View
                                    key={row.label}
                                    style={[
                                        styles.infoRow,
                                        index < academicRows.length - 1 && styles.infoRowBorder,
                                    ]}
                                >
                                    <row.icon size={20} color={Colors.primary} />
                                    <View style={styles.infoTextContainer}>
                                        <Text style={styles.infoLabel}>{row.label}</Text>
                                        <Text style={styles.infoValue}>{row.value}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                {/* Referral source (subtle, if set) */}
                {referralLabel && (
                    <Text style={styles.referralNote}>
                        Found Drut via {referralLabel}
                    </Text>
                )}

                {/* Settings Section */}
                <Text style={styles.sectionTitle}>Settings</Text>
                <View style={styles.menuContainer}>
                    {MENU_ITEMS.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.menuItem,
                                index < MENU_ITEMS.length - 1 && styles.menuItemBorder,
                            ]}
                            onPress={() => handleMenuPress(item.id)}
                        >
                            <item.icon size={22} color={Colors.textDim} />
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <ChevronRight size={20} color={Colors.textDim} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <LogOut size={20} color="#FFFFFF" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </ScrollView>

            <PaywallModal
                visible={showPaywall}
                onClose={() => setShowPaywall(false)}
                onUpgrade={(plan, coupon) => { setCheckoutPlan(plan); setCheckoutCoupon(coupon ?? null); setShowPaywall(false); setShowCheckout(true); }}
            />
            <RazorpayCheckoutModal
                visible={showCheckout}
                plan={checkoutPlan}
                couponCode={checkoutCoupon}
                prefill={{ name: fullName, email: userEmail }}
                onClose={() => setShowCheckout(false)}
                onSuccess={() => { setShowCheckout(false); refreshSub(); }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    proBadge: {
        backgroundColor: '#dcfce7',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    proBadgeText: {
        color: '#15803d',
        fontSize: 12,
        fontWeight: '700',
    },
    freeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    freeTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    freeSub: {
        fontSize: 13,
        color: Colors.textDim,
        marginTop: 2,
        lineHeight: 18,
    },
    upgradeBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 22,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    upgradeBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: 20,
        marginBottom: 24,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    avatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 4,
    },
    userSubtitle: {
        fontSize: 14,
        color: Colors.textDim,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 12,
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoContainer: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 28,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 14,
    },
    infoRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: Colors.textDim,
        fontWeight: '600',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        color: Colors.text,
        fontWeight: '500',
    },
    referralNote: {
        fontSize: 13,
        color: Colors.textDim,
        textAlign: 'center',
        marginBottom: 28,
        marginTop: -16,
        fontStyle: 'italic',
    },
    menuContainer: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 28,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    menuLabel: {
        flex: 1,
        fontSize: 16,
        color: Colors.text,
        marginLeft: 16,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E53935',
        borderRadius: 12,
        paddingVertical: 16,
        gap: 8,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
