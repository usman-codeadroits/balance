import { registerUser, type RegisterUserRequest } from "@/api/services/users";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Alert } from "react-native";

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
  // New format: YYYY-MM-DD stored directly (locale-safe)
  if (/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return birthday;

  // Legacy format: DD/MonthName/YYYY (English month names only)
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
  const [
    phoneNumber,
    countryCode,
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

  // Step 2: Validate required fields
  if (
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
    if (!name) missing.push("name");
    if (!birthday) missing.push("birthday");
    if (!gender) missing.push("gender");
    if (!weight) missing.push("weight");
    if (!height) missing.push("height");
    if (!goal) missing.push("goal");
    if (!activityLevel) missing.push("activityLevel");
    if (!otpCode) missing.push("otpCode");
    throw new Error(
      `Missing required information: ${missing.join(", ")}. Please complete all onboarding steps again.`,
    );
  }

  // Validate allergies if has_food_allergies is true
  if (hasAllergies && (!allergies || allergies.length === 0)) {
    Alert.alert("Please select at least one allergy option.");
    return;
  }

  // Step 3: Sanitize and convert data
  const sanitizedPhoneNumber = sanitizePhone(phoneNumber);
  const numericOtp = Number(otpCode);
  const convertedHeight = Number(height);
  const convertedWeight = Number(weight);

  // Validate OTP (4-6 digits, min 1000, max 999999)
  if (
    !Number.isFinite(numericOtp) ||
    numericOtp < 1000 ||
    numericOtp > 999999
  ) {
    throw new Error(
      "Invalid OTP code. Please request a new verification code.",
    );
  }

  if (!Number.isFinite(convertedHeight) || convertedHeight < 0) {
    throw new Error("Invalid height. Please re-enter your height.");
  }

  if (!Number.isFinite(convertedWeight) || convertedWeight < 0) {
    throw new Error("Invalid weight. Please re-enter your weight.");
  }

  // Validate gender
  const normalizedGender = gender.toLowerCase();
  if (!["male", "female", "other"].includes(normalizedGender)) {
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
    throw new Error(
      "Invalid activity level. Please select a valid activity level.",
    );
  }

  // Step 4: Build registration payload according to API specification
  // Validate phone number format (should be digits only)
  if (!/^\d+$/.test(sanitizedPhoneNumber)) {
    throw new Error("Phone number must contain only digits.");
  }

  // Build payload exactly as per API specification
  const payload: RegisterUserRequest = {
    phone_number: sanitizedPhoneNumber, // string digits, unique in users.mobile
    otp: numericOtp, // integer 4-6 digits (min 1000, max 999999)
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

  // Step 5: Call registration API
  let response;
  let isPhoneAlreadyRegistered = false;
  try {
    response = await registerUser(payload);
  } catch (error: any) {
    // Check if this is a "phone number already registered" error
    isPhoneAlreadyRegistered = error?.isPhoneAlreadyRegistered || false;

    if (isPhoneAlreadyRegistered) {
      // Phone number already registered - proceed with local data
      // Create a mock response from the payload data
      response = {
        success: true,
        message: "Registration data saved locally",
        data: {
          id: 0, // Will be handled below
          name: payload.name,
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
  if (!response || !response.success || !response.data) {
    throw new Error(
      response?.message || "Registration failed. Please try again.",
    );
  }

  // Step 7: Extract and save user data
  const responseData = response.data as any;
  const userData = responseData?.user ?? responseData;

  // If ID is 0 or phone already registered, use existing user ID or generate temp ID
  let userId =
    typeof userData.id === "number"
      ? userData.id
      : Number.parseInt(String(userData.id ?? ""), 10);

  if (!Number.isFinite(userId) || userId <= 0 || isPhoneAlreadyRegistered) {
    // Try to get existing user ID from AsyncStorage
    const existingUserId = await AsyncStorage.getItem("userId");
    if (existingUserId) {
      const parsedExistingUserId = Number.parseInt(existingUserId, 10);
      if (Number.isFinite(parsedExistingUserId) && parsedExistingUserId > 0) {
        userId = parsedExistingUserId;
      }
    }

    if (!Number.isFinite(userId) || userId <= 0) {
      // Generate a temporary ID based on timestamp (will be updated when user logs in properly)
      userId = Math.floor(Date.now() / 1000);
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

  // Save user data to AsyncStorage
  await AsyncStorage.setItem("userId", normalizedUser.id.toString());
  await AsyncStorage.setItem("userData", JSON.stringify(normalizedUser));

  // Save auth token from data object
  if (responseData && typeof responseData === "object") {
    const token = responseData?.token || response?.token;

    if (token) {
      await AsyncStorage.setItem("authToken", token);
    }
  }

  // Store welcome status and user name for welcome screen
  await AsyncStorage.setItem("showWelcome", "true");
  if (normalizedUser.name) {
    await AsyncStorage.setItem("welcomeUserName", normalizedUser.name);
  } else {
    await AsyncStorage.removeItem("welcomeUserName");
  }

  // Step 8: Clean up temporary data
  await AsyncStorage.multiRemove(ONBOARDING_TEMP_KEYS);

  // Step 9: Navigate directly to authenticated home
  router.replace("/main-screen");

  return response;
};
