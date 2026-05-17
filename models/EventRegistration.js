import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const EventRegistration = sequelize.define(
  'EventRegistration',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'event_id',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
  },
  {
    tableName: 'event_registration',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  },
);
