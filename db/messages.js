const db = require('./db');
const Sequelize = require('sequelize');

/**Adds a server and associated message to the table */
function addMessage(messageId, serverId, typeNum, cb) {
    var message = {id: messageId, server: serverId, type: typeNum, valid: true};
    db.create(message).then(newMessage => {
        cb(message);
    })
}
module.exports.addMessage = addMessage;

/**Updates a role message on a server */
function updateMessageType(messageId, typeNum, cb) {
    db.update({type: typeNum, valid: true}, {
        where: {
            id: messageId
        }
    }).then(rec => {
        cb(rec);
    })
}
module.exports.updateMessageType = updateMessageType;

function updateMessageValid(id, valid, cb) {
    db.update({valid: valid}, {
        where: {
            id: id
        }
    }).then(rec => {
        cb(rec);
    });
}
module.exports.updateMessageValid = updateMessageValid;

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