import { sequelize } from './config/database.js';
import { Cat } from './models/Cat.js';

const sampleCats = [
  {
    name: 'Murchik',
    breed: 'British Shorthair',
    age: 2,
    description:
      'Calm and affectionate cat, great for apartment life. Loves naps and playing with a ball.',
    experience_level: 'first_time',
    good_with_kids: true,
    good_with_pets: false,
    space_requirements: 'apartment',
    energy_level: 'low',
    age_category: 'adult',
    special_needs: false,
    care_requirements: 'low',
    image_url: 'https://example.com/murchik.jpg',
    status: 'available',
  },
  {
    name: 'Luna',
    breed: 'Maine Coon',
    age: 1,
    description: 'Energetic, playful kitten. Loves exploring everything and needs plenty of attention.',
    experience_level: 'experienced',
    good_with_kids: false,
    good_with_pets: true,
    space_requirements: 'house',
    energy_level: 'high',
    age_category: 'kitten',
    special_needs: false,
    care_requirements: 'medium',
    image_url: 'https://example.com/luna.jpg',
    status: 'available',
  },
  {
    name: 'Tiger',
    breed: 'Siberian',
    age: 4,
    description: 'Very kind and patient cat. Gets along well with children and other animals.',
    experience_level: 'first_time',
    good_with_kids: true,
    good_with_pets: true,
    space_requirements: 'apartment_large',
    energy_level: 'medium',
    age_category: 'adult',
    special_needs: false,
    care_requirements: 'low',
    image_url: 'https://example.com/tigr.jpg',
    status: 'available',
  },
  {
    name: 'Peach',
    breed: 'Persian',
    age: 6,
    description:
      'Calm adult cat who needs regular coat care. A perfect companion for quiet evenings and movies.',
    experience_level: 'first_time',
    good_with_kids: false,
    good_with_pets: false,
    space_requirements: 'apartment',
    energy_level: 'low',
    age_category: 'adult',
    special_needs: true,
    care_requirements: 'high',
    image_url: 'https://example.com/persik.jpg',
    status: 'available',
  },
  {
    name: 'Busya',
    breed: 'Sphynx',
    age: 3,
    description: 'Friendly, social hairless cat who needs special skin care.',
    experience_level: 'experienced',
    good_with_kids: true,
    good_with_pets: false,
    space_requirements: 'apartment',
    energy_level: 'medium',
    age_category: 'adult',
    special_needs: true,
    care_requirements: 'high',
    image_url: 'https://example.com/busya.jpg',
    status: 'available',
  },
];

async function seedCats() {
  try {
    await sequelize.sync({ force: true });

    console.log('Seeding sample cats...');

    for (const catData of sampleCats) {
      await Cat.create(catData);
      console.log(`Added cat: ${catData.name}`);
    }

    console.log('All sample cats were added to the database.');
  } catch (error) {
    console.error('Error while seeding cats:', error);
  } finally {
    await sequelize.close();
  }
}

seedCats();
