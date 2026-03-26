/**
 * Users API Service
 * Handles all user-related API calls
 */

import { apiClient } from "../client";
import { API_ENDPOINTS } from "../config";
import type { ApiResponse } from "../types";

export type User = {
  id: number;
  name: string;
  email: string;
  mobile: string | number;
  gender: "male" | "female" | "other";
  height: number;
  weight: number;
  dob: string;
  goal: string;
  activity_level: string;
  has_food_allergies: boolean;
  allergies: string[] | null;
  has_affiliated_code: boolean;
  affiliated_code: string | null;
  otp: number | string;
  roles: Array<{ id: number; title: string }>;
  created_at: string;
  updated_at: string;
};

export type RegisterUserRequest = {
  phone_number: string; // digits only, unique in users.mobile
  otp: number; // 4-6 digits (min 1000, max 999999)
  email: string; // email format, unique
  name: string;
  date_of_birth: string; // Y-m-d format (e.g., 1990-01-15)
  gender: "male" | "female" | "other";
  height: number; // ≥ 0
  weight: number; // ≥ 0
  goal:
    | "eat_healthy"
    | "lose_weight"
    | "gain_weight"
    | "build_muscle"
    | "maintain_weight";
  activity_level:
    | "sedentary"
    | "lightly_active"
    | "moderately_active"
    | "very_active"
    | "highly_active";
  has_food_allergies: boolean;
  allergies: string[] | null; // Required if has_food_allergies=true (min 1), null if has_food_allergies=false
  affiliated_code?: string; // Optional, must exist in affiliated_codes.code (uppercased lookup), max 50
};

export type RegisterUserResponse = {
  success: boolean;
  message: string;
  data: User;
  token?: string; // Added for authentication token
};

export type LoginRequest = {
  mobile: number;
  otp: number | string;
  country_code?: string;
};

export type LoginResponse = {
  data: User;
  token?: string;
  subscriptions?: any[];
  message?: string;
};

export type CheckUserRequest = {
  phone_number: string;
  otp: number | string;
};

export type ActiveSubscription = {
  id: number;
  subscription_plan_id: number;
  subscription_plan_title: string;
  duration_id: number;
  duration_title: string;
  selected_days: string;
  start_date: string;
  end_date: string;
  price: number;
  payment: string;
  status: string;
};

export type CheckUserData = {
  user_id: number;
  name: string;
  email: string;
  mobile: number | string;
  active_subscription?: ActiveSubscription | null;
};

export type CheckUserResponse = {
  success: boolean;
  exists: boolean;
  data: CheckUserData;
  token?: string;
  message: string;
};

/**
 * Register a new user
 * POST /api/register
 * Returns 201 on success, 422 on validation error, 500 on server error
 */
