import {
  createAddress,
  deleteAddress,
  getAddresses,
  getProfile,
  updateAddress,
  updateProfile,
  type Address,
  type AddressBody,
  type UserProfile,
} from "@/api/services/profile";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Tab = "profile" | "addresses";

const GOALS = [
  { value: "eat_healthy",     label: "Eat Healthy" },
  { value: "lose_weight",     label: "Lose Weight" },
  { value: "gain_weight",     label: "Gain Weight" },
  { value: "build_muscle",    label: "Build Muscle" },
  { value: "maintain_weight", label: "Maintain Weight" },
] as const;

const ACTIVITY_LEVELS = [
  { value: "sedentary",       label: "Sedentary" },
  { value: "lightly_active",  label: "Lightly Active" },
  { value: "very_active",     label: "Very Active" },
  { value: "highly_active",   label: "Highly Active" },
] as const;

const GENDERS = [
  { value: "male",   label: "Male" },
  { value: "female", label: "Female" },
  { value: "other",  label: "Other" },
] as const;

const DELIVERY_SLOTS = [
  { value: "four_pm_to_eight_pm",   label: "4 PM – 8 PM" },
  { value: "eight_pm_to_midnight",  label: "8 PM – 12 AM" },
] as const;

const emptyAddressForm = (): AddressBody => ({
  first_name: "",
  last_name: "",
  area: "",
  block_number: "",
  street: "",
  house_building: "",
  floor_apartment: "",
  phone_number: "",
  remarks: "",
  delivery_notes: "",
  category: "home",
  is_primary: false,
  preferred_delivery_slot: "four_pm_to_eight_pm",
});

