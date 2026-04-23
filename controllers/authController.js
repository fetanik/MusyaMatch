import { BasicUser } from '../models/BasicUser.js';
import { Shelter } from '../models/Shelter.js';

const buildUserResponse = async (user) => {
  if (user.role === 'manager') {
    const shelter = await Shelter.findOne({
      where: { userId: user.id },
    });

    return {
      id: user.id,
      userId: user.id,
      role: user.role,
      email: user.email,
      name: shelter?.name || user.firstName || '',
      shelterName: shelter?.name || '',
      phone: shelter?.phone || '',
      address: shelter?.address || '',
      description: shelter?.description || '',
      adoptionConditions: shelter?.adoptionConditions || '',
      instagram: shelter?.instagram || '',
      facebook: shelter?.facebook || '',
      telegram: shelter?.telegram || '',
      logo: shelter?.logo || '',
    };
  }

  return {
    id: user.id,
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.firstName || '',
    fosters: 0,
    achievements: ['Registration'],
  };
};

export async function register(req, res, next) {
  try {
    const { role, name, email, password } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();
    const trimmedName = name?.trim();

    if (!role || !['user', 'manager'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (!trimmedName) {
      return res.status(400).json({
        message: role === 'manager' ? 'Please enter shelter name' : 'Please enter your full name',
      });
    }

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const existingUser = await BasicUser.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'A user with this email already exists' });
    }

    const user = await BasicUser.create({
      firstName: role === 'user' ? trimmedName : null,
      email: normalizedEmail,
      password, // later you can replace this with bcrypt hash
      role,
    });

    if (role === 'manager') {
      await Shelter.create({
        userId: user.id,
        name: trimmedName,
      });
    }

    const responseUser = await buildUserResponse(user);

    res.status(201).json({
      message: 'Registration successful',
      user: responseUser,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    const user = await BasicUser.findOne({
      where: {
        email: normalizedEmail,
        password,
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Incorrect email or password' });
    }

    const responseUser = await buildUserResponse(user);

    res.json({
      message: 'Login successful',
      user: responseUser,
    });
  } catch (err) {
    next(err);
  }
}