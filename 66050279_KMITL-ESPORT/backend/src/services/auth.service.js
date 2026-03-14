import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

export const registerUser = async (userData) => {
    const { username, email, password, sex, birthday } = userData;

    // 1. Check if user already exists
    const existingUser = await prisma.personal.findFirst({
        where: {
            OR: [
                { username: username },
                { email: email }
            ]
        }
    });

    if (existingUser) {
        throw new Error('Username or email already exists');
    }

    // 2. Hash Password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Create User payload
    const newUserData = {
        username,
        email,
        password: hashedPassword,
        sex: sex || null,
    };

    if (birthday) {
        newUserData.birthday = new Date(birthday).toISOString();
    }

    // 4. Save to Database
    const newUser = await prisma.personal.create({
        data: newUserData,
        select: {
            personal_id: true,
            username: true,
            email: true,
            sex: true,
            birthday: true,
            regis_date: true
        }
    });

    // 5. Generate Initial Token
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const token = jwt.sign(
        { userId: newUser.personal_id, username: newUser.username },
        jwtSecret,
        { expiresIn: '1d' }
    );

    return { user: newUser, token };
};

export const loginUser = async (identifier, password) => {
    // 1. Find User
    const user = await prisma.personal.findFirst({
        where: {
            OR: [
                { username: identifier },
                { email: identifier }
            ]
        }
    });

    if (!user) {
        throw new Error('Invalid credentials');
    }

    // 2. Verify Password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new Error('Invalid credentials');
    }

    // 3. Generate Token
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const token = jwt.sign(
        { userId: user.personal_id, username: user.username },
        jwtSecret,
        { expiresIn: '1d' }
    );

    // Remove password from returned user object
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
};
