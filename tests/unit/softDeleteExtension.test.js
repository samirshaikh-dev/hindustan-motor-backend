const { mergeDeletedFilter } = require('../../src/config/prisma');

describe('Soft Delete - deletedAt where merging', () => {
  it('adds deletedAt:null to an empty where', () => {
    expect(mergeDeletedFilter(undefined)).toEqual({
      AND: [{}, { deletedAt: null }],
    });
  });

  it('wraps a simple equality where alongside deletedAt:null', () => {
    expect(mergeDeletedFilter({ id: 'motor_1' })).toEqual({
      AND: [{ id: 'motor_1' }, { deletedAt: null }],
    });
  });

  it('appends deletedAt:null to an existing AND array', () => {
    const where = { AND: [{ id: 'motor_1' }, { status: 'RECEIVED' }] };
    expect(mergeDeletedFilter(where)).toEqual({
      AND: [{ id: 'motor_1' }, { status: 'RECEIVED' }, { deletedAt: null }],
    });
  });

  it('normalizes a single-element AND to an array', () => {
    const where = { AND: { id: 'motor_1' } };
    expect(mergeDeletedFilter(where)).toEqual({
      AND: [{ id: 'motor_1' }, { deletedAt: null }],
    });
  });

  it('preserves non-where keys like OR when merging', () => {
    const where = {
      OR: [{ brand: { contains: 'Siemens' } }, { customerName: { contains: 'Steel' } }],
    };
    const merged = mergeDeletedFilter(where);
    expect(merged.AND[0].OR).toEqual(where.OR);
    expect(merged.AND[1]).toEqual({ deletedAt: null });
  });
});