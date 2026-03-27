import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import BottomTabNav from "@/components/bottom-tab-nav";
import { getMySubscriptions, type UserSubscriptionSummary } from "@/api/services/subscriptions";

export default function OrderHistoryScreen() {
  const { t } = useTranslation();
  const [activeSubscriptions, setActiveSubscriptions] = useState<UserSubscriptionSummary[]>([]);
  const [recentSubscriptions, setRecentSubscriptions] = useState<UserSubscriptionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadSubscriptions();
    }, []),
  );

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Always fetch latest history from API for current authenticated user.
      const response = await getMySubscriptions();

      if (response.success) {
        setActiveSubscriptions(response.data.active || []);
        setRecentSubscriptions(response.data.recent || []);
      } else {
        setError("Failed to load subscriptions");
      }
    } catch (err) {
      console.error("Error loading subscriptions:", err);
      setError("Failed to load subscriptions. Please try again.");
      // Still show empty state rather than crashing
      setActiveSubscriptions([]);
      setRecentSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';

    try {
      // Handle date format like "20.03.2024"
      const parts = dateString.split('.');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${day} ${getMonthName(parseInt(month))} ${year}`;
      }

      // Fallback to standard date parsing
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      const day = date.getDate();
      const monthName = getMonthName(date.getMonth() + 1);
      const year = date.getFullYear();
      return `${day} ${monthName} ${year}`;
    } catch (error) {
      return dateString || '-';
    }
  };

  const getMonthName = (month: number): string => {
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return monthNames[month - 1] || "";
  };

  const getOrderSummary = (subscription: UserSubscriptionSummary): string => {
    return `${subscription.subcrption_plans?.title || 'Meal Plan'} • ${subscription.duration?.title || 'Duration'}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{t("history.title")}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#344225" />
            <Text style={styles.emptyText}>{t("history.loading")}</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadSubscriptions} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>{t("history.retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Active Subscriptions */}
            {activeSubscriptions.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{t("history.active_subs")}</Text>
                {activeSubscriptions.map((subscription) => (
                  <View key={subscription.id} style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <Text style={styles.orderTitle}>
                        {getOrderSummary(subscription)}
                      </Text>
                      <Text style={styles.orderPrice}>
                        {subscription.price}
                      </Text>
                    </View>
                    <Text style={styles.orderStatus}>{subscription.status}</Text>
                    <View style={styles.orderFooter}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color="#344225"
                      />
                      <Text style={styles.orderDate}>
                        {formatDate(subscription.start_date)} - {formatDate(subscription.end_date)}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Recent/Completed Subscriptions */}
            {recentSubscriptions.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>
                  {activeSubscriptions.length > 0
                    ? t("history.recent_subs")
                    : t("history.title")}
                </Text>
                {recentSubscriptions.map((subscription) => (
                  <View
                    key={subscription.id}
                    style={[
                      styles.orderCard,
                      styles.orderCardCompleted,
                    ]}
                  >
                    <View style={styles.orderHeader}>
                      <Text style={styles.orderTitle}>
                        {getOrderSummary(subscription)}
                      </Text>
                      <Text style={styles.orderPrice}>
                        {subscription.price}
                      </Text>
                    </View>
                    <Text style={styles.orderStatus}>{subscription.status}</Text>
                    <View style={styles.orderFooter}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color="#344225"
                      />
                      <Text style={styles.orderDate}>
                        {formatDate(subscription.start_date)} - {formatDate(subscription.end_date)}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {activeSubscriptions.length === 0 && recentSubscriptions.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t("history.no_subs")}</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <BottomTabNav
        activeTab="history"
        onHomePress={() => router.replace("/main-screen")}
      />
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
  titleContainer: {
    paddingHorizontal: "5%",
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: "#D4E8E0",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#344225",
    textAlign: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: "5%",
    paddingBottom: 140,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
    marginTop: 20,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7F75",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: "10%",
  },
  errorText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#D64545",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#344225",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  orderCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6EFE9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  orderCardCompleted: {
    borderColor: "#FAD979",
  },
  orderCardCancelled: {
    borderColor: "#FFB3B3",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#344225",
  },
  orderPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#344225",
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: "500",
    color: "#344225",
    marginBottom: 8,
  },
  orderFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  orderDate: {
    fontSize: 12,
    fontWeight: "400",
    color: "#344225",
  },
});
