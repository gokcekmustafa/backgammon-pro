import type { Viewport, DeviceType, SafeArea, SafeAreaInsets } from './types';
import { getDeviceType } from './calculateScale';

const DEVICE_INSETS: Record<DeviceType, SafeAreaInsets> = {
  desktop: { top: 0, right: 0, bottom: 0, left: 0 },
  laptop: { top: 0, right: 0, bottom: 0, left: 0 },
  tablet: { top: 20, right: 0, bottom: 20, left: 0 },
  mobile: { top: 44, right: 0, bottom: 34, left: 0 },
};

export function getSafeAreaInsets(viewport: Viewport, deviceType?: DeviceType): SafeAreaInsets {
  const resolved = deviceType ?? getDeviceType(viewport);
  return { ...DEVICE_INSETS[resolved] };
}

export function calculateSafeArea(viewport: Viewport, deviceType?: DeviceType): SafeArea {
  const insets = getSafeAreaInsets(viewport, deviceType);

  return {
    insets,
    availableWidth: viewport.width - insets.left - insets.right,
    availableHeight: viewport.height - insets.top - insets.bottom,
  };
}
