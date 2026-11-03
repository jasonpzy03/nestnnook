export interface ListedRoom {
  id: string;
  code: string;
  type: string;
  locationId: string;
  locationName: string;
  journey: string;
  monthlyRent: number;
  features: string[];
  description: string;
  featured: boolean;
  order: number;
  photos: { url: string; alt: string }[];
}

export function filterRooms(
  rooms: ListedRoom[],
  filters: {
    query: string;
    location: string;
    type: string;
    maxRent: string;
    sort: string;
  },
): ListedRoom[] {
  const words = filters.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const result = rooms.filter((room) => {
    const text = [room.code, room.type, room.locationName, room.description, ...room.features]
      .join(' ')
      .toLocaleLowerCase();
    return (
      words.every((word) => text.includes(word)) &&
      (!filters.location || room.locationId === filters.location) &&
      (!filters.type || room.type === filters.type) &&
      (!filters.maxRent || room.monthlyRent <= Number(filters.maxRent))
    );
  });
  return result.sort((a, b) => {
    if (filters.sort === 'price-low') return a.monthlyRent - b.monthlyRent || a.order - b.order;
    if (filters.sort === 'price-high') return b.monthlyRent - a.monthlyRent || a.order - b.order;
    return Number(b.featured) - Number(a.featured) || a.order - b.order;
  });
}
