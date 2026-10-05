const { Server } = require('socket.io');
const registerMachineSocket = require('./machineSocket');

function initSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: '*'
        }
    });

    registerMachineSocket(io);

    return io;
}

module.exports = {
    initSocket
};