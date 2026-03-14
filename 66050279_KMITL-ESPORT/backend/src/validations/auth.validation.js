import { z } from 'zod';

export const registerSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username too long"),
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    sex: z.string().optional(),
    birthday: z.string().optional().refine((date) => {
        if (!date) return true;
        return !isNaN(Date.parse(date));
    }, "Invalid date format (use YYYY-MM-DD)"),
});

export const loginSchema = z.object({
    identifier: z.string().min(1, "Username or email is required"), // Can be email or username
    password: z.string().min(1, "Password is required"),
});