export const registerUser = async (
  userData: RegisterUserRequest,
): Promise<RegisterUserResponse> => {
  try {
    // Build payload according to API specification
    const payload: any = {
      phone_number: userData.phone_number,
      otp: userData.otp,
      email: userData.email,
      name: userData.name,
      date_of_birth: userData.date_of_birth,
      gender: userData.gender,
      height: userData.height,
      weight: userData.weight,
      goal: userData.goal,
      activity_level: userData.activity_level,
      has_food_allergies: userData.has_food_allergies,
      allergies: userData.allergies, // Already set to null or array in finalize-onboarding
    };

    // Add affiliated_code only if provided (optional)
    if (
      userData.affiliated_code &&
      userData.affiliated_code.trim().length > 0
    ) {
      payload.affiliated_code = userData.affiliated_code.trim().toUpperCase();
    }

    console.log(
      "📤 Registration API Request:",
      JSON.stringify(payload, null, 2),
    );
    console.log("📤 Registration API Endpoint:", API_ENDPOINTS.REGISTER);
    console.log("📤 Sending POST request to backend...");

    const response = await apiClient.post<RegisterUserResponse>(
      API_ENDPOINTS.REGISTER,
      payload,
    );

    console.log(
      "📥 Registration API Response received:",
      JSON.stringify(response, null, 2),
    );

    // Validate response structure (201 success)
    if (!response.success || !response.data) {
      throw new Error(response.message || "Registration failed");
    }

    console.log(
      "✅ Registration API Success:",
      JSON.stringify(response, null, 2),
    );
    return response;
  } catch (error: any) {
    console.error("❌ Registration API Error:", error);

    // Handle validation errors (422)
    if (error?.status === 422) {
      const errorData = error?.response || {};
      let errorMessage = errorData.message || "Validation error";

      // Extract validation errors and format them nicely
      if (errorData.errors && typeof errorData.errors === "object") {
        const errorMessages: string[] = [];
        Object.entries(errorData.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            // Format field names to be more user-friendly
            const fieldName =
              field === "phone_number"
                ? "Phone number"
                : field === "affiliated_code"
                  ? "Affiliated code"
                  : field === "email"
                    ? "Email"
                    : field === "name"
                      ? "Name"
                      : field === "date_of_birth"
                        ? "Date of birth"
                        : field === "gender"
                          ? "Gender"
                          : field === "height"
                            ? "Height"
                            : field === "weight"
                              ? "Weight"
                              : field === "goal"
                                ? "Goal"
                                : field === "activity_level"
                                  ? "Activity level"
                                  : field === "allergies"
                                    ? "Allergies"
                                    : field;

            // Join multiple messages for the same field
            const fieldMessage = messages.join(". ");
            errorMessages.push(`${fieldName}: ${fieldMessage}`);
          }
        });
        if (errorMessages.length > 0) {
          // Join with line breaks for better readability in Alert
          errorMessage = errorMessages.join("\n\n");
        }
      }

      // Log the full error response for debugging
      console.error(
        "Full API error response:",
        JSON.stringify(errorData, null, 2),
      );
      console.error("Request payload sent:", JSON.stringify(userData, null, 2));
      console.error("Request was sent to:", `${API_ENDPOINTS.REGISTER}`);

      // Check if this is a "phone number already registered" error - try to update existing user
      const isPhoneAlreadyRegistered =
        errorMessage.toLowerCase().includes("phone number") &&
        (errorMessage.toLowerCase().includes("already registered") ||
          errorMessage.toLowerCase().includes("already exists"));

      if (isPhoneAlreadyRegistered) {
        console.log(
          "⚠️ Phone number already registered - attempting to update existing user...",
        );

        // Try to get user ID from AsyncStorage (should be set during OTP verification)
        try {
          const AsyncStorage =
            require("@react-native-async-storage/async-storage").default;
          const userIdStr = await AsyncStorage.getItem("userId");

          if (userIdStr) {
            const userId = parseInt(userIdStr, 10);
            console.log("📝 Found existing user ID:", userId);
            console.log("📝 Attempting to update user via PUT endpoint...");

            // Prepare update payload (convert registration format to update format)
            const updatePayload: any = {
              name: userData.name,
              email: userData.email,
              mobile: userData.phone_number,
              gender: userData.gender,
              height: userData.height,
              weight: userData.weight,
              dob: userData.date_of_birth,
              goal: userData.goal,
              activity_level: userData.activity_level,
              has_food_allergies: userData.has_food_allergies,
              allergies: userData.allergies || [],
            };

            // Add affiliated_code if provided
            if (
              userData.affiliated_code &&
              userData.affiliated_code.trim().length > 0
            ) {
              updatePayload.affiliated_code = userData.affiliated_code
                .trim()
                .toUpperCase();
            }

            console.log(
              "📤 Update User Payload:",
              JSON.stringify(updatePayload, null, 2),
            );

            // Try to update the existing user
            try {
              const updatedUser = await updateUser(userId, updatePayload);
              console.log(
                "✅ User updated successfully:",
                JSON.stringify(updatedUser, null, 2),
              );

              // Return response in registration format
              const updateResponse: RegisterUserResponse = {
                success: true,
                message: "User profile updated successfully",
                data: {
                  id: updatedUser.id,
                  name: updatedUser.name,
                  email: updatedUser.email,
                  mobile: updatedUser.mobile,
                  gender: updatedUser.gender,
                  height: updatedUser.height,
                  weight: updatedUser.weight,
                  dob: updatedUser.dob,
                  goal: updatedUser.goal,
                  activity_level: updatedUser.activity_level,
                  has_food_allergies: updatedUser.has_food_allergies,
                  allergies: updatedUser.allergies || [],
                  has_affiliated_code: updatedUser.has_affiliated_code || false,
                  affiliated_code: updatedUser.affiliated_code || null,
                  otp: userData.otp,
                  roles: updatedUser.roles || [{ id: 2, title: "user" }],
                  created_at: updatedUser.created_at,
                  updated_at: updatedUser.updated_at,
                },
              };

              console.log("✅ Registration via update completed successfully");
              return updateResponse;
            } catch (updateError: any) {
              console.error("❌ Failed to update existing user:", updateError);
              console.log("⚠️ Falling back to local data storage");
              // Fall through to throw the original error
            }
          } else {
            console.log(
              "⚠️ No user ID found in AsyncStorage - cannot update existing user",
            );
          }
        } catch (storageError) {
          console.error("❌ Error accessing AsyncStorage:", storageError);
        }

        // If update failed or user ID not found, throw error but mark it for graceful handling
        const formattedError = new Error(errorMessage);
        (formattedError as any).isValidationError = true;
        (formattedError as any).isPhoneAlreadyRegistered = true;
        throw formattedError;
      }

      // Create a custom error with formatted message for other validation errors
      const formattedError = new Error(errorMessage);
      (formattedError as any).isValidationError = true;
      (formattedError as any).isInvalidAffiliatedCode =
        errorMessage.toLowerCase().includes("affiliated code") &&
        errorMessage.toLowerCase().includes("invalid");
      throw formattedError;
    }

    // Handle server errors (500)
    if (error?.status === 500) {
      const errorData = error?.response || {};
      const serverMessage =
        errorData.message || errorData.error || "Server error occurred";
      throw new Error(`Server error: ${serverMessage}`);
    }

    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to register user: Unknown error");
  }
};

