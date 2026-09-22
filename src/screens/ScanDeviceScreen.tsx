import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Device } from 'react-native-ble-plx';
import { connectAndSubscribe } from '../ble/connectionManager';
import { requestBlePermissions, scanForHeartRateDevices, waitForPoweredOn } from '../ble/heartRate';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ScanDevice'>;

export function ScanDeviceScreen({ navigation }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let stopScan: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const permitted = await requestBlePermissions();
      if (!permitted) {
        setErrorMessage('Нет разрешения на использование Bluetooth');
        return;
      }
      await waitForPoweredOn();
      if (cancelled) return;

      stopScan = scanForHeartRateDevices(
        (device) => {
          setDevices((prev) => (prev.some((d) => d.id === device.id) ? prev : [...prev, device]));
        },
        () => setErrorMessage('Ошибка сканирования Bluetooth'),
      );
    })();

    return () => {
      cancelled = true;
      stopScan?.();
    };
  }, []);

  const handleConnect = async (device: Device) => {
    setConnectingId(device.id);
    setErrorMessage(null);
    try {
      await connectAndSubscribe(device.id, device.name ?? 'Пульсометр');
      navigation.goBack();
    } catch {
      setErrorMessage('Не удалось подключиться, попробуйте ещё раз');
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Поиск пульсометра</Text>
        <View style={{ width: 26 }} />
      </View>

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ActivityIndicator color={colors.accentStart} />
            <Text style={styles.emptyText}>Поиск устройств поблизости…</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.deviceRow}
            onPress={() => handleConnect(item)}
            disabled={connectingId !== null}
          >
            <Ionicons name="bluetooth" size={20} color={colors.accentStart} />
            <Text style={styles.deviceName}>{item.name ?? item.id}</Text>
            {connectingId === item.id && <ActivityIndicator color={colors.textSecondary} />}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  deviceName: {
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
});
