import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, Dimensions, Pressable } from 'react-native';
import { Colors } from '../constants/Colors';

interface DiagramRendererProps {
    /** Hosted image URL from Supabase Storage */
    diagramUrl: string | undefined | null;
    /** Legacy SVG code (deprecated) */
    diagramCode?: string | undefined | null;
    width?: number | string;
    height?: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * DiagramRenderer - Renders hosted diagram images with tap-to-zoom
 * 
 * Updated to use hosted image URLs instead of inline SVG.
 * Features:
 * - White background for seamless blending
 * - 4:3 aspect ratio
 * - Tap-to-zoom modal for mobile
 * - Hides entirely if no diagramUrl (no placeholder)
 */
export const DiagramRenderer: React.FC<DiagramRendererProps> = ({
    diagramUrl,
    diagramCode: _deprecated,
    width = '100%',
    height = 200,
}) => {
    const [isZoomed, setIsZoomed] = useState(false);

    // Hide entirely if no diagram URL
    if (!diagramUrl) {
        return null;
    }

    return (
        <>
            {/* Main diagram container */}
            <TouchableOpacity
                style={[styles.container, { aspectRatio: 4 / 3 }]}
                onPress={() => setIsZoomed(true)}
                activeOpacity={0.9}
                accessibilityLabel="Tap to zoom diagram"
            >
                <Image
                    source={{ uri: diagramUrl }}
                    style={[styles.image, { height: typeof height === 'number' ? height : 200 }]}
                    resizeMode="contain"
                />
                <View style={styles.zoomHint}>
                    <Text style={styles.zoomHintText}>Tap to zoom</Text>
                </View>
            </TouchableOpacity>

            {/* Fullscreen zoom modal */}
            <Modal
                visible={isZoomed}
                transparent
                animationType="fade"
                onRequestClose={() => setIsZoomed(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setIsZoomed(false)}>
                    <View style={styles.modalContent}>
                        <Image
                            source={{ uri: diagramUrl }}
                            style={styles.zoomedImage}
                            resizeMode="contain"
                        />
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setIsZoomed(false)}
                        >
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 16,
        padding: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        maxWidth: '100%',
    },
    image: {
        width: '100%',
    },
    zoomHint: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    zoomHintText: {
        color: '#FFFFFF',
        fontSize: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        maxWidth: screenWidth * 0.9,
        maxHeight: screenHeight * 0.8,
    },
    zoomedImage: {
        width: screenWidth * 0.85,
        height: screenHeight * 0.6,
    },
    closeButton: {
        position: 'absolute',
        top: -12,
        right: -12,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
    closeButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default DiagramRenderer;
