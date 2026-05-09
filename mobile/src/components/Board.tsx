import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SIZE, type TileValue } from '../constants';
import type { Theme } from '../theme';
import { Tile } from './Tile';

interface Props {
  grid: TileValue[][];
  theme: Theme;
  onTap: (r: number, c: number) => void;
  /** Per-cell increment that signals a merge pulse. */
  mergePulses: number[][];
  /** Per-cell increment that signals a spawn pop. */
  spawnKeys: number[][];
  /** When set, this cell is the actively merging "anchor" — bumped by chain. */
  onLayout?: (x: number, y: number, w: number, h: number) => void;
}

export const Board: React.FC<Props> = ({ grid, theme, onTap, mergePulses, spawnKeys, onLayout }) => {
  return (
    <View
      style={styles.board}
      onLayout={(e) => {
        if (onLayout) {
          const { x, y, width, height } = e.nativeEvent.layout;
          onLayout(x, y, width, height);
        }
      }}
    >
      {Array.from({ length: SIZE }).map((_, r) => (
        <View key={'row-' + r} style={styles.row}>
          {Array.from({ length: SIZE }).map((__, c) => {
            const v = grid[r][c];
            return (
              <Pressable
                key={'cell-' + r + '-' + c}
                style={[
                  styles.cell,
                  { backgroundColor: theme.cell, borderColor: theme.cellBorder },
                ]}
                onPress={() => onTap(r, c)}
                disabled={v !== 0}
              >
                {v !== 0 && (
                  <Tile
                    value={v}
                    theme={theme}
                    mergePulseKey={mergePulses[r][c]}
                    spawnKey={spawnKeys[r][c]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  board: {
    width: '100%',
    aspectRatio: 1,
    flexDirection: 'column',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  cell: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
