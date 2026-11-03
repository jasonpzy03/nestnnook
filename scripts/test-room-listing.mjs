import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/room-listing.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
});
const { filterRooms } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);
const base = { query: '', location: '', type: '', maxRent: '', sort: 'recommended' };
const rooms = [
  {
    id: 'a',
    code: 'A01',
    type: 'Master Room',
    locationId: 'rnf',
    locationName: 'R&F Princess Cove',
    monthlyRent: 1800,
    features: ['Private bathroom'],
    description: 'Balcony view',
    featured: true,
    order: 2,
  },
  {
    id: 'b',
    code: 'B01',
    type: 'Single Room',
    locationId: 'trellis',
    locationName: 'Trellis Residences',
    monthlyRent: 900,
    features: ['Air conditioning'],
    description: '',
    featured: false,
    order: 0,
  },
  {
    id: 'c',
    code: 'C01',
    type: 'Single Room',
    locationId: 'rnf',
    locationName: 'R&F Princess Cove',
    monthlyRent: 1000,
    features: ['Air conditioning'],
    description: '',
    featured: false,
    order: 1,
  },
];
const find = (overrides) => filterRooms(rooms, { ...base, ...overrides }).map((room) => room.id);
assert.deepEqual(find({}), ['a', 'b', 'c']);
assert.deepEqual(find({ query: '  PRINCESS bathroom ' }), ['a']);
assert.deepEqual(find({ query: 'b01' }), ['b']);
assert.deepEqual(find({ location: 'rnf', type: 'Single Room', maxRent: '1000' }), ['c']);
assert.deepEqual(find({ location: 'rnf', type: 'Single Room', maxRent: '900' }), []);
assert.deepEqual(find({ sort: 'price-low' }), ['b', 'c', 'a']);
assert.deepEqual(find({ sort: 'price-high' }), ['a', 'c', 'b']);
assert.deepEqual(
  rooms.map((room) => room.id),
  ['a', 'b', 'c'],
  'Sorting must not mutate source rooms',
);
console.log(
  'Listing filters passed: combined filters, inclusive budget, search, sorting and reset.',
);
