import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';
import LightningScraper from './services/lightning-scraper.service';
import { DynamoDBService } from './services/dynamodb.service';

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server);
const PORT = process.env.PORT;

const dbService = new DynamoDBService()

io.on('connection', (socket: Socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

setInterval(async() => {
    const latestResult = await LightningScraper.scrape();
    io.emit('latest-update', latestResult);
    await dbService.writeItem(latestResult)
}, 5000)

server.listen(PORT, () => console.log(`Socket.IO server running on http://localhost:${PORT}`));
