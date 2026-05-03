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
    breed: {
      type: DataTypes.STRING(100),
      allowNull: true,
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
    image_url: {
      type: DataTypes.STRING(1024),
      allowNull: true,
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
    compatibility_score: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    sourceType: {
      type: DataTypes.ENUM('shelter', 'private'),
      allowNull: false,
      defaultValue: 'shelter',
      field: 'source_type',
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