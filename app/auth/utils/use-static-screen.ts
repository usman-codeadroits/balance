import { useFocusEffect, useNavigation } from "expo-router";
import { useCallback } from "react";
import { BackHandler } from "react-native";

// Disables gesture and hardware back navigation; callers should still provide explicit back buttons if desired.
export const useStaticScreen = () => {
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions?.({ gestureEnabled: false });
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true,
      );
      return () => backHandler.remove();
    }, [navigation]),
  );
};
