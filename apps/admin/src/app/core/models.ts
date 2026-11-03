export const ROOM_TYPES = [
  'Single Room',
  'Common Room',
  'Balcony Room',
  'Window Room',
  'Master Room',
  'Common Area',
  'Others',
];
export interface Photo {
  url: string;
  alt: string;
}
export interface Room {
  id: string;
  code: string;
  type: string;
  monthlyRent: number;
  locationId: string;
  description: string;
  features: string[];
  photos: Photo[];
  visible: boolean;
  featured: boolean;
  order: number;
}
export interface Location {
  id: string;
  name: string;
  journey: string;
  description: string;
  image: string;
  visible: boolean;
  order: number;
}
export interface Catalog {
  revision: number;
  rooms: Room[];
  locations: Location[];
  updatedAt: string;
  snapshot?: { revision: number; createdAt: string; rooms: Room[]; locations: Location[] };
}
export interface ConnectionStatus {
  storage: string;
  publishingConnected: boolean;
  uploadsEnabled: boolean;
}
