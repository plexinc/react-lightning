import type { Metadata } from './Metadata';

export interface HubItemsRoot {
  MediaContainer: MediaContainer;
}

export interface MediaContainer {
  title: string;
  offset: number;
  totalSize: number;
  identifier: string;
  size: number;
  Metadata: Metadata[];
}
