// app/utils/bullQueue.js
import { Queue } from 'bullmq';
import redisClient from './redisClient';

// Define the queue name and configure it with Redis connection
const jobQueue = new Queue('shopifyJobQueue', {
  connection: redisClient,
});

export default jobQueue;