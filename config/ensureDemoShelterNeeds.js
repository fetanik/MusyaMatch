import { Need } from '../models/Need.js';
import { Shelter } from '../models/Shelter.js';

/** Inserts sample open needs when the table is empty so home carousel / shelter-needs pages have content. */
export async function ensureDemoShelterNeeds() {
  try {
    const count = await Need.count();
    if (count > 0) return;

    let shelter = await Shelter.findOne({ order: [['id', 'ASC']] });
    if (!shelter) {
      shelter = await Shelter.create({
        name: 'Cozy Whiskers Rescue',
        address: 'Shevchenka, 10, Kyiv',
        phone: '+380 44 000 0000',
      });
    }

    const dueDate = '2099-12-31';
    const base = {
      shelterId: shelter.id,
      userId: shelter.userId ?? null,
      status: 'open',
      dueDate,
    };

    await Need.bulkCreate([
      {
        ...base,
        title: 'Food for Cats',
        description:
          'Our shelter needs dry and wet food for adult cats. Any amount would be helpful for daily feeding.',
        category: 'Food',
        priority: 'high',
      },
      {
        ...base,
        title: 'Cleaning Supplies',
        description:
          'The shelter needs cleaning products, paper towels, disposable gloves, trash bags, and disinfectants.',
        category: 'Supplies',
        priority: 'low',
      },
      {
        ...base,
        title: 'Medicine for Cats',
        description:
          'We need basic veterinary supplies, including antiseptics, bandages, flea treatments, and vitamins.',
        category: 'Medical',
        priority: 'medium',
      },
    ]);

    console.log('[db] Seeded demo shelter needs for carousel');
  } catch (err) {
    console.warn('[db] ensureDemoShelterNeeds:', err?.message || err);
  }
}
