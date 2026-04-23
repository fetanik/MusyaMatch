import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Cat entity — adoption listing in MusyaMatch.
 */
export const Cat = sequelize.define(
  'Cat',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    shelter_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    gender: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    birth_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    breed: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    age: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    compatibility_score: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: 'available',
    },
    // Enhanced fields for smart matching
    experience_level: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'first_time, experienced',
    },
    good_with_kids: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    good_with_pets: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    space_requirements: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'apartment, house',
    },
    energy_level: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'low, medium, high',
    },
    age_category: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'kitten, adult, senior',
    },
    special_needs: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    care_requirements: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'low, medium, high',
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    tableName: 'cats',
    underscored: true,
  }
);
