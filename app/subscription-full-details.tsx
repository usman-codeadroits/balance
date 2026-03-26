import { getSubscriptionDetails, type UserSubscriptionDetails } from "@/api/services/subscriptions";
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
      } else {
        setError("Failed to load subscription details");
      }
    } catch (e) {
      console.error("Error loading subscription details:", e);
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
            {/* Basic Info */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Basic Information</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text
                  style={[
                    styles.infoValue,
                    {
                      color:
                        details.status === "active"
                          ? "#4CAF50"
                          : details.status === "completed"
                            ? "#FF9800"
                            : "#F44336",
                    },
                  ]}
                >
                  {details.status.charAt(0).toUpperCase() +
                    details.status.slice(1)}
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
