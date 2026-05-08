import React from 'react';
import { Platform, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

function toPascalCase(name: string) {
  return name
    .split(/[-_ ]+/)
    .map((s) => (s.length ? s.charAt(0).toUpperCase() + s.slice(1) : ''))
    .join('');
}

type IconProps = {
  name: string;
  size?: number;
  color?: string;
  style?: any;
};

const Icon: React.FC<IconProps> = ({ name, size = 18, color = '#000', style }) => {
  if (Platform.OS === 'web') {
    // require lazily to avoid bundling/react-native runtime issues on native
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const LucideIcons = require('lucide-react');
    const compName = toPascalCase(name);
    const IconComp = (LucideIcons as any)[compName] || (LucideIcons as any)[name];
    if (IconComp) return <IconComp color={color} size={size} style={style} />;
    return <View style={[{ width: size, height: size, backgroundColor: color, borderRadius: size / 2 }, style]} />;
  }

  // Native: use simple SVG strings mapped in a helper file and inject color/size
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nativeIcons = require('./icon/nativeIcons').default as Record<string, string>;
  const tpl = nativeIcons[name] || nativeIcons[toPascalCase(name)] || '';
  if (!tpl) return <View style={[{ width: size, height: size }, style]} />;
  const xml = tpl.replace(/\{color\}/g, color || '#000').replace(/\{size\}/g, String(size));
  return <SvgXml xml={xml} width={size} height={size} style={style} />;
};

export default Icon;
