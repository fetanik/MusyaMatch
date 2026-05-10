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
      allowNull: false,
      field: 'shelter_id',
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    eventDate: {
      type: DataTypes.DATE, // В Sequelize DataTypes.DATE відповідає DATETIME в MySQL
      allowNull: false,
      field: 'event_date',
    },
    type: {
      type: DataTypes.ENUM('private', 'opened'),
      allowNull: false,
      defaultValue: 'opened',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('upcoming', 'completed', 'cancelled'),
      allowNull: true,
      defaultValue: 'upcoming',
    },
  },
  {
    tableName: 'Event',
    timestamps: false, // Оскільки у нас немає полів createdAt/updatedAt в таблиці Event
  }
);