import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkUserExists, createUser } from '@/api/services/users';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const GOAL_MAP: Record<string, string> = {
  'eat-healthy': 'eat_healthy',
  'lose-weight': 'lose_weight',
  'gain-weight': 'gain_weight',
  'build-muscle': 'build_muscle',
  'maintain-weight': 'maintain_weight',
};

const ACTIVITY_MAP: Record<string, string> = {
  'sedentary': 'sedentary',
  'lightly-active': 'lightly_active',
  'very-active': 'very_active',
  'highly-active': 'highly_active',
};

const birthdayToIso = (birthday: string) => {
  const [dayStr, monthName, yearStr] = birthday.split('/');
  const day = Number(dayStr);
  const monthIndex = MONTHS.indexOf(monthName);
  const year = Number(yearStr);

  if (!Number.isFinite(day) || !Number.isFinite(year) || monthIndex === -1) {
    throw new Error('Invalid birthday format. Please re-enter your birthday.');
  }

  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const ONBOARDING_TEMP_KEYS = [
  'tempPhoneNumber',
  'tempCountryCode',
  'tempEmail',
  'tempName',
  'tempBirthday',
  'tempGender',
  'tempWeight',
  'tempHeight',
  'tempGoal',
  'tempActivityLevel',
  'tempHasAllergies',
  'tempAllergiesSelection',
  'tempOtpCode',
  'otpVerifiedPhone',
  'tempAuthType',
];

const normalizeAllergyList = (allergies: string[]) =>
  allergies.map(allergy => allergy.trim().toLowerCase()).filter(Boolean);

const sanitizePhone = (phone?: string | null) => {
  if (!phone) {
    throw new Error('Missing phone number. Please restart onboarding.');
  }
  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    throw new Error('Invalid phone number. Please restart onboarding.');
  }
  return digits;
};

type FinalizeOptions = {
  hasAllergies: boolean;
  allergies: string[];
};

export const finalizeOnboarding = async ({ hasAllergies, allergies }: FinalizeOptions) => {
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
  ] = await Promise.all([
    AsyncStorage.getItem('tempPhoneNumber'),
    AsyncStorage.getItem('tempCountryCode'),
    AsyncStorage.getItem('tempEmail'),
    AsyncStorage.getItem('tempName'),
    AsyncStorage.getItem('tempBirthday'),
    AsyncStorage.getItem('tempGender'),
    AsyncStorage.getItem('tempWeight'),
    AsyncStorage.getItem('tempHeight'),
    AsyncStorage.getItem('tempGoal'),
    AsyncStorage.getItem('tempActivityLevel'),
    AsyncStorage.getItem('tempOtpCode'),
  ]);

  const sanitizedPhoneNumber = sanitizePhone(phoneNumber);
  const numericOtp = Number(otpCode);

  if (!email || !name || !birthday || !gender || !weight || !height || !goal || !activityLevel || !otpCode) {
    throw new Error('Missing required information. Please complete all onboarding steps again.');
  }

  // If backend already has this user, treat as existing and skip creation
  try {
    const existingCheck = await checkUserExists({
      phone_number: sanitizedPhoneNumber,
      otp: numericOtp,
    });

    if (existingCheck?.exists && existingCheck.data) {
      const normalizedUser = {
        id: existingCheck.data.user_id,
        name: existingCheck.data.name,
        email: existingCheck.data.email,
        mobile: existingCheck.data.mobile,
      };
      await AsyncStorage.setItem('userId', normalizedUser.id.toString());
      await AsyncStorage.setItem('userData', JSON.stringify(normalizedUser));

      if (existingCheck.token) {
        await AsyncStorage.setItem('authToken', existingCheck.token);
      }

      await AsyncStorage.removeItem('activeSubscription');

      await AsyncStorage.multiRemove(ONBOARDING_TEMP_KEYS);
      return existingCheck;
    }
  } catch (error) {
    console.warn('checkUserExists failed, continuing with user creation:', error);
  }

  const payload = {
    phone_number: sanitizedPhoneNumber,
    country_code: countryCode ? countryCode.replace(/\D/g, '') : '',
    otp: numericOtp,
    email,
    name,
    date_of_birth: birthdayToIso(birthday),
    gender,
    height: Number(height),
    weight: Number(weight),
    goal: GOAL_MAP[goal] ?? goal,
    activity_level: ACTIVITY_MAP[activityLevel] ?? activityLevel,
    has_food_allergies: hasAllergies,
    allergies: hasAllergies ? normalizeAllergyList(allergies) : [],
  };

  if (!Number.isFinite(payload.otp)) {
    throw new Error('Invalid OTP detected. Please request a new verification code.');
  }

  const response = await createUser(payload);

  if (response?.data) {
    await AsyncStorage.setItem('userId', response.data.id.toString());
    await AsyncStorage.setItem('userData', JSON.stringify(response.data));
  }

  if (response?.token) {
    await AsyncStorage.setItem('authToken', response.token);
  }

  await AsyncStorage.multiRemove(ONBOARDING_TEMP_KEYS);

  return response;
};

