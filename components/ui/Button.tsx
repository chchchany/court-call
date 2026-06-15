import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'cta' | 'kakao' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: Colors.green900, text: Colors.white },
  secondary: { bg: Colors.white, text: Colors.green900, border: Colors.green900 },
  cta: { bg: Colors.lime, text: Colors.green900 },
  kakao: { bg: Colors.kakaoYellow, text: '#3A1D00' },
  danger: { bg: Colors.danger, text: Colors.white },
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  fullWidth = true,
}: ButtonProps) {
  const vs = variantStyles[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.base,
        { backgroundColor: disabled ? Colors.gray100 : vs.bg },
        vs.border && { borderWidth: 1, borderColor: vs.border },
        fullWidth && { width: '100%' },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={disabled ? Colors.gray500 : vs.text} />
      ) : (
        <Text
          style={[
            styles.label,
            { color: disabled ? Colors.gray500 : vs.text },
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.button,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  label: {
    fontSize: FontSize.body1,
    fontWeight: FontWeight.semibold,
  },
});
