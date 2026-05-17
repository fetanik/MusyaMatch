import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Event = sequelize.define(
  'Event',
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
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    eventTime: {
      type: DataTypes.TIME,
      allowNull: true,
      field: 'event_time',
    },
    location: {
      type: DataTypes.STRING(300),
      allowNull: true,
    },
    cost: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    maxParticipants: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'max_participants',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'cancelled', 'completed'),
      allowNull: false,
      defaultValue: 'active',
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'image_url',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    tableName: 'events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);
