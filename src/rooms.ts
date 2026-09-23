// Reference: assets/roominfo.txt. Photos illustrate room types, not bookable inventory.
export const ROOMS = [
  { file: 'R06.jpg', type: 'Common Room', code: 'R06', price: '1,288', features: 'Air conditioning · Shared bathroom' },
  { file: 'R02.jpg', type: 'Balcony Room', code: 'R02', price: '1,488', features: 'Air conditioning · Shared bathroom' },
  { file: 'R01.jpg', type: 'Window Room', code: 'R01', price: '988', features: 'No air conditioning · Shared bathroom' },
  { file: 'R03.jpg', type: 'Master Room', code: 'R03', price: '1,788', features: 'Air conditioning · Private bathroom' },
  { file: 'R05.jpg', type: 'Common Room', code: 'R05', price: '1,288', features: 'Air conditioning · Shared bathroom' },
  { file: 'R07.jpg', type: 'Common Room', code: 'R07', price: '1,288', features: 'Air conditioning · Shared bathroom' },
  { file: 'R02 (2).jpg', type: 'Balcony Room', code: 'R02 · Another view', price: '1,488', features: 'Air conditioning · Shared bathroom' },
  { file: 'Common Area.jpg', type: 'Common Area', code: 'SHARED SPACE', price: '', features: 'A glimpse of the shared living space' }
] as const;
