const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('rastreioapi', 'rastreioapi', 'rastreioapi', {
    host: 'n8n_rastreioapi',
    dialect: 'mariadb',
    port: 3306,
    logging: false
});

module.exports = sequelize;