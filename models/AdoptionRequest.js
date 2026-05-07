import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const AdoptionRequest = sequelize.define(
  'AdoptionRequest',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
    },
    catId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'cat_id',
    },
    type: {
      type: DataTypes.ENUM('foster', 'adoption'),
      allowNull: false,
      defaultValue: 'adoption',
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: 'adoption_request',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

