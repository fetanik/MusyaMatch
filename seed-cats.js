import { sequelize } from './config/database.js';
import { Cat } from './models/Cat.js';

const sampleCats = [
  {
    name: 'Мурчик',
    breed: 'Британський короткошерстий',
    age: 2,
    description: 'Спокійний та ласкавий кіт, ідеальний для квартири. Любить спати та гратися з м\'яччиком.',
    experience_level: 'first_time',
    good_with_kids: true,
    good_with_pets: false,
    space_requirements: 'apartment',
    energy_level: 'low',
    age_category: 'adult',
    special_needs: false,
    care_requirements: 'low',
    image_url: 'https://example.com/murchik.jpg',
    status: 'available'
  },
  {
    name: 'Луна',
    breed: 'Мейн-кун',
    age: 1,
    description: 'Енергійна та грайлива кошеня. Любить досліджувати все навколо. Потребує багато уваги.',
    experience_level: 'experienced',
    good_with_kids: false,
    good_with_pets: true,
    space_requirements: 'house',
    energy_level: 'high',
    age_category: 'kitten',
    special_needs: false,
    care_requirements: 'medium',
    image_url: 'https://example.com/luna.jpg',
    status: 'available'
  },
  {
    name: 'Тигр',
    breed: 'Сибірська кішка',
    age: 4,
    description: 'Дуже добра та терпляча кішка. Чудово ладнає з дітьми та іншими тваринами.',
    experience_level: 'first_time',
    good_with_kids: true,
    good_with_pets: true,
    space_requirements: 'apartment_large',
    energy_level: 'medium',
    age_category: 'adult',
    special_needs: false,
    care_requirements: 'low',
    image_url: 'https://example.com/tigr.jpg',
    status: 'available'
  },
  {
    name: 'Персик',
    breed: 'Персидська',
    age: 6,
    description: 'Спокійний дорослий кіт, потребує регулярного догляду за шерстю. Ідеальний компаньйон для перегляду фільмів.',
    experience_level: 'first_time',
    good_with_kids: false,
    good_with_pets: false,
    space_requirements: 'apartment',
    energy_level: 'low',
    age_category: 'adult',
    special_needs: true,
    care_requirements: 'high',
    image_url: 'https://example.com/persik.jpg',
    status: 'available'
  },
  {
    name: 'Буся',
    breed: 'Сфінкс',
    age: 3,
    description: 'Дружелюбна та соціальна кішка без шерсті. Потребує особливого догляду за шкірою.',
    experience_level: 'experienced',
    good_with_kids: true,
    good_with_pets: false,
    space_requirements: 'apartment',
    energy_level: 'medium',
    age_category: 'adult',
    special_needs: true,
    care_requirements: 'high',
    image_url: 'https://example.com/busya.jpg',
    status: 'available'
  }
];

async function seedCats() {
  try {
    await sequelize.sync({ force: true });
    
    console.log('Додавання тестових котиків...');
    
    for (const catData of sampleCats) {
      await Cat.create(catData);
      console.log(`✅ Додано котика: ${catData.name}`);
    }
    
    console.log('🎉 Усі тестові котики додані до бази даних!');
    
  } catch (error) {
    console.error('❌ Помилка при додаванні котиків:', error);
  } finally {
    await sequelize.close();
  }
}

seedCats();
