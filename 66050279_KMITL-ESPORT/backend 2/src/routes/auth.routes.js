import express from 'express';
import { register, login } from '../controllers/auth.controller.js';

const authRoute = express.Router();

// Route:  POST /api/auth/register
// Desc:   Register a new user
authRoute.post('/register', register);

// Route:  POST /api/auth/login
// Desc:   Authenticate user & get token
authRoute.post('/login', login);

export default authRoute;
