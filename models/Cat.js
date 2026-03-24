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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
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
  },
  {
    tableName: 'cats',
    underscored: true,
  }
);
