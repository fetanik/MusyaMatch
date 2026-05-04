import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Cat = sequelize.define(
  'Cat',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    shelterId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'shelter_id',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    gender: {
      type: DataTypes.ENUM('male', 'female'),
      allowNull: true,
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'birth_date',
    },
    breed: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    vaccinations: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '[]',
      get() {
        const raw = this.getDataValue('vaccinations');
        if (!raw) return [];
        try {
          return JSON.parse(raw);
        } catch {
          return [];
        }
      },
      set(value) {
        this.setDataValue('vaccinations', JSON.stringify(Array.isArray(value) ? value : []));
      },
    },
    imageUrl: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      field: 'image_url',
    },
    source: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: 'shelter',
    },
    urgency: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    personality: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    sex: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    compatibilityScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    sourceType: {
      type: DataTypes.ENUM('shelter', 'private'),
      allowNull: false,
      defaultValue: 'shelter',
      field: 'source_type',
    },
    // Enhanced fields for smart matching
    experienceLevel: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'experience_level',
      comment: 'first_time, experienced',
    },
    goodWithKids: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'good_with_kids',
    },
    goodWithPets: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'good_with_pets',
    },
    spaceRequirements: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'space_requirements',
      comment: 'apartment, house',
    },
    energyLevel: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'energy_level',
      comment: 'low, medium, high',
    },
    ageCategory: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'age_category',
      comment: 'kitten, adult, senior',
    },
    specialNeeds: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'special_needs',
    },
    careRequirements: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'care_requirements',
      comment: 'low, medium, high',
    },
    listingType: {
      type: DataTypes.ENUM('adoption', 'foster', 'none'),
      allowNull: false,
      defaultValue: 'adoption',
      field: 'listing_type',
    },
    listingStatus: {
      type: DataTypes.ENUM('active', 'pending', 'placed', 'adopted', 'hidden'),
      allowNull: false,
      defaultValue: 'active',
      field: 'listing_status',
    },
    previousListingType: {
      type: DataTypes.ENUM('adoption', 'foster', 'none'),
      allowNull: true,
      field: 'previous_listing_type',
    },
    previousListingStatus: {
      type: DataTypes.ENUM('active', 'pending', 'placed', 'adopted', 'hidden'),
      allowNull: true,
      field: 'previous_listing_status',
    },
  },
  {
    tableName: 'cat',
    timestamps: false,
  }
);