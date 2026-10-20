import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'ShulePlus IAM API',
      version: '1.0.0',
      description:
        'Babyeyi Identity & Access Management Service — centralized authentication, authorization, session management, and security for the ShulePlus platform.',
      contact: {
        name: 'Babyeyi Development Team',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}${env.API_PREFIX}`,
        description: 'Local development',
      },
    ],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management' },
      { name: 'Organizations', description: 'Organization management' },
      { name: 'Roles', description: 'Role management' },
      { name: 'Sessions', description: 'Session & device management' },
      { name: 'Notifications', description: 'In-app notification center (IAM proxy to Notification Service)' },
      { name: 'MFA', description: 'Multi-factor authentication' },
      { name: 'Root Admin', description: 'ROOT_ADMIN platform management' },
      { name: 'Health', description: 'Service health checks' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from POST /auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation failed' },
            errors: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['password'],
          properties: {
            email: {
              type: 'string',
              example: 'teacher@school.com',
              description: 'Login email or Rwanda phone number (+250 7XX XXX XXX / 07XXXXXXXX)',
            },
            identifier: {
              type: 'string',
              example: '0781234567',
              description: 'Alias for email — email or Rwanda phone number',
            },
            password: { type: 'string', format: 'password', example: 'SecurePass123!' },
            rememberMe: { type: 'boolean', default: false },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'integer', example: 900 },
                user: { $ref: '#/components/schemas/UserProfile' },
                requiresMfa: { type: 'boolean', example: false },
              },
            },
          },
        },
        UserProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE', 'LOCKED', 'SUSPENDED', 'PENDING_VERIFICATION'],
            },
            organization: { $ref: '#/components/schemas/OrganizationSummary' },
            roles: { type: 'array', items: { type: 'string' } },
            permissions: { type: 'array', items: { type: 'string' } },
          },
        },
        OrganizationSummary: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'St Matthew School' },
            slug: { type: 'string' },
            type: { type: 'string', enum: ['SCHOOL', 'UNIVERSITY', 'NGO', 'FACTORY', 'HOSPITAL', 'CHURCH', 'BUSINESS', 'OTHER'] },
          },
        },
        RefreshRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: { type: 'string' },
            password: { type: 'string', format: 'password', minLength: 12 },
          },
        },
        VerifyEmailRequest: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string' },
          },
        },
        Session: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            deviceName: { type: 'string', example: 'Chrome on Windows' },
            browser: { type: 'string' },
            os: { type: 'string' },
            ipAddress: { type: 'string' },
            location: { type: 'string' },
            lastActivity: { type: 'string', format: 'date-time' },
            isCurrent: { type: 'boolean' },
          },
        },
        InAppNotification: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'Budget Approved' },
            body: { type: 'string', example: 'Your department budget was approved.' },
            priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
            isRead: { type: 'boolean' },
            isArchived: { type: 'boolean' },
            actionUrl: { type: 'string', format: 'uri' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts', './src/docs/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
