import { Text, TextProps } from 'react-native';
import { fonts } from '../theme';

type Weight = keyof typeof fonts;

interface Props extends TextProps {
  weight?: Weight;
}

// Text wrapper that applies the Manrope family for the requested weight.
// Named static weights are used, so `weight` picks the family (fontWeight in
// `style` is ignored for these families — set weight via this prop instead).
export function AppText({ weight = 'regular', style, ...rest }: Props) {
  return <Text {...rest} style={[{ fontFamily: fonts[weight] }, style]} />;
}
