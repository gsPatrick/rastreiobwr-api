const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('bwrBombasPlanilha', 'root', '#Bwrbombas24', {
    host: 'localhost',
    dialect: 'mariadb',
    port: 3306,
    logging: false
});

module.exports = sequelize;