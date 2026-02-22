/**
 * BullMQ : files pour emails, commissions, notifications, tracking
 */
import { Queue, Worker, type Job } from 'bullmq';
import { getRedisConnection } from './redis';

const connection = { connection: getRedisConnection() };

export const orderQueue = new Queue('orders', connection);
export const emailQueue = new Queue('emails', connection);
export const commissionQueue = new Queue('commissions', connection);
export const deliveryQueue = new Queue('deliveries', connection);

export async function addOrderJob(name: string, data: Record<string, unknown>, opts?: { delay?: number }) {
  return orderQueue.add(name, data, { ...opts });
}

export async function addEmailJob(to: string, subject: string, template: string, data: Record<string, unknown>) {
  return emailQueue.add('send', { to, subject, template, data });
}

export async function addCommissionJob(orderId: string, data: Record<string, unknown>) {
  return commissionQueue.add('compute', { orderId, ...data });
}

export async function addDeliveryJob(name: string, data: Record<string, unknown>) {
  return deliveryQueue.add(name, data);
}

export function createOrderWorker(processor: (job: Job) => Promise<void>) {
  return new Worker('orders', processor, connection);
}

export function createEmailWorker(processor: (job: Job) => Promise<void>) {
  return new Worker('emails', processor, connection);
}
