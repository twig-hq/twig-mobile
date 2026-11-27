import {
  Canvas,
  Circle,
  ColorMatrix,
  DashPathEffect,
  DisplacementMap,
  FractalNoise,
  Group,
  Oval,
  Paint,
  Path,
  Rect,
  Skia,
  type SkPath,
} from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { View } from 'react-native';

import { palette, useTheme } from '@/theme';

import { BLOB, EXTRA_PIECES, HAT_BAND, PEN, VIEW, ridges, type Extra } from './drawing';

type Props = {
  /** The print's colour, from `birdColors`. */
  color: string;
  /** The print pattern. Kept on the account, so it never changes. */
  seed: number;
  extra?: Extra;
  /** Width in points; the height follows (140:120). */
  size: number;
  /** Faces right instead of left. */
  flipped?: boolean;
  /** Only the print, with no face, wing, tail or legs: the moment before it becomes a bird. */
  bare?: boolean;
  /** What screen readers say. Leave it out when the bird is decoration next to a name. */
  accessibilityLabel?: string;
};

// built on first use: in the browser, Skia only exists once it has loaded
let blobPath: SkPath | null = null;
const blob = () => (blobPath ??= Skia.Path.MakeFromSVGString(BLOB)!);

// The print's ink: the shapes wobble a little (displacement by fractal noise)
// and pick up specks where the ink did not take, as on the canvas.
const PRINT_WOBBLE = { freq: 0.05, octaves: 2, seed: 4, scale: 4.5 };
const PEN_WOBBLE = { freq: 0.05, octaves: 2, seed: 11, scale: 3 };
const SPECKS = { freq: 0.9, seed: 8 };
// alpha = 2.3 - 3.2 x noise: most of the print stays, the darkest noise shows paper
const SPECK_MATRIX = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -3.2, 2.3];

function Wobble({ freq, octaves, seed, scale }: typeof PRINT_WOBBLE) {
  return (
    <Paint>
      <DisplacementMap channelX="r" channelY="g" scale={scale}>
        <FractalNoise freqX={freq} freqY={freq} octaves={octaves} seed={seed} />
      </DisplacementMap>
    </Paint>
  );
}

/** A person's thumbprint bird. Drawn live, so any colour, pattern and size is sharp. */
export const Bird = memo(function Bird({
  color,
  seed,
  extra = 'none',
  size,
  flipped = false,
  bare = false,
  accessibilityLabel,
}: Props) {
  // pen lines are ink on cream, and cream on the dark background
  const ink = useTheme().colors.pen;
  const k = size / VIEW.width;
  const height = VIEW.height * k;
  const lines = useMemo(() => ridges(seed), [seed]);
  const pen = {
    color: ink,
    style: 'stroke',
    strokeWidth: 2.3,
    strokeCap: 'round',
    strokeJoin: 'round',
  } as const;

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      style={{ width: size, height }}
    >
      <Canvas style={{ width: size, height }} pointerEvents="none">
        <Group transform={[{ scale: k }, ...(flipped ? [{ translateX: VIEW.width }, { scaleX: -1 }] : [])]}>
          {/* the print: specks cut out of the wobbled ridges */}
          <Group layer>
            <Group layer={<Wobble {...PRINT_WOBBLE} />}>
              <Path path={blob()} color={color} opacity={0.2} />
              <Group clip={blob()}>
                {lines.map((r, i) => (
                  <Group
                    key={i}
                    origin={{ x: r.cx, y: r.cy }}
                    transform={[{ rotate: (r.rotate * Math.PI) / 180 }]}
                  >
                    <Oval
                      x={r.cx - r.rx}
                      y={r.cy - r.ry}
                      width={r.rx * 2}
                      height={r.ry * 2}
                      color={color}
                      style="stroke"
                      strokeWidth={2.5}
                      strokeCap="round"
                    >
                      <DashPathEffect intervals={r.dashes} phase={r.phase} />
                    </Oval>
                  </Group>
                ))}
              </Group>
            </Group>
            <Rect x={0} y={0} width={VIEW.width} height={VIEW.height} blendMode="dstIn">
              <FractalNoise freqX={SPECKS.freq} freqY={SPECKS.freq} octaves={1} seed={SPECKS.seed} />
              <ColorMatrix matrix={SPECK_MATRIX} />
            </Rect>
          </Group>

          {!bare && (
            <Group layer={<Wobble {...PEN_WOBBLE} />}>
              <Path path={PEN.beak} color={palette.orange} />
              <Path path={PEN.beak} {...pen} />
              <Circle cx={PEN.eye.cx} cy={PEN.eye.cy} r={PEN.eye.r} color={ink} />
              <Path path={PEN.wing} {...pen} />
              <Path path={PEN.tail} {...pen} />
              <Path path={PEN.legs} {...pen} />
              {EXTRA_PIECES[extra].map((p, i) =>
                p.kind === 'line' ? (
                  <Path
                    key={i}
                    path={p.d}
                    {...pen}
                    strokeWidth={p.width ?? 2.3}
                    color={extra === 'hat' && p.width === 4 ? HAT_BAND : ink}
                  />
                ) : p.kind === 'fill' ? (
                  <Group key={i}>
                    <Path path={p.d} color={p.fill} />
                    <Path path={p.d} {...pen} strokeWidth={p.width ?? 2.3} />
                  </Group>
                ) : (
                  <Group key={i}>
                    {p.fill !== 'transparent' && <Circle cx={p.cx} cy={p.cy} r={p.r} color={p.fill} />}
                    <Circle cx={p.cx} cy={p.cy} r={p.r} {...pen} strokeWidth={p.width ?? 2.3} />
                  </Group>
                ),
              )}
            </Group>
          )}
        </Group>
      </Canvas>
    </View>
  );
});
