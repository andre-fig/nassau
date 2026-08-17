import { ResizeMode, Video } from 'expo-av';
import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

export function LoadingVideo({ style }: { style?: StyleProp<ViewStyle> }) {
  return <Video source={require('../assets/splash/loading-background.mp4')} style={style} resizeMode={ResizeMode.COVER} shouldPlay isLooping isMuted={false} volume={1} />;
}
