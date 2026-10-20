/**
 * IAM proxy routes for in-app notification center (frontend → IAM → Notification Service).
 * @module docs/swagger-notifications
 */

/**
 * @swagger
 * /notifications/in-app:
 *   get:
 *     tags: [Notifications]
 *     summary: List in-app notifications
 *     description: Proxies to Notification Service. Used by the frontend notification bell dropdown.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *         description: Defaults to authenticated user if omitted
 *       - in: query
 *         name: filter
 *         schema: { type: string, enum: [all, unread, archived], default: all }
 *     responses:
 *       200:
 *         description: Notification list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InAppNotification'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /notifications/in-app/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get unread notification count
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     count: { type: integer, example: 3 }
 */

/**
 * @swagger
 * /notifications/in-app/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all in-app notifications as read
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: All marked read
 */

/**
 * @swagger
 * /notifications/in-app/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark in-app notification as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Marked read
 */

/**
 * @swagger
 * /notifications/in-app/{id}/archive:
 *   patch:
 *     tags: [Notifications]
 *     summary: Archive in-app notification
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Archived
 */

export {};
