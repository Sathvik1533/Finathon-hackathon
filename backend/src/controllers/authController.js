const UserModel = require('../models/userModel');
const { hashPassword, comparePassword, generateToken } = require('../utils/token');

class AuthController {
  static async register(req, res, next) {
    try {
      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }

      // Hash password and save
      const passwordHash = await hashPassword(password);
      const user = await UserModel.create({
        name,
        email,
        passwordHash
      });

      // Generate JWT
      const token = generateToken({
        id: user.id,
        email: user.email,
        name: user.name
      });

      return res.status(201).json({
        success: true,
        message: 'Account created successfully!',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      // Compare password
      const isMatch = await comparePassword(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      // Generate JWT
      const token = generateToken({
        id: user.id,
        email: user.email,
        name: user.name
      });

      return res.status(200).json({
        success: true,
        message: 'Login successful!',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async getProfile(req, res) {
    return res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
      }
    });
  }

  static async logout(req, res) {
    return res.status(200).json({
      success: true,
      message: 'Successfully logged out.'
    });
  }
}

module.exports = AuthController;
