const auth = require('../auth.json');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(auth.roledb, auth.dbusername, auth.dbpass, {
   host: 'localhost',
   dialect: 'mysql'
});

sequelize.authenticate()
         .then(() => {
            console.log('Connection has been established successfully');
         })
         .catch(err => {
            console.error('unable to establish connection to database: ', err);
         });

module.exports = {define : (name, options) => sequelize.define(name, options)};