export default function MyProfileScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // ── Profile state ──
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<string>("");
  const [dob, setDob] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState<string>("");
  const [activityLevel, setActivityLevel] = useState<string>("");
  const [hasAllergies, setHasAllergies] = useState(false);
  const [allergiesText, setAllergiesText] = useState("");

  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showGoalDropdown, setShowGoalDropdown] = useState(false);
  const [showActivityDropdown, setShowActivityDropdown] = useState(false);

  // ── Address state ──
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressModal, setAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addrForm, setAddrForm] = useState<AddressBody>(emptyAddressForm());
  const [addrSaving, setAddrSaving] = useState(false);

  useEffect(() => {
    loadProfile();
    loadAddresses();
  }, []);

  // ── Profile ──────────────────────────────────────────────────────────────

  const loadProfile = async () => {
    try {
      setProfileLoading(true);
      const res = await getProfile();
      if (res.success && res.data) {
        const p = res.data;
        setProfile(p);
        setName(p.name ?? "");
        setEmail(p.email ?? "");
        setGender(p.gender ?? "");
        setDob(p.dob ?? "");
        setHeight(p.height != null ? String(p.height) : "");
        setWeight(p.weight != null ? String(p.weight) : "");
        setGoal(p.goal ?? "");
        setActivityLevel(p.activity_level ?? "");
        setHasAllergies(p.has_food_allergies ?? false);
        setAllergiesText((p.allergies ?? []).join(", "));
      }
    } catch {
      Alert.alert("Error", "Could not load profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setProfileSaving(true);
      const body: any = {};
      if (name.trim())         body.name = name.trim();
      if (email.trim())        body.email = email.trim();
      if (gender)              body.gender = gender;
      if (dob.trim())          body.dob = dob.trim();
      if (height.trim())       body.height = parseFloat(height);
      if (weight.trim())       body.weight = parseFloat(weight);
      if (goal)                body.goal = goal;
      if (activityLevel)       body.activity_level = activityLevel;
      body.has_food_allergies = hasAllergies;
      if (hasAllergies) {
        body.allergies = allergiesText.split(",").map((a) => a.trim()).filter(Boolean);
      }
      const res = await updateProfile(body);
      if (res.success) {
        Alert.alert("Saved", "Profile updated successfully.");
        setProfile(res.data);
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not save profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Addresses ────────────────────────────────────────────────────────────

  const loadAddresses = async () => {
    try {
      setAddressesLoading(true);
      const res = await getAddresses();
      if (res.success) setAddresses(res.data ?? []);
    } catch {
      setAddresses([]);
    } finally {
      setAddressesLoading(false);
    }
  };

  const openNewAddress = () => {
    setEditingAddress(null);
    setAddrForm(emptyAddressForm());
    setAddressModal(true);
  };

  const openEditAddress = (addr: Address) => {
    setEditingAddress(addr);
    setAddrForm({
      first_name: addr.first_name ?? "",
      last_name: addr.last_name ?? "",
      area: addr.area ?? "",
      block_number: addr.block_number ?? "",
      street: addr.street ?? "",
      house_building: addr.house_building ?? "",
      floor_apartment: addr.floor_apartment ?? "",
      phone_number: addr.phone_number ?? "",
      remarks: addr.remarks ?? "",
      delivery_notes: addr.delivery_notes ?? "",
      category: addr.category ?? "home",
      is_primary: addr.is_primary ?? false,
      preferred_delivery_slot: addr.preferred_delivery_slot ?? "four_pm_to_eight_pm",
    });
    setAddressModal(true);
  };

  const handleSaveAddress = async () => {
    if (!addrForm.first_name.trim()) {
      Alert.alert("Required", "First name is required.");
      return;
    }
    if (!addrForm.phone_number.trim()) {
      Alert.alert("Required", "Phone number is required.");
      return;
    }
    try {
      setAddrSaving(true);
      const body: AddressBody = {
        ...addrForm,
        first_name: addrForm.first_name.trim(),
        phone_number: addrForm.phone_number.trim(),
      };
      if (editingAddress) {
        await updateAddress(editingAddress.id, body);
      } else {
        await createAddress(body);
      }
      setAddressModal(false);
      loadAddresses();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not save address.");
    } finally {
      setAddrSaving(false);
    }
  };

  const handleDeleteAddress = (addr: Address) => {
    Alert.alert("Delete Address", "Are you sure you want to delete this address?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAddress(addr.id);
            loadAddresses();
          } catch (err: any) {
            Alert.alert("Error", err?.message || "Could not delete address.");
          }
        },
      },
    ]);
  };

  const setAddrField = (key: keyof AddressBody, value: any) =>
    setAddrForm((prev) => ({ ...prev, [key]: value }));

  const slotLabel = (slot: string) =>
    DELIVERY_SLOTS.find((s) => s.value === slot)?.label ?? slot;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "profile" && styles.tabActive]}
          onPress={() => setActiveTab("profile")}
        >
          <Ionicons name="person-outline" size={16} color={activeTab === "profile" ? "#344225" : "#6B7F75"} />
          <Text style={[styles.tabLabel, activeTab === "profile" && styles.tabLabelActive]}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "addresses" && styles.tabActive]}
          onPress={() => setActiveTab("addresses")}
        >
          <Ionicons name="location-outline" size={16} color={activeTab === "addresses" ? "#344225" : "#6B7F75"} />
          <Text style={[styles.tabLabel, activeTab === "addresses" && styles.tabLabelActive]}>Addresses</Text>
        </TouchableOpacity>
      </View>

      {/* ── PROFILE TAB ── */}
      {activeTab === "profile" && (
        profileLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#344225" />
          </View>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
              showsVerticalScrollIndicator={false}
            >
              <Field label="Full Name">
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#8AADA0" />
              </Field>

              <Field label="Email">
                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="your@email.com" placeholderTextColor="#8AADA0" keyboardType="email-address" autoCapitalize="none" />
              </Field>

              <Field label="Date of Birth (YYYY-MM-DD)">
                <TextInput style={styles.input} value={dob} onChangeText={setDob} placeholder="1990-05-15" placeholderTextColor="#8AADA0" />
              </Field>

              <Field label="Gender">
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => { setShowGenderDropdown(!showGenderDropdown); setShowGoalDropdown(false); setShowActivityDropdown(false); }}
                >
                  <Text style={[styles.dropdownBtnText, !gender && styles.dropdownBtnPlaceholder]}>
                    {GENDERS.find((g) => g.value === gender)?.label ?? "Select gender"}
                  </Text>
                  <Ionicons name={showGenderDropdown ? "chevron-up" : "chevron-down"} size={18} color="#344225" />
                </TouchableOpacity>
                {showGenderDropdown && (
                  <View style={styles.dropdownList}>
                    {GENDERS.map((g, i) => (
                      <TouchableOpacity
                        key={g.value}
                        style={[styles.dropdownListItem, gender === g.value && styles.dropdownListItemActive, i === GENDERS.length - 1 && styles.dropdownListItemLast]}
                        onPress={() => { setGender(g.value); setShowGenderDropdown(false); }}
                      >
                        <Text style={[styles.dropdownListItemText, gender === g.value && styles.dropdownListItemTextActive]}>{g.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </Field>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Field label="Height (cm)">
                    <TextInput style={styles.input} value={height} onChangeText={setHeight} placeholder="175" placeholderTextColor="#8AADA0" keyboardType="numeric" />
                  </Field>
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Field label="Weight (kg)">
                    <TextInput style={styles.input} value={weight} onChangeText={setWeight} placeholder="70" placeholderTextColor="#8AADA0" keyboardType="numeric" />
                  </Field>
                </View>
              </View>

              <Field label="Goal">
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => { setShowGoalDropdown(!showGoalDropdown); setShowGenderDropdown(false); setShowActivityDropdown(false); }}
                >
                  <Text style={[styles.dropdownBtnText, !goal && styles.dropdownBtnPlaceholder]}>
                    {GOALS.find((g) => g.value === goal)?.label ?? "Select goal"}
                  </Text>
                  <Ionicons name={showGoalDropdown ? "chevron-up" : "chevron-down"} size={18} color="#344225" />
                </TouchableOpacity>
                {showGoalDropdown && (
                  <View style={styles.dropdownList}>
                    {GOALS.map((g, i) => (
                      <TouchableOpacity
                        key={g.value}
                        style={[styles.dropdownListItem, goal === g.value && styles.dropdownListItemActive, i === GOALS.length - 1 && styles.dropdownListItemLast]}
                        onPress={() => { setGoal(g.value); setShowGoalDropdown(false); }}
                      >
                        <Text style={[styles.dropdownListItemText, goal === g.value && styles.dropdownListItemTextActive]}>{g.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </Field>

              <Field label="Activity Level">
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => { setShowActivityDropdown(!showActivityDropdown); setShowGenderDropdown(false); setShowGoalDropdown(false); }}
                >
                  <Text style={[styles.dropdownBtnText, !activityLevel && styles.dropdownBtnPlaceholder]}>
                    {ACTIVITY_LEVELS.find((a) => a.value === activityLevel)?.label ?? "Select activity level"}
                  </Text>
                  <Ionicons name={showActivityDropdown ? "chevron-up" : "chevron-down"} size={18} color="#344225" />
                </TouchableOpacity>
                {showActivityDropdown && (
                  <View style={styles.dropdownList}>
                    {ACTIVITY_LEVELS.map((a, i) => (
                      <TouchableOpacity
                        key={a.value}
                        style={[styles.dropdownListItem, activityLevel === a.value && styles.dropdownListItemActive, i === ACTIVITY_LEVELS.length - 1 && styles.dropdownListItemLast]}
                        onPress={() => { setActivityLevel(a.value); setShowActivityDropdown(false); }}
                      >
                        <Text style={[styles.dropdownListItemText, activityLevel === a.value && styles.dropdownListItemTextActive]}>{a.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </Field>

              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Food Allergies</Text>
                <Switch
                  value={hasAllergies}
                  onValueChange={setHasAllergies}
                  trackColor={{ false: "#B8D5C5", true: "#344225" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {hasAllergies && (
                <Field label="Allergies (comma-separated)">
                  <TextInput
                    style={styles.input}
                    value={allergiesText}
                    onChangeText={setAllergiesText}
                    placeholder="gluten, dairy, nuts"
                    placeholderTextColor="#8AADA0"
                  />
                </Field>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, profileSaving && styles.saveBtnDisabled]}
                onPress={handleSaveProfile}
                disabled={profileSaving}
              >
                {profileSaving
                  ? <ActivityIndicator size="small" color="#344225" />
                  : <Text style={styles.saveBtnText}>Save Profile</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )
      )}

      {/* ── ADDRESSES TAB ── */}
      {activeTab === "addresses" && (
        addressesLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#344225" />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            {addresses.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="location-outline" size={40} color="#B8D5C5" />
                <Text style={styles.emptyText}>No addresses yet</Text>
              </View>
            ) : (
              addresses.map((addr) => (
                <View key={addr.id} style={styles.addrCard}>
                  <View style={styles.addrCardTop}>
                    <View style={styles.addrCardLeft}>
                      <View style={styles.addrCategoryRow}>
                        <Ionicons
                          name={addr.category === "home" ? "home-outline" : "briefcase-outline"}
                          size={14}
                          color="#5A7C65"
                        />
                        <Text style={styles.addrCategory}>
                          {addr.category === "home" ? "Home" : "Office"}
                        </Text>
                        {addr.is_primary && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>Primary</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.addrName}>{addr.first_name}{addr.last_name ? ` ${addr.last_name}` : ""}</Text>
                      <Text style={styles.addrLine}>
                        {[addr.block_number && `Block ${addr.block_number}`, addr.street, addr.house_building, addr.area].filter(Boolean).join(", ")}
                      </Text>
                      {addr.floor_apartment ? <Text style={styles.addrLine}>Floor/Apt: {addr.floor_apartment}</Text> : null}
                      <Text style={styles.addrLine}>{addr.phone_number}</Text>
                      <Text style={styles.addrSlot}>{slotLabel(addr.preferred_delivery_slot)}</Text>
                      {addr.delivery_notes ? (
                        <Text style={styles.addrNotes}>📝 {addr.delivery_notes}</Text>
                      ) : null}
                    </View>
                    <View style={styles.addrActions}>
                      <TouchableOpacity style={styles.addrEditBtn} onPress={() => openEditAddress(addr)}>
                        <Ionicons name="create-outline" size={16} color="#344225" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.addrDeleteBtn} onPress={() => handleDeleteAddress(addr)}>
                        <Ionicons name="trash-outline" size={16} color="#C0392B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}

            <TouchableOpacity style={styles.addAddrBtn} onPress={openNewAddress}>
              <Ionicons name="add-circle-outline" size={20} color="#344225" />
              <Text style={styles.addAddrBtnText}>Add New Address</Text>
            </TouchableOpacity>
          </ScrollView>
        )
      )}

      {/* ── ADDRESS MODAL ── */}
      <Modal visible={addressModal} animationType="slide" transparent onRequestClose={() => setAddressModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingAddress ? "Edit Address" : "New Address"}</Text>
              <TouchableOpacity onPress={() => setAddressModal(false)}>
                <Ionicons name="close" size={22} color="#344225" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalRow}>
                <View style={{ flex: 1 }}>
                  <Field label="First Name *">
                    <TextInput style={styles.input} value={addrForm.first_name} onChangeText={(v) => setAddrField("first_name", v)} placeholder="First name" placeholderTextColor="#8AADA0" />
                  </Field>
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <Field label="Last Name">
                    <TextInput style={styles.input} value={addrForm.last_name ?? ""} onChangeText={(v) => setAddrField("last_name", v)} placeholder="Last name" placeholderTextColor="#8AADA0" />
                  </Field>
                </View>
              </View>

              <Field label="Phone Number *">
                <TextInput style={styles.input} value={addrForm.phone_number} onChangeText={(v) => setAddrField("phone_number", v)} placeholder="96512345678" placeholderTextColor="#8AADA0" keyboardType="phone-pad" />
              </Field>

              <View style={styles.modalRow}>
                <View style={{ flex: 1 }}>
                  <Field label="Area">
                    <TextInput style={styles.input} value={addrForm.area ?? ""} onChangeText={(v) => setAddrField("area", v)} placeholder="Salmiya" placeholderTextColor="#8AADA0" />
                  </Field>
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <Field label="Block">
                    <TextInput style={styles.input} value={addrForm.block_number ?? ""} onChangeText={(v) => setAddrField("block_number", v)} placeholder="4" placeholderTextColor="#8AADA0" keyboardType="numeric" />
                  </Field>
                </View>
              </View>

              <Field label="Street">
                <TextInput style={styles.input} value={addrForm.street ?? ""} onChangeText={(v) => setAddrField("street", v)} placeholder="Street 12" placeholderTextColor="#8AADA0" />
              </Field>

              <Field label="House / Building">
                <TextInput style={styles.input} value={addrForm.house_building ?? ""} onChangeText={(v) => setAddrField("house_building", v)} placeholder="Villa 7" placeholderTextColor="#8AADA0" />
              </Field>

              <Field label="Floor / Apartment">
                <TextInput style={styles.input} value={addrForm.floor_apartment ?? ""} onChangeText={(v) => setAddrField("floor_apartment", v)} placeholder="Floor 3, Apt 12" placeholderTextColor="#8AADA0" />
              </Field>

              <Field label="Remarks">
                <TextInput style={styles.input} value={addrForm.remarks ?? ""} onChangeText={(v) => setAddrField("remarks", v)} placeholder="Near the park" placeholderTextColor="#8AADA0" />
              </Field>

              <Field label="Delivery Notes">
                <TextInput style={[styles.input, { minHeight: 80, paddingTop: 12 }]} value={addrForm.delivery_notes ?? ""} onChangeText={(v) => setAddrField("delivery_notes", v)} placeholder="Ring bell twice, gate code 1234" placeholderTextColor="#8AADA0" multiline textAlignVertical="top" maxLength={1000} />
              </Field>

              <Field label="Category">
                <View style={styles.chipRow}>
                  {(["home", "office"] as const).map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, addrForm.category === c && styles.chipActive]}
                      onPress={() => setAddrField("category", c)}
                    >
                      <Text style={[styles.chipText, addrForm.category === c && styles.chipTextActive]}>
                        {c === "home" ? "Home" : "Office"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>

              <Field label="Delivery Slot">
                <View style={styles.chipRow}>
                  {DELIVERY_SLOTS.map((s) => (
                    <TouchableOpacity
                      key={s.value}
                      style={[styles.chip, addrForm.preferred_delivery_slot === s.value && styles.chipActive]}
                      onPress={() => setAddrField("preferred_delivery_slot", s.value)}
                    >
                      <Text style={[styles.chipText, addrForm.preferred_delivery_slot === s.value && styles.chipTextActive]}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>

              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Set as Primary</Text>
                <Switch
                  value={addrForm.is_primary ?? false}
                  onValueChange={(v) => setAddrField("is_primary", v)}
                  trackColor={{ false: "#B8D5C5", true: "#344225" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, addrSaving && styles.saveBtnDisabled]}
                onPress={handleSaveAddress}
                disabled={addrSaving}
              >
                {addrSaving
                  ? <ActivityIndicator size="small" color="#344225" />
                  : <Text style={styles.saveBtnText}>{editingAddress ? "Update Address" : "Save Address"}</Text>}
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#D4E8E0" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#344225", alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#344225", flex: 1, textAlign: "center" },

  tabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 11,
  },
  tabActive: { backgroundColor: "#FAD979" },
  tabLabel: { fontSize: 14, fontWeight: "600", color: "#6B7F75" },
  tabLabelActive: { color: "#344225" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: "600", color: "#6B8F7A", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    backgroundColor: "#C8DDD6",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 14,
    color: "#344225",
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: "#EEF4F0",
    borderWidth: 1, borderColor: "#D0DDD5",
  },
  chipActive: { backgroundColor: "#344225", borderColor: "#344225" },
  chipText: { fontSize: 13, color: "#4A6040", fontWeight: "500" },
  chipTextActive: { color: "#FFFFFF", fontWeight: "700" },

  dropdownBtn: {
    backgroundColor: "#C8DDD6",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownBtnText: { fontSize: 14, color: "#344225", fontWeight: "500" },
  dropdownBtnPlaceholder: { color: "#8AADA0", fontWeight: "400" },
  dropdownList: {
    backgroundColor: "#EEF4F0",
    borderRadius: 12,
    marginTop: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D0DDD5",
  },
  dropdownListItem: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#D0DDD5",
  },
  dropdownListItemLast: { borderBottomWidth: 0 },
  dropdownListItemActive: { backgroundColor: "#344225" },
  dropdownListItemText: { fontSize: 14, color: "#4A6040", fontWeight: "500" },
  dropdownListItemTextActive: { color: "#FFFFFF", fontWeight: "700" },

  row: { flexDirection: "row" },
  switchRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 16,
  },

  saveBtn: {
    backgroundColor: "#FAD979",
    borderRadius: 14, paddingVertical: 16,
    alignItems: "center", marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#344225" },

  // Addresses
  emptyWrap: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 15, color: "#6B7F75" },

  addrCard: {
    backgroundColor: "#FFFFFF", borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  addrCardTop: { flexDirection: "row", alignItems: "flex-start" },
  addrCardLeft: { flex: 1 },
  addrCategoryRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  addrCategory: { fontSize: 12, fontWeight: "600", color: "#5A7C65" },
  primaryBadge: { backgroundColor: "#344225", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  primaryBadgeText: { fontSize: 10, fontWeight: "700", color: "#FAD979" },
  addrName: { fontSize: 14, fontWeight: "700", color: "#344225", marginBottom: 4 },
  addrLine: { fontSize: 13, color: "#5A7C65", marginBottom: 2 },
  addrSlot: { fontSize: 12, color: "#9DB8AC", marginTop: 4 },
  addrNotes: { fontSize: 12, color: "#6B7F75", marginTop: 4, fontStyle: "italic" },
  addrActions: { gap: 8 },
  addrEditBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#EEF4F0", alignItems: "center", justifyContent: "center",
  },
  addrDeleteBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#FDE8E8", alignItems: "center", justifyContent: "center",
  },

  addAddrBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#FFFFFF", borderRadius: 14,
    paddingVertical: 16, marginTop: 4,
    borderWidth: 1.5, borderColor: "#344225", borderStyle: "dashed",
  },
  addAddrBtnText: { fontSize: 14, fontWeight: "700", color: "#344225" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#D4E8E0",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#344225" },
  modalRow: { flexDirection: "row" },
});
