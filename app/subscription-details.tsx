import { getMySubscriptions, type UserSubscriptionSummary } from "@/api/services/subscriptions";
import BottomTabNav from "@/components/bottom-tab-nav";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
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

export default function SubscriptionDetailsScreen() {
  const [subscription, setSubscription] = useState<UserSubscriptionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadActiveSubscription();
    }, []),
  );

  const loadActiveSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch subscriptions from API
      const response = await getMySubscriptions();

      if (response.success && response.data.active && response.data.active.length > 0) {
        // Get the first active subscription
        setSubscription(response.data.active[0]);
      } else {
        setError("No active subscription found");
        setSubscription(null);
      }
    } catch (e) {
      setError("Failed to load subscription details. Please try again.");
      setSubscription(null);
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
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return monthNames[month - 1] || "";
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "active":
        return "#4CAF50";
      case "completed":
        return "#FF9800";
      case "cancelled":
        return "#F44336";
      default:
        return "#999999";
    }
  };

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
            <Text style={styles.loadingText}>Loading subscription...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#D64545" />
            <Text style={styles.errorTitle}>No Active Subscription</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push("/auth/subscription")}
            >
              <Text style={styles.addButtonText}>Add New Subscription</Text>
            </TouchableOpacity>
          </View>
        ) : subscription ? (
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Status Badge */}
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(subscription.status) },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(subscription.status) },
                ]}
              >
                {subscription.status.charAt(0).toUpperCase() +
                  subscription.status.slice(1)}
              </Text>
            </View>

            {/* Plan Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Plan Information</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Plan Name</Text>
                <Text style={styles.infoValue}>
                  {subscription.subcrption_plans?.title || "-"}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Duration</Text>
                <Text style={styles.infoValue}>
                  {subscription.duration?.title || "-"}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Price</Text>
                <Text style={styles.infoPrice}>{subscription.price}</Text>
              </View>
            </View>

            {/* Date Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Subscription Period</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Start Date</Text>
                <Text style={styles.infoValue}>
                  {formatDate(subscription.start_date)}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>End Date</Text>
                <Text style={styles.infoValue}>
                  {formatDate(subscription.end_date)}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() =>
                  router.push({
                    pathname: "/subscription-full-details",
                    params: { subscriptionId: subscription.id },
                  })
                }
              >
                <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.viewDetailsButtonText}>View Full Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.updateMealsButton}
                onPress={() =>
                  router.push({
                    pathname: "/update-subscription-meals",
                    params: { subscriptionId: subscription.id },
                  })
                }
              >
                <Ionicons name="create-outline" size={20} color="#344225" />
                <Text style={styles.updateMealsButtonText}>Update Meal</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#B0C4B1" />
            <Text style={styles.emptyTitle}>No Active Subscription</Text>
            <Text style={styles.emptyText}>
              Start your meal journey by creating a new subscription
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push("/auth/subscription")}
            >
              <Text style={styles.addButtonText}>Create Subscription</Text>
            </TouchableOpacity>
          </View>
        )}
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
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#6B7F75",
    textAlign: "center",
    marginTop: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    marginVertical: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
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
  actionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#344225",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  viewDetailsButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  updateMealsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6EFE9",
    gap: 8,
  },
  updateMealsButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#344225",
  },
  addButton: {
    backgroundColor: "#344225",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
});
