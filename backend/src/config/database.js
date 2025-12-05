const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',

    // ✅ REQUIRED for AWS RDS
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },

    logging: process.env.NODE_ENV === 'development' ? console.log : false,

    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// ✅ Test connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synchronized.');
    } else {
      console.log('ℹ️  Production mode: Skipping auto-sync.');
    }

  } catch (error) {
    console.error('❌ Unable to connect to database:', error.original || error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
