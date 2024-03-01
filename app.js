// app.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));
async function searchImagesForWords(inputString) {
    const words = inputString.split(' ');
    let images = [];

    for (const word of words) {
        try {
            const imageUrl = await searchImageForWord(word);
            if(imageUrl) { // Make sure imageUrl is valid
                console.log(`Word: ${word}, Image URL: ${imageUrl}`);
                images.push({url: imageUrl}); // Modify to match the expected object structure
            }
        } catch (error) {
            console.error(`Error searching for image for the word "${word}":`, error.message);
        }
    }
    try{
        const imageUrl = await searchImageForWord(inputString);
        if(imageUrl) { // Make sure imageUrl is valid
            console.log(`Word: ${inputString}, Image URL: ${imageUrl}`);
            images.push({url: imageUrl}); // Modify to match the expected object structure
        }
    }
    catch (error) {
        console.error(`Error searching for image for the word "${inputString}":`, error.message);
    }
    return images;
}



/**
 * Search for an image for a given word using Bing, selecting the first image with width and height specified in the URL.
 * 
 * @param {string} word The search query.
 * @return {Promise<string>} A promise that resolves to the URL of a relevant image, or null if none found.
 */
async function searchImageForWord(word) {
    //const url = `https://www.bing.com/images/search?q=${encodeURIComponent(word)}`;
    //instead of bing we will use google
    const url = `https://www.google.com/search?q=${encodeURIComponent(word)}&tbm=isch`;
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        
        // Extract image source URLs
        const imageUrls = $('img').map((index, element) => $(element).attr('src')).get();

        // Find the first image URL that contains both 'w=' and 'h=' parameters
        //const relevantImageUrl = imageUrls.find(url => url.includes('w=') && url.includes('h='));

        if (imageUrls) {
        
            return imageUrls;
        } else {
            // Return null if no matching image was found
            return null;
        }
    } catch (error) {
        throw new Error(`Error searching for image for the word "${word}": ${error.message}`);
    }
}


// Store game rooms
const rooms = new Map();

// Landing page route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Host game route
app.post('/host', (req, res) => {
    const roomID = generateRoomID();
    console.log('Host game', roomID)
    rooms.set(roomID, { players: [], game : {state: 0}});
    res.redirect(`/game/${roomID}`);
});

// Join game route
app.get('/game/:roomID', (req, res) => {
    console.log('Join game', req.params.roomID)
    const roomID = req.params.roomID;
    if (!rooms.has(roomID)) {
        return res.status(404).send('Room not found');
    }
    res.sendFile(path.join(__dirname, 'public', 'game.html'));
});


// Socket.IO logic
io.on('connection', (socket) => {
    socket.on('joinRoom', ( roomID ) => {
        console.log('JoinRoom with id: ', roomID)
        handleJoinRoom(socket, roomID);
    });
    socket.on('startGame', async (roomID, sentence) => {
        const room = rooms.get(roomID);
        console.log(JSON.stringify(room));
        console.log(JSON.stringify(rooms));
        if (!room) {
            console.error("Room not found:", roomID);
            return;
        }
    
        room.game.state = 1;
        room.game.turn = 0;
        room.game.sentences = [];
        room.game.images = [];
        room.game.sentences.push(sentence);
    
        try {
            //in tempSentence remove all worlds like "Le, ai, la, un, une, je, tu, il, elle, nous, vous, ils, elles, les, des, de, du, d', l', m', n', s', t', qu', j', c', l', y', en, ou, et, a, à, on, ce, se, si, ne, ni, or";
            //to create tempSentence split all words appart and remove all words that are in the list above
            let tempSentence = sentence.split(' ').filter(word => !['Le', 'ai', 'la', 'un', 'une', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'les', 'des', 'de', 'du', 'd', 'l', 'm', 'n', 's', 't', 'qu', 'j', 'c', 'l', 'y', 'en', 'ou', 'et', 'a', 'à', 'on', 'ce', 'se', 'si', 'ne', 'ni', 'or'].includes(word)).join(' ');

            const images = await searchImagesForWords(tempSentence);
            if (images && images.length > 0) {
                //images.forEach((image, index) => {
                    // Replace width and height parameters with 320 and 240
                    //images[index].url = image.url.replace(/w=\d+/g, 'w=320').replace(/h=\d+/g, 'h=240');
                //});
                //create
                room.game.images[room.game.turn] = images;
                io.to(roomID).emit('gameStarted', room.game);
            } else {
                throw new Error("No images found for the provided sentence.");
            }
        } catch (error) {
            console.error("Error fetching images:", error);
        }
    });
    
    socket.on('nextTurn', (roomID, sentence) => {
        const room = rooms.get(roomID);
        room.game.sentences.push(sentence);
        room.game.images[room.game.turn] = callGoogleImageForEveryWordToGetAnArrayOfImages(sentence.split(' '));
        if(room.game.turn === room.players.length - 1){
            io.to(roomID).emit('gameEnded', room.game);
        }
        else
            room.game.turn++;
        io.to(roomID).emit('nextTurn', room.game.images);
    });

    socket.on('toggleReady', (isReady) => {
        handleToggleReady(socket, isReady);
    });

    socket.on('disconnect', () => {
        const roomID = getRoomIDBySocket(socket.id);
        if (roomID) {
            const room = rooms.get(roomID);
            room.players = room.players.filter(p => p.id !== socket.id);
            io.to(roomID).emit('playerDisconnected', room.players);
        }
    });

    socket.on('updateUsername', (newUsername) => {
        console.log('updateUsername', newUsername);
        handleChangeUsername(socket, newUsername);
    });

    socket.on('changeColor', () => {
        handleChangeColor(socket);
    });
});

