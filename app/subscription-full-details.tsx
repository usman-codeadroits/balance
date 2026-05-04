import { getSubscriptionDetails, getSubscriptionPauseLogs, type PauseLog, type UserSubscriptionDetails } from "@/api/services/subscriptions";
import BottomTabNav from "@/components/bottom-tab-nav";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function SubscriptionFullDetailsScreen() {
  const { subscriptionId } = useLocalSearchParams();
  const [details, setDetails] = useState<UserSubscriptionDetails | null>(null);
  const [pauseLogs, setPauseLogs] = useState<PauseLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (subscriptionId) {
        loadSubscriptionDetails(Number(subscriptionId));
      }
    }, [subscriptionId]),
  );

  const loadSubscriptionDetails = async (id: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await getSubscriptionDetails(id);

      if (response.success && response.data) {
        setDetails(response.data);
        if (response.data.is_paused) {
          try {
            const logsResponse = await getSubscriptionPauseLogs(id);
            if (logsResponse.success) setPauseLogs(logsResponse.pause_logs);
          } catch {
            // non-critical
          }
        }
      } else {
        setError("Failed to load subscription details");
      }
    } catch (e) {
      setError("Failed to load subscription details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "-";

    try {
      // Handle date format like "20.03.2024"
      const parts = dateString.split(".");
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${day} ${getMonthName(parseInt(month))} ${year}`;
      }

      // Fallback to standard date parsing
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      const dayNum = date.getDate();
      const monthName = getMonthName(date.getMonth() + 1);
      const yearNum = date.getFullYear();
      return `${dayNum} ${monthName} ${yearNum}`;
    } catch (error) {
      return dateString || "-";
    }
  };

  const getMonthName = (month: number): string => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return monthNames[month - 1] || "";
  };

  const getActivePauseLog = (): PauseLog | null => {
    const entries = pauseLogs.filter((l) => l.action === "pause" && !l.resumed_at);
    if (!entries.length) return null;
    return entries.sort(
      (a, b) => new Date(b.action_timestamp).getTime() - new Date(a.action_timestamp).getTime(),
    )[0];
  };

  const activePauseLog = getActivePauseLog();
  const isPausedByAdmin = details?.is_paused && activePauseLog?.performed_by_type === "admin";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#344225" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#344225" />
            <Text style={styles.loadingText}>Loading details...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#D64545" />
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                if (subscriptionId) {
                  loadSubscriptionDetails(Number(subscriptionId));
                }
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : details ? (
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Admin Pause Card */}
            {isPausedByAdmin && (
              <View style={styles.adminPauseCard}>
                <View style={styles.adminPauseCardHeader}>
                  <Ionicons name="pause-circle" size={22} color="#FFFFFF" />
                  <Text style={styles.adminPauseCardTitle}>Paused by Admin</Text>
                </View>
                <Text style={styles.adminPauseCardSubtitle}>
                  Your subscription has been paused by an administrator.
                </Text>
                {activePauseLog?.performed_by_name ? (
                  <View style={styles.adminPauseRow}>
                    <Text style={styles.adminPauseLabel}>Paused By</Text>
                    <Text style={styles.adminPauseValue}>{activePauseLog.performed_by_name}</Text>
                  </View>
                ) : null}
                {activePauseLog?.reason ? (
                  <View style={styles.adminPauseRow}>
                    <Text style={styles.adminPauseLabel}>Reason</Text>
                    <Text style={styles.adminPauseValue}>{activePauseLog.reason}</Text>
                  </View>
                ) : null}
                {details?.paused_at ? (
                  <View style={styles.adminPauseRow}>
                    <Text style={styles.adminPauseLabel}>Paused On</Text>
                    <Text style={styles.adminPauseValue}>{formatDate(details.paused_at)}</Text>
                  </View>
                ) : null}
                {details?.paused_until ? (
                  <View style={styles.adminPauseRow}>
                    <Text style={styles.adminPauseLabel}>Paused Until</Text>
                    <Text style={styles.adminPauseValue}>{formatDate(details.paused_until)}</Text>
                  </View>
                ) : null}
                {activePauseLog?.paused_days ? (
                  <View style={styles.adminPauseRow}>
                    <Text style={styles.adminPauseLabel}>Paused Days</Text>
                    <Text style={styles.adminPauseValue}>{activePauseLog.paused_days} days</Text>
                  </View>
                ) : null}
                {activePauseLog?.notes ? (
                  <View style={styles.adminPauseRow}>
                    <Text style={styles.adminPauseLabel}>Notes</Text>
                    <Text style={styles.adminPauseValue}>{activePauseLog.notes}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* User-paused banner */}
            {details?.is_paused && !isPausedByAdmin && (
              <View style={styles.userPauseBanner}>
                <Ionicons name="pause-circle-outline" size={20} color="#344225" />
                <Text style={styles.userPauseBannerText}>
                  Subscription is currently paused
                  {details.paused_until ? ` until ${formatDate(details.paused_until)}` : ""}
                </Text>
              </View>
            )}

            {/* Basic Info */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Basic Information</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text
                  style={[
                    styles.infoValue,
                    {
                      color: details.is_paused
                        ? "#FF9800"
                        : details.status === "active"
                          ? "#4CAF50"
                          : details.status === "completed"
                            ? "#FF9800"
                            : "#F44336",
                    },
                  ]}
                >
                  {details.is_paused
                    ? isPausedByAdmin ? "Paused by Admin" : "Paused"
                    : details.status.charAt(0).toUpperCase() + details.status.slice(1)}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Personalized</Text>
                <Text style={styles.infoValue}>
                  {details.is_personalized ? "Yes" : "No"}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Price</Text>
                <Text style={styles.infoPrice}>
                  {details.price} {details.currency}
                </Text>
              </View>
            </View>

            {/* Dates */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Subscription Period</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Start Date</Text>
                <Text style={styles.infoValue}>
                  {formatDate(details.start_date)}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>End Date</Text>
                <Text style={styles.infoValue}>
                  {formatDate(details.end_date)}
                </Text>
              </View>
            </View>

            {/* Delivery Address */}
            {details.address && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Delivery Address</Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{details.address.first_name}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Area</Text>
                  <Text style={styles.infoValue}>{details.address.area}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Street</Text>
                  <Text style={styles.infoValue}>{details.address.street}</Text>
                </View>
              </View>
            )}

            {/* Meals */}
            {details.subscription_days && details.subscription_days.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Subscription Schedule</Text>

                {details.subscription_days.map((day, dayIndex) => (
                  <View key={dayIndex}>
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayName}>
                        {day.day.charAt(0).toUpperCase() + day.day.slice(1)}
                      </Text>
                      <Text style={styles.mealCount}>
                        {day.subscription_meals.length} item
                        {day.subscription_meals.length !== 1 ? "s" : ""}
                      </Text>
                    </View>

                    {day.subscription_meals.map((meal, mealIndex) => (
                      <View key={mealIndex}>
                        <View style={styles.mealRow}>
                          <View style={styles.mealInfo}>
                            <Text style={styles.mealTitle}>{meal.meal.title}</Text>
                            <Text style={styles.mealType}>{meal.type}</Text>
                          </View>
                          <View style={styles.calorieBox}>
                            <Text style={styles.calorieText}>
                              {meal.meal.calories}
                            </Text>
                            <Text style={styles.calorieLabel}>kcal</Text>
                          </View>
                        </View>
                        {mealIndex < day.subscription_meals.length - 1 && (
                          <View style={styles.divider} />
                        )}
                      </View>
                    ))}

                    {dayIndex < details.subscription_days.length - 1 && (
                      <View style={styles.dayDivider} />
                    )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        ) : null}
      </View>

      <BottomTabNav activeTab="home" onHomePress={() => router.replace("/main-screen")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D4E8E0",
  },
  content: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: "#D4E8E0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#344225",
    textAlign: "center",
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  adminPauseCard: {
    backgroundColor: "#B94A00",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  adminPauseCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  adminPauseCardTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  adminPauseCardSubtitle: { fontSize: 13, color: "#FFD4B0", marginBottom: 10, lineHeight: 18 },
  adminPauseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  adminPauseLabel: { fontSize: 12, color: "#FFD4B0", fontWeight: "500" },
  adminPauseValue: { fontSize: 12, color: "#FFFFFF", fontWeight: "600", flexShrink: 1, textAlign: "right", marginLeft: 8 },
  userPauseBanner: {
    backgroundColor: "#FFF3CD",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#FAD979",
  },
  userPauseBannerText: { fontSize: 13, color: "#344225", fontWeight: "500", flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7F75",
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#D64545",
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#6B7F75",
    textAlign: "center",
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: "#344225",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7F75",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#344225",
  },
  infoPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2E7D32",
  },
  divider: {
    height: 1,
    backgroundColor: "#E6EFE9",
    marginVertical: 12,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    marginBottom: 12,
  },
  dayName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#344225",
  },
  mealCount: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7F75",
  },
  mealRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  mealInfo: {
    flex: 1,
  },
  mealTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#344225",
    marginBottom: 4,
  },
  mealType: {
    fontSize: 12,
    fontWeight: "400",
    color: "#6B7F75",
  },
  calorieBox: {
    alignItems: "center",
    justifyContent: "center",
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  calorieText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#344225",
  },
  calorieLabel: {
    fontSize: 10,
    fontWeight: "400",
    color: "#6B7F75",
  },
  dayDivider: {
    height: 2,
    backgroundColor: "#E6EFE9",
    marginVertical: 16,
  },
});
