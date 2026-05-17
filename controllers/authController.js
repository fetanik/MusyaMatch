import { BasicUser } from '../models/BasicUser.js';
import { Shelter } from '../models/Shelter.js';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

const normalizeRole = (role) => {
  const raw = String(role || '').trim().toLowerCase();
  if (raw === 'manager' || raw === 'shelter_manager' || raw === 'shelter-manager') {
    return 'manager';
  }
  return 'user';
};

const buildUserResponse = async (user) => {
  const normalizedRole = normalizeRole(user.role);

  if (normalizedRole === 'manager') {
    const shelter = await Shelter.findOne({
      where: { userId: user.id },
    });

    return {
      id: user.id,
      userId: user.id,
      shelterId: shelter?.id || null,
      role: normalizedRole,
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
    role: normalizedRole,
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
    const normalizedPassword = password?.trim();

    if (!role || !['user', 'manager'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (!trimmedName) {
      return res.status(400).json({
        message: role === 'manager' ? 'Please enter shelter name' : 'Please enter your full name',
      });
    }

    if (!normalizedEmail || !normalizedPassword) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    if (normalizedPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const existingUser = await BasicUser.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'A user with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(normalizedPassword, SALT_ROUNDS);

    const user = await BasicUser.create({
      firstName: trimmedName,
      email: normalizedEmail,
      password: hashedPassword,
      role,
    });

    if (role === 'manager') {
      await Shelter.create({
        userId: user.id,
        name: trimmedName,
        address: '',
      });
    }

    const responseUser = await buildUserResponse(user);

    res.status(201).json({
      message: 'Registration successful',
      user: responseUser,
    });
  } catch (err) {
    if (err?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'A user with this email already exists' });
    }
    if (err?.name === 'SequelizeValidationError') {
      const msg = err.errors?.map((e) => e.message).join('; ') || 'Validation error';
      return res.status(400).json({ message: msg });
    }
    const sqlMsg = err?.parent?.sqlMessage || err?.original?.sqlMessage;
    if (sqlMsg) {
      console.error('[auth/register]', sqlMsg);
    }
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPassword = password?.trim();

    if (!normalizedEmail || !normalizedPassword) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    const user = await BasicUser.findOne({ where: { email: normalizedEmail } });

    const storedPassword = user?.password || '';
    const isHashedPasswordMatch = user ? await bcrypt.compare(normalizedPassword, storedPassword) : false;
    const isLegacyPlainPasswordMatch =
      user &&
      (storedPassword === password ||
        storedPassword === normalizedPassword ||
        storedPassword.trim() === normalizedPassword);
    const isPasswordMatch = isHashedPasswordMatch || isLegacyPlainPasswordMatch;

    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Incorrect email or password' });
    }

    if (isLegacyPlainPasswordMatch) {
      user.password = await bcrypt.hash(normalizedPassword, SALT_ROUNDS);
      await user.save();
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