function handleToggleReady(socket, isReady) {
    const roomID = getRoomIDBySocket(socket.id);
    if (roomID) {
        const room = rooms.get(roomID);
        let player = room.players.find(p => p.id === socket.id);
        if (player) {
            player.ready = isReady;
            console.log("Player ready status changed: " + player.name + " " + isReady);
            io.to(roomID).emit('playerReadyStatusChanged', room.players, isReady);
        }
    }
}

function handleChangeColor(socket) {
    const roomID = getRoomIDBySocket(socket.id);
    if (roomID) {
        const room = rooms.get(roomID);
        const player = room.players.find(p => p.id === socket.id);
        if (player) {
            player.color = getRandomColor();
            io.to(roomID).emit('playerColorChanged', room.players, player.color);
        }
    }
}

function getRoomIDBySocket(socketID) {
    for (const [roomID, room] of rooms.entries()) {
        if (room.players.some(p => p.id === socketID)) {
            return roomID;
        }
    }
    return null;
}

function handleJoinRoom(socket, roomID) {
    console.log('Joining room', roomID);
    console.log(JSON.stringify(rooms));
    if (rooms.has(roomID)) {
        const room = rooms.get(roomID);
        let playerName;
        // Check if the room already has players
        if (room.players.length > 0) {
            // If there are existing players, assign a unique name to the new player
            playerName = `Player ${room.players.length + 1}`;
        } else {
            // If there are no existing players, use the default name "Player 1"
            playerName = "Player 1";
        }
        // Push the new player to the players array
        room.players.push({ id: socket.id, name: playerName, color: getRandomColor(), ready: false, host : room.players.length === 0});

        // count the number of players and check if one of them is the host if none is the host, make the first player the host
        let host = false;
        let count = 0;
        room.players.forEach(player => {
            if (player.host) {
                host = true;
            }
            count++;
        });
        if (!host) {
            room.players[0].host = true;
            io.emit('hostChanged', room.players);
        }

        socket.join(roomID);
        io.to(roomID).emit('playerJoined', room.players);
    } else {
        socket.emit('roomNotFound');
    }
}



function handleChangeUsername(socket, newUsername) {
    const roomID = getRoomIDBySocket(socket.id);
    if (roomID) {
        const room = rooms.get(roomID);
        const player = room.players.find(p => p.id === socket.id);
        if (player) {
            player.name = newUsername;
            console.log("Will emit playerUsernameChanged with: ", socket.id, JSON.stringify(room.players))
            io.to(roomID).emit('playerUsernameChanged', room.players);
        }
    }
}

function generateRoomID() {
    // Generate a random 6-character room ID
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRandomColor() {
    // Generate a random color in hexadecimal format
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
