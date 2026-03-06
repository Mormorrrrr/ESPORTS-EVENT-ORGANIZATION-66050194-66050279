import { z } from 'zod';
import { registerSchema, loginSchema } from '../validations/auth.validation.js';
import * as authService from '../services/auth.service.js';

export const register = async (req, res) => {
    try {
        // 1. Controller handles Validation
        const validatedData = registerSchema.parse(req.body);

        // 2. Controller delegates Business Logic to Service
        const { user, token } = await authService.registerUser(validatedData);

        // 3. Controller handles HTTP Response
        return res.status(201).json({
            message: 'User registered successfully',
            user,
            token
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }

        if (error.message === 'Username or email already exists') {
            return res.status(400).json({ message: error.message });
        }

        console.error("Register Error:", error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const login = async (req, res) => {
    try {
        // 1. Controller handles Validation
        const { identifier, password } = loginSchema.parse(req.body);

        // 2. Controller delegates Business Logic to Service
        const { user, token } = await authService.loginUser(identifier, password);

        // 3. Controller handles HTTP Response
        return res.status(200).json({
            message: 'Login successful',
            user,
            token
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }

        if (error.message === 'Invalid credentials') {
            return res.status(401).json({ message: error.message });
        }

        console.error("Login Error:", error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
