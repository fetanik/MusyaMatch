import { BasicUser } from '../models/BasicUser.js';
import { Shelter } from '../models/Shelter.js';

const buildProfileResponse = (user, shelter) => ({
  userId: user.id,
  email: user.email || '',
  shelterId: shelter?.id || null,
  name: shelter?.name || '',
  phone: shelter?.phone || '',
  logo: shelter?.logo || '',
  address: shelter?.address || '',
  description: shelter?.description || '',
  adoptionConditions: shelter?.adoptionConditions || '',
  instagram: shelter?.instagram || '',
  facebook: shelter?.facebook || '',
  telegram: shelter?.telegram || '',
});

export async function getShelterProfile(req, res, next) {
  try {
    const { userId } = req.params;

    const user = await BasicUser.findByPk(userId, {
      attributes: ['id', 'email', 'role'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const shelter = await Shelter.findOne({
      where: { userId: user.id },
    });

    res.json(buildProfileResponse(user, shelter));
  } catch (err) {
    next(err);
  }
}

export async function updateShelterProfile(req, res, next) {
  try {
    const { userId } = req.params;
    const {
      email,
      password,
      name,
      phone,
      logo,
      address,
      description,
      adoptionConditions,
      instagram,
      facebook,
      telegram,
    } = req.body;

    const user = await BasicUser.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email !== undefined) {
      user.email = email?.trim().toLowerCase() || user.email;
    }

    if (password !== undefined && password.trim() !== '') {
      // Якщо пізніше додасте bcrypt, хешування треба робити тут
      user.password = password.trim();
    }

    await user.save();

    const [shelter] = await Shelter.findOrCreate({
      where: { userId: user.id },
      defaults: {
        userId: user.id,
      },
    });

    shelter.name = name?.trim() || '';
    shelter.phone = phone?.trim() || '';
    shelter.logo = logo || '';
    shelter.address = address?.trim() || '';
    shelter.description = description?.trim() || '';
    shelter.adoptionConditions = adoptionConditions?.trim() || '';
    shelter.instagram = instagram?.trim() || '';
    shelter.facebook = facebook?.trim() || '';
    shelter.telegram = telegram?.trim() || '';

    await shelter.save();

    res.json(buildProfileResponse(user, shelter));
  } catch (err) {
    next(err);
  }
}