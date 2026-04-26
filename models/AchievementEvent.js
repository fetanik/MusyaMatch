import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const AchievementEvent = sequelize.define(
  'AchievementEvent',
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
      allowNull: true,
      field: 'cat_id',
    },
    type: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    meta: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '{}',
      get() {
        const raw = this.getDataValue('meta');
        if (!raw) return {};
        try {
          return JSON.parse(raw);
        } catch {
          return {};
        }
      },
      set(value) {
        this.setDataValue(
          'meta',
          JSON.stringify(value && typeof value === 'object' ? value : {})
        );
      },
    },
  },
  {
    tableName: 'achievement_event',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

