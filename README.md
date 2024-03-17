# Multiplayer Word Guessing Game

This is a Work in Progress (WIP) Node.js project for a multiplayer word guessing game. In this game, players type words, and the game displays images from Google/Bing related to those words. Other players then attempt to guess the word based on the displayed images.

## How to Run

To run the project, follow these steps:

1. Clone the repository.
2. Navigate to the project directory in your terminal.
3. Run `npm install` to install dependencies.
4. Run `node app.js` to start the server.

## Technologies Used

- Node.js
- Express.js
- Socket.IO
- Axios
- Cheerio
- HTML
- CSS
- Bootstrap

## Project Structure

The project consists of the following files:

- `app.js`: This is the main file containing the server logic using Express.js and Socket.IO. It handles player connections, game rooms, and game logic.
- `public/index.html`: Landing page HTML file for hosting/joining the game.
- `public/game.html`: HTML file for the game room, where players interact with each other.
- `public/styles.css`: CSS file for styling the game interface.
- `public/scripts.js`: JavaScript file containing client-side logic for the game.

## How to Play

1. Navigate to the landing page.
2. Create a game by clicking "Créer une partie," or join an existing game by entering the room ID and clicking "Rejoindre une partie."
3. Once players have joined the game room, they can change their username, choose a ready status, and change their username color.
4. The game host can start the game once enough players are ready.
5. Players take turns typing words, and images related to those words are displayed.
6. Other players attempt to guess the word based on the displayed images.
7. The game continues until all players have taken their turns.

## License
- This project is licensed under the MIT License.

## Important Notes

- This project is currently a work in progress and may contain bugs or incomplete features.
- Images are fetched from Google. If you encounter any issues with image retrieval, please check your internet connection and try again.

Feel free to contribute to the project or report any issues you encounter!
