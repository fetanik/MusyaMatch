import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Shelter = sequelize.define(
  'Shelter',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id',
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    logo: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    adoptionConditions: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'adoption_conditions',
    },
    instagram: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    facebook: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    telegram: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: 'shelter',
    timestamps: false,
  }
);