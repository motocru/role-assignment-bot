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

/**Database Message model */
const Message = sequelize.define('message', {
   id: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true
   },
   type: {
      type: Sequelize.INTEGER,
      allowNull: false
   },
   server: {
      type: Sequelize.STRING,
      allowNull: null
   },
   valid: {
      type: Sequelize.BOOLEAN,
      allowNull: false
   }
});

Message.sync();

module.exports = Message;