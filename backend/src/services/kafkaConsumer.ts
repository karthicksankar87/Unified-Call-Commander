import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class KafkaConsumerService {
  private kafka: Kafka;
  private consumer: Consumer;
  private isConnected: boolean = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'unified-call-commander',
      brokers: ['localhost:9092'],
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    this.consumer = this.kafka.consumer({
      groupId: 'call-processing-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });
  }

  async connect(): Promise<void> {
    try {
      await this.consumer.connect();
      this.isConnected = true;
      console.log('Kafka consumer connected successfully');
    } catch (error) {
      console.error('Failed to connect Kafka consumer:', error);
      throw error;
    }
  }

  async subscribe(): Promise<void> {
    try {
      await this.consumer.subscribe({
        topic: 'incomingCalls',
        fromBeginning: false // Only consume new messages
      });
      console.log('Subscribed to incomingCalls topic');
    } catch (error) {
      console.error('Failed to subscribe to topic:', error);
      throw error;
    }
  }

  async startConsuming(): Promise<void> {
    try {
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
          try {
            const callData = JSON.parse(message.value?.toString() || '{}');
            console.log(`Received call from topic ${topic}, partition ${partition}:`, callData);
            
            // Process the incoming call
            await this.processIncomingCall(callData);
            
          } catch (error) {
            console.error('Error processing message:', error);
          }
        },
      });
    } catch (error) {
      console.error('Failed to start consuming messages:', error);
      throw error;
    }
  }

  private async processIncomingCall(callData: any): Promise<void> {
    try {
      // Validate required fields
      if (!callData.phoneNumber || !callData.timestamp) {
        console.warn('Invalid call data received:', callData);
        return;
      }

      // Store the call in the database
      const call = await prisma.call.create({
        data: {
          phoneNumber: callData.phoneNumber,
          callerName: callData.callerName || 'Unknown',
          callType: callData.callType || 'INCOMING',
          timestamp: new Date(callData.timestamp),
          duration: callData.duration || 0,
          status: 'incoming', // Use 'incoming' to match frontend expectations
          metadata: callData.metadata || {},
        }
      });

      console.log('Call stored successfully:', call.id);

      // Trigger any routing logic if needed
      await this.triggerCallRouting(call);

    } catch (error) {
      console.error('Error processing incoming call:', error);
    }
  }

  private async triggerCallRouting(call: any): Promise<void> {
    try {
      // Find active routing rules
      const routingRules = await prisma.routingRule.findMany({
        where: {
          isActive: true
        }
      });

      for (const rule of routingRules) {
        // Check if the call matches the routing criteria
        const matches = this.evaluateRoutingRule(call, rule);
        
        if (matches) {
          console.log(`Call ${call.id} matches routing rule ${rule.id}`);
          
          // Apply the routing action
          await this.applyRoutingAction(call, rule);
        }
      }
    } catch (error) {
      console.error('Error in call routing:', error);
    }
  }

  private evaluateRoutingRule(call: any, rule: any): boolean {
    // Simple evaluation logic - can be extended based on requirements
    const conditions = rule.conditions || {};
    
    // Check phone number pattern
    if (conditions.phonePattern) {
      const regex = new RegExp(conditions.phonePattern);
      if (!regex.test(call.phoneNumber)) {
        return false;
      }
    }

    // Check time-based conditions
    if (conditions.timeRange) {
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour < conditions.timeRange.start || currentHour > conditions.timeRange.end) {
        return false;
      }
    }

    return true;
  }

  private async applyRoutingAction(call: any, rule: any): Promise<void> {
    try {
      const action = rule.action || {};
      
      // Update call with routing information
      await prisma.call.update({
        where: { id: call.id },
        data: {
          routedTo: action.destination,
          routingRuleId: rule.id,
          status: 'active' // Use 'active' to match frontend expectations
        }
      });

      console.log(`Call ${call.id} routed to ${action.destination}`);
    } catch (error) {
      console.error('Error applying routing action:', error);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.consumer.disconnect();
        this.isConnected = false;
        console.log('Kafka consumer disconnected');
      }
    } catch (error) {
      console.error('Error disconnecting Kafka consumer:', error);
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export default KafkaConsumerService;
