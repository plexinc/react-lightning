export interface Metadata {
  // Remove the duplicate declaration of 'art'
  Ad?: Ad[];
  addedAt: number;
  art?: string;
  attribution?: string;
  audienceRating?: number;
  audienceRatingImage?: string;
  availabilityId: string;
  banner?: string;
  childCount?: number;
  contentRating?: string;
  Director: Director[];
  duration: number;
  expiresAt: number;
  Genre: Genre[];
  Guid?: Guid[];
  guid?: string;
  Image: MetadataImage[];
  imdbRatingCount: number;
  key: string;
  leafCount?: number;
  Media?: Media[];
  Network?: Network[];
  originallyAvailableAt: string;
  originalTitle?: string;
  primaryExtraKey?: string;
  publicPagesURL: string;
  Rating: Rating[];
  rating?: number;
  ratingImage?: string;
  ratingKey: string;
  Role: Role[];
  skipChildren?: boolean;
  slug: string;
  streamingMediaId?: string;
  studio: string;
  Studio: Studio[];
  subtype?: string;
  summary: string;
  tagline?: string;
  thumb: string;
  title: string;
  type: string;
  userState: boolean;
  Writer?: Writer[];
  year: number;
}

export interface Media {
  bitrate: number;
  container: string;
  protocol: string;
  url: string;
  height: number;
  width: number;
  drm: boolean;
  optimizedForStreaming: boolean;
  videoResolution: string;
  id: string;
  Part: Part[];
  videoCodec?: string;
}

export interface Part {
  container: string;
  id: string;
  key: string;
  drm?: string;
  license?: string;
  indexes: string;
  Stream: Stream[];
}

export interface Stream {
  bitrate?: number;
  codec?: string;
  height?: number;
  streamType: number;
  width?: number;
  id: string;
  displayTitle: string;
  selected?: boolean;
  audioTrackId?: string;
  language?: string;
  variant?: string;
  languageCode?: string;
  key?: string;
  formats?: string;
  streamIdentifier?: string;
}

export interface Director {
  key: string;
  id: string;
  slug: string;
  tag: string;
  thumb?: string;
  role: string;
  type: string;
}

export interface Writer {
  key: string;
  id: string;
  slug: string;
  tag: string;
  role: string;
  type: string;
  thumb?: string;
}

export interface Rating {
  image: string;
  type: string;
  value: number;
}

export interface Studio {
  tag: string;
}

export interface Network {
  tag: string;
}

export interface MetadataImage {
  alt: string;
  type: string;
  url: string;
}

export interface Ad {
  internal: boolean;
  type: string;
  url: string;
}

export interface Genre {
  filter: string;
  id: string;
  key: string;
  ratingKey: string;
  slug: string;
  tag: string;
  type: string;
  context: string;
}

export interface Guid {
  id: string;
}

export interface Role {
  key: string;
  id: string;
  slug: string;
  tag: string;
  thumb?: string;
  role?: string;
  type: string;
}
