import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Need = sequelize.define(
  'Need',
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
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: 'General',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false,
      defaultValue: 'medium',
    },
    status: {
      type: DataTypes.ENUM('open', 'fulfilled'),
      allowNull: false,
      defaultValue: 'open',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    tableName: 'shelter_need',
    timestamps: false,
  }
);
