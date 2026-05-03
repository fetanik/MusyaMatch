import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Vaccination = sequelize.define(
  'Vaccination',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    catId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'cat_id',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'due_date',
    },
    status: {
      type: DataTypes.ENUM('upcoming', 'completed'),
      allowNull: false,
      defaultValue: 'upcoming',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'vaccination',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

