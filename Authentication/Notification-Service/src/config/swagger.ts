import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'ShulePlus Notification Service API',
      version: '1.0.0',
      description:
        'Centralized notification microservice for ShulePlus. Handles Email, SMS, Push, In-App notifications, OTP/MFA, templates, delivery logs, and user preferences. Called by IAM, Finance, Education, HR, and RFID services.',
      contact: { name: 'Babyeyi Development Team' },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}${env.API_PREFIX}`,
        description: 'Local development',
      },
    ],
    tags: [
      { name: 'Health', description: 'Service health' },
      { name: 'Email', description: 'Email delivery' },
      { name: 'SMS', description: 'SMS delivery' },
      { name: 'Push', description: 'Push notifications' },
      { name: 'In-App', description: 'In-app notification center' },
      { name: 'OTP', description: 'OTP / MFA codes' },
      { name: 'Templates', description: 'Notification templates' },
      { name: 'Logs', description: 'Delivery audit logs' },
      { name: 'Preferences', description: 'User notification preferences' },
    ],
    components: {
      securitySchemes: {
        serviceApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-service-key',
          description: 'Inter-service API key. Also send `x-source-service` header (IAM, Finance, Education, HR, RFID).',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
        SendEmailRequest: {
          type: 'object',
          required: ['to', 'subject'],
          properties: {
            to: { type: 'string', format: 'email', example: 'parent@school.com' },
            subject: { type: 'string', example: 'ShulePlus — Fee Receipt' },
            html: { type: 'string' },
            text: { type: 'string' },
            templateSlug: { type: 'string', example: 'fee-receipt' },
            templateVariables: {
              type: 'object',
              additionalProperties: { type: 'string' },
              example: { parentName: 'Jean', studentName: 'Alice', amount: 'RWF 50,000', receiptNo: 'RCP-001' },
            },
            metadata: { type: 'object' },
          },
        },
        SendSmsRequest: {
          type: 'object',
          required: ['to', 'body'],
          properties: {
            to: { type: 'string', example: '0791234567' },
            body: { type: 'string', example: 'Your verification code is 123456' },
            templateSlug: { type: 'string' },
            metadata: { type: 'object' },
          },
        },
        SendPushRequest: {
          type: 'object',
          required: ['userId', 'title', 'body'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'Budget Approved' },
            body: { type: 'string', example: 'Your department budget was approved.' },
            data: { type: 'object' },
          },
        },
        SendInAppRequest: {
          type: 'object',
          required: ['userId', 'title', 'body'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'Student Registered' },
            body: { type: 'string', example: 'A new student was registered in S4A.' },
            priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'], default: 'NORMAL' },
            actionUrl: { type: 'string', format: 'uri' },
            metadata: { type: 'object' },
          },
        },
        OtpSendRequest: {
          type: 'object',
          required: ['purpose', 'recipient'],
          properties: {
            purpose: { type: 'string', example: 'mfa_login' },
            recipient: { type: 'string', example: 'user@school.com' },
            channel: { type: 'string', enum: ['email', 'sms', 'both'], default: 'email' },
            name: { type: 'string', example: 'John' },
            metadata: { type: 'object' },
          },
        },
        OtpVerifyRequest: {
          type: 'object',
          required: ['purpose', 'recipient', 'code'],
          properties: {
            purpose: { type: 'string', example: 'mfa_login' },
            recipient: { type: 'string', example: 'user@school.com' },
            code: { type: 'string', example: '123456', minLength: 6, maxLength: 6 },
          },
        },
        UserIdBody: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        NotificationPreference: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
            emailEnabled: { type: 'boolean' },
            smsEnabled: { type: 'boolean' },
            pushEnabled: { type: 'boolean' },
            inAppEnabled: { type: 'boolean' },
            marketingEnabled: { type: 'boolean' },
            quietHoursStart: { type: 'string', example: '22:00' },
            quietHoursEnd: { type: 'string', example: '07:00' },
          },
        },
      },
    },
    security: [{ serviceApiKey: [] }],
  },
  apis: ['./src/docs/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
