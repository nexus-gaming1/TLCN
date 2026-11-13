const { Server } = require('socket.io');
const registerMachineSocket = require('./machineSocket');

function initSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: true, //cho phép origin gửi đến nếu vượt qua lớp kiểm tra CORS
            credentials: true,
            methods: ['GET', 'POST'], 
        },
        transports: ['websocket', 'polling']
    });

    registerMachineSocket(io);

    return io;
}

module.exports = {
    initSocket
};