import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const BasicUser = sequelize.define(
  'BasicUser',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'first_name',
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'password_hash',
    },
    role: {
      type: DataTypes.ENUM('user', 'manager', 'admin'),
      allowNull: false,
      defaultValue: 'user',
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
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
    photo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'basic_user',
    timestamps: false,
  }
);