/**
 * Check if user exists
 */
export const checkUserExists = async (
  checkData: CheckUserRequest,
): Promise<CheckUserResponse> => {
  try {
    const response = await apiClient.post<CheckUserResponse>(
      API_ENDPOINTS.CHECK_USER,
      checkData,
    );

    return response;
  } catch (error) {
    console.error("Error checking user:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to check user: ${error.message}`);
    }
    throw new Error("Failed to check user: Unknown error");
  }
};

/**
 * Create a new user (deprecated - use registerUser instead)
 * @deprecated Use registerUser instead
 */
export const createUser = async (
  userData: RegisterUserRequest,
): Promise<RegisterUserResponse> => {
  return registerUser(userData);
};

/**
 * Login user with phone and OTP
 */
export const loginUser = async (
  loginData: LoginRequest,
): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      API_ENDPOINTS.LOGIN,
      loginData,
    );

    if (!response || !response.data) {
      console.error(
        "Unexpected API response structure for user login:",
        response,
      );
      throw new Error("Invalid response: expected data object for user login");
    }

    return response.data as LoginResponse;
  } catch (error) {
    console.error("Error logging in user:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to login: ${error.message}`);
    }
    throw new Error("Failed to login: Unknown error");
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: number): Promise<User> => {
  try {
    const response = await apiClient.get<ApiResponse<User>>(
      `${API_ENDPOINTS.USERS}/${userId}`,
    );

    if (!response || !response.data) {
      console.error("Unexpected API response structure for user:", response);
      throw new Error("Invalid response: expected data object for user");
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching user:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
    throw new Error("Failed to fetch user: Unknown error");
  }
};

/**
 * Update user
 */
export const updateUser = async (
  userId: number,
  userData: Partial<User>,
): Promise<User> => {
  try {
    const response = await apiClient.put<ApiResponse<User>>(
      `${API_ENDPOINTS.USERS}/${userId}`,
      userData,
    );

    if (!response || !response.data) {
      console.error(
        "Unexpected API response structure for user update:",
        response,
      );
      throw new Error("Invalid response: expected data object for user update");
    }

    return response.data;
  } catch (error) {
    console.error("Error updating user:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
    throw new Error("Failed to update user: Unknown error");
  }
};
