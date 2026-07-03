import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Show notifications even when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── Day name / index helpers (matches index.tsx logic) ───────────────────────

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function mapDayToIndex(value: unknown): number | null {
  if (typeof value === "number" && value >= 0 && value <= 6) return value;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (DAY_NAME_TO_INDEX[lower] !== undefined) return DAY_NAME_TO_INDEX[lower];
    const parsed = parseInt(lower, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 6) return parsed;
  }
  return null;
}

function parseSelectedDays(selectedDays: unknown): number[] {
  if (Array.isArray(selectedDays)) {
    return selectedDays.map(mapDayToIndex).filter((d): d is number => d !== null);
  }
  if (typeof selectedDays === "string") {
    return selectedDays
      .split(",")
      .map(mapDayToIndex)
      .filter((d): d is number => d !== null);
  }
  return [];
}

// ── Scheduled notification ID tracking ───────────────────────────────────────

const SCHEDULED_IDS_KEY = "notif_scheduled_ids";

async function persistId(id: string) {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    ids.push(id);
    await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(ids));
  } catch {}
}

async function cancelTrackedNotifications() {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
    if (!raw) return;
    const ids: string[] = JSON.parse(raw);
    await Promise.all(
      ids.map((id) =>
        Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
      ),
    );
    await AsyncStorage.removeItem(SCHEDULED_IDS_KEY);
  } catch {}
}

// ── Permission helper ─────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("balance-subscription", {
        name: "Subscription Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#344225",
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

// ── Main scheduling entry point ───────────────────────────────────────────────

export interface SubscriptionNotificationOptions {
  selectedDays: unknown;   // string "monday,tuesday" | string[] | number[]
  endDate: string;         // "YYYY-MM-DD" or ISO — last valid day (inclusive)
  autoRenew: boolean;
  planTitle?: string;
}

export async function scheduleSubscriptionNotifications(
  options: SubscriptionNotificationOptions,
): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  // Always cancel previous batch before scheduling fresh ones
  await cancelTrackedNotifications();

  const { selectedDays, endDate, autoRenew, planTitle } = options;

  // Parse end date as local end-of-day to avoid UTC midnight timezone issues
  const endStr = (endDate || "").split("T")[0]; // "YYYY-MM-DD"
  if (!endStr) return;
  const [ey, em, ed] = endStr.split("-").map(Number);
  const endOfDay = new Date(ey, em - 1, ed, 23, 59, 59);

  const now = new Date();
  const plan = planTitle ? `"${planTitle}"` : "meal";

  // ── 1. Auto-Renewal Reminder ──────────────────────────────────────────────
  // Schedule at 10 AM, 3 days before subscription end (only when auto-renew is ON)
  if (autoRenew) {
    const remindAt = new Date(ey, em - 1, ed - 3, 10, 0, 0);
    if (remindAt > now) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Subscription Auto-Renewing Soon",
            body: `Your ${plan} plan will automatically renew in 3 days. Make sure your payment details are up to date!`,
            data: { type: "auto_renewal" },
            sound: true,
          },
          trigger: { date: remindAt } as any,
        });
        await persistId(id);
      } catch {}
    }
  }

  // ── 2. Meal-Day Reminders ─────────────────────────────────────────────────
  // For each active delivery weekday in the next 60 days, remind at 9 AM.
  // We cap at 60 days so we don't flood the system notification scheduler.
  const dayIndices = parseSelectedDays(selectedDays);
  if (dayIndices.length === 0) return;

  const MAX_DAYS_AHEAD = 60;

  for (let offset = 1; offset <= MAX_DAYS_AHEAD; offset++) {
    const target = new Date(now);
    target.setDate(now.getDate() + offset);
    target.setHours(9, 0, 0, 0);

    if (target > endOfDay) break;

    const dayOfWeek = target.getDay(); // 0 = Sun … 6 = Sat
    if (!dayIndices.includes(dayOfWeek)) continue;

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Meal Delivery Day",
          body: "Today is your meal delivery day! Open the app to view or update your meals.",
          data: { type: "meal_reminder" },
          sound: true,
        },
        trigger: { date: target } as any,
      });
      await persistId(id);
    } catch {}
  }
}

export async function clearSubscriptionNotifications(): Promise<void> {
  await cancelTrackedNotifications();
}
