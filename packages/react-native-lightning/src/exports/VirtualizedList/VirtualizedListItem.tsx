import { FocusGroup, type Rect } from '@plex/react-lightning';
import React from 'react';
import type { ListRenderItem } from 'react-native';

type VirtualizedListItemProps<T> = {
  item: T;
  index: number;
  renderItem: ListRenderItem<T>;
  onLayoutUpdated?: (index: number, layout: Rect) => void;
  onFocus?: () => void;
};

export default class VirtualizedListItem<T> extends React.Component<
  VirtualizedListItemProps<T>
> {
  _layoutUpdated = (layout: Rect) => {
    this.props.onLayoutUpdated?.(this.props.index, layout);
  };

  render() {
    return (
      <FocusGroup onLayout={this._layoutUpdated} onFocus={this.props.onFocus}>
        {
          this.props.renderItem({
            item: this.props.item,
            index: this.props.index,
            separators: {
              highlight: () => {},
              unhighlight: () => {},
              updateProps: () => {},
            },
          }) as unknown as React.ReactNode
        }
      </FocusGroup>
    );
  }
}
