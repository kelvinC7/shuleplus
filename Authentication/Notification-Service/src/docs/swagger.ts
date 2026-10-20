/**
 * Swagger route definitions for ShulePlus Notification Service.
 * @module docs/swagger
 */

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 */
export {};

/**
 * @swagger
 * /email:
 *   post:
 *     tags: [Email]
 *     summary: Send email
 *     description: Send a transactional email. Supports raw HTML/text or template rendering via `templateSlug` + `templateVariables`.
 *     parameters:
 *       - in: header
 *         name: x-source-service
 *         schema: { type: string, example: Finance }
 *         description: Calling microservice name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendEmailRequest'
 *     responses:
 *       201:
 *         description: Email queued/sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Invalid service API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /sms:
 *   post:
 *     tags: [SMS]
 *     summary: Send SMS
 *     parameters:
 *       - in: header
 *         name: x-source-service
 *         schema: { type: string, example: IAM }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendSmsRequest'
 *     responses:
 *       201:
 *         description: SMS sent
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /push:
 *   post:
 *     tags: [Push]
 *     summary: Send push notification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendPushRequest'
 *     responses:
 *       201:
 *         description: Push notification sent
 */

/**
 * @swagger
 * /in-app:
 *   post:
 *     tags: [In-App]
 *     summary: Create in-app notification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendInAppRequest'
 *     responses:
 *       201:
 *         description: In-app notification created
 *   get:
 *     tags: [In-App]
 *     summary: List in-app notifications
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: filter
 *         schema: { type: string, enum: [all, unread, archived], default: all }
 *     responses:
 *       200:
 *         description: Notification list
 */

/**
 * @swagger
 * /in-app/unread-count:
 *   get:
 *     tags: [In-App]
 *     summary: Get unread notification count
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Unread count
 */

/**
 * @swagger
 * /in-app/read-all:
 *   patch:
 *     tags: [In-App]
 *     summary: Mark all notifications as read
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserIdBody'
 *     responses:
 *       200:
 *         description: All marked read
 */

/**
 * @swagger
 * /in-app/{id}/read:
 *   patch:
 *     tags: [In-App]
 *     summary: Mark notification as read
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserIdBody'
 *     responses:
 *       200:
 *         description: Marked read
 */

/**
 * @swagger
 * /in-app/{id}/archive:
 *   patch:
 *     tags: [In-App]
 *     summary: Archive notification
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserIdBody'
 *     responses:
 *       200:
 *         description: Archived
 */

/**
 * @swagger
 * /otp/send:
 *   post:
 *     tags: [OTP]
 *     summary: Send OTP code
 *     description: Generates a 6-digit OTP, stores it in Redis, and delivers via email and/or SMS.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OtpSendRequest'
 *     responses:
 *       201:
 *         description: OTP sent
 */

/**
 * @swagger
 * /otp/verify:
 *   post:
 *     tags: [OTP]
 *     summary: Verify OTP code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OtpVerifyRequest'
 *     responses:
 *       200:
 *         description: Verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid: { type: boolean }
 *                     reason: { type: string, enum: [expired, invalid] }
 */

/**
 * @swagger
 * /templates:
 *   get:
 *     tags: [Templates]
 *     summary: List notification templates
 *     parameters:
 *       - in: query
 *         name: channel
 *         schema: { type: string, enum: [EMAIL, SMS, PUSH, IN_APP] }
 *     responses:
 *       200:
 *         description: Template list
 */

/**
 * @swagger
 * /logs:
 *   get:
 *     tags: [Logs]
 *     summary: List notification delivery logs
 *     parameters:
 *       - in: query
 *         name: sourceService
 *         schema: { type: string, example: IAM }
 *       - in: query
 *         name: channel
 *         schema: { type: string, enum: [EMAIL, SMS, PUSH, IN_APP] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 100 }
 *     responses:
 *       200:
 *         description: Delivery logs
 */

/**
 * @swagger
 * /preferences/{userId}:
 *   get:
 *     tags: [Preferences]
 *     summary: Get user notification preferences
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   $ref: '#/components/schemas/NotificationPreference'
 *   patch:
 *     tags: [Preferences]
 *     summary: Update user notification preferences
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationPreference'
 *     responses:
 *       200:
 *         description: Preferences updated
 */
