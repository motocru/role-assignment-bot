const db = require('./db');
const Sequelize = require('sequelize');

/**Adds a server and associated message to the table */
function addMessage(messageId, serverId, typeNum, cb) {
    var message = {id: messageId, server: serverId, type: typeNum};
    db.create(message).then(newMessage => {
        cb(message);
    })
}
module.exports.addMessage = addMessage;

/**Updates a role message on a server */
function updateMessage(messageId, typeNum, cb) {
    db.update({type: typeNum}, {
        where: {
            id: messageId
        }
    }).then(rec => {
        cb(rec);
    })
}
module.exports.updateMessage = updateMessage;

/**returns a specific message for a server */
function getMessageById(id, cb) {
    db.findOne({
        where: {
            id: id
        }
    }).then(rec => {
        if (rec === null) cb(null);
        else cb(rec.dataValues);
    })
}
module.exports.getMessageById = getMessageById;

function getMessagesByServer() {

}