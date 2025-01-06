import type { Metadata } from './Metadata';

export interface HubRoot {
  MediaContainer: MediaContainer;
}

export interface MediaContainer {
  librarySectionID: string;
  offset: number;
  totalSize: number;
  identifier: string;
  size: number;
  Hub: Hub[];
}

export interface Hub {
  more: boolean;
  promoted: boolean;
  title: string;
  type: string;
  placeholder?: boolean;
  size: number;
  context: string;
  hubIdentifier: string;
  key: string;
  Meta: Meta;
  totalSize?: number;
  Metadata?: Metadata[];
}

export interface Meta {
  DisplayFields: DisplayField[];
}

export interface DisplayField {
  type: string;
  fields: string[];
}
