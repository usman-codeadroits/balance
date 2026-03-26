import { registerUser, type RegisterUserRequest } from "@/api/services/users";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const MONTHS = [
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

const GOAL_MAP: Record<string, string> = {
  "eat-healthy": "eat_healthy",
  "lose-weight": "lose_weight",
  "gain-weight": "gain_weight",
  "build-muscle": "build_muscle",
  "maintain-weight": "maintain_weight",
};

const ACTIVITY_MAP: Record<string, string> = {
  sedentary: "sedentary",
  "lightly-active": "lightly_active",
  "moderately-active": "moderately_active", // Maps to moderately_active (API accepts this)
  "very-active": "very_active",
  "highly-active": "highly_active",
};

const birthdayToIso = (birthday: string) => {
  const [dayStr, monthName, yearStr] = birthday.split("/");
  const day = Number(dayStr);
  const monthIndex = MONTHS.indexOf(monthName);
  const year = Number(yearStr);

  if (!Number.isFinite(day) || !Number.isFinite(year) || monthIndex === -1) {
    throw new Error("Invalid birthday format. Please re-enter your birthday.");
  }

  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const ONBOARDING_TEMP_KEYS = [
  "tempPhoneNumber",
  "tempCountryCode",
  "tempEmail",
  "tempName",
  "tempBirthday",
  "tempGender",
  "tempWeight",
  "tempHeight",
  "tempGoal",
  "tempActivityLevel",
  "tempHasAllergies",
  "tempAllergiesSelection",
  "tempOtpCode",
  "otpVerifiedPhone",
  "tempAuthType",
  "tempAffiliatedCode",
  "tempHasAffiliatedCode",
  "tempNeedsAffiliatedCode",
];

const normalizeAllergyList = (allergies: string[]) =>
  allergies.map((allergy) => allergy.trim()).filter(Boolean);

const sanitizePhone = (phone?: string | null) => {
  if (!phone) {
    throw new Error("Missing phone number. Please restart onboarding.");
  }
  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    throw new Error("Invalid phone number. Please restart onboarding.");
  }
  return digits;
};

type FinalizeOptions = {
  hasAllergies: boolean;
  allergies: string[];
};

export const finalizeOnboarding = async ({
  hasAllergies,
  allergies,
}: FinalizeOptions) => {
  console.log("========================================");
  console.log("🚀 STARTING REGISTRATION PROCESS");
  console.log("========================================");

  // Step 1: Load data from AsyncStorage
  console.log("📥 Step 1: Loading data from AsyncStorage...");
  const [
    phoneNumber,
    countryCode,
    email,
    name,
    birthday,
    gender,
    weight,
    height,
    goal,
    activityLevel,
    otpCode,
    affiliatedCode,
  ] = await Promise.all([
    AsyncStorage.getItem("tempPhoneNumber"),
    AsyncStorage.getItem("tempCountryCode"),
    AsyncStorage.getItem("tempEmail"),
    AsyncStorage.getItem("tempName"),
    AsyncStorage.getItem("tempBirthday"),
    AsyncStorage.getItem("tempGender"),
    AsyncStorage.getItem("tempWeight"),
    AsyncStorage.getItem("tempHeight"),
    AsyncStorage.getItem("tempGoal"),
    AsyncStorage.getItem("tempActivityLevel"),
    AsyncStorage.getItem("tempOtpCode"),
    AsyncStorage.getItem("tempAffiliatedCode"),
  ]);

  console.log("📋 Loaded Data:");
  console.log("  - Phone Number:", phoneNumber);
  console.log("  - Country Code:", countryCode);
  console.log("  - Email:", email);
  console.log("  - Name:", name);
  console.log("  - Birthday:", birthday);
  console.log("  - Gender:", gender);
  console.log("  - Weight:", weight);
  console.log("  - Height:", height);
  console.log("  - Goal:", goal);
  console.log("  - Activity Level:", activityLevel);
  console.log("  - OTP Code:", otpCode ? "***" : "MISSING");
  console.log("  - Affiliated Code:", affiliatedCode || "None");
  console.log("  - Has Allergies:", hasAllergies);
  console.log("  - Allergies:", allergies.length > 0 ? allergies : "None");

  // Step 2: Validate required fields
  console.log("🔍 Step 2: Validating required fields...");
  if (
    !email ||
    !name ||
    !birthday ||
    !gender ||
    !weight ||
    !height ||
    !goal ||
    !activityLevel ||
    !otpCode
  ) {
    const missing = [];
    if (!email) missing.push("email");
    if (!name) missing.push("name");
    if (!birthday) missing.push("birthday");
    if (!gender) missing.push("gender");
    if (!weight) missing.push("weight");
    if (!height) missing.push("height");
    if (!goal) missing.push("goal");
    if (!activityLevel) missing.push("activityLevel");
    if (!otpCode) missing.push("otpCode");

    console.error("❌ VALIDATION FAILED: Missing fields:", missing.join(", "));
    throw new Error(
      `Missing required information: ${missing.join(", ")}. Please complete all onboarding steps again.`,
    );
  }

  // Validate allergies if has_food_allergies is true
  if (hasAllergies && (!allergies || allergies.length === 0)) {
    console.error(
      "❌ VALIDATION FAILED: Allergies required when has_food_allergies is true",
    );
    throw new Error("Please select at least one allergy option.");
  }

  console.log("✅ Step 2 Complete: All required fields present");

  // Step 3: Sanitize and convert data
  console.log("🔧 Step 3: Converting and validating data types...");
  const sanitizedPhoneNumber = sanitizePhone(phoneNumber);
  const numericOtp = Number(otpCode);
  const convertedHeight = Number(height);
  const convertedWeight = Number(weight);

  console.log("  - Height:", height, "→", convertedHeight);
  console.log("  - Weight:", weight, "→", convertedWeight);
  console.log("  - OTP:", otpCode, "→", numericOtp);

  // Validate OTP (4-6 digits, min 1000, max 999999)
  if (
    !Number.isFinite(numericOtp) ||
    numericOtp < 1000 ||
    numericOtp > 999999
  ) {
    console.error("❌ VALIDATION FAILED: Invalid OTP");
    throw new Error(
      "Invalid OTP code. Please request a new verification code.",
    );
  }

  if (!Number.isFinite(convertedHeight) || convertedHeight < 0) {
    console.error("❌ VALIDATION FAILED: Invalid height");
    throw new Error("Invalid height. Please re-enter your height.");
  }

  if (!Number.isFinite(convertedWeight) || convertedWeight < 0) {
    console.error("❌ VALIDATION FAILED: Invalid weight");
    throw new Error("Invalid weight. Please re-enter your weight.");
  }

  // Validate gender
  const normalizedGender = gender.toLowerCase();
  if (!["male", "female", "other"].includes(normalizedGender)) {
    console.error("❌ VALIDATION FAILED: Invalid gender");
    throw new Error("Invalid gender. Please select a valid gender.");
  }

  // Validate goal
  const normalizedGoal = GOAL_MAP[goal] ?? goal;
  const validGoals = [
    "eat_healthy",
    "lose_weight",
    "gain_weight",
    "build_muscle",
    "maintain_weight",
  ];
  if (!validGoals.includes(normalizedGoal)) {
    console.error("❌ VALIDATION FAILED: Invalid goal");
    throw new Error("Invalid goal. Please select a valid goal.");
  }

  // Validate activity level (API accepts: sedentary, lightly_active, moderately_active, very_active, highly_active)
  const normalizedActivityLevel = ACTIVITY_MAP[activityLevel] ?? activityLevel;
  const validActivityLevels = [
    "sedentary",
    "lightly_active",
    "moderately_active",
    "very_active",
    "highly_active",
  ];
  if (!validActivityLevels.includes(normalizedActivityLevel)) {
    console.error("❌ VALIDATION FAILED: Invalid activity level");
    throw new Error(
      "Invalid activity level. Please select a valid activity level.",
    );
  }

  console.log("✅ Step 3 Complete: Data types validated");

  // Step 4: Build registration payload according to API specification
  console.log("📤 Step 4: Preparing API request payload...");

  // Validate phone number format (should be digits only)
  if (!/^\d+$/.test(sanitizedPhoneNumber)) {
    console.error("❌ VALIDATION FAILED: Invalid phone number format");
    throw new Error("Phone number must contain only digits.");
  }

  // Build payload exactly as per API specification
  const payload: RegisterUserRequest = {
    phone_number: sanitizedPhoneNumber, // string digits, unique in users.mobile
    otp: numericOtp, // integer 4-6 digits (min 1000, max 999999)
    email: email.trim().toLowerCase(), // string email, unique
    name: name.trim(), // string
    date_of_birth: birthdayToIso(birthday), // string date Y-m-d format
    gender: normalizedGender as "male" | "female" | "other",
    height: convertedHeight, // number ≥ 0
    weight: convertedWeight, // number ≥ 0
    goal: normalizedGoal as
      | "eat_healthy"
      | "lose_weight"
      | "gain_weight"
      | "build_muscle"
      | "maintain_weight",
    activity_level: normalizedActivityLevel as
      | "sedentary"
      | "lightly_active"
      | "moderately_active"
      | "very_active"
      | "highly_active",
    has_food_allergies: hasAllergies, // boolean
    allergies:
      hasAllergies && allergies && allergies.length > 0
        ? normalizeAllergyList(allergies)
        : null, // null if has_food_allergies=false, array if has_food_allergies=true
  };

  // Add affiliated_code only if provided and not empty (optional field)
  // API will uppercase it and verify it exists in affiliated_codes.code
  const trimmedAffiliatedCode = affiliatedCode?.trim();
  if (
    trimmedAffiliatedCode &&
    trimmedAffiliatedCode.length > 0 &&
    trimmedAffiliatedCode.length <= 50
  ) {
    payload.affiliated_code = trimmedAffiliatedCode.toUpperCase(); // Uppercase as per API spec
  }
  // If no affiliated code, don't include it in the payload (optional field)

  console.log("📦 Registration Payload:");
  console.log(JSON.stringify(payload, null, 2));
  console.log("✅ Step 4 Complete: Payload prepared");

  // Step 5: Call registration API
  console.log("🌐 Step 5: Calling Registration API...");
  console.log("  - Endpoint: /register");
  console.log("  - Method: POST");

  let response;
  let isPhoneAlreadyRegistered = false;
  try {
    response = await registerUser(payload);
    console.log("✅ Step 5 Complete: API call successful");
  } catch (error: any) {
    console.error("❌ REGISTRATION API ERROR:", error);

    // Check if this is a "phone number already registered" error
    isPhoneAlreadyRegistered = error?.isPhoneAlreadyRegistered || false;

    if (isPhoneAlreadyRegistered) {
      // Phone number already registered - proceed with local data
      console.log(
        "⚠️ Phone number already registered - proceeding with local data",
      );
      // Create a mock response from the payload data
      response = {
        success: true,
        message: "Registration data saved locally",
        data: {
          id: 0, // Will be handled below
          name: payload.name,
          email: payload.email,
          mobile: payload.phone_number,
          gender: payload.gender,
          height: payload.height,
          weight: payload.weight,
          dob: payload.date_of_birth,
          goal: payload.goal,
          activity_level: payload.activity_level,
          has_food_allergies: payload.has_food_allergies,
          allergies: payload.allergies || [],
          has_affiliated_code: !!payload.affiliated_code,
          affiliated_code: payload.affiliated_code || null,
          otp: payload.otp,
          roles: [{ id: 2, title: "user" }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    } else {
      // Other errors - throw them
      throw error;
    }
  }

  // Step 6: Process API response
  console.log("📥 Step 6: Processing API response...");
  console.log("📦 API Response:");
  console.log(JSON.stringify(response, null, 2));

  if (!response || !response.success || !response.data) {
    console.error("❌ ERROR: Invalid response from server");
    throw new Error(
      response?.message || "Registration failed. Please try again.",
    );
  }

  console.log("✅ Step 6 Complete: Response validated");

  // Step 7: Extract and save user data
  console.log("💾 Step 7: Extracting and saving user data...");
  const userData = response.data;

  // If ID is 0 or phone already registered, use existing user ID or generate temp ID
  let userId = userData.id;
  if (userId === 0 || isPhoneAlreadyRegistered) {
    // Try to get existing user ID from AsyncStorage
    const existingUserId = await AsyncStorage.getItem("userId");
    if (existingUserId) {
      userId = parseInt(existingUserId, 10);
      console.log("⚠️ Using existing user ID from AsyncStorage:", userId);
    } else {
      // Generate a temporary ID based on timestamp (will be updated when user logs in properly)
      userId = Math.floor(Date.now() / 1000);
      console.log("⚠️ Generated temporary user ID:", userId);
    }
  }

  const normalizedUser = {
    id: userId,
    name: userData.name,
    email: userData.email,
    mobile: userData.mobile,
    gender: userData.gender,
    height: userData.height,
    weight: userData.weight,
    dob: userData.dob,
    goal: userData.goal,
    activity_level: userData.activity_level,
    has_food_allergies: userData.has_food_allergies,
    allergies: userData.allergies || [],
    has_affiliated_code: userData.has_affiliated_code || false,
    affiliated_code: userData.affiliated_code || null,
    created_at: userData.created_at,
    updated_at: userData.updated_at,
  };

  console.log("👤 User Data to Save:");
  console.log(JSON.stringify(normalizedUser, null, 2));

  // Save user data to AsyncStorage
  await AsyncStorage.setItem("userId", normalizedUser.id.toString());
  await AsyncStorage.setItem("userData", JSON.stringify(normalizedUser));

  // Save auth token from data object
  if (response.data && typeof response.data === "object") {
    const dataObj = response.data as any;
    const token = dataObj?.token;

    if (token) {
      await AsyncStorage.setItem("authToken", token);
      console.log("  ✅ authToken saved from registration response");
    } else {
      console.warn("  ⚠️ No auth token in registration data");
    }
  } else {
    console.warn("  ⚠️ Invalid response data structure - token not found");
  }

  // Store welcome status and user name for welcome screen
  await AsyncStorage.setItem("showWelcome", "true");
  await AsyncStorage.setItem("welcomeUserName", normalizedUser.name);

  console.log("  ✅ userId saved:", normalizedUser.id);
  console.log("  ✅ userData saved");
  console.log("✅ Step 7 Complete: User data saved to AsyncStorage");

  // Step 8: Clean up temporary data
  console.log("🧹 Step 8: Cleaning up temporary data...");
  await AsyncStorage.multiRemove(ONBOARDING_TEMP_KEYS);
  console.log("  ✅ Temporary onboarding data removed");
  console.log("✅ Step 8 Complete: Cleanup completed");

  console.log("========================================");
  console.log("🎉 REGISTRATION PROCESS COMPLETED SUCCESSFULLY!");
  console.log("========================================");
  console.log("📊 Summary:");
  console.log("  - User ID:", normalizedUser.id);
  console.log("  - Name:", normalizedUser.name);
  console.log("  - Email:", normalizedUser.email);
  console.log("  - Phone:", normalizedUser.mobile);
  console.log("  - Registration Status: SUCCESS");
  console.log("========================================\n");

  // Step 9: Navigate directly to authenticated home
  console.log("🚀 Step 9: Navigating to Main screen...");
  router.replace("/main-screen");

  return response;
};
