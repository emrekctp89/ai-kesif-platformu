/**
 * User Routes
 * User management endpoints
 */

import { RouteHandlerFactory } from '../utils/route-handler-factory';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError, AuthenticationError } from '../utils/errors';

const factory = new RouteHandlerFactory();

/**
 * Get user profile
 */
export const getProfile = factory.createGetHandler(
  async (req, res, next) => {
    const { userId } = req.user;

    // TODO: Fetch user from database
    // const user = await User.findById(userId);
    // if (!user) {
    //   throw new NotFoundError('User not found');
    // }

    logger.info('User profile retrieved', { userId });

    return {
      success: true,
      user: {
        id: userId,
        email: 'user@example.com',
        name: 'User Name',
        role: 'user',
        createdAt: new Date(),
      },
    };
  },
  {
    requireAuth: true,
  }
);

/**
 * Update user profile
 */
export const updateProfile = factory.createPutHandler(
  async (req, res, next) => {
    const { userId } = req.user;
    const { name, email, phone } = req.body;

    // Validation
    if (!name && !email && !phone) {
      throw new ValidationError('At least one field is required for update');
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    // TODO: Update user in database
    // const user = await User.findByIdAndUpdate(userId, {
    //   name: name || undefined,
    //   email: email || undefined,
    //   phone: phone || undefined,
    // }, { new: true });

    logger.info('User profile updated', { userId });

    return {
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: userId,
        name: name || 'User Name',
        email: email || 'user@example.com',
        phone: phone || null,
      },
    };
  },
  {
    requireAuth: true,
    validate: (req) => {
      const { name, email, phone } = req.body;
      if (!name && !email && !phone) {
        return { valid: false, error: 'No update fields provided' };
      }
      return { valid: true };
    },
  }
);

/**
 * Change password
 */
export const changePassword = factory.createPostHandler(
  async (req, res, next) => {
    const { userId } = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ValidationError('Current and new passwords are required');
    }

    if (currentPassword === newPassword) {
      throw new ValidationError('New password must be different from current password');
    }

    // TODO: Verify current password
    // const user = await User.findById(userId);
    // const isValid = await passwordHasher.verifyPassword(currentPassword, user.password);
    // if (!isValid) {
    //   throw new AuthenticationError('Current password is incorrect');
    // }

    // TODO: Hash and update new password
    // const hashedPassword = await passwordHasher.hashPassword(newPassword);
    // await User.findByIdAndUpdate(userId, { password: hashedPassword });

    logger.info('User password changed', { userId });

    return {
      success: true,
      message: 'Password changed successfully',
    };
  },
  {
    requireAuth: true,
    validate: (req) => {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return { valid: false, error: 'Missing password fields' };
      }
      return { valid: true };
    },
  }
);

/**
 * Get user sessions
 */
export const getUserSessions = factory.createGetHandler(
  async (req, res, next) => {
    const { userId } = req.user;

    // TODO: Fetch sessions from session manager
    // const sessions = sessionManager.getUserSessions(userId);

    logger.info('User sessions retrieved', { userId });

    return {
      success: true,
      sessions: [
        {
          id: 'session-1',
          device: 'Mozilla/5.0...',
          ipAddress: '192.168.1.1',
          createdAt: new Date(),
          lastActivityAt: new Date(),
        },
      ],
    };
  },
  {
    requireAuth: true,
  }
);

/**
 * Logout from all devices
 */
export const logoutAllDevices = factory.createPostHandler(
  async (req, res, next) => {
    const { userId } = req.user;

    // TODO: Destroy all user sessions
    // sessionManager.destroyAllUserSessions(userId);

    logger.info('User logged out from all devices', { userId });

    return {
      success: true,
      message: 'Logged out from all devices',
    };
  },
  {
    requireAuth: true,
  }
);

/**
 * Delete user account
 */
export const deleteAccount = factory.createDeleteHandler(
  async (req, res, next) => {
    const { userId } = req.user;
    const { password } = req.body;

    if (!password) {
      throw new ValidationError('Password is required to delete account');
    }

    // TODO: Verify password
    // const user = await User.findById(userId);
    // const isValid = await passwordHasher.verifyPassword(password, user.password);
    // if (!isValid) {
    //   throw new AuthenticationError('Invalid password');
    // }

    // TODO: Delete user and all related data
    // await User.findByIdAndDelete(userId);
    // sessionManager.destroyAllUserSessions(userId);

    logger.info('User account deleted', { userId });

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  },
  {
    requireAuth: true,
    validate: (req) => {
      const { password } = req.body;
      if (!password) {
        return { valid: false, error: 'Password is required' };
      }
      return { valid: true };
    },
  }
);

/**
 * Register routes
 */
export function registerUserRoutes(router) {
  router.get('/users/profile', getProfile);
  router.put('/users/profile', updateProfile);
  router.post('/users/password', changePassword);
  router.get('/users/sessions', getUserSessions);
  router.post('/users/logout-all', logoutAllDevices);
  router.delete('/users/account', deleteAccount);
}

const defaultExport = {
  getProfile,
  updateProfile,
  changePassword,
  getUserSessions,
  logoutAllDevices,
  deleteAccount,
  registerUserRoutes,
};

export default defaultExport;
