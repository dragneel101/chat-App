const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, getUser, removeUser, getUsersInRoom } = require('./utils/users')


const app = express()
const server = http.createServer(app)
const io = socketio(server)


const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')
const Filter = require('bad-words')

app.use(express.static(publicDirectoryPath))

io.on('connection', (socket) => {

    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })

        if (error) return callback(error)

        socket.join(user.room)

        socket.emit('message', generateMessage('ADMIN', '****Welcome****'))
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined! ${user.room}`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()

    })


    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)

        const filter = new Filter()
        if (filter.isProfane(message)) {
            return callback('profanity is not allowed')
        }
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })


    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id)
        const locationMesssage = `https://google.com/maps?q=${location.latitude},${location.longitude}`
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, locationMesssage))
        callback()
    })


    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage(('ADMIN', `${user.username} has left ${user.room}`)))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})



server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})