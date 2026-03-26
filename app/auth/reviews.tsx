import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import { LanguageSwitcher } from "@/components/auth/language-switcher";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
}

const STORAGE_KEY = "userReviews";

export default function ReviewsScreen() {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useStaticScreen();

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setReviews(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load reviews:", error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRating) {
      Alert.alert(t("reviews.alerts.missing_rating_title"), t("reviews.alerts.missing_rating_msg"));
      return;
    }

    if (!comment.trim()) {
      Alert.alert(
        t("reviews.alerts.missing_review_title"),
        t("reviews.alerts.missing_review_msg"),
      );
      return;
    }

    setSubmitting(true);
    try {
      const newReview: Review = {
        id: Date.now().toString(),
        rating: selectedRating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
      };

      const updated = [newReview, ...reviews];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setReviews(updated);
      setSelectedRating(null);
      setComment("");
      Alert.alert(t("reviews.alerts.success_title"), t("reviews.alerts.success_msg"));
    } catch (error) {
      console.error("Failed to save review:", error);
      Alert.alert(t("reviews.alerts.error_title"), t("reviews.alerts.error_msg"));
    } finally {
      setSubmitting(false);
    }
  };

  const formattedReviews = useMemo(
    () =>
      reviews.map((review) => ({
        ...review,
        displayDate: new Date(review.createdAt).toLocaleDateString(),
      })),
    [reviews],
  );

  const renderReview = ({
    item,
  }: {
    item: Review & { displayDate: string };
  }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.ratingRow}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Ionicons
              key={index}
              name={index < item.rating ? "star" : "star-outline"}
              size={16}
              color="#F5A623"
            />
          ))}
        </View>
        <Text style={styles.reviewDate}>{item.displayDate}</Text>
      </View>
      <Text style={styles.reviewComment}>{item.comment}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("reviews.title")}</Text>
        <LanguageSwitcher light />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>{t("reviews.overall_rating")}</Text>
        <View style={styles.ratingRowLarge}>
          {Array.from({ length: 5 }).map((_, index) => {
            const starValue = index + 1;
            const isActive = selectedRating
              ? starValue <= selectedRating
              : false;
            return (
              <TouchableOpacity
                key={starValue}
                style={styles.starButton}
                onPress={() => setSelectedRating(starValue)}
                accessibilityRole="button"
                accessibilityLabel={`${starValue} star${starValue > 1 ? "s" : ""}`}
              >
                <Ionicons
                  name={isActive ? "star" : "star-outline"}
                  size={32}
                  color={isActive ? "#F5A623" : "#CBD5C0"}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>{t("reviews.tell_more")}</Text>
        <TextInput
          style={styles.textArea}
          placeholder={t("reviews.placeholder")}
          placeholderTextColor="#6B7F75"
          multiline
          value={comment}
          onChangeText={setComment}
        />

        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? t("reviews.sending") : t("reviews.add_review")}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>{t("reviews.recent_reviews")}</Text>
        {formattedReviews.length === 0 ? (
          <Text style={styles.emptyState}>{t("reviews.empty_state")}</Text>
        ) : (
          <FlatList
            data={formattedReviews}
            keyExtractor={(item) => item.id}
            renderItem={renderReview}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D4E8E0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: "5%",
    paddingTop: 10,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
  },
  content: {
    flex: 1,
    paddingHorizontal: "5%",
    paddingBottom: 34,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#344225",
    marginBottom: 12,
  },
  ratingRowLarge: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  starButton: {
    padding: 4,
  },
  textArea: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 120,
    color: "#344225",
    borderWidth: 1,
    borderColor: "#B8D5C5",
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: "#344225",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#C9DAD0",
    marginBottom: 20,
  },
  emptyState: {
    fontSize: 14,
    color: "#6B7F75",
    textAlign: "center",
    marginTop: 8,
  },
  listContent: {
    paddingBottom: 80,
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E4EFE7",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    alignItems: "center",
  },
  ratingRow: {
    flexDirection: "row",
    gap: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: "#6B7F75",
  },
  reviewComment: {
    fontSize: 14,
    color: "#344225",
    lineHeight: 20,
  },
});
