import { getInquiries, submitInquiry } from "@/api/services/inquiries";
import type { Inquiry } from "@/api/services/inquiries";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AppInquiriesScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const insets = useSafeAreaInsets();

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchInquiries = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getInquiries();
      setInquiries(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      const msg = error instanceof Error ? error.message : t("inquiries.load_error");
      Alert.alert(t("inquiries.title"), msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert(t("inquiries.title"), t("inquiries.field_required"));
      return;
    }
    if (subject.trim().length > 255) {
      Alert.alert(t("inquiries.title"), t("inquiries.subject_too_long"));
      return;
    }
    if (description.trim().length > 5000) {
      Alert.alert(t("inquiries.title"), t("inquiries.description_too_long"));
      return;
    }

    setSubmitting(true);
    try {
      await submitInquiry({ subject: subject.trim(), description: description.trim() });
      Alert.alert(t("inquiries.title"), t("inquiries.submit_success"));
      setShowForm(false);
      setSubject("");
      setDescription("");
      fetchInquiries();
    } catch (error) {
      const msg = error instanceof Error ? error.message : t("inquiries.submit_error");
      Alert.alert(t("inquiries.title"), msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSubject("");
    setDescription("");
  };

  const statusLabel = (status: string) => {
    if (status === "answered") return t("inquiries.status_answered");
    if (status === "closed") return t("inquiries.status_closed");
    return t("inquiries.status_open");
  };

  const statusColor = (status: string) => {
    if (status === "answered") return "#4CAF50";
    if (status === "closed") return "#9E9E9E";
    return "#FF9800";
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isArabic && styles.rtlRow, { paddingTop: Platform.OS === "ios" ? 6 : Math.max(insets.top, 8) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/(tabs)/profile" as any)}>
          <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text style={[styles.headerTitle, isArabic && styles.rtlText]}>{t("inquiries.title")}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerView}>
          <ActivityIndicator size="large" color="#344225" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            inquiries.length === 0 && styles.scrollContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchInquiries(true)}
              tintColor="#344225"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {inquiries.length === 0 ? (
            <View style={styles.emptyView}>
              <Ionicons name="chatbubble-ellipses-outline" size={64} color="#5A7C65" />
              <Text style={[styles.emptyTitle, isArabic && styles.rtlText]}>{t("inquiries.no_inquiries")}</Text>
              <Text style={[styles.emptyDesc, isArabic && styles.rtlText]}>{t("inquiries.no_inquiries_desc")}</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => setShowForm(true)}>
                <Text style={styles.emptyButtonText}>{t("inquiries.new_inquiry")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            inquiries.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  activeOpacity={0.8}
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  {/* Card header row */}
                  <View style={[styles.cardHeader, isArabic && styles.rtlRow]}>
                    <View style={[styles.cardTitleRow, isArabic && styles.rtlRow]}>
                      <Text style={[styles.cardSubject, isArabic && styles.rtlText]} numberOfLines={isExpanded ? undefined : 1}>
                        {item.subject}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "22" }]}>
                        <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                          {statusLabel(item.status)}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#5A7C65"
                    />
                  </View>

                  <Text style={[styles.cardDate, isArabic && styles.rtlText]}>
                    {t("inquiries.submitted_at")}: {formatDate(item.created_at)}
                  </Text>

                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <Text style={[styles.descriptionLabel, isArabic && styles.rtlText]}>{t("inquiries.description")}</Text>
                      <Text style={[styles.descriptionText, isArabic && styles.rtlText]}>{item.description}</Text>

                      {item.admin_reply ? (
                        <View style={[styles.replyBox, isArabic && styles.replyBoxRTL]}>
                          <View style={[styles.replyHeader, isArabic && styles.rtlRow]}>
                            <Text style={[styles.replyLabel, isArabic && styles.rtlText]}>{t("inquiries.admin_reply")}</Text>
                            {item.replied_at && (
                              <Text style={styles.replyDate}>{formatDate(item.replied_at)}</Text>
                            )}
                          </View>
                          <Text style={[styles.replyText, isArabic && styles.rtlText]}>{item.admin_reply}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* New Inquiry Modal */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={handleCloseForm}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={[styles.modalHeader, isArabic && styles.rtlRow]}>
              <Text style={styles.modalTitle}>{t("inquiries.new_inquiry")}</Text>
              <TouchableOpacity onPress={handleCloseForm}>
                <Ionicons name="close" size={24} color="#344225" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, isArabic && styles.rtlText]}>{t("inquiries.subject")}</Text>
            <TextInput
              style={[styles.input, isArabic && styles.inputRtl]}
              placeholder={t("inquiries.subject_placeholder")}
              placeholderTextColor="#9DB3A4"
              value={subject}
              onChangeText={setSubject}
              maxLength={255}
              textAlign={isArabic ? "right" : "left"}
            />

            <Text style={[styles.fieldLabel, isArabic && styles.rtlText]}>{t("inquiries.description")}</Text>
            <TextInput
              style={[styles.textArea, isArabic && styles.inputRtl]}
              placeholder={t("inquiries.description_placeholder")}
              placeholderTextColor="#9DB3A4"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              maxLength={5000}
              textAlignVertical="top"
              textAlign={isArabic ? "right" : "left"}
            />

            <View style={[styles.modalActions, isArabic && styles.rtlRow]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCloseForm} disabled={submitting}>
                <Text style={styles.cancelBtnText}>{t("inquiries.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>{t("inquiries.submit")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
  rtlText: {
    textAlign: "right",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#344225",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  centerView: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  scrollContentEmpty: {
    flex: 1,
  },
  emptyView: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 14,
    color: "#5A7C65",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 8,
    backgroundColor: "#344225",
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  card: {
    backgroundColor: "#E8F0ED",
    borderRadius: 14,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardSubject: {
    fontSize: 15,
    fontWeight: "600",
    color: "#344225",
    flex: 1,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardDate: {
    fontSize: 12,
    color: "#5A7C65",
    marginTop: 2,
  },
  expandedContent: {
    marginTop: 12,
    gap: 8,
  },
  descriptionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#344225",
  },
  descriptionText: {
    fontSize: 14,
    color: "#344225",
    lineHeight: 20,
  },
  replyBox: {
    backgroundColor: "#C8DFCF",
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#344225",
    marginTop: 4,
    gap: 8,
  },
  replyBoxRTL: {
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderRightColor: "#344225",
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  replyLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#344225",
    flex: 1,
  },
  replyDate: {
    fontSize: 11,
    color: "#5A7C65",
  },
  replyText: {
    fontSize: 14,
    color: "#344225",
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#344225",
    marginBottom: -4,
  },
  input: {
    backgroundColor: "#F5FAF7",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#344225",
    borderWidth: 1,
    borderColor: "#D4E8E0",
  },
  textArea: {
    backgroundColor: "#F5FAF7",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#344225",
    borderWidth: 1,
    borderColor: "#D4E8E0",
    minHeight: 120,
  },
  inputRtl: {
    textAlign: "right",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: "#E8F0ED",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#344225",
  },
  submitBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: "#344225",
    alignItems: "center",
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
