// src/components/ScalePressable.tsx
import { type ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

export function ScalePressable({
  children,
  onPress,
  disabled,
  pressedScale = 0.96,
  style,
  className,
  innerClassName,
  hitSlop,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  pressedScale?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
  innerClassName?: string;
  hitSlop?: number;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]} className={className}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        hitSlop={hitSlop}
        className={innerClassName}
        onPressIn={() => {
          if (!disabled) {
            scale.value = withSpring(pressedScale, { damping: 18, stiffness: 260 });
          }
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 260 });
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}