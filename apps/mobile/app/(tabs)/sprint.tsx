import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function PlaceholderScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Coming Soon</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    text: { color: Colors.textDim, fontSize: 18 },
});
