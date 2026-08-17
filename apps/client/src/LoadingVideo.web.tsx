import React from 'react';

export function LoadingVideo({ style }: { style?: object }) {
  const source = require('../assets/splash/loading-background.mp4') as string;
  return React.createElement('video', {
    autoPlay: true,
    loop: true,
    muted: false,
    volume: 1,
    playsInline: true,
    src: source,
    style: { ...style, objectFit: 'cover' },
  });
}
